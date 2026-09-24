import { assertNoUnresolvedLegacyForms, redactOfficialFormsForStudent } from "../official-forms/official-form-record.ts";
import {
  COLLECTION_NAMES,
  createEmptySnapshot,
  type CollectionName,
  type DataSnapshot,
  type StoredRecord,
} from "../../core/domain/model.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import {
  isStudentPrivacyDeletionRepository,
  type LocalDataStore,
} from "../../core/repository/contracts.ts";
import { DEVELOPMENT_REPORT_SETTING_TYPE } from "../development/development-report-model.ts";
import { CONSENT_TRIP_SETTING_TYPE, assertConsentTripRelationships, consentTripRecords, tripState, latestTripCheck } from "../../core/domain/consent-trips.ts";
import { CLASSROOM_ADMIN_SETTING_TYPE, assertClassroomAdminRelationships } from "../../core/domain/classroom-admin.ts";
import { assertLearningCenterRelationships } from "../../core/domain/learning-centers.ts";
import {CLASS_DUTY_SETTING_TYPE,eraseClassDutyStudent,assertClassDutyRelationships} from "../../core/domain/class-duty-schedule.ts";
import { assertFamilyEngagementRelationships } from "../../core/domain/family-engagement.ts";
import { assertSchoolDocumentTemplateRelationships } from "../../core/domain/school-document-template.ts";
import { assertDailyRoutineCardRelationships } from "../../core/domain/daily-routine-cards.ts";
import {createStudentErasure} from '../../core/domain/student-erasure.ts';
import { assertGrowthMeasurementSnapshotRelations } from "../../core/domain/growth-measurements.ts";
import { redactStudentConsentTripRecords, redactStudentClassroomAdminRecords } from "./student-workflow-privacy.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface StudentDeletionImpact {
  studentId: string;
  displayName: string;
  fingerprint: string;
  relatedRecordCount: number;
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
    recordIncludesStudent(record, studentId),
  );
  const media = snapshot.mediaAssets.filter((record) =>
    includesStudent(record.studentIds, studentId),
  );
  const deletedObservationIds = new Set(
    observations
      .filter(
        (record) => studentMembershipIds(record).length <= 1,
      )
      .map((record) => record.id),
  );
  const deletionState = studentDeletionFingerprint(snapshot, studentId);
  return {
    studentId,
    displayName:
      typeof student.displayName === "string"
        ? student.displayName
        : "İsimsiz öğrenci",
    ...deletionState,
    attendanceCount: snapshot.attendanceRecords.filter(
      (record) => record.studentId === studentId,
    ).length,
    observationCount: observations.length,
    sharedObservationCount: observations.filter(
      (record) => studentMembershipIds(record).length > 1,
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
      ).length +
      snapshot.settings.filter(
        (record) => record.settingType === DEVELOPMENT_REPORT_SETTING_TYPE && record.studentId === studentId,
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

function studentMembershipIds(record: StoredRecord): string[] {
  const plural = Array.isArray(record.studentIds)
    ? record.studentIds.filter((value): value is string => typeof value === "string")
    : [];
  if (plural.length > 0) return [...new Set(plural)];
  return typeof record.studentId === "string" ? [record.studentId] : [];
}

function recordIncludesStudent(record: StoredRecord, studentId: string): boolean {
  return studentMembershipIds(record).includes(studentId);
}

function deletionRelatedRecords(
  snapshot: DataSnapshot,
  studentId: string,
): Array<{ collection: CollectionName; record: StoredRecord }> {
  const identifiers = new Set([studentId]);
  const included = new Set<string>();
  const result: Array<{ collection: CollectionName; record: StoredRecord }> = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const collection of COLLECTION_NAMES) {
      for (const record of snapshot[collection]) {
        const key = `${collection}:${record.id}`;
        if (included.has(key) || !containsIdentifier(record, identifiers)) continue;
        included.add(key);
        identifiers.add(record.id);
        result.push({ collection, record });
        changed = true;
      }
    }
  }
  return result.sort(
    (left, right) =>
      left.collection.localeCompare(right.collection) ||
      left.record.id.localeCompare(right.record.id),
  );
}

function fnv1a64(value: string, offsetBasis: bigint): string {
  let hash = offsetBasis;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return hash.toString(16).padStart(16, "0");
}

function studentDeletionFingerprint(
  snapshot: DataSnapshot,
  studentId: string,
): { fingerprint: string; relatedRecordCount: number } {
  const records = deletionRelatedRecords(snapshot, studentId);
  const canonical = canonicalJson(
    records.map(({ collection, record }) => ({ collection, record })),
  );
  return {
    fingerprint: `student-deletion-v1:${fnv1a64(canonical, 14695981039346656037n)}${fnv1a64(canonical, 7809847782465536322n)}`,
    relatedRecordCount: Math.max(0, records.length - 1),
  };
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
  const next: StoredRecord = {
    ...record,
    studentIds: Array.isArray(record.studentIds)
      ? record.studentIds.filter((id) => id !== studentId)
      : record.studentIds,
    updatedAt,
  };
  if (record.studentId === studentId) delete next.studentId;
  if (!Array.isArray(record.studentIds)) delete next.studentIds;
  return next;
}

function redactDeletedEvidenceArrays(
  record: StoredRecord,
  deletedObservationIds: ReadonlySet<string>,
  deletedMediaIds: ReadonlySet<string>,
  updatedAt: string,
): StoredRecord {
  let changed = false;
  const next: StoredRecord = { ...record };
  for (const [field, identifiers] of [
    ["evidenceIds", deletedObservationIds],
    ["mediaIds", deletedMediaIds],
  ] as const) {
    if (!Array.isArray(record[field])) continue;
    const retained = record[field].filter(
      (value) => typeof value !== "string" || !identifiers.has(value),
    );
    if (retained.length === record[field].length) continue;
    next[field] = retained;
    changed = true;
    if (field === "evidenceIds" && typeof record.evidenceCount === "number") {
      next.evidenceCount = retained.length;
    }
  }
  if (changed) next.updatedAt = updatedAt;
  return changed ? next : record;
}

interface PlanEvaluationRedaction {
  plans: StoredRecord[];
  removedEvaluationIds: Set<string>;
}

function redactDeletedPlanEvaluations(
  plans: readonly StoredRecord[],
  deletedObservationIds: ReadonlySet<string>,
  studentId: string,
  updatedAt: string,
): PlanEvaluationRedaction {
  const removedEvaluationIds = new Set<string>();
  const firstPass = plans.map((record) => {
    let changed = false;
    const next: StoredRecord = { ...record };
    for (const field of ["weeklyEvaluations", "monthlyEvaluations"] as const) {
      if (!Array.isArray(record[field])) continue;
      const retained = record[field].filter((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return true;
        const evaluation = value as Record<string, unknown>;
        const children = evaluation.children && typeof evaluation.children === "object" && !Array.isArray(evaluation.children)
          ? evaluation.children as Record<string, unknown>
          : null;
        const observationIds = Array.isArray(children?.observationIds)
          ? children.observationIds
          : Array.isArray(evaluation.observationIds)
            ? evaluation.observationIds
            : [];
        if (!observationIds.some((id) => typeof id === "string" && deletedObservationIds.has(id))) return true;
        if (typeof evaluation.id === "string") removedEvaluationIds.add(evaluation.id);
        changed = true;
        return false;
      });
      if (retained.length !== record[field].length) next[field] = retained;
    }

    if (Array.isArray(next.monthlyEvaluations)) {
      next.monthlyEvaluations = next.monthlyEvaluations.map((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return value;
        const evaluation = value as Record<string, unknown>;
        const children = evaluation.children && typeof evaluation.children === "object" && !Array.isArray(evaluation.children)
          ? evaluation.children as Record<string, unknown>
          : null;
        const coverage = children?.coverage && typeof children.coverage === "object" && !Array.isArray(children.coverage)
          ? children.coverage as Record<string, unknown>
          : null;
        if (!coverage) return value;
        let coverageChanged = false;
        const nextCoverage = { ...coverage };
        for (const key of ["activeStudentIds", "coveredActiveStudentIds", "uncoveredActiveStudentIds"] as const) {
          if (!Array.isArray(coverage[key])) continue;
          const retained = coverage[key].filter((id) => id !== studentId);
          if (retained.length === coverage[key].length) continue;
          nextCoverage[key] = retained;
          coverageChanged = true;
        }
        if (!coverageChanged) return value;
        if (typeof coverage.activeStudentCount === "number" && Array.isArray(nextCoverage.activeStudentIds)) {
          nextCoverage.activeStudentCount = nextCoverage.activeStudentIds.length;
        }
        if (typeof coverage.coveredActiveStudentCount === "number" && Array.isArray(nextCoverage.coveredActiveStudentIds)) {
          nextCoverage.coveredActiveStudentCount = nextCoverage.coveredActiveStudentIds.length;
        }
        changed = true;
        return { ...evaluation, children: { ...children, coverage: nextCoverage } };
      });
    }
    if (changed) next.updatedAt = updatedAt;
    return changed ? next : record;
  });

  const redactedPlans = firstPass.map((record) => {
    if (removedEvaluationIds.size === 0 || !containsIdentifier(record, removedEvaluationIds)) return record;
    const next: StoredRecord = { ...record, updatedAt };
    for (const field of ["previousWeekEvaluationId", "previousMonthEvaluationId"] as const) {
      if (typeof next[field] === "string" && removedEvaluationIds.has(next[field] as string)) delete next[field];
    }
    for (const field of ["nextPlanDecisionContext", "nextMonthDecisionContext"] as const) {
      const context = next[field];
      if (context && typeof context === "object" && !Array.isArray(context) &&
        typeof (context as Record<string, unknown>).evaluationId === "string" &&
        removedEvaluationIds.has((context as Record<string, unknown>).evaluationId as string)) {
        delete next[field];
      }
    }
    return next;
  });
  return { plans: redactedPlans, removedEvaluationIds };
}

function assertNoDanglingDeletedIdentifiers(
  before: DataSnapshot,
  after: DataSnapshot,
  removedNestedIdentifiers: ReadonlySet<string>,
): void {
  const retainedEntityIds = new Set(
    COLLECTION_NAMES.flatMap((collection) =>
      after[collection].map((record) => record.id),
    ),
  );
  const deletedIdentifiers = new Set(removedNestedIdentifiers);
  for (const collection of COLLECTION_NAMES) {
    for (const record of before[collection]) {
      if (!retainedEntityIds.has(record.id)) deletedIdentifiers.add(record.id);
    }
  }
  for (const collection of COLLECTION_NAMES) {
    for (const record of after[collection]) {
      if (containsIdentifier(record, deletedIdentifiers)) {
        throw new Error(
          `Kalıcı silme ${collection}/${record.id} kaydında silinmiş bir ilişki bırakacaktı; işlem uygulanmadı.`,
        );
      }
    }
  }
}

function civilDateForDeletion(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function assertCanonicalDeletionSnapshot(
  snapshot: DataSnapshot,
  now: Date,
): Promise<void> {
  if (typeof window === "undefined") return;
  const { assertDataSnapshotRelationships } = await import("../../core/backup/schema.ts");
  assertDataSnapshotRelationships(snapshot, civilDateForDeletion(now));
}

function filterReferencingRecords(
  records: readonly StoredRecord[],
  identifiers: ReadonlySet<string>,
): StoredRecord[] {
  return records.filter(
    (record) => !containsIdentifier(record, identifiers),
  );
}

/** Privacy redaction removes only typed support steps, including every retained plan revision. */
function removeStudentSupportSteps(
  record: StoredRecord,
  studentId: string,
  decisionIds: ReadonlySet<string>,
  updatedAt: string,
): StoredRecord {
  const redactContent = (value: unknown): unknown => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const content = value as Record<string, unknown>;
    if (!Array.isArray(content.followupSupportSteps)) return value;
    const remaining = content.followupSupportSteps.filter((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return true;
      const step = value as Record<string, unknown>;
      return step.studentId !== studentId && !(typeof step.decisionId === "string" && decisionIds.has(step.decisionId));
    });
    if (remaining.length === content.followupSupportSteps.length) return value;
    const next = { ...content };
    if (remaining.length) next.followupSupportSteps = remaining;
    else delete next.followupSupportSteps;
    return next;
  };
  const teacherContent = redactContent(record.teacherContent);
  let historyChanged = false;
  const revisionHistory = Array.isArray(record.revisionHistory) ? record.revisionHistory.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const revision = value as Record<string, unknown>;
    const content = redactContent(revision.teacherContent);
    if (content === revision.teacherContent) return value;
    historyChanged = true;
    return { ...revision, teacherContent: content };
  }) : record.revisionHistory;
  if (teacherContent === record.teacherContent && !historyChanged) return record;
  return { ...record, teacherContent, ...(historyChanged ? { revisionHistory } : {}), updatedAt };
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

interface PermanentStudentDeletionInput {
  studentId: string;
  confirmationName: string;
  expectedFingerprint?: string;
  now?: Date;
}

async function permanentlyDeleteStudentInternal(
  store: LocalDataStore,
  input: PermanentStudentDeletionInput,
  requireArchivedStudent: boolean,
): Promise<StudentDeletionResult> {
  if (!isStudentPrivacyDeletionRepository(store)) {
    throw new Error(
      "Kalıcı silme, ana veriyle kurtarma snapshot'larını tek işlemde temizleyebilen bir veri deposu gerektirir.",
    );
  }
  const initial = await store.readSnapshot();
  assertNoUnresolvedLegacyForms(initial, typeof localStorage === "undefined" ? undefined : localStorage);
  const impact = previewPermanentStudentDeletion(initial, input.studentId);
  const student = initial.students.find(
    (record) => record.id === input.studentId,
  );
  if (
    requireArchivedStudent &&
    (!student ||
      (student.enrollmentStatus !== "left" && student.active !== false))
  ) {
    throw new Error(
      "Kalıcı silmeden önce öğrenciyi sınıftan ayırıp arşive taşıyın.",
    );
  }
  if (input.confirmationName.trim() !== impact.displayName) {
    throw new Error("Kalıcı silme onayı için öğrencinin adını aynen yazın.");
  }
  if (
    input.expectedFingerprint !== undefined &&
    input.expectedFingerprint !== impact.fingerprint
  ) {
    throw new Error(
      "Öğrencinin silme kapsamı önizlemeden sonra değişti; güncel etki özetini yeniden hazırlayın.",
    );
  }
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Kalıcı silme için geçerli bir zaman gerekli.");
  }
  const timestamp = now.toISOString();
  const erasureRecord = await createStudentErasure(input.studentId, now);
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
      assertNoUnresolvedLegacyForms(snapshot, typeof localStorage === "undefined" ? undefined : localStorage);
      const currentImpact = previewPermanentStudentDeletion(
        snapshot,
        input.studentId,
      );
      const currentStudent = snapshot.students.find(
        (record) => record.id === input.studentId,
      );
      if (
        requireArchivedStudent &&
        (!currentStudent ||
          (currentStudent.enrollmentStatus !== "left" &&
            currentStudent.active !== false))
      ) {
        throw new Error(
          "Öğrenci arşiv durumu değişti; kalıcı silme uygulanmadı.",
        );
      }
      if (input.confirmationName.trim() !== currentImpact.displayName) {
        throw new Error("Kalıcı silme onayı öğrenci adıyla uyuşmuyor.");
      }
      if (
        input.expectedFingerprint !== undefined &&
        input.expectedFingerprint !== currentImpact.fingerprint
      ) {
        throw new Error(
          "Öğrencinin silme kapsamı önizlemeden sonra değişti; güncel etki özetini yeniden hazırlayın.",
        );
      }

      const observationsToDelete = snapshot.observations.filter((record) => {
        if (!recordIncludesStudent(record, input.studentId)) return false;
        return studentMembershipIds(record).filter((id) => id !== input.studentId).length === 0;
      });
      const mediaToDelete = snapshot.mediaAssets.filter((record) => {
        if (!includesStudent(record.studentIds, input.studentId)) return false;
        return (
          !Array.isArray(record.studentIds) ||
          record.studentIds.filter((id) => id !== input.studentId).length === 0
        );
      });
      const deletedObservationIds = new Set(
        observationsToDelete.map((record) => record.id),
      );
      const deletedMediaIds = new Set(mediaToDelete.map((record) => record.id));
      const removedIds = new Set<string>([
        input.studentId,
        ...snapshot.settings.filter(record => record.studentId === input.studentId).map(record => record.id),
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

      assertConsentTripRelationships(snapshot);
      const consentRecords = consentTripRecords(snapshot);
      for (const plan of consentRecords.filter(record => record.workflow.kind === "trip-plan")) {
        const state = tripState(consentRecords, plan.id);
        if (state.status !== "active" || !state.roster.some(row => row.studentId === input.studentId)) continue;
        const returned = latestTripCheck(consentRecords, plan.id, input.studentId, "return");
        if (returned?.workflow.kind !== "trip-check" || returned.workflow.outcome !== "seen") {
          throw new Error("Öğrencinin devam eden gezide dönüş sayımı tamamlanmadı. Dönüşünü doğrulayıp sayımı kaydettikten sonra kalıcı silmeyi yeniden deneyin.");
        }
      }
      assertClassroomAdminRelationships(snapshot);
      assertGrowthMeasurementSnapshotRelations(snapshot);
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
          recordIncludesStudent(record, input.studentId)
            ? removeStudentMembership(record, input.studentId, timestamp)
            : record,
        )
        .map((record) =>
          redactDeletedEvidenceArrays(
            record,
            deletedObservationIds,
            deletedMediaIds,
            timestamp,
          ),
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
        redactDeletedEvidenceArrays(
          removeStudentAssignments(record, input.studentId, timestamp, {
            tombstoneWhenUnassigned: true,
          }),
          deletedObservationIds,
          deletedMediaIds,
          timestamp,
        ),
      );
      const supportDecisionIds = new Set(snapshot.settings.filter(record => {
        const workflow = record.workflow as Record<string, unknown> | undefined;
        return record.settingType === "teacher-followup-v1" && record.studentId === input.studentId && workflow?.kind === "learning-decision";
      }).map(record => record.id));
      const assignmentRedactedPlans = snapshot.plans.map((record) =>
        removeStudentSupportSteps(removeStudentAssignments(record, input.studentId, timestamp, {
          // Yıllık/aylık/haftalık kaynak planlar çocuk ataması taşımadan da
          // anlamlıdır. Günlük çocuk-özel örnek ise son muhatabı silinince
          // canlı plan gibi görünmemeli; provenansı korunarak tombstone olur.
          tombstoneWhenUnassigned: record.planType === "daily",
        }), input.studentId, supportDecisionIds, timestamp),
      );
      const evaluationRedaction = redactDeletedPlanEvaluations(
        assignmentRedactedPlans,
        deletedObservationIds,
        input.studentId,
        timestamp,
      );
      next.plans = evaluationRedaction.plans;
      for (const evaluationId of evaluationRedaction.removedEvaluationIds) {
        removedIds.add(evaluationId);
      }
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
        snapshot.settings.filter(record => record.settingType !== "official-form-draft-v1" && record.settingType !== CONSENT_TRIP_SETTING_TYPE && record.settingType !== CLASSROOM_ADMIN_SETTING_TYPE && record.settingType !== CLASS_DUTY_SETTING_TYPE
          && !(record.settingType === "home-game-card-v1" && record.studentId === input.studentId)
          && !(record.settingType === "document-version" && includesStudent(record.studentIds, input.studentId))),
        relationIdentifiers,
      );
      next.settings.push(...redactOfficialFormsForStudent(snapshot, input.studentId, timestamp));
      next.settings.push(...redactStudentConsentTripRecords(snapshot, input.studentId));
      next.settings.push(...redactStudentClassroomAdminRecords(snapshot, input.studentId, relationIdentifiers));
      const dutyErasure=eraseClassDutyStudent(snapshot,input.studentId);
      next.settings.push(...dutyErasure.records);
      if(!next.settings.some(row=>row.id===erasureRecord.id))next.settings.push(erasureRecord);
      next.calendarEntries=next.calendarEntries.filter(row=>!dutyErasure.calendarIds.has(row.id));
      assertClassDutyRelationships(next);
      assertConsentTripRelationships(next);
      assertClassroomAdminRelationships(next);
      assertGrowthMeasurementSnapshotRelations(next);
      assertLearningCenterRelationships(next);
      assertFamilyEngagementRelationships(next);
      assertSchoolDocumentTemplateRelationships(next);
      assertDailyRoutineCardRelationships(next);
      next.auditLogs = filterReferencingRecords(
        snapshot.auditLogs,
        relationIdentifiers,
      );
      assertNoDanglingDeletedIdentifiers(
        snapshot,
        next,
        new Set([...removedIds, ...evaluationRedaction.removedEvaluationIds]),
      );
      await assertCanonicalDeletionSnapshot(next, now);

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

/**
 * Önizleme parmak izi değişmediyse aktif veya arşivlenmiş tek öğrenciyi ve
 * ona ait kurtarma snapshot'larını aynı atomik commit sınırında kaldırır.
 */
export async function permanentlyDeleteStudent(
  store: LocalDataStore,
  input: PermanentStudentDeletionInput & { expectedFingerprint: string },
): Promise<StudentDeletionResult> {
  if (
    typeof input.expectedFingerprint !== "string" ||
    !input.expectedFingerprint.trim()
  ) {
    throw new Error("Kalıcı silme için güncel etki özeti parmak izi gereklidir.");
  }
  return permanentlyDeleteStudentInternal(store, input, false);
}

/** Arşiv-önce mevcut akışın geriye uyumlu sözleşmesi. */
export async function permanentlyDeleteArchivedStudent(
  store: LocalDataStore,
  input: PermanentStudentDeletionInput,
): Promise<StudentDeletionResult> {
  return permanentlyDeleteStudentInternal(store, input, true);
}

