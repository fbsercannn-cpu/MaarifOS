import { expect, test } from "@playwright/test";

test("öğretmen günlük akışını yedekler, aynen geri yükler ve strict akış tahrifini reddeder", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
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
    const deepSeekPlan = await import(
      "/src/features/ai-work-center/deepseek-plan-review.ts"
    );
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-daily-flow-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-daily-flow-target-${crypto.randomUUID()}`,
    });
    const legacyTarget = new core.IndexedDbDataStore({
      databaseName: `maarifos-daily-flow-legacy-${crypto.randomUUID()}`,
    });
    const academicYearId = "00000000-0000-4000-8000-000000001911";
    const classroomId = "00000000-0000-4000-8000-000000001912";
    const studentId = "00000000-0000-4000-8000-000000001913";
    const dailyPlanId = "00000000-0000-4000-8000-000000001914";
    const activityId = "00000000-0000-4000-8000-000000001915";
    const curriculumProfile = {
      framework: "tymm" as const,
      programLabel: evidence.CURRICULUM_PROGRAM_LABELS.tymm,
      catalogId: "tymm-2024-okul-oncesi-v1",
      sourceVersion: "2024.1",
      referenceOrigin: "teacher-declared" as const,
      officialCatalogVerified: false,
    };
    const curriculumTarget = curriculum
      .curriculumTargetsForProfile(curriculumProfile)
      .find((targetEntry) => targetEntry.referenceCode === "FAB.1");
    if (!curriculumTarget) throw new Error("Kurgu program hedefi bulunamadı.");
    const base = {
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
    };
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "settings", "students"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: academicYearId,
          name: "2026–2027 Kurgu Eğitim Yılı",
          startDate: "2026-09-07",
          endDate: "2027-06-25",
          status: "active",
          schemaVersion: 1,
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: classroomId,
          academicYearId,
          name: "Kurgu Güneş Sınıfı",
          curriculumProfileSnapshot: curriculumProfile,
          schedule: core.normalizeClassroomSchedule({
            kind: "morning",
            startTime: "08:30",
            endTime: "12:30",
          }),
          schemaVersion: 2,
        }]);
        await transaction.putMany("settings", [{
          ...base,
          id: core.ACTIVE_CLASSROOM_SETTING_ID,
          settingType: core.ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId,
          classroomId,
          schemaVersion: 1,
        }]);
        await transaction.putMany("students", [{
          ...base,
          id: studentId,
          academicYearId,
          classroomId,
          displayName: "Kurgu Ada",
          schemaVersion: 1,
        }]);
      },
    );
    const graph = await planning.createTeacherOwnedPlanGraph(source, {
      title: "2026–2027 Öğretmen Yıllık Planı",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
      teacherContent: { purpose: "Öğretmenin yıllık omurgası" },
      months: [{
        title: "Eylül Öğretmen Planı",
        monthKey: "2026-09",
        periodStart: "2026-09-07",
        periodEnd: "2026-09-30",
        teacherContent: { focus: "Uyum ve aidiyet" },
        weeks: [{
          title: "7–11 Eylül Haftası",
          weekKey: "2026-W37",
          periodStart: "2026-09-07",
          periodEnd: "2026-09-11",
          teacherContent: { flow: ["karşılama", "oyun", "gözlem"] },
        }],
      }],
      now: new Date("2026-09-02T06:00:00.000Z"),
    });
    const daily = await evidence.createPlanWithActivity(source, {
      civilDate: "2026-09-08",
      planId: dailyPlanId,
      planTitle: "8 Eylül Öğretmen Günlük Planı",
      activityId,
      activityTitle: "Sınıf topluluğu oyunu",
      startTime: "09:00",
      endTime: "09:40",
      curriculumProfile,
      curriculumTargets: [curriculumTarget],
      assignmentMode: "selected-students",
      studentIds: [studentId],
      teacherOwnedDailyFlowBlocks:
        dailyFlow.defaultTeacherOwnedDailyFlowBlockDrafts(240),
      teacherOwnedActivityBlockKind: "teacher-activity-one",
      now: new Date("2026-09-08T06:00:00.000Z"),
    });
    const existingFlow = daily.plan.teacherOwnedDailyFlow;
    if (
      !existingFlow ||
      typeof existingFlow !== "object" ||
      !Array.isArray(existingFlow.blocks)
    ) {
      throw new Error("Kurgu öğretmen günlük akışı oluşmadı.");
    }
    const updated = await planning.updateTeacherOwnedDailyFlow(source, {
      planId: daily.plan.id,
      expectedUpdatedAt: daily.plan.updatedAt,
      blocks: existingFlow.blocks.map((block, index) => ({
        id: block.id,
        kind: block.kind,
        title: index === 3 ? "Çocukların kurduğu gölge oyunu" : block.title,
        status: block.status,
        durationMinutes: index === 3
          ? 40
          : index === 4
            ? 8
            : block.durationMinutes,
        transitionNote: index === 3 ? "Bahçeden sınıfa ritimle geç." : block.transitionNote,
        teacherNote: index === 3 ? "Üç rol seçeneğini görünür tut." : block.teacherNote,
      })),
      now: new Date("2026-09-08T06:05:00.000Z"),
    });
    const reviewSnapshot = await source.readSnapshot();
    const reviewCandidate = deepSeekPlan.createLocalDailyPlanReview(
      reviewSnapshot,
      dailyPlanId,
    );
    const reviewed = await deepSeekPlan.applyDailyPlanReview(
      source,
      reviewCandidate,
      reviewCandidate,
      new Date("2026-09-08T06:10:00.000Z"),
    );
    const backup = await new core.BackupService(source, {
      appVersion: "0.10.0-test",
      clock: () => new Date("2026-09-09T06:00:00.000Z"),
      civilDateProvider: () => "2026-09-09",
    }).exportBackup();
    await new core.BackupService(target, {
      appVersion: "0.10.0-test",
    }).restoreBackup(backup, {
      mode: "replace",
      createRecoverySnapshot: false,
    });
    const restoredSnapshot = await target.readSnapshot();
    const restoredDaily = restoredSnapshot.plans.find(
      (plan) => plan.id === dailyPlanId,
    );
    const activityCount = restoredSnapshot.activities.filter(
      (activity) => activity.planId === dailyPlanId,
    ).length;
    const targetBeforeTamper = core.canonicalJson(restoredSnapshot);

    const orderTamper = structuredClone(backup);
    const orderTamperedDaily = orderTamper.payload.plans.find(
      (plan) => plan.id === dailyPlanId,
    );
    if (
      !orderTamperedDaily ||
      !orderTamperedDaily.teacherOwnedDailyFlow ||
      typeof orderTamperedDaily.teacherOwnedDailyFlow !== "object" ||
      !Array.isArray(orderTamperedDaily.teacherOwnedDailyFlow.blocks)
    ) {
      throw new Error("Kurgu yedekte öğretmen günlük akışı bulunamadı.");
    }
    orderTamperedDaily.teacherOwnedDailyFlow.blocks[1].order = 1;
    orderTamper.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(orderTamper.payload),
    );
    let orderTamperError = "";
    try {
      await new core.BackupService(target, {
        appVersion: "0.10.0-test",
      }).restoreBackup(orderTamper, {
        mode: "replace",
        createRecoverySnapshot: false,
      });
    } catch (error) {
      orderTamperError = error instanceof Error ? error.message : String(error);
    }

    const providerTamper = structuredClone(backup);
    const providerTamperedDaily = providerTamper.payload.plans.find(
      (plan) => plan.id === dailyPlanId,
    );
    if (
      !providerTamperedDaily ||
      !providerTamperedDaily.teacherOwnedDailyFlow ||
      typeof providerTamperedDaily.teacherOwnedDailyFlow !== "object"
    ) {
      throw new Error("Kurgu yedekte öğretmen günlük akışı bulunamadı.");
    }
    providerTamperedDaily.teacherOwnedDailyFlow.providerTemplateId =
      "uydurma-sağlayıcı";
    providerTamper.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(providerTamper.payload),
    );
    let providerTamperError = "";
    try {
      await new core.BackupService(target, {
        appVersion: "0.10.0-test",
      }).restoreBackup(providerTamper, {
        mode: "replace",
        createRecoverySnapshot: false,
      });
    } catch (error) {
      providerTamperError = error instanceof Error ? error.message : String(error);
    }
    const targetAfterTamper = core.canonicalJson(await target.readSnapshot());

    const legacyBackup = structuredClone(backup);
    const legacyDaily = legacyBackup.payload.plans.find(
      (plan) => plan.id === dailyPlanId,
    );
    if (!legacyDaily) throw new Error("Kurgu eski günlük plan bulunamadı.");
    delete legacyDaily.teacherOwnedDailyFlow;
    const legacyActivity = legacyBackup.payload.activities.find(
      (activity) => activity.planId === dailyPlanId,
    );
    if (legacyActivity) delete legacyActivity.teacherOwnedFlowBlockId;
    legacyBackup.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(legacyBackup.payload),
    );
    await new core.BackupService(legacyTarget, {
      appVersion: "0.10.0-test",
    }).restoreBackup(legacyBackup, {
      mode: "replace",
      createRecoverySnapshot: false,
    });
    const legacyRestored = (await legacyTarget.readSnapshot()).plans.find(
      (plan) => plan.id === dailyPlanId,
    );
    const expectedFlow = (await source.readSnapshot()).plans.find(
      (plan) => plan.id === dailyPlanId,
    )?.teacherOwnedDailyFlow;
    source.close();
    target.close();
    legacyTarget.close();
    return {
      graphIds: [
        graph.annual.id,
        graph.months[0].monthly.id,
        graph.months[0].weeks[0].id,
      ],
      restoredFlow: restoredDaily?.teacherOwnedDailyFlow,
      expectedFlow,
      reviewRevisionNumber: reviewed.revisionNumber,
      restoredReviewLabels: restoredDaily?.teacherOwnedDailyFlow?.blocks
        ?.map((block) => String(block.teacherNote ?? ""))
        .filter((note) => note.includes("DeepSeek")),
      activityCount,
      orderTamperError,
      providerTamperError,
      targetUnchanged: targetAfterTamper === targetBeforeTamper,
      legacyPlanPreserved:
        legacyRestored?.id === dailyPlanId &&
        legacyRestored.teacherOwnedDailyFlow === undefined,
    };
  });

  expect(result.restoredFlow).toEqual(result.expectedFlow);
  expect(result.activityCount).toBe(1);
  expect(result.reviewRevisionNumber).toBe(3);
  expect(result.restoredReviewLabels).toHaveLength(4);
  expect(result.graphIds.every(Boolean)).toBe(true);
  expect(result.orderTamperError).toContain(
    "öğretmene ait günlük kaynak zinciri geçersiz",
  );
  expect(result.providerTamperError).toContain(
    "öğretmene ait günlük kaynak zinciri geçersiz",
  );
  expect(result.targetUnchanged).toBe(true);
  expect(result.legacyPlanPreserved).toBe(true);
});
