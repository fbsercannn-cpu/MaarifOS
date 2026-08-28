import {
  COLLECTION_NAMES,
  type CollectionName,
  type DataSnapshot,
  type StoredRecord,
} from "../domain/model";
import {
  ATTENDANCE_COMPLETION_SETTING_TYPE,
  isAttendanceCompletionSetting,
  isAttendanceRecord,
  isCivilDate,
} from "../domain/attendance";
import {
  ACTIVE_CLASSROOM_SETTING_TYPE,
  isClassroomRecord,
} from "../domain/classroom";
import {
  LEGACY_ASSIGNMENT_NEEDS_REVIEW,
  type ActiveClassroomScope,
} from "../domain/classroom-scope";
import { assertPedagogicalPlanProvenance } from "../domain/pedagogical-plan-provenance";
import {
  isTeacherMonthlyEvaluation,
} from "../domain/teacher-owned-monthly-evaluation";
import {
  QUICK_OBSERVATION_DRAFT_SETTING_TYPE,
  isQuickObservationCategory,
  isQuickObservationDraftRecord,
  isQuickObservationType,
} from "../domain/quick-observation";
import {
  isTeacherOwnedPlanRecord,
  isTeacherWeeklyEvaluation,
  TEACHER_AUTHORED_PLAN_ORIGIN,
} from "../domain/teacher-owned-plan";
import { isTeacherOwnedDailyFlow } from "../domain/teacher-owned-daily-flow";
import {
  composeStudentDisplayName,
  isStudentProfilePhotoDataUrl,
  isValidStudentNationalIdentityNumber,
  normalizeStudentCareDetails,
  normalizeStudentContacts,
  studentContactsFromRecord,
  type StudentCareDetailsInput,
  type StudentContactInput,
} from "../domain/student";
import {
  assertAppLockAttemptState,
  assertAppLockConfig,
} from "../security/app-lock";
import { assertEntityRecord } from "../repository/entities";
import { canonicalJson } from "./canonical-json";
import {
  parsePremiumActivityValueDesignSnapshot,
  parsePremiumValuesContentPackSnapshot,
} from "../../features/premium-plans/content-repository";
import {
  parsePremiumLensPreferenceRecord,
  samePremiumLensPreference,
  type PremiumLensPreferenceSnapshot,
} from "../../features/premium-plans/domain";
import { parsePremiumMonthlyEvaluation } from "../../features/premium-plans/plan-service";
import {
  assertValueEvidenceSourceObservationPolicy,
  parseTeacherEvidenceRationale,
  parseTeacherWeeklyValuesNarrative,
} from "../../features/values/value-plan-models";
import {
  LOCAL_TEACHER_IDENTITY_SETTING_ID,
  LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
} from "../../features/evidence/local-teacher-identity";
import {
  ANECDOTE_FORM_LEGACY_SCHEMA_VERSION,
  ANECDOTE_FORM_REPORT_TYPE,
  ANECDOTE_FORM_SCHEMA_VERSION,
  approvalSealMatchesCurrentSources,
  isAnecdoteFormDraftRecord,
} from "../../features/anecdote/anecdote-form";
import {
  TEACHER_DAY_CARRY_FORWARD_TRANSITION_SETTING_TYPE,
  TEACHER_DAY_CLOSURE_SETTING_TYPE,
  isTeacherDayCarryForwardTransitionSetting,
  isTeacherDayClosureSetting,
  teacherDayClosureSemanticFingerprint,
  teacherDayCarryForwardSourceIdentity,
} from "../../features/day-closure/teacher-day-closure";
import {
  DATA_SCHEMA_VERSION,
  IMMEDIATE_PREVIOUS_DATA_SCHEMA_VERSION,
  LEGACY_DATA_SCHEMA_VERSION,
  PREVIOUS_DATA_SCHEMA_VERSION,
  SECOND_PREVIOUS_DATA_SCHEMA_VERSION,
  VALUE_EVIDENCE_DATA_SCHEMA_VERSION,
} from "./schema-version";

export {
  DATA_SCHEMA_VERSION,
  IMMEDIATE_PREVIOUS_DATA_SCHEMA_VERSION,
  LEGACY_DATA_SCHEMA_VERSION,
  PREVIOUS_DATA_SCHEMA_VERSION,
  SECOND_PREVIOUS_DATA_SCHEMA_VERSION,
  VALUE_EVIDENCE_DATA_SCHEMA_VERSION,
} from "./schema-version";

export const BACKUP_FORMAT = "maarifos-json";
export const BACKUP_VERSION = 1;
export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  backupVersion: typeof BACKUP_VERSION;
  dataSchemaVersion:
    | typeof LEGACY_DATA_SCHEMA_VERSION
    | typeof SECOND_PREVIOUS_DATA_SCHEMA_VERSION
    | typeof PREVIOUS_DATA_SCHEMA_VERSION
    | typeof IMMEDIATE_PREVIOUS_DATA_SCHEMA_VERSION
    | typeof VALUE_EVIDENCE_DATA_SCHEMA_VERSION
    | typeof DATA_SCHEMA_VERSION;
  appVersion: string;
  createdAt: string;
  civilDate: string;
  checksumAlgorithm: "SHA-256";
  payloadChecksum: string;
  entityCounts: Record<CollectionName, number>;
}

export interface BackupEnvelope {
  manifest: BackupManifest;
  payload: DataSnapshot;
}

export type RestoreMode = "replace" | "merge";

export interface RestoreConflict {
  collection: CollectionName;
  id: string;
  reason: "same-id-different-data";
}

export interface RestoreReport {
  mode: RestoreMode;
  inserted: number;
  replaced: number;
  skipped: number;
  conflicts: RestoreConflict[];
  entityCounts: Record<CollectionName, number>;
}

const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SHA256_URN_PATTERN = /^sha256:[0-9a-f]{64}$/;
const VALUE_CODE_PATTERN = /^D(?:[1-9]|1\d|20)$/;
const VALUE_INDICATOR_CODE_PATTERN = /^(D(?:[1-9]|1\d|20))\.\d+\.\d+$/;
const APP_LOCK_SETTING_TYPE = "app-lock-config-v1";
const BASE_RECORD_KEYS = [
  "id",
  "createdAt",
  "updatedAt",
  "civilDate",
  "deletedAt",
  "schemaVersion",
] as const;
const SCOPE_RECORD_KEYS = [
  "academicYearId",
  "classroomId",
  "legacyAssignmentStatus",
] as const;
const COLLECTION_ALLOWED_KEYS: Record<CollectionName, readonly string[]> = {
  academicYears: [
    ...BASE_RECORD_KEYS,
    "name",
    "startDate",
    "endDate",
    "operationalStartDate",
    "operationalStartedAt",
    "officialStartDate",
    "activatedEarlyAt",
    "status",
    "archivedAt",
    "closedOn",
  ],
  classrooms: [
    ...BASE_RECORD_KEYS,
    "academicYearId",
    "name",
    "ageGroup",
    "teacherName",
    "schoolName",
    "curriculumProgram",
    "curriculumCatalogLabel",
    "curriculumProfileSnapshot",
    "schedule",
    "status",
    "archiveStatus",
    "archivedAt",
  ],
  students: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "displayName",
    "firstName",
    "lastName",
    "preferredName",
    "optionalCode",
    "birthDate",
    "nationalIdentityNumber",
    "enrollmentYear",
    "enrollmentDate",
    "homeLanguages",
    "interests",
    "strengths",
    "supportPreferences",
    "contacts",
    "careDetails",
    "profilePhotoDataUrl",
    "profileSchemaVersion",
    "profileMediaId",
    "active",
    "notes",
    "enrollmentStatus",
    "enrollments",
    "legacyRosterDeletedAt",
    "attendanceStatus",
  ],
  attendanceRecords: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "studentId",
    "status",
    "arrivalTime",
    "departureTime",
    "reasonTag",
    "note",
    "events",
    "_MUKERRER_INCELE",
    "duplicateOf",
  ],
  observations: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "studentId",
    "studentIds",
    "observedAt",
    "rawText",
    "context",
    "childQuote",
    "tone",
    "developmentDomains",
    "maarifRefs",
    "activityId",
    "planId",
    "mediaIds",
    "useFlags",
    "privacyLevel",
    "authorId",
    "requiresStudentReview",
    "legacyStudentId",
    "rawTextImmutable",
    "observationType",
    "observationTaxonomyVersion",
    "observationCategories",
    "workflowStatus",
    "batchId",
    "captureScope",
    "_MUKERRER_INCELE",
    "duplicateOf",
  ],
  observationRevisions: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "observationId",
    "previousRawText",
    "changedAt",
    "reason",
    "authorId",
  ],
  activities: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "title",
    "date",
    "description",
    "planId",
    "studentIds",
    "mediaIds",
    "maarifRefs",
    "curriculumTargets",
    "assignmentMode",
    "assignmentSnapshotAt",
    "coverageStatus",
    "targetAssignments",
    "status",
    "startTime",
    "endTime",
    "activityKind",
    "curriculumProfileSnapshot",
    "subject",
    "curriculumConnection",
    "evidenceIds",
    "evidenceCount",
    "sourceAnnualPlanId",
    "sourceMonthlyPlanId",
    "sourceWeeklyPlanId",
    "sourceContentPackSnapshot",
    "sourceActivityTemplateId",
    "sourceActivityTemplateSnapshot",
    "appliedActivityTemplateId",
    "appliedActivityTemplateSnapshot",
    "primaryLensId",
    "supportingLensIds",
    "teacherPreferredLensId",
    "teacherPreferredSupportingLensIds",
    "lensSelectionMode",
    "teacherOwnedFlowBlockId",
    "pedagogicalProvenance",
  ],
  mediaAssets: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "blobKey",
    "thumbnailBlobKey",
    "mimeType",
    "originalName",
    "capturedAt",
    "studentIds",
    "activityId",
    "caption",
    "tags",
    "sharingFlags",
    "checksum",
  ],
  plans: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "date",
    "type",
    "planType",
    "planOrigin",
    "title",
    "content",
    "maarifRefs",
    "activityIds",
    "evaluationText",
    "status",
    "curriculumProfileSnapshot",
    "curriculumTargets",
    "assignmentMode",
    "assignmentSnapshotAt",
    "coverageStatus",
    "studentIds",
    "targetAssignments",
    "periodStart",
    "periodEnd",
    "ageProfile",
    "contentPackId",
    "contentPackVersion",
    "contentPackSnapshot",
    "primaryLensId",
    "supportingLensIds",
    "teacherPreferredLensId",
    "teacherPreferredSupportingLensIds",
    "lensSelectionMode",
    "pedagogicalProvenance",
    "monthlySectionIds",
    "weeklySectionIds",
    "weekKey",
    "teacherContent",
    "revisionNumber",
    "revisionHistory",
    "annualMonths",
    "coverageSummary",
    "annualPlanId",
    "monthlyPlanId",
    "monthKey",
    "weekId",
    "premiumWeeks",
    "premiumWeekSnapshot",
    "premiumActivityTemplates",
    "premiumMonthlyPlan",
    "premiumFullDayFlow",
    "teacherReviewRequired",
    "monthlyReflection",
    "monthlyEvaluations",
    "weeklyEvaluations",
    "nextPlanDecisionRequired",
    "previousWeekEvaluationId",
    "nextPlanDecisionContext",
    "previousMonthEvaluationId",
    "nextMonthDecisionContext",
    "sourceAnnualPlanId",
    "sourceMonthlyPlanId",
    "sourceWeeklyPlanId",
    "sourceContentPackSnapshot",
    "sourceActivityTemplateId",
    "sourceActivityTemplateSnapshot",
    "appliedActivityTemplateId",
    "appliedActivityTemplateSnapshot",
    "premiumDailyFlowSnapshot",
    "teacherOwnedDailyFlow",
  ],
  calendarEntries: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "title",
    "note",
    "entryType",
    "startDate",
    "endDate",
    "status",
    "officialEventId",
    "sourceUrl",
    "sourceCheckedOn",
  ],
  maarifReferences: [
    ...BASE_RECORD_KEYS,
    "sourceVersion",
    "ageGroup",
    "category",
    "code",
    "title",
    "description",
    "parentId",
    "framework",
    "catalogId",
    "sourceUrl",
    "sourceCheckedOn",
    "catalogCompleteness",
  ],
  evidenceCurriculumLinks: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "observationId",
    "framework",
    "programLabel",
    "catalogId",
    "sourceVersion",
    "referenceCode",
    "referenceTitle",
    "confirmationMethod",
    "approvedByUserId",
    "confirmedAt",
    "referenceOrigin",
    "officialCatalogVerified",
    "plannedTargetId",
    "targetKind",
    "targetDomain",
    "targetSourceUrl",
    "targetSourcePage",
    "targetSourceSha256",
    "holisticGraphReference",
  ],
  valueEvidenceLinks: [
    ...BASE_RECORD_KEYS,
    "academicYearId",
    "classroomId",
    "observationId",
    "studentId",
    "planId",
    "activityId",
    "evidenceRole",
    "targetValueCode",
    "targetIndicatorCode",
    "teacherRationale",
    "confirmationMethod",
    "confirmationScope",
    "confirmedByActorKind",
    "confirmedByActorId",
    "confirmedAt",
    "provenance",
    "supersedesLinkId",
  ],
  portfolioSelections: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "studentId",
    "periodStart",
    "periodEnd",
    "itemType",
    "itemId",
    "order",
    "teacherCaption",
    "childReflection",
    "familyContribution",
    "selectedBy",
    "selectedAt",
  ],
  reportDrafts: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "reportType",
    "scope",
    "studentIds",
    "periodStart",
    "periodEnd",
    "selectedObservationIds",
    "selectedMediaIds",
    "editableSections",
    "generatedFileId",
    "observationIds",
    "evidenceCitations",
    "teacherAssessmentText",
    "assessmentLevel",
    "assessmentTargetIds",
    "status",
    "authoredBy",
    "teacherReviewRequired",
    "reviewStatus",
    "reviewedByUserId",
    "reviewedAt",
    "approvalSeal",
    "generationMode",
    "referenceVerificationStatus",
  ],
  externalFeedback: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "studentId",
    "provider",
    "audience",
    "periodStart",
    "periodEnd",
    "receivedAt",
    "rawTextImmutable",
    "contentHash",
    "feedbackText",
    "teacherNote",
    "includeInTermSummary",
    "includeInYearSummary",
    "linkedExportPackageId",
    "reviewStatus",
  ],
  exportPackages: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "type",
    "studentIds",
    "periodStart",
    "periodEnd",
    "anonymizationMode",
    "includedEntityIds",
    "manifest",
    "createdFileIds",
  ],
  notificationRules: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "type",
    "enabled",
    "threshold",
    "scope",
  ],
  settings: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "settingType",
    "attendanceCompleted",
    "studentId",
    "planId",
    "activityId",
    "rawText",
    "context",
    "childQuote",
    "observationType",
    "categoryIds",
    "observationTaxonomyVersion",
    "batchId",
    "captureScope",
    "approvedByUserId",
    "teacherUserId",
    "archivedAt",
    "config",
    "attemptState",
    "closureStatus",
    "closedAt",
    "nextDayNote",
    "issueCodes",
    "evidence",
    "evidenceFingerprint",
    "sourceClosureId",
    "sourceCivilDate",
    "sourceIssueCode",
    "sourceIssueIdentity",
    "sourceIssueId",
    "transitionState",
    "transitionedAt",
    "transitionNote",
    "deferredUntilCivilDate",
    "previousTransitionId",
  ],
  auditLogs: [
    ...BASE_RECORD_KEYS,
    ...SCOPE_RECORD_KEYS,
    "action",
    "entityType",
    "entityId",
    "timestamp",
    "metadata",
    "classroomCount",
    "studentCount",
  ],
};
const CURRICULUM_PROGRAM_LABELS = {
  tymm: "Türkiye Yüzyılı Maarif Modeli",
  meb_2024: "Millî Eğitim Bakanlığı 2024 Okul Öncesi Eğitim Programı",
} as const;

type CurriculumProvenance = {
  referenceOrigin: "teacher-declared" | "official-catalog";
  officialCatalogVerified: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameCanonicalSnapshot(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function valueEvidenceTargetKey(record: StoredRecord): string {
  return [
    record.observationId,
    record.activityId,
    record.targetValueCode,
    record.targetIndicatorCode,
  ].map(String).join("\u0000");
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function assertObjectAllowedKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  label: string,
): void {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(`${label} tanımsız alan taşıyor: ${unknown.join(", ")}`);
  }
}

function isValidUtcIso(value: unknown): value is string {
  if (typeof value !== "string" || !UTC_ISO_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isNonEmptyText(
  value: unknown,
  maximumLength: number,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximumLength
  );
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

function isUuidArray(
  value: unknown,
  options: { allowEmpty?: boolean; maximumLength?: number } = {},
): value is string[] {
  if (!Array.isArray(value)) return false;
  const maximumLength = options.maximumLength ?? 10_000;
  return (
    (options.allowEmpty === true || value.length > 0) &&
    value.length <= maximumLength &&
    value.every(isUuid) &&
    new Set(value).size === value.length
  );
}

function assertAllowedRecordKeys(
  record: StoredRecord,
  collection: CollectionName,
): void {
  const allowed = new Set(COLLECTION_ALLOWED_KEYS[collection]);
  const unknown = Object.keys(record).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(
      `${collection}/${record.id} kaydında tanımsız alan var: ${unknown.join(", ")}`,
    );
  }
}

function validateCollectionRecordSemantics(
  record: StoredRecord,
  collection: CollectionName,
): void {
  if (collection === "academicYears") {
    if (
      !isNonEmptyText(record.name, 120) ||
      !isValidCivilDate(record.startDate) ||
      !isValidCivilDate(record.endDate) ||
      record.startDate > record.endDate ||
      (record.operationalStartDate !== undefined &&
        !isValidCivilDate(record.operationalStartDate)) ||
      (record.operationalStartedAt !== undefined &&
        !isValidUtcIso(record.operationalStartedAt)) ||
      ((record.operationalStartDate === undefined) !==
        (record.operationalStartedAt === undefined)) ||
      (typeof record.operationalStartDate === "string" &&
        record.operationalStartDate > record.endDate) ||
      (record.officialStartDate !== undefined &&
        !isValidCivilDate(record.officialStartDate)) ||
      (record.activatedEarlyAt !== undefined &&
        !isValidUtcIso(record.activatedEarlyAt)) ||
      ((record.officialStartDate === undefined) !==
        (record.activatedEarlyAt === undefined)) ||
      (typeof record.officialStartDate === "string" &&
        (record.startDate > record.officialStartDate ||
          record.officialStartDate > record.endDate)) ||
      (record.status !== undefined &&
        record.status !== "active" &&
        record.status !== "archived") ||
      (record.closedOn !== undefined &&
        !isValidCivilDate(record.closedOn)) ||
      (record.archivedAt !== undefined &&
        !isValidUtcIso(record.archivedAt))
    ) {
      throw new Error(`academicYears/${record.id} eğitim yılı sözleşmesine uymuyor.`);
    }
    return;
  }

  if (collection === "observationRevisions") {
    if (
      !isUuid(record.observationId) ||
      typeof record.previousRawText !== "string" ||
      record.previousRawText.length > 100_000 ||
      !isValidUtcIso(record.changedAt) ||
      (record.reason !== undefined && !isNonEmptyText(record.reason, 1_000)) ||
      (record.authorId !== undefined && !isNonEmptyText(record.authorId, 200))
    ) {
      throw new Error(
        `observationRevisions/${record.id} revizyon sözleşmesine uymuyor.`,
      );
    }
    return;
  }

  if (collection === "valueEvidenceLinks") {
    const provenance = isRecord(record.provenance) ? record.provenance : null;
    const indicatorMatch = typeof record.targetIndicatorCode === "string"
      ? VALUE_INDICATOR_CODE_PATTERN.exec(record.targetIndicatorCode)
      : null;
    if (
      record.schemaVersion !== 1 ||
      !isUuid(record.academicYearId) ||
      !isUuid(record.classroomId) ||
      !isUuid(record.observationId) ||
      !isUuid(record.studentId) ||
      !isUuid(record.planId) ||
      !isUuid(record.activityId) ||
      (record.evidenceRole !== "supports" &&
        record.evidenceRole !== "contrasts" &&
        record.evidenceRole !== "context_only") ||
      typeof record.targetValueCode !== "string" ||
      !VALUE_CODE_PATTERN.test(record.targetValueCode) ||
      !indicatorMatch ||
      indicatorMatch[1] !== record.targetValueCode ||
      record.confirmationMethod !== "teacher-confirmed" ||
      record.confirmationScope !== "observation-to-value-action-link" ||
      record.confirmedByActorKind !== "local-teacher-identity" ||
      !isUuid(record.confirmedByActorId) ||
      !isValidUtcIso(record.confirmedAt) ||
      record.confirmedAt !== record.createdAt ||
      (record.supersedesLinkId !== null && !isUuid(record.supersedesLinkId)) ||
      !provenance ||
      !hasExactKeys(provenance, [
        "contentPackId",
        "contentPackVersion",
        "contentReleaseId",
        "contentManifestDigest",
        "appliedActivityTemplateId",
        "appliedValuesDesignId",
        "appliedValuesDesignVersion",
        "appliedValuesDesignDigest",
      ]) ||
      !isNonEmptyText(provenance.contentPackId, 200) ||
      !isNonEmptyText(provenance.contentPackVersion, 120) ||
      !isNonEmptyText(provenance.contentReleaseId, 200) ||
      typeof provenance.contentManifestDigest !== "string" ||
      !SHA256_URN_PATTERN.test(provenance.contentManifestDigest) ||
      !isNonEmptyText(provenance.appliedActivityTemplateId, 200) ||
      !isNonEmptyText(provenance.appliedValuesDesignId, 240) ||
      provenance.appliedValuesDesignVersion !== "1.0.0" ||
      typeof provenance.appliedValuesDesignDigest !== "string" ||
      !SHA256_URN_PATTERN.test(provenance.appliedValuesDesignDigest) ||
      (record.deletedAt !== null && typeof record.deletedAt !== "string") ||
      (record.deletedAt === null && record.updatedAt !== record.createdAt) ||
      (typeof record.deletedAt === "string" &&
        (record.deletedAt !== record.updatedAt ||
          record.deletedAt < record.confirmedAt))
    ) {
      throw new Error(
        `valueEvidenceLinks/${record.id} öğretmen onaylı değer kanıtı sözleşmesine uymuyor.`,
      );
    }
    if (
      parseTeacherEvidenceRationale(
        record.teacherRationale,
        record.evidenceRole,
      ) !== record.teacherRationale
    ) {
      throw new Error(
        `valueEvidenceLinks/${record.id} öğretmen gerekçesi kırpılmış NFC biçiminde değil.`,
      );
    }
    return;
  }

  if (collection === "calendarEntries") {
    if (
      !isNonEmptyText(record.title, 160) ||
      (record.note !== undefined && !isNonEmptyText(record.note, 5_000)) ||
      (record.entryType !== "general_note" &&
        record.entryType !== "parent_meeting" &&
        record.entryType !== "fruit_day" &&
        record.entryType !== "activity" &&
        record.entryType !== "adaptation_day" &&
        record.entryType !== "no_school" &&
        record.entryType !== "official_marker") ||
      !isValidCivilDate(record.startDate) ||
      !isValidCivilDate(record.endDate) ||
      record.startDate > record.endDate ||
      (record.status !== "planned" &&
        record.status !== "completed" &&
        record.status !== "cancelled") ||
      (record.officialEventId !== undefined &&
        !isNonEmptyText(record.officialEventId, 120)) ||
      (record.sourceUrl !== undefined && !isSafeHttpsUrl(record.sourceUrl)) ||
      (record.sourceCheckedOn !== undefined &&
        !isValidCivilDate(record.sourceCheckedOn))
    ) {
      throw new Error(
        `calendarEntries/${record.id} eğitim takvimi kaydı sözleşmesine uymuyor.`,
      );
    }
    return;
  }

  if (collection === "externalFeedback") {
    if (
      !isUuid(record.studentId) ||
      (record.provider !== "chatgpt" &&
        record.provider !== "gemini" &&
        record.provider !== "other") ||
      (record.audience !== "parent" &&
        record.audience !== "administration" &&
        record.audience !== "guidance" &&
        record.audience !== "teacher") ||
      !isValidCivilDate(record.periodStart) ||
      !isValidCivilDate(record.periodEnd) ||
      record.periodStart > record.periodEnd ||
      !isValidUtcIso(record.receivedAt) ||
      record.rawTextImmutable !== true ||
      typeof record.contentHash !== "string" ||
      !SHA256_PATTERN.test(record.contentHash) ||
      !isNonEmptyText(record.feedbackText, 50_000) ||
      (record.teacherNote !== undefined &&
        !isNonEmptyText(record.teacherNote, 5_000)) ||
      typeof record.includeInTermSummary !== "boolean" ||
      typeof record.includeInYearSummary !== "boolean" ||
      (record.linkedExportPackageId !== undefined &&
        !isUuid(record.linkedExportPackageId)) ||
      record.reviewStatus !== "teacher-saved"
    ) {
      throw new Error(
        `externalFeedback/${record.id} haricî yapay zekâ geri bildirimi sözleşmesine uymuyor.`,
      );
    }
    return;
  }

  if (collection === "mediaAssets") {
    const sharingFlags = record.sharingFlags;
    if (
      !isNonEmptyText(record.blobKey, 500) ||
      !isNonEmptyText(record.mimeType, 200) ||
      !isNonEmptyText(record.originalName, 500) ||
      !isValidUtcIso(record.capturedAt) ||
      !isUuidArray(record.studentIds, { maximumLength: 200 }) ||
      (record.thumbnailBlobKey !== undefined &&
        !isNonEmptyText(record.thumbnailBlobKey, 500)) ||
      (record.activityId !== undefined && !isUuid(record.activityId)) ||
      (record.caption !== undefined && !isNonEmptyText(record.caption, 2_000)) ||
      (record.tags !== undefined &&
        (!Array.isArray(record.tags) ||
          record.tags.length > 100 ||
          !record.tags.every((tag) => isNonEmptyText(tag, 100)) ||
          new Set(record.tags).size !== record.tags.length)) ||
      !isRecord(sharingFlags) ||
      !hasExactKeys(sharingFlags, [
        "classBulletinAllowed",
        "individualReportAllowed",
        "portfolioAllowed",
      ]) ||
      !Object.values(sharingFlags).every((flag) => typeof flag === "boolean") ||
      (record.checksum !== undefined &&
        (typeof record.checksum !== "string" ||
          !SHA256_PATTERN.test(record.checksum)))
    ) {
      throw new Error(`mediaAssets/${record.id} medya sözleşmesine uymuyor.`);
    }
    return;
  }

  if (collection === "maarifReferences") {
    if (
      !isNonEmptyText(record.sourceVersion, 120) ||
      !isNonEmptyText(record.ageGroup, 80) ||
      !isNonEmptyText(record.category, 200) ||
      !isNonEmptyText(record.code, 120) ||
      !isNonEmptyText(record.title, 500) ||
      (record.description !== undefined &&
        !isNonEmptyText(record.description, 5_000)) ||
      (record.parentId !== undefined && !isUuid(record.parentId)) ||
      (record.framework !== "tymm" && record.framework !== "meb_2024") ||
      !isNonEmptyText(record.catalogId, 200) ||
      !isSafeHttpsUrl(record.sourceUrl) ||
      !isValidCivilDate(record.sourceCheckedOn) ||
      (record.catalogCompleteness !== "partial" &&
        record.catalogCompleteness !== "complete")
    ) {
      throw new Error(
        `maarifReferences/${record.id} program referansı sözleşmesine uymuyor.`,
      );
    }
    return;
  }

  if (collection === "portfolioSelections") {
    if (
      !isUuid(record.studentId) ||
      !isValidCivilDate(record.periodStart) ||
      !isValidCivilDate(record.periodEnd) ||
      record.periodStart > record.periodEnd ||
      (record.itemType !== "observation" &&
        record.itemType !== "media" &&
        record.itemType !== "activity" &&
        record.itemType !== "plan") ||
      !isUuid(record.itemId) ||
      !Number.isInteger(record.order) ||
      (record.order as number) < 0 ||
      (record.teacherCaption !== undefined &&
        !isNonEmptyText(record.teacherCaption, 2_000)) ||
      (record.childReflection !== undefined &&
        !isNonEmptyText(record.childReflection, 1_000)) ||
      (record.familyContribution !== undefined &&
        !isNonEmptyText(record.familyContribution, 2_000)) ||
      (record.selectedBy !== undefined &&
        record.selectedBy !== "teacher" &&
        record.selectedBy !== "teacher-child") ||
      (record.selectedAt !== undefined && !isValidUtcIso(record.selectedAt))
    ) {
      throw new Error(
        `portfolioSelections/${record.id} portfolyo seçimi sözleşmesine uymuyor.`,
      );
    }
    return;
  }

  if (collection === "exportPackages") {
    if (
      record.type !== "ai_analysis" &&
      record.type !== "student_dossier" &&
      record.type !== "student_archive" &&
      record.type !== "class_bulletin_data"
    ) {
      throw new Error(
        `exportPackages/${record.id} dışa aktarma türü geçersiz.`,
      );
    }
    if (
      !isUuidArray(record.studentIds, { maximumLength: 10_000 }) ||
      !isValidCivilDate(record.periodStart) ||
      !isValidCivilDate(record.periodEnd) ||
      record.periodStart > record.periodEnd ||
      !isNonEmptyText(record.anonymizationMode, 80) ||
      !isRecord(record.includedEntityIds) ||
      !isRecord(record.manifest) ||
      !isUuidArray(record.createdFileIds, {
        allowEmpty: true,
        maximumLength: 10_000,
      })
    ) {
      throw new Error(
        `exportPackages/${record.id} dışa aktarma paketi sözleşmesine uymuyor.`,
      );
    }
    if (record.type === "student_dossier") {
      const manifest = record.manifest as Record<string, unknown>;
      const destination = manifest.destination;
      const audience = manifest.audience;
      if (
        manifest.packageKind !== "student_dossier" ||
        (destination !== "whatsapp" &&
          destination !== "chatgpt" &&
          destination !== "gemini" &&
          destination !== "file") ||
        (audience !== "parent" &&
          audience !== "administration" &&
          audience !== "guidance" &&
          audience !== "teacher") ||
        manifest.purpose !== audience ||
        manifest.periodStart !== record.periodStart ||
        manifest.periodEnd !== record.periodEnd ||
        manifest.academicYearId !== record.academicYearId ||
        manifest.classroomId !== record.classroomId ||
        manifest.generatedAt !== record.createdAt ||
        ((destination === "chatgpt" || destination === "gemini") &&
          manifest.provider !== destination) ||
        ((destination === "whatsapp" || destination === "file") &&
          manifest.provider !== undefined)
      ) {
        throw new Error(
          `exportPackages/${record.id} öğrenci dosyası provenans sözleşmesine uymuyor.`,
        );
      }
    }
    return;
  }

  if (collection === "notificationRules") {
    if (
      !isNonEmptyText(record.type, 120) ||
      typeof record.enabled !== "boolean" ||
      (typeof record.threshold !== "number" &&
        typeof record.threshold !== "string") ||
      (typeof record.threshold === "number" &&
        !Number.isFinite(record.threshold)) ||
      !isRecord(record.scope)
    ) {
      throw new Error(
        `notificationRules/${record.id} bildirim kuralı sözleşmesine uymuyor.`,
      );
    }
    return;
  }

  if (collection === "auditLogs") {
    const timestamp = record.timestamp ?? record.createdAt;
    if (
      !isNonEmptyText(record.action, 160) ||
      !isNonEmptyText(record.entityType, 160) ||
      !isUuid(record.entityId) ||
      !isValidUtcIso(timestamp) ||
      (record.metadata !== undefined && !isRecord(record.metadata)) ||
      (record.classroomCount !== undefined &&
        (!Number.isInteger(record.classroomCount) ||
          (record.classroomCount as number) < 0)) ||
      (record.studentCount !== undefined &&
        (!Number.isInteger(record.studentCount) ||
          (record.studentCount as number) < 0))
    ) {
      throw new Error(`auditLogs/${record.id} denetim kaydı sözleşmesine uymuyor.`);
    }
    return;
  }

  if (collection === "settings") {
    if (!isNonEmptyText(record.settingType, 120)) {
      throw new Error(`settings/${record.id} ayar türü geçersiz.`);
    }
    if (
      (record.settingType === LOCAL_TEACHER_IDENTITY_SETTING_TYPE) !==
      (record.id === LOCAL_TEACHER_IDENTITY_SETTING_ID)
    ) {
      throw new Error(
        `settings/${record.id} yerel öğretmen kimliği ayrılmış ayar kimliğiyle uyuşmuyor.`,
      );
    }
    const scopedSettingKeys = [
      ...BASE_RECORD_KEYS,
      "settingType",
      ...SCOPE_RECORD_KEYS,
    ];
    if (record.settingType === APP_LOCK_SETTING_TYPE) {
      assertObjectAllowedKeys(
        record,
        [...BASE_RECORD_KEYS, "settingType", "config", "attemptState"],
        `settings/${record.id}`,
      );
      assertAppLockConfig(record.config);
      assertAppLockAttemptState(record.attemptState);
      return;
    }
    if (record.settingType === LOCAL_TEACHER_IDENTITY_SETTING_TYPE) {
      assertObjectAllowedKeys(
        record,
        [...BASE_RECORD_KEYS, "settingType", "teacherUserId"],
        `settings/${record.id}`,
      );
      if (
        !isUuid(record.teacherUserId) ||
        (record.deletedAt !== null && typeof record.deletedAt !== "string") ||
        (typeof record.deletedAt === "string" &&
          record.deletedAt < record.createdAt)
      ) {
        throw new Error(
          `settings/${record.id} yerel öğretmen kimliği veya zaman çizelgesi geçersiz.`,
        );
      }
      return;
    }
    if (record.settingType === ACTIVE_CLASSROOM_SETTING_TYPE) {
      assertObjectAllowedKeys(
        record,
        [...scopedSettingKeys, "archivedAt"],
        `settings/${record.id}`,
      );
      return;
    }
    if (record.settingType === ATTENDANCE_COMPLETION_SETTING_TYPE) {
      assertObjectAllowedKeys(
        record,
        [...scopedSettingKeys, "attendanceCompleted"],
        `settings/${record.id}`,
      );
      return;
    }
    if (record.settingType === TEACHER_DAY_CLOSURE_SETTING_TYPE) {
      assertObjectAllowedKeys(
        record,
        [
          ...scopedSettingKeys,
          "closureStatus",
          "closedAt",
          "nextDayNote",
          "issueCodes",
          "evidence",
          "evidenceFingerprint",
        ],
        `settings/${record.id}`,
      );
      if (!isTeacherDayClosureSetting(record)) {
        throw new Error(`settings/${record.id} gün sonu kaydı geçersiz.`);
      }
      return;
    }
    if (
      record.settingType ===
      TEACHER_DAY_CARRY_FORWARD_TRANSITION_SETTING_TYPE
    ) {
      assertObjectAllowedKeys(
        record,
        [
          ...scopedSettingKeys,
          "sourceClosureId",
          "sourceCivilDate",
          "sourceIssueCode",
          "sourceIssueIdentity",
          "sourceIssueId",
          "transitionState",
          "transitionedAt",
          "transitionNote",
          "deferredUntilCivilDate",
          "previousTransitionId",
        ],
        `settings/${record.id}`,
      );
      if (!isTeacherDayCarryForwardTransitionSetting(record)) {
        throw new Error(`settings/${record.id} taşınan iş geçişi geçersiz.`);
      }
      return;
    }
    if (record.settingType === QUICK_OBSERVATION_DRAFT_SETTING_TYPE) {
      assertObjectAllowedKeys(
        record,
        [
          ...scopedSettingKeys,
          "studentId",
          "planId",
          "activityId",
          "rawText",
          "context",
          "childQuote",
          "observationType",
          "categoryIds",
          "observationTaxonomyVersion",
          "batchId",
          "captureScope",
        ],
        `settings/${record.id}`,
      );
      return;
    }
    throw new Error(`settings/${record.id} desteklenmeyen ayar türü taşıyor.`);
  }
}

function isValidCivilDate(value: unknown): value is string {
  if (typeof value !== "string" || !CIVIL_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const TYMM_HOLISTIC_GRAPH_CONTENT_SHA256 =
  "sha256:3605c74ddc95970671cc54994d40702b6831ad46e92cfed4a9047597804d4d8a";
const TYMM_HOLISTIC_GRAPH_SOURCE_SHA256 =
  "sha256:77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09";

function isTymmHolisticGraphReference(value: unknown): boolean {
  const relatedNodeIds = isRecord(value) ? value.relatedNodeIds : undefined;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "catalogContentSha256",
      "graphId",
      "graphVersion",
      "outcomeNodeId",
      "relatedNodeIds",
      "reviewStatus",
      "sourceSha256",
    ]) ||
    value.graphId !== "meb-tymm-okul-oncesi-2024-holistic-graph" ||
    value.graphVersion !== "1.0.0" ||
    value.catalogContentSha256 !== TYMM_HOLISTIC_GRAPH_CONTENT_SHA256 ||
    value.reviewStatus !== "pending-human-review" ||
    value.sourceSha256 !== TYMM_HOLISTIC_GRAPH_SOURCE_SHA256 ||
    typeof value.outcomeNodeId !== "string" ||
    !/^outcome:(36-48|48-60|60-72):/u.test(value.outcomeNodeId) ||
    !Array.isArray(relatedNodeIds) ||
    relatedNodeIds.some(
      (nodeId) => typeof nodeId !== "string" || nodeId.trim().length === 0,
    ) ||
    new Set(relatedNodeIds).size !== relatedNodeIds.length ||
    relatedNodeIds.some(
      (nodeId, index) => index > 0 && nodeId <= relatedNodeIds[index - 1],
    )
  ) {
    return false;
  }
  return true;
}

function istanbulCivilDate(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function validatedCurriculumProvenance(
  value: Record<string, unknown>,
  recordLabel: string,
): CurriculumProvenance {
  const referenceOrigin = value.referenceOrigin ?? "teacher-declared";
  const officialCatalogVerified = value.officialCatalogVerified ?? false;
  if (
    (referenceOrigin !== "teacher-declared" &&
      referenceOrigin !== "official-catalog") ||
    typeof officialCatalogVerified !== "boolean" ||
    (officialCatalogVerified && referenceOrigin !== "official-catalog")
  ) {
    throw new Error(`${recordLabel} program kaynağı/doğrulama bilgisi geçersiz.`);
  }
  return { referenceOrigin, officialCatalogVerified };
}

function validateCurriculumProfileShape(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} program profili geçersiz.`);
  }
  assertObjectAllowedKeys(
    value,
    [
      "framework",
      "programLabel",
      "catalogId",
      "sourceVersion",
      "referenceOrigin",
      "officialCatalogVerified",
    ],
    `${label} program profili`,
  );
  const expectedLabel =
    value.framework === "tymm"
      ? CURRICULUM_PROGRAM_LABELS.tymm
      : value.framework === "meb_2024"
        ? CURRICULUM_PROGRAM_LABELS.meb_2024
        : null;
  if (
    !expectedLabel ||
    value.programLabel !== expectedLabel ||
    !isNonEmptyText(value.catalogId, 200) ||
    !isNonEmptyText(value.sourceVersion, 120)
  ) {
    throw new Error(`${label} program profili geçersiz.`);
  }
  validatedCurriculumProvenance(value, label);
  return value;
}

function assertStoredRecord(value: unknown, collection: CollectionName): asserts value is StoredRecord {
  if (!isRecord(value)) {
    throw new Error(`${collection} koleksiyonunda geçersiz kayıt bulundu.`);
  }
  if (typeof value.id !== "string" || !UUID_PATTERN.test(value.id)) {
    throw new Error(`${collection} koleksiyonunda geçersiz UUID bulundu.`);
  }
  if (!isValidUtcIso(value.createdAt)) {
    throw new Error(`${collection}/${value.id} createdAt UTC ISO biçiminde değil.`);
  }
  if (!isValidUtcIso(value.updatedAt)) {
    throw new Error(`${collection}/${value.id} updatedAt UTC ISO biçiminde değil.`);
  }
  if (!isValidCivilDate(value.civilDate)) {
    throw new Error(`${collection}/${value.id} civilDate geçerli YYYY-MM-DD değil.`);
  }
  if (value.updatedAt < value.createdAt) {
    throw new Error(`${collection}/${value.id} updatedAt createdAt öncesinde olamaz.`);
  }
  if (!Number.isInteger(value.schemaVersion) || (value.schemaVersion as number) < 1) {
    throw new Error(`${collection}/${value.id} schemaVersion geçersiz.`);
  }
  if (
    value.deletedAt !== undefined &&
    value.deletedAt !== null &&
    !isValidUtcIso(value.deletedAt)
  ) {
    throw new Error(`${collection}/${value.id} deletedAt UTC ISO biçiminde değil.`);
  }
  const storedRecord = value as StoredRecord;
  assertAllowedRecordKeys(storedRecord, collection);
  validateCollectionRecordSemantics(storedRecord, collection);
  // Ortak repository/domain codec temel kayıt biçiminin tek otoritesidir.
  // Yedeğe özgü strict-key, sürüm ve çapraz-kayıt kuralları bu katmanın
  // üzerinde bilinçli olarak korunur (özellikle öğrenci üyelik geçmişi).
  assertEntityRecord(collection, storedRecord);
}

function premiumValuesSnapshotStatus(
  contentPackSnapshot: Record<string, unknown>,
  label: string,
): "legacy-unmapped" | "machine_validated_pending_human_review" {
  const version = typeof contentPackSnapshot.version === "string"
    ? contentPackSnapshot.version
    : "";
  const majorVersion = Number.parseInt(version.split(".")[0] ?? "", 10);
  const status = contentPackSnapshot.valuesMappingStatus;
  if (status === undefined) {
    if (majorVersion >= 3 || contentPackSnapshot.valuesContract !== undefined) {
      throw new Error(`${label} v3 değer sözleşmesi durumunu taşımıyor.`);
    }
    return "legacy-unmapped";
  }
  if (status === "legacy-unmapped") {
    if (majorVersion >= 3 || contentPackSnapshot.valuesContract !== null) {
      throw new Error(`${label} legacy değer durumu paket sürümüyle çelişiyor.`);
    }
    return status;
  }
  if (status === "machine_validated_pending_human_review") {
    if (majorVersion !== 3) {
      throw new Error(`${label} exact content.v3 ana sürümünü taşımıyor.`);
    }
    parsePremiumValuesContentPackSnapshot(contentPackSnapshot, label);
    return status;
  }
  throw new Error(`${label} bilinmeyen değer eşleme durumu taşıyor.`);
}

function assertPremiumActivityValuesSnapshot(
  contentPackSnapshot: Record<string, unknown>,
  activityTemplateSnapshot: unknown,
  label: string,
): void {
  if (!isRecord(activityTemplateSnapshot) || typeof activityTemplateSnapshot.id !== "string") {
    throw new Error(`${label} etkinlik snapshot'ı geçersiz.`);
  }
  const status = premiumValuesSnapshotStatus(contentPackSnapshot, `${label} içerik paketi`);
  if (status === "legacy-unmapped") {
    if (
      activityTemplateSnapshot.valuesDesign !== undefined &&
      activityTemplateSnapshot.valuesDesign !== null
    ) {
      throw new Error(`${label} legacy etkinliğe geriye dönük değer eşlemesi ekliyor.`);
    }
    return;
  }
  parsePremiumActivityValueDesignSnapshot(
    activityTemplateSnapshot.valuesDesign,
    activityTemplateSnapshot.id,
  );
}

function validatedRecordScope(
  record: StoredRecord,
  collection: CollectionName,
  classroomsById: ReadonlyMap<string, StoredRecord>,
): ActiveClassroomScope | null {
  const hasClassroom = typeof record.classroomId === "string";
  const hasAcademicYear = typeof record.academicYearId === "string";
  const quarantined =
    record.legacyAssignmentStatus === LEGACY_ASSIGNMENT_NEEDS_REVIEW;

  if (!hasClassroom && !hasAcademicYear) {
    if (classroomsById.size === 0 || quarantined) return null;
    throw new Error(
      `${collection}/${record.id} sınıf kapsamı taşımıyor ve karantinada değil.`,
    );
  }
  if (
    !hasClassroom ||
    !hasAcademicYear ||
    !UUID_PATTERN.test(record.classroomId as string) ||
    !UUID_PATTERN.test(record.academicYearId as string)
  ) {
    if (quarantined) return null;
    throw new Error(`${collection}/${record.id} sınıf kapsamı eksik veya geçersiz.`);
  }

  const classroom = classroomsById.get(record.classroomId as string);
  if (!classroom || classroom.academicYearId !== record.academicYearId) {
    if (quarantined) return null;
    throw new Error(
      `${collection}/${record.id} bilinmeyen veya eğitim yılı uyumsuz sınıfa bağlı.`,
    );
  }
  return {
    classroomId: record.classroomId as string,
    academicYearId: record.academicYearId as string,
  };
}

function scopesMatch(
  left: ActiveClassroomScope,
  right: ActiveClassroomScope,
): boolean {
  return (
    left.classroomId === right.classroomId &&
    left.academicYearId === right.academicYearId
  );
}

function recordWasVisibleAt(record: StoredRecord, timestamp: string): boolean {
  const at = Date.parse(timestamp);
  return (
    Date.parse(record.createdAt) <= at &&
    (typeof record.deletedAt !== "string" || at <= Date.parse(record.deletedAt))
  );
}

function snapshotVisibleAt(
  snapshot: DataSnapshot,
  timestamp: string,
): DataSnapshot {
  return Object.fromEntries(
    COLLECTION_NAMES.map((collection) => [
      collection,
      snapshot[collection].filter((record) =>
        recordWasVisibleAt(record, timestamp),
      ),
    ]),
  ) as DataSnapshot;
}

function periodsOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
): boolean {
  return leftStart <= rightEnd && leftEnd >= rightStart;
}

function validatedEnrollmentScopes(
  student: StoredRecord,
  classroomsById: ReadonlyMap<string, StoredRecord>,
  archivedAcademicYearIds: ReadonlySet<string>,
): ActiveClassroomScope[] {
  if (student.enrollments === undefined) return [];
  if (!Array.isArray(student.enrollments)) {
    throw new Error(`students/${student.id} sınıf üyeliği geçmişi geçersiz.`);
  }
  return student.enrollments.map((value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`students/${student.id} sınıf üyeliği geçmişi geçersiz.`);
    }
    const enrollment = value as Record<string, unknown>;
    const enrollmentKeys = [
      "id",
      "classroomId",
      "academicYearId",
      "startedOn",
      "status",
      "schemaVersion",
      ...(enrollment.endedOn === undefined ? [] : ["endedOn"]),
    ];
    if (
      !hasExactKeys(enrollment, enrollmentKeys) ||
      typeof enrollment.id !== "string" ||
      !UUID_PATTERN.test(enrollment.id) ||
      typeof enrollment.classroomId !== "string" ||
      !UUID_PATTERN.test(enrollment.classroomId) ||
      typeof enrollment.academicYearId !== "string" ||
      !UUID_PATTERN.test(enrollment.academicYearId) ||
      !isValidCivilDate(enrollment.startedOn) ||
      (enrollment.endedOn !== undefined &&
        !isValidCivilDate(enrollment.endedOn)) ||
      (typeof enrollment.endedOn === "string" &&
        enrollment.endedOn < (enrollment.startedOn as string)) ||
      (enrollment.status !== "active" &&
        enrollment.status !== "left" &&
        enrollment.status !== "completed" &&
        enrollment.status !== "transferred") ||
      enrollment.schemaVersion !== 1
    ) {
      throw new Error(`students/${student.id} sınıf üyeliği geçmişi geçersiz.`);
    }
    const classroom = classroomsById.get(enrollment.classroomId);
    if (!classroom || classroom.academicYearId !== enrollment.academicYearId) {
      throw new Error(
        `students/${student.id} üyelik geçmişinde bilinmeyen veya uyumsuz sınıf var.`,
      );
    }
    if (
      archivedAcademicYearIds.has(enrollment.academicYearId) &&
      enrollment.status === "active"
    ) {
      throw new Error(
        `students/${student.id} arşivlenmiş eğitim yılında etkin üyelik taşıyor.`,
      );
    }
    return {
      classroomId: enrollment.classroomId,
      academicYearId: enrollment.academicYearId,
    };
  });
}

function validateOptionalStudentText(
  student: StoredRecord,
  field: string,
  fieldLabel: string,
  maximumLength: number,
): void {
  const value = student[field];
  if (
    value !== undefined &&
    (typeof value !== "string" ||
      !value.trim() ||
      value.trim().length > maximumLength)
  ) {
    throw new Error(`students/${student.id} ${fieldLabel} geçersiz.`);
  }
}

function validateStudentProfile(
  student: StoredRecord,
  currentCivilDate: string,
): void {
  if (
    typeof student.displayName !== "string" ||
    !student.displayName.trim() ||
    student.displayName.trim().length > 120
  ) {
    throw new Error(`students/${student.id} çocuk adı eksik veya geçersiz.`);
  }
  validateOptionalStudentText(student, "firstName", "adı", 80);
  validateOptionalStudentText(student, "lastName", "soyadı", 80);
  if (
    student.profileSchemaVersion === 5 ||
    student.profileSchemaVersion === 6 ||
    student.profileSchemaVersion === 7 ||
    student.profileSchemaVersion === 8
  ) {
    if (typeof student.firstName !== "string" || !student.firstName.trim()) {
      throw new Error(`students/${student.id} adı eksik veya geçersiz.`);
    }
    const composedName = composeStudentDisplayName(
      student.firstName,
      typeof student.lastName === "string" ? student.lastName : "",
    );
    if (student.displayName.trim() !== composedName) {
      throw new Error(`students/${student.id} ad ve soyad alanları tutarsız.`);
    }
  }
  if (
    student.preferredName !== undefined &&
    (typeof student.preferredName !== "string" ||
      !student.preferredName.trim() ||
      student.preferredName.trim().length > 60)
  ) {
    throw new Error(`students/${student.id} kullanılan ad geçersiz.`);
  }
  if (
    student.birthDate !== undefined &&
    (!isValidCivilDate(student.birthDate) ||
      student.birthDate > currentCivilDate)
  ) {
    throw new Error(`students/${student.id} doğum tarihi geçersiz.`);
  }
  if (
    student.optionalCode !== undefined &&
    (typeof student.optionalCode !== "string" ||
      !student.optionalCode.trim() ||
      student.optionalCode.trim().length > 40 ||
      /^\d{10,11}$/.test(student.optionalCode.trim()))
  ) {
    throw new Error(`students/${student.id} okul içi kodu geçersiz.`);
  }
  if (
    student.nationalIdentityNumber !== undefined &&
    !isValidStudentNationalIdentityNumber(student.nationalIdentityNumber)
  ) {
    throw new Error(`students/${student.id} T.C. kimlik numarası geçersiz.`);
  }
  if (
    student.enrollmentYear !== undefined &&
    (typeof student.enrollmentYear !== "string" ||
      !/^\d{4}$/.test(student.enrollmentYear) ||
      student.enrollmentYear > currentCivilDate.slice(0, 4) ||
      (typeof student.birthDate === "string" &&
        isValidCivilDate(student.birthDate) &&
        student.enrollmentYear < student.birthDate.slice(0, 4)))
  ) {
    throw new Error(`students/${student.id} kayıt yılı geçersiz.`);
  }
  if (
    student.enrollmentDate !== undefined &&
    (!isValidCivilDate(student.enrollmentDate) ||
      student.enrollmentDate > currentCivilDate ||
      (typeof student.birthDate === "string" &&
        isValidCivilDate(student.birthDate) &&
        student.enrollmentDate < student.birthDate))
  ) {
    throw new Error(`students/${student.id} kayıt tarihi geçersiz.`);
  }
  validateOptionalStudentText(
    student,
    "homeLanguages",
    "evde kullanılan diller alanı",
    200,
  );
  validateOptionalStudentText(
    student,
    "interests",
    "ilgi alanları",
    500,
  );
  validateOptionalStudentText(
    student,
    "strengths",
    "güçlü yönler",
    500,
  );
  validateOptionalStudentText(
    student,
    "supportPreferences",
    "öğretmen desteği notu",
    1_000,
  );
  if (student.contacts !== undefined) {
    if (!Array.isArray(student.contacts)) {
      throw new Error(`students/${student.id} yakın iletişim listesi geçersiz.`);
    }
    const sourceContacts = student.contacts;
    let contactsMatch = false;
    try {
      const normalized = normalizeStudentContacts(
        sourceContacts as StudentContactInput[],
      );
      contactsMatch =
        normalized.length === sourceContacts.length &&
        normalized.every((contact, index) => {
          const source = sourceContacts[index];
          return (
            isRecord(source) &&
            source.id === contact.id &&
            source.kind === contact.kind &&
            source.relationship === contact.relationship &&
            source.name === contact.name &&
            source.phone === contact.phone &&
            source.isPrimary === contact.isPrimary &&
            (source.isEmergencyContact === true) ===
              (contact.isEmergencyContact === true) &&
            (source.isAuthorizedPickup === true) ===
              (contact.isAuthorizedPickup === true)
          );
        });
    } catch {
      contactsMatch = false;
    }
    if (
      !contactsMatch &&
      student.profileSchemaVersion !== 5 &&
      student.profileSchemaVersion !== 6 &&
      student.profileSchemaVersion !== 7 &&
      student.profileSchemaVersion !== 8
    ) {
      const legacyContacts = studentContactsFromRecord(sourceContacts);
      contactsMatch =
        legacyContacts.length === sourceContacts.length &&
        legacyContacts.every((contact, index) => {
          const source = sourceContacts[index];
          return (
            isRecord(source) &&
            source.id === contact.id &&
            source.kind === contact.kind &&
            source.relationship === contact.relationship &&
            source.name === contact.name &&
            source.phone === contact.phone &&
            source.isPrimary === contact.isPrimary &&
            (source.isEmergencyContact === true) ===
              (contact.isEmergencyContact === true) &&
            (source.isAuthorizedPickup === true) ===
              (contact.isAuthorizedPickup === true)
          );
        });
    }
    if (!contactsMatch) {
      throw new Error(`students/${student.id} yakın iletişim listesi geçersiz.`);
    }
  }
  if (student.careDetails !== undefined) {
    if (!isRecord(student.careDetails)) {
      throw new Error(`students/${student.id} sağlık ve güvenlik bilgileri geçersiz.`);
    }
    const sourceCareDetails = student.careDetails;
    let normalizedCareDetails;
    try {
      normalizedCareDetails = normalizeStudentCareDetails(
        student.careDetails as StudentCareDetailsInput,
      );
    } catch {
      normalizedCareDetails = undefined;
    }
    if (
      !normalizedCareDetails ||
      Object.keys(sourceCareDetails).length !==
        Object.keys(normalizedCareDetails).length ||
      Object.entries(normalizedCareDetails).some(
        ([key, value]) => sourceCareDetails[key] !== value,
      )
    ) {
      throw new Error(`students/${student.id} sağlık ve güvenlik bilgileri geçersiz.`);
    }
  }
  if (
    student.profilePhotoDataUrl !== undefined &&
    !isStudentProfilePhotoDataUrl(student.profilePhotoDataUrl)
  ) {
    throw new Error(`students/${student.id} profil fotoğrafı geçersiz.`);
  }
  if (
    student.profileSchemaVersion !== undefined &&
    student.profileSchemaVersion !== 2 &&
    student.profileSchemaVersion !== 3 &&
    student.profileSchemaVersion !== 4 &&
    student.profileSchemaVersion !== 5 &&
    student.profileSchemaVersion !== 6 &&
    student.profileSchemaVersion !== 7 &&
    student.profileSchemaVersion !== 8
  ) {
    throw new Error(`students/${student.id} profil şema sürümü geçersiz.`);
  }
}

export function assertBackupEnvelopeStructure(value: unknown): asserts value is BackupEnvelope {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["manifest", "payload"]) ||
    !isRecord(value.manifest) ||
    !isRecord(value.payload)
  ) {
    throw new Error("Yedek zarfı veya manifest eksik.");
  }
  const manifest = value.manifest;
  if (
    !hasExactKeys(manifest, [
      "appVersion",
      "backupVersion",
      "checksumAlgorithm",
      "civilDate",
      "createdAt",
      "dataSchemaVersion",
      "entityCounts",
      "format",
      "payloadChecksum",
    ])
  ) {
    throw new Error("Yedek manifestinde tanımsız veya eksik alan var.");
  }
  if (manifest.format !== BACKUP_FORMAT || manifest.backupVersion !== BACKUP_VERSION) {
    throw new Error("Yedek biçimi veya sürümü desteklenmiyor.");
  }
  if (
    manifest.dataSchemaVersion !== LEGACY_DATA_SCHEMA_VERSION &&
    manifest.dataSchemaVersion !== SECOND_PREVIOUS_DATA_SCHEMA_VERSION &&
    manifest.dataSchemaVersion !== PREVIOUS_DATA_SCHEMA_VERSION &&
    manifest.dataSchemaVersion !== IMMEDIATE_PREVIOUS_DATA_SCHEMA_VERSION &&
    manifest.dataSchemaVersion !== VALUE_EVIDENCE_DATA_SCHEMA_VERSION &&
    manifest.dataSchemaVersion !== DATA_SCHEMA_VERSION
  ) {
    throw new Error("Yedek veri şeması bu uygulama sürümüyle uyumlu değil.");
  }
  if (typeof manifest.appVersion !== "string" || manifest.appVersion.length === 0) {
    throw new Error("Yedek uygulama sürümü eksik.");
  }
  if (!isValidUtcIso(manifest.createdAt)) {
    throw new Error("Yedek oluşturma zamanı UTC ISO biçiminde değil.");
  }
  if (!isValidCivilDate(manifest.civilDate)) {
    throw new Error("Yedek takvim günü geçerli YYYY-MM-DD değil.");
  }
  if (
    manifest.checksumAlgorithm !== "SHA-256" ||
    typeof manifest.payloadChecksum !== "string" ||
    !SHA256_PATTERN.test(manifest.payloadChecksum)
  ) {
    throw new Error("Yedek bütünlük bilgisi geçersiz.");
  }
  if (!isRecord(manifest.entityCounts)) {
    throw new Error("Yedek kayıt sayıları eksik.");
  }

  const payloadKeys = Object.keys(value.payload);
  const expectedCollections = COLLECTION_NAMES.filter((collection) => {
    if (
      collection === "evidenceCurriculumLinks" &&
      manifest.dataSchemaVersion === LEGACY_DATA_SCHEMA_VERSION
    ) {
      return false;
    }
    if (
      (collection === "calendarEntries" ||
        collection === "externalFeedback") &&
      Number(manifest.dataSchemaVersion) < IMMEDIATE_PREVIOUS_DATA_SCHEMA_VERSION
    ) {
      return false;
    }
    if (
      collection === "valueEvidenceLinks" &&
      Number(manifest.dataSchemaVersion) < VALUE_EVIDENCE_DATA_SCHEMA_VERSION
    ) {
      return false;
    }
    return true;
  });
  const unknownCollections = payloadKeys.filter(
    (key) => !expectedCollections.includes(key as CollectionName),
  );
  const missingCollections = expectedCollections.filter(
    (collection) => !payloadKeys.includes(collection),
  );
  if (unknownCollections.length > 0 || missingCollections.length > 0) {
    throw new Error(
      `Yedek koleksiyon sözleşmesi geçersiz${
        unknownCollections.length > 0
          ? `; bilinmeyen: ${unknownCollections.join(", ")}`
          : ""
      }${
        missingCollections.length > 0
          ? `; eksik: ${missingCollections.join(", ")}`
          : ""
      }.`,
    );
  }
  const expectedCountKeys = expectedCollections;
  if (
    !hasExactKeys(
      manifest.entityCounts,
      expectedCountKeys,
    )
  ) {
    throw new Error("Yedek kayıt sayacı koleksiyon sözleşmesiyle uyuşmuyor.");
  }

  let totalRecords = 0;
  for (const collection of COLLECTION_NAMES) {
    const records = value.payload[collection];
    if (!expectedCollections.includes(collection) && records === undefined) {
      continue;
    }
    if (!Array.isArray(records)) {
      throw new Error(`Yedekte ${collection} koleksiyonu eksik.`);
    }
    if (records.length > 100_000) {
      throw new Error(
        `${collection} koleksiyonu izin verilen kayıt sınırını aşıyor.`,
      );
    }
    totalRecords += records.length;
    if (totalRecords > 250_000) {
      throw new Error("Yedek toplam kayıt sınırını aşıyor.");
    }
    const identifiers = new Set<string>();
    for (const record of records) {
      assertStoredRecord(record, collection);
      if (identifiers.has(record.id)) {
        throw new Error(`${collection} koleksiyonunda mükerrer UUID var: ${record.id}`);
      }
      identifiers.add(record.id);
    }
    if (manifest.entityCounts[collection] !== records.length) {
      throw new Error(`${collection} kayıt sayısı manifest ile uyuşmuyor.`);
    }
  }

}

function assertBackupRelationships(
  payload: DataSnapshot,
  currentCivilDate: string,
): void {
  const academicYearIds = new Set(payload.academicYears.map((academicYear) => academicYear.id));
  for (const classroom of payload.classrooms) {
    if (!isClassroomRecord(classroom)) {
      throw new Error(`classrooms/${classroom.id} sınıf sözleşmesine uymuyor.`);
    }
    if (isRecord(classroom.schedule)) {
      if (
        !hasExactKeys(classroom.schedule, [
          "endTime",
          "kind",
          "startTime",
          "timeZone",
        ])
      ) {
        throw new Error(
          `classrooms/${classroom.id} çalışma düzeninde tanımsız alan var.`,
        );
      }
    }
    if (classroom.curriculumProfileSnapshot !== undefined) {
      validateCurriculumProfileShape(
        classroom.curriculumProfileSnapshot,
        `classrooms/${classroom.id}`,
      );
    }
    if (!academicYearIds.has(classroom.academicYearId)) {
      throw new Error(`classrooms/${classroom.id} bilinmeyen eğitim yılına bağlı.`);
    }
  }
  const classroomsById = new Map(
    payload.classrooms.map((classroom) => [classroom.id, classroom]),
  );
  const academicYearsById = new Map(
    payload.academicYears.map((academicYear) => [academicYear.id, academicYear]),
  );
  for (const entry of payload.calendarEntries) {
    const startDate =
      typeof entry.startDate === "string" ? entry.startDate : "";
    const endDate =
      typeof entry.endDate === "string" ? entry.endDate : "";
    const entryScope = validatedRecordScope(
      entry,
      "calendarEntries",
      classroomsById,
    );
    const academicYear = entryScope
      ? academicYearsById.get(entryScope.academicYearId)
      : undefined;
    if (
      !entryScope ||
      !academicYear ||
      typeof academicYear.startDate !== "string" ||
      typeof academicYear.endDate !== "string" ||
      startDate < academicYear.startDate ||
      endDate > academicYear.endDate
    ) {
      throw new Error(
        `calendarEntries/${entry.id} etkin eğitim yılı tarihleriyle uyuşmuyor.`,
      );
    }
  }
  const archivedAcademicYearIds = new Set(
    payload.academicYears
      .filter((academicYear) => academicYear.status === "archived")
      .map((academicYear) => academicYear.id),
  );
  const studentScopes = new Map<string, ActiveClassroomScope[]>();
  for (const student of payload.students) {
    validateStudentProfile(student, currentCivilDate);
    const currentScope = validatedRecordScope(student, "students", classroomsById);
    studentScopes.set(student.id, [
      ...(currentScope ? [currentScope] : []),
      ...validatedEnrollmentScopes(
        student,
        classroomsById,
        archivedAcademicYearIds,
      ),
    ]);
  }

  const studentsById = new Map(
    payload.students.map((student) => [student.id, student]),
  );
  const studentIds = new Set(studentsById.keys());
  for (const attendance of payload.attendanceRecords) {
    if (!isAttendanceRecord(attendance) || !UUID_PATTERN.test(attendance.studentId)) {
      throw new Error(`attendanceRecords/${attendance.id} yoklama sözleşmesine uymuyor.`);
    }
    if (!studentIds.has(attendance.studentId)) {
      throw new Error(`attendanceRecords/${attendance.id} bilinmeyen öğrenciye bağlı.`);
    }
    const attendanceScope = validatedRecordScope(
      attendance,
      "attendanceRecords",
      classroomsById,
    );
    const allowedStudentScopes = studentScopes.get(attendance.studentId) ?? [];
    if (
      attendanceScope &&
      allowedStudentScopes.length > 0 &&
      !allowedStudentScopes.some((studentScope) =>
        scopesMatch(attendanceScope, studentScope),
      ) &&
      attendance.legacyAssignmentStatus !== LEGACY_ASSIGNMENT_NEEDS_REVIEW
    ) {
      throw new Error(
        `attendanceRecords/${attendance.id} öğrenci sınıf kapsamıyla uyuşmuyor.`,
      );
    }
  }

  const observationScopes = new Map<string, ActiveClassroomScope | null>();
  for (const observation of payload.observations) {
    const observationScope = validatedRecordScope(
      observation,
      "observations",
      classroomsById,
    );
    observationScopes.set(observation.id, observationScope);
    const observationStudentIds = Array.isArray(observation.studentIds)
      ? observation.studentIds.filter((id): id is string => typeof id === "string")
      : [];
    const unknownStudent = observationStudentIds.find((id) => !studentIds.has(id));
    if (
      unknownStudent &&
      observation.requiresStudentReview !== true &&
      observation.legacyAssignmentStatus !== LEGACY_ASSIGNMENT_NEEDS_REVIEW
    ) {
      throw new Error(`observations/${observation.id} bilinmeyen öğrenciye bağlı.`);
    }
    for (const studentId of observationStudentIds) {
      const allowedStudentScopes = studentScopes.get(studentId) ?? [];
      if (
        observationScope &&
        allowedStudentScopes.length > 0 &&
        !allowedStudentScopes.some((studentScope) =>
          scopesMatch(observationScope, studentScope),
        ) &&
        observation.legacyAssignmentStatus !== LEGACY_ASSIGNMENT_NEEDS_REVIEW
      ) {
        throw new Error(
          `observations/${observation.id} öğrenci sınıf kapsamıyla uyuşmuyor.`,
        );
      }
    }
  }

  const planScopes = new Map<string, ActiveClassroomScope | null>();
  const premiumPlanLensPreferences = new Map<
    string,
    PremiumLensPreferenceSnapshot
  >();
  const dayClosuresForEvaluation = payload.settings
    .filter(isTeacherDayClosureSetting)
    .sort(
      (left, right) =>
        left.closedAt.localeCompare(right.closedAt) ||
        left.id.localeCompare(right.id),
    );
  for (const plan of payload.plans) {
    const planScope = validatedRecordScope(plan, "plans", classroomsById);
    planScopes.set(plan.id, planScope);
    const teacherOwnedPeriodPlan =
      plan.planOrigin === TEACHER_AUTHORED_PLAN_ORIGIN;
    if (
      plan.planOrigin !== undefined &&
      !teacherOwnedPeriodPlan
    ) {
      throw new Error(`plans/${plan.id} bilinmeyen plan sahipliği taşıyor.`);
    }
    if (teacherOwnedPeriodPlan && !isTeacherOwnedPlanRecord(plan)) {
      throw new Error(`plans/${plan.id} öğretmen plan sözleşmesine uymuyor.`);
    }
    if (plan.curriculumProfileSnapshot !== undefined) {
      validateCurriculumProfileShape(
        plan.curriculumProfileSnapshot,
        `plans/${plan.id}`,
      );
    }
    if (plan.planType === "daily") {
      const profile = isRecord(plan.curriculumProfileSnapshot)
        ? plan.curriculumProfileSnapshot
        : null;
      const expectedLabel =
        profile?.framework === "tymm"
          ? CURRICULUM_PROGRAM_LABELS.tymm
          : profile?.framework === "meb_2024"
            ? CURRICULUM_PROGRAM_LABELS.meb_2024
            : null;
      if (
        !profile ||
        !expectedLabel ||
        profile.programLabel !== expectedLabel ||
        typeof profile.catalogId !== "string" ||
        profile.catalogId.trim().length === 0 ||
        typeof profile.sourceVersion !== "string" ||
        profile.sourceVersion.trim().length === 0
      ) {
        throw new Error(`plans/${plan.id} doğrulanmış program profilini taşımıyor.`);
      }
      validatedCurriculumProvenance(profile, `plans/${plan.id}`);
    }
    if (
      !teacherOwnedPeriodPlan &&
      (plan.planType === "annual" ||
        plan.planType === "monthly" ||
        plan.planType === "weekly")
    ) {
      if (
        !isCivilDate(plan.periodStart) ||
        !isCivilDate(plan.periodEnd) ||
        plan.periodStart > plan.periodEnd ||
        plan.civilDate !== plan.periodStart ||
        typeof plan.contentPackId !== "string" ||
        !plan.contentPackId.trim() ||
        typeof plan.contentPackVersion !== "string" ||
        !plan.contentPackVersion.trim() ||
        !isRecord(plan.contentPackSnapshot)
      ) {
        throw new Error(`plans/${plan.id} premium plan sözleşmesine uymuyor.`);
      }
      premiumPlanLensPreferences.set(
        plan.id,
        parsePremiumLensPreferenceRecord(plan, `plans/${plan.id}`),
      );
      const profile = isRecord(plan.curriculumProfileSnapshot)
        ? plan.curriculumProfileSnapshot
        : null;
      if (!profile || profile.framework !== "tymm") {
        throw new Error(`plans/${plan.id} TYMM program profili taşımıyor.`);
      }
      validatedCurriculumProvenance(profile, `plans/${plan.id}`);
      const contentPackSnapshot = plan.contentPackSnapshot as Record<string, unknown>;
      premiumValuesSnapshotStatus(
        contentPackSnapshot,
        `plans/${plan.id} premium içerik snapshot'ı`,
      );
      if (
        contentPackSnapshot.id !== plan.contentPackId ||
        contentPackSnapshot.version !== plan.contentPackVersion
      ) {
        throw new Error(`plans/${plan.id} içerik paket kimliği snapshot ile uyuşmuyor.`);
      }
      if (
        (plan.planType === "monthly" || plan.planType === "weekly") &&
        Array.isArray(plan.premiumActivityTemplates)
      ) {
        plan.premiumActivityTemplates.forEach((template, index) =>
          assertPremiumActivityValuesSnapshot(
            contentPackSnapshot,
            template,
            `plans/${plan.id} premiumActivityTemplates[${index}]`,
          ),
        );
      }
    }
    if (
      !teacherOwnedPeriodPlan &&
      plan.planType === "annual" &&
      (!Array.isArray(plan.monthlySectionIds) ||
        !Array.isArray(plan.annualMonths) ||
        !isRecord(plan.coverageSummary))
    ) {
      throw new Error(`plans/${plan.id} yıllık plan omurgası eksik.`);
    }
    if (
      !teacherOwnedPeriodPlan &&
      plan.planType === "monthly" &&
      (typeof plan.annualPlanId !== "string" ||
        typeof plan.monthKey !== "string" ||
        !/^\d{4}-\d{2}$/.test(plan.monthKey) ||
        !Array.isArray(plan.weeklySectionIds) ||
        plan.weeklySectionIds.length !== 4 ||
        !Array.isArray(plan.premiumWeeks) ||
        !Array.isArray(plan.premiumActivityTemplates) ||
        !isRecord(plan.premiumMonthlyPlan) ||
        !Array.isArray(plan.premiumFullDayFlow) ||
        plan.premiumFullDayFlow.length !== 10 ||
        plan.teacherReviewRequired !== true ||
        (plan.monthlyEvaluations !== undefined &&
          !Array.isArray(plan.monthlyEvaluations)) ||
        typeof plan.periodStart !== "string" ||
        typeof plan.periodEnd !== "string" ||
        !plan.periodStart.startsWith(`${plan.monthKey}-`) ||
        !plan.periodEnd.startsWith(`${plan.monthKey}-`))
    ) {
      throw new Error(`plans/${plan.id} aylık plan sözleşmesine uymuyor.`);
    }
    if (
      !teacherOwnedPeriodPlan &&
      plan.planType === "weekly" &&
      (typeof plan.annualPlanId !== "string" ||
        typeof plan.monthlyPlanId !== "string" ||
        typeof plan.weekId !== "string" ||
        !plan.weekId.trim() ||
        !isRecord(plan.premiumWeekSnapshot) ||
        !Array.isArray(plan.premiumActivityTemplates) ||
        plan.premiumActivityTemplates.length !== 3 ||
        plan.teacherReviewRequired !== true ||
        !Array.isArray(plan.weeklyEvaluations) ||
        typeof plan.nextPlanDecisionRequired !== "boolean")
    ) {
      throw new Error(`plans/${plan.id} haftalık plan sözleşmesine uymuyor.`);
    }
    if (
      !teacherOwnedPeriodPlan &&
      plan.planType === "monthly" &&
      Array.isArray(plan.monthlyEvaluations)
    ) {
      const evaluationIds = new Set<string>();
      let previousCreatedAt: string | null = null;
      for (const [index, candidate] of plan.monthlyEvaluations.entries()) {
        const evaluation = parsePremiumMonthlyEvaluation(
          candidate,
          `plans/${plan.id} aylık değerlendirme ${index + 1}`,
        );
        if (
          evaluationIds.has(evaluation.id) ||
          evaluation.monthlyPlanId !== plan.id ||
          evaluation.periodStart !== plan.periodStart ||
          evaluation.periodEnd !== plan.periodEnd ||
          !recordWasVisibleAt(plan, evaluation.createdAt) ||
          (previousCreatedAt !== null &&
            evaluation.createdAt < previousCreatedAt)
        ) {
          throw new Error(
            `plans/${plan.id} aylık değerlendirme kimlik, dönem veya kronoloji sözleşmesine uymuyor.`,
          );
        }
        evaluationIds.add(evaluation.id);
        previousCreatedAt = evaluation.createdAt;
      }
    }
    if (!teacherOwnedPeriodPlan && plan.planType === "weekly") {
      const weekSnapshot = isRecord(plan.premiumWeekSnapshot)
        ? plan.premiumWeekSnapshot
        : null;
      const templates = Array.isArray(plan.premiumActivityTemplates)
        ? plan.premiumActivityTemplates
        : [];
      const templateIds = templates.flatMap((template) =>
        isRecord(template) && typeof template.id === "string" ? [template.id] : [],
      );
      const mainTemplateIds = templates.flatMap((template) =>
        isRecord(template) &&
        typeof template.id === "string" &&
        template.activityRole === "main"
          ? [template.id]
          : [],
      );
      const alternativeTemplateIds = templates.flatMap((template) =>
        isRecord(template) &&
        typeof template.id === "string" &&
        template.activityRole === "alternative"
          ? [template.id]
          : [],
      );
      const snapshotActivityIds = weekSnapshot && Array.isArray(weekSnapshot.activityIds)
        ? weekSnapshot.activityIds
        : [];
      const snapshotMainIds = weekSnapshot && Array.isArray(weekSnapshot.mainActivityIds)
        ? weekSnapshot.mainActivityIds
        : [];
      if (
        !weekSnapshot ||
        weekSnapshot.id !== plan.weekId ||
        weekSnapshot.periodStart !== plan.periodStart ||
        weekSnapshot.periodEnd !== plan.periodEnd ||
        templateIds.length !== 3 ||
        new Set(templateIds).size !== 3 ||
        mainTemplateIds.length !== 2 ||
        alternativeTemplateIds.length !== 1 ||
        templates.some(
          (template) => !isRecord(template) || template.weekId !== plan.weekId,
        ) ||
        snapshotActivityIds.length !== 3 ||
        new Set(snapshotActivityIds).size !== 3 ||
        [...snapshotActivityIds].sort().join("|") !== [...templateIds].sort().join("|") ||
        snapshotMainIds.length !== 2 ||
        [...snapshotMainIds].sort().join("|") !== [...mainTemplateIds].sort().join("|") ||
        weekSnapshot.alternativeActivityId !== alternativeTemplateIds[0]
      ) {
        throw new Error(`plans/${plan.id} haftalık 2 ana + 1 alternatif ilişkisi geçersiz.`);
      }
    }
    if (
      !teacherOwnedPeriodPlan &&
      plan.planType === "weekly" &&
      Array.isArray(plan.weeklyEvaluations)
    ) {
      const evaluationIds = new Set<string>();
      let previousEvaluationCreatedAt: string | null = null;
      for (const evaluation of plan.weeklyEvaluations) {
        if (
          !isRecord(evaluation) ||
          !hasExactKeys(evaluation, [
            "createdAt",
            "evidenceSummary",
            "id",
            "nextPlanDecision",
            "nextPlanTargetPlanId",
            "observationIds",
            "reflection",
            "teacherAuthored",
          ]) ||
          typeof evaluation.id !== "string" ||
          !UUID_PATTERN.test(evaluation.id) ||
          typeof evaluation.reflection !== "string" ||
          !evaluation.reflection.trim() ||
          typeof evaluation.evidenceSummary !== "string" ||
          !evaluation.evidenceSummary.trim() ||
          !Array.isArray(evaluation.observationIds) ||
          evaluation.observationIds.length === 0 ||
          !evaluation.observationIds.every(
            (id) => typeof id === "string" && UUID_PATTERN.test(id),
          ) ||
          new Set(evaluation.observationIds).size !==
            evaluation.observationIds.length ||
          !["keep", "adapt", "replace", "observe-more"].includes(
            String(evaluation.nextPlanDecision),
          ) ||
          (evaluation.nextPlanTargetPlanId !== null &&
            (typeof evaluation.nextPlanTargetPlanId !== "string" ||
              !UUID_PATTERN.test(evaluation.nextPlanTargetPlanId))) ||
          evaluation.teacherAuthored !== true ||
          !isValidUtcIso(evaluation.createdAt) ||
          evaluation.createdAt > plan.updatedAt ||
          evaluationIds.has(evaluation.id) ||
          (previousEvaluationCreatedAt !== null &&
            evaluation.createdAt < previousEvaluationCreatedAt)
        ) {
          throw new Error(`plans/${plan.id} haftalık değerlendirmesi geçersiz.`);
        }
        evaluationIds.add(evaluation.id);
        previousEvaluationCreatedAt = evaluation.createdAt;
        if (
          parseTeacherWeeklyValuesNarrative(
            evaluation.reflection,
            "Haftalık öğretmen yansıtması",
          ) !== evaluation.reflection ||
          parseTeacherWeeklyValuesNarrative(
            evaluation.evidenceSummary,
            "Haftalık kanıt özeti",
          ) !== evaluation.evidenceSummary
        ) {
          throw new Error(
            `plans/${plan.id} haftalık değerlendirmesi kanonik öğretmen anlatısı taşımıyor.`,
          );
        }
      }
      if (plan.nextPlanDecisionContext !== undefined) {
        const context = plan.nextPlanDecisionContext;
        if (
          !isRecord(context) ||
          !hasExactKeys(context, [
            "createdAt",
            "decision",
            "evaluationId",
            "evidenceSummary",
            "sourceWeeklyPlanId",
            "teacherReflection",
          ]) ||
          typeof plan.previousWeekEvaluationId !== "string" ||
          !UUID_PATTERN.test(plan.previousWeekEvaluationId) ||
          context.evaluationId !== plan.previousWeekEvaluationId ||
          typeof context.sourceWeeklyPlanId !== "string" ||
          !UUID_PATTERN.test(context.sourceWeeklyPlanId) ||
          !["keep", "adapt", "replace", "observe-more"].includes(
            String(context.decision),
          ) ||
          typeof context.evidenceSummary !== "string" ||
          !context.evidenceSummary.trim() ||
          typeof context.teacherReflection !== "string" ||
          !context.teacherReflection.trim() ||
          typeof context.createdAt !== "string" ||
          !UTC_ISO_PATTERN.test(context.createdAt)
        ) {
          throw new Error(`plans/${plan.id} önceki hafta karar bağlamı geçersiz.`);
        }
        if (
          parseTeacherWeeklyValuesNarrative(
            context.evidenceSummary,
            "Önceki hafta kanıt özeti",
          ) !== context.evidenceSummary ||
          parseTeacherWeeklyValuesNarrative(
            context.teacherReflection,
            "Önceki hafta öğretmen yansıtması",
          ) !== context.teacherReflection
        ) {
          throw new Error(
            `plans/${plan.id} önceki hafta karar bağlamı kanonik öğretmen anlatısı taşımıyor.`,
          );
        }
      }
    }
  }
  const plansById = new Map(payload.plans.map((plan) => [plan.id, plan]));
  for (const plan of payload.plans) {
    const planScope = planScopes.get(plan.id) ?? null;
    if (isTeacherOwnedPlanRecord(plan)) {
      if (!planScope) {
        throw new Error(`plans/${plan.id} öğretmen plan kapsamı geçersiz.`);
      }
      if (plan.planType === "annual") {
        const linkedMonths = payload.plans.filter(
          (candidate) =>
            candidate.planOrigin === TEACHER_AUTHORED_PLAN_ORIGIN &&
            candidate.planType === "monthly" &&
            candidate.annualPlanId === plan.id,
        );
        const linkedMonthIds = new Set(linkedMonths.map((candidate) => candidate.id));
        if (
          linkedMonthIds.size !== plan.monthlySectionIds.length ||
          plan.monthlySectionIds.some((id) => !linkedMonthIds.has(id)) ||
          linkedMonths.some((monthly) => {
            const scope = planScopes.get(monthly.id) ?? null;
            return (
              !isTeacherOwnedPlanRecord(monthly) ||
              monthly.planType !== "monthly" ||
              !scope ||
              !scopesMatch(planScope, scope) ||
              monthly.periodStart < plan.periodStart ||
              monthly.periodEnd > plan.periodEnd
            );
          })
        ) {
          throw new Error(`plans/${plan.id} öğretmen aylık plan grafiği geçersiz.`);
        }
        continue;
      }
      if (plan.planType === "monthly") {
        const annual = plansById.get(plan.annualPlanId);
        const annualScope = annual ? planScopes.get(annual.id) ?? null : null;
        const linkedWeeks = payload.plans.filter(
          (candidate) =>
            candidate.planOrigin === TEACHER_AUTHORED_PLAN_ORIGIN &&
            candidate.planType === "weekly" &&
            candidate.monthlyPlanId === plan.id,
        );
        const linkedWeekIds = new Set(linkedWeeks.map((candidate) => candidate.id));
        if (
          !annual ||
          !isTeacherOwnedPlanRecord(annual) ||
          annual.planType !== "annual" ||
          !annualScope ||
          !scopesMatch(planScope, annualScope) ||
          !annual.monthlySectionIds.includes(plan.id) ||
          plan.periodStart < annual.periodStart ||
          plan.periodEnd > annual.periodEnd ||
          linkedWeekIds.size !== plan.weeklySectionIds.length ||
          plan.weeklySectionIds.some((id) => !linkedWeekIds.has(id)) ||
          linkedWeeks.some((weekly) => {
            const scope = planScopes.get(weekly.id) ?? null;
            return (
              !isTeacherOwnedPlanRecord(weekly) ||
              weekly.planType !== "weekly" ||
              weekly.annualPlanId !== annual.id ||
              !scope ||
              !scopesMatch(planScope, scope) ||
              weekly.periodStart < plan.periodStart ||
              weekly.periodEnd > plan.periodEnd
            );
          })
        ) {
          throw new Error(`plans/${plan.id} öğretmen haftalık plan grafiği geçersiz.`);
        }
        if (plan.nextMonthDecisionContext) {
          const context = plan.nextMonthDecisionContext;
          const source = plansById.get(context.sourceMonthlyPlanId);
          const sourceIndex = isTeacherOwnedPlanRecord(annual) &&
            annual.planType === "annual"
            ? annual.monthlySectionIds.indexOf(context.sourceMonthlyPlanId)
            : -1;
          const targetIndex = isTeacherOwnedPlanRecord(annual) &&
            annual.planType === "annual"
            ? annual.monthlySectionIds.indexOf(plan.id)
            : -1;
          const evaluation =
            source &&
            isTeacherOwnedPlanRecord(source) &&
            source.planType === "monthly"
              ? (source.monthlyEvaluations ?? []).find(
                  (entry) => entry.id === context.evaluationId,
                )
              : undefined;
          const latestReview = context.reviewHistory.at(-1);
          if (
            !source ||
            !isTeacherOwnedPlanRecord(source) ||
            source.planType !== "monthly" ||
            source.annualPlanId !== plan.annualPlanId ||
            sourceIndex < 0 ||
            targetIndex !== sourceIndex + 1 ||
            source.periodEnd >= plan.periodStart ||
            plan.previousMonthEvaluationId !== context.evaluationId ||
            !evaluation ||
            evaluation.nextMonthTargetPlanId !== plan.id ||
            evaluation.targetPlanRevisionNumberAtSuggestion !==
              context.targetPlanRevisionNumberAtSuggestion ||
            evaluation.sourcePlanRevisionNumber !== context.sourcePlanRevisionNumber ||
            evaluation.nextMonthRecommendation !== context.recommendation ||
            evaluation.createdAt !== context.createdAt ||
            context.targetPlanRevisionNumberAtSuggestion > plan.revisionNumber ||
            (latestReview !== undefined &&
              latestReview.targetPlanRevisionNumberAfter > plan.revisionNumber)
          ) {
            throw new Error(`plans/${plan.id} önceki ay öneri zinciri geçersiz.`);
          }
        }
        continue;
      }
      const annual = plansById.get(plan.annualPlanId);
      const monthly = plansById.get(plan.monthlyPlanId);
      const annualScope = annual ? planScopes.get(annual.id) ?? null : null;
      const monthlyScope = monthly ? planScopes.get(monthly.id) ?? null : null;
      if (
        !annual ||
        !monthly ||
        !isTeacherOwnedPlanRecord(annual) ||
        annual.planType !== "annual" ||
        !isTeacherOwnedPlanRecord(monthly) ||
        monthly.planType !== "monthly" ||
        monthly.annualPlanId !== annual.id ||
        !annualScope ||
        !monthlyScope ||
        !scopesMatch(planScope, annualScope) ||
        !scopesMatch(planScope, monthlyScope) ||
        !annual.monthlySectionIds.includes(monthly.id) ||
        !monthly.weeklySectionIds.includes(plan.id) ||
        plan.periodStart < monthly.periodStart ||
        plan.periodEnd > monthly.periodEnd
      ) {
        throw new Error(`plans/${plan.id} öğretmen plan ebeveyn zinciri geçersiz.`);
      }
      continue;
    }
    if (plan.planType === "monthly") {
      const annual =
        typeof plan.annualPlanId === "string"
          ? plansById.get(plan.annualPlanId)
          : undefined;
      const annualScope = annual ? planScopes.get(annual.id) ?? null : null;
      const monthlyLensPreference = premiumPlanLensPreferences.get(plan.id);
      const annualLensPreference = annual
        ? premiumPlanLensPreferences.get(annual.id)
        : undefined;
      if (
        !annual ||
        annual.planType !== "annual" ||
        !planScope ||
        !annualScope ||
        !scopesMatch(planScope, annualScope) ||
        annual.contentPackId !== plan.contentPackId ||
        annual.contentPackVersion !== plan.contentPackVersion ||
        !sameCanonicalSnapshot(
          annual.contentPackSnapshot,
          plan.contentPackSnapshot,
        ) ||
        !monthlyLensPreference ||
        !annualLensPreference ||
        !samePremiumLensPreference(
          monthlyLensPreference,
          annualLensPreference,
        ) ||
        !Array.isArray(annual.monthlySectionIds) ||
        !annual.monthlySectionIds.includes(plan.id)
      ) {
        throw new Error(`plans/${plan.id} yıllık plan ilişkisi geçersiz.`);
      }
    }
    if (plan.planType === "weekly") {
      const annual =
        typeof plan.annualPlanId === "string"
          ? plansById.get(plan.annualPlanId)
          : undefined;
      const monthly =
        typeof plan.monthlyPlanId === "string"
          ? plansById.get(plan.monthlyPlanId)
          : undefined;
      const annualScope = annual ? planScopes.get(annual.id) ?? null : null;
      const monthlyScope = monthly ? planScopes.get(monthly.id) ?? null : null;
      const weeklyLensPreference = premiumPlanLensPreferences.get(plan.id);
      const annualLensPreference = annual
        ? premiumPlanLensPreferences.get(annual.id)
        : undefined;
      const monthlyLensPreference = monthly
        ? premiumPlanLensPreferences.get(monthly.id)
        : undefined;
      if (
        !annual ||
        annual.planType !== "annual" ||
        !monthly ||
        monthly.planType !== "monthly" ||
        monthly.annualPlanId !== annual.id ||
        !planScope ||
        !annualScope ||
        !monthlyScope ||
        !scopesMatch(planScope, annualScope) ||
        !scopesMatch(planScope, monthlyScope) ||
        plan.contentPackId !== annual.contentPackId ||
        plan.contentPackVersion !== annual.contentPackVersion ||
        plan.contentPackId !== monthly.contentPackId ||
        plan.contentPackVersion !== monthly.contentPackVersion ||
        !sameCanonicalSnapshot(
          annual.contentPackSnapshot,
          plan.contentPackSnapshot,
        ) ||
        !sameCanonicalSnapshot(
          monthly.contentPackSnapshot,
          plan.contentPackSnapshot,
        ) ||
        !weeklyLensPreference ||
        !annualLensPreference ||
        !monthlyLensPreference ||
        !samePremiumLensPreference(
          weeklyLensPreference,
          annualLensPreference,
        ) ||
        !samePremiumLensPreference(
          weeklyLensPreference,
          monthlyLensPreference,
        ) ||
        !Array.isArray(monthly.weeklySectionIds) ||
        !monthly.weeklySectionIds.includes(plan.id) ||
        String(plan.periodStart) < String(monthly.periodStart) ||
        String(plan.periodEnd) > String(monthly.periodEnd)
      ) {
        throw new Error(`plans/${plan.id} aylık plan ilişkisi geçersiz.`);
      }
      const monthlyTemplates = Array.isArray(monthly.premiumActivityTemplates)
        ? monthly.premiumActivityTemplates
        : [];
      if (
        !Array.isArray(plan.premiumActivityTemplates) ||
        plan.premiumActivityTemplates.some(
          (weeklyTemplate) =>
            !isRecord(weeklyTemplate) ||
            !monthlyTemplates.some(
              (monthlyTemplate) =>
                isRecord(monthlyTemplate) &&
                monthlyTemplate.id === weeklyTemplate.id &&
                sameCanonicalSnapshot(monthlyTemplate, weeklyTemplate),
            ),
        )
      ) {
        throw new Error(`plans/${plan.id} haftalık etkinlik kümesi aylık kaynakla uyuşmuyor.`);
      }
      if (Array.isArray(plan.weeklyEvaluations)) {
        for (const evaluation of plan.weeklyEvaluations) {
          if (!isRecord(evaluation) || evaluation.nextPlanTargetPlanId === null) {
            continue;
          }
          const target =
            typeof evaluation.nextPlanTargetPlanId === "string"
              ? plansById.get(evaluation.nextPlanTargetPlanId)
              : undefined;
          const targetContext = target && isRecord(target.nextPlanDecisionContext)
            ? target.nextPlanDecisionContext
            : null;
          const latestEvaluationForTarget = plan.weeklyEvaluations
            .filter(
              (candidate) =>
                isRecord(candidate) &&
                candidate.nextPlanTargetPlanId === evaluation.nextPlanTargetPlanId,
            )
            .reduce<Record<string, unknown> | null>((latest, candidate) => {
              if (!isRecord(candidate)) return latest;
              if (!latest) return candidate;
              return String(candidate.createdAt) >= String(latest.createdAt)
                ? candidate
                : latest;
            }, null);
          const isLatestDecision = latestEvaluationForTarget?.id === evaluation.id;
          if (
            !target ||
            target.planType !== "weekly" ||
            target.monthlyPlanId !== plan.monthlyPlanId ||
            String(target.periodStart) <= String(plan.periodEnd) ||
            (isLatestDecision &&
              (target.previousWeekEvaluationId !== evaluation.id ||
                !targetContext ||
                targetContext.sourceWeeklyPlanId !== plan.id ||
                targetContext.evaluationId !== evaluation.id))
          ) {
            throw new Error(`plans/${plan.id} sonraki plan karar ilişkisi geçersiz.`);
          }
        }
      }
    }
    if (
      plan.planType === "daily" &&
      plan.teacherOwnedDailyFlow !== undefined &&
      plan.sourceAnnualPlanId === undefined &&
      plan.sourceMonthlyPlanId === undefined &&
      plan.sourceWeeklyPlanId === undefined
    ) {
      throw new Error(
        `plans/${plan.id} öğretmen günlük akışı kaynak plan zinciri olmadan saklanamaz.`,
      );
    }
    if (
      plan.planType === "daily" &&
      (plan.sourceAnnualPlanId !== undefined ||
        plan.sourceMonthlyPlanId !== undefined ||
        plan.sourceWeeklyPlanId !== undefined)
    ) {
      const annual =
        typeof plan.sourceAnnualPlanId === "string"
          ? plansById.get(plan.sourceAnnualPlanId)
          : undefined;
      const monthly =
        typeof plan.sourceMonthlyPlanId === "string"
          ? plansById.get(plan.sourceMonthlyPlanId)
          : undefined;
      const weekly =
        typeof plan.sourceWeeklyPlanId === "string"
          ? plansById.get(plan.sourceWeeklyPlanId)
          : undefined;
      const annualScope = annual ? planScopes.get(annual.id) ?? null : null;
      const monthlyScope = monthly ? planScopes.get(monthly.id) ?? null : null;
      const weeklyScope = weekly ? planScopes.get(weekly.id) ?? null : null;
      const teacherOwnedWeekly =
        weekly && isTeacherOwnedPlanRecord(weekly) && weekly.planType === "weekly"
          ? weekly
          : null;
      if (teacherOwnedWeekly) {
        if (
          !annual ||
          !isTeacherOwnedPlanRecord(annual) ||
          annual.planType !== "annual" ||
          !monthly ||
          !isTeacherOwnedPlanRecord(monthly) ||
          monthly.planType !== "monthly" ||
          monthly.annualPlanId !== annual.id ||
          teacherOwnedWeekly.annualPlanId !== annual.id ||
          teacherOwnedWeekly.monthlyPlanId !== monthly.id ||
          !annual.monthlySectionIds.includes(monthly.id) ||
          !monthly.weeklySectionIds.includes(teacherOwnedWeekly.id) ||
          !planScope ||
          !annualScope ||
          !monthlyScope ||
          !weeklyScope ||
          !scopesMatch(planScope, annualScope) ||
          !scopesMatch(planScope, monthlyScope) ||
          !scopesMatch(planScope, weeklyScope) ||
          String(plan.civilDate) < teacherOwnedWeekly.periodStart ||
          String(plan.civilDate) > teacherOwnedWeekly.periodEnd ||
          plan.sourceContentPackSnapshot !== undefined ||
          plan.sourceActivityTemplateId !== undefined ||
          plan.sourceActivityTemplateSnapshot !== undefined ||
          plan.appliedActivityTemplateId !== undefined ||
          plan.appliedActivityTemplateSnapshot !== undefined ||
          plan.premiumDailyFlowSnapshot !== undefined ||
          (plan.teacherOwnedDailyFlow !== undefined &&
            (!isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow) ||
              plan.teacherOwnedDailyFlow.createdAt !== plan.createdAt)) ||
          plan.teacherPreferredLensId !== undefined ||
          plan.teacherPreferredSupportingLensIds !== undefined ||
          plan.lensSelectionMode !== undefined
        ) {
          throw new Error(
            `plans/${plan.id} öğretmene ait günlük kaynak zinciri geçersiz.`,
          );
        }
        continue;
      }
      // Günlük kayıt, oluşturulduğu andaki öğretmen tercihini korur; daha sonra
      // değişen pano tercihi tarihsel günlük planı sessizce yeniden yazmaz.
      parsePremiumLensPreferenceRecord(plan, `plans/${plan.id}`);
      if (
        !annual ||
        annual.planType !== "annual" ||
        !monthly ||
        monthly.planType !== "monthly" ||
        !weekly ||
        weekly.planType !== "weekly" ||
        monthly.annualPlanId !== annual.id ||
        weekly.annualPlanId !== annual.id ||
        weekly.monthlyPlanId !== monthly.id ||
        !planScope ||
        !annualScope ||
        !monthlyScope ||
        !weeklyScope ||
        !scopesMatch(planScope, annualScope) ||
        !scopesMatch(planScope, monthlyScope) ||
        !scopesMatch(planScope, weeklyScope) ||
        String(plan.civilDate) < String(weekly.periodStart) ||
        String(plan.civilDate) > String(weekly.periodEnd) ||
        plan.teacherOwnedDailyFlow !== undefined ||
        !isRecord(plan.sourceContentPackSnapshot) ||
        !sameCanonicalSnapshot(
          plan.sourceContentPackSnapshot,
          annual.contentPackSnapshot,
        ) ||
        !sameCanonicalSnapshot(
          plan.sourceContentPackSnapshot,
          monthly.contentPackSnapshot,
        ) ||
        !sameCanonicalSnapshot(
          plan.sourceContentPackSnapshot,
          weekly.contentPackSnapshot,
        ) ||
        typeof plan.sourceActivityTemplateId !== "string" ||
        !isRecord(plan.sourceActivityTemplateSnapshot) ||
        plan.sourceActivityTemplateSnapshot.id !== plan.sourceActivityTemplateId ||
        plan.sourceActivityTemplateSnapshot.weekId !== weekly.weekId ||
        !Array.isArray(weekly.premiumActivityTemplates) ||
        !weekly.premiumActivityTemplates.some(
          (template) =>
            isRecord(template) &&
            template.id === plan.sourceActivityTemplateId &&
            sameCanonicalSnapshot(
              template,
              plan.sourceActivityTemplateSnapshot,
            ),
        )
      ) {
        throw new Error(`plans/${plan.id} premium kaynak zinciri geçersiz.`);
      }
      assertPremiumActivityValuesSnapshot(
        plan.sourceContentPackSnapshot,
        plan.sourceActivityTemplateSnapshot,
        `plans/${plan.id} sourceActivityTemplateSnapshot`,
      );
      const dailyFlow = isRecord(plan.premiumDailyFlowSnapshot)
        ? plan.premiumDailyFlowSnapshot
        : null;
      const blocks = dailyFlow && Array.isArray(dailyFlow.blocks)
        ? dailyFlow.blocks
        : [];
      const expectedBlockIds = [
        "arrival-wellbeing",
        "learning-centers",
        "morning-meeting",
        "first-main",
        "nutrition-selfcare",
        "outdoor-movement",
        "second-main",
        "rest-regulation",
        "small-group",
        "reflection-departure",
      ];
      const selectedPlacements = blocks.flatMap((block) =>
        isRecord(block) && Array.isArray(block.selectedActivityTemplateIds)
          ? block.selectedActivityTemplateIds
          : [],
      );
      const alternativePlacements = blocks.flatMap((block) =>
        isRecord(block) && Array.isArray(block.alternativeActivityTemplateIds)
          ? block.alternativeActivityTemplateIds
          : [],
      );
      const appliedPlacements = blocks.flatMap((block) =>
        isRecord(block) && Array.isArray(block.appliedActivityTemplateIds)
          ? block.appliedActivityTemplateIds
          : [],
      );
      const alternativeTemplate =
        dailyFlow && typeof dailyFlow.alternativeActivityTemplateId === "string"
          ? weekly.premiumActivityTemplates.find(
              (template) =>
                isRecord(template) &&
                template.id === dailyFlow.alternativeActivityTemplateId &&
                template.activityRole === "alternative",
            )
          : undefined;
      const appliedTemplateId =
        typeof plan.appliedActivityTemplateId === "string"
          ? plan.appliedActivityTemplateId
          : plan.sourceActivityTemplateId;
      const appliedTemplate = weekly.premiumActivityTemplates.find(
        (template) => isRecord(template) && template.id === appliedTemplateId,
      );
      const sourceTemplate = isRecord(plan.sourceActivityTemplateSnapshot)
        ? plan.sourceActivityTemplateSnapshot
        : null;
      const replacement = dailyFlow && isRecord(dailyFlow.alternativeReplacement)
        ? dailyFlow.alternativeReplacement
        : null;
      const alternativeActivated =
        dailyFlow?.activatedAlternativeTemplateId ===
        dailyFlow?.alternativeActivityTemplateId;
      if (
        !dailyFlow ||
        dailyFlow.sourceWeekId !== weekly.weekId ||
        dailyFlow.planCivilDate !== plan.civilDate ||
        dailyFlow.selectedActivityTemplateId !== plan.sourceActivityTemplateId ||
        (dailyFlow.activatedAlternativeTemplateId !== null &&
          typeof dailyFlow.activatedAlternativeTemplateId !== "string") ||
        typeof dailyFlow.alternativeActivityTemplateId !== "string" ||
        dailyFlow.alternativeActivityTemplateId === plan.sourceActivityTemplateId ||
        plan.sourceActivityTemplateSnapshot.activityRole !== "main" ||
        !alternativeTemplate ||
        !isRecord(appliedTemplate) ||
        (plan.appliedActivityTemplateId !== undefined &&
          (!isRecord(plan.appliedActivityTemplateSnapshot) ||
            plan.appliedActivityTemplateSnapshot.id !== appliedTemplateId ||
            !sameCanonicalSnapshot(
              plan.appliedActivityTemplateSnapshot,
              appliedTemplate,
            ))) ||
        (alternativeActivated
          ? appliedTemplateId !== dailyFlow.alternativeActivityTemplateId ||
            !replacement ||
            !hasExactKeys(replacement, [
              "activatedAlternativeTemplateId",
              "replacesMainActivityTemplateId",
              "teacherConfirmed",
            ]) ||
            replacement.activatedAlternativeTemplateId !==
              dailyFlow.alternativeActivityTemplateId ||
            replacement.replacesMainActivityTemplateId !==
              plan.sourceActivityTemplateId ||
            replacement.teacherConfirmed !== true
          : appliedTemplateId !== plan.sourceActivityTemplateId || replacement !== null) ||
        blocks.length !== 10 ||
        blocks.some(
          (block, index) =>
            !isRecord(block) ||
            !hasExactKeys(block, [
              "appliedActivityTemplateIds",
              "alternativeActivityTemplateIds",
              "durationMinutes",
              "flexibilityNote",
              "id",
              "purpose",
              "selectedActivityTemplateIds",
              "status",
              "teacherNote",
              "title",
              "transitionNote",
            ]) ||
            block.id !== expectedBlockIds[index] ||
            typeof block.title !== "string" ||
            !block.title.trim() ||
            typeof block.purpose !== "string" ||
            !block.purpose.trim() ||
            typeof block.flexibilityNote !== "string" ||
            !block.flexibilityNote.trim() ||
            !Array.isArray(block.selectedActivityTemplateIds) ||
            !Array.isArray(block.alternativeActivityTemplateIds) ||
            !Array.isArray(block.appliedActivityTemplateIds) ||
            !["planned", "optional", "skipped"].includes(String(block.status)) ||
            !Number.isInteger(block.durationMinutes) ||
            Number(block.durationMinutes) < 5 ||
            Number(block.durationMinutes) > 240 ||
            typeof block.transitionNote !== "string" ||
            block.transitionNote.length > 500 ||
            typeof block.teacherNote !== "string" ||
            block.teacherNote.length > 1_000 ||
            !block.selectedActivityTemplateIds.every((id) => id === plan.sourceActivityTemplateId) ||
            block.selectedActivityTemplateIds.length !==
              (sourceTemplate?.flowSlot === block.id ? 1 : 0) ||
            !block.alternativeActivityTemplateIds.every((id) => id === dailyFlow.alternativeActivityTemplateId) ||
            block.alternativeActivityTemplateIds.length !==
              (isRecord(alternativeTemplate) && alternativeTemplate.flowSlot === block.id ? 1 : 0) ||
            !block.appliedActivityTemplateIds.every((id) => id === appliedTemplateId) ||
            block.appliedActivityTemplateIds.length !==
              (block.status !== "skipped" && appliedTemplate.flowSlot === block.id ? 1 : 0) ||
            (block.status === "skipped" && block.appliedActivityTemplateIds.length > 0) ||
            block.appliedActivityTemplateIds.length > 1,
        ) ||
        selectedPlacements.length !== 1 ||
        alternativePlacements.length !== 1 ||
        appliedPlacements.length > 1
      ) {
        throw new Error(`plans/${plan.id} premium tam gün akışı geçersiz.`);
      }
      assertPremiumActivityValuesSnapshot(
        plan.sourceContentPackSnapshot,
        appliedTemplate,
        `plans/${plan.id} appliedActivityTemplateSnapshot`,
      );
    }
  }
  const activityScopes = new Map<string, ActiveClassroomScope | null>();
  for (const activity of payload.activities) {
    const activityScope = validatedRecordScope(
      activity,
      "activities",
      classroomsById,
    );
    activityScopes.set(activity.id, activityScope);
    if (activity.curriculumProfileSnapshot !== undefined) {
      validateCurriculumProfileShape(
        activity.curriculumProfileSnapshot,
        `activities/${activity.id}`,
      );
    }
    if (activity.planId !== undefined) {
      const plan =
        typeof activity.planId === "string"
          ? plansById.get(activity.planId)
          : undefined;
      if (
        activity.pedagogicalProvenance !== undefined ||
        plan?.pedagogicalProvenance !== undefined
      ) {
        assertPedagogicalPlanProvenance(
          activity.pedagogicalProvenance,
          `activities/${activity.id} pedagojik plan kaynağı`,
        );
        assertPedagogicalPlanProvenance(
          plan?.pedagogicalProvenance,
          `plans/${String(activity.planId)} pedagojik plan kaynağı`,
        );
        if (
          activity.pedagogicalProvenance.civilDate !== activity.civilDate ||
          plan?.pedagogicalProvenance.civilDate !== plan.civilDate ||
          canonicalJson(activity.pedagogicalProvenance) !==
            canonicalJson(plan.pedagogicalProvenance)
        ) {
          throw new Error(
            `activities/${activity.id} pedagojik plan kaynak zinciri geçersiz.`,
          );
        }
      }
      const planScope = plan ? planScopes.get(plan.id) ?? null : null;
      if (
        !plan ||
        !activityScope ||
        !planScope ||
        !scopesMatch(activityScope, planScope) ||
        activity.civilDate !== plan.civilDate
      ) {
        throw new Error(`activities/${activity.id} plan ilişkisi geçersiz.`);
      }
      if (
        activity.sourceAnnualPlanId !== undefined ||
        activity.sourceMonthlyPlanId !== undefined ||
        activity.sourceWeeklyPlanId !== undefined
      ) {
        const sourceWeekly =
          typeof activity.sourceWeeklyPlanId === "string"
            ? plansById.get(activity.sourceWeeklyPlanId)
            : undefined;
        if (
          sourceWeekly &&
          isTeacherOwnedPlanRecord(sourceWeekly) &&
          sourceWeekly.planType === "weekly"
        ) {
          if (
            plan.planType !== "daily" ||
            activity.sourceAnnualPlanId !== plan.sourceAnnualPlanId ||
            activity.sourceMonthlyPlanId !== plan.sourceMonthlyPlanId ||
            activity.sourceWeeklyPlanId !== plan.sourceWeeklyPlanId ||
            activity.sourceContentPackSnapshot !== undefined ||
            activity.sourceActivityTemplateId !== undefined ||
            activity.sourceActivityTemplateSnapshot !== undefined ||
            activity.appliedActivityTemplateId !== undefined ||
            activity.appliedActivityTemplateSnapshot !== undefined ||
            activity.teacherPreferredLensId !== undefined ||
            activity.teacherPreferredSupportingLensIds !== undefined ||
            activity.lensSelectionMode !== undefined
          ) {
            throw new Error(
              `activities/${activity.id} öğretmene ait günlük kaynak zinciri geçersiz.`,
            );
          }
          if (activity.teacherOwnedFlowBlockId !== undefined) {
            const teacherFlow = plan.teacherOwnedDailyFlow;
            const linkedBlock =
              isTeacherOwnedDailyFlow(teacherFlow) &&
              typeof activity.teacherOwnedFlowBlockId === "string"
                ? teacherFlow.blocks.find(
                    (block) => block.id === activity.teacherOwnedFlowBlockId,
                  )
                : null;
            if (
              !linkedBlock ||
              (linkedBlock.kind !== "teacher-activity-one" &&
                linkedBlock.kind !== "teacher-activity-two") ||
              linkedBlock.status === "skipped"
            ) {
              throw new Error(
                `activities/${activity.id} öğretmen akışı bölüm bağlantısı geçersiz.`,
              );
            }
          }
        } else {
          const activityLensPreference = parsePremiumLensPreferenceRecord(
            activity,
            `activities/${activity.id}`,
          );
          const planLensPreference = parsePremiumLensPreferenceRecord(
            plan,
            `plans/${plan.id}`,
          );
          if (
            plan.planType !== "daily" ||
            !samePremiumLensPreference(
              activityLensPreference,
              planLensPreference,
            ) ||
            activity.sourceAnnualPlanId !== plan.sourceAnnualPlanId ||
            activity.sourceMonthlyPlanId !== plan.sourceMonthlyPlanId ||
            activity.sourceWeeklyPlanId !== plan.sourceWeeklyPlanId ||
            activity.sourceActivityTemplateId !== plan.sourceActivityTemplateId ||
            activity.appliedActivityTemplateId !== plan.appliedActivityTemplateId ||
            !isRecord(activity.sourceContentPackSnapshot) ||
            !isRecord(activity.sourceActivityTemplateSnapshot) ||
            !sameCanonicalSnapshot(
              activity.sourceContentPackSnapshot,
              plan.sourceContentPackSnapshot,
            ) ||
            !sameCanonicalSnapshot(
              activity.sourceActivityTemplateSnapshot,
              plan.sourceActivityTemplateSnapshot,
            ) ||
            !sameCanonicalSnapshot(
              activity.appliedActivityTemplateSnapshot,
              plan.appliedActivityTemplateSnapshot,
            )
          ) {
            throw new Error(
              `activities/${activity.id} premium kaynak zinciri geçersiz.`,
            );
          }
          assertPremiumActivityValuesSnapshot(
            activity.sourceContentPackSnapshot,
            activity.sourceActivityTemplateSnapshot,
            `activities/${activity.id} sourceActivityTemplateSnapshot`,
          );
          if (activity.appliedActivityTemplateSnapshot !== undefined) {
            assertPremiumActivityValuesSnapshot(
              activity.sourceContentPackSnapshot,
              activity.appliedActivityTemplateSnapshot,
              `activities/${activity.id} appliedActivityTemplateSnapshot`,
            );
          }
        }
      }
      if (activity.assignmentMode !== undefined) {
        const assignedStudentIds =
          Array.isArray(activity.studentIds) &&
          activity.studentIds.every(
            (id) => typeof id === "string" && UUID_PATTERN.test(id),
          )
            ? activity.studentIds
            : [];
        const distinctStudentIds = new Set(assignedStudentIds);
        const targets =
          Array.isArray(activity.curriculumTargets) &&
          activity.curriculumTargets.every((target) => isRecord(target))
            ? activity.curriculumTargets
            : [];
        for (const target of targets) {
          assertObjectAllowedKeys(
            target,
            [
              "catalogCompleteness",
              "catalogId",
              "ageBands",
              "domain",
              "framework",
              "id",
              "kind",
              "officialCatalogVerified",
              "parentCode",
              "referenceCode",
              "referenceOrigin",
              "referenceTitle",
              "sourceCheckedOn",
              "sourceLabel",
              "sourcePage",
              "sourceSha256",
              "holisticGraphReference",
              "sourceUrl",
              "sourceVersion",
              "verificationStatus",
            ],
            `activities/${activity.id} program hedefi`,
          );
        }
        const targetIds = targets
          .map((target) => target.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0);
        const distinctTargetIds = new Set(targetIds);
        const planProfile =
          plan && isRecord(plan.curriculumProfileSnapshot)
            ? plan.curriculumProfileSnapshot
            : null;
        const targetsValid =
          targets.length > 0 &&
          targetIds.length === targets.length &&
          distinctTargetIds.size === targetIds.length &&
          targets.every(
            (target) =>
              typeof target.referenceCode === "string" &&
              target.referenceCode.trim().length > 0 &&
              typeof target.referenceTitle === "string" &&
              target.referenceTitle.trim().length > 0 &&
              typeof target.kind === "string" &&
              target.kind.trim().length > 0 &&
              typeof target.domain === "string" &&
              target.domain.trim().length > 0 &&
              isSafeHttpsUrl(target.sourceUrl) &&
              isValidCivilDate(target.sourceCheckedOn) &&
              (target.catalogCompleteness === "partial" ||
                target.catalogCompleteness === "complete") &&
              (target.verificationStatus === "official-source-checked" ||
                target.verificationStatus === "teacher-declared-unverified") &&
              planProfile !== null &&
              target.framework === planProfile.framework &&
              target.catalogId === planProfile.catalogId &&
              target.sourceVersion === planProfile.sourceVersion &&
              target.referenceOrigin ===
                (planProfile.referenceOrigin ?? "teacher-declared") &&
              target.officialCatalogVerified ===
                (planProfile.officialCatalogVerified === true) &&
              (target.holisticGraphReference === undefined ||
                isTymmHolisticGraphReference(target.holisticGraphReference)) &&
              (target.framework !== "tymm" ||
                target.catalogCompleteness !== "complete" ||
                target.verificationStatus !== "official-source-checked" ||
                target.officialCatalogVerified !== true ||
                (Array.isArray(target.ageBands) &&
                  target.ageBands.length === 1 &&
                  target.ageBands.every(
                    (ageBand) =>
                      ageBand === "36-48" ||
                      ageBand === "48-60" ||
                      ageBand === "60-72",
                  ) &&
                  typeof target.sourcePage === "number" &&
                  Number.isInteger(target.sourcePage) &&
                  target.sourcePage >= 1 &&
                  typeof target.sourceSha256 === "string" &&
                  /^sha256:[0-9a-f]{64}$/u.test(target.sourceSha256))),
          );
        const studentsValid =
          assignedStudentIds.length > 0 &&
          distinctStudentIds.size === assignedStudentIds.length &&
          assignedStudentIds.every((studentId) => {
            const allowedScopes = studentScopes.get(studentId) ?? [];
            return (
              activityScope !== null &&
              allowedScopes.some((studentScope) =>
                scopesMatch(activityScope, studentScope),
              )
            );
          });
        const assignments =
          Array.isArray(activity.targetAssignments) &&
          activity.targetAssignments.every((assignment) => isRecord(assignment))
            ? activity.targetAssignments
            : [];
        for (const assignment of assignments) {
          if (
            !hasExactKeys(assignment, [
              "assignedAt",
              "referenceCode",
              "status",
              "studentId",
              "targetId",
            ])
          ) {
            throw new Error(
              `activities/${activity.id} hedef dağıtımında tanımsız alan var.`,
            );
          }
        }
        const assignmentKeys = assignments.map(
          (assignment) =>
            `${String(assignment.studentId)}\u0000${String(assignment.targetId)}`,
        );
        const assignmentsValid =
          assignments.length === assignedStudentIds.length * targetIds.length &&
          new Set(assignmentKeys).size === assignments.length &&
          assignments.every(
            (assignment) =>
              typeof assignment.studentId === "string" &&
              distinctStudentIds.has(assignment.studentId) &&
              typeof assignment.targetId === "string" &&
              distinctTargetIds.has(assignment.targetId) &&
              assignment.status === "planned" &&
              typeof assignment.assignedAt === "string" &&
              UTC_ISO_PATTERN.test(assignment.assignedAt),
          );
        if (
          (activity.assignmentMode !== "whole-class" &&
            activity.assignmentMode !== "selected-students") ||
          activity.coverageStatus !== "planned" ||
          activity.schemaVersion < 2 ||
          !studentsValid ||
          !targetsValid ||
          !assignmentsValid
        ) {
          throw new Error(
            `activities/${activity.id} program hedefi dağıtım sözleşmesine uymuyor.`,
          );
        }
      }
    }
  }
  const activitiesById = new Map(
    payload.activities.map((activity) => [activity.id, activity]),
  );
  const observationsById = new Map(
    payload.observations.map((observation) => [observation.id, observation]),
  );
  const curriculumLinksById = new Map(
    payload.evidenceCurriculumLinks.map((link) => [link.id, link]),
  );
  for (const plan of payload.plans) {
    if (plan.planType !== "monthly" || !Array.isArray(plan.monthlyEvaluations)) {
      continue;
    }
    const planScope = planScopes.get(plan.id) ?? null;
    const teacherMonthlyPlan =
      isTeacherOwnedPlanRecord(plan) && plan.planType === "monthly" ? plan : null;
    if (teacherMonthlyPlan) {
      let previousCreatedAt: string | null = null;
      for (const candidate of teacherMonthlyPlan.monthlyEvaluations ?? []) {
        if (
          !isTeacherMonthlyEvaluation(candidate) ||
          candidate.monthlyPlanId !== teacherMonthlyPlan.id ||
          candidate.periodStart !== teacherMonthlyPlan.periodStart ||
          candidate.periodEnd !== teacherMonthlyPlan.periodEnd ||
          candidate.sourcePlanRevisionNumber > teacherMonthlyPlan.revisionNumber ||
          !recordWasVisibleAt(teacherMonthlyPlan, candidate.createdAt) ||
          (previousCreatedAt !== null && candidate.createdAt < previousCreatedAt)
        ) {
          throw new Error(
            `plans/${plan.id} öğretmen aylık değerlendirme dönem, revizyon veya kronoloji sözleşmesine uymuyor.`,
          );
        }
        const selectedObservationIds = new Set(candidate.children.observationIds);
        const coveredStudentIds = new Set<string>();
        const civilDates = new Set<string>();
        const weeklyPlanIds = new Set<string>();
        for (const observationId of candidate.children.observationIds) {
          const observation = observationsById.get(observationId);
          const daily = observation && typeof observation.planId === "string"
            ? plansById.get(observation.planId)
            : undefined;
          const weekly = daily && typeof daily.sourceWeeklyPlanId === "string"
            ? plansById.get(daily.sourceWeeklyPlanId)
            : undefined;
          const observationScope = observation
            ? observationScopes.get(observation.id) ?? null
            : null;
          const observedAt = observation && typeof observation.observedAt === "string"
            ? observation.observedAt
            : observation?.createdAt;
          if (
            !observation ||
            !daily ||
            !weekly ||
            daily.sourceMonthlyPlanId !== teacherMonthlyPlan.id ||
            !teacherMonthlyPlan.weeklySectionIds.includes(weekly.id) ||
            observation.rawTextImmutable !== true ||
            !planScope ||
            !observationScope ||
            !scopesMatch(planScope, observationScope) ||
            typeof observedAt !== "string" ||
            observedAt > candidate.createdAt ||
            !recordWasVisibleAt(observation, candidate.createdAt)
          ) {
            throw new Error(
              `plans/${plan.id} öğretmen aylık değerlendirme gözlem zinciri geçersiz.`,
            );
          }
          civilDates.add(String(observation.civilDate));
          weeklyPlanIds.add(weekly.id);
          const observationStudentIds = Array.isArray(observation.studentIds)
            ? observation.studentIds
            : typeof observation.studentId === "string"
              ? [observation.studentId]
              : [];
          observationStudentIds.forEach((studentId) => {
            if (candidate.children.coverage.activeStudentIds.includes(studentId)) {
              coveredStudentIds.add(studentId);
            }
          });
          const hasSelectedLink = candidate.children.curriculumLinkIds.some((linkId) => {
            const link = curriculumLinksById.get(linkId);
            return link?.observationId === observationId;
          });
          if (!hasSelectedLink) {
            throw new Error(
              `plans/${plan.id} öğretmen aylık değerlendirmesinde programsız gözlem var.`,
            );
          }
        }
        for (const linkId of candidate.children.curriculumLinkIds) {
          const link = curriculumLinksById.get(linkId);
          const linkScope = link
            ? validatedRecordScope(link, "evidenceCurriculumLinks", classroomsById)
            : null;
          if (
            !link ||
            typeof link.observationId !== "string" ||
            !selectedObservationIds.has(link.observationId) ||
            link.confirmationMethod !== "teacher-confirmed" ||
            !planScope ||
            !linkScope ||
            !scopesMatch(planScope, linkScope) ||
            !recordWasVisibleAt(link, candidate.createdAt) ||
            typeof link.confirmedAt !== "string" ||
            link.confirmedAt > candidate.createdAt
          ) {
            throw new Error(
              `plans/${plan.id} öğretmen aylık değerlendirme program bağı geçersiz.`,
            );
          }
        }
        const coveredActiveStudentIds = [
          ...candidate.children.coverage.activeStudentIds,
        ].filter((id) => coveredStudentIds.has(id));
        const uncoveredActiveStudentIds = [
          ...candidate.children.coverage.activeStudentIds,
        ].filter((id) => !coveredStudentIds.has(id));
        const expectedCoverage = {
          observationCount: candidate.children.observationIds.length,
          curriculumLinkCount: candidate.children.curriculumLinkIds.length,
          distinctCivilDateCount: civilDates.size,
          distinctWeekCount: weeklyPlanIds.size,
          activeStudentIds: candidate.children.coverage.activeStudentIds,
          coveredActiveStudentIds,
          uncoveredActiveStudentIds,
        };
        if (canonicalJson(expectedCoverage) !== canonicalJson(candidate.children.coverage)) {
          throw new Error(
            `plans/${plan.id} öğretmen aylık değerlendirme kapsam özeti kaynak kayıtlarla uyuşmuyor.`,
          );
        }
        if (candidate.nextMonthTargetPlanId !== undefined) {
          const annual = plansById.get(teacherMonthlyPlan.annualPlanId);
          const sourceIndex =
            annual &&
            isTeacherOwnedPlanRecord(annual) &&
            annual.planType === "annual"
              ? annual.monthlySectionIds.indexOf(teacherMonthlyPlan.id)
              : -1;
          const expectedTargetId =
            annual &&
            isTeacherOwnedPlanRecord(annual) &&
            annual.planType === "annual" &&
            sourceIndex >= 0
              ? annual.monthlySectionIds[sourceIndex + 1] ?? null
              : null;
          const target = typeof candidate.nextMonthTargetPlanId === "string"
            ? plansById.get(candidate.nextMonthTargetPlanId)
            : undefined;
          const isLatestEvaluation =
            candidate === teacherMonthlyPlan.monthlyEvaluations?.at(-1);
          const context =
            target &&
            isTeacherOwnedPlanRecord(target) &&
            target.planType === "monthly"
              ? target.nextMonthDecisionContext
              : undefined;
          if (
            sourceIndex < 0 ||
            candidate.nextMonthTargetPlanId !== expectedTargetId ||
            (expectedTargetId === null
              ? candidate.targetPlanRevisionNumberAtSuggestion !== null
              : !target ||
                !isTeacherOwnedPlanRecord(target) ||
                target.planType !== "monthly" ||
                target.annualPlanId !== teacherMonthlyPlan.annualPlanId ||
                target.periodStart <= teacherMonthlyPlan.periodEnd ||
                typeof candidate.targetPlanRevisionNumberAtSuggestion !== "number" ||
                candidate.targetPlanRevisionNumberAtSuggestion >
                  target.revisionNumber) ||
            (isLatestEvaluation &&
              expectedTargetId !== null &&
              (!target ||
                !isTeacherOwnedPlanRecord(target) ||
                target.planType !== "monthly" ||
                target.previousMonthEvaluationId !== candidate.id ||
                !context ||
                context.sourceMonthlyPlanId !== teacherMonthlyPlan.id ||
                context.evaluationId !== candidate.id ||
                context.recommendation !== candidate.nextMonthRecommendation ||
                context.sourcePlanRevisionNumber !==
                  candidate.sourcePlanRevisionNumber ||
                context.targetPlanRevisionNumberAtSuggestion !==
                  candidate.targetPlanRevisionNumberAtSuggestion ||
                context.createdAt !== candidate.createdAt))
          ) {
            throw new Error(
              `plans/${plan.id} öğretmen aylık öneri hedefi veya karar izi geçersiz.`,
            );
          }
        }
        previousCreatedAt = candidate.createdAt;
      }
      continue;
    }
    const planProfile = isRecord(plan.curriculumProfileSnapshot)
      ? plan.curriculumProfileSnapshot
      : null;
    for (const [index, candidate] of plan.monthlyEvaluations.entries()) {
      const evaluation = parsePremiumMonthlyEvaluation(
        candidate,
        `plans/${plan.id} aylık değerlendirme ${index + 1}`,
      );
      const evaluationCreatedAt = evaluation.createdAt;
      const selectedObservationIds = new Set(
        evaluation.children.observationIds,
      );
      const selectedStudentIds = new Set<string>();
      const civilDates = new Set<string>();
      const weeklyPlanIds = new Set<string>();
      const environments = new Set<string>();
      let anecdotalObservationCount = 0;
      for (const observationId of evaluation.children.observationIds) {
        const observation = observationsById.get(observationId);
        const observationScope = observation
          ? observationScopes.get(observation.id) ?? null
          : null;
        const daily =
          observation && typeof observation.planId === "string"
            ? plansById.get(observation.planId)
            : undefined;
        const observedAt =
          observation && typeof observation.observedAt === "string"
            ? observation.observedAt
            : observation?.createdAt;
        const dailyScope = daily ? planScopes.get(daily.id) ?? null : null;
        const sourceWeekly =
          daily && typeof daily.sourceWeeklyPlanId === "string"
            ? plansById.get(daily.sourceWeeklyPlanId)
            : undefined;
        const sourceWeeklyScope = sourceWeekly
          ? planScopes.get(sourceWeekly.id) ?? null
          : null;
        if (
          !observation ||
          observation.rawTextImmutable !== true ||
          !recordWasVisibleAt(observation, evaluationCreatedAt) ||
          !isValidUtcIso(observedAt) ||
          Date.parse(observedAt) > Date.parse(evaluationCreatedAt) ||
          !isCivilDate(observation.civilDate) ||
          observation.civilDate < evaluation.periodStart ||
          observation.civilDate > evaluation.periodEnd ||
          !daily ||
          daily.planType !== "daily" ||
          daily.sourceMonthlyPlanId !== plan.id ||
          !recordWasVisibleAt(daily, evaluationCreatedAt) ||
          !sourceWeekly ||
          sourceWeekly.planType !== "weekly" ||
          sourceWeekly.monthlyPlanId !== plan.id ||
          !recordWasVisibleAt(sourceWeekly, evaluationCreatedAt) ||
          !planScope ||
          !observationScope ||
          !dailyScope ||
          !sourceWeeklyScope ||
          !scopesMatch(planScope, observationScope) ||
          !scopesMatch(planScope, dailyScope) ||
          !scopesMatch(planScope, sourceWeeklyScope)
        ) {
          throw new Error(
            `plans/${plan.id} aylık değerlendirmesi bilinmeyen, tarih dışı veya kapsam dışı gözleme bağlı.`,
          );
        }
        parseTeacherWeeklyValuesNarrative(
          observation.rawText,
          `plans/${plan.id} aylık değerlendirmesine bağlı ham gözlem`,
        );
        civilDates.add(observation.civilDate);
        if (typeof daily.sourceWeeklyPlanId === "string") {
          weeklyPlanIds.add(daily.sourceWeeklyPlanId);
        }
        if (observation.observationType === "anecdotal") {
          anecdotalObservationCount += 1;
        }
        if (Array.isArray(observation.studentIds)) {
          observation.studentIds.forEach((studentId) => {
            if (typeof studentId === "string") selectedStudentIds.add(studentId);
          });
        }
        const activity =
          typeof observation.activityId === "string"
            ? activitiesById.get(observation.activityId)
            : undefined;
        const appliedTemplate = activity && isRecord(
          activity.appliedActivityTemplateSnapshot,
        )
          ? activity.appliedActivityTemplateSnapshot
          : activity && isRecord(activity.sourceActivityTemplateSnapshot)
            ? activity.sourceActivityTemplateSnapshot
            : null;
        const environment =
          appliedTemplate && typeof appliedTemplate.environment === "string"
            ? appliedTemplate.environment.trim()
            : activity && typeof activity.environment === "string"
              ? activity.environment.trim()
              : "";
        if (environment) environments.add(environment);
      }

      const observationsWithSelectedLink = new Set<string>();
      for (const linkId of evaluation.children.curriculumLinkIds) {
        const link = curriculumLinksById.get(linkId);
        const linkScope = link
          ? validatedRecordScope(
              link,
              "evidenceCurriculumLinks",
              classroomsById,
            )
          : null;
        if (
          !link ||
          !recordWasVisibleAt(link, evaluationCreatedAt) ||
          link.confirmationMethod !== "teacher-confirmed" ||
          typeof link.observationId !== "string" ||
          !selectedObservationIds.has(link.observationId) ||
          !isValidUtcIso(link.confirmedAt) ||
          Date.parse(link.confirmedAt) > Date.parse(evaluationCreatedAt) ||
          !planProfile ||
          link.framework !== planProfile.framework ||
          link.catalogId !== planProfile.catalogId ||
          link.sourceVersion !== planProfile.sourceVersion ||
          !planScope ||
          !linkScope ||
          !scopesMatch(planScope, linkScope)
        ) {
          throw new Error(
            `plans/${plan.id} aylık değerlendirmesi izlenemeyen öğretmen onaylı program bağı taşıyor.`,
          );
        }
        observationsWithSelectedLink.add(link.observationId);
      }
      if (
        evaluation.children.observationIds.some(
          (observationId) => !observationsWithSelectedLink.has(observationId),
        )
      ) {
        throw new Error(
          `plans/${plan.id} aylık değerlendirmesinde program bağı olmayan seçili gözlem var.`,
        );
      }

      for (const studentId of evaluation.children.coverage.activeStudentIds) {
        const student = studentsById.get(studentId);
        const allowedScopes = studentScopes.get(studentId) ?? [];
        if (
          !student ||
          !recordWasVisibleAt(student, evaluationCreatedAt) ||
          !planScope ||
          !allowedScopes.some((scope) => scopesMatch(planScope, scope))
        ) {
          throw new Error(
            `plans/${plan.id} aylık değerlendirmesi izlenemeyen aktif sınıf çocuğu kimliği taşıyor.`,
          );
        }
      }
      const coveredActiveStudentIds =
        evaluation.children.coverage.activeStudentIds.filter((studentId) =>
          selectedStudentIds.has(studentId),
        );
      const uncoveredActiveStudentIds =
        evaluation.children.coverage.activeStudentIds.filter(
          (studentId) => !selectedStudentIds.has(studentId),
        );
      const expectedCoverage = {
        observationCount: evaluation.children.observationIds.length,
        anecdotalObservationCount,
        programLinkedObservationCount: observationsWithSelectedLink.size,
        curriculumLinkCount: evaluation.children.curriculumLinkIds.length,
        distinctCivilDateCount: civilDates.size,
        distinctWeekCount: weeklyPlanIds.size,
        distinctStudentCount: selectedStudentIds.size,
        distinctEnvironmentCount: environments.size,
        activeStudentCount:
          evaluation.children.coverage.activeStudentIds.length,
        coveredActiveStudentCount: coveredActiveStudentIds.length,
        activeStudentIds: evaluation.children.coverage.activeStudentIds,
        coveredActiveStudentIds,
        uncoveredActiveStudentIds,
      };
      if (
        canonicalJson(expectedCoverage) !==
        canonicalJson(evaluation.children.coverage)
      ) {
        throw new Error(
          `plans/${plan.id} aylık değerlendirmesinin kanıt kapsam özeti kaynak kayıtlarla uyuşmuyor.`,
        );
      }
    }
  }
  for (const plan of payload.plans) {
    if (plan.planType !== "weekly" || !Array.isArray(plan.weeklyEvaluations)) {
      continue;
    }
    const planScope = planScopes.get(plan.id) ?? null;
    const teacherWeeklyPlan =
      isTeacherOwnedPlanRecord(plan) && plan.planType === "weekly" ? plan : null;
    for (const [evaluationIndex, evaluation] of plan.weeklyEvaluations.entries()) {
      if (!isRecord(evaluation) || !Array.isArray(evaluation.observationIds)) {
        throw new Error(
          `plans/${plan.id} haftalık değerlendirme sözleşmesi geçersiz.`,
        );
      }
      const evaluationCreatedAt = isValidUtcIso(evaluation.createdAt)
        ? evaluation.createdAt
        : null;
      if (teacherWeeklyPlan) {
        if (!isTeacherWeeklyEvaluation(evaluation)) {
          throw new Error(
            `plans/${plan.id} öğretmen haftalık değerlendirmesi geçersiz.`,
          );
        }
        const monthly = plansById.get(teacherWeeklyPlan.monthlyPlanId);
        const sourceIndex =
          monthly && isTeacherOwnedPlanRecord(monthly) && monthly.planType === "monthly"
            ? monthly.weeklySectionIds.indexOf(teacherWeeklyPlan.id)
            : -1;
        const expectedTargetId =
          monthly && isTeacherOwnedPlanRecord(monthly) && monthly.planType === "monthly"
            ? monthly.weeklySectionIds[sourceIndex + 1] ?? null
            : null;
        const target =
          typeof evaluation.nextPlanTargetPlanId === "string"
            ? plansById.get(evaluation.nextPlanTargetPlanId)
            : undefined;
        const targetScope = target ? planScopes.get(target.id) ?? null : null;
        if (
          sourceIndex < 0 ||
          evaluation.sourcePlanRevisionNumber > teacherWeeklyPlan.revisionNumber ||
          evaluation.nextPlanTargetPlanId !== expectedTargetId ||
          (expectedTargetId === null
            ? evaluation.targetPlanRevisionNumberAtSuggestion !== null
            : !target ||
              !isTeacherOwnedPlanRecord(target) ||
              target.planType !== "weekly" ||
              target.monthlyPlanId !== teacherWeeklyPlan.monthlyPlanId ||
              !targetScope ||
              !planScope ||
              !scopesMatch(planScope, targetScope) ||
              evaluation.targetPlanRevisionNumberAtSuggestion === null ||
              evaluation.targetPlanRevisionNumberAtSuggestion > target.revisionNumber)
        ) {
          throw new Error(
            `plans/${plan.id} öğretmen haftalık karar hedefi veya revizyon izi geçersiz.`,
          );
        }
        const isLatestEvaluation =
          evaluationIndex === plan.weeklyEvaluations.length - 1;
        if (isLatestEvaluation && expectedTargetId !== null) {
          const context =
            target && isTeacherOwnedPlanRecord(target) && target.planType === "weekly"
              ? target.nextPlanDecisionContext
              : undefined;
          if (
            !target ||
            !isTeacherOwnedPlanRecord(target) ||
            target.planType !== "weekly" ||
            target.previousWeekEvaluationId !== evaluation.id ||
            !context ||
            target.teacherReviewRequired !==
              (context.applicationStatus === "pending-teacher-review") ||
            context.sourceWeeklyPlanId !== teacherWeeklyPlan.id ||
            context.evaluationId !== evaluation.id ||
            context.decision !== evaluation.nextPlanDecision ||
            context.evidenceSummary !== evaluation.evidenceSummary ||
            context.teacherReflection !== evaluation.reflection ||
            context.sourcePlanRevisionNumber !==
              evaluation.sourcePlanRevisionNumber ||
            context.targetPlanRevisionNumberAtSuggestion !==
              evaluation.targetPlanRevisionNumberAtSuggestion ||
            context.createdAt !== evaluation.createdAt ||
            !["pending-teacher-review", "accepted", "rejected"].includes(
              context.applicationStatus,
            )
          ) {
            throw new Error(
              `plans/${plan.id} öğretmen haftalık öneri taşıma zinciri geçersiz.`,
            );
          }
        }
        const selectedObservationIds = new Set(evaluation.observationIds);
        const observationsWithSelectedLink = new Set<string>();
        for (const linkId of evaluation.curriculumLinkIds ?? []) {
          const link = curriculumLinksById.get(linkId);
          const linkScope = link
            ? validatedRecordScope(
                link,
                "evidenceCurriculumLinks",
                classroomsById,
              )
            : null;
          if (
            !link ||
            !evaluationCreatedAt ||
            typeof link.observationId !== "string" ||
            !selectedObservationIds.has(link.observationId) ||
            link.confirmationMethod !== "teacher-confirmed" ||
            !planScope ||
            !linkScope ||
            !scopesMatch(planScope, linkScope) ||
            !recordWasVisibleAt(link, evaluationCreatedAt) ||
            !isValidUtcIso(link.confirmedAt) ||
            Date.parse(link.confirmedAt) > Date.parse(evaluationCreatedAt)
          ) {
            throw new Error(
              `plans/${plan.id} öğretmen haftalık değerlendirme program bağı geçersiz.`,
            );
          }
          observationsWithSelectedLink.add(link.observationId);
        }
        if (
          evaluation.observationIds.some(
            (observationId) => !observationsWithSelectedLink.has(observationId),
          )
        ) {
          throw new Error(
            `plans/${plan.id} öğretmen haftalık değerlendirmesinde program bağı olmayan seçili gözlem var.`,
          );
        }
        const weeklyDailyPlans = payload.plans
          .filter(
            (candidate) =>
              candidate.planType === "daily" &&
              candidate.sourceAnnualPlanId === teacherWeeklyPlan.annualPlanId &&
              candidate.sourceMonthlyPlanId === teacherWeeklyPlan.monthlyPlanId &&
              candidate.sourceWeeklyPlanId === teacherWeeklyPlan.id &&
              candidate.civilDate >= teacherWeeklyPlan.periodStart &&
              candidate.civilDate <= teacherWeeklyPlan.periodEnd &&
              evaluationCreatedAt !== null &&
              recordWasVisibleAt(candidate, evaluationCreatedAt),
          )
          .sort(
            (left, right) =>
              String(left.civilDate).localeCompare(String(right.civilDate)) ||
              left.id.localeCompare(right.id),
          );
        if (weeklyDailyPlans.length === 0) {
          throw new Error(
            `plans/${plan.id} öğretmen haftalık değerlendirmesine bağlı günlük plan yok.`,
          );
        }
        const dailyPlanCountByCivilDate = new Map<string, number>();
        for (const daily of weeklyDailyPlans) {
          const civilDate = String(daily.civilDate);
          dailyPlanCountByCivilDate.set(
            civilDate,
            (dailyPlanCountByCivilDate.get(civilDate) ?? 0) + 1,
          );
        }
        if (
          [...dailyPlanCountByCivilDate.values()].some((count) => count !== 1)
        ) {
          throw new Error(
            `plans/${plan.id} öğretmen haftalık değerlendirmesinde günlük plan çakışması var.`,
          );
        }
        for (const daily of weeklyDailyPlans) {
          const civilDate = String(daily.civilDate);
          const closure = dayClosuresForEvaluation
            .filter(
              (candidate) =>
                candidate.academicYearId === teacherWeeklyPlan.academicYearId &&
                candidate.classroomId === teacherWeeklyPlan.classroomId &&
                candidate.civilDate === civilDate &&
                evaluationCreatedAt !== null &&
                candidate.closedAt <= evaluationCreatedAt,
            )
            .sort(
              (left, right) =>
                right.closedAt.localeCompare(left.closedAt) ||
                right.id.localeCompare(left.id),
            )[0];
          if (!closure || closure.closureStatus !== "complete") {
            throw new Error(
              `plans/${plan.id} öğretmen haftalık değerlendirmesinin ${civilDate} gün kapanışı eksik veya tamamlanmamış.`,
            );
          }
          if (
            closure.evidenceFingerprint !==
            teacherDayClosureSemanticFingerprint(
              snapshotVisibleAt(payload, closure.closedAt),
              {
                academicYearId: teacherWeeklyPlan.academicYearId,
                classroomId: teacherWeeklyPlan.classroomId,
                civilDate,
              },
            )
          ) {
            throw new Error(
              `plans/${plan.id} öğretmen haftalık değerlendirmesinin ${civilDate} gün kapanışı kaynak kanıtla uyuşmuyor.`,
            );
          }
        }
      }
      for (const observationId of evaluation.observationIds) {
        const observation =
          typeof observationId === "string"
            ? observationsById.get(observationId)
            : undefined;
        const observationScope = observation
          ? observationScopes.get(observation.id) ?? null
          : null;
        const observationPlan =
          observation && typeof observation.planId === "string"
            ? plansById.get(observation.planId)
            : undefined;
        const observationActivity =
          observation && typeof observation.activityId === "string"
            ? activitiesById.get(observation.activityId)
            : undefined;
        const activityScope = observationActivity
          ? activityScopes.get(observationActivity.id) ?? null
          : null;
        if (
          !observation ||
          !evaluationCreatedAt ||
          observation.rawTextImmutable !== true ||
          !recordWasVisibleAt(observation, evaluationCreatedAt) ||
          !isValidUtcIso(observation.observedAt) ||
          Date.parse(observation.observedAt) > Date.parse(evaluationCreatedAt) ||
          !observationPlan ||
          observationPlan.planType !== "daily" ||
          observationPlan.sourceWeeklyPlanId !== plan.id ||
          (teacherWeeklyPlan &&
            (!observationActivity ||
              observationActivity.planId !== observationPlan.id ||
              observationActivity.sourceAnnualPlanId !==
                observationPlan.sourceAnnualPlanId ||
              observationActivity.sourceMonthlyPlanId !==
                observationPlan.sourceMonthlyPlanId ||
              observationActivity.sourceWeeklyPlanId !==
                observationPlan.sourceWeeklyPlanId ||
              !activityScope ||
              !planScope ||
              !scopesMatch(planScope, activityScope))) ||
          !planScope ||
          !observationScope ||
          !scopesMatch(planScope, observationScope)
        ) {
          throw new Error(
            `plans/${plan.id} haftalık değerlendirmesi bilinmeyen veya kapsam dışı gözleme bağlı.`,
          );
        }
        parseTeacherWeeklyValuesNarrative(
          observation.rawText,
          `plans/${plan.id} haftalık değerlendirmesine bağlı ham gözlem`,
        );
      }
    }
  }
  for (const revision of payload.observationRevisions) {
    const observation = observationsById.get(
      revision.observationId as string,
    );
    if (!observation) {
      throw new Error(
        `observationRevisions/${revision.id} bilinmeyen gözleme bağlı.`,
      );
    }
    const observationScope = observationScopes.get(observation.id) ?? null;
    const hasRevisionScope =
      typeof revision.classroomId === "string" ||
      typeof revision.academicYearId === "string";
    if (hasRevisionScope) {
      const revisionScope = validatedRecordScope(
        revision,
        "observationRevisions",
        classroomsById,
      );
      if (
        !revisionScope ||
        !observationScope ||
        !scopesMatch(revisionScope, observationScope)
      ) {
        throw new Error(
          `observationRevisions/${revision.id} gözlem kapsamıyla uyuşmuyor.`,
        );
      }
    }
  }

  const mediaById = new Map(
    payload.mediaAssets.map((media) => [media.id, media]),
  );
  for (const media of payload.mediaAssets) {
    const mediaStudentIds = media.studentIds as string[];
    if (mediaStudentIds.some((studentId) => !studentIds.has(studentId))) {
      throw new Error(`mediaAssets/${media.id} bilinmeyen öğrenciye bağlı.`);
    }
    if (
      typeof media.activityId === "string" &&
      !activitiesById.has(media.activityId)
    ) {
      throw new Error(`mediaAssets/${media.id} bilinmeyen etkinliğe bağlı.`);
    }
    const hasMediaScope =
      typeof media.classroomId === "string" ||
      typeof media.academicYearId === "string";
    if (hasMediaScope) {
      const mediaScope = validatedRecordScope(
        media,
        "mediaAssets",
        classroomsById,
      );
      if (
        !mediaScope ||
        mediaStudentIds.some(
          (studentId) =>
            !(studentScopes.get(studentId) ?? []).some((scope) =>
              scopesMatch(scope, mediaScope),
            ),
        )
      ) {
        throw new Error(
          `mediaAssets/${media.id} öğrenci sınıf kapsamıyla uyuşmuyor.`,
        );
      }
    }
  }

  const maarifReferenceIds = new Set(
    payload.maarifReferences.map((reference) => reference.id),
  );
  for (const reference of payload.maarifReferences) {
    if (
      typeof reference.parentId === "string" &&
      (reference.parentId === reference.id ||
        !maarifReferenceIds.has(reference.parentId))
    ) {
      throw new Error(
        `maarifReferences/${reference.id} üst referans ilişkisi geçersiz.`,
      );
    }
  }

  for (const selection of payload.portfolioSelections) {
    if (!studentIds.has(selection.studentId as string)) {
      throw new Error(
        `portfolioSelections/${selection.id} bilinmeyen öğrenciye bağlı.`,
      );
    }
    const itemId = selection.itemId as string;
    const knownItem =
      (selection.itemType === "observation" &&
        observationsById.has(itemId)) ||
      (selection.itemType === "media" && mediaById.has(itemId)) ||
      (selection.itemType === "activity" && activitiesById.has(itemId)) ||
      (selection.itemType === "plan" && plansById.has(itemId));
    if (!knownItem) {
      throw new Error(
        `portfolioSelections/${selection.id} portfolyo öğesi bulunamadı.`,
      );
    }
    const selectionScope = validatedRecordScope(
      selection,
      "portfolioSelections",
      classroomsById,
    );
    const allowedStudentScopes = studentScopes.get(
      selection.studentId as string,
    ) ?? [];
    const itemScope =
      selection.itemType === "observation"
        ? observationScopes.get(itemId) ?? null
        : selection.itemType === "activity"
          ? activityScopes.get(itemId) ?? null
          : selection.itemType === "plan"
            ? planScopes.get(itemId) ?? null
            : selection.itemType === "media"
              ? validatedRecordScope(
                  mediaById.get(itemId) as StoredRecord,
                  "mediaAssets",
                  classroomsById,
                )
              : null;
    if (
      !selectionScope ||
      !allowedStudentScopes.some((studentScope) =>
        scopesMatch(selectionScope, studentScope),
      ) ||
      !itemScope ||
      !scopesMatch(selectionScope, itemScope)
    ) {
      throw new Error(
        `portfolioSelections/${selection.id} sınıf veya eğitim yılı kapsamıyla uyuşmuyor.`,
      );
    }
  }

  for (const observation of payload.observations) {
    if (observation.rawTextImmutable !== true && observation.schemaVersion < 2) {
      continue;
    }
    const studentIds = Array.isArray(observation.studentIds)
      ? observation.studentIds.filter((id): id is string => typeof id === "string")
      : [];
    const activity =
      typeof observation.activityId === "string"
        ? activitiesById.get(observation.activityId)
        : undefined;
    const plan =
      typeof observation.planId === "string"
        ? plansById.get(observation.planId)
        : undefined;
    const observationScope = observationScopes.get(observation.id) ?? null;
    const activityScope = activity
      ? activityScopes.get(activity.id) ?? null
      : null;
    const planScope = plan ? planScopes.get(plan.id) ?? null : null;
    if (
      studentIds.length !== 1 ||
      typeof observation.rawText !== "string" ||
      observation.rawText.trim().length === 0 ||
      typeof observation.observedAt !== "string" ||
      !UTC_ISO_PATTERN.test(observation.observedAt) ||
      !activity ||
      !plan ||
      activity.planId !== plan.id ||
      !observationScope ||
      !activityScope ||
      !planScope ||
      !scopesMatch(observationScope, activityScope) ||
      !scopesMatch(observationScope, planScope)
    ) {
      throw new Error(`observations/${observation.id} ham kanıt zinciri geçersiz.`);
    }
    const observationCategories = observation.observationCategories;
    const batchMetadataValid =
      (observation.batchId === undefined &&
        observation.captureScope === undefined) ||
      (typeof observation.batchId === "string" &&
        UUID_PATTERN.test(observation.batchId) &&
        observation.captureScope === "selected-children");
    if (
      (observation.context !== undefined &&
        typeof observation.context !== "string") ||
      (observation.childQuote !== undefined &&
        typeof observation.childQuote !== "string") ||
      (observation.observationType !== undefined &&
        !isQuickObservationType(observation.observationType)) ||
      (observationCategories !== undefined &&
        (!Array.isArray(observationCategories) ||
          !observationCategories.every(isQuickObservationCategory) ||
          new Set(observationCategories).size !== observationCategories.length)) ||
      !batchMetadataValid
    ) {
      throw new Error(
        `observations/${observation.id} hızlı gözlem alanları geçersiz.`,
      );
    }
  }

  const linksByObservation = new Map<string, StoredRecord[]>();
  for (const link of payload.evidenceCurriculumLinks) {
    const linkScope = validatedRecordScope(
      link,
      "evidenceCurriculumLinks",
      classroomsById,
    );
    const observation =
      typeof link.observationId === "string"
        ? payload.observations.find((record) => record.id === link.observationId)
        : undefined;
    const observationScope = observation
      ? observationScopes.get(observation.id) ?? null
      : null;
    const expectedLabel =
      link.framework === "tymm"
        ? CURRICULUM_PROGRAM_LABELS.tymm
        : link.framework === "meb_2024"
          ? CURRICULUM_PROGRAM_LABELS.meb_2024
          : null;
    const plan =
      observation && typeof observation.planId === "string"
        ? plansById.get(observation.planId)
        : undefined;
    const profile = plan && isRecord(plan.curriculumProfileSnapshot)
      ? plan.curriculumProfileSnapshot
      : null;
    const linkProvenance = validatedCurriculumProvenance(
      link,
      `evidenceCurriculumLinks/${link.id}`,
    );
    const profileProvenance = profile
      ? validatedCurriculumProvenance(profile, `plans/${plan?.id ?? "bilinmeyen"}`)
      : null;
    if (
      !observation ||
      !linkScope ||
      !observationScope ||
      !scopesMatch(linkScope, observationScope) ||
      !expectedLabel ||
      link.programLabel !== expectedLabel ||
      typeof link.catalogId !== "string" ||
      link.catalogId.trim().length === 0 ||
      typeof link.sourceVersion !== "string" ||
      link.sourceVersion.trim().length === 0 ||
      typeof link.referenceCode !== "string" ||
      link.referenceCode.trim().length === 0 ||
      typeof link.referenceTitle !== "string" ||
      link.referenceTitle.trim().length === 0 ||
      link.confirmationMethod !== "teacher-confirmed" ||
      typeof link.approvedByUserId !== "string" ||
      link.approvedByUserId.trim().length === 0 ||
      !isValidUtcIso(link.confirmedAt) ||
      (link.targetSourceUrl !== undefined &&
        !isSafeHttpsUrl(link.targetSourceUrl) &&
        !(
          link.targetSourceUrl === "about:blank" &&
          linkProvenance.referenceOrigin === "teacher-declared" &&
          linkProvenance.officialCatalogVerified === false
        )) ||
      !profile ||
      profile.framework !== link.framework ||
      profile.catalogId !== link.catalogId ||
      profile.sourceVersion !== link.sourceVersion ||
      !profileProvenance ||
      (linkProvenance.referenceOrigin === "official-catalog" &&
        (profileProvenance.referenceOrigin !== "official-catalog" ||
          profileProvenance.officialCatalogVerified !== true))
    ) {
      throw new Error(
        `evidenceCurriculumLinks/${link.id} öğretmen onaylı program bağı geçersiz.`,
      );
    }
    const group = linksByObservation.get(observation.id) ?? [];
    group.push(link);
    linksByObservation.set(observation.id, group);
  }

  const valueEvidenceLinksById = new Map(
    payload.valueEvidenceLinks.map((link) => [link.id, link]),
  );
  const activeValueEvidenceTargetKeys = new Set<string>();
  const localTeacherIdentity = payload.settings.find(
    (setting) =>
      setting.id === LOCAL_TEACHER_IDENTITY_SETTING_ID &&
      setting.settingType === LOCAL_TEACHER_IDENTITY_SETTING_TYPE &&
      typeof setting.deletedAt !== "string",
  );
  for (const link of payload.valueEvidenceLinks) {
    const linkScope = validatedRecordScope(
      link,
      "valueEvidenceLinks",
      classroomsById,
    );
    const observation = typeof link.observationId === "string"
      ? observationsById.get(link.observationId)
      : undefined;
    const activity = typeof link.activityId === "string"
      ? activitiesById.get(link.activityId)
      : undefined;
    const plan = typeof link.planId === "string"
      ? plansById.get(link.planId)
      : undefined;
    const student = typeof link.studentId === "string"
      ? studentsById.get(link.studentId)
      : undefined;
    const observationScope = observation
      ? observationScopes.get(observation.id) ?? null
      : null;
    const activityScope = activity
      ? activityScopes.get(activity.id) ?? null
      : null;
    const planScope = plan ? planScopes.get(plan.id) ?? null : null;
    const allowedStudentScopes = student
      ? studentScopes.get(student.id) ?? []
      : [];
    const sourceContentPack = activity && isRecord(activity.sourceContentPackSnapshot)
      ? activity.sourceContentPackSnapshot
      : null;
    const planSourceContentPack = plan && isRecord(plan.sourceContentPackSnapshot)
      ? plan.sourceContentPackSnapshot
      : null;
    const appliedTemplate = activity && isRecord(activity.appliedActivityTemplateSnapshot)
      ? activity.appliedActivityTemplateSnapshot
      : null;
    const planAppliedTemplate = plan && isRecord(plan.appliedActivityTemplateSnapshot)
      ? plan.appliedActivityTemplateSnapshot
      : null;
    const provenance = isRecord(link.provenance) ? link.provenance : null;
    const studentIds = observation && Array.isArray(observation.studentIds)
      ? observation.studentIds
      : [];
    const isTombstoned = typeof link.deletedAt === "string";
    const annualSourcePlan = plan && typeof plan.sourceAnnualPlanId === "string"
      ? plansById.get(plan.sourceAnnualPlanId)
      : undefined;
    const monthlySourcePlan = plan && typeof plan.sourceMonthlyPlanId === "string"
      ? plansById.get(plan.sourceMonthlyPlanId)
      : undefined;
    const weeklySourcePlan = plan && typeof plan.sourceWeeklyPlanId === "string"
      ? plansById.get(plan.sourceWeeklyPlanId)
      : undefined;
    const annualSourceScope = annualSourcePlan
      ? planScopes.get(annualSourcePlan.id) ?? null
      : null;
    const monthlySourceScope = monthlySourcePlan
      ? planScopes.get(monthlySourcePlan.id) ?? null
      : null;
    const weeklySourceScope = weeklySourcePlan
      ? planScopes.get(weeklySourcePlan.id) ?? null
      : null;
    const canonicalActivityContent = sourceContentPack
      ? parsePremiumValuesContentPackSnapshot(
          sourceContentPack,
          `valueEvidenceLinks/${link.id} etkinlik içerik snapshot'ı`,
        )
      : null;
    const canonicalPlanContent = planSourceContentPack
      ? parsePremiumValuesContentPackSnapshot(
          planSourceContentPack,
          `valueEvidenceLinks/${link.id} günlük plan içerik snapshot'ı`,
        )
      : null;
    const canonicalAnnualContent = annualSourcePlan &&
        isRecord(annualSourcePlan.contentPackSnapshot)
      ? parsePremiumValuesContentPackSnapshot(
          annualSourcePlan.contentPackSnapshot,
          `valueEvidenceLinks/${link.id} yıllık plan içerik snapshot'ı`,
        )
      : null;
    const canonicalMonthlyContent = monthlySourcePlan &&
        isRecord(monthlySourcePlan.contentPackSnapshot)
      ? parsePremiumValuesContentPackSnapshot(
          monthlySourcePlan.contentPackSnapshot,
          `valueEvidenceLinks/${link.id} aylık plan içerik snapshot'ı`,
        )
      : null;
    const canonicalWeeklyContent = weeklySourcePlan &&
        isRecord(weeklySourcePlan.contentPackSnapshot)
      ? parsePremiumValuesContentPackSnapshot(
          weeklySourcePlan.contentPackSnapshot,
          `valueEvidenceLinks/${link.id} haftalık plan içerik snapshot'ı`,
        )
      : null;
    const monthlyStoredAppliedTemplate = monthlySourcePlan &&
        Array.isArray(monthlySourcePlan.premiumActivityTemplates)
      ? monthlySourcePlan.premiumActivityTemplates.find(
          (candidate) =>
            isRecord(candidate) &&
            candidate.id === activity?.appliedActivityTemplateId,
        )
      : undefined;
    const weeklyStoredAppliedTemplate = weeklySourcePlan &&
        Array.isArray(weeklySourcePlan.premiumActivityTemplates)
      ? weeklySourcePlan.premiumActivityTemplates.find(
          (candidate) =>
            isRecord(candidate) &&
            candidate.id === activity?.appliedActivityTemplateId,
        )
      : undefined;

    let parsedValuesDesign: ReturnType<
      typeof parsePremiumActivityValueDesignSnapshot
    > | null = null;
    if (
      appliedTemplate &&
      typeof activity?.appliedActivityTemplateId === "string" &&
      appliedTemplate.id === activity.appliedActivityTemplateId
    ) {
      if (sourceContentPack) {
        assertPremiumActivityValuesSnapshot(
          sourceContentPack,
          appliedTemplate,
          `valueEvidenceLinks/${link.id} appliedActivityTemplateSnapshot`,
        );
      }
      parsedValuesDesign = parsePremiumActivityValueDesignSnapshot(
        appliedTemplate.valuesDesign,
        activity.appliedActivityTemplateId,
      );
    }
    const mappedValueCodes: Set<string> = parsedValuesDesign
      ? new Set<string>([
          parsedValuesDesign.mapping.primaryValueCode,
          parsedValuesDesign.mapping.roofValueCode,
          ...parsedValuesDesign.mapping.supportingValueCodes,
        ])
      : new Set<string>();
    const targetOfficialAction = parsedValuesDesign?.mapping.officialActionSnapshots.find(
      (snapshot) =>
        snapshot.valueCode === link.targetValueCode &&
        snapshot.indicatorCode === link.targetIndicatorCode,
    );
    const normalizedRationale = typeof link.teacherRationale === "string"
      ? link.teacherRationale.trim().normalize("NFC")
      : "";
    const normalizedRawObservation = typeof observation?.rawText === "string"
      ? observation.rawText.trim().normalize("NFC")
      : "";

    if (
      !linkScope ||
      !observation ||
      observation.rawTextImmutable !== true ||
      studentIds.length !== 1 ||
      studentIds[0] !== link.studentId ||
      observation.planId !== link.planId ||
      observation.activityId !== link.activityId ||
      !activity ||
      activity.planId !== plan?.id ||
      !plan ||
      plan.planType !== "daily" ||
      !student ||
      !observationScope ||
      !activityScope ||
      !planScope ||
      !scopesMatch(linkScope, observationScope) ||
      !scopesMatch(linkScope, activityScope) ||
      !scopesMatch(linkScope, planScope) ||
      !allowedStudentScopes.some((scope) => scopesMatch(linkScope, scope)) ||
      (!isTombstoned &&
        (typeof observation.deletedAt === "string" ||
          typeof activity.deletedAt === "string" ||
          typeof plan.deletedAt === "string" ||
          typeof student.deletedAt === "string")) ||
      !sourceContentPack ||
      !planSourceContentPack ||
      !appliedTemplate ||
      !planAppliedTemplate ||
      !parsedValuesDesign ||
      !provenance ||
      !canonicalActivityContent ||
      !canonicalPlanContent ||
      !canonicalAnnualContent ||
      !canonicalMonthlyContent ||
      !canonicalWeeklyContent ||
      !sameCanonicalSnapshot(canonicalActivityContent, canonicalPlanContent) ||
      !sameCanonicalSnapshot(canonicalActivityContent, canonicalAnnualContent) ||
      !sameCanonicalSnapshot(canonicalActivityContent, canonicalMonthlyContent) ||
      !sameCanonicalSnapshot(canonicalActivityContent, canonicalWeeklyContent) ||
      activity.appliedActivityTemplateId !== plan.appliedActivityTemplateId ||
      !sameCanonicalSnapshot(appliedTemplate, planAppliedTemplate) ||
      typeof plan.sourceAnnualPlanId !== "string" ||
      typeof plan.sourceMonthlyPlanId !== "string" ||
      typeof plan.sourceWeeklyPlanId !== "string" ||
      activity.sourceAnnualPlanId !== plan.sourceAnnualPlanId ||
      activity.sourceMonthlyPlanId !== plan.sourceMonthlyPlanId ||
      activity.sourceWeeklyPlanId !== plan.sourceWeeklyPlanId ||
      !annualSourcePlan ||
      annualSourcePlan.planType !== "annual" ||
      !monthlySourcePlan ||
      monthlySourcePlan.planType !== "monthly" ||
      monthlySourcePlan.annualPlanId !== annualSourcePlan.id ||
      !weeklySourcePlan ||
      weeklySourcePlan.planType !== "weekly" ||
      weeklySourcePlan.annualPlanId !== annualSourcePlan.id ||
      weeklySourcePlan.monthlyPlanId !== monthlySourcePlan.id ||
      !annualSourceScope ||
      !monthlySourceScope ||
      !weeklySourceScope ||
      !scopesMatch(linkScope, annualSourceScope) ||
      !scopesMatch(linkScope, monthlySourceScope) ||
      !scopesMatch(linkScope, weeklySourceScope) ||
      !monthlyStoredAppliedTemplate ||
      !weeklyStoredAppliedTemplate ||
      !sameCanonicalSnapshot(monthlyStoredAppliedTemplate, appliedTemplate) ||
      !sameCanonicalSnapshot(weeklyStoredAppliedTemplate, appliedTemplate) ||
      sourceContentPack.id !== provenance.contentPackId ||
      sourceContentPack.version !== provenance.contentPackVersion ||
      sourceContentPack.contentReleaseId !== provenance.contentReleaseId ||
      sourceContentPack.manifestDigest !== provenance.contentManifestDigest ||
      activity.appliedActivityTemplateId !==
        provenance.appliedActivityTemplateId ||
      parsedValuesDesign.id !== provenance.appliedValuesDesignId ||
      parsedValuesDesign.version !== provenance.appliedValuesDesignVersion ||
      !mappedValueCodes.has(String(link.targetValueCode)) ||
      !targetOfficialAction ||
      !localTeacherIdentity ||
      localTeacherIdentity.teacherUserId !== link.confirmedByActorId ||
      String(link.confirmedAt) < localTeacherIdentity.createdAt ||
      link.civilDate !== istanbulCivilDate(String(link.confirmedAt)) ||
      String(link.confirmedAt) < observation.createdAt ||
      normalizedRationale === normalizedRawObservation
    ) {
      throw new Error(
        `valueEvidenceLinks/${link.id} değer kanıtı ilişki, kapsam veya authoritative provenance zinciri geçersiz.`,
      );
    }

    assertValueEvidenceSourceObservationPolicy(
      observation.rawText,
      link.evidenceRole as "supports" | "contrasts" | "context_only",
      String(link.teacherRationale),
    );

    if (!isTombstoned) {
      const targetKey = valueEvidenceTargetKey(link);
      if (activeValueEvidenceTargetKeys.has(targetKey)) {
        throw new Error(
          `valueEvidenceLinks/${link.id} aynı gözlem ve değer eylemi için ikinci aktif bağ oluşturuyor.`,
        );
      }
      activeValueEvidenceTargetKeys.add(targetKey);
    }
  }

  const claimedValueEvidencePredecessorIds = new Set<string>();
  const valueEvidencePredecessorByLinkId = new Map<string, string>();
  for (const link of payload.valueEvidenceLinks) {
    const predecessorId = typeof link.supersedesLinkId === "string"
      ? link.supersedesLinkId
      : null;
    if (predecessorId === null) continue;
    if (claimedValueEvidencePredecessorIds.has(predecessorId)) {
      throw new Error(
        `valueEvidenceLinks/${link.id} supersedes zinciri aynı predecessor üzerinde dallanıyor.`,
      );
    }
    claimedValueEvidencePredecessorIds.add(predecessorId);
    valueEvidencePredecessorByLinkId.set(link.id, predecessorId);
    const predecessor = valueEvidenceLinksById.get(predecessorId);
    if (
      !predecessor ||
      typeof predecessor.deletedAt !== "string" ||
      predecessor.deletedAt !== link.confirmedAt ||
      valueEvidenceTargetKey(predecessor) !== valueEvidenceTargetKey(link) ||
      predecessor.studentId !== link.studentId ||
      predecessor.planId !== link.planId ||
      !sameCanonicalSnapshot(predecessor.provenance, link.provenance) ||
      (predecessor.evidenceRole === link.evidenceRole &&
        predecessor.teacherRationale === link.teacherRationale)
    ) {
      throw new Error(
        `valueEvidenceLinks/${link.id} supersedes predecessor ilişkisi geçersiz.`,
      );
    }
  }
  const fullyVisitedValueEvidenceLinks = new Set<string>();
  for (const link of payload.valueEvidenceLinks) {
    if (fullyVisitedValueEvidenceLinks.has(link.id)) continue;
    const currentPath = new Set<string>();
    let currentId: string | undefined = link.id;
    while (currentId && !fullyVisitedValueEvidenceLinks.has(currentId)) {
      if (currentPath.has(currentId)) {
        throw new Error(
          `valueEvidenceLinks/${link.id} supersedes zinciri döngü içeriyor.`,
        );
      }
      currentPath.add(currentId);
      currentId = valueEvidencePredecessorByLinkId.get(currentId);
    }
    for (const visitedId of currentPath) {
      fullyVisitedValueEvidenceLinks.add(visitedId);
    }
  }

  for (const draft of payload.reportDrafts) {
    if (draft.reportType === ANECDOTE_FORM_REPORT_TYPE) {
      const draftScope = validatedRecordScope(
        draft,
        "reportDrafts",
        classroomsById,
      );
      const observationId = Array.isArray(draft.selectedObservationIds)
        ? draft.selectedObservationIds[0]
        : undefined;
      const observation =
        typeof observationId === "string"
          ? observationsById.get(observationId)
          : undefined;
      const observationScope = observation
        ? observationScopes.get(observation.id) ?? null
        : null;
      const observationStudentIds =
        observation && Array.isArray(observation.studentIds)
          ? observation.studentIds
          : [];
      const sections = isRecord(draft.editableSections)
        ? draft.editableSections
        : null;
      const approvedLinkIds =
        sections && Array.isArray(sections.approvedCurriculumLinkIds)
          ? sections.approvedCurriculumLinkIds
          : [];
      const approvedProgramSources =
        sections && Array.isArray(sections.approvedProgramSources)
          ? sections.approvedProgramSources
          : [];
      const activeLinks = observation
        ? (linksByObservation.get(observation.id) ?? []).filter(
            (link) =>
              typeof link.deletedAt !== "string" &&
              link.confirmationMethod === "teacher-confirmed",
          )
        : [];
      const activeLinkIds = activeLinks.map((link) => link.id);
      const activeProgramSourceKeys = new Set(
        activeLinks.map(
          (link) =>
            `${String(link.framework)}\u0000${String(link.catalogId)}\u0000${String(link.sourceVersion)}`,
        ),
      );
      const approvedProgramSourceKeys = new Set(
        approvedProgramSources
          .filter((source) => isRecord(source))
          .map(
            (source) =>
              `${String(source.framework)}\u0000${String(source.catalogId)}\u0000${String(source.sourceVersion)}`,
          ),
      );
      const generalEvaluationSource =
        sections && typeof sections.generalEvaluationSourceDraftId === "string"
          ? payload.reportDrafts.find(
              (candidate) =>
                candidate.id === sections.generalEvaluationSourceDraftId,
            )
          : null;
      const generalEvaluationSourceValid =
        !sections || sections.generalEvaluationSourceDraftId === null ||
        (generalEvaluationSource?.reportType === "evidence-assessment" &&
          Array.isArray(generalEvaluationSource.observationIds) &&
          generalEvaluationSource.observationIds.includes(observationId) &&
          Array.isArray(generalEvaluationSource.studentIds) &&
          generalEvaluationSource.studentIds.length === 1 &&
          generalEvaluationSource.studentIds[0] ===
            (Array.isArray(draft.studentIds) ? draft.studentIds[0] : undefined) &&
          typeof generalEvaluationSource.teacherAssessmentText === "string" &&
          generalEvaluationSource.teacherAssessmentText.trim() ===
            String(sections.observerGeneralAssessment).trim());
      const allLinksOfficial =
        activeLinks.length > 0 &&
        activeLinks.every(
          (link) =>
            link.referenceOrigin === "official-catalog" &&
            link.officialCatalogVerified === true,
        );
      const expectedReferenceStatus = allLinksOfficial
        ? "official-catalog-verified"
        : "teacher-declared-unverified";
      const pendingReviewValid =
        draft.status === "draft" &&
        draft.reviewStatus === "pending" &&
        draft.reviewedByUserId === null &&
        draft.reviewedAt === null &&
        (draft.approvalSeal === undefined || draft.approvalSeal === null) &&
        approvedLinkIds.length === 0 &&
        approvedProgramSources.length === 0;
      const approvedReviewValid =
        draft.schemaVersion === ANECDOTE_FORM_SCHEMA_VERSION &&
        draft.status === "ready" &&
        draft.reviewStatus === "approved" &&
        typeof draft.reviewedByUserId === "string" &&
        localTeacherIdentity?.teacherUserId === draft.reviewedByUserId &&
        isValidUtcIso(draft.reviewedAt) &&
        String(draft.reviewedAt) >= draft.updatedAt &&
        typeof sections?.observedLocation === "string" &&
        sections.observedLocation.trim().length > 0 &&
        typeof sections.observerGeneralAssessment === "string" &&
        sections.observerGeneralAssessment.trim().length > 0 &&
        activeLinkIds.length > 0 &&
        approvedLinkIds.length === activeLinkIds.length &&
        new Set(approvedLinkIds).size === approvedLinkIds.length &&
        approvedLinkIds.every((id) => activeLinkIds.includes(id as string)) &&
        approvedProgramSourceKeys.size === activeProgramSourceKeys.size &&
        [...approvedProgramSourceKeys].every((key) =>
          activeProgramSourceKeys.has(key),
        ) &&
        Boolean(
          observation &&
            approvalSealMatchesCurrentSources(
              draft.approvalSeal,
              observation,
              activeLinks,
            ),
        ) &&
        draft.referenceVerificationStatus === expectedReferenceStatus;
      const legacyApprovalRequiresReapproval =
        draft.schemaVersion === ANECDOTE_FORM_LEGACY_SCHEMA_VERSION &&
        draft.approvalSeal === undefined &&
        draft.status === "ready" &&
        draft.reviewStatus === "approved" &&
        typeof draft.reviewedByUserId === "string" &&
        localTeacherIdentity?.teacherUserId === draft.reviewedByUserId &&
        isValidUtcIso(draft.reviewedAt) &&
        String(draft.reviewedAt) >= draft.updatedAt &&
        typeof sections?.observedLocation === "string" &&
        sections.observedLocation.trim().length > 0 &&
        typeof sections.observerGeneralAssessment === "string" &&
        sections.observerGeneralAssessment.trim().length > 0 &&
        activeLinkIds.length > 0 &&
        approvedLinkIds.length === activeLinkIds.length &&
        new Set(approvedLinkIds).size === approvedLinkIds.length &&
        approvedLinkIds.every((id) => activeLinkIds.includes(id as string)) &&
        approvedProgramSourceKeys.size === activeProgramSourceKeys.size &&
        [...approvedProgramSourceKeys].every((key) =>
          activeProgramSourceKeys.has(key),
        ) &&
        draft.referenceVerificationStatus === expectedReferenceStatus;
      if (
        !isAnecdoteFormDraftRecord(draft) ||
        !draftScope ||
        !observation ||
        !observationScope ||
        !scopesMatch(draftScope, observationScope) ||
        observation.observationType !== "anecdotal" ||
        observation.rawTextImmutable !== true ||
        typeof observation.rawText !== "string" ||
        observation.rawText.trim().length === 0 ||
        draft.periodStart !== observation.civilDate ||
        draft.periodEnd !== observation.civilDate ||
        observationStudentIds.length !== 1 ||
        observationStudentIds[0] !== draft.studentIds[0] ||
        !studentIds.has(draft.studentIds[0]) ||
        !sections ||
        !hasExactKeys(sections, [
          "approvedCurriculumLinkIds",
          "approvedProgramSources",
          "generalEvaluationSourceDraftId",
          "observedLocation",
          "observedLocationSource",
          "observerGeneralAssessment",
        ]) ||
        approvedProgramSources.some(
          (source) =>
            !isRecord(source) ||
            !hasExactKeys(source, [
              "catalogId",
              "framework",
              "sourceVersion",
            ]),
        ) ||
        !generalEvaluationSourceValid ||
        (!pendingReviewValid &&
          !approvedReviewValid &&
          !legacyApprovalRequiresReapproval)
      ) {
        throw new Error(
          `reportDrafts/${draft.id} MEB 2024 anekdot formu kaynak, kapsam veya öğretmen onayı sözleşmesine uymuyor.`,
        );
      }
      continue;
    }
    if (draft.reportType !== "evidence-assessment") {
      const selectedObservationIds = draft.selectedObservationIds;
      const selectedMediaIds = draft.selectedMediaIds;
      if (
        !isNonEmptyText(draft.reportType, 120) ||
        (typeof draft.scope !== "string" && !isRecord(draft.scope)) ||
        !isUuidArray(draft.studentIds, { maximumLength: 10_000 }) ||
        (draft.studentIds as string[]).some(
          (studentId) => !studentIds.has(studentId),
        ) ||
        !isValidCivilDate(draft.periodStart) ||
        !isValidCivilDate(draft.periodEnd) ||
        draft.periodStart > draft.periodEnd ||
        !isUuidArray(selectedObservationIds, {
          allowEmpty: true,
          maximumLength: 50_000,
        }) ||
        (selectedObservationIds as string[]).some(
          (id) => !observationsById.has(id),
        ) ||
        !isUuidArray(selectedMediaIds, {
          allowEmpty: true,
          maximumLength: 50_000,
        }) ||
        (selectedMediaIds as string[]).some((id) => !mediaById.has(id)) ||
        !isRecord(draft.editableSections) ||
        (draft.generatedFileId !== undefined &&
          !isUuid(draft.generatedFileId))
      ) {
        throw new Error(
          `reportDrafts/${draft.id} rapor taslağı sözleşmesine uymuyor.`,
        );
      }
      continue;
    }
    const draftScope = validatedRecordScope(
      draft,
      "reportDrafts",
      classroomsById,
    );
    const draftStudentIds =
      Array.isArray(draft.studentIds) &&
      draft.studentIds.every((id) => typeof id === "string" && UUID_PATTERN.test(id))
        ? draft.studentIds
        : [];
    const draftObservationIds =
      Array.isArray(draft.observationIds) &&
      draft.observationIds.every(
        (id) => typeof id === "string" && UUID_PATTERN.test(id),
      )
        ? draft.observationIds
        : [];
    const distinctObservationIds = new Set(draftObservationIds);
    const observations = draftObservationIds.map((id) =>
      payload.observations.find((record) => record.id === id),
    );
    const citations =
      Array.isArray(draft.evidenceCitations) &&
      draft.evidenceCitations.every((citation) => isRecord(citation))
        ? draft.evidenceCitations
        : [];
    const citationsByObservation = new Map<string, Record<string, unknown>>();
    let citationsValid = citations.length === draftObservationIds.length;
    const citedLinks: StoredRecord[] = [];
    for (const citation of citations) {
      if (
        !hasExactKeys(citation, [
          "confirmedCurriculumLinkIds",
          "observationId",
          "observedAt",
        ])
      ) {
        citationsValid = false;
        continue;
      }
      const observationId = citation.observationId;
      const observation =
        typeof observationId === "string"
          ? payload.observations.find((record) => record.id === observationId)
          : undefined;
      const linkIds = Array.isArray(citation.confirmedCurriculumLinkIds)
        ? citation.confirmedCurriculumLinkIds
        : [];
      const distinctLinkIds = new Set(linkIds);
      if (
        typeof observationId !== "string" ||
        !distinctObservationIds.has(observationId) ||
        citationsByObservation.has(observationId) ||
        !observation ||
        citation.observedAt !== observation.observedAt ||
        linkIds.length === 0 ||
        distinctLinkIds.size !== linkIds.length ||
        linkIds.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))
      ) {
        citationsValid = false;
        continue;
      }
      const observationLinks = linksByObservation.get(observationId) ?? [];
      const resolvedLinks = linkIds.map((id) =>
        observationLinks.find((link) => link.id === id),
      );
      if (resolvedLinks.some((link) => !link)) {
        citationsValid = false;
        continue;
      }
      citationsByObservation.set(observationId, citation);
      citedLinks.push(...(resolvedLinks as StoredRecord[]));
    }
    const linkProfiles = citedLinks.map(
      (link) =>
        `${String(link.framework)}\u0000${String(link.catalogId)}\u0000${String(link.sourceVersion)}`,
    );
    const linkProvenanceProfiles = citedLinks.map((link) => {
      const provenance = validatedCurriculumProvenance(
        link,
        `evidenceCurriculumLinks/${link.id}`,
      );
      return `${provenance.referenceOrigin}\u0000${String(
        provenance.officialCatalogVerified,
      )}`;
    });
    const allCitedLinksOfficial =
      citedLinks.length > 0 &&
      citedLinks.every((link) => {
        const provenance = validatedCurriculumProvenance(
          link,
          `evidenceCurriculumLinks/${link.id}`,
        );
        return (
          provenance.referenceOrigin === "official-catalog" &&
          provenance.officialCatalogVerified
        );
      });
    const expectedVerificationStatus = allCitedLinksOfficial
      ? "official-catalog-verified"
      : "teacher-declared-unverified";
    const storedVerificationStatus =
      draft.referenceVerificationStatus ?? "teacher-declared-unverified";
    const periodStart = isValidCivilDate(draft.periodStart)
      ? draft.periodStart
      : null;
    const periodEnd = isValidCivilDate(draft.periodEnd)
      ? draft.periodEnd
      : null;
    const periodAndObservationsValid =
      periodStart !== null &&
      periodEnd !== null &&
      periodStart <= periodEnd &&
      observations.every(
        (observation) =>
          observation !== undefined &&
          isValidCivilDate(observation.civilDate) &&
          observation.civilDate >= periodStart &&
          observation.civilDate <= periodEnd,
      );
    if (
      !draftScope ||
      draftStudentIds.length !== 1 ||
      draftObservationIds.length === 0 ||
      distinctObservationIds.size !== draftObservationIds.length ||
      observations.some(
        (observation) =>
          !observation ||
          !Array.isArray(observation.studentIds) ||
          !observation.studentIds.includes(draftStudentIds[0]) ||
          !observationScopes.get(observation.id) ||
          !scopesMatch(
            draftScope,
            observationScopes.get(observation.id) as ActiveClassroomScope,
          ) ||
          (linksByObservation.get(observation.id) ?? []).length === 0,
      ) ||
      !citationsValid ||
      citationsByObservation.size !== draftObservationIds.length ||
      new Set(linkProfiles).size !== 1 ||
      new Set(linkProvenanceProfiles).size !== 1 ||
      typeof draft.teacherAssessmentText !== "string" ||
      draft.teacherAssessmentText.trim().length === 0 ||
      !periodAndObservationsValid ||
      draft.status !== "teacher-review-required" ||
      draft.authoredBy !== "teacher" ||
      draft.teacherReviewRequired !== true ||
      draft.reviewStatus !== "pending" ||
      draft.reviewedByUserId !== null ||
      draft.reviewedAt !== null ||
      draft.generationMode !== "teacher-authored-cited-draft" ||
      (storedVerificationStatus !== "official-catalog-verified" &&
        storedVerificationStatus !== "teacher-declared-unverified") ||
      storedVerificationStatus !== expectedVerificationStatus
    ) {
      throw new Error(`reportDrafts/${draft.id} kanıta bağlı taslak sözleşmesine uymuyor.`);
    }
  }

  const allEntityIds = new Set(
    COLLECTION_NAMES.flatMap((collection) =>
      payload[collection].map((record) => record.id),
    ),
  );
  const attendanceRecordsById = new Map(
    payload.attendanceRecords.map((record) => [record.id, record]),
  );
  const portfolioSelectionsById = new Map(
    payload.portfolioSelections.map((record) => [record.id, record]),
  );
  const externalFeedbackById = new Map(
    payload.externalFeedback.map((record) => [record.id, record]),
  );
  for (const exportPackage of payload.exportPackages) {
    const exportPeriodStart = String(exportPackage.periodStart);
    const exportPeriodEnd = String(exportPackage.periodEnd);
    const exportScope = validatedRecordScope(
      exportPackage,
      "exportPackages",
      classroomsById,
    );
    const exportAcademicYear = exportScope
      ? academicYearsById.get(exportScope.academicYearId)
      : undefined;
    if (
      !exportScope ||
      !exportAcademicYear ||
      typeof exportAcademicYear.startDate !== "string" ||
      typeof exportAcademicYear.endDate !== "string" ||
      String(exportPackage.periodStart) < exportAcademicYear.startDate ||
      String(exportPackage.periodEnd) > exportAcademicYear.endDate ||
      (exportPackage.studentIds as string[]).some(
        (studentId) =>
          !studentIds.has(studentId) ||
          !(studentScopes.get(studentId) ?? []).some((studentScope) =>
            scopesMatch(exportScope, studentScope),
          ),
      )
    ) {
      throw new Error(
        `exportPackages/${exportPackage.id} öğrenci, dönem veya sınıf kapsamıyla uyuşmuyor.`,
      );
    }
    const includedEntityIds =
      exportPackage.includedEntityIds as Record<string, unknown>;
    if (
      exportPackage.type === "student_dossier" &&
      !hasExactKeys(includedEntityIds, [
        "attendanceRecords",
        "externalFeedback",
        "mediaAssets",
        "observations",
        "portfolioSelections",
        "valueEvidenceLinks",
      ])
    ) {
      throw new Error(
        `exportPackages/${exportPackage.id} öğrenci dosyası dahil edilen kayıt grupları exact sözleşmeye uymuyor.`,
      );
    }
    const includedGroups = Object.values(includedEntityIds);
    if (
      includedGroups.some(
        (group) =>
          !isUuidArray(group, { allowEmpty: true, maximumLength: 100_000 }) ||
          group.some((id) => !allEntityIds.has(id)),
      )
    ) {
      throw new Error(
        `exportPackages/${exportPackage.id} bilinmeyen veya geçersiz kayıt kimliği içeriyor.`,
      );
    }
    if (exportPackage.type === "student_dossier") {
      const packageStudentIds = exportPackage.studentIds as string[];
      const packageStudentId = packageStudentIds[0];
      const packageStudent = studentsById.get(packageStudentId);
      const packageClassroom = classroomsById.get(exportScope.classroomId);
      const manifest = exportPackage.manifest as Record<string, unknown>;
      const observationIds = includedEntityIds.observations as string[];
      const valueEvidenceLinkIds = includedEntityIds.valueEvidenceLinks as string[];
      const attendanceRecordIds = includedEntityIds.attendanceRecords as string[];
      const portfolioSelectionIds = includedEntityIds.portfolioSelections as string[];
      const externalFeedbackIds = includedEntityIds.externalFeedback as string[];
      const mediaAssetIds = includedEntityIds.mediaAssets as string[];
      if (
        packageStudentIds.length !== 1 ||
        !packageStudent ||
        !recordWasVisibleAt(packageStudent, exportPackage.createdAt) ||
        !packageClassroom ||
        !recordWasVisibleAt(packageClassroom, exportPackage.createdAt) ||
        !recordWasVisibleAt(exportAcademicYear, exportPackage.createdAt) ||
        (manifest.identityMode !== "full" && manifest.identityMode !== "alias") ||
        typeof manifest.includeContacts !== "boolean" ||
        typeof manifest.includeAttendance !== "boolean" ||
        typeof manifest.includeObservations !== "boolean" ||
        typeof manifest.includePortfolio !== "boolean" ||
        typeof manifest.includeExternalFeedback !== "boolean" ||
        (manifest.includeObservations !== true &&
          (observationIds.length > 0 || valueEvidenceLinkIds.length > 0)) ||
        (manifest.includeAttendance !== true && attendanceRecordIds.length > 0) ||
        (manifest.includePortfolio !== true && portfolioSelectionIds.length > 0) ||
        (manifest.includeExternalFeedback !== true &&
          externalFeedbackIds.length > 0) ||
        mediaAssetIds.length > 0
      ) {
        throw new Error(
          `exportPackages/${exportPackage.id} öğrenci dosyası gizlilik veya dahil etme sözleşmesine uymuyor.`,
        );
      }

      const observationIdSet = new Set(observationIds);
      const invalidObservation = observationIds.some((id) => {
        const observation = observationsById.get(id);
        const observationScope = observation
          ? validatedRecordScope(observation, "observations", classroomsById)
          : null;
        return (
          !observation ||
          !recordWasVisibleAt(observation, exportPackage.createdAt) ||
          !Array.isArray(observation.studentIds) ||
          observation.studentIds.length !== 1 ||
          observation.studentIds[0] !== packageStudentId ||
          !observationScope ||
          !scopesMatch(exportScope, observationScope) ||
          observation.civilDate < exportPeriodStart ||
          observation.civilDate > exportPeriodEnd
        );
      });
      const invalidAttendance = attendanceRecordIds.some((id) => {
        const attendance = attendanceRecordsById.get(id);
        const attendanceScope = attendance
          ? validatedRecordScope(attendance, "attendanceRecords", classroomsById)
          : null;
        return (
          !attendance ||
          !recordWasVisibleAt(attendance, exportPackage.createdAt) ||
          attendance.studentId !== packageStudentId ||
          !attendanceScope ||
          !scopesMatch(exportScope, attendanceScope) ||
          attendance.civilDate < exportPeriodStart ||
          attendance.civilDate > exportPeriodEnd
        );
      });
      const invalidPortfolioSelection = portfolioSelectionIds.some((id) => {
        const selection = portfolioSelectionsById.get(id);
        const selectionScope = selection
          ? validatedRecordScope(selection, "portfolioSelections", classroomsById)
          : null;
        const sourceObservation =
          selection?.itemType === "observation" &&
          typeof selection.itemId === "string"
            ? observationsById.get(selection.itemId)
            : undefined;
        const sourceObservationScope = sourceObservation
          ? validatedRecordScope(sourceObservation, "observations", classroomsById)
          : null;
        return (
          !selection ||
          !recordWasVisibleAt(selection, exportPackage.createdAt) ||
          selection.studentId !== packageStudentId ||
          !selectionScope ||
          !scopesMatch(exportScope, selectionScope) ||
          typeof selection.periodStart !== "string" ||
          typeof selection.periodEnd !== "string" ||
          !periodsOverlap(
            selection.periodStart,
            selection.periodEnd,
            exportPeriodStart,
            exportPeriodEnd,
          ) ||
          (selection.itemType === "observation" &&
            (!sourceObservation ||
              !recordWasVisibleAt(sourceObservation, exportPackage.createdAt) ||
              !Array.isArray(sourceObservation.studentIds) ||
              sourceObservation.studentIds.length !== 1 ||
              sourceObservation.studentIds[0] !== packageStudentId ||
              !sourceObservationScope ||
              !scopesMatch(exportScope, sourceObservationScope) ||
              sourceObservation.civilDate < exportPeriodStart ||
              sourceObservation.civilDate > exportPeriodEnd ||
              (manifest.includeObservations === true &&
                !observationIdSet.has(sourceObservation.id))))
        );
      });
      const invalidExternalFeedback = externalFeedbackIds.some((id) => {
        const feedback = externalFeedbackById.get(id);
        const feedbackScope = feedback
          ? validatedRecordScope(feedback, "externalFeedback", classroomsById)
          : null;
        return (
          !feedback ||
          !recordWasVisibleAt(feedback, exportPackage.createdAt) ||
          feedback.studentId !== packageStudentId ||
          !feedbackScope ||
          !scopesMatch(exportScope, feedbackScope) ||
          typeof feedback.periodStart !== "string" ||
          typeof feedback.periodEnd !== "string" ||
          !periodsOverlap(
            feedback.periodStart,
            feedback.periodEnd,
            exportPeriodStart,
            exportPeriodEnd,
          )
        );
      });
      if (
        invalidObservation ||
        invalidAttendance ||
        invalidPortfolioSelection ||
        invalidExternalFeedback
      ) {
        throw new Error(
          `exportPackages/${exportPackage.id} başka çocuk, kapsam, dönem veya canlılık penceresinden kayıt içeriyor.`,
        );
      }
    }

    const includedValueEvidenceLinkIds = includedEntityIds.valueEvidenceLinks;
    if (Array.isArray(includedValueEvidenceLinkIds)) {
      const packageStudentIds = new Set(exportPackage.studentIds as string[]);
      const invalidValueEvidenceLink = includedValueEvidenceLinkIds.some((id) => {
        const link = typeof id === "string"
          ? valueEvidenceLinksById.get(id)
          : undefined;
        const observation = link && typeof link.observationId === "string"
          ? observationsById.get(link.observationId)
          : undefined;
        const linkScope = link
          ? validatedRecordScope(link, "valueEvidenceLinks", classroomsById)
          : null;
        const observationScope = observation
          ? validatedRecordScope(observation, "observations", classroomsById)
          : null;
        return (
          !link ||
          !recordWasVisibleAt(link, exportPackage.createdAt) ||
          !packageStudentIds.has(String(link.studentId)) ||
          !linkScope ||
          !scopesMatch(exportScope, linkScope) ||
          !observation ||
          !recordWasVisibleAt(observation, exportPackage.createdAt) ||
          !Array.isArray(observation.studentIds) ||
          observation.studentIds.length !== 1 ||
          observation.studentIds[0] !== link.studentId ||
          !observationScope ||
          !scopesMatch(exportScope, observationScope) ||
          (exportPackage.type === "student_dossier" &&
            !(includedEntityIds.observations as string[]).includes(
              observation.id,
            )) ||
          observation.civilDate < exportPeriodStart ||
          observation.civilDate > exportPeriodEnd ||
          link.civilDate < exportPeriodStart ||
          link.civilDate > exportPeriodEnd
        );
      });
      if (invalidValueEvidenceLink) {
        throw new Error(
          `exportPackages/${exportPackage.id} başka çocuk, kapsam veya dönemden değer kanıtı içeriyor.`,
        );
      }
    }
  }

  for (const feedback of payload.externalFeedback) {
    const feedbackScope = validatedRecordScope(
      feedback,
      "externalFeedback",
      classroomsById,
    );
    const allowedStudentScopes =
      studentScopes.get(feedback.studentId as string) ?? [];
    const linkedPackage =
      typeof feedback.linkedExportPackageId === "string"
        ? payload.exportPackages.find(
            (record) => record.id === feedback.linkedExportPackageId,
          )
        : undefined;
    const linkedManifest =
      linkedPackage && isRecord(linkedPackage.manifest)
        ? linkedPackage.manifest
        : undefined;
    const feedbackAcademicYear = feedbackScope
      ? academicYearsById.get(feedbackScope.academicYearId)
      : undefined;
    if (
      !feedbackScope ||
      !feedbackAcademicYear ||
      typeof feedbackAcademicYear.startDate !== "string" ||
      typeof feedbackAcademicYear.endDate !== "string" ||
      String(feedback.periodStart) < feedbackAcademicYear.startDate ||
      String(feedback.periodEnd) > feedbackAcademicYear.endDate ||
      !allowedStudentScopes.some((studentScope) =>
        scopesMatch(feedbackScope, studentScope),
      ) ||
      ((feedback.provider === "chatgpt" || feedback.provider === "gemini") &&
        typeof feedback.linkedExportPackageId !== "string") ||
      (typeof feedback.linkedExportPackageId === "string" &&
        (!linkedPackage ||
          linkedPackage.type !== "student_dossier" ||
          !Array.isArray(linkedPackage.studentIds) ||
          !linkedPackage.studentIds.includes(feedback.studentId) ||
          linkedPackage.academicYearId !== feedback.academicYearId ||
          linkedPackage.classroomId !== feedback.classroomId ||
          linkedPackage.periodStart !== feedback.periodStart ||
          linkedPackage.periodEnd !== feedback.periodEnd ||
          !linkedManifest ||
          linkedManifest.packageKind !== "student_dossier" ||
          linkedManifest.audience !== feedback.audience ||
          linkedManifest.purpose !== feedback.audience ||
          linkedManifest.periodStart !== feedback.periodStart ||
          linkedManifest.periodEnd !== feedback.periodEnd ||
          linkedManifest.academicYearId !== feedback.academicYearId ||
          linkedManifest.classroomId !== feedback.classroomId ||
          (feedback.provider !== "other" &&
            (linkedManifest.destination !== feedback.provider ||
              linkedManifest.provider !== feedback.provider))))
    ) {
      throw new Error(
        `externalFeedback/${feedback.id} öğrenci veya dışa aktarım paketi ilişkisi geçersiz.`,
      );
    }
  }

  const auditTargets: Record<string, ReadonlySet<string>> = {
    academicYear: new Set(payload.academicYears.map((record) => record.id)),
    classroom: new Set(payload.classrooms.map((record) => record.id)),
    student: studentIds,
    attendanceRecord: new Set(
      payload.attendanceRecords.map((record) => record.id),
    ),
    observation: new Set(payload.observations.map((record) => record.id)),
    plan: new Set(payload.plans.map((record) => record.id)),
    activity: new Set(payload.activities.map((record) => record.id)),
  };
  for (const auditLog of payload.auditLogs) {
    const knownTargets = auditTargets[auditLog.entityType as string];
    if (knownTargets && !knownTargets.has(auditLog.entityId as string)) {
      throw new Error(
        `auditLogs/${auditLog.id} bilinmeyen hedef kayda bağlı.`,
      );
    }
  }

  const dayClosures = payload.settings
    .filter(isTeacherDayClosureSetting)
    .sort(
      (left, right) =>
        left.closedAt.localeCompare(right.closedAt) ||
        left.id.localeCompare(right.id),
    );
  const carryForwardOrigins = new Map<
    string,
    (typeof dayClosures)[number]
  >();
  for (const closure of dayClosures) {
    for (const issueCode of closure.issueCodes) {
      const identity = teacherDayCarryForwardSourceIdentity({
        academicYearId: closure.academicYearId,
        classroomId: closure.classroomId,
        sourceCivilDate: closure.civilDate,
        sourceIssueCode: issueCode,
      });
      if (!carryForwardOrigins.has(identity)) {
        carryForwardOrigins.set(identity, closure);
      }
    }
  }
  const carryForwardTransitions = payload.settings
    .filter(isTeacherDayCarryForwardTransitionSetting)
    .sort(
      (left, right) =>
        left.transitionedAt.localeCompare(right.transitionedAt) ||
        left.id.localeCompare(right.id),
    );
  const latestTransitionIdByIdentity = new Map<string, string>();
  for (const transition of carryForwardTransitions) {
    const origin = carryForwardOrigins.get(transition.sourceIssueIdentity);
    const chainOrigin = carryForwardOrigins.get(transition.sourceIssueId);
    const expectedPreviousId =
      latestTransitionIdByIdentity.get(transition.sourceIssueIdentity) ?? null;
    if (
      !origin ||
      !chainOrigin ||
      transition.sourceClosureId !== origin.id ||
      transition.sourceCivilDate !== origin.civilDate ||
      !origin.issueCodes.includes(transition.sourceIssueCode) ||
      transition.academicYearId !== origin.academicYearId ||
      transition.classroomId !== origin.classroomId ||
      chainOrigin.academicYearId !== origin.academicYearId ||
      chainOrigin.classroomId !== origin.classroomId ||
      chainOrigin.civilDate > origin.civilDate ||
      !chainOrigin.issueCodes.includes(transition.sourceIssueCode) ||
      transition.transitionedAt < origin.closedAt ||
      transition.previousTransitionId !== expectedPreviousId ||
      transition.civilDate !== istanbulCivilDate(transition.transitionedAt)
    ) {
      throw new Error(
        `settings/${transition.id} taşınan iş kaynak veya geçiş zinciri geçersiz.`,
      );
    }
    validatedRecordScope(transition, "settings", classroomsById);
    latestTransitionIdByIdentity.set(
      transition.sourceIssueIdentity,
      transition.id,
    );
  }

  for (const setting of payload.settings) {
    if (setting.settingType === QUICK_OBSERVATION_DRAFT_SETTING_TYPE) {
      if (!isQuickObservationDraftRecord(setting)) {
        throw new Error(`settings/${setting.id} hızlı gözlem taslağı geçersiz.`);
      }
      const batchMetadataValid =
        (setting.batchId === undefined && setting.captureScope === undefined) ||
        (typeof setting.batchId === "string" &&
          UUID_PATTERN.test(setting.batchId) &&
          setting.captureScope === "selected-children");
      if (!batchMetadataValid) {
        throw new Error(
          `settings/${setting.id} toplu gözlem taslağı kimliği geçersiz.`,
        );
      }
      const draftScope = validatedRecordScope(
        setting,
        "settings",
        classroomsById,
      );
      const allowedStudentScopes = studentScopes.get(setting.studentId) ?? [];
      const plan = plansById.get(setting.planId);
      const activity = activitiesById.get(setting.activityId);
      const planScope = plan ? planScopes.get(plan.id) ?? null : null;
      const activityScope = activity
        ? activityScopes.get(activity.id) ?? null
        : null;
      if (
        !draftScope ||
        allowedStudentScopes.length === 0 ||
        !allowedStudentScopes.some((studentScope) =>
          scopesMatch(draftScope, studentScope),
        ) ||
        !plan ||
        !planScope ||
        !scopesMatch(draftScope, planScope) ||
        !activity ||
        activity.planId !== plan.id ||
        !activityScope ||
        !scopesMatch(draftScope, activityScope) ||
        (Array.isArray(activity.studentIds) &&
          activity.studentIds.length > 0 &&
          !activity.studentIds.includes(setting.studentId))
      ) {
        throw new Error(
          `settings/${setting.id} hızlı gözlem taslağı ilişkileri geçersiz.`,
        );
      }
    }
    if (
      setting.settingType === ATTENDANCE_COMPLETION_SETTING_TYPE &&
      !isAttendanceCompletionSetting(setting)
    ) {
      throw new Error(`settings/${setting.id} günlük yoklama ayarı geçersiz.`);
    }
    if (
      setting.settingType === TEACHER_DAY_CLOSURE_SETTING_TYPE &&
      !isTeacherDayClosureSetting(setting)
    ) {
      throw new Error(`settings/${setting.id} gün sonu kaydı geçersiz.`);
    }
    if (
      setting.settingType ===
        TEACHER_DAY_CARRY_FORWARD_TRANSITION_SETTING_TYPE &&
      !isTeacherDayCarryForwardTransitionSetting(setting)
    ) {
      throw new Error(`settings/${setting.id} taşınan iş geçişi geçersiz.`);
    }
    if (
      setting.settingType === ACTIVE_CLASSROOM_SETTING_TYPE &&
      typeof setting.deletedAt !== "string"
    ) {
      if (
        typeof setting.classroomId !== "string" ||
        !UUID_PATTERN.test(setting.classroomId) ||
        typeof setting.academicYearId !== "string" ||
        !UUID_PATTERN.test(setting.academicYearId)
      ) {
        throw new Error(`settings/${setting.id} aktif sınıf seçimi geçersiz.`);
      }
      const selectedClassroom = payload.classrooms.find(
        (classroom) => classroom.id === setting.classroomId,
      );
      const selectedAcademicYear = payload.academicYears.find(
        (academicYear) => academicYear.id === setting.academicYearId,
      );
      if (
        !selectedClassroom ||
        selectedClassroom.academicYearId !== setting.academicYearId ||
        selectedClassroom.status === "archived" ||
        selectedClassroom.archiveStatus === "archived" ||
        !selectedAcademicYear ||
        selectedAcademicYear.status === "archived"
      ) {
        throw new Error(`settings/${setting.id} bilinmeyen veya uyumsuz sınıfa bağlı.`);
      }
    }
    if (
      setting.settingType === ATTENDANCE_COMPLETION_SETTING_TYPE ||
      setting.settingType === TEACHER_DAY_CLOSURE_SETTING_TYPE ||
      setting.settingType ===
        TEACHER_DAY_CARRY_FORWARD_TRANSITION_SETTING_TYPE ||
      typeof setting.attendanceCompleted === "boolean"
    ) {
      validatedRecordScope(setting, "settings", classroomsById);
    }
  }
}

export function assertBackupEnvelope(value: unknown): asserts value is BackupEnvelope {
  assertBackupEnvelopeStructure(value);
  if (value.manifest.dataSchemaVersion !== DATA_SCHEMA_VERSION) {
    throw new Error("Eski yedek ilişkileri doğrulanmadan önce veri şeması yükseltilmelidir.");
  }
  assertBackupRelationships(value.payload, value.manifest.civilDate);
}
