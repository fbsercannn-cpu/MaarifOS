import type { StoredRecord } from "./model";

export const ATTENDANCE_SCHEMA_VERSION = 1 as const;
export const ATTENDANCE_COMPLETION_SETTING_TYPE = "attendance-day-completion" as const;

export type AttendanceStatus = "present" | "late" | "absent";

export interface AttendanceRecord extends StoredRecord {
  studentId: string;
  status: AttendanceStatus;
  _MUKERRER_INCELE?: true;
  duplicateOf?: string;
}

export interface UiAttendanceStudent {
  id: string;
  status: AttendanceStatus;
}

export interface AttendanceCompletionSetting extends StoredRecord {
  settingType: typeof ATTENDANCE_COMPLETION_SETTING_TYPE;
  attendanceCompleted: boolean;
}

export interface ResolvedAttendanceRecords {
  /** Geçerli bütün kayıtlar; mükerrerler silinmeden inceleme için işaretlenmiştir. */
  records: AttendanceRecord[];
  /** Her öğrenci ve sivil gün için updatedAt değeri en yeni olan ana kayıt. */
  latestByKey: ReadonlyMap<string, AttendanceRecord>;
  /** AttendanceRecord sözleşmesini karşılamayan ve yazılmadan incelenmesi gereken kayıtlar. */
  invalidRecords: StoredRecord[];
}

export interface AttendanceUpsertPlan {
  /** UI'daki her öğrenci için yeni ya da kimliği korunarak güncellenmiş ana kayıt. */
  upserts: AttendanceRecord[];
  /** CS-001 gereği silinmeyip işaretlenerek yeniden yazılacak mükerrer kayıtlar. */
  duplicateMarkers: AttendanceRecord[];
  /** Repository putMany işlemine verilebilecek kayıtların birleşimi. */
  recordsToPut: AttendanceRecord[];
  invalidRecords: StoredRecord[];
}

const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

export function isCivilDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = CIVIL_DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Verilen anın Europe/Istanbul takvimindeki YYYY-MM-DD karşılığı. */
export function civilDateInIstanbul(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Geçerli bir tarih gerekli.");
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return value === "present" || value === "late" || value === "absent";
}

/** Backup/restore ve repository sınırlarında kullanılabilen çalışma zamanı doğrulayıcısı. */
export function isAttendanceRecord(record: StoredRecord): record is AttendanceRecord {
  return (
    isNonEmptyString(record.id) &&
    isNonEmptyString(record.studentId) &&
    isAttendanceStatus(record.status) &&
    isUtcIso(record.createdAt) &&
    isUtcIso(record.updatedAt) &&
    isCivilDate(record.civilDate) &&
    record.schemaVersion === ATTENDANCE_SCHEMA_VERSION &&
    (record.deletedAt === undefined || record.deletedAt === null || isUtcIso(record.deletedAt)) &&
    (record._MUKERRER_INCELE === undefined || record._MUKERRER_INCELE === true) &&
    (record.duplicateOf === undefined || isNonEmptyString(record.duplicateOf))
  );
}

export function attendanceRecordKey(studentId: string, civilDate: string): string {
  return `${studentId}\u0000${civilDate}`;
}

function compareNewestFirst(left: StoredRecord, right: StoredRecord): number {
  return (
    right.updatedAt.localeCompare(left.updatedAt) ||
    right.createdAt.localeCompare(left.createdAt) ||
    right.id.localeCompare(left.id)
  );
}

/**
 * Her öğrenci/gün grubunun en güncel kaydını seçer. Diğer kayıtları silmez;
 * ana kayda bağlayarak CS-001 inceleme bayrağıyla döndürür.
 */
export function resolveAttendanceRecords(
  source: readonly StoredRecord[],
): ResolvedAttendanceRecords {
  const validRecords: AttendanceRecord[] = [];
  const invalidRecords: StoredRecord[] = [];

  for (const record of source) {
    if (isAttendanceRecord(record)) validRecords.push(record);
    else invalidRecords.push(record);
  }

  const groups = new Map<string, AttendanceRecord[]>();
  for (const record of validRecords) {
    const key = attendanceRecordKey(record.studentId, record.civilDate);
    const group = groups.get(key);
    if (group) group.push(record);
    else groups.set(key, [record]);
  }

  const latestByKey = new Map<string, AttendanceRecord>();
  const resolvedByRecord = new Map<AttendanceRecord, AttendanceRecord>();

  for (const [key, group] of groups) {
    const newestFirst = [...group].sort(compareNewestFirst);
    const latest = newestFirst[0];
    const { _MUKERRER_INCELE: _ignoredFlag, duplicateOf: _ignoredLink, ...latestFields } = latest;
    const canonical: AttendanceRecord = latestFields;
    latestByKey.set(key, canonical);
    resolvedByRecord.set(latest, canonical);

    for (const duplicate of newestFirst.slice(1)) {
      resolvedByRecord.set(duplicate, {
        ...duplicate,
        _MUKERRER_INCELE: true,
        duplicateOf: canonical.id,
      });
    }
  }

  return {
    records: validRecords.map((record) => resolvedByRecord.get(record) ?? record),
    latestByKey,
    invalidRecords,
  };
}

export function planAttendanceUpsert(options: {
  students: readonly UiAttendanceStudent[];
  existingRecords: readonly StoredRecord[];
  civilDate: string;
  now?: Date;
}): AttendanceUpsertPlan {
  if (!isCivilDate(options.civilDate)) {
    throw new Error("Yoklama tarihi YYYY-MM-DD biçiminde olmalıdır.");
  }

  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir güncelleme saati gerekli.");
  const updatedAt = now.toISOString();
  const resolved = resolveAttendanceRecords(options.existingRecords);
  const seenStudentIds = new Set<string>();

  const upserts = options.students.map((student): AttendanceRecord => {
    if (!isNonEmptyString(student.id) || !isAttendanceStatus(student.status)) {
      throw new Error("Her öğrenci geçerli bir kimlik ve yoklama durumu taşımalıdır.");
    }
    if (seenStudentIds.has(student.id)) {
      throw new Error(`UI yoklama listesinde öğrenci kimliği yineleniyor: ${student.id}`);
    }
    seenStudentIds.add(student.id);

    const existing = resolved.latestByKey.get(
      attendanceRecordKey(student.id, options.civilDate),
    );
    return {
      ...existing,
      id: existing?.id ?? crypto.randomUUID(),
      studentId: student.id,
      status: student.status,
      createdAt: existing?.createdAt ?? updatedAt,
      updatedAt,
      civilDate: options.civilDate,
      deletedAt: null,
      schemaVersion: ATTENDANCE_SCHEMA_VERSION,
    };
  });

  const duplicateMarkers = resolved.records.filter(
    (record) => record._MUKERRER_INCELE === true,
  );
  return {
    upserts,
    duplicateMarkers,
    recordsToPut: [...duplicateMarkers, ...upserts],
    invalidRecords: resolved.invalidRecords,
  };
}

export function isAttendanceCompletionSetting(
  record: StoredRecord,
): record is AttendanceCompletionSetting {
  return (
    isNonEmptyString(record.id) &&
    record.settingType === ATTENDANCE_COMPLETION_SETTING_TYPE &&
    typeof record.attendanceCompleted === "boolean" &&
    isUtcIso(record.createdAt) &&
    isUtcIso(record.updatedAt) &&
    isCivilDate(record.civilDate) &&
    record.schemaVersion === ATTENDANCE_SCHEMA_VERSION &&
    (record.deletedAt === undefined || record.deletedAt === null || isUtcIso(record.deletedAt))
  );
}

export function findAttendanceCompletionSetting(
  settings: readonly StoredRecord[],
  civilDate: string,
): AttendanceCompletionSetting | null {
  if (!isCivilDate(civilDate)) return null;
  return (
    settings
      .filter(isAttendanceCompletionSetting)
      .filter((setting) => setting.civilDate === civilDate)
      .sort(compareNewestFirst)[0] ?? null
  );
}

export function readAttendanceCompletion(
  settings: readonly StoredRecord[],
  civilDate: string,
): boolean {
  return findAttendanceCompletionSetting(settings, civilDate)?.attendanceCompleted ?? false;
}

export function createAttendanceCompletionSetting(options: {
  completed: boolean;
  civilDate: string;
  existingSettings?: readonly StoredRecord[];
  now?: Date;
}): AttendanceCompletionSetting {
  if (!isCivilDate(options.civilDate)) {
    throw new Error("Yoklama tamamlanma tarihi YYYY-MM-DD biçiminde olmalıdır.");
  }

  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir güncelleme saati gerekli.");
  const updatedAt = now.toISOString();
  const existing = findAttendanceCompletionSetting(
    options.existingSettings ?? [],
    options.civilDate,
  );

  return {
    ...existing,
    id: existing?.id ?? crypto.randomUUID(),
    settingType: ATTENDANCE_COMPLETION_SETTING_TYPE,
    attendanceCompleted: options.completed,
    createdAt: existing?.createdAt ?? updatedAt,
    updatedAt,
    civilDate: options.civilDate,
    deletedAt: null,
    schemaVersion: ATTENDANCE_SCHEMA_VERSION,
  };
}
