import assert from "node:assert/strict";
import test from "node:test";
import { prepareWorkPackageSelection, workPackageFingerprint, withDefaultRequest } from "../../src/features/work-packages/work-package-model.ts";
function candidate(id, kind = "observation-package") {
  const item = { kind, candidateId: id, choiceId: "choice", sourceFingerprint: "persisted-source", ...(kind === "plan-gap" ? { targetId: "target" } : { category: "language-communication" }) };
  return withDefaultRequest({ id, kind, title: "Kurgu paket", reason: "Hazır", resultLabel: "Tamamla", sourceRecordIds: [], reusedRecordIds: [], sourceFingerprint: "persisted-source", choices: [{ id: "choice", label: "Kurgu seçenek", resultLabel: "Tamamla", requestItem: item }], defaultChoiceId: "choice" }, "2026-09-10");
}
const model = (...candidates) => ({ civilDate: "2026-09-10", candidates, preferences: { preferredCategory: null, preferredSupportOptionId: null, source: "none" } });
test("hazır varsayılan seçim gerçek request ve tam parmak izi taşır", () => {
  const c = candidate("a"); assert.equal(c.request.items[0].choiceId, "choice"); assert.equal(c.expectedFingerprint, workPackageFingerprint(c.request));
});
test("toplu seçim sıra bağımsız ve kaynaktan ayrılmış bir istek üretir", () => {
  const m = model(candidate("a"), candidate("b"));
  const x = prepareWorkPackageSelection(m, { selections: { b: "choice", a: "choice" } });
  const y = prepareWorkPackageSelection(m, { selections: { a: "choice", b: "choice" } });
  assert.deepEqual(x, y); x.request.items[0].category = "other"; assert.equal(m.candidates[0].request.items[0].category, "language-communication");
});
test("boş, bilinmeyen veya eski seçenek yazma isteği oluşturmaz", () => {
  const m = model(candidate("a"));
  for (const selections of [{}, { missing: "choice" }, { a: "old" }]) assert.throws(() => prepareWorkPackageSelection(m, { selections }));
});
test("plan zinciri bir başına seçilir, gözlem topluluğuyla karıştırılmaz", () => {
  const m = model(candidate("a"), candidate("plan", "plan-gap"));
  assert.throws(() => prepareWorkPackageSelection(m, { selections: { a: "choice", plan: "choice" } }));
  assert.equal(prepareWorkPackageSelection(m, { selections: { plan: "choice" } }).request.items.length, 1);
});
test("isteğin herhangi bir içerik değişikliği parmak izini değiştirir", () => {
  const c = candidate("a"), altered = structuredClone(c.request); altered.items[0].category = "other";
  assert.notEqual(workPackageFingerprint(altered), c.expectedFingerprint);
});
