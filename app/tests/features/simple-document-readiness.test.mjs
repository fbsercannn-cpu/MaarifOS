import assert from "node:assert/strict";
import test from "node:test";

import {
  emptyTeacherWorkCycle,
  resolveSimpleDailyDocumentReadiness,
} from "../../src/features/teacher-cycle/teacher-work-cycle.ts";

function period(id, title) {
  return {
    id,
    title,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    relation: "current",
  };
}

test("tek başına günlük planı dışa aktarılabilir plan zinciri saymaz", () => {
  const workspace = emptyTeacherWorkCycle("2026-09-08");
  workspace.status = "ready";
  workspace.daily = {
    ...workspace.daily,
    status: "ready",
    planId: "daily-1",
  };

  const readiness = resolveSimpleDailyDocumentReadiness(workspace);
  assert.equal(readiness.ready, false);
  assert.match(readiness.requirement ?? "", /yıllık plan omurgasını/u);
});

test("yıl-ay-hafta-gün zinciri tamamlandığında günlük çıktı hazırdır", () => {
  const workspace = emptyTeacherWorkCycle("2026-09-08");
  workspace.status = "ready";
  workspace.annual = period("annual-1", "Yıllık");
  workspace.monthly = {
    ...period("month-1", "Eylül"),
    weeklyPlanCount: 1,
    dailyPlanCount: 1,
    observationCount: 0,
    linkedObservationCount: 0,
    evaluationCount: 0,
  };
  workspace.weekly = {
    ...period("week-1", "Hafta"),
    dailyPlanCount: 1,
    observationCount: 0,
    linkedObservationCount: 0,
    evaluationCount: 0,
  };
  workspace.daily = {
    ...workspace.daily,
    status: "ready",
    planId: "daily-1",
  };

  assert.deepEqual(resolveSimpleDailyDocumentReadiness(workspace), {
    ready: true,
    requirement: null,
  });
});

test("zincir uyuşmazlığında plan kimliği bulunsa da hazır demez", () => {
  const workspace = emptyTeacherWorkCycle("2026-09-08");
  workspace.status = "ready";
  workspace.annual = period("annual-1", "Yıllık");
  workspace.monthly = {
    ...period("month-1", "Eylül"),
    weeklyPlanCount: 1,
    dailyPlanCount: 1,
    observationCount: 0,
    linkedObservationCount: 0,
    evaluationCount: 0,
  };
  workspace.weekly = {
    ...period("week-1", "Hafta"),
    dailyPlanCount: 0,
    observationCount: 0,
    linkedObservationCount: 0,
    evaluationCount: 0,
  };
  workspace.daily = {
    ...workspace.daily,
    status: "chain-mismatch",
    planId: "daily-1",
  };

  const readiness = resolveSimpleDailyDocumentReadiness(workspace);
  assert.equal(readiness.ready, false);
  assert.match(readiness.requirement ?? "", /haftalık plan bağını/u);
});
