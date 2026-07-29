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
  TransactionMode,
} from "./contracts";
import {
  recoverySnapshotMetadata,
  validateRecoveryRetentionLimit,
  verifyRecoverySnapshotRecord,
} from "./recovery-snapshot";

export const MAARIFOS_DATABASE_VERSION = 4;
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
}

interface IndexDefinition {
  name: string;
  keyPath: string | readonly string[];
  options?: IDBIndexParameters;
}

const SCOPE_INDEXES = [
  { name: "by-classroom", keyPath: "classroomId" },
  {
    name: "by-academic-year-classroom",
    keyPath: ["academicYearId", "classroomId"],
  },
] as const satisfies readonly IndexDefinition[];

const INDEXES_BY_COLLECTION: Partial<
  Record<CollectionName, readonly IndexDefinition[]>
> = {
  classrooms: [
    { name: "by-academic-year", keyPath: "academicYearId" },
    { name: "by-status", keyPath: "status" },
  ],
  students: [
    ...SCOPE_INDEXES,
    { name: "by-enrollment-status", keyPath: "enrollmentStatus" },
  ],
  attendanceRecords: [
    ...SCOPE_INDEXES,
    { name: "by-civil-date", keyPath: "civilDate" },
    {
      name: "by-classroom-civil-date",
      keyPath: ["classroomId", "civilDate"],
    },
    { name: "by-student-civil-date", keyPath: ["studentId", "civilDate"] },
    { name: "by-student", keyPath: "studentId" },
  ],
  observations: [
    ...SCOPE_INDEXES,
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
    ...SCOPE_INDEXES,
    { name: "by-plan", keyPath: "planId" },
    { name: "by-civil-date", keyPath: "civilDate" },
  ],
  plans: [
    ...SCOPE_INDEXES,
    { name: "by-civil-date", keyPath: "civilDate" },
  ],
  calendarEntries: [
    ...SCOPE_INDEXES,
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
    ...SCOPE_INDEXES,
    { name: "by-observation", keyPath: "observationId" },
  ],
  reportDrafts: [
    ...SCOPE_INDEXES,
    { name: "by-civil-date", keyPath: "civilDate" },
  ],
  externalFeedback: [
    ...SCOPE_INDEXES,
    { name: "by-student", keyPath: "studentId" },
    { name: "by-received-at", keyPath: "receivedAt" },
    { name: "by-provider", keyPath: "provider" },
  ],
  portfolioSelections: [
    { name: "by-student", keyPath: "studentId" },
    { name: "by-student-period", keyPath: ["studentId", "periodStart"] },
  ],
  settings: [
    ...SCOPE_INDEXES,
    { name: "by-setting-type", keyPath: "settingType" },
  ],
};

export interface IndexedDbMigration {
  toVersion: number;
  description: string;
}

export const INDEXED_DB_MIGRATIONS: readonly IndexedDbMigration[] = [
  {
    toVersion: 1,
    description: "Kanonik veri koleksiyonlarını oluşturur.",
  },
  {
    toVersion: 2,
    description: "Yeni kanonik koleksiyonları kayıp olmadan tamamlar.",
  },
  {
    toVersion: 3,
    description:
      "Kurtarma snapshot deposunu ve sınıf/tarih/öğrenci indekslerini ekler.",
  },
  {
    toVersion: 4,
    description:
      "Eğitim takvimi ile haricî AI geri bildirim koleksiyonlarını ve indekslerini ekler.",
  },
] as const;

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

  async getAll(collection: CollectionName): Promise<StoredRecord[]> {
    const records = await requestResult(
      this.transaction
        .objectStore(collection)
        .getAll() as IDBRequest<StoredRecord[]>,
    );
    return structuredClone(records);
  }

  async putMany(
    collection: CollectionName,
    records: readonly StoredRecord[],
  ): Promise<void> {
    const store = this.transaction.objectStore(collection);
    for (const record of records) {
      await requestResult(store.put(structuredClone(record)));
    }
  }

  async clear(collection: CollectionName): Promise<void> {
    await requestResult(this.transaction.objectStore(collection).clear());
  }
}

export class IndexedDbDataStore
  implements
    LocalDataStore,
    RecoverySnapshotRepository,
    ClassroomDataQueryRepository
{
  private databasePromise: Promise<IDBDatabase> | undefined;
  private readonly databaseName: string;
  private readonly version: number;
  private readonly onStatusChange:
    | ((event: IndexedDbStatusEvent) => void)
    | undefined;

  constructor(options: IndexedDbDataStoreOptions = {}) {
    this.databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
    this.version = options.version ?? MAARIFOS_DATABASE_VERSION;
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

    const database = await this.open();
    const nativeTransaction = database.transaction([...collections], mode);
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
  ): Promise<StoredRecord[]> {
    validUuid(classroomId, "Sınıf kimliği");
    return this.queryIndex("students", "by-classroom", classroomId);
  }

  async listAttendanceByClassroomDate(
    classroomId: string,
    civilDate: string,
  ): Promise<StoredRecord[]> {
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
  ): Promise<StoredRecord[]> {
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
  ): Promise<StoredRecord[]> {
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
  ): Promise<StoredRecord[]> {
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
    const verified = await verifyRecoverySnapshotRecord(snapshot);
    const retentionLimit = validateRecoveryRetentionLimit(
      options.retentionLimit,
    );
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
      await requestResult(store.put(structuredClone(verified)));
      const all = await requestResult(
        store.getAll() as IDBRequest<RecoverySnapshotRecord[]>,
      );
      const newest = [...all].sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) ||
          right.id.localeCompare(left.id),
      );
      for (const stale of newest.slice(retentionLimit)) {
        await requestResult(store.delete(stale.id));
      }
      await completion;
      return recoverySnapshotMetadata(verified);
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

  async listRecoverySnapshots(): Promise<RecoverySnapshotMetadata[]> {
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
    return value ? verifyRecoverySnapshotRecord(value) : null;
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

  close(): void {
    const current = this.databasePromise;
    this.databasePromise = undefined;
    if (current) {
      void current
        .then((database) => database.close())
        .catch(() => undefined);
    }
    this.emitStatus({ status: "closed" });
  }

  private emitStatus(event: IndexedDbStatusEvent): void {
    this.onStatusChange?.(event);
  }

  private async queryIndex(
    collection: CollectionName,
    indexName: string,
    key: IDBValidKey,
  ): Promise<StoredRecord[]> {
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
        StoredRecord[]
      >,
    );
    await completion;
    return structuredClone(records);
  }

  private async readAllRecoverySnapshots(): Promise<
    RecoverySnapshotRecord[]
  > {
    const database = await this.openRecoveryDatabase();
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
            settled = true;
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
            this.emitStatus({ status: "ready" });
            resolve(database);
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
