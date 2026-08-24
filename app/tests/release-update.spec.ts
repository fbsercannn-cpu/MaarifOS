import { expect, test, type Page } from "@playwright/test";

const RELEASE_STORAGE_KEY = "maarifos.release.acknowledgement.v1";

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible();
  await setup.getByLabel("Okul adı").fill("Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Emine Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Güneş Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu")
    .selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
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
    page.getByRole("dialog", { name: "Sınıfını hazırla" }),
  ).toBeVisible();
});

test("eski sürümden sonra güncellemeyi sessizce kaydeder ve tarihli notları ayarlarda korur", async ({
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

  await expect(
    page.getByRole("dialog", { name: "MaarifOS güncellendi" }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "MaarifOS 0.16.0 sade Maarif Modeli sürümü kullanıma hazır.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect.poll(async () => page.evaluate((storageKey) => {
    const value = window.localStorage.getItem(storageKey);
    return value ? JSON.parse(value).acknowledgedVersion : null;
  }, RELEASE_STORAGE_KEY)).toBe("0.16.0");

  await page.reload();
  await expect(
    page.getByRole("dialog", { name: "MaarifOS güncellendi" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  const settings = page.getByRole("dialog", {
    name: "Hesap ve veri güvenliği",
  });
  await expect(settings).toContainText("MaarifOS 0.16.0");
  await expect(settings).toContainText("22 Ağustos 2026");
  await settings.getByRole("button", {
    name: "Sürüm notlarını göster",
  }).click();
  await expect(settings).toContainText(
    "Etkinlik bankası 120 özgün çekirdek etkinliğe",
  );
});

test("sürüm kaydı olmayan mevcut Emine kurulumu ilk yükseltmeyi sessizce kaydeder", async ({
  page,
}) => {
  await page.goto("/?native=1");
  await configureClassroom(page);
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, RELEASE_STORAGE_KEY);

  await page.reload();

  await expect(
    page.getByRole("dialog", { name: "MaarifOS güncellendi" }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "MaarifOS 0.16.0 sade Maarif Modeli sürümü kullanıma hazır.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect.poll(async () => page.evaluate((storageKey) => {
    const value = window.localStorage.getItem(storageKey);
    return value ? JSON.parse(value).acknowledgedVersion : null;
  }, RELEASE_STORAGE_KEY)).toBe("0.16.0");
});

test("güncelleme hazır olayı açık öğretmen girdisini zorla yenilemez", async ({
  page,
}) => {
  await page.goto("/?native=1");
  await configureClassroom(page);

  await page.getByRole("button", { name: "Sınıfım" }).click();
  await page.getByRole("button", { name: "İlk öğrenciyi ekle", exact: true }).click();
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
    page.getByRole("button", { name: /MaarifOS 0\.16\.0 hazır.*Yenile/ }),
  ).toBeVisible();
});

test("ana ekran ve Ayarlar bekleyen worker'ın gerçek sürümünü gösterir", async ({
  page,
}) => {
  await page.goto("/?native=1");
  await configureClassroom(page);

  await page.evaluate(() => {
    const status = {
      phase: "update-ready",
      offlineReady: true,
      version: "0.11.0",
      activeVersion: "0.10.0",
      updateVersion: "0.11.0",
      lastCheckedAt: "2026-08-09T10:00:00.000Z",
      message: "Yeni sürüm hazır; açık kaydınızı tamamladıktan sonra güncelleyebilirsiniz.",
    };
    (window as Window & { __maarifosPwaStatus?: typeof status }).__maarifosPwaStatus = status;
    window.dispatchEvent(
      new CustomEvent("maarifos:pwa-status", { detail: status }),
    );
  });

  await expect(page.getByText("MaarifOS 0.11.0 hazır", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ayarları aç" }).click();
  const settings = page.getByRole("dialog", {
    name: "Hesap ve veri güvenliği",
  });
  await expect(settings).toContainText("Çevrim dışı paket 0.10.0");
  await expect(settings).toContainText("0.11.0 hazır");
  await expect(
    settings.getByRole("button", {
      name: "0.11.0 sürümüne güvenle güncelle",
    }),
  ).toBeEnabled();
});
