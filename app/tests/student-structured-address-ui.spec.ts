import { expect, test, type Locator, type Page } from "@playwright/test";
import * as XLSX from "xlsx";

const canonicalAddress = "Pancar Caddesi No: 12 / 2 Aşağı Mahalle Acıpayam Denizli";
const alternateAddress = "Pancar Caddesi No: 12 / 2 Aşağı Mahalle Merkezefendi İzmir";
const productionMode = process.env.MAARIF_ADDRESS_PRODUCTION === "1";
const screenshotDirectory = `output/address-2026-09-07${productionMode ? "/production" : ""}`;

async function setup(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 });
  await page.clock.install({ time: new Date("2026-09-07T09:00:00.000Z") });
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Adres Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
  if (productionMode) {
    await expect.poll(() => page.evaluate(() => Boolean((window as Window & {
      __maarifosPwaStatus?: { offlineReady?: boolean };
    }).__maarifosPwaStatus?.offlineReady)), { timeout: 60_000 }).toBe(true);
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

async function addressState(page: Page, name: string) {
  return page.evaluate(async (studentName) => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const store = new IndexedDbDataStore();
    try {
      const snapshot = await store.readSnapshot();
      const student = snapshot.students.find((record) => record.displayName === studentName);
      if (!student) throw new Error("Kurgu test öğrencisi bulunamadı.");
      const care = student.careDetails as Record<string, unknown> | undefined;
      return { address: care?.homeAddress ?? null, parts: care?.homeAddressParts ?? null };
    } finally { store.close(); }
  }, name);
}

async function expectInitialAddress(editor: Locator) {
  await expect(editor.getByLabel("İlçe", { exact: true })).toHaveValue("Acıpayam");
  await expect(editor.getByLabel("İl", { exact: true })).toHaveValue("Denizli");
  await expect(editor.getByLabel("Mahalle", { exact: true })).toHaveValue("");
  await expect(editor.getByLabel("Cadde / sokak ve no", { exact: true })).toHaveValue("");
  await expect(editor.getByLabel("Ev adresi", { exact: true })).toHaveValue("");
  await expect(editor.getByLabel("Ev adresi", { exact: true })).toHaveJSProperty("readOnly", true);
  const order = await editor.locator(".student-address-field").evaluate((field) =>
    Array.from(field.querySelectorAll("label")).map((label) => label.textContent?.trim()),
  );
  expect(order.slice(0, 4)).toEqual(["İlçe", "İl", "Mahalle", "Cadde / sokak ve no"]);
}

async function fillAddress(editor: Locator, neighborhood = "Aşağı Mahalle") {
  await editor.getByLabel("Mahalle", { exact: true }).fill(neighborhood);
  await editor.getByLabel("Cadde / sokak ve no", { exact: true }).fill("Pancar Caddesi No: 12 / 2");
  await editor.getByLabel("Cadde / sokak ve no", { exact: true }).press("Tab");
  await expect(editor.getByLabel("Ev adresi", { exact: true })).toHaveValue(canonicalAddress);
  await expect(editor.getByLabel("Mahalle", { exact: true })).toHaveValue(neighborhood);
}

async function expectNoHorizontalOverflow(editor: Locator, width: number) {
  const layout = await editor.evaluate((element) => ({
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(width + 1);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
}

test("320px: seri kayıtta ilk çocuğun tek metin adresi ikinci çocuğa taşınmaz", async ({ page }) => {
  test.setTimeout(120_000);
  await setup(page, 320);
  const firstName = "Kurgu Seri Bir";
  const secondName = "Kurgu Seri İki";
  const rawAddress = "Kurgu Seri Sokak 7\nUşak";
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await add.getByLabel("Çocuğun adı", { exact: true }).fill(firstName);
  await add.getByRole("button", { name: "Tek metin olarak düzenle", exact: true }).click();
  await add.getByLabel("Ev adresi", { exact: true }).fill(rawAddress);
  await add.getByRole("button", { name: "Kaydet ve sıradakini ekle", exact: true }).click();
  await expect(add.getByLabel("Çocuğun adı", { exact: true })).toHaveValue("");
  await expectInitialAddress(add);
  await add.getByLabel("Çocuğun adı", { exact: true }).fill(secondName);
  await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(add).toBeHidden().catch(async (error) => {
    await page.screenshot({ path: `${screenshotDirectory}/serial-empty-dialog-320.png` });
    throw error;
  });
  await page.reload();
  let profile = await openProfile(page, secondName);
  await profile.getByRole("button", { name: "Bilgiler", exact: true }).click();
  await expectInitialAddress(profile);
  await profile.getByRole("button", { name: `${secondName} profili ekranını kapat`, exact: true }).click();
  profile = await openProfile(page, firstName);
  await profile.getByRole("button", { name: "Bilgiler", exact: true }).click();
  await expect(profile.getByLabel("Ev adresi", { exact: true })).toHaveValue(rawAddress);
  await expect(profile.getByLabel("İlçe", { exact: true })).toHaveCount(0);
  if (!productionMode) {
    expect(await addressState(page, firstName)).toEqual({ address: rawAddress, parts: null });
    expect(await addressState(page, secondName)).toEqual({ address: null, parts: null });
  }
});

for (const width of [320, 390]) {
  test(`${width}px: dokunulmayan Acıpayam Denizli varsayılanları öğrenci adresi olarak saklanmaz`, async ({ page }) => {
    test.setTimeout(120_000);
    await setup(page, width);
    const name = `Kurgu Boş Adres ${width}`;
    await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
    const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
    await expectInitialAddress(add);
    await add.getByLabel("Çocuğun adı", { exact: true }).fill(name);
    await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
    await expect(add).toBeHidden();
    await page.reload();
    const profile = await openProfile(page, name);
    for (const tab of ["Bilgiler", "Yakınlar", "Güvenlik"]) {
      await profile.getByRole("button", { name: tab, exact: true }).click();
      await expectInitialAddress(profile);
    }
    await expectNoHorizontalOverflow(profile, width);
    await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click();
    await expect(profile).toBeHidden();
    if (!productionMode) expect(await addressState(page, name)).toEqual({ address: null, parts: null });
    await page.reload();
    if (!productionMode) expect(await addressState(page, name)).toEqual({ address: null, parts: null });
    const reopened = await openProfile(page, name);
    await reopened.getByRole("button", { name: "Bilgiler", exact: true }).click();
    await expectInitialAddress(reopened);
  });

  test(`${width}px: parçalı adres sekmelerde tek kayıttır; il ilçe değişir ve tek metne dönüş aile bilgilerini korur`, async ({ page }) => {
    test.setTimeout(120_000);
    await setup(page, width);
    const name = "Kurgu Çocuk Yılmaz";
    const neighborhood = width === 320 ? "Aşağı" : "Aşağı Mahalle";
    await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
    const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
    await add.getByLabel("Çocuğun adı", { exact: true }).fill(name);
    await fillAddress(add, neighborhood);
    await add.locator("details.student-optional-details > summary").click();
    await add.getByLabel("Yakınlığı", { exact: true }).fill("Annesi");
    await add.getByLabel("Yakının adı ve soyadı", { exact: true }).fill("Selin Öztürk");
    await expect(add.locator(".student-surname-suggestion")).toHaveCount(0);
    await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
    await expect(add).toBeHidden();
    let profile = await openProfile(page, name);
    for (const tab of ["Bilgiler", "Yakınlar", "Güvenlik"]) {
      await profile.getByRole("button", { name: tab, exact: true }).click();
      await expect(profile.getByLabel("Ev adresi", { exact: true })).toHaveValue(canonicalAddress);
      await expect(profile.getByLabel("Ev adresi", { exact: true })).toHaveJSProperty("readOnly", true);
      await expect(profile.getByLabel("Mahalle", { exact: true })).toHaveValue(neighborhood);
    }
    await profile.getByLabel("Bilinen alerjiler").fill("Kurgu alerji notu korunmalı");
    await profile.getByRole("button", { name: "Aile & izinler", exact: true }).click();
    await profile.getByLabel("Çocuğa özel bilgi notu").fill("Kurgu geçiş desteği korunmalı");
    await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
    await expect(profile.getByRole("region", { name: "Anne bilgileri", exact: true }).getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Selin Öztürk");
    await profile.getByLabel("İlçe", { exact: true }).fill("Merkezefendi");
    await profile.getByLabel("İl", { exact: true }).fill("İzmir");
    await profile.getByLabel("İl", { exact: true }).press("Tab");
    await expect(profile.getByLabel("Ev adresi", { exact: true })).toHaveValue(alternateAddress);
    await expectNoHorizontalOverflow(profile, width);
    await profile.getByLabel("İlçe", { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${screenshotDirectory}/structured-profile-${width}.png` });
    await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click();
    await expect(profile).toBeHidden();
    await page.reload();
    profile = await openProfile(page, name);
    await profile.getByRole("button", { name: "Bilgiler", exact: true }).click();
    await expect(profile.getByLabel("Ev adresi", { exact: true })).toHaveValue(alternateAddress);
    await expect(profile.getByLabel("İlçe", { exact: true })).toHaveValue("Merkezefendi");
    await expect(profile.getByLabel("İl", { exact: true })).toHaveValue("İzmir");
    await expect(profile.getByLabel("Mahalle", { exact: true })).toHaveValue(neighborhood);
    if (!productionMode) expect((await addressState(page, name)).parts).not.toBeNull();
    await profile.getByRole("button", { name: "Tek metin olarak düzenle", exact: true }).click();
    await expect(profile.getByLabel("İlçe", { exact: true })).toHaveCount(0);
    await expect(profile.getByLabel("Ev adresi", { exact: true })).toHaveValue(alternateAddress);
    await expect(profile.getByLabel("Ev adresi", { exact: true })).toHaveJSProperty("readOnly", false);
    const rawAddress = "Kurgu Tek Metin Sokak 3\nPamukkale / Denizli";
    await profile.getByLabel("Ev adresi", { exact: true }).fill(rawAddress);
    await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click();
    await expect(profile).toBeHidden();
    await page.reload();
    profile = await openProfile(page, name);
    await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
    await expect(profile.getByLabel("Ev adresi", { exact: true })).toHaveValue(rawAddress);
    await expect(profile.getByLabel("İlçe", { exact: true })).toHaveCount(0);
    await expect(profile.getByRole("region", { name: "Anne bilgileri", exact: true }).getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Selin Öztürk");
    await profile.getByRole("button", { name: "Güvenlik", exact: true }).click();
    await expect(profile.getByLabel("Bilinen alerjiler")).toHaveValue("Kurgu alerji notu korunmalı");
    await expect(profile.getByLabel("Ev adresi", { exact: true })).toHaveValue(rawAddress);
    await profile.getByRole("button", { name: "Aile & izinler", exact: true }).click();
    await expect(profile.getByLabel("Çocuğa özel bilgi notu")).toHaveValue("Kurgu geçiş desteği korunmalı");
    if (!productionMode) expect(await addressState(page, name)).toEqual({ address: rawAddress, parts: null });
  });

  test(`${width}px: Excel eski adresi tahminle bölmez; açık dönüşüm yeniden seçim ister ve aktarım kalıcıdır`, async ({ page }) => {
    test.setTimeout(120_000);
    await setup(page, width);
    const legacyAddress = "Kurgu Sokak 4\nDenizli";
    const untouchedAddress = "Ham Sokak 5\nEski Mahalle / Uşak";
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["Öğrenci adı soyadı", "Anne adı soyadı", "Baba adı soyadı", "Ev adresi", "Çocuğa özel bilgi notu"],
      ["Kurgu Öğrenci Kaya", "Ayşe", "Arda Öztürk", legacyAddress, "Kurgu kişisel not"],
      ["Kurgu Öğrenci Deniz", "Oya", "Kurgu Baba", untouchedAddress, ""],
    ]), "Veliler");
    await page.getByRole("button", { name: "Excel'den ekle", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Excel'den öğrenci ekle", exact: true });
    await sheet.locator('input[type="file"]').setInputFiles({ name: "kurgu-parcali-adres.xls", mimeType: "application/vnd.ms-excel", buffer: Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "biff8" })) });
    await sheet.getByRole("button", { name: "Öğrencileri önizle", exact: true }).click();
    const first = sheet.locator('[data-import-row="2"]');
    await expect(first.getByRole("checkbox")).toBeChecked();
    await first.locator("summary").click();
    await expect(first.getByLabel("Ev adresi", { exact: true })).toHaveValue(legacyAddress);
    await expect(first.getByLabel("İlçe", { exact: true })).toHaveCount(0);
    await first.getByRole("button", { name: "Alanlara ayırarak düzenle", exact: true }).click();
    await expect(first.getByLabel("Cadde / sokak ve no", { exact: true })).toHaveValue(legacyAddress);
    await expect(first.getByLabel("İlçe", { exact: true })).toHaveValue("");
    await expect(first.getByLabel("İl", { exact: true })).toHaveValue("");
    await expect(first.getByLabel("Mahalle", { exact: true })).toHaveValue("");
    await expect(first.getByRole("checkbox")).not.toBeChecked();
    await first.getByRole("button", { name: "Acıpayam / Denizli kullan", exact: true }).click();
    await fillAddress(first);
    await expect(first.getByLabel("Baba adı soyadı", { exact: true })).toHaveValue("Arda Öztürk");
    await expect(first.getByLabel("Anne adı soyadı", { exact: true })).toHaveValue("Ayşe");
    await expect(first.getByLabel("Çocuğa özel bilgi notu", { exact: true })).toHaveValue("Kurgu kişisel not");
    await first.getByLabel("İlçe", { exact: true }).scrollIntoViewIfNeeded();
    await expectNoHorizontalOverflow(sheet, width);
    await page.screenshot({ path: `${screenshotDirectory}/structured-import-${width}.png` });
    await first.locator("summary").click();
    await first.getByRole("checkbox").check();
    await sheet.getByRole("button", { name: "2 öğrenciyi sınıfa ekle", exact: true }).click();
    await expect(sheet).toBeHidden();
    await page.reload();
    let profile = await openProfile(page, "Kurgu Öğrenci Kaya");
    await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
    await expect(profile.getByLabel("Ev adresi", { exact: true })).toHaveValue(canonicalAddress);
    await expect(profile.getByLabel("Mahalle", { exact: true })).toHaveValue("Aşağı Mahalle");
    await expect(profile.getByRole("region", { name: "Anne bilgileri", exact: true }).getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Ayşe");
    await expect(profile.getByRole("region", { name: "Baba bilgileri", exact: true }).getByLabel("Adı ve soyadı", { exact: true })).toHaveValue("Arda Öztürk");
    await profile.getByRole("button", { name: "Aile & izinler", exact: true }).click();
    await expect(profile.getByLabel("Çocuğa özel bilgi notu")).toHaveValue("Kurgu kişisel not");
    await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click();
    await expect(profile).toBeHidden();
    if (!productionMode) expect((await addressState(page, "Kurgu Öğrenci Kaya")).parts).not.toBeNull();
    profile = await openProfile(page, "Kurgu Öğrenci Deniz");
    await profile.getByRole("button", { name: "Bilgiler", exact: true }).click();
    await expect(profile.getByLabel("Ev adresi", { exact: true })).toHaveValue(untouchedAddress);
    await expect(profile.getByLabel("İlçe", { exact: true })).toHaveCount(0);
    if (!productionMode) expect(await addressState(page, "Kurgu Öğrenci Deniz")).toEqual({ address: untouchedAddress, parts: null });
  });
}
