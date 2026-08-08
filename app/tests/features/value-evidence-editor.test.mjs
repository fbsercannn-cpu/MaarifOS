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
  captureImmutableRawObservation,
  createPlanWithActivity,
} from "../../src/features/evidence/evidence-flow.ts";
import { parsePremiumContentPack } from "../../src/features/premium-plans/content-repository.ts";
import {
  installPremiumPlanBoard,
  preparePremiumDailyTemplate,
  projectPremiumWeeklyReviewObservation,
} from "../../src/features/premium-plans/plan-service.ts";
import {
  confirmObservationValueEvidenceLink,
  loadValueEvidenceLinkEditorModel,
  supersedeObservationValueEvidenceLink,
} from "../../src/features/values/value-evidence-links.ts";

class MemoryStore {
  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
    this.writeCount = 0;
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
      this.writeCount += 1;
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

const yearId = "00000000-0000-4000-8000-000000000901";
const classroomId = "00000000-0000-4000-8000-000000000902";
const studentId = "00000000-0000-4000-8000-000000000903";
const planId = "00000000-0000-4000-8000-000000000904";
const activityId = "00000000-0000-4000-8000-000000000905";
const observationId = "00000000-0000-4000-8000-000000000906";

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
    name: "UI Pilot Sınıfı",
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
    displayName: "Kurgu UI Çocuğu",
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

async function valuesPack() {
  const raw = JSON.parse(
    await readFile(
      new URL(
        "../../../premium-content/releases/tymm-6072/2026-09/content.v3.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  return parsePremiumContentPack(raw);
}

async function alternativeEvidenceChain() {
  const store = activeStore();
  const content = await valuesPack();
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-07T06:00:00.000Z"),
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
  const applied = selection.alternativeActivitySnapshot;
  assert.ok(applied.valuesDesign);
  assert.notEqual(applied.valuesDesign.id, main.valuesDesign?.id);
  const targetCodes = new Set(applied.curriculumTargetCodes);
  const curriculumTargets = curriculumTargetsForProfile(profile, "60-72").filter(
    (target) => targetCodes.has(target.referenceCode),
  );
  const daily = await createPlanWithActivity(store, {
    civilDate: applied.recommendedCivilDate,
    planId,
    activityId,
    planTitle: selection.planTitle,
    activityTitle: applied.title,
    startTime: "09:00",
    endTime: "09:40",
    curriculumProfile: profile,
    curriculumTargets,
    assignmentMode: "selected-students",
    studentIds: [studentId],
    premiumSource: selection,
    premiumAlternativeActivated: true,
    now: new Date("2026-09-08T06:00:00.000Z"),
  });
  await captureImmutableRawObservation(store, {
    observationId,
    studentId,
    planId,
    activityId,
    rawText: "Çocuk arkadaşının farklı katılım yolunu dinleyip ona alan açtı.",
    observedAt: "2026-09-08T07:00:00.000Z",
    now: new Date("2026-09-08T07:01:00.000Z"),
  });
  return { store, main, applied, daily };
}

test("haftalık gözlem projection'ı yalnız tek çocuklu v3 applied snapshot için editörü açar", () => {
  const observation = {
    ...base,
    id: observationId,
    rawText: "Somut olay kaydı.",
    observedAt: "2026-09-08T07:00:00.000Z",
    planId,
    activityId,
    studentIds: [studentId],
  };
  const student = {
    ...base,
    id: studentId,
    displayName: "Kurgu UI Çocuğu",
  };
  const valuesDesign = { id: "values-design", version: "1.0.0" };
  const activity = {
    ...base,
    id: activityId,
    planId,
    title: "Uygulanmış etkinlik",
    appliedActivityTemplateId: "template-v3",
    appliedActivityTemplateSnapshot: {
      id: "template-v3",
      valuesDesign,
    },
    sourceContentPackSnapshot: {
      valuesMappingStatus: "machine_validated_pending_human_review",
    },
  };

  const single = projectPremiumWeeklyReviewObservation(
    observation,
    activity,
    student,
  );
  assert.equal(single.studentId, studentId);
  assert.equal(single.studentName, "Kurgu UI Çocuğu");
  assert.equal(single.activityId, activityId);
  assert.equal(single.valueEvidenceEligible, true);

  const grouped = projectPremiumWeeklyReviewObservation(
    { ...observation, studentIds: [studentId, crypto.randomUUID()] },
    activity,
    student,
  );
  assert.equal(grouped.studentId, null);
  assert.equal(grouped.studentName, null);
  assert.equal(grouped.valueEvidenceEligible, false);

  const legacy = projectPremiumWeeklyReviewObservation(
    observation,
    {
      ...activity,
      appliedActivityTemplateSnapshot: {
        id: "template-v3",
        valuesDesign: null,
      },
      sourceContentPackSnapshot: { valuesMappingStatus: "legacy-unmapped" },
    },
    student,
  );
  assert.equal(legacy.valueEvidenceEligible, false);
});

test("editör read-model'i applied snapshot hedeflerini, canlı/geçmiş ayrımını ve sıfır yazımı korur", async () => {
  const { store, main, applied } = await alternativeEvidenceChain();
  store.writeCount = 0;
  const before = canonicalJson(await store.readSnapshot());
  const initial = await loadValueEvidenceLinkEditorModel(store, {
    observationId,
    studentId,
  });
  assert.equal(store.writeCount, 0);
  assert.equal(canonicalJson(await store.readSnapshot()), before);
  assert.equal(initial.appliedActivityTemplateId, applied.id);
  assert.equal(initial.appliedValuesDesignId, applied.valuesDesign.id);
  assert.notEqual(initial.appliedValuesDesignId, main.valuesDesign?.id);
  assert.equal(
    initial.mappingStatus,
    "machine_validated_pending_human_review",
  );
  assert.deepEqual(
    initial.targets.map((target) => [
      target.targetValueCode,
      target.targetIndicatorCode,
      target.indicatorText,
    ]),
    applied.valuesDesign.mapping.officialActionSnapshots.map((target) => [
      target.valueCode,
      target.indicatorCode,
      target.indicatorText,
    ]),
  );
  assert.equal(initial.activeLinks.length, 0);
  assert.equal(initial.historyLinks.length, 0);

  const target = initial.targets[0];
  const created = await confirmObservationValueEvidenceLink(store, {
    observationId,
    studentId,
    evidenceRole: "supports",
    targetValueCode: target.targetValueCode,
    targetIndicatorCode: target.targetIndicatorCode,
    teacherRationale:
      "Arkadaşının seçimine alan açma eylemi, seçili resmî göstergeyle aynı yönde bir olay örneğidir.",
    now: new Date("2026-09-08T08:00:00.000Z"),
  });
  const withActive = await loadValueEvidenceLinkEditorModel(store, {
    observationId,
    studentId,
  });
  assert.deepEqual(withActive.activeLinks.map((link) => link.record.id), [created.id]);
  assert.equal(withActive.historyLinks.length, 0);

  const corrected = await supersedeObservationValueEvidenceLink(store, {
    linkId: created.id,
    evidenceRole: "contrasts",
    teacherRationale:
      "Olayda arkadaşının sözünü kesmesi, seçili resmî göstergeyle ayrışan ve yeniden planlama gerektiren somut karşı örnektir.",
    now: new Date("2026-09-08T09:00:00.000Z"),
  });
  const withHistory = await loadValueEvidenceLinkEditorModel(store, {
    observationId,
    studentId,
  });
  assert.deepEqual(
    withHistory.activeLinks.map((link) => link.record.id),
    [corrected.replacement.id],
  );
  assert.deepEqual(
    withHistory.historyLinks.map((link) => link.record.id),
    [created.id],
  );
  assert.equal(
    withHistory.activeLinks[0].target.targetIndicatorCode,
    target.targetIndicatorCode,
  );
  assert.doesNotMatch(
    JSON.stringify(withHistory),
    /valueScore|valueJudgment|badge|rank|mastered|achieved/i,
  );
});
