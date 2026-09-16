import assert from "node:assert/strict";
import test from "node:test";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
import { assertTeacherFollowupRelationships, followupReminders, GUIDE_DIGEST, isTeacherFollowupRecord, teacherFollowups, TEACHER_FOLLOWUP_SETTING_TYPE } from "../../src/core/domain/teacher-followup.ts";
import { appendTeacherFollowup, applyLearningDecisionToPlan, combinePreparationItems, contactAreaValue, contactAuthorityHistory, contactFreshness, followupFingerprint, pickupContactSnapshot, preparationCandidates } from "../../src/features/teacher-followup/teacher-followup-service.ts";
import { createTeacherOwnedPlanGraph, reviseTeacherOwnedPlan } from "../../src/features/planning/teacher-owned-plan-service.ts";
import { isEntityRecord } from "../../src/core/repository/entities.ts";

const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scope = { academicYearId: uid(8101), classroomId: uid(8102) };
const studentId = uid(8111), otherId = uid(8112);
const base = { createdAt: "2026-09-01T06:00:00.000Z", updatedAt: "2026-09-01T06:00:00.000Z", civilDate: "2026-09-01", deletedAt: null, schemaVersion: 1 };
const now = new Date("2026-09-07T09:00:00.000Z");
const later = n => new Date(now.getTime() + n * 1000);
const mother = { id: uid(8121), kind: "mother", name: "Kurgu Anne", relationship: "Anne", phone: "+905000000001", isPrimary: true, isAuthorizedPickup: true };
class Store {
  constructor(snapshot) { this.snapshot = structuredClone(snapshot); this.fail = false; }
  async readSnapshot() { return structuredClone(this.snapshot); }
  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const result = await task({ getAll: async name => structuredClone(working[name]), putMany: async (name, rows) => { if (this.fail && name === "settings") throw new Error("Kurgu yazma kesintisi"); for (const row of rows) { const i = working[name].findIndex(r => r.id === row.id); if (i < 0) working[name].push(structuredClone(row)); else working[name][i] = structuredClone(row); } }, clear: async name => { working[name] = []; } });
    if (mode === "readwrite") this.snapshot = working;
    return result;
  }
  close() {}
}
function fixture() {
  const s = createEmptySnapshot();
  s.academicYears.push({ ...base, id: scope.academicYearId, name: "Kurgu yıl", startDate: "2026-09-01", endDate: "2027-06-30", status: "active" });
  s.classrooms.push({ ...base, id: scope.classroomId, academicYearId: scope.academicYearId, name: "Kurgu Sınıf" });
  s.settings.push({ ...base, id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE, ...scope });
  s.students.push({ ...base, ...scope, id: studentId, displayName: "Kurgu Çocuk", active: true, contacts: [mother], careDetails: { homeAddress: "Kurgu Sokak No: 1 Acıpayam Denizli" } }, { ...base, ...scope, id: otherId, displayName: "Kurgu İkinci", active: true });
  s.observations.push({ ...base, ...scope, id: uid(8131), studentId, civilDate: "2026-09-07", rawText: "Kurgu çocuk blokları kendi seçti." }, { ...base, ...scope, id: uid(8132), studentId: otherId, civilDate: "2026-09-07", rawText: "Kurgu ikinci çocuk resmi anlattı." });
  s.activities.push({ ...base, ...scope, id: uid(8141), title: "Kurgu oyun", civilDate: "2026-09-14", materials: ["Kâğıt", "Boya"], preparation: ["Kartları hazırla"] }, { ...base, ...scope, id: uid(8142), title: "Kurgu sanat", civilDate: "2026-09-15", materials: ["kâğıt", "2 paket boya"] });
  return new Store(s);
}
const meeting = { kind: "family-meeting", participants: "Kurgu Anne", discussion: "Ev rutini konuşuldu.", decision: "Sabah rutini birlikte izlenecek.", followupOn: "2026-09-10" };
const decision = { kind: "learning-decision", observationIds: [uid(8131)], support: "small-group", teacherDecision: "Öğretmen küçük grupta farklı bloklar sunacak.", targetWeekStart: "2026-09-14", targetWeekEnd: "2026-09-18", reviewOn: "2026-09-18" };
async function createWeek(store) {
  const graph = await createTeacherOwnedPlanGraph(store, { title: "Kurgu yıllık plan", periodStart: "2026-09-01", periodEnd: "2026-09-30", teacherContent: { narrative: "Kurgu yıllık içerik" }, months: [{ title: "Kurgu Eylül", monthKey: "2026-09", periodStart: "2026-09-01", periodEnd: "2026-09-30", teacherContent: { narrative: "Kurgu aylık içerik" }, weeks: [{ title: "Kurgu destek haftası", weekKey: "2026-W38", periodStart: "2026-09-14", periodEnd: "2026-09-18", teacherContent: { narrative: "Önceki öğretmen metni", materials: ["Kâğıt"] } }] }], now: new Date("2026-09-06T09:00:00.000Z") });
  return (await store.readSnapshot()).plans.find(p => p.planType === "weekly");
}

test("MR090 alan bazlı doğrulama yeni ad/telefon değişince eskir; diğer alanlar korunur", async () => {
  const store = fixture(), student = store.snapshot.students[0];
  const areas = ["phones", "address", "pickup"];
  const fingerprints = Object.fromEntries(await Promise.all(areas.map(async a => [a, await followupFingerprint(contactAreaValue(student, a))])));
  const record = await appendTeacherFollowup(store, { studentId, workflow: { kind: "contact-check", areas, fingerprints, source: "family-updated", note: "Veli görüşmesinde kaydedildi." }, expectedStudentUpdatedAt: student.updatedAt, now });
  assert.ok(isEntityRecord("settings", record));
  assert.ok((await contactFreshness(student, teacherFollowups(store.snapshot), "2026-09-07")).every(i => i.state === "current"));
  student.contacts[0].phone = "05000000002";
  const result = await contactFreshness(student, teacherFollowups(store.snapshot), "2026-09-07");
  assert.equal(result.find(i => i.area === "phones").state, "changed");
  assert.equal(result.find(i => i.area === "pickup").state, "changed");
  assert.equal(result.find(i => i.area === "address").state, "current");
  assert.equal(record.workflow.source, "family-updated");
});
test("MR090 eski veya yarışta değişmiş bilgi doğrulaması kabul edilmez", async () => {
  const store = fixture();
  await assert.rejects(appendTeacherFollowup(store, { studentId, workflow: { kind: "contact-check", areas: ["address"], fingerprints: { address: "0".repeat(64) }, source: "teacher-checked", note: "" }, now }), /değişti/);
  await assert.rejects(appendTeacherFollowup(store, { studentId, workflow: meeting, expectedStudentUpdatedAt: "2026-08-01T00:00:00.000Z", now }), /değişti/);
  assert.equal(teacherFollowups(store.snapshot).length, 0);
});
test("MR090 doğrulama 90 gün sonra güncelleme gerektirir; eksik bilgi ayrı gösterilir", async () => {
  const store = fixture(), student = store.snapshot.students[0];
  await appendTeacherFollowup(store, { studentId, workflow: { kind: "contact-check", areas: ["address"], fingerprints: { address: await followupFingerprint(contactAreaValue(student, "address")) }, source: "family-confirmed", note: "" }, now });
  assert.equal((await contactFreshness(student, teacherFollowups(store.snapshot), "2026-12-06")).find(i => i.area === "address").state, "old");
  assert.ok((await contactFreshness(store.snapshot.students[1], [], "2026-09-07")).every(i => i.missing));
});
test("MR091 yetkili kişinin gerçek teslimi ve çift kayıt engeli; gerekçeli düzeltme kaynağı korur", async () => {
  const store = fixture();
  const workflow = { kind: "pickup-log", contact: pickupContactSnapshot(mother), handedOverAt: "2026-09-07T08:55:00.000Z", note: "Kurgu teslim", authorityFingerprint: await followupFingerprint(contactAreaValue(store.snapshot.students[0], "pickup")) };
  const first = await appendTeacherFollowup(store, { studentId, workflow, now });
  await assert.rejects(appendTeacherFollowup(store, { studentId, workflow, now: later(1) }), /Bugün teslim/);
  await appendTeacherFollowup(store, { studentId, workflow: { kind: "pickup-correction", sourceId: first.id, note: "Yanlış saat seçildi; doğru saatle yeniden kaydedilecek." }, now: later(2) });
  await appendTeacherFollowup(store, { studentId, workflow: { ...workflow, handedOverAt: "2026-09-07T08:58:00.000Z" }, now: later(3) });
  assert.equal(teacherFollowups(store.snapshot).filter(r => r.workflow.kind === "pickup-log").length, 2);
  assert.deepEqual(teacherFollowups(store.snapshot).find(r => r.id === first.id), first);
});
test("MR091 yetkisiz, değişmiş, gelecek ve önceki gün teslimleri engellenir", async () => {
  const store = fixture();
  const workflow = { kind: "pickup-log", contact: pickupContactSnapshot(mother), handedOverAt: "2026-09-07T08:55:00.000Z", note: "", authorityFingerprint: await followupFingerprint(contactAreaValue(store.snapshot.students[0], "pickup")) };
  store.snapshot.students[0].contacts[0].isAuthorizedPickup = false;
  await assert.rejects(appendTeacherFollowup(store, { studentId, workflow, now }), /yetkisi/);
  store.snapshot.students[0].contacts[0].isAuthorizedPickup = true;
  await assert.rejects(appendTeacherFollowup(store, { studentId, workflow: { ...workflow, handedOverAt: "2026-09-07T10:55:00.000Z" }, now }), /tarih/);
  await assert.rejects(appendTeacherFollowup(store, { studentId, workflow: { ...workflow, handedOverAt: "2026-09-06T08:55:00.000Z" }, now }), /bugünün/);
});
test("MR091 profil yetki ve iletişim değişiklikleri önce/sonra değerleriyle tarihlenir", () => {
  const before = fixture().snapshot.students[0], after = structuredClone(before);
  after.contacts[0].phone = "05000000003";
  after.contacts[0].isAuthorizedPickup = false;
  const rows = contactAuthorityHistory(before, after, now);
  assert.equal(rows.length, 1); assert.ok(rows.every(isTeacherFollowupRecord));
  assert.equal(rows[0].workflow.before.authorized, true); assert.equal(rows[0].workflow.after.authorized, false);
  assert.equal(rows[0].workflow.before.phone, "+905000000001"); assert.equal(rows[0].workflow.after.phone, "+905000000003");
  assert.equal(contactAuthorityHistory(before, structuredClone(before), now).length, 0);
});
test("MR092 görüşme takibi kapanır, yeniden tarihlenir; kaynak görüşme değiştirilmez", async () => {
  const store = fixture(); const first = await appendTeacherFollowup(store, { studentId, workflow: meeting, now });
  assert.equal(followupReminders(teacherFollowups(store.snapshot), "2026-09-09").length, 0);
  assert.equal(followupReminders(teacherFollowups(store.snapshot), "2026-09-10").length, 1);
  await appendTeacherFollowup(store, { studentId, workflow: { kind: "followup-resolution", sourceId: first.id, outcome: "Kurgu görüşme yapıldı.", nextFollowupOn: "2026-09-15" }, now: later(1) });
  assert.equal(followupReminders(teacherFollowups(store.snapshot), "2026-09-10").length, 0);
  await appendTeacherFollowup(store, { studentId, workflow: { kind: "followup-resolution", sourceId: first.id, outcome: "Takip tamamlandı.", nextFollowupOn: null }, now: later(2) });
  assert.equal(followupReminders(teacherFollowups(store.snapshot), "2026-09-30").length, 0);
  assert.deepEqual(store.snapshot.settings.find(r => r.id === first.id), first);
});
test("MR092 başka çocuk, olmayan kaynak ve geriye giden takip zinciri reddedilir", async () => {
  const store = fixture(), first = await appendTeacherFollowup(store, { studentId, workflow: meeting, now });
  await assert.rejects(appendTeacherFollowup(store, { studentId: otherId, workflow: { kind: "followup-resolution", sourceId: first.id, outcome: "Kurgu sonuç", nextFollowupOn: null }, now: later(1) }), /kaynak/);
  await assert.rejects(appendTeacherFollowup(store, { studentId, workflow: { kind: "followup-resolution", sourceId: uid(8999), outcome: "Kurgu sonuç", nextFollowupOn: null }, now: later(1) }), /kaynak/);
  await assert.rejects(appendTeacherFollowup(store, { studentId, workflow: { ...meeting, followupOn: "2026-09-06" }, now: later(1) }), /Takip tarihi/);
});
test("MR093 aynı malzeme kaynakları korunarak birleşir; miktar uydurulmaz; haftalık plan oluşturma tarihi değil dönemle seçilir", async () => {
  const store = fixture(); const week = await createWeek(store);
  const candidates = preparationCandidates(store.snapshot, scope, "2026-09-14", "2026-09-18");
  assert.ok(candidates.some(c => c.source.id === week.id));
  const items = combinePreparationItems(candidates, "2026-09-14");
  assert.equal(items.filter(i => i.text.toLocaleLowerCase("tr-TR") === "kâğıt").length, 1);
  assert.equal(items.find(i => i.text === "Kâğıt").sourceIds.length, 3);
  assert.ok(items.some(i => i.text === "Boya")); assert.ok(items.some(i => i.text === "2 paket boya"));
  assert.ok(items.find(i => i.text === "Kartları hazırla").advance);
});
test("MR093 hazırlık listesi, tamamlamalar ve yeniden açma kalıcı ve kaynaklıdır", async () => {
  const store = fixture(); const candidates = preparationCandidates(store.snapshot, scope, "2026-09-14", "2026-09-18"); const items = combinePreparationItems(candidates, "2026-09-13");
  const list = await appendTeacherFollowup(store, { studentId: null, workflow: { kind: "preparation-list", weekStart: "2026-09-14", weekEnd: "2026-09-18", sources: candidates.map(c => c.source), items }, now });
  await appendTeacherFollowup(store, { studentId: null, workflow: { kind: "preparation-check", sourceId: list.id, itemId: items[0].id, completed: true }, now: later(1) });
  assert.equal(followupReminders(teacherFollowups(store.snapshot), "2026-09-13").length, items.length - 1);
  const reloaded = new Store(await store.readSnapshot());
  assertTeacherFollowupRelationships(reloaded.snapshot);
  await appendTeacherFollowup(reloaded, { studentId: null, workflow: { kind: "preparation-check", sourceId: list.id, itemId: items[0].id, completed: false }, now: later(2) });
  assert.equal(followupReminders(teacherFollowups(reloaded.snapshot), "2026-09-13").length, items.length);
});
test("MR093 değişmiş kaynak ve listede bulunmayan madde fail-closed", async () => {
  const store = fixture(); const candidates = preparationCandidates(store.snapshot, scope, "2026-09-14", "2026-09-18");
  store.snapshot.activities[0].updatedAt = later(1).toISOString();
  await assert.rejects(appendTeacherFollowup(store, { studentId: null, workflow: { kind: "preparation-list", weekStart: "2026-09-14", weekEnd: "2026-09-18", sources: candidates.map(c => c.source), items: combinePreparationItems(candidates, "2026-09-13") }, now: later(2) }), /kaynağı değişti/);
});
test("MR094 rehber sayfa+hash+öğretmen adımı korunur, tamamlanınca bildirim kapanır", async () => {
  const store = fixture(); const step = await appendTeacherFollowup(store, { studentId, workflow: { kind: "guide-step", page: 6, sourceSha256: GUIDE_DIGEST, title: "Kurgu karşılama adımı", plannedOn: "2026-09-08" }, now });
  await appendTeacherFollowup(store, { studentId, workflow: { kind: "guide-observation", sourceId: step.id, observation: "Kurgu çocuk karşılama sırasında öğretmene el salladı.", status: "continuing", nextFollowupOn: "2026-09-10" }, now: later(1) });
  assert.equal(followupReminders(teacherFollowups(store.snapshot), "2026-09-10").length, 1);
  await appendTeacherFollowup(store, { studentId, workflow: { kind: "guide-observation", sourceId: step.id, observation: "Öğretmen planladığı karşılama adımını tamamladı.", status: "completed", nextFollowupOn: null }, now: later(2) });
  assert.equal(followupReminders(teacherFollowups(store.snapshot), "2026-09-10").length, 0);
  for (const patch of [{ page: 0 }, { page: 36 }, { sourceSha256: "0".repeat(64) }]) await assert.rejects(appendTeacherFollowup(store, { studentId, workflow: { ...step.workflow, ...patch }, now: later(3) }));
});
test("MR095 eğitim kararı gelecek hafta taslağıdır; gözlem ve başarı üretmez", async () => {
  const store = fixture(); const before = structuredClone(store.snapshot.observations);
  await appendTeacherFollowup(store, { studentId, workflow: decision, now });
  assert.deepEqual(store.snapshot.observations, before); assert.equal(store.snapshot.plans.length, 0);
  assert.equal(followupReminders(teacherFollowups(store.snapshot), "2026-09-18")[0].kind, "learning");
  for (const patch of [{ observationIds: [uid(8132)] }, { targetWeekStart: "2026-09-07" }]) await assert.rejects(appendTeacherFollowup(store, { studentId, workflow: { ...decision, ...patch }, now: later(1) }));
  store.snapshot.observations[0].deletedAt = later(2).toISOString();
  await assert.rejects(appendTeacherFollowup(store, { studentId, workflow: decision, now: later(3) }), /silinmemiş/);
});
test("MR095 plan bağlantısı gerçek metin ve revizyonla atomik oluşur; tekrar aynı işlemi çoğaltmaz", async () => {
  const store = fixture(); const week = await createWeek(store);
  const d = await appendTeacherFollowup(store, { studentId, workflow: decision, now });
  const applied = await applyLearningDecisionToPlan(store, { decisionId: d.id, planId: week.id, expectedUpdatedAt: week.updatedAt, appliedText: "Kurgu destek metni", now: later(1) });
  const updated = store.snapshot.plans.find(p => p.id === week.id);
  assert.equal(updated.revisionNumber, 2); assert.equal(updated.revisionHistory[0].teacherContent.narrative, "Önceki öğretmen metni");
  assert.equal(updated.teacherContent.narrative, "Önceki öğretmen metni");
  assert.deepEqual(updated.teacherContent.followupSupportSteps, [{ decisionId: d.id, studentId, text: "Kurgu destek metni" }]);
  assert.equal(applied.workflow.planRevision, 2); assertTeacherFollowupRelationships(store.snapshot);
  const repeat = await applyLearningDecisionToPlan(store, { decisionId: d.id, planId: week.id, expectedUpdatedAt: updated.updatedAt, appliedText: "Kurgu destek metni", now: later(2) });
  assert.equal(repeat.id, applied.id); assert.equal(store.snapshot.plans.find(p => p.id === week.id).revisionNumber, 2);
  await reviseTeacherOwnedPlan(store, { planId: week.id, expectedUpdatedAt: updated.updatedAt, teacherContent: { narrative: "Öğretmen sonra yeni metin yazdı." }, now: later(3) });
  assertTeacherFollowupRelationships(store.snapshot);
  const tampered = structuredClone(store.snapshot); tampered.plans.find(p => p.id === week.id).revisionHistory.find(r => r.revisionNumber === 2).teacherContent.followupSupportSteps[0].text = "Bağlantının gerçek metni silindi.";
  assert.throws(() => assertTeacherFollowupRelationships(tampered), /metni doğrulanamadı/);
});
test("MR095 sahte applied kaydı generic append ile yazılamaz, kesintide plan da geri alınır", async () => {
  const store = fixture(); const week = await createWeek(store); const d = await appendTeacherFollowup(store, { studentId, workflow: decision, now });
  await assert.rejects(appendTeacherFollowup(store, { studentId, workflow: { kind: "learning-plan-link", sourceId: d.id, planId: week.id, planRevision: 2, appliedText: "Sahte" }, now: later(1) }), /ilgili plan/);
  const before = await store.readSnapshot(); store.fail = true;
  await assert.rejects(applyLearningDecisionToPlan(store, { decisionId: d.id, planId: week.id, expectedUpdatedAt: week.updatedAt, appliedText: "Kurgu destek", now: later(1) }), /kesintisi/);
  assert.deepEqual(store.snapshot, before);
});
test("MR095 planlanmış destek tarihinden önce sonuç yazılamaz; sonrasında öğretmen sonucu saklanır", async () => {
  const store = fixture(); const d = await appendTeacherFollowup(store, { studentId, workflow: decision, now });
  const workflow = { kind: "learning-reflection", sourceId: d.id, reflection: "Kurgu öğretmen uygulamayı gözden geçirdi.", nextStep: "Desteğe farklı materyalle devam edilecek.", nextFollowupOn: null };
  await assert.rejects(appendTeacherFollowup(store, { studentId, workflow, now: later(1) }), /uygulanmadan/);
  await appendTeacherFollowup(store, { studentId, workflow, now: new Date("2026-09-18T09:00:00.000Z") });
  assert.equal(followupReminders(teacherFollowups(store.snapshot), "2026-09-18").length, 0);
});
test("Bütün takip olayları kesin alan, UTC, civil_date ve öğrenci/kapsam ilişkisi taşır", async () => {
  const store = fixture(); const r = await appendTeacherFollowup(store, { studentId, workflow: meeting, now });
  for (const mutate of [x => { x.workflow.extra = "yasak"; }, x => { x.workflow.followupOn = "2026-02-31"; }, x => { x.createdAt = "2026-09-07T12:00:00"; }, x => { x.updatedAt = later(1).toISOString(); }, x => { x.studentId = null; }, x => { x.schemaVersion = 9; }]) {
    const changed = structuredClone(r); mutate(changed); assert.equal(isTeacherFollowupRecord(changed), false); assert.equal(isEntityRecord("settings", changed), false);
  }
  const invalid = structuredClone(store.snapshot); invalid.students = invalid.students.filter(s => s.id !== studentId);
  assert.throws(() => assertTeacherFollowupRelationships(invalid), /çocuk ilişkisi/);
  assert.equal(TEACHER_FOLLOWUP_SETTING_TYPE, r.settingType);
});
