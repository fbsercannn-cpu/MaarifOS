import assert from "node:assert/strict";
import test from "node:test";
import { assertEntityRecord } from "../../src/core/repository/entities.ts";
import {
  assertPlayFamilyCycleRelationships,
  buildPlayFamilyCycleView,
  isPlayFamilyCycleRecord,
  playFamilyCycleRecords,
  recordPlayFamilyCycle,
} from "../../src/features/planning/play-family-cycle.ts";
import {
  FamilyMemoryStore,
  familyScope,
  familyStudentId,
  familyUid,
  seedFamilyEngagementFixture,
} from "../fixtures/family-engagement-fixture.mjs";

async function makePlayFixture() {
  const store = new FamilyMemoryStore();
  const family = await seedFamilyEngagementFixture(store, { includeMeeting: false });
  const planId = familyUid(300);
  const activityId = familyUid(301);
  const observationId = familyUid(302);
  const base = {
    createdAt: "2026-09-18T08:00:00.000Z",
    updatedAt: "2026-09-18T08:00:00.000Z",
    civilDate: "2026-09-18",
    deletedAt: null,
    schemaVersion: 2,
    ...familyScope,
  };
  store.snapshot.plans.push({
    ...base,
    id: planId,
    planType: "daily",
    title: "Kurgu yapı oyunu planı",
    curriculumTargets: [{ id: "planned-social", referenceTitle: "Planlanan sosyal alan" }],
  });
  store.snapshot.activities.push({
    ...base,
    id: activityId,
    planId,
    title: "Kurgu yapı oyunu",
    status: "completed",
    studentIds: [familyStudentId],
  });
  store.snapshot.observations.push({
    ...base,
    id: observationId,
    planId,
    activityId,
    studentIds: [familyStudentId],
    rawText: "Çocuk iki parçayı yan yana getirip yakınına gösterdi.",
    rawTextImmutable: true,
    workflowStatus: "captured",
    observedAt: "2026-09-18T08:00:00.000Z",
  });
  return { store, family, planId, activityId, observationId };
}

test("oyun uygulaması, gözleme dayalı yansıtma, aile önerisi ve geri bildirim ayrı kaynak zinciridir", async () => {
  const { store, family, planId, activityId, observationId } = await makePlayFixture();
  const observationBefore = structuredClone(store.snapshot.observations[0]);
  const common = { ...familyScope, studentId: familyStudentId, teacherConfirmed: true };

  const application = await recordPlayFamilyCycle(store, {
    ...common,
    previousRecordId: null,
    now: new Date("2026-09-18T12:00:00.000Z"),
    workflow: {
      kind: "application",
      sourcePlanId: planId,
      sourceActivityId: activityId,
      materials: ["Ahşap bloklar", "Kumaş parçaları"],
      adaptation: "Kavraması kolay iki büyük parça yakına yerleştirildi.",
      implementation: "Çocukların seçtiği parçalarla ortak bir yapı oyunu uygulandı.",
      appliedAtUtc: "2026-09-18T08:30:00.000Z",
    },
  });
  const reflection = await recordPlayFamilyCycle(store, {
    ...common,
    previousRecordId: application.id,
    now: new Date("2026-09-18T12:01:00.000Z"),
    workflow: {
      kind: "reflection",
      sourceApplicationId: application.id,
      observationIds: [observationId],
      teacherReflection: "Ortak yapı sırasında ham gözlemde görülen yaklaşımı yeniden inceleyeceğim.",
      nextStep: "Bir sonraki oyunda farklı büyüklükte parçalar sunacağım.",
    },
  });
  const suggestion = await recordPlayFamilyCycle(store, {
    ...common,
    previousRecordId: reflection.id,
    now: new Date("2026-09-18T12:02:00.000Z"),
    workflow: {
      kind: "family-suggestion",
      sourceReflectionId: reflection.id,
      familyEngagementRecordId: family.preference.id,
      contactId: family.preference.workflow.contact.id,
      suggestion: "Evde iki farklı dokudaki nesneyle birlikte küçük bir yapı kurmayı deneyebilirsiniz.",
      sharedOn: "2026-09-18",
    },
  });
  const feedback = await recordPlayFamilyCycle(store, {
    ...common,
    previousRecordId: suggestion.id,
    now: new Date("2026-09-18T12:03:00.000Z"),
    workflow: {
      kind: "family-feedback",
      sourceSuggestionId: suggestion.id,
      familyEngagementRecordId: family.preference.id,
      contactId: family.preference.workflow.contact.id,
      receivedOn: "2026-09-18",
      source: "oral",
      feedback: "Yakını, kumaş parçalarıyla kısa süre oyun kurduklarını bildirdi.",
      teacherNote: "Bildirim ayrı aile kaydıdır; sonraki gözlemde yeniden bakılacak.",
    },
  });
  for (const record of [application, reflection, suggestion, feedback]) {
    assert.doesNotThrow(() => assertEntityRecord("settings", record));
  }

  const view = buildPlayFamilyCycleView(store.snapshot, application.id);
  assert.equal(view.application.id, application.id);
  assert.equal(view.reflection?.id, reflection.id);
  assert.equal(view.familySuggestions[0].id, suggestion.id);
  assert.equal(view.familyFeedback[0].id, feedback.id);
  assert.equal(view.contract.familyFeedbackCreatesSkill, false);
  assert.equal(view.contract.applicationIsObservation, false);
  assert.deepEqual(store.snapshot.observations[0], observationBefore);
  assert.equal(playFamilyCycleRecords(store.snapshot).length, 4);
  assertPlayFamilyCycleRelationships(store.snapshot);
});

test("sahte beceri/puan alanı, eksik öğretmen onayı ve kopuk kaynaklar fail-closed reddedilir", async () => {
  const { store, planId, activityId, observationId } = await makePlayFixture();
  const common = { ...familyScope, studentId: familyStudentId, previousRecordId: null };
  const workflow = {
    kind: "application",
    sourcePlanId: planId,
    sourceActivityId: activityId,
    materials: ["Ahşap blok"],
    adaptation: "Büyük parça seçeneği sunuldu.",
    implementation: "Yapı oyunu uygulandı.",
    appliedAtUtc: "2026-09-18T08:30:00.000Z",
  };
  await assert.rejects(
    recordPlayFamilyCycle(store, { ...common, teacherConfirmed: false, workflow }),
    /öğretmen onayıyla/u,
  );
  await assert.rejects(
    recordPlayFamilyCycle(store, { ...common, teacherConfirmed: true, workflow: { ...workflow, childScore: 100 } }),
    /geçerli alanlar/u,
  );
  assert.equal(playFamilyCycleRecords(store.snapshot).length, 0);

  const application = await recordPlayFamilyCycle(store, {
    ...common,
    teacherConfirmed: true,
    now: new Date("2026-09-18T12:00:00.000Z"),
    workflow,
  });
  await assert.rejects(recordPlayFamilyCycle(store, {
    ...familyScope,
    studentId: familyStudentId,
    previousRecordId: application.id,
    teacherConfirmed: true,
    now: new Date("2026-09-18T12:01:00.000Z"),
    workflow: {
      kind: "reflection",
      sourceApplicationId: application.id,
      observationIds: [crypto.randomUUID()],
      teacherReflection: "Kurgu yansıtma",
      nextStep: "",
    },
  }), /gözlem kaynağı/u);
  assert.equal(playFamilyCycleRecords(store.snapshot).length, 1);

  const tampered = structuredClone(application);
  tampered.workflow.skillAcquired = true;
  assert.equal(isPlayFamilyCycleRecord(tampered), false);
  assert.equal(observationId, familyUid(302));
});
