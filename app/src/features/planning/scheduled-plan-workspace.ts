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
import {
  isTeacherOwnedDailyFlow,
  type TeacherOwnedActivityFlowBlockKind,
  type TeacherOwnedDailyFlowBlockDraft,
  type TeacherOwnedDailyFlowBlockEdit,
} from "../../core/domain/teacher-owned-daily-flow.ts";
import { isTeacherOwnedPlanRecord } from "../../core/domain/teacher-owned-plan.ts";
import {
  planRelationFinding,
  type PlanIntegrityFinding,
  type PlanIntegrityFindingCode,
  type PlanRelationFinding,
  type PlanRelationFindingCode,
} from "./plan-relation-policy.ts";

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
  editBlockCode: PlanRelationFindingCode | null;
  editBlockSupportCode: string | null;
  integrityStatus: "valid" | "invalid";
  integrityCode: PlanIntegrityFindingCode | null;
  integritySupportCode: string | null;
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
  teacherOwnedDailyFlowBlocks: TeacherOwnedDailyFlowBlockEdit[];
  teacherOwnedActivityBlockKind: TeacherOwnedActivityFlowBlockKind | null;
}

export interface TeacherOwnedDailyFlowCopySource {
  planId: string;
  weeklyPlanId: string;
  civilDate: string;
  planTitle: string;
  flowRevisionNumber: number;
  blocks: TeacherOwnedDailyFlowBlockDraft[];
  activityBlockKind: TeacherOwnedActivityFlowBlockKind;
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
export function scheduledPlanIntegrityFinding(options: {
  plan: StoredRecord;
  activity: StoredRecord | null;
  plans: readonly StoredRecord[];
  scope: ActiveClassroomScope;
}): Readonly<PlanIntegrityFinding> | null {
  const { plan, activity, plans, scope } = options;
  if (activity && activity.civilDate !== plan.civilDate) {
    return planRelationFinding("plan.integrity.activity-date");
  }
  if (plan.teacherOwnedDailyFlow !== undefined) {
    if (!isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow)) {
      return planRelationFinding("plan.integrity.teacher-flow-shape");
    }
    const annual = scopedPlan(plans, plan.sourceAnnualPlanId, "annual", scope);
    const monthly = scopedPlan(plans, plan.sourceMonthlyPlanId, "monthly", scope);
    const weekly = scopedPlan(plans, plan.sourceWeeklyPlanId, "weekly", scope);
    if (
      !annual ||
      !monthly ||
      !weekly ||
      !isTeacherOwnedPlanRecord(annual) ||
      !isTeacherOwnedPlanRecord(monthly) ||
      !isTeacherOwnedPlanRecord(weekly) ||
      annual.planType !== "annual" ||
      monthly.planType !== "monthly" ||
      weekly.planType !== "weekly" ||
      monthly.annualPlanId !== annual.id ||
      weekly.annualPlanId !== annual.id ||
      weekly.monthlyPlanId !== monthly.id ||
      !annual.monthlySectionIds.includes(monthly.id) ||
      !monthly.weeklySectionIds.includes(weekly.id) ||
      String(plan.civilDate) < weekly.periodStart ||
      String(plan.civilDate) > weekly.periodEnd
    ) {
      return planRelationFinding("plan.integrity.teacher-source-chain");
    }
    if (
      activity &&
      (activity.sourceAnnualPlanId !== annual.id ||
        activity.sourceMonthlyPlanId !== monthly.id ||
        activity.sourceWeeklyPlanId !== weekly.id)
    ) {
      return planRelationFinding("plan.integrity.teacher-activity-source");
    }
    if (activity?.teacherOwnedFlowBlockId !== undefined) {
      const linkedBlock = typeof activity.teacherOwnedFlowBlockId === "string"
        ? plan.teacherOwnedDailyFlow.blocks.find(
            (block) => block.id === activity.teacherOwnedFlowBlockId,
          )
        : null;
      if (
        !linkedBlock ||
        (linkedBlock.kind !== "teacher-activity-one" &&
          linkedBlock.kind !== "teacher-activity-two") ||
        linkedBlock.status === "skipped"
      ) {
        return planRelationFinding("plan.integrity.teacher-flow-block");
      }
    }
    return null;
  }
  const hasPremiumMarkers =
    plan.premiumDailyFlowSnapshot !== undefined ||
    plan.sourceContentPackSnapshot !== undefined ||
    plan.sourceActivityTemplateId !== undefined;
  if (!hasPremiumMarkers) return null;

  const flow = parsePremiumFlow(plan);
  if (!flow || flow.planCivilDate !== plan.civilDate) {
    return planRelationFinding("plan.integrity.premium-flow-shape");
  }
  const annual = scopedPlan(plans, plan.sourceAnnualPlanId, "annual", scope);
  const monthly = scopedPlan(plans, plan.sourceMonthlyPlanId, "monthly", scope);
  const weekly = scopedPlan(plans, plan.sourceWeeklyPlanId, "weekly", scope);
  if (!annual || !monthly || !weekly) {
    return planRelationFinding("plan.integrity.premium-source-missing");
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
    return planRelationFinding("plan.integrity.premium-source-chain");
  }
  const sourceTemplateId = text(plan.sourceActivityTemplateId);
  const appliedTemplateId = text(plan.appliedActivityTemplateId);
  if (!sourceTemplateId || !appliedTemplateId) {
    return planRelationFinding("plan.integrity.premium-activity-id");
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
    return planRelationFinding("plan.integrity.premium-activity-snapshot");
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
      return planRelationFinding("plan.integrity.premium-activity-source");
    }
  }
  return null;
}

/**
 * Eski string tüketicileri için uyumluluk katmanı. Yeni tüketiciler kod ve destek
 * bilgisini koruyan `scheduledPlanIntegrityFinding` sonucunu kullanmalıdır.
 */
export function scheduledPlanIntegrityIssue(options: {
  plan: StoredRecord;
  activity: StoredRecord | null;
  plans: readonly StoredRecord[];
  scope: ActiveClassroomScope;
}): string | null {
  return scheduledPlanIntegrityFinding(options)?.message ?? null;
}

function editBlockFinding(options: {
  plan: StoredRecord;
  activities: readonly StoredRecord[];
  observations: readonly StoredRecord[];
  integrityFinding: Readonly<PlanRelationFinding> | null;
  today: string;
}): Readonly<PlanRelationFinding> | null {
  const { plan, activities, observations, integrityFinding, today } = options;
  if (integrityFinding) return integrityFinding;
  if (activities.length !== 1) {
    return planRelationFinding("plan.edit.activity-count");
  }
  const activity = activities[0];
  if (plan.civilDate <= today) {
    return planRelationFinding("plan.edit.past-or-today");
  }
  if (plan.coverageStatus !== "planned" || activity.status !== "planned") {
    return planRelationFinding("plan.edit.status-locked");
  }
  if (
    observations.some(
      (observation) =>
        typeof observation.deletedAt !== "string" &&
        (observation.planId === plan.id || observation.activityId === activity.id),
    )
  ) {
    return planRelationFinding("plan.edit.evidence-locked");
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
      const teacherOwnedFlow = isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow)
        ? plan.teacherOwnedDailyFlow
        : null;
      const integrityFinding = scheduledPlanIntegrityFinding({
        plan,
        activity,
        plans: snapshot.plans,
        scope,
      });
      const blockFinding = editBlockFinding({
        plan,
        activities,
        observations: snapshot.observations,
        integrityFinding,
        today,
      });
      return {
        planId: plan.id,
        activityId: activity?.id ?? null,
        civilDate: String(plan.civilDate),
        planTitle: text(plan.title) ?? "Başlıksız günlük plan",
        activityTitle: text(activity?.title) ?? "Etkinlik kaydı eksik",
        premium: premiumFlow !== null || plan.premiumDailyFlowSnapshot !== undefined,
        flowBlockCount:
          premiumFlow?.blocks.length ?? teacherOwnedFlow?.blocks.length ?? 0,
        persistedActivityCount: activities.length,
        editable: blockFinding === null,
        editBlockReason: blockFinding?.message ?? null,
        editBlockCode: blockFinding?.code ?? null,
        editBlockSupportCode: blockFinding?.supportCode ?? null,
        integrityStatus: integrityFinding ? "invalid" : "valid",
        integrityCode: integrityFinding?.code ?? null,
        integritySupportCode: integrityFinding?.supportCode ?? null,
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
    teacherOwnedDailyFlowBlocks: isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow)
      ? plan.teacherOwnedDailyFlow.blocks.map((block) => ({
          id: block.id,
          kind: block.kind,
          title: block.title,
          status: block.status,
          durationMinutes: block.durationMinutes,
          transitionNote: block.transitionNote,
          teacherNote: block.teacherNote,
        }))
      : [],
    teacherOwnedActivityBlockKind: isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow) &&
      typeof activity.teacherOwnedFlowBlockId === "string"
      ? (plan.teacherOwnedDailyFlow.blocks.find(
          (block) => block.id === activity.teacherOwnedFlowBlockId,
        )?.kind as TeacherOwnedActivityFlowBlockKind | undefined) ?? null
      : null,
  };
}

export async function loadScheduledPlanEditDraft(
  store: LocalDataStore,
  options: { planId: string; now?: Date },
): Promise<ScheduledPlanEditDraft> {
  await migrateLegacyClassroomScopes(store, { now: options.now });
  return resolveScheduledPlanEditDraft(await store.readSnapshot(), options);
}

export async function loadTeacherOwnedDailyFlowCopySources(
  store: LocalDataStore,
  options: { weeklyPlanId: string; beforeCivilDate: string },
): Promise<TeacherOwnedDailyFlowCopySource[]> {
  if (!isCivilDate(options.beforeCivilDate)) {
    throw new Error("Kopyalama hedef günü YYYY-AA-GG biçiminde olmalıdır.");
  }
  await migrateLegacyClassroomScopes(store);
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return [];
  const plans = snapshot.plans
    .filter(
      (plan) =>
        plan.planType === "daily" &&
        plan.sourceWeeklyPlanId === options.weeklyPlanId &&
        typeof plan.civilDate === "string" &&
        plan.civilDate < options.beforeCivilDate &&
        typeof plan.deletedAt !== "string" &&
        recordBelongsToClassroomScope(plan, scope) &&
        isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow),
    )
    .sort(
      (left, right) =>
        String(right.civilDate).localeCompare(String(left.civilDate)) ||
        right.updatedAt.localeCompare(left.updatedAt) ||
        right.id.localeCompare(left.id),
    );
  const sources: TeacherOwnedDailyFlowCopySource[] = [];
  for (const plan of plans) {
    if (!isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow)) continue;
    const activities = snapshot.activities.filter(
      (activity) =>
        activity.planId === plan.id &&
        typeof activity.deletedAt !== "string" &&
        recordBelongsToClassroomScope(activity, scope),
    );
    const activity = activities.length === 1 ? activities[0] : null;
    if (
      !activity ||
      scheduledPlanIntegrityIssue({ plan, activity, plans: snapshot.plans, scope })
    ) continue;
    const linkedBlock = typeof activity.teacherOwnedFlowBlockId === "string"
      ? plan.teacherOwnedDailyFlow.blocks.find(
          (block) => block.id === activity.teacherOwnedFlowBlockId,
        )
      : null;
    if (
      !linkedBlock ||
      (linkedBlock.kind !== "teacher-activity-one" &&
        linkedBlock.kind !== "teacher-activity-two") ||
      linkedBlock.status === "skipped"
    ) continue;
    sources.push({
      planId: plan.id,
      weeklyPlanId: options.weeklyPlanId,
      civilDate: String(plan.civilDate),
      planTitle: text(plan.title) ?? "Önceki günlük plan",
      flowRevisionNumber: plan.teacherOwnedDailyFlow.revisionNumber,
      blocks: plan.teacherOwnedDailyFlow.blocks.map((block) => ({
        kind: block.kind,
        title: block.title,
        status: block.status,
        durationMinutes: block.durationMinutes,
        transitionNote: block.transitionNote,
        teacherNote: block.teacherNote,
      })),
      activityBlockKind: linkedBlock.kind,
    });
  }
  return sources;
}

export async function loadTeacherOwnedDailyFlowCopySource(
  store: LocalDataStore,
  options: { weeklyPlanId: string; beforeCivilDate: string },
): Promise<TeacherOwnedDailyFlowCopySource | null> {
  return (await loadTeacherOwnedDailyFlowCopySources(store, options))[0] ?? null;
}
