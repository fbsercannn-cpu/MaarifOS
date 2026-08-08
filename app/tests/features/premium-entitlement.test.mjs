import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertLicenseApiRequestHasNoEducationalData,
  assertPremiumPackActionAccess,
  createDevelopmentPreviewAccess,
  verifyPremiumEntitlement,
} from "../../src/features/premium-access/entitlement.ts";
import {
  validatePremiumCodeRedeemRequest,
  validatePremiumTrialActivationRequest,
} from "../../src/features/premium-access/license-requests.ts";
import { premiumDeviceKeyThumbprint } from "../../src/features/premium-access/device-identity.ts";
import {
  createPremiumChallengeProof,
  premiumChallengeSigningPayload,
} from "../../src/features/premium-access/challenge-proof.ts";
import { parsePremiumContentPack } from "../../src/features/premium-plans/content-repository.ts";
import { createSignedEntitlementFixture } from "../helpers/premium-entitlement.mjs";

async function pack() {
  const raw = JSON.parse(await readFile(
    new URL("../../../premium-content/releases/tymm-6072/2026-09/content.v2.json", import.meta.url),
    "utf8",
  ));
  return parsePremiumContentPack(raw);
}

test("ES256 imzalı ve exact release bağlı satın alma entitlement'ı premium kullanım ve çıktıyı açar", async () => {
  const content = await pack();
  const fixture = await createSignedEntitlementFixture(content);
  const access = await verifyPremiumEntitlement(fixture);
  assert.equal(access.status, "active");
  assert.equal(access.source, "signed-entitlement");
  assert.equal(access.canUsePremiumContent, true);
  assert.equal(access.canExportPremiumContent, true);
  assert.equal(access.grant.contentReleaseId, content.contentReleaseId);
  assert.equal(access.grant.manifestDigest, content.manifestDigest);
});

test("kurcalanmış imza, yanlış cihaz ve yanlış release fail-closed reddedilir", async () => {
  const content = await pack();
  const fixture = await createSignedEntitlementFixture(content);
  const segments = fixture.token.split(".");
  const tamperedSignature = Buffer.from(segments[2], "base64url");
  tamperedSignature[0] ^= 1;
  const tampered = `${segments[0]}.${segments[1]}.${tamperedSignature.toString("base64url")}`;
  await assert.rejects(
    verifyPremiumEntitlement({ ...fixture, token: tampered }),
    /imzası geçersiz/,
  );
  const nonCanonicalLastCharacter = new Map([
    ["A", "B"],
    ["Q", "R"],
    ["g", "h"],
    ["w", "x"],
  ]).get(segments[2].at(-1));
  assert.ok(nonCanonicalLastCharacter);
  const nonCanonicalAlias = `${segments[0]}.${segments[1]}.${segments[2].slice(0, -1)}${nonCanonicalLastCharacter}`;
  await assert.rejects(
    verifyPremiumEntitlement({ ...fixture, token: nonCanonicalAlias }),
    /kanonik base64url/,
  );
  await assert.rejects(
    verifyPremiumEntitlement({
      ...fixture,
      expectedDeviceKeyThumbprint: `sha256:${"B".repeat(43)}`,
    }),
    /bu cihaz anahtarına ait değildir/,
  );
  await assert.rejects(
    verifyPremiumEntitlement({ ...fixture, expectedContentPackVersion: "9.9.9" }),
    /seçilen içerik sürümünü kapsamıyor/,
  );
});

test("72 saatlik deneme içerik kullanımını açar, çıktıyı kapatır ve süre sonunda uzamaz", async () => {
  const content = await pack();
  const fixture = await createSignedEntitlementFixture(content, { accessMode: "trial" });
  const active = await verifyPremiumEntitlement(fixture);
  assert.equal(active.status, "active");
  assert.equal(active.canUsePremiumContent, true);
  assert.equal(active.canExportPremiumContent, false);

  const expiresAt = fixture.claims.grants[0].access_expires_at;
  const expired = await verifyPremiumEntitlement({
    ...fixture,
    now: new Date(expiresAt * 1000),
  });
  assert.equal(expired.status, "expired");
  assert.equal(expired.canUsePremiumContent, false);
  assert.equal(expired.canReadExistingTeacherPlans, true);

  const rollback = await verifyPremiumEntitlement({
    ...fixture,
    now: new Date("2026-09-08T07:00:00.000Z"),
    maxObservedWallClock: new Date(expiresAt * 1000),
  });
  assert.equal(rollback.status, "expired");
  assert.equal(rollback.clockRollbackDetected, true);
});

test("çevrimdışı süre ve bilinen iptal nesli yeni premium işlemleri kapatır, öğretmen planını kilitlemez", async () => {
  const content = await pack();
  const fixture = await createSignedEntitlementFixture(content);
  const refreshRequired = await verifyPremiumEntitlement({
    ...fixture,
    now: new Date((fixture.claims.offline_until + 1) * 1000),
  });
  assert.equal(refreshRequired.status, "refresh-required");
  assert.equal(refreshRequired.canUsePremiumContent, false);
  assert.equal(refreshRequired.canReadExistingTeacherPlans, true);

  const revoked = await verifyPremiumEntitlement({
    ...fixture,
    minimumRevocationGeneration: 1,
  });
  assert.equal(revoked.status, "revoked");
  assert.equal(revoked.canExportPremiumContent, false);
  assert.equal(revoked.canReadExistingTeacherPlans, true);
});

test("deneme grant'i tam 72 saat değilse ve geliştirme yetkisi üretimde istenirse reddedilir", async () => {
  const content = await pack();
  const invalidTrial = await createSignedEntitlementFixture(content, {
    accessMode: "trial",
    grantOverrides: { access_expires_at: 1 },
  });
  await assert.rejects(
    verifyPremiumEntitlement(invalidTrial),
    /deneme süresi sözleşmesine uymuyor/,
  );
  assert.throws(
    () => createDevelopmentPreviewAccess({
      sku: content.sku,
      contentReleaseId: content.contentReleaseId,
      contentPackId: content.id,
      contentPackVersion: content.version,
      manifestDigest: content.manifestDigest,
      academicRelease: content.academicRelease,
    }),
    /üretim yapısında kullanılamaz/,
  );
});

test("lisans API sözleşmesi çocuk, sınıf, gözlem veya plan verisi kabul etmez", () => {
  const safeRequest = {
    code: "MRF-TEST-CODE",
    devicePublicKeyJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
    deviceKeyThumbprint: `sha256:${"A".repeat(43)}`,
    appVersion: "0.7.0",
    idempotencyKey: crypto.randomUUID(),
  };
  assert.doesNotThrow(() => assertLicenseApiRequestHasNoEducationalData(safeRequest));
  assert.throws(
    () => assertLicenseApiRequestHasNoEducationalData({
      ...safeRequest,
      metadata: { studentName: "yasak-alan" },
    }),
    /eğitimsel veya çocuk verisi taşıyamaz/,
  );
});

test("kod ve deneme istekleri exact şema, gerçek P-256 parmak izi ve idempotency ister", async () => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );
  const devicePublicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const deviceKeyThumbprint = await premiumDeviceKeyThumbprint(devicePublicKeyJwk);
  const idempotencyKey = crypto.randomUUID();
  const challenge = {
    challengeId: crypto.randomUUID(),
    nonce: "A".repeat(43),
    purpose: "redeem-code",
    deviceKeyThumbprint,
    expiresAtUtc: "2026-09-01T06:05:00.000Z",
  };
  const proof = await createPremiumChallengeProof({
    identity: {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicJwk: devicePublicKeyJwk,
      thumbprint: deviceKeyThumbprint,
      createdAtUtc: "2026-09-01T06:00:00.000Z",
    },
    challenge,
    idempotencyKey,
    now: new Date("2026-09-01T06:01:00.000Z"),
  });
  assert.equal(
    await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      keyPair.publicKey,
      Buffer.from(proof.proofSignature, "base64url"),
      new TextEncoder().encode(premiumChallengeSigningPayload(challenge, idempotencyKey)),
    ),
    true,
  );
  const technicalFields = {
    ...proof,
    devicePublicKeyJwk,
    deviceKeyThumbprint,
    appVersion: "0.7.0",
    idempotencyKey,
  };
  const codeRequest = await validatePremiumCodeRedeemRequest({
    code: "MRF-7K3M-P9XD-4WQH-8T2N-R6CV-JY5B-Z",
    ...technicalFields,
  });
  assert.equal(codeRequest.deviceKeyThumbprint, deviceKeyThumbprint);
  const trialRequest = await validatePremiumTrialActivationRequest({
    sku: "TYMM-6072",
    academicRelease: "2026-2027",
    ...technicalFields,
  });
  assert.equal(trialRequest.academicRelease, "2026-2027");

  await assert.rejects(
    validatePremiumCodeRedeemRequest({
      code: "MRF-7K3M-P9XD-4WQH-8T2N-R6CV-JY5B-Z",
      ...technicalFields,
      classroomId: "yasak",
    }),
    /eğitimsel veya çocuk verisi taşıyamaz/,
  );
  await assert.rejects(
    validatePremiumCodeRedeemRequest({
      code: "MRF-7K3M-P9XD-4WQH-8T2N-R6CV-JY5B-Z",
      ...technicalFields,
      deviceKeyThumbprint: `sha256:${"B".repeat(43)}`,
    }),
    /uyuşmuyor/,
  );
  await assert.rejects(
    validatePremiumTrialActivationRequest({
      sku: "TYMM-6072",
      academicRelease: "2026-2027",
      ...technicalFields,
      unexpected: true,
    }),
    /beklenmeyen veya eksik alan/,
  );
  await assert.rejects(
    createPremiumChallengeProof({
      identity: {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        publicJwk: devicePublicKeyJwk,
        thumbprint: deviceKeyThumbprint,
        createdAtUtc: "2026-09-01T06:00:00.000Z",
      },
      challenge,
      idempotencyKey,
      now: new Date(challenge.expiresAtUtc),
    }),
    /süresi dolmuş/,
  );
});

test("doğrulanmış erişim ekran açık kalsa da exact paket ve karar süresi dışında kullanılamaz", async () => {
  const content = await pack();
  const fixture = await createSignedEntitlementFixture(content);
  const access = await verifyPremiumEntitlement(fixture);
  assert.doesNotThrow(() =>
    assertPremiumPackActionAccess(access, content, "content", fixture.now),
  );
  assert.throws(
    () => assertPremiumPackActionAccess(
      access,
      { ...content, contentReleaseId: "tymm-6072-2026-09-v3" },
      "content",
      fixture.now,
    ),
    /yalnız doğrulanan paket/,
  );
  assert.throws(
    () => assertPremiumPackActionAccess(
      access,
      content,
      "export",
      new Date((fixture.claims.offline_until + 1) * 1000),
    ),
    /süresi dolmuş veya çevrimiçi yenileme gerekiyor/,
  );
});
