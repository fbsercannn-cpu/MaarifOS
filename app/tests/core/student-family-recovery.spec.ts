import { expect, test } from "@playwright/test";

test("aile profili şifreli saklanır; yedek ve geri alınabilir silme bütün alanları korur", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const dashboard = await import("/src/features/dashboard/dashboard-data.ts");
    const databaseName = `maarifos-family-recovery-${crypto.randomUUID()}`;
    const store = new core.IndexedDbDataStore({ databaseName });
    const yearId = crypto.randomUUID();
    const classroomId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    const now = new Date("2026-09-07T09:00:00.000Z");
    const base = { createdAt: now.toISOString(), updatedAt: now.toISOString(), civilDate: "2026-09-07", schemaVersion: 1 };
    await store.transaction("readwrite", ["academicYears", "classrooms", "settings"], async (transaction) => {
      await transaction.putMany("academicYears", [{ ...base, id: yearId, name: "2026–2027", startDate: "2026-09-01", endDate: "2027-06-30", status: "active" }]);
      await transaction.putMany("classrooms", [{ ...base, id: classroomId, academicYearId: yearId, name: "Kurgu Sınıf" }]);
      await transaction.putMany("settings", [{ ...base, id: core.ACTIVE_CLASSROOM_SETTING_ID, settingType: core.ACTIVE_CLASSROOM_SETTING_TYPE, academicYearId: yearId, classroomId }]);
    });
    const student = {
      id: studentId, name: "Kurgu Aile Öğrencisi", firstName: "Kurgu Aile", lastName: "Öğrencisi", status: "present" as const,
      birthDate: "2021-09-09", contacts: [
        { id: crypto.randomUUID(), kind: "mother" as const, relationship: "Anne", name: "Kurgu Anne", occupation: "Mimar", phone: "", isPrimary: false },
        { id: crypto.randomUUID(), kind: "father" as const, relationship: "Baba", name: "Kurgu Baba", occupation: "Teknisyen", phone: "+905551234567", isPrimary: true },
        { id: crypto.randomUUID(), kind: "other" as const, relationship: "Teyze", name: "Kurgu Yakın", occupation: "Öğretmen", phone: "+905551234568", isPrimary: false, isAuthorizedPickup: true },
      ],
      careDetails: {
        homeAddress: "Kurgu Mahallesi 12, Denizli", childPrivateNotes: "FAMILY_PRIVATE_NOTE_SENTINEL", familySituationNotes: "Ailenin bildirdiği iletişim düzeni",
        parentsSeparated: true, motherDeceased: true, fatherDeceased: true, martyrChild: true, veteranChild: true,
      },
    };
    await dashboard.persistStudentRosterChange(store, { student, archived: false, now });
    const importReview = { sourceRow: 7, reviewedAtUtc: now.toISOString(), duplicateCandidateIds: [crypto.randomUUID()], _MUKERRER_INCELE: true as const, decision: "distinct-student-confirmed" as const };
    await store.transaction("readwrite", ["students"], async (transaction) => {
      const saved = (await transaction.getAll("students"))[0];
      await transaction.putMany("students", [{ ...saved, spreadsheetImportReview: importReview }]);
    });
    await store.transaction("readwrite", ["attendanceRecords"], (transaction) => transaction.putMany("attendanceRecords", [{
      ...base, id: crypto.randomUUID(), studentId, academicYearId: yearId, classroomId, status: "present",
    }]));
    await dashboard.persistStudentRosterChange(store, {
      student: { ...student, careDetails: { ...student.careDetails, childPrivateNotes: "FAMILY_PRIVATE_NOTE_SENTINEL_LATEST" } },
      archived: false, now: new Date("2026-09-07T09:00:30.000Z"),
    });
    const before = await store.readSnapshot();
    await dashboard.persistStudentRosterChange(store, { student, archived: true, preserveCurrentProfile: true, now: new Date("2026-09-07T09:01:00.000Z") });
    const archived = await store.readSnapshot();
    const service = new core.BackupService(store, { appVersion: "0.24.0-test", clock: () => now, civilDateProvider: () => "2026-09-07" });
    const backup = await service.parseAndVerifyBackup(service.serializeBackup(await service.exportBackup()));
    const invalidBackup = structuredClone(backup);
    invalidBackup.payload.students[0].spreadsheetImportReview = { ...importReview, decision: "automatic" };
    invalidBackup.manifest.payloadChecksum = await core.sha256Hex(core.canonicalJson(invalidBackup.payload));
    let invalidReviewRejected = false;
    try { await service.parseAndVerifyBackup(service.serializeBackup(invalidBackup)); }
    catch { invalidReviewRejected = true; }
    const target = new core.IndexedDbDataStore({ databaseName: `${databaseName}-restored` });
    const targetService = new core.BackupService(target, { appVersion: "0.24.0-test", clock: () => now, civilDateProvider: () => "2026-09-07" });
    await targetService.restoreBackup(backup, { mode: "replace" });
    const recovered = await target.readSnapshot();
    await dashboard.persistStudentRosterChange(target, { student, archived: false, preserveCurrentProfile: true, now: new Date("2026-09-07T09:02:00.000Z") });
    const restored = await target.readSnapshot();
    const raw = await new Promise<unknown[]>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onerror = () => reject(new Error("Test deposu okunamadı."));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("students", "readonly");
        const records = transaction.objectStore("students").getAll();
        records.onsuccess = () => resolve(records.result);
        transaction.oncomplete = () => database.close();
      };
    });
    const same = (a: unknown, b: unknown) => core.canonicalJson(a) === core.canonicalJson(b);
    const answer = {
      encrypted: !JSON.stringify(raw).includes("FAMILY_PRIVATE_NOTE_SENTINEL") && !JSON.stringify(raw).includes("Kurgu Anne") && !JSON.stringify(raw).includes("distinct-student-confirmed"),
      profileVersion: recovered.students[0].profileSchemaVersion,
      archived: archived.students[0].active === false && recovered.students[0].active === false,
      restored: restored.students[0].active === true && restored.students[0].id === studentId,
      contactsPreserved: same(before.students[0].contacts, recovered.students[0].contacts) && same(before.students[0].contacts, restored.students[0].contacts),
      familyPreserved: same(before.students[0].careDetails, recovered.students[0].careDetails) && same(before.students[0].careDetails, restored.students[0].careDetails),
      attendancePreserved: same(before.attendanceRecords, archived.attendanceRecords) && same(before.attendanceRecords, restored.attendanceRecords),
      importReviewPreserved: same(importReview, before.students[0].spreadsheetImportReview) && same(importReview, recovered.students[0].spreadsheetImportReview) && same(importReview, restored.students[0].spreadsheetImportReview),
      invalidReviewRejected,
    };
    store.close(); target.close();
    return answer;
  });
  expect(result).toEqual({ encrypted: true, profileVersion: 9, archived: true, restored: true, contactsPreserved: true, familyPreserved: true, attendancePreserved: true, importReviewPreserved: true, invalidReviewRejected: true });
});
