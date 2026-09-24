import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("13 öğretmen takip olayı v9 şifreli yedekle farklı IDB'ye tam döner; ham kasa gizliliği ve çocuk silme tutarlıdır", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/tests/runtime-fixture.html");
  const evidence = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const capacity = await import("/src/core/backup/backup-capacity.ts");
    const encryption = await import("/src/core/backup/encrypted-backup.ts");
    const { makeDevelopmentReportFixture } = await import("/tests/fixtures/development-report-fixture.mjs");
    const followup = await import("/src/features/teacher-followup/teacher-followup-service.ts");
    const domain = await import("/src/core/domain/teacher-followup.ts");
    const planning = await import("/src/features/planning/teacher-owned-plan-service.ts");
    const today = await import("/src/features/today/today-data.ts");
    const lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const sourceName = `followup-source-${crypto.randomUUID()}`, targetName = `followup-target-${crypto.randomUUID()}`;
    const source = new core.IndexedDbDataStore({ databaseName: sourceName });
    const fixture = await makeDevelopmentReportFixture(source);
    await today.saveClassroomConfiguration(source, {
      academicYear: { id: fixture.input.academicYearId, name: "Kurgu Eğitim Yılı", startDate: "2026-09-01", endDate: "2027-06-30" },
      classroom: { id: fixture.input.classroomId, name: "Kurgu Sınıf", schoolName: "Kurgu Üretim Okulu", teacherName: "Kurgu Üretim Öğretmeni", ageGroup: "60-72 ay", curriculumProgram: "Türkiye Yüzyılı Maarif Modeli", curriculumCatalogLabel: "tymm-legacy-partial · 2024" },
      schedule: { kind: "morning", startTime: "08:30", endTime: "12:30" }, now: new Date("2026-09-08T07:30:00.000Z"),
    });
    const studentId = fixture.input.studentId;
    const start = await source.readSnapshot();
    const selected = start.students.find(s => s.id === studentId)!;
    const contact = { id: crypto.randomUUID(), kind: "mother", relationship: "Anne", name: "Kurgu Anne", phone: "+905550000000", isPrimary: true, isAuthorizedPickup: false };
    const before = { ...selected, contacts: [contact], careDetails: { homeAddress: "Kurgu Sokak No: 1 Acıpayam Denizli" }, updatedAt: "2026-09-09T08:00:00.000Z" };
    await source.transaction("readwrite", ["students"], tx => tx.putMany("students", [before]));
    const after = { ...before, contacts: [{ ...contact, isAuthorizedPickup: true }], updatedAt: "2026-09-09T08:01:00.000Z" };
    const history = followup.contactAuthorityHistory(before, after, new Date(after.updatedAt));
    await source.transaction("readwrite", ["students", "settings"], async tx => { await tx.putMany("students", [after]); await tx.putMany("settings", history); });
    const append = (workflow, at: string, child: string | null = studentId) => followup.appendTeacherFollowup(source, { studentId: child, workflow, now: new Date(at) });
    const areas = ["phones", "address", "pickup"] as const;
    const fingerprints = Object.fromEntries(await Promise.all(areas.map(async area => [area, await followup.followupFingerprint(followup.contactAreaValue(after, area))])));
    await append({ kind: "contact-check", areas: [...areas], fingerprints, source: "family-confirmed", note: "Kurgu özel veli doğrulama notu" }, "2026-09-09T08:02:00.000Z");
    const pickup = await append({ kind: "pickup-log", contact: followup.pickupContactSnapshot(after.contacts[0]), handedOverAt: "2026-09-09T08:02:30.000Z", note: "Kurgu teslim notu", authorityFingerprint: await followup.followupFingerprint(followup.contactAreaValue(after, "pickup")) }, "2026-09-09T08:03:00.000Z");
    await append({ kind: "pickup-correction", sourceId: pickup.id, note: "Kurgu saat düzeltme gerekçesi" }, "2026-09-09T08:04:00.000Z");
    const meeting = await append({ kind: "family-meeting", participants: "Kurgu Anne", discussion: "Kurgu aile görüşmesi", decision: "Kurgu ortak karar", followupOn: "2026-09-10" }, "2026-09-09T08:05:00.000Z");
    await planning.createTeacherOwnedPlanGraph(source, { title: "Kurgu yıllık plan", periodStart: "2026-09-01", periodEnd: "2026-09-30", teacherContent: { narrative: "Yıllık genel metin" }, months: [{ title: "Kurgu Eylül", monthKey: "2026-09", periodStart: "2026-09-01", periodEnd: "2026-09-30", teacherContent: { narrative: "Aylık genel metin" }, weeks: [{ title: "Kurgu destek haftası", weekKey: "2026-W38", periodStart: "2026-09-14", periodEnd: "2026-09-18", teacherContent: { narrative: "Serbest genel öğretmen metni", materials: ["Kâğıt", "Boya"], preparation: ["Kurgu oyun alanını hazırla"] } }] }], now: new Date("2026-09-08T08:00:00.000Z") });
    const scope = { academicYearId: fixture.input.academicYearId, classroomId: fixture.input.classroomId };
    const candidates = followup.preparationCandidates(await source.readSnapshot(), scope, "2026-09-14", "2026-09-18");
    const items = followup.combinePreparationItems(candidates, "2026-09-14");
    const preparation = await append({ kind: "preparation-list", weekStart: "2026-09-14", weekEnd: "2026-09-18", sources: candidates.map(c => c.source), items }, "2026-09-09T08:06:00.000Z", null);
    const guide = await append({ kind: "guide-step", page: 10, sourceSha256: domain.GUIDE_DIGEST, title: "Kurgu uyum uygulaması", plannedOn: "2026-09-10" }, "2026-09-09T08:07:00.000Z");
    const decision = await append({ kind: "learning-decision", observationIds: [fixture.observationId], support: "small-group", teacherDecision: "Kurgu bireysel karar", targetWeekStart: "2026-09-14", targetWeekEnd: "2026-09-18", reviewOn: "2026-09-18" }, "2026-09-09T08:08:00.000Z");
    const weekly = (await source.readSnapshot()).plans.find(p => p.planType === "weekly")!;
    await followup.applyLearningDecisionToPlan(source, { decisionId: decision.id, planId: weekly.id, expectedUpdatedAt: weekly.updatedAt, appliedText: "Kurgu özel bireysel destek metni", now: new Date("2026-09-09T08:09:00.000Z") });
    await append({ kind: "followup-resolution", sourceId: meeting.id, outcome: "Kurgu aile takibi tamamlandı", nextFollowupOn: null }, "2026-09-10T08:00:00.000Z");
    await append({ kind: "guide-observation", sourceId: guide.id, observation: "Kurgu uyum gözlemi", status: "completed", nextFollowupOn: null }, "2026-09-10T08:01:00.000Z");
    await append({ kind: "preparation-check", sourceId: preparation.id, itemId: items[0].id, completed: true }, "2026-09-14T08:00:00.000Z", null);
    await append({ kind: "learning-reflection", sourceId: decision.id, reflection: "Kurgu sonraki hafta gözlemi", nextStep: "Kurgu yeni öğretmen adımı", nextFollowupOn: "2026-09-21" }, "2026-09-18T08:00:00.000Z");
    const original = await source.readSnapshot();
    domain.assertTeacherFollowupRelationships(original);
    const kinds = domain.teacherFollowups(original).map(r => r.workflow.kind).sort();
    const service = new core.BackupService(source, { appVersion: "0.27.0", clock: () => new Date("2026-09-18T09:00:00.000Z") });
    const password = "Kurgu-on-uc-olay-yedegi!";
    const envelope = await service.exportBackup();
    // Preserve the released 0.27.0/data-v9 fixture and exercise its identity migration.
    const legacyV9 = { ...envelope, manifest: { ...envelope.manifest, dataSchemaVersion: 9 } };
    const upgradedV9 = await service.parseAndVerifyBackup(legacyV9);
    const encrypted = service.serializeEncryptedBackup(await encryption.encryptBackupText(core.canonicalJson(legacyV9), { appVersion: "0.27.0", createdAt: envelope.manifest.createdAt }, password));
    const expected = await service.recoverySummary();
    const target = new core.IndexedDbDataStore({ databaseName: targetName });
    const restorer = new core.BackupService(target, { appVersion: "0.27.0", clock: () => new Date("2026-09-18T09:00:00.000Z") });
    await restorer.restoreEncryptedBackup(encrypted, password, { mode: "replace", createRecoverySnapshot: false });
    const restored = await target.readSnapshot();
    const actual = await restorer.recoverySummary();
    capacity.assertBackupRecoveryMatch(expected, actual);
    const raws = await Promise.all([sourceName, targetName].map(name => Promise.all(core.COLLECTION_NAMES.map(c => fx.readAll<Record<string, unknown>>(name, c)))));
    const rawRows = raws.flat(2);
    const privateSentinels = ["Kurgu özel veli doğrulama notu", "Kurgu özel bireysel destek metni", "Kurgu Sokak", "+905550000000"];
    const rawText = JSON.stringify(raws);
    const recovery = await restorer.createRecoverySnapshot("manual");
    const child = restored.students.find(s => s.id === studentId)!;
    await target.transaction("readwrite", ["students"], tx => tx.putMany("students", [{ ...child, active: false, enrollmentStatus: "left", updatedAt: "2026-09-19T08:00:00.000Z" }]));
    const deletion = await lifecycle.permanentlyDeleteArchivedStudent(target, { studentId, confirmationName: String(child.displayName), now: new Date("2026-09-20T08:00:00.000Z") });
    const deleted = await target.readSnapshot();
    domain.assertTeacherFollowupRelationships(deleted);
    await restorer.parseAndVerifyBackup(await restorer.exportBackup());
    const afterDeleteKinds = domain.teacherFollowups(deleted).map(r => r.workflow.kind).sort();
    const configured = today.resolveTodayWorkspace(original, new Date("2026-09-18T09:00:00.000Z")).classroom.status === "configured" && today.resolveTodayWorkspace(restored, new Date("2026-09-18T09:00:00.000Z")).classroom.status === "configured";
    const result = { configured, dataSchemaVersion: envelope.manifest.dataSchemaVersion, legacyVersion: legacyV9.manifest.dataSchemaVersion,
      legacyPayloadPreserved: core.canonicalJson(upgradedV9.payload) === core.canonicalJson(envelope.payload), kinds, countsAndHashesMatch: core.canonicalJson(expected.collections) === core.canonicalJson(actual.collections),
      deepEqual: core.canonicalJson(original) === core.canonicalJson(restored), durableReceipt: core.canonicalJson(restorer.lastRestoreVerification?.collections) === core.canonicalJson(expected.collections),
      rawRows: rawRows.length, allLocalRowsSealed: rawRows.every(row => Object.keys(row).sort().join(",") === "__maarifosLocalVault,id"),
      noPrivatePlaintext: privateSentinels.every(text => !rawText.includes(text) && !encrypted.includes(text)),
      afterDeleteKinds, noStudentReference: !core.canonicalJson(deleted).includes(studentId), privatePlanTextRemoved: !core.canonicalJson(deleted.plans).includes("Kurgu özel bireysel destek metni"),
      recoveryPurged: deletion.purgedRecoverySnapshotCount === 1 && await target.getRecoverySnapshot(recovery.id) === null };
    source.close(); target.close();
    return { result, productionFixture: encrypted, fixtureMetadata: { synthetic: true, appVersion: "0.27.0", password,
      civilDate: "2026-09-18", nowUtc: "2026-09-18T09:00:00.000Z", classroomConfigured: configured, studentId, studentDisplayName: String(selected.displayName),
      academicYearId: scope.academicYearId, classroomId: scope.classroomId, recordCount: expected.recordCount, workflowKinds: kinds } };
  });
  const { result } = evidence;
  expect(result.dataSchemaVersion).toBe(11);
  expect(result.legacyVersion).toBe(9);
  expect(result.legacyPayloadPreserved).toBe(true);
  expect(result.configured).toBe(true);
  expect(result.kinds).toEqual(["contact-check", "family-meeting", "followup-resolution", "guide-observation", "guide-step", "learning-decision", "learning-plan-link", "learning-reflection", "pickup-authority", "pickup-correction", "pickup-log", "preparation-check", "preparation-list"]);
  expect(result.rawRows).toBeGreaterThan(26);
  expect(result.afterDeleteKinds).toEqual(["preparation-check", "preparation-list"]);
  expect([result.countsAndHashesMatch, result.deepEqual, result.durableReceipt, result.allLocalRowsSealed, result.noPrivatePlaintext, result.noStudentReference, result.privatePlanTextRemoved, result.recoveryPurged]).toEqual(Array(8).fill(true));
  const directory = new URL("../../output/completion-2026-09-07/security/", import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("teacher-followup-roundtrip.json", directory), JSON.stringify(result, null, 2));
  await writeFile(new URL("teacher-followup-production-fixture.maarifos", directory), evidence.productionFixture);
  await writeFile(new URL("teacher-followup-production-fixture.metadata.json", directory), JSON.stringify(evidence.fixtureMetadata, null, 2));
});
