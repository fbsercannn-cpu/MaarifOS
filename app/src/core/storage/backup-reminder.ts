export const LAST_SUCCESSFUL_ENCRYPTED_BACKUP_SCHEMA_VERSION = 1 as const;
export const LAST_SUCCESSFUL_ENCRYPTED_BACKUP_STORAGE_KEY =
  "maarifos.backup.last-successful-encrypted.v1";
export const BACKUP_REMINDER_DAYS = 7 as const;
export const BACKUP_OVERDUE_DAYS = 14 as const;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;
const MAX_BACKUP_METADATA_LENGTH = 512;

export interface BackupMetadataStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface LastSuccessfulEncryptedBackupRecord {
  readonly schemaVersion: typeof LAST_SUCCESSFUL_ENCRYPTED_BACKUP_SCHEMA_VERSION;
  readonly lastSuccessfulAt: string;
}

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
