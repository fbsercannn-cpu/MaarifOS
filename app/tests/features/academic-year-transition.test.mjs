import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  transitionAcademicYearConfiguration,
} from "../../src/features/today/today-data.ts";

class MemoryStore {
  snapshot;
  failCollection;

  constructor(snapshot, failCollection = null) {
    this.snapshot = structuredClone(snapshot);
    this.failCollection = failCollection;
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        if (collection === this.failCollection) {
          throw new Error("Kurgu geçiş hatası");
        }
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

const oldYear = "00000000-0000-4000-8000-000000000711";
const oldClassroom = "00000000-0000-4000-8000-000000000712";
const newYear = "00000000-0000-4000-8000-000000000713";
const newClassroom = "00000000-0000-4000-8000-000000000714";
const carriedStudent = "00000000-0000-4000-8000-000000000715";
const completedStudent = "00000000-0000-4000-8000-000000000716";

function transitionStore(failCollection = null) {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    id: oldYear,
    name: "2025–2026 Eğitim Yılı",
    startDate: "2025-09-01",
    endDate: "2026-08-31",
    status: "active",
    createdAt: "2025-09-01T06:00:00.000Z",
    updatedAt: "2025-09-01T06:00:00.000Z",
    civilDate: "2025-09-01",
    deletedAt: null,
    schemaVersion: 1,
  });
  snapshot.classrooms.push({
    id: oldClassroom,
    academicYearId: oldYear,
    name: "Kurgu Sınıfı",
    ageGroup: "5 yaş",
    curriculumProgram: "Türkiye Yüzyılı Maarif Modeli",
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
      timeZone: "Europe/Istanbul",
    },
    createdAt: "2025-09-01T06:00:00.000Z",
    updatedAt: "2025-09-01T06:00:00.000Z",
    civilDate: "2025-09-01",
    deletedAt: null,
    schemaVersion: 2,
  });
  snapshot.settings.push({
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: oldYear,
    classroomId: oldClassroom,
    createdAt: "2025-09-01T06:00:00.000Z",
    updatedAt: "2025-09-01T06:00:00.000Z",
    civilDate: "2025-09-01",
    deletedAt: null,
    schemaVersion: 1,
  });
  for (const [id, name] of [
    [carriedStudent, "Ada Kurgu"],
    [completedStudent, "Bora Kurgu"],
  ]) {
    snapshot.students.push({
      id,
      displayName: name,
      firstName: name.split(" ")[0],
      lastName: "Kurgu",
      profileSchemaVersion: 5,
      academicYearId: oldYear,
      classroomId: oldClassroom,
      active: true,
      enrollmentStatus: "active",
      enrollments: [
        {
          id: crypto.randomUUID(),
          academicYearId: oldYear,
          classroomId: oldClassroom,
          startedOn: "2025-09-01",
          status: "active",
          schemaVersion: 1,
        },
      ],
      createdAt: "2025-09-01T06:00:00.000Z",
      updatedAt: "2025-09-01T06:00:00.000Z",
      civilDate: "2025-09-01",
      deletedAt: null,
      schemaVersion: 5,
    });
  }
  snapshot.observations.push({
    id: "00000000-0000-4000-8000-000000000717",
    studentIds: [carriedStudent],
    rawText: "Önceki eğitim yılı gözlemi.",
    rawTextImmutable: true,
    academicYearId: oldYear,
    classroomId: oldClassroom,
    createdAt: "2026-05-10T08:00:00.000Z",
    updatedAt: "2026-05-10T08:00:00.000Z",
    observedAt: "2026-05-10T08:00:00.000Z",
    civilDate: "2026-05-10",
    deletedAt: null,
    schemaVersion: 1,
  });
  return new MemoryStore(snapshot, failCollection);
}

const transitionInput = {
  academicYear: {
    id: newYear,
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-08-31",
  },
  classroom: {
    id: newClassroom,
    name: "Kurgu Sınıfı",
    ageGroup: "5 yaş",
    curriculumProgram: "Türkiye Yüzyılı Maarif Modeli",
  },
  schedule: {
    kind: "morning",
    startTime: "08:30",
    endTime: "12:30",
  },
  carryStudentIds: [carriedStudent],
  closedOn: "2026-08-31",
  now: new Date("2026-08-31T14:00:00.000Z"),
};

test("yeni eğitim yılı eski kapsamı bozmadan arşivler ve seçili öğrenciyi taşır", async () => {
  const store = transitionStore();
  const context = await transitionAcademicYearConfiguration(
    store,
    transitionInput,
  );
  assert.equal(context.status, "configured");
  assert.equal(context.academicYearId, newYear);
  const snapshot = await store.readSnapshot();
  assert.equal(
    snapshot.academicYears.find((record) => record.id === oldYear)?.status,
    "archived",
  );
  assert.equal(
    snapshot.settings.find(
      (record) => record.id === ACTIVE_CLASSROOM_SETTING_ID,
    )?.academicYearId,
    newYear,
  );
  const carried = snapshot.students.find(
    (record) => record.id === carriedStudent,
  );
  assert.equal(carried.academicYearId, newYear);
  assert.equal(carried.enrollmentStatus, "active");
  assert.equal(carried.enrollments.length, 2);
  assert.equal(carried.enrollments[0].status, "completed");
  const completed = snapshot.students.find(
    (record) => record.id === completedStudent,
  );
  assert.equal(completed.academicYearId, oldYear);
  assert.equal(completed.enrollmentStatus, "completed");
  assert.equal(snapshot.observations[0].academicYearId, oldYear);
  assert.equal(snapshot.observations[0].classroomId, oldClassroom);
});

test("geçiş yazma hatasında eski eğitim yılı ve öğrenciler atomik korunur", async () => {
  const store = transitionStore("students");
  const before = await store.readSnapshot();
  await assert.rejects(
    transitionAcademicYearConfiguration(store, transitionInput),
    /Kurgu geçiş hatası/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

