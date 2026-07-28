import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
  assert.doesNotMatch(html, /emine-ogretmen-avatar/);
});

test("service worker app-shell yedeği ile güvenli cache sınırlarını içerir", async () => {
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
  assert.match(worker, /const WORKER_RELEASE = "0\.2\.0"/);
  assert.match(worker, /shell-\$\{CACHE_VERSION\}/);
  assert.match(worker, /assets-\$\{CACHE_VERSION\}/);
  assert.match(worker, /self\.clients\.matchAll/);
  assert.match(worker, /client\.postMessage/);
  assert.match(worker, /version: WORKER_RELEASE/);
  assert.doesNotMatch(worker, /emine-ogretmen-avatar/);
});

test("PWA girişi service worker kaydını ve güvenli canlı güncellemeyi korur", async () => {
  const [html, pwa] = await Promise.all([
    readFile(projectFile("index.html"), "utf8"),
    readFile(projectFile("src/pwa.ts"), "utf8"),
  ]);

  assert.match(html, /<script type="module" src="\/src\/pwa\.ts"><\/script>/);
  assert.match(pwa, /!import\.meta\.env\.PROD/);
  assert.match(pwa, /navigator\.serviceWorker\.register/);
  assert.match(pwa, /updateViaCache: "none"/);
  assert.match(pwa, /await registration\.update\(\)/);
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
    /candidate\.version !== CURRENT_RELEASE\.version/,
  );
  assert.match(
    pwa,
    /if \(!isNewReleaseMessage\(event\.data\) \|\| hasAnnouncedServiceWorkerUpdate\) return/,
  );
  assert.match(
    pwa,
    /window\.dispatchEvent\(new CustomEvent\(PWA_UPDATE_READY_EVENT\)\)/,
  );
  assert.doesNotMatch(pwa, /window\.location\.reload\(\)/);
  assert.doesNotMatch(pwa, /controllerchange/);
  assert.match(pwa, /registerServiceWorker\(\);\s*$/);
});
