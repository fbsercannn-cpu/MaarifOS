import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { canonicalJson } from "../../src/core/backup/canonical-json";
import type { CollectionName } from "../../src/core/domain/model";
import type {
  DataTransaction,
  LocalDataStore,
  TransactionMode,
} from "../../src/core/repository/contracts";

test("kanonik JSON anahtar sırasından bağımsızdır", () => {
  expect(canonicalJson({ z: 1, a: { y: 2, b: 3 } })).toBe(
    canonicalJson({ a: { b: 3, y: 2 }, z: 1 }),
  );
  expect(() => canonicalJson({ invalid: Number.NaN })).toThrow(
    "sonlu olmayan sayı",
  );
});

test("sürümlü yedek üretir ve değiştirilmiş içeriği reddeder", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const databaseName = `maarifos-test-backup-${crypto.randomUUID()}`;
    const store = new core.IndexedDbDataStore({ databaseName });
    const record = {
      id: "00000000-0000-4000-8000-000000000001",
      createdAt: "2026-07-22T06:00:00.000Z",
      updatedAt: "2026-07-22T06:00:00.000Z",
      civilDate: "2026-07-22",
      schemaVersion: 1,
      displayName: "Test Kaydı A",
    };
    await store.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [record]),
    );
    const service = new core.BackupService(store, {
      appVersion: "0.1.0-test",
      clock: () => new Date("2026-07-22T09:30:00.000Z"),
      civilDateProvider: () => "2026-07-22",
    });
    const backup = await service.exportBackup();
    const verified = await service.parseAndVerifyBackup(service.serializeBackup(backup));
    const legacyV1 = structuredClone(backup);
    legacyV1.manifest.dataSchemaVersion = 1;
    delete legacyV1.payload.evidenceCurriculumLinks;
    delete legacyV1.manifest.entityCounts.evidenceCurriculumLinks;
    delete legacyV1.payload.calendarEntries;
    delete legacyV1.manifest.entityCounts.calendarEntries;
    delete legacyV1.payload.externalFeedback;
    delete legacyV1.manifest.entityCounts.externalFeedback;
    delete legacyV1.payload.valueEvidenceLinks;
    delete legacyV1.manifest.entityCounts.valueEvidenceLinks;
    legacyV1.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(legacyV1.payload),
    );
    const upgradedLegacy = await service.parseAndVerifyBackup(legacyV1);
    const legacyV2 = structuredClone(backup);
    legacyV2.manifest.dataSchemaVersion = 2;
    delete legacyV2.payload.calendarEntries;
    delete legacyV2.manifest.entityCounts.calendarEntries;
    delete legacyV2.payload.externalFeedback;
    delete legacyV2.manifest.entityCounts.externalFeedback;
    delete legacyV2.payload.valueEvidenceLinks;
    delete legacyV2.manifest.entityCounts.valueEvidenceLinks;
    delete legacyV2.payload.students[0].firstName;
    delete legacyV2.payload.students[0].lastName;
    legacyV2.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(legacyV2.payload),
    );
    const upgradedV2 = await service.parseAndVerifyBackup(legacyV2);
    const legacyV3 = structuredClone(backup);
    legacyV3.manifest.dataSchemaVersion = 3;
    delete legacyV3.payload.calendarEntries;
    delete legacyV3.manifest.entityCounts.calendarEntries;
    delete legacyV3.payload.externalFeedback;
    delete legacyV3.manifest.entityCounts.externalFeedback;
    delete legacyV3.payload.valueEvidenceLinks;
    delete legacyV3.manifest.entityCounts.valueEvidenceLinks;
    legacyV3.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(legacyV3.payload),
    );
    const upgradedV3 = await service.parseAndVerifyBackup(legacyV3);
    const legacyV4 = structuredClone(backup);
    legacyV4.manifest.dataSchemaVersion = 4;
    delete legacyV4.payload.valueEvidenceLinks;
    delete legacyV4.manifest.entityCounts.valueEvidenceLinks;
    legacyV4.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(legacyV4.payload),
    );
    const upgradedV4 = await service.parseAndVerifyBackup(legacyV4);
    const corrupted = structuredClone(backup);
    corrupted.payload.students[0].displayName = "Değiştirilmiş Kayıt";
    let corruptionError = "";
    try {
      await service.parseAndVerifyBackup(corrupted);
    } catch (error) {
      corruptionError = error instanceof Error ? error.message : String(error);
    }
    store.close();
    return {
      manifest: verified.manifest,
      studentCount: verified.payload.students.length,
      upgradedLegacyVersion: upgradedLegacy.manifest.dataSchemaVersion,
      upgradedLegacyLinkCount: upgradedLegacy.payload.evidenceCurriculumLinks.length,
      upgradedV2Version: upgradedV2.manifest.dataSchemaVersion,
      upgradedV2FirstName: upgradedV2.payload.students[0].firstName,
      upgradedV2LastName: upgradedV2.payload.students[0].lastName,
      upgradedV3Version: upgradedV3.manifest.dataSchemaVersion,
      upgradedV3CalendarCount: upgradedV3.payload.calendarEntries.length,
      upgradedV3FeedbackCount: upgradedV3.payload.externalFeedback.length,
      upgradedV4Version: upgradedV4.manifest.dataSchemaVersion,
      upgradedV4ValueLinkCount: upgradedV4.payload.valueEvidenceLinks.length,
      corruptionError,
    };
  });

  expect(result.manifest.format).toBe("maarifos-json");
  expect(result.manifest.backupVersion).toBe(1);
  expect(result.manifest.dataSchemaVersion).toBe(5);
  expect(result.manifest.createdAt).toBe("2026-07-22T09:30:00.000Z");
  expect(result.manifest.civilDate).toBe("2026-07-22");
  expect(result.manifest.payloadChecksum).toMatch(/^[0-9a-f]{64}$/);
  expect(result.manifest.entityCounts.students).toBe(1);
  expect(result.studentCount).toBe(1);
  expect(result.upgradedLegacyVersion).toBe(5);
  expect(result.upgradedLegacyLinkCount).toBe(0);
  expect(result.upgradedV2Version).toBe(5);
  expect(result.upgradedV2FirstName).toBe("Test Kaydı");
  expect(result.upgradedV2LastName).toBe("A");
  expect(result.upgradedV3Version).toBe(5);
  expect(result.upgradedV3CalendarCount).toBe(0);
  expect(result.upgradedV3FeedbackCount).toBe(0);
  expect(result.upgradedV4Version).toBe(5);
  expect(result.upgradedV4ValueLinkCount).toBe(0);
  expect(result.corruptionError).toContain("bütünlük kontrolünü geçemedi");
});

test("takvim ve haricî AI geri bildirimi V5 yedekte kayıpsız döner", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const today = await import("/src/features/today/today-data.ts");
    const calendar = await import(
      "/src/features/calendar/academic-calendar.ts"
    );
    const dossier = await import(
      "/src/features/reports/student-dossier.ts"
    );
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-v4-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-v4-target-${crypto.randomUUID()}`,
    });
    await today.saveClassroomConfiguration(source, {
      academicYear: {
        id: "00000000-0000-4000-8000-000000000051",
        name: "2026–2027 Eğitim Yılı",
        startDate: "2026-09-01",
        endDate: "2027-08-31",
      },
      classroom: {
        id: "00000000-0000-4000-8000-000000000052",
        name: "Kurgu Takvim Sınıfı",
        ageGroup: "60–72 ay",
      },
      schedule: {
        kind: "morning",
        startTime: "08:30",
        endTime: "12:30",
      },
      now: new Date("2026-09-01T06:00:00.000Z"),
    });
    const student = {
      id: "00000000-0000-4000-8000-000000000053",
      name: "Kurgu Geri Bildirim Öğrencisi",
      firstName: "Kurgu",
      lastName: "Geri Bildirim Öğrencisi",
      status: "present",
    };
    await source.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [{
        id: student.id,
        displayName: student.name,
        firstName: student.firstName,
        lastName: student.lastName,
        active: true,
        enrollmentStatus: "active",
        enrollments: [{
          id: "00000000-0000-4000-8000-000000000054",
          academicYearId: "00000000-0000-4000-8000-000000000051",
          classroomId: "00000000-0000-4000-8000-000000000052",
          startedOn: "2026-09-01",
          status: "active",
          schemaVersion: 1,
        }],
        academicYearId: "00000000-0000-4000-8000-000000000051",
        classroomId: "00000000-0000-4000-8000-000000000052",
        createdAt: "2026-09-01T06:10:00.000Z",
        updatedAt: "2026-09-01T06:10:00.000Z",
        civilDate: "2026-09-01",
        deletedAt: null,
        schemaVersion: 3,
        profileSchemaVersion: 3,
      }]),
    );
    await calendar.saveCalendarEntry(source, {
      entryType: "parent_meeting",
      title: "Veli toplantısı",
      note: "Saat 17.30",
      startDate: "2026-10-05",
      status: "planned",
      now: new Date("2026-09-01T06:20:00.000Z"),
    });
    const exportedDossier = await dossier.createStudentDossier(source, {
      studentId: student.id,
      options: {
        destination: "chatgpt",
        audience: "parent",
        identityMode: "alias",
        alias: "Öğrenci A",
        periodStart: "2026-09-01",
        periodEnd: "2027-01-22",
        includeContacts: false,
        includeAttendance: true,
        includeObservations: true,
        includePortfolio: true,
        includeExternalFeedback: false,
      },
      now: new Date("2027-01-22T07:00:00.000Z"),
    });
    await dossier.saveExternalAiFeedback(source, {
      studentId: student.id,
      provider: "chatgpt",
      audience: "parent",
      periodStart: "2026-09-01",
      periodEnd: "2027-01-22",
      feedbackText: "Tarihli kanıtlara dayalı kurgu geri bildirim.",
      teacherNote: "Öğretmen tarafından incelendi.",
      includeInTermSummary: true,
      includeInYearSummary: true,
      linkedExportPackageId: exportedDossier.exportPackageId,
      now: new Date("2027-01-23T07:00:00.000Z"),
    });
    const sourceService = new core.BackupService(source, {
      appVersion: "v4-roundtrip-test",
      clock: () => new Date("2027-01-23T08:00:00.000Z"),
      civilDateProvider: () => "2027-01-23",
    });
    const backup = await sourceService.exportBackup();
    const tampered = structuredClone(backup);
    tampered.payload.externalFeedback[0].feedbackText =
      "Hash güncellenmeden değiştirilmiş kurgu metin.";
    const canonical = await import("/src/core/backup/canonical-json.ts");
    const hashing = await import("/src/core/backup/crypto.ts");
    tampered.manifest.payloadChecksum = await hashing.sha256Hex(
      canonical.canonicalJson(tampered.payload),
    );
    let contentHashError = "";
    try {
      await sourceService.parseAndVerifyBackup(tampered);
    } catch (error) {
      contentHashError =
        error instanceof Error ? error.message : String(error);
    }
    const targetService = new core.BackupService(target, {
      appVersion: "v4-roundtrip-test",
    });
    await targetService.restoreBackup(backup, { mode: "replace" });
    const restored = await target.readSnapshot();
    source.close();
    target.close();
    return {
      version: backup.manifest.dataSchemaVersion,
      calendarTitle: restored.calendarEntries[0]?.title,
      calendarNote: restored.calendarEntries[0]?.note,
      feedbackText: restored.externalFeedback[0]?.feedbackText,
      feedbackImmutable: restored.externalFeedback[0]?.rawTextImmutable,
      feedbackHash: restored.externalFeedback[0]?.contentHash,
      termSummary: restored.externalFeedback[0]?.includeInTermSummary,
      yearSummary: restored.externalFeedback[0]?.includeInYearSummary,
      exportType: restored.exportPackages[0]?.type,
      contentHashError,
    };
  });

  expect(result.version).toBe(5);
  expect(result.calendarTitle).toBe("Veli toplantısı");
  expect(result.calendarNote).toBe("Saat 17.30");
  expect(result.feedbackText).toBe(
    "Tarihli kanıtlara dayalı kurgu geri bildirim.",
  );
  expect(result.feedbackImmutable).toBe(true);
  expect(result.feedbackHash).toMatch(/^[0-9a-f]{64}$/);
  expect(result.termSummary).toBe(true);
  expect(result.yearSummary).toBe(true);
  expect(result.exportType).toBe("student_dossier");
  expect(result.contentHashError).toContain("içerik hash doğrulamasını geçemedi");
});

test("çocuk profilinin bütün alanlarını yedekle geri yükler", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-profile-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-profile-target-${crypto.randomUUID()}`,
    });
    const profile = {
      id: "00000000-0000-4000-8000-000000000031",
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 2,
      displayName: "Kurgu Profil Öğrencisi",
      preferredName: "Kurgu",
      birthDate: "2021-03-14",
      optionalCode: "OKUL-MAVI-42",
      enrollmentDate: "2025-09-01",
      homeLanguages: "Türkçe, Almanca",
      interests: "Doğa incelemeleri ve blok oyunları",
      strengths: "Akranlarıyla iş birliği kuruyor",
      supportPreferences: "Geçişlerden önce kısa bir hatırlatma yardımcı oluyor.",
      profileSchemaVersion: 3,
    };
    await source.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [profile]),
    );

    const sourceService = new core.BackupService(source, {
      appVersion: "student-profile-test",
      clock: () => new Date("2026-09-01T09:00:00.000Z"),
      civilDateProvider: () => "2026-09-01",
    });
    const backup = await sourceService.exportBackup();
    const verified = await sourceService.parseAndVerifyBackup(
      sourceService.serializeBackup(backup),
    );
    const invalidEnrollment = structuredClone(backup);
    invalidEnrollment.payload.students[0].enrollmentDate = "2026-09-02";
    invalidEnrollment.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(invalidEnrollment.payload),
    );
    let invalidEnrollmentError = "";
    try {
      await sourceService.parseAndVerifyBackup(invalidEnrollment);
    } catch (error) {
      invalidEnrollmentError =
        error instanceof Error ? error.message : String(error);
    }
    const invalidSupport = structuredClone(backup);
    invalidSupport.payload.students[0].supportPreferences = "d".repeat(1_001);
    invalidSupport.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(invalidSupport.payload),
    );
    let invalidSupportError = "";
    try {
      await sourceService.parseAndVerifyBackup(invalidSupport);
    } catch (error) {
      invalidSupportError =
        error instanceof Error ? error.message : String(error);
    }
    const restoreReport = await new core.BackupService(target, {
      appVersion: "student-profile-test",
    }).restoreBackup(verified, { mode: "replace" });
    const restored = await target.readSnapshot();
    source.close();
    target.close();
    return {
      backupStudent: verified.payload.students[0],
      restoredStudent: restored.students[0],
      studentCount: verified.manifest.entityCounts.students,
      inserted: restoreReport.inserted,
      invalidEnrollmentError,
      invalidSupportError,
    };
  });

  const expectedProfile = {
    displayName: "Kurgu Profil Öğrencisi",
    preferredName: "Kurgu",
    birthDate: "2021-03-14",
    optionalCode: "OKUL-MAVI-42",
    enrollmentDate: "2025-09-01",
    homeLanguages: "Türkçe, Almanca",
    interests: "Doğa incelemeleri ve blok oyunları",
    strengths: "Akranlarıyla iş birliği kuruyor",
    supportPreferences: "Geçişlerden önce kısa bir hatırlatma yardımcı oluyor.",
    profileSchemaVersion: 3,
  };
  expect(result.studentCount).toBe(1);
  expect(result.inserted).toBe(1);
  expect(result.backupStudent).toMatchObject(expectedProfile);
  expect(result.restoredStudent).toMatchObject(expectedProfile);
  expect(result.invalidEnrollmentError).toContain("kayıt tarihi geçersiz");
  expect(result.invalidSupportError).toContain(
    "öğretmen desteği notu geçersiz",
  );
});

test("iki günlük yoklama geçmişini JSON yedekle geri yükler", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-attendance-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-attendance-target-${crypto.randomUUID()}`,
    });
    const studentId = "00000000-0000-4000-8000-000000000041";
    const base = {
      createdAt: "2026-07-21T06:00:00.000Z",
      updatedAt: "2026-07-21T06:00:00.000Z",
      deletedAt: null,
      schemaVersion: 1,
    };
    await source.transaction(
      "readwrite",
      ["students", "attendanceRecords"],
      async (transaction) => {
        await transaction.putMany("students", [
          { ...base, id: studentId, civilDate: "2026-07-21", displayName: "Kurgu Öğrenci" },
        ]);
        await transaction.putMany("attendanceRecords", [
          {
            ...base,
            id: "00000000-0000-4000-8000-000000000042",
            studentId,
            civilDate: "2026-07-21",
            status: "present",
          },
          {
            ...base,
            id: "00000000-0000-4000-8000-000000000043",
            studentId,
            civilDate: "2026-07-22",
            status: "absent",
            createdAt: "2026-07-22T06:00:00.000Z",
            updatedAt: "2026-07-22T06:00:00.000Z",
          },
          {
            ...base,
            id: "00000000-0000-4000-8000-000000000044",
            studentId,
            civilDate: "2026-07-22",
            status: "present",
            createdAt: "2026-07-22T05:00:00.000Z",
            updatedAt: "2026-07-22T05:00:00.000Z",
          },
        ]);
      },
    );
    const backup = await new core.BackupService(source, { appVersion: "test" }).exportBackup();
    const report = await new core.BackupService(target, { appVersion: "test" }).restoreBackup(
      backup,
      { mode: "replace" },
    );
    const restored = await target.readSnapshot();
    source.close();
    target.close();
    return { report, attendanceRecords: restored.attendanceRecords };
  });

  expect(result.report.inserted).toBe(4);
  expect(result.attendanceRecords).toHaveLength(3);
  expect(result.attendanceRecords.filter((record) => record.civilDate === "2026-07-21")).toHaveLength(1);
  expect(
    result.attendanceRecords.find(
      (record) => record.id === "00000000-0000-4000-8000-000000000043",
    )?.status,
  ).toBe("absent");
  expect(
    result.attendanceRecords.find(
      (record) => record.id === "00000000-0000-4000-8000-000000000044",
    ),
  ).toMatchObject({
    _MUKERRER_INCELE: true,
    duplicateOf: "00000000-0000-4000-8000-000000000043",
  });
});

test("yoklama olaylarını kayıpsız yedekler, N-1 kaydı okur ve bozuk olayı reddeder", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-attendance-events-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-attendance-events-target-${crypto.randomUUID()}`,
    });
    const previousTarget = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-attendance-events-n1-${crypto.randomUUID()}`,
    });
    const studentId = "00000000-0000-4000-8000-000000000341";
    const base = {
      createdAt: "2026-08-03T05:00:00.000Z",
      updatedAt: "2026-08-03T05:00:00.000Z",
      deletedAt: null,
      schemaVersion: 1,
    };
    const events = [
      core.createAttendanceEvent({
        type: "check_in",
        civilDate: "2026-08-03",
        localTime: "08:15",
        now: new Date("2026-08-03T05:15:00.000Z"),
      }),
      core.createAttendanceEvent({
        type: "early_departure",
        civilDate: "2026-08-03",
        localTime: "13:20",
        reason: "Kurgu aile bildirimi",
        teacherNote: "Kurgu öğretmen notu",
        now: new Date("2026-08-03T10:20:00.000Z"),
      }),
    ];
    await source.transaction(
      "readwrite",
      ["students", "attendanceRecords"],
      async (transaction) => {
        await transaction.putMany("students", [
          {
            ...base,
            id: studentId,
            civilDate: "2026-08-03",
            displayName: "Kurgu Yoklama Öğrencisi",
          },
        ]);
        await transaction.putMany("attendanceRecords", [
          {
            ...base,
            id: "00000000-0000-4000-8000-000000000342",
            studentId,
            civilDate: "2026-08-03",
            status: "present",
            events,
          },
          {
            ...base,
            id: "00000000-0000-4000-8000-000000000343",
            studentId,
            civilDate: "2026-08-02",
            status: "absent",
            createdAt: "2026-08-02T05:00:00.000Z",
            updatedAt: "2026-08-02T05:00:00.000Z",
          },
        ]);
      },
    );
    const sourceService = new core.BackupService(source, {
      appVersion: "attendance-events-test",
    });
    const backup = await sourceService.exportBackup();
    const report = await new core.BackupService(target, {
      appVersion: "attendance-events-test",
    }).restoreBackup(backup, { mode: "replace" });
    const restored = await target.readSnapshot();

    const previousVersion = structuredClone(backup);
    previousVersion.manifest.dataSchemaVersion = 3;
    for (const attendance of previousVersion.payload.attendanceRecords) {
      delete attendance.events;
    }
    delete previousVersion.payload.calendarEntries;
    delete previousVersion.manifest.entityCounts.calendarEntries;
    delete previousVersion.payload.externalFeedback;
    delete previousVersion.manifest.entityCounts.externalFeedback;
    delete previousVersion.payload.valueEvidenceLinks;
    delete previousVersion.manifest.entityCounts.valueEvidenceLinks;
    previousVersion.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(previousVersion.payload),
    );
    const previousReport = await new core.BackupService(previousTarget, {
      appVersion: "attendance-events-test",
    }).restoreBackup(previousVersion, { mode: "replace" });
    const restoredPrevious = await previousTarget.readSnapshot();

    const corrupted = structuredClone(backup);
    corrupted.payload.attendanceRecords[0].events[0].unknownField = true;
    corrupted.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(corrupted.payload),
    );
    let corruptedEventError = "";
    try {
      await sourceService.parseAndVerifyBackup(corrupted);
    } catch (error) {
      corruptedEventError = error instanceof Error ? error.message : String(error);
    }
    source.close();
    target.close();
    previousTarget.close();
    return {
      report,
      previousReport,
      exportedEvents: backup.payload.attendanceRecords[0].events,
      restoredEvents: restored.attendanceRecords.find(
        (record) => record.id === "00000000-0000-4000-8000-000000000342",
      )?.events,
      legacyRecord: restored.attendanceRecords.find(
        (record) => record.id === "00000000-0000-4000-8000-000000000343",
      ),
      previousAttendanceRecords: restoredPrevious.attendanceRecords,
      corruptedEventError,
    };
  });

  expect(result.report.inserted).toBe(3);
  expect(result.previousReport.inserted).toBe(3);
  expect(result.restoredEvents).toEqual(result.exportedEvents);
  expect(result.restoredEvents).toHaveLength(2);
  expect(result.legacyRecord?.events).toBeUndefined();
  expect(result.previousAttendanceRecords).toHaveLength(2);
  expect(result.previousAttendanceRecords.every((record) => record.events === undefined)).toBe(
    true,
  );
  expect(result.corruptedEventError).toContain("yoklama sözleşmesine uymuyor");
});

test("premium yıllık-aylık-haftalık-günlük grafiğini temiz geri yüklemede korur", async ({ page }) => {
  const premiumPlanSource = JSON.parse(await readFile(
    new URL("../../../premium-content/releases/tymm-6072/2026-09/content.v2.json", import.meta.url),
    "utf8",
  ));
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async (rawPack) => {
    const core = await import("/src/core/index.ts");
    const { parsePremiumContentPack } = await import(
      "/src/features/premium-plans/content-repository.ts"
    );
    const {
      installPremiumPlanBoard,
      preparePremiumDailyTemplate,
      recordPremiumWeeklyEvaluation,
      updatePremiumPlanLensPreferences,
    } = await import(
      "/src/features/premium-plans/plan-service.ts"
    );
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const catalog = await import("/src/features/curriculum/tymm-2024-catalog.ts");
    const curriculumCatalog = await import(
      "/src/features/curriculum/curriculum-catalog.ts"
    );
    const classroomDomain = await import("/src/core/domain/classroom.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-premium-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-premium-target-${crypto.randomUUID()}`,
    });
    const yearId = "00000000-0000-4000-8000-000000009701";
    const classroomId = "00000000-0000-4000-8000-000000009702";
    const studentId = "00000000-0000-4000-8000-000000009703";
    const base = {
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 1,
    };
    const profile = {
      framework: "tymm" as const,
      programLabel: evidence.CURRICULUM_PROGRAM_LABELS.tymm,
      catalogId: catalog.TYMM_2024_CATALOG_METADATA.catalogId,
      sourceVersion: catalog.TYMM_2024_CATALOG_METADATA.sourceVersion,
      referenceOrigin: "official-catalog" as const,
      officialCatalogVerified: true,
    };
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "settings", "students"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: yearId,
          name: "2026–2027 Eğitim Yılı",
          startDate: "2026-09-07",
          endDate: "2027-06-25",
          status: "active",
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: classroomId,
          academicYearId: yearId,
          name: "Premium Yedek Test Sınıfı",
          ageGroup: "60–72 ay",
          curriculumProfileSnapshot: profile,
        }]);
        await transaction.putMany("settings", [{
          ...base,
          id: classroomDomain.ACTIVE_CLASSROOM_SETTING_ID,
          settingType: classroomDomain.ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId: yearId,
          classroomId,
        }]);
        await transaction.putMany("students", [{
          ...base,
          id: studentId,
          displayName: "Kurgu Çocuk",
          academicYearId: yearId,
          classroomId,
        }]);
      },
    );
    const pack = parsePremiumContentPack(rawPack);
    const installed = await installPremiumPlanBoard(source, {
      pack,
      curriculumProfile: profile,
      teacherPreferredLensId: "guided-play",
      now: new Date("2026-09-07T07:00:00.000Z"),
    });
    const sourceActivity = pack.activities[0];
    const template = preparePremiumDailyTemplate(pack, sourceActivity.id, {
      annualPlanId: installed.annualPlanId,
      monthlyPlanId: installed.monthlyPlanId,
      weeklyPlanIds: installed.weeklyPlanIds,
      teacherPreferredLensId: "guided-play",
      teacherPreferredSupportingLensIds: [],
    });
    const appliedAlternative = template.alternativeActivitySnapshot;
    const alternativeCodes = new Set(appliedAlternative.curriculumTargetCodes);
    const alternativeTargets = curriculumCatalog
      .curriculumTargetsForProfile(profile, "60-72")
      .filter((item) => alternativeCodes.has(item.referenceCode));
    const dailyResult = await evidence.createPlanWithActivity(source, {
      civilDate: "2026-09-08",
      planId: "00000000-0000-4000-8000-000000009704",
      activityId: "00000000-0000-4000-8000-000000009705",
      planTitle: template.planTitle,
      activityTitle: appliedAlternative.title,
      startTime: "09:00",
      endTime: "09:40",
      curriculumProfile: profile,
      curriculumTargets: alternativeTargets,
      assignmentMode: "whole-class",
      studentIds: [studentId],
      premiumSource: template,
      premiumAlternativeActivated: true,
      now: new Date("2026-09-08T06:00:00.000Z"),
    });
    const captured = await evidence.captureImmutableRawObservation(source, {
      observationId: "00000000-0000-4000-8000-000000009706",
      studentId,
      planId: dailyResult.plan.id,
      activityId: dailyResult.activity.id,
      rawText: "Kurgu çocuk iki farklı rota önerdi.",
      observedAt: "2026-09-08T07:30:00.000Z",
      now: new Date("2026-09-08T07:31:00.000Z"),
    });
    const firstWeeklyPlanId = installed.weeklyPlanIds[0].planId;
    await recordPremiumWeeklyEvaluation(source, {
      weeklyPlanId: firstWeeklyPlanId,
      reflection: "İlk değerlendirmede ek gözlem gerekti.",
      evidenceSummary: "Rota üretimi iki farklı yolla gözlendi.",
      observationIds: [captured.observation.id],
      nextPlanDecision: "observe-more",
      now: new Date("2026-09-11T13:00:00.000Z"),
    });
    const latestEvaluation = await recordPremiumWeeklyEvaluation(source, {
      weeklyPlanId: firstWeeklyPlanId,
      reflection: "İkinci değerlendirmede katılım yolları çeşitlendi.",
      evidenceSummary: "Aynı kanıt yeniden incelendi ve uyarlama kararı verildi.",
      observationIds: [captured.observation.id],
      nextPlanDecision: "adapt",
      now: new Date("2026-09-11T14:00:00.000Z"),
    });
    await updatePremiumPlanLensPreferences(source, {
      pack,
      teacherPreferredLensId: "prepared-environment",
      teacherPreferredSupportingLensIds: ["accessible-participation"],
      now: new Date("2026-09-11T15:00:00.000Z"),
    });
    const backup = await new core.BackupService(source, {
      appVersion: "premium-graph-test",
    }).exportBackup();
    const targetService = new core.BackupService(target, {
      appVersion: "premium-graph-test",
    });
    const doubleSource = structuredClone(backup);
    const doubleSourceAnnual = doubleSource.payload.plans.find(
      (record) => record.id === installed.annualPlanId,
    ) as Record<string, unknown> | undefined;
    if (doubleSourceAnnual) {
      doubleSourceAnnual.primaryLensId =
        doubleSourceAnnual.teacherPreferredLensId;
      doubleSourceAnnual.supportingLensIds = [
        ...((doubleSourceAnnual.teacherPreferredSupportingLensIds ?? []) as string[]),
      ];
    }
    doubleSource.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(doubleSource.payload),
    );
    let doubleSourceError = "";
    try {
      await targetService.parseAndVerifyBackup(doubleSource);
    } catch (error) {
      doubleSourceError = error instanceof Error ? error.message : String(error);
    }
    const legacyLens = structuredClone(backup);
    for (const record of [
      ...legacyLens.payload.plans,
      ...legacyLens.payload.activities,
    ]) {
      if (record.lensSelectionMode !== "preference_only") continue;
      record.primaryLensId = record.teacherPreferredLensId;
      record.supportingLensIds = [
        ...((record.teacherPreferredSupportingLensIds ?? []) as string[]),
      ];
      delete record.teacherPreferredLensId;
      delete record.teacherPreferredSupportingLensIds;
      delete record.lensSelectionMode;
    }
    legacyLens.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(legacyLens.payload),
    );
    const parsedLegacyLens = await targetService.parseAndVerifyBackup(legacyLens);
    const corrupted = structuredClone(backup);
    const corruptedDaily = corrupted.payload.plans.find(
      (record) => record.id === dailyResult.plan.id,
    ) as Record<string, unknown> | undefined;
    const corruptedFlow = corruptedDaily?.premiumDailyFlowSnapshot as
      | { blocks: unknown[] }
      | undefined;
    corruptedFlow?.blocks.pop();
    corrupted.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(corrupted.payload),
    );
    let corruptedFlowError = "";
    try {
      await targetService.restoreBackup(corrupted, { mode: "replace" });
    } catch (error) {
      corruptedFlowError = error instanceof Error ? error.message : String(error);
    }
    const targetAfterRejectedRestore = await target.readSnapshot();
    await targetService.restoreBackup(backup, { mode: "replace" });
    const restored = await target.readSnapshot();
    const daily = restored.plans.find((record) => record.planType === "daily");
    const annual = restored.plans.find((record) => record.planType === "annual");
    const activity = restored.activities.find((record) => record.planId === daily?.id);
    const firstWeekly = restored.plans.find((record) => record.id === firstWeeklyPlanId);
    const nextWeekly = restored.plans.find(
      (record) => record.id === latestEvaluation.nextPlanTargetPlanId,
    );
    source.close();
    target.close();
    return {
      annualCount: restored.plans.filter((record) => record.planType === "annual").length,
      monthlyCount: restored.plans.filter((record) => record.planType === "monthly").length,
      weeklyCount: restored.plans.filter((record) => record.planType === "weekly").length,
      dailyCount: restored.plans.filter((record) => record.planType === "daily").length,
      annualPreference: annual?.teacherPreferredLensId,
      dailyHistoricalPreference: daily?.teacherPreferredLensId,
      dailyWeeklyId: daily?.sourceWeeklyPlanId,
      activityWeeklyId: activity?.sourceWeeklyPlanId,
      snapshotId: activity?.sourceActivityTemplateSnapshot?.id,
      sourceTemplateId: sourceActivity.id,
      appliedTemplateId: activity?.appliedActivityTemplateSnapshot?.id,
      expectedAlternativeId: appliedAlternative.id,
      replacedMainId:
        daily?.premiumDailyFlowSnapshot?.alternativeReplacement?.replacesMainActivityTemplateId,
      flowBlockCount: daily?.premiumDailyFlowSnapshot?.blocks?.length,
      weeklyEvaluationCount: firstWeekly?.weeklyEvaluations?.length,
      nextPlanDecision: nextWeekly?.nextPlanDecisionContext?.decision,
      rejectedRestorePlanCount: targetAfterRejectedRestore.plans.length,
      legacyLensPlanCount: parsedLegacyLens.payload.plans.length,
      doubleSourceError,
      corruptedFlowError,
    };
  }, premiumPlanSource);

  expect(result.annualCount).toBe(1);
  expect(result.monthlyCount).toBe(1);
  expect(result.weeklyCount).toBe(4);
  expect(result.dailyCount).toBe(1);
  expect(result.annualPreference).toBe("prepared-environment");
  expect(result.dailyHistoricalPreference).toBe("guided-play");
  expect(result.dailyWeeklyId).toBe(result.activityWeeklyId);
  expect(result.snapshotId).toBe(result.sourceTemplateId);
  expect(result.appliedTemplateId).toBe(result.expectedAlternativeId);
  expect(result.replacedMainId).toBe(result.sourceTemplateId);
  expect(result.flowBlockCount).toBe(10);
  expect(result.weeklyEvaluationCount).toBe(2);
  expect(result.nextPlanDecision).toBe("adapt");
  expect(result.rejectedRestorePlanCount).toBe(0);
  expect(result.legacyLensPlanCount).toBeGreaterThan(0);
  expect(result.doubleSourceError).toContain("çift kaynaklı");
  expect(result.corruptedFlowError).toContain("premium tam gün akışı geçersiz");
  expect(result).toMatchObject({
    annualCount: 1,
    monthlyCount: 1,
    weeklyCount: 4,
    dailyCount: 1,
  });
});

test("premium v3 değer snapshot'ını temiz geri yükler ve bütün kopyalarda tutarlı sahte Ek-14 metnini reddeder", async ({ page }) => {
  const premiumPlanSource = JSON.parse(await readFile(
    new URL("../../../premium-content/releases/tymm-6072/2026-09/content.v3.json", import.meta.url),
    "utf8",
  ));
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async (rawPack) => {
    const core = await import("/src/core/index.ts");
    const { parsePremiumContentPack } = await import(
      "/src/features/premium-plans/content-repository.ts"
    );
    const {
      installPremiumPlanBoard,
      preparePremiumDailyTemplate,
      recordPremiumWeeklyEvaluation,
    } = await import(
      "/src/features/premium-plans/plan-service.ts"
    );
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const catalog = await import("/src/features/curriculum/tymm-2024-catalog.ts");
    const curriculumCatalog = await import(
      "/src/features/curriculum/curriculum-catalog.ts"
    );
    const classroomDomain = await import("/src/core/domain/classroom.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-premium-v3-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-premium-v3-target-${crypto.randomUUID()}`,
    });
    const yearId = "00000000-0000-4000-8000-000000009801";
    const classroomId = "00000000-0000-4000-8000-000000009802";
    const studentId = "00000000-0000-4000-8000-000000009803";
    const base = {
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 1,
    };
    const profile = {
      framework: "tymm" as const,
      programLabel: evidence.CURRICULUM_PROGRAM_LABELS.tymm,
      catalogId: catalog.TYMM_2024_CATALOG_METADATA.catalogId,
      sourceVersion: catalog.TYMM_2024_CATALOG_METADATA.sourceVersion,
      referenceOrigin: "official-catalog" as const,
      officialCatalogVerified: true,
    };
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "settings", "students"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: yearId,
          name: "2026–2027 Eğitim Yılı",
          startDate: "2026-09-07",
          endDate: "2027-06-25",
          status: "active",
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: classroomId,
          academicYearId: yearId,
          name: "Premium V3 Yedek Test Sınıfı",
          ageGroup: "60–72 ay",
          curriculumProfileSnapshot: profile,
        }]);
        await transaction.putMany("settings", [{
          ...base,
          id: classroomDomain.ACTIVE_CLASSROOM_SETTING_ID,
          settingType: classroomDomain.ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId: yearId,
          classroomId,
        }]);
        await transaction.putMany("students", [{
          ...base,
          id: studentId,
          displayName: "Kurgu Çocuk",
          academicYearId: yearId,
          classroomId,
        }]);
      },
    );
    const pack = parsePremiumContentPack(rawPack);
    const installed = await installPremiumPlanBoard(source, {
      pack,
      curriculumProfile: profile,
      teacherPreferredLensId: "guided-play",
      now: new Date("2026-09-07T07:00:00.000Z"),
    });
    const main = pack.activities[0];
    const selection = preparePremiumDailyTemplate(pack, main.id, {
      annualPlanId: installed.annualPlanId,
      monthlyPlanId: installed.monthlyPlanId,
      weeklyPlanIds: installed.weeklyPlanIds,
      teacherPreferredLensId: "guided-play",
      teacherPreferredSupportingLensIds: [],
    });
    const alternative = selection.alternativeActivitySnapshot;
    const alternativeCodes = new Set(alternative.curriculumTargetCodes);
    const alternativeTargets = curriculumCatalog
      .curriculumTargetsForProfile(profile, "60-72")
      .filter((item) => alternativeCodes.has(item.referenceCode));
    const daily = await evidence.createPlanWithActivity(source, {
      civilDate: "2026-09-08",
      planId: "00000000-0000-4000-8000-000000009804",
      activityId: "00000000-0000-4000-8000-000000009805",
      planTitle: selection.planTitle,
      activityTitle: alternative.title,
      startTime: "09:00",
      endTime: "09:40",
      curriculumProfile: profile,
      curriculumTargets: alternativeTargets,
      assignmentMode: "whole-class",
      studentIds: [studentId],
      premiumSource: selection,
      premiumAlternativeActivated: true,
      now: new Date("2026-09-08T06:00:00.000Z"),
    });
    const backup = await new core.BackupService(source, {
      appVersion: "premium-v3-values-test",
    }).exportBackup();
    const tampered = structuredClone(backup);
    const mutateExactIndicator = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(mutateExactIndicator);
        return;
      }
      if (!value || typeof value !== "object") return;
      const item = value as Record<string, unknown>;
      if (item.indicatorCode === "D4.1.1") {
        item.indicatorText = "Bütün snapshot kopyalarında aynı sahte metin.";
      }
      Object.values(item).forEach(mutateExactIndicator);
    };
    mutateExactIndicator(tampered.payload);
    tampered.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(tampered.payload),
    );
    const targetService = new core.BackupService(target, {
      appVersion: "premium-v3-values-test",
    });
    let tamperedError = "";
    try {
      await targetService.restoreBackup(tampered, { mode: "replace" });
    } catch (error) {
      tamperedError = error instanceof Error ? error.message : String(error);
    }
    const afterRejected = await target.readSnapshot();
    const identityTamperCases = [
      {
        field: "id",
        mutate(item: Record<string, unknown>) {
          if (item.id === pack.id) item.id = "forged-premium-values-v3";
          if (item.contentPackId === pack.id) item.contentPackId = "forged-premium-values-v3";
        },
      },
      {
        field: "version",
        mutate(item: Record<string, unknown>) {
          if (item.version === pack.version) item.version = "3.9.9";
          if (item.contentPackVersion === pack.version) item.contentPackVersion = "3.9.9";
        },
      },
      {
        field: "contentReleaseId",
        mutate(item: Record<string, unknown>) {
          if (item.contentReleaseId === pack.contentReleaseId) {
            item.contentReleaseId = "forged-2026-09-v3";
          }
        },
      },
      {
        field: "manifestDigest",
        mutate(item: Record<string, unknown>) {
          if (item.manifestDigest === pack.manifestDigest) {
            item.manifestDigest = `sha256:${"0".repeat(64)}`;
          }
        },
      },
    ];
    const identityTamperResults = [];
    for (const tamperCase of identityTamperCases) {
      const identityTampered = structuredClone(backup);
      const mutateAllCopies = (value: unknown): void => {
        if (Array.isArray(value)) {
          value.forEach(mutateAllCopies);
          return;
        }
        if (!value || typeof value !== "object") return;
        const item = value as Record<string, unknown>;
        tamperCase.mutate(item);
        Object.values(item).forEach(mutateAllCopies);
      };
      mutateAllCopies(identityTampered.payload);
      identityTampered.manifest.payloadChecksum = await core.sha256Hex(
        core.canonicalJson(identityTampered.payload),
      );
      let errorMessage = "";
      try {
        await targetService.restoreBackup(identityTampered, { mode: "replace" });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }
      identityTamperResults.push({
        field: tamperCase.field,
        errorMessage,
        rejectedPlanCount: (await target.readSnapshot()).plans.length,
      });
    }
    await targetService.restoreBackup(backup, { mode: "replace" });
    const restored = await target.readSnapshot();
    const restoredDaily = restored.plans.find((plan) => plan.id === daily.plan.id);
    const restoredActivity = restored.activities.find(
      (activity) => activity.id === daily.activity.id,
    );
    const response = {
      tamperedError,
      rejectedPlanCount: afterRejected.plans.length,
      identityTamperResults,
      status: restoredDaily?.sourceContentPackSnapshot?.valuesMappingStatus,
      contract: restoredDaily?.sourceContentPackSnapshot?.valuesContract,
      sourceValueDesign: restoredDaily?.sourceActivityTemplateSnapshot?.valuesDesign,
      appliedValueDesign: restoredActivity?.appliedActivityTemplateSnapshot?.valuesDesign,
      expectedSourceValueDesign: main.valuesDesign,
      expectedAppliedValueDesign: alternative.valuesDesign,
    };
    source.close();
    target.close();
    return response;
  }, premiumPlanSource);

  expect(result.tamperedError).toContain("Ek-14 kataloğu");
  expect(result.rejectedPlanCount).toBe(0);
  expect(result.identityTamperResults).toHaveLength(4);
  for (const identityTamper of result.identityTamperResults) {
    expect(identityTamper.errorMessage).toContain(
      "kanonik Eylül 2026 premium v3",
    );
    expect(identityTamper.rejectedPlanCount).toBe(0);
  }
  expect(result.status).toBe("machine_validated_pending_human_review");
  expect(result.contract.status).toBe("machine_validated_pending_human_review");
  expect(result.sourceValueDesign).toEqual(result.expectedSourceValueDesign);
  expect(result.appliedValueDesign).toEqual(result.expectedAppliedValueDesign);
});

test("V5 öğretmen onaylı değer kanıtını kayıpsız taşır; tamper, merge ve drift'i yazmadan reddeder", async ({
  page,
}) => {
  const premiumPlanSource = JSON.parse(await readFile(
    new URL(
      "../../../premium-content/releases/tymm-6072/2026-09/content.v3.json",
      import.meta.url,
    ),
    "utf8",
  ));
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async (rawPack) => {
    const core = await import("/src/core/index.ts");
    const { parsePremiumContentPack } = await import(
      "/src/features/premium-plans/content-repository.ts"
    );
    const {
      installPremiumPlanBoard,
      preparePremiumDailyTemplate,
      recordPremiumWeeklyEvaluation,
    } = await import("/src/features/premium-plans/plan-service.ts");
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const valueEvidence = await import(
      "/src/features/values/value-evidence-links.ts"
    );
    const dossier = await import(
      "/src/features/reports/student-dossier.ts"
    );
    const catalog = await import("/src/features/curriculum/tymm-2024-catalog.ts");
    const curriculumCatalog = await import(
      "/src/features/curriculum/curriculum-catalog.ts"
    );
    const classroomDomain = await import("/src/core/domain/classroom.ts");
    const localTeacherIdentity = await import(
      "/src/features/evidence/local-teacher-identity.ts"
    );

    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-value-evidence-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-value-evidence-target-${crypto.randomUUID()}`,
    });
    const mergeTarget = new core.IndexedDbDataStore({
      databaseName: `maarifos-value-evidence-merge-${crypto.randomUUID()}`,
    });
    const driftMergeTarget = new core.IndexedDbDataStore({
      databaseName: `maarifos-value-evidence-drift-merge-${crypto.randomUUID()}`,
    });
    const driftReplaceTarget = new core.IndexedDbDataStore({
      databaseName: `maarifos-value-evidence-drift-replace-${crypto.randomUUID()}`,
    });
    const yearId = "00000000-0000-4000-8000-000000009901";
    const classroomId = "00000000-0000-4000-8000-000000009902";
    const studentId = "00000000-0000-4000-8000-000000009903";
    const secondStudentId = "00000000-0000-4000-8000-000000009904";
    const planId = "00000000-0000-4000-8000-000000009905";
    const activityId = "00000000-0000-4000-8000-000000009906";
    const observationId = "00000000-0000-4000-8000-000000009907";
    const linkId = "00000000-0000-4000-8000-000000009908";
    const secondObservationId = "00000000-0000-4000-8000-000000009909";
    const firstAttendanceId = "00000000-0000-4000-8000-000000009910";
    const secondAttendanceId = "00000000-0000-4000-8000-000000009911";
    const firstPortfolioId = "00000000-0000-4000-8000-000000009912";
    const secondPortfolioId = "00000000-0000-4000-8000-000000009913";
    const base = {
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 1,
    };
    const profile = {
      framework: "tymm" as const,
      programLabel: evidence.CURRICULUM_PROGRAM_LABELS.tymm,
      catalogId: catalog.TYMM_2024_CATALOG_METADATA.catalogId,
      sourceVersion: catalog.TYMM_2024_CATALOG_METADATA.sourceVersion,
      referenceOrigin: "official-catalog" as const,
      officialCatalogVerified: true,
    };
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "settings", "students"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: yearId,
          name: "2026–2027 Eğitim Yılı",
          startDate: "2026-09-07",
          endDate: "2027-06-25",
          status: "active",
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: classroomId,
          academicYearId: yearId,
          name: "Değer Kanıtı Yedek Sınıfı",
          ageGroup: "60–72 ay",
          curriculumProfileSnapshot: profile,
        }]);
        await transaction.putMany("settings", [{
          ...base,
          id: classroomDomain.ACTIVE_CLASSROOM_SETTING_ID,
          settingType: classroomDomain.ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId: yearId,
          classroomId,
        }]);
        await transaction.putMany("students", [
          {
            ...base,
            id: studentId,
            displayName: "Kurgu Değer Çocuğu",
            academicYearId: yearId,
            classroomId,
          },
          {
            ...base,
            id: secondStudentId,
            displayName: "Kurgu İkinci Çocuk",
            academicYearId: yearId,
            classroomId,
          },
        ]);
      },
    );
    const pack = parsePremiumContentPack(rawPack);
    const installed = await installPremiumPlanBoard(source, {
      pack,
      curriculumProfile: profile,
      teacherPreferredLensId: "guided-play",
      now: new Date("2026-09-07T07:00:00.000Z"),
    });
    const main = pack.activities[0];
    const selection = preparePremiumDailyTemplate(pack, main.id, {
      annualPlanId: installed.annualPlanId,
      monthlyPlanId: installed.monthlyPlanId,
      weeklyPlanIds: installed.weeklyPlanIds,
      teacherPreferredLensId: "guided-play",
      teacherPreferredSupportingLensIds: [],
    });
    const alternative = selection.alternativeActivitySnapshot;
    const alternativeCodes = new Set(alternative.curriculumTargetCodes);
    const alternativeTargets = curriculumCatalog
      .curriculumTargetsForProfile(profile, "60-72")
      .filter((item) => alternativeCodes.has(item.referenceCode));
    await evidence.createPlanWithActivity(source, {
      civilDate: "2026-09-08",
      planId,
      activityId,
      planTitle: selection.planTitle,
      activityTitle: alternative.title,
      startTime: "09:00",
      endTime: "09:40",
      curriculumProfile: profile,
      curriculumTargets: alternativeTargets,
      assignmentMode: "selected-students",
      studentIds: [studentId],
      premiumSource: selection,
      premiumAlternativeActivated: true,
      now: new Date("2026-09-08T06:00:00.000Z"),
    });
    const rawObservation =
      "Kurgu çocuk, bekleyen arkadaşına materyali sırasını gözeterek uzattı.";
    await evidence.captureImmutableRawObservation(source, {
      observationId,
      studentId,
      planId,
      activityId,
      rawText: rawObservation,
      observedAt: "2026-09-08T07:00:00.000Z",
      now: new Date("2026-09-08T07:01:00.000Z"),
    });
    await recordPremiumWeeklyEvaluation(source, {
      weeklyPlanId: selection.weeklyPlanId,
      reflection: "Çocuklar farklı katılım yollarını kendiliğinden kullandı.",
      evidenceSummary: "Öğretmen notu ve çocuk ürünü birlikte incelendi.",
      observationIds: [observationId],
      nextPlanDecision: "keep",
      now: new Date("2026-09-08T08:00:00.000Z"),
    });
    const action = alternative.valuesDesign.mapping.officialActionSnapshots[0];
    const firstLink = await valueEvidence.confirmObservationValueEvidenceLink(
      source,
      {
        linkId,
        observationId,
        studentId,
        evidenceRole: "supports",
        targetValueCode: action.valueCode,
        targetIndicatorCode: action.indicatorCode,
        teacherRationale:
          "Materyali sırasını gözeterek arkadaşına uzatması, seçilen somut eylem göstergesiyle ilişkilidir.",
        now: new Date("2026-09-08T21:30:00.000Z"),
      },
    );
    const historicalDossier = await dossier.createStudentDossier(source, {
      studentId,
      options: {
        destination: "file",
        audience: "teacher",
        identityMode: "alias",
        alias: "Öğrenci A",
        periodStart: "2026-09-07",
        periodEnd: "2026-09-30",
        includeContacts: false,
        includeAttendance: false,
        includeObservations: true,
        includePortfolio: false,
        includeExternalFeedback: false,
      },
      now: new Date("2026-09-08T21:45:00.000Z"),
    });
    const corrected = await valueEvidence.supersedeObservationValueEvidenceLink(
      source,
      {
        linkId: firstLink.id,
        evidenceRole: "context_only",
        teacherRationale:
          "Bayram ve dua sözcükleri aile anlatısında kültürel bağlam olarak geçti; bu kayıt yalnız bağlamı belirtir.",
        now: new Date("2026-09-08T22:00:00.000Z"),
      },
    );
    const linkedDossier = await dossier.createStudentDossier(source, {
      studentId,
      options: {
        destination: "file",
        audience: "teacher",
        identityMode: "alias",
        alias: "Öğrenci A",
        periodStart: "2026-09-07",
        periodEnd: "2026-09-30",
        includeContacts: false,
        includeAttendance: false,
        includeObservations: true,
        includePortfolio: false,
        includeExternalFeedback: false,
      },
      now: new Date("2026-09-09T06:20:00.000Z"),
    });
    await source.transaction(
      "readwrite",
      ["observations", "attendanceRecords", "portfolioSelections"],
      async (transaction) => {
        await transaction.putMany("observations", [{
          ...base,
          id: secondObservationId,
          academicYearId: yearId,
          classroomId,
          studentIds: [secondStudentId],
          rawText: "Kurgu ikinci çocuk materyali sırası gelince arkadaşına uzattı.",
          observedAt: "2026-09-09T05:55:00.000Z",
          createdAt: "2026-09-09T06:10:00.000Z",
          updatedAt: "2026-09-09T06:10:00.000Z",
          civilDate: "2026-09-09",
        }]);
        await transaction.putMany("attendanceRecords", [
          {
            ...base,
            id: firstAttendanceId,
            academicYearId: yearId,
            classroomId,
            studentId,
            status: "present",
            createdAt: "2026-09-09T06:15:00.000Z",
            updatedAt: "2026-09-09T06:15:00.000Z",
            civilDate: "2026-09-09",
          },
          {
            ...base,
            id: secondAttendanceId,
            academicYearId: yearId,
            classroomId,
            studentId: secondStudentId,
            status: "present",
            createdAt: "2026-09-09T06:15:00.000Z",
            updatedAt: "2026-09-09T06:15:00.000Z",
            civilDate: "2026-09-09",
          },
        ]);
        await transaction.putMany("portfolioSelections", [
          {
            ...base,
            id: firstPortfolioId,
            academicYearId: yearId,
            classroomId,
            studentId,
            periodStart: "2026-09-07",
            periodEnd: "2026-09-30",
            itemType: "observation",
            itemId: observationId,
            order: 0,
            teacherCaption: "Birinci çocuğa ait kurgu seçki.",
            createdAt: "2026-09-09T06:15:00.000Z",
            updatedAt: "2026-09-09T06:15:00.000Z",
            civilDate: "2026-09-09",
          },
          {
            ...base,
            id: secondPortfolioId,
            academicYearId: yearId,
            classroomId,
            studentId: secondStudentId,
            periodStart: "2026-09-07",
            periodEnd: "2026-09-30",
            itemType: "observation",
            itemId: secondObservationId,
            order: 0,
            teacherCaption: "İkinci çocuğa ait kurgu seçki.",
            createdAt: "2026-09-09T06:15:00.000Z",
            updatedAt: "2026-09-09T06:15:00.000Z",
            civilDate: "2026-09-09",
          },
        ]);
      },
    );
    const firstFeedback = await dossier.saveExternalAiFeedback(source, {
      studentId,
      provider: "other",
      audience: "teacher",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-30",
      feedbackText: "Birinci çocuğa ait tarihli kurgu haricî geri bildirim.",
      now: new Date("2026-09-09T06:20:00.000Z"),
    });
    const secondFeedback = await dossier.saveExternalAiFeedback(source, {
      studentId: secondStudentId,
      provider: "other",
      audience: "teacher",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-30",
      feedbackText: "İkinci çocuğa ait tarihli kurgu haricî geri bildirim.",
      now: new Date("2026-09-09T06:21:00.000Z"),
    });
    const secondDossier = await dossier.createStudentDossier(source, {
      studentId: secondStudentId,
      options: {
        destination: "file",
        audience: "teacher",
        identityMode: "alias",
        alias: "Öğrenci B",
        periodStart: "2026-09-07",
        periodEnd: "2026-09-30",
        includeContacts: false,
        includeAttendance: true,
        includeObservations: true,
        includePortfolio: true,
        includeExternalFeedback: true,
      },
      now: new Date("2026-09-09T06:30:00.000Z"),
    });
    const sourceService = new core.BackupService(source, {
      appVersion: "value-evidence-v5-test",
      clock: () => new Date("2026-09-09T07:00:00.000Z"),
    });
    const backup = await sourceService.exportBackup();
    const legacyDossierBackup = structuredClone(backup);
    legacyDossierBackup.manifest.dataSchemaVersion = 4;
    delete legacyDossierBackup.payload.valueEvidenceLinks;
    delete legacyDossierBackup.manifest.entityCounts.valueEvidenceLinks;
    for (const exportPackage of legacyDossierBackup.payload.exportPackages) {
      if (exportPackage.type !== "student_dossier") continue;
      delete (
        exportPackage.includedEntityIds as Record<string, unknown>
      ).valueEvidenceLinks;
    }
    legacyDossierBackup.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(legacyDossierBackup.payload),
    );
    const upgradedLegacyDossier = await sourceService.parseAndVerifyBackup(
      legacyDossierBackup,
    );
    const targetService = new core.BackupService(target, {
      appVersion: "value-evidence-v5-test",
    });
    await targetService.restoreBackup(backup, {
      mode: "replace",
      createRecoverySnapshot: false,
    });
    const restored = await target.readSnapshot();
    const baselineTarget = core.canonicalJson(restored);

    const activeLink = (candidate: typeof backup) => {
      const link = candidate.payload.valueEvidenceLinks.find(
        (item) => item.deletedAt === null,
      );
      if (!link) throw new Error("Kurgu aktif değer kanıtı bulunamadı.");
      return link;
    };
    const predecessorLink = (candidate: typeof backup) => {
      const link = candidate.payload.valueEvidenceLinks.find(
        (item) => typeof item.deletedAt === "string",
      );
      if (!link) throw new Error("Kurgu predecessor değer kanıtı bulunamadı.");
      return link;
    };
    const negativeCases: Array<{
      name: string;
      mutate: (candidate: typeof backup) => void;
    }> = [
      {
        name: "unexpectedField",
        mutate(candidate) {
          activeLink(candidate).automaticValueScore = 95;
        },
      },
      {
        name: "unknownNestedContentField",
        mutate(candidate) {
          const visit = (value: unknown): void => {
            if (Array.isArray(value)) {
              value.forEach(visit);
              return;
            }
            if (!value || typeof value !== "object") return;
            const item = value as Record<string, unknown>;
            if (
              item.valuesMappingStatus ===
                "machine_validated_pending_human_review" &&
              typeof item.manifestDigest === "string"
            ) {
              item.unexpectedCanonicalField = "forged";
            }
            Object.values(item).forEach(visit);
          };
          visit(candidate.payload);
        },
      },
      {
        name: "multiChildObservation",
        mutate(candidate) {
          candidate.payload.observations[0].studentIds = [
            studentId,
            secondStudentId,
          ];
        },
      },
      {
        name: "studentMismatch",
        mutate(candidate) {
          activeLink(candidate).studentId = secondStudentId;
        },
      },
      {
        name: "scopeMismatch",
        mutate(candidate) {
          activeLink(candidate).classroomId =
            "00000000-0000-4000-8000-000000009999";
        },
      },
      {
        name: "actorMismatch",
        mutate(candidate) {
          activeLink(candidate).confirmedByActorId =
            "00000000-0000-4000-9000-000000009999";
        },
      },
      {
        name: "actorCreatedAfterConfirmation",
        mutate(candidate) {
          const identity = candidate.payload.settings.find(
            (setting) => setting.settingType === "local-teacher-identity",
          );
          if (!identity) throw new Error("Kurgu yerel öğretmen kimliği bulunamadı.");
          const createdAfterConfirmation = new Date(
            Date.parse(String(activeLink(candidate).confirmedAt)) + 1_000,
          ).toISOString();
          identity.createdAt = createdAfterConfirmation;
          identity.updatedAt = createdAfterConfirmation;
        },
      },
      {
        name: "deletedActor",
        mutate(candidate) {
          const identity = candidate.payload.settings.find(
            (setting) => setting.settingType === "local-teacher-identity",
          );
          if (!identity) throw new Error("Kurgu yerel öğretmen kimliği bulunamadı.");
          identity.updatedAt = "2026-09-10T08:00:00.000Z";
          identity.deletedAt = "2026-09-10T08:00:00.000Z";
        },
      },
      {
        name: "crossStudentDossierValueLink",
        mutate(candidate) {
          const exportPackage = candidate.payload.exportPackages.find(
            (item) =>
              Array.isArray(item.studentIds) &&
              item.studentIds.includes(secondStudentId),
          );
          if (!exportPackage) throw new Error("Kurgu öğrenci dosyası bulunamadı.");
          (exportPackage.includedEntityIds as Record<string, unknown>)
            .valueEvidenceLinks = [activeLink(candidate).id];
        },
      },
      {
        name: "crossStudentDossierObservation",
        mutate(candidate) {
          const exportPackage = candidate.payload.exportPackages.find(
            (item) => item.id === secondDossier.exportPackageId,
          );
          if (!exportPackage) throw new Error("Kurgu ikinci öğrenci dosyası bulunamadı.");
          (exportPackage.includedEntityIds as Record<string, unknown>)
            .observations = [observationId];
        },
      },
      {
        name: "crossStudentDossierAttendance",
        mutate(candidate) {
          const exportPackage = candidate.payload.exportPackages.find(
            (item) => item.id === secondDossier.exportPackageId,
          );
          if (!exportPackage) throw new Error("Kurgu ikinci öğrenci dosyası bulunamadı.");
          (exportPackage.includedEntityIds as Record<string, unknown>)
            .attendanceRecords = [firstAttendanceId];
        },
      },
      {
        name: "crossStudentDossierPortfolio",
        mutate(candidate) {
          const exportPackage = candidate.payload.exportPackages.find(
            (item) => item.id === secondDossier.exportPackageId,
          );
          if (!exportPackage) throw new Error("Kurgu ikinci öğrenci dosyası bulunamadı.");
          (exportPackage.includedEntityIds as Record<string, unknown>)
            .portfolioSelections = [firstPortfolioId];
        },
      },
      {
        name: "crossStudentDossierExternalFeedback",
        mutate(candidate) {
          const exportPackage = candidate.payload.exportPackages.find(
            (item) => item.id === secondDossier.exportPackageId,
          );
          if (!exportPackage) throw new Error("Kurgu ikinci öğrenci dosyası bulunamadı.");
          (exportPackage.includedEntityIds as Record<string, unknown>)
            .externalFeedback = [firstFeedback.id];
        },
      },
      {
        name: "missingDossierIncludedGroup",
        mutate(candidate) {
          const exportPackage = candidate.payload.exportPackages.find(
            (item) => item.id === secondDossier.exportPackageId,
          );
          if (!exportPackage) throw new Error("Kurgu ikinci öğrenci dosyası bulunamadı.");
          delete (
            exportPackage.includedEntityIds as Record<string, unknown>
          ).attendanceRecords;
        },
      },
      {
        name: "dossierIncludeFlagMismatch",
        mutate(candidate) {
          const exportPackage = candidate.payload.exportPackages.find(
            (item) => item.id === secondDossier.exportPackageId,
          );
          if (!exportPackage) throw new Error("Kurgu ikinci öğrenci dosyası bulunamadı.");
          (exportPackage.manifest as Record<string, unknown>).includePortfolio = false;
        },
      },
      {
        name: "dossierMediaFailClosed",
        mutate(candidate) {
          const exportPackage = candidate.payload.exportPackages.find(
            (item) => item.id === secondDossier.exportPackageId,
          );
          if (!exportPackage) throw new Error("Kurgu ikinci öğrenci dosyası bulunamadı.");
          (exportPackage.includedEntityIds as Record<string, unknown>)
            .mediaAssets = [studentId];
        },
      },
      {
        name: "manifestGeneratedAtMismatch",
        mutate(candidate) {
          const exportPackage = candidate.payload.exportPackages.find(
            (item) => item.id === historicalDossier.exportPackageId,
          );
          if (!exportPackage) throw new Error("Kurgu tarihsel öğrenci dosyası bulunamadı.");
          (exportPackage.manifest as Record<string, unknown>).generatedAt =
            "2026-09-08T21:46:00.000Z";
        },
      },
      {
        name: "historicalLinkDeletedBeforePackage",
        mutate(candidate) {
          const exportPackage = candidate.payload.exportPackages.find(
            (item) => item.id === historicalDossier.exportPackageId,
          );
          if (!exportPackage) throw new Error("Kurgu tarihsel öğrenci dosyası bulunamadı.");
          const impossiblePackageTime = "2026-09-08T22:01:00.000Z";
          exportPackage.createdAt = impossiblePackageTime;
          exportPackage.updatedAt = impossiblePackageTime;
          (exportPackage.manifest as Record<string, unknown>).generatedAt =
            impossiblePackageTime;
        },
      },
      {
        name: "targetMismatch",
        mutate(candidate) {
          const link = activeLink(candidate);
          link.targetIndicatorCode = `${String(link.targetValueCode)}.99.99`;
        },
      },
      {
        name: "civilDateMismatch",
        mutate(candidate) {
          activeLink(candidate).civilDate = "2026-09-08";
        },
      },
      {
        name: "rawObservationRationale",
        mutate(candidate) {
          activeLink(candidate).teacherRationale = rawObservation;
        },
      },
      {
        name: "sensitiveRawObservation",
        mutate(candidate) {
          const observation = candidate.payload.observations.find(
            (item) => item.id === observationId,
          );
          if (!observation) throw new Error("Kurgu ham gözlem bulunamadı.");
          observation.rawText =
            "Namaz kıldı; bu nedenle iyi ve saygılı bir çocuktu.";
        },
      },
      {
        name: "unsafeWeeklyNarrative",
        mutate(candidate) {
          const weekly = candidate.payload.plans.find(
            (plan) =>
              plan.id === selection.weeklyPlanId &&
              Array.isArray(plan.weeklyEvaluations) &&
              plan.weeklyEvaluations.length > 0,
          );
          if (!weekly) throw new Error("Kurgu haftalık plan bulunamadı.");
          weekly.weeklyEvaluations[0].evidenceSummary =
            "Ali saygı: 95; namaz kıldığı için iyi çocuktur.";
        },
      },
      {
        name: "unsafeWeeklySourceObservationOnly",
        mutate(candidate) {
          const weekly = candidate.payload.plans.find(
            (plan) =>
              plan.id === selection.weeklyPlanId &&
              Array.isArray(plan.weeklyEvaluations) &&
              plan.weeklyEvaluations.length > 0,
          );
          const sourceObservation = candidate.payload.observations.find(
            (item) => item.id === observationId,
          );
          if (!weekly || !sourceObservation) {
            throw new Error("Kurgu haftalık gözlem zinciri bulunamadı.");
          }
          const unsafeObservation = structuredClone(sourceObservation);
          unsafeObservation.id = "00000000-0000-4000-8000-000000009978";
          unsafeObservation.rawText = "Fâtiha okudu; hayırlı bir evlattır.";
          candidate.payload.observations.push(unsafeObservation);
          weekly.weeklyEvaluations[0].observationIds = [unsafeObservation.id];
        },
      },
      {
        name: "futureWeeklySourceObservation",
        mutate(candidate) {
          const weekly = candidate.payload.plans.find(
            (plan) =>
              plan.id === selection.weeklyPlanId &&
              Array.isArray(plan.weeklyEvaluations) &&
              plan.weeklyEvaluations.length > 0,
          );
          const sourceObservation = candidate.payload.observations.find(
            (item) => item.id === observationId,
          );
          if (!weekly || !sourceObservation) {
            throw new Error("Kurgu haftalık gözlem zinciri bulunamadı.");
          }
          sourceObservation.observedAt = new Date(
            Date.parse(String(weekly.weeklyEvaluations[0].createdAt)) + 1_000,
          ).toISOString();
        },
      },
      {
        name: "nonCanonicalRationale",
        mutate(candidate) {
          activeLink(candidate).teacherRationale =
            "  Bağlamı açıklayan güvenli ama kırpılmamış gerekçe.  ";
        },
      },
      {
        name: "nfdRationale",
        mutate(candidate) {
          activeLink(candidate).teacherRationale =
            "Go\u0308zlemdeki somut bağlam öğretmen tarafından ayrıca açıklandı.";
        },
      },
      {
        name: "scoreRationale",
        mutate(candidate) {
          activeLink(candidate).teacherRationale =
            "Çocuğun değer puanı 95 olarak kaydedildi.";
        },
      },
      {
        name: "beliefAsSupport",
        mutate(candidate) {
          const link = activeLink(candidate);
          link.evidenceRole = "supports";
          link.teacherRationale = "Dua ettiği için saygı değerini gösterdi.";
        },
      },
      {
        name: "duplicateActiveTarget",
        mutate(candidate) {
          const duplicate = structuredClone(activeLink(candidate));
          duplicate.id = "00000000-0000-4000-8000-000000009991";
          duplicate.supersedesLinkId = null;
          candidate.payload.valueEvidenceLinks.push(duplicate);
          candidate.manifest.entityCounts.valueEvidenceLinks += 1;
        },
      },
      {
        name: "selfSupersede",
        mutate(candidate) {
          const link = activeLink(candidate);
          link.supersedesLinkId = link.id;
        },
      },
      {
        name: "cycle",
        mutate(candidate) {
          predecessorLink(candidate).supersedesLinkId = activeLink(candidate).id;
        },
      },
      {
        name: "activePredecessor",
        mutate(candidate) {
          const predecessor = predecessorLink(candidate);
          predecessor.deletedAt = null;
          predecessor.updatedAt = predecessor.createdAt;
        },
      },
      {
        name: "tombstoneTimestamp",
        mutate(candidate) {
          const predecessor = predecessorLink(candidate);
          predecessor.updatedAt = "2026-09-08T22:01:00.000Z";
          predecessor.deletedAt = "2026-09-08T22:01:00.000Z";
        },
      },
      {
        name: "noOpSupersede",
        mutate(candidate) {
          const active = activeLink(candidate);
          const predecessor = predecessorLink(candidate);
          active.evidenceRole = predecessor.evidenceRole;
          active.teacherRationale = predecessor.teacherRationale;
        },
      },
      {
        name: "branchedSupersede",
        mutate(candidate) {
          const branch = structuredClone(activeLink(candidate));
          branch.id = "00000000-0000-4000-8000-000000009992";
          branch.evidenceRole = "contrasts";
          branch.teacherRationale =
            "Aynı predecessor için oluşturulan ikinci kurgu dal bağlantısı.";
          branch.updatedAt = "2026-09-08T22:30:00.000Z";
          branch.deletedAt = "2026-09-08T22:30:00.000Z";
          candidate.payload.valueEvidenceLinks.push(branch);
          candidate.manifest.entityCounts.valueEvidenceLinks += 1;
        },
      },
      {
        name: "designDigest",
        mutate(candidate) {
          for (const link of candidate.payload.valueEvidenceLinks) {
            (link.provenance as Record<string, unknown>)
              .appliedValuesDesignDigest = `sha256:${"0".repeat(64)}`;
          }
        },
      },
      {
        name: "forgedPackWithoutLineage",
        mutate(candidate) {
          const dailyPlan = candidate.payload.plans.find(
            (plan) => plan.id === planId,
          );
          const activity = candidate.payload.activities.find(
            (item) => item.id === activityId,
          );
          if (!dailyPlan || !activity) throw new Error("Kurgu günlük zincir yok.");
          delete dailyPlan.sourceAnnualPlanId;
          delete dailyPlan.sourceMonthlyPlanId;
          delete dailyPlan.sourceWeeklyPlanId;
          delete activity.sourceAnnualPlanId;
          delete activity.sourceMonthlyPlanId;
          delete activity.sourceWeeklyPlanId;
          const content = activity.sourceContentPackSnapshot as Record<string, unknown>;
          content.id = "forged-premium-values-v3";
          content.version = "3.9.9";
          content.contentReleaseId = "forged-2026-09-v3";
          content.manifestDigest = `sha256:${"1".repeat(64)}`;
          for (const link of candidate.payload.valueEvidenceLinks) {
            const provenance = link.provenance as Record<string, unknown>;
            provenance.contentPackId = content.id;
            provenance.contentPackVersion = content.version;
            provenance.contentReleaseId = content.contentReleaseId;
            provenance.contentManifestDigest = content.manifestDigest;
          }
        },
      },
    ];
    const negativeResults = [];
    for (const invalidCase of negativeCases) {
      const candidate = structuredClone(backup);
      invalidCase.mutate(candidate);
      candidate.manifest.payloadChecksum = await core.sha256Hex(
        core.canonicalJson(candidate.payload),
      );
      let errorMessage = "";
      try {
        await targetService.restoreBackup(candidate, {
          mode: "replace",
          createRecoverySnapshot: false,
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }
      const unchanged = core.canonicalJson(await target.readSnapshot()) === baselineTarget;
      negativeResults.push({ name: invalidCase.name, errorMessage, unchanged });
      if (!unchanged) {
        await targetService.restoreBackup(backup, {
          mode: "replace",
          createRecoverySnapshot: false,
        });
      }
    }

    const seedPayload = async (
      store: typeof target,
      payload: typeof backup.payload,
    ): Promise<void> => {
      await store.transaction(
        "readwrite",
        core.COLLECTION_NAMES,
        async (transaction) => {
          for (const collection of core.COLLECTION_NAMES) {
            await transaction.putMany(collection, payload[collection]);
          }
        },
      );
    };
    const withoutLinks = structuredClone(backup.payload);
    withoutLinks.valueEvidenceLinks = [];
    const identityNoLinkBase = structuredClone(backup);
    identityNoLinkBase.payload.valueEvidenceLinks = [];
    for (const exportPackage of identityNoLinkBase.payload.exportPackages) {
      const includedEntityIds = exportPackage.includedEntityIds as Record<
        string,
        unknown
      >;
      if (Array.isArray(includedEntityIds.valueEvidenceLinks)) {
        includedEntityIds.valueEvidenceLinks = [];
      }
    }
    identityNoLinkBase.manifest.entityCounts.valueEvidenceLinks = 0;
    identityNoLinkBase.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(identityNoLinkBase.payload),
    );
    core.assertBackupEnvelope(identityNoLinkBase);
    const identityNoLinkCases: Array<{
      name: string;
      mutate: (candidate: typeof backup) => void;
    }> = [
      {
        name: "identityAtArbitraryId",
        mutate(candidate) {
          const identity = candidate.payload.settings.find(
            (setting) =>
              setting.settingType ===
              localTeacherIdentity.LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
          );
          if (!identity) throw new Error("Kurgu yerel öğretmen kimliği bulunamadı.");
          identity.id = "00000000-0000-4000-9000-000000009993";
        },
      },
      {
        name: "reservedIdCollision",
        mutate(candidate) {
          const identity = candidate.payload.settings.find(
            (setting) =>
              setting.id ===
              localTeacherIdentity.LOCAL_TEACHER_IDENTITY_SETTING_ID,
          );
          if (!identity) throw new Error("Kurgu ayrılmış ayar bulunamadı.");
          delete identity.teacherUserId;
          identity.settingType = classroomDomain.ACTIVE_CLASSROOM_SETTING_TYPE;
          identity.academicYearId = yearId;
          identity.classroomId = classroomId;
        },
      },
      {
        name: "duplicateIdentityAlias",
        mutate(candidate) {
          const identity = candidate.payload.settings.find(
            (setting) =>
              setting.settingType ===
              localTeacherIdentity.LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
          );
          if (!identity) throw new Error("Kurgu yerel öğretmen kimliği bulunamadı.");
          candidate.payload.settings.push({
            ...structuredClone(identity),
            id: "00000000-0000-4000-9000-000000009994",
          });
          candidate.manifest.entityCounts.settings += 1;
        },
      },
      {
        name: "identityMissingDeletedAt",
        mutate(candidate) {
          const identity = candidate.payload.settings.find(
            (setting) =>
              setting.settingType ===
              localTeacherIdentity.LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
          );
          if (!identity) throw new Error("Kurgu yerel öğretmen kimliği bulunamadı.");
          delete identity.deletedAt;
        },
      },
      {
        name: "identityDeletedBeforeCreated",
        mutate(candidate) {
          const identity = candidate.payload.settings.find(
            (setting) =>
              setting.settingType ===
              localTeacherIdentity.LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
          );
          if (!identity) throw new Error("Kurgu yerel öğretmen kimliği bulunamadı.");
          identity.deletedAt = "2026-09-01T06:00:00.000Z";
        },
      },
    ];
    const identityNoLinkResults = [];
    for (const invalidCase of identityNoLinkCases) {
      const candidate = structuredClone(identityNoLinkBase);
      invalidCase.mutate(candidate);
      candidate.manifest.payloadChecksum = await core.sha256Hex(
        core.canonicalJson(candidate.payload),
      );
      let errorMessage = "";
      try {
        await targetService.restoreBackup(candidate, {
          mode: "replace",
          createRecoverySnapshot: false,
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }
      identityNoLinkResults.push({
        name: invalidCase.name,
        errorMessage,
        unchanged:
          core.canonicalJson(await target.readSnapshot()) === baselineTarget,
      });
    }
    const mergePreimage = structuredClone(withoutLinks);
    const dailyPlan = mergePreimage.plans.find((plan) => plan.id === planId);
    const activity = mergePreimage.activities.find((item) => item.id === activityId);
    if (!dailyPlan || !activity) throw new Error("Kurgu merge günlük zinciri yok.");
    const mutateReflectionPrompt = (template: unknown): void => {
      if (!template || typeof template !== "object" || Array.isArray(template)) {
        throw new Error("Kurgu uygulanan template bulunamadı.");
      }
      const valuesDesign = (template as Record<string, unknown>).valuesDesign;
      if (!valuesDesign || typeof valuesDesign !== "object" || Array.isArray(valuesDesign)) {
        throw new Error("Kurgu valuesDesign bulunamadı.");
      }
      const mapping = (valuesDesign as Record<string, unknown>).mapping;
      if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
        throw new Error("Kurgu değer eşlemesi bulunamadı.");
      }
      (mapping as Record<string, unknown>).reflectionPrompt =
        "Merge hedefinde geçerli fakat farklı öğretmen yansıtma sorusu.";
    };
    mutateReflectionPrompt(dailyPlan.appliedActivityTemplateSnapshot);
    mutateReflectionPrompt(activity.appliedActivityTemplateSnapshot);
    for (const sourcePlanId of [
      dailyPlan.sourceMonthlyPlanId,
      dailyPlan.sourceWeeklyPlanId,
    ]) {
      const sourcePlan = mergePreimage.plans.find((plan) => plan.id === sourcePlanId);
      const storedTemplate = Array.isArray(sourcePlan?.premiumActivityTemplates)
        ? sourcePlan.premiumActivityTemplates.find(
            (template) =>
              template &&
              typeof template === "object" &&
              !Array.isArray(template) &&
              template.id === activity.appliedActivityTemplateId,
          )
        : undefined;
      mutateReflectionPrompt(storedTemplate);
    }
    await seedPayload(mergeTarget, mergePreimage);
    const mergeBefore = core.canonicalJson(await mergeTarget.readSnapshot());
    let mergeDigestError = "";
    try {
      await new core.BackupService(mergeTarget, {
        appVersion: "value-evidence-merge-test",
      }).restoreBackup(backup, {
        mode: "merge",
        createRecoverySnapshot: false,
      });
    } catch (error) {
      mergeDigestError = error instanceof Error ? error.message : String(error);
    }
    const mergeAfter = await mergeTarget.readSnapshot();

    const makeDriftingStore = (
      targetStore: typeof driftMergeTarget,
      changedName: string,
    ): LocalDataStore => {
      let injectDrift = true;
      return {
        async transaction<T>(
          mode: TransactionMode,
          collections: readonly CollectionName[],
          task: (transaction: DataTransaction) => Promise<T>,
        ): Promise<T> {
          if (mode === "readwrite" && injectDrift) {
            injectDrift = false;
            const beforeDrift = await targetStore.readSnapshot();
            const student = beforeDrift.students.find(
              (item) => item.id === studentId,
            );
            if (!student) throw new Error("Kurgu drift öğrencisi bulunamadı.");
            await targetStore.transaction(
              "readwrite",
              ["students"],
              (transaction) =>
                transaction.putMany("students", [{
                  ...student,
                  displayName: changedName,
                  updatedAt: "2026-09-10T09:00:00.000Z",
                }]),
            );
          }
          return targetStore.transaction(mode, collections, task);
        },
        readSnapshot: () => targetStore.readSnapshot(),
        close: () => undefined,
      };
    };
    await seedPayload(driftMergeTarget, withoutLinks);
    await seedPayload(driftReplaceTarget, withoutLinks);
    let mergeDriftError = "";
    try {
      await new core.BackupService(
        makeDriftingStore(driftMergeTarget, "Eşzamanlı Merge Değişikliği"),
        { appVersion: "value-evidence-drift-merge-test" },
      ).restoreBackup(backup, {
        mode: "merge",
        createRecoverySnapshot: false,
      });
    } catch (error) {
      mergeDriftError = error instanceof Error ? error.message : String(error);
    }
    let replaceDriftError = "";
    try {
      await new core.BackupService(
        makeDriftingStore(driftReplaceTarget, "Eşzamanlı Replace Değişikliği"),
        { appVersion: "value-evidence-drift-replace-test" },
      ).restoreBackup(backup, {
        mode: "replace",
        createRecoverySnapshot: false,
      });
    } catch (error) {
      replaceDriftError = error instanceof Error ? error.message : String(error);
    }
    const mergeDriftAfter = await driftMergeTarget.readSnapshot();
    const replaceDriftAfter = await driftReplaceTarget.readSnapshot();
    const response = {
      version: backup.manifest.dataSchemaVersion,
      roundTripLinks: restored.valueEvidenceLinks,
      expectedLinks: backup.payload.valueEvidenceLinks,
      firstLinkId: firstLink.id,
      predecessorDeletedAt: corrected.tombstone.deletedAt,
      replacementConfirmedAt: corrected.replacement.confirmedAt,
      replacementSupersedes: corrected.replacement.supersedesLinkId,
      replacementCivilDate: corrected.replacement.civilDate,
      replacementRole: corrected.replacement.evidenceRole,
      replacementRationale: corrected.replacement.teacherRationale,
      linkedDossierValueEvidenceIds: (
        backup.payload.exportPackages.find(
          (item) => item.id === linkedDossier.exportPackageId,
        )?.includedEntityIds as Record<string, string[]> | undefined
      )?.valueEvidenceLinks,
      historicalDossierValueEvidenceIds: (
        backup.payload.exportPackages.find(
          (item) => item.id === historicalDossier.exportPackageId,
        )?.includedEntityIds as Record<string, string[]> | undefined
      )?.valueEvidenceLinks,
      secondDossierIncludedEntityIds: backup.payload.exportPackages.find(
        (item) => item.id === secondDossier.exportPackageId,
      )?.includedEntityIds,
      expectedSecondFeedbackId: secondFeedback.id,
      upgradedLegacyDossierKeys: upgradedLegacyDossier.payload.exportPackages
        .filter((item) => item.type === "student_dossier")
        .map((item) => Object.keys(item.includedEntityIds).sort()),
      negativeResults,
      identityNoLinkResults,
      mergeDigestError,
      mergeUnchanged:
        core.canonicalJson(mergeAfter) === mergeBefore &&
        mergeAfter.valueEvidenceLinks.length === 0,
      mergeDriftError,
      mergeDriftName: mergeDriftAfter.students.find(
        (item) => item.id === studentId,
      )?.displayName,
      mergeDriftLinkCount: mergeDriftAfter.valueEvidenceLinks.length,
      replaceDriftError,
      replaceDriftName: replaceDriftAfter.students.find(
        (item) => item.id === studentId,
      )?.displayName,
      replaceDriftLinkCount: replaceDriftAfter.valueEvidenceLinks.length,
    };
    source.close();
    target.close();
    mergeTarget.close();
    driftMergeTarget.close();
    driftReplaceTarget.close();
    return response;
  }, premiumPlanSource);

  expect(result.version).toBe(5);
  expect(result.roundTripLinks).toEqual(result.expectedLinks);
  expect(result.roundTripLinks).toHaveLength(2);
  expect(result.predecessorDeletedAt).toBe(result.replacementConfirmedAt);
  expect(result.replacementSupersedes).toBe(result.firstLinkId);
  expect(result.replacementCivilDate).toBe("2026-09-09");
  expect(result.replacementRole).toBe("context_only");
  expect(result.replacementRationale).toContain("kültürel bağlam");
  expect(result.linkedDossierValueEvidenceIds).toEqual([
    result.roundTripLinks.find((item) => item.deletedAt === null)?.id,
  ]);
  expect(result.historicalDossierValueEvidenceIds).toEqual([
    result.firstLinkId,
  ]);
  expect(result.secondDossierIncludedEntityIds).toMatchObject({
    observations: ["00000000-0000-4000-8000-000000009909"],
    attendanceRecords: ["00000000-0000-4000-8000-000000009911"],
    portfolioSelections: ["00000000-0000-4000-8000-000000009913"],
    externalFeedback: [result.expectedSecondFeedbackId],
    mediaAssets: [],
    valueEvidenceLinks: [],
  });
  expect(
    result.upgradedLegacyDossierKeys.every(
      (keys) =>
        JSON.stringify(keys) ===
        JSON.stringify([
          "attendanceRecords",
          "externalFeedback",
          "mediaAssets",
          "observations",
          "portfolioSelections",
          "valueEvidenceLinks",
        ]),
    ),
  ).toBe(true);
  expect(result.negativeResults.map((item) => item.name)).toEqual([
    "unexpectedField",
    "unknownNestedContentField",
    "multiChildObservation",
    "studentMismatch",
    "scopeMismatch",
    "actorMismatch",
    "actorCreatedAfterConfirmation",
    "deletedActor",
    "crossStudentDossierValueLink",
    "crossStudentDossierObservation",
    "crossStudentDossierAttendance",
    "crossStudentDossierPortfolio",
    "crossStudentDossierExternalFeedback",
    "missingDossierIncludedGroup",
    "dossierIncludeFlagMismatch",
    "dossierMediaFailClosed",
    "manifestGeneratedAtMismatch",
    "historicalLinkDeletedBeforePackage",
    "targetMismatch",
    "civilDateMismatch",
    "rawObservationRationale",
    "sensitiveRawObservation",
    "unsafeWeeklyNarrative",
    "unsafeWeeklySourceObservationOnly",
    "futureWeeklySourceObservation",
    "nonCanonicalRationale",
    "nfdRationale",
    "scoreRationale",
    "beliefAsSupport",
    "duplicateActiveTarget",
    "selfSupersede",
    "cycle",
    "activePredecessor",
    "tombstoneTimestamp",
    "noOpSupersede",
    "branchedSupersede",
    "designDigest",
    "forgedPackWithoutLineage",
  ]);
  expect(
    result.negativeResults.every(
      (item) => item.errorMessage.length > 0 && item.unchanged,
    ),
  ).toBe(true);
  expect(result.identityNoLinkResults.map((item) => item.name)).toEqual([
    "identityAtArbitraryId",
    "reservedIdCollision",
    "duplicateIdentityAlias",
    "identityMissingDeletedAt",
    "identityDeletedBeforeCreated",
  ]);
  expect(
    result.identityNoLinkResults.every(
      (item) => item.errorMessage.length > 0 && item.unchanged,
    ),
  ).toBe(true);
  expect(
    result.identityNoLinkResults
      .slice(0, 3)
      .every((item) => item.errorMessage.includes("ayrılmış ayar kimliği")),
  ).toBe(true);
  expect(
    result.identityNoLinkResults
      .slice(3)
      .every((item) => item.errorMessage.includes("zaman çizelgesi")),
  ).toBe(true);
  expect(
    result.negativeResults.find((item) => item.name === "designDigest")
      ?.errorMessage,
  ).toContain("applied valuesDesign digest");
  expect(
    result.negativeResults.find(
      (item) => item.name === "unknownNestedContentField",
    )?.errorMessage,
  ).toContain("beklenmeyen alan");
  expect(
    result.negativeResults.find((item) => item.name === "beliefAsSupport")
      ?.errorMessage,
  ).toContain("supports/contrasts");
  expect(result.mergeDigestError).toContain("applied valuesDesign digest");
  expect(result.mergeUnchanged).toBe(true);
  expect(result.mergeDriftError).toContain("Merge geri yükleme kaynağı");
  expect(result.mergeDriftName).toBe("Eşzamanlı Merge Değişikliği");
  expect(result.mergeDriftLinkCount).toBe(0);
  expect(result.replaceDriftError).toContain("Replace geri yükleme kaynağı");
  expect(result.replaceDriftName).toBe("Eşzamanlı Replace Değişikliği");
  expect(result.replaceDriftLinkCount).toBe(0);
});

test("kalıcı silme tek üyeli etkinliği kanonik tombstone yapar ve V5 yedek yeniden parse edilir", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const curriculum = await import(
      "/src/features/curriculum/curriculum-catalog.ts"
    );
    const lifecycle = await import(
      "/src/features/students/student-lifecycle.ts"
    );
    const store = new core.IndexedDbDataStore({
      databaseName: `maarifos-lifecycle-assignment-${crypto.randomUUID()}`,
    });
    const yearId = "00000000-0000-4000-8000-000000009951";
    const classroomId = "00000000-0000-4000-8000-000000009952";
    const studentId = "00000000-0000-4000-8000-000000009953";
    const planId = "00000000-0000-4000-8000-000000009954";
    const activityId = "00000000-0000-4000-8000-000000009955";
    const base = {
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 1,
    };
    const profile = {
      framework: "tymm" as const,
      programLabel: evidence.CURRICULUM_PROGRAM_LABELS.tymm,
      catalogId: "tymm-2024-okul-oncesi-v1",
      sourceVersion: "2024.1",
      referenceOrigin: "teacher-declared" as const,
      officialCatalogVerified: false,
    };
    await store.transaction(
      "readwrite",
      ["academicYears", "classrooms", "settings", "students"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: yearId,
          name: "2026–2027 Eğitim Yılı",
          startDate: "2026-09-01",
          endDate: "2027-06-30",
          status: "active",
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: classroomId,
          academicYearId: yearId,
          name: "Kalıcı Silme Yedek Sınıfı",
          curriculumProfileSnapshot: profile,
          schemaVersion: 2,
        }]);
        await transaction.putMany("settings", [{
          ...base,
          id: core.ACTIVE_CLASSROOM_SETTING_ID,
          settingType: core.ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId: yearId,
          classroomId,
        }]);
        await transaction.putMany("students", [{
          ...base,
          id: studentId,
          displayName: "Ada Silme Kurgusu",
          firstName: "Ada",
          lastName: "Silme Kurgusu",
          profileSchemaVersion: 5,
          academicYearId: yearId,
          classroomId,
          active: true,
          enrollmentStatus: "active",
          schemaVersion: 5,
        }]);
      },
    );
    const target = curriculum
      .curriculumTargetsForProfile(profile)
      .find((item) => item.referenceCode === "FAB.1");
    if (!target) throw new Error("Kurgu program hedefi bulunamadı.");
    await evidence.createPlanWithActivity(store, {
      civilDate: "2026-09-02",
      planId,
      planTitle: "Tek üyeli silme planı",
      activityId,
      activityTitle: "Tek üyeli silme etkinliği",
      startTime: "09:00",
      curriculumProfile: profile,
      curriculumTargets: [target],
      assignmentMode: "selected-students",
      studentIds: [studentId],
      now: new Date("2026-09-02T06:00:00.000Z"),
    });
    await store.transaction("readwrite", ["students"], async (transaction) => {
      const students = await transaction.getAll("students");
      const student = students.find((record) => record.id === studentId);
      if (!student) throw new Error("Kurgu öğrenci bulunamadı.");
      await transaction.putMany("students", [{
        ...student,
        active: false,
        enrollmentStatus: "left",
        updatedAt: "2026-09-30T08:00:00.000Z",
      }]);
    });
    await lifecycle.permanentlyDeleteArchivedStudent(store, {
      studentId,
      confirmationName: "Ada Silme Kurgusu",
      now: new Date("2026-10-01T08:00:00.000Z"),
    });
    const snapshot = await store.readSnapshot();
    const service = new core.BackupService(store, {
      appVersion: "student-lifecycle-assignment-regression",
      clock: () => new Date("2026-10-01T09:00:00.000Z"),
    });
    const backup = await service.exportBackup();
    const reparsed = await service.parseAndVerifyBackup(
      service.serializeBackup(backup),
    );
    const activity = snapshot.activities.find((record) => record.id === activityId);
    const plan = snapshot.plans.find((record) => record.id === planId);
    const reparsedActivity = reparsed.payload.activities.find(
      (record) => record.id === activityId,
    );
    store.close();
    return {
      studentCount: snapshot.students.length,
      activity,
      plan,
      reparsedActivity,
    };
  });

  expect(result.studentCount).toBe(0);
  expect(result.activity).toMatchObject({
    studentIds: [],
    targetAssignments: [],
    updatedAt: "2026-10-01T08:00:00.000Z",
    deletedAt: "2026-10-01T08:00:00.000Z",
  });
  expect(result.activity?.assignmentMode).toBeUndefined();
  expect(result.activity?.assignmentSnapshotAt).toBeUndefined();
  expect(result.activity?.coverageStatus).toBeUndefined();
  expect(result.plan).toMatchObject({
    studentIds: [],
    deletedAt: "2026-10-01T08:00:00.000Z",
  });
  expect(result.plan?.assignmentMode).toBeUndefined();
  expect(result.plan?.assignmentSnapshotAt).toBeUndefined();
  expect(result.plan?.coverageStatus).toBeUndefined();
  expect(result.reparsedActivity).toEqual(result.activity);
});

test("geçersiz kaynak kaydı dışa aktarmaz; bozuk sayaç restore öncesi reddedilir", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-count-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-count-target-${crypto.randomUUID()}`,
    });
    const invalidSource = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-invalid-source-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-07-22T06:00:00.000Z",
      updatedAt: "2026-07-22T06:00:00.000Z",
      civilDate: "2026-07-22",
      schemaVersion: 1,
    };
    const sourceRecord = {
      ...base,
      id: "00000000-0000-4000-8000-000000000031",
      displayName: "Yedek Test Kaydı",
    };
    const targetRecord = {
      ...base,
      id: "00000000-0000-4000-8000-000000000032",
      displayName: "Korunacak Test Kaydı",
    };
    await source.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [sourceRecord]),
    );
    await target.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [targetRecord]),
    );
    await invalidSource.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [{ ...sourceRecord, id: "s-01" }]),
    );

    const backup = await new core.BackupService(source, {
      appVersion: "test",
    }).exportBackup();
    const tampered = structuredClone(backup);
    tampered.manifest.entityCounts.students = 2;
    const targetService = new core.BackupService(target, { appVersion: "test" });
    const before = await target.readSnapshot();
    let restoreError = "";
    try {
      await targetService.restoreBackup(tampered, { mode: "replace" });
    } catch (error) {
      restoreError = error instanceof Error ? error.message : String(error);
    }
    const after = await target.readSnapshot();

    let exportError = "";
    try {
      await new core.BackupService(invalidSource, {
        appVersion: "test",
      }).exportBackup();
    } catch (error) {
      exportError = error instanceof Error ? error.message : String(error);
    }
    source.close();
    target.close();
    invalidSource.close();
    return { before, after, restoreError, exportError };
  });

  expect(result.restoreError).toContain("kayıt sayısı manifest ile uyuşmuyor");
  expect(result.after).toEqual(result.before);
  expect(result.exportError).toContain("geçersiz UUID");
});

test("merge aynı kaydı atlar, farklı içeriği çakışma olarak raporlar", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-merge-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-merge-target-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-07-22T06:00:00.000Z",
      updatedAt: "2026-07-22T06:00:00.000Z",
      civilDate: "2026-07-22",
      schemaVersion: 1,
    };
    const same = {
      ...base,
      id: "00000000-0000-4000-8000-000000000011",
      displayName: "Test Kaydı Aynı",
    };
    const conflictSource = {
      ...base,
      id: "00000000-0000-4000-8000-000000000012",
      displayName: "Yedekteki Test Kaydı",
    };
    const inserted = {
      ...base,
      id: "00000000-0000-4000-8000-000000000013",
      displayName: "Yeni Test Kaydı",
    };
    await source.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [same, conflictSource, inserted]),
    );
    await target.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [
        same,
        { ...conflictSource, displayName: "Cihazdaki Test Kaydı" },
      ]),
    );
    const sourceService = new core.BackupService(source, { appVersion: "test" });
    const targetService = new core.BackupService(target, { appVersion: "test" });
    const backup = await sourceService.exportBackup();
    const report = await targetService.restoreBackup(backup, {
      mode: "merge",
    });
    const secondReport = await targetService.restoreBackup(backup, {
      mode: "merge",
    });
    const records = (await target.readSnapshot()).students;
    source.close();
    target.close();
    return { report, secondReport, records };
  });

  expect(result.report.inserted).toBe(1);
  expect(result.report.skipped).toBe(1);
  expect(result.report.conflicts).toEqual([
    {
      collection: "students",
      id: "00000000-0000-4000-8000-000000000012",
      reason: "same-id-different-data",
    },
  ]);
  expect(result.secondReport.inserted).toBe(0);
  expect(result.secondReport.skipped).toBe(2);
  expect(result.secondReport.conflicts).toEqual(result.report.conflicts);
  expect(result.records).toHaveLength(3);
  expect(
    result.records.find(
      (record) => record.id === "00000000-0000-4000-8000-000000000012",
    )?.displayName,
  ).toBe("Cihazdaki Test Kaydı");
});

test("replace koleksiyonları değiştirir ve IndexedDB hatasında işlemi geri alır", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-replace-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-replace-target-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-07-22T06:00:00.000Z",
      updatedAt: "2026-07-22T06:00:00.000Z",
      civilDate: "2026-07-22",
      schemaVersion: 1,
    };
    const original = {
      ...base,
      id: "00000000-0000-4000-8000-000000000021",
      displayName: "Eski Test Kaydı",
    };
    const restored = {
      ...base,
      id: "00000000-0000-4000-8000-000000000022",
      displayName: "Yedekten Gelen Test Kaydı",
    };
    await source.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [restored]),
    );
    await target.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [original]),
    );
    const backup = await new core.BackupService(source, {
      appVersion: "test",
    }).exportBackup();
    const report = await new core.BackupService(target, {
      appVersion: "test",
    }).restoreBackup(backup, { mode: "replace" });
    const afterReplace = (await target.readSnapshot()).students;

    let rollbackError = "";
    try {
      await target.transaction("readwrite", ["students"], async (transaction) => {
        await transaction.clear("students");
        await transaction.putMany("students", [
          {
            ...base,
            displayName: "Kimliksiz Geçersiz Test Kaydı",
          },
        ]);
      });
    } catch (error) {
      rollbackError = error instanceof Error ? error.name : String(error);
    }
    const afterRollback = (await target.readSnapshot()).students;
    source.close();
    target.close();
    return { report, afterReplace, afterRollback, rollbackError };
  });

  expect(result.report.replaced).toBe(1);
  expect(result.report.inserted).toBe(1);
  expect(result.afterReplace.map((record) => record.displayName)).toEqual([
    "Yedekten Gelen Test Kaydı",
  ]);
  expect(result.rollbackError).not.toBe("");
  expect(result.afterRollback).toEqual(result.afterReplace);
});

test("sınıf çalışma düzenini yedekle geri yükler ve kopuk eğitim yılı bağını yazmadan reddeder", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-classroom-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-classroom-target-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-07-22T06:00:00.000Z",
      updatedAt: "2026-07-22T06:00:00.000Z",
      civilDate: "2026-07-22",
      deletedAt: null,
    };
    const academicYearId = "00000000-0000-4000-8000-000000000131";
    const classroomId = "00000000-0000-4000-8000-000000000132";
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "settings"],
      async (transaction) => {
        await transaction.putMany("academicYears", [
          {
            ...base,
            id: academicYearId,
            name: "2026-2027 Kurgu Eğitim Yılı",
            startDate: "2026-09-01",
            endDate: "2027-06-30",
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
            schedule: core.normalizeClassroomSchedule({
              kind: "morning",
              startTime: "08:30",
              endTime: "12:30",
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
      },
    );

    const sourceService = new core.BackupService(source, { appVersion: "test" });
    const targetService = new core.BackupService(target, { appVersion: "test" });
    const backup = await sourceService.exportBackup();
    const report = await targetService.restoreBackup(backup, { mode: "replace" });
    const restored = await target.readSnapshot();
    const beforeInvalidRestore = await target.readSnapshot();
    const orphaned = structuredClone(backup);
    orphaned.payload.classrooms[0].academicYearId = "00000000-0000-4000-8000-000000000139";
    orphaned.manifest.payloadChecksum = await core.sha256Hex(core.canonicalJson(orphaned.payload));

    let orphanError = "";
    try {
      await targetService.restoreBackup(orphaned, { mode: "replace" });
    } catch (error) {
      orphanError = error instanceof Error ? error.message : String(error);
    }
    const afterInvalidRestore = await target.readSnapshot();
    source.close();
    target.close();
    return {
      report,
      entityCounts: backup.manifest.entityCounts,
      classroom: restored.classrooms[0],
      activeClassroom: restored.settings[0],
      beforeInvalidRestore,
      afterInvalidRestore,
      orphanError,
    };
  });

  expect(result.report.inserted).toBe(3);
  expect(result.entityCounts.academicYears).toBe(1);
  expect(result.entityCounts.classrooms).toBe(1);
  expect(result.entityCounts.settings).toBe(1);
  expect(result.classroom).toMatchObject({
    academicYearId: "00000000-0000-4000-8000-000000000131",
    schemaVersion: 2,
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
      timeZone: "Europe/Istanbul",
    },
  });
  expect(result.activeClassroom).toMatchObject({
    settingType: "active-classroom-selection",
    academicYearId: "00000000-0000-4000-8000-000000000131",
    classroomId: "00000000-0000-4000-8000-000000000132",
  });
  expect(result.orphanError).toContain("bilinmeyen eğitim yılına bağlı");
  expect(result.afterInvalidRestore).toEqual(result.beforeInvalidRestore);
});

test("çapraz sınıf yoklama ve gözlem ilişkilerini restore öncesi reddedip hedefi değiştirmez", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-scope-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-scope-target-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-07-22T06:00:00.000Z",
      updatedAt: "2026-07-22T06:00:00.000Z",
      civilDate: "2026-07-22",
      deletedAt: null,
      schemaVersion: 1,
    };
    const yearA = "00000000-0000-4000-8000-000000000151";
    const classA = "00000000-0000-4000-8000-000000000152";
    const yearB = "00000000-0000-4000-8000-000000000153";
    const classB = "00000000-0000-4000-8000-000000000154";
    const studentA = "00000000-0000-4000-8000-000000000155";
    const studentB = "00000000-0000-4000-8000-000000000156";
    const attendanceId = "00000000-0000-4000-8000-000000000157";
    const observationId = "00000000-0000-4000-8000-000000000158";
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "students", "attendanceRecords", "observations", "activities"],
      async (transaction) => {
        await transaction.putMany("academicYears", [
          { ...base, id: yearA, name: "Kurgu A Eğitim Yılı", startDate: "2026-09-01", endDate: "2027-06-30" },
          { ...base, id: yearB, name: "Kurgu B Eğitim Yılı", startDate: "2026-09-01", endDate: "2027-06-30" },
        ]);
        await transaction.putMany("classrooms", [
          { ...base, id: classA, academicYearId: yearA, name: "Kurgu A Sınıfı", schemaVersion: 2 },
          { ...base, id: classB, academicYearId: yearB, name: "Kurgu B Sınıfı", schemaVersion: 2 },
        ]);
        await transaction.putMany("students", [
          { ...base, id: studentA, displayName: "Kurgu A Öğrencisi", classroomId: classA, academicYearId: yearA },
          { ...base, id: studentB, displayName: "Kurgu B Öğrencisi", classroomId: classB, academicYearId: yearB },
        ]);
        await transaction.putMany("attendanceRecords", [
          {
            ...base,
            id: attendanceId,
            studentId: studentA,
            status: "present",
            classroomId: classA,
            academicYearId: yearA,
          },
        ]);
        await transaction.putMany("observations", [
          {
            ...base,
            id: observationId,
            studentIds: [studentA],
            rawText: "Kurgu A ham gözlemi.",
            observedAt: "2026-07-22T06:15:00.000Z",
            classroomId: classA,
            academicYearId: yearA,
          },
        ]);
        await transaction.putMany("activities", [
          {
            ...base,
            id: "00000000-0000-4000-8000-000000000159",
            title: "Sınıfı belirsiz eski etkinlik",
            legacyAssignmentStatus: "needs-review",
          },
        ]);
      },
    );
    await target.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [
        {
          ...base,
          id: "00000000-0000-4000-8000-000000000160",
          displayName: "Hedefte korunacak kurgu kayıt",
        },
      ]),
    );

    const sourceService = new core.BackupService(source, { appVersion: "test" });
    const targetService = new core.BackupService(target, { appVersion: "test" });
    const validBackup = await sourceService.exportBackup();
    const before = await target.readSnapshot();

    const legacyBackup = structuredClone(validBackup);
    for (const record of [
      legacyBackup.payload.students[0],
      legacyBackup.payload.attendanceRecords[0],
      legacyBackup.payload.observations[0],
    ]) {
      delete record.classroomId;
      delete record.academicYearId;
    }
    legacyBackup.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(legacyBackup.payload),
    );
    const normalizedLegacy = await targetService.parseAndVerifyBackup(legacyBackup);

    const badAttendance = structuredClone(validBackup);
    badAttendance.payload.attendanceRecords[0].classroomId = classB;
    badAttendance.payload.attendanceRecords[0].academicYearId = yearB;
    badAttendance.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(badAttendance.payload),
    );
    let attendanceError = "";
    try {
      await targetService.restoreBackup(badAttendance, { mode: "replace" });
    } catch (error) {
      attendanceError = error instanceof Error ? error.message : String(error);
    }

    const badObservation = structuredClone(validBackup);
    badObservation.payload.observations[0].classroomId = classB;
    badObservation.payload.observations[0].academicYearId = yearB;
    badObservation.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(badObservation.payload),
    );
    let observationError = "";
    try {
      await targetService.restoreBackup(badObservation, { mode: "replace" });
    } catch (error) {
      observationError = error instanceof Error ? error.message : String(error);
    }
    const after = await target.readSnapshot();
    source.close();
    target.close();
    return {
      attendanceError,
      observationError,
      before,
      after,
      quarantinedActivity: validBackup.payload.activities[0],
      normalizedLegacy: {
        student: normalizedLegacy.payload.students[0],
        attendance: normalizedLegacy.payload.attendanceRecords[0],
        observation: normalizedLegacy.payload.observations[0],
      },
    };
  });

  expect(result.attendanceError).toContain("öğrenci sınıf kapsamıyla uyuşmuyor");
  expect(result.observationError).toContain("öğrenci sınıf kapsamıyla uyuşmuyor");
  expect(result.after).toEqual(result.before);
  expect(result.quarantinedActivity).toMatchObject({
    legacyAssignmentStatus: "needs-review",
  });
  expect(result.normalizedLegacy.student).toMatchObject({
    legacyAssignmentStatus: "needs-review",
  });
  expect(result.normalizedLegacy.attendance).toMatchObject({
    legacyAssignmentStatus: "needs-review",
  });
  expect(result.normalizedLegacy.observation).toMatchObject({
    legacyAssignmentStatus: "needs-review",
    rawText: "Kurgu A ham gözlemi.",
  });
});

test("D1 plan-etkinlik-ham gözlem-onay-taslak grafını V3 yedekle birebir geri yükler", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const curriculum = await import(
      "/src/features/curriculum/curriculum-catalog.ts"
    );
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-d1-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-d1-target-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 1,
    };
    const yearId = "00000000-0000-4000-8000-000000000171";
    const classroomId = "00000000-0000-4000-8000-000000000172";
    const studentId = "00000000-0000-4000-8000-000000000173";
    const planId = "00000000-0000-4000-8000-000000000174";
    const activityId = "00000000-0000-4000-8000-000000000175";
    const observationId = "00000000-0000-4000-8000-000000000176";
    const draftId = "00000000-0000-4000-8000-000000000177";
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "students", "settings"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: yearId,
          name: "2026-2027 Eğitim Yılı",
          startDate: "2026-09-01",
          endDate: "2027-06-30",
          status: "active",
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: classroomId,
          academicYearId: yearId,
          name: "Kurgu D1 Sınıfı",
          schemaVersion: 2,
          curriculumProfileSnapshot: {
            framework: "tymm",
            programLabel: evidence.CURRICULUM_PROGRAM_LABELS.tymm,
            catalogId: "tymm-2024-okul-oncesi-v1",
            sourceVersion: "2024.1",
            referenceOrigin: "teacher-declared",
            officialCatalogVerified: false,
          },
        }]);
        await transaction.putMany("students", [{
          ...base,
          id: studentId,
          displayName: "Kurgu D1 Öğrencisi",
          academicYearId: yearId,
          classroomId,
        }]);
        await transaction.putMany("settings", [{
          ...base,
          id: core.ACTIVE_CLASSROOM_SETTING_ID,
          settingType: core.ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId: yearId,
          classroomId,
        }]);
      },
    );
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
      .find((item) => item.referenceCode === "FAB.1");
    if (!curriculumTarget) throw new Error("Kurgu program hedefi bulunamadı.");
    await evidence.createPlanWithActivity(source, {
      civilDate: "2026-09-01",
      planId,
      planTitle: "Kurgu D1 planı",
      activityId,
      activityTitle: "Kurgu D1 etkinliği",
      startTime: "09:00",
      curriculumProfile,
      curriculumTargets: [curriculumTarget],
      assignmentMode: "whole-class",
      studentIds: [studentId],
      now: new Date("2026-09-01T06:10:00.000Z"),
    });
    const rawText = "  Boşluklarıyla aynen korunacak kurgu ham gözlem.  ";
    await evidence.captureImmutableRawObservation(source, {
      observationId,
      studentId,
      planId,
      activityId,
      rawText,
      observedAt: "2026-09-01T07:00:00.000Z",
      now: new Date("2026-09-01T07:01:00.000Z"),
    });
    const link = await evidence.confirmObservationCurriculumLink(source, {
      observationId,
      framework: "tymm",
      catalogId: "tymm-2024-okul-oncesi-v1",
      sourceVersion: "2024.1",
      referenceCode: "TYMM-OÖ-KURGU-01",
      referenceTitle: "Kurgu doğrulanmış referans",
      approvedByUserId: "00000000-0000-4000-9000-000000000178",
      now: new Date("2026-09-01T08:00:00.000Z"),
    });
    await evidence.createCitedAssessmentDraft(source, {
      draftId,
      studentId,
      observationIds: [observationId],
      teacherAssessmentText: "Öğretmenin kaynaklı kurgu değerlendirmesi.",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      now: new Date("2026-09-30T12:00:00.000Z"),
    });

    const backup = await new core.BackupService(source, {
      appVersion: "d1-test",
      clock: () => new Date("2026-10-01T09:00:00.000Z"),
    }).exportBackup();
    const verificationService = new core.BackupService(source, {
      appVersion: "d1-test",
    });
    const integrityErrors: Record<string, string> = {};
    const mutations: Array<[
      string,
      (value: typeof backup) => void,
    ]> = [
      ["emptyTeacherAssessment", (value) => {
        value.payload.reportDrafts[0].teacherAssessmentText = "   ";
      }],
      ["invalidPeriod", (value) => {
        value.payload.reportDrafts[0].periodStart = "2026-02-30";
      }],
      ["observationOutsidePeriod", (value) => {
        value.payload.reportDrafts[0].periodStart = "2026-09-02";
      }],
      ["citationObservationMismatch", (value) => {
        value.payload.reportDrafts[0].evidenceCitations[0].observationId =
          "00000000-0000-4000-8000-000000000179";
      }],
      ["citationLinkMismatch", (value) => {
        value.payload.reportDrafts[0].evidenceCitations[0]
          .confirmedCurriculumLinkIds = [
            "00000000-0000-4000-8000-000000000179",
          ];
      }],
      ["generationMode", (value) => {
        value.payload.reportDrafts[0].generationMode = "automatic-summary";
      }],
      ["reviewStatus", (value) => {
        value.payload.reportDrafts[0].status = "approved";
      }],
      ["verificationStatus", (value) => {
        value.payload.reportDrafts[0].referenceVerificationStatus =
          "official-catalog-verified";
      }],
      ["provenance", (value) => {
        value.payload.evidenceCurriculumLinks[0].officialCatalogVerified = true;
      }],
      ["sourceVersion", (value) => {
        value.payload.evidenceCurriculumLinks[0].sourceVersion = "2024.2";
      }],
      ["assignmentStudent", (value) => {
        value.payload.activities[0].targetAssignments[0].studentId =
          "00000000-0000-4000-8000-000000000199";
      }],
    ];
    for (const [name, mutate] of mutations) {
      const invalid = structuredClone(backup);
      mutate(invalid);
      invalid.manifest.payloadChecksum = await core.sha256Hex(
        core.canonicalJson(invalid.payload),
      );
      try {
        await verificationService.parseAndVerifyBackup(invalid);
      } catch (error) {
        integrityErrors[name] =
          error instanceof Error ? error.message : String(error);
      }
    }
    const legacyProvenance = structuredClone(backup);
    delete legacyProvenance.payload.classrooms[0].curriculumProfileSnapshot
      .referenceOrigin;
    delete legacyProvenance.payload.classrooms[0].curriculumProfileSnapshot
      .officialCatalogVerified;
    delete legacyProvenance.payload.plans[0].curriculumProfileSnapshot
      .referenceOrigin;
    delete legacyProvenance.payload.plans[0].curriculumProfileSnapshot
      .officialCatalogVerified;
    delete legacyProvenance.payload.evidenceCurriculumLinks[0].referenceOrigin;
    delete legacyProvenance.payload.evidenceCurriculumLinks[0]
      .officialCatalogVerified;
    delete legacyProvenance.payload.reportDrafts[0].referenceVerificationStatus;
    legacyProvenance.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(legacyProvenance.payload),
    );
    const legacyVerified =
      await verificationService.parseAndVerifyBackup(legacyProvenance);
    await new core.BackupService(target, { appVersion: "d1-test" }).restoreBackup(
      backup,
      { mode: "replace" },
    );
    const restored = await target.readSnapshot();
    source.close();
    target.close();
    return {
      dataSchemaVersion: backup.manifest.dataSchemaVersion,
      rawText: restored.observations[0].rawText,
      observationId: restored.observations[0].id,
      link: restored.evidenceCurriculumLinks[0],
      draft: restored.reportDrafts[0],
      expectedLinkId: link.id,
      integrityErrors,
      legacyVerified: {
        planCount: legacyVerified.payload.plans.length,
        linkCount: legacyVerified.payload.evidenceCurriculumLinks.length,
        draftCount: legacyVerified.payload.reportDrafts.length,
      },
    };
  });

  expect(result.dataSchemaVersion).toBe(5);
  expect(result.rawText).toBe("  Boşluklarıyla aynen korunacak kurgu ham gözlem.  ");
  expect(result.observationId).toBe("00000000-0000-4000-8000-000000000176");
  expect(result.link.id).toBe(result.expectedLinkId);
  expect(result.link.confirmationMethod).toBe("teacher-confirmed");
  expect(result.link).toMatchObject({
    referenceOrigin: "teacher-declared",
    officialCatalogVerified: false,
  });
  expect(result.draft).toMatchObject({
    reviewStatus: "pending",
    authoredBy: "teacher",
    teacherReviewRequired: true,
    observationIds: ["00000000-0000-4000-8000-000000000176"],
    generationMode: "teacher-authored-cited-draft",
    referenceVerificationStatus: "teacher-declared-unverified",
  });
  expect(result.draft.evidenceCitations).toEqual([{
    observationId: "00000000-0000-4000-8000-000000000176",
    observedAt: "2026-09-01T07:00:00.000Z",
    confirmedCurriculumLinkIds: [result.expectedLinkId],
  }]);
  expect(Object.keys(result.integrityErrors).sort()).toEqual([
    "assignmentStudent",
    "citationLinkMismatch",
    "citationObservationMismatch",
    "emptyTeacherAssessment",
    "generationMode",
    "invalidPeriod",
    "observationOutsidePeriod",
    "provenance",
    "reviewStatus",
    "sourceVersion",
    "verificationStatus",
  ]);
  for (const error of Object.values(result.integrityErrors)) {
    expect(error).toMatch(/geçersiz|uymuyor/);
  }
  expect(result.legacyVerified).toEqual({
    planCount: 1,
    linkCount: 1,
    draftCount: 1,
  });
});

test("arşivlenmiş yılı ve aynı öğrencinin yeni yıl üyeliğini tek kimlikle round-trip yapar", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const archiveDomain = await import("/src/features/archive/academic-year-archive.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-archive-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-archive-target-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 1,
    };
    const year1 = "00000000-0000-4000-8000-000000000181";
    const class1 = "00000000-0000-4000-8000-000000000182";
    const studentId = "00000000-0000-4000-8000-000000000183";
    const year2 = "00000000-0000-4000-8000-000000000184";
    const class2 = "00000000-0000-4000-8000-000000000185";
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "students", "observations", "settings"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: year1,
          name: "2026-2027 Eğitim Yılı",
          startDate: "2026-09-01",
          endDate: "2027-06-30",
          status: "active",
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: class1,
          academicYearId: year1,
          name: "Kurgu Eski Yıl Sınıfı",
          schemaVersion: 2,
        }]);
        await transaction.putMany("students", [{
          ...base,
          id: studentId,
          displayName: "Kurgu Uzun Dönem Öğrencisi",
          academicYearId: year1,
          classroomId: class1,
          enrollmentStatus: "active",
        }]);
        await transaction.putMany("observations", [{
          ...base,
          id: "00000000-0000-4000-8000-000000000186",
          studentIds: [studentId],
          rawText: "Eski yıldan korunacak kurgu ham gözlem.",
          observedAt: "2026-09-01T07:00:00.000Z",
          academicYearId: year1,
          classroomId: class1,
        }]);
        await transaction.putMany("settings", [{
          ...base,
          id: core.ACTIVE_CLASSROOM_SETTING_ID,
          settingType: core.ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId: year1,
          classroomId: class1,
        }]);
      },
    );
    await archiveDomain.archiveAcademicYear(source, {
      academicYearId: year1,
      closedOn: "2027-06-30",
      now: new Date("2027-06-30T14:00:00.000Z"),
    });
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms"],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: year2,
          name: "2027-2028 Eğitim Yılı",
          startDate: "2027-09-01",
          endDate: "2028-06-30",
          status: "active",
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: class2,
          academicYearId: year2,
          name: "Kurgu Yeni Yıl Sınıfı",
          schemaVersion: 2,
        }]);
      },
    );
    await archiveDomain.reenrollArchivedStudent(source, {
      studentId,
      academicYearId: year2,
      classroomId: class2,
      startedOn: "2027-09-01",
      now: new Date("2027-09-01T06:00:00.000Z"),
    });
    const backup = await new core.BackupService(source, {
      appVersion: "archive-test",
    }).exportBackup();
    await new core.BackupService(target, {
      appVersion: "archive-test",
    }).restoreBackup(backup, { mode: "replace" });
    const restored = await target.readSnapshot();
    const studentArchive = await archiveDomain.buildStudentLongitudinalArchive(
      target,
      {
        studentId,
        now: new Date("2035-06-30T09:00:00.000Z"),
      },
    );
    source.close();
    target.close();
    return {
      studentCount: restored.students.length,
      student: restored.students[0],
      oldYear: restored.academicYears.find((record) => record.id === year1),
      observation: restored.observations[0],
      archiveEnrollmentCount: studentArchive.enrollments.length,
    };
  });

  expect(result.studentCount).toBe(1);
  expect(result.student.id).toBe("00000000-0000-4000-8000-000000000183");
  expect(result.student.enrollments.map((item: { status: string }) => item.status)).toEqual([
    "completed",
    "active",
  ]);
  expect(result.oldYear.status).toBe("archived");
  expect(result.observation.rawText).toBe("Eski yıldan korunacak kurgu ham gözlem.");
  expect(result.archiveEnrollmentCount).toBe(2);
});

test("öğrenciye özel hızlı gözlem taslağı ve tamamlanan ham alanlar yedekle geri gelir", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const quick = await import("/src/features/evidence/quick-observation.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-o1-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-o1-target-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-09-02T06:00:00.000Z",
      updatedAt: "2026-09-02T06:00:00.000Z",
      civilDate: "2026-09-02",
      deletedAt: null,
      schemaVersion: 1,
    };
    const yearId = "00000000-0000-4000-8000-000000000711";
    const classroomId = "00000000-0000-4000-8000-000000000712";
    const studentAId = "00000000-0000-4000-8000-000000000713";
    const studentBId = "00000000-0000-4000-8000-000000000714";
    const planId = "00000000-0000-4000-8000-000000000715";
    const activityId = "00000000-0000-4000-8000-000000000716";
    const observationId = "00000000-0000-4000-8000-000000000717";
    const batchId = "00000000-0000-4000-8000-000000000718";
    await source.transaction(
      "readwrite",
      [
        "academicYears",
        "classrooms",
        "students",
        "settings",
        "plans",
        "activities",
      ],
      async (transaction) => {
        await transaction.putMany("academicYears", [{
          ...base,
          id: yearId,
          name: "2026-2027 Eğitim Yılı",
          startDate: "2026-09-01",
          endDate: "2027-06-30",
          status: "active",
        }]);
        await transaction.putMany("classrooms", [{
          ...base,
          id: classroomId,
          academicYearId: yearId,
          name: "Kurgu O1 Sınıfı",
          schemaVersion: 2,
        }]);
        await transaction.putMany("students", [
          {
            ...base,
            id: studentAId,
            displayName: "Kurgu O1 Öğrencisi A",
            academicYearId: yearId,
            classroomId,
            enrollmentStatus: "active",
          },
          {
            ...base,
            id: studentBId,
            displayName: "Kurgu O1 Öğrencisi B",
            academicYearId: yearId,
            classroomId,
            enrollmentStatus: "active",
          },
        ]);
        await transaction.putMany("settings", [{
          ...base,
          id: core.ACTIVE_CLASSROOM_SETTING_ID,
          settingType: core.ACTIVE_CLASSROOM_SETTING_TYPE,
          academicYearId: yearId,
          classroomId,
        }]);
        await transaction.putMany("plans", [{
          ...base,
          id: planId,
          title: "Kurgu O1 planı",
          academicYearId: yearId,
          classroomId,
        }]);
        await transaction.putMany("activities", [{
          ...base,
          id: activityId,
          planId,
          title: "Kurgu O1 etkinliği",
          studentIds: [studentAId, studentBId],
          academicYearId: yearId,
          classroomId,
        }]);
      },
    );
    const exactRawText = "  Boşluklarıyla korunacak kurgu gözlem.  ";
    const exactContext = "  Serbest oyun sırasında  ";
    const exactChildQuote = "  “Aynı olanları buraya koydum.”  ";
    await quick.persistQuickObservationDraft(source, {
      studentId: studentAId,
      planId,
      activityId,
      rawText: exactRawText,
      context: exactContext,
      childQuote: exactChildQuote,
      observationType: "child-quote",
      categoryIds: ["cognitive", "language-communication"],
      now: new Date("2026-09-02T07:00:00.000Z"),
    });
    await quick.persistQuickObservationDraft(source, {
      studentId: studentBId,
      planId,
      activityId,
      rawText: "Yedekten dönecek öğrenciye özel canlı taslak.",
      observationType: "systematic",
      categoryIds: ["physical-health", "self-care"],
      now: new Date("2026-09-02T07:01:00.000Z"),
    });
    await quick.finalizeQuickObservationDraft(source, {
      studentId: studentAId,
      observationId,
      observedAt: "2026-09-02T07:05:00.000Z",
      now: new Date("2026-09-02T07:06:00.000Z"),
    });
    await quick.persistQuickObservationDraftBatch(source, {
      batchId,
      studentIds: [studentAId, studentBId],
      planId,
      activityId,
      rawText: "İki çocuk ortak yapıya sırayla birer parça ekledi.",
      context: "Blok oyunu sırasında",
      observationType: "anecdotal",
      categoryIds: ["play-participation"],
      now: new Date("2026-09-02T07:10:00.000Z"),
    });
    await quick.finalizeQuickObservationDraftBatch(source, {
      batchId,
      studentIds: [studentAId, studentBId],
      planId,
      activityId,
      observedAt: "2026-09-02T07:11:00.000Z",
      now: new Date("2026-09-02T07:12:00.000Z"),
    });
    await quick.persistQuickObservationDraft(source, {
      studentId: studentBId,
      planId,
      activityId,
      rawText: "Yedekten dönecek öğrenciye özel canlı taslak.",
      observationType: "systematic",
      categoryIds: ["physical-health", "self-care"],
      now: new Date("2026-09-02T07:13:00.000Z"),
    });

    const sourceBackupService = new core.BackupService(source, {
      appVersion: "o1-test",
      clock: () => new Date("2026-09-02T08:00:00.000Z"),
    });
    const backup = await sourceBackupService.exportBackup();
    const invalidBatch = structuredClone(backup);
    const invalidBatchObservation = invalidBatch.payload.observations.find(
      (record) => record.batchId === batchId,
    );
    invalidBatchObservation.batchId = "geçersiz-toplu-kimlik";
    invalidBatch.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(invalidBatch.payload),
    );
    let invalidBatchError = "";
    try {
      await sourceBackupService.parseAndVerifyBackup(invalidBatch);
    } catch (error) {
      invalidBatchError = error instanceof Error ? error.message : String(error);
    }
    await new core.BackupService(target, { appVersion: "o1-test" }).restoreBackup(
      backup,
      { mode: "replace" },
    );
    const restored = await target.readSnapshot();
    const restoredDraft = await quick.loadQuickObservationDraft(target, {
      studentId: studentBId,
    });
    source.close();
    target.close();
    return {
      observation: restored.observations[0],
      batchObservations: restored.observations.filter(
        (record) => record.batchId === batchId,
      ),
      draft: restoredDraft,
      settingsCount: backup.manifest.entityCounts.settings,
      invalidBatchError,
    };
  });

  expect(result.observation).toMatchObject({
    rawText: "  Boşluklarıyla korunacak kurgu gözlem.  ",
    context: "  Serbest oyun sırasında  ",
    childQuote: "  “Aynı olanları buraya koydum.”  ",
    observationType: "child-quote",
    observationCategories: ["cognitive", "language-communication"],
  });
  expect(result.draft).toMatchObject({
    studentId: "00000000-0000-4000-8000-000000000714",
    rawText: "Yedekten dönecek öğrenciye özel canlı taslak.",
    observationType: "systematic",
    categoryIds: ["physical-health", "self-care"],
  });
  expect(result.batchObservations).toHaveLength(2);
  expect(result.batchObservations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        batchId: "00000000-0000-4000-8000-000000000718",
        captureScope: "selected-children",
        rawText: "İki çocuk ortak yapıya sırayla birer parça ekledi.",
        rawTextImmutable: true,
      }),
    ]),
  );
  expect(result.invalidBatchError).toContain("hızlı gözlem alanları geçersiz");
  expect(result.settingsCount).toBe(5);
});

test("parolalı AES-GCM yedek doğru parolayla açılır; yanlış parola ve kurcalama reddedilir", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const store = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-encrypted-${crypto.randomUUID()}`,
    });
    await store.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [{
        id: "00000000-0000-4000-8000-000000000901",
        createdAt: "2026-09-10T06:00:00.000Z",
        updatedAt: "2026-09-10T06:00:00.000Z",
        civilDate: "2026-09-10",
        deletedAt: null,
        schemaVersion: 1,
        displayName: "Kurgu Şifreli Yedek Öğrencisi",
      }]),
    );
    const service = new core.BackupService(store, {
      appVersion: "encrypted-test",
      clock: () => new Date("2026-09-10T08:00:00.000Z"),
      civilDateProvider: () => "2026-09-10",
    });
    const passphrase = "ÇokGüçlü-Yedek-2026!";
    const encrypted = await service.exportEncryptedBackup(passphrase);
    const serialized = service.serializeEncryptedBackup(encrypted);
    const decrypted = await service.parseAndDecryptBackup(serialized, passphrase);

    let wrongPasswordError = "";
    try {
      await service.parseAndDecryptBackup(serialized, "Yanlış-Parola-2026!");
    } catch (error) {
      wrongPasswordError = error instanceof Error ? error.message : String(error);
    }

    const tamperedCiphertext = structuredClone(encrypted);
    const replacement = tamperedCiphertext.ciphertext[12] === "A" ? "B" : "A";
    tamperedCiphertext.ciphertext =
      tamperedCiphertext.ciphertext.slice(0, 12) +
      replacement +
      tamperedCiphertext.ciphertext.slice(13);
    let tamperError = "";
    try {
      await service.parseAndDecryptBackup(tamperedCiphertext, passphrase);
    } catch (error) {
      tamperError = error instanceof Error ? error.message : String(error);
    }

    const tamperedHeader = structuredClone(encrypted);
    tamperedHeader.encryption.createdAt = "2026-09-10T08:00:01.000Z";
    let headerTamperError = "";
    try {
      await service.parseAndDecryptBackup(tamperedHeader, passphrase);
    } catch (error) {
      headerTamperError =
        error instanceof Error ? error.message : String(error);
    }
    store.close();
    return {
      format: encrypted.encryption.format,
      iterations: encrypted.encryption.iterations,
      studentName: decrypted.payload.students[0].displayName,
      serializedContainsPassphrase: serialized.includes(passphrase),
      wrongPasswordError,
      tamperError,
      headerTamperError,
    };
  });

  expect(result.format).toBe("maarifos-encrypted-json");
  expect(result.iterations).toBeGreaterThanOrEqual(600_000);
  expect(result.studentName).toBe("Kurgu Şifreli Yedek Öğrencisi");
  expect(result.serializedContainsPassphrase).toBe(false);
  expect(result.wrongPasswordError).toContain(
    "parola yanlış veya dosya değiştirilmiş",
  );
  expect(result.tamperError).toContain(
    "parola yanlış veya dosya değiştirilmiş",
  );
  expect(result.headerTamperError).toContain(
    "parola yanlış veya dosya değiştirilmiş",
  );
});

test("30 küçültülmüş profil fotoğrafı şifreli yedekten temiz veritabanına kayıpsız döner", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-photo-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-photo-target-${crypto.randomUUID()}`,
    });
    const photo = `data:image/jpeg;base64,${"A".repeat(300_000)}`;
    const createdAt = "2026-09-10T06:00:00.000Z";
    const students = Array.from({ length: 30 }, (_, index) => ({
      id: crypto.randomUUID(),
      createdAt,
      updatedAt: createdAt,
      civilDate: "2026-09-10",
      deletedAt: null,
      schemaVersion: 4,
      displayName: `Fotoğraflı Çocuk ${index + 1}`,
      profilePhotoDataUrl: photo,
      profileSchemaVersion: 4,
      contacts: [
        {
          id: crypto.randomUUID(),
          kind: index % 2 === 0 ? "mother" : "father",
          relationship: index % 2 === 0 ? "Anne" : "Baba",
          phone: `+90555${String(10_000_000 + index).slice(-8)}`,
          isPrimary: true,
        },
      ],
    }));
    await source.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", students),
    );
    const service = new core.BackupService(source, {
      appVersion: "photo-capacity-test",
      clock: () => new Date("2026-09-10T08:00:00.000Z"),
      civilDateProvider: () => "2026-09-10",
    });
    const passphrase = "Foto-Yedek-2026!";
    const encrypted = await service.exportEncryptedBackup(passphrase);
    const serialized = service.serializeEncryptedBackup(encrypted);
    const verified = await service.parseAndDecryptBackup(serialized, passphrase);
    const report = await new core.BackupService(target, {
      appVersion: "photo-capacity-test",
    }).restoreBackup(verified, { mode: "replace" });
    const restored = await target.readSnapshot();
    source.close();
    target.close();
    return {
      serializedLength: serialized.length,
      inserted: report.inserted,
      studentCount: restored.students.length,
      photosMatch: restored.students.every(
        (student) => student.profilePhotoDataUrl === photo,
      ),
      contactsMatch: restored.students.every(
        (student) =>
          Array.isArray(student.contacts) &&
          student.contacts.length === 1,
      ),
    };
  });

  expect(result.serializedLength).toBeLessThan(32 * 1024 * 1024);
  expect(result.inserted).toBe(30);
  expect(result.studentCount).toBe(30);
  expect(result.photosMatch).toBe(true);
  expect(result.contactsMatch).toBe(true);
});

test("replace öncesi recovery snapshot doğrulanır; kesintide veri ve snapshot korunur", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const source = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-recovery-source-${crypto.randomUUID()}`,
    });
    const target = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-recovery-target-${crypto.randomUUID()}`,
    });
    const base = {
      createdAt: "2026-09-11T06:00:00.000Z",
      updatedAt: "2026-09-11T06:00:00.000Z",
      civilDate: "2026-09-11",
      deletedAt: null,
      schemaVersion: 1,
    };
    await source.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [{
        ...base,
        id: "00000000-0000-4000-8000-000000000911",
        displayName: "Kurgu Yeni Öğrenci",
      }]),
    );
    await target.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [{
        ...base,
        id: "00000000-0000-4000-8000-000000000912",
        displayName: "Kurgu Korunacak Öğrenci",
      }]),
    );
    const backup = await new core.BackupService(source, {
      appVersion: "recovery-test",
    }).exportBackup();
    const service = new core.BackupService(target, {
      appVersion: "recovery-test",
      recoveryRetentionLimit: 3,
    });

    const originalTransaction = target.transaction.bind(target);
    let interruptRestore = true;
    target.transaction = (mode, collections, task) =>
      originalTransaction(mode, collections, async (transaction) =>
        task({
          getAll: (collection) => transaction.getAll(collection),
          putMany: (collection, records) =>
            transaction.putMany(collection, records),
          clear: async (collection) => {
            await transaction.clear(collection);
            if (interruptRestore && collection === "students") {
              throw new Error("Test amaçlı restore kesintisi.");
            }
          },
        }),
      );

    let restoreError = "";
    try {
      await service.restoreBackup(backup, { mode: "replace" });
    } catch (error) {
      restoreError = error instanceof Error ? error.message : String(error);
    }
    interruptRestore = false;
    const afterFailure = await target.readSnapshot();
    const recoveryAfterFailure = await service.listRecoverySnapshots();
    const savedSnapshot = await target.getRecoverySnapshot(
      recoveryAfterFailure[0].id,
    );

    await service.restoreBackup(backup, { mode: "replace" });
    const afterSuccess = await target.readSnapshot();
    const recoveryAfterSuccess = await service.listRecoverySnapshots();
    await service.restoreRecoverySnapshot(recoveryAfterFailure[0].id, {
      createRecoverySnapshot: false,
    });
    const recovered = await target.readSnapshot();
    for (let index = 0; index < 4; index += 1) {
      await service.createRecoverySnapshot("manual");
    }
    const retainedSnapshots = await service.listRecoverySnapshots();
    source.close();
    target.close();
    return {
      restoreError,
      afterFailureName: afterFailure.students[0].displayName,
      snapshotName: savedSnapshot?.envelope.payload.students[0].displayName,
      afterSuccessName: afterSuccess.students[0].displayName,
      recoveredName: recovered.students[0].displayName,
      countAfterFailure: recoveryAfterFailure.length,
      countAfterSuccess: recoveryAfterSuccess.length,
      retainedSnapshotCount: retainedSnapshots.length,
      retainedChecksums: retainedSnapshots.map(
        (snapshot) => snapshot.snapshotChecksum,
      ),
    };
  });

  expect(result.restoreError).toContain("restore kesintisi");
  expect(result.afterFailureName).toBe("Kurgu Korunacak Öğrenci");
  expect(result.snapshotName).toBe("Kurgu Korunacak Öğrenci");
  expect(result.afterSuccessName).toBe("Kurgu Yeni Öğrenci");
  expect(result.recoveredName).toBe("Kurgu Korunacak Öğrenci");
  expect(result.countAfterFailure).toBe(1);
  expect(result.countAfterSuccess).toBe(2);
  expect(result.retainedSnapshotCount).toBe(3);
  expect(
    result.retainedChecksums.every((checksum) => /^[0-9a-f]{64}$/.test(checksum)),
  ).toBe(true);
});

test("app-lock yalnız türetilmiş doğrulayıcı saklar ve deneme gecikmesini uygular", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const pin = "739251";
    const config = await core.createAppLockConfig(pin, {
      now: new Date("2026-09-12T08:00:00.000Z"),
    });
    const failed = await core.verifyAppLockSecret(
      "000000",
      config,
      core.initialAppLockAttemptState(),
      { now: new Date("2026-09-12T08:01:00.000Z") },
    );
    const blocked = await core.verifyAppLockSecret(
      pin,
      config,
      failed.attemptState,
      { now: new Date("2026-09-12T08:01:00.500Z") },
    );
    const session = new core.AppLockSession(config, failed.attemptState);
    const unlocked = await session.unlock(pin, {
      now: new Date("2026-09-12T08:01:01.000Z"),
    });
    const openState = session.getState();
    session.lock();
    const closedState = session.getState();
    const store = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-app-lock-${crypto.randomUUID()}`,
    });
    await store.transaction("readwrite", ["settings"], (transaction) =>
      transaction.putMany("settings", [{
        id: "7aab50df-a47d-4dcb-8ac0-d8589a34b950",
        settingType: "app-lock-config-v1",
        config,
        attemptState: failed.attemptState,
        createdAt: config.createdAt,
        updatedAt: "2026-09-12T08:01:00.000Z",
        civilDate: "2026-09-12",
        schemaVersion: core.DATA_SCHEMA_VERSION,
      }]),
    );
    const backup = await new core.BackupService(store, {
      appVersion: "app-lock-test",
      clock: () => new Date("2026-09-12T08:02:00.000Z"),
      civilDateProvider: () => "2026-09-12",
    }).exportBackup();
    store.close();
    return {
      configContainsPin: JSON.stringify(config).includes(pin),
      iterations: config.iterations,
      failed,
      blocked,
      unlocked,
      openState,
      closedState,
      backedUpSettingType: backup.payload.settings[0].settingType,
    };
  });

  expect(result.configContainsPin).toBe(false);
  expect(result.iterations).toBeGreaterThanOrEqual(600_000);
  expect(result.failed.status).toBe("invalid");
  expect(result.failed.retryAfterMs).toBe(1_000);
  expect(result.blocked.status).toBe("locked");
  expect(result.blocked.retryAfterMs).toBe(500);
  expect(result.unlocked.status).toBe("verified");
  expect(result.openState.unlocked).toBe(true);
  expect(result.closedState.unlocked).toBe(false);
  expect(result.backedUpSettingType).toBe("app-lock-config-v1");
});

test("IndexedDB v2, v3 ve v4 verisini v5'e kayıpsız taşır; değer kanıtı store ve indekslerini açar", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const classroomId = "00000000-0000-4000-8000-000000000921";
    const createLegacy = async (version: number) => {
      const databaseName =
        `maarifos-test-migration-v${version}-${crypto.randomUUID()}`;
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(databaseName, version);
        request.addEventListener("upgradeneeded", () => {
          const database = request.result;
          const students = database.createObjectStore("students", {
            keyPath: "id",
          });
          students.put({
            id:
              version === 1
                ? "00000000-0000-4000-8000-000000000922"
                : "00000000-0000-4000-8000-000000000923",
            createdAt: "2026-09-13T06:00:00.000Z",
            updatedAt: "2026-09-13T06:00:00.000Z",
            civilDate: "2026-09-13",
            deletedAt: null,
            schemaVersion: 1,
            displayName: `Kurgu v${version} Öğrencisi`,
            classroomId,
          });
          if (version === 2 || version === 3 || version === 4) {
            const unavailableCollections = new Set([
              "valueEvidenceLinks",
              ...(version < 4
                ? ["calendarEntries", "externalFeedback"]
                : []),
            ]);
            for (const collection of core.COLLECTION_NAMES.filter(
              (name) => !unavailableCollections.has(name),
            )) {
              if (!database.objectStoreNames.contains(collection)) {
                database.createObjectStore(collection, { keyPath: "id" });
              }
            }
            if (version === 4) {
              const upgradeTransaction = request.transaction;
              if (!upgradeTransaction) {
                throw new Error("Kurgu v4 upgrade transaction bulunamadı.");
              }
              for (const collection of core.COLLECTION_NAMES.filter(
                (name) =>
                  name !== "students" && name !== "valueEvidenceLinks",
              )) {
                upgradeTransaction.objectStore(collection).put({
                  id: "00000000-0000-4000-8000-000000000924",
                  createdAt: "2026-09-13T06:00:00.000Z",
                  updatedAt: "2026-09-13T06:00:00.000Z",
                  civilDate: "2026-09-13",
                  deletedAt: null,
                  schemaVersion: 1,
                  migrationSentinel: collection,
                });
              }
            }
          }
          if (version === 3 || version === 4) {
            const recoveryStore = database.createObjectStore(
              core.RECOVERY_SNAPSHOT_STORE_NAME,
              { keyPath: "id" },
            );
            recoveryStore.createIndex("by-created-at", "createdAt");
          }
        });
        request.addEventListener("success", () => {
          request.result.close();
          resolve();
        });
        request.addEventListener("error", () => reject(request.error));
      });
      const statuses = [];
      const store = new core.IndexedDbDataStore({
        databaseName,
        onStatusChange: (status) => statuses.push(status.status),
      });
      const snapshot = await store.readSnapshot();
      const queried = await store.listStudentsByClassroom(classroomId);
      const recovery = await store.listRecoverySnapshots();
      const missingLegacyCollections = version === 4
        ? core.COLLECTION_NAMES.filter(
            (collection) =>
              collection !== "valueEvidenceLinks" &&
              (snapshot[collection].length !== 1 ||
                (collection !== "students" &&
                  snapshot[collection][0]?.migrationSentinel !== collection)),
          )
        : [];
      const valueEvidenceStoreMetadata = await new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.addEventListener("success", () => {
          const database = request.result;
          const transaction = database.transaction(
            "valueEvidenceLinks",
            "readonly",
          );
          const objectStore = transaction.objectStore("valueEvidenceLinks");
          const indexes = Array.from(objectStore.indexNames)
            .sort()
            .map((name) => ({
              name,
              unique: objectStore.index(name).unique,
            }));
          transaction.addEventListener("complete", () => {
            const metadata = {
              databaseVersion: database.version,
              indexes,
            };
            database.close();
            resolve(metadata);
          });
          transaction.addEventListener("error", () => {
            database.close();
            reject(transaction.error);
          });
        });
        request.addEventListener("error", () => reject(request.error));
      });
      store.close();
      return {
        name: snapshot.students[0].displayName,
        queried: queried.length,
        recovery: recovery.length,
        missingLegacyCollections,
        valueEvidenceCount: snapshot.valueEvidenceLinks.length,
        valueEvidenceStoreMetadata,
        statuses,
      };
    };
    return Promise.all([createLegacy(2), createLegacy(3), createLegacy(4)]);
  });

  expect(result.map((item) => item.name)).toEqual([
    "Kurgu v2 Öğrencisi",
    "Kurgu v3 Öğrencisi",
    "Kurgu v4 Öğrencisi",
  ]);
  expect(result.every((item) => item.queried === 1)).toBe(true);
  expect(result.every((item) => item.recovery === 0)).toBe(true);
  expect(result[2].missingLegacyCollections).toEqual([]);
  expect(result.every((item) => item.valueEvidenceCount === 0)).toBe(true);
  expect(
    result.every(
      (item) => item.valueEvidenceStoreMetadata.databaseVersion === 5,
    ),
  ).toBe(true);
  expect(result[0].valueEvidenceStoreMetadata.indexes).toEqual([
    { name: "by-academic-year-classroom", unique: false },
    { name: "by-classroom", unique: false },
    { name: "by-observation", unique: false },
    { name: "by-student", unique: false },
    { name: "by-target-key", unique: false },
  ]);
  expect(
    result.every(
      (item) =>
        JSON.stringify(item.valueEvidenceStoreMetadata.indexes) ===
        JSON.stringify(result[0].valueEvidenceStoreMetadata.indexes),
    ),
  ).toBe(true);
  expect(result.every((item) => item.statuses.includes("ready"))).toBe(true);
});

test("yedek şeması tanımsız, semantik bozuk ve eksik koleksiyon kayıtlarını fail-closed reddeder", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const store = new core.IndexedDbDataStore({
      databaseName: `maarifos-test-strict-schema-${crypto.randomUUID()}`,
    });
    await store.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [{
        id: "00000000-0000-4000-8000-000000000931",
        createdAt: "2026-09-14T06:00:00.000Z",
        updatedAt: "2026-09-14T06:00:00.000Z",
        civilDate: "2026-09-14",
        deletedAt: null,
        schemaVersion: 1,
        displayName: "Kurgu Şema Öğrencisi",
      }]),
    );
    const service = new core.BackupService(store, {
      appVersion: "strict-schema-test",
      clock: () => new Date("2026-09-14T08:00:00.000Z"),
      civilDateProvider: () => "2026-09-14",
    });
    const backup = await service.exportBackup();
    const verifyError = async (candidate) => {
      candidate.manifest.payloadChecksum = await core.sha256Hex(
        core.canonicalJson(candidate.payload),
      );
      try {
        await service.parseAndVerifyBackup(candidate);
        return "";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    };

    const unknownField = structuredClone(backup);
    unknownField.payload.students[0][["session", "Token"].join("")] =
      "yedekte-olmaması-gerekir";
    const unknownFieldError = await verifyError(unknownField);

    const impossibleDate = structuredClone(backup);
    impossibleDate.payload.students[0].civilDate = "2026-02-30";
    const impossibleDateError = await verifyError(impossibleDate);

    const malformedMedia = structuredClone(backup);
    malformedMedia.payload.mediaAssets.push({
      id: "00000000-0000-4000-8000-000000000932",
      createdAt: "2026-09-14T06:00:00.000Z",
      updatedAt: "2026-09-14T06:00:00.000Z",
      civilDate: "2026-09-14",
      deletedAt: null,
      schemaVersion: 1,
      blobKey: "blob-only",
    });
    malformedMedia.manifest.entityCounts.mediaAssets = 1;
    const malformedMediaError = await verifyError(malformedMedia);

    const unknownManifestField = structuredClone(backup);
    unknownManifestField.manifest.debug = true;
    let unknownManifestError = "";
    try {
      await service.parseAndVerifyBackup(unknownManifestField);
    } catch (error) {
      unknownManifestError =
        error instanceof Error ? error.message : String(error);
    }
    store.close();
    return {
      unknownFieldError,
      impossibleDateError,
      malformedMediaError,
      unknownManifestError,
    };
  });

  expect(result.unknownFieldError).toContain("tanımsız alan");
  expect(result.impossibleDateError).toContain("civilDate");
  expect(result.malformedMediaError).toContain("medya sözleşmesine");
  expect(result.unknownManifestError).toContain("manifestinde tanımsız");
});

test("IndexedDB blocked ve versionchange olaylarını görünür kılar; eski bağlantıda veri kaybetmez", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const databaseName = `maarifos-test-lifecycle-${crypto.randomUUID()}`;
    const oldConnection = await new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.addEventListener("upgradeneeded", () => {
        for (const collection of core.COLLECTION_NAMES) {
          request.result.createObjectStore(collection, { keyPath: "id" });
        }
        request.transaction.objectStore("students").put({
          id: "00000000-0000-4000-8000-000000000941",
          createdAt: "2026-09-15T06:00:00.000Z",
          updatedAt: "2026-09-15T06:00:00.000Z",
          civilDate: "2026-09-15",
          deletedAt: null,
          schemaVersion: 1,
          displayName: "Kurgu Yaşam Döngüsü Öğrencisi",
        });
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
    const statuses = [];
    const store = new core.IndexedDbDataStore({
      databaseName,
      onStatusChange: (event) => statuses.push(event.status),
    });
    let blockedError = "";
    try {
      await store.readSnapshot();
    } catch (error) {
      blockedError = error instanceof Error ? error.message : String(error);
    }
    oldConnection.close();
    const snapshot = await store.readSnapshot();

    await new Promise((resolve, reject) => {
      const request = indexedDB.open(
        databaseName,
        core.MAARIFOS_DATABASE_VERSION + 1,
      );
      request.addEventListener("success", () => {
        request.result.close();
        resolve(undefined);
      });
      request.addEventListener("error", () => reject(request.error));
    });
    return {
      blockedError,
      statuses,
      studentName: snapshot.students[0].displayName,
    };
  });

  expect(result.blockedError).toContain("başka bir sekme");
  expect(result.statuses).toContain("blocked");
  expect(result.statuses).toContain("ready");
  expect(result.statuses).toContain("versionchange");
  expect(result.studentName).toBe("Kurgu Yaşam Döngüsü Öğrencisi");
});
