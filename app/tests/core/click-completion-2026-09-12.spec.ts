import { expect, test } from "@playwright/test";

test("eşleşmeyen öğretmen ifadesinde kaynak seçimi ve değerlendirme tek kaydetmeyle tamamlanır; yedek korunur", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fx = await import("/tests/fixtures/observation-management-fixture.mjs");
    const work = await import("/src/features/work-packages/work-package-service.ts");
    const wm = await import("/src/features/work-packages/work-package-model.ts");
    const flow = await import("/src/features/evidence/evidence-flow.ts");
    const source = new core.IndexedDbDataStore({ databaseName: `click-complete-${crypto.randomUUID()}` });
    const fixture = await fx.makeObservationManagementFixture(source);
    await source.transaction("readwrite", ["observations"], async tx => {
      const observation = (await tx.getAll("observations")).find(o => o.id === fixture.observationId)!;
      await tx.putMany("observations", [{ ...observation, rawText: "Kurgu: benim sözcüklerimle kaydettiğim olay." }]);
    });
    const now = new Date("2026-09-12T09:00:00Z");
    const model = await work.loadWorkPackageModel(source, { civilDate: "2026-09-12", studentId: fixture.studentId, observationId: fixture.observationId, mode: "observations", now });
    const candidate = model.candidates.find(c => c.id.includes(fixture.observationId))!;
    const option = candidate.choices.find(c => c.id.startsWith("source:development:"))!;
    if (!option) throw new Error("Kaynak seçimi hazırlanmadı.");
    await work.applyWorkPackage(source, { ...wm.prepareWorkPackageSelection(model, { selections: { [candidate.id]: option.id } }), now });
    const linked = await source.readSnapshot();
    const actualLinks = linked.evidenceCurriculumLinks.filter(l => l.observationId === fixture.observationId);
    const assessment = await flow.createCitedAssessmentDraft(source, { draftId: crypto.randomUUID(), studentId: fixture.studentId, observationIds: [fixture.observationId], teacherAssessmentText: "Kurgu öğretmenin gözleme dayanan kendi değerlendirmesi.", completeTeacherAssessment: true, periodStart: "2026-09-10", periodEnd: "2026-09-10", now });
    const legacy = await flow.createCitedAssessmentDraft(source, { draftId: crypto.randomUUID(), studentId: fixture.studentId, observationIds: [fixture.observationId], teacherAssessmentText: "Kurgu daha önce yazılmış öğretmen değerlendirmesi.", periodStart: "2026-09-10", periodEnd: "2026-09-10", now });
    const completion = await import("/src/features/evidence/teacher-assessment-completion.ts");
    const beforeComplete = await source.readSnapshot();
    await completion.completeTeacherAssessments(source, { snapshot: beforeComplete, ids: [legacy.draft.id], now });
    const legacySaved = (await source.readSnapshot()).reportDrafts.find(record => record.id === legacy.draft.id)?.status;
    let staleRejected = false;
    try { await completion.completeTeacherAssessments(source, { snapshot: beforeComplete, ids: [legacy.draft.id], now }); } catch { staleRejected = true; }
    const backup = new core.BackupService(source, { appVersion: "0.42.0-test", clock: () => now, civilDateProvider: () => "2026-09-12" });
    const exported = await backup.exportBackup();
    await backup.parseAndVerifyBackup(exported);
    const restored = new core.IndexedDbDataStore({ databaseName: `click-restored-${crypto.randomUUID()}` });
    await new core.BackupService(restored, { appVersion: "0.42.0-test", clock: () => now, civilDateProvider: () => "2026-09-12" }).restoreBackup(exported, { mode: "replace", createRecoverySnapshot: false });
    const same = core.canonicalJson(await restored.readSnapshot()) === core.canonicalJson(await source.readSnapshot());
    source.close(); restored.close();
    return { legacySaved, staleRejected, linkCount: actualLinks.length, rawText: linked.observations.find(o => o.id === fixture.observationId)?.rawText, status: assessment.draft.status, review: assessment.draft.teacherReviewRequired, savedBy: !!assessment.draft.reviewedByUserId, same };
  });
  expect(result.linkCount).toBe(1);
  expect(result.rawText).toBe("Kurgu: benim sözcüklerimle kaydettiğim olay.");
  expect(result.status).toBe("teacher-saved");
  expect(result.review).toBe(false);
  expect(result.savedBy).toBe(true);
  expect(result.same).toBe(true);
  expect(result.legacySaved).toBe("teacher-saved");
  expect(result.staleRejected).toBe(true);
});
