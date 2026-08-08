import { premiumDeviceKeyThumbprint } from "./device-identity.ts";
import {
  assertLicenseApiRequestHasNoEducationalData,
  type PremiumCodeRedeemRequest,
  type PremiumTrialActivationRequest,
} from "./entitlement.ts";

const REDEMPTION_CODE_PATTERN = /^MRF(?:-[0-9A-HJKMNP-TV-Z]{4}){6}-[0-9A-HJKMNP-TV-Z]$/;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const THUMBPRINT_PATTERN = /^sha256:[A-Za-z0-9_-]{43}$/;
const APP_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SKU_PATTERN = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;
const ACADEMIC_RELEASE_PATTERN = /^20\d{2}-20\d{2}$/;
const PROOF_SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{86}$/;

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

function text(value: unknown, label: string, pattern: RegExp): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${label} geçersiz.`);
  }
  return value;
}

async function verifiedDeviceFields(request: Record<string, unknown>): Promise<{
  devicePublicKeyJwk: JsonWebKey;
  deviceKeyThumbprint: string;
}> {
  const devicePublicKeyJwk = object(
    request.devicePublicKeyJwk,
    "Cihaz açık anahtarı",
  ) as JsonWebKey;
  const deviceKeyThumbprint = text(
    request.deviceKeyThumbprint,
    "Cihaz anahtar parmak izi",
    THUMBPRINT_PATTERN,
  );
  if (await premiumDeviceKeyThumbprint(devicePublicKeyJwk) !== deviceKeyThumbprint) {
    throw new Error("Cihaz açık anahtarı parmak iziyle uyuşmuyor.");
  }
  return {
    devicePublicKeyJwk: structuredClone(devicePublicKeyJwk),
    deviceKeyThumbprint,
  };
}

export async function validatePremiumCodeRedeemRequest(
  value: unknown,
): Promise<Readonly<PremiumCodeRedeemRequest>> {
  assertLicenseApiRequestHasNoEducationalData(value);
  const request = object(value, "Kod kullanma isteği");
  exactKeys(
    request,
    [
      "appVersion",
      "challengeId",
      "code",
      "deviceKeyThumbprint",
      "devicePublicKeyJwk",
      "idempotencyKey",
      "proofSignature",
    ],
    "Kod kullanma isteği",
  );
  const result: PremiumCodeRedeemRequest = {
    code: text(request.code, "Premium kod", REDEMPTION_CODE_PATTERN),
    challengeId: text(request.challengeId, "Challenge kimliği", UUID_V4_PATTERN),
    proofSignature: text(request.proofSignature, "Cihaz ispat imzası", PROOF_SIGNATURE_PATTERN),
    ...(await verifiedDeviceFields(request)),
    appVersion: text(request.appVersion, "Uygulama sürümü", APP_VERSION_PATTERN),
    idempotencyKey: text(request.idempotencyKey, "Idempotency anahtarı", UUID_V4_PATTERN),
  };
  return Object.freeze(result);
}

export async function validatePremiumTrialActivationRequest(
  value: unknown,
): Promise<Readonly<PremiumTrialActivationRequest>> {
  assertLicenseApiRequestHasNoEducationalData(value);
  const request = object(value, "Deneme aktivasyon isteği");
  exactKeys(
    request,
    [
      "academicRelease",
      "appVersion",
      "challengeId",
      "deviceKeyThumbprint",
      "devicePublicKeyJwk",
      "idempotencyKey",
      "proofSignature",
      "sku",
    ],
    "Deneme aktivasyon isteği",
  );
  const result: PremiumTrialActivationRequest = {
    sku: text(request.sku, "Premium SKU", SKU_PATTERN),
    academicRelease: text(
      request.academicRelease,
      "Akademik sürüm",
      ACADEMIC_RELEASE_PATTERN,
    ),
    challengeId: text(request.challengeId, "Challenge kimliği", UUID_V4_PATTERN),
    proofSignature: text(request.proofSignature, "Cihaz ispat imzası", PROOF_SIGNATURE_PATTERN),
    ...(await verifiedDeviceFields(request)),
    appVersion: text(request.appVersion, "Uygulama sürümü", APP_VERSION_PATTERN),
    idempotencyKey: text(request.idempotencyKey, "Idempotency anahtarı", UUID_V4_PATTERN),
  };
  return Object.freeze(result);
}
