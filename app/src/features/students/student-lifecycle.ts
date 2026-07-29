import {
  COLLECTION_NAMES,
  createEmptySnapshot,
  type CollectionName,
  type DataSnapshot,
  type StoredRecord,
} from "../../core/domain/model.ts";
import {
  isRecoverySnapshotRepository,
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
): StoredRecord {
  const next: StoredRecord = { ...record, updatedAt };
  if (Array.isArray(record.studentIds)) {
    next.studentIds = record.studentIds.filter((id) => id !== studentId);
  }
  if (Array.isArray(record.targetAssignments)) {
    next.targetAssignments = record.targetAssignments.filter(
      (assignment) =>
        !assignment ||
        typeof assignment !== "object" ||
        (assignment as Record<string, unknown>).studentId !== studentId,
    );
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

export async function permanentlyDeleteArchivedStudent(
  store: LocalDataStore,
  input: {
    studentId: string;
    confirmationName: string;
    now?: Date;
  },
): Promise<StudentDeletionResult> {
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
  let removedEntityCount = 0;
  if (!isRecoverySnapshotRepository(store)) {
    throw new Error(
      "Kalıcı silme, öğrenci verisi içeren kurtarma snapshot'larını güvenle temizleyebilen bir veri deposu gerektirir.",
    );
  }
  const purgedRecoverySnapshotCount =
    await store.deleteRecoverySnapshotsContainingStudent(input.studentId);

  await store.transaction(
    "readwrite",
    COLLECTION_NAMES,
    async (transaction) => {
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
      next.activities = snapshot.activities.map((record) =>
        removeStudentAssignments(record, input.studentId, timestamp),
      );
      next.plans = snapshot.plans.map((record) =>
        removeStudentAssignments(record, input.studentId, timestamp),
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
    },
  );

  return {
    ...impact,
    removedEntityCount,
    purgedRecoverySnapshotCount,
  };
}
