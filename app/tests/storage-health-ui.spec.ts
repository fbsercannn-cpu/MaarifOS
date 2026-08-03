import { expect, test, type Page } from "@playwright/test";

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Kasa Kurgu Sınıfı");
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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        persist: async () => true,
        estimate: async () => ({ usage: 85, quota: 100 }),
      },
    });
  });
});

test("yerel kasa kalıcılık, kota eşiği ve son başarılı yedeği görünür kılar", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);
  await page.getByRole("button", { name: "Ayarları aç" }).click();

  const health = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Yerel kasa durumu" }),
  });
  await expect(health).toContainText("kalıcı depolama kapsamında koruyor");
  await expect(health).toContainText("%85'i kullanılıyor");
  await expect(health).toContainText("Alan %80 eşiğini geçti");
  await expect(health).toContainText("başarılı şifreli yedek kaydı yok");

  const passphrase = "Kurgu-Kasa-2026!";
  await page.getByLabel("Yedek parolası").fill(passphrase);
  await page.getByLabel("Parolayı doğrula").fill(passphrase);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Şifreli yedek oluştur/ }).click();
  await download;

  await expect(health).toContainText("Son şifreli yedek 0 gün önce başarıyla alındı");
  await expect(health.getByRole("time")).toBeVisible();
});
