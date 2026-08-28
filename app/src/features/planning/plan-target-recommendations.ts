import type { CurriculumTargetSnapshot } from "../curriculum/curriculum-catalog.ts";
import type {
  PreschoolActivityArea,
  PreschoolActivitySuggestion,
} from "./activity-suggestions.ts";

const ACTIVITY_TARGET_DOMAINS: Record<
  Exclude<PreschoolActivityArea, "all">,
  readonly string[]
> = {
  mathematics: ["Matematik"],
  science: ["Fen"],
  "language-literacy": ["Türkçe"],
  "values-social": ["Sosyal"],
  "movement-health": ["Hareket ve Sağlık"],
  "art-music": ["Sanat", "Müzik"],
  "play-drama": ["Türkçe", "Sosyal", "Sanat"],
  outdoor: ["Fen", "Hareket ve Sağlık"],
};

type SemanticTargetConcept = {
  id: string;
  label: string;
  activitySignals: readonly string[];
  targetSignals: readonly string[];
};

const SEMANTIC_TARGET_CONCEPTS: readonly SemanticTargetConcept[] = [
  {
    id: "observe",
    label: "gözlem ve veri toplama",
    activitySignals: ["gözlem", "incele", "izle", "kaydet", "fark et"],
    targetSignals: ["gözlem", "incele", "izle", "veri", "kanıt"],
  },
  {
    id: "predict",
    label: "tahmin yürütme",
    activitySignals: ["tahmin", "öngör", "ne olur"],
    targetSignals: ["tahmin", "çıkarım", "öngör"],
  },
  {
    id: "experiment",
    label: "deneme ve problem çözme",
    activitySignals: ["dene", "deney", "çöz", "tasarla", "kurtar", "sorun"],
    targetSignals: ["deney", "çöz", "sorgula", "model", "strateji", "problem"],
  },
  {
    id: "compare",
    label: "karşılaştırma ve sınıflandırma",
    activitySignals: ["karşılaştır", "sınıflandır", "gruplandır", "benzer", "farklı"],
    targetSignals: ["karşılaştır", "sınıflandır", "benzer", "farklı", "çözümle"],
  },
  {
    id: "quantity",
    label: "sayı ve miktar ilişkisi",
    activitySignals: ["say", "sayı", "miktar", "adet", "eşit", "paylaştır"],
    targetSignals: ["say", "sayı", "miktar", "nicelik", "matematik"],
  },
  {
    id: "measure",
    label: "ölçme ve özellikleri karşılaştırma",
    activitySignals: ["ölç", "uzunluk", "kapasite", "ağırlık", "denge", "derinlik"],
    targetSignals: ["ölç", "özellik", "karşılaştır", "matematik", "veri"],
  },
  {
    id: "space",
    label: "konum, yön ve harita",
    activitySignals: ["konum", "yön", "harita", "rota", "kroki", "yakın", "uzak"],
    targetSignals: ["konum", "yön", "harita", "kroki", "mekân", "coğraf"],
  },
  {
    id: "sequence",
    label: "sıralama ve zaman ilişkisi",
    activitySignals: ["sırala", "önce", "sonra", "zaman", "günlük", "hikâye"],
    targetSignals: ["sırala", "zaman", "kronolojik", "anlat", "öykü", "hikâye"],
  },
  {
    id: "communicate",
    label: "dinleme ve kendini ifade etme",
    activitySignals: ["anlat", "konuş", "dinle", "soru", "ileti", "sözcük", "hikâye"],
    targetSignals: ["anlat", "konuş", "dinle", "soru", "ifade", "sözcük", "görüş"],
  },
  {
    id: "sound",
    label: "ses ve ritim farkındalığı",
    activitySignals: ["ses", "ritim", "müzik", "çalgı", "uyak", "hece"],
    targetSignals: ["ses", "ritim", "müzik", "çalgı", "hece", "işitsel"],
  },
  {
    id: "movement",
    label: "hareket ve beden farkındalığı",
    activitySignals: ["hareket", "denge", "beden", "parkur", "dans", "nefes"],
    targetSignals: ["hareket", "denge", "beden", "dans", "zindelik", "fiziksel"],
  },
  {
    id: "health",
    label: "sağlık, öz bakım ve güvenlik",
    activitySignals: ["sağlık", "temiz", "besin", "güven", "koru", "el", "su"],
    targetSignals: ["sağlık", "temiz", "beslen", "güven", "koru", "sıvı"],
  },
  {
    id: "social",
    label: "iş birliği ve adil paylaşım",
    activitySignals: ["birlikte", "iş birliği", "paylaş", "adil", "sıra", "yardım", "ortak"],
    targetSignals: ["birlikte", "sosyal", "paylaş", "adil", "grup", "toplum", "iletişim"],
  },
  {
    id: "emotion",
    label: "duygu ve ihtiyaçları ifade etme",
    activitySignals: ["duygu", "empati", "ihtiyaç", "nezaket", "barış", "merhamet"],
    targetSignals: ["duygu", "empati", "ihtiyaç", "ifade", "sosyal", "değer"],
  },
  {
    id: "art",
    label: "özgün görsel ve sanatsal ifade",
    activitySignals: ["çiz", "boya", "renk", "doku", "heykel", "sanat", "görsel"],
    targetSignals: ["çiz", "renk", "sanat", "görsel", "özgün", "ifade", "tasarla"],
  },
  {
    id: "nature",
    label: "doğa ve yakın çevreyi inceleme",
    activitySignals: ["doğa", "bahçe", "ağaç", "toprak", "canlı", "hava", "yağmur"],
    targetSignals: ["doğa", "çevre", "canlı", "coğraf", "fen", "gözlem"],
  },
] as const;

const SEMANTIC_STOP_WORDS = new Set([
  "acaba",
  "ardından",
  "birlikte",
  "bunun",
  "cocuklar",
  "cocuklarin",
  "dair",
  "etkinlik",
  "farkli",
  "gore",
  "icin",
  "iliskin",
  "kadar",
  "kendi",
  "olarak",
  "olan",
  "oldugu",
  "uzerinden",
  "yonelik",
]);

function foldTurkish(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ş", "s")
    .replaceAll("ü", "u")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function semanticStem(value: string): string {
  const folded = foldTurkish(value);
  return folded.length > 6 ? folded.slice(0, 6) : folded;
}

function semanticTokens(value: string): string[] {
  return foldTurkish(value)
    .split(/\s+/u)
    .filter((token) => token.length >= 3 && !SEMANTIC_STOP_WORDS.has(token));
}

function textMatchesSignal(text: string, signal: string): boolean {
  const textTokens = semanticTokens(text);
  const signalTokens = semanticTokens(signal);
  return signalTokens.length > 0 && signalTokens.every((signalToken) => {
    const signalStem = semanticStem(signalToken);
    return textTokens.some((textToken) => {
      const textStem = semanticStem(textToken);
      return textStem === signalStem ||
        (textStem.length >= 4 && signalStem.length >= 4 &&
          (textStem.startsWith(signalStem) || signalStem.startsWith(textStem)));
    });
  });
}

function matchingConcepts(
  activityText: string,
  targetText: string,
): SemanticTargetConcept[] {
  return SEMANTIC_TARGET_CONCEPTS.filter(
    (concept) =>
      concept.activitySignals.some((signal) => textMatchesSignal(activityText, signal)) &&
      concept.targetSignals.some((signal) => textMatchesSignal(targetText, signal)),
  );
}

export interface PlanTargetRecommendation {
  target: CurriculumTargetSnapshot;
  score: number;
  reason: string;
  matchedConceptIds: string[];
}

/**
 * Yalnız en az bir açık alan, sözcük veya kavram kanıtı bulunan hedefleri döndürür.
 * Yaşa uygun olmak tek başına pedagojik öneri kanıtı değildir.
 */
export function rankPlanTargetRecommendations(input: {
  targets: readonly CurriculumTargetSnapshot[];
  activityTitle: string;
  activitySuggestion?: PreschoolActivitySuggestion;
  semanticNotes?: readonly string[];
  limit?: number;
}): PlanTargetRecommendation[] {
  const preferredDomains = input.activitySuggestion
    ? ACTIVITY_TARGET_DOMAINS[input.activitySuggestion.area]
    : [];
  const activityText = [
    input.activityTitle,
    input.activitySuggestion?.teacherPrompt,
    ...(input.semanticNotes ?? []),
  ].filter((value): value is string => Boolean(value?.trim())).join(" ");
  const activityTokenStems = new Set(
    semanticTokens(activityText).map(semanticStem),
  );

  return input.targets
    .map((target, sourceIndex): PlanTargetRecommendation & { sourceIndex: number } => {
      const targetText = `${target.domain} ${target.referenceTitle}`;
      const targetTokenStems = new Set(semanticTokens(targetText).map(semanticStem));
      const directOverlap = [...activityTokenStems].filter((stem) =>
        targetTokenStems.has(stem)
      ).length;
      const concepts = matchingConcepts(activityText, targetText);
      const domainIndex = preferredDomains.indexOf(target.domain);
      const domainScore = domainIndex < 0
        ? 0
        : Math.max(12, 36 - domainIndex * 8);
      const score = domainScore + Math.min(directOverlap, 4) * 5 + concepts.length * 24;
      const conceptLabels = concepts.slice(0, 2).map((concept) => concept.label);
      const reason = conceptLabels.length > 0 && domainIndex >= 0
        ? `${target.domain} alanı ile ${conceptLabels.join(" ve ")} odağı eşleşiyor.`
        : conceptLabels.length > 0
          ? `Etkinliğin ${conceptLabels.join(" ve ")} odağıyla eşleşiyor.`
          : directOverlap > 0 && domainIndex >= 0
            ? `${target.domain} alanı ve etkinlik amacıyla ortak ifadeler taşıyor.`
            : domainIndex >= 0
              ? `Etkinliğin ${target.domain} alanıyla doğrudan ilişkili.`
              : "Etkinlik adı veya öğretmen amacıyla ortak ifadeler taşıyor.";
      return {
        target,
        score,
        reason,
        matchedConceptIds: concepts.map((concept) => concept.id),
        sourceIndex,
      };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.sourceIndex - right.sourceIndex ||
        left.target.referenceCode.localeCompare(right.target.referenceCode, "tr-TR"),
    )
    .slice(0, input.limit ?? 4)
    .map(({ sourceIndex: _sourceIndex, ...recommendation }) => recommendation);
}
