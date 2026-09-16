import { expect, test } from "@playwright/test";
for (const width of [320, 390]) test(`${width}px: kapsam hazırlanırken öğrenci satırı yer değiştirmez`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto("/tests/calendar-loading-fixture.html");
  const coverage = page.getByRole("region", { name: "Gözlem kapsamı", exact: true });
  await expect(coverage).toHaveAttribute("aria-busy", "true");
  await expect(coverage.getByRole("status")).toHaveText("Gözlem kapsamı hazırlanıyor");
  const before = await page.getByTestId("stable-student").boundingBox();
  const loadingHeight = await coverage.evaluate(element => element.getBoundingClientRect().height);
  await page.getByRole("button", { name: "Verileri hazırla" }).click();
  await expect(coverage).not.toHaveAttribute("aria-busy", "true");
  await expect(coverage.getByRole("status")).toContainText("çocukta henüz yok");
  const after = await page.getByTestId("stable-student").boundingBox();
  expect(loadingHeight).toBe(300);
  expect(await coverage.evaluate(element => element.getBoundingClientRect().height)).toBe(300);
  expect(after!.y).toBe(before!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({ path: `output/completion-2026-09-07/calendar/dev/loading-stable-${width}.png` });
});
