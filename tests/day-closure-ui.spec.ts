import { expect, test, type Page } from "@playwright/test";
import {installCivilClock} from "./helpers/development-workspace-ui";

async function openClassroomAttendance(page: Page) {
  const classroom = page.getByRole("main", { name: "Sınıfım", exact: true });
  await expect(classroom).toBeVisible();
  const operations = classroom.locator("details.simple-classroom__operations");
  if ((await operations.getAttribute("open")) === null) {
    await operations.locator(":scope > summary").click();
  }
  await operations
    .getByRole("button", {
      name: /^Bugünün yoklaması (?:Çocuklara dokunarak işaretleyin|Tamamlandı)$/u,
    })
    .click();
}

async function revealTodayPlan(page: Page) {
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  const plans = page.getByRole("main", { name: "Planlar", exact: true });
  await expect(plans).toBeVisible();
  const plan = plans
    .getByRole("region", { name: "Neyi hazırlayacaksınız?" })
    .getByRole("button", { name: /Günlük eğitim planı/u });
  await expect(plan).toBeVisible();
  return plan;
}

test("sade Bugün ekranı kaldırılan gün-kapat kartını göstermez; yoklama ve plan akışını korur", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const runtimeErrors:string[]=[];page.on("pageerror", error=>runtimeErrors.push(error.name));
  await installCivilClock(page);
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
  expect(runtimeErrors).toEqual([]);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(page.getByRole("button",{name:/Ölçüm takvimi için eğitim yılını düzenle/})).toBeVisible();
  expect(runtimeErrors).toEqual([]);
  await page
    .getByRole("main", { name: "Sınıfım", exact: true })
    .getByRole("button", { name: "Çocuk ekle", exact: true })
    .click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill("Kurgu Gün Sonu Öğrencisi");
  await addStudent.getByRole("button", { name: "Kaydet ve kapat" }).click();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();

  await expect(page.getByTestId("teacher-day-close")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Günü kapat/ })).toHaveCount(0);
  await revealTodayPlan(page);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await openClassroomAttendance(page);
  const attendance = page.getByRole("dialog", {
    name: "Hızlı Dokunmatik Yoklama (E5)",
  });
  const student = attendance
    .locator(".qag-student-card")
    .filter({ hasText: "Kurgu Gün Sonu Öğrencisi" });
  await student.getByRole("button", { name: "Kurgu Gün Sonu Öğrencisi Geldi", exact: true }).click();
  await attendance
    .getByRole("button", { name: "Devam durumunu tamamla", exact: true })
    .click();
  await expect(attendance).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await openClassroomAttendance(page);
  await expect(
    page
      .getByRole("dialog", { name: "Hızlı Dokunmatik Yoklama (E5)" })
      .locator(".qag-student-card")
      .filter({ hasText: "Kurgu Gün Sonu Öğrencisi" })
      .getByRole("button", { name: "Kurgu Gün Sonu Öğrencisi Geldi", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await (await revealTodayPlan(page)).click();
  await page.getByRole("dialog", { name: "Planı adım adım tamamla", exact: true }).getByRole("button", { name: "Kendim planla", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Günlük plan oluşturma" })).toBeVisible();
});
