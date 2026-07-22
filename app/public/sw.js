/* MaarifOS app-shell service worker. Keep all user data in IndexedDB; this
 * worker caches only public shell and static asset responses. */
const CACHE_PREFIX = "maarifos-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-v1`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-v1`;
const CACHEABLE_DESTINATIONS = new Set(["font", "image", "script", "style"]);
const NETWORK_TIMEOUT_MS = 5000;

const scopeUrl = new URL("./", self.registration.scope);
const indexUrl = new URL("index.html", scopeUrl);
const manifestUrl = new URL("manifest.webmanifest", scopeUrl);
const iconUrl = new URL("assets/emine-ogretmen-avatar.png", scopeUrl);
const assetsPath = new URL("assets/", scopeUrl).pathname;

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
    fetchAndStore(cache, new Request(iconUrl, { cache: "reload" })),
    ...discoverBuiltAssets(html).map((url) =>
      fetchAndStore(cache, new Request(url, { cache: "reload" })),
    ),
  ]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(installAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName.startsWith(CACHE_PREFIX) &&
              cacheName !== SHELL_CACHE &&
              cacheName !== ASSET_CACHE,
          )
          .map((cacheName) => caches.delete(cacheName)),
      );

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })(),
  );
});

async function networkFirstNavigation(event) {
  try {
    const preloadedResponse = await event.preloadResponse;
    const response = preloadedResponse || (await fetchWithTimeout(event.request));

    if (canStore(response) && response.headers.get("Content-Type")?.includes("text/html")) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(scopeUrl, response.clone());
      await cache.put(indexUrl, response.clone());
    }

    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (
      (await cache.match(event.request, { ignoreSearch: true })) ||
      (await cache.match(scopeUrl)) ||
      (await cache.match(indexUrl)) ||
      Response.error()
    );
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
