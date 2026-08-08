import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { migrateLegacyClassroomScopes } from "../../core/migrations/classroom-scope-migration.ts";
import type {
  CurriculumAssignmentMode,
  CurriculumTargetSnapshot,
} from "../curriculum/curriculum-catalog.ts";
import type {
  PremiumDailyFlowBlockDraft,
  PremiumFullDayFlowBlock,
} from "../premium-plans/domain.ts";

export interface ScheduledPlanSummary {
  planId: string;
  activityId: string | null;
  civilDate: string;
  planTitle: string;
  activityTitle: string;
  premium: boolean;
  flowBlockCount: number;
  persistedActivityCount: number;
  editable: boolean;
  editBlockReason: string | null;
  integrityStatus: "valid" | "invalid";
  planUpdatedAt: string;
  activityUpdatedAt: string | null;
}

export interface ScheduledPlanWorkspace {
  plans: ScheduledPlanSummary[];
}

export interface ScheduledPlanEditDraft {
  planId: string;
  activityId: string;
  expectedPlanUpdatedAt: string;
  expectedActivityUpdatedAt: string;
  civilDate: string;
  planTitle: string;
  activityTitle: string;
  startTime: string;
  endTime?: string;
  premium: boolean;
  allowedDateStart: string;
  allowedDateEnd: string;
  curriculumTargets: CurriculumTargetSnapshot[];
  assignmentMode: CurriculumAssignmentMode;
  studentIds: string[];
  flowDefinition: PremiumFullDayFlowBlock[];
  flowBlocks: PremiumDailyFlowBlockDraft[];
}

interface PremiumFlowShape {
  planCivilDate: string;
  sourceWeekId: string;
  selectedActivityTemplateId: string;
  blocks: Array<Record<string, unknown>>;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sameCanonical(left: unknown, right: unknown): boolean {
  try {
    return canonicalJson(left) === canonicalJson(right);
  } catch {
    return false;
  }
}

function snapshotById(value: unknown, id: string): unknown | null {
  if (!Array.isArray(value)) return null;
  return value.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      "id" in candidate &&
      candidate.id === id,
  ) ?? null;
}

function parsePremiumFlow(plan: StoredRecord): PremiumFlowShape | null {
  const raw = plan.premiumDailyFlowSnapshot;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const flow = raw as Record<string, unknown>;
  const planCivilDate = text(flow.planCivilDate);
  const sourceWeekId = text(flow.sourceWeekId);
  const selectedActivityTemplateId = text(flow.selectedActivityTemplateId);
  if (
    !planCivilDate ||
    !isCivilDate(planCivilDate) ||
    !sourceWeekId ||
    !selectedActivityTemplateId ||
    !Array.isArray(flow.blocks) ||
    flow.blocks.length !== 10
  ) {
    return null;
  }
  const blocks: Array<Record<string, unknown>> = [];
  const blockIds = new Set<string>();
  for (const candidate of flow.blocks) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return null;
    }
    const block = candidate as Record<string, unknown>;
    const id = text(block.id);
    if (
      !id ||
      blockIds.has(id) ||
      !text(block.title) ||
      !["planned", "optional", "skipped"].includes(String(block.status)) ||
      !Number.isInteger(block.durationMinutes) ||
      Number(block.durationMinutes) < 5 ||
      Number(block.durationMinutes) > 240 ||
      typeof block.transitionNote !== "string" ||
      block.transitionNote.length > 500 ||
      typeof block.teacherNote !== "string" ||
      block.teacherNote.length > 1_000 ||
      !Array.isArray(block.selectedActivityTemplateIds) ||
      !Array.isArray(block.alternativeActivityTemplateIds) ||
      !Array.isArray(block.appliedActivityTemplateIds) ||
      ![
        block.selectedActivityTemplateIds,
        block.alternativeActivityTemplateIds,
        block.appliedActivityTemplateIds,
      ].every((ids) => ids.every((idValue) => typeof idValue === "string"))
    ) {
      return null;
    }
    blockIds.add(id);
    blocks.push(block);
  }
  return { planCivilDate, sourceWeekId, selectedActivityTemplateId, blocks };
}

function scopedPlan(
  plans: readonly StoredRecord[],
  id: unknown,
  planType: string,
  scope: ActiveClassroomScope,
): StoredRecord | null {
  if (typeof id !== "string") return null;
  return plans.find(
    (candidate) =>
      candidate.id === id &&
      candidate.planType === planType &&
      typeof candidate.deletedAt !== "string" &&
      recordBelongsToClassroomScope(candidate, scope),
  ) ?? null;
}

/**
 * Kayıtlı premium planın kaynak zincirini salt okunur doğrular. Lisans/entitlement
 * istemez; yalnız öğretmenin cihazındaki kalıcı kaydın kendi kaynaklarıyla tutarlı
 * olup olmadığını denetler.
 */
export function scheduledPlanIntegrityIssue(options: {
  plan: StoredRecord;
  activity: StoredRecord | null;
  plans: readonly StoredRecord[];
  scope: ActiveClassroomScope;
}): string | null {
  const { plan, activity, plans, scope } = options;
  if (activity && activity.civilDate !== plan.civilDate) {
    return "Plan ile gerçek etkinliğin kayıtlı tarihleri uyuşmuyor.";
  }
  const hasPremiumMarkers =
    plan.premiumDailyFlowSnapshot !== undefined ||
    plan.sourceWeeklyPlanId !== undefined ||
    plan.sourceContentPackSnapshot !== undefined;
  if (!hasPremiumMarkers) return null;

  const flow = parsePremiumFlow(plan);
  if (!flow || flow.planCivilDate !== plan.civilDate) {
    return "Kayıtlı tam gün akışının tarih veya 10 blok bütünlüğü doğrulanamadı.";
  }
  const annual = scopedPlan(plans, plan.sourceAnnualPlanId, "annual", scope);
  const monthly = scopedPlan(plans, plan.sourceMonthlyPlanId, "monthly", scope);
  const weekly = scopedPlan(plans, plan.sourceWeeklyPlanId, "weekly", scope);
  if (!annual || !monthly || !weekly) {
    return "Kayıtlı planın yıllık, aylık veya haftalık kaynak zinciri eksik.";
  }
  if (
    monthly.annualPlanId !== annual.id ||
    weekly.annualPlanId !== annual.id ||
    weekly.monthlyPlanId !== monthly.id ||
    weekly.weekId !== flow.sourceWeekId ||
    flow.selectedActivityTemplateId !== plan.sourceActivityTemplateId ||
    plan.civilDate < String(weekly.periodStart) ||
    plan.civilDate > String(weekly.periodEnd) ||
    !sameCanonical(plan.sourceContentPackSnapshot, annual.contentPackSnapshot) ||
    !sameCanonical(plan.sourceContentPackSnapshot, monthly.contentPackSnapshot) ||
    !sameCanonical(plan.sourceContentPackSnapshot, weekly.contentPackSnapshot)
  ) {
    return "Kayıtlı planın kaynak hafta veya içerik paketi zinciri değişmiş.";
  }
  const sourceTemplateId = text(plan.sourceActivityTemplateId);
  const appliedTemplateId = text(plan.appliedActivityTemplateId);
  if (!sourceTemplateId || !appliedTemplateId) {
    return "Kayıtlı planın kaynak etkinlik kimliği eksik.";
  }
  const weeklySource = snapshotById(weekly.premiumActivityTemplates, sourceTemplateId);
  const monthlySource = snapshotById(monthly.premiumActivityTemplates, sourceTemplateId);
  const weeklyApplied = snapshotById(weekly.premiumActivityTemplates, appliedTemplateId);
  const monthlyApplied = snapshotById(monthly.premiumActivityTemplates, appliedTemplateId);
  if (
    !weeklySource ||
    !monthlySource ||
    !weeklyApplied ||
    !monthlyApplied ||
    !sameCanonical(weeklySource, plan.sourceActivityTemplateSnapshot) ||
    !sameCanonical(monthlySource, plan.sourceActivityTemplateSnapshot) ||
    !sameCanonical(weeklyApplied, plan.appliedActivityTemplateSnapshot) ||
    !sameCanonical(monthlyApplied, plan.appliedActivityTemplateSnapshot)
  ) {
    return "Kayıtlı planın etkinlik kaynak görüntüsü doğrulanamadı.";
  }
  if (activity) {
    const provenanceKeys = [
      "sourceAnnualPlanId",
      "sourceMonthlyPlanId",
      "sourceWeeklyPlanId",
      "sourceContentPackSnapshot",
      "sourceActivityTemplateId",
      "sourceActivityTemplateSnapshot",
      "appliedActivityTemplateId",
      "appliedActivityTemplateSnapshot",
      "teacherPreferredLensId",
      "teacherPreferredSupportingLensIds",
      "lensSelectionMode",
    ] as const;
    if (
      provenanceKeys.some(
        (key) => !sameCanonical(plan[key], activity[key]),
      )
    ) {
      return "Plan ile etkinlik arasındaki premium kaynak zinciri uyuşmuyor.";
    }
  }
  return null;
}

function editBlockReason(options: {
  plan: StoredRecord;
  activities: readonly StoredRecord[];
  observations: readonly StoredRecord[];
  integrityIssue: string | null;
  today: string;
}): string | null {
  const { plan, activities, observations, integrityIssue, today } = options;
  if (integrityIssue) return integrityIssue;
  if (activities.length !== 1) {
    return "Düzenleme için günlük plana bağlı tek bir gerçek etkinlik bulunmalıdır.";
  }
  const activity = activities[0];
  if (plan.civilDate <= today) {
    return "Yalnız henüz başlamamış gelecek tarihli planlar düzenlenebilir.";
  }
  if (plan.coverageStatus !== "planned" || activity.status !== "planned") {
    return "Başlamış veya tamamlanmış planlar düzenlenemez.";
  }
  if (
    observations.some(
      (observation) =>
        typeof observation.deletedAt !== "string" &&
        (observation.planId === plan.id || observation.activityId === activity.id),
    )
  ) {
    return "Gözlem kanıtı bulunan planlar geriye dönük değiştirilemez.";
  }
  return null;
}

export function resolveScheduledPlanWorkspace(
  snapshot: DataSnapshot,
  options: { civilDate?: string; now?: Date } = {},
): ScheduledPlanWorkspace {
  if (options.civilDate && !isCivilDate(options.civilDate)) {
    throw new Error("Plan günü YYYY-AA-GG biçiminde olmalıdır.");
  }
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return { plans: [] };
  const today = civilDateInIstanbul(options.now ?? new Date());
  const plans = snapshot.plans
    .filter(
      (plan) =>
        plan.planType === "daily" &&
        typeof plan.deletedAt !== "string" &&
        recordBelongsToClassroomScope(plan, scope) &&
        (!options.civilDate || plan.civilDate === options.civilDate),
    )
    .map((plan): ScheduledPlanSummary => {
      const activities = snapshot.activities.filter(
        (activity) =>
          activity.planId === plan.id &&
          typeof activity.deletedAt !== "string" &&
          recordBelongsToClassroomScope(activity, scope),
      );
      const activity = activities.length === 1 ? activities[0] : null;
      const premiumFlow = parsePremiumFlow(plan);
      const integrityIssue = scheduledPlanIntegrityIssue({
        plan,
        activity,
        plans: snapshot.plans,
        scope,
      });
      const reason = editBlockReason({
        plan,
        activities,
        observations: snapshot.observations,
        integrityIssue,
        today,
      });
      return {
        planId: plan.id,
        activityId: activity?.id ?? null,
        civilDate: String(plan.civilDate),
        planTitle: text(plan.title) ?? "Başlıksız günlük plan",
        activityTitle: text(activity?.title) ?? "Etkinlik kaydı eksik",
        premium: premiumFlow !== null || plan.premiumDailyFlowSnapshot !== undefined,
        flowBlockCount: premiumFlow?.blocks.length ?? 0,
        persistedActivityCount: activities.length,
        editable: reason === null,
        editBlockReason: reason,
        integrityStatus: integrityIssue ? "invalid" : "valid",
        planUpdatedAt: plan.updatedAt,
        activityUpdatedAt: activity?.updatedAt ?? null,
      };
    })
    .sort(
      (left, right) =>
        left.civilDate.localeCompare(right.civilDate) ||
        left.planTitle.localeCompare(right.planTitle, "tr-TR") ||
        left.planId.localeCompare(right.planId),
    );
  return { plans };
}

export async function loadScheduledPlanWorkspace(
  store: LocalDataStore,
  options: { civilDate?: string; now?: Date } = {},
): Promise<ScheduledPlanWorkspace> {
  await migrateLegacyClassroomScopes(store, { now: options.now });
  return resolveScheduledPlanWorkspace(await store.readSnapshot(), options);
}

function asCurriculumTargets(value: unknown): CurriculumTargetSnapshot[] {
  return Array.isArray(value)
    ? structuredClone(value as CurriculumTargetSnapshot[])
    : [];
}

function asStudentIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string")
    : [];
}

export function resolveScheduledPlanEditDraft(
  snapshot: DataSnapshot,
  options: { planId: string; now?: Date },
): ScheduledPlanEditDraft {
  const workspace = resolveScheduledPlanWorkspace(snapshot, { now: options.now });
  const summary = workspace.plans.find((plan) => plan.planId === options.planId);
  if (!summary) throw new Error("Düzenlenecek günlük plan etkin sınıfta bulunamadı.");
  if (!summary.editable || !summary.activityId) {
    throw new Error(summary.editBlockReason ?? "Bu günlük plan düzenlenemez.");
  }
  const plan = snapshot.plans.find((record) => record.id === summary.planId)!;
  const activity = snapshot.activities.find((record) => record.id === summary.activityId)!;
  const academicYear = snapshot.academicYears.find(
    (record) => record.id === plan.academicYearId,
  );
  if (
    !academicYear ||
    !isCivilDate(String(academicYear.startDate)) ||
    !isCivilDate(String(academicYear.endDate))
  ) {
    throw new Error("Planın eğitim yılı tarih aralığı doğrulanamadı.");
  }
  const weekly = typeof plan.sourceWeeklyPlanId === "string"
    ? snapshot.plans.find((record) => record.id === plan.sourceWeeklyPlanId)
    : null;
  const flow = parsePremiumFlow(plan);
  const assignmentMode = activity.assignmentMode === "selected-students"
    ? "selected-students"
    : "whole-class";
  return {
    planId: plan.id,
    activityId: activity.id,
    expectedPlanUpdatedAt: plan.updatedAt,
    expectedActivityUpdatedAt: activity.updatedAt,
    civilDate: String(plan.civilDate),
    planTitle: text(plan.title) ?? "Günlük öğrenme planı",
    activityTitle: text(activity.title) ?? "Etkinlik",
    startTime: text(activity.startTime) ?? "09:00",
    ...(text(activity.endTime) ? { endTime: text(activity.endTime)! } : {}),
    premium: flow !== null,
    allowedDateStart:
      weekly && isCivilDate(String(weekly.periodStart))
        ? String(weekly.periodStart)
        : String(academicYear.startDate),
    allowedDateEnd:
      weekly && isCivilDate(String(weekly.periodEnd))
        ? String(weekly.periodEnd)
        : String(academicYear.endDate),
    curriculumTargets: asCurriculumTargets(activity.curriculumTargets),
    assignmentMode,
    studentIds: asStudentIds(activity.studentIds),
    flowDefinition: flow
      ? flow.blocks.map((block) => ({
          id: String(block.id),
          title: String(block.title),
          purpose: text(block.purpose) ?? "Öğretmen tarafından düzenlenen günlük akış bloğu.",
          flexibilityNote: text(block.flexibilityNote) ?? "Sınıfın ritmine göre esnetilebilir.",
        })) as PremiumFullDayFlowBlock[]
      : [],
    flowBlocks: flow
      ? flow.blocks.map((block) => ({
          id: String(block.id) as PremiumDailyFlowBlockDraft["id"],
          status: block.status as PremiumDailyFlowBlockDraft["status"],
          durationMinutes: Number(block.durationMinutes),
          transitionNote: String(block.transitionNote),
          teacherNote: String(block.teacherNote),
        }))
      : [],
  };
}

export async function loadScheduledPlanEditDraft(
  store: LocalDataStore,
  options: { planId: string; now?: Date },
): Promise<ScheduledPlanEditDraft> {
  await migrateLegacyClassroomScopes(store, { now: options.now });
  return resolveScheduledPlanEditDraft(await store.readSnapshot(), options);
}
