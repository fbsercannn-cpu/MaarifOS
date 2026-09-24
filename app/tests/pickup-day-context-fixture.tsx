import React from "react";
import { createRoot } from "react-dom/client";
import { IndexedDbDataStore } from "../src/core/repository/indexed-db.ts";
import { makeDevelopmentReportFixture } from "./fixtures/development-report-fixture.mjs";
import { TeacherFollowupWorkspace } from "../src/features/teacher-followup/TeacherFollowupWorkspace.tsx";
import { MobileDeviceProvider, KeyboardProvider } from "../src/mobile";
const store = new IndexedDbDataStore({ databaseName: "pickup-day-context-2026-09-12" });
const studentId="00000000-0000-4000-8000-000000007003";
if (!(await store.readSnapshot()).students.length) {
 await makeDevelopmentReportFixture(store);
 await store.transaction("readwrite", ["students"], async tx => {
  const student=(await tx.getAll("students")).find(s=>s.id===studentId)!;
  await tx.putMany("students", [{...student,contacts:[{id:"00000000-0000-4000-8000-000000004301",kind:"mother",name:"Kurgu Yetkili",relationship:"Anne",phone:"05000000001",isPrimary:true,isAuthorizedPickup:true}]}]);
 });
}
Object.assign(window,{pickupContextTest:{store}});
createRoot(document.getElementById("root")!).render(<MobileDeviceProvider><KeyboardProvider native><TeacherFollowupWorkspace store={store} initialStudentId={studentId} initialSection="pickup" initialPickupCivilDate="2026-09-11" onOpenStudent={()=>{}} onOpenPlans={()=>{}} /></KeyboardProvider></MobileDeviceProvider>);
