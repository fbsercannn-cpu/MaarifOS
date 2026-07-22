import type { LocalDataStore, StoredRecord } from "../../core";

export type AttendanceStatus = "present" | "late" | "absent";

export type DashboardStudent = {
  id: string;
  name: string;
  status: AttendanceStatus;
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
  observations: DashboardObservation[];
  attendanceCompleted: boolean;
};

const DASHBOARD_SETTINGS_ID = "00000000-0000-4000-9000-000000000001";
export const LEGACY_STORAGE_KEY = "maarifos-akis-pusulasi-v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const civilDateInIstanbul = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const isStatus = (value: unknown): value is AttendanceStatus =>
  value === "present" || value === "late" || value === "absent";

const studentFromRecord = (record: StoredRecord): DashboardStudent | null => {
  if (typeof record.displayName !== "string" || !isStatus(record.attendanceStatus)) return null;
  return { id: record.id, name: record.displayName, status: record.attendanceStatus };
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

export function migrateLegacyDashboardState(
  legacy: Partial<DashboardState> | null,
  fallback: DashboardState,
): DashboardState {
  const legacyStudents = Array.isArray(legacy?.students)
    ? legacy.students.filter(
        (student): student is DashboardStudent =>
          typeof student?.id === "string" &&
          typeof student?.name === "string" &&
          isStatus(student?.status),
      )
    : [];
  const migratedStudentIds = new Map(
    legacyStudents.map((student) => [
      student.id,
      UUID_PATTERN.test(student.id) ? student.id : crypto.randomUUID(),
    ]),
  );
  return {
    students: legacyStudents.length > 0
      ? legacyStudents.map((student) => ({ ...student, id: migratedStudentIds.get(student.id)! }))
      : fallback.students,
    observations: Array.isArray(legacy?.observations)
      ? legacy.observations.filter(
          (observation): observation is DashboardObservation =>
            typeof observation?.id === "string" &&
            typeof observation?.studentId === "string" &&
            typeof observation?.rawText === "string" &&
            typeof observation?.createdAtUtc === "string",
        ).map((observation) => {
          const mappedStudentId = migratedStudentIds.get(observation.studentId);
          const relationIsValid = mappedStudentId !== undefined || UUID_PATTERN.test(observation.studentId);
          return {
            ...observation,
            id: UUID_PATTERN.test(observation.id) ? observation.id : crypto.randomUUID(),
            studentId: mappedStudentId ?? (relationIsValid ? observation.studentId : crypto.randomUUID()),
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
  };
}

export async function loadDashboardState(
  store: LocalDataStore,
  fallback: DashboardState,
): Promise<DashboardState> {
  const snapshot = await store.readSnapshot();
  const storedStudents = snapshot.students
    .map(studentFromRecord)
    .filter((student): student is DashboardStudent => student !== null);

  if (storedStudents.length === 0) {
    const legacy = readLegacyState();
    const migrated = migrateLegacyDashboardState(legacy, fallback);
    await persistDashboardState(store, migrated);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return migrated;
  }

  const observations = snapshot.observations
    .map(observationFromRecord)
    .filter((observation): observation is DashboardObservation => observation !== null)
    .sort((left, right) => left.createdAtUtc.localeCompare(right.createdAtUtc));
  const settings = snapshot.settings.find((record) => record.id === DASHBOARD_SETTINGS_ID);
  return {
    students: storedStudents,
    observations,
    attendanceCompleted: settings?.attendanceCompleted === true,
  };
}

export async function persistDashboardState(
  store: LocalDataStore,
  state: DashboardState,
): Promise<void> {
  const now = new Date();
  const updatedAt = now.toISOString();
  const civilDate = civilDateInIstanbul(now);
  await store.transaction(
    "readwrite",
    ["students", "observations", "settings"],
    async (transaction) => {
      const [existingStudents, existingObservations, existingSettings] = await Promise.all([
        transaction.getAll("students"),
        transaction.getAll("observations"),
        transaction.getAll("settings"),
      ]);
      const studentCreatedAt = new Map(existingStudents.map((record) => [record.id, record.createdAt]));
      const observationCreatedAt = new Map(existingObservations.map((record) => [record.id, record.createdAt]));
      const settingCreatedAt = new Map(existingSettings.map((record) => [record.id, record.createdAt]));

      await transaction.putMany(
        "students",
        state.students.map((student) => ({
          id: student.id,
          displayName: student.name,
          attendanceStatus: student.status,
          createdAt: studentCreatedAt.get(student.id) ?? updatedAt,
          updatedAt,
          civilDate,
          deletedAt: null,
          schemaVersion: 1,
        })),
      );
      await transaction.putMany(
        "observations",
        state.observations.map((observation) => ({
          id: observation.id,
          studentIds: [observation.studentId],
          observedAt: observation.createdAtUtc,
          rawText: observation.rawText,
          ...(observation.requiresStudentReview === true ? { requiresStudentReview: true } : {}),
          ...(observation.legacyStudentId ? { legacyStudentId: observation.legacyStudentId } : {}),
          createdAt: observationCreatedAt.get(observation.id) ?? observation.createdAtUtc,
          updatedAt,
          civilDate: civilDateInIstanbul(new Date(observation.createdAtUtc)),
          deletedAt: null,
          schemaVersion: 1,
        })),
      );
      await transaction.putMany("settings", [
        {
          id: DASHBOARD_SETTINGS_ID,
          attendanceCompleted: state.attendanceCompleted,
          createdAt: settingCreatedAt.get(DASHBOARD_SETTINGS_ID) ?? updatedAt,
          updatedAt,
          civilDate,
          deletedAt: null,
          schemaVersion: 1,
        },
      ]);
    },
  );
}
