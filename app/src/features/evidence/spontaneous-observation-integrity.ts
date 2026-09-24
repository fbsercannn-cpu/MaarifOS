import {
  recordBelongsToClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import {
  SPONTANEOUS_OBSERVATION_ACTIVITY_KIND,
  SPONTANEOUS_OBSERVATION_PLAN_TYPE,
} from "./spontaneous-observation.ts";

function isLiveScopedRecord(
  record: StoredRecord,
  scope: ActiveClassroomScope,
  civilDate: string,
): boolean {
  return (
    record.civilDate === civilDate &&
    typeof record.deletedAt !== "string" &&
    recordBelongsToClassroomScope(record, scope)
  );
}

function hasNoProgramTargets(record: StoredRecord): boolean {
  return (
    (record.curriculumTargets === undefined ||
      (Array.isArray(record.curriculumTargets) &&
        record.curriculumTargets.length === 0)) &&
    (record.maarifRefs === undefined ||
      (Array.isArray(record.maarifRefs) && record.maarifRefs.length === 0)) &&
    (record.targetAssignments === undefined ||
      (Array.isArray(record.targetAssignments) &&
        record.targetAssignments.length === 0))
  );
}

/**
 * Recognizes the synthetic plan/activity pair used only as an observation
 * capture context. The decision is deliberately fail-closed: an activity kind
 * marker on its own never hides work or bypasses an in-progress conflict.
 */
export function isAuthenticSpontaneousObservationActivity(
  activity: StoredRecord,
  plans: readonly StoredRecord[],
  scope: ActiveClassroomScope,
  civilDate: string,
): boolean {
  if (
    activity.activityKind !== SPONTANEOUS_OBSERVATION_ACTIVITY_KIND ||
    typeof activity.planId !== "string" ||
    !isLiveScopedRecord(activity, scope, civilDate) ||
    !hasNoProgramTargets(activity)
  ) {
    return false;
  }

  const linkedPlans = plans.filter(
    (plan) =>
      plan.id === activity.planId &&
      plan.planType === SPONTANEOUS_OBSERVATION_PLAN_TYPE &&
      isLiveScopedRecord(plan, scope, civilDate) &&
      hasNoProgramTargets(plan),
  );

  return linkedPlans.length === 1;
}
