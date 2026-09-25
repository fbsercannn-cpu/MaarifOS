import { expect, test } from "@playwright/test";

test("V5–V10 boş yeni modül geçişi payload ve checksum'u korur; V11 yazılır ve bilinmeyen sürüm reddedilir", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const today = await import("/src/features/today/today-data.ts");
    const store = new core.IndexedDbDataStore({ databaseName: `workflow-migration-${crypto.randomUUID()}` });
    const academicYearId = crypto.randomUUID(), classroomId = crypto.randomUUID();
    const now = new Date("2026-09-08T06:00:00.000Z");
    await today.saveClassroomConfiguration(store, { academicYear: { id: academicYearId, name: "Kurgu Yıl", startDate: "2026-09-01", endDate: "2027-06-30" }, classroom: { id: classroomId, name: "Kurgu Sınıf", schoolName: "Kurgu Okul", teacherName: "Kurgu Öğretmen", ageGroup: "60-72 ay" }, schedule: { kind: "morning", startTime: "08:30", endTime: "12:30" }, now });
    await store.transaction("readwrite", ["students"], tx => tx.putMany("students", [{ id: crypto.randomUUID(), academicYearId, classroomId, createdAt: now.toISOString(), updatedAt: now.toISOString(), civilDate: "2026-09-08", deletedAt: null, schemaVersion: 5, profileSchemaVersion: 5, displayName: "Kurgu Öğrenci", firstName: "Kurgu", lastName: "Öğrenci", active: true }]));
    const service = new core.BackupService(store, { appVersion: "workflow-migration-test", clock: () => now });
    const current = await service.exportBackup();
    const canonical = core.canonicalJson(current.payload);
    const migrated = [];
    for (const version of [5,6,7,8,9,10]) {
      const legacy = { ...structuredClone(current), manifest: { ...current.manifest, dataSchemaVersion: version } };
      const accepted = await service.parseAndVerifyBackup(legacy);
      migrated.push({ from: version, to: accepted.manifest.dataSchemaVersion, exact: core.canonicalJson(accepted.payload) === canonical, checksum: accepted.manifest.payloadChecksum === current.manifest.payloadChecksum });
    }
    const rejected = [];
    for (const version of [0,12,10.5,"10"]) {
      try { await service.parseAndVerifyBackup({ ...current, manifest: { ...current.manifest, dataSchemaVersion: version } }); }
      catch { rejected.push(version); }
    }
    store.close();
    return { current: current.manifest.dataSchemaVersion, migrated, rejected };
  });
  expect(result.current).toBe(11);
  expect(result.migrated).toEqual([5,6,7,8,9,10].map(from => ({ from, to: 11, exact: true, checksum: true })));
  expect(result.rejected).toEqual([0,12,10.5,"10"]);
});

test("V9 öğretmen takip eşiği V11 artışından bağımsız kalır; V8'e geri etiketlenen geçerli olay yazılmadan reddedilir", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const { makeDevelopmentReportFixture } = await import("/tests/fixtures/development-report-fixture.mjs");
    const followup = await import("/src/features/teacher-followup/teacher-followup-service.ts");
    const source = new core.IndexedDbDataStore({ databaseName: `workflow-threshold-${crypto.randomUUID()}` });
    const fixture = await makeDevelopmentReportFixture(source);
    await followup.appendTeacherFollowup(source, { studentId: fixture.input.studentId, workflow: { kind: "family-meeting", participants: "Kurgu Veli", discussion: "Kurgu görüşme", decision: "Kurgu karar", followupOn: null }, now: new Date("2026-09-08T08:00:00.000Z") });
    const service = new core.BackupService(source, { appVersion: "workflow-threshold-test" });
    const backup = await service.exportBackup();
    const accepted = await service.parseAndVerifyBackup({ ...backup, manifest: { ...backup.manifest, dataSchemaVersion: 9 } });
    const target = new core.IndexedDbDataStore({ databaseName: `workflow-threshold-target-${crypto.randomUUID()}` });
    const before = core.canonicalJson(await target.readSnapshot());
    const restore = new core.BackupService(target, { appVersion: "workflow-threshold-test" });
    let error = "";
    try { await restore.restoreBackup({ ...backup, manifest: { ...backup.manifest, dataSchemaVersion: 8 } }, { mode: "replace", createRecoverySnapshot: false }); }
    catch (failure) { error = failure instanceof Error ? failure.message : String(failure); }
    const unchanged = before === core.canonicalJson(await target.readSnapshot());
    source.close(); target.close();
    return { accepted: accepted.manifest.dataSchemaVersion, exact: core.canonicalJson(accepted.payload) === core.canonicalJson(backup.payload), error, unchanged };
  });
  expect(result.accepted).toBe(11);
  expect(result.exact).toBe(true);
  expect(result.error).toContain("en az V9");
  expect(result.unchanged).toBe(true);
});
