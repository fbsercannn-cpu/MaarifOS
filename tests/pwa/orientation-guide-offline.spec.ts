import { expect, test } from "@playwright/test";

test("hafif kaynak metinleri çevrim dışı korunur; eski PDF ve sayfa görselleri dağıtılmaz", async ({ page, context }) => {
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByLabel("Okul adı").fill("Çevrim Dışı Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Uyum Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
  await expect.poll(async () => page.evaluate(() => Boolean(
    (window as Window & { __maarifosPwaStatus?: { offlineReady?: boolean } }).__maarifosPwaStatus?.offlineReady,
  )), { timeout: 60_000 }).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  await expect(page.getByRole("region", { name: "Sınıfta kullanılacak belgeler" })).toBeVisible();
  await expect(page.getByRole("button", { name: /EK KAYNAK.*Okula uyum rehberi/u })).toHaveCount(0);
  const integrity = await page.evaluate(async () => {
    const root = "assets/resources/orientation-guide-2026-2027/";
    const heavy = (path: string) => path.includes(root) && /(?:\.pdf|page-\d+\.webp|offline-assets\.json)$/u.test(path);
    const manifest = await (await fetch(`/${root}manifest.json`)).json() as {
      pages: { text: string; textSha256: string }[];
    };
    const digest = async (text: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))].map(byte => byte.toString(16).padStart(2, "0")).join("");
    const textMatches = await Promise.all(manifest.pages.map(async item => await digest(item.text) === item.textSha256));
    const precache = await (await fetch("/maarifos-precache-manifest.json")).json() as { assets: { path: string }[] };
    const cachedPaths: string[] = [];
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) cachedPaths.push(new URL(request.url).pathname);
    }
    return {
      online: navigator.onLine, count: manifest.pages.length, allTextsMatch: textMatches.every(Boolean),
      sourceManifestDistributed: precache.assets.some(item => item.path === `${root}manifest.json`),
      heavyDistributed: precache.assets.filter(item => heavy(item.path)).length,
      heavyCached: cachedPaths.filter(heavy).length,
    };
  });
  expect(integrity).toEqual({ online: false, count: 35, allTextsMatch: true, sourceManifestDistributed: true, heavyDistributed: 0, heavyCached: 0 });
  await page.screenshot({ path: "output/print-workshop-2026-09-12/offline-light-documents.png", fullPage: true });
});
