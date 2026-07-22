import {
  COLLECTION_NAMES,
  type CollectionName,
  type DataSnapshot,
  type StoredRecord,
} from "../domain/model";

export const BACKUP_FORMAT = "maarifos-json";
export const BACKUP_VERSION = 1;
export const DATA_SCHEMA_VERSION = 1;

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  backupVersion: typeof BACKUP_VERSION;
  dataSchemaVersion: typeof DATA_SCHEMA_VERSION;
  appVersion: string;
  createdAt: string;
  civilDate: string;
  checksumAlgorithm: "SHA-256";
  payloadChecksum: string;
  entityCounts: Record<CollectionName, number>;
}

export interface BackupEnvelope {
  manifest: BackupManifest;
  payload: DataSnapshot;
}

export type RestoreMode = "replace" | "merge";

export interface RestoreConflict {
  collection: CollectionName;
  id: string;
  reason: "same-id-different-data";
}

export interface RestoreReport {
  mode: RestoreMode;
  inserted: number;
  replaced: number;
  skipped: number;
  conflicts: RestoreConflict[];
  entityCounts: Record<CollectionName, number>;
}

const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertStoredRecord(value: unknown, collection: CollectionName): asserts value is StoredRecord {
  if (!isRecord(value)) {
    throw new Error(`${collection} koleksiyonunda geçersiz kayıt bulundu.`);
  }
  if (typeof value.id !== "string" || !UUID_PATTERN.test(value.id)) {
    throw new Error(`${collection} koleksiyonunda geçersiz UUID bulundu.`);
  }
  if (typeof value.createdAt !== "string" || !UTC_ISO_PATTERN.test(value.createdAt)) {
    throw new Error(`${collection}/${value.id} createdAt UTC ISO biçiminde değil.`);
  }
  if (typeof value.updatedAt !== "string" || !UTC_ISO_PATTERN.test(value.updatedAt)) {
    throw new Error(`${collection}/${value.id} updatedAt UTC ISO biçiminde değil.`);
  }
  if (typeof value.civilDate !== "string" || !CIVIL_DATE_PATTERN.test(value.civilDate)) {
    throw new Error(`${collection}/${value.id} civilDate YYYY-MM-DD biçiminde değil.`);
  }
  if (!Number.isInteger(value.schemaVersion) || (value.schemaVersion as number) < 1) {
    throw new Error(`${collection}/${value.id} schemaVersion geçersiz.`);
  }
  if (
    value.deletedAt !== undefined &&
    value.deletedAt !== null &&
    (typeof value.deletedAt !== "string" || !UTC_ISO_PATTERN.test(value.deletedAt))
  ) {
    throw new Error(`${collection}/${value.id} deletedAt UTC ISO biçiminde değil.`);
  }
}

export function assertBackupEnvelope(value: unknown): asserts value is BackupEnvelope {
  if (!isRecord(value) || !isRecord(value.manifest) || !isRecord(value.payload)) {
    throw new Error("Yedek zarfı veya manifest eksik.");
  }
  const manifest = value.manifest;
  if (manifest.format !== BACKUP_FORMAT || manifest.backupVersion !== BACKUP_VERSION) {
    throw new Error("Yedek biçimi veya sürümü desteklenmiyor.");
  }
  if (manifest.dataSchemaVersion !== DATA_SCHEMA_VERSION) {
    throw new Error("Yedek veri şeması bu uygulama sürümüyle uyumlu değil.");
  }
  if (typeof manifest.appVersion !== "string" || manifest.appVersion.length === 0) {
    throw new Error("Yedek uygulama sürümü eksik.");
  }
  if (typeof manifest.createdAt !== "string" || !UTC_ISO_PATTERN.test(manifest.createdAt)) {
    throw new Error("Yedek oluşturma zamanı UTC ISO biçiminde değil.");
  }
  if (typeof manifest.civilDate !== "string" || !CIVIL_DATE_PATTERN.test(manifest.civilDate)) {
    throw new Error("Yedek takvim günü YYYY-MM-DD biçiminde değil.");
  }
  if (
    manifest.checksumAlgorithm !== "SHA-256" ||
    typeof manifest.payloadChecksum !== "string" ||
    !SHA256_PATTERN.test(manifest.payloadChecksum)
  ) {
    throw new Error("Yedek bütünlük bilgisi geçersiz.");
  }
  if (!isRecord(manifest.entityCounts)) {
    throw new Error("Yedek kayıt sayıları eksik.");
  }

  const payloadKeys = Object.keys(value.payload);
  const unknownCollections = payloadKeys.filter(
    (key) => !COLLECTION_NAMES.includes(key as CollectionName),
  );
  if (unknownCollections.length > 0) {
    throw new Error(`Yedekte bilinmeyen koleksiyon var: ${unknownCollections.join(", ")}`);
  }

  for (const collection of COLLECTION_NAMES) {
    const records = value.payload[collection];
    if (!Array.isArray(records)) {
      throw new Error(`Yedekte ${collection} koleksiyonu eksik.`);
    }
    const identifiers = new Set<string>();
    for (const record of records) {
      assertStoredRecord(record, collection);
      if (identifiers.has(record.id)) {
        throw new Error(`${collection} koleksiyonunda mükerrer UUID var: ${record.id}`);
      }
      identifiers.add(record.id);
    }
    if (manifest.entityCounts[collection] !== records.length) {
      throw new Error(`${collection} kayıt sayısı manifest ile uyuşmuyor.`);
    }
  }
}

