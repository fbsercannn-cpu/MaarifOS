import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectFile = (relativePath) => new URL(`../${relativePath}`, import.meta.url);

test("manifest kurulabilir uygulama sözleşmesini ve gerçek ikon ölçüsünü korur", async () => {
  const manifest = JSON.parse(await readFile(projectFile("public/manifest.webmanifest"), "utf8"));

  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.lang, "tr-TR");
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);

  const icon = manifest.icons.find((candidate) => candidate.src === "/assets/emine-ogretmen-avatar.png");
  assert.ok(icon, "Kurulum ikonu manifestte bulunmalı");
  assert.equal(icon.sizes, "1254x1254");
  assert.equal(icon.type, "image/png");

  const png = await readFile(projectFile(`public${icon.src}`));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1254);
  assert.equal(png.readUInt32BE(20), 1254);
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
    /rel="apple-touch-icon" sizes="1254x1254" href="\/assets\/emine-ogretmen-avatar\.png"/,
  );
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
});

test("PWA girişi service worker kaydını yalnız üretimde etkinleştirir", async () => {
  const [html, pwa] = await Promise.all([
    readFile(projectFile("index.html"), "utf8"),
    readFile(projectFile("src/pwa.ts"), "utf8"),
  ]);

  assert.match(html, /<script type="module" src="\/src\/pwa\.ts"><\/script>/);
  assert.match(pwa, /!import\.meta\.env\.PROD/);
  assert.match(pwa, /navigator\.serviceWorker\.register/);
  assert.match(pwa, /updateViaCache: "none"/);
  assert.match(pwa, /registerServiceWorker\(\);\s*$/);
});
