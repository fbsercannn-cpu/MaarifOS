import { expect, test } from "@playwright/test";

test("kalıcı silme aynı metinli iki destekten yalnız hedef çocuğun current/tarihçe adımlarını ve gerçek recovery kopyasını temizler", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const { makeDevelopmentReportFixture } = await import("/tests/fixtures/development-report-fixture.mjs");
    const followup = await import("/src/features/teacher-followup/teacher-followup-service.ts");
    const domain = await import("/src/core/domain/teacher-followup.ts");
    const planning = await import("/src/features/planning/teacher-owned-plan-service.ts");
    const lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const spontaneous = await import("/src/features/evidence/spontaneous-observation.ts");
    const presets = await import("/src/features/evidence/development-observation-presets.ts");
    const quick = await import("/src/features/evidence/quick-observation.ts");
    const name = `support-deletion-${crypto.randomUUID()}`;
    const store = new core.IndexedDbDataStore({ databaseName: name });
    const fixture = await makeDevelopmentReportFixture(store);
    const initial = await store.readSnapshot();
    const studentId = fixture.input.studentId, otherId = fixture.otherStudentId;
    const observation = initial.observations.find(o => o.id === fixture.observationId)!;
    const otherObservationId = crypto.randomUUID();
    const context = await spontaneous.ensureSpontaneousObservationContext(store, { studentId: otherId, civilDate: "2026-09-08", now: fixture.now });
    const { programMapping: _mapping, ...draft } = presets.createDevelopmentObservationDraft({ ...fixture.selection, rawText: "Kurgu ikinci çocuk arkadaşını oyuna davet etti." });
    await quick.persistQuickObservationDraft(store, { ...draft, studentId: otherId, planId: context.plan.id, activityId: context.activity.id, developmentSelection: fixture.selection, now: fixture.now });
    await quick.finalizeQuickObservationDraft(store, { studentId: otherId, observationId: otherObservationId, now: fixture.now });
    await planning.createTeacherOwnedPlanGraph(store, { title: "Kurgu yıllık plan", periodStart: "2026-09-01", periodEnd: "2026-09-30", teacherContent: { narrative: "Yıllık genel metin" }, months: [{ title: "Kurgu Eylül", monthKey: "2026-09", periodStart: "2026-09-01", periodEnd: "2026-09-30", teacherContent: { narrative: "Aylık genel metin" }, weeks: [{ title: "Kurgu destek haftası", weekKey: "2026-W38", periodStart: "2026-09-14", periodEnd: "2026-09-18", teacherContent: { narrative: "Korunacak serbest öğretmen metni" } }] }], now: new Date("2026-09-08T08:00:00.000Z") });
    const planId = (await store.readSnapshot()).plans.find(p => p.planType === "weekly")!.id;
    const decisions = [];
    for (const [index, child] of [studentId, otherId].entries()) {
      const decision = await followup.appendTeacherFollowup(store, { studentId: child, workflow: { kind: "learning-decision", observationIds: [index ? otherObservationId : observation.id], support: "small-group", teacherDecision: "Kurgu küçük grup desteği", targetWeekStart: "2026-09-14", targetWeekEnd: "2026-09-18", reviewOn: "2026-09-18" }, now: new Date(`2026-09-09T08:0${index}:00.000Z`) });
      decisions.push(decision.id);
      const plan = (await store.readSnapshot()).plans.find(p => p.id === planId)!;
      await followup.applyLearningDecisionToPlan(store, { decisionId: decision.id, planId, expectedUpdatedAt: plan.updatedAt, appliedText: "İki çocukta birebir aynı destek metni", now: new Date(`2026-09-09T08:0${index}:30.000Z`) });
    }
    const beforeRevision = (await store.readSnapshot()).plans.find(p => p.id === planId)!;
    await planning.reviseTeacherOwnedPlan(store, { planId, expectedUpdatedAt: beforeRevision.updatedAt, title: "Kurgu son başlık", now: new Date("2026-09-09T09:00:00.000Z") });
    const before = await store.readSnapshot();
    const service = new core.BackupService(store, { appVersion: "support-privacy-test", clock: () => new Date("2026-09-09T10:00:00.000Z") });
    const recovery = await service.createRecoverySnapshot("manual");
    const student = before.students.find(s => s.id === studentId)!;
    await store.transaction("readwrite", ["students"], tx => tx.putMany("students", [{ ...student, active: false, enrollmentStatus: "left", updatedAt: "2026-09-09T10:30:00.000Z" }]));
    const archived = core.canonicalJson(await store.readSnapshot());
    const atomic = store.transactionWithStudentRecoveryPurge.bind(store);
    store.transactionWithStudentRecoveryPurge = (id, task) => atomic(id, async tx => { await task(tx); throw new Error("Kurgu atomik kesinti"); });
    let rejected = false;
    try { await lifecycle.permanentlyDeleteArchivedStudent(store, { studentId, confirmationName: String(student.displayName), now: new Date("2026-09-09T11:00:00.000Z") }); }
    catch (error) { rejected = error instanceof Error && error.message === "Kurgu atomik kesinti"; }
    const atomicFailurePreserved = rejected && core.canonicalJson(await store.readSnapshot()) === archived && await store.getRecoverySnapshot(recovery.id) !== null;
    store.transactionWithStudentRecoveryPurge = atomic;
    const deletion = await lifecycle.permanentlyDeleteArchivedStudent(store, { studentId, confirmationName: String(student.displayName), now: new Date("2026-09-09T11:00:00.000Z") });
    const after = await store.readSnapshot();
    const plan = after.plans.find(p => p.id === planId)!;
    const originalPlan = before.plans.find(p => p.id === planId)!;
    domain.assertTeacherFollowupRelationships(after);
    await service.parseAndVerifyBackup(await service.exportBackup());
    const contents = [plan.teacherContent, ...plan.revisionHistory.map(r => r.teacherContent)];
    const steps = contents.flatMap(c => c.followupSupportSteps ?? []);
    const result = { atomicFailurePreserved, purged: deletion.purgedRecoverySnapshotCount, recoveryMissing: await store.getRecoverySnapshot(recovery.id) === null,
      allTargetRemoved: !JSON.stringify(plan).includes(studentId) && !JSON.stringify(plan).includes(decisions[0]),
      currentOtherExact: core.canonicalJson(plan.teacherContent.followupSupportSteps) === core.canonicalJson([{ decisionId: decisions[1], studentId: otherId, text: "İki çocukta birebir aynı destek metni" }]),
      historyOtherCount: steps.filter(s => s.studentId === otherId).length,
      narrativesPreserved: contents.every(c => c.narrative === "Korunacak serbest öğretmen metni"),
      revisionCountPreserved: plan.revisionHistory.length === originalPlan.revisionHistory.length && plan.revisionNumber === originalPlan.revisionNumber,
      timestampsPreserved: plan.revisionHistory.every((r, i) => r.updatedAt === originalPlan.revisionHistory[i].updatedAt && r.capturedAt === originalPlan.revisionHistory[i].capturedAt),
      noEmptyStepField: contents.filter(c => !("followupSupportSteps" in c)).length === 2,
      updatedAt: plan.updatedAt };
    store.close();
    const reopened = new core.IndexedDbDataStore({ databaseName: name });
    const persisted = core.canonicalJson((await reopened.readSnapshot()).plans.find(p => p.id === planId)) === core.canonicalJson(plan);
    reopened.close();
    return { ...result, persisted };
  });
  expect(result).toEqual({ atomicFailurePreserved: true, purged: 1, recoveryMissing: true, allTargetRemoved: true, currentOtherExact: true, historyOtherCount: 2,
    narrativesPreserved: true, revisionCountPreserved: true, timestampsPreserved: true, noEmptyStepField: true, updatedAt: "2026-09-09T11:00:00.000Z", persisted: true });
});
