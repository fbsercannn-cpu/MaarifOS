import type {
  PedagogicalPlanProvenance,
  PedagogicalPlanValueTrace,
} from "../../core/domain/pedagogical-plan-provenance.ts";
import {
  PEDAGOGICAL_PLAN_PROVENANCE_SCHEMA_VERSION,
  PEDAGOGICAL_PLAN_SOURCE_KIND,
  assertPedagogicalPlanProvenance,
} from "../../core/domain/pedagogical-plan-provenance.ts";
import type {
  ActivityStudioAgeBand,
  ActivityStudioItem,
} from "../activity-studio/activity-studio-model.ts";
import {
  createActivityContextAdaptation,
  type ParticipationRouteId,
  type PedagogicalScenarioId,
} from "./pedagogical-orchestrator.ts";

const VALUE_BY_CATEGORY = {
  oyun: "adalet ve sıra gözetme",
  cizim: "nezaket ve emeğe saygı",
  boyama: "özen ve sorumluluk",
  "kes-yapistir": "emanet ve güvenli çalışma",
  hareket: "yardımlaşma ve alan açma",
  "acik-hava": "doğaya emanet bilinci",
  materyal: "israf etmeme ve ortak kaynağı koruma",
} as const;

function createValueTrace(
  activity: ActivityStudioItem,
): PedagogicalPlanValueTrace {
  const value = VALUE_BY_CATEGORY[activity.category];
  return Object.freeze({
    value,
    action: `${activity.title} sırasında ortak alanı, malzemeyi ve katılım sırasını gözetme seçeneği sunun.`,
    evidence: activity.observationPrompt,
    reflection: `${value} hakkında çocuğu etiketlemeden, ortamın hangi davranışı kolaylaştırdığını öğretmen notuyla düşünün.`,
    nextPlan: "İşe yarayan ortam koşulunu sonraki planda koruyun; katılımı zorlaştıran koşulu öğretmen kararıyla değiştirin.",
  });
}

export function createPedagogicalPlanBridge(input: {
  activity: ActivityStudioItem;
  civilDate: string;
  ageBand: ActivityStudioAgeBand;
  scenarioId: PedagogicalScenarioId;
  participationRouteId: ParticipationRouteId;
  now?: Date;
}): PedagogicalPlanProvenance {
  const adaptation = createActivityContextAdaptation(input);
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Pedagojik plan kaynağı için geçerli kayıt zamanı gerekli.");
  }
  const provenance: PedagogicalPlanProvenance = {
    schemaVersion: PEDAGOGICAL_PLAN_PROVENANCE_SCHEMA_VERSION,
    sourceKind: PEDAGOGICAL_PLAN_SOURCE_KIND,
    sourceActivityId: input.activity.id,
    officialMebActivity: input.activity.officialMebActivity,
    civilDate: input.civilDate,
    ageBand: input.ageBand,
    scenarioId: input.scenarioId,
    participationRouteId: input.participationRouteId,
    adaptation: Object.freeze({
      setup: adaptation.setup,
      materialSwap: adaptation.materialSwap,
      facilitation: adaptation.facilitation,
      evidencePrompt: adaptation.evidencePrompt,
      familyBridge: adaptation.familyBridge,
      safetyCheck: adaptation.safetyCheck,
    }),
    valueTrace: createValueTrace(input.activity),
    capturedAt: now.toISOString(),
  };
  assertPedagogicalPlanProvenance(provenance);
  return Object.freeze(provenance);
}
