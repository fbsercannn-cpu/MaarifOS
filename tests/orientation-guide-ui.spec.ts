import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(60_000);

test("Belgeler uyum rehberinin bütün sayfalarını, aramayı ve mobil okuyucuyu açar", async ({ page }) => {
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByLabel("Okul adı").fill("Kurgu Rehber Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Rehber Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  const trigger = page.getByRole("button", { name: /EK KAYNAK.*Okula uyum rehberi/u });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Okula uyum rehberi · 2026–2027" });
  await expect(dialog).toBeVisible();
  const jump = dialog.getByLabel("Bölüme git");
  await expect(jump.locator("option")).toHaveCount(35);
  await expect(dialog.getByRole("button", { name: "Önceki sayfa", exact: true })).toBeDisabled();
  await jump.selectOption("9");
  await expect(dialog.getByRole("heading", { level: 3 })).toHaveText("Uyum haftası uygulama çizelgesi ve uygulamanın açıklaması");
  await expect(dialog.locator(".orientation-reader__page img")).toHaveJSProperty("naturalWidth", 1191);
  await dialog.getByLabel("Rehberin tamamında ara", { exact: true }).fill("OKUL POSTANESİ");
  await expect(dialog.getByRole("status")).toHaveText("1 sayfada bulundu");
  await dialog.locator(".orientation-reader__results li button").click();
  await expect(dialog.getByLabel("Sayfanın tam metni")).toContainText("OKUL POSTANESİ");
  await expect(dialog.getByRole("button", { name: "Okunabilir metin", exact: true })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Aramayı temizle" }).click();
  await jump.selectOption("35");
  await expect(dialog.locator(".orientation-reader__links a")).toHaveCount(10);
  await expect(dialog.getByRole("button", { name: "Sonraki sayfa", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("link", { name: "Özgün PDF’yi aç", exact: true })).toHaveAttribute("href", "/assets/resources/orientation-guide-2026-2027/okula-uyum-rehberi-2026-2027.pdf");

  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    const layout = await dialog.evaluate((element) => ({
      viewport: window.innerWidth, document: document.documentElement.scrollWidth,
      width: element.clientWidth, content: element.scrollWidth,
      scrollers: [...element.querySelectorAll<HTMLElement>("*")].filter((candidate) => candidate.scrollHeight > candidate.clientHeight + 1 && /^(auto|scroll)$/u.test(getComputedStyle(candidate).overflowY)).map((candidate) => candidate.className),
      tooSmall: [...element.querySelectorAll<HTMLElement>("button, input, select, a, summary")].filter((candidate) => candidate.getBoundingClientRect().height > 0 && candidate.getBoundingClientRect().height < 44).map((candidate) => candidate.textContent),
    }));
    expect(layout.document).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.content).toBeLessThanOrEqual(layout.width + 1);
    expect(layout.scrollers).toEqual(["orientation-reader__body"]);
    expect(layout.tooSmall).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await jump.selectOption("12");
  await dialog.getByRole("button", { name: "Özgün sayfa", exact: true }).click();
  await page.screenshot({ path: "output/orientation-guide-2026-09-07/mobile-page-12.png", fullPage: true });
  await dialog.getByRole("button", { name: "Rehberi kapat" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
