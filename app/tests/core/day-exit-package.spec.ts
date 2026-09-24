import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test.describe.configure({ timeout: 120_000 });

test("gerçek yoklama, düzeltilmiş teslim ve ertesi gün hazırlığı idempotent kaydolur; PDF/history/yedek korunur", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fixtureModule = await import("/tests/fixtures/day-exit-package-fixture.mjs");
    const modelModule = await import("/src/features/day-exit-package/day-exit-package-model.ts");
    const service = await import("/src/features/day-exit-package/day-exit-package-service.ts");
    const documentModule = await import("/src/features/day-exit-package/day-exit-package-document.ts");
    const followup = await import("/src/features/teacher-followup/teacher-followup-service.ts");
    const followupDomain = await import("/src/core/domain/teacher-followup.ts");
    const history = await import("/src/features/documents/document-history-service.ts");
    const semantic = await import("/src/features/documents/semantic-tagged-pdf.ts");
    const pdfReader = await import("/tests/fixtures/pdf-text-browser.ts");
    const encryption = await import("/src/core/backup/encrypted-backup.ts");
    const store = new core.IndexedDbDataStore({ databaseName: `day-exit-${crypto.randomUUID()}` });
    const fixture = await fixtureModule.seedDayExitPackageFixture(store);
    let model = await modelModule.loadDayExitPackageModel(store, { civilDate: fixture.civilDate, now: fixture.now });
    const activitySource = model.nextDay.sources.find((source) => source.materials.length > 1);
    if (!activitySource || !model.nextDay) throw new Error(`Kurgu ertesi gün etkinlik kaynağı bulunamadı: ${JSON.stringify(model.nextDay)}`);
    const partialWorkflow = {
      kind: "preparation-list" as const,
      weekStart: fixture.nextDate,
      weekEnd: fixture.nextDate,
      sources: [{ collection: activitySource.collection, id: activitySource.id, title: activitySource.title, updatedAt: activitySource.updatedAt }],
      items: [{ id: crypto.randomUUID(), text: activitySource.materials[0], advance: false, dueOn: fixture.nextDate, sourceIds: [activitySource.id] }],
    };
    if (!followupDomain.isTeacherWorkflow(partialWorkflow)) throw new Error(`Kurgu kısmi hazırlık geçersiz: ${JSON.stringify(partialWorkflow)}`);
    await followup.appendTeacherFollowup(store, {
      studentId: null,
      civilDate: fixture.civilDate,
      now: new Date("2026-09-21T12:03:00.000Z"),
      workflow: partialWorkflow,
    });
    model = await modelModule.loadDayExitPackageModel(store, { civilDate: fixture.civilDate, now: fixture.now });
    const refreshedSource = model.nextDay!.sources.find((source) => source.id === activitySource.id)!;
    const request = {
      civilDate: fixture.civilDate,
      sourceIds: [refreshedSource.id],
      expectedSourceFingerprint: model.nextDay!.sourceFingerprint,
      now: fixture.now,
    };
    const first = await service.saveDayExitPreparation(store, request);
    const retry = await service.saveDayExitPreparation(store, request);
    const afterPreparation = await store.readSnapshot();
    const preparationRecords = afterPreparation.settings.filter((record: any) => record.workflow?.kind === "preparation-list"
      && record.workflow.sources.some((source: any) => source.id === refreshedSource.id));
    const sourceItems = preparationRecords.flatMap((record: any) => record.workflow.items.filter((item: any) => item.sourceIds.includes(refreshedSource.id)));
    const normalizedTexts = sourceItems.map((item: any) => String(item.text).toLocaleLowerCase("tr-TR"));
    model = await modelModule.loadDayExitPackageModel(store, { civilDate: fixture.civilDate, now: fixture.now });
    const recipe = await documentModule.createDayExitPackageRecipe(store, { civilDate: fixture.civilDate, now: fixture.now });
    const file = await recipe.build(recipe.initial);
    const firstHistory = await history.saveDocumentVersion({ store, scope: model.scope }, {
      title: recipe.title,
      file,
      selection: recipe.initial,
      assertCurrent: () => recipe.assertExportAllowed!(recipe.initial),
      now: new Date("2026-09-21T12:06:00.000Z"),
    });
    const secondFile = await recipe.build(recipe.initial);
    const secondHistory = await history.saveDocumentVersion({ store, scope: model.scope }, {
      title: recipe.title,
      file: secondFile,
      selection: recipe.initial,
      assertCurrent: () => recipe.assertExportAllowed!(recipe.initial),
      now: new Date("2026-09-21T12:07:00.000Z"),
    });
    const withHistory = await store.readSnapshot();
    const backupOptions = { appVersion: "0.43.0", clock: () => new Date("2026-09-21T12:08:00.000Z") };
    const backup = new core.BackupService(store, backupOptions);
    const envelope = await backup.parseAndVerifyBackup(await backup.exportBackup());
    const password = "Kurgu-gun-cikis-yedegi!";
    const encrypted = backup.serializeEncryptedBackup(await encryption.encryptBackupText(core.canonicalJson(envelope), { appVersion: "0.43.0", createdAt: envelope.manifest.createdAt }, password));
    const restored = new core.IndexedDbDataStore({ databaseName: `day-exit-restored-${crypto.randomUUID()}` });
    await new core.BackupService(restored, backupOptions).restoreEncryptedBackup(encrypted, password, { mode: "replace", createRecoverySnapshot: false });
    const text = await pdfReader.pdfText(new Blob([file.bytes.slice()], { type: "application/pdf" }));
    const answer = {
      attendance: { recorded: model.attendance.recordedCount, rows: model.attendance.rows.length },
      pickups: { completed: model.pickups.completedCount, missing: model.pickups.missingCount },
      correctedDelivery: model.pickups.rows.find((row) => row.studentId === fixture.studentId)?.delivery,
      nextDate: model.nextDay?.civilDate,
      planIds: model.nextDay?.plans.map((plan) => plan.id),
      first,
      retry,
      sourceAlreadySaved: model.nextDay?.sources.find((source) => source.id === refreshedSource.id)?.alreadySaved,
      partialItemWrittenOnce: normalizedTexts.filter((text) => text === refreshedSource.materials[0].toLocaleLowerCase("tr-TR")).length,
      allMaterialValuesCovered: refreshedSource.materials.every((text) => normalizedTexts.includes(text.toLocaleLowerCase("tr-TR"))),
      pageCount: semantic.semanticTaggedPdfPageCount(file.bytes),
      text,
      recipeStudentIds: recipe.initial.studentIds?.slice().sort(),
      expectedStudentIds: [fixture.studentId, fixture.otherStudentId].sort(),
      selfHistoryStable: firstHistory.id === secondHistory.id,
      historyCount: withHistory.settings.filter((record: any) => record.settingType === "document-version" && record.title === recipe.title).length,
      backupExact: core.canonicalJson(withHistory) === core.canonicalJson(await restored.readSnapshot()),
      pdf: Array.from(file.bytes),
    };
    store.close(); restored.close();
    return answer;
  });
  expect(result.attendance).toEqual({ recorded: 2, rows: 2 });
  expect(result.pickups).toEqual({ completed: 1, missing: 1 });
  expect(result.correctedDelivery?.handedOverAt).toBe("2026-09-21T11:45:00.000Z");
  expect(result.nextDate).toBe("2026-09-22");
  expect(result.planIds).toHaveLength(1);
  expect(result.first.changed).toBe(true);
  expect(result.first.itemCount).toBeGreaterThan(0);
  expect(result.retry.changed).toBe(false);
  expect(result.sourceAlreadySaved).toBe(true);
  expect(result.partialItemWrittenOnce).toBe(1);
  expect(result.allMaterialValuesCovered).toBe(true);
  expect(result.pageCount).toBeGreaterThanOrEqual(1);
  expect(result.text).toContain("GÜNÜN ÇIKIŞ PAKETİ");
  expect(result.text).toContain("Kurgu Çocuk 1");
  expect(result.text).toContain("Kurgu Yetkili Yakın");
  expect(result.text).toContain("Kurgu ertesi gün planı");
  expect(result.text).toContain("sepet");
  expect(result.recipeStudentIds).toEqual(result.expectedStudentIds);
  expect(result.selfHistoryStable).toBe(true);
  expect(result.historyCount).toBe(1);
  expect(result.backupExact).toBe(true);
  await mkdir("output/day-exit-package-2026-09-12", { recursive: true });
  await writeFile("output/day-exit-package-2026-09-12/day-exit-package.pdf", Buffer.from(result.pdf));
});

test("aynı updatedAt kaynak değişimi ve gerçek IDB put hatası hazırlık kaydı bırakmaz", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fixtureModule = await import("/tests/fixtures/day-exit-package-fixture.mjs");
    const modelModule = await import("/src/features/day-exit-package/day-exit-package-model.ts");
    const service = await import("/src/features/day-exit-package/day-exit-package-service.ts");

    const staleStore = new core.IndexedDbDataStore({ databaseName: `day-exit-stale-${crypto.randomUUID()}` });
    const staleFixture = await fixtureModule.seedDayExitPackageFixture(staleStore);
    const staleModel = await modelModule.loadDayExitPackageModel(staleStore, { civilDate: staleFixture.civilDate, now: staleFixture.now });
    const staleSource = staleModel.nextDay.sources.find((source) => source.available);
    await staleStore.transaction("readwrite", [staleSource.collection], async (transaction) => {
      const rows = await transaction.getAll(staleSource.collection);
      await transaction.putMany(staleSource.collection, rows.filter((record) => record.id === staleSource.id).map((record) => ({ ...record, materials: ["Kurgu aynı zaman damgalı yeni materyal"] })));
    });
    const afterTamper = await staleStore.readSnapshot();
    let staleRejected = false;
    try {
      await service.saveDayExitPreparation(staleStore, { civilDate: staleFixture.civilDate, sourceIds: [staleSource.id], expectedSourceFingerprint: staleModel.nextDay.sourceFingerprint, now: staleFixture.now });
    } catch (cause) { staleRejected = cause instanceof Error && /değişti/u.test(cause.message); }
    const staleNoWrite = core.canonicalJson(afterTamper) === core.canonicalJson(await staleStore.readSnapshot());

    const rollbackStore = new core.IndexedDbDataStore({ databaseName: `day-exit-rollback-${crypto.randomUUID()}` });
    const rollbackFixture = await fixtureModule.seedDayExitPackageFixture(rollbackStore);
    const rollbackModel = await modelModule.loadDayExitPackageModel(rollbackStore, { civilDate: rollbackFixture.civilDate, now: rollbackFixture.now });
    const selected = rollbackModel.nextDay.sources.find((source) => source.available);
    const before = await rollbackStore.readSnapshot();
    let writes = 0, failed = false;
    const injected = {
      readSnapshot: () => rollbackStore.readSnapshot(),
      close() {},
      transaction: (mode, collections, task) => rollbackStore.transaction(mode, collections, (transaction) => task({
        getAll: (collection) => transaction.getAll(collection),
        clear: (collection) => transaction.clear(collection),
        putMany: async (collection, records) => {
          await transaction.putMany(collection, records);
          writes += 1;
          throw new Error("Kurgu hazırlık disk hatası");
        },
      })),
    };
    try {
      await service.saveDayExitPreparation(injected, { civilDate: rollbackFixture.civilDate, sourceIds: [selected.id], expectedSourceFingerprint: rollbackModel.nextDay.sourceFingerprint, now: rollbackFixture.now });
    } catch (cause) { failed = cause instanceof Error && /disk hatası/u.test(cause.message); }
    const rolledBack = core.canonicalJson(before) === core.canonicalJson(await rollbackStore.readSnapshot());
    staleStore.close(); rollbackStore.close();
    return { staleRejected, staleNoWrite, writes, failed, rolledBack };
  });
  expect(result).toEqual({ staleRejected: true, staleNoWrite: true, writes: 1, failed: true, rolledBack: true });
});
