import { expect, test, type Page } from "@playwright/test";

import { installCivilClock } from "./helpers/development-workspace-ui.ts";
test.beforeEach(async ({ page }) => { await installCivilClock(page); });
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
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-06-30");
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
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill(childName);
  await addStudent.getByRole("button", { name: "Kaydet ve kapat" }).click();

  await page.getByText("Sınıf işlemleri", { exact: true }).click();
  const attendanceSummary = page.getByRole("button", { name: "Bugünün yoklaması" });
  await expect(attendanceSummary).toBeVisible();
  await attendanceSummary.click();

  const attendance = page.getByRole("dialog", { name: "Hızlı Dokunmatik Yoklama (E5)" });
  const student = attendance.locator(".qag-student-card").filter({ hasText: childName });
  await expect(student).toHaveAttribute("data-status", "unmarked");
  await expect(student.getByRole("button", { pressed: true })).toHaveCount(0);
  const present = student.getByRole("button", { name: `${childName} Geldi`, exact: true });
  await present.click();
  await expect(present).toHaveAttribute("aria-pressed", "true");
  await expect(student).toHaveAttribute("data-status", "present");
  await page.keyboard.press("Escape");

  await expect(
    page.getByRole("button", { name: "Bugünün yoklaması" }),
  ).toBeVisible();
});
