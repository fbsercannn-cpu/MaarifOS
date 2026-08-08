import {
  PREMIUM_ANNUAL_RELEASE_JWS_TYPE,
  PREMIUM_ANNUAL_RELEASE_VERIFICATION_SCHEME,
  assertVerifiedPremiumAnnualReleaseSet,
  parsePremiumAnnualReleaseSetPayload,
  serializePremiumAnnualReleaseSetPayload,
  type PremiumAnnualReleaseAnchor,
  type PremiumAnnualReleaseMonthKey,
  type PremiumAnnualReleaseSetPayload,
  type PremiumAnnualReleaseVerificationProof,
  type Sha256Digest,
  type VerifiedPremiumAnnualReleaseSet,
} from "../premium-plans/annual-release-manifest.ts";

export const PREMIUM_CONTENT_CACHE_DATABASE_NAME = "maarifos-premium-content";
export const PREMIUM_CONTENT_CACHE_DATABASE_VERSION = 2;

const CONTENT_BUNDLE_STORE = "content-bundles";
const ANNUAL_RELEASE_SET_STORE = "annual-release-sets";
const MONTHLY_CONTENT_BUNDLE_STORE = "monthly-content-bundles";
const ANNUAL_RELEASE_STATE_STORE = "annual-release-state";
const ACTIVE_CONTENT_BUNDLE_KEY = "active";
const ACTIVE_ANNUAL_RELEASE_KEY = "active";
const LEGACY_ACTIVE_BUNDLE_RECORD_ID = "legacy:active";
const CACHE_SCHEMA_VERSION = 2 as const;
const MAX_CONTENT_BYTES = 4 * 1024 * 1024;
const MAX_STORED_RELEASE_SETS = 64;
const MAX_STORED_MONTHLY_BUNDLES = 240;

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const MACHINE_ID_PATTERN = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/u;
const RELEASE_SET_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,127}$/u;
const SKU_PATTERN = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/u;
const SEMVER_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/u;
const ACADEMIC_RELEASE_PATTERN = /^20\d{2}-20\d{2}$/u;
const MONTH_KEY_PATTERN = /^20\d{2}-(?:0[1-9]|1[0-2])$/u;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const COMPACT_JWS_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const MAX_COMPACT_JWS_LENGTH = 512_000;

export interface StoredPremiumContentBundle {
  id: typeof ACTIVE_CONTENT_BUNDLE_KEY;
  schemaVersion: 1;
  contentReleaseId: string;
  contentPackId: string;
  contentPackVersion: string;
  manifestDigest: string;
  sku: string;
  academicRelease: string;
  contentSha256: string;
  contentByteLength: number;
  contentJson: string;
  savedAtUtc: string;
}

export interface PremiumContentBundleStore {
  load(): Promise<StoredPremiumContentBundle | null>;
  save(record: Omit<StoredPremiumContentBundle, "id">): Promise<void>;
  clear(): Promise<void>;
  close(): void;
}

export interface PremiumAnnualMonthlyContentBundleInput
  extends Omit<StoredPremiumContentBundle, "id"> {
  readonly monthKey: PremiumAnnualReleaseMonthKey;
}

export interface StoredPremiumMonthlyContentBundle
  extends Omit<StoredPremiumContentBundle, "id"> {
  readonly id: string;
  readonly cacheSchemaVersion: typeof CACHE_SCHEMA_VERSION;
  readonly monthKey: PremiumAnnualReleaseMonthKey;
}

export interface StoredPremiumAnnualReleaseSet {
  readonly id: string;
  readonly cacheSchemaVersion: typeof CACHE_SCHEMA_VERSION;
  readonly releaseSetId: string;
  readonly revision: number;
  readonly payloadSha256: Sha256Digest;
  readonly compactJws: string;
  readonly header: VerifiedPremiumAnnualReleaseSet["header"];
  readonly payload: PremiumAnnualReleaseSetPayload;
  readonly verification: PremiumAnnualReleaseVerificationProof;
  readonly verifiedAtUtc: string;
}

export type StoredPremiumAnnualReleaseSlotPointer =
  | {
      readonly monthKey: PremiumAnnualReleaseMonthKey;
      readonly state: "published";
      readonly bundleSource: "monthly-v2" | "legacy-active";
      readonly bundleRecordId: string;
    }
  | {
      readonly monthKey: PremiumAnnualReleaseMonthKey;
      readonly state: "unpublished";
      readonly bundleSource: null;
      readonly bundleRecordId: null;
    };

export interface StoredPremiumAnnualReleasePointer {
  readonly id: typeof ACTIVE_ANNUAL_RELEASE_KEY;
  readonly cacheSchemaVersion: typeof CACHE_SCHEMA_VERSION;
  readonly releaseSetRecordId: string;
  readonly releaseSetId: string;
  readonly revision: number;
  readonly payloadSha256: Sha256Digest;
  readonly committedAtUtc: string;
  readonly slots: readonly StoredPremiumAnnualReleaseSlotPointer[];
}

export interface PremiumAnnualContentCacheCommitInput {
  readonly releaseSet: VerifiedPremiumAnnualReleaseSet;
  readonly bundles: readonly PremiumAnnualMonthlyContentBundleInput[];
  readonly committedAtUtc: string;
}

export interface LoadedPremiumAnnualMonthlyBundle {
  readonly monthKey: PremiumAnnualReleaseMonthKey;
  readonly source: "monthly-v2" | "legacy-active";
  readonly record: StoredPremiumMonthlyContentBundle | StoredPremiumContentBundle;
}

export interface LoadedPremiumAnnualContentCache {
  readonly pointer: StoredPremiumAnnualReleasePointer;
  readonly releaseSet: StoredPremiumAnnualReleaseSet;
  readonly bundles: readonly LoadedPremiumAnnualMonthlyBundle[];
}

export interface PremiumMonthlyContentBundleReference {
  readonly monthKey: PremiumAnnualReleaseMonthKey;
  readonly contentReleaseId: string;
  readonly contentPackId: string;
  readonly contentPackVersion: string;
  readonly manifestDigest: string;
  readonly sku: string;
  readonly academicRelease: string;
  readonly contentSha256: string;
  readonly contentByteLength: number;
}

export interface PremiumAnnualContentCacheStore {
  commitVerifiedAnnualReleaseSet(
    input: PremiumAnnualContentCacheCommitInput,
  ): Promise<StoredPremiumAnnualReleasePointer>;
  loadActiveAnnualContentCache(): Promise<LoadedPremiumAnnualContentCache | null>;
  loadMonthlyContentBundle(
    reference: PremiumMonthlyContentBundleReference,
  ): Promise<StoredPremiumMonthlyContentBundle | StoredPremiumContentBundle | null>;
  listMonthlyContentBundles(): Promise<readonly StoredPremiumMonthlyContentBundle[]>;
}

interface PremiumAnnualCacheSnapshot {
  readonly legacyActive: StoredPremiumContentBundle | null;
  readonly releaseSets: readonly StoredPremiumAnnualReleaseSet[];
  readonly monthlyBundles: readonly StoredPremiumMonthlyContentBundle[];
  readonly activePointer: StoredPremiumAnnualReleasePointer | null;
}

interface PreparedAnnualContentCacheCommit {
  readonly releaseSet: StoredPremiumAnnualReleaseSet;
  readonly bundles: readonly StoredPremiumMonthlyContentBundle[];
  readonly committedAtUtc: string;
}

interface ResolvedAnnualContentCacheCommit {
  readonly releaseSetToPut: StoredPremiumAnnualReleaseSet | null;
  readonly bundlesToPut: readonly StoredPremiumMonthlyContentBundle[];
  readonly pointer: StoredPremiumAnnualReleasePointer;
}

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

function boundedText(
  value: unknown,
  label: string,
  pattern: RegExp,
  maximumLength = 300,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value !== value.trim() ||
    value !== value.normalize("NFC") ||
    !pattern.test(value)
  ) {
    throw new Error(`${label} geçersiz.`);
  }
  return value;
}

function sha256Digest(value: unknown, label: string): Sha256Digest {
  return boundedText(value, label, SHA256_PATTERN, 100) as Sha256Digest;
}

function utcTimestamp(value: unknown, label: string): string {
  const timestamp = boundedText(value, label, UTC_TIMESTAMP_PATTERN, 64);
  if (Number.isNaN(Date.parse(timestamp)) || new Date(timestamp).toISOString() !== timestamp) {
    throw new Error(`${label} milisaniyeli UTC ISO-8601 biçiminde olmalıdır.`);
  }
  return timestamp;
}

function positiveSafeInteger(value: unknown, label: string, maximum: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > maximum) {
    throw new Error(`${label} pozitif ve sınırlar içinde bir tam sayı olmalıdır.`);
  }
  return Number(value);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested, seen);
  }
  return Object.freeze(value);
}

async function sha256Hex(text: string): Promise<Sha256Digest> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Premium içerik önbelleği doğrulaması için WebCrypto kullanılamıyor.");
  }
  const digest = new Uint8Array(
    await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
  );
  return `sha256:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function validateBundleMetadata(
  value: PremiumMonthlyContentBundleReference,
  label: string,
): PremiumMonthlyContentBundleReference {
  const item = record(value, label);
  exactKeys(
    item,
    [
      "academicRelease",
      "contentByteLength",
      "contentPackId",
      "contentPackVersion",
      "contentReleaseId",
      "contentSha256",
      "manifestDigest",
      "monthKey",
      "sku",
    ],
    label,
  );
  return deepFreeze({
    monthKey: boundedText(item.monthKey, `${label} ayı`, MONTH_KEY_PATTERN, 7) as PremiumAnnualReleaseMonthKey,
    contentReleaseId: boundedText(
      item.contentReleaseId,
      `${label} içerik yayın kimliği`,
      MACHINE_ID_PATTERN,
      200,
    ),
    contentPackId: boundedText(
      item.contentPackId,
      `${label} paket kimliği`,
      MACHINE_ID_PATTERN,
      200,
    ),
    contentPackVersion: boundedText(
      item.contentPackVersion,
      `${label} paket sürümü`,
      SEMVER_PATTERN,
      80,
    ),
    manifestDigest: sha256Digest(item.manifestDigest, `${label} manifest özeti`),
    sku: boundedText(item.sku, `${label} SKU`, SKU_PATTERN, 80),
    academicRelease: boundedText(
      item.academicRelease,
      `${label} akademik sürümü`,
      ACADEMIC_RELEASE_PATTERN,
      9,
    ),
    contentSha256: sha256Digest(item.contentSha256, `${label} içerik özeti`),
    contentByteLength: positiveSafeInteger(
      item.contentByteLength,
      `${label} içerik bayt uzunluğu`,
      MAX_CONTENT_BYTES,
    ),
  });
}

function monthlyBundleKeyFromReference(reference: PremiumMonthlyContentBundleReference): string {
  return [
    "monthly-v2",
    reference.sku,
    reference.academicRelease,
    reference.monthKey,
    reference.contentReleaseId,
    reference.contentPackId,
    reference.contentPackVersion,
    reference.manifestDigest,
    reference.contentSha256,
    String(reference.contentByteLength),
  ].join("|");
}

export function premiumMonthlyContentBundleRecordId(
  value: PremiumMonthlyContentBundleReference,
): string {
  return monthlyBundleKeyFromReference(
    validateBundleMetadata(value, "Aylık premium içerik referansı"),
  );
}

function releaseSetRecordId(reference: PremiumAnnualReleaseAnchor): string {
  const releaseSetId = boundedText(
    reference.releaseSetId,
    "Yıllık yayın seti kimliği",
    RELEASE_SET_ID_PATTERN,
    128,
  );
  const revision = positiveSafeInteger(reference.revision, "Yıllık yayın revizyonu", 10_000);
  const payloadSha256 = sha256Digest(reference.payloadSha256, "Yıllık yayın payload özeti");
  return `annual-v2|${releaseSetId}|${revision}|${payloadSha256}`;
}

function bundleReferenceFromInput(
  value: PremiumAnnualMonthlyContentBundleInput,
): PremiumMonthlyContentBundleReference {
  return {
    monthKey: value.monthKey,
    contentReleaseId: value.contentReleaseId,
    contentPackId: value.contentPackId,
    contentPackVersion: value.contentPackVersion,
    manifestDigest: value.manifestDigest,
    sku: value.sku,
    academicRelease: value.academicRelease,
    contentSha256: value.contentSha256,
    contentByteLength: value.contentByteLength,
  };
}

function bundleReferenceFromStored(
  value: StoredPremiumMonthlyContentBundle,
): PremiumMonthlyContentBundleReference {
  return bundleReferenceFromInput(value);
}

function legacyReferenceForMonth(
  value: StoredPremiumContentBundle,
  monthKey: PremiumAnnualReleaseMonthKey,
): PremiumMonthlyContentBundleReference {
  return {
    monthKey,
    contentReleaseId: value.contentReleaseId,
    contentPackId: value.contentPackId,
    contentPackVersion: value.contentPackVersion,
    manifestDigest: value.manifestDigest,
    sku: value.sku,
    academicRelease: value.academicRelease,
    contentSha256: value.contentSha256,
    contentByteLength: value.contentByteLength,
  };
}

function sameBundleReference(
  left: PremiumMonthlyContentBundleReference,
  right: PremiumMonthlyContentBundleReference,
): boolean {
  return monthlyBundleKeyFromReference(left) === monthlyBundleKeyFromReference(right);
}

function exactLegacyBundle(value: unknown, label: string): StoredPremiumContentBundle {
  const item = record(value, label);
  exactKeys(
    item,
    [
      "academicRelease",
      "contentByteLength",
      "contentJson",
      "contentPackId",
      "contentPackVersion",
      "contentReleaseId",
      "contentSha256",
      "id",
      "manifestDigest",
      "savedAtUtc",
      "schemaVersion",
      "sku",
    ],
    label,
  );
  if (item.id !== ACTIVE_CONTENT_BUNDLE_KEY || item.schemaVersion !== 1) {
    throw new Error(`${label} legacy active anahtar/şema sözleşmesini bozuyor.`);
  }
  const contentJson = typeof item.contentJson === "string" ? item.contentJson : "";
  const contentBytes = new TextEncoder().encode(contentJson);
  const metadata = validateBundleMetadata({
    monthKey: "2026-09",
    contentReleaseId: String(item.contentReleaseId ?? ""),
    contentPackId: String(item.contentPackId ?? ""),
    contentPackVersion: String(item.contentPackVersion ?? ""),
    manifestDigest: String(item.manifestDigest ?? ""),
    sku: String(item.sku ?? ""),
    academicRelease: String(item.academicRelease ?? ""),
    contentSha256: String(item.contentSha256 ?? ""),
    contentByteLength: item.contentByteLength as number,
  }, label);
  if (contentJson.length === 0 || contentBytes.byteLength !== metadata.contentByteLength) {
    throw new Error(`${label} içerik baytları kayıt uzunluğuyla uyuşmuyor.`);
  }
  return deepFreeze({
    id: ACTIVE_CONTENT_BUNDLE_KEY,
    schemaVersion: 1,
    contentReleaseId: metadata.contentReleaseId,
    contentPackId: metadata.contentPackId,
    contentPackVersion: metadata.contentPackVersion,
    manifestDigest: metadata.manifestDigest,
    sku: metadata.sku,
    academicRelease: metadata.academicRelease,
    contentSha256: metadata.contentSha256,
    contentByteLength: metadata.contentByteLength,
    contentJson,
    savedAtUtc: utcTimestamp(item.savedAtUtc, `${label} kayıt zamanı`),
  });
}

async function prepareMonthlyBundle(
  value: PremiumAnnualMonthlyContentBundleInput,
  committedAtUtc: string,
): Promise<StoredPremiumMonthlyContentBundle> {
  const item = record(value, "Aylık premium içerik bundle'ı");
  exactKeys(
    item,
    [
      "academicRelease",
      "contentByteLength",
      "contentJson",
      "contentPackId",
      "contentPackVersion",
      "contentReleaseId",
      "contentSha256",
      "manifestDigest",
      "monthKey",
      "savedAtUtc",
      "schemaVersion",
      "sku",
    ],
    "Aylık premium içerik bundle'ı",
  );
  if (item.schemaVersion !== 1 || typeof item.contentJson !== "string") {
    throw new Error("Aylık premium içerik bundle şeması veya payload'ı geçersiz.");
  }
  const metadata = validateBundleMetadata(
    bundleReferenceFromInput(value),
    "Aylık premium içerik bundle'ı",
  );
  const contentBytes = new TextEncoder().encode(item.contentJson);
  if (
    item.contentJson.length === 0 ||
    contentBytes.byteLength !== metadata.contentByteLength ||
    await sha256Hex(item.contentJson) !== metadata.contentSha256
  ) {
    throw new Error("Aylık premium içerik bundle bayt/özet zinciri uyuşmuyor.");
  }
  const savedAtUtc = utcTimestamp(item.savedAtUtc, "Aylık premium içerik kayıt zamanı");
  if (savedAtUtc > committedAtUtc) {
    throw new Error("Aylık premium içerik kayıt zamanı commit zamanından sonra olamaz.");
  }
  return deepFreeze({
    id: monthlyBundleKeyFromReference(metadata),
    cacheSchemaVersion: CACHE_SCHEMA_VERSION,
    schemaVersion: 1,
    ...metadata,
    contentJson: item.contentJson,
    savedAtUtc,
  });
}

function exactReleaseSetMaterial(
  value: unknown,
  label: string,
): {
  compactJws: string;
  header: VerifiedPremiumAnnualReleaseSet["header"];
  payload: PremiumAnnualReleaseSetPayload;
  payloadSha256: Sha256Digest;
  verification: PremiumAnnualReleaseVerificationProof;
} {
  const item = record(value, label);
  exactKeys(
    item,
    ["compactJws", "header", "payload", "payloadSha256", "verification"],
    label,
  );
  const header = record(item.header, `${label} JWS header'ı`);
  exactKeys(header, ["alg", "kid", "typ"], `${label} JWS header'ı`);
  if (
    header.alg !== "ES256" ||
    header.typ !== PREMIUM_ANNUAL_RELEASE_JWS_TYPE ||
    typeof header.kid !== "string" ||
    header.kid.length === 0 ||
    header.kid.length > 128 ||
    !/^[A-Za-z0-9._-]+$/u.test(header.kid)
  ) {
    throw new Error(`${label} JWS header'ı geçersiz.`);
  }
  const payload = parsePremiumAnnualReleaseSetPayload(item.payload);
  const verification = record(item.verification, `${label} doğrulama kanıtı`);
  exactKeys(
    verification,
    [
      "academicRelease",
      "audience",
      "issuer",
      "releaseSetId",
      "scheme",
      "sku",
      "trustedKeyId",
    ],
    `${label} doğrulama kanıtı`,
  );
  if (
    verification.scheme !== PREMIUM_ANNUAL_RELEASE_VERIFICATION_SCHEME ||
    verification.trustedKeyId !== header.kid ||
    verification.issuer !== payload.iss ||
    verification.audience !== payload.aud ||
    verification.releaseSetId !== payload.releaseSetId ||
    verification.sku !== payload.sku ||
    verification.academicRelease !== payload.academicRelease
  ) {
    throw new Error(`${label} trusted doğrulama kanıtıyla uyuşmuyor.`);
  }
  return deepFreeze({
    compactJws: boundedText(
      item.compactJws,
      `${label} compact JWS değeri`,
      COMPACT_JWS_PATTERN,
      MAX_COMPACT_JWS_LENGTH,
    ),
    header: {
      alg: "ES256",
      kid: header.kid,
      typ: PREMIUM_ANNUAL_RELEASE_JWS_TYPE,
    },
    payload,
    payloadSha256: sha256Digest(item.payloadSha256, "Yıllık yayın payload özeti"),
    verification: {
      scheme: PREMIUM_ANNUAL_RELEASE_VERIFICATION_SCHEME,
      trustedKeyId: header.kid,
      issuer: payload.iss,
      audience: payload.aud,
      releaseSetId: payload.releaseSetId,
      sku: payload.sku,
      academicRelease: payload.academicRelease,
    },
  });
}

function exactVerifiedReleaseSet(
  value: VerifiedPremiumAnnualReleaseSet,
): ReturnType<typeof exactReleaseSetMaterial> {
  assertVerifiedPremiumAnnualReleaseSet(value);
  return exactReleaseSetMaterial(
    value,
    "Doğrulanmış yıllık premium yayın seti",
  );
}

async function prepareAnnualCommit(
  input: PremiumAnnualContentCacheCommitInput,
): Promise<PreparedAnnualContentCacheCommit> {
  const item = record(input, "Yıllık premium önbellek commit girdisi");
  exactKeys(item, ["bundles", "committedAtUtc", "releaseSet"], "Yıllık premium önbellek commit girdisi");
  if (!Array.isArray(item.bundles) || item.bundles.length > 10) {
    throw new Error("Yıllık premium önbellek commit'i en fazla 10 aylık bundle taşıyabilir.");
  }
  const committedAtUtc = utcTimestamp(item.committedAtUtc, "Yıllık premium önbellek commit zamanı");
  const release = exactVerifiedReleaseSet(input.releaseSet);
  const canonicalPayload = serializePremiumAnnualReleaseSetPayload(release.payload);
  if (await sha256Hex(canonicalPayload) !== release.payloadSha256) {
    throw new Error("Yıllık premium yayın payload özeti kanonik payload baytlarıyla uyuşmuyor.");
  }
  const preparedBundles = await Promise.all(
    input.bundles.map((bundle) => prepareMonthlyBundle(bundle, committedAtUtc)),
  );
  const byMonth = new Map<string, StoredPremiumMonthlyContentBundle>();
  for (const bundle of preparedBundles) {
    if (byMonth.has(bundle.monthKey)) {
      throw new Error(`Yıllık premium önbellek commit'inde ${bundle.monthKey} ayı yineleniyor.`);
    }
    byMonth.set(bundle.monthKey, bundle);
    const slot = release.payload.slots.find((candidate) => candidate.monthKey === bundle.monthKey);
    if (!slot || slot.state !== "published") {
      throw new Error(`${bundle.monthKey} yayımlanmamış olduğu için bundle commit edilemez.`);
    }
    if (
      release.payload.sku !== bundle.sku ||
      release.payload.academicRelease !== bundle.academicRelease ||
      slot.pack.contentReleaseId !== bundle.contentReleaseId ||
      slot.pack.contentPackId !== bundle.contentPackId ||
      slot.pack.contentPackVersion !== bundle.contentPackVersion ||
      slot.pack.manifest.sha256 !== bundle.manifestDigest ||
      slot.pack.content.sha256 !== bundle.contentSha256 ||
      slot.pack.content.byteLength !== bundle.contentByteLength
    ) {
      throw new Error(`${bundle.monthKey} bundle'ı yıllık yayın setindeki exact paket/artefakt zinciriyle uyuşmuyor.`);
    }
  }
  const anchor: PremiumAnnualReleaseAnchor = {
    releaseSetId: release.payload.releaseSetId,
    revision: release.payload.revision,
    payloadSha256: release.payloadSha256,
  };
  return deepFreeze({
    releaseSet: {
      id: releaseSetRecordId(anchor),
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      releaseSetId: release.payload.releaseSetId,
      revision: release.payload.revision,
      payloadSha256: release.payloadSha256,
      compactJws: release.compactJws,
      header: release.header,
      payload: release.payload,
      verification: release.verification,
      verifiedAtUtc: committedAtUtc,
    },
    bundles: preparedBundles,
    committedAtUtc,
  });
}

function exactStoredMonthlyBundle(value: unknown): StoredPremiumMonthlyContentBundle {
  const item = record(value, "Saklanan aylık premium içerik bundle'ı");
  exactKeys(
    item,
    [
      "academicRelease",
      "cacheSchemaVersion",
      "contentByteLength",
      "contentJson",
      "contentPackId",
      "contentPackVersion",
      "contentReleaseId",
      "contentSha256",
      "id",
      "manifestDigest",
      "monthKey",
      "savedAtUtc",
      "schemaVersion",
      "sku",
    ],
    "Saklanan aylık premium içerik bundle'ı",
  );
  if (
    item.cacheSchemaVersion !== CACHE_SCHEMA_VERSION ||
    item.schemaVersion !== 1 ||
    typeof item.contentJson !== "string" ||
    item.contentJson.length === 0
  ) {
    throw new Error("Saklanan aylık premium içerik bundle şeması geçersiz.");
  }
  const metadata = validateBundleMetadata({
    monthKey: item.monthKey as PremiumAnnualReleaseMonthKey,
    contentReleaseId: String(item.contentReleaseId ?? ""),
    contentPackId: String(item.contentPackId ?? ""),
    contentPackVersion: String(item.contentPackVersion ?? ""),
    manifestDigest: String(item.manifestDigest ?? ""),
    sku: String(item.sku ?? ""),
    academicRelease: String(item.academicRelease ?? ""),
    contentSha256: String(item.contentSha256 ?? ""),
    contentByteLength: item.contentByteLength as number,
  }, "Saklanan aylık premium içerik bundle'ı");
  if (
    item.id !== monthlyBundleKeyFromReference(metadata) ||
    new TextEncoder().encode(item.contentJson).byteLength !== metadata.contentByteLength
  ) {
    throw new Error("Saklanan aylık premium içerik bundle kimlik/bayt zinciri geçersiz.");
  }
  return deepFreeze({
    id: item.id,
    cacheSchemaVersion: CACHE_SCHEMA_VERSION,
    schemaVersion: 1,
    ...metadata,
    contentJson: item.contentJson,
    savedAtUtc: utcTimestamp(item.savedAtUtc, "Saklanan aylık premium içerik kayıt zamanı"),
  });
}

function exactStoredReleaseSet(value: unknown): StoredPremiumAnnualReleaseSet {
  const item = record(value, "Saklanan yıllık premium yayın seti");
  exactKeys(
    item,
    [
      "cacheSchemaVersion",
      "compactJws",
      "header",
      "id",
      "payload",
      "payloadSha256",
      "releaseSetId",
      "revision",
      "verification",
      "verifiedAtUtc",
    ],
    "Saklanan yıllık premium yayın seti",
  );
  if (item.cacheSchemaVersion !== CACHE_SCHEMA_VERSION) {
    throw new Error("Saklanan yıllık premium yayın seti şeması geçersiz.");
  }
  const release = exactReleaseSetMaterial(
    {
      compactJws: item.compactJws,
      header: item.header,
      payload: item.payload,
      payloadSha256: item.payloadSha256,
      verification: item.verification,
    },
    "Saklanan yıllık premium yayın seti",
  );
  const anchor = {
    releaseSetId: release.payload.releaseSetId,
    revision: release.payload.revision,
    payloadSha256: release.payloadSha256,
  };
  if (
    item.releaseSetId !== anchor.releaseSetId ||
    item.revision !== anchor.revision ||
    item.id !== releaseSetRecordId(anchor)
  ) {
    throw new Error("Saklanan yıllık premium yayın seti kimlik zinciri geçersiz.");
  }
  return deepFreeze({
    id: item.id,
    cacheSchemaVersion: CACHE_SCHEMA_VERSION,
    releaseSetId: anchor.releaseSetId,
    revision: anchor.revision,
    payloadSha256: anchor.payloadSha256,
    compactJws: release.compactJws,
    header: release.header,
    payload: release.payload,
    verification: release.verification,
    verifiedAtUtc: utcTimestamp(item.verifiedAtUtc, "Saklanan yıllık yayın doğrulama zamanı"),
  });
}

function exactStoredPointer(value: unknown): StoredPremiumAnnualReleasePointer {
  const item = record(value, "Aktif yıllık premium yayın göstergesi");
  exactKeys(
    item,
    [
      "cacheSchemaVersion",
      "committedAtUtc",
      "id",
      "payloadSha256",
      "releaseSetId",
      "releaseSetRecordId",
      "revision",
      "slots",
    ],
    "Aktif yıllık premium yayın göstergesi",
  );
  if (
    item.id !== ACTIVE_ANNUAL_RELEASE_KEY ||
    item.cacheSchemaVersion !== CACHE_SCHEMA_VERSION ||
    !Array.isArray(item.slots) ||
    item.slots.length !== 10
  ) {
    throw new Error("Aktif yıllık premium yayın göstergesi şema/slot sözleşmesini bozuyor.");
  }
  const releaseSetId = boundedText(
    item.releaseSetId,
    "Aktif yıllık yayın seti kimliği",
    RELEASE_SET_ID_PATTERN,
    128,
  );
  const revision = positiveSafeInteger(item.revision, "Aktif yıllık yayın revizyonu", 10_000);
  const payloadSha256 = sha256Digest(item.payloadSha256, "Aktif yıllık yayın payload özeti");
  const expectedReleaseSetRecordId = releaseSetRecordId({
    releaseSetId,
    revision,
    payloadSha256,
  });
  if (item.releaseSetRecordId !== expectedReleaseSetRecordId) {
    throw new Error("Aktif yıllık yayın göstergesi exact release-set kaydını göstermiyor.");
  }
  const slots = item.slots.map((rawSlot, index): StoredPremiumAnnualReleaseSlotPointer => {
    const slot = record(rawSlot, `Aktif yıllık yayın slot göstergesi ${index + 1}`);
    exactKeys(
      slot,
      ["bundleRecordId", "bundleSource", "monthKey", "state"],
      `Aktif yıllık yayın slot göstergesi ${index + 1}`,
    );
    const monthKey = boundedText(
      slot.monthKey,
      `Aktif yıllık yayın slot göstergesi ${index + 1} ayı`,
      MONTH_KEY_PATTERN,
      7,
    ) as PremiumAnnualReleaseMonthKey;
    if (slot.state === "unpublished") {
      if (slot.bundleSource !== null || slot.bundleRecordId !== null) {
        throw new Error(`${monthKey} unpublished göstergesi bundle kaydı taşıyamaz.`);
      }
      return { monthKey, state: "unpublished", bundleSource: null, bundleRecordId: null };
    }
    if (
      slot.state !== "published" ||
      (slot.bundleSource !== "monthly-v2" && slot.bundleSource !== "legacy-active") ||
      typeof slot.bundleRecordId !== "string" ||
      slot.bundleRecordId.length === 0 ||
      slot.bundleRecordId.length > 1_024 ||
      (slot.bundleSource === "legacy-active" && slot.bundleRecordId !== LEGACY_ACTIVE_BUNDLE_RECORD_ID)
    ) {
      throw new Error(`${monthKey} published göstergesi exact bundle kaydını göstermiyor.`);
    }
    return {
      monthKey,
      state: "published",
      bundleSource: slot.bundleSource,
      bundleRecordId: slot.bundleRecordId,
    };
  });
  return deepFreeze({
    id: ACTIVE_ANNUAL_RELEASE_KEY,
    cacheSchemaVersion: CACHE_SCHEMA_VERSION,
    releaseSetRecordId: expectedReleaseSetRecordId,
    releaseSetId,
    revision,
    payloadSha256,
    committedAtUtc: utcTimestamp(item.committedAtUtc, "Aktif yıllık yayın commit zamanı"),
    slots,
  });
}

function normalizeSnapshot(snapshot: PremiumAnnualCacheSnapshot): PremiumAnnualCacheSnapshot {
  if (snapshot.releaseSets.length > MAX_STORED_RELEASE_SETS) {
    throw new Error("Yıllık premium yayın seti önbelleği güvenli kayıt sınırını aşıyor.");
  }
  if (snapshot.monthlyBundles.length > MAX_STORED_MONTHLY_BUNDLES) {
    throw new Error("Aylık premium içerik önbelleği güvenli kayıt sınırını aşıyor.");
  }
  return {
    legacyActive: snapshot.legacyActive === null
      ? null
      : exactLegacyBundle(snapshot.legacyActive, "Legacy active premium içerik bundle'ı"),
    releaseSets: snapshot.releaseSets.map(exactStoredReleaseSet),
    monthlyBundles: snapshot.monthlyBundles.map(exactStoredMonthlyBundle),
    activePointer: snapshot.activePointer === null
      ? null
      : exactStoredPointer(snapshot.activePointer),
  };
}

function assertActivePointerIntegrity(snapshot: PremiumAnnualCacheSnapshot): void {
  const pointer = snapshot.activePointer;
  if (!pointer) return;
  const releaseSet = snapshot.releaseSets.find((item) => item.id === pointer.releaseSetRecordId);
  if (
    !releaseSet ||
    releaseSet.releaseSetId !== pointer.releaseSetId ||
    releaseSet.revision !== pointer.revision ||
    releaseSet.payloadSha256 !== pointer.payloadSha256
  ) {
    throw new Error("Aktif yıllık yayın göstergesi saklanan release-set kaydıyla uyuşmuyor.");
  }
  for (let index = 0; index < releaseSet.payload.slots.length; index += 1) {
    const releaseSlot = releaseSet.payload.slots[index];
    const pointerSlot = pointer.slots[index];
    if (
      !pointerSlot ||
      pointerSlot.monthKey !== releaseSlot.monthKey ||
      pointerSlot.state !== releaseSlot.state
    ) {
      throw new Error("Aktif yıllık yayın göstergesi release-set ay/slot sırasıyla uyuşmuyor.");
    }
    if (releaseSlot.state === "unpublished") continue;
    const expected: PremiumMonthlyContentBundleReference = {
      monthKey: releaseSlot.monthKey,
      contentReleaseId: releaseSlot.pack.contentReleaseId,
      contentPackId: releaseSlot.pack.contentPackId,
      contentPackVersion: releaseSlot.pack.contentPackVersion,
      manifestDigest: releaseSlot.pack.manifest.sha256,
      sku: releaseSet.payload.sku,
      academicRelease: releaseSet.payload.academicRelease,
      contentSha256: releaseSlot.pack.content.sha256,
      contentByteLength: releaseSlot.pack.content.byteLength,
    };
    if (pointerSlot.bundleSource === "legacy-active") {
      if (
        !snapshot.legacyActive ||
        !sameBundleReference(
          legacyReferenceForMonth(snapshot.legacyActive, releaseSlot.monthKey),
          expected,
        )
      ) {
        throw new Error(`${releaseSlot.monthKey} legacy pointer'ı exact yayın bundle'ını göstermiyor.`);
      }
      continue;
    }
    const bundle = snapshot.monthlyBundles.find(
      (candidate) => candidate.id === pointerSlot.bundleRecordId,
    );
    if (
      !bundle ||
      !sameBundleReference(bundleReferenceFromStored(bundle), expected)
    ) {
      throw new Error(`${releaseSlot.monthKey} pointer'ı exact aylık yayın bundle'ını göstermiyor.`);
    }
  }
}

async function validatedSnapshotForCommit(
  rawSnapshot: PremiumAnnualCacheSnapshot,
): Promise<PremiumAnnualCacheSnapshot> {
  const snapshot = normalizeSnapshot(rawSnapshot);
  assertActivePointerIntegrity(snapshot);
  if (snapshot.legacyActive) await assertMonthlyBundleDigest(snapshot.legacyActive);
  for (const bundle of snapshot.monthlyBundles) await assertMonthlyBundleDigest(bundle);
  for (const releaseSet of snapshot.releaseSets) {
    if (
      await sha256Hex(serializePremiumAnnualReleaseSetPayload(releaseSet.payload)) !==
      releaseSet.payloadSha256
    ) {
      throw new Error("Saklanan yıllık premium yayın payload özeti uyuşmuyor.");
    }
  }
  return snapshot;
}

function snapshotBytes(snapshot: PremiumAnnualCacheSnapshot): string {
  return JSON.stringify(snapshot);
}

function assertAntiRollback(
  next: StoredPremiumAnnualReleaseSet,
  current: StoredPremiumAnnualReleasePointer | null,
): void {
  if (!current) return;
  if (next.releaseSetId !== current.releaseSetId) {
    throw new Error("Yıllık yayın güncellemesi aktif release-set kimliğini değiştiremez.");
  }
  if (next.revision < current.revision) {
    throw new Error("Yıllık premium içerik rollback denemesi reddedildi.");
  }
  if (next.revision === current.revision) {
    if (next.payloadSha256 !== current.payloadSha256) {
      throw new Error("Aynı yıllık yayın revizyonu farklı payload ile değiştirilemez.");
    }
    return;
  }
  if (next.revision !== current.revision + 1) {
    throw new Error("Yıllık premium içerik revizyon zincirinde atlama yapılamaz.");
  }
  const predecessor = next.payload.predecessor;
  if (
    predecessor?.releaseSetId !== current.releaseSetId ||
    predecessor.revision !== current.revision ||
    predecessor.payloadSha256 !== current.payloadSha256
  ) {
    throw new Error("Yıllık premium içerik predecessor zinciri aktif ankrajla uyuşmuyor.");
  }
}

function assertNoReleaseSetEquivocation(
  incoming: StoredPremiumAnnualReleaseSet,
  existing: readonly StoredPremiumAnnualReleaseSet[],
): StoredPremiumAnnualReleaseSet | null {
  const sameRevision = existing.find(
    (item) => item.releaseSetId === incoming.releaseSetId && item.revision === incoming.revision,
  );
  if (!sameRevision) return null;
  if (
    sameRevision.id !== incoming.id ||
    sameRevision.payloadSha256 !== incoming.payloadSha256 ||
    sameRevision.compactJws !== incoming.compactJws ||
    JSON.stringify(sameRevision.verification) !== JSON.stringify(incoming.verification) ||
    serializePremiumAnnualReleaseSetPayload(sameRevision.payload) !==
      serializePremiumAnnualReleaseSetPayload(incoming.payload)
  ) {
    throw new Error("Aynı yıllık release ID/revizyon farklı digest veya baytlarla değiştirilemez.");
  }
  return sameRevision;
}

function assertNoBundleEquivocation(
  incoming: StoredPremiumMonthlyContentBundle,
  existing: readonly StoredPremiumMonthlyContentBundle[],
): StoredPremiumMonthlyContentBundle | null {
  const sameRelease = existing.find(
    (item) => item.contentReleaseId === incoming.contentReleaseId,
  );
  if (!sameRelease) return null;
  if (
    sameRelease.id !== incoming.id ||
    sameRelease.contentSha256 !== incoming.contentSha256 ||
    sameRelease.contentByteLength !== incoming.contentByteLength ||
    sameRelease.contentJson !== incoming.contentJson ||
    sameRelease.manifestDigest !== incoming.manifestDigest
  ) {
    throw new Error("Aynı aylık content release ID farklı digest veya baytlarla değiştirilemez.");
  }
  return sameRelease;
}

function resolveAnnualCommit(
  rawSnapshot: PremiumAnnualCacheSnapshot,
  prepared: PreparedAnnualContentCacheCommit,
): ResolvedAnnualContentCacheCommit {
  const snapshot = normalizeSnapshot(rawSnapshot);
  assertActivePointerIntegrity(snapshot);
  assertAntiRollback(prepared.releaseSet, snapshot.activePointer);
  const existingReleaseSet = assertNoReleaseSetEquivocation(
    prepared.releaseSet,
    snapshot.releaseSets,
  );

  const preparedByMonth = new Map(
    prepared.bundles.map((bundle) => [bundle.monthKey, bundle] as const),
  );
  const bundlesToPut: StoredPremiumMonthlyContentBundle[] = [];
  for (const bundle of prepared.bundles) {
    if (!assertNoBundleEquivocation(bundle, snapshot.monthlyBundles)) {
      bundlesToPut.push(bundle);
    }
  }

  const availableBundles = [...snapshot.monthlyBundles, ...bundlesToPut];
  const slots = prepared.releaseSet.payload.slots.map(
    (slot): StoredPremiumAnnualReleaseSlotPointer => {
      if (slot.state === "unpublished") {
        return {
          monthKey: slot.monthKey,
          state: "unpublished",
          bundleSource: null,
          bundleRecordId: null,
        };
      }
      const expected: PremiumMonthlyContentBundleReference = {
        monthKey: slot.monthKey,
        contentReleaseId: slot.pack.contentReleaseId,
        contentPackId: slot.pack.contentPackId,
        contentPackVersion: slot.pack.contentPackVersion,
        manifestDigest: slot.pack.manifest.sha256,
        sku: prepared.releaseSet.payload.sku,
        academicRelease: prepared.releaseSet.payload.academicRelease,
        contentSha256: slot.pack.content.sha256,
        contentByteLength: slot.pack.content.byteLength,
      };
      const supplied = preparedByMonth.get(slot.monthKey);
      if (supplied && sameBundleReference(bundleReferenceFromStored(supplied), expected)) {
        return {
          monthKey: slot.monthKey,
          state: "published",
          bundleSource: "monthly-v2",
          bundleRecordId: supplied.id,
        };
      }
      const cached = availableBundles.find(
        (bundle) => sameBundleReference(bundleReferenceFromStored(bundle), expected),
      );
      if (cached) {
        return {
          monthKey: slot.monthKey,
          state: "published",
          bundleSource: "monthly-v2",
          bundleRecordId: cached.id,
        };
      }
      if (
        snapshot.legacyActive &&
        sameBundleReference(legacyReferenceForMonth(snapshot.legacyActive, slot.monthKey), expected)
      ) {
        return {
          monthKey: slot.monthKey,
          state: "published",
          bundleSource: "legacy-active",
          bundleRecordId: LEGACY_ACTIVE_BUNDLE_RECORD_ID,
        };
      }
      throw new Error(`${slot.monthKey} published bundle'ı doğrulanmış biçimde staged veya önbellekte değil.`);
    },
  );

  return deepFreeze({
    releaseSetToPut: existingReleaseSet ? null : prepared.releaseSet,
    bundlesToPut,
    pointer: {
      id: ACTIVE_ANNUAL_RELEASE_KEY,
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      releaseSetRecordId: prepared.releaseSet.id,
      releaseSetId: prepared.releaseSet.releaseSetId,
      revision: prepared.releaseSet.revision,
      payloadSha256: prepared.releaseSet.payloadSha256,
      committedAtUtc: prepared.committedAtUtc,
      slots,
    },
  });
}

async function assertMonthlyBundleDigest(
  bundle: StoredPremiumMonthlyContentBundle | StoredPremiumContentBundle,
): Promise<void> {
  if (await sha256Hex(bundle.contentJson) !== bundle.contentSha256) {
    throw new Error("Saklanan premium içerik bundle SHA-256 özeti payload baytlarıyla uyuşmuyor.");
  }
}

async function loadedAnnualCacheFromSnapshot(
  rawSnapshot: PremiumAnnualCacheSnapshot,
): Promise<LoadedPremiumAnnualContentCache | null> {
  const snapshot = normalizeSnapshot(rawSnapshot);
  assertActivePointerIntegrity(snapshot);
  const pointer = snapshot.activePointer;
  if (!pointer) return null;
  const releaseSet = snapshot.releaseSets.find((item) => item.id === pointer.releaseSetRecordId);
  if (!releaseSet) {
    throw new Error("Aktif yıllık premium yayın seti bulunamadı.");
  }
  if (await sha256Hex(serializePremiumAnnualReleaseSetPayload(releaseSet.payload)) !== releaseSet.payloadSha256) {
    throw new Error("Saklanan yıllık premium yayın payload özeti uyuşmuyor.");
  }
  const bundles: LoadedPremiumAnnualMonthlyBundle[] = [];
  for (const slot of pointer.slots) {
    if (slot.state === "unpublished") continue;
    if (slot.bundleSource === "legacy-active") {
      if (!snapshot.legacyActive) {
        throw new Error(`${slot.monthKey} legacy active premium bundle kaydı bulunamadı.`);
      }
      await assertMonthlyBundleDigest(snapshot.legacyActive);
      bundles.push({ monthKey: slot.monthKey, source: "legacy-active", record: snapshot.legacyActive });
      continue;
    }
    const bundle = snapshot.monthlyBundles.find((item) => item.id === slot.bundleRecordId);
    if (!bundle || bundle.monthKey !== slot.monthKey) {
      throw new Error(`${slot.monthKey} aylık premium bundle göstergesi çözümlenemedi.`);
    }
    await assertMonthlyBundleDigest(bundle);
    bundles.push({ monthKey: slot.monthKey, source: "monthly-v2", record: bundle });
  }
  return deepFreeze({ pointer, releaseSet, bundles });
}

function openDatabase(databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("Premium içerik önbelleği için IndexedDB kullanılamıyor."));
      return;
    }
    const request = indexedDB.open(databaseName, PREMIUM_CONTENT_CACHE_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CONTENT_BUNDLE_STORE)) {
        database.createObjectStore(CONTENT_BUNDLE_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(ANNUAL_RELEASE_SET_STORE)) {
        database.createObjectStore(ANNUAL_RELEASE_SET_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(MONTHLY_CONTENT_BUNDLE_STORE)) {
        database.createObjectStore(MONTHLY_CONTENT_BUNDLE_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(ANNUAL_RELEASE_STATE_STORE)) {
        database.createObjectStore(ANNUAL_RELEASE_STATE_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(
      request.error ?? new Error("Premium içerik önbelleği açılamadı."),
    );
    request.onblocked = () => reject(
      new Error("Premium içerik önbelleği başka bir sekme tarafından engellendi."),
    );
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
      request.error ?? new Error("Premium içerik önbelleği işlemi başarısız."),
    );
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
      transaction.error ?? new Error("Premium içerik önbelleği işlemi geri alındı."),
    );
    transaction.onerror = () => reject(
      transaction.error ?? new Error("Premium içerik önbelleği işlemi başarısız."),
    );
  });
}

function snapshotRequests(transaction: IDBTransaction): Promise<PremiumAnnualCacheSnapshot> {
  return Promise.all([
    requestResult(transaction.objectStore(CONTENT_BUNDLE_STORE).get(ACTIVE_CONTENT_BUNDLE_KEY)),
    requestResult(transaction.objectStore(ANNUAL_RELEASE_SET_STORE).getAll()),
    requestResult(transaction.objectStore(MONTHLY_CONTENT_BUNDLE_STORE).getAll()),
    requestResult(transaction.objectStore(ANNUAL_RELEASE_STATE_STORE).get(ACTIVE_ANNUAL_RELEASE_KEY)),
  ]).then(([legacyActive, releaseSets, monthlyBundles, activePointer]) => ({
    legacyActive: legacyActive ? legacyActive as StoredPremiumContentBundle : null,
    releaseSets: releaseSets as StoredPremiumAnnualReleaseSet[],
    monthlyBundles: monthlyBundles as StoredPremiumMonthlyContentBundle[],
    activePointer: activePointer ? activePointer as StoredPremiumAnnualReleasePointer : null,
  }));
}

export class IndexedDbPremiumContentBundleStore
implements PremiumContentBundleStore, PremiumAnnualContentCacheStore {
  private databasePromise: Promise<IDBDatabase> | null = null;
  private readonly databaseName: string;

  constructor(databaseName = PREMIUM_CONTENT_CACHE_DATABASE_NAME) {
    this.databaseName = databaseName;
  }

  private database(): Promise<IDBDatabase> {
    this.databasePromise ??= openDatabase(this.databaseName);
    return this.databasePromise;
  }

  async load(): Promise<StoredPremiumContentBundle | null> {
    const database = await this.database();
    const transaction = database.transaction(CONTENT_BUNDLE_STORE, "readonly");
    const done = transactionDone(transaction);
    const result = await requestResult(
      transaction.objectStore(CONTENT_BUNDLE_STORE).get(ACTIVE_CONTENT_BUNDLE_KEY),
    );
    await done;
    return result ? clone(result as StoredPremiumContentBundle) : null;
  }

  async save(recordValue: Omit<StoredPremiumContentBundle, "id">): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction(CONTENT_BUNDLE_STORE, "readwrite");
    const done = transactionDone(transaction);
    transaction.objectStore(CONTENT_BUNDLE_STORE).put({
      ...clone(recordValue),
      id: ACTIVE_CONTENT_BUNDLE_KEY,
    });
    await done;
  }

  async clear(): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction(
      [
        CONTENT_BUNDLE_STORE,
        ANNUAL_RELEASE_SET_STORE,
        MONTHLY_CONTENT_BUNDLE_STORE,
        ANNUAL_RELEASE_STATE_STORE,
      ],
      "readwrite",
    );
    const done = transactionDone(transaction);
    transaction.objectStore(CONTENT_BUNDLE_STORE).clear();
    transaction.objectStore(ANNUAL_RELEASE_SET_STORE).clear();
    transaction.objectStore(MONTHLY_CONTENT_BUNDLE_STORE).clear();
    transaction.objectStore(ANNUAL_RELEASE_STATE_STORE).clear();
    await done;
  }

  async commitVerifiedAnnualReleaseSet(
    input: PremiumAnnualContentCacheCommitInput,
  ): Promise<StoredPremiumAnnualReleasePointer> {
    const prepared = await prepareAnnualCommit(input);
    const database = await this.database();
    const validationTransaction = database.transaction(
      [
        CONTENT_BUNDLE_STORE,
        ANNUAL_RELEASE_SET_STORE,
        MONTHLY_CONTENT_BUNDLE_STORE,
        ANNUAL_RELEASE_STATE_STORE,
      ],
      "readonly",
    );
    const validationDone = transactionDone(validationTransaction);
    const validatedSnapshot = await validatedSnapshotForCommit(
      await snapshotRequests(validationTransaction),
    );
    await validationDone;
    const transaction = database.transaction(
      [
        CONTENT_BUNDLE_STORE,
        ANNUAL_RELEASE_SET_STORE,
        MONTHLY_CONTENT_BUNDLE_STORE,
        ANNUAL_RELEASE_STATE_STORE,
      ],
      "readwrite",
    );
    const done = transactionDone(transaction);
    try {
      const currentSnapshot = normalizeSnapshot(await snapshotRequests(transaction));
      if (snapshotBytes(currentSnapshot) !== snapshotBytes(validatedSnapshot)) {
        throw new Error("Premium içerik önbelleği eşzamanlı değişti; commit güvenle reddedildi.");
      }
      const resolved = resolveAnnualCommit(currentSnapshot, prepared);
      if (resolved.releaseSetToPut) {
        transaction.objectStore(ANNUAL_RELEASE_SET_STORE).put(clone(resolved.releaseSetToPut));
      }
      const bundleStore = transaction.objectStore(MONTHLY_CONTENT_BUNDLE_STORE);
      for (const bundle of resolved.bundlesToPut) bundleStore.put(clone(bundle));
      transaction.objectStore(ANNUAL_RELEASE_STATE_STORE).put(clone(resolved.pointer));
      await done;
      return clone(resolved.pointer);
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // İşlem zaten kapanmışsa özgün hatayı koru.
      }
      try {
        await done;
      } catch {
        // Özgün doğrulama/işlem hatasını koru.
      }
      throw error;
    }
  }

  async loadActiveAnnualContentCache(): Promise<LoadedPremiumAnnualContentCache | null> {
    const database = await this.database();
    const transaction = database.transaction(
      [
        CONTENT_BUNDLE_STORE,
        ANNUAL_RELEASE_SET_STORE,
        MONTHLY_CONTENT_BUNDLE_STORE,
        ANNUAL_RELEASE_STATE_STORE,
      ],
      "readonly",
    );
    const done = transactionDone(transaction);
    const snapshot = await snapshotRequests(transaction);
    await done;
    return loadedAnnualCacheFromSnapshot(snapshot);
  }

  async loadMonthlyContentBundle(
    referenceValue: PremiumMonthlyContentBundleReference,
  ): Promise<StoredPremiumMonthlyContentBundle | StoredPremiumContentBundle | null> {
    const reference = validateBundleMetadata(referenceValue, "Aylık premium içerik referansı");
    const database = await this.database();
    const transaction = database.transaction(
      [CONTENT_BUNDLE_STORE, MONTHLY_CONTENT_BUNDLE_STORE],
      "readonly",
    );
    const done = transactionDone(transaction);
    const [monthly, legacy] = await Promise.all([
      requestResult(
        transaction.objectStore(MONTHLY_CONTENT_BUNDLE_STORE).get(
          monthlyBundleKeyFromReference(reference),
        ),
      ),
      requestResult(
        transaction.objectStore(CONTENT_BUNDLE_STORE).get(ACTIVE_CONTENT_BUNDLE_KEY),
      ),
    ]);
    await done;
    if (monthly) {
      const parsed = exactStoredMonthlyBundle(monthly);
      await assertMonthlyBundleDigest(parsed);
      return clone(parsed);
    }
    if (legacy) {
      const parsed = exactLegacyBundle(legacy, "Legacy active premium içerik bundle'ı");
      if (sameBundleReference(legacyReferenceForMonth(parsed, reference.monthKey), reference)) {
        await assertMonthlyBundleDigest(parsed);
        return clone(parsed);
      }
    }
    return null;
  }

  async listMonthlyContentBundles(): Promise<readonly StoredPremiumMonthlyContentBundle[]> {
    const database = await this.database();
    const transaction = database.transaction(MONTHLY_CONTENT_BUNDLE_STORE, "readonly");
    const done = transactionDone(transaction);
    const records = await requestResult(
      transaction.objectStore(MONTHLY_CONTENT_BUNDLE_STORE).getAll(),
    );
    await done;
    if (records.length > MAX_STORED_MONTHLY_BUNDLES) {
      throw new Error("Aylık premium içerik önbelleği güvenli kayıt sınırını aşıyor.");
    }
    const parsed = (records as StoredPremiumMonthlyContentBundle[]).map(exactStoredMonthlyBundle);
    for (const bundle of parsed) await assertMonthlyBundleDigest(bundle);
    return deepFreeze(clone(parsed));
  }

  close(): void {
    void this.databasePromise?.then((database) => database.close());
    this.databasePromise = null;
  }
}

export class MemoryPremiumAnnualContentCacheStore
implements PremiumContentBundleStore, PremiumAnnualContentCacheStore {
  private legacyActive: StoredPremiumContentBundle | null;
  private releaseSets: StoredPremiumAnnualReleaseSet[] = [];
  private monthlyBundles: StoredPremiumMonthlyContentBundle[] = [];
  private activePointer: StoredPremiumAnnualReleasePointer | null = null;

  constructor(legacyActive: StoredPremiumContentBundle | null = null) {
    this.legacyActive = legacyActive ? clone(legacyActive) : null;
  }

  async load(): Promise<StoredPremiumContentBundle | null> {
    return this.legacyActive ? clone(this.legacyActive) : null;
  }

  async save(recordValue: Omit<StoredPremiumContentBundle, "id">): Promise<void> {
    this.legacyActive = { id: ACTIVE_CONTENT_BUNDLE_KEY, ...clone(recordValue) };
  }

  async clear(): Promise<void> {
    this.legacyActive = null;
    this.releaseSets = [];
    this.monthlyBundles = [];
    this.activePointer = null;
  }

  private snapshot(): PremiumAnnualCacheSnapshot {
    return {
      legacyActive: this.legacyActive,
      releaseSets: this.releaseSets,
      monthlyBundles: this.monthlyBundles,
      activePointer: this.activePointer,
    };
  }

  async commitVerifiedAnnualReleaseSet(
    input: PremiumAnnualContentCacheCommitInput,
  ): Promise<StoredPremiumAnnualReleasePointer> {
    const prepared = await prepareAnnualCommit(input);
    const validatedSnapshot = await validatedSnapshotForCommit(this.snapshot());
    const resolved = resolveAnnualCommit(validatedSnapshot, prepared);
    const nextReleaseSets = resolved.releaseSetToPut
      ? [...this.releaseSets, clone(resolved.releaseSetToPut)]
      : [...this.releaseSets];
    const nextBundles = [...this.monthlyBundles, ...clone(resolved.bundlesToPut)];
    const nextPointer = clone(resolved.pointer);
    this.releaseSets = nextReleaseSets;
    this.monthlyBundles = nextBundles;
    this.activePointer = nextPointer;
    return clone(nextPointer);
  }

  async loadActiveAnnualContentCache(): Promise<LoadedPremiumAnnualContentCache | null> {
    return loadedAnnualCacheFromSnapshot(this.snapshot());
  }

  async loadMonthlyContentBundle(
    referenceValue: PremiumMonthlyContentBundleReference,
  ): Promise<StoredPremiumMonthlyContentBundle | StoredPremiumContentBundle | null> {
    const reference = validateBundleMetadata(referenceValue, "Aylık premium içerik referansı");
    const cached = this.monthlyBundles.find(
      (bundle) => sameBundleReference(bundleReferenceFromStored(bundle), reference),
    );
    if (cached) {
      const parsed = exactStoredMonthlyBundle(cached);
      await assertMonthlyBundleDigest(parsed);
      return clone(parsed);
    }
    if (this.legacyActive) {
      const parsed = exactLegacyBundle(this.legacyActive, "Legacy active premium içerik bundle'ı");
      if (sameBundleReference(legacyReferenceForMonth(parsed, reference.monthKey), reference)) {
        await assertMonthlyBundleDigest(parsed);
        return clone(parsed);
      }
    }
    return null;
  }

  async listMonthlyContentBundles(): Promise<readonly StoredPremiumMonthlyContentBundle[]> {
    const parsed = this.monthlyBundles.map(exactStoredMonthlyBundle);
    for (const bundle of parsed) await assertMonthlyBundleDigest(bundle);
    return deepFreeze(clone(parsed));
  }

  close(): void {}
}
