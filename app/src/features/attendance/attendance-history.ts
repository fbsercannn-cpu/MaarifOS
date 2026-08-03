import {
  isCivilDate,
  resolveAttendanceRecords,
  type AttendanceEvent,
  type AttendanceRecord,
  type AttendanceStatus,
} from "../../core/domain/attendance.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";

export interface StudentAttendanceHistoryOptions {
  /** Sonuçlara dahil edilecek ilk sivil gün (dahil). */
  fromCivilDate?: string;
  /** Sonuçlara dahil edilecek son sivil gün (dahil). */
  toCivilDate?: string;
  /** Yeni tarihten başlayarak döndürülecek en fazla günlük kayıt. */
  limit?: number;
}

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Geldi",
  late: "Geç geldi",
  absent: "Gelmedi",
};

const partialDayLabels: Record<
  NonNullable<AttendanceEvent["partialDayPeriod"]>,
  string
> = {
  morning: "sabah",
  afternoon: "öğleden sonra",
  custom: "özel saat aralığı",
};

function validateOptions(options: StudentAttendanceHistoryOptions): void {
  if (
    options.fromCivilDate !== undefined &&
    !isCivilDate(options.fromCivilDate)
  ) {
    throw new Error("Geçmiş başlangıç tarihi YYYY-MM-DD biçiminde olmalıdır.");
  }
  if (options.toCivilDate !== undefined && !isCivilDate(options.toCivilDate)) {
    throw new Error("Geçmiş bitiş tarihi YYYY-MM-DD biçiminde olmalıdır.");
  }
  if (
    options.fromCivilDate !== undefined &&
    options.toCivilDate !== undefined &&
    options.fromCivilDate > options.toCivilDate
  ) {
    throw new Error("Geçmiş başlangıç tarihi bitiş tarihinden sonra olamaz.");
  }
  if (
    options.limit !== undefined &&
    (!Number.isSafeInteger(options.limit) || options.limit <= 0)
  ) {
    throw new Error("Geçmiş kayıt sınırı pozitif bir tam sayı olmalıdır.");
  }
}

function compareHistoryNewestFirst(
  left: AttendanceRecord,
  right: AttendanceRecord,
): number {
  return (
    right.civilDate.localeCompare(left.civilDate) ||
    right.updatedAt.localeCompare(left.updatedAt) ||
    right.createdAt.localeCompare(left.createdAt) ||
    right.id.localeCompare(left.id)
  );
}

/**
 * Aktif veya arşivdeki bir öğrencinin günlük yoklama geçmişini salt okunur biçimde yükler.
 * CS-001 mükerrerleri depoda korunur; read-model her öğrenci/gün için yalnız kanonik kaydı gösterir.
 */
export async function loadStudentAttendanceHistory(
  store: LocalDataStore,
  studentId: string,
  options: StudentAttendanceHistoryOptions = {},
): Promise<AttendanceRecord[]> {
  if (!studentId.trim()) return [];
  validateOptions(options);

  const snapshot = await store.readSnapshot();
  if (!snapshot.students.some((student) => student.id === studentId)) return [];

  const resolved = resolveAttendanceRecords(snapshot.attendanceRecords);
  const records = [...resolved.latestByKey.values()]
    .filter(
      (record) =>
        record.studentId === studentId &&
        typeof record.deletedAt !== "string" &&
        (options.fromCivilDate === undefined ||
          record.civilDate >= options.fromCivilDate) &&
        (options.toCivilDate === undefined ||
          record.civilDate <= options.toCivilDate),
    )
    .sort(compareHistoryNewestFirst);

  return options.limit === undefined ? records : records.slice(0, options.limit);
}

function eventTime(event: AttendanceEvent): string | undefined {
  return event.localTime ?? undefined;
}

function optionalReason(event: AttendanceEvent): string {
  return event.reason?.trim() ? ` (${event.reason.trim()})` : "";
}

function formatPartialDay(event: AttendanceEvent): string {
  const period = event.partialDayPeriod
    ? partialDayLabels[event.partialDayPeriod]
    : "";
  const range =
    event.fromLocalTime && event.toLocalTime
      ? `${event.fromLocalTime}–${event.toLocalTime}`
      : event.fromLocalTime ?? event.toLocalTime;
  const detail = [period, range].filter(Boolean).join(", ");
  return `Kısmi gün${detail ? ` (${detail})` : ""}${optionalReason(event)}`;
}

function formatAttendanceEvent(event: AttendanceEvent): string {
  const time = eventTime(event);
  const timeSuffix = time ? ` ${time}` : "";
  switch (event.type) {
    case "check_in":
      return `Giriş${timeSuffix}`;
    case "check_out":
      return `Çıkış${timeSuffix}`;
    case "early_departure":
      return `Erken ayrıldı${timeSuffix}${optionalReason(event)}`;
    case "partial_day":
      return formatPartialDay(event);
    case "excuse":
      return `Mazeret${timeSuffix}${optionalReason(event)}`;
  }
}

/** Öğretmen arayüzü için kaydı değiştirmeden kısa bir Türkçe günlük özet üretir. */
export function formatAttendanceHistorySummary(
  record: Pick<AttendanceRecord, "status" | "events">,
): string {
  return [
    statusLabels[record.status],
    ...(record.events ?? []).map(formatAttendanceEvent),
  ].join(" · ");
}
