const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const BASE64URL_32_BYTES_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

const textEncoder = new TextEncoder();

export function utf8(value) {
  return textEncoder.encode(value);
}

export function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export function base64UrlDecode(value, expectedBytes = null) {
  if (
    typeof value !== "string" ||
    !BASE64URL_PATTERN.test(value) ||
    value.length % 4 === 1
  ) {
    throw new Error("invalid_base64url");
  }
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  let binary;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("invalid_base64url");
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (base64UrlEncode(bytes) !== value) throw new Error("invalid_base64url");
  if (expectedBytes !== null && bytes.byteLength !== expectedBytes) {
    throw new Error("invalid_base64url_length");
  }
  return bytes;
}

export async function sha256Hex(value) {
  const bytes = typeof value === "string" ? utf8(value) : value;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Base64Url(value) {
  const bytes = typeof value === "string" ? utf8(value) : value;
  return base64UrlEncode(await crypto.subtle.digest("SHA-256", bytes));
}

function exactKeys(value, allowed, required, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_invalid`);
  }
  const keys = Object.keys(value);
  if (
    keys.some((key) => !allowed.includes(key)) ||
    required.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error(`${label}_fields_invalid`);
  }
}

export function canonicalPublicJwk(value) {
  exactKeys(
    value,
    ["crv", "ext", "key_ops", "kty", "x", "y"],
    ["crv", "ext", "key_ops", "kty", "x", "y"],
    "public_jwk",
  );
  if (
    value.kty !== "EC" ||
    value.crv !== "P-256" ||
    value.ext !== true ||
    !Array.isArray(value.key_ops) ||
    value.key_ops.length !== 1 ||
    value.key_ops[0] !== "verify" ||
    typeof value.x !== "string" ||
    !BASE64URL_32_BYTES_PATTERN.test(value.x) ||
    typeof value.y !== "string" ||
    !BASE64URL_32_BYTES_PATTERN.test(value.y)
  ) {
    throw new Error("public_jwk_invalid");
  }
  base64UrlDecode(value.x, 32);
  base64UrlDecode(value.y, 32);
  return Object.freeze({
    crv: "P-256",
    ext: true,
    key_ops: Object.freeze(["verify"]),
    kty: "EC",
    x: value.x,
    y: value.y,
  });
}

export async function publicJwkThumbprint(publicJwk) {
  const key = canonicalPublicJwk(publicJwk);
  const canonical = JSON.stringify({
    crv: key.crv,
    kty: key.kty,
    x: key.x,
    y: key.y,
  });
  return `sha256:${await sha256Base64Url(canonical)}`;
}

async function importHmacKey(encodedKey, usages) {
  const keyBytes = base64UrlDecode(encodedKey, 32);
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

export async function hmacBase64Url(encodedKey, value) {
  const key = await importHmacKey(encodedKey, ["sign"]);
  return base64UrlEncode(
    await crypto.subtle.sign("HMAC", key, utf8(value)),
  );
}

export async function verifyHmacBase64Url(encodedKey, expectedDigest, value) {
  const expected = base64UrlDecode(expectedDigest, 32);
  const key = await importHmacKey(encodedKey, ["verify"]);
  return crypto.subtle.verify("HMAC", key, expected, utf8(value));
}

export function challengeSigningPayload(challenge, idempotencyKey) {
  return JSON.stringify({
    challengeId: challenge.challengeId,
    deviceKeyThumbprint: challenge.deviceKeyThumbprint,
    idempotencyKey,
    nonce: challenge.nonce,
    purpose: challenge.purpose,
  });
}

export async function verifyDeviceProof({
  challenge,
  idempotencyKey,
  proofSignature,
  devicePublicKeyJwk,
}) {
  const key = canonicalPublicJwk(devicePublicKeyJwk);
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    key,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    base64UrlDecode(proofSignature, 64),
    utf8(challengeSigningPayload(challenge, idempotencyKey)),
  );
}

function canonicalPrivateJwk(value) {
  exactKeys(
    value,
    ["crv", "d", "ext", "key_ops", "kty", "x", "y"],
    ["crv", "d", "ext", "key_ops", "kty", "x", "y"],
    "private_jwk",
  );
  if (
    value.kty !== "EC" ||
    value.crv !== "P-256" ||
    value.ext !== true ||
    !Array.isArray(value.key_ops) ||
    value.key_ops.length !== 1 ||
    value.key_ops[0] !== "sign" ||
    !BASE64URL_32_BYTES_PATTERN.test(value.d) ||
    !BASE64URL_32_BYTES_PATTERN.test(value.x) ||
    !BASE64URL_32_BYTES_PATTERN.test(value.y)
  ) {
    throw new Error("private_jwk_invalid");
  }
  base64UrlDecode(value.d, 32);
  base64UrlDecode(value.x, 32);
  base64UrlDecode(value.y, 32);
  return value;
}

export async function signEs256Jwt({ header, claims, privateJwkJson }) {
  let parsed;
  try {
    parsed = JSON.parse(privateJwkJson);
  } catch {
    throw new Error("private_jwk_invalid");
  }
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    canonicalPrivateJwk(parsed),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const encodedHeader = base64UrlEncode(utf8(JSON.stringify(header)));
  const encodedClaims = base64UrlEncode(utf8(JSON.stringify(claims)));
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      utf8(signingInput),
    ),
  );
  if (signature.byteLength !== 64) throw new Error("es256_signature_invalid");
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export function randomNonce(randomBytes = crypto.getRandomValues.bind(crypto)) {
  const nonce = new Uint8Array(32);
  randomBytes(nonce);
  return base64UrlEncode(nonce);
}
