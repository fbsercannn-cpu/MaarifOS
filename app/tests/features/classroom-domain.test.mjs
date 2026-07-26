import assert from "node:assert/strict";
import test from "node:test";

import {
  CLASSROOM_SCHEDULE_PRESETS,
  classroomScheduleLabel,
  isClassroomSchedule,
  normalizeClassroomSchedule,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { CURRICULUM_PROGRAM_LABELS } from "../../src/features/evidence/evidence-flow.ts";
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
      curriculumProfile: {
        framework: "tymm",
        programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
        catalogId: "ogretmen-beyani-tymm",
        sourceVersion: "2025.1",
        referenceOrigin: "teacher-declared",
        officialCatalogVerified: false,
      },
    },
    schedule: CLASSROOM_SCHEDULE_PRESETS.morning,
    now: new Date("2026-07-22T06:30:00.000Z"),
  });
  assert.equal(context.status, "configured");
  assert.equal(context.status === "configured" ? context.scheduleLabel : "", "Sabah grubu · 08.30–12.30");
  assert.equal(
    context.status === "configured" ? context.academicYearStart : "",
    "2026-09-01",
  );
  assert.equal(
    context.status === "configured" ? context.academicYearEnd : "",
    "2027-06-30",
  );
  assert.equal(
    context.status === "configured" ? context.curriculumProfile?.sourceVersion : "",
    "2025.1",
  );

  const preservedContext = await saveClassroomConfiguration(store, {
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
    now: new Date("2026-07-22T06:35:00.000Z"),
  });
  assert.equal(
    preservedContext.status === "configured"
      ? preservedContext.curriculumProfile?.catalogId
      : "",
    "ogretmen-beyani-tymm",
  );

  const activityId = "00000000-0000-4000-8000-000000000113";
  const dailyPlanId = "00000000-0000-4000-8000-000000000116";
  await store.transaction(
    "readwrite",
    ["activities", "observations", "plans", "evidenceCurriculumLinks"],
    async (transaction) => {
    await transaction.putMany("activities", [
      {
        ...baseRecord,
        id: activityId,
        planId: dailyPlanId,
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
        rawText: "Program bağlantısı kurulmuş kurgu gözlem notu.",
        rawTextImmutable: true,
        planId: dailyPlanId,
        activityId,
        observedAt: "2026-07-22T07:00:00.000Z",
        studentIds: ["00000000-0000-4000-8000-000000000115"],
        schemaVersion: 2,
      },
      {
        ...baseRecord,
        id: "00000000-0000-4000-8000-000000000117",
        rawText: "Program bağlantısı bekleyen kurgu gözlem notu.",
        rawTextImmutable: true,
        planId: dailyPlanId,
        activityId,
        observedAt: "2026-07-22T07:05:00.000Z",
        studentIds: ["00000000-0000-4000-8000-000000000115"],
        schemaVersion: 2,
      },
      {
        ...baseRecord,
        id: "00000000-0000-4000-8000-000000000118",
        rawText: "Eski tek alanlı kayıt D1 sayacına girmemeli.",
        studentIds: ["00000000-0000-4000-8000-000000000115"],
      },
      {
        ...baseRecord,
        id: "00000000-0000-4000-8000-000000000119",
        rawText: "Dünkü yapılandırılmış kayıt bugünün sayacına girmemeli.",
        rawTextImmutable: true,
        planId: dailyPlanId,
        activityId,
        observedAt: "2026-07-21T07:05:00.000Z",
        studentIds: ["00000000-0000-4000-8000-000000000115"],
        civilDate: "2026-07-21",
        schemaVersion: 2,
      },
    ]);
    await transaction.putMany("plans", [
      {
        ...baseRecord,
        id: dailyPlanId,
        title: "Kurgu günlük plan",
        maarifRefs: ["TYMM-ORTAK-1"],
      },
    ]);
    await transaction.putMany("evidenceCurriculumLinks", [
      {
        ...baseRecord,
        id: "00000000-0000-4000-8000-00000000011a",
        observationId: "00000000-0000-4000-8000-000000000114",
        referenceCode: "TYMM-BUGÜN-1",
        academicYearId: "00000000-0000-4000-8000-000000000111",
        classroomId: "00000000-0000-4000-8000-000000000112",
      },
      {
        ...baseRecord,
        id: "00000000-0000-4000-8000-00000000011b",
        observationId: "00000000-0000-4000-8000-000000000119",
        referenceCode: "TYMM-DÜN-1",
        academicYearId: "00000000-0000-4000-8000-000000000111",
        classroomId: "00000000-0000-4000-8000-000000000112",
        civilDate: "2026-07-21",
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
  assert.equal(workspace.linkedLearningGoalCount, 1);
  assert.equal(workspace.datedEvidenceCount, 2);
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

test("aynı sınıf ve gün içinde yalnız bir etkinliğin devam etmesine izin verir", async () => {
  const store = new MemoryStore();
  await saveClassroomConfiguration(store, {
    academicYear: {
      id: "00000000-0000-4000-8000-000000000131",
      name: "2026-2027 Eğitim Yılı",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
    },
    classroom: {
      id: "00000000-0000-4000-8000-000000000132",
      name: "Kurgu Tek Etkinlik Sınıfı",
    },
    schedule: CLASSROOM_SCHEDULE_PRESETS.full_day,
    now: new Date("2026-07-22T08:00:00.000Z"),
  });
  const firstActivityId = "00000000-0000-4000-8000-000000000133";
  const secondActivityId = "00000000-0000-4000-8000-000000000134";
  await store.transaction("readwrite", ["activities"], async (transaction) => {
    await transaction.putMany("activities", [
      {
        ...baseRecord,
        id: firstActivityId,
        academicYearId: "00000000-0000-4000-8000-000000000131",
        classroomId: "00000000-0000-4000-8000-000000000132",
        title: "Devam eden etkinlik",
        startTime: "09:00",
        status: "in_progress",
      },
      {
        ...baseRecord,
        id: secondActivityId,
        academicYearId: "00000000-0000-4000-8000-000000000131",
        classroomId: "00000000-0000-4000-8000-000000000132",
        title: "Sıradaki etkinlik",
        startTime: "10:00",
        status: "planned",
      },
    ]);
  });

  await assert.rejects(
    setTodayActivityStatus(store, secondActivityId, "in_progress", {
      now: new Date("2026-07-22T08:30:00.000Z"),
    }),
    /başka bir etkinlik devam ediyor/,
  );
  let activities = (await store.readSnapshot()).activities;
  assert.equal(
    activities.find((record) => record.id === secondActivityId)?.status,
    "planned",
  );

  await setTodayActivityStatus(store, firstActivityId, "completed", {
    now: new Date("2026-07-22T08:31:00.000Z"),
  });
  await setTodayActivityStatus(store, secondActivityId, "in_progress", {
    now: new Date("2026-07-22T08:32:00.000Z"),
  });
  activities = (await store.readSnapshot()).activities;
  assert.equal(
    activities.find((record) => record.id === secondActivityId)?.status,
    "in_progress",
  );
});
