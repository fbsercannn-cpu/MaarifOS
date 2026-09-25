import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("v10 adres parçaları gerçek şifreli IndexedDB, restart, recovery ve başka kasaya yedek restore ile korunur", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const roster = await import("/src/features/classroom/class-roster-document.ts");
    const sourceName = `address-v10-source-${crypto.randomUUID()}`;
    const targetName = `address-v10-target-${crypto.randomUUID()}`;
    const yearId = "00000000-0000-4000-8000-00000000ea01";
    const classId = "00000000-0000-4000-8000-00000000ea02";
    const studentId = "00000000-0000-4000-8000-00000000ea03";
    const homeAddressParts = { district: "Acıpayam", province: "Denizli", neighborhood: "Aşağı", streetAddress: "Pancar Caddesi No: 12 / 2" };
    const homeAddress = "Pancar Caddesi No: 12 / 2 Aşağı Mahalle Acıpayam Denizli";
    const sourceProfile = core.normalizeStudentProfile({
      displayName: "Kurgu Adres Çocuğu", firstName: "Kurgu", lastName: "Adres Çocuğu",
      contacts: [{ id: "00000000-0000-4000-8000-00000000ea04", kind: "mother", relationship: "Anne", name: "Kurgu Anne", phone: "0532 000 00 01", occupation: "Mimar", isPrimary: true, isEmergencyContact: true }],
      careDetails: { homeAddressParts, parentsSeparated: true, veteranChild: true, childPrivateNotes: "Kurgu bireysel destek notu", familySituationNotes: "Kurgu aile iletişim düzeni", photoVideoPermissionOnFile: true },
    }, "2026-09-07");
    const student = fx.fictionalStudent(studentId, "ADRES", { ...sourceProfile, schemaVersion: 10, academicYearId: yearId, classroomId: classId });
    const legacy = fx.fictionalStudent("00000000-0000-4000-8000-00000000ea05", "ESKİ", { academicYearId: yearId, classroomId: classId, profileSchemaVersion: 9, careDetails: { homeAddress: "Kurgu eski serbest adres No: 3 / C; Merkezefendi / Denizli", parentsSeparated: true } });
    const base = { createdAt: "2026-09-07T06:00:00.000Z", updatedAt: "2026-09-07T06:00:00.000Z", civilDate: "2026-09-07", schemaVersion: 1 };
    const source = new core.IndexedDbDataStore({ databaseName: sourceName });
    await source.transaction("readwrite", ["academicYears", "classrooms", "students"], async transaction => {
      await transaction.putMany("academicYears", [{ ...base, id: yearId, name: "2026–2027", startDate: "2026-09-01", endDate: "2027-08-31", status: "active" }]);
      await transaction.putMany("classrooms", [{ ...base, id: classId, academicYearId: yearId, name: "Kurgu Adres Sınıfı" }]);
      await transaction.putMany("students", [student, legacy]);
    });
    const first = await source.readSnapshot();
    const service = new core.BackupService(source, { appVersion: "address-parts-test", clock: () => new Date("2026-09-07T08:00:00.000Z"), civilDateProvider: () => "2026-09-07" });
    const encrypted = await service.exportEncryptedBackup("Kurgu-adres-test-parolasi-2026!");
    const recovery = await service.createRecoverySnapshot("manual");
    const rawSource = await fx.readAll<Record<string, unknown>>(sourceName, "students");
    const rawRecovery = await fx.readAll<Record<string, unknown>>(sourceName, core.RECOVERY_SNAPSHOT_STORE_NAME);
    source.close();
    await new Promise(resolve => setTimeout(resolve, 0));
    const restarted = new core.IndexedDbDataStore({ databaseName: sourceName });
    const afterRestart = await restarted.readSnapshot();
    const recoverySnapshot = (await restarted.getRecoverySnapshot(recovery.id))?.envelope.payload;
    restarted.close();
    const target = new core.IndexedDbDataStore({ databaseName: targetName });
    await new core.BackupService(target, { appVersion: "address-parts-test" }).restoreEncryptedBackup(encrypted, "Kurgu-adres-test-parolasi-2026!", { mode: "replace", createRecoverySnapshot: false });
    const afterRestore = await target.readSnapshot();
    const rawTarget = await fx.readAll<Record<string, unknown>>(targetName, "students");
    target.close();
    const snapshots = [first, afterRestart, recoverySnapshot, afterRestore];
    const restored = afterRestore.students.find(record => record.id === studentId)!;
    const rosterDocument = roster.createClassRosterDocument({ snapshot: afterRestore, scope: { academicYearId: yearId, classroomId: classId }, schoolName: "Kurgu Anaokulu", teacherName: "Kurgu Öğretmen", generatedAt: "2026-09-07T08:00:00.000Z" });
    const rawTexts = [JSON.stringify(rawSource), JSON.stringify(rawRecovery), JSON.stringify(rawTarget), JSON.stringify(encrypted)];
    return {
      v10RoundTrips: snapshots.map(snapshot => core.canonicalJson(snapshot?.students.find(record => record.id === studentId)) === core.canonicalJson(student)),
      v9RoundTrips: snapshots.map(snapshot => core.canonicalJson(snapshot?.students.find(record => record.id === legacy.id)) === core.canonicalJson(legacy)),
      partsEqual: core.canonicalJson((restored.careDetails as Record<string, unknown>).homeAddressParts) === core.canonicalJson(homeAddressParts),
      projectionEqual: (restored.careDetails as Record<string, unknown>).homeAddress === homeAddress,
      contactsEqual: core.canonicalJson(restored.contacts) === core.canonicalJson(student.contacts),
      flagsPreserved: ["parentsSeparated", "veteranChild", "photoVideoPermissionOnFile"].every(key => (restored.careDetails as Record<string, unknown>)[key] === true),
      noRawAddress: !rawTexts.some(raw => [homeAddress, "Pancar Caddesi", "Acıpayam", "Kurgu bireysel destek notu", "0532 000 00 01"].some(secret => raw.includes(secret))),
      rawOuterKeys: rawTarget.map(record => Object.keys(record).sort()),
      rosterAddressPresent: rosterDocument.html.includes(homeAddress),
      rosterPrivateNotesAbsent: !rosterDocument.html.includes("Kurgu bireysel destek notu"),
    };
  });
  expect(result.v10RoundTrips).toEqual([true, true, true, true]);
  expect(result.v9RoundTrips).toEqual([true, true, true, true]);
  expect(result.partsEqual).toBe(true);
  expect(result.projectionEqual).toBe(true);
  expect(result.contactsEqual).toBe(true);
  expect(result.flagsPreserved).toBe(true);
  expect(result.noRawAddress).toBe(true);
  expect(result.rawOuterKeys).toEqual([["__maarifosLocalVault", "id"], ["__maarifosLocalVault", "id"]]);
  expect(result.rosterAddressPresent).toBe(true);
  expect(result.rosterPrivateNotesAbsent).toBe(true);
  const directory = new URL("../../output/address-vault/", import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("address-roundtrip.json", directory), JSON.stringify(result, null, 2));
});

test("yedek doğrulaması checksum doğru olsa bile parçalarla çelişen adresi ve bozuk nested alanı reddeder", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const store = new core.IndexedDbDataStore({ databaseName: `address-negative-${crypto.randomUUID()}` });
    const careDetails = core.normalizeStudentCareDetails({ homeAddressParts: { district: "Acıpayam", province: "Denizli", neighborhood: "Aşağı", streetAddress: "Pancar Caddesi No: 12 / 2" } });
    const student = fx.fictionalStudent("00000000-0000-4000-8000-00000000eb01", "ADRES-NEGATİF", { profileSchemaVersion: 10, careDetails });
    await store.transaction("readwrite", ["students"], transaction => transaction.putMany("students", [student]));
    const service = new core.BackupService(store, { appVersion: "address-negative-test" });
    const backup = await service.exportBackup();
    const mutations: Array<[string, (care: Record<string, unknown>) => void]> = [
      ["inconsistent-projection", care => { care.homeAddress = "Parçalardan farklı adres"; }],
      ["unknown-nested-key", care => { (care.homeAddressParts as Record<string, unknown>).postalCode = "20000"; }],
      ["missing-nested-key", care => { delete (care.homeAddressParts as Record<string, unknown>).district; }],
      ["wrong-nested-type", care => { (care.homeAddressParts as Record<string, unknown>).province = 20; }],
      ["noncanonical-nested-value", care => { (care.homeAddressParts as Record<string, unknown>).district = " Acıpayam "; }],
    ];
    const rejected: string[] = [];
    for (const [name, mutate] of mutations) {
      const candidate = structuredClone(backup);
      mutate(candidate.payload.students[0].careDetails as Record<string, unknown>);
      candidate.manifest.payloadChecksum = await core.sha256Hex(core.canonicalJson(candidate.payload));
      try { await service.parseAndVerifyBackup(candidate); }
      catch { rejected.push(name); }
    }
    for (const name of ["v10-name-mismatch", "v10-first-name-missing"]) {
      const candidate = structuredClone(backup);
      if (name === "v10-name-mismatch") candidate.payload.students[0].displayName = "Kurgu Uyuşmayan Çocuk";
      else delete candidate.payload.students[0].firstName;
      candidate.manifest.payloadChecksum = await core.sha256Hex(core.canonicalJson(candidate.payload));
      try { await service.parseAndVerifyBackup(candidate); }
      catch { rejected.push(name); }
    }
    const unchanged = core.canonicalJson((await store.readSnapshot()).students[0]) === core.canonicalJson(student);
    store.close();
    return { rejected, unchanged };
  });
  expect(result.rejected).toEqual(["inconsistent-projection", "unknown-nested-key", "missing-nested-key", "wrong-nested-type", "noncanonical-nested-value", "v10-name-mismatch", "v10-first-name-missing"]);
  expect(result.unchanged).toBe(true);
});
