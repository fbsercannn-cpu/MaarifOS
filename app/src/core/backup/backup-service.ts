import {
  COLLECTION_NAMES,
  createEmptySnapshot,
  type CollectionName,
  type DataSnapshot,
  type StoredRecord,
} from "../domain/model";
import {
  isRecoverySnapshotRepository,
  type LocalDataStore,
  type RecoverySnapshotMetadata,
  type RecoverySnapshotReason,
} from "../repository/contracts";
import {
  createRecoverySnapshotRecord,
  DEFAULT_RECOVERY_SNAPSHOT_RETENTION,
  validateRecoveryRetentionLimit,
  verifyRecoverySnapshotRecord,
} from "../repository/recovery-snapshot";
import { resolveAttendanceRecords } from "../domain/attendance";
import {
  composeStudentDisplayName,
  splitStudentDisplayName,
} from "../domain/student";
import { migrateLegacyClassroomScopes } from "../migrations/classroom-scope-migration";
import { canonicalClone, canonicalJson } from "./canonical-json";
import { sha256Hex } from "./crypto";
import {
  decryptBackupText,
  encryptBackupText,
  serializeEncryptedBackup,
  type EncryptedBackupEnvelope,
} from "./encrypted-backup";
import {
  assertBackupEnvelope,
  assertBackupEnvelopeStructure,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  DATA_SCHEMA_VERSION,
  LEGACY_DATA_SCHEMA_VERSION,
  type BackupEnvelope,
  type RestoreMode,
  type RestoreReport,
} from "./schema";

export interface BackupServiceOptions {
  appVersion: string;
  clock?: () => Date;
  civilDateProvider?: (date: Date) => string;
  recoveryRetentionLimit?: number;
}

export interface RestoreOptions {
  mode: RestoreMode;
  createRecoverySnapshot?: boolean;
  recoveryReason?: RecoverySnapshotReason;
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

export async function assertExternalFeedbackContentHashes(
  snapshot: DataSnapshot,
): Promise<void> {
  for (const feedback of snapshot.externalFeedback) {
    const expected = await sha256Hex(String(feedback.feedbackText ?? ""));
    if (expected !== feedback.contentHash) {
      throw new Error(
        `Haricî AI geri bildirimi içerik hash doğrulamasını geçemedi: ${feedback.id}`,
      );
    }
  }
}

function recordsEqual(left: StoredRecord, right: StoredRecord): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

class BackupSnapshotStore implements LocalDataStore {
  private snapshot: DataSnapshot;

  constructor(snapshot: DataSnapshot) {
    this.snapshot = canonicalClone(snapshot);
  }

  async transaction<T>(
    mode: "readonly" | "readwrite",
    collections: readonly CollectionName[],
    task: Parameters<LocalDataStore["transaction"]>[2],
  ): Promise<T> {
    const working = canonicalClone(this.snapshot);
    const result = await task({
      getAll: async (collection) => canonicalClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
        for (const record of records) {
          byId.set(record.id, canonicalClone(record));
        }
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    });
    if (mode === "readwrite") {
      for (const collection of collections) {
        this.snapshot[collection] = working[collection];
      }
    }
    return result as T;
  }

  async readSnapshot(): Promise<DataSnapshot> {
    return canonicalClone(this.snapshot);
  }

  close(): void {}
}

async function normalizeLegacyBackupScopes(
  envelope: BackupEnvelope,
): Promise<BackupEnvelope> {
  const store = new BackupSnapshotStore(envelope.payload);
  await migrateLegacyClassroomScopes(store, {
    now: new Date(envelope.manifest.createdAt),
  });
  const payload = await store.readSnapshot();
  return {
    manifest: {
      ...envelope.manifest,
      payloadChecksum: await sha256Hex(canonicalJson(payload)),
    },
    payload,
  };
}

async function upgradeLegacyBackupEnvelope(
  envelope: BackupEnvelope,
): Promise<BackupEnvelope> {
  if (envelope.manifest.dataSchemaVersion === DATA_SCHEMA_VERSION) {
    return canonicalClone(envelope);
  }
  const legacyPayload = canonicalClone(envelope.payload);
  const payload: DataSnapshot = {
    ...createEmptySnapshot(),
    ...legacyPayload,
    ...(envelope.manifest.dataSchemaVersion === LEGACY_DATA_SCHEMA_VERSION
      ? { evidenceCurriculumLinks: [] }
      : {}),
    students: legacyPayload.students.map((student) => {
      if (typeof student.displayName !== "string") return student;
      const derived = splitStudentDisplayName(student.displayName);
      const firstName =
        typeof student.firstName === "string" && student.firstName.trim()
          ? student.firstName.trim()
          : derived.firstName;
      const lastName =
        typeof student.lastName === "string" && student.lastName.trim()
          ? student.lastName.trim()
          : derived.lastName;
      return {
        ...student,
        displayName: composeStudentDisplayName(firstName, lastName),
        firstName,
        ...(lastName ? { lastName } : {}),
      };
    }),
  };
  return {
    manifest: {
      ...envelope.manifest,
      dataSchemaVersion: DATA_SCHEMA_VERSION,
      entityCounts: entityCounts(payload),
      payloadChecksum: await sha256Hex(canonicalJson(payload)),
    },
    payload,
  };
}

export class BackupService {
  private readonly clock: () => Date;
  private readonly civilDateProvider: (date: Date) => string;
  private readonly recoveryRetentionLimit: number;

  constructor(
    private readonly store: LocalDataStore,
    private readonly options: BackupServiceOptions,
  ) {
    if (options.appVersion.trim().length === 0) {
      throw new Error("Yedek için uygulama sürümü zorunludur.");
    }
    this.clock = options.clock ?? (() => new Date());
    this.civilDateProvider = options.civilDateProvider ?? istanbulCivilDate;
    this.recoveryRetentionLimit = validateRecoveryRetentionLimit(
      options.recoveryRetentionLimit ?? DEFAULT_RECOVERY_SNAPSHOT_RETENTION,
    );
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
    await assertExternalFeedbackContentHashes(envelope.payload);
    const selfCheck = await sha256Hex(canonicalJson(envelope.payload));
    if (selfCheck !== envelope.manifest.payloadChecksum) {
      throw new Error("Yedek oluşturulurken bütünlük doğrulaması başarısız oldu.");
    }
    return canonicalClone(envelope);
  }

  serializeBackup(envelope: BackupEnvelope): string {
    return canonicalJson(envelope);
  }

  async exportEncryptedBackup(
    password: string,
  ): Promise<EncryptedBackupEnvelope> {
    const backup = await this.exportBackup();
    return encryptBackupText(
      this.serializeBackup(backup),
      {
        appVersion: backup.manifest.appVersion,
        createdAt: backup.manifest.createdAt,
      },
      password,
    );
  }

  serializeEncryptedBackup(envelope: EncryptedBackupEnvelope): string {
    return serializeEncryptedBackup(envelope);
  }

  async parseAndDecryptBackup(
    input: string | EncryptedBackupEnvelope,
    password: string,
  ): Promise<BackupEnvelope> {
    const plaintext = await decryptBackupText(input, password);
    return this.parseAndVerifyBackup(plaintext);
  }

  async parseAndVerifyBackup(input: string | BackupEnvelope): Promise<BackupEnvelope> {
    let candidate: unknown;
    if (typeof input === "string" && input.length > 20 * 1024 * 1024) {
      throw new Error("Yedek dosyası izin verilen 20 MB sınırını aşıyor.");
    }
    try {
      candidate = typeof input === "string" ? JSON.parse(input) : canonicalClone(input);
    } catch {
      throw new Error("Yedek dosyası geçerli JSON değil.");
    }
    assertBackupEnvelopeStructure(candidate);
    const checksum = await sha256Hex(canonicalJson(candidate.payload));
    if (checksum !== candidate.manifest.payloadChecksum) {
      throw new Error("Yedek bütünlük kontrolünü geçemedi; dosya bozuk veya değiştirilmiş.");
    }
    const upgraded = await upgradeLegacyBackupEnvelope(candidate);
    const normalized = await normalizeLegacyBackupScopes(upgraded);
    assertBackupEnvelope(normalized);
    await assertExternalFeedbackContentHashes(normalized.payload);
    return canonicalClone(normalized);
  }

  async createRecoverySnapshot(
    reason: RecoverySnapshotReason = "manual",
  ): Promise<RecoverySnapshotMetadata> {
    if (!isRecoverySnapshotRepository(this.store)) {
      throw new Error(
        "Bu veri deposu doğrulanmış kurtarma snapshot özelliğini desteklemiyor.",
      );
    }
    const backup = await this.exportBackup();
    const snapshot = await createRecoverySnapshotRecord(backup, reason, {
      createdAt: backup.manifest.createdAt,
    });
    return this.store.saveRecoverySnapshot(snapshot, {
      retentionLimit: this.recoveryRetentionLimit,
    });
  }

  async listRecoverySnapshots(): Promise<RecoverySnapshotMetadata[]> {
    if (!isRecoverySnapshotRepository(this.store)) {
      throw new Error(
        "Bu veri deposu kurtarma snapshot listesini desteklemiyor.",
      );
    }
    return this.store.listRecoverySnapshots();
  }

  async deleteRecoverySnapshot(id: string): Promise<void> {
    if (!isRecoverySnapshotRepository(this.store)) {
      throw new Error(
        "Bu veri deposu kurtarma snapshot silme işlemini desteklemiyor.",
      );
    }
    await this.store.deleteRecoverySnapshot(id);
  }

  async restoreRecoverySnapshot(
    id: string,
    options: { createRecoverySnapshot?: boolean } = {},
  ): Promise<RestoreReport> {
    if (!isRecoverySnapshotRepository(this.store)) {
      throw new Error(
        "Bu veri deposu kurtarma snapshot geri yüklemesini desteklemiyor.",
      );
    }
    const snapshot = await this.store.getRecoverySnapshot(id);
    if (!snapshot) {
      throw new Error("İstenen kurtarma snapshot kaydı bulunamadı.");
    }
    const verified = await verifyRecoverySnapshotRecord(snapshot);
    return this.restoreBackup(verified.envelope, {
      mode: "replace",
      createRecoverySnapshot: options.createRecoverySnapshot ?? true,
      recoveryReason: "before-restore",
    });
  }

  async restoreEncryptedBackup(
    input: string | EncryptedBackupEnvelope,
    password: string,
    options: RestoreOptions,
  ): Promise<RestoreReport> {
    const backup = await this.parseAndDecryptBackup(input, password);
    return this.restoreBackup(backup, options);
  }

  async restoreBackup(
    input: string | BackupEnvelope,
    options: RestoreOptions,
  ): Promise<RestoreReport> {
    const backup = await this.parseAndVerifyBackup(input);
    if (options.mode !== "replace" && options.mode !== "merge") {
      throw new Error("Geri yükleme modu replace veya merge olmalıdır.");
    }
    if (options.createRecoverySnapshot !== false) {
      await this.createRecoverySnapshot(
        options.recoveryReason ?? "before-restore",
      );
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
            const incoming = collection === "attendanceRecords"
              ? resolveAttendanceRecords(backup.payload.attendanceRecords).records
              : backup.payload[collection];
            await transaction.putMany(collection, incoming);
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
        const candidateSnapshot = createEmptySnapshot();
        const toInsertByCollection = new Map<CollectionName, StoredRecord[]>();
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
          toInsertByCollection.set(collection, toInsert);
          candidateSnapshot[collection] = [...current.values(), ...toInsert];
        }

        assertBackupEnvelope({
          manifest: {
            ...backup.manifest,
            payloadChecksum: "0".repeat(64),
            entityCounts: entityCounts(candidateSnapshot),
          },
          payload: candidateSnapshot,
        });

        for (const collection of COLLECTION_NAMES) {
          const toInsert = toInsertByCollection.get(collection) ?? [];
          await transaction.putMany(collection, toInsert);
          if (collection === "attendanceRecords" && toInsert.length > 0) {
            await transaction.putMany(
              "attendanceRecords",
              resolveAttendanceRecords(candidateSnapshot.attendanceRecords).records,
            );
          }
        }
        return report;
      },
    );
  }
}
