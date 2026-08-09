import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PremiumFounderActivationError,
  activatePremiumFounderAccess,
  loadStoredPremiumFounderAccess,
  premiumFounderActivationErrorPresentation,
  resetPremiumFounderLocalLicenseAccess,
} from "../../src/features/premium-access/founder-client.ts";
import {
  getOrCreatePremiumDeviceIdentity,
  premiumDeviceKeyThumbprint,
} from "../../src/features/premium-access/device-identity.ts";
import { assertLicenseApiRequestHasNoEducationalData } from "../../src/features/premium-access/entitlement.ts";
import { PremiumLicenseStorageError } from "../../src/features/premium-access/license-store.ts";
import {
  validatePremiumCodeRedeemRequest,
  validatePremiumFounderRedeemRequest,
} from "../../src/features/premium-access/license-requests.ts";
import { parsePremiumContentPack } from "../../src/features/premium-plans/content-repository.ts";
import { createSignedEntitlementFixture } from "../helpers/premium-entitlement.mjs";

const NOW = new Date("2026-09-08T08:00:00.000Z");
const FOUNDER_PIN = "654321";
const IDEMPOTENCY_KEY = "10000000-0000-4000-8000-000000000002";
const CHALLENGE_ID = "10000000-0000-4000-8000-000000000001";

class MemoryDeviceIdentityStore {
  constructor(record = null) {
    this.record = record;
    this.reopenCount = 0;
  }

  async load() {
    return this.record ? this.copy(this.record) : null;
  }

  async createIfAbsent(record) {
    if (!this.record) {
      this.record = {
        id: "active-device",
        publicKey: record.publicKey,
        privateKey: record.privateKey,
        publicJwk: structuredClone(record.publicJwk),
        thumbprint: record.thumbprint,
        createdAtUtc: record.createdAtUtc,
      };
    }
    return this.copy(this.record);
  }

  async clear() {
    this.record = null;
  }

  async reopen() {
    this.reopenCount += 1;
  }

  copy(record) {
    return {
      id: record.id,
      publicKey: record.publicKey,
      privateKey: record.privateKey,
      publicJwk: structuredClone(record.publicJwk),
      thumbprint: record.thumbprint,
      createdAtUtc: record.createdAtUtc,
    };
  }

  close() {}
}

class MemoryEntitlementStore {
  record = null;
  clearCount = 0;

  async load() {
    return this.record ? structuredClone(this.record) : null;
  }

  async save(record) {
    this.record = { id: "active", ...structuredClone(record) };
  }

  async updateMaxObservedWallClock(now) {
    if (!this.record) return;
    const current = new Date(this.record.maxObservedWallClockUtc);
    this.record.maxObservedWallClockUtc = new Date(
      Math.max(current.getTime(), now.getTime()),
    ).toISOString();
  }

  async clear() {
    this.clearCount += 1;
    this.record = null;
  }

  close() {}
}

class MemoryContentBundleStore {
  record = null;
  clearCount = 0;

  async load() {
    return this.record ? structuredClone(this.record) : null;
  }

  async save(record) {
    this.record = { id: "active", ...structuredClone(record) };
  }

  async clear() {
    this.clearCount += 1;
    this.record = null;
  }

  close() {}
}

async function contentFixture() {
  const contentJson = await readFile(
    new URL("../../../premium-content/releases/tymm-6072/2026-09/content.v3.json", import.meta.url),
    "utf8",
  );
  const contentBytes = new TextEncoder().encode(contentJson);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", contentBytes));
  const contentSha256 = `sha256:${Buffer.from(digest).toString("hex")}`;
  return {
    contentJson,
    contentByteLength: contentBytes.byteLength,
    contentSha256,
    pack: parsePremiumContentPack(JSON.parse(contentJson)),
  };
}

async function deviceIdentityRecord() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return {
    id: "active-device",
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicJwk,
    thumbprint: await premiumDeviceKeyThumbprint(publicJwk),
    createdAtUtc: NOW.toISOString(),
  };
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function harness(options = {}) {
  const content = await contentFixture();
  const identity = await deviceIdentityRecord();
  const deviceIdentityStore = new MemoryDeviceIdentityStore(identity);
  const entitlementStore = new MemoryEntitlementStore();
  const contentBundleStore = new MemoryContentBundleStore();
  const signed = await createSignedEntitlementFixture(content.pack, {
    accessMode: "staff-code",
    now: NOW,
    claimOverrides: {
      device_key_thumbprint: options.entitlementDeviceThumbprint ?? identity.thumbprint,
    },
    grantOverrides: options.grantOverrides,
  });
  let entitlementToken = signed.token;
  if (options.tamperSignature) {
    const segments = entitlementToken.split(".");
    const signature = Buffer.from(segments[2], "base64url");
    signature[0] ^= 1;
    entitlementToken = `${segments[0]}.${segments[1]}.${signature.toString("base64url")}`;
  }
  const configuration = {
    apiOrigin: options.apiOrigin ?? "https://license.maarifos.example",
    trustedKeys: signed.trustedKeys,
    expectedIssuer: signed.expectedIssuer,
    expectedAudience: signed.expectedAudience,
    expectedPack: {
      sku: content.pack.sku,
      contentReleaseId: content.pack.contentReleaseId,
      id: content.pack.id,
      version: content.pack.version,
      manifestDigest: content.pack.manifestDigest,
      academicRelease: content.pack.academicRelease,
    },
  };
  const requests = [];
  const fetcher = async (request, init = {}) => {
    const url = new URL(String(request));
    const body = JSON.parse(String(init.body));
    requests.push({ url, body, headers: new Headers(init.headers), init });
    if (url.pathname === "/v1/device/challenge") {
      return jsonResponse({
        challengeId: CHALLENGE_ID,
        nonce: "A".repeat(43),
        purpose: "redeem-code",
        deviceKeyThumbprint: identity.thumbprint,
        expiresAtUtc: new Date(NOW.getTime() + 5 * 60 * 1000).toISOString(),
      });
    }
    if (url.pathname === "/v1/founder/redeem") {
      const response = {
        entitlementToken,
        contentBundle: {
          schemaVersion: 1,
          contentReleaseId: content.pack.contentReleaseId,
          contentPackId: content.pack.id,
          contentPackVersion: content.pack.version,
          manifestDigest: content.pack.manifestDigest,
          sku: content.pack.sku,
          academicRelease: content.pack.academicRelease,
          contentSha256: content.contentSha256,
          contentByteLength: content.contentByteLength,
          contentJson: content.contentJson,
        },
      };
      return jsonResponse(options.mutateRedeemResponse?.(response) ?? response);
    }
    return jsonResponse({ error: "request_rejected", requestId: "unknown-path" }, 404);
  };
  return {
    configuration,
    content,
    identity,
    deviceIdentityStore,
    entitlementStore,
    contentBundleStore,
    fetcher,
    requests,
  };
}

function activationInput(subject, overrides = {}) {
  return {
    code: FOUNDER_PIN,
    appVersion: "0.9.1",
    configuration: subject.configuration,
    fetcher: subject.fetcher,
    deviceIdentityStore: subject.deviceIdentityStore,
    entitlementStore: subject.entitlementStore,
    contentBundleStore: subject.contentBundleStore,
    now: () => new Date(NOW),
    createIdempotencyKey: () => IDEMPOTENCY_KEY,
    ...overrides,
  };
}

function activationFailure(phase, failure) {
  return (error) => {
    assert.ok(error instanceof PremiumFounderActivationError);
    assert.equal(error.phase, phase);
    assert.equal(error.failure, failure);
    return true;
  };
}

test("altı haneli kurucu PIN'i yalnız transit olur; entitlement ve ayrı içerik cache'ine yazılmaz", async () => {
  const subject = await harness();
  const result = await activatePremiumFounderAccess(activationInput(subject));

  assert.equal(result.access.status, "active");
  assert.equal(result.access.grant.accessMode, "staff-code");
  assert.equal(subject.requests.length, 2);
  assert.equal(subject.requests[0].url.pathname, "/v1/device/challenge");
  assert.equal(subject.requests[1].url.pathname, "/v1/founder/redeem");
  assert.equal(subject.requests[1].headers.get("Idempotency-Key"), IDEMPOTENCY_KEY);
  assert.equal(subject.requests[1].body.code, FOUNDER_PIN);
  assert.equal("code" in subject.entitlementStore.record, false);
  assert.equal("code" in subject.contentBundleStore.record, false);
  assert.equal(
    Object.values(subject.entitlementStore.record).includes(FOUNDER_PIN),
    false,
  );
  assert.equal(
    Object.values(subject.contentBundleStore.record).includes(FOUNDER_PIN),
    false,
  );
});

test("kurucu success yanıtındaki bilinmeyen alan exact şema tarafından reddedilir", async () => {
  const subject = await harness({
    mutateRedeemResponse: (response) => ({ ...response, debug: true }),
  });
  await assert.rejects(
    activatePremiumFounderAccess(activationInput(subject)),
    activationFailure("redeem", "response-invalid"),
  );
  assert.equal(subject.entitlementStore.record, null);
  assert.equal(subject.contentBundleStore.record, null);
});

test("API hedefi kullanıcı girdili path/query veya güvensiz HTTP origin olamaz", async () => {
  for (const apiOrigin of [
    "https://license.maarifos.example/user-selected",
    "https://license.maarifos.example?target=https://evil.example",
    "http://license.maarifos.example",
  ]) {
    const subject = await harness({ apiOrigin });
    let fetched = false;
    await assert.rejects(
      activatePremiumFounderAccess(activationInput(subject, {
        fetcher: async () => {
          fetched = true;
          throw new Error("çağrılmamalı");
        },
      })),
      activationFailure("configuration", "configuration-invalid"),
    );
    assert.equal(fetched, false);
  }
});

test("kurcalanmış imza, başka cihaz entitlement'ı ve yanlış release fail-closed kalır", async (context) => {
  await context.test("kurcalanmış imza", async () => {
    const subject = await harness({ tamperSignature: true });
    await assert.rejects(
      activatePremiumFounderAccess(activationInput(subject)),
      activationFailure("verify", "verification-failed"),
    );
    assert.equal(subject.entitlementStore.record, null);
  });

  await context.test("başka cihaz", async () => {
    const subject = await harness({
      entitlementDeviceThumbprint: `sha256:${"B".repeat(43)}`,
    });
    await assert.rejects(
      activatePremiumFounderAccess(activationInput(subject)),
      activationFailure("verify", "verification-failed"),
    );
    assert.equal(subject.entitlementStore.record, null);
  });

  await context.test("yanlış release grant'i", async () => {
    const subject = await harness({
      grantOverrides: { content_pack_version: "9.9.9" },
    });
    await assert.rejects(
      activatePremiumFounderAccess(activationInput(subject)),
      activationFailure("verify", "verification-failed"),
    );
    assert.equal(subject.entitlementStore.record, null);
  });
});

test("geçerli STAFF entitlement ve pack çevrimdışıyken cache'den doğrulanarak açılır", async () => {
  const subject = await harness();
  await activatePremiumFounderAccess(activationInput(subject));
  const callsBeforeOfflineLoad = subject.requests.length;

  const loaded = await loadStoredPremiumFounderAccess({
    configuration: subject.configuration,
    fetcher: async () => {
      throw new Error("çevrimdışıyken ağ çağrısı yapılamaz");
    },
    deviceIdentityStore: subject.deviceIdentityStore,
    entitlementStore: subject.entitlementStore,
    contentBundleStore: subject.contentBundleStore,
    now: () => new Date(NOW.getTime() + 60_000),
  });

  assert.ok(loaded);
  assert.equal(loaded.access.status, "active");
  assert.equal(loaded.access.grant.accessMode, "staff-code");
  assert.equal(loaded.pack.contentReleaseId, subject.content.pack.contentReleaseId);
  assert.equal(subject.requests.length, callsBeforeOfflineLoad);
});

test("bozuk premium içerik cache'i erişimi açmaz ve entitlement ile birlikte temizlenir", async () => {
  const subject = await harness();
  await activatePremiumFounderAccess(activationInput(subject));
  subject.contentBundleStore.record.contentJson += " ";
  const tamperedBytes = new TextEncoder().encode(subject.contentBundleStore.record.contentJson);
  const tamperedDigest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", tamperedBytes),
  );
  subject.contentBundleStore.record.contentByteLength = tamperedBytes.byteLength;
  subject.contentBundleStore.record.contentSha256 =
    `sha256:${Buffer.from(tamperedDigest).toString("hex")}`;

  await assert.rejects(
    loadStoredPremiumFounderAccess({
      configuration: subject.configuration,
      deviceIdentityStore: subject.deviceIdentityStore,
      entitlementStore: subject.entitlementStore,
      contentBundleStore: subject.contentBundleStore,
      now: () => new Date(NOW.getTime() + 60_000),
    }),
    activationFailure("verify", "verification-failed"),
  );
  assert.equal(subject.entitlementStore.record, null);
  assert.equal(subject.contentBundleStore.record, null);
  assert.ok(subject.entitlementStore.clearCount > 0);
  assert.ok(subject.contentBundleStore.clearCount > 0);
});

test("yeni cihaz anahtarı kalıcı depodan yeniden açılır ve challenge öncesi öz sınamayı geçer", async () => {
  const store = new MemoryDeviceIdentityStore();
  const identity = await getOrCreatePremiumDeviceIdentity(store, NOW);
  assert.equal(store.reopenCount, 1);
  assert.equal(identity.thumbprint, store.record.thumbprint);

  const message = new TextEncoder().encode("premium-founder-roundtrip");
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    identity.privateKey,
    message,
  );
  assert.equal(await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    identity.publicKey,
    signature,
    message,
  ), true);
});

test("cihaz deposu blocked hatası challenge göndermeden typed recovery üretir", async () => {
  const subject = await harness();
  const blockedStore = {
    async load() {
      throw new PremiumLicenseStorageError(
        "open-blocked",
        "Kurgu blocked lisans deposu.",
      );
    },
    async createIfAbsent() {
      throw new Error("çağrılmamalı");
    },
    async clear() {},
    close() {},
  };
  await assert.rejects(
    activatePremiumFounderAccess(activationInput(subject, {
      deviceIdentityStore: blockedStore,
    })),
    (error) => {
      assert.ok(activationFailure("device-store", "storage-blocked")(error));
      assert.equal(error.recovery, "close-other-tabs");
      return true;
    },
  );
  assert.equal(subject.requests.length, 0);
});

test("kullanılamayan kalıcı CryptoKey challenge öncesi device-key recovery'ye düşer", async () => {
  const subject = await harness();
  subject.deviceIdentityStore.record.privateKey = subject.identity.publicKey;
  await assert.rejects(
    activatePremiumFounderAccess(activationInput(subject)),
    (error) => {
      assert.ok(activationFailure("device-key", "device-key-unavailable")(error));
      assert.equal(error.recovery, "reset-local-license");
      return true;
    },
  );
  assert.equal(subject.requests.length, 0);
});

test("fetch timeout AbortController ile kesilir ve kodu hata metnine taşımaz", async () => {
  const subject = await harness();
  let aborted = false;
  const fetcher = async (_request, init = {}) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => {
      aborted = true;
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
  await assert.rejects(
    activatePremiumFounderAccess(activationInput(subject, {
      fetcher,
      requestTimeoutMs: 5,
    })),
    (error) => {
      assert.ok(activationFailure("network", "network-timeout")(error));
      assert.equal(error.message.includes(FOUNDER_PIN), false);
      return true;
    },
  );
  assert.equal(aborted, true);
});

test("generic redeem reddi yalnız güvenli destek kodunu taşır ve slot/kod nedeni açıklamaz", async () => {
  const subject = await harness();
  const requestId = "20000000-0000-4000-8000-000000000009";
  const fetcher = async (request, init) => {
    const url = new URL(String(request));
    if (url.pathname === "/v1/founder/redeem") {
      return jsonResponse({ error: "request_rejected", requestId }, 403);
    }
    return subject.fetcher(request, init);
  };
  await assert.rejects(
    activatePremiumFounderAccess(activationInput(subject, { fetcher })),
    (error) => {
      assert.ok(activationFailure("redeem", "request-rejected")(error));
      const presentation = premiumFounderActivationErrorPresentation(error);
      assert.equal(presentation.supportCode, requestId);
      assert.equal(JSON.stringify(presentation).includes(FOUNDER_PIN), false);
      assert.equal(presentation.recovery, "contact-support");
      return true;
    },
  );
});

test("yeniden etkinleştirme save hatası önceki doğrulanmış entitlement ve içeriği silmez", async () => {
  const subject = await harness();
  await activatePremiumFounderAccess(activationInput(subject));
  const previousEntitlement = structuredClone(subject.entitlementStore.record);
  const previousContent = structuredClone(subject.contentBundleStore.record);
  subject.entitlementStore.save = async () => {
    throw new PremiumLicenseStorageError(
      "operation-failed",
      "Kurgu entitlement yazma hatası.",
    );
  };

  await assert.rejects(
    activatePremiumFounderAccess(activationInput(subject, {
      now: () => new Date(NOW.getTime() + 1_000),
    })),
    activationFailure("store", "store-failed"),
  );
  assert.deepEqual(subject.entitlementStore.record, previousEntitlement);
  assert.equal(subject.entitlementStore.clearCount, 0);
  assert.equal(subject.contentBundleStore.clearCount, 0);
  assert.equal(subject.contentBundleStore.record.contentJson, previousContent.contentJson);

  const loaded = await loadStoredPremiumFounderAccess({
    configuration: subject.configuration,
    deviceIdentityStore: subject.deviceIdentityStore,
    entitlementStore: subject.entitlementStore,
    contentBundleStore: subject.contentBundleStore,
    now: () => new Date(NOW.getTime() + 2_000),
  });
  assert.equal(loaded.access.status, "active");
});

test("max wall-clock güncelleme hatası erişimi fail-closed bırakır ama eski kaydı silmez", async () => {
  const subject = await harness();
  await activatePremiumFounderAccess(activationInput(subject));
  const previousEntitlement = structuredClone(subject.entitlementStore.record);
  const previousContent = structuredClone(subject.contentBundleStore.record);
  subject.entitlementStore.updateMaxObservedWallClock = async () => {
    throw new PremiumLicenseStorageError(
      "operation-failed",
      "Kurgu wall-clock yazma hatası.",
    );
  };

  await assert.rejects(
    loadStoredPremiumFounderAccess({
      configuration: subject.configuration,
      deviceIdentityStore: subject.deviceIdentityStore,
      entitlementStore: subject.entitlementStore,
      contentBundleStore: subject.contentBundleStore,
      now: () => new Date(NOW.getTime() + 60_000),
    }),
    activationFailure("store", "store-failed"),
  );
  assert.deepEqual(subject.entitlementStore.record, previousEntitlement);
  assert.deepEqual(subject.contentBundleStore.record, previousContent);
  assert.equal(subject.entitlementStore.clearCount, 0);
  assert.equal(subject.contentBundleStore.clearCount, 0);
});

test("kontrollü local reset yalnız premium alanını temizler ve sunucu slotunu boşalttığını iddia etmez", async () => {
  const subject = await harness();
  await activatePremiumFounderAccess(activationInput(subject));
  const educationalDataSentinel = { classroom: "yerinde-kalır" };
  const result = await resetPremiumFounderLocalLicenseAccess({
    deviceIdentityStore: subject.deviceIdentityStore,
    entitlementStore: subject.entitlementStore,
    contentBundleStore: subject.contentBundleStore,
  });

  assert.deepEqual(result, {
    scope: "premium-license-only",
    educationalDataTouched: false,
    serverSlotReleased: false,
    newDeviceBindingRequired: true,
  });
  assert.equal(subject.deviceIdentityStore.record, null);
  assert.equal(subject.entitlementStore.record, null);
  assert.equal(subject.contentBundleStore.record, null);
  assert.deepEqual(educationalDataSentinel, { classroom: "yerinde-kalır" });
});

test("kurucu lisans istekleri yalnız teknik alan taşır ve ticari MRF kod biçimini gevşetmez", async () => {
  const subject = await harness();
  await activatePremiumFounderAccess({
    ...activationInput(subject),
    classroomId: "bu-alan-API-isteğine-girmemeli",
    studentName: "bu-alan-API-isteğine-girmemeli",
  });

  for (const { body } of subject.requests) {
    assert.doesNotThrow(() => assertLicenseApiRequestHasNoEducationalData(body));
    assert.equal("classroomId" in body, false);
    assert.equal("studentName" in body, false);
  }
  const founderRequest = subject.requests[1].body;
  assert.equal(
    (await validatePremiumFounderRedeemRequest(founderRequest)).code,
    FOUNDER_PIN,
  );
  await assert.rejects(
    validatePremiumCodeRedeemRequest(founderRequest),
    /Premium kod geçersiz/,
  );
  await assert.rejects(
    validatePremiumFounderRedeemRequest({
      ...founderRequest,
      code: "MRF-7K3M-P9XD-4WQH-8T2N-R6CV-JY5B-Z",
    }),
    /Kurucu erişim kodu geçersiz/,
  );
});
