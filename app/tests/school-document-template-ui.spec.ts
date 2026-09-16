import { test, expect, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const production = process.env.SCHOOL_TEMPLATE_PRODUCTION === "1";
const output = `output/new-workflows-2026-09-08/school-template/${production ? "production" : "development"}`;
test.use({ viewport: { width: 390, height: 844 } });
test.describe.configure({ timeout: 120000 });
async function setup(page: Page) {
  await mkdir(output, { recursive: true });
  await page.clock.install({ time: new Date("2026-09-14T09:00:00.000Z") });
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Şablon Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu İpek Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Çınar Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
  if (production) {
    await expect.poll(() => page.evaluate(() => (window as any).__maarifosPwaStatus?.offlineReady ?? false), { timeout: 90000 }).toBe(true);
    await page.context().setOffline(true); await page.reload();
  }
}
async function open(page: Page) {
  await page.getByRole("region", { name: "Sınıf yönetimi işleri", exact: true }).getByRole("button").first().click();
  const dialog = page.getByRole("dialog", { name: "Sınıf yönetimi", exact: true });
  await dialog.getByLabel("Sınıf yönetimi alanı").selectOption("templates");
  await expect(dialog.getByTestId("school-document-template-workspace")).toBeVisible();
  return dialog;
}
async function download(page: Page, name: string) {
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]").first()).toBeVisible({ timeout: 30000 });
  const event = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
  await (await event).saveAs(`${output}/${name}.pdf`);
  expect((await readFile(`${output}/${name}.pdf`)).length).toBeGreaterThan(10000);
  await page.screenshot({ path: `${output}/${name}-preview.png` });
  await dialog.getByRole("button", { name: "PDF önizlemesini kapat", exact: true }).click();
}
test("390px okul şablonu yerel logo, tam PDF, kaydetme, yeniden açma ve kaldırma", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.name));
  if (production) page.on("request", r => { if (new URL(r.url()).pathname.startsWith("/src/")) errors.push("production-source-import"); });
  await setup(page); let dialog = await open(page);
  await dialog.getByRole("textbox", { name: "Üst başlıklar · en fazla 3 satır", exact: true }).fill("T.C.\nKurgu İlçe Millî Eğitim Müdürlüğü\nKurgu Şablon Anaokulu");
  const image = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 64; c.height = 64; const x = c.getContext("2d")!; x.fillStyle = "#08756e"; x.fillRect(0,0,64,64); x.fillStyle = "white"; x.fillRect(16,16,32,32); return c.toDataURL("image/png").split(",")[1]!; });
  await dialog.getByLabel("Okul logosu · PNG veya JPEG", { exact: true }).setInputFiles({ name: "kurgu-logo.png", mimeType: "image/png", buffer: Buffer.from(image, "base64") });
  await expect(dialog.getByAltText("Seçilen okul logosu", { exact: true })).toBeVisible();
  await dialog.getByRole("combobox", { name: "İmza yerleşimi", exact: true }).selectOption("teacher-and-principal");
  await dialog.getByLabel("Okul müdürü adı soyadı", { exact: true }).fill("KURGU IŞIK MÜDÜR");
  await dialog.getByRole("combobox", { name: "Kâğıt yönü", exact: true }).selectOption("portrait");
  await dialog.getByRole("button", { name: "Tam PDF önizlemesi", exact: true }).click(); await download(page, "template-portrait");
  await dialog.getByRole("button", { name: "Şablonu kaydet", exact: true }).click(); await expect(dialog.getByRole("status")).toHaveText("Okul belge şablonu kaydedildi.");
  expect(await dialog.getByTestId("school-document-template-workspace").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `${output}/template-390.png` });
  await page.reload(); dialog = await open(page);
  await expect(dialog.getByLabel("Okul müdürü adı soyadı", { exact: true })).toHaveValue("KURGU IŞIK MÜDÜR");
  await expect(dialog.getByAltText("Seçilen okul logosu", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Logoyu kaldır", exact: true }).click();
  await dialog.getByRole("combobox", { name: "Kâğıt yönü", exact: true }).selectOption("landscape");
  await dialog.getByRole("button", { name: "Şablonu kaydet", exact: true }).click(); await expect(dialog.getByRole("status")).toHaveText("Okul belge şablonu kaydedildi.");
  await dialog.getByRole("button", { name: "Tam PDF önizlemesi", exact: true }).click(); await download(page, "template-landscape");
  await expect(dialog.getByAltText("Seçilen okul logosu", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("XLS 13 sütun sınıf listesi 0/1/15/30/40 kayıt ve uzun alan gerçek PDF", async ({ page }) => {
  test.skip(production, "Kaynak fixture testi geliştirme ortamındadır; üretim ilk testte gerçek arayüzü kullanır.");
  await mkdir(output, { recursive: true }); await page.goto("/tests/pdf-preview-fixture.html");
  await expect(page.getByRole("button", { name: "Kurgu kaynağı değiştir", exact: true })).toBeVisible();
  for (const count of [0, 1, 15, 30, 40]) {
    const result = await page.evaluate(async count => {
      const { classRosterFixture, classRosterExtremeFixture } = await import("/tests/fixtures/class-roster-fixture.mjs");
      const { createSimpleClassRosterPdfDocument } = await import("/src/features/students/simple-class-roster-document.ts");
      const { downloadBrowserFile } = await import("/src/features/documents/browser-file-download.ts");
      const input = count === 15 ? classRosterExtremeFixture() : classRosterFixture(count);
      const file = await createSimpleClassRosterPdfDocument(input);
      downloadBrowserFile(file);
      return { bytes: Array.from(file.bytes), html: file.html, pageCount: file.pageCount };
    }, count);
    await download(page, `roster-${count}`);
    expect(Array.from(await readFile(`${output}/roster-${count}.pdf`))).toEqual(result.bytes);
    await writeFile(`${output}/roster-${count}.html`, result.html);
  }
});

test("okul logolu sınıf listesi dikey/yatay uzun başlık imza ve adresi eksiksiz sayfalar", async ({ page }) => {
  test.skip(production, "Uç değer mizanpaj fixture'ı geliştirme ortamında doğrulanır.");
  await mkdir(output, { recursive: true }); await page.goto("/tests/pdf-preview-fixture.html");
  await expect(page.getByRole("button", { name: "Kurgu kaynağı değiştir", exact: true })).toBeVisible();
  for (const orientation of ["portrait", "landscape"] as const) {
    const result = await page.evaluate(async orientation => {
      const { classRosterExtremeFixture } = await import("/tests/fixtures/class-roster-fixture.mjs");
      const { createSimpleClassRosterPdfDocument } = await import("/src/features/students/simple-class-roster-document.ts");
      const { downloadBrowserFile } = await import("/src/features/documents/browser-file-download.ts");
      const input = classRosterExtremeFixture();
      const c = document.createElement("canvas"); c.width = 64; c.height = 64; const context = c.getContext("2d")!; context.fillStyle = "#176b5b"; context.fillRect(0,0,64,64);
      input.schoolTemplate = { layout: "official", orientation, headerLines: ["T.C.", ("Kurgu Millî Eğitim Müdürlüğü ".repeat(6)).slice(0,160).trim(), ("Kurgu Uzun Okul Başlığı ".repeat(8)).slice(0,160).trim()], logo: { dataUrl: c.toDataURL("image/png"), width: 64, height: 64 }, signatureLayout: "teacher-and-principal", principalName: "KURGU "+"UZUNSOYADI".repeat(14) };
      const file = await createSimpleClassRosterPdfDocument(input);
      downloadBrowserFile(file); return { bytes: Array.from(file.bytes), html: file.html };
    }, orientation);
    await download(page, `roster-styled-${orientation}`);
    expect(Array.from(await readFile(`${output}/roster-styled-${orientation}.pdf`))).toEqual(result.bytes);
    await writeFile(`${output}/roster-styled-${orientation}.html`, result.html);
    const htmlPage = await page.context().newPage();
    await htmlPage.setContent(result.html, { waitUntil: "load" });
    expect(await htmlPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await htmlPage.emulateMedia({ media: "print" });
    const heights = await htmlPage.locator(".roster-page").evaluateAll(rows => rows.map(row => row.getBoundingClientRect().height));
    expect(Math.max(...heights), `${orientation} HTML baskı yükseklikleri`).toBeLessThanOrEqual((orientation === "portrait" ? 277 : 190) * 96 / 25.4 + 1);
    await htmlPage.close();
  }
});
