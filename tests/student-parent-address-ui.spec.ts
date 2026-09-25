import { expect, test, type Page } from "@playwright/test";
import * as XLSX from "xlsx";

async function setup(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 });
  await page.clock.install({ time: new Date("2026-09-07T09:00:00.000Z") });
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Sınıf");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
  if (process.env.MAARIF_PARENT_PRODUCTION === "1") {
    await expect.poll(() => page.evaluate(() => Boolean((window as Window & {
      __maarifosPwaStatus?: { offlineReady?: boolean };
    }).__maarifosPwaStatus?.offlineReady)), { timeout: 60000 }).toBe(true);
    await page.context().setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
}

async function openProfile(page: Page, name: string) {
  await page.locator("button.simple-student-list__profile").filter({ hasText: name }).click();
  const profile = page.getByRole("dialog", { name: `${name} profili`, exact: true });
  await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  return profile;
}

for (const width of [320, 390]) {
  test(`${width}px: yeni öğrenci adresi ve seçilen soyadı önerisi kaydolur; farklı soyadı korunur`, async ({ page }) => {
    test.setTimeout(120_000);
    await setup(page, width);
    await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
    const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
    await expect(add.getByLabel("Ev adresi")).toBeVisible();
    await expect(add.locator("details.student-optional-details")).not.toHaveAttribute("open", "");
    await add.getByLabel("Çocuğun adı").fill("Kurgu Çocuk Yılmaz");
    await add.getByRole("button", { name: "Tek metin olarak düzenle", exact: true }).click();
    await add.getByLabel("Ev adresi").fill("Kurgu Mahallesi 12\nMerkezefendi / Denizli");
    await add.getByLabel("Ev adresi").press("Tab");
    await add.locator("details.student-optional-details > summary").click();
    await add.getByLabel("Yakınlığı", { exact: true }).fill("Annesi");
    await add.getByLabel("Yakının adı ve soyadı").fill("Selin");
    const suggestion = add.getByRole("button", { name: "Anne soyadını ekle: Selin Yılmaz", exact: true });
    await expect(suggestion).toBeVisible();
    await expect(add.getByLabel("Yakının adı ve soyadı")).toHaveValue("Selin");
    await suggestion.click();
    await expect(add.getByLabel("Yakının adı ve soyadı")).toHaveValue("Selin Yılmaz");
    await add.getByLabel("Yakının adı ve soyadı").fill("Selin Öztürk");
    await expect(add.locator(".student-surname-suggestion")).toHaveCount(0);
    await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
    await expect(add).toBeHidden();

    let profile = await openProfile(page, "Kurgu Çocuk Yılmaz");
    await profile.getByRole("button", { name: "Bilgiler", exact: true }).click();
    await expect(profile.getByLabel("Ev adresi")).toHaveValue("Kurgu Mahallesi 12\nMerkezefendi / Denizli");
    await profile.getByLabel("Ev adresi").fill("Yeni Kurgu Sokak 8\nPamukkale / Denizli");
    await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
    await expect(profile.getByLabel("Ev adresi")).toHaveValue("Yeni Kurgu Sokak 8\nPamukkale / Denizli");
    const mother = profile.getByRole("region", { name: "Anne bilgileri", exact: true });
    await expect(mother.getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Selin Öztürk");
    await expect(mother.getByLabel("Cep telefonu", { exact: true })).toHaveValue("");
    const father = profile.getByRole("region", { name: "Baba bilgileri", exact: true });
    await father.getByLabel("Adı ve soyadı", { exact: true }).fill("Ahmet");
    await father.getByRole("button", { name: "Baba soyadını ekle: Ahmet Yılmaz", exact: true }).click();
    await expect(father.getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Ahmet Yılmaz");
    await profile.getByRole("button", { name: "Başka bir yakın ekle", exact: true }).click();
    const other = profile.getByRole("region", { name: "Üçüncü kişi bilgileri", exact: true });
    await other.getByLabel("Yakınlığı / unvanı", { exact: true }).fill("Teyze");
    await other.getByLabel("Adı ve soyadı", { exact: true }).fill("Zeynep");
    await expect(other.locator(".student-surname-suggestion")).toHaveCount(0);
    await profile.getByRole("button", { name: "Güvenlik", exact: true }).click();
    await profile.getByLabel("Bilinen alerjiler").fill("Kurgu alerji notu");
    await profile.getByRole("button", { name: "Aile & izinler", exact: true }).click();
    await profile.getByLabel("Çocuğa özel bilgi notu").fill("Kurgu destek notu korunmalı.");
    await profile.getByRole("button", { name: "Bilgiler", exact: true }).click();
    await profile.getByLabel("Soyadı", { exact: true }).fill("Demir");
    await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click();
    await expect(profile).toBeHidden();
    await page.reload();

    profile = await openProfile(page, "Kurgu Çocuk Demir");
    await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
    await expect(profile.getByLabel("Ev adresi")).toHaveValue("Yeni Kurgu Sokak 8\nPamukkale / Denizli");
    await expect(profile.getByRole("region", { name: "Anne bilgileri" }).getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Selin Öztürk");
    await expect(profile.getByRole("region", { name: "Baba bilgileri" }).getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Ahmet Yılmaz");
    await expect(profile.getByRole("region", { name: "Üçüncü kişi bilgileri" }).getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Zeynep");
    await expect(profile.locator(".student-surname-suggestion")).toHaveCount(0);
    await profile.getByLabel("Ev adresi", { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/master-audit-2026-09-07/student-profile-${width}.png` });
    await profile.getByRole("button", { name: "Güvenlik", exact: true }).click();
    await expect(profile.getByLabel("Bilinen alerjiler")).toHaveValue("Kurgu alerji notu");
    await profile.getByRole("button", { name: "Aile & izinler", exact: true }).click();
    await expect(profile.getByLabel("Çocuğa özel bilgi notu")).toHaveValue("Kurgu destek notu korunmalı.");
    await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.locator("button.simple-student-list__profile").filter({ hasText: "Kurgu Çocuk Demir" }).click();
    await expect(page.getByRole("dialog", { name: "Kurgu Çocuk Demir profili", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`${width}px: Excel soyadı önerisi açık eylemdir; adres ve seçilmeyen öneri reload sonrasında korunur`, async ({ page }) => {
    test.setTimeout(120_000);
    await setup(page, width);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["Öğrenci adı soyadı", "Anne adı soyadı", "Baba adı soyadı", "Ev adresi", "Çocuğa özel bilgi notu"],
      ["Kurgu Öğrenci Kaya", "Ayşe", "Arda Öztürk", "Kurgu Sokak 4\nDenizli", "Kurgu kişisel not"],
      ["Kurgu Öğrenci Deniz", "Oya", "Kurgu Baba", "Kurgu Sokak 5\nDenizli", ""],
    ]), "Veliler");
    await page.getByRole("button", { name: "Excel'den ekle", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Excel'den öğrenci ekle", exact: true });
    await sheet.locator('input[type="file"]').setInputFiles({ name: "kurgu-adres-veliler.xls", mimeType: "application/vnd.ms-excel", buffer: Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "biff8" })) });
    await sheet.getByRole("button", { name: "Öğrencileri önizle", exact: true }).click();
    const first = sheet.locator('[data-import-row="2"]');
    await first.locator("summary").click();
    await expect(first.getByLabel("Anne adı soyadı", { exact: true })).toHaveValue("Ayşe");
    await first.getByRole("button", { name: "Anne soyadını ekle: Ayşe Kaya", exact: true }).click();
    await expect(first.getByRole("checkbox")).not.toBeChecked();
    await expect(first.getByLabel("Baba adı soyadı", { exact: true })).toHaveValue("Arda Öztürk");
    await expect(first.getByRole("button", { name: /^Baba soyadını ekle/ })).toHaveCount(0);
    const address = first.getByLabel("Ev adresi", { exact: true });
    await expect(address).toHaveJSProperty("tagName", "TEXTAREA");
    await expect(address).toHaveValue("Kurgu Sokak 4\nDenizli");
    await address.fill("Yeni Kurgu Sokak 24\nMerkezefendi / Denizli");
    await address.press("Tab");
    await page.screenshot({ path: `output/playwright/master-audit-2026-09-07/student-import-address-${width}.png` });
    await first.locator("summary").click();
    await first.getByRole("checkbox").check();
    await sheet.getByRole("button", { name: "2 öğrenciyi sınıfa ekle", exact: true }).click();
    await expect(sheet).toBeHidden();
    await page.reload();
    let profile = await openProfile(page, "Kurgu Öğrenci Kaya");
    await profile.getByRole("button", { name: "Bilgiler", exact: true }).click();
    await expect(profile.getByLabel("Ev adresi")).toHaveValue("Yeni Kurgu Sokak 24\nMerkezefendi / Denizli");
    await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
    await expect(profile.getByRole("region", { name: "Anne bilgileri" }).getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Ayşe Kaya");
    await expect(profile.getByRole("region", { name: "Baba bilgileri" }).getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Arda Öztürk");
    await profile.getByRole("button", { name: "Aile & izinler", exact: true }).click();
    await expect(profile.getByLabel("Çocuğa özel bilgi notu")).toHaveValue("Kurgu kişisel not");
    await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click();
    await expect(profile).toBeHidden();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    profile = await openProfile(page, "Kurgu Öğrenci Deniz");
    await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
    await expect(profile.getByRole("region", { name: "Anne bilgileri" }).getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Oya");
    await expect(profile.getByRole("button", { name: "Anne soyadını ekle: Oya Deniz", exact: true })).toBeVisible();
    await expect(profile.getByLabel("Ev adresi")).toHaveValue("Kurgu Sokak 5\nDenizli");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
