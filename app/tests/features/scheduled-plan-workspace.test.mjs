import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { canonicalJson } from "../../src/core/backup/canonical-json.ts";
import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import { TYMM_2024_CATALOG_METADATA } from "../../src/features/curriculum/tymm-2024-catalog.ts";
import {
  CURRICULUM_PROGRAM_LABELS,
  createPlanWithActivity,
  updateScheduledPlanWithActivity,
} from "../../src/features/evidence/evidence-flow.ts";
import { parsePremiumContentPack } from "../../src/features/premium-plans/content-repository.ts";
import { createPremiumDailyFlowDraft } from "../../src/features/premium-plans/domain.ts";
import {
  installPremiumPlanBoard,
  preparePremiumDailyTemplate,
} from "../../src/features/premium-plans/plan-service.ts";
import {
  loadScheduledPlanEditDraft,
  loadScheduledPlanWorkspace,
  resolveScheduledPlanWorkspace,
} from "../../src/features/planning/scheduled-plan-workspace.ts";
import {
  loadPlanDayWorkspace,
  loadTodayWorkspace,
} from "../../src/features/today/today-data.ts";

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
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000000801";
const classroomId = "00000000-0000-4000-8000-000000000802";
const studentId = "00000000-0000-4000-8000-000000000803";
const planId = "00000000-0000-4000-8000-000000000804";
const activityId = "00000000-0000-4000-8000-000000000805";
const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};
const profile = {
  framework: "tymm",
  programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
  catalogId: TYMM_2024_CATALOG_METADATA.catalogId,
  sourceVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
  referenceOrigin: "official-catalog",
  officialCatalogVerified: true,
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
    name: "Kurgu Pilot Sınıf",
    ageGroup: "60–72 ay",
    curriculumProfileSnapshot: profile,
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  snapshot.students.push({
    ...base,
    id: studentId,
    displayName: "Kurgu Çocuk",
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

async function premiumPack() {
  const raw = JSON.parse(
    await readFile(
      new URL(
        "../../../premium-content/releases/tymm-6072/2026-09/content.v2.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  return parsePremiumContentPack(raw);
}

async function createFutureDailyPlan(store) {
  const pack = await premiumPack();
  const installed = await installPremiumPlanBoard(store, {
    pack,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T05:00:00.000Z"),
  });
  const source = pack.activities.find(
    (activity) =>
      activity.activityRole === "main" && activity.recommendedCivilDate === "2026-09-08",
  );
  assert.ok(source);
  const beforeSelection = canonicalJson(await store.readSnapshot());
  const selection = preparePremiumDailyTemplate(pack, source.id, {
    annualPlanId: installed.annualPlanId,
    monthlyPlanId: installed.monthlyPlanId,
    weeklyPlanIds: installed.weeklyPlanIds,
    teacherPreferredLensId: "guided-play",
    teacherPreferredSupportingLensIds: [],
  });
  assert.equal(canonicalJson(await store.readSnapshot()), beforeSelection);
  const targetCodes = new Set(selection.targetCodes);
  const curriculumTargets = curriculumTargetsForProfile(profile, "60-72")
    .filter((target) => targetCodes.has(target.referenceCode));
  const flow = createPremiumDailyFlowDraft(selection.fullDayFlow);
  flow[0] = {
    ...flow[0],
    durationMinutes: 25,
    transitionNote: "Kurgu sakin geçişi.",
    teacherNote: "Kurgu öğretmen notu.",
  };
  const result = await createPlanWithActivity(store, {
    civilDate: "2026-09-08",
    planId,
    activityId,
    planTitle: selection.planTitle,
    activityTitle: selection.activityTitle,
    startTime: "09:00",
    endTime: "09:40",
    curriculumProfile: profile,
    curriculumTargets,
    assignmentMode: "whole-class",
    studentIds: [studentId],
    premiumSource: selection,
    premiumDailyFlowBlocks: flow,
    now: new Date("2026-09-07T05:10:00.000Z"),
  });
  return { pack, installed, selection, result };
}

test("gelecek premium plan bir plan + bir gerçek etkinlik olarak keşfedilir; Today'e sızmaz", async () => {
  const store = activeStore();
  await createFutureDailyPlan(store);
  const snapshot = await store.readSnapshot();
  assert.equal(snapshot.plans.filter((plan) => plan.planType === "daily").length, 1);
  assert.equal(snapshot.activities.length, 1);
  assert.equal(snapshot.calendarEntries.length, 0);

  const today = await loadTodayWorkspace(store, {
    now: new Date("2026-09-07T08:00:00.000Z"),
  });
  assert.equal(today.planItems.length, 0);

  const plannedDay = await loadPlanDayWorkspace(store, {
    civilDate: "2026-09-08",
    now: new Date("2026-09-07T08:00:00.000Z"),
  });
  assert.equal(plannedDay.planItems.length, 10);
  assert.deepEqual(
    plannedDay.planItems.filter((item) => item.activityId).map((item) => item.activityId),
    [activityId],
  );
  assert.equal(
    plannedDay.planItems.filter((item) => !item.activityId)
      .every((item) => item.canCaptureEvidence === false),
    true,
  );

  const calendarIndex = await loadScheduledPlanWorkspace(store, {
    now: new Date("2026-09-07T08:00:00.000Z"),
  });
  assert.equal(calendarIndex.plans.length, 1);
  assert.equal(calendarIndex.plans[0].flowBlockCount, 10);
  assert.equal(calendarIndex.plans[0].persistedActivityCount, 1);
  assert.equal(calendarIndex.plans[0].editable, true);

  store.snapshot.settings.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000808",
    settingType: "premium-entitlement-cache",
    status: "expired",
    expiresAt: "2026-09-06T21:00:00.000Z",
  });
  const expiredAccessRead = await loadScheduledPlanWorkspace(store, {
    now: new Date("2026-09-07T08:00:00.000Z"),
  });
  assert.equal(expiredAccessRead.plans[0].planId, planId);
  assert.equal(expiredAccessRead.plans[0].flowBlockCount, 10);

  const reloaded = new MemoryStore(await store.readSnapshot());
  assert.deepEqual(
    await loadPlanDayWorkspace(reloaded, { civilDate: "2026-09-08" }),
    plannedDay,
  );
  assert.deepEqual(
    await loadScheduledPlanWorkspace(reloaded, {
      now: new Date("2026-09-07T08:00:00.000Z"),
    }),
    calendarIndex,
  );
});

test("gelecek plan düzenlemesi kimlik/provenance korur ve tarihi üç yerde atomik değiştirir", async () => {
  const store = activeStore();
  await createFutureDailyPlan(store);
  const before = await store.readSnapshot();
  const originalPlan = before.plans.find((plan) => plan.id === planId);
  const originalActivity = before.activities.find((activity) => activity.id === activityId);
  assert.ok(originalPlan && originalActivity);
  const provenanceKeys = [
    "sourceAnnualPlanId",
    "sourceMonthlyPlanId",
    "sourceWeeklyPlanId",
    "sourceContentPackSnapshot",
    "sourceActivityTemplateId",
    "sourceActivityTemplateSnapshot",
    "appliedActivityTemplateId",
    "appliedActivityTemplateSnapshot",
  ];
  const originalProvenance = canonicalJson(
    Object.fromEntries(provenanceKeys.map((key) => [key, originalPlan[key]])),
  );
  const draft = await loadScheduledPlanEditDraft(store, {
    planId,
    now: new Date("2026-09-07T08:00:00.000Z"),
  });
  draft.flowBlocks[0] = {
    ...draft.flowBlocks[0],
    durationMinutes: 35,
    teacherNote: "Kurgu düzenlenmiş öğretmen notu.",
  };
  const updated = await updateScheduledPlanWithActivity(store, {
    ...draft,
    civilDate: "2026-09-09",
    planTitle: "Kurgu düzenlenmiş günlük plan",
    activityTitle: "Kurgu düzenlenmiş etkinlik",
    startTime: "09:15",
    endTime: "10:00",
    premiumDailyFlowBlocks: draft.flowBlocks,
    now: new Date("2026-09-07T08:10:00.000Z"),
  });
  assert.equal(updated.plan.id, planId);
  assert.equal(updated.activity.id, activityId);
  assert.equal(updated.plan.createdAt, originalPlan.createdAt);
  assert.equal(updated.activity.createdAt, originalActivity.createdAt);
  assert.equal(updated.plan.civilDate, "2026-09-09");
  assert.equal(updated.activity.civilDate, "2026-09-09");
  assert.equal(updated.plan.premiumDailyFlowSnapshot.planCivilDate, "2026-09-09");
  assert.equal(updated.plan.premiumDailyFlowSnapshot.blocks[0].durationMinutes, 35);
  assert.equal(
    canonicalJson(Object.fromEntries(provenanceKeys.map((key) => [key, updated.plan[key]]))),
    originalProvenance,
  );
  for (const key of provenanceKeys) {
    assert.equal(canonicalJson(updated.activity[key]), canonicalJson(updated.plan[key]));
  }
  const after = await store.readSnapshot();
  assert.equal(after.plans.filter((plan) => plan.planType === "daily").length, 1);
  assert.equal(after.activities.length, 1);
  assert.equal(after.calendarEntries.length, 0);
});

test("hafta dışı, stale, gözlemli, başlamış ve başka sınıf düzenlemeleri sıfır yazımla reddedilir", async () => {
  const makeCommand = async (store) => {
    const draft = await loadScheduledPlanEditDraft(store, {
      planId,
      now: new Date("2026-09-07T08:00:00.000Z"),
    });
    return {
      ...draft,
      premiumDailyFlowBlocks: draft.flowBlocks,
      now: new Date("2026-09-07T08:10:00.000Z"),
    };
  };

  {
    const store = activeStore();
    await createFutureDailyPlan(store);
    const command = await makeCommand(store);
    const before = canonicalJson(await store.readSnapshot());
    await assert.rejects(
      updateScheduledPlanWithActivity(store, { ...command, civilDate: "2026-09-14" }),
      /kaynak haftanın dışına/,
    );
    assert.equal(canonicalJson(await store.readSnapshot()), before);
    await assert.rejects(
      updateScheduledPlanWithActivity(store, { ...command, civilDate: "2027-07-01" }),
      /eğitim yılının tarih aralığında/,
    );
    assert.equal(canonicalJson(await store.readSnapshot()), before);
  }

  {
    const store = activeStore();
    await createFutureDailyPlan(store);
    const command = await makeCommand(store);
    const before = canonicalJson(await store.readSnapshot());
    await assert.rejects(
      updateScheduledPlanWithActivity(store, {
        ...command,
        now: new Date("2026-09-07T05:00:00.000Z"),
      }),
      /son değişiklik zamanından eski/,
    );
    assert.equal(canonicalJson(await store.readSnapshot()), before);
  }

  {
    const store = activeStore();
    await createFutureDailyPlan(store);
    const command = await makeCommand(store);
    store.snapshot.activities.find((record) => record.id === activityId).civilDate =
      "2026-09-09";
    const before = canonicalJson(await store.readSnapshot());
    const index = resolveScheduledPlanWorkspace(await store.readSnapshot(), {
      now: new Date("2026-09-07T08:00:00.000Z"),
    });
    assert.equal(index.plans[0].integrityStatus, "invalid");
    await assert.rejects(
      updateScheduledPlanWithActivity(store, command),
      /kayıtlı tarihleri uyuşmuyor/,
    );
    assert.equal(canonicalJson(await store.readSnapshot()), before);
  }

  {
    const store = activeStore();
    await createFutureDailyPlan(store);
    const command = await makeCommand(store);
    const plan = store.snapshot.plans.find((record) => record.id === planId);
    plan.updatedAt = "2026-09-07T08:05:00.000Z";
    const before = canonicalJson(await store.readSnapshot());
    await assert.rejects(updateScheduledPlanWithActivity(store, command), /başka bir ekranda/);
    assert.equal(canonicalJson(await store.readSnapshot()), before);
  }

  {
    const store = activeStore();
    await createFutureDailyPlan(store);
    const command = await makeCommand(store);
    store.snapshot.observations.push({
      ...base,
      id: "00000000-0000-4000-8000-000000000806",
      planId,
      activityId,
      rawText: "Kurgu nesnel gözlem.",
      rawTextImmutable: true,
      academicYearId: yearId,
      classroomId,
      civilDate: "2026-09-08",
    });
    const before = canonicalJson(await store.readSnapshot());
    await assert.rejects(updateScheduledPlanWithActivity(store, command), /Gözlem kanıtı/);
    assert.equal(canonicalJson(await store.readSnapshot()), before);
  }

  for (const status of ["in_progress", "completed"]) {
    const store = activeStore();
    await createFutureDailyPlan(store);
    const command = await makeCommand(store);
    store.snapshot.activities.find((record) => record.id === activityId).status = status;
    const before = canonicalJson(await store.readSnapshot());
    await assert.rejects(updateScheduledPlanWithActivity(store, command), /henüz başlamamış/);
    assert.equal(canonicalJson(await store.readSnapshot()), before);
  }

  {
    const store = activeStore();
    await createFutureDailyPlan(store);
    const command = await makeCommand(store);
    const otherClassroomId = "00000000-0000-4000-8000-000000000807";
    store.snapshot.classrooms.push({
      ...base,
      id: otherClassroomId,
      academicYearId: yearId,
      name: "Başka Kurgu Sınıf",
      ageGroup: "60–72 ay",
      curriculumProfileSnapshot: profile,
    });
    const active = store.snapshot.settings.find(
      (record) => record.id === ACTIVE_CLASSROOM_SETTING_ID,
    );
    active.classroomId = otherClassroomId;
    const before = canonicalJson(await store.readSnapshot());
    await assert.rejects(updateScheduledPlanWithActivity(store, command), /etkin sınıfta bulunamadı/);
    assert.equal(canonicalJson(await store.readSnapshot()), before);
  }
});

test("bozulmuş premium kaynak snapshot'ı takvim indeksinde bütünlük hatasına düşer", async () => {
  const store = activeStore();
  await createFutureDailyPlan(store);
  const plan = store.snapshot.plans.find((record) => record.id === planId);
  plan.sourceActivityTemplateSnapshot.title = "Sahte kaynak başlığı";
  const workspace = resolveScheduledPlanWorkspace(await store.readSnapshot(), {
    now: new Date("2026-09-07T08:00:00.000Z"),
  });
  assert.equal(workspace.plans.length, 1);
  assert.equal(workspace.plans[0].integrityStatus, "invalid");
  assert.equal(workspace.plans[0].editable, false);
  assert.match(workspace.plans[0].editBlockReason, /kaynak görüntüsü/);
});

test("standart günlük planda plan/activity tarih ayrışması da fail-closed kalır", async () => {
  const store = activeStore();
  store.snapshot.plans.push({
    ...base,
    id: planId,
    planType: "daily",
    title: "Kurgu standart gelecek plan",
    status: "active",
    coverageStatus: "planned",
    academicYearId: yearId,
    classroomId,
    civilDate: "2026-09-08",
    updatedAt: "2026-09-07T05:00:00.000Z",
  });
  store.snapshot.activities.push({
    ...base,
    id: activityId,
    planId,
    title: "Kurgu standart etkinlik",
    status: "planned",
    coverageStatus: "planned",
    startTime: "09:00",
    academicYearId: yearId,
    classroomId,
    civilDate: "2026-09-09",
    updatedAt: "2026-09-07T05:00:00.000Z",
  });
  const workspace = resolveScheduledPlanWorkspace(await store.readSnapshot(), {
    now: new Date("2026-09-07T08:00:00.000Z"),
  });
  assert.equal(workspace.plans[0].integrityStatus, "invalid");
  assert.match(workspace.plans[0].editBlockReason, /tarihleri uyuşmuyor/);
  const before = canonicalJson(await store.readSnapshot());
  await assert.rejects(
    updateScheduledPlanWithActivity(store, {
      planId,
      activityId,
      expectedPlanUpdatedAt: "2026-09-07T05:00:00.000Z",
      expectedActivityUpdatedAt: "2026-09-07T05:00:00.000Z",
      civilDate: "2026-09-09",
      planTitle: "Kurgu standart gelecek plan",
      activityTitle: "Kurgu standart etkinlik",
      startTime: "09:00",
      now: new Date("2026-09-07T08:00:00.000Z"),
    }),
    /tarihleri uyuşmuyor/,
  );
  assert.equal(canonicalJson(await store.readSnapshot()), before);
});
