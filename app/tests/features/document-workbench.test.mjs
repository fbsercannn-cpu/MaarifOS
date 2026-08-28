import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createDocumentWorkspacePresentation } from "../../src/features/documents/document-workspace-model.ts";
import { emptyTeacherWorkCycle } from "../../src/features/teacher-cycle/teacher-work-cycle.ts";

test("belge çalışma alanı eksik kaynakları hazırmış gibi göstermez", () => {
  const presentation = createDocumentWorkspacePresentation(
    emptyTeacherWorkCycle("2026-08-11"),
    { studentCount: 0, observationCount: 0 },
  );

  assert.equal(presentation.readyCount, 0);
  assert.equal(presentation.pendingCount, 2);
  assert.equal(presentation.emptyCount, 2);
  assert.deepEqual(
    presentation.items.map(({ id, tone }) => [id, tone]),
    [
      ["plans", "attention"],
      ["monthly", "attention"],
      ["anecdotes", "empty"],
      ["students", "empty"],
    ],
  );
});

test("belge çalışma alanı plan, aylık, anekdot ve öğrenci kaynaklarını ayrı sayar", () => {
  const workspace = emptyTeacherWorkCycle("2026-09-30");
  workspace.status = "ready";
  workspace.annual = {
    id: "annual-1",
    title: "Yıllık plan",
    periodStart: "2026-09-07",
    periodEnd: "2027-06-25",
    relation: "current",
  };
  workspace.monthly = {
    id: "month-1",
    title: "Eylül",
    periodStart: "2026-09-07",
    periodEnd: "2026-09-30",
    relation: "current",
    weeklyPlanCount: 4,
    dailyPlanCount: 12,
    observationCount: 18,
    linkedObservationCount: 16,
    evaluationCount: 1,
  };
  workspace.documents = {
    anecdoteIncompleteCount: 0,
    anecdoteReviewRequiredCount: 1,
    anecdoteReadyCount: 2,
    monthlyEvaluationCount: 1,
    planDocumentReady: true,
    planMonthCount: 10,
    planWeekCount: 44,
    planDailyCount: 12,
  };

  const presentation = createDocumentWorkspacePresentation(workspace, {
    studentCount: 15,
    observationCount: 18,
  });

  assert.equal(presentation.readyCount, 3);
  assert.equal(presentation.pendingCount, 1);
  assert.equal(presentation.emptyCount, 0);
  assert.match(
    presentation.items.find(({ id }) => id === "plans")?.detail ?? "",
    /10 ay · 44 hafta · 12 günlük plan/,
  );
  assert.equal(
    presentation.items.find(({ id }) => id === "anecdotes")?.tone,
    "attention",
  );
});

test("Çıktılar navigasyonu kalıcı route açar ve tek dokunuş handler'larını bağlar", async () => {
  const [prototypeSource, screenSource] = await Promise.all([
    readFile(new URL("../../src/Prototype.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../../src/features/simple-experience/SimpleDocumentWorkspaceScreen.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(prototypeSource, /navigate\("documents"\)/);
  assert.match(prototypeSource, /route\.id === "documents"/);
  assert.match(prototypeSource, /openDocumentWorkspaceItem/);
  assert.match(screenSource, /HIZLA HAZIRLA/);
  assert.match(screenSource, /Sınıf listesi/);
  assert.match(screenSource, /onDownloadClassRoster/);
  assert.match(screenSource, /onDownloadPlan/);
  assert.match(screenSource, /state === "needs-setup"/);
  assert.match(screenSource, /onOpenSetup\(\)/);
  assert.match(prototypeSource, /onOpenSetup=\{\(\) =>/);
  assert.match(screenSource, /await onPrepareOutput\(id\);/u);
  assert.match(
    screenSource,
    /id !== "roster" && state !== "ready"/u,
  );
  assert.match(screenSource, /else await onDownloadPlan\(id\);/u);
  assert.match(prototypeSource, /onPrepareOutput=\{\(id\) =>/u);
  assert.match(
    screenSource,
    /Hassas veri onayından sonra sınıf listesi paylaşım ekranına gönderildi\./u,
  );
});
