import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Yoklama 2 Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Yoklama 2 Kurgu Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Yoklama 2 Kurgu Sınıfı");
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

async function addChild(page: Page, name: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill(name);
  await addStudent.getByRole("button", { name: "Kaydet ve kapat" }).click();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
}

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

async function openAttendanceDetail(page: Page, childName: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await openClassroomAttendance(page);
  const attendance = page.getByRole("dialog", { name: "Bugünün devam durumu" });
  const detailTrigger = attendance.getByRole("button", {
    name: `${childName} için yoklama ayrıntısını aç`,
  });
  await expect(detailTrigger).toBeVisible();
  await detailTrigger.click();
  return page.getByRole("dialog", { name: new RegExp(`${childName}.*yoklama ayrıntısı`) });
}

test("giriş şimdi, erken ayrılma, undo, reload ve öğrenci geçmişi birlikte korunur", async ({
  page,
}) => {
  const childName = "Kurgu Yoklama Öğrencisi";
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await addChild(page, childName);

  let detail = await openAttendanceDetail(page, childName);
  await detail.getByRole("button", { name: "Giriş şimdi" }).click();
  const todayEvents = detail.getByRole("region", { name: "Bugünün ayrıntıları" });
  await expect(todayEvents.getByText("Giriş", { exact: true })).toBeVisible();
  await expect(todayEvents.locator("li").first()).toContainText(/\d{2}:\d{2}/);
  await expect(page.locator(".sr-live")).toHaveText(`${childName}: Giriş kaydedildi.`);

  await page.keyboard.press("Escape");
  await page.reload({ waitUntil: "networkidle" });
  detail = await openAttendanceDetail(page, childName);
  await expect(
    detail.getByRole("region", { name: "Bugünün ayrıntıları" }).getByText("Giriş", { exact: true }),
  ).toBeVisible();

  await detail.getByLabel("Olay").selectOption("early_departure");
  await detail.getByLabel("Saat").fill("12:30");
  await detail.getByLabel(/Neden/).fill("Kurgu aile randevusu");
  await detail.getByLabel(/Öğretmen notu/).fill("Kurgu teslim notu");
  await detail.getByRole("button", { name: "Ayrıntıyı kaydet" }).click();
  await expect(todayEvents.getByText("Erken ayrılma", { exact: true })).toBeVisible();
  await expect(todayEvents).toContainText("12:30");
  await expect(todayEvents).toContainText("Kurgu aile randevusu");
  await expect(page.locator(".sr-live")).toHaveText(
    `${childName}: Erken ayrılma kaydedildi.`,
  );

  await page.keyboard.press("Escape");
  const attendance = page.getByRole("dialog", { name: "Bugünün devam durumu" });
  await attendance.getByRole("button", { name: "Son değişikliği geri al" }).click();
  await expect(page.locator(".sr-live")).toHaveText(
    `${childName} için Erken ayrılma olayı geri alındı.`,
  );
  await attendance.getByRole("button", { name: `${childName} için yoklama ayrıntısını aç` }).click();
  detail = page.getByRole("dialog", { name: new RegExp(`${childName}.*yoklama ayrıntısı`) });
  const remainingEvents = detail.getByRole("region", { name: "Bugünün ayrıntıları" });
  await expect(remainingEvents.getByText("Erken ayrılma", { exact: true })).toHaveCount(0);
  await expect(remainingEvents.getByText("Giriş", { exact: true })).toBeVisible();

  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.reload({ waitUntil: "networkidle" });
  await page
    .locator("button.simple-student-list__profile")
    .filter({ hasText: childName })
    .click();
  const profile = page.getByRole("dialog", {
    name: `${childName} profili`,
    exact: true,
  });
  const archive = profile.locator("details.student-profile-context-details");
  if ((await archive.getAttribute("open")) === null) {
    await archive.locator(":scope > summary").click();
  }
  const history = profile.getByRole("region", { name: "Yoklama geçmişi" });
  await expect(history).toContainText("Geldi · Giriş");
  await expect(history).not.toContainText("Erken ayrıldı");
});

test("mazeret nedeni ve özel kısmi gün saat sırası alan içinde doğrulanır", async ({
  page,
}) => {
  const childName = "Kurgu Mazeret Öğrencisi";
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await addChild(page, childName);
  const detail = await openAttendanceDetail(page, childName);

  await detail.getByLabel("Olay").selectOption("excuse");
  await detail.getByRole("button", { name: "Ayrıntıyı kaydet" }).click();
  await expect(detail.getByRole("alert")).toContainText("kısa bir neden");

  await detail.getByLabel("Olay").selectOption("partial_day");
  await detail.getByLabel("Kısmi gün dönemi").selectOption("custom");
  await detail.getByLabel("Başlangıç").fill("14:00");
  await detail.getByLabel("Bitiş").fill("10:00");
  await detail.getByRole("button", { name: "Ayrıntıyı kaydet" }).click();
  await expect(detail.getByRole("alert")).toContainText(
    "başlangıç saati bitiş saatinden önce",
  );
  await expect(
    page.getByRole("dialog", { name: "Yeni kayıtlar güvenlik için durduruldu" }),
  ).toBeHidden();
});
