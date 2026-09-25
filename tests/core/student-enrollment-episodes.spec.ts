import { expect, test } from "@playwright/test";

test("ayrılık dönemleri şifreli yedekle başka depoya taşınır ve geri al yalnız son dönemi açar", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const dashboard = await import("/src/features/dashboard/dashboard-data.ts");
    const archive = await import("/src/features/archive/academic-year-archive.ts");
    const name = `maarifos-enrollment-episodes-${crypto.randomUUID()}`;
    const source = new core.IndexedDbDataStore({ databaseName: name });
    const target = new core.IndexedDbDataStore({ databaseName: `${name}-restored` });
    try {
      const yearId = crypto.randomUUID(), classroomId = crypto.randomUUID(), studentId = crypto.randomUUID();
      const base = { createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-01T08:00:00.000Z", civilDate: "2026-09-01", schemaVersion: 1 };
      await source.transaction("readwrite", ["academicYears", "classrooms", "settings"], async (transaction) => {
        await transaction.putMany("academicYears", [{ ...base, id: yearId, name: "2026–2027", startDate: "2026-09-01", endDate: "2027-08-31", status: "active" }]);
        await transaction.putMany("classrooms", [{ ...base, id: classroomId, academicYearId: yearId, name: "Kurgu Sınıf" }]);
        await transaction.putMany("settings", [{ ...base, id: core.ACTIVE_CLASSROOM_SETTING_ID, settingType: core.ACTIVE_CLASSROOM_SETTING_TYPE, academicYearId: yearId, classroomId }]);
      });
      const student = { id: studentId, name: "Kurgu Dönem Öğrencisi", firstName: "Kurgu Dönem", lastName: "Öğrencisi", status: "present" as const };
      await dashboard.persistStudentRosterChange(source, { student, archived: false, now: new Date("2026-09-01T08:00:00.000Z") });
      await dashboard.persistStudentRosterChange(source, { student, archived: true, preserveCurrentProfile: true, now: new Date("2026-09-05T08:00:00.000Z") });
      await archive.reenrollArchivedStudent(source, { studentId, academicYearId: yearId, classroomId, startedOn: "2026-10-01", now: new Date("2026-10-01T08:00:00.000Z") });
      const episodes = structuredClone((await source.readSnapshot()).students[0].enrollments);
      const clock = () => new Date("2026-10-02T08:00:00.000Z");
      const service = new core.BackupService(source, { appVersion: "0.24.0-test", clock });
      const targetService = new core.BackupService(target, { appVersion: "0.24.0-test", clock });
      const password = "Kurgu-donem-yedegi-2026";
      const encrypted = await service.exportEncryptedBackup(password);
      await targetService.restoreEncryptedBackup(service.serializeEncryptedBackup(encrypted), password, { mode: "replace" });
      const restored = await target.readSnapshot();
      await dashboard.persistStudentRosterChange(target, { student, archived: true, preserveCurrentProfile: true, now: new Date("2026-10-03T08:00:00.000Z") });
      await dashboard.persistStudentRosterChange(target, { student, archived: false, preserveCurrentProfile: true, now: new Date("2026-10-04T08:00:00.000Z") });
      const undone = await target.readSnapshot();
      const equal = (left: unknown, right: unknown) => core.canonicalJson(left) === core.canonicalJson(right);
      return { episodeCount: (episodes as unknown[]).length, restoreExact: equal(restored.students[0].enrollments, episodes), undoExact: equal(undone.students[0].enrollments, episodes) };
    } finally { source.close(); target.close(); }
  });
  expect(result).toEqual({ episodeCount: 2, restoreExact: true, undoExact: true });
});
