import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAttendanceEvent,
  createAttendanceEvent,
  isAttendanceEvent,
  isAttendanceRecord,
  normalizeAttendanceEvent,
  planAttendanceUpsert,
  resolveAttendanceRecords,
  updateAttendanceEvent,
} from "../../src/core/domain/attendance.ts";

const checkIn = () =>
  createAttendanceEvent({
    type: "check_in",
    civilDate: "2026-08-03",
    now: new Date("2026-08-03T05:15:00.000Z"),
  });

const attendanceRecord = (overrides = {}) => ({
  id: "attendance-kurgu-1",
  studentId: "student-kurgu-1",
  status: "present",
  createdAt: "2026-08-03T05:00:00.000Z",
  updatedAt: "2026-08-03T05:00:00.000Z",
  civilDate: "2026-08-03",
  deletedAt: null,
  schemaVersion: 1,
  ...overrides,
});

test("olay oluşturma UUID, UTC audit zamanı ve İstanbul yerel saatini üretir", () => {
  const event = checkIn();

  assert.match(event.id, /^[0-9a-f-]{36}$/i);
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.type, "check_in");
  assert.equal(event.occurredAtUtc, "2026-08-03T05:15:00.000Z");
  assert.equal(event.civilDate, "2026-08-03");
  assert.equal(event.localTime, "08:15");
  assert.equal(isAttendanceEvent(event), true);
});

test("normalizasyon metinleri kırpar ve tanımsız alanı reddeder", () => {
  const event = normalizeAttendanceEvent({
    id: "00000000-0000-4000-8000-000000000301",
    schemaVersion: 1,
    type: "early_departure",
    occurredAtUtc: "2026-08-03T10:20:00.000Z",
    civilDate: "2026-08-03",
    localTime: "13:20",
    reason: "  Kurgu aile bildirimi  ",
    teacherNote: "  Kurgu öğretmen notu  ",
  });

  assert.equal(event.reason, "Kurgu aile bildirimi");
  assert.equal(event.teacherNote, "Kurgu öğretmen notu");
  assert.throws(
    () => normalizeAttendanceEvent({ ...event, unknownField: true }),
    /tanımsız alan/,
  );
});

test("kısmi gün ve mazeret olayları veri-minimum kurallarını uygular", () => {
  const morning = createAttendanceEvent({
    type: "partial_day",
    civilDate: "2026-08-03",
    partialDayPeriod: "morning",
    now: new Date("2026-08-03T06:00:00.000Z"),
  });
  const custom = createAttendanceEvent({
    type: "partial_day",
    civilDate: "2026-08-03",
    partialDayPeriod: "custom",
    fromLocalTime: "10:00",
    toLocalTime: "12:30",
    now: new Date("2026-08-03T07:00:00.000Z"),
  });
  const excuse = createAttendanceEvent({
    type: "excuse",
    civilDate: "2026-08-03",
    reason: "Kurgu izin kaydı",
    now: new Date("2026-08-03T07:30:00.000Z"),
  });

  assert.equal(morning.partialDayPeriod, "morning");
  assert.deepEqual(
    [custom.partialDayPeriod, custom.fromLocalTime, custom.toLocalTime],
    ["custom", "10:00", "12:30"],
  );
  assert.equal(excuse.reason, "Kurgu izin kaydı");
  assert.throws(
    () =>
      createAttendanceEvent({
        type: "partial_day",
        civilDate: "2026-08-03",
        partialDayPeriod: "custom",
        fromLocalTime: "12:30",
        toLocalTime: "10:00",
      }),
    /başlangıç.*bitiş/,
  );
  assert.throws(
    () =>
      createAttendanceEvent({
        type: "excuse",
        civilDate: "2026-08-03",
      }),
    /mazeret nedeni/,
  );
});

test("olay güncelleme kimlik ve audit zamanını korur", () => {
  const existing = createAttendanceEvent({
    type: "check_out",
    civilDate: "2026-08-03",
    localTime: "14:00",
    now: new Date("2026-08-03T11:00:00.000Z"),
  });
  const updated = updateAttendanceEvent(existing, {
    type: "early_departure",
    localTime: "13:45",
    reason: "  Kurgu düzeltme nedeni  ",
  });

  assert.equal(updated.id, existing.id);
  assert.equal(updated.occurredAtUtc, existing.occurredAtUtc);
  assert.equal(updated.civilDate, existing.civilDate);
  assert.equal(updated.type, "early_departure");
  assert.equal(updated.localTime, "13:45");
  assert.equal(updated.reason, "Kurgu düzeltme nedeni");
});

test("eski events alanı olmayan kayıt geçerlidir; yeni olaylar upsert ile kayıpsız taşınır", () => {
  const existing = attendanceRecord({
    id: "attendance-existing",
    note: "Korunacak kurgu not.",
  });
  const events = [checkIn()];

  assert.equal(isAttendanceRecord(existing), true);
  const plan = planAttendanceUpsert({
    students: [{ id: "student-kurgu-1", status: "late", events }],
    existingRecords: [existing],
    civilDate: "2026-08-03",
    now: new Date("2026-08-03T08:00:00.000Z"),
  });

  assert.equal(plan.upserts[0].id, "attendance-existing");
  assert.equal(plan.upserts[0].createdAt, existing.createdAt);
  assert.equal(plan.upserts[0].note, "Korunacak kurgu not.");
  assert.deepEqual(plan.upserts[0].events, events);
});

test("kayıt doğrulaması olay gününü ve CS-001 mükerrer zaman çizelgesini korur", () => {
  const event = checkIn();
  const invalidDay = attendanceRecord({
    events: [{ ...event, civilDate: "2026-08-04" }],
  });
  assert.equal(isAttendanceRecord(invalidDay), false);
  assert.throws(() => assertAttendanceEvent({ ...event, localTime: "25:00" }), /yerel saat/);

  const older = attendanceRecord({
    id: "attendance-older",
    events: [event],
  });
  const newer = attendanceRecord({
    id: "attendance-newer",
    updatedAt: "2026-08-03T09:00:00.000Z",
    events: [
      updateAttendanceEvent(event, {
        type: "early_departure",
        localTime: "12:30",
        reason: "Kurgu neden",
      }),
    ],
  });
  const resolved = resolveAttendanceRecords([older, newer]);

  assert.equal(resolved.records.length, 2);
  assert.deepEqual(
    resolved.records.find((record) => record.id === "attendance-older")?.events,
    older.events,
  );
  assert.equal(
    resolved.records.find((record) => record.id === "attendance-older")?._MUKERRER_INCELE,
    true,
  );
});
