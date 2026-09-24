import type { PremiumEntitlementClaims } from "./entitlement.ts";

export const PREMIUM_LICENSE_DATABASE_NAME = "maarifos-license";
export const PREMIUM_LICENSE_DATABASE_VERSION = 2;
export const PREMIUM_LICENSE_DATABASE_OPEN_TIMEOUT_MS = 8_000;
const ENTITLEMENT_STORE = "entitlements";
const DEVICE_IDENTITY_STORE = "device-identities";
const ACTIVE_ENTITLEMENT_KEY = "active";
const ACTIVE_DEVICE_IDENTITY_KEY = "active-device";

export type PremiumLicenseStorageFailure =
  | "open-blocked"
  | "open-timeout"
  | "version-changed"
  | "operation-failed";

export class PremiumLicenseStorageError extends Error {
  readonly name = "PremiumLicenseStorageError";
  readonly reason: PremiumLicenseStorageFailure;
  readonly domExceptionName: string | null;

  constructor(
    reason: PremiumLicenseStorageFailure,
    message: string,
    options: { cause?: unknown; domExceptionName?: string | null } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.reason = reason;
    this.domExceptionName = options.domExceptionName ?? null;
  }
}

export interface StoredPremiumEntitlement {
  id: typeof ACTIVE_ENTITLEMENT_KEY;
  token: string;
  claims: PremiumEntitlementClaims;
  savedAtUtc: string;
  maxObservedWallClockUtc: string;
}

export interface PremiumEntitlementStore {
  load(): Promise<StoredPremiumEntitlement | null>;
  save(record: Omit<StoredPremiumEntitlement, "id">): Promise<void>;
  updateMaxObservedWallClock(now: Date): Promise<void>;
  clear(): Promise<void>;
  close(): void;
}

export interface StoredPremiumDeviceIdentity {
  id: typeof ACTIVE_DEVICE_IDENTITY_KEY;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicJwk: JsonWebKey;
  thumbprint: string;
  createdAtUtc: string;
}

export interface PremiumDeviceIdentityStore {
  load(): Promise<StoredPremiumDeviceIdentity | null>;
  createIfAbsent(
    record: Omit<StoredPremiumDeviceIdentity, "id">,
  ): Promise<StoredPremiumDeviceIdentity>;
  clear(): Promise<void>;
  reopen?(): Promise<void>;
  close(): void;
}

function copyStoredDeviceIdentity(
  record: StoredPremiumDeviceIdentity,
): StoredPremiumDeviceIdentity {
  return {
    id: record.id,
    publicKey: record.publicKey,
    privateKey: record.privateKey,
    publicJwk: structuredClone(record.publicJwk),
    thumbprint: record.thumbprint,
    createdAtUtc: record.createdAtUtc,
  };
}

function domExceptionName(error: unknown): string | null {
  return error instanceof DOMException ? error.name : null;
}

function operationError(error: unknown, message: string): PremiumLicenseStorageError {
  if (error instanceof PremiumLicenseStorageError) return error;
  return new PremiumLicenseStorageError("operation-failed", message, {
    cause: error,
    domExceptionName: domExceptionName(error),
  });
}

function openDatabase(
  databaseName: string,
  onVersionChange: () => void,
  openTimeoutMs = PREMIUM_LICENSE_DATABASE_OPEN_TIMEOUT_MS,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDB.open(databaseName, PREMIUM_LICENSE_DATABASE_VERSION);
    const timeout = globalThis.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new PremiumLicenseStorageError(
        "open-timeout",
        "Premium lisans deposu zamanında açılamadı.",
      ));
    }, openTimeoutMs);
    const rejectOnce = (error: PremiumLicenseStorageError) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeout);
      reject(error);
    };
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ENTITLEMENT_STORE)) {
        database.createObjectStore(ENTITLEMENT_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(DEVICE_IDENTITY_STORE)) {
        database.createObjectStore(DEVICE_IDENTITY_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      settled = true;
      globalThis.clearTimeout(timeout);
      database.onversionchange = () => {
        onVersionChange();
        database.close();
      };
      resolve(database);
    };
    request.onerror = () => rejectOnce(new PremiumLicenseStorageError(
      "operation-failed",
      "Premium lisans deposu açılamadı.",
      {
        cause: request.error,
        domExceptionName: domExceptionName(request.error),
      },
    ));
    request.onblocked = () => rejectOnce(new PremiumLicenseStorageError(
      "open-blocked",
      "Premium lisans deposu başka bir MaarifOS sekmesi tarafından engellendi.",
    ));
  });
}

function requestResult<T>(request: IDBRequest<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new PremiumLicenseStorageError(
      "operation-failed",
      message,
      {
        cause: request.error,
        domExceptionName: domExceptionName(request.error),
      },
    ));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(new PremiumLicenseStorageError(
      "operation-failed",
      "Premium lisans deposu işlemi güvenle geri alındı.",
      {
        cause: transaction.error,
        domExceptionName: domExceptionName(transaction.error),
      },
    ));
    transaction.onerror = () => reject(new PremiumLicenseStorageError(
      "operation-failed",
      "Premium lisans deposu işlemi başarısız.",
      {
        cause: transaction.error,
        domExceptionName: domExceptionName(transaction.error),
      },
    ));
  });
}

class PremiumLicenseDatabaseHandle {
  private databasePromise: Promise<IDBDatabase> | null = null;
  private fatalError: PremiumLicenseStorageError | null = null;
  private readonly databaseName: string;

  constructor(databaseName: string) {
    this.databaseName = databaseName;
  }

  database(): Promise<IDBDatabase> {
    if (this.fatalError) return Promise.reject(this.fatalError);
    this.databasePromise ??= openDatabase(this.databaseName, () => {
      this.fatalError = new PremiumLicenseStorageError(
        "version-changed",
        "Premium lisans deposu başka bir sürüm tarafından değiştirildi. Bu ekran güvenlik için kapatıldı.",
      );
      this.databasePromise = null;
    });
    return this.databasePromise;
  }

  async reopen(): Promise<void> {
    const current = this.databasePromise;
    this.databasePromise = null;
    if (!current) return;
    try {
      (await current).close();
    } catch {
      // Yeniden açma, önceki başarısız açılışın güvenli biçimde bırakılmasıdır.
    }
  }

  close(): void {
    this.releaseConnection();
  }

  private releaseConnection(): void {
    const current = this.databasePromise;
    this.databasePromise = null;
    if (current) {
      void current.then(
        (database) => database.close(),
        () => undefined,
      );
    }
  }
}

export class IndexedDbPremiumEntitlementStore implements PremiumEntitlementStore {
  private readonly connection: PremiumLicenseDatabaseHandle;

  constructor(databaseName = PREMIUM_LICENSE_DATABASE_NAME) {
    this.connection = new PremiumLicenseDatabaseHandle(databaseName);
  }

  private database(): Promise<IDBDatabase> {
    return this.connection.database();
  }

  async load(): Promise<StoredPremiumEntitlement | null> {
    try {
      const database = await this.database();
      const transaction = database.transaction(ENTITLEMENT_STORE, "readonly");
      const result = await requestResult(
        transaction.objectStore(ENTITLEMENT_STORE).get(ACTIVE_ENTITLEMENT_KEY),
        "Premium entitlement kaydı okunamadı.",
      );
      return result ? structuredClone(result as StoredPremiumEntitlement) : null;
    } catch (error) {
      throw operationError(error, "Premium entitlement kaydı okunamadı.");
    }
  }

  async save(record: Omit<StoredPremiumEntitlement, "id">): Promise<void> {
    try {
      const database = await this.database();
      const transaction = database.transaction(ENTITLEMENT_STORE, "readwrite");
      transaction.objectStore(ENTITLEMENT_STORE).put({
        ...structuredClone(record),
        id: ACTIVE_ENTITLEMENT_KEY,
      });
      await transactionDone(transaction);
    } catch (error) {
      throw operationError(error, "Premium entitlement kaydı yazılamadı.");
    }
  }

  async updateMaxObservedWallClock(now: Date): Promise<void> {
    if (Number.isNaN(now.getTime())) throw new Error("Lisans cihaz zamanı geçersiz.");
    try {
      const database = await this.database();
      const transaction = database.transaction(ENTITLEMENT_STORE, "readwrite");
      const store = transaction.objectStore(ENTITLEMENT_STORE);
      const current = await requestResult(
        store.get(ACTIVE_ENTITLEMENT_KEY),
        "Premium entitlement cihaz zamanı okunamadı.",
      ) as StoredPremiumEntitlement | undefined;
      if (!current) {
        await transactionDone(transaction);
        return;
      }
      const currentTime = new Date(current.maxObservedWallClockUtc);
      if (Number.isNaN(currentTime.getTime())) {
        transaction.abort();
        throw new Error("Saklanan lisans cihaz zamanı geçersiz.");
      }
      const next = new Date(
        Math.max(currentTime.getTime(), now.getTime()),
      ).toISOString();
      store.put({
        id: ACTIVE_ENTITLEMENT_KEY,
        token: current.token,
        claims: current.claims,
        savedAtUtc: current.savedAtUtc,
        maxObservedWallClockUtc: next,
      });
      await transactionDone(transaction);
    } catch (error) {
      throw operationError(error, "Premium entitlement cihaz zamanı güncellenemedi.");
    }
  }

  async clear(): Promise<void> {
    try {
      const database = await this.database();
      const transaction = database.transaction(ENTITLEMENT_STORE, "readwrite");
      transaction.objectStore(ENTITLEMENT_STORE).delete(ACTIVE_ENTITLEMENT_KEY);
      await transactionDone(transaction);
    } catch (error) {
      throw operationError(error, "Premium entitlement kaydı temizlenemedi.");
    }
  }

  close(): void {
    this.connection.close();
  }
}

export class IndexedDbPremiumDeviceIdentityStore implements PremiumDeviceIdentityStore {
  private readonly connection: PremiumLicenseDatabaseHandle;

  constructor(databaseName = PREMIUM_LICENSE_DATABASE_NAME) {
    this.connection = new PremiumLicenseDatabaseHandle(databaseName);
  }

  private database(): Promise<IDBDatabase> {
    return this.connection.database();
  }

  async load(): Promise<StoredPremiumDeviceIdentity | null> {
    try {
      const database = await this.database();
      const transaction = database.transaction(DEVICE_IDENTITY_STORE, "readonly");
      const result = await requestResult(
        transaction.objectStore(DEVICE_IDENTITY_STORE).get(ACTIVE_DEVICE_IDENTITY_KEY),
        "Premium cihaz anahtarı okunamadı.",
      );
      return result
        ? copyStoredDeviceIdentity(result as StoredPremiumDeviceIdentity)
        : null;
    } catch (error) {
      throw operationError(error, "Premium cihaz anahtarı okunamadı.");
    }
  }

  async createIfAbsent(
    record: Omit<StoredPremiumDeviceIdentity, "id">,
  ): Promise<StoredPremiumDeviceIdentity> {
    try {
      const database = await this.database();
      const transaction = database.transaction(DEVICE_IDENTITY_STORE, "readwrite");
      const request = transaction.objectStore(DEVICE_IDENTITY_STORE).add({
        id: ACTIVE_DEVICE_IDENTITY_KEY,
        publicKey: record.publicKey,
        privateKey: record.privateKey,
        publicJwk: structuredClone(record.publicJwk),
        thumbprint: record.thumbprint,
        createdAtUtc: record.createdAtUtc,
      });
      await requestResult(request, "Premium cihaz anahtarı yazılamadı.");
      await transactionDone(transaction);
      return copyStoredDeviceIdentity({
        id: ACTIVE_DEVICE_IDENTITY_KEY,
        publicKey: record.publicKey,
        privateKey: record.privateKey,
        publicJwk: record.publicJwk,
        thumbprint: record.thumbprint,
        createdAtUtc: record.createdAtUtc,
      });
    } catch (error) {
      if (
        (error instanceof DOMException && error.name === "ConstraintError") ||
        (error instanceof PremiumLicenseStorageError &&
          error.domExceptionName === "ConstraintError")
      ) {
        const existing = await this.load();
        if (existing) return existing;
      }
      throw operationError(error, "Premium cihaz anahtarı yazılamadı.");
    }
  }

  async clear(): Promise<void> {
    try {
      const database = await this.database();
      const transaction = database.transaction(DEVICE_IDENTITY_STORE, "readwrite");
      transaction.objectStore(DEVICE_IDENTITY_STORE).delete(ACTIVE_DEVICE_IDENTITY_KEY);
      await transactionDone(transaction);
    } catch (error) {
      throw operationError(error, "Premium cihaz anahtarı temizlenemedi.");
    }
  }

  async reopen(): Promise<void> {
    await this.connection.reopen();
  }

  close(): void {
    this.connection.close();
  }
}

export async function hasStoredPremiumEntitlement(
  providedStore?: PremiumEntitlementStore,
): Promise<boolean> {
  const store = providedStore ?? new IndexedDbPremiumEntitlementStore();
  try {
    return (await store.load()) !== null;
  } finally {
    if (!providedStore) store.close();
  }
}
