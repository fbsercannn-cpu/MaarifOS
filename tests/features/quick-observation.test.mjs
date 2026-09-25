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
  finalizeQuickObservationDraftBatch,
  finalizeQuickObservationDraft,
  loadQuickObservationDraft,
  loadQuickObservationDraftCollection,
  persistQuickObservationDraftBatch,
  persistQuickObservationDraft,
} from "../../src/features/evidence/quick-observation.ts";
import { loadQuickObservationDraftBatch } from "../../src/features/evidence/quick-observation-batch-recovery.ts";
import { verifyCommittedObservationRefresh } from "../../src/features/evidence/observation-commit-refresh.ts";

class MemoryStore {
  snapshot;
  failPut;

  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
    this.failPut = null;
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        if (this.failPut?.(collection, records)) {
          throw new Error("Kurgu transaction yazma hatası.");
        }
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
const studentCId = "00000000-0000-4000-8000-000000000714";
const planId = "00000000-0000-4000-8000-000000000705";
const activityId = "00000000-0000-4000-8000-000000000706";
const observationId = "00000000-0000-4000-8000-000000000707";
const duplicateObservationId = "00000000-0000-4000-8000-000000000708";
const otherPlanId = "00000000-0000-4000-8000-000000000709";
const otherActivityId = "00000000-0000-4000-8000-000000000710";
const batchId = "00000000-0000-4000-8000-000000000711";
const bulkObservationAId = "00000000-0000-4000-8000-000000000712";
const bulkObservationBId = "00000000-0000-4000-8000-000000000713";

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

function addStudentC(store) {
  store.snapshot.students.push({
    ...base,
    id: studentCId,
    displayName: "Kurgu Çocuk C",
    academicYearId: yearId,
    classroomId,
    enrollmentStatus: "active",
  });
  store.snapshot.activities
    .filter((activity) => activity.id === activityId)
    .forEach((activity) => activity.studentIds.push(studentCId));
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

const selectedChildrenDraftInput = {
  studentIds: [studentAId, studentBId],
  planId,
  activityId,
  rawText: "Çocuklar sırayla birer blok seçerek ortak yapıyı sürdürdü.",
  context: "Küçük grup blok oyununda",
  childQuote: "Sıra sende, sonra yine ben eklerim.",
  observationType: "anecdotal",
  categoryIds: ["play-participation", "social-emotional-values"],
  batchId,
  now: new Date("2026-09-02T08:00:00.000Z"),
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

test("gözlem çocuk seçicisi bütün tekli taslakları tek snapshot okumasıyla ısıtır", async () => {
  const store = activeStore();
  await persistQuickObservationDraft(store, draftAInput);
  await persistQuickObservationDraft(store, {
    ...draftAInput,
    studentId: studentBId,
    rawText: "Kurgu çocuk B için önceden yüklenen taslak.",
  });
  let snapshotReads = 0;
  const originalReadSnapshot = store.readSnapshot.bind(store);
  store.readSnapshot = async () => {
    snapshotReads += 1;
    return originalReadSnapshot();
  };

  const drafts = await loadQuickObservationDraftCollection(store, {
    studentIds: [studentAId, studentBId, studentCId],
    planId,
    activityId,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
  });

  assert.equal(snapshotReads, 1);
  assert.equal(drafts.get(studentAId)?.rawText, draftAInput.rawText);
  assert.equal(
    drafts.get(studentBId)?.rawText,
    "Kurgu çocuk B için önceden yüklenen taslak.",
  );
  assert.equal(drafts.get(studentCId), null);
});

test("editördeki son değer tek atomik işlemde taslak ve değiştirilemez gözleme yazılır", async () => {
  const store = activeStore();
  const latestText = "Çocuk üç parçalı örüntüyü açıklayarak tamamladı.";

  const result = await finalizeQuickObservationDraft(store, {
    studentId: studentAId,
    planId,
    activityId,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    observationId,
    observedAt: "2026-09-02T07:05:00.000Z",
    now: new Date("2026-09-02T07:06:00.000Z"),
    draft: {
      rawText: latestText,
      context: draftAInput.context,
      childQuote: draftAInput.childQuote,
      observationType: draftAInput.observationType,
      categoryIds: draftAInput.categoryIds,
    },
  });

  assert.equal(result.observation.rawText, latestText);
  assert.equal(result.observation.rawTextImmutable, true);
  assert.equal(
    await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
      taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    }),
    null,
  );
  assert.equal(store.snapshot.observations.length, 1);
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

test("seçili çocuklara toplu hızlı gözlem ayrı taslak ve ayrı değişmez kanıt olarak atomik kaydedilir", async () => {
  const store = activeStore();
  const persisted = await persistQuickObservationDraftBatch(
    store,
    selectedChildrenDraftInput,
  );

  assert.equal(persisted.batchId, batchId);
  assert.equal(persisted.drafts.length, 2);
  assert.equal(new Set(persisted.drafts.map((draft) => draft.id)).size, 2);
  assert.deepEqual(
    persisted.drafts.map((draft) => draft.studentId),
    [studentAId, studentBId],
  );
  assert.ok(
    persisted.drafts.every(
      (draft) =>
        draft.batchId === batchId &&
        draft.captureScope === "selected-children" &&
        draft.rawText === selectedChildrenDraftInput.rawText,
    ),
  );

  const finalized = await finalizeQuickObservationDraftBatch(
    store,
    {
      studentIds: [studentAId, studentBId],
      planId,
      activityId,
      batchId,
      observationIds: {
        [studentAId]: bulkObservationAId,
        [studentBId]: bulkObservationBId,
      },
      observedAt: "2026-09-02T08:05:00.000Z",
      now: new Date("2026-09-02T08:06:00.000Z"),
    },
  );

  assert.equal(finalized.batchId, batchId);
  assert.equal(finalized.observations.length, 2);
  assert.equal(
    new Set(finalized.observations.map((observation) => observation.id)).size,
    2,
  );
  assert.deepEqual(
    finalized.observations.map((observation) => observation.studentIds),
    [[studentAId], [studentBId]],
  );
  assert.ok(
    finalized.observations.every(
      (observation) =>
        observation.batchId === batchId &&
        observation.captureScope === "selected-children" &&
        observation.observedAt === "2026-09-02T08:05:00.000Z" &&
        observation.rawTextImmutable === true,
    ),
  );
  assert.equal(
    await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
    }),
    null,
  );
  assert.equal(
    await loadQuickObservationDraft(store, {
      studentId: studentBId,
      planId,
      activityId,
    }),
    null,
  );
});

test("toplu hızlı gözlem mükerrer çocuk kimliklerini tekilleştirir ve en az iki farklı çocuk ister", async () => {
  const store = activeStore();
  const result = await persistQuickObservationDraftBatch(store, {
    ...selectedChildrenDraftInput,
    studentIds: [studentAId, studentAId, studentBId, studentBId],
  });
  assert.deepEqual(
    result.drafts.map((draft) => draft.studentId),
    [studentAId, studentBId],
  );

  const before = await store.readSnapshot();
  await assert.rejects(
    persistQuickObservationDraftBatch(store, {
      ...selectedChildrenDraftInput,
      studentIds: [studentAId, studentAId],
    }),
    /en az iki farklı aktif çocuk/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("toplu hızlı gözlem başka sınıf, pasif veya etkinliğe atanmamış tek bir çocukta bütünüyle reddedilir", async (t) => {
  const cases = [
    {
      name: "başka sınıf",
      mutate(store) {
        const student = store.snapshot.students.find(
          (record) => record.id === studentBId,
        );
        student.classroomId = "00000000-0000-4000-8000-000000000799";
      },
    },
    {
      name: "pasif öğrenci",
      mutate(store) {
        const student = store.snapshot.students.find(
          (record) => record.id === studentBId,
        );
        student.enrollmentStatus = "left";
      },
    },
    {
      name: "etkinliğe atanmamış öğrenci",
      mutate(store) {
        const activity = store.snapshot.activities.find(
          (record) => record.id === activityId,
        );
        activity.studentIds = [studentAId];
      },
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const store = activeStore();
      item.mutate(store);
      const before = await store.readSnapshot();
      await assert.rejects(
        persistQuickObservationDraftBatch(
          store,
          selectedChildrenDraftInput,
        ),
        /etkin sınıftaki çocuk|planlı takip açılan çocuğa/,
      );
      assert.deepEqual(await store.readSnapshot(), before);
    });
  }
});

test("toplu final uyuşmayan öğrenci taslaklarını kanıta dönüştürmez", async () => {
  const store = activeStore();
  await persistQuickObservationDraftBatch(
    store,
    selectedChildrenDraftInput,
  );
  const studentBDraft = store.snapshot.settings.find(
    (record) =>
      record.settingType === "quick-observation-draft" &&
      record.studentId === studentBId,
  );
  studentBDraft.rawText = "Uyuşmayan ayrı bir gözlem metni.";
  const before = await store.readSnapshot();

  await assert.rejects(
    finalizeQuickObservationDraftBatch(store, {
      studentIds: [studentAId, studentBId],
      planId,
      activityId,
      batchId,
      observedAt: "2026-09-02T08:05:00.000Z",
    }),
    /taslak içerikleri uyuşmuyor/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
  assert.equal(store.snapshot.observations.length, 0);
});

test("toplu final yazma hatasında hiçbir kanıt yazmaz ve bütün taslakları açık bırakır", async () => {
  const store = activeStore();
  await persistQuickObservationDraftBatch(
    store,
    selectedChildrenDraftInput,
  );
  const before = await store.readSnapshot();
  store.failPut = (collection, records) =>
    collection === "settings" &&
    records.length === 2 &&
    records.every((record) => typeof record.deletedAt === "string");

  await assert.rejects(
    finalizeQuickObservationDraftBatch(store, {
      studentIds: [studentAId, studentBId],
      planId,
      activityId,
      batchId,
      observationIds: {
        [studentAId]: bulkObservationAId,
        [studentBId]: bulkObservationBId,
      },
      observedAt: "2026-09-02T08:05:00.000Z",
    }),
    /transaction yazma hatası/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
  assert.equal(store.snapshot.observations.length, 0);
  assert.equal(
    store.snapshot.settings.filter(
      (record) =>
        record.settingType === "quick-observation-draft" &&
        typeof record.deletedAt !== "string",
    ).length,
    2,
  );
});

test("yarım kalan toplu hızlı gözlem aynı batch, çocuklar ve içerikle geri yüklenir", async () => {
  const store = activeStore();
  await persistQuickObservationDraft(store, draftAInput);
  const persisted = await persistQuickObservationDraftBatch(
    store,
    selectedChildrenDraftInput,
  );

  const restored = await loadQuickObservationDraftBatch(store, {
    planId,
    activityId,
  });

  assert.ok(restored);
  assert.equal(restored.batchId, persisted.batchId);
  assert.deepEqual(
    restored.drafts.map((draft) => draft.studentId).sort(),
    [studentAId, studentBId].sort(),
  );
  assert.ok(
    restored.drafts.every(
      (draft) =>
        draft.rawText === selectedChildrenDraftInput.rawText &&
        draft.context === selectedChildrenDraftInput.context &&
        draft.childQuote === selectedChildrenDraftInput.childQuote &&
        draft.observationType === selectedChildrenDraftInput.observationType &&
        draft.captureScope === "selected-children",
    ),
  );
  assert.equal(
    (await loadQuickObservationDraft(store, {
      studentId: studentAId,
      planId,
      activityId,
    }))?.rawText,
    draftAInput.rawText,
  );
});

test("toplu taslak aynı bağlamdaki bağımsız tekli taslakları ezmez ve finalden sonra açık bırakır", async () => {
  const store = activeStore();
  const singleDraftA = await persistQuickObservationDraft(store, {
    ...draftAInput,
    rawText: "A çocuğuna ait bağımsız tekli taslak.",
    now: new Date("2026-09-02T07:30:00.000Z"),
  });
  const singleDraftB = await persistQuickObservationDraft(store, {
    ...draftAInput,
    studentId: studentBId,
    rawText: "B çocuğuna ait bağımsız tekli taslak.",
    now: new Date("2026-09-02T07:31:00.000Z"),
  });

  const batch = await persistQuickObservationDraftBatch(
    store,
    selectedChildrenDraftInput,
  );
  const studentABatchDraft = batch.drafts.find(
    (draft) => draft.studentId === studentAId,
  );
  const studentBBatchDraft = batch.drafts.find(
    (draft) => draft.studentId === studentBId,
  );
  assert.notEqual(studentABatchDraft?.id, singleDraftA.id);
  assert.notEqual(studentBBatchDraft?.id, singleDraftB.id);

  const openStudentADrafts = store.snapshot.settings.filter(
    (record) =>
      record.settingType === "quick-observation-draft" &&
      record.studentId === studentAId &&
      typeof record.deletedAt !== "string",
  );
  assert.equal(openStudentADrafts.length, 2);
  assert.equal(
    openStudentADrafts.find((record) => record.id === singleDraftA.id)?.rawText,
    "A çocuğuna ait bağımsız tekli taslak.",
  );
  assert.equal(
    openStudentADrafts.find((record) => record.id === singleDraftA.id)?.batchId,
    undefined,
  );

  await finalizeQuickObservationDraftBatch(store, {
    studentIds: [studentAId, studentBId],
    planId,
    activityId,
    batchId,
    observationIds: {
      [studentAId]: bulkObservationAId,
      [studentBId]: bulkObservationBId,
    },
    observedAt: "2026-09-02T08:05:00.000Z",
    now: new Date("2026-09-02T08:06:00.000Z"),
  });

  const restoredSingleA = await loadQuickObservationDraft(store, {
    studentId: studentAId,
    planId,
    activityId,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
  });
  const restoredSingleB = await loadQuickObservationDraft(store, {
    studentId: studentBId,
    planId,
    activityId,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
  });
  assert.equal(restoredSingleA?.id, singleDraftA.id);
  assert.equal(restoredSingleA?.rawText, "A çocuğuna ait bağımsız tekli taslak.");
  assert.equal(restoredSingleB?.id, singleDraftB.id);
  assert.equal(restoredSingleB?.rawText, "B çocuğuna ait bağımsız tekli taslak.");
});

test("A+B+C toplu taslağı A+B'ye daralırken C tombstone olur ve A+B aynı kimlikle final olur", async () => {
  const store = activeStore();
  addStudentC(store);
  const first = await persistQuickObservationDraftBatch(store, {
    ...selectedChildrenDraftInput,
    studentIds: [studentAId, studentBId, studentCId],
  });
  const firstIds = Object.fromEntries(
    first.drafts.map((draft) => [draft.studentId, draft.id]),
  );

  const narrowed = await persistQuickObservationDraftBatch(store, {
    ...selectedChildrenDraftInput,
    studentIds: [studentAId, studentBId],
    rawText: "A ve B aynı olayı birlikte sürdürdü.",
    now: new Date("2026-09-02T08:01:00.000Z"),
  });

  assert.deepEqual(
    narrowed.drafts.map((draft) => draft.id),
    [firstIds[studentAId], firstIds[studentBId]],
  );
  const removedStudentCDraft = store.snapshot.settings.find(
    (record) => record.id === firstIds[studentCId],
  );
  assert.equal(removedStudentCDraft?.batchId, batchId);
  assert.equal(removedStudentCDraft?.studentId, studentCId);
  assert.equal(removedStudentCDraft?.deletedAt, "2026-09-02T08:01:00.000Z");
  assert.equal(
    removedStudentCDraft?.rawText,
    selectedChildrenDraftInput.rawText,
  );

  const finalized = await finalizeQuickObservationDraftBatch(store, {
    studentIds: [studentAId, studentBId],
    planId,
    activityId,
    batchId,
    observationIds: {
      [studentAId]: bulkObservationAId,
      [studentBId]: bulkObservationBId,
    },
    observedAt: "2026-09-02T08:05:00.000Z",
    now: new Date("2026-09-02T08:06:00.000Z"),
  });
  assert.deepEqual(
    finalized.observations.map((observation) => observation.studentIds),
    [[studentAId], [studentBId]],
  );
  assert.ok(
    finalized.observations.every(
      (observation) =>
        observation.batchId === batchId &&
        observation.rawText === "A ve B aynı olayı birlikte sürdürdü.",
    ),
  );
  assert.equal(
    store.snapshot.observations.some((observation) =>
      observation.studentIds.includes(studentCId),
    ),
    false,
  );
});

test("toplu taslak daraltma yazma hatasında üye veya içerik değiştirmez", async () => {
  const store = activeStore();
  addStudentC(store);
  await persistQuickObservationDraftBatch(store, {
    ...selectedChildrenDraftInput,
    studentIds: [studentAId, studentBId, studentCId],
  });
  const before = await store.readSnapshot();
  store.failPut = (collection, records) =>
    collection === "settings" &&
    records.some(
      (record) =>
        record.studentId === studentCId && typeof record.deletedAt === "string",
    );

  await assert.rejects(
    persistQuickObservationDraftBatch(store, {
      ...selectedChildrenDraftInput,
      studentIds: [studentAId, studentBId],
      rawText: "Bu değişiklik transaction ile geri alınmalıdır.",
      now: new Date("2026-09-02T08:01:00.000Z"),
    }),
    /transaction yazma hatas/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("tekli taslak ve final açık toplu taslağın kimliğini veya içeriğini değiştirmez", async () => {
  const store = activeStore();
  const batch = await persistQuickObservationDraftBatch(
    store,
    selectedChildrenDraftInput,
  );
  const batchDraftA = batch.drafts.find(
    (draft) => draft.studentId === studentAId,
  );

  const singleDraft = await persistQuickObservationDraft(store, {
    ...draftAInput,
    rawText: "Toplu kayıttan ayrı yeni tekli gözlem.",
    now: new Date("2026-09-02T08:01:00.000Z"),
  });
  assert.notEqual(singleDraft.id, batchDraftA?.id);

  const finalizedSingle = await finalizeQuickObservationDraft(store, {
    studentId: studentAId,
    planId,
    activityId,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    observationId,
    observedAt: "2026-09-02T08:02:00.000Z",
    now: new Date("2026-09-02T08:03:00.000Z"),
  });
  assert.equal(finalizedSingle.observation.rawText, singleDraft.rawText);

  const preservedBatchDraftA = store.snapshot.settings.find(
    (record) => record.id === batchDraftA?.id,
  );
  assert.equal(preservedBatchDraftA?.deletedAt, null);
  assert.equal(preservedBatchDraftA?.batchId, batchId);
  assert.equal(
    preservedBatchDraftA?.rawText,
    selectedChildrenDraftInput.rawText,
  );
});

test("aynı toplu grupta bir çocuk için iki açık taslak varsa yazmayı kapalı reddeder", async () => {
  const store = activeStore();
  const batch = await persistQuickObservationDraftBatch(
    store,
    selectedChildrenDraftInput,
  );
  const draftA = batch.drafts.find((draft) => draft.studentId === studentAId);
  assert.ok(draftA);
  store.snapshot.settings.push({
    ...structuredClone(draftA),
    id: "00000000-0000-4000-8000-000000000716",
  });
  const before = await store.readSnapshot();

  await assert.rejects(
    persistQuickObservationDraftBatch(store, {
      ...selectedChildrenDraftInput,
      rawText: "Çakışmalı gruba yazılmaması gereken değişiklik.",
      now: new Date("2026-09-02T08:01:00.000Z"),
    }),
    /aynı çocuk için birden fazla açık taslak/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("tekli gözlem commitinden sonraki refresh hatası save hatasına dönüşmez ve tek kayıt korunur", async () => {
  const store = activeStore();
  await persistQuickObservationDraft(store, {
    ...draftAInput,
    rawText: "Çocuk parçaları sırayla yan yana getirdi.",
  });
  const committed = await finalizeQuickObservationDraft(store, {
    studentId: studentAId,
    planId,
    activityId,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    observationId,
    observedAt: "2026-09-02T08:05:00.000Z",
  });

  const refresh = await verifyCommittedObservationRefresh(
    [committed.observation.id],
    async () => {
      throw new Error("Kurgu projection read hatası.");
    },
  );

  assert.deepEqual(refresh, {
    status: "refresh-required",
    reason: "read-failed",
    committedObservationIds: [observationId],
  });
  assert.equal(store.snapshot.observations.length, 1);
  assert.equal(store.snapshot.observations[0].id, observationId);
  assert.equal(store.snapshot.observations[0].rawTextImmutable, true);
});

test("yenileme exact commit kimliğini missing sonuçtan verified sonuca kadar kaybetmeden taşır", async () => {
  const emptyWorkspace = {
    civilDate: "2026-09-02",
    activities: [],
    pendingObservations: [],
    linkedObservations: [],
  };
  const missing = await verifyCommittedObservationRefresh(
    [observationId],
    async () => emptyWorkspace,
  );
  assert.deepEqual(missing, {
    status: "refresh-required",
    reason: "committed-record-missing",
    committedObservationIds: [observationId],
  });

  const verified = await verifyCommittedObservationRefresh(
    missing.committedObservationIds,
    async () => ({
      ...emptyWorkspace,
      pendingObservations: [{ id: observationId }],
    }),
  );
  assert.equal(verified.status, "verified");
  assert.deepEqual(
    verified.observations.map((observation) => observation.id),
    [observationId],
  );
});

test("toplu gözlem commitinden sonra projection kayıtları eksikse başarı korunur ve mükerrer yazılmaz", async () => {
  const store = activeStore();
  await persistQuickObservationDraftBatch(store, selectedChildrenDraftInput);
  const committed = await finalizeQuickObservationDraftBatch(store, {
    studentIds: [studentAId, studentBId],
    planId,
    activityId,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V1,
    batchId,
    observationIds: {
      [studentAId]: bulkObservationAId,
      [studentBId]: bulkObservationBId,
    },
    observedAt: "2026-09-02T08:05:00.000Z",
  });

  const refresh = await verifyCommittedObservationRefresh(
    committed.observations.map((observation) => observation.id),
    async () => ({
      civilDate: "2026-09-02",
      activities: [],
      pendingObservations: [],
      linkedObservations: [],
    }),
  );

  assert.equal(refresh.status, "refresh-required");
  assert.equal(refresh.reason, "committed-record-missing");
  assert.deepEqual(
    refresh.committedObservationIds,
    [bulkObservationAId, bulkObservationBId],
  );
  assert.deepEqual(
    store.snapshot.observations.map((observation) => observation.id).sort(),
    [bulkObservationAId, bulkObservationBId].sort(),
  );
});
