import type { StoredRecord } from "./model.ts";
import {
  isDevelopmentObservationSelection,
  type DevelopmentObservationSelection,
} from "../../features/evidence/development-observation-presets.ts";
import {
  OBSERVATION_CATEGORIES_V1,
  OBSERVATION_CATEGORIES_V2,
  OBSERVATION_TAXONOMY_VERSION_V1,
  inferLegacyObservationTaxonomyVersion,
  isObservationCategory,
  isObservationCategoryForVersion,
  isObservationTaxonomyVersion,
  normalizeObservationCategories,
  type ObservationCategory,
  type ObservationTaxonomyVersion,
} from "./observation-taxonomy.ts";

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

/** Mevcut arayüz/yedek sözleşmesi için değişmez v1 kodları. */
export const QUICK_OBSERVATION_CATEGORIES = OBSERVATION_CATEGORIES_V1;
export const QUICK_OBSERVATION_CATEGORIES_V2 = OBSERVATION_CATEGORIES_V2;
export type QuickObservationCategory = ObservationCategory;

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
  observationTaxonomyVersion?: ObservationTaxonomyVersion;
  developmentSelection?: DevelopmentObservationSelection;
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
  return isObservationCategory(value);
}

export function normalizeQuickObservationCategories(
  values: readonly QuickObservationCategory[],
  taxonomyVersion: ObservationTaxonomyVersion =
    OBSERVATION_TAXONOMY_VERSION_V1,
): QuickObservationCategory[] {
  return normalizeObservationCategories(taxonomyVersion, values);
}

export function isQuickObservationDraftRecord(
  record: StoredRecord,
): record is QuickObservationDraft {
  const categoryIds = Array.isArray(record.categoryIds)
    ? record.categoryIds
    : [];
  let taxonomyVersion: ObservationTaxonomyVersion;
  if (record.observationTaxonomyVersion === undefined) {
    try {
      taxonomyVersion = inferLegacyObservationTaxonomyVersion(categoryIds);
    } catch {
      return false;
    }
  } else if (isObservationTaxonomyVersion(record.observationTaxonomyVersion)) {
    taxonomyVersion = record.observationTaxonomyVersion;
  } else {
    return false;
  }
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
    (record.developmentSelection === undefined ||
      isDevelopmentObservationSelection(record.developmentSelection)) &&
    Array.isArray(record.categoryIds) &&
    record.categoryIds.every((value) =>
      isObservationCategoryForVersion(taxonomyVersion, value),
    ) &&
    new Set(record.categoryIds).size === record.categoryIds.length
  );
}
