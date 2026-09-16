import { contactAuthorityHistory } from "../teacher-followup/teacher-followup-service.ts";
import {
  attendanceRecordKey,
  civilDateInIstanbul,
  createAttendanceCompletionSetting,
  findAttendanceCompletionSetting,
  isCivilDate,
  isAttendanceStatus,
  planAttendanceUpsert,
  resolveAttendanceRecords,
  type AttendanceEvent,
  type AttendanceStatus,
} from "../../core/domain/attendance.ts";
import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../core/domain/classroom.ts";
import {
  academicYearEffectiveOperationalStart,
  academicYearOperationalStatus,
} from "../../core/domain/academic-year-operational.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import {
  normalizeStudentProfile,
  studentProfileFromRecord,
  type StudentCareDetails,
  type StudentContact,
} from "../../core/domain/student.ts";
import {
  LEGACY_ASSIGNMENT_NEEDS_REVIEW,
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import { migrateLegacyClassroomScopes } from "../../core/migrations/classroom-scope-migration.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  STUDENT_ENROLLMENT_VERSION,
  latestStudentEnrollment,
  studentEnrollments,
  type StudentEnrollment,
} from "../archive/academic-year-archive.ts";

export type { AttendanceStatus } from "../../core/domain/attendance.ts";

export type DashboardStudent = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  status: AttendanceStatus;
  /** Günün yoklama kaydı var mı; sınıf üyeliği tek başına yoklama sayılmaz. */
  attendanceMarked?: boolean;
  /** Yalnız seçili civilDate için kanonik günlük yoklama olayları. */
  events?: AttendanceEvent[];
  preferredName?: string;
  birthDate?: string;
  optionalCode?: string;
  nationalIdentityNumber?: string;
  enrollmentYear?: string;
  homeLanguages?: string;
  interests?: string;
  strengths?: string;
  supportPreferences?: string;
  contacts?: StudentContact[];
  careDetails?: StudentCareDetails;
  profilePhotoDataUrl?: string;
};

export type DashboardAttendanceCounts = {
  present: number;
  late: number;
  absent: number;
  marked: number;
  total: number;
};

export function dashboardAttendanceCounts(
  students: readonly DashboardStudent[],
): DashboardAttendanceCounts {
  const markedStudents = students.filter(
    (student) => student.attendanceMarked !== false,
  );
  const present = markedStudents.filter(
    (student) => student.status === "present",
  ).length;
  const late = markedStudents.filter((student) => student.status === "late").length;
  const absent = markedStudents.filter(
    (student) => student.status === "absent",
  ).length;
  return {
    present,
    late,
    absent,
    marked: present + late + absent,
    total: students.length,
  };
}

export type DashboardObservation = {
  id: string;
  studentId: string;
  rawText: string;
  createdAtUtc: string;
  requiresStudentReview?: boolean;
  legacyStudentId?: string;
};

export type DashboardState = {
  students: DashboardStudent[];
  archivedStudents: DashboardStudent[];
  observations: DashboardObservation[];
  attendanceCompleted: boolean;
  attendanceCivilDate: string;
};

const DASHBOARD_SETTINGS_ID = "00000000-0000-4000-9000-000000000001";
export const LEGACY_STORAGE_KEY = "maarifos-akis-pusulasi-v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const studentFromRecord = (record: StoredRecord): DashboardStudent | null => {
  const profile = studentProfileFromRecord(record);
  if (!profile) return null;
  return {
    id: record.id,
    name: profile.displayName,
    firstName: profile.firstName,
    ...(profile.lastName ? { lastName: profile.lastName } : {}),
    status: "present",
    ...(profile.preferredName ? { preferredName: profile.preferredName } : {}),
    ...(profile.birthDate ? { birthDate: profile.birthDate } : {}),
    ...(profile.optionalCode ? { optionalCode: profile.optionalCode } : {}),
    ...(profile.nationalIdentityNumber
      ? { nationalIdentityNumber: profile.nationalIdentityNumber }
      : {}),
    ...(profile.enrollmentYear
      ? { enrollmentYear: profile.enrollmentYear }
      : {}),
    ...(profile.homeLanguages
      ? { homeLanguages: profile.homeLanguages }
      : {}),
    ...(profile.interests ? { interests: profile.interests } : {}),
    ...(profile.strengths ? { strengths: profile.strengths } : {}),
    ...(profile.supportPreferences
      ? { supportPreferences: profile.supportPreferences }
      : {}),
    ...(profile.contacts ? { contacts: profile.contacts } : {}),
    ...(profile.careDetails ? { careDetails: profile.careDetails } : {}),
    ...(profile.profilePhotoDataUrl
      ? { profilePhotoDataUrl: profile.profilePhotoDataUrl }
      : {}),
  };
};

const observationFromRecord = (record: StoredRecord): DashboardObservation | null => {
  if (!Array.isArray(record.studentIds) || typeof record.studentIds[0] !== "string") return null;
  if (typeof record.rawText !== "string" || typeof record.observedAt !== "string") return null;
  return {
    id: record.id,
    studentId: record.studentIds[0],
    rawText: record.rawText,
    createdAtUtc: record.observedAt,
    ...(record.requiresStudentReview === true ? { requiresStudentReview: true } : {}),
    ...(typeof record.legacyStudentId === "string" ? { legacyStudentId: record.legacyStudentId } : {}),
  };
};

const readLegacyState = (): Partial<DashboardState> | null => {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    throw new Error("Eski cihaz verisi güvenli biçimde okunamadı; cihaz kaydı korunmuştur.");
  }
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid-legacy-root");
    }
    return parsed as Partial<DashboardState>;
  } catch {
    // Kaynak bozuksa yok sayıp silmek veri kaybıdır. İçerik veya ayrıntı
    // hataya eklenmez; açık metin kaynak yerinde bırakılır.
    throw new Error("Eski cihaz verisi doğrulanamadı; cihaz kaydı korunmuştur.");
  }
};

function removeVerifiedLegacyState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    if (window.localStorage.getItem(LEGACY_STORAGE_KEY) !== null) {
      throw new Error("Eski cihaz verisi kalıcı alandan kaldırılamadı.");
    }
  } catch {
    // Açık metin v1 gölgesinin yokluğu kanıtlanamıyorsa uygulamayı
    // fail-closed tut; normal yazmalar bu belirsizlikte yeniden açılmaz.
    throw new Error("Eski cihaz verisi kalıcı alandan kaldırılamadı.");
  }
}

function normalizedStudentVerificationView(
  student: DashboardStudent,
  currentCivilDate: string,
) {
  const profile = normalizeStudentProfile(
    {
      displayName: student.name,
      firstName: student.firstName,
      lastName: student.lastName,
      preferredName: student.preferredName,
      birthDate: student.birthDate,
      optionalCode: student.optionalCode,
      nationalIdentityNumber: student.nationalIdentityNumber,
      enrollmentYear: student.enrollmentYear,
      homeLanguages: student.homeLanguages,
      interests: student.interests,
      strengths: student.strengths,
      supportPreferences: student.supportPreferences,
      contacts: student.contacts,
      careDetails: student.careDetails,
      profilePhotoDataUrl: student.profilePhotoDataUrl,
    },
    currentCivilDate,
  );
  return {
    id: student.id,
    name: profile.displayName,
    firstName: profile.firstName,
    lastName: profile.lastName ?? null,
    preferredName: profile.preferredName ?? null,
    birthDate: profile.birthDate ?? null,
    optionalCode: profile.optionalCode ?? null,
    nationalIdentityNumber: profile.nationalIdentityNumber ?? null,
    enrollmentYear: profile.enrollmentYear ?? null,
    homeLanguages: profile.homeLanguages ?? null,
    interests: profile.interests ?? null,
    strengths: profile.strengths ?? null,
    supportPreferences: profile.supportPreferences ?? null,
    contacts: profile.contacts ?? null,
    careDetails: profile.careDetails ?? null,
    profilePhotoDataUrl: profile.profilePhotoDataUrl ?? null,
  };
}

function normalizedObservationVerificationView(
  observation: DashboardObservation,
) {
  return {
    id: observation.id,
    studentId: observation.studentId,
    rawText: observation.rawText,
    createdAtUtc: observation.createdAtUtc,
    requiresStudentReview: observation.requiresStudentReview === true,
    legacyStudentId: observation.legacyStudentId ?? null,
  };
}

function canonicalStudentProfileView(
  student: DashboardStudent,
  currentCivilDate: string,
): string {
  const view: Record<string, unknown> = {
    ...normalizedStudentVerificationView(student, currentCivilDate),
  };
  delete view.id;
  return canonicalJson(view);
}

function canonicalObservationContentView(
  observation: DashboardObservation,
): string {
  const view: Record<string, unknown> = {
    ...normalizedObservationVerificationView(observation),
  };
  delete view.id;
  return canonicalJson(view);
}

function assertLegacyArchiveCanBeImported(
  legacy: Partial<DashboardState> | null,
): void {
  if (!legacy || !("archivedStudents" in legacy)) return;
  const archivedStudents = legacy.archivedStudents;
  if (!Array.isArray(archivedStudents) || archivedStudents.length > 0) {
    // V1 arşiv kaydı mevcut migrator tarafından kayıpsız temsil edilmiyor.
    // Açık metin kaynak korunur; sessiz veri kaybı yerine hydration kapanır.
    throw new Error(
      "Eski arşiv kayıtları güvenli otomatik aktarıma uygun değil; cihaz kaydı korunmuştur.",
    );
  }
}

function isLegacyDashboardStudent(value: unknown): value is DashboardStudent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const student = value as Partial<DashboardStudent>;
  return (
    typeof student.id === "string" &&
    student.id.trim().length > 0 &&
    typeof student.name === "string" &&
    student.name.trim().length > 0 &&
    isAttendanceStatus(student.status) &&
    (student.attendanceMarked === undefined ||
      typeof student.attendanceMarked === "boolean") &&
    (student.events === undefined || Array.isArray(student.events)) &&
    !(student.attendanceMarked === false && student.events !== undefined)
  );
}

function isLegacyDashboardObservation(
  value: unknown,
): value is DashboardObservation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const observation = value as Partial<DashboardObservation>;
  const observedAt = typeof observation.createdAtUtc === "string"
    ? new Date(observation.createdAtUtc)
    : null;
  return (
    typeof observation.id === "string" &&
    observation.id.trim().length > 0 &&
    typeof observation.studentId === "string" &&
    observation.studentId.trim().length > 0 &&
    typeof observation.rawText === "string" &&
    observedAt !== null &&
    !Number.isNaN(observedAt.getTime()) &&
    (observation.requiresStudentReview === undefined ||
      typeof observation.requiresStudentReview === "boolean") &&
    (observation.legacyStudentId === undefined ||
      typeof observation.legacyStudentId === "string")
  );
}

function strictLegacyCollection<T>(
  legacy: Partial<DashboardState> | null,
  field: "students" | "observations",
  isItem: (value: unknown) => value is T,
  errorMessage: string,
): T[] | null {
  if (!legacy || !(field in legacy)) return null;
  const value: unknown = legacy[field];
  if (!Array.isArray(value) || !value.every(isItem)) {
    throw new Error(errorMessage);
  }
  return value as T[];
}

function assertUniqueLegacyIds(
  items: readonly { id: string }[],
  errorMessage: string,
): void {
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error(errorMessage);
  }
}

function legacyAttendanceContract(
  legacy: Partial<DashboardState> | null,
  fallback: DashboardState,
): {
  attendanceCivilDate: string;
  attendanceCompleted: boolean;
  hasAttendanceCompleted: boolean;
} {
  const hasLegacyAttendanceCivilDate = Boolean(
    legacy && "attendanceCivilDate" in legacy,
  );
  const legacyAttendanceCivilDate = hasLegacyAttendanceCivilDate
    ? legacy?.attendanceCivilDate
    : undefined;
  if (
    hasLegacyAttendanceCivilDate &&
    !isCivilDate(legacyAttendanceCivilDate)
  ) {
    throw new Error("Eski yoklama tarihi doğrulanamadı; cihaz kaydı korunmuştur.");
  }
  const attendanceCivilDate = isCivilDate(legacyAttendanceCivilDate)
    ? legacyAttendanceCivilDate
    : isCivilDate(fallback.attendanceCivilDate)
      ? fallback.attendanceCivilDate
      : civilDateInIstanbul(new Date());
  const hasAttendanceCompleted = Boolean(
    legacy && "attendanceCompleted" in legacy,
  );
  const attendanceCompleted = hasAttendanceCompleted
    ? legacy?.attendanceCompleted
    : fallback.attendanceCompleted;
  if (typeof attendanceCompleted !== "boolean") {
    throw new Error("Eski yoklama durumu doğrulanamadı; cihaz kaydı korunmuştur.");
  }
  return {
    attendanceCivilDate,
    attendanceCompleted,
    hasAttendanceCompleted,
  };
}

function assertLegacyImportVerified(
  snapshot: Awaited<ReturnType<LocalDataStore["readSnapshot"]>>,
  migrated: DashboardState,
  options: { verifyAttendanceCompletion: boolean },
): void {
  const studentsById = new Map(snapshot.students.map((record) => [record.id, record]));
  const observationsById = new Map(
    snapshot.observations.map((record) => [record.id, record]),
  );
  const resolvedAttendance = resolveAttendanceRecords(snapshot.attendanceRecords);
  const currentCivilDate = civilDateInIstanbul(new Date());
  for (const student of migrated.students) {
    const stored = studentsById.get(student.id);
    const verified = stored ? studentFromRecord(stored) : null;
    if (
      !verified ||
      canonicalJson(normalizedStudentVerificationView(verified, currentCivilDate)) !==
        canonicalJson(normalizedStudentVerificationView(student, currentCivilDate))
    ) {
      throw new Error("Eski öğrenci kaydı güvenli depoya doğrulanarak aktarılamadı.");
    }
    const attendance = resolvedAttendance.latestByKey.get(
      attendanceRecordKey(student.id, migrated.attendanceCivilDate),
    );
    if (student.attendanceMarked === false) {
      if (attendance && typeof attendance.deletedAt !== "string") {
        throw new Error("Eski yoklama kaydı güvenli depoya doğrulanarak aktarılamadı.");
      }
      continue;
    }
    if (
      !attendance ||
      typeof attendance.deletedAt === "string" ||
      attendance.status !== student.status ||
      (student.events !== undefined &&
        canonicalJson(attendance.events ?? []) !== canonicalJson(student.events))
    ) {
      throw new Error("Eski yoklama kaydı güvenli depoya doğrulanarak aktarılamadı.");
    }
  }
  for (const observation of migrated.observations) {
    const stored = observationsById.get(observation.id);
    const verified = stored ? observationFromRecord(stored) : null;
    if (
      !verified ||
      canonicalJson(normalizedObservationVerificationView(verified)) !==
        canonicalJson(normalizedObservationVerificationView(observation))
    ) {
      throw new Error("Eski gözlem kaydı güvenli depoya doğrulanarak aktarılamadı.");
    }
  }
  if (options.verifyAttendanceCompletion) {
    const completion = findAttendanceCompletionSetting(
      snapshot.settings,
      migrated.attendanceCivilDate,
    );
    if (
      !completion ||
      typeof completion.deletedAt === "string" ||
      completion.attendanceCompleted !== migrated.attendanceCompleted
    ) {
      throw new Error("Eski yoklama durumu güvenli depoya doğrulanarak aktarılamadı.");
    }
  }
}

function requireActiveClassroomScope(
  snapshot: Awaited<ReturnType<LocalDataStore["readSnapshot"]>>,
): ActiveClassroomScope {
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    throw new Error("Bu işlem için önce aktif sınıf ve eğitim yılı yapılandırılmalıdır.");
  }
  return scope;
}

const ROSTER_CLOSED_YEAR_ERROR =
  "Bu eğitim yılı kapatıldığı için çocuk listesi değiştirilemez. Yeni veya bugün etkin olan eğitim yılını seçin.";

function requireWritableRosterScope(
  snapshot: Pick<DataSnapshot, "academicYears" | "classrooms" | "settings">,
  currentCivilDate: string,
): ActiveClassroomScope {
  const selected = snapshot.settings.find(
    (record) =>
      record.id === ACTIVE_CLASSROOM_SETTING_ID &&
      record.settingType === ACTIVE_CLASSROOM_SETTING_TYPE &&
      typeof record.academicYearId === "string",
  );
  const selectedAcademicYear = selected
    ? snapshot.academicYears.find(
        (record) => record.id === selected.academicYearId,
      )
    : undefined;
  if (
    selectedAcademicYear &&
    (selectedAcademicYear.status === "archived" ||
      typeof selectedAcademicYear.deletedAt === "string" ||
      typeof selectedAcademicYear.closedOn === "string" ||
      typeof selectedAcademicYear.archivedAt === "string")
  ) {
    throw new Error(ROSTER_CLOSED_YEAR_ERROR);
  }

  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    throw new Error("Bu işlem için önce aktif sınıf ve eğitim yılı yapılandırılmalıdır.");
  }
  const academicYear = snapshot.academicYears.find(
    (record) =>
      record.id === scope.academicYearId &&
      typeof record.deletedAt !== "string",
  );
  if (
    !academicYear ||
    !isCivilDate(academicYear.startDate) ||
    !isCivilDate(academicYear.endDate) ||
    academicYear.startDate > academicYear.endDate ||
    (academicYear.operationalStartDate !== undefined &&
      (!isCivilDate(academicYear.operationalStartDate) ||
        academicYear.operationalStartDate > academicYear.endDate))
  ) {
    throw new Error(
      "Çocuk listesi değiştirilemedi: seçili eğitim yılının tarihleri geçerli değil.",
    );
  }
  if (academicYear.status !== undefined && academicYear.status !== "active") {
    throw new Error(ROSTER_CLOSED_YEAR_ERROR);
  }
  const operationalStatus = academicYearOperationalStatus(
    academicYear.startDate,
    academicYear.endDate,
    currentCivilDate,
    typeof academicYear.operationalStartDate === "string"
      ? academicYear.operationalStartDate
      : undefined,
  );
  if (operationalStatus === "ended") {
    throw new Error(
      `Bu eğitim yılı ${academicYear.endDate} tarihinde sona erdiği için çocuk listesi değiştirilemez. Yeni veya bugün etkin olan eğitim yılını seçin.`,
    );
  }
  return scope;
}

type EducationalWriteKind = "Yoklama" | "Gözlem";

type WritableEducationalScope = {
  scope: ActiveClassroomScope;
  effectiveStartDate: string;
  endDate: string;
};

const EDUCATIONAL_WRITE_CLOSED_YEAR_ERROR =
  "Bu eğitim yılı kapatıldığı için yoklama veya gözlem kaydedilemez. Yeni veya bugün etkin olan eğitim yılını seçin.";

function requireWritableEducationalScope(
  snapshot: Pick<DataSnapshot, "academicYears" | "classrooms" | "settings">,
  currentCivilDate: string,
): WritableEducationalScope {
  const selected = snapshot.settings.find(
    (record) =>
      record.id === ACTIVE_CLASSROOM_SETTING_ID &&
      record.settingType === ACTIVE_CLASSROOM_SETTING_TYPE &&
      typeof record.academicYearId === "string" &&
      typeof record.deletedAt !== "string",
  );
  const selectedAcademicYear = selected
    ? snapshot.academicYears.find(
        (record) => record.id === selected.academicYearId,
      )
    : undefined;
  if (
    selectedAcademicYear &&
    (selectedAcademicYear.status === "archived" ||
      typeof selectedAcademicYear.deletedAt === "string" ||
      typeof selectedAcademicYear.closedOn === "string" ||
      typeof selectedAcademicYear.archivedAt === "string")
  ) {
    throw new Error(EDUCATIONAL_WRITE_CLOSED_YEAR_ERROR);
  }

  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    throw new Error("Bu işlem için önce aktif sınıf ve eğitim yılı yapılandırılmalıdır.");
  }
  const academicYear = snapshot.academicYears.find(
    (record) =>
      record.id === scope.academicYearId &&
      typeof record.deletedAt !== "string",
  );
  if (
    !academicYear ||
    !isCivilDate(academicYear.startDate) ||
    !isCivilDate(academicYear.endDate) ||
    academicYear.startDate > academicYear.endDate ||
    (academicYear.operationalStartDate !== undefined &&
      (!isCivilDate(academicYear.operationalStartDate) ||
        academicYear.operationalStartDate > academicYear.endDate))
  ) {
    throw new Error(
      "Yoklama veya gözlem kaydedilemedi: seçili eğitim yılının tarihleri geçerli değil.",
    );
  }
  if (academicYear.status !== undefined && academicYear.status !== "active") {
    throw new Error(EDUCATIONAL_WRITE_CLOSED_YEAR_ERROR);
  }

  const operationalStatus = academicYearOperationalStatus(
    academicYear.startDate,
    academicYear.endDate,
    currentCivilDate,
    typeof academicYear.operationalStartDate === "string"
      ? academicYear.operationalStartDate
      : undefined,
  );
  if (operationalStatus === "ended") {
    throw new Error(
      `Bu eğitim yılı ${academicYear.endDate} tarihinde sona erdi. Yoklama veya gözlem için yeni veya bugün etkin olan eğitim yılını seçin.`,
    );
  }
  if (operationalStatus === "preparation") {
    throw new Error(
      `Bu eğitim yılı henüz başlamadı. Yoklama veya gözlem için eğitim yılını bugün başlatın ya da ${academicYear.startDate} tarihini bekleyin.`,
    );
  }

  return {
    scope,
    effectiveStartDate: academicYearEffectiveOperationalStart({
      startDate: academicYear.startDate,
      operationalStartDate:
        typeof academicYear.operationalStartDate === "string"
          ? academicYear.operationalStartDate
          : undefined,
    }),
    endDate: academicYear.endDate,
  };
}

function assertEducationalWriteDateInScope(
  writable: WritableEducationalScope,
  writeCivilDate: string,
  kind: EducationalWriteKind,
): void {
  if (
    !isCivilDate(writeCivilDate) ||
    writeCivilDate < writable.effectiveStartDate ||
    writeCivilDate > writable.endDate
  ) {
    throw new Error(
      `${kind} günü aktif eğitim yılının tarih aralığında olmalıdır.`,
    );
  }
}

function scopeFields(scope: ActiveClassroomScope | null): Record<string, unknown> {
  return scope
    ? {
        classroomId: scope.classroomId,
        academicYearId: scope.academicYearId,
      }
    : {
        legacyAssignmentStatus: LEGACY_ASSIGNMENT_NEEDS_REVIEW,
      };
}

function dashboardStateFromSnapshot(
  snapshot: Awaited<ReturnType<LocalDataStore["readSnapshot"]>>,
  attendanceCivilDate: string,
): DashboardState {
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    return {
      students: [],
      archivedStudents: [],
      observations: [],
      attendanceCompleted: false,
      attendanceCivilDate,
    };
  }
  const resolvedAttendance = resolveAttendanceRecords(snapshot.attendanceRecords);
  const scopedStudentRecords = snapshot.students.filter((record) =>
    recordBelongsToClassroomScope(record, scope),
  );
  const storedStudents = scopedStudentRecords
    .map((record): DashboardStudent | null => {
      const student = studentFromRecord(record);
      if (!student) return null;
      const attendance = resolvedAttendance.latestByKey.get(
        attendanceRecordKey(record.id, attendanceCivilDate),
      );
      const legacyStatus =
        record.civilDate === attendanceCivilDate && isAttendanceStatus(record.attendanceStatus)
          ? record.attendanceStatus
          : "present";
      return {
        ...student,
        status: attendance?.status ?? legacyStatus,
        ...(attendance?.events
          ? { events: structuredClone(attendance.events) }
          : {}),
        attendanceMarked: attendance !== undefined ||
          (record.civilDate === attendanceCivilDate &&
            isAttendanceStatus(record.attendanceStatus)),
      };
    })
    .filter((student): student is DashboardStudent => student !== null);
  const recordsById = new Map(scopedStudentRecords.map((record) => [record.id, record]));
  const activeStudents = storedStudents.filter(
    (student) => {
      const record = recordsById.get(student.id);
      return (
        typeof record?.deletedAt !== "string" &&
        record?.enrollmentStatus !== "left"
      );
    },
  );
  const archivedStudents = storedStudents.filter(
    (student) => {
      const record = recordsById.get(student.id);
      return (
        typeof record?.deletedAt === "string" ||
        record?.enrollmentStatus === "left"
      );
    },
  );
  const observations = snapshot.observations
    .filter((record) => recordBelongsToClassroomScope(record, scope))
    .map(observationFromRecord)
    .filter((observation): observation is DashboardObservation => observation !== null)
    .sort((left, right) => left.createdAtUtc.localeCompare(right.createdAtUtc));
  const scopedSettings = snapshot.settings.filter((record) =>
    recordBelongsToClassroomScope(record, scope),
  );
  const legacySettings = scopedSettings.find((record) => record.id === DASHBOARD_SETTINGS_ID);
  const dailyCompletion = findAttendanceCompletionSetting(
    scopedSettings,
    attendanceCivilDate,
  );
  return {
    students: activeStudents,
    archivedStudents,
    observations,
    attendanceCompleted:
      dailyCompletion?.attendanceCompleted ??
      (legacySettings?.civilDate === attendanceCivilDate && legacySettings.attendanceCompleted === true),
    attendanceCivilDate,
  };
}

async function migrateLegacyAttendanceRecords(
  store: LocalDataStore,
  snapshot: Awaited<ReturnType<LocalDataStore["readSnapshot"]>>,
) {
  const candidates = snapshot.students.filter(
    (record) => isAttendanceStatus(record.attendanceStatus) && isCivilDate(record.civilDate),
  );
  if (candidates.length === 0) return snapshot;

  await store.transaction(
    "readwrite",
    ["students", "attendanceRecords"],
    async (transaction) => {
      const [students, attendanceRecords] = await Promise.all([
        transaction.getAll("students"),
        transaction.getAll("attendanceRecords"),
      ]);
      const resolved = resolveAttendanceRecords(attendanceRecords);
      const groups = new Map<string, DashboardStudent[]>();

      for (const record of students) {
        if (!isAttendanceStatus(record.attendanceStatus) || !isCivilDate(record.civilDate)) continue;
        if (resolved.latestByKey.has(attendanceRecordKey(record.id, record.civilDate))) continue;
        const group = groups.get(record.civilDate) ?? [];
        group.push({ id: record.id, name: "", status: record.attendanceStatus });
        groups.set(record.civilDate, group);
      }

      const recordsToPut: StoredRecord[] = [];
      let workingAttendance = [...attendanceRecords];
      for (const [civilDate, legacyStudents] of groups) {
        const plan = planAttendanceUpsert({
          students: legacyStudents,
          existingRecords: workingAttendance,
          civilDate,
        });
        recordsToPut.push(...plan.recordsToPut);
        workingAttendance = [...workingAttendance, ...plan.recordsToPut];
      }
      await transaction.putMany("attendanceRecords", recordsToPut);

      await transaction.putMany(
        "students",
        students
          .filter(
            (record) => isAttendanceStatus(record.attendanceStatus) && isCivilDate(record.civilDate),
          )
          .map((record) => {
            const cleaned: Record<string, unknown> = { ...record, updatedAt: new Date().toISOString() };
            delete cleaned.attendanceStatus;
            return cleaned as StoredRecord;
          }),
      );
    },
  );
  return store.readSnapshot();
}

export function migrateLegacyDashboardState(
  legacy: Partial<DashboardState> | null,
  fallback: DashboardState,
): DashboardState {
  assertLegacyArchiveCanBeImported(legacy);
  const attendanceContract = legacyAttendanceContract(legacy, fallback);
  const legacyStudents = strictLegacyCollection(
    legacy,
    "students",
    isLegacyDashboardStudent,
    "Eski öğrenci kayıtları doğrulanamadı; cihaz kaydı korunmuştur.",
  );
  const legacyObservations = strictLegacyCollection(
    legacy,
    "observations",
    isLegacyDashboardObservation,
    "Eski gözlem kayıtları doğrulanamadı; cihaz kaydı korunmuştur.",
  );
  const studentsToMigrate = legacyStudents ?? [];
  assertUniqueLegacyIds(
    studentsToMigrate,
    "Eski öğrenci kimlikleri mükerrer; cihaz kaydı korunmuştur.",
  );
  assertUniqueLegacyIds(
    legacyObservations ?? [],
    "Eski gözlem kimlikleri mükerrer; cihaz kaydı korunmuştur.",
  );
  const migratedStudentIds = new Map(
    studentsToMigrate.map((student) => [
      student.id,
      UUID_PATTERN.test(student.id) ? student.id : crypto.randomUUID(),
    ]),
  );
  const migratedStudents = legacyStudents !== null
    ? studentsToMigrate.map((student) => ({
        ...student,
        id: migratedStudentIds.get(student.id)!,
        attendanceMarked: student.attendanceMarked !== false,
      }))
    : fallback.students;
  const migratedStudentIdSet = new Set(
    migratedStudents.map((student) => student.id),
  );
  return {
    students: migratedStudents,
    archivedStudents: fallback.archivedStudents ?? [],
    observations: legacyObservations
      ? legacyObservations.map((observation) => {
          const mappedStudentId = migratedStudentIds.get(observation.studentId);
          const resolvedStudentId =
            mappedStudentId ??
            (UUID_PATTERN.test(observation.studentId)
              ? observation.studentId
              : crypto.randomUUID());
          const relationIsValid = migratedStudentIdSet.has(resolvedStudentId);
          return {
            ...observation,
            id: UUID_PATTERN.test(observation.id) ? observation.id : crypto.randomUUID(),
            studentId: resolvedStudentId,
            ...(!relationIsValid
              ? { requiresStudentReview: true, legacyStudentId: observation.studentId }
              : {}),
          };
        })
      : fallback.observations,
    attendanceCompleted: attendanceContract.attendanceCompleted,
    attendanceCivilDate: attendanceContract.attendanceCivilDate,
  };
}

type LegacyReconciliation = {
  state: DashboardState;
  needsPersist: boolean;
  verifyAttendanceCompletion: boolean;
};

function reconcileLegacyWithPopulatedSnapshot(
  legacy: Partial<DashboardState>,
  fallback: DashboardState,
  snapshot: Awaited<ReturnType<LocalDataStore["readSnapshot"]>>,
): LegacyReconciliation {
  assertLegacyArchiveCanBeImported(legacy);
  const attendanceContract = legacyAttendanceContract(legacy, fallback);
  const legacyStudents = strictLegacyCollection(
    legacy,
    "students",
    isLegacyDashboardStudent,
    "Eski öğrenci kayıtları doğrulanamadı; cihaz kaydı korunmuştur.",
  ) ?? [];
  const legacyObservations = strictLegacyCollection(
    legacy,
    "observations",
    isLegacyDashboardObservation,
    "Eski gözlem kayıtları doğrulanamadı; cihaz kaydı korunmuştur.",
  ) ?? [];
  assertUniqueLegacyIds(
    legacyStudents,
    "Eski öğrenci kimlikleri mükerrer; cihaz kaydı korunmuştur.",
  );
  assertUniqueLegacyIds(
    legacyObservations,
    "Eski gözlem kimlikleri mükerrer; cihaz kaydı korunmuştur.",
  );

  const currentCivilDate = civilDateInIstanbul(new Date());
  const studentRecordsById = new Map(
    snapshot.students.map((record) => [record.id, record]),
  );
  const activeStudentCandidates = snapshot.students.flatMap((record) => {
    if (
      typeof record.deletedAt === "string" ||
      record.enrollmentStatus === "left"
    ) {
      return [];
    }
    const student = studentFromRecord(record);
    return student
      ? [{
          student,
          profile: canonicalStudentProfileView(student, currentCivilDate),
        }]
      : [];
  });
  const activeStudentsById = new Map(
    activeStudentCandidates.map((candidate) => [candidate.student.id, candidate]),
  );
  const mappedStudentIds = new Map<string, string>();
  const usedStudentIds = new Set<string>();
  let needsPersist = false;

  const reconciledStudents = legacyStudents.map((legacyStudent) => {
    const expectedProfile = canonicalStudentProfileView(
      legacyStudent,
      currentCivilDate,
    );
    let resolvedStudentId: string;
    if (UUID_PATTERN.test(legacyStudent.id)) {
      const existingRecord = studentRecordsById.get(legacyStudent.id);
      if (existingRecord) {
        const candidate = activeStudentsById.get(legacyStudent.id);
        if (!candidate || candidate.profile !== expectedProfile) {
          throw new Error(
            "Eski öğrenci kaydı mevcut güvenli kayıtla çelişiyor; cihaz kaydı korunmuştur.",
          );
        }
      } else {
        needsPersist = true;
      }
      resolvedStudentId = legacyStudent.id;
    } else {
      const candidates = activeStudentCandidates.filter(
        (candidate) =>
          !usedStudentIds.has(candidate.student.id) &&
          candidate.profile === expectedProfile,
      );
      if (candidates.length !== 1) {
        throw new Error(
          "Eski öğrenci kimliği güvenli kayıtla tekil eşleştirilemedi; cihaz kaydı korunmuştur.",
        );
      }
      resolvedStudentId = candidates[0].student.id;
    }
    if (usedStudentIds.has(resolvedStudentId)) {
      throw new Error(
        "Eski öğrenci ilişkisi tekil değil; cihaz kaydı korunmuştur.",
      );
    }
    usedStudentIds.add(resolvedStudentId);
    mappedStudentIds.set(legacyStudent.id, resolvedStudentId);
    return {
      ...legacyStudent,
      id: resolvedStudentId,
      attendanceMarked: legacyStudent.attendanceMarked !== false,
    };
  });

  const observationRecordsById = new Map(
    snapshot.observations.map((record) => [record.id, record]),
  );
  const observationCandidates = snapshot.observations.flatMap((record) => {
    if (typeof record.deletedAt === "string") return [];
    const observation = observationFromRecord(record);
    return observation ? [observation] : [];
  });
  const activeObservationsById = new Map(
    observationCandidates.map((observation) => [observation.id, observation]),
  );
  const usedObservationIds = new Set<string>();

  const reconciledObservations = legacyObservations.map((legacyObservation) => {
    let resolvedStudentId = mappedStudentIds.get(legacyObservation.studentId);
    if (
      !resolvedStudentId &&
      UUID_PATTERN.test(legacyObservation.studentId) &&
      activeStudentsById.has(legacyObservation.studentId)
    ) {
      resolvedStudentId = legacyObservation.studentId;
    }

    if (!resolvedStudentId) {
      const orphanCandidates = observationCandidates.filter((candidate) => {
        if (usedObservationIds.has(candidate.id)) return false;
        if (
          UUID_PATTERN.test(legacyObservation.id) &&
          candidate.id !== legacyObservation.id
        ) {
          return false;
        }
        const expected: DashboardObservation = {
          ...legacyObservation,
          id: candidate.id,
          studentId: candidate.studentId,
          requiresStudentReview: true,
          legacyStudentId: legacyObservation.studentId,
        };
        return canonicalObservationContentView(candidate) ===
          canonicalObservationContentView(expected);
      });
      if (orphanCandidates.length !== 1) {
        throw new Error(
          "Eski gözlem ilişkisi güvenli kayıtla tekil eşleştirilemedi; cihaz kaydı korunmuştur.",
        );
      }
      const candidate = orphanCandidates[0];
      usedObservationIds.add(candidate.id);
      return {
        ...legacyObservation,
        id: candidate.id,
        studentId: candidate.studentId,
        requiresStudentReview: true,
        legacyStudentId: legacyObservation.studentId,
      };
    }

    const expectedContent: DashboardObservation = {
      ...legacyObservation,
      studentId: resolvedStudentId,
    };
    let resolvedObservationId: string;
    if (UUID_PATTERN.test(legacyObservation.id)) {
      const existingRecord = observationRecordsById.get(legacyObservation.id);
      if (existingRecord) {
        const candidate = activeObservationsById.get(legacyObservation.id);
        if (
          !candidate ||
          canonicalObservationContentView(candidate) !==
            canonicalObservationContentView(expectedContent)
        ) {
          throw new Error(
            "Eski gözlem kaydı mevcut güvenli kayıtla çelişiyor; cihaz kaydı korunmuştur.",
          );
        }
      } else {
        needsPersist = true;
      }
      resolvedObservationId = legacyObservation.id;
    } else {
      const candidates = observationCandidates.filter(
        (candidate) =>
          !usedObservationIds.has(candidate.id) &&
          canonicalObservationContentView(candidate) ===
            canonicalObservationContentView(expectedContent),
      );
      if (candidates.length !== 1) {
        throw new Error(
          "Eski gözlem kimliği güvenli kayıtla tekil eşleştirilemedi; cihaz kaydı korunmuştur.",
        );
      }
      resolvedObservationId = candidates[0].id;
    }
    if (usedObservationIds.has(resolvedObservationId)) {
      throw new Error(
        "Eski gözlem ilişkisi tekil değil; cihaz kaydı korunmuştur.",
      );
    }
    usedObservationIds.add(resolvedObservationId);
    return {
      ...expectedContent,
      id: resolvedObservationId,
    };
  });

  const resolvedAttendance = resolveAttendanceRecords(snapshot.attendanceRecords);
  for (const student of reconciledStudents) {
    const attendance = resolvedAttendance.latestByKey.get(
      attendanceRecordKey(student.id, attendanceContract.attendanceCivilDate),
    );
    if (student.attendanceMarked === false) {
      if (attendance && typeof attendance.deletedAt !== "string") {
        throw new Error(
          "Eski yoklama kaydı mevcut güvenli kayıtla çelişiyor; cihaz kaydı korunmuştur.",
        );
      }
      continue;
    }
    if (!attendance) {
      needsPersist = true;
      continue;
    }
    if (
      typeof attendance.deletedAt === "string" ||
      attendance.status !== student.status ||
      (student.events !== undefined &&
        canonicalJson(attendance.events ?? []) !== canonicalJson(student.events))
    ) {
      throw new Error(
        "Eski yoklama kaydı mevcut güvenli kayıtla çelişiyor; cihaz kaydı korunmuştur.",
      );
    }
  }

  const existingCompletion = findAttendanceCompletionSetting(
    snapshot.settings,
    attendanceContract.attendanceCivilDate,
  );
  if (attendanceContract.hasAttendanceCompleted) {
    if (!existingCompletion || typeof existingCompletion.deletedAt === "string") {
      needsPersist = true;
    } else if (
      existingCompletion.attendanceCompleted !==
        attendanceContract.attendanceCompleted
    ) {
      throw new Error(
        "Eski yoklama durumu mevcut güvenli kayıtla çelişiyor; cihaz kaydı korunmuştur.",
      );
    }
  }

  return {
    state: {
      students: reconciledStudents,
      archivedStudents: [],
      observations: reconciledObservations,
      attendanceCompleted: attendanceContract.hasAttendanceCompleted
        ? attendanceContract.attendanceCompleted
        : existingCompletion?.attendanceCompleted ?? false,
      attendanceCivilDate: attendanceContract.attendanceCivilDate,
    },
    needsPersist,
    verifyAttendanceCompletion: attendanceContract.hasAttendanceCompleted,
  };
}

export async function loadDashboardState(
  store: LocalDataStore,
  fallback: DashboardState,
): Promise<DashboardState> {
  const initialSnapshot = await store.readSnapshot();
  await migrateLegacyAttendanceRecords(store, initialSnapshot);
  await migrateLegacyClassroomScopes(store);
  let snapshot = await store.readSnapshot();
  const attendanceCivilDate = isCivilDate(fallback.attendanceCivilDate)
    ? fallback.attendanceCivilDate
    : civilDateInIstanbul(new Date());

  const legacy = readLegacyState();
  if (legacy) {
    const hasPersistedDashboardContent =
      snapshot.students.length > 0 ||
      snapshot.observations.length > 0 ||
      snapshot.attendanceRecords.length > 0 ||
      snapshot.settings.some(
        (record) => typeof record.attendanceCompleted === "boolean",
      );
    if (!hasPersistedDashboardContent) {
      const attendanceContract = legacyAttendanceContract(legacy, fallback);
      const migrated = migrateLegacyDashboardState(legacy, fallback);
      const shouldPersist =
        migrated.students.length > 0 ||
        migrated.observations.length > 0 ||
        attendanceContract.hasAttendanceCompleted;
      if (shouldPersist) {
        await persistDashboardState(store, migrated);
        await migrateLegacyClassroomScopes(store);
        snapshot = await store.readSnapshot();
        assertLegacyImportVerified(snapshot, migrated, {
          verifyAttendanceCompletion: true,
        });
      }
    } else {
      const reconciliation = reconcileLegacyWithPopulatedSnapshot(
        legacy,
        fallback,
        snapshot,
      );
      if (reconciliation.needsPersist) {
        await persistDashboardState(store, reconciliation.state);
        await migrateLegacyClassroomScopes(store);
        snapshot = await store.readSnapshot();
      }
      assertLegacyImportVerified(snapshot, reconciliation.state, {
        verifyAttendanceCompletion:
          reconciliation.verifyAttendanceCompletion,
      });
    }
  }

  // V2/IndexedDB hydration ve legacy içeriğin tam kanonik karşılığı
  // doğrulanmadan tarayıcıdaki açık metin v1 gölgesine dokunulmaz.
  removeVerifiedLegacyState();

  return dashboardStateFromSnapshot(snapshot, attendanceCivilDate);
}

export async function persistStudentRosterChange(
  store: LocalDataStore,
  options: { student: DashboardStudent; archived: boolean; preserveCurrentProfile?: boolean; now?: Date },
): Promise<void> {
  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Çocuk listesi değişikliği için geçerli bir kayıt zamanı gerekli.");
  }
  const updatedAt = now.toISOString();
  const currentCivilDate = civilDateInIstanbul(now);
  await store.transaction("readwrite", [
    "academicYears",
    "classrooms",
    "settings",
    "students",
  ], async (transaction) => {
    const [academicYears, classrooms, settings, students] = await Promise.all([
      transaction.getAll("academicYears"),
      transaction.getAll("classrooms"),
      transaction.getAll("settings"),
      transaction.getAll("students"),
    ]);
    const scope = requireWritableRosterScope(
      { academicYears, classrooms, settings },
      currentCivilDate,
    );
    const existing = students.find((record) => record.id === options.student.id);
    if (options.preserveCurrentProfile && !existing) {
      throw new Error("Öğrenci kaydı değişti veya kaldırıldı; sınıf listesi yenilenmelidir.");
    }
    if (existing && !recordBelongsToClassroomScope(existing, scope)) {
      throw new Error("Başka bir sınıfa ait öğrenci bu sınıftan değiştirilemez.");
    }
    const currentProfile = options.preserveCurrentProfile && existing
      ? studentProfileFromRecord(existing)
      : null;
    if (options.preserveCurrentProfile && !currentProfile) {
      throw new Error("Öğrencinin güncel profili doğrulanamadı; mevcut kayıt korundu.");
    }
    const profile = normalizeStudentProfile(
      currentProfile ?? {
        displayName: options.student.name,
        firstName: options.student.firstName,
        lastName: options.student.lastName,
        preferredName: options.student.preferredName,
        birthDate: options.student.birthDate,
        optionalCode: options.student.optionalCode,
        nationalIdentityNumber: options.student.nationalIdentityNumber,
        enrollmentYear: options.student.enrollmentYear,
        homeLanguages: options.student.homeLanguages,
        interests: options.student.interests,
        strengths: options.student.strengths,
        supportPreferences: options.student.supportPreferences,
        contacts: options.student.contacts,
        careDetails: options.student.careDetails,
        profilePhotoDataUrl: options.student.profilePhotoDataUrl,
      },
      currentCivilDate,
    );
    const preserved: Record<string, unknown> = existing ? { ...existing } : {};
    delete preserved.attendanceStatus;
    delete preserved.legacyAssignmentStatus;
    delete preserved.firstName;
    delete preserved.lastName;
    delete preserved.preferredName;
    delete preserved.birthDate;
    delete preserved.optionalCode;
    delete preserved.nationalIdentityNumber;
    delete preserved.enrollmentYear;
    delete preserved.enrollmentDate;
    delete preserved.homeLanguages;
    delete preserved.interests;
    delete preserved.strengths;
    delete preserved.supportPreferences;
    delete preserved.contacts;
    delete preserved.careDetails;
    delete preserved.profilePhotoDataUrl;
    delete preserved.profileSchemaVersion;
    const enrollments = existing ? studentEnrollments(existing) : [];
    const matchingEnrollment = latestStudentEnrollment(enrollments, scope);
    if (options.archived && matchingEnrollment && currentCivilDate < matchingEnrollment.startedOn) {
      throw new Error("Öğrenci üyeliği başlangıcından önce bitirilemez; kayıt korundu.");
    }
    const enrollment: StudentEnrollment = {
      ...(matchingEnrollment ?? {}),
      id: matchingEnrollment?.id ?? crypto.randomUUID(),
      academicYearId: scope.academicYearId,
      classroomId: scope.classroomId,
      startedOn:
        matchingEnrollment?.startedOn ??
        (existing?.civilDate && isCivilDate(existing.civilDate)
          ? existing.civilDate
          : currentCivilDate),
      status: options.archived ? "left" : "active",
      ...(options.archived
        ? { endedOn: currentCivilDate }
        : {}),
      schemaVersion: STUDENT_ENROLLMENT_VERSION,
    };
    if (!options.archived) delete enrollment.endedOn;
    const nextEnrollments = matchingEnrollment
      ? enrollments.map((item) =>
          item.id === matchingEnrollment.id ? enrollment : item,
        )
      : [...enrollments, enrollment];
    await transaction.putMany("students", [
      {
        ...preserved,
        id: options.student.id,
        displayName: profile.displayName,
        firstName: profile.firstName,
        ...(profile.lastName ? { lastName: profile.lastName } : {}),
        ...(profile.preferredName ? { preferredName: profile.preferredName } : {}),
        ...(profile.birthDate ? { birthDate: profile.birthDate } : {}),
        ...(profile.optionalCode ? { optionalCode: profile.optionalCode } : {}),
        ...(profile.nationalIdentityNumber
          ? { nationalIdentityNumber: profile.nationalIdentityNumber }
          : {}),
        ...(profile.enrollmentYear
          ? { enrollmentYear: profile.enrollmentYear }
          : {}),
        ...(profile.homeLanguages
          ? { homeLanguages: profile.homeLanguages }
          : {}),
        ...(profile.interests ? { interests: profile.interests } : {}),
        ...(profile.strengths ? { strengths: profile.strengths } : {}),
        ...(profile.supportPreferences
          ? { supportPreferences: profile.supportPreferences }
          : {}),
        ...(profile.contacts ? { contacts: profile.contacts } : {}),
        ...(profile.careDetails ? { careDetails: profile.careDetails } : {}),
        ...(profile.profilePhotoDataUrl
          ? { profilePhotoDataUrl: profile.profilePhotoDataUrl }
          : {}),
        profileSchemaVersion: profile.profileSchemaVersion,
        active: !options.archived,
        enrollmentStatus: enrollment.status,
        enrollments: nextEnrollments,
        createdAt: existing?.createdAt ?? updatedAt,
        updatedAt,
        civilDate: existing?.civilDate ?? currentCivilDate,
        ...(typeof existing?.deletedAt === "string"
          ? { legacyRosterDeletedAt: existing.deletedAt }
          : {}),
        deletedAt: null,
        schemaVersion: Math.max(
          typeof existing?.schemaVersion === "number" ? existing.schemaVersion : 1,
          profile.profileSchemaVersion,
        ),
        ...scopeFields(scope),
      },
    ]);
    const saved = (await transaction.getAll("students")).find(r => r.id === options.student.id);
    if (saved) {
      const history = contactAuthorityHistory(existing, saved, now);
      if (history.length > 0) await transaction.putMany("settings", history);
    }
  });
}

export async function persistAttendanceUpdate(
  store: LocalDataStore,
  options: {
    students: readonly DashboardStudent[];
    attendanceCivilDate: string;
    attendanceCompleted?: boolean;
    now?: Date;
  },
): Promise<void> {
  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Yoklama için geçerli bir kayıt zamanı gerekli.");
  }
  const currentCivilDate = civilDateInIstanbul(now);
  await store.transaction("readwrite", [
    "academicYears",
    "classrooms",
    "settings",
    "students",
    "attendanceRecords",
  ], async (transaction) => {
    const [academicYears, classrooms, settings, students, existingAttendance] =
      await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("classrooms"),
        transaction.getAll("settings"),
        transaction.getAll("students"),
        transaction.getAll("attendanceRecords"),
      ]);
    const writable = requireWritableEducationalScope(
      { academicYears, classrooms, settings },
      currentCivilDate,
    );
    const studentsById = new Map(students.map((record) => [record.id, record]));
    for (const student of options.students) {
      const record = studentsById.get(student.id);
      if (!record || !recordBelongsToClassroomScope(record, writable.scope)) {
        throw new Error("Yoklama listesinde aktif sınıfa ait olmayan öğrenci bulundu.");
      }
    }
    assertEducationalWriteDateInScope(
      writable,
      options.attendanceCivilDate,
      "Yoklama",
    );
    const plan = planAttendanceUpsert({
      students: options.students,
      existingRecords: existingAttendance.filter((record) =>
        recordBelongsToClassroomScope(record, writable.scope),
      ),
      civilDate: options.attendanceCivilDate,
      now,
    });
    await transaction.putMany(
      "attendanceRecords",
      plan.recordsToPut.map((record) => ({
        ...record,
        ...scopeFields(writable.scope),
      })),
    );
    if (options.attendanceCompleted !== undefined) {
      const completion = createAttendanceCompletionSetting({
          completed: options.attendanceCompleted,
          civilDate: options.attendanceCivilDate,
          existingSettings: settings.filter((record) =>
            recordBelongsToClassroomScope(record, writable.scope),
          ),
          now,
        });
      await transaction.putMany("settings", [{
        ...completion,
        ...scopeFields(writable.scope),
      }]);
    }
  });
}

export async function persistDashboardObservation(
  store: LocalDataStore,
  observation: DashboardObservation,
  options: { now?: Date } = {},
): Promise<void> {
  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Gözlem için geçerli bir kayıt zamanı gerekli.");
  }
  const observedAt = new Date(observation.createdAtUtc);
  if (Number.isNaN(observedAt.getTime())) {
    throw new Error("Gözlem için geçerli bir gözlem zamanı gerekli.");
  }
  const timestamp = now.toISOString();
  const currentCivilDate = civilDateInIstanbul(now);
  const observedCivilDate = civilDateInIstanbul(observedAt);
  await store.transaction("readwrite", [
    "academicYears",
    "classrooms",
    "settings",
    "students",
    "observations",
  ], async (transaction) => {
    const [academicYears, classrooms, settings, students, observations] =
      await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("classrooms"),
        transaction.getAll("settings"),
        transaction.getAll("students"),
        transaction.getAll("observations"),
      ]);
    const writable = requireWritableEducationalScope(
      { academicYears, classrooms, settings },
      currentCivilDate,
    );
    const student = students.find(
      (record) => record.id === observation.studentId,
    );
    if (!student || !recordBelongsToClassroomScope(student, writable.scope)) {
      throw new Error("Gözlem yalnızca aktif sınıftaki bir öğrenciye bağlanabilir.");
    }
    const existing = observations.find(
      (record) => record.id === observation.id,
    );
    if (existing && !recordBelongsToClassroomScope(existing, writable.scope)) {
      throw new Error("Başka bir sınıfa ait gözlem bu sınıftan değiştirilemez.");
    }
    assertEducationalWriteDateInScope(writable, observedCivilDate, "Gözlem");
    if (existing?.rawTextImmutable === true) {
      const sameStudent =
        Array.isArray(existing.studentIds) &&
        existing.studentIds.length === 1 &&
        existing.studentIds[0] === observation.studentId;
      if (
        existing.rawText !== observation.rawText ||
        existing.observedAt !== observation.createdAtUtc ||
        !sameStudent
      ) {
        throw new Error("Ham gözlem değiştirilemez; düzeltme ayrı bir ek kayıt olmalıdır.");
      }
      return;
    }
    await transaction.putMany("observations", [
      {
        ...existing,
        id: observation.id,
        studentIds: [observation.studentId],
        observedAt: observation.createdAtUtc,
        rawText: observation.rawText,
        ...(observation.requiresStudentReview === true ? { requiresStudentReview: true } : {}),
        ...(observation.legacyStudentId ? { legacyStudentId: observation.legacyStudentId } : {}),
        createdAt: existing?.createdAt ?? observation.createdAtUtc,
        updatedAt: timestamp,
        civilDate: observedCivilDate,
        deletedAt: null,
        schemaVersion: 1,
        ...scopeFields(writable.scope),
      },
    ]);
  });
}

export async function persistDashboardState(
  store: LocalDataStore,
  state: DashboardState,
): Promise<void> {
  const now = new Date();
  const updatedAt = now.toISOString();
  const civilDate = state.attendanceCivilDate;
  const scope = resolveActiveClassroomScope(await store.readSnapshot());
  const studentProfiles = new Map(
    state.students.map((student) => [
      student.id,
      normalizeStudentProfile(
        {
          displayName: student.name,
          firstName: student.firstName,
          lastName: student.lastName,
          preferredName: student.preferredName,
          birthDate: student.birthDate,
          optionalCode: student.optionalCode,
          nationalIdentityNumber: student.nationalIdentityNumber,
          enrollmentYear: student.enrollmentYear,
          homeLanguages: student.homeLanguages,
          interests: student.interests,
          strengths: student.strengths,
          supportPreferences: student.supportPreferences,
          contacts: student.contacts,
          careDetails: student.careDetails,
          profilePhotoDataUrl: student.profilePhotoDataUrl,
        },
        civilDateInIstanbul(now),
      ),
    ]),
  );
  await store.transaction(
    "readwrite",
    ["students", "attendanceRecords", "observations", "settings"],
    async (transaction) => {
      const [existingStudents, existingAttendance, existingObservations, existingSettings] = await Promise.all([
        transaction.getAll("students"),
        transaction.getAll("attendanceRecords"),
        transaction.getAll("observations"),
        transaction.getAll("settings"),
      ]);
      const studentsById = new Map(existingStudents.map((record) => [record.id, record]));
      const observationsById = new Map(
        existingObservations.map((record) => [record.id, record]),
      );
      if (scope) {
        for (const student of state.students) {
          const existing = studentsById.get(student.id);
          if (existing && !recordBelongsToClassroomScope(existing, scope)) {
            throw new Error("Başka bir sınıfa ait öğrenci kimliği yeniden kullanılamaz.");
          }
        }
        for (const observation of state.observations) {
          const existing = observationsById.get(observation.id);
          if (existing && !recordBelongsToClassroomScope(existing, scope)) {
            throw new Error("Başka bir sınıfa ait gözlem kimliği yeniden kullanılamaz.");
          }
          if (
            existing?.rawTextImmutable === true &&
            (existing.rawText !== observation.rawText ||
              existing.observedAt !== observation.createdAtUtc ||
              !Array.isArray(existing.studentIds) ||
              existing.studentIds.length !== 1 ||
              existing.studentIds[0] !== observation.studentId)
          ) {
            throw new Error("Ham gözlem toplu kayıt yoluyla değiştirilemez.");
          }
        }
      }
      const attendancePlan = planAttendanceUpsert({
        students: state.students.filter(
          (student) => student.attendanceMarked !== false,
        ),
        existingRecords: scope
          ? existingAttendance.filter((record) =>
              recordBelongsToClassroomScope(record, scope),
            )
          : existingAttendance.filter(
              (record) =>
                typeof record.classroomId !== "string" &&
                typeof record.academicYearId !== "string",
            ),
        civilDate,
        now,
      });
      const completionSetting = createAttendanceCompletionSetting({
        completed: state.attendanceCompleted,
        civilDate,
        existingSettings,
        now,
      });

      await transaction.putMany(
        "students",
        state.students.map((student) => {
          const existing = studentsById.get(student.id);
          const profile = studentProfiles.get(student.id)!;
          const preserved: Record<string, unknown> = existing ? { ...existing } : {};
          delete preserved.attendanceStatus;
          delete preserved.firstName;
          delete preserved.lastName;
          delete preserved.preferredName;
          delete preserved.birthDate;
          delete preserved.optionalCode;
          delete preserved.nationalIdentityNumber;
          delete preserved.enrollmentYear;
          delete preserved.enrollmentDate;
          delete preserved.homeLanguages;
          delete preserved.interests;
          delete preserved.strengths;
          delete preserved.supportPreferences;
          delete preserved.contacts;
          delete preserved.careDetails;
          delete preserved.profilePhotoDataUrl;
          delete preserved.profileSchemaVersion;
          return {
            ...preserved,
            id: student.id,
            displayName: profile.displayName,
            firstName: profile.firstName,
            ...(profile.lastName ? { lastName: profile.lastName } : {}),
            ...(profile.preferredName
              ? { preferredName: profile.preferredName }
              : {}),
            ...(profile.birthDate ? { birthDate: profile.birthDate } : {}),
            ...(profile.optionalCode
              ? { optionalCode: profile.optionalCode }
              : {}),
            ...(profile.nationalIdentityNumber
              ? { nationalIdentityNumber: profile.nationalIdentityNumber }
              : {}),
            ...(profile.enrollmentYear
              ? { enrollmentYear: profile.enrollmentYear }
              : {}),
            ...(profile.homeLanguages
              ? { homeLanguages: profile.homeLanguages }
              : {}),
            ...(profile.interests ? { interests: profile.interests } : {}),
            ...(profile.strengths ? { strengths: profile.strengths } : {}),
            ...(profile.supportPreferences
              ? { supportPreferences: profile.supportPreferences }
              : {}),
            ...(profile.contacts ? { contacts: profile.contacts } : {}),
            ...(profile.careDetails ? { careDetails: profile.careDetails } : {}),
            ...(profile.profilePhotoDataUrl
              ? { profilePhotoDataUrl: profile.profilePhotoDataUrl }
              : {}),
            profileSchemaVersion: profile.profileSchemaVersion,
            createdAt: existing?.createdAt ?? updatedAt,
            updatedAt,
            civilDate: existing?.civilDate ?? civilDate,
            deletedAt: null,
            schemaVersion: Math.max(
              typeof existing?.schemaVersion === "number"
                ? existing.schemaVersion
                : 1,
              profile.profileSchemaVersion,
            ),
            ...scopeFields(scope),
          };
        }),
      );
      await transaction.putMany(
        "attendanceRecords",
        attendancePlan.recordsToPut.map((record) => ({
          ...record,
          ...scopeFields(scope),
        })),
      );
      await transaction.putMany(
        "observations",
        state.observations.map((observation) => {
          const existing = observationsById.get(observation.id);
          if (existing?.rawTextImmutable === true) return existing;
          return {
            id: observation.id,
            studentIds: [observation.studentId],
            observedAt: observation.createdAtUtc,
            rawText: observation.rawText,
            ...(observation.requiresStudentReview === true ? { requiresStudentReview: true } : {}),
            ...(observation.legacyStudentId ? { legacyStudentId: observation.legacyStudentId } : {}),
            createdAt: existing?.createdAt ?? observation.createdAtUtc,
            updatedAt,
            civilDate: civilDateInIstanbul(new Date(observation.createdAtUtc)),
            deletedAt: null,
            schemaVersion: 1,
            ...scopeFields(scope),
          };
        }),
      );
      await transaction.putMany("settings", [{
        ...completionSetting,
        ...scopeFields(scope),
      }]);
    },
  );
}
