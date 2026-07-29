/* MaarifOS app-shell service worker. Keep all user data in IndexedDB; this
 * worker caches only public shell and static asset responses. */
const CACHE_PREFIX = "maarifos-";
const WORKER_RELEASE = "0.4.0";
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

const scopeUrl = new URL("./", self.registration.scope);
const indexUrl = new URL("index.html", scopeUrl);
const manifestUrl = new URL("manifest.webmanifest", scopeUrl);
const metadataUrl = new URL("__maarifos_runtime_metadata__", scopeUrl);
const iconUrls = [
  "assets/brand/maarifos-icon-192.png",
  "assets/brand/maarifos-icon-512.png",
  "assets/brand/maarifos-icon-maskable-512.png",
  "assets/brand/apple-touch-icon-180.png",
  "assets/brand/favicon-32.png",
].map((path) => new URL(path, scopeUrl));
const assetsPath = new URL("assets/", scopeUrl).pathname;

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
  const [scope, index, manifest] = await Promise.all([
    cache.match(scopeUrl),
    cache.match(indexUrl),
    cache.match(manifestUrl),
  ]);
  return Boolean(scope && index && manifest);
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
  if (!(await verifyCurrentShellCache())) return false;

  const metadata = (await readRuntimeMetadata()) ?? (await recordActivation());
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
  if (shellReady) await markHealthyAndCleanup();
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

function discoverBuiltAssets(html) {
  const assetUrls = new Set();
  const referencePattern = /(?:src|href)=["']([^"']+)["']/gi;

  for (const match of html.matchAll(referencePattern)) {
    const candidate = new URL(match[1], scopeUrl);
    if (candidate.origin === scopeUrl.origin && candidate.pathname.startsWith(assetsPath)) {
      assetUrls.add(candidate.href);
    }
  }

  return [...assetUrls];
}

async function installAppShell() {
  const cache = await caches.open(SHELL_CACHE);
  const indexRequest = new Request(indexUrl, { cache: "reload" });
  const indexResponse = await fetch(indexRequest);

  if (!canStore(indexResponse)) {
    throw new Error("MaarifOS çevrimdışı uygulama kabuğu alınamadı.");
  }

  const html = await indexResponse.clone().text();
  await Promise.all([
    cache.put(scopeUrl, indexResponse.clone()),
    cache.put(indexUrl, indexResponse.clone()),
    fetchAndStore(cache, new Request(manifestUrl, { cache: "reload" })),
    ...iconUrls.map((url) =>
      fetchAndStore(cache, new Request(url, { cache: "reload" })),
    ),
    ...discoverBuiltAssets(html).map((url) =>
      fetchAndStore(cache, new Request(url, { cache: "reload" })),
    ),
  ]);
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

    if (canStore(response) && response.headers.get("Content-Type")?.includes("text/html")) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(scopeUrl, response.clone());
      await cache.put(indexUrl, response.clone());
    }

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
  const cached = (await runtimeCache.match(event.request)) || (await shellCache.match(event.request));

  if (cached) {
    event.waitUntil(revalidateStaticAsset(event.request).catch(() => undefined));
    return cached;
  }

  for (const cacheName of [
    ...(await fallbackCacheNames("assets")),
    ...(await fallbackCacheNames("shell")),
  ]) {
    const fallback = await (await caches.open(cacheName)).match(event.request);
    if (fallback) return fallback;
  }

  return revalidateStaticAsset(event.request);
}

function isSensitivePath(url) {
  return (
    url.pathname.startsWith(new URL("api/", scopeUrl).pathname) ||
    url.pathname.startsWith(new URL("auth/", scopeUrl).pathname)
  );
}

function shouldHandleStaticRequest(request, url) {
  if (url.pathname === new URL("sw.js", scopeUrl).pathname) return false;
  if (isSensitivePath(url)) return false;

  return (
    CACHEABLE_DESTINATIONS.has(request.destination) ||
    url.pathname === manifestUrl.pathname ||
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
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  if (shouldHandleStaticRequest(request, url)) {
    event.respondWith(cacheFirstStaticAsset(event));
  }
});
