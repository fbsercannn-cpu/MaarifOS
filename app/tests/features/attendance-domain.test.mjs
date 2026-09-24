import assert from "node:assert/strict";
import test from "node:test";

import {
  attendanceRecordKey,
  civilDateInIstanbul,
  createAttendanceCompletionSetting,
  planAttendanceUpsert,
  readAttendanceCompletion,
  resolveAttendanceRecords,
} from "../../src/core/domain/attendance.ts";

const record = (overrides = {}) => ({
  id: crypto.randomUUID(),
  studentId: "student-1",
  status: "present",
  createdAt: "2026-07-20T07:00:00.000Z",
  updatedAt: "2026-07-20T07:00:00.000Z",
  civilDate: "2026-07-20",
  deletedAt: null,
  schemaVersion: 1,
  ...overrides,
});

test("aynı öğrencinin iki günü ayrı ana kayıtlar olarak çözülür", () => {
  const firstDay = record({ id: "attendance-day-1", civilDate: "2026-07-20" });
  const secondDay = record({ id: "attendance-day-2", civilDate: "2026-07-21" });

  const result = resolveAttendanceRecords([firstDay, secondDay]);

  assert.equal(result.latestByKey.size, 2);
  assert.equal(
    result.latestByKey.get(attendanceRecordKey("student-1", "2026-07-20"))?.id,
    "attendance-day-1",
  );
  assert.equal(
    result.latestByKey.get(attendanceRecordKey("student-1", "2026-07-21"))?.id,
    "attendance-day-2",
  );
  assert.equal(result.records.some((item) => item._MUKERRER_INCELE), false);
});

test("upsert mevcut kimliği, createdAt değerini ve ek alanları korur", () => {
  const existing = record({
    id: "attendance-existing",
    status: "present",
    civilDate: "2026-07-22",
    createdAt: "2026-07-22T05:00:00.000Z",
    updatedAt: "2026-07-22T05:00:00.000Z",
    note: "Korunacak kurgu not.",
  });

  const result = planAttendanceUpsert({
    students: [{ id: "student-1", status: "late" }],
    existingRecords: [existing],
    civilDate: "2026-07-22",
    now: new Date("2026-07-22T08:30:00.000Z"),
  });

  assert.equal(result.upserts.length, 1);
  assert.equal(result.upserts[0].id, "attendance-existing");
  assert.equal(result.upserts[0].createdAt, "2026-07-22T05:00:00.000Z");
  assert.equal(result.upserts[0].updatedAt, "2026-07-22T08:30:00.000Z");
  assert.equal(result.upserts[0].status, "late");
  assert.equal(result.upserts[0].note, "Korunacak kurgu not.");
});

test("mükerrer kaydı silmez; eski olanı ana kayda inceleme bayrağıyla bağlar", () => {
  const older = record({
    id: "attendance-older",
    civilDate: "2026-07-22",
    updatedAt: "2026-07-22T06:00:00.000Z",
  });
  const newer = record({
    id: "attendance-newer",
    civilDate: "2026-07-22",
    updatedAt: "2026-07-22T07:00:00.000Z",
  });

  const result = resolveAttendanceRecords([older, newer]);
  const duplicate = result.records.find((item) => item.id === "attendance-older");

  assert.equal(result.records.length, 2);
  assert.equal(
    result.latestByKey.get(attendanceRecordKey("student-1", "2026-07-22"))?.id,
    "attendance-newer",
  );
  assert.equal(duplicate?._MUKERRER_INCELE, true);
  assert.equal(duplicate?.duplicateOf, "attendance-newer");
});

test("yoklama tamamlanma ayarı yalnız kendi sivil gününde okunur ve güncellenir", () => {
  const dayOne = createAttendanceCompletionSetting({
    completed: true,
    civilDate: "2026-07-21",
    now: new Date("2026-07-21T12:00:00.000Z"),
  });
  const dayTwo = createAttendanceCompletionSetting({
    completed: false,
    civilDate: "2026-07-22",
    now: new Date("2026-07-22T12:00:00.000Z"),
  });

  assert.equal(readAttendanceCompletion([dayOne, dayTwo], "2026-07-21"), true);
  assert.equal(readAttendanceCompletion([dayOne, dayTwo], "2026-07-22"), false);
  assert.equal(readAttendanceCompletion([dayOne, dayTwo], "2026-07-23"), false);

  const updatedDayOne = createAttendanceCompletionSetting({
    completed: false,
    civilDate: "2026-07-21",
    existingSettings: [dayOne, dayTwo],
    now: new Date("2026-07-21T13:00:00.000Z"),
  });
  assert.equal(updatedDayOne.id, dayOne.id);
  assert.equal(updatedDayOne.createdAt, dayOne.createdAt);
  assert.equal(updatedDayOne.updatedAt, "2026-07-21T13:00:00.000Z");
});

test("İstanbul gece sınırında UTC anlarını doğru sivil güne ayırır", () => {
  assert.equal(
    civilDateInIstanbul(new Date("2026-07-21T20:59:59.999Z")),
    "2026-07-21",
  );
  assert.equal(
    civilDateInIstanbul(new Date("2026-07-21T21:00:00.000Z")),
    "2026-07-22",
  );
});
