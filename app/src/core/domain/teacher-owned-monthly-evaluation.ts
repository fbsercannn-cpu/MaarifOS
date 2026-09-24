export const TEACHER_MONTHLY_PROGRAM_CRITERIA = [
  ["individual-participation", "Bireysel etkinliklere katılım"],
  ["group-participation", "Grup etkinliklerine katılım"],
  ["learning-enjoyment", "Eğlenerek öğrenme"],
  ["age-development-fit", "Yaş ve gelişim düzeyine uygunluk"],
  ["needs-fit", "Çocukların ihtiyaçlarına uygunluk"],
  ["skill-support", "Program becerilerini destekleme"],
  ["duration-fit", "Sürelerin yeterliliği"],
  ["assessment-tool-fit", "Değerlendirme araçlarının uygunluğu"],
  ["planned-applied-consistency", "Planlanan ve uygulanan etkinlik tutarlılığı"],
  ["activity-diversity", "Etkinlik çeşitliliği"],
  ["materials-fit", "Araç, gereç ve materyal uygunluğu"],
] as const;

export const TEACHER_MONTHLY_TEACHER_CRITERIA = [
  ["monthly-daily-planning", "Aylık planla günlük planları ilişkilendirme"],
  ["program-components", "Program bileşenlerini birlikte gözetme"],
  ["activity-diversity", "Farklı etkinlikler hazırlama veya seçme"],
  ["learning-environment", "Öğrenme ortamını uygun düzenleme"],
  ["assessment-practice", "Farklı değerlendirme araçları kullanma"],
  ["differentiation", "Farklılık ve özel gereksinimlere göre uyarlama"],
  ["daily-life-relevance", "Günlük yaşamla ilişkilendirme"],
  ["active-participation", "Aktif katılım ve seçimi destekleme"],
  ["materials-use", "Uygun materyal kullanma"],
  ["time-management", "Zamanı etkili ve esnek yönetme"],
  ["communication-adaptation", "İletişim ve yaklaşımı uyarlama"],
  ["equal-opportunity", "Fırsat eşitliği sunma"],
] as const;

export type TeacherMonthlyCriterionStatus =
  | "observed-working"
  | "needs-adjustment"
  | "not-observed";

export interface TeacherMonthlyCriterionResponse {
  readonly criterionId: string;
  readonly status: TeacherMonthlyCriterionStatus;
}

export interface TeacherMonthlyEvidenceCoverage {
  readonly observationCount: number;
  readonly curriculumLinkCount: number;
  readonly distinctCivilDateCount: number;
  readonly distinctWeekCount: number;
  readonly activeStudentIds: readonly string[];
  readonly coveredActiveStudentIds: readonly string[];
  readonly uncoveredActiveStudentIds: readonly string[];
}

export interface TeacherMonthlyEvaluation {
  readonly id: string;
  readonly monthlyPlanId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly children: {
    readonly evidenceState: "sufficient-evidence" | "insufficient-evidence";
    readonly narrative: string;
    readonly observationIds: readonly string[];
    readonly curriculumLinkIds: readonly string[];
    readonly coverage: TeacherMonthlyEvidenceCoverage;
  };
  readonly program: {
    readonly narrative: string;
    readonly criteria: readonly TeacherMonthlyCriterionResponse[];
  };
  readonly teacher: {
    readonly narrative: string;
    readonly criteria: readonly TeacherMonthlyCriterionResponse[];
  };
  readonly nextMonthRecommendation: string;
  readonly sourcePlanRevisionNumber: number;
  /** Yeni kayıtlar önerinin hedef ayını ve öneri anındaki sürümünü taşır. */
  readonly nextMonthTargetPlanId?: string | null;
  readonly targetPlanRevisionNumberAtSuggestion?: number | null;
  readonly teacherAuthored: true;
  readonly createdAt: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_ISO_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set<TeacherMonthlyCriterionStatus>([
  "observed-working",
  "needs-adjustment",
  "not-observed",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

function requiredText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueUuids(value: unknown): value is readonly string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string" && UUID_PATTERN.test(item)) &&
    new Set(value).size === value.length;
}

function isCriterionList(
  value: unknown,
  expected: readonly (readonly [string, string])[],
): value is readonly TeacherMonthlyCriterionResponse[] {
  if (!Array.isArray(value) || value.length !== expected.length) return false;
  return value.every((candidate, index) => {
    if (!isRecord(candidate) || !exactKeys(candidate, ["criterionId", "status"])) return false;
    return candidate.criterionId === expected[index]?.[0] &&
      typeof candidate.status === "string" &&
      STATUSES.has(candidate.status as TeacherMonthlyCriterionStatus);
  });
}

function isCoverage(value: unknown): value is TeacherMonthlyEvidenceCoverage {
  if (!isRecord(value) || !exactKeys(value, [
    "observationCount",
    "curriculumLinkCount",
    "distinctCivilDateCount",
    "distinctWeekCount",
    "activeStudentIds",
    "coveredActiveStudentIds",
    "uncoveredActiveStudentIds",
  ])) return false;
  return [
    value.observationCount,
    value.curriculumLinkCount,
    value.distinctCivilDateCount,
    value.distinctWeekCount,
  ].every((item) => Number.isInteger(item) && Number(item) >= 0) &&
    uniqueUuids(value.activeStudentIds) &&
    uniqueUuids(value.coveredActiveStudentIds) &&
    uniqueUuids(value.uncoveredActiveStudentIds);
}

export function isTeacherMonthlyEvaluation(
  value: unknown,
): value is TeacherMonthlyEvaluation {
  if (!isRecord(value)) return false;
  const legacyKeys = [
    "id",
    "monthlyPlanId",
    "periodStart",
    "periodEnd",
    "children",
    "program",
    "teacher",
    "nextMonthRecommendation",
    "sourcePlanRevisionNumber",
    "teacherAuthored",
    "createdAt",
  ];
  const hasLegacyKeys = exactKeys(value, legacyKeys);
  const hasTargetKeys = exactKeys(value, [
    ...legacyKeys,
    "nextMonthTargetPlanId",
    "targetPlanRevisionNumberAtSuggestion",
  ]);
  if (!hasLegacyKeys && !hasTargetKeys) return false;
  if (!isRecord(value.children) || !exactKeys(value.children, [
    "evidenceState",
    "narrative",
    "observationIds",
    "curriculumLinkIds",
    "coverage",
  ])) return false;
  if (!isRecord(value.program) || !isRecord(value.teacher)) return false;
  if (!exactKeys(value.program, ["narrative", "criteria"]) ||
      !exactKeys(value.teacher, ["narrative", "criteria"])) return false;
  return UUID_PATTERN.test(typeof value.id === "string" ? value.id : "") &&
    UUID_PATTERN.test(typeof value.monthlyPlanId === "string" ? value.monthlyPlanId : "") &&
    typeof value.periodStart === "string" && CIVIL_DATE_PATTERN.test(value.periodStart) &&
    typeof value.periodEnd === "string" && CIVIL_DATE_PATTERN.test(value.periodEnd) &&
    value.periodStart <= value.periodEnd &&
    (value.children.evidenceState === "sufficient-evidence" ||
      value.children.evidenceState === "insufficient-evidence") &&
    requiredText(value.children.narrative) &&
    uniqueUuids(value.children.observationIds) &&
    uniqueUuids(value.children.curriculumLinkIds) &&
    isCoverage(value.children.coverage) &&
    requiredText(value.program.narrative) &&
    isCriterionList(value.program.criteria, TEACHER_MONTHLY_PROGRAM_CRITERIA) &&
    requiredText(value.teacher.narrative) &&
    isCriterionList(value.teacher.criteria, TEACHER_MONTHLY_TEACHER_CRITERIA) &&
    requiredText(value.nextMonthRecommendation) &&
    Number.isInteger(value.sourcePlanRevisionNumber) &&
    Number(value.sourcePlanRevisionNumber) >= 1 &&
    (!hasTargetKeys ||
      ((value.nextMonthTargetPlanId === null &&
        value.targetPlanRevisionNumberAtSuggestion === null) ||
        (typeof value.nextMonthTargetPlanId === "string" &&
          UUID_PATTERN.test(value.nextMonthTargetPlanId) &&
          Number.isInteger(value.targetPlanRevisionNumberAtSuggestion) &&
          Number(value.targetPlanRevisionNumberAtSuggestion) >= 1))) &&
    value.teacherAuthored === true &&
    typeof value.createdAt === "string" &&
    UTC_ISO_PATTERN.test(value.createdAt) &&
    !Number.isNaN(Date.parse(value.createdAt));
}

export function teacherMonthlyEvidenceMeetsMinimum(
  coverage: TeacherMonthlyEvidenceCoverage,
): boolean {
  return coverage.observationCount >= 2 &&
    coverage.distinctCivilDateCount >= 2 &&
    coverage.distinctWeekCount >= 2 &&
    coverage.uncoveredActiveStudentIds.length === 0;
}
