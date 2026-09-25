import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  activateAcademicYearNow,
  loadTodayWorkspace,
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

test("aynı dönemdeki EÇE sınıfını arşivleyip yeni TYMM sınıfı oluşturur", async () => {
  const store = transitionStore();
  const currentClassroom = store.snapshot.classrooms[0];
  currentClassroom.curriculumProgram =
    "Millî Eğitim Bakanlığı 2024 Okul Öncesi Eğitim Programı";
  currentClassroom.curriculumProfileSnapshot = {
    framework: "meb_2024",
    programLabel: "Millî Eğitim Bakanlığı 2024 Okul Öncesi Eğitim Programı",
    catalogId: "meb-okul-oncesi-egitim-programi-2024-partial",
    sourceVersion: "2024",
    referenceOrigin: "official-catalog",
    officialCatalogVerified: true,
  };
  store.snapshot.plans.push({
    id: "00000000-0000-4000-8000-000000000718",
    academicYearId: oldYear,
    classroomId: oldClassroom,
    title: "Eski EÇE planı",
    createdAt: "2026-04-01T08:00:00.000Z",
    updatedAt: "2026-04-01T08:00:00.000Z",
    civilDate: "2026-04-01",
    deletedAt: null,
    schemaVersion: 1,
  });

  const context = await transitionAcademicYearConfiguration(store, {
    academicYear: {
      id: newYear,
      name: "2025–2026 Eğitim Yılı",
      startDate: "2025-09-01",
      endDate: "2026-08-31",
    },
    classroom: {
      id: newClassroom,
      name: "Kurgu Sınıfı",
      ageGroup: "60–72 ay",
      curriculumProgram: "Türkiye Yüzyılı Maarif Modeli",
      curriculumProfile: {
        framework: "tymm",
        programLabel: "Türkiye Yüzyılı Maarif Modeli",
        catalogId: "meb-tymm-okul-oncesi-2024",
        sourceVersion: "2024",
        referenceOrigin: "official-catalog",
        officialCatalogVerified: true,
      },
    },
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
    },
    carryStudentIds: [carriedStudent],
    closedOn: "2026-08-21",
    transitionKind: "same-period-curriculum",
    now: new Date("2026-08-21T11:00:00.000Z"),
  });

  assert.equal(context.status, "configured");
  assert.equal(context.academicYearId, newYear);
  assert.equal(context.academicYearStart, "2025-09-01");
  assert.equal(context.curriculumProfile?.framework, "tymm");
  const snapshot = await store.readSnapshot();
  assert.equal(
    snapshot.academicYears.find((record) => record.id === oldYear)?.status,
    "archived",
  );
  assert.equal(
    snapshot.classrooms.find((record) => record.id === oldClassroom)?.status,
    "archived",
  );
  assert.equal(
    snapshot.plans.find((record) => record.title === "Eski EÇE planı")
      ?.academicYearId,
    oldYear,
  );
  assert.equal(snapshot.observations[0].academicYearId, oldYear);
  const carried = snapshot.students.find(
    (record) => record.id === carriedStudent,
  );
  assert.equal(carried.enrollments[0].endedOn, "2026-08-21");
  assert.equal(carried.enrollments[1].startedOn, "2026-08-21");
  assert.equal(
    snapshot.auditLogs.at(-1)?.action,
    "curriculum-profile-transitioned",
  );
});

test("aynı dönem program geçişi tarih veya TYMM profili değişikse reddedilir", async () => {
  const store = transitionStore();
  await assert.rejects(
    transitionAcademicYearConfiguration(store, {
      ...transitionInput,
      transitionKind: "same-period-curriculum",
    }),
    /eğitim yılı adı ve tarihleri değiştirilemez/u,
  );
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

function preparationStore(failCollection = null) {
  const store = transitionStore(failCollection);
  const year = store.snapshot.academicYears[0];
  year.name = "2026–2027 Eğitim Yılı";
  year.startDate = "2026-09-01";
  year.endDate = "2027-08-31";
  for (const student of store.snapshot.students) {
    student.civilDate = "2026-09-01";
    student.enrollments[0].startedOn = "2026-09-01";
  }
  return store;
}

test("öğretmen hazırlanan dönemi bugün gerçek kayıt kullanımına açar", async () => {
  const store = preparationStore();
  const context = await activateAcademicYearNow(store, {
    now: new Date("2026-08-17T10:00:00.000Z"),
  });

  assert.equal(context.operationalStatus, "active");
  assert.equal(context.academicYearStart, "2026-09-01");
  assert.equal(context.academicYearOperationalStart, "2026-08-17");
  const snapshot = await store.readSnapshot();
  assert.equal(snapshot.academicYears[0].startDate, "2026-09-01");
  assert.equal(
    snapshot.academicYears[0].operationalStartDate,
    "2026-08-17",
  );
  assert.equal(
    snapshot.academicYears[0].operationalStartedAt,
    "2026-08-17T10:00:00.000Z",
  );
  assert.ok(
    snapshot.students.every(
      (student) => student.enrollments[0].startedOn === "2026-09-01",
    ),
  );
  assert.equal(
    snapshot.auditLogs.at(-1)?.action,
    "academic-year-activated-early",
  );
});

test("eski erken-başlatma kaydı dönem tarihini değiştirmeden operasyon alanına taşınır", async () => {
  const store = preparationStore();
  const year = store.snapshot.academicYears[0];
  year.startDate = "2026-08-17";
  year.officialStartDate = "2026-09-01";
  year.activatedEarlyAt = "2026-08-17T10:00:00.000Z";

  const workspace = await loadTodayWorkspace(store, {
    now: new Date("2026-08-17T11:00:00.000Z"),
  });

  assert.equal(workspace.classroom.status, "configured");
  assert.equal(workspace.classroom.academicYearStart, "2026-09-01");
  assert.equal(workspace.classroom.academicYearOperationalStart, "2026-08-17");
  assert.equal(workspace.classroom.operationalStatus, "active");
  const migrated = store.snapshot.academicYears[0];
  assert.equal(migrated.startDate, "2026-09-01");
  assert.equal(migrated.operationalStartDate, "2026-08-17");
  assert.equal(
    migrated.operationalStartedAt,
    "2026-08-17T10:00:00.000Z",
  );
  assert.equal(migrated.officialStartDate, undefined);
  assert.equal(migrated.activatedEarlyAt, undefined);
});

test("bugün başlatma yazma hatasında dönem ve öğrenci üyeliklerini değiştirmez", async () => {
  const store = preparationStore("academicYears");
  const before = await store.readSnapshot();
  await assert.rejects(
    activateAcademicYearNow(store, {
      now: new Date("2026-08-17T10:00:00.000Z"),
    }),
    /Kurgu geçiş hatası/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

