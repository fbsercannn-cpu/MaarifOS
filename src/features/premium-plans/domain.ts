import type { CurriculumTargetSnapshot } from "../curriculum/curriculum-catalog.ts";
import type { CurriculumProfileSnapshot } from "../evidence/evidence-flow.ts";
import type { ActivityValueMapping } from "../values/value-plan-models.ts";
import type { CulturalContext } from "../values/value-plan-contracts.ts";
import type { ValuesReviewRole } from "../values/values-constitution.ts";

export const PREMIUM_PLAN_SKUS = ["TYMM-6072"] as const;
export type PremiumPlanSku = (typeof PREMIUM_PLAN_SKUS)[number];

export const PREMIUM_PLAN_LENS_IDS = [
  "guided-play",
  "nature-outdoor",
  "atelier-documentation",
  "prepared-environment",
  "plan-act-reflect",
  "belonging-family-weave",
  "three-phase-project",
  "play-nature-connectedness",
  "rhythm-story-natural-material",
  "loose-parts",
  "managed-challenge",
  "scientific-inquiry",
  "integrated-early-stem",
  "design-make-improve",
  "multiple-access-expression",
  "accessible-participation",
  "emotion-relationship-coregulation",
  "music-movement-improvisation",
  "song-listening-local-melody",
  "embodied-rhythm",
  "story-drama-enactment",
  "local-culture-community",
  "movement-balance-physical-literacy",
  "interactive-reading-emergent-literacy",
] as const;

export type PremiumPlanLensId = (typeof PREMIUM_PLAN_LENS_IDS)[number];
export type PremiumLensSelectionMode = "preference_only";
export type EvidenceGrade = "A" | "A-B" | "B" | "B-C" | "C";

export interface PremiumLensPreferenceSnapshot {
  teacherPreferredLensId: PremiumPlanLensId;
  teacherPreferredSupportingLensIds: readonly PremiumPlanLensId[];
  lensSelectionMode: PremiumLensSelectionMode;
}

export function parsePremiumLensPreferenceRecord(
  record: Record<string, unknown>,
  label = "Premium plan",
): PremiumLensPreferenceSnapshot {
  const hasNewFields =
    record.teacherPreferredLensId !== undefined ||
    record.teacherPreferredSupportingLensIds !== undefined ||
    record.lensSelectionMode !== undefined;
  const hasLegacyFields =
    record.primaryLensId !== undefined || record.supportingLensIds !== undefined;
  if (hasNewFields === hasLegacyFields) {
    throw new Error(
      `${label} öğretmen yaklaşım tercihini eksik veya çift kaynaklı taşıyor.`,
    );
  }

  const preferredLensId = hasNewFields
    ? record.teacherPreferredLensId
    : record.primaryLensId;
  const supportingLensIds = hasNewFields
    ? record.teacherPreferredSupportingLensIds
    : record.supportingLensIds;
  if (
    (hasNewFields && record.lensSelectionMode !== "preference_only") ||
    (!hasNewFields && record.lensSelectionMode !== undefined) ||
    typeof preferredLensId !== "string" ||
    !PREMIUM_PLAN_LENS_IDS.includes(preferredLensId as PremiumPlanLensId) ||
    !Array.isArray(supportingLensIds) ||
    supportingLensIds.length > 2 ||
    !supportingLensIds.every(
      (lensId): lensId is PremiumPlanLensId =>
        typeof lensId === "string" &&
        PREMIUM_PLAN_LENS_IDS.includes(lensId as PremiumPlanLensId),
    ) ||
    new Set([preferredLensId, ...supportingLensIds]).size !==
      supportingLensIds.length + 1
  ) {
    throw new Error(`${label} öğretmen yaklaşım tercihi geçersiz.`);
  }

  return Object.freeze({
    teacherPreferredLensId: preferredLensId as PremiumPlanLensId,
    teacherPreferredSupportingLensIds: Object.freeze([...supportingLensIds]),
    lensSelectionMode: "preference_only" as const,
  });
}

export function samePremiumLensPreference(
  left: PremiumLensPreferenceSnapshot,
  right: PremiumLensPreferenceSnapshot,
): boolean {
  return (
    left.teacherPreferredLensId === right.teacherPreferredLensId &&
    left.lensSelectionMode === right.lensSelectionMode &&
    left.teacherPreferredSupportingLensIds.length ===
      right.teacherPreferredSupportingLensIds.length &&
    left.teacherPreferredSupportingLensIds.every(
      (lensId, index) =>
        lensId === right.teacherPreferredSupportingLensIds[index],
    )
  );
}

export interface PremiumPlanLens {
  id: PremiumPlanLensId;
  displayName: string;
  shortDescription: string;
  evidenceGrade: EvidenceGrade;
  inspiration: string;
}

export type PremiumValuesMappingStatus =
  | "legacy-unmapped"
  | "machine_validated_pending_human_review";

export interface PremiumValuesContractSnapshot {
  constitutionId: "maarifos-values-pedagogy-constitution";
  constitutionVersion: string;
  constitutionSchemaVersion: 1;
  officialActionCatalogId: "meb-tymm-okul-oncesi-2024-ede-ek14";
  officialActionCatalogSourceVersion: string;
  officialActionCatalogSourceSha256: `sha256:${string}`;
  mappingSchemaVersion: "1.0.0";
  status: "machine_validated_pending_human_review";
  requiredHumanReviewRoles: readonly ValuesReviewRole[];
}

export interface PremiumActivityEditorialReview {
  status: "machine_validated_pending_human_review";
  machineValidatedAtUtc: string;
  machineValidatorId: "maarifos-values-codec-v1";
  humanReviewRequired: true;
  note: string;
}

export interface PremiumActivityValueDesign {
  id: string;
  version: "1.0.0";
  mapping: ActivityValueMapping;
  culturalContexts: readonly CulturalContext[];
  editorialReview: PremiumActivityEditorialReview;
}

export interface PremiumActivityTemplate {
  id: string;
  weekId: string;
  activityRole: "main" | "alternative";
  recommendedCivilDate: string;
  flowSlot:
    | "learning-centers"
    | "first-main"
    | "outdoor-movement"
    | "second-main"
    | "small-group";
  title: string;
  shortDescription: string;
  durationMinutes: number;
  environment: "indoor" | "outdoor" | "both" | "community";
  primaryLensId: PremiumPlanLensId;
  supportingLensIds: readonly PremiumPlanLensId[];
  curriculumTargetCodes: readonly string[];
  materials: readonly string[];
  lowCostAlternatives: readonly string[];
  preparation: readonly string[];
  opening: string;
  processSteps: readonly string[];
  adultPrompts: readonly string[];
  childAgencyPoints: readonly string[];
  observationPrompts: readonly string[];
  evidenceOptions: readonly string[];
  familyCommunityConnection: string;
  differentiation: readonly string[];
  safetyNotes: readonly string[];
  indoorEquivalent: string;
  transitionSupport: string;
  reflectionPrompt: string;
  /** V2 paketleri geriye dönük olarak null ve açıkça legacy-unmapped kalır. */
  valuesDesign: PremiumActivityValueDesign | null;
}

export interface PremiumPlanWeek {
  id: string;
  title: string;
  dateRange: string;
  periodStart: string;
  periodEnd: string;
  purpose: string;
  inquiryQuestion: string;
  activityIds: readonly string[];
  mainActivityIds: readonly string[];
  alternativeActivityId: string;
  observationFocus: readonly string[];
  familyParticipation: string;
}

export interface PremiumFullDayFlowBlock {
  id: string;
  title: string;
  purpose: string;
  flexibilityNote: string;
}

export interface PremiumMonthlyPlan {
  monthKey: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  purpose: string;
  childQuestions: readonly string[];
  materialSummary: readonly string[];
  lowCostMaterialSummary: readonly string[];
  routines: readonly string[];
  transitions: readonly string[];
  familyParticipationPrinciple: string;
  teacherReflectionPrompts: readonly string[];
}

export interface PremiumAnnualMonth {
  monthKey: string;
  title: string;
  purpose: string;
  releaseStatus: "ready" | "internal-review-ready" | "planned-release";
}

export interface PremiumContentPack {
  id: string;
  version: string;
  contentReleaseId: string;
  manifestDigest: string;
  sku: PremiumPlanSku;
  displayName: string;
  program: "tymm_2024";
  ageProfile: "60-72";
  academicRelease: "2026-2027";
  catalogId: string;
  catalogSourceVersion: string;
  sourceUrl: string;
  sourceCheckedOn: string;
  rightsStatus: "original-and-source-linked";
  status: "internal_pilot";
  accessMode: "staff-code";
  valuesMappingStatus: PremiumValuesMappingStatus;
  valuesContract: PremiumValuesContractSnapshot | null;
  lenses: readonly PremiumPlanLens[];
  annualMonths: readonly PremiumAnnualMonth[];
  monthlyPlan: PremiumMonthlyPlan;
  fullDayFlow: readonly PremiumFullDayFlowBlock[];
  weeks: readonly PremiumPlanWeek[];
  activities: readonly PremiumActivityTemplate[];
}

export interface PremiumContentPackSnapshot {
  id: string;
  version: string;
  contentReleaseId: string;
  manifestDigest: string;
  sku: PremiumPlanSku;
  displayName: string;
  academicRelease: string;
  ageProfile: "60-72";
  sourceUrl: string;
  sourceCheckedOn: string;
  valuesMappingStatus: PremiumValuesMappingStatus;
  valuesContract: PremiumValuesContractSnapshot | null;
}

export interface PremiumDailyTemplateSelection {
  contentPack: PremiumContentPackSnapshot;
  activityTemplateId: string;
  planTitle: string;
  activityTitle: string;
  targetCodes: readonly string[];
  teacherPreferredLensId: PremiumPlanLensId;
  teacherPreferredSupportingLensIds: readonly PremiumPlanLensId[];
  lensSelectionMode: PremiumLensSelectionMode;
  annualPlanId: string;
  monthlyPlanId: string;
  weeklyPlanId: string;
  activitySnapshot: PremiumActivityTemplate;
  alternativeActivitySnapshot: PremiumActivityTemplate;
  weekSnapshot: PremiumPlanWeek;
  fullDayFlow: readonly PremiumFullDayFlowBlock[];
}

export interface PremiumDailyFlowBlockSnapshot extends PremiumFullDayFlowBlock {
  selectedActivityTemplateIds: readonly string[];
  alternativeActivityTemplateIds: readonly string[];
  appliedActivityTemplateIds: readonly string[];
  status: "planned" | "optional" | "skipped";
  durationMinutes: number;
  transitionNote: string;
  teacherNote: string;
}

export interface PremiumDailyFlowBlockDraft {
  id: PremiumFullDayFlowBlock["id"];
  status: "planned" | "optional" | "skipped";
  durationMinutes: number;
  transitionNote: string;
  teacherNote: string;
}

export interface PremiumDailyFlowSnapshot {
  sourceWeekId: string;
  planCivilDate: string;
  selectedActivityTemplateId: string;
  alternativeActivityTemplateId: string;
  activatedAlternativeTemplateId: string | null;
  alternativeReplacement: {
    activatedAlternativeTemplateId: string;
    replacesMainActivityTemplateId: string;
    teacherConfirmed: true;
  } | null;
  blocks: readonly PremiumDailyFlowBlockSnapshot[];
}

export interface PremiumPlanBoardResult {
  annualPlanId: string;
  monthlyPlanId: string;
  weeklyPlanIds: readonly { weekId: string; planId: string }[];
  created: boolean;
}

export interface PremiumPlanBoardContext {
  curriculumProfile: CurriculumProfileSnapshot;
  curriculumTargets: readonly CurriculumTargetSnapshot[];
}

export function premiumContentPackSnapshot(
  pack: PremiumContentPack,
): PremiumContentPackSnapshot {
  return Object.freeze({
    id: pack.id,
    version: pack.version,
    contentReleaseId: pack.contentReleaseId,
    manifestDigest: pack.manifestDigest,
    sku: pack.sku,
    displayName: pack.displayName,
    academicRelease: pack.academicRelease,
    ageProfile: pack.ageProfile,
    sourceUrl: pack.sourceUrl,
    sourceCheckedOn: pack.sourceCheckedOn,
    valuesMappingStatus: pack.valuesMappingStatus,
    valuesContract: pack.valuesContract === null
      ? null
      : structuredClone(pack.valuesContract),
  });
}

export function premiumDailyTemplateSelection(
  pack: PremiumContentPack,
  activity: PremiumActivityTemplate,
  lineage: {
    annualPlanId: string;
    monthlyPlanId: string;
    weeklyPlanId: string;
    teacherPreferredLensId: PremiumPlanLensId;
    teacherPreferredSupportingLensIds: readonly PremiumPlanLensId[];
  },
): PremiumDailyTemplateSelection {
  const week = pack.weeks.find((candidate) => candidate.id === activity.weekId);
  const alternativeActivity = pack.activities.find(
    (candidate) => candidate.id === week?.alternativeActivityId,
  );
  if (!week || !alternativeActivity) {
    throw new Error("Premium etkinliğin haftalık alternatif kaydı bulunmuyor.");
  }
  if (
    activity.activityRole !== "main" ||
    alternativeActivity.activityRole !== "alternative" ||
    activity.id === alternativeActivity.id
  ) {
    throw new Error("Tam gün planı bir ana etkinlik ve ondan farklı bir alternatif aday taşımalıdır.");
  }
  return {
    contentPack: premiumContentPackSnapshot(pack),
    activityTemplateId: activity.id,
    planTitle: `${activity.title} planı`,
    activityTitle: activity.title,
    targetCodes: [...activity.curriculumTargetCodes],
    teacherPreferredLensId: lineage.teacherPreferredLensId,
    teacherPreferredSupportingLensIds: [
      ...lineage.teacherPreferredSupportingLensIds,
    ],
    lensSelectionMode: "preference_only",
    annualPlanId: lineage.annualPlanId,
    monthlyPlanId: lineage.monthlyPlanId,
    weeklyPlanId: lineage.weeklyPlanId,
    activitySnapshot: structuredClone(activity),
    alternativeActivitySnapshot: structuredClone(alternativeActivity),
    weekSnapshot: structuredClone(week),
    fullDayFlow: structuredClone(pack.fullDayFlow),
  };
}

export function premiumDailyFlowSnapshot(
  selection: PremiumDailyTemplateSelection,
  planCivilDate: string,
  teacherDraft?: readonly PremiumDailyFlowBlockDraft[],
  activateAlternative = false,
): PremiumDailyFlowSnapshot {
  const selected = selection.activitySnapshot;
  const alternative = selection.alternativeActivitySnapshot;
  if (selected.id === alternative.id) {
    throw new Error("Uygulanan ana etkinlik ile alternatif aday aynı olamaz.");
  }
  const draft = teacherDraft ?? createPremiumDailyFlowDraft(selection.fullDayFlow);
  const appliedActivity = activateAlternative ? alternative : selected;
  if (
    draft.length !== selection.fullDayFlow.length ||
    draft.some((block, index) => block.id !== selection.fullDayFlow[index]?.id)
  ) {
    throw new Error("Tam gün akış düzeni 10 kaynak blokla aynı sırayı korumalıdır.");
  }
  return {
    sourceWeekId: selected.weekId,
    planCivilDate,
    selectedActivityTemplateId: selected.id,
    alternativeActivityTemplateId: alternative.id,
    activatedAlternativeTemplateId: activateAlternative ? alternative.id : null,
    alternativeReplacement: activateAlternative
      ? {
          activatedAlternativeTemplateId: alternative.id,
          replacesMainActivityTemplateId: selected.id,
          teacherConfirmed: true,
        }
      : null,
    blocks: selection.fullDayFlow.map((block, index) => {
      const teacherBlock = draft[index];
      if (
        !teacherBlock ||
        !["planned", "optional", "skipped"].includes(teacherBlock.status) ||
        !Number.isInteger(teacherBlock.durationMinutes) ||
        teacherBlock.durationMinutes < 5 ||
        teacherBlock.durationMinutes > 240 ||
        typeof teacherBlock.transitionNote !== "string" ||
        teacherBlock.transitionNote.length > 500 ||
        typeof teacherBlock.teacherNote !== "string" ||
        teacherBlock.teacherNote.length > 1_000
      ) {
        throw new Error(`Tam gün akışındaki ${block.title} düzenlemesi geçersiz.`);
      }
      const selectedIds = selected.flowSlot === block.id ? [selected.id] : [];
      const appliedIds = appliedActivity.flowSlot === block.id
        ? [appliedActivity.id]
        : [];
      return {
        ...structuredClone(block),
        selectedActivityTemplateIds: selectedIds,
        alternativeActivityTemplateIds:
          alternative.flowSlot === block.id ? [alternative.id] : [],
        appliedActivityTemplateIds:
          teacherBlock.status === "skipped" ? [] : appliedIds,
        status: teacherBlock.status,
        durationMinutes: teacherBlock.durationMinutes,
        transitionNote: teacherBlock.transitionNote.trim(),
        teacherNote: teacherBlock.teacherNote.trim(),
      };
    }),
  };
}

export function createPremiumDailyFlowDraft(
  source: readonly PremiumFullDayFlowBlock[],
): PremiumDailyFlowBlockDraft[] {
  return source.map((block) => ({
    id: block.id,
    status: "planned",
    durationMinutes: 30,
    transitionNote: "",
    teacherNote: "",
  }));
}
