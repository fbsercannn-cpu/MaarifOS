import { makeDevelopmentReportFixture } from "./development-report-fixture.mjs";
import { appendTeacherFollowup } from "../../src/features/teacher-followup/teacher-followup-service.ts";
import { executeFamilyEngagement } from "../../src/features/family-engagement/family-engagement-service.ts";
import { createPlanWithActivity } from "../../src/features/evidence/evidence-flow.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import { normalizeStudentContacts } from "../../src/core/domain/student.ts";
export async function makePreparedTeacherFixture(store) {
  const f = await makeDevelopmentReportFixture(store), source = f.store;
  const now = new Date("2026-09-21T06:00:00.000Z"), earlier = new Date("2026-09-10T07:00:00.000Z");
  const data = await source.readSnapshot(), scope = { academicYearId: f.input.academicYearId, classroomId: f.input.classroomId }, studentId = f.input.studentId;
  const contact = normalizeStudentContacts([{ id: crypto.randomUUID(), kind: "mother", name: "Kurgu Veli", relationship: "Anne", phone: "05000000000", isPrimary: true, isAuthorizedPickup: false }])[0];
  await source.transaction("readwrite", ["students", "attendanceRecords"], async tx => {
    await tx.putMany("students", data.students.map(s => s.id === studentId ? { ...s, contacts: [contact], updatedAt: earlier.toISOString() } : s));
    await tx.putMany("attendanceRecords", data.students.map(s => ({ id: crypto.randomUUID(), ...scope, studentId: s.id, civilDate: "2026-09-21", createdAt: now.toISOString(), updatedAt: now.toISOString(), schemaVersion: 1, deletedAt: null, status: "present" })));
  });
  const decision = await appendTeacherFollowup(source, { studentId, now: earlier, workflow: { kind: "learning-decision", observationIds: [f.observationId], support: "family-cooperation", teacherDecision: "Evdeki birlikte oyun fırsatlarını aileyle görüşmeyi planlıyorum.", targetWeekStart: "2026-09-14", targetWeekEnd: "2026-09-18", reviewOn: "2026-09-18" } });
  const availability = await executeFamilyEngagement(source, { scope, now: earlier, command: { action: "availability", availability: { scheduledOn: "2026-09-22", startTime: "14:00", endTime: "15:00", slotMinutes: 20, calendarNote: "" } } });
  const profile = data.classrooms[0].curriculumProfileSnapshot, target = curriculumTargetsForProfile(profile, "60-72")[0];
  const activity = await createPlanWithActivity(source, { civilDate: "2026-09-21", planTitle: "Kurgu pazartesi planı", activityTitle: "Kurgu birlikte yapı oyunu", startTime: "10:00", curriculumProfile: profile, curriculumTargets: [target], assignmentMode: "whole-class", studentIds: [studentId, f.otherStudentId], now, initialActivityStatus: "planned" });
  return { ...f, store: source, now, scope, studentId, decision, availability, activity, contact };
}
