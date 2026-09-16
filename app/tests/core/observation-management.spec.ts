import { expect, test } from "@playwright/test";

test("Olay tarihi ve gerçek etkinlik/hedef bağları çevrimdışı düzeltilir; yedek ve tekrar güvenliği korunur", async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async () => {
    const core = await import("/src/core/index.ts"), fx = await import("/tests/fixtures/observation-management-fixture.mjs");
    const models = await import("/src/features/observation-management/observation-management-model.ts"), service = await import("/src/features/observation-management/observation-management-service.ts");
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const store = new core.IndexedDbDataStore({ databaseName: `metadata-source-${crypto.randomUUID()}` });
    const fixture = await fx.makeObservationManagementFixture(store);
    Object.assign(window, { metadataTest: { core, store, fixture, models, service, evidence } });
  });
  await context.setOffline(true);
  const result = await page.evaluate(async () => {
    const { core, store, fixture: f, models, service, evidence } = (window as any).metadataTest;
    const model = async (day = "2026-09-09", id = f.observationId) => models.observationMetadataModel(await store.readSnapshot(), id, day, f.now);
    const first = await model(), original = structuredClone(first.observation);
    const fallback = { kind: "spontaneous", clearProgramLinks: first.spontaneousClearsLinks };
    await service.saveObservationMetadata(store, { model: first, placement: fallback, now: f.now });
    const repeated = await service.saveObservationMetadata(store, { model: first, placement: fallback, now: f.now });
    let snapshot = await store.readSnapshot();
    const moved = snapshot.observations.find(o => o.id === f.observationId)!;
    const immutable = ["rawText", "context", "childQuote", "createdAt"].every(field => moved[field] === original[field]);
    const matchingContext = snapshot.activities.find(a => a.id === moved.activityId)?.civilDate === "2026-09-09" && snapshot.plans.find(p => p.id === moved.planId)?.civilDate === "2026-09-09";
    const next = await model(), candidate = next.placements[0];
    const placement = { kind: "activity", activityId: candidate.id, targetId: candidate.targets[0].id, clearProgramLinks: candidate.clearProgramLinks, expectedActivityUpdatedAt: candidate.expectedActivityUpdatedAt, expectedPlanUpdatedAt: candidate.expectedPlanUpdatedAt };
    await service.saveObservationMetadata(store, { model: next, placement, now: f.now });
    const repeatLink = await service.saveObservationMetadata(store, { model: next, placement, now: f.now });
    snapshot = await store.readSnapshot();
    const assigned = snapshot.observations.find(o => o.id === f.observationId)!, links = snapshot.evidenceCurriculumLinks.filter(l => l.observationId === f.observationId);
    const developmentModel = await model("2026-09-09", f.input.selectedObservationIds[0]);
    await service.saveObservationMetadata(store, { model: developmentModel, placement: { kind: "spontaneous", clearProgramLinks: developmentModel.spontaneousClearsLinks }, now: f.now });
    snapshot = await store.readSnapshot();
    const backup = new core.BackupService(store, { appVersion: "0.36.0", clock: () => f.now }), exported = await backup.exportBackup();
    await backup.parseAndVerifyBackup(exported);
    const target = new core.IndexedDbDataStore({ databaseName: `metadata-restored-${crypto.randomUUID()}` });
    const restorer = new core.BackupService(target, { appVersion: "0.36.0", clock: () => f.now });
    await restorer.restoreBackup(backup.serializeBackup(exported), { mode: "replace", createRecoverySnapshot: false });
    const restored = await target.readSnapshot();
    await evidence.createCitedAssessmentDraft(store, { studentId: f.studentId, observationIds: [f.observationId], teacherAssessmentText: "Kurgu öğretmen yorumu.", periodStart: "2026-09-01", periodEnd: "2026-09-30", now: f.now });
    const blockedModel = await model("2026-09-08"), before = core.canonicalJson(await store.readSnapshot());
    let blocked = false;
    try { await service.saveObservationMetadata(store, { model: blockedModel, placement: { kind: "spontaneous", clearProgramLinks: blockedModel.spontaneousClearsLinks }, now: f.now }); } catch (e) { blocked = String(e).includes("rapor, değerlendirme"); }
    const answer = { immutable, matchingContext, observedAt: moved.observedAt, repeatDate: repeated.alreadyCompleted, repeatLink: repeatLink.alreadyCompleted, originalActivityAssigned: assigned.activityId === f.source.activity.id && assigned.planId === f.source.plan.id, targetAssigned: links.length === 1 && links[0].plannedTargetId === f.target.id, revisions: restored.observationRevisions.length, roundtrip: core.canonicalJson(restored) === core.canonicalJson(snapshot), existingDevelopmentKept: restored.observations.find(o => o.id === f.input.selectedObservationIds[0]).developmentSelection.presetId === f.selection.presetId, blocked, rollback: core.canonicalJson(await store.readSnapshot()) === before };
    target.close(); store.close(); return answer;
  });
  expect(result).toEqual({ immutable: true, matchingContext: true, observedAt: "2026-09-09T09:00:00.000Z", repeatDate: true, repeatLink: true, originalActivityAssigned: true, targetAssigned: true, revisions: 3, roundtrip: true, existingDevelopmentKept: true, blocked: true, rollback: true });
});

test("Kaydedilen gözleme kaynaklı Maarif başlığı eklemek ham metni değiştirmez", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts"), fx = await import("/tests/fixtures/observation-management-fixture.mjs"), models = await import("/src/features/observation-management/observation-management-model.ts"), service = await import("/src/features/observation-management/observation-management-service.ts");
    const store = new core.IndexedDbDataStore({ databaseName: `metadata-program-${crypto.randomUUID()}` }), f = await fx.makeObservationManagementFixture(store);
    const model = models.observationMetadataModel(await store.readSnapshot(), f.observationId, "2026-09-10", f.now)!, choice = model.developmentChoices[0];
    await service.saveObservationMetadata(store, { model, placement: { kind: "development", presetId: choice.id }, now: f.now });
    const after = await store.readSnapshot(), observation = after.observations.find(o => o.id === f.observationId)!, link = after.evidenceCurriculumLinks.find(l => l.observationId === observation.id)!;
    const backup = new core.BackupService(store, { appVersion: "0.36.0", clock: () => f.now });
    await backup.parseAndVerifyBackup(await backup.exportBackup()); store.close();
    return { raw: observation.rawText === model.observation.rawText, preset: (observation.developmentSelection as { presetId: string }).presetId === choice.id, target: link.referenceCode === choice.curriculumReference.code, graph: !!link.holisticGraphReference };
  });
  expect(result).toEqual({ raw: true, preset: true, target: true, graph: true });
});
