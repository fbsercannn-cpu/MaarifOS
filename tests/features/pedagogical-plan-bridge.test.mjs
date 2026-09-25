import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPedagogicalPlanProvenance,
  bindPedagogicalPlanProvenanceToCivilDate,
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

test("etkinlik bağlamı kaydetmeden önce öğretmenin seçtiği plan gününe güvenle bağlanır", () => {
  const activity = ACTIVITY_STUDIO_ITEMS[0];
  const provenance = createPedagogicalPlanBridge({
    activity,
    civilDate: "2026-09-08",
    ageBand: activity.ageBands[0],
    scenarioId: "balanced",
    participationRouteId: "multiple",
    now: new Date("2026-09-08T06:15:00.000Z"),
  });

  const bound = bindPedagogicalPlanProvenanceToCivilDate(
    provenance,
    "2026-09-11",
  );

  assert.equal(provenance.civilDate, "2026-09-08");
  assert.equal(bound.civilDate, "2026-09-11");
  assert.equal(bound.sourceActivityId, provenance.sourceActivityId);
  assert.equal(bound.capturedAt, provenance.capturedAt);
  assert.deepEqual(bound.adaptation, provenance.adaptation);
  assert.deepEqual(bound.valueTrace, provenance.valueTrace);
  assert.ok(isPedagogicalPlanProvenance(bound));
  assert.ok(Object.isFrozen(bound));
  assert.throws(
    () => bindPedagogicalPlanProvenanceToCivilDate(provenance, "2026-13-40"),
    /geçersiz veya değiştirilmiş/u,
  );
});
