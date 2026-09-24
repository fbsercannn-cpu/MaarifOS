import assert from "node:assert/strict";
import test from "node:test";

import {
  PRESCHOOL_ACTIVITY_AREAS,
  PRESCHOOL_ACTIVITY_SUGGESTIONS,
} from "../../src/features/planning/activity-suggestions.ts";

test("etkinlik önerileri okul öncesi alanlarını dengeli ve tekil kapsar", () => {
  const ids = new Set(PRESCHOOL_ACTIVITY_SUGGESTIONS.map((item) => item.id));
  assert.equal(ids.size, PRESCHOOL_ACTIVITY_SUGGESTIONS.length);
  assert.ok(PRESCHOOL_ACTIVITY_SUGGESTIONS.length >= 24);

  for (const area of PRESCHOOL_ACTIVITY_AREAS.filter((item) => item.id !== "all")) {
    assert.ok(
      PRESCHOOL_ACTIVITY_SUGGESTIONS.filter((item) => item.area === area.id).length >= 3,
      `${area.label} alanında en az üç öneri bulunmalı`,
    );
  }
});

test("öneriler resmî hedef gibi davranmaz; öğretmene açık uygulama başlangıcı verir", () => {
  for (const suggestion of PRESCHOOL_ACTIVITY_SUGGESTIONS) {
    assert.ok(suggestion.title.length >= 5);
    assert.ok(suggestion.teacherPrompt.length >= 20);
    assert.equal("referenceCode" in suggestion, false);
    assert.equal("assessmentLevel" in suggestion, false);
  }
});

