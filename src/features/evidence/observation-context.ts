import type {
  EvidenceActivitySummary,
  EvidenceWorkspace,
} from "./evidence-workspace.ts";

export type ObservationContextResolution =
  | {
      kind: "use-activity";
      activity: EvidenceActivitySummary;
    }
  | {
      kind: "choose-activity";
      activities: EvidenceActivitySummary[];
    }
  | {
      kind: "spontaneous-observation";
    };

function activityAllowsStudent(
  activity: EvidenceActivitySummary,
  studentId: string | undefined,
): boolean {
  if (!studentId || activity.assignedStudentIds.length === 0) return true;
  return activity.assignedStudentIds.includes(studentId);
}

/**
 * Resolves the teacher's global observation entry against today's real plan
 * context. In-progress activities outrank planned ones; ambiguity is never
 * guessed away, and the synthetic context is only used when no real candidate
 * exists.
 */
export function resolveObservationContext(
  workspace: EvidenceWorkspace,
  options: { studentId?: string } = {},
): ObservationContextResolution {
  const realCandidates = workspace.activities.filter(
    (activity) =>
      activity.civilDate === workspace.civilDate &&
      activity.contextKind === "planned-activity" &&
      (activity.status === "in_progress" || activity.status === "planned") &&
      activityAllowsStudent(activity, options.studentId),
  );
  const inProgress = realCandidates.filter(
    (activity) => activity.status === "in_progress",
  );
  const candidates = inProgress.length > 0
    ? inProgress
    : realCandidates.filter((activity) => activity.status === "planned");

  if (candidates.length === 0) {
    return { kind: "spontaneous-observation" };
  }
  if (candidates.length === 1) {
    return { kind: "use-activity", activity: candidates[0] };
  }
  return {
    kind: "choose-activity",
    activities: [...candidates].sort(
      (left, right) =>
        left.startTime.localeCompare(right.startTime) ||
        left.title.localeCompare(right.title, "tr-TR") ||
        left.id.localeCompare(right.id),
    ),
  };
}
