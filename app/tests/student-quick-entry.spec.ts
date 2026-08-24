import { expect, test, type Page } from "@playwright/test";

const studentName = "Kurgu Hızlı Kayıt Öğrencisi";

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
  await setup.getByLabel("Eğitim yılı", { exact: true }).fill("2025–2026");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

test("320 piksel telefonda öğrenci ve veli temel bilgileri tek hızlı akışta kaydedilir", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/classroom?native=1");
  await configureClassroom(page);

  await page.getByRole("button", { name: "Öğrenci ekle", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  await expect(sheet).toBeVisible();

  const layout = await sheet.evaluate((dialog) => ({
    left: dialog.getBoundingClientRect().left,
    right: dialog.getBoundingClientRect().right,
    scrollWidth: dialog.scrollWidth,
    clientWidth: dialog.clientWidth,
  }));
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(320);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);

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
  await expect(profileButton).toBeVisible();
  await profileButton.click();

  const profile = page.getByRole("dialog", { name: `${studentName} profili` });
  await profile.getByRole("button", { name: "Bilgiler", exact: true }).click();
  await expect(profile.getByLabel("Öğrenci numarası")).toHaveValue("27");
  await expect(profile.getByLabel("T.C. kimlik numarası (isteğe bağlı)")).toHaveValue(
    "10000000146",
  );
  await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
  await expect(profile.getByLabel("Adı ve soyadı").first()).toHaveValue("Kurgu Veli");
  await expect(profile.getByLabel("Cep telefonu").first()).toHaveValue("0555 000 00 00");
});
