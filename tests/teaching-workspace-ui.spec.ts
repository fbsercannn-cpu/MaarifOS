import { expect, test, type Locator, type Page } from "@playwright/test";
import { childName, readRecords, setup } from "./helpers/development-workspace-ui";

// Reuse the real classroom/observation setup and its Date-only civil clock.
test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 390, height: 844 } });

async function readTeachingRecords(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("maarifos-local");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = (collection: string) => new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const request = db.transaction(collection, "readonly").objectStore(collection).getAll();
      request.onsuccess = () => resolve(request.result.filter((record: Record<string, unknown>) => !record.deletedAt));
      request.onerror = () => reject(request.error);
    });
    try {
      const [plans, activities, settings, links] = await Promise.all([
        read("plans"), read("activities"), read("settings"), read("evidenceCurriculumLinks"),
      ]);
      return {
        plans,
        activities,
        links,
        drafts: settings.filter((record) => record.settingType === "quick-observation-draft"),
      };
    } finally { db.close(); }
  });
}

async function openTodayGuide(page: Page) {
  await page.getByRole("navigation", { name: "Ana menü", exact: true })
    .getByRole("button", { name: "Bugün", exact: true }).click();
  const today = page.getByTestId("today-screen");
  const card = today.locator(".today-teaching-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Bugün için bir fikir");
  await expect(card).toContainText("Öneri · Henüz günlük planınıza eklenmedi");
  const heading = card.getByRole("heading", { level: 2 });
  await expect(heading).toHaveText(/\S/u);
  const title = (await heading.innerText()).trim();
  await today.getByRole("region", { name: "Sıradaki en iyi adım", exact: true })
    .getByRole("button", { name: "Rehberi aç", exact: true }).click();
  const guide = page.getByRole("main", { name: title, exact: true });
  await expect(guide.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
  await expect(guide.getByText("Uygulama rehberi", { exact: true })).toBeVisible();
  return { guide, title };
}

async function openChildObservation(page: Page, guide: Locator, title: string) {
  await guide.getByRole("button", { name: "Çocuğa gözlem ekle", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("region", { name: "Gözlem bağlamı", exact: true })).toContainText(title);
  await dialog.getByRole("region", { name: "Gözlem yapılacak çocuk", exact: true })
    .getByRole("button", { name: childName, exact: true }).click();
  const note = dialog.getByRole("textbox", { name: "Ne oldu?", exact: true });
  await expect(note).toBeEditable();
  return { dialog, note };
}

async function expectPhoneTarget(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeInViewport();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

async function expectNoHorizontalOverflow(page: Page, surface: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await surface.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
}

test("Bugün önerisi aynı başlıklı rehberi açar; öneri plan veya gözlem oluşturmaz", async ({ page }) => {
  await setup(page);
  const before = await readTeachingRecords(page);
  const baseline = await readRecords(page);
  expect(baseline.observations).toHaveLength(1);

  const { guide, title } = await openTodayGuide(page);
  await expect(guide.getByRole("region", { name: "Yanına al", exact: true })).toBeVisible();
  await expect(guide.getByRole("region", { name: "Birlikte uygulayın", exact: true })).toBeVisible();
  await expect(guide.getByRole("region", { name: "Neye bakalım?", exact: true })).toBeVisible();
  await expect(guide.getByRole("button", { name: "Planıma ekle", exact: true })).toBeHidden();
  await expect(page.locator("main.activity-child-mode")).toBeHidden();
  await expect(guide.getByRole("heading", { level: 1 })).toHaveText(title);

  const after = await readTeachingRecords(page);
  expect(after.plans).toEqual(before.plans);
  expect(after.activities).toEqual(before.activities);
  expect(after.drafts).toEqual(before.drafts);
  expect(after.links).toEqual(before.links);
  expect((await readRecords(page)).observations).toEqual(baseline.observations);
});

test("rehber doğru alanla gözlem açar; kayıt, tamamlama ve reload kanıt zincirini korur", async ({ page }) => {
  await setup(page);
  const baseline = await readRecords(page);
  expect(baseline.observations).toHaveLength(1);
  const expectedStudentIds = baseline.observations[0].studentIds;
  expect(expectedStudentIds).toEqual([expect.any(String)]);
  const { guide, title } = await openTodayGuide(page);
  const { dialog, note } = await openChildObservation(page, guide, title);
  await expect(note).toHaveValue("");
  await expect(dialog.getByRole("button", { name: "Gözlemi kaydet", exact: true })).toBeDisabled();

  const context = await readTeachingRecords(page);
  const applications = context.activities.filter((record) => record.activityKind === "activity-studio-application");
  expect(applications).toHaveLength(1);
  const application = applications[0];
  expect(application.title).toBe(title);
  expect(application.sourceActivityId).toEqual(expect.any(String));
  expect(application.id).not.toBe(application.sourceActivityId);
  expect(application.id).not.toBe(baseline.observations[0].activityId);
  expect(context.plans.find((record) => record.id === application.planId)).toMatchObject({
    planType: "activity-studio-application",
    sourceActivityId: application.sourceActivityId,
  });
  expect(application.observationDomainHint).toEqual(expect.any(String));
  await expect(
    dialog.getByRole("combobox", { name: "Öğrenme alanı", exact: true }),
  ).toHaveValue(String(application.observationDomainHint));
  expect((await readRecords(page)).observations).toEqual(baseline.observations);

  const picker = dialog.getByRole("region", { name: "Gelişim bilgisi seç", exact: true });
  // Studio sessions have no invented official target. General, age-appropriate
  // examples stay available and require an explicit teacher selection.
  await expect(picker.getByText("Yaşa göre genel örnekler", { exact: true })).toBeVisible();
  const behavior = picker.getByRole("group", { name: "Gözlenen gelişim davranışları", exact: true })
    .getByRole("button").first();
  await behavior.click();
  await expect(behavior).toHaveAttribute("aria-pressed", "true");
  await expect(note).not.toHaveValue("");
  const selectedText = await note.inputValue();
  expect((await readRecords(page)).observations).toEqual(baseline.observations);
  expect((await readTeachingRecords(page)).links).toEqual(context.links);

  await dialog.getByRole("button", { name: "Gözlemi kaydet", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(guide.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
  const saved = await readRecords(page);
  expect(saved.observations).toHaveLength(2);
  expect(saved.observations.find((record) => record.id === baseline.observations[0].id)).toEqual(baseline.observations[0]);
  const created = saved.observations.filter((record) => record.id !== baseline.observations[0].id);
  expect(created).toHaveLength(1);
  expect(created[0]).toMatchObject({
    studentIds: expectedStudentIds,
    planId: application.planId,
    activityId: application.id,
    rawText: selectedText,
    rawTextImmutable: true,
    developmentSelection: { ageBand: "60-72", presetId: expect.any(String) },
  });
  expect(created[0].context).toEqual(expect.stringContaining(title));
  const finalContext = await readTeachingRecords(page);
  const confirmedLinks = finalContext.links.filter((record) => record.observationId === created[0].id);
  expect(confirmedLinks).toHaveLength(1);
  expect(confirmedLinks[0]).toMatchObject({ confirmationMethod: "teacher-confirmed", officialCatalogVerified: true });
  expect(finalContext.drafts.filter((record) => record.activityId === application.id)).toHaveLength(0);

  await guide.getByRole("button", { name: "Etkinlikler", exact: true }).click();
  await page.getByRole("navigation", { name: "Ana menü", exact: true })
    .getByRole("button", { name: "Bugün", exact: true }).click();
  const complete = page.getByRole("button", { name: "Etkinliği tamamla", exact: true });
  await expect(complete).toBeVisible();
  await complete.click();
  await expect.poll(async () => {
    const record = (await readTeachingRecords(page)).activities.find((item) => item.id === application.id);
    return record?.status;
  }).toBe("completed");
  const afterCompletion = await readRecords(page);
  expect(afterCompletion.observations).toEqual(saved.observations);

  await page.reload({ waitUntil: "networkidle" });
  const reloaded = await readTeachingRecords(page);
  expect(reloaded.activities.find((item) => item.id === application.id)).toMatchObject({ status: "completed" });
  expect((await readRecords(page)).observations).toEqual(saved.observations);
  await expect(page.getByRole("button", { name: "Etkinliği tamamla", exact: true })).toHaveCount(0);
});

test("320 px rehberinde hedefler erişilir; geri dönüş ve tekrar açılış aynı taslağı sürdürür", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await setup(page);
  const baseline = await readRecords(page);
  const { guide, title } = await openTodayGuide(page);
  await expectNoHorizontalOverflow(page, guide);
  await expectPhoneTarget(guide.getByRole("button", { name: "Etkinlikler", exact: true }));
  await expectPhoneTarget(guide.getByRole("button", { name: "Çocuğa gözlem ekle", exact: true }));
  await expectPhoneTarget(guide.locator("summary").filter({ hasText: "Program bağlantısı ve araçlar" }));
  await page.screenshot({ path: testInfo.outputPath("teaching-guide-320.png") });

  let { dialog, note } = await openChildObservation(page, guide, title);
  await expect(note).toHaveValue("");
  const draftText = "Kurgu etkinliğinde ortak materyali arkadaşına uzattı; kendi sırasını bekledi.";
  await expectPhoneTarget(dialog.getByRole("button", { name: "Gözlemi kaydet", exact: true }));
  await expectNoHorizontalOverflow(page, dialog.locator(".quick-observation-page"));
  // Do not wait for debounce: native Back must flush before returning to guide.
  await note.fill(draftText);
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(guide.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
  const first = await readTeachingRecords(page);
  const applications = first.activities.filter((record) => record.activityKind === "activity-studio-application");
  expect(applications).toHaveLength(1);
  const application = applications[0];
  const drafts = first.drafts.filter((record) => record.activityId === application.id);
  expect(drafts).toHaveLength(1);
  expect(drafts[0]).toMatchObject({ rawText: draftText, planId: application.planId });
  expect((await readRecords(page)).observations).toEqual(baseline.observations);

  await guide.getByRole("button", { name: "Etkinlikler", exact: true }).click();
  const catalogue = page.getByRole("main", { name: "Etkinlik ve Materyal Stüdyosu", exact: true });
  await expect(catalogue).toBeVisible();
  await catalogue.getByRole("searchbox", { name: "Etkinliklerde ara", exact: true }).fill(title);
  const matchingCard = catalogue.locator("article.activity-card").filter({
    has: page.getByRole("heading", { name: title, level: 2, exact: true }),
  });
  await expect(matchingCard).toHaveAttribute("data-activity-id", String(application.sourceActivityId));
  await matchingCard.getByRole("button", { name: `${title} rehberini aç`, exact: true }).click();
  await expect(guide.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
  ({ dialog, note } = await openChildObservation(page, guide, title));
  await expect(note).toHaveValue(draftText);
  await expect(dialog.getByRole("region", { name: "Gözlem bağlamı", exact: true })).toContainText(title);
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(guide).toBeVisible();
  const resumed = await readTeachingRecords(page);
  const resumedApplications = resumed.activities.filter((record) => record.activityKind === "activity-studio-application");
  expect(resumedApplications).toHaveLength(1);
  expect(resumedApplications[0]).toMatchObject({ id: application.id, planId: application.planId });
  const resumedDrafts = resumed.drafts.filter((record) => record.activityId === application.id);
  expect(resumedDrafts).toHaveLength(1);
  expect(resumedDrafts[0]).toMatchObject({
    id: drafts[0].id, studentId: drafts[0].studentId, planId: application.planId,
    rawText: draftText, context: drafts[0].context, createdAt: drafts[0].createdAt,
  });
  expect((await readRecords(page)).observations).toEqual(baseline.observations);
  await expectNoHorizontalOverflow(page, guide);
});
