import { expect, test } from "@playwright/test";

for (const width of [320, 390]) test(`kurtarma paneli ${width}px: kapasite, doğru/yanlış parola ve çevrimdışı veri değiştirmeyen dosya tatbikatı`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto("/tests/runtime-backup-recovery.html");
  const source = await page.evaluate(async () => {
    const { fixtureReady, fixtureService, fixtureStore } = await import("/tests/runtime-backup-recovery.tsx");
    await fixtureReady;
    const encrypted = await fixtureService.exportEncryptedBackup("Kurgu-panel-yedek-2026!");
    return { file: fixtureService.serializeEncryptedBackup(encrypted), before: JSON.stringify(await fixtureStore.readSnapshot()) };
  });
  await page.getByRole("button", { name: "Kayıt ve kapasiteyi kontrol et" }).click();
  await expect(page.getByText("Cihazdaki veri", { exact: true })).toBeVisible();
  await expect(page.getByText("1 kayıt · 0 profil fotoğrafı", { exact: true })).toBeVisible();
  await page.getByText("Bir yedek dosyasını sınayın", { exact: true }).click();
  await page.getByLabel("Şifreli yedek dosyası").setInputFiles({ name: "kurgu-yedek.maarifos", mimeType: "application/json", buffer: Buffer.from(source.file) });
  await page.getByLabel("Yedek parolası", { exact: true }).fill("Kurgu-yanlis-parola!");
  await page.getByRole("button", { name: "Dosyayı değiştirmeden doğrula" }).click();
  await expect(page.getByRole("alert")).toContainText("parola yanlış");
  await expect(page.getByLabel("Yedek parolası", { exact: true })).toHaveValue("");
  await context.setOffline(true);
  await page.getByLabel("Yedek parolası", { exact: true }).fill("Kurgu-panel-yedek-2026!");
  await page.getByRole("button", { name: "Dosyayı değiştirmeden doğrula" }).click();
  await expect(page.getByText("Yedek dosyası doğrulandı", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Yedek parolası", { exact: true })).toHaveValue("");
  const after = await page.evaluate(async () => {
    const { fixtureStore } = await import("/tests/runtime-backup-recovery.tsx");
    return { snapshot: JSON.stringify(await fixtureStore.readSnapshot()), noOverflow: document.documentElement.scrollWidth <= innerWidth,
      passwordStored: Object.values(localStorage).some(v => String(v).includes("Kurgu-panel-yedek-2026!")) };
  });
  expect(after.snapshot).toBe(source.before);
  expect(after.noOverflow).toBe(true);
  expect(after.passwordStored).toBe(false);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  await page.screenshot({ path: `output/completion-2026-09-07/security/recovery-panel-${width}.png`, fullPage: true });
});
