import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import * as XLSX from "xlsx";

const production = process.env.GROWTH_PRODUCTION === "1";
const artifactRoot = (process.env.MAARIF_DOCUMENTS_OUTPUT_DIR?.trim() ||
  "output/export-fixes-2026-09-09").replace(/[\\/]+$/u, "");
const output = `${artifactRoot}/growth/ui/${production ? "production" : "development"}`;
const children = ["Kurgu Ada", "Kurgu Bora"] as const;

test.describe.configure({ mode: "serial", timeout: 240_000 });

const runtimeProblems = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const problems: string[] = [];
  runtimeProblems.set(page, problems);
  page.on("pageerror", (error) => problems.push(`${error.name}: ${error.message}`));
  if (production) {
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/src/")) {
        problems.push(`Üretim kaynak isteği: ${request.url()}`);
      }
    });
  }
});
test.afterEach(async ({ page }) => {
  expect(runtimeProblems.get(page) ?? []).toEqual([]);
});

async function setup(page: Page, names: readonly string[] = children) {
  await mkdir(output, { recursive: true });
  await page.clock.install({ time: new Date("2026-09-18T09:00:00.000Z") });
  await page.goto("/classroom?native=1");
  const setupDialog = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setupDialog.getByLabel("Okul adı").fill("Kurgu Boy Kilo Anaokulu");
  await setupDialog.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setupDialog.getByLabel("Sınıf adı").fill("Kurgu Ölçüm Sınıfı");
  await setupDialog.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setupDialog.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setupDialog).toBeHidden();
  for (const name of names) {
    await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
    const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
    await add.getByLabel("Çocuğun adı", { exact: true }).fill(name);
    await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
    await expect(add).toBeHidden();
  }
  if (production) {
    await expect.poll(() => page.evaluate(() => Boolean(
      (window as Window & { __maarifosPwaStatus?: { offlineReady?: boolean } })
        .__maarifosPwaStatus?.offlineReady,
    )), { timeout: 90_000 }).toBe(true);
    await page.context().setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("main", { name: "Sınıfım", exact: true })).toBeVisible();
  }
}

async function openGrowth(page: Page) {
  await page.getByRole("region", { name: "Sınıf yönetimi işleri", exact: true })
    .getByRole("button").first().click();
  const dialog = page.getByRole("dialog", { name: "Sınıf yönetimi", exact: true });
  await dialog.getByLabel("Sınıf yönetimi alanı", { exact: true }).selectOption("growth");
  const workspace = dialog.getByRole("region", { name: "Boy–kilo takibi", exact: true });
  await expect(workspace).toBeVisible();
  await expect(workspace.getByText("Yerel · çevrim dışı", { exact: true })).toBeVisible();
  return { dialog, workspace };
}

async function settingsKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => new Promise<string[]>((resolve, reject) => {
    const request = indexedDB.open("maarifos-local");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("settings", "readonly");
      const keys = transaction.objectStore("settings").getAllKeys();
      keys.onerror = () => reject(keys.error);
      transaction.oncomplete = () => {
        database.close();
        resolve(keys.result.map(String));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error);
      };
    };
  }));
}

async function openStudent(workspace: Locator, name: string) {
  await workspace.getByRole("button", { name: `${name} ölçümünü aç`, exact: true }).click();
  const editor = workspace.getByRole("region", { name: `${name} ölçüm girişi`, exact: true });
  await expect(editor).toBeVisible();
  return editor;
}

async function fillMeasurement(editor: Locator, values: {
  height: string;
  weight: string;
  heightDate: string;
  weightDate: string;
  weightSource?: "school" | "family" | "document";
  next?: boolean;
}) {
  await editor.getByLabel("Boy değeri", { exact: true }).fill(values.height);
  await editor.getByLabel("Boy ölçüm tarihi", { exact: true }).fill(values.heightDate);
  await editor.getByLabel("Kilo değeri", { exact: true }).fill(values.weight);
  await editor.getByLabel("Kilo ölçüm tarihi", { exact: true }).fill(values.weightDate);
  if (values.weightSource) {
    await editor.getByLabel("Kilo kaynağı", { exact: true }).selectOption(values.weightSource);
  }
  const action = editor.getByRole("button", {
    name: values.next ? "Kaydet ve sıradakine geç" : "Kaydet",
    exact: true,
  });
  const box = await action.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await action.click();
}

async function expectNoGrowthOverflow(workspace: Locator, width: number) {
  const layout = await workspace.evaluate((element) => {
    const root = element.getBoundingClientRect();
    const offenders = [...element.querySelectorAll("*")].flatMap((child) => {
      const box = child.getBoundingClientRect();
      return (box.width > 0 && (box.right > root.right + 1 || box.left < root.left - 1)) || child.scrollWidth > child.clientWidth + 1
        ? [{ tag: child.tagName, className: child.getAttribute("class"), text: child.textContent?.trim().slice(0, 80), left: box.left, right: box.right, clientWidth: child.clientWidth, scrollWidth: child.scrollWidth }]
        : [];
    }).slice(0, 8);
    return { clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, left: root.left, right: root.right, offenders };
  });
  expect(layout.scrollWidth, `${width}px taşma: ${JSON.stringify(layout)}`)
    .toBeLessThanOrEqual(layout.clientWidth + 1);
  const controls = workspace.locator("button:visible, input:visible, select:visible");
  for (let index = 0; index < await controls.count(); index += 1) {
    const box = await controls.nth(index).boundingBox();
    if (box) expect.soft(box.height, `${width}px kontrol ${index + 1}`).toBeGreaterThanOrEqual(44);
  }
}

test("MR097 üretim/IDB: 320–390 px çevrimdışı seri kayıt, ayrı tarihler, grafikler ve 4,75 cm eşleşme yeniden açılır", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await setup(page);
  await page.clock.setFixedTime(new Date("2026-09-20T09:00:00.000Z"));
  await page.reload({ waitUntil: "domcontentloaded" });
  const baseline = (await settingsKeys(page)).length;
  let { workspace } = await openGrowth(page);

  await expect(workspace.getByRole("button", { name: /Mart 2027/u })).toHaveAttribute("aria-pressed", "false");
  let editor = await openStudent(workspace, children[0]);
  await fillMeasurement(editor, {
    height: "110,0", weight: "18,000", heightDate: "2026-09-19",
    weightDate: "2026-09-20", weightSource: "family", next: true,
  });
  editor = workspace.getByRole("region", { name: `${children[1]} ölçüm girişi`, exact: true });
  await expect(editor).toBeVisible();
  await fillMeasurement(editor, {
    height: "112,0", weight: "19,000", heightDate: "2026-09-19",
    weightDate: "2026-09-20",
  });
  await expect.poll(async () => (await settingsKeys(page)).length).toBe(baseline + 8);
  await expectNoGrowthOverflow(workspace, 320);
  await page.screenshot({ path: `${output}/entry-320.png`, fullPage: true });
  await workspace.getByRole("button", { name: "Çıktılar", exact: true }).click();
  const mobilePeriod = workspace.getByRole("combobox", { name: "Baskı dönemi", exact: true });
  await expect(mobilePeriod).toHaveValue("");
  await expect(mobilePeriod.locator("option")).toHaveCount(5);
  await expectNoGrowthOverflow(workspace, 320);
  await page.screenshot({ path: `${output}/outputs-period-filter-320.png`, fullPage: true });

  await page.setViewportSize({ width: 360, height: 844 });
  await workspace.getByRole("button", { name: "Çocuk görünümü", exact: true }).click();
  await expect(workspace.getByRole("img", { name: /Kurgu Ada · Boy.*3 eksik dönem sıfır olarak çizilmedi/u })).toBeVisible();
  await expect(workspace.getByText("19.09.2026", { exact: true })).toBeVisible();
  await expect(workspace.getByText("20.09.2026", { exact: true })).toBeVisible();
  await workspace.getByText("Kilo geçmişi · 1", { exact: true }).click();
  await expect(workspace.locator(".growth-history").filter({ hasText: "Kilo geçmişi" })
    .getByText(/Aile bildirdi/u)).toBeVisible();
  await expectNoGrowthOverflow(workspace, 360);
  await page.screenshot({ path: `${output}/student-independent-dates-360.png`, fullPage: true });

  await page.clock.setFixedTime(new Date("2027-06-20T09:00:00.000Z"));
  await page.reload({ waitUntil: "domcontentloaded" });
  ({ workspace } = await openGrowth(page));
  editor = await openStudent(workspace, children[0]);
  await fillMeasurement(editor, {
    height: "115,0", weight: "20,000", heightDate: "2027-06-18",
    weightDate: "2027-06-19", next: true,
  });
  editor = workspace.getByRole("region", { name: `${children[1]} ölçüm girişi`, exact: true });
  await expect(editor).toBeVisible();
  await fillMeasurement(editor, {
    height: "116,5", weight: "20,300", heightDate: "2027-06-18",
    weightDate: "2027-06-19",
  });
  await expect.poll(async () => (await settingsKeys(page)).length).toBe(baseline + 16);

  await page.setViewportSize({ width: 390, height: 844 });
  await workspace.getByRole("button", { name: "Sınıf özeti", exact: true }).click();
  const matched = workspace.getByRole("region", { name: "Aynı çocuklarla sınıf değişimi", exact: true });
  await expect(matched).toContainText("+4,75 cm · eşleşen n=2");
  await expect(matched).toContainText("+1,65 kg · eşleşen n=2");
  await expect(workspace.getByRole("img", { name: /Sınıf boy ortalamaları/u })).toBeVisible();
  await expect(workspace.getByText(/Boy kaynakları: okul 2/u).last()).toBeVisible();
  await expectNoGrowthOverflow(workspace, 390);
  await page.screenshot({ path: `${output}/class-matched-change-390.png`, fullPage: true });

  await page.reload({ waitUntil: "domcontentloaded" });
  ({ workspace } = await openGrowth(page));
  await expect(workspace.getByRole("button", { name: `${children[0]} ölçümünü aç`, exact: true })).toContainText("115 cm");
  await expect(workspace.getByRole("button", { name: `${children[1]} ölçümünü aç`, exact: true })).toContainText("116,5 cm");
  if (production) expect(await page.evaluate(() => navigator.onLine)).toBe(false);
});

test("MR097 gerçek IndexedDB: iki sekmenin eski seçim başı ikinci yazmayı reddeder", async ({ page, context }) => {
  await setup(page, [children[0]]);
  const beforeInitial = (await settingsKeys(page)).length;
  let opened = await openGrowth(page);
  let editor = await openStudent(opened.workspace, children[0]);
  await fillMeasurement(editor, {
    height: "112,5", weight: "", heightDate: "2026-09-18", weightDate: "2026-09-18",
  });
  await expect.poll(async () => (await settingsKeys(page)).length).toBe(beforeInitial + 2);
  const afterInitial = (await settingsKeys(page)).length;
  await page.clock.setFixedTime(new Date("2026-09-18T09:05:00.000Z"));

  const second = await context.newPage();
  const secondProblems: string[] = [];
  second.on("pageerror", (error) => secondProblems.push(error.message));
  await second.clock.setFixedTime(new Date("2026-09-18T09:05:00.000Z"));
  await second.goto("/classroom?native=1");
  const firstGrowth = opened;
  const secondGrowth = await openGrowth(second);
  const firstEditor = await openStudent(firstGrowth.workspace, children[0]);
  const secondEditor = await openStudent(secondGrowth.workspace, children[0]);
  await firstEditor.getByLabel("Boy değeri", { exact: true }).fill("112,6");
  await secondEditor.getByLabel("Boy değeri", { exact: true }).fill("112,7");
  await firstEditor.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect.poll(async () => (await settingsKeys(page)).length).toBe(afterInitial + 2);
  await secondEditor.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(secondEditor.getByRole("alert")).toContainText("başka bir sekmede değişti");
  expect((await settingsKeys(page)).length).toBe(afterInitial + 2);
  expect(secondProblems).toEqual([]);
  await second.close();
});

test("MR097 üretim çıktıları: üç gerçek PDF önizlemesi, aynı bayt indirme ve önizlemeli XLSX içe aktarım çevrimdışıdır", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.clock.setFixedTime(new Date("2026-09-20T09:00:00.000Z"));
  await page.reload({ waitUntil: "domcontentloaded" });
  const baseline = (await settingsKeys(page)).length;
  let { workspace } = await openGrowth(page);
  const editor = await openStudent(workspace, children[0]);
  await fillMeasurement(editor, {
    height: "112,5", weight: "19,400", heightDate: "2026-09-19",
    weightDate: "2026-09-20", weightSource: "family",
  });
  await expect.poll(async () => (await settingsKeys(page)).length).toBe(baseline + 4);
  const sentinelEditor = await openStudent(workspace, children[1]);
  await fillMeasurement(sentinelEditor, {
    height: "121,7", weight: "22,345", heightDate: "2026-09-18",
    weightDate: "2026-09-18",
  });
  await expect.poll(async () => (await settingsKeys(page)).length).toBe(baseline + 8);
  await workspace.getByRole("button", { name: "Çıktılar", exact: true }).click();
  const exportPeriod = workspace.getByRole("combobox", { name: "Baskı dönemi", exact: true });
  await expect(exportPeriod).toHaveValue("");
  await exportPeriod.selectOption("2026-09");
  await expect(exportPeriod).toHaveValue("2026-09");
  await workspace.getByLabel("Veli belgesi öğretmen açıklaması (isteğe bağlı)", { exact: true })
    .fill("Kurgu ölçümleri gerçek tarihler ve kaynaklarıyla paylaşılmıştır.");
  await page.evaluate(() => {
    const original = URL.createObjectURL.bind(URL);
    (window as Window & { __growthPreviewBlob?: Blob }).__growthPreviewBlob = undefined;
    URL.createObjectURL = (value: Blob | MediaSource) => {
      if (value instanceof Blob && value.type === "application/pdf") {
        (window as Window & { __growthPreviewBlob?: Blob }).__growthPreviewBlob ??= value;
      }
      return original(value);
    };
  });
  await workspace.getByRole("button", { name: "Bireysel PDF önizle", exact: true }).click();
  let preview = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  await expect(preview.locator("canvas[data-pdf-rendered=true]").first()).toBeVisible({ timeout: 60_000 });
  await expect(preview.getByLabel(children[0], { exact: true })).toBeChecked();
  await expect(preview.getByLabel(children[1], { exact: true })).not.toBeChecked();
  const previewHash = await page.evaluate(async () => {
    const blob = (window as Window & { __growthPreviewBlob?: Blob }).__growthPreviewBlob!;
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()))]
      .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  });
  const downloadEvent = page.waitForEvent("download");
  await preview.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
  const individualPath = `${output}/individual-growth.pdf`;
  await (await downloadEvent).saveAs(individualPath);
  expect(createHash("sha256").update(await readFile(individualPath)).digest("hex")).toBe(previewHash);
  await page.screenshot({ path: `${output}/individual-pdf-preview.png` });
  await preview.getByRole("button", { name: "PDF önizlemesini kapat", exact: true }).click();

  for (const [button, file] of [
    ["Sınıf çizelgesi PDF", "class-pdf-preview.png"],
    ["Boş çizelge PDF", "blank-pdf-preview.png"],
  ] as const) {
    await workspace.getByRole("button", { name: button, exact: true }).click();
    preview = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
    await expect(preview.locator("canvas[data-pdf-rendered=true]").first()).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: `${output}/${file}` });
    await preview.getByRole("button", { name: "PDF önizlemesini kapat", exact: true }).click();
  }

  const xlsxScope = workspace.getByRole("combobox", { name: "XLSX kapsamı", exact: true });
  await expect(xlsxScope).toHaveValue("class");
  await xlsxScope.selectOption("individual");
  const spreadsheetDownload = page.waitForEvent("download");
  await workspace.getByRole("button", { name: "XLSX dışa aktar", exact: true }).click();
  const spreadsheetPath = `${output}/growth-export.xlsx`;
  const spreadsheetFile = await spreadsheetDownload;
  expect(spreadsheetFile.suggestedFilename()).toMatch(/Eylul_2026\.xlsx$/u);
  await spreadsheetFile.saveAs(spreadsheetPath);
  const spreadsheetBytes = await readFile(spreadsheetPath);
  expect(spreadsheetBytes.subarray(0, 2).toString()).toBe("PK");
  const spreadsheet = XLSX.read(spreadsheetBytes, { type: "buffer", cellDates: true });
  const spreadsheetValues = spreadsheet.SheetNames.flatMap((name) => Object.entries(spreadsheet.Sheets[name])
    .filter(([address]) => !address.startsWith("!"))
    .map(([, cell]) => cell.v));
  expect(spreadsheetValues).toContain(children[0]);
  expect(spreadsheetValues).not.toContain(children[1]);
  expect(spreadsheetValues).not.toContain(22_345);
  await expect(workspace.getByText(/Aktarılabilir veri önizlemesi · Seçili çocuk · Kurgu Ada · Eylül 2026/u)).toBeVisible();
  await workspace.getByText("Ölçüm dosyasını önizleyerek içe aktar", { exact: true }).click();
  await workspace.getByLabel("Boy-kilo ölçüm dosyası", { exact: true }).setInputFiles(spreadsheetPath);
  await expect(workspace.getByRole("button", { name: "Ölçümleri önizle", exact: true })).toBeVisible();
  await workspace.getByRole("button", { name: "Ölçümleri önizle", exact: true }).click();
  await expect(workspace.getByRole("status").filter({ hasText: "2 satır · 2 kaydedilebilir" })).toBeVisible();
  await workspace.getByRole("button", { name: "Hatasızları seç", exact: true }).click();
  await workspace.getByRole("button", { name: "2 ölçümü atomik kaydet", exact: true }).click();
  await expect.poll(async () => (await settingsKeys(page)).length).toBe(baseline + 12);
  await workspace.getByRole("button", { name: "Çocuk görünümü", exact: true }).click();
  await workspace.getByText("Boy geçmişi · 2", { exact: true }).click();
  await expect(workspace.getByText("Geçerli sonuç", { exact: true })).toHaveCount(2);
  await page.screenshot({ path: `${output}/xlsx-import-history.png`, fullPage: true });
  if (production) expect(await page.evaluate(() => navigator.onLine)).toBe(false);
});
