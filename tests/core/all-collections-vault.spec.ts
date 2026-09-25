import { expect, test } from "@playwright/test";

test("20 koleksiyonun tamamı ve kurtarma içeriği şifreli; sorgular, restart ve concurrent write kayıpsız", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const vaultModule = await import("/src/core/security/student-sensitive-vault.ts");
    const name = `all-vault-${crypto.randomUUID()}`;
    const studentId = crypto.randomUUID(), classroomId = crypto.randomUUID();
    const base = { createdAt: "2026-09-07T06:00:00.000Z", updatedAt: "2026-09-07T06:00:00.000Z", civilDate: "2026-09-07", schemaVersion: 1 };
    const snapshot = core.createEmptySnapshot();
    for (const collection of core.COLLECTION_NAMES) snapshot[collection] = [{ ...base, id: crypto.randomUUID(), privateMarker: `KURGU-GİZLİ-${collection}`, classroomId, studentId, studentIds: [studentId] }];
    const store = new core.IndexedDbDataStore({ databaseName: name });
    await store.transaction("readwrite", core.COLLECTION_NAMES, async tx => { for (const collection of core.COLLECTION_NAMES) await tx.putMany(collection, snapshot[collection]); });
    const raw = await Promise.all(core.COLLECTION_NAMES.map(collection => fx.readAll<Record<string, unknown>>(name, collection)));
    const exact = core.canonicalJson(await store.readSnapshot()) === core.canonicalJson(snapshot);
    const queryCounts = [(await store.listAttendanceByClassroomDate(classroomId, base.civilDate)).length,
      (await store.listAttendanceByStudentDate(studentId, base.civilDate)).length,
      (await store.listObservationsByClassroomDate(classroomId, base.civilDate)).length,
      (await store.listObservationsByStudent(studentId)).length, (await store.listMediaByStudent(studentId)).length];
    const vault = new vaultModule.StudentSensitiveVault({ databaseName: name });
    const recovery = { id: crypto.randomUUID(), createdAt: base.createdAt, reason: "manual", checksumAlgorithm: "SHA-256", snapshotChecksum: "a".repeat(64), envelope: { manifest: {}, payload: snapshot } };
    const sealedRecovery = await vault.sealRecoverySnapshot(recovery);
    const openedRecovery = await vault.openRecoverySnapshot(sealedRecovery);
    const recoveryExact = core.canonicalJson(openedRecovery) === core.canonicalJson(recovery);
    const rawRecoveryHasSecret = JSON.stringify(sealedRecovery).includes("KURGU-GİZLİ");
    vault.close(); store.close();
    const second = new core.IndexedDbDataStore({ databaseName: name });
    const peer = new core.IndexedDbDataStore({ databaseName: name });
    const restartedExact = core.canonicalJson(await second.readSnapshot()) === core.canonicalJson(snapshot);
    await Promise.all([second, peer].map((s, index) => s.transaction("readwrite", ["settings"], async tx => {
      const records = await tx.getAll("settings");
      await new Promise(resolve => setTimeout(resolve, 15));
      await tx.putMany("settings", [{ ...base, id: crypto.randomUUID(), privateMarker: `KURGU-EŞZAMANLI-${index}`, previousCount: records.length }]);
    })));
    const concurrentCount = (await second.readSnapshot()).settings.length;
    second.close(); peer.close();
    return { collectionCount: raw.length, allSealed: raw.flat().every(record => Object.keys(record).sort().join(",") === "__maarifosLocalVault,id"),
      rawHasSecret: JSON.stringify(raw).includes("KURGU-GİZLİ"), exact, queryCounts, recoveryExact, rawRecoveryHasSecret, restartedExact, concurrentCount };
  });
  expect(result).toEqual({ collectionCount: 20, allSealed: true, rawHasSecret: false, exact: true, queryCounts: [1,1,1,1,1], recoveryExact: true, rawRecoveryHasSecret: false, restartedExact: true, concurrentCount: 3 });
});

test("tam kasa migration kesinti öncesi kaynağı korur; commit sonrası restart onarır; eski sekme sürümü reddedilir", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const output = [];
    for (const checkpoint of ["all-vault:prepared", "all-vault:committed"]) {
      const name = `all-migrate-${crypto.randomUUID()}`;
      const record = { id: crypto.randomUUID(), schemaVersion: 1, createdAt: "2026-09-07T06:00:00.000Z", updatedAt: "2026-09-07T06:00:00.000Z", civilDate: "2026-09-07", privateMarker: "KURGU-ÖĞRETMEN-NOTU" };
      await fx.createLegacyMainDatabase(name, []);
      await fx.putOne(name, "observations", record);
      const interrupted = new core.IndexedDbDataStore({ databaseName: name, sensitiveVault: { onMigrationCheckpoint: point => { if (point === checkpoint) throw new Error("KURGU kesinti"); } } });
      let crashed = false;
      try { await interrupted.readSnapshot(); } catch { crashed = true; }
      interrupted.close();
      const rawBefore = await fx.readAll<Record<string, unknown>>(name, "observations");
      const resumed = new core.IndexedDbDataStore({ databaseName: name });
      const exact = core.canonicalJson((await resumed.readSnapshot()).observations[0]) === core.canonicalJson(record);
      const rawAfter = await fx.readAll<Record<string, unknown>>(name, "observations");
      resumed.close();
      const oldVersionRejected = await new Promise<boolean>(resolve => { const request = indexedDB.open(name, 7); request.onerror = () => resolve(request.error?.name === "VersionError"); request.onsuccess = () => { request.result.close(); resolve(false); }; });
      output.push({ crashed, beforePlain: JSON.stringify(rawBefore).includes("KURGU-ÖĞRETMEN-NOTU"), afterPlain: JSON.stringify(rawAfter).includes("KURGU-ÖĞRETMEN-NOTU"), exact, oldVersionRejected });
    }
    return output;
  });
  expect(result).toEqual([{ crashed: true, beforePlain: true, afterPlain: false, exact: true, oldVersionRejected: true }, { crashed: true, beforePlain: false, afterPlain: false, exact: true, oldVersionRejected: true }]);
});

test("diğer koleksiyonlarda swap, plaintext downgrade, eksik marker ve anahtar kaybı fail-closed", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const vault = await import("/src/core/security/student-sensitive-vault.ts");
    const dbModule = await import("/src/core/repository/indexed-db.ts");
    const outcomes = [];
    for (const mutation of ["swap", "plaintext", "marker", "key"]) {
      const name = `all-negative-${crypto.randomUUID()}`;
      const record = { id: crypto.randomUUID(), schemaVersion: 1, createdAt: "2026-09-07T06:00:00.000Z", updatedAt: "2026-09-07T06:00:00.000Z", civilDate: "2026-09-07", privateMarker: "KURGU-HASSAS" };
      const source = new core.IndexedDbDataStore({ databaseName: name });
      await source.transaction("readwrite", ["settings", "observations"], async tx => { await tx.putMany("settings", [record]); await tx.putMany("observations", [record]); });
      source.close();
      if (mutation === "swap") await fx.putOne(name, "observations", (await fx.readAll(name, "settings"))[0]);
      if (mutation === "plaintext") await fx.putOne(name, "settings", record);
      if (mutation === "marker") await fx.deleteOne(name, core.STUDENT_VAULT_STATE_STORE_NAME, dbModule.ALL_COLLECTIONS_VAULT_READY_STATE_ID);
      if (mutation === "key") await fx.deleteDatabase(vault.studentSensitiveKeyDatabaseName(name));
      const restarted = new core.IndexedDbDataStore({ databaseName: name });
      let rejected = false;
      try { await restarted.readSnapshot(); } catch { rejected = true; }
      restarted.close(); outcomes.push(rejected);
    }
    return outcomes;
  });
  expect(result).toEqual([true,true,true,true]);
});

test("öğrenci dışı yazma hatası atomiktir; fiziksel recovery notu şifrelidir ve kilitsiz ortam yazmaz", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const name = `all-atomic-${crypto.randomUUID()}`;
    const record = { id: crypto.randomUUID(), schemaVersion: 1, createdAt: "2026-09-07T06:00:00.000Z", updatedAt: "2026-09-07T06:00:00.000Z", civilDate: "2026-09-07", action: "kurgu-test", entityType: "test", entityId: crypto.randomUUID(), metadata: { note: "KURGU-ÖZEL-ÖĞRETMEN-NOTU" } };
    const source = new core.IndexedDbDataStore({ databaseName: name });
    await source.transaction("readwrite", ["auditLogs"], tx => tx.putMany("auditLogs", [record]));
    const service = new core.BackupService(source, { appVersion: "all-recovery-test" });
    const recovery = await service.createRecoverySnapshot("manual");
    const rawRecovery = await fx.readAll<Record<string, unknown>>(name, core.RECOVERY_SNAPSHOT_STORE_NAME);
    const recovered = await source.getRecoverySnapshot(recovery.id);
    const recoveryExact = core.canonicalJson(recovered?.envelope.payload.auditLogs[0]) === core.canonicalJson(record);
    source.close();
    const subtle = new Proxy(crypto.subtle, { get(target, property) {
      if (property === "encrypt") return async () => { throw new DOMException("Kurgu hata", "OperationError"); };
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const failing = new core.IndexedDbDataStore({ databaseName: name, sensitiveVault: { crypto: { subtle,
      getRandomValues: crypto.getRandomValues.bind(crypto), randomUUID: crypto.randomUUID.bind(crypto) } as Crypto } });
    let atomicRejected = false;
    try { await failing.transaction("readwrite", ["auditLogs", "observations"], async tx => {
      await tx.putMany("auditLogs", [{ ...record, metadata: { note: "Yazılmamalı" } }]);
      await tx.putMany("observations", [{ ...record, id: crypto.randomUUID() }]);
    }); } catch { atomicRejected = true; }
    failing.close();
    const check = new core.IndexedDbDataStore({ databaseName: name });
    const after = await check.readSnapshot(); check.close();
    const locks = navigator.locks;
    let lockCode = "";
    try {
      Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
      const unsupported = new core.IndexedDbDataStore({ databaseName: `no-lock-${crypto.randomUUID()}` });
      try { await unsupported.readSnapshot(); } catch (error) { lockCode = String((error as { code?: string }).code); }
      unsupported.close();
    } finally { Object.defineProperty(navigator, "locks", { configurable: true, value: locks }); }
    return { recoveryExact, recoveryPrivate: !JSON.stringify(rawRecovery).includes("KURGU-ÖZEL"), atomicRejected,
      existingPreserved: core.canonicalJson(after.auditLogs[0]) === core.canonicalJson(record), observationCount: after.observations.length, lockCode };
  });
  expect(result).toEqual({ recoveryExact: true, recoveryPrivate: true, atomicRejected: true, existingPreserved: true, observationCount: 0, lockCode: "LOCAL_VAULT_LOCK_UNAVAILABLE" });
});
