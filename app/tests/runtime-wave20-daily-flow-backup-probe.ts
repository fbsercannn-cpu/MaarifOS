import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
  BackupService,
  IndexedDbDataStore,
  canonicalJson,
  normalizeClassroomSchedule,
  sha256Hex,
} from "../src/core/index.ts";
import { defaultTeacherOwnedDailyFlowBlockDrafts } from "../src/core/domain/teacher-owned-daily-flow.ts";
import { curriculumTargetsForProfile } from "../src/features/curriculum/curriculum-catalog.ts";
import {
  CURRICULUM_PROGRAM_LABELS,
  createPlanWithActivity,
} from "../src/features/evidence/evidence-flow.ts";
import {
  createTeacherOwnedPlanGraph,
  updateTeacherOwnedDailyFlow,
} from "../src/features/planning/teacher-owned-plan-service.ts";

function assertProbe(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Dalga 20 kabul kapısı: ${message}`);
}

async function runProbe() {
  const source = new IndexedDbDataStore({
    databaseName: `maarifos-wave20-source-${crypto.randomUUID()}`,
  });
  const target = new IndexedDbDataStore({
    databaseName: `maarifos-wave20-target-${crypto.randomUUID()}`,
  });
  const legacyTarget = new IndexedDbDataStore({
    databaseName: `maarifos-wave20-legacy-${crypto.randomUUID()}`,
  });
  const academicYearId = "00000000-0000-4000-8000-000000002001";
  const classroomId = "00000000-0000-4000-8000-000000002002";
  const studentId = "00000000-0000-4000-8000-000000002003";
  const dailyPlanId = "00000000-0000-4000-8000-000000002004";
  const activityId = "00000000-0000-4000-8000-000000002005";
  const profile = {
    framework: "tymm" as const,
    programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
    catalogId: "tymm-2024-okul-oncesi-v1",
    sourceVersion: "2024.1",
    referenceOrigin: "teacher-declared" as const,
    officialCatalogVerified: false,
  };
  const targetEntry = curriculumTargetsForProfile(profile)
    .find((candidate) => candidate.referenceCode === "FAB.1");
  if (!targetEntry) throw new Error("Kurgu program hedefi bulunamadı.");
  const base = {
    createdAt: "2026-09-01T06:00:00.000Z",
    updatedAt: "2026-09-01T06:00:00.000Z",
    civilDate: "2026-09-01",
    deletedAt: null,
  };

  try {
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "students", "settings"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: academicYearId,
          name: "2026–2027 Eğitim Yılı",
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
          curriculumProfileSnapshot: profile,
          schedule: normalizeClassroomSchedule({
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
          schemaVersion: 1,
        }]);
        await transaction.putMany("settings", [{
          ...base,
          id: ACTIVE_CLASSROOM_SETTING_ID,
          settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId,
          classroomId,
          schemaVersion: 1,
        }]);
      },
    );

    const graph = await createTeacherOwnedPlanGraph(source, {
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
    const blocks = defaultTeacherOwnedDailyFlowBlockDrafts(240).map(
      (block, index) => ({
        ...block,
        teacherNote: index === 3 ? "Çocukların seçimlerini görünür tut." : "",
      }),
    );
    const daily = await createPlanWithActivity(source, {
      civilDate: "2026-09-08",
      planId: dailyPlanId,
      planTitle: "8 Eylül Öğretmen Günlük Planı",
      activityId,
      activityTitle: "Sınıf topluluğu oyunu",
      startTime: "09:00",
      endTime: "09:40",
      curriculumProfile: profile,
      curriculumTargets: [targetEntry],
      assignmentMode: "selected-students",
      studentIds: [studentId],
      teacherOwnedDailyFlowBlocks: blocks,
      teacherOwnedActivityBlockKind: "teacher-activity-one",
      now: new Date("2026-09-08T06:00:00.000Z"),
    });
    const firstFlow = daily.plan.teacherOwnedDailyFlow;
    assertProbe(Boolean(firstFlow), "öğretmen günlük akışı oluşmadı");
    const updated = await updateTeacherOwnedDailyFlow(source, {
      planId: dailyPlanId,
      expectedUpdatedAt: daily.plan.updatedAt,
      blocks: firstFlow.blocks.map((block, index) => ({
        id: block.id,
        kind: block.kind,
        title: index === 3 ? "Çocukların kurduğu gölge oyunu" : block.title,
        status: block.status,
        durationMinutes: index === 3
          ? 40
          : index === 4
            ? 8
            : block.durationMinutes,
        transitionNote: block.transitionNote,
        teacherNote: index === 3 ? "Üç rol seçeneğini görünür tut." : block.teacherNote,
      })),
      now: new Date("2026-09-08T06:05:00.000Z"),
    });
    const backup = await new BackupService(source, {
      appVersion: "0.10.0-wave20",
      clock: () => new Date("2026-09-09T06:00:00.000Z"),
      civilDateProvider: () => "2026-09-09",
    }).exportBackup();
    await new BackupService(target, {
      appVersion: "0.10.0-wave20",
    }).restoreBackup(backup, {
      mode: "replace",
      createRecoverySnapshot: false,
    });
    const restoredSnapshot = await target.readSnapshot();
    const restoredDaily = restoredSnapshot.plans.find((plan) => plan.id === dailyPlanId);
    const restoredActivity = restoredSnapshot.activities.find(
      (activity) => activity.id === activityId,
    );
    const beforeTamper = canonicalJson(restoredSnapshot);

    const tampered = structuredClone(backup);
    const tamperedDaily = tampered.payload.plans.find((plan) => plan.id === dailyPlanId);
    assertProbe(Boolean(tamperedDaily?.teacherOwnedDailyFlow), "tahrif kaynağı bulunamadı");
    tamperedDaily.teacherOwnedDailyFlow.blocks[1].order = 1;
    tampered.manifest.payloadChecksum = await sha256Hex(canonicalJson(tampered.payload));
    let tamperError = "";
    try {
      await new BackupService(target, {
        appVersion: "0.10.0-wave20",
      }).restoreBackup(tampered, {
        mode: "replace",
        createRecoverySnapshot: false,
      });
    } catch (error) {
      tamperError = error instanceof Error ? error.message : String(error);
    }

    const legacy = structuredClone(backup);
    const legacyDaily = legacy.payload.plans.find((plan) => plan.id === dailyPlanId);
    assertProbe(Boolean(legacyDaily), "eski günlük plan kaynağı bulunamadı");
    delete legacyDaily.teacherOwnedDailyFlow;
    const legacyActivity = legacy.payload.activities.find(
      (activity) => activity.planId === dailyPlanId,
    );
    if (legacyActivity) delete legacyActivity.teacherOwnedFlowBlockId;
    legacy.manifest.payloadChecksum = await sha256Hex(canonicalJson(legacy.payload));
    await new BackupService(legacyTarget, {
      appVersion: "0.10.0-wave20",
    }).restoreBackup(legacy, {
      mode: "replace",
      createRecoverySnapshot: false,
    });
    const legacyRestored = (await legacyTarget.readSnapshot()).plans.find(
      (plan) => plan.id === dailyPlanId,
    );
    const targetUnchanged = canonicalJson(await target.readSnapshot()) === beforeTamper;

    assertProbe(restoredDaily?.teacherOwnedDailyFlow?.revisionNumber === 2, "revizyon geri yüklenmedi");
    assertProbe(restoredDaily.teacherOwnedDailyFlow.blocks.length === 10, "10 bölüm korunmadı");
    assertProbe(
      restoredDaily.teacherOwnedDailyFlow.authorshipConfirmation.confirmationMethod ===
        "teacher-reviewed",
      "öğretmen onayı korunmadı",
    );
    assertProbe(
      canonicalJson(restoredDaily.teacherOwnedDailyFlow) ===
        canonicalJson(updated.teacherOwnedDailyFlow),
      "akış byte-anlamlı eşitlikle geri yüklenmedi",
    );
    assertProbe(
      restoredSnapshot.activities.filter((activity) => activity.planId === dailyPlanId).length === 1,
      "tek etkinlik ilkesi bozuldu",
    );
    assertProbe(
      restoredActivity?.teacherOwnedFlowBlockId ===
        restoredDaily.teacherOwnedDailyFlow.blocks[3].id,
      "etkinlik-akış bölümü bağı geri yüklenmedi",
    );
    assertProbe(tamperError.length > 0 && targetUnchanged, "tahrif fail-closed kalmadı");
    assertProbe(
      legacyRestored?.id === dailyPlanId && legacyRestored.teacherOwnedDailyFlow === undefined,
      "eski tek-etkinlik planı uydurma akış olmadan korunmadı",
    );

    return {
      status: "PASS",
      graphIds: [graph.annual.id, graph.months[0].monthly.id, graph.months[0].weeks[0].id],
      flowBlockCount: restoredDaily.teacherOwnedDailyFlow.blocks.length,
      revisionNumber: restoredDaily.teacherOwnedDailyFlow.revisionNumber,
      authorshipConfirmation:
        restoredDaily.teacherOwnedDailyFlow.authorshipConfirmation.confirmationMethod,
      activityCount: restoredSnapshot.activities.filter(
        (activity) => activity.planId === dailyPlanId,
      ).length,
      activityFlowBlockLinked: true,
      tamperRejected: tamperError.length > 0,
      targetUnchanged,
      legacyPreserved: legacyRestored?.teacherOwnedDailyFlow === undefined,
    };
  } finally {
    source.close();
    target.close();
    legacyTarget.close();
  }
}

const output = document.querySelector<HTMLPreElement>("#probe-result");
runProbe()
  .then((result) => {
    if (output) output.textContent = JSON.stringify(result, null, 2);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    if (output) output.textContent = JSON.stringify({ status: "FAIL", message }, null, 2);
    throw error;
  });
