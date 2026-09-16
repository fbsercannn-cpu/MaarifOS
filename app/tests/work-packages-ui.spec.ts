import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 320, height: 844 } });
test.describe.configure({ timeout: 120_000 });
const child = "Kurgu Paket Çocuğu";
const notes = ["Kurgu çocuk hikâyeyi kendi cümleleriyle anlattı.", "Kurgu çocuk dinlediği hikâyeyi kendi cümleleriyle anlattı."];

async function setup(page: Page) {
  await page.clock.setFixedTime(new Date("2026-09-17T09:00:00.000Z"));
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Paket Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Paket Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await add.getByLabel("Çocuğun adı", { exact: true }).fill(child);
  await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(add).toBeHidden();
}
async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const store = new IndexedDbDataStore();
    try { return await store.readSnapshot(); } finally { store.close(); }
  });
}
async function addObservation(page: Page, raw: string, minute: number) {
  await page.clock.setFixedTime(new Date(`2026-09-17T09:${String(minute).padStart(2, "0")}:00.000Z`));
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: `${child} için Maarif gelişim gözlemi ekle`, exact: true }).click();
  await page.getByRole("textbox", { name: "Ne oldu?", exact: true }).fill(raw);
  await page.getByRole("button", { name: "Gözlemi kaydet", exact: true }).click();
  const completion = page.getByRole("dialog", { name: "Gözlemden sonraki adım", exact: true });
  await expect(completion).toBeVisible();
  await completion.getByRole("button", { name: "Gözlemden sonraki adım ekranını kapat", exact: true }).click();
  await expect(completion).toBeHidden();
}

test("iki gözlem paketi tek işlemde bağlanır; geri alma sonradan eklenen ilgisiz gözlemi korur", async ({ page }) => {
  await setup(page);
  await page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const { createPlanWithActivity } = await import("/src/features/evidence/evidence-flow.ts");
    const { curriculumTargetsForProfile } = await import("/src/features/curriculum/curriculum-catalog.ts");
    const store = new IndexedDbDataStore();
    try {
      const state = await store.readSnapshot();
      const profile = state.classrooms[0].curriculumProfileSnapshot;
      const target = curriculumTargetsForProfile(profile).find(row => row.referenceCode === "TAKB.2")!;
      await createPlanWithActivity(store, { civilDate: "2026-09-17", planTitle: "Kurgu Hikâyeyi Anlatma Planı", activityTitle: "Kurgu Hikâyeyi Kendi Cümleleriyle Anlatma", startTime: "10:00", endTime: "10:30", curriculumProfile: profile, curriculumTargets: [target], assignmentMode: "selected-students", studentIds: [state.students[0].id], now: new Date("2026-09-17T09:00:30.000Z") });
    } finally { store.close(); }
  });
  for (const [index, raw] of notes.entries()) await addObservation(page, raw, index + 1);
  await page.reload();
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  const packages = page.getByRole("region", { name: "Hazır iş paketleri", exact: true }).first();
  await expect(packages).toBeVisible();
  const before = await snapshot(page);
  for (const raw of notes) await packages.locator("article").filter({ hasText: raw }).getByRole("checkbox").check();
  await page.clock.setFixedTime(new Date("2026-09-17T09:03:00.000Z"));
  await packages.getByRole("button", { name: "Seçili paketleri uygula (2)", exact: true }).click();
  await expect(packages.getByRole("button", { name: "Bu işlemi geri al", exact: true })).toBeVisible();
  const applied = await snapshot(page);
  for (const original of before.observations) {
    expect(applied.observations.find(row => row.id === original.id)).toMatchObject({ rawText: original.rawText, createdAt: original.createdAt });
    expect(applied.evidenceCurriculumLinks.some(row => row.observationId === original.id)).toBe(true);
  }
  expect(await packages.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  const unrelatedId = await page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const { persistDashboardObservation } = await import("/src/features/dashboard/dashboard-data.ts");
    const store = new IndexedDbDataStore();
    try {
      const state = await store.readSnapshot();
      const id = crypto.randomUUID();
      await persistDashboardObservation(store, { id, studentId: state.students[0].id, createdAtUtc: "2026-09-17T09:04:00.000Z", rawText: "Kurgu ilgisiz gözlem: bahçedeki ağacı çizdi." }, { now: new Date("2026-09-17T09:04:00.000Z") });
      return id;
    } finally { store.close(); }
  });
  await page.clock.setFixedTime(new Date("2026-09-17T09:05:00.000Z"));
  await packages.getByRole("button", { name: "Bu işlemi geri al", exact: true }).click();
  await expect(packages).toContainText("Paketin yaptığı değişiklikler geri alındı.");
  const undone = await snapshot(page);
  expect(undone.observations.find(row => row.id === unrelatedId)?.rawText).toBe("Kurgu ilgisiz gözlem: bahçedeki ağacı çizdi.");
  for (const original of before.observations) expect(undone.observations.find(row => row.id === original.id)).toEqual(original);
  expect(undone.evidenceCurriculumLinks).toEqual(before.evidenceCurriculumLinks);
  expect(undone.students).toEqual(before.students);
  await page.reload();
  const reloaded = await snapshot(page);
  expect(reloaded.observations).toHaveLength(3);
  expect(reloaded.evidenceCurriculumLinks).toEqual(before.evidenceCurriculumLinks);
});

test("hazır plan paketi omurgayı ve günlük akışı bir tıklamada kurar; yeni gözlem mevcut haftayı kullanır", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  const planning = page.getByRole("region", { name: "Hazır iş paketleri", exact: true }).first();
  await expect(planning.locator(".work-package-apply")).toBeEnabled();
  await page.clock.setFixedTime(new Date("2026-09-17T09:01:00.000Z"));
  await planning.locator(".work-package-apply").click();
  await expect(planning.getByRole("button", { name: "Bu işlemi geri al", exact: true })).toBeVisible();
  const planned = await snapshot(page);
  const daily = planned.plans.find(row => row.planType === "daily" && row.civilDate === "2026-09-17" && row.teacherOwnedDailyFlow)!;
  expect(daily).toBeTruthy();
  const annual = planned.plans.find(row => row.id === daily.sourceAnnualPlanId)!;
  const monthly = planned.plans.find(row => row.id === daily.sourceMonthlyPlanId)!;
  const weekly = planned.plans.find(row => row.id === daily.sourceWeeklyPlanId)!;
  expect(annual.planType).toBe("annual");
  expect(monthly).toMatchObject({ planType: "monthly", annualPlanId: annual.id });
  expect(weekly).toMatchObject({ planType: "weekly", annualPlanId: annual.id, monthlyPlanId: monthly.id });
  expect(planned.activities.some(row => row.planId === daily.id && row.status === "planned" && row.teacherOwnedFlowBlockId)).toBe(true);
  expect(await planning.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.reload();
  await addObservation(page, notes[0], 2);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  const candidateCount = await page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const { loadWorkPackageModel } = await import("/src/features/work-packages/work-package-service.ts");
    const store = new IndexedDbDataStore();
    try { return (await loadWorkPackageModel(store, { civilDate: "2026-09-17", mode: "observations" })).candidates.length; }
    finally { store.close(); }
  });
  expect(candidateCount).toBeGreaterThan(0);
  const packages = page.getByRole("region", { name: "Hazır iş paketleri", exact: true }).first();
  await expect(packages).toBeVisible();
  await packages.locator("article").filter({ hasText: notes[0] }).getByRole("checkbox").check();
  await page.clock.setFixedTime(new Date("2026-09-17T09:03:00.000Z"));
  await packages.locator(".work-package-apply").click();
  await expect(packages.getByRole("button", { name: "Bu işlemi geri al", exact: true })).toBeVisible();
  const applied = await snapshot(page);
  expect(applied.plans.filter(row => row.planType === "weekly").map(row => row.id).sort()).toEqual(planned.plans.filter(row => row.planType === "weekly").map(row => row.id).sort());
  expect(applied.plans.filter(row => row.teacherOwnedDailyFlow && row.civilDate === "2026-09-17").map(row => row.id)).toEqual([daily.id]);
  const decision = applied.settings.find(row => row.workflow?.kind === "learning-decision" && row.workflow.observationIds.includes(applied.observations[0].id));
  expect(decision).toBeTruthy();
  expect(applied.settings.some(row => row.workflow?.kind === "learning-plan-link" && row.workflow.sourceId === decision!.id)).toBe(true);
  await page.reload();
  const reloaded = await snapshot(page);
  expect(reloaded.plans.filter(row => row.teacherOwnedDailyFlow && row.civilDate === "2026-09-17").map(row => row.id)).toEqual([daily.id]);
  await addObservation(page, notes[1], 4);
  await expect(page.getByRole("region", { name: "Hazır iş paketleri", exact: true }).first()).toContainText("Önceki açık seçiminizle hazırlandı");
  const beforeNextChoice = await snapshot(page);
  expect(beforeNextChoice.settings.filter(row => row.workflow?.kind === "learning-plan-link")).toHaveLength(1);
});



