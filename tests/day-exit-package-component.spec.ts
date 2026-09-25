import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

test.setTimeout(120_000);

test("320px çevrimdışı çıkış paketi gerçek hazırlığı kaydeder; iki PDF indirme aynı geçmişi kullanır", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.clock.install({ time: new Date("2026-09-21T12:05:00.000Z") });
  await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async () => {
    const fixture = await import("/tests/fixtures/day-exit-package-mount.tsx");
    Object.assign(window, { dayExitMounted: await fixture.mountDayExitPackage() });
  });

  const panel = page.getByRole("region", { name: "Günün çıkış paketi", exact: true });
  const preview = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  await expect(panel.locator('[aria-label="Gün sonu özeti"]')).toContainText("2/2");
  await expect(panel).toContainText("Kurgu Yetkili Yakın");
  await expect(panel).toContainText("Gerçek teslim kaydı eksik");
  await expect(panel).toContainText("Kurgu ertesi gün planı");
  await expect(panel).toContainText("3 materyal");

  await panel.getByRole("button", { name: "Gerçek teslimi kaydet", exact: true }).click();
  await panel.getByRole("button", { name: "Planı aç", exact: true }).click();
  expect(await page.evaluate(() => {
    const mounted = (window as typeof window & { dayExitMounted: any }).dayExitMounted;
    return { pickup: mounted.openedPickups.at(-1), planId: mounted.openedPlans.at(-1) };
  })).toEqual({
    pickup: {
      studentId: await page.evaluate(() => (window as any).dayExitMounted.otherStudentId),
      civilDate: "2026-09-21",
    },
    planId: await page.evaluate(() => (window as any).dayExitMounted.plan.plan.id),
  });

  await context.setOffline(true);
  await panel.getByRole("button", { name: "Seçili sonraki gün hazırlığını kaydet", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("gerçek materyal/hazırlık maddesi", { timeout: 20_000 });
  await context.setOffline(false);
  await panel.getByRole("button", { name: "Günün çıkış paketini A4 PDF önizle", exact: true }).click();
  await expect(preview.locator("canvas[data-pdf-rendered=true]").first()).toBeVisible({ timeout: 30_000 });
  await context.setOffline(true);

  await mkdir("output/day-exit-package-2026-09-12", { recursive: true });
  for (const name of ["ui-first", "ui-second"]) {
    const event = page.waitForEvent("download", { timeout: 20_000 });
    await preview.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click();
    const download = await event;
    expect(download.suggestedFilename()).toBe("MaarifOS_Gunun_Cikis_Paketi_2026-09-21.pdf");
    await download.saveAs(`output/day-exit-package-2026-09-12/${name}.pdf`);
    await expect(preview.getByText("Önizlemedeki PDF indirildi.", { exact: true })).toBeVisible();
    await expect(preview.getByRole("button", { name: "Bu PDF'yi indir", exact: true })).toBeEnabled();
  }
  expect(await readFile("output/day-exit-package-2026-09-12/ui-first.pdf"))
    .toEqual(await readFile("output/day-exit-package-2026-09-12/ui-second.pdf"));
  await expect(preview.getByRole("alert")).toHaveCount(0);
  await page.screenshot({ path: "output/day-exit-package-2026-09-12/320px-preview.png", fullPage: true });

  const stored = await page.evaluate(async () => {
    const mounted = (window as typeof window & { dayExitMounted: any }).dayExitMounted;
    const snapshot = await mounted.store.readSnapshot();
    const preparations = snapshot.settings.filter((record: any) => record.workflow?.kind === "preparation-list"
      && record.workflow.weekStart === mounted.nextDate && record.workflow.weekEnd === mounted.nextDate);
    const history = snapshot.settings.filter((record: any) => record.settingType === "document-version"
      && record.title === "Günün çıkış paketi");
    return {
      changeCount: mounted.changeCount,
      preparationCount: preparations.length,
      preparationItems: preparations.flatMap((record: any) => record.workflow.items).length,
      historyCount: history.length,
      historyStudentIds: history[0]?.studentIds.slice().sort(),
      expectedStudentIds: [mounted.studentId, mounted.otherStudentId].sort(),
      counts: {
        attendanceRecords: snapshot.attendanceRecords.length,
        observations: snapshot.observations.length,
        plans: snapshot.plans.length,
        activities: snapshot.activities.length,
      },
      beforeCounts: mounted.beforeCounts,
      overflow: document.documentElement.scrollWidth > 320,
    };
  });
  expect(stored.changeCount).toBe(1);
  expect(stored.preparationCount).toBe(1);
  expect(stored.preparationItems).toBeGreaterThan(0);
  expect(stored.historyCount).toBe(1);
  expect(stored.historyStudentIds).toEqual(stored.expectedStudentIds);
  expect(stored.counts).toEqual(stored.beforeCounts);
  expect(stored.overflow).toBe(false);
  await context.setOffline(false);
});
