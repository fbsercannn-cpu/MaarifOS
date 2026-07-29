import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const projectFile = (relativePath) => new URL(`../${relativePath}`, import.meta.url);

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
  assert.equal(manifest.start_url, "/");
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
  assert.match(worker, /function isSensitivePath\(url\)/);
  assert.match(worker, /isSensitivePath\(url\) \|\|/);
  assert.match(worker, /maarifos-icon-192\.png/);
  assert.match(worker, /maarifos-icon-512\.png/);
  assert.match(worker, /maarifos-icon-maskable-512\.png/);
  assert.match(worker, /apple-touch-icon-180\.png/);
  assert.match(worker, /const WORKER_RELEASE = "0\.7\.0"/);
  assert.match(worker, /shell-\$\{CACHE_VERSION\}/);
  assert.match(worker, /assets-\$\{CACHE_VERSION\}/);
  assert.match(worker, /const CACHE_HEALTH_WINDOW_MS = 24 \* 60 \* 60 \* 1000/);
  assert.match(worker, /previousRelease/);
  assert.match(worker, /fallbackCacheNames/);
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
  const makeResponse = (request) => {
    const pathname = new URL(request.url).pathname;
    return {
      ok: true,
      type: "basic",
      headers: new Headers({
        "Content-Type": pathname.endsWith(".html") || pathname === "/"
          ? "text/html"
          : "application/octet-stream",
      }),
      clone: () => makeResponse(request),
      text: async () => "<!doctype html><html></html>",
    };
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
    URL,
    caches: {
      keys: async () => [],
      open: async () => cache,
      delete: async () => true,
    },
    clearTimeout,
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
    { type: "maarifos:update-ready", version: "0.7.0" },
  ]));

  const messagePromises = [];
  const dispatchMessage = (data) =>
    listeners.get("message")({
      data,
      ports: [],
      waitUntil: (promise) => messagePromises.push(promise),
    });
  dispatchMessage({ type: "maarifos:skip-waiting", version: "0.2.0" });
  dispatchMessage({ type: "unrelated", version: "0.7.0" });
  assert.equal(skipWaitingCount, 0);

  dispatchMessage({ type: "maarifos:skip-waiting", version: "0.7.0" });
  await Promise.all(messagePromises);
  assert.equal(skipWaitingCount, 1);
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
  assert.match(pwa, /!registration\.active/);
  assert.match(
    pwa,
    /window\.dispatchEvent\(new CustomEvent\(PWA_UPDATE_READY_EVENT\)\)/,
  );
  assert.match(pwa, /controllerchange/);
  assert.match(pwa, /updateActivationRequested/);
  assert.match(pwa, /window\.location\.reload\(\)/);
  assert.match(pwa, /ensureNativeRuntimeQuery\(\)/);
  assert.match(pwa, /registerServiceWorker\(\);\s*$/);
});
