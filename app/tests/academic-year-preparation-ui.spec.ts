import { expect, test } from "@playwright/test";

test("yaklaşan eğitim yılı hazırlık modunda uyarır ve eğitimsel yazıları kapatır", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Hazırlık Kurgu Sınıfı");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2099-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2100-08-31");
  await expect(setup.getByText("Seçili tarihler bugün etkin değil")).toBeVisible();
  await setup.getByLabel("Yaş grubu").selectOption({ label: "60–72 ay" });
  await setup.getByLabel("Çalışma düzeni").selectOption("morning");
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();

  const warning = page.getByRole("alert", { name: "Eğitim yılı hazırlık uyarısı" });
  await expect(warning.getByText("Hazırlık modu açık")).toBeVisible();
  await expect(warning).toContainText("2099-09-01 tarihinde başlayacak");
  await expect(warning.getByRole("button", { name: "Eğitim yılını aç" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Bugünkü devam/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Günlük plan oluştur" })).toHaveCount(0);

  const childName = "Hazırlık Kurgu Öğrencisi";
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
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
  await setup.getByLabel("Yaş grubu").selectOption({ label: "60–72 ay" });
  await setup.getByLabel("Çalışma düzeni").selectOption("morning");
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(page.getByText("Henüz çocuk eklenmedi", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Çocuk ekle", exact: true }).last()).toBeVisible();

  await page.getByLabel("Öğrenci ara").fill("olmayan");
  await expect(page.getByText("Eşleşen çocuk bulunamadı", { exact: true })).toBeVisible();
  await expect(page.getByText("Arama ifadesini değiştirerek yeniden deneyin.")).toBeVisible();
});
