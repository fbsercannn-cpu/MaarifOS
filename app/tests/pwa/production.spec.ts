import { expect, test } from "@playwright/test";

test("üretim PWA gerçek ekranla açılır ve çevrimdışı yeniden başlar", async ({ context, page }) => {
  await page.goto("/");

  await expect(page.getByTestId("phone-frame")).toHaveCount(0);
  await expect(page.locator(".native-app-runtime")).toBeVisible();

  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await expect(setup).toBeVisible();
  await setup.getByLabel("Sınıf adı").fill("Güneş Sınıfı");
  await setup.getByLabel("Program katalog kimliği").fill("KURGU-PWA");
  await setup.getByLabel("Kaynak sürümü").fill("2026-test");
  await setup.getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" }).click();
  await expect(setup).toBeHidden();
  await expect(page.getByRole("heading", { name: "Bugün", exact: true })).toBeVisible();
  await expect(page.getByText("Güneş Sınıfı · Sabah grubu · 08.30–12.30")).toBeVisible();

  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const manifestBody = await manifest.json();
  expect(manifestBody.display).toBe("standalone");
  expect(manifestBody.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        src: "/assets/brand/maarifos-icon-192.png",
        sizes: "192x192",
        purpose: "any",
      }),
      expect.objectContaining({
        src: "/assets/brand/maarifos-icon-512.png",
        sizes: "512x512",
        purpose: "any",
      }),
      expect.objectContaining({
        src: "/assets/brand/maarifos-icon-maskable-512.png",
        sizes: "512x512",
        purpose: "maskable",
      }),
    ]),
  );

  for (const icon of manifestBody.icons) {
    const iconResponse = await page.request.get(icon.src);
    expect(iconResponse.ok()).toBeTruthy();
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
  }
  await expect(page.locator(".today-brand-logo")).toHaveAttribute(
    "src",
    "/assets/brand/maarifos-icon-192.png",
  );

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: "networkidle" });

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Bugün", exact: true })).toBeVisible();
  await expect(page.getByText("Güneş Sınıfı · Sabah grubu · 08.30–12.30")).toBeVisible();

  await page.goto("/gunum/cevrimdisi", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
  await expect(page.getByText("Güneş Sınıfı · Sabah grubu · 08.30–12.30")).toBeVisible();
});
