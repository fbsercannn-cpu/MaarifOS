import { academicYearUsesOfficialCalendar } from "../../core/domain/school-calendar.ts";
import {isClassDutyRecord} from "../../core/domain/class-duty-schedule.ts";
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

import { OFFICIAL_ACADEMIC_CALENDAR_2026_2027, type OfficialAcademicCalendarEvent, type OfficialAcademicCalendarProfile } from "../../core/domain/official-school-calendar.ts";
export * from "../../core/domain/official-school-calendar.ts";

export function academicYearMatchesCalendarProfile(
  scope: {
    academicYearId: string;
    classroomId: string;
    academicYearStart: string;
    academicYearEnd: string;
  },
  profile: OfficialAcademicCalendarProfile,
): boolean {
  return (
    scope.academicYearId.trim().length > 0 &&
    scope.classroomId.trim().length > 0 &&
    scope.academicYearStart >= profile.dataStartDate &&
    scope.academicYearStart <= profile.instructionalStartDate &&
    scope.academicYearEnd >= profile.instructionalEndDate &&
    scope.academicYearEnd <= profile.dataEndDate
  );
}

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
  return resolveAcademicCalendar(await store.readSnapshot());
}

export function resolveAcademicCalendar(
  snapshot: DataSnapshot,
): AcademicCalendarWorkspace {
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
  const officialEvents = academicYear && academicYearUsesOfficialCalendar(academicYear)
    ? OFFICIAL_ACADEMIC_CALENDAR_2026_2027.events : [];
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
      if(settings.some(record=>isClassDutyRecord(record)&&record.workflow.rows.some(row=>row.calendarEntryId===id)))throw new Error("Bu takvim günü sınıf görev çizelgesine bağlı. Meyve günü veya haftanın çocuğu çizelgesinden günü/çocuğu değiştirin.");
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
      if(settings.some(record=>isClassDutyRecord(record)&&record.workflow.rows.some(row=>row.calendarEntryId===input.id)))throw new Error("Bu takvim günü sınıf görev çizelgesine bağlı. Görevi kendi çizelgesinden iptal edin veya erteleyin.");
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
