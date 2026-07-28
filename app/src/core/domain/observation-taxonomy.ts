/**
 * Öğretmenin ham kanıtlarını bulmasına yarayan nötr düzenleme sözlüğü.
 * TYMM/EÇE hedefi, kazanımı, değerlendirme düzeyi veya gelişim hükmü değildir.
 */
export const OBSERVATION_TAXONOMY_VERSION_V1 =
  "maarifos-observation-v1" as const;
export const OBSERVATION_TAXONOMY_VERSION_V2 =
  "maarifos-observation-v2" as const;
export const CURRENT_OBSERVATION_TAXONOMY_VERSION =
  OBSERVATION_TAXONOMY_VERSION_V2;

export const OBSERVATION_CATEGORIES_V1 = [
  "language-communication",
  "cognitive",
  "social-emotional-values",
  "physical-health",
  "self-care",
  "art-creativity",
  "play-participation",
  "other",
] as const;

export const OBSERVATION_CATEGORIES_V2 = [
  "language-communication",
  "cognitive-learning",
  "social-emotional",
  "values-dispositions-participation",
  "physical-motor-health",
  "self-care-daily-life",
  "art-creativity",
  "play-participation",
  "interest-attention-curiosity",
  "other",
] as const;

export type ObservationTaxonomyVersion =
  | typeof OBSERVATION_TAXONOMY_VERSION_V1
  | typeof OBSERVATION_TAXONOMY_VERSION_V2;
export type ObservationCategoryV1 = (typeof OBSERVATION_CATEGORIES_V1)[number];
export type ObservationCategoryV2 = (typeof OBSERVATION_CATEGORIES_V2)[number];
export type ObservationCategory =
  | ObservationCategoryV1
  | ObservationCategoryV2;

export interface ObservationTaxonomyDefinition {
  version: ObservationTaxonomyVersion;
  purpose: "neutral-teacher-organization";
  curriculumFramework: null;
  categories: readonly ObservationCategory[];
}

export const OBSERVATION_TAXONOMIES: Readonly<
  Record<ObservationTaxonomyVersion, ObservationTaxonomyDefinition>
> = {
  [OBSERVATION_TAXONOMY_VERSION_V1]: {
    version: OBSERVATION_TAXONOMY_VERSION_V1,
    purpose: "neutral-teacher-organization",
    curriculumFramework: null,
    categories: OBSERVATION_CATEGORIES_V1,
  },
  [OBSERVATION_TAXONOMY_VERSION_V2]: {
    version: OBSERVATION_TAXONOMY_VERSION_V2,
    purpose: "neutral-teacher-organization",
    curriculumFramework: null,
    categories: OBSERVATION_CATEGORIES_V2,
  },
};

export function isObservationTaxonomyVersion(
  value: unknown,
): value is ObservationTaxonomyVersion {
  return (
    value === OBSERVATION_TAXONOMY_VERSION_V1 ||
    value === OBSERVATION_TAXONOMY_VERSION_V2
  );
}

export function isObservationCategory(
  value: unknown,
): value is ObservationCategory {
  return (
    OBSERVATION_CATEGORIES_V1.includes(value as ObservationCategoryV1) ||
    OBSERVATION_CATEGORIES_V2.includes(value as ObservationCategoryV2)
  );
}

export function isObservationCategoryForVersion(
  version: ObservationTaxonomyVersion,
  value: unknown,
): value is ObservationCategory {
  return OBSERVATION_TAXONOMIES[version].categories.includes(
    value as ObservationCategory,
  );
}

export function normalizeObservationCategories(
  version: ObservationTaxonomyVersion,
  values: readonly ObservationCategory[],
): ObservationCategory[] {
  if (!values.every((value) => isObservationCategoryForVersion(version, value))) {
    throw new Error(
      "Gözlem kategorilerinden biri seçilen taksonomi sürümüyle uyuşmuyor.",
    );
  }
  return [...new Set(values)];
}

/**
 * Sürüm etiketi bulunmayan mevcut kayıtları güvenli biçimde v1 kabul eder.
 * Semantik olarak benzer v1/v2 kodları arasında otomatik eşleme veya çıkarım yapmaz.
 */
export function inferLegacyObservationTaxonomyVersion(
  values: readonly unknown[],
): ObservationTaxonomyVersion {
  if (
    values.every((value) =>
      isObservationCategoryForVersion(OBSERVATION_TAXONOMY_VERSION_V1, value),
    )
  ) {
    return OBSERVATION_TAXONOMY_VERSION_V1;
  }
  throw new Error(
    "Sürüm etiketi bulunmayan gözlem kategorileri v1 sözleşmesine ait değil.",
  );
}
