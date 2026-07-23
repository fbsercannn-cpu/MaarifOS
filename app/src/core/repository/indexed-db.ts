import {
  COLLECTION_NAMES,
  createEmptySnapshot,
  type CollectionName,
  type DataSnapshot,
  type StoredRecord,
} from "../domain/model";
import type {
  DataTransaction,
  LocalDataStore,
  TransactionMode,
} from "./contracts";

export const MAARIFOS_DATABASE_VERSION = 2;
export const DEFAULT_DATABASE_NAME = "maarifos-local";

export interface IndexedDbDataStoreOptions {
  databaseName?: string;
  version?: number;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB isteği tamamlanamadı.")),
      { once: true },
    );
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("IndexedDB işlemi geri alındı.")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB işlemi başarısız oldu.")),
      { once: true },
    );
  });
}

class IndexedDbTransaction implements DataTransaction {
  constructor(private readonly transaction: IDBTransaction) {}

  async getAll(collection: CollectionName): Promise<StoredRecord[]> {
    const records = await requestResult(
      this.transaction.objectStore(collection).getAll() as IDBRequest<StoredRecord[]>,
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

export class IndexedDbDataStore implements LocalDataStore {
  private databasePromise: Promise<IDBDatabase> | undefined;
  private readonly databaseName: string;
  private readonly version: number;

  constructor(options: IndexedDbDataStoreOptions = {}) {
    this.databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
    this.version = options.version ?? MAARIFOS_DATABASE_VERSION;
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
    return this.transaction("readonly", COLLECTION_NAMES, async (transaction) => {
      const snapshot = createEmptySnapshot();
      for (const collection of COLLECTION_NAMES) {
        snapshot[collection] = await transaction.getAll(collection);
      }
      return snapshot;
    });
  }

  close(): void {
    if (this.databasePromise) {
      void this.databasePromise.then((database) => database.close());
      this.databasePromise = undefined;
    }
  }

  private open(): Promise<IDBDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.databaseName, this.version);
        request.addEventListener("upgradeneeded", () => {
          const database = request.result;
          for (const collection of COLLECTION_NAMES) {
            if (!database.objectStoreNames.contains(collection)) {
              database.createObjectStore(collection, { keyPath: "id" });
            }
          }
        });
        request.addEventListener("success", () => resolve(request.result), { once: true });
        request.addEventListener(
          "blocked",
          () => reject(new Error("Yerel veritabanı başka bir sekme tarafından kilitli.")),
          { once: true },
        );
        request.addEventListener(
          "error",
          () => reject(request.error ?? new Error("Yerel veritabanı açılamadı.")),
          { once: true },
        );
      });
    }
    return this.databasePromise;
  }
}
