import { expect, test } from "@playwright/test";
import {
  LAST_SUCCESSFUL_ENCRYPTED_BACKUP_STORAGE_KEY,
  backupReminderState,
  inspectStorageHealth,
  readLastSuccessfulEncryptedBackup,
  recordSuccessfulEncryptedBackup,
  storagePressureLevel,
} from "../src/core/storage";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test("depolama kullanımı normal, uyarı ve kritik eşiklere ayrılır", () => {
  expect(storagePressureLevel(799, 1_000)).toEqual({
    level: "normal",
    usagePercent: 79.9,
  });
  expect(storagePressureLevel(800, 1_000)).toEqual({
    level: "warning",
    usagePercent: 80,
  });
  expect(storagePressureLevel(900, 1_000)).toEqual({
    level: "critical",
    usagePercent: 90,
  });
  expect(storagePressureLevel(undefined, 1_000)).toEqual({
    level: "unknown",
    usagePercent: null,
  });
});

test("StorageManager kalıcılık ve kota durumunu birlikte döndürür", async () => {
  const result = await inspectStorageHealth({
    storageManager: {
      persist: async () => true,
      estimate: async () => ({ usage: 850, quota: 1_000 }),
    },
  });

  expect(result.persistence).toEqual({
    kind: "granted",
    supported: true,
    message: "Cihaz, MaarifOS verilerini kalıcı depolama kapsamında koruyor.",
  });
  expect(result.estimate).toEqual({
    kind: "available",
    supported: true,
    usageBytes: 850,
    quotaBytes: 1_000,
    usagePercent: 85,
    level: "warning",
    message: "Yerel depolama alanının %85'i kullanılıyor.",
  });
});

test("kalıcılık reddedilse de kota sonucu korunur", async () => {
  const result = await inspectStorageHealth({
    storageManager: {
      persist: async () => false,
      estimate: async () => ({ usage: 100, quota: 1_000 }),
    },
  });

  expect(result.persistence.kind).toBe("denied");
  expect(result.estimate).toMatchObject({
    kind: "available",
    level: "normal",
    usagePercent: 10,
  });
});

test("desteklenmeyen tarayıcı güvenli ve anlaşılır sonuç verir", async () => {
  const result = await inspectStorageHealth({ storageManager: null });

  expect(result.persistence).toMatchObject({
    kind: "unsupported",
    supported: false,
  });
  expect(result.estimate).toMatchObject({
    kind: "unsupported",
    supported: false,
    level: "unknown",
    usagePercent: null,
  });
});

test("StorageManager çağrılarından biri hata verince diğeri yine tamamlanır", async () => {
  const result = await inspectStorageHealth({
    storageManager: {
      persist: async () => {
        throw new DOMException("kurgu engel", "SecurityError");
      },
      estimate: async () => ({ usage: 950, quota: 1_000 }),
    },
  });

  expect(result.persistence).toMatchObject({
    kind: "error",
    supported: true,
  });
  expect(result.estimate).toMatchObject({
    kind: "available",
    level: "critical",
    usagePercent: 95,
  });
});

test("bozuk veya eksik kota değerleri yüzde hesabına sokulmaz", async () => {
  const result = await inspectStorageHealth({
    storageManager: {
      persist: async () => true,
      estimate: async () => ({ usage: Number.NaN, quota: 0 }),
    },
  });

  expect(result.estimate).toMatchObject({
    kind: "available",
    level: "unknown",
    usageBytes: null,
    quotaBytes: null,
    usagePercent: null,
  });
});

test("son başarılı şifreli yedek zamanı sürümlü UTC kaydıyla saklanır", () => {
  const storage = new MemoryStorage();
  const completedAt = new Date("2026-08-01T07:30:00.000Z");

  expect(recordSuccessfulEncryptedBackup(storage, completedAt)).toBe(true);
  expect(readLastSuccessfulEncryptedBackup(storage)).toEqual({
    kind: "available",
    lastSuccessfulAt: completedAt.toISOString(),
  });
  expect(storage.values.has(LAST_SUCCESSFUL_ENCRYPTED_BACKUP_STORAGE_KEY)).toBe(
    true,
  );
});

test("yedek zamanı deposu engelli veya bozuksa istisna sızdırmaz", () => {
  const blockedStorage = {
    getItem: () => {
      throw new DOMException("kurgu engel", "SecurityError");
    },
    setItem: () => {
      throw new DOMException("kurgu engel", "QuotaExceededError");
    },
  };

  expect(
    recordSuccessfulEncryptedBackup(
      blockedStorage,
      new Date("2026-08-01T07:30:00.000Z"),
    ),
  ).toBe(false);
  expect(readLastSuccessfulEncryptedBackup(blockedStorage)).toEqual({
    kind: "unavailable",
    lastSuccessfulAt: null,
  });

  const corruptStorage = new MemoryStorage();
  corruptStorage.setItem(LAST_SUCCESSFUL_ENCRYPTED_BACKUP_STORAGE_KEY, "bozuk");
  expect(readLastSuccessfulEncryptedBackup(corruptStorage)).toEqual({
    kind: "invalid",
    lastSuccessfulAt: null,
  });
});

test("yedek hatırlatıcısı 7. günde uyarır, 14. günde gecikmiş sayar", () => {
  const now = new Date("2026-08-15T08:00:00.000Z");

  expect(
    backupReminderState("2026-08-09T08:00:00.001Z", now),
  ).toMatchObject({ kind: "current", shouldRemind: false });
  expect(
    backupReminderState("2026-08-08T08:00:00.000Z", now),
  ).toMatchObject({ kind: "reminder", shouldRemind: true, ageDays: 7 });
  expect(
    backupReminderState("2026-08-01T08:00:00.000Z", now),
  ).toMatchObject({ kind: "overdue", shouldRemind: true, ageDays: 14 });
  expect(backupReminderState(null, now)).toMatchObject({
    kind: "never",
    shouldRemind: true,
    ageDays: null,
  });
});

test("geçersiz veya gelecekteki yedek zamanı güvenli uyarı üretir", () => {
  const now = new Date("2026-08-15T08:00:00.000Z");

  expect(backupReminderState("geçersiz", now)).toMatchObject({
    kind: "unknown",
    shouldRemind: true,
  });
  expect(
    backupReminderState("2026-08-16T08:00:00.000Z", now),
  ).toMatchObject({ kind: "unknown", shouldRemind: true });
});
