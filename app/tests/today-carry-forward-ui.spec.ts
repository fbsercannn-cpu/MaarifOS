import { expect, test, type Page } from "@playwright/test";

async function configureClassroom(page: Page, civilDate: string) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Taşınan İşler Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Taşınan İşler Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill(civilDate);
  await setup.getByLabel("Eğitim yılı bitişi").fill(civilDate);
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
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

test("taşınan iş geçmişi korunur ve sade Bugün ekranını kalabalıklaştırmaz", async ({
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

  await expect(page.getByTestId("teacher-carry-forward")).toHaveCount(0);
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(page.getByRole("region", { name: "Sıradaki en iyi adım" })).toContainText(
    "İlk çocuğu ekle",
  );

  const preservedRecords = await page.evaluate(async () => {
    const request = indexedDB.open("maarifos-local");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = database.transaction(["settings"], "readonly");
    const recordsRequest = read.objectStore("settings").getAll();
    const records = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      recordsRequest.onsuccess = () => resolve(recordsRequest.result);
      recordsRequest.onerror = () => reject(recordsRequest.error);
    });
    database.close();
    return {
      closures: records.filter(
        (record) => record.settingType === "teacher-day-closure",
      ).length,
      transitions: records.filter(
        (record) => record.settingType === "teacher-day-carry-forward-transition",
      ).length,
    };
  });
  expect(preservedRecords).toEqual({ closures: 5, transitions: 2 });
});
