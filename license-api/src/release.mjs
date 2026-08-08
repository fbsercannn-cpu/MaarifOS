export const FOUNDER_CONTENT_RELEASE = Object.freeze({
  schemaVersion: 1,
  sku: "TYMM-6072",
  academicRelease: "2026-2027",
  contentReleaseId: "tymm-6072-2026-09-v3",
  contentPackId: "maarifos-tymm-6072-2026-2027-v3",
  contentPackVersion: "3.0.0",
  manifestDigest:
    "sha256:9b4c2bcc155e3f6f8567ba5737249cd417405bc4205b75b68d194e63ca3eff1e",
  contentRawSha256:
    "sha256:b6e3b00f1bfbdd66c1ea212775f25a362330ee8f366cdd566a09e3535b5cd247",
  contentByteLength: 143990,
});

export const PRIVATE_ASSET_PATHS = Object.freeze({
  metadata: "/bundle-meta.json",
  manifest: "/manifest.v3.json",
  content: "/content.v3.json",
  predecessor: "/content.v2.json",
  valuesConstitution: "/values-pedagogy-constitution.v1.json",
  officialValueActions: "/official-preschool-value-actions.v1.json",
});

export const ENTITLEMENT_POLICY = Object.freeze({
  refreshAfterSeconds: 30 * 24 * 60 * 60,
  offlineUntilSeconds: 90 * 24 * 60 * 60,
  archiveAccessAfterSeconds: 10 * 365 * 24 * 60 * 60,
  legalTermsVersionFallback: "founder-staff-2026-08-v1",
});

export const API_LIMITS = Object.freeze({
  maxRequestBytes: 8 * 1024,
  challengeTtlSeconds: 5 * 60,
  challengeIpPerFifteenMinutes: 20,
  challengeDevicePerDay: 30,
  redeemIpPerFifteenMinutes: 5,
  redeemDevicePerDay: 10,
});
