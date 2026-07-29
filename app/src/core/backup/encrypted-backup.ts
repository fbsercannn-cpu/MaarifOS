import { canonicalClone, canonicalJson } from "./canonical-json";
import {
  AES_GCM_IV_BYTES,
  AES_GCM_TAG_BITS,
  base64ToBytes,
  bytesToBase64,
  deriveAesGcmKey,
  PBKDF2_SALT_BYTES,
  PBKDF2_SHA256_ITERATIONS,
  randomBytes,
  utf8Bytes,
  utf8Text,
} from "./crypto";

export const ENCRYPTED_BACKUP_FORMAT = "maarifos-encrypted-json";
export const ENCRYPTED_BACKUP_VERSION = 1;
export const ENCRYPTED_BACKUP_CONTENT_TYPE =
  "application/vnd.maarifos.backup+json";
export const ENCRYPTED_BACKUP_ALGORITHM = "AES-256-GCM";
export const ENCRYPTED_BACKUP_KDF = "PBKDF2-HMAC-SHA-256";

export interface EncryptedBackupHeader {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  version: typeof ENCRYPTED_BACKUP_VERSION;
  contentType: typeof ENCRYPTED_BACKUP_CONTENT_TYPE;
  algorithm: typeof ENCRYPTED_BACKUP_ALGORITHM;
  keyDerivation: typeof ENCRYPTED_BACKUP_KDF;
  iterations: number;
  salt: string;
  iv: string;
  tagLength: typeof AES_GCM_TAG_BITS;
  createdAt: string;
  appVersion: string;
}

export interface EncryptedBackupEnvelope {
  encryption: EncryptedBackupHeader;
  ciphertext: string;
}

const UTC_ISO_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const ENVELOPE_KEYS = ["ciphertext", "encryption"] as const;
const HEADER_KEYS = [
  "algorithm",
  "appVersion",
  "contentType",
  "createdAt",
  "format",
  "iterations",
  "iv",
  "keyDerivation",
  "salt",
  "tagLength",
  "version",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

export function assertEncryptedBackupEnvelope(
  value: unknown,
): asserts value is EncryptedBackupEnvelope {
  if (!isRecord(value) || !hasExactKeys(value, ENVELOPE_KEYS)) {
    throw new Error("Şifreli yedek zarfı geçersiz veya eksik.");
  }
  if (!isRecord(value.encryption) || !hasExactKeys(value.encryption, HEADER_KEYS)) {
    throw new Error("Şifreli yedek güvenlik başlığı geçersiz.");
  }
  const header = value.encryption;
  if (
    header.format !== ENCRYPTED_BACKUP_FORMAT ||
    header.version !== ENCRYPTED_BACKUP_VERSION ||
    header.contentType !== ENCRYPTED_BACKUP_CONTENT_TYPE
  ) {
    throw new Error("Şifreli yedek biçimi veya sürümü desteklenmiyor.");
  }
  if (
    header.algorithm !== ENCRYPTED_BACKUP_ALGORITHM ||
    header.keyDerivation !== ENCRYPTED_BACKUP_KDF ||
    header.tagLength !== AES_GCM_TAG_BITS ||
    !Number.isInteger(header.iterations) ||
    (header.iterations as number) < PBKDF2_SHA256_ITERATIONS ||
    (header.iterations as number) > 10_000_000
  ) {
    throw new Error("Şifreli yedek güvenlik parametreleri geçersiz.");
  }
  if (
    typeof header.createdAt !== "string" ||
    !UTC_ISO_PATTERN.test(header.createdAt) ||
    Number.isNaN(Date.parse(header.createdAt)) ||
    typeof header.appVersion !== "string" ||
    !header.appVersion.trim() ||
    header.appVersion.length > 120
  ) {
    throw new Error("Şifreli yedek oluşturma bilgisi geçersiz.");
  }
  base64ToBytes(String(header.salt), PBKDF2_SALT_BYTES);
  base64ToBytes(String(header.iv), AES_GCM_IV_BYTES);
  if (
    typeof value.ciphertext !== "string" ||
    value.ciphertext.length < 24 ||
    value.ciphertext.length > 32 * 1024 * 1024
  ) {
    throw new Error("Şifreli yedek içeriği eksik veya izin verilenden büyük.");
  }
  const ciphertext = base64ToBytes(value.ciphertext);
  if (ciphertext.length <= AES_GCM_TAG_BITS / 8) {
    throw new Error("Şifreli yedek içeriği güvenlik etiketi taşımıyor.");
  }
}

export function isEncryptedBackupEnvelope(
  value: unknown,
): value is EncryptedBackupEnvelope {
  try {
    assertEncryptedBackupEnvelope(value);
    return true;
  } catch {
    return false;
  }
}

export function serializeEncryptedBackup(
  envelope: EncryptedBackupEnvelope,
): string {
  assertEncryptedBackupEnvelope(envelope);
  return canonicalJson(envelope);
}

export function parseEncryptedBackupEnvelope(
  input: string | EncryptedBackupEnvelope,
): EncryptedBackupEnvelope {
  let candidate: unknown;
  try {
    candidate =
      typeof input === "string" ? JSON.parse(input) : canonicalClone(input);
  } catch {
    throw new Error("Şifreli yedek dosyası geçerli JSON değil.");
  }
  assertEncryptedBackupEnvelope(candidate);
  return canonicalClone(candidate);
}

export async function encryptBackupText(
  plaintext: string,
  options: {
    appVersion: string;
    createdAt: string;
  },
  password: string,
): Promise<EncryptedBackupEnvelope> {
  if (
    typeof plaintext !== "string" ||
    plaintext.length === 0 ||
    plaintext.length > 20 * 1024 * 1024
  ) {
    throw new Error("Şifrelenecek yedek içeriği eksik veya izin verilenden büyük.");
  }
  const salt = randomBytes(PBKDF2_SALT_BYTES);
  const iv = randomBytes(AES_GCM_IV_BYTES);
  const header: EncryptedBackupHeader = {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    contentType: ENCRYPTED_BACKUP_CONTENT_TYPE,
    algorithm: ENCRYPTED_BACKUP_ALGORITHM,
    keyDerivation: ENCRYPTED_BACKUP_KDF,
    iterations: PBKDF2_SHA256_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    tagLength: AES_GCM_TAG_BITS,
    createdAt: options.createdAt,
    appVersion: options.appVersion,
  };
  assertEncryptedBackupEnvelope({
    encryption: header,
    ciphertext: bytesToBase64(new Uint8Array(AES_GCM_TAG_BITS / 8 + 1)),
  });
  const additionalData = utf8Bytes(canonicalJson(header));
  const plaintextBytes = utf8Bytes(plaintext);
  try {
    const key = await deriveAesGcmKey(password, salt, header.iterations);
    const ciphertext = await globalThis.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData,
        tagLength: header.tagLength,
      },
      key,
      plaintextBytes,
    );
    const envelope: EncryptedBackupEnvelope = {
      encryption: header,
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    };
    assertEncryptedBackupEnvelope(envelope);
    return canonicalClone(envelope);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Parola en az")) {
      throw error;
    }
    throw new Error("Yedek güvenli biçimde şifrelenemedi.");
  } finally {
    salt.fill(0);
    iv.fill(0);
    additionalData.fill(0);
    plaintextBytes.fill(0);
  }
}

export async function decryptBackupText(
  input: string | EncryptedBackupEnvelope,
  password: string,
): Promise<string> {
  const envelope = parseEncryptedBackupEnvelope(input);
  const salt = base64ToBytes(
    envelope.encryption.salt,
    PBKDF2_SALT_BYTES,
  );
  const iv = base64ToBytes(envelope.encryption.iv, AES_GCM_IV_BYTES);
  const ciphertext = base64ToBytes(envelope.ciphertext);
  const additionalData = utf8Bytes(canonicalJson(envelope.encryption));
  try {
    const key = await deriveAesGcmKey(
      password,
      salt,
      envelope.encryption.iterations,
    );
    const plaintext = await globalThis.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData,
        tagLength: envelope.encryption.tagLength,
      },
      key,
      ciphertext,
    );
    return utf8Text(plaintext);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Parola en az")) {
      throw error;
    }
    throw new Error(
      "Şifreli yedek açılamadı; parola yanlış veya dosya değiştirilmiş olabilir.",
    );
  } finally {
    salt.fill(0);
    iv.fill(0);
    ciphertext.fill(0);
    additionalData.fill(0);
  }
}
