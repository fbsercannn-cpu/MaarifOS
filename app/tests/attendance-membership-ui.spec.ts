import { expect, test, type Page } from "@playwright/test";

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  if (!(await setup.isVisible().catch(() => false))) return;
  await setup.getByLabel("Sınıf adı").fill("Üyelik Kurgu Sınıfı");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();
}

test("yeni sınıf üyeliği işaretlenene kadar günlük devam sayısına girmez", async ({
  page,
}) => {
  const childName = "Kurgu Üyelik Öğrencisi";
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "İlk çocuğu ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill(childName);
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();

  const attendanceSummary = page.getByRole("button", {
    name: /Bugünkü devam\s+0\/1 çocuk/,
  });
  await expect(attendanceSummary).toBeVisible();
  await attendanceSummary.click();

  const student = page
    .getByRole("dialog", { name: "Bugünün devam durumu" })
    .locator(".student-row")
    .filter({ hasText: childName });
  const unmarked = student.getByText("İşaretlenmedi", { exact: true });
  await expect(unmarked).toBeVisible();
  await expect(unmarked).toHaveClass(/status-pill--unmarked/);
  await student.click();
  const present = student.getByText("Geldi", { exact: true });
  await expect(present).toBeVisible();
  await expect(present).toHaveClass(/status-pill--present/);
  await page.keyboard.press("Escape");

  await expect(
    page.getByRole("button", { name: /Bugünkü devam\s+1\/1 çocuk/ }),
  ).toBeVisible();
});
