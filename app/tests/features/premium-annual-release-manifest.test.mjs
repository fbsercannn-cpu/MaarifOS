import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CURRENT_PREMIUM_ANNUAL_RELEASE_2026_2027_SLOTS,
  PREMIUM_ANNUAL_RELEASE_2026_2027_MONTH_KEYS,
  PREMIUM_ANNUAL_RELEASE_JWS_TYPE,
  createCurrentPremiumAnnualRelease2026_2027Payload,
  parsePremiumAnnualReleaseSetPayload,
  premiumAnnualReleaseAnchor,
  serializePremiumAnnualReleaseSetPayload,
  verifyPremiumAnnualReleaseSetJws,
} from "../../src/features/premium-plans/annual-release-manifest.ts";
import {
  PREMIUM_V3_PREVIEW_RELEASE_LOCK,
  PREMIUM_VALUES_V3_RELEASE_IDENTITY,
} from "../../src/features/premium-plans/content-repository.ts";

const ISSUER = "https://content.maarifos.test";
const AUDIENCE = "maarifos-premium-content";
const KID = "content-release-es256-test-2026";
const CREATED_AT = "2026-08-09T00:00:00.000Z";

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

async function signRawPayload(payload, options = {}) {
  const header = {
    alg: "ES256",
    kid: options.kid ?? KID,
    typ: PREMIUM_ANNUAL_RELEASE_JWS_TYPE,
    ...(options.headerOverrides ?? {}),
  };
  const headerSegment = base64Url(JSON.stringify(canonical(header)));
  const payloadSegment = base64Url(JSON.stringify(canonical(payload)));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    options.privateKey ?? keyPair.privateKey,
    new TextEncoder().encode(signingInput),
  ));
  assert.equal(signature.byteLength, 64);
  return `${signingInput}.${base64Url(signature)}`;
}

function basePayload() {
  return structuredClone(createCurrentPremiumAnnualRelease2026_2027Payload({
    issuer: ISSUER,
    audience: AUDIENCE,
    issuedAtUtc: CREATED_AT,
  }));
}

function verifyOptions(previous) {
  return {
    trustedKeys: { [KID]: publicJwk },
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    expectedReleaseSetId: "tymm-6072-2026-2027-annual-release-set",
    expectedSku: PREMIUM_VALUES_V3_RELEASE_IDENTITY.sku,
    expectedAcademicRelease: PREMIUM_VALUES_V3_RELEASE_IDENTITY.academicRelease,
    ...(previous === undefined ? {} : { previous }),
  };
}

function rawSha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

test("bugünkü yıllık referans yalnız exact Eylül v3'ü yayımlar ve gerçek bayt zincirini doğrular", async () => {
  const payload = basePayload();
  assert.deepEqual(
    payload.slots.map((slot) => slot.monthKey),
    PREMIUM_ANNUAL_RELEASE_2026_2027_MONTH_KEYS,
  );
  assert.equal(payload.slots.length, 10);
  assert.equal(payload.slots[0].state, "published");
  assert.equal(payload.slots[0].pack.contentPackId, PREMIUM_VALUES_V3_RELEASE_IDENTITY.id);
  assert.equal(payload.slots[0].pack.contentPackVersion, PREMIUM_VALUES_V3_RELEASE_IDENTITY.version);
  assert.equal(payload.slots[0].pack.contentReleaseId, PREMIUM_VALUES_V3_RELEASE_IDENTITY.contentReleaseId);
  assert.equal(payload.slots[0].pack.reviewStatus, "machine_validated_pending_human_review");
  assert.ok(payload.slots.slice(1).every((slot) => slot.state === "unpublished" && slot.pack === null));
  assert.equal("grants" in payload, false);
  assert.ok(payload.slots.slice(1).every((slot) => Object.keys(slot).length === 3));
  assert.ok(Object.isFrozen(CURRENT_PREMIUM_ANNUAL_RELEASE_2026_2027_SLOTS));

  const content = await readFile(new URL(
    "../../../premium-content/releases/tymm-6072/2026-09/content.v3.json",
    import.meta.url,
  ));
  const manifest = await readFile(new URL(
    "../../../premium-content/releases/tymm-6072/2026-09/manifest.v3.json",
    import.meta.url,
  ));
  assert.equal(content.byteLength, payload.slots[0].pack.content.byteLength);
  assert.equal(rawSha256(content), payload.slots[0].pack.content.sha256);
  assert.equal(content.byteLength, PREMIUM_V3_PREVIEW_RELEASE_LOCK.contentRawByteLength);
  assert.equal(rawSha256(content), PREMIUM_V3_PREVIEW_RELEASE_LOCK.contentRawSha256);
  assert.equal(manifest.byteLength, payload.slots[0].pack.manifest.byteLength);
  assert.equal(rawSha256(manifest), payload.slots[0].pack.manifest.sha256);
  assert.equal(rawSha256(manifest), PREMIUM_V3_PREVIEW_RELEASE_LOCK.manifestRawSha256);

  const token = await signRawPayload(payload);
  const verified = await verifyPremiumAnnualReleaseSetJws(token, verifyOptions());
  assert.deepEqual(verified.payload, parsePremiumAnnualReleaseSetPayload(payload));
  assert.match(verified.payloadSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(verified.compactJws, token);
  assert.deepEqual(verified.verification, {
    scheme: "maarifos-trusted-es256-annual-release-v1",
    trustedKeyId: KID,
    issuer: ISSUER,
    audience: AUDIENCE,
    releaseSetId: payload.releaseSetId,
    sku: payload.sku,
    academicRelease: payload.academicRelease,
  });
  assert.equal(serializePremiumAnnualReleaseSetPayload(payload), JSON.stringify(canonical(payload)));
  assert.ok(Object.isFrozen(verified));
  assert.ok(Object.isFrozen(verified.payload.slots[0].pack.content));
});

test("payload veya imza kurcalama ile güvenilmeyen kid fail-closed reddedilir", async (t) => {
  const payload = basePayload();
  const token = await signRawPayload(payload);
  const segments = token.split(".");

  await t.test("imzadan sonra payload kurcalama", async () => {
    const tampered = structuredClone(payload);
    tampered.slots[0].pack.contentPackId = `${tampered.slots[0].pack.contentPackId}-forged`;
    const tamperedPayloadSegment = base64Url(JSON.stringify(canonical(tampered)));
    await assert.rejects(
      verifyPremiumAnnualReleaseSetJws(
        `${segments[0]}.${tamperedPayloadSegment}.${segments[2]}`,
        verifyOptions(),
      ),
      /imzası geçersiz/i,
    );
  });

  await t.test("imza baytı kurcalama", async () => {
    const signature = Buffer.from(segments[2], "base64url");
    signature[0] ^= 1;
    await assert.rejects(
      verifyPremiumAnnualReleaseSetJws(
        `${segments[0]}.${segments[1]}.${signature.toString("base64url")}`,
        verifyOptions(),
      ),
      /imzası geçersiz/i,
    );
  });

  await t.test("güvenilmeyen kid", async () => {
    const unknownKidToken = await signRawPayload(payload, { kid: "unknown-key" });
    await assert.rejects(
      verifyPremiumAnnualReleaseSetJws(unknownKidToken, verifyOptions()),
      /kid değeri güvenilir değil/i,
    );
  });
});

test("on aylık Sep–Haz slot cardinality, sıra ve unpublished null sınırı değiştirilemez", async (t) => {
  const cases = [
    {
      name: "eksik ay",
      mutate: (payload) => payload.slots.pop(),
      pattern: /exact 10 sıralı/i,
    },
    {
      name: "duplicate ay",
      mutate: (payload) => { payload.slots[1].monthKey = payload.slots[0].monthKey; },
      pattern: /exact 2026-10.*kanonik/i,
    },
    {
      name: "ay sırası değişti",
      mutate: (payload) => {
        [payload.slots[1], payload.slots[2]] = [payload.slots[2], payload.slots[1]];
      },
      pattern: /exact 2026-10.*kanonik/i,
    },
    {
      name: "unpublished slot paket taşıyor",
      mutate: (payload) => { payload.slots[1].pack = structuredClone(payload.slots[0].pack); },
      pattern: /unpublished.*pack alanı null/i,
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, async () => {
      const payload = basePayload();
      entry.mutate(payload);
      const token = await signRawPayload(payload);
      await assert.rejects(
        verifyPremiumAnnualReleaseSetJws(token, verifyOptions()),
        entry.pattern,
      );
    });
  }
});

test("published paket özeti, bayt uzunluğu ve artefakt yolu sıkı biçimde doğrulanır", async (t) => {
  const cases = [
    {
      name: "bozuk digest",
      mutate: (pack) => { pack.content.sha256 = `sha256:${"g".repeat(64)}`; },
      pattern: /64-hex/i,
    },
    {
      name: "sıfır bayt uzunluğu",
      mutate: (pack) => { pack.manifest.byteLength = 0; },
      pattern: /pozitif güvenli tam sayı/i,
    },
    {
      name: "ondalıklı bayt uzunluğu",
      mutate: (pack) => { pack.content.byteLength = 143990.5; },
      pattern: /pozitif güvenli tam sayı/i,
    },
    {
      name: "ay dışına taşan artefakt yolu",
      mutate: (pack) => { pack.content.path = "premium-content/releases/tymm-6072/2026-10/content.v3.json"; },
      pattern: /ilgili SKU\/ay/i,
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, async () => {
      const payload = basePayload();
      entry.mutate(payload.slots[0].pack);
      const token = await signRawPayload(payload);
      await assert.rejects(
        verifyPremiumAnnualReleaseSetJws(token, verifyOptions()),
        entry.pattern,
      );
    });
  }
});

test("ES256 header ile issuer/audience ve ürün kimliği sözleşmesi exact kalır", async (t) => {
  const payload = basePayload();
  await t.test("yanlış algoritma", async () => {
    const token = await signRawPayload(payload, { headerOverrides: { alg: "none" } });
    await assert.rejects(
      verifyPremiumAnnualReleaseSetJws(token, verifyOptions()),
      /exact ES256/i,
    );
  });
  await t.test("issuer uyuşmazlığı", async () => {
    const token = await signRawPayload(payload);
    await assert.rejects(
      verifyPremiumAnnualReleaseSetJws(token, {
        ...verifyOptions(),
        expectedIssuer: "https://other.maarifos.test",
      }),
      /issuer veya audience/i,
    );
  });
  await t.test("audience uyuşmazlığı", async () => {
    const token = await signRawPayload(payload);
    await assert.rejects(
      verifyPremiumAnnualReleaseSetJws(token, {
        ...verifyOptions(),
        expectedAudience: "another-app",
      }),
      /issuer veya audience/i,
    );
  });
  for (const mismatch of [
    {
      name: "release-set kimliği uyuşmazlığı",
      override: { expectedReleaseSetId: "tymm-6072-2027-2028-annual-release-set" },
    },
    {
      name: "SKU uyuşmazlığı",
      override: { expectedSku: "TYMM-OTHER" },
    },
    {
      name: "akademik yayın uyuşmazlığı",
      override: { expectedAcademicRelease: "2027-2028" },
    },
  ]) {
    await t.test(mismatch.name, async () => {
      const token = await signRawPayload(payload);
      await assert.rejects(
        verifyPremiumAnnualReleaseSetJws(token, {
          ...verifyOptions(),
          ...mismatch.override,
        }),
        /beklenen ürün, SKU veya akademik yayın kimliğiyle uyuşmuyor/i,
      );
    });
  }
});

test("revizyon ve predecessor zinciri güncellemeyi kabul eder; rollback, kırık bağ ve atlama reddedilir", async () => {
  const revisionOneToken = await signRawPayload(basePayload());
  const revisionOne = await verifyPremiumAnnualReleaseSetJws(
    revisionOneToken,
    verifyOptions(),
  );
  const revisionOneAnchor = premiumAnnualReleaseAnchor(revisionOne);

  const revisionTwoPayload = basePayload();
  revisionTwoPayload.revision = 2;
  revisionTwoPayload.predecessor = revisionOneAnchor;
  revisionTwoPayload.issuedAtUtc = "2026-08-10T00:00:00.000Z";
  const revisionTwoToken = await signRawPayload(revisionTwoPayload);
  const revisionTwo = await verifyPremiumAnnualReleaseSetJws(
    revisionTwoToken,
    verifyOptions(revisionOneAnchor),
  );
  assert.equal(revisionTwo.payload.revision, 2);
  const revisionTwoAnchor = premiumAnnualReleaseAnchor(revisionTwo);

  await assert.rejects(
    verifyPremiumAnnualReleaseSetJws(
      revisionOneToken,
      verifyOptions(revisionTwoAnchor),
    ),
    /rollback/i,
  );

  const brokenPredecessor = structuredClone(revisionTwoPayload);
  brokenPredecessor.predecessor.payloadSha256 = `sha256:${"a".repeat(64)}`;
  await assert.rejects(
    verifyPremiumAnnualReleaseSetJws(
      await signRawPayload(brokenPredecessor),
      verifyOptions(revisionOneAnchor),
    ),
    /predecessor zinciri/i,
  );

  const revisionGap = basePayload();
  revisionGap.revision = 3;
  revisionGap.predecessor = {
    releaseSetId: revisionOneAnchor.releaseSetId,
    revision: 2,
    payloadSha256: revisionTwoAnchor.payloadSha256,
  };
  revisionGap.issuedAtUtc = "2026-08-11T00:00:00.000Z";
  await assert.rejects(
    verifyPremiumAnnualReleaseSetJws(
      await signRawPayload(revisionGap),
      verifyOptions(revisionOneAnchor),
    ),
    /revizyon zincirinde atlama/i,
  );

  const equivocation = basePayload();
  equivocation.issuedAtUtc = "2026-08-09T00:00:01.000Z";
  await assert.rejects(
    verifyPremiumAnnualReleaseSetJws(
      await signRawPayload(equivocation),
      verifyOptions(revisionOneAnchor),
    ),
    /aynı.*revizyon.*farklı payload/i,
  );
});
