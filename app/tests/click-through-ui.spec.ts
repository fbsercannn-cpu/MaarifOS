import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 320, height: 844 } });
test.describe.configure({ timeout: 90_000 });
const child = "Kurgu Tıklama Çocuğu";
const raw = "Kurgu çocuk blok oyununda arkadaşına parçaları sırayla verdi.";

async function setup(page: Page) {
  await page.clock.setFixedTime(new Date("2026-09-16T09:00:00.000Z"));
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Tıklama Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Tıklama Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await add.getByLabel("Çocuğun adı", { exact: true }).fill(child);
  await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(add).toBeHidden();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  const start = page.getByRole("button", { name: "Eğitim yılını başlat", exact: true });
  if (await start.isVisible()) { await start.click(); await expect(start).toBeHidden(); }
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
}
async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const store = new IndexedDbDataStore();
    try { return await store.readSnapshot(); } finally { store.close(); }
  });
}
async function reopen(page: Page, day: number) {
  await page.reload();
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(`^${child} 60`) }).click();
  await page.getByRole("button", { name: `${day} Eylül 2026 tarihli gözlemi aç`, exact: true }).click();
  return page.getByRole("dialog", { name: "Gözlemden sonraki adım", exact: true });
}

test("üst gözlem kartından dün seçilir, gerçek etkinlik ve hedefe bağlanır; yenilemede kanıt korunur", async ({ page }) => {
  await setup(page);
  await page.clock.setFixedTime(new Date("2026-09-17T09:00:00.000Z"));
  await page.reload();
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: `${child} için Maarif gelişim gözlemi ekle`, exact: true }).click();
  await page.getByRole("textbox", { name: "Ne oldu?", exact: true }).fill(raw);
  await page.getByRole("button", { name: "Gözlemi kaydet", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Gözlemden sonraki adım", exact: true })).toBeVisible();
  const original = (await snapshot(page)).observations[0];
  const completion = await reopen(page, 17);
  await page.goBack();
  await expect(completion).toBeHidden();
  await page.goForward();
  await expect(completion).toBeVisible();
  const individualSteps = completion.getByText("Adımları ayrı ayrı düzenle", { exact: true });
  if (await individualSteps.count() && !await individualSteps.evaluate(el => el.closest("details")?.open)) await individualSteps.click();
  const metadata = completion.getByRole("region", { name: "Gözlemin tarihi ve bağlantıları", exact: true });
  await metadata.getByRole("button", { name: "Dün", exact: true }).click();
  await metadata.getByRole("button", { name: "Planlı etkinlik seçmeden bu tarihe kaydet", exact: true }).click();
  await expect(metadata.getByRole("status")).toHaveText("Gözlemin tarihi ve bağlantıları kaydedildi.");
  const corrected = (await snapshot(page)).observations[0];
  expect(corrected.civilDate).toBe("2026-09-16");
  expect(corrected.observedAt).toBe("2026-09-16T09:00:00.000Z");
  expect(corrected.rawText).toBe(raw);
  expect(corrected.createdAt).toBe(original.createdAt);
  const source = await page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const { createPlanWithActivity } = await import("/src/features/evidence/evidence-flow.ts");
    const { curriculumTargetsForProfile } = await import("/src/features/curriculum/curriculum-catalog.ts");
    const store = new IndexedDbDataStore();
    try {
      const s = await store.readSnapshot();
      const profile = s.classrooms[0].curriculumProfileSnapshot;
      const target = curriculumTargetsForProfile(profile)[0];
      const result = await createPlanWithActivity(store, {
        civilDate: "2026-09-16", planTitle: "Kurgu Dünkü Paylaşım Planı", activityTitle: "Kurgu Dünkü Paylaşım Etkinliği",
        startTime: "10:00", endTime: "10:30", curriculumProfile: profile, curriculumTargets: [target],
        assignmentMode: "selected-students", studentIds: [s.students[0].id], now: new Date("2026-09-17T09:01:00.000Z"),
      });
      return { planId: result.plan.id, activityId: result.activity.id, targetId: target.id };
    } finally { store.close(); }
  });
  await page.clock.setFixedTime(new Date("2026-09-17T09:02:00.000Z"));
  const reopened = await reopen(page, 16);
  const reopenedSteps = reopened.getByText("Adımları ayrı ayrı düzenle", { exact: true });
  if (await reopenedSteps.count() && !await reopenedSteps.evaluate(el => el.closest("details")?.open)) await reopenedSteps.click();
  const edit = reopened.getByRole("region", { name: "Gözlemin tarihi ve bağlantıları", exact: true });
  await expect(edit.getByRole("textbox", { name: "Olayın gerçekleştiği tarih" })).toHaveCount(0);
  await expect(edit.locator('input[type="date"]')).toHaveValue("2026-09-16");
  await edit.getByText("Kurgu Dünkü Paylaşım Etkinliği · 2026-09-16", { exact: true }).click();
  await edit.getByRole("button", { name: "Etkinliğe ve bu hedefe bağla", exact: true }).click();
  await expect(edit.getByRole("status")).toHaveText("Gözlemin tarihi ve bağlantıları kaydedildi.");
  const linked = await snapshot(page);
  expect(linked.observations[0]).toMatchObject({ id: original.id, planId: source.planId, activityId: source.activityId, civilDate: "2026-09-16", rawText: raw, createdAt: original.createdAt });
  expect(linked.evidenceCurriculumLinks.some(link => link.observationId === original.id && link.plannedTargetId === source.targetId)).toBe(true);
  expect(await edit.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await reopen(page, 16);
  expect((await snapshot(page)).observations[0].activityId).toBe(source.activityId);
});




test("Planlar hazır omurgadan günlük akışa tıklamalarla ilerler ve aynı kayıt yeniden açılır", async ({ page }) => {
  await setup(page);
  await page.clock.setFixedTime(new Date("2026-09-17T09:00:00.000Z"));
  await page.reload();
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await expect(page.getByRole("region", { name: "Planı adım adım tamamla", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Yıl–ay–hafta omurgasını kaydet", exact: true }).click();
  await expect(page.getByRole("button", { name: "Günlük planı kaydet ve aç", exact: true }).first()).toBeVisible();
  const spine = await snapshot(page);
  const annual = spine.plans.find(plan => plan.planType === "annual");
  const monthly = spine.plans.find(plan => plan.planType === "monthly" && plan.monthKey === "2026-09");
  const weekly = spine.plans.find(plan => plan.planType === "weekly" && plan.monthlyPlanId === monthly!.id && plan.periodStart <= "2026-09-17" && plan.periodEnd >= "2026-09-17");
  expect(annual).toBeTruthy();
  expect(monthly).toMatchObject({ annualPlanId: annual!.id });
  expect(weekly).toMatchObject({ annualPlanId: annual!.id, monthlyPlanId: monthly!.id });
  // The next teacher choice happens after the spine commit, not at the frozen creation instant.
  await page.clock.setFixedTime(new Date("2026-09-17T09:01:00.000Z"));
  await page.getByRole("button", { name: "Günlük planı kaydet ve aç", exact: true }).first().click();
  await expect.poll(async () => (await snapshot(page)).plans.filter(plan => plan.planType === "daily" && plan.civilDate === "2026-09-17").length).toBe(1);
  const saved = await snapshot(page);
  const daily = saved.plans.find(plan => plan.planType === "daily" && plan.civilDate === "2026-09-17")!;
  expect(daily).toMatchObject({ sourceAnnualPlanId: annual!.id, sourceMonthlyPlanId: monthly!.id, sourceWeeklyPlanId: weekly!.id });
  expect(daily.teacherOwnedDailyFlow).toBeTruthy();
  const activity = saved.activities.find(activity => activity.planId === daily.id)!;
  expect(activity).toMatchObject({ sourceAnnualPlanId: annual!.id, sourceMonthlyPlanId: monthly!.id, sourceWeeklyPlanId: weekly!.id, status: "planned" });
  expect(activity.teacherOwnedFlowBlockId).toBeTruthy();
  await expect(page.getByRole("dialog", { name: "Gün planı", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await page.getByRole("button", { name: "Kayıtlı günlük planı aç", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Gün planı", exact: true })).toBeVisible();
  expect((await snapshot(page)).plans.filter(plan => plan.planType === "daily" && plan.civilDate === "2026-09-17")).toHaveLength(1);
});





