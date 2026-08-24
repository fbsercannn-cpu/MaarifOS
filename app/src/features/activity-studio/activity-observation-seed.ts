import type { QuickObservationCategory } from "../evidence/quick-observation.ts";
import type { ActivityDrawingPadEvidence } from "./drawing-pad-model.ts";
import type {
  ActivityStudioAgeBand,
  ActivityStudioChildChoice,
  ActivityStudioChildSession,
  ActivityStudioItem,
} from "./activity-studio-model.ts";
import {
  PARTICIPATION_ROUTES,
  PEDAGOGICAL_SCENARIOS,
  type ParticipationRouteId,
  type PedagogicalScenarioId,
} from "../pedagogical-os/pedagogical-orchestrator.ts";

export interface ActivityStudioObservationSeedInput {
  readonly activity: ActivityStudioItem;
  readonly ageBand: ActivityStudioAgeBand;
  readonly ageLabel: string;
  readonly session: ActivityStudioChildSession;
  readonly choice: ActivityStudioChildChoice | null;
  readonly drawingEvidence: ActivityDrawingPadEvidence | null;
  readonly scenarioId?: PedagogicalScenarioId;
  readonly participationRouteId?: ParticipationRouteId;
}

export interface ActivityStudioObservationSeed {
  readonly rawText: string;
  readonly context: string;
  readonly childQuote: "";
  readonly observationType: "quick-note";
  readonly categoryIds: QuickObservationCategory[];
}

function observationCategoryFor(
  activity: ActivityStudioItem,
): QuickObservationCategory {
  if (activity.category === "oyun") return "play-participation";
  if (activity.category === "hareket") return "physical-motor-health";
  if (activity.category === "acik-hava") return "interest-attention-curiosity";
  return "art-creativity";
}

export function createActivityStudioObservationSeed(
  input: ActivityStudioObservationSeedInput,
): ActivityStudioObservationSeed {
  const observedLines: string[] = [];
  const contextLines = [
    `Etkinlik ve Materyal Stüdyosu · ${input.activity.title} · ${input.ageLabel}`,
  ];
  const scenario = PEDAGOGICAL_SCENARIOS.find(
    (item) => item.id === input.scenarioId,
  );
  const participationRoute = PARTICIPATION_ROUTES.find(
    (item) => item.id === input.participationRouteId,
  );

  if (scenario || participationRoute) {
    contextLines.push(
      `Uygulama bağlamı: ${scenario?.label ?? "Dengeli sınıf akışı"} · ${participationRoute?.label ?? "Çoklu katılım"}`,
    );
  }

  if (input.choice) {
    observedLines.push(
      `Gözetimli çocuk ekranında “${input.choice.label}” seçeneğine dokunuldu. Bu ifade yalnız ekrandaki seçimi aktarır; öğretmen gözlediği olayı düzenleyip doğrulamalıdır.`,
    );
    contextLines.push(
      `Çocuk ekranı seçimi: ${input.choice.label} (${input.choice.id})`,
    );
  }

  const drawing = input.drawingEvidence;
  if (drawing && drawing.strokeCount > 0) {
    const drawingLabel = drawing.mode === "coloring" ? "boyama" : "çizim";
    observedLines.push(
      `Çocuk Modundaki ${drawingLabel} alanında ${drawing.strokeCount} çizgi oluşturuldu. Çizgi sayısı içerik veya gelişim değerlendirmesi değildir; öğretmen gördüğü çalışmayı düzenleyip doğrulamalıdır.`,
    );
    contextLines.push(
      drawing.downloadedFileName
        ? `Çizim kanıtı: Görsel gözleme otomatik eklenmedi; öğretmen PNG'yi bu cihazda “${drawing.downloadedFileName}” adıyla indirdi.`
        : "Çizim kanıtı: Görsel gözleme otomatik eklenmedi; öğretmen isterse Çocuk Modundaki PNG indir düğmesiyle ayrı kanıt olarak saklayabilir.",
    );
  }

  if (observedLines.length === 0) {
    observedLines.push(
      "Bu etkinlik için düzenlenebilir gözlem taslağı açıldı. Öğretmen yalnız doğrudan gözlediği olayı yazıp doğrulamalıdır.",
    );
  }

  return {
    rawText: observedLines.join("\n\n"),
    context: contextLines.join("\n"),
    childQuote: "",
    observationType: "quick-note",
    categoryIds: [observationCategoryFor(input.activity)],
  };
}
