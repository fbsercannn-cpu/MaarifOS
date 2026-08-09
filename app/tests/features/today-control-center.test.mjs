import assert from "node:assert/strict";
import test from "node:test";

import { createTodayControlCenterSummary } from "../../src/features/today/today-screen-model.ts";

const configuredClassroom = {
  status: "configured",
  academicYearId: "year-1",
  academicYearName: "2026-2027 Eğitim Yılı",
  academicYearStart: "2026-09-01",
  academicYearEnd: "2027-06-30",
  operationalStatus: "active",
  classroomId: "classroom-1",
  classroomName: "Kurgu Güneş Sınıfı",
  schedule: {
    kind: "morning",
    startTime: "08:30",
    endTime: "12:30",
    timeZone: "Europe/Istanbul",
  },
  scheduleLabel: "Sabah · 08:30–12:30",
};

function workspace(overrides = {}) {
  return {
    civilDate: "2026-09-15",
    classroom: configuredClassroom,
    currentActivity: null,
    planItems: [],
    pendingEvidenceLinks: 0,
    linkedLearningGoalCount: 0,
    datedEvidenceCount: 0,
    ...overrides,
  };
}

test("öğretmen kontrolü mevcut, beklenen, yok ve işaretlenmeyen devam durumunu ayırır", () => {
  const summary = createTodayControlCenterSummary({
    workspace: workspace(),
    attendance: {
      present: 6,
      late: 1,
      absent: 2,
      marked: 9,
      total: 10,
    },
    pendingObservationCount: 3,
  });

  assert.deepEqual(summary.attendance, {
    inClass: 7,
    expected: 10,
    absent: 2,
    late: 1,
    unmarked: 1,
    stateLabel: "Yoklama eksik",
    detailLabel: "2 yok · 1 geç · 1 işaretlenmedi",
  });
  assert.equal(summary.priority.count, 3);
  assert.equal(summary.priority.title, "3 gözlem program bağlantısı bekliyor");
  assert.match(summary.priority.detail, /belge zinciri/);
});

test("öğretmen kontrolü sıradaki gerçek plan kaydını ve açıklanabilir zamanını gösterir", () => {
  const plannedItem = {
    id: "activity-1",
    title: "Bahçedeki gölgeleri araştırıyoruz",
    kind: "activity",
    startTime: "09:30",
    endTime: "10:00",
    status: "planned",
    evidenceCount: 0,
    activityId: "activity-1",
    canCaptureEvidence: true,
  };
  const summary = createTodayControlCenterSummary({
    workspace: workspace({ planItems: [plannedItem] }),
    attendance: {
      present: 7,
      late: 1,
      absent: 2,
      marked: 10,
      total: 10,
    },
    pendingObservationCount: 0,
  });

  assert.equal(summary.plan.item, plannedItem);
  assert.equal(summary.plan.label, "Sıradaki etkinlik");
  assert.equal(summary.plan.title, plannedItem.title);
  assert.equal(summary.plan.detail, "09:30–10:00 · Sıradaki");
  assert.equal(summary.attendance.stateLabel, "Yoklama tamam");
  assert.equal(summary.priority.title, "Program bağlantıları tamam");
});

test("plan yoksa yeni alan uydurmak yerine mevcut sınıf bağlamından doğru sonraki işi üretir", () => {
  const configured = createTodayControlCenterSummary({
    workspace: workspace(),
    attendance: { present: 0, late: 0, absent: 0, marked: 0, total: 0 },
    pendingObservationCount: 0,
  });
  const notConfigured = createTodayControlCenterSummary({
    workspace: workspace({ classroom: { status: "not_configured" } }),
    attendance: { present: 0, late: 0, absent: 0, marked: 0, total: 0 },
    pendingObservationCount: 0,
  });

  assert.equal(configured.plan.title, "Bugün için plan yok");
  assert.equal(configured.plan.detail, "Günlük plan oluştur");
  assert.equal(notConfigured.plan.title, "Sınıf kurulumu gerekli");
  assert.equal(notConfigured.plan.detail, "Sınıf ve program bilgilerini tamamla");
});
