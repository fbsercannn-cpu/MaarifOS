import { expect, test, type Page } from "@playwright/test";

const RELEASE_STORAGE_KEY = "maarifos.release.acknowledgement.v1";

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await expect(setup).toBeVisible();
  await setup.getByLabel("Sınıf adı").fill("Güneş Sınıfı");
  await setup.getByLabel("Yaş grubu").selectOption({ label: "60–72 ay" });
  await setup.getByLabel("Çalışma düzeni").selectOption("morning");
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup.getByRole("button", {
    name: "Sınıfı ve çalışma düzenini kaydet",
  }).click();
  await expect(setup).toBeHidden();
}

test("boş yeni kurulum yanıltıcı güncellendi bildirimi göstermez", async ({
  page,
}) => {
  await page.goto("/?native=1");

  await expect(
    page.getByRole("dialog", { name: "MaarifOS güncellendi" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Sınıf kurulumu" }),
  ).toBeVisible();
});

test("eski sürümden sonra tarihli notları bir kez gösterir ve ayarlarda korur", async ({
  page,
}) => {
  await page.goto("/?native=1");
  await configureClassroom(page);
  await page.evaluate((storageKey) => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        schemaVersion: 1,
        firstSeenVersion: "0.1.0",
        acknowledgedVersion: "0.2.0",
        acknowledgedAt: "2026-07-22T06:00:00.000Z",
      }),
    );
  }, RELEASE_STORAGE_KEY);

  await page.reload();

  const updateDialog = page.getByRole("dialog", {
    name: "MaarifOS güncellendi",
  });
  await expect(updateDialog).toBeVisible();
  await expect(updateDialog).toContainText("Sürüm 0.9.1");
  await expect(updateDialog).toContainText("9 Ağustos 2026");
  await expect(updateDialog).toContainText(
    "Çevrim dışı güncelleme güvenliği güçlendirildi",
  );
  await expect(updateDialog).toContainText("Sürüm 0.2.0 → 0.9.1");
  await expect(updateDialog).toContainText("Kayıtlarınız korundu");
  await updateDialog.getByRole("button", {
    name: "Harika, başlayalım",
  }).click();
  await expect(updateDialog).toBeHidden();

  await page.reload();
  await expect(
    page.getByRole("dialog", { name: "MaarifOS güncellendi" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  const settings = page.getByRole("dialog", {
    name: "Hesap ve veri güvenliği",
  });
  await expect(settings).toContainText("MaarifOS 0.9.1");
  await expect(settings).toContainText("9 Ağustos 2026");
  await settings.getByRole("button", {
    name: "Sürüm notlarını göster",
  }).click();
  await expect(settings).toContainText(
    "Bekleyen yeni sürümün sağlık denetimi artık çalışan sürümün çevrim dışı önbelleğini",
  );
});

test("sürüm kaydı olmayan mevcut Emine kurulumu ilk yükseltmeyi görür", async ({
  page,
}) => {
  await page.goto("/?native=1");
  await configureClassroom(page);
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, RELEASE_STORAGE_KEY);

  await page.reload();

  const updateDialog = page.getByRole("dialog", {
    name: "MaarifOS güncellendi",
  });
  await expect(updateDialog).toBeVisible();
  await expect(updateDialog).toContainText("Sürüm 0.9.1");
  await expect(updateDialog).not.toContainText("Sürüm 0.2.0 → 0.9.1");
});

test("güncelleme hazır olayı açık öğretmen girdisini zorla yenilemez", async ({
  page,
}) => {
  await page.goto("/?native=1");
  await configureClassroom(page);

  await page.getByRole("button", { name: "Sınıfım" }).click();
  await page
    .getByRole("button", { name: "Çocuk ekle", exact: true })
    .click();
  const addSheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  const studentName = addSheet.getByLabel("Çocuğun adı");
  await studentName.fill("Kaydedilmemiş öğretmen girdisi");

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("maarifos:update-ready"));
  });

  await expect(studentName).toHaveValue("Kaydedilmemiş öğretmen girdisi");
  await addSheet.press("Escape");
  await expect(addSheet).toBeHidden();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Şimdi güncelle" }),
  ).toBeVisible();
});
