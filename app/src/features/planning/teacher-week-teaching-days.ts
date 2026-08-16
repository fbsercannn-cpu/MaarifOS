import { isCivilDate } from "../../core/domain/attendance.ts";
import {
  CLASSROOM_TIME_ZONE,
  isClassroomSchedule,
  type ClassroomSchedule,
} from "../../core/domain/classroom.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import {
  MEB_2026_2027_SOURCE_CHECKED_ON,
  MEB_2026_2027_SOURCE_URL,
  OFFICIAL_ACADEMIC_CALENDAR_2026_2027,
} from "../calendar/academic-calendar.ts";
import type { TeacherOwnedWeeklyPlan } from "../../core/domain/teacher-owned-plan.ts";

const OFFICIAL_HOLIDAY_SOURCE_URL =
  "https://vakithesaplama.diyanet.gov.tr/icerik.php?icerik=159";
const OFFICIAL_HOLIDAY_SOURCE_CHECKED_ON = "2026-08-16";

interface FullDayHolidayPeriod {
  readonly id: string;
  readonly title: string;
  readonly startDate: string;
  readonly endDate: string;
}

/**
 * MEB okul çalışma takvimi semantiğini izler: 29 Ekim, 23 Nisan ve 19 Mayıs
 * tören/okul günü olarak paydada kalır. Yalnız öğretimi bütünüyle kesen yılbaşı,
 * 1 Mayıs ve tam gün dinî bayram günleri çıkarılır; arefe yarım günü kalır.
 */
export const FULL_DAY_HOLIDAYS_2026_2027: readonly FullDayHolidayPeriod[] = [
  {
    id: "new-year",
    title: "Yılbaşı tatili",
    startDate: "2027-01-01",
    endDate: "2027-01-01",
  },
  {
    id: "ramadan-feast",
    title: "Ramazan Bayramı",
    startDate: "2027-03-09",
    endDate: "2027-03-11",
  },
  {
    id: "labour-day",
    title: "Emek ve Dayanışma Günü",
    startDate: "2027-05-01",
    endDate: "2027-05-01",
  },
  {
    id: "sacrifice-feast",
    title: "Kurban Bayramı",
    startDate: "2027-05-16",
    endDate: "2027-05-19",
  },
] as const;

export interface ExplicitNoSchoolPeriod {
  readonly id: string;
  readonly title: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly sourceKind?: "external" | "teacher-local";
  readonly sourceUrl?: string;
  readonly sourceCheckedOn: string;
}

export interface TeachingDaySourceReference {
  readonly authority: string;
  readonly url: string;
  readonly checkedOn: string;
}

export type TeachingDayResolutionProvenance =
  | {
      readonly mode: "official-meb-2026-2027";
      readonly profileId: typeof OFFICIAL_ACADEMIC_CALENDAR_2026_2027.id;
      readonly instructionalPhase: "adaptation" | "term" | "no-school" | "mixed";
      readonly basis: "adaptation-and-term-weekdays-minus-breaks-and-full-day-holidays";
      readonly sources: readonly TeachingDaySourceReference[];
      readonly excludedPeriodIds: readonly string[];
    }
  | {
      readonly mode: "custom-year-weekday-fallback";
      readonly profileId: null;
      readonly basis: "monday-friday-with-explicit-no-school-periods";
      readonly sources: readonly TeachingDaySourceReference[];
      readonly excludedPeriodIds: readonly string[];
    };

export interface TeacherWeekTeachingDayResolution {
  readonly expectedCivilDates: readonly string[];
  readonly lastExpectedCivilDate: string | null;
  readonly evaluationOpensAtUtc: string | null;
  readonly scheduleEndTime: string | null;
  readonly timeZone: typeof CLASSROOM_TIME_ZONE;
  readonly provenance: TeachingDayResolutionProvenance;
}

export interface ResolveTeacherWeekTeachingDaysInput {
  readonly academicYear: Pick<
    StoredRecord,
    "id"
  > & {
    readonly name?: unknown;
    readonly startDate?: unknown;
    readonly endDate?: unknown;
  };
  readonly weekly: Pick<
    TeacherOwnedWeeklyPlan,
    "id" | "periodStart" | "periodEnd"
  >;
  readonly classroomSchedule?: unknown;
  readonly explicitNoSchoolPeriods?: readonly ExplicitNoSchoolPeriod[];
}

function dateRange(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00.000Z`);
  const endMillis = Date.parse(`${endDate}T12:00:00.000Z`);
  while (cursor.getTime() <= endMillis) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function isWeekday(civilDate: string): boolean {
  const day = new Date(`${civilDate}T12:00:00.000Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

function includesDate(
  period: { readonly startDate: string; readonly endDate: string },
  civilDate: string,
): boolean {
  return period.startDate <= civilDate && civilDate <= period.endDate;
}

function assertCivilPeriod(
  startDate: unknown,
  endDate: unknown,
  label: string,
): { readonly startDate: string; readonly endDate: string } {
  if (
    !isCivilDate(startDate) ||
    !isCivilDate(endDate) ||
    startDate > endDate
  ) {
    throw new Error(`${label} geçerli bir sivil tarih aralığı olmalıdır.`);
  }
  return { startDate, endDate };
}

function assertExplicitNoSchoolPeriods(
  periods: readonly ExplicitNoSchoolPeriod[],
): void {
  for (const [index, period] of periods.entries()) {
    assertCivilPeriod(
      period.startDate,
      period.endDate,
      `${index + 1}. okul olmayan dönem`,
    );
    if (!period.id.trim() || !period.title.trim()) {
      throw new Error("Okul olmayan dönem kimliği ve başlığı boş bırakılamaz.");
    }
    if (!isCivilDate(period.sourceCheckedOn)) {
      throw new Error("Okul olmayan dönem kaynak kontrol tarihi geçersiz.");
    }
    if (period.sourceKind === "teacher-local") {
      if (period.sourceUrl !== undefined) {
        throw new Error("Yerel okul takvimi kaydı haricî kaynak bağlantısı taşıyamaz.");
      }
      continue;
    }
    if (!period.sourceUrl) {
      throw new Error("Okul olmayan dönem güvenli bir kaynak bağlantısı taşımalıdır.");
    }
    let source: URL;
    try {
      source = new URL(period.sourceUrl);
    } catch {
      throw new Error("Okul olmayan dönem güvenli bir kaynak bağlantısı taşımalıdır.");
    }
    if (
      source.protocol !== "https:" ||
      source.username.length > 0 ||
      source.password.length > 0
    ) {
      throw new Error("Okul olmayan dönem güvenli bir kaynak bağlantısı taşımalıdır.");
    }
  }
}

function officialProfileMatches(
  academicYear: ResolveTeacherWeekTeachingDaysInput["academicYear"],
): boolean {
  return (
    academicYear.name ===
      OFFICIAL_ACADEMIC_CALENDAR_2026_2027.academicYearName &&
    typeof academicYear.startDate === "string" &&
    typeof academicYear.endDate === "string" &&
    academicYear.startDate <= "2026-09-07" &&
    academicYear.endDate >=
      OFFICIAL_ACADEMIC_CALENDAR_2026_2027.instructionalEndDate
  );
}

function scheduleEndInstant(
  civilDate: string | null,
  schedule: ClassroomSchedule | null,
): string | null {
  if (!civilDate || !schedule) return null;
  // Europe/Istanbul 2016'dan beri kalıcı UTC+03:00 kullanır. Classroom domain'i
  // başka bir saat dilimine izin vermediği için bu dönüşüm deterministiktir.
  return new Date(`${civilDate}T${schedule.endTime}:00+03:00`).toISOString();
}

export function resolveTeacherWeekTeachingDays(
  input: ResolveTeacherWeekTeachingDaysInput,
): TeacherWeekTeachingDayResolution {
  const weeklyPeriod = assertCivilPeriod(
    input.weekly.periodStart,
    input.weekly.periodEnd,
    "Haftalık plan dönemi",
  );
  const academicYearPeriod = assertCivilPeriod(
    input.academicYear.startDate,
    input.academicYear.endDate,
    "Eğitim yılı dönemi",
  );
  if (
    weeklyPeriod.startDate < academicYearPeriod.startDate ||
    weeklyPeriod.endDate > academicYearPeriod.endDate
  ) {
    throw new Error("Haftalık plan etkin eğitim yılının sınırları dışında kalamaz.");
  }

  const explicitNoSchoolPeriods = input.explicitNoSchoolPeriods ?? [];
  assertExplicitNoSchoolPeriods(explicitNoSchoolPeriods);
  const weekdays = dateRange(
    weeklyPeriod.startDate,
    weeklyPeriod.endDate,
  ).filter(isWeekday);
  const official = officialProfileMatches(input.academicYear);
  const teachingPeriods = official
    ? OFFICIAL_ACADEMIC_CALENDAR_2026_2027.events.filter(
        (event) => event.kind === "adaptation" || event.kind === "term",
      )
    : [];
  const breakPeriods = official
    ? OFFICIAL_ACADEMIC_CALENDAR_2026_2027.events.filter(
        (event) => event.kind === "break",
      )
    : [];
  const expectedCivilDates = weekdays.filter((civilDate) => {
    if (explicitNoSchoolPeriods.some((period) => includesDate(period, civilDate))) {
      return false;
    }
    if (!official) return true;
    return (
      teachingPeriods.some((period) => includesDate(period, civilDate)) &&
      !breakPeriods.some((period) => includesDate(period, civilDate)) &&
      !FULL_DAY_HOLIDAYS_2026_2027.some((period) =>
        includesDate(period, civilDate),
      )
    );
  });
  const lastExpectedCivilDate = expectedCivilDates.at(-1) ?? null;
  const schedule = isClassroomSchedule(input.classroomSchedule)
    ? input.classroomSchedule
    : null;

  const explicitSources = explicitNoSchoolPeriods.map(
    (period): TeachingDaySourceReference => ({
      authority: period.sourceKind === "teacher-local"
        ? `Öğretmenin okul takvimi · ${period.title}`
        : period.title,
      url: period.sourceKind === "teacher-local"
        ? `urn:maarifos:calendar-entry:${period.id}`
        : period.sourceUrl!,
      checkedOn: period.sourceCheckedOn,
    }),
  );
  const matchingTeachingKinds = new Set(
    teachingPeriods
      .filter((period) =>
        expectedCivilDates.some((civilDate) => includesDate(period, civilDate)),
      )
      .map((period) => period.kind),
  );
  const instructionalPhase = matchingTeachingKinds.size === 0
    ? "no-school"
    : matchingTeachingKinds.size > 1
      ? "mixed"
      : matchingTeachingKinds.has("adaptation")
        ? "adaptation"
        : "term";
  const provenance: TeachingDayResolutionProvenance = official
    ? {
        mode: "official-meb-2026-2027",
        profileId: OFFICIAL_ACADEMIC_CALENDAR_2026_2027.id,
        instructionalPhase,
        basis:
          "adaptation-and-term-weekdays-minus-breaks-and-full-day-holidays",
        sources: [
          {
            authority: "Millî Eğitim Bakanlığı",
            url: MEB_2026_2027_SOURCE_URL,
            checkedOn: MEB_2026_2027_SOURCE_CHECKED_ON,
          },
          {
            authority: "Diyanet İşleri Başkanlığı · 2027 resmî tatilleri",
            url: OFFICIAL_HOLIDAY_SOURCE_URL,
            checkedOn: OFFICIAL_HOLIDAY_SOURCE_CHECKED_ON,
          },
          ...explicitSources,
        ],
        excludedPeriodIds: [
          ...breakPeriods.map((period) => period.id),
          ...FULL_DAY_HOLIDAYS_2026_2027.map((period) => period.id),
          ...explicitNoSchoolPeriods.map((period) => period.id),
        ],
      }
    : {
        mode: "custom-year-weekday-fallback",
        profileId: null,
        basis: "monday-friday-with-explicit-no-school-periods",
        sources: [
          {
            authority: "Öğretmenin etkin eğitim yılı kaydı",
            url: `urn:maarifos:academic-year:${input.academicYear.id}`,
            checkedOn: input.weekly.periodStart,
          },
          ...explicitSources,
        ],
        excludedPeriodIds: explicitNoSchoolPeriods.map((period) => period.id),
      };

  return {
    expectedCivilDates,
    lastExpectedCivilDate,
    evaluationOpensAtUtc: scheduleEndInstant(lastExpectedCivilDate, schedule),
    scheduleEndTime: schedule?.endTime ?? null,
    timeZone: CLASSROOM_TIME_ZONE,
    provenance,
  };
}

export function localNoSchoolPeriodsFromCalendarEntries(
  records: readonly StoredRecord[],
  scope: { readonly academicYearId: string; readonly classroomId: string },
): ExplicitNoSchoolPeriod[] {
  return records
    .filter(
      (record) =>
        record.entryType === "no_school" &&
        record.status !== "cancelled" &&
        typeof record.deletedAt !== "string" &&
        record.academicYearId === scope.academicYearId &&
        record.classroomId === scope.classroomId &&
        typeof record.title === "string" &&
        isCivilDate(record.startDate) &&
        isCivilDate(record.endDate) &&
        record.startDate <= record.endDate &&
        isCivilDate(record.civilDate),
    )
    .map((record) => ({
      id: record.id,
      title: record.title as string,
      startDate: record.startDate as string,
      endDate: record.endDate as string,
      sourceKind: "teacher-local" as const,
      sourceCheckedOn: record.civilDate,
    }))
    .sort(
      (left, right) =>
        left.startDate.localeCompare(right.startDate) ||
        left.id.localeCompare(right.id),
    );
}
