import type { PremiumDeviceIdentity } from "./device-identity.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

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
