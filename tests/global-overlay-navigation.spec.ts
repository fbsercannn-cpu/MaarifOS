import { expect, test, type Page } from "@playwright/test";

async function configure(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  if (!(await dialog.isVisible().catch(() => false))) return;
  await dialog.getByLabel("Okul adı", { exact: true }).fill("Geçiş Test Okulu");
  await dialog.getByLabel("Öğretmen adı soyadı", { exact: true }).fill("Test Öğretmeni");
  await dialog.getByLabel("Sınıf adı", { exact: true }).fill("Geçiş Sınıfı");
  await dialog.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await dialog.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(dialog).toBeHidden();
}

test("tam ekran plan merkezi alt menü geçişini örtmez", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await configure(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("maarif_open_tymm_hub", { detail: { tab: "wizard" } }));
  });
  await expect(page.getByRole("heading", { name: /Planlama Terminali/ })).toBeVisible();

  await page.getByRole("button", { name: "Belgeler", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByRole("heading", { name: /Planlama Terminali/ })).toBeHidden();
  await expect(page.getByRole("main", { name: "Belgeler" })).toBeVisible();
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390);
  expect(runtimeErrors).toEqual([]);
});
