import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOfficialReportPreparation,
  OFFICIAL_REPORT_PREPARATION_NOTICE,
} from "../../src/features/development/official-report-preparation.ts";
import { makeDevelopmentReportFixture } from "../fixtures/development-report-fixture.mjs";

test("Ek 4 ve e-Okul hazırlığı çocuk, yıl, dönem ve doğrulanmış program alanını kaynak gözleme bağlar", async () => {
  const { store, input, observationId } = await makeDevelopmentReportFixture();
  const scope = {
    studentId: input.studentId,
    classroomId: input.classroomId,
    academicYearId: input.academicYearId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  };
  const view = buildOfficialReportPreparation(store.snapshot, scope, [observationId]);
  assert.equal(view.kind, "teacher-preparation");
  assert.equal(view.destination, "Ek 4 / e-Okul");
  assert.equal(view.status, "ready-for-teacher-review");
  assert.equal(view.notice, OFFICIAL_REPORT_PREPARATION_NOTICE);
  assert.deepEqual(view.child, { id: input.studentId, displayName: "Kurgu Çocuk 1" });
  assert.deepEqual(view.academicYear, { id: input.academicYearId, name: "Kurgu Eğitim Yılı" });
  assert.deepEqual(view.period, { start: "2026-09-01", end: "2026-09-30" });
  assert.equal(view.evidence[0].sourceAnchor, `development-observation-${observationId}`);
  assert.equal(view.evidence[0].rawText, store.snapshot.observations[0].rawText);
  assert.equal(view.programFields[0].domain, "Sosyal");
  assert.equal(view.programFields[0].references[0].observationId, observationId);
  assert.equal(view.programFields[0].references[0].referenceCode, "SAB.8");
  assert.deepEqual(view.claims, {
    automaticSkillAcquisition: false,
    childScore: false,
    officialReportCreated: false,
    eOkulTransferPerformed: false,
  });
});

test("hazırlık seçimi boş kalabilir; tekrar veya başka kapsam gözlemi kabul edilmez", async () => {
  const { store, input, observationId } = await makeDevelopmentReportFixture();
  const scope = {
    studentId: input.studentId,
    classroomId: input.classroomId,
    academicYearId: input.academicYearId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  };
  const empty = buildOfficialReportPreparation(store.snapshot, scope, []);
  assert.equal(empty.status, "evidence-selection-required");
  assert.deepEqual(empty.evidence, []);
  await assert.rejects(
    async () => buildOfficialReportPreparation(store.snapshot, scope, [observationId, observationId]),
    /aynı gözlem/u,
  );
  await assert.rejects(
    async () => buildOfficialReportPreparation(store.snapshot, scope, [crypto.randomUUID()]),
    /başka çocuk, sınıf, yıl veya dönem/u,
  );
});
