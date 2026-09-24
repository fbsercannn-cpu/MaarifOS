import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  applyPlanNextStep,
  loadPlanNextSteps,
} from "../../src/features/planning/plan-next-steps.ts";
import {
  createTeacherOwnedPlanGraph,
  reviseTeacherOwnedPlan,
} from "../../src/features/planning/teacher-owned-plan-service.ts";
import {
  buildNeutralTeacherYearOutline,
  buildTeacherFullYearMonthDrafts,
} from "../../src/features/planning/teacher-year-outline.ts";
import { CURRICULUM_PROGRAM_LABELS } from "../../src/features/evidence/evidence-flow.ts";
import {canonicalJson} from "../../src/core/backup/canonical-json.ts";

test("Eksik etkinlik zinciri hazır sayılmaz; bağlama önizlemesi mevcut öğretmen akışını değiştirmez",async()=>{
  const store=activeStore();await createPartialGraph(store,yearDrafts());
  const model=await loadPlanNextSteps(store,{civilDate:"2026-09-17"});
  const result=await applyPlanNextStep(store,model.options[0].request,{now:new Date("2026-09-17T06:00:00.000Z")});
  const original=await store.readSnapshot(),flow=canonicalJson(original.plans.find(p=>p.id===result.nextTarget.planId).teacherOwnedDailyFlow);
  // Represents an imported older daily record whose activity lost its parent link.
  delete store.snapshot.activities.find(a=>a.id===result.createdActivityIds[0]).sourceWeeklyPlanId;
  const repair=await loadPlanNextSteps(store,{civilDate:"2026-09-17"});assert.equal(repair.status,"action-required");assert.equal(repair.options[0].request.kind,"link-existing-daily-plan");
  const after=await store.readSnapshot();assert.equal(canonicalJson(after.plans.find(p=>p.id===result.nextTarget.planId).teacherOwnedDailyFlow),flow);assert.equal(after.activities[0].teacherOwnedFlowBlockId,original.activities[0].teacherOwnedFlowBlockId);assert.equal(repair.options[0].request.dailyPlanId,result.nextTarget.planId);
});

class MemoryStore {
  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(working[collection].map((record) => [record.id, record]));
        for (const record of records) byId.set(record.id, structuredClone(record));
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

const yearId = "00000000-0000-4000-8000-00000000a101";
const classroomId = "00000000-0000-4000-8000-00000000a102";
const otherClassroomId = "00000000-0000-4000-8000-00000000a103";
const studentId = "00000000-0000-4000-8000-00000000a104";
const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};
const curriculumProfile = {
  framework: "tymm",
  programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
  catalogId: "tymm-2024-okul-oncesi-v1",
  sourceVersion: "2024.1",
  referenceOrigin: "teacher-declared",
  officialCatalogVerified: false,
};

function activeStore({ withOtherClassroom = false } = {}) {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026–2027 Kurgu Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-25",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId: yearId,
    name: "Kurgu Güneş Sınıfı",
    ageGroup: "60-72",
    curriculumProfileSnapshot: curriculumProfile,
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
      timeZone: "Europe/Istanbul",
    },
    schemaVersion: 2,
  });
  if (withOtherClassroom) {
    snapshot.classrooms.push({
      ...snapshot.classrooms[0],
      id: otherClassroomId,
      name: "Kurgu Ay Sınıfı",
    });
  }
  snapshot.students.push({
    ...base,
    id: studentId,
    academicYearId: yearId,
    classroomId,
    displayName: "Kurgu Ada",
    active: true,
    enrollmentStatus: "active",
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

function yearDrafts() {
  return buildTeacherFullYearMonthDrafts({
    annualPeriodStart: "2026-09-01",
    annualPeriodEnd: "2027-06-25",
    months: buildNeutralTeacherYearOutline({
      annualPeriodStart: "2026-09-01",
      annualPeriodEnd: "2027-06-25",
    }),
  });
}

async function createPartialGraph(store, months) {
  return createTeacherOwnedPlanGraph(store, {
    title: "Kurgu öğretmen yıllık planı",
    periodStart: "2026-09-01",
    periodEnd: "2027-06-25",
    teacherContent: { narrative: "Kurgu öğretmen omurgası" },
    months,
    now: new Date("2026-09-05T06:00:00.000Z"),
  });
}

test("hazır yıl omurgasını ve günlük planı açık öğretmen seçimleriyle gerçek kayda dönüştürür", async () => {
  const store = activeStore();
  const initial = await loadPlanNextSteps(store, { civilDate: "2026-09-17" });
  assert.equal(initial.status, "action-required");
  assert.equal(initial.level, "annual");
  assert.equal(initial.options[0].actionLabel, "Yıl–ay–hafta omurgasını kaydet");
  const graphRequest = initial.options[0].request;
  assert.ok(graphRequest);

  const graphResult = await applyPlanNextStep(store, graphRequest, {
    now: new Date("2026-09-10T06:00:00.000Z"),
  });
  assert.equal(graphResult.nextTarget.level, "weekly");
  assert.equal(graphResult.createdPlanIds.length > 10, true);

  const dailyModel = await loadPlanNextSteps(store, {
    civilDate: "2026-09-17",
    requestedLevel: "daily",
  });
  assert.equal(dailyModel.level, "daily");
  assert.equal(dailyModel.options.length, 3);
  assert.equal(
    dailyModel.options.every(
      (option) => option.actionLabel === "Günlük planı kaydet ve aç",
    ),
    true,
  );
  const dailyRequest = dailyModel.options[0].request;
  assert.ok(dailyRequest);
  const dailyResult = await applyPlanNextStep(store, dailyRequest, {
    now: new Date("2026-09-17T06:00:00.000Z"),
  });
  assert.equal(dailyResult.nextTarget.level, "daily");

  const snapshot = await store.readSnapshot();
  const plan = snapshot.plans.find((record) => record.id === dailyResult.nextTarget.planId);
  const activity = snapshot.activities.find(
    (record) => record.id === dailyResult.createdActivityIds[0],
  );
  assert.ok(plan);
  assert.ok(activity);
  assert.equal(activity.status, "planned");
  assert.equal(plan.coverageStatus, "planned");
  assert.equal(typeof plan.sourceAnnualPlanId, "string");
  assert.equal(typeof plan.sourceMonthlyPlanId, "string");
  assert.equal(typeof plan.sourceWeeklyPlanId, "string");
  assert.equal(typeof plan.teacherOwnedDailyFlow, "object");
  assert.equal(activity.sourceWeeklyPlanId, plan.sourceWeeklyPlanId);
  assert.equal(typeof activity.teacherOwnedFlowBlockId, "string");
  assert.equal("appliedAt" in plan, false);
  assert.equal("observedAt" in plan, false);

  const ready = await loadPlanNextSteps(store, { civilDate: "2026-09-17" });
  assert.equal(ready.status, "ready");
  assert.equal(ready.options[0].actionLabel, "Kayıtlı günlük planı aç");
  assert.equal(ready.options[0].openTarget.planId, plan.id);

  const beforeDuplicate = await store.readSnapshot();
  await assert.rejects(
    () => applyPlanNextStep(store, dailyRequest, {
      now: new Date("2026-09-17T06:01:00.000Z"),
    }),
    /zaten var|seçimden sonra değişti/,
  );
  assert.deepEqual(await store.readSnapshot(), beforeDuplicate);
});

test("eksik ayı ve eksik haftayı yalnız kendi ebeveynine ekler", async (t) => {
  await t.test("eksik ay", async () => {
    const store = activeStore();
    const september = yearDrafts().find((month) => month.monthKey === "2026-09");
    assert.ok(september);
    const graph = await createPartialGraph(store, [september]);
    const model = await loadPlanNextSteps(store, { civilDate: "2026-10-14" });
    assert.equal(model.level, "monthly");
    assert.equal(model.options[0].actionLabel, "Bu ayın omurgasını kaydet");
    const request = model.options[0].request;
    assert.ok(request);
    const result = await applyPlanNextStep(store, request, {
      now: new Date("2026-10-01T06:00:00.000Z"),
    });
    const snapshot = await store.readSnapshot();
    assert.equal(snapshot.plans.some((record) => record.id === graph.annual.id), true);
    assert.equal(snapshot.plans.filter((record) => record.planType === "annual").length, 1);
    assert.equal(result.createdPlanIds.includes(graph.annual.id), false);
    assert.equal((await loadPlanNextSteps(store, { civilDate: "2026-10-14" })).level, "daily");
  });

  await t.test("eksik hafta", async () => {
    const store = activeStore();
    const september = yearDrafts().find((month) => month.monthKey === "2026-09");
    assert.ok(september);
    const graph = await createPartialGraph(store, [{
      ...september,
      weeks: [september.weeks[0]],
    }]);
    const beforeIds = new Set(graph.months[0].weeks.map((week) => week.id));
    const model = await loadPlanNextSteps(store, { civilDate: "2026-09-17" });
    assert.equal(model.level, "weekly");
    assert.equal(model.options[0].actionLabel, "Bu haftanın omurgasını kaydet");
    const request = model.options[0].request;
    assert.ok(request);
    const result = await applyPlanNextStep(store, request, {
      now: new Date("2026-09-10T06:00:00.000Z"),
    });
    assert.equal(result.createdPlanIds.length, 1);
    const snapshot = await store.readSnapshot();
    const monthly = snapshot.plans.find((record) => record.id === graph.months[0].monthly.id);
    assert.equal(monthly.revisionNumber, 2);
    assert.equal(monthly.weeklySectionIds.every((id) => beforeIds.has(id) || id === result.createdPlanIds[0]), true);
    assert.equal((await loadPlanNextSteps(store, { civilDate: "2026-09-17" })).level, "daily");
  });
});

test("eski günlük seçim ve değişmiş etkin sınıf sıfır yazımla reddedilir", async (t) => {
  await t.test("hafta seçimden sonra değiştiğinde", async () => {
    const store = activeStore();
    const graph = await createPartialGraph(store, yearDrafts());
    const model = await loadPlanNextSteps(store, { civilDate: "2026-09-17" });
    const request = model.options[0].request;
    assert.ok(request);
    const weekly = graph.months.flatMap((group) => group.weeks).find(
      (week) => week.periodStart <= "2026-09-17" && week.periodEnd >= "2026-09-17",
    );
    assert.ok(weekly);
    await reviseTeacherOwnedPlan(store, {
      planId: weekly.id,
      expectedUpdatedAt: weekly.updatedAt,
      teacherContent: { narrative: "Kurgu öğretmen son revizyonu" },
      now: new Date("2026-09-16T06:00:00.000Z"),
    });
    const before = await store.readSnapshot();
    await assert.rejects(
      () => applyPlanNextStep(store, request, {
        now: new Date("2026-09-17T06:00:00.000Z"),
      }),
      /seçimden sonra değişti/,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  });

  await t.test("etkin sınıf seçimden sonra değiştiğinde", async () => {
    const store = activeStore({ withOtherClassroom: true });
    const model = await loadPlanNextSteps(store, { civilDate: "2026-09-17" });
    const request = model.options[0].request;
    assert.ok(request);
    await store.transaction("readwrite", ["settings"], async (transaction) => {
      const settings = await transaction.getAll("settings");
      const active = settings.find((record) => record.id === ACTIVE_CLASSROOM_SETTING_ID);
      await transaction.putMany("settings", [{
        ...active,
        classroomId: otherClassroomId,
        updatedAt: "2026-09-10T06:00:00.000Z",
      }]);
    });
    const before = await store.readSnapshot();
    await assert.rejects(
      () => applyPlanNextStep(store, request, {
        now: new Date("2026-09-10T06:01:00.000Z"),
      }),
      /Etkin sınıf seçimden sonra değişti/,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  });
});

test("özel eğitim yılında Ağustos için eksik hafta hazırlanır; varsayılan resmî omurga yaz aylarını eklemez", async () => {
  const start = "2026-08-01", end = "2027-06-25";
  assert.equal(buildNeutralTeacherYearOutline({ annualPeriodStart: start, annualPeriodEnd: end }).some(month => month.monthKey === "2026-08"), false);
  const store = activeStore();
  store.snapshot.academicYears[0].startDate = start;
  const months = buildTeacherFullYearMonthDrafts({ annualPeriodStart: start, annualPeriodEnd: end,
    months: buildNeutralTeacherYearOutline({ annualPeriodStart: start, annualPeriodEnd: end, includeSummerMonths: true }) });
  const august = { ...months[0], weeks: months[0].weeks.slice(0, 1) };
  await createTeacherOwnedPlanGraph(store, { title: "Özel dönem", periodStart: start, periodEnd: end,
    teacherContent: { narrative: "Öğretmenin özel çalışma dönemi" }, months: [august], now: new Date("2026-08-01T06:00:00Z") });
  const model = await loadPlanNextSteps(store, { civilDate: "2026-08-27" });
  assert.equal(model.status, "action-required");
  assert.equal(model.level, "weekly");
  const request = model.options[0].request;
  assert.equal(request.kind, "append-plan-week");
  assert.equal(request.week.periodStart, "2026-08-24");
  assert.equal(request.week.periodEnd, "2026-08-30");
  await applyPlanNextStep(store, request, { now: new Date("2026-08-27T06:00:00Z") });
  const snapshot = await store.readSnapshot();
  assert.equal(snapshot.plans.filter(plan => plan.planType === "weekly" && plan.periodStart === "2026-08-24").length, 1);
  const outside = await loadPlanNextSteps(store, { civilDate: "2026-07-31" });
  assert.equal(outside.status, "blocked");
});
