import { isCivilDate } from "./attendance.ts";

export const PEDAGOGICAL_PLAN_PROVENANCE_SCHEMA_VERSION = 1 as const;
export const PEDAGOGICAL_PLAN_SOURCE_KIND =
  "maarifos-original-activity-studio" as const;

export const PEDAGOGICAL_PLAN_AGE_BANDS = [
  "36-48",
  "48-60",
  "60-72",
] as const;

export const PEDAGOGICAL_PLAN_SCENARIO_IDS = [
  "balanced",
  "indoor-rain",
  "low-energy",
  "high-energy",
  "no-material",
  "small-group",
  "sensory-calm",
] as const;

export const PEDAGOGICAL_PLAN_PARTICIPATION_ROUTE_IDS = [
  "multiple",
  "verbal",
  "movement",
  "visual",
] as const;

export interface PedagogicalPlanAdaptationSnapshot {
  readonly setup: string;
  readonly materialSwap: string;
  readonly facilitation: string;
  readonly evidencePrompt: string;
  readonly familyBridge: string;
  readonly safetyCheck: string;
}

export interface PedagogicalPlanValueTrace {
  readonly value: string;
  readonly action: string;
  readonly evidence: string;
  readonly reflection: string;
  readonly nextPlan: string;
}

export interface PedagogicalPlanProvenance {
  readonly schemaVersion: typeof PEDAGOGICAL_PLAN_PROVENANCE_SCHEMA_VERSION;
  readonly sourceKind: typeof PEDAGOGICAL_PLAN_SOURCE_KIND;
  readonly sourceActivityId: string;
  readonly officialMebActivity: false;
  readonly civilDate: string;
  readonly ageBand: (typeof PEDAGOGICAL_PLAN_AGE_BANDS)[number];
  readonly scenarioId: (typeof PEDAGOGICAL_PLAN_SCENARIO_IDS)[number];
  readonly participationRouteId:
    (typeof PEDAGOGICAL_PLAN_PARTICIPATION_ROUTE_IDS)[number];
  readonly adaptation: PedagogicalPlanAdaptationSnapshot;
  readonly valueTrace: PedagogicalPlanValueTrace;
  readonly capturedAt: string;
}

const SOURCE_ACTIVITY_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,127}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const canonical = [...expected].sort();
  return actual.length === canonical.length &&
    actual.every((key, index) => key === canonical[index]);
}

function isBoundedText(value: unknown, maximum = 2_000): value is string {
  return typeof value === "string" &&
    value.trim() === value &&
    value.length > 0 &&
    value.length <= maximum;
}

function isCanonicalUtc(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isAdaptation(
  value: unknown,
): value is PedagogicalPlanAdaptationSnapshot {
  return isRecord(value) &&
    hasExactKeys(value, [
      "setup",
      "materialSwap",
      "facilitation",
      "evidencePrompt",
      "familyBridge",
      "safetyCheck",
    ]) &&
    Object.values(value).every((item) => isBoundedText(item));
}

function isValueTrace(value: unknown): value is PedagogicalPlanValueTrace {
  return isRecord(value) &&
    hasExactKeys(value, [
      "value",
      "action",
      "evidence",
      "reflection",
      "nextPlan",
    ]) &&
    Object.values(value).every((item) => isBoundedText(item));
}

export function isPedagogicalPlanProvenance(
  value: unknown,
): value is PedagogicalPlanProvenance {
  return isRecord(value) &&
    hasExactKeys(value, [
      "schemaVersion",
      "sourceKind",
      "sourceActivityId",
      "officialMebActivity",
      "civilDate",
      "ageBand",
      "scenarioId",
      "participationRouteId",
      "adaptation",
      "valueTrace",
      "capturedAt",
    ]) &&
    value.schemaVersion === PEDAGOGICAL_PLAN_PROVENANCE_SCHEMA_VERSION &&
    value.sourceKind === PEDAGOGICAL_PLAN_SOURCE_KIND &&
    typeof value.sourceActivityId === "string" &&
    SOURCE_ACTIVITY_ID_PATTERN.test(value.sourceActivityId) &&
    value.officialMebActivity === false &&
    typeof value.civilDate === "string" &&
    isCivilDate(value.civilDate) &&
    PEDAGOGICAL_PLAN_AGE_BANDS.includes(
      value.ageBand as PedagogicalPlanProvenance["ageBand"],
    ) &&
    PEDAGOGICAL_PLAN_SCENARIO_IDS.includes(
      value.scenarioId as PedagogicalPlanProvenance["scenarioId"],
    ) &&
    PEDAGOGICAL_PLAN_PARTICIPATION_ROUTE_IDS.includes(
      value.participationRouteId as PedagogicalPlanProvenance["participationRouteId"],
    ) &&
    isAdaptation(value.adaptation) &&
    isValueTrace(value.valueTrace) &&
    isCanonicalUtc(value.capturedAt);
}

export function assertPedagogicalPlanProvenance(
  value: unknown,
  label = "Pedagojik plan kaynağı",
): asserts value is PedagogicalPlanProvenance {
  if (!isPedagogicalPlanProvenance(value)) {
    throw new Error(`${label} geçersiz veya değiştirilmiş.`);
  }
}

/**
 * Etkinlik Atölyesi bağlamını öğretmenin son seçtiği plan gününe bağlar.
 * Kaynak etkinlik, uyarlama ve değer izi değişmez; yalnız plan gününün tek
 * otoritesi olan civilDate yeniden yazılır.
 */
export function bindPedagogicalPlanProvenanceToCivilDate(
  provenance: PedagogicalPlanProvenance,
  civilDate: string,
): PedagogicalPlanProvenance {
  assertPedagogicalPlanProvenance(provenance);
  const bound: PedagogicalPlanProvenance = {
    ...provenance,
    civilDate,
  };
  assertPedagogicalPlanProvenance(bound);
  return Object.freeze(bound);
}
