import { expect, test } from "@playwright/test";

type PwaWindow = Window & {
  __maarifosPwaStatus?: {
    phase: string;
    offlineReady: boolean;
    activeVersion: string | null;
  };
};

const DATABASE_NAME = "maarifos-local";
const PLAN_DATE = "2026-09-08";
const FIXED_NOW = new Date("2026-09-01T06:00:00.000Z");
const SEEDED_AT = "2026-09-01T06:00:00.000Z";

const ids = Object.freeze({
  academicYear: "00000000-0000-4000-8000-000000009101",
  classroom: "00000000-0000-4000-8000-000000009102",
  annualPlan: "00000000-0000-4000-8000-000000009103",
  monthlyPlan: "00000000-0000-4000-8000-000000009104",
  weeklyPlan: "00000000-0000-4000-8000-000000009105",
  dailyPlan: "00000000-0000-4000-8000-000000009106",
  activity: "00000000-0000-4000-8000-000000009107",
});

const provenanceKeys = [
  "sourceAnnualPlanId",
  "sourceMonthlyPlanId",
  "sourceWeeklyPlanId",
  "sourceContentPackSnapshot",
  "sourceActivityTemplateId",
  "sourceActivityTemplateSnapshot",
  "appliedActivityTemplateId",
  "appliedActivityTemplateSnapshot",
  "teacherPreferredLensId",
  "teacherPreferredSupportingLensIds",
  "lensSelectionMode",
] as const;

test.use({ viewport: { width: 390, height: 844 } });

test("üretim service worker'ı gelecek planı çevrimdışı reload sonrası IndexedDB'den korur", async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".native-app-runtime")).toBeVisible();
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (window as PwaWindow).__maarifosPwaStatus?.offlineReady ?? false,
        ),
      {
        message: "Üretim app-shell cache'i çevrimdışı adımdan önce doğrulanmalı.",
        timeout: 15_000,
      },
    )
    .toBe(true);

  const onlinePwaEvidence = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return {
      controlled: navigator.serviceWorker.controller !== null,
      scriptUrl: registration.active?.scriptURL ?? "",
      shellCaches: (await caches.keys()).filter((name) =>
        name.startsWith("maarifos-shell-"),
      ),
    };
  });
  expect(onlinePwaEvidence.controlled).toBe(true);
  expect(onlinePwaEvidence.scriptUrl).toContain("/sw.js?v=");
  expect(onlinePwaEvidence.shellCaches.length).toBeGreaterThan(0);

  const seeded = await page.evaluate(
    async ({ databaseName, fixedIds, planDate, seededAt }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const contentSnapshot = {
        id: "offline-kurgu-premium-paket",
        version: "1.0.0",
        contentReleaseId: "offline-kurgu-release",
        manifestDigest: "sha256:offline-kurgu",
      };
      const sourceTemplate = {
        id: "offline-kurgu-kaynak-etkinlik",
        title: "Çevrimdışı dostluk çemberi",
        weekId: "offline-kurgu-hafta",
        flowSlot: "first-main",
      };
      const lens = {
        teacherPreferredLensId: "guided-play",
        teacherPreferredSupportingLensIds: [],
        lensSelectionMode: "preference_only",
      };
      const provenance = {
        sourceAnnualPlanId: fixedIds.annualPlan,
        sourceMonthlyPlanId: fixedIds.monthlyPlan,
        sourceWeeklyPlanId: fixedIds.weeklyPlan,
        sourceContentPackSnapshot: contentSnapshot,
        sourceActivityTemplateId: sourceTemplate.id,
        sourceActivityTemplateSnapshot: sourceTemplate,
        appliedActivityTemplateId: sourceTemplate.id,
        appliedActivityTemplateSnapshot: sourceTemplate,
        ...lens,
      };
      const profile = {
        framework: "tymm",
        programLabel: "Türkiye Yüzyılı Maarif Modeli",
        catalogId: "meb-tymm-okul-oncesi-2024-learning-outcomes",
        sourceVersion: "2024.09.02",
        referenceOrigin: "official-catalog",
        officialCatalogVerified: true,
      };
      const envelope = {
        createdAt: seededAt,
        updatedAt: seededAt,
        civilDate: "2026-09-01",
        deletedAt: null,
        schemaVersion: 2,
        academicYearId: fixedIds.academicYear,
        classroomId: fixedIds.classroom,
      };
      const blocks = Array.from({ length: 10 }, (_, index) => ({
        id: `offline-kurgu-blok-${index + 1}`,
        title: `${index + 1}. çevrimdışı kurgu akış bloğu`,
        purpose: "Çevrimdışı tam gün akışının kalıcı kaydını kanıtlamak.",
        flexibilityNote: "Sınıfın ritmine göre esnetilebilir.",
        status: "planned",
        durationMinutes: 30,
        transitionNote: "",
        teacherNote: "",
        selectedActivityTemplateIds: index === 3 ? [sourceTemplate.id] : [],
        alternativeActivityTemplateIds: [],
        appliedActivityTemplateIds: index === 3 ? [sourceTemplate.id] : [],
      }));
      const plans = [
        {
          ...envelope,
          id: fixedIds.annualPlan,
          planType: "annual",
          title: "Çevrimdışı kurgu yıllık kaynak",
          contentPackSnapshot: contentSnapshot,
          ...lens,
        },
        {
          ...envelope,
          id: fixedIds.monthlyPlan,
          planType: "monthly",
          title: "Çevrimdışı kurgu aylık kaynak",
          annualPlanId: fixedIds.annualPlan,
          contentPackSnapshot: contentSnapshot,
          premiumActivityTemplates: [sourceTemplate],
          ...lens,
        },
        {
          ...envelope,
          id: fixedIds.weeklyPlan,
          planType: "weekly",
          title: "Çevrimdışı kurgu haftalık kaynak",
          annualPlanId: fixedIds.annualPlan,
          monthlyPlanId: fixedIds.monthlyPlan,
          weekId: sourceTemplate.weekId,
          periodStart: "2026-09-07",
          periodEnd: "2026-09-11",
          contentPackSnapshot: contentSnapshot,
          premiumActivityTemplates: [sourceTemplate],
          ...lens,
        },
        {
          ...envelope,
          ...provenance,
          id: fixedIds.dailyPlan,
          planType: "daily",
          title: "Çevrimdışı gelecek günlük plan",
          status: "active",
          coverageStatus: "planned",
          curriculumProfileSnapshot: profile,
          curriculumTargets: [],
          studentIds: [],
          assignmentMode: "whole-class",
          civilDate: planDate,
          premiumDailyFlowSnapshot: {
            sourceWeekId: sourceTemplate.weekId,
            planCivilDate: planDate,
            selectedActivityTemplateId: sourceTemplate.id,
            alternativeActivityTemplateId: "offline-kurgu-alternatif",
            activatedAlternativeTemplateId: null,
            alternativeReplacement: null,
            blocks,
          },
        },
      ];
      const activity = {
        ...envelope,
        ...provenance,
        id: fixedIds.activity,
        planId: fixedIds.dailyPlan,
        title: sourceTemplate.title,
        startTime: "09:00",
        endTime: "09:40",
        status: "planned",
        coverageStatus: "planned",
        curriculumProfileSnapshot: profile,
        curriculumTargets: [],
        studentIds: [],
        assignmentMode: "whole-class",
        civilDate: planDate,
      };
      const academicYear = {
        id: fixedIds.academicYear,
        name: "2026–2027 Eğitim Yılı",
        startDate: "2026-09-01",
        endDate: "2027-08-31",
        status: "active",
        createdAt: seededAt,
        updatedAt: seededAt,
        civilDate: "2026-09-01",
        deletedAt: null,
        schemaVersion: 1,
      };
      const classroom = {
        id: fixedIds.classroom,
        academicYearId: fixedIds.academicYear,
        name: "Çevrimdışı Kurgu Sınıfı",
        ageGroup: "60–72 ay",
        curriculumProgram: profile.programLabel,
        curriculumCatalogLabel: `${profile.catalogId} · ${profile.sourceVersion}`,
        curriculumProfileSnapshot: profile,
        schedule: {
          kind: "morning",
          startTime: "08:30",
          endTime: "12:30",
          timeZone: "Europe/Istanbul",
        },
        createdAt: seededAt,
        updatedAt: seededAt,
        civilDate: "2026-09-01",
        deletedAt: null,
        schemaVersion: 2,
      };
      const activeClassroomSetting = {
        id: "00000000-0000-4000-9000-000000000002",
        settingType: "active-classroom-selection",
        academicYearId: fixedIds.academicYear,
        classroomId: fixedIds.classroom,
        createdAt: seededAt,
        updatedAt: seededAt,
        civilDate: "2026-09-01",
        deletedAt: null,
        schemaVersion: 1,
      };

      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(
            ["academicYears", "classrooms", "settings", "plans", "activities"],
            "readwrite",
          );
          transaction.objectStore("academicYears").put(academicYear);
          transaction.objectStore("classrooms").put(classroom);
          transaction.objectStore("settings").put(activeClassroomSetting);
          for (const plan of plans) transaction.objectStore("plans").put(plan);
          transaction.objectStore("activities").put(activity);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }

      return {
        dailyPlanId: fixedIds.dailyPlan,
        activityId: fixedIds.activity,
        planCreatedAt: plans[3].createdAt,
        activityCreatedAt: activity.createdAt,
        provenance,
      };
    },
    {
      databaseName: DATABASE_NAME,
      fixedIds: ids,
      planDate: PLAN_DATE,
      seededAt: SEEDED_AT,
    },
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Çevrimdışı Kurgu Sınıfı", { exact: true }),
  ).toBeVisible();
  const releaseButton = page.getByRole("button", { name: "Harika, başlayalım" });
  if (await releaseButton.isVisible().catch(() => false)) {
    await releaseButton.click();
    await expect(releaseButton).toBeHidden();
  }

  expect(PLAN_DATE > "2026-09-01").toBe(true);
  await context.setOffline(true);
  const offlineResponse = await page.reload({ waitUntil: "domcontentloaded" });
  expect(offlineResponse).not.toBeNull();
  expect(offlineResponse?.fromServiceWorker()).toBe(true);
  await expect(page.getByText("Çevrimdışı Kurgu Sınıfı", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);

  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await page.getByRole("button", { name: /^Okul etkinliği ekle/ }).click();
  const calendar = page.getByRole("dialog", { name: "Eğitim takvimi" });
  await calendar.getByRole("gridcell", { name: /^8 Eylül 2026/ }).click();
  const planCard = calendar.getByTestId("calendar-scheduled-plan");
  await expect(planCard).toContainText("Çevrimdışı gelecek günlük plan");
  await expect(planCard).toContainText("10 akış bloğu · 1 uygulanacak etkinlik");
  await expect(planCard).not.toHaveClass(/has-integrity-warning/);
  await planCard.getByRole("button", { name: "Akışı gör" }).click();

  const planSheet = page.getByRole("dialog", { name: "Seçili günün planı" });
  await expect(planSheet).toContainText("8 Eylül 2026");
  await expect(planSheet.locator(".activity-row")).toHaveCount(10);
  await expect(planSheet.getByText("Planlı etkinlik", { exact: true })).toHaveCount(1);
  await expect(
    planSheet.getByRole("button", { name: "Gelecek planı düzenle" }),
  ).toBeVisible();

  const persisted = await page.evaluate(
    async ({ databaseName, planId, activityId }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const records = await new Promise<{
          plan: Record<string, unknown>;
          activities: Array<Record<string, unknown>>;
        }>((resolve, reject) => {
          const transaction = database.transaction(["plans", "activities"], "readonly");
          const planRequest = transaction.objectStore("plans").get(planId);
          const activityRequest = transaction.objectStore("activities").index("by-plan").getAll(planId);
          transaction.oncomplete = () =>
            resolve({
              plan: planRequest.result,
              activities: activityRequest.result,
            });
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
        return {
          ...records,
          online: navigator.onLine,
          controlled: navigator.serviceWorker.controller !== null,
          controllerScriptUrl: navigator.serviceWorker.controller?.scriptURL ?? "",
          requestedActivityId: activityId,
        };
      } finally {
        database.close();
      }
    },
    {
      databaseName: DATABASE_NAME,
      planId: seeded.dailyPlanId,
      activityId: seeded.activityId,
    },
  );

  expect(persisted.online).toBe(false);
  expect(persisted.controlled).toBe(true);
  expect(persisted.controllerScriptUrl).toContain("/sw.js?v=");
  expect(persisted.plan.id).toBe(seeded.dailyPlanId);
  expect(persisted.plan.createdAt).toBe(seeded.planCreatedAt);
  expect(persisted.plan.civilDate).toBe(PLAN_DATE);
  expect(
    (persisted.plan.premiumDailyFlowSnapshot as Record<string, unknown>).blocks,
  ).toHaveLength(10);
  expect(persisted.activities).toHaveLength(1);
  expect(persisted.activities[0].id).toBe(persisted.requestedActivityId);
  expect(persisted.activities[0].createdAt).toBe(seeded.activityCreatedAt);
  expect(persisted.activities[0].planId).toBe(seeded.dailyPlanId);

  for (const key of provenanceKeys) {
    expect(persisted.plan[key]).toEqual(seeded.provenance[key]);
    expect(persisted.activities[0][key]).toEqual(seeded.provenance[key]);
  }
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
});
