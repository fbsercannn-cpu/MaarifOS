import { resolveStudentMembershipOn, studentMembershipOverlaps } from "../../core/domain/student-membership.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  isTeacherMonthlyEvaluation,
  teacherMonthlyEvidenceMeetsMinimum,
  TEACHER_MONTHLY_PROGRAM_CRITERIA,
  TEACHER_MONTHLY_TEACHER_CRITERIA,
  type TeacherMonthlyCriterionResponse,
  type TeacherMonthlyCriterionStatus,
  type TeacherMonthlyEvaluation,
  type TeacherMonthlyEvidenceCoverage,
} from "../../core/domain/teacher-owned-monthly-evaluation.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import { createEmptySnapshot, type StoredRecord } from "../../core/domain/model.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";
import {
  cloneTeacherOwnedPlan,
  isTeacherWeeklyEvaluation,
  isTeacherOwnedPlanRecord,
  isTeacherPlanContent,
  TEACHER_AUTHORED_PLAN_ORIGIN,
  TEACHER_OWNED_PLAN_SCHEMA_VERSION,
  TeacherOwnedPlanError,
  type CreateTeacherOwnedPlanGraphInput,
  type TeacherOwnedAnnualPlan,
  type TeacherOwnedMonthlyPlan,
  type TeacherOwnedMonthlyPlanDraft,
  type TeacherOwnedPlanGraph,
  type TeacherOwnedPlanRecord,
  type TeacherOwnedWeeklyPlanDraft,
  type TeacherOwnedWeeklyPlan,
  type TeacherNextPlanDecision,
  type TeacherWeeklyCarryReviewAction,
  type TeacherWeeklyEvaluation,
} from "../../core/domain/teacher-owned-plan.ts";
import {
  isTeacherOwnedDailyFlow,
  reviseTeacherOwnedDailyFlow,
  type TeacherOwnedDailyFlow,
  type TeacherOwnedDailyFlowBlockEdit,
} from "../../core/domain/teacher-owned-daily-flow.ts";
import { parseTeacherWeeklyValuesNarrative } from "../values/value-plan-models.ts";
import { resolveLocalTeacherIdentity } from "../evidence/local-teacher-identity.ts";
import { resolveTeacherDayClosureWorkspace } from "../day-closure/teacher-day-closure.ts";
import {
  localNoSchoolPeriodsFromCalendarEntries,
  resolveTeacherWeekTeachingDays,
  type TeacherWeekTeachingDayResolution,
} from "./teacher-week-teaching-days.ts";

export {
  TEACHER_MONTHLY_PROGRAM_CRITERIA,
  TEACHER_MONTHLY_TEACHER_CRITERIA,
} from "../../core/domain/teacher-owned-monthly-evaluation.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONTH_KEY_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;

export interface ReviseTeacherOwnedPlanInput {
  planId: string;
  expectedUpdatedAt: string;
  title?: string;
  teacherContent?: CreateTeacherOwnedPlanGraphInput["teacherContent"];
  now?: Date;
}

export interface UpdateTeacherOwnedDailyFlowInput {
  planId: string;
  expectedUpdatedAt: string;
  blocks: readonly TeacherOwnedDailyFlowBlockEdit[];
  now?: Date;
}

export type TeacherOwnedDailyPlanWithFlow = StoredRecord & {
  readonly planType: "daily";
  readonly teacherOwnedDailyFlow: TeacherOwnedDailyFlow;
};

export interface LoadTeacherOwnedPlanGraphInput {
  annualPlanId?: string;
}

export interface AppendTeacherOwnedPlanMonthsInput {
  annualPlanId: string;
  expectedUpdatedAt: string;
  months: readonly TeacherOwnedMonthlyPlanDraft[];
  now?: Date;
}

export interface AppendTeacherOwnedPlanWeeksInput {
  annualPlanId: string;
  monthlyPlanId: string;
  expectedAnnualUpdatedAt: string;
  expectedMonthlyUpdatedAt: string;
  weeks: readonly TeacherOwnedWeeklyPlanDraft[];
  now?: Date;
}

export interface TeacherOwnedPlanStarterDraft {
  annualTitle: string;
  annualPeriodStart: string;
  annualPeriodEnd: string;
  monthTitle: string;
  monthKey: string;
  monthPeriodStart: string;
  monthPeriodEnd: string;
  weekTitle: string;
  weekKey: string;
  weekPeriodStart: string;
  weekPeriodEnd: string;
  nextWeekTitle: string | null;
  nextWeekKey: string | null;
  nextWeekPeriodStart: string | null;
  nextWeekPeriodEnd: string | null;
  nextMonthTitle: string | null;
  nextMonthKey: string | null;
  nextMonthPeriodStart: string | null;
  nextMonthPeriodEnd: string | null;
  nextMonthWeekTitle: string | null;
  nextMonthWeekKey: string | null;
  nextMonthWeekPeriodStart: string | null;
  nextMonthWeekPeriodEnd: string | null;
}

export interface TeacherWeeklyReviewObservation {
  id: string;
  civilDate: string;
  observedAt: string;
  rawText: string;
  activityTitle: string;
  studentName: string | null;
  curriculumLinkIds: readonly string[];
}

export interface TeacherWeeklyReviewContext {
  weekly: TeacherOwnedWeeklyPlan;
  observations: readonly TeacherWeeklyReviewObservation[];
  evaluations: readonly TeacherWeeklyEvaluation[];
  readiness: {
    eligible: boolean;
    blockers: readonly string[];
    dailyPlanCount: number;
    completeClosureCount: number;
    expectedTeachingDayCount: number;
    missingExpectedCivilDates: readonly string[];
    duplicateCivilDates: readonly string[];
    unexpectedCivilDates: readonly string[];
    teachingDays: TeacherWeekTeachingDayResolution;
  };
}

export interface RecordTeacherWeeklyEvaluationInput {
  weeklyPlanId: string;
  expectedWeeklyUpdatedAt: string;
  reflection: string;
  evidenceSummary: string;
  observationIds: readonly string[];
  nextPlanDecision: TeacherNextPlanDecision;
  now?: Date;
}

export interface ReviewTeacherWeeklyCarryInput {
  weeklyPlanId: string;
  expectedWeeklyUpdatedAt: string;
  expectedEvaluationId: string;
  action: TeacherWeeklyCarryReviewAction;
  teacherNote: string;
  acceptedNarrative?: string;
  now?: Date;
}

export interface TeacherMonthlyReviewCurriculumLink {
  id: string;
  observationId: string;
  referenceCode: string;
  referenceTitle: string;
  confirmedAt: string;
}

export interface TeacherMonthlyReviewObservation {
  id: string;
  civilDate: string;
  observedAt: string;
  rawText: string;
  dailyPlanId: string;
  weeklyPlanId: string;
  weekTitle: string;
  activityTitle: string;
  studentIds: readonly string[];
  curriculumLinks: readonly TeacherMonthlyReviewCurriculumLink[];
}

export interface TeacherMonthlyReviewContext {
  monthly: TeacherOwnedMonthlyPlan;
  activeStudents: readonly { id: string; displayName: string | null }[];
  observations: readonly TeacherMonthlyReviewObservation[];
  availableCoverage: TeacherMonthlyEvidenceCoverage;
  evaluations: readonly TeacherMonthlyEvaluation[];
}

export interface RecordTeacherMonthlyEvaluationInput {
  monthlyPlanId: string;
  expectedMonthlyUpdatedAt: string;
  childEvidenceState: "sufficient-evidence" | "insufficient-evidence";
  childNarrative: string;
  observationIds: readonly string[];
  curriculumLinkIds: readonly string[];
  programCriteria: readonly TeacherMonthlyCriterionResponse[];
  programNarrative: string;
  teacherCriteria: readonly TeacherMonthlyCriterionResponse[];
  teacherNarrative: string;
  nextMonthRecommendation: string;
  now?: Date;
}

export interface ReviewTeacherMonthlyCarryInput {
  monthlyPlanId: string;
  expectedMonthlyUpdatedAt: string;
  expectedEvaluationId: string;
  action: TeacherWeeklyCarryReviewAction;
  teacherNote: string;
  acceptedNarrative?: string;
  now?: Date;
}

function fail(
  code: ConstructorParameters<typeof TeacherOwnedPlanError>[0],
  message: string,
): never {
  throw new TeacherOwnedPlanError(code, message);
}

function validTimestamp(now: Date): string {
  if (Number.isNaN(now.getTime())) {
    fail("invalid-input", "Plan işlemi için geçerli bir zaman gereklidir.");
  }
  return now.toISOString();
}

function civilDateFromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDateFromCivil(civilDate: string): Date {
  return new Date(`${civilDate}T12:00:00.000Z`);
}

function clampCivilDate(value: string, minimum: string, maximum: string): string {
  return value < minimum ? minimum : value > maximum ? maximum : value;
}

function starterDraftForAcademicYear(
  academicYear: StoredRecord,
  civilDate: string,
): TeacherOwnedPlanStarterDraft {
  if (
    !isCivilDate(academicYear.startDate) ||
    !isCivilDate(academicYear.endDate) ||
    !isCivilDate(civilDate)
  ) {
    fail("invalid-input", "Öğretmen planı başlangıç tarihleri doğrulanamadı.");
  }
  const anchor = clampCivilDate(
    civilDate,
    academicYear.startDate,
    academicYear.endDate,
  );
  const anchorDate = utcDateFromCivil(anchor);
  const year = anchorDate.getUTCFullYear();
  const monthIndex = anchorDate.getUTCMonth();
  const rawMonthStart = civilDateFromUtc(new Date(Date.UTC(year, monthIndex, 1, 12)));
  const rawMonthEnd = civilDateFromUtc(new Date(Date.UTC(year, monthIndex + 1, 0, 12)));
  const monthPeriodStart = clampCivilDate(
    rawMonthStart,
    academicYear.startDate,
    academicYear.endDate,
  );
  const monthPeriodEnd = clampCivilDate(
    rawMonthEnd,
    academicYear.startDate,
    academicYear.endDate,
  );
  const dayOffset = (anchorDate.getUTCDay() + 6) % 7;
  const rawWeekStart = civilDateFromUtc(
    new Date(Date.UTC(year, monthIndex, anchorDate.getUTCDate() - dayOffset, 12)),
  );
  const rawWeekEnd = civilDateFromUtc(
    new Date(Date.UTC(year, monthIndex, anchorDate.getUTCDate() - dayOffset + 6, 12)),
  );
  const weekPeriodStart = clampCivilDate(
    rawWeekStart,
    monthPeriodStart,
    monthPeriodEnd,
  );
  const weekPeriodEnd = clampCivilDate(
    rawWeekEnd,
    monthPeriodStart,
    monthPeriodEnd,
  );
  const monthLabel = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(anchorDate);
  const weekStartLabel = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(utcDateFromCivil(weekPeriodStart));
  const weekEndLabel = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(utcDateFromCivil(weekPeriodEnd));
  const nextWeekStartDate = new Date(
    utcDateFromCivil(weekPeriodEnd).getTime() + 86_400_000,
  );
  const rawNextWeekStart = civilDateFromUtc(nextWeekStartDate);
  const nextWeekPeriodStart =
    rawNextWeekStart <= monthPeriodEnd ? rawNextWeekStart : null;
  const nextWeekPeriodEnd = nextWeekPeriodStart
    ? clampCivilDate(
        civilDateFromUtc(new Date(nextWeekStartDate.getTime() + 6 * 86_400_000)),
        nextWeekPeriodStart,
        monthPeriodEnd,
      )
    : null;
  const nextWeekStartLabel = nextWeekPeriodStart
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(utcDateFromCivil(nextWeekPeriodStart))
    : null;
  const nextWeekEndLabel = nextWeekPeriodEnd
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(utcDateFromCivil(nextWeekPeriodEnd))
    : null;
  const rawNextMonthStart = civilDateFromUtc(
    new Date(Date.UTC(year, monthIndex + 1, 1, 12)),
  );
  const nextMonthPeriodStart = rawNextMonthStart <= academicYear.endDate
    ? clampCivilDate(rawNextMonthStart, academicYear.startDate, academicYear.endDate)
    : null;
  const nextMonthPeriodEnd = nextMonthPeriodStart
    ? clampCivilDate(
        civilDateFromUtc(new Date(Date.UTC(year, monthIndex + 2, 0, 12))),
        nextMonthPeriodStart,
        academicYear.endDate,
      )
    : null;
  const nextMonthAnchor = nextMonthPeriodStart
    ? utcDateFromCivil(nextMonthPeriodStart)
    : null;
  const nextMonthLabel = nextMonthAnchor
    ? new Intl.DateTimeFormat("tr-TR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(nextMonthAnchor)
    : null;
  const nextMonthWeekPeriodStart = nextMonthPeriodStart;
  const nextMonthWeekPeriodEnd = nextMonthPeriodStart && nextMonthPeriodEnd
    ? clampCivilDate(
        civilDateFromUtc(
          new Date(utcDateFromCivil(nextMonthPeriodStart).getTime() + 6 * 86_400_000),
        ),
        nextMonthPeriodStart,
        nextMonthPeriodEnd,
      )
    : null;
  const nextMonthWeekStartLabel = nextMonthWeekPeriodStart
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(utcDateFromCivil(nextMonthWeekPeriodStart))
    : null;
  const nextMonthWeekEndLabel = nextMonthWeekPeriodEnd
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(utcDateFromCivil(nextMonthWeekPeriodEnd))
    : null;
  return {
    annualTitle: `${requiredText(academicYear.name, "Eğitim yılı adı")} Öğretmen Planı`,
    annualPeriodStart: academicYear.startDate,
    annualPeriodEnd: academicYear.endDate,
    monthTitle: `${monthLabel} Öğretmen Planı`,
    monthKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    monthPeriodStart,
    monthPeriodEnd,
    weekTitle: `${weekStartLabel} – ${weekEndLabel} Haftası`,
    weekKey: `${weekPeriodStart}_${weekPeriodEnd}`,
    weekPeriodStart,
    weekPeriodEnd,
    nextWeekTitle:
      nextWeekStartLabel && nextWeekEndLabel
        ? `${nextWeekStartLabel} – ${nextWeekEndLabel} Haftası`
        : null,
    nextWeekKey:
      nextWeekPeriodStart && nextWeekPeriodEnd
        ? `${nextWeekPeriodStart}_${nextWeekPeriodEnd}`
        : null,
    nextWeekPeriodStart,
    nextWeekPeriodEnd,
    nextMonthTitle: nextMonthLabel ? `${nextMonthLabel} Öğretmen Planı` : null,
    nextMonthKey: nextMonthPeriodStart?.slice(0, 7) ?? null,
    nextMonthPeriodStart,
    nextMonthPeriodEnd,
    nextMonthWeekTitle:
      nextMonthWeekStartLabel && nextMonthWeekEndLabel
        ? `${nextMonthWeekStartLabel} – ${nextMonthWeekEndLabel} Haftası`
        : null,
    nextMonthWeekKey:
      nextMonthWeekPeriodStart && nextMonthWeekPeriodEnd
        ? `${nextMonthWeekPeriodStart}_${nextMonthWeekPeriodEnd}`
        : null,
    nextMonthWeekPeriodStart,
    nextMonthWeekPeriodEnd,
  };
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail("invalid-input", `${label} boş bırakılamaz.`);
  }
  return value.trim();
}

function civilPeriod(
  periodStart: unknown,
  periodEnd: unknown,
  label: string,
): { periodStart: string; periodEnd: string } {
  if (
    !isCivilDate(periodStart) ||
    !isCivilDate(periodEnd) ||
    periodStart > periodEnd
  ) {
    fail(
      "invalid-input",
      `${label} başlangıç ve bitişi geçerli bir sivil tarih aralığı olmalıdır.`,
    );
  }
  return { periodStart, periodEnd };
}

function cloneContent(
  value: CreateTeacherOwnedPlanGraphInput["teacherContent"],
  label: string,
): CreateTeacherOwnedPlanGraphInput["teacherContent"] {
  if (!isTeacherPlanContent(value)) {
    fail("invalid-input", `${label} JSON-güvenli öğretmen içeriği olmalıdır.`);
  }
  return structuredClone(value);
}

function overlaps(
  left: { periodStart: string; periodEnd: string },
  right: { periodStart: string; periodEnd: string },
): boolean {
  return left.periodStart <= right.periodEnd && right.periodStart <= left.periodEnd;
}

function assertStrictSequence(
  periods: readonly { periodStart: string; periodEnd: string }[],
  label: string,
): void {
  for (let index = 1; index < periods.length; index += 1) {
    const previous = periods[index - 1];
    const current = periods[index];
    if (!previous || !current) continue;
    if (current.periodStart <= previous.periodStart || overlaps(previous, current)) {
      fail(
        "duplicate-or-overlap",
        `${label} dönemleri aynı günü paylaşamaz ve kronolojik sırada olmalıdır.`,
      );
    }
  }
}

async function activeScopeInTransaction(
  transaction: DataTransaction,
): Promise<ActiveClassroomScope> {
  const snapshot = createEmptySnapshot();
  [snapshot.academicYears, snapshot.classrooms, snapshot.settings] =
    await Promise.all([
      transaction.getAll("academicYears"),
      transaction.getAll("classrooms"),
      transaction.getAll("settings"),
    ]);
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    fail(
      "active-scope-required",
      "Öğretmen planı için etkin ve arşivlenmemiş bir sınıf gereklidir.",
    );
  }
  return scope;
}

function activeTeacherPlans(
  plans: readonly StoredRecord[],
  scope: ActiveClassroomScope,
): TeacherOwnedPlanRecord[] {
  const candidates = plans.filter(
    (record) =>
      record.planOrigin === TEACHER_AUTHORED_PLAN_ORIGIN &&
      typeof record.deletedAt !== "string" &&
      recordBelongsToClassroomScope(record, scope),
  );
  if (candidates.some((record) => !isTeacherOwnedPlanRecord(record))) {
    fail(
      "graph-integrity",
      "Öğretmen plan kayıtlarından biri alan sözleşmesine uymuyor.",
    );
  }
  return candidates.map((record) => cloneTeacherOwnedPlan(record as TeacherOwnedPlanRecord));
}

function validateCreationInput(
  input: CreateTeacherOwnedPlanGraphInput,
  academicYear: StoredRecord,
): void {
  requiredText(input.title, "Yıllık plan başlığı");
  const annual = civilPeriod(input.periodStart, input.periodEnd, "Yıllık plan dönemi");
  cloneContent(input.teacherContent, "Yıllık plan içeriği");
  if (
    !isCivilDate(academicYear.startDate) ||
    !isCivilDate(academicYear.endDate) ||
    annual.periodStart < academicYear.startDate ||
    annual.periodEnd > academicYear.endDate
  ) {
    fail(
      "invalid-input",
      "Yıllık plan dönemi etkin eğitim yılının sınırları içinde olmalıdır.",
    );
  }
  if (!Array.isArray(input.months) || input.months.length === 0) {
    fail("invalid-input", "Yıllık plan en az bir aylık plan içermelidir.");
  }

  const monthKeys = new Set<string>();
  const monthlyPeriods = input.months.map((month, monthIndex) => {
    const label = `${monthIndex + 1}. aylık plan`;
    requiredText(month.title, `${label} başlığı`);
    if (!MONTH_KEY_PATTERN.test(month.monthKey)) {
      fail("invalid-input", `${label} ay anahtarı YYYY-AA biçiminde olmalıdır.`);
    }
    if (monthKeys.has(month.monthKey)) {
      fail("duplicate-or-overlap", `${month.monthKey} ayı birden fazla kez eklenemez.`);
    }
    monthKeys.add(month.monthKey);
    const period = civilPeriod(month.periodStart, month.periodEnd, `${label} dönemi`);
    if (
      !period.periodStart.startsWith(`${month.monthKey}-`) ||
      !period.periodEnd.startsWith(`${month.monthKey}-`) ||
      period.periodStart < annual.periodStart ||
      period.periodEnd > annual.periodEnd
    ) {
      fail(
        "invalid-input",
        `${label} kendi ayının ve yıllık planın sınırları içinde olmalıdır.`,
      );
    }
    cloneContent(month.teacherContent, `${label} içeriği`);
    if (!Array.isArray(month.weeks) || month.weeks.length === 0) {
      fail("invalid-input", `${label} en az bir haftalık plan içermelidir.`);
    }
    const weekKeys = new Set<string>();
    const weeklyPeriods = month.weeks.map(
      (week: TeacherOwnedWeeklyPlanDraft, weekIndex: number) => {
      const weekLabel = `${label} / ${weekIndex + 1}. haftalık plan`;
      requiredText(week.title, `${weekLabel} başlığı`);
      requiredText(week.weekKey, `${weekLabel} anahtarı`);
      if (weekKeys.has(week.weekKey)) {
        fail(
          "duplicate-or-overlap",
          `${week.weekKey} hafta anahtarı aynı ayda birden fazla kez kullanılamaz.`,
        );
      }
      weekKeys.add(week.weekKey);
      const weekPeriod = civilPeriod(
        week.periodStart,
        week.periodEnd,
        `${weekLabel} dönemi`,
      );
      if (
        weekPeriod.periodStart < period.periodStart ||
        weekPeriod.periodEnd > period.periodEnd
      ) {
        fail(
          "invalid-input",
          `${weekLabel} aylık planın sınırları içinde olmalıdır.`,
        );
      }
      cloneContent(week.teacherContent, `${weekLabel} içeriği`);
        return weekPeriod;
      },
    );
    assertStrictSequence(weeklyPeriods, `${label} haftalık plan`);
    return period;
  });
  assertStrictSequence(monthlyPeriods, "Aylık plan");
}

function graphFromRecords(
  records: readonly TeacherOwnedPlanRecord[],
  annualPlanId?: string,
): TeacherOwnedPlanGraph | null {
  const annuals = records.filter(
    (record): record is TeacherOwnedAnnualPlan => record.planType === "annual",
  );
  const annual = annualPlanId
    ? annuals.find((record) => record.id === annualPlanId)
    : annuals.length === 1
      ? annuals[0]
      : undefined;
  if (!annual) {
    if (annualPlanId || annuals.length === 0) return null;
    fail(
      "duplicate-or-overlap",
      "Etkin sınıfta birden fazla öğretmen yıllık planı var; kimlik seçilmeden devam edilemez.",
    );
  }

  const childMonths = records.filter(
    (record): record is TeacherOwnedMonthlyPlan =>
      record.planType === "monthly" && record.annualPlanId === annual.id,
  );
  if (
    childMonths.length !== annual.monthlySectionIds.length ||
    childMonths.some((month) => !annual.monthlySectionIds.includes(month.id))
  ) {
    fail("graph-integrity", "Yıllık planın aylık plan kimlikleri eksik veya fazladır.");
  }
  const months = annual.monthlySectionIds.map((monthlyId) => {
    const monthly = childMonths.find((record) => record.id === monthlyId);
    if (
      !monthly ||
      monthly.academicYearId !== annual.academicYearId ||
      monthly.classroomId !== annual.classroomId ||
      monthly.periodStart < annual.periodStart ||
      monthly.periodEnd > annual.periodEnd
    ) {
      fail("graph-integrity", "Aylık plan yıllık plan kapsamıyla uyuşmuyor.");
    }
    const childWeeks = records.filter(
      (record): record is TeacherOwnedWeeklyPlan =>
        record.planType === "weekly" && record.monthlyPlanId === monthly.id,
    );
    if (
      childWeeks.length !== monthly.weeklySectionIds.length ||
      childWeeks.some(
        (week) =>
          week.annualPlanId !== annual.id ||
          !monthly.weeklySectionIds.includes(week.id),
      )
    ) {
      fail("graph-integrity", "Aylık planın haftalık plan kimlikleri eksik veya fazladır.");
    }
    const weeks = monthly.weeklySectionIds.map((weeklyId) => {
      const weekly = childWeeks.find((record) => record.id === weeklyId);
      if (
        !weekly ||
        weekly.academicYearId !== annual.academicYearId ||
        weekly.classroomId !== annual.classroomId ||
        weekly.periodStart < monthly.periodStart ||
        weekly.periodEnd > monthly.periodEnd
      ) {
        fail("graph-integrity", "Haftalık plan aylık plan kapsamıyla uyuşmuyor.");
      }
      return cloneTeacherOwnedPlan(weekly);
    });
    assertStrictSequence(weeks, `${monthly.title} haftalık plan`);
    return {
      monthly: cloneTeacherOwnedPlan(monthly),
      weeks,
    };
  });
  assertStrictSequence(
    months.map(({ monthly }) => monthly),
    "Aylık plan",
  );
  return { annual: cloneTeacherOwnedPlan(annual), months };
}

/**
 * Tek bir IndexedDB işleminde yıllık → aylık → haftalık omurgayı kurar.
 * Etkin sınıfta çakışan öğretmen yıllık planı varsa hiçbir kayıt yazılmaz.
 */
export async function createTeacherOwnedPlanGraph(
  store: LocalDataStore,
  input: CreateTeacherOwnedPlanGraphInput,
): Promise<TeacherOwnedPlanGraph> {
  const timestamp = validTimestamp(input.now ?? new Date());
  let result: TeacherOwnedPlanGraph | null = null;
  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      if (
        (input.expectedAcademicYearId !== undefined &&
          input.expectedAcademicYearId !== scope.academicYearId) ||
        (input.expectedClassroomId !== undefined &&
          input.expectedClassroomId !== scope.classroomId)
      ) {
        fail(
          "concurrent-update",
          "Etkin sınıf seçimden sonra değişti; plan omurgası yeni kapsam doğrulanmadan kaydedilmedi.",
        );
      }
      const [academicYears, plans] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("plans"),
      ]);
      const academicYear = academicYears.find(
        (record) =>
          record.id === scope.academicYearId && typeof record.deletedAt !== "string",
      );
      if (!academicYear) {
        fail("active-scope-required", "Etkin eğitim yılı bulunamadı.");
      }
      validateCreationInput(input, academicYear);
      const existing = activeTeacherPlans(plans, scope);
      if (
        existing.some(
          (record) =>
            record.planType === "annual" &&
            overlaps(record, {
              periodStart: input.periodStart,
              periodEnd: input.periodEnd,
            }),
        )
      ) {
        fail(
          "duplicate-or-overlap",
          "Aynı sınıf ve eğitim yılında bu dönemle çakışan öğretmen yıllık planı zaten var.",
        );
      }

      const annualId = crypto.randomUUID();
      const monthlyIds = input.months.map(() => crypto.randomUUID());
      const weeklyIds = input.months.map((month) =>
        month.weeks.map(() => crypto.randomUUID()),
      );
      const base = {
        planOrigin: TEACHER_AUTHORED_PLAN_ORIGIN,
        status: "active" as const,
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
        schemaVersion: TEACHER_OWNED_PLAN_SCHEMA_VERSION,
        revisionNumber: 1,
        revisionHistory: [],
      };
      const annual: TeacherOwnedAnnualPlan = {
        ...base,
        id: annualId,
        planType: "annual",
        title: requiredText(input.title, "Yıllık plan başlığı"),
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        civilDate: input.periodStart,
        teacherContent: cloneContent(input.teacherContent, "Yıllık plan içeriği"),
        monthlySectionIds: [...monthlyIds],
      };
      const monthGroups = input.months.map((month, monthIndex) => {
        const monthlyId = monthlyIds[monthIndex];
        const ids = weeklyIds[monthIndex];
        if (!monthlyId || !ids) {
          fail("graph-integrity", "Aylık plan kimliği üretilemedi.");
        }
        const monthly: TeacherOwnedMonthlyPlan = {
          ...base,
          id: monthlyId,
          planType: "monthly",
          annualPlanId: annualId,
          title: requiredText(month.title, "Aylık plan başlığı"),
          monthKey: month.monthKey,
          periodStart: month.periodStart,
          periodEnd: month.periodEnd,
          civilDate: month.periodStart,
          teacherContent: cloneContent(month.teacherContent, "Aylık plan içeriği"),
          weeklySectionIds: [...ids],
        };
        const weeks = month.weeks.map((week, weekIndex) => {
          const weeklyId = ids[weekIndex];
          if (!weeklyId) fail("graph-integrity", "Haftalık plan kimliği üretilemedi.");
          const weekly: TeacherOwnedWeeklyPlan = {
            ...base,
            id: weeklyId,
            planType: "weekly",
            annualPlanId: annualId,
            monthlyPlanId: monthlyId,
            title: requiredText(week.title, "Haftalık plan başlığı"),
            weekKey: requiredText(week.weekKey, "Haftalık plan anahtarı"),
            periodStart: week.periodStart,
            periodEnd: week.periodEnd,
            civilDate: week.periodStart,
            teacherContent: cloneContent(week.teacherContent, "Haftalık plan içeriği"),
            weeklyEvaluations: [],
            nextPlanDecisionRequired: true,
          };
          return weekly;
        });
        return { monthly, weeks };
      });
      const records: TeacherOwnedPlanRecord[] = [
        annual,
        ...monthGroups.flatMap(({ monthly, weeks }) => [monthly, ...weeks]),
      ];
      await transaction.putMany("plans", records);
      result = {
        annual: cloneTeacherOwnedPlan(annual),
        months: monthGroups.map(({ monthly, weeks }) => ({
          monthly: cloneTeacherOwnedPlan(monthly),
          weeks: weeks.map(cloneTeacherOwnedPlan),
        })),
      };
    },
  );
  if (!result) fail("graph-integrity", "Öğretmen plan zinciri kaydedilemedi.");
  return result;
}

export async function loadTeacherOwnedPlanGraph(
  store: LocalDataStore,
  input: LoadTeacherOwnedPlanGraphInput = {},
): Promise<TeacherOwnedPlanGraph | null> {
  if (input.annualPlanId !== undefined && !UUID_PATTERN.test(input.annualPlanId)) {
    fail("invalid-input", "Yıllık plan kimliği UUID biçiminde olmalıdır.");
  }
  return store.transaction(
    "readonly",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const plans = await transaction.getAll("plans");
      return graphFromRecords(activeTeacherPlans(plans, scope), input.annualPlanId);
    },
  );
}

/**
 * Mevcut öğretmen yıllık planına eksik aylık ve haftalık omurgaları tek
 * transaction içinde ekler. Var olan ayları veya kayıt kimliklerini yeniden
 * üretmez; yıllık üst kaydı optimistic concurrency ile revize eder.
 */
export async function appendTeacherOwnedPlanMonths(
  store: LocalDataStore,
  input: AppendTeacherOwnedPlanMonthsInput,
): Promise<TeacherOwnedPlanGraph> {
  if (!UUID_PATTERN.test(input.annualPlanId)) {
    fail("invalid-input", "Yıllık plan kimliği UUID biçiminde olmalıdır.");
  }
  requiredText(input.expectedUpdatedAt, "Beklenen yıllık plan güncelleme zamanı");
  if (!Array.isArray(input.months) || input.months.length === 0) {
    fail("invalid-input", "Eklenecek en az bir aylık plan gereklidir.");
  }
  const timestamp = validTimestamp(input.now ?? new Date());
  return store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [academicYears, storedPlans] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("plans"),
      ]);
      const academicYear = academicYears.find(
        (record) =>
          record.id === scope.academicYearId &&
          typeof record.deletedAt !== "string",
      );
      if (!academicYear) {
        fail("active-scope-required", "Etkin eğitim yılı bulunamadı.");
      }
      const existing = activeTeacherPlans(storedPlans, scope);
      const graph = graphFromRecords(existing, input.annualPlanId);
      if (!graph) {
        fail("plan-not-found", "Genişletilecek yıllık öğretmen planı bulunamadı.");
      }
      if (graph.annual.updatedAt !== input.expectedUpdatedAt) {
        fail(
          "concurrent-update",
          "Yıllık plan başka bir işlemde güncellendi; son sürüm yüklenmeden ay eklenmedi.",
        );
      }
      if (Date.parse(timestamp) <= Date.parse(graph.annual.updatedAt)) {
        fail(
          "invalid-input",
          "Ay ekleme zamanı yıllık planın son güncelleme zamanından sonra olmalıdır.",
        );
      }
      const existingMonthKeys = new Set(
        graph.months.map(({ monthly }) => monthly.monthKey),
      );
      if (input.months.some((month) => existingMonthKeys.has(month.monthKey))) {
        fail(
          "duplicate-or-overlap",
          "Yıllık planda bulunan bir ay ikinci kez eklenemez.",
        );
      }
      const combinedDrafts: TeacherOwnedMonthlyPlanDraft[] = [
        ...graph.months.map(({ monthly, weeks }) => ({
          title: monthly.title,
          monthKey: monthly.monthKey,
          periodStart: monthly.periodStart,
          periodEnd: monthly.periodEnd,
          teacherContent: structuredClone(monthly.teacherContent),
          weeks: weeks.map((week) => ({
            title: week.title,
            weekKey: week.weekKey,
            periodStart: week.periodStart,
            periodEnd: week.periodEnd,
            teacherContent: structuredClone(week.teacherContent),
          })),
        })),
        ...input.months.map((month) => structuredClone(month)),
      ].sort((left, right) => left.periodStart.localeCompare(right.periodStart));
      validateCreationInput(
        {
          title: graph.annual.title,
          periodStart: graph.annual.periodStart,
          periodEnd: graph.annual.periodEnd,
          teacherContent: graph.annual.teacherContent,
          months: combinedDrafts,
        },
        academicYear,
      );

      const newMonthGroups = input.months.map((month) => {
        const monthlyId = crypto.randomUUID();
        const weeklyIds = month.weeks.map(() => crypto.randomUUID());
        const base = {
          planOrigin: TEACHER_AUTHORED_PLAN_ORIGIN,
          status: "active" as const,
          academicYearId: graph.annual.academicYearId,
          classroomId: graph.annual.classroomId,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null,
          schemaVersion: TEACHER_OWNED_PLAN_SCHEMA_VERSION,
          revisionNumber: 1,
          revisionHistory: [],
        };
        const monthly: TeacherOwnedMonthlyPlan = {
          ...base,
          id: monthlyId,
          planType: "monthly",
          annualPlanId: graph.annual.id,
          title: requiredText(month.title, "Aylık plan başlığı"),
          monthKey: month.monthKey,
          periodStart: month.periodStart,
          periodEnd: month.periodEnd,
          civilDate: month.periodStart,
          teacherContent: cloneContent(month.teacherContent, "Aylık plan içeriği"),
          weeklySectionIds: weeklyIds,
        };
        const weeks: TeacherOwnedWeeklyPlan[] = month.weeks.map(
          (week, index) => ({
            ...base,
            id: weeklyIds[index]!,
            planType: "weekly",
            annualPlanId: graph.annual.id,
            monthlyPlanId: monthlyId,
            title: requiredText(week.title, "Haftalık plan başlığı"),
            weekKey: requiredText(week.weekKey, "Haftalık plan anahtarı"),
            periodStart: week.periodStart,
            periodEnd: week.periodEnd,
            civilDate: week.periodStart,
            teacherContent: cloneContent(week.teacherContent, "Haftalık plan içeriği"),
            weeklyEvaluations: [],
            nextPlanDecisionRequired: true,
          }),
        );
        return { monthly, weeks };
      });
      const idByMonthKey = new Map([
        ...graph.months.map(({ monthly }) => [monthly.monthKey, monthly.id] as const),
        ...newMonthGroups.map(({ monthly }) => [monthly.monthKey, monthly.id] as const),
      ]);
      const nextAnnual: TeacherOwnedAnnualPlan = {
        ...cloneTeacherOwnedPlan(graph.annual),
        monthlySectionIds: combinedDrafts.map((month) => idByMonthKey.get(month.monthKey)!),
        revisionNumber: graph.annual.revisionNumber + 1,
        revisionHistory: [
          ...graph.annual.revisionHistory.map((snapshot) => structuredClone(snapshot)),
          {
            revisionNumber: graph.annual.revisionNumber,
            title: graph.annual.title,
            teacherContent: structuredClone(graph.annual.teacherContent),
            periodStart: graph.annual.periodStart,
            periodEnd: graph.annual.periodEnd,
            updatedAt: graph.annual.updatedAt,
            capturedAt: timestamp,
          },
        ],
        updatedAt: timestamp,
      };
      const newRecords: TeacherOwnedPlanRecord[] = newMonthGroups.flatMap(
        ({ monthly, weeks }) => [monthly, ...weeks],
      );
      await transaction.putMany("plans", [nextAnnual, ...newRecords]);
      const result = graphFromRecords(
        [
          ...existing.filter((record) => record.id !== graph.annual.id),
          nextAnnual,
          ...newRecords,
        ],
        nextAnnual.id,
      );
      if (!result) fail("graph-integrity", "Yıllık plan ayları yeniden yüklenemedi.");
      return result;
    },
  );
}

/**
 * Mevcut bir aylık öğretmen planına eksik hafta omurgalarını tek transaction
 * içinde ekler. Yıllık ve aylık sürümler seçim anından beri değiştiyse hiçbir
 * kayıt yazmaz; var olan hafta kimliklerini ve içeriklerini korur.
 */
export async function appendTeacherOwnedPlanWeeks(
  store: LocalDataStore,
  input: AppendTeacherOwnedPlanWeeksInput,
): Promise<TeacherOwnedPlanGraph> {
  if (!UUID_PATTERN.test(input.annualPlanId) || !UUID_PATTERN.test(input.monthlyPlanId)) {
    fail("invalid-input", "Yıllık ve aylık plan kimlikleri UUID biçiminde olmalıdır.");
  }
  requiredText(input.expectedAnnualUpdatedAt, "Beklenen yıllık plan güncelleme zamanı");
  requiredText(input.expectedMonthlyUpdatedAt, "Beklenen aylık plan güncelleme zamanı");
  if (!Array.isArray(input.weeks) || input.weeks.length === 0) {
    fail("invalid-input", "Eklenecek en az bir haftalık plan gereklidir.");
  }
  const timestamp = validTimestamp(input.now ?? new Date());
  return store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [academicYears, storedPlans] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("plans"),
      ]);
      const academicYear = academicYears.find(
        (record) =>
          record.id === scope.academicYearId && typeof record.deletedAt !== "string",
      );
      if (!academicYear) {
        fail("active-scope-required", "Etkin eğitim yılı bulunamadı.");
      }
      const existing = activeTeacherPlans(storedPlans, scope);
      const graph = graphFromRecords(existing, input.annualPlanId);
      if (!graph) {
        fail("plan-not-found", "Genişletilecek yıllık öğretmen planı bulunamadı.");
      }
      const monthGroup = graph.months.find(
        ({ monthly }) => monthly.id === input.monthlyPlanId,
      );
      if (!monthGroup) {
        fail("plan-not-found", "Genişletilecek aylık öğretmen planı bulunamadı.");
      }
      if (
        graph.annual.updatedAt !== input.expectedAnnualUpdatedAt ||
        monthGroup.monthly.updatedAt !== input.expectedMonthlyUpdatedAt
      ) {
        fail(
          "concurrent-update",
          "Plan zinciri başka bir işlemde güncellendi; son sürüm yüklenmeden hafta eklenmedi.",
        );
      }
      if (
        Date.parse(timestamp) <= Date.parse(graph.annual.updatedAt) ||
        Date.parse(timestamp) <= Date.parse(monthGroup.monthly.updatedAt)
      ) {
        fail(
          "invalid-input",
          "Hafta ekleme zamanı plan zincirinin son güncelleme zamanından sonra olmalıdır.",
        );
      }
      const existingWeekKeys = new Set(monthGroup.weeks.map((week) => week.weekKey));
      if (input.weeks.some((week) => existingWeekKeys.has(week.weekKey))) {
        fail(
          "duplicate-or-overlap",
          "Aylık planda bulunan bir hafta ikinci kez eklenemez.",
        );
      }
      const combinedWeeks = [
        ...monthGroup.weeks.map((week) => ({
          title: week.title,
          weekKey: week.weekKey,
          periodStart: week.periodStart,
          periodEnd: week.periodEnd,
          teacherContent: structuredClone(week.teacherContent),
        })),
        ...input.weeks.map((week) => structuredClone(week)),
      ].sort((left, right) => left.periodStart.localeCompare(right.periodStart));
      const combinedDrafts: TeacherOwnedMonthlyPlanDraft[] = graph.months.map(
        ({ monthly, weeks }) => ({
          title: monthly.title,
          monthKey: monthly.monthKey,
          periodStart: monthly.periodStart,
          periodEnd: monthly.periodEnd,
          teacherContent: structuredClone(monthly.teacherContent),
          weeks: monthly.id === monthGroup.monthly.id
            ? combinedWeeks
            : weeks.map((week) => ({
                title: week.title,
                weekKey: week.weekKey,
                periodStart: week.periodStart,
                periodEnd: week.periodEnd,
                teacherContent: structuredClone(week.teacherContent),
              })),
        }),
      );
      validateCreationInput(
        {
          title: graph.annual.title,
          periodStart: graph.annual.periodStart,
          periodEnd: graph.annual.periodEnd,
          teacherContent: graph.annual.teacherContent,
          months: combinedDrafts,
        },
        academicYear,
      );

      const newWeeks: TeacherOwnedWeeklyPlan[] = input.weeks.map((week) => ({
        id: crypto.randomUUID(),
        planType: "weekly",
        planOrigin: TEACHER_AUTHORED_PLAN_ORIGIN,
        annualPlanId: graph.annual.id,
        monthlyPlanId: monthGroup.monthly.id,
        title: requiredText(week.title, "Haftalık plan başlığı"),
        weekKey: requiredText(week.weekKey, "Haftalık plan anahtarı"),
        periodStart: week.periodStart,
        periodEnd: week.periodEnd,
        civilDate: week.periodStart,
        teacherContent: cloneContent(week.teacherContent, "Haftalık plan içeriği"),
        weeklyEvaluations: [],
        nextPlanDecisionRequired: true,
        status: "active",
        academicYearId: graph.annual.academicYearId,
        classroomId: graph.annual.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
        schemaVersion: TEACHER_OWNED_PLAN_SCHEMA_VERSION,
        revisionNumber: 1,
        revisionHistory: [],
      }));
      const idByWeekKey = new Map([
        ...monthGroup.weeks.map((week) => [week.weekKey, week.id] as const),
        ...newWeeks.map((week) => [week.weekKey, week.id] as const),
      ]);
      const nextMonthly: TeacherOwnedMonthlyPlan = {
        ...cloneTeacherOwnedPlan(monthGroup.monthly),
        weeklySectionIds: combinedWeeks.map((week) => idByWeekKey.get(week.weekKey)!),
        revisionNumber: monthGroup.monthly.revisionNumber + 1,
        revisionHistory: [
          ...monthGroup.monthly.revisionHistory.map((snapshot) => structuredClone(snapshot)),
          {
            revisionNumber: monthGroup.monthly.revisionNumber,
            title: monthGroup.monthly.title,
            teacherContent: structuredClone(monthGroup.monthly.teacherContent),
            periodStart: monthGroup.monthly.periodStart,
            periodEnd: monthGroup.monthly.periodEnd,
            updatedAt: monthGroup.monthly.updatedAt,
            capturedAt: timestamp,
          },
        ],
        updatedAt: timestamp,
      };
      await transaction.putMany("plans", [nextMonthly, ...newWeeks]);
      const result = graphFromRecords(
        [
          ...existing.filter((record) => record.id !== nextMonthly.id),
          nextMonthly,
          ...newWeeks,
        ],
        graph.annual.id,
      );
      if (!result) fail("graph-integrity", "Aylık plan haftaları yeniden yüklenemedi.");
      return result;
    },
  );
}

export async function loadTeacherOwnedPlanStarterDraft(
  store: LocalDataStore,
  options: { civilDate: string },
): Promise<TeacherOwnedPlanStarterDraft> {
  if (!isCivilDate(options.civilDate)) {
    fail("invalid-input", "Plan başlangıç günü YYYY-AA-GG biçiminde olmalıdır.");
  }
  return store.transaction(
    "readonly",
    ["academicYears", "classrooms", "settings"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const academicYears = await transaction.getAll("academicYears");
      const academicYear = academicYears.find(
        (record) =>
          record.id === scope.academicYearId &&
          typeof record.deletedAt !== "string",
      );
      if (!academicYear) {
        fail("active-scope-required", "Etkin eğitim yılı bulunamadı.");
      }
      return starterDraftForAcademicYear(
        academicYear,
        options.civilDate,
      );
    },
  );
}

/**
 * Planı yerinde güncellerken önceki sürümün değişmez snapshot'ını sona ekler.
 * Dönem, kapsam ve ebeveyn kimlikleri bu API ile değiştirilemez.
 */
export async function reviseTeacherOwnedPlan(
  store: LocalDataStore,
  input: ReviseTeacherOwnedPlanInput,
): Promise<TeacherOwnedPlanRecord> {
  if (!UUID_PATTERN.test(input.planId)) {
    fail("invalid-input", "Plan kimliği UUID biçiminde olmalıdır.");
  }
  requiredText(input.expectedUpdatedAt, "Beklenen güncelleme zamanı");
  if (input.title === undefined && input.teacherContent === undefined) {
    fail("invalid-input", "Plan revizyonunda başlık veya öğretmen içeriği değişmelidir.");
  }
  const timestamp = validTimestamp(input.now ?? new Date());
  return store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const plans = await transaction.getAll("plans");
      const record = plans.find((candidate) => candidate.id === input.planId);
      if (
        !record ||
        !recordBelongsToClassroomScope(record, scope) ||
        record.planOrigin !== TEACHER_AUTHORED_PLAN_ORIGIN ||
        typeof record.deletedAt === "string"
      ) {
        fail("plan-not-found", "Etkin sınıfta düzenlenecek öğretmen planı bulunamadı.");
      }
      if (!isTeacherOwnedPlanRecord(record)) {
        fail("graph-integrity", "Düzenlenecek öğretmen planı alan sözleşmesine uymuyor.");
      }
      if (record.updatedAt !== input.expectedUpdatedAt) {
        fail(
          "concurrent-update",
          "Plan başka bir işlemde güncellendi; son sürüm yüklenmeden değişiklik uygulanmadı.",
        );
      }
      if (Date.parse(timestamp) <= Date.parse(record.updatedAt)) {
        fail(
          "invalid-input",
          "Revizyon zamanı planın son güncelleme zamanından sonra olmalıdır.",
        );
      }
      const next: TeacherOwnedPlanRecord = {
        ...cloneTeacherOwnedPlan(record),
        title:
          input.title === undefined
            ? record.title
            : requiredText(input.title, "Plan başlığı"),
        teacherContent:
          input.teacherContent === undefined
            ? structuredClone(record.teacherContent)
            : cloneContent(input.teacherContent, "Plan içeriği"),
        revisionNumber: record.revisionNumber + 1,
        revisionHistory: [
          ...record.revisionHistory.map((snapshot) => structuredClone(snapshot)),
          {
            revisionNumber: record.revisionNumber,
            title: record.title,
            teacherContent: structuredClone(record.teacherContent),
            periodStart: record.periodStart,
            periodEnd: record.periodEnd,
            updatedAt: record.updatedAt,
            capturedAt: timestamp,
          },
        ],
        updatedAt: timestamp,
      };
      await transaction.putMany("plans", [next]);
      return cloneTeacherOwnedPlan(next);
    },
  );
}

/**
 * Öğretmenin premiumdan bağımsız günlük akışını tek plan kaydı üzerinde
 * revize eder. Etkinlik koleksiyonuna dokunmadığı için bir günlük planın
 * gerçek etkinlik sayısını çoğaltmaz.
 */
export async function updateTeacherOwnedDailyFlow(
  store: LocalDataStore,
  input: UpdateTeacherOwnedDailyFlowInput,
): Promise<TeacherOwnedDailyPlanWithFlow> {
  if (!UUID_PATTERN.test(input.planId)) {
    fail("invalid-input", "Günlük plan kimliği UUID biçiminde olmalıdır.");
  }
  requiredText(input.expectedUpdatedAt, "Beklenen günlük plan sürümü");
  if (!Array.isArray(input.blocks)) {
    fail("invalid-input", "Günlük akış bölümleri dizi olmalıdır.");
  }
  const timestamp = validTimestamp(input.now ?? new Date());
  return store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const plans = await transaction.getAll("plans");
      const daily = plans.find((candidate) => candidate.id === input.planId);
      if (
        !daily ||
        daily.planType !== "daily" ||
        typeof daily.deletedAt === "string" ||
        !recordBelongsToClassroomScope(daily, scope)
      ) {
        fail(
          "plan-not-found",
          "Etkin sınıfta düzenlenecek öğretmen günlük planı bulunamadı.",
        );
      }
      if (!isTeacherOwnedDailyFlow(daily.teacherOwnedDailyFlow)) {
        fail(
          "graph-integrity",
          "Günlük plan doğrulanmış öğretmen tam gün akışı taşımıyor.",
        );
      }
      const annual = plans.find(
        (candidate) => candidate.id === daily.sourceAnnualPlanId,
      );
      const monthly = plans.find(
        (candidate) => candidate.id === daily.sourceMonthlyPlanId,
      );
      const weekly = plans.find(
        (candidate) => candidate.id === daily.sourceWeeklyPlanId,
      );
      if (
        !annual ||
        !monthly ||
        !weekly ||
        !isTeacherOwnedPlanRecord(annual) ||
        annual.planType !== "annual" ||
        !isTeacherOwnedPlanRecord(monthly) ||
        monthly.planType !== "monthly" ||
        !isTeacherOwnedPlanRecord(weekly) ||
        weekly.planType !== "weekly" ||
        typeof annual.deletedAt === "string" ||
        typeof monthly.deletedAt === "string" ||
        typeof weekly.deletedAt === "string" ||
        !recordBelongsToClassroomScope(annual, scope) ||
        !recordBelongsToClassroomScope(monthly, scope) ||
        !recordBelongsToClassroomScope(weekly, scope) ||
        monthly.annualPlanId !== annual.id ||
        weekly.annualPlanId !== annual.id ||
        weekly.monthlyPlanId !== monthly.id ||
        !annual.monthlySectionIds.includes(monthly.id) ||
        !monthly.weeklySectionIds.includes(weekly.id) ||
        monthly.periodStart < annual.periodStart ||
        monthly.periodEnd > annual.periodEnd ||
        weekly.periodStart < monthly.periodStart ||
        weekly.periodEnd > monthly.periodEnd ||
        !isCivilDate(daily.civilDate) ||
        daily.civilDate < weekly.periodStart ||
        daily.civilDate > weekly.periodEnd
      ) {
        fail(
          "graph-integrity",
          "Günlük planın yıllık, aylık ve haftalık öğretmen planı zinciri doğrulanamadı.",
        );
      }
      if (daily.updatedAt !== input.expectedUpdatedAt) {
        fail(
          "concurrent-update",
          "Günlük plan başka bir işlemde güncellendi; son sürüm yüklenmeden değişiklik uygulanmadı.",
        );
      }
      if (Date.parse(timestamp) <= recordTimestampMillis(daily, "Günlük plan")) {
        fail(
          "invalid-input",
          "Günlük akış revizyon zamanı planın son güncelleme zamanından sonra olmalıdır.",
        );
      }
      let revised: TeacherOwnedDailyFlow;
      try {
        revised = reviseTeacherOwnedDailyFlow(
          daily.teacherOwnedDailyFlow,
          input.blocks,
          await resolveLocalTeacherIdentity(transaction, {
            now: new Date(timestamp),
          }),
          new Date(timestamp),
        );
      } catch (error) {
        fail(
          "invalid-input",
          error instanceof Error ? error.message : "Günlük akış revizyonu geçersizdir.",
        );
      }
      const next: TeacherOwnedDailyPlanWithFlow = {
        ...structuredClone(daily),
        planType: "daily",
        teacherOwnedDailyFlow: revised,
        updatedAt: timestamp,
      };
      await transaction.putMany("plans", [next]);
      return structuredClone(next);
    },
  );
}

function recordTimestampMillis(record: StoredRecord, label: string): number {
  const value = record.updatedAt;
  if (typeof value !== "string") {
    fail("graph-integrity", `${label} güncelleme zamanı eksik.`);
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed) || new Date(parsed).toISOString() !== value) {
    fail("graph-integrity", `${label} güncelleme zamanı UTC biçiminde değil.`);
  }
  return parsed;
}

function observationTimestamp(record: StoredRecord): string {
  const value =
    typeof record.observedAt === "string" ? record.observedAt : record.createdAt;
  if (typeof value !== "string") {
    fail("graph-integrity", "Gözlemin oluşma zamanı eksik.");
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed) || new Date(parsed).toISOString() !== value) {
    fail("graph-integrity", "Gözlemin oluşma zamanı UTC biçiminde değil.");
  }
  return value;
}

function teacherWeeklyEvaluationHistory(
  weekly: TeacherOwnedWeeklyPlan,
): TeacherWeeklyEvaluation[] {
  const candidates = weekly.weeklyEvaluations ?? [];
  if (candidates.some((candidate) => !isTeacherWeeklyEvaluation(candidate))) {
    fail("graph-integrity", "Haftalık değerlendirme geçmişi alan sözleşmesine uymuyor.");
  }
  return candidates.map((candidate) => structuredClone(candidate));
}

interface TeacherWeekCoverage {
  readonly teachingDays: TeacherWeekTeachingDayResolution;
  readonly dailyPlans: readonly StoredRecord[];
  readonly completeClosureCount: number;
  readonly missingExpectedCivilDates: readonly string[];
  readonly duplicateCivilDates: readonly string[];
  readonly unexpectedCivilDates: readonly string[];
  readonly blockers: readonly string[];
}

/**
 * Bağlam ekranı ve commit kapısı aynı kanonik tarih/closure hesabını kullanır.
 * Böylece hiç oluşturulmamış bir günlük plan, haftanın kapsamından sessizce
 * düşemez; plan sayısı değil beklenen öğretim günü kümesi doğrulanır.
 */
function resolveTeacherWeekCoverage(
  snapshot: ReturnType<typeof createEmptySnapshot>,
  weekly: TeacherOwnedWeeklyPlan,
  scope: ActiveClassroomScope,
  now: Date,
): TeacherWeekCoverage {
  const academicYear = snapshot.academicYears.find(
    (record) =>
      record.id === scope.academicYearId && typeof record.deletedAt !== "string",
  );
  const classroom = snapshot.classrooms.find(
    (record) =>
      record.id === scope.classroomId &&
      record.academicYearId === scope.academicYearId &&
      typeof record.deletedAt !== "string",
  );
  if (!academicYear || !classroom) {
    fail(
      "graph-integrity",
      "Haftalık planın etkin eğitim yılı ve sınıf kapsamı doğrulanamadı.",
    );
  }
  const teachingDays = resolveTeacherWeekTeachingDays({
    academicYear,
    weekly,
    classroomSchedule: classroom.schedule,
    explicitNoSchoolPeriods: localNoSchoolPeriodsFromCalendarEntries(
      snapshot.calendarEntries,
      scope,
    ),
  });
  const dailyPlans = snapshot.plans
    .filter(
      (record) =>
        record.planType === "daily" &&
        record.sourceAnnualPlanId === weekly.annualPlanId &&
        record.sourceMonthlyPlanId === weekly.monthlyPlanId &&
        record.sourceWeeklyPlanId === weekly.id &&
        typeof record.deletedAt !== "string" &&
        recordBelongsToClassroomScope(record, scope),
    )
    .sort(
      (left, right) =>
        String(left.civilDate).localeCompare(String(right.civilDate)) ||
        left.id.localeCompare(right.id),
    );
  const plansByCivilDate = new Map<string, StoredRecord[]>();
  for (const daily of dailyPlans) {
    const civilDate = String(daily.civilDate);
    const matches = plansByCivilDate.get(civilDate) ?? [];
    matches.push(daily);
    plansByCivilDate.set(civilDate, matches);
  }
  const expected = new Set(teachingDays.expectedCivilDates);
  const missingExpectedCivilDates = teachingDays.expectedCivilDates.filter(
    (civilDate) => (plansByCivilDate.get(civilDate)?.length ?? 0) === 0,
  );
  const duplicateCivilDates = [...plansByCivilDate.entries()]
    .filter(([, plans]) => plans.length > 1)
    .map(([civilDate]) => civilDate)
    .sort((left, right) => left.localeCompare(right));
  const unexpectedCivilDates = [...plansByCivilDate.keys()]
    .filter((civilDate) => !expected.has(civilDate))
    .sort((left, right) => left.localeCompare(right));
  const completeClosureCount = teachingDays.expectedCivilDates.filter(
    (civilDate) => {
      if ((plansByCivilDate.get(civilDate)?.length ?? 0) !== 1) return false;
      const closure = resolveTeacherDayClosureWorkspace(snapshot, civilDate);
      return (
        closure.status === "closed" &&
        closure.latestClosure?.closureStatus === "complete"
      );
    },
  ).length;
  const blockers: string[] = [];
  if (teachingDays.expectedCivilDates.length === 0) {
    blockers.push("Bu hafta için beklenen öğretim günü yok; haftalık değerlendirme oluşturulamaz.");
  }
  if (!teachingDays.evaluationOpensAtUtc) {
    blockers.push("Sınıf çalışma düzeni ve gün sonu saati yapılandırılmamış.");
  } else if (now.getTime() < Date.parse(teachingDays.evaluationOpensAtUtc)) {
    blockers.push(
      `Haftalık değerlendirme son öğretim günü ${teachingDays.lastExpectedCivilDate} saat ${teachingDays.scheduleEndTime} (${teachingDays.timeZone}) tamamlanınca açılacak.`,
    );
  }
  if (missingExpectedCivilDates.length > 0) {
    blockers.push(
      `Beklenen öğretim günlerinde günlük plan eksik: ${missingExpectedCivilDates.join(", ")}.`,
    );
  }
  if (duplicateCivilDates.length > 0) {
    blockers.push(
      `Aynı öğretim gününde birden fazla günlük plan var: ${duplicateCivilDates.join(", ")}.`,
    );
  }
  if (unexpectedCivilDates.length > 0) {
    blockers.push(
      `Öğretim günü olmayan tarihe bağlı günlük plan var: ${unexpectedCivilDates.join(", ")}.`,
    );
  }
  if (
    teachingDays.expectedCivilDates.length > 0 &&
    completeClosureCount < teachingDays.expectedCivilDates.length
  ) {
    blockers.push(
      `${completeClosureCount}/${teachingDays.expectedCivilDates.length} beklenen öğretim günü eksiksiz ve güncel kapandı.`,
    );
  }
  return {
    teachingDays,
    dailyPlans,
    completeClosureCount,
    missingExpectedCivilDates,
    duplicateCivilDates,
    unexpectedCivilDates,
    blockers,
  };
}

export async function loadTeacherWeeklyReviewContext(
  store: LocalDataStore,
  weeklyPlanId: string,
  options: { readonly now?: Date } = {},
): Promise<TeacherWeeklyReviewContext> {
  if (!UUID_PATTERN.test(weeklyPlanId)) {
    fail("invalid-input", "Haftalık plan kimliği UUID biçiminde olmalıdır.");
  }
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    fail("active-scope-required", "Haftalık değerlendirme için etkin sınıf gereklidir.");
  }
  const weekly = snapshot.plans.find((record) => record.id === weeklyPlanId);
  if (
    !weekly ||
    !isTeacherOwnedPlanRecord(weekly) ||
    weekly.planType !== "weekly" ||
    !recordBelongsToClassroomScope(weekly, scope)
  ) {
    fail("plan-not-found", "Değerlendirilecek öğretmen haftalık planı bulunamadı.");
  }
  const reviewNow = options.now ?? new Date();
  validTimestamp(reviewNow);
  const coverage = resolveTeacherWeekCoverage(
    snapshot,
    weekly,
    scope,
    reviewNow,
  );
  const dailyPlans = coverage.dailyPlans;
  const dailyPlansById = new Map(dailyPlans.map((record) => [record.id, record]));
  const activitiesById = new Map(
    snapshot.activities
      .filter(
        (record) =>
          typeof record.deletedAt !== "string" &&
          recordBelongsToClassroomScope(record, scope),
      )
      .map((record) => [record.id, record]),
  );
  const studentsById = new Map(
    snapshot.students
      .filter((record) => recordBelongsToClassroomScope(record, scope))
      .map((record) => [record.id, record]),
  );
  const teacherConfirmedLinksByObservation = new Map<string, string[]>();
  for (const link of snapshot.evidenceCurriculumLinks) {
    if (
      typeof link.observationId !== "string" ||
      link.confirmationMethod !== "teacher-confirmed" ||
      typeof link.deletedAt === "string" ||
      !recordBelongsToClassroomScope(link, scope)
    ) continue;
    const ids = teacherConfirmedLinksByObservation.get(link.observationId) ?? [];
    ids.push(link.id);
    teacherConfirmedLinksByObservation.set(link.observationId, ids);
  }
  const observations = snapshot.observations
    .flatMap((observation): TeacherWeeklyReviewObservation[] => {
      const daily =
        typeof observation.planId === "string"
          ? dailyPlansById.get(observation.planId)
          : undefined;
      const activity =
        typeof observation.activityId === "string"
          ? activitiesById.get(observation.activityId)
          : undefined;
      if (
        !daily ||
        !activity ||
        activity.planId !== daily.id ||
        activity.sourceAnnualPlanId !== daily.sourceAnnualPlanId ||
        activity.sourceMonthlyPlanId !== daily.sourceMonthlyPlanId ||
        activity.sourceWeeklyPlanId !== daily.sourceWeeklyPlanId ||
        observation.rawTextImmutable !== true ||
        typeof observation.rawText !== "string" ||
        typeof observation.deletedAt === "string" ||
        !recordBelongsToClassroomScope(observation, scope)
      ) {
        return [];
      }
      const studentId = Array.isArray(observation.studentIds)
        ? observation.studentIds.find((id): id is string => typeof id === "string")
        : typeof observation.studentId === "string"
          ? observation.studentId
          : undefined;
      const student = studentId ? studentsById.get(studentId) : undefined;
      return [{
        id: observation.id,
        civilDate: String(observation.civilDate),
        observedAt: observationTimestamp(observation),
        rawText: parseTeacherWeeklyValuesNarrative(
          observation.rawText,
          "Haftalık değerlendirmeye bağlı ham gözlem",
        ),
        activityTitle:
          typeof activity.title === "string" ? activity.title : "Etkinlik",
        studentName:
          student && typeof student.displayName === "string"
            ? student.displayName
            : null,
        curriculumLinkIds: [
          ...(teacherConfirmedLinksByObservation.get(observation.id) ?? []),
        ].sort((left, right) => left.localeCompare(right)),
      }];
    })
    .sort(
      (left, right) =>
        left.observedAt.localeCompare(right.observedAt) ||
        left.id.localeCompare(right.id),
    );
  const blockers = [...coverage.blockers];
  if (observations.length === 0) {
    blockers.push("Bu haftaya bağlı değişmez gözlem yok.");
  } else if (observations.some((observation) => observation.curriculumLinkIds.length === 0)) {
    blockers.push("Program bağı tamamlanmamış gözlemler var.");
  }
  return {
    weekly: cloneTeacherOwnedPlan(weekly),
    observations,
    evaluations: teacherWeeklyEvaluationHistory(weekly),
    readiness: {
      eligible: blockers.length === 0,
      blockers,
      dailyPlanCount: dailyPlans.length,
      completeClosureCount: coverage.completeClosureCount,
      expectedTeachingDayCount: coverage.teachingDays.expectedCivilDates.length,
      missingExpectedCivilDates: coverage.missingExpectedCivilDates,
      duplicateCivilDates: coverage.duplicateCivilDates,
      unexpectedCivilDates: coverage.unexpectedCivilDates,
      teachingDays: coverage.teachingDays,
    },
  };
}

export async function recordTeacherWeeklyEvaluation(
  store: LocalDataStore,
  input: RecordTeacherWeeklyEvaluationInput,
): Promise<TeacherWeeklyEvaluation> {
  if (!UUID_PATTERN.test(input.weeklyPlanId)) {
    fail("invalid-input", "Haftalık plan kimliği UUID biçiminde olmalıdır.");
  }
  requiredText(input.expectedWeeklyUpdatedAt, "Beklenen haftalık plan sürümü");
  const reflection = parseTeacherWeeklyValuesNarrative(
    input.reflection,
    "Haftalık öğretmen değerlendirmesi",
  );
  const evidenceSummary = parseTeacherWeeklyValuesNarrative(
    input.evidenceSummary,
    "Haftalık kanıt özeti",
  );
  const decisions: readonly TeacherNextPlanDecision[] = [
    "keep",
    "adapt",
    "replace",
    "observe-more",
  ];
  if (!decisions.includes(input.nextPlanDecision)) {
    fail("invalid-input", "Geçerli bir sonraki plan kararı seçilmelidir.");
  }
  const observationIds = [...new Set(input.observationIds)];
  if (
    observationIds.length === 0 ||
    observationIds.some((id) => !UUID_PATTERN.test(id))
  ) {
    fail(
      "invalid-input",
      "Haftalık değerlendirme için en az bir bağlı gözlem seçilmelidir.",
    );
  }
  const now = input.now ?? new Date();
  const timestamp = validTimestamp(now);
  let result: TeacherWeeklyEvaluation | null = null;
  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "plans",
      "activities",
      "observations",
      "students",
      "attendanceRecords",
      "evidenceCurriculumLinks",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [plans, activities, observations, students, attendanceRecords, curriculumLinks] = await Promise.all([
        transaction.getAll("plans"),
        transaction.getAll("activities"),
        transaction.getAll("observations"),
        transaction.getAll("students"),
        transaction.getAll("attendanceRecords"),
        transaction.getAll("evidenceCurriculumLinks"),
      ]);
      const weeklyRecord = plans.find((record) => record.id === input.weeklyPlanId);
      if (
        !weeklyRecord ||
        !isTeacherOwnedPlanRecord(weeklyRecord) ||
        weeklyRecord.planType !== "weekly" ||
        !recordBelongsToClassroomScope(weeklyRecord, scope)
      ) {
        fail("plan-not-found", "Değerlendirilecek öğretmen haftalık planı bulunamadı.");
      }
      if (weeklyRecord.updatedAt !== input.expectedWeeklyUpdatedAt) {
        fail(
          "concurrent-update",
          "Haftalık plan başka bir işlemde güncellendi; son sürüm yüklenmeden değerlendirme yazılmadı.",
        );
      }
      const monthlyRecord = plans.find(
        (record) => record.id === weeklyRecord.monthlyPlanId,
      );
      if (
        !monthlyRecord ||
        !isTeacherOwnedPlanRecord(monthlyRecord) ||
        monthlyRecord.planType !== "monthly" ||
        monthlyRecord.annualPlanId !== weeklyRecord.annualPlanId ||
        !recordBelongsToClassroomScope(monthlyRecord, scope)
      ) {
        fail("graph-integrity", "Haftalık planın aylık ebeveyni doğrulanamadı.");
      }
      const weeklyIndex = monthlyRecord.weeklySectionIds.indexOf(weeklyRecord.id);
      if (weeklyIndex < 0) {
        fail("graph-integrity", "Haftalık plan aylık plan sıralamasında bulunamadı.");
      }
      const nextWeeklyId = monthlyRecord.weeklySectionIds[weeklyIndex + 1];
      const nextWeeklyRecord = nextWeeklyId
        ? plans.find((record) => record.id === nextWeeklyId)
        : undefined;
      if (
        nextWeeklyId &&
        (!nextWeeklyRecord ||
          !isTeacherOwnedPlanRecord(nextWeeklyRecord) ||
          nextWeeklyRecord.planType !== "weekly" ||
          nextWeeklyRecord.monthlyPlanId !== monthlyRecord.id ||
          nextWeeklyRecord.annualPlanId !== weeklyRecord.annualPlanId ||
          !recordBelongsToClassroomScope(nextWeeklyRecord, scope))
      ) {
        fail("graph-integrity", "Sonraki haftalık plan zinciri doğrulanamadı.");
      }
      const nextWeekly =
        nextWeeklyRecord &&
        isTeacherOwnedPlanRecord(nextWeeklyRecord) &&
        nextWeeklyRecord.planType === "weekly"
          ? nextWeeklyRecord
          : null;
      if (nextWeekly?.nextPlanDecisionContext) {
        fail(
          "concurrent-update",
          "Sonraki hafta için mevcut öneri karara bağlanmadan yeni haftalık öneri yazılamaz.",
        );
      }
      const dailyPlansById = new Map(
        plans
          .filter(
            (record) =>
              record.planType === "daily" &&
              record.sourceAnnualPlanId === weeklyRecord.annualPlanId &&
              record.sourceMonthlyPlanId === weeklyRecord.monthlyPlanId &&
              record.sourceWeeklyPlanId === weeklyRecord.id &&
              typeof record.deletedAt !== "string" &&
              recordBelongsToClassroomScope(record, scope),
          )
          .map((record) => [record.id, record]),
      );
      const closureSnapshot = createEmptySnapshot();
      closureSnapshot.academicYears = await transaction.getAll("academicYears");
      closureSnapshot.classrooms = await transaction.getAll("classrooms");
      closureSnapshot.settings = await transaction.getAll("settings");
      closureSnapshot.students = students;
      closureSnapshot.attendanceRecords = attendanceRecords;
      closureSnapshot.plans = plans;
      closureSnapshot.activities = activities;
      closureSnapshot.observations = observations;
      closureSnapshot.evidenceCurriculumLinks = curriculumLinks;
      const coverage = resolveTeacherWeekCoverage(
        closureSnapshot,
        weeklyRecord,
        scope,
        now,
      );
      if (
        coverage.teachingDays.evaluationOpensAtUtc &&
        now.getTime() < Date.parse(coverage.teachingDays.evaluationOpensAtUtc)
      ) {
        const timeBlocker = coverage.blockers.find((blocker) =>
          blocker.startsWith("Haftalık değerlendirme son öğretim günü"),
        );
        fail("invalid-input", timeBlocker ?? "Hafta henüz tamamlanmadı.");
      }
      const activitiesById = new Map(activities.map((record) => [record.id, record]));
      const observationsById = new Map(observations.map((record) => [record.id, record]));
      const teacherConfirmedLinksByObservation = new Map<string, StoredRecord[]>();
      for (const link of curriculumLinks) {
        if (
          typeof link.observationId !== "string" ||
          link.confirmationMethod !== "teacher-confirmed" ||
          typeof link.deletedAt === "string" ||
          !recordBelongsToClassroomScope(link, scope)
        ) continue;
        const matches = teacherConfirmedLinksByObservation.get(link.observationId) ?? [];
        matches.push(link);
        teacherConfirmedLinksByObservation.set(link.observationId, matches);
      }
      const unconfirmedWeeklyObservations = observations.filter(
        (observation) =>
          typeof observation.planId === "string" &&
          dailyPlansById.has(observation.planId) &&
          observation.rawTextImmutable === true &&
          typeof observation.deletedAt !== "string" &&
          recordBelongsToClassroomScope(observation, scope) &&
          (teacherConfirmedLinksByObservation.get(observation.id)?.length ?? 0) === 0,
      );
      if (unconfirmedWeeklyObservations.length > 0) {
        fail(
          "graph-integrity",
          "Haftanın bütün değişmez gözlemleri öğretmen onaylı program bağı taşımadan değerlendirme kaydedilemez.",
        );
      }
      const selectedRecords: StoredRecord[] = [];
      const curriculumLinkIds: string[] = [];
      for (const observationId of observationIds) {
        const observation = observationsById.get(observationId);
        const daily =
          observation && typeof observation.planId === "string"
            ? dailyPlansById.get(observation.planId)
            : undefined;
        const activity =
          observation && typeof observation.activityId === "string"
            ? activitiesById.get(observation.activityId)
            : undefined;
        const observedAt = observation ? observationTimestamp(observation) : "";
        if (
          !observation ||
          !daily ||
          !activity ||
          activity.planId !== daily.id ||
          activity.sourceAnnualPlanId !== daily.sourceAnnualPlanId ||
          activity.sourceMonthlyPlanId !== daily.sourceMonthlyPlanId ||
          activity.sourceWeeklyPlanId !== daily.sourceWeeklyPlanId ||
          typeof activity.deletedAt === "string" ||
          !recordBelongsToClassroomScope(activity, scope) ||
          observation.rawTextImmutable !== true ||
          typeof observation.rawText !== "string" ||
          typeof observation.deletedAt === "string" ||
          !recordBelongsToClassroomScope(observation, scope) ||
          Date.parse(observedAt) > now.getTime()
        ) {
          fail(
            "graph-integrity",
            "Değerlendirme yalnız bu haftanın günlük planı ve gerçek etkinliğine bağlı değişmez gözlemleri kullanabilir.",
          );
        }
        parseTeacherWeeklyValuesNarrative(
          observation.rawText,
          "Haftalık değerlendirmeye bağlı ham gözlem",
        );
        const links = teacherConfirmedLinksByObservation.get(observation.id) ?? [];
        if (links.length === 0) {
          fail(
            "graph-integrity",
            "Haftalık değerlendirmedeki her gözlem öğretmen onaylı program bağı taşımalıdır.",
          );
        }
        curriculumLinkIds.push(...links.map((link) => link.id));
        selectedRecords.push(observation, activity);
      }
      if (coverage.blockers.length > 0) {
        fail(
          "graph-integrity",
          `Haftalık değerlendirme hazır değil: ${coverage.blockers.join(" ")}`,
        );
      }
      const chronologyRecords = [
        weeklyRecord,
        ...(nextWeekly ? [nextWeekly] : []),
        ...selectedRecords,
      ];
      if (
        chronologyRecords.some(
          (record) => recordTimestampMillis(record, `records/${record.id}`) >= now.getTime(),
        )
      ) {
        fail(
          "invalid-input",
          "Haftalık değerlendirme zamanı bağlı kayıtların son güncellemesinden sonra olmalıdır.",
        );
      }
      const evaluation: TeacherWeeklyEvaluation = {
        id: crypto.randomUUID(),
        reflection,
        evidenceSummary,
        observationIds,
        curriculumLinkIds: [...new Set(curriculumLinkIds)].sort((left, right) =>
          left.localeCompare(right),
        ),
        nextPlanDecision: input.nextPlanDecision,
        nextPlanTargetPlanId: nextWeekly?.id ?? null,
        sourcePlanRevisionNumber: weeklyRecord.revisionNumber,
        targetPlanRevisionNumberAtSuggestion:
          nextWeekly?.revisionNumber ?? null,
        teacherAuthored: true,
        createdAt: timestamp,
      };
      const previous = teacherWeeklyEvaluationHistory(weeklyRecord);
      const recordsToPut: StoredRecord[] = [{
        ...weeklyRecord,
        weeklyEvaluations: [...previous, structuredClone(evaluation)],
        nextPlanDecisionRequired: false,
        updatedAt: timestamp,
      }];
      if (nextWeekly) {
        recordsToPut.push({
          ...nextWeekly,
          previousWeekEvaluationId: evaluation.id,
          nextPlanDecisionContext: {
            sourceWeeklyPlanId: weeklyRecord.id,
            evaluationId: evaluation.id,
            decision: evaluation.nextPlanDecision,
            evidenceSummary: evaluation.evidenceSummary,
            teacherReflection: evaluation.reflection,
            sourcePlanRevisionNumber: weeklyRecord.revisionNumber,
            targetPlanRevisionNumberAtSuggestion: nextWeekly.revisionNumber,
            createdAt: evaluation.createdAt,
            applicationStatus: "pending-teacher-review",
            reviewHistory: [],
          },
          teacherReviewRequired: true,
          updatedAt: timestamp,
        });
      }
      await transaction.putMany("plans", recordsToPut);
      result = evaluation;
    },
  );
  if (!result) {
    fail("graph-integrity", "Haftalık öğretmen değerlendirmesi kaydedilemedi.");
  }
  return result;
}

/**
 * Önceki haftadan taşınan öneriyi öğretmenin açık kararı olmadan uygulamaz.
 * Kabul/red/yeniden-açma olayları append-only tutulur; kabulde plan metni
 * öğretmenin son düzenlediği anlatıyla tek atomik revizyonda güncellenir.
 */
export async function reviewTeacherWeeklyCarry(
  store: LocalDataStore,
  input: ReviewTeacherWeeklyCarryInput,
): Promise<TeacherOwnedWeeklyPlan> {
  if (
    !UUID_PATTERN.test(input.weeklyPlanId) ||
    !UUID_PATTERN.test(input.expectedEvaluationId)
  ) {
    fail("invalid-input", "Haftalık öneri ve değerlendirme kimlikleri geçersiz.");
  }
  requiredText(input.expectedWeeklyUpdatedAt, "Beklenen haftalık plan sürümü");
  const teacherNote = parseTeacherWeeklyValuesNarrative(
    input.teacherNote,
    "Öğretmen karar gerekçesi",
  );
  const acceptedNarrative =
    input.action === "accepted"
      ? parseTeacherWeeklyValuesNarrative(
          input.acceptedNarrative,
          "Kabul edilen haftalık plan anlatısı",
        )
      : null;
  if (
    input.action !== "accepted" &&
    input.action !== "rejected" &&
    input.action !== "reopened"
  ) {
    fail("invalid-input", "Geçerli bir öğretmen öneri kararı seçilmelidir.");
  }
  const timestamp = validTimestamp(input.now ?? new Date());
  return store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const plans = await transaction.getAll("plans");
      const candidate = plans.find((record) => record.id === input.weeklyPlanId);
      if (
        !candidate ||
        !isTeacherOwnedPlanRecord(candidate) ||
        candidate.planType !== "weekly" ||
        !recordBelongsToClassroomScope(candidate, scope)
      ) {
        fail("plan-not-found", "İncelenecek haftalık öğretmen planı bulunamadı.");
      }
      const context = candidate.nextPlanDecisionContext;
      if (!context || context.evaluationId !== input.expectedEvaluationId) {
        fail("graph-integrity", "Haftalık önerinin kaynak değerlendirmesi doğrulanamadı.");
      }
      const source = plans.find((record) => record.id === context.sourceWeeklyPlanId);
      if (
        !source ||
        !isTeacherOwnedPlanRecord(source) ||
        source.planType !== "weekly" ||
        source.monthlyPlanId !== candidate.monthlyPlanId ||
        !recordBelongsToClassroomScope(source, scope)
      ) {
        fail("graph-integrity", "Önerinin kaynak haftalık planı doğrulanamadı.");
      }
      const evaluation = (source.weeklyEvaluations ?? []).find(
        (entry) => entry.id === context.evaluationId,
      );
      if (
        !evaluation ||
        evaluation.nextPlanTargetPlanId !== candidate.id ||
        evaluation.nextPlanDecision !== context.decision ||
        evaluation.evidenceSummary !== context.evidenceSummary ||
        evaluation.reflection !== context.teacherReflection ||
        evaluation.sourcePlanRevisionNumber !== context.sourcePlanRevisionNumber ||
        evaluation.targetPlanRevisionNumberAtSuggestion !==
          context.targetPlanRevisionNumberAtSuggestion
      ) {
        fail("graph-integrity", "Öneri ile haftalık değerlendirme izi uyuşmuyor.");
      }
      const history = [...(context.reviewHistory ?? [])];
      const latest = history.at(-1);
      if (
        latest?.action === input.action &&
        latest.teacherNote === teacherNote &&
        (input.action !== "accepted" ||
          candidate.teacherContent.narrative === acceptedNarrative)
      ) {
        return cloneTeacherOwnedPlan(candidate);
      }
      if (candidate.updatedAt !== input.expectedWeeklyUpdatedAt) {
        fail(
          "concurrent-update",
          "Haftalık plan başka bir işlemde güncellendi; öneri son sürüm yüklenmeden değiştirilmedi.",
        );
      }
      if (input.action === "reopened") {
        if (context.applicationStatus === "pending-teacher-review" || !latest) {
          fail("invalid-input", "Henüz karara bağlanmamış öneri yeniden açılamaz.");
        }
        if (candidate.revisionNumber !== latest.targetPlanRevisionNumberAfter) {
          fail(
            "concurrent-update",
            "Karardan sonra plan ayrıca değişti; geri alma son sürüm incelenmeden uygulanmadı.",
          );
        }
      } else {
        if (context.applicationStatus !== "pending-teacher-review") {
          fail("concurrent-update", "Haftalık öneri daha önce karara bağlandı.");
        }
        if (
          input.action === "accepted" &&
          candidate.revisionNumber !==
            (latest?.action === "reopened"
              ? latest.targetPlanRevisionNumberAfter
              : context.targetPlanRevisionNumberAtSuggestion)
        ) {
          fail(
            "concurrent-update",
            "Öneri hazırlandıktan sonra hedef hafta değişti; kabulden önce öneriyi yeniden değerlendirin.",
          );
        }
      }
      const latestRecordTime = Math.max(
        Date.parse(candidate.updatedAt),
        Date.parse(source.updatedAt),
        Date.parse(context.createdAt),
      );
      if (Date.parse(timestamp) <= latestRecordTime) {
        fail(
          "invalid-input",
          "Öneri kararı bağlı plan ve değerlendirmeden sonra kaydedilmelidir.",
        );
      }
      let teacherContent = structuredClone(candidate.teacherContent);
      if (input.action === "accepted") {
        teacherContent = {
          ...teacherContent,
          narrative: acceptedNarrative as string,
        };
      } else if (input.action === "reopened" && latest?.action === "accepted") {
        const beforeAcceptance = candidate.revisionHistory.find(
          (snapshot) =>
            snapshot.revisionNumber === latest.targetPlanRevisionNumberBefore,
        );
        if (!beforeAcceptance) {
          fail("graph-integrity", "Kabul öncesi plan sürümü geri alma için bulunamadı.");
        }
        teacherContent = structuredClone(beforeAcceptance.teacherContent);
      }
      const event = {
        id: crypto.randomUUID(),
        action: input.action,
        teacherNote,
        createdAt: timestamp,
        targetPlanRevisionNumberBefore: candidate.revisionNumber,
        targetPlanRevisionNumberAfter: candidate.revisionNumber + 1,
      } as const;
      const next: TeacherOwnedWeeklyPlan = {
        ...cloneTeacherOwnedPlan(candidate),
        teacherContent,
        revisionNumber: candidate.revisionNumber + 1,
        revisionHistory: [
          ...candidate.revisionHistory.map((snapshot) => structuredClone(snapshot)),
          {
            revisionNumber: candidate.revisionNumber,
            title: candidate.title,
            teacherContent: structuredClone(candidate.teacherContent),
            periodStart: candidate.periodStart,
            periodEnd: candidate.periodEnd,
            updatedAt: candidate.updatedAt,
            capturedAt: timestamp,
          },
        ],
        nextPlanDecisionContext: {
          ...structuredClone(context),
          applicationStatus:
            input.action === "reopened" ? "pending-teacher-review" : input.action,
          reviewHistory: [...history.map((entry) => structuredClone(entry)), event],
        },
        teacherReviewRequired: input.action === "reopened",
        updatedAt: timestamp,
      };
      if (!isTeacherOwnedPlanRecord(next)) {
        fail("graph-integrity", "Haftalık öneri kararı plan sözleşmesine uymuyor.");
      }
      await transaction.putMany("plans", [next]);
      return cloneTeacherOwnedPlan(next);
    },
  );
}

function normalizeMonthlyCriteria(
  value: readonly TeacherMonthlyCriterionResponse[],
  expected: readonly (readonly [string, string])[],
  label: string,
): TeacherMonthlyCriterionResponse[] {
  const statuses: readonly TeacherMonthlyCriterionStatus[] = [
    "observed-working",
    "needs-adjustment",
    "not-observed",
  ];
  if (value.length !== expected.length) {
    fail("invalid-input", `${label} ölçütlerinin tamamı yanıtlanmalıdır.`);
  }
  return expected.map(([criterionId], index) => {
    const candidate = value[index];
    if (
      !candidate ||
      candidate.criterionId !== criterionId ||
      !statuses.includes(candidate.status)
    ) {
      fail("invalid-input", `${label} ölçüt sırası veya yanıtı geçersiz.`);
    }
    return { criterionId, status: candidate.status };
  });
}

function activeStudentRecords(students: readonly StoredRecord[], scope: ActiveClassroomScope, academicYear: StoredRecord, monthly: TeacherOwnedMonthlyPlan): StoredRecord[] {
  return students.filter(student => studentMembershipOverlaps(student, { ...scope, academicYear, periodStart: monthly.periodStart, periodEnd: monthly.periodEnd })).sort((left, right) => left.id.localeCompare(right.id));
}

function summarizeTeacherMonthlyCoverage(
  observations: readonly TeacherMonthlyReviewObservation[],
  activeStudentIds: readonly string[],
): TeacherMonthlyEvidenceCoverage {
  const active = new Set(activeStudentIds);
  const covered = [...new Set(
    observations.flatMap((observation) => observation.studentIds),
  )]
    .filter((studentId) => active.has(studentId))
    .sort((left, right) => left.localeCompare(right));
  const coveredSet = new Set(covered);
  return {
    observationCount: observations.length,
    curriculumLinkCount: observations.reduce(
      (total, observation) => total + observation.curriculumLinks.length,
      0,
    ),
    distinctCivilDateCount: new Set(
      observations.map((observation) => observation.civilDate),
    ).size,
    distinctWeekCount: new Set(
      observations.map((observation) => observation.weeklyPlanId),
    ).size,
    activeStudentIds: [...activeStudentIds],
    coveredActiveStudentIds: covered,
    uncoveredActiveStudentIds: activeStudentIds.filter(
      (studentId) => !coveredSet.has(studentId),
    ),
  };
}

function projectTeacherMonthlyObservations(input: {
  students: readonly StoredRecord[];
  academicYear: StoredRecord;
  monthly: TeacherOwnedMonthlyPlan;
  plans: readonly StoredRecord[];
  activities: readonly StoredRecord[];
  observations: readonly StoredRecord[];
  links: readonly StoredRecord[];
  scope: ActiveClassroomScope;
}): TeacherMonthlyReviewObservation[] {
  const weeklyPlans = new Map(
    input.plans
      .filter(
        (record): record is TeacherOwnedWeeklyPlan =>
          isTeacherOwnedPlanRecord(record) &&
          record.planType === "weekly" &&
          record.monthlyPlanId === input.monthly.id &&
          input.monthly.weeklySectionIds.includes(record.id) &&
          recordBelongsToClassroomScope(record, input.scope),
      )
      .map((record) => [record.id, record]),
  );
  const dailyPlans = new Map(
    input.plans
      .filter(
        (record) =>
          record.planType === "daily" &&
          record.sourceMonthlyPlanId === input.monthly.id &&
          typeof record.sourceWeeklyPlanId === "string" &&
          weeklyPlans.has(record.sourceWeeklyPlanId) &&
          typeof record.deletedAt !== "string" &&
          recordBelongsToClassroomScope(record, input.scope),
      )
      .map((record) => [record.id, record]),
  );
  const activities = new Map(
    input.activities
      .filter(
        (record) =>
          typeof record.deletedAt !== "string" &&
          recordBelongsToClassroomScope(record, input.scope),
      )
      .map((record) => [record.id, record]),
  );
  const linksByObservation = new Map<string, StoredRecord[]>();
  for (const link of input.links) {
    if (
      typeof link.observationId !== "string" ||
      typeof link.deletedAt === "string" ||
      link.confirmationMethod !== "teacher-confirmed" ||
      !recordBelongsToClassroomScope(link, input.scope)
    ) continue;
    const candidates = linksByObservation.get(link.observationId) ?? [];
    candidates.push(link);
    linksByObservation.set(link.observationId, candidates);
  }
  return input.observations.flatMap((observation): TeacherMonthlyReviewObservation[] => {
    const daily = typeof observation.planId === "string"
      ? dailyPlans.get(observation.planId)
      : undefined;
    const activity = typeof observation.activityId === "string"
      ? activities.get(observation.activityId)
      : undefined;
    const weekly = daily && typeof daily.sourceWeeklyPlanId === "string"
      ? weeklyPlans.get(daily.sourceWeeklyPlanId)
      : undefined;
    if (
      !daily ||
      !activity ||
      !weekly ||
      activity.planId !== daily.id ||
      activity.sourceMonthlyPlanId !== daily.sourceMonthlyPlanId ||
      activity.sourceWeeklyPlanId !== daily.sourceWeeklyPlanId ||
      observation.rawTextImmutable !== true ||
      typeof observation.rawText !== "string" ||
      typeof observation.deletedAt === "string" ||
      !recordBelongsToClassroomScope(observation, input.scope)
    ) return [];
    const studentIds = Array.isArray(observation.studentIds)
      ? observation.studentIds.filter(
          (id): id is string => typeof id === "string" && UUID_PATTERN.test(id),
        )
      : typeof observation.studentId === "string" && UUID_PATTERN.test(observation.studentId)
        ? [observation.studentId]
        : [];
    const eligibleStudentIds = studentIds.filter(id => input.students.some(student => student.id === id && resolveStudentMembershipOn(student, { ...input.scope, academicYear: input.academicYear, civilDate: observation.civilDate }).eligible));
    if (!eligibleStudentIds.length || observation.civilDate < input.monthly.periodStart || observation.civilDate > input.monthly.periodEnd) return [];
    const curriculumLinks = (linksByObservation.get(observation.id) ?? [])
      .map((link): TeacherMonthlyReviewCurriculumLink => ({
        id: requiredText(link.id, "Program bağı kimliği"),
        observationId: requiredText(link.observationId, "Program bağı gözlemi"),
        referenceCode: requiredText(link.referenceCode, "Program bağı kodu"),
        referenceTitle: requiredText(link.referenceTitle, "Program bağı başlığı"),
        confirmedAt: requiredText(link.confirmedAt, "Program bağı onay zamanı"),
      }))
      .sort((left, right) => left.confirmedAt.localeCompare(right.confirmedAt));
    return [{
      id: observation.id,
      civilDate: requiredText(observation.civilDate, "Aylık gözlem günü"),
      observedAt: observationTimestamp(observation),
      rawText: parseTeacherWeeklyValuesNarrative(
        observation.rawText,
        "Aylık değerlendirmeye bağlı ham gözlem",
      ),
      dailyPlanId: daily.id,
      weeklyPlanId: weekly.id,
      weekTitle: weekly.title,
      activityTitle: typeof activity.title === "string" ? activity.title : "Etkinlik",
      studentIds: [...new Set(eligibleStudentIds)].sort((left, right) => left.localeCompare(right)),
      curriculumLinks,
    }];
  }).sort(
    (left, right) =>
      left.observedAt.localeCompare(right.observedAt) || left.id.localeCompare(right.id),
  );
}

function monthlyEvaluationHistory(
  monthly: TeacherOwnedMonthlyPlan,
): TeacherMonthlyEvaluation[] {
  const evaluations = monthly.monthlyEvaluations ?? [];
  if (evaluations.some((evaluation) => !isTeacherMonthlyEvaluation(evaluation))) {
    fail("graph-integrity", "Aylık değerlendirme geçmişi alan sözleşmesine uymuyor.");
  }
  for (let index = 1; index < evaluations.length; index += 1) {
    if (evaluations[index]!.createdAt < evaluations[index - 1]!.createdAt) {
      fail("graph-integrity", "Aylık değerlendirme geçmişi kronolojik değil.");
    }
  }
  return evaluations.map((evaluation) => structuredClone(evaluation));
}

export async function loadTeacherMonthlyReviewContext(
  store: LocalDataStore,
  monthlyPlanId: string,
): Promise<TeacherMonthlyReviewContext> {
  if (!UUID_PATTERN.test(monthlyPlanId)) {
    fail("invalid-input", "Aylık plan kimliği UUID biçiminde olmalıdır.");
  }
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    fail("active-scope-required", "Aylık değerlendirme için etkin sınıf gereklidir.");
  }
  const monthly = snapshot.plans.find((record) => record.id === monthlyPlanId);
  if (
    !monthly ||
    !isTeacherOwnedPlanRecord(monthly) ||
    monthly.planType !== "monthly" ||
    !recordBelongsToClassroomScope(monthly, scope)
  ) {
    fail("plan-not-found", "Değerlendirilecek öğretmen aylık planı bulunamadı.");
  }
  const academicYear = snapshot.academicYears.find(record => record.id === scope.academicYearId);
  if (!academicYear) fail("graph-integrity", "Aylık değerlendirmenin eğitim yılı bulunamadı.");
  const observations = projectTeacherMonthlyObservations({
    students: snapshot.students, academicYear,
    monthly,
    plans: snapshot.plans,
    activities: snapshot.activities,
    observations: snapshot.observations,
    links: snapshot.evidenceCurriculumLinks,
    scope,
  });
  const activeStudents = activeStudentRecords(snapshot.students, scope, academicYear, monthly).map((student) => ({
    id: student.id,
    displayName:
      typeof student.displayName === "string" && student.displayName.trim()
        ? student.displayName
        : null,
  }));
  return {
    monthly: cloneTeacherOwnedPlan(monthly),
    activeStudents,
    observations,
    availableCoverage: summarizeTeacherMonthlyCoverage(
      observations,
      activeStudents.map((student) => student.id),
    ),
    evaluations: monthlyEvaluationHistory(monthly),
  };
}

export async function recordTeacherMonthlyEvaluation(
  store: LocalDataStore,
  input: RecordTeacherMonthlyEvaluationInput,
): Promise<TeacherMonthlyEvaluation> {
  if (!UUID_PATTERN.test(input.monthlyPlanId)) {
    fail("invalid-input", "Aylık plan kimliği UUID biçiminde olmalıdır.");
  }
  requiredText(input.expectedMonthlyUpdatedAt, "Beklenen aylık plan sürümü");
  const childNarrative = parseTeacherWeeklyValuesNarrative(
    input.childNarrative,
    "Çocuklar yönü öğretmen değerlendirmesi",
  );
  const programNarrative = parseTeacherWeeklyValuesNarrative(
    input.programNarrative,
    "Program yönü öğretmen değerlendirmesi",
  );
  const teacherNarrative = parseTeacherWeeklyValuesNarrative(
    input.teacherNarrative,
    "Öğretmen yönü yansıtması",
  );
  const nextMonthRecommendation = parseTeacherWeeklyValuesNarrative(
    input.nextMonthRecommendation,
    "Sonraki ay önerisi",
  );
  if (
    input.childEvidenceState !== "sufficient-evidence" &&
    input.childEvidenceState !== "insufficient-evidence"
  ) fail("invalid-input", "Çocuklar yönü kanıt durumu açıkça seçilmelidir.");
  const observationIds = [...new Set(input.observationIds)];
  const curriculumLinkIds = [...new Set(input.curriculumLinkIds)];
  if (observationIds.some((id) => !UUID_PATTERN.test(id)) ||
      curriculumLinkIds.some((id) => !UUID_PATTERN.test(id))) {
    fail("invalid-input", "Aylık değerlendirme kanıt kimlikleri geçersiz.");
  }
  const programCriteria = normalizeMonthlyCriteria(
    input.programCriteria,
    TEACHER_MONTHLY_PROGRAM_CRITERIA,
    "Program yönü",
  );
  const teacherCriteria = normalizeMonthlyCriteria(
    input.teacherCriteria,
    TEACHER_MONTHLY_TEACHER_CRITERIA,
    "Öğretmen yönü",
  );
  const now = input.now ?? new Date();
  const timestamp = validTimestamp(now);
  let result: TeacherMonthlyEvaluation | null = null;
  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "students",
      "plans",
      "activities",
      "observations",
      "evidenceCurriculumLinks",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [academicYears, students, plans, activities, observations, links] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("students"),
        transaction.getAll("plans"),
        transaction.getAll("activities"),
        transaction.getAll("observations"),
        transaction.getAll("evidenceCurriculumLinks"),
      ]);
      const monthlyRecord = plans.find((record) => record.id === input.monthlyPlanId);
      if (
        !monthlyRecord ||
        !isTeacherOwnedPlanRecord(monthlyRecord) ||
        monthlyRecord.planType !== "monthly" ||
        !recordBelongsToClassroomScope(monthlyRecord, scope)
      ) fail("plan-not-found", "Değerlendirilecek öğretmen aylık planı bulunamadı.");
      if (monthlyRecord.updatedAt !== input.expectedMonthlyUpdatedAt) {
        fail(
          "concurrent-update",
          "Aylık plan başka bir işlemde güncellendi; son sürüm yüklenmeden değerlendirme yazılmadı.",
        );
      }
      if (civilDateInIstanbul(now) < monthlyRecord.periodEnd) {
        fail(
          "invalid-input",
          `Aylık değerlendirme ${monthlyRecord.periodEnd} günü tamamlanmadan nihai kayıt olarak kaydedilemez.`,
        );
      }
      const annualRecord = plans.find((record) => record.id === monthlyRecord.annualPlanId);
      if (
        !annualRecord ||
        !isTeacherOwnedPlanRecord(annualRecord) ||
        annualRecord.planType !== "annual" ||
        !recordBelongsToClassroomScope(annualRecord, scope)
      ) {
        fail("graph-integrity", "Aylık değerlendirme için yıllık plan zinciri doğrulanamadı.");
      }
      const sourceMonthIndex = annualRecord.monthlySectionIds.indexOf(monthlyRecord.id);
      if (sourceMonthIndex < 0) {
        fail("graph-integrity", "Aylık plan yıllık planın çocuk sırasına bağlı değil.");
      }
      const targetMonthId = annualRecord.monthlySectionIds[sourceMonthIndex + 1] ?? null;
      const targetMonthRecord = targetMonthId
        ? plans.find((record) => record.id === targetMonthId)
        : null;
      if (
        targetMonthId &&
        (!targetMonthRecord ||
          !isTeacherOwnedPlanRecord(targetMonthRecord) ||
          targetMonthRecord.planType !== "monthly" ||
          targetMonthRecord.annualPlanId !== annualRecord.id ||
          !recordBelongsToClassroomScope(targetMonthRecord, scope))
      ) {
        fail("graph-integrity", "Sonraki ay önerisinin hedef planı doğrulanamadı.");
      }
      const targetMonth =
        targetMonthRecord &&
        isTeacherOwnedPlanRecord(targetMonthRecord) &&
        targetMonthRecord.planType === "monthly"
          ? targetMonthRecord
          : null;
      if (targetMonth?.nextMonthDecisionContext) {
        fail(
          "concurrent-update",
          "Sonraki ayda önceki bir öneri kararı var; yeni öneriden önce mevcut karar sonuçlandırılmalıdır.",
        );
      }
      const academicYear = academicYears.find(record => record.id === scope.academicYearId);
      if (!academicYear) fail("graph-integrity", "Aylık değerlendirmenin eğitim yılı bulunamadı.");
      const available = projectTeacherMonthlyObservations({
        students, academicYear,
        monthly: monthlyRecord,
        plans,
        activities,
        observations,
        links,
        scope,
      });
      const availableById = new Map(available.map((observation) => [observation.id, observation]));
      const selected = observationIds.map((id) => {
        const observation = availableById.get(id);
        if (!observation) {
          fail(
            "graph-integrity",
            "Aylık değerlendirme yalnız bu aylık planın gerçek günlük etkinliklerine bağlı değişmez gözlemleri kullanabilir.",
          );
        }
        return observation;
      });
      const selectedLinkIdSet = new Set(curriculumLinkIds);
      const selectedWithLinks = selected.map((observation) => ({
        ...observation,
        curriculumLinks: observation.curriculumLinks.filter((link) =>
          selectedLinkIdSet.has(link.id),
        ),
      }));
      const availableLinkIds = new Set(
        selected.flatMap((observation) => observation.curriculumLinks.map((link) => link.id)),
      );
      if (curriculumLinkIds.some((id) => !availableLinkIds.has(id)) ||
          selectedWithLinks.some((observation) => observation.curriculumLinks.length === 0)) {
        fail(
          "graph-integrity",
          "Seçilen her aylık gözlem için bu gözleme ait en az bir öğretmen onaylı program bağı gerekir.",
        );
      }
      const activeStudents = activeStudentRecords(students, scope, academicYear, monthlyRecord);
      const coverage = summarizeTeacherMonthlyCoverage(
        selectedWithLinks,
        activeStudents.map((student) => student.id),
      );
      if (
        input.childEvidenceState === "sufficient-evidence" &&
        !teacherMonthlyEvidenceMeetsMinimum(coverage)
      ) {
        fail(
          "invalid-input",
          "Yeterli kanıt için en az iki gözlem, iki farklı gün, iki farklı hafta ve dönem içinde sınıfa kayıtlı her çocuğun temsili gerekir.",
        );
      }
      const selectedRecords = [
        monthlyRecord,
        ...observationIds.map((id) => observations.find((record) => record.id === id)),
        ...curriculumLinkIds.map((id) => links.find((record) => record.id === id)),
      ];
      if (
        selectedRecords.some(
          (record) => !record || recordTimestampMillis(record, `records/${record.id}`) >= now.getTime(),
        )
      ) {
        fail(
          "invalid-input",
          "Aylık değerlendirme zamanı bağlı kayıtların son güncellemesinden sonra olmalıdır.",
        );
      }
      const evaluation: TeacherMonthlyEvaluation = {
        id: crypto.randomUUID(),
        monthlyPlanId: monthlyRecord.id,
        periodStart: monthlyRecord.periodStart,
        periodEnd: monthlyRecord.periodEnd,
        children: {
          evidenceState: input.childEvidenceState,
          narrative: childNarrative,
          observationIds,
          curriculumLinkIds,
          coverage,
        },
        program: { narrative: programNarrative, criteria: programCriteria },
        teacher: { narrative: teacherNarrative, criteria: teacherCriteria },
        nextMonthRecommendation,
        sourcePlanRevisionNumber: monthlyRecord.revisionNumber,
        nextMonthTargetPlanId: targetMonth?.id ?? null,
        targetPlanRevisionNumberAtSuggestion: targetMonth?.revisionNumber ?? null,
        teacherAuthored: true,
        createdAt: timestamp,
      };
      if (!isTeacherMonthlyEvaluation(evaluation)) {
        fail("graph-integrity", "Aylık değerlendirme alan sözleşmesine uymuyor.");
      }
      const recordsToPut: TeacherOwnedPlanRecord[] = [{
        ...monthlyRecord,
        monthlyEvaluations: [
          ...monthlyEvaluationHistory(monthlyRecord),
          structuredClone(evaluation),
        ],
        updatedAt: timestamp,
      }];
      if (targetMonth) {
        recordsToPut.push({
          ...cloneTeacherOwnedPlan(targetMonth),
          previousMonthEvaluationId: evaluation.id,
          nextMonthDecisionContext: {
            sourceMonthlyPlanId: monthlyRecord.id,
            evaluationId: evaluation.id,
            recommendation: evaluation.nextMonthRecommendation,
            sourcePlanRevisionNumber: monthlyRecord.revisionNumber,
            targetPlanRevisionNumberAtSuggestion: targetMonth.revisionNumber,
            createdAt: timestamp,
            applicationStatus: "pending-teacher-review",
            reviewHistory: [],
          },
          teacherReviewRequired: true,
          updatedAt: timestamp,
        });
      }
      await transaction.putMany("plans", recordsToPut);
      result = evaluation;
    },
  );
  if (!result) fail("graph-integrity", "Aylık öğretmen değerlendirmesi kaydedilemedi.");
  return result;
}

/**
 * Aylık değerlendirmeden taşınan öneriyi hedef ayda yalnız öğretmenin açık
 * kararıyla uygular. Kabul, ret ve geri-açma olayları append-only tutulur.
 */
export async function reviewTeacherMonthlyCarry(
  store: LocalDataStore,
  input: ReviewTeacherMonthlyCarryInput,
): Promise<TeacherOwnedMonthlyPlan> {
  if (
    !UUID_PATTERN.test(input.monthlyPlanId) ||
    !UUID_PATTERN.test(input.expectedEvaluationId)
  ) {
    fail("invalid-input", "Aylık öneri ve değerlendirme kimlikleri geçersiz.");
  }
  requiredText(input.expectedMonthlyUpdatedAt, "Beklenen aylık plan sürümü");
  const teacherNote = parseTeacherWeeklyValuesNarrative(
    input.teacherNote,
    "Aylık öneri karar gerekçesi",
  );
  const acceptedNarrative = input.action === "accepted"
    ? parseTeacherWeeklyValuesNarrative(
        input.acceptedNarrative,
        "Kabul edilen aylık plan anlatısı",
      )
    : null;
  if (
    input.action !== "accepted" &&
    input.action !== "rejected" &&
    input.action !== "reopened"
  ) {
    fail("invalid-input", "Geçerli bir aylık öneri kararı seçilmelidir.");
  }
  const timestamp = validTimestamp(input.now ?? new Date());
  return store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const plans = await transaction.getAll("plans");
      const candidate = plans.find((record) => record.id === input.monthlyPlanId);
      if (
        !candidate ||
        !isTeacherOwnedPlanRecord(candidate) ||
        candidate.planType !== "monthly" ||
        !recordBelongsToClassroomScope(candidate, scope)
      ) {
        fail("plan-not-found", "İncelenecek aylık öğretmen planı bulunamadı.");
      }
      const context = candidate.nextMonthDecisionContext;
      if (!context || context.evaluationId !== input.expectedEvaluationId) {
        fail("graph-integrity", "Aylık önerinin kaynak değerlendirmesi doğrulanamadı.");
      }
      const source = plans.find((record) => record.id === context.sourceMonthlyPlanId);
      if (
        !source ||
        !isTeacherOwnedPlanRecord(source) ||
        source.planType !== "monthly" ||
        source.annualPlanId !== candidate.annualPlanId ||
        !recordBelongsToClassroomScope(source, scope)
      ) {
        fail("graph-integrity", "Önerinin kaynak aylık planı doğrulanamadı.");
      }
      const evaluation = (source.monthlyEvaluations ?? []).find(
        (entry) => entry.id === context.evaluationId,
      );
      if (
        !evaluation ||
        evaluation.nextMonthTargetPlanId !== candidate.id ||
        evaluation.nextMonthRecommendation !== context.recommendation ||
        evaluation.sourcePlanRevisionNumber !== context.sourcePlanRevisionNumber ||
        evaluation.targetPlanRevisionNumberAtSuggestion !==
          context.targetPlanRevisionNumberAtSuggestion
      ) {
        fail("graph-integrity", "Aylık öneri ile değerlendirme izi uyuşmuyor.");
      }
      const history = [...context.reviewHistory];
      const latest = history.at(-1);
      if (
        latest?.action === input.action &&
        latest.teacherNote === teacherNote &&
        (input.action !== "accepted" ||
          candidate.teacherContent.narrative === acceptedNarrative)
      ) {
        return cloneTeacherOwnedPlan(candidate);
      }
      if (candidate.updatedAt !== input.expectedMonthlyUpdatedAt) {
        fail(
          "concurrent-update",
          "Aylık plan başka bir işlemde güncellendi; öneri son sürüm yüklenmeden değiştirilmedi.",
        );
      }
      if (input.action === "reopened") {
        if (context.applicationStatus === "pending-teacher-review" || !latest) {
          fail("invalid-input", "Henüz karara bağlanmamış aylık öneri yeniden açılamaz.");
        }
        if (candidate.revisionNumber !== latest.targetPlanRevisionNumberAfter) {
          fail(
            "concurrent-update",
            "Aylık karardan sonra plan ayrıca değişti; geri alma son sürüm incelenmeden uygulanmadı.",
          );
        }
      } else {
        if (context.applicationStatus !== "pending-teacher-review") {
          fail("concurrent-update", "Aylık öneri daha önce karara bağlandı.");
        }
        if (
          input.action === "accepted" &&
          candidate.revisionNumber !==
            (latest?.action === "reopened"
              ? latest.targetPlanRevisionNumberAfter
              : context.targetPlanRevisionNumberAtSuggestion)
        ) {
          fail(
            "concurrent-update",
            "Öneri hazırlandıktan sonra hedef ay değişti; kabulden önce yeniden inceleyin.",
          );
        }
      }
      const latestRecordTime = Math.max(
        Date.parse(candidate.updatedAt),
        Date.parse(source.updatedAt),
        Date.parse(context.createdAt),
      );
      if (Date.parse(timestamp) <= latestRecordTime) {
        fail(
          "invalid-input",
          "Aylık öneri kararı bağlı plan ve değerlendirmeden sonra kaydedilmelidir.",
        );
      }
      let teacherContent = structuredClone(candidate.teacherContent);
      if (input.action === "accepted") {
        teacherContent = { ...teacherContent, narrative: acceptedNarrative as string };
      } else if (input.action === "reopened" && latest?.action === "accepted") {
        const beforeAcceptance = candidate.revisionHistory.find(
          (snapshot) =>
            snapshot.revisionNumber === latest.targetPlanRevisionNumberBefore,
        );
        if (!beforeAcceptance) {
          fail("graph-integrity", "Kabul öncesi aylık plan sürümü geri alma için bulunamadı.");
        }
        teacherContent = structuredClone(beforeAcceptance.teacherContent);
      }
      const event = {
        id: crypto.randomUUID(),
        action: input.action,
        teacherNote,
        createdAt: timestamp,
        targetPlanRevisionNumberBefore: candidate.revisionNumber,
        targetPlanRevisionNumberAfter: candidate.revisionNumber + 1,
      } as const;
      const next: TeacherOwnedMonthlyPlan = {
        ...cloneTeacherOwnedPlan(candidate),
        teacherContent,
        revisionNumber: candidate.revisionNumber + 1,
        revisionHistory: [
          ...candidate.revisionHistory.map((snapshot) => structuredClone(snapshot)),
          {
            revisionNumber: candidate.revisionNumber,
            title: candidate.title,
            teacherContent: structuredClone(candidate.teacherContent),
            periodStart: candidate.periodStart,
            periodEnd: candidate.periodEnd,
            updatedAt: candidate.updatedAt,
            capturedAt: timestamp,
          },
        ],
        nextMonthDecisionContext: {
          ...structuredClone(context),
          applicationStatus:
            input.action === "reopened" ? "pending-teacher-review" : input.action,
          reviewHistory: [...history.map((entry) => structuredClone(entry)), event],
        },
        teacherReviewRequired: input.action === "reopened",
        updatedAt: timestamp,
      };
      if (!isTeacherOwnedPlanRecord(next)) {
        fail("graph-integrity", "Aylık öneri kararı plan sözleşmesine uymuyor.");
      }
      await transaction.putMany("plans", [next]);
      return cloneTeacherOwnedPlan(next);
    },
  );
}
