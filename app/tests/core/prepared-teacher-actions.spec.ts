import { expect, test } from "@playwright/test";

test("Hazır destek seçimleri gerçek IDB kaynak zincirini kapatır; taşıma/yeniden gözlem mevcut haftayı kullanır", async ({ page }) => {
  test.setTimeout(90_000); await page.goto("/tests/runtime-fixture.html");
  const results = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts"), fixtures = await import("/tests/fixtures/prepared-teacher-actions-fixture.mjs"), service = await import("/src/features/teacher-followup/prepared-teacher-actions.ts"), domain = await import("/src/core/domain/teacher-followup.ts");
    const answers = [];
    for (const choice of ["carry", "observe", "close"]) {
      const store = new core.IndexedDbDataStore({ databaseName: `prepared-support-${crypto.randomUUID()}` }), f = await fixtures.makePreparedTeacherFixture(store);
      const model = await service.loadPreparedTeacherActions(store, { now: f.now, mode: "support" }), option = model.cards[0].options.find((o: any) => o.id === choice)!;
      const before = await store.readSnapshot(), result = await service.applyPreparedTeacherAction(store, { request: option.request, expectedFingerprint: model.fingerprint, now: f.now }), after = await store.readSnapshot();
      const records = domain.teacherFollowups(after), reflection = records.find((r: any) => r.workflow.kind === "learning-reflection"), continuation = records.find((r: any) => r.workflow.kind === "learning-continuation");
      const backup = new core.BackupService(store, { appVersion: "0.39.0", clock: () => new Date("2026-09-21T08:00:00.000Z") }); await backup.parseAndVerifyBackup(await backup.exportBackup());
      let stale = false; try { await service.applyPreparedTeacherAction(store, { request: option.request, expectedFingerprint: model.fingerprint, now: f.now }); } catch { stale = true; }
      answers.push({ choice, sourceClosed: !domain.followupReminders(records, "2026-09-21").some((r: any) => r.id === f.decision.id), rawPreserved: core.canonicalJson(before.observations) === core.canonicalJson(after.observations), reflection: !!reflection, continuation: !!continuation, plan: !!result.planId, stale, noDuplicate: core.canonicalJson(after) === core.canonicalJson(await store.readSnapshot()) }); store.close();
    } return answers;
  });
  for (const result of results) expect(result).toMatchObject({ sourceClosed: true, rawPreserved: true, reflection: true, continuation: result.choice !== "close", plan: result.choice !== "close", stale: true, noDuplicate: true });
});

test("Hazır odak ve aile görüşmesi offline kalıcıdır, atomik hata geri döner ve şifreli yedeğe aynen geçer", async ({ page, context }) => {
  test.setTimeout(90_000); await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async () => { Object.assign(window, { preparedModules: { core: await import("/src/core/index.ts"), fixture: await import("/tests/fixtures/prepared-teacher-actions-fixture.mjs"), service: await import("/src/features/teacher-followup/prepared-teacher-actions.ts"), encryption: await import("/src/core/backup/encrypted-backup.ts") } }); });
  await context.setOffline(true);
  const result = await page.evaluate(async () => {
    const { core, fixture, service, encryption } = (window as any).preparedModules;
    const store = new core.IndexedDbDataStore({ databaseName: `prepared-offline-${crypto.randomUUID()}` }), f = await fixture.makePreparedTeacherFixture(store), before = await store.readSnapshot();
    let model = await service.loadPreparedTeacherActions(store, { now: f.now, mode: "support" }), option = model.cards[0].options[0], writes = 0, rolledBack = false;
    const injected = { readSnapshot: () => store.readSnapshot(), close() {}, transaction: (mode: any, names: any, task: any) => store.transaction(mode, names, (tx: any) => task({ getAll: (name: any) => tx.getAll(name), clear: (name: any) => tx.clear(name), putMany: async (name: any, rows: any) => { await tx.putMany(name, rows); if (++writes === 2) throw new Error("Kurgu ikinci yazım hatası"); } })) };
    try { await service.applyPreparedTeacherAction(injected, { request: option.request, expectedFingerprint: model.fingerprint, now: f.now }); } catch { rolledBack = core.canonicalJson(before) === core.canonicalJson(await store.readSnapshot()); }
    model = await service.loadPreparedTeacherActions(store, { now: f.now, mode: "focus" }); option = model.cards[0].options[0];
    let tampered = false; try { await service.applyPreparedTeacherAction(store, { request: { ...option.request, studentIds: [crypto.randomUUID()] }, expectedFingerprint: model.fingerprint, now: f.now }); } catch { tampered = true; }
    const focus = await service.applyPreparedTeacherAction(store, { request: option.request, expectedFingerprint: model.fingerprint, now: f.now });
    model = await service.loadPreparedTeacherActions(store, { now: f.now, mode: "family" }); option = model.cards[0].options[0];
    const family = await service.applyPreparedTeacherAction(store, { request: option.request, expectedFingerprint: model.fingerprint, now: f.now }), after = await store.readSnapshot();
    const options = { appVersion: "0.39.0", clock: () => new Date("2026-09-21T08:00:00.000Z") }, backup = new core.BackupService(store, options), envelope = await backup.exportBackup(); await backup.parseAndVerifyBackup(envelope);
    const password = "Kurgu-hazir-adim-yedegi!", text = backup.serializeEncryptedBackup(await encryption.encryptBackupText(core.canonicalJson(envelope), { appVersion: "0.39.0", createdAt: envelope.manifest.createdAt }, password));
    const target = new core.IndexedDbDataStore({ databaseName: `prepared-restored-${crypto.randomUUID()}` }); await new core.BackupService(target, options).restoreEncryptedBackup(text, password, { mode: "replace", createRecoverySnapshot: false });
    const answer = { writes, rolledBack, tampered, focusCount: focus.recordIds.length, familySaved: !!family.appointmentId, links: after.settings.filter((r: any) => r.workflow?.kind === "family-preparation-link").length, rawAndAttendance: core.canonicalJson(before.observations) === core.canonicalJson(after.observations) && core.canonicalJson(before.attendanceRecords) === core.canonicalJson(after.attendanceRecords), roundtrip: core.canonicalJson(after) === core.canonicalJson(await target.readSnapshot()) };
    store.close(); target.close(); return answer;
  });
  expect(result).toEqual({ writes: 2, rolledBack: true, tampered: true, focusCount: 2, familySaved: true, links: 1, rawAndAttendance: true, roundtrip: true });
});

test("İki destek aynı haftayı paylaşır; kalıcı silme yeni bağlantıları temizlerken diğer çocuğun odağını korur", async ({ page }) => {
  test.setTimeout(90_000); await page.goto("/tests/runtime-fixture.html");
  const answer = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts"), fixture = await import("/tests/fixtures/prepared-teacher-actions-fixture.mjs"), service = await import("/src/features/teacher-followup/prepared-teacher-actions.ts"), followup = await import("/src/features/teacher-followup/teacher-followup-service.ts"), lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const store = new core.IndexedDbDataStore({ databaseName: `prepared-delete-${crypto.randomUUID()}` }), f = await fixture.makePreparedTeacherFixture(store);
    await followup.appendTeacherFollowup(store, { studentId: f.studentId, now: new Date("2026-09-10T08:00:00.000Z"), workflow: { ...f.decision.workflow, teacherDecision: "Kurgu ikinci destek niyeti." } });
    const plans: string[] = [];
    for (const mode of ["focus", "family", "support", "support"] as const) {
      const model = await service.loadPreparedTeacherActions(store, { now: f.now, mode }), option = model.cards[0].options[0];
      const result = await service.applyPreparedTeacherAction(store, { request: option.request, expectedFingerprint: model.fingerprint, now: f.now }); if (mode === "support") plans.push(result.planId!);
    }
    const before = await store.readSnapshot(), preview = lifecycle.previewPermanentStudentDeletion(before, f.studentId);
    const sharedSteps = (before.plans.find((p: any) => p.id === plans[0])!.teacherContent as any).followupSupportSteps.length;
    await lifecycle.permanentlyDeleteStudent(store, { studentId: f.studentId, confirmationName: preview.displayName, expectedFingerprint: preview.fingerprint, now: new Date("2026-10-01T08:00:00.000Z") });
    const after = await store.readSnapshot(), backup = new core.BackupService(store, { appVersion: "0.40.0", clock: () => new Date("2026-10-01T09:00:00.000Z") }); await backup.parseAndVerifyBackup(await backup.exportBackup());
    const result = { sameWeek: plans[0] === plans[1], sharedSteps, deletedStudentGone: !core.canonicalJson(after).includes(f.studentId), otherFocus: after.settings.filter((r: any) => r.workflow?.kind === "observation-focus" && r.studentId === f.otherStudentId).length, noFamilyLink: !after.settings.some((r: any) => r.workflow?.kind === "family-preparation-link"), genericPlanPreserved: after.plans.some(p => p.id === plans[0]) }; store.close(); return result;
  });
  expect(answer).toEqual({ sameWeek: true, sharedSteps: 2, deletedStudentGone: true, otherFocus: 1, noFamilyLink: true, genericPlanPreserved: true });
});
