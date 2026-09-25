import { MAX_ENCRYPTED_BACKUP_BYTES } from "../backup/backup-capacity.ts";
export const LAST_SUCCESSFUL_ENCRYPTED_BACKUP_SCHEMA_VERSION = 1 as const;
export const LAST_SUCCESSFUL_ENCRYPTED_BACKUP_STORAGE_KEY =
  "maarifos.backup.last-successful-encrypted.v1";
export const BACKUP_HEALTH_RECEIPT_SCHEMA_VERSION = 2 as const;
export const BACKUP_HEALTH_RECEIPT_STORAGE_KEY =
  "maarifos.backup.health-receipt.v2";
export const BACKUP_REMINDER_DAYS = 7 as const;
export const BACKUP_OVERDUE_DAYS = 14 as const;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;
const MAX_BACKUP_METADATA_LENGTH = 512;
const MAX_BACKUP_HEALTH_RECEIPT_LENGTH = 2_048;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SAFE_FILE_NAME_PATTERN = /^[^\\/:*?"<>|\u0000-\u001f]{1,180}\.maarifos$/u;

export interface BackupMetadataStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface LastSuccessfulEncryptedBackupRecord {
  readonly schemaVersion: typeof LAST_SUCCESSFUL_ENCRYPTED_BACKUP_SCHEMA_VERSION;
  readonly lastSuccessfulAt: string;
}

export interface BackupHealthReceipt {
  readonly schemaVersion: typeof BACKUP_HEALTH_RECEIPT_SCHEMA_VERSION;
  readonly fileName: string;
  readonly encryptedChecksum: string;
  readonly encryptedByteLength: number;
  readonly payloadChecksum: string;
  readonly dataSchemaVersion: number;
  readonly appVersion: string;
  readonly createdAt: string;
  readonly verifiedAt: string;
  readonly lastRestoreDrillAt: string | null;
  readonly lastRestoreMode: "merge" | "replace" | null;
}

export interface BackupHealthReceiptInput {
  readonly fileName: string;
  readonly encryptedChecksum: string;
  readonly encryptedByteLength: number;
  readonly payloadChecksum: string;
  readonly dataSchemaVersion: number;
  readonly appVersion: string;
  readonly createdAt: string;
  readonly verifiedAt: string;
}

export type BackupRecoveryHealth =
  | {
      readonly kind: "drill-verified";
      readonly message: string;
      readonly lastRestoreDrillAt: string;
    }
  | {
      readonly kind: "drill-required" | "legacy-time-only" | "missing";
      readonly message: string;
      readonly lastRestoreDrillAt: null;
    };

export type LastSuccessfulEncryptedBackupState =
  | {
      readonly kind: "available";
      readonly lastSuccessfulAt: string;
    }
  | {
      readonly kind: "missing" | "invalid" | "unavailable";
      readonly lastSuccessfulAt: null;
    };

export type BackupReminderState =
  | {
      readonly kind: "current" | "reminder" | "overdue";
      readonly shouldRemind: boolean;
      readonly ageDays: number;
      readonly message: string;
    }
  | {
      readonly kind: "never" | "unknown";
      readonly shouldRemind: true;
      readonly ageDays: null;
      readonly message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalUtcIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString() === value ? value : null;
}

function isStoredRecord(
  value: unknown,
): value is LastSuccessfulEncryptedBackupRecord {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  return (
    keys.length === 2 &&
    keys[0] === "lastSuccessfulAt" &&
    keys[1] === "schemaVersion" &&
    value.schemaVersion === LAST_SUCCESSFUL_ENCRYPTED_BACKUP_SCHEMA_VERSION &&
    canonicalUtcIso(value.lastSuccessfulAt) !== null
  );
}

function isBackupHealthReceipt(value: unknown): value is BackupHealthReceipt {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  const expected = [
    "appVersion",
    "createdAt",
    "dataSchemaVersion",
    "encryptedByteLength",
    "encryptedChecksum",
    "fileName",
    "lastRestoreDrillAt",
    "lastRestoreMode",
    "payloadChecksum",
    "schemaVersion",
    "verifiedAt",
  ].sort();
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index]) &&
    value.schemaVersion === BACKUP_HEALTH_RECEIPT_SCHEMA_VERSION &&
    typeof value.fileName === "string" &&
    SAFE_FILE_NAME_PATTERN.test(value.fileName) &&
    typeof value.encryptedChecksum === "string" &&
    SHA256_PATTERN.test(value.encryptedChecksum) &&
    typeof value.encryptedByteLength === "number" &&
    Number.isInteger(value.encryptedByteLength) &&
    value.encryptedByteLength > 0 &&
    value.encryptedByteLength <= MAX_ENCRYPTED_BACKUP_BYTES &&
    typeof value.payloadChecksum === "string" &&
    SHA256_PATTERN.test(value.payloadChecksum) &&
    typeof value.dataSchemaVersion === "number" &&
    Number.isInteger(value.dataSchemaVersion) &&
    value.dataSchemaVersion > 0 &&
    value.dataSchemaVersion <= 10_000 &&
    typeof value.appVersion === "string" &&
    value.appVersion.length > 0 &&
    value.appVersion.length <= 120 &&
    canonicalUtcIso(value.createdAt) !== null &&
    canonicalUtcIso(value.verifiedAt) !== null &&
    (value.lastRestoreDrillAt === null ||
      canonicalUtcIso(value.lastRestoreDrillAt) !== null) &&
    (value.lastRestoreMode === null ||
      value.lastRestoreMode === "merge" ||
      value.lastRestoreMode === "replace") &&
    ((value.lastRestoreDrillAt === null && value.lastRestoreMode === null) ||
      (value.lastRestoreDrillAt !== null && value.lastRestoreMode !== null))
  );
}

export function recordEncryptedBackupHealth(
  storage: BackupMetadataStorage,
  input: BackupHealthReceiptInput,
): BackupHealthReceipt | null {
  const receipt: BackupHealthReceipt = {
    schemaVersion: BACKUP_HEALTH_RECEIPT_SCHEMA_VERSION,
    ...input,
    lastRestoreDrillAt: null,
    lastRestoreMode: null,
  };
  if (!isBackupHealthReceipt(receipt)) return null;
  try {
    storage.setItem(BACKUP_HEALTH_RECEIPT_STORAGE_KEY, JSON.stringify(receipt));
    return receipt;
  } catch {
    return null;
  }
}

export function readBackupHealthReceipt(
  storage: BackupMetadataStorage,
): BackupHealthReceipt | null {
  let raw: string | null;
  try {
    raw = storage.getItem(BACKUP_HEALTH_RECEIPT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null || raw.length > MAX_BACKUP_HEALTH_RECEIPT_LENGTH) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isBackupHealthReceipt(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function recordSuccessfulRestoreDrill(
  storage: BackupMetadataStorage,
  input: {
    readonly sourceChecksum: string;
    readonly restoredAt: Date;
    readonly mode: "merge" | "replace";
  },
): BackupHealthReceipt | null {
  const current = readBackupHealthReceipt(storage);
  if (
    !current ||
    !SHA256_PATTERN.test(input.sourceChecksum) ||
    current.encryptedChecksum !== input.sourceChecksum ||
    Number.isNaN(input.restoredAt.getTime())
  ) {
    return null;
  }
  const updated: BackupHealthReceipt = {
    ...current,
    lastRestoreDrillAt: input.restoredAt.toISOString(),
    lastRestoreMode: input.mode,
  };
  if (!isBackupHealthReceipt(updated)) return null;
  try {
    storage.setItem(BACKUP_HEALTH_RECEIPT_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}

export function backupRecoveryHealth(
  receipt: BackupHealthReceipt | null,
  lastSuccessfulAt: string | null,
): BackupRecoveryHealth {
  if (receipt?.lastRestoreDrillAt) {
    return {
      kind: "drill-verified",
      message: "Bu cihazda aynı şifreli dosyayla geri yükleme tatbikatı doğrulandı.",
      lastRestoreDrillAt: receipt.lastRestoreDrillAt,
    };
  }
  if (receipt) {
    return {
      kind: "drill-required",
      message: "Dosya bütünlüğü doğrulandı; gerçek kurtarma için bu dosyayı seçip geri yükleme tatbikatı yapın.",
      lastRestoreDrillAt: null,
    };
  }
  if (lastSuccessfulAt) {
    return {
      kind: "legacy-time-only",
      message: "Eski yedek için yalnız zaman kaydı var; yeni şifreli yedek ve geri yükleme tatbikatı yapın.",
      lastRestoreDrillAt: null,
    };
  }
  return {
    kind: "missing",
    message: "Henüz doğrulanmış şifreli yedek veya geri yükleme tatbikatı yok.",
    lastRestoreDrillAt: null,
  };
}

/**
 * Yalnız başarıyla tamamlanmış şifreli yedeğin UTC zamanını saklar.
 * Yedek parolası, çocuk verisi veya dosya içeriği bu kayda girmez.
 */
export function recordSuccessfulEncryptedBackup(
  storage: BackupMetadataStorage,
  completedAt: Date = new Date(),
): boolean {
  if (Number.isNaN(completedAt.getTime())) return false;

  const record: LastSuccessfulEncryptedBackupRecord = {
    schemaVersion: LAST_SUCCESSFUL_ENCRYPTED_BACKUP_SCHEMA_VERSION,
    lastSuccessfulAt: completedAt.toISOString(),
  };

  try {
    storage.setItem(
      LAST_SUCCESSFUL_ENCRYPTED_BACKUP_STORAGE_KEY,
      JSON.stringify(record),
    );
    return true;
  } catch {
    return false;
  }
}

/** Depolama engeli veya bozuk metadata uygulamanın açılışını kesmez. */
export function readLastSuccessfulEncryptedBackup(
  storage: BackupMetadataStorage,
): LastSuccessfulEncryptedBackupState {
  let raw: string | null;
  try {
    raw = storage.getItem(LAST_SUCCESSFUL_ENCRYPTED_BACKUP_STORAGE_KEY);
  } catch {
    return { kind: "unavailable", lastSuccessfulAt: null };
  }

  if (raw === null) return { kind: "missing", lastSuccessfulAt: null };
  if (raw.length > MAX_BACKUP_METADATA_LENGTH) {
    return { kind: "invalid", lastSuccessfulAt: null };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredRecord(parsed)
      ? { kind: "available", lastSuccessfulAt: parsed.lastSuccessfulAt }
      : { kind: "invalid", lastSuccessfulAt: null };
  } catch {
    return { kind: "invalid", lastSuccessfulAt: null };
  }
}

/**
 * Son başarılı şifreli yedeği 7 günlük hatırlatma ve 14 günlük gecikme
 * eşiğine göre sınıflandırır. Geçersiz/saat sapmalı metadata güvenli tarafta
 * kalır ve yeni bir yedek önerir.
 */
export function backupReminderState(
  lastSuccessfulAt: string | null,
  now: Date = new Date(),
): BackupReminderState {
  if (lastSuccessfulAt === null) {
    return {
      kind: "never",
      shouldRemind: true,
      ageDays: null,
      message: "Bu cihazda başarılı şifreli yedek kaydı yok.",
    };
  }

  const canonicalLastSuccess = canonicalUtcIso(lastSuccessfulAt);
  const nowMilliseconds = now.getTime();
  if (canonicalLastSuccess === null || Number.isNaN(nowMilliseconds)) {
    return {
      kind: "unknown",
      shouldRemind: true,
      ageDays: null,
      message: "Son yedek zamanı doğrulanamadı; yeni bir şifreli yedek alın.",
    };
  }

  const elapsedMilliseconds =
    nowMilliseconds - new Date(canonicalLastSuccess).getTime();
  if (elapsedMilliseconds < 0) {
    return {
      kind: "unknown",
      shouldRemind: true,
      ageDays: null,
      message:
        "Son yedek zamanı cihaz saatinden ileride görünüyor; cihaz saatini kontrol edip yeni yedek alın.",
    };
  }

  const ageDays = Math.floor(elapsedMilliseconds / MILLISECONDS_PER_DAY);
  if (elapsedMilliseconds >= BACKUP_OVERDUE_DAYS * MILLISECONDS_PER_DAY) {
    return {
      kind: "overdue",
      shouldRemind: true,
      ageDays,
      message: `Şifreli yedek ${ageDays} gündür yenilenmedi; bugün yedek alın.`,
    };
  }
  if (elapsedMilliseconds >= BACKUP_REMINDER_DAYS * MILLISECONDS_PER_DAY) {
    return {
      kind: "reminder",
      shouldRemind: true,
      ageDays,
      message: `Son şifreli yedek ${ageDays} gün önce alındı; yeni yedek zamanı geldi.`,
    };
  }

  return {
    kind: "current",
    shouldRemind: false,
    ageDays,
    message: `Son şifreli yedek ${ageDays} gün önce başarıyla alındı.`,
  };
}
