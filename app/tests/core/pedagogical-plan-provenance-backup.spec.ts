import { expect, test } from "@playwright/test";

test("pedagojik plan kaynağı yedekten exact döner ve zincir tahrifi fail-closed kalır", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const curriculum = await import(
      "/src/features/curriculum/curriculum-catalog.ts"
    );
    const studio = await import(
      "/src/features/activity-studio/activity-studio-model.ts"
    );
    const bridge = await import(
      "/src/features/pedagogical-os/pedagogical-plan-bridge.ts"
    );
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-pedagogy-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-pedagogy-target-${crypto.randomUUID()}`,
    });
    const academicYearId = "00000000-0000-4000-8000-000000009101";
    const classroomId = "00000000-0000-4000-8000-000000009102";
    const studentId = "00000000-0000-4000-8000-000000009103";
    const curriculumProfile = {
      framework: "tymm" as const,
      programLabel: evidence.CURRICULUM_PROGRAM_LABELS.tymm,
      catalogId: "tymm-2024-okul-oncesi-v1",
      sourceVersion: "2024.1",
      referenceOrigin: "teacher-declared" as const,
      officialCatalogVerified: false,
    };
    const targetReference = curriculum
      .curriculumTargetsForProfile(curriculumProfile)
      .find((item) => item.referenceCode === "FAB.1");
    const sourceActivity = studio.ACTIVITY_STUDIO_ITEMS.find((item) =>
      item.ageBands.includes("48-60")
    );
    if (!targetReference || !sourceActivity) {
      throw new Error("Kurgu program veya etkinlik kaynağı bulunamadı.");
    }
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
          startDate: "2026-09-01",
          endDate: "2027-06-30",
          status: "active",
          schemaVersion: 1,
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: classroomId,
          academicYearId,
          name: "Kurgu Pedagoji Sınıfı",
          curriculumProfileSnapshot: curriculumProfile,
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
          displayName: "Kurgu Öğrenci",
          schemaVersion: 1,
        }]);
      },
    );
    const provenance = bridge.createPedagogicalPlanBridge({
      activity: sourceActivity,
      civilDate: "2026-09-07",
      ageBand: "48-60",
      scenarioId: "sensory-calm",
      participationRouteId: "visual",
      now: new Date("2026-09-07T06:00:00.000Z"),
    });
    const created = await evidence.createPlanWithActivity(source, {
      civilDate: "2026-09-07",
      planTitle: `${sourceActivity.title} planı`,
      activityTitle: sourceActivity.title,
      startTime: "09:00",
      endTime: "09:30",
      curriculumProfile,
      curriculumTargets: [targetReference],
      assignmentMode: "selected-students",
      studentIds: [studentId],
      pedagogicalProvenance: provenance,
      now: new Date("2026-09-07T06:05:00.000Z"),
    });
    const service = new core.BackupService(source, {
      appVersion: "0.16.0-test",
      clock: () => new Date("2026-09-07T07:00:00.000Z"),
      civilDateProvider: () => "2026-09-07",
    });
    const backup = await service.exportBackup();
    await new core.BackupService(target, {
      appVersion: "0.16.0-test",
    }).restoreBackup(backup, {
      mode: "replace",
      createRecoverySnapshot: false,
    });
    const restored = await target.readSnapshot();
    const restoredPlan = restored.plans.find((item) => item.id === created.plan.id);
    const restoredActivity = restored.activities.find(
      (item) => item.id === created.activity.id,
    );
    const exact = core.canonicalJson(restoredPlan?.pedagogicalProvenance) ===
      core.canonicalJson(provenance) &&
      core.canonicalJson(restoredActivity?.pedagogicalProvenance) ===
        core.canonicalJson(provenance);

    const tampered = structuredClone(backup);
    const tamperedPlan = tampered.payload.plans.find(
      (item) => item.id === created.plan.id,
    );
    if (!tamperedPlan?.pedagogicalProvenance) {
      throw new Error("Kurgu pedagojik kaynak kaydı bulunamadı.");
    }
    tamperedPlan.pedagogicalProvenance.valueTrace.value = "değiştirilmiş";
    tampered.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(tampered.payload),
    );
    let rejected = false;
    try {
      await service.parseAndVerifyBackup(tampered);
    } catch (error) {
      rejected = error instanceof Error &&
        /pedagojik plan kaynak zinciri geçersiz/u.test(error.message);
    }
    source.close();
    target.close();
    return { exact, rejected };
  });

  expect(result).toEqual({ exact: true, rejected: true });
});
