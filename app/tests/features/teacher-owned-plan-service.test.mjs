import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  appendTeacherOwnedPlanMonths,
  createTeacherOwnedPlanGraph,
  loadTeacherOwnedPlanGraph,
  loadTeacherOwnedPlanStarterDraft,
  reviseTeacherOwnedPlan,
} from "../../src/features/planning/teacher-owned-plan-service.ts";
import { buildTeacherFullYearMonthDrafts } from "../../src/features/planning/teacher-year-outline.ts";

class MemoryStore {
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
    return structuredClone(result);
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000000b01";
const classroomId = "00000000-0000-4000-8000-000000000b02";
const otherClassroomId = "00000000-0000-4000-8000-000000000b03";
const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};

function activeStore() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-07",
    endDate: "2027-06-25",
    status: "active",
  });
  snapshot.classrooms.push(
    {
      ...base,
      id: classroomId,
      academicYearId: yearId,
      name: "Kurgu A Sınıfı",
    },
    {
      ...base,
      id: otherClassroomId,
      academicYearId: yearId,
      name: "Kurgu B Sınıfı",
    },
  );
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

function validDraft() {
  return {
    title: "2026–2027 Öğretmen Yıllık Planı",
    periodStart: "2026-09-07",
    periodEnd: "2026-10-30",
    teacherContent: {
      purpose: "Sınıfın yıllık öğretmen planlama omurgası",
      priorities: ["oyun", "gözlem", "aile katılımı"],
    },
    months: [
      {
        title: "Eylül Öğretmen Planı",
        monthKey: "2026-09",
        periodStart: "2026-09-07",
        periodEnd: "2026-09-30",
        teacherContent: { focus: "Uyum ve sınıf aidiyeti" },
        weeks: [
          {
            title: "7–11 Eylül Haftası",
            weekKey: "2026-W37",
            periodStart: "2026-09-07",
            periodEnd: "2026-09-11",
            teacherContent: { flow: ["karşılama", "oyun", "değerlendirme"] },
          },
          {
            title: "14–18 Eylül Haftası",
            weekKey: "2026-W38",
            periodStart: "2026-09-14",
            periodEnd: "2026-09-18",
            teacherContent: { flow: ["merkezler", "açık hava"] },
          },
        ],
      },
      {
        title: "Ekim Öğretmen Planı",
        monthKey: "2026-10",
        periodStart: "2026-10-01",
        periodEnd: "2026-10-30",
        teacherContent: { focus: "Merak ve araştırma" },
        weeks: [
          {
            title: "5–9 Ekim Haftası",
            weekKey: "2026-W41",
            periodStart: "2026-10-05",
            periodEnd: "2026-10-09",
            teacherContent: { flow: ["fen", "sanat"] },
          },
        ],
      },
    ],
    now: new Date("2026-09-02T06:00:00.000Z"),
  };
}

function uuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

test("premium erişiminden bağımsız yıllık → aylık → haftalık öğretmen plan grafiğini atomik kurar ve yükler", async () => {
  const store = activeStore();
  const input = validDraft();
  const graph = await createTeacherOwnedPlanGraph(store, input);

  assert.equal(uuid(graph.annual.id), true);
  assert.equal(graph.annual.planOrigin, "teacher-authored");
  assert.equal(graph.annual.academicYearId, yearId);
  assert.equal(graph.annual.classroomId, classroomId);
  assert.equal(graph.annual.revisionNumber, 1);
  assert.deepEqual(graph.annual.revisionHistory, []);
  assert.deepEqual(
    graph.annual.monthlySectionIds,
    graph.months.map(({ monthly }) => monthly.id),
  );
  assert.equal(graph.months.length, 2);
  assert.deepEqual(
    graph.months[0].monthly.weeklySectionIds,
    graph.months[0].weeks.map((week) => week.id),
  );
  assert.equal(graph.months[0].weeks[0].annualPlanId, graph.annual.id);
  assert.equal(
    graph.months[0].weeks[0].monthlyPlanId,
    graph.months[0].monthly.id,
  );

  const snapshot = await store.readSnapshot();
  assert.equal(snapshot.plans.length, 6);
  for (const record of snapshot.plans) {
    assert.equal(record.planOrigin, "teacher-authored");
    assert.equal(record.academicYearId, yearId);
    assert.equal(record.classroomId, classroomId);
    assert.equal("contentPackId" in record, false);
    assert.equal("contentPackVersion" in record, false);
    assert.equal("contentPackSnapshot" in record, false);
    assert.equal(
      Object.keys(record).some((key) => key.startsWith("premium")),
      false,
    );
  }

  const loaded = await loadTeacherOwnedPlanGraph(store, {
    annualPlanId: graph.annual.id,
  });
  assert.deepEqual(loaded, graph);
});

test("Eylül–Haziran omurgası 10 ayı haftalara böler ve mevcut grafa eksik ayları atomik ekler", async () => {
  const store = activeStore();
  const input = validDraft();
  input.periodEnd = "2027-06-25";
  const graph = await createTeacherOwnedPlanGraph(store, input);
  const outline = buildTeacherFullYearMonthDrafts({
    annualPeriodStart: "2026-09-07",
    annualPeriodEnd: "2027-06-25",
    months: [
      ["2026-09", "Eylül odağı"],
      ["2026-10", "Ekim odağı"],
      ["2026-11", "Kasım odağı"],
      ["2026-12", "Aralık odağı"],
      ["2027-01", "Ocak odağı"],
      ["2027-02", "Şubat odağı"],
      ["2027-03", "Mart odağı"],
      ["2027-04", "Nisan odağı"],
      ["2027-05", "Mayıs odağı"],
      ["2027-06", "Haziran odağı"],
    ].map(([monthKey, title]) => ({
      monthKey,
      title,
      purpose: `${title} öğretmen planlama amacı`,
    })),
  });
  assert.equal(outline.length, 10);
  assert.equal(outline[0].periodStart, "2026-09-07");
  assert.equal(outline.at(-1).periodEnd, "2027-06-25");
  assert.equal(
    outline.every((month) => month.weeks.length >= 4),
    true,
  );
  const missing = outline.filter(
    (month) => !graph.months.some(({ monthly }) => monthly.monthKey === month.monthKey),
  );
  assert.equal(missing.length, 8);
  const expanded = await appendTeacherOwnedPlanMonths(store, {
    annualPlanId: graph.annual.id,
    expectedUpdatedAt: graph.annual.updatedAt,
    months: missing,
    now: new Date("2026-09-03T06:00:00.000Z"),
  });
  assert.equal(expanded.months.length, 10);
  assert.deepEqual(
    expanded.months.map(({ monthly }) => monthly.monthKey),
    outline.map((month) => month.monthKey),
  );
  assert.equal(expanded.annual.revisionNumber, 2);
  assert.equal(expanded.annual.revisionHistory.length, 1);
  const snapshot = await store.readSnapshot();
  assert.equal(
    new Set(snapshot.plans.map((record) => record.id)).size,
    snapshot.plans.length,
  );

  const before = structuredClone(snapshot.plans);
  await assert.rejects(
    appendTeacherOwnedPlanMonths(store, {
      annualPlanId: expanded.annual.id,
      expectedUpdatedAt: expanded.annual.updatedAt,
      months: [outline[0]],
      now: new Date("2026-09-04T06:00:00.000Z"),
    }),
    /ikinci kez eklenemez/,
  );
  assert.deepEqual((await store.readSnapshot()).plans, before);
});

test("aktif eğitim yılından tek dokunuşluk plan başlangıç dönemini UTC ve sivil tarih sınırlarıyla hazırlar", async () => {
  const draft = await loadTeacherOwnedPlanStarterDraft(activeStore(), {
    civilDate: "2026-09-08",
  });
  assert.deepEqual(draft, {
    annualTitle: "2026–2027 Eğitim Yılı Öğretmen Planı",
    annualPeriodStart: "2026-09-07",
    annualPeriodEnd: "2027-06-25",
    monthTitle: "Eylül 2026 Öğretmen Planı",
    monthKey: "2026-09",
    monthPeriodStart: "2026-09-07",
    monthPeriodEnd: "2026-09-30",
    weekTitle: "7 Eylül – 13 Eylül Haftası",
    weekKey: "2026-09-07_2026-09-13",
    weekPeriodStart: "2026-09-07",
    weekPeriodEnd: "2026-09-13",
    nextWeekTitle: "14 Eylül – 20 Eylül Haftası",
    nextWeekKey: "2026-09-14_2026-09-20",
    nextWeekPeriodStart: "2026-09-14",
    nextWeekPeriodEnd: "2026-09-20",
    nextMonthTitle: "Ekim 2026 Öğretmen Planı",
    nextMonthKey: "2026-10",
    nextMonthPeriodStart: "2026-10-01",
    nextMonthPeriodEnd: "2026-10-31",
    nextMonthWeekTitle: "1 Ekim – 7 Ekim Haftası",
    nextMonthWeekKey: "2026-10-01_2026-10-07",
    nextMonthWeekPeriodStart: "2026-10-01",
    nextMonthWeekPeriodEnd: "2026-10-07",
  });
});

test("etkin sınıf kapsamını ve dönem yuvalamasını kesin uygular; mükerrer veya çakışmada fail-closed kalır", async (t) => {
  await t.test("aynı sınıftaki çakışan yıllık planı yazmaz", async () => {
    const store = activeStore();
    await createTeacherOwnedPlanGraph(store, validDraft());
    const before = await store.readSnapshot();
    await assert.rejects(
      () =>
        createTeacherOwnedPlanGraph(store, {
          ...validDraft(),
          title: "Çakışan Yıllık Plan",
          now: new Date("2026-09-02T06:01:00.000Z"),
        }),
      (error) => error?.code === "duplicate-or-overlap",
    );
    assert.deepEqual(await store.readSnapshot(), before);
  });

  await t.test("çakışan haftaları ve ay dışına taşan haftayı yazmaz", async () => {
    for (const mutate of [
      (draft) => {
        draft.months[0].weeks[1].periodStart = "2026-09-11";
      },
      (draft) => {
        draft.months[0].weeks[1].periodEnd = "2026-10-01";
      },
    ]) {
      const store = activeStore();
      const draft = validDraft();
      mutate(draft);
      const before = await store.readSnapshot();
      await assert.rejects(
        () => createTeacherOwnedPlanGraph(store, draft),
        (error) =>
          error?.code === "duplicate-or-overlap" || error?.code === "invalid-input",
      );
      assert.deepEqual(await store.readSnapshot(), before);
    }
  });

  await t.test("başka sınıf kaydını etkin sınıf grafiğine karıştırmaz", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, validDraft());
    const snapshot = await store.readSnapshot();
    const foreign = {
      ...structuredClone(graph.months[0].weeks[0]),
      id: "00000000-0000-4000-8000-000000000b99",
      classroomId: otherClassroomId,
    };
    snapshot.plans.push(foreign);
    const mixedStore = new MemoryStore(snapshot);
    const loaded = await loadTeacherOwnedPlanGraph(mixedStore, {
      annualPlanId: graph.annual.id,
    });
    assert.equal(loaded.months[0].weeks.length, 2);
    assert.equal(
      loaded.months.flatMap(({ weeks }) => weeks).some((week) => week.id === foreign.id),
      false,
    );
  });

  await t.test("ebeveyn dizisinde olmayan aynı kapsamlı çocuğu veri bütünlüğü hatası sayar", async () => {
    const store = activeStore();
    const graph = await createTeacherOwnedPlanGraph(store, validDraft());
    const snapshot = await store.readSnapshot();
    snapshot.plans.push({
      ...structuredClone(graph.months[0].weeks[0]),
      id: "00000000-0000-4000-8000-000000000b98",
      weekKey: "orphan-week",
      periodStart: "2026-09-21",
      periodEnd: "2026-09-25",
      civilDate: "2026-09-21",
    });
    await assert.rejects(
      () =>
        loadTeacherOwnedPlanGraph(new MemoryStore(snapshot), {
          annualPlanId: graph.annual.id,
        }),
      (error) => error?.code === "graph-integrity",
    );
  });
});

test("revizyon önceki sürümü değişmez snapshot olarak sona ekler; stale yazımı ve girdi mutasyonunu engeller", async () => {
  const store = activeStore();
  const createInput = validDraft();
  const originalPurpose = createInput.teacherContent.purpose;
  const graph = await createTeacherOwnedPlanGraph(store, createInput);

  createInput.teacherContent.purpose = "Çağıranın sonradan değiştirdiği metin";
  const revisionContent = {
    focus: "Öğretmen gözleminden sonra güncellenen uyum odağı",
    decisions: ["geçiş süresini uzat"],
  };
  const monthly = graph.months[0].monthly;
  const revised = await reviseTeacherOwnedPlan(store, {
    planId: monthly.id,
    expectedUpdatedAt: monthly.updatedAt,
    title: "Eylül Öğretmen Planı · Revize",
    teacherContent: revisionContent,
    now: new Date("2026-09-03T06:00:00.000Z"),
  });
  revisionContent.focus = "Çağıranın sonradan değiştirdiği revizyon";

  assert.equal(revised.revisionNumber, 2);
  assert.equal(revised.revisionHistory.length, 1);
  assert.equal(revised.revisionHistory[0].revisionNumber, 1);
  assert.equal(revised.revisionHistory[0].title, monthly.title);
  assert.deepEqual(revised.revisionHistory[0].teacherContent, monthly.teacherContent);
  assert.equal(revised.teacherContent.focus.includes("güncellenen"), true);

  const afterFirstRevision = await store.readSnapshot();
  await assert.rejects(
    () =>
      reviseTeacherOwnedPlan(store, {
        planId: monthly.id,
        expectedUpdatedAt: monthly.updatedAt,
        teacherContent: { focus: "stale yazım" },
        now: new Date("2026-09-04T06:00:00.000Z"),
      }),
    (error) => error?.code === "concurrent-update",
  );
  assert.deepEqual(await store.readSnapshot(), afterFirstRevision);

  const twiceRevised = await reviseTeacherOwnedPlan(store, {
    planId: monthly.id,
    expectedUpdatedAt: revised.updatedAt,
    teacherContent: { focus: "İkinci öğretmen revizyonu" },
    now: new Date("2026-09-04T06:00:00.000Z"),
  });
  assert.equal(twiceRevised.revisionNumber, 3);
  assert.equal(twiceRevised.revisionHistory.length, 2);
  assert.deepEqual(
    twiceRevised.revisionHistory[0],
    revised.revisionHistory[0],
    "ilk tarihçe öğesi ikinci revizyonda yeniden yazılmamalı",
  );
  assert.deepEqual(
    twiceRevised.revisionHistory[1].teacherContent,
    revised.teacherContent,
  );

  const loaded = await loadTeacherOwnedPlanGraph(store, {
    annualPlanId: graph.annual.id,
  });
  assert.equal(loaded.annual.teacherContent.purpose, originalPurpose);
  assert.equal(loaded.months[0].monthly.teacherContent.focus, "İkinci öğretmen revizyonu");
});
