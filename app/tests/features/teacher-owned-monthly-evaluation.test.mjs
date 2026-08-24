import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  TEACHER_MONTHLY_PROGRAM_CRITERIA,
  TEACHER_MONTHLY_TEACHER_CRITERIA,
} from "../../src/core/domain/teacher-owned-monthly-evaluation.ts";
import {
  createTeacherOwnedPlanGraph,
  loadTeacherOwnedPlanGraph,
  loadTeacherMonthlyReviewContext,
  recordTeacherMonthlyEvaluation,
  reviewTeacherMonthlyCarry,
} from "../../src/features/planning/teacher-owned-plan-service.ts";
import { buildStandaloneTeacherOwnedPlanParagraphs } from "../../src/features/planning/teacher-owned-plan-document.ts";

class MemoryStore {
  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const tx = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(working[collection].map((record) => [record.id, record]));
        for (const record of records) byId.set(record.id, structuredClone(record));
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => { working[collection] = []; },
    };
    const result = await task(tx);
    if (mode === "readwrite") {
      for (const collection of collections) this.snapshot[collection] = working[collection];
    }
    return structuredClone(result);
  }

  async readSnapshot() { return structuredClone(this.snapshot); }
  close() {}
}

const yearId = "00000000-0000-4000-8000-000000000c01";
const classroomId = "00000000-0000-4000-8000-000000000c02";
const studentIds = [
  "00000000-0000-4000-8000-000000000c11",
  "00000000-0000-4000-8000-000000000c12",
  "00000000-0000-4000-8000-000000000c13",
];
const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};

function criteria(definitions, status = "observed-working") {
  return definitions.map(([criterionId]) => ({ criterionId, status }));
}

async function monthlyStore() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026–2027",
    startDate: "2026-09-07",
    endDate: "2027-06-25",
    status: "active",
  });
  snapshot.classrooms.push({ ...base, id: classroomId, academicYearId: yearId, name: "Kurgu Sınıf" });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  studentIds.forEach((id, index) => snapshot.students.push({
    ...base,
    id,
    academicYearId: yearId,
    classroomId,
    displayName: ["Ada Kurgu", "Bora Kurgu", "Cem Kurgu"][index],
    enrollmentStatus: "active",
  }));
  const store = new MemoryStore(snapshot);
  const graph = await createTeacherOwnedPlanGraph(store, {
    title: "Yıllık öğretmen planı",
    periodStart: "2026-09-07",
    periodEnd: "2027-06-25",
    teacherContent: { narrative: "Güvenli sınıf topluluğu" },
    months: [
      {
        title: "Eylül öğretmen planı",
        monthKey: "2026-09",
        periodStart: "2026-09-07",
        periodEnd: "2026-09-30",
        teacherContent: { narrative: "Uyum ve aidiyet" },
        weeks: [
          {
            title: "7–11 Eylül",
            weekKey: "2026-W37",
            periodStart: "2026-09-07",
            periodEnd: "2026-09-11",
            teacherContent: { narrative: "İlk hafta" },
          },
          {
            title: "14–18 Eylül",
            weekKey: "2026-W38",
            periodStart: "2026-09-14",
            periodEnd: "2026-09-18",
            teacherContent: { narrative: "İkinci hafta" },
          },
        ],
      },
      {
        title: "Ekim öğretmen planı",
        monthKey: "2026-10",
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        teacherContent: { narrative: "Katılım yollarını çeşitlendirme" },
        weeks: [{
          title: "1–7 Ekim",
          weekKey: "2026-10-01_2026-10-07",
          periodStart: "2026-10-01",
          periodEnd: "2026-10-07",
          teacherContent: { narrative: "Ekim başlangıç haftası" },
        }],
      },
    ],
    now: new Date("2026-09-02T06:00:00.000Z"),
  });
  const monthly = graph.months[0].monthly;
  const weeks = graph.months[0].weeks;
  const seeded = store.snapshot;
  const dates = ["2026-09-08", "2026-09-15", "2026-09-15"];
  for (let index = 0; index < studentIds.length; index += 1) {
    const week = index === 0 ? weeks[0] : weeks[1];
    const suffix = String(index + 1);
    const dailyId = `00000000-0000-4000-8000-000000000d${suffix}1`;
    const activityId = `00000000-0000-4000-8000-000000000d${suffix}2`;
    const observationId = `00000000-0000-4000-8000-000000000d${suffix}3`;
    const linkId = `00000000-0000-4000-8000-000000000d${suffix}4`;
    const timestamp = `${dates[index]}T09:00:00.000Z`;
    seeded.plans.push({
      ...base,
      id: dailyId,
      createdAt: timestamp,
      updatedAt: timestamp,
      civilDate: dates[index],
      planType: "daily",
      academicYearId: yearId,
      classroomId,
      sourceAnnualPlanId: graph.annual.id,
      sourceMonthlyPlanId: monthly.id,
      sourceWeeklyPlanId: week.id,
      title: `Günlük ${suffix}`,
    });
    seeded.activities.push({
      ...base,
      id: activityId,
      createdAt: timestamp,
      updatedAt: timestamp,
      civilDate: dates[index],
      academicYearId: yearId,
      classroomId,
      planId: dailyId,
      sourceAnnualPlanId: graph.annual.id,
      sourceMonthlyPlanId: monthly.id,
      sourceWeeklyPlanId: week.id,
      title: `Etkinlik ${suffix}`,
    });
    seeded.observations.push({
      ...base,
      id: observationId,
      createdAt: timestamp,
      updatedAt: timestamp,
      observedAt: timestamp,
      civilDate: dates[index],
      academicYearId: yearId,
      classroomId,
      planId: dailyId,
      activityId,
      studentIds: [studentIds[index]],
      rawText: `Kurgu gözlem ${suffix}`,
      rawTextImmutable: true,
    });
    seeded.evidenceCurriculumLinks.push({
      ...base,
      id: linkId,
      createdAt: timestamp,
      updatedAt: timestamp,
      civilDate: dates[index],
      academicYearId: yearId,
      classroomId,
      observationId,
      referenceCode: `KB${suffix}`,
      referenceTitle: `Kurgu program bağı ${suffix}`,
      confirmationMethod: "teacher-confirmed",
      approvedByUserId: "00000000-0000-4000-8000-000000000c99",
      confirmedAt: timestamp,
    });
  }
  return { store, graph, monthly, nextMonthly: graph.months[1].monthly };
}

test("öğretmene ait aylık değerlendirme gerçek iki hafta kanıtını, tüm aktif çocuk kapsamını ve üç yönü append-only kaydeder", async () => {
  const { store, monthly } = await monthlyStore();
  const context = await loadTeacherMonthlyReviewContext(store, monthly.id);
  assert.equal(context.observations.length, 3);
  assert.equal(context.availableCoverage.distinctCivilDateCount, 2);
  assert.equal(context.availableCoverage.distinctWeekCount, 2);
  assert.deepEqual(context.availableCoverage.uncoveredActiveStudentIds, []);

  const evaluation = await recordTeacherMonthlyEvaluation(store, {
    monthlyPlanId: monthly.id,
    expectedMonthlyUpdatedAt: monthly.updatedAt,
    childEvidenceState: "sufficient-evidence",
    childNarrative: "Üç çocuğun katılımına ilişkin iki haftalık kanıtlar birlikte incelendi.",
    observationIds: context.observations.map((observation) => observation.id),
    curriculumLinkIds: context.observations.flatMap((observation) =>
      observation.curriculumLinks.map((link) => link.id),
    ),
    programCriteria: criteria(TEACHER_MONTHLY_PROGRAM_CRITERIA),
    programNarrative: "Programın süre, katılım ve etkinlik çeşitliliği güçlü çalıştı.",
    teacherCriteria: criteria(TEACHER_MONTHLY_TEACHER_CRITERIA, "needs-adjustment"),
    teacherNarrative: "Geçişlerde daha esnek süre ve çocuk seçimi kullanacağım.",
    nextMonthRecommendation: "Sonraki ay küçük grup gözlemlerini artıracağım.",
    now: new Date("2026-09-30T15:00:00.000Z"),
  });
  assert.equal(evaluation.children.evidenceState, "sufficient-evidence");
  assert.equal(evaluation.children.coverage.coveredActiveStudentIds.length, 3);
  assert.equal(evaluation.program.criteria.length, 11);
  assert.equal(evaluation.teacher.criteria.length, 12);

  const reloaded = await loadTeacherMonthlyReviewContext(store, monthly.id);
  assert.equal(reloaded.evaluations.length, 1);
  assert.deepEqual(reloaded.evaluations[0], evaluation);
  const graph = await loadTeacherOwnedPlanGraph(store);
  const documentText = buildStandaloneTeacherOwnedPlanParagraphs(
    graph,
    [],
    { includeAuditAppendix: true },
  )
    .map((paragraph) => paragraph.text)
    .join("\n");
  assert.match(documentText, /Aylık üç yönlü değerlendirme/);
  assert.match(documentText, /Çocuklar yönü · Kanıt yeterli/);
  assert.match(documentText, /Program yönü:/);
  assert.match(documentText, /Öğretmen yönü:/);
  assert.match(documentText, /Sonraki ay önerisi:/);
  assert.match(documentText, new RegExp(evaluation.id.slice(0, 8)));
});

test("ay bitmeden nihai aylık değerlendirme ve sonraki ay önerisi yazmaz", async () => {
  const { store, monthly } = await monthlyStore();
  const context = await loadTeacherMonthlyReviewContext(store, monthly.id);
  const before = await store.readSnapshot();

  await assert.rejects(
    () => recordTeacherMonthlyEvaluation(store, {
      monthlyPlanId: monthly.id,
      expectedMonthlyUpdatedAt: monthly.updatedAt,
      childEvidenceState: "sufficient-evidence",
      childNarrative: "Üç çocuk için iki haftalık kanıt birlikte incelendi.",
      observationIds: context.observations.map((observation) => observation.id),
      curriculumLinkIds: context.observations.flatMap((observation) =>
        observation.curriculumLinks.map((link) => link.id),
      ),
      programCriteria: criteria(TEACHER_MONTHLY_PROGRAM_CRITERIA),
      programNarrative: "Programın ilk iki haftasına ait ara kanıtlar incelendi.",
      teacherCriteria: criteria(TEACHER_MONTHLY_TEACHER_CRITERIA),
      teacherNarrative: "Ay sonuna kadar yeni kanıtları toplamaya devam edeceğim.",
      nextMonthRecommendation: "Ay sonu kanıtı oluşmadan öneri kesinleştirilmemeli.",
      now: new Date("2026-09-18T15:00:00.000Z"),
    }),
    (error) =>
      error?.code === "invalid-input" &&
      /2026-09-30 günü tamamlanmadan nihai kayıt/.test(error.message),
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("aylık öneri hedef ayı sessiz değiştirmez; öğretmen kabul, geri açma ve ret kararını append-only yönetir", async () => {
  const { store, monthly, nextMonthly } = await monthlyStore();
  const context = await loadTeacherMonthlyReviewContext(store, monthly.id);
  const evaluation = await recordTeacherMonthlyEvaluation(store, {
    monthlyPlanId: monthly.id,
    expectedMonthlyUpdatedAt: monthly.updatedAt,
    childEvidenceState: "sufficient-evidence",
    childNarrative: "Üç çocuk için iki haftalık kanıt birlikte incelendi.",
    observationIds: context.observations.map((observation) => observation.id),
    curriculumLinkIds: context.observations.flatMap((observation) =>
      observation.curriculumLinks.map((link) => link.id),
    ),
    programCriteria: criteria(TEACHER_MONTHLY_PROGRAM_CRITERIA),
    programNarrative: "Programın katılım yolları güçlü, geçişleri uyarlamak gerekiyor.",
    teacherCriteria: criteria(TEACHER_MONTHLY_TEACHER_CRITERIA, "needs-adjustment"),
    teacherNarrative: "Küçük grup geçişlerine daha fazla seçim yolu ekleyeceğim.",
    nextMonthRecommendation: "Ekim ayında küçük grup geçişlerine görsel seçim yolları ekle.",
    now: new Date("2026-09-30T15:00:00.000Z"),
  });
  assert.equal(evaluation.nextMonthTargetPlanId, nextMonthly.id);
  assert.equal(evaluation.targetPlanRevisionNumberAtSuggestion, 1);

  let graph = await loadTeacherOwnedPlanGraph(store);
  let target = graph.months[1].monthly;
  assert.equal(target.nextMonthDecisionContext.applicationStatus, "pending-teacher-review");
  assert.equal(target.teacherContent.narrative, "Katılım yollarını çeşitlendirme");

  const accepted = await reviewTeacherMonthlyCarry(store, {
    monthlyPlanId: target.id,
    expectedMonthlyUpdatedAt: target.updatedAt,
    expectedEvaluationId: evaluation.id,
    action: "accepted",
    teacherNote: "Kanıt küçük grup geçişlerinde görsel seçimi destekliyor.",
    acceptedNarrative: "Küçük grup geçişlerinde iki görsel seçim yolu sunulacak.",
    now: new Date("2026-09-30T15:02:00.000Z"),
  });
  assert.equal(accepted.revisionNumber, 2);
  assert.equal(accepted.nextMonthDecisionContext.applicationStatus, "accepted");
  assert.equal(
    accepted.teacherContent.narrative,
    "Küçük grup geçişlerinde iki görsel seçim yolu sunulacak.",
  );

  const idempotent = await reviewTeacherMonthlyCarry(store, {
    monthlyPlanId: target.id,
    expectedMonthlyUpdatedAt: target.updatedAt,
    expectedEvaluationId: evaluation.id,
    action: "accepted",
    teacherNote: "Kanıt küçük grup geçişlerinde görsel seçimi destekliyor.",
    acceptedNarrative: "Küçük grup geçişlerinde iki görsel seçim yolu sunulacak.",
    now: new Date("2026-09-30T15:02:30.000Z"),
  });
  assert.equal(idempotent.revisionNumber, 2);

  const reopened = await reviewTeacherMonthlyCarry(store, {
    monthlyPlanId: accepted.id,
    expectedMonthlyUpdatedAt: accepted.updatedAt,
    expectedEvaluationId: evaluation.id,
    action: "reopened",
    teacherNote: "Planı sınıfın yeni durumu nedeniyle yeniden değerlendireceğim.",
    now: new Date("2026-09-30T15:03:00.000Z"),
  });
  assert.equal(reopened.revisionNumber, 3);
  assert.equal(reopened.nextMonthDecisionContext.applicationStatus, "pending-teacher-review");
  assert.equal(reopened.teacherContent.narrative, "Katılım yollarını çeşitlendirme");

  const rejected = await reviewTeacherMonthlyCarry(store, {
    monthlyPlanId: reopened.id,
    expectedMonthlyUpdatedAt: reopened.updatedAt,
    expectedEvaluationId: evaluation.id,
    action: "rejected",
    teacherNote: "Yeni gözlemler farklı bir önceliğe işaret ediyor.",
    now: new Date("2026-09-30T15:04:00.000Z"),
  });
  assert.equal(rejected.revisionNumber, 4);
  assert.equal(rejected.nextMonthDecisionContext.applicationStatus, "rejected");
  assert.deepEqual(
    rejected.nextMonthDecisionContext.reviewHistory.map((entry) => entry.action),
    ["accepted", "reopened", "rejected"],
  );
  assert.equal(rejected.teacherContent.narrative, "Katılım yollarını çeşitlendirme");

  graph = await loadTeacherOwnedPlanGraph(store);
  target = graph.months[1].monthly;
  const documentText = buildStandaloneTeacherOwnedPlanParagraphs(graph)
    .map((paragraph) => paragraph.text)
    .join("\n");
  assert.match(documentText, /Önceki aydan öneri · Öğretmen gerekçesiyle reddetti/);
  assert.match(documentText, /Yeni gözlemler farklı bir önceliğe işaret ediyor/);
  assert.equal(target.revisionHistory.length, 3);
});

test("eksik çocukla yeterli hükmü reddeder; yetersiz kanıt kaydını dürüstçe korur", async () => {
  const { store, monthly } = await monthlyStore();
  const context = await loadTeacherMonthlyReviewContext(store, monthly.id);
  const selected = context.observations.slice(0, 2);
  const before = await store.readSnapshot();
  await assert.rejects(
    () => recordTeacherMonthlyEvaluation(store, {
      monthlyPlanId: monthly.id,
      expectedMonthlyUpdatedAt: monthly.updatedAt,
      childEvidenceState: "sufficient-evidence",
      childNarrative: "İki çocuk için kanıt var.",
      observationIds: selected.map((observation) => observation.id),
      curriculumLinkIds: selected.flatMap((observation) => observation.curriculumLinks.map((link) => link.id)),
      programCriteria: criteria(TEACHER_MONTHLY_PROGRAM_CRITERIA),
      programNarrative: "Program notu",
      teacherCriteria: criteria(TEACHER_MONTHLY_TEACHER_CRITERIA),
      teacherNarrative: "Öğretmen notu",
      nextMonthRecommendation: "Daha fazla kanıt topla",
      now: new Date("2026-09-30T15:00:00.000Z"),
    }),
    (error) => error?.code === "invalid-input" && /aktif sınıftaki her çocuğun/.test(error.message),
  );
  assert.deepEqual(await store.readSnapshot(), before);

  const insufficient = await recordTeacherMonthlyEvaluation(store, {
    monthlyPlanId: monthly.id,
    expectedMonthlyUpdatedAt: monthly.updatedAt,
    childEvidenceState: "insufficient-evidence",
    childNarrative: "Ay geneli için yeterli kanıt oluşmadı; eksiklik görünür bırakıldı.",
    observationIds: [],
    curriculumLinkIds: [],
    programCriteria: criteria(TEACHER_MONTHLY_PROGRAM_CRITERIA, "not-observed"),
    programNarrative: "Program yönü için genelleme yapılmadı.",
    teacherCriteria: criteria(TEACHER_MONTHLY_TEACHER_CRITERIA, "not-observed"),
    teacherNarrative: "Kanıt toplama düzenini güçlendireceğim.",
    nextMonthRecommendation: "İki haftaya yayılan dengeli gözlem planı kur.",
    now: new Date("2026-09-30T15:00:00.000Z"),
  });
  assert.equal(insufficient.children.evidenceState, "insufficient-evidence");
  assert.equal(insufficient.children.coverage.observationCount, 0);
});
