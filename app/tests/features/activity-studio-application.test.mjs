import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  ACTIVITY_STUDIO_APPLICATION_ACTIVITY_KIND,
  ACTIVITY_STUDIO_APPLICATION_PLAN_TYPE,
  ensureActivityStudioApplication,
} from "../../src/features/activity-studio/activity-studio-application.ts";

class MemoryStore {
  snapshot;

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
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000004001";
const classroomId = "00000000-0000-4000-8000-000000004002";
const existingPlanId = "00000000-0000-4000-8000-000000004003";
const existingActivityId = "00000000-0000-4000-8000-000000004004";
const base = {
  createdAt: "2026-09-08T06:00:00.000Z",
  updatedAt: "2026-09-08T06:00:00.000Z",
  civilDate: "2026-09-08",
  deletedAt: null,
  schemaVersion: 1,
};
const curriculumProfile = {
  framework: "tymm",
  programLabel: "Türkiye Yüzyılı Maarif Modeli",
  catalogId: "meb-tymm-okul-oncesi-2024-partial",
  sourceVersion: "2024",
  referenceOrigin: "official-catalog",
  officialCatalogVerified: true,
};

function activeStore() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026-2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId: yearId,
    name: "Kurgu Sınıf",
    curriculumProfileSnapshot: curriculumProfile,
    schemaVersion: 2,
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  snapshot.plans.push({
    ...base,
    id: existingPlanId,
    planType: "daily",
    title: "Mevcut günlük plan A",
    academicYearId: yearId,
    classroomId,
    curriculumProfileSnapshot: curriculumProfile,
  });
  snapshot.activities.push({
    ...base,
    id: existingActivityId,
    planId: existingPlanId,
    title: "Plandaki etkinlik A",
    startTime: "09:00",
    status: "in_progress",
    academicYearId: yearId,
    classroomId,
    curriculumProfileSnapshot: curriculumProfile,
  });
  return new MemoryStore(snapshot);
}

const studioActivity = {
  id: "cizim-resimden-hikaye",
  title: "Resimden Hikâye",
  contentOrigin: "MaarifOS-original",
  tymmDomains: ["Sanat", "Türkçe"],
};

test("stüdyo uygulaması başka canlı plan etkinliğini kullanmadan kendi kimliğini oluşturur", async () => {
  const store = activeStore();
  const result = await ensureActivityStudioApplication(store, {
    activity: studioActivity,
    civilDate: "2026-09-08",
    ageBand: "48-60",
    scenarioId: "balanced",
    participationRouteId: "multiple",
    now: new Date("2026-09-08T07:10:00.000Z"),
  });

  assert.equal(result.created, true);
  assert.notEqual(result.activity.id, existingActivityId);
  assert.notEqual(result.plan.id, existingPlanId);
  assert.equal(result.plan.planType, ACTIVITY_STUDIO_APPLICATION_PLAN_TYPE);
  assert.equal(
    result.activity.activityKind,
    ACTIVITY_STUDIO_APPLICATION_ACTIVITY_KIND,
  );
  assert.equal(result.activity.sourceActivityId, studioActivity.id);
  assert.equal(result.activity.planId, result.plan.id);
  assert.equal(result.identity.activityId, result.activity.id);
  assert.equal(result.identity.sourceActivityId, studioActivity.id);
  assert.equal(result.plan.observationDomainHint, "Sanat");
  assert.equal(result.activity.observationDomainHint, "Sanat");
  assert.deepEqual(result.plan.curriculumTargets, []);
  assert.deepEqual(result.activity.curriculumTargets, []);
  assert.equal(store.snapshot.activities[0].id, existingActivityId);
  assert.equal(store.snapshot.activities[0].status, "in_progress");
});

test("aynı gün ve uygulama bağlamında yeniden deneme idempotenttir", async () => {
  const store = activeStore();
  const input = {
    activity: studioActivity,
    civilDate: "2026-09-08",
    ageBand: "48-60",
    scenarioId: "balanced",
    participationRouteId: "multiple",
    now: new Date("2026-09-08T07:10:00.000Z"),
  };
  const first = await ensureActivityStudioApplication(store, input);
  const second = await ensureActivityStudioApplication(store, {
    ...input,
    now: new Date("2026-09-08T07:20:00.000Z"),
  });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.deepEqual(second.identity, first.identity);
  assert.equal(store.snapshot.plans.length, 2);
  assert.equal(store.snapshot.activities.length, 2);
});

test("eski uygulama kaydı aynı kimliklerde alan ipucuyla tamamlanır; gözlem ve hedeflere dokunulmaz", async () => {
  const store = activeStore();
  const input = {
    activity: studioActivity,
    civilDate: "2026-09-08",
    ageBand: "48-60",
    scenarioId: "balanced",
    participationRouteId: "multiple",
    now: new Date("2026-09-08T07:10:00.000Z"),
  };
  const first = await ensureActivityStudioApplication(store, input);
  const applicationPlan = store.snapshot.plans.find(
    (record) => record.id === first.plan.id,
  );
  const applicationActivity = store.snapshot.activities.find(
    (record) => record.id === first.activity.id,
  );
  delete applicationPlan.observationDomainHint;
  delete applicationActivity.observationDomainHint;
  const targetMarker = {
    id: "official-target-marker",
    referenceCode: "KORUNAN.1",
    referenceTitle: "Değişmemesi gereken hedef",
  };
  applicationPlan.curriculumTargets = [structuredClone(targetMarker)];
  applicationActivity.curriculumTargets = [structuredClone(targetMarker)];
  store.snapshot.observations.push({
    ...base,
    id: "00000000-0000-4000-8000-000000004009",
    planId: first.plan.id,
    activityId: first.activity.id,
    studentIds: ["00000000-0000-4000-8000-000000004010"],
    rawText: "Korunacak kurgu gözlem.",
    observedAt: "2026-09-08T07:15:00.000Z",
    academicYearId: yearId,
    classroomId,
  });
  const observationsBefore = structuredClone(store.snapshot.observations);

  const backfilled = await ensureActivityStudioApplication(store, {
    ...input,
    now: new Date("2026-09-08T07:20:00.000Z"),
  });

  assert.equal(backfilled.created, false);
  assert.deepEqual(backfilled.identity, first.identity);
  assert.equal(store.snapshot.plans.length, 2);
  assert.equal(store.snapshot.activities.length, 2);
  assert.equal(backfilled.plan.observationDomainHint, "Sanat");
  assert.equal(backfilled.activity.observationDomainHint, "Sanat");
  assert.deepEqual(backfilled.plan.curriculumTargets, [targetMarker]);
  assert.deepEqual(backfilled.activity.curriculumTargets, [targetMarker]);
  assert.deepEqual(store.snapshot.observations, observationsBefore);

  const afterBackfill = structuredClone(store.snapshot);
  const repeated = await ensureActivityStudioApplication(store, {
    ...input,
    now: new Date("2026-09-08T07:30:00.000Z"),
  });
  assert.equal(repeated.created, false);
  assert.deepEqual(store.snapshot, afterBackfill);
});

test("ilk TYMM alanı geçersizse kayıt açılmaz; mevcut alan snapshot'ı sessizce değiştirilmez", async () => {
  const store = activeStore();
  const countsBefore = {
    plans: store.snapshot.plans.length,
    activities: store.snapshot.activities.length,
  };
  await assert.rejects(
    ensureActivityStudioApplication(store, {
      activity: { ...studioActivity, tymmDomains: ["Geçersiz alan", "Sanat"] },
      civilDate: "2026-09-08",
      ageBand: "48-60",
      scenarioId: "balanced",
      participationRouteId: "multiple",
    }),
    /ilk TYMM öğrenme alanı geçersiz/u,
  );
  assert.deepEqual(
    {
      plans: store.snapshot.plans.length,
      activities: store.snapshot.activities.length,
    },
    countsBefore,
  );

  const created = await ensureActivityStudioApplication(store, {
    activity: studioActivity,
    civilDate: "2026-09-08",
    ageBand: "48-60",
    scenarioId: "balanced",
    participationRouteId: "multiple",
  });
  const snapshotBeforeMismatch = structuredClone(store.snapshot);
  await assert.rejects(
    ensureActivityStudioApplication(store, {
      activity: { ...studioActivity, tymmDomains: ["Fen"] },
      civilDate: "2026-09-08",
      ageBand: "48-60",
      scenarioId: "balanced",
      participationRouteId: "multiple",
    }),
    /gözlem alanı kaynağıyla uyuşmuyor/u,
  );
  assert.equal(created.activity.observationDomainHint, "Sanat");
  assert.deepEqual(store.snapshot, snapshotBeforeMismatch);
});
