import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";

export type TeacherCyclePeriodRelation = "current" | "upcoming" | "past";
export type TeacherCycleDailyStatus =
  | "missing"
  | "ready"
  | "conflict"
  | "chain-mismatch"
  | "future-only";

export interface TeacherCyclePlanPeriod {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  relation: TeacherCyclePeriodRelation;
}

export interface TeacherWorkCycleWorkspace {
  status: "not-configured" | "ready";
  civilDate: string;
  annual: TeacherCyclePlanPeriod | null;
  monthly: (TeacherCyclePlanPeriod & {
    weeklyPlanCount: number;
    dailyPlanCount: number;
    observationCount: number;
    linkedObservationCount: number;
    evaluationCount: number;
  }) | null;
  weekly: (TeacherCyclePlanPeriod & {
    dailyPlanCount: number;
    observationCount: number;
    linkedObservationCount: number;
    evaluationCount: number;
  }) | null;
  daily: {
    status: TeacherCycleDailyStatus;
    planId: string | null;
    conflictingPlanIds: readonly string[];
    referencePlanId?: string | null;
    referenceCivilDate?: string | null;
    referenceTitle?: string | null;
    title: string;
    activityCount: number;
    completedActivityCount: number;
    observationCount: number;
  };
  documents: {
    anecdoteIncompleteCount: number;
    anecdoteReviewRequiredCount: number;
    anecdoteReadyCount: number;
    monthlyEvaluationCount: number;
    planDocumentReady: boolean;
    planMonthCount?: number;
    planWeekCount?: number;
    planDailyCount?: number;
  };
  pendingCurriculumLinkCount: number;
}

export interface TeacherWorkCycleDocumentCounts {
  anecdoteIncompleteCount: number;
  anecdoteReviewRequiredCount: number;
  anecdoteReadyCount: number;
}

const EMPTY_DOCUMENT_COUNTS: TeacherWorkCycleDocumentCounts = Object.freeze({
  anecdoteIncompleteCount: 0,
  anecdoteReviewRequiredCount: 0,
  anecdoteReadyCount: 0,
});

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((candidate): candidate is string => typeof candidate === "string")
    : [];
}

function isLive(record: StoredRecord): boolean {
  return typeof record.deletedAt !== "string";
}

function inScope(
  record: StoredRecord,
  scope: { academicYearId: string; classroomId: string },
): boolean {
  return recordBelongsToClassroomScope(record, scope);
}

function periodRelation(
  periodStart: string,
  periodEnd: string,
  civilDate: string,
): TeacherCyclePeriodRelation {
  if (civilDate < periodStart) return "upcoming";
  if (civilDate > periodEnd) return "past";
  return "current";
}

function selectPeriodPlan(
  records: readonly StoredRecord[],
  planType: "annual" | "monthly" | "weekly",
  civilDate: string,
): StoredRecord | null {
  const candidates = records
    .filter(
      (record) =>
        record.planType === planType &&
        isLive(record) &&
        typeof record.periodStart === "string" &&
        typeof record.periodEnd === "string",
    )
    .sort((left, right) => {
      const originOrder =
        (left.planOrigin === "teacher-authored" ? 0 : 1) -
        (right.planOrigin === "teacher-authored" ? 0 : 1);
      const leftStart = String(left.periodStart);
      const rightStart = String(right.periodStart);
      return (
        originOrder ||
        leftStart.localeCompare(rightStart) ||
        left.id.localeCompare(right.id)
      );
    });
  const current = candidates.find(
    (record) =>
      String(record.periodStart) <= civilDate &&
      String(record.periodEnd) >= civilDate,
  );
  if (current) return current;
  const upcoming = candidates.find(
    (record) => String(record.periodStart) > civilDate,
  );
  return upcoming ?? candidates.at(-1) ?? null;
}

function planPeriod(
  record: StoredRecord,
  civilDate: string,
): TeacherCyclePlanPeriod {
  const periodStart = String(record.periodStart);
  const periodEnd = String(record.periodEnd);
  return {
    id: record.id,
    title: text(record.title, "Adsız plan"),
    periodStart,
    periodEnd,
    relation: periodRelation(periodStart, periodEnd, civilDate),
  };
}

export function emptyTeacherWorkCycle(
  civilDate: string,
): TeacherWorkCycleWorkspace {
  return {
    status: "not-configured",
    civilDate,
    annual: null,
    monthly: null,
    weekly: null,
    daily: {
      status: "missing",
      planId: null,
      conflictingPlanIds: [],
      referencePlanId: null,
      referenceCivilDate: null,
      referenceTitle: null,
      title: "Bugün için plan yok",
      activityCount: 0,
      completedActivityCount: 0,
      observationCount: 0,
    },
    documents: {
      ...EMPTY_DOCUMENT_COUNTS,
      monthlyEvaluationCount: 0,
      planDocumentReady: false,
      planMonthCount: 0,
      planWeekCount: 0,
      planDailyCount: 0,
    },
    pendingCurriculumLinkCount: 0,
  };
}

export function resolveTeacherWorkCycle(
  snapshot: DataSnapshot,
  options: {
    civilDate: string;
    documents?: TeacherWorkCycleDocumentCounts;
  },
): TeacherWorkCycleWorkspace {
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return emptyTeacherWorkCycle(options.civilDate);

  const documents = options.documents ?? EMPTY_DOCUMENT_COUNTS;
  const plans = snapshot.plans.filter(
    (record) => isLive(record) && inScope(record, scope),
  );
  const activities = snapshot.activities.filter(
    (record) => isLive(record) && inScope(record, scope),
  );
  const observations = snapshot.observations.filter(
    (record) => isLive(record) && inScope(record, scope),
  );
  const curriculumLinks = snapshot.evidenceCurriculumLinks.filter(
    (record) => isLive(record) && inScope(record, scope),
  );
  const linkedObservationIds = new Set(
    curriculumLinks.flatMap((record) =>
      typeof record.observationId === "string" ? [record.observationId] : [],
    ),
  );

  const annualRecord = selectPeriodPlan(plans, "annual", options.civilDate);
  const monthlyRecord = selectPeriodPlan(
    annualRecord
      ? plans.filter((record) => record.annualPlanId === annualRecord.id)
      : [],
    "monthly",
    options.civilDate,
  );
  const weeklyRecord = selectPeriodPlan(
    monthlyRecord
      ? plans.filter((record) => record.monthlyPlanId === monthlyRecord.id)
      : [],
    "weekly",
    options.civilDate,
  );
  const sameDayRecords = plans
    .filter(
      (record) =>
        record.planType === "daily" &&
        record.civilDate === options.civilDate,
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const dailyHasConflict = sameDayRecords.length > 1;
  const soleSameDayRecord =
    sameDayRecords.length === 1 ? sameDayRecords[0] : null;
  const chainMismatchRecord =
    soleSameDayRecord &&
    weeklyRecord &&
    soleSameDayRecord.sourceWeeklyPlanId !== weeklyRecord.id
      ? soleSameDayRecord
      : null;
  const dailyRecord =
    soleSameDayRecord && !chainMismatchRecord ? soleSameDayRecord : null;
  const futureRecord =
    sameDayRecords.length === 0
      ? plans
          .filter(
            (record) =>
              record.planType === "daily" &&
              typeof record.civilDate === "string" &&
              record.civilDate > options.civilDate,
          )
          .sort((left, right) => {
            const dateOrder = String(left.civilDate).localeCompare(
              String(right.civilDate),
            );
            const originOrder =
              (left.planOrigin === "teacher-authored" ? 0 : 1) -
              (right.planOrigin === "teacher-authored" ? 0 : 1);
            return dateOrder || originOrder || left.id.localeCompare(right.id);
          })[0] ?? null
      : null;
  const dailyPlanIds = new Set(dailyRecord ? [dailyRecord.id] : []);
  const dailyActivities = activities.filter(
    (record) =>
      typeof record.planId === "string" && dailyPlanIds.has(record.planId),
  );
  const dailyObservations = observations.filter(
    (record) =>
      typeof record.planId === "string" && dailyPlanIds.has(record.planId),
  );

  const weeklyDailyPlans = weeklyRecord
    ? plans.filter(
        (record) =>
          record.planType === "daily" &&
          record.sourceWeeklyPlanId === weeklyRecord.id,
      )
    : [];
  const weeklyDailyPlanIds = new Set(weeklyDailyPlans.map((record) => record.id));
  const weeklyObservations = observations.filter(
    (record) =>
      typeof record.planId === "string" && weeklyDailyPlanIds.has(record.planId),
  );

  const monthlyWeeklyPlanIds = monthlyRecord
    ? new Set(stringArray(monthlyRecord.weeklySectionIds))
    : new Set<string>();
  const monthlyDailyPlans = plans.filter(
    (record) =>
      record.planType === "daily" &&
      typeof record.sourceWeeklyPlanId === "string" &&
      monthlyWeeklyPlanIds.has(record.sourceWeeklyPlanId),
  );
  const monthlyDailyPlanIds = new Set(monthlyDailyPlans.map((record) => record.id));
  const monthlyObservations = observations.filter(
    (record) =>
      typeof record.planId === "string" && monthlyDailyPlanIds.has(record.planId),
  );
  const monthlyEvaluationCount = monthlyRecord && Array.isArray(monthlyRecord.monthlyEvaluations)
    ? monthlyRecord.monthlyEvaluations.length
    : 0;
  const annualMonthlyPlans = annualRecord
    ? plans.filter(
        (record) =>
          record.planType === "monthly" && record.annualPlanId === annualRecord.id,
      )
    : [];
  const annualMonthlyPlanIds = new Set(annualMonthlyPlans.map((record) => record.id));
  const annualWeeklyPlans = plans.filter(
    (record) =>
      record.planType === "weekly" &&
      typeof record.monthlyPlanId === "string" &&
      annualMonthlyPlanIds.has(record.monthlyPlanId),
  );
  const annualWeeklyPlanIds = new Set(annualWeeklyPlans.map((record) => record.id));
  const annualDailyPlans = plans.filter(
    (record) =>
      record.planType === "daily" &&
      typeof record.sourceWeeklyPlanId === "string" &&
      annualWeeklyPlanIds.has(record.sourceWeeklyPlanId),
  );

  return {
    status: "ready",
    civilDate: options.civilDate,
    annual: annualRecord ? planPeriod(annualRecord, options.civilDate) : null,
    monthly: monthlyRecord
      ? {
          ...planPeriod(monthlyRecord, options.civilDate),
          weeklyPlanCount: monthlyWeeklyPlanIds.size,
          dailyPlanCount: monthlyDailyPlans.length,
          observationCount: monthlyObservations.length,
          linkedObservationCount: monthlyObservations.filter((record) =>
            linkedObservationIds.has(record.id),
          ).length,
          evaluationCount: monthlyEvaluationCount,
        }
      : null,
    weekly: weeklyRecord
      ? {
          ...planPeriod(weeklyRecord, options.civilDate),
          dailyPlanCount: weeklyDailyPlans.length,
          observationCount: weeklyObservations.length,
          linkedObservationCount: weeklyObservations.filter((record) =>
            linkedObservationIds.has(record.id),
          ).length,
          evaluationCount: Array.isArray(weeklyRecord.weeklyEvaluations)
            ? weeklyRecord.weeklyEvaluations.length
            : 0,
        }
      : null,
    daily: {
      status: dailyHasConflict
        ? "conflict"
        : chainMismatchRecord
          ? "chain-mismatch"
          : dailyRecord
            ? "ready"
            : futureRecord
              ? "future-only"
              : "missing",
      planId: dailyRecord?.id ?? null,
      conflictingPlanIds: dailyHasConflict
        ? sameDayRecords.map((record) => record.id)
        : [],
      referencePlanId:
        chainMismatchRecord?.id ?? futureRecord?.id ?? null,
      referenceCivilDate:
        typeof chainMismatchRecord?.civilDate === "string"
          ? chainMismatchRecord.civilDate
          : typeof futureRecord?.civilDate === "string"
            ? futureRecord.civilDate
            : null,
      referenceTitle:
        chainMismatchRecord
          ? text(chainMismatchRecord.title, "Günlük plan")
          : futureRecord
            ? text(futureRecord.title, "Günlük plan")
            : null,
      title: dailyHasConflict
        ? "Günlük plan çakışması"
        : chainMismatchRecord
          ? "Bugün tarihli plan bağlantı bekliyor"
        : dailyRecord
          ? text(dailyRecord.title, "Günlük plan")
          : "Bugün için plan yok",
      activityCount: dailyActivities.length,
      completedActivityCount: dailyActivities.filter(
        (record) => record.status === "completed",
      ).length,
      observationCount: dailyObservations.length,
    },
    documents: {
      ...documents,
      monthlyEvaluationCount,
      planDocumentReady: annualRecord !== null && monthlyRecord !== null,
      planMonthCount: annualMonthlyPlans.length,
      planWeekCount: annualWeeklyPlans.length,
      planDailyCount: annualDailyPlans.length,
    },
    pendingCurriculumLinkCount: observations.filter(
      (record) => !linkedObservationIds.has(record.id),
    ).length,
  };
}

export async function loadTeacherWorkCycle(
  store: LocalDataStore,
  options: {
    civilDate: string;
    documents?: TeacherWorkCycleDocumentCounts;
  },
): Promise<TeacherWorkCycleWorkspace> {
  return resolveTeacherWorkCycle(await store.readSnapshot(), options);
}
