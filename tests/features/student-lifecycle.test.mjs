import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import {
  CURRICULUM_PROGRAM_LABELS,
  createPlanWithActivity,
} from "../../src/features/evidence/evidence-flow.ts";
import {
  permanentlyDeleteArchivedStudent,
  previewPermanentStudentDeletion,
} from "../../src/features/students/student-lifecycle.ts";
import { makeDevelopmentReportFixture } from "../fixtures/development-report-fixture.mjs";
import {
  approveDevelopmentReport,
  assertDevelopmentReportBackupIntegrity,
  getDevelopmentReportReadModel,
  saveDevelopmentReportDraft,
} from "../../src/features/development/development-report.ts";

class MemoryStore {
  snapshot;
  recoverySnapshots;
  recoveryPurgeCount = 0;
  beforeReadwriteTransaction;
  failAtomicBeforeCommit = false;

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
    if (mode === "readwrite" && this.beforeReadwriteTransaction) {
      const beforeTransaction = this.beforeReadwriteTransaction;
      this.beforeReadwriteTransaction = undefined;
      await beforeTransaction(this.snapshot);
    }
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

  async saveRecoverySnapshot(snapshot) {
    if (
      JSON.stringify(snapshot.envelope.payload) !==
      JSON.stringify(this.snapshot)
    ) {
      throw new Error(
        "Kurtarma snapshot kaydedilmedi; yerel veri snapshot oluşturulduktan sonra değişti.",
      );
    }
    this.recoverySnapshots.push(structuredClone(snapshot));
  }
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
    const removed = before - this.recoverySnapshots.length;
    this.recoveryPurgeCount += 1;
    return removed;
  }

  async transactionWithStudentRecoveryPurge(targetStudentId, task) {
    if (this.beforeReadwriteTransaction) {
      const beforeTransaction = this.beforeReadwriteTransaction;
      this.beforeReadwriteTransaction = undefined;
      await beforeTransaction(this.snapshot);
    }
    const workingSnapshot = structuredClone(this.snapshot);
    let workingRecoverySnapshots = structuredClone(this.recoverySnapshots);
    const transaction = {
      getAll: async (collection) =>
        structuredClone(workingSnapshot[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          workingSnapshot[collection].map((record) => [record.id, record]),
        );
        for (const record of records) {
          byId.set(record.id, structuredClone(record));
        }
        workingSnapshot[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        workingSnapshot[collection] = [];
      },
    };
    const result = await task(transaction);
    const before = workingRecoverySnapshots.length;
    workingRecoverySnapshots = workingRecoverySnapshots.filter(
      (snapshot) =>
        !snapshot.envelope.payload.students.some(
          (student) => student.id === targetStudentId,
        ),
    );
    if (this.failAtomicBeforeCommit) {
      throw new Error("Enjekte atomik commit hatası.");
    }
    this.snapshot = workingSnapshot;
    this.recoverySnapshots = workingRecoverySnapshots;
    this.recoveryPurgeCount += 1;
    return {
      result,
      purgedRecoverySnapshotCount: before - workingRecoverySnapshots.length,
    };
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
  const valueEvidenceBase = {
    academicYearId: "00000000-0000-4000-8000-000000000741",
    classroomId: "00000000-0000-4000-8000-000000000742",
    observationId,
    planId: "00000000-0000-4000-8000-000000000743",
    activityId: "00000000-0000-4000-8000-000000000728",
    evidenceRole: "supports",
    targetValueCode: "D4",
    targetIndicatorCode: "D4.1.1",
    teacherRationale: "Paylaşımlı gözlemdeki somut eylem bu bağı destekliyor.",
    confirmationMethod: "teacher-confirmed",
    confirmationScope: "observation-to-value-action-link",
    confirmedByActorKind: "local-teacher-identity",
    confirmedByActorId: "00000000-0000-4000-8000-000000000744",
    confirmedAt: "2026-09-02T08:00:00.000Z",
    provenance: {
      contentPackId: "maarifos-tymm-6072-2026-2027-v3",
      contentPackVersion: "3.0.0",
      contentReleaseId: "tymm-6072-2026-09-v3",
      contentManifestDigest: `sha256:${"a".repeat(64)}`,
      appliedActivityTemplateId: "tymm6072-sep-fair-sharing",
      appliedValuesDesignId: "tymm6072-sep-fair-sharing:values:v1",
      appliedValuesDesignVersion: "1.0.0",
      appliedValuesDesignDigest: `sha256:${"b".repeat(64)}`,
    },
    supersedesLinkId: null,
    createdAt: "2026-09-02T08:00:00.000Z",
    updatedAt: "2026-09-02T08:00:00.000Z",
    civilDate: "2026-09-02",
    deletedAt: null,
    schemaVersion: 1,
  };
  snapshot.valueEvidenceLinks.push(
    {
      ...valueEvidenceBase,
      id: "00000000-0000-4000-8000-000000000745",
      studentId,
    },
    {
      ...valueEvidenceBase,
      id: "00000000-0000-4000-8000-000000000746",
      studentId: otherStudentId,
    },
  );
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

const scopedAcademicYearId = "00000000-0000-4000-8000-000000000751";
const scopedClassroomId = "00000000-0000-4000-8000-000000000752";
const scopedPlanId = "00000000-0000-4000-8000-000000000753";
const scopedActivityId = "00000000-0000-4000-8000-000000000754";
const scopedProfile = {
  framework: "tymm",
  programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
  catalogId: "tymm-2024-okul-oncesi-v1",
  sourceVersion: "2024.1",
  referenceOrigin: "teacher-declared",
  officialCatalogVerified: false,
};

function scopedSingleStudentStore() {
  const snapshot = createEmptySnapshot();
  const base = {
    createdAt: "2026-09-01T06:00:00.000Z",
    updatedAt: "2026-09-01T06:00:00.000Z",
    civilDate: "2026-09-01",
    deletedAt: null,
    schemaVersion: 1,
  };
  snapshot.academicYears.push({
    ...base,
    id: scopedAcademicYearId,
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: scopedClassroomId,
    academicYearId: scopedAcademicYearId,
    name: "Tek Öğrencili Silme Sınıfı",
    curriculumProfileSnapshot: scopedProfile,
    schemaVersion: 2,
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: scopedAcademicYearId,
    classroomId: scopedClassroomId,
  });
  snapshot.students.push({
    ...base,
    id: studentId,
    displayName: "Ada Kurgu",
    firstName: "Ada",
    lastName: "Kurgu",
    profileSchemaVersion: 5,
    academicYearId: scopedAcademicYearId,
    classroomId: scopedClassroomId,
    active: true,
    enrollmentStatus: "active",
    schemaVersion: 5,
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
  assert.equal(impact.valueEvidenceLinkCount, 1);
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

test("atomik recovery temizleme yeteneği olmayan depo kalıcı silmeyi başlatamaz", async () => {
  const store = lifecycleStore();
  const legacyStore = {
    transaction: store.transaction.bind(store),
    readSnapshot: store.readSnapshot.bind(store),
    close: store.close.bind(store),
  };
  const before = await store.readSnapshot();

  await assert.rejects(
    permanentlyDeleteArchivedStudent(legacyStore, {
      studentId,
      confirmationName: "Ada Kurgu",
    }),
    /ana veriyle kurtarma snapshot'larını tek işlemde/,
  );

  assert.deepEqual(await store.readSnapshot(), before);
});

test("arşivlenmiş öğrenciyi silerken ortak kanıtı ve diğer öğrencinin portfolyosunu korur", async () => {
  const store = lifecycleStore();
  const preservedValueEvidenceLink = structuredClone(
    store.snapshot.valueEvidenceLinks.find(
      (record) => record.studentId === otherStudentId,
    ),
  );
  const result = await permanentlyDeleteArchivedStudent(store, {
    studentId,
    confirmationName: "Ada Kurgu",
    now: new Date("2026-10-01T08:00:00.000Z"),
  });
  const snapshot = await store.readSnapshot();
  assert.ok(result.removedEntityCount >= 3);
  assert.equal(result.purgedRecoverySnapshotCount, 1);
  assert.equal(store.recoveryPurgeCount, 1);
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
  assert.deepEqual(snapshot.valueEvidenceLinks, [preservedValueEvidenceLink]);
  assert.equal(
    JSON.stringify(snapshot).includes(studentId),
    false,
  );
  assert.deepEqual(
    store.recoverySnapshots.map((snapshot) => snapshot.id),
    ["00000000-0000-4000-8000-000000000732"],
  );
});

test("tek üyeli etkinlik kalıcı silmede kanonik tombstone ve boş assignment olur", async () => {
  const store = scopedSingleStudentStore();
  const curriculumTarget = curriculumTargetsForProfile(scopedProfile).find(
    (target) => target.referenceCode === "FAB.1",
  );
  assert.ok(curriculumTarget);
  await createPlanWithActivity(store, {
    civilDate: "2026-09-02",
    planId: scopedPlanId,
    planTitle: "Tek öğrencili kurgu plan",
    activityId: scopedActivityId,
    activityTitle: "Tek öğrencili kurgu etkinlik",
    startTime: "09:00",
    curriculumProfile: scopedProfile,
    curriculumTargets: [curriculumTarget],
    assignmentMode: "selected-students",
    studentIds: [studentId],
    now: new Date("2026-09-02T06:00:00.000Z"),
  });
  const archivedStudent = store.snapshot.students.find(
    (record) => record.id === studentId,
  );
  archivedStudent.active = false;
  archivedStudent.enrollmentStatus = "left";
  archivedStudent.updatedAt = "2026-09-30T08:00:00.000Z";

  await permanentlyDeleteArchivedStudent(store, {
    studentId,
    confirmationName: "Ada Kurgu",
    now: new Date("2026-10-01T08:00:00.000Z"),
  });
  const snapshot = await store.readSnapshot();
  const activity = snapshot.activities.find(
    (record) => record.id === scopedActivityId,
  );
  const plan = snapshot.plans.find((record) => record.id === scopedPlanId);
  assert.ok(activity);
  assert.ok(plan);
  assert.deepEqual(activity.studentIds, []);
  assert.deepEqual(activity.targetAssignments, []);
  assert.equal(activity.assignmentMode, undefined);
  assert.equal(activity.assignmentSnapshotAt, undefined);
  assert.equal(activity.coverageStatus, undefined);
  assert.equal(activity.updatedAt, "2026-10-01T08:00:00.000Z");
  assert.equal(activity.deletedAt, "2026-10-01T08:00:00.000Z");
  assert.deepEqual(plan.studentIds, []);
  assert.equal(plan.assignmentMode, undefined);
  assert.equal(plan.assignmentSnapshotAt, undefined);
  assert.equal(plan.coverageStatus, undefined);
  assert.equal(plan.deletedAt, "2026-10-01T08:00:00.000Z");
  assert.equal(JSON.stringify(snapshot).includes(studentId), false);
});

test("kalıcı silme ilgili kayıt zaman çizgisinden eskiyse ana veri ve recovery değişmez", async () => {
  const store = lifecycleStore();
  const relatedActivity = store.snapshot.activities.find(
    (record) => record.studentIds?.includes(studentId),
  );
  assert.ok(relatedActivity);
  relatedActivity.updatedAt = "2026-10-02T08:00:00.000Z";
  const snapshotBefore = await store.readSnapshot();
  const recoveryBefore = structuredClone(store.recoverySnapshots);

  await assert.rejects(
    permanentlyDeleteArchivedStudent(store, {
      studentId,
      confirmationName: "Ada Kurgu",
      now: new Date("2026-10-01T08:00:00.000Z"),
    }),
    /ilişkili kayıtların son değişiklik zamanından eski/,
  );

  assert.deepEqual(await store.readSnapshot(), snapshotBefore);
  assert.deepEqual(store.recoverySnapshots, recoveryBefore);
  assert.equal(store.recoveryPurgeCount, 0);
});

test("silmeden önce kazanan recovery writer aynı atomik commit içinde temizlenir", async () => {
  const store = lifecycleStore();
  const staleSnapshot = {
    id: "00000000-0000-4000-8000-000000000733",
    envelope: { payload: structuredClone(store.snapshot) },
  };
  await store.saveRecoverySnapshot(staleSnapshot);

  const result = await permanentlyDeleteArchivedStudent(store, {
    studentId,
    confirmationName: "Ada Kurgu",
    now: new Date("2026-10-01T08:00:00.000Z"),
  });

  assert.equal(result.purgedRecoverySnapshotCount, 2);
  assert.equal(store.recoveryPurgeCount, 1);
  assert.equal(JSON.stringify(store.recoverySnapshots).includes(studentId), false);
  assert.equal(JSON.stringify(store.recoverySnapshots).includes("Ada Kurgu"), false);
});

test("silme transaction'ı durum veya ad drift'i nedeniyle reddedilirse recovery snapshot korunur", async () => {
  const cases = [
    {
      mutate(student) {
        student.active = true;
        student.enrollmentStatus = "active";
      },
      expectedError: /arşiv durumu değişti/,
    },
    {
      mutate(student) {
        student.displayName = "Ada Değişti";
        student.lastName = "Değişti";
      },
      expectedError: /onayı öğrenci adıyla uyuşmuyor/,
    },
  ];

  for (const scenario of cases) {
    const store = lifecycleStore();
    const recoveryBefore = structuredClone(store.recoverySnapshots);
    store.beforeReadwriteTransaction = async (snapshot) => {
      const student = snapshot.students.find((record) => record.id === studentId);
      scenario.mutate(student);
    };

    await assert.rejects(
      permanentlyDeleteArchivedStudent(store, {
        studentId,
        confirmationName: "Ada Kurgu",
        now: new Date("2026-10-01T08:00:00.000Z"),
      }),
      scenario.expectedError,
    );

    assert.equal(store.recoveryPurgeCount, 0);
    assert.deepEqual(store.recoverySnapshots, recoveryBefore);
  }
});

test("kalıcı silme önce kazanırsa eski preimage recovery writer tarafından geri yazılamaz", async () => {
  const store = lifecycleStore();
  const staleSnapshot = {
    id: "00000000-0000-4000-8000-000000000734",
    envelope: { payload: structuredClone(store.snapshot) },
  };

  await permanentlyDeleteArchivedStudent(store, {
    studentId,
    confirmationName: "Ada Kurgu",
    now: new Date("2026-10-01T08:00:00.000Z"),
  });

  await assert.rejects(
    store.saveRecoverySnapshot(staleSnapshot),
    /snapshot oluşturulduktan sonra değişti/,
  );
  assert.equal(JSON.stringify(store.recoverySnapshots).includes(studentId), false);
  assert.equal(JSON.stringify(store.recoverySnapshots).includes("Ada Kurgu"), false);
});

test("ana silme ve recovery purge sonrasında enjekte commit hatası iki tarafı da geri alır", async () => {
  const store = lifecycleStore();
  const snapshotBefore = structuredClone(store.snapshot);
  const recoveryBefore = structuredClone(store.recoverySnapshots);
  store.failAtomicBeforeCommit = true;

  await assert.rejects(
    permanentlyDeleteArchivedStudent(store, {
      studentId,
      confirmationName: "Ada Kurgu",
      now: new Date("2026-10-01T08:00:00.000Z"),
    }),
    /Enjekte atomik commit hatası/,
  );

  assert.deepEqual(store.snapshot, snapshotBefore);
  assert.deepEqual(store.recoverySnapshots, recoveryBefore);
  assert.equal(store.recoveryPurgeCount, 0);
});

test("silme önizlemesi yeni raporları sayar; aynı etkinlikteki diğer çocuğun raporu korunur", async () => {
  const fixture = await makeDevelopmentReportFixture();
  const { input, otherStudentId: departingStudentId } = fixture;
  fixture.store.snapshot.activities[0].studentIds = [input.studentId, departingStudentId];
  const first = await saveDevelopmentReportDraft(fixture.store, input);
  const approved = await approveDevelopmentReport(fixture.store, {
    reportId: first.id, expectedRevision: first.revision, now: input.now,
  });
  const departingDraft = await saveDevelopmentReportDraft(fixture.store, {
    ...input, studentId: departingStudentId, selectedObservationIds: [], teacherEvaluation: "",
  });
  const store = new MemoryStore(await fixture.store.readSnapshot());
  const departingStudent = store.snapshot.students.find((record) => record.id === departingStudentId);
  departingStudent.active = false;
  departingStudent.enrollmentStatus = "left";
  store.recoverySnapshots = [
    { id: "kurgu-iki-cocuk-snapshot", envelope: { payload: structuredClone(store.snapshot) } },
    { id: "kurgu-sadece-diger-cocuk", envelope: { payload: { students: [{ id: input.studentId }] } } },
  ];
  assert.equal(previewPermanentStudentDeletion(store.snapshot, departingStudentId).reportCount, 1);
  assert.equal(previewPermanentStudentDeletion(store.snapshot, input.studentId).reportCount, 1);
  assert.deepEqual(approved.evidenceSnapshots[0].contextSnapshot.assignedStudentIds, [input.studentId]);
  const result = await permanentlyDeleteArchivedStudent(store, {
    studentId: departingStudentId, confirmationName: departingStudent.displayName,
    now: new Date("2026-09-09T08:00:00.000Z"),
  });
  assert.equal(result.reportCount, 1);
  assert.equal(result.purgedRecoverySnapshotCount, 1);
  assert.equal(store.snapshot.settings.some((record) => record.id === departingDraft.id), false);
  assert.deepEqual(store.snapshot.settings.find((record) => record.id === approved.id), approved);
  assert.equal(store.snapshot.observations.some((record) => record.id === fixture.observationId), true);
  assert.equal(JSON.stringify(store.snapshot).includes(departingStudentId), false);
  assert.equal(JSON.stringify(store.recoverySnapshots).includes(departingStudentId), false);
  assert.equal((await getDevelopmentReportReadModel(store.snapshot, approved.id)).sourceStatus, "stale");
  await assertDevelopmentReportBackupIntegrity(store.snapshot);
});
