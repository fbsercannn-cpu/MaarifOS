import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson } from "../../src/core/backup/canonical-json.ts";
import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import {
  defaultTeacherOwnedDailyFlowBlockDrafts,
  isTeacherOwnedDailyFlow,
} from "../../src/core/domain/teacher-owned-daily-flow.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
import {
  CURRICULUM_PROGRAM_LABELS,
  createPlanWithActivity,
  updateScheduledPlanWithActivity,
} from "../../src/features/evidence/evidence-flow.ts";
import {
  loadScheduledPlanEditDraft,
  loadScheduledPlanWorkspace,
  loadTeacherOwnedDailyFlowCopySource,
  loadTeacherOwnedDailyFlowCopySources,
} from "../../src/features/planning/scheduled-plan-workspace.ts";
import {
  buildStandaloneTeacherOwnedPlanParagraphs,
  generateStandaloneTeacherOwnedPlanExportFile,
  loadStandaloneTeacherOwnedDailyPlans,
} from "../../src/features/planning/teacher-owned-plan-document.ts";
import {
  createTeacherOwnedPlanGraph,
  loadTeacherOwnedPlanGraph,
  updateTeacherOwnedDailyFlow,
} from "../../src/features/planning/teacher-owned-plan-service.ts";
import { resolvePlanDayWorkspace } from "../../src/features/today/today-data.ts";

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
    return structuredClone(result);
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000001901";
const classroomId = "00000000-0000-4000-8000-000000001902";
const studentId = "00000000-0000-4000-8000-000000001903";
const dailyPlanId = "00000000-0000-4000-8000-000000001904";
const activityId = "00000000-0000-4000-8000-000000001905";
const curriculumProfile = {
  framework: "tymm",
  programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
  catalogId: "tymm-2024-okul-oncesi-v1",
  sourceVersion: "2024.1",
  referenceOrigin: "teacher-declared",
  officialCatalogVerified: false,
};
const curriculumTarget = curriculumTargetsForProfile(curriculumProfile).find(
  (target) => target.referenceCode === "FAB.1",
);
assert.ok(curriculumTarget);

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
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId: yearId,
    name: "Kurgu Güneş Sınıfı",
    curriculumProfileSnapshot: curriculumProfile,
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
      timeZone: "Europe/Istanbul",
    },
    schemaVersion: 2,
  });
  snapshot.students.push({
    ...base,
    id: studentId,
    academicYearId: yearId,
    classroomId,
    displayName: "Kurgu Ada",
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

function graphInput() {
  return {
    title: "2026–2027 Öğretmen Yıllık Planı",
    periodStart: "2026-09-07",
    periodEnd: "2027-06-25",
    teacherContent: { purpose: "Öğretmenin yıllık omurgası" },
    months: [{
      title: "Eylül Öğretmen Planı",
      monthKey: "2026-09",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-30",
      teacherContent: { focus: "Uyum ve aidiyet" },
      weeks: [{
        title: "7–11 Eylül Haftası",
        weekKey: "2026-W37",
        periodStart: "2026-09-07",
        periodEnd: "2026-09-11",
        teacherContent: { flow: ["karşılama", "oyun", "gözlem"] },
      }],
    }],
    now: new Date("2026-09-02T06:00:00.000Z"),
  };
}

function authoredBlockDrafts() {
  return defaultTeacherOwnedDailyFlowBlockDrafts(240).map((block, index) => ({
    ...block,
    title: `${index + 1}. öğretmen akış bölümü`,
    transitionNote: index === 0 ? "Çocukları kapıda tek tek karşıla." : "",
    teacherNote: index === 3 ? "Küçük grup seçimini çocuklara bırak." : "",
  }));
}

async function preparedStore() {
  const store = activeStore();
  const graph = await createTeacherOwnedPlanGraph(store, graphInput());
  const created = await createPlanWithActivity(store, {
    civilDate: "2026-09-08",
    planId: dailyPlanId,
    planTitle: "8 Eylül Öğretmen Günlük Planı",
    activityId,
    activityTitle: "Sınıf topluluğu oyunu",
    startTime: "09:00",
    endTime: "09:40",
    curriculumProfile,
    curriculumTargets: [curriculumTarget],
    assignmentMode: "selected-students",
    studentIds: [studentId],
    teacherOwnedDailyFlowBlocks: authoredBlockDrafts(),
    teacherOwnedActivityBlockKind: "teacher-activity-one",
    now: new Date("2026-09-07T06:00:00.000Z"),
  });
  return { store, graph, created };
}

function editedBlocks(flow) {
  return flow.blocks.map((block, index) => ({
    id: block.id,
    kind: block.kind,
    title: index === 3 ? "Çocukların kurduğu gölge oyunu" : block.title,
    status: index === 8 ? "optional" : block.status,
    durationMinutes: index === 3
      ? 40
      : index === 4
        ? 8
        : block.durationMinutes,
    transitionNote: index === 3 ? "Bahçeden sınıfa ritimle geç." : block.transitionNote,
    teacherNote: index === 3 ? "Üç farklı rol seçeneğini görünür tut." : block.teacherNote,
  }));
}

test("öğretmen günlük planı tam gün akışını premium alanı uydurmadan ve tek etkinlikle saklar", async () => {
  const { store, graph, created } = await preparedStore();
  assert.equal(isTeacherOwnedDailyFlow(created.plan.teacherOwnedDailyFlow), true);
  assert.equal(created.plan.teacherOwnedDailyFlow.blocks.length, 10);
  assert.equal(created.plan.teacherOwnedDailyFlow.blocks[3].kind, "teacher-activity-one");
  assert.equal(created.plan.teacherOwnedDailyFlow.blocks[3].teacherNote, "Küçük grup seçimini çocuklara bırak.");
  assert.deepEqual(created.plan.teacherOwnedDailyFlow.authorshipConfirmation, {
    confirmationMethod: "teacher-reviewed",
    confirmedAt: "2026-09-07T06:00:00.000Z",
    confirmedByUserId: created.plan.teacherOwnedDailyFlow.authorshipConfirmation.confirmedByUserId,
  });
  assert.match(
    created.plan.teacherOwnedDailyFlow.authorshipConfirmation.confirmedByUserId,
    /^[0-9a-f-]{36}$/i,
  );
  assert.equal(created.plan.sourceAnnualPlanId, graph.annual.id);
  assert.equal(created.plan.sourceMonthlyPlanId, graph.months[0].monthly.id);
  assert.equal(created.plan.sourceWeeklyPlanId, graph.months[0].weeks[0].id);
  assert.equal(
    created.activity.teacherOwnedFlowBlockId,
    created.plan.teacherOwnedDailyFlow.blocks[3].id,
  );
  for (const providerField of [
    "premiumDailyFlowSnapshot",
    "sourceContentPackSnapshot",
    "sourceActivityTemplateSnapshot",
    "appliedActivityTemplateSnapshot",
  ]) {
    assert.equal(providerField in created.plan, false);
  }
  const snapshot = await store.readSnapshot();
  assert.equal(snapshot.activities.filter((activity) => activity.planId === created.plan.id).length, 1);
  const today = resolvePlanDayWorkspace(snapshot, "2026-09-08");
  assert.equal(today.planItems.length, 10);
  assert.equal(today.planItems.filter((item) => item.kind === "teacher-flow-block").length, 10);
  const linkedItem = today.planItems.find((item) => item.activityId === created.activity.id);
  assert.equal(linkedItem?.flowBlockId, created.activity.teacherOwnedFlowBlockId);
  assert.equal(linkedItem?.canCaptureEvidence, true);
  const copySource = await loadTeacherOwnedDailyFlowCopySource(store, {
    weeklyPlanId: graph.months[0].weeks[0].id,
    beforeCivilDate: "2026-09-09",
  });
  assert.equal(copySource?.civilDate, "2026-09-08");
  assert.equal(copySource?.planId, created.plan.id);
  assert.equal(copySource?.weeklyPlanId, graph.months[0].weeks[0].id);
  assert.equal(copySource?.flowRevisionNumber, 1);
  assert.equal(copySource?.blocks.length, 10);
  assert.equal(copySource?.activityBlockKind, "teacher-activity-one");
  assert.equal(copySource?.blocks.some((block) => "id" in block), false);
});

test("hafta içinden seçilen akış kaynağı kalıcı provenance taşır ve sahte revizyonu reddeder", async () => {
  const { store, graph, created } = await preparedStore();
  const source = await loadTeacherOwnedDailyFlowCopySource(store, {
    weeklyPlanId: graph.months[0].weeks[0].id,
    beforeCivilDate: "2026-09-09",
  });
  assert.ok(source);
  const copied = await createPlanWithActivity(store, {
    civilDate: "2026-09-09",
    planTitle: "9 Eylül Öğretmen Günlük Planı",
    activityTitle: "Birlikte ritim çalışması",
    startTime: "09:00",
    endTime: "09:40",
    curriculumProfile,
    curriculumTargets: [curriculumTarget],
    assignmentMode: "selected-students",
    studentIds: [studentId],
    teacherOwnedDailyFlowBlocks: source.blocks,
    teacherOwnedActivityBlockKind: source.activityBlockKind,
    teacherOwnedDailyFlowTemplateSource: {
      mode: "previous-day",
      sourcePlanId: source.planId,
      sourceWeeklyPlanId: source.weeklyPlanId,
      sourceCivilDate: source.civilDate,
      sourceFlowRevisionNumber: source.flowRevisionNumber,
    },
    now: new Date("2026-09-08T06:00:00.000Z"),
  });
  assert.deepEqual(copied.plan.teacherOwnedDailyFlow.templateSource, {
    mode: "previous-day",
    sourcePlanId: created.plan.id,
    sourceWeeklyPlanId: graph.months[0].weeks[0].id,
    sourceCivilDate: "2026-09-08",
    sourceFlowRevisionNumber: 1,
  });
  const sources = await loadTeacherOwnedDailyFlowCopySources(store, {
    weeklyPlanId: graph.months[0].weeks[0].id,
    beforeCivilDate: "2026-09-10",
  });
  assert.deepEqual(sources.map((candidate) => candidate.civilDate), [
    "2026-09-09",
    "2026-09-08",
  ]);
  const beforeForgery = canonicalJson(await store.readSnapshot());
  await assert.rejects(
    () => createPlanWithActivity(store, {
      civilDate: "2026-09-10",
      planTitle: "10 Eylül Öğretmen Günlük Planı",
      activityTitle: "Kaynak bütünlüğü denemesi",
      startTime: "09:00",
      endTime: "09:40",
      curriculumProfile,
      curriculumTargets: [curriculumTarget],
      assignmentMode: "selected-students",
      studentIds: [studentId],
      teacherOwnedDailyFlowBlocks: source.blocks,
      teacherOwnedActivityBlockKind: source.activityBlockKind,
      teacherOwnedDailyFlowTemplateSource: {
        mode: "weekly-template",
        sourcePlanId: source.planId,
        sourceWeeklyPlanId: source.weeklyPlanId,
        sourceCivilDate: source.civilDate,
        sourceFlowRevisionNumber: 99,
      },
      now: new Date("2026-09-09T06:00:00.000Z"),
    }),
    /yalnız aynı haftadaki doğrulanmış önceki öğretmen planından/,
  );
  assert.equal(canonicalJson(await store.readSnapshot()), beforeForgery);
});

test("günlük akış revizyonu eski snapshotı ekler, blok kimliğini ve etkinlik sayısını korur, stale yazımı sıfır mutasyonla reddeder", async () => {
  const { store, created } = await preparedStore();
  const originalFlow = structuredClone(created.plan.teacherOwnedDailyFlow);
  const updated = await updateTeacherOwnedDailyFlow(store, {
    planId: created.plan.id,
    expectedUpdatedAt: created.plan.updatedAt,
    blocks: editedBlocks(originalFlow),
    now: new Date("2026-09-08T06:05:00.000Z"),
  });
  assert.equal(updated.teacherOwnedDailyFlow.revisionNumber, 2);
  assert.equal(updated.teacherOwnedDailyFlow.revisionHistory.length, 1);
  assert.equal(
    updated.teacherOwnedDailyFlow.revisionHistory[0].authorshipConfirmation.confirmedByUserId,
    originalFlow.authorshipConfirmation.confirmedByUserId,
  );
  assert.equal(
    updated.teacherOwnedDailyFlow.authorshipConfirmation.confirmedAt,
    "2026-09-08T06:05:00.000Z",
  );
  assert.deepEqual(updated.teacherOwnedDailyFlow.revisionHistory[0].blocks, originalFlow.blocks);
  assert.deepEqual(
    updated.teacherOwnedDailyFlow.blocks.map((block) => block.id),
    originalFlow.blocks.map((block) => block.id),
  );
  assert.equal(updated.teacherOwnedDailyFlow.blocks[3].title, "Çocukların kurduğu gölge oyunu");
  assert.equal(
    updated.teacherOwnedDailyFlow.blocks.reduce(
      (total, block) => total + block.durationMinutes,
      0,
    ),
    240,
  );
  const afterUpdate = await store.readSnapshot();
  assert.equal(afterUpdate.activities.filter((activity) => activity.planId === created.plan.id).length, 1);
  const beforeStale = canonicalJson(afterUpdate);
  await assert.rejects(
    () => updateTeacherOwnedDailyFlow(store, {
      planId: created.plan.id,
      expectedUpdatedAt: created.plan.updatedAt,
      blocks: editedBlocks(originalFlow),
      now: new Date("2026-09-08T06:10:00.000Z"),
    }),
    /başka bir işlemde güncellendi/,
  );
  assert.equal(canonicalJson(await store.readSnapshot()), beforeStale);
});

test("gelecek öğretmen planı 10 bölümü gerçek düzenleme yüzeyine taşır ve plan-etkinlikle atomik revize eder", async () => {
  const { store, created } = await preparedStore();
  const workspace = await loadScheduledPlanWorkspace(store, {
    now: new Date("2026-09-07T06:30:00.000Z"),
  });
  assert.equal(workspace.plans.length, 1);
  assert.equal(workspace.plans[0].integrityStatus, "valid");
  assert.equal(workspace.plans[0].flowBlockCount, 10);
  assert.equal(workspace.plans[0].editable, true);

  const draft = await loadScheduledPlanEditDraft(store, {
    planId: created.plan.id,
    now: new Date("2026-09-07T06:30:00.000Z"),
  });
  assert.equal(draft.premium, false);
  assert.equal(draft.flowBlocks.length, 0);
  assert.equal(draft.teacherOwnedDailyFlowBlocks.length, 10);
  assert.equal(draft.teacherOwnedActivityBlockKind, "teacher-activity-one");

  const revisedBlocks = editedBlocks(created.plan.teacherOwnedDailyFlow);
  const updated = await updateScheduledPlanWithActivity(store, {
    planId: draft.planId,
    activityId: draft.activityId,
    expectedPlanUpdatedAt: draft.expectedPlanUpdatedAt,
    expectedActivityUpdatedAt: draft.expectedActivityUpdatedAt,
    civilDate: "2026-09-09",
    planTitle: "9 Eylül öğretmen günlük planı",
    activityTitle: "Gölge oyunu",
    startTime: "09:10",
    endTime: "09:50",
    teacherOwnedDailyFlowBlocks: revisedBlocks,
    teacherOwnedActivityBlockKind: "teacher-activity-two",
    now: new Date("2026-09-07T06:40:00.000Z"),
  });
  assert.equal(updated.plan.teacherOwnedDailyFlow.revisionNumber, 2);
  assert.equal(updated.plan.teacherOwnedDailyFlow.blocks[3].title, "Çocukların kurduğu gölge oyunu");
  assert.equal(updated.plan.civilDate, "2026-09-09");
  assert.equal(updated.activity.civilDate, "2026-09-09");
  assert.equal(
    updated.activity.teacherOwnedFlowBlockId,
    updated.plan.teacherOwnedDailyFlow.blocks[6].id,
  );
  const snapshot = await store.readSnapshot();
  assert.equal(snapshot.activities.filter((activity) => activity.planId === created.plan.id).length, 1);
});

test("yedeklemenin kullandığı exact akış doğrulayıcısı sıra, süre ve uydurma sağlayıcı alanını reddeder", async () => {
  const { created } = await preparedStore();
  const valid = structuredClone(created.plan.teacherOwnedDailyFlow);
  assert.equal(isTeacherOwnedDailyFlow(valid), true);

  const duplicateOrder = structuredClone(valid);
  duplicateOrder.blocks[1].order = 1;
  assert.equal(isTeacherOwnedDailyFlow(duplicateOrder), false);

  const scheduleMismatch = structuredClone(valid);
  scheduleMismatch.blocks[0].durationMinutes += 1;
  assert.equal(isTeacherOwnedDailyFlow(scheduleMismatch), false);

  const fabricatedProviderField = structuredClone(valid);
  fabricatedProviderField.providerTemplateId = "uydurma-sağlayıcı";
  assert.equal(isTeacherOwnedDailyFlow(fabricatedProviderField), false);

  const unconfirmed = structuredClone(valid);
  delete unconfirmed.authorshipConfirmation;
  assert.equal(isTeacherOwnedDailyFlow(unconfirmed), false);

  const allSkipped = structuredClone(valid);
  allSkipped.blocks.forEach((block) => {
    block.status = "skipped";
  });
  assert.equal(isTeacherOwnedDailyFlow(allSkipped), false);
});

test("DOCX ve PDF aynı düzenlenmiş 10 akış bloğunu kimlik, tür, sıra ve notlarıyla taşır", async () => {
  const { store, graph, created } = await preparedStore();
  const updated = await updateTeacherOwnedDailyFlow(store, {
    planId: created.plan.id,
    expectedUpdatedAt: created.plan.updatedAt,
    blocks: editedBlocks(created.plan.teacherOwnedDailyFlow),
    now: new Date("2026-09-08T06:05:00.000Z"),
  });
  const reloadedGraph = await loadTeacherOwnedPlanGraph(store, {
    annualPlanId: graph.annual.id,
  });
  assert.ok(reloadedGraph);
  const dailyExports = await loadStandaloneTeacherOwnedDailyPlans(store, reloadedGraph);
  assert.equal(dailyExports.length, 1);
  assert.deepEqual(dailyExports[0].flowBlocks, updated.teacherOwnedDailyFlow.blocks);
  assert.equal(
    dailyExports[0].activities[0].flowBlockId,
    created.activity.teacherOwnedFlowBlockId,
  );
  assert.deepEqual(dailyExports[0].flowSchedule, {
    kind: "morning",
    startTime: "08:30",
    endTime: "12:30",
    timeZone: "Europe/Istanbul",
    totalMinutes: 240,
  });
  const paragraphs = buildStandaloneTeacherOwnedPlanParagraphs(
    reloadedGraph,
    dailyExports,
    { includeAuditAppendix: true },
  );
  const paragraphText = paragraphs.map((paragraph) => paragraph.text).join("\n");
  for (const block of updated.teacherOwnedDailyFlow.blocks) {
    assert.match(paragraphText, new RegExp(block.id));
    assert.match(paragraphText, new RegExp(`tür ${block.kind}`));
    assert.match(paragraphText, new RegExp(`${block.order}\\. ${block.title}`));
  }
  assert.match(paragraphText, /Bahçeden sınıfa ritimle geç\./);
  assert.match(paragraphText, /Üç farklı rol seçeneğini görünür tut\./);
  assert.match(paragraphText, /Bu bölümde uygulanacak etkinlik: Sınıf topluluğu oyunu/);
  assert.match(paragraphText, /Öğretmen incelemesi:/);
  assert.match(paragraphText, /08:30–12:30 · 240 dk · morning/);

  const word = await generateStandaloneTeacherOwnedPlanExportFile(
    reloadedGraph,
    store,
    "word",
    { kind: "combined" },
    { includeAuditAppendix: true },
  );
  assert.equal(new TextDecoder().decode(word.bytes.slice(0, 2)), "PK");
  const wordBytesAsText = new TextDecoder().decode(word.bytes);
  assert.match(wordBytesAsText, /Çocukların kurduğu gölge oyunu/);
  assert.match(wordBytesAsText, /teacher-activity-one/);
  assert.match(wordBytesAsText, /Bahçeden sınıfa ritimle geç\./);

  const originalDocument = globalThis.document;
  const context = {
    fillStyle: "",
    font: "",
    textAlign: "left",
    fillRect() {},
    fillText() {},
    measureText(value) { return { width: String(value).length * 10 }; },
  };
  globalThis.document = {
    fonts: { ready: Promise.resolve() },
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => context,
      toDataURL: () => "data:image/jpeg;base64,/9j/2Q==",
    }),
  };
  try {
    const pdf = await generateStandaloneTeacherOwnedPlanExportFile(
      reloadedGraph,
      store,
      "pdf",
      { kind: "combined" },
      { includeAuditAppendix: true },
    );
    assert.equal(new TextDecoder().decode(pdf.bytes.slice(0, 4)), "%PDF");
    assert.deepEqual(pdf.paragraphs, word.paragraphs);
    assert.deepEqual(pdf.paragraphs, paragraphs);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
