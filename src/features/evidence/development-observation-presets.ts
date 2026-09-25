import {
  OBSERVATION_TAXONOMY_VERSION_V2,
  type ObservationCategoryV2,
} from "../../core/domain/observation-taxonomy.ts";
import {
  curriculumAgeBandFromLabel,
  curriculumTargetsForProfile,
  type CurriculumTargetSnapshot,
} from "../curriculum/curriculum-catalog.ts";
import {
  TYMM_2024_AGE_BANDS,
  TYMM_2024_CATALOG_METADATA,
  TYMM_2024_DOMAINS,
  type Tymm2024AgeBand,
  type Tymm2024Domain,
} from "../curriculum/tymm-2024-catalog.ts";
import type { CurriculumProfileSnapshot } from "./evidence-flow.ts";
import type { PersistQuickObservationDraftInput } from "./quick-observation.ts";

/**
 * Bunlar resmî bir gelişim kontrol listesi veya başarı düzeyi değildir.
 * Öğretmenin gerçekten gördüğü olayı seçip düzenlemesine yarayan özgün örneklerdir.
 * Resmî program çıktısı, öğretmen metninden ayrı bir kaynak referansı olarak kalır.
 */
export const DEVELOPMENT_OBSERVATION_CATALOG = Object.freeze({
  id: "maarifos-development-observation-presets",
  version: "1.0.0",
  contentOrigin: "MaarifOS-original" as const,
  officialChecklist: false as const,
  coverage: "selected-observable-examples" as const,
  sourceCheckedOn: "2026-08-31",
  sourceUrl: TYMM_2024_CATALOG_METADATA.sourceUrl,
  accessibleSourceUrl:
    "https://tegm.meb.gov.tr/meb_iys_dosyalar/2024_09/20104013_2024programokuloncesionayli.pdf",
  sourceSha256: TYMM_2024_CATALOG_METADATA.sourceSha256,
  notice:
    "Yalnız gözlediğiniz davranışı seçin. Cümleyi olaya göre düzenleyin. Bunlar resmî gelişim basamağı, tanı veya puan değildir; Maarif öğrenme çıktılarıyla ilişkili gözlem örnekleridir.",
  ageBandNotice:
    "Sınıfınızın seçili yaş bandı kullanılır; doğum tarihinden otomatik gelişim beklentisi çıkarılmaz.",
});

export const DEVELOPMENT_OBSERVATION_DOMAINS = TYMM_2024_DOMAINS;

export const DEVELOPMENT_OBSERVATION_SUPPORT_OPTIONS = Object.freeze([
  Object.freeze({
    id: "without-prompt" as const,
    label: "Yönlendirme olmadan",
    contextText: "Bu gözlem sırasında ek yetişkin yönlendirmesi olmadı.",
  }),
  Object.freeze({
    id: "with-reminder" as const,
    label: "Hatırlatmayla",
    contextText: "Bu gözlem sırasında yetişkin hatırlatması kullanıldı.",
  }),
  Object.freeze({
    id: "together" as const,
    label: "Birlikte yaparak",
    contextText: "Bu gözlem sırasında yetişkinle birlikte uygulama yapıldı.",
  }),
]);

export type DevelopmentObservationSupport =
  (typeof DEVELOPMENT_OBSERVATION_SUPPORT_OPTIONS)[number]["id"];

export interface DevelopmentObservationSelection {
  presetId: string;
  ageBand: Tymm2024AgeBand;
  support?: DevelopmentObservationSupport;
}

export interface DevelopmentObservationCurriculumReference {
  readonly targetId: string;
  readonly code: string;
  readonly title: string;
  readonly sourcePage: number;
  readonly sourceUrl: string;
  readonly sourceVersion: string;
  readonly sourceSha256: `sha256:${string}`;
}

export interface DevelopmentObservationPreset {
  readonly id: string;
  readonly ageBand: Tymm2024AgeBand;
  readonly domain: Tymm2024Domain;
  readonly label: string;
  readonly observationText: string;
  readonly categoryIds: readonly ObservationCategoryV2[];
  readonly curriculumReference: DevelopmentObservationCurriculumReference;
  readonly provenance: typeof DEVELOPMENT_OBSERVATION_CATALOG;
}

export interface DevelopmentObservationProgramMapping {
  readonly presetId: string;
  readonly targetId: string;
  readonly ageBand: Tymm2024AgeBand;
  readonly profile: CurriculumProfileSnapshot;
  readonly target: CurriculumTargetSnapshot;
  readonly relationship: "teacher-review-required";
  readonly assessmentLevel: null;
}

export interface CreateDevelopmentObservationDraftInput {
  presetId: string;
  ageBand: string;
  support?: DevelopmentObservationSupport;
  /** Verildiğinde boşlukları ve satır sonları dahil aynen korunur. */
  rawText?: string;
  context?: string;
}

export type DevelopmentObservationDraft = Pick<
  PersistQuickObservationDraftInput,
  "rawText" | "context" | "childQuote" | "observationType" | "categoryIds" | "taxonomyVersion"
> & {
  programMapping: DevelopmentObservationProgramMapping;
};

const PROFILE: CurriculumProfileSnapshot = Object.freeze({
  framework: "tymm",
  programLabel: "Türkiye Yüzyılı Maarif Modeli",
  catalogId: TYMM_2024_CATALOG_METADATA.catalogId,
  sourceVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
  referenceOrigin: "official-catalog",
  officialCatalogVerified: true,
});

const CATEGORIES: Record<Tymm2024Domain, readonly ObservationCategoryV2[]> = {
  Türkçe: ["language-communication"],
  Matematik: ["cognitive-learning"],
  Fen: ["cognitive-learning", "interest-attention-curiosity"],
  Sosyal: ["social-emotional", "values-dispositions-participation"],
  "Hareket ve Sağlık": ["physical-motor-health"],
  Sanat: ["art-creativity"],
  Müzik: ["art-creativity", "play-participation"],
};

type PresetSeed = readonly [
  id: string,
  domain: Tymm2024Domain,
  referenceCode: string,
  label: string,
  observationText: string,
  categories?: readonly ObservationCategoryV2[],
];

const SEEDS: Record<Tymm2024AgeBand, readonly PresetSeed[]> = {
  "36-48": [
    ["story-choice", "Türkçe", "TADB.1", "Dinleyeceği öyküyü seçti", "Sunulan öykülerden dinlemek istediğini işaret ederek seçti."],
    ["picture-prediction", "Türkçe", "TAOB.2", "Resimden tahmin söyledi", "Kitabın resmine baktı ve öyküde neler olabileceğini söyledi."],
    ["speaking-turn", "Türkçe", "TAKB.1", "Söz almayı bekledi", "Konuşan kişiyi bekledikten sonra kendi anlatımına başladı."],
    ["count-objects", "Matematik", "MAB.1", "Nesneleri saydı", "Önündeki bir ile beş arasındaki nesneleri sayarak kaç tane olduğunu söyledi."],
    ["copy-pattern", "Matematik", "MAB.3", "Örüntünün aynısını yaptı", "İki farklı nesneyle gösterilen sıralamanın aynısını kendi nesneleriyle oluşturdu."],
    ["whole-parts", "Matematik", "MAB.2", "Bütünün parçalarını gösterdi", "Birleşen parçaların oluşturduğu bütünde ayrı parçaları gösterdi."],
    ["sensory-noticing", "Fen", "FAB.1", "Dokunup farkını anlattı", "İncelediği doğal materyallere dokundu ve hissettiği bir farkı söyledi."],
    ["solid-liquid", "Fen", "FAB.2", "Katı ve sıvıyı ayırdı", "İncelediği katı nesneyi ve sıvıyı ayrı gruplara yerleştirdi."],
    ["simple-experiment", "Fen", "FAB.6", "Deneye katıldı", "Yetişkin gözetimindeki su deneyinde malzemeyi suya bıraktı ve ne olduğunu izledi."],
    ["morning-routine", "Sosyal", "SAB.1", "Sabah yaptığını anlattı", "Sabah yaptığı bir işi anlattı ve bu işi sabah sözcüğüyle ilişkilendirdi."],
    ["night-routine", "Sosyal", "SAB.1", "Gece yapılanı söyledi", "Gece görselini göstererek o zamanda yapılan bir günlük işi söyledi."],
    ["local-culture", "Sosyal", "SAB.2", "Yerel kültürden örnek verdi", "Bir görselde tanıdığı yöresel yemeği veya müzik aracını gösterip adını söyledi."],
    ["balance-path", "Hareket ve Sağlık", "HSAB.1", "Çizgi üzerinde yürüdü", "Yerdeki kısa çizgiyi izleyerek yürüdü."],
    ["shape-dough", "Hareket ve Sağlık", "HSAB.2", "Hamura şekil verdi", "Oyun hamurunu elleriyle sıkarak ve yuvarlayarak şekillendirdi."],
    ["hand-cleaning", "Hareket ve Sağlık", "HSAB.9", "El temizliğine katıldı", "Öğretmen gözetiminde ellerini sabunlayıp duruladı.", ["self-care-daily-life"]],
    ["art-tool", "Sanat", "SNAB.1", "Sanat aracını kullandı", "Seçtiği boya aracını kâğıtta iz oluşturmak için kullandı."],
    ["art-noticing", "Sanat", "SNAB.2", "Eserde gördüğünü söyledi", "İncelediği resimde gördüğü bir rengi veya şekli söyledi."],
    ["art-choice", "Sanat", "SNAB.4", "Yapacağı çalışmayı seçti", "Sunulan sanat çalışmaları arasından yapmak istediğini seçti."],
    ["song-choice", "Müzik", "MDB.1", "Şarkı seçip dinledi", "Sunulan şarkılardan birini seçti ve seçtiği şarkıyı dinledi."],
    ["sound-source", "Müzik", "MDB.3", "Sesin kaynağını gösterdi", "Duyduğu çevre sesinin geldiği kaynağı gösterdi."],
    ["dance-tempo", "Müzik", "MHB.2", "Tempoya göre hareket etti", "Müziğin temposu değişince hareketini yavaşlattı veya hızlandırdı."],
  ],
  "48-60": [
    ["story-event", "Türkçe", "TADB.3", "Öyküdeki olayı anlattı", "Dinlediği öyküde gerçekleşen bir olayı kendi sözleriyle anlattı."],
    ["picture-prediction", "Türkçe", "TAOB.2", "Resimden tahmin söyledi", "Kitabın resmini inceleyerek öykünün devamında olabilecek bir olayı söyledi."],
    ["speaking-turn", "Türkçe", "TAKB.1", "Söz almayı bekledi", "Arkadaşının konuşması bittikten sonra seçtiği konu hakkında konuştu."],
    ["count-objects", "Matematik", "MAB.1", "Nesneleri saydı", "Önündeki bir ile on arasındaki nesneleri sayıp toplamını söyledi."],
    ["continue-pattern", "Matematik", "MAB.4", "Örüntüyü sürdürdü", "İki tür nesneyle başlayan örüntüye sıradaki uygun nesneleri ekledi."],
    ["equal-parts", "Matematik", "MAB.2", "Eş parçaları gösterdi", "Parçalar arasından birbiriyle eş olanları yan yana getirip gösterdi."],
    ["sensory-noticing", "Fen", "FAB.1", "Materyalin farkını anlattı", "İki doğal materyali inceleyip dokularında veya görünüşlerinde fark ettiği ayrılığı anlattı."],
    ["weather-clothing", "Fen", "FAB.3", "Havaya göre öneri söyledi", "Gözlediği hava durumuna göre dışarıda ne giyilebileceğini söyledi."],
    ["experiment-materials", "Fen", "FAB.6", "Deney malzemesi seçti", "Yapmak istediği basit deney için sunulan malzemeler arasından seçim yaptı."],
    ["daily-order", "Sosyal", "SAB.2", "Günün olaylarını sıraladı", "Gün içinde yaptığı işleri gösteren resimleri oluş sırasına dizdi."],
    ["help-proposal", "Sosyal", "SAB.3", "Yardım önerisini söyledi", "Yardıma ihtiyaç duyulan grup işi için kendisinin ne yapabileceğini söyledi."],
    ["object-position", "Sosyal", "SAB.5", "Nesnenin yerini tarif etti", "Sınıftaki bir nesnenin yerini yanında veya altında gibi konum sözcükleriyle tarif etti."],
    ["balance-path", "Hareket ve Sağlık", "HSAB.1", "Denge yolunda yürüdü", "Yere işaretlenmiş denge yolunu takip ederek yürüdü."],
    ["shape-dough", "Hareket ve Sağlık", "HSAB.2", "Küçük kaslarını kullandı", "Oyun hamurunu parmaklarıyla bölüp istediği biçime dönüştürdü."],
    ["tidy-materials", "Hareket ve Sağlık", "HSAB.10", "Malzemeleri yerine koydu", "Etkinlik bitince kullandığı malzemeleri yerlerine yerleştirdi.", ["self-care-daily-life", "values-dispositions-participation"]],
    ["art-materials", "Sanat", "SNAB.4", "Çalışması için malzeme seçti", "Yapacağı sanat çalışmasına başlamadan kullanacağı malzemeleri seçti."],
    ["art-feeling", "Sanat", "SNAB.2", "Eser hakkındaki fikrini söyledi", "İncelediği resim hakkında düşündüğünü söyledi ve nedenini açıkladı."],
    ["art-product", "Sanat", "SNAB.4", "Sanat ürünü oluşturdu", "Seçtiği malzemeleri bir araya getirerek kendi sanat çalışmasını oluşturdu."],
    ["sound-imitation", "Müzik", "MSB.1", "Duyduğu sesi taklit etti", "Duyduğu bir doğa sesini kendi sesiyle tekrar etti."],
    ["instrument-sound", "Müzik", "MÇB.1", "Çalgıyla sesi canlandırdı", "Duyduğu sesi sınıftaki ritim çalgısıyla taklit etti."],
    ["group-song", "Müzik", "MSB.3", "Grup şarkısına katıldı", "Sınıfın birlikte söylediği şarkıya kendi sesiyle eşlik etti."],
  ],
  "60-72": [
    ["story-retelling", "Türkçe", "TAKB.2", "Kendi cümleleriyle anlattı", "Dinlediği kısa öyküyü kendi cümleleriyle yeniden anlattı."],
    ["story-connection", "Türkçe", "TADB.3", "Olayların ilişkisini anlattı", "Öyküdeki iki olay arasında kurduğu ilişkiyi anlattı."],
    ["speaking-rule", "Türkçe", "TAKB.3", "Konuşma kuralını uyguladı", "Grup konuşmasında arkadaşının sözünü tamamlamasını bekleyip sonra söz aldı."],
    ["count-objects", "Matematik", "MAB.1", "Nesne miktarını söyledi", "Önündeki bir ile yirmi arasındaki nesneleri sayıp kaç tane olduğunu söyledi."],
    ["continue-pattern", "Matematik", "MAB.4", "Örüntüyü sürdürdü", "Nesnelerle oluşturulmuş örüntünün kuralını izleyerek sıradaki öğeleri ekledi."],
    ["explain-solution", "Matematik", "MAB.7", "Çözüm yolunu denedi", "Paylaştırma probleminde önerdiği çözümü nesneleri kullanarak denedi."],
    ["nature-data", "Fen", "FAB.1", "Gözlemlediği farkı anlattı", "İncelediği bitkide fark ettiği özellikleri göstererek açıkladı."],
    ["recycling-sort", "Fen", "FAB.2", "Geri dönüşümü ayırdı", "Kullanılmış temiz malzemeleri kâğıt ve plastik olarak farklı gruplara ayırdı."],
    ["experiment-design", "Fen", "FAB.6", "Deney için düzenek kurdu", "Merak ettiği soruyu denemek için malzeme seçip basit bir deney düzeni oluşturdu."],
    ["group-contact", "Sosyal", "SAB.8", "Grup iletişimini başlattı", "Grup çalışmasına başlarken arkadaşlarına bir öneri söyleyerek konuşmayı başlattı."],
    ["group-contribution", "Sosyal", "SAB.8", "Ortak iş için öneri sundu", "Grubun birlikte yapacağı çalışma için bir görev veya çözüm önerisi söyledi."],
    ["follow-map", "Sosyal", "SAB.9", "Basit krokide yolu izledi", "Sınıfın basit krokisindeki işaretli yolu izleyerek hedefin yerini buldu."],
    ["balance-path", "Hareket ve Sağlık", "HSAB.1", "Denge hareketi yaptı", "Hareket oyunundaki denge bölümünü belirlenen yol üzerinde yürüyerek tamamladı."],
    ["tool-control", "Hareket ve Sağlık", "HSAB.2", "Nesneleri araçla taşıdı", "Uygun büyüklükteki parçaları maşa kullanarak bir kaptan diğerine taşıdı."],
    ["hand-cleaning", "Hareket ve Sağlık", "HSAB.10", "El temizliğini yaptı", "Yemek öncesinde ellerini sabunlayıp duruladı ve kuruladı.", ["self-care-daily-life"]],
    ["art-materials", "Sanat", "SNAB.4", "Sanat çalışmasını planladı", "Yapmak istediği sanat çalışmasını söyleyip kullanacağı malzemeleri seçti."],
    ["art-reason", "Sanat", "SNAB.2", "Eser hakkındaki fikrini açıkladı", "İncelediği eser hakkındaki düşüncesini eserde gördüğü bir ayrıntıyla açıkladı."],
    ["drama-materials", "Sanat", "SNAB.4", "Canlandırma için malzeme seçti", "Drama oyununda canlandıracağı rol için kullanacağı malzemeleri seçti."],
    ["sound-difference", "Müzik", "MDB.4", "Ses farkını söyledi", "Dinlediği iki sesin ince veya kalın oluşundaki farkı söyledi."],
    ["rhythm-change", "Müzik", "MÇB.3", "Çalgıda tempoyu değiştirdi", "Ritim çalgısıyla çalarken gösterilen yavaş ve hızlı tempoya göre vuruşlarını değiştirdi."],
    ["group-percussion", "Müzik", "MHB.3", "Ortak ritme katıldı", "Grupla yapılan beden ritmine el çırparak veya dizlerine vurarak eşlik etti."],
  ],
};

const TARGETS_BY_AGE = new Map(
  TYMM_2024_AGE_BANDS.map((ageBand) => [
    ageBand,
    curriculumTargetsForProfile(PROFILE, ageBand),
  ]),
);

function targetFor(ageBand: Tymm2024AgeBand, code: string): CurriculumTargetSnapshot {
  const target = TARGETS_BY_AGE.get(ageBand)?.find(
    (candidate) => candidate.referenceCode === code,
  );
  if (!target || !target.sourcePage || !target.sourceSha256) {
    throw new Error("Gözlem örneğinin yaşa uygun Maarif kaynak bağlantısı bulunamadı.");
  }
  return target;
}

export const DEVELOPMENT_OBSERVATION_PRESETS: readonly DevelopmentObservationPreset[] =
  Object.freeze(TYMM_2024_AGE_BANDS.flatMap((ageBand) =>
    SEEDS[ageBand].map(([id, domain, code, label, observationText, categories]) => {
      const target = targetFor(ageBand, code);
      if (target.domain !== domain) {
        throw new Error("Gözlem örneğinin alanı Maarif kaynak alanıyla uyuşmuyor.");
      }
      return Object.freeze({
        id: `development-${ageBand}-${id}`,
        ageBand,
        domain,
        label,
        observationText,
        categoryIds: Object.freeze([...(categories ?? CATEGORIES[domain])]),
        curriculumReference: Object.freeze({
          targetId: target.id,
          code: target.referenceCode,
          title: target.referenceTitle,
          sourcePage: target.sourcePage!,
          sourceUrl: target.sourceUrl,
          sourceVersion: target.sourceVersion,
          sourceSha256: target.sourceSha256!,
        }),
        provenance: DEVELOPMENT_OBSERVATION_CATALOG,
      });
    }),
  ));

/** Belirsiz/karma yaşta veya EÇE kodunda örtülü TYMM varsayımı yapmaz. */
export function getDevelopmentObservationPresets(
  ageBand: string | null | undefined,
  domain?: Tymm2024Domain,
): readonly DevelopmentObservationPreset[] {
  const resolvedAgeBand = curriculumAgeBandFromLabel(ageBand);
  if (!resolvedAgeBand) return [];
  return DEVELOPMENT_OBSERVATION_PRESETS.filter(
    (preset) => preset.ageBand === resolvedAgeBand &&
      (domain === undefined || preset.domain === domain),
  );
}

export function resolveDevelopmentObservationProgramMapping(
  presetId: string,
  ageBand: string,
): DevelopmentObservationProgramMapping {
  const preset = getDevelopmentObservationPresets(ageBand).find(
    (candidate) => candidate.id === presetId,
  );
  if (!preset) {
    throw new Error("Gözlem örneği seçilen sınıfın Maarif yaş bandıyla uyuşmuyor.");
  }
  const target = targetFor(preset.ageBand, preset.curriculumReference.code);
  return {
    presetId: preset.id,
    targetId: target.id,
    ageBand: preset.ageBand,
    profile: { ...PROFILE },
    target: { ...target, ageBands: [...(target.ageBands ?? [])] },
    relationship: "teacher-review-required",
    assessmentLevel: null,
  };
}

export function parseDevelopmentObservationSelection(
  value: unknown,
): DevelopmentObservationSelection {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Maarif gelişim gözlemi seçimi geçersiz.");
  }
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some((key) => !["presetId", "ageBand", "support"].includes(key)) ||
    typeof input.presetId !== "string" ||
    !TYMM_2024_AGE_BANDS.includes(input.ageBand as Tymm2024AgeBand) ||
    (input.support !== undefined &&
      !DEVELOPMENT_OBSERVATION_SUPPORT_OPTIONS.some((option) => option.id === input.support))
  ) {
    throw new Error("Maarif gelişim gözleminin yaş bandı veya destek seçimi geçersiz.");
  }
  const mapping = resolveDevelopmentObservationProgramMapping(input.presetId, input.ageBand as string);
  return {
    presetId: mapping.presetId,
    ageBand: mapping.ageBand,
    ...(input.support === undefined ? {} : { support: input.support as DevelopmentObservationSupport }),
  };
}

export function isDevelopmentObservationSelection(
  value: unknown,
): value is DevelopmentObservationSelection {
  try {
    parseDevelopmentObservationSelection(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saf taslak üreticisidir: çocuğa atama, kalıcı kayıt, program onayı yapmaz.
 * programMapping ayrı tutulur; mevcut kayıt servisine yalnız draft alanları verilir.
 * Destek bir olay bağlamıdır, dönemsel değerlendirme düzeyine dönüştürülmez.
 */
export function createDevelopmentObservationDraft(
  input: CreateDevelopmentObservationDraftInput,
): DevelopmentObservationDraft {
  const programMapping = resolveDevelopmentObservationProgramMapping(
    input.presetId,
    input.ageBand,
  );
  const preset = DEVELOPMENT_OBSERVATION_PRESETS.find(
    (candidate) => candidate.id === programMapping.presetId,
  )!;
  const support = input.support === undefined ? undefined :
    DEVELOPMENT_OBSERVATION_SUPPORT_OPTIONS.find((option) => option.id === input.support);
  if (input.support !== undefined && !support) {
    throw new Error("Gözlem sırasındaki destek seçimi geçersiz.");
  }
  const context = input.context ?? "";
  return {
    rawText: input.rawText ?? preset.observationText,
    context: support
      ? `${context}${context.length ? "\n" : ""}${support.contextText}`
      : context,
    childQuote: "",
    observationType: "systematic",
    categoryIds: [...preset.categoryIds],
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
    programMapping,
  };
}
