import type { TeacherOwnedMonthlyPlanDraft } from "../../core/domain/teacher-owned-plan.ts";

export interface TeacherYearOutlineMonth {
  monthKey: string;
  title: string;
  purpose: string;
}

const DAY_MS = 86_400_000;

function utcDate(civilDate: string): Date {
  const [year, month, day] = civilDate.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, 12));
}

function civilDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthEnd(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return civilDate(new Date(Date.UTC(year ?? 0, month ?? 1, 0, 12)));
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(utcDate(value));
}

function monthLabel(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate(`${value}-01`));
}

function weeklyDrafts(
  month: TeacherYearOutlineMonth,
  periodStart: string,
  periodEnd: string,
): TeacherOwnedMonthlyPlanDraft["weeks"] {
  const weeks: TeacherOwnedMonthlyPlanDraft["weeks"][number][] = [];
  let cursor = periodStart;
  while (cursor <= periodEnd) {
    const start = utcDate(cursor);
    const daysUntilSunday = (7 - start.getUTCDay()) % 7;
    const candidateEnd = civilDate(
      new Date(start.getTime() + daysUntilSunday * DAY_MS),
    );
    const end = candidateEnd > periodEnd ? periodEnd : candidateEnd;
    weeks.push({
      title: `${dateLabel(cursor)} – ${dateLabel(end)} Haftası`,
      weekKey: `${cursor}_${end}`,
      periodStart: cursor,
      periodEnd: end,
      teacherContent: {
        narrative: `${month.title} odağı, sınıf gözlemleri ve çocukların güncel soruları doğrultusunda öğretmen tarafından haftalık olarak ayrıntılandırılacaktır.`,
        draftStatus: "teacher-review-required",
        sourceOutlineMonthKey: month.monthKey,
      },
    });
    cursor = civilDate(new Date(utcDate(end).getTime() + DAY_MS));
  }
  return weeks;
}

/**
 * Eylül–Haziran yıllık kütüphane omurgasını öğretmenin kalıcı plan grafiğine
 * dönüştürür. Omurga hazır başlık ve dönemleri taşır; uygulama ayrıntıları
 * açıkça öğretmen incelemesi bekleyen taslak olarak kalır.
 */
export function buildTeacherFullYearMonthDrafts(input: {
  annualPeriodStart: string;
  annualPeriodEnd: string;
  months: readonly TeacherYearOutlineMonth[];
}): readonly TeacherOwnedMonthlyPlanDraft[] {
  return input.months.flatMap((month) => {
    const rawStart = `${month.monthKey}-01`;
    const rawEnd = monthEnd(month.monthKey);
    const periodStart = rawStart < input.annualPeriodStart
      ? input.annualPeriodStart
      : rawStart;
    const periodEnd = rawEnd > input.annualPeriodEnd
      ? input.annualPeriodEnd
      : rawEnd;
    if (periodStart > periodEnd) return [];
    return [{
      title: `${monthLabel(month.monthKey)} · ${month.title}`,
      monthKey: month.monthKey,
      periodStart,
      periodEnd,
      teacherContent: {
        narrative: month.purpose,
        draftStatus: "teacher-review-required",
        sourceOutlineMonthKey: month.monthKey,
      },
      weeks: weeklyDrafts(month, periodStart, periodEnd),
    }];
  });
}
