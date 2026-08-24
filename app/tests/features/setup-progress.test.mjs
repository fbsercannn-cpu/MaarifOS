import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createSetupProgressEvidence,
  createSetupProgressPresentation,
} from "../../src/features/onboarding/setup-progress-model.ts";
import { emptyTeacherWorkCycle } from "../../src/features/teacher-cycle/teacher-work-cycle.ts";

const emptyEvidence = createSetupProgressEvidence(
  emptyTeacherWorkCycle("2026-09-08"),
  null,
);

function planWorkspace(level = 4) {
  return {
    ...emptyTeacherWorkCycle("2026-09-08"),
    status: "ready",
    annual:
      level >= 1
        ? {
            id: "annual-1",
            title: "Yıllık plan",
            periodStart: "2026-09-01",
            periodEnd: "2027-06-30",
            relation: "current",
          }
        : null,
    monthly:
      level >= 2
        ? {
            id: "monthly-1",
            title: "Aylık plan",
            periodStart: "2026-09-01",
            periodEnd: "2026-09-30",
            relation: "current",
            weeklyPlanCount: level >= 3 ? 1 : 0,
            dailyPlanCount: level >= 4 ? 1 : 0,
            observationCount: 0,
            linkedObservationCount: 0,
            evaluationCount: 0,
          }
        : null,
    weekly:
      level >= 3
        ? {
            id: "weekly-1",
            title: "Haftalık plan",
            periodStart: "2026-09-07",
            periodEnd: "2026-09-11",
            relation: "current",
            dailyPlanCount: level >= 4 ? 1 : 0,
            observationCount: 0,
            linkedObservationCount: 0,
            evaluationCount: 0,
          }
        : null,
    daily: {
      planId: level >= 4 ? "daily-1" : null,
      title: level >= 4 ? "Günlük plan" : "Bugün için plan yok",
      activityCount: 0,
      completedActivityCount: 0,
      observationCount: 0,
    },
    documents: {
      anecdoteIncompleteCount: 0,
      anecdoteReviewRequiredCount: 0,
      anecdoteReadyCount: 0,
      monthlyEvaluationCount: 0,
      planDocumentReady: level >= 2,
    },
  };
}

const backupReceiptWithoutDrill = {
  schemaVersion: 2,
  fileName: "maarifos-2026-09-08.maarifos",
  encryptedChecksum: "a".repeat(64),
  encryptedByteLength: 2048,
  payloadChecksum: "b".repeat(64),
  dataSchemaVersion: 1,
  appVersion: "0.10.0",
  createdAt: "2026-09-08T10:00:00.000Z",
  verifiedAt: "2026-09-08T10:00:01.000Z",
  lastRestoreDrillAt: null,
  lastRestoreMode: null,
};

const drillVerifiedReceipt = {
  ...backupReceiptWithoutDrill,
  lastRestoreDrillAt: "2026-09-08T10:05:00.000Z",
  lastRestoreMode: "merge",
};

test("temiz cihazda yalnız eğitim yılı ve sınıf adımı açıktır", () => {
  const presentation = createSetupProgressPresentation(
    {
      classroomConfigured: false,
      planningAcademicYearReady: false,
      activeStudentCount: 0,
      planReady: false,
      backupReady: false,
    },
    emptyEvidence,
  );

  assert.equal(presentation.completedCount, 0);
  assert.equal(presentation.remainingCount, 4);
  assert.equal(presentation.currentStepId, "classroom");
  assert.equal(presentation.currentStep?.actionLabel, "Sınıfı kur");
  assert.deepEqual(
    presentation.steps.map((step) => [step.id, step.status]),
    [
      ["classroom", "current"],
      ["students", "locked"],
      ["plan", "locked"],
      ["backup", "locked"],
    ],
  );
  assert.match(presentation.steps[1].detail, /önce eğitim yılı ve sınıf/i);
});

test("kurulum ilerlemesi gerçek kayıtlarla sırayla açılır ve eksik yedeği hazır saymaz", () => {
  const presentation = createSetupProgressPresentation(
    {
      classroomConfigured: true,
      planningAcademicYearReady: true,
      activeStudentCount: 3,
      planReady: false,
      backupReady: true,
    },
    createSetupProgressEvidence(planWorkspace(4), null),
  );

  assert.equal(presentation.completedCount, 3);
  assert.equal(presentation.remainingCount, 1);
  assert.equal(presentation.percent, 75);
  assert.equal(presentation.currentStepId, "backup");
  assert.equal(presentation.currentStep?.id, "backup");
  assert.equal(presentation.steps[3].status, "current");
  assert.match(presentation.steps[3].title, /şifreli yedeği/i);
});

test("dört kanıt tamamlanınca hazırlık merkezi kapanabilecek tamamlanmış durum üretir", () => {
  const presentation = createSetupProgressPresentation(
    {
      classroomConfigured: true,
      planningAcademicYearReady: true,
      activeStudentCount: 1,
      planReady: false,
      backupReady: false,
    },
    createSetupProgressEvidence(planWorkspace(4), drillVerifiedReceipt),
  );

  assert.equal(presentation.isComplete, true);
  assert.equal(presentation.completedCount, 4);
  assert.equal(presentation.remainingCount, 0);
  assert.equal(presentation.currentStepId, null);
  assert.equal(presentation.currentStep, null);
  assert.match(presentation.headline, /kullanıma hazır/i);
});

test("önceki dönemdeki sınıf yeni plan zincirini tamamlanmış saymaz", () => {
  const presentation = createSetupProgressPresentation(
    {
      classroomConfigured: true,
      planningAcademicYearReady: false,
      activeStudentCount: 3,
      planReady: true,
      backupReady: true,
    },
    createSetupProgressEvidence(planWorkspace(4), drillVerifiedReceipt),
  );

  assert.equal(presentation.completedCount, 0);
  assert.equal(presentation.currentStepId, "classroom");
  assert.equal(presentation.steps[0].actionLabel, "Yeni dönemi hazırla");
  assert.match(presentation.steps[0].detail, /güvenli geçiş/i);
  assert.deepEqual(
    presentation.steps.map((step) => step.status),
    ["current", "locked", "locked", "locked"],
  );
});

test("tek plan ve salt yedek zamanı tam zincir veya kurtarma kanıtı sayılmaz", () => {
  const presentation = createSetupProgressPresentation(
    {
      classroomConfigured: true,
      planningAcademicYearReady: true,
      activeStudentCount: 2,
      planReady: true,
      backupReady: true,
    },
    createSetupProgressEvidence(planWorkspace(1), null),
  );

  assert.equal(presentation.completedCount, 2);
  assert.equal(presentation.currentStepId, "plan");
  assert.match(presentation.steps[2].title, /1\/4 plan düzeyi/i);
  assert.match(presentation.steps[2].detail, /3 düzey eksik/i);
  assert.equal(presentation.steps[3].status, "locked");
});

test("v2 bütünlük makbuzu tek başına yeterli değildir; kurtarma tatbikatı bekler", () => {
  const evidence = createSetupProgressEvidence(
    planWorkspace(4),
    backupReceiptWithoutDrill,
  );
  const presentation = createSetupProgressPresentation(
    {
      classroomConfigured: true,
      planningAcademicYearReady: true,
      activeStudentCount: 2,
      planReady: true,
      backupReady: true,
    },
    evidence,
  );

  assert.equal(evidence.backupReceiptVerified, true);
  assert.equal(evidence.restoreDrillVerified, false);
  assert.equal(presentation.completedCount, 3);
  assert.equal(presentation.currentStepId, "backup");
  assert.match(presentation.steps[3].title, /geri yükleme tatbikatını/i);
  assert.equal(presentation.steps[3].actionLabel, "Kurtarma tatbikatını aç");
});

test("Bugün kurulum adımlarını gerçek hedeflere bağlar ve yedek bölümünü odaklar", async () => {
  const [prototypeSource, todaySource, setupCenterSource] = await Promise.all([
    readFile(new URL("../../src/Prototype.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/features/today/TodayScreen.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../../src/features/onboarding/SetupProgressCenter.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(todaySource, /SetupProgressCenter/);
  assert.match(todaySource, /readBackupHealthReceipt\(window\.localStorage\)/);
  assert.match(todaySource, /createSetupProgressEvidence/);
  assert.match(todaySource, /configuredClassroom === null \? \(/);
  assert.match(todaySource, /mode="guided"/);
  assert.match(todaySource, /actions\.onOpenSetupStep/);
  assert.match(setupCenterSource, /disabled=\{dataBusy\}/);
  assert.match(
    setupCenterSource,
    /aria-label=\{`\$\{step\.label\}: \$\{step\.title\}\. \$\{step\.actionLabel\}`\}/,
  );
  assert.doesNotMatch(setupCenterSource, /aria-pressed/);
  assert.match(
    todaySource,
    /data-setup-only=\{configuredClassroom === null \? "true" : "false"\}/,
  );
  assert.match(prototypeSource, /openSetupProgressStep/);
  assert.match(
    prototypeSource,
    /if \(stepId === "classroom"\) \{\s*setClassroomSetupSection\("period"\)/,
  );
  assert.match(prototypeSource, /navigate\("classroom"\)/);
  assert.match(prototypeSource, /navigate\("plans"\)/);
  assert.match(prototypeSource, /setSettingsInitialSection\("backup"\)/);
  assert.match(prototypeSource, /data-settings-section="backup"/);
  assert.match(prototypeSource, /Başlangıç planı · 4\. adım/);
  assert.match(prototypeSource, /academicYearMatchesCalendarProfile/);
  assert.doesNotMatch(
    prototypeSource,
    /planningAcademicYearReady:[\s\S]{0,240}academicYearName/,
  );
});
