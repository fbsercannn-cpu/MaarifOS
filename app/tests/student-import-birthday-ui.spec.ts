import { expect, test, type Page } from "@playwright/test";
import * as XLSX from "xlsx";

const upload = () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Kurgu veli iletişim listesi"],
    ["Ö Ğ R E N C İ N İ N", "", "", "", "A N N E N İ N", "", "", "B A B A N I N", "", "", "ARANACAK 3. KİŞİNİN"],
    ["NO", "ADI SOYADI", "TC KİMLİK NO", "DOĞUM TARİHİ", "ADI", "TELEFONU", "MESLEĞİ", "ADI", "TELEFONU", "MESLEĞİ", "ADI SOYADI", "TELEFONU", "YAKINLIĞI", "ADRES", "Çocuk özel not"],
    ["1", "Kurgu Deniz", "", "10.09.2021", "Kurgu Anne", "05550000001", "Mühendis", "Kurgu Baba", "05550000002", "Öğretmen", "Kurgu Yakın", "05550000003", "Teyze", "Kurgu Mahallesi 1", "Kurgu özel destek notu"],
    ["2", "Kurgu Ekin", "", "17.09.2021", "Kurgu Anne İki", "555", "Mimar"],
  ]), "İletişim");
  return { name: "kurgu-veli-iletisim.xls", mimeType: "application/vnd.ms-excel", buffer: Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "biff8" })) };
};
async function setup(page: Page) {
  await page.clock.setFixedTime(new Date("2026-09-07T09:00:00.000Z"));
  await page.goto("/classroom?native=1");
  const dialog = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Okul adı").fill("Kurgu Anaokulu");
  await dialog.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await dialog.getByLabel("Sınıf adı").fill("Kurgu Uyum Sınıfı");
  await dialog.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await dialog.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(dialog).toBeHidden();
  if (process.env.MAARIF_STUDENT_PRODUCTION === "1") {
    await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __maarifosPwaStatus?: { offlineReady?: boolean } }).__maarifosPwaStatus?.offlineReady)), { timeout: 60000 }).toBe(true);
    await page.context().setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
}
for (const width of [320, 390]) test(`${width}px: XLS preview, correction, atomic save, birthday and repeated file review`, async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width, height: 844 }); await setup(page);
  await page.getByRole("button", { name: "Excel'den ekle", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Excel'den öğrenci ekle" });
  await sheet.locator('input[type="file"]').setInputFiles(upload());
  await expect(sheet.getByLabel("Anne mesleği sütunu")).toHaveValue("6");
  await expect(sheet.getByLabel("Baba mesleği sütunu")).toHaveValue("9");
  await page.screenshot({ path: `output/playwright/student-redesign-2026-09-07/import-mapping-${width}.png` });
  await sheet.getByRole("button", { name: "Öğrencileri önizle" }).click();
  await expect(sheet).toContainText("2 öğrenci satırı · 1 seçili");
  const second = sheet.locator('[data-import-row="5"]');
  await expect(second.getByRole("checkbox")).toBeDisabled();
  await second.locator("summary").click();
  await second.getByLabel("Anne telefonu", { exact: true }).fill("05550000004");
  await second.getByLabel("Anne telefonu", { exact: true }).press("Tab");
  await second.locator("summary").click();
  await second.getByRole("checkbox").check();
  await expect(sheet).toContainText("2 öğrenci satırı · 2 seçili");
  const overflow = await sheet.evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1); expect(overflow.left).toBeGreaterThanOrEqual(0); expect(overflow.right).toBeLessThanOrEqual(width + 1);
  await page.screenshot({ path: `output/playwright/student-redesign-2026-09-07/import-preview-${width}.png` });
  await sheet.getByRole("button", { name: "2 öğrenciyi sınıfa ekle" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.locator(".simple-student-list > li")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".simple-student-list > li")).toHaveCount(2);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  const birthday = page.getByRole("region", { name: "Yaklaşan doğum günleri" });
  await expect(birthday).toContainText("Kurgu Deniz"); await expect(birthday).toContainText("3 gün sonra");
  await expect(birthday).not.toContainText("Kurgu Ekin");
  await page.screenshot({ path: `output/playwright/student-redesign-2026-09-07/birthdays-${width}.png` });
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Excel'den ekle", exact: true }).click();
  await sheet.locator('input[type="file"]').setInputFiles(upload());
  await sheet.getByRole("button", { name: "Öğrencileri önizle" }).click();
  await expect(sheet).toContainText("2 öğrenci satırı · 0 seçili");
  await expect(sheet).toContainText("2 mükerrer adayı");
  await expect(sheet.getByRole("button", { name: "0 öğrenciyi sınıfa ekle" })).toBeDisabled();
});

test("editing another preview row cannot silently acknowledge a newly created duplicate", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 }); await setup(page);
  await page.getByRole("button", { name: "Excel'den ekle", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Excel'den öğrenci ekle" });
  await sheet.locator('input[type="file"]').setInputFiles(upload());
  await sheet.getByRole("button", { name: "Öğrencileri önizle" }).click();
  const first = sheet.locator('[data-import-row="4"]'), second = sheet.locator('[data-import-row="5"]');
  await expect(first.getByRole("checkbox")).toBeChecked();
  await second.locator("summary").click();
  await second.getByLabel("Anne telefonu", { exact: true }).fill("05550000004");
  await second.getByLabel("Öğrenci adı soyadı", { exact: true }).fill("Kurgu Deniz");
  await second.getByLabel("Öğrenci adı soyadı", { exact: true }).press("Tab");
  await second.locator("summary").click();
  await expect(first.getByRole("checkbox")).not.toBeChecked();
  await expect(second.getByRole("checkbox")).not.toBeChecked();
  await expect(sheet.getByRole("button", { name: "0 öğrenciyi sınıfa ekle" })).toBeDisabled();
  await first.getByRole("checkbox").check();
  await expect(sheet.getByRole("button", { name: "1 öğrenciyi sınıfa ekle" })).toBeEnabled();
  await sheet.getByRole("button", { name: "1 öğrenciyi sınıfa ekle" }).click();
  await expect(sheet).toBeHidden();
  await page.reload();
  await expect(page.locator(".simple-student-list > li")).toHaveCount(1);
});
