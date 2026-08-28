import {
  ACTIVITY_STUDIO_ITEMS,
  type ActivityStudioAgeBand,
} from "../activity-studio/activity-studio-model.ts";
import { ACTIVITY_YEAR_MONTH_LENSES } from "../activity-studio/activity-year-program.ts";

export const TYMM_HUMAN_REVIEW_STATUS = "pending-human-review" as const;

export interface ActivityAgeMappingReviewItem {
  readonly reviewItemId: string;
  readonly activityId: string;
  readonly ageBand: ActivityStudioAgeBand;
  readonly contentOrigin: "MaarifOS-original";
  readonly officialMebActivity: false;
  readonly activityTitle: string;
  readonly tymmDomains: readonly string[];
  readonly ageAdaptation: string;
  readonly differentiation: string;
  readonly evidencePrompt: string;
  readonly familyBridge: string;
  /** İnsan uzmanların dolduracağı exact bütüncül eşleme; boşken üretimde kullanılamaz. */
  readonly mapping: null;
  readonly reviewStatus: typeof TYMM_HUMAN_REVIEW_STATUS;
  readonly independentPreschoolExpertApprovals: readonly [];
}
export interface AgeMonthPackageReviewItem {
  readonly reviewItemId: string;
  readonly ageBand: ActivityStudioAgeBand;
  readonly month: 1 | 2 | 3 | 4 | 5 | 6 | 9 | 10 | 11 | 12;
  readonly monthLabel: string;
  readonly teacherIntent: string;
  readonly familyBridge: string;
  readonly packageMapping: null;
  readonly reviewStatus: typeof TYMM_HUMAN_REVIEW_STATUS;
  readonly independentPreschoolExpertApprovals: readonly [];
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (Array.isArray(value)) {
    value.forEach((item) => deepFreeze(item));
    return Object.freeze(value);
  }
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach((item) => deepFreeze(item));
    return Object.freeze(value);
  }
  return value;
}

export const ACTIVITY_AGE_MAPPING_REVIEW_QUEUE = deepFreeze(
  ACTIVITY_STUDIO_ITEMS.flatMap((activity) =>
    activity.ageBands.map(
      (ageBand): ActivityAgeMappingReviewItem => ({
        reviewItemId: `${activity.id}:${ageBand}`,
        activityId: activity.id,
        ageBand,
        contentOrigin: activity.contentOrigin,
        officialMebActivity: activity.officialMebActivity,
        activityTitle: activity.title,
        tymmDomains: [...activity.tymmDomains],
        ageAdaptation: activity.ageAdaptations[ageBand] ?? "",
        differentiation: activity.inclusionNote,
        evidencePrompt: activity.observationPrompt,
        familyBridge: activity.familyExtension,
        mapping: null,
        reviewStatus: TYMM_HUMAN_REVIEW_STATUS,
        independentPreschoolExpertApprovals: [],
      }),
    ),
  ),
);

const AGE_BANDS: readonly ActivityStudioAgeBand[] = [
  "36-48",
  "48-60",
  "60-72",
];

export const AGE_MONTH_PACKAGE_REVIEW_QUEUE = deepFreeze(
  AGE_BANDS.flatMap((ageBand) =>
    ACTIVITY_YEAR_MONTH_LENSES.map(
      (lens): AgeMonthPackageReviewItem => ({
        reviewItemId: `${ageBand}:${String(lens.month).padStart(2, "0")}`,
        ageBand,
        month: lens.month,
        monthLabel: lens.label,
        teacherIntent: lens.teacherIntent,
        familyBridge: lens.familyBridge,
        packageMapping: null,
        reviewStatus: TYMM_HUMAN_REVIEW_STATUS,
        independentPreschoolExpertApprovals: [],
      }),
    ),
  ),
);

export function assertTymmHumanReviewQueueCoverage(): void {
  const expectedActivityAgeKeys = ACTIVITY_STUDIO_ITEMS.flatMap((activity) =>
    activity.ageBands.map((ageBand) => `${activity.id}:${ageBand}`),
  );
  const actualActivityAgeKeys = ACTIVITY_AGE_MAPPING_REVIEW_QUEUE.map(
    (item) => item.reviewItemId,
  );
  if (
    actualActivityAgeKeys.length !== 357 ||
    new Set(actualActivityAgeKeys).size !== actualActivityAgeKeys.length ||
    expectedActivityAgeKeys.some((key) => !actualActivityAgeKeys.includes(key))
  ) {
    throw new Error(
      "TYMM etkinlik×yaş insan inceleme kuyruğu 357/357 kapsamı taşımıyor.",
    );
  }
  const packageKeys = AGE_MONTH_PACKAGE_REVIEW_QUEUE.map(
    (item) => item.reviewItemId,
  );
  if (packageKeys.length !== 30 || new Set(packageKeys).size !== 30) {
    throw new Error(
      "TYMM yaş×ay insan inceleme kuyruğu 30/30 kapsamı taşımıyor.",
    );
  }
  const allPending = [
    ...ACTIVITY_AGE_MAPPING_REVIEW_QUEUE,
    ...AGE_MONTH_PACKAGE_REVIEW_QUEUE,
  ].every(
    (item) =>
      item.reviewStatus === TYMM_HUMAN_REVIEW_STATUS &&
      item.independentPreschoolExpertApprovals.length === 0,
  );
  if (!allPending) {
    throw new Error("İnsan uzman onayı bulunmayan TYMM kaydı onaylanmış gösterilemez.");
  }
}
