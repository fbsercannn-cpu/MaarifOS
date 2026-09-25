import { makeDevelopmentReportFixture } from "./development-report-fixture.mjs";
import { ensureSpontaneousObservationContext } from "../../src/features/evidence/spontaneous-observation.ts";
import { persistQuickObservationDraft, finalizeQuickObservationDraft } from "../../src/features/evidence/quick-observation.ts";
import { createPlanWithActivity } from "../../src/features/evidence/evidence-flow.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";

export async function makeObservationManagementFixture(store) {
  const fixture = await makeDevelopmentReportFixture(store);
  const now = new Date("2026-09-10T09:00:00.000Z");
  const studentId = fixture.input.studentId;
  const context = await ensureSpontaneousObservationContext(fixture.store, { studentId, civilDate: "2026-09-10", now });
  const observationId = crypto.randomUUID();
  await persistQuickObservationDraft(fixture.store, { studentId, planId: context.plan.id, activityId: context.activity.id, rawText: "  Kurgu çocuk resmini arkadaşına anlattı.\nKendi sözünü kullandı.  ", context: "Kurgu serbest zaman", childQuote: "Ben çizdim.", categoryIds: [], observationType: "quick-note", now });
  await finalizeQuickObservationDraft(fixture.store, { studentId, observationId, now });
  const snapshot = await fixture.store.readSnapshot();
  const profile = snapshot.classrooms[0].curriculumProfileSnapshot;
  const target = curriculumTargetsForProfile(profile, "60-72")[0];
  const source = await createPlanWithActivity(fixture.store, { civilDate: "2026-09-09", planTitle: "Kurgu dünkü plan", activityTitle: "Kurgu dünkü etkinlik", startTime: "10:00", curriculumProfile: profile, curriculumTargets: [target], assignmentMode: "selected-students", studentIds: [studentId], now: new Date("2026-09-09T06:00:00.000Z") });
  const other = await createPlanWithActivity(fixture.store, { civilDate: "2026-09-09", planTitle: "Kurgu başka çocuk planı", activityTitle: "Kurgu başka çocuğun etkinliği", startTime: "11:00", curriculumProfile: profile, curriculumTargets: [target], assignmentMode: "selected-students", studentIds: [fixture.otherStudentId], now: new Date("2026-09-09T06:05:00.000Z") });
  return { ...fixture, now, studentId, observationId, source, other, target, context };
}
