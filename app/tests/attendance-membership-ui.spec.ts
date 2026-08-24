import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  if (!(await setup.isVisible().catch(() => false))) return;
  await setup.getByLabel("Okul adı").fill("Üyelik Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Üyelik Kurgu Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Üyelik Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup
    .locator("details")
    .filter({ hasText: "Takvim ayrıntıları" })
    .locator("summary")
    .click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup
    .locator("details")
    .filter({ hasText: "İleri ayarlar" })
    .locator("summary")
    .click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

test("yeni sınıf üyeliği işaretlenene kadar günlük devam sayısına girmez", async ({
  page,
}) => {
  const childName = "Kurgu Üyelik Öğrencisi";
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "İlk öğrenciyi ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill(childName);
  await addStudent.getByRole("button", { name: "Kaydet ve kapat" }).click();

  const attendanceSummary = page.getByRole("button", { name: "Bugünün yoklaması" });
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
    page.getByRole("button", { name: "Bugünün yoklaması" }),
  ).toBeVisible();
});
