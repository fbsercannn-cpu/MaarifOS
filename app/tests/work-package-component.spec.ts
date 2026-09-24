import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-10T09:00:00.000Z"));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/tests/runtime-fixture.html");
});

test("Paket yazma kilidine uyar, tek tıklama gerçek kayıt yapar ve geri alma ham gözlemi korur", async ({ page }) => {
  await page.evaluate(async () => {
    const f = await import("/tests/fixtures/action-center-mount.tsx");
    const mounted = await f.mountActionCenter({ disabled: true, refreshOnFollowup: true, deferredRefreshMs: 150 });
    Object.assign(window, { mountedPackage: mounted, beforePackage: await mounted.source.readSnapshot() });
  });
  const panel = page.getByRole("region", { name: "Hazır iş paketleri", exact: true });
  await expect(panel.locator("button.work-package-apply")).toBeDisabled();
  await page.evaluate(() => (window as any).mountedPackage.render(false));
  const apply = panel.locator("button.work-package-apply");
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(panel.getByRole("status")).toBeVisible();
  await expect.poll(() => page.evaluate(async () => {
    const mounted = (window as any).mountedPackage, data = await mounted.source.readSnapshot();
    return data.observations.find((o: any) => o.id === mounted.observationId)?.observationCategories?.length ?? 0;
  })).toBeGreaterThan(0);
  await panel.getByRole("button", { name: "Bu işlemi geri al", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText("Paketin yaptığı değişiklikler geri alındı.");
  const result = await page.evaluate(async () => {
    const mounted = (window as any).mountedPackage, before = (window as any).beforePackage, after = await mounted.source.readSnapshot();
    return { original: before.observations.find((o: any) => o.id === mounted.observationId), restored: after.observations.find((o: any) => o.id === mounted.observationId), width: document.documentElement.scrollWidth, viewport: innerWidth };
  });
  expect(result.restored.rawText).toBe(result.original.rawText);
  expect(result.restored.createdAt).toBe(result.original.createdAt);
  expect(result.restored.observationCategories).toEqual(result.original.observationCategories);
  expect(result.width).toBe(result.viewport);
});

test("Paket commit sonrası okuma hatası gerçek başarıyı silmez ve yeni eski-snapshot yazısını açmaz", async ({ page }) => {
  await page.evaluate(async () => { const f = await import("/tests/fixtures/action-center-mount.tsx"); Object.assign(window, { mountedPackage: await f.mountActionCenter({ failRefreshAfterCommit: true }) }); });
  const panel = page.getByRole("region", { name: "Hazır iş paketleri", exact: true });
  await panel.locator("button.work-package-apply").click();
  await expect(panel.getByRole("status")).toBeVisible();
  await expect(panel.locator("button.work-package-apply")).toHaveCount(0);
  await expect(panel.getByText("Paket kaydedilemedi.", { exact: false })).toHaveCount(0);
  await expect.poll(() => page.evaluate(async () => { const mounted = (window as any).mountedPackage; return (await mounted.source.readSnapshot()).observations.find((o: any) => o.id === mounted.observationId)?.observationCategories?.length ?? 0; })).toBeGreaterThan(0);
});

test("Yükleme hatası yazma hatası değildir ve kapsam değişince eski gözlemin seçimi uygulanamaz", async ({ page }) => {
  await page.evaluate(async () => { const f = await import("/tests/fixtures/work-package-mount.tsx"); Object.assign(window, { directPackage: await f.mountWorkPackages({ failInitialRead: true, deferredRefreshMs: 150 }) }); });
  const panel = page.getByRole("region", { name: "Hazır iş paketleri", exact: true });
  await expect(panel.getByRole("alert")).toContainText("Hazır seçenekler yüklenemedi");
  await expect(panel.getByText("Paket kaydedilemedi.", { exact: false })).toHaveCount(0);
  await page.evaluate(() => (window as any).directPackage.setReadFailure(false));
  await expect(panel.locator("blockquote")).toContainText("çizdiği resmi");
  await page.evaluate(() => { const f = (window as any).directPackage; f.setObservation(f.observationIds[1]); });
  await expect(panel.locator("blockquote")).toContainText("ritim çalgısıyla");
  await expect(panel.locator("blockquote")).not.toContainText("çizdiği resmi");
  await panel.locator("button.work-package-apply").click();
  await expect(panel.getByRole("status")).toBeVisible();
  const counts = await page.evaluate(async () => { const f = (window as any).directPackage, data = await f.source.readSnapshot(); return f.observationIds.map((id: string) => data.observations.find((o: any) => o.id === id).observationCategories.length); });
  expect(counts[0]).toBe(0); expect(counts[1]).toBeGreaterThan(0);
});

test("Sonraki gözlemde önceki açık destek seçimi varsayılan olur; ilk katalog seçeneğiyle ezilmez", async ({ page }) => {
  await page.evaluate(async () => { const f = await import("/tests/fixtures/work-package-mount.tsx"); Object.assign(window, { directPackage: await f.mountWorkPackages() }); });
  const panel = page.getByRole("region", { name: "Hazır iş paketleri", exact: true });
  await expect(panel.locator("select")).toBeVisible();
  const choiceId = await panel.locator("select option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).find(value => value.endsWith(":small-group"))!);
  await panel.locator("select").selectOption(choiceId);
  await panel.locator("button.work-package-apply").click();
  await expect(panel.getByRole("status")).toBeVisible();
  await page.evaluate(() => { const f = (window as any).directPackage; f.setObservation(f.observationIds[1]); });
  await expect(panel.locator("blockquote")).toContainText("ritim çalgısıyla");
  await expect(panel.locator("select")).toHaveValue(/:small-group$/);
  await expect(panel).toContainText("Önceki açık seçiminizle hazırlandı");
});

