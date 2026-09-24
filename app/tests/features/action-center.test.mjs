import assert from "node:assert/strict";
import test from "node:test";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
import { actionCenterModel, categoryChoices, supportPeriod } from "../../src/features/action-center/action-center-model.ts";
import { assignObservationCategory, executeObservationSupport, createPreparedChecklist, completePreparedItem } from "../../src/features/action-center/action-center-service.ts";
import { assertTeacherFollowupRelationships, teacherFollowups } from "../../src/core/domain/teacher-followup.ts";
import { createTeacherOwnedPlanGraph } from "../../src/features/planning/teacher-owned-plan-service.ts";

const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scope = { academicYearId: uid(9001), classroomId: uid(9002) };
const studentId = uid(9003), observationId = uid(9004);
const now = new Date("2026-09-10T09:00:00.000Z");
const base = { createdAt: "2026-09-01T06:00:00.000Z", updatedAt: "2026-09-01T06:00:00.000Z", civilDate: "2026-09-01", deletedAt: null, schemaVersion: 1 };
class Store {
  constructor(snapshot) { this.snapshot = structuredClone(snapshot); this.queue = Promise.resolve(); this.failCollection = null; }
  async readSnapshot() { return structuredClone(this.snapshot); }
  transaction(mode, collections, task) {
    const job = this.queue.then(async () => {
      const working = structuredClone(this.snapshot);
      const result = await task({ getAll: async name => structuredClone(working[name]), putMany: async (name, rows) => { if (name === this.failCollection) throw new Error("Kurgu yazma hatası"); for (const row of rows) { const i = working[name].findIndex(r => r.id === row.id); if (i < 0) working[name].push(structuredClone(row)); else working[name][i] = structuredClone(row); } }, clear: async name => { working[name] = []; } });
      if (mode === "readwrite") this.snapshot = working;
      return result;
    });
    this.queue = job.catch(() => {});
    return job;
  }
  close() {}
}
function fixture() {
  const s = createEmptySnapshot();
  s.academicYears.push({ ...base, id: scope.academicYearId, name: "Kurgu yıl", startDate: "2026-09-01", endDate: "2027-06-30", status: "active" });
  s.classrooms.push({ ...base, id: scope.classroomId, academicYearId: scope.academicYearId, name: "Kurgu Sınıf" });
  s.settings.push({ ...base, id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE, ...scope });
  s.students.push({ ...base, ...scope, id: studentId, displayName: "Kurgu Çocuk", active: true });
  s.observations.push({ ...base, ...scope, id: observationId, studentId, civilDate: "2026-09-10", rawText: "  Arkadaşına resmi anlattı.\nKendi sözünü kullandı.  ", childQuote: "Bu benim resmim.", context: "Serbest zaman", rawTextImmutable: true, observationCategories: [] });
  s.activities.push({ ...base, ...scope, id: uid(9005), title: "Kurgu Oyun", civilDate: "2026-09-14", materials: ["Kâğıt", "Boya"], preparation: ["Masayı hazırla"] });
  return new Store(s);
}
const action = store => actionCenterModel(store.snapshot, { now, studentId, observationId }).observations[0];
async function categorized(store) { await assignObservationCategory(store, { ...action(store).scope, category: "language-communication", now }); return action(store); }

test("Kategoriler ham gözleme göre sıralanır; tahmin kayıt üretmez, özgün metin korunur", async () => {
  const store = fixture(), before = structuredClone(store.snapshot.observations[0]);
  const suggestion = action(store);
  assert.equal(categoryChoices("Resmi anlattı, bir cümle söyledi.")[0], "language-communication");
  assert.equal(suggestion.needsCategory, true);
  assert.deepEqual(store.snapshot.observations[0], before);
  await assignObservationCategory(store, { ...suggestion.scope, category: "language-communication", now });
  for (const field of ["rawText", "childQuote", "context", "createdAt", "civilDate"]) assert.equal(store.snapshot.observations[0][field], before[field]);
  assert.deepEqual(store.snapshot.observations[0].observationCategories, ["language-communication"]);
  assert.equal(store.snapshot.observations[0].observationTaxonomyVersion, "maarifos-observation-v2");
  assert.equal((await assignObservationCategory(store, { ...suggestion.scope, category: "language-communication", now })).alreadyCompleted, true);
});
test("Tek seçim yıllık-aylık-haftalık planı ve kaynak karar/bağını atomik tamamlar; çift tıklama tekrarlamaz", async () => {
  const store = fixture(), selected = await categorized(store), raw = store.snapshot.observations[0].rawText;
  const results = await Promise.all([1,2].map(() => executeObservationSupport(store, { action: selected, optionId: "small-group", now })));
  assert.equal(results[0].planId, results[1].planId);
  assert.equal(results[1].alreadyCompleted, true);
  assert.equal(store.snapshot.plans.length, 3);
  const records = teacherFollowups(store.snapshot);
  assert.deepEqual(records.map(r => r.workflow.kind), ["learning-decision", "learning-plan-link"]);
  const plan = store.snapshot.plans.find(p => p.id === results[0].planId);
  assert.equal(plan.periodStart, "2026-09-14"); assert.equal(plan.periodEnd, "2026-09-18");
  assert.match(plan.teacherContent.followupSupportSteps[0].text, /Küçük|küçük/);
  assert.equal(plan.revisionHistory.length, 1);
  assert.equal(store.snapshot.observations[0].rawText, raw);
  assertTeacherFollowupRelationships(store.snapshot);
  assert.equal(actionCenterModel(store.snapshot, { now }).observations.length, 0);
  assert.equal(action(store).planId, plan.id);
});
test("Aynı haftanın mevcut öğretmen planını kullanır ve önceki içerik/revizyonları korur", async () => {
  const store = fixture();
  const graph = await createTeacherOwnedPlanGraph(store, { title: "Kurgu yıllık plan", periodStart: "2026-09-01", periodEnd: "2027-06-30", teacherContent: { narrative: "Yıllık özgün metin" }, months: [{ title: "Eylül", monthKey: "2026-09", periodStart: "2026-09-01", periodEnd: "2026-09-30", teacherContent: { narrative: "Aylık özgün metin" }, weeks: [{ title: "Özgün hafta", weekKey: "2026-W38", periodStart: "2026-09-14", periodEnd: "2026-09-20", teacherContent: { narrative: "Öğretmenin önceki planı" } }] }], now });
  const selected = await categorized(store);
  const result = await executeObservationSupport(store, { action: selected, optionId: "observe-again", now });
  assert.equal(result.planId, graph.months[0].weeks[0].id);
  assert.equal(store.snapshot.plans.length, 3);
  assert.equal(store.snapshot.plans.find(p => p.id === result.planId).teacherContent.narrative, "Öğretmenin önceki planı");
  assertTeacherFollowupRelationships(store.snapshot);
});
test("Var olan ay içinde eksik gelecek haftayı aynı ebeveyne ekler", async () => {
  const store = fixture();
  const graph = await createTeacherOwnedPlanGraph(store, { title: "Kurgu yıllık plan", periodStart: "2026-09-01", periodEnd: "2027-06-30", teacherContent: { narrative: "Yıl" }, months: [{ title: "Eylül", monthKey: "2026-09", periodStart: "2026-09-01", periodEnd: "2026-09-30", teacherContent: { narrative: "Ay" }, weeks: [{ title: "Bu hafta", weekKey: "2026-W37", periodStart: "2026-09-07", periodEnd: "2026-09-11", teacherContent: { narrative: "Eski hafta" } }] }], now });
  const selected = await categorized(store);
  const result = await executeObservationSupport(store, { action: selected, optionId: "adapt-environment", now });
  const weekly = store.snapshot.plans.find(p => p.id === result.planId);
  assert.equal(weekly.monthlyPlanId, graph.months[0].monthly.id);
  assert.equal(store.snapshot.plans.length, 4);
  assert.deepEqual(store.snapshot.plans.find(p => p.id === graph.months[0].monthly.id).weeklySectionIds, [graph.months[0].weeks[0].id, weekly.id]);
});
test("Eksik sonraki ay mevcut yıllık plana bağlanır; ay/yıl sınırını aşmaz", async () => {
  const store = fixture();
  const selected = await categorized(store);
  await executeObservationSupport(store, { action: selected, optionId: "observe-again", now });
  const later = new Date("2026-10-01T09:00:00.000Z");
  store.snapshot.observations.push({ ...store.snapshot.observations[0], id: uid(9010), civilDate: "2026-10-01", createdAt: later.toISOString(), updatedAt: later.toISOString() });
  const next = actionCenterModel(store.snapshot, { now: later, observationId: uid(9010), studentId }).observations[0];
  await executeObservationSupport(store, { action: next, optionId: "observe-again", now: later });
  assert.equal(store.snapshot.plans.filter(p => p.planType === "annual").length, 1);
  assert.equal(store.snapshot.plans.filter(p => p.planType === "monthly").length, 2);
  assert.equal(supportPeriod(store.snapshot, scope, "2026-09-24").end, "2026-09-30");
  assert.equal(supportPeriod(store.snapshot, scope, "2027-06-30"), null);
});
test("Eski kaynak, arşivlenmiş öğrenci, değişen sınıf ve eski tarih seçimi hiçbir kayıt yazmaz", async () => {
  for (const change of [s => { s.observations[0].updatedAt = "2026-09-10T10:00:00.000Z"; }, s => { s.students[0].active = false; }, s => { s.settings[0].classroomId = uid(9999); }, s => { s.academicYears[0].status = "archived"; }]) {
    const store = fixture(), selected = await categorized(store); change(store.snapshot); const before = structuredClone(store.snapshot);
    await assert.rejects(executeObservationSupport(store, { action: selected, optionId: "small-group", now }), /değişti/);
    assert.deepEqual(store.snapshot, before);
  }
  const store = fixture(), selected = await categorized(store), before = structuredClone(store.snapshot);
  await assert.rejects(executeObservationSupport(store, { action: selected, optionId: "small-group", now: new Date("2026-09-14T09:00:00.000Z") }), /değişti/);
  assert.deepEqual(store.snapshot, before);
});
test("Karar yazımı başarısız olursa yeni plan omurgası dahil tüm değişiklikler geri alınır", async () => {
  const store = fixture(), selected = await categorized(store), before = structuredClone(store.snapshot);
  store.failCollection = "settings";
  await assert.rejects(executeObservationSupport(store, { action: selected, optionId: "small-group", now }), /yazma hatası/);
  assert.deepEqual(store.snapshot, before);
});
test("Hazırlık listesi gerçek kaynaklardan oluşur, tek madde tamamlanır ve tekrar tıklama yeni olay üretmez", async () => {
  const store = fixture(), model = actionCenterModel(store.snapshot, { now });
  await createPreparedChecklist(store, { ...scope, candidates: model.candidates, now });
  assert.equal((await createPreparedChecklist(store, { ...scope, candidates: model.candidates, now })).alreadyCompleted, true);
  const after = actionCenterModel(store.snapshot, { now });
  assert.equal(after.preparation.length, 3); assert.equal(after.candidates.length, 0);
  await completePreparedItem(store, { ...after.preparation[0], now });
  assert.equal((await completePreparedItem(store, { ...after.preparation[0], now })).alreadyCompleted, true);
  assert.equal(actionCenterModel(store.snapshot, { now }).preparation.length, 2);
  assertTeacherFollowupRelationships(store.snapshot);
});
test("Hazırlık kaynak değişikliği ve çocuk kapsamı yanlış tamamlama oluşturmaz", async () => {
  const store = fixture(), model = actionCenterModel(store.snapshot, { now });
  assert.equal(actionCenterModel(store.snapshot, { now, studentId }).candidates.length, 0);
  await createPreparedChecklist(store, { ...scope, candidates: model.candidates, now });
  const item = actionCenterModel(store.snapshot, { now }).preparation[0];
  store.snapshot.activities[0].updatedAt = "2026-09-10T11:00:00.000Z";
  const before = structuredClone(store.snapshot);
  await assert.rejects(completePreparedItem(store, { ...item, now }), /değişti/);
  assert.deepEqual(store.snapshot, before);
  assert.equal(actionCenterModel(store.snapshot, { now }).preparation.length, 0);
  assert.equal(actionCenterModel(store.snapshot, { now }).candidates.length, 1);
});

test("Görünen hedef plan değişince eski seçenek uygulanmaz; önceden başlayan uzun hafta ileri taşınır", async () => {
  const store = fixture();
  await createTeacherOwnedPlanGraph(store, { title: "Kurgu yıl", periodStart: "2026-09-01", periodEnd: "2027-06-30", teacherContent: { narrative: "Yıl" }, months: [{ title: "Ay", monthKey: "2026-09", periodStart: "2026-09-01", periodEnd: "2026-09-30", teacherContent: { narrative: "Ay" }, weeks: [{ title: "Gelecek hafta", weekKey: "2026-W38", periodStart: "2026-09-14", periodEnd: "2026-09-18", teacherContent: { narrative: "Özgün içerik" } }] }], now });
  const selected = await categorized(store);
  store.snapshot.plans.find(p => p.planType === "weekly").updatedAt = "2026-09-10T11:00:00.000Z";
  const before = structuredClone(store.snapshot);
  await assert.rejects(executeObservationSupport(store, { action: selected, optionId: "small-group", now }), /değişti/);
  assert.deepEqual(store.snapshot, before);
  const week = store.snapshot.plans.find(p => p.planType === "weekly");
  week.periodStart = "2026-09-07"; week.periodEnd = "2026-09-20"; week.civilDate = "2026-09-07";
  assert.equal(supportPeriod(store.snapshot, scope, "2026-09-10").start, "2026-09-21");
});
