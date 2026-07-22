import { expect, test } from "@playwright/test";
import { canonicalJson } from "../../src/core/backup/canonical-json";

test("kanonik JSON anahtar sırasından bağımsızdır", () => {
  expect(canonicalJson({ z: 1, a: { y: 2, b: 3 } })).toBe(
    canonicalJson({ a: { b: 3, y: 2 }, z: 1 }),
  );
  expect(() => canonicalJson({ invalid: Number.NaN })).toThrow(
    "sonlu olmayan sayı",
  );
});

test("sürümlü yedek üretir ve değiştirilmiş içeriği reddeder", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const databaseName = `maarifos-test-backup-${crypto.randomUUID()}`;
    const store = new core.IndexedDbDataStore({ databaseName });
    const record = {
      id: "00000000-0000-4000-8000-000000000001",
      createdAt: "2026-07-22T06:00:00.000Z",
      updatedAt: "2026-07-22T06:00:00.000Z",
      civilDate: "2026-07-22",
      schemaVersion: 1,
      displayName: "Test Kaydı A",
    };
    await store.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [record]),
    );
    const service = new core.BackupService(store, {
      appVersion: "0.1.0-test",
      clock: () => new Date("2026-07-22T09:30:00.000Z"),
      civilDateProvider: () => "2026-07-22",
    });
    const backup = await service.exportBackup();
    const verified = await service.parseAndVerifyBackup(service.serializeBackup(backup));
    const corrupted = structuredClone(backup);
    corrupted.payload.students[0].displayName = "Değiştirilmiş Kayıt";
    let corruptionError = "";
    try {
      await service.parseAndVerifyBackup(corrupted);
    } catch (error) {
      corruptionError = error instanceof Error ? error.message : String(error);
    }
    store.close();
    return {
      manifest: verified.manifest,
      studentCount: verified.payload.students.length,
      corruptionError,
    };
  });

  expect(result.manifest.format).toBe("maarifos-json");
  expect(result.manifest.backupVersion).toBe(1);
  expect(result.manifest.dataSchemaVersion).toBe(1);
  expect(result.manifest.createdAt).toBe("2026-07-22T09:30:00.000Z");
  expect(result.manifest.civilDate).toBe("2026-07-22");
  expect(result.manifest.payloadChecksum).toMatch(/^[0-9a-f]{64}$/);
  expect(result.manifest.entityCounts.students).toBe(1);
  expect(result.studentCount).toBe(1);
  expect(result.corruptionError).toContain("bütünlük kontrolünü geçemedi");
});

test("geçersiz kaynak kaydı dışa aktarmaz; bozuk sayaç restore öncesi reddedilir", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-count-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-count-target-${crypto.randomUUID()}`,
    });
    const invalidSource = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-invalid-source-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-07-22T06:00:00.000Z",
      updatedAt: "2026-07-22T06:00:00.000Z",
      civilDate: "2026-07-22",
      schemaVersion: 1,
    };
    const sourceRecord = {
      ...base,
      id: "00000000-0000-4000-8000-000000000031",
      displayName: "Yedek Test Kaydı",
    };
    const targetRecord = {
      ...base,
      id: "00000000-0000-4000-8000-000000000032",
      displayName: "Korunacak Test Kaydı",
    };
    await source.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [sourceRecord]),
    );
    await target.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [targetRecord]),
    );
    await invalidSource.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [{ ...sourceRecord, id: "s-01" }]),
    );

    const backup = await new core.BackupService(source, {
      appVersion: "test",
    }).exportBackup();
    const tampered = structuredClone(backup);
    tampered.manifest.entityCounts.students = 2;
    const targetService = new core.BackupService(target, { appVersion: "test" });
    const before = await target.readSnapshot();
    let restoreError = "";
    try {
      await targetService.restoreBackup(tampered, { mode: "replace" });
    } catch (error) {
      restoreError = error instanceof Error ? error.message : String(error);
    }
    const after = await target.readSnapshot();

    let exportError = "";
    try {
      await new core.BackupService(invalidSource, {
        appVersion: "test",
      }).exportBackup();
    } catch (error) {
      exportError = error instanceof Error ? error.message : String(error);
    }
    source.close();
    target.close();
    invalidSource.close();
    return { before, after, restoreError, exportError };
  });

  expect(result.restoreError).toContain("kayıt sayısı manifest ile uyuşmuyor");
  expect(result.after).toEqual(result.before);
  expect(result.exportError).toContain("geçersiz UUID");
});

test("merge aynı kaydı atlar, farklı içeriği çakışma olarak raporlar", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-merge-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-merge-target-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-07-22T06:00:00.000Z",
      updatedAt: "2026-07-22T06:00:00.000Z",
      civilDate: "2026-07-22",
      schemaVersion: 1,
    };
    const same = {
      ...base,
      id: "00000000-0000-4000-8000-000000000011",
      displayName: "Test Kaydı Aynı",
    };
    const conflictSource = {
      ...base,
      id: "00000000-0000-4000-8000-000000000012",
      displayName: "Yedekteki Test Kaydı",
    };
    const inserted = {
      ...base,
      id: "00000000-0000-4000-8000-000000000013",
      displayName: "Yeni Test Kaydı",
    };
    await source.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [same, conflictSource, inserted]),
    );
    await target.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [
        same,
        { ...conflictSource, displayName: "Cihazdaki Test Kaydı" },
      ]),
    );
    const sourceService = new core.BackupService(source, { appVersion: "test" });
    const targetService = new core.BackupService(target, { appVersion: "test" });
    const backup = await sourceService.exportBackup();
    const report = await targetService.restoreBackup(backup, {
      mode: "merge",
    });
    const secondReport = await targetService.restoreBackup(backup, {
      mode: "merge",
    });
    const records = (await target.readSnapshot()).students;
    source.close();
    target.close();
    return { report, secondReport, records };
  });

  expect(result.report.inserted).toBe(1);
  expect(result.report.skipped).toBe(1);
  expect(result.report.conflicts).toEqual([
    {
      collection: "students",
      id: "00000000-0000-4000-8000-000000000012",
      reason: "same-id-different-data",
    },
  ]);
  expect(result.secondReport.inserted).toBe(0);
  expect(result.secondReport.skipped).toBe(2);
  expect(result.secondReport.conflicts).toEqual(result.report.conflicts);
  expect(result.records).toHaveLength(3);
  expect(
    result.records.find(
      (record) => record.id === "00000000-0000-4000-8000-000000000012",
    )?.displayName,
  ).toBe("Cihazdaki Test Kaydı");
});

test("replace koleksiyonları değiştirir ve IndexedDB hatasında işlemi geri alır", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-replace-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-replace-target-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-07-22T06:00:00.000Z",
      updatedAt: "2026-07-22T06:00:00.000Z",
      civilDate: "2026-07-22",
      schemaVersion: 1,
    };
    const original = {
      ...base,
      id: "00000000-0000-4000-8000-000000000021",
      displayName: "Eski Test Kaydı",
    };
    const restored = {
      ...base,
      id: "00000000-0000-4000-8000-000000000022",
      displayName: "Yedekten Gelen Test Kaydı",
    };
    await source.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [restored]),
    );
    await target.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [original]),
    );
    const backup = await new core.BackupService(source, {
      appVersion: "test",
    }).exportBackup();
    const report = await new core.BackupService(target, {
      appVersion: "test",
    }).restoreBackup(backup, { mode: "replace" });
    const afterReplace = (await target.readSnapshot()).students;

    let rollbackError = "";
    try {
      await target.transaction("readwrite", ["students"], async (transaction) => {
        await transaction.clear("students");
        await transaction.putMany("students", [
          {
            ...base,
            displayName: "Kimliksiz Geçersiz Test Kaydı",
          },
        ]);
      });
    } catch (error) {
      rollbackError = error instanceof Error ? error.name : String(error);
    }
    const afterRollback = (await target.readSnapshot()).students;
    source.close();
    target.close();
    return { report, afterReplace, afterRollback, rollbackError };
  });

  expect(result.report.replaced).toBe(1);
  expect(result.report.inserted).toBe(1);
  expect(result.afterReplace.map((record) => record.displayName)).toEqual([
    "Yedekten Gelen Test Kaydı",
  ]);
  expect(result.rollbackError).not.toBe("");
  expect(result.afterRollback).toEqual(result.afterReplace);
});
