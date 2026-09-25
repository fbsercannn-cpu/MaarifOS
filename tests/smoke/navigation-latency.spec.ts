import { expect, test, type Page } from "@playwright/test";

import {
  addAccessibilityChild,
  configureAccessibilityClassroom,
} from "./accessibility-fixtures";

const OBSERVATION_OPEN_BUDGET_MS = 1_500;
const OBSERVATION_READY_BUDGET_MS = 2_000;
const OBSERVATION_SAVE_BUDGET_MS = 2_000;
const PRIMARY_WORKSPACE_MODULES = [
  "SimpleClassroomScreen",
  "SimplePlanWorkspaceScreen",
  "SimpleDocumentWorkspaceScreen",
] as const;

test("ana çalışma alanları ilk dokunuştan önce arka planda hazırlanır", async ({ page }) => {
  const requestedModules = new Set<string>();
  page.on("request", (request) => {
    const match = PRIMARY_WORKSPACE_MODULES.find((name) => request.url().includes(name));
    if (match) requestedModules.add(match);
  });

  await page.goto("/?native=1");

  await expect
    .poll(() => requestedModules.size, {
      message: "Sınıfım, Planlar ve Belgeler çalışma alanları boş zamanda hazırlanmalı",
      timeout: 10_000,
    })
    .toBe(PRIMARY_WORKSPACE_MODULES.length);
});

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
  await expect(page.locator('button[aria-label="Hızlı gözlem"]')).toBeEnabled({
    timeout: 60_000,
  });

  const timing = await measureObservationOpen(page);

  console.info(
    `[navigation-latency] observation visible=${timing.visibleMs.toFixed(1)}ms ready=${timing.readyMs.toFixed(1)}ms visibleBudget=${OBSERVATION_OPEN_BUDGET_MS}ms`,
  );
  expect(timing.visibleMs).toBeLessThanOrEqual(OBSERVATION_OPEN_BUDGET_MS);
  expect(timing.readyMs).toBeLessThanOrEqual(OBSERVATION_READY_BUDGET_MS);
});

test("Gözlem metni yazımı ve kesin kayıt öğretmeni bekletmez", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await configureAccessibilityClassroom(page);
  await addAccessibilityChild(page);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await page.getByRole("button", { name: "Gözlem", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı", exact: true });
  const note = dialog.getByLabel("Ne oldu?");
  await expect(note).toBeEnabled({ timeout: 10_000 });

  const observation = "Çocuk blokları renklerine göre ayırdı, arkadaşına iki bloğu uzattı ve sırasını bekledi.";
  const typingStartedAt = performance.now();
  await note.pressSequentially(observation);
  const typingMs = performance.now() - typingStartedAt;
  await expect(note).toHaveValue(observation);
  expect(typingMs).toBeLessThanOrEqual(2_000);

  const saveStartedAt = performance.now();
  await dialog.getByRole("button", { name: "Gözlemi kaydet", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  const saveMs = performance.now() - saveStartedAt;
  console.info(`[navigation-latency] observation typing=${typingMs.toFixed(1)}ms save=${saveMs.toFixed(1)}ms`);
  expect(saveMs).toBeLessThanOrEqual(OBSERVATION_SAVE_BUDGET_MS);
});
