import assert from "node:assert/strict";
import test from "node:test";

import {
  monthlyReviewFormBlockers,
  teacherDocumentSelectionReady,
  weeklyReviewFormBlockers,
} from "../../src/features/planning/teacher-workbench-readiness.ts";

test("haftalık değerlendirme düğmesinin tüm görünür engelleri aynı sözleşmeden gelir", () => {
  assert.deepEqual(
    weeklyReviewFormBlockers({
      domainEligible: false,
      selectedObservationCount: 0,
      evidenceSummary: " ",
      reflection: "ab",
    }),
    [
      "Haftanın gün kapanışı ve kanıt koşullarını tamamlayın.",
      "En az bir öğretmen onaylı gözlem seçin.",
      "Kanıt özetini en az 3 karakterle tamamlayın.",
      "Öğretmen değerlendirmesini en az 3 karakterle tamamlayın.",
    ],
  );
  assert.deepEqual(
    weeklyReviewFormBlockers({
      domainEligible: true,
      selectedObservationCount: 1,
      evidenceSummary: "Kanıt hazır",
      reflection: "Yansıtma hazır",
    }),
    [],
  );
});

test("aylık üç adımın eksikleri doğru adıma bağlanır", () => {
  assert.deepEqual(
    monthlyReviewFormBlockers({
      childNarrative: "",
      programNarrative: "",
      teacherNarrative: "",
      nextMonthRecommendation: "",
      evidenceState: "sufficient-evidence",
      selectedEvidenceIsSufficient: false,
    }).map((blocker) => blocker.step),
    ["children", "children", "program", "teacher", "teacher"],
  );
  assert.deepEqual(
    monthlyReviewFormBlockers({
      childNarrative: "Çocuklar yönü hazır",
      programNarrative: "Program yönü hazır",
      teacherNarrative: "Öğretmen yönü hazır",
      nextMonthRecommendation: "Sonraki ay hazır",
      evidenceState: "insufficient-evidence",
      selectedEvidenceIsSufficient: false,
    }),
    [],
  );
});

test("çıktı kapsamı yalnız gerçek bir kayıt seçildiğinde hazır sayılır", () => {
  const base = {
    dailyPlanId: "",
    weeklyPlanId: "week-1",
    monthlyPlanId: "month-1",
    dailyPlanIds: [],
    weeklyPlanIds: ["week-1"],
    monthlyPlanIds: ["month-1"],
  };
  assert.equal(teacherDocumentSelectionReady({ ...base, scopeKind: "daily" }), false);
  assert.equal(teacherDocumentSelectionReady({ ...base, scopeKind: "weekly" }), true);
  assert.equal(teacherDocumentSelectionReady({ ...base, scopeKind: "monthly" }), true);
  assert.equal(teacherDocumentSelectionReady({ ...base, scopeKind: "combined" }), true);
});
