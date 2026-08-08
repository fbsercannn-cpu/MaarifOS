import type { PremiumEntitlementClaims } from "./entitlement.ts";

export const PREMIUM_LICENSE_DATABASE_NAME = "maarifos-license";
export const PREMIUM_LICENSE_DATABASE_VERSION = 2;
const ENTITLEMENT_STORE = "entitlements";
const DEVICE_IDENTITY_STORE = "device-identities";
const ACTIVE_ENTITLEMENT_KEY = "active";
const ACTIVE_DEVICE_IDENTITY_KEY = "active-device";

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
  close(): void;
}

function openDatabase(databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, PREMIUM_LICENSE_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ENTITLEMENT_STORE)) {
        database.createObjectStore(ENTITLEMENT_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(DEVICE_IDENTITY_STORE)) {
        database.createObjectStore(DEVICE_IDENTITY_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Lisans deposu açılamadı."));
    request.onblocked = () => reject(new Error("Lisans deposu başka bir sekme tarafından engellendi."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Lisans deposu işlemi başarısız."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("Lisans deposu işlemi geri alındı."));
    transaction.onerror = () => reject(transaction.error ?? new Error("Lisans deposu işlemi başarısız."));
  });
}

export class IndexedDbPremiumEntitlementStore implements PremiumEntitlementStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly databaseName = PREMIUM_LICENSE_DATABASE_NAME) {}

  private database(): Promise<IDBDatabase> {
    this.databasePromise ??= openDatabase(this.databaseName);
    return this.databasePromise;
  }

  async load(): Promise<StoredPremiumEntitlement | null> {
    const database = await this.database();
    const transaction = database.transaction(ENTITLEMENT_STORE, "readonly");
    const result = await requestResult(
      transaction.objectStore(ENTITLEMENT_STORE).get(ACTIVE_ENTITLEMENT_KEY),
    );
    return result ? structuredClone(result as StoredPremiumEntitlement) : null;
  }

  async save(record: Omit<StoredPremiumEntitlement, "id">): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction(ENTITLEMENT_STORE, "readwrite");
    transaction.objectStore(ENTITLEMENT_STORE).put({
      ...structuredClone(record),
      id: ACTIVE_ENTITLEMENT_KEY,
    });
    await transactionDone(transaction);
  }

  async updateMaxObservedWallClock(now: Date): Promise<void> {
    if (Number.isNaN(now.getTime())) throw new Error("Lisans cihaz zamanı geçersiz.");
    const database = await this.database();
    const transaction = database.transaction(ENTITLEMENT_STORE, "readwrite");
    const store = transaction.objectStore(ENTITLEMENT_STORE);
    const current = await requestResult(
      store.get(ACTIVE_ENTITLEMENT_KEY),
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
  }

  async clear(): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction(ENTITLEMENT_STORE, "readwrite");
    transaction.objectStore(ENTITLEMENT_STORE).delete(ACTIVE_ENTITLEMENT_KEY);
    await transactionDone(transaction);
  }

  close(): void {
    void this.databasePromise?.then((database) => database.close());
    this.databasePromise = null;
  }
}

export class IndexedDbPremiumDeviceIdentityStore implements PremiumDeviceIdentityStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly databaseName = PREMIUM_LICENSE_DATABASE_NAME) {}

  private database(): Promise<IDBDatabase> {
    this.databasePromise ??= openDatabase(this.databaseName);
    return this.databasePromise;
  }

  async load(): Promise<StoredPremiumDeviceIdentity | null> {
    const database = await this.database();
    const transaction = database.transaction(DEVICE_IDENTITY_STORE, "readonly");
    const result = await requestResult(
      transaction.objectStore(DEVICE_IDENTITY_STORE).get(ACTIVE_DEVICE_IDENTITY_KEY),
    );
    return result ? structuredClone(result as StoredPremiumDeviceIdentity) : null;
  }

  async createIfAbsent(
    record: Omit<StoredPremiumDeviceIdentity, "id">,
  ): Promise<StoredPremiumDeviceIdentity> {
    const database = await this.database();
    const transaction = database.transaction(DEVICE_IDENTITY_STORE, "readwrite");
    const request = transaction.objectStore(DEVICE_IDENTITY_STORE).add({
      ...structuredClone(record),
      id: ACTIVE_DEVICE_IDENTITY_KEY,
    });
    try {
      await requestResult(request);
      await transactionDone(transaction);
      return {
        ...structuredClone(record),
        id: ACTIVE_DEVICE_IDENTITY_KEY,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "ConstraintError") {
        const existing = await this.load();
        if (existing) return existing;
      }
      throw error;
    }
  }

  async clear(): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction(DEVICE_IDENTITY_STORE, "readwrite");
    transaction.objectStore(DEVICE_IDENTITY_STORE).delete(ACTIVE_DEVICE_IDENTITY_KEY);
    await transactionDone(transaction);
  }

  close(): void {
    void this.databasePromise?.then((database) => database.close());
    this.databasePromise = null;
  }
}
