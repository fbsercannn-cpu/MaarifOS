import { expect, test, type Page } from "@playwright/test";

function addCivilDays(civilDate: string, days: number): string {
  const [year, month, day] = civilDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

async function configureClassroom(page: Page, civilDate: string) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("Taşınan İşler Sınıfı");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill(civilDate);
  await setup.getByLabel("Eğitim yılı bitişi").fill(civilDate);
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup
    .getByLabel("Uygulanan program", { exact: true })
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("full_day");
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();
}

async function seedCarryForwardHistory(page: Page, currentCivilDate: string) {
  await page.evaluate(async (today) => {
    const addDays = (civilDate: string, days: number) => {
      const [year, month, day] = civilDate.split("-").map(Number);
      return new Date(Date.UTC(year, month - 1, day + days))
        .toISOString()
        .slice(0, 10);
    };
    const request = indexedDB.open("maarifos-local");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = database.transaction(["classrooms"], "readonly");
    const classroomsRequest = read.objectStore("classrooms").getAll();
    const classrooms = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      classroomsRequest.onsuccess = () => resolve(classroomsRequest.result);
      classroomsRequest.onerror = () => reject(classroomsRequest.error);
    });
    const classroom = classrooms.find((candidate) => candidate.name === "Taşınan İşler Sınıfı");
    if (!classroom) throw new Error("Test sınıfı bulunamadı.");
    const academicYearId = String(classroom.academicYearId);
    const classroomId = String(classroom.id);
    const issueDefinitions = [
      {
        code: "no-students",
        evidence: {
          expectedStudentCount: 0,
          attendanceMarkedCount: 0,
          attendanceCompleted: false,
          dailyPlanCount: 1,
          activityCount: 1,
          completedActivityCount: 1,
          observationCount: 0,
          pendingCurriculumLinkCount: 0,
        },
      },
      {
        code: "attendance-incomplete",
        evidence: {
          expectedStudentCount: 1,
          attendanceMarkedCount: 0,
          attendanceCompleted: false,
          dailyPlanCount: 1,
          activityCount: 1,
          completedActivityCount: 1,
          observationCount: 0,
          pendingCurriculumLinkCount: 0,
        },
      },
      {
        code: "daily-plan-missing",
        evidence: {
          expectedStudentCount: 1,
          attendanceMarkedCount: 1,
          attendanceCompleted: true,
          dailyPlanCount: 0,
          activityCount: 0,
          completedActivityCount: 0,
          observationCount: 0,
          pendingCurriculumLinkCount: 0,
        },
      },
      {
        code: "activities-incomplete",
        evidence: {
          expectedStudentCount: 1,
          attendanceMarkedCount: 1,
          attendanceCompleted: true,
          dailyPlanCount: 1,
          activityCount: 2,
          completedActivityCount: 1,
          observationCount: 0,
          pendingCurriculumLinkCount: 0,
        },
      },
      {
        code: "curriculum-links-pending",
        evidence: {
          expectedStudentCount: 1,
          attendanceMarkedCount: 1,
          attendanceCompleted: true,
          dailyPlanCount: 1,
          activityCount: 1,
          completedActivityCount: 1,
          observationCount: 1,
          pendingCurriculumLinkCount: 1,
        },
      },
    ] as const;
    const closures = issueDefinitions.map((definition, index) => {
      const sourceCivilDate = addDays(today, index - 5);
      const closedAt = `${sourceCivilDate}T15:00:00.000Z`;
      return {
        id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        settingType: "teacher-day-closure",
        academicYearId,
        classroomId,
        civilDate: sourceCivilDate,
        closureStatus: "carried-forward",
        closedAt,
        nextDayNote: `Kaynak öğretmen notu ${index + 1} ayrıntılı takip.`,
        issueCodes: [definition.code],
        evidence: definition.evidence,
        evidenceFingerprint: `sha256:${String(index + 1).repeat(64)}`,
        createdAt: closedAt,
        updatedAt: closedAt,
        deletedAt: null,
        schemaVersion: 2,
      };
    });
    const transition = (
      index: number,
      state: "resolved" | "deferred",
      deferredUntilCivilDate: string | null,
    ) => {
      const closure = closures[index];
      const issueCode = issueDefinitions[index].code;
      const identity = `teacher-day-closure:${academicYearId}:${classroomId}:${closure.civilDate}:${issueCode}`;
      return {
        id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        settingType: "teacher-day-carry-forward-transition",
        academicYearId,
        classroomId,
        civilDate: today,
        sourceClosureId: closure.id,
        sourceCivilDate: closure.civilDate,
        sourceIssueCode: issueCode,
        sourceIssueIdentity: identity,
        sourceIssueId: identity,
        transitionState: state,
        transitionedAt: `${today}T08:00:00.000Z`,
        transitionNote: state === "resolved" ? "Tamamlandı." : "Belirlenen güne ertelendi.",
        deferredUntilCivilDate,
        previousTransitionId: null,
        createdAt: `${today}T08:00:00.000Z`,
        updatedAt: `${today}T08:00:00.000Z`,
        deletedAt: null,
        schemaVersion: 1,
      };
    };
    const settingsWrite = database.transaction(["settings"], "readwrite");
    const store = settingsWrite.objectStore("settings");
    for (const record of [
      ...closures,
      transition(0, "resolved", null),
      transition(1, "deferred", addDays(today, 2)),
    ]) {
      store.put(record);
    }
    await new Promise<void>((resolve, reject) => {
      settingsWrite.oncomplete = () => resolve();
      settingsWrite.onerror = () => reject(settingsWrite.error);
      settingsWrite.onabort = () => reject(settingsWrite.error);
    });
    database.close();
  }, currentCivilDate);
}

test.use({ viewport: { width: 390, height: 844 } });

test("taşınan işler ana önceliği sınırlar; erteleme, çözme ve geri açma gerçek kayda gider", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/", { waitUntil: "networkidle" });
  const civilDate = await page.evaluate(async () => {
    const { civilDateInIstanbul } = await import("/src/core/domain/attendance.ts");
    return civilDateInIstanbul(new Date());
  });
  await configureClassroom(page, civilDate);
  await seedCarryForwardHistory(page, civilDate);
  await page.reload({ waitUntil: "networkidle" });

  const carry = page.getByTestId("teacher-carry-forward");
  await expect(carry).toBeVisible();
  await expect(carry.locator(".teacher-carry-primary .teacher-carry-item")).toHaveCount(3);
  await expect(carry.locator(".teacher-carry-primary")).toContainText("Günlük plan yok");
  await expect(carry.locator(".teacher-carry-primary")).toContainText("Uygulama akışı açık");
  await expect(carry.locator(".teacher-carry-primary")).toContainText("Program bağı bekliyor");
  await expect(carry.getByText("Yoklama tamamlanmadı", { exact: true })).toBeHidden();
  await expect(carry.getByText("Sınıf listesi boş", { exact: true })).toBeHidden();

  const details = carry.locator(".teacher-carry-details");
  await details.locator("summary").click();
  await expect(details.getByText("Yoklama tamamlanmadı", { exact: true })).toBeVisible();
  await expect(details.getByText("Sınıf listesi boş", { exact: true })).toBeVisible();
  await expect(details).toContainText("Ertelendi");
  await expect(details).toContainText("Çözüldü");

  const futureDeferred = details.locator(".teacher-carry-item").filter({
    hasText: "Yoklama tamamlanmadı",
  });
  await futureDeferred.getByRole("button", { name: "Tarihi değiştir" }).click();
  const deferDate = futureDeferred.getByLabel("Yeni açık tarih");
  await deferDate.fill(civilDate);
  await expect(futureDeferred.getByRole("button", { name: "Ertelemeyi kaydet" })).toBeDisabled();
  await expect(futureDeferred).toContainText("Erteleme tarihi bugünden sonra olmalıdır.");
  await deferDate.fill(addCivilDays(civilDate, 3));
  await futureDeferred.getByRole("button", { name: "Ertelemeyi kaydet" }).click();
  await expect(futureDeferred).toContainText("tarihine ertelendi");

  const resolved = details.locator(".teacher-carry-item").filter({
    hasText: "Sınıf listesi boş",
  });
  await resolved.getByRole("button", { name: "Geri aç" }).click();
  await expect(carry.locator(".teacher-carry-primary")).toContainText("Sınıf listesi boş");

  const openDailyPlan = carry.locator(".teacher-carry-primary .teacher-carry-item").filter({
    hasText: "Günlük plan yok",
  });
  await openDailyPlan.getByRole("button", { name: "Çözüldü" }).click();
  await expect(carry.locator(".teacher-carry-primary")).not.toContainText("Günlük plan yok");

  const targets = carry.locator("button, summary, input");
  for (let index = 0; index < (await targets.count()); index += 1) {
    const box = await targets.nth(index).boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  }
});
