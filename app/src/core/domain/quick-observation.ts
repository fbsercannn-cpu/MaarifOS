import type { StoredRecord } from "./model.ts";

export const QUICK_OBSERVATION_DRAFT_SETTING_TYPE =
  "quick-observation-draft" as const;
export const QUICK_OBSERVATION_DRAFT_SCHEMA_VERSION = 1 as const;

export const QUICK_OBSERVATION_TYPES = [
  "quick-note",
  "child-quote",
  "anecdotal",
  "systematic",
] as const;

export type QuickObservationType = (typeof QUICK_OBSERVATION_TYPES)[number];

export const QUICK_OBSERVATION_CATEGORIES = [
  "language-communication",
  "cognitive",
  "social-emotional-values",
  "physical-health",
  "self-care",
  "art-creativity",
  "play-participation",
  "other",
] as const;

export type QuickObservationCategory =
  (typeof QUICK_OBSERVATION_CATEGORIES)[number];

export const QUICK_OBSERVATION_NEUTRAL_TEMPLATES = [
  {
    id: "during-activity-did",
    text: "Etkinlik sırasında … yaptı.",
  },
  {
    id: "when-encountered-said",
    text: "… ile karşılaştığında … söyledi.",
  },
  {
    id: "peer-interaction",
    text: "Akranıyla etkileşim sırasında … yaptı / söyledi.",
  },
  {
    id: "continued-by",
    text: "Çalışmasını … yaparak sürdürdü.",
  },
] as const;

export interface QuickObservationDraft extends StoredRecord {
  settingType: typeof QUICK_OBSERVATION_DRAFT_SETTING_TYPE;
  studentId: string;
  classroomId: string;
  academicYearId: string;
  planId: string;
  activityId: string;
  rawText: string;
  context: string;
  childQuote: string;
  observationType: QuickObservationType;
  categoryIds: QuickObservationCategory[];
  schemaVersion: typeof QUICK_OBSERVATION_DRAFT_SCHEMA_VERSION;
}

export function isQuickObservationType(
  value: unknown,
): value is QuickObservationType {
  return QUICK_OBSERVATION_TYPES.includes(value as QuickObservationType);
}

export function isQuickObservationCategory(
  value: unknown,
): value is QuickObservationCategory {
  return QUICK_OBSERVATION_CATEGORIES.includes(
    value as QuickObservationCategory,
  );
}

export function normalizeQuickObservationCategories(
  values: readonly QuickObservationCategory[],
): QuickObservationCategory[] {
  if (!values.every(isQuickObservationCategory)) {
    throw new Error("Hızlı gözlem kategorilerinden biri geçersiz.");
  }
  return [...new Set(values)];
}

export function isQuickObservationDraftRecord(
  record: StoredRecord,
): record is QuickObservationDraft {
  return (
    record.settingType === QUICK_OBSERVATION_DRAFT_SETTING_TYPE &&
    record.schemaVersion === QUICK_OBSERVATION_DRAFT_SCHEMA_VERSION &&
    typeof record.studentId === "string" &&
    typeof record.classroomId === "string" &&
    typeof record.academicYearId === "string" &&
    typeof record.planId === "string" &&
    typeof record.activityId === "string" &&
    typeof record.rawText === "string" &&
    typeof record.context === "string" &&
    typeof record.childQuote === "string" &&
    isQuickObservationType(record.observationType) &&
    Array.isArray(record.categoryIds) &&
    record.categoryIds.every(isQuickObservationCategory) &&
    new Set(record.categoryIds).size === record.categoryIds.length
  );
}
