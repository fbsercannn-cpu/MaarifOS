import assert from "node:assert/strict";
import test from "node:test";
import { makeObservationManagementFixture } from "../fixtures/observation-management-fixture.mjs";
import { observationMetadataModel, observationMetadataFingerprint, shiftedObservedAt } from "../../src/features/observation-management/observation-management-model.ts";
import { actionCenterModel } from "../../src/features/action-center/action-center-model.ts";
import { assignObservationCategory, executeObservationSupport } from "../../src/features/action-center/action-center-service.ts";

test("Tarih seçenekleri yalnız olay günündeki bütün katılımcılara atanmış gerçek etkinlikleri sunar", async () => {
  const f = await makeObservationManagementFixture(), before = await f.store.readSnapshot();
  const model = observationMetadataModel(before, f.observationId, "2026-09-09", f.now);
  assert.equal(model.dateValid, true); assert.equal(model.placements.length, 1);
  assert.equal(model.placements[0].id, f.source.activity.id); assert.equal(model.placements[0].targets[0].id, f.target.id);
  assert.equal(model.keepCurrent, false); assert.equal(model.currentIsSpontaneous, true);
  assert.deepEqual(await f.store.readSnapshot(), before);
  before.observations.find(o => o.id === f.observationId).studentIds.push(f.otherStudentId);
  assert.equal(observationMetadataModel(before, f.observationId, "2026-09-09", f.now).placements.length, 0);
});
test("Gelecek/üyelik dışı tarihler eylem üretmez, kaynak değişimi eski seçimi geçersiz kılar", async () => {
  const f = await makeObservationManagementFixture(), snapshot = await f.store.readSnapshot();
  for (const day of ["2026-09-11", "2026-08-01", "2026-02-30"]) assert.equal(observationMetadataModel(snapshot, f.observationId, day, f.now).dateValid, false);
  const source = snapshot.observations.find(o => o.id === f.observationId), before = observationMetadataFingerprint(snapshot, source);
  source.observedAt = "2026-09-09T09:00:00.000Z";
  assert.notEqual(observationMetadataFingerprint(snapshot, source), before);
});
test("Maarif seçenekleri sınıfın açık yaş bandından gelir; karma yaşa varsayım yapılmaz", async () => {
  const f = await makeObservationManagementFixture(), snapshot = await f.store.readSnapshot();
  const model = observationMetadataModel(snapshot, f.observationId, "2026-09-10", f.now);
  assert.ok(model.developmentChoices.length); assert.ok(model.developmentChoices.every(p => p.ageBand === "60-72"));
  snapshot.classrooms[0].ageGroup = "karma yaş";
  assert.equal(observationMetadataModel(snapshot, f.observationId, "2026-09-10", f.now).developmentChoices.length, 0);
});
test("Türkiye gece sınırında düzeltme olay gününü korur", () => {
  assert.equal(shiftedObservedAt({ createdAt: "2026-09-10T00:05:00.000Z", observedAt: "2026-09-09T21:05:00.000Z" }, "2026-09-09", new Date("2026-09-10T09:00:00.000Z")), "2026-09-08T21:05:00.000Z");
});

test("Oyun kategorisi paylaşma gözlemini müziğe dönüştürmez; içerik ipuçları öne çıkar, eşleşme yoksa açık kalır", async () => {
  const f = await makeObservationManagementFixture(), snapshot = await f.store.readSnapshot();
  const observation = snapshot.observations.find(o => o.id === f.observationId);
  observation.rawText = "Kurgu çocuk blok oyununda arkadaşına parça verdi ve sırasını bekledi.";
  observation.observationCategories = ["play-participation"];
  const sharing = observationMetadataModel(snapshot, f.observationId, undefined, f.now);
  assert.equal(sharing.developmentMatchCount, 0);
  assert.ok(sharing.developmentChoices.slice(0, 3).every(p => p.domain !== "Müzik"));
  assert.equal(sharing.developmentChoices.length, 21, "manual catalog remains available without inventing sharing/turn-taking presets");
  observation.rawText = "Ritim çalgısıyla yavaş ve hızlı tempoya göre vuruşlarını değiştirdi.";
  observation.observationCategories = ["language-communication"];
  const rhythm = observationMetadataModel(snapshot, f.observationId, undefined, f.now);
  assert.ok(rhythm.developmentMatchCount > 0);
  assert.ok(rhythm.developmentChoices[0].id.endsWith("rhythm-change"), "actual content outranks broad category");
});

test("0.35 başlık ve destek planı tamamlanmış eski gözlemin gerçek kaynak bağı eksikse iş kuyruğunda kalır", async () => {
  const f = await makeObservationManagementFixture();
  let action = actionCenterModel(await f.store.readSnapshot(), { studentId: f.studentId, observationId: f.observationId, now: f.now }).observations[0];
  await assignObservationCategory(f.store, { ...action.scope, category: "language-communication", now: f.now });
  action = actionCenterModel(await f.store.readSnapshot(), { studentId: f.studentId, observationId: f.observationId, now: f.now }).observations[0];
  await executeObservationSupport(f.store, { action, optionId: "observe-again", now: f.now });
  const before = await f.store.readSnapshot();
  assert.ok(actionCenterModel(before, { now: f.now }).observations.some(o => o.scope.observationId === f.observationId));
  // Read-model regression: completed canonical source rows stop suggesting the same work.
  const observation = before.observations.find(o => o.id === f.observationId);
  observation.civilDate = "2026-09-09"; observation.activityId = f.source.activity.id; observation.planId = f.source.plan.id;
  before.evidenceCurriculumLinks.push({ ...before.evidenceCurriculumLinks[0], id: crypto.randomUUID(), observationId: observation.id });
  assert.equal(actionCenterModel(before, { now: f.now }).observations.some(o => o.scope.observationId === f.observationId), false);
});
