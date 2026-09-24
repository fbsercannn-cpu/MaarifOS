import { expect, test } from "@playwright/test";

test("İş paketi dış IDB yazım hatasında bütünüyle geri döner; değiştirilmiş istek reddedilir ve başarı şifreli yedeğe tam döner", async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async () => {
    const core = await import("/src/core/index.ts"), fixture = await import("/tests/fixtures/observation-management-fixture.mjs");
    const service = await import("/src/features/work-packages/work-package-service.ts"), model = await import("/src/features/work-packages/work-package-model.ts"), encryption = await import("/src/core/backup/encrypted-backup.ts");
    Object.assign(window, { atomicPackage: { core, fixture, service, model, encryption } });
  });
  await context.setOffline(true);
  const result = await page.evaluate(async () => {
    const { core, fixture, service, model, encryption } = (window as any).atomicPackage;
    const source = new core.IndexedDbDataStore({ databaseName: `package-atomic-${crypto.randomUUID()}` });
    const f = await fixture.makeObservationManagementFixture(source), before = await source.readSnapshot();
    const loaded = await service.loadWorkPackageModel(source, { civilDate: "2026-09-10", studentId: f.studentId, observationId: f.observationId, mode: "observations", now: f.now });
    const candidate = loaded.candidates[0], prepared = model.prepareWorkPackageSelection(loaded, { selections: { [candidate.id]: candidate.defaultChoiceId } });
    const tampered = structuredClone(prepared.request); tampered.items[0].category = "physical-motor-health";
    let tamperedRejected = false;
    try { await service.applyWorkPackage(source, { request: tampered, expectedFingerprint: model.workPackageFingerprint(tampered), now: f.now }); } catch { tamperedRejected = true; }
    const tamperedNoWrite = core.canonicalJson(await source.readSnapshot()) === core.canonicalJson(before);
    let operations = 0, atomicRejected = false;
    const injected = {
      readSnapshot: () => source.readSnapshot(), close() {},
      transaction: (mode: any, names: any, task: any) => source.transaction(mode, names, async (tx: any) => task({
        getAll: (name: any) => tx.getAll(name),
        clear: async (name: any) => { await tx.clear(name); if (++operations === 2) throw new Error("Kurgu ikinci dış yazım hatası"); },
        putMany: async (name: any, records: any) => { await tx.putMany(name, records); if (++operations === 2) throw new Error("Kurgu ikinci dış yazım hatası"); },
      })),
    };
    try { await service.applyWorkPackage(injected, { ...prepared, now: f.now }); } catch (cause) { atomicRejected = String(cause).includes("ikinci dış yazım"); }
    const rollback = core.canonicalJson(await source.readSnapshot()) === core.canonicalJson(before);
    const receipt = await service.applyWorkPackage(source, { ...prepared, now: f.now }), successful = await source.readSnapshot();
    const options = { appVersion: "0.37.0", clock: () => f.now }, backup = new core.BackupService(source, options);
    const envelope = await backup.exportBackup(); await backup.parseAndVerifyBackup(envelope);
    const password = "Kurgu-paket-yedek-parolasi!";
    const encrypted = backup.serializeEncryptedBackup(await encryption.encryptBackupText(core.canonicalJson(envelope), { appVersion: "0.37.0", createdAt: envelope.manifest.createdAt }, password));
    const target = new core.IndexedDbDataStore({ databaseName: `package-atomic-restored-${crypto.randomUUID()}` }), restorer = new core.BackupService(target, options);
    await restorer.restoreEncryptedBackup(encrypted, password, { mode: "replace", createRecoverySnapshot: false });
    const restored = await target.readSnapshot(), original = before.observations.find((o: any) => o.id === f.observationId), after = restored.observations.find((o: any) => o.id === f.observationId);
    const answer = { tamperedRejected, tamperedNoWrite, atomicRejected, operations, rollback, changedCollections: new Set(receipt.writeSet.map((row: any) => row.collection)).size, roundtrip: core.canonicalJson(successful) === core.canonicalJson(restored), encrypted: !encrypted.includes(original.rawText), rawPreserved: original.rawText === after.rawText && original.createdAt === after.createdAt, categories: after.observationCategories.length, support: restored.settings.filter((r: any) => r.workflow?.kind === "learning-plan-link").length };
    source.close(); target.close(); return answer;
  });
  expect(result).toMatchObject({ tamperedRejected: true, tamperedNoWrite: true, atomicRejected: true, operations: 2, rollback: true, roundtrip: true, encrypted: true, rawPreserved: true, categories: 1, support: 1 });
  expect(result.changedCollections).toBeGreaterThanOrEqual(3);
});

test("Geri alma sonradan düzenlenen planı veya yeni bağımlı hazırlık kaydını silmez", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/tests/runtime-fixture.html");
  const results = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts"), fixture = await import("/tests/fixtures/observation-management-fixture.mjs"), service = await import("/src/features/work-packages/work-package-service.ts"), model = await import("/src/features/work-packages/work-package-model.ts"), planning = await import("/src/features/planning/teacher-owned-plan-service.ts"), followup = await import("/src/features/teacher-followup/teacher-followup-service.ts");
    const outcomes = [];
    for (const scenario of ["edited-plan", "new-dependency"]) {
      const source = new core.IndexedDbDataStore({ databaseName: `package-undo-${crypto.randomUUID()}` }), f = await fixture.makeObservationManagementFixture(source);
      const loaded = await service.loadWorkPackageModel(source, { civilDate: "2026-09-10", studentId: f.studentId, observationId: f.observationId, mode: "observations", now: f.now }), candidate = loaded.candidates[0];
      const prepared = model.prepareWorkPackageSelection(loaded, { selections: { [candidate.id]: candidate.defaultChoiceId } }), receipt = await service.applyWorkPackage(source, { ...prepared, now: f.now });
      const after = await source.readSnapshot(), plan = after.plans.find((p: any) => p.id === receipt.resultActions.find((a: any) => a.kind === "open-plan")?.recordId)!;
      const later = new Date("2026-09-10T10:00:00.000Z");
      if (scenario === "edited-plan") await planning.reviseTeacherOwnedPlan(source, { planId: plan.id, expectedUpdatedAt: plan.updatedAt, title: "Öğretmenin sonradan düzenlediği kurgu plan", now: later });
      else await followup.appendTeacherFollowup(source, { studentId: null, now: later, workflow: { kind: "preparation-list", weekStart: String(plan.periodStart), weekEnd: String(plan.periodEnd), sources: [{ collection: "plans", id: plan.id, title: String(plan.title), updatedAt: plan.updatedAt }], items: [{ id: crypto.randomUUID(), text: "Kurgu sonraki hazırlık", advance: true, dueOn: String(plan.periodStart), sourceIds: [plan.id] }] } });
      const beforeUndo = core.canonicalJson(await source.readSnapshot()), preview = await service.previewWorkPackageUndo(source, receipt);
      let rejected = false;
      try { await service.undoWorkPackage(source, { receipt, expectedFingerprint: beforeUndo, now: later }); } catch { rejected = true; }
      outcomes.push({ scenario, eligible: preview.eligible, rejected, preserved: beforeUndo === core.canonicalJson(await source.readSnapshot()) }); source.close();
    }
    return outcomes;
  });
  expect(results).toEqual([{ scenario: "edited-plan", eligible: false, rejected: true, preserved: true }, { scenario: "new-dependency", eligible: false, rejected: true, preserved: true }]);
});
