import { expect, test, type Page } from "@playwright/test";
import { expectNoUntriagedAxeViolations } from "./smoke/accessibility-fixtures";

const TEST_STUDENT_NAME = "Plan Akışı Çocuğu";
const FUTURE_PLAN_DATE = "2026-08-28";
const EDITABLE_FUTURE_PLAN_DATE = "2027-06-08";

test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 390, height: 844 } });

async function configureClassroomWithStudent(
  page: Page,
  options: { officialCalendar?: boolean } = {},
) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Plan Kullanılabilirlik Okulu");
  await setup
    .getByLabel("Öğretmen adı soyadı")
    .fill("Plan Kullanılabilirlik Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Plan kullanılabilirlik sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  if (!options.officialCalendar) {
    await setup.getByText("Takvim ayrıntıları", { exact: true }).click();
    await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-08-01");
    await setup.getByLabel("Eğitim yılı bitişi").fill("2027-06-30");
  }
  await setup.getByText("İleri ayarlar", { exact: true }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page
    .getByRole("button", { name: /^(İlk öğrenciyi ekle|Öğrenci ekle)$/ })
    .last()
    .click();
  await page.getByLabel("Çocuğun adı").fill(TEST_STUDENT_NAME);
  await page.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
}

async function seedCurrentTeacherWeek(
  page: Page,
  options: { editableFuture?: boolean } = {},
) {
  const planWindow = options.editableFuture
    ? {
        monthTitle: "Haziran öğretmen planı",
        monthKey: "2027-06",
        monthStart: "2027-06-01",
        monthEnd: "2027-06-30",
        weekTitle: "7–13 Haziran haftası",
        weekKey: "2027-W23",
        weekStart: "2027-06-07",
        weekEnd: "2027-06-13",
      }
    : {
        monthTitle: "Ağustos öğretmen planı",
        monthKey: "2026-08",
        monthStart: "2026-08-01",
        monthEnd: "2026-08-31",
        weekTitle: "24–30 Ağustos haftası",
        weekKey: "2026-W35",
        weekStart: "2026-08-24",
        weekEnd: "2026-08-30",
      };
  await page.evaluate(async (window) => {
    const core = await import("/src/core/index.ts");
    const planning = await import(
      "/src/features/planning/teacher-owned-plan-service.ts"
    );
    const store = new core.IndexedDbDataStore();
    await planning.createTeacherOwnedPlanGraph(store, {
      title: "2026–2027 öğretmen yıllık planı",
      periodStart: "2026-08-01",
      periodEnd: "2027-06-30",
      teacherContent: {
        narrative: "Oyun, araştırma ve çocukların katılım yollarını güçlendirmek.",
      },
      months: [
        {
          title: window.monthTitle,
          monthKey: window.monthKey,
          periodStart: window.monthStart,
          periodEnd: window.monthEnd,
          teacherContent: {
            narrative: "Sınıf ritmi ve araştırma merakını desteklemek.",
          },
          weeks: [
            {
              title: window.weekTitle,
              weekKey: window.weekKey,
              periodStart: window.weekStart,
              periodEnd: window.weekEnd,
              teacherContent: {
                narrative: "Tahmin, deneme, gözlem ve çocuk sözünü görünür kılmak.",
              },
            },
          ],
        },
      ],
      now: new Date("2026-08-27T06:00:00.000Z"),
    });
    store.close();
  }, planWindow);
}

async function seedPastTeacherWeek(page: Page) {
  await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const planning = await import(
      "/src/features/planning/teacher-owned-plan-service.ts"
    );
    const store = new core.IndexedDbDataStore();
    await planning.createTeacherOwnedPlanGraph(store, {
      title: "2026–2027 öğretmen yıllık planı",
      periodStart: "2026-08-01",
      periodEnd: "2027-06-30",
      teacherContent: { narrative: "Öğretmenin yıllık plan omurgası." },
      months: [
        {
          title: "Ağustos öğretmen planı",
          monthKey: "2026-08",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-31",
          teacherContent: { narrative: "Ağustos hazırlık çalışmaları." },
          weeks: [
            {
              title: "3–7 Ağustos haftası",
              weekKey: "2026-W32",
              periodStart: "2026-08-03",
              periodEnd: "2026-08-07",
              teacherContent: { narrative: "Geçmiş hazırlık haftası." },
            },
          ],
        },
      ],
      now: new Date("2026-08-03T06:00:00.000Z"),
    });
    store.close();
  });
}

async function seedOfficialBreakSpanningWeek(page: Page) {
  await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const planning = await import(
      "/src/features/planning/teacher-owned-plan-service.ts"
    );
    const store = new core.IndexedDbDataStore();
    await planning.createTeacherOwnedPlanGraph(store, {
      title: "2026–2027 resmî takvim planı",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
      teacherContent: { narrative: "MEB çalışma takvimine bağlı yıllık plan." },
      months: [
        {
          title: "Kasım öğretmen planı",
          monthKey: "2026-11",
          periodStart: "2026-11-01",
          periodEnd: "2026-11-30",
          teacherContent: { narrative: "Ara tatil öncesi ve sonrası planlama." },
          weeks: [
            {
              title: "9–22 Kasım çalışma aralığı",
              weekKey: "2026-11-09_2026-11-22",
              periodStart: "2026-11-09",
              periodEnd: "2026-11-22",
              teacherContent: { narrative: "Ara tatil günleri günlük plana açılmaz." },
            },
          ],
        },
      ],
      now: new Date("2026-08-27T06:00:00.000Z"),
    });
    store.close();
  });
}

async function openDailyPlanWizard(page: Page) {
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Planlar", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Neyi hazırlayacaksınız?" })
    .getByRole("button", { name: /Günlük eğitim planı/i })
    .click();
  const dialog = page.getByRole("dialog", { name: "Günlük plan oluşturma" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function readSavedPlan(page: Page, civilDate = FUTURE_PLAN_DATE) {
  return page.evaluate(async (expectedCivilDate) => {
    const core = await import("/src/core/index.ts");
    const store = new core.IndexedDbDataStore();
    const snapshot = await store.readSnapshot();
    store.close();
    const plan = snapshot.plans.find(
      (record) => record.planType === "daily" && record.civilDate === expectedCivilDate,
    );
    const activity = snapshot.activities.find((record) => record.planId === plan?.id);
    return {
      planId: plan?.id ?? null,
      planTitle: typeof plan?.title === "string" ? plan.title : null,
      activityId: activity?.id ?? null,
      activityTitle: typeof activity?.title === "string" ? activity.title : null,
      teacherOwnedFlowCount: Array.isArray(plan?.teacherOwnedDailyFlow?.blocks)
        ? plan.teacherOwnedDailyFlow.blocks.length
        : Array.isArray(plan?.teacherOwnedDailyFlowSnapshot?.blocks)
          ? plan.teacherOwnedDailyFlowSnapshot.blocks.length
          : 0,
      targetCodes: Array.isArray(plan?.curriculumTargets)
        ? plan.curriculumTargets.map((target) => target.referenceCode)
        : [],
      updatedAt: typeof plan?.updatedAt === "string" ? plan.updatedAt : null,
    };
  }, civilDate);
}

test("haftalık plan varken hızlı plan üç adımda kalır; semantik hedef nedenini açıklar", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroomWithStudent(page);
  await seedCurrentTeacherWeek(page);
  await page.reload({ waitUntil: "networkidle" });

  const dialog = await openDailyPlanWizard(page);
  await expect(
    dialog.getByRole("heading", {
      name: "Bugün hangi etkinliği yapacaksınız?",
      level: 1,
    }),
  ).toBeFocused();
  const steps = dialog.getByRole("navigation", {
    name: "Günlük plan oluşturma adımları",
  });
  await expect(steps).toBeVisible();
  await expect(steps.getByRole("button")).toHaveCount(3);
  await expect(dialog.getByTestId("teacher-owned-daily-flow-editor")).toBeVisible();
  await expect(dialog.getByTestId("teacher-owned-daily-flow-editor")).not.toHaveAttribute(
    "open",
  );
  await expect(dialog.locator(".plan-save-dock")).toHaveCount(0);

  await dialog.getByRole("button", { name: "Başka bir alandan fikir bul" }).click();
  await dialog
    .getByRole("region", { name: "Etkinlik fikir alanları" })
    .getByRole("button", { name: "Fen", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: /Batar mı, yüzer mi\?/i })
    .click();

  await expect(
    dialog.getByRole("heading", {
      name: "Bu etkinlikte hangi TYMM hedefini izleyeceksiniz?",
      level: 1,
    }),
  ).toBeFocused();
  await expect(
    steps.getByRole("button", { name: /TYMM hedefi/i }),
  ).toHaveAttribute("aria-current", "step");
  await expect(dialog.getByTestId("semantic-target-explanation")).toContainText(
    "etkinlik adı, öğretmen amacı, 60–72 ay yaş bandı",
  );
  await expect(dialog.getByTestId("semantic-target-explanation")).toContainText(
    "son seçim öğretmene aittir",
  );

  const recommendations = dialog
    .getByRole("group", { name: "Program hedefleri" })
    .getByRole("button");
  await expect(recommendations).toHaveCount(4);
  await expect(recommendations.first()).toContainText(/FAB\.(3|4)/u);
  await expect(recommendations.first()).toContainText("Öneri nedeni:");
  await expect(recommendations.first()).toContainText(/tahmin|gözlem/u);

  await recommendations.first().click();
  await expect(
    dialog.getByRole("heading", { name: "Planı kontrol edip kaydedin.", level: 1 }),
  ).toBeFocused();
  await expect(
    steps.getByRole("button", { name: /Kontrol/i }),
  ).toHaveAttribute("aria-current", "step");
  const dock = dialog.locator(".plan-save-dock");
  await expect(dock).toHaveCSS("position", "fixed");
  await expect(dock.locator(".plan-readiness")).toContainText("Kaydetmeye hazır");
  await expect(dialog.getByRole("button", { name: "Planı kaydet" })).toBeEnabled();

  await dialog.getByText("Başlık ve saati değiştir", { exact: true }).click();
  await dialog.getByLabel("Plan tarihi").fill(FUTURE_PLAN_DATE);
  await dialog.getByRole("button", { name: "Planı kaydet" }).click();
  await expect(dialog).toBeHidden();

  const saved = await readSavedPlan(page);
  expect(saved.planId).not.toBeNull();
  expect(saved.activityId).not.toBeNull();
  expect(saved.activityTitle).toBe("Batar mı, yüzer mi?");
  expect(saved.teacherOwnedFlowCount).toBe(10);
  expect(saved.targetCodes).toHaveLength(1);
});

test("geçmiş kaynak hafta bugünün hızlı planına bağlanmaz", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroomWithStudent(page);
  await seedPastTeacherWeek(page);
  await page.reload({ waitUntil: "networkidle" });

  const dialog = await openDailyPlanWizard(page);
  await expect(dialog.getByTestId("teacher-owned-daily-flow-editor")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: /Sınıfın şekil avcıları/i })
    .first()
    .click();
  await dialog
    .getByRole("group", { name: "Program hedefleri" })
    .getByRole("button")
    .first()
    .click();

  const readiness = dialog.locator(".plan-readiness");
  await expect(readiness).toContainText("Kaydetmeye hazır");
  await expect(readiness).not.toContainText("kaynak haftanın tarih aralığına");
  await expect(dialog.getByRole("button", { name: "Planı kaydet" })).toBeEnabled();
});

test("resmî tatil günü günlük planı kapatır ve en yakın öğretim gününe tek dokunuşla alır", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroomWithStudent(page, { officialCalendar: true });
  await seedOfficialBreakSpanningWeek(page);
  await page.reload({ waitUntil: "networkidle" });

  const dialog = await openDailyPlanWizard(page);
  await dialog
    .getByRole("button", { name: /Sınıfın şekil avcıları/i })
    .first()
    .click();
  await dialog
    .getByRole("group", { name: "Program hedefleri" })
    .getByRole("button")
    .first()
    .click();
  await dialog.getByText("Başlık ve saati değiştir", { exact: true }).click();

  const planDate = dialog.getByLabel("Plan tarihi");
  await planDate.fill("2026-11-16");
  const readiness = dialog.locator(".plan-readiness");
  await expect(readiness).toHaveAttribute(
    "data-warning-code",
    "plan.calendar-day",
  );
  await expect(readiness).toContainText(
    "resmî MEB çalışma takviminde öğretim günü değildir",
  );
  await expect(dialog.getByRole("button", { name: "Planı kaydet" })).toBeDisabled();

  await readiness
    .getByRole("button", { name: "En yakın öğretim gününe al" })
    .click();
  await expect(planDate).toHaveValue("2026-11-13");
  await expect(readiness).toContainText("Kaydetmeye hazır");
  await expect(dialog.getByRole("button", { name: "Planı kaydet" })).toBeEnabled();
});

test("hızlı plan kaydet → reload → düzenle zincirinde aynı plan ve etkinlik kimliği korunur", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroomWithStudent(page);
  await seedCurrentTeacherWeek(page, { editableFuture: true });
  await page.reload({ waitUntil: "networkidle" });

  const dialog = await openDailyPlanWizard(page);
  await dialog.getByRole("button", { name: "Başka bir alandan fikir bul" }).click();
  await dialog
    .getByRole("region", { name: "Etkinlik fikir alanları" })
    .getByRole("button", { name: "Fen", exact: true })
    .click();
  await dialog.getByRole("button", { name: /Batar mı, yüzer mi\?/i }).click();
  await dialog
    .getByRole("group", { name: "Program hedefleri" })
    .getByRole("button")
    .first()
    .click();
  await dialog.getByText("Başlık ve saati değiştir", { exact: true }).click();
  await dialog.getByLabel("Plan tarihi").fill(EDITABLE_FUTURE_PLAN_DATE);
  await dialog.getByRole("button", { name: "Planı kaydet" }).click();
  await expect(dialog).toBeHidden();

  const beforeReload = await readSavedPlan(page, EDITABLE_FUTURE_PLAN_DATE);
  expect(beforeReload.planId).not.toBeNull();
  expect(beforeReload.activityId).not.toBeNull();

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await page
    .getByRole("region", { name: "Neyi hazırlayacaksınız?" })
    .getByRole("button", { name: /Günlük eğitim planı/i })
    .click();

  const todayPlan = page.getByRole("dialog", { name: "Gün planı" });
  if (await todayPlan.isVisible()) {
    await todayPlan
      .getByRole("button", { name: /2026–2027 eğitim takvimi/i })
      .click();
  }

  const calendar = page.getByRole("dialog", { name: "Eğitim takvimi" });
  await expect(calendar).toBeVisible();
  await calendar.getByRole("gridcell", { name: /^8 Haziran 2027/u }).click();
  const planCard = calendar.getByTestId("calendar-scheduled-plan");
  await expect(planCard).toContainText("Batar mı, yüzer mi?");
  await planCard.getByRole("button", { name: "Akışı gör" }).click();

  const planSheet = page.getByRole("dialog", { name: "Seçili günün planı" });
  await planSheet.getByRole("button", { name: "Gelecek planı düzenle" }).click();
  const editor = page.getByRole("dialog", { name: "Günlük plan düzenleme" });
  await expect(editor).toBeVisible();
  await editor.getByLabel("Etkinlik adı").fill("Batar mı, yüzer mi? — yeniden düzenlendi");
  await editor.getByRole("button", { name: "Değişiklikleri kaydet" }).click();
  await expect(editor).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  const afterReload = await readSavedPlan(page, EDITABLE_FUTURE_PLAN_DATE);
  expect(afterReload.planId).toBe(beforeReload.planId);
  expect(afterReload.activityId).toBe(beforeReload.activityId);
  expect(afterReload.activityTitle).toBe(
    "Batar mı, yüzer mi? — yeniden düzenlendi",
  );
  expect(afterReload.updatedAt).not.toBe(beforeReload.updatedAt);
  expect(afterReload.teacherOwnedFlowCount).toBe(10);
  expect(afterReload.targetCodes).toEqual(beforeReload.targetCodes);
});

test("telefon plan uyarıları tek dokunuşla düzelir ve kaydetme taslağını korur", async ({
  page,
}, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroomWithStudent(page);
  await seedCurrentTeacherWeek(page);
  await page.reload({ waitUntil: "networkidle" });

  const dialog = await openDailyPlanWizard(page);
  await dialog.getByRole("button", { name: "Başka bir alandan fikir bul" }).click();
  await dialog
    .getByRole("region", { name: "Etkinlik fikir alanları" })
    .getByRole("button", { name: "Fen", exact: true })
    .click();
  await dialog.getByRole("button", { name: /Batar mı, yüzer mi\?/i }).click();
  await dialog
    .getByRole("group", { name: "Program hedefleri" })
    .getByRole("button")
    .first()
    .click();

  await dialog.getByText("Başlık ve saati değiştir", { exact: true }).click();
  const planDate = dialog.getByLabel("Plan tarihi");
  await planDate.fill("2026-09-20");
  const readiness = dialog.locator(".plan-readiness");
  await expect(readiness).toHaveAttribute("data-warning-code", "plan.week-range");
  await expect(readiness).toContainText("Plan tarihini bağlı olduğu kaynak haftanın");
  await readiness.getByRole("button", { name: "Kaynak haftaya al" }).click();
  await expect(planDate).toHaveValue("2026-08-24");

  const startTime = dialog.getByLabel("Başlangıç");
  const endTime = dialog.getByLabel("Bitiş");
  const defaultStartTime = await startTime.inputValue();
  const defaultEndTime = await endTime.inputValue();
  await startTime.fill("12:00");
  await endTime.fill("11:00");
  await expect(readiness).toHaveAttribute("data-warning-code", "plan.time");
  await readiness.getByRole("button", { name: "Sınıf saatini kullan" }).click();
  await expect(startTime).toHaveValue(defaultStartTime);
  await expect(endTime).toHaveValue(defaultEndTime);

  await dialog.getByText("Çocuk kapsamı", { exact: true }).click();
  await dialog.getByRole("radio", { name: /Seçili çocuklar/u }).check();
  await expect(readiness).toHaveAttribute("data-warning-code", "plan.child-scope");
  await readiness.getByRole("button", { name: "Tüm sınıfı seç" }).click();
  await expect(dialog.getByRole("radio", { name: /Tüm sınıf/u })).toBeChecked();
  await expect(readiness).toContainText("Kaydetmeye hazır");
  await expect(dialog.getByRole("button", { name: "Planı kaydet" })).toBeEnabled();

  await expectNoUntriagedAxeViolations(
    page,
    testInfo,
    "plan-readiness-one-tap-phone",
  );
});

test("kayıt hatası öğretmen dili, doğru canlı bölge ve kapalı destek ayrıntısı taşır", async ({
  page,
}, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroomWithStudent(page);
  await seedCurrentTeacherWeek(page);
  await page.reload({ waitUntil: "networkidle" });

  const dialog = await openDailyPlanWizard(page);
  await dialog.getByRole("button", { name: "Başka bir alandan fikir bul" }).click();
  await dialog
    .getByRole("region", { name: "Etkinlik fikir alanları" })
    .getByRole("button", { name: "Fen", exact: true })
    .click();
  await dialog.getByRole("button", { name: /Batar mı, yüzer mi\?/i }).click();
  await dialog
    .getByRole("group", { name: "Program hedefleri" })
    .getByRole("button")
    .first()
    .click();

  await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const store = new core.IndexedDbDataStore();
    const snapshot = await store.readSnapshot();
    const classroom = snapshot.classrooms[0];
    if (!classroom?.curriculumProfileSnapshot) {
      store.close();
      throw new Error("Kurgu sınıf program profili bulunamadı.");
    }
    await store.transaction("readwrite", ["classrooms"], async (transaction) => {
      await transaction.putMany("classrooms", [
        {
          ...classroom,
          curriculumProfileSnapshot: {
            ...classroom.curriculumProfileSnapshot,
            sourceVersion: `${classroom.curriculumProfileSnapshot.sourceVersion}-kurgu`,
          },
        },
      ]);
    });
    store.close();
  });

  await dialog.getByRole("button", { name: "Planı kaydet" }).click();
  const feedback = dialog.getByTestId("teacher-feedback");
  await expect(feedback).toHaveAttribute("role", "alert");
  await expect(feedback).toHaveAttribute("data-feedback-code", "plan.program-profile");
  await expect(feedback).toContainText("Sınıfın Maarif Modeli profili eşleşmiyor");
  await expect(feedback).not.toContainText("Pedagojik etkinlik kaynağı plan günüyle uyuşmuyor");
  const technicalDetails = feedback.locator("details");
  await expect(technicalDetails).not.toHaveAttribute("open");
  await technicalDetails.getByText("Teknik ayrıntı", { exact: true }).click();
  await expect(technicalDetails).toContainText("Destek kodu: PLAN-PROGRAM-001");
  await expect(dialog.getByRole("button", { name: "Planı kaydet" })).toBeEnabled();

  await expectNoUntriagedAxeViolations(
    page,
    testInfo,
    "plan-save-feedback-phone",
  );
});
