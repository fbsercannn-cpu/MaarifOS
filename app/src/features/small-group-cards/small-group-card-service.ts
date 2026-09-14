import { assertDataSnapshotRelationships } from "../../core/backup/schema.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot, type StoredRecord } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type { PlannedCurriculumAssignment } from "../curriculum/curriculum-catalog.ts";
import { resolveSmallGroupCardModel } from "./small-group-card-model.ts";

export const SMALL_GROUP_CARDS_CHANGED_EVENT = "maarifos:small-group-cards-changed";

export interface PlaceSmallGroupInDailyPlanInput {
  readonly civilDate: string;
  readonly planId: string;
  readonly activityId: string;
  readonly studentIds: readonly string[];
  readonly expectedPlanUpdatedAt: string;
  readonly expectedActivityUpdatedAt: string;
  readonly expectedSourceFingerprint: string;
  readonly now?: Date;
}

export interface PlaceSmallGroupInDailyPlanResult {
  readonly changed: boolean;
  readonly planId: string;
  readonly activityId: string;
  readonly civilDate: string;
  readonly studentIds: readonly string[];
  readonly updatedAt: string;
}

const STALE_MESSAGE = "Günlük plan, etkinlik, materyal veya sınıf bilgisi değişti. Güncel grubu yeniden açın.";

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function currentIds(record: StoredRecord): string[] {
  return Array.isArray(record.studentIds)
    ? [...new Set(record.studentIds.filter((id): id is string => typeof id === "string"))].sort()
    : [];
}

function targetAssignments(
  activity: StoredRecord,
  studentIds: readonly string[],
  assignedAt: string,
): PlannedCurriculumAssignment[] {
  if (!Array.isArray(activity.curriculumTargets) || !activity.curriculumTargets.length) {
    throw new Error("Etkinliğin kayıtlı program hedefi bulunmuyor.");
  }
  return activity.curriculumTargets.flatMap((value) => {
    if (
      !value || typeof value !== "object" || Array.isArray(value) ||
      typeof value.id !== "string" || !value.id.trim() ||
      typeof value.referenceCode !== "string" || !value.referenceCode.trim()
    ) throw new Error("Etkinliğin kayıtlı program hedefi doğrulanamadı.");
    return studentIds.map((studentId): PlannedCurriculumAssignment => ({
      studentId,
      targetId: value.id as string,
      referenceCode: (value.referenceCode as string).trim(),
      status: "planned",
      assignedAt,
    }));
  });
}

async function readSnapshot(
  transaction: Parameters<Parameters<LocalDataStore["transaction"]>[2]>[0],
): Promise<DataSnapshot> {
  const snapshot = createEmptySnapshot();
  for (const collection of COLLECTION_NAMES) snapshot[collection] = await transaction.getAll(collection);
  return snapshot;
}

export async function placeSmallGroupInDailyPlan(
  store: LocalDataStore,
  input: PlaceSmallGroupInDailyPlanInput,
): Promise<PlaceSmallGroupInDailyPlanResult> {
  if (!isCivilDate(input.civilDate)) throw new Error("Küçük grup plan günü YYYY-AA-GG biçiminde olmalıdır.");
  if (!input.planId || !input.activityId || !input.expectedSourceFingerprint) throw new Error(STALE_MESSAGE);
  if (
    input.studentIds.length < 2 ||
    input.studentIds.length > 8 ||
    new Set(input.studentIds).size !== input.studentIds.length ||
    input.studentIds.some((id) => typeof id !== "string" || !id.trim())
  ) throw new Error("Küçük grup için 2 ile 8 arasında farklı çocuk seçin.");
  const now = new Date(input.now ?? new Date());
  if (!Number.isFinite(now.getTime())) throw new Error("Küçük grup ataması için geçerli kayıt saati gerekir.");
  const requestedStudentIds = [...input.studentIds].sort();

  const result = await store.transaction("readwrite", COLLECTION_NAMES, async (transaction) => {
    const snapshot = await readSnapshot(transaction);
    const today = civilDateInIstanbul(now);
    assertDataSnapshotRelationships(snapshot, today);
    const model = resolveSmallGroupCardModel(snapshot, { civilDate: input.civilDate, now });
    const target = model.targets.find((candidate) =>
      candidate.planId === input.planId && candidate.activityId === input.activityId
    );
    if (!target || target.sourceFingerprint !== input.expectedSourceFingerprint) throw new Error(STALE_MESSAGE);
    if (!target.available) throw new Error(target.blockReason ?? "Bu günlük plan küçük grup atamasına uygun değil.");
    if (requestedStudentIds.some((id) => !target.eligibleStudentIds.includes(id))) {
      throw new Error("Seçilen çocuklardan biri plan gününde bu sınıfa kayıtlı değil.");
    }
    const plan = snapshot.plans.find((record) => record.id === target.planId)!;
    const activity = snapshot.activities.find((record) => record.id === target.activityId)!;
    const alreadyAssigned =
      plan.assignmentMode === "selected-students" &&
      activity.assignmentMode === "selected-students" &&
      sameIds(currentIds(plan), requestedStudentIds) &&
      sameIds(currentIds(activity), requestedStudentIds);
    if (alreadyAssigned) {
      return {
        changed: false,
        planId: plan.id,
        activityId: activity.id,
        civilDate: target.civilDate,
        studentIds: requestedStudentIds,
        updatedAt: activity.updatedAt,
      } satisfies PlaceSmallGroupInDailyPlanResult;
    }
    if (
      plan.updatedAt !== input.expectedPlanUpdatedAt ||
      activity.updatedAt !== input.expectedActivityUpdatedAt
    ) throw new Error(STALE_MESSAGE);
    const latest = Math.max(Date.parse(plan.updatedAt), Date.parse(activity.updatedAt));
    if (!Number.isFinite(latest) || latest > now.getTime() + 60_000) {
      throw new Error("Cihaz saati planın son değişiklik zamanının gerisinde. Saati kontrol edin.");
    }
    const timestamp = new Date(Math.max(now.getTime(), latest + 1)).toISOString();
    const assignments = targetAssignments(activity, requestedStudentIds, timestamp);
    const updatedPlan: StoredRecord = {
      ...plan,
      studentIds: requestedStudentIds,
      assignmentMode: "selected-students",
      assignmentSnapshotAt: timestamp,
      coverageStatus: "planned",
      updatedAt: timestamp,
      ...(Array.isArray(plan.targetAssignments) ? { targetAssignments: assignments } : {}),
    };
    const updatedActivity: StoredRecord = {
      ...activity,
      studentIds: requestedStudentIds,
      assignmentMode: "selected-students",
      assignmentSnapshotAt: timestamp,
      targetAssignments: assignments,
      coverageStatus: "planned",
      updatedAt: timestamp,
    };
    snapshot.plans = snapshot.plans.map((record) => record.id === plan.id ? updatedPlan : record);
    snapshot.activities = snapshot.activities.map((record) => record.id === activity.id ? updatedActivity : record);
    assertDataSnapshotRelationships(snapshot, today);
    await transaction.putMany("plans", [updatedPlan]);
    await transaction.putMany("activities", [updatedActivity]);
    return {
      changed: true,
      planId: updatedPlan.id,
      activityId: updatedActivity.id,
      civilDate: target.civilDate,
      studentIds: requestedStudentIds,
      updatedAt: timestamp,
    } satisfies PlaceSmallGroupInDailyPlanResult;
  });
  if (result.changed && typeof window !== "undefined") {
    window.dispatchEvent(new Event(SMALL_GROUP_CARDS_CHANGED_EVENT));
  }
  return result;
}

