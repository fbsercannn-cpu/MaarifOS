import { test, expect } from "@playwright/test";

test("üretim çevrimdışı: iş paketi tek seçimle kaydolur ve geri alınır", async ({ page, context }) => {
  await page.clock.setFixedTime(new Date("2026-09-17T09:00:00.000Z"));
  await page.goto("/classroom?native=1", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Çevrimdışı Paket Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Paket Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __maarifosPwaStatus?: { offlineReady?: boolean } }).__maarifosPwaStatus?.offlineReady)), { timeout: 60000 }).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  const child = "Kurgu Çevrimdışı Paket Çocuğu";
  await add.getByLabel("Çocuğun adı", { exact: true }).fill(child);
  await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(add).toBeHidden();
  await page.clock.setFixedTime(new Date("2026-09-17T09:01:00.000Z"));
  await page.getByRole("button", { name: `${child} için Maarif gelişim gözlemi ekle`, exact: true }).click();
  const raw = "Kurgu çocuk hikâyeyi kendi cümleleriyle anlattı.";
  await page.getByRole("textbox", { name: "Ne oldu?", exact: true }).fill(raw);
  await page.getByRole("button", { name: "Gözlemi kaydet", exact: true }).click();
  const completion = page.getByRole("dialog", { name: "Gözlemden sonraki adım", exact: true });
  await expect(completion).toBeVisible();
  const packages = completion.getByRole("region", { name: "Hazır iş paketleri", exact: true });
  await packages.locator("article").filter({ hasText: raw }).getByRole("checkbox").check();
  await page.clock.setFixedTime(new Date("2026-09-17T09:02:00.000Z"));
  await packages.locator(".work-package-apply").click();
  await expect(packages.getByRole("button", { name: "Bu işlemi geri al", exact: true })).toBeVisible();
  await expect.poll(() => storedCount(page, "evidenceCurriculumLinks")).toBe(1);
  await expect(packages.getByRole("button", { name: "Bu işlemi geri al", exact: true })).toBeEnabled();
  await expect(packages.locator("article").filter({ hasText: raw })).toHaveCount(0);
  expect(await packages.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: "output/work-packages-production/offline-package-result.png" });
  await page.clock.setFixedTime(new Date("2026-09-17T09:03:00.000Z"));
  await packages.getByRole("button", { name: "Bu işlemi geri al", exact: true }).click();
  await expect(packages).toContainText("Paketin yaptığı değişiklikler geri alındı.");
  expect(await storedCount(page, "observations")).toBe(1);
  expect(await storedCount(page, "evidenceCurriculumLinks")).toBe(0);
  await packages.locator("article").filter({ hasText: raw }).getByRole("checkbox").check();
  await page.clock.setFixedTime(new Date("2026-09-17T09:04:00.000Z"));
  await packages.locator(".work-package-apply").click();
  await expect.poll(() => storedCount(page, "evidenceCurriculumLinks")).toBe(1);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(`^${child} 60`) }).click();
  const profile = page.getByRole("dialog", { name: `${child} profili`, exact: true });
  await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  await profile.getByText("Maarif gelişim bilgisi", { exact: true }).click();
  await expect(profile).toContainText(raw);
  await expect(profile).toContainText("TAKB.2");
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
});

async function storedCount(page: import("@playwright/test").Page, collection: string) {
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("maarifos-local"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try { return await new Promise<number>((resolve, reject) => { const request = db.transaction(name, "readonly").objectStore(name).count(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
    finally { db.close(); }
  }, collection);
}
