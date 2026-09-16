import { isCivilDate } from "./attendance.ts";
import type { StoredRecord } from "./model.ts";

export const CALENDAR_ENTRY_SCHEMA_VERSION = 1 as const;

export const CALENDAR_ENTRY_TYPES = [
  "general_note",
  "parent_meeting",
  "fruit_day",
  "activity",
  "adaptation_day",
  "no_school",
  "official_marker",
] as const;

export type CalendarEntryType = (typeof CALENDAR_ENTRY_TYPES)[number];

export const CALENDAR_ENTRY_STATUSES = [
  "planned",
  "completed",
  "cancelled",
] as const;

export type CalendarEntryStatus =
  (typeof CALENDAR_ENTRY_STATUSES)[number];

export interface CalendarEntryInput {
  id?: string;
  title: string;
  note?: string;
  entryType: CalendarEntryType;
  startDate: string;
  endDate?: string;
  status?: CalendarEntryStatus;
  officialEventId?: string;
  sourceUrl?: string;
  sourceCheckedOn?: string;
}

export interface CalendarEntry {
  id: string;
  title: string;
  note?: string;
  entryType: CalendarEntryType;
  startDate: string;
  endDate: string;
  status: CalendarEntryStatus;
  officialEventId?: string;
  sourceUrl?: string;
  sourceCheckedOn?: string;
}

function optionalText(
  value: string | undefined,
  label: string,
  maximumLength: number,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > maximumLength) {
    throw new Error(`${label} ${maximumLength} karakterden uzun olamaz.`);
  }
  return trimmed;
}

export function normalizeCalendarEntry(
  input: CalendarEntryInput,
): Omit<CalendarEntry, "id"> {
  const title = optionalText(input.title, "Takvim başlığı", 160);
  if (!title) throw new Error("Takvim başlığı boş bırakılamaz.");
  if (!CALENDAR_ENTRY_TYPES.includes(input.entryType)) {
    throw new Error("Takvim kayıt türü geçersiz.");
  }
  const status = input.status ?? "planned";
  if (!CALENDAR_ENTRY_STATUSES.includes(status)) {
    throw new Error("Takvim kayıt durumu geçersiz.");
  }
  const endDate = input.endDate ?? input.startDate;
  if (!isCivilDate(input.startDate) || !isCivilDate(endDate)) {
    throw new Error("Takvim tarihleri YYYY-AA-GG biçiminde olmalıdır.");
  }
  if (input.startDate > endDate) {
    throw new Error("Takvim bitiş tarihi başlangıçtan önce olamaz.");
  }
  const note = optionalText(input.note, "Takvim notu", 5_000);
  const officialEventId = optionalText(
    input.officialEventId,
    "Resmî takvim kaydı",
    120,
  );
  const sourceUrl = optionalText(input.sourceUrl, "Kaynak bağlantısı", 2_048);
  if (sourceUrl) {
    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      throw new Error("Takvim kaynak bağlantısı geçersiz.");
    }
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error("Takvim kaynak bağlantısı güvenli HTTPS olmalıdır.");
    }
  }
  if (
    input.sourceCheckedOn !== undefined &&
    !isCivilDate(input.sourceCheckedOn)
  ) {
    throw new Error("Takvim kaynak kontrol tarihi YYYY-AA-GG olmalıdır.");
  }
  return {
    title,
    ...(note ? { note } : {}),
    entryType: input.entryType,
    startDate: input.startDate,
    endDate,
    status,
    ...(officialEventId ? { officialEventId } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(input.sourceCheckedOn
      ? { sourceCheckedOn: input.sourceCheckedOn }
      : {}),
  };
}

export function calendarEntryFromRecord(
  record: StoredRecord,
): CalendarEntry | null {
  try {
    const normalized = normalizeCalendarEntry({
      title: typeof record.title === "string" ? record.title : "",
      note: typeof record.note === "string" ? record.note : undefined,
      entryType: record.entryType as CalendarEntryType,
      startDate:
        typeof record.startDate === "string" ? record.startDate : "",
      endDate: typeof record.endDate === "string" ? record.endDate : undefined,
      status: record.status as CalendarEntryStatus,
      officialEventId:
        typeof record.officialEventId === "string"
          ? record.officialEventId
          : undefined,
      sourceUrl:
        typeof record.sourceUrl === "string" ? record.sourceUrl : undefined,
      sourceCheckedOn:
        typeof record.sourceCheckedOn === "string"
          ? record.sourceCheckedOn
          : undefined,
    });
    return { id: record.id, ...normalized };
  } catch {
    return null;
  }
}

