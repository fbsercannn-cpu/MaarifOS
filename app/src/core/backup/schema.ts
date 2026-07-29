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
} from "../domain/attendance";
import {
  ACTIVE_CLASSROOM_SETTING_TYPE,
  isClassroomRecord,
} from "../domain/classroom";
import {
  LEGACY_ASSIGNMENT_NEEDS_REVIEW,
  type ActiveClassroomScope,
} from "../domain/classroom-scope";
import {
  QUICK_OBSERVATION_DRAFT_SETTING_TYPE,
  isQuickObservationCategory,
  isQuickObservationDraftRecord,
  isQuickObservationType,
} from "../domain/quick-observation";
import {
  assertAppLockAttemptState,
  assertAppLockConfig,
} from "../security/app-lock";

export const BACKUP_FORMAT = "maarifos-json";
export const BACKUP_VERSION = 1;
export const LEGACY_DATA_SCHEMA_VERSION = 1;
export const DATA_SCHEMA_VERSION = 2;

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  backupVersion: typeof BACKUP_VERSION;
  dataSchemaVersion:
    | typeof LEGACY_DATA_SCHEMA_VERSION
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
const APP_LOCK_SETTING_TYPE = "app-lock-config-v1";
const LOCAL_TEACHER_IDENTITY_SETTING_TYPE = "local-teacher-identity";
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
    "preferredName",
    "optionalCode",
    "birthDate",
    "enrollmentDate",
    "homeLanguages",
    "interests",
    "strengths",
    "supportPreferences",
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
    "generationMode",
    "referenceVerificationStatus",
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
      url.username === "" &&
      url.password === "" &&
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
      !isNonEmptyText(record.itemType, 80) ||
      !isUuid(record.itemId) ||
      !Number.isInteger(record.order) ||
      (record.order as number) < 0 ||
      (record.teacherCaption !== undefined &&
        !isNonEmptyText(record.teacherCaption, 2_000))
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
      if (!isUuid(record.teacherUserId)) {
        throw new Error(
          `settings/${record.id} yerel öğretmen kimliği geçersiz.`,
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
  if (
    student.profileSchemaVersion !== undefined &&
    student.profileSchemaVersion !== 2 &&
    student.profileSchemaVersion !== 3
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
  const expectedCollections =
    manifest.dataSchemaVersion === LEGACY_DATA_SCHEMA_VERSION
      ? COLLECTION_NAMES.filter(
          (collection) => collection !== "evidenceCurriculumLinks",
        )
      : [...COLLECTION_NAMES];
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
  const expectedCountKeys =
    manifest.dataSchemaVersion === LEGACY_DATA_SCHEMA_VERSION
      ? expectedCollections
      : COLLECTION_NAMES;
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
    if (
      collection === "evidenceCurriculumLinks" &&
      manifest.dataSchemaVersion === LEGACY_DATA_SCHEMA_VERSION &&
      records === undefined
    ) {
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

  const studentIds = new Set(payload.students.map((student) => student.id));
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
  for (const plan of payload.plans) {
    const planScope = validatedRecordScope(plan, "plans", classroomsById);
    planScopes.set(plan.id, planScope);
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
  }
  const plansById = new Map(payload.plans.map((plan) => [plan.id, plan]));
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
                (planProfile.officialCatalogVerified === true),
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
        !isSafeHttpsUrl(link.targetSourceUrl)) ||
      !profile ||
      profile.framework !== link.framework ||
      profile.catalogId !== link.catalogId ||
      profile.sourceVersion !== link.sourceVersion ||
      !profileProvenance ||
      profileProvenance.referenceOrigin !== linkProvenance.referenceOrigin ||
      profileProvenance.officialCatalogVerified !==
        linkProvenance.officialCatalogVerified
    ) {
      throw new Error(
        `evidenceCurriculumLinks/${link.id} öğretmen onaylı program bağı geçersiz.`,
      );
    }
    const group = linksByObservation.get(observation.id) ?? [];
    group.push(link);
    linksByObservation.set(observation.id, group);
  }

  for (const draft of payload.reportDrafts) {
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
  for (const exportPackage of payload.exportPackages) {
    if (
      (exportPackage.studentIds as string[]).some(
        (studentId) => !studentIds.has(studentId),
      )
    ) {
      throw new Error(
        `exportPackages/${exportPackage.id} bilinmeyen öğrenciye bağlı.`,
      );
    }
    const includedGroups = Object.values(
      exportPackage.includedEntityIds as Record<string, unknown>,
    );
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
