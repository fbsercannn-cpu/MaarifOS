import { expect, test } from "@playwright/test";

test("öğretmen günü eksikleri görünür taşıyarak kapatır, reload sonrası korur ve değişiklikte stale olur", async ({
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

  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Gün Sonu Kurgu Sınıfı");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill(civilDate);
  await setup.getByLabel("Eğitim yılı bitişi").fill(civilDate);
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup
    .getByLabel("Yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup
    .getByLabel("Uygulanan program", { exact: true })
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup
    .getByLabel("Çalışma düzeni", { exact: true })
    .selectOption("full_day");
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: /(?:İlk )?çocuğu? ekle/i }).first().click();
  await page.getByLabel("Çocuğun adı").fill("Kurgu Gün Sonu Öğrencisi");
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Bugün", exact: true }).click();

  const card = page.getByTestId("teacher-day-close");
  await expect(card).toContainText("2 kapanış işi var");
  await card.getByRole("button", { name: /Günü kapat/ }).click();
  const sheet = page.getByTestId("day-closure-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Yoklama tamamlanmadı", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Günlük plan yok", { exact: true })).toBeVisible();
  await expect(sheet).toContainText("Gözlem sayısı bir performans hedefi değildir");
  const closeWithCarry = sheet.getByRole("button", {
    name: "Eksikleri yarına taşı ve kapat",
  });
  await expect(closeWithCarry).toBeDisabled();
  await sheet
    .getByLabel("Yarına öğretmen notu")
    .fill("Sabah ilk iş yoklamayı ve günlük planı tamamlayacağım.");
  await expect(closeWithCarry).toBeEnabled();
  await closeWithCarry.click();
  await expect(sheet).toBeHidden();
  await expect(card).toContainText("Eksikler yarına taşındı");

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("teacher-day-close")).toContainText(
    "Eksikler yarına taşındı",
  );

  await page.getByRole("button", { name: /Kayıt ekle/i }).click();
  await page.getByRole("button", { name: /Yoklama al/ }).click();
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
  const captureMenu = page.getByRole("dialog", { name: "Ne ekleyelim?" });
  if (await captureMenu.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await expect(captureMenu).toBeHidden();
  }

  const staleCard = page.getByTestId("teacher-day-close");
  await expect(staleCard).toContainText("Kapanışı yeniden kontrol edin");
  await staleCard
    .getByRole("button", { name: "Yeniden kontrol et" })
    .click();
  await expect(page.getByTestId("day-closure-sheet")).toContainText(
    "Kapanıştan sonra kayıtlar değişti",
  );
  await expect(page.getByTestId("day-closure-sheet")).toContainText(
    "Günlük plan yok",
  );
});
