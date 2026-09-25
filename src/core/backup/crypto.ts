export const PBKDF2_SHA256_ITERATIONS = 600_000;
export const PBKDF2_SALT_BYTES = 16;
export const AES_GCM_IV_BYTES = 12;
export const AES_GCM_TAG_BITS = 128;

function requireWebCrypto(): Crypto {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error("Güvenli WebCrypto özellikleri bu ortamda kullanılamıyor.");
  }
  return globalThis.crypto;
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  if (!Number.isInteger(length) || length < 1 || length > 65_536) {
    throw new Error("Güvenli rastgele veri uzunluğu geçersiz.");
  }
  return requireWebCrypto().getRandomValues(new Uint8Array(length));
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export function base64ToBytes(
  value: string,
  expectedLength?: number,
  maximumCharacters = 16_777_216,
): Uint8Array<ArrayBuffer> {
  if (
    !Number.isSafeInteger(maximumCharacters) || maximumCharacters < 4 || maximumCharacters > 32 * 1024 * 1024 ||
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumCharacters ||
    (expectedLength !== undefined && value.length !== 4 * Math.ceil(expectedLength / 3)) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value) ||
    value.length % 4 !== 0
  ) {
    throw new Error("Şifreli veride geçersiz Base64 alanı bulundu.");
  }
  let decoded: string;
  try {
    decoded = atob(value);
  } catch {
    throw new Error("Şifreli veride geçersiz Base64 alanı bulundu.");
  }
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  if (expectedLength !== undefined && bytes.length !== expectedLength) {
    throw new Error("Şifreli verinin güvenlik parametresi beklenen uzunlukta değil.");
  }
  return bytes;
}

export function utf8Bytes(value: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(value);
}

export function utf8Text(value: ArrayBuffer | Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    throw new Error("Şifresi çözülen yedek geçerli UTF-8 metni değil.");
  }
}

function validateIterations(iterations: number): void {
  if (
    !Number.isInteger(iterations) ||
    iterations < PBKDF2_SHA256_ITERATIONS ||
    iterations > 10_000_000
  ) {
    throw new Error("PBKDF2 yineleme sayısı güvenlik sınırlarının dışında.");
  }
}

function passwordBytes(
  password: string,
  minimumLength: number,
): Uint8Array<ArrayBuffer> {
  if (
    typeof password !== "string" ||
    password.length < minimumLength ||
    password.length > 1_024 ||
    password.trim().length === 0
  ) {
    throw new Error(
      `Parola en az ${minimumLength} karakter olmalı ve 1.024 karakteri aşmamalıdır.`,
    );
  }
  return utf8Bytes(password.normalize("NFC"));
}

async function importPasswordKey(
  password: string,
  minimumLength: number,
): Promise<CryptoKey> {
  const bytes = passwordBytes(password, minimumLength);
  try {
    return await requireWebCrypto().subtle.importKey(
      "raw",
      bytes,
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"],
    );
  } finally {
    bytes.fill(0);
  }
}

export async function deriveAesGcmKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations = PBKDF2_SHA256_ITERATIONS,
): Promise<CryptoKey> {
  validateIterations(iterations);
  if (salt.length !== PBKDF2_SALT_BYTES) {
    throw new Error("PBKDF2 salt değeri beklenen uzunlukta değil.");
  }
  const baseKey = await importPasswordKey(password, 10);
  return requireWebCrypto().subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function deriveVerifierBytes(
  secret: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations = PBKDF2_SHA256_ITERATIONS,
): Promise<Uint8Array<ArrayBuffer>> {
  validateIterations(iterations);
  if (salt.length !== PBKDF2_SALT_BYTES) {
    throw new Error("PBKDF2 salt değeri beklenen uzunlukta değil.");
  }
  const baseKey = await importPasswordKey(secret, 6);
  const bits = await requireWebCrypto().subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
}

export function constantTimeEqual(
  left: Uint8Array,
  right: Uint8Array,
): boolean {
  let difference = left.length ^ right.length;
  const maximumLength = Math.max(left.length, right.length);
  for (let index = 0; index < maximumLength; index += 1) {
    difference |=
      (index < left.length ? left[index] : 0) ^
      (index < right.length ? right[index] : 0);
  }
  return difference === 0;
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = utf8Bytes(value);
  try {
    const digest = await requireWebCrypto().subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  } finally {
    bytes.fill(0);
  }
}
