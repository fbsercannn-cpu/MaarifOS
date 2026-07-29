import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import {
  CALENDAR_ENTRY_SCHEMA_VERSION,
  calendarEntryFromRecord,
  normalizeCalendarEntry,
  type CalendarEntry,
  type CalendarEntryInput,
} from "../../core/domain/calendar.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type {
  ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";

export const MEB_2026_2027_SOURCE_URL =
  "https://meb.gov.tr/2026-2027-egitim-ogretim-yili-takvimi-aciklandi/haber/41057/tr";
export const MEB_2026_2027_SOURCE_CHECKED_ON = "2026-07-29";

export interface OfficialAcademicCalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  kind:
    | "teacher_work"
    | "adaptation"
    | "term"
    | "break"
    | "year_end";
  sourceUrl: string;
  sourceCheckedOn: string;
}

export interface OfficialAcademicCalendarProfile {
  id: "meb-2026-2027";
  label: "2026–2027 MEB çalışma takvimi";
  academicYearName: "2026–2027 Eğitim Yılı";
  dataStartDate: "2026-09-01";
  dataEndDate: "2027-08-31";
  instructionalStartDate: "2026-09-14";
  instructionalEndDate: "2027-06-25";
  events: readonly OfficialAcademicCalendarEvent[];
}

const source = {
  sourceUrl: MEB_2026_2027_SOURCE_URL,
  sourceCheckedOn: MEB_2026_2027_SOURCE_CHECKED_ON,
} as const;

export const OFFICIAL_ACADEMIC_CALENDAR_2026_2027:
  OfficialAcademicCalendarProfile = {
    id: "meb-2026-2027",
    label: "2026–2027 MEB çalışma takvimi",
    academicYearName: "2026–2027 Eğitim Yılı",
    dataStartDate: "2026-09-01",
    dataEndDate: "2027-08-31",
    instructionalStartDate: "2026-09-14",
    instructionalEndDate: "2027-06-25",
    events: [
      {
        id: "teacher-work-start",
        title: "Öğretmenlerin mesleki çalışmaları başlıyor",
        startDate: "2026-09-01",
        endDate: "2026-09-01",
        kind: "teacher_work",
        ...source,
      },
      {
        id: "preschool-adaptation",
        title: "Okul öncesi uyum eğitimi",
        startDate: "2026-09-07",
        endDate: "2026-09-11",
        kind: "adaptation",
        ...source,
      },
      {
        id: "first-term",
        title: "Birinci dönem",
        startDate: "2026-09-14",
        endDate: "2027-01-22",
        kind: "term",
        ...source,
      },
      {
        id: "first-break",
        title: "Birinci dönem ara tatili",
        startDate: "2026-11-16",
        endDate: "2026-11-20",
        kind: "break",
        ...source,
      },
      {
        id: "semester-break",
        title: "Yarıyıl tatili",
        startDate: "2027-01-25",
        endDate: "2027-02-05",
        kind: "break",
        ...source,
      },
      {
        id: "second-term",
        title: "İkinci dönem",
        startDate: "2027-02-08",
        endDate: "2027-06-25",
        kind: "term",
        ...source,
      },
      {
        id: "second-break",
        title: "İkinci dönem ara tatili",
        startDate: "2027-03-08",
        endDate: "2027-03-12",
        kind: "break",
        ...source,
      },
      {
        id: "academic-year-end",
        title: "Eğitim öğretim yılı sona eriyor",
        startDate: "2027-06-25",
        endDate: "2027-06-25",
        kind: "year_end",
        ...source,
      },
    ],
  };

export interface AcademicCalendarWorkspace {
  academicYearId: string | null;
  classroomId: string | null;
  officialEvents: readonly OfficialAcademicCalendarEvent[];
  entries: CalendarEntry[];
}

function requireScope(
  snapshot: Pick<DataSnapshot, "academicYears" | "classrooms" | "settings">,
): ActiveClassroomScope {
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    throw new Error(
      "Takvim için önce etkin sınıf ve eğitim yılı yapılandırılmalıdır.",
    );
  }
  return scope;
}

function scopeFields(
  scope: ActiveClassroomScope,
): Pick<ActiveClassroomScope, "academicYearId" | "classroomId"> {
  return {
    academicYearId: scope.academicYearId,
    classroomId: scope.classroomId,
  };
}

export async function loadAcademicCalendar(
  store: LocalDataStore,
): Promise<AcademicCalendarWorkspace> {
  const snapshot = await store.readSnapshot();
  let scope;
  try {
    scope = requireScope(snapshot);
  } catch {
    return {
      academicYearId: null,
      classroomId: null,
      officialEvents: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.events,
      entries: [],
    };
  }
  const academicYear = snapshot.academicYears.find(
    (record) => record.id === scope.academicYearId,
  );
  const academicYearStart =
    typeof academicYear?.startDate === "string"
      ? academicYear.startDate
      : "";
  const academicYearEnd =
    typeof academicYear?.endDate === "string"
      ? academicYear.endDate
      : "";
  const officialEvents =
    academicYear &&
    academicYearStart <=
      OFFICIAL_ACADEMIC_CALENDAR_2026_2027.instructionalEndDate &&
    academicYearEnd >=
      OFFICIAL_ACADEMIC_CALENDAR_2026_2027.instructionalStartDate
      ? OFFICIAL_ACADEMIC_CALENDAR_2026_2027.events
      : [];
  return {
    academicYearId: scope.academicYearId,
    classroomId: scope.classroomId,
    officialEvents,
    entries: snapshot.calendarEntries
      .filter(
        (record) =>
          typeof record.deletedAt !== "string" &&
          recordBelongsToClassroomScope(record, scope),
      )
      .map(calendarEntryFromRecord)
      .filter((entry): entry is CalendarEntry => entry !== null)
      .sort(
        (left, right) =>
          left.startDate.localeCompare(right.startDate) ||
          left.title.localeCompare(right.title, "tr-TR"),
      ),
  };
}

export async function saveCalendarEntry(
  store: LocalDataStore,
  input: CalendarEntryInput & { now?: Date },
): Promise<CalendarEntry> {
  const normalized = normalizeCalendarEntry(input);
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Takvim kaydı için geçerli bir zaman gereklidir.");
  }
  const timestamp = now.toISOString();
  let result: CalendarEntry | null = null;
  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "calendarEntries"],
    async (transaction) => {
      const [academicYears, classrooms, settings, entries] =
        await Promise.all([
          transaction.getAll("academicYears"),
          transaction.getAll("classrooms"),
          transaction.getAll("settings"),
          transaction.getAll("calendarEntries"),
        ]);
      const scope = requireScope({
        academicYears,
        classrooms,
        settings,
      });
      const academicYear = academicYears.find(
        (record) => record.id === scope.academicYearId,
      );
      if (
        !academicYear ||
        typeof academicYear.startDate !== "string" ||
        typeof academicYear.endDate !== "string" ||
        normalized.startDate < academicYear.startDate ||
        normalized.endDate > academicYear.endDate
      ) {
        throw new Error(
          "Takvim kaydı aktif eğitim yılının tarih aralığında olmalıdır.",
        );
      }
      const id = input.id ?? crypto.randomUUID();
      const existing = entries.find((record) => record.id === id);
      if (
        existing &&
        !recordBelongsToClassroomScope(existing, scope)
      ) {
        throw new Error("Başka bir sınıfa ait takvim kaydı değiştirilemez.");
      }
      const record = {
        ...(existing ?? {}),
        id,
        ...normalized,
        ...scopeFields(scope),
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        civilDate: existing?.civilDate ?? civilDateInIstanbul(now),
        deletedAt: null,
        schemaVersion: CALENDAR_ENTRY_SCHEMA_VERSION,
      };
      await transaction.putMany("calendarEntries", [record]);
      result = { id, ...normalized };
    },
  );
  if (!result) throw new Error("Takvim kaydı oluşturulamadı.");
  return result;
}

export async function removeCalendarEntry(
  store: LocalDataStore,
  input: { id: string; now?: Date },
): Promise<void> {
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Takvim kaydı için geçerli bir zaman gereklidir.");
  }
  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "calendarEntries"],
    async (transaction) => {
      const [academicYears, classrooms, settings, entries] =
        await Promise.all([
          transaction.getAll("academicYears"),
          transaction.getAll("classrooms"),
          transaction.getAll("settings"),
          transaction.getAll("calendarEntries"),
        ]);
      const scope = requireScope({
        academicYears,
        classrooms,
        settings,
      });
      const existing = entries.find(
        (record) =>
          record.id === input.id &&
          typeof record.deletedAt !== "string" &&
          recordBelongsToClassroomScope(record, scope),
      );
      if (!existing) throw new Error("Silinecek takvim kaydı bulunamadı.");
      await transaction.putMany("calendarEntries", [
        {
          ...existing,
          updatedAt: now.toISOString(),
          deletedAt: now.toISOString(),
        },
      ]);
    },
  );
}

export function officialEventsOnDate(
  events: readonly OfficialAcademicCalendarEvent[],
  civilDate: string,
): OfficialAcademicCalendarEvent[] {
  return events.filter(
    (event) =>
      event.startDate <= civilDate && event.endDate >= civilDate,
  );
}
