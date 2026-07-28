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

function assertStoredRecord(value: unknown, collection: CollectionName): asserts value is StoredRecord {
  if (!isRecord(value)) {
    throw new Error(`${collection} koleksiyonunda geçersiz kayıt bulundu.`);
  }
  if (typeof value.id !== "string" || !UUID_PATTERN.test(value.id)) {
    throw new Error(`${collection} koleksiyonunda geçersiz UUID bulundu.`);
  }
  if (typeof value.createdAt !== "string" || !UTC_ISO_PATTERN.test(value.createdAt)) {
    throw new Error(`${collection}/${value.id} createdAt UTC ISO biçiminde değil.`);
  }
  if (typeof value.updatedAt !== "string" || !UTC_ISO_PATTERN.test(value.updatedAt)) {
    throw new Error(`${collection}/${value.id} updatedAt UTC ISO biçiminde değil.`);
  }
  if (typeof value.civilDate !== "string" || !CIVIL_DATE_PATTERN.test(value.civilDate)) {
    throw new Error(`${collection}/${value.id} civilDate YYYY-MM-DD biçiminde değil.`);
  }
  if (!Number.isInteger(value.schemaVersion) || (value.schemaVersion as number) < 1) {
    throw new Error(`${collection}/${value.id} schemaVersion geçersiz.`);
  }
  if (
    value.deletedAt !== undefined &&
    value.deletedAt !== null &&
    (typeof value.deletedAt !== "string" || !UTC_ISO_PATTERN.test(value.deletedAt))
  ) {
    throw new Error(`${collection}/${value.id} deletedAt UTC ISO biçiminde değil.`);
  }
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
    if (
      typeof enrollment.id !== "string" ||
      !UUID_PATTERN.test(enrollment.id) ||
      typeof enrollment.classroomId !== "string" ||
      !UUID_PATTERN.test(enrollment.classroomId) ||
      typeof enrollment.academicYearId !== "string" ||
      !UUID_PATTERN.test(enrollment.academicYearId) ||
      typeof enrollment.startedOn !== "string" ||
      !CIVIL_DATE_PATTERN.test(enrollment.startedOn) ||
      (enrollment.endedOn !== undefined &&
        (typeof enrollment.endedOn !== "string" ||
          !CIVIL_DATE_PATTERN.test(enrollment.endedOn))) ||
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
  if (!isRecord(value) || !isRecord(value.manifest) || !isRecord(value.payload)) {
    throw new Error("Yedek zarfı veya manifest eksik.");
  }
  const manifest = value.manifest;
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
  if (typeof manifest.createdAt !== "string" || !UTC_ISO_PATTERN.test(manifest.createdAt)) {
    throw new Error("Yedek oluşturma zamanı UTC ISO biçiminde değil.");
  }
  if (typeof manifest.civilDate !== "string" || !CIVIL_DATE_PATTERN.test(manifest.civilDate)) {
    throw new Error("Yedek takvim günü YYYY-MM-DD biçiminde değil.");
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
  const unknownCollections = payloadKeys.filter(
    (key) => !COLLECTION_NAMES.includes(key as CollectionName),
  );
  if (unknownCollections.length > 0) {
    throw new Error(`Yedekte bilinmeyen koleksiyon var: ${unknownCollections.join(", ")}`);
  }

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
              typeof target.sourceUrl === "string" &&
              target.sourceUrl.trim().length > 0 &&
              typeof target.sourceCheckedOn === "string" &&
              CIVIL_DATE_PATTERN.test(target.sourceCheckedOn) &&
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
          new Set(observationCategories).size !== observationCategories.length))
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
      typeof link.confirmedAt !== "string" ||
      !UTC_ISO_PATTERN.test(link.confirmedAt) ||
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
    if (draft.reportType !== "evidence-assessment") continue;
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

  for (const setting of payload.settings) {
    if (setting.settingType === QUICK_OBSERVATION_DRAFT_SETTING_TYPE) {
      if (!isQuickObservationDraftRecord(setting)) {
        throw new Error(`settings/${setting.id} hızlı gözlem taslağı geçersiz.`);
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
