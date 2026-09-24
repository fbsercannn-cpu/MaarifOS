import { expect, test, type Locator, type Page } from "@playwright/test";
const production = process.env.MAARIF_CALENDAR_PRODUCTION === "1";
const directory = `output/completion-2026-09-07/calendar/${production ? "production" : "dev"}`;
async function setup(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 });
  await page.clock.install({ time: new Date("2026-09-18T09:00:00.000Z") });
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Takvim Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
}
async function add(page: Page, name: string) {
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await dialog.getByLabel("Çocuğun adı").fill(name);
  await dialog.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(dialog).toBeHidden();
}
async function profilePanel(page: Page, name: string) {
  const coverage = page.getByRole("region", { name: "Gözlem kapsamı", exact: true });
  await expect(coverage).toBeVisible();
  await expect(coverage).not.toHaveAttribute("aria-busy", "true");
  await page.locator("button.simple-student-list__profile").filter({ hasText: name }).click();
  const profile = page.getByRole("dialog", { name: `${name} profili`, exact: true });
  await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  const panel = profile.getByRole("region", { name: "Devam hesabının gün gün dökümü", exact: true });
  const calculationToggle = profile.getByText("Bu çocuğun devam hesabını incele", { exact: true });
  if (await calculationToggle.count()) await calculationToggle.click();
  await expect(panel.getByRole("heading", { name: "Hangi gün neden sayıldı?" })).toBeVisible();
  return { profile, panel };
}
async function noOverflow(panel: Locator, width: number) {
  const size = await panel.evaluate(element => ({ left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, scroll: element.scrollWidth, width: element.clientWidth }));
  expect(size.left).toBeGreaterThanOrEqual(0); expect(size.right).toBeLessThanOrEqual(width + 1); expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
}
async function seedDatedRecords(page: Page) {
  await page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const store = new IndexedDbDataStore();
    try {
      const snapshot = await store.readSnapshot();
      const a = snapshot.students.find(s => s.displayName === "Kurgu Ada")!, b = snapshot.students.find(s => s.displayName === "Kurgu Efe")!;
      const scope = { academicYearId: a.academicYearId, classroomId: a.classroomId };
      const now = "2026-09-18T09:00:00.000Z";
      const episode = (startedOn: string, extra = {}) => ({ id: crypto.randomUUID(), ...scope, startedOn, schemaVersion: 1, status: "active", ...extra });
      const mark = (studentId: string, civilDate: string, status: string, time = now, extra = {}) => ({ id: crypto.randomUUID(), ...scope, studentId, civilDate, status, createdAt: time, updatedAt: time, deletedAt: null, schemaVersion: 1, ...extra });
      const old = "2026-09-18T08:00:00.000Z";
      const records = [mark(a.id, "2026-09-14", "absent", old), mark(a.id, "2026-09-14", "late"), mark(a.id, "2026-09-16", "absent"), mark(b.id, "2026-09-16", "present"), mark(a.id, "2026-09-15", "present"), mark(b.id, "2026-09-18", "present", old), mark(b.id, "2026-09-18", "present", now, { deletedAt: now })];
      await store.transaction("readwrite", ["students", "attendanceRecords", "calendarEntries"], async transaction => {
        await transaction.putMany("students", [{ ...a, enrollments: [episode("2026-09-14", { status: "left", endedOn: "2026-09-16" }), episode("2026-09-18")] }, { ...b, enrollments: [episode("2026-09-16")] }]);
        await transaction.putMany("attendanceRecords", records);
        await transaction.putMany("calendarEntries", [{ id: crypto.randomUUID(), ...scope, civilDate: "2026-09-15", createdAt: now, updatedAt: now, deletedAt: null, schemaVersion: 1, title: "Kurgu okul kapanışı", entryType: "no_school", startDate: "2026-09-15", endDate: "2026-09-15", status: "planned" }]);
      });
    } finally { store.close(); }
  });
}
for (const width of [320, 390]) {
  test(`${width}px: gün gün nedenler, mükerrer kaynaklar, ayrılık ve yeniden yükleme`, async ({ page }) => {
    test.skip(production, "Kurgu bozuk/mükerrer kaynak fixture yalnız geliştirme API'siyle eklenir; üretim kaydet/offline testi ayrıdır.");
    await setup(page, width); await add(page, "Kurgu Ada"); await add(page, "Kurgu Efe"); await seedDatedRecords(page); await page.reload();
    const { panel } = await profilePanel(page, "Kurgu Ada");
    await expect(panel.getByLabel("Devam payı ve paydası")).toContainText("1 / 2");
    await expect(panel.getByLabel("Devam payı ve paydası")).toContainText("2 / 3");
    await panel.getByRole("button", { name: "Tarih seç", exact: true }).click();
    await panel.getByLabel("Devam başlangıç tarihi").fill("2026-09-14");
    await panel.getByLabel("Devam bitiş tarihi").fill("2026-09-20");
    await panel.getByLabel("Devam bitiş tarihi").press("Tab");
    const gap = panel.locator('[data-civil-date="2026-09-17"]'); await gap.locator(":scope > summary").click();
    await expect(gap).toContainText("Ayrılış ile yeniden kayıt arasında");
    const closure = panel.locator('[data-civil-date="2026-09-15"]'); await closure.locator(":scope > summary").click();
    await expect(closure).toContainText("Öğretmenin kaydettiği okul kapanışı");
    const duplicate = panel.locator('[data-civil-date="2026-09-14"]'); await duplicate.locator(":scope > summary").click();
    await duplicate.getByText("Kaynak kayıtları (2)", { exact: true }).click();
    await expect(duplicate).toContainText("1 mükerrer, 0 geçersiz kayıt");
    await panel.getByRole("button", { name: "Eksik", exact: true }).click();
    await expect(panel.locator('[data-civil-date="2026-09-18"]')).toHaveCount(1);
    await expect(panel.locator('[data-civil-date="2026-09-17"]')).toHaveCount(0);
    await noOverflow(panel, width);
    await panel.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${directory}/attendance-breakdown-${width}.png` });
    await page.reload(); const reloaded = await profilePanel(page, "Kurgu Ada");
    await expect(reloaded.panel.getByLabel("Devam payı ve paydası")).toContainText("2 / 3");
  });
}

test("390px: gerçek yoklama kaydı sonrası açıklama güncellenir ve çevrimdışı yeniden açılır", async ({ page }) => {
  await setup(page, 390); await add(page, "Kurgu Kayıt");
  if (production) {
    await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __maarifosPwaStatus?: { offlineReady?: boolean } }).__maarifosPwaStatus?.offlineReady)), { timeout: 60000 }).toBe(true);
    await page.context().setOffline(true); await page.reload({ waitUntil: "domcontentloaded" });
  }
  await page.getByText("Sınıf işlemleri", { exact: true }).click();
  await page.getByRole("button").filter({ hasText: "Bugünün yoklaması" }).click();
  const attendance = page.getByRole("dialog", { name: "Bugünün devam durumu", exact: true });
  await attendance.locator("button.student-row").filter({ hasText: "Kurgu Kayıt" }).click();
  await attendance.getByRole("button", { name: "Devam durumunu tamamla", exact: true }).click();
  await expect(attendance).toBeHidden();
  await page.goto("/classroom?native=1");
  const { panel } = await profilePanel(page, "Kurgu Kayıt");
  await expect(panel.getByLabel("Devam payı ve paydası")).toContainText("1 / 1");
  await page.reload(); const reopened = await profilePanel(page, "Kurgu Kayıt");
  await expect(reopened.panel.getByLabel("Devam payı ve paydası")).toContainText("1 / 1");
  await noOverflow(reopened.panel, 390);
  await page.screenshot({ path: `${directory}/attendance-saved-offline-390.png` });
});
