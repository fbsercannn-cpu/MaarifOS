import assert from "node:assert/strict";
import { createHmac, randomBytes, randomInt, webcrypto } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { verifyPremiumEntitlement } from "../../app/src/features/premium-access/entitlement.ts";
import {
  base64UrlEncode,
  challengeSigningPayload,
  publicJwkThumbprint,
  sha256Hex,
} from "../src/crypto.mjs";
import { loadPrivateContentBundle } from "../src/private-bundle.mjs";
import {
  ENTITLEMENT_POLICY,
  FOUNDER_CONTENT_RELEASE,
} from "../src/release.mjs";
import { createLicenseService } from "../src/service.mjs";
import { MemoryLicenseRepository } from "./memory-repository.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const licenseApiRoot = resolve(testDirectory, "..");
const origin = "https://app.example.test";
const apiUrl = "https://license.maarifos.example";

test("operator reset Cloudflare D1 REST batch nesnesini kullanır", async () => {
  const source = await readFile(
    resolve(licenseApiRoot, "scripts", "deactivate-founder-slot.mjs"),
    "utf8",
  );
  assert.match(source, /body:\s*JSON\.stringify\(\{\s*batch:\s*\[/u);
  assert.doesNotMatch(source, /body:\s*JSON\.stringify\(\[\s*\{/u);
});

function randomPin() {
  return String(randomInt(10 ** 5, 10 ** 6));
}

async function createDevice() {
  const keyPair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const publicJwk = await webcrypto.subtle.exportKey("jwk", keyPair.publicKey);
  return {
    keyPair,
    publicJwk,
    thumbprint: await publicJwkThumbprint(publicJwk),
  };
}

async function createHarness(options = {}) {
  const repository = new MemoryLicenseRepository();
  const founderPin = options.founderPin ?? randomPin();
  const founderKey = randomBytes(32).toString("base64url");
  const rateKey = randomBytes(32).toString("base64url");
  const founderDigest = createHmac(
    "sha256",
    Buffer.from(founderKey, "base64url"),
  )
    .update(founderPin, "utf8")
    .digest("base64url");
  const entitlementKeyPair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const [privateJwk, publicJwk] = await Promise.all([
    webcrypto.subtle.exportKey("jwk", entitlementKeyPair.privateKey),
    webcrypto.subtle.exportKey("jwk", entitlementKeyPair.publicKey),
  ]);
  const contentJson = `${JSON.stringify({
    id: FOUNDER_CONTENT_RELEASE.contentPackId,
    version: FOUNDER_CONTENT_RELEASE.contentPackVersion,
    contentReleaseId: FOUNDER_CONTENT_RELEASE.contentReleaseId,
    manifestDigest: FOUNDER_CONTENT_RELEASE.manifestDigest,
    sku: FOUNDER_CONTENT_RELEASE.sku,
    academicRelease: FOUNDER_CONTENT_RELEASE.academicRelease,
  })}\n`;
  const bundle = Object.freeze({
    schemaVersion: 1,
    contentReleaseId: FOUNDER_CONTENT_RELEASE.contentReleaseId,
    contentPackId: FOUNDER_CONTENT_RELEASE.contentPackId,
    contentPackVersion: FOUNDER_CONTENT_RELEASE.contentPackVersion,
    manifestDigest: FOUNDER_CONTENT_RELEASE.manifestDigest,
    sku: FOUNDER_CONTENT_RELEASE.sku,
    academicRelease: FOUNDER_CONTENT_RELEASE.academicRelease,
    contentSha256: `sha256:${await sha256Hex(new TextEncoder().encode(contentJson))}`,
    contentByteLength: new TextEncoder().encode(contentJson).byteLength,
    contentJson,
  });
  const state = {
    now: options.now ?? new Date("2026-08-08T12:00:00.000Z"),
  };
  const env = {
    ALLOWED_ORIGINS: origin,
    ENTITLEMENT_ISSUER: apiUrl,
    ENTITLEMENT_AUDIENCE: "maarifos-pwa",
    ENTITLEMENT_KID: "founder-es256-test",
    LEGAL_TERMS_VERSION: "founder-staff-test-v1",
    FOUNDER_PIN_HMAC_KEY: founderKey,
    FOUNDER_PIN_HMAC_DIGEST: founderDigest,
    RATE_LIMIT_HMAC_KEY: rateKey,
    ENTITLEMENT_PRIVATE_JWK: JSON.stringify(privateJwk),
  };
  const service = createLicenseService({
    now: () => new Date(state.now),
    repositoryFactory: () => repository,
    bundleLoader: async () => bundle,
  });
  return {
    repository,
    founderPin,
    entitlementPublicJwk: publicJwk,
    state,
    env,
    service,
    bundle,
  };
}

function requestHeaders(ip, additional = {}) {
  return {
    Origin: origin,
    "Content-Type": "application/json",
    "CF-Connecting-IP": ip,
    ...additional,
  };
}

async function challenge(harness, device, ip) {
  const response = await harness.service.fetch(
    new Request(`${apiUrl}/v1/device/challenge`, {
      method: "POST",
      headers: requestHeaders(ip),
      body: JSON.stringify({
        deviceKeyThumbprint: device.thumbprint,
        purpose: "redeem-code",
      }),
    }),
    harness.env,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), [
    "challengeId",
    "deviceKeyThumbprint",
    "expiresAtUtc",
    "nonce",
    "purpose",
  ]);
  return body;
}

async function proofSignature(device, challengeValue, idempotencyKey) {
  const signature = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    device.keyPair.privateKey,
    new TextEncoder().encode(
      challengeSigningPayload(challengeValue, idempotencyKey),
    ),
  );
  return base64UrlEncode(signature);
}

async function redemptionInput(
  harness,
  device,
  challengeValue,
  overrides = {},
) {
  const idempotencyKey = overrides.idempotencyKey ?? webcrypto.randomUUID();
  const signedChallenge = overrides.signedChallenge ?? challengeValue;
  return {
    code: overrides.code ?? harness.founderPin,
    challengeId: challengeValue.challengeId,
    proofSignature:
      overrides.proofSignature ??
      (await proofSignature(device, signedChallenge, idempotencyKey)),
    devicePublicKeyJwk: device.publicJwk,
    deviceKeyThumbprint: device.thumbprint,
    appVersion: "0.9.0",
    idempotencyKey,
    ...(overrides.extra ?? {}),
  };
}

async function redeem(harness, input, ip) {
  return harness.service.fetch(
    new Request(`${apiUrl}/v1/founder/redeem`, {
      method: "POST",
      headers: requestHeaders(ip, {
        "Idempotency-Key": input.idempotencyKey,
      }),
      body: JSON.stringify(input),
    }),
    harness.env,
  );
}

async function activateDevice(harness, device, ip) {
  const challengeValue = await challenge(harness, device, ip);
  const input = await redemptionInput(harness, device, challengeValue);
  const response = await redeem(harness, input, ip);
  return { challengeValue, input, response };
}

function assertGenericRejection(body) {
  assert.deepEqual(Object.keys(body).sort(), ["error", "requestId"]);
  assert.equal(body.error, "request_rejected");
  assert.match(body.requestId, /^[0-9a-f-]{36}$/iu);
}

test("staged v3 asset remains byte-exact and private loader verifies its locks", async () => {
  const assetDirectory = resolve(licenseApiRoot, "private-assets");
  const assetBinding = {
    async fetch(input) {
      const path = new URL(input).pathname;
      try {
        const bytes = await readFile(resolve(assetDirectory, path.slice(1)));
        return new Response(bytes, { status: 200 });
      } catch {
        return new Response(null, { status: 404 });
      }
    },
  };
  const bundle = await loadPrivateContentBundle({ PRIVATE_ASSETS: assetBinding });
  assert.equal(bundle.contentByteLength, FOUNDER_CONTENT_RELEASE.contentByteLength);
  assert.equal(bundle.contentSha256, FOUNDER_CONTENT_RELEASE.contentRawSha256);
  assert.equal(
    new TextEncoder().encode(bundle.contentJson).byteLength,
    FOUNDER_CONTENT_RELEASE.contentByteLength,
  );
});

test("two devices succeed, a third gets the same generic rejection", async () => {
  const harness = await createHarness();
  const devices = await Promise.all([createDevice(), createDevice(), createDevice()]);
  for (let index = 0; index < 2; index += 1) {
    const result = await activateDevice(
      harness,
      devices[index],
      `203.0.113.${index + 1}`,
    );
    assert.equal(result.response.status, 200);
    const body = await result.response.json();
    assert.deepEqual(Object.keys(body).sort(), ["contentBundle", "entitlementToken"]);
    assert.deepEqual(Object.keys(body.contentBundle).sort(), [
      "academicRelease",
      "contentByteLength",
      "contentJson",
      "contentPackId",
      "contentPackVersion",
      "contentReleaseId",
      "contentSha256",
      "manifestDigest",
      "schemaVersion",
      "sku",
    ]);
    assert.equal(body.contentBundle.contentJson, harness.bundle.contentJson);
  }
  const third = await activateDevice(harness, devices[2], "203.0.113.3");
  assert.equal(third.response.status, 403);
  assertGenericRejection(await third.response.json());
  assert.equal(await harness.repository.countActiveBindings(), 2);
});

test("same request is idempotent and same-device reissue never consumes another slot", async () => {
  const harness = await createHarness();
  const device = await createDevice();
  const first = await activateDevice(harness, device, "198.51.100.1");
  assert.equal(first.response.status, 200);
  const firstBody = await first.response.json();
  const retry = await redeem(harness, first.input, "198.51.100.1");
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).entitlementToken, firstBody.entitlementToken);
  const reissue = await activateDevice(harness, device, "198.51.100.2");
  assert.equal(reissue.response.status, 200);
  assert.equal(await harness.repository.countActiveBindings(), 1);
});

test("operator reset tombstones every former device while the slot remains reusable", async () => {
  const harness = await createHarness();
  const devices = await Promise.all([
    createDevice(),
    createDevice(),
    createDevice(),
    createDevice(),
  ]);
  const first = await activateDevice(harness, devices[0], "198.51.100.60");
  const second = await activateDevice(harness, devices[1], "198.51.100.61");
  assert.equal(first.response.status, 200);
  assert.equal(second.response.status, 200);

  const firstBinding = await harness.repository.getActiveBinding(
    devices[0].thumbprint,
  );
  assert.equal(
    await harness.repository.deactivateSlot(
      firstBinding.slot,
      harness.state.now.toISOString(),
      "10000000-0000-4000-8000-000000000101",
    ),
    true,
  );

  const replayAfterReset = await redeem(
    harness,
    first.input,
    "198.51.100.60",
  );
  assert.equal(replayAfterReset.status, 403);
  assertGenericRejection(await replayAfterReset.json());
  const freshOldDeviceAttempt = await activateDevice(
    harness,
    devices[0],
    "198.51.100.63",
  );
  assert.equal(freshOldDeviceAttempt.response.status, 403);
  assertGenericRejection(await freshOldDeviceAttempt.response.json());

  const replacement = await activateDevice(
    harness,
    devices[2],
    "198.51.100.62",
  );
  assert.equal(replacement.response.status, 200);
  assert.equal(await harness.repository.countActiveBindings(), 2);
  assert.equal(
    await harness.repository.isFounderDeviceTombstoned(devices[0].thumbprint),
    true,
  );
  assert.equal(
    await harness.repository.getActiveBinding(devices[0].thumbprint),
    null,
  );
  const replacementBinding = await harness.repository.getActiveBinding(
    devices[2].thumbprint,
  );
  assert.equal(replacementBinding.slot, firstBinding.slot);
  assert.equal(replacementBinding.revocationGeneration, 1);

  assert.equal(
    await harness.repository.deactivateSlot(
      replacementBinding.slot,
      harness.state.now.toISOString(),
      "10000000-0000-4000-8000-000000000102",
    ),
    true,
  );
  assert.equal(
    await harness.repository.isFounderDeviceTombstoned(devices[0].thumbprint),
    true,
  );
  assert.equal(
    await harness.repository.isFounderDeviceTombstoned(devices[2].thumbprint),
    true,
  );
  assert.equal(harness.repository.tombstones.size, 2);
  const resetAudits = harness.repository.audits.filter(
    (event) => event.eventType === "founder_slot_deactivated",
  );
  assert.deepEqual(
    resetAudits.map((event) => event.reasonCode),
    ["operator-confirmed-tombstoned", "operator-confirmed-tombstoned"],
  );
  assert.equal(
    resetAudits.some((event) => (
      JSON.stringify(event).includes(devices[0].thumbprint) ||
      JSON.stringify(event).includes(devices[2].thumbprint)
    )),
    false,
  );

  const secondFormerDeviceAttempt = await activateDevice(
    harness,
    devices[2],
    "198.51.100.64",
  );
  assert.equal(secondFormerDeviceAttempt.response.status, 403);
  assertGenericRejection(await secondFormerDeviceAttempt.response.json());

  const secondReplacement = await activateDevice(
    harness,
    devices[3],
    "198.51.100.65",
  );
  assert.equal(secondReplacement.response.status, 200);
  const secondReplacementBinding = await harness.repository.getActiveBinding(
    devices[3].thumbprint,
  );
  assert.equal(secondReplacementBinding.slot, firstBinding.slot);
  assert.equal(secondReplacementBinding.revocationGeneration, 2);
  assert.equal(await harness.repository.countActiveBindings(), 2);

  const replacementBody = await secondReplacement.response.json();
  const claims = JSON.parse(
    new TextDecoder().decode(
      Buffer.from(replacementBody.entitlementToken.split(".")[1], "base64url"),
    ),
  );
  assert.equal(claims.revocation_generation, 2);
  assert.equal(
    claims.refresh_after - claims.iat,
    ENTITLEMENT_POLICY.refreshAfterSeconds,
  );
  assert.equal(
    claims.offline_until - claims.iat,
    ENTITLEMENT_POLICY.offlineUntilSeconds,
  );
});

test("one hundred concurrent distinct attempts bind at most two devices", async () => {
  const harness = await createHarness();
  const devices = await Promise.all(Array.from({ length: 100 }, () => createDevice()));
  const challenges = await Promise.all(
    devices.map((device, index) =>
      challenge(harness, device, `192.0.2.${index + 1}`),
    ),
  );
  const inputs = await Promise.all(
    devices.map((device, index) =>
      redemptionInput(harness, device, challenges[index]),
    ),
  );
  const responses = await Promise.all(
    inputs.map((input, index) =>
      redeem(harness, input, `192.0.2.${index + 1}`),
    ),
  );
  assert.equal(responses.filter((response) => response.status === 200).length, 2);
  assert.equal(responses.filter((response) => response.status === 403).length, 98);
  assert.equal(await harness.repository.countActiveBindings(), 2);
});

test("replay, wrong-purpose, expired and tampered proofs are rejected", async (context) => {
  await context.test("challenge replay with a different idempotency key", async () => {
    const harness = await createHarness();
    const device = await createDevice();
    const first = await activateDevice(harness, device, "203.0.113.20");
    assert.equal(first.response.status, 200);
    const replayInput = await redemptionInput(
      harness,
      device,
      first.challengeValue,
    );
    assert.equal((await redeem(harness, replayInput, "203.0.113.21")).status, 403);
  });

  await context.test("proof signed for the wrong purpose", async () => {
    const harness = await createHarness();
    const device = await createDevice();
    const challengeValue = await challenge(harness, device, "203.0.113.30");
    const input = await redemptionInput(harness, device, challengeValue, {
      signedChallenge: { ...challengeValue, purpose: "activate-trial" },
    });
    assert.equal((await redeem(harness, input, "203.0.113.31")).status, 403);
  });

  await context.test("expired challenge", async () => {
    const harness = await createHarness();
    const device = await createDevice();
    const challengeValue = await challenge(harness, device, "203.0.113.40");
    const input = await redemptionInput(harness, device, challengeValue);
    harness.state.now = new Date(harness.state.now.getTime() + 6 * 60 * 1000);
    assert.equal((await redeem(harness, input, "203.0.113.41")).status, 403);
  });

  await context.test("tampered signature", async () => {
    const harness = await createHarness();
    const device = await createDevice();
    const challengeValue = await challenge(harness, device, "203.0.113.50");
    const valid = await redemptionInput(harness, device, challengeValue);
    const input = {
      ...valid,
      proofSignature: `${valid.proofSignature[0] === "A" ? "B" : "A"}${valid.proofSignature.slice(1)}`,
    };
    assert.equal((await redeem(harness, input, "203.0.113.51")).status, 403);
  });
});

test("entitlement is accepted by the production client verifier with the same HTTPS issuer", async () => {
  const harness = await createHarness();
  const device = await createDevice();
  const activation = await activateDevice(harness, device, "198.51.100.20");
  const body = await activation.response.json();
  const access = await verifyPremiumEntitlement({
    token: body.entitlementToken,
    trustedKeys: { "founder-es256-test": harness.entitlementPublicJwk },
    expectedIssuer: apiUrl,
    expectedAudience: "maarifos-pwa",
    expectedDeviceKeyThumbprint: device.thumbprint,
    expectedSku: FOUNDER_CONTENT_RELEASE.sku,
    expectedContentReleaseId: FOUNDER_CONTENT_RELEASE.contentReleaseId,
    expectedContentPackId: FOUNDER_CONTENT_RELEASE.contentPackId,
    expectedContentPackVersion: FOUNDER_CONTENT_RELEASE.contentPackVersion,
    expectedManifestDigest: FOUNDER_CONTENT_RELEASE.manifestDigest,
    now: harness.state.now,
  });
  assert.equal(access.status, "active");
  assert.equal(access.grant.accessMode, "staff-code");
  assert.equal(access.canExportPremiumContent, true);
});

async function collectSourceText(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const textExtensions = new Set([".mjs", ".json", ".jsonc", ".md", ".sql"]);
  const chunks = [];
  for (const entry of entries) {
    if ([".wrangler", ".secrets"].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) chunks.push(await collectSourceText(path));
    else if (textExtensions.has(extname(entry.name))) chunks.push(await readFile(path, "utf8"));
  }
  return chunks.join("\n");
}

test("PIN never appears in source/logs and educational payload fields are rejected", async () => {
  const sourceBefore = await collectSourceText(licenseApiRoot);
  let founderPin = randomPin();
  while (sourceBefore.includes(founderPin)) founderPin = randomPin();
  const harness = await createHarness({ founderPin });
  const device = await createDevice();
  const challengeValue = await challenge(harness, device, "198.51.100.30");
  const valid = await redemptionInput(harness, device, challengeValue);
  const logs = [];
  const originalMethods = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };
  console.log = (...items) => logs.push(items.join(" "));
  console.warn = (...items) => logs.push(items.join(" "));
  console.error = (...items) => logs.push(items.join(" "));
  try {
    const withPlan = { ...valid, plan: { title: "forbidden" } };
    const response = await redeem(harness, withPlan, "198.51.100.31");
    assert.equal(response.status, 400);
    assertGenericRejection(await response.json());
  } finally {
    Object.assign(console, originalMethods);
  }
  const sourceAfter = await collectSourceText(licenseApiRoot);
  assert.equal(sourceAfter.includes(founderPin), false);
  assert.equal(logs.join("\n").includes(founderPin), false);
  assert.equal(await harness.repository.countActiveBindings(), 0);
});

test("CORS is origin-exact, cookie-free, and request bodies over eight KiB fail closed", async () => {
  const harness = await createHarness();
  const denied = await harness.service.fetch(
    new Request(`${apiUrl}/v1/device/challenge`, {
      method: "POST",
      headers: requestHeaders("198.51.100.40", { Origin: "https://evil.example" }),
      body: JSON.stringify({
        deviceKeyThumbprint: `sha256:${"A".repeat(43)}`,
        purpose: "redeem-code",
      }),
    }),
    harness.env,
  );
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.has("Access-Control-Allow-Origin"), false);
  assert.equal(denied.headers.has("Set-Cookie"), false);

  const oversized = await harness.service.fetch(
    new Request(`${apiUrl}/v1/device/challenge`, {
      method: "POST",
      headers: requestHeaders("198.51.100.41"),
      body: JSON.stringify({ padding: "x".repeat(9 * 1024) }),
    }),
    harness.env,
  );
  assert.equal(oversized.status, 400);
  assert.equal(oversized.headers.has("Set-Cookie"), false);
});
