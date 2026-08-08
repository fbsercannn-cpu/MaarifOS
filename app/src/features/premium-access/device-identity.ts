import type {
  PremiumDeviceIdentityStore,
  StoredPremiumDeviceIdentity,
} from "./license-store.ts";

const BASE64URL_32_BYTES = /^[A-Za-z0-9_-]{43}$/;

export interface PremiumDeviceIdentity {
  readonly publicKey: CryptoKey;
  readonly privateKey: CryptoKey;
  readonly publicJwk: JsonWebKey;
  readonly thumbprint: string;
  readonly createdAtUtc: string;
}

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

export async function getOrCreatePremiumDeviceIdentity(
  store: PremiumDeviceIdentityStore,
  now = new Date(),
): Promise<PremiumDeviceIdentity> {
  if (Number.isNaN(now.getTime())) throw new Error("Cihaz anahtari olusturma zamani gecersiz.");
  const existing = await store.load();
  if (existing) return assertStoredIdentity(existing);
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const created = await store.createIfAbsent({
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicJwk,
    thumbprint: await premiumDeviceKeyThumbprint(publicJwk),
    createdAtUtc: now.toISOString(),
  });
  return assertStoredIdentity(created);
}
