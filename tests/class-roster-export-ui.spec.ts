import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
const production = process.env.CLASS_ROSTER_EXPORT_PRODUCTION === "1";
const artifactRoot = process.env.MAARIF_DOCUMENTS_OUTPUT_DIR ?? "output/class-roster-v5-2026-09-08";
const output = `${artifactRoot}/class-roster-ui/${production ? "production" : "development"}`;
const firstName = "Kurgu Işık Çınar", otherName = "Kurgu Duru Yıldız";
const excluded = { identity: "10000000146", occupation: "Kurgu Seramik Uzmanı", address: "Kurgu Dışa Alınmayacak Sokak" };

async function prepare(page: Page, width: number) {
  await mkdir(output, { recursive: true });
  await page.setViewportSize({ width, height: 844 });
  await page.clock.install({ time: new Date("2026-09-14T09:00:00.000Z") });
  await page.addInitScript(() => {
    const state = { calls: 0, pages: [] as unknown[], frame: null as HTMLIFrameElement | null,
      pngUrls: new Set<string>(), pdfBlobs: [] as Blob[] };
    (window as any).__rosterExportQa = state;
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL), append = Element.prototype.append;
    URL.createObjectURL = blob => { const url = create(blob); if (blob instanceof Blob) {
      if (blob.type === "image/png") state.pngUrls.add(url);
      if (blob.type === "application/pdf") state.pdfBlobs.push(blob);
    } return url; };
    URL.revokeObjectURL = url => { state.pngUrls.delete(url); revoke(url); };
    Element.prototype.append = function (...nodes: (Node | string)[]) {
      for (const node of nodes) if (node instanceof HTMLIFrameElement && node.dataset.pdfPrintStage) {
        state.frame = node; node.addEventListener("load", () => { const target = node.contentWindow as any;
          target.print = () => { state.calls += 1; state.pages = [...target.document.querySelectorAll(".pdf-print-page")].map((section: HTMLElement) => ({
            width: Number(section.dataset.widthPoints), height: Number(section.dataset.heightPoints),
            alt: section.querySelector("img")!.alt, rasterWidth: section.querySelector("img")!.naturalWidth,
          })); };
        });
      }
      return append.apply(this, nodes);
    };
  });
}

const fieldSet = (preview: Locator) => preview.locator("fieldset").filter({ has: preview.page().locator("legend").filter({ hasText: /^Belgeye alınacak alanlar/ }) });
const studentsSet = (preview: Locator) => preview.locator("fieldset").filter({ has: preview.page().locator("legend").filter({ hasText: /^Öğrenci kapsamı$/ }) });
async function openGroup(preview: Locator, name: string) {
  const group = preview.locator("details.pdf-field-group").filter({ has: preview.page().locator("summary").filter({ hasText: new RegExp(`^${name}`) }) });
  if (await group.getAttribute("open") === null) await group.locator("summary").click();
}
async function openSecondaryActions(preview: Locator) {
  const menu = preview.locator("details.pdf-preview-secondary-actions");
  if (await menu.getAttribute("open") === null) await menu.locator("summary").click();
}
async function ready(preview: Locator) {
  await expect(preview.getByRole("button", { name: "Bu PDF'yi indir", exact: true })).toBeEnabled({ timeout: 60000 });
  await expect(preview.locator("canvas[data-pdf-rendered=true]").first()).toBeAttached({ timeout: 60000 });
}
async function download(page: Page, preview: Locator, format: "pdf" | "xlsx", name: string) {
  await ready(preview); const pending = page.waitForEvent("download");
  if (format === "xlsx") await openSecondaryActions(preview);
  await preview.getByRole("button", { name: format === "pdf" ? "Bu PDF'yi indir" : "Excel'e çıkar", exact: true }).click();
  const file = await pending, path = `${output}/${name}.${format}`; await file.saveAs(path);
  expect(file.suggestedFilename()).toMatch(format === "pdf" ? /\.pdf$/u : /\.xlsx$/u);
  return { path, bytes: await readFile(path) };
}
function inspectPdf(path: string, render = false) {
  const code = "import fitz,json,sys,pathlib; p=pathlib.Path(sys.argv[1]); d=fitz.open(p); pages=[{'width':page.rect.width,'height':page.rect.height,'text':page.get_text()} for page in d]; [(page.get_pixmap(matrix=fitz.Matrix(1,1)).save(p.with_name(p.stem+'-page-'+str(i+1)+'.png'))) for i,page in enumerate(d)] if sys.argv[2]=='1' else None; print(json.dumps({'pages':pages,'metadata':d.metadata},ensure_ascii=True))";
  return JSON.parse(execFileSync("python", ["-c", code, path, render ? "1" : "0"], { encoding: "utf8" })) as { pages: { width: number; height: number; text: string }[]; metadata: Record<string, unknown> };
}
function inspectXlsx(bytes: Buffer) {
  const workbook = XLSX.read(bytes, { type: "buffer", cellFormula: true, cellStyles: true });
  const values = workbook.SheetNames.flatMap(name => XLSX.utils.sheet_to_json(workbook.Sheets[name]!, { header: 1, defval: "", raw: true }) as unknown[][]);
  return { workbook, values, text: JSON.stringify({ values, properties: workbook.Props, custom: workbook.Custprops }) };
}
function xlsxPackageText(bytes: Buffer, path: string) {
  const archive = XLSX.CFB.read(bytes, { type: "array" });
  const entry = XLSX.CFB.find(archive, `Root Entry/${path}`);
  expect(entry?.content, `${path} XLSX paketinde bulunmalı`).toBeTruthy();
  return new TextDecoder("utf-8").decode(entry!.content);
}
const pdfSearchText = (pdf: ReturnType<typeof inspectPdf>) => `${pdf.pages.map(p => p.text).join(" ").replace(/\s+/gu, " ")} ${JSON.stringify(pdf.metadata)}`;
const folded = (value: string) => value.toLocaleLowerCase("tr-TR");
async function assertOutputsDisabled(preview: Locator) {
  for (const name of ["Yazdır", "Excel'e çıkar", "Bu PDF'yi indir", "Bu PDF'yi paylaş"]) await expect(preview.getByRole("button", { name, exact: true })).toBeDisabled();
}

async function verifySelection(page: Page, preview: Locator, name: string, width: number) {
  await ready(preview);
  await expect(fieldSet(preview).locator('input[type="checkbox"]')).toHaveCount(20);
  await expect(fieldSet(preview).locator('input[type="checkbox"]:checked')).toHaveCount(20);
  const full = await download(page, preview, "pdf", `${name}-all-fields`), fullPdf = inspectPdf(full.path, true);
  const fullXlsx = await download(page, preview, "xlsx", `${name}-all-fields`), fullSpreadsheet = inspectXlsx(fullXlsx.bytes);
  const fullText = pdfSearchText(fullPdf);
  expect(fullText).toContain(excluded.identity); expect(fullText).toContain(excluded.address);
  expect(folded(fullText)).toContain(folded(excluded.occupation));
  expect(fullSpreadsheet.values[6]).toHaveLength(20);
  for (const value of Object.values(excluded)) expect(folded(fullSpreadsheet.text)).toContain(folded(value));
  if (width === 320) { expect(folded(fullText)).toContain("son_adres_kurgu"); expect(folded(fullSpreadsheet.text)).toContain("son_adres_kurgu"); }
  await fieldSet(preview).scrollIntoViewIfNeeded(); await page.screenshot({ path: `${output}/${name}-default-fields-${width}.png` });
  await openGroup(preview, "Anne"); await fieldSet(preview).getByRole("checkbox", { name: "Anne mesleği", exact: true }).uncheck();
  await openGroup(preview, "İletişim ve adres"); await fieldSet(preview).getByRole("checkbox", { name: "Ev adresi", exact: true }).uncheck();
  await fieldSet(preview).getByRole("checkbox", { name: "T.C. kimlik numarası", exact: true }).uncheck();
  await expect(fieldSet(preview).locator('input[type="checkbox"]:checked')).toHaveCount(17);
  const omittedPdf = await download(page, preview, "pdf", `${name}-omitted`), omittedXlsx = await download(page, preview, "xlsx", `${name}-omitted`);
  const pdfEvidence = inspectPdf(omittedPdf.path), pdfText = pdfSearchText(pdfEvidence), spreadsheet = inspectXlsx(omittedXlsx.bytes);
  for (const value of [excluded.identity, excluded.address, excluded.occupation, "T.C. kimlik no", "T.C. kimlik numarası", "Ev adresi", "Anne mesleği"]) {
    expect(folded(pdfText)).not.toContain(folded(value)); expect(folded(spreadsheet.text)).not.toContain(folded(value));
  }
  expect(spreadsheet.values.some(row => row.length === 17)).toBe(true);
  const compactPending = page.waitForEvent("download");
  await openSecondaryActions(preview);
  await preview.getByRole("button", { name: "Kısa iletişim baskısı", exact: true }).click();
  const compactDownload = await compactPending;
  const compactPath = `${output}/${name}-omitted-compact.xlsx`;
  await compactDownload.saveAs(compactPath);
  expect(compactDownload.suggestedFilename()).toMatch(/Kisa_Iletisim.*\.xlsx$/u);
  const compactBytes = await readFile(compactPath), compactWorkbook = XLSX.read(compactBytes, { type: "buffer", cellStyles: true });
  expect(compactWorkbook.SheetNames).toEqual(["Sınıf listesi", "Kısa iletişim baskısı"]);
  const fullDataRows = XLSX.utils.sheet_to_json(compactWorkbook.Sheets["Sınıf listesi"]!, { header: 1, defval: "", raw: true });
  const defaultFullRows = XLSX.utils.sheet_to_json(spreadsheet.workbook.Sheets["Sınıf listesi"]!, { header: 1, defval: "", raw: true });
  expect(JSON.stringify(fullDataRows)).toBe(JSON.stringify(defaultFullRows));
  const compactText = JSON.stringify(compactWorkbook.SheetNames.flatMap(sheetName =>
    XLSX.utils.sheet_to_json(compactWorkbook.Sheets[sheetName]!, { header: 1, defval: "", raw: true })));
  for (const value of [excluded.identity, excluded.address, excluded.occupation, "T.C. kimlik numarası", "Ev adresi", "Anne mesleği"]) {
    expect(folded(compactText)).not.toContain(folded(value));
  }
  expect(compactText).toContain(firstName);
  expect(compactText).toContain(otherName);
  expect(xlsxPackageText(compactBytes, "xl/workbook.xml")).toMatch(/<workbookView\b[^>]*activeTab="1"/u);

  await preview.getByRole("button", { name: "Alan seçimini temizle", exact: true }).click();
  await assertOutputsDisabled(preview);
  await fieldSet(preview).getByRole("checkbox", { name: "Okul numarası", exact: true }).check();
  await fieldSet(preview).getByRole("checkbox", { name: "Adı soyadı", exact: true }).check();
  await studentsSet(preview).getByRole("button", { name: "Seçimi temizle", exact: true }).click();
  await assertOutputsDisabled(preview);
  await studentsSet(preview).getByRole("checkbox", { name: firstName, exact: true }).check();
  const singlePdf = await download(page, preview, "pdf", `${name}-single-student`), singleXlsx = await download(page, preview, "xlsx", `${name}-single-student`);
  const singlePdfEvidence = inspectPdf(singlePdf.path, true), singleSpreadsheet = inspectXlsx(singleXlsx.bytes);
  expect(singleSpreadsheet.values.slice(6)).toEqual([["Okul numarası", "Adı soyadı"], ["0012", firstName]]);
  expect(singleSpreadsheet.workbook.SheetNames).toHaveLength(1);
  const sheet = singleSpreadsheet.workbook.Sheets[singleSpreadsheet.workbook.SheetNames[0]!]!;
  expect(sheet.A8.t).toBe("s"); expect(sheet.A8.v).toBe("0012");
  for (const cell of Object.values(sheet)) if (cell && typeof cell === "object") expect(cell).not.toHaveProperty("f");
  for (const value of [otherName, "0013", excluded.identity, excluded.occupation, excluded.address]) {
    expect(folded(pdfSearchText(singlePdfEvidence))).not.toContain(folded(value)); expect(folded(singleSpreadsheet.text)).not.toContain(folded(value));
  }
  expect(singlePdfEvidence.pages.map(p => p.text).join(" ")).toMatch(/Kurgu\s+Işık\s+Çınar/u);
  const previousCalls = await page.evaluate(() => (window as any).__rosterExportQa.calls);
  await preview.getByRole("button", { name: "Yazdır", exact: true }).click();
  await expect(preview.locator("footer [role=status]")).toContainText("Yazdırma penceresi açıldı", { timeout: 60000 });
  const print = await page.evaluate(async () => { const s = (window as any).__rosterExportQa;
    return { calls: s.calls, pages: s.pages, bytes: Array.from(new Uint8Array(await s.pdfBlobs.at(-1).arrayBuffer())) }; });
  expect(print.calls).toBe(previousCalls + 1); expect(print.pages).toHaveLength(singlePdfEvidence.pages.length);
  expect(createHash("sha256").update(Buffer.from(print.bytes)).digest("hex")).toBe(createHash("sha256").update(singlePdf.bytes).digest("hex"));
  for (const [index, p] of print.pages.entries()) { expect(p.width).toBeCloseTo(singlePdfEvidence.pages[index]!.width, 2); expect(p.height).toBeCloseTo(singlePdfEvidence.pages[index]!.height, 2); expect(p.rasterWidth).toBe(Math.ceil(p.width * 180 / 72)); }
  await page.evaluate(() => (window as any).__rosterExportQa.frame.contentWindow.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("iframe[data-pdf-print-stage]")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__rosterExportQa.pngUrls.size)).toBe(0);
  for (const button of await preview.locator("footer button").all()) { const b = await button.boundingBox(); expect(b).not.toBeNull(); expect(b!.width).toBeGreaterThanOrEqual(44); expect(b!.height).toBeGreaterThanOrEqual(44); expect(b!.x).toBeGreaterThanOrEqual(0); expect(b!.x + b!.width).toBeLessThanOrEqual(width + 1); }
  expect(await preview.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${output}/${name}-selection-and-actions-${width}.png` });
  await preview.getByRole("combobox", { name: "Hazır şablon", exact: true }).selectOption("emergency-card");
  await expect(fieldSet(preview).getByRole("checkbox", { name: "Acil sağlık bilgileri (özel)", exact: true })).not.toBeChecked();
  await expect(preview.getByRole("button", { name: "Excel'e çıkar", exact: true })).toHaveCount(0);
  await preview.getByRole("combobox", { name: "Hazır şablon", exact: true }).selectOption("contact-list");
  await expect(fieldSet(preview).locator('input[type="checkbox"]:checked')).toHaveCount(20);
  await ready(preview);
  await writeFile(`${output}/${name}-receipt.json`, JSON.stringify({ syntheticOnly: true, production, viewportWidth: width,
    allFields: 20, omittedFields: 3, selectedColumns: ["Okul numarası", "Adı soyadı"], selectedStudents: 1,
    schoolNumberTextAndLeadingZeros: true, omittedValuesAbsentInPdfAndXlsx: true, otherStudentAbsentIncludingMetadata: true,
    printCalls: print.calls - previousCalls, printPages: print.pages.length, samePreviewDownloadPrintBytes: true,
    iframeAndPngUrlsCleaned: true, minActionPixels: 44, horizontalOverflow: false, emergencyCareDefaultsOff: true,
    allFieldsRestoredOnContactTemplate: true, fullPdfPages: fullPdf.pages.length, singlePdfPages: singlePdfEvidence.pages.length,
    physicalPrinterTested: false,
  }, null, 2));
}

test("320px: uzun kurgu kayıtlarında yirmi alan, tekil kapsam ve PDF/Excel/Yazdır aynı seçimi korur", async ({ page }) => {
  test.skip(production, "320 px uzun veri fikstürü yalnız geliştirme ortamında kaynak modülü kullanır; üretim senaryosu gerçek UI ile ayrı çalışır.");
  await prepare(page, 320); await page.goto("/tests/pdf-preview-fixture.html");
  await expect(page.getByRole("button", { name: "Kurgu kaynağı değiştir" })).toBeVisible();
  await page.evaluate(async ({ firstName, otherName, excluded }) => {
    const { classRosterFixture } = await import("/tests/fixtures/class-roster-fixture.mjs");
    const { createClassRosterPdfDocument } = await import("/src/features/classroom/class-roster-document.ts");
    const { requestPdfPreview } = await import("/src/features/documents/pdf-preview-model.ts");
    const input = classRosterFixture(2), first = input.snapshot.students[0], other = input.snapshot.students[1];
    first.displayName = firstName; first.optionalCode = "0012"; other.displayName = otherName; other.optionalCode = "0013";
    first.contacts[0].occupation = excluded.occupation; first.careDetails.homeAddress = `${excluded.address} No: 12; ${"Kurgu binanın arka kapısı ve okul kapısı karşısı. ".repeat(8)}`.slice(0, 460) + " SON_ADRES_KURGU";
    first.contacts[2].relationship = "Kurgu aile yakını, okul çıkışında anne tarafından bildirilen teslim kişisi";
    first.contacts[2].name = "Kurgu Uzunoğulları Çınaroğulları İpek Deniz";
    const file = await createClassRosterPdfDocument(input); requestPdfPreview(file);
  }, { firstName, otherName, excluded });
  await verifySelection(page, page.getByRole("dialog", { name: "PDF önizlemesi", exact: true }), "fixture-320", 320);
});

test("390px: gerçek Sınıfım kurulumu ve iki çocuk kaydı sonrası seçilen kapsam dosyalara eksiksiz uygulanır", async ({ page }) => {
  const productionSourceRequests: string[] = [];
  if (production) page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/src/") || path.startsWith("/tests/")) productionSourceRequests.push(path); });
  await prepare(page, 390); await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Anaokulu"); await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu İletişim Sınıfı"); await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click(); await expect(setup).toBeHidden();
  if (production) {
    await expect.poll(() => page.evaluate(() => Boolean((window as any).__maarifosPwaStatus?.offlineReady)), { timeout: 60000 }).toBe(true);
    await page.context().setOffline(true); await page.reload({ waitUntil: "domcontentloaded" });
  }
  for (const [index, name] of [firstName, otherName].entries()) {
    await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click(); const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
    await add.getByLabel("Çocuğun adı", { exact: true }).fill(name);
    if (index === 0) { await add.getByRole("button", { name: "Tek metin olarak düzenle", exact: true }).click(); await add.getByLabel("Ev adresi", { exact: true }).fill(`${excluded.address} No: 12 Acıpayam Denizli`); await add.getByLabel("Ev adresi", { exact: true }).press("Tab"); }
    await add.locator("details.student-optional-details > summary").click();
    await add.getByLabel("Öğrenci numarası", { exact: true }).fill(index ? "0013" : "0012");
    if (index === 0) {
      await add.getByLabel("T.C. kimlik numarası", { exact: true }).fill(excluded.identity);
      await add.getByLabel(/^Doğum tarihi/u).fill("2021-01-12");
      await add.getByLabel("Yakınlığı", { exact: true }).fill("Anne");
      await add.getByLabel("Yakının adı ve soyadı", { exact: true }).fill("Kurgu Anne Çınar");
      await add.getByLabel("Yakının cep telefonu", { exact: true }).fill("05320000001");
    }
    await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click(); await expect(add).toBeHidden();
  }
  await page.locator("button.simple-student-list__profile").filter({ hasText: firstName }).click();
  const profile = page.getByRole("dialog", { name: `${firstName} profili`, exact: true });
  await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click(); await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
  await profile.getByRole("region", { name: "Anne bilgileri", exact: true }).getByLabel("Mesleği", { exact: true }).fill(excluded.occupation);
  await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click(); await expect(profile).toBeHidden();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("button.simple-student-list__profile").filter({ hasText: firstName })).toBeVisible();
  await expect(page.locator("button.simple-student-list__profile").filter({ hasText: otherName })).toBeVisible();
  await page.getByText("Sınıf işlemleri", { exact: true }).click();
  await page.getByRole("button", { name: "Sınıf listesini indir", exact: true }).click();
  await verifySelection(page, page.getByRole("dialog", { name: "PDF önizlemesi", exact: true }), "actual-390", 390);
  expect(productionSourceRequests).toEqual([]);
});
