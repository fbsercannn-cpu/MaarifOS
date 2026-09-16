import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import { createPlanWithActivity } from "../../src/features/evidence/evidence-flow.ts";
import { getActivityStudioItem } from "../../src/features/activity-studio/activity-studio-model.ts";
import { createPedagogicalPlanBridge } from "../../src/features/pedagogical-os/pedagogical-plan-bridge.ts";
import {
  appendTeacherFollowup,
  contactAreaValue,
  followupFingerprint,
  pickupContactSnapshot,
} from "../../src/features/teacher-followup/teacher-followup-service.ts";
import { makeTeacherPrintKitFixture } from "./teacher-print-kit-fixture.mjs";

export const dayExitCivilDate = "2026-09-21";
export const dayExitNextDate = "2026-09-22";
export const dayExitNow = new Date("2026-09-21T12:05:00.000Z");

export async function seedDayExitPackageFixture(store) {
  const fixture = await makeTeacherPrintKitFixture(store);
  const snapshot = await store.readSnapshot();
  const classroom = snapshot.classrooms.find((record) => record.id === fixture.scope.classroomId);
  const profile = classroom.curriculumProfileSnapshot;
  const target = curriculumTargetsForProfile(profile, "60-72")[0];
  const activitySource = getActivityStudioItem("oyun-minik-mahalle-pazari");
  if (!target || !activitySource) throw new Error("Kurgu çıkış paketi plan kaynağı hazırlanamadı.");
  const plan = await createPlanWithActivity(store, {
    civilDate: dayExitNextDate,
    planTitle: "Kurgu ertesi gün planı",
    activityTitle: "Kurgu ertesi gün mahalle pazarı",
    startTime: "09:30",
    curriculumProfile: profile,
    curriculumTargets: [target],
    assignmentMode: "whole-class",
    studentIds: [fixture.studentId, fixture.otherStudentId],
    pedagogicalProvenance: createPedagogicalPlanBridge({
      activity: activitySource,
      civilDate: dayExitNextDate,
      ageBand: "60-72",
      scenarioId: "small-group",
      participationRouteId: "multiple",
      now: new Date("2026-09-20T09:00:00.000Z"),
    }),
    initialActivityStatus: "planned",
    now: new Date("2026-09-20T09:00:00.000Z"),
  });
  await store.transaction("readwrite", ["attendanceRecords"], async (transaction) => {
    await transaction.putMany("attendanceRecords", [fixture.studentId, fixture.otherStudentId].map((studentId, index) => ({
      id: crypto.randomUUID(),
      ...fixture.scope,
      studentId,
      civilDate: dayExitCivilDate,
      createdAt: `2026-09-21T07:0${index}:00.000Z`,
      updatedAt: `2026-09-21T07:0${index}:00.000Z`,
      deletedAt: null,
      schemaVersion: 1,
      status: "present",
    })));
  });
  await appendTeacherFollowup(store, {
    studentId: fixture.studentId,
    now: new Date("2026-09-21T12:01:00.000Z"),
    workflow: {
      kind: "pickup-correction",
      sourceId: fixture.delivery.id,
      note: "Kurgu ilk teslim saatini düzeltiyorum.",
    },
  });
  const student = (await store.readSnapshot()).students.find((record) => record.id === fixture.studentId);
  const correctedDelivery = await appendTeacherFollowup(store, {
    studentId: fixture.studentId,
    now: new Date("2026-09-21T12:02:00.000Z"),
    workflow: {
      kind: "pickup-log",
      contact: pickupContactSnapshot(fixture.contacts[1]),
      handedOverAt: "2026-09-21T11:45:00.000Z",
      note: "Kurgu düzeltilmiş gerçek teslim.",
      authorityFingerprint: await followupFingerprint(contactAreaValue(student, "pickup")),
    },
  });
  return {
    ...fixture,
    plan,
    correctedDelivery,
    civilDate: dayExitCivilDate,
    nextDate: dayExitNextDate,
    now: dayExitNow,
  };
}
