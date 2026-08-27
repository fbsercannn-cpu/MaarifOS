import { expect, test } from "@playwright/test";

test("sade Bugün ekranı kaldırılan gün-kapat kartını göstermez; yoklama ve plan akışını korur", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  const civilDate = await page.evaluate(async () => {
    const { civilDateInIstanbul } = await import(
      "/src/core/domain/attendance.ts"
    );
    return civilDateInIstanbul(new Date());
  });

  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Gün Sonu Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Gün Sonu Kurgu Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Gün Sonu Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup
    .locator("details")
    .filter({ hasText: "Takvim ayrıntıları" })
    .locator("summary")
    .click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill(civilDate);
  await setup.getByLabel("Eğitim yılı bitişi").fill(civilDate);
  await setup
    .locator("details")
    .filter({ hasText: "İleri ayarlar" })
    .locator("summary")
    .click();
  await setup
    .getByLabel("Çalışma düzeni", { exact: true })
    .selectOption("full_day");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: /(?:İlk )?öğrenci(?:yi)? ekle/i }).first().click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill("Kurgu Gün Sonu Öğrencisi");
  await addStudent.getByRole("button", { name: "Kaydet ve kapat" }).click();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();

  await expect(page.getByTestId("teacher-day-close")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Günü kapat/ })).toHaveCount(0);
  const planTrigger = page
    .getByRole("region", { name: "Bugünün işi tek yerde" })
    .getByRole("button", { name: /Günün planı/ });
  await expect(planTrigger).toBeVisible();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Bugünün yoklaması" }).click();
  const attendance = page.getByRole("dialog", {
    name: "Bugünün devam durumu",
  });
  const student = attendance
    .locator(".student-row")
    .filter({ hasText: "Kurgu Gün Sonu Öğrencisi" });
  await student.click();
  await attendance
    .getByRole("button", { name: "Devam durumunu tamamla", exact: true })
    .click();
  await expect(attendance).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Bugünün yoklaması" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Bugünün devam durumu" })
      .locator(".student-row")
      .filter({ hasText: "Kurgu Gün Sonu Öğrencisi" })
      .getByText("Geldi", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await page
    .getByRole("region", { name: "Bugünün işi tek yerde" })
    .getByRole("button", { name: /Günün planı/ })
    .click();
  await expect(page.getByRole("dialog", { name: "Günlük plan oluşturma" })).toBeVisible();
});
