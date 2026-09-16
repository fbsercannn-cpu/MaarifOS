import { canonicalJson } from "./canonical-json";
import { BACKUP_CHUNK_BYTES, MAX_BACKUP_PLAINTEXT_BYTES, assertBackupCapacity } from "./backup-capacity";
import { AES_GCM_TAG_BITS, base64ToBytes, bytesToBase64, deriveAesGcmKey, sha256Hex, utf8Bytes } from "./crypto";
import type { EncryptedBackupEnvelope, EncryptedBackupHeader } from "./encrypted-backup";

function chunkIv(base: string, index: number): Uint8Array<ArrayBuffer> {
  const iv = base64ToBytes(base, 12);
  new DataView(iv.buffer).setUint32(8, index, false);
  return iv;
}

function chunkAad(header: EncryptedBackupHeader, index: number): Uint8Array<ArrayBuffer> {
  return utf8Bytes(canonicalJson({ header, index }));
}

export function assertChunkedBackup(envelope: EncryptedBackupEnvelope): void {
  const header = envelope.encryption;
  if (header.version !== 2 || envelope.ciphertext !== "" || !Array.isArray(envelope.chunks) ||
      header.chunkBytes !== BACKUP_CHUNK_BYTES || !Number.isSafeInteger(header.plaintextBytes) ||
      (header.plaintextBytes ?? 0) <= 0 || (header.plaintextBytes ?? 0) > MAX_BACKUP_PLAINTEXT_BYTES ||
      header.chunkCount !== Math.ceil((header.plaintextBytes ?? 0) / BACKUP_CHUNK_BYTES) ||
      envelope.chunks.length !== header.chunkCount || typeof header.plaintextSha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(header.plaintextSha256)) {
    throw new Error("Parçalı yedeğin kapsamı, boyutu veya hash manifesti geçersiz.");
  }
  for (const [index, part] of envelope.chunks.entries()) {
    const size = index === envelope.chunks.length - 1
      ? (header.plaintextBytes ?? 0) - index * BACKUP_CHUNK_BYTES : BACKUP_CHUNK_BYTES;
    if (typeof part !== "string" || part.length !== 4 * Math.ceil((size + AES_GCM_TAG_BITS / 8) / 3)) {
      throw new Error("Parçalı yedekte eksik, fazla veya geçersiz parça var.");
    }
    const bytes = base64ToBytes(part);
    if (bytes.byteLength !== size + AES_GCM_TAG_BITS / 8) throw new Error("Yedek parçasının boyutu doğrulanamadı.");
    bytes.fill(0);
  }
}

export async function encryptChunkedBackup(plaintext: string, baseHeader: EncryptedBackupHeader, password: string): Promise<EncryptedBackupEnvelope> {
  const plaintextBytes = assertBackupCapacity(plaintext);
  const header: EncryptedBackupHeader = { ...baseHeader, version: 2, plaintextBytes,
    chunkBytes: BACKUP_CHUNK_BYTES, chunkCount: Math.ceil(plaintextBytes / BACKUP_CHUNK_BYTES),
    plaintextSha256: await sha256Hex(plaintext) };
  const key = await deriveAesGcmKey(password, base64ToBytes(header.salt, 16), header.iterations);
  const bytes = utf8Bytes(plaintext);
  const chunks: string[] = [];
  try {
    for (let index = 0; index < (header.chunkCount ?? 0); index += 1) {
      const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: chunkIv(header.iv, index),
        additionalData: chunkAad(header, index), tagLength: AES_GCM_TAG_BITS }, key,
        bytes.subarray(index * BACKUP_CHUNK_BYTES, (index + 1) * BACKUP_CHUNK_BYTES));
      chunks.push(bytesToBase64(new Uint8Array(encrypted)));
    }
    const result = { encryption: header, ciphertext: "", chunks };
    assertChunkedBackup(result);
    assertBackupCapacity(canonicalJson(result), true);
    return result;
  } finally { bytes.fill(0); }
}

export async function decryptChunkedBackup(envelope: EncryptedBackupEnvelope, password: string): Promise<string> {
  assertChunkedBackup(envelope);
  const header = envelope.encryption;
  const key = await deriveAesGcmKey(password, base64ToBytes(header.salt, 16), header.iterations);
  // TextDecoder's streaming mode preserves UTF-8 characters split at a chunk boundary.
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const texts: string[] = [];
  for (const [index, chunk] of (envelope.chunks ?? []).entries()) {
    const encrypted = base64ToBytes(chunk);
    let bytes: Uint8Array | undefined;
    try {
      bytes = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: chunkIv(header.iv, index),
        additionalData: chunkAad(header, index), tagLength: AES_GCM_TAG_BITS }, key, encrypted));
      texts.push(decoder.decode(bytes, { stream: true }));
    } finally { encrypted.fill(0); bytes?.fill(0); }
  }
  texts.push(decoder.decode());
  const plaintext = texts.join("");
  if (assertBackupCapacity(plaintext) !== header.plaintextBytes || await sha256Hex(plaintext) !== header.plaintextSha256) {
    throw new Error("Parçalı yedek tam içerik mutabakatını geçemedi.");
  }
  return plaintext;
}
