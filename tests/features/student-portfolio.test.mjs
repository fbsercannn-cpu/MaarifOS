import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  resolveStudentPortfolioWorkspace,
  savePortfolioSelection,
} from "../../src/features/portfolio/student-portfolio.ts";

class MemoryStore {
  constructor(snapshot) {
    this.snapshot = structuredClone(snapshot);
    this.pendingTransaction = Promise.resolve();
  }

  async transaction(mode, collections, task) {
    const execute = async () => {
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
    };
    const operation = this.pendingTransaction.then(execute, execute);
    this.pendingTransaction = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000000a01";
const classroomId = "00000000-0000-4000-8000-000000000a02";
const studentId = "00000000-0000-4000-8000-000000000a03";
const otherStudentId = "00000000-0000-4000-8000-000000000a04";
const septemberObservationId = "00000000-0000-4000-8000-000000000a05";
const januaryObservationId = "00000000-0000-4000-8000-000000000a06";
const otherStudentObservationId = "00000000-0000-4000-8000-000000000a07";

const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};

function activeSnapshot() {
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
    name: "Kurgu Portfolyo Sınıfı",
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
      id: studentId,
      displayName: "Kurgu Çocuk A",
      academicYearId: yearId,
      classroomId,
    },
    {
      ...base,
      id: otherStudentId,
      displayName: "Kurgu Çocuk B",
      academicYearId: yearId,
      classroomId,
    },
  );
  snapshot.observations.push(
    {
      ...base,
      id: septemberObservationId,
      academicYearId: yearId,
      classroomId,
      studentIds: [studentId],
      civilDate: "2026-09-15",
      observedAt: "2026-09-15T07:00:00.000Z",
      rawText: "Değişmeden kalacak kurgu Eylül kanıtı.",
      rawTextImmutable: true,
    },
    {
      ...base,
      id: januaryObservationId,
      academicYearId: yearId,
      classroomId,
      studentIds: [studentId],
      civilDate: "2027-01-12",
      observedAt: "2027-01-12T07:00:00.000Z",
      rawText: "Değişmeden kalacak kurgu Ocak kanıtı.",
      rawTextImmutable: true,
    },
    {
      ...base,
      id: otherStudentObservationId,
      academicYearId: yearId,
      classroomId,
      studentIds: [otherStudentId],
      civilDate: "2026-10-10",
      observedAt: "2026-10-10T07:00:00.000Z",
      rawText: "Başka çocuğun kurgu kanıtı.",
      rawTextImmutable: true,
    },
  );
  return snapshot;
}

test("yalnız kanıt bulunan aktif eğitim yılı aylarını YYYY-MM anahtarıyla gösterir", () => {
  const workspace = resolveStudentPortfolioWorkspace(activeSnapshot(), studentId);

  assert.deepEqual(
    workspace.monthFolders.map((folder) => [
      folder.key,
      folder.label,
      folder.observationCount,
    ]),
    [
      ["2026-09", "Eylül 2026", 1],
      ["2027-01", "Ocak 2027", 1],
    ],
  );
  assert.equal(
    workspace.monthFolders.some((folder) => folder.key === "2026-10"),
    false,
  );
  assert.equal(
    workspace.monthFolders.some((folder) => folder.key === "2026-12"),
    false,
  );
});

test("portfolyo notlarını kaynağı değiştirmeden ayrı kaydeder ve kaldırmayı tombstone yapar", async () => {
  const store = new MemoryStore(activeSnapshot());
  const sourceBefore = store.snapshot.observations.find(
    (record) => record.id === septemberObservationId,
  );
  const selection = await savePortfolioSelection(store, {
    studentId,
    observationId: septemberObservationId,
    selected: true,
    selectedBy: "teacher-child",
    teacherCaption: "Öğretmenin kanıta bağlı kısa yorumu.",
    childReflection: "Bunu seçtim çünkü kulemi kendim tamamladım.",
    familyContribution: "Evde de benzer yapılar kurduğunu paylaştılar.",
    now: new Date("2026-09-20T09:00:00.000Z"),
  });
  const sourceAfter = store.snapshot.observations.find(
    (record) => record.id === septemberObservationId,
  );

  assert.deepEqual(sourceAfter, sourceBefore);
  assert.equal(selection.selectedBy, "teacher-child");
  assert.equal(selection.deletedAt, null);
  assert.equal(
    resolveStudentPortfolioWorkspace(store.snapshot, studentId).selections.length,
    1,
  );

  const removed = await savePortfolioSelection(store, {
    studentId,
    observationId: septemberObservationId,
    selected: false,
    now: new Date("2026-09-21T09:00:00.000Z"),
  });
  assert.equal(removed.id, selection.id);
  assert.equal(removed.deletedAt, "2026-09-21T09:00:00.000Z");
  assert.equal(
    resolveStudentPortfolioWorkspace(store.snapshot, studentId).selections.length,
    0,
  );
});

test("eşzamanlı seçimlerde aynı kanıt için tek etkin portfolyo kaydı üretir", async () => {
  const store = new MemoryStore(activeSnapshot());
  const [first, second] = await Promise.all([
    savePortfolioSelection(store, {
      studentId,
      observationId: septemberObservationId,
      selected: true,
      now: new Date("2026-09-20T09:00:00.000Z"),
    }),
    savePortfolioSelection(store, {
      studentId,
      observationId: septemberObservationId,
      selected: true,
      now: new Date("2026-09-20T09:00:01.000Z"),
    }),
  ]);

  assert.equal(second.id, first.id);
  assert.equal(store.snapshot.portfolioSelections.length, 1);
  assert.equal(
    resolveStudentPortfolioWorkspace(store.snapshot, studentId).selections.length,
    1,
  );
});

test("başka çocuğun kanıtını portfolyoya eklemeyi reddeder", async () => {
  const store = new MemoryStore(activeSnapshot());
  await assert.rejects(
    () =>
      savePortfolioSelection(store, {
        studentId,
        observationId: otherStudentObservationId,
        selected: true,
      }),
    /yalnız bu sınıftaki çocuğun kanıtından/,
  );
  assert.equal(store.snapshot.portfolioSelections.length, 0);
});
