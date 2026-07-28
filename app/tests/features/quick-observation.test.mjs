import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
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
  });
  snapshot.activities.push({
    ...base,
    id: activityId,
    planId,
    title: "Kurgu gözlem etkinliği",
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
  assert.deepEqual(result.observation.observationCategories, [
    "language-communication",
    "cognitive",
  ]);
  assert.equal(await loadQuickObservationDraft(store, { studentId: studentAId }), null);
  assert.notEqual(await loadQuickObservationDraft(store, { studentId: studentBId }), null);
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

  assert.equal(
    await discardQuickObservationDraft(store, {
      studentId: studentAId,
      now: new Date("2026-09-02T07:10:00.000Z"),
    }),
    true,
  );
  assert.equal(await loadQuickObservationDraft(store, { studentId: studentAId }), null);
  assert.equal(
    await discardQuickObservationDraft(store, {
      studentId: studentAId,
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
