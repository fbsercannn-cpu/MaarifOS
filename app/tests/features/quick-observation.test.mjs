import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  OBSERVATION_CATEGORIES_V1,
  OBSERVATION_CATEGORIES_V2,
  OBSERVATION_TAXONOMY_VERSION_V1,
  OBSERVATION_TAXONOMY_VERSION_V2,
  inferLegacyObservationTaxonomyVersion,
  normalizeObservationCategories,
} from "../../src/core/domain/observation-taxonomy.ts";
import {
  discardQuickObservationDraft,
  finalizeQuickObservationDraft,
  loadQuickObservationDraft,
  persistQuickObservationDraft,
} from "../../src/features/evidence/quick-observation.ts";

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
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000000701";
const classroomId = "00000000-0000-4000-8000-000000000702";
const studentAId = "00000000-0000-4000-8000-000000000703";
const studentBId = "00000000-0000-4000-8000-000000000704";
const planId = "00000000-0000-4000-8000-000000000705";
const activityId = "00000000-0000-4000-8000-000000000706";
const observationId = "00000000-0000-4000-8000-000000000707";
const duplicateObservationId = "00000000-0000-4000-8000-000000000708";
const otherPlanId = "00000000-0000-4000-8000-000000000709";
const otherActivityId = "00000000-0000-4000-8000-000000000710";

const base = {
  createdAt: "2026-09-02T06:00:00.000Z",
  updatedAt: "2026-09-02T06:00:00.000Z",
  civilDate: "2026-09-02",
  deletedAt: null,
  schemaVersion: 1,
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
    name: "Kurgu Hızlı Gözlem Sınıfı",
    schemaVersion: 2,
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  snapshot.students.push(
    {
      ...base,
      id: studentAId,
      displayName: "Kurgu Çocuk A",
      academicYearId: yearId,
      classroomId,
      enrollmentStatus: "active",
    },
    {
      ...base,
      id: studentBId,
      displayName: "Kurgu Çocuk B",
      academicYearId: yearId,
      classroomId,
      enrollmentStatus: "active",
    },
  );
  snapshot.plans.push({
    ...base,
    id: planId,
    title: "Kurgu gözlem planı",
    academicYearId: yearId,
    classroomId,
  }, {
    ...base,
    id: otherPlanId,
    title: "Diğer kurgu gözlem planı",
    academicYearId: yearId,
    classroomId,
  });
  snapshot.activities.push({
    ...base,
    id: activityId,
    planId,
    title: "Kurgu gözlem etkinliği",
    studentIds: [studentAId, studentBId],
    academicYearId: yearId,
    classroomId,
  }, {
    ...base,
    id: otherActivityId,
    planId: otherPlanId,
    title: "Diğer kurgu gözlem etkinliği",
    studentIds: [studentAId, studentBId],
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

const draftAInput = {
  studentId: studentAId,
  planId,
  activityId,
  rawText: "  Blokları renklerine göre iki gruba ayırdı.  ",
  context: "  Serbest oyun sırasında  ",
  childQuote: "  “Bunlar sıcak renkler.”  ",
  observationType: "child-quote",
  categoryIds: [
    "language-communication",
    "cognitive",
    "language-communication",
  ],
  now: new Date("2026-09-02T07:00:00.000Z"),
};

test("gözlem taksonomisi v1 kodlarını değiştirmeden okur ve v2 nötr üst kategorilerini ayrı tutar", () => {
  assert.deepEqual(OBSERVATION_CATEGORIES_V1, [
    "language-communication",
    "cognitive",
    "social-emotional-values",
    "physical-health",
    "self-care",
    "art-creativity",
    "play-participation",
    "other",
  ]);
  assert.deepEqual(OBSERVATION_CATEGORIES_V2, [
    "language-communication",
    "cognitive-learning",
    "social-emotional",
    "values-dispositions-participation",
    "physical-motor-health",
    "self-care-daily-life",
    "art-creativity",
    "play-participation",
    "interest-attention-curiosity",
    "other",
  ]);
  assert.deepEqual(
    normalizeObservationCategories(OBSERVATION_TAXONOMY_VERSION_V2, [
      "cognitive-learning",
      "interest-attention-curiosity",
      "cognitive-learning",
    ]),
    ["cognitive-learning", "interest-attention-curiosity"],
  );
  assert.throws(
    () =>
      normalizeObservationCategories(OBSERVATION_TAXONOMY_VERSION_V2, [
        "cognitive",
      ]),
    /taksonomi sürümüyle uyuşmuyor/,
  );
  assert.throws(
    () =>
      inferLegacyObservationTaxonomyVersion([
        "interest-attention-curiosity",
      ]),
    /v1 sözleşmesine ait değil/,
  );
});

test("hızlı gözlem taslakları aktif sınıfta öğrenciye göre ayrı ve sürümlü saklanır", async () => {
  const store = activeStore();

  const draftA = await persistQuickObservationDraft(store, draftAInput);
  await persistQuickObservationDraft(store, {
    ...draftAInput,
    studentId: studentBId,
    rawText: "Kurgu çocuk B için ayrı taslak.",
    observationType: "quick-note",
    categoryIds: ["play-participation"],
    now: new Date("2026-09-02T07:01:00.000Z"),
  });

  assert.equal(draftA.schemaVersion, 1);
  assert.equal(
    draftA.observationTaxonomyVersion,
    OBSERVATION_TAXONOMY_VERSION_V1,
  );
  assert.equal(draftA.studentId, studentAId);
  assert.equal(draftA.rawText, draftAInput.rawText);
  assert.equal(draftA.context, draftAInput.context);
  assert.equal(draftA.childQuote, draftAInput.childQuote);
  assert.deepEqual(draftA.categoryIds, ["language-communication", "cognitive"]);
  assert.equal((await loadQuickObservationDraft(store, { studentId: studentAId }))?.rawText,
    draftAInput.rawText);
  assert.equal((await loadQuickObservationDraft(store, { studentId: studentBId }))?.rawText,
    "Kurgu çocuk B için ayrı taslak.");
});

test("aynı çocuğun taslağını plan ve etkinlik bağlamına göre seçer ve yalnız o bağlamın üzerine yazar", async () => {
  const store = activeStore();
  const first = await persistQuickObservationDraft(store, draftAInput);
  const other = await persistQuickObservationDraft(store, {
    ...draftAInput,
    planId: otherPlanId,
    activityId: otherActivityId,
    rawText: "Diğer etkinlikte bloklardan bir köprü kurdu.",
    now: new Date("2026-09-02T07:01:00.000Z"),
  });
  const updatedFirst = await persistQuickObservationDraft(store, {
    ...draftAInput,
    rawText: "İlk etkinlikte renkleri iki grupta yeniden düzenledi.",
    now: new Date("2026-09-02T07:02:00.000Z"),
  });

  assert.equal(updatedFirst.id, first.id);
  assert.notEqual(updatedFirst.id, other.id);
  assert.equal(
    (await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    }))?.rawText,
    "İlk etkinlikte renkleri iki grupta yeniden düzenledi.",
  );
  assert.equal(
    (await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId: otherPlanId,
      activityId: otherActivityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    }))?.rawText,
    "Diğer etkinlikte bloklardan bir köprü kurdu.",
  );
  await assert.rejects(
    loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
    }),
    /plan ve etkinlik birlikte/,
  );
});

test("bağlamlı finalize başka etkinlikteki aynı çocuk taslağını etkin bırakır", async () => {
  const store = activeStore();
  await persistQuickObservationDraft(store, draftAInput);
  await persistQuickObservationDraft(store, {
    ...draftAInput,
    planId: otherPlanId,
    activityId: otherActivityId,
    rawText: "Finale edilecek diğer etkinlik taslağı.",
    now: new Date("2026-09-02T07:01:00.000Z"),
  });

  const result = await finalizeQuickObservationDraft(store, {
    studentId: studentAId,
    planId: otherPlanId,
    activityId: otherActivityId,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    observationId,
    observedAt: "2026-09-02T07:05:00.000Z",
    now: new Date("2026-09-02T07:06:00.000Z"),
  });

  assert.equal(result.observation.planId, otherPlanId);
  assert.equal(result.observation.activityId, otherActivityId);
  assert.equal(
    await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId: otherPlanId,
      activityId: otherActivityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    }),
    null,
  );
  assert.equal(
    (await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    }))?.rawText,
    draftAInput.rawText,
  );
});

test("başarılı final kayıt ham alanları korur ve aynı işlemde yalnız ilgili taslağı kapatır", async () => {
  const store = activeStore();
  await persistQuickObservationDraft(store, draftAInput);
  await persistQuickObservationDraft(store, {
    ...draftAInput,
    studentId: studentBId,
    rawText: "Korunacak diğer öğrenci taslağı.",
  });

  const result = await finalizeQuickObservationDraft(store, {
    studentId: studentAId,
    observationId,
    observedAt: "2026-09-02T07:05:00.000Z",
    now: new Date("2026-09-02T07:06:00.000Z"),
  });

  assert.equal(result.observation.rawText, draftAInput.rawText);
  assert.equal(result.observation.context, draftAInput.context);
  assert.equal(result.observation.childQuote, draftAInput.childQuote);
  assert.equal(result.observation.observationType, "child-quote");
  assert.equal(
    result.observation.observationTaxonomyVersion,
    OBSERVATION_TAXONOMY_VERSION_V1,
  );
  assert.deepEqual(result.observation.observationCategories, [
    "language-communication",
    "cognitive",
  ]);
  assert.equal(await loadQuickObservationDraft(store, { studentId: studentAId }), null);
  assert.notEqual(await loadQuickObservationDraft(store, { studentId: studentBId }), null);
});

test("v2 taksonomisi yalnız açık sürüm etiketiyle saklanır ve final kanıta taşınır", async () => {
  const store = activeStore();
  const draft = await persistQuickObservationDraft(store, {
    ...draftAInput,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
    categoryIds: [
      "cognitive-learning",
      "values-dispositions-participation",
      "interest-attention-curiosity",
    ],
  });

  assert.equal(
    draft.observationTaxonomyVersion,
    OBSERVATION_TAXONOMY_VERSION_V2,
  );
  const result = await finalizeQuickObservationDraft(store, {
    studentId: studentAId,
    observationId,
    observedAt: "2026-09-02T07:05:00.000Z",
    now: new Date("2026-09-02T07:06:00.000Z"),
  });
  assert.equal(
    result.observation.observationTaxonomyVersion,
    OBSERVATION_TAXONOMY_VERSION_V2,
  );
  assert.deepEqual(result.observation.observationCategories, [
    "cognitive-learning",
    "values-dispositions-participation",
    "interest-attention-curiosity",
  ]);
});

test("aynı etkinlikteki v1 taslağını v2 akışı sessizce dönüştürmez veya kaybetmez", async () => {
  const store = activeStore();
  const v1Draft = await persistQuickObservationDraft(store, draftAInput);
  const v2Draft = await persistQuickObservationDraft(store, {
    ...draftAInput,
    rawText: "V2 akışında dikkatini uzun süre bloklara yöneltti.",
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
    categoryIds: [
      "cognitive-learning",
      "interest-attention-curiosity",
    ],
    now: new Date("2026-09-02T07:01:00.000Z"),
  });

  assert.notEqual(v2Draft.id, v1Draft.id);
  assert.equal(
    (await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    }))?.rawText,
    draftAInput.rawText,
  );
  assert.equal(
    (await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
    }))?.rawText,
    "V2 akışında dikkatini uzun süre bloklara yöneltti.",
  );

  const result = await finalizeQuickObservationDraft(store, {
    studentId: studentAId,
    planId,
    activityId,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
    observationId,
    observedAt: "2026-09-02T07:05:00.000Z",
    now: new Date("2026-09-02T07:06:00.000Z"),
  });
  assert.equal(
    result.observation.observationTaxonomyVersion,
    OBSERVATION_TAXONOMY_VERSION_V2,
  );
  assert.equal(
    await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
    }),
    null,
  );
  assert.equal(
    (await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    }))?.rawText,
    draftAInput.rawText,
  );
});

test("sürüm etiketi bulunmayan eski taslağı v1 kabul eder; v2 ile v1 kodlarını karıştırmaz", async () => {
  const store = activeStore();
  const draft = await persistQuickObservationDraft(store, draftAInput);
  delete store.snapshot.settings.find((record) => record.id === draft.id)
    .observationTaxonomyVersion;

  const legacy = await loadQuickObservationDraft(store, {
    studentId: studentAId,
  });
  assert.equal(
    legacy?.observationTaxonomyVersion,
    OBSERVATION_TAXONOMY_VERSION_V1,
  );
  const before = await store.readSnapshot();
  await assert.rejects(
    persistQuickObservationDraft(store, {
      ...draftAInput,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
      categoryIds: ["cognitive"],
    }),
    /taksonomi sürümüyle uyuşmuyor/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("final gözlem yazılamazsa taslak veri kaybı olmadan etkin kalır", async () => {
  const store = activeStore();
  await persistQuickObservationDraft(store, draftAInput);
  await store.transaction("readwrite", ["observations"], (transaction) =>
    transaction.putMany("observations", [{
      ...base,
      id: duplicateObservationId,
      studentIds: [studentAId],
      planId,
      activityId,
      rawText: "Önceden kaydedilmiş kurgu kanıt.",
      rawTextImmutable: true,
      observedAt: "2026-09-02T06:30:00.000Z",
      workflowStatus: "captured",
      academicYearId: yearId,
      classroomId,
      schemaVersion: 2,
    }]),
  );

  await assert.rejects(
    finalizeQuickObservationDraft(store, {
      studentId: studentAId,
      observationId: duplicateObservationId,
      observedAt: "2026-09-02T07:05:00.000Z",
    }),
    /kimliği daha önce kullanılmış/,
  );

  assert.equal(
    (await loadQuickObservationDraft(store, { studentId: studentAId }))?.rawText,
    draftAInput.rawText,
  );
});

test("öğretmenin vazgeçtiği taslak fiziksel silinmeden tombstone ile kapanır", async () => {
  const store = activeStore();
  const draft = await persistQuickObservationDraft(store, draftAInput);
  await persistQuickObservationDraft(store, {
    ...draftAInput,
    planId: otherPlanId,
    activityId: otherActivityId,
    rawText: "Vazgeçme işleminde korunacak diğer etkinlik taslağı.",
    now: new Date("2026-09-02T07:01:00.000Z"),
  });

  assert.equal(
    await discardQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
      now: new Date("2026-09-02T07:10:00.000Z"),
    }),
    true,
  );
  assert.equal(
    await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    }),
    null,
  );
  assert.equal(
    (await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId: otherPlanId,
      activityId: otherActivityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    }))?.rawText,
    "Vazgeçme işleminde korunacak diğer etkinlik taslağı.",
  );
  assert.equal(
    await discardQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
      now: new Date("2026-09-02T07:11:00.000Z"),
    }),
    false,
  );
  const stored = (await store.readSnapshot()).settings.find(
    (record) => record.id === draft.id,
  );
  assert.equal(stored?.rawText, draftAInput.rawText);
  assert.equal(stored?.deletedAt, "2026-09-02T07:10:00.000Z");
});
