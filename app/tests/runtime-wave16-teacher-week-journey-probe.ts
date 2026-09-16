import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
  BackupService,
  IndexedDbDataStore,
  canonicalJson,
  normalizeClassroomSchedule,
  sha256Hex,
} from "../src/core/index.ts";
import { curriculumTargetsForProfile } from "../src/features/curriculum/curriculum-catalog.ts";
import { defaultTeacherOwnedDailyFlowBlockDrafts } from "../src/core/domain/teacher-owned-daily-flow.ts";
import {
  captureImmutableRawObservation,
  confirmObservationCurriculumLink,
  createPlanWithActivity,
} from "../src/features/evidence/evidence-flow.ts";
import {
  closeTeacherDay,
  loadTeacherDayClosureWorkspace,
  resolveTeacherDayCarryForwardLifecycle,
} from "../src/features/day-closure/teacher-day-closure.ts";
import {
  buildStandaloneTeacherOwnedPlanParagraphs,
  generateStandaloneTeacherOwnedPlanExportFile,
  loadStandaloneTeacherOwnedDailyPlans,
} from "../src/features/planning/teacher-owned-plan-document.ts";
import {
  createTeacherOwnedPlanGraph,
  loadTeacherOwnedPlanGraph,
  recordTeacherWeeklyEvaluation,
} from "../src/features/planning/teacher-owned-plan-service.ts";

const days = [
  "2026-09-07",
  "2026-09-08",
  "2026-09-09",
  "2026-09-10",
  "2026-09-11",
] as const;

function assertProbe(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Dalga 16 kabul kapısı: ${message}`);
}

async function runWave16TeacherWeekJourneyProbe() {
  const source = new IndexedDbDataStore({
    databaseName: `maarifos-wave16-source-${crypto.randomUUID()}`,
  });
  const target = new IndexedDbDataStore({
    databaseName: `maarifos-wave16-target-${crypto.randomUUID()}`,
  });
  const academicYearId = "00000000-0000-4000-8000-000000001601";
  const classroomId = "00000000-0000-4000-8000-000000001602";
  const studentIds = [
    "00000000-0000-4000-8000-000000001603",
    "00000000-0000-4000-8000-000000001604",
    "00000000-0000-4000-8000-000000001605",
  ] as const;
  const recordBase = {
    createdAt: "2026-09-07T05:20:00.000Z",
    updatedAt: "2026-09-07T05:20:00.000Z",
    civilDate: days[0],
    deletedAt: null,
    schemaVersion: 1,
  } as const;
  const base = { ...recordBase, academicYearId, classroomId } as const;
  try {
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "students", "settings"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...recordBase,
          id: academicYearId,
          name: "2026–2027 Kurgu Eğitim Yılı",
          startDate: days[0],
          endDate: "2027-06-25",
          status: "active",
        }]);
        await transaction.putMany("classrooms", [{
          ...recordBase,
          id: classroomId,
          academicYearId,
          name: "Kurgu Güneş Sınıfı",
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
        await transaction.putMany("students", studentIds.map((id, index) => ({
          ...base,
          id,
          displayName: ["Kurgu Ada", "Kurgu Bora", "Kurgu Cem"][index],
          active: true,
        })));
        await transaction.putMany("settings", [{
          ...base,
          id: ACTIVE_CLASSROOM_SETTING_ID,
          settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
        }]);
      },
    );

    const graph = await createTeacherOwnedPlanGraph(source, {
      title: "2026–2027 Kurgu Öğretmen Yıllık Planı",
      periodStart: days[0],
      periodEnd: "2027-06-25",
      teacherContent: { narrative: "Kanıta dayalı öğretmen plan omurgası" },
      months: [{
        title: "Eylül 2026 Öğretmen Planı",
        monthKey: "2026-09",
        periodStart: days[0],
        periodEnd: "2026-09-30",
        teacherContent: { narrative: "Aidiyet ve güvenli katılım" },
        weeks: [
          {
            title: "7–11 Eylül Haftası",
            weekKey: "2026-W37",
            periodStart: days[0],
            periodEnd: days[4],
            teacherContent: { narrative: "Karşılama, oyun ve gözlem" },
          },
          {
            title: "14–18 Eylül Haftası",
            weekKey: "2026-W38",
            periodStart: "2026-09-14",
            periodEnd: "2026-09-18",
            teacherContent: { narrative: "Ortak düzen ve sınıf ritmi" },
          },
        ],
      }],
      now: new Date("2026-09-07T05:25:00.000Z"),
    });
    const profile = {
      framework: "tymm" as const,
      programLabel: "Türkiye Yüzyılı Maarif Modeli",
      catalogId: "tymm-2024-okul-oncesi-v1",
      sourceVersion: "2024.1",
      referenceOrigin: "teacher-declared" as const,
      officialCatalogVerified: false,
    };
    const curriculumTarget = curriculumTargetsForProfile(profile)
      .find((candidate) => candidate.referenceCode === "FAB.1") ??
      curriculumTargetsForProfile(profile)[0];
    if (!curriculumTarget) throw new Error("Kurgu program hedefi bulunamadı.");

    const dailyResults = [];
    const observationIds: string[] = [];
    const curriculumLinkIds: string[] = [];
    let carriedClosureId = "";
    let reconciledClosureId = "";
    for (let index = 0; index < days.length; index += 1) {
      const civilDate = days[index];
      const suffix = String(index + 1).padStart(2, "0");
      const daily = await createPlanWithActivity(source, {
        civilDate,
        planId: `00000000-0000-4000-8000-0000000017${suffix}`,
        planTitle: `${civilDate} Kurgu Günlük Planı`,
        activityId: `00000000-0000-4000-8000-0000000018${suffix}`,
        activityTitle: [
          "Karşılama çemberi",
          "Arkadaşlık hikâyesi",
          "Ses ve ritim araştırması",
          "Güvenli yerler haritası",
          "Haftanın izleri",
        ][index],
        startTime: "09:00",
        endTime: "09:40",
        curriculumProfile: profile,
        curriculumTargets: [curriculumTarget],
        assignmentMode: "whole-class",
        studentIds: [],
        teacherOwnedDailyFlowBlocks:
          defaultTeacherOwnedDailyFlowBlockDrafts(450),
        teacherOwnedActivityBlockKind: "teacher-activity-one",
        initialActivityStatus: "in_progress",
        now: new Date(`${civilDate}T06:00:00.000Z`),
      });
      dailyResults.push(daily);
      await source.transaction(
        "readwrite",
        ["activities", "attendanceRecords", "settings"],
        async (transaction) => {
          const activities = await transaction.getAll("activities");
          const activity = activities.find((record) => record.id === daily.activity.id);
          if (!activity) throw new Error("Kurgu etkinlik kaydı bulunamadı.");
          await transaction.putMany("activities", [{
            ...activity,
            status: "completed",
            updatedAt: `${civilDate}T12:30:00.000Z`,
          }]);
          await transaction.putMany("attendanceRecords", studentIds.map(
            (studentId, studentIndex) => ({
              ...base,
              id: `00000000-0000-4000-8000-000000${String(1900 + index * 10 + studentIndex).padStart(6, "0")}`,
              civilDate,
              studentId,
              status:
                index === 1 && studentIndex === 2
                  ? "absent"
                  : index === 2 && studentIndex === 1
                    ? "late"
                    : "present",
              createdAt: `${civilDate}T08:00:00.000Z`,
              updatedAt: `${civilDate}T08:00:00.000Z`,
            }),
          ));
          await transaction.putMany("settings", [{
            ...base,
            id: `00000000-0000-4000-8000-0000000019${suffix}`,
            civilDate,
            settingType: "attendance-day-completion",
            attendanceCompleted: true,
            createdAt: `${civilDate}T08:05:00.000Z`,
            updatedAt: `${civilDate}T08:05:00.000Z`,
          }]);
        },
      );
      const observationId = `00000000-0000-4000-8000-000000001a${suffix}`;
      observationIds.push(observationId);
      await captureImmutableRawObservation(source, {
        observationId,
        studentId: studentIds[index % studentIds.length],
        planId: daily.plan.id,
        activityId: daily.activity.id,
        rawText: `Kurgu gözlem ${index + 1}: çocuk etkinlikte seçim yaptı ve akranının önerisine yanıt verdi.`,
        observedAt: `${civilDate}T09:15:00.000Z`,
        now: new Date(`${civilDate}T09:16:00.000Z`),
      });
      if (index !== 2) {
        const link = await confirmObservationCurriculumLink(source, {
          observationId,
          framework: profile.framework,
          catalogId: profile.catalogId,
          sourceVersion: profile.sourceVersion,
          referenceCode: curriculumTarget.referenceCode,
          referenceTitle: curriculumTarget.referenceTitle,
          referenceOrigin: profile.referenceOrigin,
          officialCatalogVerified: profile.officialCatalogVerified,
          plannedTargetId: curriculumTarget.id,
          now: new Date(`${civilDate}T10:00:00.000Z`),
        });
        curriculumLinkIds.push(link.id);
      }
      const closure = await closeTeacherDay(source, {
        civilDate,
        nextDayNote:
          index === 2
            ? "Program bağlantısını ertesi gün kanıtı yeniden okuyarak tamamla."
            : "",
        now: new Date(`${civilDate}T13:30:00.000Z`),
      });
      if (index === 2) carriedClosureId = closure.id;

      if (index === 3) {
        const link = await confirmObservationCurriculumLink(source, {
          observationId: observationIds[2],
          framework: profile.framework,
          catalogId: profile.catalogId,
          sourceVersion: profile.sourceVersion,
          referenceCode: curriculumTarget.referenceCode,
          referenceTitle: curriculumTarget.referenceTitle,
          referenceOrigin: profile.referenceOrigin,
          officialCatalogVerified: profile.officialCatalogVerified,
          plannedTargetId: curriculumTarget.id,
          now: new Date(`${civilDate}T07:00:00.000Z`),
        });
        curriculumLinkIds.push(link.id);
        const reconciled = await closeTeacherDay(source, {
          civilDate: days[2],
          nextDayNote: "",
          now: new Date(`${civilDate}T07:05:00.000Z`),
        });
        reconciledClosureId = reconciled.id;
      }
    }

    const sourceWeek = graph.months[0].weeks[0];
    const evaluation = await recordTeacherWeeklyEvaluation(source, {
      weeklyPlanId: sourceWeek.id,
      expectedWeeklyUpdatedAt: sourceWeek.updatedAt,
      reflection:
        "Çocukların seçim yapabildiği küçük grup düzeni katılımı güçlendirdi; geçişlerde görsel destek korunacak.",
      evidenceSummary:
        "Beş günün değişmez gözlemleri ve öğretmen-onaylı program bağları aynı plan zincirinde doğrulandı.",
      observationIds,
      nextPlanDecision: "adapt",
      now: new Date("2026-09-11T13:45:00.000Z"),
    });
    const loaded = await loadTeacherOwnedPlanGraph(source, {
      annualPlanId: graph.annual.id,
    });
    if (!loaded) throw new Error("Kurgu öğretmen grafiği yeniden yüklenemedi.");
    const dailyExports = await loadStandaloneTeacherOwnedDailyPlans(source, loaded);
    const documentText = buildStandaloneTeacherOwnedPlanParagraphs(
      loaded,
      dailyExports,
      { includeAuditAppendix: true },
    ).map((paragraph) => paragraph.text).join("\n");
    const [pdfFile, wordFile] = await Promise.all([
      generateStandaloneTeacherOwnedPlanExportFile(loaded, source, "pdf"),
      generateStandaloneTeacherOwnedPlanExportFile(loaded, source, "word"),
    ]);
    const backupService = new BackupService(source, {
      appVersion: "0.10.0-wave16",
      clock: () => new Date("2026-09-11T14:00:00.000Z"),
      civilDateProvider: () => days[4],
    });
    const encrypted = await backupService.exportEncryptedBackup(
      "Kurgu-Wave16-Backup!",
    );
    const plainBackup = await backupService.exportBackup();
    const restoreService = new BackupService(target, {
      appVersion: "0.10.0-wave16",
    });
    const restoreReport = await restoreService.restoreEncryptedBackup(
      encrypted,
      "Kurgu-Wave16-Backup!",
      { mode: "replace", createRecoverySnapshot: false },
    );
    const targetBeforeTamper = await target.readSnapshot();
    const weeklyLinkTamper = structuredClone(plainBackup);
    const tamperedWeekly = weeklyLinkTamper.payload.plans.find(
      (record) => record.id === sourceWeek.id,
    );
    const tamperedEvaluation = Array.isArray(tamperedWeekly?.weeklyEvaluations)
      ? tamperedWeekly.weeklyEvaluations[0]
      : null;
    if (
      !tamperedEvaluation ||
      typeof tamperedEvaluation !== "object" ||
      !Array.isArray(tamperedEvaluation.curriculumLinkIds)
    ) {
      throw new Error("Kurgu haftalık program bağı tahrif testi hazırlanamadı.");
    }
    tamperedEvaluation.curriculumLinkIds[0] =
      "00000000-0000-4000-8000-000000001aff";
    weeklyLinkTamper.manifest.payloadChecksum = await sha256Hex(
      canonicalJson(weeklyLinkTamper.payload),
    );
    let weeklyLinkTamperError = "";
    try {
      await restoreService.parseAndVerifyBackup(weeklyLinkTamper);
    } catch (error) {
      weeklyLinkTamperError = error instanceof Error ? error.message : String(error);
    }
    const missingClosureTamper = structuredClone(plainBackup);
    missingClosureTamper.payload.settings = missingClosureTamper.payload.settings.filter(
      (record) =>
        record.settingType !== "teacher-day-closure" || record.civilDate !== days[0],
    );
    missingClosureTamper.manifest.entityCounts.settings =
      missingClosureTamper.payload.settings.length;
    missingClosureTamper.manifest.payloadChecksum = await sha256Hex(
      canonicalJson(missingClosureTamper.payload),
    );
    let missingClosureTamperError = "";
    try {
      await restoreService.parseAndVerifyBackup(missingClosureTamper);
    } catch (error) {
      missingClosureTamperError = error instanceof Error ? error.message : String(error);
    }
    const closureFingerprintTamper = structuredClone(plainBackup);
    const fingerprintClosure = closureFingerprintTamper.payload.settings.find(
      (record) =>
        record.settingType === "teacher-day-closure" &&
        record.civilDate === days[0] &&
        record.closureStatus === "complete",
    );
    if (!fingerprintClosure) {
      throw new Error("Kurgu gün kapanışı parmak izi tahrif testi hazırlanamadı.");
    }
    fingerprintClosure.evidenceFingerprint = `sha256:${"f".repeat(64)}`;
    closureFingerprintTamper.manifest.payloadChecksum = await sha256Hex(
      canonicalJson(closureFingerprintTamper.payload),
    );
    let closureFingerprintTamperError = "";
    try {
      await restoreService.parseAndVerifyBackup(closureFingerprintTamper);
    } catch (error) {
      closureFingerprintTamperError = error instanceof Error ? error.message : String(error);
    }
    const targetAfterTamper = await target.readSnapshot();
    const restoredSnapshot = await target.readSnapshot();
    const restoredGraph = await loadTeacherOwnedPlanGraph(target, {
      annualPlanId: graph.annual.id,
    });
    const sourceClosures = await Promise.all(days.map((civilDate) =>
      loadTeacherDayClosureWorkspace(source, { civilDate })
    ));
    const restoredClosures = await Promise.all(days.map((civilDate) =>
      loadTeacherDayClosureWorkspace(target, { civilDate })
    ));
    const carryLifecycle = resolveTeacherDayCarryForwardLifecycle(
      restoredSnapshot,
      days[4],
    );
    const exactIds = (records: readonly { id: string }[]) =>
      records.map((record) => record.id).sort((left, right) => left.localeCompare(right));
    const exactRecords = <T extends { id: string }>(records: readonly T[]) =>
      [...records].sort((left, right) => left.id.localeCompare(right.id));
    const sourceSnapshot = await source.readSnapshot();
    const sourceProjection = {
      academicYears: exactRecords(sourceSnapshot.academicYears),
      classrooms: exactRecords(sourceSnapshot.classrooms),
      students: exactRecords(sourceSnapshot.students),
      plans: exactRecords(sourceSnapshot.plans),
      activities: exactRecords(sourceSnapshot.activities),
      observations: exactRecords(sourceSnapshot.observations),
      links: exactRecords(sourceSnapshot.evidenceCurriculumLinks),
      attendance: exactRecords(sourceSnapshot.attendanceRecords),
      settings: exactRecords(sourceSnapshot.settings),
      closureIds: exactIds(sourceSnapshot.settings.filter(
        (record) => record.settingType === "teacher-day-closure",
      )),
    };
    const restoredProjection = {
      academicYears: exactRecords(restoredSnapshot.academicYears),
      classrooms: exactRecords(restoredSnapshot.classrooms),
      students: exactRecords(restoredSnapshot.students),
      plans: exactRecords(restoredSnapshot.plans),
      activities: exactRecords(restoredSnapshot.activities),
      observations: exactRecords(restoredSnapshot.observations),
      links: exactRecords(restoredSnapshot.evidenceCurriculumLinks),
      attendance: exactRecords(restoredSnapshot.attendanceRecords),
      settings: exactRecords(restoredSnapshot.settings),
      closureIds: exactIds(restoredSnapshot.settings.filter(
        (record) => record.settingType === "teacher-day-closure",
      )),
    };
    const postClosureWrites = restoredClosures.map((workspace) => {
      const closureTime = workspace.latestClosure?.closedAt ?? "";
      const dailyPlanIds = new Set(restoredSnapshot.plans.filter(
        (record) => record.planType === "daily" && record.civilDate === workspace.civilDate,
      ).map((record) => record.id));
      const observationIdsForDay = new Set(restoredSnapshot.observations.filter(
        (record) => record.civilDate === workspace.civilDate,
      ).map((record) => record.id));
      return [
        ...restoredSnapshot.attendanceRecords
          .filter((record) => record.civilDate === workspace.civilDate)
          .map((record) => ({ collection: "attendance", record })),
        ...restoredSnapshot.plans
          .filter((record) => dailyPlanIds.has(record.id))
          .map((record) => ({ collection: "plans", record })),
        ...restoredSnapshot.activities
          .filter((record) => typeof record.planId === "string" && dailyPlanIds.has(record.planId))
          .map((record) => ({ collection: "activities", record })),
        ...restoredSnapshot.observations
          .filter((record) => observationIdsForDay.has(record.id))
          .map((record) => ({ collection: "observations", record })),
        ...restoredSnapshot.evidenceCurriculumLinks
          .filter((record) => typeof record.observationId === "string" && observationIdsForDay.has(record.observationId))
          .map((record) => ({ collection: "links", record })),
        ...restoredSnapshot.settings
          .filter((record) => record.settingType === "attendance-day-completion" && record.civilDate === workspace.civilDate)
          .map((record) => ({ collection: "settings", record })),
      ].filter(({ record }) => record.updatedAt > closureTime)
        .map(({ collection, record }) => ({ collection, id: record.id, updatedAt: record.updatedAt }));
    });
    const closedDayCount = restoredClosures.filter(
      (workspace) => workspace.status === "closed" &&
        workspace.latestClosure?.closureStatus === "complete",
    ).length;
    const documentDailyIdCount = dailyExports.filter((daily) =>
      documentText.includes(daily.planId) &&
      daily.activities.every((activity) => documentText.includes(activity.id))
    ).length;
    const exactProjectionRestored =
      canonicalJson(sourceProjection) === canonicalJson(restoredProjection);
    const pdfHeader = new TextDecoder().decode(pdfFile.bytes.slice(0, 4));
    const wordHeader = Array.from(wordFile.bytes.slice(0, 2));

    assertProbe(sourceSnapshot.attendanceRecords.length === 15, "15 yoklama kaydı korunmadı.");
    assertProbe(dailyResults.length === 5, "beş günlük plan oluşmadı.");
    assertProbe(sourceSnapshot.activities.length === 5, "beş gerçek etkinlik oluşmadı.");
    assertProbe(observationIds.length === 5, "beş değişmez gözlem oluşmadı.");
    assertProbe(curriculumLinkIds.length === 5, "beş öğretmen-onaylı program bağı oluşmadı.");
    assertProbe(sourceProjection.closureIds.length === 6, "taşıma ve uzlaştırma dahil altı kapanış korunmadı.");
    assertProbe(closedDayCount === 5, "restore sonrası beş günün tamamı doğrulanmış kapalı değil.");
    assertProbe(sourceProjection.closureIds.includes(carriedClosureId), "taşınmış kapanış geçmişi kayboldu.");
    assertProbe(sourceProjection.closureIds.includes(reconciledClosureId), "geçmiş gün uzlaştırma kapanışı kayboldu.");
    assertProbe(carryLifecycle.some((item) => item.state === "resolved"), "taşınan iş çözüm zinciri korunmadı.");
    assertProbe(evaluation.observationIds.length === 5, "haftalık değerlendirme beş gözlemi taşımıyor.");
    assertProbe((evaluation.curriculumLinkIds?.length ?? 0) === 5, "haftalık değerlendirme beş program bağını taşımıyor.");
    assertProbe(
      restoredGraph?.months[0].weeks[1].nextPlanDecisionContext?.applicationStatus ===
        "pending-teacher-review",
      "sonraki hafta kararı öğretmen onayı bekleyen kuyrukta değil.",
    );
    assertProbe(documentDailyIdCount === 5, "belge beş günlük plan ve etkinlik kimliğini taşımıyor.");
    assertProbe(pdfHeader === "%PDF", "gerçek PDF baytı üretilemedi.");
    assertProbe(wordHeader[0] === 0x50 && wordHeader[1] === 0x4b, "gerçek DOCX ZIP baytı üretilemedi.");
    assertProbe(exactProjectionRestored, "restore sonrası kanonik kayıt içeriği byte-anlamında eşleşmiyor.");
    assertProbe(
      weeklyLinkTamperError.includes("program bağı"),
      "haftalık değerlendirme program bağı tahrifi reddedilmedi.",
    );
    assertProbe(
      missingClosureTamperError.includes("gün kapanışı eksik"),
      "haftalık değerlendirmeden gün kapanışı silme tahrifi reddedilmedi.",
    );
    assertProbe(
      closureFingerprintTamperError.includes("kaynak kanıtla uyuşmuyor"),
      "gün kapanışı semantik parmak izi tahrifi reddedilmedi.",
    );
    assertProbe(
      canonicalJson(targetBeforeTamper) === canonicalJson(targetAfterTamper),
      "reddedilen tahrif hedef veriyi değiştirdi.",
    );

    return {
      status: "PASS",
      attendanceCount: sourceSnapshot.attendanceRecords.length,
      dailyPlanCount: dailyResults.length,
      activityCount: sourceSnapshot.activities.length,
      observationCount: observationIds.length,
      curriculumLinkCount: curriculumLinkIds.length,
      closureCount: sourceProjection.closureIds.length,
      sourceClosureStates: sourceClosures.map((workspace) => ({
        civilDate: workspace.civilDate,
        status: workspace.status,
        closureStatus: workspace.latestClosure?.closureStatus ?? null,
        storedFingerprint: workspace.latestClosure?.evidenceFingerprint ?? null,
        currentFingerprint: workspace.evidenceFingerprint,
      })),
      closureStates: restoredClosures.map((workspace) => ({
        civilDate: workspace.civilDate,
        status: workspace.status,
        closureStatus: workspace.latestClosure?.closureStatus ?? null,
        issues: workspace.issues.map((issue) => issue.code),
        storedFingerprint: workspace.latestClosure?.evidenceFingerprint ?? null,
        currentFingerprint: workspace.evidenceFingerprint,
      })),
      postClosureWrites,
      closedDayCount,
      carriedClosurePreserved: sourceProjection.closureIds.includes(carriedClosureId),
      reconciledClosurePreserved: sourceProjection.closureIds.includes(reconciledClosureId),
      resolvedCarryCount: carryLifecycle.filter((item) => item.state === "resolved").length,
      weeklyEvaluationId: evaluation.id,
      weeklyEvaluationObservationCount: evaluation.observationIds.length,
      weeklyEvaluationLinkCount: evaluation.curriculumLinkIds?.length ?? 0,
      targetWeekStatus:
        restoredGraph?.months[0].weeks[1].nextPlanDecisionContext?.applicationStatus ?? null,
      documentDailyIdCount,
      pdfByteLength: pdfFile.bytes.byteLength,
      wordByteLength: wordFile.bytes.byteLength,
      encryptedFormat: encrypted.format,
      restoreInserted: restoreReport.inserted,
      exactProjectionRestored,
      weeklyLinkTamperRejected: true,
      missingClosureTamperRejected: true,
      closureFingerprintTamperRejected: true,
      rejectedTamperLeftTargetUnchanged: true,
    };
  } finally {
    source.close();
    target.close();
  }
}

const probePromise = runWave16TeacherWeekJourneyProbe();
(globalThis as typeof globalThis & {
  __wave16TeacherWeekJourneyProbe?: Promise<Awaited<ReturnType<typeof runWave16TeacherWeekJourneyProbe>>>;
}).__wave16TeacherWeekJourneyProbe = probePromise;

void probePromise.then(
  (result) => {
    const target = document.getElementById("probe-result");
    if (target) target.textContent = JSON.stringify(result, null, 2);
  },
  (reason) => {
    const target = document.getElementById("probe-result");
    if (target) {
      target.textContent = `ERROR: ${reason instanceof Error ? reason.message : String(reason)}`;
    }
  },
);
