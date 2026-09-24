import { expect, test } from "@playwright/test";

test("öğretmene ait yıllık → aylık → haftalık planı yedekler, geri yükler ve grafik tahrifini reddeder", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const planning = await import(
      "/src/features/planning/teacher-owned-plan-service.ts"
    );
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const dayClosure = await import(
      "/src/features/day-closure/teacher-day-closure.ts"
    );
    const curriculum = await import(
      "/src/features/curriculum/curriculum-catalog.ts"
    );
    const dailyFlow = await import(
      "/src/core/domain/teacher-owned-daily-flow.ts"
    );
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-teacher-plan-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-teacher-plan-target-${crypto.randomUUID()}`,
    });
    const academicYearId = "00000000-0000-4000-8000-000000000e01";
    const classroomId = "00000000-0000-4000-8000-000000000e02";
    const studentId = "00000000-0000-4000-8000-000000000e03";
    const dailyPlanId = "00000000-0000-4000-8000-000000000e04";
    const activityId = "00000000-0000-4000-8000-000000000e05";
    const observationId = "00000000-0000-4000-8000-000000000e06";
    const curriculumProfile = {
      framework: "tymm",
      programLabel: evidence.CURRICULUM_PROGRAM_LABELS.tymm,
      catalogId: "tymm-2024-okul-oncesi-v1",
      sourceVersion: "2024.1",
      referenceOrigin: "teacher-declared",
      officialCatalogVerified: false,
    };
    const curriculumTarget = curriculum
      .curriculumTargetsForProfile(curriculumProfile)
      .find((target) => target.referenceCode === "FAB.1");
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
        await transaction.putMany("academicYears", [
          {
            ...base,
            id: academicYearId,
            name: "2026–2027 Kurgu Eğitim Yılı",
            startDate: "2026-09-07",
            endDate: "2027-06-25",
            status: "active",
            schemaVersion: 1,
          },
        ]);
        await transaction.putMany("classrooms", [
          {
            ...base,
            id: classroomId,
            academicYearId,
            name: "Kurgu Güneş Sınıfı",
            schemaVersion: 2,
            curriculumProfileSnapshot: curriculumProfile,
            schedule: core.normalizeClassroomSchedule({
              kind: "full_day",
              startTime: "08:30",
              endTime: "16:00",
            }),
          },
        ]);
        await transaction.putMany("settings", [
          {
            ...base,
            id: core.ACTIVE_CLASSROOM_SETTING_ID,
            settingType: core.ACTIVE_CLASSROOM_SETTING_TYPE,
            academicYearId,
            classroomId,
            schemaVersion: 1,
          },
        ]);
        await transaction.putMany("students", [
          {
            ...base,
            id: studentId,
            academicYearId,
            classroomId,
            displayName: "Kurgu Ada",
            schemaVersion: 1,
          },
        ]);
      },
    );

    const graph = await planning.createTeacherOwnedPlanGraph(source, {
      title: "2026–2027 Öğretmen Yıllık Planı",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
      teacherContent: {
        purpose: "Sınıfın öğretmen tarafından yazılan planlama omurgası",
      },
      months: [
        {
          title: "Eylül Öğretmen Planı",
          monthKey: "2026-09",
          periodStart: "2026-09-07",
          periodEnd: "2026-09-30",
          teacherContent: { focus: "Uyum ve aidiyet" },
          weeks: [
            {
              title: "8 Eylül Öğretmen Planı Dilimi",
              weekKey: "2026-W37",
              periodStart: "2026-09-08",
              periodEnd: "2026-09-08",
              teacherContent: { flow: ["karşılama", "oyun", "gözlem"] },
            },
            {
              title: "14–18 Eylül Haftası",
              weekKey: "2026-W38",
              periodStart: "2026-09-14",
              periodEnd: "2026-09-18",
              teacherContent: { flow: ["merkezler", "açık hava"] },
            },
          ],
        },
        {
          title: "Ekim Öğretmen Planı",
          monthKey: "2026-10",
          periodStart: "2026-10-01",
          periodEnd: "2026-10-30",
          teacherContent: { focus: "Ortak üretim ve sorumluluk" },
          weeks: [
            {
              title: "1–7 Ekim Haftası",
              weekKey: "2026-W40",
              periodStart: "2026-10-01",
              periodEnd: "2026-10-07",
              teacherContent: { flow: ["ortak üretim", "açık hava"] },
            },
          ],
        },
      ],
      now: new Date("2026-09-02T06:00:00.000Z"),
    });
    const revisedMonth = await planning.reviseTeacherOwnedPlan(source, {
      planId: graph.months[0].monthly.id,
      expectedUpdatedAt: graph.months[0].monthly.updatedAt,
      teacherContent: { focus: "Gözlem sonrası revize edilen uyum odağı" },
      now: new Date("2026-09-03T06:00:00.000Z"),
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
        dailyFlow.defaultTeacherOwnedDailyFlowBlockDrafts(450),
      teacherOwnedActivityBlockKind: "teacher-activity-one",
      initialActivityStatus: "in_progress",
      now: new Date("2026-09-08T06:00:00.000Z"),
    });
    await evidence.captureImmutableRawObservation(source, {
      observationId,
      studentId,
      planId: dailyPlanId,
      activityId,
      rawText:
        "Kurgu Ada, arkadaşının önerisini dinledikten sonra oyundaki sırayı birlikte yeniden kurdu.",
      observedAt: "2026-09-08T07:15:00.000Z",
      now: new Date("2026-09-08T07:16:00.000Z"),
    });
    await source.transaction(
      "readwrite",
      ["activities", "attendanceRecords", "settings"],
      async (transaction) => {
        const activities = await transaction.getAll("activities");
        const activity = activities.find((record) => record.id === activityId);
        if (!activity) throw new Error("Kurgu etkinlik bulunamadı.");
        await transaction.putMany("activities", [{
          ...activity,
          status: "completed",
          updatedAt: "2026-09-08T12:30:00.000Z",
        }]);
        await transaction.putMany("attendanceRecords", [{
          ...base,
          id: "00000000-0000-4000-8000-000000000e07",
          academicYearId,
          classroomId,
          studentId,
          civilDate: "2026-09-08",
          status: "present",
          schemaVersion: 1,
        }]);
        await transaction.putMany("settings", [{
          ...base,
          id: "00000000-0000-4000-8000-000000000e08",
          academicYearId,
          classroomId,
          civilDate: "2026-09-08",
          settingType: "attendance-day-completion",
          attendanceCompleted: true,
          schemaVersion: 1,
        }]);
      },
    );
    const weeklyCurriculumLink = await evidence.confirmObservationCurriculumLink(
      source,
      {
        observationId,
        framework: curriculumProfile.framework,
        catalogId: curriculumProfile.catalogId,
        sourceVersion: curriculumProfile.sourceVersion,
        referenceCode: curriculumTarget.referenceCode,
        referenceTitle: curriculumTarget.referenceTitle,
        referenceOrigin: curriculumProfile.referenceOrigin,
        officialCatalogVerified: curriculumProfile.officialCatalogVerified,
        plannedTargetId: curriculumTarget.id,
        now: new Date("2026-09-08T08:00:00.000Z"),
      },
    );
    await dayClosure.closeTeacherDay(source, {
      civilDate: "2026-09-08",
      nextDayNote: "",
      now: new Date("2026-09-08T13:30:00.000Z"),
    });
    const weeklyEvaluation = await planning.recordTeacherWeeklyEvaluation(
      source,
      {
        weeklyPlanId: graph.months[0].weeks[0].id,
        expectedWeeklyUpdatedAt: graph.months[0].weeks[0].updatedAt,
        reflection:
          "Sıra alma ve arkadaşını dinleme davranışı ortak oyunun içinde daha görünür oldu.",
        evidenceSummary:
          "8 Eylül gözleminde çocuk, arkadaşının önerisinden sonra oyun sırasını birlikte yeniden kurdu.",
        observationIds: [observationId],
        nextPlanDecision: "adapt",
        now: new Date("2026-09-11T13:00:00.000Z"),
      },
    );
    if (!weeklyEvaluation.curriculumLinkIds?.includes(weeklyCurriculumLink.id)) {
      throw new Error("Haftalık değerlendirme program bağı kimliğini korumadı.");
    }
    const graphAfterWeeklyEvaluation = await planning.loadTeacherOwnedPlanGraph(
      source,
      { annualPlanId: graph.annual.id },
    );
    if (!graphAfterWeeklyEvaluation) {
      throw new Error("Kurgu öğretmen plan grafiği yeniden yüklenemedi.");
    }
    const targetWeekAfterSuggestion = graphAfterWeeklyEvaluation.months[0].weeks[1];
    const reviewedTargetWeek = await planning.reviewTeacherWeeklyCarry(source, {
      weeklyPlanId: targetWeekAfterSuggestion.id,
      expectedWeeklyUpdatedAt: targetWeekAfterSuggestion.updatedAt,
      expectedEvaluationId: weeklyEvaluation.id,
      action: "accepted",
      teacherNote:
        "Kanıt, küçük grup geçişini sürdürüp görsel sıra desteği eklemeyi destekliyor.",
      acceptedNarrative:
        "Küçük grup geçişleri korunacak ve görsel sıra desteği eklenecek.",
      now: new Date("2026-09-11T13:03:00.000Z"),
    });
    const monthlyEvaluation = await planning.recordTeacherMonthlyEvaluation(
      source,
      {
        monthlyPlanId: graph.months[0].monthly.id,
        expectedMonthlyUpdatedAt: revisedMonth.updatedAt,
        childEvidenceState: "insufficient-evidence",
        childNarrative:
          "Ay geneli için iki hafta ve tüm çocukları kapsayan kanıt henüz oluşmadı.",
        observationIds: [],
        curriculumLinkIds: [],
        programCriteria: planning.TEACHER_MONTHLY_PROGRAM_CRITERIA.map(
          ([criterionId]) => ({ criterionId, status: "not-observed" }),
        ),
        programNarrative: "Program yönü için genelleme yapılmadı.",
        teacherCriteria: planning.TEACHER_MONTHLY_TEACHER_CRITERIA.map(
          ([criterionId]) => ({ criterionId, status: "not-observed" }),
        ),
        teacherNarrative: "Kanıt toplama düzeni iki haftaya yayılacak.",
        nextMonthRecommendation: "Her aktif çocuk için dengeli kanıt topla.",
        now: new Date("2026-09-30T13:05:00.000Z"),
      },
    );
    const graphAfterMonthlyEvaluation = await planning.loadTeacherOwnedPlanGraph(
      source,
      { annualPlanId: graph.annual.id },
    );
    if (!graphAfterMonthlyEvaluation) {
      throw new Error("Aylık öneri sonrası plan grafiği yüklenemedi.");
    }
    const targetMonthAfterSuggestion = graphAfterMonthlyEvaluation.months[1].monthly;
    const reviewedTargetMonth = await planning.reviewTeacherMonthlyCarry(source, {
      monthlyPlanId: targetMonthAfterSuggestion.id,
      expectedMonthlyUpdatedAt: targetMonthAfterSuggestion.updatedAt,
      expectedEvaluationId: monthlyEvaluation.id,
      action: "accepted",
      teacherNote:
        "Eylül kanıtı dengeli gözlemi sürdürmeyi destekliyor; Ekim odağına aile katılımı da eklenecek.",
      acceptedNarrative:
        "Her aktif çocuk için dengeli kanıt toplanacak ve aile katılımı gönüllülük temelinde planlanacak.",
      now: new Date("2026-09-30T13:08:00.000Z"),
    });

    const sourceService = new core.BackupService(source, {
      appVersion: "0.10.0-test",
      clock: () => new Date("2026-10-01T06:00:00.000Z"),
      civilDateProvider: () => "2026-10-01",
    });
    const backup = await sourceService.exportBackup();
    const restoreReport = await new core.BackupService(target, {
      appVersion: "0.10.0-test",
    }).restoreBackup(backup, { mode: "replace" });
    const restoredGraph = await planning.loadTeacherOwnedPlanGraph(target, {
      annualPlanId: graph.annual.id,
    });
    const beforeTamper = await target.readSnapshot();
    const restoredDaily = beforeTamper.plans.find(
      (plan) => plan.id === dailyPlanId,
    );
    const orphan = structuredClone(backup);
    const monthly = orphan.payload.plans.find(
      (plan) => plan.id === graph.months[0].monthly.id,
    );
    if (!monthly || !Array.isArray(monthly.weeklySectionIds)) {
      throw new Error("Kurgu aylık plan bulunamadı.");
    }
    monthly.weeklySectionIds = monthly.weeklySectionIds.slice(1);
    orphan.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(orphan.payload),
    );
    let orphanError = "";
    try {
      await new core.BackupService(target, {
        appVersion: "0.10.0-test",
      }).restoreBackup(orphan, { mode: "replace" });
    } catch (error) {
      orphanError = error instanceof Error ? error.message : String(error);
    }
    const afterTamper = await target.readSnapshot();
    const lineageTamper = structuredClone(backup);
    const tamperedDaily = lineageTamper.payload.plans.find(
      (plan) => plan.id === dailyPlanId,
    );
    if (!tamperedDaily) throw new Error("Kurgu günlük plan bulunamadı.");
    tamperedDaily.sourceMonthlyPlanId = graph.months[0].weeks[0].id;
    lineageTamper.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(lineageTamper.payload),
    );
    let lineageTamperError = "";
    try {
      await new core.BackupService(target, {
        appVersion: "0.10.0-test",
      }).restoreBackup(lineageTamper, { mode: "replace" });
    } catch (error) {
      lineageTamperError = error instanceof Error ? error.message : String(error);
    }
    const afterLineageTamper = await target.readSnapshot();
    const evaluationTamper = structuredClone(backup);
    const tamperedSourceWeek = evaluationTamper.payload.plans.find(
      (plan) => plan.id === graph.months[0].weeks[0].id,
    );
    if (
      !tamperedSourceWeek ||
      !Array.isArray(tamperedSourceWeek.weeklyEvaluations) ||
      !tamperedSourceWeek.weeklyEvaluations[0]
    ) {
      throw new Error("Kurgu haftalık değerlendirme bulunamadı.");
    }
    tamperedSourceWeek.weeklyEvaluations[0].sourcePlanRevisionNumber = 99;
    evaluationTamper.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(evaluationTamper.payload),
    );
    let evaluationTamperError = "";
    try {
      await new core.BackupService(target, {
        appVersion: "0.10.0-test",
      }).restoreBackup(evaluationTamper, { mode: "replace" });
    } catch (error) {
      evaluationTamperError = error instanceof Error ? error.message : String(error);
    }
    const afterEvaluationTamper = await target.readSnapshot();
    const weeklyLinkTamper = structuredClone(backup);
    const linkTamperedWeek = weeklyLinkTamper.payload.plans.find(
      (plan) => plan.id === graph.months[0].weeks[0].id,
    );
    if (
      !linkTamperedWeek ||
      !Array.isArray(linkTamperedWeek.weeklyEvaluations) ||
      !linkTamperedWeek.weeklyEvaluations[0] ||
      !Array.isArray(linkTamperedWeek.weeklyEvaluations[0].curriculumLinkIds)
    ) {
      throw new Error("Kurgu haftalık program bağı bulunamadı.");
    }
    linkTamperedWeek.weeklyEvaluations[0].curriculumLinkIds[0] =
      "00000000-0000-4000-8000-000000000eff";
    weeklyLinkTamper.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(weeklyLinkTamper.payload),
    );
    let weeklyLinkTamperError = "";
    try {
      await new core.BackupService(target, {
        appVersion: "0.10.0-test",
      }).restoreBackup(weeklyLinkTamper, { mode: "replace" });
    } catch (error) {
      weeklyLinkTamperError = error instanceof Error ? error.message : String(error);
    }
    const afterWeeklyLinkTamper = await target.readSnapshot();
    const monthlyEvaluationTamper = structuredClone(backup);
    const tamperedMonth = monthlyEvaluationTamper.payload.plans.find(
      (plan) => plan.id === graph.months[0].monthly.id,
    );
    if (
      !tamperedMonth ||
      !Array.isArray(tamperedMonth.monthlyEvaluations) ||
      !tamperedMonth.monthlyEvaluations[0]
    ) {
      throw new Error("Kurgu aylık değerlendirme bulunamadı.");
    }
    tamperedMonth.monthlyEvaluations[0].sourcePlanRevisionNumber = 99;
    monthlyEvaluationTamper.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(monthlyEvaluationTamper.payload),
    );
    let monthlyEvaluationTamperError = "";
    try {
      await new core.BackupService(target, {
        appVersion: "0.10.0-test",
      }).restoreBackup(monthlyEvaluationTamper, { mode: "replace" });
    } catch (error) {
      monthlyEvaluationTamperError = error instanceof Error ? error.message : String(error);
    }
    const afterMonthlyEvaluationTamper = await target.readSnapshot();
    source.close();
    target.close();
    return {
      dataSchemaVersion: backup.manifest.dataSchemaVersion,
      teacherPlanCount: backup.payload.plans.filter(
        (plan) => plan.planOrigin === "teacher-authored",
      ).length,
      restoreReport,
      originalGraph: graph,
      revisedMonth,
      daily,
      weeklyEvaluation,
      reviewedTargetWeek,
      monthlyEvaluation,
      reviewedTargetMonth,
      restoredDaily,
      restoredGraph,
      orphanError,
      lineageTamperError,
      evaluationTamperError,
      weeklyLinkTamperError,
      monthlyEvaluationTamperError,
      targetUnchanged:
        JSON.stringify(afterTamper) === JSON.stringify(beforeTamper) &&
        JSON.stringify(afterLineageTamper) === JSON.stringify(beforeTamper) &&
        JSON.stringify(afterEvaluationTamper) === JSON.stringify(beforeTamper) &&
        JSON.stringify(afterWeeklyLinkTamper) === JSON.stringify(beforeTamper) &&
        JSON.stringify(afterMonthlyEvaluationTamper) === JSON.stringify(beforeTamper),
    };
  });

  expect(result.dataSchemaVersion).toBe(11);
  expect(result.teacherPlanCount).toBe(6);
  expect(result.restoreReport.inserted).toBeGreaterThanOrEqual(7);
  expect(result.restoredGraph?.annual.id).toBe(result.originalGraph.annual.id);
  expect(result.restoredGraph?.months[0].weeks.map((week) => week.id)).toEqual(
    result.originalGraph.months[0].weeks.map((week) => week.id),
  );
  expect(result.restoredGraph?.months[0].monthly.revisionNumber).toBe(2);
  expect(result.restoredGraph?.months[0].monthly.teacherContent).toEqual(
    result.revisedMonth.teacherContent,
  );
  expect(result.restoredDaily?.sourceAnnualPlanId).toBe(
    result.originalGraph.annual.id,
  );
  expect(result.restoredDaily?.sourceMonthlyPlanId).toBe(
    result.originalGraph.months[0].monthly.id,
  );
  expect(result.restoredDaily?.sourceWeeklyPlanId).toBe(
    result.originalGraph.months[0].weeks[0].id,
  );
  expect(result.daily.activity.sourceWeeklyPlanId).toBe(
    result.originalGraph.months[0].weeks[0].id,
  );
  expect(result.restoredGraph?.months[0].weeks[0].weeklyEvaluations).toEqual([
    result.weeklyEvaluation,
  ]);
  expect(result.restoredGraph?.months[0].monthly.monthlyEvaluations).toEqual([
    result.monthlyEvaluation,
  ]);
  expect(
    result.restoredGraph?.months[1].monthly.nextMonthDecisionContext
      ?.applicationStatus,
  ).toBe("accepted");
  expect(
    result.restoredGraph?.months[1].monthly.nextMonthDecisionContext
      ?.reviewHistory,
  ).toEqual(result.reviewedTargetMonth.nextMonthDecisionContext?.reviewHistory);
  expect(
    result.restoredGraph?.months[0].weeks[1].nextPlanDecisionContext
      ?.evaluationId,
  ).toBe(result.weeklyEvaluation.id);
  expect(
    result.restoredGraph?.months[0].weeks[1].nextPlanDecisionContext
      ?.applicationStatus,
  ).toBe("accepted");
  expect(
    result.restoredGraph?.months[0].weeks[1].nextPlanDecisionContext
      ?.reviewHistory,
  ).toEqual(result.reviewedTargetWeek.nextPlanDecisionContext?.reviewHistory);
  expect(result.orphanError).toContain("öğretmen");
  expect(result.lineageTamperError).toContain("öğretmene ait günlük");
  expect(result.evaluationTamperError).toContain("revizyon izi");
  expect(result.weeklyLinkTamperError).toContain("program bağı");
  expect(result.monthlyEvaluationTamperError).toMatch(
    /aylık değerlendirme|önceki ay öneri zinciri/,
  );
  expect(result.targetUnchanged).toBe(true);
});
