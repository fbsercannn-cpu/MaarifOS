import { test, expect } from "@playwright/test";

test("üretim: ilk çevrimdışı kullanımda gözlem tarihi ve Maarif bağlantısı seçimle kaydolur", async ({ page, context }) => {
  await page.clock.setFixedTime(new Date("2026-09-16T09:00:00.000Z"));
  await page.goto("/classroom?native=1", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Çevrimdışı Tıklama Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Tıklama Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __maarifosPwaStatus?: { offlineReady?: boolean } }).__maarifosPwaStatus?.offlineReady)), { timeout: 60000 }).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  const child = "Kurgu Çevrimdışı Tıklama Çocuğu";
  await add.getByLabel("Çocuğun adı", { exact: true }).fill(child);
  await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(add).toBeHidden();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  const start = page.getByRole("button", { name: "Eğitim yılını başlat", exact: true });
  if (await start.isVisible()) { await start.click(); await expect(start).toBeHidden(); }
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.clock.setFixedTime(new Date("2026-09-17T09:00:00.000Z"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: `${child} için Maarif gelişim gözlemi ekle`, exact: true }).click();
  const raw = "Kurgu çocuk hikâyeyi kendi cümleleriyle anlattı.";
  await page.getByRole("textbox", { name: "Ne oldu?", exact: true }).fill(raw);
  await page.getByRole("button", { name: "Gözlemi kaydet", exact: true }).click();
  const completion = page.getByRole("dialog", { name: "Gözlemden sonraki adım", exact: true });
  const individualSteps = completion.getByText("Adımları ayrı ayrı düzenle", { exact: true });
  if (await individualSteps.count() && !await individualSteps.evaluate(el => el.closest("details")?.open)) await individualSteps.click();
  const metadata = completion.getByRole("region", { name: "Gözlemin tarihi ve bağlantıları", exact: true });
  await metadata.getByRole("button", { name: "Dün", exact: true }).click();
  await metadata.getByRole("button", { name: "Planlı etkinlik seçmeden bu tarihe kaydet", exact: true }).click();
  await expect(metadata.getByRole("status")).toHaveText("Gözlemin tarihi ve bağlantıları kaydedildi.");
  await metadata.getByText("Gözleme uygun Maarif başlığını seç", { exact: true }).click();
  await metadata.getByRole("button", { name: "Bu Maarif başlığına bağla", exact: true }).first().click();
  await expect(metadata.getByRole("status")).toHaveText("Gözlemin tarihi ve bağlantıları kaydedildi.");
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("maarifos-local"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try {
      const tx = db.transaction(["observations", "evidenceCurriculumLinks"], "readonly");
      const read = (name: string) => new Promise<any[]>((resolve, reject) => { const request = tx.objectStore(name).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const [observations, links] = await Promise.all([read("observations"), read("evidenceCurriculumLinks")]);
      // Production stores authenticated encrypted envelopes; metadata is verified through the reloaded UI.
      return observations.length === 1 && links.length === 1;
    } finally { db.close(); }
  })).toBe(true);
  await expect(metadata.locator('input[type="date"]')).toHaveValue("2026-09-16");
  expect(await metadata.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: "output/click-through-production/offline-date-and-link.png" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(`^${child} 60`) }).click();
  await page.getByRole("button", { name: "16 Eylül 2026 tarihli gözlemi aç", exact: true }).click();
  await expect(completion).toContainText(raw);
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("maarifos-local"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try {
      const tx = db.transaction(["observations", "evidenceCurriculumLinks"], "readonly");
      const read = (name: string) => new Promise<any[]>((resolve, reject) => { const request = tx.objectStore(name).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const [observations, links] = await Promise.all([read("observations"), read("evidenceCurriculumLinks")]);
      // Production stores authenticated encrypted envelopes; metadata is verified through the reloaded UI.
      return observations.length === 1 && links.length === 1;
    } finally { db.close(); }
  })).toBe(true);
  await expect(metadata.locator('input[type="date"]')).toHaveValue("2026-09-16");
  await completion.getByRole("button", { name: "Gözlemden sonraki adım ekranını kapat", exact: true }).click();
  const profile = page.getByRole("dialog", { name: `${child} profili`, exact: true });
  await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  await profile.getByText("Maarif gelişim bilgisi", { exact: true }).click();
  await expect(profile).toContainText("TAKB.2");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await page.clock.setFixedTime(new Date("2026-09-17T09:02:00.000Z"));
  await page.getByRole("button", { name: "Yıl–ay–hafta omurgasını kaydet", exact: true }).click();
  await expect(page.getByRole("button", { name: "Günlük planı kaydet ve aç", exact: true }).first()).toBeVisible();
  await page.clock.setFixedTime(new Date("2026-09-17T09:03:00.000Z"));
  await page.getByRole("button", { name: "Günlük planı kaydet ve aç", exact: true }).first().click();
  await expect(page.getByRole("dialog", { name: "Gün planı", exact: true })).toBeVisible();
  await page.screenshot({ path: "output/click-through-production/offline-guided-daily-plan.png" });
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
});





