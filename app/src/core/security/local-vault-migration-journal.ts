import { canonicalJson } from "../backup/canonical-json.ts";
import {
  LOCAL_VAULT_ENVELOPE_VERSION,
  LocalVaultSecurityError,
  type LocalVaultSealedRecord,
} from "./local-vault-envelope.ts";
import { openLocalVaultReadwriteTransaction } from "./local-vault-idb.ts";

export const LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME =
  "migrationJournal" as const;
export const LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME =
  "migrationShadow" as const;
export const LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME =
  "migrationFences" as const;
export const LOCAL_VAULT_MIGRATION_JOURNAL_VERSION = 2 as const;

export type LocalVaultMigrationPhase =
  | "staging"
  | "verifying"
  | "cutover-pending"
  | "ready";

export interface LocalVaultMigrationJournalRecord {
  id: string;
  generation: number;
  version: typeof LOCAL_VAULT_MIGRATION_JOURNAL_VERSION;
  targetEnvelopeVersion: typeof LOCAL_VAULT_ENVELOPE_VERSION;
  sourceFingerprint: string;
  sourceItemCount: number;
  phase: LocalVaultMigrationPhase;
  stagedItemCount: number;
  revision: number;
}

export interface LocalVaultMigrationShadowRecord {
  id: string;
  migrationId: string;
  itemId: string;
  sourceFingerprint: string;
  sourceRecordSha256: string;
  plaintextSha256: string;
  sealedRecord: LocalVaultSealedRecord;
}

interface LocalVaultMigrationFenceRecord {
  id: string;
  ownerId: string;
  expiresAtMs: number;
  revision: number;
}

export interface LocalVaultMigrationFenceLease {
  id: string;
  ownerId: string;
  revision: number;
}

export interface LocalVaultMigrationMutationGuard {
  lease: LocalVaultMigrationFenceLease;
  nowMs: number;
}

const JOURNAL_KEYS = [
  "generation",
  "id",
  "phase",
  "revision",
  "sourceFingerprint",
  "sourceItemCount",
  "stagedItemCount",
  "targetEnvelopeVersion",
  "version",
].sort();
const SHADOW_KEYS = [
  "id",
  "itemId",
  "migrationId",
  "plaintextSha256",
  "sealedRecord",
  "sourceFingerprint",
  "sourceRecordSha256",
].sort();
const FENCE_KEYS = ["expiresAtMs", "id", "ownerId", "revision"].sort();
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

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
              "LOCAL_VAULT_MIGRATION_STORAGE_FAILED",
              "Yerel kasa migration deposu isteği tamamlanamadı.",
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
              "LOCAL_VAULT_MIGRATION_STORAGE_FAILED",
              "Yerel kasa migration işlemi geri alındı.",
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
              "LOCAL_VAULT_MIGRATION_STORAGE_FAILED",
              "Yerel kasa migration işlemi başarısız oldu.",
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
      "LOCAL_VAULT_MIGRATION_STATE_INVALID",
      "Yerel kasa migration özeti doğrulanamadı.",
    );
  }
}

function assertJournal(
  value: unknown,
): asserts value is LocalVaultMigrationJournalRecord {
  if (
    !isRecord(value) ||
    !exactKeys(value, JOURNAL_KEYS) ||
    typeof value.id !== "string" ||
    !value.id ||
    value.version !== LOCAL_VAULT_MIGRATION_JOURNAL_VERSION ||
    value.targetEnvelopeVersion !== LOCAL_VAULT_ENVELOPE_VERSION ||
    !Number.isSafeInteger(value.generation) ||
    (value.generation as number) < 1 ||
    (value.phase !== "staging" &&
      value.phase !== "verifying" &&
      value.phase !== "cutover-pending" &&
      value.phase !== "ready") ||
    !Number.isSafeInteger(value.sourceItemCount) ||
    (value.sourceItemCount as number) < 0 ||
    !Number.isSafeInteger(value.stagedItemCount) ||
    (value.stagedItemCount as number) < 0 ||
    (value.stagedItemCount as number) > (value.sourceItemCount as number) ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_MIGRATION_STATE_INVALID",
      "Yerel kasa migration günlüğü doğrulanamadı.",
    );
  }
  assertDigest(value.sourceFingerprint);
}

function assertShadow(
  value: unknown,
): asserts value is LocalVaultMigrationShadowRecord {
  if (
    !isRecord(value) ||
    !exactKeys(value, SHADOW_KEYS) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.migrationId !== "string" ||
    !value.migrationId ||
    typeof value.itemId !== "string" ||
    !value.itemId
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_MIGRATION_STATE_INVALID",
      "Yerel kasa migration gölge kaydı doğrulanamadı.",
    );
  }
  assertDigest(value.sourceFingerprint);
  assertDigest(value.sourceRecordSha256);
  assertDigest(value.plaintextSha256);
  // Zarfın tam kriptografik doğrulaması codec tarafından yapılır. Burada
  // Structured Clone dışı veya tanımsız alanları kesin biçimde reddederiz.
  canonicalJson(value.sealedRecord);
}

function assertFence(
  value: unknown,
): asserts value is LocalVaultMigrationFenceRecord {
  if (
    !isRecord(value) ||
    !exactKeys(value, FENCE_KEYS) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.ownerId !== "string" ||
    !value.ownerId ||
    !Number.isSafeInteger(value.expiresAtMs) ||
    (value.expiresAtMs as number) < 0 ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_MIGRATION_FENCE_INVALID",
      "Yerel kasa migration kilidi doğrulanamadı.",
    );
  }
}

export class LocalVaultMigrationBusyError extends LocalVaultSecurityError {
  constructor() {
    super(
      "LOCAL_VAULT_MIGRATION_BUSY",
      "Yerel kasa migration işlemi başka bir sekmede sürüyor.",
    );
    this.name = "LocalVaultMigrationBusyError";
  }
}

export function ensureLocalVaultMigrationStores(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME)) {
    database.createObjectStore(LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME, {
      keyPath: "id",
    });
  }
  if (!database.objectStoreNames.contains(LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME)) {
    const store = database.createObjectStore(
      LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      { keyPath: "id" },
    );
    store.createIndex("by-migration", "migrationId", { unique: false });
  }
  if (!database.objectStoreNames.contains(LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME)) {
    database.createObjectStore(LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME, {
      keyPath: "id",
    });
  }
}

export class LocalVaultMigrationJournal {
  constructor(private readonly database: IDBDatabase) {
    for (const store of [
      LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
    ]) {
      if (!database.objectStoreNames.contains(store)) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_STATE_MISSING",
          "Yerel kasa migration deposu bulunamadı.",
        );
      }
    }
  }

  private async assertMutationGuard(
    transaction: IDBTransaction,
    guard: LocalVaultMigrationMutationGuard,
  ): Promise<void> {
    if (!Number.isSafeInteger(guard.nowMs) || guard.nowMs < 0) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_FENCE_INVALID",
        "Yerel kasa migration kilidi zamanı doğrulanamadı.",
      );
    }
    const current = await requestResult(
      transaction
        .objectStore(LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME)
        .get(guard.lease.id) as IDBRequest<
        LocalVaultMigrationFenceRecord | undefined
      >,
    );
    if (!current) throw new LocalVaultMigrationBusyError();
    assertFence(current);
    if (
      current.ownerId !== guard.lease.ownerId ||
      current.revision !== guard.lease.revision ||
      current.expiresAtMs <= guard.nowMs
    ) {
      throw new LocalVaultMigrationBusyError();
    }
  }

  async load(migrationId: string): Promise<LocalVaultMigrationJournalRecord | null> {
    const transaction = this.database.transaction(
      LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      "readonly",
    );
    const completion = transactionResult(transaction);
    const value = await requestResult(
      transaction
        .objectStore(LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME)
        .get(migrationId) as IDBRequest<
        LocalVaultMigrationJournalRecord | undefined
      >,
    );
    await completion;
    if (!value) return null;
    assertJournal(value);
    return structuredClone(value);
  }

  async beginOrResume(input: {
    migrationId: string;
    sourceFingerprint: string;
    sourceItemCount: number;
  }, guard: LocalVaultMigrationMutationGuard): Promise<LocalVaultMigrationJournalRecord> {
    assertDigest(input.sourceFingerprint);
    if (!input.migrationId || !Number.isSafeInteger(input.sourceItemCount) || input.sourceItemCount < 0) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_STATE_INVALID",
        "Yerel kasa migration başlangıcı doğrulanamadı.",
      );
    }
    const { transaction } = openLocalVaultReadwriteTransaction(this.database, [
      LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
    ]);
    const completion = transactionResult(transaction);
    try {
      const store = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      );
      await this.assertMutationGuard(transaction, guard);
      const existing = await requestResult(
        store.get(input.migrationId) as IDBRequest<
          LocalVaultMigrationJournalRecord | undefined
        >,
      );
      if (existing) {
        assertJournal(existing);
        if (
          existing.sourceFingerprint !== input.sourceFingerprint ||
          existing.sourceItemCount !== input.sourceItemCount
        ) {
          throw new LocalVaultSecurityError(
            "LOCAL_VAULT_MIGRATION_SOURCE_CHANGED",
            "Yerel kasa migration kaynağı değişti; otomatik yazma durduruldu.",
          );
        }
        await completion;
        return structuredClone(existing);
      }
      const created: LocalVaultMigrationJournalRecord = {
        id: input.migrationId,
        generation: 1,
        version: LOCAL_VAULT_MIGRATION_JOURNAL_VERSION,
        targetEnvelopeVersion: LOCAL_VAULT_ENVELOPE_VERSION,
        sourceFingerprint: input.sourceFingerprint,
        sourceItemCount: input.sourceItemCount,
        phase: "staging",
        stagedItemCount: 0,
        revision: 0,
      };
      await requestResult(store.add(created));
      await completion;
      return structuredClone(created);
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

  async restartReadyGeneration(
    input: {
      migrationId: string;
      sourceFingerprint: string;
      sourceItemCount: number;
    },
    guard: LocalVaultMigrationMutationGuard,
  ): Promise<LocalVaultMigrationJournalRecord> {
    assertDigest(input.sourceFingerprint);
    if (
      !input.migrationId ||
      !Number.isSafeInteger(input.sourceItemCount) ||
      input.sourceItemCount < 0
    ) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_STATE_INVALID",
        "Yerel kasa yeni migration nesli doğrulanamadı.",
      );
    }
    const { transaction } = openLocalVaultReadwriteTransaction(this.database, [
      LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
    ]);
    const completion = transactionResult(transaction);
    try {
      await this.assertMutationGuard(transaction, guard);
      const journalStore = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      );
      const current = await requestResult(
        journalStore.get(input.migrationId) as IDBRequest<
          LocalVaultMigrationJournalRecord | undefined
        >,
      );
      if (!current) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_STATE_MISSING",
          "Yeni migration nesli için önceki günlük bulunamadı.",
        );
      }
      assertJournal(current);
      if (current.phase !== "ready") {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_STATE_INVALID",
          "Yalnız tamamlanmış migration günlüğünden yeni nesil başlatılabilir.",
        );
      }
      const shadowStore = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      );
      const shadowKeys = await requestResult(
        shadowStore
          .index("by-migration")
          .getAllKeys(IDBKeyRange.only(input.migrationId)),
      );
      for (const key of shadowKeys) await requestResult(shadowStore.delete(key));
      const next: LocalVaultMigrationJournalRecord = {
        id: input.migrationId,
        generation: current.generation + 1,
        version: LOCAL_VAULT_MIGRATION_JOURNAL_VERSION,
        targetEnvelopeVersion: LOCAL_VAULT_ENVELOPE_VERSION,
        sourceFingerprint: input.sourceFingerprint,
        sourceItemCount: input.sourceItemCount,
        phase: "staging",
        stagedItemCount: 0,
        revision: current.revision + 1,
      };
      await requestResult(journalStore.put(next));
      await completion;
      return structuredClone(next);
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

  async recreateReady(
    input: {
      migrationId: string;
      verifiedStateFingerprint: string;
      verifiedItemCount: number;
    },
    guard: LocalVaultMigrationMutationGuard,
  ): Promise<LocalVaultMigrationJournalRecord> {
    assertDigest(input.verifiedStateFingerprint);
    if (
      !input.migrationId ||
      !Number.isSafeInteger(input.verifiedItemCount) ||
      input.verifiedItemCount < 0
    ) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_STATE_INVALID",
        "Doğrulanmış hazır migration günlüğü yeniden oluşturulamadı.",
      );
    }
    const { transaction } = openLocalVaultReadwriteTransaction(this.database, [
      LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
    ]);
    const completion = transactionResult(transaction);
    try {
      await this.assertMutationGuard(transaction, guard);
      const journalStore = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      );
      const existing = await requestResult(
        journalStore.get(input.migrationId) as IDBRequest<
          LocalVaultMigrationJournalRecord | undefined
        >,
      );
      if (existing) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_STATE_INVALID",
          "Hazır migration günlüğü yalnız eksik durumda yeniden oluşturulabilir.",
        );
      }
      const shadowStore = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      );
      const shadowKeys = await requestResult(
        shadowStore
          .index("by-migration")
          .getAllKeys(IDBKeyRange.only(input.migrationId)),
      );
      for (const key of shadowKeys) await requestResult(shadowStore.delete(key));
      const created: LocalVaultMigrationJournalRecord = {
        id: input.migrationId,
        generation: 1,
        version: LOCAL_VAULT_MIGRATION_JOURNAL_VERSION,
        targetEnvelopeVersion: LOCAL_VAULT_ENVELOPE_VERSION,
        sourceFingerprint: input.verifiedStateFingerprint,
        sourceItemCount: input.verifiedItemCount,
        phase: "ready",
        stagedItemCount: input.verifiedItemCount,
        revision: 0,
      };
      await requestResult(journalStore.add(created));
      await completion;
      return structuredClone(created);
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

  async repairReadyGeneration(
    input: {
      migrationId: string;
      verifiedStateFingerprint: string;
      verifiedItemCount: number;
    },
    guard: LocalVaultMigrationMutationGuard,
  ): Promise<LocalVaultMigrationJournalRecord> {
    assertDigest(input.verifiedStateFingerprint);
    if (
      !input.migrationId ||
      !Number.isSafeInteger(input.verifiedItemCount) ||
      input.verifiedItemCount < 0
    ) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_STATE_INVALID",
        "Doğrulanmış migration onarım nesli oluşturulamadı.",
      );
    }
    const { transaction } = openLocalVaultReadwriteTransaction(this.database, [
      LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
    ]);
    const completion = transactionResult(transaction);
    try {
      await this.assertMutationGuard(transaction, guard);
      const journalStore = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      );
      const current = await requestResult(
        journalStore.get(input.migrationId) as IDBRequest<
          LocalVaultMigrationJournalRecord | undefined
        >,
      );
      if (!current) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_STATE_MISSING",
          "Migration onarımı için önceki günlük bulunamadı.",
        );
      }
      assertJournal(current);
      const shadowStore = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      );
      const shadowKeys = await requestResult(
        shadowStore
          .index("by-migration")
          .getAllKeys(IDBKeyRange.only(input.migrationId)),
      );
      for (const key of shadowKeys) await requestResult(shadowStore.delete(key));
      const repaired: LocalVaultMigrationJournalRecord = {
        id: input.migrationId,
        generation: current.generation + 1,
        version: LOCAL_VAULT_MIGRATION_JOURNAL_VERSION,
        targetEnvelopeVersion: LOCAL_VAULT_ENVELOPE_VERSION,
        sourceFingerprint: input.verifiedStateFingerprint,
        sourceItemCount: input.verifiedItemCount,
        phase: "ready",
        stagedItemCount: input.verifiedItemCount,
        revision: current.revision + 1,
      };
      await requestResult(journalStore.put(repaired));
      await completion;
      return structuredClone(repaired);
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

  async saveShadow(
    shadow: LocalVaultMigrationShadowRecord,
    guard: LocalVaultMigrationMutationGuard,
  ): Promise<void> {
    assertShadow(shadow);
    if (shadow.id !== this.shadowId(shadow.migrationId, shadow.itemId)) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_STATE_INVALID",
        "Yerel kasa migration gölge kimliği doğrulanamadı.",
      );
    }
    const { transaction } = openLocalVaultReadwriteTransaction(
      this.database,
      [
        LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
        LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
        LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
      ],
    );
    const completion = transactionResult(transaction);
    try {
      const journalStore = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      );
      await this.assertMutationGuard(transaction, guard);
      const current = await requestResult(
        journalStore.get(shadow.migrationId) as IDBRequest<
          LocalVaultMigrationJournalRecord | undefined
        >,
      );
      if (!current) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_STATE_MISSING",
          "Yerel kasa migration günlüğü bulunamadı.",
        );
      }
      assertJournal(current);
      if (
        current.phase !== "staging" ||
        current.sourceFingerprint !== shadow.sourceFingerprint
      ) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_STATE_INVALID",
          "Yerel kasa migration gölge yazımı mevcut aşamayla uyuşmuyor.",
        );
      }
      const shadowStore = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      );
      const previous = await requestResult(
        shadowStore.get(shadow.id) as IDBRequest<
          LocalVaultMigrationShadowRecord | undefined
        >,
      );
      if (previous) assertShadow(previous);
      await requestResult(shadowStore.put(structuredClone(shadow)));
      const stagedDelta = previous ? 0 : 1;
      const next = {
        ...current,
        stagedItemCount: current.stagedItemCount + stagedDelta,
        revision: current.revision + 1,
      } satisfies LocalVaultMigrationJournalRecord;
      if (next.stagedItemCount > next.sourceItemCount) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_STATE_INVALID",
          "Yerel kasa migration gölge sayısı kaynak sayısını aştı.",
        );
      }
      await requestResult(journalStore.put(next));
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

  async getShadow(
    migrationId: string,
    itemId: string,
  ): Promise<LocalVaultMigrationShadowRecord | null> {
    const transaction = this.database.transaction(
      LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      "readonly",
    );
    const completion = transactionResult(transaction);
    const value = await requestResult(
      transaction
        .objectStore(LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME)
        .get(this.shadowId(migrationId, itemId)) as IDBRequest<
        LocalVaultMigrationShadowRecord | undefined
      >,
    );
    await completion;
    if (!value) return null;
    assertShadow(value);
    return structuredClone(value);
  }

  async listShadows(
    migrationId: string,
  ): Promise<LocalVaultMigrationShadowRecord[]> {
    const transaction = this.database.transaction(
      LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      "readonly",
    );
    const completion = transactionResult(transaction);
    const store = transaction.objectStore(
      LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
    );
    const values = await requestResult(
      store.index("by-migration").getAll(IDBKeyRange.only(migrationId)) as IDBRequest<
        LocalVaultMigrationShadowRecord[]
      >,
    );
    await completion;
    values.forEach(assertShadow);
    return structuredClone(values).sort((left, right) =>
      left.itemId.localeCompare(right.itemId),
    );
  }

  async advance(
    migrationId: string,
    phase: LocalVaultMigrationPhase,
    guard: LocalVaultMigrationMutationGuard,
  ): Promise<LocalVaultMigrationJournalRecord> {
    const order: readonly LocalVaultMigrationPhase[] = [
      "staging",
      "verifying",
      "cutover-pending",
      "ready",
    ];
    const { transaction } = openLocalVaultReadwriteTransaction(this.database, [
      LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
    ]);
    const completion = transactionResult(transaction);
    try {
      const store = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      );
      await this.assertMutationGuard(transaction, guard);
      const current = await requestResult(
        store.get(migrationId) as IDBRequest<
          LocalVaultMigrationJournalRecord | undefined
        >,
      );
      if (!current) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_STATE_MISSING",
          "Yerel kasa migration günlüğü bulunamadı.",
        );
      }
      assertJournal(current);
      const currentIndex = order.indexOf(current.phase);
      const requestedIndex = order.indexOf(phase);
      if (
        requestedIndex < currentIndex ||
        requestedIndex > currentIndex + 1 ||
        (phase !== "staging" &&
          current.stagedItemCount !== current.sourceItemCount)
      ) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_STATE_INVALID",
          "Yerel kasa migration aşama geçişi doğrulanamadı.",
        );
      }
      if (phase === current.phase) {
        await completion;
        return structuredClone(current);
      }
      const next = {
        ...current,
        phase,
        revision: current.revision + 1,
      } satisfies LocalVaultMigrationJournalRecord;
      await requestResult(store.put(next));
      await completion;
      return structuredClone(next);
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

  async clearShadows(
    migrationId: string,
    guard: LocalVaultMigrationMutationGuard,
  ): Promise<void> {
    const { transaction } = openLocalVaultReadwriteTransaction(this.database, [
      LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
    ]);
    const completion = transactionResult(transaction);
    try {
      const store = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
      );
      await this.assertMutationGuard(transaction, guard);
      const keys = await requestResult(
        store.index("by-migration").getAllKeys(IDBKeyRange.only(migrationId)),
      );
      for (const key of keys) await requestResult(store.delete(key));
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

  async acquireFence(input: {
    migrationId: string;
    ownerId: string;
    nowMs: number;
    leaseMs: number;
  }): Promise<LocalVaultMigrationFenceLease> {
    if (
      !input.migrationId ||
      !input.ownerId ||
      !Number.isSafeInteger(input.nowMs) ||
      input.nowMs < 0 ||
      !Number.isSafeInteger(input.leaseMs) ||
      input.leaseMs < 1_000
    ) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_FENCE_INVALID",
        "Yerel kasa migration kilidi isteği doğrulanamadı.",
      );
    }
    const { transaction } = openLocalVaultReadwriteTransaction(
      this.database,
      LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
    );
    const completion = transactionResult(transaction);
    try {
      const store = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
      );
      const current = await requestResult(
        store.get(input.migrationId) as IDBRequest<
          LocalVaultMigrationFenceRecord | undefined
        >,
      );
      if (current) {
        assertFence(current);
        if (
          current.ownerId !== input.ownerId &&
          current.expiresAtMs > input.nowMs
        ) {
          throw new LocalVaultMigrationBusyError();
        }
      }
      const next: LocalVaultMigrationFenceRecord = {
        id: input.migrationId,
        ownerId: input.ownerId,
        expiresAtMs: input.nowMs + input.leaseMs,
        revision: (current?.revision ?? -1) + 1,
      };
      await requestResult(store.put(next));
      await completion;
      return { id: next.id, ownerId: next.ownerId, revision: next.revision };
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

  async renewFence(input: {
    lease: LocalVaultMigrationFenceLease;
    nowMs: number;
    leaseMs: number;
  }): Promise<LocalVaultMigrationFenceLease> {
    const { transaction } = openLocalVaultReadwriteTransaction(
      this.database,
      LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
    );
    const completion = transactionResult(transaction);
    try {
      const store = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
      );
      const current = await requestResult(
        store.get(input.lease.id) as IDBRequest<
          LocalVaultMigrationFenceRecord | undefined
        >,
      );
      if (!current) throw new LocalVaultMigrationBusyError();
      assertFence(current);
      if (
        current.ownerId !== input.lease.ownerId ||
        current.revision !== input.lease.revision ||
        current.expiresAtMs <= input.nowMs
      ) {
        throw new LocalVaultMigrationBusyError();
      }
      const next: LocalVaultMigrationFenceRecord = {
        ...current,
        expiresAtMs: input.nowMs + input.leaseMs,
        revision: current.revision + 1,
      };
      await requestResult(store.put(next));
      await completion;
      return { id: next.id, ownerId: next.ownerId, revision: next.revision };
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

  async releaseFence(lease: LocalVaultMigrationFenceLease): Promise<void> {
    const { transaction } = openLocalVaultReadwriteTransaction(
      this.database,
      LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
    );
    const completion = transactionResult(transaction);
    try {
      const store = transaction.objectStore(
        LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
      );
      const current = await requestResult(
        store.get(lease.id) as IDBRequest<
          LocalVaultMigrationFenceRecord | undefined
        >,
      );
      if (current) {
        assertFence(current);
        if (
          current.ownerId === lease.ownerId &&
          current.revision === lease.revision
        ) {
          await requestResult(store.delete(lease.id));
        } else {
          throw new LocalVaultMigrationBusyError();
        }
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

  shadowId(migrationId: string, itemId: string): string {
    return `${migrationId}\u0000${itemId}`;
  }
}
