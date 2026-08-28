import { canonicalJson } from "../backup/canonical-json.ts";
import type { StoredRecord } from "../domain/model.ts";

export const LOCAL_VAULT_NAMESPACE = "maarifos/local-vault" as const;
export const LOCAL_VAULT_ENVELOPE_FIELD = "__maarifosLocalVault" as const;
export const LOCAL_VAULT_ENVELOPE_VERSION = 2 as const;
export const LOCAL_VAULT_ALGORITHM = "AES-GCM" as const;
export const LOCAL_VAULT_KEY_BITS = 256 as const;
export const LOCAL_VAULT_IV_BYTES = 12 as const;
export const LOCAL_VAULT_TAG_BITS = 128 as const;
export const LOCAL_VAULT_SCHEMA_EPOCH = 7 as const;
export const LOCAL_VAULT_KEY_ID = "local-vault-aes-gcm-v2" as const;

const LOCAL_VAULT_OUTER_KEYS = ["id", LOCAL_VAULT_ENVELOPE_FIELD].sort();
const LOCAL_VAULT_LEGACY_ENVELOPE_KEYS = [
  "algorithm",
  "ciphertext",
  "iv",
  "keyId",
  "recordSchemaVersion",
  "schemaEpoch",
  "version",
].sort();
const LOCAL_VAULT_ENVELOPE_KEYS = [
  ...LOCAL_VAULT_LEGACY_ENVELOPE_KEYS,
  "recordGeneration",
].sort();

export interface LocalVaultCipherEnvelope {
  version: typeof LOCAL_VAULT_ENVELOPE_VERSION;
  algorithm: typeof LOCAL_VAULT_ALGORITHM;
  keyId: string;
  schemaEpoch: typeof LOCAL_VAULT_SCHEMA_EPOCH;
  recordSchemaVersion: number;
  /** Generation-less v2 envelopes are accepted only for one-time ledger bootstrap. */
  recordGeneration?: number;
  iv: string;
  ciphertext: string;
}

/**
 * Kalıcı kaydın açık metin yüzeyi bilinçli olarak yalnız IndexedDB keyPath'i
 * için gereken opak `id` ile bu sürümlü zarfın doğrulama metadata'sıdır.
 * Ad, doğum tarihi, fotoğraf, iletişim, not ve diğer domain alanlarının tamamı
 * `ciphertext` içindedir.
 */
export type LocalVaultSealedRecord = {
  id: string;
  [LOCAL_VAULT_ENVELOPE_FIELD]: LocalVaultCipherEnvelope;
};

export interface LocalVaultRecordContext {
  databaseInstanceId: string;
  collection: string;
  recordId: string;
  recordSchemaVersion: number;
  recordGeneration?: number;
  keyId: string;
}

export class LocalVaultSecurityError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "LocalVaultSecurityError";
    this.code = code;
  }
}

export class LocalVaultRecoveryRequiredError extends LocalVaultSecurityError {
  constructor(message = "Yerel kasa anahtarı bulunamadı; yalnız şifreli yedekten kurtarma yapılabilir.") {
    super("LOCAL_VAULT_RECOVERY_REQUIRED", message);
    this.name = "LocalVaultRecoveryRequiredError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)),
    );
  }
  return btoa(binary);
}

export function base64ToBytes(
  value: string,
  expectedLength?: number,
): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_ENVELOPE",
      "Yerel kasa şifreli zarfı doğrulanamadı.",
    );
  }
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_ENVELOPE",
      "Yerel kasa şifreli zarfı doğrulanamadı.",
    );
  }
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (
    (expectedLength !== undefined && bytes.length !== expectedLength) ||
    bytesToBase64(bytes) !== value
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_ENVELOPE",
      "Yerel kasa şifreli zarfı doğrulanamadı.",
    );
  }
  return bytes;
}

function utf8Bytes(value: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(value);
  const bytes = new Uint8Array(new ArrayBuffer(encoded.byteLength));
  bytes.set(encoded);
  return bytes;
}

function uint32Bytes(value: number): Uint8Array<ArrayBuffer> {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_CONTEXT",
      "Yerel kasa ek doğrulama bağlamı oluşturulamadı.",
    );
  }
  const bytes = new Uint8Array(new ArrayBuffer(4));
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function appendLengthFramed(
  target: number[],
  name: string,
  value: string,
): void {
  const nameBytes = utf8Bytes(name);
  const valueBytes = utf8Bytes(value);
  target.push(
    ...uint32Bytes(nameBytes.byteLength),
    ...nameBytes,
    ...uint32Bytes(valueBytes.byteLength),
    ...valueBytes,
  );
}

function validateContext(context: LocalVaultRecordContext): void {
  if (
    !context.databaseInstanceId.trim() ||
    !context.collection.trim() ||
    !context.recordId.trim() ||
    !context.keyId.trim() ||
    !Number.isSafeInteger(context.recordSchemaVersion) ||
    context.recordSchemaVersion < 1 ||
    (context.recordGeneration !== undefined &&
      (!Number.isSafeInteger(context.recordGeneration) ||
        context.recordGeneration < 1))
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_CONTEXT",
      "Yerel kasa ek doğrulama bağlamı doğrulanamadı.",
    );
  }
}

/**
 * AAD alanları sabit sırada, UTF-8 byte uzunluklarıyla çerçevelenir. Böylece
 * ayraç karakterleri veya farklı Unicode uzunlukları aynı byte dizisine
 * dönüşemez.
 */
export function buildLocalVaultAdditionalData(
  context: LocalVaultRecordContext,
): Uint8Array<ArrayBuffer> {
  validateContext(context);
  const fields: Array<readonly [string, string]> = [
    ["namespace", LOCAL_VAULT_NAMESPACE],
    ["databaseInstanceId", context.databaseInstanceId],
    ["schemaEpoch", String(LOCAL_VAULT_SCHEMA_EPOCH)],
    ["collection", context.collection],
    ["recordId", context.recordId],
    ["recordSchemaVersion", String(context.recordSchemaVersion)],
  ];
  if (context.recordGeneration !== undefined) {
    fields.push(["recordGeneration", String(context.recordGeneration)]);
  }
  fields.push(
    ["envelopeVersion", String(LOCAL_VAULT_ENVELOPE_VERSION)],
    ["keyId", context.keyId],
  );
  const encoded: number[] = [...uint32Bytes(fields.length)];
  for (const [name, value] of fields) {
    appendLengthFramed(encoded, name, value);
  }
  return Uint8Array.from(encoded);
}

export function assertLocalVaultCryptoKey(
  value: unknown,
): asserts value is CryptoKey {
  const algorithm =
    value instanceof CryptoKey
      ? (value.algorithm as Partial<AesKeyAlgorithm>)
      : undefined;
  if (
    !(value instanceof CryptoKey) ||
    value.type !== "secret" ||
    value.extractable ||
    algorithm?.name !== LOCAL_VAULT_ALGORITHM ||
    algorithm.length !== LOCAL_VAULT_KEY_BITS ||
    !value.usages.includes("encrypt") ||
    !value.usages.includes("decrypt")
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_KEY",
      "Yerel kasa anahtarı doğrulanamadı.",
    );
  }
}

export function hasLocalVaultEnvelope(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.prototype.hasOwnProperty.call(value, LOCAL_VAULT_ENVELOPE_FIELD)
  );
}

export function assertLocalVaultSealedRecord(
  value: unknown,
): asserts value is LocalVaultSealedRecord {
  if (
    !isRecord(value) ||
    !exactKeys(value, LOCAL_VAULT_OUTER_KEYS) ||
    typeof value.id !== "string" ||
    !value.id
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_ENVELOPE",
      "Yerel kasa şifreli kaydı doğrulanamadı.",
    );
  }
  const envelope = value[LOCAL_VAULT_ENVELOPE_FIELD];
  if (
    !isRecord(envelope) ||
    (!exactKeys(envelope, LOCAL_VAULT_ENVELOPE_KEYS) &&
      !exactKeys(envelope, LOCAL_VAULT_LEGACY_ENVELOPE_KEYS)) ||
    envelope.version !== LOCAL_VAULT_ENVELOPE_VERSION ||
    envelope.algorithm !== LOCAL_VAULT_ALGORITHM ||
    typeof envelope.keyId !== "string" ||
    !envelope.keyId ||
    envelope.schemaEpoch !== LOCAL_VAULT_SCHEMA_EPOCH ||
    !Number.isSafeInteger(envelope.recordSchemaVersion) ||
    (envelope.recordSchemaVersion as number) < 1 ||
    (envelope.recordGeneration !== undefined &&
      (!Number.isSafeInteger(envelope.recordGeneration) ||
        (envelope.recordGeneration as number) < 1)) ||
    typeof envelope.iv !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_ENVELOPE",
      "Yerel kasa şifreli zarfı doğrulanamadı.",
    );
  }
  base64ToBytes(envelope.iv, LOCAL_VAULT_IV_BYTES);
  if (base64ToBytes(envelope.ciphertext).byteLength <= LOCAL_VAULT_TAG_BITS / 8) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_ENVELOPE",
      "Yerel kasa şifreli zarfı doğrulanamadı.",
    );
  }
}

export async function sealLocalVaultRecord(
  record: StoredRecord,
  options: {
    crypto: Crypto;
    key: CryptoKey;
    nonce: Uint8Array<ArrayBuffer>;
    context: LocalVaultRecordContext;
  },
): Promise<LocalVaultSealedRecord> {
  assertLocalVaultCryptoKey(options.key);
  validateContext(options.context);
  if (
    record.id !== options.context.recordId ||
    record.schemaVersion !== options.context.recordSchemaVersion ||
    options.context.recordGeneration === undefined
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_SUBJECT_MISMATCH",
      "Yerel kasa kayıt kimliği veya şema sürümü bağlamla uyuşmuyor.",
    );
  }
  if (options.nonce.byteLength !== LOCAL_VAULT_IV_BYTES) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_NONCE",
      "Yerel kasa nonce değeri doğrulanamadı.",
    );
  }
  let plaintext: Uint8Array<ArrayBuffer>;
  try {
    plaintext = utf8Bytes(canonicalJson(record));
  } catch {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_RECORD",
      "Yerel kasa kaydı kanonik JSON biçimine dönüştürülemedi.",
    );
  }
  let ciphertext: ArrayBuffer;
  try {
    ciphertext = await options.crypto.subtle.encrypt(
      {
        name: LOCAL_VAULT_ALGORITHM,
        iv: options.nonce,
        additionalData: buildLocalVaultAdditionalData(options.context),
        tagLength: LOCAL_VAULT_TAG_BITS,
      },
      options.key,
      plaintext,
    );
  } catch {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_ENCRYPTION_FAILED",
      "Yerel kasa kaydı güvenle şifrelenemedi.",
    );
  }
  return {
    id: record.id,
    [LOCAL_VAULT_ENVELOPE_FIELD]: {
      version: LOCAL_VAULT_ENVELOPE_VERSION,
      algorithm: LOCAL_VAULT_ALGORITHM,
      keyId: options.context.keyId,
      schemaEpoch: LOCAL_VAULT_SCHEMA_EPOCH,
      recordSchemaVersion: record.schemaVersion,
      recordGeneration: options.context.recordGeneration,
      iv: bytesToBase64(options.nonce),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    },
  };
}

export async function openLocalVaultRecord(
  value: unknown,
  options: {
    crypto: Crypto;
    key: CryptoKey;
    databaseInstanceId: string;
    collection: string;
    expectedRecordId: string;
    expectedKeyId: string;
  },
): Promise<StoredRecord> {
  assertLocalVaultSealedRecord(value);
  assertLocalVaultCryptoKey(options.key);
  const envelope = value[LOCAL_VAULT_ENVELOPE_FIELD];
  if (
    value.id !== options.expectedRecordId ||
    envelope.keyId !== options.expectedKeyId
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_SUBJECT_MISMATCH",
      "Yerel kasa kayıt kimliği veya anahtar kimliği bağlamla uyuşmuyor.",
    );
  }
  let plaintext: ArrayBuffer;
  try {
    plaintext = await options.crypto.subtle.decrypt(
      {
        name: LOCAL_VAULT_ALGORITHM,
        iv: base64ToBytes(envelope.iv, LOCAL_VAULT_IV_BYTES),
        additionalData: buildLocalVaultAdditionalData({
          databaseInstanceId: options.databaseInstanceId,
          collection: options.collection,
          recordId: options.expectedRecordId,
          recordSchemaVersion: envelope.recordSchemaVersion,
          recordGeneration: envelope.recordGeneration,
          keyId: options.expectedKeyId,
        }),
        tagLength: LOCAL_VAULT_TAG_BITS,
      },
      options.key,
      base64ToBytes(envelope.ciphertext),
    );
  } catch {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_AUTHENTICATION_FAILED",
      "Yerel kasa kaydı doğrulanamadı; erişim güvenlik nedeniyle durduruldu.",
    );
  }
  let record: unknown;
  try {
    record = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(plaintext),
    );
  } catch {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_RECORD",
      "Yerel kasa kayıt içeriği doğrulanamadı.",
    );
  }
  if (
    !isRecord(record) ||
    typeof record.id !== "string" ||
    record.id !== value.id ||
    !Number.isSafeInteger(record.schemaVersion) ||
    record.schemaVersion !== envelope.recordSchemaVersion
  ) {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_SUBJECT_MISMATCH",
      "Yerel kasa iç ve dış kayıt kimliği doğrulanamadı.",
    );
  }
  try {
    return JSON.parse(canonicalJson(record)) as StoredRecord;
  } catch {
    throw new LocalVaultSecurityError(
      "LOCAL_VAULT_INVALID_RECORD",
      "Yerel kasa kayıt içeriği kanonik biçimde doğrulanamadı.",
    );
  }
}
