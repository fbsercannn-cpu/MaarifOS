import assert from "node:assert/strict";
import test from "node:test";

import {
  loadDashboardState,
  migrateLegacyDashboardState,
} from "../../src/features/dashboard/dashboard-data.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("legacy kimlikleri UUID'ye taşır ve öğrenci-gözlem ilişkisini korur", () => {
  const result = migrateLegacyDashboardState(
    {
      students: [{ id: "s-01", name: "Kurgu Öğrenci", status: "present" }],
      observations: [
        {
          id: "obs-01",
          studentId: "s-01",
          rawText: "Korunması gereken kurgu ham gözlem.",
          createdAtUtc: "2026-07-22T07:15:00.000Z",
        },
      ],
      attendanceCompleted: true,
    },
    { students: [], observations: [], attendanceCompleted: false },
  );

  assert.match(result.students[0].id, uuid);
  assert.match(result.observations[0].id, uuid);
  assert.equal(result.observations[0].studentId, result.students[0].id);
  assert.equal(result.observations[0].rawText, "Korunması gereken kurgu ham gözlem.");
  assert.equal(result.attendanceCompleted, true);
});

test("ilişkisiz legacy ham gözlemi silmez; inceleme bayrağıyla karantinaya alır", () => {
  const result = migrateLegacyDashboardState(
    {
      students: [{ id: "s-01", name: "Kurgu Öğrenci", status: "present" }],
      observations: [
        {
          id: "obs-orphan",
          studentId: "missing-old-student",
          rawText: "İlişkisi eksik olsa da korunacak kurgu gözlem.",
          createdAtUtc: "2026-07-22T07:15:00.000Z",
        },
      ],
    },
    { students: [], observations: [], attendanceCompleted: false },
  );

  assert.equal(result.observations.length, 1);
  assert.match(result.observations[0].studentId, uuid);
  assert.equal(result.observations[0].requiresStudentReview, true);
  assert.equal(result.observations[0].legacyStudentId, "missing-old-student");
  assert.equal(result.observations[0].rawText, "İlişkisi eksik olsa da korunacak kurgu gözlem.");
});

test("UUID biçimli fakat bulunmayan legacy öğrenci ilişkisini de karantinaya alır", () => {
  const missingStudentId = "00000000-0000-4000-8000-000000000099";
  const result = migrateLegacyDashboardState(
    {
      students: [{
        id: "00000000-0000-4000-8000-000000000098",
        name: "Kurgu Mevcut Öğrenci",
        status: "present",
      }],
      observations: [{
        id: "00000000-0000-4000-8000-000000000097",
        studentId: missingStudentId,
        rawText: "UUID biçimi geçerli olsa da ilişkisi eksik kurgu gözlem.",
        createdAtUtc: "2026-07-22T07:20:00.000Z",
      }],
    },
    { students: [], observations: [], attendanceCompleted: false },
  );

  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].studentId, missingStudentId);
  assert.equal(result.observations[0].requiresStudentReview, true);
  assert.equal(result.observations[0].legacyStudentId, missingStudentId);
});

test("öğrenci üstündeki eski yoklamayı kendi tarihine atomik taşıyıp sonra temizler", async () => {
  const snapshot = createEmptySnapshot();
  const studentId = "00000000-0000-4000-8000-000000000051";
  snapshot.students.push({
    id: studentId,
    displayName: "Kurgu Öğrenci",
    attendanceStatus: "absent",
    createdAt: "2026-07-20T06:00:00.000Z",
    updatedAt: "2026-07-20T06:00:00.000Z",
    civilDate: "2026-07-20",
    deletedAt: null,
    schemaVersion: 1,
  });
  const store = {
    async readSnapshot() {
      return structuredClone(snapshot);
    },
    async transaction(_mode, _collections, task) {
      return task({
        async getAll(collection) {
          return structuredClone(snapshot[collection]);
        },
        async putMany(collection, records) {
          const byId = new Map(snapshot[collection].map((record) => [record.id, record]));
          for (const record of records) byId.set(record.id, structuredClone(record));
          snapshot[collection] = [...byId.values()];
        },
        async clear(collection) {
          snapshot[collection] = [];
        },
      });
    },
    close() {},
  };

  await loadDashboardState(store, {
    students: [],
    observations: [],
    attendanceCompleted: false,
    attendanceCivilDate: "2026-07-22",
  });

  assert.equal(snapshot.students[0].attendanceStatus, undefined);
  assert.equal(snapshot.attendanceRecords.length, 1);
  assert.equal(snapshot.attendanceRecords[0].studentId, studentId);
  assert.equal(snapshot.attendanceRecords[0].civilDate, "2026-07-20");
  assert.equal(snapshot.attendanceRecords[0].status, "absent");
});
