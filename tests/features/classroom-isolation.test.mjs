import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
  CLASSROOM_SCHEDULE_PRESETS,
  normalizeClassroomSchedule,
} from "../../src/core/domain/classroom.ts";
import { civilDateInIstanbul } from "../../src/core/domain/attendance.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { migrateLegacyClassroomScopes } from "../../src/core/migrations/classroom-scope-migration.ts";
import {
  loadDashboardState,
  persistAttendanceUpdate,
  persistDashboardObservation,
  persistStudentRosterChange,
} from "../../src/features/dashboard/dashboard-data.ts";
import {
  loadTodayWorkspace,
  setTodayActivityStatus,
} from "../../src/features/today/today-data.ts";

class MemoryStore {
  snapshot;
  failCollection;

  constructor(snapshot = createEmptySnapshot(), failCollection = null) {
    this.snapshot = structuredClone(snapshot);
    this.failCollection = failCollection;
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        if (collection === this.failCollection) {
          throw new Error("Kurgu transaction hatası");
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

const base = {
  createdAt: "2026-07-22T06:00:00.000Z",
  updatedAt: "2026-07-22T06:00:00.000Z",
  civilDate: "2026-07-22",
  deletedAt: null,
  schemaVersion: 1,
};
const yearA = "00000000-0000-4000-8000-000000000201";
const classA = "00000000-0000-4000-8000-000000000202";
const yearB = "00000000-0000-4000-8000-000000000203";
const classB = "00000000-0000-4000-8000-000000000204";
const studentA = "00000000-0000-4000-8000-000000000205";
const studentB = "00000000-0000-4000-8000-000000000206";

function addClass(snapshot, academicYearId, classroomId, name) {
  snapshot.academicYears.push({
    ...base,
    id: academicYearId,
    name: `${name} Eğitim Yılı`,
    startDate: "2026-09-01",
    endDate: "2027-06-30",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId,
    name,
    schemaVersion: 2,
    schedule: normalizeClassroomSchedule(CLASSROOM_SCHEDULE_PRESETS.morning),
  });
}

function selectClass(snapshot, academicYearId, classroomId) {
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId,
    classroomId,
  });
}

test("tek sınıftaki eski kayıtları atomik ve idempotent biçimde aynı kapsama atar", async () => {
  const snapshot = createEmptySnapshot();
  addClass(snapshot, yearA, classA, "Kurgu A Sınıfı");
  selectClass(snapshot, yearA, classA);
  snapshot.students.push({ ...base, id: studentA, displayName: "Kurgu A Öğrencisi" });
  snapshot.attendanceRecords.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000207",
    studentId: studentA,
    status: "present",
  });
  snapshot.observations.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000208",
    studentIds: [studentA],
    rawText: "Korunacak kurgu ham gözlem.",
    observedAt: "2026-07-22T06:15:00.000Z",
  });
  snapshot.activities.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000209",
    title: "Kurgu etkinlik",
    startTime: "09:00",
    status: "planned",
  });
  snapshot.plans.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000210",
    title: "Kurgu plan",
  });
  const store = new MemoryStore(snapshot);

  const first = await migrateLegacyClassroomScopes(store, {
    now: new Date("2026-07-22T07:00:00.000Z"),
  });
  const afterFirst = await store.readSnapshot();
  const second = await migrateLegacyClassroomScopes(store, {
    now: new Date("2026-07-22T08:00:00.000Z"),
  });
  const afterSecond = await store.readSnapshot();

  assert.equal(first.assigned, 5);
  assert.equal(first.quarantined, 0);
  for (const collection of ["students", "attendanceRecords", "observations", "activities", "plans"]) {
    assert.equal(afterFirst[collection][0].classroomId, classA);
    assert.equal(afterFirst[collection][0].academicYearId, yearA);
    assert.equal(afterFirst[collection][0].legacyAssignmentStatus, "assigned");
  }
  assert.equal(afterFirst.observations[0].rawText, "Korunacak kurgu ham gözlem.");
  assert.equal(second.assigned, 0);
  assert.deepEqual(afterSecond, afterFirst);
});

test("tek sınıfta dahi bilinmeyen UUID öğrenciye bağlı gözlemi tahminle atamaz", async () => {
  const snapshot = createEmptySnapshot();
  addClass(snapshot, yearA, classA, "Kurgu A Sınıfı");
  selectClass(snapshot, yearA, classA);
  snapshot.students.push({
    ...base,
    id: studentA,
    displayName: "Kurgu A Öğrencisi",
  });
  const missingStudentId = "00000000-0000-4000-8000-000000000299";
  snapshot.observations.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000298",
    studentIds: [missingStudentId],
    rawText: "İlişkisi kesinleşmeyen kurgu ham gözlem.",
  });
  const store = new MemoryStore(snapshot);

  const report = await migrateLegacyClassroomScopes(store, {
    now: new Date("2026-07-22T07:00:00.000Z"),
  });
  const migrated = await store.readSnapshot();

  assert.equal(report.assigned, 1);
  assert.equal(report.quarantined, 1);
  assert.equal(
    migrated.observations[0].legacyAssignmentStatus,
    "needs-review",
  );
  assert.equal(migrated.observations[0].classroomId, undefined);
  assert.equal(migrated.observations[0].studentIds[0], missingStudentId);
});

test("çok sınıfta tahmin yapmaz; bağımsız eski veriyi karantinaya alıp kesin öğrenci ilişkisini kullanır", async () => {
  const snapshot = createEmptySnapshot();
  addClass(snapshot, yearA, classA, "Kurgu A Sınıfı");
  addClass(snapshot, yearB, classB, "Kurgu B Sınıfı");
  selectClass(snapshot, yearA, classA);
  snapshot.students.push({
    ...base,
    id: studentA,
    displayName: "Kurgu A Öğrencisi",
    classroomId: classA,
    academicYearId: yearA,
  });
  snapshot.students.push({
    ...base,
    id: studentB,
    displayName: "Eski Belirsiz Öğrenci",
  });
  snapshot.observations.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000211",
    studentIds: [studentA],
    rawText: "İlişkiden kapsamı kesinleşen kurgu gözlem.",
    observedAt: "2026-07-22T06:20:00.000Z",
  });
  snapshot.activities.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000212",
    title: "Sınıfı belirsiz kurgu etkinlik",
    startTime: "10:00",
    status: "planned",
  });
  const store = new MemoryStore(snapshot);

  const report = await migrateLegacyClassroomScopes(store, {
    now: new Date("2026-07-22T07:00:00.000Z"),
  });
  const migrated = await store.readSnapshot();

  assert.equal(report.assigned, 1);
  assert.equal(report.quarantined, 2);
  assert.equal(migrated.observations[0].classroomId, classA);
  assert.equal(migrated.students[1].legacyAssignmentStatus, "needs-review");
  assert.equal(migrated.students[1].classroomId, undefined);
  assert.equal(migrated.activities[0].legacyAssignmentStatus, "needs-review");
});

test("aktif A sınıfında B öğrencisi, gözlemi, planı ve etkinliği görünmez", async () => {
  const snapshot = createEmptySnapshot();
  const currentCivilDate = civilDateInIstanbul(new Date());
  addClass(snapshot, yearA, classA, "Kurgu A Sınıfı");
  addClass(snapshot, yearB, classB, "Kurgu B Sınıfı");
  selectClass(snapshot, yearA, classA);
  snapshot.students.push(
    { ...base, id: studentA, displayName: "Kurgu A Öğrencisi", classroomId: classA, academicYearId: yearA },
    { ...base, id: studentB, displayName: "Kurgu B Öğrencisi", classroomId: classB, academicYearId: yearB },
  );
  snapshot.observations.push(
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000213",
      studentIds: [studentA],
      rawText: "A gözlemi",
      rawTextImmutable: true,
      planId: "00000000-0000-4000-8000-000000000217",
      activityId: "00000000-0000-4000-8000-000000000215",
      observedAt: "2026-07-22T06:30:00.000Z",
      classroomId: classA,
      academicYearId: yearA,
      schemaVersion: 2,
    },
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000214",
      studentIds: [studentB],
      rawText: "B gözlemi",
      rawTextImmutable: true,
      planId: "00000000-0000-4000-8000-000000000218",
      activityId: "00000000-0000-4000-8000-000000000216",
      observedAt: "2026-07-22T06:35:00.000Z",
      classroomId: classB,
      academicYearId: yearB,
      schemaVersion: 2,
    },
  );
  snapshot.activities.push(
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000215",
      planId: "00000000-0000-4000-8000-000000000217",
      title: "A etkinliği",
      startTime: "09:00",
      status: "in_progress",
      classroomId: classA,
      academicYearId: yearA,
    },
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000216",
      planId: "00000000-0000-4000-8000-000000000218",
      title: "B etkinliği",
      startTime: "09:15",
      status: "in_progress",
      classroomId: classB,
      academicYearId: yearB,
    },
  );
  snapshot.plans.push(
    { ...base, id: "00000000-0000-4000-8000-000000000217", title: "A planı", maarifRefs: ["A-1"], classroomId: classA, academicYearId: yearA },
    { ...base, id: "00000000-0000-4000-8000-000000000218", title: "B planı", maarifRefs: ["B-1"], classroomId: classB, academicYearId: yearB },
  );
  snapshot.evidenceCurriculumLinks.push(
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000219",
      observationId: "00000000-0000-4000-8000-000000000213",
      referenceCode: "A-1",
      confirmationMethod: "teacher-confirmed",
      classroomId: classA,
      academicYearId: yearA,
    },
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000220",
      observationId: "00000000-0000-4000-8000-000000000214",
      referenceCode: "B-1",
      confirmationMethod: "teacher-confirmed",
      classroomId: classB,
      academicYearId: yearB,
    },
  );
  snapshot.settings.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000222",
    settingType: "attendance-day-completion",
    attendanceCompleted: true,
    civilDate: currentCivilDate,
    classroomId: classB,
    academicYearId: yearB,
  });
  snapshot.attendanceRecords.push(
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000223",
      studentId: studentB,
      status: "absent",
      civilDate: currentCivilDate,
      classroomId: classB,
      academicYearId: yearB,
    },
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000224",
      studentId: studentB,
      status: "present",
      civilDate: currentCivilDate,
      updatedAt: "2026-07-22T05:00:00.000Z",
      classroomId: classB,
      academicYearId: yearB,
    },
  );
  const store = new MemoryStore(snapshot);

  const dashboard = await loadDashboardState(store, {
    students: [],
    archivedStudents: [],
    observations: [],
    attendanceCompleted: false,
    attendanceCivilDate: "2026-07-22",
  });
  const today = await loadTodayWorkspace(store, {
    now: new Date("2026-07-22T07:00:00.000Z"),
  });
  await persistAttendanceUpdate(store, {
    students: [{ id: studentA, name: "Kurgu A Öğrencisi", status: "present" }],
    attendanceCivilDate: currentCivilDate,
  });
  const attendanceAfterAUpdate = (await store.readSnapshot()).attendanceRecords
    .filter((record) => record.studentId === studentB);

  assert.deepEqual(dashboard.students.map((student) => student.id), [studentA]);
  assert.deepEqual(dashboard.observations.map((observation) => observation.rawText), ["A gözlemi"]);
  assert.equal(dashboard.attendanceCompleted, false);
  assert.deepEqual(today.planItems.map((activity) => activity.title), ["A etkinliği"]);
  assert.equal(today.linkedLearningGoalCount, 1);
  assert.equal(today.datedEvidenceCount, 1);
  assert.ok(
    attendanceAfterAUpdate.every(
      (record) => record.classroomId === classB && record.academicYearId === yearB,
    ),
  );
});

test("A sınıfı açıkken B kayıtlarını değiştirme girişimlerini veriyi bozmadan reddeder", async () => {
  const snapshot = createEmptySnapshot();
  addClass(snapshot, yearA, classA, "Kurgu A Sınıfı");
  addClass(snapshot, yearB, classB, "Kurgu B Sınıfı");
  selectClass(snapshot, yearA, classA);
  snapshot.students.push({
    ...base,
    id: studentB,
    displayName: "Kurgu B Öğrencisi",
    classroomId: classB,
    academicYearId: yearB,
  });
  const activityB = "00000000-0000-4000-8000-000000000219";
  snapshot.activities.push({
    ...base,
    id: activityB,
    title: "B etkinliği",
    startTime: "11:00",
    status: "planned",
    classroomId: classB,
    academicYearId: yearB,
  });
  const store = new MemoryStore(snapshot);
  const before = await store.readSnapshot();

  await assert.rejects(
    persistStudentRosterChange(store, {
      student: { id: studentB, name: "Değişmemeli", status: "present" },
      archived: false,
    }),
    /Başka bir sınıfa ait öğrenci/,
  );
  await assert.rejects(
    persistDashboardObservation(store, {
      id: "00000000-0000-4000-8000-000000000220",
      studentId: studentB,
      rawText: "Yazılmaması gereken kurgu gözlem.",
      createdAtUtc: "2026-07-22T07:00:00.000Z",
    }),
    /aktif sınıftaki bir öğrenci/,
  );
  await assert.rejects(
    setTodayActivityStatus(store, activityB, "completed", {
      now: new Date("2026-07-22T07:15:00.000Z"),
    }),
    /aktif sınıfta bulunamadı/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("kapsam göçünde ara yazım hatası olursa transaction bütünüyle geri alınır", async () => {
  const snapshot = createEmptySnapshot();
  addClass(snapshot, yearA, classA, "Kurgu A Sınıfı");
  snapshot.students.push({ ...base, id: studentA, displayName: "Kurgu A Öğrencisi" });
  snapshot.observations.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000221",
    studentIds: [studentA],
    rawText: "Transaction sınaması.",
    observedAt: "2026-07-22T07:00:00.000Z",
  });
  const store = new MemoryStore(snapshot, "observations");
  const before = await store.readSnapshot();

  await assert.rejects(
    migrateLegacyClassroomScopes(store, {
      now: new Date("2026-07-22T07:30:00.000Z"),
    }),
    /Kurgu transaction hatası/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});
