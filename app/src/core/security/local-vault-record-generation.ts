import { LocalVaultSecurityError } from "./local-vault-envelope.ts";
import { openLocalVaultReadwriteTransaction } from "./local-vault-idb.ts";

export const LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME =
  "recordGenerationStates" as const;
export const LOCAL_VAULT_RECORD_GENERATION_RESERVATION_STORE_NAME =
  "recordGenerationReservations" as const;
export const LOCAL_VAULT_RECORD_GENERATION_VERSION = 1 as const;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const STATE_KEYS = [
  "collection",
  "currentEnvelopeSha256",
  "currentGeneration",
  "id",
  "keyId",
  "nextGeneration",
  "pendingRetirementGeneration",
  "recordId",
  "retired",
  "revision",
  "version",
].sort();
const RESERVATION_KEYS = [
  "collection",
  "contextId",
  "envelopeSha256",
  "generation",
  "id",
  "keyId",
  "recordId",
  "version",
].sort();

interface LocalVaultRecordGenerationState {
  id: string;
  keyId: string;
  version: typeof LOCAL_VAULT_RECORD_GENERATION_VERSION;
  collection: string;
  recordId: string;
  currentGeneration: number;
  currentEnvelopeSha256: string | null;
  nextGeneration: number;
  pendingRetirementGeneration: number | null;
  retired: boolean;
  revision: number;
}

interface LocalVaultRecordGenerationReservation {
  id: string;
  contextId: string;
  keyId: string;
  version: typeof LOCAL_VAULT_RECORD_GENERATION_VERSION;
  collection: string;
  recordId: string;
  generation: number;
  envelopeSha256: string | null;
}

/** In-memory capability; deliberately unavailable after a crash or reload. */
export interface LocalVaultRetirementPreparation {
  readonly token: symbol;
}
const retirementPreparations = new WeakMap<LocalVaultRetirementPreparation, {
  database: IDBDatabase;
  states: LocalVaultRecordGenerationState[];
}>();

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
              "LOCAL_VAULT_RECORD_GENERATION_STORAGE_FAILED",
              "Yerel kasa kayıt nesli isteği tamamlanamadı.",
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
              "LOCAL_VAULT_RECORD_GENERATION_STORAGE_FAILED",
              "Yerel kasa kayıt nesli işlemi geri alındı.",
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
              "LOCAL_VAULT_RECORD_GENERATION_STORAGE_FAILED",
              "Yerel kasa kayıt nesli işlemi başarısız oldu.",
            ),
        ),
      { once: true },
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === keys.join(",");
}

function assertDigest(value: unknown): asserts value is string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Yerel kasa kayıt nesli özeti doğrulanamadı.",
    );
  }
}

function assertContext(keyId: string, collection: string, recordId: string): void {
  if (!keyId.trim() || !collection.trim() || !recordId.trim()) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Yerel kasa kayıt nesli bağlamı doğrulanamadı.",
    );
  }
}

function contextId(collection: string, recordId: string): string {
  return `${collection.length}:${collection}${recordId.length}:${recordId}`;
}

function reservationId(context: string, generation: number): string {
  return `${context}\u0000${generation}`;
}

function assertState(
  value: unknown,
): asserts value is LocalVaultRecordGenerationState {
  if (
    !isRecord(value) ||
    !exactKeys(value, STATE_KEYS) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.keyId !== "string" ||
    !value.keyId ||
    value.version !== LOCAL_VAULT_RECORD_GENERATION_VERSION ||
    typeof value.collection !== "string" ||
    !value.collection ||
    typeof value.recordId !== "string" ||
    !value.recordId ||
    !Number.isSafeInteger(value.currentGeneration) ||
    (value.currentGeneration as number) < 0 ||
    (value.currentEnvelopeSha256 !== null &&
      typeof value.currentEnvelopeSha256 !== "string") ||
    !Number.isSafeInteger(value.nextGeneration) ||
    (value.nextGeneration as number) < 1 ||
    (value.nextGeneration as number) <= (value.currentGeneration as number) ||
    (value.pendingRetirementGeneration !== null &&
      !Number.isSafeInteger(value.pendingRetirementGeneration)) ||
    typeof value.retired !== "boolean" ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Yerel kasa kayıt nesli durumu doğrulanamadı.",
    );
  }
  if (value.currentEnvelopeSha256 !== null) {
    assertDigest(value.currentEnvelopeSha256);
  }
  if (
    value.pendingRetirementGeneration !== null &&
    ((value.pendingRetirementGeneration as number) <=
      (value.currentGeneration as number) ||
      (value.pendingRetirementGeneration as number) >=
        (value.nextGeneration as number))
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Bekleyen yerel kasa emeklilik nesli doğrulanamadı.",
    );
  }
  if (
    value.retired &&
    (value.currentEnvelopeSha256 !== null ||
      value.pendingRetirementGeneration !== null)
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Emekli yerel kasa kayıt nesli ciphertext veya bekleyen intent içeremez.",
    );
  }
  if (value.id !== contextId(value.collection, value.recordId)) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Yerel kasa kayıt nesli kimliği doğrulanamadı.",
    );
  }
}

function assertReservation(
  value: unknown,
): asserts value is LocalVaultRecordGenerationReservation {
  if (
    !isRecord(value) ||
    !exactKeys(value, RESERVATION_KEYS) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.contextId !== "string" ||
    !value.contextId ||
    typeof value.keyId !== "string" ||
    !value.keyId ||
    value.version !== LOCAL_VAULT_RECORD_GENERATION_VERSION ||
    typeof value.collection !== "string" ||
    !value.collection ||
    typeof value.recordId !== "string" ||
    !value.recordId ||
    !Number.isSafeInteger(value.generation) ||
    (value.generation as number) < 1 ||
    (value.envelopeSha256 !== null && typeof value.envelopeSha256 !== "string")
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Yerel kasa kayıt nesli rezervasyonu doğrulanamadı.",
    );
  }
  if (value.envelopeSha256 !== null) assertDigest(value.envelopeSha256);
  const expectedContext = contextId(value.collection, value.recordId);
  if (
    value.contextId !== expectedContext ||
    value.id !== reservationId(expectedContext, value.generation as number)
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Yerel kasa kayıt nesli rezervasyon kimliği doğrulanamadı.",
    );
  }
}

function assertStateContext(
  state: LocalVaultRecordGenerationState,
  keyId: string,
  collection: string,
  recordId: string,
): void {
  if (
    state.keyId !== keyId ||
    state.collection !== collection ||
    state.recordId !== recordId
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Yerel kasa kayıt nesli anahtar bağı doğrulanamadı.",
    );
  }
}

export function ensureLocalVaultRecordGenerationStores(
  database: IDBDatabase,
): void {
  if (
    !database.objectStoreNames.contains(
      LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME,
    )
  ) {
    database.createObjectStore(LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME, {
      keyPath: "id",
    });
  }
  if (
    !database.objectStoreNames.contains(
      LOCAL_VAULT_RECORD_GENERATION_RESERVATION_STORE_NAME,
    )
  ) {
    database.createObjectStore(
      LOCAL_VAULT_RECORD_GENERATION_RESERVATION_STORE_NAME,
      { keyPath: "id" },
    );
  }
}

export async function reserveLocalVaultRecordGeneration(
  database: IDBDatabase,
  keyId: string,
  collection: string,
  recordId: string,
): Promise<number> {
  assertContext(keyId, collection, recordId);
  const recordContextId = contextId(collection, recordId);
  const { transaction } = openLocalVaultReadwriteTransaction(database, [
    LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME,
    LOCAL_VAULT_RECORD_GENERATION_RESERVATION_STORE_NAME,
  ]);
  const completion = transactionResult(transaction);
  try {
    const stateStore = transaction.objectStore(
      LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME,
    );
    const current = await requestResult(
      stateStore.get(recordContextId) as IDBRequest<
        LocalVaultRecordGenerationState | undefined
      >,
    );
    if (current) {
      assertState(current);
      assertStateContext(current, keyId, collection, recordId);
    }
    const state: LocalVaultRecordGenerationState =
      current ?? {
        id: recordContextId,
        keyId,
        version: LOCAL_VAULT_RECORD_GENERATION_VERSION,
        collection,
        recordId,
        currentGeneration: 0,
        currentEnvelopeSha256: null,
        nextGeneration: 1,
        pendingRetirementGeneration: null,
        retired: false,
        revision: 0,
      };
    const generation = state.nextGeneration;
    if (generation >= Number.MAX_SAFE_INTEGER) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_RECORD_GENERATION_EXHAUSTED",
        "Yerel kasa kayıt nesli alanı tükendi; anahtar döndürülmeden yazma yapılamaz.",
      );
    }
    const reservation: LocalVaultRecordGenerationReservation = {
      id: reservationId(recordContextId, generation),
      contextId: recordContextId,
      keyId,
      version: LOCAL_VAULT_RECORD_GENERATION_VERSION,
      collection,
      recordId,
      generation,
      envelopeSha256: null,
    };
    assertReservation(reservation);
    await requestResult(
      transaction
        .objectStore(LOCAL_VAULT_RECORD_GENERATION_RESERVATION_STORE_NAME)
        .add(reservation),
    );
    await requestResult(
      stateStore.put({
        ...state,
        nextGeneration: generation + 1,
        revision: state.revision + 1,
      } satisfies LocalVaultRecordGenerationState),
    );
    await completion;
    return generation;
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

export async function bindLocalVaultRecordGeneration(
  database: IDBDatabase,
  input: {
    keyId: string;
    collection: string;
    recordId: string;
    generation: number;
    envelopeSha256: string;
  },
): Promise<void> {
  assertContext(input.keyId, input.collection, input.recordId);
  assertDigest(input.envelopeSha256);
  if (!Number.isSafeInteger(input.generation) || input.generation < 1) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Yerel kasa kayıt nesli doğrulanamadı.",
    );
  }
  const recordContextId = contextId(input.collection, input.recordId);
  const { transaction } = openLocalVaultReadwriteTransaction(
    database,
    LOCAL_VAULT_RECORD_GENERATION_RESERVATION_STORE_NAME,
  );
  const completion = transactionResult(transaction);
  try {
    const store = transaction.objectStore(
      LOCAL_VAULT_RECORD_GENERATION_RESERVATION_STORE_NAME,
    );
    const current = await requestResult(
      store.get(
        reservationId(recordContextId, input.generation),
      ) as IDBRequest<LocalVaultRecordGenerationReservation | undefined>,
    );
    if (!current) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_RECORD_GENERATION_MISSING",
        "Yerel kasa kayıt nesli rezervasyonu bulunamadı.",
      );
    }
    assertReservation(current);
    if (
      current.keyId !== input.keyId ||
      current.collection !== input.collection ||
      current.recordId !== input.recordId ||
      current.generation !== input.generation
    ) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_RECORD_GENERATION_INVALID",
        "Yerel kasa kayıt nesli rezervasyon bağı doğrulanamadı.",
      );
    }
    if (
      current.envelopeSha256 !== null &&
      current.envelopeSha256 !== input.envelopeSha256
    ) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_RECORD_GENERATION_INVALID",
        "Yerel kasa kayıt nesli birden fazla zarfa bağlanamaz.",
      );
    }
    if (current.envelopeSha256 === null) {
      await requestResult(
        store.put({
          ...current,
          envelopeSha256: input.envelopeSha256,
        } satisfies LocalVaultRecordGenerationReservation),
      );
    }
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

/**
 * Ana DB transaction'ı ile key-DB transaction'ı tek atomik sınırda kurulamaz.
 * Bu nedenle şifreleme önce benzersiz bir aday nesli ayırır; ana DB'de görülen
 * ve AEAD doğrulaması geçen aday burada idempotent biçimde current yapılır.
 * Aynı key-DB'nin de geçmişe döndürüldüğü tam-origin rollback haricî güven kökü
 * olmadan ayırt edilemez; bu sınır üst katman yedek/uzak kanıt politikasınındır.
 */
export async function acceptLocalVaultRecordGeneration(
  database: IDBDatabase,
  input: {
    keyId: string;
    collection: string;
    recordId: string;
    generation: number | undefined;
    envelopeSha256: string;
  },
): Promise<void> {
  assertContext(input.keyId, input.collection, input.recordId);
  assertDigest(input.envelopeSha256);
  const generation = input.generation ?? 0;
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Yerel kasa kayıt nesli doğrulanamadı.",
    );
  }
  const recordContextId = contextId(input.collection, input.recordId);
  const { transaction } = openLocalVaultReadwriteTransaction(database, [
    LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME,
    LOCAL_VAULT_RECORD_GENERATION_RESERVATION_STORE_NAME,
  ]);
  const completion = transactionResult(transaction);
  try {
    const stateStore = transaction.objectStore(
      LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME,
    );
    const current = await requestResult(
      stateStore.get(recordContextId) as IDBRequest<
        LocalVaultRecordGenerationState | undefined
      >,
    );
    if (!current) {
      if (generation !== 0) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_RECORD_GENERATION_MISSING",
          "Yerel kasa kayıt nesli durumu bulunamadı; erişim durduruldu.",
        );
      }
      const legacyState: LocalVaultRecordGenerationState = {
        id: recordContextId,
        keyId: input.keyId,
        version: LOCAL_VAULT_RECORD_GENERATION_VERSION,
        collection: input.collection,
        recordId: input.recordId,
        currentGeneration: 0,
        currentEnvelopeSha256: input.envelopeSha256,
        nextGeneration: 1,
        pendingRetirementGeneration: null,
        retired: false,
        revision: 0,
      };
      await requestResult(stateStore.add(legacyState));
      await completion;
      return;
    }
    assertState(current);
    assertStateContext(current, input.keyId, input.collection, input.recordId);
    if (current.pendingRetirementGeneration !== null) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_REPLAY_DETECTED",
        "Silme intent'i bulunan öğrenci kasa kaydı güvenlik nedeniyle açılamaz.",
      );
    }
    if (current.retired && generation <= current.currentGeneration) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_REPLAY_DETECTED",
        "Silinmiş öğrenci kasa kaydının eski ciphertext'i yeniden eklendi.",
      );
    }
    if (generation < current.currentGeneration) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_REPLAY_DETECTED",
        "Öğrenci kasasında eski bir kayıt nesli saptandı; erişim durduruldu.",
      );
    }
    if (generation === current.currentGeneration) {
      if (current.currentEnvelopeSha256 === null) {
        if (generation !== 0) {
          throw new LocalVaultSecurityError(
            "LOCAL_VAULT_RECORD_GENERATION_INVALID",
            "Yerel kasa kayıt nesli özeti eksik.",
          );
        }
        await requestResult(
          stateStore.put({
            ...current,
            currentEnvelopeSha256: input.envelopeSha256,
            revision: current.revision + 1,
          } satisfies LocalVaultRecordGenerationState),
        );
      } else if (current.currentEnvelopeSha256 !== input.envelopeSha256) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_REPLAY_DETECTED",
          "Öğrenci kasasında aynı nesle ait farklı bir kayıt saptandı; erişim durduruldu.",
        );
      }
      await completion;
      return;
    }
    const reservation = await requestResult(
      transaction
        .objectStore(LOCAL_VAULT_RECORD_GENERATION_RESERVATION_STORE_NAME)
        .get(reservationId(recordContextId, generation)) as IDBRequest<
        LocalVaultRecordGenerationReservation | undefined
      >,
    );
    if (!reservation) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_RECORD_GENERATION_MISSING",
        "Yerel kasa kayıt nesli rezervasyonu bulunamadı; erişim durduruldu.",
      );
    }
    assertReservation(reservation);
    if (
      reservation.keyId !== input.keyId ||
      reservation.collection !== input.collection ||
      reservation.recordId !== input.recordId ||
      reservation.generation !== generation ||
      reservation.envelopeSha256 !== input.envelopeSha256 ||
      generation >= current.nextGeneration
    ) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_RECORD_GENERATION_INVALID",
        "Yerel kasa kayıt nesli adayı doğrulanamadı.",
      );
    }
    await requestResult(
      stateStore.put({
        ...current,
        currentGeneration: generation,
        currentEnvelopeSha256: input.envelopeSha256,
        pendingRetirementGeneration: null,
        retired: false,
        revision: current.revision + 1,
      } satisfies LocalVaultRecordGenerationState),
    );
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

function isStateInScope(
  state: LocalVaultRecordGenerationState,
  scope: LocalVaultRecordScope,
): boolean {
  if (scope === "recovery-records") return state.collection.startsWith("recoverySnapshots/");
  if (scope.startsWith("collection:")) return state.collection === scope.slice("collection:".length);
  return scope === "students"
    ? state.collection === "students"
    : state.collection.startsWith("recoverySnapshots/") &&
        state.collection.endsWith("/students");
}

export type LocalVaultRecordScope = "students" | "recovery-students" | "recovery-records" | `collection:${string}`;

function presentContextIds(
  keyId: string,
  records: readonly { collection: string; recordId: string }[],
): Set<string> {
  return new Set(
    records.map((record) => {
      assertContext(keyId, record.collection, record.recordId);
      return contextId(record.collection, record.recordId);
    }),
  );
}

/**
 * IndexedDB iki ayrı veritabanını tek transaction altında birleştiremez.
 * Bu intent ana DB silmesinden önce kalıcılaştırılır. Böylece ana commit ile
 * tombstone finalizasyonu arasındaki crash'te eski ciphertext fail-closed olur.
 * Intent varken ana kayıtta hâlâ veri bulunması crash-before-main kabul edilir
 * ve sessiz rollback yapılmaz; veri kurtarma ya da kriptografik silme gerekir.
 */
export async function prepareLocalVaultRecordGenerationRetirements(
  database: IDBDatabase,
  input: {
    keyId: string;
    scope: LocalVaultRecordScope;
    presentRecords: readonly { collection: string; recordId: string }[];
  },
): Promise<LocalVaultRetirementPreparation> {
  if (!input.keyId.trim()) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Yerel kasa emeklilik anahtar bağı doğrulanamadı.",
    );
  }
  const present = presentContextIds(input.keyId, input.presentRecords);
  const { transaction } = openLocalVaultReadwriteTransaction(
    database,
    LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME,
  );
  const completion = transactionResult(transaction);
  const preparedStates: LocalVaultRecordGenerationState[] = [];
  try {
    const store = transaction.objectStore(
      LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME,
    );
    const states = await requestResult(
      store.getAll() as IDBRequest<LocalVaultRecordGenerationState[]>,
    );
    for (const state of states) {
      assertState(state);
      if (state.keyId !== input.keyId) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_RECORD_GENERATION_INVALID",
          "Yerel kasa emeklilik anahtar bağı doğrulanamadı.",
        );
      }
      if (!isStateInScope(state, input.scope)) continue;
      if (present.has(state.id)) {
        if (state.pendingRetirementGeneration !== null) {
          throw new LocalVaultSecurityError(
            "LOCAL_VAULT_REPLAY_DETECTED",
            "Silme intent'i ile mevcut öğrenci kasa kaydı çakışıyor.",
          );
        }
        continue;
      }
      if (state.retired || state.pendingRetirementGeneration !== null) continue;
      const retirementGeneration = state.nextGeneration;
      if (retirementGeneration >= Number.MAX_SAFE_INTEGER) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_RECORD_GENERATION_EXHAUSTED",
          "Yerel kasa emeklilik nesli alanı tükendi.",
        );
      }
      const prepared: LocalVaultRecordGenerationState = {
          ...state,
          nextGeneration: retirementGeneration + 1,
          pendingRetirementGeneration: retirementGeneration,
          revision: state.revision + 1,
      };
      await requestResult(store.put(prepared));
      preparedStates.push(prepared);
    }
    await completion;
    const receipt = Object.freeze({ token: Symbol("vault-retirement-preparation") });
    retirementPreparations.set(receipt, { database, states: preparedStates });
    return receipt;
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

/**
 * Only the caller that observed a definite main-DB abort (or never started it)
 * and rechecked its unchanged raw baseline may call this. It cannot undo an
 * earlier intent, a finalized tombstone, or a subsequently changed generation.
 * Reserved generations stay consumed; startup never invokes this recovery path.
 */
export async function cancelAbortedLocalVaultRetirements(
  database: IDBDatabase,
  receipts: readonly LocalVaultRetirementPreparation[],
): Promise<void> {
  const preparedStates = receipts.flatMap((receipt) => {
    const prepared = retirementPreparations.get(receipt);
    if (!prepared || prepared.database !== database) {
      throw new LocalVaultSecurityError("LOCAL_VAULT_RECORD_GENERATION_INVALID",
        "İptal edilen işlemin yerel kasa hazırlık kanıtı doğrulanamadı.");
    }
    return prepared.states;
  });
  if (preparedStates.length === 0) {
    for (const receipt of receipts) retirementPreparations.delete(receipt);
    return;
  }
  const { transaction } = openLocalVaultReadwriteTransaction(database, LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME);
  const completion = transactionResult(transaction);
  try {
    const store = transaction.objectStore(LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME);
    for (const prepared of preparedStates) {
      const current: unknown = await requestResult(store.get(prepared.id));
      assertState(current);
      if (STATE_KEYS.some((key) => current[key as keyof LocalVaultRecordGenerationState] !== prepared[key as keyof LocalVaultRecordGenerationState])) {
        throw new LocalVaultSecurityError("LOCAL_VAULT_REPLAY_DETECTED",
          "Yerel kasa nesli değişti; iptal edilen işlemin silme hazırlığı geri alınmadı.");
      }
      await requestResult(store.put({ ...current, pendingRetirementGeneration: null,
        revision: current.revision + 1 } satisfies LocalVaultRecordGenerationState));
    }
    await completion;
    for (const receipt of receipts) retirementPreparations.delete(receipt);
  } catch (error) {
    try { transaction.abort(); } catch { /* Preserve the original failure. */ }
    await completion.catch(() => undefined);
    throw error;
  }
}

export async function reconcileLocalVaultRecordGenerationRetirements(
  database: IDBDatabase,
  input: {
    keyId: string;
    scope: LocalVaultRecordScope;
    presentRecords: readonly { collection: string; recordId: string }[];
  },
): Promise<void> {
  if (!input.keyId.trim()) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_RECORD_GENERATION_INVALID",
      "Yerel kasa emeklilik anahtar bağı doğrulanamadı.",
    );
  }
  const present = presentContextIds(input.keyId, input.presentRecords);
  const { transaction } = openLocalVaultReadwriteTransaction(
    database,
    LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME,
  );
  const completion = transactionResult(transaction);
  try {
    const store = transaction.objectStore(
      LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME,
    );
    const states = await requestResult(
      store.getAll() as IDBRequest<LocalVaultRecordGenerationState[]>,
    );
    for (const state of states) {
      assertState(state);
      if (state.keyId !== input.keyId) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_RECORD_GENERATION_INVALID",
          "Yerel kasa emeklilik anahtar bağı doğrulanamadı.",
        );
      }
      if (!isStateInScope(state, input.scope)) continue;
      if (present.has(state.id)) {
        if (state.pendingRetirementGeneration !== null) {
          throw new LocalVaultSecurityError(
            "LOCAL_VAULT_REPLAY_DETECTED",
            "Silme intent'i bulunan öğrenci kasa kaydı yeniden göründü.",
          );
        }
        continue;
      }
      if (state.retired) continue;
      const retirementGeneration =
        state.pendingRetirementGeneration ?? state.nextGeneration;
      if (retirementGeneration >= Number.MAX_SAFE_INTEGER) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_RECORD_GENERATION_EXHAUSTED",
          "Yerel kasa emeklilik nesli alanı tükendi.",
        );
      }
      await requestResult(
        store.put({
          ...state,
          currentGeneration: retirementGeneration,
          currentEnvelopeSha256: null,
          nextGeneration:
            state.pendingRetirementGeneration === null
              ? retirementGeneration + 1
              : state.nextGeneration,
          pendingRetirementGeneration: null,
          retired: true,
          revision: state.revision + 1,
        } satisfies LocalVaultRecordGenerationState),
      );
    }
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
