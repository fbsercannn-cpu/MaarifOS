import {
  createAttendanceEvent,
  type AttendanceEvent,
  type AttendanceEventType,
  type AttendancePartialDayPeriod,
} from "../../core/domain/attendance";

export const ATTENDANCE_EVENT_LABELS: Record<AttendanceEventType, string> = {
  check_in: "Giriş",
  check_out: "Çıkış",
  early_departure: "Erken ayrılma",
  partial_day: "Kısmi gün",
  excuse: "Mazeret",
};

export const PARTIAL_DAY_PERIOD_LABELS: Record<
  AttendancePartialDayPeriod,
  string
> = {
  morning: "Sabah",
  afternoon: "Öğleden sonra",
  custom: "Özel saat aralığı",
};

export type AttendanceEventDraft = {
  type: AttendanceEventType;
  localTime: string;
  reason: string;
  teacherNote: string;
  partialDayPeriod: AttendancePartialDayPeriod;
  fromLocalTime: string;
  toLocalTime: string;
};

export function localTimeInIstanbul(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("hour")}:${value("minute")}`;
}
export function initialAttendanceEventDraft(): AttendanceEventDraft {
  return {
    type: "check_in",
    localTime: localTimeInIstanbul(),
    reason: "",
    teacherNote: "",
    partialDayPeriod: "morning",
    fromLocalTime: "",
    toLocalTime: "",
  };
}

export type AttendanceEventDraftResult =
  | { ok: true; event: AttendanceEvent }
  | { ok: false; error: string };

/** Domain doğrulama hatasını UI sınırında tutar; persistence kuyruğuna sızdırmaz. */
export function createAttendanceEventFromDraft(
  draft: AttendanceEventDraft,
  civilDate: string,
): AttendanceEventDraftResult {
  if (draft.type === "excuse" && !draft.reason.trim()) {
    return { ok: false, error: "Mazeret kaydı için kısa bir neden yazın." };
  }
  if (
    draft.type === "partial_day" &&
    draft.partialDayPeriod === "custom" &&
    (!draft.fromLocalTime || !draft.toLocalTime)
  ) {
    return {
      ok: false,
      error: "Özel kısmi gün için başlangıç ve bitiş saatini seçin.",
    };
  }
  if (
    draft.type === "partial_day" &&
    draft.partialDayPeriod === "custom" &&
    draft.fromLocalTime >= draft.toLocalTime
  ) {
    return {
      ok: false,
      error: "Kısmi gün başlangıç saati bitiş saatinden önce olmalıdır.",
    };
  }

  try {
    return {
      ok: true,
      event: createAttendanceEvent({
        type: draft.type,
        civilDate,
        ...(draft.localTime ? { localTime: draft.localTime } : {}),
        ...(draft.reason.trim() ? { reason: draft.reason.trim() } : {}),
        ...(draft.teacherNote.trim()
          ? { teacherNote: draft.teacherNote.trim() }
          : {}),
        ...(draft.type === "partial_day"
          ? {
              partialDayPeriod: draft.partialDayPeriod,
              ...(draft.fromLocalTime
                ? { fromLocalTime: draft.fromLocalTime }
                : {}),
              ...(draft.toLocalTime
                ? { toLocalTime: draft.toLocalTime }
                : {}),
            }
          : {}),
      }),
    };
  } catch (reason) {
    return {
      ok: false,
      error:
        reason instanceof Error
          ? reason.message
          : "Yoklama ayrıntısı geçersiz.",
    };
  }
}
