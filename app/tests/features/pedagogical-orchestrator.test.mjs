import assert from "node:assert/strict";
import test from "node:test";

import { ACTIVITY_STUDIO_ITEMS } from "../../src/features/activity-studio/activity-studio-model.ts";
import {
  PARTICIPATION_ROUTES,
  PEDAGOGICAL_SCENARIOS,
  PEDAGOGICAL_VARIANT_COUNT,
  createActivityContextAdaptation,
  createObservationCoverage,
  createPedagogicalCoverageMatrix,
  createPedagogicalDayFlow,
  createPedagogicalLoop,
  createPedagogicalSignals,
  pedagogicalVariantCountForAge,
  resolveActivityAgeBand,
} from "../../src/features/pedagogical-os/pedagogical-orchestrator.ts";

function teacherCycle(overrides = {}) {
  return {
    status: "ready",
    civilDate: "2026-08-22",
    annual: null,
    monthly: null,
    weekly: null,
    daily: {
      status: "missing",
      planId: null,
      conflictingPlanIds: [],
      title: "Bugün için plan yok",
      activityCount: 0,
      completedActivityCount: 0,
      observationCount: 0,
    },
    documents: {
      anecdoteIncompleteCount: 0,
      anecdoteReviewRequiredCount: 0,
      anecdoteReadyCount: 0,
      monthlyEvaluationCount: 0,
      planDocumentReady: false,
    },
    pendingCurriculumLinkCount: 0,
    ...overrides,
  };
}

test("pedagojik orkestra statik kart sayısını dürüst bağlamsal uygulama uzayına dönüştürür", () => {
  const supportedAgePairs = ACTIVITY_STUDIO_ITEMS.reduce(
    (total, item) => total + item.ageBands.length,
    0,
  );
  assert.equal(PEDAGOGICAL_SCENARIOS.length, 7);
  assert.equal(PARTICIPATION_ROUTES.length, 4);
  assert.equal(
    PEDAGOGICAL_VARIANT_COUNT,
    supportedAgePairs * PEDAGOGICAL_SCENARIOS.length * PARTICIPATION_ROUTES.length,
  );
  assert.ok(PEDAGOGICAL_VARIANT_COUNT >= 9_900);
  assert.ok(pedagogicalVariantCountForAge("60-72") >= 3_300);
});

test("her sınıf koşulu yaş ve katılım yoluyla tam bir öğretmen uyarlaması üretir", () => {
  const activity = ACTIVITY_STUDIO_ITEMS.find((item) => item.ageBands.includes("60-72"));
  assert.ok(activity);
  for (const scenario of PEDAGOGICAL_SCENARIOS) {
    for (const route of PARTICIPATION_ROUTES) {
      const adaptation = createActivityContextAdaptation({
        activity,
        ageBand: "60-72",
        scenarioId: scenario.id,
        participationRouteId: route.id,
      });
      assert.equal(adaptation.scenario.id, scenario.id);
      assert.equal(adaptation.participationRoute.id, route.id);
      for (const value of [
        adaptation.setup,
        adaptation.materialSwap,
        adaptation.facilitation,
        adaptation.evidencePrompt,
        adaptation.familyBridge,
        adaptation.safetyCheck,
      ]) assert.ok(value.length >= 45);
    }
  }
});

test("tam gün akışı yedi bölüm, dört gerçek etkinlik ve değer→kanıt→sonraki plan izi taşır", () => {
  const flow = createPedagogicalDayFlow({
    ageBand: "48-60",
    civilDate: "2026-08-22",
    scenarioId: "indoor-rain",
  });
  assert.equal(flow.phases.length, 7);
  assert.equal(flow.activityIds.length, 4);
  assert.equal(new Set(flow.activityIds).size, 4);
  assert.ok(flow.learningDomains.length >= 2);
  assert.ok(flow.totalMinutes >= 90);
  for (const [index, phase] of flow.phases.entries()) {
    assert.equal(phase.sequence, index + 1);
    assert.ok(phase.teacherMove.length >= 35);
    assert.ok(phase.observationTarget.length >= 35);
    assert.ok(phase.valueTrace.value.length > 0);
    assert.match(phase.valueTrace.nextPlan, /sonraki plan/iu);
    assert.doesNotMatch(
      `${phase.observationTarget} ${phase.valueTrace.evidence}`,
      /puan|not ver|başarısız|kişilik/iu,
    );
  }
});

test("aynı gün farklı sınıf koşulunda farklı ve açıklanabilir akış üretir", () => {
  const calm = createPedagogicalDayFlow({
    ageBand: "60-72",
    civilDate: "2026-08-22",
    scenarioId: "sensory-calm",
  });
  const active = createPedagogicalDayFlow({
    ageBand: "60-72",
    civilDate: "2026-08-22",
    scenarioId: "high-energy",
  });
  assert.notDeepEqual(calm.activityIds, active.activityIds);
  assert.match(calm.phases[1].teacherMove, /işlem süresi|sürpriz/iu);
  assert.match(active.phases[1].teacherMove, /büyük hareket|sakinleşme/iu);
});

test("tam tarih tohumu aynı gün numarasını farklı aylarda aynı akışa kilitlemez", () => {
  const september = createPedagogicalDayFlow({
    ageBand: "60-72",
    civilDate: "2026-09-05",
    scenarioId: "balanced",
  });
  const october = createPedagogicalDayFlow({
    ageBand: "60-72",
    civilDate: "2026-10-05",
    scenarioId: "balanced",
  });
  assert.notDeepEqual(september.activityIds, october.activityIds);
});

test("gözlem dengesi çocuğu puanlamadan kanıt açığını ve sıradaki görünür çocukları belirler", () => {
  const coverage = createObservationCoverage([
    { id: "b", name: "Bora", observationCount: 3 },
    { id: "a", name: "Ada", observationCount: 0 },
    { id: "c", name: "Cem", observationCount: 1 },
  ]);
  assert.equal(coverage.coveragePercent, 67);
  assert.equal(coverage.unobservedStudentCount, 1);
  assert.equal(coverage.priorityStudents[0].id, "a");
  assert.match(coverage.distributionLabel, /kanıt açığı/u);
  assert.doesNotMatch(coverage.distributionLabel, /geri|başarısız|yetersiz/iu);
});

test("canlı sinyaller yoklama, plan, uygulama ve gözlemi uydurmadan ayırır", () => {
  const coverage = createObservationCoverage([
    { id: "a", name: "Ada", observationCount: 0 },
  ]);
  const signals = createPedagogicalSignals({
    attendance: { present: 0, late: 0, absent: 0, marked: 0, total: 1 },
    teacherCycle: teacherCycle(),
    observationCoverage: coverage,
  });
  assert.deepEqual(signals.map((item) => item.id), [
    "attendance",
    "plan",
    "application",
    "observation",
  ]);
  assert.equal(signals.find((item) => item.id === "plan").value, "Eksik");
  assert.equal(signals.find((item) => item.id === "observation").value, "%0");
});

test("öğrenme döngüsü ilk eksik aşamayı tek geçerli sıradaki iş yapar", () => {
  const workspace = teacherCycle({
    daily: {
      status: "ready",
      planId: "plan-1",
      conflictingPlanIds: [],
      title: "Günlük plan",
      activityCount: 2,
      completedActivityCount: 1,
      observationCount: 0,
    },
  });
  const loop = createPedagogicalLoop(workspace);
  assert.equal(loop.length, 7);
  assert.equal(loop[0].state, "done");
  assert.equal(loop[1].state, "current");
  assert.equal(loop.filter((stage) => stage.state === "current").length, 1);
});

test("öğrenme döngüsü gözlem veya genel plan belgesini uyarlama ve aile kanıtı saymaz", () => {
  const workspace = teacherCycle({
    daily: {
      status: "ready",
      planId: "plan-1",
      conflictingPlanIds: [],
      title: "Günlük plan",
      activityCount: 1,
      completedActivityCount: 1,
      observationCount: 1,
    },
    monthly: {
      id: "month-1",
      title: "Ağustos",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      relation: "current",
      weeklyPlanCount: 1,
      dailyPlanCount: 1,
      observationCount: 1,
      linkedObservationCount: 1,
      evaluationCount: 1,
    },
    documents: {
      anecdoteIncompleteCount: 0,
      anecdoteReviewRequiredCount: 0,
      anecdoteReadyCount: 0,
      monthlyEvaluationCount: 1,
      planDocumentReady: true,
    },
  });
  const loop = createPedagogicalLoop(workspace);
  assert.equal(loop.find((stage) => stage.id === "reflect").state, "done");
  assert.equal(loop.find((stage) => stage.id === "adapt").state, "current");
  assert.equal(loop.find((stage) => stage.id === "family").state, "waiting");
  assert.equal(loop.find((stage) => stage.id === "next-plan").state, "waiting");
});

test("yaş çözümleme ve kapsam radarı üç resmî bandı tahminsiz korur", () => {
  assert.equal(resolveActivityAgeBand("36–48 ay"), "36-48");
  assert.equal(resolveActivityAgeBand("48 - 60 AY"), "48-60");
  assert.equal(resolveActivityAgeBand("60-72"), "60-72");
  assert.equal(resolveActivityAgeBand(undefined), null);
  assert.equal(resolveActivityAgeBand(""), null);
  assert.equal(resolveActivityAgeBand("5 yaş"), null);
  assert.equal(resolveActivityAgeBand("136-148 ay"), null);
  for (const ageBand of ["36-48", "48-60", "60-72"]) {
    const matrix = createPedagogicalCoverageMatrix(ageBand);
    assert.ok(matrix.length >= 7);
    assert.ok(matrix.every((item) => item.activityCount > 0));
    assert.ok(matrix.every((item) => item.percentage > 0 && item.percentage <= 100));
  }
});
