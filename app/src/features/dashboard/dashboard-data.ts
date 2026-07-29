import {
  attendanceRecordKey,
  civilDateInIstanbul,
  createAttendanceCompletionSetting,
  findAttendanceCompletionSetting,
  isCivilDate,
  isAttendanceStatus,
  planAttendanceUpsert,
  resolveAttendanceRecords,
  type AttendanceStatus,
} from "../../core/domain/attendance.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import {
  normalizeStudentProfile,
  studentProfileFromRecord,
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
  studentEnrollments,
  type StudentEnrollment,
} from "../archive/academic-year-archive.ts";

export type { AttendanceStatus } from "../../core/domain/attendance.ts";

export type DashboardStudent = {
  id: string;
  name: string;
  status: AttendanceStatus;
  preferredName?: string;
  birthDate?: string;
  optionalCode?: string;
  enrollmentDate?: string;
  homeLanguages?: string;
  interests?: string;
  strengths?: string;
  supportPreferences?: string;
  contacts?: StudentContact[];
  profilePhotoDataUrl?: string;
};

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
    status: "present",
    ...(profile.preferredName ? { preferredName: profile.preferredName } : {}),
    ...(profile.birthDate ? { birthDate: profile.birthDate } : {}),
    ...(profile.optionalCode ? { optionalCode: profile.optionalCode } : {}),
    ...(profile.enrollmentDate
      ? { enrollmentDate: profile.enrollmentDate }
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
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DashboardState>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

function requireActiveClassroomScope(
  snapshot: Awaited<ReturnType<LocalDataStore["readSnapshot"]>>,
): ActiveClassroomScope {
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    throw new Error("Bu işlem için önce aktif sınıf ve eğitim yılı yapılandırılmalıdır.");
  }
  return scope;
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
    .map((record) => {
      const student = studentFromRecord(record);
      if (!student) return null;
      const attendance = resolvedAttendance.latestByKey.get(
        attendanceRecordKey(record.id, attendanceCivilDate),
      );
      const legacyStatus =
        record.civilDate === attendanceCivilDate && isAttendanceStatus(record.attendanceStatus)
          ? record.attendanceStatus
          : "present";
      return { ...student, status: attendance?.status ?? legacyStatus };
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
  const legacyStudents = Array.isArray(legacy?.students)
    ? legacy.students.filter(
        (student): student is DashboardStudent =>
          typeof student?.id === "string" &&
          typeof student?.name === "string" &&
          isAttendanceStatus(student?.status),
      )
    : [];
  const migratedStudentIds = new Map(
    legacyStudents.map((student) => [
      student.id,
      UUID_PATTERN.test(student.id) ? student.id : crypto.randomUUID(),
    ]),
  );
  const migratedStudents = legacyStudents.length > 0
    ? legacyStudents.map((student) => ({
        ...student,
        id: migratedStudentIds.get(student.id)!,
      }))
    : fallback.students;
  const migratedStudentIdSet = new Set(
    migratedStudents.map((student) => student.id),
  );
  return {
    students: migratedStudents,
    archivedStudents: fallback.archivedStudents ?? [],
    observations: Array.isArray(legacy?.observations)
      ? legacy.observations.filter(
          (observation): observation is DashboardObservation =>
            typeof observation?.id === "string" &&
            typeof observation?.studentId === "string" &&
            typeof observation?.rawText === "string" &&
            typeof observation?.createdAtUtc === "string",
        ).map((observation) => {
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
    attendanceCompleted:
      typeof legacy?.attendanceCompleted === "boolean"
        ? legacy.attendanceCompleted
        : fallback.attendanceCompleted,
    attendanceCivilDate: fallback.attendanceCivilDate ?? civilDateInIstanbul(new Date()),
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
  const attendanceCivilDate = civilDateInIstanbul(new Date());

  if (snapshot.students.length === 0) {
    const legacy = readLegacyState();
    const migrated = migrateLegacyDashboardState(legacy, fallback);
    if (
      migrated.students.length > 0 ||
      migrated.observations.length > 0 ||
      migrated.attendanceCompleted
    ) {
      await persistDashboardState(store, migrated);
      await migrateLegacyClassroomScopes(store);
      snapshot = await store.readSnapshot();
    }
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Node tabanlı sözleşme testlerinde window bulunmaz.
    }
  }

  return dashboardStateFromSnapshot(snapshot, attendanceCivilDate);
}

export async function persistStudentRosterChange(
  store: LocalDataStore,
  options: { student: DashboardStudent; archived: boolean },
): Promise<void> {
  const now = new Date();
  const updatedAt = now.toISOString();
  const scope = requireActiveClassroomScope(await store.readSnapshot());
  const profile = normalizeStudentProfile(
    {
      displayName: options.student.name,
      preferredName: options.student.preferredName,
      birthDate: options.student.birthDate,
      optionalCode: options.student.optionalCode,
      enrollmentDate: options.student.enrollmentDate,
      homeLanguages: options.student.homeLanguages,
      interests: options.student.interests,
      strengths: options.student.strengths,
      supportPreferences: options.student.supportPreferences,
      contacts: options.student.contacts,
      profilePhotoDataUrl: options.student.profilePhotoDataUrl,
    },
    civilDateInIstanbul(now),
  );
  await store.transaction("readwrite", ["students"], async (transaction) => {
    const existing = (await transaction.getAll("students")).find(
      (record) => record.id === options.student.id,
    );
    if (existing && !recordBelongsToClassroomScope(existing, scope)) {
      throw new Error("Başka bir sınıfa ait öğrenci bu sınıftan değiştirilemez.");
    }
    const preserved: Record<string, unknown> = existing ? { ...existing } : {};
    delete preserved.attendanceStatus;
    delete preserved.legacyAssignmentStatus;
    delete preserved.preferredName;
    delete preserved.birthDate;
    delete preserved.optionalCode;
    delete preserved.enrollmentDate;
    delete preserved.homeLanguages;
    delete preserved.interests;
    delete preserved.strengths;
    delete preserved.supportPreferences;
    delete preserved.contacts;
    delete preserved.profilePhotoDataUrl;
    delete preserved.profileSchemaVersion;
    const enrollments = existing ? studentEnrollments(existing) : [];
    const matchingEnrollment = enrollments.find(
      (enrollment) =>
        enrollment.academicYearId === scope.academicYearId &&
        enrollment.classroomId === scope.classroomId,
    );
    const enrollment: StudentEnrollment = {
      ...(matchingEnrollment ?? {}),
      id: matchingEnrollment?.id ?? crypto.randomUUID(),
      academicYearId: scope.academicYearId,
      classroomId: scope.classroomId,
      startedOn:
        matchingEnrollment?.startedOn ??
        (existing?.civilDate && isCivilDate(existing.civilDate)
          ? existing.civilDate
          : civilDateInIstanbul(now)),
      status: options.archived ? "left" : "active",
      ...(options.archived
        ? { endedOn: civilDateInIstanbul(now) }
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
        ...(profile.preferredName ? { preferredName: profile.preferredName } : {}),
        ...(profile.birthDate ? { birthDate: profile.birthDate } : {}),
        ...(profile.optionalCode ? { optionalCode: profile.optionalCode } : {}),
        ...(profile.enrollmentDate
          ? { enrollmentDate: profile.enrollmentDate }
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
        ...(profile.profilePhotoDataUrl
          ? { profilePhotoDataUrl: profile.profilePhotoDataUrl }
          : {}),
        profileSchemaVersion: profile.profileSchemaVersion,
        active: !options.archived,
        enrollmentStatus: enrollment.status,
        enrollments: nextEnrollments,
        createdAt: existing?.createdAt ?? updatedAt,
        updatedAt,
        civilDate: existing?.civilDate ?? civilDateInIstanbul(now),
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
  });
}

export async function persistAttendanceUpdate(
  store: LocalDataStore,
  options: {
    students: readonly DashboardStudent[];
    attendanceCivilDate: string;
    attendanceCompleted?: boolean;
  },
): Promise<void> {
  const snapshot = await store.readSnapshot();
  const scope = requireActiveClassroomScope(snapshot);
  const studentsById = new Map(snapshot.students.map((record) => [record.id, record]));
  for (const student of options.students) {
    const record = studentsById.get(student.id);
    if (!record || !recordBelongsToClassroomScope(record, scope)) {
      throw new Error("Yoklama listesinde aktif sınıfa ait olmayan öğrenci bulundu.");
    }
  }
  const collections = options.attendanceCompleted === undefined
    ? (["attendanceRecords"] as const)
    : (["attendanceRecords", "settings"] as const);
  await store.transaction("readwrite", collections, async (transaction) => {
    const existingAttendance = await transaction.getAll("attendanceRecords");
    const plan = planAttendanceUpsert({
      students: options.students,
      existingRecords: existingAttendance.filter((record) =>
        recordBelongsToClassroomScope(record, scope),
      ),
      civilDate: options.attendanceCivilDate,
    });
    await transaction.putMany(
      "attendanceRecords",
      plan.recordsToPut.map((record) => ({
        ...record,
        ...scopeFields(scope),
      })),
    );
    if (options.attendanceCompleted !== undefined) {
      const existingSettings = await transaction.getAll("settings");
      const completion = createAttendanceCompletionSetting({
          completed: options.attendanceCompleted,
          civilDate: options.attendanceCivilDate,
          existingSettings: existingSettings.filter((record) =>
            recordBelongsToClassroomScope(record, scope),
          ),
        });
      await transaction.putMany("settings", [{
        ...completion,
        ...scopeFields(scope),
      }]);
    }
  });
}

export async function persistDashboardObservation(
  store: LocalDataStore,
  observation: DashboardObservation,
): Promise<void> {
  const now = new Date().toISOString();
  const scope = requireActiveClassroomScope(await store.readSnapshot());
  await store.transaction("readwrite", ["students", "observations"], async (transaction) => {
    const student = (await transaction.getAll("students")).find(
      (record) => record.id === observation.studentId,
    );
    if (!student || !recordBelongsToClassroomScope(student, scope)) {
      throw new Error("Gözlem yalnızca aktif sınıftaki bir öğrenciye bağlanabilir.");
    }
    const existing = (await transaction.getAll("observations")).find(
      (record) => record.id === observation.id,
    );
    if (existing && !recordBelongsToClassroomScope(existing, scope)) {
      throw new Error("Başka bir sınıfa ait gözlem bu sınıftan değiştirilemez.");
    }
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
        updatedAt: now,
        civilDate: civilDateInIstanbul(new Date(observation.createdAtUtc)),
        deletedAt: null,
        schemaVersion: 1,
        ...scopeFields(scope),
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
          preferredName: student.preferredName,
          birthDate: student.birthDate,
          optionalCode: student.optionalCode,
          enrollmentDate: student.enrollmentDate,
          homeLanguages: student.homeLanguages,
          interests: student.interests,
          strengths: student.strengths,
          supportPreferences: student.supportPreferences,
          contacts: student.contacts,
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
        students: state.students,
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
          delete preserved.preferredName;
          delete preserved.birthDate;
          delete preserved.optionalCode;
          delete preserved.enrollmentDate;
          delete preserved.homeLanguages;
          delete preserved.interests;
          delete preserved.strengths;
          delete preserved.supportPreferences;
          delete preserved.contacts;
          delete preserved.profilePhotoDataUrl;
          delete preserved.profileSchemaVersion;
          return {
            ...preserved,
            id: student.id,
            displayName: profile.displayName,
            ...(profile.preferredName
              ? { preferredName: profile.preferredName }
              : {}),
            ...(profile.birthDate ? { birthDate: profile.birthDate } : {}),
            ...(profile.optionalCode
              ? { optionalCode: profile.optionalCode }
              : {}),
            ...(profile.enrollmentDate
              ? { enrollmentDate: profile.enrollmentDate }
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
