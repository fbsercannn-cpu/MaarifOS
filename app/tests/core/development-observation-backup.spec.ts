import { expect, test } from "@playwright/test";

test("Maarif gelişim seçimi ve bağı gerçek IndexedDB yedeğinde kayıpsızdır; tahrif ve kısmi kayıt reddedilir", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const presets = await import("/src/features/evidence/development-observation-presets.ts");
    const quick = await import("/src/features/evidence/quick-observation.ts");
    const spontaneous = await import("/src/features/evidence/spontaneous-observation.ts");
    const graph = await import("/src/features/curriculum/tymm-holistic-graph.ts");
    const source = new core.IndexedDbDataStore({ databaseName: `development-source-${crypto.randomUUID()}` });
    const draftTarget = new core.IndexedDbDataStore({ databaseName: `development-draft-${crypto.randomUUID()}` });
    const finalTarget = new core.IndexedDbDataStore({ databaseName: `development-final-${crypto.randomUUID()}` });
    const now = new Date("2026-09-08T07:00:00.000Z");
    const academicYearId = "00000000-0000-4000-8000-000000006011";
    const classroomId = "00000000-0000-4000-8000-000000006012";
    const studentId = "00000000-0000-4000-8000-000000006013";
    const observationId = "00000000-0000-4000-8000-000000006014";
    const base = { createdAt: now.toISOString(), updatedAt: now.toISOString(), civilDate: "2026-09-08", deletedAt: null, schemaVersion: 1 };
    await source.transaction("readwrite", ["academicYears", "classrooms", "settings", "students"], async (tx) => {
      await tx.putMany("academicYears", [{ ...base, id: academicYearId, name: "Kurgu Eğitim Yılı", startDate: "2026-09-01", endDate: "2027-06-30", status: "active" }]);
      await tx.putMany("classrooms", [{
        ...base, id: classroomId, academicYearId, name: "Kurgu Sınıf", ageGroup: "60-72 ay", schemaVersion: 2,
        curriculumProfileSnapshot: {
          framework: "tymm", programLabel: "Türkiye Yüzyılı Maarif Modeli", catalogId: "tymm-legacy-partial", sourceVersion: "2024",
          referenceOrigin: "teacher-declared", officialCatalogVerified: false,
        },
      }]);
      await tx.putMany("settings", [{ ...base, id: core.ACTIVE_CLASSROOM_SETTING_ID, settingType: core.ACTIVE_CLASSROOM_SETTING_TYPE, academicYearId, classroomId }]);
      await tx.putMany("students", [{ ...base, id: studentId, academicYearId, classroomId, displayName: "Kurgu Çocuk", active: true, enrollmentStatus: "active" }]);
    });
    const context = await spontaneous.ensureSpontaneousObservationContext(source, { studentId, civilDate: "2026-09-08", now });
    const options = { appVersion: "0.20.1-test", clock: () => now, civilDateProvider: () => "2026-09-08" };
    const service = new core.BackupService(source, options);
    const legacyV6 = await service.exportBackup();
    legacyV6.manifest.dataSchemaVersion = 6;
    const upgradedV6 = await service.parseAndVerifyBackup(legacyV6);
    const legacyPayloadPreserved = core.canonicalJson(legacyV6.payload) === core.canonicalJson(upgradedV6.payload);
    const selection = { presetId: "development-60-72-group-contact", ageBand: "60-72" as const, support: "with-reminder" as const };
    const { programMapping: _mapping, ...draft } = presets.createDevelopmentObservationDraft(selection);
    const input = { ...draft, studentId, planId: context.plan.id, activityId: context.activity.id, developmentSelection: selection, now };
    await quick.persistQuickObservationDraft(source, input);
    const pendingBackup = await service.exportBackup();
    await new core.BackupService(draftTarget, options).restoreBackup(pendingBackup, { mode: "replace", createRecoverySnapshot: false });
    const restoredDraft = await quick.loadQuickObservationDraft(draftTarget, { studentId, planId: context.plan.id, activityId: context.activity.id });
    await quick.finalizeQuickObservationDraft(source, { studentId, observationId, now });
    const backup = await service.exportBackup();
    const falselyDowngraded = structuredClone(backup);
    falselyDowngraded.manifest.dataSchemaVersion = 6;
    let downgradeError = "";
    try { await service.parseAndVerifyBackup(falselyDowngraded); }
    catch (error) { downgradeError = error instanceof Error ? error.message : String(error); }
    await new core.BackupService(finalTarget, options).restoreBackup(service.serializeBackup(backup), { mode: "replace", createRecoverySnapshot: false });
    const restored = await finalTarget.readSnapshot();
    const sourceSnapshot = await source.readSnapshot();
    const variants: Array<(payload: typeof backup.payload) => void> = [
      (payload) => { (payload.evidenceCurriculumLinks[0].targetSnapshot as { referenceCode: string }).referenceCode = "FAB.1"; },
      (payload) => { (payload.evidenceCurriculumLinks[0].developmentSelection as { support: string }).support = "together"; },
      (payload) => { payload.evidenceCurriculumLinks[0].targetSourceSha256 = `sha256:${"0".repeat(64)}`; },
      (payload) => { payload.evidenceCurriculumLinks[0].plannedTargetId = "invented-target"; },
      (payload) => { payload.evidenceCurriculumLinks = []; },
      (payload) => { payload.evidenceCurriculumLinks[0].holisticGraphReference = graph.createTymmHolisticLearningOutcomeReference("60-72", "MHB.3"); },
      (payload) => { (payload.evidenceCurriculumLinks[0].holisticGraphReference as { relatedNodeIds: string[] }).relatedNodeIds.pop(); },
    ];
    const rejectionMessages: string[] = [];
    for (const mutate of variants) {
      const corrupted = structuredClone(backup);
      mutate(corrupted.payload);
      corrupted.manifest.entityCounts.evidenceCurriculumLinks = corrupted.payload.evidenceCurriculumLinks.length;
      corrupted.manifest.payloadChecksum = await core.sha256Hex(core.canonicalJson(corrupted.payload));
      try { await service.parseAndVerifyBackup(corrupted); rejectionMessages.push(""); }
      catch (error) { rejectionMessages.push(error instanceof Error ? error.message : String(error)); }
    }

    await quick.persistQuickObservationDraft(source, input);
    const beforeFailure = await source.readSnapshot();
    const failingStore = {
      transaction: (mode, collections, work) => source.transaction(mode, collections, (tx) => work({
        ...tx,
        getAll: (collection) => tx.getAll(collection),
        putMany: async (collection, records) => {
          if (collection === "evidenceCurriculumLinks") throw new Error("Kurgu program bağı disk hatası");
          return tx.putMany(collection, records);
        },
      })),
      readSnapshot: () => source.readSnapshot(),
      close: () => {},
    };
    let atomicFailure = "";
    try { await quick.finalizeQuickObservationDraft(failingStore, { studentId, now }); }
    catch (error) { atomicFailure = error instanceof Error ? error.message : String(error); }
    const afterFailure = await source.readSnapshot();
    source.close(); draftTarget.close(); finalTarget.close();
    return {
      draftSelection: restoredDraft?.developmentSelection,
      expectedSelection: selection,
      canonicalEqual: core.canonicalJson(restored) === core.canonicalJson(sourceSnapshot),
      unchangedPlan: core.canonicalJson(restored.plans[0]) === core.canonicalJson(context.plan),
      unchangedActivity: core.canonicalJson(restored.activities[0]) === core.canonicalJson(context.activity),
      rawText: restored.observations[0].rawText,
      expectedRawText: input.rawText,
      linkCount: restored.evidenceCurriculumLinks.length,
      reportCount: restored.reportDrafts.length,
      rejectionMessages,
      atomicFailure,
      atomicEqual: core.canonicalJson(beforeFailure) === core.canonicalJson(afterFailure),
      version: backup.manifest.dataSchemaVersion,
      legacyVersion: upgradedV6.manifest.dataSchemaVersion,
      legacyPayloadPreserved,
      downgradeError,
    };
  });
  expect(result.draftSelection).toEqual(result.expectedSelection);
  expect(result.canonicalEqual).toBe(true);
  expect(result.unchangedPlan).toBe(true);
  expect(result.unchangedActivity).toBe(true);
  expect(result.rawText).toBe(result.expectedRawText);
  expect(result.linkCount).toBe(1);
  expect(result.reportCount).toBe(0);
  expect(result.rejectionMessages).toHaveLength(7);
  expect(result.rejectionMessages.every(Boolean)).toBe(true);
  expect(result.atomicFailure).toContain("disk hatası");
  expect(result.atomicEqual).toBe(true);
  expect(result.version).toBe(11);
  expect(result.legacyVersion).toBe(11);
  expect(result.legacyPayloadPreserved).toBe(true);
  expect(result.downgradeError).toContain("V7");
});
