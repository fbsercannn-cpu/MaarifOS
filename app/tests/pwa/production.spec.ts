import { expect, test } from "@playwright/test";

test("üretim PWA gerçek ekranla açılır ve çevrimdışı yeniden başlar", async ({ context, page }) => {
  await page.goto("/");

  await expect(page.getByTestId("phone-frame")).toHaveCount(0);
  await expect(page.locator(".native-app-runtime")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Günaydın Emine Öğretmen/ })).toBeVisible();

  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).display).toBe("standalone");

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: "networkidle" });

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Günaydın Emine Öğretmen/ })).toBeVisible();

  await page.goto("/gunum/cevrimdisi", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main", { name: "MaarifOS Günüm ekranı" })).toBeVisible();
});
