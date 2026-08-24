import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPedagogicalPlanProvenance,
  isPedagogicalPlanProvenance,
} from "../../src/core/domain/pedagogical-plan-provenance.ts";
import { ACTIVITY_STUDIO_ITEMS } from "../../src/features/activity-studio/activity-studio-model.ts";
import { createPedagogicalPlanBridge } from "../../src/features/pedagogical-os/pedagogical-plan-bridge.ts";

test("etkinlik önerisi yaş, koşul, katılım, uyarlama ve değer izini tek değişmez kaynakta toplar", () => {
  const activity = ACTIVITY_STUDIO_ITEMS.find((item) =>
    item.ageBands.includes("48-60"),
  );
  assert.ok(activity);
  const provenance = createPedagogicalPlanBridge({
    activity,
    civilDate: "2026-09-07",
    ageBand: "48-60",
    scenarioId: "indoor-rain",
    participationRouteId: "visual",
    now: new Date("2026-09-07T06:15:00.000Z"),
  });

  assert.equal(provenance.sourceActivityId, activity.id);
  assert.equal(provenance.officialMebActivity, false);
  assert.equal(provenance.scenarioId, "indoor-rain");
  assert.equal(provenance.participationRouteId, "visual");
  assert.match(provenance.adaptation.materialSwap, /pencere gözlemi/u);
  assert.match(provenance.adaptation.facilitation, /görünür seçenek/u);
  assert.equal(provenance.valueTrace.evidence, activity.observationPrompt);
  assert.ok(isPedagogicalPlanProvenance(provenance));
  assert.ok(Object.isFrozen(provenance));
});

test("pedagojik plan kaynağındaki tarih, kimlik veya ek alan tahrifi kapalı kalır", () => {
  const activity = ACTIVITY_STUDIO_ITEMS[0];
  const provenance = createPedagogicalPlanBridge({
    activity,
    civilDate: "2026-09-08",
    ageBand: activity.ageBands[0],
    scenarioId: "balanced",
    participationRouteId: "multiple",
    now: new Date("2026-09-08T06:15:00.000Z"),
  });
  const tampered = structuredClone(provenance);
  tampered.sourceActivityId = "../başka-kaynak";
  assert.equal(isPedagogicalPlanProvenance(tampered), false);
  assert.throws(
    () => assertPedagogicalPlanProvenance({ ...provenance, injected: true }),
    /geçersiz veya değiştirilmiş/u,
  );
});
