import assert from "node:assert/strict";
import test from "node:test";
import { makePreparedTeacherFixture } from "../fixtures/prepared-teacher-actions-fixture.mjs";
import { loadPreparedTeacherActions, preparedTeacherActionsModel } from "../../src/features/teacher-followup/prepared-teacher-actions.ts";
import { isTeacherFollowupRecord, assertTeacherFollowupRelationships } from "../../src/core/domain/teacher-followup.ts";
import { appendTeacherFollowup } from "../../src/features/teacher-followup/teacher-followup-service.ts";

test("Hazır odak gerçek yoklama/etkinlik kapsamını kullanır; düşük gözlem sayısı önce gelir", async () => {
  const f = await makePreparedTeacherFixture(), m = await loadPreparedTeacherActions(f.store, { now: f.now, mode: "focus" });
  assert.equal(m.cards.length, 1); assert.equal(m.cards[0].students[0].id, f.otherStudentId); assert.equal(m.cards[0].students[0].count, 0);
  const data = await f.store.readSnapshot(); data.attendanceRecords = data.attendanceRecords.map(r => ({ ...r, status: "absent" }));
  assert.equal(preparedTeacherActionsModel(data, { now: f.now, mode: "focus" }).cards.length, 0);
});
test("Destek seçenekleri gerçek kaynak ve gelecek haftayı gösterir; kişi kapsamı dışarı taşmaz", async () => {
  const f = await makePreparedTeacherFixture(), m = await loadPreparedTeacherActions(f.store, { now: f.now, mode: "support" });
  assert.deepEqual(m.cards[0].options.map(o => o.id), ["carry", "observe", "close"]);
  assert.match(m.cards[0].options[0].detail, /2026-09-28–2026-09-30/u); assert.equal(m.cards[0].evidence[0].id, f.observationId);
  assert.equal((await loadPreparedTeacherActions(f.store, { now: f.now, mode: "support", studentId: f.otherStudentId })).cards.length, 0);
});
test("Veli seçenekleri mevcut kişileri ve gerçekten kayıtlı uygun saatleri kullanır", async () => {
  const f = await makePreparedTeacherFixture(), m = await loadPreparedTeacherActions(f.store, { now: f.now, mode: "family" });
  assert.equal(m.cards[0].options.length, 3); assert.match(m.cards[0].options[0].label, /2026-09-22 · 14:00–14:20 · Kurgu Veli/u);
  const data = await f.store.readSnapshot(); data.settings = data.settings.filter(r => r.id !== f.availability.id);
  assert.equal(preparedTeacherActionsModel(data, { now: f.now, mode: "family" }).cards.length, 0);
});
test("Yeni kanonik odak kaydı bilinmeyen alan veya kopuk etkinlik bağını kabul etmez", async () => {
  const f = await makePreparedTeacherFixture(), data = await f.store.readSnapshot();
  const row = { ...f.decision, id: crypto.randomUUID(), createdAt: f.now.toISOString(), updatedAt: f.now.toISOString(), civilDate: "2026-09-21", workflow: { kind: "observation-focus", planId: f.activity.plan.id, activityId: f.activity.activity.id } };
  assert.equal(isTeacherFollowupRecord(row), true); assert.equal(isTeacherFollowupRecord({ ...row, workflow: { ...row.workflow, inventedOutcome: "success" } }), false);
  data.settings.push(row); assert.doesNotThrow(() => assertTeacherFollowupRelationships(data));
  row.workflow.activityId = crypto.randomUUID(); assert.throws(() => assertTeacherFollowupRelationships(data));
});
test("Yeni kaynak ilişkileri genel form kaydıyla atomik seçim servisini atlayamaz", async () => {
  const f = await makePreparedTeacherFixture();
  for (const workflow of [{ kind: "observation-focus", planId: f.activity.plan.id, activityId: f.activity.activity.id }, { kind: "family-preparation-link", sourceId: f.decision.id, appointmentId: crypto.randomUUID() }, { kind: "learning-continuation", sourceId: f.decision.id, nextDecisionId: crypto.randomUUID(), reflectionId: crypto.randomUUID() }]) await assert.rejects(appendTeacherFollowup(f.store, { studentId: f.studentId, now: f.now, workflow }), /hazır adım/u);
});
