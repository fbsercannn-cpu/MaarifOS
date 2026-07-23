import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function ensureClassroomConfigured(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  if (await setup.isVisible().catch(() => false)) {
    await setup.getByLabel("Sınıf adı").fill("Kurgu Test Sınıfı");
    await setup
      .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
      .click();
    await expect(setup).toBeHidden();
  }
}

async function addChild(page: Page, name: string) {
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByLabel("Çocuğun adı").fill(name);
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await expect(page.getByRole("button", { name: `${name} çocuğunu sınıftan ayır` })).toBeVisible();
  await page.keyboard.press("Escape");
}

test("çocuk ekleme, sınıftan ayırma ve geri alma yeniden açılışta korunur", async ({ page }) => {
  const childName = "Kurgu Çocuk Yeni";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);
  await addChild(page, "Kurgu Çocuk İkinci");

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: `${childName} çocuğunu sınıftan ayır` }).click();
  await expect(page.getByRole("button", { name: `${childName} çocuğunu sınıfa geri al` })).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: `${childName} çocuğunu sınıfa geri al` }).click();
  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(page.getByRole("button", { name: `${childName} çocuğunu sınıftan ayır` })).toBeVisible();
});

test("cihaz verisi kalıcıdır; yedek doğrulanır ve replace geri yükleme veri kaybını önler", async ({
  page,
}, testInfo) => {
  const childName = "Ada Kurgu";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await expect(page.getByText("Veriler bu cihazda saklanıyor · çevrimdışı çalışır")).toBeVisible();
  await expect(page.getByRole("button", { name: /Google ile giriş/ })).toBeDisabled();

  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Yedek oluştur/ }).click();
  const backup = await backupDownload;
  const backupPath = await backup.path();
  if (!backupPath) throw new Error(`Playwright yedek dosya yolunu oluşturamadı: ${testInfo.title}`);
  const envelope = JSON.parse(await readFile(backupPath, "utf8"));
  expect(envelope.manifest.format).toBe("maarifos-json");
  expect(envelope.manifest.payloadChecksum).toMatch(/^[0-9a-f]{64}$/);
  expect(envelope.manifest.entityCounts.students).toBe(1);
  const backedUpRecordCount = Object.values(envelope.manifest.entityCounts).reduce(
    (total: number, count) => total + Number(count),
    0,
  );

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Kayıt ekle", exact: true }).click();
  await page.getByLabel("Ne oldu?").fill("Kurgu test gözlemi; yedek geri yükleme sonrasında kaldırılmalı.");
  await page.getByRole("button", { name: "Kaydı sakla" }).click();
  await expect(page.getByText("1 kayıt bekliyor")).toBeVisible();

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await page.getByLabel("MaarifOS yedek dosyası seç").setInputFiles(backupPath);
  await expect(page.getByText("Yedek bütünlük kontrolünü geçti. Geri yükleme modunu seçin.")).toBeVisible();
  await expect(page.getByText(`${backedUpRecordCount} kayıt`, { exact: false })).toBeVisible();

  const safetyDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Bu cihazdaki verilerin yerine yükle" }).click();
  const safety = await safetyDownload;
  expect(safety.suggestedFilename()).toMatch(/^maarifos-geri-yukleme-oncesi-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByText(/Geri yükleme tamamlandı/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("0 kayıt bekliyor")).toBeVisible();

  await page.getByRole("button", { name: /Devam\s+1\/1/ }).click();
  await page.getByRole("button", { name: new RegExp(childName) }).click();
  await expect(page.getByRole("button", { name: "Son değişikliği geri al" })).toBeVisible();
  await page.getByRole("button", { name: "Son değişikliği geri al" }).click();
  await expect(page.getByRole("button", { name: new RegExp(childName) }).getByText("Geldi", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(childName) }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Devam durumunu tamamla", exact: true }).click();
  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: /Devam\s+1\/1/ }).click();
  await expect(page.getByRole("button", { name: new RegExp(childName) }).getByText("Geç geldi", { exact: true })).toBeVisible();
});

test("bozuk yedek mevcut veriye dokunmadan Türkçe hata verir", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await expect(page.getByText("Veriler bu cihazda saklanıyor · çevrimdışı çalışır")).toBeVisible();
  await page.getByLabel("MaarifOS yedek dosyası seç").setInputFiles({
    name: "bozuk-maarifos-yedegi.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"manifest":{"backupVersion":1},"payload":{}}', "utf8"),
  });
  await expect(
    page.getByText("Bu yedek açılamadı: dosya bozuk, değiştirilmiş veya desteklenmiyor."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
});

test("ikinci sekmedeki gözlem eski devam durumunu geri ezmez", async ({ context, page }) => {
  const childName = "Çift Sekme Çocuğu";
  await page.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, childName);

  const stalePage = await context.newPage();
  await stalePage.goto("/", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(stalePage);
  await stalePage.getByRole("button", { name: /Devam\s+1\/1/ }).click();
  await expect(stalePage.getByRole("button", { name: new RegExp(childName) }).getByText("Geldi", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Devam\s+1\/1/ }).click();
  await page.getByRole("button", { name: new RegExp(childName) }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Devam durumunu tamamla", exact: true }).click();

  await stalePage.keyboard.press("Escape");
  await stalePage.getByRole("button", { name: "Kayıt ekle", exact: true }).click();
  await stalePage.getByLabel("Ne oldu?").fill("İkinci sekmeden kurgu gözlem.");
  await stalePage.getByRole("button", { name: "Kaydı sakla" }).click();
  await expect(stalePage.getByText("1 kayıt bekliyor")).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await page.getByRole("button", { name: /Devam\s+1\/1/ }).click();
  await expect(page.getByRole("button", { name: new RegExp(childName) }).getByText("Geç geldi", { exact: true })).toBeVisible();
});
