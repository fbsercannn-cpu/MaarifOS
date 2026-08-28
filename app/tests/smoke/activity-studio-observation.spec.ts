import { expect, test, type Page } from "@playwright/test";

async function configureClassroomAndStudent(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByLabel("Okul adı").fill("Etkinlik Akışı Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Etkinlik Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "48–60 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Öğrenci ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill("Etkinlik Kanıt Çocuğu");
  await addStudent.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(addStudent).toBeHidden();
}

test("Bugün önerisine dokununca genel listenin başı değil exact etkinlik açılır", async ({
  page,
}) => {
  await page.goto("/?native=1");
  await configureClassroomAndStudent(page);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await page.getByRole("button", { name: /Bugünün akışını ve haftayı aç/ }).click();
  const suggestion = page
    .locator(".simple-today__suggestion-list > button")
    .first();
  const suggestedTitle = (await suggestion.locator("strong").textContent())?.trim();
  expect(suggestedTitle).toBeTruthy();
  await suggestion.click();

  const cards = page.locator("article.activity-card");
  await expect(cards).toHaveCount(1);
  await expect(cards.getByRole("heading", { level: 2 })).toHaveText(
    suggestedTitle!,
  );
  await expect(page.locator(".activity-studio__search input")).toHaveValue(
    suggestedTitle!,
  );
});

test("Etkinlik Atölyesi kaynağı öğretmenin seçtiği gelecek plan gününe bağlanır", async ({
  page,
}, testInfo) => {
  test.slow();
  await page.goto("/?native=1");
  await configureClassroomAndStudent(page);
  await page.getByRole("button", { name: "Etkinlikler", exact: true }).click();

  const activity = page.locator("article.activity-card").first();
  await activity.getByRole("button", { name: /etkinliğini planıma ekle$/u }).click();

  const planDialog = page.getByRole("dialog", { name: "Günlük plan oluşturma" });
  await expect(planDialog).toBeVisible();
  const target = planDialog
    .getByRole("group", { name: "Program hedefleri" })
    .locator("button.curriculum-target")
    .first();
  await target.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "nearest" }),
  );
  // Native kaydırma yüzeyindeki momentum tıklamasını yutmasın; gerçek parmak
  // kullanımındaki kısa duraklamayı iki telefon motorunda da taklit et.
  await page.waitForTimeout(250);
  await target.tap();
  await expect(
    planDialog
      .getByRole("navigation", { name: "Günlük plan oluşturma adımları" })
      .getByRole("button", { name: /Kontrol/u }),
  ).toHaveAttribute("aria-current", "step");
  await planDialog.getByText("Başlık ve saati değiştir", { exact: true }).click();
  await planDialog.getByLabel("Plan tarihi").fill("2026-08-28");
  await planDialog.getByRole("button", { name: "Planı kaydet" }).click();

  await expect(planDialog).toBeHidden();
  await expect(
    page.getByText("Pedagojik etkinlik kaynağı plan günüyle uyuşmuyor.", {
      exact: true,
    }),
  ).toHaveCount(0);

  // Üretim paketi kaynak TypeScript modüllerini yayımlamaz. Canlı kabul UI
  // sonucunu burada doğrular; aynı bundle'ın atomik IDB sözleşmesi yerel smoke
  // kapısında aşağıdaki exact snapshot denetiminden geçer.
  if (testInfo.project.name.startsWith("live-")) return;

  const saved = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const store = new core.IndexedDbDataStore();
    const snapshot = await store.readSnapshot();
    store.close();
    const plan = snapshot.plans.find(
      (record) =>
        record.planType === "daily" && record.civilDate === "2026-08-28",
    );
    const activityRecord = snapshot.activities.find(
      (record) => record.planId === plan?.id,
    );
    return {
      planDate: plan?.civilDate ?? null,
      planSourceDate: plan?.pedagogicalProvenance?.civilDate ?? null,
      activityDate: activityRecord?.civilDate ?? null,
      activitySourceDate:
        activityRecord?.pedagogicalProvenance?.civilDate ?? null,
    };
  });

  expect(saved).toEqual({
    planDate: "2026-08-28",
    planSourceDate: "2026-08-28",
    activityDate: "2026-08-28",
    activitySourceDate: "2026-08-28",
  });
});

test("etkinlik baskısı açılır; uygulama kimliği ve öğretmen gözlemi başka canlı plana bağlanmaz", async ({
  page,
}) => {
  // Açılır pencere, canvas, gerçek indirme ve IndexedDB bağlam çözümünü birlikte
  // sınayan bu çok aşamalı kanıtı yalnız kendi test bütçesi içinde yavaş say.
  test.slow();
  await page.goto("/?native=1");
  await configureClassroomAndStudent(page);
  await page.getByRole("button", { name: "Etkinlikler", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Etkinlik ve Materyal Stüdyosu" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Tüm filtreler", exact: true }).click();
  await page
    .locator(".activity-studio__category-options")
    .getByRole("button", { name: "Çizim", exact: true })
    .click();
  const activity = page.locator("article.activity-card").first();
  const activityTitle = (await activity.getByRole("heading").textContent())?.trim() ?? "";
  expect(activityTitle).not.toBe("");

  const unrelatedActivityId = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const attendance = await import("/src/core/domain/attendance.ts");
    const store = new core.IndexedDbDataStore();
    const snapshot = await store.readSnapshot();
    const classroom = snapshot.classrooms.find(
      (record) => typeof record.deletedAt !== "string",
    );
    const year = snapshot.academicYears.find(
      (record) => record.id === classroom?.academicYearId,
    );
    if (!classroom || !year) throw new Error("Test sınıfı bulunamadı.");
    const civilDate = attendance.civilDateInIstanbul(new Date());
    const timestamp = new Date().toISOString();
    const planId = crypto.randomUUID();
    const activityId = crypto.randomUUID();
    await store.transaction(
      "readwrite",
      ["plans", "activities"],
      async (transaction) => {
        await transaction.putMany("plans", [{
          id: planId,
          planType: "daily",
          title: "İlişkisiz canlı plan A",
          academicYearId: year.id,
          classroomId: classroom.id,
          curriculumProfileSnapshot: classroom.curriculumProfileSnapshot,
          createdAt: timestamp,
          updatedAt: timestamp,
          civilDate,
          deletedAt: null,
          schemaVersion: 1,
        }]);
        await transaction.putMany("activities", [{
          id: activityId,
          planId,
          title: "İlişkisiz canlı etkinlik A",
          startTime: "09:00",
          status: "in_progress",
          assignmentMode: "whole-class",
          studentIds: [],
          curriculumProfileSnapshot: classroom.curriculumProfileSnapshot,
          curriculumTargets: [],
          academicYearId: year.id,
          classroomId: classroom.id,
          createdAt: timestamp,
          updatedAt: timestamp,
          civilDate,
          deletedAt: null,
          schemaVersion: 1,
        }]);
      },
    );
    store.close();
    return activityId;
  });

  const popupPromise = page.waitForEvent("popup");
  await activity.getByRole("button", { name: /materyalini yazdır$/u }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("load");
  expect(popup.url()).toMatch(/^blob:/u);
  await expect(popup).toHaveTitle(new RegExp(activityTitle, "u"));
  await popup.close();

  await activity.getByRole("button", { name: /Çocuk Modunda uygula$/u }).click();
  const childMode = page.locator("main.activity-child-mode");
  await expect(childMode).toBeVisible();
  await childMode.getByRole("button", { name: "Nokta ekle", exact: true }).click();
  await childMode.getByRole("button", { name: "Nokta ekle", exact: true }).click();
  await childMode.getByRole("button", { name: "Nokta ekle", exact: true }).click();
  await childMode.getByRole("button", { name: "Nokta ekle", exact: true }).click();

  const choice = childMode.locator(".activity-child-mode__choice").first();
  const choiceLabel = (await choice.textContent())?.trim() ?? "";
  await choice.click();
  const downloadPromise = page.waitForEvent("download");
  await childMode.getByRole("button", { name: "PNG indir", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^maarifos-.+\.png$/u);

  await childMode
    .getByRole("button", { name: "Bu etkinlik için gözlem yaz", exact: true })
    .click();
  await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
  await expect(page.locator(".quick-observation-page")).toHaveAttribute(
    "data-initial-draft",
    "true",
  );
  const seedLength = Number(
    await page.locator(".quick-observation-page").getAttribute("data-initial-draft-length"),
  );
  expect(seedLength).toBeGreaterThan(0);
  const selectedStudent = page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button", { name: "Etkinlik Kanıt Çocuğu", exact: true });
  await expect(selectedStudent).toHaveAttribute("aria-pressed", "true");
  const observationText = page.getByLabel("Ne oldu?");
  await expect(observationText).toHaveValue(new RegExp(choiceLabel, "u"));
  await expect(observationText).toHaveValue(/4 çizgi/u);

  await page.getByRole("button", { name: "Gözlemi kaydet", exact: true }).click();

  const savedLineage = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const store = new core.IndexedDbDataStore();
    const snapshot = await store.readSnapshot();
    store.close();
    const applicationActivity = snapshot.activities.find(
      (record) => record.activityKind === "activity-studio-application",
    );
    const observation = snapshot.observations.at(-1);
    return {
      observationCount: snapshot.observations.length,
      observationActivityId: observation?.activityId ?? null,
      observationPlanId: observation?.planId ?? null,
      applicationActivityId: applicationActivity?.id ?? null,
      applicationPlanId: applicationActivity?.planId ?? null,
      sourceActivityId: applicationActivity?.sourceActivityId ?? null,
    };
  });
  expect(savedLineage.observationCount).toBe(1);
  expect(savedLineage.applicationActivityId).not.toBe(unrelatedActivityId);
  expect(savedLineage.observationActivityId).toBe(
    savedLineage.applicationActivityId,
  );
  expect(savedLineage.observationPlanId).toBe(savedLineage.applicationPlanId);
  expect(savedLineage.sourceActivityId).toBeTruthy();
});
