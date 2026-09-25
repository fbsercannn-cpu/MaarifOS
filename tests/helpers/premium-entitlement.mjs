const ISSUER = "https://license.maarifos.example";
const AUDIENCE = "maarifos-pwa";
const KID = "test-es256-2026-01";
const DEVICE_THUMBPRINT = `sha256:${"A".repeat(43)}`;

function base64Url(value) {
  const bytes = typeof value === "string"
    ? new TextEncoder().encode(value)
    : value;
  return Buffer.from(bytes).toString("base64url");
}

export async function createSignedEntitlementFixture(pack, options = {}) {
  const now = options.now ?? new Date("2026-09-08T08:00:00.000Z");
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const accessMode = options.accessMode ?? "purchased";
  const trialStartedAt = accessMode === "trial" ? nowSeconds - 60 : null;
  const accessExpiresAt = accessMode === "trial"
    ? trialStartedAt + 72 * 60 * 60
    : null;
  const claims = {
    ver: 1,
    iss: ISSUER,
    aud: AUDIENCE,
    jti: crypto.randomUUID(),
    entitlement_id: crypto.randomUUID(),
    device_key_thumbprint: DEVICE_THUMBPRINT,
    grants: [{
      sku: pack.sku,
      content_release_id: pack.contentReleaseId,
      content_pack_id: pack.id,
      content_pack_version: pack.version,
      manifest_digest: pack.manifestDigest,
      access_mode: accessMode,
      academic_release: pack.academicRelease,
      trial_started_at: trialStartedAt,
      access_expires_at: accessExpiresAt,
      ...(options.grantOverrides ?? {}),
    }],
    iat: nowSeconds - 120,
    nbf: nowSeconds - 60,
    refresh_after: nowSeconds + 24 * 60 * 60,
    offline_until: nowSeconds + 30 * 24 * 60 * 60,
    archive_access_after: nowSeconds + 400 * 24 * 60 * 60,
    revocation_generation: 0,
    legal_terms_version: "2026-08-v1",
    ...(options.claimOverrides ?? {}),
  };
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const header = { alg: "ES256", kid: KID, typ: "JWT", ...(options.headerOverrides ?? {}) };
  const headerSegment = base64Url(JSON.stringify(header));
  const payloadSegment = base64Url(JSON.stringify(claims));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyPair.privateKey,
    new TextEncoder().encode(signingInput),
  ));
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return {
    token: `${signingInput}.${base64Url(signature)}`,
    claims,
    trustedKeys: { [KID]: publicJwk },
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    expectedDeviceKeyThumbprint: DEVICE_THUMBPRINT,
    expectedSku: pack.sku,
    expectedContentReleaseId: pack.contentReleaseId,
    expectedContentPackId: pack.id,
    expectedContentPackVersion: pack.version,
    expectedManifestDigest: pack.manifestDigest,
    now,
  };
}
