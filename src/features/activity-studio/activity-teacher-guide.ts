import { ACTIVITY_TEACHER_GUIDE_COPY as copy } from "./activity-teacher-guide.copy.ts";
import {
  ACTIVITY_STUDIO_AGE_LABELS,
  createActivityStudioChildSession,
  type ActivityStudioItem,
} from "./activity-studio-model.ts";
import {
  createActivityContextAdaptation,
} from "../pedagogical-os/pedagogical-orchestrator.ts";
import type {
  ActivityStudioContext,
  ActivityStudioProps,
} from "./ActivityStudio.tsx";

export function createActivityTeacherGuide(
  activity: ActivityStudioItem,
  context: ActivityStudioContext,
) {
  const adaptation = createActivityContextAdaptation({ activity, ...context });
  return {
    activity,
    ageLabel: ACTIVITY_STUDIO_AGE_LABELS[context.ageBand],
    ageSupport: activity.ageAdaptations[context.ageBand],
    adaptation,
  };
}

/** The guide is not evidence. Only the existing application and teacher-review
 * controllers may open an observation, with no invented child response. */
export async function startActivityTeacherObservation(input: {
  activity: ActivityStudioItem;
  context: ActivityStudioContext;
  unavailableReason?: string;
  onApply: ActivityStudioProps["onApply"];
  onWriteObservation: ActivityStudioProps["onWriteObservation"];
}): Promise<void> {
  if (input.unavailableReason) throw new Error(input.unavailableReason);
  if (!input.onWriteObservation) {
    throw new Error(copy.observationUnavailable);
  }
  const session = createActivityStudioChildSession(
    input.activity.id,
    input.context.ageBand,
  );
  if (!session || !input.activity.ageBands.includes(input.context.ageBand)) {
    throw new Error(copy.unsupportedAge);
  }
  const application = await input.onApply(input.activity, input.context);
  if (!application || application.sourceActivityId !== input.activity.id) {
    throw new Error(copy.invalidApplication);
  }
  await input.onWriteObservation({
    activity: input.activity,
    application,
    session,
    choice: null,
    drawingEvidence: null,
    ...input.context,
  });
}
