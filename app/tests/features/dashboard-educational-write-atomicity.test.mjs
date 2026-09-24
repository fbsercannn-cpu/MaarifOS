import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  persistAttendanceUpdate,
  persistDashboardObservation,
} from "../../src/features/dashboard/dashboard-data.ts";

const ids = {
  academicYear: "00000000-0000-4000-8000-000000000801",
  classroomA: "00000000-0000-4000-8000-000000000802",
  classroomB: "00000000-0000-4000-8000-000000000803",
  studentA: "00000000-0000-4000-8000-000000000804",
  observation: "00000000-0000-4000-8000-000000000805",
};

const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};

function configuredSnapshot() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: ids.academicYear,
    name: "Kurgu 2026-2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push(
    {
      ...base,
      id: ids.classroomA,
      academicYearId: ids.academicYear,
      name: "Kurgu A Sınıfı",
      status: "active",
    },
    {
      ...base,
      id: ids.classroomB,
      academicYearId: ids.academicYear,
      name: "Kurgu B Sınıfı",
      status: "active",
    },
  );
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: ids.academicYear,
    classroomId: ids.classroomA,
  });
  snapshot.students.push({
    ...base,
    id: ids.studentA,
    displayName: "Kurgu A Çocuğu",
    academicYearId: ids.academicYear,
    classroomId: ids.classroomA,
  });
  return snapshot;
}

class ControlledStore {
  constructor(snapshot, staleSnapshot = snapshot) {
    this.snapshot = structuredClone(snapshot);
    this.staleSnapshot = structuredClone(staleSnapshot);
    this.readSnapshotCalls = 0;
    this.transactionCollections = [];
  }

  async transaction(mode, collections, task) {
    this.transactionCollections.push([...collections]);
    const allowed = new Set(collections);
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => {
        assert.ok(
          allowed.has(collection),
          `${collection} transaction kapsamına alınmadan okunamaz`,
        );
        return structuredClone(working[collection]);
      },
      putMany: async (collection, records) => {
        assert.ok(
          allowed.has(collection),
          `${collection} transaction kapsamına alınmadan yazılamaz`,
        );
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
        for (const record of records) {
          byId.set(record.id, structuredClone(record));
        }
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        assert.ok(
          allowed.has(collection),
          `${collection} transaction kapsamına alınmadan temizlenemez`,
        );
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
    this.readSnapshotCalls += 1;
    return structuredClone(this.staleSnapshot);
  }

  actualSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

function attendanceInput(overrides = {}) {
  return {
    students: [
      {
        id: ids.studentA,
        name: "Kurgu A Çocuğu",
        status: "present",
        attendanceMarked: true,
      },
    ],
    attendanceCivilDate: "2026-09-15",
    now: new Date("2026-09-15T09:00:00.000Z"),
    ...overrides,
  };
}

function observationInput(overrides = {}) {
  return {
    id: ids.observation,
    studentId: ids.studentA,
    rawText: "Kurgu çocuk iki nesneyi büyüklüğüne göre sıraladı.",
    createdAtUtc: "2026-09-15T09:10:00.000Z",
    ...overrides,
  };
}

test("yoklama eski kapsam okumasına güvenmez; bu sırada kapanan yılı aynı transaction içinde reddeder", async () => {
  const current = configuredSnapshot();
  current.academicYears[0].status = "archived";
  current.academicYears[0].closedOn = "2026-09-14";
  current.academicYears[0].archivedAt = "2026-09-14T14:00:00.000Z";
  const stale = configuredSnapshot();
  const store = new ControlledStore(current, stale);
  const before = store.actualSnapshot();

  await assert.rejects(
    persistAttendanceUpdate(store, attendanceInput({ attendanceCompleted: true })),
    /Bu eğitim yılı kapatıldığı için yoklama veya gözlem kaydedilemez/,
  );

  assert.equal(store.readSnapshotCalls, 0);
  assert.deepEqual(store.actualSnapshot(), before);
  assert.ok(
    store.transactionCollections[0].includes("academicYears") &&
      store.transactionCollections[0].includes("classrooms") &&
      store.transactionCollections[0].includes("settings"),
  );
});

test("gözlem eski aktif sınıf okumasına güvenmez; bu sırada değişen seçimi aynı transaction içinde görür", async () => {
  const current = configuredSnapshot();
  current.settings[0].classroomId = ids.classroomB;
  const stale = configuredSnapshot();
  const store = new ControlledStore(current, stale);
  const before = store.actualSnapshot();

  await assert.rejects(
    persistDashboardObservation(store, observationInput(), {
      now: new Date("2026-09-15T09:11:00.000Z"),
    }),
    /Gözlem yalnızca aktif sınıftaki bir öğrenciye bağlanabilir/,
  );

  assert.equal(store.readSnapshotCalls, 0);
  assert.deepEqual(store.actualSnapshot(), before);
  assert.ok(
    store.transactionCollections[0].includes("academicYears") &&
      store.transactionCollections[0].includes("classrooms") &&
      store.transactionCollections[0].includes("settings"),
  );
});

test("sona ermiş yılda gözlem yazımını iz bırakmadan reddeder", async () => {
  const current = configuredSnapshot();
  current.academicYears[0].endDate = "2026-09-14";
  const stale = configuredSnapshot();
  const store = new ControlledStore(current, stale);
  const before = store.actualSnapshot();

  await assert.rejects(
    persistDashboardObservation(
      store,
      observationInput({ createdAtUtc: "2026-09-14T09:10:00.000Z" }),
      { now: new Date("2026-09-15T09:11:00.000Z") },
    ),
    /Bu eğitim yılı 2026-09-14 tarihinde sona erdi/,
  );

  assert.equal(store.readSnapshotCalls, 0);
  assert.deepEqual(store.actualSnapshot(), before);
});

test("eğitim yılı dışındaki yoklama ve gözlem tarihlerini atomik olarak reddeder", async () => {
  const store = new ControlledStore(configuredSnapshot());
  const before = store.actualSnapshot();

  await assert.rejects(
    persistAttendanceUpdate(
      store,
      attendanceInput({ attendanceCivilDate: "2026-08-31" }),
    ),
    /Yoklama günü aktif eğitim yılının tarih aralığında olmalıdır/,
  );
  await assert.rejects(
    persistDashboardObservation(
      store,
      observationInput({ createdAtUtc: "2027-07-01T09:10:00.000Z" }),
      { now: new Date("2026-09-15T09:11:00.000Z") },
    ),
    /Gözlem günü aktif eğitim yılının tarih aralığında olmalıdır/,
  );

  assert.equal(store.readSnapshotCalls, 0);
  assert.deepEqual(store.actualSnapshot(), before);
});

test("aktif dönemde geçerli yoklama ve gözlem aynı atomik kapsam denetimiyle kaydedilir", async () => {
  const store = new ControlledStore(configuredSnapshot());

  await persistAttendanceUpdate(
    store,
    attendanceInput({ attendanceCompleted: true }),
  );
  await persistDashboardObservation(store, observationInput(), {
    now: new Date("2026-09-15T09:11:00.000Z"),
  });

  const snapshot = store.actualSnapshot();
  assert.equal(store.readSnapshotCalls, 0);
  assert.equal(snapshot.attendanceRecords.length, 1);
  assert.equal(snapshot.observations.length, 1);
  assert.equal(snapshot.attendanceRecords[0].classroomId, ids.classroomA);
  assert.equal(snapshot.observations[0].academicYearId, ids.academicYear);
  assert.ok(
    snapshot.settings.some(
      (record) =>
        record.settingType === "attendance-day-completion" &&
        record.attendanceCompleted === true,
    ),
  );
});
