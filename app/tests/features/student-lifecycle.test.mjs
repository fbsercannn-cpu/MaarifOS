import assert from "node:assert/strict";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  permanentlyDeleteArchivedStudent,
  previewPermanentStudentDeletion,
} from "../../src/features/students/student-lifecycle.ts";

class MemoryStore {
  snapshot;
  recoverySnapshots;

  constructor(snapshot) {
    this.snapshot = structuredClone(snapshot);
    this.recoverySnapshots = [
      {
        id: "00000000-0000-4000-8000-000000000731",
        envelope: { payload: { students: [{ id: studentId }] } },
      },
      {
        id: "00000000-0000-4000-8000-000000000732",
        envelope: { payload: { students: [{ id: otherStudentId }] } },
      },
    ];
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
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

  async saveRecoverySnapshot() {}
  async listRecoverySnapshots() {
    return [];
  }
  async getRecoverySnapshot() {
    return null;
  }
  async deleteRecoverySnapshot() {}
  async deleteRecoverySnapshotsContainingStudent(targetStudentId) {
    const before = this.recoverySnapshots.length;
    this.recoverySnapshots = this.recoverySnapshots.filter(
      (snapshot) =>
        !snapshot.envelope.payload.students.some(
          (student) => student.id === targetStudentId,
        ),
    );
    return before - this.recoverySnapshots.length;
  }

  close() {}
}

const studentId = "00000000-0000-4000-8000-000000000721";
const otherStudentId = "00000000-0000-4000-8000-000000000722";
const observationId = "00000000-0000-4000-8000-000000000723";
const mediaId = "00000000-0000-4000-8000-000000000724";

function lifecycleStore(active = false) {
  const snapshot = createEmptySnapshot();
  snapshot.students.push(
    {
      id: studentId,
      displayName: "Ada Kurgu",
      firstName: "Ada",
      lastName: "Kurgu",
      profileSchemaVersion: 5,
      active,
      enrollmentStatus: active ? "active" : "left",
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 5,
    },
    {
      id: otherStudentId,
      displayName: "Bora Kurgu",
      firstName: "Bora",
      lastName: "Kurgu",
      profileSchemaVersion: 5,
      active: true,
      enrollmentStatus: "active",
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 5,
    },
  );
  snapshot.attendanceRecords.push({
    id: "00000000-0000-4000-8000-000000000725",
    studentId,
    status: "present",
    createdAt: "2026-09-02T06:00:00.000Z",
    updatedAt: "2026-09-02T06:00:00.000Z",
    civilDate: "2026-09-02",
    deletedAt: null,
    schemaVersion: 1,
  });
  snapshot.observations.push({
    id: observationId,
    studentIds: [studentId, otherStudentId],
    rawText: "Paylaşımlı kurgu gözlem.",
    createdAt: "2026-09-02T06:00:00.000Z",
    updatedAt: "2026-09-02T06:00:00.000Z",
    civilDate: "2026-09-02",
    deletedAt: null,
    schemaVersion: 1,
  });
  snapshot.observationRevisions.push({
    id: "00000000-0000-4000-8000-000000000726",
    observationId,
    previousRawText: "Önceki kurgu gözlem.",
    changedAt: "2026-09-02T07:00:00.000Z",
    createdAt: "2026-09-02T07:00:00.000Z",
    updatedAt: "2026-09-02T07:00:00.000Z",
    civilDate: "2026-09-02",
    deletedAt: null,
    schemaVersion: 1,
  });
  snapshot.mediaAssets.push({
    id: mediaId,
    studentIds: [studentId, otherStudentId],
    createdAt: "2026-09-02T06:00:00.000Z",
    updatedAt: "2026-09-02T06:00:00.000Z",
    civilDate: "2026-09-02",
    deletedAt: null,
    schemaVersion: 1,
  });
  snapshot.portfolioSelections.push({
    id: "00000000-0000-4000-8000-000000000727",
    studentId: otherStudentId,
    itemType: "observation",
    itemId: observationId,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    order: 0,
    createdAt: "2026-09-02T06:00:00.000Z",
    updatedAt: "2026-09-02T06:00:00.000Z",
    civilDate: "2026-09-02",
    deletedAt: null,
    schemaVersion: 1,
  });
  snapshot.activities.push({
    id: "00000000-0000-4000-8000-000000000728",
    studentIds: [studentId, otherStudentId],
    targetAssignments: [
      { studentId, targetId: "hedef-a" },
      { studentId: otherStudentId, targetId: "hedef-a" },
    ],
    createdAt: "2026-09-02T06:00:00.000Z",
    updatedAt: "2026-09-02T06:00:00.000Z",
    civilDate: "2026-09-02",
    deletedAt: null,
    schemaVersion: 1,
  });
  snapshot.externalFeedback.push({
    id: "00000000-0000-4000-8000-000000000729",
    studentId,
    feedbackText: "Kurgu geri bildirim.",
    createdAt: "2026-09-02T06:00:00.000Z",
    updatedAt: "2026-09-02T06:00:00.000Z",
    civilDate: "2026-09-02",
    deletedAt: null,
    schemaVersion: 1,
  });
  return new MemoryStore(snapshot);
}

test("kalıcı silme etki özetini paylaşılan kayıtlarla birlikte gösterir", () => {
  const impact = previewPermanentStudentDeletion(
    lifecycleStore().snapshot,
    studentId,
  );
  assert.equal(impact.displayName, "Ada Kurgu");
  assert.equal(impact.attendanceCount, 1);
  assert.equal(impact.observationCount, 1);
  assert.equal(impact.sharedObservationCount, 1);
  assert.equal(impact.mediaCount, 1);
  assert.equal(impact.sharedMediaCount, 1);
  assert.equal(impact.reportCount, 1);
});

test("aktif öğrenci kalıcı silinemez ve yanlış ad onayı veriyi değiştirmez", async () => {
  const activeStore = lifecycleStore(true);
  await assert.rejects(
    permanentlyDeleteArchivedStudent(activeStore, {
      studentId,
      confirmationName: "Ada Kurgu",
    }),
    /önce öğrenciyi sınıftan ayırıp arşive taşıyın/,
  );
  const store = lifecycleStore();
  const before = await store.readSnapshot();
  await assert.rejects(
    permanentlyDeleteArchivedStudent(store, {
      studentId,
      confirmationName: "Yanlış Ad",
    }),
    /öğrencinin adını aynen yazın/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("arşivlenmiş öğrenciyi silerken ortak kanıtı ve diğer öğrencinin portfolyosunu korur", async () => {
  const store = lifecycleStore();
  const result = await permanentlyDeleteArchivedStudent(store, {
    studentId,
    confirmationName: "Ada Kurgu",
    now: new Date("2026-10-01T08:00:00.000Z"),
  });
  const snapshot = await store.readSnapshot();
  assert.ok(result.removedEntityCount >= 3);
  assert.equal(result.purgedRecoverySnapshotCount, 1);
  assert.equal(snapshot.students.some((record) => record.id === studentId), false);
  assert.equal(snapshot.attendanceRecords.length, 0);
  assert.deepEqual(snapshot.observations[0].studentIds, [otherStudentId]);
  assert.equal(snapshot.observationRevisions.length, 1);
  assert.deepEqual(snapshot.mediaAssets[0].studentIds, [otherStudentId]);
  assert.equal(snapshot.portfolioSelections.length, 1);
  assert.equal(snapshot.externalFeedback.length, 0);
  assert.deepEqual(snapshot.activities[0].studentIds, [otherStudentId]);
  assert.deepEqual(snapshot.activities[0].targetAssignments, [
    { studentId: otherStudentId, targetId: "hedef-a" },
  ]);
  assert.equal(
    JSON.stringify(snapshot).includes(studentId),
    false,
  );
  assert.deepEqual(
    store.recoverySnapshots.map((snapshot) => snapshot.id),
    ["00000000-0000-4000-8000-000000000732"],
  );
});
