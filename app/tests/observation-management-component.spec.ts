import { expect, test } from "@playwright/test";

test("320px kayıtlı gözlem Dün seçimiyle tarih değiştirir, sonra gerçek Maarif bağına tıklanır", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-10T09:00:00.000Z"));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async () => { const fx = await import("/tests/fixtures/action-center-mount.tsx"); Object.assign(window, { metadataMount: await fx.mountActionCenter() }); });
  const editor = page.getByRole("region", { name: "Gözlemin tarihi ve bağlantıları", exact: true });
  await expect(editor).toContainText("Kurgu çocuk çizdiği resmi arkadaşına anlattı.");
  await editor.getByRole("button", { name: "Dün", exact: true }).click();
  await editor.getByRole("button", { name: "Planlı etkinlik seçmeden bu tarihe kaydet", exact: true }).click();
  await expect(editor.getByRole("status")).toHaveText("Gözlemin tarihi ve bağlantıları kaydedildi.");
  await expect(editor.getByLabel("Olayın gerçekleştiği tarih")).toHaveValue("2026-09-09");
  await editor.locator("summary").filter({ hasText: "Gözleme uygun Maarif başlığını seç" }).click();
  await editor.getByRole("button", { name: "Bu Maarif başlığına bağla", exact: true }).first().click();
  await expect.poll(() => page.evaluate(async () => { const m = (window as any).metadataMount; return (await m.source.readSnapshot()).evidenceCurriculumLinks.filter(l => l.observationId === m.observationId).length; })).toBe(1);
  const result = await page.evaluate(async () => { const m = (window as any).metadataMount, s = await m.source.readSnapshot(), o = s.observations.find(o => o.id === m.observationId); return { date: o.civilDate, created: o.createdAt, raw: o.rawText, sourceDay: s.activities.find(a => a.id === o.activityId).civilDate, width: document.documentElement.scrollWidth }; });
  expect(result).toEqual({ date: "2026-09-09", created: "2026-09-10T09:00:00.000Z", raw: "Kurgu çocuk çizdiği resmi arkadaşına anlattı.", sourceDay: "2026-09-09", width: 320 });
});

test("Kayıt olayı üst ekranı hemen yenilese ve okumalar gecikse de ilk sonraki seçim eski snapshot ile yazılmaz", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-10T09:00:00.000Z"));
  await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async () => { const fx = await import("/tests/fixtures/action-center-mount.tsx"); Object.assign(window, { metadataMount: await fx.mountActionCenter({ refreshOnFollowup: true, deferredRefreshMs: 200 }) }); });
  const editor = page.getByRole("region", { name: "Gözlemin tarihi ve bağlantıları", exact: true });
  await editor.getByRole("button", { name: "Dün", exact: true }).click();
  await editor.getByRole("button", { name: "Planlı etkinlik seçmeden bu tarihe kaydet", exact: true }).click();
  await expect(editor.getByRole("status")).toHaveText("Gözlemin tarihi ve bağlantıları kaydedildi.");
  await editor.locator("summary").filter({ hasText: "Gözleme uygun Maarif başlığını seç" }).click();
  await editor.getByRole("button", { name: "Bu Maarif başlığına bağla", exact: true }).first().click();
  await expect.poll(() => page.evaluate(async () => { const m = (window as any).metadataMount; return (await m.source.readSnapshot()).evidenceCurriculumLinks.filter(l => l.observationId === m.observationId).length; })).toBe(1);
  await expect(editor.getByRole("alert")).toHaveCount(0);
  await expect(editor.getByRole("status")).toHaveText("Gözlemin tarihi ve bağlantıları kaydedildi.");
});
