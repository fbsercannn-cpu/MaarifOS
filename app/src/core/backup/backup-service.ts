import {
  COLLECTION_NAMES,
  createEmptySnapshot,
  type CollectionName,
  type DataSnapshot,
  type StoredRecord,
} from "../domain/model";
import {
  isRecoverySnapshotRepository,
  type DataTransaction,
  type LocalDataStore,
  type RecoverySnapshotMetadata,
  type RecoverySnapshotReason,
} from "../repository/contracts";
import {
  assertEntityRecord,
  type EntityMap,
} from "../repository/entities";
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
  VALUE_EVIDENCE_DATA_SCHEMA_VERSION,
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

/**
 * Eski DataSnapshot biçimi ile literal-anahtar tipli transaction sözleşmesi
 * arasındaki doğrulamalı köprü. Kayıtlar cast edilmez; ortak entity codec'i
 * her öğeyi doğruladıktan sonra TypeScript tarafından daraltılır.
 */
class BackupDataTransaction implements DataTransaction {
  constructor(private readonly snapshot: DataSnapshot) {}

  async getAll<Collection extends CollectionName>(
    collection: Collection,
  ): Promise<EntityMap[Collection][]> {
    return canonicalClone(this.snapshot[collection]).map((record) => {
      assertEntityRecord(collection, record);
      return record;
    });
  }

  async putMany<Collection extends CollectionName>(
    collection: Collection,
    records: readonly EntityMap[Collection][],
  ): Promise<void>;
  async putMany(
    collection: CollectionName,
    records: readonly StoredRecord[],
  ): Promise<void>;
  async putMany(
    collection: CollectionName,
    records: readonly StoredRecord[],
  ): Promise<void> {
    const byId = new Map(
      this.snapshot[collection].map((record) => [record.id, record]),
    );
    for (const record of records) {
      byId.set(record.id, canonicalClone(record));
    }
    this.snapshot[collection] = [...byId.values()];
  }

  async clear<Collection extends CollectionName>(
    collection: Collection,
  ): Promise<void> {
    this.snapshot[collection] = [];
  }
}

export async function assertValueEvidenceDesignDigests(
  snapshot: DataSnapshot,
): Promise<void> {
  const activitiesById = new Map(
    snapshot.activities.map((activity) => [activity.id, activity]),
  );
  const digestsByActivityId = new Map<string, string>();
  for (const link of snapshot.valueEvidenceLinks) {
    const activity = typeof link.activityId === "string"
      ? activitiesById.get(link.activityId)
      : undefined;
    const appliedTemplate = activity?.appliedActivityTemplateSnapshot;
    const valuesDesign =
      appliedTemplate &&
      typeof appliedTemplate === "object" &&
      !Array.isArray(appliedTemplate)
        ? (appliedTemplate as Record<string, unknown>).valuesDesign
        : undefined;
    const provenance =
      link.provenance &&
      typeof link.provenance === "object" &&
      !Array.isArray(link.provenance)
        ? link.provenance as Record<string, unknown>
        : null;
    if (!activity || valuesDesign === undefined || !provenance) {
      throw new Error(
        `Değer kanıtı authoritative valuesDesign digest kaynağını taşımıyor: ${link.id}`,
      );
    }
    let expected = digestsByActivityId.get(activity.id);
    if (!expected) {
      expected = `sha256:${await sha256Hex(canonicalJson(valuesDesign))}`;
      digestsByActivityId.set(activity.id, expected);
    }
    if (provenance.appliedValuesDesignDigest !== expected) {
      throw new Error(
        `Değer kanıtı applied valuesDesign digest doğrulamasını geçemedi: ${link.id}`,
      );
    }
  }
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
    const result = await task(new BackupDataTransaction(working));
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
    ...(envelope.manifest.dataSchemaVersion < VALUE_EVIDENCE_DATA_SCHEMA_VERSION
      ? { valueEvidenceLinks: [] }
      : {}),
    exportPackages: legacyPayload.exportPackages.map((record) => {
      if (
        record.type !== "student_dossier" ||
        envelope.manifest.dataSchemaVersion >= VALUE_EVIDENCE_DATA_SCHEMA_VERSION
      ) {
        return record;
      }
      const includedEntityIds = record.includedEntityIds;
      if (
        typeof includedEntityIds !== "object" ||
        includedEntityIds === null ||
        Array.isArray(includedEntityIds)
      ) {
        return record;
      }
      const legacyValueEvidenceLinks = (
        includedEntityIds as Record<string, unknown>
      ).valueEvidenceLinks;
      if (
        legacyValueEvidenceLinks !== undefined &&
        (!Array.isArray(legacyValueEvidenceLinks) ||
          legacyValueEvidenceLinks.length > 0)
      ) {
        throw new Error(
          "Eski öğrenci dosyası paketi desteklenmeyen değer kanıtı kimliği taşıyor.",
        );
      }
      return {
        ...record,
        includedEntityIds: {
          ...(includedEntityIds as Record<string, unknown>),
          valueEvidenceLinks: [],
        },
      };
    }),
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
    await assertValueEvidenceDesignDigests(envelope.payload);
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
    await assertValueEvidenceDesignDigests(normalized.payload);
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
    let restorePreimageSnapshot: DataSnapshot;
    if (options.createRecoverySnapshot !== false) {
      const recoveryMetadata = await this.createRecoverySnapshot(
        options.recoveryReason ?? "before-restore",
      );
      if (!isRecoverySnapshotRepository(this.store)) {
        throw new Error(
          "Doğrulanmış kurtarma snapshot kaynağı geri yükleme öncesi kullanılamıyor.",
        );
      }
      const recoveryRecord = await this.store.getRecoverySnapshot(
        recoveryMetadata.id,
      );
      if (!recoveryRecord) {
        throw new Error("Geri yükleme öncesi kurtarma snapshot kaydı bulunamadı.");
      }
      const verifiedRecovery = await verifyRecoverySnapshotRecord(recoveryRecord);
      restorePreimageSnapshot = canonicalClone(verifiedRecovery.envelope.payload);
      const postRecoverySnapshot = canonicalClone(await this.store.readSnapshot());
      if (
        canonicalJson(postRecoverySnapshot) !==
        canonicalJson(restorePreimageSnapshot)
      ) {
        throw new Error(
          "Veri kurtarma snapshot'ı oluşturulurken değişti; geri yükleme güvenle iptal edildi.",
        );
      }
    } else {
      restorePreimageSnapshot = canonicalClone(await this.store.readSnapshot());
    }
    const restorePreimageCanonical = canonicalJson(restorePreimageSnapshot);

    if (options.mode === "replace") {
      return this.store.transaction(
        "readwrite",
        COLLECTION_NAMES,
        async (transaction) => {
          const transactionPreimage = createEmptySnapshot();
          for (const collection of COLLECTION_NAMES) {
            transactionPreimage[collection] = await transaction.getAll(collection);
          }
          if (canonicalJson(transactionPreimage) !== restorePreimageCanonical) {
            throw new Error(
              "Replace geri yükleme kaynağı doğrulama sırasında değişti; işlem güvenle iptal edildi.",
            );
          }
          let replaced = 0;
          for (const collection of COLLECTION_NAMES) {
            const existing = transactionPreimage[collection];
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
        },
      );
    }

    // Merge doğrulaması WebCrypto beklediği için native IndexedDB readwrite
    // transaction'ı dışında yapılır. Ardından aynı preimage yazma transaction'ı
    // içinde tekrar okunur; arada değişiklik olduysa hiçbir kayıt yazılmaz.
    const preimageSnapshot = restorePreimageSnapshot;
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
        preimageSnapshot[collection].map((record) => [record.id, record]),
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
    await assertExternalFeedbackContentHashes(candidateSnapshot);
    await assertValueEvidenceDesignDigests(candidateSnapshot);

    const preimageCanonical = canonicalJson(preimageSnapshot);
    return this.store.transaction(
      "readwrite",
      COLLECTION_NAMES,
      async (transaction) => {
        const transactionPreimage = createEmptySnapshot();
        for (const collection of COLLECTION_NAMES) {
          transactionPreimage[collection] = await transaction.getAll(collection);
        }
        if (canonicalJson(transactionPreimage) !== preimageCanonical) {
          throw new Error(
            "Merge geri yükleme kaynağı doğrulama sırasında değişti; işlem güvenle iptal edildi.",
          );
        }
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
