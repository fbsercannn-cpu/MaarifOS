import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

test("sonraki gün materyali gerçek IDB'de idempotent kaydolur, stale kaynak yazmaz ve şifreli yedek birebir döner", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fixtureModule = await import("/tests/fixtures/day-exit-package-fixture.mjs");
    const modelModule = await import("/src/features/tomorrow-ready/tomorrow-ready-model.ts");
    const service = await import("/src/features/tomorrow-ready/tomorrow-ready-service.ts");
    const encryption = await import("/src/core/backup/encrypted-backup.ts");

    const store = new core.IndexedDbDataStore({ databaseName: `tomorrow-ready-${crypto.randomUUID()}` });
    const fixture = await fixtureModule.seedDayExitPackageFixture(store);
    const beforeRead = await store.readSnapshot();
    let model = await modelModule.loadTomorrowReadyModel(store, {
      civilDate: fixture.civilDate,
      now: fixture.now,
    });
    const readOnly = core.canonicalJson(beforeRead) === core.canonicalJson(await store.readSnapshot());
    const request = {
      sourceCivilDate: fixture.civilDate,
      sourceIds: model.pendingPreparationSourceIds,
      expectedSourceFingerprint: model.preparationSourceFingerprint!,
      now: fixture.now,
    };
    const first = await service.saveTomorrowPreparation(store, request);
    const afterFirst = await store.readSnapshot();
    const retry = await service.saveTomorrowPreparation(store, request);
    const afterRetry = await store.readSnapshot();
    model = await modelModule.loadTomorrowReadyModel(store, {
      civilDate: fixture.civilDate,
      now: fixture.now,
    });

    const backupOptions = {
      appVersion: "0.43.0",
      clock: () => new Date("2026-09-21T12:08:00.000Z"),
    };
    const backup = new core.BackupService(store, backupOptions);
    const envelope = await backup.parseAndVerifyBackup(await backup.exportBackup());
    const password = "Kurgu-yarin-hazir-yedegi!";
    const encrypted = backup.serializeEncryptedBackup(await encryption.encryptBackupText(
      core.canonicalJson(envelope),
      { appVersion: "0.43.0", createdAt: envelope.manifest.createdAt },
      password,
    ));
    const restored = new core.IndexedDbDataStore({ databaseName: `tomorrow-ready-restored-${crypto.randomUUID()}` });
    await new core.BackupService(restored, backupOptions).restoreEncryptedBackup(encrypted, password, {
      mode: "replace",
      createRecoverySnapshot: false,
    });
    const backupExact = core.canonicalJson(afterRetry) === core.canonicalJson(await restored.readSnapshot());

    const staleStore = new core.IndexedDbDataStore({ databaseName: `tomorrow-ready-stale-${crypto.randomUUID()}` });
    const staleFixture = await fixtureModule.seedDayExitPackageFixture(staleStore);
    const staleModel = await modelModule.loadTomorrowReadyModel(staleStore, {
      civilDate: staleFixture.civilDate,
      now: staleFixture.now,
    });
    const activityId = staleModel.activityIds[0]!;
    await staleStore.transaction("readwrite", ["activities"], async (transaction) => {
      const activities = await transaction.getAll("activities");
      await transaction.putMany("activities", activities
        .filter((record) => record.id === activityId)
        .map((record) => ({ ...record, title: "Aynı zaman damgalı değiştirilmiş etkinlik" })));
    });
    const afterTamper = await staleStore.readSnapshot();
    let staleRejected = false;
    try {
      await service.saveTomorrowPreparation(staleStore, {
        sourceCivilDate: staleFixture.civilDate,
        sourceIds: staleModel.pendingPreparationSourceIds,
        expectedSourceFingerprint: staleModel.preparationSourceFingerprint!,
        now: staleFixture.now,
      });
    } catch (cause) {
      staleRejected = cause instanceof Error && /değişti/u.test(cause.message);
    }
    const staleNoWrite = core.canonicalJson(afterTamper) === core.canonicalJson(await staleStore.readSnapshot());
    const parallelRecord = afterRetry.settings.some((record: any) =>
      String(record.settingType ?? "").startsWith("tomorrow-ready"));
    const states = Object.fromEntries(model.items.map((entry: any) => [entry.id, entry.state]));
    store.close();
    restored.close();
    staleStore.close();
    return {
      readOnly,
      first,
      retry,
      retryExact: core.canonicalJson(afterFirst) === core.canonicalJson(afterRetry),
      states,
      parallelRecord,
      backupExact,
      staleRejected,
      staleNoWrite,
    };
  });

  expect(result.readOnly).toBe(true);
  expect(result.first.changed).toBe(true);
  expect(result.first.itemCount).toBeGreaterThan(0);
  expect(result.retry.changed).toBe(false);
  expect(result.retryExact).toBe(true);
  expect(result.states.materials).toBe("ready");
  expect(result.parallelRecord).toBe(false);
  expect(result.backupExact).toBe(true);
  expect(result.staleRejected).toBe(true);
  expect(result.staleNoWrite).toBe(true);
});
