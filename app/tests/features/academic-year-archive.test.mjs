import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  archiveAcademicYear,
  buildStudentLongitudinalArchive,
  reenrollArchivedStudent,
} from "../../src/features/archive/academic-year-archive.ts";

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
        if (collection === this.failCollection) throw new Error("Kurgu arşiv hatası");
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
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};
const year1 = "00000000-0000-4000-8000-000000000301";
const class1 = "00000000-0000-4000-8000-000000000302";
const student = "00000000-0000-4000-8000-000000000303";

function seededYear() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: year1,
    name: "2026-2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: class1,
    academicYearId: year1,
    name: "Kurgu Güneş Sınıfı",
    schemaVersion: 2,
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: year1,
    classroomId: class1,
  });
  snapshot.students.push({
    ...base,
    id: student,
    displayName: "Kurgu Uzun Dönem Öğrencisi",
    academicYearId: year1,
    classroomId: class1,
    active: true,
    enrollmentStatus: "active",
  });
  snapshot.attendanceRecords.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000304",
    studentId: student,
    status: "present",
    academicYearId: year1,
    classroomId: class1,
  });
  snapshot.plans.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000305",
    title: "Kurgu yıllık kanıt planı",
    academicYearId: year1,
    classroomId: class1,
  });
  snapshot.activities.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000306",
    title: "Kurgu arşiv etkinliği",
    academicYearId: year1,
    classroomId: class1,
  });
  snapshot.observations.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000307",
    studentIds: [student],
    rawText: "Yıllar sonra da korunması gereken kurgu ham gözlem.",
    observedAt: "2026-09-01T07:00:00.000Z",
    academicYearId: year1,
    classroomId: class1,
  });
  return snapshot;
}

test("eğitim yılı kapanışında eğitimsel kayıtları değiştirmeden salt-okunur arşiv oluşturur", async () => {
  const store = new MemoryStore(seededYear());
  const before = await store.readSnapshot();
  const educationBefore = {
    attendanceRecords: before.attendanceRecords,
    observations: before.observations,
    activities: before.activities,
    plans: before.plans,
  };

  const first = await archiveAcademicYear(store, {
    academicYearId: year1,
    closedOn: "2027-06-30",
    now: new Date("2027-06-30T14:00:00.000Z"),
  });
  const afterFirst = await store.readSnapshot();
  const second = await archiveAcademicYear(store, {
    academicYearId: year1,
    closedOn: "2027-06-30",
    now: new Date("2027-07-01T09:00:00.000Z"),
  });
  const afterSecond = await store.readSnapshot();

  assert.deepEqual(
    {
      attendanceRecords: afterFirst.attendanceRecords,
      observations: afterFirst.observations,
      activities: afterFirst.activities,
      plans: afterFirst.plans,
    },
    educationBefore,
  );
  assert.equal(afterFirst.academicYears[0].status, "archived");
  assert.equal(afterFirst.classrooms[0].archiveStatus, "archived");
  assert.equal(afterFirst.students[0].id, student);
  assert.equal(afterFirst.students[0].enrollments.length, 1);
  assert.equal(afterFirst.students[0].enrollments[0].status, "completed");
  assert.equal(afterFirst.students[0].enrollments[0].endedOn, "2027-06-30");
  assert.equal(afterFirst.settings[0].deletedAt, "2027-06-30T14:00:00.000Z");
  assert.equal(afterFirst.auditLogs.length, 1);
  assert.equal(first.observationCount, 1);
  assert.deepEqual(second, first);
  assert.deepEqual(afterSecond, afterFirst);
});

test("aynı kalıcı öğrenci kimliğini yeni eğitim yılına ikinci üyelikle taşır", async () => {
  const store = new MemoryStore(seededYear());
  await archiveAcademicYear(store, {
    academicYearId: year1,
    closedOn: "2027-06-30",
    now: new Date("2027-06-30T14:00:00.000Z"),
  });
  const year2 = "00000000-0000-4000-8000-000000000311";
  const class2 = "00000000-0000-4000-8000-000000000312";
  await store.transaction("readwrite", ["academicYears", "classrooms"], async (transaction) => {
    await transaction.putMany("academicYears", [{
      ...base,
      id: year2,
      name: "2027-2028 Eğitim Yılı",
      startDate: "2027-09-01",
      endDate: "2028-06-30",
      status: "active",
    }]);
    await transaction.putMany("classrooms", [{
      ...base,
      id: class2,
      academicYearId: year2,
      name: "Kurgu Yeni Yıl Sınıfı",
      schemaVersion: 2,
    }]);
  });

  await reenrollArchivedStudent(store, {
    studentId: student,
    academicYearId: year2,
    classroomId: class2,
    startedOn: "2027-09-01",
    now: new Date("2027-09-01T06:00:00.000Z"),
  });
  const snapshot = await store.readSnapshot();

  assert.equal(snapshot.students.length, 1);
  assert.equal(snapshot.students[0].id, student);
  assert.equal(snapshot.students[0].enrollments.length, 2);
  assert.deepEqual(
    snapshot.students[0].enrollments.map((item) => item.status),
    ["completed", "active"],
  );
  assert.equal(snapshot.students[0].academicYearId, year2);
  assert.equal(snapshot.observations[0].academicYearId, year1);
});

test("uzun dönem öğrenci arşivi bütün yılları toplar ve başka çocuğun verisini dışarıda bırakır", async () => {
  const snapshot = seededYear();
  const otherStudent = "00000000-0000-4000-8000-000000000321";
  snapshot.students.push({
    ...base,
    id: otherStudent,
    displayName: "Başka Kurgu Çocuk",
    academicYearId: year1,
    classroomId: class1,
  });
  snapshot.observations.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000322",
    studentIds: [otherStudent],
    rawText: "Arşive girmemesi gereken başka çocuk gözlemi.",
    observedAt: "2026-09-01T08:00:00.000Z",
    academicYearId: year1,
    classroomId: class1,
  });
  const store = new MemoryStore(snapshot);
  await archiveAcademicYear(store, {
    academicYearId: year1,
    closedOn: "2027-06-30",
    now: new Date("2027-06-30T14:00:00.000Z"),
  });

  const archive = await buildStudentLongitudinalArchive(store, {
    studentId: student,
    now: new Date("2035-06-30T09:00:00.000Z"),
  });

  assert.equal(archive.studentId, student);
  assert.equal(archive.enrollments.length, 1);
  assert.deepEqual(
    archive.observations.map((record) => record.rawText),
    ["Yıllar sonra da korunması gereken kurgu ham gözlem."],
  );
  assert.ok(
    archive.observations.every((record) => record.studentIds.includes(student)),
  );
});

test("arşiv transaction hatasında hiçbir kaydı değiştirmez ve belirsiz kayıtta kapanışı durdurur", async () => {
  const failing = new MemoryStore(seededYear(), "classrooms");
  const before = await failing.readSnapshot();
  await assert.rejects(
    archiveAcademicYear(failing, {
      academicYearId: year1,
      closedOn: "2027-06-30",
      now: new Date("2027-06-30T14:00:00.000Z"),
    }),
    /Kurgu arşiv hatası/,
  );
  assert.deepEqual(await failing.readSnapshot(), before);

  const unresolvedSnapshot = seededYear();
  unresolvedSnapshot.activities.push({
    ...base,
    id: "00000000-0000-4000-8000-000000000323",
    title: "Kapsamı belirsiz eski etkinlik",
    legacyAssignmentStatus: "needs-review",
  });
  const unresolved = new MemoryStore(unresolvedSnapshot);
  await assert.rejects(
    archiveAcademicYear(unresolved, {
      academicYearId: year1,
      closedOn: "2027-06-30",
      now: new Date("2027-06-30T14:00:00.000Z"),
    }),
    /Kapsamı belirsiz eski kayıtlar/,
  );
});
