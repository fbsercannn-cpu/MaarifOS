import { test, expect, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
const productionMode = process.env.MAARIF_DOCUMENTS_PRODUCTION === "1";
const output = process.env.MAARIF_DOCUMENTS_OUTPUT_DIR ?? `output/export-next-2026-09-09/marif/preview${productionMode ? "/production" : ""}`;
const r09Evidence = process.env.MAARIF_R09_EVIDENCE_DIR;
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const original = URL.createObjectURL.bind(URL); const revoke = URL.revokeObjectURL.bind(URL);
    Object.assign(window, { pdfBlobs: [] as Blob[], revokedPdfUrls: [] as string[] });
    URL.createObjectURL = (blob) => { if (blob instanceof Blob && blob.type === "application/pdf") (window as any).pdfBlobs.push(blob); return original(blob); };
    URL.revokeObjectURL = (url) => { (window as any).revokedPdfUrls.push(url); revoke(url); };
  });
  if (!productionMode) {
    await page.goto("/tests/pdf-preview-fixture.html");
    await expect(page.getByRole("button", { name: "Kurgu kaynağı değiştir" })).toBeVisible();
  }
});
async function roster(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const { classRosterExtremeFixture } = await import("/tests/fixtures/class-roster-fixture.mjs");
    const { createSimpleClassRosterPdfDocument } = await import("/src/features/students/simple-class-roster-document.ts");
    const { downloadBrowserFile } = await import("/src/features/documents/browser-file-download.ts");
    const input = classRosterExtremeFixture();
    input.snapshot.academicYears[0].startDate = "2026-09-07"; input.snapshot.academicYears[0].endDate = "2027-06-30";
    const file = await createSimpleClassRosterPdfDocument(input);
    (window as any).pdfOriginal = Array.from(file.bytes);
    downloadBrowserFile(file);
  });
}
test("hazır baskı düzeni gerçek PDF üretir ve seçili içeriği korur", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await roster(page);
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  const extract = () => page.evaluate(async () => {
    const { pdfText } = await import("/tests/fixtures/pdf-text-browser.ts");
    return pdfText((window as any).pdfBlobs.at(-1));
  });
  const originalText = await extract();
  await dialog.locator(".pdf-preview-options > summary").click();
  await dialog.getByRole("button", {name:"Az mürekkepli PDF",exact:true}).click();
  await expect(dialog.getByText("Aynı içerik, beyaz zemin ve koyu metinle hazırlanır.")).toBeVisible();
  await expect(dialog.getByRole("button", {name:"Bu PDF'yi indir",exact:true})).toBeEnabled({timeout:30000});
  expect(await extract()).toBe(originalText);
  await dialog.getByRole("button", {name:"Az mürekkepli PDF",exact:true}).click();
  await expect(dialog.getByRole("button", {name:"Az mürekkepli PDF",exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(dialog.getByRole("button", {name:"Bu PDF'yi indir",exact:true})).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", {name:"Bu PDF'yi indir",exact:true}).click();
  const download = await downloadPromise;
  await mkdir("output/document-design",{recursive:true});
  await download.saveAs("output/document-design/kurgu-ink-saving.pdf");
  expect(Array.from(await readFile("output/document-design/kurgu-ink-saving.pdf"))).not.toEqual(await page.evaluate(()=>(window as any).pdfOriginal));
  await dialog.locator(".pdf-preview-options > summary").click();
  await page.screenshot({path:"output/document-design/ink-saving-mobile.png"});
});
async function openSearchPanel(dialog: Locator) {
  const panel = dialog.locator("details.pdf-search-panel");
  if (await panel.getAttribute("open") === null) await panel.locator("summary").click();
  return panel;
}
async function openSecondaryActions(dialog: Locator) {
  const menu = dialog.locator("details.pdf-preview-secondary-actions");
  if (await menu.getAttribute("open") === null) await menu.locator("summary").click();
  return menu;
}
async function measureInitialPdfViewport(dialog: Locator) {
  return dialog.evaluate((root) => {
    const required = (selector: string) => {
      const element = root.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`R09 ölçüm öğesi bulunamadı: ${selector}`);
      return element;
    };
    const rect = (element: Element) => {
      const box = element.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        left: box.left,
      };
    };
    const body = required(".pdf-preview-body");
    const scope = required(".pdf-export-review");
    const options = required(".pdf-preview-options");
    const optionsSummary = required(".pdf-preview-options > summary");
    const optionsBody = required(".pdf-preview-options__body");
    const pageControls = required(".pdf-page-controls");
    const readingViewport = required(".pdf-canvas-viewport");
    const firstPage = required(".pdf-page-surface");
    const footer = required(":scope > footer");
    const bodyBox = body.getBoundingClientRect();
    const viewportBox = readingViewport.getBoundingClientRect();
    const pageBox = firstPage.getBoundingClientRect();
    const footerBox = footer.getBoundingClientRect();
    const visibleBottom = Math.min(
      bodyBox.bottom,
      viewportBox.bottom,
      footerBox.top,
      window.innerHeight,
    );
    const visibleTop = Math.max(bodyBox.top, viewportBox.top, pageBox.top, 0);
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bodyScrollTop: body.scrollTop,
      detailsOpen: options.hasAttribute("open"),
      optionsBodyDisplay: getComputedStyle(optionsBody).display,
      visibleFirstPageHeight: Math.max(0, visibleBottom - visibleTop),
      boxes: {
        dialog: rect(root),
        header: rect(required(":scope > header")),
        description: rect(required("#pdf-preview-description")),
        body: rect(body),
        compactScope: rect(scope),
        optionsSummary: rect(optionsSummary),
        optionsBody: rect(optionsBody),
        pageControls: rect(pageControls),
        readingViewport: rect(readingViewport),
        firstPage: rect(firstPage),
        footer: rect(footer),
      },
    };
  });
}
test("320px gerçek PDF canvas, byte eşitliği, uzun yakın verisi ve üç şablon", async ({ page }) => {
  test.setTimeout(120000); await page.setViewportSize({ width: 320, height: 844 });
  await roster(page);
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  await expect(dialog.locator(".pdf-preview-options")).not.toHaveAttribute("open", "");
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}/contact-preview-320.png` });
  const event = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
  const download = await event; await download.saveAs(`${output}/contact-list.pdf`);
  expect(Array.from(await readFile(`${output}/contact-list.pdf`))).toEqual(await page.evaluate(() => (window as any).pdfOriginal));
  expect(await page.evaluate(() => { const blobs = (window as any).pdfBlobs; return blobs.at(-1) === blobs.at(-2); })).toBe(true);
  await dialog.locator(".pdf-preview-options > summary").click();
  await dialog.getByRole("button", { name: "Seçimi temizle" }).click();
  await expect(dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true })).toBeDisabled();
  await dialog.getByLabel("Kurgu İpek Deniz Uzunoğulları Çınaroğlu", { exact: true }).check();
  await dialog.getByLabel("Hazır şablon").selectOption("student-record");
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible();
  const singleEvent = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click(); await (await singleEvent).saveAs(`${output}/student-record.pdf`);
  await dialog.getByLabel("Hazır şablon").selectOption("emergency-card");
  await expect(dialog.getByLabel("Acil sağlık bilgileri (özel)", { exact: true })).not.toBeChecked();
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible();
  const emergencyEvent = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click(); await (await emergencyEvent).saveAs(`${output}/emergency-card.pdf`);
  await dialog.locator(".pdf-preview-options > summary").click(); await page.screenshot({ path: `${output}/emergency-preview-320.png` });
});
test("kaynak değişince eski PDF ve export iptal edilir", async ({ page }) => {
  test.setTimeout(60000); await roster(page);
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  await page.locator("#root > button").evaluate((button: HTMLButtonElement) => button.click());
  await expect(dialog.getByRole("alert")).toContainText("kaynak kayıtları değişti");
  await expect(dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true })).toBeDisabled();
  await expect(dialog.locator("canvas")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).revokedPdfUrls.length)).toBeGreaterThan(0);
});
test("çocuk, alıcı, kapsam ve amaç özeti aile çıktısını tek çocukla sınırlar", async ({ page }) => {
  test.skip(productionMode, "Kurgu alıcı sınırı geliştirme fixture'ında doğrulanır.");
  await page.evaluate(async () => {
    const { requestPdfDocument } = await import("/src/features/documents/pdf-preview-model.ts");
    const { createSemanticTaggedPdf } = await import("/src/features/documents/semantic-tagged-pdf.ts");
    const students = [
      { id: "11111111-1111-4111-8111-111111111111", label: "Kurgu Ada" },
      { id: "22222222-2222-4222-8222-222222222222", label: "Kurgu Deniz" },
    ];
    void requestPdfDocument({
      title: "Kurgu aile kapsamı",
      fields: [{ id: "name", label: "Ad soyad" }, { id: "note", label: "Öğretmen notu" }],
      students,
      initial: { fields: ["name"], studentIds: students.map((student) => student.id) },
      async build(selection) {
        const labels = students.filter((student) => selection.studentIds?.includes(student.id)).map((student) => student.label);
        const bytes = await createSemanticTaggedPdf({ title: "Kurgu kapsam", nodes: labels.map((text) => ({ kind: "paragraph" as const, text })) });
        return { bytes, mimeType: "application/pdf", fileName: "kurgu-aile-kapsami.pdf" };
      },
    });
  });
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  const review = dialog.locator(".pdf-export-review");
  const options = dialog.locator(".pdf-preview-options");
  await expect(review).toContainText("2 çocuk seçili");
  await expect(review).toContainText("1 seçili alan");
  await expect(review).toContainText("Öğretmenin yerel hazırlığı");
  await expect(review).toContainText("Ders öncesi/sonrası hazırlık");
  await expect(options).not.toHaveAttribute("open", "");
  await options.locator(":scope > summary").click();
  await expect(options.getByLabel("Alıcı").locator('option[value="selected-student-family"]')).toHaveAttribute("disabled", "");
  await dialog.getByLabel("Kurgu Ada", { exact: true }).uncheck();
  await dialog.getByLabel("Kurgu Deniz", { exact: true }).uncheck();
  await expect(review).toContainText("Çocuk seçilmedi");
  await expect(options.locator(":scope > summary small")).toHaveText("1 alan · 0 çocuk");
  await dialog.getByLabel("Kurgu Ada", { exact: true }).check();
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  await options.getByLabel("Alıcı").selectOption("selected-student-family");
  await expect(options.getByLabel("Amaç")).toHaveValue("family-information");
  await expect(review).toContainText("Kurgu Ada");
  await expect(review).toContainText("Seçili çocuğun ailesi");
  await expect(review).toContainText("Aile bilgilendirmesi");
  await expect(options).toContainText("yalnız okulun bu aile için belirlediği güncel ve yetkili iletişim kanalında");
  const event = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
  const download = await event;
  await mkdir(output, { recursive: true });
  const path = `${output}/single-family-scope.pdf`;
  await download.saveAs(path);
  const text = await page.evaluate(async () => {
    const { pdfText } = await import("/tests/fixtures/pdf-text-browser.ts");
    return pdfText((window as any).pdfBlobs.at(-1));
  });
  expect(text).toContain("Kurgu Ada");
  expect(text).not.toContain("Kurgu Deniz");
});

test("R09 kompakt kapsam özeti 320 ve 390px ilk görünümde PDF okuma alanını korur", async ({ page }) => {
  test.skip(productionMode, "Exact R09 bbox geliştirme fixture'ında ölçülür.");
  test.setTimeout(60000);
  await roster(page);
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  const measurements = [];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible();
    const measurement = await measureInitialPdfViewport(dialog);
    measurements.push(measurement);
    if (r09Evidence) {
      await mkdir(r09Evidence, { recursive: true });
      await page.screenshot({ path: `${r09Evidence}/r09-compact-preview-${width}.png` });
      await writeFile(
        `${r09Evidence}/r09-pdf-preview-bbox.json`,
        `${JSON.stringify({
          schemaVersion: 1,
          measuredAtUtc: new Date().toISOString(),
          civilDate: "2026-09-09",
          fixture: "tests/pdf-preview-fixture.html + classRosterExtremeFixture",
          initialBodyScrollTop: 0,
          measurements,
        }, null, 2)}\n`,
        "utf8",
      );
    }
    expect(measurement.detailsOpen).toBe(false);
    expect(measurement.optionsBodyDisplay).toBe("none");
    expect(measurement.bodyScrollTop).toBe(0);
    expect(measurement.boxes.dialog.width).toBeLessThanOrEqual(width);
    expect(measurement.boxes.optionsSummary.height).toBeGreaterThanOrEqual(44);
    expect(measurement.boxes.compactScope.height).toBeLessThanOrEqual(125);
    expect(measurement.boxes.firstPage.top).toBeLessThan(measurement.boxes.footer.top);
    expect(measurement.visibleFirstPageHeight).toBeGreaterThanOrEqual(280);
  }
});
test("yerel etkinlik çizim alanı gerçek PDF olarak açılır ve boş sayfa üretmez", async ({ page }) => {
  test.setTimeout(60000);
  await page.evaluate(async () => {
    const { previewHtmlPrintDocument } = await import("/src/features/documents/html-document-pdf.ts");
    void previewHtmlPrintDocument({ title: "Kurgu Çizim Çalışması", fileName: "kurgu-cizim.html", html: '<!doctype html><html lang="tr"><head><style>body{font-family:Arial}h1{color:#176b5b}.box{height:360px;border:2px solid #176b5b;padding:20px}</style></head><body><h1>Öğretmen · Çınar · İğde</h1><p>Kurgu öğrenci çalışma alanı</p><div class="box">Buraya çiziyorum</div></body></html>' });
  });
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  await expect(dialog.locator(".pdf-page-controls").getByText("Sayfa 1 / 1", { exact: true })).toBeVisible();
  await page.screenshot({ path: `${output}/worksheet-preview.png` });
  const event = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click(); await (await event).saveAs(`${output}/worksheet.pdf`);
  const text = await page.evaluate(async () => {
    const { pdfText } = await import("/tests/fixtures/pdf-text-browser.ts");
    return pdfText((window as any).pdfBlobs.at(-1));
  });
  for (const expected of ["Öğretmen · Çınar · İğde", "Kurgu öğrenci çalışma alanı", "Buraya çiziyorum"]) expect(text).toContain(expected);
});

test("320px PDF.js metin katmanı Türkçe arama, klavye gezinmesi ve seçime izin verir", async ({ page }) => {
  test.skip(productionMode, "Kurgu kaynak yalnız geliştirme fixture'ında oluşturulur.");
  test.setTimeout(90000);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(async () => {
    const { createSemanticTaggedPdf } = await import("/src/features/documents/semantic-tagged-pdf.ts");
    const { requestPdfPreview } = await import("/src/features/documents/pdf-preview-model.ts");
    const filler = Array.from({ length: 64 }, (_, index) => ({
      kind: "paragraph" as const,
      text: `Kurgu dolgu satırı ${String(index + 1).padStart(2, "0")} · Sayfa geçişi ve metin katmanı hizası denetlenir.`,
    }));
    const bytes = await createSemanticTaggedPdf({
      title: "Türkçe PDF arama kabulü",
      nodes: [
        { kind: "heading", level: 1, text: "İğne başlangıç eşleşmesi" },
        { kind: "paragraph", text: "IĞDIR ve İREM Türkçe harf denetimi" },
        ...filler,
        { kind: "paragraph", text: "Son sayfadaki İĞNE eşleşmesi" },
      ],
    });
    requestPdfPreview({ bytes, mimeType: "application/pdf", fileName: "turkce-arama.pdf" });
  });

  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator(".pdf-export-review")).toContainText("Önizlemede doğrulanmalı");
  await expect(dialog.locator(".pdf-preview-options > summary small")).toHaveText(
    "1 alan · çocuk kapsamını kontrol edin",
  );
  await expect(dialog.locator(".pdf-preview-options > summary small")).not.toContainText("0 çocuk");
  const searchPanel = dialog.getByRole("region", { name: "PDF metin araması" });
  await expect(searchPanel).not.toHaveAttribute("open", "");
  const collapsedReadingArea = await dialog.locator(".pdf-canvas-viewport").evaluate((viewport) => {
    const body = viewport.closest(".pdf-preview-body")!.getBoundingClientRect();
    const box = viewport.getBoundingClientRect();
    return Math.max(0, Math.min(box.bottom, body.bottom) - Math.max(box.top, body.top));
  });
  expect(collapsedReadingArea).toBeGreaterThanOrEqual(280);
  await openSearchPanel(dialog);
  const search = searchPanel.getByLabel("PDF metninde ara", { exact: true });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  await expect(search).toBeEnabled({ timeout: 30000 });
  await search.fill("İĞNE");
  await expect(search).toBeFocused();
  await expect(searchPanel.locator(".pdf-search-status")).toHaveText("1 / 2 eşleşme");
  const searchBox = await search.boundingBox();
  expect(searchBox).not.toBeNull();
  expect(searchBox!.y).toBeGreaterThanOrEqual(0);
  expect(searchBox!.y + searchBox!.height).toBeLessThanOrEqual(844);
  await expect(dialog.locator(".pdf-search-highlight.is-active")).toBeVisible();

  const firstPageLabel = await dialog.locator(".pdf-page-controls > span").innerText();
  await searchPanel.getByRole("button", { name: "Sonraki eşleşme", exact: true }).click();
  await expect(searchPanel.locator(".pdf-search-status")).toHaveText("2 / 2 eşleşme");
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible();
  await expect.poll(() => dialog.locator(".pdf-page-controls > span").innerText()).not.toBe(firstPageLabel);
  const navigatedSearchBox = await search.boundingBox();
  expect(navigatedSearchBox).not.toBeNull();
  expect(navigatedSearchBox!.y).toBeGreaterThanOrEqual(0);
  expect(navigatedSearchBox!.y + navigatedSearchBox!.height).toBeLessThanOrEqual(844);

  await search.focus();
  await page.keyboard.press("Shift+Enter");
  await expect(searchPanel.locator(".pdf-search-status")).toHaveText("1 / 2 eşleşme");
  await page.keyboard.press("Enter");
  await expect(searchPanel.locator(".pdf-search-status")).toHaveText("2 / 2 eşleşme");
  await page.keyboard.press("Shift+Enter");
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible();

  const layerEvidence = await dialog.locator(".pdf-text-layer[data-pdf-text-layer=ready]").evaluate((layer) => {
    const element = layer as HTMLElement;
    const canvas = element.parentElement!.querySelector("canvas")!;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode() as Text | null;
    while (node && !node.data.toLocaleLowerCase("tr-TR").includes("iğne")) node = walker.nextNode() as Text | null;
    if (!node) throw new Error("Seçilecek PDF.js metni bulunamadı.");
    const start = node.data.toLocaleLowerCase("tr-TR").indexOf("iğne");
    const range = document.createRange();
    range.setStart(node, start); range.setEnd(node, start + 4);
    const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
    const layerBox = element.getBoundingClientRect(); const canvasBox = canvas.getBoundingClientRect();
    const firstText = element.querySelector<HTMLElement>("span");
    return {
      selected: selection?.toString() ?? "",
      pointerEvents: getComputedStyle(element).pointerEvents,
      touchAction: getComputedStyle(element).touchAction,
      userSelect: firstText ? getComputedStyle(firstText).userSelect : "",
      widthDelta: Math.abs(layerBox.width - canvasBox.width),
      heightDelta: Math.abs(layerBox.height - canvasBox.height),
    };
  });
  expect(layerEvidence.selected.toLocaleLowerCase("tr-TR")).toBe("iğne");
  expect(layerEvidence.pointerEvents).toBe("auto");
  expect(
    layerEvidence.touchAction === "manipulation" || layerEvidence.touchAction.includes("pinch-zoom"),
  ).toBe(true);
  expect(layerEvidence.userSelect).toBe("text");
  expect(layerEvidence.widthDelta).toBeLessThan(1);
  expect(layerEvidence.heightDelta).toBeLessThan(1);
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toHaveAttribute("aria-hidden", "true");
  await expect(dialog.getByRole("document", { name: /PDF sayfa 1 seçilebilir metni/u })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include(".pdf-preview-dialog").analyze();
  expect(accessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}/pdf-text-search-320.png` });
});

test("düşük bellek emülasyonunda büyük PDF ilk sayfayı açar, aramayı iptal eder ve kaynağı bozmadan yeniden hazırlar", async ({ page }) => {
  test.skip(productionMode, "Kurgu büyük belge yalnız geliştirme fixture'ında oluşturulur.");
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: 1 });
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 2 });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const heapMetric = async () => {
    const result = await cdp.send("Performance.getMetrics");
    return result.metrics.find((metric) => metric.name === "JSHeapUsedSize")?.value ?? null;
  };
  const heapBefore = await heapMetric();
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (let pageNumber = 1; pageNumber <= 240; pageNumber++) {
    const pdfPage = document.addPage([595.28, 841.89]);
    pdfPage.drawText(`KURGU-BUYUK-BELGE SAYFA ${pageNumber}`, { x: 42, y: 790, size: 13, font, color: rgb(0.05, 0.25, 0.3) });
    for (let line = 0; line < 28; line++) {
      pdfPage.drawText(`Kurgu satir ${line + 1} sayfa ${pageNumber} kaynak kaydi degismez`, { x: 42, y: 760 - line * 24, size: 9, font });
    }
    if (pageNumber === 240) pdfPage.drawText("SON-SAYFA-240", { x: 42, y: 54, size: 11, font });
  }
  const largeBytes = await document.save({ useObjectStreams: true });
  const created = await page.evaluate(async (sourceBytes) => {
    const { requestPdfPreview } = await import("/src/features/documents/pdf-preview-model.ts");
    const bytes = Uint8Array.from(sourceBytes);
    (window as any).largePdfOriginal = Array.from(bytes);
    requestPdfPreview({ bytes, mimeType: "application/pdf", fileName: "kurgu-buyuk-240-sayfa.pdf" });
    return { bytes: bytes.byteLength, pages: 240, startedAt: performance.now() };
  }, Array.from(largeBytes));
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  const firstPageMs = await page.evaluate((startedAt) => performance.now() - startedAt, created.startedAt);
  await expect(dialog.locator(".pdf-page-controls")).toContainText("Sayfa 1 / 240");
  const searchPanel = await openSearchPanel(dialog);
  const cancel = searchPanel.getByRole("button", { name: "Arama hazırlığını iptal et", exact: true });
  await expect(cancel).toBeVisible();
  const cancelStarted = Date.now();
  await cancel.click();
  await expect(searchPanel.locator(".pdf-search-status")).toContainText("Arama hazırlığı iptal edildi");
  const cancelResponseMs = Date.now() - cancelStarted;

  const downloadEvent = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
  const download = await downloadEvent;
  await mkdir(output, { recursive: true });
  const downloadedPath = `${output}/large-preview-after-cancel.pdf`;
  await download.saveAs(downloadedPath);
  expect(Array.from(await readFile(downloadedPath))).toEqual(await page.evaluate(() => (window as any).largePdfOriginal));

  const retryStarted = Date.now();
  await searchPanel.getByRole("button", { name: "Aramayı yeniden hazırla", exact: true }).click();
  const search = searchPanel.getByLabel("PDF metninde ara", { exact: true });
  await expect(search).toBeEnabled({ timeout: 60000 });
  await search.fill("SON-SAYFA-240");
  await expect(searchPanel.locator(".pdf-search-status")).toHaveText("1 / 1 eşleşme", { timeout: 30000 });
  await expect(dialog.locator(".pdf-page-controls")).toContainText("Sayfa 240 / 240");
  const retryAndSearchMs = Date.now() - retryStarted;
  await dialog.getByRole("button", { name: "PDF önizlemesini kapat", exact: true }).click();
  await expect(dialog).toHaveCount(0);

  const reopenStarted = Date.now();
  await page.evaluate(async () => {
    const { requestPdfPreview } = await import("/src/features/documents/pdf-preview-model.ts");
    requestPdfPreview({ bytes: Uint8Array.from((window as any).largePdfOriginal), mimeType: "application/pdf", fileName: "kurgu-buyuk-240-sayfa.pdf" });
  });
  const reopened = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(reopened.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  const reopenFirstPageMs = Date.now() - reopenStarted;
  const heapAfter = await heapMetric();
  const receipt = {
    schemaVersion: 1,
    synthetic: true,
    deviceProfile: { deviceMemoryGiB: 1, hardwareConcurrency: 2, emulated: true },
    source: { bytes: created.bytes, pages: created.pages },
    measurements: { firstPageMs, cancelResponseMs, retryAndSearchMs, reopenFirstPageMs, jsHeapUsedBefore: heapBefore, jsHeapUsedAfter: heapAfter },
    checks: { firstPageRendered: true, cancelKeptUiUsable: true, sourceBytesUnchanged: true, lastPageSearchFound: true, reopenSucceeded: true },
    passed: cancelResponseMs < 1000 && firstPageMs < 10000 && reopenFirstPageMs < 10000,
  };
  expect(receipt.passed).toBe(true);
  await writeFile(`${output}/large-preview-receipt.json`, JSON.stringify(receipt, null, 2));
  await reopened.getByRole("button", { name: "PDF önizlemesini kapat", exact: true }).click();
});

test("textContent boş raster PDF arama veya OCR varmış gibi davranmaz", async ({ page }) => {
  test.skip(productionMode, "Kurgu kaynak yalnız geliştirme fixture'ında oluşturulur.");
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(async () => {
    const { createA4ImagePdf, jpegDataUrlBytes } = await import("/src/features/documents/canvas-image-pdf.ts");
    const { requestPdfPreview } = await import("/src/features/documents/pdf-preview-model.ts");
    const canvas = document.createElement("canvas"); canvas.width = 32; canvas.height = 32;
    const context = canvas.getContext("2d")!; context.fillStyle = "#28a69f"; context.fillRect(0, 0, 32, 32);
    const image = jpegDataUrlBytes(canvas.toDataURL("image/jpeg", 0.9));
    const bytes = createA4ImagePdf([image], { title: "Aranabilir metni olmayan kurgu görsel" });
    requestPdfPreview({ bytes, mimeType: "application/pdf", fileName: "raster-kurgu.pdf" });
  });
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  const searchPanel = dialog.getByRole("region", { name: "PDF metin araması" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  await openSearchPanel(dialog);
  await expect(searchPanel.getByLabel("PDF metninde ara", { exact: true })).toBeDisabled();
  await expect(searchPanel.locator(".pdf-search-empty")).toContainText("aranabilir metin bulunamadı");
  await expect(dialog.locator(".pdf-text-layer[data-pdf-text-layer=empty]")).toHaveAttribute("aria-hidden", "true");
  await expect(dialog.locator(".pdf-text-layer[data-pdf-text-layer=empty] span")).toHaveCount(0);
  await expect(dialog.getByRole("img", { name: "Basılacak PDF · sayfa 1 / 1" })).toBeVisible();
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}/pdf-raster-empty-320.png` });
});

test("390px hazır ad listesi seçimi PDF ve Excel'de aynı iki alanı verir", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await roster(page);
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  await dialog.locator(".pdf-preview-options > summary").click();
  await dialog.getByRole("button", { name: "Ad listesi", exact: true }).click();
  await expect(dialog.getByText("Belgeye alınacak alanlar · 2/20", { exact: true })).toBeVisible();
  await expect(dialog.locator(".pdf-page-controls").getByText("Sayfa 1 / 1", { exact: true })).toBeVisible();
  const event = page.waitForEvent("download");
  await openSecondaryActions(dialog);
  await dialog.getByRole("button", { name: "Excel'e çıkar", exact: true }).click();
  const file = await event;
  await mkdir(output, { recursive: true });
  await file.saveAs(`${output}/preset-names.xlsx`);
  const xlsx = await import("xlsx");
  const book = xlsx.read(await readFile(`${output}/preset-names.xlsx`), { type: "buffer" });
  const sheet = book.Sheets[book.SheetNames[0]];
  expect(xlsx.utils.decode_range(sheet["!ref"]!).e.c).toBe(1);
  const values = xlsx.utils.sheet_to_json(sheet, { header: 1 }).flat();
  expect(values).toContain("Sıra numarası"); expect(values).toContain("Adı soyadı");
  expect(values).not.toContain("Anne telefonu");
  await dialog.getByRole("button", { name: "Tam kayıt", exact: true }).click();
  await expect(dialog.getByText("Belgeye alınacak alanlar · 20/20", { exact: true })).toBeVisible();
});

test("uygulama sınıf listesi düğmesi gerçek PDF önizlemesini açar", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date("2026-09-07T09:00:00.000Z") });
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Belge Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
  if (productionMode) {
    await expect.poll(() => page.evaluate(() => Boolean((window as any).__maarifosPwaStatus?.offlineReady)), { timeout: 60000 }).toBe(true);
    await page.context().setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await add.getByLabel("Çocuğun adı", { exact: true }).fill("Kurgu PDF Öğrencisi");
  await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(add).toBeHidden();
  await page.getByText("Sınıf işlemleri", { exact: true }).click();
  await page.getByRole("button", { name: "Sınıf listesini indir", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  const previewOptions = dialog.locator(".pdf-preview-options");
  await expect(previewOptions).not.toHaveAttribute("open", "");
  await previewOptions.locator(":scope > summary").click();
  // Kişi adı gösterimi tr-TR baş harf düzenini kullanır; kaynak girdi aynen kalır.
  await expect(dialog.getByLabel("Kurgu Pdf Öğrencisi", { exact: true })).toBeChecked();
  await previewOptions.locator(":scope > summary").click();
  await expect(previewOptions).not.toHaveAttribute("open", "");
  await expect(dialog.locator(".pdf-page-controls").getByText("Sayfa 1 / 1", { exact: true })).toBeVisible();
  const searchPanel = dialog.getByRole("region", { name: "PDF metin araması" });
  await expect(searchPanel).not.toHaveAttribute("open", "");
  await openSearchPanel(dialog);
  const search = searchPanel.getByLabel("PDF metninde ara", { exact: true });
  await expect(search).toBeEnabled({ timeout: 30000 });
  await search.fill("öğrencisi");
  await expect(search).toBeFocused();
  const productionSearchBox = await search.boundingBox();
  expect(productionSearchBox).not.toBeNull();
  expect(productionSearchBox!.y).toBeGreaterThanOrEqual(0);
  expect(productionSearchBox!.y + productionSearchBox!.height).toBeLessThanOrEqual(844);
  await expect(searchPanel.locator(".pdf-search-status")).toContainText(/1 \/ \d+ eşleşme/);
  await expect(dialog.locator(".pdf-search-highlight.is-active")).toBeVisible();
  const selectedPdfText = await dialog.locator(".pdf-text-layer[data-pdf-text-layer=ready]").evaluate((layer) => {
    const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
    const node = walker.nextNode() as Text | null;
    if (!node || !node.data) return "";
    const range = document.createRange(); range.setStart(node, 0); range.setEnd(node, Math.min(8, node.data.length));
    const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
    return selection?.toString() ?? "";
  });
  expect(selectedPdfText.trim().length).toBeGreaterThan(0);
  await searchPanel.locator("summary").click();
  await expect(searchPanel).not.toHaveAttribute("open", "");
  await expect(dialog.locator("details.pdf-preview-secondary-actions")).not.toHaveAttribute("open", "");
  const mobileLayout = await dialog.evaluate((root) => {
    const body = root.querySelector<HTMLElement>(".pdf-preview-body")!;
    const viewport = root.querySelector<HTMLElement>(".pdf-canvas-viewport")!;
    const footer = root.querySelector<HTMLElement>("footer")!;
    const box = viewport.getBoundingClientRect();
    const bodyBox = body.getBoundingClientRect();
    const footerBox = footer.getBoundingClientRect();
    const visiblePageHeight = Math.max(0, Math.min(box.bottom, bodyBox.bottom, footerBox.top) - Math.max(box.top, bodyBox.top));
    const visibleFooterControls = Array.from(footer.querySelectorAll<HTMLElement>("button, details > summary"))
      .filter((element) => element.getClientRects().length > 0).length;
    return { visiblePageHeight, visibleFooterControls, dialogWidth: root.getBoundingClientRect().width };
  });
  expect(mobileLayout.dialogWidth).toBeLessThanOrEqual(390);
  expect(mobileLayout.visiblePageHeight).toBeGreaterThanOrEqual(280);
  expect(mobileLayout.visibleFooterControls).toBe(3);
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}/app-preview-390.png` });
  const downloadEvent = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
  await (await downloadEvent).saveAs(`${output}/app-classroom.pdf`);
  const pdfBytes = Array.from(await readFile(`${output}/app-classroom.pdf`));
  expect(pdfBytes).toEqual(await page.evaluate(async () => Array.from(new Uint8Array(await (window as any).pdfBlobs.at(-1).arrayBuffer()))));
  await dialog.getByRole("button", { name: "PDF önizlemesini kapat", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sınıf listesini indir", exact: true })).toBeEnabled();
});

test("kapsam değişimindeki başarısız üretim eski PDF'yi tekrar indirtmez", async ({ page }) => {
  test.setTimeout(60000);
  await page.evaluate(async () => {
    const { createSemanticTaggedPdf } = await import("/src/features/documents/semantic-tagged-pdf.ts");
    const { requestPdfDocument } = await import("/src/features/documents/pdf-preview-model.ts");
    const bytes = await createSemanticTaggedPdf({ title: "Kurgu Kaynak", nodes: [{ kind: "paragraph", text: "Kurgu eski kapsam" }] });
    void requestPdfDocument({ title: "Kurgu kaynak yarışı", fields: [{ id: "source", label: "Kaynak bölümü" }, { id: "failure", label: "Kurgu hata kapsamı" }], initial: { fields: ["source"] },
      async build(selection) { if (selection.fields.includes("failure")) throw new Error("Kurgu kaynak yeniden doğrulanamadı."); return { bytes, mimeType: "application/pdf", fileName: "kurgu.pdf" }; } });
  });
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  await dialog.locator(".pdf-preview-options > summary").click();
  await dialog.getByLabel("Kurgu hata kapsamı", { exact: true }).check();
  await expect(dialog.getByRole("alert")).toHaveText("Kurgu kaynak yeniden doğrulanamadı.");
  await expect(dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true })).toBeDisabled();
  await expect(dialog.locator("canvas")).toHaveCount(0);
});

test("geç kalan önceki kapsam üretimi son seçilen PDF'nin yerini alamaz", async ({ page }) => {
  await page.evaluate(async () => {
    const { createSemanticTaggedPdf } = await import("/src/features/documents/semantic-tagged-pdf.ts");
    const { requestPdfDocument } = await import("/src/features/documents/pdf-preview-model.ts");
    const bytes = await createSemanticTaggedPdf({ title: "Kurgu", nodes: [{ kind: "paragraph", text: "Kurgu" }] });
    void requestPdfDocument({ title: "Kurgu seçim yarışı", fields: [{ id: "source", label: "Temel kaynak" }, { id: "slow", label: "Bekleyen kaynak" }], initial: { fields: ["source"] },
      async build(selection) { if (selection.fields.includes("slow")) await new Promise<void>((resolve) => { (window as any).releaseSlowPdf = resolve; }); return { bytes, mimeType: "application/pdf", fileName: selection.fields.includes("slow") ? "eski-kapsam.pdf" : "son-kapsam.pdf" }; } });
  });
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible();
  await dialog.locator(".pdf-preview-options > summary").click();
  await dialog.getByLabel("Bekleyen kaynak", { exact: true }).check();
  await expect(dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true })).toBeDisabled();
  await expect.poll(() => page.evaluate(() => typeof (window as any).releaseSlowPdf)).toBe("function");
  await dialog.getByLabel("Bekleyen kaynak", { exact: true }).uncheck();
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible();
  await page.evaluate(() => (window as any).releaseSlowPdf());
  await expect(dialog.locator("footer")).toContainText("son-kapsam.pdf");
  const event = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
  expect((await event).suggestedFilename()).toBe("son-kapsam.pdf");
});

test("gerçek etkinlik şablonu çizim alanlarını korur ve yalnız dipnot için ek sayfa üretmez", async ({ page }) => {
  test.setTimeout(60000);
  await page.evaluate(async () => {
    const { renderActivityStudioPrintable } = await import("/src/features/activity-studio/printable-templates.ts");
    const { ACTIVITY_STUDIO_ITEMS } = await import("/src/features/activity-studio/activity-studio-model.ts");
    const { previewHtmlPrintDocument } = await import("/src/features/documents/html-document-pdf.ts");
    const item = ACTIVITY_STUDIO_ITEMS.find((entry) => entry.printableKind === "material-design")!;
    const document = renderActivityStudioPrintable(item, item.ageBands[0]);
    void previewHtmlPrintDocument({ ...document, title: item.title });
  });
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi" });
  await expect(dialog.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 30000 });
  await expect(dialog.locator(".pdf-page-controls").getByText("Sayfa 1 / 1", { exact: true })).toBeVisible();
  const event = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click(); await (await event).saveAs(`${output}/activity-template.pdf`);
  await page.screenshot({ path: `${output}/activity-template-preview.png` });
});
