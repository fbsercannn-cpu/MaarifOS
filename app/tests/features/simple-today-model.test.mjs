import assert from "node:assert/strict";
import test from "node:test";

import { createSimpleTodayPresentation } from "../../src/features/simple-experience/simple-today-model.ts";

function input(overrides = {}) {
  return {
    hasClassroom: true,
    operationalStatus: "active",
    educationalWritesDisabled: false,
    studentCount: 2,
    dailyPlanReady: false,
    attendanceMarked: 0,
    attendanceTotal: 2,
    assistantBrief: {
      title: "Yoklamayı tamamlayın",
      actionLabel: "Yoklamayı aç",
      action: { kind: "attendance" },
      rationale: "İki çocuğun devam durumunu işaretleyin.",
      evidence: ["Sınıf 2 çocuk", "Yoklama 0/2"],
    },
    ...overrides,
  };
}

test("hazırlık yılı çocuk, plan veya yedek adımında takılmadan doğrudan başlatılabilir", () => {
  for (const missingStep of ["classroom", "students", "plan", "backup"]) {
    const presentation = createSimpleTodayPresentation(input({
      operationalStatus: "preparation",
      educationalWritesDisabled: true,
      studentCount: 0,
      dailyPlanReady: false,
      assistantBrief: {
        title: "Hazırlığı tamamlayın",
        actionLabel: "Tamamla",
        action: { kind: "setup", stepId: missingStep },
        rationale: "Hazırlık tamamlanmadı.",
        evidence: [],
      },
    }));
    assert.equal(presentation.primary.label, "Eğitim yılını başlat");
    assert.deepEqual(presentation.primary.action, { kind: "start-year" });
    assert.equal(presentation.followUps.length, 2);
    assert.ok(presentation.followUps.every((entry) =>
      entry.action.kind === "setup" || entry.action.kind === "teacher-cycle"));
    assert.doesNotMatch(presentation.reasons.join(" "), /tamamlanmadı|yedek/iu);
  }
});

test("kurulmamış sınıf veya kapalı yıl yeni yıl başlatma kestirmesi üretmez", () => {
  const setupBrief = {
    action: { kind: "setup", stepId: "classroom" },
    actionLabel: "Sınıfı kur",
    title: "Sınıfı kurun",
    rationale: "Önce sınıf bilgilerini girin.",
    evidence: [],
  };
  for (const state of [
    { hasClassroom: false, operationalStatus: "preparation" },
    { hasClassroom: true, operationalStatus: "ended" },
  ]) {
    const presentation = createSimpleTodayPresentation(input({
      ...state,
      educationalWritesDisabled: true,
      assistantBrief: setupBrief,
    }));
    assert.deepEqual(presentation.primary.action, { kind: "setup", stepId: "classroom" });
    assert.deepEqual(presentation.followUps, []);
  }
});

test("ana yoklama ve günlük plan eylemleri takip satırlarında yinelenmez", () => {
  for (const action of [
    { kind: "attendance" },
    { kind: "plan" },
    { kind: "teacher-cycle", stageId: "daily" },
    { kind: "pending-observation" },
    { kind: "day-closure" },
  ]) {
    const base = input();
    const presentation = createSimpleTodayPresentation(input({
      assistantBrief: { ...base.assistantBrief, action },
    }));
    assert.ok(presentation.reasons.length <= 2);
    assert.equal(presentation.followUps.length, 2);
    const primaryDaily = action.kind === "plan" ||
      (action.kind === "teacher-cycle" && action.stageId === "daily");
    assert.equal(presentation.followUps[0].action.kind, primaryDaily ? "attendance" : "teacher-cycle");
    assert.deepEqual(presentation.followUps[1].action, { kind: "day-details" });
    assert.ok(presentation.followUps.every((entry) => JSON.stringify(entry.action) !== JSON.stringify(action)));
  }
});

test("çocuksuz sınıfta boş yoklama yerine çocuk listesi açılır", () => {
  const base = input();
  const presentation = createSimpleTodayPresentation(input({
    studentCount: 0,
    attendanceTotal: 0,
    assistantBrief: { ...base.assistantBrief, action: { kind: "plan" } },
  }));
  assert.deepEqual(presentation.primary.action, { kind: "setup", stepId: "students" });
  assert.equal(presentation.primary.label, "Sınıfıma çocuk ekle");
  assert.match(presentation.primary.detail, /çocuk listesi/iu);
  assert.deepEqual(presentation.followUps, []);
});

test("kayıtlı çocuk varken henüz oluşmamış yoklama kapsamı sınıfı boş göstermez", () => {
  const base = input();
  const presentation = createSimpleTodayPresentation(input({
    studentCount: 2,
    attendanceTotal: 0,
    assistantBrief: {
      ...base.assistantBrief,
      action: { kind: "plan" },
      evidence: ["Sınıf 0 çocuk", "Yoklama 0/0"],
    },
  }));
  assert.equal(presentation.followUps[0].action.kind, "attendance");
  assert.match(presentation.followUps[0].detail, /kapsamı henüz oluşmadı/u);
  assert.doesNotMatch(presentation.followUps[0].detail, /çocuk ekle|sınıf boş/u);
  assert.match(presentation.reasons.join(" "), /Kayıtlı 2 çocuk/u);
  assert.doesNotMatch(presentation.reasons.join(" "), /Sınıf 0 çocuk/u);
});
