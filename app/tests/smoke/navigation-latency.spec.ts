import { expect, test, type Page } from "@playwright/test";

import {
  addAccessibilityChild,
  configureAccessibilityClassroom,
} from "./accessibility-fixtures";

const OBSERVATION_OPEN_BUDGET_MS = 1_500;

async function measureObservationOpen(page: Page) {
  const startedAt = await page.evaluate(() => performance.now());
  await page.getByRole("button", { name: "Gözlem", exact: true }).click();
  await expect(page.locator("strong", { hasText: /^Hızlı Gözlem$/u })).toBeVisible();
  const visibleAt = await page.evaluate(() => performance.now());
  await expect(
    page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı", exact: true }),
  ).toBeVisible({ timeout: 10_000 });
  const readyAt = await page.evaluate(() => performance.now());
  return { visibleMs: visibleAt - startedAt, readyMs: readyAt - startedAt };
}

test("Gözlem ilk tıklamada bekletmeden açılır", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await configureAccessibilityClassroom(page);
  await addAccessibilityChild(page);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByRole("button", { name: "Hızlı gözlem", exact: true })).toBeEnabled({
    timeout: 60_000,
  });

  const timing = await measureObservationOpen(page);

  console.info(
    `[navigation-latency] observation visible=${timing.visibleMs.toFixed(1)}ms ready=${timing.readyMs.toFixed(1)}ms visibleBudget=${OBSERVATION_OPEN_BUDGET_MS}ms`,
  );
  expect(timing.visibleMs).toBeLessThanOrEqual(OBSERVATION_OPEN_BUDGET_MS);
  expect(timing.readyMs).toBeLessThanOrEqual(6_000);
});
