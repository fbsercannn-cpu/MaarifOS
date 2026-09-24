import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 320, height: 844 } });
test("empty calendar day accepts one real package despite rapid double click and refills saved day", async ({ page }) => {
  test.setTimeout(90000);
  await page.clock.setFixedTime(new Date("2026-09-17T09:00:00Z"));
  await page.goto("/tests/desk-document-fixture.html");
  const desk = page.getByRole("region", { name: "Öğretmenin masa belgeleri", exact: true });
  await desk.getByRole("button", { name: "17 Eylül 2026 Perşembe · Etkinlik yerleştir", exact: true }).click();
  const day = desk.getByRole("region", { name: "Seçilen gün", exact: true });
  const apply = day.locator(".work-package-apply").first();
  await expect(apply).toBeEnabled();
  const before = await page.evaluate(async () => (window as any).deskTest.store.readSnapshot());
  await apply.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(day.getByRole("button", { name: "Planı aç", exact: true }).first()).toBeVisible({ timeout: 30000 });
  await expect(desk.getByRole("button", { name: /17 Eylül 2026 Perşembe · \d+ kayıt/ })).toBeVisible();
  const count = await page.evaluate(async () => {
    const snapshot = await (window as any).deskTest.store.readSnapshot();
    return snapshot.plans.filter(r => !r.deletedAt && r.planType === "daily" && r.civilDate === "2026-09-17").length;
  });
  expect(count).toBe(1);
  const after = await page.evaluate(async () => (window as any).deskTest.store.readSnapshot());
  expect(after.plans.length).toBeGreaterThan(before.plans.length);
  expect(after.activities.length).toBeGreaterThan(before.activities.length);
  const undo = day.getByRole("button", { name: "Bu işlemi geri al", exact: true });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(desk.getByRole("button", { name: "17 Eylül 2026 Perşembe · Etkinlik yerleştir", exact: true })).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => (window as any).deskTest.store.readSnapshot())).toEqual(before);
  await expect(day.locator(".work-package-apply").first()).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await desk.getByRole("button", { name: "Öğrencinin özetini hazırla", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  await expect(dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true })).toBeEnabled({ timeout: 30000 });
});

