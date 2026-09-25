test.describe.configure({timeout:60_000});
import { expect, test, type Page } from "@playwright/test";
import { installCivilClock } from "../helpers/development-workspace-ui";

test.beforeEach(async ({ page }) => {
  await installCivilClock(page);
});

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
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-08-31");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden({timeout:30_000});
  await expect(page.getByRole("button", { name: "Eğitim yılını başlat", exact: true })).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill("Etkinlik Kanıt Çocuğu");
  await addStudent.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(addStudent).toBeHidden();
}

async function openActivityCatalogue(page: Page) {
  await page.getByRole("navigation", { name: "Ana menü", exact: true })
    .getByRole("button", { name: "Planlar", exact: true }).click();
  await page.getByRole("button", { name: /Gelişmiş plan desteğini aç/u }).click();
  await page.getByRole("button", { name: /^Oyun ve materyaller/u }).click();
  await expect(page.locator("main.activity-studio")).toBeVisible();
}

test("Bugün önerisine dokununca genel listenin başı değil exact etkinlik açılır", async ({
  page,
}) => {
  await page.goto("/?native=1");
  await configureClassroomAndStudent(page);
  await page.getByRole("button", { name: "Bugün", exact: true }).click();
  await page.getByRole("button", { name: "Günün ayrıntıları", exact: true }).click();
  const suggestion = page
    .locator(".simple-today__suggestion-list > button")
    .first();
  const suggestedTitle = (await suggestion.locator("strong").textContent())?.trim();
  expect(suggestedTitle).toBeTruthy();
  await suggestion.click();

  const guide = page.locator("main.activity-teacher-guide");
  await expect(guide).toHaveCount(1);
  await expect(guide.getByRole("heading", { level: 1 })).toHaveText(suggestedTitle!);
  await expect(guide.getByText("Uygulama rehberi", { exact: true })).toBeVisible();
  await expect(page.locator("article.activity-card")).toHaveCount(0);
  await expect(page.locator(".activity-studio__search input")).toHaveCount(0);
});

test("Etkinlik Atölyesi kaynağı öğretmenin seçtiği gelecek plan gününe bağlanır", async ({
  page,
}, testInfo) => {
  test.slow();
  await page.goto("/?native=1");
  await configureClassroomAndStudent(page);
  await openActivityCatalogue(page);

  const activity = page.locator("article.activity-card").first();
  const activityTitle = (await activity.getByRole("heading").textContent())?.trim() ?? "";
  expect(activityTitle).not.toBe("");
  await activity.getByRole("button", { name: /rehberini aç$/u }).click();
  const guide = page.locator("main.activity-teacher-guide");
  await expect(guide.getByRole("heading", { level: 1 })).toHaveText(activityTitle);
  await guide.locator("summary").filter({ hasText: "Program bağlantısı ve araçlar" }).click();
  await guide.getByRole("button", { name: "Planıma ekle", exact: true }).click();

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
  await target.click();
  await expect(
    planDialog
      .getByRole("navigation", { name: "Günlük plan oluşturma adımları" })
      .getByRole("button", { name: /Kontrol/u }),
  ).toHaveAttribute("aria-current", "step");
  await planDialog.getByText("Başlık ve saati değiştir", { exact: true }).click();
  await planDialog.getByLabel("Plan tarihi").fill("2026-09-11");
  await planDialog.getByRole("button", { name: "Planı kaydet" }).click();

  await expect(planDialog).toBeHidden({timeout:30_000});
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
        record.planType === "daily" && record.civilDate === "2026-09-11",
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
    planDate: "2026-09-11",
    planSourceDate: "2026-09-11",
    activityDate: "2026-09-11",
    activitySourceDate: "2026-09-11",
  });
});

test("etkinlik baskısı açılır; uygulama kimliği ve öğretmen gözlemi başka canlı plana bağlanmaz", async ({
  page,
}, testInfo) => {
  const isLiveRun = testInfo.project.name.startsWith("live-");
  // Açılır pencere, canvas, gerçek indirme ve IndexedDB bağlam çözümünü birlikte
  // sınayan bu çok aşamalı kanıtı yalnız kendi test bütçesi içinde yavaş say.
  test.slow();
  await page.goto("/?native=1");
  await configureClassroomAndStudent(page);
  await openActivityCatalogue(page);
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

  const sourceActivityId = await activity.getAttribute("data-activity-id");
  expect(sourceActivityId).toBeTruthy();

  const unrelated = isLiveRun ? null : await page.evaluate(async () => {
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
          status: "planned",
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
    return { activityId, planId };
  });

  await activity.getByRole("button", { name: /rehberini aç$/u }).click();
  const guide = page.locator("main.activity-teacher-guide");
  await expect(guide.getByRole("heading", { level: 1 })).toHaveText(activityTitle);
  await guide.locator("summary").filter({ hasText: "Program bağlantısı ve araçlar" }).click();

  await guide.getByRole("button", { name: "Yazdır", exact: true }).click();
  const printPreview = page.getByRole("dialog", {name:"PDF önizlemesi",exact:true});
  await expect(printPreview).toBeVisible();
  await expect(printPreview).toContainText(activityTitle);
  const pdfDownload = page.waitForEvent("download");
  await printPreview.getByRole("button", {name:"Bu PDF'yi indir",exact:true}).click();
  expect((await pdfDownload).suggestedFilename()).toMatch(/\.pdf$/u);
  await printPreview.getByRole("button", {name:"PDF önizlemesini kapat",exact:true}).click();
  await expect(printPreview).toBeHidden();
  await guide.getByRole("button", { name: /Çocuk Modunda uygula$/u }).click();
  const childMode = page.locator("main.activity-child-mode");
  await expect(childMode).toBeVisible({timeout:30_000});
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
  await expect(
    page.getByRole("dialog", {
      name: "Gözlem ve değerlendirme akışı",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".quick-observation-page")).toHaveAttribute(
    "data-initial-draft",
    "true",
  );
  const seedLength = Number(
    await page.locator(".quick-observation-page").getAttribute("data-initial-draft-length"),
  );
  expect(seedLength).toBeGreaterThan(0);
  await expect(page.locator(".quick-selected-child strong")).toHaveText("Etkinlik Kanıt Çocuğu");
  await page.locator(".quick-selected-child").getByRole("button", { name: "Çocuğu değiştir", exact: true }).click();
  const selectedStudent = page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button", { name: "Etkinlik Kanıt Çocuğu", exact: true });
  await expect(selectedStudent).toHaveAttribute("aria-pressed", "true");
  const observationText = page.getByLabel("Ne oldu?");
  await expect(observationText).toHaveValue(new RegExp(choiceLabel, "u"));
  await expect(observationText).toHaveValue(/4 çizgi/u);

  await page.getByRole("button", { name: "Gözlemi kaydet", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı" }),
  ).toBeHidden();

  // Üretim paketi kaynak TypeScript modüllerini yayımlamaz. Canlı kapı gerçek
  // kullanıcı akışını bu noktaya kadar doğrular; exact IDB soy bağı aynı bundle
  // için yerel smoke koşumunda aşağıda sınanır.
  if (isLiveRun) return;

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
  expect(savedLineage.applicationActivityId).not.toBe(unrelated!.activityId);
  expect(savedLineage.applicationPlanId).not.toBe(unrelated!.planId);
  expect(savedLineage.observationActivityId).toBe(
    savedLineage.applicationActivityId,
  );
  expect(savedLineage.observationPlanId).toBe(savedLineage.applicationPlanId);
  expect(savedLineage.sourceActivityId).toBe(sourceActivityId);
});
