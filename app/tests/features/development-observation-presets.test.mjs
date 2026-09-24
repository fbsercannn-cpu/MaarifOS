import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { assertEntityRecord } from "../../src/core/repository/entities.ts";
import { TYMM_2024_AGE_BANDS, TYMM_2024_DOMAINS, TYMM_2024_LEARNING_OUTCOMES } from "../../src/features/curriculum/tymm-2024-catalog.ts";
import {
  DEVELOPMENT_OBSERVATION_PRESETS,
  DEVELOPMENT_OBSERVATION_SUPPORT_OPTIONS,
  createDevelopmentObservationDraft,
  getDevelopmentObservationPresets,
  parseDevelopmentObservationSelection,
} from "../../src/features/evidence/development-observation-presets.ts";
import { isDevelopmentObservationCurriculumLink } from "../../src/features/evidence/development-observation-record.ts";
import { developmentObservationGraphReference } from "../../src/features/evidence/development-observation-graph-references.ts";
import { createTymmHolisticLearningOutcomeReference } from "../../src/features/curriculum/tymm-holistic-graph.ts";
import {
  persistQuickObservationDraft,
  persistQuickObservationDraftBatch,
  finalizeQuickObservationDraft,
  finalizeQuickObservationDraftBatch,
  loadQuickObservationDraft,
} from "../../src/features/evidence/quick-observation.ts";
import { loadQuickObservationDraftBatch } from "../../src/features/evidence/quick-observation-batch-recovery.ts";
import { ensureSpontaneousObservationContext } from "../../src/features/evidence/spontaneous-observation.ts";

const observationPickerSource = readFileSync(
  new URL(
    "../../src/features/evidence/DevelopmentObservationPicker.tsx",
    import.meta.url,
  ),
  "utf8",
);

class MemoryStore {
  constructor(snapshot) { this.snapshot = structuredClone(snapshot); this.failCollection = null; }
  async readSnapshot() { return structuredClone(this.snapshot); }
  async transaction(mode, collections, task) {
    const snapshot = structuredClone(this.snapshot);
    const result = await task({
      getAll: async (collection) => structuredClone(snapshot[collection]),
      putMany: async (collection, records) => {
        if (this.failCollection === collection) throw new Error("Kurgu atomik yazma hatası");
        const map = new Map(snapshot[collection].map((record) => [record.id, record]));
        for (const record of records) {
          assertEntityRecord(collection, record);
          map.set(record.id, structuredClone(record));
        }
        snapshot[collection] = [...map.values()];
      },
      clear: async (collection) => { snapshot[collection] = []; },
    });
    if (mode === "readwrite") for (const collection of collections) this.snapshot[collection] = snapshot[collection];
    return result;
  }
  close() {}
}

const academicYearId = "00000000-0000-4000-8000-000000006001";
const classroomId = "00000000-0000-4000-8000-000000006002";
const studentIds = ["00000000-0000-4000-8000-000000006003", "00000000-0000-4000-8000-000000006004"];
const observationIds = ["00000000-0000-4000-8000-000000006005", "00000000-0000-4000-8000-000000006006"];
const now = new Date("2026-09-08T07:00:00.000Z");
const selection = { presetId: "development-60-72-group-contact", ageBand: "60-72", support: "with-reminder" };

async function fixture() {
  const snapshot = createEmptySnapshot();
  const base = { createdAt: now.toISOString(), updatedAt: now.toISOString(), civilDate: "2026-09-08", deletedAt: null, schemaVersion: 1 };
  snapshot.academicYears.push({ ...base, id: academicYearId, name: "Kurgu Eğitim Yılı", startDate: "2026-09-01", endDate: "2027-06-30", status: "active" });
  snapshot.classrooms.push({
    ...base, id: classroomId, academicYearId, name: "Kurgu Sınıf", ageGroup: "60–72 ay", schemaVersion: 2,
    curriculumProfileSnapshot: {
      framework: "tymm", programLabel: "Türkiye Yüzyılı Maarif Modeli", catalogId: "tymm-legacy-partial", sourceVersion: "2024",
      referenceOrigin: "teacher-declared", officialCatalogVerified: false,
    },
  });
  snapshot.settings.push({ ...base, id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE, academicYearId, classroomId });
  snapshot.students.push(...studentIds.map((id, index) => ({ ...base, id, academicYearId, classroomId, displayName: `Kurgu Çocuk ${index + 1}`, active: true, enrollmentStatus: "active" })));
  const store = new MemoryStore(snapshot);
  const context = await ensureSpontaneousObservationContext(store, { studentId: studentIds[0], civilDate: "2026-09-08", now });
  return { store, planId: context.plan.id, activityId: context.activity.id };
}

function draftInput(context, selected = selection) {
  const { programMapping, ...draft } = createDevelopmentObservationDraft(selected);
  assert.equal(programMapping.assessmentLevel, null);
  return { ...draft, studentId: studentIds[0], planId: context.planId, activityId: context.activityId, developmentSelection: selected, now };
}

test("63 özgün gözlem her resmî yaş bandında yedi alanı kapsar ve aynı yaşın gerçek kaynak koduna bağlanır", () => {
  assert.equal(DEVELOPMENT_OBSERVATION_PRESETS.length, 63);
  assert.equal(new Set(DEVELOPMENT_OBSERVATION_PRESETS.map((preset) => preset.id)).size, 63);
  for (const age of TYMM_2024_AGE_BANDS) {
    assert.equal(getDevelopmentObservationPresets(age).length, 21);
    for (const domain of TYMM_2024_DOMAINS) assert.equal(getDevelopmentObservationPresets(age, domain).length, 3);
  }
  for (const preset of DEVELOPMENT_OBSERVATION_PRESETS) {
    const outcome = TYMM_2024_LEARNING_OUTCOMES.find((item) => item.ageBand === preset.ageBand && item.code === preset.curriculumReference.code);
    assert.equal(outcome.domain, preset.domain);
    assert.equal(outcome.title, preset.curriculumReference.title);
    assert.equal(outcome.sourcePage, preset.curriculumReference.sourcePage);
    assert.equal(preset.provenance.contentOrigin, "MaarifOS-original");
    assert.equal(preset.provenance.officialChecklist, false);
    assert.doesNotMatch(preset.observationText, /başarılı|başarısız|zayıf|üstün|tembel|gerilik|tanı koy|puan|…|TODO/iu);
    assert.ok(Object.isFrozen(preset));
  }
  assert.equal(getDevelopmentObservationPresets("48–60 ay").length, 21);
  for (const age of [undefined, null, "karma", "0-36", "72-84", "48"]) assert.deepEqual(getDevelopmentObservationPresets(age), []);
});

test("gelişim seçicisi yaşa uygun TYMM bağlamını ilk başlıkta görünür kılar", () => {
  assert.match(observationPickerSource, /TYMM · yaşa uygun gelişim bilgisi/u);
  assert.match(observationPickerSource, /className="development-picker__context"/u);
});

test("aynı kodun yaşa göre anlamı korunur; 36–48 temizlik HSAB.9, diğer yaşlar HSAB.10 olur", () => {
  const youngest = getDevelopmentObservationPresets("36-48").find((item) => item.id.endsWith("hand-cleaning"));
  const oldest = getDevelopmentObservationPresets("60-72").find((item) => item.id.endsWith("hand-cleaning"));
  assert.equal(youngest.curriculumReference.code, "HSAB.9");
  assert.equal(oldest.curriculumReference.code, "HSAB.10");
  assert.throws(() => createDevelopmentObservationDraft({ ...selection, ageBand: "36-48" }), /yaş bandıyla/);
  assert.throws(() => parseDevelopmentObservationSelection({ ...selection, assessmentLevel: "independent" }), /geçersiz/);
});

test("çevrim dışı küçük graf tablosu bütün gözlem hedeflerinde tam kanonik grafla birebir aynıdır", () => {
  for (const preset of DEVELOPMENT_OBSERVATION_PRESETS) {
    const expected = createTymmHolisticLearningOutcomeReference(preset.ageBand, preset.curriculumReference.code);
    const actual = developmentObservationGraphReference(preset.ageBand, preset.curriculumReference.code);
    assert.deepEqual(actual, expected);
    actual.relatedNodeIds.push("kurgu-degisiklik");
    assert.deepEqual(developmentObservationGraphReference(preset.ageBand, preset.curriculumReference.code), expected);
  }
  assert.equal(developmentObservationGraphReference("0-36", "SAB.8"), null);
});

test("ham öğretmen metnini aynen korur; destek bağlama eklenir, otomatik başarı düzeyi çıkarılmaz", () => {
  const rawText = "  Çocuk arkadaşına ‘beraber kuralım’ dedi.\nİki parça taşıdı.  ";
  for (const support of DEVELOPMENT_OBSERVATION_SUPPORT_OPTIONS) {
    const draft = createDevelopmentObservationDraft({ ...selection, support: support.id, rawText, context: "Bahçe oyunu" });
    assert.equal(draft.rawText, rawText);
    assert.equal(draft.context, `Bahçe oyunu\n${support.contextText}`);
    assert.equal(draft.programMapping.assessmentLevel, null);
    assert.equal(draft.programMapping.relationship, "teacher-review-required");
    assert.equal(draft.childQuote, "");
    assert.equal(draft.taxonomyVersion, "maarifos-observation-v2");
  }
  assert.equal(createDevelopmentObservationDraft({ presetId: selection.presetId, ageBand: selection.ageBand }).context, "");
  assert.throws(() => createDevelopmentObservationDraft({ ...selection, support: "independent" }), /geçersiz/);
});

test("seçim taslakta geri açılır; finalde ayrı resmî bağ atomik yazılır ve anlık planın geçmiş profili değişmez", async () => {
  const context = await fixture();
  const { store } = context;
  const originalPlans = structuredClone(store.snapshot.plans);
  const originalActivities = structuredClone(store.snapshot.activities);
  const input = draftInput(context);
  await persistQuickObservationDraft(store, input);
  const restored = await loadQuickObservationDraft(store, { studentId: input.studentId, planId: input.planId, activityId: input.activityId });
  assert.deepEqual(restored.developmentSelection, selection);
  assert.equal(store.snapshot.observations.length, 0);
  assert.equal(store.snapshot.evidenceCurriculumLinks.length, 0);
  const result = await finalizeQuickObservationDraft(store, { studentId: input.studentId, planId: input.planId, activityId: input.activityId, observationId: observationIds[0], now });
  assert.equal(result.observation.rawText, input.rawText);
  assert.deepEqual(result.observation.developmentSelection, selection);
  assert.deepEqual(store.snapshot.plans, originalPlans);
  assert.deepEqual(store.snapshot.activities, originalActivities);
  assert.equal(store.snapshot.evidenceCurriculumLinks.length, 1);
  const link = store.snapshot.evidenceCurriculumLinks[0];
  assert.equal(isDevelopmentObservationCurriculumLink(link), true);
  assert.equal(link.plannedTargetId, undefined);
  assert.equal(link.targetSourcePage, 275);
  assert.equal(link.holisticGraphReference.reviewStatus, "pending-human-review");
  assert.equal(store.snapshot.reportDrafts.length, 0);
  assert.equal(link.assessmentLevel, undefined);
  await assert.rejects(finalizeQuickObservationDraft(store, { studentId: input.studentId, observationId: observationIds[0], now }), /taslağı bulunamadı/);
  assert.equal(store.snapshot.observations.length, 1);
  assert.equal(store.snapshot.evidenceCurriculumLinks.length, 1);
});

test("program bağı yazması başarısızsa ham kanıt ve öğretmen kimliği de geri alınır; taslak kaybolmaz", async () => {
  const context = await fixture();
  await persistQuickObservationDraft(context.store, draftInput(context));
  const before = await context.store.readSnapshot();
  context.store.failCollection = "evidenceCurriculumLinks";
  await assert.rejects(finalizeQuickObservationDraft(context.store, { studentId: studentIds[0], observationId: observationIds[0], now }), /atomik yazma/);
  assert.deepEqual(context.store.snapshot, before);
});

test("eski taslağın seçimi kaldırılabilir ve eski seçim sonraki serbest gözleme sızmaz", async () => {
  const context = await fixture();
  const input = draftInput(context);
  await persistQuickObservationDraft(context.store, input);
  const { developmentSelection, ...freeInput } = input;
  await persistQuickObservationDraft(context.store, { ...freeInput, rawText: "Öğretmenin başka olay notu." });
  const result = await finalizeQuickObservationDraft(context.store, { studentId: studentIds[0], observationId: observationIds[0], now });
  assert.equal(result.observation.developmentSelection, undefined);
  assert.equal(context.store.snapshot.evidenceCurriculumLinks.length, 0);
});

test("seçilen yaşın sınıfla uyuşmaması ve EÇE etkinliği yazmadan reddedilir", async () => {
  for (const change of ["age", "framework"]) {
    const context = await fixture();
    if (change === "age") context.store.snapshot.classrooms[0].ageGroup = "48-60 ay";
    else context.store.snapshot.activities[0].curriculumProfileSnapshot.framework = "meb_2024";
    const before = await context.store.readSnapshot();
    await assert.rejects(persistQuickObservationDraft(context.store, draftInput(context)), /yaş bandıyla|TYMM/);
    assert.deepEqual(context.store.snapshot, before);
  }
});

test("taslak sonrası yaş bandı değişirse final kanıt üretmeden durur", async () => {
  const context = await fixture();
  await persistQuickObservationDraft(context.store, draftInput(context));
  context.store.snapshot.classrooms[0].ageGroup = "36-48 ay";
  const before = await context.store.readSnapshot();
  await assert.rejects(finalizeQuickObservationDraft(context.store, { studentId: studentIds[0], now }), /yaş bandıyla/);
  assert.deepEqual(context.store.snapshot, before);
});

test("toplu kayıt her çocuğa ayrı kanıt ve program bağı kurar; restore eşitliğinde seçim de karşılaştırılır", async () => {
  const context = await fixture();
  const input = draftInput(context);
  const batch = await persistQuickObservationDraftBatch(context.store, { ...input, studentIds });
  const resumed = await loadQuickObservationDraftBatch(context.store, { planId: input.planId, activityId: input.activityId, taxonomyVersion: input.taxonomyVersion });
  assert.equal(resumed.batchId, batch.batchId);
  const observationMap = Object.fromEntries(studentIds.map((id, index) => [id, observationIds[index]]));
  const finalized = await finalizeQuickObservationDraftBatch(context.store, { studentIds, planId: input.planId, activityId: input.activityId, taxonomyVersion: input.taxonomyVersion, batchId: batch.batchId, observationIds: observationMap, now });
  assert.equal(finalized.observations.length, 2);
  assert.equal(context.store.snapshot.evidenceCurriculumLinks.length, 2);
  assert.equal(new Set(context.store.snapshot.evidenceCurriculumLinks.map((link) => link.approvedByUserId)).size, 1);

  const divergent = await fixture();
  const divergentInput = draftInput(divergent);
  const divergentBatch = await persistQuickObservationDraftBatch(divergent.store, { ...divergentInput, studentIds });
  divergent.store.snapshot.settings.find((record) => record.batchId === divergentBatch.batchId).developmentSelection.support = "together";
  await assert.rejects(loadQuickObservationDraftBatch(divergent.store, { planId: divergent.planId, activityId: divergent.activityId, taxonomyVersion: input.taxonomyVersion }), /tutarsız/);
  assert.equal(divergent.store.snapshot.observations.length, 0);
});

test("kaynak snapshot'ı veya seçim tahrifi resmî bağ sayılmaz", async () => {
  const context = await fixture();
  await persistQuickObservationDraft(context.store, draftInput(context));
  await finalizeQuickObservationDraft(context.store, { studentId: studentIds[0], now });
  const link = context.store.snapshot.evidenceCurriculumLinks[0];
  const tampered = structuredClone(link);
  tampered.targetSnapshot.referenceTitle = "Uydurma başarı";
  assert.equal(isDevelopmentObservationCurriculumLink(tampered), false);
  assert.equal(isDevelopmentObservationCurriculumLink({ ...link, plannedTargetId: link.targetSnapshot.id }), false);
  assert.equal(isDevelopmentObservationCurriculumLink({ ...link, developmentSelection: { ...selection, ageBand: "36-48" } }), false);
  assert.equal(isDevelopmentObservationCurriculumLink({ ...link, holisticGraphReference: createTymmHolisticLearningOutcomeReference("60-72", "MHB.3") }), false);
  const alteredNodes = structuredClone(link);
  alteredNodes.holisticGraphReference.relatedNodeIds.pop();
  assert.equal(isDevelopmentObservationCurriculumLink(alteredNodes), false);
});
