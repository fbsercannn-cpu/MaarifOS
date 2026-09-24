import {
  PREMIUM_V3_PREVIEW_RELEASE_LOCK,
  PREMIUM_VALUES_V3_RELEASE_IDENTITY,
} from "./content-repository.ts";

export const PREMIUM_ANNUAL_RELEASE_JWS_TYPE =
  "MAARIFOS-ANNUAL-RELEASE+JWS" as const;
export const PREMIUM_ANNUAL_RELEASE_SET_TYPE =
  "maarifos_premium_annual_release_set" as const;
export const PREMIUM_ANNUAL_RELEASE_VERIFICATION_SCHEME =
  "maarifos-trusted-es256-annual-release-v1" as const;

const VERIFIED_PREMIUM_ANNUAL_RELEASE_SET = Symbol(
  "verified-premium-annual-release-set",
);
const verifiedPremiumAnnualReleaseSets = new WeakSet<object>();

export const PREMIUM_ANNUAL_RELEASE_2026_2027_MONTH_KEYS = Object.freeze([
  "2026-09",
  "2026-10",
  "2026-11",
  "2026-12",
  "2027-01",
  "2027-02",
  "2027-03",
  "2027-04",
  "2027-05",
  "2027-06",
] as const);

export type PremiumAnnualReleaseMonthKey = `${number}-${number}`;
export type Sha256Digest = `sha256:${string}`;

export interface PremiumAnnualReleaseArtifact {
  readonly path: string;
  readonly sha256: Sha256Digest;
  readonly byteLength: number;
}

export interface PremiumAnnualReleasePackReference {
  readonly contentPackId: string;
  readonly contentPackVersion: string;
  readonly contentReleaseId: string;
  readonly reviewStatus: "machine_validated_pending_human_review";
  readonly content: PremiumAnnualReleaseArtifact;
  readonly manifest: PremiumAnnualReleaseArtifact;
}

export type PremiumAnnualReleaseSlot =
  | {
      readonly monthKey: PremiumAnnualReleaseMonthKey;
      readonly state: "published";
      readonly pack: PremiumAnnualReleasePackReference;
    }
  | {
      readonly monthKey: PremiumAnnualReleaseMonthKey;
      readonly state: "unpublished";
      readonly pack: null;
    };

export interface PremiumAnnualReleasePredecessor {
  readonly releaseSetId: string;
  readonly revision: number;
  readonly payloadSha256: Sha256Digest;
}

export interface PremiumAnnualReleaseSetPayload {
  readonly schemaVersion: 1;
  readonly type: typeof PREMIUM_ANNUAL_RELEASE_SET_TYPE;
  readonly releaseSetId: string;
  readonly sku: string;
  readonly academicRelease: string;
  readonly revision: number;
  readonly predecessor: PremiumAnnualReleasePredecessor | null;
  readonly iss: string;
  readonly aud: string;
  readonly issuedAtUtc: string;
  readonly slots: readonly PremiumAnnualReleaseSlot[];
}

export interface PremiumAnnualReleaseAnchor {
  readonly releaseSetId: string;
  readonly revision: number;
  readonly payloadSha256: Sha256Digest;
}

export interface PremiumAnnualReleaseVerificationProof {
  readonly scheme: typeof PREMIUM_ANNUAL_RELEASE_VERIFICATION_SCHEME;
  readonly trustedKeyId: string;
  readonly issuer: string;
  readonly audience: string;
  readonly releaseSetId: string;
  readonly sku: string;
  readonly academicRelease: string;
}

export interface VerifiedPremiumAnnualReleaseSet {
  readonly [VERIFIED_PREMIUM_ANNUAL_RELEASE_SET]: true;
  readonly compactJws: string;
  readonly header: {
    readonly alg: "ES256";
    readonly kid: string;
    readonly typ: typeof PREMIUM_ANNUAL_RELEASE_JWS_TYPE;
  };
  readonly payload: PremiumAnnualReleaseSetPayload;
  readonly payloadSha256: Sha256Digest;
  readonly verification: PremiumAnnualReleaseVerificationProof;
}

export interface VerifyPremiumAnnualReleaseSetOptions {
  readonly trustedKeys: Readonly<Record<string, JsonWebKey>>;
  readonly expectedIssuer: string;
  readonly expectedAudience: string;
  readonly expectedReleaseSetId: string;
  readonly expectedSku: string;
  readonly expectedAcademicRelease: string;
  readonly previous?: PremiumAnnualReleaseAnchor | null;
}

type CanonicalJson =
  | boolean
  | null
  | number
  | string
  | CanonicalJson[]
  | { [key: string]: CanonicalJson };

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const RELEASE_SET_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,127}$/u;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,39}$/u;
const SEMVER_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u;
const ARTIFACT_PATH_PATTERN = /^[A-Za-z0-9._/-]+$/u;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const MAX_ARTIFACT_BYTES = 100_000_000;
const MAX_COMPACT_JWS_BYTES = 512_000;

const PAYLOAD_KEYS = Object.freeze([
  "schemaVersion",
  "type",
  "releaseSetId",
  "sku",
  "academicRelease",
  "revision",
  "predecessor",
  "iss",
  "aud",
  "issuedAtUtc",
  "slots",
]);
const SLOT_KEYS = Object.freeze(["monthKey", "state", "pack"]);
const PACK_KEYS = Object.freeze([
  "contentPackId",
  "contentPackVersion",
  "contentReleaseId",
  "reviewStatus",
  "content",
  "manifest",
]);
const ARTIFACT_KEYS = Object.freeze(["path", "sha256", "byteLength"]);
const PREDECESSOR_KEYS = Object.freeze([
  "releaseSetId",
  "revision",
  "payloadSha256",
]);
const HEADER_KEYS = Object.freeze(["alg", "kid", "typ"]);

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
  const actual = Object.keys(value);
  const missing = expected.filter((key) => !Object.hasOwn(value, key));
  const unexpected = actual.filter((key) => !expected.includes(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${label} exact alan sözleşmesini bozuyor; eksik: ${missing.join(", ") || "yok"}, beklenmeyen: ${unexpected.join(", ") || "yok"}.`,
    );
  }
}

function requiredText(
  value: unknown,
  label: string,
  maximum = 256,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value !== value.trim() ||
    value !== value.normalize("NFC")
  ) {
    throw new Error(`${label} boş olmayan, kırpılmış NFC metin olmalıdır.`);
  }
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error(`${label} pozitif güvenli tam sayı olmalıdır.`);
  }
  return Number(value);
}

function sha256Digest(value: unknown, label: string): Sha256Digest {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} küçük harfli sha256:<64-hex> özeti olmalıdır.`);
  }
  return value as Sha256Digest;
}

function utcTimestamp(value: unknown, label: string): string {
  const parsed = requiredText(value, label, 64);
  if (
    !UTC_TIMESTAMP_PATTERN.test(parsed) ||
    Number.isNaN(Date.parse(parsed)) ||
    new Date(parsed).toISOString() !== parsed
  ) {
    throw new Error(`${label} milisaniyeli UTC ISO-8601 zaman damgası olmalıdır.`);
  }
  return parsed;
}

function httpsIssuer(value: unknown, label: string): string {
  const parsed = requiredText(value, label, 512);
  let url: URL;
  try {
    url = new URL(parsed);
  } catch {
    throw new Error(`${label} geçerli bir HTTPS otoritesi olmalıdır.`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    url.origin !== parsed
  ) {
    throw new Error(`${label} yalnız kanonik HTTPS origin olmalıdır.`);
  }
  return parsed;
}

function academicMonthKeys(academicRelease: string): readonly string[] {
  const match = /^(\d{4})-(\d{4})$/u.exec(academicRelease);
  if (!match) {
    throw new Error("Akademik yayın YYYY-YYYY biçiminde olmalıdır.");
  }
  const firstYear = Number(match[1]);
  const secondYear = Number(match[2]);
  if (secondYear !== firstYear + 1) {
    throw new Error("Akademik yayın ardışık iki yılı göstermelidir.");
  }
  return Object.freeze([
    `${firstYear}-09`,
    `${firstYear}-10`,
    `${firstYear}-11`,
    `${firstYear}-12`,
    `${secondYear}-01`,
    `${secondYear}-02`,
    `${secondYear}-03`,
    `${secondYear}-04`,
    `${secondYear}-05`,
    `${secondYear}-06`,
  ]);
}

function artifact(
  value: unknown,
  label: string,
  expectedPrefix: string,
): PremiumAnnualReleaseArtifact {
  const item = record(value, label);
  exactKeys(item, ARTIFACT_KEYS, label);
  const path = requiredText(item.path, `${label} yolu`, 512);
  const segments = path.split("/");
  if (
    !ARTIFACT_PATH_PATTERN.test(path) ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("//") ||
    segments.some((segment) => segment === "." || segment === "..") ||
    !path.startsWith(expectedPrefix) ||
    !path.endsWith(".json")
  ) {
    throw new Error(`${label} yolu ilgili SKU/ay altındaki göreli JSON yolu olmalıdır.`);
  }
  const byteLength = positiveInteger(item.byteLength, `${label} bayt uzunluğu`);
  if (byteLength > MAX_ARTIFACT_BYTES) {
    throw new Error(`${label} güvenli bayt uzunluğu sınırını aşıyor.`);
  }
  return Object.freeze({
    path,
    sha256: sha256Digest(item.sha256, `${label} özeti`),
    byteLength,
  });
}

function packReference(
  value: unknown,
  label: string,
  sku: string,
  monthKey: string,
): PremiumAnnualReleasePackReference {
  const item = record(value, label);
  exactKeys(item, PACK_KEYS, label);
  const contentPackId = requiredText(item.contentPackId, `${label} paket kimliği`);
  const contentPackVersion = requiredText(
    item.contentPackVersion,
    `${label} paket sürümü`,
    64,
  );
  if (!SEMVER_PATTERN.test(contentPackVersion)) {
    throw new Error(`${label} paket sürümü SemVer çekirdek biçiminde olmalıdır.`);
  }
  const contentReleaseId = requiredText(
    item.contentReleaseId,
    `${label} içerik yayın kimliği`,
  );
  if (item.reviewStatus !== "machine_validated_pending_human_review") {
    throw new Error(
      `${label} inceleme durumu exact machine_validated_pending_human_review olmalıdır.`,
    );
  }
  const prefix = `premium-content/releases/${sku.toLocaleLowerCase("tr-TR")}/${monthKey}/`;
  const content = artifact(item.content, `${label} içerik artefaktı`, prefix);
  const manifest = artifact(item.manifest, `${label} manifest artefaktı`, prefix);
  if (
    content.path === manifest.path ||
    content.sha256 === manifest.sha256
  ) {
    throw new Error(`${label} içerik ve manifest artefaktları ayrı olmalıdır.`);
  }
  return Object.freeze({
    contentPackId,
    contentPackVersion,
    contentReleaseId,
    reviewStatus: "machine_validated_pending_human_review",
    content,
    manifest,
  });
}

function predecessor(
  value: unknown,
  releaseSetId: string,
  revision: number,
): PremiumAnnualReleasePredecessor | null {
  if (revision === 1) {
    if (value !== null) {
      throw new Error("İlk yıllık yayın revizyonunun predecessor alanı null olmalıdır.");
    }
    return null;
  }
  const item = record(value, "Yıllık yayın predecessor kaydı");
  exactKeys(item, PREDECESSOR_KEYS, "Yıllık yayın predecessor kaydı");
  if (item.releaseSetId !== releaseSetId) {
    throw new Error("Yıllık yayın predecessor kimliği release-set kimliğiyle eşleşmelidir.");
  }
  if (item.revision !== revision - 1) {
    throw new Error("Yıllık yayın predecessor revizyonu tam olarak bir önceki revizyon olmalıdır.");
  }
  return Object.freeze({
    releaseSetId,
    revision: revision - 1,
    payloadSha256: sha256Digest(
      item.payloadSha256,
      "Yıllık yayın predecessor payload özeti",
    ),
  });
}

function canonicalJson(value: unknown, path = "$", seen = new WeakSet<object>()): CanonicalJson {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value !== value.normalize("NFC")) {
      throw new Error(`${path} NFC-normalize metin taşımalıdır.`);
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${path} sonlu sayı taşımalıdır.`);
    return value;
  }
  if (!value || typeof value !== "object") {
    throw new Error(`${path} kanonik JSON ile temsil edilemiyor.`);
  }
  if (seen.has(value)) throw new Error(`${path} döngüsel veri içeremez.`);
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((entry, index) => canonicalJson(entry, `${path}[${index}]`, seen));
  }
  const output: Record<string, CanonicalJson> = {};
  const normalizedKeys = new Set<string>();
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const normalizedKey = key.normalize("NFC");
    if (key !== normalizedKey || normalizedKeys.has(normalizedKey)) {
      throw new Error(`${path} NFC-normalize ve benzersiz alan adları taşımalıdır.`);
    }
    normalizedKeys.add(normalizedKey);
    output[key] = canonicalJson(
      (value as Record<string, unknown>)[key],
      `${path}.${key}`,
      seen,
    );
  }
  return output;
}

function canonicalJsonText(value: unknown): string {
  return JSON.stringify(canonicalJson(value));
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested, seen);
  }
  return Object.freeze(value);
}

export function assertVerifiedPremiumAnnualReleaseSet(
  value: unknown,
): asserts value is VerifiedPremiumAnnualReleaseSet {
  if (
    !value ||
    typeof value !== "object" ||
    !verifiedPremiumAnnualReleaseSets.has(value) ||
    (value as Partial<VerifiedPremiumAnnualReleaseSet>)[
      VERIFIED_PREMIUM_ANNUAL_RELEASE_SET
    ] !== true
  ) {
    throw new Error(
      "Yıllık premium yayın seti yalnız güvenilir ES256 doğrulayıcısının opak çıktısından commit edilebilir.",
    );
  }
}

export function parsePremiumAnnualReleaseSetPayload(
  value: unknown,
): PremiumAnnualReleaseSetPayload {
  const item = record(value, "Yıllık premium yayın seti");
  exactKeys(item, PAYLOAD_KEYS, "Yıllık premium yayın seti");
  if (item.schemaVersion !== 1) {
    throw new Error("Yıllık premium yayın seti şema sürümü exact 1 olmalıdır.");
  }
  if (item.type !== PREMIUM_ANNUAL_RELEASE_SET_TYPE) {
    throw new Error(`Yıllık premium yayın seti türü exact ${PREMIUM_ANNUAL_RELEASE_SET_TYPE} olmalıdır.`);
  }
  const releaseSetId = requiredText(item.releaseSetId, "Yıllık yayın seti kimliği");
  if (!RELEASE_SET_ID_PATTERN.test(releaseSetId)) {
    throw new Error("Yıllık yayın seti kimliği güvenli küçük harfli kimlik biçiminde olmalıdır.");
  }
  const sku = requiredText(item.sku, "Yıllık yayın SKU'su", 40);
  if (!SKU_PATTERN.test(sku)) {
    throw new Error("Yıllık yayın SKU'su kanonik büyük harf/rakam/tire biçiminde olmalıdır.");
  }
  const academicRelease = requiredText(
    item.academicRelease,
    "Yıllık akademik yayın",
    9,
  );
  const expectedMonths = academicMonthKeys(academicRelease);
  const revision = positiveInteger(item.revision, "Yıllık yayın revizyonu");
  const parsedPredecessor = predecessor(item.predecessor, releaseSetId, revision);
  const iss = httpsIssuer(item.iss, "Yıllık içerik otoritesi issuer değeri");
  const aud = requiredText(item.aud, "Yıllık içerik otoritesi audience değeri");
  const issuedAtUtc = utcTimestamp(item.issuedAtUtc, "Yıllık yayın oluşturma zamanı");

  if (!Array.isArray(item.slots) || item.slots.length !== 10) {
    throw new Error("Yıllık yayın seti exact 10 sıralı Eylül–Haziran slotu taşımalıdır.");
  }
  const publishedIds = new Set<string>();
  const publishedReleaseIds = new Set<string>();
  const artifactPaths = new Set<string>();
  const artifactDigests = new Set<string>();
  const slots = item.slots.map((rawSlot, index): PremiumAnnualReleaseSlot => {
    const label = `Yıllık yayın slotu ${index + 1}`;
    const slot = record(rawSlot, label);
    exactKeys(slot, SLOT_KEYS, label);
    if (slot.monthKey !== expectedMonths[index]) {
      throw new Error(
        `${label} exact ${expectedMonths[index]} ayını ve kanonik Eylül–Haziran sırasını taşımalıdır.`,
      );
    }
    const monthKey = slot.monthKey as PremiumAnnualReleaseMonthKey;
    if (slot.state === "unpublished") {
      if (slot.pack !== null) {
        throw new Error(`${monthKey} unpublished slotunun pack alanı null olmalıdır.`);
      }
      return Object.freeze({ monthKey, state: "unpublished", pack: null });
    }
    if (slot.state !== "published" || slot.pack === null) {
      throw new Error(`${monthKey} slotu yalnız published+pack veya unpublished+null olabilir.`);
    }
    const pack = packReference(slot.pack, `${monthKey} yayın paketi`, sku, monthKey);
    if (
      publishedIds.has(pack.contentPackId) ||
      publishedReleaseIds.has(pack.contentReleaseId)
    ) {
      throw new Error("Yıllık yayın setindeki published paket kimlikleri benzersiz olmalıdır.");
    }
    for (const artifactValue of [pack.content, pack.manifest]) {
      if (
        artifactPaths.has(artifactValue.path) ||
        artifactDigests.has(artifactValue.sha256)
      ) {
        throw new Error("Yıllık yayın setindeki published artefakt yolları ve özetleri benzersiz olmalıdır.");
      }
      artifactPaths.add(artifactValue.path);
      artifactDigests.add(artifactValue.sha256);
    }
    publishedIds.add(pack.contentPackId);
    publishedReleaseIds.add(pack.contentReleaseId);
    return Object.freeze({ monthKey, state: "published", pack });
  });

  return deepFreeze({
    schemaVersion: 1,
    type: PREMIUM_ANNUAL_RELEASE_SET_TYPE,
    releaseSetId,
    sku,
    academicRelease,
    revision,
    predecessor: parsedPredecessor,
    iss,
    aud,
    issuedAtUtc,
    slots,
  });
}

export function serializePremiumAnnualReleaseSetPayload(
  value: unknown,
): string {
  return canonicalJsonText(parsePremiumAnnualReleaseSetPayload(value));
}

function decodeBase64Url(segment: string, label: string): Uint8Array<ArrayBuffer> {
  if (
    !segment ||
    !BASE64URL_PATTERN.test(segment) ||
    segment.length % 4 === 1
  ) {
    throw new Error(`${label} kanonik base64url biçiminde olmalıdır.`);
  }
  const padded = `${segment.replace(/-/gu, "+").replace(/_/gu, "/")}${"=".repeat((4 - (segment.length % 4)) % 4)}`;
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error(`${label} kanonik base64url biçiminde olmalıdır.`);
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (encodeBase64Url(bytes) !== segment) {
    throw new Error(`${label} kanonik base64url biçiminde olmalıdır.`);
  }
  return bytes;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/=/gu, "")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_");
}

function decodeUtf8(bytes: Uint8Array<ArrayBuffer>, label: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} geçerli UTF-8 taşımalıdır.`);
  }
}

function parseJsonText(text: string, label: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} geçerli JSON taşımalıdır.`);
  }
}

async function digestBytes(bytes: Uint8Array<ArrayBuffer>): Promise<Sha256Digest> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Yıllık premium yayın doğrulaması için WebCrypto kullanılamıyor.");
  }
  const digest = new Uint8Array(
    await globalThis.crypto.subtle.digest("SHA-256", bytes),
  );
  return `sha256:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function assertTrustedEs256Jwk(jwk: JsonWebKey, kid: string): void {
  if (
    !jwk ||
    jwk.kty !== "EC" ||
    jwk.crv !== "P-256" ||
    typeof jwk.x !== "string" ||
    typeof jwk.y !== "string" ||
    typeof jwk.d === "string" ||
    (jwk.alg !== undefined && jwk.alg !== "ES256") ||
    (jwk.use !== undefined && jwk.use !== "sig") ||
    (jwk.key_ops !== undefined && !jwk.key_ops.includes("verify"))
  ) {
    throw new Error(`Güvenilen yıllık yayın anahtarı (${kid}) geçerli salt-açık P-256 doğrulama JWK'si olmalıdır.`);
  }
}

function assertReleaseTransition(
  payload: PremiumAnnualReleaseSetPayload,
  payloadSha256: Sha256Digest,
  previous: PremiumAnnualReleaseAnchor | null | undefined,
): void {
  if (!previous) return;
  const previousId = requiredText(previous.releaseSetId, "Önceki yıllık yayın seti kimliği");
  const previousRevision = positiveInteger(
    previous.revision,
    "Önceki yıllık yayın revizyonu",
  );
  const previousDigest = sha256Digest(
    previous.payloadSha256,
    "Önceki yıllık yayın payload özeti",
  );
  if (payload.releaseSetId !== previousId) {
    throw new Error("Yıllık yayın güncellemesi farklı release-set kimliğine geçemez.");
  }
  if (payload.revision < previousRevision) {
    throw new Error("Yıllık yayın rollback denemesi reddedildi.");
  }
  if (payload.revision === previousRevision) {
    if (payloadSha256 !== previousDigest) {
      throw new Error("Aynı yıllık yayın revizyonu farklı payload ile değiştirilemez.");
    }
    return;
  }
  if (payload.revision !== previousRevision + 1) {
    throw new Error("Yıllık yayın revizyon zincirinde atlama yapılamaz.");
  }
  if (
    payload.predecessor?.releaseSetId !== previousId ||
    payload.predecessor.revision !== previousRevision ||
    payload.predecessor.payloadSha256 !== previousDigest
  ) {
    throw new Error("Yıllık yayın predecessor zinciri önceki doğrulanmış payload ile eşleşmiyor.");
  }
}

export async function verifyPremiumAnnualReleaseSetJws(
  compactJws: string,
  options: VerifyPremiumAnnualReleaseSetOptions,
): Promise<VerifiedPremiumAnnualReleaseSet> {
  const cryptoProvider = globalThis.crypto;
  if (!cryptoProvider?.subtle) {
    throw new Error("Yıllık premium yayın doğrulaması için WebCrypto kullanılamıyor.");
  }
  if (typeof compactJws !== "string") {
    throw new Error("Yıllık premium yayın imzası compact JWS metni olmalıdır.");
  }
  if (new TextEncoder().encode(compactJws).byteLength > MAX_COMPACT_JWS_BYTES) {
    throw new Error("Yıllık premium yayın compact JWS güvenli boyut sınırını aşıyor.");
  }
  const segments = compactJws.split(".");
  if (segments.length !== 3) {
    throw new Error("Yıllık premium yayın imzası üç segmentli compact JWS olmalıdır.");
  }
  const [headerSegment, payloadSegment, signatureSegment] = segments;
  const headerBytes = decodeBase64Url(headerSegment, "Yıllık yayın JWS header segmenti");
  const payloadBytes = decodeBase64Url(payloadSegment, "Yıllık yayın JWS payload segmenti");
  const signature = decodeBase64Url(signatureSegment, "Yıllık yayın JWS imza segmenti");
  if (
    encodeBase64Url(headerBytes) !== headerSegment ||
    encodeBase64Url(payloadBytes) !== payloadSegment ||
    encodeBase64Url(signature) !== signatureSegment
  ) {
    throw new Error("Yıllık premium yayın compact JWS segmentleri kanonik base64url olmalıdır.");
  }
  if (signature.byteLength !== 64) {
    throw new Error("Yıllık yayın ES256 imzası exact 64 bayt olmalıdır.");
  }
  const rawHeader = record(
    parseJsonText(decodeUtf8(headerBytes, "Yıllık yayın JWS header'ı"), "Yıllık yayın JWS header'ı"),
    "Yıllık yayın JWS header'ı",
  );
  exactKeys(rawHeader, HEADER_KEYS, "Yıllık yayın JWS header'ı");
  if (rawHeader.alg !== "ES256" || rawHeader.typ !== PREMIUM_ANNUAL_RELEASE_JWS_TYPE) {
    throw new Error("Yıllık yayın JWS header'ı exact ES256 ve içerik yayın typ değerini taşımalıdır.");
  }
  const kid = requiredText(rawHeader.kid, "Yıllık yayın JWS kid değeri", 128);
  const trustedJwk = options.trustedKeys[kid];
  if (!trustedJwk) {
    throw new Error(`Yıllık yayın JWS kid değeri güvenilir değil: ${kid}.`);
  }
  assertTrustedEs256Jwk(trustedJwk, kid);
  const headerText = decodeUtf8(headerBytes, "Yıllık yayın JWS header'ı");
  if (canonicalJsonText(rawHeader) !== headerText) {
    throw new Error("Yıllık yayın JWS header'ı kanonik JSON olmalıdır.");
  }
  const payloadText = decodeUtf8(payloadBytes, "Yıllık yayın JWS payload'ı");
  const rawPayload = parseJsonText(payloadText, "Yıllık yayın JWS payload'ı");
  if (canonicalJsonText(rawPayload) !== payloadText) {
    throw new Error("Yıllık yayın JWS payload'ı kanonik JSON olmalıdır.");
  }

  let publicKey: CryptoKey;
  try {
    publicKey = await cryptoProvider.subtle.importKey(
      "jwk",
      trustedJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  } catch {
    throw new Error(`Güvenilen yıllık yayın anahtarı (${kid}) içe aktarılamadı.`);
  }
  const signingInput = new TextEncoder().encode(`${headerSegment}.${payloadSegment}`);
  const validSignature = await cryptoProvider.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    signature,
    signingInput,
  );
  if (!validSignature) {
    throw new Error("Yıllık premium yayın JWS imzası geçersiz.");
  }

  const payload = parsePremiumAnnualReleaseSetPayload(rawPayload);
  const expectedIssuer = httpsIssuer(
    options.expectedIssuer,
    "Beklenen yıllık içerik otoritesi issuer değeri",
  );
  const expectedAudience = requiredText(
    options.expectedAudience,
    "Beklenen yıllık içerik otoritesi audience değeri",
  );
  if (payload.iss !== expectedIssuer || payload.aud !== expectedAudience) {
    throw new Error("Yıllık premium yayın issuer veya audience otoritesiyle uyuşmuyor.");
  }
  const expectedReleaseSetId = requiredText(
    options.expectedReleaseSetId,
    "Beklenen yıllık yayın seti kimliği",
  );
  const expectedSku = requiredText(
    options.expectedSku,
    "Beklenen yıllık yayın SKU'su",
    40,
  );
  const expectedAcademicRelease = requiredText(
    options.expectedAcademicRelease,
    "Beklenen yıllık akademik yayın",
    9,
  );
  if (
    !RELEASE_SET_ID_PATTERN.test(expectedReleaseSetId) ||
    !SKU_PATTERN.test(expectedSku)
  ) {
    throw new Error("Beklenen yıllık yayın kimliği veya SKU biçimi geçersiz.");
  }
  academicMonthKeys(expectedAcademicRelease);
  if (
    payload.releaseSetId !== expectedReleaseSetId ||
    payload.sku !== expectedSku ||
    payload.academicRelease !== expectedAcademicRelease
  ) {
    throw new Error(
      "Yıllık premium yayın seti beklenen ürün, SKU veya akademik yayın kimliğiyle uyuşmuyor.",
    );
  }
  const payloadSha256 = await digestBytes(payloadBytes);
  assertReleaseTransition(payload, payloadSha256, options.previous);
  const verified: VerifiedPremiumAnnualReleaseSet = deepFreeze({
    [VERIFIED_PREMIUM_ANNUAL_RELEASE_SET]: true,
    compactJws,
    header: { alg: "ES256", kid, typ: PREMIUM_ANNUAL_RELEASE_JWS_TYPE },
    payload,
    payloadSha256,
    verification: {
      scheme: PREMIUM_ANNUAL_RELEASE_VERIFICATION_SCHEME,
      trustedKeyId: kid,
      issuer: expectedIssuer,
      audience: expectedAudience,
      releaseSetId: expectedReleaseSetId,
      sku: expectedSku,
      academicRelease: expectedAcademicRelease,
    },
  });
  verifiedPremiumAnnualReleaseSets.add(verified);
  return verified;
}

export function premiumAnnualReleaseAnchor(
  verified: VerifiedPremiumAnnualReleaseSet,
): PremiumAnnualReleaseAnchor {
  assertVerifiedPremiumAnnualReleaseSet(verified);
  return Object.freeze({
    releaseSetId: verified.payload.releaseSetId,
    revision: verified.payload.revision,
    payloadSha256: verified.payloadSha256,
  });
}

const SEPTEMBER_V3_PACK_REFERENCE = Object.freeze({
  contentPackId: PREMIUM_VALUES_V3_RELEASE_IDENTITY.id,
  contentPackVersion: PREMIUM_VALUES_V3_RELEASE_IDENTITY.version,
  contentReleaseId: PREMIUM_VALUES_V3_RELEASE_IDENTITY.contentReleaseId,
  reviewStatus: PREMIUM_VALUES_V3_RELEASE_IDENTITY.valuesMappingStatus,
  content: Object.freeze({
    path: "premium-content/releases/tymm-6072/2026-09/content.v3.json",
    sha256: PREMIUM_V3_PREVIEW_RELEASE_LOCK.contentRawSha256,
    byteLength: PREMIUM_V3_PREVIEW_RELEASE_LOCK.contentRawByteLength,
  }),
  manifest: Object.freeze({
    path: "premium-content/releases/tymm-6072/2026-09/manifest.v3.json",
    sha256: PREMIUM_V3_PREVIEW_RELEASE_LOCK.manifestRawSha256,
    byteLength: 1_911,
  }),
} satisfies PremiumAnnualReleasePackReference);

export const CURRENT_PREMIUM_ANNUAL_RELEASE_2026_2027_SLOTS = deepFreeze(
  PREMIUM_ANNUAL_RELEASE_2026_2027_MONTH_KEYS.map(
    (monthKey, index): PremiumAnnualReleaseSlot =>
      index === 0
        ? { monthKey, state: "published", pack: SEPTEMBER_V3_PACK_REFERENCE }
        : { monthKey, state: "unpublished", pack: null },
  ),
);

export function createCurrentPremiumAnnualRelease2026_2027Payload(input: {
  readonly issuer: string;
  readonly audience: string;
  readonly issuedAtUtc: string;
}): PremiumAnnualReleaseSetPayload {
  return parsePremiumAnnualReleaseSetPayload({
    schemaVersion: 1,
    type: PREMIUM_ANNUAL_RELEASE_SET_TYPE,
    releaseSetId: "tymm-6072-2026-2027-annual-release-set",
    sku: PREMIUM_VALUES_V3_RELEASE_IDENTITY.sku,
    academicRelease: PREMIUM_VALUES_V3_RELEASE_IDENTITY.academicRelease,
    revision: 1,
    predecessor: null,
    iss: input.issuer,
    aud: input.audience,
    issuedAtUtc: input.issuedAtUtc,
    slots: CURRENT_PREMIUM_ANNUAL_RELEASE_2026_2027_SLOTS,
  });
}
