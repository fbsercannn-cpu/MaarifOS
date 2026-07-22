import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("yerel kasa kalıcıdır; yedek doğrulanır ve replace geri yükleme veri kaybını önler", async ({
  page,
}, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Hesap ve veri güvenliğini aç" }).click();
  await expect(page.getByText("Yerel veri kasası hazır · çevrimdışı çalışır")).toBeVisible();
  await expect(page.getByRole("button", { name: /Google ile giriş/ })).toBeDisabled();

  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Yedek oluştur/ }).click();
  const backup = await backupDownload;
  const backupPath = await backup.path();
  if (!backupPath) throw new Error(`Playwright yedek dosya yolunu oluşturamadı: ${testInfo.title}`);
  const envelope = JSON.parse(await readFile(backupPath, "utf8"));
  expect(envelope.manifest.format).toBe("maarifos-json");
  expect(envelope.manifest.payloadChecksum).toMatch(/^[0-9a-f]{64}$/);
  expect(envelope.manifest.entityCounts.students).toBe(18);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Hızlı gözlem ekle" }).click();
  await page.getByLabel("Ham gözlem").fill("Kurgu test gözlemi; yedek geri yükleme sonrasında kaldırılmalı.");
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  await expect(page.getByText("Bugün 1 hızlı gözlem kaydedildi.")).toBeAttached();

  await page.getByRole("button", { name: "Hesap ve veri güvenliğini aç" }).click();
  await page.getByLabel("MaarifOS yedek dosyası seç").setInputFiles(backupPath);
  await expect(page.getByText("Yedek bütünlük kontrolünü geçti. Geri yükleme modunu seçin.")).toBeVisible();
  await expect(page.getByText(/19 kayıt/)).toBeVisible();

  const safetyDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tümünü değiştir" }).click();
  const safety = await safetyDownload;
  expect(safety.suggestedFilename()).toMatch(/^maarifos-geri-yukleme-oncesi-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByText(/Geri yükleme tamamlandı/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Bugün 0 hızlı gözlem kaydedildi.")).toBeAttached();

  await page.getByRole("button", { name: "Yoklamayı tamamla", exact: true }).first().click();
  await page.getByRole("button", { name: /Ada Yalın/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Yoklamayı tamamla", exact: true }).click();
  await page.waitForTimeout(250);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Yoklamayı düzenle", exact: true }).click();
  await expect(page.getByRole("button", { name: /Ada Yalın/ }).getByText("Geç", { exact: true })).toBeVisible();
});

test("bozuk yedek mevcut veriye dokunmadan Türkçe hata verir", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Hesap ve veri güvenliğini aç" }).click();
  await expect(page.getByText("Yerel veri kasası hazır · çevrimdışı çalışır")).toBeVisible();
  await page.getByLabel("MaarifOS yedek dosyası seç").setInputFiles({
    name: "bozuk-maarifos-yedegi.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"manifest":{"backupVersion":1},"payload":{}}', "utf8"),
  });
  await expect(
    page.getByText("Bu yedek açılamadı: dosya bozuk, değiştirilmiş veya desteklenmiyor."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Toplam 18 çocuk")).toBeAttached();
});
