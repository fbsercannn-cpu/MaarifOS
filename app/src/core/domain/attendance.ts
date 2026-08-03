import type { StoredRecord } from "./model";

export const ATTENDANCE_SCHEMA_VERSION = 1 as const;
export const ATTENDANCE_EVENT_SCHEMA_VERSION = 1 as const;
export const ATTENDANCE_COMPLETION_SETTING_TYPE = "attendance-day-completion" as const;

export type AttendanceStatus = "present" | "late" | "absent";
export type AttendanceEventType =
  | "check_in"
  | "check_out"
  | "early_departure"
  | "partial_day"
  | "excuse";
export type AttendancePartialDayPeriod = "morning" | "afternoon" | "custom";

export interface AttendanceEvent {
  id: string;
  schemaVersion: typeof ATTENDANCE_EVENT_SCHEMA_VERSION;
  type: AttendanceEventType;
  occurredAtUtc: string;
  civilDate: string;
  localTime?: string;
  reason?: string;
  teacherNote?: string;
  partialDayPeriod?: AttendancePartialDayPeriod;
  fromLocalTime?: string;
  toLocalTime?: string;
}

export interface CreateAttendanceEventOptions {
  type: AttendanceEventType;
  civilDate: string;
  localTime?: string;
  reason?: string;
  teacherNote?: string;
  partialDayPeriod?: AttendancePartialDayPeriod;
  fromLocalTime?: string;
  toLocalTime?: string;
  now?: Date;
}

export interface UpdateAttendanceEventOptions {
  type?: AttendanceEventType;
  localTime?: string | null;
  reason?: string | null;
  teacherNote?: string | null;
  partialDayPeriod?: AttendancePartialDayPeriod | null;
  fromLocalTime?: string | null;
  toLocalTime?: string | null;
}

export interface AttendanceRecord extends StoredRecord {
  studentId: string;
  status: AttendanceStatus;
  events?: AttendanceEvent[];
  _MUKERRER_INCELE?: true;
  duplicateOf?: string;
}

export interface UiAttendanceStudent {
  id: string;
  status: AttendanceStatus;
  events?: readonly AttendanceEvent[];
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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const ATTENDANCE_EVENT_KEYS = new Set([
  "id",
  "schemaVersion",
  "type",
  "occurredAtUtc",
  "civilDate",
  "localTime",
  "reason",
  "teacherNote",
  "partialDayPeriod",
  "fromLocalTime",
  "toLocalTime",
]);
const MAX_ATTENDANCE_EVENTS_PER_RECORD = 64;
const MAX_ATTENDANCE_REASON_LENGTH = 240;
const MAX_ATTENDANCE_TEACHER_NOTE_LENGTH = 2_000;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedOptionalText(
  value: unknown,
  maximumLength: number,
  label: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${label} metin olmalıdır.`);
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximumLength) {
    throw new Error(`${label} 1-${maximumLength} karakter arasında olmalıdır.`);
  }
  return normalized;
}

function isAttendanceEventType(value: unknown): value is AttendanceEventType {
  return (
    value === "check_in" ||
    value === "check_out" ||
    value === "early_departure" ||
    value === "partial_day" ||
    value === "excuse"
  );
}

function isAttendancePartialDayPeriod(
  value: unknown,
): value is AttendancePartialDayPeriod {
  return value === "morning" || value === "afternoon" || value === "custom";
}

function localTimeInIstanbul(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("hour")}:${value("minute")}`;
}

function attendanceEventValidationError(value: unknown): string | null {
  if (!isRecord(value)) return "Yoklama olayı nesne olmalıdır.";
  const unknownKeys = Object.keys(value).filter(
    (key) => !ATTENDANCE_EVENT_KEYS.has(key),
  );
  if (unknownKeys.length > 0) {
    return `Yoklama olayı tanımsız alan taşıyor: ${unknownKeys.join(", ")}`;
  }
  if (typeof value.id !== "string" || !UUID_PATTERN.test(value.id)) {
    return "Yoklama olayı geçerli bir UUID taşımalıdır.";
  }
  if (value.schemaVersion !== ATTENDANCE_EVENT_SCHEMA_VERSION) {
    return "Yoklama olayı şema sürümü desteklenmiyor.";
  }
  if (!isAttendanceEventType(value.type)) {
    return "Yoklama olayı türü geçersiz.";
  }
  if (!isUtcIso(value.occurredAtUtc)) {
    return "Yoklama olayı occurredAtUtc alanı UTC ISO biçiminde olmalıdır.";
  }
  if (!isCivilDate(value.civilDate)) {
    return "Yoklama olayı civilDate alanı YYYY-MM-DD biçiminde olmalıdır.";
  }
  if (
    value.localTime !== undefined &&
    (typeof value.localTime !== "string" || !LOCAL_TIME_PATTERN.test(value.localTime))
  ) {
    return "Yoklama olayı yerel saat alanı HH:mm biçiminde olmalıdır.";
  }
  if (
    (value.type === "check_in" ||
      value.type === "check_out" ||
      value.type === "early_departure") &&
    value.localTime === undefined
  ) {
    return "Giriş, çıkış ve erken ayrılma olaylarında yerel saat zorunludur.";
  }
  if (
    value.reason !== undefined &&
    (typeof value.reason !== "string" ||
      value.reason.trim() !== value.reason ||
      value.reason.length === 0 ||
      value.reason.length > MAX_ATTENDANCE_REASON_LENGTH)
  ) {
    return `Yoklama olayı nedeni 1-${MAX_ATTENDANCE_REASON_LENGTH} karakter arasında olmalıdır.`;
  }
  if (
    value.teacherNote !== undefined &&
    (typeof value.teacherNote !== "string" ||
      value.teacherNote.trim() !== value.teacherNote ||
      value.teacherNote.length === 0 ||
      value.teacherNote.length > MAX_ATTENDANCE_TEACHER_NOTE_LENGTH)
  ) {
    return `Yoklama olayı öğretmen notu 1-${MAX_ATTENDANCE_TEACHER_NOTE_LENGTH} karakter arasında olmalıdır.`;
  }
  if (value.type === "excuse" && value.reason === undefined) {
    return "Mazeret olayında mazeret nedeni zorunludur.";
  }

  const hasPartialFields =
    value.partialDayPeriod !== undefined ||
    value.fromLocalTime !== undefined ||
    value.toLocalTime !== undefined;
  if (value.type !== "partial_day" && hasPartialFields) {
    return "Kısmi gün alanları yalnız partial_day olayında kullanılabilir.";
  }
  if (value.type === "partial_day") {
    if (!isAttendancePartialDayPeriod(value.partialDayPeriod)) {
      return "Kısmi gün olayında dönem zorunludur.";
    }
    if (value.partialDayPeriod === "custom") {
      if (
        typeof value.fromLocalTime !== "string" ||
        !LOCAL_TIME_PATTERN.test(value.fromLocalTime) ||
        typeof value.toLocalTime !== "string" ||
        !LOCAL_TIME_PATTERN.test(value.toLocalTime) ||
        value.fromLocalTime >= value.toLocalTime
      ) {
        return "Özel kısmi gün başlangıç saati bitiş saatinden önce olmalıdır.";
      }
    } else if (value.fromLocalTime !== undefined || value.toLocalTime !== undefined) {
      return "Saat aralığı yalnız özel kısmi gün döneminde kullanılabilir.";
    }
  }
  return null;
}

export function isAttendanceEvent(value: unknown): value is AttendanceEvent {
  return attendanceEventValidationError(value) === null;
}

export function assertAttendanceEvent(
  value: unknown,
): asserts value is AttendanceEvent {
  const error = attendanceEventValidationError(value);
  if (error) throw new Error(error);
}

export function normalizeAttendanceEvent(value: unknown): AttendanceEvent {
  if (!isRecord(value)) throw new Error("Yoklama olayı nesne olmalıdır.");
  const normalized: Record<string, unknown> = {
    ...value,
    ...(value.reason === undefined
      ? {}
      : {
          reason: normalizedOptionalText(
            value.reason,
            MAX_ATTENDANCE_REASON_LENGTH,
            "Yoklama olayı nedeni",
          ),
        }),
    ...(value.teacherNote === undefined
      ? {}
      : {
          teacherNote: normalizedOptionalText(
            value.teacherNote,
            MAX_ATTENDANCE_TEACHER_NOTE_LENGTH,
            "Yoklama olayı öğretmen notu",
          ),
        }),
  };
  assertAttendanceEvent(normalized);
  return normalized as unknown as AttendanceEvent;
}

export function createAttendanceEvent(
  options: CreateAttendanceEventOptions,
): AttendanceEvent {
  if (!isCivilDate(options.civilDate)) {
    throw new Error("Yoklama olayı tarihi YYYY-MM-DD biçiminde olmalıdır.");
  }
  if (!isAttendanceEventType(options.type)) {
    throw new Error("Yoklama olayı türü geçersiz.");
  }
  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Yoklama olayı için geçerli bir audit zamanı gereklidir.");
  }
  const needsLocalTime =
    options.type === "check_in" ||
    options.type === "check_out" ||
    options.type === "early_departure";
  return normalizeAttendanceEvent({
    id: crypto.randomUUID(),
    schemaVersion: ATTENDANCE_EVENT_SCHEMA_VERSION,
    type: options.type,
    occurredAtUtc: now.toISOString(),
    civilDate: options.civilDate,
    ...(options.localTime !== undefined || needsLocalTime
      ? { localTime: options.localTime ?? localTimeInIstanbul(now) }
      : {}),
    ...(options.reason === undefined ? {} : { reason: options.reason }),
    ...(options.teacherNote === undefined
      ? {}
      : { teacherNote: options.teacherNote }),
    ...(options.partialDayPeriod === undefined
      ? {}
      : { partialDayPeriod: options.partialDayPeriod }),
    ...(options.fromLocalTime === undefined
      ? {}
      : { fromLocalTime: options.fromLocalTime }),
    ...(options.toLocalTime === undefined
      ? {}
      : { toLocalTime: options.toLocalTime }),
  });
}

export function updateAttendanceEvent(
  existing: AttendanceEvent,
  updates: UpdateAttendanceEventOptions,
): AttendanceEvent {
  assertAttendanceEvent(existing);
  const nextType = updates.type ?? existing.type;
  const optional = <T>(
    next: T | null | undefined,
    current: T | undefined,
  ): T | undefined => (next === undefined ? current : next === null ? undefined : next);
  const localTime = optional(updates.localTime, existing.localTime);
  const reason = optional(updates.reason, existing.reason);
  const teacherNote = optional(updates.teacherNote, existing.teacherNote);
  const partialDayPeriod =
    nextType === "partial_day"
      ? optional(updates.partialDayPeriod, existing.partialDayPeriod)
      : undefined;
  const fromLocalTime =
    nextType === "partial_day"
      ? optional(updates.fromLocalTime, existing.fromLocalTime)
      : undefined;
  const toLocalTime =
    nextType === "partial_day"
      ? optional(updates.toLocalTime, existing.toLocalTime)
      : undefined;
  return normalizeAttendanceEvent({
    id: existing.id,
    schemaVersion: existing.schemaVersion,
    type: nextType,
    occurredAtUtc: existing.occurredAtUtc,
    civilDate: existing.civilDate,
    ...(localTime === undefined ? {} : { localTime }),
    ...(reason === undefined ? {} : { reason }),
    ...(teacherNote === undefined ? {} : { teacherNote }),
    ...(partialDayPeriod === undefined ? {} : { partialDayPeriod }),
    ...(fromLocalTime === undefined ? {} : { fromLocalTime }),
    ...(toLocalTime === undefined ? {} : { toLocalTime }),
  });
}

export function normalizeAttendanceEvents(value: unknown): AttendanceEvent[] {
  if (!Array.isArray(value) || value.length > MAX_ATTENDANCE_EVENTS_PER_RECORD) {
    throw new Error(
      `Yoklama olayları en fazla ${MAX_ATTENDANCE_EVENTS_PER_RECORD} kayıt taşımalıdır.`,
    );
  }
  const events = value.map(normalizeAttendanceEvent);
  if (new Set(events.map((event) => event.id)).size !== events.length) {
    throw new Error("Yoklama olay zaman çizelgesinde mükerrer UUID var.");
  }
  return events;
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
    (record.events === undefined ||
      (Array.isArray(record.events) &&
        record.events.length <= MAX_ATTENDANCE_EVENTS_PER_RECORD &&
        record.events.every(isAttendanceEvent) &&
        new Set(record.events.map((event) => event.id)).size === record.events.length &&
        record.events.every((event) => event.civilDate === record.civilDate))) &&
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
    const events =
      student.events === undefined
        ? existing?.events
        : normalizeAttendanceEvents(student.events);
    if (events?.some((event) => event.civilDate !== options.civilDate)) {
      throw new Error("Yoklama olayı ile günlük yoklama tarihi uyuşmalıdır.");
    }
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
      ...(events === undefined ? {} : { events }),
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
