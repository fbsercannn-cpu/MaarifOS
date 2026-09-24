import {
  LOCAL_VAULT_IV_BYTES,
  LocalVaultSecurityError,
  base64ToBytes,
  bytesToBase64,
} from "./local-vault-envelope.ts";
import { openLocalVaultReadwriteTransaction } from "./local-vault-idb.ts";

export const LOCAL_VAULT_NONCE_STORE_NAME = "nonceAllocators" as const;
export const LOCAL_VAULT_NONCE_RESERVATION_STORE_NAME =
  "nonceReservations" as const;
export const LOCAL_VAULT_NONCE_ALLOCATOR_VERSION = 2 as const;
export const LOCAL_VAULT_NONCE_RESERVATION_VERSION = 2 as const;

const MAX_COUNTER = (1n << 64n) - 1n;
const NONCE_RECORD_KEYS = [
  "id",
  "keyId",
  "nextAuditCounter",
  "revision",
  "version",
].sort();
const NONCE_RESERVATION_KEYS = [
  "auditCounter",
  "id",
  "keyId",
  "nonce",
  "version",
].sort();

export interface LocalVaultNonceAllocatorRecord {
  id: string;
  keyId: string;
  version: typeof LOCAL_VAULT_NONCE_ALLOCATOR_VERSION;
  nextAuditCounter: string;
  revision: number;
}

export interface LocalVaultNonceReservationRecord {
  id: string;
  keyId: string;
  version: typeof LOCAL_VAULT_NONCE_RESERVATION_VERSION;
  nonce: string;
  auditCounter: string;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () =>
        reject(
          request.error ??
            new LocalVaultSecurityError(
              "LOCAL_VAULT_NONCE_STORAGE_FAILED",
              "Yerel kasa nonce deposu isteği tamamlanamadı.",
            ),
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
          transaction.error ??
            new LocalVaultSecurityError(
              "LOCAL_VAULT_NONCE_STORAGE_FAILED",
              "Yerel kasa nonce işlemi geri alındı.",
            ),
        ),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(
          transaction.error ??
            new LocalVaultSecurityError(
              "LOCAL_VAULT_NONCE_STORAGE_FAILED",
              "Yerel kasa nonce işlemi başarısız oldu.",
            ),
        ),
      { once: true },
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCounter(value: unknown): bigint {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_NONCE_STATE_INVALID",
      "Yerel kasa nonce sayacı doğrulanamadı.",
    );
  }
  const counter = BigInt(value);
  if (counter < 0n || counter > MAX_COUNTER) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_NONCE_STATE_INVALID",
      "Yerel kasa nonce sayacı güvenli aralığın dışında.",
    );
  }
  return counter;
}

export function assertLocalVaultNonceAllocatorRecord(
  value: unknown,
): asserts value is LocalVaultNonceAllocatorRecord {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !== NONCE_RECORD_KEYS.join(",") ||
    typeof value.id !== "string" ||
    !value.id ||
    value.id !== value.keyId ||
    value.version !== LOCAL_VAULT_NONCE_ALLOCATOR_VERSION ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_NONCE_STATE_INVALID",
      "Yerel kasa nonce durumu doğrulanamadı.",
    );
  }
  parseCounter(value.nextAuditCounter);
}

export function createLocalVaultNonceAllocatorRecord(
  keyId: string,
): LocalVaultNonceAllocatorRecord {
  if (!keyId.trim()) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_NONCE_STATE_INVALID",
      "Yerel kasa nonce başlangıç durumu doğrulanamadı.",
    );
  }
  return {
    id: keyId,
    keyId,
    version: LOCAL_VAULT_NONCE_ALLOCATOR_VERSION,
    nextAuditCounter: "0",
    revision: 0,
  };
}

export function assertLocalVaultNonceReservationRecord(
  value: unknown,
): asserts value is LocalVaultNonceReservationRecord {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !== NONCE_RESERVATION_KEYS.join(",") ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.keyId !== "string" ||
    !value.keyId ||
    value.version !== LOCAL_VAULT_NONCE_RESERVATION_VERSION ||
    typeof value.nonce !== "string"
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_NONCE_STATE_INVALID",
      "Yerel kasa nonce rezervasyonu doğrulanamadı.",
    );
  }
  base64ToBytes(value.nonce, LOCAL_VAULT_IV_BYTES);
  parseCounter(value.auditCounter);
  if (value.id !== `${value.keyId}:${value.nonce}`) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_NONCE_STATE_INVALID",
      "Yerel kasa nonce rezervasyon kimliği doğrulanamadı.",
    );
  }
}

export function ensureLocalVaultNonceStore(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(LOCAL_VAULT_NONCE_STORE_NAME)) {
    database.createObjectStore(LOCAL_VAULT_NONCE_STORE_NAME, { keyPath: "id" });
  }
  if (
    !database.objectStoreNames.contains(
      LOCAL_VAULT_NONCE_RESERVATION_STORE_NAME,
    )
  ) {
    database.createObjectStore(LOCAL_VAULT_NONCE_RESERVATION_STORE_NAME, {
      keyPath: "id",
    });
  }
}

/**
 * Aynı object store üzerindeki readwrite IndexedDB işlemleri sıraya alınır.
 * Her IV WebCrypto CSPRNG'den bağımsız 96 bit olarak alınır. Okuma + benzersiz
 * rezervasyon ekleme + audit revision artışı tek strict-durability işlemde
 * olduğu için Web Locks bulunmasa da çakışma atomik ve fail-closed yakalanır.
 * Tam key-DB rollback audit sayacını geri alsa bile yeni IV sayaçtan türetilmez.
 */
export async function allocateLocalVaultNonce(
  database: IDBDatabase,
  keyId: string,
  cryptoProvider: Crypto = globalThis.crypto,
): Promise<Uint8Array<ArrayBuffer>> {
  if (
    !database.objectStoreNames.contains(LOCAL_VAULT_NONCE_STORE_NAME) ||
    !database.objectStoreNames.contains(
      LOCAL_VAULT_NONCE_RESERVATION_STORE_NAME,
    )
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_NONCE_STATE_MISSING",
      "Yerel kasa nonce deposu bulunamadı; yazma güvenlik nedeniyle durduruldu.",
    );
  }
  if (!cryptoProvider?.getRandomValues) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RANDOM_UNAVAILABLE",
      "Yerel kasa güvenli rastgele sayı üretecine erişemedi.",
    );
  }
  const nonce = new Uint8Array(new ArrayBuffer(LOCAL_VAULT_IV_BYTES));
  try {
    cryptoProvider.getRandomValues(nonce);
  } catch {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RANDOM_UNAVAILABLE",
      "Yerel kasa nonce değeri güvenle üretilemedi.",
    );
  }
  const nonceBase64 = bytesToBase64(nonce);
  const { transaction } = openLocalVaultReadwriteTransaction(
    database,
    [
      LOCAL_VAULT_NONCE_STORE_NAME,
      LOCAL_VAULT_NONCE_RESERVATION_STORE_NAME,
    ],
  );
  const completion = transactionResult(transaction);
  try {
    const store = transaction.objectStore(LOCAL_VAULT_NONCE_STORE_NAME);
    const current = await requestResult(
      store.get(keyId) as IDBRequest<LocalVaultNonceAllocatorRecord | undefined>,
    );
    if (!current) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_NONCE_STATE_MISSING",
        "Yerel kasa nonce durumu bulunamadı; yazma güvenlik nedeniyle durduruldu.",
      );
    }
    assertLocalVaultNonceAllocatorRecord(current);
    if (current.keyId !== keyId) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_NONCE_STATE_INVALID",
        "Yerel kasa nonce anahtar bağı doğrulanamadı.",
      );
    }
    const counter = parseCounter(current.nextAuditCounter);
    if (counter === MAX_COUNTER) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_NONCE_EXHAUSTED",
        "Yerel kasa nonce alanı tükendi; anahtar döndürülmeden yazma yapılamaz.",
      );
    }
    const reservation: LocalVaultNonceReservationRecord = {
      id: `${keyId}:${nonceBase64}`,
      keyId,
      version: LOCAL_VAULT_NONCE_RESERVATION_VERSION,
      nonce: nonceBase64,
      auditCounter: String(counter),
    };
    assertLocalVaultNonceReservationRecord(reservation);
    try {
      await requestResult(
        transaction
          .objectStore(LOCAL_VAULT_NONCE_RESERVATION_STORE_NAME)
          .add(reservation),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "ConstraintError") {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_NONCE_REUSE",
          "Yerel kasa nonce değeri daha önce ayrılmış; yazma durduruldu.",
        );
      }
      throw error;
    }
    await requestResult(
      store.put({
        ...current,
        nextAuditCounter: String(counter + 1n),
        revision: current.revision + 1,
      } satisfies LocalVaultNonceAllocatorRecord),
    );
    await completion;
    return nonce;
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
