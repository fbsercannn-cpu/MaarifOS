import { expect, test, type Locator, type Page } from "@playwright/test";

import { setup } from "./helpers/development-workspace-ui";

const PHONE_WIDTHS = [320, 390, 430] as const;

async function expectNoHorizontalOverflow(page: Page, surface: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await surface.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
}

test.describe("pedagojik öğrenme döngüsü mobil sunumu", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const width of PHONE_WIDTHS) {
    test(`${width}px genişlikte sakin özet ve erişilebilir yedi aşama korunur`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await setup(page);
      await page.getByRole("navigation", { name: "Ana menü", exact: true })
        .getByRole("button", { name: "Bugün", exact: true }).click();

      const today = page.getByTestId("today-screen");
      await today.getByRole("button", { name: "Günün ayrıntıları", exact: true }).click();
      const loop = today.getByRole("region", { name: "Pedagojik öğrenme döngüsü", exact: true });
      await expect(loop).toBeVisible();

      const previews = loop.locator("[data-stage-preview]");
      await expect(previews).toHaveCount(2);
      await expect(previews.nth(0)).toContainText("Şimdi");
      await expect(previews.nth(1)).toContainText("Sıradaki");

      const details = loop.locator("details.simple-learning-loop__details");
      await expect(details).not.toHaveAttribute("open", "");
      const summary = details.locator(":scope > summary");
      const summaryBox = await summary.boundingBox();
      expect(summaryBox).not.toBeNull();
      expect(summaryBox!.width).toBeGreaterThanOrEqual(44);
      expect(summaryBox!.height).toBeGreaterThanOrEqual(44);
      await expectNoHorizontalOverflow(page, loop);

      await summary.click();
      await expect(details).toHaveAttribute("open", "");
      const stages = details.getByRole("listitem");
      await expect(stages).toHaveCount(7);
      await expect(stages.filter({ has: page.getByText("Şimdi", { exact: true }) })).toHaveCount(1);

      const metrics = await loop.locator("span, strong, small").evaluateAll((elements) =>
        elements
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((element) => ({
            text: element.textContent?.trim() ?? "",
            fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
          })),
      );
      expect(metrics.every(({ fontSize }) => fontSize >= 12), JSON.stringify(metrics)).toBe(true);
      await expectNoHorizontalOverflow(page, loop);
    });
  }
});
