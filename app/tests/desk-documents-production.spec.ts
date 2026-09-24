import { test, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { readDocxParts } from "./fixtures/word-design-fixtures.mjs";

test("masa belgeleri gerçek uygulamada çevrimdışı açılır; takvim seçimi planı tamamlar", async ({ page, context }) => {
  test.setTimeout(180000);
  const output = "output/desk-documents-2026-09-10/offline";
  await mkdir(output, { recursive: true });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.clock.setFixedTime(new Date("2026-09-17T09:00:00Z"));
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Masa Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Çiçekler");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean((window as any).__maarifosPwaStatus?.offlineReady)), { timeout: 60000 }).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await add.getByLabel("Çocuğun adı", { exact: true }).fill("Kurgu Deniz Çınar");
  await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(add).toBeHidden();
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  const desk = page.getByRole("region", { name: "Öğretmenin masa belgeleri", exact: true });
  await expect(desk).toBeVisible();
  await desk.getByRole("button", { name: /17 Eylül 2026.*Etkinlik yerleştir/ }).click();
  const selected = desk.getByRole("region", { name: "Seçilen gün", exact: true });
  await selected.locator(".work-package-apply").click();
  await expect(selected.getByRole("button", { name: "Planı aç", exact: true }).first()).toBeVisible({ timeout: 30000 });
  await expect(desk.getByRole("button", { name: /17 Eylül 2026.*kayıt/ })).toBeVisible();
  const savedTitle = await selected.locator("li > span").first().innerText();
  expect(await desk.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await desk.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/calendar-completed.png` });
  for (const [label, name, landscape] of [
    ["Haftalık masa planını hazırla", "weekly-desk", true],
    ["Aylık duvar takvimini hazırla", "monthly-wall", true],
    ["Öğrencinin özetini hazırla", "student-summary", false],
  ] as const) {
    await desk.getByRole("button", { name: label, exact: true }).click();
    const preview = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
    await expect(preview.locator("canvas[data-pdf-rendered=true]").first()).toBeVisible({ timeout: 30000 });
    const sourceText = (await preview.getByRole("document", { name: /PDF sayfa 1 seçilebilir metni/ }).innerText()).replace(/\s+/g, "");
    expect(sourceText).toContain((name === "student-summary" ? "Kurgu Deniz Çınar" : savedTitle).replace(/\s+/g, ""));
    const download = page.waitForEvent("download");
    await preview.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
    await (await download).saveAs(`${output}/${name}.pdf`);
    const pdf = await PDFDocument.load(await readFile(`${output}/${name}.pdf`));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPages().every(p => landscape ? p.getWidth() > p.getHeight() : p.getHeight() > p.getWidth())).toBe(true);
    if (name !== "monthly-wall") {
      await preview.locator(".pdf-preview-secondary-actions > summary").click();
      const word = page.waitForEvent("download");
      await preview.getByRole("button", { name: name === "weekly-desk" ? "Düzenlenebilir haftalık Word tablosunu indir" : "Aynı özeti Word olarak indir", exact: true }).click();
      await (await word).saveAs(`${output}/${name}.docx`);
      const xml = readDocxParts(await readFile(`${output}/${name}.docx`)).get("word/document.xml");
      expect(xml).toContain(name === "student-summary" ? "Kurgu Deniz Çınar" : "HAFTALIK MASA PLANI");
    }
    await page.screenshot({ path: `${output}/${name}-preview.png` });
    await preview.getByRole("button", { name: "PDF önizlemesini kapat", exact: true }).click();
    await expect(preview).toHaveCount(0);
  }
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /17 Eylül 2026.*kayıt/ })).toBeVisible();
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.locator("button.simple-student-list__profile").filter({ hasText: "Kurgu Deniz Çınar" }).click();
  const profile = page.getByRole("dialog", { name: "Kurgu Deniz Çınar profili", exact: true });
  await profile.getByRole("button", { name: "Öğrencinin tek sayfalık özetini hazırla", exact: true }).click();
  const directPreview = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  await expect(directPreview.locator("canvas[data-pdf-rendered=true]").first()).toBeVisible();
  await expect(directPreview.getByRole("document", { name: /PDF sayfa 1 seçilebilir metni/ })).toContainText("Kurgu Deniz Çınar");
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
});
