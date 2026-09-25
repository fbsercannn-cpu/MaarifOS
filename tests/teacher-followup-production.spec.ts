import { test, expect } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const fixtureBase = resolve("output/completion-2026-09-07/security/teacher-followup-production-fixture");
const metadata = JSON.parse(await readFile(`${fixtureBase}.metadata.json`, "utf8"));
if (metadata.synthetic !== true || metadata.workflowKinds.length !== 13) throw new Error("Eksiksiz sentetik üretim yedeği gerekli.");

test("üretim: 13 takip türü UI ile yedekten döner, çevrimdışı okunur ve aynı PDF önizlenip indirilir", async ({ page, context }) => {
  test.setTimeout(180000);
  await mkdir("output/completion-2026-09-07/production", { recursive: true });
  await page.clock.install({ time: new Date(metadata.nowUtc) });
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Üretim Okulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Üretim Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Geçici Sınıf");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as any).__maarifosPwaStatus?.offlineReady ?? false), { timeout: 90000 }).toBe(true);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await page.getByRole("button", { name: "Ayarları aç", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Hesap ve veri güvenliği", exact: true });
  await settings.getByLabel("MaarifOS yedek dosyası seç", { exact: true }).setInputFiles(`${fixtureBase}.maarifos`);
  await expect(settings.getByText("Şifreli yedek tanındı. İçeriği doğrulamak için parolayı girin.", { exact: true })).toBeVisible();
  await settings.getByLabel("Yedek parolası", { exact: true }).last().fill(metadata.password);
  await settings.getByRole("button", { name: "Yedeği aç ve doğrula", exact: true }).click();
  await expect(settings.getByText("Şifreli yedek doğrulandı. Geri yükleme modunu seçin.", { exact: true })).toBeVisible();
  await settings.getByRole("button", { name: "Bu cihazdaki verilerin yerine yükle", exact: true }).click();
  await expect(settings.getByText(/Geri yükleme tamamlandı/u)).toBeVisible({ timeout: 60000 });
  await page.keyboard.press("Escape");
  await context.setOffline(true);
  await page.goto("/classroom?native=1");
  await expect(page.getByRole("main", { name: "Sınıfım", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Öğretmen takipleri/u }).click();
  const followup = page.getByRole("dialog", { name: "Öğretmen takip defteri", exact: true });
  await expect(followup.getByTestId("teacher-followup-workspace")).toBeVisible();
  await followup.getByLabel("Takip çocuğu", { exact: true }).selectOption(metadata.studentId);
  const choices = [
    ["contacts", "İletişim bilgilerini doğrula"],
    ["pickup", "Günlük teslim defteri"],
    ["meetings", "Veli görüşmesi ve takip"],
    ["guide", "Uyum rehberinden öğretmen adımları"],
    ["learning", "Gözlem → öğretmen kararı → sonraki hafta"],
    ["preparation", "Haftalık malzeme ve hazırlık"],
  ];
  for (const [value, heading] of choices) {
    await followup.getByLabel("Takip çalışma alanı", { exact: true }).selectOption(value);
    await expect(followup.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    if (value === "contacts") await followup.locator("summary", { hasText: "Doğrulama geçmişi" }).click();
    expect(await followup.locator(".followup-record:visible").count()).toBeGreaterThan(0);
    await expect(followup.getByRole("alert")).toHaveCount(0);
  }
  await followup.getByLabel("Takip çalışma alanı", { exact: true }).selectOption("meetings");
  await followup.getByLabel("Görüşmeye katılanlar", { exact: true }).fill("Kurgu Üretim Velisi");
  await followup.getByLabel("Görüşülen konu ve aileden alınan bilgi", { exact: true }).fill("Çevrimdışı üretim görüşmesi kaydı.");
  await followup.getByLabel("Birlikte alınan karar / yapılacak iş", { exact: true }).fill("Kurgu takip yarın sürdürülecek.");
  await followup.getByRole("button", { name: "Görüşmeyi kaydet", exact: true }).click();
  await expect(followup.getByRole("status")).toHaveText("Takip kaydı kaydedildi.");
  await page.reload();
  await page.getByRole("button", { name: /Öğretmen takipleri/u }).click();
  await followup.getByLabel("Takip çocuğu", { exact: true }).selectOption(metadata.studentId);
  await followup.getByLabel("Takip çalışma alanı", { exact: true }).selectOption("meetings");
  await expect(followup.getByText("Çevrimdışı üretim görüşmesi kaydı.", { exact: true })).toBeVisible();
  await page.screenshot({ path: "output/completion-2026-09-07/production/followup-offline.png" });
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const original = URL.createObjectURL;
    URL.createObjectURL = function (value) { if (value instanceof Blob && value.type === "application/pdf") (window as any).__syntheticPreviewPdf = value; return original.call(URL, value); };
  });
  const classroom = page.getByRole("main", { name: "Sınıfım", exact: true });
  await classroom.locator("summary", { hasText: "Sınıf işlemleri" }).click();
  await classroom.getByRole("button", { name: /Sınıf listesi/u }).click();
  const preview = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  await expect(preview.locator("canvas[data-pdf-rendered=true]")).toBeVisible({ timeout: 60000 });
  const previewHash = await page.evaluate(async () => [...new Uint8Array(await crypto.subtle.digest("SHA-256", await (window as any).__syntheticPreviewPdf.arrayBuffer()))].map(v => v.toString(16).padStart(2, "0")).join(""));
  const download = page.waitForEvent("download");
  await preview.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
  const file = await download;
  await file.saveAs("output/completion-2026-09-07/production/offline-classroom.pdf");
  expect((await readFile("output/completion-2026-09-07/production/offline-classroom.pdf")).subarray(0, 5).toString()).toBe("%PDF-");
  expect(createHash("sha256").update(await readFile("output/completion-2026-09-07/production/offline-classroom.pdf")).digest("hex")).toBe(previewHash);
  await page.screenshot({ path: "output/completion-2026-09-07/production/pdf-offline.png" });
  const workerCached = await page.evaluate(async () => {
    for (const key of await caches.keys()) for (const request of await (await caches.open(key)).keys()) if (/pdf\.worker\.min-[\w-]+\.mjs/u.test(request.url)) return true;
    return false;
  });
  expect(workerCached).toBe(true);
  expect(pageErrors).toEqual([]);
});
