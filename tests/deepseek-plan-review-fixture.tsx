import { createRoot } from "react-dom/client";
import { useState } from "react";
import { KeyboardProvider, MobileDeviceProvider } from "../src/mobile";
import * as core from "../src/core/index.ts";
import { curriculumTargetsForProfile } from "../src/features/curriculum/curriculum-catalog.ts";
import { createPlanWithActivity, CURRICULUM_PROGRAM_LABELS } from "../src/features/evidence/evidence-flow.ts";
import { createTeacherOwnedPlanGraph } from "../src/features/planning/teacher-owned-plan-service.ts";
import { defaultTeacherOwnedDailyFlowBlockDrafts } from "../src/core/domain/teacher-owned-daily-flow.ts";
import { DeepSeekPlanReviewDialog } from "../src/features/ai-work-center/DeepSeekPlanReviewDialog.tsx";

const store = new core.IndexedDbDataStore({ databaseName: `deepseek-plan-review-${crypto.randomUUID()}` });
const academicYearId = "00000000-0000-4000-8000-000000007311";
const classroomId = "00000000-0000-4000-8000-000000007312";
const studentId = "00000000-0000-4000-8000-000000007313";
const planId = "00000000-0000-4000-8000-000000007314";
const curriculumProfile = {
  framework: "tymm" as const,
  programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
  catalogId: "tymm-2024-okul-oncesi-v1",
  sourceVersion: "2024.1",
  referenceOrigin: "teacher-declared" as const,
  officialCatalogVerified: false,
};
const target = curriculumTargetsForProfile(curriculumProfile).find((item) => item.referenceCode === "FAB.1");
if (!target) throw new Error("Kurgu hedef bulunamadı.");
const base = { createdAt: "2026-09-01T06:00:00.000Z", updatedAt: "2026-09-01T06:00:00.000Z", civilDate: "2026-09-01", deletedAt: null };
await store.transaction("readwrite", ["academicYears", "classrooms", "settings", "students"], async (transaction) => {
  await transaction.putMany("academicYears", [{ ...base, id: academicYearId, name: "2026–2027", startDate: "2026-09-07", endDate: "2027-06-25", status: "active", schemaVersion: 1 }]);
  await transaction.putMany("classrooms", [{ ...base, id: classroomId, academicYearId, name: "Güneş Sınıfı", curriculumProfileSnapshot: curriculumProfile, schedule: core.normalizeClassroomSchedule({ kind: "morning", startTime: "08:30", endTime: "12:30" }), schemaVersion: 2 }]);
  await transaction.putMany("settings", [{ ...base, id: core.ACTIVE_CLASSROOM_SETTING_ID, settingType: core.ACTIVE_CLASSROOM_SETTING_TYPE, academicYearId, classroomId, schemaVersion: 1 }]);
  await transaction.putMany("students", [{ ...base, id: studentId, academicYearId, classroomId, displayName: "Ada Yılmaz", schemaVersion: 1 }]);
});
await createTeacherOwnedPlanGraph(store, {
  title: "Öğretmen Yıllık Planı", periodStart: "2026-09-07", periodEnd: "2027-06-25", teacherContent: { purpose: "Yıllık omurga" },
  months: [{ title: "Eylül Planı", monthKey: "2026-09", periodStart: "2026-09-07", periodEnd: "2026-09-30", teacherContent: { focus: "Uyum" }, weeks: [{ title: "Hafta Planı", weekKey: "2026-W37", periodStart: "2026-09-07", periodEnd: "2026-09-11", teacherContent: { flow: ["oyun"] } }] }],
  now: new Date("2026-09-02T06:00:00.000Z"),
});
await createPlanWithActivity(store, {
  civilDate: "2026-09-08", planId, planTitle: "Gölge araştırması", activityId: "00000000-0000-4000-8000-000000007315", activityTitle: "Gölge oyunu", startTime: "09:00", endTime: "09:40",
  curriculumProfile, curriculumTargets: [target], assignmentMode: "selected-students", studentIds: [studentId],
  teacherOwnedDailyFlowBlocks: defaultTeacherOwnedDailyFlowBlockDrafts(240), teacherOwnedActivityBlockKind: "teacher-activity-one", now: new Date("2026-09-08T06:00:00.000Z"),
});

Object.assign(window, { deepSeekPlanReviewFixture: { store, planId } });

function Fixture() {
  const [open, setOpen] = useState(true);
  const [saved, setSaved] = useState("");
  return <main>
    <output aria-label="Kaydedilen plan revizyonu">{saved}</output>
    {open ? <DeepSeekPlanReviewDialog store={store} planId={planId} onClose={() => setOpen(false)} onSaved={(result) => setSaved(`${result.planId}:${result.revisionNumber}`)} /> : null}
  </main>;
}

createRoot(document.getElementById("root")!).render(<MobileDeviceProvider><KeyboardProvider native><Fixture /></KeyboardProvider></MobileDeviceProvider>);
