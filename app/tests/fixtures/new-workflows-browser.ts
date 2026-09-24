import * as core from "../../src/core/index.ts";
import { makeDevelopmentReportFixture } from "./development-report-fixture.mjs";
import { saveClassroomConfiguration } from "../../src/features/today/today-data.ts";
import { executeConsentTrip } from "../../src/features/consent-trips/consent-trip-service.ts";
import { consentTripRecords, tripState } from "../../src/core/domain/consent-trips.ts";
import { appendClassroomAdmin, buildHandoverItems } from "../../src/features/classroom-admin/classroom-admin-service.ts";
import { adminLedgerHead, classroomAdminRecords } from "../../src/core/domain/classroom-admin.ts";
import { appendTeacherFollowup } from "../../src/features/teacher-followup/teacher-followup-service.ts";
import { GROWTH_MEASUREMENT_SETTING_TYPE, assertGrowthMeasurementSnapshotRelations } from "../../src/core/domain/growth-measurements.ts";
import { saveGrowthMeasurement } from "../../src/features/growth-measurements/growth-measurement-service.ts";

/** Only synthetic domain data. Every source is created by a domain service or exact validator. */
export async function seedNewWorkflows(store) {
  const fixture = await makeDevelopmentReportFixture(store);
  const { studentId, academicYearId, classroomId } = fixture.input;
  const otherId = fixture.otherStudentId, scope = { academicYearId, classroomId };
  await saveClassroomConfiguration(store, { academicYear: { id: academicYearId, name: "Kurgu Yıl", startDate: "2026-09-01", endDate: "2027-06-30" }, classroom: { id: classroomId, name: "Kurgu Sınıf", schoolName: "Kurgu Okul", teacherName: "Kurgu Öğretmen", ageGroup: "60-72 ay" }, schedule: { kind: "morning", startTime: "08:30", endTime: "12:30" }, now: new Date("2026-09-08T07:30:00.000Z") });
  await store.transaction("readwrite", ["students"], async tx => {
    const students = await tx.getAll("students");
    await tx.putMany("students", students.map(s => ({ ...s, enrollments: [{ id: crypto.randomUUID(), ...scope, startedOn: "2026-09-01", status: "active", schemaVersion: 1 }] })));
  });
  const meetingIds = [];
  for (const [index, childId] of [studentId, otherId].entries()) {
    const meeting = await appendTeacherFollowup(store, { studentId: childId, workflow: { kind: "family-meeting", participants: "Kurgu veli", discussion: "Kurgu özel aile notu", decision: "Kurgu takip kararı", followupOn: "2026-09-21" }, now: new Date(`2026-09-08T08:0${index}:00.000Z`) });
    meetingIds.push(meeting.id);
  }
  let moment = Date.parse("2026-09-08T08:10:00.000Z");
  const measurements = [];
  for (const childId of [studentId, otherId]) for (const metric of ["height", "weight"]) {
    const first = await saveGrowthMeasurement(store, { ...scope, studentId: childId, periodKey: "2026-09", metric, integerValue: metric === "height" ? 1100 : 18500, measuredOn: "2026-09-08", source: "school", expectedSelectionEventId: null, measuredBy: "Kurgu Öğretmen", instrument: "Kurgu ölçüm aracı", conditionsNote: "Kurgu özel ölçüm koşulu", now: new Date(moment += 1000) });
    measurements.push(first.measurement.id);
    if (childId === studentId) {
      await saveGrowthMeasurement(store, { ...scope, studentId: childId, periodKey: "2026-09", metric, integerValue: metric === "height" ? 1105 : 18600, measuredOn: "2026-09-08", source: "family", expectedSelectionEventId: first.selection.id,
        ...(metric === "height" ? { repeatOfId: first.measurement.id } : { correction: { correctsId: first.measurement.id, reason: "Kurgu birim kontrolü" } }), now: new Date(moment += 1000) });
    }
  }
  assertGrowthMeasurementSnapshotRelations(await store.readSnapshot());
  let consentMoment = Date.parse("2026-09-09T08:00:00.000Z");
  const consent = command => executeConsentTrip(store, { scope, command, now: new Date(consentMoment += 1000) });
  const document = await consent({ action: "document", document: { previousDocumentId: null, title: "Kurgu Gezi İzni", purpose: "trip", eventTitle: "Kurgu Park Gezisi", body: "Kurgu ortak veli belgesi; gerçek kişi içermez.", validFrom: "2026-09-09", validUntil: "2026-09-30" } });
  const grantIds = [];
  for (const childId of [studentId, otherId]) {
    const grant = await consent({ action: "decision", studentId: childId, decision: { documentId: document.id, previousDecisionId: null, decision: "grant", signedOn: "2026-09-09", validFrom: "2026-09-09", validUntil: "2026-09-30", signatory: "Kurgu İmzalayan", signatoryRole: "Anne", source: "signed-paper", sourceReference: "KURGU-BELGE-001", note: "Kurgu özel izin notu" } });
    grantIds.push(grant.id);
  }
  const plan = await consent({ action: "plan", plan: { title: "Kurgu Park Gezisi", plannedOn: "2026-09-10", destination: "Kurgu Park", responsible: "Kurgu Öğretmen", documentId: document.id, selectedStudentIds: [studentId, otherId] } });
  consentMoment = Date.parse("2026-09-10T09:00:00.000Z");
  const tripCommand = async command => { const state = tripState(consentTripRecords(await store.readSnapshot()), plan.id); return consent({ ...command, tripId: plan.id, expectedEventId: state.latestEventId }); };
  await tripCommand({ action: "start" });
  for (const stage of ["departure", "checkpoint", "return"]) for (const childId of [studentId, otherId]) await tripCommand({ action: "check", studentId: childId, stage, outcome: "seen", actualAt: new Date(consentMoment).toISOString(), previousCheckId: null, correctionReason: "", note: "Kurgu özel sayım notu" });
  await tripCommand({ action: "complete" });
  let adminMoment = Date.parse("2026-09-11T08:00:00.000Z");
  const admin = async workflow => appendClassroomAdmin(store, { workflow, expectedScope: scope, expectedHead: adminLedgerHead(classroomAdminRecords(await store.readSnapshot(), scope)), now: new Date(adminMoment += 1000) });
  const item = await admin({ kind: "inventory-item", name: "Kurgu Top", category: "Oyun", unit: "adet", initialQuantity: 10, note: "Kurgu stok" });
  const movement = (action, quantity, extra = {}) => admin({ kind: "inventory-movement", itemId: item.id, action, quantity, party: null, dueOn: null, loanId: null, note: "Kurgu stok hareketi", preparationId: null, ...extra });
  await movement("add", 3);
  const consumed = await movement("consume", 2);
  await movement("damage", 1); await movement("repair", 1);
  const loan = await movement("loan", 2, { party: { type: "student", studentId, name: "" }, dueOn: "2026-09-21" });
  await movement("return", 1, { loanId: loan.id });
  const otherLoan = await movement("loan", 1, { party: { type: "student", studentId: otherId, name: "" }, dueOn: "2026-09-21" });
  await admin({ kind: "inventory-reversal", sourceId: consumed.id, note: "Kurgu sayım düzeltmesi" });
  const items = buildHandoverItems(await store.readSnapshot(), scope, ["Kurgu ortak sınıf görevi"]);
  const handover = await admin({ kind: "handover-plan", title: "Kurgu Devir", recipient: "Kurgu Öğretmen", dueOn: "2026-09-21", note: "Kurgu genel devir notu", items });
  await admin({ kind: "handover-revision", handoverId: handover.id, items: buildHandoverItems(await store.readSnapshot(), scope, ["Kurgu ikinci ortak görev"], items), note: "Kurgu görev eklendi" });
  const currentItems = classroomAdminRecords(await store.readSnapshot()).filter(r => r.workflow.kind === "handover-revision").at(-1).workflow.items;
  for (const entry of currentItems) await admin({ kind: "handover-check", handoverId: handover.id, itemId: entry.id, completed: true, note: "Kurgu kontrol" });
  await admin({ kind: "handover-close", handoverId: handover.id, recipient: "Kurgu Öğretmen", note: "Kurgu devir tamamlandı" });
  return { ...scope, studentId, otherId, meetingIds, measurements, tripId: plan.id, documentId: document.id, grantIds, itemId: item.id, loanId: loan.id, otherLoanId: otherLoan.id, handoverId: handover.id };
}

export async function archiveWorkflowStudent(store, studentId) {
  await store.transaction("readwrite", ["students"], async tx => {
    const s = (await tx.getAll("students")).find(s => s.id === studentId);
    await tx.putMany("students", [{ ...s, active: false, enrollmentStatus: "left", updatedAt: "2026-09-20T08:00:00.000Z", enrollments: s.enrollments.map(e => ({ ...e, status: "left", endedOn: "2026-09-20" })) }]);
  });
}
