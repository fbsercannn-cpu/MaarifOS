import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("parçalı AES-GCM UTF-8 sınırını korur; eksik, ek, tekrarlı, sırası değişmiş parça ve parola hatası reddedilir", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const encryption = await import("/src/core/backup/encrypted-backup.ts");
    const limits = await import("/src/core/backup/backup-capacity.ts");
    const options = { appVersion: "security-test", createdAt: "2026-09-07T06:00:00.000Z" };
    const password = "Kurgu-parcali-yedek-2026!";
    const text = "a".repeat(limits.BACKUP_CHUNK_BYTES - 1) + "ğ" + "Çocuk🙂".repeat(450_000);
    const encrypted = await encryption.encryptBackupText(text, options, password);
    const opened = await encryption.decryptBackupText(encryption.serializeEncryptedBackup(encrypted), password);
    const rejected = [];
    for (const kind of ["missing", "extra", "duplicate", "order", "hash", "version", "password"]) {
      const candidate = structuredClone(encrypted);
      if (kind === "missing") candidate.chunks!.pop();
      if (kind === "extra") candidate.chunks!.push(candidate.chunks![0]);
      if (kind === "duplicate") candidate.chunks![1] = candidate.chunks![0];
      if (kind === "order") [candidate.chunks![0], candidate.chunks![1]] = [candidate.chunks![1], candidate.chunks![0]];
      if (kind === "hash") candidate.encryption.plaintextSha256 = "0".repeat(64);
      if (kind === "version") candidate.encryption.version = 1;
      try { await encryption.decryptBackupText(candidate, kind === "password" ? "Kurgu-yanlis-parola" : password); }
      catch { rejected.push(kind); }
    }
    const legacy = await encryption.encryptBackupText("Küçük eski biçim", options, password);
    const boundary = "ğ".repeat(limits.MAX_BACKUP_PLAINTEXT_BYTES / 2);
    const exactLimit = limits.assertBackupCapacity(boundary) === limits.MAX_BACKUP_PLAINTEXT_BYTES;
    let overLimit = false, objectLimit = false;
    try { limits.assertBackupCapacity(boundary + "x"); } catch { overLimit = true; }
    try { encryption.parseEncryptedBackupEnvelope({ encryption: {}, ciphertext: "x".repeat(limits.MAX_ENCRYPTED_BACKUP_BYTES + 1) }); } catch { objectLimit = true; }
    return { version: encrypted.encryption.version, chunkCount: encrypted.chunks?.length, exact: opened === text, rejected,
      legacyVersion: legacy.encryption.version, legacyExact: await encryption.decryptBackupText(legacy, password) === "Küçük eski biçim", exactLimit, overLimit, objectLimit };
  });
  expect(result.version).toBe(2);
  expect(result.chunkCount).toBeGreaterThan(3);
  expect(result.exact).toBe(true);
  expect(result.rejected).toEqual(["missing", "extra", "duplicate", "order", "hash", "version", "password"]);
  expect([result.legacyVersion, result.legacyExact, result.exactLimit, result.overLimit, result.objectLimit]).toEqual([1,true,true,true,true]);
});

test("60 sınır fotoğraflı çocuk eski 20MiB sınırını aşar; gerçek başka IndexedDB restore, count/hash ve gizlilik tamdır", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const capacity = await import("/src/core/backup/backup-capacity.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const sourceName = `large-vault-${crypto.randomUUID()}`, targetName = `large-target-${crypto.randomUUID()}`;
    const source = new core.IndexedDbDataStore({ databaseName: sourceName });
    const photo = "data:image/jpeg;base64," + "A".repeat(399_972);
    const students = Array.from({ length: 60 }, (_, index) => ({ id: crypto.randomUUID(),
      createdAt: "2026-09-07T06:00:00.000Z", updatedAt: "2026-09-07T06:00:00.000Z", civilDate: "2026-09-07", schemaVersion: 4,
      displayName: `Kurgu Foto Çocuğu ${index}`, profileSchemaVersion: 4, profilePhotoDataUrl: photo,
      contacts: [{ id: crypto.randomUUID(), kind: "mother", relationship: "Anne", phone: "+905550000000", isPrimary: true }] }));
    await source.transaction("readwrite", ["students"], tx => tx.putMany("students", students));
    const service = new core.BackupService(source, { appVersion: "large-photo-test" });
    const password = "Kurgu-buyuk-yedek-2026!";
    const summary = await service.recoverySummary();
    const encrypted = await service.exportEncryptedBackup(password);
    const serialized = service.serializeEncryptedBackup(encrypted);
    const drill = await service.verifyEncryptedRecovery(serialized, password);
    capacity.assertBackupRecoveryMatch(summary, drill);
    const target = new core.IndexedDbDataStore({ databaseName: targetName });
    const restore = new core.BackupService(target, { appVersion: "large-photo-test" });
    await restore.restoreEncryptedBackup(serialized, password, { mode: "replace", createRecoverySnapshot: false });
    const restored = await restore.recoverySummary();
    capacity.assertBackupRecoveryMatch(summary, restored);
    const recoveredPhotoCount = (await target.readSnapshot()).students.filter(record => record.profilePhotoDataUrl === photo).length;
    const raw = await fx.readAll<Record<string, unknown>>(targetName, "students");
    source.close(); target.close();
    return { version: encrypted.encryption.version, chunks: encrypted.chunks?.length, plaintextBytes: summary.plaintextBytes,
      encryptedBytes: new Blob([serialized]).size, recordCount: restored.recordCount, photoCount: restored.photoCount,
      collectionCount: restored.collections.length, recoveredPhotoCount,
      countsAndHashesMatch: core.canonicalJson(summary.collections) === core.canonicalJson(restored.collections),
      noPlaintext: !JSON.stringify(raw).includes("Kurgu Foto Çocuğu") && !serialized.includes("data:image/jpeg"),
      rawRecordsSealed: raw.every(record => Object.keys(record).sort().join(",") === "__maarifosLocalVault,id") };
  });
  expect(result.plaintextBytes).toBeGreaterThan(20 * 1024 * 1024);
  expect(result.encryptedBytes).toBeLessThan(96 * 1024 * 1024);
  expect(result.version).toBe(2);
  expect(result.chunks).toBeGreaterThan(20);
  expect([result.recordCount, result.photoCount, result.collectionCount, result.recoveredPhotoCount]).toEqual([60,60,20,60]);
  expect([result.countsAndHashesMatch, result.noPlaintext, result.rawRecordsSealed]).toEqual([true,true,true]);
  const directory = new URL("../../output/completion-2026-09-07/security/", import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("large-photo-roundtrip.json", directory), JSON.stringify(result, null, 2));
});

test("eski v1 biçiminin 16 MiB üstündeki geçerli ciphertext'i açılır; 32 MiB sınırı ve güvenlik alanı sınırları korunur", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const encryption = await import("/src/core/backup/encrypted-backup.ts");
    const helpers = await import("/src/core/backup/crypto.ts");
    const { canonicalJson } = await import("/src/core/backup/canonical-json.ts");
    const password = "Kurgu-eski-buyuk-yedek!";
    const small = await encryption.encryptBackupText("Eski biçim", { appVersion: "legacy-v1-test", createdAt: "2026-09-07T06:00:00.000Z" }, password);
    const header = { ...small.encryption, salt: helpers.bytesToBase64(helpers.randomBytes(16)), iv: helpers.bytesToBase64(helpers.randomBytes(12)) };
    const plaintext = "ğ".repeat(7 * 1024 * 1024);
    const key = await helpers.deriveAesGcmKey(password, helpers.base64ToBytes(header.salt, 16), header.iterations);
    const bytes = helpers.utf8Bytes(plaintext);
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: helpers.base64ToBytes(header.iv, 12), additionalData: helpers.utf8Bytes(canonicalJson(header)), tagLength: 128 }, key, bytes);
    bytes.fill(0);
    const legacy = { encryption: header, ciphertext: helpers.bytesToBase64(new Uint8Array(cipher)) };
    const exact = await encryption.decryptBackupText(legacy, password) === plaintext;
    const rejected: string[] = [];
    for (const [name, work] of [
      ["legacy-limit", () => encryption.assertEncryptedBackupEnvelope({ ...legacy, ciphertext: "A".repeat(32 * 1024 * 1024 + 4) })],
      ["default-limit", () => helpers.base64ToBytes(legacy.ciphertext)],
      ["fixed-field-limit", () => helpers.base64ToBytes(legacy.ciphertext, 16)],
      ["caller-limit", () => helpers.base64ToBytes("AAAA", undefined, 32 * 1024 * 1024 + 4)],
    ] as const) { try { work(); } catch { rejected.push(name); } }
    return { characters: legacy.ciphertext.length, exact, rejected };
  });
  expect(result.characters).toBeGreaterThan(16 * 1024 * 1024);
  expect(result.exact).toBe(true);
  expect(result.rejected).toEqual(["legacy-limit", "default-limit", "fixed-field-limit", "caller-limit"]);
});
