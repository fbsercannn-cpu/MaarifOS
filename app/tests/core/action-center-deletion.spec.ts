import { expect, test } from "@playwright/test";

test("Gözlemden oluşturulan ortak destek planı silinen çocuğu tüm revizyonlardan çıkarır; diğer çocuğun zinciri yedekte korunur", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const fx = await import("/tests/fixtures/development-report-fixture.mjs");
    const quick = await import("/src/features/evidence/quick-observation.ts");
    const spontaneous = await import("/src/features/evidence/spontaneous-observation.ts");
    const action = await import("/src/features/action-center/action-center-service.ts");
    const model = await import("/src/features/action-center/action-center-model.ts");
    const followup = await import("/src/core/domain/teacher-followup.ts");
    const planning = await import("/src/features/planning/teacher-owned-plan-service.ts");
    const lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const encryption = await import("/src/core/backup/encrypted-backup.ts");
    const source = new core.IndexedDbDataStore({ databaseName: `action-delete-source-${crypto.randomUUID()}` });
    const fixture = await fx.makeDevelopmentReportFixture(source);
    const deletedStudentId = fixture.input.studentId;
    const otherStudentId = fixture.otherStudentId;
    const sources: Array<{ studentId: string; observationId: string; planId: string }> = [];
    for (const [index, studentId] of [deletedStudentId, otherStudentId].entries()) {
      const day = index === 0 ? "2026-09-10" : "2026-09-11";
      const now = new Date(`${day}T09:00:00.000Z`);
      const observationId = crypto.randomUUID();
      const context = await spontaneous.ensureSpontaneousObservationContext(source, { studentId, civilDate: day, now });
      await quick.persistQuickObservationDraft(source, { studentId, planId: context.plan.id, activityId: context.activity.id, rawText: index === 0 ? "Kurgu ilk çocuk kendi resmini anlattı." : "Kurgu ikinci çocuk oyun sırasında kendi sözünü kullandı.", context: "Kurgu serbest zaman", childQuote: "", observationType: "quick-note", categoryIds: [], now });
      await quick.finalizeQuickObservationDraft(source, { studentId, observationId, now });
      const options = { studentId, observationId, now };
      const initial = model.actionCenterModel(await source.readSnapshot(), options).observations[0];
      await action.assignObservationCategory(source, { ...initial.scope, category: "language-communication", now });
      const selected = model.actionCenterModel(await source.readSnapshot(), options).observations[0];
      const completed = await action.executeObservationSupport(source, { action: selected, optionId: index === 0 ? "small-group" : "observe-again", now });
      sources.push({ studentId, observationId, planId: completed.planId });
    }
    const before = await source.readSnapshot();
    const weeklyBefore = before.plans.find(p => p.id === sources[0].planId)!;
    const teacherGraphIds = before.plans.filter(p => p.planOrigin === "teacher-authored").map(p => p.id).sort();
    const removedFollowups = followup.teacherFollowups(before).filter(r => r.studentId === deletedStudentId);
    const preservedFollowups = followup.teacherFollowups(before).filter(r => r.studentId === otherStudentId);
    followup.assertTeacherFollowupRelationships(before);
    let backupNow = new Date("2026-10-01T08:59:00.000Z");
    const backupOptions = { appVersion: "0.35.0", clock: () => backupNow };
    const backup = new core.BackupService(source, backupOptions);
    const recovery = await backup.createRecoverySnapshot("manual");
    const preview = lifecycle.previewPermanentStudentDeletion(before, deletedStudentId);
    const deletion = await lifecycle.permanentlyDeleteStudent(source, { studentId: deletedStudentId, confirmationName: preview.displayName, expectedFingerprint: preview.fingerprint, now: new Date("2026-10-01T09:00:00.000Z") });
    backupNow = new Date("2026-10-01T10:00:00.000Z");
    const after = await source.readSnapshot();
    followup.assertTeacherFollowupRelationships(after);
    await planning.loadTeacherOwnedPlanGraph(source, { annualPlanId: String(weeklyBefore.annualPlanId) });
    const verified = await backup.parseAndVerifyBackup(await backup.exportBackup());
    const password = "Kurgu-silme-sonrasi-yedek!";
    const encrypted = backup.serializeEncryptedBackup(await encryption.encryptBackupText(core.canonicalJson(verified), { appVersion: "0.35.0", createdAt: verified.manifest.createdAt }, password));
    const target = new core.IndexedDbDataStore({ databaseName: `action-delete-restored-${crypto.randomUUID()}` });
    const restorer = new core.BackupService(target, backupOptions);
    await restorer.restoreEncryptedBackup(encrypted, password, { mode: "replace", createRecoverySnapshot: false });
    const restored = await target.readSnapshot();
    followup.assertTeacherFollowupRelationships(restored);
    await planning.loadTeacherOwnedPlanGraph(target, { annualPlanId: String(weeklyBefore.annualPlanId) });
    const weekly = restored.plans.find(p => p.id === sources[0].planId)!;
    const planText = core.canonicalJson(restored.plans);
    const snapshotText = core.canonicalJson(restored);
    const removedIds = [deletedStudentId, sources[0].observationId, fixture.observationId, ...removedFollowups.map(r => r.id)];
    const preservedDecision = preservedFollowups.find(r => r.workflow.kind === "learning-decision")!;
    const content = weekly.teacherContent as { followupSupportSteps: Array<{ decisionId: string; studentId: string; text: string }> };
    const findings = {
      commonPlan: sources[0].planId === sources[1].planId,
      beforeRevisionCount: Array.isArray(weeklyBefore.revisionHistory) ? weeklyBefore.revisionHistory.length : 0,
      deletedStudentAbsent: !restored.students.some(s => s.id === deletedStudentId),
      otherStudentPresent: restored.students.some(s => s.id === otherStudentId),
      removedIdsAbsentEverywhere: removedIds.every(id => !snapshotText.includes(id)),
      removedIdsAbsentFromPlanCurrentAndHistory: removedIds.every(id => !planText.includes(id)),
      removedSupportNameAbsentFromPlan: !planText.includes(preview.displayName),
      genericGraphPreserved: core.canonicalJson(restored.plans.filter(p => p.planOrigin === "teacher-authored").map(p => p.id).sort()) === core.canonicalJson(teacherGraphIds),
      otherSupportStepPreserved: content.followupSupportSteps.length === 1 && content.followupSupportSteps[0].studentId === otherStudentId && content.followupSupportSteps[0].decisionId === preservedDecision.id,
      otherSourcePreserved: restored.observations.some(o => o.id === sources[1].observationId && o.rawText === "Kurgu ikinci çocuk oyun sırasında kendi sözünü kullandı."),
      otherFollowupsUnchanged: core.canonicalJson(followup.teacherFollowups(restored)) === core.canonicalJson(preservedFollowups),
      revisionCountPreserved: Array.isArray(weekly.revisionHistory) && weekly.revisionHistory.length === 2,
      backupRoundTripExact: core.canonicalJson(after) === core.canonicalJson(restored),
      recoveryPurged: deletion.purgedRecoverySnapshotCount === 1 && await source.getRecoverySnapshot(recovery.id) === null,
    };
    source.close(); target.close();
    return findings;
  });
  expect(result).toEqual({ commonPlan: true, beforeRevisionCount: 2, deletedStudentAbsent: true, otherStudentPresent: true, removedIdsAbsentEverywhere: true, removedIdsAbsentFromPlanCurrentAndHistory: true, removedSupportNameAbsentFromPlan: true, genericGraphPreserved: true, otherSupportStepPreserved: true, otherSourcePreserved: true, otherFollowupsUnchanged: true, revisionCountPreserved: true, backupRoundTripExact: true, recoveryPurged: true });
});
