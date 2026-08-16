import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createPlanWorkbenchPresentation } from "../../src/features/planning/plan-workbench-model.ts";
import { emptyTeacherWorkCycle } from "../../src/features/teacher-cycle/teacher-work-cycle.ts";

test("plan çalışma alanı yapılandırılmamış sınıfta dört düzeyi uydurmadan gösterir", () => {
  const presentation = createPlanWorkbenchPresentation(
    emptyTeacherWorkCycle("2026-08-11"),
    { educationalWritesDisabled: true },
  );

  assert.equal(presentation.configured, false);
  assert.equal(presentation.linkedLevelCount, 0);
  assert.deepEqual(
    presentation.levels.map(({ id, tone }) => [id, tone]),
    [
      ["annual", "attention"],
      ["monthly", "attention"],
      ["weekly", "attention"],
      ["daily", "waiting"],
    ],
  );
  assert.equal(presentation.priority.levelId, "annual");
  assert.equal(presentation.priority.actionLabel, "Yıllık planları aç");
  assert.equal(presentation.priority.eyebrow, "Sıradaki planlama işi");
});

test("plan çalışma alanı canlı yıl-ay-hafta-gün kayıtlarını ve önceliği ayırır", () => {
  const presentation = createPlanWorkbenchPresentation({
    status: "ready",
    civilDate: "2026-09-08",
    annual: {
      id: "annual-1",
      title: "2026–2027 Yıllık Plan",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
      relation: "current",
    },
    monthly: {
      id: "month-1",
      title: "Eylül Aylık Planı",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-30",
      relation: "current",
      weeklyPlanCount: 4,
      dailyPlanCount: 1,
      observationCount: 2,
      linkedObservationCount: 1,
      evaluationCount: 0,
    },
    weekly: {
      id: "week-1",
      title: "Uyum Haftası",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-11",
      relation: "current",
      dailyPlanCount: 1,
      observationCount: 2,
      linkedObservationCount: 1,
      evaluationCount: 0,
    },
    daily: {
      status: "ready",
      planId: "day-1",
      conflictingPlanIds: [],
      title: "8 Eylül Günlük Planı",
      activityCount: 2,
      completedActivityCount: 1,
      observationCount: 1,
    },
    documents: {
      anecdoteIncompleteCount: 0,
      anecdoteReviewRequiredCount: 0,
      anecdoteReadyCount: 0,
      monthlyEvaluationCount: 0,
      planDocumentReady: true,
    },
    pendingCurriculumLinkCount: 1,
  });

  assert.equal(presentation.configured, true);
  assert.equal(presentation.linkedLevelCount, 4);
  assert.equal(presentation.levels.find(({ id }) => id === "annual")?.tone, "current");
  assert.equal(presentation.levels.find(({ id }) => id === "daily")?.tone, "current");
  assert.equal(presentation.priority.levelId, "weekly");
  assert.match(
    presentation.levels.find(({ id }) => id === "weekly")?.detail ?? "",
    /1\/2 bağlı gözlem/,
  );
});

test("plan çalışma alanı mükerrer günlük planı tamamlanmış veya yeni plan gibi sunmaz", () => {
  const workspace = emptyTeacherWorkCycle("2026-09-08");
  workspace.status = "ready";
  workspace.daily = {
    status: "conflict",
    planId: null,
    conflictingPlanIds: ["day-a", "day-b"],
    title: "Günlük plan çakışması",
    activityCount: 0,
    completedActivityCount: 0,
    observationCount: 0,
  };

  const presentation = createPlanWorkbenchPresentation(workspace);
  const daily = presentation.levels.find(({ id }) => id === "daily");

  assert.equal(daily?.tone, "attention");
  assert.equal(daily?.title, "Günlük plan çakışması");
  assert.equal(daily?.actionLabel, "Çakışmayı incele");
  assert.match(daily?.detail ?? "", /2 plan aynı sınıf ve tarihe bağlı/);
  assert.match(daily?.meta ?? "", /İnceleme gerekli/);
  assert.equal(presentation.linkedLevelCount, 0);
});

test("Planlar alt navigasyonu kalıcı route açar; gün planı ayrıntısı ayrı yüzeydir", async () => {
  const [prototypeSource, screenSource, cssSource] = await Promise.all([
    readFile(new URL("../../src/Prototype.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../../src/features/planning/PlanWorkspaceScreen.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../src/features/planning/plan-workspace.css", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(prototypeSource, /navigate\("plans"\)/);
  assert.match(prototypeSource, /route\.id === "plans"/);
  assert.match(prototypeSource, /title=\{displayedPlanIsToday \? "Gün planı"/);
  assert.match(screenSource, /Yıl → Ay → Hafta → Gün/);
  assert.match(screenSource, /data-route-heading/);
  assert.match(screenSource, /onOpenDocuments/);
  assert.match(cssSource, /padding: 14px 14px 120px/);
});
