import { test, expect, type Page } from "@playwright/test";
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFString, rgb, type PDFPage } from "pdf-lib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createSemanticTaggedPdf } from "../src/features/documents/semantic-tagged-pdf.ts";
const output = process.env.MAARIF_DOCUMENTS_OUTPUT_DIR ? `${process.env.MAARIF_DOCUMENTS_OUTPUT_DIR}/print` : "output/pdf-print-2026-09-08";
async function fixture(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const state = { printCalls: 0, pages: [] as unknown[], html: "", liveUrls: new Set<string>(), printFrame: null as HTMLIFrameElement | null, holdImages: false, imageWaiting: false, releaseImage: null as (() => void) | null };
    (window as any).__printTest = state;
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL), append = Element.prototype.append;
    URL.createObjectURL = blob => { const url = create(blob); state.liveUrls.add(url); return url; };
    URL.revokeObjectURL = url => { state.liveUrls.delete(url); revoke(url); };
    Element.prototype.append = function (...nodes: (Node | string)[]) {
      for (const node of nodes) if (node instanceof HTMLIFrameElement && node.dataset.pdfPrintStage) {
        state.printFrame = node;
        node.addEventListener("load", () => {
          const target = node.contentWindow as any; if (!target) return;
          const decode = target.HTMLImageElement.prototype.decode;
          target.HTMLImageElement.prototype.decode = async function () { await decode.call(this); if (state.holdImages) { state.imageWaiting = true; await new Promise<void>(resolve => { state.releaseImage = resolve; }); state.holdImages = false; } };
          target.print = () => { state.printCalls += 1; state.html = target.document.documentElement.outerHTML; state.pages = [...target.document.querySelectorAll(".pdf-print-page")].map((section: HTMLElement) => { const image = section.querySelector("img")!; return { width: Number(section.dataset.widthPoints), height: Number(section.dataset.heightPoints), rasterWidth: image.naturalWidth, rasterHeight: image.naturalHeight, alt: image.alt, pageName: section.style.page, links: [...section.querySelectorAll<HTMLAnchorElement>("a.pdf-print-link")].map(anchor => ({ url: anchor.getAttribute("href"), left: Number.parseFloat(anchor.style.left), top: Number.parseFloat(anchor.style.top), width: Number.parseFloat(anchor.style.width), height: Number.parseFloat(anchor.style.height) })) }; }); };
        });
      }
      return append.apply(this, nodes);
    };
  });
  await page.goto("/tests/pdf-preview-fixture.html"); await expect(page.getByRole("button", { name: "Kurgu kaynağı değiştir" })).toBeVisible();
}
const fixtureLinks = [
  [
    { url: "https://example.test/a4/bir?dil=tr#bolum", rect: [42, 650, 222, 676] },
    { url: "http://example.test/a4/iki", rect: [310, 92, 510, 120] },
  ],
  [{ url: "https://example.test/a5/kaynak", rect: [36, 430, 190, 454] }],
  [{ url: "https://example.test/yatay/kaynak?tur=kurgu", rect: [560, 72, 790, 100] }],
] as const;
function attachUriAnnotations(pdf: PDFDocument, page: PDFPage, pageIndex: number) {
  const references = fixtureLinks[pageIndex].map(link => pdf.context.register(pdf.context.obj({
    Type: PDFName.of("Annot"), Subtype: PDFName.of("Link"), Rect: [...link.rect], Border: [0, 0, 0], F: 4,
    A: pdf.context.obj({ S: PDFName.of("URI"), URI: PDFString.of(link.url) }),
  })));
  page.node.set(PDFName.of("Annots"), pdf.context.obj(references));
}
type UriAnnotation = { page: number; url: string; rect: [number, number, number, number] };
function readUriAnnotations(pdf: PDFDocument): UriAnnotation[] {
  const output: UriAnnotation[] = [];
  for (const [pageIndex, page] of pdf.getPages().entries()) {
    const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annotations) continue;
    for (let index = 0; index < annotations.size(); index += 1) {
      const annotation = annotations.lookupMaybe(index, PDFDict);
      if (annotation?.lookupMaybe(PDFName.of("Subtype"), PDFName)?.asString() !== "/Link") continue;
      const action = annotation.lookupMaybe(PDFName.of("A"), PDFDict);
      if (action?.lookupMaybe(PDFName.of("S"), PDFName)?.asString() !== "/URI") continue;
      const uri = action.lookupMaybe(PDFName.of("URI"), PDFString, PDFHexString), rect = annotation.lookupMaybe(PDFName.of("Rect"), PDFArray);
      if (!uri || !rect || rect.size() !== 4) continue;
      output.push({ page: pageIndex + 1, url: uri.decodeText(), rect: [0, 1, 2, 3].map(position => rect.lookup(position, PDFNumber).asNumber()) as [number, number, number, number] });
    }
  }
  return output;
}
async function pdfBytes() {
  const pdf = await PDFDocument.create();
  const runtime = { fontBytes: new Uint8Array(await readFile("public/assets/fonts/MaarifOSSans-Regular.ttf")), boldFontBytes: new Uint8Array(await readFile("public/assets/fonts/MaarifOSSans-Bold.ttf")) };
  for (const [index, size] of [[595.275591, 841.889764], [419.527559, 595.275591], [841.889764, 595.275591]].entries()) {
    const base = await PDFDocument.load(await createSemanticTaggedPdf({ title: "Kurgu yazdırma", omitPageFurniture: true,
      nodes: [{ kind: "paragraph", text: `Kurgu PDF sayfa ${index + 1}` }, { kind: "paragraph", text: `İrem Işık · ğüşöçı İĞÜŞÖÇ · KAYNAK_${index + 1}` }] }, runtime));
    const [page] = await pdf.copyPages(base, [0]);
    const oldHeight = page.getHeight(); page.setSize(size[0], size[1]); page.translateContent(0, size[1] - oldHeight); pdf.addPage(page); attachUriAnnotations(pdf, page, index);
    page.drawRectangle({ x: 30, y: 30, width: page.getWidth() - 60, height: 100, borderWidth: 2, borderColor: rgb(0, 0, 0), color: rgb(1, 1, 1) });
  }
  return Array.from(await pdf.save());
}
async function show(page: Page, bytes: number[]) {
  await page.evaluate(async bytes => { const { requestPdfDocument } = await import("/src/features/documents/pdf-preview-model.ts"); const file = { bytes: new Uint8Array(bytes), fileName: "kurgu-uc-sayfa.pdf", mimeType: "application/pdf" }; void requestPdfDocument({ title: "Kurgu yazdırma", printEnabled: true, fields: [{ id: "content", label: "İçerik" }], initial: { fields: ["content"] }, build: async () => file }); }, bytes);
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true }); await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 }); return dialog;
}
test("gerçek üç PDF sayfası tek print çağrısında A4/A5/yatay ölçüsü ve Türkçe metni korur", async ({ page, context }) => {
  test.setTimeout(90000); await mkdir(output, { recursive: true }); await fixture(page); const sourceBytes = await pdfBytes(); await writeFile(`${output}/browser-print-uri-source.pdf`, Uint8Array.from(sourceBytes)); const dialog = await show(page, sourceBytes); await dialog.getByRole("button", { name: "Yazdır", exact: true }).click(); await expect(dialog.locator("footer").getByRole("status")).toContainText("Yazdırma penceresi açıldı");
  const result = await page.evaluate(() => { const s = (window as any).__printTest; return { printCalls: s.printCalls, pages: s.pages, html: s.html }; }); expect(result.printCalls).toBe(1); expect(result.pages).toHaveLength(3);
  for (const [index, p] of result.pages.entries()) { expect(p.rasterWidth).toBe(Math.ceil(p.width * 180 / 72)); expect(p.rasterHeight).toBe(Math.ceil(p.height * 180 / 72)); expect(p.alt).toBe(`PDF sayfa ${index + 1}`); }
  expect(result.pages.flatMap((printedPage: any, pageIndex: number) => printedPage.links.map((link: any) => ({ page: pageIndex + 1, url: link.url })))).toEqual(fixtureLinks.flatMap((links, pageIndex) => links.map(link => ({ page: pageIndex + 1, url: link.url }))));
  await page.screenshot({ path: `${output}/print-button-390.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const printButtonBounds = await dialog.getByRole("button", { name: "Yazdır", exact: true }).boundingBox();
  expect(printButtonBounds).not.toBeNull(); expect(printButtonBounds!.x).toBeGreaterThanOrEqual(0); expect(printButtonBounds!.x + printButtonBounds!.width).toBeLessThanOrEqual(390);
  const printer = await context.newPage(); await printer.goto("/tests/pdf-preview-fixture.html"); await printer.setContent(result.html); await printer.evaluate(() => Promise.all([...document.images].map(image => image.decode()))); const printed = await printer.pdf({ path: `${output}/browser-print-three-pages.pdf`, preferCSSPageSize: true, printBackground: true }); const parsed = await PDFDocument.load(printed); expect(parsed.getPageCount()).toBe(3);
  for (let i = 0; i < 3; i += 1) { expect(parsed.getPage(i).getWidth()).toBeCloseTo(result.pages[i].width, 0); expect(parsed.getPage(i).getHeight()).toBeCloseTo(result.pages[i].height, 0); }
  const extracted = spawnSync("pdftotext", ["-raw", "-enc", "UTF-8", "-", "-"], { input: printed, encoding: "utf8" });
  expect(extracted.status, "PDF yazıcısından çıkan dosya gerçek Poppler ile okunmalı").toBe(0);
  const textPages = extracted.stdout.split("\f").filter(value => value.trim()); expect(textPages).toHaveLength(3);
  textPages.forEach((text, index) => {
    expect(text).toContain(`Kurgu PDF sayfa ${index + 1}`);
    expect(text).toContain(`İrem Işık · ğüşöçı İĞÜŞÖÇ · KAYNAK_${index + 1}`);
    expect(text.match(/KAYNAK_/gu)).toHaveLength(1);
    expect(text).not.toContain("\ufffd");
  });
  const sourceAnnotations = readUriAnnotations(await PDFDocument.load(Uint8Array.from(sourceBytes))), printedAnnotations = readUriAnnotations(parsed);
  expect(printedAnnotations).toHaveLength(sourceAnnotations.length);
  for (const [index, source] of sourceAnnotations.entries()) {
    const actual = printedAnnotations[index]; expect(actual.page).toBe(source.page); expect(actual.url).toBe(source.url);
    source.rect.forEach((coordinate, position) => expect(Math.abs(actual.rect[position] - coordinate)).toBeLessThanOrEqual(0.75));
  }
  await printer.close(); await page.evaluate(() => (window as any).__printTest.printFrame.contentWindow.dispatchEvent(new Event("afterprint"))); await expect(page.locator("iframe[data-pdf-print-stage]")).toHaveCount(0); expect(await page.evaluate(() => (window as any).__printTest.liveUrls.size)).toBe(1); await dialog.getByRole("button", { name: "PDF önizlemesini kapat" }).click(); expect(await page.evaluate(() => (window as any).__printTest.liveUrls.size)).toBe(0);
});
test("render beklerken kaynak değişirse eski PDF yazdırılmaz ve frame/URL temizlenir", async ({ page }) => {
  test.setTimeout(60000); await fixture(page); const dialog = await show(page, await pdfBytes()); await page.evaluate(() => (window as any).__printTest.holdImages = true); await dialog.getByRole("button", { name: "Yazdır", exact: true }).click(); await page.waitForFunction(() => (window as any).__printTest.imageWaiting); await page.locator("#root > button").evaluate((b: HTMLButtonElement) => b.click()); await page.evaluate(() => (window as any).__printTest.releaseImage()); await expect(page.locator("iframe[data-pdf-print-stage]")).toHaveCount(0); expect(await page.evaluate(() => (window as any).__printTest.printCalls)).toBe(0); expect(await page.evaluate(() => (window as any).__printTest.liveUrls.size)).toBe(0);
});
test("render beklerken önizleme kapatılırsa print çağrısı yapılmaz", async ({ page }) => {
  test.setTimeout(60000); await fixture(page); const dialog = await show(page, await pdfBytes()); await page.evaluate(() => (window as any).__printTest.holdImages = true); await dialog.getByRole("button", { name: "Yazdır", exact: true }).click(); await page.waitForFunction(() => (window as any).__printTest.imageWaiting); await dialog.getByRole("button", { name: "PDF önizlemesini kapat" }).click(); await page.evaluate(() => (window as any).__printTest.releaseImage()); await expect(page.locator("iframe[data-pdf-print-stage]")).toHaveCount(0); expect(await page.evaluate(() => (window as any).__printTest.printCalls)).toBe(0); expect(await page.evaluate(() => (window as any).__printTest.liveUrls.size)).toBe(0);
});
test("bozuk PDF gerçek parser'da reddedilir; print veya frame sızıntısı oluşmaz", async ({ page }) => {
  await fixture(page); const result = await page.evaluate(async () => { const { printPreparedPdfArtifact } = await import("/src/features/documents/print-pdf-artifact.ts"); const { preparePdfArtifact } = await import("/src/features/documents/pdf-preview-model.ts"); const artifact = preparePdfArtifact({ bytes: new TextEncoder().encode("%PDF-1.7\nbroken\n%%EOF"), mimeType: "application/pdf", fileName: "kurgu-bozuk.pdf" }); try { await printPreparedPdfArtifact(artifact, async () => {}); return "unexpected"; } catch (e) { return e instanceof Error ? e.message : "error"; } finally { artifact.dispose(); } }); expect(result).toContain("PDF yazdırma için okunamadı"); expect(await page.evaluate(() => (window as any).__printTest.printCalls)).toBe(0); expect(await page.evaluate(() => (window as any).__printTest.liveUrls.size)).toBe(0); await expect(page.locator("iframe[data-pdf-print-stage]")).toHaveCount(0);
});
