import assert from "node:assert/strict";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  DAILY_EVALUATION_PRESETS,
  DAILY_PLAN_EVALUATION_SETTING_TYPE,
  buildDailyPlanEvaluationRecord,
  isDailyPlanEvaluationRecord,
  findDailyPlanEvaluation,
  createInitialDailyEvaluationAspect,
  assertDailyPlanEvaluationRelationships,
} from "../../src/core/domain/teacher-owned-daily-evaluation.ts";
import {
  appendActivityToDailyPlan,
  saveDailyPlanEvaluation,
  loadDailyPlanWorkspaceBundle,
} from "../../src/features/planning/daily-plan-activity-service.ts";

class MemoryStore {
  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection] ?? []),
      putMany: async (collection, records) => {
        const byId = new Map(
          (working[collection] ?? []).map((record) => [record.id, record]),
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
    return structuredClone(result);
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const scope = {
  academicYearId: "00000000-0000-4000-8000-000000000a01",
  classroomId: "00000000-0000-4000-8000-000000000c01",
};

const mockDailyPlan = {
  id: "00000000-0000-4000-8000-000000000d01",
  planType: "daily",
  civilDate: "2026-09-14",
  title: "14 Eylül 2026 Günlük Eğitim Planı",
  academicYearId: scope.academicYearId,
  classroomId: scope.classroomId,
  sourceAnnualPlanId: "00000000-0000-4000-8000-000000000a01",
  sourceMonthlyPlanId: "00000000-0000-4000-8000-000000000m01",
  sourceWeeklyPlanId: "00000000-0000-4000-8000-000000000w01",
  teacherOwnedDailyFlow: {
    schemaVersion: 1,
    flowOrigin: "teacher-authored",
    revisionNumber: 1,
    revisionHistory: [],
    scheduleSnapshot: {
      kind: "full-day",
      startTime: "08:30",
      endTime: "16:30",
      timeZone: "Europe/Istanbul",
    },
    authorshipConfirmation: {
      confirmationMethod: "teacher-reviewed",
      confirmedAt: "2026-09-14T06:00:00.000Z",
      confirmedByUserId: "teacher-01",
    },
    blocks: [
      {
        id: "00000000-0000-4000-8000-000000000b01",
        order: 1,
        kind: "welcome",
        title: "Güne Merhaba",
        status: "planned",
        durationMinutes: 30,
        transitionNote: "",
        teacherNote: "",
      },
      {
        id: "00000000-0000-4000-8000-000000000b02",
        order: 2,
        kind: "teacher-activity-one",
        title: "Kukla ile Duygularım",
        status: "planned",
        durationMinutes: 45,
        transitionNote: "",
        teacherNote: "",
      },
      {
        id: "00000000-0000-4000-8000-000000000b03",
        order: 3,
        kind: "teacher-activity-two",
        title: "Etkinlik 2",
        status: "optional",
        durationMinutes: 45,
        transitionNote: "",
        teacherNote: "",
      },
      {
        id: "00000000-0000-4000-8000-000000000b04",
        order: 4,
        kind: "small-group",
        title: "Küçük Grup Çalışması",
        status: "optional",
        durationMinutes: 40,
        transitionNote: "",
        teacherNote: "",
      },
    ],
    createdAt: "2026-09-14T06:00:00.000Z",
    updatedAt: "2026-09-14T06:00:00.000Z",
  },
  createdAt: "2026-09-14T06:00:00.000Z",
  updatedAt: "2026-09-14T06:00:00.000Z",
  deletedAt: null,
  schemaVersion: 1,
};

test("Günlük değerlendirme ön tanımlı şablonları (presets) eksiksiz ve pedagojik tanımlıdır", () => {
  assert.equal(DAILY_EVALUATION_PRESETS.children.length, 4);
  assert.equal(DAILY_EVALUATION_PRESETS.teacher.length, 4);
  assert.equal(DAILY_EVALUATION_PRESETS.program.length, 4);

  for (const group of [DAILY_EVALUATION_PRESETS.children, DAILY_EVALUATION_PRESETS.teacher, DAILY_EVALUATION_PRESETS.program]) {
    for (const item of group) {
      assert.ok(item.id.length > 0);
      assert.ok(item.title.length > 0);
      assert.ok(item.narrative.length > 20);
    }
  }
});

test("createInitialDailyEvaluationAspect ilk hazır seçimi oluşturur", () => {
  const childAspect = createInitialDailyEvaluationAspect("children", 0);
  assert.equal(childAspect.presetId, "ch-active-cooperation");
  assert.equal(childAspect.title, "Yüksek Katılım & İş Birliği");
  assert.equal(childAspect.customized, false);
  assert.ok(childAspect.narrative.includes("aktif ve istekli"));
});

test("buildDailyPlanEvaluationRecord geçerli bir şema kaydı üretir", () => {
  const children = createInitialDailyEvaluationAspect("children", 0);
  const teacher = createInitialDailyEvaluationAspect("teacher", 0);
  const program = createInitialDailyEvaluationAspect("program", 0);

  const record = buildDailyPlanEvaluationRecord(scope, {
    planId: mockDailyPlan.id,
    civilDate: "2026-09-14",
    children,
    teacher,
    program,
    overallNote: "Harika bir gün tamamlandı.",
    timestamp: "2026-09-14T14:30:00.000Z",
  });

  assert.equal(record.settingType, DAILY_PLAN_EVALUATION_SETTING_TYPE);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.workflow.planId, mockDailyPlan.id);
  assert.equal(record.workflow.civilDate, "2026-09-14");
  assert.equal(record.workflow.overallNote, "Harika bir gün tamamlandı.");
  assert.ok(isDailyPlanEvaluationRecord(record));
});

test("saveDailyPlanEvaluation ve findDailyPlanEvaluation döngüsü başarıyla çalışır", async () => {
  const store = new MemoryStore();
  const children = createInitialDailyEvaluationAspect("children", 1);
  const teacher = createInitialDailyEvaluationAspect("teacher", 1);
  const program = createInitialDailyEvaluationAspect("program", 1);

  const saved = await saveDailyPlanEvaluation(store, scope, {
    planId: mockDailyPlan.id,
    civilDate: "2026-09-14",
    children,
    teacher,
    program,
    overallNote: "Not",
    timestamp: "2026-09-14T15:00:00.000Z",
  });

  assert.ok(saved.id);
  const snapshot = await store.readSnapshot();
  const found = findDailyPlanEvaluation(snapshot, mockDailyPlan.id);
  assert.ok(found);
  assert.equal(found.workflow.children.presetId, "ch-differentiated-pace");
  assert.equal(found.workflow.teacher.presetId, "tr-scaffolding-autonomy");
  assert.equal(found.workflow.program.presetId, "pr-learning-environment");
});

test("appendActivityToDailyPlan mevcut plana ikinci etkinliği ekler ve akış bloğunu günceller", async () => {
  const store = new MemoryStore();
  await store.transaction("readwrite", ["plans"], async (tx) => {
    await tx.putMany("plans", [mockDailyPlan]);
  });

  const result = await appendActivityToDailyPlan(store, scope, {
    planId: mockDailyPlan.id,
    title: "Açık Havada Renk Avı",
    activityKind: "outdoor-movement",
    flowBlockKind: "teacher-activity-two",
    startTime: "11:00",
    endTime: "11:45",
    teacherNote: "Bahçede doğal nesneler toplanacak",
    timestamp: "2026-09-14T07:30:00.000Z",
  });

  assert.ok(result.activity.id);
  assert.equal(result.activity.title, "Açık Havada Renk Avı");
  assert.equal(result.activity.planId, mockDailyPlan.id);
  assert.equal(result.activity.civilDate, "2026-09-14");
  assert.equal(result.assignedBlockId, "00000000-0000-4000-8000-000000000b03");

  const snapshot = await store.readSnapshot();
  const updatedPlan = snapshot.plans.find((p) => p.id === mockDailyPlan.id);
  assert.ok(updatedPlan);
  assert.equal(updatedPlan.teacherOwnedDailyFlow.revisionNumber, 2);

  const actTwoBlock = updatedPlan.teacherOwnedDailyFlow.blocks.find(
    (b) => b.id === "00000000-0000-4000-8000-000000000b03",
  );
  assert.equal(actTwoBlock.status, "planned");
  assert.equal(actTwoBlock.title, "Açık Havada Renk Avı");
  assert.equal(actTwoBlock.teacherNote, "Bahçede doğal nesneler toplanacak");

  // loadDailyPlanWorkspaceBundle bundle'ı doğrular
  const bundle = loadDailyPlanWorkspaceBundle(snapshot, scope, mockDailyPlan.id);
  assert.ok(bundle);
  assert.equal(bundle.activities.length, 1);
  assert.equal(bundle.activities[0].title, "Açık Havada Renk Avı");
});

test("appendActivityToDailyPlan boş başlık verildiğinde hata fırlatır", async () => {
  const store = new MemoryStore();
  await store.transaction("readwrite", ["plans"], async (tx) => {
    await tx.putMany("plans", [mockDailyPlan]);
  });

  await assert.rejects(
    () =>
      appendActivityToDailyPlan(store, scope, {
        planId: mockDailyPlan.id,
        title: "   ",
      }),
    /Etkinlik başlığı boş bırakılamaz/,
  );
});

test("assertDailyPlanEvaluationRelationships plan eşleşmesini ve sınıf izolasyonunu doğrular", () => {
  const children = createInitialDailyEvaluationAspect("children", 0);
  const teacher = createInitialDailyEvaluationAspect("teacher", 0);
  const program = createInitialDailyEvaluationAspect("program", 0);

  const record = buildDailyPlanEvaluationRecord(scope, {
    planId: mockDailyPlan.id,
    civilDate: "2026-09-14",
    children,
    teacher,
    program,
    timestamp: "2026-09-14T14:30:00.000Z",
  });

  const snapshot = createEmptySnapshot();
  snapshot.plans = [mockDailyPlan];
  snapshot.settings = [record];

  assert.doesNotThrow(() => assertDailyPlanEvaluationRelationships(snapshot));

  // Yanlış planId'de hata vermeli
  const badSnapshot = createEmptySnapshot();
  badSnapshot.plans = [];
  badSnapshot.settings = [record];
  assert.throws(
    () => assertDailyPlanEvaluationRelationships(badSnapshot),
    /bulunamadı/,
  );
});
