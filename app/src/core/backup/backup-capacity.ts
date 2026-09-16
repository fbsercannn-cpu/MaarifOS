import { COLLECTION_NAMES, type CollectionName } from "../domain/model";
import { canonicalJson } from "./canonical-json";
import { sha256Hex } from "./crypto";
import type { BackupEnvelope } from "./schema";

// One contract applies to export, encrypted transport, parsing and UI selection.
export const MAX_BACKUP_PLAINTEXT_BYTES = 64 * 1024 * 1024;
export const MAX_ENCRYPTED_BACKUP_BYTES = 96 * 1024 * 1024;
export const BACKUP_CHUNK_BYTES = 1024 * 1024;
export const CHUNKED_BACKUP_THRESHOLD_BYTES = 3 * 1024 * 1024;

export function backupUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function assertBackupCapacity(value: string, encrypted = false): number {
  const limit = encrypted ? MAX_ENCRYPTED_BACKUP_BYTES : MAX_BACKUP_PLAINTEXT_BYTES;
  // Cheap code-unit check precedes the bounded UTF-8 allocation.
  if (typeof value !== "string" || value.length > limit) {
    throw new Error(`Yedek ${limit / 1024 / 1024} MiB kapasite sınırını aşıyor; dosya oluşturulmadı veya veri değiştirilmedi.`);
  }
  const size = backupUtf8ByteLength(value);
  if (size > limit) throw new Error(`Yedek UTF-8 boyutu ${limit / 1024 / 1024} MiB kapasite sınırını aşıyor; dosya oluşturulmadı veya veri değiştirilmedi.`);
  return size;
}

export interface BackupRecoverySummary {
  payloadChecksum: string;
  plaintextBytes: number;
  maximumPlaintextBytes: number;
  maximumFileBytes: number;
  photoCount: number;
  recordCount: number;
  collections: Array<{ collection: CollectionName; count: number; sha256: string }>;
}

export async function createBackupRecoverySummary(envelope: BackupEnvelope): Promise<BackupRecoverySummary> {
  const plaintextBytes = assertBackupCapacity(canonicalJson(envelope));
  const collections = [];
  for (const collection of COLLECTION_NAMES) {
    const records = envelope.payload[collection];
    collections.push({ collection, count: records.length,
      sha256: await sha256Hex(canonicalJson([...records].sort((a, b) => a.id.localeCompare(b.id)))) });
  }
  return { payloadChecksum: envelope.manifest.payloadChecksum, plaintextBytes,
    maximumPlaintextBytes: MAX_BACKUP_PLAINTEXT_BYTES, maximumFileBytes: MAX_ENCRYPTED_BACKUP_BYTES,
    photoCount: envelope.payload.students.filter((record) => typeof record.profilePhotoDataUrl === "string" && record.profilePhotoDataUrl.length > 0).length,
    recordCount: collections.reduce((total, item) => total + item.count, 0), collections };
}

export function assertBackupRecoveryMatch(expected: BackupRecoverySummary, actual: BackupRecoverySummary): void {
  if (expected.recordCount !== actual.recordCount || canonicalJson(expected.collections) !== canonicalJson(actual.collections)) {
    throw new Error("Geri yükleme kayıt sayısı veya koleksiyon hash mutabakatı başarısız; kurtarma doğrulanmadı.");
  }
}
