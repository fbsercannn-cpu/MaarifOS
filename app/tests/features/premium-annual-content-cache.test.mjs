import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MemoryPremiumAnnualContentCacheStore,
  premiumMonthlyContentBundleRecordId,
} from "../../src/features/premium-access/content-bundle-store.ts";
import {
  PREMIUM_ANNUAL_RELEASE_VERIFICATION_SCHEME,
  PREMIUM_ANNUAL_RELEASE_JWS_TYPE,
  createCurrentPremiumAnnualRelease2026_2027Payload,
  premiumAnnualReleaseAnchor,
  serializePremiumAnnualReleaseSetPayload,
  verifyPremiumAnnualReleaseSetJws,
} from "../../src/features/premium-plans/annual-release-manifest.ts";
import {
  clearStoredPremiumFounderAccess,
  resetPremiumFounderDevice,
} from "../../src/features/premium-access/founder-client.ts";
import {
  PREMIUM_VALUES_V3_RELEASE_IDENTITY,
} from "../../src/features/premium-plans/content-repository.ts";

const ISSUER = "https://content.maarifos.test";
const AUDIENCE = "maarifos-premium-content";
const COMMITTED_AT = "2026-08-09T12:00:00.000Z";
const KID = "annual-cache-test-2026";

const keyPair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") return value.normalize("NFC");
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
  );
}

function base64Url(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
}

async function signRelease(payload, options = {}) {
  const header = {
    alg: "ES256",
    kid: options.kid ?? KID,
    typ: PREMIUM_ANNUAL_RELEASE_JWS_TYPE,
  };
  const headerSegment = base64Url(JSON.stringify(canonical(header)));
  const payloadSegment = base64Url(JSON.stringify(canonical(payload)));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    options.privateKey ?? keyPair.privateKey,
    new TextEncoder().encode(signingInput),
  ));
  return `${signingInput}.${base64Url(signature)}`;
}

async function sha256Text(value) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return `sha256:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function verifiedRelease(payload, previous) {
  return verifyPremiumAnnualReleaseSetJws(
    await signRelease(payload),
    {
      trustedKeys: { [KID]: publicJwk },
      expectedIssuer: ISSUER,
      expectedAudience: AUDIENCE,
      expectedReleaseSetId: "tymm-6072-2026-2027-annual-release-set",
      expectedSku: PREMIUM_VALUES_V3_RELEASE_IDENTITY.sku,
      expectedAcademicRelease: PREMIUM_VALUES_V3_RELEASE_IDENTITY.academicRelease,
      ...(previous === undefined ? {} : { previous }),
    },
  );
}

function anchorFor(release) {
  return premiumAnnualReleaseAnchor(release);
}

function basePayload() {
  return structuredClone(createCurrentPremiumAnnualRelease2026_2027Payload({
    issuer: ISSUER,
    audience: AUDIENCE,
    issuedAtUtc: "2026-08-09T00:00:00.000Z",
  }));
}

async function septemberBundle() {
  const contentJson = await readFile(
    new URL(
      "../../../premium-content/releases/tymm-6072/2026-09/content.v3.json",
      import.meta.url,
    ),
    "utf8",
  );
  return {
    monthKey: "2026-09",
    schemaVersion: 1,
    contentReleaseId: PREMIUM_VALUES_V3_RELEASE_IDENTITY.contentReleaseId,
    contentPackId: PREMIUM_VALUES_V3_RELEASE_IDENTITY.id,
    contentPackVersion: PREMIUM_VALUES_V3_RELEASE_IDENTITY.version,
    manifestDigest: PREMIUM_VALUES_V3_RELEASE_IDENTITY.manifestDigest,
    sku: PREMIUM_VALUES_V3_RELEASE_IDENTITY.sku,
    academicRelease: PREMIUM_VALUES_V3_RELEASE_IDENTITY.academicRelease,
    contentSha256: await sha256Text(contentJson),
    contentByteLength: new TextEncoder().encode(contentJson).byteLength,
    contentJson,
    savedAtUtc: "2026-08-09T10:00:00.000Z",
  };
}

async function syntheticBundle(monthKey, sequence) {
  const contentJson = JSON.stringify({
    schemaVersion: 1,
    monthKey,
    sequence,
    title: `${monthKey} insan incelemesinden geçmiş içerik fixture'ı`,
  });
  const manifestJson = JSON.stringify({ monthKey, sequence, kind: "manifest" });
  return {
    monthKey,
    schemaVersion: 1,
    contentReleaseId: `tymm-6072-${monthKey}-v${sequence}`,
    contentPackId: `maarifos-tymm-6072-${monthKey}-v${sequence}`,
    contentPackVersion: `${sequence}.0.0`,
    manifestDigest: await sha256Text(manifestJson),
    manifestByteLength: new TextEncoder().encode(manifestJson).byteLength,
    sku: PREMIUM_VALUES_V3_RELEASE_IDENTITY.sku,
    academicRelease: PREMIUM_VALUES_V3_RELEASE_IDENTITY.academicRelease,
    contentSha256: await sha256Text(contentJson),
    contentByteLength: new TextEncoder().encode(contentJson).byteLength,
    contentJson,
    savedAtUtc: "2026-08-09T10:30:00.000Z",
  };
}

function publishedSlot(bundle) {
  return {
    monthKey: bundle.monthKey,
    state: "published",
    pack: {
      contentPackId: bundle.contentPackId,
      contentPackVersion: bundle.contentPackVersion,
      contentReleaseId: bundle.contentReleaseId,
      reviewStatus: "machine_validated_pending_human_review",
      content: {
        path: `premium-content/releases/tymm-6072/${bundle.monthKey}/content.v${bundle.contentPackVersion.split(".")[0]}.json`,
        sha256: bundle.contentSha256,
        byteLength: bundle.contentByteLength,
      },
      manifest: {
        path: `premium-content/releases/tymm-6072/${bundle.monthKey}/manifest.v${bundle.contentPackVersion.split(".")[0]}.json`,
        sha256: bundle.manifestDigest,
        byteLength: bundle.manifestByteLength ?? 1_911,
      },
    },
  };
}

async function revisionTwo(revisionOne, october) {
  const payload = basePayload();
  payload.revision = 2;
  payload.predecessor = anchorFor(revisionOne);
  payload.issuedAtUtc = "2026-08-10T00:00:00.000Z";
  payload.slots[1] = publishedSlot(october);
  return verifiedRelease(payload, anchorFor(revisionOne));
}

function cacheBundleInput(bundle) {
  const { manifestByteLength: _manifestByteLength, ...input } = bundle;
  return input;
}

function referenceFor(bundle) {
  return {
    monthKey: bundle.monthKey,
    contentReleaseId: bundle.contentReleaseId,
    contentPackId: bundle.contentPackId,
    contentPackVersion: bundle.contentPackVersion,
    manifestDigest: bundle.manifestDigest,
    sku: bundle.sku,
    academicRelease: bundle.academicRelease,
    contentSha256: bundle.contentSha256,
    contentByteLength: bundle.contentByteLength,
  };
}

test("v1 legacy active Eylül kaydı byte'ları yeniden yazılmadan yıllık sette okunur", async () => {
  const september = await septemberBundle();
  const { monthKey: _monthKey, ...legacyPayload } = september;
  const legacy = { id: "active", ...legacyPayload };
  const store = new MemoryPremiumAnnualContentCacheStore(legacy);
  const releaseOne = await verifiedRelease(basePayload());

  const pointer = await store.commitVerifiedAnnualReleaseSet({
    releaseSet: releaseOne,
    bundles: [],
    committedAtUtc: COMMITTED_AT,
  });

  assert.equal(pointer.revision, 1);
  assert.deepEqual(pointer.slots[0], {
    monthKey: "2026-09",
    state: "published",
    bundleSource: "legacy-active",
    bundleRecordId: "legacy:active",
  });
  assert.equal((await store.listMonthlyContentBundles()).length, 0);
  const loaded = await store.loadActiveAnnualContentCache();
  assert.equal(loaded.bundles.length, 1);
  assert.equal(loaded.bundles[0].source, "legacy-active");
  assert.equal(loaded.bundles[0].record.contentJson, september.contentJson);
  assert.equal(loaded.releaseSet.compactJws, releaseOne.compactJws);
  assert.deepEqual(loaded.releaseSet.verification, releaseOne.verification);
  assert.deepEqual(await store.load(), legacy);
});

test("self-hash, kid ve issuer uyduran yapısal verified nesnesi cache commit sınırını aşamaz", async () => {
  const store = new MemoryPremiumAnnualContentCacheStore();
  const valid = await verifiedRelease(basePayload());
  const forgedPayload = basePayload();
  forgedPayload.iss = "https://attacker.maarifos.test";
  const forgedPayloadText = serializePremiumAnnualReleaseSetPayload(forgedPayload);
  const forged = {
    ...valid,
    compactJws: await signRelease(forgedPayload, { kid: "attacker-controlled-kid" }),
    header: {
      alg: "ES256",
      kid: "attacker-controlled-kid",
      typ: PREMIUM_ANNUAL_RELEASE_JWS_TYPE,
    },
    payload: JSON.parse(forgedPayloadText),
    payloadSha256: await sha256Text(forgedPayloadText),
    verification: {
      scheme: PREMIUM_ANNUAL_RELEASE_VERIFICATION_SCHEME,
      trustedKeyId: "attacker-controlled-kid",
      issuer: forgedPayload.iss,
      audience: forgedPayload.aud,
      releaseSetId: forgedPayload.releaseSetId,
      sku: forgedPayload.sku,
      academicRelease: forgedPayload.academicRelease,
    },
  };

  await assert.rejects(
    store.commitVerifiedAnnualReleaseSet({
      releaseSet: forged,
      bundles: [],
      committedAtUtc: COMMITTED_AT,
    }),
    /yalnız güvenilir ES256 doğrulayıcısının opak çıktısından/i,
  );
  assert.equal(await store.loadActiveAnnualContentCache(), null);
});

test("başarısız Ekim staging işlemi aktif Eylül çevrimdışı önbelleğini ve pointer'ını korur", async () => {
  const store = new MemoryPremiumAnnualContentCacheStore();
  const september = await septemberBundle();
  const releaseOne = await verifiedRelease(basePayload());
  await store.commitVerifiedAnnualReleaseSet({
    releaseSet: releaseOne,
    bundles: [cacheBundleInput(september)],
    committedAtUtc: COMMITTED_AT,
  });
  const october = await syntheticBundle("2026-10", 1);
  const releaseTwo = await revisionTwo(releaseOne, october);
  const tamperedOctober = {
    ...cacheBundleInput(october),
    contentJson: `${october.contentJson} `,
  };

  await assert.rejects(
    store.commitVerifiedAnnualReleaseSet({
      releaseSet: releaseTwo,
      bundles: [tamperedOctober],
      committedAtUtc: "2026-08-10T12:00:00.000Z",
    }),
    /bayt\/özet zinciri uyuşmuyor/i,
  );

  const loaded = await store.loadActiveAnnualContentCache();
  assert.equal(loaded.pointer.revision, 1);
  assert.deepEqual(loaded.bundles.map((entry) => entry.monthKey), ["2026-09"]);
  assert.equal(loaded.bundles[0].record.contentJson, september.contentJson);
  assert.equal((await store.listMonthlyContentBundles()).length, 1);
});

test("aynı release ID için farklı yıllık payload veya aylık digest/byte equivocation reddedilir", async (t) => {
  const store = new MemoryPremiumAnnualContentCacheStore();
  const september = await septemberBundle();
  const releaseOne = await verifiedRelease(basePayload());
  await store.commitVerifiedAnnualReleaseSet({
    releaseSet: releaseOne,
    bundles: [cacheBundleInput(september)],
    committedAtUtc: COMMITTED_AT,
  });

  await t.test("aynı annual revision farklı payload", async () => {
    const equivocatedPayload = basePayload();
    equivocatedPayload.issuedAtUtc = "2026-08-09T00:00:01.000Z";
    await assert.rejects(
      store.commitVerifiedAnnualReleaseSet({
        releaseSet: await verifiedRelease(equivocatedPayload),
        bundles: [],
        committedAtUtc: "2026-08-09T12:01:00.000Z",
      }),
      /aynı yıllık yayın revizyonu farklı payload/i,
    );
  });

  await t.test("aynı contentReleaseId farklı payload", async () => {
    const forged = await syntheticBundle("2026-09", 9);
    forged.contentReleaseId = september.contentReleaseId;
    forged.contentPackId = september.contentPackId;
    forged.contentPackVersion = september.contentPackVersion;
    forged.manifestDigest = september.manifestDigest;
    const payload = basePayload();
    payload.revision = 2;
    payload.predecessor = anchorFor(releaseOne);
    payload.issuedAtUtc = "2026-08-10T00:00:00.000Z";
    payload.slots[0] = publishedSlot(forged);
    await assert.rejects(
      store.commitVerifiedAnnualReleaseSet({
        releaseSet: await verifiedRelease(payload, anchorFor(releaseOne)),
        bundles: [cacheBundleInput(forged)],
        committedAtUtc: "2026-08-10T12:00:00.000Z",
      }),
      /aynı aylık content release ID farklı digest veya baytlarla/i,
    );
  });
});

test("saklanan ankraja karşı rollback ve revizyon atlaması fail-closed reddedilir", async () => {
  const store = new MemoryPremiumAnnualContentCacheStore();
  const september = await septemberBundle();
  const october = await syntheticBundle("2026-10", 1);
  const releaseOne = await verifiedRelease(basePayload());
  const releaseTwo = await revisionTwo(releaseOne, october);
  await store.commitVerifiedAnnualReleaseSet({
    releaseSet: releaseOne,
    bundles: [cacheBundleInput(september)],
    committedAtUtc: COMMITTED_AT,
  });
  await store.commitVerifiedAnnualReleaseSet({
    releaseSet: releaseTwo,
    bundles: [cacheBundleInput(october)],
    committedAtUtc: "2026-08-10T12:00:00.000Z",
  });

  await assert.rejects(
    store.commitVerifiedAnnualReleaseSet({
      releaseSet: releaseOne,
      bundles: [],
      committedAtUtc: "2026-08-11T12:00:00.000Z",
    }),
    /rollback/i,
  );
  const active = await store.loadActiveAnnualContentCache();
  assert.equal(active.pointer.revision, 2);
});

test("birden çok immutable aylık bundle birlikte kalır; aktif setten çıkan eski bundle sessizce silinmez", async () => {
  const store = new MemoryPremiumAnnualContentCacheStore();
  const september = await septemberBundle();
  const octoberOne = await syntheticBundle("2026-10", 1);
  const octoberTwo = await syntheticBundle("2026-10", 2);
  const releaseOne = await verifiedRelease(basePayload());
  const releaseTwo = await revisionTwo(releaseOne, octoberOne);
  await store.commitVerifiedAnnualReleaseSet({
    releaseSet: releaseOne,
    bundles: [cacheBundleInput(september)],
    committedAtUtc: COMMITTED_AT,
  });
  await store.commitVerifiedAnnualReleaseSet({
    releaseSet: releaseTwo,
    bundles: [cacheBundleInput(octoberOne)],
    committedAtUtc: "2026-08-10T12:00:00.000Z",
  });

  const revisionThreePayload = structuredClone(releaseTwo.payload);
  revisionThreePayload.revision = 3;
  revisionThreePayload.predecessor = anchorFor(releaseTwo);
  revisionThreePayload.issuedAtUtc = "2026-08-11T00:00:00.000Z";
  revisionThreePayload.slots[1] = publishedSlot(octoberTwo);
  const releaseThree = await verifiedRelease(
    revisionThreePayload,
    anchorFor(releaseTwo),
  );
  await store.commitVerifiedAnnualReleaseSet({
    releaseSet: releaseThree,
    bundles: [cacheBundleInput(octoberTwo)],
    committedAtUtc: "2026-08-11T12:00:00.000Z",
  });

  const cached = await store.listMonthlyContentBundles();
  assert.equal(cached.length, 3);
  assert.deepEqual(
    cached.map((bundle) => bundle.contentReleaseId).sort(),
    [
      september.contentReleaseId,
      octoberOne.contentReleaseId,
      octoberTwo.contentReleaseId,
    ].sort(),
  );
  assert.equal(
    (await store.loadMonthlyContentBundle(referenceFor(octoberOne))).contentJson,
    octoberOne.contentJson,
  );
  const active = await store.loadActiveAnnualContentCache();
  assert.equal(active.pointer.revision, 3);
  assert.equal(active.bundles.find((entry) => entry.monthKey === "2026-10").record.contentJson, octoberTwo.contentJson);
});

test("aktif pointer exact release-set kaydını ve her published ayın exact içerik kimliğini gösterir", async () => {
  const store = new MemoryPremiumAnnualContentCacheStore();
  const september = await septemberBundle();
  const october = await syntheticBundle("2026-10", 1);
  const releaseOne = await verifiedRelease(basePayload());
  const releaseTwo = await revisionTwo(releaseOne, october);
  await store.commitVerifiedAnnualReleaseSet({
    releaseSet: releaseOne,
    bundles: [cacheBundleInput(september)],
    committedAtUtc: COMMITTED_AT,
  });
  const pointer = await store.commitVerifiedAnnualReleaseSet({
    releaseSet: releaseTwo,
    bundles: [cacheBundleInput(october)],
    committedAtUtc: "2026-08-10T12:00:00.000Z",
  });
  const active = await store.loadActiveAnnualContentCache();

  assert.equal(pointer.releaseSetRecordId, active.releaseSet.id);
  assert.equal(pointer.releaseSetId, releaseTwo.payload.releaseSetId);
  assert.equal(pointer.revision, releaseTwo.payload.revision);
  assert.equal(pointer.payloadSha256, releaseTwo.payloadSha256);
  assert.equal(
    pointer.slots[0].bundleRecordId,
    premiumMonthlyContentBundleRecordId(referenceFor(september)),
  );
  assert.equal(
    pointer.slots[1].bundleRecordId,
    premiumMonthlyContentBundleRecordId(referenceFor(october)),
  );
  assert.ok(pointer.slots.slice(2).every((slot) => (
    slot.state === "unpublished" && slot.bundleSource === null && slot.bundleRecordId === null
  )));
  assert.deepEqual(active.bundles.map((entry) => entry.monthKey), ["2026-09", "2026-10"]);
});

test("founder clear ve device reset annual setleri, aylık bundle'ları ve aktif pointer'ı siler", async (t) => {
  async function committedStore() {
    const store = new MemoryPremiumAnnualContentCacheStore();
    const september = await septemberBundle();
    const releaseOne = await verifiedRelease(basePayload());
    await store.commitVerifiedAnnualReleaseSet({
      releaseSet: releaseOne,
      bundles: [cacheBundleInput(september)],
      committedAtUtc: COMMITTED_AT,
    });
    assert.ok(await store.loadActiveAnnualContentCache());
    return store;
  }

  await t.test("clearStoredPremiumFounderAccess", async () => {
    const store = await committedStore();
    const entitlementStore = {
      cleared: false,
      async clear() { this.cleared = true; },
      close() {},
    };
    await clearStoredPremiumFounderAccess({
      entitlementStore,
      contentBundleStore: store,
    });
    assert.equal(entitlementStore.cleared, true);
    assert.equal(await store.loadActiveAnnualContentCache(), null);
    assert.equal((await store.listMonthlyContentBundles()).length, 0);
    assert.equal(await store.load(), null);
  });

  await t.test("resetPremiumFounderDevice", async () => {
    const store = await committedStore();
    const entitlementStore = {
      cleared: false,
      async clear() { this.cleared = true; },
      close() {},
    };
    const deviceIdentityStore = {
      cleared: false,
      async clear() { this.cleared = true; },
      close() {},
    };
    await resetPremiumFounderDevice({
      deviceIdentityStore,
      entitlementStore,
      contentBundleStore: store,
    });
    assert.equal(entitlementStore.cleared, true);
    assert.equal(deviceIdentityStore.cleared, true);
    assert.equal(await store.loadActiveAnnualContentCache(), null);
    assert.equal((await store.listMonthlyContentBundles()).length, 0);
    assert.equal(await store.load(), null);
  });
});
