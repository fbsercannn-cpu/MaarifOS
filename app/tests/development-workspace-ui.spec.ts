import { expect, test } from "@playwright/test";
import { setup, openProfile, openReport, readRecords, installCivilClock, childName, otherChildName, observation, evaluation } from "./helpers/development-workspace-ui";

test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 390, height: 844 } });
const production = process.env.MAARIF_TEST_PRODUCTION === "1";

test("sade kart, çocuk kapsamı ve seçilen dönem rapora doğru taşınır", async ({ page }, testInfo) => {
  await setup(page);
  const coverage = page.getByRole("region", { name: "Gözlem kapsamı" });
  await expect(coverage.getByRole("button", { name: `${otherChildName} için gözlem ekle`, exact: true })).toBeVisible();
  await coverage.getByText("Çocuk bazında gör", { exact: true }).click();
  await expect(coverage.getByRole("button", { name: `${childName} gelişim kayıtlarını aç` })).toBeVisible();
  const profile = await openProfile(page);
  await expect(profile.getByRole("region", { name: "Gözlem arşivi" })).toBeHidden();
  await expect(profile.getByRole("navigation", { name: "Çocuk profili bölümleri" })).toBeHidden();
  const card = profile.getByRole("region", { name: "Gelişim kayıtları" });
  await expect(card).toContainText(observation);
  await expect(card).not.toContainText(otherChildName);
  await page.screenshot({ path: testInfo.outputPath("student-card-390.png") });
  await card.getByRole("button", { name: "10 Eylül 2026 tarihli gözlemi aç" }).click();
  await expect(profile.getByRole("region", { name: "Gözlem arşivi" })).toBeVisible();
  await expect(profile.locator(".student-observation-timeline")).toContainText(observation);
  await profile.getByRole("button", { name: "Bu hafta", exact: true }).click();
  await profile.getByRole("button", { name: "Rapor hazırla", exact: true }).click();
  const report = page.getByRole("dialog", { name: "Öğretmen gözlem özeti", exact: true });
  await expect(page.getByText(`${childName} profili`, { exact: true })).toHaveCount(0);
  await expect.poll(() => report.evaluate((dialog) =>
    dialog.contains(document.activeElement),
  )).toBe(true);
  await expect(report.getByLabel("Dönem başlangıcı", { exact: true })).toHaveValue("2026-09-07");
  await expect(report.getByLabel("Dönem sonu", { exact: true })).toHaveValue("2026-09-10");
  await expect(report.getByRole("group", { name: "Rapora alınacak gözlemler · 1 gözlem seçili" })).toContainText(observation);
  await expect(report.getByRole("button", { name: "Özeti onayla", exact: true })).toBeDisabled();
});

test("açık profildeki çocuk güncel özetten ayrılırsa boş panel yerine korunma durumu görünür", async ({
  page,
  context,
}) => {
  await setup(page);
  const profile = await openProfile(page, otherChildName);
  const peer = await context.newPage();
  await installCivilClock(peer, page);
  await peer.goto("/?native=1", { waitUntil: "networkidle" });
  await peer.getByRole("button", { name: "Sınıfım", exact: true }).click();
  const operations = peer.locator("details.simple-classroom__operations");
  await operations.locator(":scope > summary").click();
  await operations
    .getByRole("button", { name: `${otherChildName} için diğer işlemler` })
    .click();
  await operations
    .getByRole("button", {
      name: `${otherChildName} öğrencisini sil`,
      exact: true,
    })
    .click();
  await peer.getByRole("dialog", { name: "Öğrenciyi sil", exact: true })
    .getByRole("button", { name: "Sil ve geri alınabilir arşive taşı", exact: true }).click();
  await expect(operations).toContainText("Silinen / ayrılan öğrenciler · 1");

  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const missingStatus = profile
    .getByRole("status")
    .filter({ hasText: "Bu çocuk güncel gelişim özetinde bulunamadı." });
  await expect(missingStatus).toBeVisible();
  await expect(missingStatus).toContainText(
    "Profil ve kayıtlar değiştirilmedi",
  );
  await peer.close();
});

test("taslak geri tuşunda korunur; onaylı özet değişmez ve yeni taslak ayrı kaydolur", async ({ page }) => {
  await setup(page);
  let report = await openReport(page);
  await report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true }).fill(evaluation);
  // Back immediately, before the debounced save, must flush the current form.
  await page.goBack();
  await expect(report).toBeHidden();
  const profile = page.getByRole("dialog", { name: `${childName} profili` });
  await expect(profile).toBeVisible();
  await profile.getByRole("button", { name: "Rapor hazırla", exact: true }).click();
  report = page.getByRole("dialog", { name: "Öğretmen gözlem özeti", exact: true });
  await expect(report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true })).toHaveValue(evaluation);
  await expect(report.getByRole("button", { name: "Özeti onayla", exact: true })).toBeDisabled();
  await report.getByRole("checkbox", { name: "Seçilen gözlemleri ve değerlendirmemi kontrol ettim.", exact: true }).check();
  await report.getByRole("button", { name: "Özeti onayla", exact: true }).click();
  await expect(report.getByRole("button", { name: "PDF indir", exact: true })).toBeEnabled();
  await expect(report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true })).toHaveAttribute("readonly", "");
  const saved = await readRecords(page);
  expect(saved.reports).toHaveLength(1);
  const approved = saved.reports[0];
  expect(approved).toMatchObject({ status: "approved", teacherEvaluation: evaluation });
  expect(saved.observations[0]).toMatchObject({ rawText: observation, rawTextImmutable: true });
  await report.getByRole("button", { name: "Yeni taslak oluştur", exact: true }).click();
  await expect(report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true })).toBeEditable();
  await report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true }).fill(`${evaluation} Yeni öğretmen notu.`);
  await page.keyboard.press("Escape");
  await expect(report).toBeHidden();
  const updated = await readRecords(page);
  expect(updated.reports).toHaveLength(2);
  expect(updated.reports.find((item) => item.id === approved.id)).toEqual(approved);
  expect(updated.reports.find((item) => item.id !== approved.id)).toMatchObject({ status: "draft", teacherEvaluation: `${evaluation} Yeni öğretmen notu.` });
  expect(updated.observations).toEqual(saved.observations);
  await expect(profile).toBeVisible();
  await page.goBack();
  await expect(profile).toBeHidden();
  await expect(report).toBeHidden();
  await expect(page.getByRole("button", { name: "Çocuk ekle", exact: true })).toBeEnabled();
});

test(`320px telefonda onay ve PDF ${production ? "soğuk çevrimdışı açılışta" : "yeniden açılışta"} çalışır`, async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await setup(page);
  let report = await openReport(page);
  await report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true }).fill(evaluation);
  await report.getByRole("textbox", { name: "Sonraki destek adımı (isteğe bağlı)", exact: true }).fill("Sonraki öykü etkinliğinde resim kartlarıyla kendi sıralamasını oluşturması için zaman verilecek.");
  await report.getByRole("checkbox", { name: "Seçilen gözlemleri ve değerlendirmemi kontrol ettim.", exact: true }).check();
  const approve = report.getByRole("button", { name: "Özeti onayla", exact: true });
  await expect(approve).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("report-approval-320.png") });
  await approve.click();
  await expect(report.getByRole("button", { name: "PDF indir", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(report).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: `${childName} profili` })).toBeHidden();
  if (production) {
    await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __maarifosPwaStatus?: { offlineReady?: boolean } }).__maarifosPwaStatus?.offlineReady)), { timeout: 30_000 }).toBe(true);
    await context.setOffline(true);
  }
  await page.reload({ waitUntil: production ? "domcontentloaded" : "networkidle" });
  report = await openReport(page);
  await expect(report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true })).toHaveValue(evaluation);
  const pdf = report.getByRole("button", { name: "PDF indir", exact: true });
  await expect(pdf).toBeEnabled();
  await expect(pdf).toBeInViewport();
  const downloadEvent = page.waitForEvent("download");
  await pdf.click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  await download.saveAs(testInfo.outputPath("approved-teacher-observation-summary.pdf"));
  expect(await download.failure()).toBeNull();
  await expect(report).toContainText("PDF bu cihaz için hazırlandı.");
  await page.screenshot({ path: testInfo.outputPath("report-approved-320.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.setOffline(false);
});

test("kaynak sonradan değişirse onaylı raporun PDF indirmesi durdurulur", async ({ page }) => {
  await setup(page);
  const report = await openReport(page);
  await report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true }).fill(evaluation);
  await report.getByRole("checkbox", { name: "Seçilen gözlemleri ve değerlendirmemi kontrol ettim.", exact: true }).check();
  await report.getByRole("button", { name: "Özeti onayla", exact: true }).click();
  await expect(report.getByRole("button", { name: "PDF indir", exact: true })).toBeEnabled();
  // Simulate another tab changing linked evidence after this dialog read its snapshot.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("maarifos-local");
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("evidenceCurriculumLinks", "readwrite");
        const store = tx.objectStore("evidenceCurriculumLinks");
        const read = store.getAll();
        read.onsuccess = () => { const link = read.result.find((item: Record<string, unknown>) => !item.deletedAt); store.put({ ...link, referenceTitle: "Deneme değişmiş kaynak", updatedAt: new Date().toISOString() }); };
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  });
  const downloads: string[] = [];
  page.on("download", (download) => downloads.push(download.suggestedFilename()));
  await report.getByRole("button", { name: "PDF indir", exact: true }).click();
  await expect(report.getByRole("alert")).toContainText("Kaynak kayıtlar değişmiş");
  await expect(report.getByRole("button", { name: "PDF indir", exact: true })).toBeDisabled();
  expect(downloads).toHaveLength(0);
});
