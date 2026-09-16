import { test, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";

const output = process.env.MAARIF_DOCUMENTS_OUTPUT_DIR ?? "output/pdf-print-production";
const pdfText = (bytes: Uint8Array) => {
  const result = spawnSync("pdftotext", ["-raw", "-enc", "UTF-8", "-", "-"], { input: bytes, encoding: "utf8" });
  expect(result.status).toBe(0); return result.stdout.replace(/\s+/gu, " ").trim();
};

test("üretim çevrimdışı yazdırma: sınıf PDF metni ve kapsamı PDF yazıcısında aynen korunur", async ({ page, context }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    const state = { calls: 0, html: "", frame: null as HTMLIFrameElement | null };
    (window as any).__productionPrint = state;
    const append = Element.prototype.append;
    Element.prototype.append = function (...nodes: (Node | string)[]) {
      for (const node of nodes) if (node instanceof HTMLIFrameElement && node.dataset.pdfPrintStage) {
        state.frame = node;
        node.addEventListener("load", () => {
          if (node.contentWindow) node.contentWindow.print = () => { state.calls += 1; state.html = node.contentDocument!.documentElement.outerHTML; };
        });
      }
      return append.apply(this, nodes);
    };
  });
  await page.clock.install({ time: new Date("2026-09-09T09:00:00.000Z") });
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Şirin Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Yazdırma Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean((window as any).__maarifosPwaStatus?.offlineReady)), { timeout: 60000 }).toBe(true);
  await context.setOffline(true); await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await add.getByLabel("Çocuğun adı", { exact: true }).fill("İrem Işık");
  await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click(); await expect(add).toBeHidden();
  await page.getByText("Sınıf işlemleri", { exact: true }).click();
  await page.getByRole("button", { name: "Sınıf listesini indir", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  await mkdir(output, { recursive: true });
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
  await (await download).saveAs(`${output}/production-print-source.pdf`);
  await dialog.getByRole("button", { name: "Yazdır", exact: true }).click();
  await expect(dialog.locator("footer").getByRole("status")).toContainText("Yazdırma penceresi açıldı");
  const capture = await page.evaluate(async () => {
    const state = (window as any).__productionPrint;
    let html = state.html as string;
    // Carry the same decoded PNG bytes into an isolated printer surface; do not boot
    // a second app instance whose focus guards/styles would contaminate pagination.
    for (const image of state.frame.contentDocument.images as HTMLCollectionOf<HTMLImageElement>) {
      const blob = await (await fetch(image.src)).blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
      });
      html = html.replace(image.src, dataUrl);
    }
    return { calls: state.calls as number, html };
  });
  expect(capture.calls).toBe(1);
  await writeFile(`${output}/production-print-stage.html`, capture.html);
  // This second surface invokes Chromium's real PDF printer on the exact prepared print DOM.
  const printer = await context.newPage();
  await printer.setContent(capture.html);
  await printer.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode())); });
  await writeFile(`${output}/production-printer-dom.html`, await printer.content());
  await writeFile(`${output}/production-print-layout.json`, JSON.stringify(await printer.evaluate(() => [...document.querySelectorAll("html,body,body>*")].map(element => {
    const style = getComputedStyle(element), box = element.getBoundingClientRect();
    return { tag: element.tagName, class: element.className, width: box.width, height: box.height, minHeight: style.minHeight, margin: style.margin, display: style.display, page: style.page };
  })), null, 2));
  const printed = await printer.pdf({ path: `${output}/production-print-capture.pdf`, preferCSSPageSize: true, printBackground: true });
  const source = await readFile(`${output}/production-print-source.pdf`);
  expect(pdfText(printed)).toBe(pdfText(source)); expect(pdfText(printed)).toContain("İrem Işık");
  const originalPdf = await PDFDocument.load(source), printedPdf = await PDFDocument.load(printed);
  expect(printedPdf.getPageCount()).toBe(originalPdf.getPageCount());
  await printer.close();
  await page.screenshot({ path: `${output}/production-print-offline-390.png` });
  await page.evaluate(() => (window as any).__productionPrint.frame.contentWindow.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("iframe[data-pdf-print-stage]")).toHaveCount(0);
});
