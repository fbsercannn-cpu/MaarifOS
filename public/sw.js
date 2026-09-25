/* MaarifOS app-shell service worker. Keep all user data in IndexedDB; this
 * worker caches only public shell and static asset responses. */
const CACHE_PREFIX = "maarifos-";
const WORKER_RELEASE = "0.75.4";
const UPDATE_READY_MESSAGE = "maarifos:update-ready";
const STATUS_REQUEST_MESSAGE = "maarifos:get-status";
const STATUS_RESPONSE_MESSAGE = "maarifos:sw-status";
const SKIP_WAITING_MESSAGE = "maarifos:skip-waiting";
const CACHE_VERSION = WORKER_RELEASE;
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-${CACHE_VERSION}`;
const META_CACHE = `${CACHE_PREFIX}meta`;
const CACHEABLE_DESTINATIONS = new Set(["font", "image", "script", "style"]);
const NETWORK_TIMEOUT_MS = 5000;
const CACHE_HEALTH_WINDOW_MS = 24 * 60 * 60 * 1000;
const PRECACHE_MANIFEST_SCHEMA_VERSION = 1;
const MAX_PRECACHE_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_PRECACHE_ASSETS = 2000;

const scopeUrl = new URL("./", self.registration.scope);
const indexUrl = new URL("index.html", scopeUrl);
const webAppManifestUrl = new URL("manifest.webmanifest", scopeUrl);
const precacheManifestUrl = new URL("maarifos-precache-manifest.json", scopeUrl);
const metadataUrl = new URL("__maarifos_runtime_metadata__", scopeUrl);
const shellReadyUrl = new URL("__maarifos_shell_ready__", scopeUrl);
const assetsPath = new URL("assets/", scopeUrl).pathname;

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function hasExactKeys(value, expectedKeys) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value).sort();
  const sortedExpected = [...expectedKeys].sort();
  return actualKeys.length === sortedExpected.length &&
    actualKeys.every((key, index) => key === sortedExpected[index]);
}

function parsePrecacheManifestBytes(bytes) {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PRECACHE_MANIFEST_BYTES) {
    throw new Error("MaarifOS çevrim dışı varlık listesi geçersiz.");
  }

  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("MaarifOS çevrim dışı varlık listesi geçersiz.");
  }
  if (
    !hasExactKeys(value, ["assets", "release", "schemaVersion"]) ||
    value.schemaVersion !== PRECACHE_MANIFEST_SCHEMA_VERSION ||
    value.release !== WORKER_RELEASE ||
    !Array.isArray(value.assets) ||
    value.assets.length === 0 ||
    value.assets.length > MAX_PRECACHE_ASSETS
  ) {
    throw new Error("MaarifOS çevrim dışı varlık listesi sürümle eşleşmiyor.");
  }

  const seenPaths = new Set();
  const assets = value.assets.map((asset) => {
    if (
      !hasExactKeys(asset, ["path", "sha256", "size"]) ||
      typeof asset.path !== "string" ||
      asset.path.length === 0 ||
      asset.path.length > 500 ||
      !asset.path.startsWith("assets/") ||
      asset.path.includes("\\") ||
      asset.path.includes("%") ||
      asset.path.includes("?") ||
      asset.path.includes("#") ||
      asset.path.split("/").some((segment) => segment === "" || segment === "." || segment === "..") ||
      typeof asset.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/u.test(asset.sha256) ||
      !Number.isSafeInteger(asset.size) ||
      asset.size < 0 ||
      seenPaths.has(asset.path)
    ) {
      throw new Error("MaarifOS çevrim dışı varlık listesinde güvensiz bir kayıt var.");
    }

    const url = new URL(asset.path, scopeUrl);
    if (
      url.origin !== scopeUrl.origin ||
      !url.pathname.startsWith(assetsPath) ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      throw new Error("MaarifOS çevrim dışı varlık listesinde güvensiz bir kayıt var.");
    }
    seenPaths.add(asset.path);
    return Object.freeze({ ...asset, url });
  });

  if (
    !assets.some((asset) => asset.path.endsWith(".js")) ||
    !assets.some((asset) => asset.path.endsWith(".css"))
  ) {
    throw new Error("MaarifOS çevrim dışı varlık listesinde uygulama kaynakları eksik.");
  }
  return Object.freeze({ assets: Object.freeze(assets), release: value.release });
}

async function readVerifiedPrecacheManifest(response) {
  const contentType = response?.headers?.get("Content-Type") || "";
  if (!canStore(response) || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new Error("MaarifOS çevrim dışı varlık listesi alınamadı.");
  }
  const bytes = await response.clone().arrayBuffer();
  return Object.freeze({
    manifest: parsePrecacheManifestBytes(bytes),
    sha256: await sha256Hex(bytes),
  });
}

async function verifyPrecacheAssetResponse(response, asset) {
  if (!canStore(response)) {
    throw new Error(`App-shell kaynağı alınamadı: ${asset.url.pathname}`);
  }
  const bytes = await response.clone().arrayBuffer();
  if (bytes.byteLength !== asset.size || await sha256Hex(bytes) !== asset.sha256) {
    throw new Error(`App-shell kaynağı bütünlük doğrulamasını geçemedi: ${asset.url.pathname}`);
  }
  return response;
}

async function readRuntimeMetadata() {
  try {
    const cache = await caches.open(META_CACHE);
    const response = await cache.match(metadataUrl);
    if (!response) return null;
    const value = await response.json();
    return value &&
      value.schemaVersion === 1 &&
      typeof value.currentRelease === "string" &&
      (value.previousRelease === null || typeof value.previousRelease === "string") &&
      Number.isFinite(value.activatedAt) &&
      (value.healthyAt === null || Number.isFinite(value.healthyAt))
      ? value
      : null;
  } catch {
    return null;
  }
}

async function writeRuntimeMetadata(metadata) {
  const cache = await caches.open(META_CACHE);
  await cache.put(
    metadataUrl,
    new Response(JSON.stringify(metadata), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function releaseFromShellCache(cacheName) {
  const prefix = `${CACHE_PREFIX}shell-`;
  return cacheName.startsWith(prefix) ? cacheName.slice(prefix.length) : null;
}

function isCurrentWorkerActive() {
  const activeScriptUrl = self.registration.active?.scriptURL;
  return typeof activeScriptUrl === "string" && activeScriptUrl === self.location.href;
}

async function recordActivation() {
  const existing = await readRuntimeMetadata();
  if (existing?.currentRelease === WORKER_RELEASE) return existing;

  const cacheNames = await caches.keys();
  const inferredPrevious = cacheNames
    .map(releaseFromShellCache)
    .filter((release) => release && release !== WORKER_RELEASE)
    .at(-1);
  const metadata = {
    schemaVersion: 1,
    currentRelease: WORKER_RELEASE,
    previousRelease:
      existing?.currentRelease && existing.currentRelease !== WORKER_RELEASE
        ? existing.currentRelease
        : inferredPrevious ?? existing?.previousRelease ?? null,
    activatedAt: Date.now(),
    healthyAt: null,
  };
  await writeRuntimeMetadata(metadata);
  return metadata;
}

async function verifyCurrentShellCache() {
  const cache = await caches.open(SHELL_CACHE);
  const [scope, index, webAppManifest, precacheManifest, readyMarker] = await Promise.all([
    cache.match(scopeUrl),
    cache.match(indexUrl),
    cache.match(webAppManifestUrl),
    cache.match(precacheManifestUrl),
    cache.match(shellReadyUrl),
  ]);
  if (!scope || !index || !webAppManifest || !precacheManifest || !readyMarker) return false;

  try {
    const marker = await readyMarker.json();
    const verifiedManifest = await readVerifiedPrecacheManifest(precacheManifest);
    if (
      !hasExactKeys(marker, ["assetCount", "manifestSha256", "release", "schemaVersion"]) ||
      marker.schemaVersion !== 1 ||
      marker.release !== WORKER_RELEASE ||
      marker.manifestSha256 !== verifiedManifest.sha256 ||
      marker.assetCount !== verifiedManifest.manifest.assets.length
    ) {
      return false;
    }

    const cachedAssets = await Promise.all(
      verifiedManifest.manifest.assets.map(async (asset) => {
        const response = await cache.match(asset.url, { ignoreVary: true });
        if (!response) return false;
        await verifyPrecacheAssetResponse(response, asset);
        return true;
      }),
    );
    return cachedAssets.every(Boolean);
  } catch {
    return false;
  }
}

async function fallbackCacheNames(kind) {
  const metadata = await readRuntimeMetadata();
  const cacheNames = await caches.keys();
  const currentName = kind === "shell" ? SHELL_CACHE : ASSET_CACHE;
  const prefix = `${CACHE_PREFIX}${kind}-`;
  const preferred =
    metadata?.previousRelease
      ? `${CACHE_PREFIX}${kind}-${metadata.previousRelease}`
      : null;
  const names = cacheNames.filter(
    (cacheName) => cacheName.startsWith(prefix) && cacheName !== currentName,
  );

  if (preferred && names.includes(preferred)) {
    return [preferred, ...names.filter((cacheName) => cacheName !== preferred).reverse()];
  }
  return names.reverse();
}

async function markHealthyAndCleanup() {
  if (!isCurrentWorkerActive()) return false;
  if (!(await verifyCurrentShellCache())) return false;

  const metadata = await readRuntimeMetadata();
  if (!metadata || metadata.currentRelease !== WORKER_RELEASE) return false;

  const healthyAt = metadata.healthyAt ?? Date.now();
  if (metadata.healthyAt === null) {
    await writeRuntimeMetadata({ ...metadata, healthyAt });
  }

  if (Date.now() - healthyAt < CACHE_HEALTH_WINDOW_MS) return true;

  const keep = new Set([SHELL_CACHE, ASSET_CACHE, META_CACHE]);
  if (metadata.previousRelease) {
    keep.add(`${CACHE_PREFIX}shell-${metadata.previousRelease}`);
    keep.add(`${CACHE_PREFIX}assets-${metadata.previousRelease}`);
  }
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && !keep.has(cacheName))
      .map((cacheName) => caches.delete(cacheName)),
  );
  return true;
}

async function getWorkerHealth() {
  const cacheNames = await caches.keys();
  const shellReady = await verifyCurrentShellCache();
  return {
    type: STATUS_RESPONSE_MESSAGE,
    version: WORKER_RELEASE,
    shellReady,
    shellCache: SHELL_CACHE,
    fallbackCacheCount: cacheNames.filter(
      (cacheName) =>
        cacheName.startsWith(CACHE_PREFIX) &&
        cacheName !== SHELL_CACHE &&
        cacheName !== ASSET_CACHE &&
        cacheName !== META_CACHE,
    ).length,
  };
}

async function notifyClientsUpdateReady() {
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of windowClients) {
    client.postMessage({
      type: UPDATE_READY_MESSAGE,
      version: WORKER_RELEASE,
    });
  }
}

function canStore(response) {
  if (!response || !response.ok || response.type !== "basic") return false;

  const cacheControl = response.headers.get("Cache-Control") || "";
  const vary = response.headers.get("Vary") || "";
  return !/\bno-store\b/i.test(cacheControl) && vary.trim() !== "*";
}

async function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAndStore(cache, request) {
  const response = await fetch(request);
  if (!canStore(response)) {
    throw new Error(`App-shell kaynağı alınamadı: ${new URL(request.url).pathname}`);
  }

  await cache.put(request, response.clone());
  return response;
}

async function fetchVerifiedPrecacheAsset(asset) {
  const request = new Request(asset.url, { cache: "reload" });
  const response = await fetch(request);
  await verifyPrecacheAssetResponse(response, asset);
  return Object.freeze({ request, response });
}

function discoverBuiltAssets(html) {
  const assetUrls = new Set();
  const referencePattern = /(?:src|href)=["']([^"']+)["']/gi;

  for (const match of html.matchAll(referencePattern)) {
    let candidate;
    try {
      candidate = new URL(match[1], scopeUrl);
    } catch {
      continue;
    }
    if (candidate.origin === scopeUrl.origin && candidate.pathname.startsWith(assetsPath)) {
      assetUrls.add(candidate.href);
    }
  }

  return [...assetUrls];
}

async function installAppShell() {
  const cache = await caches.open(SHELL_CACHE);
  const indexRequest = new Request(indexUrl, { cache: "reload" });
  const precacheManifestRequest = new Request(precacheManifestUrl, { cache: "reload" });
  const [indexResponse, precacheManifestResponse] = await Promise.all([
    fetch(indexRequest),
    fetch(precacheManifestRequest),
  ]);
  const contentType = indexResponse.headers.get("Content-Type") || "";

  if (!canStore(indexResponse) || !/^text\/html(?:\s*;|$)/i.test(contentType)) {
    throw new Error("MaarifOS çevrim dışı uygulama kabuğu alınamadı.");
  }

  const html = await indexResponse.clone().text();
  const builtAssets = discoverBuiltAssets(html);
  const hasScript = builtAssets.some((url) => new URL(url).pathname.endsWith(".js"));
  const hasStyle = builtAssets.some((url) => new URL(url).pathname.endsWith(".css"));
  if (!hasScript || !hasStyle) {
    throw new Error("MaarifOS uygulama kabuğunun derlenmiş kaynakları doğrulanamadı.");
  }

  const verifiedManifest = await readVerifiedPrecacheManifest(precacheManifestResponse);
  const manifestAssetUrls = new Set(
    verifiedManifest.manifest.assets.map((asset) => asset.url.href),
  );
  if (builtAssets.some((url) => !manifestAssetUrls.has(url))) {
    throw new Error("MaarifOS uygulama kabuğu çevrim dışı varlık listesiyle eşleşmiyor.");
  }
  const verifiedAssets = await Promise.all(
    verifiedManifest.manifest.assets.map(fetchVerifiedPrecacheAsset),
  );

  await Promise.all([
    cache.put(scopeUrl, indexResponse.clone()),
    cache.put(indexUrl, indexResponse.clone()),
    fetchAndStore(cache, new Request(webAppManifestUrl, { cache: "reload" })),
    cache.put(precacheManifestRequest, precacheManifestResponse.clone()),
    ...verifiedAssets.map(({ request, response }) => cache.put(request, response.clone())),
  ]);
  await cache.put(
    shellReadyUrl,
    new Response(JSON.stringify({
      schemaVersion: 1,
      release: WORKER_RELEASE,
      assetCount: verifiedManifest.manifest.assets.length,
      manifestSha256: verifiedManifest.sha256,
    }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    installAppShell().then(() =>
      self.registration.active ? notifyClientsUpdateReady() : undefined,
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await recordActivation();

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === STATUS_REQUEST_MESSAGE) {
    event.waitUntil(
      getWorkerHealth().then((health) => {
        event.ports[0]?.postMessage(health);
      }),
    );
    return;
  }

  if (
    event.data?.type === SKIP_WAITING_MESSAGE &&
    event.data?.version === WORKER_RELEASE
  ) {
    event.waitUntil(self.skipWaiting());
  }
});

async function matchNavigationFallback(request) {
  const currentCache = await caches.open(SHELL_CACHE);
  const currentMatch =
    (await currentCache.match(request, { ignoreSearch: true })) ||
    (await currentCache.match(scopeUrl)) ||
    (await currentCache.match(indexUrl));
  if (currentMatch) return currentMatch;

  for (const cacheName of await fallbackCacheNames("shell")) {
    const cache = await caches.open(cacheName);
    const fallback =
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(scopeUrl)) ||
      (await cache.match(indexUrl));
    if (fallback) return fallback;
  }
  return null;
}

async function networkFirstNavigation(event) {
  try {
    const preloadedResponse = await event.preloadResponse;
    const response = preloadedResponse || (await fetchWithTimeout(event.request));
    if (!canStore(response) || !response.headers.get("Content-Type")?.includes("text/html")) {
      throw new Error("Gezinme yanıtı çevrim dışı uygulama kabuğu olarak kullanılamaz.");
    }

    const cache = await caches.open(SHELL_CACHE);
    await cache.put(scopeUrl, response.clone());
    await cache.put(indexUrl, response.clone());

    event.waitUntil(markHealthyAndCleanup().catch(() => undefined));
    return response;
  } catch {
    return (await matchNavigationFallback(event.request)) || Response.error();
  }
}

async function revalidateStaticAsset(request) {
  const response = await fetch(request);
  if (canStore(response)) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirstStaticAsset(event) {
  const runtimeCache = await caches.open(ASSET_CACHE);
  const shellCache = await caches.open(SHELL_CACHE);
  const cached =
    (await runtimeCache.match(event.request)) ||
    (await shellCache.match(event.request, { ignoreVary: true }));

  if (cached) {
    event.waitUntil(revalidateStaticAsset(event.request).catch(() => undefined));
    return cached;
  }

  for (const cacheName of await fallbackCacheNames("assets")) {
    const fallback = await (await caches.open(cacheName)).match(event.request);
    if (fallback) return fallback;
  }
  for (const cacheName of await fallbackCacheNames("shell")) {
    const fallback = await (await caches.open(cacheName)).match(
      event.request,
      { ignoreVary: true },
    );
    if (fallback) return fallback;
  }

  return revalidateStaticAsset(event.request);
}

function isSensitivePath(url) {
  const routingPath = decodeRoutingPath(url.pathname);
  if (routingPath === null) return false;

  return ["api", "auth"].some((segment) => {
    const path = new URL(segment, scopeUrl).pathname;
    return routingPath === path || routingPath.startsWith(`${path}/`);
  });
}

function decodeRoutingPath(pathname) {
  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes("%") || decoded.includes("\\") || decoded.includes("\0")) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function isAppNavigationPath(url) {
  const routingPath = decodeRoutingPath(url.pathname);
  if (routingPath === null) return false;
  if ([scopeUrl.pathname, indexUrl.pathname].includes(routingPath)) return true;

  const assetsRootPath = assetsPath.endsWith("/") ? assetsPath.slice(0, -1) : assetsPath;
  const finalPathSegment = routingPath.split("/").at(-1) || "";
  return (
    routingPath !== assetsRootPath &&
    !routingPath.startsWith(assetsPath) &&
    !finalPathSegment.includes(".")
  );
}

function shouldHandleStaticRequest(request, url) {
  if (url.pathname === new URL("sw.js", scopeUrl).pathname) return false;
  if (isSensitivePath(url)) return false;

  return (
    CACHEABLE_DESTINATIONS.has(request.destination) ||
    url.pathname === webAppManifestUrl.pathname ||
    url.pathname === precacheManifestUrl.pathname ||
    url.pathname.startsWith(assetsPath)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    isSensitivePath(url) ||
    request.headers.has("Authorization") ||
    request.headers.has("Range") ||
    (request.cache === "only-if-cached" && request.mode !== "same-origin")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    if (isAppNavigationPath(url)) {
      event.respondWith(networkFirstNavigation(event));
    }
    return;
  }

  if (shouldHandleStaticRequest(request, url)) {
    event.respondWith(cacheFirstStaticAsset(event));
  }
});
