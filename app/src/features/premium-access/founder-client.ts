import {
  createPremiumChallengeProof,
  validatePremiumLicenseChallenge,
} from "./challenge-proof.ts";
import {
  PremiumDeviceIdentityError,
  type PremiumDeviceIdentity,
  getOrCreatePremiumDeviceIdentity,
} from "./device-identity.ts";
import {
  type PremiumPackAccessReference,
  type VerifiedPremiumAccess,
  assertLicenseApiRequestHasNoEducationalData,
  verifyPremiumEntitlement,
} from "./entitlement.ts";
import {
  IndexedDbPremiumContentBundleStore,
  type PremiumContentBundleStore,
  type StoredPremiumContentBundle,
} from "./content-bundle-store.ts";
import {
  IndexedDbPremiumDeviceIdentityStore,
  IndexedDbPremiumEntitlementStore,
  PremiumLicenseStorageError,
  type PremiumDeviceIdentityStore,
  type PremiumEntitlementStore,
  type StoredPremiumEntitlement,
} from "./license-store.ts";
import { validatePremiumFounderRedeemRequest } from "./license-requests.ts";
import {
  PREMIUM_VALUES_V3_RELEASE_IDENTITY,
  PREMIUM_V3_PREVIEW_RELEASE_LOCK,
  parsePremiumContentPack,
} from "../premium-plans/content-repository.ts";
import type { PremiumContentPack } from "../premium-plans/domain.ts";

const CHALLENGE_PATH = "/v1/device/challenge";
const FOUNDER_REDEEM_PATH = "/v1/founder/redeem";
const MAX_CHALLENGE_RESPONSE_BYTES = 4 * 1024;
const MAX_REDEEM_RESPONSE_BYTES = 3 * 1024 * 1024;
const MAX_ERROR_RESPONSE_BYTES = 4 * 1024;
const MAX_CONTENT_JSON_BYTES = 512 * 1024;
const MAX_ENTITLEMENT_TOKEN_BYTES = 32 * 1024;
const MAX_TRUSTED_KEYS_JSON_BYTES = 16 * 1024;
export const PREMIUM_LICENSE_REQUEST_TIMEOUT_MS = 12_000;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE64URL_32_BYTES_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SHA256_HEX_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SKU_PATTERN = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const ACADEMIC_RELEASE_PATTERN = /^20\d{2}-20\d{2}$/;
const KID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const MACHINE_ID_PATTERN = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,100}$/;

export type PremiumFounderActivationPhase =
  | "configuration"
  | "device-store"
  | "device-key"
  | "network"
  | "challenge"
  | "proof"
  | "redeem"
  | "verify"
  | "store";

export type PremiumFounderActivationFailure =
  | "configuration-invalid"
  | "input-invalid"
  | "request-invalid"
  | "storage-blocked"
  | "storage-timeout"
  | "storage-version-changed"
  | "storage-unavailable"
  | "device-key-unavailable"
  | "network-timeout"
  | "network-unavailable"
  | "request-rejected"
  | "response-invalid"
  | "proof-failed"
  | "verification-failed"
  | "store-failed";

export type PremiumFounderActivationRecovery =
  | "retry"
  | "check-connection"
  | "close-other-tabs"
  | "reload-app"
  | "update-app"
  | "reset-local-license"
  | "contact-support";

export interface PremiumFounderActivationErrorPresentation {
  readonly phase: PremiumFounderActivationPhase;
  readonly failure: PremiumFounderActivationFailure;
  readonly message: string;
  readonly recovery: PremiumFounderActivationRecovery;
  readonly supportCode: string | null;
}

export class PremiumFounderActivationError extends Error {
  readonly name = "PremiumFounderActivationError";
  readonly phase: PremiumFounderActivationPhase;
  readonly failure: PremiumFounderActivationFailure;
  readonly recovery: PremiumFounderActivationRecovery;
  readonly requestId: string | null;

  constructor(input: {
    phase: PremiumFounderActivationPhase;
    failure: PremiumFounderActivationFailure;
    message: string;
    recovery: PremiumFounderActivationRecovery;
    requestId?: string | null;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.phase = input.phase;
    this.failure = input.failure;
    this.recovery = input.recovery;
    this.requestId = input.requestId ?? null;
  }
}

export function premiumFounderActivationErrorPresentation(
  error: unknown,
): PremiumFounderActivationErrorPresentation {
  if (error instanceof PremiumFounderActivationError) {
    return Object.freeze({
      phase: error.phase,
      failure: error.failure,
      message: error.message,
      recovery: error.recovery,
      supportCode: error.requestId,
    });
  }
  return Object.freeze({
    phase: "verify" as const,
    failure: "verification-failed" as const,
    message:
      "Kurucu Premium işlemi beklenmeyen bir nedenle tamamlanamadı. Uygulamayı yeniden açıp tekrar deneyin.",
    recovery: "reload-app" as const,
    supportCode: null,
  });
}

export interface PremiumFounderConfiguration {
  readonly apiOrigin: string;
  readonly trustedKeys: Readonly<Record<string, JsonWebKey>>;
  readonly expectedIssuer: string;
  readonly expectedAudience: string;
  readonly expectedPack: Readonly<PremiumPackAccessReference>;
}

export interface PremiumFounderAccessResult {
  readonly access: VerifiedPremiumAccess;
  readonly pack: PremiumContentPack;
}

export interface PremiumFounderClientDependencies {
  fetcher?: typeof fetch;
  deviceIdentityStore?: PremiumDeviceIdentityStore;
  entitlementStore?: PremiumEntitlementStore;
  contentBundleStore?: PremiumContentBundleStore;
  now?: () => Date;
  createIdempotencyKey?: () => string;
  requestTimeoutMs?: number;
}

export interface ActivatePremiumFounderAccessInput
  extends PremiumFounderClientDependencies {
  code: string;
  appVersion: string;
  configuration: PremiumFounderConfiguration;
}

export interface LoadStoredPremiumFounderAccessInput
  extends PremiumFounderClientDependencies {
  configuration: PremiumFounderConfiguration;
  minimumRevocationGeneration?: number;
}

interface ValidatedContentBundle {
  readonly pack: PremiumContentPack;
  readonly record: Omit<StoredPremiumContentBundle, "id" | "savedAtUtc">;
}

function object(value: unknown, label: string): Record<string, unknown> {
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

function exactUtcTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} geçersiz.`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`${label} UTC ISO-8601 biçiminde olmalıdır.`);
  }
  return value;
}

function text(
  value: unknown,
  label: string,
  pattern: RegExp,
  maximumLength = 300,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    !pattern.test(value)
  ) {
    throw new Error(`${label} geçersiz.`);
  }
  return value;
}

function boundedText(value: unknown, label: string, maximumBytes: number): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} geçersiz.`);
  }
  if (new TextEncoder().encode(value).byteLength > maximumBytes) {
    throw new Error(`${label} izin verilen boyutu aşıyor.`);
  }
  return value;
}

function secureApiOrigin(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 300) {
    throw new Error("Premium lisans API origin'i geçersiz.");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Premium lisans API origin'i geçersiz.");
  }
  const loopback = url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";
  if (
    url.origin !== value ||
    url.username !== "" ||
    url.password !== "" ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
  ) {
    throw new Error("Premium lisans API yalnız sabit HTTPS origin'i kullanabilir.");
  }
  return url.origin;
}

function exactPublicEntitlementJwk(value: unknown, label: string): JsonWebKey {
  const jwk = object(value, label) as JsonWebKey;
  exactKeys(jwk as Record<string, unknown>, ["crv", "ext", "key_ops", "kty", "x", "y"], label);
  if (
    jwk.kty !== "EC" ||
    jwk.crv !== "P-256" ||
    jwk.ext !== true ||
    !Array.isArray(jwk.key_ops) ||
    jwk.key_ops.length !== 1 ||
    jwk.key_ops[0] !== "verify" ||
    typeof jwk.x !== "string" ||
    !BASE64URL_32_BYTES_PATTERN.test(jwk.x) ||
    typeof jwk.y !== "string" ||
    !BASE64URL_32_BYTES_PATTERN.test(jwk.y) ||
    "d" in jwk
  ) {
    throw new Error(`${label} exact P-256 açık anahtar sözleşmesine uymuyor.`);
  }
  const keyOperations: string[] = ["verify"];
  Object.freeze(keyOperations);
  return Object.freeze({
    crv: "P-256",
    ext: true,
    key_ops: keyOperations,
    kty: "EC",
    x: jwk.x,
    y: jwk.y,
  });
}

function validatedConfiguration(
  input: PremiumFounderConfiguration,
): PremiumFounderConfiguration {
  const configuration = object(input, "Premium kurucu yapılandırması");
  exactKeys(
    configuration,
    ["apiOrigin", "expectedAudience", "expectedIssuer", "expectedPack", "trustedKeys"],
    "Premium kurucu yapılandırması",
  );
  const trustedKeyInput = object(configuration.trustedKeys, "Güvenilir entitlement anahtarları");
  const entries = Object.entries(trustedKeyInput);
  if (entries.length === 0 || entries.length > 4) {
    throw new Error("Bir ile dört arasında güvenilir entitlement anahtarı gerekir.");
  }
  const trustedKeys: Record<string, JsonWebKey> = Object.create(null) as Record<string, JsonWebKey>;
  for (const [kid, jwk] of entries) {
    if (!KID_PATTERN.test(kid)) throw new Error("Entitlement anahtar kimliği geçersiz.");
    trustedKeys[kid] = exactPublicEntitlementJwk(jwk, `Entitlement açık anahtarı (${kid})`);
  }
  const expectedPackInput = object(configuration.expectedPack, "Beklenen premium paket");
  exactKeys(
    expectedPackInput,
    ["academicRelease", "contentReleaseId", "id", "manifestDigest", "sku", "version"],
    "Beklenen premium paket",
  );
  const expectedPack = Object.freeze({
    sku: text(expectedPackInput.sku, "Beklenen SKU", SKU_PATTERN, 80),
    contentReleaseId: text(
      expectedPackInput.contentReleaseId,
      "Beklenen içerik sürümü",
      MACHINE_ID_PATTERN,
      200,
    ),
    id: text(expectedPackInput.id, "Beklenen paket kimliği", MACHINE_ID_PATTERN, 200),
    version: text(expectedPackInput.version, "Beklenen paket sürümü", VERSION_PATTERN, 80),
    manifestDigest: text(
      expectedPackInput.manifestDigest,
      "Beklenen manifest özeti",
      SHA256_HEX_PATTERN,
      100,
    ),
    academicRelease: text(
      expectedPackInput.academicRelease,
      "Beklenen akademik sürüm",
      ACADEMIC_RELEASE_PATTERN,
      20,
    ),
  });
  return Object.freeze({
    apiOrigin: secureApiOrigin(configuration.apiOrigin),
    trustedKeys: Object.freeze(trustedKeys),
    expectedIssuer: secureApiOrigin(configuration.expectedIssuer),
    expectedAudience: text(
      configuration.expectedAudience,
      "Entitlement audience",
      MACHINE_ID_PATTERN,
      100,
    ),
    expectedPack,
  });
}

export function premiumFounderConfigurationFromEnvironment(): PremiumFounderConfiguration | null {
  try {
    const environment = typeof import.meta.env === "object"
      ? import.meta.env as Record<string, unknown>
      : {};
    const apiOrigin = environment.VITE_PREMIUM_LICENSE_API_ORIGIN;
    const expectedIssuer = environment.VITE_PREMIUM_LICENSE_ISSUER;
    const expectedAudience = environment.VITE_PREMIUM_LICENSE_AUDIENCE;
    const trustedKeysJson = environment.VITE_PREMIUM_LICENSE_TRUSTED_KEYS_JSON;
    if (
      apiOrigin === undefined &&
      expectedIssuer === undefined &&
      expectedAudience === undefined &&
      trustedKeysJson === undefined
    ) {
      return null;
    }
    if (
      typeof apiOrigin !== "string" ||
      typeof expectedIssuer !== "string" ||
      typeof expectedAudience !== "string" ||
      typeof trustedKeysJson !== "string" ||
      new TextEncoder().encode(trustedKeysJson).byteLength > MAX_TRUSTED_KEYS_JSON_BYTES
    ) {
      throw new Error("Premium kurucu erişimi ortam yapılandırması eksik veya geçersiz.");
    }
    let trustedKeys: unknown;
    try {
      trustedKeys = JSON.parse(trustedKeysJson);
    } catch {
      throw new Error("Premium entitlement açık anahtarları geçerli JSON değil.");
    }
    return validatedConfiguration({
      apiOrigin,
      expectedIssuer,
      expectedAudience,
      trustedKeys: trustedKeys as Readonly<Record<string, JsonWebKey>>,
      expectedPack: {
        sku: PREMIUM_VALUES_V3_RELEASE_IDENTITY.sku,
        contentReleaseId: PREMIUM_VALUES_V3_RELEASE_IDENTITY.contentReleaseId,
        id: PREMIUM_VALUES_V3_RELEASE_IDENTITY.id,
        version: PREMIUM_VALUES_V3_RELEASE_IDENTITY.version,
        manifestDigest: PREMIUM_VALUES_V3_RELEASE_IDENTITY.manifestDigest,
        academicRelease: PREMIUM_VALUES_V3_RELEASE_IDENTITY.academicRelease,
      },
    });
  } catch (error) {
    if (error instanceof PremiumFounderActivationError) throw error;
    throw new PremiumFounderActivationError({
      phase: "configuration",
      failure: "configuration-invalid",
      message:
        "Bu uygulama sürümünün Kurucu Premium bağlantısı eksik veya geçersiz. MaarifOS'u güncelleyip tekrar deneyin.",
      recovery: "update-app",
      cause: error,
    });
  }
}

function apiUrl(apiOrigin: string, path: string): URL {
  const result = new URL(path, `${apiOrigin}/`);
  if (
    result.origin !== apiOrigin ||
    result.pathname !== path ||
    result.search !== "" ||
    result.hash !== ""
  ) {
    throw new Error("Premium lisans API hedefi güvenilir origin dışına çıkamaz.");
  }
  return result;
}

async function responseTextBounded(
  response: Response,
  maximumBytes: number,
): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maximumBytes) {
      throw new Error("Premium lisans API yanıt boyutu geçersiz.");
    }
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      totalBytes += next.value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new Error("Premium lisans API yanıtı izin verilen boyutu aşıyor.");
      }
      const copy = new Uint8Array(new ArrayBuffer(next.value.byteLength));
      copy.set(next.value);
      chunks.push(copy);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(new ArrayBuffer(totalBytes));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Premium lisans API yanıtı geçerli UTF-8 değil.");
  }
}

function parseJsonText(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} geçerli JSON değil.`);
  }
}

type PremiumLicenseApiRequestFailure =
  | "network-timeout"
  | "network-unavailable"
  | "request-rejected"
  | "response-invalid";

class PremiumLicenseApiRequestError extends Error {
  readonly name = "PremiumLicenseApiRequestError";
  readonly failure: PremiumLicenseApiRequestFailure;
  readonly requestId: string | null;

  constructor(
    failure: PremiumLicenseApiRequestFailure,
    message: string,
    options: { cause?: unknown; requestId?: string | null } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.failure = failure;
    this.requestId = options.requestId ?? null;
  }
}

function validRequestTimeout(value: number | undefined): number {
  const timeout = value ?? PREMIUM_LICENSE_REQUEST_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 60_000) {
    throw new Error("Premium lisans istek zaman aşımı geçersiz.");
  }
  return timeout;
}

async function postExactJson(input: {
  fetcher: typeof fetch;
  url: URL;
  body: Record<string, unknown>;
  maximumResponseBytes: number;
  idempotencyKey?: string;
  timeoutMs: number;
}): Promise<unknown> {
  assertLicenseApiRequestHasNoEducationalData(input.body);
  const body = JSON.stringify(input.body);
  if (new TextEncoder().encode(body).byteLength > 16 * 1024) {
    throw new Error("Premium lisans API isteği izin verilen boyutu aşıyor.");
  }
  const abortController = new AbortController();
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutHandle = globalThis.setTimeout(() => {
      timedOut = true;
      abortController.abort();
      reject(new PremiumLicenseApiRequestError(
        "network-timeout",
        "Premium lisans servisi zamanında yanıt vermedi.",
      ));
    }, input.timeoutMs);
  });
  const request = (async () => {
    let response: Response;
    try {
      response = await input.fetcher(input.url, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: abortController.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(input.idempotencyKey
            ? { "Idempotency-Key": input.idempotencyKey }
            : {}),
        },
        body,
      });
    } catch (error) {
      if (timedOut || (error instanceof DOMException && error.name === "AbortError")) {
        throw new PremiumLicenseApiRequestError(
          "network-timeout",
          "Premium lisans servisi zamanında yanıt vermedi.",
          { cause: error },
        );
      }
      throw new PremiumLicenseApiRequestError(
        "network-unavailable",
        "Premium lisans servisine bağlanılamadı.",
        { cause: error },
      );
    }

    let parsed: unknown;
    try {
      const responseText = await responseTextBounded(
        response,
        response.ok ? input.maximumResponseBytes : MAX_ERROR_RESPONSE_BYTES,
      );
      const contentType = response.headers.get("content-type")
        ?.split(";", 1)[0]
        ?.trim();
      if (contentType !== "application/json") {
        throw new Error("Premium lisans API JSON yanıtı vermedi.");
      }
      parsed = parseJsonText(responseText, "Premium lisans API yanıtı");
    } catch (error) {
      throw new PremiumLicenseApiRequestError(
        "response-invalid",
        "Premium lisans servisi doğrulanabilir bir yanıt vermedi.",
        { cause: error },
      );
    }

    if (!response.ok) {
      try {
        const errorBody = object(parsed, "Premium lisans API hata yanıtı");
        exactKeys(errorBody, ["error", "requestId"], "Premium lisans API hata yanıtı");
        if (
          errorBody.error !== "request_rejected" ||
          typeof errorBody.requestId !== "string" ||
          !REQUEST_ID_PATTERN.test(errorBody.requestId)
        ) {
          throw new Error("Premium lisans API hata yanıtı geçersiz.");
        }
        throw new PremiumLicenseApiRequestError(
          "request-rejected",
          "Premium erişim isteği reddedildi.",
          { requestId: errorBody.requestId },
        );
      } catch (error) {
        if (error instanceof PremiumLicenseApiRequestError) throw error;
        throw new PremiumLicenseApiRequestError(
          "response-invalid",
          "Premium lisans servisi doğrulanabilir bir hata yanıtı vermedi.",
          { cause: error },
        );
      }
    }
    return parsed;
  })();

  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutHandle !== undefined) globalThis.clearTimeout(timeoutHandle);
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digestInput = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  digestInput.set(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", digestInput));
  return `sha256:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function assertPackMetadata(
  pack: PremiumContentPack,
  reference: PremiumPackAccessReference,
  label: string,
): void {
  if (
    pack.sku !== reference.sku ||
    pack.contentReleaseId !== reference.contentReleaseId ||
    pack.id !== reference.id ||
    pack.version !== reference.version ||
    pack.manifestDigest !== reference.manifestDigest ||
    pack.academicRelease !== reference.academicRelease
  ) {
    throw new Error(`${label} exact paket metadata zinciriyle uyuşmuyor.`);
  }
}

async function validateContentBundle(
  value: unknown,
  expectedPack: PremiumPackAccessReference,
): Promise<ValidatedContentBundle> {
  const bundle = object(value, "Premium içerik bundle'ı");
  exactKeys(
    bundle,
    [
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
    ],
    "Premium içerik bundle'ı",
  );
  if (bundle.schemaVersion !== 1) {
    throw new Error("Premium içerik bundle şema sürümü desteklenmiyor.");
  }
  const contentJson = boundedText(
    bundle.contentJson,
    "Premium içerik bundle payload'ı",
    MAX_CONTENT_JSON_BYTES,
  );
  const contentBytes = new TextEncoder().encode(contentJson);
  if (
    !Number.isSafeInteger(bundle.contentByteLength) ||
    Number(bundle.contentByteLength) !== contentBytes.byteLength
  ) {
    throw new Error("Premium içerik bundle byte uzunluğu uyuşmuyor.");
  }
  const contentSha256 = text(
    bundle.contentSha256,
    "Premium içerik bundle özeti",
    SHA256_HEX_PATTERN,
    100,
  );
  if (await sha256Hex(contentBytes) !== contentSha256) {
    throw new Error("Premium içerik bundle SHA-256 özeti uyuşmuyor.");
  }
  if (
    contentSha256 !== PREMIUM_V3_PREVIEW_RELEASE_LOCK.contentRawSha256 ||
    contentBytes.byteLength !== PREMIUM_V3_PREVIEW_RELEASE_LOCK.contentRawByteLength
  ) {
    throw new Error("Premium içerik bundle'ı kanonik v3 raw release kilidiyle uyuşmuyor.");
  }
  const reference = Object.freeze({
    sku: text(bundle.sku, "Bundle SKU", SKU_PATTERN, 80),
    contentReleaseId: text(
      bundle.contentReleaseId,
      "Bundle içerik sürümü",
      MACHINE_ID_PATTERN,
      200,
    ),
    id: text(bundle.contentPackId, "Bundle paket kimliği", MACHINE_ID_PATTERN, 200),
    version: text(bundle.contentPackVersion, "Bundle paket sürümü", VERSION_PATTERN, 80),
    manifestDigest: text(
      bundle.manifestDigest,
      "Bundle manifest özeti",
      SHA256_HEX_PATTERN,
      100,
    ),
    academicRelease: text(
      bundle.academicRelease,
      "Bundle akademik sürümü",
      ACADEMIC_RELEASE_PATTERN,
      20,
    ),
  });
  if (
    reference.sku !== expectedPack.sku ||
    reference.contentReleaseId !== expectedPack.contentReleaseId ||
    reference.id !== expectedPack.id ||
    reference.version !== expectedPack.version ||
    reference.manifestDigest !== expectedPack.manifestDigest ||
    reference.academicRelease !== expectedPack.academicRelease
  ) {
    throw new Error("Premium içerik bundle'ı yapılandırılmış release ile uyuşmuyor.");
  }
  const pack = parsePremiumContentPack(
    parseJsonText(contentJson, "Premium içerik bundle payload'ı"),
  );
  assertPackMetadata(pack, reference, "Premium içerik bundle payload'ı");
  return Object.freeze({
    pack,
    record: Object.freeze({
      schemaVersion: 1 as const,
      contentReleaseId: reference.contentReleaseId,
      contentPackId: reference.id,
      contentPackVersion: reference.version,
      manifestDigest: reference.manifestDigest,
      sku: reference.sku,
      academicRelease: reference.academicRelease,
      contentSha256,
      contentByteLength: contentBytes.byteLength,
      contentJson,
    }),
  });
}

function validateRedeemResponse(value: unknown): {
  entitlementToken: string;
  contentBundle: unknown;
} {
  const response = object(value, "Kurucu erişimi yanıtı");
  exactKeys(response, ["contentBundle", "entitlementToken"], "Kurucu erişimi yanıtı");
  return {
    entitlementToken: boundedText(
      response.entitlementToken,
      "Premium entitlement tokenı",
      MAX_ENTITLEMENT_TOKEN_BYTES,
    ),
    contentBundle: response.contentBundle,
  };
}

async function verifiedAccessFor(
  token: string,
  configuration: PremiumFounderConfiguration,
  identity: PremiumDeviceIdentity,
  pack: PremiumContentPack,
  input: {
    now: Date;
    maxObservedWallClock?: Date;
    minimumRevocationGeneration?: number;
  },
): Promise<VerifiedPremiumAccess> {
  assertPackMetadata(pack, configuration.expectedPack, "Premium içerik paketi");
  return verifyPremiumEntitlement({
    token,
    trustedKeys: configuration.trustedKeys,
    expectedIssuer: configuration.expectedIssuer,
    expectedAudience: configuration.expectedAudience,
    expectedDeviceKeyThumbprint: identity.thumbprint,
    expectedSku: pack.sku,
    expectedContentReleaseId: pack.contentReleaseId,
    expectedContentPackId: pack.id,
    expectedContentPackVersion: pack.version,
    expectedManifestDigest: pack.manifestDigest,
    now: input.now,
    maxObservedWallClock: input.maxObservedWallClock,
    minimumRevocationGeneration: input.minimumRevocationGeneration,
  });
}

function stores(dependencies: PremiumFounderClientDependencies): {
  deviceIdentityStore: PremiumDeviceIdentityStore;
  entitlementStore: PremiumEntitlementStore;
  contentBundleStore: PremiumContentBundleStore;
  closeOwned(): void;
} {
  const ownDevice = !dependencies.deviceIdentityStore;
  const ownEntitlement = !dependencies.entitlementStore;
  const ownContent = !dependencies.contentBundleStore;
  const deviceIdentityStore = dependencies.deviceIdentityStore ??
    new IndexedDbPremiumDeviceIdentityStore();
  const entitlementStore = dependencies.entitlementStore ??
    new IndexedDbPremiumEntitlementStore();
  const contentBundleStore = dependencies.contentBundleStore ??
    new IndexedDbPremiumContentBundleStore();
  return {
    deviceIdentityStore,
    entitlementStore,
    contentBundleStore,
    closeOwned() {
      if (ownDevice) deviceIdentityStore.close();
      if (ownEntitlement) entitlementStore.close();
      if (ownContent) contentBundleStore.close();
    },
  };
}

function validNow(now: () => Date): Date {
  const value = now();
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("Premium lisans istemci zamanı geçersiz.");
  }
  return new Date(value.getTime());
}

function activationError(input: ConstructorParameters<
  typeof PremiumFounderActivationError
>[0]): PremiumFounderActivationError {
  return new PremiumFounderActivationError(input);
}

function storageActivationError(
  phase: "device-store" | "store",
  error: unknown,
): PremiumFounderActivationError {
  if (error instanceof PremiumFounderActivationError) return error;
  if (error instanceof PremiumLicenseStorageError) {
    if (error.reason === "open-blocked") {
      return activationError({
        phase,
        failure: "storage-blocked",
        message:
          "Premium lisans deposu başka bir MaarifOS sekmesi tarafından kullanılıyor. Diğer MaarifOS sekmelerini kapatıp tekrar deneyin.",
        recovery: "close-other-tabs",
        cause: error,
      });
    }
    if (error.reason === "open-timeout") {
      return activationError({
        phase,
        failure: "storage-timeout",
        message:
          "Bu telefonun premium lisans deposu zamanında açılamadı. MaarifOS'u tamamen kapatıp yeniden açın.",
        recovery: "reload-app",
        cause: error,
      });
    }
    if (error.reason === "version-changed") {
      return activationError({
        phase,
        failure: "storage-version-changed",
        message:
          "Premium lisans deposu uygulamanın başka bir sürümü tarafından değiştirildi. Güvenli devam için MaarifOS'u yeniden açın.",
        recovery: "reload-app",
        cause: error,
      });
    }
  }
  return activationError({
    phase,
    failure: phase === "store" ? "store-failed" : "storage-unavailable",
    message: phase === "store"
      ? "Telefon doğrulandı ancak premium erişim bu cihaza güvenle kaydedilemedi. Depolama iznini kontrol edip tekrar deneyin."
      : "Bu telefonun premium lisans deposuna güvenli biçimde erişilemedi. MaarifOS'u yeniden açıp tekrar deneyin.",
    recovery: "reload-app",
    cause: error,
  });
}

function deviceKeyActivationError(error: unknown): PremiumFounderActivationError {
  if (error instanceof PremiumLicenseStorageError) {
    return storageActivationError("device-store", error);
  }
  return activationError({
    phase: "device-key",
    failure: "device-key-unavailable",
    message:
      "Bu telefondaki yalnız premium lisans anahtarı kullanılamıyor. Yerel premium erişimi kontrollü sıfırlanıp telefon yeniden bağlanabilir.",
    recovery: "reset-local-license",
    cause: error instanceof PremiumDeviceIdentityError ? error : undefined,
  });
}

function apiActivationError(
  endpointPhase: "challenge" | "redeem",
  error: unknown,
): PremiumFounderActivationError {
  if (error instanceof PremiumFounderActivationError) return error;
  if (error instanceof PremiumLicenseApiRequestError) {
    if (error.failure === "network-timeout") {
      return activationError({
        phase: "network",
        failure: "network-timeout",
        message:
          "Lisans servisi zamanında yanıt vermedi. İnternet bağlantısını kontrol edip kısa bir süre sonra tekrar deneyin.",
        recovery: "check-connection",
        cause: error,
      });
    }
    if (error.failure === "network-unavailable") {
      return activationError({
        phase: "network",
        failure: "network-unavailable",
        message:
          "Lisans servisine ulaşılamadı. İnternet bağlantısını kontrol edip tekrar deneyin.",
        recovery: "check-connection",
        cause: error,
      });
    }
    if (error.failure === "request-rejected") {
      return activationError({
        phase: endpointPhase,
        failure: "request-rejected",
        message:
          "Etkinleştirme isteği güvenlik nedeniyle tamamlanamadı. Kod, cihaz kaydı ve cihaz hakkı ayrıntıları ayrı ayrı açıklanmaz; arka arkaya denemeyin.",
        recovery: "contact-support",
        requestId: error.requestId,
        cause: error,
      });
    }
  }
  return activationError({
    phase: endpointPhase,
    failure: "response-invalid",
    message:
      "Lisans servisi bu uygulama sürümünün doğrulayabileceği bir yanıt vermedi. Uygulamayı güncelleyip tekrar deneyin.",
    recovery: "update-app",
    cause: error,
  });
}

export async function activatePremiumFounderAccess(
  input: ActivatePremiumFounderAccessInput,
): Promise<PremiumFounderAccessResult> {
  let configuration: PremiumFounderConfiguration;
  let requestTimeoutMs: number;
  try {
    configuration = validatedConfiguration(input.configuration);
    requestTimeoutMs = validRequestTimeout(input.requestTimeoutMs);
  } catch (error) {
    throw activationError({
      phase: "configuration",
      failure: "configuration-invalid",
      message:
        "Bu uygulama sürümünün Kurucu Premium bağlantısı eksik veya geçersiz. MaarifOS'u güncelleyip tekrar deneyin.",
      recovery: "update-app",
      cause: error,
    });
  }
  if (typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) {
    throw activationError({
      phase: "redeem",
      failure: "input-invalid",
      message: "Kurucu kodunu altı haneli olarak eksiksiz girin.",
      recovery: "retry",
    });
  }
  if (typeof input.appVersion !== "string" || !VERSION_PATTERN.test(input.appVersion)) {
    throw activationError({
      phase: "configuration",
      failure: "configuration-invalid",
      message:
        "Bu uygulama sürümü güvenli lisans isteği oluşturamıyor. MaarifOS'u güncelleyip tekrar deneyin.",
      recovery: "update-app",
    });
  }
  const fetcher = input.fetcher ?? globalThis.fetch?.bind(globalThis);
  if (!fetcher) {
    throw activationError({
      phase: "network",
      failure: "network-unavailable",
      message:
        "Bu tarayıcı lisans servisine bağlanamıyor. MaarifOS'u güncelleyip tekrar deneyin.",
      recovery: "update-app",
    });
  }
  const now = input.now ?? (() => new Date());
  const createIdempotencyKey = input.createIdempotencyKey ?? (() => crypto.randomUUID());
  const activeStores = stores(input);
  try {
    let identity: PremiumDeviceIdentity;
    try {
      identity = await getOrCreatePremiumDeviceIdentity(
        activeStores.deviceIdentityStore,
        validNow(now),
      );
    } catch (error) {
      throw deviceKeyActivationError(error);
    }
    const challengeRequest = Object.freeze({
      deviceKeyThumbprint: identity.thumbprint,
      purpose: "redeem-code" as const,
    });
    let challengeResponse: unknown;
    try {
      challengeResponse = await postExactJson({
        fetcher,
        url: apiUrl(configuration.apiOrigin, CHALLENGE_PATH),
        body: challengeRequest,
        maximumResponseBytes: MAX_CHALLENGE_RESPONSE_BYTES,
        timeoutMs: requestTimeoutMs,
      });
    } catch (error) {
      throw apiActivationError("challenge", error);
    }
    const challengeNow = validNow(now);
    let challenge: ReturnType<typeof validatePremiumLicenseChallenge>;
    try {
      challenge = validatePremiumLicenseChallenge(challengeResponse, {
        expectedDeviceKeyThumbprint: identity.thumbprint,
        expectedPurpose: "redeem-code",
        now: challengeNow,
      });
    } catch (error) {
      throw activationError({
        phase: "challenge",
        failure: "response-invalid",
        message:
          "Lisans servisinin cihaz doğrulama yanıtı güvenli biçimde doğrulanamadı. Uygulamayı güncelleyip tekrar deneyin.",
        recovery: "update-app",
        cause: error,
      });
    }
    let idempotencyKey: string;
    let redeemRequest: Awaited<ReturnType<typeof validatePremiumFounderRedeemRequest>>;
    try {
      idempotencyKey = createIdempotencyKey();
      if (!UUID_V4_PATTERN.test(idempotencyKey)) {
        throw new Error("Premium lisans idempotency anahtarı geçersiz.");
      }
      const proof = await createPremiumChallengeProof({
        identity,
        challenge,
        idempotencyKey,
        now: challengeNow,
      });
      redeemRequest = await validatePremiumFounderRedeemRequest({
        code: input.code,
        ...proof,
        devicePublicKeyJwk: identity.publicJwk,
        deviceKeyThumbprint: identity.thumbprint,
        appVersion: input.appVersion,
        idempotencyKey,
      });
    } catch (error) {
      throw activationError({
        phase: "proof",
        failure: error instanceof PremiumDeviceIdentityError
          ? "device-key-unavailable"
          : "proof-failed",
        message:
          "Bu telefon lisans isteği için gereken güvenli cihaz kanıtını oluşturamadı.",
        recovery: "reset-local-license",
        cause: error,
      });
    }

    let redeemPayload: unknown;
    try {
      redeemPayload = await postExactJson({
        fetcher,
        url: apiUrl(configuration.apiOrigin, FOUNDER_REDEEM_PATH),
        body: redeemRequest as unknown as Record<string, unknown>,
        maximumResponseBytes: MAX_REDEEM_RESPONSE_BYTES,
        idempotencyKey,
        timeoutMs: requestTimeoutMs,
      });
    } catch (error) {
      throw apiActivationError("redeem", error);
    }

    let redeemResponse: ReturnType<typeof validateRedeemResponse>;
    try {
      redeemResponse = validateRedeemResponse(redeemPayload);
    } catch (error) {
      throw activationError({
        phase: "redeem",
        failure: "response-invalid",
        message:
          "Lisans servisinin etkinleştirme yanıtı bu uygulama sürümüyle uyuşmuyor. Uygulamayı güncelleyip tekrar deneyin.",
        recovery: "update-app",
        cause: error,
      });
    }

    let bundle: ValidatedContentBundle;
    let access: VerifiedPremiumAccess;
    let verifiedAt: Date;
    try {
      bundle = await validateContentBundle(
        redeemResponse.contentBundle,
        configuration.expectedPack,
      );
      verifiedAt = validNow(now);
      access = await verifiedAccessFor(
        redeemResponse.entitlementToken,
        configuration,
        identity,
        bundle.pack,
        { now: verifiedAt },
      );
      if (
        access.status !== "active" ||
        access.grant.accessMode !== "staff-code" ||
        access.claims === null
      ) {
        throw new Error("Kurucu erişimi etkin bir STAFF entitlement döndürmedi.");
      }
    } catch (error) {
      throw activationError({
        phase: "verify",
        failure: "verification-failed",
        message:
          "Premium yetki veya içerik güvenlik doğrulamasını geçemedi. Erişim açılmadı; uygulamayı güncelleyip tekrar deneyin.",
        recovery: "update-app",
        cause: error,
      });
    }

    const savedAtUtc = verifiedAt.toISOString();
    try {
      await activeStores.contentBundleStore.save({
        ...bundle.record,
        savedAtUtc,
      });
      await activeStores.entitlementStore.save({
        token: redeemResponse.entitlementToken,
        claims: access.claims,
        savedAtUtc,
        maxObservedWallClockUtc: savedAtUtc,
      });
    } catch (error) {
      throw storageActivationError("store", error);
    }
    return Object.freeze({ access, pack: bundle.pack });
  } finally {
    activeStores.closeOwned();
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([key, nested]) => [key, canonicalize(nested)]),
  );
}

function assertStoredEntitlementRecord(record: StoredPremiumEntitlement): void {
  const item = object(record, "Saklanan premium entitlement");
  exactKeys(
    item,
    ["claims", "id", "maxObservedWallClockUtc", "savedAtUtc", "token"],
    "Saklanan premium entitlement",
  );
  if (item.id !== "active") throw new Error("Saklanan premium entitlement anahtarı geçersiz.");
  boundedText(item.token, "Saklanan premium entitlement tokenı", MAX_ENTITLEMENT_TOKEN_BYTES);
  const savedAtUtc = exactUtcTimestamp(item.savedAtUtc, "Entitlement kayıt zamanı");
  const maxObserved = exactUtcTimestamp(
    item.maxObservedWallClockUtc,
    "Entitlement son cihaz zamanı",
  );
  if (maxObserved < savedAtUtc) {
    throw new Error("Saklanan premium entitlement zaman zinciri geçersiz.");
  }
  object(item.claims, "Saklanan premium entitlement claim'leri");
}

async function clearAccessStores(
  entitlementStore: PremiumEntitlementStore,
  contentBundleStore: PremiumContentBundleStore,
): Promise<void> {
  const results = await Promise.allSettled([
    entitlementStore.clear(),
    contentBundleStore.clear(),
  ]);
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure) throw failure.reason;
}

export async function loadStoredPremiumFounderAccess(
  input: LoadStoredPremiumFounderAccessInput,
): Promise<PremiumFounderAccessResult | null> {
  const configuration = validatedConfiguration(input.configuration);
  const now = input.now ?? (() => new Date());
  const activeStores = stores(input);
  try {
    const [entitlementRecord, contentRecord] = await Promise.all([
      activeStores.entitlementStore.load(),
      activeStores.contentBundleStore.load(),
    ]);
    if (entitlementRecord === null && contentRecord === null) return null;

    const rejectInvalidStoredAccess = async (cause: unknown): Promise<never> => {
      try {
        await clearAccessStores(
          activeStores.entitlementStore,
          activeStores.contentBundleStore,
        );
      } catch (clearError) {
        throw storageActivationError("store", clearError);
      }
      throw new PremiumFounderActivationError({
        phase: "verify",
        failure: "verification-failed",
        message:
          "Bu cihazdaki premium erişim güvenlik doğrulamasını geçemedi ve yalnız premium erişim kayıtları güvenle temizlendi.",
        recovery: "retry",
        cause,
      });
    };

    if (entitlementRecord === null || contentRecord === null) {
      return rejectInvalidStoredAccess(new Error("Premium çevrimdışı önbelleği eksik."));
    }

    let bundle: ValidatedContentBundle;
    try {
      assertStoredEntitlementRecord(entitlementRecord);
      const storedBundle = object(contentRecord, "Saklanan premium içerik bundle'ı");
      exactKeys(
        storedBundle,
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
        "Saklanan premium içerik bundle'ı",
      );
      if (storedBundle.id !== "active") {
        throw new Error("Saklanan premium içerik bundle anahtarı geçersiz.");
      }
      exactUtcTimestamp(storedBundle.savedAtUtc, "Premium içerik kayıt zamanı");
      bundle = await validateContentBundle(
        {
          schemaVersion: storedBundle.schemaVersion,
          contentReleaseId: storedBundle.contentReleaseId,
          contentPackId: storedBundle.contentPackId,
          contentPackVersion: storedBundle.contentPackVersion,
          manifestDigest: storedBundle.manifestDigest,
          sku: storedBundle.sku,
          academicRelease: storedBundle.academicRelease,
          contentSha256: storedBundle.contentSha256,
          contentByteLength: storedBundle.contentByteLength,
          contentJson: storedBundle.contentJson,
        },
        configuration.expectedPack,
      );
    } catch (error) {
      return rejectInvalidStoredAccess(error);
    }

    let identity: PremiumDeviceIdentity;
    try {
      identity = await getOrCreatePremiumDeviceIdentity(
        activeStores.deviceIdentityStore,
        validNow(now),
      );
    } catch (error) {
      throw deviceKeyActivationError(error);
    }

    let access: VerifiedPremiumAccess;
    try {
      const maxObservedWallClock = new Date(entitlementRecord.maxObservedWallClockUtc);
      access = await verifiedAccessFor(
        entitlementRecord.token,
        configuration,
        identity,
        bundle.pack,
        {
          now: validNow(now),
          maxObservedWallClock,
          minimumRevocationGeneration: input.minimumRevocationGeneration,
        },
      );
      if (access.claims === null) {
        throw new Error("Saklanan premium entitlement claim'leri doğrulanamadı.");
      }
      if (
        JSON.stringify(canonicalize(access.claims)) !==
        JSON.stringify(canonicalize(entitlementRecord.claims))
      ) {
        throw new Error("Saklanan premium entitlement claim'leri tokenla uyuşmuyor.");
      }
    } catch (error) {
      return rejectInvalidStoredAccess(error);
    }

    try {
      await activeStores.entitlementStore.updateMaxObservedWallClock(validNow(now));
    } catch (error) {
      throw storageActivationError("store", error);
    }
    return Object.freeze({ access, pack: bundle.pack });
  } finally {
    activeStores.closeOwned();
  }
}

export async function clearStoredPremiumFounderAccess(
  dependencies: Pick<
    PremiumFounderClientDependencies,
    "entitlementStore" | "contentBundleStore"
  > = {},
): Promise<void> {
  const activeStores = stores(dependencies);
  try {
    await clearAccessStores(
      activeStores.entitlementStore,
      activeStores.contentBundleStore,
    );
  } finally {
    activeStores.closeOwned();
  }
}

export interface PremiumFounderLocalLicenseResetResult {
  readonly scope: "premium-license-only";
  readonly educationalDataTouched: false;
  readonly serverSlotReleased: false;
  readonly newDeviceBindingRequired: true;
}

export async function resetPremiumFounderLocalLicenseAccess(
  dependencies: Pick<
    PremiumFounderClientDependencies,
    "deviceIdentityStore" | "entitlementStore" | "contentBundleStore"
  > = {},
): Promise<PremiumFounderLocalLicenseResetResult> {
  const activeStores = stores(dependencies);
  try {
    const results = await Promise.allSettled([
      clearAccessStores(
        activeStores.entitlementStore,
        activeStores.contentBundleStore,
      ),
      activeStores.deviceIdentityStore.clear(),
    ]);
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failure) {
      throw storageActivationError("device-store", failure.reason);
    }
    return Object.freeze({
      scope: "premium-license-only" as const,
      educationalDataTouched: false as const,
      serverSlotReleased: false as const,
      newDeviceBindingRequired: true as const,
    });
  } finally {
    activeStores.closeOwned();
  }
}

export async function resetPremiumFounderDevice(
  dependencies: Pick<
    PremiumFounderClientDependencies,
    "deviceIdentityStore" | "entitlementStore" | "contentBundleStore"
  > = {},
): Promise<void> {
  await resetPremiumFounderLocalLicenseAccess(dependencies);
}
