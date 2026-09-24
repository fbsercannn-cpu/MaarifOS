import type {
  PremiumDeviceIdentityStore,
  StoredPremiumDeviceIdentity,
} from "./license-store.ts";
import { PremiumLicenseStorageError } from "./license-store.ts";

const BASE64URL_32_BYTES = /^[A-Za-z0-9_-]{43}$/;

export interface PremiumDeviceIdentity {
  readonly publicKey: CryptoKey;
  readonly privateKey: CryptoKey;
  readonly publicJwk: JsonWebKey;
  readonly thumbprint: string;
  readonly createdAtUtc: string;
}

export type PremiumDeviceIdentityFailure =
  | "stored-key-invalid"
  | "generation-failed"
  | "persistence-roundtrip-failed"
  | "self-test-failed";

export class PremiumDeviceIdentityError extends Error {
  readonly name = "PremiumDeviceIdentityError";
  readonly reason: PremiumDeviceIdentityFailure;

  constructor(
    reason: PremiumDeviceIdentityFailure,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.reason = reason;
  }
}

const identityOperations = new WeakMap<
  PremiumDeviceIdentityStore,
  Promise<PremiumDeviceIdentity>
>();

function exactPublicJwk(value: JsonWebKey): asserts value is JsonWebKey & {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
} {
  const keys = Object.keys(value).sort();
  const allowed = ["crv", "ext", "key_ops", "kty", "x", "y"];
  if (keys.some((key) => !allowed.includes(key)) || "d" in value) {
    throw new Error("Cihaz acik anahtari beklenmeyen veya ozel alan tasiyor.");
  }
  if (
    value.kty !== "EC" ||
    value.crv !== "P-256" ||
    typeof value.x !== "string" ||
    !BASE64URL_32_BYTES.test(value.x) ||
    typeof value.y !== "string" ||
    !BASE64URL_32_BYTES.test(value.y) ||
    value.ext !== true ||
    !Array.isArray(value.key_ops) ||
    value.key_ops.length !== 1 ||
    value.key_ops[0] !== "verify"
  ) {
    throw new Error("Cihaz acik anahtari P-256 dogrulama sozlesmesine uymuyor.");
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function premiumDeviceKeyThumbprint(publicJwk: JsonWebKey): Promise<string> {
  exactPublicJwk(publicJwk);
  const canonical = JSON.stringify({
    crv: publicJwk.crv,
    kty: publicJwk.kty,
    x: publicJwk.x,
    y: publicJwk.y,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return `sha256:${base64Url(new Uint8Array(digest))}`;
}

async function assertStoredIdentity(
  identity: StoredPremiumDeviceIdentity,
): Promise<PremiumDeviceIdentity> {
  exactPublicJwk(identity.publicJwk);
  if (
    identity.publicKey.type !== "public" ||
    identity.publicKey.algorithm.name !== "ECDSA" ||
    !identity.publicKey.usages.includes("verify") ||
    identity.privateKey.type !== "private" ||
    identity.privateKey.algorithm.name !== "ECDSA" ||
    identity.privateKey.extractable ||
    !identity.privateKey.usages.includes("sign")
  ) {
    throw new Error("Saklanan premium cihaz anahtari gecersiz.");
  }
  const thumbprint = await premiumDeviceKeyThumbprint(identity.publicJwk);
  if (thumbprint !== identity.thumbprint) {
    throw new Error("Premium cihaz anahtari parmak iziyle uyusmuyor.");
  }
  const exportedPublicJwk = await crypto.subtle.exportKey("jwk", identity.publicKey);
  if (await premiumDeviceKeyThumbprint(exportedPublicJwk) !== thumbprint) {
    throw new Error("Premium cihaz acik anahtari kayitla uyusmuyor.");
  }
  return Object.freeze({
    publicKey: identity.publicKey,
    privateKey: identity.privateKey,
    publicJwk: Object.freeze(structuredClone(identity.publicJwk)),
    thumbprint,
    createdAtUtc: identity.createdAtUtc,
  });
}

async function assertDeviceKeySelfTest(
  identity: PremiumDeviceIdentity,
): Promise<PremiumDeviceIdentity> {
  try {
    const message = crypto.getRandomValues(new Uint8Array(32));
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      identity.privateKey,
      message,
    );
    const verified = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      identity.publicKey,
      signature,
      message,
    );
    if (!verified) {
      throw new Error("Cihaz anahtarı imza öz sınamasını geçemedi.");
    }
    return identity;
  } catch (error) {
    throw new PremiumDeviceIdentityError(
      "self-test-failed",
      "Premium cihaz anahtarı bu tarayıcıda imza doğrulamasını tamamlayamadı.",
      { cause: error },
    );
  }
}

async function validateStoredIdentity(
  identity: StoredPremiumDeviceIdentity,
): Promise<PremiumDeviceIdentity> {
  try {
    return await assertDeviceKeySelfTest(await assertStoredIdentity(identity));
  } catch (error) {
    if (error instanceof PremiumDeviceIdentityError) throw error;
    throw new PremiumDeviceIdentityError(
      "stored-key-invalid",
      "Bu telefondaki premium cihaz anahtarı geçersiz veya kullanılamıyor.",
      { cause: error },
    );
  }
}

async function createOrLoadPremiumDeviceIdentity(
  store: PremiumDeviceIdentityStore,
  now: Date,
): Promise<PremiumDeviceIdentity> {
  const existing = await store.load();
  if (existing) return validateStoredIdentity(existing);

  let keyPair: CryptoKeyPair;
  let publicJwk: JsonWebKey;
  try {
    keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign", "verify"],
    );
    publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  } catch (error) {
    throw new PremiumDeviceIdentityError(
      "generation-failed",
      "Bu tarayıcı güvenli premium cihaz anahtarı oluşturamadı.",
      { cause: error },
    );
  }

  try {
    await store.createIfAbsent({
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicJwk,
      thumbprint: await premiumDeviceKeyThumbprint(publicJwk),
      createdAtUtc: now.toISOString(),
    });
    await store.reopen?.();
    const persisted = await store.load();
    if (!persisted) {
      throw new Error("Kalıcı premium cihaz anahtarı yeniden okunamadı.");
    }
    return await validateStoredIdentity(persisted);
  } catch (error) {
    if (
      error instanceof PremiumLicenseStorageError &&
      error.domExceptionName !== "DataCloneError"
    ) {
      throw error;
    }
    if (error instanceof PremiumDeviceIdentityError) throw error;
    throw new PremiumDeviceIdentityError(
      "persistence-roundtrip-failed",
      "Premium cihaz anahtarı bu tarayıcıda güvenle saklanıp yeniden açılamadı.",
      { cause: error },
    );
  }
}

export async function getOrCreatePremiumDeviceIdentity(
  store: PremiumDeviceIdentityStore,
  now = new Date(),
): Promise<PremiumDeviceIdentity> {
  if (Number.isNaN(now.getTime())) throw new Error("Cihaz anahtari olusturma zamani gecersiz.");
  const current = identityOperations.get(store);
  if (current) return current;
  const operation = createOrLoadPremiumDeviceIdentity(store, now);
  identityOperations.set(store, operation);
  try {
    return await operation;
  } finally {
    if (identityOperations.get(store) === operation) {
      identityOperations.delete(store);
    }
  }
}
