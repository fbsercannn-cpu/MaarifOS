import { isCivilDate } from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import { createEmptySnapshot, type StoredRecord } from "../../core/domain/model.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";
import {
  curriculumTargetsForProfile,
  type CurriculumTargetSnapshot,
} from "../curriculum/curriculum-catalog.ts";
import type { CurriculumProfileSnapshot } from "../evidence/evidence-flow.ts";
import { parseTeacherWeeklyValuesNarrative } from "../values/value-plan-models.ts";
import type {
  PremiumContentPack,
  PremiumDailyTemplateSelection,
  PremiumLensSelectionMode,
  PremiumPlanBoardResult,
  PremiumPlanLensId,
} from "./domain.ts";
import {
  parsePremiumLensPreferenceRecord,
  premiumContentPackSnapshot,
  premiumDailyTemplateSelection,
  samePremiumLensPreference,
} from "./domain.ts";
import { assertPremiumContentPackValuesIntegrity } from "./content-repository.ts";

const ANNUAL_PERIOD_START = "2026-09-07";
const ANNUAL_PERIOD_END = "2027-06-25";

export interface PremiumInstalledPlanSummary {
  annualPlanId: string;
  monthlyPlanId: string;
  weeklyPlanIds: readonly { weekId: string; planId: string }[];
  title: string;
  contentVersion: string;
  teacherPreferredLensId: PremiumPlanLensId;
  teacherPreferredSupportingLensIds: readonly PremiumPlanLensId[];
  lensSelectionMode: PremiumLensSelectionMode;
  activityCount: number;
  installedAt: string;
}

export interface PremiumLegacyInstalledPlanSummary {
  annualPlanId: string;
  title: string;
  contentPackId: string;
  contentVersion: string;
  installedAt: string;
  valuesMappingStatus: "legacy-unmapped";
  readOnly: true;
}

export type PremiumNextPlanDecision =
  | "keep"
  | "adapt"
  | "replace"
  | "observe-more";

export interface PremiumWeeklyEvaluation {
  id: string;
  reflection: string;
  evidenceSummary: string;
  observationIds: readonly string[];
  nextPlanDecision: PremiumNextPlanDecision;
  nextPlanTargetPlanId: string | null;
  teacherAuthored: true;
  createdAt: string;
}

export interface PremiumWeeklyReviewObservation {
  id: string;
  civilDate: string;
  observedAt: string;
  rawText: string;
  activityTitle: string;
  studentId: string | null;
  studentName: string | null;
  activityId: string | null;
  valueEvidenceEligible: boolean;
}

export interface PremiumWeeklyReviewContext {
  weeklyPlanId: string;
  weekId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  observations: readonly PremiumWeeklyReviewObservation[];
  evaluations: readonly PremiumWeeklyEvaluation[];
}

export interface PremiumWeeklyCarryForwardContext {
  targetWeeklyPlanId: string;
  sourceWeeklyPlanId: string;
  sourceWeekTitle: string;
  sourcePeriodStart: string;
  sourcePeriodEnd: string;
  evaluationId: string;
  decision: PremiumNextPlanDecision;
  evidenceSummary: string;
  teacherReflection: string;
  createdAt: string;
  applicationStatus: "pending-teacher-review";
}

export const PREMIUM_MONTHLY_PROGRAM_CRITERIA = [
  {
    id: "individual-participation",
    label: "Çocuklar bireysel etkinliklere aktif katılım gösterdi.",
  },
  {
    id: "group-participation",
    label: "Çocuklar grup etkinliklerine aktif katılım gösterdi.",
  },
  {
    id: "learning-enjoyment",
    label: "Çocuklar eğlenerek öğrendi.",
  },
  {
    id: "age-development-fit",
    label: "Etkinlikler çocukların yaş ve gelişim düzeylerine uygundu.",
  },
  {
    id: "needs-fit",
    label: "Etkinlikler çocukların ihtiyaçlarına yönelikti.",
  },
  {
    id: "skill-support",
    label: "Etkinlikler programdaki becerileri desteklemek için yeterliydi.",
  },
  {
    id: "duration-fit",
    label: "Etkinlikler için belirlenen süre yeterliydi.",
  },
  {
    id: "assessment-tool-fit",
    label: "Kullanılan ölçme araçları beceri edinim sürecini gözlemlemeye uygundu.",
  },
  {
    id: "planned-applied-consistency",
    label: "Tasarlanan etkinlik ile uygulanan etkinlik tutarlıydı.",
  },
  {
    id: "activity-diversity",
    label: "Programdaki beceriler için çeşitli etkinlikler hazırlandı.",
  },
  {
    id: "materials-fit",
    label: "Kullanılan araç, gereç ve materyaller uygundu.",
  },
] as const;

export const PREMIUM_MONTHLY_TEACHER_CRITERIA = [
  {
    id: "monthly-daily-planning",
    label: "Aylık planı gözeterek günlük planları hazırlama veya seçme",
  },
  {
    id: "program-components",
    label: "Alan, sosyal-duygusal, kavramsal ve okuryazarlık becerileri ile değer ve eğilimleri gözetme",
  },
  {
    id: "activity-diversity",
    label: "Öğrenme çıktıları için farklı etkinlikler hazırlama veya seçme",
  },
  {
    id: "learning-environment",
    label: "Öğrenme ortamını etkinliklere uygun düzenleme",
  },
  {
    id: "assessment-practice",
    label: "Öğrenme çıktılarını uygun ve farklı araçlarla değerlendirme",
  },
  {
    id: "differentiation",
    label: "Farklılıkları ve özel gereksinimleri gözeterek süreci farklılaştırma",
  },
  {
    id: "daily-life-relevance",
    label: "Etkinlikleri çocukların günlük yaşamıyla ilişkilendirme",
  },
  {
    id: "active-participation",
    label: "Çocukların aktif katılımını ve seçimlerini destekleme",
  },
  {
    id: "materials-use",
    label: "Uygun araç, gereç ve materyalleri kullanma",
  },
  {
    id: "time-management",
    label: "Zamanı etkili ve esnek yönetme",
  },
  {
    id: "communication-adaptation",
    label: "İletişimi ve yaklaşımı çocukların ve ortamın değişen ihtiyaçlarına uyarlama",
  },
  {
    id: "equal-opportunity",
    label: "Çocuklara fırsat eşitliği sunma",
  },
] as const;

export const PREMIUM_MONTHLY_CRITERION_STATUSES = [
  "observed-working",
  "needs-adjustment",
  "not-observed",
] as const;

export type PremiumMonthlyProgramCriterionId =
  (typeof PREMIUM_MONTHLY_PROGRAM_CRITERIA)[number]["id"];
export type PremiumMonthlyTeacherCriterionId =
  (typeof PREMIUM_MONTHLY_TEACHER_CRITERIA)[number]["id"];
export type PremiumMonthlyCriterionStatus =
  (typeof PREMIUM_MONTHLY_CRITERION_STATUSES)[number];
export type PremiumMonthlyChildEvidenceState =
  | "sufficient-evidence"
  | "insufficient-evidence";

export interface PremiumMonthlyCriterionResponse<TCriterionId extends string> {
  criterionId: TCriterionId;
  status: PremiumMonthlyCriterionStatus;
}

export interface PremiumMonthlyEvidenceCoverage {
  observationCount: number;
  anecdotalObservationCount: number;
  programLinkedObservationCount: number;
  curriculumLinkCount: number;
  distinctCivilDateCount: number;
  distinctWeekCount: number;
  distinctStudentCount: number;
  distinctEnvironmentCount: number;
  activeStudentCount: number;
  coveredActiveStudentCount: number;
  activeStudentIds: readonly string[];
  coveredActiveStudentIds: readonly string[];
  uncoveredActiveStudentIds: readonly string[];
}

export interface PremiumMonthlyReviewCurriculumLink {
  id: string;
  observationId: string;
  referenceCode: string;
  referenceTitle: string;
  confirmedAt: string;
}

export interface PremiumMonthlyReviewObservation {
  id: string;
  civilDate: string;
  observedAt: string;
  rawText: string;
  observationType: string | null;
  anecdotal: boolean;
  dailyPlanId: string;
  weeklyPlanId: string;
  weekTitle: string;
  activityTitle: string;
  environment: string | null;
  studentIds: readonly string[];
  curriculumLinks: readonly PremiumMonthlyReviewCurriculumLink[];
}

export interface PremiumMonthlyEvaluationMebProvenance {
  authority: "T.C. Millî Eğitim Bakanlığı";
  programTitle: "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı";
  sourceVersion: "2024";
  evaluationPages: "136-139";
  annex: "Ek 18 - Aylık Plan Kontrol Çizelgesi";
  annexPage: 344;
}

export const PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE:
  Readonly<PremiumMonthlyEvaluationMebProvenance> = Object.freeze({
    authority: "T.C. Millî Eğitim Bakanlığı",
    programTitle: "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı",
    sourceVersion: "2024",
    evaluationPages: "136-139",
    annex: "Ek 18 - Aylık Plan Kontrol Çizelgesi",
    annexPage: 344,
  });

export interface PremiumMonthlyEvaluation {
  id: string;
  monthlyPlanId: string;
  periodStart: string;
  periodEnd: string;
  children: {
    evidenceState: PremiumMonthlyChildEvidenceState;
    narrative: string;
    observationIds: readonly string[];
    curriculumLinkIds: readonly string[];
    coverage: PremiumMonthlyEvidenceCoverage;
  };
  program: {
    narrative: string;
    criteria: readonly PremiumMonthlyCriterionResponse<PremiumMonthlyProgramCriterionId>[];
  };
  teacher: {
    narrative: string;
    criteria: readonly PremiumMonthlyCriterionResponse<PremiumMonthlyTeacherCriterionId>[];
  };
  nextMonthRecommendation: string;
  teacherAuthored: true;
  mebProvenance: PremiumMonthlyEvaluationMebProvenance;
  createdAt: string;
}

export interface PremiumMonthlyReviewContext {
  monthlyPlanId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  activeStudentIds: readonly string[];
  activeStudents: readonly { id: string; displayName: string | null }[];
  observations: readonly PremiumMonthlyReviewObservation[];
  availableCoverage: PremiumMonthlyEvidenceCoverage;
  evaluations: readonly PremiumMonthlyEvaluation[];
}

function recordObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredMonthlyText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} eksik veya geçersiz.`);
  }
  return value;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function requiredMonthlyUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} kimliği geçersiz.`);
  }
  return value;
}

function uniqueMonthlyUuidArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} kimlik dizisi geçersiz.`);
  }
  const ids = value.map((id) => requiredMonthlyUuid(id, label));
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} kimlikleri mükerrer olamaz.`);
  }
  return ids;
}

function optionalMonthlyNarrative(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} metni geçersiz.`);
  }
  return value.trim()
    ? parseTeacherWeeklyValuesNarrative(value, label)
    : "";
}

export function isPremiumMonthlyCriterionStatus(
  value: unknown,
): value is PremiumMonthlyCriterionStatus {
  return PREMIUM_MONTHLY_CRITERION_STATUSES.includes(
    value as PremiumMonthlyCriterionStatus,
  );
}

function normalizeMonthlyCriterionResponses<TCriterionId extends string>(
  value: unknown,
  definitions: readonly { id: TCriterionId }[],
  label: string,
): PremiumMonthlyCriterionResponse<TCriterionId>[] {
  if (!Array.isArray(value) || value.length !== definitions.length) {
    throw new Error(`${label} tüm resmî ölçütleri içermelidir.`);
  }
  const byId = new Map<TCriterionId, PremiumMonthlyCriterionStatus>();
  for (const candidate of value) {
    const response = recordObject(candidate);
    if (
      !response ||
      !hasExactKeys(response, ["criterionId", "status"]) ||
      typeof response.criterionId !== "string" ||
      !isPremiumMonthlyCriterionStatus(response.status) ||
      byId.has(response.criterionId as TCriterionId)
    ) {
      throw new Error(`${label} ölçüt durumu geçersiz veya mükerrer.`);
    }
    byId.set(
      response.criterionId as TCriterionId,
      response.status,
    );
  }
  return definitions.map(({ id }) => {
    const status = byId.get(id);
    if (!status) {
      throw new Error(`${label} ${id} ölçütünü içermiyor.`);
    }
    return { criterionId: id, status };
  });
}

function parsePremiumMonthlyEvidenceCoverage(
  value: unknown,
): PremiumMonthlyEvidenceCoverage {
  const coverage = recordObject(value);
  const numericKeys = [
    "observationCount",
    "anecdotalObservationCount",
    "programLinkedObservationCount",
    "curriculumLinkCount",
    "distinctCivilDateCount",
    "distinctWeekCount",
    "distinctStudentCount",
    "distinctEnvironmentCount",
    "activeStudentCount",
    "coveredActiveStudentCount",
  ] as const;
  if (
    !coverage ||
    !hasExactKeys(coverage, [
      ...numericKeys,
      "activeStudentIds",
      "coveredActiveStudentIds",
      "uncoveredActiveStudentIds",
    ]) ||
    numericKeys.some(
      (key) => !Number.isInteger(coverage[key]) || Number(coverage[key]) < 0,
    )
  ) {
    throw new Error("Aylık değerlendirme kanıt kapsamı geçersiz.");
  }
  const activeStudentIds = uniqueMonthlyUuidArray(
    coverage.activeStudentIds,
    "Aylık değerlendirme kapsamındaki aktif çocuk",
  );
  const coveredActiveStudentIds = uniqueMonthlyUuidArray(
    coverage.coveredActiveStudentIds,
    "Aylık değerlendirme kapsamındaki temsil edilen çocuk",
  );
  const uncoveredActiveStudentIds = uniqueMonthlyUuidArray(
    coverage.uncoveredActiveStudentIds,
    "Aylık değerlendirme kapsamındaki eksik çocuk",
  );
  const parsed = {
    ...Object.fromEntries(
      numericKeys.map((key) => [key, Number(coverage[key])]),
    ),
    activeStudentIds,
    coveredActiveStudentIds,
    uncoveredActiveStudentIds,
  } as unknown as PremiumMonthlyEvidenceCoverage;
  if (
    parsed.anecdotalObservationCount > parsed.observationCount ||
    parsed.programLinkedObservationCount > parsed.observationCount ||
    parsed.distinctCivilDateCount > parsed.observationCount ||
    parsed.distinctWeekCount > parsed.observationCount ||
    parsed.coveredActiveStudentCount > parsed.activeStudentCount ||
    parsed.activeStudentIds.length !== parsed.activeStudentCount ||
    parsed.coveredActiveStudentIds.length !== parsed.coveredActiveStudentCount ||
    parsed.uncoveredActiveStudentIds.length !==
      parsed.activeStudentCount - parsed.coveredActiveStudentCount ||
    parsed.coveredActiveStudentIds.some(
      (id) => !parsed.activeStudentIds.includes(id),
    ) ||
    parsed.uncoveredActiveStudentIds.some(
      (id) =>
        !parsed.activeStudentIds.includes(id) ||
        parsed.coveredActiveStudentIds.includes(id),
    )
  ) {
    throw new Error("Aylık değerlendirme kanıt kapsamı sayıları tutarsız.");
  }
  return parsed;
}

function parsePremiumMonthlyMebProvenance(
  value: unknown,
): PremiumMonthlyEvaluationMebProvenance {
  const provenance = recordObject(value);
  if (
    !provenance ||
    !hasExactKeys(provenance, [
      "annex",
      "annexPage",
      "authority",
      "evaluationPages",
      "programTitle",
      "sourceVersion",
    ]) ||
    provenance.authority !== PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE.authority ||
    provenance.programTitle !== PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE.programTitle ||
    provenance.sourceVersion !== PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE.sourceVersion ||
    provenance.evaluationPages !== PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE.evaluationPages ||
    provenance.annex !== PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE.annex ||
    provenance.annexPage !== PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE.annexPage
  ) {
    throw new Error("Aylık değerlendirme MEB kaynak izi geçersiz.");
  }
  return structuredClone(PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE);
}

export function summarizePremiumMonthlyEvidence(
  observations: readonly PremiumMonthlyReviewObservation[],
  activeStudentIds: readonly string[] = [],
): PremiumMonthlyEvidenceCoverage {
  const civilDates = new Set<string>();
  const weeklyPlanIds = new Set<string>();
  const studentIds = new Set<string>();
  const environments = new Set<string>();
  const curriculumLinkIds = new Set<string>();
  let anecdotalObservationCount = 0;
  let programLinkedObservationCount = 0;
  for (const observation of observations) {
    civilDates.add(observation.civilDate);
    weeklyPlanIds.add(observation.weeklyPlanId);
    observation.studentIds.forEach((id) => studentIds.add(id));
    if (observation.environment) environments.add(observation.environment);
    if (observation.anecdotal) anecdotalObservationCount += 1;
    if (observation.curriculumLinks.length > 0) {
      programLinkedObservationCount += 1;
    }
    observation.curriculumLinks.forEach((link) =>
      curriculumLinkIds.add(link.id),
    );
  }
  const uniqueActiveStudentIds = [...new Set(activeStudentIds)];
  const coveredActiveStudentIds = uniqueActiveStudentIds.filter((id) =>
    studentIds.has(id),
  );
  const uncoveredActiveStudentIds = uniqueActiveStudentIds.filter(
    (id) => !studentIds.has(id),
  );
  return {
    observationCount: observations.length,
    anecdotalObservationCount,
    programLinkedObservationCount,
    curriculumLinkCount: curriculumLinkIds.size,
    distinctCivilDateCount: civilDates.size,
    distinctWeekCount: weeklyPlanIds.size,
    distinctStudentCount: studentIds.size,
    distinctEnvironmentCount: environments.size,
    activeStudentCount: uniqueActiveStudentIds.length,
    coveredActiveStudentCount: coveredActiveStudentIds.length,
    activeStudentIds: uniqueActiveStudentIds,
    coveredActiveStudentIds,
    uncoveredActiveStudentIds,
  };
}

export function premiumMonthlyEvidenceMeetsMinimum(
  coverage: PremiumMonthlyEvidenceCoverage,
): boolean {
  return (
    coverage.observationCount >= 2 &&
    coverage.distinctCivilDateCount >= 2 &&
    coverage.distinctWeekCount >= 2 &&
    coverage.programLinkedObservationCount === coverage.observationCount &&
    coverage.activeStudentCount > 0 &&
    coverage.coveredActiveStudentCount === coverage.activeStudentCount &&
    coverage.uncoveredActiveStudentIds.length === 0
  );
}

export function parsePremiumMonthlyEvaluation(
  value: unknown,
  label = "Aylık değerlendirme",
): PremiumMonthlyEvaluation {
  const evaluation = recordObject(value);
  if (
    !evaluation ||
    !hasExactKeys(evaluation, [
      "children",
      "createdAt",
      "id",
      "mebProvenance",
      "monthlyPlanId",
      "nextMonthRecommendation",
      "periodEnd",
      "periodStart",
      "program",
      "teacher",
      "teacherAuthored",
    ])
  ) {
    throw new Error(`${label} alanları geçersiz.`);
  }
  const children = recordObject(evaluation.children);
  const program = recordObject(evaluation.program);
  const teacher = recordObject(evaluation.teacher);
  if (
    !children ||
    !hasExactKeys(children, [
      "coverage",
      "curriculumLinkIds",
      "evidenceState",
      "narrative",
      "observationIds",
    ]) ||
    !program ||
    !hasExactKeys(program, ["criteria", "narrative"]) ||
    !teacher ||
    !hasExactKeys(teacher, ["criteria", "narrative"]) ||
    evaluation.teacherAuthored !== true
  ) {
    throw new Error(`${label} üç boyutlu öğretmen kaydı geçersiz.`);
  }
  if (
    children.evidenceState !== "sufficient-evidence" &&
    children.evidenceState !== "insufficient-evidence"
  ) {
    throw new Error(`${label} çocuklar yönü kanıt durumu geçersiz.`);
  }
  const periodStart = String(evaluation.periodStart);
  const periodEnd = String(evaluation.periodEnd);
  if (
    !isCivilDate(periodStart) ||
    !isCivilDate(periodEnd) ||
    periodStart > periodEnd
  ) {
    throw new Error(`${label} tarih aralığı geçersiz.`);
  }
  const observationIds = uniqueMonthlyUuidArray(
    children.observationIds,
    `${label} gözlem`,
  );
  const curriculumLinkIds = uniqueMonthlyUuidArray(
    children.curriculumLinkIds,
    `${label} program bağı`,
  );
  const coverage = parsePremiumMonthlyEvidenceCoverage(children.coverage);
  if (
    coverage.observationCount !== observationIds.length ||
    coverage.curriculumLinkCount !== curriculumLinkIds.length
  ) {
    throw new Error(`${label} kaynak kimlikleri ile kapsam özeti uyuşmuyor.`);
  }
  if (
    children.evidenceState === "sufficient-evidence" &&
    !premiumMonthlyEvidenceMeetsMinimum(coverage)
  ) {
    throw new Error(
      `${label} tek gözleme veya tek haftaya dayanarak yeterli kanıt sayamaz.`,
    );
  }
  const createdAt = String(evaluation.createdAt);
  utcTimestampMillis(createdAt, `${label}/createdAt`);
  return {
    id: requiredMonthlyUuid(evaluation.id, label),
    monthlyPlanId: requiredMonthlyUuid(
      evaluation.monthlyPlanId,
      `${label} aylık plan`,
    ),
    periodStart,
    periodEnd,
    children: {
      evidenceState: children.evidenceState,
      narrative: optionalMonthlyNarrative(
        children.narrative,
        `${label} çocuklar yönü öğretmen notu`,
      ),
      observationIds,
      curriculumLinkIds,
      coverage,
    },
    program: {
      narrative: parseTeacherWeeklyValuesNarrative(
        program.narrative,
        `${label} program yönü`,
      ),
      criteria: normalizeMonthlyCriterionResponses(
        program.criteria,
        PREMIUM_MONTHLY_PROGRAM_CRITERIA,
        `${label} program yönü`,
      ),
    },
    teacher: {
      narrative: parseTeacherWeeklyValuesNarrative(
        teacher.narrative,
        `${label} öğretmen yönü`,
      ),
      criteria: normalizeMonthlyCriterionResponses(
        teacher.criteria,
        PREMIUM_MONTHLY_TEACHER_CRITERIA,
        `${label} öğretmen yönü`,
      ),
    },
    nextMonthRecommendation: parseTeacherWeeklyValuesNarrative(
      evaluation.nextMonthRecommendation,
      `${label} sonraki ay önerisi`,
    ),
    teacherAuthored: true,
    mebProvenance: parsePremiumMonthlyMebProvenance(
      evaluation.mebProvenance,
    ),
    createdAt,
  };
}

/**
 * Haftalık değerlendirme kartının değer kanıtı için yalnız keşif görünümüdür.
 * Bu projection bağlantı oluşturmaz; grup ve legacy gözlemleri fail-closed tutar.
 */
export function projectPremiumWeeklyReviewObservation(
  observation: StoredRecord,
  activity: StoredRecord | undefined,
  student: StoredRecord | undefined,
): PremiumWeeklyReviewObservation {
  const studentIds = Array.isArray(observation.studentIds)
    ? observation.studentIds.filter(
        (candidate): candidate is string => typeof candidate === "string",
      )
    : [];
  const studentId = studentIds.length === 1 ? studentIds[0] : null;
  const activityId =
    typeof observation.activityId === "string" ? observation.activityId : null;
  const appliedTemplate = recordObject(activity?.appliedActivityTemplateSnapshot);
  const sourceContent = recordObject(activity?.sourceContentPackSnapshot);
  const studentIsLive = Boolean(
    studentId &&
      student?.id === studentId &&
      typeof student.deletedAt !== "string" &&
      student.enrollmentStatus !== "left" &&
      student.enrollmentStatus !== "completed" &&
      student.enrollmentStatus !== "transferred",
  );
  const valueEvidenceEligible = Boolean(
    studentIsLive &&
      activityId &&
      activity?.id === activityId &&
      activity.planId === observation.planId &&
      typeof activity.appliedActivityTemplateId === "string" &&
      appliedTemplate?.id === activity.appliedActivityTemplateId &&
      recordObject(appliedTemplate.valuesDesign) &&
      sourceContent?.valuesMappingStatus ===
        "machine_validated_pending_human_review",
  );

  return {
    id: observation.id,
    civilDate: observation.civilDate,
    observedAt:
      typeof observation.observedAt === "string"
        ? observation.observedAt
        : observation.createdAt,
    rawText: String(observation.rawText),
    activityTitle: activity ? String(activity.title ?? "Etkinlik") : "Etkinlik",
    studentId,
    studentName:
      studentIsLive && typeof student?.displayName === "string"
        ? student.displayName
        : null,
    activityId,
    valueEvidenceEligible,
  };
}

async function activeScopeInTransaction(
  transaction: DataTransaction,
): Promise<ActiveClassroomScope> {
  const snapshot = createEmptySnapshot();
  [snapshot.academicYears, snapshot.classrooms, snapshot.settings] =
    await Promise.all([
      transaction.getAll("academicYears"),
      transaction.getAll("classrooms"),
      transaction.getAll("settings"),
    ]);
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    throw new Error("Premium planı eklemek için etkin ve arşivlenmemiş bir sınıf gereklidir.");
  }
  return scope;
}

function sameScope(record: StoredRecord, scope: ActiveClassroomScope): boolean {
  return recordBelongsToClassroomScope(record, scope);
}

function utcTimestampMillis(value: string, label: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new Error(`${label} UTC zaman biçiminde değil; işlem uygulanmadı.`);
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} UTC zaman biçiminde değil; işlem uygulanmadı.`);
  }
  return parsed;
}

function latestStoredRecordTimestampMillis(
  record: StoredRecord,
  label: string,
): number {
  return Math.max(
    utcTimestampMillis(record.createdAt, `${label}/createdAt`),
    utcTimestampMillis(record.updatedAt, `${label}/updatedAt`),
    ...(typeof record.deletedAt === "string"
      ? [utcTimestampMillis(record.deletedAt, `${label}/deletedAt`)]
      : []),
  );
}

function assertMutationChronology(
  now: Date,
  records: readonly { label: string; record: StoredRecord }[],
  operationLabel: string,
): void {
  if (
    records.some(
      ({ label, record }) =>
        now.getTime() < latestStoredRecordTimestampMillis(record, label),
    )
  ) {
    throw new Error(
      `${operationLabel} zamanı ilgili kayıtların son değişiklik zamanından eski; işlem uygulanmadı.`,
    );
  }
}

function validateProfile(
  pack: PremiumContentPack,
  profile: CurriculumProfileSnapshot,
): void {
  if (
    profile.framework !== "tymm" ||
    profile.catalogId !== pack.catalogId ||
    profile.sourceVersion !== pack.catalogSourceVersion ||
    profile.referenceOrigin !== "official-catalog" ||
    profile.officialCatalogVerified !== true
  ) {
    throw new Error(
      "Bu paket yalnız doğrulanmış TYMM 2024 program profiliyle kullanılabilir.",
    );
  }
}

function validateLensSelection(
  pack: PremiumContentPack,
  teacherPreferredLensId: PremiumPlanLensId,
  teacherPreferredSupportingLensIds: readonly PremiumPlanLensId[],
): void {
  const available = new Set(pack.lenses.map((lens) => lens.id));
  if (!available.has(teacherPreferredLensId)) {
    throw new Error("Seçilen ana pedagojik lens bu pakette bulunmuyor.");
  }
  if (teacherPreferredSupportingLensIds.length > 2) {
    throw new Error("Bir planda en fazla iki destekleyici lens seçilebilir.");
  }
  if (
    new Set([
      teacherPreferredLensId,
      ...teacherPreferredSupportingLensIds,
    ]).size !== teacherPreferredSupportingLensIds.length + 1
  ) {
    throw new Error("Aynı pedagojik lens birden fazla seçilemez.");
  }
  if (
    teacherPreferredSupportingLensIds.some(
      (lensId) => !available.has(lensId),
    )
  ) {
    throw new Error("Destekleyici lenslerden biri bu pakette bulunmuyor.");
  }
}

function targetsForPack(
  pack: PremiumContentPack,
  profile: CurriculumProfileSnapshot,
): CurriculumTargetSnapshot[] {
  const allTargets = curriculumTargetsForProfile(profile, pack.ageProfile);
  const requestedCodes = new Set(
    pack.activities.flatMap((activity) => activity.curriculumTargetCodes),
  );
  const selected = allTargets.filter((target) =>
    requestedCodes.has(target.referenceCode),
  );
  const foundCodes = new Set(selected.map((target) => target.referenceCode));
  const missing = [...requestedCodes].filter((code) => !foundCodes.has(code));
  if (missing.length > 0) {
    throw new Error(`Premium içerikte katalogda bulunmayan TYMM hedefleri var: ${missing.join(", ")}`);
  }
  return selected;
}

export async function installPremiumPlanBoard(
  store: LocalDataStore,
  input: {
    pack: PremiumContentPack;
    curriculumProfile: CurriculumProfileSnapshot;
    teacherPreferredLensId: PremiumPlanLensId;
    teacherPreferredSupportingLensIds?: readonly PremiumPlanLensId[];
    now?: Date;
  },
): Promise<PremiumPlanBoardResult> {
  const teacherPreferredSupportingLensIds =
    input.teacherPreferredSupportingLensIds ?? [];
  assertPremiumContentPackValuesIntegrity(input.pack);
  validateProfile(input.pack, input.curriculumProfile);
  validateLensSelection(
    input.pack,
    input.teacherPreferredLensId,
    teacherPreferredSupportingLensIds,
  );
  const curriculumTargets = targetsForPack(input.pack, input.curriculumProfile);
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kurulum zamanı gerekli.");
  const timestamp = now.toISOString();
  const contentSnapshot = premiumContentPackSnapshot(input.pack);
  let result: PremiumPlanBoardResult | null = null;

  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [academicYears, classrooms, plans] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("classrooms"),
        transaction.getAll("plans"),
      ]);
      const academicYear = academicYears.find(
        (record) => record.id === scope.academicYearId,
      );
      if (
        !academicYear ||
        !isCivilDate(academicYear.startDate) ||
        !isCivilDate(academicYear.endDate) ||
        ANNUAL_PERIOD_START < academicYear.startDate ||
        ANNUAL_PERIOD_END > academicYear.endDate
      ) {
        throw new Error(
          "Etkin eğitim yılı 7 Eylül 2026–25 Haziran 2027 plan dönemini kapsamıyor.",
        );
      }
      const classroom = classrooms.find((record) => record.id === scope.classroomId);
      const rawStoredProfile = classroom?.curriculumProfileSnapshot;
      const storedProfile =
        rawStoredProfile &&
        typeof rawStoredProfile === "object" &&
        !Array.isArray(rawStoredProfile)
          ? (rawStoredProfile as Record<string, unknown>)
          : null;
      if (
        !classroom ||
        !storedProfile ||
        storedProfile.framework !== input.curriculumProfile.framework ||
        storedProfile.catalogId !== input.curriculumProfile.catalogId ||
        storedProfile.sourceVersion !== input.curriculumProfile.sourceVersion ||
        storedProfile.referenceOrigin !== input.curriculumProfile.referenceOrigin ||
        storedProfile.officialCatalogVerified !== true ||
        typeof classroom.ageGroup !== "string" ||
        !/60\s*[–-]\s*72/.test(classroom.ageGroup)
      ) {
        throw new Error(
          "Etkin sınıf doğrulanmış TYMM 2024 · 60–72 ay pilot profiliyle uyuşmuyor.",
        );
      }

      const existingAnnual = plans.find(
        (record) =>
          record.planType === "annual" &&
          record.contentPackId === input.pack.id &&
          record.contentPackVersion === input.pack.version &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (existingAnnual) {
        const existingMonthly = plans.find(
          (record) =>
            record.planType === "monthly" &&
            record.annualPlanId === existingAnnual.id &&
            record.monthKey === "2026-09" &&
            typeof record.deletedAt !== "string" &&
            sameScope(record, scope),
        );
        if (!existingMonthly) {
          throw new Error("Yıllık plan bulundu ancak Eylül aylık planı eksik; veri bütünlüğü incelemesi gerekli.");
        }
        const weeklyPlanIds = input.pack.weeks.map((week) => {
          const weekly = plans.find(
            (record) =>
              record.planType === "weekly" &&
              record.monthlyPlanId === existingMonthly.id &&
              record.weekId === week.id &&
              typeof record.deletedAt !== "string" &&
              sameScope(record, scope),
          );
          if (!weekly) {
            throw new Error(
              `Eylül aylık planının ${week.title} kaydı eksik; veri bütünlüğü incelemesi gerekli.`,
            );
          }
          return { weekId: week.id, planId: weekly.id };
        });
        result = {
          annualPlanId: existingAnnual.id,
          monthlyPlanId: existingMonthly.id,
          weeklyPlanIds,
          created: false,
        };
        return;
      }

      const annualPlanId = crypto.randomUUID();
      const monthlyPlanId = crypto.randomUUID();
      const weeklyPlanIds = input.pack.weeks.map((week) => ({
        weekId: week.id,
        planId: crypto.randomUUID(),
      }));
      const annualPlan: StoredRecord = {
        id: annualPlanId,
        planType: "annual",
        title: `${input.pack.displayName} Yıllık Planlama Panosu`,
        status: "active",
        periodStart: ANNUAL_PERIOD_START,
        periodEnd: ANNUAL_PERIOD_END,
        ageProfile: input.pack.ageProfile,
        curriculumProfileSnapshot: structuredClone(input.curriculumProfile),
        contentPackId: input.pack.id,
        contentPackVersion: input.pack.version,
        contentPackSnapshot: structuredClone(contentSnapshot),
        teacherPreferredLensId: input.teacherPreferredLensId,
        teacherPreferredSupportingLensIds: [
          ...teacherPreferredSupportingLensIds,
        ],
        lensSelectionMode: "preference_only",
        monthlySectionIds: [monthlyPlanId],
        annualMonths: structuredClone(input.pack.annualMonths),
        coverageSummary: {
          availableMonthCount: input.pack.annualMonths.filter(
            (month) => month.releaseStatus !== "planned-release",
          ).length,
          plannedMonthCount: input.pack.annualMonths.filter(
            (month) => month.releaseStatus === "planned-release",
          ).length,
          availableActivityCount: input.pack.activities.length,
        },
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: ANNUAL_PERIOD_START,
        deletedAt: null,
        schemaVersion: 1,
      };
      const monthlyPlan: StoredRecord = {
        id: monthlyPlanId,
        planType: "monthly",
        title: input.pack.monthlyPlan.title,
        status: "review_ready",
        annualPlanId,
        monthKey: input.pack.monthlyPlan.monthKey,
        periodStart: input.pack.monthlyPlan.periodStart,
        periodEnd: input.pack.monthlyPlan.periodEnd,
        ageProfile: input.pack.ageProfile,
        curriculumProfileSnapshot: structuredClone(input.curriculumProfile),
        curriculumTargets: structuredClone(curriculumTargets),
        contentPackId: input.pack.id,
        contentPackVersion: input.pack.version,
        contentPackSnapshot: structuredClone(contentSnapshot),
        teacherPreferredLensId: input.teacherPreferredLensId,
        teacherPreferredSupportingLensIds: [
          ...teacherPreferredSupportingLensIds,
        ],
        lensSelectionMode: "preference_only",
        weeklySectionIds: weeklyPlanIds.map(({ planId }) => planId),
        premiumWeeks: structuredClone(input.pack.weeks),
        premiumActivityTemplates: structuredClone(input.pack.activities),
        premiumMonthlyPlan: structuredClone(input.pack.monthlyPlan),
        premiumFullDayFlow: structuredClone(input.pack.fullDayFlow),
        teacherReviewRequired: true,
        monthlyReflection: null,
        monthlyEvaluations: [],
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: input.pack.monthlyPlan.periodStart,
        deletedAt: null,
        schemaVersion: 1,
      };
      const weeklyPlans: StoredRecord[] = input.pack.weeks.map((week) => {
        const weeklyActivities = input.pack.activities.filter(
          (activity) => activity.weekId === week.id,
        );
        const requestedCodes = new Set(
          weeklyActivities.flatMap((activity) => activity.curriculumTargetCodes),
        );
        const weeklyTargets = curriculumTargets.filter((target) =>
          requestedCodes.has(target.referenceCode),
        );
        const weeklyPlanId = weeklyPlanIds.find(
          (candidate) => candidate.weekId === week.id,
        )?.planId;
        if (!weeklyPlanId) {
          throw new Error(`${week.title} için haftalık plan kimliği üretilemedi.`);
        }
        return {
          id: weeklyPlanId,
          planType: "weekly",
          title: week.title,
          status: "review_ready",
          annualPlanId,
          monthlyPlanId,
          weekId: week.id,
          periodStart: week.periodStart,
          periodEnd: week.periodEnd,
          ageProfile: input.pack.ageProfile,
          curriculumProfileSnapshot: structuredClone(input.curriculumProfile),
          curriculumTargets: structuredClone(weeklyTargets),
          contentPackId: input.pack.id,
          contentPackVersion: input.pack.version,
          contentPackSnapshot: structuredClone(contentSnapshot),
          teacherPreferredLensId: input.teacherPreferredLensId,
          teacherPreferredSupportingLensIds: [
            ...teacherPreferredSupportingLensIds,
          ],
          lensSelectionMode: "preference_only",
          premiumWeekSnapshot: structuredClone(week),
          premiumActivityTemplates: structuredClone(weeklyActivities),
          teacherReviewRequired: true,
          weeklyEvaluations: [],
          nextPlanDecisionRequired: true,
          academicYearId: scope.academicYearId,
          classroomId: scope.classroomId,
          createdAt: timestamp,
          updatedAt: timestamp,
          civilDate: week.periodStart,
          deletedAt: null,
          schemaVersion: 1,
        };
      });
      await transaction.putMany("plans", [annualPlan, monthlyPlan, ...weeklyPlans]);
      result = { annualPlanId, monthlyPlanId, weeklyPlanIds, created: true };
    },
  );

  if (!result) throw new Error("Premium yıllık ve aylık plan kaydedilemedi.");
  return result;
}

export async function loadInstalledPremiumPlan(
  store: LocalDataStore,
  pack: PremiumContentPack,
): Promise<PremiumInstalledPlanSummary | null> {
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return null;
  const annual = snapshot.plans.find(
    (record) =>
      record.planType === "annual" &&
      record.contentPackId === pack.id &&
      record.contentPackVersion === pack.version &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!annual) return null;
  const monthly = snapshot.plans.find(
    (record) =>
      record.planType === "monthly" &&
      record.annualPlanId === annual.id &&
      record.monthKey === "2026-09" &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!monthly) return null;
  const weeklyPlanIds = pack.weeks.map((week) => {
    const weekly = snapshot.plans.find(
      (record) =>
        record.planType === "weekly" &&
        record.monthlyPlanId === monthly.id &&
        record.weekId === week.id &&
        typeof record.deletedAt !== "string" &&
        sameScope(record, scope),
    );
    return weekly ? { weekId: week.id, planId: weekly.id } : null;
  });
  if (weeklyPlanIds.some((entry) => entry === null)) return null;
  const lensPreference = parsePremiumLensPreferenceRecord(
    annual,
    `plans/${annual.id}`,
  );
  validateLensSelection(
    pack,
    lensPreference.teacherPreferredLensId,
    lensPreference.teacherPreferredSupportingLensIds,
  );
  for (const relatedPlan of [monthly, ...weeklyPlanIds.flatMap((entry) => {
    if (!entry) return [];
    const weekly = snapshot.plans.find((record) => record.id === entry.planId);
    return weekly ? [weekly] : [];
  })]) {
    const relatedPreference = parsePremiumLensPreferenceRecord(
      relatedPlan,
      `plans/${relatedPlan.id}`,
    );
    if (!samePremiumLensPreference(relatedPreference, lensPreference)) {
      throw new Error(
        "Premium planın öğretmen yaklaşım tercihi yıllık, aylık ve haftalık kayıtlarda uyuşmuyor.",
      );
    }
  }
  return {
    annualPlanId: annual.id,
    monthlyPlanId: monthly.id,
    weeklyPlanIds: weeklyPlanIds.filter(
      (entry): entry is { weekId: string; planId: string } => entry !== null,
    ),
    title: String(annual.title),
    contentVersion: String(annual.contentPackVersion),
    ...lensPreference,
    activityCount: Array.isArray(monthly.premiumActivityTemplates)
      ? monthly.premiumActivityTemplates.length
      : 0,
    installedAt: annual.createdAt,
  };
}

export async function loadLegacyInstalledPremiumPlans(
  store: LocalDataStore,
  currentPack: PremiumContentPack,
): Promise<readonly PremiumLegacyInstalledPlanSummary[]> {
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return [];
  return snapshot.plans
    .filter(
      (record) =>
        record.planType === "annual" &&
        typeof record.deletedAt !== "string" &&
        sameScope(record, scope) &&
        (record.contentPackId !== currentPack.id ||
          record.contentPackVersion !== currentPack.version),
    )
    .flatMap((record) => {
      const contentPackSnapshot = record.contentPackSnapshot;
      const contentPack = contentPackSnapshot &&
        typeof contentPackSnapshot === "object" &&
        !Array.isArray(contentPackSnapshot)
        ? contentPackSnapshot as Record<string, unknown>
        : null;
      const version = typeof record.contentPackVersion === "string"
        ? record.contentPackVersion
        : "";
      const legacyStatus = contentPack?.valuesMappingStatus === "legacy-unmapped" ||
        (contentPack?.valuesMappingStatus === undefined &&
          Number.parseInt(version.split(".")[0] ?? "", 10) < 3);
      if (
        !legacyStatus ||
        typeof record.contentPackId !== "string" ||
        typeof record.title !== "string" ||
        typeof record.createdAt !== "string"
      ) {
        return [];
      }
      return [{
        annualPlanId: record.id,
        title: record.title,
        contentPackId: record.contentPackId,
        contentVersion: version,
        installedAt: record.createdAt,
        valuesMappingStatus: "legacy-unmapped" as const,
        readOnly: true as const,
      }];
    })
    .sort((left, right) => right.installedAt.localeCompare(left.installedAt));
}

export function preparePremiumDailyTemplate(
  pack: PremiumContentPack,
  activityId: string,
  lineage: {
    annualPlanId: string;
    monthlyPlanId: string;
    weeklyPlanIds: readonly { weekId: string; planId: string }[];
    teacherPreferredLensId: PremiumPlanLensId;
    teacherPreferredSupportingLensIds: readonly PremiumPlanLensId[];
  },
): PremiumDailyTemplateSelection {
  const activity = pack.activities.find((candidate) => candidate.id === activityId);
  if (!activity) {
    throw new Error("Seçilen premium etkinlik bu içerik paketinde bulunmuyor.");
  }
  if (activity.activityRole !== "main") {
    throw new Error(
      "Alternatif etkinlik doğrudan uygulanmış etkinlik olarak seçilemez; haftanın ana etkinliğine seçenek olarak eklenir.",
    );
  }
  const weeklyPlanId = lineage.weeklyPlanIds.find(
    (candidate) => candidate.weekId === activity.weekId,
  )?.planId;
  if (!weeklyPlanId) {
    throw new Error("Seçilen etkinliğin haftalık plan kaydı bulunmuyor.");
  }
  return premiumDailyTemplateSelection(pack, activity, {
    annualPlanId: lineage.annualPlanId,
    monthlyPlanId: lineage.monthlyPlanId,
    weeklyPlanId,
    teacherPreferredLensId: lineage.teacherPreferredLensId,
    teacherPreferredSupportingLensIds:
      lineage.teacherPreferredSupportingLensIds,
  });
}

export async function updatePremiumPlanLensPreferences(
  store: LocalDataStore,
  input: {
    pack: PremiumContentPack;
    teacherPreferredLensId: PremiumPlanLensId;
    teacherPreferredSupportingLensIds?: readonly PremiumPlanLensId[];
    now?: Date;
  },
): Promise<void> {
  const teacherPreferredSupportingLensIds =
    input.teacherPreferredSupportingLensIds ?? [];
  validateLensSelection(
    input.pack,
    input.teacherPreferredLensId,
    teacherPreferredSupportingLensIds,
  );
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir güncelleme zamanı gerekli.");
  const timestamp = now.toISOString();
  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const plans = await transaction.getAll("plans");
      const annual = plans.find(
        (record) =>
          record.planType === "annual" &&
          record.contentPackId === input.pack.id &&
          record.contentPackVersion === input.pack.version &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (!annual) throw new Error("Yaklaşımı değiştirilecek premium plan bulunamadı.");
      const related = plans.filter(
        (record) =>
          (record.id === annual.id || record.annualPlanId === annual.id) &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      assertMutationChronology(
        now,
        related.map((record) => ({ label: `plans/${record.id}`, record })),
        "Pedagojik lens güncelleme",
      );
      await transaction.putMany(
        "plans",
        related.map((record) => {
          const {
            primaryLensId: _legacyPrimaryLensId,
            supportingLensIds: _legacySupportingLensIds,
            ...withoutLegacyLensFields
          } = record;
          return {
            ...withoutLegacyLensFields,
            teacherPreferredLensId: input.teacherPreferredLensId,
            teacherPreferredSupportingLensIds: [
              ...teacherPreferredSupportingLensIds,
            ],
            lensSelectionMode: "preference_only",
            updatedAt: timestamp,
          };
        }),
      );
    },
  );
}

export async function recordPremiumWeeklyEvaluation(
  store: LocalDataStore,
  input: {
    weeklyPlanId: string;
    reflection: string;
    evidenceSummary: string;
    observationIds?: readonly string[];
    nextPlanDecision: PremiumNextPlanDecision;
    now?: Date;
  },
): Promise<PremiumWeeklyEvaluation> {
  const reflection = parseTeacherWeeklyValuesNarrative(
    input.reflection,
    "Haftalık öğretmen değerlendirmesi",
  );
  const evidenceSummary = parseTeacherWeeklyValuesNarrative(
    input.evidenceSummary,
    "Haftalık kanıt özeti",
  );
  if (!["keep", "adapt", "replace", "observe-more"].includes(input.nextPlanDecision)) {
    throw new Error("Geçerli bir sonraki plan kararı seçilmelidir.");
  }
  const observationIds = [...new Set(input.observationIds ?? [])];
  if (observationIds.length === 0) {
    throw new Error("Haftalık değerlendirme için en az bir bağlı gözlem seçilmelidir.");
  }
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir değerlendirme zamanı gerekli.");
  const timestamp = now.toISOString();
  let result: PremiumWeeklyEvaluation | null = null;

  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans", "observations"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [plans, observations] = await Promise.all([
        transaction.getAll("plans"),
        transaction.getAll("observations"),
      ]);
      const weekly = plans.find(
        (record) =>
          record.id === input.weeklyPlanId &&
          record.planType === "weekly" &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (!weekly) throw new Error("Değerlendirilecek haftalık plan bulunamadı.");
      const observationsById = new Map(observations.map((record) => [record.id, record]));
      const selectedObservations: StoredRecord[] = [];
      const weeklyDailyPlanIds = new Set(
        plans
          .filter(
            (record) =>
              record.planType === "daily" &&
              record.sourceWeeklyPlanId === weekly.id &&
              typeof record.deletedAt !== "string" &&
              sameScope(record, scope),
          )
          .map((record) => record.id),
      );
      for (const observationId of observationIds) {
        const observation = observationsById.get(observationId);
        if (
          !observation ||
          !sameScope(observation, scope) ||
          typeof observation.planId !== "string" ||
          !weeklyDailyPlanIds.has(observation.planId) ||
          observation.rawTextImmutable !== true ||
          typeof observation.deletedAt === "string"
        ) {
          throw new Error(
            "Değerlendirme yalnız bu haftanın premium günlük planlarına bağlı ham gözlemleri kullanabilir.",
          );
        }
        const observedAt =
          typeof observation.observedAt === "string"
            ? observation.observedAt
            : observation.createdAt;
        if (
          utcTimestampMillis(
            observedAt,
            `observations/${observation.id}/observedAt`,
          ) > now.getTime()
        ) {
          throw new Error(
            "Haftalık değerlendirme zamanı bağlı gözlemin gerçekleşme zamanından eski; işlem uygulanmadı.",
          );
        }
        parseTeacherWeeklyValuesNarrative(
          observation.rawText,
          "Haftalık değerlendirmeye bağlı ham gözlem",
        );
        selectedObservations.push(observation);
      }
      const nextWeekly = plans
        .filter(
          (record) =>
            record.planType === "weekly" &&
            record.monthlyPlanId === weekly.monthlyPlanId &&
            typeof record.periodStart === "string" &&
            String(record.periodStart) > String(weekly.periodEnd) &&
            typeof record.deletedAt !== "string" &&
            sameScope(record, scope),
        )
        .sort((left, right) =>
          String(left.periodStart).localeCompare(String(right.periodStart)),
        )[0];
      assertMutationChronology(
        now,
        [
          { label: `plans/${weekly.id}`, record: weekly },
          ...(nextWeekly
            ? [{ label: `plans/${nextWeekly.id}`, record: nextWeekly }]
            : []),
          ...selectedObservations.map((record) => ({
            label: `observations/${record.id}`,
            record,
          })),
        ],
        "Haftalık değerlendirme",
      );
      const evaluation: PremiumWeeklyEvaluation = {
        id: crypto.randomUUID(),
        reflection,
        evidenceSummary,
        observationIds,
        nextPlanDecision: input.nextPlanDecision,
        nextPlanTargetPlanId: nextWeekly?.id ?? null,
        teacherAuthored: true,
        createdAt: timestamp,
      };
      const previous = Array.isArray(weekly.weeklyEvaluations)
        ? weekly.weeklyEvaluations
        : [];
      const recordsToPut: StoredRecord[] = [
        {
          ...weekly,
          status: "evaluated",
          weeklyEvaluations: [...previous, structuredClone(evaluation)],
          nextPlanDecisionRequired: false,
          updatedAt: timestamp,
        },
      ];
      if (nextWeekly) {
        recordsToPut.push({
          ...nextWeekly,
          previousWeekEvaluationId: evaluation.id,
          nextPlanDecisionContext: {
            sourceWeeklyPlanId: weekly.id,
            evaluationId: evaluation.id,
            decision: evaluation.nextPlanDecision,
            evidenceSummary: evaluation.evidenceSummary,
            teacherReflection: evaluation.reflection,
            createdAt: evaluation.createdAt,
          },
          teacherReviewRequired: true,
          updatedAt: timestamp,
        });
      }
      await transaction.putMany("plans", recordsToPut);
      result = evaluation;
    },
  );
  if (!result) throw new Error("Haftalık değerlendirme kaydedilemedi.");
  return result;
}

export async function loadPremiumWeeklyReviewContext(
  store: LocalDataStore,
  weeklyPlanId: string,
): Promise<PremiumWeeklyReviewContext> {
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) throw new Error("Haftalık değerlendirme için etkin sınıf gereklidir.");
  const weekly = snapshot.plans.find(
    (record) =>
      record.id === weeklyPlanId &&
      record.planType === "weekly" &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!weekly) throw new Error("Değerlendirilecek haftalık plan bulunamadı.");
  const dailyPlans = snapshot.plans.filter(
    (record) =>
      record.planType === "daily" &&
      record.sourceWeeklyPlanId === weekly.id &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  const dailyPlanIds = new Set(dailyPlans.map((record) => record.id));
  const activitiesById = new Map(
    snapshot.activities
      .filter((record) => sameScope(record, scope))
      .map((record) => [record.id, record]),
  );
  const studentsById = new Map(
    snapshot.students
      .filter((record) => sameScope(record, scope))
      .map((record) => [record.id, record]),
  );
  const observations = snapshot.observations
    .filter(
      (record) =>
        typeof record.deletedAt !== "string" &&
        record.rawTextImmutable === true &&
        typeof record.planId === "string" &&
        dailyPlanIds.has(record.planId) &&
        sameScope(record, scope),
    )
    .map((record): PremiumWeeklyReviewObservation => {
      const activity =
        typeof record.activityId === "string"
          ? activitiesById.get(record.activityId)
          : undefined;
      const singleStudentId =
        Array.isArray(record.studentIds) && record.studentIds.length === 1
          ? record.studentIds[0]
          : undefined;
      const student =
        typeof singleStudentId === "string"
          ? studentsById.get(singleStudentId)
          : undefined;
      return projectPremiumWeeklyReviewObservation(record, activity, student);
    })
    .sort((left, right) => left.observedAt.localeCompare(right.observedAt));
  return {
    weeklyPlanId: weekly.id,
    weekId: String(weekly.weekId),
    title: String(weekly.title),
    periodStart: String(weekly.periodStart),
    periodEnd: String(weekly.periodEnd),
    observations,
    evaluations: Array.isArray(weekly.weeklyEvaluations)
      ? (structuredClone(weekly.weeklyEvaluations) as PremiumWeeklyEvaluation[])
      : [],
  };
}

export async function loadPremiumWeeklyCarryForwardContexts(
  store: LocalDataStore,
  monthlyPlanId: string,
): Promise<readonly PremiumWeeklyCarryForwardContext[]> {
  const validatedMonthlyPlanId = requiredMonthlyUuid(
    monthlyPlanId,
    "Haftalık karar kuyruğu aylık planı",
  );
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return [];
  const monthly = snapshot.plans.find(
    (record) =>
      record.id === validatedMonthlyPlanId &&
      record.planType === "monthly" &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!monthly || !Array.isArray(monthly.weeklySectionIds)) return [];
  const weeklyPlans = monthly.weeklySectionIds.map((weeklyPlanId) => {
    const weekly = snapshot.plans.find(
      (record) =>
        record.id === weeklyPlanId &&
        record.planType === "weekly" &&
        record.monthlyPlanId === monthly.id &&
        typeof record.deletedAt !== "string" &&
        sameScope(record, scope),
    );
    if (!weekly) {
      throw new Error("Haftalık karar kuyruğu plan zinciri eksik.");
    }
    return weekly;
  });
  const weeklyById = new Map(weeklyPlans.map((weekly) => [weekly.id, weekly]));
  return weeklyPlans.flatMap((target): PremiumWeeklyCarryForwardContext[] => {
    if (target.nextPlanDecisionContext === undefined) return [];
    const context = recordObject(target.nextPlanDecisionContext);
    if (
      !context ||
      !hasExactKeys(context, [
        "createdAt",
        "decision",
        "evaluationId",
        "evidenceSummary",
        "sourceWeeklyPlanId",
        "teacherReflection",
      ]) ||
      !["keep", "adapt", "replace", "observe-more"].includes(
        String(context.decision),
      )
    ) {
      throw new Error("Önceki haftadan taşınan öğretmen kararı geçersiz.");
    }
    const sourceWeeklyPlanId = requiredMonthlyUuid(
      context.sourceWeeklyPlanId,
      "Karar kaynağı haftalık plan",
    );
    const source = weeklyById.get(sourceWeeklyPlanId);
    const evaluationId = requiredMonthlyUuid(
      context.evaluationId,
      "Karar kaynağı değerlendirme",
    );
    const sourceEvaluation = source && Array.isArray(source.weeklyEvaluations)
      ? source.weeklyEvaluations
          .map((evaluation) => recordObject(evaluation))
          .find((evaluation) => evaluation?.id === evaluationId)
      : undefined;
    if (
      !source ||
      !sourceEvaluation ||
      sourceEvaluation.nextPlanTargetPlanId !== target.id ||
      sourceEvaluation.nextPlanDecision !== context.decision ||
      sourceEvaluation.evidenceSummary !== context.evidenceSummary ||
      sourceEvaluation.reflection !== context.teacherReflection ||
      sourceEvaluation.createdAt !== context.createdAt
    ) {
      throw new Error(
        "Önceki haftadan taşınan öğretmen kararı kaynak değerlendirmeyle uyuşmuyor.",
      );
    }
    const createdAt = requiredMonthlyText(
      context.createdAt,
      "Haftalık karar zamanı",
    );
    utcTimestampMillis(createdAt, "Haftalık karar zamanı");
    return [{
      targetWeeklyPlanId: target.id,
      sourceWeeklyPlanId: source.id,
      sourceWeekTitle: requiredMonthlyText(source.title, "Kaynak hafta başlığı"),
      sourcePeriodStart: requiredMonthlyText(
        source.periodStart,
        "Kaynak hafta başlangıcı",
      ),
      sourcePeriodEnd: requiredMonthlyText(
        source.periodEnd,
        "Kaynak hafta bitişi",
      ),
      evaluationId,
      decision: context.decision as PremiumNextPlanDecision,
      evidenceSummary: requiredMonthlyText(
        context.evidenceSummary,
        "Haftalık karar kanıt özeti",
      ),
      teacherReflection: requiredMonthlyText(
        context.teacherReflection,
        "Haftalık karar öğretmen notu",
      ),
      createdAt,
      applicationStatus: "pending-teacher-review",
    }];
  });
}

function projectPremiumMonthlyReviewObservations(
  input: {
    monthly: StoredRecord;
    plans: readonly StoredRecord[];
    activities: readonly StoredRecord[];
    observations: readonly StoredRecord[];
    links: readonly StoredRecord[];
    scope: ActiveClassroomScope;
  },
): PremiumMonthlyReviewObservation[] {
  const periodStart = requiredMonthlyText(
    input.monthly.periodStart,
    "Aylık değerlendirme başlangıcı",
  );
  const periodEnd = requiredMonthlyText(
    input.monthly.periodEnd,
    "Aylık değerlendirme bitişi",
  );
  if (
    !isCivilDate(periodStart) ||
    !isCivilDate(periodEnd) ||
    periodStart > periodEnd
  ) {
    throw new Error("Aylık değerlendirme tarih aralığı geçersiz.");
  }
  if (!Array.isArray(input.monthly.weeklySectionIds)) {
    throw new Error("Aylık değerlendirme için haftalık plan zinciri eksik.");
  }
  const weeklyPlanIds = input.monthly.weeklySectionIds.map((id) =>
    requiredMonthlyUuid(id, "Aylık değerlendirme haftalık plan"),
  );
  if (new Set(weeklyPlanIds).size !== weeklyPlanIds.length) {
    throw new Error("Aylık değerlendirme haftalık plan zinciri mükerrer.");
  }
  const weeklyPlans = new Map(
    weeklyPlanIds.map((weeklyPlanId) => {
      const weekly = input.plans.find(
        (record) =>
          record.id === weeklyPlanId &&
          record.planType === "weekly" &&
          record.monthlyPlanId === input.monthly.id &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, input.scope),
      );
      if (!weekly) {
        throw new Error("Aylık değerlendirme haftalık plan zinciri eksik.");
      }
      return [weekly.id, weekly] as const;
    }),
  );
  const dailyPlans = new Map(
    input.plans
      .filter(
        (record) =>
          record.planType === "daily" &&
          record.sourceMonthlyPlanId === input.monthly.id &&
          typeof record.sourceWeeklyPlanId === "string" &&
          weeklyPlans.has(record.sourceWeeklyPlanId) &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, input.scope) &&
          isCivilDate(record.civilDate) &&
          record.civilDate >= periodStart &&
          record.civilDate <= periodEnd,
      )
      .map((record) => [record.id, record]),
  );
  const activitiesById = new Map(
    input.activities
      .filter(
        (record) =>
          typeof record.deletedAt !== "string" &&
          sameScope(record, input.scope),
      )
      .map((record) => [record.id, record]),
  );
  const linksByObservationId = new Map<string, StoredRecord[]>();
  input.links
    .filter(
      (record) =>
        typeof record.observationId === "string" &&
        record.confirmationMethod === "teacher-confirmed" &&
        typeof record.deletedAt !== "string" &&
        sameScope(record, input.scope),
    )
    .forEach((record) => {
      const group = linksByObservationId.get(record.observationId as string) ?? [];
      group.push(record);
      linksByObservationId.set(record.observationId as string, group);
    });

  return input.observations
    .filter(
      (record) =>
        record.rawTextImmutable === true &&
        typeof record.planId === "string" &&
        dailyPlans.has(record.planId) &&
        typeof record.deletedAt !== "string" &&
        sameScope(record, input.scope) &&
        isCivilDate(record.civilDate) &&
        record.civilDate >= periodStart &&
        record.civilDate <= periodEnd,
    )
    .map((observation): PremiumMonthlyReviewObservation => {
      const daily = dailyPlans.get(observation.planId as string);
      if (!daily || typeof daily.sourceWeeklyPlanId !== "string") {
        throw new Error("Aylık değerlendirme gözleminin günlük plan bağı eksik.");
      }
      const weekly = weeklyPlans.get(daily.sourceWeeklyPlanId);
      if (!weekly) {
        throw new Error("Aylık değerlendirme gözleminin haftalık plan bağı eksik.");
      }
      const activity = typeof observation.activityId === "string"
        ? activitiesById.get(observation.activityId)
        : undefined;
      const appliedTemplate =
        recordObject(activity?.appliedActivityTemplateSnapshot) ??
        recordObject(activity?.sourceActivityTemplateSnapshot);
      const environment =
        typeof appliedTemplate?.environment === "string" &&
        appliedTemplate.environment.trim()
          ? appliedTemplate.environment
          : typeof activity?.environment === "string" && activity.environment.trim()
            ? activity.environment
            : null;
      const curriculumLinks = (linksByObservationId.get(observation.id) ?? [])
        .map((link): PremiumMonthlyReviewCurriculumLink => ({
          id: requiredMonthlyUuid(link.id, "Öğretmen onaylı program bağı"),
          observationId: requiredMonthlyUuid(
            link.observationId,
            "Program bağı gözlemi",
          ),
          referenceCode: requiredMonthlyText(
            link.referenceCode,
            "Program referans kodu",
          ),
          referenceTitle: requiredMonthlyText(
            link.referenceTitle,
            "Program referans başlığı",
          ),
          confirmedAt: requiredMonthlyText(
            link.confirmedAt,
            "Program bağı onay zamanı",
          ),
        }))
        .sort((left, right) =>
          `${left.confirmedAt}|${left.id}`.localeCompare(
            `${right.confirmedAt}|${right.id}`,
          ),
        );
      const observedAt = requiredMonthlyText(
        observation.observedAt ?? observation.createdAt,
        "Aylık değerlendirme gözlem zamanı",
      );
      utcTimestampMillis(
        observedAt,
        `observations/${observation.id}/observedAt`,
      );
      return {
        id: requiredMonthlyUuid(observation.id, "Aylık değerlendirme gözlemi"),
        civilDate: observation.civilDate,
        observedAt,
        rawText: requiredMonthlyText(
          observation.rawText,
          "Aylık değerlendirme ham gözlemi",
        ),
        observationType:
          typeof observation.observationType === "string"
            ? observation.observationType
            : null,
        anecdotal: observation.observationType === "anecdotal",
        dailyPlanId: daily.id,
        weeklyPlanId: weekly.id,
        weekTitle: requiredMonthlyText(
          weekly.title,
          "Aylık değerlendirme hafta başlığı",
        ),
        activityTitle:
          typeof activity?.title === "string" && activity.title.trim()
            ? activity.title
            : "Etkinlik",
        environment,
        studentIds: Array.isArray(observation.studentIds)
          ? observation.studentIds.filter(
              (id): id is string => typeof id === "string" && UUID_PATTERN.test(id),
            )
          : [],
        curriculumLinks,
      };
    })
    .sort((left, right) =>
      `${left.observedAt}|${left.id}`.localeCompare(
        `${right.observedAt}|${right.id}`,
      ),
    );
}

function activeMonthlyRosterStudentIds(
  students: readonly StoredRecord[],
  scope: ActiveClassroomScope,
): string[] {
  return students
    .filter(
      (student) =>
        typeof student.deletedAt !== "string" &&
        student.enrollmentStatus !== "left" &&
        student.enrollmentStatus !== "completed" &&
        student.enrollmentStatus !== "transferred" &&
        sameScope(student, scope),
    )
    .map((student) => requiredMonthlyUuid(student.id, "Aktif sınıf çocuğu"))
    .sort((left, right) => left.localeCompare(right));
}

export async function recordPremiumMonthlyEvaluation(
  store: LocalDataStore,
  input: {
    monthlyPlanId: string;
    childEvidenceState: PremiumMonthlyChildEvidenceState;
    childNarrative?: string;
    observationIds?: readonly string[];
    curriculumLinkIds?: readonly string[];
    programCriteria: readonly PremiumMonthlyCriterionResponse<PremiumMonthlyProgramCriterionId>[];
    programNarrative: string;
    teacherCriteria: readonly PremiumMonthlyCriterionResponse<PremiumMonthlyTeacherCriterionId>[];
    teacherNarrative: string;
    nextMonthRecommendation: string;
    now?: Date;
  },
): Promise<PremiumMonthlyEvaluation> {
  const monthlyPlanId = requiredMonthlyUuid(
    input.monthlyPlanId,
    "Aylık değerlendirme planı",
  );
  if (
    input.childEvidenceState !== "sufficient-evidence" &&
    input.childEvidenceState !== "insufficient-evidence"
  ) {
    throw new Error("Çocuklar yönü için kanıt durumu açıkça seçilmelidir.");
  }
  const observationIds = uniqueMonthlyUuidArray(
    input.observationIds ?? [],
    "Aylık değerlendirme gözlemi",
  );
  const curriculumLinkIds = uniqueMonthlyUuidArray(
    input.curriculumLinkIds ?? [],
    "Aylık değerlendirme program bağı",
  );
  const childNarrative = optionalMonthlyNarrative(
    input.childNarrative ?? "",
    "Aylık çocuklar yönü öğretmen notu",
  );
  if (
    input.childEvidenceState === "sufficient-evidence" &&
    !childNarrative
  ) {
    throw new Error(
      "Yeterli kanıt seçildiğinde çocuklar yönü öğretmen notu boş bırakılamaz.",
    );
  }
  const programCriteria = normalizeMonthlyCriterionResponses(
    input.programCriteria,
    PREMIUM_MONTHLY_PROGRAM_CRITERIA,
    "Aylık program yönü",
  );
  const teacherCriteria = normalizeMonthlyCriterionResponses(
    input.teacherCriteria,
    PREMIUM_MONTHLY_TEACHER_CRITERIA,
    "Aylık öğretmen yönü",
  );
  const programNarrative = parseTeacherWeeklyValuesNarrative(
    input.programNarrative,
    "Aylık program yönü öğretmen değerlendirmesi",
  );
  const teacherNarrative = parseTeacherWeeklyValuesNarrative(
    input.teacherNarrative,
    "Aylık öğretmen yönü yansıtması",
  );
  const nextMonthRecommendation = parseTeacherWeeklyValuesNarrative(
    input.nextMonthRecommendation,
    "Sonraki ay önerisi",
  );
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Geçerli bir aylık değerlendirme zamanı gerekli.");
  }
  const timestamp = now.toISOString();
  let result: PremiumMonthlyEvaluation | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "students",
      "plans",
      "activities",
      "observations",
      "evidenceCurriculumLinks",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [students, plans, activities, observations, links] = await Promise.all([
        transaction.getAll("students"),
        transaction.getAll("plans"),
        transaction.getAll("activities"),
        transaction.getAll("observations"),
        transaction.getAll("evidenceCurriculumLinks"),
      ]);
      const monthly = plans.find(
        (record) =>
          record.id === monthlyPlanId &&
          record.planType === "monthly" &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (!monthly) {
        throw new Error("Değerlendirilecek aylık plan bulunamadı.");
      }
      const activeStudentIds = activeMonthlyRosterStudentIds(students, scope);
      const available = projectPremiumMonthlyReviewObservations({
        monthly,
        plans,
        activities,
        observations,
        links,
        scope,
      });
      const availableById = new Map(
        available.map((observation) => [observation.id, observation]),
      );
      const selected = observationIds.map((observationId) => {
        const observation = availableById.get(observationId);
        if (!observation) {
          throw new Error(
            "Aylık değerlendirme yalnız bu aylık planın tarih ve kaynak zincirindeki değişmez gözlemleri kullanabilir.",
          );
        }
        return observation;
      });
      const selectedLinkIdSet = new Set(curriculumLinkIds);
      const availableSelectedLinks = selected.flatMap((observation) =>
        observation.curriculumLinks,
      );
      const availableSelectedLinkIds = new Set(
        availableSelectedLinks.map((link) => link.id),
      );
      if (
        curriculumLinkIds.some((linkId) => !availableSelectedLinkIds.has(linkId))
      ) {
        throw new Error(
          "Seçilen program bağlarından biri seçili gözlemlere ait öğretmen onaylı bir bağ değildir.",
        );
      }
      const selectedWithLinks = selected.map((observation) => ({
        ...observation,
        curriculumLinks: observation.curriculumLinks.filter((link) =>
          selectedLinkIdSet.has(link.id),
        ),
      }));
      if (
        selectedWithLinks.some(
          (observation) => observation.curriculumLinks.length === 0,
        )
      ) {
        throw new Error(
          "Seçilen her aylık kanıt için en az bir öğretmen onaylı program bağlantısı seçilmelidir.",
        );
      }
      const coverage = summarizePremiumMonthlyEvidence(
        selectedWithLinks,
        activeStudentIds,
      );
      if (
        input.childEvidenceState === "sufficient-evidence" &&
        !premiumMonthlyEvidenceMeetsMinimum(coverage)
      ) {
        throw new Error(
          "Çocuklar yönü yeterli kanıt durumu için en az iki gözlem, iki farklı gün, iki farklı hafta ve aktif sınıftaki her çocuğun en az bir seçili gözlemde temsili gerekir; eksik çocuk varken tüm ay için yeterli hükmü kurulamaz.",
        );
      }
      const monthlyProfile = recordObject(monthly.curriculumProfileSnapshot);
      const linkRecordsById = new Map(links.map((link) => [link.id, link]));
      const selectedLinkRecords = curriculumLinkIds.map((linkId) => {
        const link = linkRecordsById.get(linkId);
        if (
          !link ||
          link.confirmationMethod !== "teacher-confirmed" ||
          typeof link.approvedByUserId !== "string" ||
          !UUID_PATTERN.test(link.approvedByUserId) ||
          !monthlyProfile ||
          link.framework !== monthlyProfile.framework ||
          link.catalogId !== monthlyProfile.catalogId ||
          link.sourceVersion !== monthlyProfile.sourceVersion
        ) {
          throw new Error(
            "Aylık değerlendirme program bağı planın doğrulanmış program profiliyle uyuşmuyor.",
          );
        }
        const confirmedAt = requiredMonthlyText(
          link.confirmedAt,
          `evidenceCurriculumLinks/${link.id}/confirmedAt`,
        );
        if (
          utcTimestampMillis(
            confirmedAt,
            `evidenceCurriculumLinks/${link.id}/confirmedAt`,
          ) > now.getTime()
        ) {
          throw new Error(
            "Aylık değerlendirme zamanı program bağı onay zamanından eski; işlem uygulanmadı.",
          );
        }
        return link;
      });
      const observationRecordsById = new Map(
        observations.map((observation) => [observation.id, observation]),
      );
      const selectedObservationRecords = observationIds.map((observationId) => {
        const observation = observationRecordsById.get(observationId);
        if (!observation) {
          throw new Error("Aylık değerlendirme kaynak gözlemi bulunamadı.");
        }
        const observedAt = requiredMonthlyText(
          observation.observedAt ?? observation.createdAt,
          `observations/${observation.id}/observedAt`,
        );
        if (
          utcTimestampMillis(
            observedAt,
            `observations/${observation.id}/observedAt`,
          ) > now.getTime()
        ) {
          throw new Error(
            "Aylık değerlendirme zamanı bağlı gözlemin gerçekleşme zamanından eski; işlem uygulanmadı.",
          );
        }
        parseTeacherWeeklyValuesNarrative(
          observation.rawText,
          "Aylık değerlendirmeye bağlı ham gözlem",
        );
        return observation;
      });
      const previous = Array.isArray(monthly.monthlyEvaluations)
        ? monthly.monthlyEvaluations.map((evaluation, index) =>
            parsePremiumMonthlyEvaluation(
              evaluation,
              `Aylık değerlendirme ${index + 1}`,
            ),
          )
        : [];
      if (
        previous.some(
          (evaluation) =>
            evaluation.monthlyPlanId !== monthly.id ||
            evaluation.periodStart !== monthly.periodStart ||
            evaluation.periodEnd !== monthly.periodEnd,
        )
      ) {
        throw new Error("Aylık değerlendirme geçmişi plan dönemiyle uyuşmuyor.");
      }
      assertMutationChronology(
        now,
        [
          { label: `plans/${monthly.id}`, record: monthly },
          ...selectedObservationRecords.map((record) => ({
            label: `observations/${record.id}`,
            record,
          })),
          ...selectedLinkRecords.map((record) => ({
            label: `evidenceCurriculumLinks/${record.id}`,
            record,
          })),
        ],
        "Aylık değerlendirme",
      );
      const evaluation = parsePremiumMonthlyEvaluation({
        id: crypto.randomUUID(),
        monthlyPlanId: monthly.id,
        periodStart: monthly.periodStart,
        periodEnd: monthly.periodEnd,
        children: {
          evidenceState: input.childEvidenceState,
          narrative: childNarrative,
          observationIds,
          curriculumLinkIds,
          coverage,
        },
        program: {
          narrative: programNarrative,
          criteria: programCriteria,
        },
        teacher: {
          narrative: teacherNarrative,
          criteria: teacherCriteria,
        },
        nextMonthRecommendation,
        teacherAuthored: true,
        mebProvenance: structuredClone(
          PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE,
        ),
        createdAt: timestamp,
      });
      await transaction.putMany("plans", [
        {
          ...monthly,
          status: "evaluated",
          monthlyEvaluations: [
            ...previous.map((item) => structuredClone(item)),
            structuredClone(evaluation),
          ],
          updatedAt: timestamp,
        },
      ]);
      result = evaluation;
    },
  );
  if (!result) throw new Error("Aylık değerlendirme kaydedilemedi.");
  return result;
}

export async function loadPremiumMonthlyReviewContext(
  store: LocalDataStore,
  monthlyPlanId: string,
): Promise<PremiumMonthlyReviewContext> {
  const validatedMonthlyPlanId = requiredMonthlyUuid(
    monthlyPlanId,
    "Aylık değerlendirme planı",
  );
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    throw new Error("Aylık değerlendirme için etkin sınıf gereklidir.");
  }
  const monthly = snapshot.plans.find(
    (record) =>
      record.id === validatedMonthlyPlanId &&
      record.planType === "monthly" &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!monthly) {
    throw new Error("Değerlendirilecek aylık plan bulunamadı.");
  }
  const observations = projectPremiumMonthlyReviewObservations({
    monthly,
    plans: snapshot.plans,
    activities: snapshot.activities,
    observations: snapshot.observations,
    links: snapshot.evidenceCurriculumLinks,
    scope,
  });
  const activeStudentIds = activeMonthlyRosterStudentIds(
    snapshot.students,
    scope,
  );
  const studentsById = new Map(
    snapshot.students.map((student) => [student.id, student]),
  );
  const evaluations = Array.isArray(monthly.monthlyEvaluations)
    ? monthly.monthlyEvaluations.map((evaluation, index) => {
        const parsed = parsePremiumMonthlyEvaluation(
          evaluation,
          `Aylık değerlendirme ${index + 1}`,
        );
        if (
          parsed.monthlyPlanId !== monthly.id ||
          parsed.periodStart !== monthly.periodStart ||
          parsed.periodEnd !== monthly.periodEnd
        ) {
          throw new Error("Aylık değerlendirme geçmişi plan dönemiyle uyuşmuyor.");
        }
        return parsed;
      })
    : [];
  for (let index = 1; index < evaluations.length; index += 1) {
    if (evaluations[index]!.createdAt < evaluations[index - 1]!.createdAt) {
      throw new Error("Aylık değerlendirme geçmişi kronolojik değil.");
    }
  }
  return {
    monthlyPlanId: monthly.id,
    title: requiredMonthlyText(monthly.title, "Aylık plan başlığı"),
    periodStart: requiredMonthlyText(monthly.periodStart, "Aylık plan başlangıcı"),
    periodEnd: requiredMonthlyText(monthly.periodEnd, "Aylık plan bitişi"),
    activeStudentIds,
    activeStudents: activeStudentIds.map((id) => {
      const student = studentsById.get(id);
      return {
        id,
        displayName:
          typeof student?.displayName === "string" && student.displayName.trim()
            ? student.displayName
            : null,
      };
    }),
    observations,
    availableCoverage: summarizePremiumMonthlyEvidence(
      observations,
      activeStudentIds,
    ),
    evaluations,
  };
}
