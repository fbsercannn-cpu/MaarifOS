import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobil Takvim → tarih → akış → düzenle → reload zinciri kimlik ve provenance korur", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.goto("/tests/runtime-fixture.html");
  const seeded = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const today = await import("/src/features/today/today-data.ts");
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const curriculum = await import(
      "/src/features/curriculum/curriculum-catalog.ts"
    );
    const tymm = await import(
      "/src/features/curriculum/tymm-2024-catalog.ts"
    );

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("maarifos-local");
      request.addEventListener("success", () => resolve());
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("blocked", () =>
        reject(new Error("Kurgu veritabanı temizlenemedi.")),
      );
    });
    const store = new core.IndexedDbDataStore({ databaseName: "maarifos-local" });
    const academicYearId = "00000000-0000-4000-8000-000000008101";
    const classroomId = "00000000-0000-4000-8000-000000008102";
    const studentId = "00000000-0000-4000-8000-000000008103";
    const annualPlanId = "00000000-0000-4000-8000-000000008104";
    const monthlyPlanId = "00000000-0000-4000-8000-000000008105";
    const weeklyPlanId = "00000000-0000-4000-8000-000000008106";
    const dailyPlanId = "00000000-0000-4000-8000-000000008107";
    const activityId = "00000000-0000-4000-8000-000000008108";
    const timestamp = "2026-08-08T20:00:00.000Z";
    const profile = {
      framework: "tymm" as const,
      programLabel: evidence.CURRICULUM_PROGRAM_LABELS.tymm,
      catalogId: tymm.TYMM_2024_CATALOG_METADATA.catalogId,
      sourceVersion: tymm.TYMM_2024_CATALOG_METADATA.sourceVersion,
      referenceOrigin: "official-catalog" as const,
      officialCatalogVerified: true,
    };
    const target = curriculum.curriculumTargetsForProfile(profile, "60-72")[0];
    if (!target) throw new Error("Kurgu program hedefi bulunamadı.");

    await today.saveClassroomConfiguration(store, {
      academicYear: {
        id: academicYearId,
        name: "2026–2027 Eğitim Yılı",
        startDate: "2026-09-01",
        endDate: "2027-06-30",
      },
      classroom: {
        id: classroomId,
        name: "Kurgu Gelecek Plan Sınıfı",
        ageGroup: "60–72 ay",
        curriculumProfile: profile,
      },
      schedule: { kind: "morning", startTime: "08:30", endTime: "12:30" },
      now: new Date(timestamp),
    });

    const contentSnapshot = {
      sku: "maarifos-premium-plan-pack",
      id: "kurgu-premium-paket",
      version: "1.0.0",
      contentReleaseId: "kurgu-release",
      manifestDigest: "sha256:kurgu",
      academicRelease: "2026-2027",
    };
    const sourceTemplate = {
      id: "kurgu-kaynak-etkinlik",
      title: "Kurgu dostluk çemberi",
      weekId: "kurgu-hafta",
      flowSlot: "first-main",
    };
    const lens = {
      teacherPreferredLensId: "guided-play",
      teacherPreferredSupportingLensIds: [],
      lensSelectionMode: "preference_only",
    };
    const envelope = {
      createdAt: timestamp,
      updatedAt: timestamp,
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 2,
      academicYearId,
      classroomId,
    };
    const blocks = Array.from({ length: 10 }, (_, index) => ({
      id: `kurgu-blok-${index + 1}`,
      title:
        index === 1
          ? "Serbest seçim ve öğrenme merkezleri"
          : `${index + 1}. kurgu akış bloğu`,
      purpose: "Kurgu tam gün akışını görünür kılmak.",
      flexibilityNote: "Sınıfın ritmine göre esnetilebilir.",
      status: "planned",
      durationMinutes: 30,
      transitionNote: "",
      teacherNote: "",
      selectedActivityTemplateIds: index === 3 ? [sourceTemplate.id] : [],
      alternativeActivityTemplateIds: [],
      appliedActivityTemplateIds: index === 3 ? [sourceTemplate.id] : [],
    }));
    const provenance = {
      sourceAnnualPlanId: annualPlanId,
      sourceMonthlyPlanId: monthlyPlanId,
      sourceWeeklyPlanId: weeklyPlanId,
      sourceContentPackSnapshot: contentSnapshot,
      sourceActivityTemplateId: sourceTemplate.id,
      sourceActivityTemplateSnapshot: sourceTemplate,
      appliedActivityTemplateId: sourceTemplate.id,
      appliedActivityTemplateSnapshot: sourceTemplate,
      ...lens,
    };
    const annual = {
      ...envelope,
      id: annualPlanId,
      planType: "annual",
      title: "Kurgu yıllık kaynak",
      contentPackSnapshot: contentSnapshot,
      ...lens,
    };
    const monthly = {
      ...envelope,
      id: monthlyPlanId,
      planType: "monthly",
      title: "Kurgu aylık kaynak",
      annualPlanId,
      contentPackSnapshot: contentSnapshot,
      premiumActivityTemplates: [sourceTemplate],
      ...lens,
    };
    const weekly = {
      ...envelope,
      id: weeklyPlanId,
      planType: "weekly",
      title: "Kurgu haftalık kaynak",
      annualPlanId,
      monthlyPlanId,
      weekId: "kurgu-hafta",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-11",
      contentPackSnapshot: contentSnapshot,
      premiumActivityTemplates: [sourceTemplate],
      ...lens,
    };
    const daily = {
      ...envelope,
      ...provenance,
      id: dailyPlanId,
      planType: "daily",
      title: "Kurgu gelecek günlük plan",
      status: "active",
      coverageStatus: "planned",
      curriculumProfileSnapshot: profile,
      curriculumTargets: [target],
      studentIds: [studentId],
      assignmentMode: "whole-class",
      civilDate: "2026-09-08",
      premiumDailyFlowSnapshot: {
        sourceWeekId: "kurgu-hafta",
        planCivilDate: "2026-09-08",
        selectedActivityTemplateId: sourceTemplate.id,
        alternativeActivityTemplateId: "kurgu-alternatif",
        activatedAlternativeTemplateId: null,
        alternativeReplacement: null,
        blocks,
      },
    };
    const activity = {
      ...envelope,
      ...provenance,
      id: activityId,
      planId: dailyPlanId,
      title: "Kurgu dostluk çemberi",
      startTime: "09:00",
      endTime: "09:40",
      status: "planned",
      coverageStatus: "planned",
      curriculumProfileSnapshot: profile,
      curriculumTargets: [target],
      studentIds: [studentId],
      assignmentMode: "whole-class",
      civilDate: "2026-09-08",
    };
    await store.transaction(
      "readwrite",
      ["students", "plans", "activities"],
      async (transaction) => {
        await transaction.putMany("students", [
          {
            ...envelope,
            id: studentId,
            displayName: "Kurgu Çocuk",
            enrollmentStatus: "active",
          },
        ]);
        await transaction.putMany("plans", [annual, monthly, weekly, daily]);
        await transaction.putMany("activities", [activity]);
      },
    );
    store.close();
    return {
      dailyPlanId,
      activityId,
      planCreatedAt: daily.createdAt,
      activityCreatedAt: activity.createdAt,
      provenance: JSON.stringify(provenance),
    };
  });

  await page.goto("/?premiumPilot=1", { waitUntil: "networkidle" });
  const releaseButton = page.getByRole("button", { name: "Harika, başlayalım" });
  if (await releaseButton.isVisible().catch(() => false)) {
    await releaseButton.click();
  }
  await expect(page.getByText("Kurgu dostluk çemberi", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await page.getByRole("button", { name: /Eğitim takvimi/ }).click();
  const calendar = page.getByRole("dialog", { name: "Eğitim takvimi" });
  await calendar.getByRole("gridcell", { name: /^8 Eylül 2026/ }).click();
  const planCard = calendar.getByTestId("calendar-scheduled-plan");
  await expect(planCard).toContainText("10 akış bloğu · 1 uygulanacak etkinlik");
  await planCard.getByRole("button", { name: "Akışı gör" }).click();

  const planSheet = page.getByRole("dialog", { name: "Seçili günün planı" });
  await expect(planSheet).toContainText("8 Eylül 2026");
  await expect(planSheet.locator(".activity-row")).toHaveCount(10);
  await expect(planSheet.getByText("Planlı etkinlik", { exact: true })).toHaveCount(1);
  const longFlowTitle = planSheet.getByText("Serbest seçim ve öğrenme merkezleri", {
    exact: true,
  });
  await expect(longFlowTitle).toBeVisible();
  const titleLayout = await longFlowTitle.evaluate((element) => ({
    whiteSpace: getComputedStyle(element).whiteSpace,
    overflowsHorizontally: element.scrollWidth > element.clientWidth + 1,
  }));
  expect(titleLayout).toEqual({
    whiteSpace: "normal",
    overflowsHorizontally: false,
  });
  await planSheet.getByRole("button", { name: "Gelecek planı düzenle" }).click();

  const editor = page.getByRole("dialog", { name: "Günlük plan düzenleme" });
  await expect(editor).toBeVisible();
  await editor.getByLabel("Etkinlik adı").fill("Kurgu düzenlenmiş dostluk çemberi");
  await editor.getByText("Başlık ve saati değiştir", { exact: true }).click();
  await editor.getByLabel("Plan başlığı").fill("Kurgu düzenlenmiş günlük plan");
  await editor.getByLabel("Plan tarihi").fill("2026-09-09");
  await editor.getByText(/Bloğu düzenle · 30 dk/).first().click();
  await editor.getByLabel("Öğretmen notu").first().fill("Kurgu reload notu.");
  await editor.getByRole("button", { name: "Değişiklikleri kaydet" }).click();
  await expect(page.getByTestId("future-plan-notice")).toContainText(
    "Kurgu düzenlenmiş dostluk çemberi",
  );

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Planlar", exact: true }).click();
  await page.getByRole("button", { name: /Eğitim takvimi/ }).click();
  const reloadedCalendar = page.getByRole("dialog", { name: "Eğitim takvimi" });
  await reloadedCalendar.getByRole("gridcell", { name: /^8 Eylül 2026/ }).click();
  await expect(reloadedCalendar.getByTestId("calendar-scheduled-plan")).toHaveCount(0);
  await reloadedCalendar.getByRole("gridcell", { name: /^9 Eylül 2026/ }).click();
  await expect(reloadedCalendar.getByTestId("calendar-scheduled-plan")).toContainText(
    "Kurgu düzenlenmiş günlük plan",
  );

  const persisted = await page.evaluate(async ({ planId, activityId }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("maarifos-local");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Record<string, unknown>>((resolve, reject) => {
        const transaction = database.transaction(["plans", "activities"], "readonly");
        const planRequest = transaction.objectStore("plans").get(planId);
        const activityRequest = transaction.objectStore("activities").get(activityId);
        transaction.oncomplete = () =>
          resolve({ plan: planRequest.result, activity: activityRequest.result });
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  }, { planId: seeded.dailyPlanId, activityId: seeded.activityId });
  const plan = persisted.plan as Record<string, unknown>;
  const activity = persisted.activity as Record<string, unknown>;
  expect(plan.id).toBe(seeded.dailyPlanId);
  expect(activity.id).toBe(seeded.activityId);
  expect(plan.createdAt).toBe(seeded.planCreatedAt);
  expect(activity.createdAt).toBe(seeded.activityCreatedAt);
  expect(plan.civilDate).toBe("2026-09-09");
  expect(activity.civilDate).toBe("2026-09-09");
  expect(
    (plan.premiumDailyFlowSnapshot as Record<string, unknown>).planCivilDate,
  ).toBe("2026-09-09");
  const provenance = JSON.parse(seeded.provenance) as Record<string, unknown>;
  for (const key of Object.keys(provenance)) {
    expect(plan[key]).toEqual(provenance[key]);
    expect(activity[key]).toEqual(provenance[key]);
  }
});
