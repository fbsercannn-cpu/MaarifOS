import { expect, test } from "@playwright/test";

test("doğrulanmış abort ve hazırlık hatası eski ana veriyi/recovery'yi erişilebilir tutar; tekrar silme replay'i reddeder", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.name));
  await page.goto("/tests/runtime-fixture.html");
  const results = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vaultModule = await import("/src/core/security/student-sensitive-vault.ts");
    const generation = await import("/src/core/security/local-vault-record-generation.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const results = [];
    for (const mode of ["sync-put", "native-abort", "recovery-clear", "preparation-failure"]) {
      const name = `abort-recovery-${mode}-${crypto.randomUUID()}`;
      let store = new core.IndexedDbDataStore({ databaseName: name });
      const childId = crypto.randomUUID(), otherId = crypto.randomUUID();
      const base = { schemaVersion: 1, createdAt: "2026-09-08T06:00:00.000Z", updatedAt: "2026-09-08T06:00:00.000Z", civilDate: "2026-09-08" };
      await store.transaction("readwrite", ["students"], tx => tx.putMany("students", [
        { ...base, id: childId, displayName: "Kurgu Silinecek" }, { ...base, id: otherId, displayName: "Kurgu Korunacak" },
      ]));
      const recovery = await new core.BackupService(store, { appVersion: "0.28.0" }).createRecoverySnapshot("manual");
      const before = core.canonicalJson(await store.readSnapshot());
      const oldRaw = (await fx.readAll(name, "students")).find(row => row.id === childId);
      const originalPut = IDBObjectStore.prototype.put, originalClear = IDBObjectStore.prototype.clear;
      const originalPrepare = vaultModule.StudentSensitiveVault.prototype.prepareCommittedRecoverySnapshotRetirements;
      const purge = () => store.transactionWithStudentRecoveryPurge(childId, async tx => {
        const remaining = (await tx.getAll("students")).filter(row => row.id !== childId);
        await tx.clear("students"); await tx.putMany("students", remaining);
      });
      let failed = false;
      try {
        IDBObjectStore.prototype.put = function(...args) {
          if (this.transaction.db.name === name && this.name === "students") {
            if (mode === "sync-put") throw new DOMException("Kurgu kota sınırı", "QuotaExceededError");
            if (mode === "native-abort") {
              const request = originalPut.apply(this, args), transaction = this.transaction;
              request.addEventListener("success", () => transaction.abort(), { once: true });
              return request;
            }
          }
          return originalPut.apply(this, args);
        };
        IDBObjectStore.prototype.clear = function(...args) {
          if (mode === "recovery-clear" && this.transaction.db.name === name && this.name === core.RECOVERY_SNAPSHOT_STORE_NAME) throw new DOMException("Kurgu kurtarma kotası", "QuotaExceededError");
          return originalClear.apply(this, args);
        };
        if (mode === "preparation-failure") vaultModule.StudentSensitiveVault.prototype.prepareCommittedRecoverySnapshotRetirements = async function() { throw new DOMException("Kurgu hazırlık kotası", "QuotaExceededError"); };
        await purge();
      } catch { failed = true; }
      finally {
        IDBObjectStore.prototype.put = originalPut;
        IDBObjectStore.prototype.clear = originalClear;
        vaultModule.StudentSensitiveVault.prototype.prepareCommittedRecoverySnapshotRetirements = originalPrepare;
      }
      const exact = before === core.canonicalJson(await store.readSnapshot());
      const recoveryExact = (await store.getRecoverySnapshot(recovery.id))?.snapshotChecksum === recovery.snapshotChecksum;
      const states = await fx.readAll(vaultModule.studentSensitiveKeyDatabaseName(name), generation.LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME);
      const oldStatesLive = states.filter(state => state.recordId === childId).every(state => state.pendingRetirementGeneration === null && !state.retired);
      store.close();
      store = new core.IndexedDbDataStore({ databaseName: name });
      const restartExact = before === core.canonicalJson(await store.readSnapshot()) && await store.getRecoverySnapshot(recovery.id) !== null;
      await purge();
      const retried = !(await store.readSnapshot()).students.some(row => row.id === childId) && await store.getRecoverySnapshot(recovery.id) === null;
      store.close();
      await fx.putOne(name, "students", oldRaw);
      const replayStore = new core.IndexedDbDataStore({ databaseName: name });
      let replayRejected = false;
      try { await replayStore.readSnapshot(); } catch (error) { replayRejected = error?.code === "LOCAL_VAULT_REPLAY_DETECTED"; }
      replayStore.close();
      results.push({ mode, failed, exact, recoveryExact, oldStatesLive, restartExact, retried, replayRejected });
    }
    return results;
  });
  expect(results).toEqual(["sync-put", "native-abort", "recovery-clear", "preparation-failure"].map(mode => ({ mode,
    failed: true, exact: true, recoveryExact: true, oldStatesLive: true, restartExact: true, retried: true, replayRejected: true })));
  expect(pageErrors).toEqual([]);
});

test("abort makbuzu sahte/eski makbuzla veya finalize edilmiş tombstone ile kullanılamaz; nesiller geri sarılmaz", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vaultModule = await import("/src/core/security/student-sensitive-vault.ts");
    const generation = await import("/src/core/security/local-vault-record-generation.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const cases = [];
    for (const mode of ["cancel", "stale", "tombstone", "prior-intent"]) {
      const name = `abort-receipt-${mode}-${crypto.randomUUID()}`;
      const store = new core.IndexedDbDataStore({ databaseName: name });
      const childId = crypto.randomUUID();
      await store.transaction("readwrite", ["students"], tx => tx.putMany("students", [fx.fictionalStudent(childId, "RECEIPT")]));
      const vault = new vaultModule.StudentSensitiveVault({ databaseName: name });
      const before = (await fx.readAll(vaultModule.studentSensitiveKeyDatabaseName(name), generation.LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME))[0];
      const original = await vault.prepareCollectionRetirements("students", []);
      let receipt = original;
      if (mode === "prior-intent") receipt = await vault.prepareCollectionRetirements("students", []);
      if (mode === "stale") await vault.sealCollectionRecord(fx.fictionalStudent(childId, "NEW"), "students");
      if (mode === "tombstone") await vault.acceptCollectionRecords("students", []);
      let cancelled = false;
      try { await vault.cancelAbortedRetirements([receipt]); cancelled = true; } catch { /* Expected stale or retired capability. */ }
      const after = (await fx.readAll(vaultModule.studentSensitiveKeyDatabaseName(name), generation.LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME))[0];
      let forgedRejected = false, reusedRejected = false;
      try { await vault.cancelAbortedRetirements([{ token: Symbol("forged") }]); } catch { forgedRejected = true; }
      if (mode === "cancel") try { await vault.cancelAbortedRetirements([receipt]); } catch { reusedRejected = true; }
      cases.push({ mode, cancelled, pending: after.pendingRetirementGeneration !== null, retired: after.retired,
        counterAdvanced: after.nextGeneration > before.nextGeneration, currentPreserved: after.currentGeneration === before.currentGeneration,
        forgedRejected, reusedRejected });
      vault.close(); store.close();
    }
    return cases;
  });
  expect(result).toEqual([
    { mode: "cancel", cancelled: true, pending: false, retired: false, counterAdvanced: true, currentPreserved: true, forgedRejected: true, reusedRejected: true },
    { mode: "stale", cancelled: false, pending: true, retired: false, counterAdvanced: true, currentPreserved: true, forgedRejected: true, reusedRejected: false },
    { mode: "tombstone", cancelled: false, pending: false, retired: true, counterAdvanced: true, currentPreserved: false, forgedRejected: true, reusedRejected: false },
    { mode: "prior-intent", cancelled: true, pending: true, retired: false, counterAdvanced: true, currentPreserved: true, forgedRejected: true, reusedRejected: false },
  ]);
});
