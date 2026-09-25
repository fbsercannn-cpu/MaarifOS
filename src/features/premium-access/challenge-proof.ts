import type { PremiumDeviceIdentity } from "./device-identity.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const DEVICE_THUMBPRINT_PATTERN = /^sha256:[A-Za-z0-9_-]{43}$/;
const MAX_CHALLENGE_TTL_MS = 15 * 60 * 1000;

export type PremiumChallengePurpose = "redeem-code" | "activate-trial";

export interface PremiumLicenseChallenge {
  challengeId: string;
  nonce: string;
  purpose: PremiumChallengePurpose;
  deviceKeyThumbprint: string;
  expiresAtUtc: string;
}

export interface PremiumChallengeProof {
  challengeId: string;
  proofSignature: string;
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} nesne olmalıdır.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} beklenmeyen veya eksik alan taşıyor.`);
  }
}

export function validatePremiumLicenseChallenge(
  value: unknown,
  input: {
    expectedDeviceKeyThumbprint: string;
    expectedPurpose: PremiumChallengePurpose;
    now?: Date;
  },
): Readonly<PremiumLicenseChallenge> {
  const challenge = object(value, "Premium lisans challenge yanıtı");
  exactKeys(
    challenge,
    ["challengeId", "deviceKeyThumbprint", "expiresAtUtc", "nonce", "purpose"],
    "Premium lisans challenge yanıtı",
  );
  const now = input.now ?? new Date();
  const expiresAtUtc = challenge.expiresAtUtc;
  const expiresAt = typeof expiresAtUtc === "string" ? new Date(expiresAtUtc) : new Date(NaN);
  if (
    typeof challenge.challengeId !== "string" ||
    !UUID_V4_PATTERN.test(challenge.challengeId) ||
    typeof challenge.nonce !== "string" ||
    !NONCE_PATTERN.test(challenge.nonce) ||
    typeof challenge.deviceKeyThumbprint !== "string" ||
    !DEVICE_THUMBPRINT_PATTERN.test(challenge.deviceKeyThumbprint) ||
    challenge.deviceKeyThumbprint !== input.expectedDeviceKeyThumbprint ||
    challenge.purpose !== input.expectedPurpose ||
    typeof expiresAtUtc !== "string" ||
    Number.isNaN(now.getTime()) ||
    Number.isNaN(expiresAt.getTime()) ||
    expiresAt.toISOString() !== expiresAtUtc ||
    expiresAt.getTime() <= now.getTime() ||
    expiresAt.getTime() - now.getTime() > MAX_CHALLENGE_TTL_MS
  ) {
    throw new Error("Premium lisans challenge yanıtı geçersiz veya süresi dolmuş.");
  }
  return Object.freeze({
    challengeId: challenge.challengeId,
    nonce: challenge.nonce,
    purpose: input.expectedPurpose,
    deviceKeyThumbprint: challenge.deviceKeyThumbprint,
    expiresAtUtc,
  });
}

export function premiumChallengeSigningPayload(
  challenge: PremiumLicenseChallenge,
  idempotencyKey: string,
): string {
  return JSON.stringify({
    challengeId: challenge.challengeId,
    deviceKeyThumbprint: challenge.deviceKeyThumbprint,
    idempotencyKey,
    nonce: challenge.nonce,
    purpose: challenge.purpose,
  });
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function createPremiumChallengeProof(input: {
  identity: PremiumDeviceIdentity;
  challenge: PremiumLicenseChallenge;
  idempotencyKey: string;
  now?: Date;
}): Promise<Readonly<PremiumChallengeProof>> {
  const { identity, challenge, idempotencyKey } = input;
  const now = input.now ?? new Date();
  const expiresAt = new Date(challenge.expiresAtUtc);
  if (
    !UUID_PATTERN.test(challenge.challengeId) ||
    !NONCE_PATTERN.test(challenge.nonce) ||
    !["redeem-code", "activate-trial"].includes(challenge.purpose) ||
    challenge.deviceKeyThumbprint !== identity.thumbprint ||
    Number.isNaN(now.getTime()) ||
    Number.isNaN(expiresAt.getTime()) ||
    expiresAt.toISOString() !== challenge.expiresAtUtc ||
    now.getTime() >= expiresAt.getTime()
  ) {
    throw new Error("Premium lisans challenge geçersiz veya süresi dolmuş.");
  }
  if (!UUID_PATTERN.test(idempotencyKey)) {
    throw new Error("Premium lisans idempotency anahtarı geçersiz.");
  }
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    identity.privateKey,
    new TextEncoder().encode(premiumChallengeSigningPayload(challenge, idempotencyKey)),
  ));
  if (signature.byteLength !== 64) {
    throw new Error("Premium cihaz ispat imzası ES256 biçiminde üretilemedi.");
  }
  return Object.freeze({
    challengeId: challenge.challengeId,
    proofSignature: base64Url(signature),
  });
}
