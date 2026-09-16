import assert from "node:assert/strict";
import test from "node:test";
import { createTodayTeachingFocus } from "../../src/features/simple-experience/today-teaching-focus.ts";
import { createSimpleTodayPresentation } from "../../src/features/simple-experience/simple-today-model.ts";

const suggestion = { id: "catalogue-activity", title: "Kurgu etkinlik" };
const planned = { id: "plan-row", activityId: "persisted-activity", planId: "persisted-plan", title: "Öğretmenin etkinliği", status: "planned", kind: "activity", canCaptureEvidence: true };
const focusInput = (extra = {}) => ({ enabled: true, pendingObservationCount: 0, blockedByPlanIntegrity: false, hasRecordedDailyPlan: false, dayNeedsReview: false, currentActivity: null, planItems: [], suggestions: [suggestion], ...extra });
const presentationInput = (extra = {}) => ({
  hasClassroom: true, operationalStatus: "active", educationalWritesDisabled: false,
  studentCount: 2, attendanceMarked: 0, attendanceTotal: 2, dailyPlanReady: false,
  assistantBrief: { actionLabel: "Yoklamayı aç", action: { kind: "attendance" }, title: "Yoklama", rationale: "Henüz güvenilir değil", evidence: [] },
  ...extra,
});

test("öneri yalnız gerçek günlük plan yokken gösterilir ve kayıt kimliği üretmez", () => {
  const result = createTodayTeachingFocus(focusInput());
  assert.deepEqual(result, { kind: "suggestion", activity: suggestion });
  assert.equal("planId" in result, false);
  assert.equal("activityId" in result, false);
});
test("gerçek günlük plan katalog önerisinden önceliklidir; exact kayıt nesnesi korunur", () => {
  const result = createTodayTeachingFocus(focusInput({ planItems: [planned] }));
  assert.equal(result.kind, "recorded");
  assert.equal(result.item, planned);
});
test("güncel uygulama yalnız günlük listede bulunan ve devam eden exact kayıttan gelir", () => {
  const current = { ...planned, id: "live-row", activityId: "live-activity", status: "in_progress" };
  assert.equal(createTodayTeachingFocus(focusInput({ planItems: [planned, current], currentActivity: current })).item, current);
  assert.equal(createTodayTeachingFocus(focusInput({ planItems: [planned], currentActivity: current })).item, planned);
});
test("tamamlanmış, isteğe bağlı ve atlanmış plan yeni öneri gibi yeniden açılmaz", () => {
  for (const item of [{ ...planned, status: "completed" }, { ...planned, flowBlockStatus: "skipped" }, { ...planned, flowBlockStatus: "optional" }]) {
    assert.equal(createTodayTeachingFocus(focusInput({ planItems: [item] })), null);
  }
});
test("hazırlık/kapalı sınıf ve ilgilenilmesi gereken gözlem bağlamı öneriye yenilmez", () => {
  assert.equal(createTodayTeachingFocus(focusInput({ enabled: false })), null);
  assert.equal(createTodayTeachingFocus(focusInput({ pendingObservationCount: 1 })), null);
  const result = createSimpleTodayPresentation(presentationInput({ operationalStatus: "preparation", educationalWritesDisabled: true, teachingFocus: { kind: "suggestion", activity: suggestion } }));
  assert.deepEqual(result.primary.action, { kind: "start-year" });
});
test("katalog açma ve kalıcı etkinlik açma eylemleri farklı kimlik sözleşmeleri taşır", () => {
  const recommended = createSimpleTodayPresentation(presentationInput({ teachingFocus: { kind: "suggestion", activity: suggestion } }));
  const recorded = createSimpleTodayPresentation(presentationInput({ teachingFocus: { kind: "recorded", item: planned } }));
  assert.deepEqual(recommended.primary.action, { kind: "studio", activityId: suggestion.id });
  assert.deepEqual(recorded.primary.action, { kind: "recorded-item", item: planned });
  assert.equal(recorded.primary.label, "Uygula ve gözlemle");
  assert.equal(recommended.followUps.length, 2);
  assert.equal(recommended.followUps[0].action.kind, "attendance");
});
test("akış bloğu gözlem etkinliği gibi sunulmaz; gerçek devam eden etkinlik gözleme açılır", () => {
  const block = createSimpleTodayPresentation(presentationInput({ teachingFocus: { kind: "recorded", item: { ...planned, activityId: undefined, canCaptureEvidence: false, kind: "teacher-flow-block" } } }));
  assert.equal(block.primary.label, "Günlük akışı aç");
  const active = createSimpleTodayPresentation(presentationInput({ teachingFocus: { kind: "recorded", item: { ...planned, status: "in_progress" } } }));
  assert.equal(active.primary.label, "Gözlem ekle");
  assert.deepEqual(active.followUps[0], {
    label: "Etkinliği tamamla",
    detail: "Gözlemler korunur; akış sıradaki adıma geçer",
    action: { kind: "complete-recorded", activityId: planned.activityId },
  });
  assert.equal(active.followUps[1].action.kind, "attendance");
});
test("eksik yoklama açık bir takip işidir, öğretmenin kayıt güvenilirliğine hüküm verilmez", () => {
  const result = createSimpleTodayPresentation(presentationInput());
  assert.deepEqual(result.reasons, ["2 çocuğun devam durumunu işaretleyin."]);
});
test("çakışan/kopuk plan ve inceleme bekleyen gün sonu ana öneri tarafından örtülmez", () => {
  assert.equal(createTodayTeachingFocus(focusInput({ blockedByPlanIntegrity: true, planItems: [planned] })), null);
  assert.equal(createTodayTeachingFocus(focusInput({ dayNeedsReview: true })), null);
});
test("boş kayıtlı günlük plan henüz plan yokmuş gibi yeni öneriye dönüştürülmez", () => {
  assert.equal(createTodayTeachingFocus(focusInput({ hasRecordedDailyPlan: true })), null);
});
