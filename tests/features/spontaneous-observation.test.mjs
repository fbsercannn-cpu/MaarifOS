import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  SPONTANEOUS_OBSERVATION_ACTIVITY_KIND,
  SPONTANEOUS_OBSERVATION_PLAN_TYPE,
  ensureSpontaneousObservationContext,
} from "../../src/features/evidence/spontaneous-observation.ts";

class MemoryStore {
  snapshot;

  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
        for (const record of records) {
          byId.set(record.id, structuredClone(record));
        }
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

const yearId = "00000000-0000-4000-8000-000000000901";
const classroomId = "00000000-0000-4000-8000-000000000902";
const otherClassroomId = "00000000-0000-4000-8000-000000000903";
const studentAId = "00000000-0000-4000-8000-000000000904";
const studentBId = "00000000-0000-4000-8000-000000000905";
const inactiveStudentId = "00000000-0000-4000-8000-000000000906";
const otherClassStudentId = "00000000-0000-4000-8000-000000000907";
const existingPlanId = "00000000-0000-4000-8000-000000000908";

const base = {
  createdAt: "2026-09-02T06:00:00.000Z",
  updatedAt: "2026-09-02T06:00:00.000Z",
  civilDate: "2026-09-02",
  deletedAt: null,
  schemaVersion: 1,
};

const curriculumProfile = {
  framework: "tymm",
  programLabel: "Türkiye Yüzyılı Maarif Modeli",
  catalogId: "meb-tymm-okul-oncesi-2024-partial",
  sourceVersion: "2024",
  referenceOrigin: "official-catalog",
  officialCatalogVerified: true,
};

function activeStore() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026-2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push(
    {
      ...base,
      id: classroomId,
      academicYearId: yearId,
      name: "Kurgu Güneş Sınıfı",
      curriculumProfileSnapshot: curriculumProfile,
      schemaVersion: 2,
    },
    {
      ...base,
      id: otherClassroomId,
      academicYearId: yearId,
      name: "Kurgu Ay Sınıfı",
      curriculumProfileSnapshot: curriculumProfile,
      schemaVersion: 2,
    },
  );
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  snapshot.students.push(
    {
      ...base,
      id: studentAId,
      displayName: "Kurgu Çocuk A",
      academicYearId: yearId,
      classroomId,
      active: true,
      enrollmentStatus: "active",
    },
    {
      ...base,
      id: studentBId,
      displayName: "Kurgu Çocuk B",
      academicYearId: yearId,
      classroomId,
      active: true,
      enrollmentStatus: "active",
    },
    {
      ...base,
      id: inactiveStudentId,
      displayName: "Kurgu Pasif Çocuk",
      academicYearId: yearId,
      classroomId,
      active: false,
      enrollmentStatus: "left",
    },
    {
      ...base,
      id: otherClassStudentId,
      displayName: "Kurgu Başka Sınıf Çocuğu",
      academicYearId: yearId,
      classroomId: otherClassroomId,
      active: true,
      enrollmentStatus: "active",
    },
  );
  snapshot.plans.push({
    ...base,
    id: existingPlanId,
    planType: "daily",
    title: "Korunacak mevcut plan",
    academicYearId: yearId,
    classroomId,
    curriculumProfileSnapshot: curriculumProfile,
    curriculumTargets: [{ id: "existing-target" }],
  });
  return new MemoryStore(snapshot);
}

test("sınıf ve gün için hedef üretmeden tek anlık gözlem bağlamı oluşturur", async () => {
  const store = activeStore();
  const existingPlanBefore = structuredClone(store.snapshot.plans[0]);

  const result = await ensureSpontaneousObservationContext(store, {
    studentId: studentAId,
    civilDate: "2026-09-02",
    now: new Date("2026-09-02T07:15:00.000Z"),
  });

  assert.equal(result.created, true);
  assert.equal(result.plan.planType, SPONTANEOUS_OBSERVATION_PLAN_TYPE);
  assert.equal(
    result.activity.activityKind,
    SPONTANEOUS_OBSERVATION_ACTIVITY_KIND,
  );
  assert.equal(result.plan.title, "Anlık gözlemler");
  assert.equal(result.activity.title, "Anlık gözlemler");
  assert.equal(result.plan.civilDate, "2026-09-02");
  assert.equal(result.activity.civilDate, "2026-09-02");
  assert.equal(result.activity.planId, result.plan.id);
  assert.deepEqual(result.plan.curriculumTargets, []);
  assert.deepEqual(result.activity.curriculumTargets, []);
  assert.deepEqual(result.plan.maarifRefs, []);
  assert.deepEqual(result.activity.maarifRefs, []);
  assert.equal("targetAssignments" in result.activity, false);
  assert.equal("assignmentMode" in result.activity, false);
  assert.equal("studentIds" in result.activity, false);
  assert.deepEqual(store.snapshot.plans[0], existingPlanBefore);
  assert.equal(store.snapshot.plans.length, 2);
  assert.equal(store.snapshot.activities.length, 1);
});

test("aynı sınıf ve civil_date için mevcut anlık gözlem bağlamını idempotent kullanır", async () => {
  const store = activeStore();

  const first = await ensureSpontaneousObservationContext(store, {
    studentId: studentAId,
    civilDate: "2026-09-02",
    now: new Date("2026-09-02T07:15:00.000Z"),
  });
  const second = await ensureSpontaneousObservationContext(store, {
    studentId: studentBId,
    civilDate: "2026-09-02",
    now: new Date("2026-09-02T08:00:00.000Z"),
  });

  assert.equal(second.created, false);
  assert.equal(second.plan.id, first.plan.id);
  assert.equal(second.activity.id, first.activity.id);
  assert.equal(
    store.snapshot.plans.filter(
      (record) => record.planType === SPONTANEOUS_OBSERVATION_PLAN_TYPE,
    ).length,
    1,
  );
  assert.equal(
    store.snapshot.activities.filter(
      (record) =>
        record.activityKind === SPONTANEOUS_OBSERVATION_ACTIVITY_KIND,
    ).length,
    1,
  );
  assert.equal(second.plan.updatedAt, first.plan.updatedAt);
  assert.equal(second.activity.updatedAt, first.activity.updatedAt);
});

test("pasif, arşivli ve başka sınıftaki çocuk için bağlam oluşturmaz", async (t) => {
  const cases = [
    {
      name: "pasif çocuk",
      studentId: inactiveStudentId,
      pattern: /aktif sınıftaki etkin bir çocuk/,
    },
    {
      name: "başka sınıftaki çocuk",
      studentId: otherClassStudentId,
      pattern: /aktif sınıftaki etkin bir çocuk/,
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const store = activeStore();
      await assert.rejects(
        ensureSpontaneousObservationContext(store, {
          studentId: item.studentId,
          civilDate: "2026-09-02",
          now: new Date("2026-09-02T07:15:00.000Z"),
        }),
        item.pattern,
      );
      assert.equal(store.snapshot.plans.length, 1);
      assert.equal(store.snapshot.activities.length, 0);
    });
  }

  await t.test("silinmiş çocuk", async () => {
    const store = activeStore();
    const student = store.snapshot.students.find(
      (record) => record.id === studentAId,
    );
    student.deletedAt = "2026-09-02T06:30:00.000Z";
    await assert.rejects(
      ensureSpontaneousObservationContext(store, {
        studentId: studentAId,
        civilDate: "2026-09-02",
        now: new Date("2026-09-02T07:15:00.000Z"),
      }),
      /aktif sınıftaki etkin bir çocuk/,
    );
    assert.equal(store.snapshot.plans.length, 1);
    assert.equal(store.snapshot.activities.length, 0);
  });
});

test("aktif eğitim yılı dışındaki gün için veri yazmaz", async () => {
  const store = activeStore();

  await assert.rejects(
    ensureSpontaneousObservationContext(store, {
      studentId: studentAId,
      civilDate: "2027-07-01",
      now: new Date("2027-07-01T07:15:00.000Z"),
    }),
    /aktif eğitim yılının tarih aralığında/,
  );

  assert.equal(store.snapshot.plans.length, 1);
  assert.equal(store.snapshot.activities.length, 0);
});
