import { expect, test } from "@playwright/test";
import { canonicalJson } from "../../src/core/backup/canonical-json";

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
    legacyV1.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(legacyV1.payload),
    );
    const upgradedLegacy = await service.parseAndVerifyBackup(legacyV1);
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
      corruptionError,
    };
  });

  expect(result.manifest.format).toBe("maarifos-json");
  expect(result.manifest.backupVersion).toBe(1);
  expect(result.manifest.dataSchemaVersion).toBe(2);
  expect(result.manifest.createdAt).toBe("2026-07-22T09:30:00.000Z");
  expect(result.manifest.civilDate).toBe("2026-07-22");
  expect(result.manifest.payloadChecksum).toMatch(/^[0-9a-f]{64}$/);
  expect(result.manifest.entityCounts.students).toBe(1);
  expect(result.studentCount).toBe(1);
  expect(result.upgradedLegacyVersion).toBe(2);
  expect(result.upgradedLegacyLinkCount).toBe(0);
  expect(result.corruptionError).toContain("bütünlük kontrolünü geçemedi");
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

test("D1 plan-etkinlik-ham gözlem-onay-taslak grafını V2 yedekle birebir geri yükler", async ({
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

  expect(result.dataSchemaVersion).toBe(2);
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

    const backup = await new core.BackupService(source, {
      appVersion: "o1-test",
      clock: () => new Date("2026-09-02T08:00:00.000Z"),
    }).exportBackup();
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
      draft: restoredDraft,
      settingsCount: backup.manifest.entityCounts.settings,
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
  expect(result.settingsCount).toBe(3);
});
