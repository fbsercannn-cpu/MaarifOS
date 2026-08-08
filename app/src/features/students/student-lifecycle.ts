import {
  COLLECTION_NAMES,
  createEmptySnapshot,
  type CollectionName,
  type DataSnapshot,
  type StoredRecord,
} from "../../core/domain/model.ts";
import {
  isStudentPrivacyDeletionRepository,
  type LocalDataStore,
} from "../../core/repository/contracts.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface StudentDeletionImpact {
  studentId: string;
  displayName: string;
  attendanceCount: number;
  observationCount: number;
  sharedObservationCount: number;
  mediaCount: number;
  sharedMediaCount: number;
  valueEvidenceLinkCount: number;
  portfolioCount: number;
  reportCount: number;
  exportPackageCount: number;
}

export interface StudentDeletionResult extends StudentDeletionImpact {
  removedEntityCount: number;
  purgedRecoverySnapshotCount: number;
}

function includesStudent(
  value: unknown,
  studentId: string,
): boolean {
  return (
    Array.isArray(value) &&
    value.some((item) => item === studentId)
  );
}

export function previewPermanentStudentDeletion(
  snapshot: DataSnapshot,
  studentId: string,
): StudentDeletionImpact {
  if (!UUID_PATTERN.test(studentId)) {
    throw new Error("Silinecek öğrenci kimliği geçersiz.");
  }
  const student = snapshot.students.find((record) => record.id === studentId);
  if (!student) throw new Error("Silinecek öğrenci bulunamadı.");
  const observations = snapshot.observations.filter((record) =>
    includesStudent(record.studentIds, studentId),
  );
  const media = snapshot.mediaAssets.filter((record) =>
    includesStudent(record.studentIds, studentId),
  );
  const deletedObservationIds = new Set(
    observations
      .filter(
        (record) =>
          !Array.isArray(record.studentIds) || record.studentIds.length <= 1,
      )
      .map((record) => record.id),
  );
  return {
    studentId,
    displayName:
      typeof student.displayName === "string"
        ? student.displayName
        : "İsimsiz öğrenci",
    attendanceCount: snapshot.attendanceRecords.filter(
      (record) => record.studentId === studentId,
    ).length,
    observationCount: observations.length,
    sharedObservationCount: observations.filter(
      (record) =>
        Array.isArray(record.studentIds) && record.studentIds.length > 1,
    ).length,
    mediaCount: media.length,
    sharedMediaCount: media.filter(
      (record) =>
        Array.isArray(record.studentIds) && record.studentIds.length > 1,
    ).length,
    valueEvidenceLinkCount: snapshot.valueEvidenceLinks.filter(
      (record) =>
        record.studentId === studentId ||
        (typeof record.observationId === "string" &&
          deletedObservationIds.has(record.observationId)),
    ).length,
    portfolioCount: snapshot.portfolioSelections.filter(
      (record) => record.studentId === studentId,
    ).length,
    reportCount:
      snapshot.reportDrafts.filter((record) =>
        includesStudent(record.studentIds, studentId),
      ).length +
      snapshot.externalFeedback.filter(
        (record) => record.studentId === studentId,
      ).length,
    exportPackageCount: snapshot.exportPackages.filter((record) =>
      includesStudent(record.studentIds, studentId),
    ).length,
  };
}

function containsIdentifier(
  value: unknown,
  identifiers: ReadonlySet<string>,
): boolean {
  if (typeof value === "string") return identifiers.has(value);
  if (Array.isArray(value)) {
    return value.some((item) => containsIdentifier(item, identifiers));
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) =>
      containsIdentifier(item, identifiers),
    );
  }
  return false;
}

function removeStudentAssignments(
  record: StoredRecord,
  studentId: string,
  updatedAt: string,
  options: { tombstoneWhenUnassigned: boolean },
): StoredRecord {
  const hasStudentMembership = includesStudent(record.studentIds, studentId);
  const hasTargetAssignment =
    Array.isArray(record.targetAssignments) &&
    record.targetAssignments.some(
      (assignment) =>
        assignment !== null &&
        typeof assignment === "object" &&
        (assignment as Record<string, unknown>).studentId === studentId,
    );
  if (!hasStudentMembership && !hasTargetAssignment) return record;

  const remainingStudentIds = Array.isArray(record.studentIds)
    ? record.studentIds.filter((id) => id !== studentId)
    : null;
  const remainingTargetAssignments = Array.isArray(record.targetAssignments)
    ? record.targetAssignments.filter(
        (assignment) =>
          !assignment ||
          typeof assignment !== "object" ||
          (assignment as Record<string, unknown>).studentId !== studentId,
      )
    : null;
  const hasRemainingAssignment =
    (remainingStudentIds?.length ?? 0) > 0 ||
    (remainingStudentIds === null &&
      (remainingTargetAssignments?.length ?? 0) > 0);
  const next: StoredRecord = {
    ...record,
    ...(remainingStudentIds ? { studentIds: remainingStudentIds } : {}),
    ...(remainingTargetAssignments
      ? { targetAssignments: remainingTargetAssignments }
      : {}),
    updatedAt,
  };
  if (!hasRemainingAssignment) {
    delete next.assignmentMode;
    delete next.assignmentSnapshotAt;
    delete next.coverageStatus;
    if (
      options.tombstoneWhenUnassigned &&
      typeof record.deletedAt !== "string"
    ) {
      next.deletedAt = updatedAt;
    }
  }
  return next;
}

function removeStudentMembership(
  record: StoredRecord,
  studentId: string,
  updatedAt: string,
): StoredRecord {
  return {
    ...record,
    studentIds: Array.isArray(record.studentIds)
      ? record.studentIds.filter((id) => id !== studentId)
      : record.studentIds,
    updatedAt,
  };
}

function filterReferencingRecords(
  records: readonly StoredRecord[],
  identifiers: ReadonlySet<string>,
): StoredRecord[] {
  return records.filter(
    (record) => !containsIdentifier(record, identifiers),
  );
}

function latestRecordTimestampMillis(record: StoredRecord): number {
  const timestamps = [
    record.createdAt,
    record.updatedAt,
    ...(typeof record.deletedAt === "string" ? [record.deletedAt] : []),
  ];
  if (
    timestamps.some((timestamp) => {
      return (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(timestamp) ||
        Number.isNaN(Date.parse(timestamp))
      );
    })
  ) {
    throw new Error(
      "Kalıcı silmeyle ilişkili kayıtlardan birinin UTC zaman çizelgesi geçersiz; silme uygulanmadı.",
    );
  }
  return Math.max(...timestamps.map((timestamp) => Date.parse(timestamp)));
}

function assertPermanentDeletionChronology(
  snapshot: DataSnapshot,
  identifiers: ReadonlySet<string>,
  timestamp: string,
): void {
  const relatedRecords = COLLECTION_NAMES.flatMap((collection) =>
    snapshot[collection].filter((record) =>
      containsIdentifier(record, identifiers),
    ),
  );
  if (
    relatedRecords.some(
      (record) => Date.parse(timestamp) < latestRecordTimestampMillis(record),
    )
  ) {
    throw new Error(
      "Kalıcı silme zamanı ilişkili kayıtların son değişiklik zamanından eski; silme uygulanmadı.",
    );
  }
}

export async function permanentlyDeleteArchivedStudent(
  store: LocalDataStore,
  input: {
    studentId: string;
    confirmationName: string;
    now?: Date;
  },
): Promise<StudentDeletionResult> {
  if (!isStudentPrivacyDeletionRepository(store)) {
    throw new Error(
      "Kalıcı silme, ana veriyle kurtarma snapshot'larını tek işlemde temizleyebilen bir veri deposu gerektirir.",
    );
  }
  const initial = await store.readSnapshot();
  const impact = previewPermanentStudentDeletion(initial, input.studentId);
  const student = initial.students.find(
    (record) => record.id === input.studentId,
  );
  if (
    !student ||
    (student.enrollmentStatus !== "left" && student.active !== false)
  ) {
    throw new Error(
      "Kalıcı silmeden önce öğrenciyi sınıftan ayırıp arşive taşıyın.",
    );
  }
  if (input.confirmationName.trim() !== impact.displayName) {
    throw new Error("Kalıcı silme onayı için öğrencinin adını aynen yazın.");
  }
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Kalıcı silme için geçerli bir zaman gerekli.");
  }
  const timestamp = now.toISOString();
  const atomicDeletion = await store.transactionWithStudentRecoveryPurge(
    input.studentId,
    async (transaction) => {
      let removedEntityCount = 0;
      const snapshot = createEmptySnapshot();
      await Promise.all(
        COLLECTION_NAMES.map(async (collection) => {
          snapshot[collection] = await transaction.getAll(collection);
        }),
      );
      const currentImpact = previewPermanentStudentDeletion(
        snapshot,
        input.studentId,
      );
      const currentStudent = snapshot.students.find(
        (record) => record.id === input.studentId,
      );
      if (
        !currentStudent ||
        (currentStudent.enrollmentStatus !== "left" &&
          currentStudent.active !== false)
      ) {
        throw new Error(
          "Öğrenci arşiv durumu değişti; kalıcı silme uygulanmadı.",
        );
      }
      if (input.confirmationName.trim() !== currentImpact.displayName) {
        throw new Error("Kalıcı silme onayı öğrenci adıyla uyuşmuyor.");
      }

      const observationsToDelete = snapshot.observations.filter((record) => {
        if (!includesStudent(record.studentIds, input.studentId)) return false;
        return (
          !Array.isArray(record.studentIds) ||
          record.studentIds.filter((id) => id !== input.studentId).length === 0
        );
      });
      const mediaToDelete = snapshot.mediaAssets.filter((record) => {
        if (!includesStudent(record.studentIds, input.studentId)) return false;
        return (
          !Array.isArray(record.studentIds) ||
          record.studentIds.filter((id) => id !== input.studentId).length === 0
        );
      });
      const removedIds = new Set<string>([
        input.studentId,
        ...snapshot.attendanceRecords
          .filter((record) => record.studentId === input.studentId)
          .map((record) => record.id),
        ...observationsToDelete.map((record) => record.id),
        ...mediaToDelete.map((record) => record.id),
      ]);
      for (const revision of snapshot.observationRevisions) {
        if (
          typeof revision.observationId === "string" &&
          removedIds.has(revision.observationId)
        ) {
          removedIds.add(revision.id);
        }
      }
      for (const link of snapshot.evidenceCurriculumLinks) {
        if (
          typeof link.observationId === "string" &&
          removedIds.has(link.observationId)
        ) {
          removedIds.add(link.id);
        }
      }
      for (const link of snapshot.valueEvidenceLinks) {
        if (
          link.studentId === input.studentId ||
          (typeof link.observationId === "string" &&
            removedIds.has(link.observationId))
        ) {
          removedIds.add(link.id);
        }
      }

      assertPermanentDeletionChronology(snapshot, removedIds, timestamp);

      const next = createEmptySnapshot();
      next.academicYears = [...snapshot.academicYears];
      next.classrooms = [...snapshot.classrooms];
      next.calendarEntries = [...snapshot.calendarEntries];
      next.maarifReferences = [...snapshot.maarifReferences];
      next.students = snapshot.students.filter(
        (record) => record.id !== input.studentId,
      );
      next.attendanceRecords = snapshot.attendanceRecords.filter(
        (record) => record.studentId !== input.studentId,
      );
      next.observations = snapshot.observations
        .filter((record) => !removedIds.has(record.id))
        .map((record) =>
          includesStudent(record.studentIds, input.studentId)
            ? removeStudentMembership(record, input.studentId, timestamp)
            : record,
        );
      next.observationRevisions = snapshot.observationRevisions.filter(
        (record) =>
          !removedIds.has(record.id) &&
          !(
            typeof record.observationId === "string" &&
            removedIds.has(record.observationId)
          ),
      );
      next.mediaAssets = snapshot.mediaAssets
        .filter((record) => !removedIds.has(record.id))
        .map((record) =>
          includesStudent(record.studentIds, input.studentId)
            ? removeStudentMembership(record, input.studentId, timestamp)
            : record,
        );
      next.evidenceCurriculumLinks =
        snapshot.evidenceCurriculumLinks.filter(
          (record) =>
            !removedIds.has(record.id) &&
            !(
              typeof record.observationId === "string" &&
              removedIds.has(record.observationId)
            ),
        );
      next.valueEvidenceLinks = snapshot.valueEvidenceLinks.filter(
        (record) =>
          !removedIds.has(record.id) &&
          record.studentId !== input.studentId &&
          !(
            typeof record.observationId === "string" &&
            removedIds.has(record.observationId)
          ),
      );
      next.activities = snapshot.activities.map((record) =>
        removeStudentAssignments(record, input.studentId, timestamp, {
          tombstoneWhenUnassigned: true,
        }),
      );
      next.plans = snapshot.plans.map((record) =>
        removeStudentAssignments(record, input.studentId, timestamp, {
          // Yıllık/aylık/haftalık kaynak planlar çocuk ataması taşımadan da
          // anlamlıdır. Günlük çocuk-özel örnek ise son muhatabı silinince
          // canlı plan gibi görünmemeli; provenansı korunarak tombstone olur.
          tombstoneWhenUnassigned: record.planType === "daily",
        }),
      );
      const deletedEvidenceIdentifiers = new Set(removedIds);
      deletedEvidenceIdentifiers.delete(input.studentId);
      next.portfolioSelections = snapshot.portfolioSelections.filter(
        (record) =>
          record.studentId !== input.studentId &&
          !containsIdentifier(record, deletedEvidenceIdentifiers),
      );
      const relationIdentifiers = new Set([...removedIds, input.studentId]);
      next.reportDrafts = filterReferencingRecords(
        snapshot.reportDrafts,
        relationIdentifiers,
      );
      next.externalFeedback = snapshot.externalFeedback.filter(
        (record) => record.studentId !== input.studentId,
      );
      next.exportPackages = filterReferencingRecords(
        snapshot.exportPackages,
        relationIdentifiers,
      );
      next.notificationRules = filterReferencingRecords(
        snapshot.notificationRules,
        relationIdentifiers,
      );
      next.settings = filterReferencingRecords(
        snapshot.settings,
        relationIdentifiers,
      );
      next.auditLogs = filterReferencingRecords(
        snapshot.auditLogs,
        relationIdentifiers,
      );

      for (const collection of COLLECTION_NAMES) {
        removedEntityCount +=
          snapshot[collection].length - next[collection].length;
        await transaction.clear(collection);
        if (next[collection].length > 0) {
          await transaction.putMany(
            collection as CollectionName,
            next[collection],
          );
        }
      }
      return { impact: currentImpact, removedEntityCount };
    },
  );

  return {
    ...atomicDeletion.result.impact,
    removedEntityCount: atomicDeletion.result.removedEntityCount,
    purgedRecoverySnapshotCount:
      atomicDeletion.purgedRecoverySnapshotCount,
  };
}
