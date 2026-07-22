import {
  COLLECTION_NAMES,
  type CollectionName,
  type DataSnapshot,
  type StoredRecord,
} from "../domain/model";
import type { LocalDataStore } from "../repository/contracts";
import { canonicalClone, canonicalJson } from "./canonical-json";
import { sha256Hex } from "./crypto";
import {
  assertBackupEnvelope,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  DATA_SCHEMA_VERSION,
  type BackupEnvelope,
  type RestoreMode,
  type RestoreReport,
} from "./schema";

export interface BackupServiceOptions {
  appVersion: string;
  clock?: () => Date;
  civilDateProvider?: (date: Date) => string;
}

export interface RestoreOptions {
  mode: RestoreMode;
}

function istanbulCivilDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function entityCounts(snapshot: DataSnapshot): Record<CollectionName, number> {
  return Object.fromEntries(
    COLLECTION_NAMES.map((collection) => [collection, snapshot[collection].length]),
  ) as Record<CollectionName, number>;
}

function recordsEqual(left: StoredRecord, right: StoredRecord): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

export class BackupService {
  private readonly clock: () => Date;
  private readonly civilDateProvider: (date: Date) => string;

  constructor(
    private readonly store: LocalDataStore,
    private readonly options: BackupServiceOptions,
  ) {
    if (options.appVersion.trim().length === 0) {
      throw new Error("Yedek için uygulama sürümü zorunludur.");
    }
    this.clock = options.clock ?? (() => new Date());
    this.civilDateProvider = options.civilDateProvider ?? istanbulCivilDate;
  }

  async exportBackup(): Promise<BackupEnvelope> {
    const payload = canonicalClone(await this.store.readSnapshot());
    const created = this.clock();
    const payloadChecksum = await sha256Hex(canonicalJson(payload));
    const envelope: BackupEnvelope = {
      manifest: {
        format: BACKUP_FORMAT,
        backupVersion: BACKUP_VERSION,
        dataSchemaVersion: DATA_SCHEMA_VERSION,
        appVersion: this.options.appVersion,
        createdAt: created.toISOString(),
        civilDate: this.civilDateProvider(created),
        checksumAlgorithm: "SHA-256",
        payloadChecksum,
        entityCounts: entityCounts(payload),
      },
      payload,
    };
    assertBackupEnvelope(envelope);
    const selfCheck = await sha256Hex(canonicalJson(envelope.payload));
    if (selfCheck !== envelope.manifest.payloadChecksum) {
      throw new Error("Yedek oluşturulurken bütünlük doğrulaması başarısız oldu.");
    }
    return canonicalClone(envelope);
  }

  serializeBackup(envelope: BackupEnvelope): string {
    return canonicalJson(envelope);
  }

  async parseAndVerifyBackup(input: string | BackupEnvelope): Promise<BackupEnvelope> {
    let candidate: unknown;
    try {
      candidate = typeof input === "string" ? JSON.parse(input) : canonicalClone(input);
    } catch {
      throw new Error("Yedek dosyası geçerli JSON değil.");
    }
    assertBackupEnvelope(candidate);
    const checksum = await sha256Hex(canonicalJson(candidate.payload));
    if (checksum !== candidate.manifest.payloadChecksum) {
      throw new Error("Yedek bütünlük kontrolünü geçemedi; dosya bozuk veya değiştirilmiş.");
    }
    return canonicalClone(candidate);
  }

  async restoreBackup(
    input: string | BackupEnvelope,
    options: RestoreOptions,
  ): Promise<RestoreReport> {
    const backup = await this.parseAndVerifyBackup(input);
    if (options.mode !== "replace" && options.mode !== "merge") {
      throw new Error("Geri yükleme modu replace veya merge olmalıdır.");
    }

    return this.store.transaction(
      "readwrite",
      COLLECTION_NAMES,
      async (transaction) => {
        if (options.mode === "replace") {
          let replaced = 0;
          for (const collection of COLLECTION_NAMES) {
            const existing = await transaction.getAll(collection);
            replaced += existing.length;
            await transaction.clear(collection);
            await transaction.putMany(collection, backup.payload[collection]);
          }
          return {
            mode: options.mode,
            inserted: Object.values(backup.manifest.entityCounts).reduce(
              (total, count) => total + count,
              0,
            ),
            replaced,
            skipped: 0,
            conflicts: [],
            entityCounts: backup.manifest.entityCounts,
          };
        }

        const report: RestoreReport = {
          mode: options.mode,
          inserted: 0,
          replaced: 0,
          skipped: 0,
          conflicts: [],
          entityCounts: backup.manifest.entityCounts,
        };
        for (const collection of COLLECTION_NAMES) {
          const current = new Map(
            (await transaction.getAll(collection)).map((record) => [record.id, record]),
          );
          const toInsert: StoredRecord[] = [];
          for (const incoming of backup.payload[collection]) {
            const existing = current.get(incoming.id);
            if (!existing) {
              toInsert.push(incoming);
              report.inserted += 1;
            } else if (recordsEqual(existing, incoming)) {
              report.skipped += 1;
            } else {
              report.conflicts.push({
                collection,
                id: incoming.id,
                reason: "same-id-different-data",
              });
            }
          }
          await transaction.putMany(collection, toInsert);
        }
        return report;
      },
    );
  }
}
