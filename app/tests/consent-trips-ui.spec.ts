import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
const production = process.env.CONSENT_TRIP_PRODUCTION === "1";
const output = `output/consent-trips-2026-09-08/${production ? "production" : "dev"}`;
const childName = "Kurgu Gezi Çocuğu";
const docTitle = "Kurgu müze gezisi veli izin belgesi";
async function setup(page: Page, width = 390) {
  await mkdir(output, { recursive: true }); await page.setViewportSize({ width, height: 844 });
  await page.clock.install({ time: new Date("2026-09-18T09:00:00.000Z") });
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Anaokulu"); await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen"); await setup.getByLabel("Sınıf adı").fill("Kurgu Gezi Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" }); await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click(); await expect(setup).toBeHidden();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click(); const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await add.getByLabel("Çocuğun adı", { exact: true }).fill(childName); await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click(); await expect(add).toBeHidden();
  if (production) {
    await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __maarifosPwaStatus?: { offlineReady?: boolean } }).__maarifosPwaStatus?.offlineReady)), { timeout: 60000 }).toBe(true);
    await page.context().setOffline(true); await page.reload({ waitUntil: "domcontentloaded" });
  }
}
async function open(page: Page, section = "consents") {
  await page.getByRole("region", { name: "Sınıf yönetimi işleri", exact: true }).getByRole("button").first().click();
  const dialog = page.getByRole("dialog", { name: "Sınıf yönetimi", exact: true });
  await dialog.getByLabel("Sınıf yönetimi alanı").selectOption(section);
  await expect(dialog.getByTestId("consent-trips-workspace")).toBeVisible(); return dialog;
}
async function state(page: Page) {
  return page.evaluate(async () => { const { IndexedDbDataStore } = await import("/src/core/index.ts"); const store = new IndexedDbDataStore(); try { const s = await store.readSnapshot(); return s.settings.filter(r => r.settingType === "consent-trip-v1"); } finally { store.close(); } });
}
async function defineDocument(dialog: Locator) {
  await dialog.getByRole("button", { name: "Yeni izin belgesi tanımla", exact: true }).click();
  await dialog.getByLabel("Belge başlığı", { exact: true }).fill(docTitle); await dialog.getByLabel("İzin verilen gezi / etkinlik", { exact: true }).fill("Kurgu Müze Gezisi");
  await dialog.getByLabel("Belge metni (isteğe bağlı)", { exact: true }).fill("Kurgu müze gezisi için belirtilen tarih ve etkinliğe ilişkin veli kararı kaydedilir.");
  await dialog.getByRole("button", { name: "Belge tanımını kaydet", exact: true }).click(); await expect(dialog.getByLabel("İzin belgesi", { exact: true })).not.toHaveValue("");
}
async function grant(dialog: Locator, revoke = false) {
  await dialog.getByLabel("İzin çocuğu", { exact: true }).selectOption({ label: childName });
  if (revoke) await dialog.getByLabel("Veli izin kararı").selectOption("revoke");
  await dialog.getByLabel("İmzalayan / beyanda bulunan kişi", { exact: true }).fill("Kurgu Veli"); await dialog.getByLabel("Yakınlığı / belge üzerindeki sıfatı", { exact: true }).fill("Anne");
  await dialog.getByLabel("Kaynak belge / dosya açıklaması", { exact: true }).fill("Kurgu izin dosyası, sayfa 1");
  if (revoke) await dialog.getByLabel("Geri çekme gerekçesi", { exact: true }).fill("Veli yeni kararını yazılı bildirdi.");
  await dialog.getByRole("checkbox", { name: "Belge sürümünü ve veli kararının kaynağını kontrol ettim" }).click();
  await dialog.getByRole("button", { name: "Veli kararını kaydet", exact: true }).click(); await expect(dialog.locator(".consent-state")).toContainText(revoke ? "Geri çekildi" : "İzin kayıtlı");
}
async function plan(dialog: Locator) {
  await dialog.getByRole("button", { name: "Gezi sayımı", exact: true }).click(); await dialog.getByRole("button", { name: "Yeni gezi planla", exact: true }).click();
  await dialog.getByLabel("Gezi adı", { exact: true }).fill("Kurgu Müze Gezisi"); await dialog.getByLabel("Gidilecek yer", { exact: true }).fill("Kurgu Müze"); await dialog.getByLabel("Gezi sorumlusu", { exact: true }).fill("Kurgu Öğretmen");
  await dialog.getByLabel("Gezi izin belgesi", { exact: true }).selectOption({ label: `${docTitle} · v1 · Kurgu Müze Gezisi` }); await dialog.getByRole("checkbox", { name: childName, exact: true }).click();
  await dialog.getByRole("button", { name: "Gezi planını kaydet", exact: true }).click(); await expect(dialog.getByLabel("Gezi", { exact: true })).not.toHaveValue("");
}
for (const width of [320, 390]) test(`${width}px: belge ve izin geziyi açar, dönüş düzeltmesi ve PDF/reload kaynakları korur`, async ({ page }) => {
  await setup(page, width); let dialog = await open(page); await defineDocument(dialog); await plan(dialog);
  await expect(dialog.getByRole("button", { name: "Kadroyu kilitle ve geziyi başlat", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Veli izinleri", exact: true }).click(); await grant(dialog);
  await dialog.getByRole("button", { name: "İzin çizelgesi PDF önizle", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true }); await expect(preview.locator("canvas").first()).toBeVisible(); await expect(preview.locator("canvas").first()).toHaveAttribute("data-pdf-rendered", "true");
  const download = page.waitForEvent("download"); await preview.getByRole("button", { name: "Bu PDF’yi indir", exact: true }).or(preview.getByRole("button", { name: "Bu PDF'yi indir", exact: true })).click(); const file = await download;
  const path = await file.path(); expect(path).toBeTruthy(); expect((await readFile(path!)).subarray(0, 5).toString()).toBe("%PDF-");
  await file.saveAs(`${output}/consent-${width}.pdf`);
  await preview.locator("canvas").first().scrollIntoViewIfNeeded(); await preview.locator("canvas").first().screenshot({ path: `${output}/consent-pdf-page-${width}.png` });
  await page.screenshot({ path: `${output}/consent-pdf-${width}.png` }); await preview.getByRole("button", { name: "PDF önizlemesini kapat", exact: true }).click(); await expect(preview).toBeHidden();
  await dialog.getByRole("button", { name: "Gezi sayımı", exact: true }).click(); await dialog.getByRole("button", { name: "Kadroyu kilitle ve geziyi başlat", exact: true }).click();
  const row = dialog.locator(".consent-roster > li").filter({ hasText: childName }); await row.getByRole("button", { name: "Görüldü", exact: true }).click();
  await dialog.getByLabel("Sayım aşaması").selectOption("return"); await row.getByRole("button", { name: "Görülmedi", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Bütün dönüşleri tamamla", exact: true })).toBeDisabled(); await expect(dialog.locator(".consent-counts")).toContainText("0 / 1");
  await row.getByRole("button", { name: "Sayımı düzelt", exact: true }).click(); await row.getByLabel("Düzeltilmiş sayım").selectOption("seen"); await row.getByLabel("Sayım düzeltme gerekçesi").fill("Çocuk öğretmenin yanında yeniden sayıldı."); await row.getByRole("button", { name: "Gerekçeli sayımı kaydet", exact: true }).click();
  await expect(dialog.locator(".consent-counts")).toContainText("1 / 1"); await dialog.getByRole("button", { name: "Bütün dönüşleri tamamla", exact: true }).click();
  await expect(dialog.getByText("Bütün dönüşler tamamlandı", { exact: true })).toBeVisible();
  await dialog.locator(".consent-counts").scrollIntoViewIfNeeded(); expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true); await page.screenshot({ path: `${output}/trip-count-${width}.png` });
  if (width === 390) {
    await dialog.getByRole("button", { name: "Gezi çizelgesi PDF önizle", exact: true }).click();
    await expect(preview.locator("canvas").first()).toHaveAttribute("data-pdf-rendered", "true");
    const tripDownload = page.waitForEvent("download"); await preview.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click(); const tripFile = await tripDownload;
    await tripFile.saveAs(`${output}/trip-${width}.pdf`); await preview.locator("canvas").first().scrollIntoViewIfNeeded(); await preview.locator("canvas").first().screenshot({ path: `${output}/trip-pdf-page-${width}.png` });
    await preview.getByRole("button", { name: "PDF önizlemesini kapat", exact: true }).click(); await expect(preview).toBeHidden();
  }
  if (!production) { const records = await state(page); expect(records.filter(r => r.workflow.kind === "trip-check")).toHaveLength(3); }
  await page.reload(); dialog = await open(page, "trips"); await dialog.getByLabel("Gezi", { exact: true }).selectOption({ label: "Kurgu Müze Gezisi · 18.09.2026" }); await expect(dialog.getByText("Bütün dönüşler tamamlandı", { exact: true })).toBeVisible();
});
test("IDB: eski sekme sürümü reddedilir; kaynağın yeniden açılması ve geri çekme izlenir", async ({ page, context }) => {
  test.skip(production, "Bu senaryo geliştirici modül API'siyle iki sekme komut yarışını doğrular.");
  await setup(page); const dialog = await open(page); await defineDocument(dialog); await grant(dialog); await plan(dialog); await dialog.getByRole("button", { name: "Kadroyu kilitle ve geziyi başlat", exact: true }).click();
  await expect(dialog.getByText("Sayım sürüyor", { exact: true })).toBeVisible();
  const prior = await state(page); const start = prior.find(r => r.workflow.kind === "trip-start")!; const planRecord = prior.find(r => r.workflow.kind === "trip-plan")!;
  const second = await context.newPage(); await second.goto("/classroom?native=1");
  const run = (p: Page) => p.evaluate(async ({ start, planRecord }) => { const { IndexedDbDataStore } = await import("/src/core/index.ts"); const { executeConsentTrip } = await import("/src/features/consent-trips/consent-trip-service.ts"); const store = new IndexedDbDataStore(); try { await executeConsentTrip(store, { scope: { academicYearId: planRecord.academicYearId, classroomId: planRecord.classroomId }, now: new Date("2026-09-18T09:05:00.000Z"), command: { action: "check", tripId: planRecord.id, expectedEventId: start.id, studentId: start.workflow.roster[0].studentId, stage: "departure", outcome: "seen", actualAt: "2026-09-18T09:05:00.000Z", previousCheckId: null, correctionReason: "", note: "" } }); return "saved"; } catch (error) { return error instanceof Error ? error.message : "error"; } finally { store.close(); } }, { start, planRecord });
  expect(await run(page)).toBe("saved"); expect(await run(second)).toContain("başka oturumda değişti"); expect((await state(page)).filter(r => r.workflow.kind === "trip-check")).toHaveLength(1); await second.close();
});
