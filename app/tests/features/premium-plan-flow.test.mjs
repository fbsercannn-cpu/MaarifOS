import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { canonicalJson } from "../../src/core/backup/canonical-json.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import { TYMM_2024_CATALOG_METADATA } from "../../src/features/curriculum/tymm-2024-catalog.ts";
import {
  CURRICULUM_PROGRAM_LABELS,
  captureImmutableRawObservation,
  confirmObservationCurriculumLink,
  createPlanWithActivity,
} from "../../src/features/evidence/evidence-flow.ts";
import { parsePremiumContentPack } from "../../src/features/premium-plans/content-repository.ts";
import { createPremiumDailyFlowDraft } from "../../src/features/premium-plans/domain.ts";
import { loadTodayWorkspace } from "../../src/features/today/today-data.ts";
import {
  installPremiumPlanBoard,
  loadInstalledPremiumPlan,
  loadLegacyInstalledPremiumPlans,
  loadPremiumMonthlyReviewContext,
  loadPremiumWeeklyCarryForwardContexts,
  preparePremiumDailyTemplate,
  recordPremiumMonthlyEvaluation,
  recordPremiumWeeklyEvaluation,
  updatePremiumPlanLensPreferences,
  PREMIUM_MONTHLY_PROGRAM_CRITERIA,
  PREMIUM_MONTHLY_TEACHER_CRITERIA,
} from "../../src/features/premium-plans/plan-service.ts";

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
      clear: async (collection) => { working[collection] = []; },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      for (const collection of collections) this.snapshot[collection] = working[collection];
    }
    return result;
  }
  async readSnapshot() { return structuredClone(this.snapshot); }
  close() {}
}

const yearId = "00000000-0000-4000-8000-000000000701";
const classroomId = "00000000-0000-4000-8000-000000000702";
const studentId = "00000000-0000-4000-8000-000000000703";
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
    name: "Pilot Sınıf",
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
    displayName: "Pilot Çocuk",
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

async function pack() {
  const raw = JSON.parse(await readFile(
    new URL("../../../premium-content/releases/tymm-6072/2026-09/content.v2.json", import.meta.url),
    "utf8",
  ));
  return parsePremiumContentPack(raw);
}

async function valuesPack() {
  const raw = JSON.parse(await readFile(
    new URL("../../../premium-content/releases/tymm-6072/2026-09/content.v3.json", import.meta.url),
    "utf8",
  ));
  return parsePremiumContentPack(raw);
}

test("annual → monthly → weekly → daily zinciri kapsamı ve premium provenance'ı korur", async () => {
  const store = activeStore();
  const content = await pack();
  const first = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T07:00:00.000Z"),
  });
  assert.equal(first.created, true);
  assert.equal(first.weeklyPlanIds.length, 4);

  const second = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T07:05:00.000Z"),
  });
  assert.deepEqual(second, { ...first, created: false });

  const activity = content.activities[0];
  const selection = preparePremiumDailyTemplate(content, activity.id, {
    annualPlanId: first.annualPlanId,
    monthlyPlanId: first.monthlyPlanId,
    weeklyPlanIds: first.weeklyPlanIds,
    teacherPreferredLensId: "guided-play",
    teacherPreferredSupportingLensIds: [],
  });
  const availableTargets = curriculumTargetsForProfile(profile, "60-72");
  const targetCodes = new Set(selection.targetCodes);
  const curriculumTargets = availableTargets.filter((target) => targetCodes.has(target.referenceCode));
  assert.equal(curriculumTargets.length, selection.targetCodes.length);
  const teacherFlow = createPremiumDailyFlowDraft(selection.fullDayFlow);
  teacherFlow[0] = {
    ...teacherFlow[0],
    durationMinutes: 25,
    transitionNote: "Sınıfın ritmine göre sakin geçiş.",
    teacherNote: "Karşılama gözlemleri için not alanı.",
  };

  const daily = await createPlanWithActivity(store, {
    civilDate: "2026-09-08",
    planId: "00000000-0000-4000-8000-000000000704",
    activityId: "00000000-0000-4000-8000-000000000705",
    planTitle: selection.planTitle,
    activityTitle: selection.activityTitle,
    startTime: "09:00",
    endTime: "09:40",
    curriculumProfile: profile,
    curriculumTargets,
    assignmentMode: "whole-class",
    studentIds: [studentId],
    premiumSource: selection,
    premiumDailyFlowBlocks: teacherFlow,
    now: new Date("2026-09-08T06:00:00.000Z"),
  });

  assert.equal(daily.plan.sourceAnnualPlanId, first.annualPlanId);
  assert.equal(daily.plan.sourceMonthlyPlanId, first.monthlyPlanId);
  assert.equal(
    daily.plan.sourceWeeklyPlanId,
    first.weeklyPlanIds.find((entry) => entry.weekId === activity.weekId).planId,
  );
  assert.equal(daily.plan.sourceActivityTemplateId, activity.id);
  assert.deepEqual(daily.plan.sourceActivityTemplateSnapshot, activity);
  assert.equal(daily.plan.teacherPreferredLensId, "guided-play");
  assert.deepEqual(daily.plan.teacherPreferredSupportingLensIds, []);
  assert.equal(daily.plan.lensSelectionMode, "preference_only");
  assert.equal(daily.plan.primaryLensId, undefined);
  assert.equal(daily.plan.supportingLensIds, undefined);
  assert.equal(daily.activity.teacherPreferredLensId, "guided-play");
  assert.equal(daily.activity.lensSelectionMode, "preference_only");
  assert.equal(
    daily.plan.sourceActivityTemplateSnapshot.primaryLensId,
    activity.primaryLensId,
  );
  assert.equal(daily.plan.premiumDailyFlowSnapshot.blocks.length, 10);
  assert.equal(daily.plan.premiumDailyFlowSnapshot.blocks[0].durationMinutes, 25);
  assert.equal(
    daily.plan.premiumDailyFlowSnapshot.blocks[0].transitionNote,
    "Sınıfın ritmine göre sakin geçiş.",
  );
  assert.equal(
    daily.plan.premiumDailyFlowSnapshot.blocks.flatMap(
      (block) => block.selectedActivityTemplateIds,
    ).length,
    1,
  );
  assert.equal(
    daily.plan.premiumDailyFlowSnapshot.blocks.flatMap(
      (block) => block.alternativeActivityTemplateIds,
    ).length,
    1,
  );
  assert.equal(daily.activity.sourceContentPackSnapshot.id, content.id);
  assert.deepEqual(daily.activity.sourceActivityTemplateSnapshot, activity);

  const projectedDay = await loadTodayWorkspace(store, {
    now: new Date("2026-09-08T08:00:00.000Z"),
  });
  assert.equal(projectedDay.planItems.length, 10);
  assert.deepEqual(
    projectedDay.planItems.map((item) => item.flowBlockId),
    selection.fullDayFlow.map((block) => block.id),
  );
  assert.deepEqual(
    projectedDay.planItems
      .filter((item) => item.activityId)
      .map((item) => item.activityId),
    [daily.activity.id],
  );
  const reloadedStore = new MemoryStore(await store.readSnapshot());
  const projectedAfterReload = await loadTodayWorkspace(reloadedStore, {
    now: new Date("2026-09-08T08:05:00.000Z"),
  });
  assert.deepEqual(projectedAfterReload.planItems, projectedDay.planItems);

  const alternative = content.activities.find(
    (candidate) => candidate.id === selection.alternativeActivitySnapshot.id,
  );
  assert.ok(alternative);
  const alternativeCodes = new Set(alternative.curriculumTargetCodes);
  const alternativeCurriculumTargets = availableTargets.filter(
    (target) => alternativeCodes.has(target.referenceCode),
  );
  const alternativeDaily = await createPlanWithActivity(store, {
    civilDate: "2026-09-09",
    planId: "00000000-0000-4000-8000-000000000706",
    activityId: "00000000-0000-4000-8000-000000000707",
    planTitle: `${alternative.title} planı`,
    activityTitle: alternative.title,
    startTime: "09:00",
    endTime: "09:40",
    curriculumProfile: profile,
    curriculumTargets: alternativeCurriculumTargets,
    assignmentMode: "whole-class",
    studentIds: [studentId],
    premiumSource: selection,
    premiumAlternativeActivated: true,
    now: new Date("2026-09-09T06:00:00.000Z"),
  });
  assert.equal(alternativeDaily.plan.sourceActivityTemplateId, activity.id);
  assert.equal(alternativeDaily.plan.appliedActivityTemplateId, alternative.id);
  assert.deepEqual(alternativeDaily.activity.appliedActivityTemplateSnapshot, alternative);
  assert.deepEqual(
    [...alternativeDaily.activity.maarifRefs].sort(),
    [...alternative.curriculumTargetCodes].sort(),
  );
  assert.deepEqual(alternativeDaily.plan.premiumDailyFlowSnapshot.alternativeReplacement, {
    activatedAlternativeTemplateId: alternative.id,
    replacesMainActivityTemplateId: activity.id,
    teacherConfirmed: true,
  });
  assert.deepEqual(
    alternativeDaily.plan.premiumDailyFlowSnapshot.blocks.flatMap(
      (block) => block.appliedActivityTemplateIds,
    ),
    [alternative.id],
  );

  const snapshot = await store.readSnapshot();
  assert.equal(snapshot.plans.filter((record) => record.planType === "annual").length, 1);
  assert.equal(snapshot.plans.filter((record) => record.planType === "monthly").length, 1);
  assert.equal(snapshot.plans.filter((record) => record.planType === "weekly").length, 4);
  assert.equal(snapshot.plans.filter((record) => record.planType === "daily").length, 2);

  await assert.rejects(
    async () => {
      const alternative = content.activities.find(
        (candidate) => candidate.activityRole === "alternative",
      );
      preparePremiumDailyTemplate(content, alternative.id, {
        annualPlanId: first.annualPlanId,
        monthlyPlanId: first.monthlyPlanId,
        weeklyPlanIds: first.weeklyPlanIds,
        teacherPreferredLensId: "guided-play",
        teacherPreferredSupportingLensIds: [],
      });
    },
    /Alternatif etkinlik doğrudan uygulanmış etkinlik olarak seçilemez/,
  );

  await assert.rejects(
    createPlanWithActivity(store, {
      civilDate: "2026-09-29",
      planId: "00000000-0000-4000-8000-000000000714",
      activityId: "00000000-0000-4000-8000-000000000715",
      planTitle: selection.planTitle,
      activityTitle: selection.activityTitle,
      startTime: "09:00",
      endTime: "09:40",
      curriculumProfile: profile,
      curriculumTargets,
      assignmentMode: "whole-class",
      studentIds: [studentId],
      premiumSource: selection,
    }),
    /Premium etkinlik yalnız aynı sınıfa kurulmuş/,
  );
});

test("premium günlük seçim forged üst snapshot ve sahte alternatifleri sıfır yazımla reddeder", async () => {
  const store = activeStore();
  const content = await pack();
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T07:00:00.000Z"),
  });
  const main = content.activities.find(
    (activity) => activity.activityRole === "main",
  );
  assert.ok(main);
  const selection = preparePremiumDailyTemplate(content, main.id, {
    annualPlanId: installed.annualPlanId,
    monthlyPlanId: installed.monthlyPlanId,
    weeklyPlanIds: installed.weeklyPlanIds,
    teacherPreferredLensId: "guided-play",
    teacherPreferredSupportingLensIds: [],
  });
  const secondMain = content.activities.find(
    (activity) =>
      activity.weekId === main.weekId &&
      activity.activityRole === "main" &&
      activity.id !== main.id,
  );
  assert.ok(secondMain);
  const targetCodes = new Set(main.curriculumTargetCodes);
  const curriculumTargets = curriculumTargetsForProfile(profile, "60-72")
    .filter((target) => targetCodes.has(target.referenceCode));

  const forgeries = [
    {
      label: "contentPack",
      mutate(candidate) {
        candidate.contentPack.displayName = "Sahte premium paket";
      },
    },
    {
      label: "fullDayFlow",
      mutate(candidate) {
        candidate.fullDayFlow[0].title = "Sahte tam gün bloğu";
      },
    },
    {
      label: "weekSnapshot",
      mutate(candidate) {
        candidate.weekSnapshot.purpose = "Sahte hafta amacı";
      },
    },
    {
      label: "main snapshot",
      mutate(candidate) {
        candidate.activitySnapshot.title = "Sahte ana etkinlik";
      },
    },
    {
      label: "ikinci ana etkinlik sahte alternatif",
      mutate(candidate) {
        candidate.alternativeActivitySnapshot = structuredClone(secondMain);
      },
    },
    {
      label: "forged öğretmen lens tercihi",
      mutate(candidate) {
        candidate.teacherPreferredLensId = "prepared-environment";
      },
    },
    {
      label: "forged destekleyici lens tercihi",
      mutate(candidate) {
        candidate.teacherPreferredSupportingLensIds = [
          "accessible-participation",
        ];
      },
    },
    {
      label: "geçersiz lens seçim modu",
      mutate(candidate) {
        candidate.lensSelectionMode = "authored_override";
      },
    },
    {
      label: "seçimde çift kaynaklı lens alanları",
      mutate(candidate) {
        candidate.primaryLensId = candidate.teacherPreferredLensId;
        candidate.supportingLensIds = [
          ...candidate.teacherPreferredSupportingLensIds,
        ];
      },
    },
  ];

  for (const forgery of forgeries) {
    const forgedSelection = structuredClone(selection);
    forgery.mutate(forgedSelection);
    const before = canonicalJson(await store.readSnapshot());
    await assert.rejects(
      createPlanWithActivity(store, {
        civilDate: "2026-09-08",
        planId: "00000000-0000-4000-8000-000000000744",
        activityId: "00000000-0000-4000-8000-000000000745",
        planTitle: forgedSelection.planTitle,
        activityTitle: forgedSelection.activityTitle,
        startTime: "09:00",
        endTime: "09:40",
        curriculumProfile: profile,
        curriculumTargets,
        assignmentMode: "whole-class",
        studentIds: [studentId],
        premiumSource: forgedSelection,
        premiumAlternativeActivated: true,
      }),
      /kaynak zincirinden/,
      forgery.label,
    );
    assert.equal(
      canonicalJson(await store.readSnapshot()),
      before,
      `${forgery.label} reddi store üzerinde yazım yapmamalı`,
    );
  }

  const storedPreferenceCorruptions = [
    {
      label: "yıllık planda eşleşmeyen lens tercihi",
      planId: installed.annualPlanId,
      mutate(record) {
        record.teacherPreferredLensId = "prepared-environment";
      },
    },
    {
      label: "aylık planda çift kaynaklı lens alanları",
      planId: installed.monthlyPlanId,
      mutate(record) {
        record.primaryLensId = record.teacherPreferredLensId;
        record.supportingLensIds = [
          ...record.teacherPreferredSupportingLensIds,
        ];
      },
    },
    {
      label: "haftalık planda kısmi legacy lens alanları",
      planId: selection.weeklyPlanId,
      mutate(record) {
        record.primaryLensId = record.teacherPreferredLensId;
        delete record.teacherPreferredLensId;
        delete record.teacherPreferredSupportingLensIds;
        delete record.lensSelectionMode;
        delete record.supportingLensIds;
      },
    },
  ];

  for (const corruption of storedPreferenceCorruptions) {
    const planIndex = store.snapshot.plans.findIndex(
      (record) => record.id === corruption.planId,
    );
    assert.notEqual(planIndex, -1, corruption.label);
    const pristineRecord = structuredClone(store.snapshot.plans[planIndex]);
    corruption.mutate(store.snapshot.plans[planIndex]);
    const before = canonicalJson(await store.readSnapshot());
    await assert.rejects(
      createPlanWithActivity(store, {
        civilDate: "2026-09-08",
        planId: "00000000-0000-4000-8000-000000000744",
        activityId: "00000000-0000-4000-8000-000000000745",
        planTitle: selection.planTitle,
        activityTitle: selection.activityTitle,
        startTime: "09:00",
        endTime: "09:40",
        curriculumProfile: profile,
        curriculumTargets,
        assignmentMode: "whole-class",
        studentIds: [studentId],
        premiumSource: selection,
      }),
      /kaynak zincirinden/,
      corruption.label,
    );
    assert.equal(
      canonicalJson(await store.readSnapshot()),
      before,
      `${corruption.label} reddi store üzerinde yazım yapmamalı`,
    );
    store.snapshot.plans[planIndex] = pristineRecord;
  }

  const reverseKeys = (record) => Object.fromEntries(
    Object.entries(record).reverse(),
  );
  const reorderedSelection = {
    ...selection,
    contentPack: reverseKeys(selection.contentPack),
    activitySnapshot: reverseKeys(selection.activitySnapshot),
    alternativeActivitySnapshot: reverseKeys(selection.alternativeActivitySnapshot),
    weekSnapshot: reverseKeys(selection.weekSnapshot),
    fullDayFlow: selection.fullDayFlow.map(reverseKeys),
  };
  const daily = await createPlanWithActivity(store, {
    civilDate: "2026-09-08",
    planId: "00000000-0000-4000-8000-000000000746",
    activityId: "00000000-0000-4000-8000-000000000747",
    planTitle: reorderedSelection.planTitle,
    activityTitle: reorderedSelection.activityTitle,
    startTime: "09:00",
    endTime: "09:40",
    curriculumProfile: profile,
    curriculumTargets,
    assignmentMode: "whole-class",
    studentIds: [studentId],
    premiumSource: reorderedSelection,
  });
  assert.equal(daily.plan.sourceActivityTemplateId, main.id);
  assert.equal(
    daily.plan.sourceActivityTemplateSnapshot.primaryLensId,
    main.primaryLensId,
  );
});

test("v2 kurulu plan v3 güncel paket altında salt-okunur legacy özet olarak keşfedilir", async () => {
  const store = activeStore();
  const legacyContent = await pack();
  const currentContent = await valuesPack();
  const installedAt = "2026-09-07T07:00:00.000Z";
  const installed = await installPremiumPlanBoard(store, {
    pack: legacyContent,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date(installedAt),
  });

  const legacyPlans = await loadLegacyInstalledPremiumPlans(store, currentContent);

  assert.deepEqual(legacyPlans, [{
    annualPlanId: installed.annualPlanId,
    title: `${legacyContent.displayName} Yıllık Planlama Panosu`,
    contentPackId: legacyContent.id,
    contentVersion: legacyContent.version,
    installedAt,
    valuesMappingStatus: "legacy-unmapped",
    readOnly: true,
  }]);
});

test("v3 değer sözleşmesi alternatif etkinliğin uygulanan snapshot'ını taşır; lens, ham gözlem ve hata yolu eşlemeyi değiştirmez", async () => {
  const store = activeStore();
  const content = await valuesPack();
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T07:00:00.000Z"),
  });
  const main = content.activities.find((activity) => activity.activityRole === "main");
  const selection = preparePremiumDailyTemplate(content, main.id, {
    annualPlanId: installed.annualPlanId,
    monthlyPlanId: installed.monthlyPlanId,
    weeklyPlanIds: installed.weeklyPlanIds,
    teacherPreferredLensId: "guided-play",
    teacherPreferredSupportingLensIds: [],
  });
  const alternative = selection.alternativeActivitySnapshot;
  assert.ok(main.valuesDesign);
  assert.ok(alternative.valuesDesign);
  assert.notEqual(main.valuesDesign.id, alternative.valuesDesign.id);

  const beforeRejected = await store.readSnapshot();
  const tamperedSelection = structuredClone(selection);
  tamperedSelection.alternativeActivitySnapshot.valuesDesign.mapping
    .officialActionSnapshots[0].indicatorText = "Birlikte değiştirilmiş sahte metin.";
  const alternativeCodes = new Set(alternative.curriculumTargetCodes);
  const alternativeTargets = curriculumTargetsForProfile(profile, "60-72")
    .filter((target) => alternativeCodes.has(target.referenceCode));
  await assert.rejects(
    createPlanWithActivity(store, {
      civilDate: "2026-09-08",
      planId: "00000000-0000-4000-8000-000000000734",
      activityId: "00000000-0000-4000-8000-000000000735",
      planTitle: tamperedSelection.planTitle,
      activityTitle: alternative.title,
      startTime: "09:00",
      endTime: "09:40",
      curriculumProfile: profile,
      curriculumTargets: alternativeTargets,
      assignmentMode: "whole-class",
      studentIds: [studentId],
      premiumSource: tamperedSelection,
      premiumAlternativeActivated: true,
    }),
    /aynı sınıfa kurulmuş yıllık, aylık ve haftalık kaynak zincirinden/,
  );
  const afterRejected = await store.readSnapshot();
  assert.equal(afterRejected.plans.length, beforeRejected.plans.length);
  assert.equal(afterRejected.activities.length, beforeRejected.activities.length);

  const daily = await createPlanWithActivity(store, {
    civilDate: "2026-09-08",
    planId: "00000000-0000-4000-8000-000000000736",
    activityId: "00000000-0000-4000-8000-000000000737",
    planTitle: selection.planTitle,
    activityTitle: alternative.title,
    startTime: "09:00",
    endTime: "09:40",
    curriculumProfile: profile,
    curriculumTargets: alternativeTargets,
    assignmentMode: "whole-class",
    studentIds: [studentId],
    premiumSource: selection,
    premiumAlternativeActivated: true,
    now: new Date("2026-09-08T06:00:00.000Z"),
  });
  assert.deepEqual(
    daily.plan.sourceActivityTemplateSnapshot.valuesDesign,
    main.valuesDesign,
  );
  assert.deepEqual(
    daily.plan.appliedActivityTemplateSnapshot.valuesDesign,
    alternative.valuesDesign,
  );
  assert.equal(
    daily.plan.sourceContentPackSnapshot.valuesMappingStatus,
    "machine_validated_pending_human_review",
  );

  const beforeLens = await store.readSnapshot();
  const immutableBefore = canonicalJson({
    monthlyTemplates: beforeLens.plans.find((plan) => plan.id === installed.monthlyPlanId)
      ?.premiumActivityTemplates,
    weeklyTemplates: beforeLens.plans
      .filter((plan) => plan.annualPlanId === installed.annualPlanId && plan.planType === "weekly")
      .map((plan) => plan.premiumActivityTemplates),
    contracts: beforeLens.plans
      .filter((plan) => plan.id === installed.annualPlanId || plan.annualPlanId === installed.annualPlanId)
      .map((plan) => plan.contentPackSnapshot?.valuesContract),
    dailySource: daily.plan.sourceActivityTemplateSnapshot.valuesDesign,
    dailyApplied: daily.plan.appliedActivityTemplateSnapshot.valuesDesign,
  });
  await updatePremiumPlanLensPreferences(store, {
    pack: content,
    teacherPreferredLensId: "prepared-environment",
    teacherPreferredSupportingLensIds: ["accessible-participation"],
    now: new Date("2026-09-08T08:00:00.000Z"),
  });
  const afterLens = await store.readSnapshot();
  const storedDaily = afterLens.plans.find((plan) => plan.id === daily.plan.id);
  const storedActivity = afterLens.activities.find(
    (activityRecord) => activityRecord.id === daily.activity.id,
  );
  const immutableAfter = canonicalJson({
    monthlyTemplates: afterLens.plans.find((plan) => plan.id === installed.monthlyPlanId)
      ?.premiumActivityTemplates,
    weeklyTemplates: afterLens.plans
      .filter((plan) => plan.annualPlanId === installed.annualPlanId && plan.planType === "weekly")
      .map((plan) => plan.premiumActivityTemplates),
    contracts: afterLens.plans
      .filter((plan) => plan.id === installed.annualPlanId || plan.annualPlanId === installed.annualPlanId)
      .map((plan) => plan.contentPackSnapshot?.valuesContract),
    dailySource: storedDaily?.sourceActivityTemplateSnapshot?.valuesDesign,
    dailyApplied: storedDaily?.appliedActivityTemplateSnapshot?.valuesDesign,
  });
  assert.equal(immutableAfter, immutableBefore);
  assert.equal(
    storedDaily?.teacherPreferredLensId,
    "guided-play",
    "pano tercihi değişikliği tarihsel günlük plan tercihini yeniden yazmamalı",
  );
  assert.equal(
    storedActivity?.teacherPreferredLensId,
    "guided-play",
    "pano tercihi değişikliği tarihsel etkinlik tercihini yeniden yazmamalı",
  );
  assert.equal(afterLens.observations.length, 0);
  assert.equal(afterLens.evidenceCurriculumLinks.length, 0);
  assert.equal(afterLens.reportDrafts.length, 0);
  assert.ok(daily.activity.targetAssignments.every((assignment) => assignment.status === "planned"));
  assert.doesNotMatch(
    JSON.stringify({ plan: daily.plan, activity: daily.activity }),
    /valueScore|valueJudgment|badge|rank|mastered|achieved|learned/i,
  );

  await captureImmutableRawObservation(store, {
    observationId: "00000000-0000-4000-8000-000000000738",
    studentId,
    planId: daily.plan.id,
    activityId: daily.activity.id,
    rawText: "Çocuk alternatif katılım yolunu işaret ederek seçti.",
    observedAt: "2026-09-08T07:30:00.000Z",
    now: new Date("2026-09-08T07:31:00.000Z"),
  });
  const afterObservation = await store.readSnapshot();
  assert.equal(afterObservation.observations.length, 1);
  assert.equal(afterObservation.evidenceCurriculumLinks.length, 0);
  assert.equal(afterObservation.reportDrafts.length, 0);
  assert.doesNotMatch(
    JSON.stringify(afterObservation.observations[0]),
    /primaryValueCode|indicatorCode|valueScore|valueJudgment/i,
  );
});

test("öğretmen haftalık değerlendirmeyi silmeden biriktirir ve sonraki plan kararını kaydeder", async () => {
  const store = activeStore();
  const content = await pack();
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T07:00:00.000Z"),
  });
  const weeklyPlanId = installed.weeklyPlanIds[0].planId;
  const activityTemplate = content.activities.find(
    (activity) => activity.weekId === installed.weeklyPlanIds[0].weekId,
  );
  const selection = preparePremiumDailyTemplate(content, activityTemplate.id, {
    annualPlanId: installed.annualPlanId,
    monthlyPlanId: installed.monthlyPlanId,
    weeklyPlanIds: installed.weeklyPlanIds,
    teacherPreferredLensId: "guided-play",
    teacherPreferredSupportingLensIds: [],
  });
  const targetCodes = new Set(selection.targetCodes);
  const curriculumTargets = curriculumTargetsForProfile(profile, "60-72")
    .filter((target) => targetCodes.has(target.referenceCode));
  const daily = await createPlanWithActivity(store, {
    civilDate: "2026-09-08",
    planId: "00000000-0000-4000-8000-000000000724",
    activityId: "00000000-0000-4000-8000-000000000725",
    planTitle: selection.planTitle,
    activityTitle: selection.activityTitle,
    startTime: "09:00",
    endTime: "09:40",
    curriculumProfile: profile,
    curriculumTargets,
    assignmentMode: "whole-class",
    studentIds: [studentId],
    premiumSource: selection,
  });
  const captured = await captureImmutableRawObservation(store, {
    observationId: "00000000-0000-4000-8000-000000000726",
    studentId,
    planId: daily.plan.id,
    activityId: daily.activity.id,
    rawText: "Kurgu çocuk rota kartını iki farklı yolla yeniden çizdi.",
    observedAt: "2026-09-08T07:30:00.000Z",
    now: new Date("2026-09-08T07:31:00.000Z"),
  });
  await assert.rejects(
    recordPremiumWeeklyEvaluation(store, {
      weeklyPlanId,
      reflection: "Kanıt olmadan değerlendirme yapılmamalı.",
      evidenceSummary: "Kanıt seçilmedi.",
      observationIds: [],
      nextPlanDecision: "observe-more",
    }),
    /en az bir bağlı gözlem/,
  );
  await assert.rejects(
    recordPremiumWeeklyEvaluation(store, {
      weeklyPlanId: installed.weeklyPlanIds[1].planId,
      reflection: "Başka haftanın kanıtı kullanılmamalı.",
      evidenceSummary: "İlk haftaya ait gözlem seçildi.",
      observationIds: [captured.observation.id],
      nextPlanDecision: "observe-more",
    }),
    /yalnız bu haftanın premium günlük planlarına bağlı/,
  );
  const beforeFutureObservation = await store.readSnapshot();
  await assert.rejects(
    recordPremiumWeeklyEvaluation(store, {
      weeklyPlanId,
      reflection: "Katılım yollarının kullanımı yeniden incelendi.",
      evidenceSummary: "Tarihli tek bir olay kaydı seçildi; ek gözlem gerekli.",
      observationIds: [captured.observation.id],
      nextPlanDecision: "observe-more",
      now: new Date("2026-09-08T07:29:00.000Z"),
    }),
    /gözlemin gerçekleşme zamanından eski/,
  );
  assert.deepEqual(await store.readSnapshot(), beforeFutureObservation);
  for (const unsafe of [
    {
      reflection: "Değer kazanıldı.",
      evidenceSummary: "Ali saygı: 95; namaz kıldığı için iyi çocuktur.",
    },
    {
      reflection: "Karakteri mükemmeldir.",
      evidenceSummary: "Tesbih çektiği için sorumluluk değerini gösterdi.",
    },
    {
      reflection: "Ali namaz kıldı; kültürel bağlam olarak kaydedildi.",
      evidenceSummary: "Kişisel ibadet katılımı haftalık özete taşındı.",
    },
  ]) {
    const before = await store.readSnapshot();
    await assert.rejects(
      recordPremiumWeeklyEvaluation(store, {
        weeklyPlanId,
        ...unsafe,
        observationIds: [captured.observation.id],
        nextPlanDecision: "keep",
      }),
      /puan|karakter|inanç|ibadet|değer kanıtı/,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  }
  const beforeUnsafeCapture = await store.readSnapshot();
  await assert.rejects(
    captureImmutableRawObservation(store, {
      observationId: "00000000-0000-4000-8000-000000000727",
      studentId,
      planId: daily.plan.id,
      activityId: daily.activity.id,
      rawText: "Fâtiha okudu; hayırlı bir evlattır.",
      observedAt: "2026-09-08T07:32:00.000Z",
      now: new Date("2026-09-08T07:33:00.000Z"),
    }),
    /karakter|kişisel inanç|ibadet/,
  );
  assert.deepEqual(await store.readSnapshot(), beforeUnsafeCapture);

  // Eski yedek/bozulmuş depo senaryosunda downstream haftalık kapı da kalır.
  const unsafeWeeklyObservationId = "00000000-0000-4000-8000-000000000728";
  store.snapshot.observations.push({
    ...structuredClone(captured.observation),
    id: unsafeWeeklyObservationId,
    rawText: "Fâtiha okudu; hayırlı bir evlattır.",
  });
  const beforeUnsafeSource = await store.readSnapshot();
  await assert.rejects(
    recordPremiumWeeklyEvaluation(store, {
      weeklyPlanId,
      reflection: "Katılım koşulları yeniden incelendi.",
      evidenceSummary: "Bir olay örneği seçildi; ek gözlem gerekli.",
      observationIds: [unsafeWeeklyObservationId],
      nextPlanDecision: "observe-more",
      now: new Date("2026-09-08T08:00:00.000Z"),
    }),
    /ham gözlem|kişiliğini|inanç|ibadet|değer kanıtı/,
  );
  assert.deepEqual(await store.readSnapshot(), beforeUnsafeSource);
  const evaluation = await recordPremiumWeeklyEvaluation(store, {
    weeklyPlanId,
    reflection: "Çocuklar sessiz katılım seçeneğini kendiliğinden kullandı.",
    evidenceSummary: "İki çocuk rota kartını yeniden çizdi; ek gözlem gerekli.",
    observationIds: [captured.observation.id],
    nextPlanDecision: "observe-more",
    now: new Date("2026-09-11T13:00:00.000Z"),
  });
  assert.equal(evaluation.teacherAuthored, true);
  assert.equal(evaluation.nextPlanDecision, "observe-more");

  const beforeBackdatedEvaluation = await store.readSnapshot();
  await assert.rejects(
    recordPremiumWeeklyEvaluation(store, {
      weeklyPlanId,
      reflection: "Önceki değerlendirmeden daha eski bir kayıt deneniyor.",
      evidenceSummary: "Aynı kanıt yeniden incelendi; ek gözlem gerekli.",
      observationIds: [captured.observation.id],
      nextPlanDecision: "adapt",
      now: new Date("2026-09-11T12:59:00.000Z"),
    }),
    /son değişiklik zamanından eski/,
  );
  assert.deepEqual(await store.readSnapshot(), beforeBackdatedEvaluation);

  const secondEvaluation = await recordPremiumWeeklyEvaluation(store, {
    weeklyPlanId,
    reflection: "İkinci incelemede katılım yolları çeşitlendi.",
    evidenceSummary: "Öğretmen notu ve çocuk ürünü birlikte incelendi.",
    observationIds: [captured.observation.id],
    nextPlanDecision: "adapt",
    now: new Date("2026-09-11T14:00:00.000Z"),
  });
  const snapshot = await store.readSnapshot();
  const weekly = snapshot.plans.find((record) => record.id === weeklyPlanId);
  assert.equal(weekly.weeklyEvaluations.length, 2);
  assert.equal(weekly.nextPlanDecisionRequired, false);
  assert.equal(weekly.status, "evaluated");
  const nextWeekly = snapshot.plans.find(
    (record) => record.id === secondEvaluation.nextPlanTargetPlanId,
  );
  assert.equal(nextWeekly.previousWeekEvaluationId, secondEvaluation.id);
  assert.equal(nextWeekly.nextPlanDecisionContext.decision, "adapt");
  const carryForward = await loadPremiumWeeklyCarryForwardContexts(
    store,
    installed.monthlyPlanId,
  );
  assert.deepEqual(carryForward, [{
    targetWeeklyPlanId: nextWeekly.id,
    sourceWeeklyPlanId: weekly.id,
    sourceWeekTitle: weekly.title,
    sourcePeriodStart: weekly.periodStart,
    sourcePeriodEnd: weekly.periodEnd,
    evaluationId: secondEvaluation.id,
    decision: "adapt",
    evidenceSummary: secondEvaluation.evidenceSummary,
    teacherReflection: secondEvaluation.reflection,
    createdAt: secondEvaluation.createdAt,
    applicationStatus: "pending-teacher-review",
  }]);
});

test("MEB aylık değerlendirmesi üç boyutu, aktif sınıf kapsamını ve kaynak kimliklerini eklemeli olarak korur", async () => {
  const secondStudentId = "00000000-0000-4000-8000-000000000883";
  const teacherId = "00000000-0000-4000-8000-000000000882";
  const store = activeStore();
  store.snapshot.students.push({
    ...base,
    id: secondStudentId,
    displayName: "İkinci Pilot Çocuk",
    academicYearId: yearId,
    classroomId,
  });
  const content = await valuesPack();
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T07:00:00.000Z"),
  });

  const createDay = async ({ weekIndex, civilDate, planId, activityId }) => {
    const weekEntry = installed.weeklyPlanIds[weekIndex];
    const activityTemplate = content.activities.find(
      (activity) =>
        activity.weekId === weekEntry.weekId && activity.activityRole === "main",
    );
    const selection = preparePremiumDailyTemplate(content, activityTemplate.id, {
      annualPlanId: installed.annualPlanId,
      monthlyPlanId: installed.monthlyPlanId,
      weeklyPlanIds: installed.weeklyPlanIds,
      teacherPreferredLensId: "guided-play",
      teacherPreferredSupportingLensIds: [],
    });
    const targetCodes = new Set(selection.targetCodes);
    const targets = curriculumTargetsForProfile(profile, "60-72")
      .filter((target) => targetCodes.has(target.referenceCode));
    return createPlanWithActivity(store, {
      civilDate,
      planId,
      activityId,
      planTitle: selection.planTitle,
      activityTitle: selection.activityTitle,
      startTime: "09:00",
      endTime: "09:40",
      curriculumProfile: profile,
      curriculumTargets: targets,
      assignmentMode: "whole-class",
      studentIds: [studentId, secondStudentId],
      premiumSource: selection,
      now: new Date(`${civilDate}T06:00:00.000Z`),
    });
  };

  const firstDay = await createDay({
    weekIndex: 0,
    civilDate: "2026-09-08",
    planId: "00000000-0000-4000-8000-000000000884",
    activityId: "00000000-0000-4000-8000-000000000885",
  });
  const secondDay = await createDay({
    weekIndex: 1,
    civilDate: "2026-09-15",
    planId: "00000000-0000-4000-8000-000000000886",
    activityId: "00000000-0000-4000-8000-000000000887",
  });
  const observationInputs = [
    {
      id: "00000000-0000-4000-8000-000000000888",
      studentId,
      daily: firstDay,
      observedAt: "2026-09-08T07:30:00.000Z",
      rawText: "Pilot çocuk rota kartında iki başlangıç noktası işaretledi.",
    },
    {
      id: "00000000-0000-4000-8000-000000000889",
      studentId: secondStudentId,
      daily: firstDay,
      observedAt: "2026-09-08T07:32:00.000Z",
      rawText: "İkinci çocuk rota kartını akranına çevirerek seçimini anlattı.",
    },
    {
      id: "00000000-0000-4000-8000-000000000890",
      studentId,
      daily: secondDay,
      observedAt: "2026-09-15T07:30:00.000Z",
      rawText: "Pilot çocuk ikinci hafta farklı bir malzeme yolu seçti.",
    },
    {
      id: "00000000-0000-4000-8000-000000000891",
      studentId: secondStudentId,
      daily: secondDay,
      observedAt: "2026-09-15T07:32:00.000Z",
      rawText: "İkinci çocuk açık hava seçeneğini göstererek gerekçesini söyledi.",
    },
  ];
  const captured = [];
  const links = [];
  for (const [index, input] of observationInputs.entries()) {
    const result = await captureImmutableRawObservation(store, {
      observationId: input.id,
      studentId: input.studentId,
      planId: input.daily.plan.id,
      activityId: input.daily.activity.id,
      rawText: input.rawText,
      observedAt: input.observedAt,
      now: new Date(new Date(input.observedAt).getTime() + 60_000),
    });
    captured.push(result.observation);
    const target = input.daily.activity.curriculumTargets[0];
    const link = await confirmObservationCurriculumLink(store, {
      observationId: result.observation.id,
      framework: profile.framework,
      catalogId: profile.catalogId,
      sourceVersion: profile.sourceVersion,
      referenceOrigin: profile.referenceOrigin,
      officialCatalogVerified: profile.officialCatalogVerified,
      referenceCode: target.referenceCode,
      referenceTitle: target.referenceTitle,
      plannedTargetId: target.id,
      approvedByUserId: teacherId,
      now: new Date(new Date(input.observedAt).getTime() + 120_000 + index),
    });
    links.push(link);
  }
  store.snapshot.observations.find(
    (observation) => observation.id === captured[0].id,
  ).observationType = "anecdotal";

  const programCriteria = PREMIUM_MONTHLY_PROGRAM_CRITERIA.map(({ id }) => ({
    criterionId: id,
    status: id === "duration-fit" ? "needs-adjustment" : "observed-working",
  }));
  const teacherCriteria = PREMIUM_MONTHLY_TEACHER_CRITERIA.map(({ id }) => ({
    criterionId: id,
    status: id === "time-management" ? "needs-adjustment" : "observed-working",
  }));
  const narratives = {
    programCriteria,
    programNarrative:
      "Katılım yolları çeşitlendi; ikinci haftada süre ve geçiş düzeni uyarlama gerektirdi.",
    teacherCriteria,
    teacherNarrative:
      "Planlama ile uygulama arasındaki geçişleri ve açık hava seçeneğine erişimi yeniden düşündüm.",
    nextMonthRecommendation:
      "Sonraki ay farklı gün ve ortamlarda gözlem toplamayı ve geçiş süresini uyarlamayı sürdüreceğim.",
  };

  const forgedOutsideMonth = {
    ...structuredClone(captured[0]),
    id: "00000000-0000-4000-8000-000000000892",
    civilDate: "2026-10-01",
  };
  store.snapshot.observations.push(forgedOutsideMonth);
  await assert.rejects(
    recordPremiumMonthlyEvaluation(store, {
      monthlyPlanId: installed.monthlyPlanId,
      childEvidenceState: "insufficient-evidence",
      childNarrative: "Tarih dışındaki kayıt aylık kaynağa alınmamalıdır.",
      observationIds: [forgedOutsideMonth.id],
      curriculumLinkIds: [],
      ...narratives,
      now: new Date("2026-09-30T09:00:00.000Z"),
    }),
    /tarih ve kaynak zincirindeki değişmez gözlemleri/,
  );

  await assert.rejects(
    recordPremiumMonthlyEvaluation(store, {
      monthlyPlanId: installed.monthlyPlanId,
      childEvidenceState: "sufficient-evidence",
      childNarrative: "Tek olay kaydı bütün ayı temsil etmemelidir.",
      observationIds: [captured[0].id],
      curriculumLinkIds: [links[0].id],
      ...narratives,
      now: new Date("2026-09-30T10:00:00.000Z"),
    }),
    /en az iki gözlem/,
  );

  await assert.rejects(
    recordPremiumMonthlyEvaluation(store, {
      monthlyPlanId: installed.monthlyPlanId,
      childEvidenceState: "sufficient-evidence",
      childNarrative: "İki hafta seçildi ancak aktif sınıfın tamamı temsil edilmedi.",
      observationIds: [captured[0].id, captured[2].id],
      curriculumLinkIds: [links[0].id, links[2].id],
      ...narratives,
      now: new Date("2026-09-30T11:00:00.000Z"),
    }),
    /aktif sınıftaki her çocuğun/,
  );

  const insufficient = await recordPremiumMonthlyEvaluation(store, {
    monthlyPlanId: installed.monthlyPlanId,
    childEvidenceState: "insufficient-evidence",
    childNarrative:
      "İki haftalık kayıt yalnız bir çocuğu temsil ettiği için kesin beceri hükmü kurulmadı.",
    observationIds: [captured[0].id, captured[2].id],
    curriculumLinkIds: [links[0].id, links[2].id],
    ...narratives,
    now: new Date("2026-09-30T12:00:00.000Z"),
  });
  assert.equal(insufficient.children.evidenceState, "insufficient-evidence");
  assert.deepEqual(insufficient.children.coverage.uncoveredActiveStudentIds, [
    secondStudentId,
  ]);
  assert.equal(insufficient.program.narrative, narratives.programNarrative);
  assert.equal(insufficient.teacher.narrative, narratives.teacherNarrative);

  const complete = await recordPremiumMonthlyEvaluation(store, {
    monthlyPlanId: installed.monthlyPlanId,
    childEvidenceState: "sufficient-evidence",
    childNarrative:
      "Farklı gün ve haftalardaki seçili kayıtlar iki çocuğun katılım yollarındaki çeşitliliği görünür kıldı.",
    observationIds: captured.map((observation) => observation.id),
    curriculumLinkIds: links.map((link) => link.id),
    ...narratives,
    now: new Date("2026-09-30T13:00:00.000Z"),
  });
  assert.equal(complete.children.coverage.observationCount, 4);
  assert.equal(complete.children.coverage.anecdotalObservationCount, 1);
  assert.equal(complete.children.coverage.distinctCivilDateCount, 2);
  assert.equal(complete.children.coverage.distinctWeekCount, 2);
  assert.equal(complete.children.coverage.activeStudentCount, 2);
  assert.equal(complete.children.coverage.coveredActiveStudentCount, 2);
  assert.deepEqual(complete.children.coverage.uncoveredActiveStudentIds, []);
  assert.deepEqual(complete.children.observationIds, captured.map(({ id }) => id));
  assert.deepEqual(complete.children.curriculumLinkIds, links.map(({ id }) => id));
  assert.doesNotMatch(
    JSON.stringify(complete),
    /score|rating|skillConclusion|personalityJudgment|otomatik beceri hükmü/i,
  );

  const reloaded = await loadPremiumMonthlyReviewContext(
    new MemoryStore(await store.readSnapshot()),
    installed.monthlyPlanId,
  );
  assert.equal(reloaded.availableCoverage.observationCount, 4);
  assert.equal(reloaded.availableCoverage.anecdotalObservationCount, 1);
  assert.equal(reloaded.availableCoverage.activeStudentCount, 2);
  assert.deepEqual(
    reloaded.evaluations.map((evaluation) => evaluation.id),
    [insufficient.id, complete.id],
  );
  assert.equal(reloaded.evaluations[0].program.narrative, narratives.programNarrative);
  assert.equal(reloaded.evaluations[1].nextMonthRecommendation, narratives.nextMonthRecommendation);
});

test("öğretmen yaklaşım tercihini plan katmanlarına kaydeder; etkinlik snapshot'ını dönüştürmez", async () => {
  const store = activeStore();
  const content = await pack();
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T07:00:00.000Z"),
  });
  const before = await store.readSnapshot();
  const templatesBefore = new Map(
    before.plans
      .filter(
        (record) =>
          record.id === installed.annualPlanId ||
          record.annualPlanId === installed.annualPlanId,
      )
      .map((record) => [record.id, structuredClone(record.premiumActivityTemplates)]),
  );
  await updatePremiumPlanLensPreferences(store, {
    pack: content,
    teacherPreferredLensId: "prepared-environment",
    teacherPreferredSupportingLensIds: ["accessible-participation"],
    now: new Date("2026-09-07T08:00:00.000Z"),
  });
  const snapshot = await store.readSnapshot();
  const related = snapshot.plans.filter(
    (record) => record.id === installed.annualPlanId || record.annualPlanId === installed.annualPlanId,
  );
  assert.equal(related.length, 6);
  assert.ok(related.every((record) => record.teacherPreferredLensId === "prepared-environment"));
  assert.ok(related.every((record) => record.teacherPreferredSupportingLensIds[0] === "accessible-participation"));
  assert.ok(related.every((record) => record.lensSelectionMode === "preference_only"));
  assert.ok(related.every((record) => record.primaryLensId === undefined));
  assert.ok(related.every((record) => record.supportingLensIds === undefined));
  assert.ok(
    related.every((record) =>
      JSON.stringify(record.premiumActivityTemplates) ===
      JSON.stringify(templatesBefore.get(record.id)),
    ),
  );
});

test("legacy lens alanı tek kaynak olarak okunur ve ilk tercih güncellemesinde yeni şemaya taşınır", async () => {
  const store = activeStore();
  const content = await pack();
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T07:00:00.000Z"),
  });
  const related = store.snapshot.plans.filter(
    (record) =>
      record.id === installed.annualPlanId ||
      record.annualPlanId === installed.annualPlanId,
  );
  for (const record of related) {
    record.primaryLensId = record.teacherPreferredLensId;
    record.supportingLensIds = [
      ...record.teacherPreferredSupportingLensIds,
    ];
    delete record.teacherPreferredLensId;
    delete record.teacherPreferredSupportingLensIds;
    delete record.lensSelectionMode;
  }

  const legacySummary = await loadInstalledPremiumPlan(store, content);
  assert.equal(legacySummary.teacherPreferredLensId, "guided-play");
  assert.deepEqual(legacySummary.teacherPreferredSupportingLensIds, []);
  assert.equal(legacySummary.lensSelectionMode, "preference_only");

  const annual = related.find((record) => record.id === installed.annualPlanId);
  annual.teacherPreferredLensId = "guided-play";
  annual.teacherPreferredSupportingLensIds = [];
  annual.lensSelectionMode = "preference_only";
  await assert.rejects(
    loadInstalledPremiumPlan(store, content),
    /çift kaynaklı/,
  );
  delete annual.teacherPreferredLensId;
  delete annual.teacherPreferredSupportingLensIds;
  delete annual.lensSelectionMode;

  await updatePremiumPlanLensPreferences(store, {
    pack: content,
    teacherPreferredLensId: "prepared-environment",
    teacherPreferredSupportingLensIds: ["accessible-participation"],
    now: new Date("2026-09-07T08:00:00.000Z"),
  });
  const migrated = (await store.readSnapshot()).plans.filter(
    (record) =>
      record.id === installed.annualPlanId ||
      record.annualPlanId === installed.annualPlanId,
  );
  assert.ok(migrated.every((record) => record.primaryLensId === undefined));
  assert.ok(migrated.every((record) => record.supportingLensIds === undefined));
  assert.ok(
    migrated.every(
      (record) =>
        record.teacherPreferredLensId === "prepared-environment" &&
        record.teacherPreferredSupportingLensIds[0] ===
          "accessible-participation" &&
        record.lensSelectionMode === "preference_only",
    ),
  );
});

test("lens güncellemesi ilgili plan zaman çizgisinden eskiyse hiçbir planı yazmaz", async () => {
  const store = activeStore();
  const content = await pack();
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T07:00:00.000Z"),
  });
  const annual = store.snapshot.plans.find(
    (record) => record.id === installed.annualPlanId,
  );
  assert.ok(annual);
  annual.updatedAt = "2026-09-07T09:00:00.000Z";
  const before = await store.readSnapshot();

  await assert.rejects(
    updatePremiumPlanLensPreferences(store, {
      pack: content,
      teacherPreferredLensId: "prepared-environment",
      teacherPreferredSupportingLensIds: ["accessible-participation"],
      now: new Date("2026-09-07T08:00:00.000Z"),
    }),
    /son değişiklik zamanından eski/,
  );

  assert.deepEqual(await store.readSnapshot(), before);
});

test("yanlış yaş grubu ve öğretmen kataloğu pilot plan kurulumunu reddeder", async () => {
  const content = await pack();
  const wrongAge = activeStore();
  wrongAge.snapshot.classrooms[0].ageGroup = "48–60 ay";
  await assert.rejects(
    installPremiumPlanBoard(wrongAge, {
      pack: content,
      curriculumProfile: profile,
      teacherPreferredLensId: "guided-play",
    }),
    /60–72 ay/,
  );

  await assert.rejects(
    installPremiumPlanBoard(activeStore(), {
      pack: content,
      curriculumProfile: { ...profile, referenceOrigin: "teacher-declared", officialCatalogVerified: false },
      teacherPreferredLensId: "guided-play",
    }),
    /doğrulanmış TYMM 2024/,
  );
});
