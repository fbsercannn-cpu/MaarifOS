import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_AGE_MAPPING_REVIEW_QUEUE,
  AGE_MONTH_PACKAGE_REVIEW_QUEUE,
  assertTymmHumanReviewQueueCoverage,
} from "../../src/features/pedagogical-os/tymm-human-review-queue.ts";

test("357/357 etkinlik×yaş ve 30/30 yaş×ay kaydı insan inceleme kuyruğunda eksiksizdir", () => {
  assert.doesNotThrow(() => assertTymmHumanReviewQueueCoverage());
  assert.equal(ACTIVITY_AGE_MAPPING_REVIEW_QUEUE.length, 357);
  assert.equal(AGE_MONTH_PACKAGE_REVIEW_QUEUE.length, 30);
  assert.equal(
    new Set(ACTIVITY_AGE_MAPPING_REVIEW_QUEUE.map((item) => item.reviewItemId)).size,
    357,
  );
  assert.equal(
    new Set(AGE_MONTH_PACKAGE_REVIEW_QUEUE.map((item) => item.reviewItemId)).size,
    30,
  );
});
test("insan uzman onayı olmayan adaylar exact eşleme veya resmî MEB etkinliği gibi sunulmaz", () => {
  for (const item of ACTIVITY_AGE_MAPPING_REVIEW_QUEUE) {
    assert.equal(item.contentOrigin, "MaarifOS-original");
    assert.equal(item.officialMebActivity, false);
    assert.equal(item.mapping, null);
    assert.equal(item.reviewStatus, "pending-human-review");
    assert.deepEqual(item.independentPreschoolExpertApprovals, []);
    assert.ok(item.ageAdaptation.length > 0);
    assert.ok(item.differentiation.length > 0);
    assert.ok(item.evidencePrompt.length > 0);
  }
});

test("inceleme kuyruğu çocuk için puan, kişilik veya karakter hükmü alanı tanımlamaz", () => {
  const forbiddenKeys = new Set([
    "score",
    "personality",
    "character",
    "valueScore",
    "childRank",
    "judgment",
  ]);
  for (const item of ACTIVITY_AGE_MAPPING_REVIEW_QUEUE) {
    assert.equal(
      Object.keys(item).some((key) => forbiddenKeys.has(key)),
      false,
    );
  }
});

test("inceleme kuyrukları çalışma zamanında değiştirilemez", () => {
  assert.equal(Object.isFrozen(ACTIVITY_AGE_MAPPING_REVIEW_QUEUE), true);
  assert.equal(Object.isFrozen(ACTIVITY_AGE_MAPPING_REVIEW_QUEUE[0]), true);
  assert.equal(Object.isFrozen(AGE_MONTH_PACKAGE_REVIEW_QUEUE), true);
  assert.equal(Object.isFrozen(AGE_MONTH_PACKAGE_REVIEW_QUEUE[0]), true);
});
