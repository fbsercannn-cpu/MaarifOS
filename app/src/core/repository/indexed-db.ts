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
  type StudentSensitiveVaultOptions,
} from "../security/student-sensitive-vault.ts";
import {
  INDEXED_DB_MIGRATIONS,
  MAARIFOS_DATABASE_VERSION,
  SCOPE_INDEX_DEFINITIONS,
  VALUE_EVIDENCE_LINK_INDEX_DEFINITIONS,
  type IndexDefinition,
} from "./indexed-db-definitions.ts";

export {
  INDEXED_DB_MIGRATIONS,
  MAARIFOS_DATABASE_VERSION,
  VALUE_EVIDENCE_LINK_INDEX_DEFINITIONS,
} from "./indexed-db-definitions.ts";

export const DEFAULT_DATABASE_NAME = "maarifos-local";
export const RECOVERY_SNAPSHOT_STORE_NAME =
  "__maarifosRecoverySnapshots";

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
  sensitiveVault?: Pick<StudentSensitiveVaultOptions, "crypto" | "indexedDb">;
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
  if (toVersion === 5) {
    ensureCollectionStores(database);
    ensureCollectionIndexes(transaction);
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

class IndexedDbTransaction implements DataTransaction {
  constructor(private readonly transaction: IDBTransaction) {}

  async getAll<Collection extends CollectionName>(
    collection: Collection,
  ): Promise<EntityMap[Collection][]> {
    const records = await requestResult(
      this.transaction
        .objectStore(collection)
        .getAll() as IDBRequest<EntityMap[Collection][]>,
    );
    return structuredClone(records);
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
    const store = this.transaction.objectStore(collection);
    for (const record of records) {
      await requestResult(store.put(structuredClone(record)));
    }
  }

  async clear<Collection extends CollectionName>(
    collection: Collection,
  ): Promise<void> {
    await requestResult(this.transaction.objectStore(collection).clear());
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

function studentSubject(studentId: string): string {
  return `student:${studentId}`;
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
    | Pick<StudentSensitiveVaultOptions, "crypto" | "indexedDb">
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
    if (scopedCollections.includes("students")) {
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
        : execute();
    }

    const nativeTransaction = database.transaction(scopedCollections, mode);
    const completion = transactionResult(nativeTransaction);
    const transaction = new IndexedDbTransaction(nativeTransaction);

    try {
      const result = await task(transaction);
      await completion;
      return result;
    } catch (error) {
      try {
        nativeTransaction.abort();
      } catch {
        // İşlem zaten tamamlandıysa abort InvalidStateError üretir; asıl hatayı koru.
      }
      await completion.catch(() => undefined);
      throw error;
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
    validUuid(id, "Kurtarma snapshot kimliği");
    const database = await this.openRecoveryDatabase();
    const nativeTransaction = database.transaction(
      RECOVERY_SNAPSHOT_STORE_NAME,
      "readwrite",
    );
    const completion = transactionResult(nativeTransaction);
    await requestResult(
      nativeTransaction
        .objectStore(RECOVERY_SNAPSHOT_STORE_NAME)
        .delete(id),
    );
    await completion;
  }

  async deleteRecoverySnapshotsContainingStudent(
    studentId: string,
  ): Promise<number> {
    validUuid(studentId, "Öğrenci kimliği");
    const database = await this.openRecoveryDatabase();
    const nativeTransaction = database.transaction(
      RECOVERY_SNAPSHOT_STORE_NAME,
      "readwrite",
    );
    const completion = transactionResult(nativeTransaction);
    try {
      const store = nativeTransaction.objectStore(
        RECOVERY_SNAPSHOT_STORE_NAME,
      );
      const snapshots = await requestResult(
        store.getAll() as IDBRequest<RecoverySnapshotRecord[]>,
      );
      const matchingSnapshots = snapshots.filter((snapshot) =>
        snapshot.envelope.payload.students.some(
          (student) => student.id === studentId,
        ),
      );
      for (const snapshot of matchingSnapshots) {
        await requestResult(store.delete(snapshot.id));
      }
      await completion;
      return matchingSnapshots.length;
    } catch (error) {
      try {
        nativeTransaction.abort();
      } catch {
        // Tamamlanmış işlemin asıl hatasını koru.
      }
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async transactionWithStudentRecoveryPurge<T>(
    studentId: string,
    task: (transaction: DataTransaction) => Promise<T>,
  ): Promise<StudentRecoveryPurgeResult<T>> {
    validUuid(studentId, "Öğrenci kimliği");
    return this.enqueueStudentWrite(async () => {
      const database = await this.openRecoveryDatabase();
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
    const execute = (): Promise<T> => {
      const locks = globalThis.navigator?.locks;
      if (!locks) return task();
      return locks.request(
        `maarifos:${this.databaseName}:student-sensitive-write`,
        { mode: "exclusive" },
        () => task(),
      );
    };
    const run = this.studentWriteQueue.then(execute, execute);
    this.studentWriteQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
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
    if (collections.includes("students")) {
      opened.students = await Promise.all(
        (rawState.students ?? []).map((student) =>
          this.getSensitiveVault().openStudentRecord(
            student,
            studentSubject(student.id),
          ),
        ),
      );
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
    if (collections.includes("students")) {
      const baselinePublicById = new Map(
        (baselinePublicState?.students ?? []).map((student) => [
          student.id,
          student,
        ]),
      );
      const baselineRawById = new Map(
        (baselineRawState?.students ?? []).map((student) => [
          student.id,
          student,
        ]),
      );
      sealed.students = await Promise.all(
        (publicState.students ?? []).map((student) => {
          const baselinePublic = baselinePublicById.get(student.id);
          const baselineRaw = baselineRawById.get(student.id);
          if (
            baselinePublic &&
            baselineRaw &&
            recordsEqual([baselinePublic], [student])
          ) {
            return structuredClone(baselineRaw);
          }
          return this.getSensitiveVault().sealStudentRecord(
            student,
            studentSubject(student.id),
          );
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
    const nativeTransaction = database.transaction(storeNames, "readwrite");
    const completion = transactionResult(nativeTransaction);
    try {
      const collectionReads = scopedCollections.map((collection) =>
        requestResult(
          nativeTransaction.objectStore(collection).getAll() as IDBRequest<
            StoredRecord[]
          >,
        ),
      );
      const recoveryRead = recovery
        ? requestResult(
            nativeTransaction
              .objectStore(RECOVERY_SNAPSHOT_STORE_NAME)
              .getAll() as IDBRequest<RecoverySnapshotRecord[]>,
          )
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
        const store = nativeTransaction.objectStore(collection);
        writes.push(requestResult(store.clear()));
        for (const record of finalState[collection] ?? []) {
          writes.push(requestResult(store.put(structuredClone(record))));
        }
      }
      if (recovery) {
        const store = nativeTransaction.objectStore(
          RECOVERY_SNAPSHOT_STORE_NAME,
        );
        writes.push(requestResult(store.clear()));
        for (const snapshot of recovery.final) {
          writes.push(requestResult(store.put(structuredClone(snapshot))));
        }
      }
      await Promise.all(writes);
      await completion;
    } catch (error) {
      try {
        nativeTransaction.abort();
      } catch {
        // Tamamlanmış işlemin özgün hatasını koru.
      }
      await completion.catch(() => undefined);
      throw error;
    }
  }

  private async migrateLegacySensitiveData(
    database: IDBDatabase,
  ): Promise<void> {
    const includesRecovery = database.objectStoreNames.contains(
      RECOVERY_SNAPSHOT_STORE_NAME,
    );
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const baselineStudents = await this.readRawCollections(database, [
        "students",
      ]);
      const baselineRecovery = includesRecovery
        ? await this.readRawRecoverySnapshots(database)
        : [];
      let changed = false;
      const migratedStudents = await Promise.all(
        (baselineStudents.students ?? []).map(async (student) => {
          const migrated = await this.getSensitiveVault().migrateStudentRecord(
            student,
            studentSubject(student.id),
          );
          changed ||= migrated.changed;
          return migrated.record;
        }),
      );
      const migratedRecovery = await Promise.all(
        baselineRecovery.map(async (snapshot) => {
          const migrated =
            await this.getSensitiveVault().migrateRecoverySnapshot(snapshot);
          changed ||= migrated.changed;
          return migrated.snapshot;
        }),
      );
      if (!changed) return;
      try {
        await this.commitRawCollections(
          database,
          ["students"],
          baselineStudents,
          { students: migratedStudents },
          includesRecovery
            ? { baseline: baselineRecovery, final: migratedRecovery }
            : undefined,
        );
        return;
      } catch (error) {
        const retryable =
          error instanceof Error &&
          error.message.includes("işlem sırasında değişti");
        if (!retryable || attempt === 2) throw error;
      }
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
    const database = await this.open();
    const nativeTransaction = database.transaction(collection, "readonly");
    const completion = transactionResult(nativeTransaction);
    const objectStore = nativeTransaction.objectStore(collection);
    if (!objectStore.indexNames.contains(indexName)) {
      throw new Error(
        `${collection} koleksiyonu için ${indexName} indeksi kullanılamıyor.`,
      );
    }
    const records = await requestResult(
      objectStore.index(indexName).getAll(IDBKeyRange.only(key)) as IDBRequest<
        EntityMap[Collection][]
      >,
    );
    await completion;
    return structuredClone(records);
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
            void this.migrateLegacySensitiveData(database).then(
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
