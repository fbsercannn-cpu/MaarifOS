import type {
  CollectionName,
  DataSnapshot,
  StoredRecord,
} from "../domain/model";

export type TransactionMode = "readonly" | "readwrite";

export interface DataTransaction {
  getAll(collection: CollectionName): Promise<StoredRecord[]>;
  putMany(collection: CollectionName, records: readonly StoredRecord[]): Promise<void>;
  clear(collection: CollectionName): Promise<void>;
}

export interface LocalDataStore {
  transaction<T>(
    mode: TransactionMode,
    collections: readonly CollectionName[],
    task: (transaction: DataTransaction) => Promise<T>,
  ): Promise<T>;
  readSnapshot(): Promise<DataSnapshot>;
  close(): void;
}

