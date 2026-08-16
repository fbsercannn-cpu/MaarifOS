import assert from "node:assert/strict";
import test from "node:test";

import { createMarifTeacherAgentBrief } from "../../src/features/today/marif-teacher-agent.ts";

function setup(overrides = {}) {
  return {
    completedCount: 4,
    totalCount: 4,
    remainingCount: 0,
    percent: 100,
    isComplete: true,
    currentStepId: null,
    currentStep: null,
    headline: "MaarifOS kullanıma hazır",
    detail: "Hazır",
    steps: [],
    ...overrides,
  };
}

function control(overrides = {}) {
  return {
    attendance: {
      inClass: 3,
      expected: 3,
      absent: 0,
      late: 0,
      unmarked: 0,
      stateLabel: "Yoklama tamam",
      detailLabel: "0 yok · 0 geç",
    },
    plan: {
      item: null,
      label: "Bugünün akışı",
      title: "Günün uygulaması tamamlandı",
      detail: "1/1 etkinlik tamamlandı",
    },
    priority: {
      count: 0,
      title: "Program bağlantıları tamam",
      detail: "Bekleyen kanıt yok",
    },
    ...overrides,
  };
}

function cycle(overrides = {}) {
  return {
    currentStep: "document",
    stages: [
      {
        id: "daily",
        label: "Günlük",
        title: "Günün uygulaması tamamlandı",
        detail: "1 etkinlik · 1 gözlem",
        actionLabel: "Planı aç",
        tone: "ready",
      },
      {
        id: "weekly",
        label: "Haftalık",
        title: "Haftalık karar kaydedildi",
        detail: "3 gözlem · 1 değerlendirme",
        actionLabel: "Kararı aç",
        tone: "ready",
      },
      {
        id: "monthly",
        label: "Aylık",
        title: "Aylık değerlendirme kayıtlı",
        detail: "5 gözlem · 1 değerlendirme",
        actionLabel: "Değerlendirmeyi aç",
        tone: "ready",
      },
      {
        id: "documents",
        label: "Belgeler",
        title: "2 belge kaynağı hazır",
        detail: "Plan ve anekdot kayıtları hazır",
        actionLabel: "Belge merkezini aç",
        tone: "ready",
      },
    ],
    ...overrides,
  };
}

function dayClosure(overrides = {}) {
  return {
    status: "closed",
    issues: [],
    carryForwardItems: [],
    resolvedCarryForwardItems: [],
    ...overrides,
  };
}

test("MARİF eksik kurulumu tüm günlük işlerden önce gerekçeli olarak öne alır", () => {
  const brief = createMarifTeacherAgentBrief({
    educationalWritesDisabled: true,
    setup: setup({
      completedCount: 1,
      remainingCount: 3,
      percent: 25,
      isComplete: false,
      currentStepId: "students",
      currentStep: {
        id: "students",
        order: 2,
        label: "Çocuk listesi",
        title: "İlk çocuğu ekleyin",
        detail: "Gerçek sınıf kapsamı olmadan gözlem açılamaz.",
        actionLabel: "İlk çocuğu ekle",
        status: "current",
      },
    }),
    control: control(),
    cycle: cycle(),
    dayClosure: dayClosure(),
  });

  assert.equal(brief.action.kind, "setup");
  assert.equal(brief.action.stepId, "students");
  assert.equal(brief.title, "İlk çocuğu ekleyin");
  assert.match(brief.rationale, /çocuk listesi/);
  assert.ok(brief.critiques.some((item) => item.id === "academic-year-write-lock"));
  assert.ok(!brief.critiques.some((item) => item.id === "attendance-unmarked"));
  assert.ok(brief.evidence.includes("Yoklama dönem etkinleşince açılacak"));
});

test("MARİF tamamlanmamış yoklamayı gözlem ve değerlendirmeden önce seçer", () => {
  const brief = createMarifTeacherAgentBrief({
    educationalWritesDisabled: false,
    setup: setup(),
    control: control({
      attendance: {
        inClass: 2,
        expected: 3,
        absent: 0,
        late: 0,
        unmarked: 1,
        stateLabel: "Yoklama eksik",
        detailLabel: "1 işaretlenmedi",
      },
      priority: {
        count: 2,
        title: "2 gözlem program bağlantısı bekliyor",
        detail: "Kanıt zinciri eksik",
      },
    }),
    cycle: cycle({ currentStep: "observe" }),
    dayClosure: dayClosure({ status: "open" }),
  });

  assert.deepEqual(brief.action, { kind: "attendance" });
  assert.match(brief.rationale, /1 çocuk işaretlenmedi/);
  assert.ok(brief.evidence.includes("Yoklama 2/3"));
});

test("MARİF günlük plan çakışmasını yeni plan üretmeden incelemeye yönlendirir", () => {
  const conflictingCycle = cycle({
    currentStep: "plan",
    stages: [
      {
        id: "daily",
        label: "Günlük",
        title: "Günlük plan çakışması",
        detail: "2 plan aynı tarihe bağlı",
        actionLabel: "Planları incele",
        tone: "attention",
      },
      ...cycle().stages.slice(1),
    ],
  });
  const brief = createMarifTeacherAgentBrief({
    educationalWritesDisabled: false,
    setup: setup(),
    control: control(),
    cycle: conflictingCycle,
    dayClosure: dayClosure(),
  });

  assert.deepEqual(brief.action, { kind: "teacher-cycle", stageId: "daily" });
  assert.equal(brief.title, "Günlük plan çakışması");
  assert.equal(brief.actionLabel, "Planları incele");
});

test("MARİF kanıt zinciri tamamlandığında belge kaynağına yönlendirir ve otomatik yazma vaat etmez", () => {
  const brief = createMarifTeacherAgentBrief({
    educationalWritesDisabled: false,
    setup: setup(),
    control: control(),
    cycle: cycle(),
    dayClosure: dayClosure(),
  });

  assert.deepEqual(brief.action, { kind: "teacher-cycle", stageId: "documents" });
  assert.equal(brief.tone, "ready");
  assert.equal(brief.title, "2 belge kaynağı hazır");
});
