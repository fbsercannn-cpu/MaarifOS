import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const projectFile = (relativePath) => new URL(`../${relativePath}`, import.meta.url);
const currentRelease = JSON.parse(
  await readFile(projectFile("package.json"), "utf8"),
).version;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const encodeBody = (body) =>
  body instanceof Uint8Array ? body : new TextEncoder().encode(String(body));
const makeBasicResponse = (
  body,
  { contentType = "application/octet-stream", ok = true } = {},
) => {
  const bytes = encodeBody(body);
  const create = () => ({
    ok,
    type: "basic",
    headers: new Headers({ "Content-Type": contentType }),
    clone: create,
    arrayBuffer: async () => bytes.slice().buffer,
    json: async () => JSON.parse(new TextDecoder().decode(bytes)),
    text: async () => new TextDecoder().decode(bytes),
  });
  return create();
};
const createPrecacheManifestBody = (assetBodies, release = currentRelease) => {
  const assets = Object.entries(assetBodies)
    .map(([path, body]) => {
      const bytes = encodeBody(body);
      return { path: path.replace(/^\//u, ""), sha256: sha256(bytes), size: bytes.length };
    })
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  return `${JSON.stringify({ schemaVersion: 1, release, assets }, null, 2)}\n`;
};

const pngDimensions = async (relativePath) => {
  const png = await readFile(projectFile(relativePath));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
};

test("manifest kurulabilir uygulama sözleşmesini ve marka ikonlarını korur", async () => {
  const manifest = JSON.parse(await readFile(projectFile("public/manifest.webmanifest"), "utf8"));

  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/?view=app&native=1");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.lang, "tr-TR");
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);

  const expectedIcons = [
    { src: "/assets/brand/maarifos-icon-192.png", sizes: "192x192", purpose: "any", size: 192 },
    { src: "/assets/brand/maarifos-icon-512.png", sizes: "512x512", purpose: "any", size: 512 },
    { src: "/assets/brand/maarifos-icon-maskable-512.png", sizes: "512x512", purpose: "maskable", size: 512 },
  ];

  for (const expected of expectedIcons) {
    const icon = manifest.icons.find((candidate) => candidate.src === expected.src);
    assert.ok(icon, `${expected.src} manifestte bulunmalı`);
    assert.equal(icon.sizes, expected.sizes);
    assert.equal(icon.type, "image/png");
    assert.equal(icon.purpose, expected.purpose);
    assert.deepEqual(
      await pngDimensions(`public${icon.src}`),
      { width: expected.size, height: expected.size },
    );
  }

  assert.doesNotMatch(JSON.stringify(manifest), /emine-ogretmen-avatar/);
});

test("HTML manifesti ve iOS kurulum metalarını yayınlar", async () => {
  const html = await readFile(projectFile("index.html"), "utf8");

  assert.match(html, /<html lang="tr">/);
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /name="mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="MaarifOS"/);
  assert.match(
    html,
    /rel="apple-touch-icon" sizes="180x180" href="\/assets\/brand\/apple-touch-icon-180\.png"/,
  );
  assert.match(html, /rel="icon" type="image\/png" sizes="32x32" href="\/assets\/brand\/favicon-32\.png"/);
  assert.deepEqual(
    await pngDimensions("public/assets/brand/apple-touch-icon-180.png"),
    { width: 180, height: 180 },
  );
  assert.deepEqual(
    await pngDimensions("public/assets/brand/favicon-32.png"),
    { width: 32, height: 32 },
  );
  assert.doesNotMatch(html, /<script>(?:.|\n)*?<\/script>/);
  assert.doesNotMatch(html, /emine-ogretmen-avatar/);
});

test("service worker kontrollü güncelleme, sağlık penceresi ve rollback cache sınırlarını içerir", async () => {
  const worker = await readFile(projectFile("public/sw.js"), "utf8");

  assert.match(worker, /addEventListener\("install"/);
  assert.match(worker, /addEventListener\("activate"/);
  assert.match(worker, /addEventListener\("fetch"/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /cache\.match\(scopeUrl\)/);
  assert.match(worker, /request\.method !== "GET"/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /request\.headers\.has\("Authorization"\)/);
  assert.match(worker, /request\.headers\.has\("Range"\)/);
  assert.match(worker, /no-store/);
  assert.match(worker, /\^text\\\/html/);
  assert.match(worker, /const hasScript = builtAssets\.some/);
  assert.match(worker, /const hasStyle = builtAssets\.some/);
  assert.match(worker, /maarifos-precache-manifest\.json/);
  assert.match(worker, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(worker, /verifiedManifest\.manifest\.assets\.map\(fetchVerifiedPrecacheAsset\)/);
  assert.match(worker, /verifyPrecacheAssetResponse\(response, asset\)/);
  assert.match(worker, /cache\.match\(asset\.url, \{ ignoreVary: true \}\)/);
  assert.match(worker, /shellCache\.match\(event\.request, \{ ignoreVary: true \}\)/);
  assert.match(worker, /const shellReadyUrl = new URL\("__maarifos_shell_ready__"/);
  assert.match(worker, /cache\.match\(shellReadyUrl\)/);
  assert.match(worker, /assetCount: verifiedManifest\.manifest\.assets\.length/);
  assert.match(worker, /manifestSha256: verifiedManifest\.sha256/);
  assert.match(worker, /release: WORKER_RELEASE/);
  assert.match(worker, /function decodeRoutingPath\(pathname\)/);
  assert.match(worker, /function isAppNavigationPath\(url\)/);
  assert.match(worker, /function isSensitivePath\(url\)/);
  assert.match(worker, /isSensitivePath\(url\) \|\|/);
  assert.match(
    worker,
    new RegExp(`const WORKER_RELEASE = "${currentRelease.replaceAll(".", "\\.")}"`),
  );
  assert.match(worker, /shell-\$\{CACHE_VERSION\}/);
  assert.match(worker, /assets-\$\{CACHE_VERSION\}/);
  assert.match(worker, /const CACHE_HEALTH_WINDOW_MS = 24 \* 60 \* 60 \* 1000/);
  assert.match(worker, /previousRelease/);
  assert.match(worker, /fallbackCacheNames/);
  assert.match(worker, /function isCurrentWorkerActive\(\)/);
  assert.match(worker, /if \(!isCurrentWorkerActive\(\)\) return false/);
  assert.match(worker, /metadata\.currentRelease !== WORKER_RELEASE/);
  assert.match(worker, /markHealthyAndCleanup/);
  assert.match(worker, /self\.clients\.matchAll/);
  assert.match(worker, /client\.postMessage/);
  assert.match(worker, /version: WORKER_RELEASE/);
  assert.match(worker, /self\.registration\.active \? notifyClientsUpdateReady\(\) : undefined/);
  assert.match(worker, /addEventListener\("message"/);
  assert.match(worker, /event\.data\?\.type === SKIP_WAITING_MESSAGE/);
  assert.match(worker, /event\.data\?\.version === WORKER_RELEASE/);
  assert.match(worker, /event\.waitUntil\(self\.skipWaiting\(\)\)/);
  assert.doesNotMatch(
    worker,
    /addEventListener\("install"[\s\S]*?installAppShell\(\)\.then\(\(\) => self\.skipWaiting\(\)\)/,
  );
  assert.doesNotMatch(worker, /emine-ogretmen-avatar/);
});

test("service worker ilk kurulumda beklemez ve yalnız sürümü eşleşen açık komutla güncellenir", async () => {
  const source = await readFile(projectFile("public/sw.js"), "utf8");
  const listeners = new Map();
  const clientMessages = [];
  let clientLookupCount = 0;
  let skipWaitingCount = 0;
  const cache = {
    match: async () => null,
    put: async () => undefined,
  };
  const html =
    '<!doctype html><html><head><script type="module" src="/assets/index-test1234.js"></script><link rel="stylesheet" href="/assets/index-test1234.css"></head></html>';
  const assetBodies = {
    "assets/index-test1234.js": "export {};",
    "assets/index-test1234.css": ":root{}",
  };
  const precacheManifest = createPrecacheManifestBody(assetBodies);
  const makeResponse = (request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/index.html") {
      return makeBasicResponse(html, { contentType: "text/html" });
    }
    if (pathname === "/maarifos-precache-manifest.json") {
      return makeBasicResponse(precacheManifest, { contentType: "application/json" });
    }
    return makeBasicResponse(
      assetBodies[pathname.slice(1)] ?? "{}",
      { contentType: "application/octet-stream" },
    );
  };
  const registration = {
    scope: "https://example.test/",
    active: null,
    navigationPreload: null,
  };
  const self = {
    registration,
    location: { origin: "https://example.test" },
    clients: {
      claim: async () => undefined,
      matchAll: async () => {
        clientLookupCount += 1;
        return [{ postMessage: (message) => clientMessages.push(message) }];
      },
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    skipWaiting: async () => {
      skipWaitingCount += 1;
    },
  };

  vm.runInNewContext(source, {
    AbortController,
    Headers,
    Request,
    Response,
    Set,
    TextDecoder,
    URL,
    caches: {
      keys: async () => [],
      open: async () => cache,
      delete: async () => true,
    },
    clearTimeout,
    crypto: webcrypto,
    fetch: async (request) => makeResponse(request),
    self,
    setTimeout,
  });

  const installPromises = [];
  listeners.get("install")({
    waitUntil: (promise) => installPromises.push(promise),
  });
  await Promise.all(installPromises);
  assert.equal(clientLookupCount, 0);
  assert.deepEqual(clientMessages, []);
  assert.equal(skipWaitingCount, 0);

  registration.active = {};
  const updateInstallPromises = [];
  listeners.get("install")({
    waitUntil: (promise) => updateInstallPromises.push(promise),
  });
  await Promise.all(updateInstallPromises);
  assert.equal(clientLookupCount, 1);
  assert.equal(JSON.stringify(clientMessages), JSON.stringify([
    { type: "maarifos:update-ready", version: currentRelease },
  ]));

  const messagePromises = [];
  const dispatchMessage = (data) =>
    listeners.get("message")({
      data,
      ports: [],
      waitUntil: (promise) => messagePromises.push(promise),
    });
  dispatchMessage({ type: "maarifos:skip-waiting", version: "0.2.0" });
  dispatchMessage({ type: "unrelated", version: currentRelease });
  assert.equal(skipWaitingCount, 0);

  dispatchMessage({ type: "maarifos:skip-waiting", version: currentRelease });
  await Promise.all(messagePromises);
  assert.equal(skipWaitingCount, 1);
});

test("waiting worker sağlık sorgusu aktif sürüm cache'lerini değiştirmez", async () => {
  const source = await readFile(projectFile("public/sw.js"), "utf8");
  const listeners = new Map();
  const deletedCaches = [];
  const cacheWrites = [];
  const statusMessages = [];
  const currentShellResponse = new Response("current-shell", {
    headers: { "Content-Type": "text/html" },
  });
  const assetBodies = {
    "assets/index-health.js": "export {};",
    "assets/index-health.css": ":root{}",
  };
  const precacheManifest = createPrecacheManifestBody(assetBodies);
  const precacheManifestSha256 = sha256(encodeBody(precacheManifest));
  const metadataResponse = () =>
    new Response(
      JSON.stringify({
        schemaVersion: 1,
        currentRelease: "0.10.0",
        previousRelease: "0.9.1",
        activatedAt: 1,
        healthyAt: 1,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  const cacheNames = [
    `maarifos-shell-${currentRelease}`,
    `maarifos-assets-${currentRelease}`,
    "maarifos-meta",
    "maarifos-shell-0.10.0",
    "maarifos-assets-0.10.0",
    "maarifos-shell-0.9.1",
    "maarifos-assets-0.9.1",
  ];
  const shellCache = {
    match: async (request) => {
      const requestUrl = request?.url ?? request?.href ?? String(request);
      const pathname = new URL(requestUrl).pathname;
      if (pathname === "/__maarifos_shell_ready__") {
        return new Response(
          JSON.stringify({
            schemaVersion: 1,
            release: currentRelease,
            assetCount: Object.keys(assetBodies).length,
            manifestSha256: precacheManifestSha256,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
      if (pathname === "/maarifos-precache-manifest.json") {
        return makeBasicResponse(precacheManifest, { contentType: "application/json" });
      }
      if (Object.hasOwn(assetBodies, pathname.slice(1))) {
        return makeBasicResponse(assetBodies[pathname.slice(1)]);
      }
      return currentShellResponse.clone();
    },
    put: async (request) => cacheWrites.push(request),
  };
  const metadataCache = {
    match: async () => metadataResponse(),
    put: async (request) => cacheWrites.push(request),
  };
  const emptyCache = {
    match: async () => null,
    put: async (request) => cacheWrites.push(request),
  };
  const self = {
    registration: {
      scope: "https://example.test/",
      active: { scriptURL: "https://example.test/sw.js?v=0.10.0" },
      navigationPreload: null,
    },
    location: { origin: "https://example.test" },
    clients: {
      claim: async () => undefined,
      matchAll: async () => [],
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    skipWaiting: async () => undefined,
  };

  vm.runInNewContext(source, {
    AbortController,
    Headers,
    Request,
    Response,
    Set,
    TextDecoder,
    URL,
    caches: {
      keys: async () => [...cacheNames],
      open: async (cacheName) => {
        if (cacheName === `maarifos-shell-${currentRelease}`) return shellCache;
        if (cacheName === "maarifos-meta") return metadataCache;
        return emptyCache;
      },
      delete: async (cacheName) => {
        deletedCaches.push(cacheName);
        return true;
      },
    },
    clearTimeout,
    crypto: webcrypto,
    fetch: async () => {
      throw new Error("Sağlık sorgusu ağ isteği yapmamalı.");
    },
    self,
    setTimeout,
  });

  const waitUntilPromises = [];
  listeners.get("message")({
    data: { type: "maarifos:get-status" },
    ports: [{ postMessage: (message) => statusMessages.push(message) }],
    waitUntil: (promise) => waitUntilPromises.push(promise),
  });
  await Promise.all(waitUntilPromises);

  assert.deepEqual(deletedCaches, []);
  assert.deepEqual(cacheWrites, []);
  assert.equal(statusMessages.length, 1);
  assert.equal(statusMessages[0].type, "maarifos:sw-status");
  assert.equal(statusMessages[0].version, currentRelease);
  assert.equal(statusMessages[0].shellReady, true);
});

test("Cloudflare tarafından sonradan eklenen HTML yalnız doğrulanmış aynı-origin build varlıklarını kurar", async () => {
  const source = await readFile(projectFile("public/sw.js"), "utf8");
  const listeners = new Map();
  const fetchedUrls = [];
  const cacheWrites = [];
  const cache = {
    match: async () => null,
    put: async (request) => {
      cacheWrites.push(request?.url ?? request?.href ?? String(request));
    },
  };
  const html = `<!doctype html>
    <html><head>
      <script type="module" src="/assets/index-safe1234.js"></script>
      <link rel="stylesheet" href="/assets/index-safe1234.css">
      <script>(function(){const injected='<script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></scr'+'ipt>';})();</script>
      <a href="https://evil.example/assets/foreign-safe1234.js"></a>
      <a href="http://[invalid"></a>
    </head><body><div id="root"></div></body></html>`;
  const assetBodies = {
    "assets/index-safe1234.js": "export {};",
    "assets/index-safe1234.css": ":root{}",
    "assets/activity-studio-lazy9876.js": "export const activityStudio = true;",
  };
  const precacheManifest = createPrecacheManifestBody(assetBodies);
  const makeResponse = (request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/index.html") {
      return makeBasicResponse(html, { contentType: "text/html; charset=utf-8" });
    }
    if (pathname === "/maarifos-precache-manifest.json") {
      return makeBasicResponse(precacheManifest, { contentType: "application/json" });
    }
    return makeBasicResponse(assetBodies[pathname.slice(1)] ?? "{}");
  };
  const self = {
    registration: {
      scope: "https://example.test/",
      active: null,
      navigationPreload: null,
    },
    location: { origin: "https://example.test" },
    clients: {
      claim: async () => undefined,
      matchAll: async () => [],
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    skipWaiting: async () => undefined,
  };

  vm.runInNewContext(source, {
    AbortController,
    Headers,
    Request,
    Response,
    Set,
    TextDecoder,
    URL,
    caches: {
      keys: async () => [],
      open: async () => cache,
      delete: async () => true,
    },
    clearTimeout,
    crypto: webcrypto,
    fetch: async (request) => {
      fetchedUrls.push(request.url);
      return makeResponse(request);
    },
    self,
    setTimeout,
  });

  const installPromises = [];
  listeners.get("install")({
    waitUntil: (promise) => installPromises.push(promise),
  });
  await Promise.all(installPromises);

  assert.ok(fetchedUrls.includes("https://example.test/assets/index-safe1234.js"));
  assert.ok(fetchedUrls.includes("https://example.test/assets/index-safe1234.css"));
  assert.ok(fetchedUrls.includes("https://example.test/assets/activity-studio-lazy9876.js"));
  assert.equal(fetchedUrls.some((url) => url.includes("/cdn-cgi/")), false);
  assert.equal(fetchedUrls.some((url) => url.startsWith("https://evil.example/")), false);
  assert.equal(cacheWrites.at(-1), "https://example.test/__maarifos_shell_ready__");
});

test("eksik build varlığı tamamlanma markerı yazmadan service worker kurulumunu durdurur", async () => {
  const source = await readFile(projectFile("public/sw.js"), "utf8");
  const listeners = new Map();
  const cacheWrites = [];
  const html =
    '<!doctype html><script type="module" src="/assets/index-safe1234.js"></script><link rel="stylesheet" href="/assets/index-missing1234.css">';
  const assetBodies = {
    "assets/index-safe1234.js": "export {};",
    "assets/index-missing1234.css": ":root{}",
  };
  const precacheManifest = createPrecacheManifestBody(assetBodies);
  const cache = {
    match: async () => null,
    put: async (request) => {
      cacheWrites.push(request?.url ?? request?.href ?? String(request));
    },
  };
  const makeResponse = (request) => {
    const pathname = new URL(request.url).pathname;
    const missing = pathname === "/assets/index-missing1234.css";
    if (pathname === "/index.html") {
      return makeBasicResponse(html, { contentType: "text/html; charset=utf-8" });
    }
    if (pathname === "/maarifos-precache-manifest.json") {
      return makeBasicResponse(precacheManifest, { contentType: "application/json" });
    }
    return makeBasicResponse(assetBodies[pathname.slice(1)] ?? "", { ok: !missing });
  };
  const self = {
    registration: {
      scope: "https://example.test/",
      active: null,
      navigationPreload: null,
    },
    location: { origin: "https://example.test" },
    clients: {
      claim: async () => undefined,
      matchAll: async () => [],
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    skipWaiting: async () => undefined,
  };

  vm.runInNewContext(source, {
    AbortController,
    Headers,
    Request,
    Response,
    Set,
    TextDecoder,
    URL,
    caches: {
      keys: async () => [],
      open: async () => cache,
      delete: async () => true,
    },
    clearTimeout,
    crypto: webcrypto,
    fetch: async (request) => makeResponse(request),
    self,
    setTimeout,
  });

  const installPromises = [];
  listeners.get("install")({
    waitUntil: (promise) => installPromises.push(promise),
  });
  await assert.rejects(Promise.all(installPromises), /App-shell/);
  assert.equal(
    cacheWrites.includes("https://example.test/__maarifos_shell_ready__"),
    false,
  );
});

test("bütünlüğü bozulan lazy varlık tamamlanma markerı yazmadan kurulumu durdurur", async () => {
  const source = await readFile(projectFile("public/sw.js"), "utf8");
  const listeners = new Map();
  const cacheWrites = [];
  const html =
    '<!doctype html><script type="module" src="/assets/index-safe1234.js"></script><link rel="stylesheet" href="/assets/index-safe1234.css">';
  const expectedAssetBodies = {
    "assets/index-safe1234.js": "export {};",
    "assets/index-safe1234.css": ":root{}",
    "assets/activity-studio-corrupt.js": "export const trusted = true;",
  };
  const precacheManifest = createPrecacheManifestBody(expectedAssetBodies);
  const cache = {
    match: async () => null,
    put: async (request) => {
      cacheWrites.push(request?.url ?? request?.href ?? String(request));
    },
  };
  const makeResponse = (request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/index.html") {
      return makeBasicResponse(html, { contentType: "text/html; charset=utf-8" });
    }
    if (pathname === "/maarifos-precache-manifest.json") {
      return makeBasicResponse(precacheManifest, { contentType: "application/json" });
    }
    const expectedBody = expectedAssetBodies[pathname.slice(1)] ?? "{}";
    return makeBasicResponse(
      pathname === "/assets/activity-studio-corrupt.js"
        ? `${expectedBody}\n/* changed in transit */`
        : expectedBody,
    );
  };
  const self = {
    registration: {
      scope: "https://example.test/",
      active: null,
      navigationPreload: null,
    },
    location: { origin: "https://example.test" },
    clients: { claim: async () => undefined, matchAll: async () => [] },
    addEventListener: (type, listener) => listeners.set(type, listener),
    skipWaiting: async () => undefined,
  };

  vm.runInNewContext(source, {
    AbortController,
    Headers,
    Request,
    Response,
    Set,
    TextDecoder,
    URL,
    caches: {
      keys: async () => [],
      open: async () => cache,
      delete: async () => true,
    },
    clearTimeout,
    crypto: webcrypto,
    fetch: async (request) => makeResponse(request),
    self,
    setTimeout,
  });

  const installPromises = [];
  listeners.get("install")({
    waitUntil: (promise) => installPromises.push(promise),
  });
  await assert.rejects(Promise.all(installPromises), /bütünlük doğrulamasını geçemedi/);
  assert.equal(
    cacheWrites.includes("https://example.test/__maarifos_shell_ready__"),
    false,
  );
});

test("service worker yalnız extensionless uygulama rotalarını offline kabuğa düşürür", async () => {
  const source = await readFile(projectFile("public/sw.js"), "utf8");
  const listeners = new Map();
  const offlineShell = new Response("offline-shell", {
    headers: { "Content-Type": "text/html" },
  });
  let online = true;
  let networkRequestCount = 0;
  const cache = {
    match: async () => offlineShell.clone(),
    put: async () => undefined,
  };
  const self = {
    registration: {
      scope: "https://example.test/",
      active: {},
      navigationPreload: null,
    },
    location: { origin: "https://example.test" },
    clients: {
      claim: async () => undefined,
      matchAll: async () => [],
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    skipWaiting: async () => undefined,
  };

  vm.runInNewContext(source, {
    AbortController,
    Headers,
    Request,
    Response,
    Set,
    URL,
    caches: {
      keys: async () => [],
      open: async () => cache,
      delete: async () => true,
    },
    clearTimeout,
    fetch: async () => {
      networkRequestCount += 1;
      if (!online) throw new TypeError("offline");
      const response = new Response("online", {
        headers: { "Content-Type": "text/html" },
      });
      Object.defineProperty(response, "type", { value: "basic" });
      return response;
    },
    self,
    setTimeout,
  });

  const dispatchNavigation = async (path) => {
    const responsePromises = [];
    const waitUntilPromises = [];
    listeners.get("fetch")({
      request: {
        method: "GET",
        url: `https://example.test${path}`,
        mode: "navigate",
        destination: "document",
        cache: "default",
        headers: new Headers(),
      },
      preloadResponse: Promise.resolve(undefined),
      respondWith: (promise) => responsePromises.push(Promise.resolve(promise)),
      waitUntil: (promise) => waitUntilPromises.push(Promise.resolve(promise)),
    });
    const responses = await Promise.all(responsePromises);
    await Promise.all(waitUntilPromises);
    return responses;
  };

  for (const path of [
    "/api",
    "/api/",
    "/api/children",
    "/api%2Fchildren",
    "/auth",
    "/auth/",
    "/auth/session",
    "/auth%2Fsession",
  ]) {
    online = true;
    const beforeOnline = networkRequestCount;
    assert.deepEqual(await dispatchNavigation(path), []);
    assert.equal(networkRequestCount, beforeOnline, `${path} online iken worker tarafından yakalanmamalı`);

    online = false;
    const beforeOffline = networkRequestCount;
    assert.deepEqual(await dispatchNavigation(path), []);
    assert.equal(networkRequestCount, beforeOffline, `${path} offline iken uygulama kabuğuna düşmemeli`);
  }

  for (const path of [
    "/missing.json",
    "/assets/missing.js",
    "/assets/missing",
    "/assets%2Fmissing.js",
    "/missing%2Ejson",
    "/missing%252Ejson",
  ]) {
    online = true;
    const beforeOnline = networkRequestCount;
    assert.deepEqual(await dispatchNavigation(path), []);
    assert.equal(networkRequestCount, beforeOnline, `${path} online iken app-shell rotası olmamalı`);

    online = false;
    const beforeOffline = networkRequestCount;
    assert.deepEqual(await dispatchNavigation(path), []);
    assert.equal(networkRequestCount, beforeOffline, `${path} offline iken uygulama kabuğuna düşmemeli`);
  }

  for (const path of [
    "/",
    "/index.html",
    "/index%2Ehtml",
    "/apiary",
    "/authentication",
    "/classroom?native=1",
    "/plans?native=1",
    "/documents?native=1",
  ]) {
    online = true;
    const [onlineResponse] = await dispatchNavigation(path);
    assert.equal(await onlineResponse.text(), "online", `${path} çevrimiçi yanıtı ağdan gelmeli`);

    online = false;
    const [offlineResponse] = await dispatchNavigation(path);
    assert.equal(await offlineResponse.text(), "offline-shell");
  }
});

test("PWA girişi doğrulanmış offline durumunu ve kullanıcı kontrollü güncellemeyi yayınlar", async () => {
  const [html, pwa] = await Promise.all([
    readFile(projectFile("index.html"), "utf8"),
    readFile(projectFile("src/pwa.ts"), "utf8"),
  ]);

  assert.match(html, /<script type="module" src="\/src\/pwa\.ts"><\/script>/);
  assert.match(pwa, /!import\.meta\.env\.PROD/);
  assert.match(pwa, /navigator\.serviceWorker\.register/);
  assert.match(pwa, /updateViaCache: "none"/);
  assert.match(pwa, /await registration\.update\(\)/);
  assert.match(pwa, /navigator\.serviceWorker\.ready/);
  assert.match(pwa, /waitForController/);
  assert.match(pwa, /requestWorkerHealth/);
  assert.match(pwa, /health\.shellReady/);
  assert.match(pwa, /offlineReady: true/);
  assert.match(pwa, /PWA_STATUS_EVENT/);
  assert.match(
    pwa,
    /`\/sw\.js\?v=\$\{encodeURIComponent\(CURRENT_RELEASE\.version\)\}`/,
  );
  assert.match(
    pwa,
    /navigator\.serviceWorker\.addEventListener\("message"/,
  );
  assert.match(
    pwa,
    /PWA_APPLY_UPDATE_EVENT/,
  );
  assert.match(
    pwa,
    /waitingWorker\.postMessage/,
  );
  assert.match(pwa, /waitingHealth = await requestWorkerHealth\(waitingWorker\)/);
  assert.match(pwa, /!waitingHealth\.shellReady/);
  assert.match(pwa, /publishWaitingWorkerVerificationFailure/);
  assert.match(pwa, /const waitingWorkerReady = currentRegistration/);
  assert.match(pwa, /!registration\.active/);
  assert.match(
    pwa,
    /window\.dispatchEvent\(new CustomEvent\(PWA_UPDATE_READY_EVENT\)\)/,
  );
  assert.match(pwa, /controllerchange/);
  assert.match(pwa, /updateActivationRequested/);
  assert.match(pwa, /window\.location\.reload\(\)/);
  assert.match(pwa, /PWA_CHECK_UPDATE_EVENT = "maarifos:check-update"/);
  assert.match(pwa, /AUTOMATIC_UPDATE_CHECK_INTERVAL_MS = 5 \* 60 \* 1_000/);
  assert.match(pwa, /window\.addEventListener\("focus", checkWhenUsable\)/);
  assert.match(pwa, /window\.addEventListener\("online", checkWhenUsable\)/);
  assert.match(pwa, /document\.addEventListener\("visibilitychange", checkWhenVisible\)/);
  assert.match(pwa, /checkForServiceWorkerUpdate\(\{ force: true \}\)/);
  assert.match(pwa, /ensureNativeRuntimeQuery\(\)/);
  assert.match(pwa, /registerServiceWorker\(\);\s*$/);
});
