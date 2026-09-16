import {
  COLLECTION_NAMES,
  createEmptySnapshot,
  type CollectionName,
  type DataSnapshot,
  type StoredRecord,
} from "../domain/model";
import type {
  ClassroomDataQueryRepository,
  DataTransaction,
  LocalDataStore,
  RecoverySnapshotMetadata,
  RecoverySnapshotRecord,
  RecoverySnapshotRepository,
  StudentPrivacyDeletionRepository,
  StudentRecoveryPurgeResult,
  TransactionMode,
} from "./contracts";
import type {
  EntityMap,
  ObservationRecord,
  StudentRecord,
} from "./entities";
import type { AttendanceRecord } from "../domain/attendance";
import { canonicalJson } from "../backup/canonical-json";
import {
  StudentSensitiveVault,
  STUDENT_VAULT_READY_STATE_ID,
  studentSensitiveKeyDatabaseName,
  type StudentSensitiveVaultOptions,
  type StudentVaultMigrationItem,
  type StudentVaultMigrationState,
  type StudentVaultReadyState,
} from "../security/student-sensitive-vault.ts";
import { hasLocalVaultEnvelope, LocalVaultSecurityError, type LocalVaultSealedRecord } from "../security/local-vault-envelope.ts";
import { openLocalVaultReadwriteTransaction } from "../security/local-vault-idb.ts";
import type { LocalVaultRetirementPreparation } from "../security/local-vault-record-generation.ts";
import {
  INDEXED_DB_MIGRATIONS,
  MAARIFOS_DATABASE_VERSION,
  OBSERVATION_RELATION_INDEX_DEFINITIONS,
  SCOPE_INDEX_DEFINITIONS,
  VALUE_EVIDENCE_LINK_INDEX_DEFINITIONS,
  type IndexDefinition,
} from "./indexed-db-definitions.ts";

export {
  INDEXED_DB_MIGRATIONS,
  MAARIFOS_DATABASE_VERSION,
  OBSERVATION_RELATION_INDEX_DEFINITIONS,
  VALUE_EVIDENCE_LINK_INDEX_DEFINITIONS,
} from "./indexed-db-definitions.ts";

export const DEFAULT_DATABASE_NAME = "maarifos-local";
export const RECOVERY_SNAPSHOT_STORE_NAME =
  "__maarifosRecoverySnapshots";
export const STUDENT_VAULT_STATE_STORE_NAME = "__maarifosVaultState";
export const ALL_COLLECTIONS_VAULT_READY_STATE_ID = "all-collections-v2";

function deleteIndexedDatabase(
  indexedDb: IDBFactory,
  databaseName: string,
  blockedTimeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let blockedTimer: ReturnType<typeof setTimeout> | undefined;
    const request = indexedDb.deleteDatabase(databaseName);
    const finish = (task: () => void): void => {
      if (settled) return;
      settled = true;
      if (blockedTimer !== undefined) clearTimeout(blockedTimer);
      task();
    };
    request.addEventListener("success", () => finish(resolve), { once: true });
    request.addEventListener(
      "blocked",
      () => {
        if (settled || blockedTimer !== undefined) return;
        blockedTimer = setTimeout(() => {
          finish(() =>
            reject(
              new Error(
                "Yerel veri silme açık bir sekmenin kapanmasını beklerken zaman aşımına uğradı.",
              ),
            ),
          );
        }, blockedTimeoutMs);
      },
      { once: true },
    );
    request.addEventListener(
      "error",
      () =>
        finish(() =>
          reject(request.error ?? new Error("Yerel veritabanı silinemedi.")),
        ),
      { once: true },
    );
  });
}

async function assertIndexedDatabaseAbsent(
  indexedDb: IDBFactory,
  databaseName: string,
): Promise<void> {
  if (typeof indexedDb.databases !== "function") return;
  const databases = await indexedDb.databases();
  if (databases.some((database) => database.name === databaseName)) {
    throw new Error("Yerel veritabanı silme sonrası hâlâ erişilebilir durumda.");
  }
}

export async function cryptographicallyEraseIndexedDbData(
  options: {
    databaseName?: string;
    indexedDb?: IDBFactory;
    blockedTimeoutMs?: number;
  } = {},
): Promise<void> {
  const databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
  const indexedDb = options.indexedDb ?? globalThis.indexedDB;
  if (!indexedDb) throw new Error("IndexedDB bu ortamda kullanılamıyor.");
  const blockedTimeoutMs = options.blockedTimeoutMs ?? 5_000;
  if (!Number.isSafeInteger(blockedTimeoutMs) || blockedTimeoutMs < 1) {
    throw new Error("Yerel veri silme zaman aşımı doğrulanamadı.");
  }
  const keyDatabaseName = studentSensitiveKeyDatabaseName(databaseName);
  // Anahtar önce silinir: ikinci adım kesilse bile ana DB yalnız okunamaz
  // ciphertext bırakır. Aynı sıra kısmi silme sonrası güvenle yinelenebilir.
  try {
    await deleteIndexedDatabase(indexedDb, keyDatabaseName, blockedTimeoutMs);
    await assertIndexedDatabaseAbsent(indexedDb, keyDatabaseName);
    await deleteIndexedDatabase(indexedDb, databaseName, blockedTimeoutMs);
    await assertIndexedDatabaseAbsent(indexedDb, databaseName);
    await assertIndexedDatabaseAbsent(indexedDb, keyDatabaseName);
  } catch {
    throw new Error(
      "Yerel veri ve anahtar silme tamamlanamadı; diğer açık sekmeleri kapatıp aynı işlemi güvenle yeniden deneyin.",
    );
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type IndexedDbStatus =
  | "opening"
  | "ready"
  | "blocked"
  | "versionchange"
  | "closed"
  | "error";

export interface IndexedDbStatusEvent {
  status: IndexedDbStatus;
  oldVersion?: number;
  newVersion?: number | null;
  message?: string;
}

export interface IndexedDbDataStoreOptions {
  databaseName?: string;
  version?: number;
  onStatusChange?: (event: IndexedDbStatusEvent) => void;
  /** Test doubles may inject browser-compatible crypto/IDB implementations. */
  sensitiveVault?: Pick<
    StudentSensitiveVaultOptions,
    "crypto" | "indexedDb" | "onMigrationCheckpoint" | "migrationNow"
  >;
}

const INDEXES_BY_COLLECTION: Partial<
  Record<CollectionName, readonly IndexDefinition[]>
> = {
  classrooms: [
    { name: "by-academic-year", keyPath: "academicYearId" },
    { name: "by-status", keyPath: "status" },
  ],
  students: [
    ...SCOPE_INDEX_DEFINITIONS,
    { name: "by-enrollment-status", keyPath: "enrollmentStatus" },
  ],
  attendanceRecords: [
    ...SCOPE_INDEX_DEFINITIONS,
    { name: "by-civil-date", keyPath: "civilDate" },
    {
      name: "by-classroom-civil-date",
      keyPath: ["classroomId", "civilDate"],
    },
    { name: "by-student-civil-date", keyPath: ["studentId", "civilDate"] },
    { name: "by-student", keyPath: "studentId" },
  ],
  observations: [
    ...SCOPE_INDEX_DEFINITIONS,
    ...OBSERVATION_RELATION_INDEX_DEFINITIONS,
    { name: "by-civil-date", keyPath: "civilDate" },
    {
      name: "by-classroom-civil-date",
      keyPath: ["classroomId", "civilDate"],
    },
    {
      name: "by-student",
      keyPath: "studentIds",
      options: { multiEntry: true },
    },
    { name: "by-observed-at", keyPath: "observedAt" },
  ],
  observationRevisions: [
    { name: "by-observation", keyPath: "observationId" },
    { name: "by-changed-at", keyPath: "changedAt" },
  ],
  activities: [
    ...SCOPE_INDEX_DEFINITIONS,
    { name: "by-plan", keyPath: "planId" },
    { name: "by-civil-date", keyPath: "civilDate" },
  ],
  plans: [
    ...SCOPE_INDEX_DEFINITIONS,
    { name: "by-civil-date", keyPath: "civilDate" },
  ],
  calendarEntries: [
    ...SCOPE_INDEX_DEFINITIONS,
    { name: "by-start-date", keyPath: "startDate" },
    { name: "by-entry-type", keyPath: "entryType" },
  ],
  mediaAssets: [
    {
      name: "by-student",
      keyPath: "studentIds",
      options: { multiEntry: true },
    },
    { name: "by-captured-at", keyPath: "capturedAt" },
    { name: "by-activity", keyPath: "activityId" },
  ],
  evidenceCurriculumLinks: [
    ...SCOPE_INDEX_DEFINITIONS,
    { name: "by-observation", keyPath: "observationId" },
  ],
  valueEvidenceLinks: VALUE_EVIDENCE_LINK_INDEX_DEFINITIONS,
  reportDrafts: [
    ...SCOPE_INDEX_DEFINITIONS,
    { name: "by-civil-date", keyPath: "civilDate" },
  ],
  externalFeedback: [
    ...SCOPE_INDEX_DEFINITIONS,
    { name: "by-student", keyPath: "studentId" },
    { name: "by-received-at", keyPath: "receivedAt" },
    { name: "by-provider", keyPath: "provider" },
  ],
  portfolioSelections: [
    { name: "by-student", keyPath: "studentId" },
    { name: "by-student-period", keyPath: ["studentId", "periodStart"] },
  ],
  settings: [
    ...SCOPE_INDEX_DEFINITIONS,
    { name: "by-setting-type", keyPath: "settingType" },
  ],
};

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () =>
        reject(
          request.error ?? new Error("IndexedDB isteği tamamlanamadı."),
        ),
      { once: true },
    );
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () =>
        reject(
          transaction.error ?? new Error("IndexedDB işlemi geri alındı."),
        ),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(
          transaction.error ?? new Error("IndexedDB işlemi başarısız oldu."),
        ),
      { once: true },
    );
  });
}

function ensureCollectionStores(database: IDBDatabase): void {
  for (const collection of COLLECTION_NAMES) {
    if (!database.objectStoreNames.contains(collection)) {
      database.createObjectStore(collection, { keyPath: "id" });
    }
  }
}

function ensureIndex(
  store: IDBObjectStore,
  definition: IndexDefinition,
): void {
  if (!store.indexNames.contains(definition.name)) {
    store.createIndex(
      definition.name,
      Array.isArray(definition.keyPath)
        ? [...definition.keyPath]
        : definition.keyPath,
      definition.options,
    );
  }
}

function ensureCollectionIndexes(transaction: IDBTransaction): void {
  for (const [collection, definitions] of Object.entries(
    INDEXES_BY_COLLECTION,
  )) {
    const store = transaction.objectStore(collection);
    for (const definition of definitions ?? []) {
      ensureIndex(store, definition);
    }
  }
}

function applyMigration(
  toVersion: number,
  database: IDBDatabase,
  transaction: IDBTransaction,
): void {
  if (toVersion === 1 || toVersion === 2) {
    ensureCollectionStores(database);
    return;
  }
  if (toVersion === 3) {
    ensureCollectionStores(database);
    const recoveryStore = database.objectStoreNames.contains(
      RECOVERY_SNAPSHOT_STORE_NAME,
    )
      ? transaction.objectStore(RECOVERY_SNAPSHOT_STORE_NAME)
      : database.createObjectStore(
        RECOVERY_SNAPSHOT_STORE_NAME,
        { keyPath: "id" },
      );
    if (!recoveryStore.indexNames.contains("by-created-at")) {
      recoveryStore.createIndex("by-created-at", "createdAt");
    }
    ensureCollectionIndexes(transaction);
    return;
  }
  if (toVersion === 4) {
    ensureCollectionStores(database);
    ensureCollectionIndexes(transaction);
    return;
  }
  if (toVersion === 5 || toVersion === 6) {
    ensureCollectionStores(database);
    ensureCollectionIndexes(transaction);
    return;
  }
  if (toVersion === 7 || toVersion === 8) {
    ensureCollectionStores(database);
    ensureCollectionIndexes(transaction);
    if (!database.objectStoreNames.contains(STUDENT_VAULT_STATE_STORE_NAME)) {
      database.createObjectStore(STUDENT_VAULT_STATE_STORE_NAME, {
        keyPath: "id",
      });
    }
    return;
  }
  throw new Error(`IndexedDB migration sürümü desteklenmiyor: ${toVersion}`);
}

function runMigrations(
  database: IDBDatabase,
  transaction: IDBTransaction,
  oldVersion: number,
  newVersion: number,
): void {
  for (const migration of INDEXED_DB_MIGRATIONS) {
    if (
      migration.toVersion > oldVersion &&
      migration.toVersion <= newVersion
    ) {
      applyMigration(migration.toVersion, database, transaction);
    }
  }
}

function validUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} geçerli bir UUID olmalıdır.`);
  }
}

function validCivilDate(value: string): void {
  if (!CIVIL_DATE_PATTERN.test(value)) {
    throw new Error("Takvim günü YYYY-MM-DD biçiminde olmalıdır.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Takvim günü geçersiz.");
  }
}

type RawCollectionState = Partial<
  Record<CollectionName, StoredRecord[]>
>;

function uniqueCollections(
  collections: readonly CollectionName[],
): CollectionName[] {
  return [...new Set(collections)];
}

function recordsEqual(
  left: readonly unknown[],
  right: readonly unknown[],
): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

class StagedDataTransaction implements DataTransaction {
  private readonly state = new Map<CollectionName, StoredRecord[]>();
  private readonly allowedCollections: ReadonlySet<CollectionName>;

  constructor(
    private readonly mode: TransactionMode,
    collections: readonly CollectionName[],
    initial: RawCollectionState,
  ) {
    this.allowedCollections = new Set(collections);
    for (const collection of collections) {
      this.state.set(collection, structuredClone(initial[collection] ?? []));
    }
  }

  async getAll<Collection extends CollectionName>(
    collection: Collection,
  ): Promise<EntityMap[Collection][]> {
    this.assertAllowed(collection);
    return structuredClone(
      (this.state.get(collection) ?? [])
        .slice()
        .sort((left, right) => left.id.localeCompare(right.id)),
    ) as EntityMap[Collection][];
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
    this.assertWritable(collection);
    const current = new Map(
      (this.state.get(collection) ?? []).map((record) => [record.id, record]),
    );
    for (const record of records) {
      if (!record || typeof record.id !== "string") {
        throw new Error("IndexedDB kaydı geçerli bir kimlik içermelidir.");
      }
      current.set(record.id, structuredClone(record));
    }
    this.state.set(collection, [...current.values()]);
  }

  async clear<Collection extends CollectionName>(
    collection: Collection,
  ): Promise<void> {
    this.assertWritable(collection);
    this.state.set(collection, []);
  }

  snapshot(): RawCollectionState {
    return Object.fromEntries(
      [...this.state.entries()].map(([collection, records]) => [
        collection,
        structuredClone(records),
      ]),
    ) as RawCollectionState;
  }

  private assertAllowed(collection: CollectionName): void {
    if (!this.allowedCollections.has(collection)) {
      throw new Error(
        `${collection} koleksiyonu bu IndexedDB işleminin kapsamında değil.`,
      );
    }
  }

  private assertWritable(collection: CollectionName): void {
    this.assertAllowed(collection);
    if (this.mode !== "readwrite") {
      throw new Error("Salt okunur IndexedDB işleminde veri değiştirilemez.");
    }
  }
}

export class IndexedDbDataStore
  implements
    LocalDataStore,
    RecoverySnapshotRepository,
    StudentPrivacyDeletionRepository,
    ClassroomDataQueryRepository
{
  private databasePromise: Promise<IDBDatabase> | undefined;
  private studentWriteQueue: Promise<void> = Promise.resolve();
  private readonly databaseName: string;
  private readonly version: number;
  private sensitiveVault: StudentSensitiveVault | undefined;
  private readonly sensitiveVaultOptions:
    | Pick<
        StudentSensitiveVaultOptions,
        "crypto" | "indexedDb" | "onMigrationCheckpoint" | "migrationNow"
      >
    | undefined;
  private readonly onStatusChange:
    | ((event: IndexedDbStatusEvent) => void)
    | undefined;

  constructor(options: IndexedDbDataStoreOptions = {}) {
    this.databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
    this.version = options.version ?? MAARIFOS_DATABASE_VERSION;
    this.sensitiveVaultOptions = options.sensitiveVault;
    this.onStatusChange = options.onStatusChange;
    if (
      !Number.isInteger(this.version) ||
      this.version < 1 ||
      this.version > MAARIFOS_DATABASE_VERSION
    ) {
      throw new Error("IndexedDB sürümü desteklenen aralığın dışında.");
    }
  }

  async transaction<T>(
    mode: TransactionMode,
    collections: readonly CollectionName[],
    task: (transaction: DataTransaction) => Promise<T>,
  ): Promise<T> {
    if (collections.length === 0) {
      throw new Error("IndexedDB işlemi için en az bir koleksiyon gerekir.");
    }

    const scopedCollections = uniqueCollections(collections);
    const database = await this.open();
    {
      const execute = async (): Promise<T> => {
        const baseline = await this.readRawCollections(
          database,
          scopedCollections,
        );
        const publicState = await this.openSensitiveCollections(
          baseline,
          scopedCollections,
        );
        const transaction = new StagedDataTransaction(
          mode,
          scopedCollections,
          publicState,
        );
        const result = await task(transaction);
        if (mode === "readwrite") {
          const finalPublicState = transaction.snapshot();
          const changed = scopedCollections.some(
            (collection) =>
              !recordsEqual(
                publicState[collection] ?? [],
                finalPublicState[collection] ?? [],
              ),
          );
          if (!changed) return result;
          const finalRawState = await this.sealSensitiveCollections(
            finalPublicState,
            scopedCollections,
            publicState,
            baseline,
          );
          await this.commitRawCollections(
            database,
            scopedCollections,
            baseline,
            finalRawState,
          );
        }
        return result;
      };
      return mode === "readwrite"
        ? this.enqueueStudentWrite(execute)
        : this.withVaultLock(execute, "shared");
    }

  }

  async readSnapshot(): Promise<DataSnapshot> {
    return this.transaction(
      "readonly",
      COLLECTION_NAMES,
      async (transaction) => {
        const snapshot = createEmptySnapshot();
        for (const collection of COLLECTION_NAMES) {
          snapshot[collection] = await transaction.getAll(collection);
        }
        return snapshot;
      },
    );
  }

  async listStudentsByClassroom(
    classroomId: string,
  ): Promise<StudentRecord[]> {
    validUuid(classroomId, "Sınıf kimliği");
    return this.transaction("readonly", ["students"], async (transaction) =>
      (await transaction.getAll("students")).filter(
        (student) => student.classroomId === classroomId,
      ),
    );
  }

  async listAttendanceByClassroomDate(
    classroomId: string,
    civilDate: string,
  ): Promise<AttendanceRecord[]> {
    validUuid(classroomId, "Sınıf kimliği");
    validCivilDate(civilDate);
    return this.queryIndex(
      "attendanceRecords",
      "by-classroom-civil-date",
      [classroomId, civilDate],
    );
  }

  async listAttendanceByStudentDate(
    studentId: string,
    civilDate: string,
  ): Promise<AttendanceRecord[]> {
    validUuid(studentId, "Öğrenci kimliği");
    validCivilDate(civilDate);
    return this.queryIndex(
      "attendanceRecords",
      "by-student-civil-date",
      [studentId, civilDate],
    );
  }

  async listObservationsByClassroomDate(
    classroomId: string,
    civilDate: string,
  ): Promise<ObservationRecord[]> {
    validUuid(classroomId, "Sınıf kimliği");
    validCivilDate(civilDate);
    return this.queryIndex(
      "observations",
      "by-classroom-civil-date",
      [classroomId, civilDate],
    );
  }

  async listObservationsByStudent(
    studentId: string,
  ): Promise<ObservationRecord[]> {
    validUuid(studentId, "Öğrenci kimliği");
    return this.queryIndex("observations", "by-student", studentId);
  }

  async listMediaByStudent(studentId: string): Promise<StoredRecord[]> {
    validUuid(studentId, "Öğrenci kimliği");
    return this.queryIndex("mediaAssets", "by-student", studentId);
  }

  async saveRecoverySnapshot(
    snapshot: RecoverySnapshotRecord,
    options: { retentionLimit?: number } = {},
  ): Promise<RecoverySnapshotMetadata> {
    await this.openRecoveryDatabase();
    return this.enqueueStudentWrite(() => this.saveRecoverySnapshotLocked(snapshot, options));
  }

  private async saveRecoverySnapshotLocked(
    snapshot: RecoverySnapshotRecord,
    options: { retentionLimit?: number },
  ): Promise<RecoverySnapshotMetadata> {
    const {
      recoverySnapshotMetadata,
      validateRecoveryRetentionLimit,
      verifyRecoverySnapshotRecord,
    } = await import("./recovery-snapshot");
    const verified = await verifyRecoverySnapshotRecord(snapshot);
    const retentionLimit = validateRecoveryRetentionLimit(
      options.retentionLimit,
    );
    const database = await this.openRecoveryDatabase();
    const baselineCollections = await this.readRawCollections(
      database,
      COLLECTION_NAMES,
    );
    const currentSnapshot = await this.openSensitiveCollections(
      baselineCollections,
      COLLECTION_NAMES,
    );
    if (
      canonicalJson(currentSnapshot) !== canonicalJson(verified.envelope.payload)
    ) {
      throw new Error(
        "Kurtarma snapshot kaydedilmedi; yerel veri snapshot oluşturulduktan sonra değişti.",
      );
    }
    const baselineRecovery = await this.readRawRecoverySnapshots(database);
    const sealed = await this.getSensitiveVault().sealRecoverySnapshot(verified);
    const byId = new Map(
      baselineRecovery.map((record) => [record.id, structuredClone(record)]),
    );
    byId.set(sealed.id, sealed);
    const finalRecovery = [...byId.values()]
      .sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) ||
          right.id.localeCompare(left.id),
      )
      .slice(0, retentionLimit);
    await this.commitRawCollections(
      database,
      COLLECTION_NAMES,
      baselineCollections,
      baselineCollections,
      { baseline: baselineRecovery, final: finalRecovery },
    );
    return recoverySnapshotMetadata(verified);
  }

  async listRecoverySnapshots(): Promise<RecoverySnapshotMetadata[]> {
    const { recoverySnapshotMetadata, verifyRecoverySnapshotRecord } =
      await import("./recovery-snapshot");
    const snapshots = await this.readAllRecoverySnapshots();
    const verified = await Promise.all(
      snapshots.map((snapshot) => verifyRecoverySnapshotRecord(snapshot)),
    );
    return verified
      .sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) ||
          right.id.localeCompare(left.id),
      )
      .map(recoverySnapshotMetadata);
  }

  async getRecoverySnapshot(
    id: string,
  ): Promise<RecoverySnapshotRecord | null> {
    const { verifyRecoverySnapshotRecord } = await import(
      "./recovery-snapshot"
    );
    validUuid(id, "Kurtarma snapshot kimliği");
    const database = await this.openRecoveryDatabase();
    const nativeTransaction = database.transaction(
      RECOVERY_SNAPSHOT_STORE_NAME,
      "readonly",
    );
    const completion = transactionResult(nativeTransaction);
    const value = await requestResult(
      nativeTransaction
        .objectStore(RECOVERY_SNAPSHOT_STORE_NAME)
        .get(id) as IDBRequest<RecoverySnapshotRecord | undefined>,
    );
    await completion;
    if (!value) return null;
    const opened = await this.getSensitiveVault().openRecoverySnapshot(value);
    return verifyRecoverySnapshotRecord(opened);
  }

  async deleteRecoverySnapshot(id: string): Promise<void> {
    await this.openRecoveryDatabase();
    return this.enqueueStudentWrite(() => this.deleteRecoverySnapshotLocked(id));
  }

  private async deleteRecoverySnapshotLocked(id: string): Promise<void> {
    validUuid(id, "Kurtarma snapshot kimliği");
    const database = await this.openRecoveryDatabase();
    const baseline = await this.readRawRecoverySnapshots(database);
    const final = baseline.filter((snapshot) => snapshot.id !== id);
    if (final.length === baseline.length) return;
    await this.commitRawCollections(database, [], {}, {}, { baseline, final });
  }

  async deleteRecoverySnapshotsContainingStudent(
    studentId: string,
  ): Promise<number> {
    await this.openRecoveryDatabase();
    return this.enqueueStudentWrite(() => this.deleteRecoverySnapshotsContainingStudentLocked(studentId));
  }

  private async deleteRecoverySnapshotsContainingStudentLocked(studentId: string): Promise<number> {
    validUuid(studentId, "Öğrenci kimliği");
    const database = await this.openRecoveryDatabase();
    const baseline = await this.readRawRecoverySnapshots(database);
    const final = baseline.filter(
      (snapshot) =>
        !snapshot.envelope.payload.students.some(
          (student) => student.id === studentId,
        ),
    );
    const deletedCount = baseline.length - final.length;
    if (deletedCount === 0) return 0;
    await this.commitRawCollections(database, [], {}, {}, { baseline, final });
    return deletedCount;
  }

  async transactionWithStudentRecoveryPurge<T>(
    studentId: string,
    task: (transaction: DataTransaction) => Promise<T>,
  ): Promise<StudentRecoveryPurgeResult<T>> {
    validUuid(studentId, "Öğrenci kimliği");
    const database = await this.openRecoveryDatabase();
    return this.enqueueStudentWrite(async () => {
      const baselineCollections = await this.readRawCollections(
        database,
        COLLECTION_NAMES,
      );
      const publicState = await this.openSensitiveCollections(
        baselineCollections,
        COLLECTION_NAMES,
      );
      const transaction = new StagedDataTransaction(
        "readwrite",
        COLLECTION_NAMES,
        publicState,
      );
      const result = await task(transaction);
      const finalRawCollections = await this.sealSensitiveCollections(
        transaction.snapshot(),
        COLLECTION_NAMES,
        publicState,
        baselineCollections,
      );
      const baselineRecovery = await this.readRawRecoverySnapshots(database);
      const finalRecovery: RecoverySnapshotRecord[] = [];
      let purgedRecoverySnapshotCount = 0;
      for (const snapshot of baselineRecovery) {
        const students = snapshot?.envelope?.payload?.students;
        if (!Array.isArray(students)) {
          throw new Error(
            "Kurtarma snapshot yapısı doğrulanamadı; kalıcı silme uygulanmadı.",
          );
        }
        if (students.some((student) => student.id === studentId)) {
          purgedRecoverySnapshotCount += 1;
        } else {
          finalRecovery.push(snapshot);
        }
      }
      await this.commitRawCollections(
        database,
        COLLECTION_NAMES,
        baselineCollections,
        finalRawCollections,
        { baseline: baselineRecovery, final: finalRecovery },
      );
      return { result, purgedRecoverySnapshotCount };
    });
  }

  close(): void {
    const current = this.databasePromise;
    this.databasePromise = undefined;
    if (current) {
      void current
        .then((database) => database.close())
        .catch(() => undefined);
    }
    this.sensitiveVault?.close();
    this.sensitiveVault = undefined;
    this.emitStatus({ status: "closed" });
  }

  async cryptographicallyEraseAllData(): Promise<void> {
    this.close();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await cryptographicallyEraseIndexedDbData({
      databaseName: this.databaseName,
      indexedDb: this.sensitiveVaultOptions?.indexedDb ?? globalThis.indexedDB,
    });
  }

  private emitStatus(event: IndexedDbStatusEvent): void {
    this.onStatusChange?.(event);
  }

  private getSensitiveVault(): StudentSensitiveVault {
    if (!this.sensitiveVault) {
      this.sensitiveVault = new StudentSensitiveVault({
        databaseName: this.databaseName,
        ...this.sensitiveVaultOptions,
      });
    }
    return this.sensitiveVault;
  }

  private enqueueStudentWrite<T>(task: () => Promise<T>): Promise<T> {
    const execute = (): Promise<T> => this.withVaultLock(task, "exclusive");
    const run = this.studentWriteQueue.then(execute, execute);
    this.studentWriteQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private withVaultLock<T>(task: () => Promise<T>, mode: "shared" | "exclusive"): Promise<T> {
    const locks = globalThis.navigator?.locks;
    if (!locks) throw new LocalVaultSecurityError("LOCAL_VAULT_LOCK_UNAVAILABLE",
      "Güvenli yerel veri kilidi bu tarayıcıda kullanılamıyor. Güncel Chrome, Edge veya Safari ile açın; mevcut veriler değiştirilmedi.");
    return locks.request(`maarifos:${this.databaseName}:student-sensitive-write`, { mode }, () => task());
  }

  private async readRawCollections(
    database: IDBDatabase,
    collections: readonly CollectionName[],
  ): Promise<RawCollectionState> {
    const scopedCollections = uniqueCollections(collections);
    const nativeTransaction = database.transaction(
      scopedCollections,
      "readonly",
    );
    const completion = transactionResult(nativeTransaction);
    const pending = scopedCollections.map((collection) =>
      requestResult(
        nativeTransaction.objectStore(collection).getAll() as IDBRequest<
          StoredRecord[]
        >,
      ),
    );
    const values = await Promise.all(pending);
    await completion;
    return Object.fromEntries(
      scopedCollections.map((collection, index) => [
        collection,
        structuredClone(values[index]),
      ]),
    ) as RawCollectionState;
  }

  private async openSensitiveCollections(
    rawState: RawCollectionState,
    collections: readonly CollectionName[],
  ): Promise<RawCollectionState> {
    const opened: RawCollectionState = structuredClone(rawState);
    for (const collection of collections) {
      opened[collection] = await Promise.all((rawState[collection] ?? []).map((record) =>
        this.getSensitiveVault().openCollectionRecord(record, collection),
      ));
    }
    return opened;
  }

  private async sealSensitiveCollections(
    publicState: RawCollectionState,
    collections: readonly CollectionName[],
    baselinePublicState?: RawCollectionState,
    baselineRawState?: RawCollectionState,
  ): Promise<RawCollectionState> {
    const sealed: RawCollectionState = structuredClone(publicState);
    for (const collection of collections) {
      const baselinePublicById = new Map(
        (baselinePublicState?.[collection] ?? []).map((student) => [
          student.id,
          student,
        ]),
      );
      const baselineRawById = new Map(
        (baselineRawState?.[collection] ?? []).map((student) => [
          student.id,
          student,
        ]),
      );
      sealed[collection] = await Promise.all(
        (publicState[collection] ?? []).map((student) => {
          const baselinePublic = baselinePublicById.get(student.id);
          const baselineRaw = baselineRawById.get(student.id);
          if (
            baselinePublic &&
            baselineRaw &&
            recordsEqual([baselinePublic], [student])
          ) {
            return structuredClone(baselineRaw);
          }
          return this.getSensitiveVault().sealCollectionRecord(student, collection);
        }),
      );
    }
    return sealed;
  }

  private async commitRawCollections(
    database: IDBDatabase,
    collections: readonly CollectionName[],
    baseline: RawCollectionState,
    finalState: RawCollectionState,
    recovery?: {
      baseline: readonly RecoverySnapshotRecord[];
      final: readonly RecoverySnapshotRecord[];
    },
  ): Promise<void> {
    const scopedCollections = uniqueCollections(collections);
    const storeNames: string[] = [...scopedCollections];
    if (recovery) storeNames.push(RECOVERY_SNAPSHOT_STORE_NAME);
    const preparations: LocalVaultRetirementPreparation[] = [];
    const requests: Promise<unknown>[] = [];
    const track = <T>(promise: Promise<T>): Promise<T> => {
      // A later synchronous put() error must not leave earlier requests unhandled.
      void promise.catch(() => undefined);
      requests.push(promise);
      return promise;
    };
    let nativeTransaction: IDBTransaction | undefined;
    let settled: Promise<"committed" | "aborted"> | undefined;
    try {
      for (const collection of scopedCollections) {
        preparations.push(await this.getSensitiveVault().prepareCollectionRetirements(collection, finalState[collection] ?? []));
      }
      if (recovery) preparations.push(await this.getSensitiveVault().prepareCommittedRecoverySnapshotRetirements(recovery.final));
      nativeTransaction = openLocalVaultReadwriteTransaction(database, storeNames).transaction;
      const writeTransaction = nativeTransaction;
      settled = new Promise((resolve) => {
        writeTransaction.addEventListener("complete", () => resolve("committed"), { once: true });
        writeTransaction.addEventListener("abort", () => resolve("aborted"), { once: true });
      });
      const completion = track(transactionResult(writeTransaction));
      const collectionReads = scopedCollections.map((collection) =>
        track(requestResult(
          writeTransaction.objectStore(collection).getAll() as IDBRequest<
            StoredRecord[]
          >,
        )),
      );
      const recoveryRead = recovery
        ? track(requestResult(
            writeTransaction
              .objectStore(RECOVERY_SNAPSHOT_STORE_NAME)
              .getAll() as IDBRequest<RecoverySnapshotRecord[]>,
          ))
        : undefined;
      const currentCollections = await Promise.all(collectionReads);
      const currentRecovery = recoveryRead ? await recoveryRead : undefined;
      for (const [index, collection] of scopedCollections.entries()) {
        if (
          !recordsEqual(
            currentCollections[index],
            baseline[collection] ?? [],
          )
        ) {
          throw new Error(
            "Yerel veri işlem sırasında değişti; güvenli yazma uygulanmadı.",
          );
        }
      }
      if (
        recovery &&
        !recordsEqual(
          currentRecovery ?? [],
          recovery.baseline,
        )
      ) {
        throw new Error(
          "Kurtarma snapshot verisi işlem sırasında değişti; güvenli yazma uygulanmadı.",
        );
      }

      const writes: Promise<unknown>[] = [];
      for (const collection of scopedCollections) {
        const store = writeTransaction.objectStore(collection);
        writes.push(track(requestResult(store.clear())));
        for (const record of finalState[collection] ?? []) {
          writes.push(track(requestResult(store.put(structuredClone(record)))));
        }
      }
      if (recovery) {
        const store = writeTransaction.objectStore(
          RECOVERY_SNAPSHOT_STORE_NAME,
        );
        writes.push(track(requestResult(store.clear())));
        for (const snapshot of recovery.final) {
          writes.push(track(requestResult(store.put(structuredClone(snapshot)))));
        }
      }
      await Promise.all(writes);
      await completion;
      for (const collection of scopedCollections) {
        await this.getSensitiveVault().acceptCollectionRecords(collection, finalState[collection] ?? []);
      }
      if (recovery) {
        await this.getSensitiveVault().acceptCommittedRecoverySnapshots(
          recovery.final,
        );
      }
    } catch (error) {
      try {
        nativeTransaction?.abort();
      } catch {
        // Tamamlanmış işlemin özgün hatasını koru.
      }
      const outcome = settled ? await settled : "not-started";
      await Promise.allSettled(requests);
      if (outcome !== "committed" && preparations.length > 0) {
        // The exclusive vault lock still belongs to this live writer. Recheck the
        // complete raw preimage before cancelling only this attempt's intents.
        const proof = database.transaction(storeNames, "readonly");
        const proofCompletion = transactionResult(proof);
        void proofCompletion.catch(() => undefined);
        const values = await Promise.all(storeNames.map((name) => requestResult(proof.objectStore(name).getAll())));
        await proofCompletion;
        const unchanged = scopedCollections.every((collection, index) => recordsEqual(values[index], baseline[collection] ?? [])) &&
          (!recovery || recordsEqual(values[scopedCollections.length], recovery.baseline));
        if (!unchanged) throw new LocalVaultSecurityError("LOCAL_VAULT_REPLAY_DETECTED",
          "İptal edilen işlemden sonra yerel veri değişti; silme hazırlığı güvenlik nedeniyle geri alınmadı.");
        await this.getSensitiveVault().cancelAbortedRetirements(preparations);
      }
      throw error;
    }
  }

  private async ensureStudentVaultV2(database: IDBDatabase): Promise<void> {
    if (
      !database.objectStoreNames.contains(STUDENT_VAULT_STATE_STORE_NAME) ||
      !database.objectStoreNames.contains(RECOVERY_SNAPSHOT_STORE_NAME)
    ) {
      throw new Error(
        "Öğrenci v2 kasası bu veritabanı sürümünde kullanılamıyor.",
      );
    }
    await this.getSensitiveVault().ensureStudentVaultReady({
      readState: () => this.readStudentVaultMigrationState(database),
      commitCutover: (input) =>
        this.commitStudentVaultCutover(database, input),
    });
    await this.ensureAllCollectionsVault(database);
  }

  private async ensureAllCollectionsVault(database: IDBDatabase): Promise<void> {
    const stores = [...COLLECTION_NAMES, RECOVERY_SNAPSHOT_STORE_NAME, STUDENT_VAULT_STATE_STORE_NAME];
    const read = database.transaction(stores, "readonly");
    const done = transactionResult(read);
    const [rawArrays, recovery, marker] = await Promise.all([
      Promise.all(COLLECTION_NAMES.map((name) => requestResult(read.objectStore(name).getAll() as IDBRequest<StoredRecord[]>))),
      requestResult(read.objectStore(RECOVERY_SNAPSHOT_STORE_NAME).getAll() as IDBRequest<RecoverySnapshotRecord[]>),
      requestResult(read.objectStore(STUDENT_VAULT_STATE_STORE_NAME).get(ALL_COLLECTIONS_VAULT_READY_STATE_ID) as IDBRequest<StoredRecord | undefined>),
    ]);
    await done;
    const vault = this.getSensitiveVault();
    const identity = await vault.collectionVaultIdentity();
    const readyMarker = { id: ALL_COLLECTIONS_VAULT_READY_STATE_ID, state: "ready", version: 1,
      collections: [...COLLECTION_NAMES], ...identity };
    const ready = marker !== undefined;
    if (!ready && await vault.allCollectionsReady()) {
      throw new LocalVaultSecurityError("LOCAL_VAULT_STATE_INVALID", "Tam kasa hazır işareti kayıp; eski/açık metin veriye geri dönülmedi.");
    }
    if (marker) {
      if (canonicalJson(marker) !== canonicalJson(readyMarker)) {
        throw new LocalVaultSecurityError("LOCAL_VAULT_SCOPE_MISMATCH", "Tam veri kasasının koleksiyon kapsamı doğrulanamadı.");
      }
    }
    const targetArrays: StoredRecord[][] = [];
    const targetRecovery = structuredClone(recovery);
    const prepare = async (record: StoredRecord, collection: string): Promise<StoredRecord> => {
      if (hasLocalVaultEnvelope(record)) {
        await vault.openCollectionRecord(record, collection);
        return structuredClone(record);
      }
      if (ready) throw new LocalVaultSecurityError("LOCAL_VAULT_MIXED_VERSION", "Hazır tam veri kasasında açık metin kayıt bulundu; erişim durduruldu.");
      const sealed = await vault.sealCollectionRecord(record, collection);
      // Decrypt without promoting the generation before the atomic cutover.
      const verified = await vault.verifyPreparedCollectionRecord(sealed, collection);
      if (canonicalJson(verified) !== canonicalJson(record)) throw new Error("Tam veri kasası geçişinde kaynak mutabakatı başarısız.");
      return sealed;
    };
    for (const [index, collection] of COLLECTION_NAMES.entries()) {
      const records: StoredRecord[] = [];
      for (const record of rawArrays[index]) records.push(await prepare(record, collection));
      targetArrays.push(records);
    }
    for (const snapshot of targetRecovery) {
      for (const collection of COLLECTION_NAMES) {
        const records = snapshot?.envelope?.payload?.[collection];
        if (records === undefined) continue;
        if (!Array.isArray(records)) throw new Error("Kurtarma kopyasının koleksiyon kapsamı eksik.");
        const sealed: StoredRecord[] = [];
        for (const record of records) sealed.push(await prepare(record, `recoverySnapshots/${snapshot.id}/${collection}`));
        snapshot.envelope.payload[collection] = sealed;
      }
    }
    if (!ready) {
      await this.sensitiveVaultOptions?.onMigrationCheckpoint?.("all-vault:prepared");
      const write = openLocalVaultReadwriteTransaction(database, stores).transaction;
      const completed = transactionResult(write);
      try {
        const [currentArrays, currentRecovery, currentMarker] = await Promise.all([
          Promise.all(COLLECTION_NAMES.map((name) => requestResult(write.objectStore(name).getAll() as IDBRequest<StoredRecord[]>))),
          requestResult(write.objectStore(RECOVERY_SNAPSHOT_STORE_NAME).getAll() as IDBRequest<RecoverySnapshotRecord[]>),
          requestResult(write.objectStore(STUDENT_VAULT_STATE_STORE_NAME).get(ALL_COLLECTIONS_VAULT_READY_STATE_ID)),
        ]);
        if (!recordsEqual(currentArrays, rawArrays) || !recordsEqual(currentRecovery, recovery) || currentMarker !== undefined) {
          throw new Error("Tam veri kasası geçişinde kaynak değişti; hiçbir koleksiyon değiştirilmedi. Yeniden deneyin.");
        }
        for (const [index, name] of COLLECTION_NAMES.entries()) {
          const store = write.objectStore(name);
          await requestResult(store.clear());
          for (const record of targetArrays[index]) await requestResult(store.put(record));
        }
        const recoveryStore = write.objectStore(RECOVERY_SNAPSHOT_STORE_NAME);
        await requestResult(recoveryStore.clear());
        for (const snapshot of targetRecovery) await requestResult(recoveryStore.put(snapshot));
        await requestResult(write.objectStore(STUDENT_VAULT_STATE_STORE_NAME).put(readyMarker));
        await completed;
      } catch (error) {
        try { write.abort(); } catch { /* Preserve the original failure. */ }
        await completed.catch(() => undefined);
        throw error;
      }
      await this.sensitiveVaultOptions?.onMigrationCheckpoint?.("all-vault:committed");
    }
    for (const [index, name] of COLLECTION_NAMES.entries()) await vault.acceptCollectionRecords(name, targetArrays[index]);
    await vault.acceptCommittedRecoverySnapshots(targetRecovery);
    await vault.allCollectionsReady(true);
  }

  private async readStudentVaultMigrationState(
    database: IDBDatabase,
  ): Promise<
    StudentVaultMigrationState<{
      students: StoredRecord[];
      recovery: RecoverySnapshotRecord[];
      readyState: unknown;
    }>
  > {
    const transaction = database.transaction(
      [
        "students",
        RECOVERY_SNAPSHOT_STORE_NAME,
        STUDENT_VAULT_STATE_STORE_NAME,
      ],
      "readonly",
    );
    const completion = transactionResult(transaction);
    const [students, recovery, readyState] = await Promise.all([
      requestResult(
        transaction.objectStore("students").getAll() as IDBRequest<
          StoredRecord[]
        >,
      ),
      requestResult(
        transaction
          .objectStore(RECOVERY_SNAPSHOT_STORE_NAME)
          .getAll() as IDBRequest<RecoverySnapshotRecord[]>,
      ),
      requestResult(
        transaction
          .objectStore(STUDENT_VAULT_STATE_STORE_NAME)
          .get(STUDENT_VAULT_READY_STATE_ID) as IDBRequest<unknown>,
      ),
    ]);
    await completion;
    const items: StudentVaultMigrationItem[] = students.map((student) => ({
      itemId: `students\u0000${student.id}`,
      collection: "students",
      record: structuredClone(student),
    }));
    for (const snapshot of recovery) {
      const snapshotStudents = snapshot?.envelope?.payload?.students;
      if (!Array.isArray(snapshotStudents)) {
        throw new Error("Kurtarma snapshot öğrenci yapısı doğrulanamadı.");
      }
      for (const student of snapshotStudents) {
        items.push({
          itemId: `recovery\u0000${snapshot.id}\u0000${student.id}`,
          collection: `recoverySnapshots/${snapshot.id}/students`,
          record: structuredClone(student),
        });
      }
    }
    return {
      readyState: structuredClone(readyState),
      items,
      baseline: {
        students: structuredClone(students),
        recovery: structuredClone(recovery),
        readyState: structuredClone(readyState),
      },
    };
  }

  private async commitStudentVaultCutover(
    database: IDBDatabase,
    input: {
      source: StudentVaultMigrationState<{
        students: StoredRecord[];
        recovery: RecoverySnapshotRecord[];
        readyState: unknown;
      }>;
      sealedRecords: ReadonlyMap<string, LocalVaultSealedRecord>;
      readyState: StudentVaultReadyState;
    },
  ): Promise<void> {
    const transaction = openLocalVaultReadwriteTransaction(
      database,
      [
        "students",
        RECOVERY_SNAPSHOT_STORE_NAME,
        STUDENT_VAULT_STATE_STORE_NAME,
      ],
    ).transaction;
    const completion = transactionResult(transaction);
    try {
      const studentStore = transaction.objectStore("students");
      const recoveryStore = transaction.objectStore(
        RECOVERY_SNAPSHOT_STORE_NAME,
      );
      const stateStore = transaction.objectStore(
        STUDENT_VAULT_STATE_STORE_NAME,
      );
      const [currentStudents, currentRecovery, currentReadyState] =
        await Promise.all([
          requestResult(studentStore.getAll() as IDBRequest<StoredRecord[]>),
          requestResult(
            recoveryStore.getAll() as IDBRequest<RecoverySnapshotRecord[]>,
          ),
          requestResult(
            stateStore.get(STUDENT_VAULT_READY_STATE_ID) as IDBRequest<unknown>,
          ),
        ]);
      if (
        !recordsEqual(currentStudents, input.source.baseline.students) ||
        !recordsEqual(currentRecovery, input.source.baseline.recovery) ||
        !recordsEqual(
          [currentReadyState ?? null],
          [input.source.baseline.readyState ?? null],
        )
      ) {
        throw new Error(
          "Öğrenci kasası migration sırasında değişti; atomik cutover uygulanmadı.",
        );
      }

      const expectedItemCount = input.source.items.length;
      if (input.sealedRecords.size !== expectedItemCount) {
        throw new Error(
          "Öğrenci kasası migration gölge kapsamı doğrulanamadı.",
        );
      }
      const finalStudents = input.source.baseline.students.map((student) => {
        const sealed = input.sealedRecords.get(`students\u0000${student.id}`);
        if (!sealed) {
          throw new Error("Öğrenci kasası migration ana kaydı eksik.");
        }
        return structuredClone(sealed) as unknown as StoredRecord;
      });
      const finalRecovery = input.source.baseline.recovery.map((snapshot) => {
        const migrated = structuredClone(snapshot);
        migrated.envelope.payload.students =
          migrated.envelope.payload.students.map((student) => {
            const sealed = input.sealedRecords.get(
              `recovery\u0000${snapshot.id}\u0000${student.id}`,
            );
            if (!sealed) {
              throw new Error(
                "Öğrenci kasası migration kurtarma kaydı eksik.",
              );
            }
            return structuredClone(sealed) as unknown as StoredRecord;
          });
        return migrated;
      });

      await requestResult(studentStore.clear());
      for (const student of finalStudents) {
        await requestResult(studentStore.put(student));
      }
      await requestResult(recoveryStore.clear());
      for (const snapshot of finalRecovery) {
        await requestResult(recoveryStore.put(snapshot));
      }
      await requestResult(stateStore.put(structuredClone(input.readyState)));
      await completion;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // Tamamlanan işlemin özgün güvenlik hatasını koru.
      }
      await completion.catch(() => undefined);
      throw error;
    }
  }

  private async readRawRecoverySnapshots(
    database: IDBDatabase,
  ): Promise<RecoverySnapshotRecord[]> {
    const nativeTransaction = database.transaction(
      RECOVERY_SNAPSHOT_STORE_NAME,
      "readonly",
    );
    const completion = transactionResult(nativeTransaction);
    const records = await requestResult(
      nativeTransaction
        .objectStore(RECOVERY_SNAPSHOT_STORE_NAME)
        .getAll() as IDBRequest<RecoverySnapshotRecord[]>,
    );
    await completion;
    return structuredClone(records);
  }

  private async queryIndex<Collection extends CollectionName>(
    collection: Collection,
    indexName: string,
    key: IDBValidKey,
  ): Promise<EntityMap[Collection][]> {
    const definition = INDEXES_BY_COLLECTION[collection]?.find((index) => index.name === indexName);
    if (!definition) {
      throw new Error(
        `${collection} koleksiyonu için ${indexName} indeksi kullanılamıyor.`,
      );
    }
    return this.transaction("readonly", [collection], async (transaction) =>
      (await transaction.getAll(collection)).filter((record) => {
        const value = typeof definition.keyPath === "string" ? record[definition.keyPath]
          : definition.keyPath.map((part) => record[part]);
        if (value === undefined || (Array.isArray(value) && value.some(item => item === undefined))) return false;
        return definition.options?.multiEntry && Array.isArray(value)
          ? value.some((item) => canonicalJson(item) === canonicalJson(key))
          : canonicalJson(value ?? null) === canonicalJson(key);
      }),
    );
  }

  private async readAllRecoverySnapshots(): Promise<
    RecoverySnapshotRecord[]
  > {
    const database = await this.openRecoveryDatabase();
    const records = await this.readRawRecoverySnapshots(database);
    return Promise.all(
      records.map((record) =>
        this.getSensitiveVault().openRecoverySnapshot(record),
      ),
    );
  }

  private async openRecoveryDatabase(): Promise<IDBDatabase> {
    const database = await this.open();
    if (!database.objectStoreNames.contains(RECOVERY_SNAPSHOT_STORE_NAME)) {
      throw new Error(
        "Kurtarma snapshot deposu bu veritabanı sürümünde kullanılamıyor.",
      );
    }
    return database;
  }

  private open(): Promise<IDBDatabase> {
    if (!this.databasePromise) {
      this.emitStatus({ status: "opening" });
      let settled = false;
      let upgradeError: Error | undefined;
      const opening = new Promise<IDBDatabase>((resolve, reject) => {
        if (!globalThis.indexedDB) {
          reject(new Error("IndexedDB bu ortamda kullanılamıyor."));
          return;
        }
        const request = indexedDB.open(this.databaseName, this.version);
        request.addEventListener("upgradeneeded", (event) => {
          try {
            const transaction = request.transaction;
            if (!transaction) {
              throw new Error("IndexedDB yükseltme işlemi başlatılamadı.");
            }
            runMigrations(
              request.result,
              transaction,
              event.oldVersion,
              event.newVersion ?? this.version,
            );
          } catch (error) {
            upgradeError =
              error instanceof Error
                ? error
                : new Error("IndexedDB migration işlemi başarısız oldu.");
            try {
              request.transaction?.abort();
            } catch {
              // Abort hatası migration nedenini gölgelememeli.
            }
          }
        });
        request.addEventListener(
          "success",
          () => {
            const database = request.result;
            if (settled) {
              database.close();
              return;
            }
            database.addEventListener("versionchange", (event) => {
              database.close();
              if (this.databasePromise === opening) {
                this.databasePromise = undefined;
              }
              this.emitStatus({
                status: "versionchange",
                oldVersion: event.oldVersion,
                newVersion: event.newVersion,
                message:
                  "Yeni veri sürümü için eski sekme bağlantısı güvenle kapatıldı.",
              });
            });
            void this.enqueueStudentWrite(() => this.ensureStudentVaultV2(database)).then(
              () => {
                if (settled) {
                  database.close();
                  return;
                }
                settled = true;
                this.emitStatus({ status: "ready" });
                resolve(database);
              },
              (error: unknown) => {
                if (settled) return;
                settled = true;
                database.close();
                const safeError =
                  error instanceof Error
                    ? error
                    : new Error(
                        "Hassas öğrenci verisi güvenle hazırlanamadı.",
                      );
                this.emitStatus({
                  status: "error",
                  message: safeError.message,
                });
                reject(safeError);
              },
            );
          },
          { once: true },
        );
        request.addEventListener(
          "blocked",
          (event) => {
            this.emitStatus({
              status: "blocked",
              oldVersion: event.oldVersion,
              newVersion: event.newVersion,
              message:
                "Yerel veritabanı başka bir sekme tarafından kilitli.",
            });
            if (!settled) {
              settled = true;
              reject(
                new Error(
                  "Yerel veritabanı başka bir sekme tarafından kilitli. Diğer sekmeyi kapatıp yeniden deneyin.",
                ),
              );
            }
          },
          { once: true },
        );
        request.addEventListener(
          "error",
          () => {
            if (settled) return;
            settled = true;
            const error =
              upgradeError ??
              request.error ??
              new Error("Yerel veritabanı açılamadı.");
            this.emitStatus({ status: "error", message: error.message });
            reject(error);
          },
          { once: true },
        );
      });
      this.databasePromise = opening;
      void opening.catch(() => {
        if (this.databasePromise === opening) {
          this.databasePromise = undefined;
        }
      });
    }
    return this.databasePromise;
  }
}
