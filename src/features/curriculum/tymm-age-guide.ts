import {
  TYMM_2024_AGE_BANDS,
  TYMM_2024_CATALOG_METADATA,
  TYMM_2024_DOMAINS,
  TYMM_2024_LEARNING_OUTCOMES,
  type Tymm2024AgeBand,
  type Tymm2024Domain,
} from "./tymm-2024-catalog.ts";

export interface TymmAgeGuideDomainCount {
  readonly domain: Tymm2024Domain;
  readonly learningOutcomeCount: number;
}

export interface TymmAgeGuideOfficialProvenance {
  readonly authority: "T.C. Millî Eğitim Bakanlığı";
  readonly materialKind: "official-program";
  readonly catalogId: string;
  readonly catalogVersion: string;
  readonly sourceVersion: string;
  readonly sourceDocumentTitle: string;
  readonly sourceFileName: string;
  readonly sourceUrl: string;
  readonly sourceSha256: `sha256:${string}`;
  readonly catalogContentSha256: `sha256:${string}`;
  readonly sourceCheckedOn: string;
  readonly matrixPageRange: readonly [number, number];
  readonly ageBandSourcePages: readonly number[];
  readonly completeScope: string;
}

export interface TymmAgeGuideChoice {
  readonly id: string;
  readonly label: string;
}

export interface TymmAgeGuideChoiceTemplate {
  readonly id: string;
  readonly title: string;
  readonly childPrompt: string;
  readonly choices: readonly [
    TymmAgeGuideChoice,
    TymmAgeGuideChoice,
    TymmAgeGuideChoice,
  ];
  readonly adultFacilitation: string;
  readonly reflectionPrompt: string;
}

export interface TymmAgeGuideInteractionPolicy {
  readonly mode: "adult-supervised-large-choice";
  readonly contentOrigin: "MaarifOS-original";
  readonly officialMebActivity: false;
  readonly assessmentUse: false;
  readonly diagnosticUse: false;
  readonly minimumTouchTargetPx: 56;
  readonly allowSkip: true;
  readonly allowChange: true;
  readonly notice: string;
}

export interface TymmAgeGuideReadModel {
  readonly ageBand: Tymm2024AgeBand;
  readonly ageLabel: string;
  readonly developmentalUseNote: string;
  readonly domainOutcomeCounts: readonly TymmAgeGuideDomainCount[];
  readonly totalLearningOutcomeCount: number;
  readonly officialProvenance: TymmAgeGuideOfficialProvenance;
  readonly interactionPolicy: TymmAgeGuideInteractionPolicy;
  readonly choiceTemplates: readonly [
    TymmAgeGuideChoiceTemplate,
    TymmAgeGuideChoiceTemplate,
    TymmAgeGuideChoiceTemplate,
  ];
}

interface TymmAgeGuideEditorialContent {
  readonly ageLabel: string;
  readonly developmentalUseNote: string;
  readonly choiceTemplates: readonly [
    TymmAgeGuideChoiceTemplate,
    TymmAgeGuideChoiceTemplate,
    TymmAgeGuideChoiceTemplate,
  ];
}

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

const INTERACTION_NOTICE =
  "Bu şablonlar MaarifOS tarafından kolaylaştırma amacıyla yazılmıştır; resmî MEB etkinliği veya değerlendirme aracı değildir. Çocuğun seçimi puanlanmaz, kişilik ya da gelişim etiketi ve tanı için kullanılmaz.";

const INTERACTION_POLICY: TymmAgeGuideInteractionPolicy = {
  mode: "adult-supervised-large-choice",
  contentOrigin: "MaarifOS-original",
  officialMebActivity: false,
  assessmentUse: false,
  diagnosticUse: false,
  minimumTouchTargetPx: 56,
  allowSkip: true,
  allowChange: true,
  notice: INTERACTION_NOTICE,
};

const AGE_GUIDE_EDITORIAL = {
  "36-48": {
    ageLabel: "36–48 ay",
    developmentalUseNote:
      "Somut görselleri aynı anda üç belirgin seçenekle sunun; kısa cümle kullanın, çocuğun dokunma, işaret etme, söyleme veya pas geçme yolunu kabul edin.",
    choiceTemplates: [
      {
        id: "36-48-story-friend",
        title: "Bir yol arkadaşı seç",
        childPrompt: "Hikâyeye kiminle başlayalım?",
        choices: [
          { id: "36-48-story-bird", label: "Meraklı kuş" },
          { id: "36-48-story-cat", label: "Yumuşak adımlı kedi" },
          { id: "36-48-story-fish", label: "Suda gezen balık" },
        ],
        adultFacilitation:
          "Seçenekleri tek tek gösterip okuyun. Çocuk dokunabilir, işaret edebilir ya da söyleyebilir; yanıt vermemeyi de kabul edin.",
        reflectionPrompt: "Seçtiğin arkadaş önce ne yapsın?",
      },
      {
        id: "36-48-movement-way",
        title: "Nasıl hareket edelim?",
        childPrompt: "Şimdi hangi hareketi birlikte deneyelim?",
        choices: [
          { id: "36-48-movement-walk", label: "Yavaş yürüyelim" },
          { id: "36-48-movement-arms", label: "Kollarımızı açalım" },
          { id: "36-48-movement-sway", label: "Yerimizde sallanalım" },
        ],
        adultFacilitation:
          "Hareketi önce siz modelleyin. Çocuğun beden sınırına göre oturarak, küçük bir hareketle ya da yalnız izleyerek katılmasını kabul edin.",
        reflectionPrompt: "Hareketi hızlı mı, yavaş mı sürdürmek istersin?",
      },
      {
        id: "36-48-sound-choice",
        title: "Bir ses seç",
        childPrompt: "Hangi sesi birlikte canlandıralım?",
        choices: [
          { id: "36-48-sound-rain", label: "Yağmur tıpırtısı" },
          { id: "36-48-sound-wind", label: "Rüzgâr uğultusu" },
          { id: "36-48-sound-drum", label: "Minik davul ritmi" },
        ],
        adultFacilitation:
          "Her seçeneği kısa bir örnekle duyurun, sonra sessizce bekleyin. Çocuğun kendi sesini veya hareketini eklemesine alan açın.",
        reflectionPrompt: "Bu ses sana neyi hatırlattı?",
      },
    ],
  },
  "48-60": {
    ageLabel: "48–60 ay",
    developmentalUseNote:
      "Üç belirgin seçeneği karşılaştırması ve isterse seçim gerekçesini kendi sözüyle paylaşması için bekleme süresi bırakın; fikrini değiştirebilir.",
    choiceTemplates: [
      {
        id: "48-60-story-route",
        title: "Hikâyenin yolunu seç",
        childPrompt: "Kahraman yoluna nereden devam etsin?",
        choices: [
          { id: "48-60-route-bridge", label: "Köprünün üzerinden" },
          { id: "48-60-route-stones", label: "Taşların yanından" },
          { id: "48-60-route-trees", label: "Ağaçların arasından" },
        ],
        adultFacilitation:
          "Yolları görsel veya nesnelerle gösterin. Seçimin nedenini sormayı teklif edin; çocuk yalnız seçmek isterse açıklama beklemeyin.",
        reflectionPrompt: "Bu yolda kahramanın karşısına ne çıkabilir?",
      },
      {
        id: "48-60-design-material",
        title: "Birlikte tasarla",
        childPrompt: "Yapacağımız küçük tasarımda önce hangisini kullanalım?",
        choices: [
          { id: "48-60-material-paper", label: "Kâğıt parçaları" },
          { id: "48-60-material-thread", label: "Renkli ipler" },
          { id: "48-60-material-nature", label: "Doğal malzemeler" },
        ],
        adultFacilitation:
          "Güvenli malzemeleri erişilebilir biçimde hazırlayın. Seçimi bir ürün kalitesi ölçütüne dönüştürmeden çocuğun denemesini izleyin.",
        reflectionPrompt: "Seçtiğin malzemeyle neyi denemek istersin?",
      },
      {
        id: "48-60-rhythm-start",
        title: "Ritmi sen başlat",
        childPrompt: "Ses sıramız hangi hareketle başlasın?",
        choices: [
          { id: "48-60-rhythm-clap", label: "Önce alkış" },
          { id: "48-60-rhythm-knees", label: "Önce dizlere dokun" },
          { id: "48-60-rhythm-pause", label: "Önce sessizce bekle" },
        ],
        adultFacilitation:
          "Seçilen başlangıcı birlikte deneyin. Çocuğun ritmi değiştirmesine veya bedensel katılım yerine dinlemeyi seçmesine izin verin.",
        reflectionPrompt: "Başlangıçtan sonra hangi ses gelsin?",
      },
    ],
  },
  "60-72": {
    ageLabel: "60–72 ay",
    developmentalUseNote:
      "Seçenekler arasında ilişki kurmasına, kendi seçeneğini önermesine ve birlikte küçük bir plan yapmasına alan açın; sonuç yerine süreci konuşun.",
    choiceTemplates: [
      {
        id: "60-72-group-strategy",
        title: "Birlikte çözüm yolu seç",
        childPrompt: "Bu işi birlikte yapmak için nasıl başlayalım?",
        choices: [
          { id: "60-72-strategy-turns", label: "Sırayla deneyelim" },
          { id: "60-72-strategy-roles", label: "Görevleri paylaşalım" },
          { id: "60-72-strategy-plan", label: "Önce plan çizelim" },
        ],
        adultFacilitation:
          "Seçenekleri olası yollar olarak sunun. Grubun başka bir yol önermesine izin verin ve seçimden sonra herkesin onayını yeniden sorun.",
        reflectionPrompt: "Planımızda ilk küçük adım ne olsun?",
      },
      {
        id: "60-72-nature-care",
        title: "Doğa için bir adım seç",
        childPrompt: "Elimizdeki malzemeler için hangi özenli adımı atalım?",
        choices: [
          { id: "60-72-care-reuse", label: "Yeniden kullanalım" },
          { id: "60-72-care-sort", label: "Ayırıp toplayalım" },
          { id: "60-72-care-less", label: "Daha az kullanalım" },
        ],
        adultFacilitation:
          "Seçimin uygulanabilir ve güvenli bir örneğini birlikte belirleyin. Çocuğun ailesi veya alışkanlıkları hakkında değer hükmü kurmayın.",
        reflectionPrompt: "Seçtiğimiz adımı bugün nerede deneyebiliriz?",
      },
      {
        id: "60-72-expression-path",
        title: "Anlatma yolunu seç",
        childPrompt: "Düşünceni bugün nasıl paylaşmak istersin?",
        choices: [
          { id: "60-72-expression-draw", label: "Resmini çizerim" },
          { id: "60-72-expression-act", label: "Canlandırırım" },
          { id: "60-72-expression-sound", label: "Seslerle anlatırım" },
        ],
        adultFacilitation:
          "Her anlatım yolunu eşit derecede geçerli tutun. Çocuğun yolları birleştirmesine, yeni bir yol önermesine veya paylaşmamayı seçmesine izin verin.",
        reflectionPrompt: "Anlatımına eklemek istediğin başka bir şey var mı?",
      },
    ],
  },
} as const satisfies Record<Tymm2024AgeBand, TymmAgeGuideEditorialContent>;

function cloneAndFreeze<T>(value: T): DeepReadonly<T> {
  if (Array.isArray(value)) {
    return Object.freeze(
      value.map((item) => cloneAndFreeze(item)),
    ) as DeepReadonly<T>;
  }
  if (typeof value === "object" && value !== null) {
    const clone = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneAndFreeze(item)]),
    );
    return Object.freeze(clone) as DeepReadonly<T>;
  }
  return value as DeepReadonly<T>;
}

function buildAgeGuide(ageBand: Tymm2024AgeBand): TymmAgeGuideReadModel {
  const ageOutcomes = TYMM_2024_LEARNING_OUTCOMES.filter(
    (outcome) => outcome.ageBand === ageBand,
  );
  const domainOutcomeCounts = TYMM_2024_DOMAINS.map((domain) => ({
    domain,
    learningOutcomeCount: ageOutcomes.filter(
      (outcome) => outcome.domain === domain,
    ).length,
  }));
  const totalLearningOutcomeCount = domainOutcomeCounts.reduce(
    (total, item) => total + item.learningOutcomeCount,
    0,
  );

  if (totalLearningOutcomeCount !== ageOutcomes.length) {
    throw new Error(
      `TYMM ${ageBand} yaş bandında katalog dışı alan bulundu; yaş rehberi güvenli biçimde üretilemedi.`,
    );
  }

  const ageBandSourcePages = [...new Set(
    ageOutcomes.map((outcome) => outcome.sourcePage),
  )].sort((left, right) => left - right);
  const editorial = AGE_GUIDE_EDITORIAL[ageBand];

  return cloneAndFreeze({
    ageBand,
    ageLabel: editorial.ageLabel,
    developmentalUseNote: editorial.developmentalUseNote,
    domainOutcomeCounts,
    totalLearningOutcomeCount,
    officialProvenance: {
      authority: "T.C. Millî Eğitim Bakanlığı",
      materialKind: "official-program",
      catalogId: TYMM_2024_CATALOG_METADATA.catalogId,
      catalogVersion: TYMM_2024_CATALOG_METADATA.catalogVersion,
      sourceVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
      sourceDocumentTitle:
        TYMM_2024_CATALOG_METADATA.sourceDocumentTitle,
      sourceFileName: TYMM_2024_CATALOG_METADATA.sourceFileName,
      sourceUrl: TYMM_2024_CATALOG_METADATA.sourceUrl,
      sourceSha256: TYMM_2024_CATALOG_METADATA.sourceSha256,
      catalogContentSha256:
        TYMM_2024_CATALOG_METADATA.catalogContentSha256,
      sourceCheckedOn: TYMM_2024_CATALOG_METADATA.sourceCheckedOn,
      matrixPageRange: [...TYMM_2024_CATALOG_METADATA.matrixPageRange] as [
        number,
        number,
      ],
      ageBandSourcePages,
      completeScope: TYMM_2024_CATALOG_METADATA.completeScope,
    },
    interactionPolicy: INTERACTION_POLICY,
    choiceTemplates: editorial.choiceTemplates,
  }) as TymmAgeGuideReadModel;
}

/**
 * Üç resmî TYMM yaş bandının katalogdan türetilmiş, derin-dondurulmuş UI
 * projection'ı. Etkileşim metinleri resmî program provenance'ından ayrıdır.
 */
export const TYMM_AGE_GUIDE_READ_MODELS: readonly TymmAgeGuideReadModel[] =
  cloneAndFreeze(
    TYMM_2024_AGE_BANDS.map(buildAgeGuide),
  ) as readonly TymmAgeGuideReadModel[];

export function isTymmAgeGuideAgeBand(
  value: unknown,
): value is Tymm2024AgeBand {
  return (
    typeof value === "string" &&
    (TYMM_2024_AGE_BANDS as readonly string[]).includes(value)
  );
}

/**
 * Yalnız kanonik `36-48`, `48-60` veya `60-72` kimliğini kabul eder. Serbest
 * metni yaş bandına tahmin ederek eşleştirmez; geçersiz girdide fail-closed
 * olarak `null` döndürür.
 */
export function getTymmAgeGuide(
  ageBand: unknown,
): TymmAgeGuideReadModel | null {
  if (!isTymmAgeGuideAgeBand(ageBand)) {
    return null;
  }
  return (
    TYMM_AGE_GUIDE_READ_MODELS.find(
      (guide) => guide.ageBand === ageBand,
    ) ?? null
  );
}

/** Dondurulmuş yaş rehberi koleksiyonunu resmî yaş bandı sırasıyla döndürür. */
export function listTymmAgeGuides(): readonly TymmAgeGuideReadModel[] {
  return TYMM_AGE_GUIDE_READ_MODELS;
}
