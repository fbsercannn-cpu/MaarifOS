import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

test("toplu paket gerçek IndexedDB transaction hatasında tamamen geri döner; başarılı sonuç yedekten birebir açılır", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fx = await import("/tests/fixtures/observation-management-fixture.mjs");
    const quick = await import("/src/features/evidence/quick-observation.ts");
    const work = await import("/src/features/work-packages/work-package-service.ts");
    const workModel = await import("/src/features/work-packages/work-package-model.ts");
    const followup = await import("/src/core/domain/teacher-followup.ts");
    const encryption = await import("/src/core/backup/encrypted-backup.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `work-package-atomic-${crypto.randomUUID()}`,
    });
    const fixture = await fx.makeObservationManagementFixture(source);
    const secondObservationId = "00000000-0000-4000-8000-00000000d101";
    const captureTime = new Date("2026-09-10T09:01:00.000Z");
    await quick.persistQuickObservationDraft(source, {
      studentId: fixture.studentId,
      planId: fixture.context.plan.id,
      activityId: fixture.context.activity.id,
      rawText: "Kurgu çocuk ritim çalgısıyla yavaş ve hızlı tempoya göre vuruşlarını değiştirdi.",
      context: "Kurgu serbest zaman",
      childQuote: "Şimdi hızlı.",
      observationType: "quick-note",
      categoryIds: [],
      now: captureTime,
    });
    await quick.finalizeQuickObservationDraft(source, {
      studentId: fixture.studentId,
      observationId: secondObservationId,
      now: captureTime,
    });

    const options = {
      civilDate: "2026-09-10",
      studentId: fixture.studentId,
      mode: "observations" as const,
      now: new Date("2026-09-10T09:02:00.000Z"),
    };
    const initialModel = await work.loadWorkPackageModel(source, options);
    const selectedIds = initialModel.candidates
      .filter(candidate =>
        [fixture.observationId, secondObservationId].some(id => candidate.id.includes(id)),
      )
      .map(candidate => candidate.id);
    if (selectedIds.length !== 2) throw new Error("İki kurgu gözlem paketi hazırlanamadı.");
    const select = (model: typeof initialModel) => workModel.prepareWorkPackageSelection(model, {
      selections: Object.fromEntries(selectedIds.map(id => {
        const candidate = model.candidates.find(item => item.id === id);
        if (!candidate) throw new Error("Kurgu paket adayı kayboldu.");
        return [id, candidate.defaultChoiceId];
      })),
    });

    const staleSelection = select(initialModel);
    await source.transaction("readwrite", ["observations"], async transaction => {
      const observations = await transaction.getAll("observations");
      const observation = observations.find(record => record.id === secondObservationId);
      if (!observation) throw new Error("Kurgu gözlem bulunamadı.");
      await transaction.putMany("observations", [{
        ...observation,
        context: "Kurgu öğretmen sonradan bağlam ekledi.",
        updatedAt: "2026-09-10T09:02:30.000Z",
      }]);
    });
    const afterSourceEdit = await source.readSnapshot();
    let staleError = "";
    try {
      await work.applyWorkPackage(source, {
        ...staleSelection,
        now: new Date("2026-09-10T09:03:00.000Z"),
      });
    } catch (error) {
      staleError = error instanceof Error ? error.message : String(error);
    }
    const staleNoWrite = core.canonicalJson(await source.readSnapshot()) === core.canonicalJson(afterSourceEdit);

    const currentModel = await work.loadWorkPackageModel(source, {
      ...options,
      now: new Date("2026-09-10T09:03:00.000Z"),
    });
    const selection = select(currentModel);
    const beforeFailedCommit = await source.readSnapshot();
    let commitPuts = 0;
    const failingStore = {
      readSnapshot: () => source.readSnapshot(),
      close: () => {},
      transaction: (mode: Parameters<typeof source.transaction>[0], collections: Parameters<typeof source.transaction>[1], task: Parameters<typeof source.transaction>[2]) =>
        source.transaction(mode, collections, transaction => task({
          getAll: name => transaction.getAll(name),
          clear: name => transaction.clear(name),
          putMany: async (name: any, records: any) => {
            await transaction.putMany(name, records);
            commitPuts += 1;
            if (commitPuts === 1) throw new Error("Kurgu commit kesintisi");
          },
        })),
    };
    let commitError = "";
    try {
      await work.applyWorkPackage(failingStore, {
        ...selection,
        now: new Date("2026-09-10T09:03:00.000Z"),
      });
    } catch (error) {
      commitError = error instanceof Error ? error.message : String(error);
    }
    const rollbackExact = core.canonicalJson(await source.readSnapshot()) === core.canonicalJson(beforeFailedCommit);

    const receipt = await work.applyWorkPackage(source, {
      ...selection,
      now: new Date("2026-09-10T09:03:00.000Z"),
    });
    const committed = await source.readSnapshot();
    followup.assertTeacherFollowupRelationships(committed);
    const links = followup.teacherFollowups(committed).filter(record => record.workflow.kind === "learning-plan-link");
    const decisions = followup.teacherFollowups(committed).filter(record => record.workflow.kind === "learning-decision");
    const rawPreserved = [fixture.observationId, secondObservationId].every(id =>
      committed.observations.find(record => record.id === id)?.rawText ===
      beforeFailedCommit.observations.find(record => record.id === id)?.rawText,
    );

    let duplicateError = "";
    try {
      await work.applyWorkPackage(source, {
        ...selection,
        now: new Date("2026-09-10T09:04:00.000Z"),
      });
    } catch (error) {
      duplicateError = error instanceof Error ? error.message : String(error);
    }
    const duplicateNoWrite = core.canonicalJson(await source.readSnapshot()) === core.canonicalJson(committed);

    const backupOptions = {
      appVersion: "work-package-test",
      clock: () => new Date("2026-09-10T09:05:00.000Z"),
      civilDateProvider: () => "2026-09-10",
    };
    const backup = new core.BackupService(source, backupOptions);
    const envelope = await backup.exportBackup();
    const encrypted = backup.serializeEncryptedBackup(await encryption.encryptBackupText(
      core.canonicalJson(envelope),
      { appVersion: "work-package-test", createdAt: envelope.manifest.createdAt },
      "Kurgu-paket-yedegi-parolasi!",
    ));
    const target = new core.IndexedDbDataStore({
      databaseName: `work-package-restore-${crypto.randomUUID()}`,
    });
    const restore = new core.BackupService(target, backupOptions);
    await restore.restoreEncryptedBackup(encrypted, "Kurgu-paket-yedegi-parolasi!", {
      mode: "replace",
      createRecoverySnapshot: false,
    });
    const restored = await target.readSnapshot();
    followup.assertTeacherFollowupRelationships(restored);
    source.close();
    target.close();
    return {
      staleError,
      staleNoWrite,
      commitError,
      rollbackExact,
      receiptWrites: receipt.writeSet.length,
      uniqueWrites: new Set(receipt.writeSet.map(entry => `${entry.collection}:${entry.id}`)).size,
      rawPreserved,
      decisionCount: decisions.length,
      linkCount: links.length,
      sharedPlan: new Set(links.map(record => record.workflow.planId)).size,
      duplicateError,
      duplicateNoWrite,
      backupExact: core.canonicalJson(restored) === core.canonicalJson(committed),
      encryptedHidesRaw: !encrypted.includes("ritim çalgısıyla"),
    };
  });

  expect(result.staleError).toMatch(/değişti|güncel/);
  expect(result.staleNoWrite).toBe(true);
  expect(result.commitError).toContain("Kurgu commit kesintisi");
  expect(result.rollbackExact).toBe(true);
  expect(result.receiptWrites).toBeGreaterThan(0);
  expect(result.uniqueWrites).toBe(result.receiptWrites);
  expect(result.rawPreserved).toBe(true);
  expect(result.decisionCount).toBe(2);
  expect(result.linkCount).toBe(2);
  expect(result.sharedPlan).toBe(1);
  expect(result.duplicateError).toMatch(/değişti|güncel|zaten/);
  expect(result.duplicateNoWrite).toBe(true);
  expect(result.backupExact).toBe(true);
  expect(result.encryptedHidesRaw).toBe(true);
});

test("undo ilgisiz sonraki gözlemi korur; paketin oluşturduğu haftaya sonradan bağlanan günlük plan varsa reddedilir", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fx = await import("/tests/fixtures/observation-management-fixture.mjs");
    const work = await import("/src/features/work-packages/work-package-service.ts");
    const workModel = await import("/src/features/work-packages/work-package-model.ts");
    const dashboard = await import("/src/features/dashboard/dashboard-data.ts");
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const dailyFlow = await import("/src/core/domain/teacher-owned-daily-flow.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `work-package-undo-${crypto.randomUUID()}`,
    });
    const fixture = await fx.makeObservationManagementFixture(source);
    await source.transaction("readwrite", ["classrooms"], async transaction => {
      const classrooms = await transaction.getAll("classrooms");
      await transaction.putMany("classrooms", classrooms.map(classroom => ({
        ...classroom,
        schedule: core.normalizeClassroomSchedule({
          kind: "morning",
          startTime: "08:30",
          endTime: "12:30",
        }),
        updatedAt: "2026-09-10T08:59:00.000Z",
      })));
    });
    const load = (now: Date) => work.loadWorkPackageModel(source, {
      civilDate: "2026-09-10",
      observationId: fixture.observationId,
      studentId: fixture.studentId,
      mode: "observations",
      now,
    });
    const choose = (model: Awaited<ReturnType<typeof load>>) => {
      const candidate = model.candidates[0];
      if (!candidate) throw new Error("Kurgu gözlem paketi hazırlanamadı.");
      return workModel.prepareWorkPackageSelection(model, {
        selections: { [candidate.id]: candidate.defaultChoiceId },
      });
    };
    const baseline = await source.readSnapshot();
    const firstReceipt = await work.applyWorkPackage(source, {
      ...choose(await load(new Date("2026-09-10T09:00:00.000Z"))),
      now: new Date("2026-09-10T09:00:00.000Z"),
    });
    const unrelatedId = "00000000-0000-4000-8000-00000000d201";
    await dashboard.persistDashboardObservation(source, {
      id: unrelatedId,
      studentId: fixture.studentId,
      createdAtUtc: "2026-09-10T09:01:00.000Z",
      rawText: "Kurgu paket dışı sonraki gözlem.",
    }, { now: new Date("2026-09-10T09:01:00.000Z") });
    const firstPreview = await work.previewWorkPackageUndo(source, firstReceipt);
    if (!firstPreview.eligible || !firstPreview.expectedFingerprint) {
      throw new Error(firstPreview.reason ?? "Kurgu undo önizlemesi hazırlanamadı.");
    }
    await work.undoWorkPackage(source, {
      receipt: firstReceipt,
      expectedFingerprint: firstPreview.expectedFingerprint,
      now: new Date("2026-09-10T09:02:00.000Z"),
    });
    const afterUndo = await source.readSnapshot();
    const original = baseline.observations.find(record => record.id === fixture.observationId);
    const restoredOriginal = afterUndo.observations.find(record => record.id === fixture.observationId);

    const secondReceipt = await work.applyWorkPackage(source, {
      ...choose(await load(new Date("2026-09-10T09:03:00.000Z"))),
      now: new Date("2026-09-10T09:03:00.000Z"),
    });
    const afterSecond = await source.readSnapshot();
    const weekly = afterSecond.plans.find(record =>
      record.planType === "weekly" &&
      record.periodStart <= "2026-09-15" &&
      record.periodEnd >= "2026-09-15",
    );
    if (!weekly) throw new Error("Kurgu destek haftası bulunamadı.");
    const profile = afterSecond.classrooms[0].curriculumProfileSnapshot;
    await evidence.createPlanWithActivity(source, {
      civilDate: "2026-09-15",
      planTitle: "Kurgu bağımlı günlük plan",
      activityTitle: "Kurgu bağımlı günlük etkinlik",
      startTime: "10:00",
      endTime: "10:30",
      curriculumProfile: profile,
      curriculumTargets: [fixture.target],
      assignmentMode: "selected-students",
      studentIds: [fixture.studentId],
      teacherOwnedDailyFlowBlocks: dailyFlow.defaultTeacherOwnedDailyFlowBlockDrafts(240),
      teacherOwnedActivityBlockKind: "teacher-activity-one",
      initialActivityStatus: "planned",
      now: new Date("2026-09-15T09:00:00.000Z"),
    });
    const dependentPreview = await work.previewWorkPackageUndo(source, secondReceipt);
    const final = await source.readSnapshot();
    const daily = final.plans.find(record =>
      record.planType === "daily" && record.sourceWeeklyPlanId === weekly.id,
    );
    source.close();
    return {
      unrelatedPreserved: afterUndo.observations.some(record => record.id === unrelatedId),
      originalRestored: core.canonicalJson(original) === core.canonicalJson(restoredOriginal),
      packageCreatesRemoved: firstReceipt.createdRecordIds.every(id =>
        !Object.values(afterUndo).some(records => records.some(record => record.id === id)),
      ),
      dependentEligible: dependentPreview.eligible,
      dependentReason: dependentPreview.reason ?? "",
      dailyStillPresent: Boolean(daily),
      dailyWeeklyId: daily?.sourceWeeklyPlanId,
      weeklyId: weekly.id,
    };
  });

  expect(result.unrelatedPreserved).toBe(true);
  expect(result.originalRestored).toBe(true);
  expect(result.packageCreatesRemoved).toBe(true);
  expect(result.dependentEligible).toBe(false);
  expect(result.dependentReason).toMatch(/sonradan değişti|başka kayıtlarda/);
  expect(result.dailyStillPresent).toBe(true);
  expect(result.dailyWeeklyId).toBe(result.weeklyId);
});
