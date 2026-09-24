import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test.setTimeout(120_000);

test("gerçek günlük akışın iki kaynak sürümü şifreli farklı kasaya eksiksiz döner", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");

  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const routine = await import("/src/core/domain/daily-routine-cards.ts");
    const dailyFlow = await import("/src/core/domain/teacher-owned-daily-flow.ts");
    const curriculum = await import(
      "/src/features/curriculum/curriculum-catalog.ts"
    );
    const evidenceFlow = await import("/src/features/evidence/evidence-flow.ts");
    const planning = await import(
      "/src/features/planning/teacher-owned-plan-service.ts"
    );
    const encryption = await import(
      "/src/core/backup/encrypted-backup.ts"
    );
    const service = await import(
      "/src/features/daily-routine-cards/daily-routine-cards-service.ts"
    );
    const workflows = await import("/tests/fixtures/new-workflows-browser.ts");
    const vault = await import("/tests/fixtures/local-vault-browser.ts");

    const reverseObjectKeys = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(reverseObjectKeys);
      if (!value || typeof value !== "object") return value;
      const record = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(record)
          .reverse()
          .map((key) => [key, reverseObjectKeys(record[key])]),
      );
    };

    const sourceName = `routine-source-${crypto.randomUUID()}`;
    const targetName = `routine-target-${crypto.randomUUID()}`;
    const source = new core.IndexedDbDataStore({ databaseName: sourceName });
    const target = new core.IndexedDbDataStore({ databaseName: targetName });
    const ids = await workflows.seedNewWorkflows(source);
    const scope = {
      academicYearId: ids.academicYearId,
      classroomId: ids.classroomId,
    };
    await planning.createTeacherOwnedPlanGraph(source, {
      title: "2026–2027 kurgu öğretmen yıllık planı",
      periodStart: "2026-09-01",
      periodEnd: "2027-06-30",
      teacherContent: { purpose: "Kaynaklı rutin kartı yedek kabulü" },
      months: [
        {
          title: "Eylül kurgu öğretmen planı",
          monthKey: "2026-09",
          periodStart: "2026-09-01",
          periodEnd: "2026-09-30",
          teacherContent: { focus: "Günlük akış ve sınıf ritmi" },
          weeks: [
            {
              title: "14–18 Eylül kurgu haftası",
              weekKey: "2026-W38",
              periodStart: "2026-09-14",
              periodEnd: "2026-09-18",
              teacherContent: { flow: ["karşılama", "oyun", "kapanış"] },
            },
          ],
        },
      ],
      now: new Date("2026-09-12T07:00:00.000Z"),
    });

    const configured = await source.readSnapshot();
    const classroom = configured.classrooms.find(
      (record) => record.id === scope.classroomId,
    );
    const curriculumProfile = classroom?.curriculumProfileSnapshot;
    if (!curriculumProfile || typeof curriculumProfile !== "object") {
      throw new Error("Kurgu sınıfının program profili bulunamadı.");
    }
    const curriculumTarget = curriculum
      .curriculumTargetsForProfile(curriculumProfile)
      .find((target) => target.referenceCode === "FAB.1");
    if (!curriculumTarget) throw new Error("Kurgu program hedefi bulunamadı.");
    const daily = await evidenceFlow.createPlanWithActivity(source, {
      civilDate: "2026-09-18",
      planTitle: "18 Eylül kurgu öğretmen günlük planı",
      activityTitle: "Birlikte kurgu sınıf oyunu",
      startTime: "09:15",
      endTime: "09:45",
      curriculumProfile,
      curriculumTargets: [curriculumTarget],
      assignmentMode: "whole-class",
      studentIds: [],
      teacherOwnedDailyFlowBlocks: dailyFlow
        .defaultTeacherOwnedDailyFlowBlockDrafts(240)
        .map((block, index) => ({
          ...block,
          title: `Kurgu ${index + 1}. günlük bölüm`,
          status: index === 7 ? "skipped" : index === 8 ? "optional" : "planned",
          teacherNote: "Çocuk kartına taşınmayacak öğretmen notu",
        })),
      teacherOwnedActivityBlockKind: "teacher-activity-one",
      now: new Date("2026-09-18T07:00:00.000Z"),
    });

    const firstSnapshot = await source.readSnapshot();
    const originalPlan = firstSnapshot.plans.find(
      (record) => record.id === daily.plan.id,
    );
    if (!originalPlan) throw new Error("Kurgu günlük akış planı bulunamadı.");
    const originalSource = routine.routineSourceFromPlan(originalPlan);
    const first = await service.saveDailyRoutineCards(source, {
      scope,
      expectedEventId: null,
      now: new Date("2026-09-18T09:00:00.000Z"),
      draft: {
        routineOn: "2026-09-18",
        dayMode: "short",
        title: "Kurgu kaynaklı kısa gün — ilk sürüm",
        source: originalSource,
        ...routine.routineDraft("short", originalSource),
      },
    });

    if (!dailyFlow.isTeacherOwnedDailyFlow(originalPlan.teacherOwnedDailyFlow)) {
      throw new Error("Revize edilecek öğretmen günlük akışı geçersiz.");
    }
    await planning.updateTeacherOwnedDailyFlow(source, {
      planId: originalPlan.id,
      expectedUpdatedAt: originalPlan.updatedAt,
      blocks: originalPlan.teacherOwnedDailyFlow.blocks.map((block, index) => ({
        ...block,
        title:
          index === 0
            ? "Güncellenen gerçek karşılama bölümü"
            : block.title,
      })),
      now: new Date("2026-09-18T10:00:00.000Z"),
    });

    const revisedSnapshot = await source.readSnapshot();
    const revisedPlan = revisedSnapshot.plans.find(
      (record) => record.id === daily.plan.id,
    );
    if (!revisedPlan) throw new Error("Revize günlük akış planı bulunamadı.");
    const revisedSource = routine.routineSourceFromPlan(revisedPlan);
    const second = await service.saveDailyRoutineCards(source, {
      scope,
      expectedEventId: first.id,
      now: new Date("2026-09-18T10:01:00.000Z"),
      draft: {
        routineOn: "2026-09-18",
        dayMode: "short",
        title: "Kurgu kaynaklı kısa gün — ikinci sürüm",
        source: revisedSource,
        ...routine.routineDraft("short", revisedSource),
      },
    });

    const expected = await source.readSnapshot();
    routine.assertDailyRoutineCardRelationships(expected);
    const expectedEvents = routine.dailyRoutineCards(expected, scope);
    const expectedPlan = expected.plans.find(
      (record) => record.id === daily.plan.id,
    );
    if (!expectedPlan || expectedEvents.length !== 2) {
      throw new Error("Kaynak sürüm geçmişi beklenen iki olayı taşımıyor.");
    }

    const sourceBlockKeyOrder = Object.keys(
      expectedEvents[0]!.workflow.source!.blocks[0]!,
    );
    const backup = new core.BackupService(source, {
      appVersion: "0.28.0",
      clock: () => new Date("2026-09-18T11:00:00.000Z"),
    });
    const plain = await backup.exportBackup();
    const canonicalPayloadEvents = routine.dailyRoutineCards(
      plain.payload,
      scope,
    );
    const canonicalPayloadBlockKeyOrder = Object.keys(
      canonicalPayloadEvents[0]!.workflow.source!.blocks[0]!,
    );
    const sourceSummary = await backup.recoverySummary();
    const password = "Kurgu-kaynakli-rutin-yedegi-2026!";
    const reorderedPlain = reverseObjectKeys(plain) as typeof plain;
    const reorderedPlainText = JSON.stringify(reorderedPlain);
    const reorderedPayloadEvents = routine.dailyRoutineCards(
      reorderedPlain.payload,
      scope,
    );
    const reorderedPayloadBlockKeyOrder = Object.keys(
      reorderedPayloadEvents[0]!.workflow.source!.blocks[0]!,
    );
    const encrypted = backup.serializeEncryptedBackup(
      await encryption.encryptBackupText(
        reorderedPlainText,
        {
          appVersion: plain.manifest.appVersion,
          createdAt: plain.manifest.createdAt,
        },
        password,
      ),
    );

    const restore = new core.BackupService(target, {
      appVersion: "0.28.0",
      clock: () => new Date("2026-09-18T11:01:00.000Z"),
    });
    await restore.restoreEncryptedBackup(encrypted, password, {
      mode: "replace",
      createRecoverySnapshot: false,
    });
    const actual = await target.readSnapshot();
    routine.assertDailyRoutineCardRelationships(actual);
    const actualEvents = routine.dailyRoutineCards(actual, scope);
    const actualPlan = actual.plans.find(
      (record) => record.id === daily.plan.id,
    );
    if (!actualPlan || actualEvents.length !== 2) {
      throw new Error("Geri yüklenen kaynak sürüm geçmişi eksik.");
    }

    const targetSummary = await restore.recoverySummary();
    const targetBlockKeyOrder = Object.keys(
      actualEvents[0]!.workflow.source!.blocks[0]!,
    );
    const rawRows = (
      await Promise.all(
        [sourceName, targetName].map((databaseName) =>
          Promise.all(
            core.COLLECTION_NAMES.map((collection) =>
              vault.readAll<Record<string, unknown>>(databaseName, collection),
            ),
          ),
        ),
      )
    ).flat(2);
    const sentinels = [
      "Kurgu kaynaklı kısa gün",
      "Güncellenen gerçek karşılama bölümü",
      "Çocuk kartına taşınmayacak öğretmen notu",
    ];
    const rawText = JSON.stringify(rawRows);

    const evidence = {
      sourceDatabase: sourceName,
      targetDatabase: targetName,
      differentVaults: sourceName !== targetName,
      dataSchemaVersion: plain.manifest.dataSchemaVersion,
      encryptedEnvelopePrefix: encrypted.slice(0, 48),
      eventCount: actualEvents.length,
      eventIds: actualEvents.map((event) => event.id),
      routineIdPreserved:
        actualEvents[0]!.workflow.routineId ===
        actualEvents[1]!.workflow.routineId,
      previousEventLinked:
        actualEvents[1]!.workflow.previousEventId === actualEvents[0]!.id &&
        second.workflow.previousEventId === first.id,
      sourceRevisionNumbers: actualEvents.map(
        (event) => event.workflow.source?.flowRevisionNumber,
      ),
      sourceStates: actualEvents.map((event) =>
        routine.routineSourceState(actual, event.workflow.source),
      ),
      firstSourceTitle: actualEvents[0]!.workflow.source!.blocks[0]!.title,
      secondSourceTitle: actualEvents[1]!.workflow.source!.blocks[0]!.title,
      planRevisionNumber: actualPlan.teacherOwnedDailyFlow.revisionNumber,
      planRevisionHistoryCount:
        actualPlan.teacherOwnedDailyFlow.revisionHistory.length,
      exactSnapshot:
        core.canonicalJson(expected) === core.canonicalJson(actual),
      exactSources:
        core.canonicalJson(
          expectedEvents.map((event) => event.workflow.source),
        ) ===
        core.canonicalJson(actualEvents.map((event) => event.workflow.source)),
      exactPlanHistory:
        core.canonicalJson(expectedPlan.teacherOwnedDailyFlow) ===
        core.canonicalJson(actualPlan.teacherOwnedDailyFlow),
      countHashExact:
        core.canonicalJson(sourceSummary.collections) ===
        core.canonicalJson(targetSummary.collections),
      durableRestoreReceipt:
        core.canonicalJson(restore.lastRestoreVerification?.collections) ===
        core.canonicalJson(sourceSummary.collections),
      keyOrderChanged:
        reorderedPlainText !== core.canonicalJson(plain) &&
        core.canonicalJson(reorderedPlain) === core.canonicalJson(plain) &&
        reorderedPayloadBlockKeyOrder.join("|") !==
          canonicalPayloadBlockKeyOrder.join("|") &&
        canonicalPayloadBlockKeyOrder.join("|") ===
          targetBlockKeyOrder.join("|") &&
        [...reorderedPayloadBlockKeyOrder].sort().join("|") ===
          [...targetBlockKeyOrder].sort().join("|"),
      sourceBlockKeyOrder,
      canonicalPayloadBlockKeyOrder,
      reorderedPayloadBlockKeyOrder,
      targetBlockKeyOrder,
      canonicalOrderPreservedMeaning:
        core.canonicalJson(expectedEvents[0]!.workflow.source) ===
        core.canonicalJson(actualEvents[0]!.workflow.source),
      rawRowCount: rawRows.length,
      allLocalRowsSealed: rawRows.every(
        (row) =>
          Object.keys(row).sort().join(",") === "__maarifosLocalVault,id",
      ),
      noPlaintext:
        sentinels.every(
          (sentinel) =>
            !rawText.includes(sentinel) && !encrypted.includes(sentinel),
        ) && !encrypted.includes(password),
    };

    source.close();
    target.close();
    return evidence;
  });

  expect(result.dataSchemaVersion).toBe(11);
  expect(result.eventCount).toBe(2);
  expect(result.sourceRevisionNumbers).toEqual([1, 2]);
  expect(result.sourceStates).toEqual(["changed", "current"]);
  expect(result.firstSourceTitle).toBe("Kurgu 1. günlük bölüm");
  expect(result.secondSourceTitle).toBe(
    "Güncellenen gerçek karşılama bölümü",
  );
  expect(result.planRevisionNumber).toBe(2);
  expect(result.planRevisionHistoryCount).toBe(1);
  expect([
    result.differentVaults,
    result.routineIdPreserved,
    result.previousEventLinked,
    result.exactSnapshot,
    result.exactSources,
    result.exactPlanHistory,
    result.countHashExact,
    result.durableRestoreReceipt,
    result.keyOrderChanged,
    result.canonicalOrderPreservedMeaning,
    result.allLocalRowsSealed,
    result.noPlaintext,
  ]).toEqual(Array(12).fill(true));

  const outputDirectory = new URL(
    "../../output/daily-routine-cards-2026-09-08/",
    import.meta.url,
  );
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    new URL("source-backed-encrypted-roundtrip.json", outputDirectory),
    JSON.stringify(result, null, 2),
  );
});
