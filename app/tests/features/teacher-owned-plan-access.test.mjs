import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  destinationForPlanDocument,
  destinationForPlanLevel,
} from "../../src/features/planning/teacher-plan-destination.ts";
import {
  buildStandaloneTeacherOwnedPlanParagraphs,
  prepareTeacherOwnedPlanExportDocument,
} from "../../src/features/planning/teacher-owned-plan-document.ts";

function workspace({ annual = true, monthly = true, weekly = true } = {}) {
  const period = {
    id: "plan-id",
    title: "Öğretmen planı",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    relation: "current",
  };
  return {
    status: "ready",
    civilDate: "2026-09-08",
    annual: annual ? period : null,
    monthly: monthly
      ? { ...period, weeklyPlanCount: 1, dailyPlanCount: 1, observationCount: 0, linkedObservationCount: 0, evaluationCount: 0 }
      : null,
    weekly: weekly
      ? { ...period, dailyPlanCount: 1, observationCount: 0, linkedObservationCount: 0, evaluationCount: 0 }
      : null,
    daily: { planId: "daily-id", title: "Günlük plan", activityCount: 1, completedActivityCount: 0, observationCount: 0 },
    documents: { anecdoteIncompleteCount: 0, anecdoteReviewRequiredCount: 0, anecdoteReadyCount: 0, monthlyEvaluationCount: 0, planDocumentReady: annual && monthly },
    pendingCurriculumLinkCount: 0,
  };
}

test("kayıtlı öğretmen planı entitlement kararı olmadan kendi çalışma alanına gider", () => {
  const existing = workspace();
  for (const level of ["annual", "monthly", "weekly"]) {
    assert.equal(destinationForPlanLevel(level, existing), "teacher-records");
  }
  assert.equal(destinationForPlanDocument("plans", existing), "teacher-records");
  assert.equal(destinationForPlanDocument("monthly", existing), "teacher-records");
  assert.equal(destinationForPlanLevel("daily", existing), "daily-workspace");
});

test("yerel üst plan kaydı yokken premium kapısı yerine öğretmenin oluşturma alanı açılır", () => {
  assert.equal(destinationForPlanLevel("annual", workspace({ annual: false })), "teacher-records");
  assert.equal(destinationForPlanLevel("monthly", workspace({ monthly: false })), "teacher-records");
  assert.equal(destinationForPlanLevel("weekly", workspace({ weekly: false })), "teacher-records");
  assert.equal(destinationForPlanDocument("plans", workspace({ monthly: false })), "teacher-records");
  assert.equal(destinationForPlanDocument("monthly", workspace({ monthly: false })), "teacher-records");
});

test("aynı güne ait plan çakışması yeni plan üretmek yerine güvenli incelemeye gider", () => {
  const conflicted = workspace();
  conflicted.daily = {
    ...conflicted.daily,
    status: "conflict",
    planId: null,
    conflictPlanIds: ["daily-a", "daily-b"],
  };
  assert.equal(
    destinationForPlanLevel("daily", conflicted),
    "daily-conflict-review",
  );
});

test("temel belge üretimi entitlement nesnesi olmadan kalıcı öğretmen başlıklarını taşır", () => {
  const identity = {
    id: "pack-1",
    version: "3",
    contentReleaseId: "release-1",
    manifestDigest: `sha256:${"a".repeat(64)}`,
    sku: "TYMM-6072",
    academicRelease: "2026-2027",
    valuesMappingStatus: "mapped-v1",
  };
  const document = prepareTeacherOwnedPlanExportDocument(
    identity,
    {
      contentPackSnapshot: identity,
      valuesMappingStatus: "mapped-v1",
      annualPlan: {
        recordId: "annual-record",
        teacherTitle: "Emine Öğretmenin Yıllık Omurgası",
        periodStart: "2026-09-01",
        periodEnd: "2027-06-30",
        annualMonths: [],
      },
      monthlyPlan: {
        recordId: "monthly-record",
        teacherTitle: "Emine Öğretmenin Eylül Planı",
        sourceSnapshot: { monthKey: "2026-09", title: "Sağlayıcı başlığı" },
        fullDayFlow: [],
        evaluations: [],
      },
      weeks: [],
      lensPreference: {
        teacherPreferredLensId: "balanced",
        teacherPreferredSupportingLensIds: [],
        lensSelectionMode: "preference_only",
      },
    },
    "word",
  );
  assert.equal(document.annualPlanTitle, "Emine Öğretmenin Yıllık Omurgası");
  assert.equal(document.title, "Emine Öğretmenin Eylül Planı");
  assert.match(document.fileName, /Ogretmen_Plan_Zinciri_2026-09\.docx$/);
  assert.match(document.teacherReviewNotice, /entitlement gerektirmez/);
});

test("öğretmenin sıfırdan yazdığı plan grafiği sağlayıcı paketi olmadan belge metnine dönüşür", () => {
  const base = {
    planOrigin: "teacher-authored",
    status: "active",
    academicYearId: "00000000-0000-4000-8000-000000000a01",
    classroomId: "00000000-0000-4000-8000-000000000a02",
    createdAt: "2026-09-02T06:00:00.000Z",
    updatedAt: "2026-09-02T06:00:00.000Z",
    deletedAt: null,
    schemaVersion: 1,
    revisionNumber: 1,
    revisionHistory: [],
  };
  const annualId = "00000000-0000-4000-8000-000000000a03";
  const monthlyId = "00000000-0000-4000-8000-000000000a04";
  const weeklyId = "00000000-0000-4000-8000-000000000a05";
  const paragraphs = buildStandaloneTeacherOwnedPlanParagraphs({
    annual: {
      ...base,
      id: annualId,
      planType: "annual",
      title: "Kurgu Öğretmen Yıllık Planı",
      civilDate: "2026-09-07",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
      teacherContent: { narrative: "Her çocuğun katılımını güçlendirmek" },
      monthlySectionIds: [monthlyId],
    },
    months: [
      {
        monthly: {
          ...base,
          id: monthlyId,
          planType: "monthly",
          annualPlanId: annualId,
          title: "Eylül Öğretmen Planı",
          monthKey: "2026-09",
          civilDate: "2026-09-07",
          periodStart: "2026-09-07",
          periodEnd: "2026-09-30",
          teacherContent: { narrative: "Uyum ve aidiyet" },
          weeklySectionIds: [weeklyId],
        },
        weeks: [
          {
            ...base,
            id: weeklyId,
            planType: "weekly",
            annualPlanId: annualId,
            monthlyPlanId: monthlyId,
            title: "7–11 Eylül Haftası",
            weekKey: "2026-09-07_2026-09-11",
            civilDate: "2026-09-07",
            periodStart: "2026-09-07",
            periodEnd: "2026-09-11",
            teacherContent: { narrative: "Karşılama, oyun ve gözlem" },
          },
        ],
      },
    ],
  });
  const text = paragraphs.map((paragraph) => paragraph.text).join("\n");
  assert.match(text, /Kurgu Öğretmen Yıllık Planı/);
  assert.match(text, /Uyum ve aidiyet/);
  assert.match(text, /Karşılama, oyun ve gözlem/);
  assert.match(text, new RegExp(annualId));
  assert.doesNotMatch(text, /contentPack|entitlement|premiumAnnualPlan/);
});

test("temel öğretmen planı export'u premium entitlement istemez; sağlayıcı kütüphanesi ayrı kalır", async () => {
  const [documentSource, screenSource, prototypeSource, serviceSource] = await Promise.all([
    readFile(new URL("../../src/features/planning/teacher-owned-plan-document.ts", import.meta.url), "utf8"),
    readFile(new URL("../../src/features/planning/TeacherOwnedPlanScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/Prototype.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/features/planning/teacher-owned-plan-service.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(documentSource, /VerifiedPremiumAccess|assertPremiumPackActionAccess|canPerformPremiumPackAction/);
  assert.match(documentSource, /generateTeacherOwnedPlanExportFile/);
  assert.match(documentSource, /generateStandaloneTeacherOwnedPlanExportFile/);
  assert.match(screenSource, /Plan emeğiniz premium kilidinden bağımsızdır/);
  assert.match(screenSource, /onOpenProviderLibrary/);
  assert.match(screenSource, /Yıl → ay → hafta planını oluştur/);
  assert.match(screenSource, /starter\.nextWeekTitle/);
  assert.match(screenSource, /starter\.nextMonthTitle/);
  assert.match(screenSource, /buildTeacherFullYearMonthDrafts/);
  assert.match(screenSource, /Eylül–Haziran yıllık plan omurgası/);
  assert.match(screenSource, /onAppendPlanMonths/);
  assert.match(screenSource, /onReviewMonthlyCarry/);
  assert.match(screenSource, /teacher-monthly-carry-review/);
  assert.match(screenSource, /educationalWritesDisabled/);
  assert.match(screenSource, /Plan omurgası hazırlanabilir/);
  assert.match(screenSource, /teacher-owned-evaluation-write-notice/);
  assert.match(screenSource, /teacher-owned-plan-week-coverage/);
  assert.match(screenSource, /MEB 2026–2027 çalışma takvimi ve sınıf bitiş saati/);
  assert.match(screenSource, /weeklyReviewRef\.current\?\.scrollIntoView/);
  assert.match(screenSource, /monthlyReviewRef\.current\?\.scrollIntoView/);
  assert.match(screenSource, /weeklyReviewRef\.current\?\.focus/);
  assert.match(screenSource, /monthlyReviewRef\.current\?\.focus/);
  assert.match(screenSource, /weeklyReviewReturnFocusRef/);
  assert.match(screenSource, /monthlyReviewReturnFocusRef/);
  assert.match(screenSource, /haftasını kanıtlarla değerlendir/);
  assert.match(screenSource, /ayını üç yönden değerlendir/);
  assert.match(screenSource, /monthlyReviewStep/);
  assert.match(screenSource, /expandedMonthId/);
  assert.match(screenSource, /teacher-owned-plan-month-toggle/);
  assert.match(screenSource, /aria-expanded=\{expanded\}/);
  assert.match(screenSource, /teacher-owned-plan-month-panel/);
  assert.match(screenSource, /Aylık değerlendirme adımları/);
  assert.match(screenSource, /Kanıt ve çocuklar/);
  assert.match(screenSource, /Program/);
  assert.match(screenSource, /Öğretmen ve sonraki ay/);
  assert.match(screenSource, /data-step="children"/);
  assert.match(screenSource, /data-step="program"/);
  assert.match(screenSource, /data-step="teacher"/);
  assert.doesNotMatch(screenSource, /MARİF karar döngüsü/);
  assert.match(serviceSource, /reviewTeacherMonthlyCarry/);
  assert.match(screenSource, /Önceki haftanın kanıtı incelendikten sonra/);
  assert.match(screenSource, /Revizyonu kaydet/);
  assert.match(prototypeSource, /createTeacherOwnedPlanGraph/);
  assert.match(prototypeSource, /appendTeacherOwnedPlanMonths/);
  assert.match(prototypeSource, /reviseTeacherOwnedPlan/);
  assert.match(prototypeSource, /reviewTeacherWeeklyCarry/);
  assert.match(
    prototypeSource,
    /allowPreparationForCivilDate: planToRevise\.periodStart/,
  );
  assert.match(screenSource, /Öneriyi incele ve karar ver/);
  assert.match(screenSource, /Düzenleyip kabul et/);
  assert.match(screenSource, /Gerekçeyle reddet/);
  assert.match(screenSource, /Kararı yeniden aç ve geri al/);
  assert.match(
    prototypeSource,
    /stage === "weekly" \|\| stage === "monthly"[\s\S]{0,120}openTeacherPlanRecords\(stage\)/,
  );
  assert.doesNotMatch(
    prototypeSource,
    /stage === "weekly" \|\| stage === "monthly"[\s\S]{0,120}openPremiumPlans\(stage\)/,
  );
  const conflictGuardIndex = prototypeSource.indexOf('destination === "daily-conflict-review"');
  const createIndex = prototypeSource.indexOf("openPlanFlow();", conflictGuardIndex);
  assert.ok(conflictGuardIndex >= 0, "günlük plan çakışma kapısı bulunmalı");
  assert.ok(createIndex > conflictGuardIndex, "yeni plan yolu çakışma kapısından sonra kalmalı");
  assert.match(prototypeSource.slice(conflictGuardIndex, createIndex), /openAcademicCalendar/);
});
