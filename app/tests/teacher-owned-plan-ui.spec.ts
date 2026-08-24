import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.describe.configure({ timeout: 60_000 });
test.use({ viewport: { width: 390, height: 844 } });

async function configureActiveClassroom(page: import("@playwright/test").Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Kurgu İlkokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Emine Akış");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Plan Zinciri Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-08-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-06-30");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

async function openTeacherPlanWorkspace(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Planlar", exact: true })).toBeVisible();
  await page
    .getByRole("region", { name: "Neyi hazırlayacaksınız?" })
    .getByRole("button", { name: /Yıllık planlama panosu/i })
    .click();
  const dialog = page.getByRole("dialog", { name: "Kayıtlı öğretmen planı" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("öğretmen premium olmadan yıl → ay → hafta planını oluşturur, revize eder, Word alır ve reload sonrası aynı kimliklerle açar", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureActiveClassroom(page);
  let dialog = await openTeacherPlanWorkspace(page);

  await expect(dialog.getByRole("heading", { name: "TYMM başlangıç öneriniz hazır" })).toBeVisible();
  await dialog.getByText("Başlangıç metinlerini düzenle", { exact: true }).click();
  await dialog
    .getByLabel("Bu yıl sınıfınız için en önemli öncelik nedir?")
    .fill("Her çocuğun güvenli katılımını güçlendirmek");
  await dialog
    .getByLabel("Bu ay neye odaklanacaksınız?")
    .fill("Sınıf aidiyeti ve birlikte yaşam rutinleri");
  await dialog
    .getByLabel("Bu haftanın öğretmen akışı nedir?")
    .fill("Karşılama, oyun, açık hava, gözlem ve gün sonu yansıtması");
  await dialog
    .getByLabel("Sonraki ay için başlangıç niyetiniz nedir?")
    .fill("İlk ayın kanıtlarına göre katılım yollarını çeşitlendirmek");
  await dialog.getByRole("button", { name: "Yıl → ay → hafta planını oluştur" }).click();

  await expect(dialog).toContainText("tek işlemde bu cihaza kaydedildi");
  await expect(dialog.getByRole("button", { name: "Yıllık planı düzenle" })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /aylık planını düzenle/i }).first(),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /haftalık planını düzenle/i }).first(),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Yıllık planı düzenle" }).click();
  await dialog.getByLabel("Plan başlığı").fill("Kurgu Öğretmenin Revize Yıllık Planı");
  await dialog
    .getByLabel("Öğretmen plan notu")
    .fill("Katılım, oyun ve gözlem kararları her hafta yeniden değerlendirilecek.");
  await dialog.getByRole("button", { name: "Revizyonu kaydet" }).click();
  await expect(dialog).toContainText("önceki sürüm korunarak kaydedildi");
  await expect(dialog).toContainText("revizyon 2");

  const documentCenter = dialog.locator(
    'section[aria-labelledby="teacher-plan-export-title"]',
  );
  await documentCenter.getByLabel("Belge kapsamı").selectOption("combined");
  await expect(documentCenter.getByTestId("teacher-owned-document-basis")).toHaveText(
    "MaarifOS destek belgesi",
  );
  await expect(documentCenter.getByRole("checkbox")).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await documentCenter.getByRole("button", { name: "Word hazırla" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^MaarifOS_Ogretmen_Plani_Birlesik\.docx$/,
  );
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const bytes = await readFile(downloadPath!);
  expect(bytes.subarray(0, 2).toString("ascii")).toBe("PK");

  const pdfDownloadPromise = page.waitForEvent("download");
  await documentCenter.getByRole("button", { name: "PDF hazırla" }).click();
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toBe(
    "MaarifOS_Ogretmen_Plani_Birlesik.pdf",
  );
  const pdfPath = await pdfDownload.path();
  expect(pdfPath).not.toBeNull();
  const pdfBytes = await readFile(pdfPath!);
  expect(pdfBytes.subarray(0, 4).toString("ascii")).toBe("%PDF");

  await dialog.getByRole("button", { name: "Plan kayıtlarını kapat" }).click();
  await page.reload({ waitUntil: "networkidle" });
  dialog = await openTeacherPlanWorkspace(page);
  await expect(dialog).toContainText("Kurgu Öğretmenin Revize Yıllık Planı");
  await expect(dialog).toContainText("revizyon 2");

  const layout = await dialog.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
});

test("öğretmen eksik gün kapanışı ve program bağıyla haftalık karar yazamaz", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureActiveClassroom(page);

  const seeded = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const planning = await import(
      "/src/features/planning/teacher-owned-plan-service.ts"
    );
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const curriculum = await import(
      "/src/features/curriculum/curriculum-catalog.ts"
    );
    const dailyFlow = await import(
      "/src/core/domain/teacher-owned-daily-flow.ts"
    );
    const store = new core.IndexedDbDataStore();
    const snapshot = await store.readSnapshot();
    const active = snapshot.settings.find(
      (record) => record.id === core.ACTIVE_CLASSROOM_SETTING_ID,
    );
    const classroom = snapshot.classrooms.find(
      (record) => record.id === active?.classroomId,
    );
    if (
      !active ||
      !classroom ||
      !classroom.curriculumProfileSnapshot ||
      typeof active.academicYearId !== "string" ||
      typeof active.classroomId !== "string"
    ) {
      throw new Error("Kurgu etkin sınıf bulunamadı.");
    }
    const studentId = "00000000-0000-4000-8000-000000000f01";
    const now = "2026-08-15T06:00:00.000Z";
    await store.transaction(
      "readwrite",
      ["students"],
      async (transaction) => {
        await transaction.putMany("students", [
          {
            id: studentId,
            academicYearId: active.academicYearId,
            classroomId: active.classroomId,
            displayName: "Kurgu Ada",
            createdAt: now,
            updatedAt: now,
            civilDate: "2026-08-15",
            deletedAt: null,
            schemaVersion: 1,
          },
        ]);
      },
    );
    const graph = await planning.createTeacherOwnedPlanGraph(store, {
      title: "Kurgu Öğretmen Yıllık Planı",
      periodStart: "2026-08-01",
      periodEnd: "2027-06-30",
      teacherContent: { narrative: "Her çocuğun güvenli katılımı" },
      months: [
        {
          title: "Ağustos Öğretmen Planı",
          monthKey: "2026-08",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-31",
          teacherContent: { narrative: "Sınıf aidiyeti" },
          weeks: [
            {
              title: "10–16 Ağustos Haftası",
              weekKey: "2026-W33",
              periodStart: "2026-08-10",
              periodEnd: "2026-08-16",
              teacherContent: { narrative: "Karşılama, oyun ve gözlem" },
            },
            {
              title: "17–23 Ağustos Haftası",
              weekKey: "2026-W34",
              periodStart: "2026-08-17",
              periodEnd: "2026-08-23",
              teacherContent: { narrative: "Ortak düzen ve sınıf ritmi" },
            },
          ],
        },
      ],
      now: new Date("2026-08-15T06:01:00.000Z"),
    });
    const profile = classroom.curriculumProfileSnapshot;
    const target = curriculum
      .curriculumTargetsForProfile(profile)
      .find((candidate) => candidate.referenceCode === "FAB.1");
    if (!target) throw new Error("Kurgu program hedefi bulunamadı.");
    const daily = await evidence.createPlanWithActivity(store, {
      civilDate: "2026-08-15",
      planId: "00000000-0000-4000-8000-000000000f02",
      planTitle: "15 Ağustos Öğretmen Günlük Planı",
      activityId: "00000000-0000-4000-8000-000000000f03",
      activityTitle: "Ortak oyun sırası",
      startTime: "09:00",
      endTime: "09:40",
      curriculumProfile: profile,
      curriculumTargets: [target],
      assignmentMode: "selected-students",
      studentIds: [studentId],
      teacherOwnedDailyFlowBlocks:
        dailyFlow.defaultTeacherOwnedDailyFlowBlockDrafts(480),
      teacherOwnedActivityBlockKind: "teacher-activity-one",
      initialActivityStatus: "in_progress",
      now: new Date("2026-08-15T06:02:00.000Z"),
    });
    const observationId = "00000000-0000-4000-8000-000000000f04";
    await evidence.captureImmutableRawObservation(store, {
      observationId,
      studentId,
      planId: daily.plan.id,
      activityId: daily.activity.id,
      rawText:
        "Kurgu Ada, arkadaşının önerisini dinledikten sonra oyundaki sırayı birlikte yeniden kurdu.",
      observedAt: "2026-08-15T06:20:00.000Z",
      now: new Date("2026-08-15T06:21:00.000Z"),
    });
    store.close();
    return {
      sourceWeekId: graph.months[0].weeks[0].id,
      targetWeekId: graph.months[0].weeks[1].id,
      observationId,
    };
  });

  await page.reload({ waitUntil: "networkidle" });
  const dialog = await openTeacherPlanWorkspace(page);
  await dialog
    .getByRole("button", { name: /haftasını kanıtlarla değerlendir/i })
    .first()
    .click();
  const review = dialog.getByTestId("teacher-weekly-review");
  await expect(review).toContainText("Kurgu Ada");
  await expect(review).toContainText("Ortak oyun sırası");
  await expect(review).toContainText("Haftalık değerlendirme henüz hazır değil");
  await expect(review).toContainText("Bu hafta öğretim günü yok");
  await expect(review).toContainText("Program bağı tamamlanmadan seçilemez");
  await review
    .getByLabel("Kanıt özeti")
    .fill("Kurgu Ada ortak oyun sırasını arkadaşının önerisiyle yeniden düzenledi.");
  await review
    .getByLabel("Öğretmen değerlendirmesi")
    .fill("Ortak karar vermeyi daha küçük gruplarda sürdürmek yararlı olacak.");
  await review.getByLabel("Sonraki plan kararı").selectOption("adapt");
  await expect(
    review.getByRole("button", { name: "Kaydet ve sonraki haftaya öneri taşı" }),
  ).toBeDisabled();

  const persisted = await page.evaluate(async ({ sourceWeekId, targetWeekId }) => {
    const core = await import("/src/core/index.ts");
    const store = new core.IndexedDbDataStore();
    const snapshot = await store.readSnapshot();
    store.close();
    const source = snapshot.plans.find((record) => record.id === sourceWeekId);
    const target = snapshot.plans.find((record) => record.id === targetWeekId);
    return { source, target };
  }, seeded);
  expect(persisted.source?.weeklyEvaluations ?? []).toEqual([]);
  expect(persisted.target?.nextPlanDecisionContext).toBeUndefined();
});
