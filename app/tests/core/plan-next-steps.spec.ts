import { expect, test } from "@playwright/test";

test("hazır plan omurgası ve günlük seçim IndexedDB'de kalır; eşzamanlı ikinci günlük yazım reddedilir", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const planning = await import("/src/features/planning/plan-next-steps.ts");
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const databaseName = `plan-next-steps-${crypto.randomUUID()}`;
    const store = new core.IndexedDbDataStore({ databaseName });
    const academicYearId = "00000000-0000-4000-8000-00000000b101";
    const classroomId = "00000000-0000-4000-8000-00000000b102";
    const studentId = "00000000-0000-4000-8000-00000000b103";
    const base = {
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 1,
    };
    const curriculumProfile = {
      framework: "tymm" as const,
      programLabel: evidence.CURRICULUM_PROGRAM_LABELS.tymm,
      catalogId: "tymm-2024-okul-oncesi-v1",
      sourceVersion: "2024.1",
      referenceOrigin: "teacher-declared" as const,
      officialCatalogVerified: false,
    };
    await store.transaction(
      "readwrite",
      ["academicYears", "classrooms", "students", "settings"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: academicYearId,
          name: "2026–2027 Kurgu Eğitim Yılı",
          startDate: "2026-09-01",
          endDate: "2027-06-25",
          status: "active",
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: classroomId,
          academicYearId,
          name: "Kurgu Güneş Sınıfı",
          ageGroup: "60-72",
          curriculumProfileSnapshot: curriculumProfile,
          schedule: core.normalizeClassroomSchedule({
            kind: "morning",
            startTime: "08:30",
            endTime: "12:30",
          }),
          schemaVersion: 2,
        }]);
        await transaction.putMany("students", [{
          ...base,
          id: studentId,
          academicYearId,
          classroomId,
          displayName: "Kurgu Ada",
          active: true,
          enrollmentStatus: "active",
        }]);
        await transaction.putMany("settings", [{
          ...base,
          id: core.ACTIVE_CLASSROOM_SETTING_ID,
          settingType: core.ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId,
          classroomId,
        }]);
      },
    );

    const spine = await planning.loadPlanNextSteps(store, {
      civilDate: "2026-09-17",
      requestedLevel: "daily",
    });
    const spineRequest = spine.options[0]?.request;
    if (!spineRequest) throw new Error("Kurgu omurga isteği hazırlanamadı.");
    const spineResult = await planning.applyPlanNextStep(store, spineRequest, {
      now: new Date("2026-09-10T06:00:00.000Z"),
    });
    const daily = await planning.loadPlanNextSteps(store, {
      civilDate: "2026-09-17",
      requestedLevel: "daily",
    });
    const dailyRequest = daily.options[0]?.request;
    if (!dailyRequest) throw new Error("Kurgu günlük plan isteği hazırlanamadı.");
    const writes = await Promise.allSettled([
      planning.applyPlanNextStep(store, dailyRequest, {
        now: new Date("2026-09-17T06:00:00.000Z"),
      }),
      planning.applyPlanNextStep(store, dailyRequest, {
        now: new Date("2026-09-17T06:00:01.000Z"),
      }),
    ]);
    const fulfilled = writes.filter(
      (entry): entry is PromiseFulfilledResult<Awaited<ReturnType<typeof planning.applyPlanNextStep>>> =>
        entry.status === "fulfilled",
    );
    const rejected = writes.filter(
      (entry): entry is PromiseRejectedResult => entry.status === "rejected",
    );
    const firstResult = fulfilled[0]?.value;
    const firstSnapshot = await store.readSnapshot();
    store.close();

    const reopened = new core.IndexedDbDataStore({ databaseName });
    const reopenedSnapshot = await reopened.readSnapshot();
    const ready = await planning.loadPlanNextSteps(reopened, {
      civilDate: "2026-09-17",
      requestedLevel: "daily",
    });
    const priorFlow = core.canonicalJson(reopenedSnapshot.plans.find(p => p.id === firstResult?.nextTarget.planId)?.teacherOwnedDailyFlow);
    await reopened.transaction("readwrite",["activities"],async tx=>{const rows=await tx.getAll("activities");const activity=rows.find(a=>a.planId===firstResult?.nextTarget.planId)!;const orphan={...activity};delete orphan.sourceWeeklyPlanId;await tx.putMany("activities",[orphan]);});
    const repair = await planning.loadPlanNextSteps(reopened,{civilDate:"2026-09-17"});
    if(repair.options[0]?.request?.kind!=="link-existing-daily-plan")throw new Error("Eksik etkinlik bağı hazırlanmadı.");
    await planning.applyPlanNextStep(reopened,repair.options[0].request,{now:new Date("2026-09-17T06:02:00.000Z")});
    const repaired=await reopened.readSnapshot();
    const flowPreserved=core.canonicalJson(repaired.plans.find(p=>p.id===firstResult?.nextTarget.planId)?.teacherOwnedDailyFlow)===priorFlow;
    const blockPreserved=repaired.activities[0].teacherOwnedFlowBlockId===reopenedSnapshot.activities[0].teacherOwnedFlowBlockId;
    const repairedReady=(await planning.loadPlanNextSteps(reopened,{civilDate:"2026-09-17"})).status;
    reopened.close();
    const dailyPlans = reopenedSnapshot.plans.filter(
      (record) => record.planType === "daily" && record.civilDate === "2026-09-17",
    );
    const activities = reopenedSnapshot.activities.filter(
      (record) => record.planId === dailyPlans[0]?.id,
    );
    return {
      flowPreserved,blockPreserved,repairedReady,
      spinePlanCount: spineResult.createdPlanIds.length,
      optionCount: daily.options.length,
      fulfilled: fulfilled.length,
      rejected: rejected.length,
      rejection: rejected[0]?.reason instanceof Error ? rejected[0].reason.message : "",
      exactReload: JSON.stringify(firstSnapshot) === JSON.stringify(reopenedSnapshot),
      dailyCount: dailyPlans.length,
      activityCount: activities.length,
      dailyPlanId: dailyPlans[0]?.id,
      resultPlanId: firstResult?.nextTarget.planId,
      activityStatus: activities[0]?.status,
      hasFlow: Boolean(dailyPlans[0]?.teacherOwnedDailyFlow),
      hasAnnual: typeof dailyPlans[0]?.sourceAnnualPlanId === "string",
      hasMonth: typeof dailyPlans[0]?.sourceMonthlyPlanId === "string",
      hasWeek: typeof dailyPlans[0]?.sourceWeeklyPlanId === "string",
      readyStatus: ready.status,
      readyTarget: ready.options[0]?.openTarget?.planId,
    };
  });

  expect(result.spinePlanCount).toBeGreaterThan(10);
  expect(result.flowPreserved).toBe(true);expect(result.blockPreserved).toBe(true);expect(result.repairedReady).toBe("ready");
  expect(result.optionCount).toBe(3);
  expect(result.fulfilled).toBe(1);
  expect(result.rejected).toBe(1);
  expect(result.rejection).toMatch(/zaten var|seçimden sonra değişti/);
  expect(result.exactReload).toBe(true);
  expect(result.dailyCount).toBe(1);
  expect(result.activityCount).toBe(1);
  expect(result.dailyPlanId).toBe(result.resultPlanId);
  expect(result.activityStatus).toBe("planned");
  expect(result.hasFlow).toBe(true);
  expect(result.hasAnnual).toBe(true);
  expect(result.hasMonth).toBe(true);
  expect(result.hasWeek).toBe(true);
  expect(result.readyStatus).toBe("ready");
  expect(result.readyTarget).toBe(result.dailyPlanId);
});
