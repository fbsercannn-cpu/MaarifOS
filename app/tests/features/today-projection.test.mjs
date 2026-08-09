import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  loadTodayWorkspace,
  resolveTodayWorkspace,
} from "../../src/features/today/today-data.ts";

const academicYearId = "00000000-0000-4000-8000-000000000a01";
const classroomId = "00000000-0000-4000-8000-000000000a02";
const plannedActivityId = "00000000-0000-4000-8000-000000000a03";
const spontaneousActivityId = "00000000-0000-4000-8000-000000000a04";
const plannedPlanId = "00000000-0000-4000-8000-000000000a05";
const spontaneousPlanId = "00000000-0000-4000-8000-000000000a06";

class MemoryStore {
  #snapshot;

  constructor(snapshot) {
    this.#snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.#snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
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
        this.#snapshot[collection] = working[collection];
      }
    }
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.#snapshot);
  }
}

const baseRecord = {
  createdAt: "2026-09-02T06:00:00.000Z",
  updatedAt: "2026-09-02T06:00:00.000Z",
  civilDate: "2026-09-02",
  deletedAt: null,
  schemaVersion: 2,
};

function configuredSnapshot() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...baseRecord,
    id: academicYearId,
    name: "2026-2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push({
    ...baseRecord,
    id: classroomId,
    academicYearId,
    name: "Kurgu Güneş Sınıfı",
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
      timeZone: "Europe/Istanbul",
    },
  });
  snapshot.settings.push({
    ...baseRecord,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId,
    classroomId,
  });
  return snapshot;
}

test("anlık gözlem bağlamını Günün planı ve odak etkinliği projeksiyonuna taşımaz", () => {
  const snapshot = configuredSnapshot();
  snapshot.plans.push({
    ...baseRecord,
    id: spontaneousPlanId,
    academicYearId,
    classroomId,
    planType: "spontaneous-observation",
    title: "Anlık gözlemler",
    status: "active",
    curriculumTargets: [],
    maarifRefs: [],
  });
  snapshot.activities.push(
    {
      ...baseRecord,
      id: plannedActivityId,
      planId: plannedPlanId,
      academicYearId,
      classroomId,
      title: "Bahçedeki gölgeleri araştırıyoruz",
      startTime: "09:30",
      status: "in_progress",
      activityKind: "planned-learning",
    },
    {
      ...baseRecord,
      id: spontaneousActivityId,
      planId: spontaneousPlanId,
      academicYearId,
      classroomId,
      title: "Anlık gözlemler",
      startTime: "09:00",
      status: "planned",
      activityKind: "spontaneous-observation",
      curriculumTargets: [],
      maarifRefs: [],
    },
  );
  snapshot.observations.push({
    ...baseRecord,
    id: "00000000-0000-4000-8000-000000000a07",
    academicYearId,
    classroomId,
    planId: spontaneousPlanId,
    activityId: spontaneousActivityId,
    rawText: "Kurgu çocuk oyunda nesneleri renklerine göre kendiliğinden ayırdı.",
    rawTextImmutable: true,
    observedAt: "2026-09-02T06:05:00.000Z",
    studentIds: ["00000000-0000-4000-8000-000000000a08"],
  });

  const workspace = resolveTodayWorkspace(
    snapshot,
    new Date("2026-09-02T07:00:00.000Z"),
  );

  assert.deepEqual(
    workspace.planItems.map((item) => item.id),
    [plannedActivityId],
  );
  assert.equal(workspace.currentActivity?.id, plannedActivityId);
  assert.equal(workspace.planItems.some((item) => item.id === spontaneousActivityId), false);
  assert.equal(workspace.datedEvidenceCount, 1);
  assert.equal(workspace.pendingEvidenceLinks, 1);
});

test("yalnız anlık gözlem bağlamı varsa odak etkinliği üretmez", () => {
  const snapshot = configuredSnapshot();
  snapshot.plans.push({
    ...baseRecord,
    id: spontaneousPlanId,
    academicYearId,
    classroomId,
    planType: "spontaneous-observation",
    title: "Anlık gözlemler",
    status: "active",
    curriculumTargets: [],
    maarifRefs: [],
  });
  snapshot.activities.push({
    ...baseRecord,
    id: spontaneousActivityId,
    planId: spontaneousPlanId,
    academicYearId,
    classroomId,
    title: "Anlık gözlemler",
    startTime: "10:15",
    status: "in_progress",
    activityKind: "spontaneous-observation",
    curriculumTargets: [],
    maarifRefs: [],
  });

  const workspace = resolveTodayWorkspace(
    snapshot,
    new Date("2026-09-02T07:30:00.000Z"),
  );

  assert.deepEqual(workspace.planItems, []);
  assert.equal(workspace.currentActivity, null);
});

test("normal plana bağlı sahte anlık etkinliği Günün planından gizlemez", () => {
  const snapshot = configuredSnapshot();
  snapshot.plans.push({
    ...baseRecord,
    id: spontaneousPlanId,
    academicYearId,
    classroomId,
    planType: "daily",
    title: "Normal günlük plan",
    curriculumTargets: [],
    maarifRefs: [],
  });
  snapshot.activities.push({
    ...baseRecord,
    id: spontaneousActivityId,
    planId: spontaneousPlanId,
    academicYearId,
    classroomId,
    title: "İşareti değiştirilmiş gerçek etkinlik",
    startTime: "10:15",
    status: "in_progress",
    activityKind: "spontaneous-observation",
    curriculumTargets: [],
    maarifRefs: [],
  });

  const workspace = resolveTodayWorkspace(
    snapshot,
    new Date("2026-09-02T07:30:00.000Z"),
  );

  assert.deepEqual(workspace.planItems.map((item) => item.id), [spontaneousActivityId]);
  assert.equal(workspace.currentActivity?.id, spontaneousActivityId);
});

test("anlık plan türü işareti eksik bağlamı inceleme için normal etkinlik olarak gösterir", () => {
  const snapshot = configuredSnapshot();
  snapshot.plans.push({
    ...baseRecord,
    id: spontaneousPlanId,
    academicYearId,
    classroomId,
    title: "Anlık gözlemler",
    curriculumTargets: [],
    maarifRefs: [],
  });
  snapshot.activities.push({
    ...baseRecord,
    id: spontaneousActivityId,
    planId: spontaneousPlanId,
    academicYearId,
    classroomId,
    title: "Anlık gözlemler",
    startTime: "10:15",
    status: "planned",
    activityKind: "spontaneous-observation",
    curriculumTargets: [],
    maarifRefs: [],
  });

  const workspace = resolveTodayWorkspace(
    snapshot,
    new Date("2026-09-02T07:30:00.000Z"),
  );

  assert.deepEqual(workspace.planItems.map((item) => item.id), [spontaneousActivityId]);
});

test("gelecek tarihli premium günlük planın 10 bloğunu tek etkinliği çoğaltmadan reload sonrasında korur", async () => {
  const snapshot = configuredSnapshot();
  const civilDate = "2026-09-15";
  const planId = "00000000-0000-4000-8000-000000000a10";
  const activityId = "00000000-0000-4000-8000-000000000a11";
  const mainTemplateId = "premium-main-template";
  const alternativeTemplateId = "premium-alternative-template";
  const blockSeeds = [
    ["arrival-wellbeing", "Karşılama ve iyi oluş"],
    ["learning-centers", "Serbest seçim ve öğrenme merkezleri"],
    ["morning-meeting", "Güne başlama"],
    ["first-main", "Ana etkinlik 1"],
    ["nutrition-selfcare", "Beslenme, öz bakım ve geçiş"],
    ["outdoor-movement", "Açık hava ve hareket"],
    ["second-main", "Ana etkinlik 2"],
    ["rest-regulation", "Dinlenme ve sakinleşme"],
    ["small-group", "Küçük grup veya bireysel destek"],
    ["reflection-departure", "Gün sonu yansıtma ve aileye geçiş"],
  ];
  const blocks = blockSeeds.map(([id, title], index) => ({
    id,
    title,
    purpose: `${index + 1}. kurgu akış amacını görünür kılmak.`,
    flexibilityNote: "Sınıfın ritmine göre öğretmen tarafından esnetilebilir.",
    status: index === 6 ? "optional" : index === 9 ? "skipped" : "planned",
    durationMinutes: index === 0 ? 25 : 30,
    transitionNote: index === 0 ? "Sakin geçiş." : "",
    teacherNote: index === 0 ? "Karşılama gözlemi." : "",
    selectedActivityTemplateIds: id === "first-main" ? [mainTemplateId] : [],
    alternativeActivityTemplateIds:
      id === "small-group" ? [alternativeTemplateId] : [],
    appliedActivityTemplateIds: id === "first-main" ? [mainTemplateId] : [],
  }));

  snapshot.plans.push({
    ...baseRecord,
    id: planId,
    academicYearId,
    classroomId,
    civilDate,
    planType: "daily",
    title: "Kurgu premium tam gün planı",
    appliedActivityTemplateId: mainTemplateId,
    premiumDailyFlowSnapshot: {
      planCivilDate: civilDate,
      selectedActivityTemplateId: mainTemplateId,
      alternativeActivityTemplateId: alternativeTemplateId,
      blocks,
    },
  });
  snapshot.activities.push({
    ...baseRecord,
    id: activityId,
    academicYearId,
    classroomId,
    civilDate,
    planId,
    title: "Kurgu arkadaşlık hikâyesi",
    startTime: "09:30",
    endTime: "10:10",
    status: "planned",
    appliedActivityTemplateId: mainTemplateId,
  });

  const store = new MemoryStore(snapshot);
  const previousDay = await loadTodayWorkspace(store, {
    now: new Date("2026-09-14T08:00:00.000Z"),
  });
  assert.deepEqual(previousDay.planItems, []);

  const firstLoad = await loadTodayWorkspace(store, {
    now: new Date("2026-09-15T08:00:00.000Z"),
  });
  assert.equal(firstLoad.planItems.length, 10);
  assert.deepEqual(
    firstLoad.planItems.map((item) => item.flowBlockId),
    blockSeeds.map(([id]) => id),
  );
  assert.equal(new Set(firstLoad.planItems.map((item) => item.id)).size, 10);
  assert.deepEqual(
    firstLoad.planItems
      .filter((item) => item.activityId)
      .map((item) => item.activityId),
    [activityId],
  );
  const appliedBlock = firstLoad.planItems.find(
    (item) => item.flowBlockId === "first-main",
  );
  assert.equal(appliedBlock?.id, activityId);
  assert.equal(appliedBlock?.activityTitle, "Kurgu arkadaşlık hikâyesi");
  assert.equal(appliedBlock?.startTime, "09:30");
  assert.equal(appliedBlock?.canCaptureEvidence, true);
  assert.equal(
    firstLoad.planItems.find((item) => item.flowBlockId === "second-main")
      ?.flowBlockStatus,
    "optional",
  );
  assert.equal(
    firstLoad.planItems.find(
      (item) => item.flowBlockId === "reflection-departure",
    )?.flowBlockStatus,
    "skipped",
  );

  const reloadedStore = new MemoryStore(await store.readSnapshot());
  const afterReload = await loadTodayWorkspace(reloadedStore, {
    now: new Date("2026-09-15T08:05:00.000Z"),
  });
  assert.deepEqual(afterReload.planItems, firstLoad.planItems);
  const persisted = await reloadedStore.readSnapshot();
  assert.equal(persisted.plans.length, 1);
  assert.equal(persisted.activities.length, 1);
  assert.equal(persisted.plans[0].premiumDailyFlowSnapshot.blocks.length, 10);
});
