import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson } from "../../src/core/backup/canonical-json.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import { getActivityStudioItem } from "../../src/features/activity-studio/activity-studio-model.ts";
import { createPlanWithActivity } from "../../src/features/evidence/evidence-flow.ts";
import { createPedagogicalPlanBridge } from "../../src/features/pedagogical-os/pedagogical-plan-bridge.ts";
import {
  dutyDefaultConfig,
  previewDutyRequest,
} from "../../src/features/class-duty-schedule/class-duty-model.ts";
import { loadDayExitPackageModel } from "../../src/features/day-exit-package/day-exit-package-model.ts";
import { homeGameSource } from "../../src/features/home-game-cards/home-game-card-model.ts";
import { saveHomeGameCards } from "../../src/features/home-game-cards/home-game-card-service.ts";
import {
  appendTeacherFollowup,
  combinePreparationItems,
} from "../../src/features/teacher-followup/teacher-followup-service.ts";
import {
  loadTomorrowReadyModel,
} from "../../src/features/tomorrow-ready/tomorrow-ready-model.ts";
import {
  DevelopmentReportMemoryStore,
  makeDevelopmentReportFixture,
} from "../fixtures/development-report-fixture.mjs";

const sourceCivilDate = "2026-09-08";
const nextTeachingDate = "2026-09-09";
const baseNow = new Date("2026-09-08T08:00:00.000Z");

function stateOf(model, id) {
  return model.items.find((entry) => entry.id === id)?.state;
}

async function makeTomorrowFixture() {
  const store = new DevelopmentReportMemoryStore();
  const fixture = await makeDevelopmentReportFixture(store);
  const snapshot = await store.readSnapshot();
  const classroom = snapshot.classrooms.find((record) => record.id === fixture.input.classroomId);
  const profile = classroom?.curriculumProfileSnapshot;
  const target = profile ? curriculumTargetsForProfile(profile, "60-72")[0] : null;
  const source = getActivityStudioItem("oyun-minik-mahalle-pazari");
  if (!classroom || !profile || !target || !source) throw new Error("Kurgu sonraki gün plan kaynağı kurulamadı.");
  const plan = await createPlanWithActivity(store, {
    civilDate: nextTeachingDate,
    planTitle: "Kurgu sonraki öğretim günü planı",
    activityTitle: "Kurgu mahalle pazarı",
    startTime: "09:30",
    curriculumProfile: profile,
    curriculumTargets: [target],
    assignmentMode: "whole-class",
    studentIds: [fixture.input.studentId, fixture.otherStudentId],
    pedagogicalProvenance: createPedagogicalPlanBridge({
      activity: source,
      civilDate: nextTeachingDate,
      ageBand: "60-72",
      scenarioId: "small-group",
      participationRouteId: "multiple",
      now: new Date("2026-09-08T07:10:00.000Z"),
    }),
    initialActivityStatus: "planned",
    now: new Date("2026-09-08T07:10:00.000Z"),
  });
  return { store, fixture, plan };
}

test("sonraki öğretim günü kartı yalnız gerçek plan kaynaklarından beş hazırlık durumunu çıkarır", async () => {
  const { store, plan } = await makeTomorrowFixture();
  const before = await store.readSnapshot();
  const model = await loadTomorrowReadyModel(store, { civilDate: sourceCivilDate, now: baseNow });
  assert.equal(model.nextTeachingDate, nextTeachingDate);
  assert.deepEqual(model.planIds, [plan.plan.id]);
  assert.deepEqual(model.activityIds, [plan.activity.id]);
  assert.deepEqual(model.items.map((entry) => [entry.id, entry.state]), [
    ["plan", "ready"],
    ["materials", "needs-action"],
    ["small-group", "needs-action"],
    ["fruit", "needs-action"],
    ["family-card", "needs-action"],
  ]);
  assert.equal(model.pendingPreparationSourceIds.length, 2);
  assert.equal(model.readyCount, 1);
  assert.equal(model.actionableCount, 4);
  assert.equal(canonicalJson(await store.readSnapshot()), canonicalJson(before), "model okuması kayıt üretmemeli");
});

test("aynı zaman damgalı gerçek kaynak değişikliği hazırlık parmak izini değiştirir", async () => {
  const { store, plan } = await makeTomorrowFixture();
  const model = await loadTomorrowReadyModel(store, { civilDate: sourceCivilDate, now: baseNow });
  await store.transaction("readwrite", ["activities"], async (transaction) => {
    const records = await transaction.getAll("activities");
    await transaction.putMany("activities", records
      .filter((record) => record.id === plan.activity.id)
      .map((record) => ({ ...record, title: "Aynı zaman damgalı değiştirilmiş etkinlik" })));
  });
  const refreshed = await loadTomorrowReadyModel(store, { civilDate: sourceCivilDate, now: baseNow });
  assert.notEqual(refreshed.preparationSourceFingerprint, model.preparationSourceFingerprint);
  assert.notEqual(refreshed.sourceFingerprint, model.sourceFingerprint);
  assert.match(refreshed.items.find((entry) => entry.id === "plan")?.detail ?? "", /Kurgu sonraki/u);
});

test("materyal, küçük grup, meyve görevi ve aile kartı kendi gerçek kayıtları tamamlanınca aynı kartta hazır görünür", async () => {
  const { store, fixture, plan } = await makeTomorrowFixture();
  const students = [fixture.input.studentId, fixture.otherStudentId];
  const initial = await loadDayExitPackageModel(store, { civilDate: sourceCivilDate, now: baseNow });
  const availableSources = initial.nextDay?.sources.filter((source) => source.available) ?? [];
  await appendTeacherFollowup(store, {
    studentId: null,
    civilDate: sourceCivilDate,
    now: new Date("2026-09-08T08:00:30.000Z"),
    workflow: {
      kind: "preparation-list",
      weekStart: nextTeachingDate,
      weekEnd: nextTeachingDate,
      sources: availableSources.map((source) => ({
        collection: source.collection,
        id: source.id,
        title: source.title,
        updatedAt: source.updatedAt,
      })),
      items: combinePreparationItems(availableSources.map((source) => ({
        source: {
          collection: source.collection,
          id: source.id,
          title: source.title,
          updatedAt: source.updatedAt,
        },
        materials: [...source.materials],
        preparation: [...source.preparation],
        missingMaterials: source.materials.length === 0,
      })), nextTeachingDate),
    },
  });

  const storedPlan = store.snapshot.plans.find((record) => record.id === plan.plan.id);
  const storedActivity = store.snapshot.activities.find((record) => record.id === plan.activity.id);
  assert.ok(storedPlan && storedActivity);
  storedPlan.assignmentMode = "selected-students";
  storedPlan.studentIds = [...students];
  storedActivity.assignmentMode = "selected-students";
  storedActivity.studentIds = [...students];

  const cardSourceSnapshot = await store.readSnapshot();
  await saveHomeGameCards(store, {
    studentIds: students,
    activityId: plan.activity.id,
    materials: "Kurgu resimli kartlar ve kâğıt.",
    steps: "Resimleri birlikte inceleyin ve çocuğun sıralamasını dinleyin.",
    expectedFingerprints: Object.fromEntries(students.map((studentId) => [
      studentId,
      homeGameSource(cardSourceSnapshot, {
        academicYearId: fixture.input.academicYearId,
        classroomId: fixture.input.classroomId,
      }, studentId, plan.activity.id).fingerprint,
    ])),
    now: new Date("2026-09-08T08:02:00.000Z"),
  });

  const dutySnapshot = await store.readSnapshot();
  const dutyRequest = {
    kind: "create",
    operationId: crypto.randomUUID(),
    scheduleId: crypto.randomUUID(),
    config: {
      ...dutyDefaultConfig(dutySnapshot, "fruit", "2026-09"),
      startOn: nextTeachingDate,
      endOn: nextTeachingDate,
      weekdays: [3],
      studentIds: students,
      capacity: 1,
    },
  };
  const dutyPreview = previewDutyRequest(dutySnapshot, dutyRequest, new Date("2026-09-08T08:03:00.000Z"));
  const dutyCreatedAt = "2026-09-08T08:03:00.000Z";
  store.snapshot.settings.push({
    id: crypto.randomUUID(),
    createdAt: dutyCreatedAt,
    updatedAt: dutyCreatedAt,
    civilDate: sourceCivilDate,
    deletedAt: null,
    schemaVersion: 1,
    settingType: "class-duty-schedule-v1",
    academicYearId: fixture.input.academicYearId,
    classroomId: fixture.input.classroomId,
    studentId: null,
    workflow: {
      kind: "schedule-revision",
      scheduleId: dutyRequest.scheduleId,
      operationId: dutyRequest.operationId,
      operationHash: "0".repeat(64),
      revision: dutyPreview.revision,
      previousRevisionId: null,
      effectiveOn: dutyPreview.effectiveOn,
      config: dutyPreview.config,
      rows: dutyPreview.rows,
    },
  });

  const model = await loadTomorrowReadyModel(store, { civilDate: sourceCivilDate, now: baseNow });
  assert.equal(stateOf(model, "materials"), "ready");
  assert.equal(stateOf(model, "small-group"), "ready");
  assert.equal(stateOf(model, "fruit"), "ready");
  assert.equal(stateOf(model, "family-card"), "ready");
  assert.equal(model.smallGroupPlanId, plan.plan.id);
  assert.equal(model.fruitScheduleId, dutyRequest.scheduleId);
  assert.match(model.items.find((entry) => entry.id === "family-card")?.detail ?? "", /2 çocuk-etkinlik/u);
});
