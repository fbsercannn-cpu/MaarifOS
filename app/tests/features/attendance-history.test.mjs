import assert from "node:assert/strict";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  formatAttendanceHistorySummary,
  loadStudentAttendanceHistory,
} from "../../src/features/attendance/attendance-history.ts";

const activeStudentId = "00000000-0000-4000-8000-000000000801";
const archivedStudentId = "00000000-0000-4000-8000-000000000802";
const otherStudentId = "00000000-0000-4000-8000-000000000803";

class MemoryStore {
  snapshot;

  constructor(snapshot) {
    this.snapshot = structuredClone(snapshot);
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  async transaction() {
    throw new Error("Salt okunur geçmiş sorgusu transaction açmamalı.");
  }

  close() {}
}

function student(id, active, enrollmentStatus) {
  return {
    id,
    displayName: active ? "Ada Kurgu" : "Deniz Kurgu",
    active,
    enrollmentStatus,
    createdAt: "2026-09-01T06:00:00.000Z",
    updatedAt: "2026-09-01T06:00:00.000Z",
    civilDate: "2026-09-01",
    deletedAt: null,
    schemaVersion: 5,
  };
}

function attendance(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    studentId: activeStudentId,
    status: "present",
    createdAt: "2026-09-02T06:00:00.000Z",
    updatedAt: "2026-09-02T06:00:00.000Z",
    civilDate: "2026-09-02",
    deletedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

function historyStore(records) {
  const snapshot = createEmptySnapshot();
  snapshot.students.push(
    student(activeStudentId, true, "active"),
    student(archivedStudentId, false, "completed"),
    student(otherStudentId, true, "active"),
  );
  snapshot.attendanceRecords.push(...records);
  return new MemoryStore(snapshot);
}

test("aktif ve arşivli öğrencinin günlük geçmişini yeni tarihten eskiye getirir", async () => {
  const store = historyStore([
    attendance({ id: "day-old", civilDate: "2026-09-03" }),
    attendance({
      id: "day-new",
      civilDate: "2026-09-05",
      updatedAt: "2026-09-05T09:00:00.000Z",
      status: "late",
    }),
    attendance({
      id: "archived-day",
      studentId: archivedStudentId,
      civilDate: "2026-06-10",
      updatedAt: "2026-06-10T09:00:00.000Z",
      status: "absent",
    }),
  ]);

  const activeHistory = await loadStudentAttendanceHistory(store, activeStudentId);
  const archivedHistory = await loadStudentAttendanceHistory(store, archivedStudentId);

  assert.deepEqual(activeHistory.map((record) => record.id), ["day-new", "day-old"]);
  assert.deepEqual(archivedHistory.map((record) => record.id), ["archived-day"]);
});

test("başka öğrenciyi, geçersiz kaydı ve silinmiş günlük görünümü dışarıda bırakır", async () => {
  const store = historyStore([
    attendance({ id: "valid-day", civilDate: "2026-09-04" }),
    attendance({ id: "other-day", studentId: otherStudentId }),
    attendance({ id: "invalid-day", civilDate: "2026-02-30" }),
    attendance({
      id: "deleted-day",
      civilDate: "2026-09-06",
      updatedAt: "2026-09-06T10:00:00.000Z",
      deletedAt: "2026-09-06T10:00:00.000Z",
    }),
  ]);

  const history = await loadStudentAttendanceHistory(store, activeStudentId);

  assert.deepEqual(history.map((record) => record.id), ["valid-day"]);
});

test("CS-001 mükerrerlerini silmeden latestByKey üzerinden günde tek ana kayıt gösterir", async () => {
  const store = historyStore([
    attendance({
      id: "older-duplicate",
      civilDate: "2026-09-07",
      updatedAt: "2026-09-07T06:00:00.000Z",
      status: "present",
    }),
    attendance({
      id: "canonical-latest",
      civilDate: "2026-09-07",
      updatedAt: "2026-09-07T07:00:00.000Z",
      status: "late",
      events: [
        {
          id: "00000000-0000-4000-8000-000000000810",
          schemaVersion: 1,
          type: "check_in",
          occurredAtUtc: "2026-09-07T06:05:00.000Z",
          civilDate: "2026-09-07",
          localTime: "09:05",
        },
      ],
    }),
  ]);

  const history = await loadStudentAttendanceHistory(store, activeStudentId);

  assert.equal(store.snapshot.attendanceRecords.length, 2);
  assert.deepEqual(history.map((record) => record.id), ["canonical-latest"]);
  assert.equal(history[0].status, "late");
  assert.deepEqual(history[0].events, [
    {
      id: "00000000-0000-4000-8000-000000000810",
      schemaVersion: 1,
      type: "check_in",
      occurredAtUtc: "2026-09-07T06:05:00.000Z",
      civilDate: "2026-09-07",
      localTime: "09:05",
    },
  ]);
  assert.equal(history[0]._MUKERRER_INCELE, undefined);
});

test("tarih aralığı ve limit seçeneklerini kanonik geçmişe uygular", async () => {
  const store = historyStore([
    attendance({ id: "day-1", civilDate: "2026-09-01" }),
    attendance({ id: "day-2", civilDate: "2026-09-02" }),
    attendance({ id: "day-3", civilDate: "2026-09-03" }),
    attendance({ id: "day-4", civilDate: "2026-09-04" }),
  ]);

  const history = await loadStudentAttendanceHistory(store, activeStudentId, {
    fromCivilDate: "2026-09-02",
    toCivilDate: "2026-09-04",
    limit: 2,
  });

  assert.deepEqual(history.map((record) => record.id), ["day-4", "day-3"]);
});

test("Türkçe sunucu temel durumu, olayları ve saatleri anlaşılır özetler", () => {
  const summary = formatAttendanceHistorySummary(
    attendance({
      status: "late",
      events: [
        {
          id: "00000000-0000-4000-8000-000000000811",
          schemaVersion: 1,
          type: "check_in",
          occurredAtUtc: "2026-09-08T06:12:00.000Z",
          civilDate: "2026-09-08",
          localTime: "09:12",
        },
        {
          id: "00000000-0000-4000-8000-000000000812",
          schemaVersion: 1,
          type: "early_departure",
          occurredAtUtc: "2026-09-08T08:30:00.000Z",
          civilDate: "2026-09-08",
          localTime: "11:30",
          reason: "Kurgu mazeret",
        },
        {
          id: "00000000-0000-4000-8000-000000000813",
          schemaVersion: 1,
          type: "partial_day",
          occurredAtUtc: "2026-09-08T08:31:00.000Z",
          civilDate: "2026-09-08",
          partialDayPeriod: "morning",
        },
      ],
    }),
  );

  assert.equal(
    summary,
    "Geç geldi · Giriş 09:12 · Erken ayrıldı 11:30 (Kurgu mazeret) · Kısmi gün (sabah)",
  );
});
