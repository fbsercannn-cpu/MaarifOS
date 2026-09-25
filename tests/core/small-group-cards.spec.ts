import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test.describe.configure({ timeout: 120_000 });

test("altı gerçek günlük plan küçük gruba idempotent bağlanır; PDF tek sayfa ve şifreli yedek birebir kalır", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fixtureModule = await import("/tests/fixtures/small-group-cards-fixture.mjs");
    const modelModule = await import("/src/features/small-group-cards/small-group-card-model.ts");
    const service = await import("/src/features/small-group-cards/small-group-card-service.ts");
    const documentModule = await import("/src/features/small-group-cards/small-group-card-document.ts");
    const semantic = await import("/src/features/documents/semantic-tagged-pdf.ts");
    const history = await import("/src/features/documents/document-history-service.ts");
    const lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const pdfReader = await import("/tests/fixtures/pdf-text-browser.ts");
    const encryption = await import("/src/core/backup/encrypted-backup.ts");
    const store = new core.IndexedDbDataStore({ databaseName: `small-group-${crypto.randomUUID()}` });
    const fixture = await fixtureModule.seedSmallGroupCardsFixture(store);
    let model = await modelModule.loadSmallGroupCardModel(store, { civilDate: fixture.civilDate, now: fixture.now });
    const initial = {
      targetCount: model.targets.length,
      material: model.targets[0].materials[0],
      recommended: model.targets[0].recommendedStudentIds.includes(fixture.input.studentId),
      noImplicitSelection: model.printableCards.length,
    };
    let idempotent = false;
    for (const [index, target] of model.targets.entries()) {
      const request = {
        civilDate: fixture.civilDate,
        planId: target.planId,
        activityId: target.activityId,
        studentIds: [fixture.input.studentId, fixture.otherStudentId],
        expectedPlanUpdatedAt: target.planUpdatedAt,
        expectedActivityUpdatedAt: target.activityUpdatedAt,
        expectedSourceFingerprint: target.sourceFingerprint,
        now: new Date(fixture.now.getTime() + index),
      };
      const saved = await service.placeSmallGroupInDailyPlan(store, request);
      if (index === 0) {
        const beforeRetry = await store.readSnapshot();
        const retry = await service.placeSmallGroupInDailyPlan(store, request);
        idempotent = !retry.changed && core.canonicalJson(beforeRetry) === core.canonicalJson(await store.readSnapshot());
      }
      if (!saved.changed) throw new Error("Kurgu planın ilk grup ataması kaydedilmedi.");
      model = await modelModule.loadSmallGroupCardModel(store, { civilDate: fixture.civilDate, now: fixture.now });
    }
    const after = await store.readSnapshot();
    const selectedPlans = after.plans.filter((record) => fixture.plans.some((item) => item.plan.id === record.id));
    const selectedActivities = after.activities.filter((record) => fixture.plans.some((item) => item.activity.id === record.id));
    const assignmentsExact = selectedPlans.every((record) => record.assignmentMode === "selected-students" && record.studentIds.length === 2) &&
      selectedActivities.every((record) => record.assignmentMode === "selected-students" && record.studentIds.length === 2 && record.targetAssignments.length === 2 && record.targetAssignments.every((entry) => entry.status === "planned"));
    const recipe = await documentModule.createSmallGroupCardsRecipe(store, { planIds: model.printableCards.map((card) => card.planId), now: fixture.now });
    const file = await recipe.build(recipe.initial);
    let narrowedStudentScopeRejected = false;
    try {
      await recipe.build({ ...recipe.initial, studentIds: [fixture.otherStudentId] });
    } catch (cause) {
      narrowedStudentScopeRejected = cause instanceof Error && /tamamını/u.test(cause.message);
    }
    const savedDocument = await history.saveDocumentVersion({ store, scope: model.scope }, {
      file,
      title: recipe.title,
      selection: recipe.initial,
      assertCurrent: () => recipe.assertExportAllowed!(recipe.initial),
      now: new Date("2026-09-12T10:00:00.000Z"),
    });
    const afterWithHistory = await store.readSnapshot();
    const text = await pdfReader.pdfText(new Blob([file.bytes.slice()], { type: "application/pdf" }));
    const latin = new TextDecoder("latin1").decode(file.bytes);
    const backupOptions = { appVersion: "0.42.0", clock: () => new Date("2026-09-12T10:00:00.000Z") };
    const backup = new core.BackupService(store, backupOptions);
    const envelope = await backup.parseAndVerifyBackup(await backup.exportBackup());
    const password = "Kurgu-kucuk-grup-yedegi!";
    const encrypted = backup.serializeEncryptedBackup(await encryption.encryptBackupText(core.canonicalJson(envelope), { appVersion: "0.42.0", createdAt: envelope.manifest.createdAt }, password));
    const restored = new core.IndexedDbDataStore({ databaseName: `small-group-restored-${crypto.randomUUID()}` });
    await new core.BackupService(restored, backupOptions).restoreEncryptedBackup(encrypted, password, { mode: "replace", createRecoverySnapshot: false });
    const restoredBeforeDeletion = await restored.readSnapshot();
    const backupExact = core.canonicalJson(afterWithHistory) === core.canonicalJson(restoredBeforeDeletion);
    const deletionPreview = lifecycle.previewPermanentStudentDeletion(restoredBeforeDeletion, fixture.input.studentId);
    await lifecycle.permanentlyDeleteStudent(restored, {
      studentId: fixture.input.studentId,
      confirmationName: deletionPreview.displayName,
      expectedFingerprint: deletionPreview.fingerprint,
      now: new Date("2027-08-01T12:00:00.000Z"),
    });
    const afterDeletion = await restored.readSnapshot();
    const expectedStudentIds = [fixture.input.studentId, fixture.otherStudentId].sort();
    const answer = {
      initial,
      idempotent,
      assignmentsExact,
      planCount: selectedPlans.length,
      activityCount: selectedActivities.length,
      cardCount: model.printableCards.length,
      pageCount: semantic.semanticTaggedPdfPageCount(file.bytes),
      hasEmbeddedFont: latin.includes("/ToUnicode") && latin.includes("/StructTreeRoot") && latin.includes("/Lang (tr-TR)"),
      text,
      recipeStudentIds: recipe.students?.map((student) => student.id).sort(),
      initialStudentIds: recipe.initial.studentIds?.slice().sort(),
      expectedStudentIds,
      narrowedStudentScopeRejected,
      historyStudentIds: savedDocument.studentIds.slice().sort(),
      backupExact,
      historyPurgedWithStudent: !afterDeletion.settings.some((record) => record.id === savedDocument.id),
      otherStudentPreserved: afterDeletion.students.some((record) => record.id === fixture.otherStudentId),
      pdf: Array.from(file.bytes),
    };
    store.close(); restored.close();
    return answer;
  });
  expect(result.initial).toEqual({ targetCount: 6, material: "sepet", recommended: true, noImplicitSelection: 0 });
  expect(result.idempotent).toBe(true);
  expect(result.assignmentsExact).toBe(true);
  expect(result.planCount).toBe(6);
  expect(result.activityCount).toBe(6);
  expect(result.cardCount).toBe(6);
  expect(result.pageCount).toBe(1);
  expect(result.hasEmbeddedFont).toBe(true);
  expect(result.recipeStudentIds).toEqual(result.expectedStudentIds);
  expect(result.initialStudentIds).toEqual(result.expectedStudentIds);
  expect(result.narrowedStudentScopeRejected).toBe(true);
  expect(result.historyStudentIds).toEqual(result.expectedStudentIds);
  expect(result.text).toContain("Kurgu Çocuk 1");
  expect(result.text).toContain("Kurgu Çocuk 2");
  expect(result.text).toContain("Minik mahalle pazarı");
  expect(result.text).toContain("güvenli sınıf nesneleri");
  expect(result.text.match(/KART\s+[1-6]/gu)?.length).toBe(6);
  expect(result.backupExact).toBe(true);
  expect(result.historyPurgedWithStudent).toBe(true);
  expect(result.otherStudentPreserved).toBe(true);
  await mkdir("output/small-group-cards-2026-09-12", { recursive: true });
  await writeFile("output/small-group-cards-2026-09-12/six-real-plan-cards.pdf", Buffer.from(result.pdf));
});

test("kaynak değişimi ve ikinci fiziksel yazım hatası hiçbir kısmi grup ataması bırakmaz", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fixtureModule = await import("/tests/fixtures/small-group-cards-fixture.mjs");
    const modelModule = await import("/src/features/small-group-cards/small-group-card-model.ts");
    const service = await import("/src/features/small-group-cards/small-group-card-service.ts");

    const staleStore = new core.IndexedDbDataStore({ databaseName: `small-group-stale-${crypto.randomUUID()}` });
    const staleFixture = await fixtureModule.seedSmallGroupCardsFixture(staleStore, { planCount: 1 });
    const staleModel = await modelModule.loadSmallGroupCardModel(staleStore, { civilDate: staleFixture.civilDate, now: staleFixture.now });
    const staleTarget = staleModel.targets[0];
    await staleStore.transaction("readwrite", ["plans", "activities"], async (transaction) => {
      const plans = await transaction.getAll("plans"), activities = await transaction.getAll("activities");
      const plan = plans.find((record) => record.id === staleTarget.planId), activity = activities.find((record) => record.id === staleTarget.activityId);
      const change = (record) => ({ ...record, pedagogicalProvenance: { ...record.pedagogicalProvenance, valueTrace: { ...record.pedagogicalProvenance.valueTrace, action: "Kurgu aynı updatedAt ile değiştirilmiş kaynak eylem." } } });
      await transaction.putMany("plans", [change(plan)]);
      await transaction.putMany("activities", [change(activity)]);
    });
    const afterSourceChange = await staleStore.readSnapshot();
    let staleRejected = false;
    try {
      await service.placeSmallGroupInDailyPlan(staleStore, {
        civilDate: staleFixture.civilDate,
        planId: staleTarget.planId,
        activityId: staleTarget.activityId,
        studentIds: [staleFixture.input.studentId, staleFixture.otherStudentId],
        expectedPlanUpdatedAt: staleTarget.planUpdatedAt,
        expectedActivityUpdatedAt: staleTarget.activityUpdatedAt,
        expectedSourceFingerprint: staleTarget.sourceFingerprint,
        now: staleFixture.now,
      });
    } catch (cause) { staleRejected = cause instanceof Error && /değişti/u.test(cause.message); }
    const staleNoWrite = core.canonicalJson(afterSourceChange) === core.canonicalJson(await staleStore.readSnapshot());

    const rollbackStore = new core.IndexedDbDataStore({ databaseName: `small-group-rollback-${crypto.randomUUID()}` });
    const rollbackFixture = await fixtureModule.seedSmallGroupCardsFixture(rollbackStore, { planCount: 1 });
    const rollbackModel = await modelModule.loadSmallGroupCardModel(rollbackStore, { civilDate: rollbackFixture.civilDate, now: rollbackFixture.now });
    const target = rollbackModel.targets[0], before = await rollbackStore.readSnapshot();
    let writes = 0, failed = false;
    const injected = {
      readSnapshot: () => rollbackStore.readSnapshot(),
      close() {},
      transaction: (mode, collections, task) => rollbackStore.transaction(mode, collections, (transaction) => task({
        getAll: (collection) => transaction.getAll(collection),
        clear: (collection) => transaction.clear(collection),
        putMany: async (collection, records) => {
          await transaction.putMany(collection, records);
          if (++writes === 2) throw new Error("Kurgu ikinci fiziksel yazım hatası");
        },
      })),
    };
    try {
      await service.placeSmallGroupInDailyPlan(injected, {
        civilDate: rollbackFixture.civilDate,
        planId: target.planId,
        activityId: target.activityId,
        studentIds: [rollbackFixture.input.studentId, rollbackFixture.otherStudentId],
        expectedPlanUpdatedAt: target.planUpdatedAt,
        expectedActivityUpdatedAt: target.activityUpdatedAt,
        expectedSourceFingerprint: target.sourceFingerprint,
        now: rollbackFixture.now,
      });
    } catch (cause) { failed = cause instanceof Error && /ikinci fiziksel/u.test(cause.message); }
    const rolledBack = core.canonicalJson(before) === core.canonicalJson(await rollbackStore.readSnapshot());
    staleStore.close(); rollbackStore.close();
    return { staleRejected, staleNoWrite, writes, failed, rolledBack };
  });
  expect(result).toEqual({ staleRejected: true, staleNoWrite: true, writes: 2, failed: true, rolledBack: true });
});
