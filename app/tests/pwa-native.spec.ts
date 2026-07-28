import { expect, test } from "@playwright/test";

test("native çalışma modu simülatör çerçevesi olmadan gerçek ekrana yerleşir", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("phone-frame")).toHaveCount(0);
  await expect(page.locator(".native-app-runtime")).toBeVisible();
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Kurgu PWA Sınıfı");
  await setup.getByLabel("Program katalog kimliği").fill("KURGU-PWA");
  await setup.getByLabel("Kaynak sürümü").fill("2026-test");
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();
  await expect(page.getByRole("main", { name: "MaarifOS Bugün ekranı" })).toBeVisible();
  await expect(page.getByText("Günün akışı", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Bugünkü devam/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Program bağı/ })).toBeVisible();
  await expect(page.locator(".today-header")).toHaveCSS("border-radius", "22px");

  await page.getByRole("button", { name: "Ayarları aç" }).click();
  await expect(page.getByRole("heading", { name: "Bu cihaza kur" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kurulum adımlarını göster" })).toBeVisible();
});

test("native mod masaüstünde merkezlenir, telefonda ekran genişliğini kullanır", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const desktopBox = await page.locator(".native-app-runtime").boundingBox();
  expect(desktopBox?.width).toBe(760);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBox = await page.locator(".native-app-runtime").boundingBox();
  expect(mobileBox?.width).toBe(390);
});
