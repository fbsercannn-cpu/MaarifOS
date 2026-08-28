import type { StoredRecord } from "../domain/model.ts";
import type { RecoverySnapshotRecord } from "../repository/contracts.ts";
import { canonicalJson } from "../backup/canonical-json.ts";
import {
  LOCAL_VAULT_ALGORITHM,
  LOCAL_VAULT_ENVELOPE_FIELD,
  LOCAL_VAULT_ENVELOPE_VERSION,
  LOCAL_VAULT_KEY_BITS,
  LOCAL_VAULT_KEY_ID,
  LOCAL_VAULT_SCHEMA_EPOCH,
  LocalVaultRecoveryRequiredError,
  LocalVaultSecurityError,
  assertLocalVaultCryptoKey,
  assertLocalVaultSealedRecord,
  bytesToBase64 as vaultBytesToBase64,
  hasLocalVaultEnvelope,
  openLocalVaultRecord,
  sealLocalVaultRecord,
  type LocalVaultSealedRecord,
} from "./local-vault-envelope.ts";
import {
  LOCAL_VAULT_NONCE_STORE_NAME,
  LOCAL_VAULT_NONCE_RESERVATION_STORE_NAME,
  allocateLocalVaultNonce,
  assertLocalVaultNonceAllocatorRecord,
  createLocalVaultNonceAllocatorRecord,
  ensureLocalVaultNonceStore,
  type LocalVaultNonceAllocatorRecord,
} from "./local-vault-nonce.ts";
import {
  LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME,
  LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
  LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME,
  LocalVaultMigrationBusyError,
  LocalVaultMigrationJournal,
  ensureLocalVaultMigrationStores,
  type LocalVaultMigrationFenceLease,
  type LocalVaultMigrationShadowRecord,
} from "./local-vault-migration-journal.ts";
import { openLocalVaultReadwriteTransaction } from "./local-vault-idb.ts";
import {
  acceptLocalVaultRecordGeneration,
  bindLocalVaultRecordGeneration,
  ensureLocalVaultRecordGenerationStores,
  prepareLocalVaultRecordGenerationRetirements,
  reconcileLocalVaultRecordGenerationRetirements,
  reserveLocalVaultRecordGeneration,
} from "./local-vault-record-generation.ts";

export const STUDENT_SENSITIVE_ENVELOPE_FIELD =
  "__maarifosStudentSensitive" as const;

export const STUDENT_SENSITIVE_KEY_STORE_NAME = "keys";
export const STUDENT_SENSITIVE_KEY_ID = "student-sensitive-aes-gcm-v1";
export const STUDENT_VAULT_MIGRATION_ID = "students-full-record-v2" as const;
export const STUDENT_VAULT_READY_STATE_ID = "students-v2" as const;
export const STUDENT_VAULT_ENVELOPE_FIELD = LOCAL_VAULT_ENVELOPE_FIELD;

const STUDENT_SENSITIVE_KEY_DATABASE_SUFFIX =
  "--maarifos-student-sensitive-keys";
const STUDENT_SENSITIVE_KEY_DATABASE_VERSION = 5;
const STUDENT_SENSITIVE_ENVELOPE_VERSION = 1 as const;
const STUDENT_SENSITIVE_ALGORITHM = "AES-GCM" as const;
const STUDENT_SENSITIVE_IV_BYTES = 12;
const STUDENT_SENSITIVE_KEY_BITS = 256;
const STUDENT_SENSITIVE_CONTEXT = "maarifos/student-sensitive/v1";

type StudentSensitiveCipherEnvelope = {
  version: typeof STUDENT_SENSITIVE_ENVELOPE_VERSION;
  algorithm: typeof STUDENT_SENSITIVE_ALGORITHM;
  iv: string;
  ciphertext: string;
};

type StudentSensitivePayload = {
  version: typeof STUDENT_SENSITIVE_ENVELOPE_VERSION;
  optionalCode?: string;
  nationalIdentityNumber?: string;
  contactPhones: Array<{ id: string; phone: string }>;
  contactNames: Array<{ id: string; name: string }>;
  careDetails?: Record<string, string | boolean>;
};

type SensitiveStudentRecord = StoredRecord & {
  [STUDENT_SENSITIVE_ENVELOPE_FIELD]?: StudentSensitiveCipherEnvelope;
};

type LegacyKeyRecord = {
  id: typeof STUDENT_SENSITIVE_KEY_ID;
  algorithm: typeof STUDENT_SENSITIVE_ALGORITHM;
  version: typeof STUDENT_SENSITIVE_ENVELOPE_VERSION;
  key: CryptoKey;
};

const LOCAL_VAULT_METADATA_STORE_NAME = "metadata" as const;
const LOCAL_VAULT_DATABASE_INSTANCE_ID = "database-instance-v2" as const;
const LOCAL_VAULT_METADATA_VERSION = 1 as const;
const MIGRATION_FENCE_LEASE_MS = 30_000;
const MIGRATION_FENCE_RETRY_MS = 20;
const MIGRATION_FENCE_MAX_ATTEMPTS = 150;

type LocalVaultKeyRecord = {
  id: typeof LOCAL_VAULT_KEY_ID;
  algorithm: typeof LOCAL_VAULT_ALGORITHM;
  version: typeof LOCAL_VAULT_ENVELOPE_VERSION;
  key: CryptoKey;
};

type LocalVaultDatabaseInstanceRecord = {
  id: typeof LOCAL_VAULT_DATABASE_INSTANCE_ID;
  version: typeof LOCAL_VAULT_METADATA_VERSION;
  databaseInstanceId: string;
};

type LocalVaultKeyContext = {
  key: CryptoKey;
  keyId: typeof LOCAL_VAULT_KEY_ID;
  databaseInstanceId: string;
};

export interface StudentVaultReadyState {
  id: typeof STUDENT_VAULT_READY_STATE_ID;
  state: "ready";
  version: 1;
  envelopeVersion: typeof LOCAL_VAULT_ENVELOPE_VERSION;
  schemaEpoch: typeof LOCAL_VAULT_SCHEMA_EPOCH;
  keyId: typeof LOCAL_VAULT_KEY_ID;
  databaseInstanceId: string;
}

export interface StudentVaultMigrationItem {
  itemId: string;
  collection: string;
  record: StoredRecord;
}

export interface StudentVaultMigrationState<Baseline> {
  readyState: unknown;
  items: readonly StudentVaultMigrationItem[];
  baseline: Baseline;
}

export interface StudentVaultMigrationAdapter<Baseline> {
  readState(): Promise<StudentVaultMigrationState<Baseline>>;
  commitCutover(input: {
    source: StudentVaultMigrationState<Baseline>;
    sealedRecords: ReadonlyMap<string, LocalVaultSealedRecord>;
    readyState: StudentVaultReadyState;
  }): Promise<void>;
}

export interface StudentSensitiveVaultOptions {
  databaseName: string;
  crypto?: Crypto;
  indexedDb?: IDBFactory;
  onMigrationCheckpoint?: (checkpoint: string) => void | Promise<void>;
  migrationNow?: () => number;
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
            new Error("Hassas veri anahtar deposu isteği tamamlanamadı."),
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
            new Error("Hassas veri anahtar işlemi geri alındı."),
        ),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(
          transaction.error ??
            new Error("Hassas veri anahtar işlemi başarısız oldu."),
        ),
      { once: true },
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)),
    );
  }
  return btoa(binary);
}

function base64ToBytes(
  value: string,
  expectedLength?: number,
): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error("Hassas veri şifreli zarfı doğrulanamadı.");
  }
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error("Hassas veri şifreli zarfı doğrulanamadı.");
  }
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (
    (expectedLength !== undefined && bytes.length !== expectedLength) ||
    bytesToBase64(bytes) !== value
  ) {
    throw new Error("Hassas veri şifreli zarfı doğrulanamadı.");
  }
  return bytes;
}

function assertCipherEnvelope(
  value: unknown,
): asserts value is StudentSensitiveCipherEnvelope {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !==
      "algorithm,ciphertext,iv,version" ||
    value.version !== STUDENT_SENSITIVE_ENVELOPE_VERSION ||
    value.algorithm !== STUDENT_SENSITIVE_ALGORITHM ||
    typeof value.iv !== "string" ||
    typeof value.ciphertext !== "string"
  ) {
    throw new Error("Hassas veri şifreli zarfı doğrulanamadı.");
  }
  base64ToBytes(value.iv, STUDENT_SENSITIVE_IV_BYTES);
  if (base64ToBytes(value.ciphertext).length < 16) {
    throw new Error("Hassas veri şifreli zarfı doğrulanamadı.");
  }
}

function assertCryptoKey(value: unknown): asserts value is CryptoKey {
  const algorithm =
    value instanceof CryptoKey
      ? (value.algorithm as Partial<AesKeyAlgorithm>)
      : undefined;
  if (
    !(value instanceof CryptoKey) ||
    value.type !== "secret" ||
    value.extractable ||
    algorithm?.name !== STUDENT_SENSITIVE_ALGORITHM ||
    algorithm.length !== STUDENT_SENSITIVE_KEY_BITS ||
    !value.usages.includes("encrypt") ||
    !value.usages.includes("decrypt")
  ) {
    throw new Error("Hassas veri anahtarı doğrulanamadı.");
  }
}

function assertLegacyKeyRecord(
  value: unknown,
): asserts value is LegacyKeyRecord {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !== "algorithm,id,key,version" ||
    value.id !== STUDENT_SENSITIVE_KEY_ID ||
    value.algorithm !== STUDENT_SENSITIVE_ALGORITHM ||
    value.version !== STUDENT_SENSITIVE_ENVELOPE_VERSION
  ) {
    throw new Error("Hassas veri anahtar kaydı doğrulanamadı.");
  }
  assertCryptoKey(value.key);
}

function contactRecords(record: StoredRecord): Record<string, unknown>[] {
  if (record.contacts === undefined) return [];
  if (!Array.isArray(record.contacts)) {
    throw new Error("Hassas öğrenci iletişim verisi doğrulanamadı.");
  }
  return record.contacts.map((contact) => {
    if (!isRecord(contact) || typeof contact.id !== "string") {
      throw new Error("Hassas öğrenci iletişim verisi doğrulanamadı.");
    }
    return contact;
  });
}

const STUDENT_CARE_DETAIL_LIMITS = {
  homeAddress: 500,
  allergies: 500,
  dietaryNeeds: 500,
  medicationNotes: 500,
  emergencyNotes: 1_000,
  physicianName: 120,
  physicianPhone: 30,
  medicalDevices: 500,
  guardianEmail: 254,
  familyEducationNeeds: 1_000,
  familyParticipationPreferences: 1_000,
  permissionFormDate: 10,
} as const;

const STUDENT_CARE_BOOLEAN_FIELDS = new Set([
  "photoVideoPermissionOnFile",
  "fieldTripPermissionOnFile",
  "digitalCommunicationPermissionOnFile",
]);

function careDetailsRecord(value: unknown): Record<string, string | boolean> {
  if (!isRecord(value)) {
    throw new Error("Hassas öğrenci sağlık ve güvenlik verisi doğrulanamadı.");
  }
  const keys = Object.keys(value);
  if (
    keys.length === 0 ||
    keys.some(
      (key) =>
        !(key in STUDENT_CARE_DETAIL_LIMITS) &&
        !STUDENT_CARE_BOOLEAN_FIELDS.has(key),
    )
  ) {
    throw new Error("Hassas öğrenci sağlık ve güvenlik verisi doğrulanamadı.");
  }
  const normalized: Record<string, string | boolean> = {};
  for (const key of keys) {
    const fieldValue = value[key];
    if (STUDENT_CARE_BOOLEAN_FIELDS.has(key)) {
      if (fieldValue !== true) {
        throw new Error("Hassas öğrenci sağlık ve güvenlik verisi doğrulanamadı.");
      }
      normalized[key] = true;
      continue;
    }
    const limit = STUDENT_CARE_DETAIL_LIMITS[
      key as keyof typeof STUDENT_CARE_DETAIL_LIMITS
    ];
    if (
      typeof fieldValue !== "string" ||
      !fieldValue.trim() ||
      fieldValue.length > limit
    ) {
      throw new Error("Hassas öğrenci sağlık ve güvenlik verisi doğrulanamadı.");
    }
    normalized[key] = fieldValue;
  }
  return normalized;
}

function containsLegacyPlaintext(record: StoredRecord): boolean {
  if (Object.prototype.hasOwnProperty.call(record, "nationalIdentityNumber")) {
    return true;
  }
  if (Object.prototype.hasOwnProperty.call(record, "careDetails")) return true;
  return contactRecords(record).some((contact) =>
    Object.prototype.hasOwnProperty.call(contact, "phone"),
  );
}

function containsExpandedPlaintext(record: StoredRecord): boolean {
  if (Object.prototype.hasOwnProperty.call(record, "optionalCode")) {
    return true;
  }
  return contactRecords(record).some((contact) =>
    Object.prototype.hasOwnProperty.call(contact, "name"),
  );
}

function containsPlaintext(record: StoredRecord): boolean {
  return containsLegacyPlaintext(record) || containsExpandedPlaintext(record);
}

function hasContactMetadata(record: StoredRecord): boolean {
  return contactRecords(record).length > 0;
}

function utf8Bytes(value: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(value);
  const bytes = new Uint8Array(new ArrayBuffer(encoded.byteLength));
  bytes.set(encoded);
  return bytes;
}

function sensitiveSubject(
  databaseName: string,
  subject: string,
): Uint8Array<ArrayBuffer> {
  return utf8Bytes(
    `${STUDENT_SENSITIVE_CONTEXT}\n${databaseName}\n${subject}`,
  );
}

function extractSensitivePayload(record: StoredRecord): {
  publicRecord: StoredRecord;
  payload: StudentSensitivePayload | null;
} {
  const publicRecord = structuredClone(record) as SensitiveStudentRecord;
  if (publicRecord[STUDENT_SENSITIVE_ENVELOPE_FIELD] !== undefined) {
    throw new Error("Hassas öğrenci kaydı iki kez şifrelenemez.");
  }

  const payload: StudentSensitivePayload = {
    version: STUDENT_SENSITIVE_ENVELOPE_VERSION,
    contactPhones: [],
    contactNames: [],
  };
  if (Object.prototype.hasOwnProperty.call(publicRecord, "optionalCode")) {
    if (
      typeof publicRecord.optionalCode !== "string" ||
      !publicRecord.optionalCode.trim() ||
      publicRecord.optionalCode.length > 40
    ) {
      throw new Error("Hassas öğrenci numarası doğrulanamadı.");
    }
    payload.optionalCode = publicRecord.optionalCode;
    delete publicRecord.optionalCode;
  }
  if (Object.prototype.hasOwnProperty.call(publicRecord, "nationalIdentityNumber")) {
    if (
      typeof publicRecord.nationalIdentityNumber !== "string" ||
      !publicRecord.nationalIdentityNumber
    ) {
      throw new Error("Hassas öğrenci kimlik verisi doğrulanamadı.");
    }
    payload.nationalIdentityNumber = publicRecord.nationalIdentityNumber;
    delete publicRecord.nationalIdentityNumber;
  }

  if (Object.prototype.hasOwnProperty.call(publicRecord, "careDetails")) {
    payload.careDetails = careDetailsRecord(publicRecord.careDetails);
    delete publicRecord.careDetails;
  }

  if (publicRecord.contacts !== undefined) {
    const contacts = contactRecords(publicRecord);
    const contactIds = new Set<string>();
    publicRecord.contacts = contacts.map((contact) => {
      if (contactIds.has(contact.id as string)) {
        throw new Error("Hassas öğrenci iletişim verisi doğrulanamadı.");
      }
      contactIds.add(contact.id as string);
      if (typeof contact.phone !== "string" || !contact.phone) {
        throw new Error("Hassas öğrenci iletişim verisi doğrulanamadı.");
      }
      payload.contactPhones.push({
        id: contact.id as string,
        phone: contact.phone,
      });
      const publicContact = structuredClone(contact);
      delete publicContact.phone;
      if (Object.prototype.hasOwnProperty.call(contact, "name")) {
        if (
          typeof contact.name !== "string" ||
          !contact.name.trim() ||
          contact.name.length > 120
        ) {
          throw new Error("Hassas öğrenci yakını adı doğrulanamadı.");
        }
        payload.contactNames.push({
          id: contact.id as string,
          name: contact.name,
        });
        delete publicContact.name;
      }
      return publicContact;
    });
  }

  const hasSensitiveValue =
    payload.optionalCode !== undefined ||
    payload.nationalIdentityNumber !== undefined ||
    payload.careDetails !== undefined ||
    payload.contactPhones.length > 0 ||
    payload.contactNames.length > 0;
  return { publicRecord, payload: hasSensitiveValue ? payload : null };
}

function parseSensitivePayload(value: unknown): StudentSensitivePayload {
  if (
    !isRecord(value) ||
    value.version !== STUDENT_SENSITIVE_ENVELOPE_VERSION ||
    !Array.isArray(value.contactPhones) ||
    (value.contactNames !== undefined && !Array.isArray(value.contactNames)) ||
    (value.optionalCode !== undefined &&
      (typeof value.optionalCode !== "string" ||
        !value.optionalCode.trim() ||
        value.optionalCode.length > 40)) ||
    (value.nationalIdentityNumber !== undefined &&
      (typeof value.nationalIdentityNumber !== "string" ||
        !value.nationalIdentityNumber)) ||
    Object.keys(value).some(
      (key) =>
        key !== "version" &&
        key !== "optionalCode" &&
        key !== "nationalIdentityNumber" &&
        key !== "contactPhones" &&
        key !== "contactNames" &&
        key !== "careDetails",
    )
  ) {
    throw new Error("Hassas öğrenci verisi doğrulanamadı.");
  }
  const ids = new Set<string>();
  const contactPhones = value.contactPhones.map((entry) => {
    if (
      !isRecord(entry) ||
      Object.keys(entry).sort().join(",") !== "id,phone" ||
      typeof entry.id !== "string" ||
      !entry.id ||
      ids.has(entry.id) ||
      typeof entry.phone !== "string" ||
      !entry.phone
    ) {
      throw new Error("Hassas öğrenci verisi doğrulanamadı.");
    }
    ids.add(entry.id);
    return { id: entry.id, phone: entry.phone };
  });
  const nameIds = new Set<string>();
  const contactNames = (value.contactNames ?? []).map((entry) => {
    if (
      !isRecord(entry) ||
      Object.keys(entry).sort().join(",") !== "id,name" ||
      typeof entry.id !== "string" ||
      !entry.id ||
      nameIds.has(entry.id) ||
      typeof entry.name !== "string" ||
      !entry.name.trim() ||
      entry.name.length > 120
    ) {
      throw new Error("Hassas öğrenci verisi doğrulanamadı.");
    }
    nameIds.add(entry.id);
    return { id: entry.id, name: entry.name };
  });
  return {
    version: STUDENT_SENSITIVE_ENVELOPE_VERSION,
    ...(typeof value.optionalCode === "string"
      ? { optionalCode: value.optionalCode }
      : {}),
    ...(typeof value.nationalIdentityNumber === "string"
      ? { nationalIdentityNumber: value.nationalIdentityNumber }
      : {}),
    contactPhones,
    contactNames,
    ...(value.careDetails !== undefined
      ? { careDetails: careDetailsRecord(value.careDetails) }
      : {}),
  };
}

function restoreSensitivePayload(
  publicRecord: StoredRecord,
  payload: StudentSensitivePayload,
  options: { allowLegacyExpandedPlaintext?: boolean } = {},
): StoredRecord {
  const restored = structuredClone(publicRecord) as SensitiveStudentRecord;
  delete restored[STUDENT_SENSITIVE_ENVELOPE_FIELD];
  const contacts = contactRecords(restored);
  const phoneByContact = new Map(
    payload.contactPhones.map((contact) => [contact.id, contact.phone]),
  );
  const nameByContact = new Map(
    payload.contactNames.map((contact) => [contact.id, contact.name]),
  );
  if (
    contacts.length !== phoneByContact.size ||
    contacts.some((contact) => !phoneByContact.has(contact.id as string)) ||
    [...nameByContact.keys()].some((id) => !phoneByContact.has(id))
  ) {
    throw new Error("Hassas öğrenci verisi doğrulanamadı.");
  }
  const publicHasOptionalCode = Object.prototype.hasOwnProperty.call(
    restored,
    "optionalCode",
  );
  if (
    (publicHasOptionalCode && !options.allowLegacyExpandedPlaintext) ||
    (publicHasOptionalCode && payload.optionalCode !== undefined)
  ) {
    throw new Error("Hassas öğrenci verisi doğrulanamadı.");
  }
  if (contacts.length > 0) {
    restored.contacts = contacts.map((contact) => {
      const id = contact.id as string;
      const publicHasName = Object.prototype.hasOwnProperty.call(
        contact,
        "name",
      );
      if (
        (publicHasName && !options.allowLegacyExpandedPlaintext) ||
        (publicHasName && nameByContact.has(id))
      ) {
        throw new Error("Hassas öğrenci verisi doğrulanamadı.");
      }
      return {
        ...contact,
        phone: phoneByContact.get(id) as string,
        ...(nameByContact.has(id)
          ? { name: nameByContact.get(id) as string }
          : {}),
      };
    });
  }
  if (payload.optionalCode !== undefined) {
    restored.optionalCode = payload.optionalCode;
  }
  if (payload.nationalIdentityNumber !== undefined) {
    restored.nationalIdentityNumber = payload.nationalIdentityNumber;
  }
  if (payload.careDetails !== undefined) {
    restored.careDetails = structuredClone(payload.careDetails);
  }
  return restored;
}

export function studentSensitiveKeyDatabaseName(
  applicationDatabaseName: string,
): string {
  return `${applicationDatabaseName}${STUDENT_SENSITIVE_KEY_DATABASE_SUFFIX}`;
}

export function hasSealedStudentSensitiveData(record: StoredRecord): boolean {
  return (
    hasLocalVaultEnvelope(record) ||
    (record as SensitiveStudentRecord)[STUDENT_SENSITIVE_ENVELOPE_FIELD] !==
    undefined
  );
}

export function hasPlaintextStudentSensitiveData(
  record: StoredRecord,
): boolean {
  return !hasLocalVaultEnvelope(record) && containsPlaintext(record);
}

function assertStudentVaultReadyState(
  value: unknown,
): asserts value is StudentVaultReadyState {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !==
      "databaseInstanceId,envelopeVersion,id,keyId,schemaEpoch,state,version" ||
    value.id !== STUDENT_VAULT_READY_STATE_ID ||
    value.state !== "ready" ||
    value.version !== 1 ||
    value.envelopeVersion !== LOCAL_VAULT_ENVELOPE_VERSION ||
    value.schemaEpoch !== LOCAL_VAULT_SCHEMA_EPOCH ||
    value.keyId !== LOCAL_VAULT_KEY_ID ||
    typeof value.databaseInstanceId !== "string" ||
    !value.databaseInstanceId
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_READY_STATE_INVALID",
      "Öğrenci kasası hazır durumu doğrulanamadı.",
    );
  }
}

function assertLocalVaultKeyRecord(
  value: unknown,
): asserts value is LocalVaultKeyRecord {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !== "algorithm,id,key,version" ||
    value.id !== LOCAL_VAULT_KEY_ID ||
    value.algorithm !== LOCAL_VAULT_ALGORITHM ||
    value.version !== LOCAL_VAULT_ENVELOPE_VERSION
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_KEY",
      "Yerel kasa anahtar kaydı doğrulanamadı.",
    );
  }
  assertLocalVaultCryptoKey(value.key);
}

function assertDatabaseInstanceRecord(
  value: unknown,
): asserts value is LocalVaultDatabaseInstanceRecord {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !==
      "databaseInstanceId,id,version" ||
    value.id !== LOCAL_VAULT_DATABASE_INSTANCE_ID ||
    value.version !== LOCAL_VAULT_METADATA_VERSION ||
    typeof value.databaseInstanceId !== "string" ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value.databaseInstanceId) ||
    value.databaseInstanceId.length % 4 !== 0
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INSTANCE_INVALID",
      "Yerel kasa veritabanı örneği doğrulanamadı.",
    );
  }
}

function assertMigrationItem(item: StudentVaultMigrationItem): void {
  if (
    !item.itemId ||
    !item.collection ||
    !item.record ||
    typeof item.record.id !== "string" ||
    !item.record.id
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_MIGRATION_SOURCE_INVALID",
      "Öğrenci kasası migration kaydı doğrulanamadı.",
    );
  }
  if (hasLocalVaultEnvelope(item.record)) {
    assertLocalVaultSealedRecord(item.record);
    return;
  }
  if (
    !Number.isSafeInteger(item.record.schemaVersion) ||
    item.record.schemaVersion < 1
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_MIGRATION_SOURCE_INVALID",
      "Öğrenci kasası migration kayıt şeması doğrulanamadı.",
    );
  }
}

export class StudentSensitiveVault {
  private readonly applicationDatabaseName: string;
  private readonly keyDatabaseName: string;
  private readonly cryptoProvider: Crypto;
  private readonly indexedDb: IDBFactory;
  private keyDatabasePromise: Promise<IDBDatabase> | undefined;
  private legacyKeyPromise: Promise<CryptoKey> | undefined;
  private v2ContextPromise: Promise<LocalVaultKeyContext> | undefined;
  private migrationJournal: LocalVaultMigrationJournal | undefined;
  private readonly onMigrationCheckpoint:
    | ((checkpoint: string) => void | Promise<void>)
    | undefined;
  private readonly migrationNow: () => number;

  constructor(options: StudentSensitiveVaultOptions) {
    this.applicationDatabaseName = options.databaseName;
    this.keyDatabaseName = studentSensitiveKeyDatabaseName(
      options.databaseName,
    );
    const cryptoProvider = options.crypto ?? globalThis.crypto;
    const indexedDb = options.indexedDb ?? globalThis.indexedDB;
    if (!cryptoProvider?.subtle || !indexedDb) {
      throw new Error("Hassas veri kasası bu ortamda kullanılamıyor.");
    }
    this.cryptoProvider = cryptoProvider;
    this.indexedDb = indexedDb;
    this.onMigrationCheckpoint = options.onMigrationCheckpoint;
    this.migrationNow = options.migrationNow ?? (() => Date.now());
  }

  async sealStudentRecord(
    record: StoredRecord,
    subject: string,
  ): Promise<StoredRecord> {
    this.assertStudentSubject(record.id, subject);
    return (await this.sealV2Record(
      record,
      "students",
    )) as unknown as StoredRecord;
  }

  async openStudentRecord(
    record: StoredRecord,
    subject: string,
    options: { allowLegacyPlaintext?: boolean } = {},
  ): Promise<StoredRecord> {
    this.assertStudentSubject(record.id, subject);
    if (hasLocalVaultEnvelope(record)) {
      return this.openV2Record(record, "students", record.id);
    }
    const envelope = (record as SensitiveStudentRecord)[
      STUDENT_SENSITIVE_ENVELOPE_FIELD
    ];
    if (envelope === undefined) {
      if (options.allowLegacyPlaintext) return structuredClone(record);
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_REQUIRED",
        "Öğrenci kaydı v2 yerel kasaya taşınmadan açılamaz.",
      );
    }
    if (!options.allowLegacyPlaintext) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_REQUIRED",
        "Öğrenci kaydı v2 yerel kasaya taşınmadan açılamaz.",
      );
    }
    return this.openLegacySealedStudentRecord(record, subject, {
      allowLegacyExpandedPlaintext: true,
    });
  }

  private assertStudentSubject(studentId: string, subject: string): void {
    if (!studentId || subject !== `student:${studentId}`) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_SUBJECT_MISMATCH",
        "Öğrenci kasası kayıt kimliği bağlamla uyuşmuyor.",
      );
    }
  }

  private async sealV2Record(
    record: StoredRecord,
    collection: string,
  ): Promise<LocalVaultSealedRecord> {
    if (
      hasLocalVaultEnvelope(record) ||
      Object.prototype.hasOwnProperty.call(
        record,
        STUDENT_SENSITIVE_ENVELOPE_FIELD,
      )
    ) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_DOUBLE_SEAL",
        "Öğrenci kasası kaydı iki kez şifrelenemez.",
      );
    }
    const context = await this.getOrCreateV2Context();
    const database = await this.openKeyDatabase();
    const recordGeneration = await reserveLocalVaultRecordGeneration(
      database,
      context.keyId,
      collection,
      record.id,
    );
    const nonce = await allocateLocalVaultNonce(
      database,
      context.keyId,
      this.cryptoProvider,
    );
    await this.checkpoint(
      `student-vault-v2:nonce-reserved:${collection}:${record.id}`,
    );
    const sealed = await sealLocalVaultRecord(record, {
      crypto: this.cryptoProvider,
      key: context.key,
      nonce,
      context: {
        databaseInstanceId: context.databaseInstanceId,
        collection,
        recordId: record.id,
        recordSchemaVersion: record.schemaVersion,
        recordGeneration,
        keyId: context.keyId,
      },
    });
    await bindLocalVaultRecordGeneration(database, {
      keyId: context.keyId,
      collection,
      recordId: record.id,
      generation: recordGeneration,
      envelopeSha256: await this.sha256(sealed),
    });
    return sealed;
  }

  private async openV2Record(
    record: StoredRecord,
    collection: string,
    expectedRecordId: string,
  ): Promise<StoredRecord> {
    const context = await this.getExistingV2Context();
    const opened = await openLocalVaultRecord(record, {
      crypto: this.cryptoProvider,
      key: context.key,
      databaseInstanceId: context.databaseInstanceId,
      collection,
      expectedRecordId,
      expectedKeyId: context.keyId,
    });
    await this.acceptV2Envelope(record, collection, expectedRecordId, context);
    return opened;
  }

  private async acceptV2Envelope(
    record: StoredRecord,
    collection: string,
    expectedRecordId: string,
    context: LocalVaultKeyContext,
  ): Promise<void> {
    assertLocalVaultSealedRecord(record);
    const envelope = record[LOCAL_VAULT_ENVELOPE_FIELD];
    await acceptLocalVaultRecordGeneration(await this.openKeyDatabase(), {
      keyId: context.keyId,
      collection,
      recordId: expectedRecordId,
      generation: envelope.recordGeneration,
      envelopeSha256: await this.sha256(record),
    });
  }

  private async openLegacySealedStudentRecord(
    record: StoredRecord,
    subject: string,
    options: { allowLegacyExpandedPlaintext?: boolean } = {},
  ): Promise<StoredRecord> {
    const envelope = (record as SensitiveStudentRecord)[
      STUDENT_SENSITIVE_ENVELOPE_FIELD
    ];
    assertCipherEnvelope(envelope);
    const key = await this.getExistingKey();
    let plaintext: ArrayBuffer;
    try {
      plaintext = await this.cryptoProvider.subtle.decrypt(
        {
          name: STUDENT_SENSITIVE_ALGORITHM,
          iv: base64ToBytes(envelope.iv, STUDENT_SENSITIVE_IV_BYTES),
          additionalData: sensitiveSubject(
            this.applicationDatabaseName,
            subject,
          ),
          tagLength: 128,
        },
        key,
        base64ToBytes(envelope.ciphertext),
      );
    } catch {
      throw new Error(
        "Hassas öğrenci verisi doğrulanamadı; erişim güvenlik nedeniyle durduruldu.",
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext));
    } catch {
      throw new Error("Hassas öğrenci verisi doğrulanamadı.");
    }
    return restoreSensitivePayload(record, parseSensitivePayload(parsed), options);
  }

  async sealRecoverySnapshot(
    snapshot: RecoverySnapshotRecord,
  ): Promise<RecoverySnapshotRecord> {
    const sealed = structuredClone(snapshot);
    sealed.envelope.payload.students = await Promise.all(
      sealed.envelope.payload.students.map(async (student) =>
        (await this.sealV2Record(
          student,
          this.recoveryStudentCollection(snapshot.id),
        )) as unknown as StoredRecord,
      ),
    );
    return sealed;
  }

  async openRecoverySnapshot(
    snapshot: RecoverySnapshotRecord,
    options: { allowLegacyPlaintext?: boolean } = {},
  ): Promise<RecoverySnapshotRecord> {
    const opened = structuredClone(snapshot);
    const students = opened?.envelope?.payload?.students;
    if (!Array.isArray(students)) {
      throw new Error("Kurtarma snapshot hassas veri yapısı doğrulanamadı.");
    }
    opened.envelope.payload.students = await Promise.all(
      students.map(async (student) => {
        if (hasLocalVaultEnvelope(student)) {
          return this.openV2Record(
            student,
            this.recoveryStudentCollection(snapshot.id),
            student.id,
          );
        }
        if (!options.allowLegacyPlaintext) {
          throw new LocalVaultSecurityError(
            "LOCAL_VAULT_MIGRATION_REQUIRED",
            "Kurtarma snapshot öğrenci kaydı v2 yerel kasaya taşınmadan açılamaz.",
          );
        }
        return this.openLegacyRecord(
          student,
          this.recoveryStudentSubject(snapshot.id, student.id),
        );
      }),
    );
    return opened;
  }

  async acceptCommittedStudentRecords(
    records: readonly StoredRecord[],
  ): Promise<void> {
    const context = await this.getExistingV2Context();
    for (const record of records) {
      await this.acceptV2Envelope(record, "students", record.id, context);
    }
    await reconcileLocalVaultRecordGenerationRetirements(
      await this.openKeyDatabase(),
      {
        keyId: context.keyId,
        scope: "students",
        presentRecords: records.map((record) => ({
          collection: "students",
          recordId: record.id,
        })),
      },
    );
  }

  async prepareCommittedStudentRecordRetirements(
    records: readonly StoredRecord[],
  ): Promise<void> {
    const context = await this.getExistingV2Context();
    await prepareLocalVaultRecordGenerationRetirements(
      await this.openKeyDatabase(),
      {
        keyId: context.keyId,
        scope: "students",
        presentRecords: records.map((record) => ({
          collection: "students",
          recordId: record.id,
        })),
      },
    );
  }

  async acceptCommittedRecoverySnapshots(
    snapshots: readonly RecoverySnapshotRecord[],
  ): Promise<void> {
    const context = await this.getExistingV2Context();
    const presentRecords: Array<{ collection: string; recordId: string }> = [];
    for (const snapshot of snapshots) {
      const students = snapshot?.envelope?.payload?.students;
      if (!Array.isArray(students)) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_INVALID_RECORD",
          "Kurtarma snapshot öğrenci yapısı doğrulanamadı.",
        );
      }
      const collection = this.recoveryStudentCollection(snapshot.id);
      for (const student of students) {
        await this.acceptV2Envelope(student, collection, student.id, context);
        presentRecords.push({ collection, recordId: student.id });
      }
    }
    await reconcileLocalVaultRecordGenerationRetirements(
      await this.openKeyDatabase(),
      {
        keyId: context.keyId,
        scope: "recovery-students",
        presentRecords,
      },
    );
  }

  async prepareCommittedRecoverySnapshotRetirements(
    snapshots: readonly RecoverySnapshotRecord[],
  ): Promise<void> {
    const context = await this.getExistingV2Context();
    const presentRecords: Array<{ collection: string; recordId: string }> = [];
    for (const snapshot of snapshots) {
      const students = snapshot?.envelope?.payload?.students;
      if (!Array.isArray(students)) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_INVALID_RECORD",
          "Kurtarma snapshot öğrenci yapısı doğrulanamadı.",
        );
      }
      const collection = this.recoveryStudentCollection(snapshot.id);
      for (const student of students) {
        presentRecords.push({ collection, recordId: student.id });
      }
    }
    await prepareLocalVaultRecordGenerationRetirements(
      await this.openKeyDatabase(),
      {
        keyId: context.keyId,
        scope: "recovery-students",
        presentRecords,
      },
    );
  }

  async migrateStudentRecord(
    record: StoredRecord,
    subject: string,
  ): Promise<{ record: StoredRecord; changed: boolean }> {
    const collection = this.collectionForSubject(record.id, subject);
    if (hasLocalVaultEnvelope(record)) {
      await this.openV2Record(record, collection, record.id);
      return { record: structuredClone(record), changed: false };
    }
    const opened = await this.openLegacyRecord(record, subject);
    return {
      record: (await this.sealV2Record(
        opened,
        collection,
      )) as unknown as StoredRecord,
      changed: true,
    };
  }

  async migrateRecoverySnapshot(
    snapshot: RecoverySnapshotRecord,
  ): Promise<{ snapshot: RecoverySnapshotRecord; changed: boolean }> {
    const migrated = structuredClone(snapshot);
    const students = migrated?.envelope?.payload?.students;
    if (!Array.isArray(students)) {
      throw new Error("Kurtarma snapshot hassas veri yapısı doğrulanamadı.");
    }
    let changed = false;
    migrated.envelope.payload.students = await Promise.all(
      students.map(async (student) => {
        const result = await this.migrateStudentRecord(
          student,
          this.recoveryStudentSubject(snapshot.id, student.id),
        );
        changed ||= result.changed;
        return result.record;
      }),
    );
    return { snapshot: migrated, changed };
  }

  async ensureStudentVaultReady<Baseline>(
    adapter: StudentVaultMigrationAdapter<Baseline>,
  ): Promise<void> {
    const journal = await this.getMigrationJournal();
    const ownerId = vaultBytesToBase64(this.randomBytes(16));
    let lease = await this.acquireMigrationFence(journal, ownerId);
    try {
      const source = await adapter.readState();
      if (source.readyState !== undefined) {
        await this.verifyReadyMigrationState(source);
        lease = await this.reconcileReadyJournal(source, journal, lease);
        await this.deleteLegacyKeyAfterV2Ready();
        return;
      }
      const items = this.sortedMigrationItems(source.items);
      const v2ItemCount = items.filter((item) =>
        hasLocalVaultEnvelope(item.record),
      ).length;
      if (v2ItemCount > 0) {
        if (v2ItemCount !== items.length) {
          throw new LocalVaultSecurityError(
            "LOCAL_VAULT_MIXED_VERSION",
            "Hazır işareti olmadan karışık öğrenci kasa sürümleri bulundu.",
          );
        }
        lease = await this.repairMissingReadyState(
          adapter,
          source,
          items,
          journal,
          lease,
        );
        await this.deleteLegacyKeyAfterV2Ready();
        return;
      }
      const sourceFingerprint = await this.sha256(
        items.map((item) => ({
          itemId: item.itemId,
          collection: item.collection,
          record: item.record,
        })),
      );
      lease = await this.renewMigrationFence(journal, lease);
      const journalInput = {
        migrationId: STUDENT_VAULT_MIGRATION_ID,
        sourceFingerprint,
        sourceItemCount: items.length,
      };
      const existingJournal = await journal.load(STUDENT_VAULT_MIGRATION_ID);
      let journalState =
        existingJournal?.phase === "ready"
          ? await journal.restartReadyGeneration(
              journalInput,
              this.migrationGuard(lease),
            )
          : await journal.beginOrResume(
              journalInput,
              this.migrationGuard(lease),
            );
      await this.checkpoint("student-vault-v2:journal-ready");
      const keyContext = await this.getOrCreateV2Context();

      if (journalState.phase === "staging") {
        for (const item of items) {
          const sourceRecordSha256 = await this.sha256(item.record);
          const plaintext = await this.openLegacyRecord(
            item.record,
            this.legacySubjectForItem(item),
          );
          const plaintextSha256 = await this.sha256(plaintext);
          const existing = await journal.getShadow(
            STUDENT_VAULT_MIGRATION_ID,
            item.itemId,
          );
          if (existing) {
            if (
              existing.sourceFingerprint !== sourceFingerprint ||
              existing.sourceRecordSha256 !== sourceRecordSha256 ||
              existing.plaintextSha256 !== plaintextSha256
            ) {
              throw new LocalVaultSecurityError(
                "LOCAL_VAULT_MIGRATION_SHADOW_TAMPERED",
                "Öğrenci kasası migration gölge kaydı kaynakla uyuşmuyor.",
              );
            }
            await this.verifyShadowRecord(existing, item, plaintext, keyContext);
          } else {
            const sealedRecord = await this.sealV2Record(
              plaintext,
              item.collection,
            );
            const shadow: LocalVaultMigrationShadowRecord = {
              id: journal.shadowId(STUDENT_VAULT_MIGRATION_ID, item.itemId),
              migrationId: STUDENT_VAULT_MIGRATION_ID,
              itemId: item.itemId,
              sourceFingerprint,
              sourceRecordSha256,
              plaintextSha256,
              sealedRecord,
            };
            lease = await this.renewMigrationFence(journal, lease);
            await journal.saveShadow(shadow, this.migrationGuard(lease));
          }
          lease = await this.renewMigrationFence(journal, lease);
          await this.checkpoint(`student-vault-v2:staged:${item.itemId}`);
        }
        lease = await this.renewMigrationFence(journal, lease);
        journalState = await journal.advance(
          STUDENT_VAULT_MIGRATION_ID,
          "verifying",
          this.migrationGuard(lease),
        );
      }

      lease = await this.renewMigrationFence(journal, lease);
      const shadows = await journal.listShadows(STUDENT_VAULT_MIGRATION_ID);
      const sealedRecords = await this.verifyMigrationShadows(
        items,
        shadows,
        sourceFingerprint,
        keyContext,
      );
      lease = await this.renewMigrationFence(journal, lease);
      await this.checkpoint("student-vault-v2:verified");
      if (journalState.phase === "verifying") {
        journalState = await journal.advance(
          STUDENT_VAULT_MIGRATION_ID,
          "cutover-pending",
          this.migrationGuard(lease),
        );
      }
      if (journalState.phase !== "cutover-pending") {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_STATE_INVALID",
          "Öğrenci kasası migration cutover aşaması doğrulanamadı.",
        );
      }
      await this.checkpoint("student-vault-v2:cutover-pending");
      const readyState: StudentVaultReadyState = {
        id: STUDENT_VAULT_READY_STATE_ID,
        state: "ready",
        version: 1,
        envelopeVersion: LOCAL_VAULT_ENVELOPE_VERSION,
        schemaEpoch: LOCAL_VAULT_SCHEMA_EPOCH,
        keyId: keyContext.keyId,
        databaseInstanceId: keyContext.databaseInstanceId,
      };
      lease = await this.renewMigrationFence(journal, lease);
      await adapter.commitCutover({ source, sealedRecords, readyState });
      await this.checkpoint("student-vault-v2:cutover-committed");
      lease = await this.renewMigrationFence(journal, lease);
      await journal.advance(
        STUDENT_VAULT_MIGRATION_ID,
        "ready",
        this.migrationGuard(lease),
      );
      lease = await this.renewMigrationFence(journal, lease);
      await journal.clearShadows(
        STUDENT_VAULT_MIGRATION_ID,
        this.migrationGuard(lease),
      );
      await this.checkpoint("student-vault-v2:ready");
      await this.verifyReadyMigrationState(await adapter.readState());
      await this.deleteLegacyKeyAfterV2Ready();
    } finally {
      await journal.releaseFence(lease).catch(() => undefined);
    }
  }

  private sortedMigrationItems(
    values: readonly StudentVaultMigrationItem[],
  ): StudentVaultMigrationItem[] {
    const items = values.map((item) => {
      assertMigrationItem(item);
      return {
        itemId: item.itemId,
        collection: item.collection,
        record: structuredClone(item.record),
      };
    });
    items.sort((left, right) => left.itemId.localeCompare(right.itemId));
    const itemIds = new Set<string>();
    for (const item of items) {
      if (itemIds.has(item.itemId)) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_SOURCE_INVALID",
          "Öğrenci kasası migration kaydı yinelenen kimlik içeriyor.",
        );
      }
      itemIds.add(item.itemId);
    }
    return items;
  }

  private legacySubjectForItem(item: StudentVaultMigrationItem): string {
    if (item.collection === "students") return `student:${item.record.id}`;
    const prefix = "recoverySnapshots/";
    const suffix = "/students";
    if (item.collection.startsWith(prefix) && item.collection.endsWith(suffix)) {
      const snapshotId = item.collection.slice(prefix.length, -suffix.length);
      if (snapshotId) {
        return this.recoveryStudentSubject(snapshotId, item.record.id);
      }
    }
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_MIGRATION_SOURCE_INVALID",
      "Öğrenci kasası migration koleksiyonu doğrulanamadı.",
    );
  }

  private async verifyShadowRecord(
    shadow: LocalVaultMigrationShadowRecord,
    item: StudentVaultMigrationItem,
    expectedPlaintext: StoredRecord,
    context: LocalVaultKeyContext,
  ): Promise<void> {
    assertLocalVaultSealedRecord(shadow.sealedRecord);
    const opened = await openLocalVaultRecord(shadow.sealedRecord, {
      crypto: this.cryptoProvider,
      key: context.key,
      databaseInstanceId: context.databaseInstanceId,
      collection: item.collection,
      expectedRecordId: item.record.id,
      expectedKeyId: context.keyId,
    });
    if (canonicalJson(opened) !== canonicalJson(expectedPlaintext)) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_VERIFY_FAILED",
        "Öğrenci kasası migration kanonik eşitlik doğrulaması başarısız oldu.",
      );
    }
  }

  private async verifyMigrationShadows(
    items: readonly StudentVaultMigrationItem[],
    shadows: readonly LocalVaultMigrationShadowRecord[],
    sourceFingerprint: string,
    context: LocalVaultKeyContext,
  ): Promise<ReadonlyMap<string, LocalVaultSealedRecord>> {
    const shadowByItemId = new Map(shadows.map((shadow) => [shadow.itemId, shadow]));
    if (
      shadowByItemId.size !== items.length ||
      shadows.length !== items.length
    ) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_VERIFY_FAILED",
        "Öğrenci kasası migration gölge kayıt sayısı doğrulanamadı.",
      );
    }
    const sealed = new Map<string, LocalVaultSealedRecord>();
    for (const item of items) {
      const shadow = shadowByItemId.get(item.itemId);
      if (!shadow || shadow.sourceFingerprint !== sourceFingerprint) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_VERIFY_FAILED",
          "Öğrenci kasası migration gölge kaydı eksik veya farklı kaynağa ait.",
        );
      }
      const plaintext = await this.openLegacyRecord(
        item.record,
        this.legacySubjectForItem(item),
      );
      if (
        shadow.sourceRecordSha256 !== (await this.sha256(item.record)) ||
        shadow.plaintextSha256 !== (await this.sha256(plaintext))
      ) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIGRATION_SHADOW_TAMPERED",
          "Öğrenci kasası migration gölge özeti doğrulanamadı.",
        );
      }
      await this.verifyShadowRecord(shadow, item, plaintext, context);
      sealed.set(item.itemId, structuredClone(shadow.sealedRecord));
    }
    return sealed;
  }

  private async verifyReadyMigrationState<Baseline>(
    state: StudentVaultMigrationState<Baseline>,
  ): Promise<void> {
    assertStudentVaultReadyState(state.readyState);
    const context = await this.getExistingV2Context();
    if (
      state.readyState.keyId !== context.keyId ||
      state.readyState.databaseInstanceId !== context.databaseInstanceId
    ) {
      throw new LocalVaultRecoveryRequiredError(
        "Öğrenci kasası anahtarı hazır durumla uyuşmuyor; yalnız şifreli yedekten kurtarma yapılabilir.",
      );
    }
    const items = this.sortedMigrationItems(state.items);
    for (const item of items) {
      if (!hasLocalVaultEnvelope(item.record)) {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_MIXED_VERSION",
          "Hazır öğrenci kasasında açık veya eski sürüm kayıt bulundu.",
        );
      }
      await openLocalVaultRecord(item.record, {
        crypto: this.cryptoProvider,
        key: context.key,
        databaseInstanceId: context.databaseInstanceId,
        collection: item.collection,
        expectedRecordId: item.record.id,
        expectedKeyId: context.keyId,
      });
      await this.acceptV2Envelope(
        item.record,
        item.collection,
        item.record.id,
        context,
      );
    }
    const database = await this.openKeyDatabase();
    await reconcileLocalVaultRecordGenerationRetirements(database, {
      keyId: context.keyId,
      scope: "students",
      presentRecords: items
        .filter((item) => item.collection === "students")
        .map((item) => ({
          collection: item.collection,
          recordId: item.record.id,
        })),
    });
    await reconcileLocalVaultRecordGenerationRetirements(database, {
      keyId: context.keyId,
      scope: "recovery-students",
      presentRecords: items
        .filter(
          (item) =>
            item.collection.startsWith("recoverySnapshots/") &&
            item.collection.endsWith("/students"),
        )
        .map((item) => ({
          collection: item.collection,
          recordId: item.record.id,
        })),
    });
  }

  private async repairMissingReadyState<Baseline>(
    adapter: StudentVaultMigrationAdapter<Baseline>,
    source: StudentVaultMigrationState<Baseline>,
    items: readonly StudentVaultMigrationItem[],
    journal: LocalVaultMigrationJournal,
    initialLease: LocalVaultMigrationFenceLease,
  ): Promise<LocalVaultMigrationFenceLease> {
    let lease = initialLease;
    const context = await this.getExistingV2Context();
    const sealedRecords = new Map<string, LocalVaultSealedRecord>();
    for (const item of items) {
      assertLocalVaultSealedRecord(item.record);
      await openLocalVaultRecord(item.record, {
        crypto: this.cryptoProvider,
        key: context.key,
        databaseInstanceId: context.databaseInstanceId,
        collection: item.collection,
        expectedRecordId: item.record.id,
        expectedKeyId: context.keyId,
      });
      await this.acceptV2Envelope(
        item.record,
        item.collection,
        item.record.id,
        context,
      );
      sealedRecords.set(item.itemId, structuredClone(item.record));
    }
    const readyState: StudentVaultReadyState = {
      id: STUDENT_VAULT_READY_STATE_ID,
      state: "ready",
      version: 1,
      envelopeVersion: LOCAL_VAULT_ENVELOPE_VERSION,
      schemaEpoch: LOCAL_VAULT_SCHEMA_EPOCH,
      keyId: context.keyId,
      databaseInstanceId: context.databaseInstanceId,
    };
    lease = await this.renewMigrationFence(journal, lease);
    await adapter.commitCutover({ source, sealedRecords, readyState });
    await this.checkpoint("student-vault-v2:ready-marker-repaired");
    const verified = await adapter.readState();
    await this.verifyReadyMigrationState(verified);
    return this.reconcileReadyJournal(verified, journal, lease);
  }

  private async reconcileReadyJournal<Baseline>(
    verifiedState: StudentVaultMigrationState<Baseline>,
    journal: LocalVaultMigrationJournal,
    initialLease: LocalVaultMigrationFenceLease,
  ): Promise<LocalVaultMigrationFenceLease> {
    let lease = initialLease;
    const state = await journal.load(STUDENT_VAULT_MIGRATION_ID);
    const items = this.sortedMigrationItems(verifiedState.items);
    const verifiedStateFingerprint = await this.sha256(
      items.map((item) => ({
        itemId: item.itemId,
        collection: item.collection,
        record: item.record,
      })),
    );
    if (!state) {
      lease = await this.renewMigrationFence(journal, lease);
      await journal.recreateReady(
        {
          migrationId: STUDENT_VAULT_MIGRATION_ID,
          verifiedStateFingerprint,
          verifiedItemCount: items.length,
        },
        this.migrationGuard(lease),
      );
    } else if (state.phase === "cutover-pending") {
      lease = await this.renewMigrationFence(journal, lease);
      await journal.advance(
        STUDENT_VAULT_MIGRATION_ID,
        "ready",
        this.migrationGuard(lease),
      );
    } else if (state.phase === "staging" || state.phase === "verifying") {
      lease = await this.renewMigrationFence(journal, lease);
      await journal.repairReadyGeneration(
        {
          migrationId: STUDENT_VAULT_MIGRATION_ID,
          verifiedStateFingerprint,
          verifiedItemCount: items.length,
        },
        this.migrationGuard(lease),
      );
    } else if (state.phase !== "ready") {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIGRATION_STATE_INVALID",
        "Hazır öğrenci kasasının migration aşaması doğrulanamadı.",
      );
    }
    const shadows = await journal.listShadows(STUDENT_VAULT_MIGRATION_ID);
    if (shadows.length > 0) {
      lease = await this.renewMigrationFence(journal, lease);
      await journal.clearShadows(
        STUDENT_VAULT_MIGRATION_ID,
        this.migrationGuard(lease),
      );
    }
    return lease;
  }

  private migrationGuard(
    lease: LocalVaultMigrationFenceLease,
  ): { lease: LocalVaultMigrationFenceLease; nowMs: number } {
    return { lease, nowMs: this.migrationNow() };
  }

  private renewMigrationFence(
    journal: LocalVaultMigrationJournal,
    lease: LocalVaultMigrationFenceLease,
  ): Promise<LocalVaultMigrationFenceLease> {
    return journal.renewFence({
      lease,
      nowMs: this.migrationNow(),
      leaseMs: MIGRATION_FENCE_LEASE_MS,
    });
  }

  private async acquireMigrationFence(
    journal: LocalVaultMigrationJournal,
    ownerId: string,
  ): Promise<LocalVaultMigrationFenceLease> {
    for (let attempt = 0; attempt < MIGRATION_FENCE_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await journal.acquireFence({
          migrationId: STUDENT_VAULT_MIGRATION_ID,
          ownerId,
          nowMs: this.migrationNow(),
          leaseMs: MIGRATION_FENCE_LEASE_MS,
        });
      } catch (error) {
        if (!(error instanceof LocalVaultMigrationBusyError)) throw error;
        if (attempt === MIGRATION_FENCE_MAX_ATTEMPTS - 1) throw error;
        await new Promise<void>((resolve) => {
          setTimeout(resolve, MIGRATION_FENCE_RETRY_MS);
        });
      }
    }
    throw new LocalVaultMigrationBusyError();
  }

  close(): void {
    const current = this.keyDatabasePromise;
    this.keyDatabasePromise = undefined;
    this.legacyKeyPromise = undefined;
    this.v2ContextPromise = undefined;
    this.migrationJournal = undefined;
    if (current) {
      void current
        .then((database) => database.close())
        .catch(() => undefined);
    }
  }

  private recoveryStudentSubject(snapshotId: string, studentId: string): string {
    return `recovery:${snapshotId}:student:${studentId}`;
  }

  private recoveryStudentCollection(snapshotId: string): string {
    return `recoverySnapshots/${snapshotId}/students`;
  }

  private collectionForSubject(studentId: string, subject: string): string {
    if (subject === `student:${studentId}`) return "students";
    const suffix = `:student:${studentId}`;
    if (subject.startsWith("recovery:") && subject.endsWith(suffix)) {
      const snapshotId = subject.slice("recovery:".length, -suffix.length);
      if (snapshotId) return this.recoveryStudentCollection(snapshotId);
    }
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_SUBJECT_MISMATCH",
      "Öğrenci kasası kayıt konusu doğrulanamadı.",
    );
  }

  private async openLegacyRecord(
    record: StoredRecord,
    subject: string,
  ): Promise<StoredRecord> {
    if (hasLocalVaultEnvelope(record)) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_MIXED_VERSION",
        "v2 öğrenci kasası kaydı legacy kaynak olarak açılamaz.",
      );
    }
    if (
      Object.prototype.hasOwnProperty.call(
        record,
        STUDENT_SENSITIVE_ENVELOPE_FIELD,
      )
    ) {
      return this.openLegacySealedStudentRecord(record, subject, {
        allowLegacyExpandedPlaintext: true,
      });
    }
    return structuredClone(record);
  }

  private getOrCreateKey(): Promise<CryptoKey> {
    return this.resolveKey(true);
  }

  private getExistingKey(): Promise<CryptoKey> {
    return this.resolveKey(false);
  }

  private resolveKey(createIfMissing: boolean): Promise<CryptoKey> {
    if (!this.legacyKeyPromise) {
      const pending = this.loadKey(createIfMissing);
      this.legacyKeyPromise = pending;
      void pending.catch(() => {
        if (this.legacyKeyPromise === pending) this.legacyKeyPromise = undefined;
      });
    }
    return this.legacyKeyPromise;
  }

  private async loadKey(createIfMissing: boolean): Promise<CryptoKey> {
    const database = await this.openKeyDatabase();
    let generated: CryptoKey | undefined;
    if (createIfMissing) {
      try {
        generated = (await this.cryptoProvider.subtle.generateKey(
          {
            name: STUDENT_SENSITIVE_ALGORITHM,
            length: STUDENT_SENSITIVE_KEY_BITS,
          },
          false,
          ["encrypt", "decrypt"],
        )) as CryptoKey;
      } catch {
        throw new Error("Hassas veri anahtarı güvenle üretilemedi.");
      }
      assertCryptoKey(generated);
    }

    const transaction = database.transaction(
      STUDENT_SENSITIVE_KEY_STORE_NAME,
      createIfMissing ? "readwrite" : "readonly",
    );
    const completion = transactionResult(transaction);
    try {
      const store = transaction.objectStore(STUDENT_SENSITIVE_KEY_STORE_NAME);
      const existing = await requestResult(
        store.get(STUDENT_SENSITIVE_KEY_ID) as IDBRequest<LegacyKeyRecord | undefined>,
      );
      if (existing) {
        assertLegacyKeyRecord(existing);
        await completion;
        return existing.key;
      }
      if (!generated) {
        throw new Error(
          "Hassas veri anahtarı bulunamadı; erişim güvenlik nedeniyle durduruldu.",
        );
      }
      const record: LegacyKeyRecord = {
        id: STUDENT_SENSITIVE_KEY_ID,
        algorithm: STUDENT_SENSITIVE_ALGORITHM,
        version: STUDENT_SENSITIVE_ENVELOPE_VERSION,
        key: generated,
      };
      await requestResult(store.add(record));
      await completion;
      return generated;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // Tamamlanan işlemin özgün güvenlik hatasını koru.
      }
      await completion.catch(() => undefined);
      if (error instanceof Error && error.message.startsWith("Hassas veri")) {
        throw error;
      }
      throw new Error("Hassas veri anahtar deposu doğrulanamadı.");
    }
  }

  private getOrCreateV2Context(): Promise<LocalVaultKeyContext> {
    return this.resolveV2Context(true);
  }

  private getExistingV2Context(): Promise<LocalVaultKeyContext> {
    return this.resolveV2Context(false);
  }

  private resolveV2Context(
    createIfMissing: boolean,
  ): Promise<LocalVaultKeyContext> {
    if (!this.v2ContextPromise) {
      const pending = this.loadV2Context(createIfMissing);
      this.v2ContextPromise = pending;
      void pending.catch(() => {
        if (this.v2ContextPromise === pending) {
          this.v2ContextPromise = undefined;
        }
      });
    }
    return this.v2ContextPromise;
  }

  private randomBytes(length: number): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(new ArrayBuffer(length));
    this.cryptoProvider.getRandomValues(bytes);
    return bytes;
  }

  private async loadV2Context(
    createIfMissing: boolean,
  ): Promise<LocalVaultKeyContext> {
    const database = await this.openKeyDatabase();
    let generatedKey: CryptoKey | undefined;
    let generatedInstance: LocalVaultDatabaseInstanceRecord | undefined;
    let generatedAllocator: LocalVaultNonceAllocatorRecord | undefined;
    if (createIfMissing) {
      try {
        generatedKey = (await this.cryptoProvider.subtle.generateKey(
          { name: LOCAL_VAULT_ALGORITHM, length: LOCAL_VAULT_KEY_BITS },
          false,
          ["encrypt", "decrypt"],
        )) as CryptoKey;
      } catch {
        throw new LocalVaultSecurityError(
          "LOCAL_VAULT_KEY_GENERATION_FAILED",
          "Yerel kasa anahtarı güvenle üretilemedi.",
        );
      }
      assertLocalVaultCryptoKey(generatedKey);
      generatedInstance = {
        id: LOCAL_VAULT_DATABASE_INSTANCE_ID,
        version: LOCAL_VAULT_METADATA_VERSION,
        databaseInstanceId: vaultBytesToBase64(this.randomBytes(16)),
      };
      generatedAllocator = createLocalVaultNonceAllocatorRecord(
        LOCAL_VAULT_KEY_ID,
      );
    }

    const contextStores = [
      STUDENT_SENSITIVE_KEY_STORE_NAME,
      LOCAL_VAULT_METADATA_STORE_NAME,
      LOCAL_VAULT_NONCE_STORE_NAME,
    ];
    const transaction = createIfMissing
      ? openLocalVaultReadwriteTransaction(database, contextStores).transaction
      : database.transaction(contextStores, "readonly");
    const completion = transactionResult(transaction);
    try {
      const keyStore = transaction.objectStore(STUDENT_SENSITIVE_KEY_STORE_NAME);
      const metadataStore = transaction.objectStore(
        LOCAL_VAULT_METADATA_STORE_NAME,
      );
      const nonceStore = transaction.objectStore(LOCAL_VAULT_NONCE_STORE_NAME);
      const [existingKey, existingInstance, existingAllocator] =
        await Promise.all([
          requestResult(
            keyStore.get(LOCAL_VAULT_KEY_ID) as IDBRequest<
              LocalVaultKeyRecord | undefined
            >,
          ),
          requestResult(
            metadataStore.get(LOCAL_VAULT_DATABASE_INSTANCE_ID) as IDBRequest<
              LocalVaultDatabaseInstanceRecord | undefined
            >,
          ),
          requestResult(
            nonceStore.get(LOCAL_VAULT_KEY_ID) as IDBRequest<
              LocalVaultNonceAllocatorRecord | undefined
            >,
          ),
        ]);
      if (existingKey || existingInstance || existingAllocator) {
        if (!existingKey || !existingInstance || !existingAllocator) {
          throw new LocalVaultSecurityError(
            "LOCAL_VAULT_KEY_STATE_INCOMPLETE",
            "Yerel kasa anahtar durumu eksik; erişim güvenlik nedeniyle durduruldu.",
          );
        }
        assertLocalVaultKeyRecord(existingKey);
        assertDatabaseInstanceRecord(existingInstance);
        assertLocalVaultNonceAllocatorRecord(existingAllocator);
        if (existingAllocator.keyId !== LOCAL_VAULT_KEY_ID) {
          throw new LocalVaultSecurityError(
            "LOCAL_VAULT_KEY_STATE_INCOMPLETE",
            "Yerel kasa nonce ve anahtar bağı doğrulanamadı.",
          );
        }
        await completion;
        return {
          key: existingKey.key,
          keyId: LOCAL_VAULT_KEY_ID,
          databaseInstanceId: existingInstance.databaseInstanceId,
        };
      }
      if (!generatedKey || !generatedInstance || !generatedAllocator) {
        throw new LocalVaultRecoveryRequiredError();
      }
      const keyRecord: LocalVaultKeyRecord = {
        id: LOCAL_VAULT_KEY_ID,
        algorithm: LOCAL_VAULT_ALGORITHM,
        version: LOCAL_VAULT_ENVELOPE_VERSION,
        key: generatedKey,
      };
      await requestResult(keyStore.add(keyRecord));
      await requestResult(metadataStore.add(generatedInstance));
      await requestResult(nonceStore.add(generatedAllocator));
      await completion;
      return {
        key: generatedKey,
        keyId: LOCAL_VAULT_KEY_ID,
        databaseInstanceId: generatedInstance.databaseInstanceId,
      };
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

  private async getMigrationJournal(): Promise<LocalVaultMigrationJournal> {
    if (!this.migrationJournal) {
      this.migrationJournal = new LocalVaultMigrationJournal(
        await this.openKeyDatabase(),
      );
    }
    return this.migrationJournal;
  }

  private async deleteLegacyKeyAfterV2Ready(): Promise<void> {
    const database = await this.openKeyDatabase();
    const { transaction } = openLocalVaultReadwriteTransaction(
      database,
      STUDENT_SENSITIVE_KEY_STORE_NAME,
    );
    const completion = transactionResult(transaction);
    try {
      await requestResult(
        transaction
          .objectStore(STUDENT_SENSITIVE_KEY_STORE_NAME)
          .delete(STUDENT_SENSITIVE_KEY_ID),
      );
      await completion;
      this.legacyKeyPromise = undefined;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // Tamamlanan işlemin özgün güvenlik hatasını koru.
      }
      await completion.catch(() => undefined);
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_LEGACY_KEY_ERASURE_FAILED",
        "Eski öğrenci kasası anahtarı güvenle silinemedi.",
      );
    }
  }

  private async sha256(value: unknown): Promise<string> {
    const encoded = new TextEncoder().encode(canonicalJson(value));
    const digest = new Uint8Array(
      await this.cryptoProvider.subtle.digest("SHA-256", encoded),
    );
    return [...digest]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  private async checkpoint(name: string): Promise<void> {
    await this.onMigrationCheckpoint?.(name);
  }

  private openKeyDatabase(): Promise<IDBDatabase> {
    if (!this.keyDatabasePromise) {
      let settled = false;
      const opening = new Promise<IDBDatabase>((resolve, reject) => {
        const request = this.indexedDb.open(
          this.keyDatabaseName,
          STUDENT_SENSITIVE_KEY_DATABASE_VERSION,
        );
        request.addEventListener("upgradeneeded", (event) => {
          if (settled) {
            try {
              request.transaction?.abort();
            } catch {
              // Blocked sonrası geç başlayan upgrade'in özgün durumunu koru.
            }
            return;
          }
          if (
            !request.result.objectStoreNames.contains(
              STUDENT_SENSITIVE_KEY_STORE_NAME,
            )
          ) {
            request.result.createObjectStore(
              STUDENT_SENSITIVE_KEY_STORE_NAME,
              { keyPath: "id" },
            );
          }
          ensureLocalVaultNonceStore(request.result);
          ensureLocalVaultMigrationStores(request.result);
          ensureLocalVaultRecordGenerationStores(request.result);
          if (
            !request.result.objectStoreNames.contains(
              LOCAL_VAULT_METADATA_STORE_NAME,
            )
          ) {
            request.result.createObjectStore(LOCAL_VAULT_METADATA_STORE_NAME, {
              keyPath: "id",
            });
          }
          if (event.oldVersion > 0 && event.oldVersion < 4) {
            const upgrade = request.transaction;
            if (!upgrade) {
              throw new LocalVaultSecurityError(
                "LOCAL_VAULT_KEY_STATE_INCOMPLETE",
                "Yerel kasa anahtar şeması güvenle yükseltilemedi.",
              );
            }
            upgrade
              .objectStore(LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME)
              .clear();
            upgrade
              .objectStore(LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME)
              .clear();
            upgrade
              .objectStore(LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME)
              .clear();
            upgrade
              .objectStore(LOCAL_VAULT_NONCE_RESERVATION_STORE_NAME)
              .clear();
            const nonceStore = upgrade.objectStore(
              LOCAL_VAULT_NONCE_STORE_NAME,
            );
            nonceStore.delete(LOCAL_VAULT_KEY_ID);
            const v2Key = upgrade
              .objectStore(STUDENT_SENSITIVE_KEY_STORE_NAME)
              .get(LOCAL_VAULT_KEY_ID);
            v2Key.addEventListener("success", () => {
              if (v2Key.result !== undefined) {
                nonceStore.put(
                  createLocalVaultNonceAllocatorRecord(LOCAL_VAULT_KEY_ID),
                );
              }
            });
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
            database.addEventListener("versionchange", () => {
              database.close();
              if (this.keyDatabasePromise === opening) {
                this.keyDatabasePromise = undefined;
                this.legacyKeyPromise = undefined;
                this.v2ContextPromise = undefined;
                this.migrationJournal = undefined;
              }
            });
            resolve(database);
          },
          { once: true },
        );
        request.addEventListener(
          "blocked",
          () => {
            if (settled) return;
            settled = true;
            reject(
              new Error("Hassas veri anahtar deposu başka bir sekmede açık."),
            );
          },
          { once: true },
        );
        request.addEventListener(
          "error",
          () => {
            if (settled) return;
            settled = true;
            reject(
              request.error ??
                new Error("Hassas veri anahtar deposu açılamadı."),
            );
          },
          { once: true },
        );
      });
      this.keyDatabasePromise = opening;
      void opening.catch(() => {
        if (this.keyDatabasePromise === opening) {
          this.keyDatabasePromise = undefined;
        }
      });
    }
    return this.keyDatabasePromise;
  }
}
