import { makeDevelopmentReportFixture } from "./development-report-fixture.mjs";
import { appendTeacherFollowup } from "../../src/features/teacher-followup/teacher-followup-service.ts";
import { createPlanWithActivity } from "../../src/features/evidence/evidence-flow.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import { getActivityStudioItem } from "../../src/features/activity-studio/activity-studio-model.ts";
import { createPedagogicalPlanBridge } from "../../src/features/pedagogical-os/pedagogical-plan-bridge.ts";

export const smallGroupAnchorDate = "2026-09-14";
export const smallGroupNow = new Date("2026-09-12T09:00:00.000Z");

export async function seedSmallGroupCardsFixture(store, { planCount = 6 } = {}) {
  const fixture = await makeDevelopmentReportFixture(store);
  const snapshot = await store.readSnapshot();
  const profile = snapshot.classrooms.find((record) => record.id === fixture.input.classroomId).curriculumProfileSnapshot;
  const target = curriculumTargetsForProfile(profile, "60-72")[0];
  const sourceActivity = getActivityStudioItem("oyun-minik-mahalle-pazari");
  if (!target || !sourceActivity) throw new Error("Kurgu küçük grup plan kaynağı hazırlanamadı.");
  const decision = await appendTeacherFollowup(store, {
    studentId: fixture.input.studentId,
    now: new Date("2026-09-08T08:00:00.000Z"),
    workflow: {
      kind: "learning-decision",
      observationIds: [fixture.observationId],
      support: "small-group",
      teacherDecision: "Kurgu yapı oyununda küçük grupla yeni katılım fırsatı sunacağım.",
      targetWeekStart: "2026-09-14",
      targetWeekEnd: "2026-09-20",
      reviewOn: "2026-09-20",
    },
  });
  const dates = ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19"].slice(0, planCount);
  const plans = [];
  for (const [index, civilDate] of dates.entries()) {
    const planNow = new Date(Date.UTC(2026, 8, 9, 6, index, 0));
    plans.push(await createPlanWithActivity(store, {
      civilDate,
      planTitle: `Kurgu ${index + 1}. küçük grup günü`,
      activityTitle: `${sourceActivity.title} ${index + 1}`,
      startTime: `${String(9 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
      curriculumProfile: profile,
      curriculumTargets: [target],
      assignmentMode: "whole-class",
      studentIds: [fixture.input.studentId, fixture.otherStudentId],
      pedagogicalProvenance: createPedagogicalPlanBridge({
        activity: sourceActivity,
        civilDate,
        ageBand: "60-72",
        scenarioId: "small-group",
        participationRouteId: "multiple",
        now: planNow,
      }),
      initialActivityStatus: "planned",
      now: planNow,
    }));
  }
  return { ...fixture, profile, target, sourceActivity, decision, plans, now: smallGroupNow, civilDate: smallGroupAnchorDate };
}

