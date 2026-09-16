import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVITY_STUDIO_ITEMS,
  ACTIVITY_STUDIO_AGE_LABELS,
  createActivityStudioChildSession,
} from "../../src/features/activity-studio/activity-studio-model.ts";
import {
  createActivityTeacherGuide,
  startActivityTeacherObservation,
} from "../../src/features/activity-studio/activity-teacher-guide.ts";
import { createActivityStudioObservationSeed } from "../../src/features/activity-studio/activity-observation-seed.ts";

const activity = ACTIVITY_STUDIO_ITEMS.find((item) => item.ageBands.includes("48-60"));
const context = {
  ageBand: "48-60",
  ageLabel: "48–60 ay",
  scenarioId: "balanced",
  participationRouteId: "multiple",
};
const application = {
  sessionId: "synthetic-guide-session",
  planId: "synthetic-guide-plan",
  activityId: "synthetic-guide-activity",
  sourceActivityId: activity.id,
  civilDate: "2026-08-31",
};

test("rehber bankadaki bütün desteklenen yaşlarda özgün adım ve destek içeriğini korur", () => {
  for (const item of ACTIVITY_STUDIO_ITEMS) {
    for (const ageBand of item.ageBands) {
      const guide = createActivityTeacherGuide(item, { ...context, ageBand });
      assert.equal(guide.activity, item);
      assert.equal(guide.ageLabel, ACTIVITY_STUDIO_AGE_LABELS[ageBand]);
      assert.equal(guide.ageSupport, item.ageAdaptations[ageBand]);
      assert.equal(guide.activity.teacherSteps.length, 3);
      assert.ok(guide.activity.teacherSteps.every((step) => step.trim().length > 20));
      assert.ok(guide.activity.inclusionNote.trim());
      assert.ok(guide.activity.observationPrompt.trim());
    }
  }
  assert.throws(() => createActivityTeacherGuide(activity, {
    ...context, ageBand: "0-36",
  }), /yaş bandını desteklemiyor/u);
});

test("öğretmenin seçtiği koşul ve katılım yolu rehberde aynı bağlamla korunur", () => {
  const guide = createActivityTeacherGuide(activity, {
    ...context, scenarioId: "no-material", participationRouteId: "visual",
  });
  assert.equal(guide.adaptation.scenario.id, "no-material");
  assert.equal(guide.adaptation.participationRoute.id, "visual");
  assert.match(guide.adaptation.scenario.materialStrategy, /beden, ses/u);
  assert.match(guide.adaptation.facilitation, /bakış, işaret etme/u);
});

test("rehber gözlemi uygulama kimliğini bekler, mevcut denetleyiciye kanıtsız taslak iletir", async () => {
  const order = [];
  const selectedContext = { ...context, scenarioId: "low-energy" };
  await startActivityTeacherObservation({
    activity, context: selectedContext,
    onApply: async (actualActivity, actualContext) => {
      assert.equal(actualActivity, activity);
      assert.equal(actualContext, selectedContext);
      order.push("apply-start");
      await Promise.resolve();
      order.push("apply-complete");
      return application;
    },
    onWriteObservation: (request) => {
      order.push("review");
      assert.equal(request.application, application);
      assert.equal(request.activity, activity);
      assert.equal(request.session.activityId, activity.id);
      assert.equal(request.choice, null);
      assert.equal(request.drawingEvidence, null);
      assert.equal(request.scenarioId, selectedContext.scenarioId);
      const seed = createActivityStudioObservationSeed(request);
      assert.equal(seed.rawText, "");
      assert.equal(seed.childQuote, "");
      assert.ok(seed.context.includes(activity.title));
      assert.ok(seed.context.includes("Enerji düşük"));
      assert.equal(seed.categoryIds.length, 1);
    },
  });
  assert.deepEqual(order, ["apply-start", "apply-complete", "review"]);
});

test("hazırlık kilidi, desteklenmeyen yaş ve eksik gözlem bağlantısı uygulama oluşturmadan durur", async () => {
  let applied = 0;
  let reviewed = 0;
  const base = {
    activity, context,
    onApply: () => { applied += 1; return application; },
    onWriteObservation: () => { reviewed += 1; },
  };
  await assert.rejects(startActivityTeacherObservation({
    ...base, unavailableReason: "Önce eğitim yılını başlatın.",
  }), /eğitim yılını başlatın/u);
  await assert.rejects(startActivityTeacherObservation({
    ...base, context: { ...context, ageBand: "0-36" },
  }), /yaş bandını desteklemiyor/u);
  await assert.rejects(startActivityTeacherObservation({
    ...base, onWriteObservation: undefined,
  }), /bağlantısı kullanılamıyor/u);
  assert.equal(applied, 0);
  assert.equal(reviewed, 0);
});

test("önizleme veya başka etkinliğe ait uygulama kimliği gözlem açamaz", async () => {
  let reviewed = 0;
  for (const invalid of [undefined, { ...application, sourceActivityId: "other-activity" }]) {
    await assert.rejects(startActivityTeacherObservation({
      activity, context,
      onApply: () => invalid,
      onWriteObservation: () => { reviewed += 1; },
    }), /uygulama kimliği doğrulanamadı/u);
  }
  assert.equal(reviewed, 0);
});

test("kalıcılık ve kaynak denetimi hataları öğretmen için aynen geri döner", async () => {
  const persistenceError = new Error("Cihaz depolaması dolu.");
  let reviewed = 0;
  await assert.rejects(startActivityTeacherObservation({
    activity, context,
    onApply: () => { throw persistenceError; },
    onWriteObservation: () => { reviewed += 1; },
  }), (error) => error === persistenceError);
  assert.equal(reviewed, 0);
  const scopeError = new Error("Seçilen etkinlik güncel sınıf kapsamında değil.");
  await assert.rejects(startActivityTeacherObservation({
    activity, context,
    onApply: () => application,
    onWriteObservation: () => { throw scopeError; },
  }), (error) => error === scopeError);
});

test("sıfır çizgi ve çocuk seçimi yokken yardımcı metin ham gözleme dönüşmez", () => {
  const session = createActivityStudioChildSession(activity.id, context.ageBand);
  for (const drawingEvidence of [null, { mode: "drawing", strokeCount: 0, downloadedFileName: null }]) {
    const seed = createActivityStudioObservationSeed({
      activity, ...context, session, choice: null, drawingEvidence,
    });
    assert.equal(seed.rawText, "");
    assert.equal(seed.childQuote, "");
    assert.ok(seed.context.includes(activity.title));
    assert.ok(seed.context.includes(context.ageLabel));
  }
});
