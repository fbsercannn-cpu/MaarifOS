import {
  isAttendanceRecord,
  isCivilDate,
  type AttendanceRecord,
} from "../domain/attendance.ts";
import {
  calendarEntryFromRecord,
  type CalendarEntry,
} from "../domain/calendar.ts";
import {
  isClassroomRecord,
  type ClassroomRecord,
} from "../domain/classroom.ts";
import {
  type CollectionName,
  type StoredRecord,
} from "../domain/model.ts";
import {
  isQuickObservationCategory,
  isQuickObservationType,
  type QuickObservationCategory,
  type QuickObservationType,
} from "../domain/quick-observation.ts";
import {
  isValidStudentNationalIdentityNumber,
  studentProfileFromRecord,
  type StudentCareDetails,
  type StudentContact,
} from "../domain/student.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AcademicYearRecord extends StoredRecord {
  name: string;
  startDate: string;
  endDate: string;
  operationalStartDate?: string;
  operationalStartedAt?: string;
  /** @deprecated yalnız eski prototip kaydını migrasyonda okumak içindir */
  officialStartDate?: string;
  /** @deprecated yalnız eski prototip kaydını migrasyonda okumak içindir */
  activatedEarlyAt?: string;
  status?: "active" | "archived";
  archivedAt?: string;
  closedOn?: string;
}

/**
 * Kanonik öğrenci kaydının repository görünümü. Eski profil sürümleri geri
 * yüklenebildiği için yalnız bütün sürümlerde zorunlu olan displayName alanı
 * zorunludur; sürüme özgü profil ayrıntılarını domain codec'i doğrular.
 */
export interface StudentRecord extends StoredRecord {
  displayName: string;
  academicYearId?: string;
  classroomId?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  birthDate?: string;
  optionalCode?: string;
  nationalIdentityNumber?: string;
  enrollmentYear?: string;
  /** @deprecated Yalnız v5 ve daha eski yedekleri okumak içindir. */
  enrollmentDate?: string;
  homeLanguages?: string;
  interests?: string;
  strengths?: string;
  supportPreferences?: string;
  contacts?: StudentContact[];
  careDetails?: StudentCareDetails;
  profileSchemaVersion?: 2 | 3 | 4 | 5 | 6 | 7 | 8;
  active?: boolean;
  enrollmentStatus?: "active" | "left" | "completed" | "transferred";
}

export interface ObservationRecord extends StoredRecord {
  rawText: string;
  observedAt?: string;
  studentId?: string;
  studentIds?: string[];
  academicYearId?: string;
  classroomId?: string;
  observationType?: QuickObservationType;
  observationCategories?: QuickObservationCategory[];
  _MUKERRER_INCELE?: true;
  duplicateOf?: string;
}

export const VALUE_EVIDENCE_ROLES = [
  "supports",
  "contrasts",
  "context_only",
] as const;

export type ValueEvidenceRole = (typeof VALUE_EVIDENCE_ROLES)[number];

export const VALUE_EVIDENCE_TARGET_CODES = [
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
  "D7",
  "D8",
  "D9",
  "D10",
  "D11",
  "D12",
  "D13",
  "D14",
  "D15",
  "D16",
  "D17",
  "D18",
  "D19",
  "D20",
] as const;

export type ValueEvidenceTargetCode =
  (typeof VALUE_EVIDENCE_TARGET_CODES)[number];

export interface ValueEvidenceProvenanceCapsule {
  contentPackId: string;
  contentPackVersion: string;
  contentReleaseId: string;
  contentManifestDigest: `sha256:${string}`;
  appliedActivityTemplateId: string;
  appliedValuesDesignId: string;
  appliedValuesDesignVersion: "1.0.0";
  appliedValuesDesignDigest: `sha256:${string}`;
}

/**
 * Bir nesnel gözlem ile plandaki tek bir resmî değer eylemi arasında,
 * yalnız öğretmenin açık onayıyla kurulan izlenebilir bağ.
 */
export interface ValueEvidenceLinkRecord extends StoredRecord {
  academicYearId: string;
  classroomId: string;
  observationId: string;
  studentId: string;
  planId: string;
  activityId: string;
  evidenceRole: ValueEvidenceRole;
  targetValueCode: ValueEvidenceTargetCode;
  targetIndicatorCode: string;
  teacherRationale: string;
  confirmationMethod: "teacher-confirmed";
  confirmationScope: "observation-to-value-action-link";
  confirmedByActorKind: "local-teacher-identity";
  confirmedByActorId: string;
  confirmedAt: string;
  provenance: ValueEvidenceProvenanceCapsule;
  supersedesLinkId: string | null;
}

export interface CalendarEntryRecord extends StoredRecord, CalendarEntry {
  academicYearId?: string;
  classroomId?: string;
}

/**
 * Koleksiyon anahtarı ile o koleksiyonun kanonik kayıt tipini tek noktada
 * eşler. Henüz ayrı domain modeli olmayan koleksiyonlar bilinçli olarak açık
 * StoredRecord kalır.
 */
export interface EntityMap {
  academicYears: AcademicYearRecord;
  classrooms: ClassroomRecord;
  students: StudentRecord;
  attendanceRecords: AttendanceRecord;
  observations: ObservationRecord;
  observationRevisions: StoredRecord;
  activities: StoredRecord;
  mediaAssets: StoredRecord;
  plans: StoredRecord;
  calendarEntries: CalendarEntryRecord;
  maarifReferences: StoredRecord;
  evidenceCurriculumLinks: StoredRecord;
  valueEvidenceLinks: ValueEvidenceLinkRecord;
  portfolioSelections: StoredRecord;
  reportDrafts: StoredRecord;
  externalFeedback: StoredRecord;
  exportPackages: StoredRecord;
  notificationRules: StoredRecord;
  settings: StoredRecord;
  auditLogs: StoredRecord;
}

export type EntitySnapshot = {
  [Collection in CollectionName]: EntityMap[Collection][];
};

/**
 * Literal koleksiyon anahtarında kesin kayıt tipini, dinamik CollectionName
 * akışlarında ise geri uyumlu StoredRecord sözleşmesini verir.
 */
export type EntityRecord<Collection extends CollectionName> =
  EntityMap[Collection];

export type EntityRecordGuard<Collection extends CollectionName> = (
  value: unknown,
) => value is EntityMap[Collection];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isRequiredText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSha256Digest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

function isUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

export function isStoredRecord(value: unknown): value is StoredRecord {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    isUtcIso(value.createdAt) &&
    isUtcIso(value.updatedAt) &&
    value.updatedAt >= value.createdAt &&
    isCivilDate(value.civilDate) &&
    Number.isInteger(value.schemaVersion) &&
    Number(value.schemaVersion) >= 1 &&
    (value.deletedAt === undefined ||
      value.deletedAt === null ||
      isUtcIso(value.deletedAt))
  );
}

function isAcademicYearRecord(value: unknown): value is AcademicYearRecord {
  return (
    isStoredRecord(value) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    isCivilDate(value.startDate) &&
    isCivilDate(value.endDate) &&
    value.startDate <= value.endDate &&
    (value.status === undefined ||
      value.status === "active" ||
      value.status === "archived") &&
    (value.archivedAt === undefined || isUtcIso(value.archivedAt)) &&
    (value.closedOn === undefined || isCivilDate(value.closedOn))
  );
}

function isStudentRecord(value: unknown): value is StudentRecord {
  if (!isStoredRecord(value) || studentProfileFromRecord(value) === null) {
    return false;
  }
  const optionalTextFields = [
    "firstName",
    "lastName",
    "preferredName",
    "optionalCode",
    "homeLanguages",
    "interests",
    "strengths",
    "supportPreferences",
  ] as const;
  if (
    optionalTextFields.some(
      (field) =>
        value[field] !== undefined &&
        (typeof value[field] !== "string" || value[field].trim().length === 0),
    ) ||
    (value.academicYearId !== undefined &&
      (typeof value.academicYearId !== "string" ||
        !UUID_PATTERN.test(value.academicYearId))) ||
    (value.classroomId !== undefined &&
      (typeof value.classroomId !== "string" ||
        !UUID_PATTERN.test(value.classroomId))) ||
    (value.birthDate !== undefined && !isCivilDate(value.birthDate)) ||
    (value.nationalIdentityNumber !== undefined &&
      !isValidStudentNationalIdentityNumber(value.nationalIdentityNumber)) ||
    (value.enrollmentYear !== undefined &&
      (typeof value.enrollmentYear !== "string" ||
        !/^\d{4}$/.test(value.enrollmentYear))) ||
    (value.enrollmentDate !== undefined && !isCivilDate(value.enrollmentDate)) ||
    (value.profileSchemaVersion !== undefined &&
      value.profileSchemaVersion !== 2 &&
      value.profileSchemaVersion !== 3 &&
      value.profileSchemaVersion !== 4 &&
      value.profileSchemaVersion !== 5 &&
      value.profileSchemaVersion !== 6 &&
      value.profileSchemaVersion !== 7 &&
      value.profileSchemaVersion !== 8) ||
    (value.active !== undefined && typeof value.active !== "boolean") ||
    (value.enrollmentStatus !== undefined &&
      value.enrollmentStatus !== "active" &&
      value.enrollmentStatus !== "left" &&
      value.enrollmentStatus !== "completed" &&
      value.enrollmentStatus !== "transferred")
  ) {
    return false;
  }
  if (
    value.careDetails !== undefined &&
    studentProfileFromRecord(value)?.careDetails === undefined
  ) {
    return false;
  }
  if (value.contacts === undefined) return true;
  return (
    Array.isArray(value.contacts) &&
    value.contacts.every(
      (contact) =>
        isObject(contact) &&
        typeof contact.id === "string" &&
        UUID_PATTERN.test(contact.id) &&
        (contact.kind === "mother" ||
          contact.kind === "father" ||
          contact.kind === "other") &&
        typeof contact.relationship === "string" &&
        contact.relationship.trim().length > 0 &&
        (contact.name === undefined ||
          (typeof contact.name === "string" && contact.name.trim().length > 0)) &&
        typeof contact.phone === "string" &&
        contact.phone.trim().length > 0 &&
        typeof contact.isPrimary === "boolean" &&
        (contact.isEmergencyContact === undefined ||
          typeof contact.isEmergencyContact === "boolean") &&
        (contact.isAuthorizedPickup === undefined ||
          typeof contact.isAuthorizedPickup === "boolean"),
    )
  );
}

function isRepositoryClassroomRecord(
  value: unknown,
): value is ClassroomRecord {
  return isStoredRecord(value) && isClassroomRecord(value);
}

function isRepositoryAttendanceRecord(
  value: unknown,
): value is AttendanceRecord {
  return isStoredRecord(value) && isAttendanceRecord(value);
}

function isObservationRecord(value: unknown): value is ObservationRecord {
  if (
    !isStoredRecord(value) ||
    typeof value.rawText !== "string" ||
    value.rawText.length > 100_000
  ) {
    return false;
  }
  const studentIdsValid =
    value.studentIds === undefined ||
    (Array.isArray(value.studentIds) &&
      value.studentIds.length > 0 &&
      value.studentIds.every(
        (studentId) =>
          typeof studentId === "string" && UUID_PATTERN.test(studentId),
      ) &&
      new Set(value.studentIds).size === value.studentIds.length);
  const observationCategoriesValid =
    value.observationCategories === undefined ||
    (Array.isArray(value.observationCategories) &&
      value.observationCategories.every(isQuickObservationCategory) &&
      new Set(value.observationCategories).size ===
        value.observationCategories.length);
  return (
    studentIdsValid &&
    observationCategoriesValid &&
    (value.studentId === undefined ||
      (typeof value.studentId === "string" && UUID_PATTERN.test(value.studentId))) &&
    (value.academicYearId === undefined ||
      (typeof value.academicYearId === "string" &&
        UUID_PATTERN.test(value.academicYearId))) &&
    (value.classroomId === undefined ||
      (typeof value.classroomId === "string" &&
        UUID_PATTERN.test(value.classroomId))) &&
    (value.observationType === undefined ||
      isQuickObservationType(value.observationType)) &&
    (value.observedAt === undefined || isUtcIso(value.observedAt)) &&
    (value._MUKERRER_INCELE === undefined ||
      value._MUKERRER_INCELE === true) &&
    (value.duplicateOf === undefined ||
      (typeof value.duplicateOf === "string" &&
        UUID_PATTERN.test(value.duplicateOf)))
  );
}

export function isValueEvidenceLinkRecord(
  value: unknown,
): value is ValueEvidenceLinkRecord {
  if (!isStoredRecord(value) || value.schemaVersion !== 1) return false;

  const uuidFields = [
    value.academicYearId,
    value.classroomId,
    value.observationId,
    value.studentId,
    value.planId,
    value.activityId,
    value.confirmedByActorId,
  ];
  if (!uuidFields.every(isUuid)) return false;
  if (
    value.supersedesLinkId !== null &&
    !isUuid(value.supersedesLinkId)
  ) {
    return false;
  }

  if (
    typeof value.evidenceRole !== "string" ||
    !(VALUE_EVIDENCE_ROLES as readonly string[]).includes(value.evidenceRole) ||
    typeof value.targetValueCode !== "string" ||
    !(VALUE_EVIDENCE_TARGET_CODES as readonly string[]).includes(
      value.targetValueCode,
    ) ||
    typeof value.targetIndicatorCode !== "string" ||
    !new RegExp(`^${value.targetValueCode}\\.[1-9]\\d*\\.[1-9]\\d*$`).test(
      value.targetIndicatorCode,
    ) ||
    !isRequiredText(value.teacherRationale) ||
    value.teacherRationale.trim().length > 1_000 ||
    value.confirmationMethod !== "teacher-confirmed" ||
    value.confirmationScope !== "observation-to-value-action-link" ||
    value.confirmedByActorKind !== "local-teacher-identity" ||
    !isUtcIso(value.confirmedAt)
  ) {
    return false;
  }

  const provenance = value.provenance;
  return (
    isObject(provenance) &&
    isRequiredText(provenance.contentPackId) &&
    isRequiredText(provenance.contentPackVersion) &&
    isRequiredText(provenance.contentReleaseId) &&
    isSha256Digest(provenance.contentManifestDigest) &&
    isRequiredText(provenance.appliedActivityTemplateId) &&
    isRequiredText(provenance.appliedValuesDesignId) &&
    provenance.appliedValuesDesignVersion === "1.0.0" &&
    isSha256Digest(provenance.appliedValuesDesignDigest)
  );
}

function isCalendarEntryRecord(value: unknown): value is CalendarEntryRecord {
  return (
    isStoredRecord(value) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.entryType === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    typeof value.status === "string" &&
    (value.note === undefined ||
      (typeof value.note === "string" && value.note.trim().length > 0)) &&
    (value.officialEventId === undefined ||
      (typeof value.officialEventId === "string" &&
        value.officialEventId.trim().length > 0)) &&
    (value.sourceUrl === undefined || typeof value.sourceUrl === "string") &&
    (value.sourceCheckedOn === undefined ||
      typeof value.sourceCheckedOn === "string") &&
    (value.academicYearId === undefined ||
      (typeof value.academicYearId === "string" &&
        UUID_PATTERN.test(value.academicYearId))) &&
    (value.classroomId === undefined ||
      (typeof value.classroomId === "string" &&
        UUID_PATTERN.test(value.classroomId))) &&
    calendarEntryFromRecord(value) !== null
  );
}

export const ENTITY_RECORD_GUARDS = {
  academicYears: isAcademicYearRecord,
  classrooms: isRepositoryClassroomRecord,
  students: isStudentRecord,
  attendanceRecords: isRepositoryAttendanceRecord,
  observations: isObservationRecord,
  observationRevisions: isStoredRecord,
  activities: isStoredRecord,
  mediaAssets: isStoredRecord,
  plans: isStoredRecord,
  calendarEntries: isCalendarEntryRecord,
  maarifReferences: isStoredRecord,
  evidenceCurriculumLinks: isStoredRecord,
  valueEvidenceLinks: isValueEvidenceLinkRecord,
  portfolioSelections: isStoredRecord,
  reportDrafts: isStoredRecord,
  externalFeedback: isStoredRecord,
  exportPackages: isStoredRecord,
  notificationRules: isStoredRecord,
  settings: isStoredRecord,
  auditLogs: isStoredRecord,
} satisfies {
  [Collection in CollectionName]: EntityRecordGuard<Collection>;
};

export function isEntityRecord<Collection extends CollectionName>(
  collection: Collection,
  value: unknown,
): value is EntityMap[Collection] {
  // Registry mapped type'i her anahtarın guard'ını aynı anahtardaki entity ile
  // eşlediğini derleme zamanında kanıtlar; dinamik indekslemede TS bu ilişkiyi
  // korumadığı için yalnız fonksiyon tipini yeniden belirtiriz.
  const guard = ENTITY_RECORD_GUARDS[collection] as EntityRecordGuard<Collection>;
  return guard(value);
}

export function assertEntityRecord<Collection extends CollectionName>(
  collection: Collection,
  value: unknown,
): asserts value is EntityMap[Collection] {
  if (!isEntityRecord(collection, value)) {
    const recordId = isObject(value) && typeof value.id === "string"
      ? `/${value.id}`
      : "";
    const domainLabel: Partial<Record<CollectionName, string>> = {
      academicYears: "eğitim yılı",
      classrooms: "sınıf",
      students: "öğrenci",
      attendanceRecords: "yoklama",
      observations: "gözlem",
      calendarEntries: "eğitim takvimi kaydı",
    };
    throw new Error(
      `${collection}${recordId} ${domainLabel[collection] ?? "domain kayıt"} sözleşmesine uymuyor.`,
    );
  }
}

export function createEmptyEntitySnapshot(): EntitySnapshot {
  return {
    academicYears: [],
    classrooms: [],
    students: [],
    attendanceRecords: [],
    observations: [],
    observationRevisions: [],
    activities: [],
    mediaAssets: [],
    plans: [],
    calendarEntries: [],
    maarifReferences: [],
    evidenceCurriculumLinks: [],
    valueEvidenceLinks: [],
    portfolioSelections: [],
    reportDrafts: [],
    externalFeedback: [],
    exportPackages: [],
    notificationRules: [],
    settings: [],
    auditLogs: [],
  };
}
