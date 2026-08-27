import type { TeacherOwnedPlanDocumentScope } from "./teacher-owned-plan-document.ts";

export interface WeeklyReviewFormReadinessInput {
  domainEligible: boolean;
  selectedObservationCount: number;
  evidenceSummary: string;
  reflection: string;
}

export function weeklyReviewFormBlockers(
  input: WeeklyReviewFormReadinessInput,
): readonly string[] {
  const blockers: string[] = [];
  if (!input.domainEligible) {
    blockers.push("Haftanın gün kapanışı ve kanıt koşullarını tamamlayın.");
  }
  if (input.selectedObservationCount === 0) {
    blockers.push("En az bir öğretmen onaylı gözlem seçin.");
  }
  if (input.evidenceSummary.trim().length < 3) {
    blockers.push("Kanıt özetini en az 3 karakterle tamamlayın.");
  }
  if (input.reflection.trim().length < 3) {
    blockers.push("Öğretmen değerlendirmesini en az 3 karakterle tamamlayın.");
  }
  return blockers;
}

export interface MonthlyReviewFormReadinessInput {
  childNarrative: string;
  programNarrative: string;
  teacherNarrative: string;
  nextMonthRecommendation: string;
  evidenceState: "sufficient-evidence" | "insufficient-evidence";
  selectedEvidenceIsSufficient: boolean;
}

export type MonthlyReviewStep = "children" | "program" | "teacher";

export interface MonthlyReviewFormBlocker {
  step: MonthlyReviewStep;
  detail: string;
}

export function monthlyReviewFormBlockers(
  input: MonthlyReviewFormReadinessInput,
): readonly MonthlyReviewFormBlocker[] {
  const blockers: MonthlyReviewFormBlocker[] = [];
  if (
    input.evidenceState === "sufficient-evidence" &&
    !input.selectedEvidenceIsSufficient
  ) {
    blockers.push({
      step: "children",
      detail: "Kanıt yeterli hükmü için 2 gözlem, 2 gün, 2 hafta ve tüm aktif çocukların temsilini tamamlayın.",
    });
  }
  if (input.childNarrative.trim().length < 3) {
    blockers.push({
      step: "children",
      detail: "Çocuklar yönü değerlendirmesini en az 3 karakterle tamamlayın.",
    });
  }
  if (input.programNarrative.trim().length < 3) {
    blockers.push({
      step: "program",
      detail: "Program yönü açıklamasını en az 3 karakterle tamamlayın.",
    });
  }
  if (input.teacherNarrative.trim().length < 3) {
    blockers.push({
      step: "teacher",
      detail: "Öğretmen yansıtmasını en az 3 karakterle tamamlayın.",
    });
  }
  if (input.nextMonthRecommendation.trim().length < 3) {
    blockers.push({
      step: "teacher",
      detail: "Sonraki ay önerisini en az 3 karakterle tamamlayın.",
    });
  }
  return blockers;
}

export interface TeacherDocumentSelectionInput {
  scopeKind: TeacherOwnedPlanDocumentScope["kind"];
  dailyPlanId: string;
  weeklyPlanId: string;
  monthlyPlanId: string;
  dailyPlanIds: readonly string[];
  weeklyPlanIds: readonly string[];
  monthlyPlanIds: readonly string[];
}

export function teacherDocumentSelectionReady(
  input: TeacherDocumentSelectionInput,
): boolean {
  if (input.scopeKind === "combined") return true;
  if (input.scopeKind === "daily") {
    return input.dailyPlanIds.includes(input.dailyPlanId);
  }
  if (input.scopeKind === "weekly") {
    return input.weeklyPlanIds.includes(input.weeklyPlanId);
  }
  return input.monthlyPlanIds.includes(input.monthlyPlanId);
}
