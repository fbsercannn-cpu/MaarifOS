import { expect, test } from "@playwright/test";

test("320px çevrimdışı panel seçili çocukları gerçek günlük etkinliğe kaydeder ve aynı planı açar", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.clock.install({ time: new Date("2026-09-12T09:00:00.000Z") });
  await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async () => {
    const fixture = await import("/tests/fixtures/small-group-cards-mount.tsx");
    Object.assign(window, { smallGroupMounted: await fixture.mountSmallGroupCardsPanel() });
  });

  const panel = page.getByRole("region", { name: "Küçük grup kartları" });
  await expect(panel.getByLabel("Haftanın günlük planı")).toHaveValue(/.+/u);
  await expect(panel).toContainText("Gerçek materyaller: sepet");
  const save = panel.getByRole("button", { name: "Seçili grubu günlük plana yerleştir", exact: true });
  await expect(save).toBeDisabled();
  await panel.getByRole("checkbox", { name: "Kurgu Çocuk 1 küçük gruba seç", exact: true }).check();
  await panel.getByRole("checkbox", { name: "Kurgu Çocuk 2 küçük gruba seç", exact: true }).check();
  await expect(panel).toContainText("Tüm sınıf (2 çocuk), aşağıda açıkça seçtiğiniz 2 çocukla değiştirilecek.");

  await context.setOffline(true);
  await save.click();
  await expect(panel.getByRole("status")).toContainText("küçük grubu günlük plana yerleştirildi");
  await panel.getByRole("button", { name: "Günlük planı aç", exact: true }).click();

  const result = await page.evaluate(async () => {
    const mounted = (window as typeof window & { smallGroupMounted: any }).smallGroupMounted;
    const snapshot = await mounted.store.readSnapshot();
    const planId = mounted.plans[0].plan.id;
    const activityId = mounted.plans[0].activity.id;
    const plan = snapshot.plans.find((record: any) => record.id === planId);
    const activity = snapshot.activities.find((record: any) => record.id === activityId);
    return {
      samePlanOpened: mounted.openedPlanIds.at(-1) === planId,
      changeCount: mounted.changeCount,
      counts: {
        plans: snapshot.plans.length,
        activities: snapshot.activities.length,
        observations: snapshot.observations.length,
      },
      beforeCounts: mounted.beforeCounts,
      planAssignment: {
        mode: plan?.assignmentMode,
        ids: [...(plan?.studentIds ?? [])].sort(),
        coverage: plan?.coverageStatus,
      },
      activityAssignment: {
        mode: activity?.assignmentMode,
        ids: [...(activity?.studentIds ?? [])].sort(),
        status: activity?.status,
        targets: (activity?.targetAssignments ?? []).map((entry: any) => `${entry.studentId}:${entry.status}`).sort(),
      },
      expectedIds: [mounted.input.studentId, mounted.otherStudentId].sort(),
      overflow: document.documentElement.scrollWidth > 320,
    };
  });
  expect(result.samePlanOpened).toBe(true);
  expect(result.changeCount).toBe(1);
  expect(result.counts).toEqual(result.beforeCounts);
  expect(result.planAssignment).toEqual({ mode: "selected-students", ids: result.expectedIds, coverage: "planned" });
  expect(result.activityAssignment).toEqual({
    mode: "selected-students",
    ids: result.expectedIds,
    status: "planned",
    targets: result.expectedIds.map((id: string) => `${id}:planned`).sort(),
  });
  expect(result.overflow).toBe(false);
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await context.setOffline(false);
});
