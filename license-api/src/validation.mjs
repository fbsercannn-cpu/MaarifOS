import { base64UrlDecode, canonicalPublicJwk } from "./crypto.mjs";
import { API_LIMITS } from "./release.mjs";

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const THUMBPRINT_PATTERN = /^sha256:[A-Za-z0-9_-]{43}$/u;
const APP_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const PROOF_SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{86}$/u;
const FOUNDER_PIN_PATTERN = /^\d{6}$/u;
const FORBIDDEN_EDUCATIONAL_KEY =
  /student|child|classroom|class|observation|photo|plan|öğrenci|çocuk|sınıf|gözlem|fotoğraf/iu;

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_not_object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label}_fields_invalid`);
  }
}

function matchingText(value, pattern, label, maxLength = 300) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    !pattern.test(value)
  ) {
    throw new Error(`${label}_invalid`);
  }
  return value;
}

export function assertNoEducationalFields(value) {
  const inspect = (candidate) => {
    if (Array.isArray(candidate)) {
      for (const item of candidate) inspect(item);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    for (const [key, nested] of Object.entries(candidate)) {
      if (FORBIDDEN_EDUCATIONAL_KEY.test(key)) {
        throw new Error("educational_data_forbidden");
      }
      inspect(nested);
    }
  };
  inspect(value);
}

export async function readExactJson(request) {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.split(";", 1)[0].trim().toLocaleLowerCase("en-US") !== "application/json") {
    throw new Error("content_type_invalid");
  }
  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > API_LIMITS.maxRequestBytes
    ) {
      throw new Error("request_body_too_large");
    }
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > API_LIMITS.maxRequestBytes) {
    throw new Error("request_body_size_invalid");
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("request_body_utf8_invalid");
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("request_body_json_invalid");
  }
  assertNoEducationalFields(value);
  return object(value, "request");
}

export function validateChallengeRequest(value) {
  const request = object(value, "challenge_request");
  exactKeys(
    request,
    ["deviceKeyThumbprint", "purpose"],
    "challenge_request",
  );
  const deviceKeyThumbprint = matchingText(
    request.deviceKeyThumbprint,
    THUMBPRINT_PATTERN,
    "device_thumbprint",
    100,
  );
  base64UrlDecode(deviceKeyThumbprint.slice("sha256:".length), 32);
  if (request.purpose !== "redeem-code") {
    throw new Error("challenge_purpose_invalid");
  }
  return Object.freeze({
    deviceKeyThumbprint,
    purpose: "redeem-code",
  });
}

export function validateFounderRedeemRequest(value, idempotencyHeader) {
  const request = object(value, "founder_redeem_request");
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
    "founder_redeem_request",
  );
  const idempotencyKey = matchingText(
    request.idempotencyKey,
    UUID_V4_PATTERN,
    "idempotency_key",
    40,
  );
  if (idempotencyHeader !== idempotencyKey) {
    throw new Error("idempotency_header_invalid");
  }
  const deviceKeyThumbprint = matchingText(
    request.deviceKeyThumbprint,
    THUMBPRINT_PATTERN,
    "device_thumbprint",
    100,
  );
  base64UrlDecode(deviceKeyThumbprint.slice("sha256:".length), 32);
  const proofSignature = matchingText(
    request.proofSignature,
    PROOF_SIGNATURE_PATTERN,
    "proof_signature",
    100,
  );
  base64UrlDecode(proofSignature, 64);
  return Object.freeze({
    code: matchingText(request.code, FOUNDER_PIN_PATTERN, "founder_pin", 6),
    challengeId: matchingText(
      request.challengeId,
      UUID_V4_PATTERN,
      "challenge_id",
      40,
    ),
    proofSignature,
    devicePublicKeyJwk: canonicalPublicJwk(request.devicePublicKeyJwk),
    deviceKeyThumbprint,
    appVersion: matchingText(
      request.appVersion,
      APP_VERSION_PATTERN,
      "app_version",
      80,
    ),
    idempotencyKey,
  });
}

export function parseAllowedOrigins(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("allowed_origins_missing");
  }
  const origins = value.split(",").map((candidate) => candidate.trim());
  if (origins.length === 0 || origins.length > 10 || origins.some((origin) => !origin)) {
    throw new Error("allowed_origins_invalid");
  }
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (
      parsed.origin !== origin ||
      (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1")
    ) {
      throw new Error("allowed_origins_invalid");
    }
  }
  return new Set(origins);
}

export function isUuidV4(value) {
  return typeof value === "string" && UUID_V4_PATTERN.test(value);
}
