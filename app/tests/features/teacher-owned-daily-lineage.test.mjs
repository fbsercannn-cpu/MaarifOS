import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { defaultTeacherOwnedDailyFlowBlockDrafts } from "../../src/core/domain/teacher-owned-daily-flow.ts";
import {
  CURRICULUM_PROGRAM_LABELS,
  captureImmutableRawObservation,
  confirmObservationCurriculumLink,
  createPlanWithActivity,
} from "../../src/features/evidence/evidence-flow.ts";
import { closeTeacherDay } from "../../src/features/day-closure/teacher-day-closure.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import {
  createTeacherOwnedPlanGraph,
  loadTeacherOwnedPlanGraph,
  loadTeacherWeeklyReviewContext,
  recordTeacherWeeklyEvaluation,
  reviewTeacherWeeklyCarry,
  reviseTeacherOwnedPlan,
} from "../../src/features/planning/teacher-owned-plan-service.ts";
import { resolveTeacherWorkCycle } from "../../src/features/teacher-cycle/teacher-work-cycle.ts";
import {
  buildStandaloneTeacherOwnedPlanParagraphs,
  loadStandaloneTeacherOwnedDailyPlans,
} from "../../src/features/planning/teacher-owned-plan-document.ts";

class MemoryStore {
  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
        for (const record of records) {
          byId.set(record.id, structuredClone(record));
        }
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      for (const collection of collections) {
        this.snapshot[collection] = working[collection];
      }
    }
    return structuredClone(result);
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000000c01";
const classroomId = "00000000-0000-4000-8000-000000000c02";
const studentId = "00000000-0000-4000-8000-000000000c03";
const curriculumProfile = {
  framework: "tymm",
  programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
  catalogId: "tymm-2024-okul-oncesi-v1",
  sourceVersion: "2024.1",
  referenceOrigin: "teacher-declared",
  officialCatalogVerified: false,
};
const curriculumTarget = curriculumTargetsForProfile(curriculumProfile).find(
  (target) => target.referenceCode === "FAB.1",
);
assert.ok(curriculumTarget);

const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};

function activeStore() {
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
    name: "Kurgu Güneş Sınıfı",
    curriculumProfileSnapshot: curriculumProfile,
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
      timeZone: "Europe/Istanbul",
    },
    schemaVersion: 2,
  });
  snapshot.students.push({
    ...base,
    id: studentId,
    academicYearId: yearId,
    classroomId,
    displayName: "Kurgu Ada",
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

function teacherGraphInput() {
  return {
    title: "2026–2027 Öğretmen Yıllık Planı",
    periodStart: "2026-09-07",
    periodEnd: "2027-06-25",
    teacherContent: { purpose: "Öğretmenin yıllık omurgası" },
    months: [
      {
        title: "Eylül Öğretmen Planı",
        monthKey: "2026-09",
        periodStart: "2026-09-07",
        periodEnd: "2026-09-30",
        teacherContent: { focus: "Uyum ve aidiyet" },
        weeks: [
          {
            title: "7–11 Eylül Haftası",
            weekKey: "2026-W37",
            periodStart: "2026-09-07",
            periodEnd: "2026-09-11",
            teacherContent: { flow: ["karşılama", "oyun", "gözlem"] },
          },
          {
            title: "14–18 Eylül Haftası",
            weekKey: "2026-W38",
            periodStart: "2026-09-14",
            periodEnd: "2026-09-18",
            teacherContent: { flow: ["merkezler", "açık hava"] },
          },
        ],
      },
    ],
    now: new Date("2026-09-02T06:00:00.000Z"),
  };
}

async function createDaily(store, overrides = {}) {
  return createPlanWithActivity(store, {
    civilDate: "2026-09-08",
    planId: "00000000-0000-4000-8000-000000000c10",
    planTitle: "8 Eylül Öğretmen Günlük Planı",
    activityId: "00000000-0000-4000-8000-000000000c11",
    activityTitle: "Sınıf topluluğu oyunu",
    startTime: "09:00",
    endTime: "09:40",
    curriculumProfile,
    curriculumTargets: [curriculumTarget],
    assignmentMode: "selected-students",
    studentIds: [studentId],
    teacherOwnedDailyFlowBlocks: defaultTeacherOwnedDailyFlowBlockDrafts(240),
    teacherOwnedActivityBlockKind: "teacher-activity-one",
    now: new Date("2026-09-08T06:00:00.000Z"),
    ...overrides,
  });
}

async function completeEvidenceDay(store, daily, observationId = null) {
  const civilDate = daily.plan.civilDate;
  await store.transaction(
    "readwrite",
    ["activities", "attendanceRecords", "settings"],
    async (transaction) => {
      const activities = await transaction.getAll("activities");
      const activity = activities.find((record) => record.id === daily.activity.id);
      assert.ok(activity);
      await transaction.putMany("activities", [{
        ...activity,
        status: "completed",
        updatedAt: `${civilDate}T08:30:00.000Z`,
      }]);
      await transaction.putMany("attendanceRecords", [{
        ...base,
        id: crypto.randomUUID(),
        academicYearId: yearId,
        classroomId,
        studentId,
        civilDate,
        status: "present",
      }]);
      await transaction.putMany("settings", [{
        ...base,
        id: crypto.randomUUID(),
        academicYearId: yearId,
        classroomId,
        civilDate,
        settingType: "attendance-day-completion",
        attendanceCompleted: true,
      }]);
    },
  );
  const link = observationId
    ? await confirmObservationCurriculumLink(store, {
        observationId,
        framework: curriculumProfile.framework,
        catalogId: curriculumProfile.catalogId,
        sourceVersion: curriculumProfile.sourceVersion,
        referenceCode: curriculumTarget.referenceCode,
        referenceTitle: curriculumTarget.referenceTitle,
        referenceOrigin: curriculumProfile.referenceOrigin,
        officialCatalogVerified: curriculumProfile.officialCatalogVerified,
        plannedTargetId: curriculumTarget.id,
        now: new Date(`${civilDate}T08:00:00.000Z`),
      })
    : null;
  await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "",
    now: new Date(`${civilDate}T10:00:00.000Z`),
  });
  return link;
}

async function createFiveTeachingDays(store, dates = [
    "2026-09-07",
    "2026-09-08",
    "2026-09-09",
    "2026-09-10",
    "2026-09-11",
  ]) {
  const days = [];
  for (const [index, civilDate] of dates.entries()) {
    days.push(await createDaily(store, {
      civilDate,
      planId: `00000000-0000-4000-8000-000000000d${String(index + 1).padStart(2, "0")}`,
      planTitle: `${civilDate} Öğretmen Günlük Planı`,
      activityId: `00000000-0000-4000-8000-000000000e${String(index + 1).padStart(2, "0")}`,
      activityTitle: `${civilDate} sınıf etkinliği`,
      now: new Date(`${civilDate}T06:00:00.000Z`),
    }));
  }
  return days;
}

async function prepareFiveDayEvidence(
  store,
  { skipClosureDates = [] } = {},
) {
  const days = await createFiveTeachingDays(store);
  const observedDay = days.find((day) => day.plan.civilDate === "2026-09-08");
  assert.ok(observedDay);
  const observationId = crypto.randomUUID();
  await captureImmutableRawObservation(store, {
    observationId,
    studentId,
    planId: observedDay.plan.id,
    activityId: observedDay.activity.id,
    rawText: "Kurgu çocuk, arkadaşının önerisini dinleyerek oyun sırasını birlikte yeniden kurdu.",
    observedAt: "2026-09-08T07:15:00.000Z",
    now: new Date("2026-09-08T07:16:00.000Z"),
  });
  let curriculumLink = null;
  for (const day of days) {
    if (skipClosureDates.includes(day.plan.civilDate)) continue;
    const link = await completeEvidenceDay(
      store,
      day,
      day.plan.id === observedDay.plan.id ? observationId : null,
    );
    if (link) curriculumLink = link;
  }
  if (!skipClosureDates.includes(observedDay.plan.civilDate)) {
    assert.ok(curriculumLink);
  }
  return { days, observedDay, observationId, curriculumLink };
}

test("öğretmenin günlük planını aynı transaction içinde Yıl → Ay → Hafta zincirine bağlar", async () => {
  const store = activeStore();
  const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
  const created = await createDaily(store);
  const expectedWeek = graph.months[0].weeks[0];

  for (const record of [created.plan, created.activity]) {
    assert.equal(record.sourceAnnualPlanId, graph.annual.id);
    assert.equal(record.sourceMonthlyPlanId, graph.months[0].monthly.id);
    assert.equal(record.sourceWeeklyPlanId, expectedWeek.id);
    assert.equal("sourceContentPackSnapshot" in record, false);
    assert.equal("sourceActivityTemplateSnapshot" in record, false);
  }

  const snapshot = await store.readSnapshot();
  const cycle = resolveTeacherWorkCycle(snapshot, { civilDate: "2026-09-08" });
  assert.equal(cycle.annual?.id, graph.annual.id);
  assert.equal(cycle.monthly?.id, graph.months[0].monthly.id);
  assert.equal(cycle.monthly?.dailyPlanCount, 1);
  assert.equal(cycle.weekly?.id, expectedWeek.id);
  assert.equal(cycle.weekly?.dailyPlanCount, 1);
  assert.equal(cycle.daily.planId, created.plan.id);
  assert.equal(cycle.daily.activityCount, 1);
});

test("öğretmen haftası bulunmayan gün için mevcut bağımsız günlük plan davranışını korur", async () => {
  const store = activeStore();
  await createTeacherOwnedPlanGraph(store, teacherGraphInput());
  const created = await createDaily(store, {
    civilDate: "2026-09-12",
    planId: "00000000-0000-4000-8000-000000000c12",
    activityId: "00000000-0000-4000-8000-000000000c13",
    now: new Date("2026-09-12T06:00:00.000Z"),
    teacherOwnedDailyFlowBlocks: undefined,
  });
  assert.equal("sourceAnnualPlanId" in created.plan, false);
  assert.equal("sourceMonthlyPlanId" in created.plan, false);
  assert.equal("sourceWeeklyPlanId" in created.plan, false);
});

test("çakışan veya ebeveyni bozuk öğretmen haftasında sıfır yazımla fail-closed kalır", async (t) => {
  await t.test("aynı günü kapsayan iki öğretmen haftasını reddeder", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
    const snapshot = await store.readSnapshot();
    snapshot.plans.push({
      ...structuredClone(graph.months[0].weeks[0]),
      id: "00000000-0000-4000-8000-000000000c20",
      weekKey: "duplicate-week",
    });
    const tamperedStore = new MemoryStore(snapshot);
    const before = await tamperedStore.readSnapshot();
    await assert.rejects(
      () => createDaily(tamperedStore),
      /birden fazla öğretmen haftalık planına/,
    );
    assert.deepEqual(await tamperedStore.readSnapshot(), before);
  });

  await t.test("haftanın doğrulanamayan ebeveyn zincirini reddeder", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
    const snapshot = await store.readSnapshot();
    const weekly = snapshot.plans.find(
      (record) => record.id === graph.months[0].weeks[0].id,
    );
    assert.ok(weekly);
    weekly.monthlyPlanId = "00000000-0000-4000-8000-000000000c99";
    const tamperedStore = new MemoryStore(snapshot);
    const before = await tamperedStore.readSnapshot();
    await assert.rejects(
      () => createDaily(tamperedStore),
      /kaynak zinciri doğrulanamadı/,
    );
    assert.deepEqual(await tamperedStore.readSnapshot(), before);
  });
});

test("14–18 Eylül normal dönem kanıtını değerlendirir ve sonraki haftaya yalnız onay bekleyen öneri taşır", async () => {
  const store = activeStore();
  const graphInput = teacherGraphInput();
  graphInput.months[0].weeks.push({
    title: "21–25 Eylül Haftası",
    weekKey: "2026-W39",
    periodStart: "2026-09-21",
    periodEnd: "2026-09-25",
    teacherContent: { flow: ["araştırma", "açık hava"] },
  });
  const graph = await createTeacherOwnedPlanGraph(store, graphInput);
  const teachingDays = await createFiveTeachingDays(store, [
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
  ]);
  const daily = teachingDays.find((day) => day.plan.civilDate === "2026-09-15");
  assert.ok(daily);
  const observationId = "00000000-0000-4000-8000-000000000c30";
  await captureImmutableRawObservation(store, {
    observationId,
    studentId,
    planId: daily.plan.id,
    activityId: daily.activity.id,
    rawText: "Kurgu Ada, arkadaşının önerisini dinledikten sonra oyundaki sırayı birlikte yeniden kurdu.",
    observedAt: "2026-09-15T07:15:00.000Z",
    now: new Date("2026-09-15T07:16:00.000Z"),
  });
  let curriculumLink = null;
  for (const teachingDay of teachingDays) {
    const link = await completeEvidenceDay(
      store,
      teachingDay,
      teachingDay.plan.id === daily.plan.id ? observationId : null,
    );
    if (link) curriculumLink = link;
  }
  assert.ok(curriculumLink);
  const sourceWeek = graph.months[0].weeks[1];
  const targetWeek = graph.months[0].weeks[2];
  const context = await loadTeacherWeeklyReviewContext(store, sourceWeek.id, {
    now: new Date("2026-09-18T13:00:00.000Z"),
  });
  assert.equal(context.observations.length, 1);
  assert.equal(context.observations[0].id, observationId);
  assert.equal(context.evaluations.length, 0);
  assert.equal(context.readiness.eligible, true);
  assert.equal(context.readiness.expectedTeachingDayCount, 5);
  assert.deepEqual(context.readiness.missingExpectedCivilDates, []);
  assert.equal(
    context.readiness.teachingDays.evaluationOpensAtUtc,
    "2026-09-18T09:30:00.000Z",
  );

  const evaluation = await recordTeacherWeeklyEvaluation(store, {
    weeklyPlanId: sourceWeek.id,
    expectedWeeklyUpdatedAt: sourceWeek.updatedAt,
    reflection:
      "Sıra alma ve arkadaşını dinleme davranışı ortak oyunun içinde daha görünür oldu.",
    evidenceSummary:
      "15 Eylül gözleminde çocuk, arkadaşının önerisinden sonra oyun sırasını birlikte yeniden kurdu.",
    observationIds: [observationId],
    nextPlanDecision: "adapt",
    now: new Date("2026-09-18T13:00:00.000Z"),
  });
  assert.equal(evaluation.sourcePlanRevisionNumber, 1);
  assert.equal(evaluation.targetPlanRevisionNumberAtSuggestion, 1);
  assert.equal(evaluation.nextPlanTargetPlanId, targetWeek.id);
  assert.deepEqual(evaluation.curriculumLinkIds, [curriculumLink.id]);

  const reloaded = await loadTeacherOwnedPlanGraph(store, {
    annualPlanId: graph.annual.id,
  });
  assert.ok(reloaded);
  const reloadedSource = reloaded.months[0].weeks[1];
  const reloadedTarget = reloaded.months[0].weeks[2];
  assert.equal(reloadedSource.weeklyEvaluations?.length, 1);
  assert.equal(reloadedSource.nextPlanDecisionRequired, false);
  assert.equal(reloadedTarget.previousWeekEvaluationId, evaluation.id);
  assert.equal(reloadedTarget.teacherReviewRequired, true);
  assert.deepEqual(reloadedTarget.nextPlanDecisionContext, {
    sourceWeeklyPlanId: sourceWeek.id,
    evaluationId: evaluation.id,
    decision: "adapt",
    evidenceSummary: evaluation.evidenceSummary,
    teacherReflection: evaluation.reflection,
    sourcePlanRevisionNumber: 1,
    targetPlanRevisionNumberAtSuggestion: 1,
    createdAt: evaluation.createdAt,
    applicationStatus: "pending-teacher-review",
    reviewHistory: [],
  });
  const dailyExports = await loadStandaloneTeacherOwnedDailyPlans(store, reloaded);
  assert.equal(dailyExports.length, 5);
  const observedDailyExport = dailyExports.find(
    (candidate) => candidate.planId === daily.plan.id,
  );
  assert.ok(observedDailyExport);
  assert.equal(observedDailyExport.activities[0].id, daily.activity.id);
  assert.deepEqual(observedDailyExport.observationIds, [observationId]);
  assert.deepEqual(observedDailyExport.curriculumLinkIds, [curriculumLink.id]);
  const documentText = buildStandaloneTeacherOwnedPlanParagraphs(
    reloaded,
    dailyExports,
    { includeAuditAppendix: true },
  )
    .map((paragraph) => paragraph.text)
    .join("\n");
  assert.match(documentText, /Haftalık değerlendirme/);
  assert.match(documentText, /Kanıt özeti:/);
  assert.match(documentText, /Sonraki plan kararı: Uyarlayarak sürdür/);
  assert.match(documentText, new RegExp(observationId));
  assert.match(documentText, new RegExp(curriculumLink.id));
  assert.match(documentText, new RegExp(evaluation.id));
  assert.match(documentText, /Günlük planlar ve uygulama izi/);
  assert.match(documentText, new RegExp(daily.plan.id));
  assert.match(documentText, new RegExp(daily.activity.id));
  assert.match(documentText, /Henüz bu haftanın planına uygulanmadı/);

  const accepted = await reviewTeacherWeeklyCarry(store, {
    weeklyPlanId: reloadedTarget.id,
    expectedWeeklyUpdatedAt: reloadedTarget.updatedAt,
    expectedEvaluationId: evaluation.id,
    action: "accepted",
    teacherNote: "Kanıt, geçişlerde küçük grup düzenini sürdürmeyi destekliyor.",
    acceptedNarrative:
      "Küçük grup geçişleri korunacak; sessiz katılım için görsel sıra kartı eklenecek.",
    now: new Date("2026-09-18T13:05:00.000Z"),
  });
  assert.equal(accepted.revisionNumber, 2);
  assert.equal(accepted.teacherReviewRequired, false);
  assert.equal(accepted.nextPlanDecisionContext?.applicationStatus, "accepted");
  assert.equal(accepted.nextPlanDecisionContext?.reviewHistory?.length, 1);
  assert.match(String(accepted.teacherContent.narrative), /görsel sıra kartı/);

  const idempotentAccepted = await reviewTeacherWeeklyCarry(store, {
    weeklyPlanId: reloadedTarget.id,
    expectedWeeklyUpdatedAt: reloadedTarget.updatedAt,
    expectedEvaluationId: evaluation.id,
    action: "accepted",
    teacherNote: "Kanıt, geçişlerde küçük grup düzenini sürdürmeyi destekliyor.",
    acceptedNarrative:
      "Küçük grup geçişleri korunacak; sessiz katılım için görsel sıra kartı eklenecek.",
    now: new Date("2026-09-18T13:06:00.000Z"),
  });
  assert.equal(idempotentAccepted.updatedAt, accepted.updatedAt);
  assert.equal(idempotentAccepted.revisionNumber, 2);

  const reopened = await reviewTeacherWeeklyCarry(store, {
    weeklyPlanId: accepted.id,
    expectedWeeklyUpdatedAt: accepted.updatedAt,
    expectedEvaluationId: evaluation.id,
    action: "reopened",
    teacherNote: "Yeni gözlem geldiği için kararı yeniden değerlendireceğim.",
    now: new Date("2026-09-18T13:10:00.000Z"),
  });
  assert.equal(reopened.revisionNumber, 3);
  assert.equal(reopened.teacherReviewRequired, true);
  assert.equal(
    reopened.nextPlanDecisionContext?.applicationStatus,
    "pending-teacher-review",
  );
  assert.equal(reopened.nextPlanDecisionContext?.reviewHistory?.length, 2);
  assert.deepEqual(reopened.teacherContent, targetWeek.teacherContent);

  const reaccepted = await reviewTeacherWeeklyCarry(store, {
    weeklyPlanId: reopened.id,
    expectedWeeklyUpdatedAt: reopened.updatedAt,
    expectedEvaluationId: evaluation.id,
    action: "accepted",
    teacherNote: "Yeni kanıtla öneriyi yeniden düzenleyerek kabul ediyorum.",
    acceptedNarrative:
      "Küçük grup geçişi korunacak; görsel sıra kartı yalnız ihtiyaç duyan çocuklara sunulacak.",
    now: new Date("2026-09-18T13:15:00.000Z"),
  });
  assert.equal(reaccepted.revisionNumber, 4);
  assert.equal(reaccepted.nextPlanDecisionContext?.applicationStatus, "accepted");

  const reopenedForRejection = await reviewTeacherWeeklyCarry(store, {
    weeklyPlanId: reaccepted.id,
    expectedWeeklyUpdatedAt: reaccepted.updatedAt,
    expectedEvaluationId: evaluation.id,
    action: "reopened",
    teacherNote: "Öneriyi son kez yeniden değerlendirmek istiyorum.",
    now: new Date("2026-09-18T13:20:00.000Z"),
  });
  const rejected = await reviewTeacherWeeklyCarry(store, {
    weeklyPlanId: reopenedForRejection.id,
    expectedWeeklyUpdatedAt: reopenedForRejection.updatedAt,
    expectedEvaluationId: evaluation.id,
    action: "rejected",
    teacherNote: "Yeni hafta için farklı bir öğretmen akışı uygulayacağım.",
    now: new Date("2026-09-18T13:25:00.000Z"),
  });
  assert.equal(rejected.revisionNumber, 6);
  assert.equal(rejected.teacherReviewRequired, false);
  assert.equal(rejected.nextPlanDecisionContext?.applicationStatus, "rejected");
  assert.deepEqual(rejected.teacherContent, targetWeek.teacherContent);

  const revisedTarget = await reviseTeacherOwnedPlan(store, {
    planId: rejected.id,
    expectedUpdatedAt: rejected.updatedAt,
    teacherContent: {
      ...reloadedTarget.teacherContent,
      narrative: "W2 öğretmen tarafından ayrıca revize edildi.",
    },
    now: new Date("2026-09-19T06:00:00.000Z"),
  });
  assert.equal(revisedTarget.revisionNumber, 7);
  assert.equal(
    revisedTarget.nextPlanDecisionContext?.targetPlanRevisionNumberAtSuggestion,
    1,
    "öneri hedef plan revize edilince sessizce güncellenmemeli",
  );
});

test("öğretmen planı belgesi yalnız exact etkinlik zinciri ve öğretmen onaylı program bağını taşır", async () => {
  const store = activeStore();
  const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
  const daily = await createDaily(store, { initialActivityStatus: "in_progress" });
  const observationId = "00000000-0000-4000-8000-000000000c70";
  await captureImmutableRawObservation(store, {
    observationId,
    studentId,
    planId: daily.plan.id,
    activityId: daily.activity.id,
    rawText: "Kurgu Ada, arkadaşının önerisini dinleyerek ortak oyuna katıldı.",
    observedAt: "2026-09-08T07:15:00.000Z",
    now: new Date("2026-09-08T07:16:00.000Z"),
  });
  const link = await confirmObservationCurriculumLink(store, {
    observationId,
    framework: curriculumProfile.framework,
    catalogId: curriculumProfile.catalogId,
    sourceVersion: curriculumProfile.sourceVersion,
    referenceCode: curriculumTarget.referenceCode,
    referenceTitle: curriculumTarget.referenceTitle,
    referenceOrigin: curriculumProfile.referenceOrigin,
    officialCatalogVerified: curriculumProfile.officialCatalogVerified,
    plannedTargetId: curriculumTarget.id,
    now: new Date("2026-09-08T08:00:00.000Z"),
  });

  const verified = await loadStandaloneTeacherOwnedDailyPlans(store, graph);
  assert.deepEqual(verified[0].curriculumLinkIds, [link.id]);

  const linkTampered = await store.readSnapshot();
  linkTampered.evidenceCurriculumLinks = linkTampered.evidenceCurriculumLinks.map((record) =>
    record.id === link.id ? { ...record, confirmationMethod: "model-inferred" } : record,
  );
  const withoutUnapprovedLink = await loadStandaloneTeacherOwnedDailyPlans(
    new MemoryStore(linkTampered),
    graph,
  );
  assert.deepEqual(withoutUnapprovedLink[0].curriculumLinkIds, []);

  const lineageTampered = await store.readSnapshot();
  lineageTampered.activities = lineageTampered.activities.map((record) =>
    record.id === daily.activity.id
      ? { ...record, sourceWeeklyPlanId: graph.months[0].weeks[1].id }
      : record,
  );
  await assert.rejects(
    () => loadStandaloneTeacherOwnedDailyPlans(new MemoryStore(lineageTampered), graph),
    /gerçek etkinlik kaydı taşımıyor/,
  );
});

test("haftalık değerlendirme stale sürümde veya sahte etkinlik bağında sıfır yazımla reddedilir", async (t) => {
  await t.test("hafta bitmeden değerlendirme açmaz", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
    const before = await store.readSnapshot();
    await assert.rejects(
      () => recordTeacherWeeklyEvaluation(store, {
        weeklyPlanId: graph.months[0].weeks[0].id,
        expectedWeeklyUpdatedAt: graph.months[0].weeks[0].updatedAt,
        reflection: "Öğretmen yansıtması erken kaydedilmemelidir.",
        evidenceSummary: "Hafta bitmeden kanıt özeti nihai değildir.",
        observationIds: ["00000000-0000-4000-8000-000000000c31"],
        nextPlanDecision: "keep",
        now: new Date("2026-09-09T13:00:00.000Z"),
      }),
      /son öğretim günü 2026-09-11 saat 12:30/,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  });

  await t.test("takvimde beklenen öğretim günlerinden biri bile plansızsa kaydı reddeder", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
    const daily = await createDaily(store, { initialActivityStatus: "in_progress" });
    const observationId = crypto.randomUUID();
    await captureImmutableRawObservation(store, {
      observationId,
      studentId,
      planId: daily.plan.id,
      activityId: daily.activity.id,
      rawText: "Kurgu gözlem yalnız mevcut günü değil haftanın exact takvim kapsamını kanıtlamalıdır.",
      observedAt: "2026-09-08T07:15:00.000Z",
      now: new Date("2026-09-08T07:16:00.000Z"),
    });
    await completeEvidenceDay(store, daily, observationId);
    const context = await loadTeacherWeeklyReviewContext(
      store,
      graph.months[0].weeks[0].id,
      { now: new Date("2026-09-11T13:00:00.000Z") },
    );
    assert.deepEqual(context.readiness.missingExpectedCivilDates, [
      "2026-09-07",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
    ]);
    const before = await store.readSnapshot();
    await assert.rejects(
      () => recordTeacherWeeklyEvaluation(store, {
        weeklyPlanId: graph.months[0].weeks[0].id,
        expectedWeeklyUpdatedAt: graph.months[0].weeks[0].updatedAt,
        reflection: "Eksik öğretim günleri varken haftalık hüküm oluşmamalıdır.",
        evidenceSummary: "Yalnız bir günün kanıtı bulunuyor.",
        observationIds: [observationId],
        nextPlanDecision: "observe-more",
        now: new Date("2026-09-11T13:00:00.000Z"),
      }),
      /günlük plan eksik: 2026-09-07, 2026-09-09, 2026-09-10, 2026-09-11/,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  });

  await t.test("beklenen günlerden biri kapanmadıysa değerlendirmeyi fail-closed tutar", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
    const evidence = await prepareFiveDayEvidence(store, {
      skipClosureDates: ["2026-09-11"],
    });
    const before = await store.readSnapshot();
    await assert.rejects(
      () => recordTeacherWeeklyEvaluation(store, {
        weeklyPlanId: graph.months[0].weeks[0].id,
        expectedWeeklyUpdatedAt: graph.months[0].weeks[0].updatedAt,
        reflection: "Bütün öğretim günleri kapanmadan değerlendirme yazılmamalıdır.",
        evidenceSummary: "Cuma gününün uygulama ve kapanış kanıtı eksiktir.",
        observationIds: [evidence.observationId],
        nextPlanDecision: "observe-more",
        now: new Date("2026-09-11T13:00:00.000Z"),
      }),
      /4\/5 beklenen öğretim günü eksiksiz ve güncel kapandı/,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  });

  await t.test("kapanıştan sonra değişen gün stale ise değerlendirmeyi reddeder", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
    const evidence = await prepareFiveDayEvidence(store);
    const staleDay = evidence.days.find(
      (day) => day.plan.civilDate === "2026-09-10",
    );
    assert.ok(staleDay);
    await store.transaction("readwrite", ["activities"], async (transaction) => {
      const activities = await transaction.getAll("activities");
      const activity = activities.find((record) => record.id === staleDay.activity.id);
      assert.ok(activity);
      await transaction.putMany("activities", [{
        ...activity,
        updatedAt: "2026-09-10T10:30:00.000Z",
      }]);
    });
    const before = await store.readSnapshot();
    await assert.rejects(
      () => recordTeacherWeeklyEvaluation(store, {
        weeklyPlanId: graph.months[0].weeks[0].id,
        expectedWeeklyUpdatedAt: graph.months[0].weeks[0].updatedAt,
        reflection: "Stale kapanış yeniden doğrulanmadan haftalık karar verilmemelidir.",
        evidenceSummary: "Perşembe etkinliği kapanıştan sonra değişmiştir.",
        observationIds: [evidence.observationId],
        nextPlanDecision: "observe-more",
        now: new Date("2026-09-11T13:00:00.000Z"),
      }),
      /4\/5 beklenen öğretim günü eksiksiz ve güncel kapandı/,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  });

  await t.test("öğretmen onaylı program bağı olmayan gözlemi reddeder", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
    const daily = await createDaily(store, { initialActivityStatus: "in_progress" });
    const observationId = "00000000-0000-4000-8000-000000000c34";
    await captureImmutableRawObservation(store, {
      observationId,
      studentId,
      planId: daily.plan.id,
      activityId: daily.activity.id,
      rawText: "Kurgu gözlem program bağı kurulmadan haftalık hükme dönüşmemelidir.",
      observedAt: "2026-09-08T07:15:00.000Z",
      now: new Date("2026-09-08T07:16:00.000Z"),
    });
    const before = await store.readSnapshot();
    await assert.rejects(
      () => recordTeacherWeeklyEvaluation(store, {
        weeklyPlanId: graph.months[0].weeks[0].id,
        expectedWeeklyUpdatedAt: graph.months[0].weeks[0].updatedAt,
        reflection: "Öğretmen yansıtması kanıta bağlıdır.",
        evidenceSummary: "Program bağı olmayan kanıt reddedilmelidir.",
        observationIds: [observationId],
        nextPlanDecision: "observe-more",
        now: new Date("2026-09-11T13:00:00.000Z"),
      }),
      /öğretmen onaylı program bağı/,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  });

  await t.test("aynı güne bağlı ikinci günlük plan varken haftalık karar yazmaz", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
    const daily = await createDaily(store, { initialActivityStatus: "in_progress" });
    const observationId = "00000000-0000-4000-8000-000000000c35";
    await captureImmutableRawObservation(store, {
      observationId,
      studentId,
      planId: daily.plan.id,
      activityId: daily.activity.id,
      rawText: "Kurgu Ada, arkadaşının önerisini dinleyerek ortak oyun sırasını yeniden kurdu.",
      observedAt: "2026-09-08T07:15:00.000Z",
      now: new Date("2026-09-08T07:16:00.000Z"),
    });
    await completeEvidenceDay(store, daily, observationId);
    await store.transaction("readwrite", ["plans"], async (transaction) => {
      const plans = await transaction.getAll("plans");
      const sourceDaily = plans.find((record) => record.id === daily.plan.id);
      assert.ok(sourceDaily);
      await transaction.putMany("plans", [{
        ...sourceDaily,
        id: "00000000-0000-4000-8000-000000000c36",
        title: "8 Eylül mükerrer günlük plan",
      }]);
    });
    const before = await store.readSnapshot();
    await assert.rejects(
      () => recordTeacherWeeklyEvaluation(store, {
        weeklyPlanId: graph.months[0].weeks[0].id,
        expectedWeeklyUpdatedAt: graph.months[0].weeks[0].updatedAt,
        reflection: "Mükerrer gün çözülmeden haftalık yansıtma kaydedilmemelidir.",
        evidenceSummary: "Aynı güne bağlı iki plan kanıt zincirini belirsiz bırakır.",
        observationIds: [observationId],
        nextPlanDecision: "observe-more",
        now: new Date("2026-09-11T13:00:00.000Z"),
      }),
      /birden fazla günlük plan/,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  });

  await t.test("stale haftalık plan sürümünü reddeder", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
    const daily = await createDaily(store, { initialActivityStatus: "in_progress" });
    const observationId = "00000000-0000-4000-8000-000000000c31";
    await captureImmutableRawObservation(store, {
      observationId,
      studentId,
      planId: daily.plan.id,
      activityId: daily.activity.id,
      rawText: "Kurgu gözlem, etkinlik sırasında doğrulanabilir bir davranışı nesnel olarak kaydetti.",
      observedAt: "2026-09-08T07:15:00.000Z",
      now: new Date("2026-09-08T07:16:00.000Z"),
    });
    const before = await store.readSnapshot();
    await assert.rejects(
      () =>
        recordTeacherWeeklyEvaluation(store, {
          weeklyPlanId: graph.months[0].weeks[0].id,
          expectedWeeklyUpdatedAt: "2026-09-01T00:00:00.000Z",
          reflection: "Öğretmen yansıtması kanıta dayalı olarak yazıldı.",
          evidenceSummary: "Seçilen gözlem haftanın günlük planına bağlıdır.",
          observationIds: [observationId],
          nextPlanDecision: "keep",
          now: new Date("2026-09-11T13:00:00.000Z"),
        }),
      (error) => error?.code === "concurrent-update",
    );
    assert.deepEqual(await store.readSnapshot(), before);
  });

  await t.test("gözlemdeki sahte etkinlik kimliğini reddeder", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, teacherGraphInput());
    const daily = await createDaily(store, { initialActivityStatus: "in_progress" });
    const observationId = "00000000-0000-4000-8000-000000000c32";
    await captureImmutableRawObservation(store, {
      observationId,
      studentId,
      planId: daily.plan.id,
      activityId: daily.activity.id,
      rawText: "Kurgu gözlem, etkinlik sırasında doğrulanabilir bir davranışı nesnel olarak kaydetti.",
      observedAt: "2026-09-08T07:15:00.000Z",
      now: new Date("2026-09-08T07:16:00.000Z"),
    });
    await completeEvidenceDay(store, daily, observationId);
    const snapshot = await store.readSnapshot();
    const observation = snapshot.observations.find(
      (record) => record.id === observationId,
    );
    assert.ok(observation);
    observation.activityId = "00000000-0000-4000-8000-000000000c98";
    const tamperedStore = new MemoryStore(snapshot);
    const before = await tamperedStore.readSnapshot();
    await assert.rejects(
      () =>
        recordTeacherWeeklyEvaluation(tamperedStore, {
          weeklyPlanId: graph.months[0].weeks[0].id,
          expectedWeeklyUpdatedAt: graph.months[0].weeks[0].updatedAt,
          reflection: "Öğretmen yansıtması kanıta dayalı olarak yazıldı.",
          evidenceSummary: "Seçilen gözlem haftanın günlük planına bağlıdır.",
          observationIds: [observationId],
          nextPlanDecision: "adapt",
          now: new Date("2026-09-11T13:00:00.000Z"),
        }),
      /gerçek etkinliğine bağlı/,
    );
    assert.deepEqual(await tamperedStore.readSnapshot(), before);
  });
});
