import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  isTeacherOwnedDailyFlow,
  type TeacherOwnedActivityFlowBlockKind,
  type TeacherOwnedDailyFlow,
  type TeacherOwnedDailyFlowBlock,
} from "../../core/domain/teacher-owned-daily-flow.ts";
import {
  buildDailyPlanEvaluationRecord,
  DAILY_PLAN_EVALUATION_SETTING_TYPE,
  findDailyPlanEvaluation,
  type CreateDailyPlanEvaluationInput,
  type DailyPlanEvaluationRecord,
} from "../../core/domain/teacher-owned-daily-evaluation.ts";

export interface AppendActivityToDailyPlanInput {
  readonly planId: string;
  readonly title: string;
  readonly activityKind?: string;
  readonly flowBlockKind?: TeacherOwnedActivityFlowBlockKind | "small-group" | "outdoor-movement";
  readonly startTime?: string | null;
  readonly endTime?: string | null;
  readonly studentIds?: readonly string[];
  readonly curriculumTargets?: readonly unknown[];
  readonly teacherNote?: string;
  readonly timestamp?: string;
}

export interface AppendActivityToDailyPlanResult {
  readonly plan: StoredRecord;
  readonly activity: StoredRecord;
  readonly assignedBlockId: string | null;
}

function resolveTargetBlock(
  flow: TeacherOwnedDailyFlow,
  requestedKind?: string,
): TeacherOwnedDailyFlowBlock | null {
  if (requestedKind) {
    const matching = flow.blocks.find((b) => b.kind === requestedKind);
    if (matching) return matching;
  }
  // Try teacher-activity-two first if free
  const actTwo = flow.blocks.find((b) => b.kind === "teacher-activity-two");
  if (actTwo && actTwo.status !== "planned") return actTwo;
  // Try small-group if free
  const smallGroup = flow.blocks.find((b) => b.kind === "small-group");
  if (smallGroup && smallGroup.status !== "planned") return smallGroup;
  // Fallback to actTwo or actOne
  return actTwo ?? flow.blocks.find((b) => b.kind === "teacher-activity-one") ?? flow.blocks[0] ?? null;
}

export async function appendActivityToDailyPlan(
  store: LocalDataStore,
  scope: ActiveClassroomScope,
  input: AppendActivityToDailyPlanInput,
): Promise<AppendActivityToDailyPlanResult> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Etkinlik başlığı boş bırakılamaz.");
  }

  let result: AppendActivityToDailyPlanResult | null = null;

  await store.transaction("readwrite", ["plans", "activities"], async (tx) => {
    const plans = await tx.getAll("plans");
    const plan = plans.find(
      (p) =>
        p.id === input.planId &&
        p.planType === "daily" &&
        typeof p.deletedAt !== "string" &&
        p.academicYearId === scope.academicYearId &&
        p.classroomId === scope.classroomId,
    );
    if (!plan) {
      throw new Error(`Günlük plan (${input.planId}) bulunamadı veya yetkisiz.`);
    }

    const now = input.timestamp ?? new Date().toISOString();
    const civilDate = plan.civilDate as string;
    const activityId = crypto.randomUUID();

    let assignedBlockId: string | null = null;
    let updatedPlan = { ...plan };

    const flow = plan.teacherOwnedDailyFlow as TeacherOwnedDailyFlow | undefined;
    if (flow && Array.isArray(flow.blocks)) {
      const targetBlock = resolveTargetBlock(flow, input.flowBlockKind);
      if (targetBlock) {
        assignedBlockId = targetBlock.id;
        const updatedBlocks = flow.blocks.map((b) => {
          if (b.id === targetBlock.id) {
            return {
              ...b,
              title: b.title.startsWith("Etkinlik") || b.status !== "planned" ? title : b.title,
              status: "planned" as const,
              teacherNote: input.teacherNote ?? b.teacherNote,
            };
          }
          return b;
        });
        const updatedFlow: TeacherOwnedDailyFlow = {
          ...flow,
          blocks: updatedBlocks,
          updatedAt: now,
          revisionNumber: (flow.revisionNumber || 1) + 1,
          revisionHistory: Array.isArray(flow.revisionHistory)
            ? [
                ...flow.revisionHistory,
                {
                  revisionNumber: flow.revisionNumber || 1,
                  blocks: flow.blocks,
                  updatedAt: flow.updatedAt,
                  capturedAt: now,
                  authorshipConfirmation: flow.authorshipConfirmation,
                },
              ]
            : [],
        };
        updatedPlan = {
          ...updatedPlan,
          teacherOwnedDailyFlow: updatedFlow,
          updatedAt: now,
        };
      }
    }

    const newActivity: StoredRecord = {
      id: activityId,
      planId: plan.id,
      activityKind: input.activityKind ?? "teacher-custom",
      title,
      status: "planned",
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      academicYearId: scope.academicYearId,
      classroomId: scope.classroomId,
      civilDate,
      sourceAnnualPlanId: plan.sourceAnnualPlanId ?? null,
      sourceMonthlyPlanId: plan.sourceMonthlyPlanId ?? null,
      sourceWeeklyPlanId: plan.sourceWeeklyPlanId ?? null,
      teacherOwnedFlowBlockId: assignedBlockId,
      studentIds: Array.isArray(input.studentIds) ? [...input.studentIds] : [],
      curriculumTargets: Array.isArray(input.curriculumTargets) ? [...input.curriculumTargets] : [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      schemaVersion: 1,
    };

    await tx.putMany("plans", [updatedPlan]);
    await tx.putMany("activities", [newActivity]);

    result = {
      plan: updatedPlan,
      activity: newActivity,
      assignedBlockId,
    };
  });

  if (!result) {
    throw new Error("Etkinlik günlük plana eklenemedi.");
  }
  return result;
}

export async function saveDailyPlanEvaluation(
  store: LocalDataStore,
  scope: ActiveClassroomScope,
  input: CreateDailyPlanEvaluationInput,
): Promise<DailyPlanEvaluationRecord> {
  const record = buildDailyPlanEvaluationRecord(scope, input);
  await store.transaction("readwrite", ["settings"], async (tx) => {
    const existing = (await tx.getAll("settings")).filter(
      (s) =>
        s.settingType === DAILY_PLAN_EVALUATION_SETTING_TYPE &&
        (s.workflow as { planId?: string })?.planId === input.planId,
    );
    // Overwrite existing or append
    await tx.putMany("settings", [record]);
  });
  return record;
}

export function loadDailyPlanWorkspaceBundle(
  snapshot: DataSnapshot,
  scope: ActiveClassroomScope,
  planId: string,
) {
  const plan = snapshot.plans.find(
    (p) =>
      p.id === planId &&
      p.planType === "daily" &&
      typeof p.deletedAt !== "string" &&
      p.academicYearId === scope.academicYearId &&
      p.classroomId === scope.classroomId,
  );
  if (!plan) return null;

  const activities = snapshot.activities
    .filter(
      (a) =>
        a.planId === plan.id &&
        typeof a.deletedAt !== "string" &&
        a.academicYearId === scope.academicYearId &&
        a.classroomId === scope.classroomId,
    )
    .sort(
      (left, right) =>
        String(left.startTime ?? "").localeCompare(String(right.startTime ?? "")) ||
        left.id.localeCompare(right.id),
    );

  const evaluation = findDailyPlanEvaluation(snapshot, plan.id);

  return {
    plan,
    activities,
    evaluation,
    civilDate: plan.civilDate as string,
  };
}
