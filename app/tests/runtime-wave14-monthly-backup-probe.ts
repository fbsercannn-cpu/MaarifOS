import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
  BackupService,
  IndexedDbDataStore,
  canonicalJson,
  normalizeClassroomSchedule,
  sha256Hex,
} from "../src/core/index.ts";
import {
  TEACHER_MONTHLY_PROGRAM_CRITERIA,
  TEACHER_MONTHLY_TEACHER_CRITERIA,
  createTeacherOwnedPlanGraph,
  loadTeacherOwnedPlanGraph,
  recordTeacherMonthlyEvaluation,
  reviewTeacherMonthlyCarry,
} from "../src/features/planning/teacher-owned-plan-service.ts";

async function runWave14MonthlyBackupProbe() {
  const source = new IndexedDbDataStore({
    databaseName: `maarifos-wave14-source-${crypto.randomUUID()}`,
  });
  const target = new IndexedDbDataStore({
    databaseName: `maarifos-wave14-target-${crypto.randomUUID()}`,
  });
  const academicYearId = "00000000-0000-4000-8000-000000001401";
  const classroomId = "00000000-0000-4000-8000-000000001402";
  const base = {
    createdAt: "2026-09-01T06:00:00.000Z",
    updatedAt: "2026-09-01T06:00:00.000Z",
    civilDate: "2026-09-01",
    deletedAt: null,
  } as const;
  try {
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "settings"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: academicYearId,
          name: "2026–2027 Kurgu Eğitim Yılı",
          startDate: "2026-09-01",
          endDate: "2027-08-31",
          status: "active",
          schemaVersion: 1,
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: classroomId,
          academicYearId,
          name: "Dalga 14 Yedek Sınıfı",
          schemaVersion: 2,
          curriculumProfileSnapshot: {
            framework: "tymm",
            programLabel: "Türkiye Yüzyılı Maarif Modeli",
            catalogId: "tymm-2024-okul-oncesi-v1",
            sourceVersion: "2024.1",
            referenceOrigin: "teacher-declared",
            officialCatalogVerified: false,
          },
          schedule: normalizeClassroomSchedule({
            kind: "full_day",
            startTime: "08:30",
            endTime: "16:00",
          }),
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
      title: "Dalga 14 Yıllık Planı",
      periodStart: "2026-09-01",
      periodEnd: "2027-08-31",
      teacherContent: { narrative: "Kanıta dayalı aylık karar döngüsü" },
      months: [
        {
          title: "Eylül 2026 Öğretmen Planı",
          monthKey: "2026-09",
          periodStart: "2026-09-01",
          periodEnd: "2026-09-30",
          teacherContent: { narrative: "Uyum ve aidiyet" },
          weeks: [{
            title: "1–7 Eylül Haftası",
            weekKey: "2026-W36",
            periodStart: "2026-09-01",
            periodEnd: "2026-09-07",
            teacherContent: { narrative: "Karşılama ve gözlem" },
          }],
        },
        {
          title: "Ekim 2026 Öğretmen Planı",
          monthKey: "2026-10",
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          teacherContent: { narrative: "Katılım yollarını çeşitlendirme" },
          weeks: [{
            title: "1–7 Ekim Haftası",
            weekKey: "2026-W40",
            periodStart: "2026-10-01",
            periodEnd: "2026-10-07",
            teacherContent: { narrative: "Ortak üretim" },
          }],
        },
      ],
      now: new Date("2026-09-01T06:00:00.000Z"),
    });
    const evaluation = await recordTeacherMonthlyEvaluation(source, {
      monthlyPlanId: graph.months[0].monthly.id,
      expectedMonthlyUpdatedAt: graph.months[0].monthly.updatedAt,
      childEvidenceState: "insufficient-evidence",
      childNarrative: "Kanıt iki haftaya yayılmadığı için genelleme yapılmadı.",
      observationIds: [],
      curriculumLinkIds: [],
      programCriteria: TEACHER_MONTHLY_PROGRAM_CRITERIA.map(([criterionId]) => ({
        criterionId,
        status: "not-observed" as const,
      })),
      programNarrative: "Program yönünde kanıt yetersizliği görünür tutuldu.",
      teacherCriteria: TEACHER_MONTHLY_TEACHER_CRITERIA.map(([criterionId]) => ({
        criterionId,
        status: "not-observed" as const,
      })),
      teacherNarrative: "Gözlem düzeni iki haftaya yayılacak.",
      nextMonthRecommendation: "Her aktif çocuk için dengeli kanıt topla.",
      now: new Date("2026-09-30T13:00:00.000Z"),
    });
    const suggested = await loadTeacherOwnedPlanGraph(source, {
      annualPlanId: graph.annual.id,
    });
    if (!suggested) throw new Error("Öneri sonrası grafik bulunamadı.");
    const accepted = await reviewTeacherMonthlyCarry(source, {
      monthlyPlanId: suggested.months[1].monthly.id,
      expectedMonthlyUpdatedAt: suggested.months[1].monthly.updatedAt,
      expectedEvaluationId: evaluation.id,
      action: "accepted",
      teacherNote: "Öneri Ekim sınıf ihtiyacına göre düzenlendi.",
      acceptedNarrative: "Dengeli kanıt toplanacak ve katılım yolları çeşitlendirilecek.",
      now: new Date("2026-09-30T13:05:00.000Z"),
    });
    const backup = await new BackupService(source, {
      appVersion: "0.10.0-wave14",
      clock: () => new Date("2026-09-30T13:10:00.000Z"),
      civilDateProvider: () => "2026-09-30",
    }).exportBackup();
    await new BackupService(target, { appVersion: "0.10.0-wave14" }).restoreBackup(
      backup,
      { mode: "replace" },
    );
    const restored = await loadTeacherOwnedPlanGraph(target, {
      annualPlanId: graph.annual.id,
    });
    const beforeTamper = await target.readSnapshot();
    const tampered = structuredClone(backup);
    const tamperedTarget = tampered.payload.plans.find(
      (plan) => plan.id === accepted.id,
    );
    if (!tamperedTarget || typeof tamperedTarget.nextMonthDecisionContext !== "object") {
      throw new Error("Tahrif hedefi bulunamadı.");
    }
    tamperedTarget.nextMonthDecisionContext.recommendation = "Tahrif edilmiş öneri";
    tampered.manifest.payloadChecksum = await sha256Hex(canonicalJson(tampered.payload));
    let tamperRejected = false;
    try {
      await new BackupService(target, { appVersion: "0.10.0-wave14" }).restoreBackup(
        tampered,
        { mode: "replace" },
      );
    } catch {
      tamperRejected = true;
    }
    const afterTamper = await target.readSnapshot();
    return {
      restoredStatus:
        restored?.months[1].monthly.nextMonthDecisionContext?.applicationStatus ?? null,
      restoredHistoryCount:
        restored?.months[1].monthly.nextMonthDecisionContext?.reviewHistory.length ?? 0,
      restoredEvaluationId:
        restored?.months[1].monthly.nextMonthDecisionContext?.evaluationId ?? null,
      expectedEvaluationId: evaluation.id,
      tamperRejected,
      targetUnchanged: canonicalJson(beforeTamper) === canonicalJson(afterTamper),
    };
  } finally {
    source.close();
    target.close();
  }
}

const probePromise = runWave14MonthlyBackupProbe();
(globalThis as typeof globalThis & {
  __wave14MonthlyBackupProbe?: Promise<Awaited<ReturnType<typeof runWave14MonthlyBackupProbe>>>;
}).__wave14MonthlyBackupProbe = probePromise;

void probePromise.then(
  (result) => {
    const target = document.getElementById("probe-result");
    if (target) target.textContent = JSON.stringify(result);
  },
  (reason) => {
    const target = document.getElementById("probe-result");
    if (target) {
      target.textContent = `ERROR: ${reason instanceof Error ? reason.message : String(reason)}`;
    }
  },
);
