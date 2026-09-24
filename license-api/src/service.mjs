import {
  hmacBase64Url,
  publicJwkThumbprint,
  randomNonce,
  sha256Hex,
  signEs256Jwt,
  verifyDeviceProof,
  verifyHmacBase64Url,
} from "./crypto.mjs";
import { createD1LicenseRepository } from "./d1-repository.mjs";
import { loadPrivateContentBundle } from "./private-bundle.mjs";
import {
  API_LIMITS,
  ENTITLEMENT_POLICY,
  FOUNDER_CONTENT_RELEASE,
} from "./release.mjs";
import {
  parseAllowedOrigins,
  readExactJson,
  validateChallengeRequest,
  validateFounderRedeemRequest,
} from "./validation.mjs";

const API_PATHS = new Set(["/v1/device/challenge", "/v1/founder/redeem"]);
const KID_PATTERN = /^[A-Za-z0-9._-]{1,80}$/u;
const SIMPLE_TEXT_PATTERN = /^[A-Za-z0-9:/._-]{1,200}$/u;
const SECURITY_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});

class ServiceError extends Error {
  constructor(status, reasonCode) {
    super(reasonCode);
    this.name = "ServiceError";
    this.status = status;
    this.reasonCode = reasonCode;
  }
}

function asRequestError(callback) {
  try {
    return callback();
  } catch {
    throw new ServiceError(400, "request_invalid");
  }
}

async function asAsyncRequestError(callback) {
  try {
    return await callback();
  } catch {
    throw new ServiceError(400, "request_invalid");
  }
}

function requireConfigText(env, name, pattern = SIMPLE_TEXT_PATTERN) {
  const value = env[name];
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error("license_configuration_invalid");
  }
  return value;
}

function requireIssuerOrigin(env) {
  const value = requireConfigText(env, "ENTITLEMENT_ISSUER");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("license_configuration_invalid");
  }
  const loopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (
    parsed.origin !== value ||
    (parsed.protocol !== "https:" && !(loopback && parsed.protocol === "http:"))
  ) {
    throw new Error("license_configuration_invalid");
  }
  return value;
}

function nowDate(nowProvider) {
  const now = nowProvider();
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("clock_invalid");
  }
  return now;
}

function civilDateIstanbul(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Expose-Headers": "X-Request-Id",
    Vary: "Origin",
  };
}

function responseHeaders(origin, requestId, additional = {}) {
  return {
    ...SECURITY_HEADERS,
    ...corsHeaders(origin),
    "X-Request-Id": requestId,
    ...additional,
  };
}

function jsonSuccess(value, origin, requestId) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: responseHeaders(origin, requestId, {
      "Content-Type": "application/json; charset=utf-8",
    }),
  });
}

function genericError(status, origin, requestId) {
  const headers = {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "X-Request-Id": requestId,
  };
  if (origin) Object.assign(headers, corsHeaders(origin));
  if (status === 429) headers["Retry-After"] = "900";
  return new Response(
    JSON.stringify({ error: "request_rejected", requestId }),
    { status, headers },
  );
}

function preflightResponse(request, origin, requestId) {
  const requestedMethod = request.headers.get("Access-Control-Request-Method");
  const requestedHeaders = (request.headers.get("Access-Control-Request-Headers") ?? "")
    .split(",")
    .map((header) => header.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean);
  const allowedHeaders = new Set(["content-type", "idempotency-key"]);
  if (
    requestedMethod !== "POST" ||
    requestedHeaders.some((header) => !allowedHeaders.has(header))
  ) {
    return genericError(403, origin, requestId);
  }
  return new Response(null, {
    status: 204,
    headers: responseHeaders(origin, requestId, {
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "600",
    }),
  });
}

function clientIp(request) {
  const value = request.headers.get("CF-Connecting-IP");
  if (typeof value !== "string" || value.length === 0 || value.length > 128) {
    return "unavailable";
  }
  return value;
}

async function pseudonym(encodedKey, namespace, value) {
  return `hmac:${await hmacBase64Url(encodedKey, `${namespace}\u0000${value}`)}`;
}

async function enforceRateLimits({
  repository,
  env,
  request,
  deviceKeyThumbprint,
  now,
  operation,
}) {
  const rateKey = requireConfigText(
    env,
    "RATE_LIMIT_HMAC_KEY",
    /^[A-Za-z0-9_-]{43}$/u,
  );
  const [pseudonymousIp, pseudonymousDevice] = await Promise.all([
    pseudonym(rateKey, "ip", clientIp(request)),
    pseudonym(rateKey, "device", deviceKeyThumbprint),
  ]);
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const isChallenge = operation === "challenge";
  const ipWindowSeconds = 15 * 60;
  const deviceWindowSeconds = 24 * 60 * 60;
  const ipLimit = isChallenge
    ? API_LIMITS.challengeIpPerFifteenMinutes
    : API_LIMITS.redeemIpPerFifteenMinutes;
  const deviceLimit = isChallenge
    ? API_LIMITS.challengeDevicePerDay
    : API_LIMITS.redeemDevicePerDay;
  const ipBucket = Math.floor(nowSeconds / ipWindowSeconds) * ipWindowSeconds;
  const deviceBucket =
    Math.floor(nowSeconds / deviceWindowSeconds) * deviceWindowSeconds;
  const [ipCount, deviceCount] = await Promise.all([
    repository.incrementRateLimit({
      scope: `${operation}-ip`,
      keyHmac: pseudonymousIp,
      bucketStartEpoch: ipBucket,
      expiresAtUtc: new Date((ipBucket + ipWindowSeconds * 2) * 1000).toISOString(),
    }),
    repository.incrementRateLimit({
      scope: `${operation}-device`,
      keyHmac: pseudonymousDevice,
      bucketStartEpoch: deviceBucket,
      expiresAtUtc: new Date((deviceBucket + deviceWindowSeconds * 2) * 1000).toISOString(),
    }),
  ]);
  if (ipCount > ipLimit || deviceCount > deviceLimit) {
    throw new ServiceError(429, "rate_limited");
  }
  return { pseudonymousIp, pseudonymousDevice };
}

async function safeAudit(repository, event) {
  try {
    await repository.writeAudit(event);
  } catch {
    // Audit failure must not expose request material or mutate the API response.
  }
}

function auditEvent({
  requestId,
  now,
  eventType,
  result,
  reasonCode,
  pseudonymousIp,
  pseudonymousDevice,
}) {
  return {
    requestId,
    occurredAtUtc: now.toISOString(),
    civilDate: civilDateIstanbul(now),
    eventType,
    result,
    reasonCode,
    pseudonymousIp,
    pseudonymousDevice,
    contentReleaseId: FOUNDER_CONTENT_RELEASE.contentReleaseId,
  };
}

function releaseBundleResponse(entitlementToken, contentBundle) {
  return Object.freeze({
    entitlementToken,
    contentBundle: Object.freeze({
      schemaVersion: contentBundle.schemaVersion,
      contentReleaseId: contentBundle.contentReleaseId,
      contentPackId: contentBundle.contentPackId,
      contentPackVersion: contentBundle.contentPackVersion,
      manifestDigest: contentBundle.manifestDigest,
      sku: contentBundle.sku,
      academicRelease: contentBundle.academicRelease,
      contentSha256: contentBundle.contentSha256,
      contentByteLength: contentBundle.contentByteLength,
      contentJson: contentBundle.contentJson,
    }),
  });
}

async function issueEntitlement({ env, binding, contentBundle, now, randomUuid }) {
  const issuer = requireIssuerOrigin(env);
  const audience = requireConfigText(env, "ENTITLEMENT_AUDIENCE");
  const kid = requireConfigText(env, "ENTITLEMENT_KID", KID_PATTERN);
  const legalTermsVersion = requireConfigText(
    env,
    "LEGAL_TERMS_VERSION",
    /^[A-Za-z0-9._-]{1,100}$/u,
  );
  if (typeof env.ENTITLEMENT_PRIVATE_JWK !== "string") {
    throw new Error("license_configuration_invalid");
  }
  const issuedAt = Math.floor(now.getTime() / 1000);
  const claims = {
    ver: 1,
    iss: issuer,
    aud: audience,
    jti: randomUuid(),
    entitlement_id: binding.entitlementId,
    device_key_thumbprint: binding.deviceKeyThumbprint,
    grants: [
      {
        sku: contentBundle.sku,
        content_release_id: contentBundle.contentReleaseId,
        content_pack_id: contentBundle.contentPackId,
        content_pack_version: contentBundle.contentPackVersion,
        manifest_digest: contentBundle.manifestDigest,
        access_mode: "staff-code",
        academic_release: contentBundle.academicRelease,
        trial_started_at: null,
        access_expires_at: null,
      },
    ],
    iat: issuedAt,
    nbf: issuedAt,
    refresh_after: issuedAt + ENTITLEMENT_POLICY.refreshAfterSeconds,
    offline_until: issuedAt + ENTITLEMENT_POLICY.offlineUntilSeconds,
    archive_access_after: issuedAt + ENTITLEMENT_POLICY.archiveAccessAfterSeconds,
    revocation_generation: binding.revocationGeneration,
    legal_terms_version: legalTermsVersion,
  };
  return signEs256Jwt({
    header: { alg: "ES256", kid, typ: "JWT" },
    claims,
    privateJwkJson: env.ENTITLEMENT_PRIVATE_JWK,
  });
}

async function handleChallenge({
  request,
  env,
  repository,
  origin,
  requestId,
  now,
  randomUuid,
  nonceFactory,
}) {
  const body = await asAsyncRequestError(() => readExactJson(request));
  const input = asRequestError(() => validateChallengeRequest(body));
  const rate = await enforceRateLimits({
    repository,
    env,
    request,
    deviceKeyThumbprint: input.deviceKeyThumbprint,
    now,
    operation: "challenge",
  });
  const challenge = Object.freeze({
    challengeId: randomUuid(),
    nonce: nonceFactory(),
    purpose: input.purpose,
    deviceKeyThumbprint: input.deviceKeyThumbprint,
    createdAtUtc: now.toISOString(),
    expiresAtUtc: new Date(
      now.getTime() + API_LIMITS.challengeTtlSeconds * 1000,
    ).toISOString(),
  });
  await repository.createChallenge(challenge);
  await safeAudit(
    repository,
    auditEvent({
      requestId,
      now,
      eventType: "founder_challenge",
      result: "success",
      reasonCode: "issued",
      ...rate,
    }),
  );
  return jsonSuccess(
    {
      challengeId: challenge.challengeId,
      nonce: challenge.nonce,
      purpose: challenge.purpose,
      deviceKeyThumbprint: challenge.deviceKeyThumbprint,
      expiresAtUtc: challenge.expiresAtUtc,
    },
    origin,
    requestId,
  );
}

async function founderRequestFingerprint(input, pinDigest) {
  return `sha256:${await sha256Hex(
    JSON.stringify({
      appVersion: input.appVersion,
      challengeId: input.challengeId,
      deviceKeyThumbprint: input.deviceKeyThumbprint,
      devicePublicKeyJwk: {
        crv: input.devicePublicKeyJwk.crv,
        ext: input.devicePublicKeyJwk.ext,
        key_ops: input.devicePublicKeyJwk.key_ops,
        kty: input.devicePublicKeyJwk.kty,
        x: input.devicePublicKeyJwk.x,
        y: input.devicePublicKeyJwk.y,
      },
      idempotencyKey: input.idempotencyKey,
      pinDigest,
      proofSignature: input.proofSignature,
    }),
  )}`;
}

async function handleFounderRedeem({
  request,
  env,
  repository,
  origin,
  requestId,
  now,
  randomUuid,
  bundleLoader,
}) {
  const body = await asAsyncRequestError(() => readExactJson(request));
  const input = asRequestError(() =>
    validateFounderRedeemRequest(
      body,
      request.headers.get("Idempotency-Key"),
    ),
  );
  const computedThumbprint = await asAsyncRequestError(() =>
    publicJwkThumbprint(input.devicePublicKeyJwk),
  );
  if (computedThumbprint !== input.deviceKeyThumbprint) {
    throw new ServiceError(403, "request_rejected");
  }
  const rate = await enforceRateLimits({
    repository,
    env,
    request,
    deviceKeyThumbprint: input.deviceKeyThumbprint,
    now,
    operation: "redeem",
  });
  const pinKey = requireConfigText(
    env,
    "FOUNDER_PIN_HMAC_KEY",
    /^[A-Za-z0-9_-]{43}$/u,
  );
  const pinDigest = requireConfigText(
    env,
    "FOUNDER_PIN_HMAC_DIGEST",
    /^[A-Za-z0-9_-]{43}$/u,
  );
  let pinValid = false;
  try {
    pinValid = await verifyHmacBase64Url(pinKey, pinDigest, input.code);
  } catch {
    throw new Error("license_configuration_invalid");
  }
  if (!pinValid) throw new ServiceError(403, "request_rejected");
  if (await repository.isFounderDeviceTombstoned(input.deviceKeyThumbprint)) {
    await safeAudit(
      repository,
      auditEvent({
        requestId,
        now,
        eventType: "founder_redeem",
        result: "rejected",
        reasonCode: "device-tombstoned",
        ...rate,
      }),
    );
    throw new ServiceError(403, "request_rejected");
  }
  const requestFingerprint = await founderRequestFingerprint(input, pinDigest);
  const existingIdempotency = await repository.getIdempotency(
    input.idempotencyKey,
  );
  if (existingIdempotency) {
    if (
      existingIdempotency.challengeId !== input.challengeId ||
      existingIdempotency.deviceKeyThumbprint !== input.deviceKeyThumbprint ||
      existingIdempotency.requestFingerprint !== requestFingerprint
    ) {
      throw new ServiceError(403, "request_rejected");
    }
    const contentBundle = await bundleLoader(env);
    await safeAudit(
      repository,
      auditEvent({
        requestId,
        now,
        eventType: "founder_redeem",
        result: "success",
        reasonCode: "idempotent-reissue",
        ...rate,
      }),
    );
    return jsonSuccess(
      releaseBundleResponse(
        existingIdempotency.entitlementToken,
        contentBundle,
      ),
      origin,
      requestId,
    );
  }
  const challenge = await repository.getChallenge(input.challengeId);
  if (
    !challenge ||
    challenge.purpose !== "redeem-code" ||
    challenge.deviceKeyThumbprint !== input.deviceKeyThumbprint ||
    challenge.expiresAtUtc <= now.toISOString()
  ) {
    throw new ServiceError(403, "request_rejected");
  }
  const proofValid = await asAsyncRequestError(() =>
    verifyDeviceProof({
      challenge,
      idempotencyKey: input.idempotencyKey,
      proofSignature: input.proofSignature,
      devicePublicKeyJwk: input.devicePublicKeyJwk,
    }),
  );
  if (!proofValid) throw new ServiceError(403, "request_rejected");
  const contentBundle = await bundleLoader(env);
  const challengeClaim = await repository.claimChallenge({
    challengeId: input.challengeId,
    purpose: "redeem-code",
    deviceKeyThumbprint: input.deviceKeyThumbprint,
    nowUtc: now.toISOString(),
    idempotencyKey: input.idempotencyKey,
    requestFingerprint,
  });
  if (challengeClaim === "rejected") {
    throw new ServiceError(403, "request_rejected");
  }
  const deviceClaim = await repository.claimFounderDevice({
    deviceKeyThumbprint: input.deviceKeyThumbprint,
    devicePublicKeyJwkJson: JSON.stringify(input.devicePublicKeyJwk),
    entitlementId: randomUuid(),
    nowUtc: now.toISOString(),
  });
  if (
    deviceClaim.status === "limit" ||
    deviceClaim.status === "denied" ||
    !deviceClaim.binding
  ) {
    await safeAudit(
      repository,
      auditEvent({
        requestId,
        now,
        eventType: "founder_redeem",
        result: "rejected",
        reasonCode: deviceClaim.status === "denied"
          ? "device-tombstoned"
          : "device-limit",
        ...rate,
      }),
    );
    throw new ServiceError(403, "request_rejected");
  }
  const candidateToken = await issueEntitlement({
    env,
    binding: deviceClaim.binding,
    contentBundle,
    now,
    randomUuid,
  });
  const persisted = await repository.putIdempotency({
    idempotencyKey: input.idempotencyKey,
    challengeId: input.challengeId,
    deviceKeyThumbprint: input.deviceKeyThumbprint,
    requestFingerprint,
    entitlementToken: candidateToken,
    createdAtUtc: now.toISOString(),
  });
  if (
    !persisted ||
    persisted.challengeId !== input.challengeId ||
    persisted.deviceKeyThumbprint !== input.deviceKeyThumbprint ||
    persisted.requestFingerprint !== requestFingerprint
  ) {
    throw new ServiceError(403, "request_rejected");
  }
  await repository.touchBinding(input.deviceKeyThumbprint, now.toISOString());
  await safeAudit(
    repository,
    auditEvent({
      requestId,
      now,
      eventType: "founder_redeem",
      result: "success",
      reasonCode: deviceClaim.status,
      ...rate,
    }),
  );
  return jsonSuccess(
    releaseBundleResponse(persisted.entitlementToken, contentBundle),
    origin,
    requestId,
  );
}

export function createLicenseService(options = {}) {
  const nowProvider = options.now ?? (() => new Date());
  const randomUuid = options.randomUuid ?? (() => crypto.randomUUID());
  const nonceFactory = options.nonceFactory ?? (() => randomNonce());
  const repositoryFactory = options.repositoryFactory ?? createD1LicenseRepository;
  const bundleLoader = options.bundleLoader ?? loadPrivateContentBundle;

  return Object.freeze({
    async fetch(request, env) {
      const requestId = randomUuid();
      let origin = null;
      try {
        const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
        const suppliedOrigin = request.headers.get("Origin");
        if (!suppliedOrigin || !allowedOrigins.has(suppliedOrigin)) {
          return genericError(403, null, requestId);
        }
        origin = suppliedOrigin;
        const url = new URL(request.url);
        if (!API_PATHS.has(url.pathname)) {
          return genericError(404, origin, requestId);
        }
        if (request.method === "OPTIONS") {
          return preflightResponse(request, origin, requestId);
        }
        if (request.method !== "POST") {
          return genericError(405, origin, requestId);
        }
        const now = nowDate(nowProvider);
        const repository = repositoryFactory(env);
        if (url.pathname === "/v1/device/challenge") {
          return await handleChallenge({
            request,
            env,
            repository,
            origin,
            requestId,
            now,
            randomUuid,
            nonceFactory,
          });
        }
        return await handleFounderRedeem({
          request,
          env,
          repository,
          origin,
          requestId,
          now,
          randomUuid,
          bundleLoader,
        });
      } catch (error) {
        const status = error instanceof ServiceError ? error.status : 500;
        return genericError(status, origin, requestId);
      }
    },
  });
}

export const licenseService = createLicenseService();
