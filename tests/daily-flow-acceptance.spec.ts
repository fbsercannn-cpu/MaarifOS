import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 390, height: 844 } });

async function configureClassroomWithStudent(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByLabel("Okul adı").fill("Günlük Akış Kabul Okulu");
  await setup
    .getByLabel("Öğretmen adı soyadı")
    .fill("Kurgu Akış Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Akış Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "48–60 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-08-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-06-30");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page
    .getByRole("button", { name: "Çocuk ekle", exact: true })
    .last()
    .click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill("Kurgu Akış Çocuğu");
  await addStudent
    .getByRole("button", { name: "Kaydet ve kapat", exact: true })
    .click();
  await expect(addStudent).toBeHidden();
}

async function seedCurrentTeacherPlanChain(page: Page) {
  await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const planning = await import(
      "/src/features/planning/teacher-owned-plan-service.ts"
    );
    const store = new core.IndexedDbDataStore();
    await planning.createTeacherOwnedPlanGraph(store, {
      title: "2026–2027 kabul yıllık planı",
      periodStart: "2026-08-01",
      periodEnd: "2027-06-30",
      teacherContent: { narrative: "Kabul testi yıllık omurgası." },
      months: [{
        title: "Ağustos kabul planı",
        monthKey: "2026-08",
        periodStart: "2026-08-01",
        periodEnd: "2026-08-31",
        teacherContent: { narrative: "Ağustos sınıf ritmi." },
        weeks: [{
          title: "24–30 Ağustos kabul haftası",
          weekKey: "2026-W35",
          periodStart: "2026-08-24",
          periodEnd: "2026-08-30",
          teacherContent: { narrative: "Günlük akış hazırlığı." },
        }],
      }],
      now: new Date("2026-08-28T06:00:00.000Z"),
    });
    store.close();
  });
}

test("eksik belge içeriği indirme hatası vermeden doğru hazırlama yüzeyini açar", async ({
  page,
}) => {
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await configureClassroomWithStudent(page);
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();

  const monthlyOutput = page
    .locator(".simple-action-list > button")
    .filter({ hasText: "Aylık eğitim planı" });
  await expect(monthlyOutput).toContainText("Planı hazırla");
  await monthlyOutput.click();
  await expect(
    page.getByRole("dialog", { name: "Kayıtlı öğretmen planı" }),
  ).toBeVisible();
  await expect(page.getByTestId("teacher-feedback")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Kayıtlı öğretmen planı" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  const observationOutput = page
    .locator(".simple-action-list > button")
    .filter({ hasText: "Veli veya idare özeti" });
  await expect(observationOutput).toContainText("Gözlem ekle");
  await observationOutput.click();
  await expect(page.getByRole("heading", { name: "Hızlı Gözlem", exact: true })).toBeVisible();
  await expect(page.getByTestId("teacher-feedback")).toHaveCount(0);
});

test("zincirsiz günlük kayıt hazır görünmez ve çıktı eylemi plan omurgasını açar", async ({
  page,
}) => {
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await configureClassroomWithStudent(page);
  await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const attendance = await import("/src/core/domain/attendance.ts");
    const store = new core.IndexedDbDataStore();
    const snapshot = await store.readSnapshot();
    const classroom = snapshot.classrooms.find(
      (record) => typeof record.deletedAt !== "string",
    );
    if (!classroom) throw new Error("Test sınıfı bulunamadı.");
    const civilDate = attendance.civilDateInIstanbul(new Date());
    const timestamp = new Date().toISOString();
    const planId = crypto.randomUUID();
    await store.transaction(
      "readwrite",
      ["plans", "activities"],
      async (transaction) => {
        await transaction.putMany("plans", [{
          id: planId,
          planType: "daily",
          title: "Zincirsiz günlük kabul planı",
          academicYearId: classroom.academicYearId,
          classroomId: classroom.id,
          curriculumProfileSnapshot: classroom.curriculumProfileSnapshot,
          createdAt: timestamp,
          updatedAt: timestamp,
          civilDate,
          deletedAt: null,
          schemaVersion: 1,
        }]);
        await transaction.putMany("activities", [{
          id: crypto.randomUUID(),
          planId,
          title: "Zincirsiz etkinlik",
          startTime: "09:30",
          status: "planned",
          assignmentMode: "whole-class",
          studentIds: [],
          curriculumProfileSnapshot: classroom.curriculumProfileSnapshot,
          curriculumTargets: [],
          academicYearId: classroom.academicYearId,
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
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();

  const dailyOutput = page
    .locator(".simple-action-list > button")
    .filter({ hasText: "Günlük eğitim planı" });
  await expect(dailyOutput).toContainText("Planı hazırla");
  await expect(dailyOutput).toContainText("yıllık plan omurgasını");
  await dailyOutput.click();
  await expect(
    page.getByRole("dialog", { name: "Kayıtlı öğretmen planı" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plan zincirim" })).toBeVisible();
  await expect(page.getByTestId("teacher-feedback")).toHaveCount(0);
});

test("Planlar ekranı sıradaki günlük işi ilk telefon görünümünde tek dokunuşla açar", async ({
  page,
}) => {
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await configureClassroomWithStudent(page);
  await seedCurrentTeacherPlanChain(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Planlar", exact: true }).click();

  const priority = page.locator(".simple-workspace__priority");
  const hierarchy = page.getByRole("region", { name: "Neyi hazırlayacaksınız?" });
  await expect(priority).toBeVisible();
  await expect(priority).toContainText("Sıradaki planlama işi");
  await expect(priority).toContainText("Bugünün günlük planı yok");
  const positions = await Promise.all([
    priority.evaluate((element) => element.getBoundingClientRect().top),
    hierarchy.evaluate((element) => element.getBoundingClientRect().top),
  ]);
  expect(positions[0]).toBeLessThan(positions[1]);
  expect(positions[0]).toBeLessThan(844);

  await priority.getByRole("button", { name: "Günlük plan oluştur" }).click();
  await expect(
    page.getByRole("dialog", { name: "Günlük plan oluşturma" }),
  ).toBeVisible();
});
