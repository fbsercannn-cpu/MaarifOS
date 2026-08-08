export const PREMIUM_ENTITLEMENT_VERSION = 1 as const;
export const PREMIUM_ENTITLEMENT_ALGORITHM = "ES256" as const;
export const PREMIUM_TRIAL_DURATION_SECONDS = 72 * 60 * 60;

export type PremiumAccessMode = "purchased" | "staff-code" | "trial";
export type PremiumAccessStatus =
  | "active"
  | "expired"
  | "refresh-required"
  | "revoked";

export interface PremiumEntitlementGrant {
  sku: string;
  contentReleaseId: string;
  contentPackId: string;
  contentPackVersion: string;
  manifestDigest: string;
  accessMode: PremiumAccessMode;
  academicRelease: string;
  trialStartedAt: number | null;
  accessExpiresAt: number | null;
}

export interface PremiumEntitlementClaims {
  ver: typeof PREMIUM_ENTITLEMENT_VERSION;
  iss: string;
  aud: string;
  jti: string;
  entitlementId: string;
  deviceKeyThumbprint: string;
  grants: readonly PremiumEntitlementGrant[];
  issuedAt: number;
  notBefore: number;
  refreshAfter: number;
  offlineUntil: number;
  archiveAccessAfter: number;
  revocationGeneration: number;
  legalTermsVersion: string;
}

const VERIFIED_ACCESS_MARK = Symbol("maarifos-verified-premium-access");

export interface VerifiedPremiumAccess {
  readonly [VERIFIED_ACCESS_MARK]: true;
  readonly status: PremiumAccessStatus;
  readonly source: "signed-entitlement" | "development-preview";
  readonly claims: PremiumEntitlementClaims | null;
  readonly entitlementId: string;
  readonly deviceKeyThumbprint: string;
  readonly grant: PremiumEntitlementGrant;
  readonly canUsePremiumContent: boolean;
  readonly canExportPremiumContent: boolean;
  readonly canReadExistingTeacherPlans: true;
  readonly clockRollbackDetected: boolean;
  readonly verifiedAtEpochSeconds: number;
  readonly offlineUntilEpochSeconds: number;
  readonly decisionExpiresAtEpochSeconds: number;
}

export interface PremiumPackAccessReference {
  sku: string;
  contentReleaseId: string;
  id: string;
  version: string;
  manifestDigest: string;
  academicRelease: string;
}

export interface VerifyPremiumEntitlementOptions {
  token: string;
  trustedKeys: Readonly<Record<string, JsonWebKey>>;
  expectedIssuer: string;
  expectedAudience: string;
  expectedDeviceKeyThumbprint: string;
  expectedSku: string;
  expectedContentReleaseId: string;
  expectedContentPackId: string;
  expectedContentPackVersion: string;
  expectedManifestDigest: string;
  now?: Date;
  maxObservedWallClock?: Date;
  minimumRevocationGeneration?: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const THUMBPRINT_PATTERN = /^sha256:[A-Za-z0-9_-]{43}$/;
const RELEASE_PATTERN = /^20\d{2}-20\d{2}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function record(value: unknown, label: string): Record<string, unknown> {
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

function requiredText(value: unknown, label: string, maxLength = 300): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`${label} geçersiz.`);
  }
  return value;
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`${label} negatif olmayan güvenli tamsayı olmalıdır.`);
  }
  return Number(value);
}

function decodeBase64Url(value: string, label: string): Uint8Array {
  if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1) {
    throw new Error(`${label} kanonik base64url biçiminde değildir.`);
  }
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error(`${label} çözülemedi.`);
  }
  const canonical = btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
  if (canonical !== value) {
    throw new Error(`${label} kanonik base64url biçiminde değildir.`);
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function parseJsonSegment(value: string, label: string): Record<string, unknown> {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      decodeBase64Url(value, label),
    );
    return record(JSON.parse(text), label);
  } catch (reason) {
    if (reason instanceof Error && reason.message.startsWith(label)) throw reason;
    throw new Error(`${label} geçerli UTF-8 JSON değildir.`);
  }
}

function parseGrant(value: unknown): PremiumEntitlementGrant {
  const grant = record(value, "Premium grant");
  exactKeys(
    grant,
    [
      "access_expires_at",
      "access_mode",
      "academic_release",
      "content_pack_id",
      "content_pack_version",
      "content_release_id",
      "manifest_digest",
      "sku",
      "trial_started_at",
    ],
    "Premium grant",
  );
  const accessMode = grant.access_mode;
  if (accessMode !== "purchased" && accessMode !== "staff-code" && accessMode !== "trial") {
    throw new Error("Premium grant erişim biçimi geçersiz.");
  }
  const academicRelease = requiredText(grant.academic_release, "Akademik sürüm", 20);
  if (!RELEASE_PATTERN.test(academicRelease)) {
    throw new Error("Akademik sürüm YYYY-YYYY biçiminde olmalıdır.");
  }
  const manifestDigest = requiredText(grant.manifest_digest, "Manifest özeti", 100);
  if (!SHA256_DIGEST_PATTERN.test(manifestDigest)) {
    throw new Error("Manifest özeti SHA-256 biçiminde olmalıdır.");
  }
  const trialStartedAt = grant.trial_started_at === null
    ? null
    : integer(grant.trial_started_at, "Deneme başlangıcı");
  const accessExpiresAt = grant.access_expires_at === null
    ? null
    : integer(grant.access_expires_at, "Erişim bitişi");
  if (
    accessMode === "trial"
      ? trialStartedAt === null ||
        accessExpiresAt === null ||
        accessExpiresAt - trialStartedAt !== PREMIUM_TRIAL_DURATION_SECONDS
      : trialStartedAt !== null || accessExpiresAt !== null
  ) {
    throw new Error("Premium grant deneme süresi sözleşmesine uymuyor.");
  }
  return Object.freeze({
    sku: requiredText(grant.sku, "SKU", 80),
    contentReleaseId: requiredText(grant.content_release_id, "İçerik sürüm kimliği", 200),
    contentPackId: requiredText(grant.content_pack_id, "İçerik paket kimliği", 200),
    contentPackVersion: requiredText(grant.content_pack_version, "İçerik paket sürümü", 80),
    manifestDigest,
    accessMode,
    academicRelease,
    trialStartedAt,
    accessExpiresAt,
  });
}

function parseClaims(value: Record<string, unknown>): PremiumEntitlementClaims {
  exactKeys(
    value,
    [
      "archive_access_after",
      "aud",
      "device_key_thumbprint",
      "entitlement_id",
      "grants",
      "iat",
      "iss",
      "jti",
      "legal_terms_version",
      "nbf",
      "offline_until",
      "refresh_after",
      "revocation_generation",
      "ver",
    ],
    "Premium entitlement",
  );
  if (value.ver !== PREMIUM_ENTITLEMENT_VERSION) {
    throw new Error("Premium entitlement sürümü desteklenmiyor.");
  }
  if (!Array.isArray(value.grants) || value.grants.length === 0 || value.grants.length > 20) {
    throw new Error("Premium entitlement en az bir ve en fazla yirmi grant taşımalıdır.");
  }
  const grants = Object.freeze(value.grants.map(parseGrant));
  const uniqueGrants = new Set(
    grants.map((grant) => `${grant.sku}\u0000${grant.contentReleaseId}`),
  );
  if (uniqueGrants.size !== grants.length) {
    throw new Error("Premium entitlement mükerrer grant taşıyamaz.");
  }
  const issuedAt = integer(value.iat, "Düzenlenme zamanı");
  const notBefore = integer(value.nbf, "Başlangıç zamanı");
  const refreshAfter = integer(value.refresh_after, "Yenileme zamanı");
  const offlineUntil = integer(value.offline_until, "Çevrimdışı bitiş zamanı");
  const archiveAccessAfter = integer(value.archive_access_after, "Arşiv erişim zamanı");
  if (
    issuedAt > notBefore ||
    notBefore > refreshAfter ||
    refreshAfter > offlineUntil ||
    offlineUntil > archiveAccessAfter
  ) {
    throw new Error("Premium entitlement zaman sırası geçersiz.");
  }
  const deviceKeyThumbprint = requiredText(
    value.device_key_thumbprint,
    "Cihaz anahtar özeti",
    100,
  );
  if (!THUMBPRINT_PATTERN.test(deviceKeyThumbprint)) {
    throw new Error("Cihaz anahtar özeti geçersiz.");
  }
  const jti = requiredText(value.jti, "Token kimliği", 80);
  const entitlementId = requiredText(value.entitlement_id, "Entitlement kimliği", 80);
  if (!UUID_PATTERN.test(jti) || !UUID_PATTERN.test(entitlementId)) {
    throw new Error("Entitlement ve token kimlikleri UUID olmalıdır.");
  }
  return Object.freeze({
    ver: PREMIUM_ENTITLEMENT_VERSION,
    iss: requiredText(value.iss, "Entitlement issuer", 200),
    aud: requiredText(value.aud, "Entitlement audience", 200),
    jti,
    entitlementId,
    deviceKeyThumbprint,
    grants,
    issuedAt,
    notBefore,
    refreshAfter,
    offlineUntil,
    archiveAccessAfter,
    revocationGeneration: integer(value.revocation_generation, "İptal nesli"),
    legalTermsVersion: requiredText(value.legal_terms_version, "Hukuki metin sürümü", 100),
  });
}

function effectiveNowSeconds(
  now: Date,
  maxObservedWallClock?: Date,
): { seconds: number; clockRollbackDetected: boolean } {
  if (Number.isNaN(now.getTime())) throw new Error("Entitlement kontrol zamanı geçersiz.");
  if (maxObservedWallClock && Number.isNaN(maxObservedWallClock.getTime())) {
    throw new Error("Güvenilir son cihaz zamanı geçersiz.");
  }
  const nowMs = now.getTime();
  const observedMs = maxObservedWallClock?.getTime() ?? nowMs;
  return {
    seconds: Math.floor(Math.max(nowMs, observedMs) / 1000),
    clockRollbackDetected: nowMs < observedMs,
  };
}

function accessForGrant(
  claims: PremiumEntitlementClaims,
  grant: PremiumEntitlementGrant,
  status: PremiumAccessStatus,
  clockRollbackDetected: boolean,
  verifiedAtEpochSeconds: number,
): VerifiedPremiumAccess {
  const active = status === "active";
  const decisionExpiresAtEpochSeconds = Math.min(
    claims.offlineUntil,
    grant.accessExpiresAt ?? Number.MAX_SAFE_INTEGER,
  );
  return Object.freeze({
    [VERIFIED_ACCESS_MARK]: true as const,
    status,
    source: "signed-entitlement" as const,
    claims,
    entitlementId: claims.entitlementId,
    deviceKeyThumbprint: claims.deviceKeyThumbprint,
    grant,
    canUsePremiumContent: active,
    canExportPremiumContent: active && grant.accessMode !== "trial",
    canReadExistingTeacherPlans: true as const,
    clockRollbackDetected,
    verifiedAtEpochSeconds,
    offlineUntilEpochSeconds: claims.offlineUntil,
    decisionExpiresAtEpochSeconds,
  });
}

export function assertVerifiedPremiumAccess(
  value: unknown,
): asserts value is VerifiedPremiumAccess {
  if (
    !value ||
    typeof value !== "object" ||
    (value as Partial<VerifiedPremiumAccess>)[VERIFIED_ACCESS_MARK] !== true
  ) {
    throw new Error("Premium işlem için doğrulanmış entitlement gereklidir.");
  }
}

export function assertPremiumPackActionAccess(
  access: unknown,
  pack: PremiumPackAccessReference,
  action: "content" | "export",
  now = new Date(),
): asserts access is VerifiedPremiumAccess {
  assertVerifiedPremiumAccess(access);
  if (Number.isNaN(now.getTime())) throw new Error("Premium işlem zamanı geçersiz.");
  if (
    access.grant.sku !== pack.sku ||
    access.grant.contentReleaseId !== pack.contentReleaseId ||
    access.grant.contentPackId !== pack.id ||
    access.grant.contentPackVersion !== pack.version ||
    access.grant.manifestDigest !== pack.manifestDigest ||
    access.grant.academicRelease !== pack.academicRelease
  ) {
    throw new Error("Premium erişim yalnız doğrulanan paket ve akademik sürüm için geçerlidir.");
  }
  const nowSeconds = Math.max(
    Math.floor(now.getTime() / 1000),
    access.verifiedAtEpochSeconds,
  );
  if (
    access.status !== "active" ||
    (access.grant.accessExpiresAt !== null && nowSeconds >= access.grant.accessExpiresAt) ||
    nowSeconds > access.offlineUntilEpochSeconds
  ) {
    throw new Error("Premium erişimin süresi dolmuş veya çevrimiçi yenileme gerekiyor.");
  }
  if (action === "content" && !access.canUsePremiumContent) {
    throw new Error("Bu premium içerik için etkin erişim gerekiyor.");
  }
  if (action === "export" && !access.canExportPremiumContent) {
    throw new Error("Dışa aktarma için doğrulanmış satın alma veya STAFF erişimi gereklidir.");
  }
}

export function canPerformPremiumPackAction(
  access: unknown,
  pack: PremiumPackAccessReference,
  action: "content" | "export",
  now = new Date(),
): access is VerifiedPremiumAccess {
  try {
    assertPremiumPackActionAccess(access, pack, action, now);
    return true;
  } catch {
    return false;
  }
}

export async function verifyPremiumEntitlement(
  options: VerifyPremiumEntitlementOptions,
): Promise<VerifiedPremiumAccess> {
  const segments = options.token.split(".");
  if (segments.length !== 3 || segments.some((segment) => !segment)) {
    throw new Error("Premium entitlement tokenı JWS compact biçiminde değildir.");
  }
  const [headerSegment, payloadSegment, signatureSegment] = segments;
  const header = parseJsonSegment(headerSegment, "Entitlement başlığı");
  exactKeys(header, ["alg", "kid", "typ"], "Entitlement başlığı");
  if (header.alg !== PREMIUM_ENTITLEMENT_ALGORITHM || header.typ !== "JWT") {
    throw new Error("Entitlement imza algoritması veya türü geçersiz.");
  }
  const kid = requiredText(header.kid, "Entitlement anahtar kimliği", 100);
  const trustedJwk = options.trustedKeys[kid];
  if (!trustedJwk) throw new Error("Entitlement imza anahtarı güvenilir değil.");
  const signature = decodeBase64Url(signatureSegment, "Entitlement imzası");
  if (signature.length !== 64) throw new Error("ES256 entitlement imzası 64 bayt olmalıdır.");
  let publicKey: CryptoKey;
  try {
    publicKey = await crypto.subtle.importKey(
      "jwk",
      trustedJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  } catch {
    throw new Error("Entitlement açık anahtarı yüklenemedi.");
  }
  const signedBytes = new TextEncoder().encode(`${headerSegment}.${payloadSegment}`);
  const signatureBytes = new Uint8Array(signature.byteLength);
  signatureBytes.set(signature);
  const signatureValid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    signatureBytes,
    signedBytes,
  );
  if (!signatureValid) throw new Error("Premium entitlement imzası geçersiz.");
  const claims = parseClaims(parseJsonSegment(payloadSegment, "Entitlement içeriği"));
  if (claims.iss !== options.expectedIssuer || claims.aud !== options.expectedAudience) {
    throw new Error("Premium entitlement hedef uygulama veya issuer ile uyuşmuyor.");
  }
  if (claims.deviceKeyThumbprint !== options.expectedDeviceKeyThumbprint) {
    throw new Error("Premium entitlement bu cihaz anahtarına ait değildir.");
  }
  const grant = claims.grants.find(
    (candidate) =>
      candidate.sku === options.expectedSku &&
      candidate.contentReleaseId === options.expectedContentReleaseId &&
      candidate.contentPackId === options.expectedContentPackId &&
      candidate.contentPackVersion === options.expectedContentPackVersion &&
      candidate.manifestDigest === options.expectedManifestDigest,
  );
  if (!grant) throw new Error("Premium entitlement seçilen içerik sürümünü kapsamıyor.");
  const { seconds: now, clockRollbackDetected } = effectiveNowSeconds(
    options.now ?? new Date(),
    options.maxObservedWallClock,
  );
  if (now < claims.notBefore) throw new Error("Premium entitlement henüz geçerli değil.");
  if (
    claims.revocationGeneration < (options.minimumRevocationGeneration ?? 0)
  ) {
    return accessForGrant(claims, grant, "revoked", clockRollbackDetected, now);
  }
  if (grant.accessExpiresAt !== null && now >= grant.accessExpiresAt) {
    return accessForGrant(claims, grant, "expired", clockRollbackDetected, now);
  }
  if (now > claims.offlineUntil) {
    return accessForGrant(claims, grant, "refresh-required", clockRollbackDetected, now);
  }
  return accessForGrant(claims, grant, "active", clockRollbackDetected, now);
}

export function createDevelopmentPreviewAccess(input: {
  sku: string;
  contentReleaseId: string;
  contentPackId: string;
  contentPackVersion: string;
  manifestDigest: string;
  academicRelease: string;
}): VerifiedPremiumAccess {
  if (!(typeof import.meta.env === "object" && import.meta.env.DEV === true)) {
    throw new Error("Geliştirme önizleme yetkisi üretim yapısında kullanılamaz.");
  }
  const verifiedAtEpochSeconds = Math.floor(Date.now() / 1000);
  return Object.freeze({
    [VERIFIED_ACCESS_MARK]: true as const,
    status: "active" as const,
    source: "development-preview" as const,
    claims: null,
    entitlementId: "development-preview",
    deviceKeyThumbprint: "development-preview",
    grant: Object.freeze({
      ...input,
      accessMode: "staff-code" as const,
      trialStartedAt: null,
      accessExpiresAt: null,
    }),
    canUsePremiumContent: true,
    canExportPremiumContent: true,
    canReadExistingTeacherPlans: true as const,
    clockRollbackDetected: false,
    verifiedAtEpochSeconds,
    offlineUntilEpochSeconds: Number.MAX_SAFE_INTEGER,
    decisionExpiresAtEpochSeconds: Number.MAX_SAFE_INTEGER,
  });
}

export interface PremiumCodeRedeemRequest {
  code: string;
  challengeId: string;
  proofSignature: string;
  devicePublicKeyJwk: JsonWebKey;
  deviceKeyThumbprint: string;
  appVersion: string;
  idempotencyKey: string;
}

export interface PremiumTrialActivationRequest {
  sku: string;
  academicRelease: string;
  challengeId: string;
  proofSignature: string;
  devicePublicKeyJwk: JsonWebKey;
  deviceKeyThumbprint: string;
  appVersion: string;
  idempotencyKey: string;
}

export function assertLicenseApiRequestHasNoEducationalData(
  value: unknown,
): void {
  const forbidden = /student|child|classroom|observation|photo|plan|öğrenci|çocuk|sınıf|gözlem/i;
  const inspect = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(inspect);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    for (const [key, nested] of Object.entries(candidate)) {
      if (forbidden.test(key)) {
        throw new Error("Lisans isteği eğitimsel veya çocuk verisi taşıyamaz.");
      }
      inspect(nested);
    }
  };
  inspect(value);
}
