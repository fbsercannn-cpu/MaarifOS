import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  resolveTeacherWorkCycle,
} from "../../src/features/teacher-cycle/teacher-work-cycle.ts";
import {
  createTeacherCyclePresentation,
} from "../../src/features/today/today-screen-model.ts";

const yearId = "00000000-0000-4000-8000-000000000101";
const classroomId = "00000000-0000-4000-8000-000000000102";
const annualId = "00000000-0000-4000-8000-000000000103";
const monthlyId = "00000000-0000-4000-8000-000000000104";
const weeklyId = "00000000-0000-4000-8000-000000000105";
const dailyId = "00000000-0000-4000-8000-000000000106";
const observationId = "00000000-0000-4000-8000-000000000107";

const base = {
  createdAt: "2026-09-07T06:00:00.000Z",
  updatedAt: "2026-09-07T06:00:00.000Z",
  civilDate: "2026-09-08",
  deletedAt: null,
  schemaVersion: 1,
};

function scoped(record) {
  return { ...base, academicYearId: yearId, classroomId, ...record };
}

function configuredSnapshot() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-07",
    endDate: "2027-06-25",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId: yearId,
    name: "Kurgu Sınıfı",
    ageGroup: "60–72 ay",
    curriculumProgram: "Türkiye Yüzyılı Maarif Modeli",
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
      timeZone: "Europe/Istanbul",
    },
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  return snapshot;
}

test("çalışma döngüsü yapılandırılmamış sınıfta plan veya belge uydurmaz", () => {
  const workspace = resolveTeacherWorkCycle(createEmptySnapshot(), {
    civilDate: "2026-09-08",
  });

  assert.equal(workspace.status, "not-configured");
  assert.equal(workspace.annual, null);
  assert.equal(workspace.monthly, null);
  assert.equal(workspace.weekly, null);
  assert.equal(workspace.daily.status, "missing");
  assert.equal(workspace.daily.planId, null);
  assert.deepEqual(workspace.daily.conflictingPlanIds, []);
  assert.equal(workspace.documents.planDocumentReady, false);
  const preparation = createTeacherCyclePresentation(workspace, {
    educationalWritesDisabled: true,
  });
  assert.equal(preparation.stages[0].title, "Günlük yazım henüz açık değil");
  assert.equal(preparation.stages[0].actionLabel, "Çalışmayı bugün başlat");
});

test("yıllık → aylık → haftalık → günlük → kanıt → değerlendirme → belge zincirini aynı kimliklerden özetler", () => {
  const snapshot = configuredSnapshot();
  snapshot.plans.push(
    scoped({
      id: annualId,
      planType: "annual",
      title: "Yıllık Planlama Panosu",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
    }),
    scoped({
      id: monthlyId,
      planType: "monthly",
      annualPlanId: annualId,
      title: "Eylül Aylık Planı",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-30",
      weeklySectionIds: [weeklyId],
      monthlyEvaluations: [{ id: "evaluation-month-1" }],
    }),
    scoped({
      id: weeklyId,
      planType: "weekly",
      annualPlanId: annualId,
      monthlyPlanId: monthlyId,
      title: "Birinci Hafta",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-11",
      weeklyEvaluations: [{ id: "evaluation-week-1" }],
    }),
    scoped({
      id: dailyId,
      planType: "daily",
      sourceWeeklyPlanId: weeklyId,
      title: "8 Eylül Günlük Planı",
      civilDate: "2026-09-08",
    }),
  );
  snapshot.activities.push(
    scoped({ id: "activity-1", planId: dailyId, status: "completed" }),
    scoped({ id: "activity-2", planId: dailyId, status: "in_progress" }),
  );
  snapshot.observations.push(
    scoped({ id: observationId, planId: dailyId, rawText: "Nesnel gözlem." }),
  );
  snapshot.evidenceCurriculumLinks.push(
    scoped({ id: "link-1", observationId }),
  );

  const workspace = resolveTeacherWorkCycle(snapshot, {
    civilDate: "2026-09-08",
    documents: {
      anecdoteIncompleteCount: 1,
      anecdoteReviewRequiredCount: 2,
      anecdoteReadyCount: 3,
    },
  });

  assert.equal(workspace.status, "ready");
  assert.equal(workspace.annual?.id, annualId);
  assert.equal(workspace.monthly?.id, monthlyId);
  assert.equal(workspace.monthly?.weeklyPlanCount, 1);
  assert.equal(workspace.monthly?.dailyPlanCount, 1);
  assert.equal(workspace.monthly?.observationCount, 1);
  assert.equal(workspace.monthly?.linkedObservationCount, 1);
  assert.equal(workspace.monthly?.evaluationCount, 1);
  assert.equal(workspace.weekly?.id, weeklyId);
  assert.equal(workspace.weekly?.evaluationCount, 1);
  assert.equal(workspace.daily.status, "ready");
  assert.equal(workspace.daily.planId, dailyId);
  assert.equal(workspace.daily.activityCount, 2);
  assert.equal(workspace.daily.completedActivityCount, 1);
  assert.equal(workspace.daily.observationCount, 1);
  assert.equal(workspace.documents.anecdoteReadyCount, 3);
  assert.equal(workspace.documents.monthlyEvaluationCount, 1);
  assert.equal(workspace.documents.planDocumentReady, true);
  assert.equal(workspace.pendingCurriculumLinkCount, 0);

  const presentation = createTeacherCyclePresentation(workspace);
  assert.equal(presentation.currentStep, "apply");
  assert.deepEqual(
    presentation.stages.map((stage) => [stage.id, stage.tone]),
    [
      ["daily", "current"],
      ["weekly", "ready"],
      ["monthly", "ready"],
      ["documents", "attention"],
    ],
  );
});

test("aynı sınıf ve tarihteki mükerrer günlük planları birleştirmeden deterministik çakışma üretir", () => {
  const snapshot = configuredSnapshot();
  const firstPlanId = "00000000-0000-4000-8000-000000000108";
  const secondPlanId = "00000000-0000-4000-8000-000000000109";
  snapshot.plans.push(
    scoped({
      id: secondPlanId,
      planType: "daily",
      title: "İkinci günlük plan",
      civilDate: "2026-09-08",
    }),
    scoped({
      id: firstPlanId,
      planType: "daily",
      title: "Birinci günlük plan",
      civilDate: "2026-09-08",
    }),
  );
  snapshot.activities.push(
    scoped({ id: "activity-conflict-a", planId: firstPlanId, status: "completed" }),
    scoped({ id: "activity-conflict-b", planId: secondPlanId, status: "completed" }),
  );
  snapshot.observations.push(
    scoped({ id: "observation-conflict-a", planId: firstPlanId, rawText: "Kurgu A." }),
    scoped({ id: "observation-conflict-b", planId: secondPlanId, rawText: "Kurgu B." }),
  );

  const workspace = resolveTeacherWorkCycle(snapshot, {
    civilDate: "2026-09-08",
  });

  assert.equal(workspace.daily.status, "conflict");
  assert.equal(workspace.daily.planId, null);
  assert.equal(workspace.daily.title, "Günlük plan çakışması");
  assert.deepEqual(workspace.daily.conflictingPlanIds, [firstPlanId, secondPlanId]);
  assert.equal(workspace.daily.activityCount, 0);
  assert.equal(workspace.daily.completedActivityCount, 0);
  assert.equal(workspace.daily.observationCount, 0);

  const presentation = createTeacherCyclePresentation(workspace);
  const daily = presentation.stages.find((stage) => stage.id === "daily");
  assert.equal(presentation.currentStep, "plan");
  assert.equal(daily?.tone, "attention");
  assert.equal(daily?.title, "Günlük plan çakışması");
  assert.equal(daily?.actionLabel, "Planları incele");
  assert.match(daily?.detail ?? "", /2 plan aynı sınıf ve tarihe bağlı/);
  assert.doesNotMatch(daily?.detail ?? "", /tamamland/);
});

test("bugün tarihli fakat etkin haftaya bağlı olmayan planı yok saymak yerine bağlantı incelemesine ayırır", () => {
  const snapshot = configuredSnapshot();
  const otherWeeklyId = "00000000-0000-4000-8000-000000000190";
  snapshot.plans.push(
    scoped({
      id: annualId,
      planType: "annual",
      title: "Yıllık Plan",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
    }),
    scoped({
      id: monthlyId,
      planType: "monthly",
      annualPlanId: annualId,
      title: "Eylül",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      weeklySectionIds: [weeklyId],
    }),
    scoped({
      id: weeklyId,
      planType: "weekly",
      monthlyPlanId: monthlyId,
      title: "Etkin hafta",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-11",
    }),
    scoped({
      id: dailyId,
      planType: "daily",
      sourceWeeklyPlanId: otherWeeklyId,
      title: "Korunan eski günlük plan",
      civilDate: "2026-09-08",
    }),
  );

  const workspace = resolveTeacherWorkCycle(snapshot, { civilDate: "2026-09-08" });
  assert.equal(workspace.daily.status, "chain-mismatch");
  assert.equal(workspace.daily.planId, null);
  assert.equal(workspace.daily.referencePlanId, dailyId);
  assert.equal(workspace.daily.referenceCivilDate, "2026-09-08");
  assert.equal(workspace.daily.referenceTitle, "Korunan eski günlük plan");

  const daily = createTeacherCyclePresentation(workspace).stages[0];
  assert.equal(daily.title, "Bugünün planını haftasına bağla");
  assert.equal(daily.actionLabel, "Bağı takvimde incele");
  assert.match(daily.detail, /Kayıt korundu/);
});

test("bugün plan yokken en yakın gelecek planını kalıcı karar bağlamında taşır", () => {
  const snapshot = configuredSnapshot();
  const futurePlanId = "00000000-0000-4000-8000-000000000191";
  snapshot.plans.push(
    scoped({
      id: futurePlanId,
      planType: "daily",
      title: "1 Ekim günlük planı",
      civilDate: "2026-10-01",
    }),
    scoped({
      id: "00000000-0000-4000-8000-000000000192",
      planType: "daily",
      title: "20 Eylül günlük planı",
      civilDate: "2026-09-20",
    }),
  );

  const workspace = resolveTeacherWorkCycle(snapshot, { civilDate: "2026-09-08" });
  assert.equal(workspace.daily.status, "future-only");
  assert.equal(workspace.daily.planId, null);
  assert.equal(
    workspace.daily.referencePlanId,
    "00000000-0000-4000-8000-000000000192",
  );
  assert.equal(workspace.daily.referenceCivilDate, "2026-09-20");
  assert.equal(workspace.daily.referenceTitle, "20 Eylül günlük planı");

  const daily = createTeacherCyclePresentation(workspace).stages[0];
  assert.match(daily.title, /sıradaki plan 20\/09\/2026/);
  assert.equal(daily.actionLabel, "Yaklaşan planı aç");
});

test("gelecek hafta ve ayı mevcutmuş gibi göstermeden en yakın plan dönemini sunar", () => {
  const snapshot = configuredSnapshot();
  snapshot.plans.push(
    scoped({
      id: annualId,
      planType: "annual",
      title: "Yıllık Plan",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
    }),
    scoped({
      id: monthlyId,
      planType: "monthly",
      annualPlanId: annualId,
      title: "Eylül Aylık Planı",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-30",
      weeklySectionIds: [weeklyId],
      monthlyEvaluations: [],
    }),
    scoped({
      id: weeklyId,
      planType: "weekly",
      annualPlanId: annualId,
      monthlyPlanId: monthlyId,
      title: "Uyum Haftası",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-11",
      weeklyEvaluations: [],
    }),
    scoped({
      id: "00000000-0000-4000-8000-000000000199",
      planType: "weekly",
      monthlyPlanId: "00000000-0000-4000-8000-000000000198",
      title: "Başka zincirin haftası",
      periodStart: "2026-08-10",
      periodEnd: "2026-08-14",
      weeklyEvaluations: [],
    }),
  );

  const workspace = resolveTeacherWorkCycle(snapshot, {
    civilDate: "2026-08-11",
  });
  const presentation = createTeacherCyclePresentation(workspace);

  assert.equal(workspace.monthly?.relation, "upcoming");
  assert.equal(workspace.weekly?.relation, "upcoming");
  assert.equal(workspace.weekly?.id, weeklyId);
  assert.equal(presentation.stages.find((stage) => stage.id === "weekly")?.tone, "current");
  assert.equal(
    presentation.stages.find((stage) => stage.id === "weekly")?.actionLabel,
    "Planı şimdi düzenle",
  );
  assert.match(
    presentation.stages.find((stage) => stage.id === "monthly")?.detail ?? "",
    /Plan şimdi düzenlenebilir/,
  );
});

test("aynı dönemde sağlayıcı ve öğretmen planı varsa öğretmenin kendi zincirini önceliklendirir", () => {
  const snapshot = configuredSnapshot();
  const teacherAnnualId = "00000000-0000-4000-8000-000000000180";
  const teacherMonthlyId = "00000000-0000-4000-8000-000000000181";
  const teacherWeeklyId = "00000000-0000-4000-8000-000000000182";
  snapshot.plans.push(
    scoped({
      id: "00000000-0000-4000-8000-000000000080",
      planType: "annual",
      title: "Sağlayıcı yıllık planı",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
    }),
    scoped({
      id: teacherAnnualId,
      planType: "annual",
      planOrigin: "teacher-authored",
      title: "Öğretmenin yıllık planı",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
    }),
    scoped({
      id: "00000000-0000-4000-8000-000000000081",
      planType: "monthly",
      annualPlanId: "00000000-0000-4000-8000-000000000080",
      title: "Sağlayıcı aylık planı",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-30",
    }),
    scoped({
      id: teacherMonthlyId,
      planType: "monthly",
      planOrigin: "teacher-authored",
      annualPlanId: teacherAnnualId,
      title: "Öğretmenin aylık planı",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-30",
    }),
    scoped({
      id: "00000000-0000-4000-8000-000000000082",
      planType: "weekly",
      annualPlanId: "00000000-0000-4000-8000-000000000080",
      monthlyPlanId: "00000000-0000-4000-8000-000000000081",
      title: "Sağlayıcı haftası",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-11",
    }),
    scoped({
      id: teacherWeeklyId,
      planType: "weekly",
      planOrigin: "teacher-authored",
      annualPlanId: teacherAnnualId,
      monthlyPlanId: teacherMonthlyId,
      title: "Öğretmenin haftası",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-11",
    }),
  );
  const workspace = resolveTeacherWorkCycle(snapshot, {
    civilDate: "2026-09-08",
  });
  assert.equal(workspace.annual?.id, teacherAnnualId);
  assert.equal(workspace.monthly?.id, teacherMonthlyId);
  assert.equal(workspace.weekly?.id, teacherWeeklyId);
});

test("devam eden hafta ve ayı tek gözlemle erken değerlendirme çağrısına dönüştürmez", () => {
  const snapshot = configuredSnapshot();
  snapshot.plans.push(
    scoped({
      id: annualId,
      planType: "annual",
      title: "Yıllık Plan",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
    }),
    scoped({
      id: monthlyId,
      planType: "monthly",
      annualPlanId: annualId,
      title: "Eylül",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      weeklySectionIds: [weeklyId],
      monthlyEvaluations: [],
    }),
    scoped({
      id: weeklyId,
      planType: "weekly",
      annualPlanId: annualId,
      monthlyPlanId: monthlyId,
      title: "Uyum Haftası",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-11",
      weeklyEvaluations: [],
    }),
    scoped({
      id: dailyId,
      planType: "daily",
      sourceWeeklyPlanId: weeklyId,
      title: "Salı",
      civilDate: "2026-09-08",
    }),
  );
  snapshot.observations.push(scoped({
    id: observationId,
    planId: dailyId,
    rawText: "Kurgu gözlem.",
  }));

  const presentation = createTeacherCyclePresentation(
    resolveTeacherWorkCycle(snapshot, { civilDate: "2026-09-08" }),
  );
  const weekly = presentation.stages.find((stage) => stage.id === "weekly");
  const monthly = presentation.stages.find((stage) => stage.id === "monthly");
  assert.equal(weekly?.tone, "current");
  assert.equal(weekly?.actionLabel, "Haftayı izle");
  assert.equal(monthly?.tone, "current");
  assert.equal(monthly?.actionLabel, "Ayı izle");
});

test("yetim ay ve haftayı aynı öğretmen zinciri gibi birleştirmez", () => {
  const snapshot = configuredSnapshot();
  snapshot.plans.push(
    scoped({
      id: monthlyId,
      planType: "monthly",
      title: "Yetim ay",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    }),
    scoped({
      id: weeklyId,
      planType: "weekly",
      monthlyPlanId: monthlyId,
      title: "Yetim hafta",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-11",
    }),
    scoped({
      id: dailyId,
      planType: "daily",
      sourceWeeklyPlanId: weeklyId,
      title: "Yetim günlük",
      civilDate: "2026-09-08",
    }),
  );

  const workspace = resolveTeacherWorkCycle(snapshot, { civilDate: "2026-09-08" });
  assert.equal(workspace.annual, null);
  assert.equal(workspace.monthly, null);
  assert.equal(workspace.weekly, null);
  assert.equal(workspace.daily.planId, dailyId);
  assert.equal(workspace.documents.planDocumentReady, false);
});

test("arayüz çalışma döngüsü kartlarını gerçek hedeflere ve belge merkezine bağlar", async () => {
  const [todaySource, prototypeSource, premiumSource] = await Promise.all([
    readFile(new URL("../../src/features/today/TodayScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/Prototype.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../../src/features/premium-plans/PremiumPlanCenterScreen.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(todaySource, /data-testid="teacher-work-cycle"/);
  assert.match(todaySource, /onOpenTeacherCycleStage\(stage\.id\)/);
  assert.match(prototypeSource, /openTeacherPlanRecords\(stage\)/);
  assert.match(prototypeSource, /Plan ve değerlendirme belgeleri/);
  assert.match(prototypeSource, /openTeacherPlanRecords\("monthly"\)/);
  assert.match(premiumSource, /data-testid="premium-weekly-work"/);
  assert.match(premiumSource, /data-testid="premium-monthly-work"/);
  assert.match(premiumSource, /scrollIntoView/);
});
