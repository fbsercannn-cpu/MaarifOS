import assert from "node:assert/strict";
import test from "node:test";

import {
  CLASSROOM_SCHEDULE_PRESETS,
  classroomScheduleLabel,
  isClassroomSchedule,
  normalizeClassroomSchedule,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  loadTodayWorkspace,
  resolveTodayWorkspace,
  saveClassroomConfiguration,
  setTodayActivityStatus,
} from "../../src/features/today/today-data.ts";

class MemoryStore {
  #snapshot;

  constructor(snapshot = createEmptySnapshot()) {
    this.#snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.#snapshot);
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
      for (const collection of collections) this.#snapshot[collection] = working[collection];
    }
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.#snapshot);
  }

  close() {}
}

const baseRecord = {
  createdAt: "2026-07-22T06:00:00.000Z",
  updatedAt: "2026-07-22T06:00:00.000Z",
  civilDate: "2026-07-22",
  deletedAt: null,
  schemaVersion: 1,
};

test("dört kalıcı çalışma düzenini doğrular ve öğretmen dilinde gösterir", () => {
  const schedules = [
    CLASSROOM_SCHEDULE_PRESETS.morning,
    CLASSROOM_SCHEDULE_PRESETS.afternoon,
    CLASSROOM_SCHEDULE_PRESETS.full_day,
    { kind: "custom", startTime: "10:15", endTime: "15:45" },
  ].map(normalizeClassroomSchedule);

  assert.ok(schedules.every(isClassroomSchedule));
  assert.deepEqual(
    schedules.map(classroomScheduleLabel),
    [
      "Sabah grubu · 08.30–12.30",
      "Öğle grubu · 13.00–17.00",
      "Tam gün · 08.30–16.30",
      "Özel saatler · 10.15–15.45",
    ],
  );
  assert.throws(
    () => normalizeClassroomSchedule({ kind: "morning", startTime: "8:30", endTime: "12:30" }),
    /SS:DD/,
  );
  assert.throws(
    () => normalizeClassroomSchedule({ kind: "custom", startTime: "15:45", endTime: "10:15" }),
    /Bitiş saati/,
  );
});

test("sınıf düzeni eksikse tahmin yürütmeden not_configured döner", () => {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...baseRecord,
    id: "00000000-0000-4000-8000-000000000101",
    name: "2026-2027",
  });
  snapshot.classrooms.push({
    ...baseRecord,
    id: "00000000-0000-4000-8000-000000000102",
    academicYearId: "00000000-0000-4000-8000-000000000101",
    name: "Kurgu Sınıfı",
  });

  assert.deepEqual(
    resolveTodayWorkspace(snapshot, new Date("2026-07-22T09:00:00.000Z")).classroom,
    { status: "not_configured" },
  );
});

test("sınıf kurulumunu atomik saklar ve Bugün çalışma alanına gerçek planı taşır", async () => {
  const store = new MemoryStore();
  const context = await saveClassroomConfiguration(store, {
    academicYear: {
      id: "00000000-0000-4000-8000-000000000111",
      name: "2026-2027 Eğitim Yılı",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
    },
    classroom: {
      id: "00000000-0000-4000-8000-000000000112",
      name: "Kurgu Güneş Sınıfı",
      ageGroup: "60–72 ay",
      curriculumProgram: "TYMM",
      curriculumCatalogLabel: "Katalog 2025",
    },
    schedule: CLASSROOM_SCHEDULE_PRESETS.morning,
    now: new Date("2026-07-22T06:30:00.000Z"),
  });
  assert.equal(context.status, "configured");
  assert.equal(context.status === "configured" ? context.scheduleLabel : "", "Sabah grubu · 08.30–12.30");

  const activityId = "00000000-0000-4000-8000-000000000113";
  await store.transaction("readwrite", ["activities", "observations", "plans"], async (transaction) => {
    await transaction.putMany("activities", [
      {
        ...baseRecord,
        id: activityId,
        title: "Suyun hareketini gözlemleme",
        startTime: "10:30",
        endTime: "11:00",
        subject: "Fen",
        curriculumConnection: "Bilimsel gözlem yapma · Görsel okuryazarlık",
        status: "in_progress",
        evidenceIds: ["kanıt-1", "kanıt-2"],
        maarifRefs: ["TYMM-FEN-1"],
      },
    ]);
    await transaction.putMany("observations", [
      {
        ...baseRecord,
        id: "00000000-0000-4000-8000-000000000114",
        rawText: "Kurgu gözlem notu.",
        studentIds: ["00000000-0000-4000-8000-000000000115"],
      },
    ]);
    await transaction.putMany("plans", [
      {
        ...baseRecord,
        id: "00000000-0000-4000-8000-000000000116",
        title: "Kurgu günlük plan",
        maarifRefs: ["TYMM-ORTAK-1"],
      },
    ]);
  });

  const workspace = await loadTodayWorkspace(store, {
    now: new Date("2026-07-22T07:45:00.000Z"),
  });
  assert.equal(workspace.classroom.status, "configured");
  assert.equal(workspace.currentActivity?.id, activityId);
  assert.equal(workspace.currentActivity?.evidenceCount, 2);
  assert.equal(
    workspace.currentActivity?.curriculumConnection,
    "Bilimsel gözlem yapma · Görsel okuryazarlık",
  );
  assert.equal(workspace.pendingEvidenceLinks, 1);
  assert.equal(workspace.linkedLearningGoalCount, 2);
  assert.equal(workspace.datedEvidenceCount, 1);
});

test("etkinlik durumunu güncellerken kimliği, createdAt değerini ve ek alanları korur", async () => {
  const snapshot = createEmptySnapshot();
  const activityId = "00000000-0000-4000-8000-000000000121";
  snapshot.activities.push({
    ...baseRecord,
    id: activityId,
    title: "Kurgu bahçe gözlemi",
    startTime: "11:15",
    status: "planned",
    customField: "korunmalı",
  });
  const store = new MemoryStore(snapshot);
  await saveClassroomConfiguration(store, {
    academicYear: {
      id: "00000000-0000-4000-8000-000000000122",
      name: "2026-2027 Eğitim Yılı",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
    },
    classroom: {
      id: "00000000-0000-4000-8000-000000000123",
      name: "Kurgu Etkinlik Sınıfı",
    },
    schedule: CLASSROOM_SCHEDULE_PRESETS.full_day,
    now: new Date("2026-07-22T08:00:00.000Z"),
  });

  await setTodayActivityStatus(store, activityId, "completed", {
    now: new Date("2026-07-22T08:30:00.000Z"),
  });
  const updated = (await store.readSnapshot()).activities[0];
  assert.equal(updated.id, activityId);
  assert.equal(updated.createdAt, baseRecord.createdAt);
  assert.equal(updated.updatedAt, "2026-07-22T08:30:00.000Z");
  assert.equal(updated.status, "completed");
  assert.equal(updated.customField, "korunmalı");
});
