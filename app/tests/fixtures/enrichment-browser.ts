import { seedNewWorkflows } from "./new-workflows-browser.ts";
import { seedFamilyEngagementFixture } from "./family-engagement-fixture.mjs";
import { saveLearningCenter } from "../../src/features/learning-centers/learning-center-service.ts";
import { adminLedgerHead, classroomAdminRecords } from "../../src/core/domain/classroom-admin.ts";
import { learningCenterHead } from "../../src/core/domain/learning-centers.ts";
import { appendSchoolDocumentTemplate } from "../../src/features/school-document-template/school-document-template-service.ts";
import { DEFAULT_SCHOOL_DOCUMENT_TEMPLATE } from "../../src/core/domain/school-document-template.ts";
import { routineDraft } from "../../src/core/domain/daily-routine-cards.ts";
import { saveDailyRoutineCards } from "../../src/features/daily-routine-cards/daily-routine-cards-service.ts";

export async function seedEnrichmentWorkflows(store) {
  const ids = await seedNewWorkflows(store), scope = { academicYearId: ids.academicYearId, classroomId: ids.classroomId };
  await store.transaction("readwrite", ["students"], async tx => {
    const children = await tx.getAll("students");
    await tx.putMany("students", children.map(c => ({ ...c, contacts: [{ id: crypto.randomUUID(), kind: "mother", relationship: "Anne", name: "Kurgu Yakın", phone: "", isPrimary: true }] })));
  });
  const family = await seedFamilyEngagementFixture(store, { scope, studentId: ids.studentId });
  const snapshot = await store.readSnapshot();
  const center = await saveLearningCenter(store, { expectedScope: scope, expectedHead: learningCenterHead(snapshot, scope), expectedInventoryHead: adminLedgerHead(classroomAdminRecords(snapshot, scope)), now: new Date("2026-09-19T09:00:00.000Z"), command: { kind: "plan", title: "Kurgu Merkez Haftası", startOn: "2026-09-21", endOn: "2026-09-25", previousPlanId: null, centers: [{ id: crypto.randomUUID(), name: "Blok merkezi", observation: "Kurgu ortam notu", nextStep: "Kurgu raf düzenlemesi", allocations: [{ itemId: ids.itemId, quantity: 2 }] }] } });
  const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64; const painter = canvas.getContext("2d")!; painter.fillStyle = "#204d45"; painter.fillRect(0, 0, 64, 64); painter.fillStyle = "white"; painter.font = "40px sans-serif"; painter.fillText("K", 15, 48);
  const template = await appendSchoolDocumentTemplate(store, { expectedScope: scope, expectedHead: null, now: new Date("2026-09-19T09:01:00.000Z"), template: { ...DEFAULT_SCHOOL_DOCUMENT_TEMPLATE, headerLines: ["Kurgu Anaokulu", "Kurgu Eğitim Birimi"], logo: { dataUrl: canvas.toDataURL("image/png"), width: 64, height: 64 }, signatureLayout: "teacher-and-principal", principalName: "Kurgu Müdür" } });
  const routine = await saveDailyRoutineCards(store, { scope, expectedEventId: null, now: new Date("2026-09-19T09:02:00.000Z"), draft: { ...routineDraft("short"), title: "Kurgu Günlük Rutin Kartları", dayMode: "short", routineOn: "2026-09-21", source: null } });
  return { ...ids, family, centerId: center.id, templateId: template.id, routineId: routine.id };
}
