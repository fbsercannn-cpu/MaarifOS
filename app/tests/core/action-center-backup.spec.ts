import { expect, test } from "@playwright/test";

test("Tıklanabilir işler çevrimdışı IDB'de tamamlanır ve şifreli yedek yeni cihaza tam döner", async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fx = await import("/tests/fixtures/development-report-fixture.mjs");
    const quick = await import("/src/features/evidence/quick-observation.ts");
    const action = await import("/src/features/action-center/action-center-service.ts");
    const model = await import("/src/features/action-center/action-center-model.ts");
    const followup = await import("/src/core/domain/teacher-followup.ts");
    const encryption = await import("/src/core/backup/encrypted-backup.ts");
    const source = new core.IndexedDbDataStore({ databaseName: `action-source-${crypto.randomUUID()}` });
    const fixture = await fx.makeDevelopmentReportFixture(source);
    const now = new Date("2026-09-10T09:00:00.000Z");
    const observationId = crypto.randomUUID();
    await quick.persistQuickObservationDraft(source, { studentId: fixture.input.studentId, planId: fixture.context.plan.id, activityId: fixture.context.activity.id, rawText: "  Kurgu çocuk resmini anlattı.\nKendi cümlesini kurdu.  ", context: "Kurgu serbest zaman", childQuote: "Ben çizdim.", observationType: "quick-note", categoryIds: [], now });
    await quick.finalizeQuickObservationDraft(source, { studentId: fixture.input.studentId, observationId, now });
    const original = (await source.readSnapshot()).observations.find(o => o.id === observationId)!;
    // Modules are loaded before network loss; subsequent work uses only local services.
    Object.assign(window, { actionTest: { core, source, fixture, action, model, followup, encryption, observationId, original, now } });
  });
  await context.setOffline(true);
  const result = await page.evaluate(async () => {
    const { core, source, fixture, action, model, followup, encryption, observationId, original, now } = (window as any).actionTest;
    const options = { studentId: fixture.input.studentId, observationId, now };
    const first = model.actionCenterModel(await source.readSnapshot(), options).observations[0];
    await action.assignObservationCategory(source, { ...first.scope, category: "language-communication", now });
    const second = model.actionCenterModel(await source.readSnapshot(), options).observations[0];
    const results = await Promise.all([1, 2].map(() => action.executeObservationSupport(source, { action: second, optionId: "observe-again", now })));
    const before = await source.readSnapshot();
    followup.assertTeacherFollowupRelationships(before);
    const optionsBackup = { appVersion: "0.35.0", clock: () => now };
    const backup = new core.BackupService(source, optionsBackup);
    const envelope = await backup.exportBackup();
    const encrypted = backup.serializeEncryptedBackup(await encryption.encryptBackupText(core.canonicalJson(envelope), { appVersion: "0.35.0", createdAt: envelope.manifest.createdAt }, "Kurgu-eylem-yedegi-parolasi!"));
    const target = new core.IndexedDbDataStore({ databaseName: `action-target-${crypto.randomUUID()}` });
    const restore = new core.BackupService(target, optionsBackup);
    await restore.restoreEncryptedBackup(encrypted, "Kurgu-eylem-yedegi-parolasi!", { mode: "replace", createRecoverySnapshot: false });
    const after = await target.readSnapshot();
    followup.assertTeacherFollowupRelationships(after);
    const restored = after.observations.find(o => o.id === observationId)!;
    const counts = followup.teacherFollowups(after).map(r => r.workflow.kind);
    const final = { rawPreserved: restored.rawText === original.rawText && restored.childQuote === original.childQuote && restored.context === original.context, category: restored.observationCategories, sameBackup: core.canonicalJson(before) === core.canonicalJson(after), samePlan: results[0].planId === results[1].planId, duplicatePrevented: results.filter(r => r.alreadyCompleted).length === 1, kinds: counts, complete: model.actionCenterModel(after, options).observations[0].planId === results[0].planId, sealed: !encrypted.includes(original.rawText) };
    source.close(); target.close();
    return final;
  });
  expect(result).toEqual({ rawPreserved: true, category: ["language-communication"], sameBackup: true, samePlan: true, duplicatePrevented: true, kinds: ["learning-decision", "learning-plan-link"], complete: true, sealed: true });
});
