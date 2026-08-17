import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

test("yaklaşan eğitim yılı öğretmen kararıyla bugün gerçek kayıt kullanımına açılır", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Hazırlık Kurgu Sınıfı");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2099-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2100-08-31");
  await expect(setup.getByText("Yeni dönem hazır")).toBeVisible();
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

  const warning = page.getByRole("alert", { name: "Eğitim yılı hazırlık uyarısı" });
  await expect(warning.getByText("Hazırlık modu açık")).toBeVisible();
  await expect(warning).toContainText("çalışmayı bugün başlatıp");
  await expect(warning).toContainText("Takvim başlangıcı 2099-09-01");
  await expect(warning.getByRole("button", { name: "Çalışmayı bugün başlat" })).toBeVisible();
  await expect(page.locator(".teacher-control")).toHaveCount(0);
  await expect(page.getByTestId("teacher-day-close")).toHaveCount(0);
  await expect(page.getByTestId("current-work")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Günün planı" })).toHaveCount(0);
  await expect(page.getByTestId("teacher-work-cycle")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Günlük plan oluştur" })).toHaveCount(0);

  const childName = "Hazırlık Kurgu Öğrencisi";
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "İlk çocuğu ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill(childName);
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page.keyboard.press("Escape");
  const quickObservation = page.getByRole("button", {
    name: `${childName} için gözlem ekle`,
  });
  await expect(quickObservation).toBeDisabled();
  await expect(quickObservation).toHaveAttribute(
    "aria-describedby",
    "academic-year-mode-copy",
  );
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await page
    .getByRole("button", { name: "Çalışmayı bugün başlat" })
    .last()
    .click();
  await expect(warning).toBeHidden();
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(quickObservation).toBeEnabled();
  await expect(
    page.getByRole("dialog", { name: "Yeni kayıtlar güvenlik için durduruldu" }),
  ).toBeHidden();
});

test("boş sınıf ile arama sonucu olmayan sınıf farklı ve eyleme dönük metin gösterir", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Boş Kurgu Sınıfı");
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

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(page.getByText("Henüz çocuk eklenmedi", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "İlk çocuğu ekle", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "İlk çocuğu ekle", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill("Arama Kurgu Öğrencisi");
  await page.getByRole("button", { name: "Ekle", exact: true }).click();

  await page.getByLabel("Öğrenci ara").fill("olmayan");
  await expect(page.getByText("Eşleşen çocuk bulunamadı", { exact: true })).toBeVisible();
  await expect(page.getByText("Arama ifadesini değiştirerek yeniden deneyin.")).toBeVisible();
});
