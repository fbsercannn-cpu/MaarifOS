import assert from "node:assert/strict";
import test from "node:test";
import {
  approveDevelopmentReport,
  saveDevelopmentReportDraft,
} from "../../src/features/development/development-report.ts";
import {
  buildTeachingStateSeparation,
  TEACHING_STATE_NOTICES,
} from "../../src/features/planning/teaching-state-separation.ts";
import { makeDevelopmentReportFixture } from "../fixtures/development-report-fixture.mjs";

test("planlandı, uygulandı, gözlendi ve öğretmen yargısı yalnız kendi gerçek kaynaklarından oluşur", async () => {
  const { store, input } = await makeDevelopmentReportFixture();
  store.snapshot.activities[0].status = "completed";
  store.snapshot.activities[0].studentIds = [input.studentId];
  const scope = {
    academicYearId: input.academicYearId,
    classroomId: input.classroomId,
    studentId: input.studentId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  };
  const initial = buildTeachingStateSeparation(store.snapshot, scope);
  assert.equal(initial.planned.kind, "planned");
  assert.equal(initial.applied.kind, "applied");
  assert.equal(initial.observed.kind, "observed");
  assert.equal(initial.teacherJudgement.kind, "teacher-judgement");
  assert.equal(initial.planned.records.length, 1);
  assert.equal(initial.applied.records.length, 1);
  assert.equal(initial.observed.records.length, 1);
  assert.equal(initial.teacherJudgement.records.length, 0);
  assert.equal(initial.planned.records[0].coverageOnly, true);
  assert.equal(initial.planned.records[0].childScore, null);
  assert.equal(initial.planned.records[0].childEvaluation, null);
  assert.equal(initial.applied.records[0].observationClaim, false);
  assert.equal(initial.observed.records[0].teacherJudgementClaim, false);
  assert.match(TEACHING_STATE_NOTICES.planned, /çocuk puanı veya değerlendirmesi değildir/u);

  const sourceObservation = structuredClone(store.snapshot.observations[0]);
  const draft = await saveDevelopmentReportDraft(store, input);
  await approveDevelopmentReport(store, {
    reportId: draft.id,
    expectedRevision: draft.revision,
    now: input.now,
  });
  const judged = buildTeachingStateSeparation(store.snapshot, scope);
  assert.equal(judged.teacherJudgement.records.length, 1);
  assert.equal(judged.teacherJudgement.records[0].teacherEvaluation, input.teacherEvaluation);
  assert.equal(judged.teacherJudgement.records[0].teacherAuthored, true);
  assert.equal(judged.teacherJudgement.records[0].automaticSkillAcquisitionClaim, false);
  assert.deepEqual(store.snapshot.observations[0], sourceObservation);
});

test("yeni plan yalnız plan kapsamını değiştirir; uygulama, gözlem ve yargı sayıları değişmez", async () => {
  const { store, input } = await makeDevelopmentReportFixture();
  const scope = {
    academicYearId: input.academicYearId,
    classroomId: input.classroomId,
    studentId: input.studentId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  };
  const before = buildTeachingStateSeparation(store.snapshot, scope);
  store.snapshot.plans.push({
    ...structuredClone(store.snapshot.plans[0]),
    id: crypto.randomUUID(),
    title: "Kurgu gelecek oyun planı",
    curriculumTargets: [{ id: "planned-only", referenceTitle: "Yalnız plan kapsamı" }],
  });
  const after = buildTeachingStateSeparation(store.snapshot, scope);
  assert.equal(after.planned.records.length, before.planned.records.length + 1);
  assert.deepEqual(after.applied.records, before.applied.records);
  assert.deepEqual(after.observed.records, before.observed.records);
  assert.deepEqual(after.teacherJudgement.records, before.teacherJudgement.records);
  assert.deepEqual(after.contract, {
    planCoverageCreatesChildScore: false,
    planOrApplicationCreatesObservation: false,
    observationCreatesTeacherJudgement: false,
    anyStageCreatesAutomaticSkillAcquisition: false,
  });
});
