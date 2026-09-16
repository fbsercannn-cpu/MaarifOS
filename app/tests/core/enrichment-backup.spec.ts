import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
test.setTimeout(120000);
test("MR103–108 yeni aile ve merkez kayıtları şifreli farklı kasaya sayı/hash korunarak döner", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts"), { seedEnrichmentWorkflows } = await import("/tests/fixtures/enrichment-browser.ts"), fx = await import("/tests/fixtures/local-vault-browser.ts");
    const source = new core.IndexedDbDataStore({ databaseName: `enrichment-source-${crypto.randomUUID()}` }), targetName = `enrichment-target-${crypto.randomUUID()}`, target = new core.IndexedDbDataStore({ databaseName: targetName });
    await seedEnrichmentWorkflows(source); const expected = await source.readSnapshot(); const sourceBackup = new core.BackupService(source, { appVersion: "0.28.0", clock: () => new Date("2026-09-21T08:00:00.000Z") });
    const plain = await sourceBackup.exportBackup(), sourceSummary = await sourceBackup.recoverySummary(); const encrypted = sourceBackup.serializeEncryptedBackup(await sourceBackup.exportEncryptedBackup("Kurgu-ek-araclar-2026!"));
    const restore = new core.BackupService(target, { appVersion: "0.28.0" }); await restore.restoreEncryptedBackup(encrypted, "Kurgu-ek-araclar-2026!", { mode: "replace", createRecoverySnapshot: false }); const actual = await target.readSnapshot(), summary = await restore.recoverySummary();
    const rows = (await Promise.all(core.COLLECTION_NAMES.map(c => fx.readAll(targetName, c)))).flat();
    const output = { schema: plain.manifest.dataSchemaVersion, records: summary.recordCount, types: [...new Set(actual.settings.map(r => r.settingType))].filter(t => ["growth-measurement-v1", "consent-trip-v1", "classroom-admin-v1", "family-engagement-v1", "learning-centers-v1", "school-document-template-v1", "daily-routine-cards-v1"].includes(t)).sort(), exact: core.canonicalJson(expected) === core.canonicalJson(actual), countHashExact: core.canonicalJson(sourceSummary.collections) === core.canonicalJson(summary.collections), sealed: rows.every(r => Object.keys(r).sort().join(",") === "__maarifosLocalVault,id"), noPlaintext: !JSON.stringify(rows).includes("Kurgu Yakın") && !encrypted.includes("Kurgu Yakın") };
    source.close(); target.close(); return output;
  });
  expect(result.schema).toBe(11); expect(result.types).toEqual(["classroom-admin-v1", "consent-trip-v1", "daily-routine-cards-v1", "family-engagement-v1", "growth-measurement-v1", "learning-centers-v1", "school-document-template-v1"]); expect([result.exact, result.countHashExact, result.sealed, result.noPlaintext]).toEqual([true, true, true, true]);
  await mkdir("output/new-workflows-2026-09-08/enrichment", { recursive: true }); await writeFile("output/new-workflows-2026-09-08/enrichment/roundtrip.json", JSON.stringify(result, null, 2));
});
test("MR103–108 çocuk kaldırılırken yakın tercihleri/randevusu kalkar; merkez ve stok korunur", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts"), { seedEnrichmentWorkflows } = await import("/tests/fixtures/enrichment-browser.ts"), { archiveWorkflowStudent } = await import("/tests/fixtures/new-workflows-browser.ts"), lifecycle = await import("/src/features/students/student-lifecycle.ts"), admin = await import("/src/core/domain/classroom-admin.ts"), centers = await import("/src/core/domain/learning-centers.ts");
    const store = new core.IndexedDbDataStore({ databaseName: `enrichment-delete-${crypto.randomUUID()}` }), ids = await seedEnrichmentWorkflows(store); await archiveWorkflowStudent(store, ids.studentId);
    const before = await store.readSnapshot(), numbers = s => admin.inventoryBalances(admin.classroomAdminRecords(s)).map(b => [b.item.id, b.owned, b.available, b.onLoan, b.damaged]);
    await new core.BackupService(store, { appVersion: "0.28.0" }).createRecoverySnapshot("manual"); const child = before.students.find(s => s.id === ids.studentId);
    await lifecycle.permanentlyDeleteArchivedStudent(store, { studentId: ids.studentId, confirmationName: child.displayName, now: new Date("2026-09-21T08:00:00.000Z") });
    const after = await store.readSnapshot(); await new core.BackupService(store, { appVersion: "0.28.0" }).parseAndVerifyBackup(await new core.BackupService(store, { appVersion: "0.28.0" }).exportBackup());
    const output = { studentGone: !after.students.some(s => s.id === ids.studentId), personalEventsGone: !after.settings.some(r => r.settingType === "family-engagement-v1" && r.studentId === ids.studentId), sharedAvailabilityKept: after.settings.some(r => r.id === ids.family.availability.id), centerKept: !!centers.learningCenterState(after, ids.centerId), routineKept: after.settings.some(r => r.id === ids.routineId), stockExact: core.canonicalJson(numbers(before)) === core.canonicalJson(numbers(after)), otherChildKept: after.students.some(s => s.id === ids.otherId), noChildReference: !core.canonicalJson(after).includes(ids.studentId) };
    store.close(); return output;
  }); expect(Object.values(result)).toEqual(Array(8).fill(true));
});
test("MR103–108 eski şema etiketi, fazladan alan ve yetim yeni kaynak hedef kasayı değiştiremez", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts"), { seedEnrichmentWorkflows } = await import("/tests/fixtures/enrichment-browser.ts");
    const source = new core.IndexedDbDataStore({ databaseName: `enrichment-invalid-source-${crypto.randomUUID()}` }), target = new core.IndexedDbDataStore({ databaseName: `enrichment-invalid-target-${crypto.randomUUID()}` });
    await seedEnrichmentWorkflows(source); const backup = await new core.BackupService(source, { appVersion: "0.28.0" }).exportBackup(), restore = new core.BackupService(target, { appVersion: "0.28.0" }), before = core.canonicalJson(await target.readSnapshot());
    const types = ["family-engagement-v1", "learning-centers-v1", "school-document-template-v1", "daily-routine-cards-v1"], v10 = [...types, "growth-measurement-v1", "consent-trip-v1", "classroom-admin-v1"], cases = [...types.map(t => `v9:${t}`), ...types.map(t => `field:${t}`), "family-source", "center-source", "routine-chain"], rejected: string[] = [];
    for (const kind of cases) { const candidate = structuredClone(backup), rows = candidate.payload.settings;
      if (kind.startsWith("v9:")) { candidate.manifest.dataSchemaVersion = 9; candidate.payload.settings = rows.filter(r => !v10.includes(r.settingType) || r.settingType === kind.slice(3)); }
      if (kind.startsWith("field:")) rows.find(r => r.settingType === kind.slice(6)).unexpectedPrivateField = "Kurgu";
      if (kind === "family-source") rows.find(r => r.settingType === types[0] && r.workflow.kind === "appointment").workflow.availabilityId = crypto.randomUUID();
      if (kind === "center-source") rows.find(r => r.settingType === types[1] && r.workflow.kind === "center-plan").workflow.centers[0].allocations[0].loanId = crypto.randomUUID();
      if (kind === "routine-chain") rows.find(r => r.settingType === "daily-routine-cards-v1").workflow.previousEventId = crypto.randomUUID();
      candidate.manifest.entityCounts = Object.fromEntries(core.COLLECTION_NAMES.map(c => [c, candidate.payload[c].length])); candidate.manifest.payloadChecksum = await core.sha256Hex(core.canonicalJson(candidate.payload));
      try { await restore.restoreBackup(candidate, { mode: "replace", createRecoverySnapshot: false }); } catch { rejected.push(kind); }
    }
    const unchanged = before === core.canonicalJson(await target.readSnapshot()); source.close(); target.close(); return { cases, rejected, unchanged };
  }); expect(result.rejected).toEqual(result.cases); expect(result.unchanged).toBe(true);
});
