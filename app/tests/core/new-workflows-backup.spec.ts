import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("V10 üç yeni kayıt tipi gerçek şifreli IDB yedeğiyle başka kasaya count/hash ve deepEqual korunarak döner", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const { seedNewWorkflows } = await import("/tests/fixtures/new-workflows-browser.ts");
    const { assertBackupRecoveryMatch } = await import("/src/core/backup/backup-capacity.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const sourceName = `new-workflows-source-${crypto.randomUUID()}`, targetName = `new-workflows-target-${crypto.randomUUID()}`;
    const source = new core.IndexedDbDataStore({ databaseName: sourceName });
    await seedNewWorkflows(source);
    const expected = await source.readSnapshot();
    const service = new core.BackupService(source, { appVersion: "0.28.0", clock: () => new Date("2026-09-21T08:00:00.000Z") });
    const sourceSummary = await service.recoverySummary();
    const encrypted = service.serializeEncryptedBackup(await service.exportEncryptedBackup("Kurgu-yeni-moduller-2026!"));
    const target = new core.IndexedDbDataStore({ databaseName: targetName });
    const restore = new core.BackupService(target, { appVersion: "0.28.0" });
    await restore.restoreEncryptedBackup(encrypted, "Kurgu-yeni-moduller-2026!", { mode: "replace", createRecoverySnapshot: false });
    const actual = await target.readSnapshot();
    const actualSummary = await restore.recoverySummary();
    assertBackupRecoveryMatch(sourceSummary, actualSummary);
    await restore.createRecoverySnapshot("manual");
    const raw = await Promise.all(core.COLLECTION_NAMES.map(c => fx.readAll<Record<string, unknown>>(targetName, c)));
    const recovery = await fx.readAll(targetName, core.RECOVERY_SNAPSHOT_STORE_NAME);
    const output = { schema: (await restore.exportBackup()).manifest.dataSchemaVersion, recordCount: actualSummary.recordCount,
      types: [...new Set(actual.settings.map(r => r.settingType))].filter(t => ["growth-measurement-v1", "consent-trip-v1", "classroom-admin-v1"].includes(t)).sort(),
      countHashExact: core.canonicalJson(sourceSummary.collections) === core.canonicalJson(actualSummary.collections), deepEqual: core.canonicalJson(expected) === core.canonicalJson(actual),
      allRowsSealed: raw.flat().every(r => Object.keys(r).sort().join(",") === "__maarifosLocalVault,id"),
      recoverySealed: !JSON.stringify(recovery).includes("Kurgu özel"), noPlaintext: !JSON.stringify(raw).includes("Kurgu özel") && !encrypted.includes("Kurgu özel"),
      restoreReceipt: core.canonicalJson(restore.lastRestoreVerification?.collections) === core.canonicalJson(sourceSummary.collections) };
    source.close(); target.close();
    return output;
  });
  expect(result.schema).toBe(11);
  expect(result.recordCount).toBeGreaterThan(40);
  expect(result.types).toEqual(["classroom-admin-v1", "consent-trip-v1", "growth-measurement-v1"]);
  expect([result.countHashExact, result.deepEqual, result.allRowsSealed, result.recoverySealed, result.noPlaintext, result.restoreReceipt]).toEqual(Array(6).fill(true));
  const directory = new URL("../../output/new-workflows-2026-09-08/", import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("roundtrip.json", directory), JSON.stringify(result, null, 2));
});

test("yeni tipler V9 etiketi, bilinmeyen alan ve kaynak/çocuk/ölçü birimi kopukluğunu hedefi değiştirmeden reddeder", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const { seedNewWorkflows } = await import("/tests/fixtures/new-workflows-browser.ts");
    const source = new core.IndexedDbDataStore({ databaseName: `new-neg-source-${crypto.randomUUID()}` });
    const ids = await seedNewWorkflows(source);
    const backup = await new core.BackupService(source, { appVersion: "0.28.0" }).exportBackup();
    const target = new core.IndexedDbDataStore({ databaseName: `new-neg-target-${crypto.randomUUID()}` });
    const restore = new core.BackupService(target, { appVersion: "0.28.0" });
    const before = core.canonicalJson(await target.readSnapshot());
    const types = ["growth-measurement-v1", "consent-trip-v1", "classroom-admin-v1"];
    const rejected = [];
    const cases = [...types.map(type => `v9:${type}`), ...types.map(type => `field:${type}`), "growth-fraction", "growth-cross-child", "consent-source", "trip-roster", "trip-chain", "handover-source", "inventory-stock"];
    for (const kind of cases) {
      const candidate = structuredClone(backup);
      const rows = candidate.payload.settings;
      const find = (type, predicate = () => true) => rows.find(r => r.settingType === type && predicate(r));
      if (kind.startsWith("v9:")) { const type = kind.slice(3); candidate.manifest.dataSchemaVersion = 9; candidate.payload.settings = rows.filter(r => !types.includes(r.settingType) || r.settingType === type); }
      if (kind.startsWith("field:")) find(kind.slice(6)).unknownPrivateField = "Kurgu";
      if (kind === "growth-fraction") find(types[0], r => r.eventKind === "measurement").integerValue = 1100.5;
      if (kind === "growth-cross-child") find(types[0], r => r.eventKind === "selection" && r.studentId === ids.studentId).selectedMeasurementId = ids.measurements[2];
      if (kind === "consent-source") find(types[1], r => r.workflow.kind === "consent-decision").workflow.documentId = crypto.randomUUID();
      if (kind === "trip-roster") find(types[1], r => r.workflow.kind === "trip-start").workflow.roster[0].studentId = crypto.randomUUID();
      if (kind === "trip-chain") find(types[1], r => r.workflow.kind === "trip-complete").workflow.previousEventId = crypto.randomUUID();
      if (kind === "handover-source") find(types[2], r => r.workflow.kind === "handover-plan").workflow.items[0].sourceId = crypto.randomUUID();
      if (kind === "inventory-stock") find(types[2], r => r.workflow.kind === "inventory-movement" && r.workflow.action === "loan").workflow.quantity = 999;
      candidate.manifest.entityCounts = Object.fromEntries(core.COLLECTION_NAMES.map(c => [c, candidate.payload[c].length]));
      candidate.manifest.payloadChecksum = await core.sha256Hex(core.canonicalJson(candidate.payload));
      try { await restore.restoreBackup(candidate, { mode: "replace", createRecoverySnapshot: false }); }
      catch { rejected.push(kind); }
    }
    const unchanged = before === core.canonicalJson(await target.readSnapshot());
    source.close(); target.close();
    return { cases, rejected, unchanged };
  });
  expect(result.rejected).toEqual(result.cases);
  expect(result.unchanged).toBe(true);
});

test("V10 gerçek IDB quota hatası ana veri ve recovery'yi korur; yeniden deneme tam geri yükler", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.name));
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const { seedNewWorkflows } = await import("/tests/fixtures/new-workflows-browser.ts");
    const source = new core.IndexedDbDataStore({ databaseName: `new-quota-source-${crypto.randomUUID()}` });
    await seedNewWorkflows(source);
    const sourceService = new core.BackupService(source, { appVersion: "0.28.0" });
    const backup = await sourceService.exportBackup();
    const name = `new-quota-target-${crypto.randomUUID()}`;
    const target = new core.IndexedDbDataStore({ databaseName: name });
    await target.transaction("readwrite", ["students"], tx => tx.putMany("students", [{ id: crypto.randomUUID(), schemaVersion: 1, createdAt: "2026-09-08T06:00:00.000Z", updatedAt: "2026-09-08T06:00:00.000Z", civilDate: "2026-09-08", displayName: "Korunacak Kurgu" }]));
    const service = new core.BackupService(target, { appVersion: "0.28.0" });
    const recovery = await service.createRecoverySnapshot("manual");
    const before = core.canonicalJson(await target.readSnapshot());
    const originalPut = IDBObjectStore.prototype.put;
    let quotaError = "";
    try {
      IDBObjectStore.prototype.put = function(...args) { if (this.transaction.db.name === name && this.name === "settings") throw new DOMException("Kurgu disk kotası", "QuotaExceededError"); return originalPut.apply(this, args); };
      await service.restoreBackup(backup, { mode: "replace", createRecoverySnapshot: false });
    } catch (error) { quotaError = error instanceof Error ? error.name : String(error); }
    finally { IDBObjectStore.prototype.put = originalPut; }
    const preserved = before === core.canonicalJson(await target.readSnapshot());
    const recoveryPreserved = await target.getRecoverySnapshot(recovery.id) !== null;
    const noFalseReceipt = service.lastRestoreVerification === null;
    await service.restoreBackup(backup, { mode: "replace", createRecoverySnapshot: false });
    const retried = core.canonicalJson(await target.readSnapshot()) === core.canonicalJson(backup.payload);
    source.close(); target.close();
    return { quotaError, preserved, recoveryPreserved, noFalseReceipt, retried };
  });
  expect(result).toEqual({ quotaError: "QuotaExceededError", preserved: true, recoveryPreserved: true, noFalseReceipt: true, retried: true });
  expect(pageErrors).toEqual([]);
});

test("kalıcı çocuk silme ölçüm ve izin zincirini kaldırır; ortak gezi/devir/emanet sayısı ve diğer çocuk korunur", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fixture = await import("/tests/fixtures/new-workflows-browser.ts");
    const lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const consent = await import("/src/core/domain/consent-trips.ts");
    const admin = await import("/src/core/domain/classroom-admin.ts");
    const growth = await import("/src/core/domain/growth-measurements.ts");
    const name = `new-privacy-${crypto.randomUUID()}`;
    const store = new core.IndexedDbDataStore({ databaseName: name });
    const ids = await fixture.seedNewWorkflows(store);
    const before = await store.readSnapshot();
    const originalBalances = admin.inventoryBalances(admin.classroomAdminRecords(before)).map(b => ({ owned: b.owned, available: b.available, onLoan: b.onLoan, damaged: b.damaged }));
    const otherGrowth = before.settings.filter(r => r.settingType === growth.GROWTH_MEASUREMENT_SETTING_TYPE && r.studentId === ids.otherId);
    const service = new core.BackupService(store, { appVersion: "0.28.0" });
    const recovery = await service.createRecoverySnapshot("manual");
    await fixture.archiveWorkflowStudent(store, ids.studentId);
    const child = (await store.readSnapshot()).students.find(s => s.id === ids.studentId)!;
    await lifecycle.permanentlyDeleteArchivedStudent(store, { studentId: ids.studentId, confirmationName: String(child.displayName), now: new Date("2026-09-21T08:00:00.000Z") });
    const after = await store.readSnapshot();
    const trip = consent.tripState(consent.consentTripRecords(after), ids.tripId);
    const records = admin.classroomAdminRecords(after);
    const handover = admin.handoverState(records, ids.handoverId)!;
    const planAndRevisions = records.filter(r => r.id === ids.handoverId || r.workflow.kind === "handover-revision");
    await service.parseAndVerifyBackup(await service.exportBackup());
    const persisted = core.canonicalJson(after);
    const result = { noChildReference: !persisted.includes(ids.studentId), noChildDecisionReference: !persisted.includes(ids.grantIds[0]),
      noChildGrowth: after.settings.every(r => r.settingType !== growth.GROWTH_MEASUREMENT_SETTING_TYPE || r.studentId !== ids.studentId),
      otherGrowthExact: core.canonicalJson(otherGrowth) === core.canonicalJson(after.settings.filter(r => r.settingType === growth.GROWTH_MEASUREMENT_SETTING_TYPE && r.studentId === ids.otherId)),
      tripStatus: trip.status, remainingRoster: trip.roster.length, redactedCount: trip.redactedParticipantCount, returned: trip.returned,
      stockPreserved: core.canonicalJson(originalBalances) === core.canonicalJson(admin.inventoryBalances(records).map(b => ({ owned: b.owned, available: b.available, onLoan: b.onLoan, damaged: b.damaged }))),
      loanRemoved: records.find(r => r.id === ids.loanId)?.workflow.party?.type === "removed", otherLoanPreserved: records.find(r => r.id === ids.otherLoanId)?.workflow.party?.studentId === ids.otherId,
      handoverClosed: !!handover.closed, allChecksPreserved: handover.completedCount === handover.items.length,
      allCopiesRedacted: planAndRevisions.every(r => r.workflow.items.filter(i => i.redacted).length === 2),
      recoveryPurged: await store.getRecoverySnapshot(recovery.id) === null };
    store.close();
    const reopened = new core.IndexedDbDataStore({ databaseName: name });
    const restartExact = core.canonicalJson(await reopened.readSnapshot()) === persisted;
    reopened.close();
    return { ...result, restartExact };
  });
  expect(result).toEqual({ noChildReference: true, noChildDecisionReference: true, noChildGrowth: true, otherGrowthExact: true,
    tripStatus: "completed", remainingRoster: 1, redactedCount: 1, returned: 1, stockPreserved: true, loanRemoved: true, otherLoanPreserved: true,
    handoverClosed: true, allChecksPreserved: true, allCopiesRedacted: true, recoveryPurged: true, restartExact: true });
});

test("dönüşü görülmeyen aktif gezi çocuğu silinemez; düzeltilmiş dönüşten sonra ortak gezi korunur", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fixture = await import("/tests/fixtures/new-workflows-browser.ts");
    const lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const consent = await import("/src/core/domain/consent-trips.ts");
    const { executeConsentTrip } = await import("/src/features/consent-trips/consent-trip-service.ts");
    const store = new core.IndexedDbDataStore({ databaseName: `new-active-trip-delete-${crypto.randomUUID()}` });
    const ids = await fixture.seedNewWorkflows(store);
    const scope = { academicYearId: ids.academicYearId, classroomId: ids.classroomId };
    let now = Date.parse("2026-09-10T09:10:00.000Z");
    const command = async action => {
      const rows = consent.consentTripRecords(await store.readSnapshot());
      return executeConsentTrip(store, { scope, now: new Date(now += 1000), command: { ...action, tripId: ids.tripId, expectedEventId: consent.tripState(rows, ids.tripId).latestEventId } });
    };
    await command({ action: "reopen", reason: "Kurgu sayım düzeltmesi" });
    const firstReturn = consent.latestTripCheck(consent.consentTripRecords(await store.readSnapshot()), ids.tripId, ids.studentId, "return");
    const missing = await command({ action: "check", studentId: ids.studentId, stage: "return", outcome: "not-seen", actualAt: new Date(now).toISOString(), previousCheckId: firstReturn.id, correctionReason: "Kurgu yanlış işaret düzeltmesi", note: "" });
    await fixture.archiveWorkflowStudent(store, ids.studentId);
    const service = new core.BackupService(store, { appVersion: "0.28.0" });
    const recovery = await service.createRecoverySnapshot("manual");
    const before = core.canonicalJson(await store.readSnapshot());
    const child = (await store.readSnapshot()).students.find(s => s.id === ids.studentId);
    let blocked = "";
    try { await lifecycle.permanentlyDeleteArchivedStudent(store, { studentId: ids.studentId, confirmationName: child.displayName, now: new Date("2026-09-21T08:00:00.000Z") }); }
    catch (error) { blocked = error instanceof Error ? error.message : ""; }
    const unchanged = before === core.canonicalJson(await store.readSnapshot());
    const recoveryPreserved = await store.getRecoverySnapshot(recovery.id) !== null;
    await command({ action: "check", studentId: ids.studentId, stage: "return", outcome: "seen", actualAt: new Date(now).toISOString(), previousCheckId: missing.id, correctionReason: "Kurgu dönüş doğrulandı", note: "" });
    await lifecycle.permanentlyDeleteArchivedStudent(store, { studentId: ids.studentId, confirmationName: child.displayName, now: new Date("2026-09-21T08:00:00.000Z") });
    const after = await store.readSnapshot();
    const trip = consent.tripState(consent.consentTripRecords(after), ids.tripId);
    await service.parseAndVerifyBackup(await service.exportBackup());
    store.close();
    return { blocked: blocked.includes("devam eden gezide dönüş sayımı tamamlanmadı"), unchanged, recoveryPreserved,
      deleted: !after.students.some(s => s.id === ids.studentId), status: trip.status, roster: trip.roster.length, anonymous: trip.redactedParticipantCount, missing: trip.missing };
  });
  expect(result).toEqual({ blocked: true, unchanged: true, recoveryPreserved: true, deleted: true, status: "active", roster: 1, anonymous: 1, missing: 0 });
});
