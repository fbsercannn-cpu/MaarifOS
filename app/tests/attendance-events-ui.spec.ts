import { expect, test, type Page } from "@playwright/test";

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Yoklama 2 Kurgu Sınıfı");
  await setup.getByLabel("Yaş grubu").selectOption({ label: "60–72 ay" });
  await setup.getByLabel("Çalışma düzeni").selectOption("morning");
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();
}

async function addChild(page: Page, name: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill(name);
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
}

async function openAttendanceDetail(page: Page, childName: string) {
  await page.getByRole("button", { name: /Bugünkü devam/ }).click();
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
  await expect(page.getByTestId("persistence-status")).toContainText("Kaydedildi");
  await attendance.getByRole("button", { name: `${childName} için yoklama ayrıntısını aç` }).click();
  detail = page.getByRole("dialog", { name: new RegExp(`${childName}.*yoklama ayrıntısı`) });
  const remainingEvents = detail.getByRole("region", { name: "Bugünün ayrıntıları" });
  await expect(remainingEvents.getByText("Erken ayrılma", { exact: true })).toHaveCount(0);
  await expect(remainingEvents.getByText("Giriş", { exact: true })).toBeVisible();

  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: new RegExp(`${childName}.*profil`, "i") })
    .click();
  const history = page.getByRole("region", { name: "Yoklama geçmişi" });
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
