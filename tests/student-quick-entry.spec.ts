import { expect, test, type Page } from "@playwright/test";

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByLabel("Okul adı").fill("Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Hızlı Kayıt Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı", { exact: true }).fill("2026–2027");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-06-30");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

for (const width of [320, 390] as const) {
  test(`${width} piksel telefonda ad, kapatan varsayılan kayıt ve Maarif gelişim eylemi ilk görünümde nettir`, async ({
    page,
  }) => {
    const studentName = `Kurgu ${width} Gelişim Çocuğu`;
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.goto("/classroom?native=1");
    await configureClassroom(page);

    await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Çocuk ekle" });
    await expect(sheet).toBeVisible();

    const layout = await sheet.evaluate((dialog) => ({
      left: dialog.getBoundingClientRect().left,
      right: dialog.getBoundingClientRect().right,
      scrollWidth: dialog.scrollWidth,
      clientWidth: dialog.clientWidth,
    }));
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.right).toBeLessThanOrEqual(width);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);

    const optionalDetails = sheet.locator("details.student-optional-details");
    await expect(optionalDetails).not.toHaveAttribute("open", "");
    await expect(sheet.getByLabel("Öğrenci numarası")).toBeHidden();
    await expect(sheet.getByLabel("T.C. kimlik numarası")).toBeHidden();
    const primarySave = sheet.getByRole("button", { name: "Kaydet ve kapat", exact: true });
    await expect(primarySave).toHaveAttribute("type", "submit");
    await expect(primarySave).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: `output/address-2026-09-07/quick-add-${width}.png` });
    await expect(sheet.getByRole("button", { name: "Kaydet ve sıradakini ekle", exact: true })).toBeVisible();

    const nameInput = sheet.getByLabel("Çocuğun adı");
    await nameInput.fill(studentName);
    await nameInput.press("Enter");
    await expect(sheet).toBeHidden();

    const row = page.locator(".simple-student-list > li").filter({ hasText: studentName });
    await expect(row).toContainText("60–72 ay sınıf bandı · TYMM");
    const development = row.getByRole("button", {
      name: `${studentName} için Maarif gelişim gözlemi ekle`,
      exact: true,
    });
    await expect(development).toContainText("Gelişim");
    const actionMetrics = await development.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      return {
        height: rect.height,
        left: rect.left,
        right: rect.right,
        fontSize: Number.parseFloat(getComputedStyle(button).fontSize),
      };
    });
    expect(actionMetrics.height).toBeGreaterThanOrEqual(44);
    expect(actionMetrics.left).toBeGreaterThanOrEqual(0);
    expect(actionMetrics.right).toBeLessThanOrEqual(width);
    expect(actionMetrics.fontSize).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    if (await development.isDisabled()) {
      await page.getByRole("button", { name: "Bugün", exact: true }).click();
      const startYear = page.getByRole("button", { name: "Eğitim yılını başlat", exact: true });
      if (await startYear.isVisible().catch(() => false)) await startYear.click();
      await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
    }
    await development.click();
    await expect(page.getByText("TYMM · yaşa uygun gelişim bilgisi", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
  });
}

test("isteğe bağlı çocuk ve veli bilgileri açıldığında birlikte ve kalıcı kaydedilir", async ({
  page,
}) => {
  const studentName = "Kurgu Ayrıntılı Kayıt Çocuğu";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/classroom?native=1");
  await configureClassroom(page);

  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  await sheet.getByText("İsteğe bağlı çocuk ve veli bilgileri", { exact: true }).click();
  await expect(sheet.locator("details.student-optional-details")).toHaveAttribute("open", "");
  await sheet.getByLabel("Çocuğun adı").fill(studentName);
  await sheet.getByLabel("Öğrenci numarası").fill("27");
  await sheet.getByLabel("T.C. kimlik numarası").fill("10000000146");
  await sheet.getByLabel("Yakınlığı").fill("Anne");
  await sheet.getByLabel("Yakının adı ve soyadı").fill("Kurgu Veli");
  await sheet.getByLabel("Yakının cep telefonu").fill("0555 000 00 00");
  await sheet.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();

  await expect(sheet).toBeHidden();
  const profileButton = page
    .locator("button.simple-student-list__profile")
    .filter({ hasText: studentName });
  await profileButton.click();
  const profile = page.getByRole("dialog", { name: `${studentName} profili` });
  await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  await profile.getByRole("button", { name: "Bilgiler", exact: true }).click();
  await expect(profile.getByLabel("Öğrenci numarası")).toHaveValue("27");
  await expect(profile.getByLabel("T.C. kimlik numarası (isteğe bağlı)")).toHaveValue("10000000146");
  await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
  await expect(profile.getByLabel("Adı ve soyadı").first()).toHaveValue("Kurgu Veli");
  await expect(profile.getByLabel("Cep telefonu").first()).toHaveValue("0555 000 00 00");
});
