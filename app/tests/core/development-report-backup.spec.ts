import { expect, test } from "@playwright/test";

test("V10 öğretmen gözlem özeti taslak/onay yedeği gerçek IndexedDB'de kayıpsız; bozuk mühür ve hedef reddedilir", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const report = await import("/src/features/development/development-report.ts");
    const fixtures = await import("/tests/fixtures/development-report-fixture.mjs");
    const source = new core.IndexedDbDataStore({ databaseName: `report-source-${crypto.randomUUID()}` });
    const target = new core.IndexedDbDataStore({ databaseName: `report-target-${crypto.randomUUID()}` });
    const { input } = await fixtures.makeDevelopmentReportFixture(source);
    const options = { appVersion: "development-report-test", clock: () => input.now, civilDateProvider: () => "2026-09-08" };
    const service = new core.BackupService(source, options);
    const draft = await report.saveDevelopmentReportDraft(source, input);
    const draftBackup = await service.exportBackup();
    const restorer = new core.BackupService(target, options);
    await restorer.restoreBackup(draftBackup, { mode: "replace", createRecoverySnapshot: false });
    const draftRoundtrip = core.canonicalJson(await source.readSnapshot()) === core.canonicalJson(await target.readSnapshot());
    const approved = await report.approveDevelopmentReport(source, { reportId: draft.id, expectedRevision: 1, now: input.now });
    const backup = await service.exportBackup();
    const conflictingMerge = await restorer.restoreBackup(backup, { mode: "merge", createRecoverySnapshot: false });
    const mergePreservesDraft = (await target.readSnapshot()).settings.find((row) => row.id === draft.id)?.status === "draft";
    await restorer.restoreBackup(backup, { mode: "replace", createRecoverySnapshot: false });
    const current = await target.readSnapshot();
    const approvedRoundtrip = core.canonicalJson(await source.readSnapshot()) === core.canonicalJson(current);
    const pdfGate = await report.requireApprovedDevelopmentReport(current, approved.id);
    const repeatedMerge = await restorer.restoreBackup(backup, { mode: "merge", createRecoverySnapshot: false });
    const tamperErrors = [];
    for (const mutate of [
      (record) => { record.teacherEvaluation += " Onaysız metin."; },
      (record) => { record.approvalSeal.approvedByUserId = crypto.randomUUID(); },
      (record) => { record.evidenceSnapshots[0].confirmedTargets[0].referenceTitle = "Uydurma hedef"; },
      (record) => { record.evidenceSnapshots[0].supportLabel = "Otomatik bağımsız"; },
      (record) => { record.evidenceSnapshots[0].sourceObservation.rawText = "Değişen kaynak"; },
      (record) => { record.selectedObservationIds = [crypto.randomUUID()]; },
      (record) => { record.unrecognizedField = "unsupported"; },
    ]) {
      const tampered = structuredClone(backup);
      mutate(tampered.payload.settings.find((record) => record.id === approved.id));
      tampered.manifest.payloadChecksum = await core.sha256Hex(core.canonicalJson(tampered.payload));
      try { await service.parseAndVerifyBackup(tampered); tamperErrors.push(""); }
      catch (error) { tamperErrors.push(String(error)); }
    }
    const lowerVersion = structuredClone(backup); lowerVersion.manifest.dataSchemaVersion = 7;
    let downgradeError = "";
    try { await service.parseAndVerifyBackup(lowerVersion); } catch (error) { downgradeError = String(error); }

    // One preserved stale approval cannot be used as a current PDF approval.
    const stale = structuredClone(backup);
    stale.payload.observations[0].rawText += " Sonradan değişmiş kaynak.";
    stale.manifest.payloadChecksum = await core.sha256Hex(core.canonicalJson(stale.payload));
    await restorer.restoreBackup(stale, { mode: "replace", createRecoverySnapshot: false });
    const staleRead = await report.getDevelopmentReportReadModel(await target.readSnapshot(), approved.id);

    // Fail after identity creation inside the actual IndexedDB transaction.
    const nextDraft = await report.saveDevelopmentReportDraft(source, input);
    await source.transaction("readwrite", ["settings"], async (tx) => {
      const rows = await tx.getAll("settings"); await tx.clear("settings");
      await tx.putMany("settings", rows.filter((row) => row.settingType !== "local-teacher-identity"));
    });
    const before = await source.readSnapshot();
    const failingStore = {
      transaction: (mode, collections, work) => source.transaction(mode, collections, (tx) => work({
        getAll: (collection) => tx.getAll(collection), clear: (collection) => tx.clear(collection),
        putMany: (collection, rows) => { if (rows.some((row) => row.settingType === "development-report")) throw new Error("Kurgu rapor disk hatası"); return tx.putMany(collection, rows); },
      })), readSnapshot: () => source.readSnapshot(), close: () => {},
    };
    let atomicError = "";
    try { await report.approveDevelopmentReport(failingStore, { reportId: nextDraft.id, expectedRevision: 1, now: input.now }); }
    catch (error) { atomicError = String(error); }
    const atomicSame = core.canonicalJson(before) === core.canonicalJson(await source.readSnapshot());
    await report.approveDevelopmentReport(source, { reportId: nextDraft.id, expectedRevision: 1, now: input.now });
    source.close(); target.close();
    return { version: backup.manifest.dataSchemaVersion, draftRoundtrip, approvedRoundtrip, title: pdfGate.title, tamperErrors, downgradeError, staleStatus: staleRead.sourceStatus, staleCanExport: staleRead.canExport, atomicSame, atomicError,
      mergePreservesDraft, conflictCount: conflictingMerge.conflicts.length, repeatedInsertCount: repeatedMerge.inserted, repeatedConflictCount: repeatedMerge.conflicts.length };
  });
  expect(result.version).toBe(11);
  expect(result.draftRoundtrip).toBe(true); expect(result.approvedRoundtrip).toBe(true);
  expect(result.title).toBe("Öğretmen gözlem özeti");
  expect(result.tamperErrors).toHaveLength(7); expect(result.tamperErrors.every(Boolean)).toBe(true);
  expect(result.downgradeError).toContain("V8");
  expect(result.staleStatus).toBe("stale"); expect(result.staleCanExport).toBe(false);
  expect(result.atomicSame).toBe(true); expect(result.atomicError).toContain("disk hatası");
  expect(result.mergePreservesDraft).toBe(true); expect(result.conflictCount).toBe(1);
  expect(result.repeatedInsertCount).toBe(0); expect(result.repeatedConflictCount).toBe(0);
});

test("V1–V7 sözleşmeleri V11'e okunur; eski kaynak payload'ı kaybolmaz ve rapor uydurulmaz", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const results = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fixtures = await import("/tests/fixtures/development-report-fixture.mjs");
    const source = new core.IndexedDbDataStore({ databaseName: `report-legacy-${crypto.randomUUID()}` });
    const { input } = await fixtures.makeDevelopmentReportFixture(source);
    const service = new core.BackupService(source, { appVersion: "development-report-test", clock: () => input.now, civilDateProvider: () => "2026-09-08" });
    const modern = await service.exportBackup();
    const results = [];
    for (const version of [1, 2, 3, 4, 5, 6, 7]) {
      const legacy = structuredClone(modern);
      legacy.manifest.dataSchemaVersion = version;
      if (version < 7) {
        legacy.payload.observations.forEach((row) => { delete row.developmentSelection; });
        legacy.payload.evidenceCurriculumLinks = [];
        legacy.manifest.entityCounts.evidenceCurriculumLinks = 0;
        legacy.payload.settings.forEach((row) => { delete row.developmentSelection; });
      }
      // V1–V5 historically split this name. Supply that existing normalized
      // representation so the test detects any unrelated payload mutation.
      legacy.payload.students.forEach((row) => { row.firstName = "Kurgu"; row.lastName = row.displayName.slice(6); });
      const removed = [ ...(version === 1 ? ["evidenceCurriculumLinks"] : []), ...(version < 4 ? ["calendarEntries", "externalFeedback"] : []), ...(version < 5 ? ["valueEvidenceLinks"] : []) ];
      for (const name of removed) { delete legacy.payload[name]; delete legacy.manifest.entityCounts[name]; }
      legacy.manifest.payloadChecksum = await core.sha256Hex(core.canonicalJson(legacy.payload));
      const upgraded = await service.parseAndVerifyBackup(legacy);
      const allOriginalCollectionsEqual = Object.keys(legacy.payload).every((name) => core.canonicalJson(legacy.payload[name]) === core.canonicalJson(upgraded.payload[name]));
      results.push({ version, upgradedVersion: upgraded.manifest.dataSchemaVersion, allOriginalCollectionsEqual, inventedReports: upgraded.payload.settings.some((row) => row.settingType === "development-report") });
    }
    source.close(); return results;
  });
  expect(results).toHaveLength(7);
  for (const result of results) {
    expect(result.upgradedVersion).toBe(11); expect(result.allOriginalCollectionsEqual).toBe(true); expect(result.inventedReports).toBe(false);
  }
});
