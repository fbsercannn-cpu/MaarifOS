import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  dashboardAttendanceCounts,
  loadDashboardState,
  persistAttendanceUpdate,
  persistStudentRosterChange,
} from "../../src/features/dashboard/dashboard-data.ts";

class MemoryStore {
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
      for (const collection of collections) this.snapshot[collection] = working[collection];
    }
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const academicYearId = "00000000-0000-4000-8000-000000000701";
const classroomId = "00000000-0000-4000-8000-000000000702";
const studentId = "00000000-0000-4000-8000-000000000703";

function configuredStore() {
  const snapshot = createEmptySnapshot();
  const base = {
    createdAt: "2026-08-03T06:00:00.000Z",
    updatedAt: "2026-08-03T06:00:00.000Z",
    civilDate: "2026-08-03",
    deletedAt: null,
    schemaVersion: 1,
  };
  snapshot.academicYears.push({
    ...base,
    id: academicYearId,
    name: "Kurgu Eğitim Yılı",
    startDate: "2026-08-01",
    endDate: "2027-07-31",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId,
    name: "Kurgu Sınıfı",
    status: "active",
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

test("yeni öğrenci sınıf üyesidir; günlük yoklama kaydı ve geldi sayısı oluşturmaz", async () => {
  const store = configuredStore();
  await persistStudentRosterChange(store, {
    student: {
      id: studentId,
      name: "Kurgu Öğrenci",
      status: "present",
      attendanceMarked: false,
    },
    archived: false,
  });

  const afterMembership = await store.readSnapshot();
  assert.equal(afterMembership.students.length, 1);
  assert.equal(afterMembership.attendanceRecords.length, 0);

  const dashboard = await loadDashboardState(store, {
    students: [],
    archivedStudents: [],
    observations: [],
    attendanceCompleted: false,
    attendanceCivilDate: "2026-08-03",
  });
  assert.equal(dashboard.students[0].attendanceMarked, false);
  assert.deepEqual(dashboardAttendanceCounts(dashboard.students), {
    present: 0,
    late: 0,
    absent: 0,
    marked: 0,
    total: 1,
  });
});

test("öğretmen yoklamayı işaretleyince aynı öğrenci günlük sayıya girer", async () => {
  const store = configuredStore();
  await persistStudentRosterChange(store, {
    student: {
      id: studentId,
      name: "Kurgu Öğrenci",
      status: "present",
      attendanceMarked: false,
    },
    archived: false,
  });
  await persistAttendanceUpdate(store, {
    students: [
      {
        id: studentId,
        name: "Kurgu Öğrenci",
        status: "present",
        attendanceMarked: true,
      },
    ],
    attendanceCivilDate: "2026-08-03",
  });

  const dashboard = await loadDashboardState(store, {
    students: [],
    archivedStudents: [],
    observations: [],
    attendanceCompleted: false,
    attendanceCivilDate: "2026-08-03",
  });
  assert.equal((await store.readSnapshot()).attendanceRecords.length, 1);
  assert.equal(dashboard.students[0].attendanceMarked, true);
  assert.deepEqual(dashboardAttendanceCounts(dashboard.students), {
    present: 1,
    late: 0,
    absent: 0,
    marked: 1,
    total: 1,
  });
});
