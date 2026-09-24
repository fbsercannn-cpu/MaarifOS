import { canonicalJson } from "../../core/backup/canonical-json.ts";
import type { CurriculumTargetSnapshot } from "../curriculum/curriculum-catalog.ts";
import {
  TYMM_2024_DOMAINS,
  type Tymm2024Domain,
} from "../curriculum/tymm-2024-catalog.ts";
import type { EvidenceActivitySummary } from "./evidence-workspace.ts";
import { developmentObservationGraphReference } from "./development-observation-graph-references.ts";
import {
  getDevelopmentObservationPresets,
  resolveDevelopmentObservationProgramMapping,
  type DevelopmentObservationPreset,
} from "./development-observation-presets.ts";

export type DevelopmentObservationActivityContext = Pick<
  EvidenceActivitySummary,
  | "id"
  | "title"
  | "contextKind"
  | "curriculumProfile"
  | "curriculumTargets"
  | "observationDomainHint"
>;

function validatedObservationDomainHint(
  activityContext?: DevelopmentObservationActivityContext,
): Tymm2024Domain | null {
  const value = activityContext?.observationDomainHint;
  return activityContext?.contextKind === "planned-activity" &&
    typeof value === "string" &&
    (TYMM_2024_DOMAINS as readonly string[]).includes(value)
    ? (value as Tymm2024Domain)
    : null;
}

function matchesCanonicalTarget(
  candidate: CurriculumTargetSnapshot,
  preset: DevelopmentObservationPreset,
): boolean {
  try {
    if (candidate.id !== preset.curriculumReference.targetId) return false;
    const { holisticGraphReference, ...target } = candidate;
    const canonical = resolveDevelopmentObservationProgramMapping(
      preset.id,
      preset.ageBand,
    ).target;
    if (canonicalJson(target) !== canonicalJson(canonical)) return false;
    return holisticGraphReference === undefined || canonicalJson(holisticGraphReference) ===
      canonicalJson(developmentObservationGraphReference(preset.ageBand, preset.curriculumReference.code));
  } catch {
    return false;
  }
}

/**
 * Only the activity's exact, source-checked learning outcomes can place an
 * authored example first. Titles, category similarity, child taps and drawing
 * counts are not curriculum evidence. This read model never selects or writes.
 */
export function getActivityContextObservationPresets(
  ageBand: string | null | undefined,
  activityContext?: DevelopmentObservationActivityContext,
): readonly DevelopmentObservationPreset[] {
  const presets = getDevelopmentObservationPresets(ageBand);
  if (
    presets.length === 0 ||
    activityContext?.contextKind !== "planned-activity" ||
    typeof activityContext.id !== "string" ||
    !activityContext.id.trim() ||
    !Array.isArray(activityContext.curriculumTargets)
  ) return [];

  const profile = resolveDevelopmentObservationProgramMapping(presets[0].id, presets[0].ageBand).profile;
  try {
    if (canonicalJson(activityContext.curriculumProfile) !== canonicalJson(profile)) return [];
  } catch {
    return [];
  }

  const matches: DevelopmentObservationPreset[] = [];
  // Activity order, then authored catalogue order, is deterministic and does
  // not imply priority, ability or a developmental ranking of the child.
  for (const target of activityContext.curriculumTargets) {
    for (const preset of presets) {
      if (
        !matches.some((match) => match.id === preset.id) &&
        matchesCanonicalTarget(target, preset)
      ) {
        matches.push(preset);
        if (matches.length === 3) return matches;
      }
    }
  }
  return matches;
}

/**
 * Chooses only which general example library is initially visible. A domain
 * hint is not an official outcome and never creates a curriculum target.
 */
export function resolveActivityContextObservationDomain(
  ageBand: string | null | undefined,
  activityContext?: DevelopmentObservationActivityContext,
): Tymm2024Domain {
  return (
    getActivityContextObservationPresets(ageBand, activityContext)[0]?.domain ??
    validatedObservationDomainHint(activityContext) ??
    "Türkçe"
  );
}
