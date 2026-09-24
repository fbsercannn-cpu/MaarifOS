import type {
  PremiumContentPack,
  PremiumContentPackSnapshot,
} from "./domain.ts";
import {
  assertPremiumContentPackValuesIntegrity,
  loadPremiumPreviewPackFromUrl,
} from "./content-repository.ts";

type BuiltInMaarifRelease = "v2" | "v3";

export type BuiltInMaarifPlanPackReference = Pick<
  PremiumContentPackSnapshot,
  "id" | "version" | "manifestDigest"
>;

const BUILT_IN_RELEASES: Readonly<
  Record<
    BuiltInMaarifRelease,
    BuiltInMaarifPlanPackReference & { readonly contentUrl: string }
  >
> = Object.freeze({
  v2: Object.freeze({
    id: "maarifos-tymm-6072-2026-2027-v2",
    version: "2.0.0",
    manifestDigest:
      "sha256:f59acdadd13d535936ef23bd4667914e49ef8cec96a5acc72ef33008a979d2a1",
    contentUrl: "./assets/maarif-content/tymm-6072-2026-09-v2.json",
  }),
  v3: Object.freeze({
    id: "maarifos-tymm-6072-2026-2027-v3",
    version: "3.0.0",
    manifestDigest:
      "sha256:9b4c2bcc155e3f6f8567ba5737249cd417405bc4205b75b68d194e63ca3eff1e",
    contentUrl: "./assets/maarif-content/tymm-6072-2026-09-v3.json",
  }),
});
const cachedBuiltInPacks = new Map<BuiltInMaarifRelease, PremiumContentPack>();
const BUILT_IN_SOURCE_ASSETS = new Map<string, string>([
  [
    "/src/features/values/values-pedagogy-constitution.v1.json",
    "./assets/maarif-content/values-pedagogy-constitution.v1.json",
  ],
  [
    "/src/features/values/official-preschool-value-actions.v1.json",
    "./assets/maarif-content/official-preschool-value-actions.v1.json",
  ],
]);

type BuiltInContentFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface LoadBuiltInMaarifPlanPackOptions {
  fetcher?: BuiltInContentFetcher;
}

export interface InstalledBuiltInMaarifPlanReference {
  readonly contentPackId?: unknown;
  readonly contentPackVersion?: unknown;
  readonly contentPackSnapshot?: unknown;
}

function deepFreeze<Value>(value: Value): Value {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function builtInReleaseForReference(
  reference: BuiltInMaarifPlanPackReference,
): BuiltInMaarifRelease {
  for (const releaseId of ["v2", "v3"] as const) {
    const candidate = BUILT_IN_RELEASES[releaseId];
    if (
      candidate.id === reference.id &&
      candidate.version === reference.version &&
      candidate.manifestDigest === reference.manifestDigest
    ) {
      return releaseId;
    }
  }
  throw new Error(
    "Yerleşik Maarif plan kaynağı yalnız exact v2 veya v3 snapshot kimliğiyle açılabilir.",
  );
}

export function builtInPackReferenceFromInstalledPlan(
  plan: InstalledBuiltInMaarifPlanReference,
): BuiltInMaarifPlanPackReference {
  const snapshot = plan.contentPackSnapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error(
      "Kurulu sağlayıcı planının doğrulanmış içerik snapshot'ı bulunamadı.",
    );
  }
  const candidate = snapshot as Record<string, unknown>;
  const id = candidate.id;
  const version = candidate.version;
  const manifestDigest = candidate.manifestDigest;
  if (
    typeof id !== "string" ||
    typeof version !== "string" ||
    typeof manifestDigest !== "string" ||
    plan.contentPackId !== id ||
    plan.contentPackVersion !== version
  ) {
    throw new Error(
      "Kurulu sağlayıcı planı ile içerik snapshot kimliği uyuşmuyor.",
    );
  }
  return Object.freeze({ id, version, manifestDigest });
}

function assertPackMatchesRelease(
  pack: PremiumContentPack,
  release: (typeof BUILT_IN_RELEASES)[BuiltInMaarifRelease],
): void {
  if (
    pack.id !== release.id ||
    pack.version !== release.version ||
    pack.manifestDigest !== release.manifestDigest
  ) {
    throw new Error(
      "Yerleşik Maarif plan kaynağı istenen snapshot kimliğiyle uyuşmuyor.",
    );
  }
}

async function loadBuiltInRelease(
  releaseId: BuiltInMaarifRelease,
  options: LoadBuiltInMaarifPlanPackOptions,
): Promise<PremiumContentPack> {
  const cached = cachedBuiltInPacks.get(releaseId);
  if (cached) return cached;

  const release = BUILT_IN_RELEASES[releaseId];
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const mappedFetcher: BuiltInContentFetcher = (input, init) => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const parsedUrl = new URL(rawUrl, "https://maarifos-built-in.invalid/");
    const mappedPath = BUILT_IN_SOURCE_ASSETS.get(parsedUrl.pathname);
    if (!mappedPath) return fetcher(input, init);

    const mappedUrl = /^[A-Za-z][A-Za-z\d+.-]*:/u.test(rawUrl)
      ? new URL(mappedPath, parsedUrl.origin).toString()
      : mappedPath;
    return fetcher(mappedUrl, init);
  };
  const parsed = await loadPremiumPreviewPackFromUrl(
    release.contentUrl,
    mappedFetcher,
  );
  assertPackMatchesRelease(parsed, release);
  assertPremiumContentPackValuesIntegrity(parsed);
  const frozen = deepFreeze(parsed);
  cachedBuiltInPacks.set(releaseId, frozen);
  return frozen;
}

/**
 * Ortak davet koduyla açılan sürümün gömülü Maarif plan kaynağıdır.
 *
 * Dosya build-time kaynak revizyonuna dahildir; codec exact v3 kimlik ve
 * pedagojik sözleşmeyi yeniden doğrular. Ticari entitlement, cihaz kotası veya
 * geliştirme ortamı bu salt okunur kaynak otoritesinin parçası değildir.
 */
export async function loadBuiltInMaarifPlanPack(
  options: LoadBuiltInMaarifPlanPackOptions = {},
): Promise<PremiumContentPack> {
  return loadBuiltInRelease("v3", options);
}

/**
 * Cihazdaki eski sağlayıcı planını yalnız kendi exact gömülü kaynağıyla açar.
 * Bilinmeyen, kısmi veya sürümü/digest'i değiştirilmiş snapshot fail-closed kalır.
 */
export async function loadBuiltInMaarifPlanPackForSnapshot(
  reference: BuiltInMaarifPlanPackReference,
  options: LoadBuiltInMaarifPlanPackOptions = {},
): Promise<PremiumContentPack> {
  return loadBuiltInRelease(builtInReleaseForReference(reference), options);
}
