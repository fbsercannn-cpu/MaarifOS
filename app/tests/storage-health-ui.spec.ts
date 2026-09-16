import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Kasa Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kasa Kurgu Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Kasa Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup
    .locator("details")
    .filter({ hasText: "İleri ayarlar" })
    .locator("summary")
    .click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
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

test("yerel kasa yedek bütünlüğünü, exact geri yükleme tatbikatını ve reload kalıcılığını görünür kılar", async ({
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
  const savedBackup = await download;
  const savedBackupPath = await savedBackup.path();
  expect(savedBackupPath).not.toBeNull();

  await expect(health).toContainText("Son şifreli yedek 0 gün önce başarıyla alındı");
  await expect(health.getByRole("time")).toBeVisible();
  await expect(page.locator(".backup-recovery-health")).toHaveAttribute(
    "data-state",
    "drill-required",
  );

  await page
    .getByLabel("MaarifOS yedek dosyası seç")
    .setInputFiles(savedBackupPath!);
  await page.locator("#restore-password").fill(passphrase);
  await page.getByRole("button", { name: "Yedeği aç ve doğrula" }).click();
  await page
    .getByRole("button", { name: "Bu cihazdaki verilerin yerine yükle" })
    .click();

  await expect(page.locator(".backup-recovery-health")).toHaveAttribute(
    "data-state",
    "drill-verified",
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await expect(page.locator(".backup-recovery-health")).toHaveAttribute(
    "data-state",
    "drill-verified",
  );
});
