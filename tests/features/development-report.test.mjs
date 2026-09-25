import test from "node:test";
import assert from "node:assert/strict";
import { makeDevelopmentReportFixture } from "../fixtures/development-report-fixture.mjs";
import { canonicalJson } from "../../src/core/backup/canonical-json.ts";
import { sha256Hex } from "../../src/core/backup/crypto.ts";
import {
  approveDevelopmentReport, assertDevelopmentReportBackupIntegrity, buildDevelopmentReportWorkspace,
  developmentReportDigestContent, getDevelopmentReportReadModel, isDevelopmentReportRecord,
  requireApprovedDevelopmentReport, saveDevelopmentReportDraft,
} from "../../src/features/development/development-report.ts";

test("açık kaynak seçimi ve öğretmen metni ayrı saklanır; taslak onaysız PDF olamaz", async () => {
  const { store, input, selection } = await makeDevelopmentReportFixture();
  const sourceBefore = structuredClone(store.snapshot.observations);
  const workspace = buildDevelopmentReportWorkspace(store.snapshot, input);
  assert.equal(workspace.availableEvidence.length, 1);
  const draft = await saveDevelopmentReportDraft(store, input);
  assert.equal(isDevelopmentReportRecord(draft), true);
  assert.equal(draft.status, "draft"); assert.equal(draft.approvalSeal, null);
  assert.deepEqual(draft.evidenceSnapshots[0].developmentSelection, selection);
  assert.equal(draft.evidenceSnapshots[0].rawText, sourceBefore[0].rawText);
  assert.equal(draft.evidenceSnapshots[0].confirmedTargets[0].referenceCode, "SAB.8");
  assert.equal(draft.evidenceSnapshots[0].confirmedTargets[0].sourcePage, 275);
  assert.equal(draft.evidenceSnapshots[0].supportLabel, "Hatırlatmayla");
  assert.deepEqual(store.snapshot.observations, sourceBefore);
  await assert.rejects(requireApprovedDevelopmentReport(store.snapshot, draft.id), /öğretmen onayı/);
  const approved = await approveDevelopmentReport(store, { reportId: draft.id, expectedRevision: draft.revision, now: input.now });
  const exported = await requireApprovedDevelopmentReport(store.snapshot, draft.id);
  assert.equal(exported.title, "Öğretmen gözlem özeti");
  assert.match(exported.notice, /Resmî MEB veya e-Okul raporu/);
  assert.equal(approved.approvalSeal.revision, 2);
  assert.equal(approved.approvalSeal.contentSha256, approved.contentSha256);
  assert.deepEqual(store.snapshot.observations, sourceBefore);
  await assertDevelopmentReportBackupIntegrity(store.snapshot);
});

test("boş taslak korunur; onay kaynak ve değerlendirme ister, sonraki destek isteğe bağlıdır", async () => {
  const { store, input } = await makeDevelopmentReportFixture();
  const draft = await saveDevelopmentReportDraft(store, { ...input, selectedObservationIds: [], teacherEvaluation: "", nextSupport: undefined });
  assert.equal(draft.nextSupport, "");
  assert.equal((await getDevelopmentReportReadModel(store.snapshot, draft.id)).missingFields.length, 2);
  await assert.rejects(approveDevelopmentReport(store, { reportId: draft.id, expectedRevision: 1, now: input.now }), /gözlem seçin/);
  const filled = await saveDevelopmentReportDraft(store, { ...input, nextSupport: "", reportId: draft.id, expectedRevision: draft.revision });
  assert.equal(filled.revision, 2);
  await approveDevelopmentReport(store, { reportId: filled.id, expectedRevision: 2, now: input.now });
});

test("onaylı sürüm değişmez; yeni taslak yeni onay gerektirir", async () => {
  const { store, input } = await makeDevelopmentReportFixture();
  const first = await saveDevelopmentReportDraft(store, input);
  const approved = await approveDevelopmentReport(store, { reportId: first.id, expectedRevision: 1, now: input.now });
  await assert.rejects(saveDevelopmentReportDraft(store, { ...input, reportId: approved.id, expectedRevision: 2 }), /Onaylı özet/);
  const next = await saveDevelopmentReportDraft(store, { ...input, teacherEvaluation: "Yeni öğretmen yorumu." });
  assert.notEqual(next.id, approved.id);
  assert.deepEqual(store.snapshot.settings.find((row) => row.id === approved.id), approved);
  await assert.rejects(requireApprovedDevelopmentReport(store.snapshot, next.id), /öğretmen onayı/);
});

test("yanlış çocuk, sınıf, dönem ve çift kaynak kimliği fail-closed; erken başlatılan yıl geçerlidir", async () => {
  const { store, input, otherStudentId } = await makeDevelopmentReportFixture();
  const before = await store.readSnapshot();
  for (const changes of [
    { studentId: otherStudentId }, { classroomId: crypto.randomUUID() },
    { periodStart: "2026-09-09" }, { periodEnd: "2026-08-30" }, { periodEnd: "2027-07-01" },
    { selectedObservationIds: [input.selectedObservationIds[0], input.selectedObservationIds[0]] },
  ]) await assert.rejects(saveDevelopmentReportDraft(store, { ...input, ...changes }));
  assert.deepEqual(store.snapshot, before);
  const early = await saveDevelopmentReportDraft(store, { ...input, periodStart: "2026-08-31" });
  assert.equal(early.periodStart, "2026-08-31");
});

test("kaydetme/onay sırasında değişen kaynak ve paralel taslak güncellemesi onay üretmez", async () => {
  for (const action of ["save", "approve"]) {
    const { store, input } = await makeDevelopmentReportFixture();
    const draft = action === "approve" ? await saveDevelopmentReportDraft(store, input) : null;
    store.beforeTransaction = (snapshot) => { snapshot.observations[0].rawText += " Eşzamanlı değişim."; };
    await assert.rejects(action === "save" ? saveDevelopmentReportDraft(store, input) : approveDevelopmentReport(store, { reportId: draft.id, expectedRevision: 1, now: input.now }), /değişti/);
    assert.equal(store.snapshot.settings.filter((row) => row.settingType === "development-report" && row.status === "approved").length, 0);
  }
  const { store, input } = await makeDevelopmentReportFixture();
  const draft = await saveDevelopmentReportDraft(store, input);
  await saveDevelopmentReportDraft(store, { ...input, reportId: draft.id, expectedRevision: 1, nextSupport: "Yeni fırsat." });
  await assert.rejects(saveDevelopmentReportDraft(store, { ...input, reportId: draft.id, expectedRevision: 1 }), /başka bir işlemde değişti/);
});

test("onay sonrası ham metin, hedef, destek, sınıf adı ve öğretmen metni değişikliği PDF kapısını kapatır", async () => {
  const { store, input } = await makeDevelopmentReportFixture();
  const draft = await saveDevelopmentReportDraft(store, input);
  await approveDevelopmentReport(store, { reportId: draft.id, expectedRevision: 1, now: input.now });
  const good = await store.readSnapshot();
  for (const mutate of [
    (snapshot) => { snapshot.observations[0].rawText += " Değişti."; },
    (snapshot) => { snapshot.evidenceCurriculumLinks[0].targetSnapshot.referenceTitle = "Uydurma"; },
    (snapshot) => { snapshot.observations[0].developmentSelection.support = "together"; },
    (snapshot) => { snapshot.classrooms[0].teacherName = "Başka Öğretmen"; },
    (snapshot) => { snapshot.students[0].deletedAt = input.now.toISOString(); },
    (snapshot) => { snapshot.settings.find((row) => row.id === draft.id).teacherEvaluation = "Onaysız yorum"; },
    (snapshot) => { snapshot.settings.find((row) => row.id === draft.id).approvalSeal.approvedByUserId = crypto.randomUUID(); },
  ]) {
    const changed = structuredClone(good); mutate(changed);
    await assert.rejects(requireApprovedDevelopmentReport(changed, draft.id), /öğretmen onayı/);
  }
  const stale = structuredClone(good); stale.observations[0].rawText += " Değişti.";
  assert.equal((await getDevelopmentReportReadModel(stale, draft.id)).sourceStatus, "stale");
  await assertDevelopmentReportBackupIntegrity(stale); // History is retained, export stays closed.
});

test("atomik disk hatası taslağı/yerel kimliği korur; güvenli yeniden denemede tek onay vardır", async () => {
  const { store, input } = await makeDevelopmentReportFixture();
  const draft = await saveDevelopmentReportDraft(store, input);
  store.snapshot.settings = store.snapshot.settings.filter((row) => row.settingType !== "local-teacher-identity");
  const before = await store.readSnapshot();
  store.failReportWrite = true;
  await assert.rejects(approveDevelopmentReport(store, { reportId: draft.id, expectedRevision: 1, now: input.now }), /disk hatası/);
  assert.deepEqual(store.snapshot, before);
  store.failReportWrite = false;
  await approveDevelopmentReport(store, { reportId: draft.id, expectedRevision: 1, now: input.now });
  await assert.rejects(approveDevelopmentReport(store, { reportId: draft.id, expectedRevision: 1, now: input.now }));
  assert.equal(store.snapshot.settings.filter((row) => row.settingType === "development-report").length, 1);
});

test("snapshot hedef/destek tahrifi yeniden rapor hash'i hesaplansa bile kaynak sözleşmesini geçemez", async () => {
  const { store, input } = await makeDevelopmentReportFixture();
  const draft = await saveDevelopmentReportDraft(store, input);
  for (const mutate of [
    (record) => { record.evidenceSnapshots[0].confirmedTargets[0].referenceTitle = "Uydurma"; },
    (record) => { record.evidenceSnapshots[0].supportLabel = "Bağımsız"; },
    (record) => { record.evidenceSnapshots[0].confirmedLinks[0].holisticGraphReference.relatedNodeIds.pop(); },
    (record) => { record.evidenceSnapshots[0].contextSnapshot.assignedStudentIds = [input.studentId, crypto.randomUUID()]; },
  ]) {
    const snapshot = await store.readSnapshot();
    const record = snapshot.settings.find((row) => row.id === draft.id); mutate(record);
    record.contentSha256 = await sha256Hex(developmentReportDigestContent(record));
    await assert.rejects(assertDevelopmentReportBackupIntegrity(snapshot));
  }
  assert.equal(canonicalJson(store.snapshot.settings.find((row) => row.id === draft.id)), canonicalJson(draft));
});

test("gözlem günündeki üyelik zorunlu; sonradan katılan veya belirsiz çocuk rapora eklenmez", async () => {
  const { store, input } = await makeDevelopmentReportFixture();
  const student = store.snapshot.students.find((row) => row.id === input.studentId);
  student.enrollments = [{ id: crypto.randomUUID(), classroomId: input.classroomId, academicYearId: input.academicYearId, startedOn: "2026-09-09", status: "active", schemaVersion: 1 }];
  assert.equal(buildDevelopmentReportWorkspace(store.snapshot, input).availableEvidence.length, 0);
  await assert.rejects(saveDevelopmentReportDraft(store, input), /döneme ait değil/);
  student.enrollments = [];
  await assert.rejects(saveDevelopmentReportDraft(store, input), /sınıf ve eğitim yılına ait değil/);
  delete student.enrollments;
  store.snapshot.observations[0].studentIds.push(crypto.randomUUID());
  await assert.rejects(saveDevelopmentReportDraft(store, input), /döneme ait değil/);
});

test("öğretmenin ekranda gördüğü kaynak kaydetmeden önce değişirse sessizce yeni kaynak alınmaz", async () => {
  const { store, input } = await makeDevelopmentReportFixture();
  const expectedEvidenceSnapshots = buildDevelopmentReportWorkspace(store.snapshot, input).availableEvidence;
  store.snapshot.observations[0].rawText += " Başka sekmede değişim.";
  await assert.rejects(saveDevelopmentReportDraft(store, { ...input, expectedEvidenceSnapshots }), /Ekranda görünen gözlem kaynakları değişti/);
  assert.equal(store.snapshot.settings.filter((row) => row.settingType === "development-report").length, 0);
});
