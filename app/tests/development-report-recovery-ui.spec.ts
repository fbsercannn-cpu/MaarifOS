import { expect, test, type Page } from "@playwright/test";
import { setup, installCivilClock, openReport, readRecords, evaluation, observation } from "./helpers/development-workspace-ui";

test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 390, height: 844 } });

async function changeRawSource(page: Page, suffix: string) {
  await page.evaluate(async (text) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("maarifos-local");
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("observations", "readwrite");
        const records = tx.objectStore("observations");
        const read = records.getAll();
        read.onsuccess = () => {
          const current = read.result.find((item: Record<string, unknown>) => !item.deletedAt);
          records.put({ ...current, rawText: current.rawText + text, updatedAt: new Date().toISOString() });
        };
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  }, suffix);
}

test("kota hatasında arka plana geçiş metni gizler; güvenli yeniden bağlanma kaydedilmemiş öğretmen metnini korur", async ({ page }) => {
  await setup(page);
  const report = await openReport(page);
  await expect.poll(async () => (await readRecords(page)).reports.length).toBe(1);
  await page.evaluate(() => {
    const host = window as Window & { __reportOriginalPut?: typeof IDBObjectStore.prototype.put };
    host.__reportOriginalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      if (value?.settingType === "development-report") throw new DOMException("Kurgu rapor kota hatası", "QuotaExceededError");
      return key === undefined ? host.__reportOriginalPut!.call(this, value) : host.__reportOriginalPut!.call(this, value, key);
    };
  });
  const localText = `${evaluation} Cihaza henüz yazılmamış öğretmen cümlesi.`;
  await report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true }).fill(localText);
  await expect(report.getByRole("alert")).toContainText("kota hatası");
  expect((await readRecords(page)).reports[0].teacherEvaluation).toBe("");
  // A failed lifecycle flush must hide private text without discarding React state.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const gate = page.getByRole("dialog", { name: "Yeni kayıtlar güvenlik için durduruldu" });
  await expect(gate).toBeVisible();
  await expect(report).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    const host = window as Window & { __reportOriginalPut?: typeof IDBObjectStore.prototype.put };
    IDBObjectStore.prototype.put = host.__reportOriginalPut!; delete host.__reportOriginalPut;
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await gate.getByRole("button", { name: /yeniden bağlan/i }).click();
  await expect(gate).toBeHidden();
  await expect(report).toBeVisible();
  await expect(report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true })).toHaveValue(localText);
  await expect.poll(async () => (await readRecords(page)).reports[0].teacherEvaluation).toBe(localText);
  await page.keyboard.press("Escape");
  await expect(report).toBeHidden();
});

test("iki sekmenin aynı taslak çatışmasında kaynak yenileme yerel metni ayrı taslağa kaydeder, kazanan kaydı ezmez", async ({ page, context }) => {
  await setup(page);
  const report = await openReport(page);
  await report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true }).fill(evaluation);
  await expect.poll(async () => (await readRecords(page)).reports[0]?.teacherEvaluation).toBe(evaluation);
  const before = (await readRecords(page)).reports[0];
  const secondTab = await context.newPage();
  await installCivilClock(secondTab, page);
  await secondTab.goto("/?native=1", { waitUntil: "networkidle" });
  await secondTab.getByRole("button", { name: "Sınıfım", exact: true }).click();
  const secondReport = await openReport(secondTab);
  const otherText = `${evaluation} Diğer sekmenin korunan notu.`;
  await expect(secondReport.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true })).toHaveValue(evaluation);
  await secondReport.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true }).fill(otherText);
  await expect.poll(async () => (await readRecords(secondTab)).reports.find((row) => row.id === before.id)?.teacherEvaluation).toBe(otherText);
  await secondTab.close();
  const localText = `${evaluation} İlk sekmenin korunacak farklı notu.`;
  await report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true }).fill(localText);
  await expect(report.getByRole("alert")).toContainText("başka bir işlemde değişti");
  await report.getByRole("button", { name: "Kaynakları yenile", exact: true }).click();
  await expect(report).toContainText("metniniz ayrı bir taslağa kaydedildi");
  await expect(report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true })).toHaveValue(localText);
  const records = await readRecords(page);
  expect(records.reports).toHaveLength(2);
  expect(records.reports.find((row) => row.id === before.id)).toMatchObject({ teacherEvaluation: otherText, status: "draft" });
  expect(records.reports.find((row) => row.id !== before.id)).toMatchObject({ teacherEvaluation: localText, status: "draft", approvalSeal: null });
  await expect(report.getByRole("checkbox", { name: "Seçilen gözlemleri ve değerlendirmemi kontrol ettim.", exact: true })).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(report).toBeHidden();
});

test("görünen kaynak değişince autosave durur; açık kaynak yenileme metni korur ve yeniden inceleme ister", async ({ page }) => {
  await setup(page);
  const report = await openReport(page);
  await expect.poll(async () => (await readRecords(page)).reports.length).toBe(1);
  const suffix = " İkinci sekmede düzeltilen kurgu olay ayrıntısı.";
  await changeRawSource(page, suffix);
  await report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true }).fill(evaluation);
  await report.getByRole("checkbox", { name: "Seçilen gözlemleri ve değerlendirmemi kontrol ettim.", exact: true }).check();
  await expect(report.getByRole("alert")).toContainText("Ekranda görünen gözlem kaynakları değişti");
  expect((await readRecords(page)).reports[0].teacherEvaluation).toBe("");
  await expect(report).not.toContainText(suffix);
  await report.getByRole("button", { name: "Kaynakları yenile", exact: true }).click();
  await expect(report).toContainText("Kaynaklar yenilendi; metniniz korundu");
  await expect(report).toContainText(observation + suffix);
  await expect(report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true })).toHaveValue(evaluation);
  await expect(report.getByRole("checkbox", { name: "Seçilen gözlemleri ve değerlendirmemi kontrol ettim.", exact: true })).not.toBeChecked();
  await expect(report.getByRole("button", { name: "Özeti onayla", exact: true })).toBeDisabled();
  const saved = (await readRecords(page)).reports[0];
  expect(saved).toMatchObject({ status: "draft", teacherEvaluation: evaluation, approvalSeal: null });
  expect(saved.evidenceSnapshots).toEqual(expect.arrayContaining([expect.objectContaining({ rawText: observation + suffix })]));
});
