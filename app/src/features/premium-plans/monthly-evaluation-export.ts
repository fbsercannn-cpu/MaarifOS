import type { PremiumContentPack } from "./domain.ts";
import {
  PREMIUM_MONTHLY_PROGRAM_CRITERIA,
  PREMIUM_MONTHLY_TEACHER_CRITERIA,
  loadPremiumMonthlyReviewContext,
  summarizePremiumMonthlyEvidence,
  type PremiumMonthlyCriterionStatus,
  type PremiumMonthlyEvaluation,
  type PremiumMonthlyReviewContext,
  type PremiumMonthlyReviewObservation,
} from "./plan-service.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  assertPremiumPackActionAccess,
  assertVerifiedPremiumAccess,
  type VerifiedPremiumAccess,
} from "../premium-access/entitlement.ts";
import {
  createSemanticTaggedPdf,
  type SemanticPdfNode,
  type SemanticTaggedPdfRuntime,
} from "../documents/semantic-tagged-pdf.ts";

export type MonthlyEvaluationExportFormat = "pdf" | "word";

export interface MonthlyEvaluationExportManifest {
  schemaVersion: 2;
  documentType: "meb-2024-ek18-monthly-plan-control";
  renderingMode: "semantic-accessible-reflow" | "source-structured-word-reproduction";
  officialSourceFormPageCount: 6;
  outputPagination: "content-dependent" | "six-source-pages-plus-appendix";
  officialSource: {
    authority: "T.C. Millî Eğitim Bakanlığı";
    program: "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı";
    version: "2024";
    evaluationPages: "136-139";
    annex: "Ek 18 - Aylık Plan Kontrol Çizelgesi";
    annexPages: "344-349";
  };
  generatedAt: string;
  monthlyPlanId: string;
  monthlyEvaluationId: string;
  /** Öğretmen planı çıktılarında değerlendirmeyi exact plan revizyonuna bağlar. */
  sourcePlanRevisionNumber?: number;
  /** Seçili kanıt zincirinin değerlendirmeden önceki son değişim zamanı. */
  evidenceLastModifiedAt?: string;
  /** Kanıt değerlendirmeden sonra değişirse dışa aktarımın davranışı. */
  evidenceMutationPolicy?: "fail-closed-after-evaluation";
  observationIds: readonly string[];
  curriculumLinkIds: readonly string[];
  mappedOfficialRowIds: readonly string[];
  programComponentEvidenceStatus:
    | "verified-complete-mapping"
    | "verified-partial-mapping"
    | "verified-no-components";
  persistedProgramComponents: readonly {
    referenceCode: string;
    referenceTitle: string;
  }[];
  unmappedPlanComponents: readonly {
    referenceCode: string;
    referenceTitle: string;
  }[];
}

export interface PersistedMonthlyPlanProgramComponent {
  id: string;
  referenceCode: string;
  referenceTitle: string;
  framework: "tymm";
  catalogId: string;
  sourceVersion: string;
  referenceOrigin: "official-catalog";
  officialCatalogVerified: true;
  verificationStatus: "official-source-checked";
}

export interface MonthlyEvaluationExportSource {
  reviewContext: PremiumMonthlyReviewContext;
  persistedMonthlyPlan: {
    id: string;
    title: string;
    periodStart: string;
    periodEnd: string;
    contentPackId: string;
    contentPackVersion: string;
    contentPackSnapshot: {
      id: string;
      version: string;
      contentReleaseId: string;
      manifestDigest: string;
      sku: PremiumContentPack["sku"];
      academicRelease: string;
    };
    programComponents: readonly PersistedMonthlyPlanProgramComponent[];
  };
}

export interface MonthlyEvaluationExportDocument {
  format: MonthlyEvaluationExportFormat;
  fileName: string;
  monthLabel: string;
  monthColumnIndex: number;
  monthlyPlan: {
    id: string;
    title: string;
    periodStart: string;
    periodEnd: string;
  };
  evaluation: PremiumMonthlyEvaluation;
  selectedObservations: readonly PremiumMonthlyReviewObservation[];
  mappedOfficialRowIds: readonly string[];
  manifest: MonthlyEvaluationExportManifest;
}

export interface MonthlyEvaluationExportFile {
  format: MonthlyEvaluationExportFormat;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  document: MonthlyEvaluationExportDocument;
}

export interface MonthlyEvaluationPdfRuntime extends SemanticTaggedPdfRuntime {}

interface Ek18Row {
  id: string;
  label: string;
}

interface Ek18Group {
  label: string;
  rows: readonly Ek18Row[];
}

interface Ek18Table {
  title: string;
  groups: readonly Ek18Group[];
}

interface Ek18Page {
  intro?: true;
  tables: readonly Ek18Table[];
  generalEvaluation?: true;
}

const MONTHS = [
  { month: 9, label: "Eylül" },
  { month: 10, label: "Ekim" },
  { month: 11, label: "Kasım" },
  { month: 12, label: "Aralık" },
  { month: 1, label: "Ocak" },
  { month: 2, label: "Şubat" },
  { month: 3, label: "Mart" },
  { month: 4, label: "Nisan" },
  { month: 5, label: "Mayıs" },
  { month: 6, label: "Haziran" },
] as const;

const rows = (
  group: string,
  labels: readonly (readonly [string, string])[],
): Ek18Group => ({
  label: group,
  rows: labels.map(([id, label]) => ({ id, label })),
});

const EK18_PAGES: readonly Ek18Page[] = [
  {
    intro: true,
    tables: [
      {
        title: "KAVRAMSAL BECERİLER",
        groups: [
          rows("TEMEL BECERİLER", [
            ["concept-basic-count", "Saymak"],
            ["concept-basic-read", "Okumak"],
            ["concept-basic-write-draw", "Yazmak-çizmek"],
            ["concept-basic-find-select", "Bulmak-seçmek"],
            ["concept-basic-identify-mark", "Belirlermek-işaret etmek"],
            ["concept-basic-measure-present", "Ölçmek-sunmak"],
            ["concept-basic-transform-record", "Çevirmek-kaydetmek"],
          ]),
          rows("BÜTÜNLEŞİK BECERİLER", [
            ["concept-integrated-resolve-contradiction", "Çelişki giderme becerisi"],
            ["concept-integrated-observe", "Gözlemleme becerisi"],
            ["concept-integrated-summarize", "Özetleme becerisi"],
            ["concept-integrated-analyze", "Çözümleme becerisi"],
            ["concept-integrated-classify", "Sınıflandırma becerisi"],
            ["concept-integrated-collect-information", "Bilgi toplama becerisi"],
            ["concept-integrated-compare", "Karşılaştırma becerisi"],
            ["concept-integrated-inquire", "Sorgulama becerisi"],
            ["concept-integrated-generalize", "Genelleme becerisi"],
            ["concept-integrated-infer", "Çıkarım yapma becerisi"],
            ["concept-integrated-predict-by-observation", "Gözleme dayalı tahmin etme becerisi"],
            ["concept-integrated-interpret", "Yorumlama becerisi"],
            ["concept-integrated-reflect", "Yansıtma becerisi"],
            ["concept-integrated-reason", "Muhakeme (akıl yürütme) becerisi"],
          ]),
        ],
      },
    ],
  },
  {
    tables: [
      {
        title: "KAVRAMSAL BECERİLER",
        groups: [
          rows("BÜTÜNLEŞİK BECERİLER", [
            ["concept-integrated-inductive-reason", "Tümevarıma dayalı akıl yürütme becerisi"],
            ["concept-integrated-deductive-reason", "Tümden gelime dayalı akıl yürütme becerisi"],
            ["concept-integrated-evaluate", "Değerlendirme becerisi"],
            ["concept-integrated-synthesize", "Sentezleme becerisi"],
          ]),
          rows("ÜST DÜZEY DÜŞÜNME BECERİLERİ", [
            ["concept-high-problem-solving", "Problem çözme becerisi"],
            ["concept-high-critical-thinking", "Eleştirel düşünme becerisi"],
          ]),
        ],
      },
      {
        title: "EĞİLİMLER",
        groups: [
          rows("BENLİK EĞİLİMLERİ", [
            ["tendency-self-curiosity", "Merak"],
            ["tendency-self-independence", "Bağımsızlık"],
            ["tendency-self-perseverance", "Azimli ve Kararlılık"],
            ["tendency-self-efficacy", "Kendine İnanma(Öz Yeterlilik)"],
            ["tendency-self-confidence", "Kendine Güvenme(Öz Güven)"],
          ]),
          rows("SOSYAL EĞİLİMLER", [
            ["tendency-social-empathy", "Empati"],
            ["tendency-social-responsibility", "Sorumluluk"],
            ["tendency-social-initiative", "Girişkenlik"],
            ["tendency-social-trust", "Güven"],
            ["tendency-social-playfulness", "Oyunseverlik"],
          ]),
          rows("ENTELEKTÜEL EĞİLİMLER", [
            ["tendency-intellectual-focus", "Odaklanma"],
            ["tendency-intellectual-creativity", "Yaratıcılık"],
            ["tendency-intellectual-open-minded", "Açık Fikirlilik"],
            ["tendency-intellectual-analytic", "Analitik Düşünme"],
            ["tendency-intellectual-question", "Merak Ettiği Soruları Sorma"],
            ["tendency-intellectual-original", "Özgün Düşünme"],
          ]),
        ],
      },
    ],
  },
  {
    tables: [
      {
        title: "ALAN BECERİLERİ",
        groups: [
          rows("TÜRKÇE", [
            ["area-turkish-listening-viewing", "Dinleme/İzleme"],
            ["area-turkish-reading", "Okuma"],
            ["area-turkish-speaking", "Konuşma"],
            ["area-turkish-early-literacy", "Erken okuryazarlık"],
          ]),
          rows("MATEMATİK", [
            ["area-math-counting", "Sayma"],
            ["area-math-reasoning", "Matematiksel muhakeme"],
            ["area-math-problem-solving", "Matematiksel problem çözme"],
            ["area-math-representation", "Matematiksel temsil"],
            ["area-math-data-decisions", "Veri ile çalışma ve veriye dayalı karar verme"],
          ]),
          rows("FEN", [
            ["area-science-observation", "Bilimsel gözlem yapma"],
            ["area-science-classification", "Sınıflandırma"],
            ["area-science-observation-prediction", "Bilimsel gözleme dayalı tahmin etme"],
            ["area-science-data-prediction", "Bilimsel veriye dayalı tahmin etme"],
            ["area-science-operational-definition", "Operasyonel tanımlama yapma"],
            ["area-science-experiment", "Deney yapma"],
            ["area-science-inference", "Bilimsel çıkarım yapma"],
            ["area-science-model", "Bilimsel model oluşturma"],
            ["area-science-evidence", "Kanıt kullanma"],
            ["area-science-inquiry", "Bilimsel sorgulama yapma"],
          ]),
          rows("SOSYAL", [
            ["area-social-chronology", "Zamanı algılama ve kronolojik düşünme"],
            ["area-social-evidence-inquiry", "Kanıta dayalı sorgulama ve araştırma"],
            ["area-social-change-continuity", "Değişim ve sürekliliği algılama"],
            ["area-social-participation", "Sosyal katılım"],
            ["area-social-spatial", "Mekânsal düşünme"],
            ["area-social-geographic-inquiry", "Coğrafi sorgulama"],
            ["area-social-fieldwork", "Coğrafi gözlem ve saha çalışması"],
            ["area-social-map", "Harita"],
            ["area-social-diagram", "Coğrafi içerikli tablo, grafik, şekil ve diyagram"],
            ["area-social-critical-sociological", "Eleştirel ve sosyolojik düşünme"],
            ["area-social-finance", "Finans"],
          ]),
        ],
      },
    ],
  },
  {
    tables: [
      {
        title: "ALAN BECERİLERİ",
        groups: [
          rows("HAREKET VE SAĞLIK", [
            ["area-movement-psychomotor", "Aktif yaşam için psikomotor beceriler"],
            ["area-movement-health", "Aktif ve zinde yaşam için sağlık becerileri"],
            ["area-movement-social-cognitive", "Harekete ilişkin sosyal/bilişsel beceriler"],
          ]),
          rows("SANAT", [
            ["area-art-understand", "Sanat türlerini ve tekniklerini anlama"],
            ["area-art-examine", "Sanat eseri inceleme"],
            ["area-art-value", "Sanata değer verme"],
            ["area-art-practice", "Sanatsal uygulama yapma"],
          ]),
          rows("MÜZİK", [
            ["area-music-listen", "Müziksel dinleme"],
            ["area-music-sing", "Müziksel söyleme"],
            ["area-music-play", "Müziksel çalma"],
            ["area-music-movement", "Müziksel hareket"],
            ["area-music-creativity", "Müziksel yaratıcılık"],
          ]),
        ],
      },
      {
        title: "SOSYAL - DUYGUSAL ÖĞRENME BECERİLERİ",
        groups: [
          rows("BENLİK BECERİLERİ", [
            ["sdo-self-awareness", "Kendini tanıma (öz farkındalık)"],
            ["sdo-self-regulation", "Kendini düzenleme (öz düzenleme)"],
            ["sdo-self-reflection", "Kendine uyarlama (öz yansıtma)"],
          ]),
          rows("SOSYAL YAŞAM BECERİLERİ", [
            ["sdo-communication", "İletişim"],
            ["sdo-cooperation", "İş birliği"],
            ["sdo-social-awareness", "Sosyal farkındalık"],
          ]),
          rows("ORTAK / BİRLEŞİK BECERİLER", [
            ["sdo-adaptation", "Uyum"],
            ["sdo-flexibility", "Esneklik"],
            ["sdo-responsible-decision", "Sorumlu karar verme"],
          ]),
        ],
      },
      {
        title: "DEĞERLER",
        groups: [
          rows("ADALET", [
            ["value-justice-rights", "Hak ve özgürlüklerini bilmek ve korumak"],
            ["value-justice-equity", "Hakkaniyetli davranmak"],
          ]),
          rows("AİLE BÜTÜNLÜĞÜ", [
            ["value-family-solidarity", "Aile içi dayanışma göstermek"],
            ["value-family-communication", "Aile içi iletişimi güçlendirmek"],
            ["value-family-responsibility", "Aile içi sorumlulukları yerine getirmek"],
          ]),
        ],
      },
    ],
  },
  {
    tables: [
      {
        title: "DEĞERLER",
        groups: [
          rows("ÇALIŞKANLIK", [
            ["value-diligence-persevere", "Azimli olmak"],
            ["value-diligence-plan", "Planlı olmak"],
            ["value-diligence-research", "Araştırmacı ve sorgulayıcı olmak"],
            ["value-diligence-active", "Çalışmalarda aktif rol almak."],
          ]),
          rows("DOSTLUK", [
            ["value-friendship-support", "Arkadaşlarına destek olmak"],
            ["value-friendship-effective-communication", "Arkadaşları ile etkili iletişim kurmak"],
            ["value-friendship-trust", "Güvene dayalı ilişkiler kurmak"],
            ["value-friendship-time", "Arkadaşlarını ve onlarla vakit geçirmeyi önemsemek"],
          ]),
          rows("DUYARLILIK", [
            ["value-sensitivity-human-society", "İnsana ve topluma değer vermek"],
            ["value-sensitivity-environment", "Çevreye ve canlılara değer vermek"],
            ["value-sensitivity-disaster", "Afet bilincine sahip olmak"],
          ]),
          rows("DÜRÜSTLÜK", [
            ["value-honesty-sincere", "Samimi olmak"],
            ["value-honesty-reliable", "Doğru ve güvenilir olmak"],
          ]),
          rows("ESTETİK", [
            ["value-aesthetic-depth", "Duyusal derinliği anlamak"],
            ["value-aesthetic-life", "Sanatsal ve görsel zevkleri hayatın bir parçası hâline getirmek"],
          ]),
          rows("MAHREMİYET", [
            ["value-privacy-personal", "Kişisel özgürlük alanını korumak"],
            ["value-privacy-social", "Sosyal ilişkilerde kişisel alanları korumak"],
          ]),
          rows("MERHAMET", [
            ["value-compassion-conscience", "Vicdanlı olmak"],
            ["value-compassion-kind", "Şefkatli olmak"],
            ["value-compassion-love", "İnsanı ve doğayı sevmek"],
          ]),
          rows("MÜTEVAZILIK", [
            ["value-humility-constructive", "İnsan ilişkilerinde yapıcı olmak"],
          ]),
        ],
      },
      {
        title: "OKURYAZARLIK BECERİLERİ",
        groups: [
          rows("BİLGİ OKURYAZARLIĞI", [
            ["literacy-information-need", "Bilgi ihtiyacını fark etme"],
            ["literacy-information-collect", "Bilgiyi toplama"],
            ["literacy-information-summarize", "Bilgiyi özetleme"],
          ]),
          rows("DİJİTAL OKURYAZARLIK", [
            ["literacy-digital-access", "Dijital bilgiye ulaşma ve dijital bilgiyi tanıma"],
            ["literacy-digital-communication", "Dijital iletişimi anlama"],
            ["literacy-digital-meaning", "Dijital bilgiyi anlamlandırma"],
          ]),
        ],
      },
    ],
  },
  {
    tables: [
      {
        title: "OKURYAZARLIK BECERİLERİ",
        groups: [
          rows("GÖRSEL OKURYAZARLIK", [
            ["literacy-visual-understand", "Görseli anlama"],
            ["literacy-visual-interpret", "Görseli yorumlama"],
            ["literacy-visual-critical", "Görsel hakkında eleştirel düşünme"],
            ["literacy-visual-create", "Görsel iletişim uygulamaları oluşturma"],
          ]),
          rows("KÜLTÜR OKURYAZARLIĞI", [
            ["literacy-culture-understand", "Kültürü kavrama"],
            ["literacy-culture-sustain", "Kültürü sürdürme"],
            ["literacy-culture-interaction", "Kültürel etkileşim"],
          ]),
          rows("VATANDAŞLIK OKURYAZARLIĞI", [
            ["literacy-citizenship-understand", "Vatandaşlığı anlama"],
            ["literacy-citizenship-rights", "Vatandaşlık hak ve sorumluluklarını kullanma"],
          ]),
          rows("VERİ OKURYAZARLIĞI", [
            ["literacy-data-question", "Sorular sorma ve olası sonuçları düşünme"],
            ["literacy-data-create", "Veri oluşturma"],
            ["literacy-data-quantify", "Verileri sayısallaştırma ve ölçme"],
            ["literacy-data-process", "Verileri düzenleme ve işleme"],
            ["literacy-data-visualize", "Verileri görselleştirme"],
            ["literacy-data-analyze", "Örüntüleri betimleme ve analiz etme"],
          ]),
          rows("SÜRDÜRÜLEBİLİRLİK OKURYAZARLIĞI", [
            ["literacy-sustainability-development", "Sürdürülebilirliği ve sürdürülebilir kalkınmayı anlama"],
            ["literacy-sustainability-systems", "Sürdürülebilir ve sürdürülebilir olmayan sistemleri anlama"],
          ]),
        ],
      },
    ],
    generalEvaluation: true,
  },
] as const;

const OFFICIAL_SOURCE = Object.freeze({
  authority: "T.C. Millî Eğitim Bakanlığı" as const,
  program: "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı" as const,
  version: "2024" as const,
  evaluationPages: "136-139" as const,
  annex: "Ek 18 - Aylık Plan Kontrol Çizelgesi" as const,
  annexPages: "344-349" as const,
});

const REFERENCE_ROW_RULES: readonly {
  referencePattern: RegExp;
  rowId: string;
}[] = [
  { referencePattern: /^KB2\.7(?:\.|$)/i, rowId: "concept-integrated-compare" },
  { referencePattern: /^E1\.1(?:\.|$)/i, rowId: "tendency-self-curiosity" },
  { referencePattern: /^TADB\.(?:1|2)(?:\.|$)/i, rowId: "area-turkish-listening-viewing" },
  { referencePattern: /^TAOB\.(?:1|2|4)(?:\.|$)/i, rowId: "area-turkish-reading" },
  { referencePattern: /^TAKB\.2(?:\.|$)/i, rowId: "area-turkish-speaking" },
  { referencePattern: /^TAEOB\.6(?:\.|$)/i, rowId: "area-turkish-early-literacy" },
  { referencePattern: /^MAB\.1(?:\.|$)/i, rowId: "area-math-counting" },
  { referencePattern: /^MAB\.2(?:\.|$)/i, rowId: "area-math-reasoning" },
  { referencePattern: /^MAB\.12(?:\.|$)/i, rowId: "area-math-data-decisions" },
  { referencePattern: /^FAB\.1(?:\.|$)/i, rowId: "area-science-observation" },
  { referencePattern: /^SAB\.2(?:\.|$)/i, rowId: "area-social-chronology" },
  { referencePattern: /^SAB\.4(?:\.|$)/i, rowId: "area-social-evidence-inquiry" },
  { referencePattern: /^SAB\.8(?:\.|$)/i, rowId: "area-social-participation" },
  { referencePattern: /^SAB\.9(?:\.|$)/i, rowId: "area-social-spatial" },
  { referencePattern: /^SAB\.(?:15|17)(?:\.|$)/i, rowId: "area-social-map" },
  { referencePattern: /^SAB\.20(?:\.|$)/i, rowId: "area-social-critical-sociological" },
  { referencePattern: /^HSAB\.5(?:\.|$)/i, rowId: "area-movement-psychomotor" },
  { referencePattern: /^HSAB\.(?:10|11)(?:\.|$)/i, rowId: "area-movement-health" },
  { referencePattern: /^SNAB\.4(?:\.|$)/i, rowId: "area-art-practice" },
  { referencePattern: /^MDB\.3(?:\.|$)/i, rowId: "area-music-listen" },
  { referencePattern: /^MÇB\.1(?:\.|$)/i, rowId: "area-music-play" },
  { referencePattern: /^SDB2\.1(?:\.|$)/i, rowId: "sdo-communication" },
  { referencePattern: /^D4\.2(?:\.|$)/i, rowId: "value-friendship-effective-communication" },
  { referencePattern: /^OB4\.2(?:\.|$)/i, rowId: "literacy-visual-interpret" },
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();

function recordObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} eksik veya geçersiz.`);
  }
  return value.trim();
}

function parsePersistedProgramComponents(
  value: unknown,
): PersistedMonthlyPlanProgramComponent[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Kalıcı aylık plan program bileşenleri dizi olmalıdır.");
  }
  const ids = new Set<string>();
  const codes = new Set<string>();
  return value.map((candidate, index) => {
    const component = recordObject(candidate);
    if (!component) {
      throw new Error(`Kalıcı aylık plan program bileşeni ${index + 1} geçersiz.`);
    }
    const id = requiredString(component.id, `Program bileşeni ${index + 1} kimliği`);
    const referenceCode = requiredString(
      component.referenceCode,
      `Program bileşeni ${index + 1} kodu`,
    );
    const referenceTitle = requiredString(
      component.referenceTitle,
      `Program bileşeni ${index + 1} başlığı`,
    );
    if (ids.has(id) || codes.has(referenceCode)) {
      throw new Error("Kalıcı aylık plan program bileşenleri mükerrer olamaz.");
    }
    ids.add(id);
    codes.add(referenceCode);
    if (
      component.framework !== "tymm" ||
      component.referenceOrigin !== "official-catalog" ||
      component.officialCatalogVerified !== true ||
      component.verificationStatus !== "official-source-checked"
    ) {
      throw new Error(
        "Ek 18 işareti yalnız resmî kaynağı kontrol edilmiş TYMM program bileşeninden üretilebilir.",
      );
    }
    return {
      id,
      referenceCode,
      referenceTitle,
      framework: "tymm",
      catalogId: requiredString(
        component.catalogId,
        `Program bileşeni ${index + 1} katalog kimliği`,
      ),
      sourceVersion: requiredString(
        component.sourceVersion,
        `Program bileşeni ${index + 1} kaynak sürümü`,
      ),
      referenceOrigin: "official-catalog",
      officialCatalogVerified: true,
      verificationStatus: "official-source-checked",
    };
  });
}

export async function loadMonthlyEvaluationExportSource(
  store: LocalDataStore,
  monthlyPlanId: string,
): Promise<MonthlyEvaluationExportSource> {
  const reviewContext = await loadPremiumMonthlyReviewContext(store, monthlyPlanId);
  const snapshot = await store.readSnapshot();
  const monthlyPlans = snapshot.plans.filter(
    (record) =>
      record.id === reviewContext.monthlyPlanId &&
      record.planType === "monthly" &&
      typeof record.deletedAt !== "string",
  );
  if (monthlyPlans.length !== 1) {
    throw new Error("Ek 18 için tek ve etkin bir kalıcı aylık plan kaydı gereklidir.");
  }
  const monthly = monthlyPlans[0]!;
  const title = requiredString(monthly.title, "Kalıcı aylık plan başlığı");
  const periodStart = requiredString(
    monthly.periodStart,
    "Kalıcı aylık plan başlangıcı",
  );
  const periodEnd = requiredString(monthly.periodEnd, "Kalıcı aylık plan bitişi");
  if (
    title !== reviewContext.title ||
    periodStart !== reviewContext.periodStart ||
    periodEnd !== reviewContext.periodEnd
  ) {
    throw new Error(
      "Aylık değerlendirme context'i kalıcı aylık plan başlık ve dönem kimliğiyle uyuşmuyor.",
    );
  }
  const contentPackSnapshot = recordObject(monthly.contentPackSnapshot);
  if (!contentPackSnapshot) {
    throw new Error("Ek 18 için kalıcı aylık plan içerik paketi snapshot'ı gereklidir.");
  }
  const sku = requiredString(
    contentPackSnapshot.sku,
    "Kalıcı aylık plan paket SKU'su",
  );
  if (sku !== "TYMM-6072") {
    throw new Error("Ek 18 kaynağı desteklenmeyen bir kalıcı paket SKU'su taşıyor.");
  }
  return {
    reviewContext,
    persistedMonthlyPlan: {
      id: reviewContext.monthlyPlanId,
      title,
      periodStart,
      periodEnd,
      contentPackId: requiredString(
        monthly.contentPackId,
        "Kalıcı aylık plan paket kimliği",
      ),
      contentPackVersion: requiredString(
        monthly.contentPackVersion,
        "Kalıcı aylık plan paket sürümü",
      ),
      contentPackSnapshot: {
        id: requiredString(contentPackSnapshot.id, "Kalıcı paket snapshot kimliği"),
        version: requiredString(
          contentPackSnapshot.version,
          "Kalıcı paket snapshot sürümü",
        ),
        contentReleaseId: requiredString(
          contentPackSnapshot.contentReleaseId,
          "Kalıcı paket yayın kimliği",
        ),
        manifestDigest: requiredString(
          contentPackSnapshot.manifestDigest,
          "Kalıcı paket manifest özeti",
        ),
        sku: "TYMM-6072",
        academicRelease: requiredString(
          contentPackSnapshot.academicRelease,
          "Kalıcı paket akademik sürümü",
        ),
      },
      programComponents: parsePersistedProgramComponents(monthly.curriculumTargets),
    },
  };
}

function requiredIsoTimestamp(value: string, label: string): string {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`${label} geçerli bir UTC zaman damgası olmalıdır.`);
  }
  return value;
}

function monthForPeriod(periodStart: string): {
  label: string;
  columnIndex: number;
  monthKey: string;
} {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(periodStart);
  if (!match) throw new Error("Aylık plan başlangıcı civil_date biçiminde olmalıdır.");
  const month = Number(match[2]);
  const columnIndex = MONTHS.findIndex((item) => item.month === month);
  if (columnIndex < 0) {
    throw new Error("Ek 18 yalnız Eylül-Haziran eğitim ayları için hazırlanabilir.");
  }
  return {
    label: MONTHS[columnIndex]!.label,
    columnIndex,
    monthKey: `${match[1]}-${match[2]}`,
  };
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return leftSet.size === left.length && right.every((value) => leftSet.has(value));
}

function coverageMatches(
  left: PremiumMonthlyEvaluation["children"]["coverage"],
  right: PremiumMonthlyEvaluation["children"]["coverage"],
): boolean {
  return (
    left.observationCount === right.observationCount &&
    left.anecdotalObservationCount === right.anecdotalObservationCount &&
    left.programLinkedObservationCount === right.programLinkedObservationCount &&
    left.curriculumLinkCount === right.curriculumLinkCount &&
    left.distinctCivilDateCount === right.distinctCivilDateCount &&
    left.distinctWeekCount === right.distinctWeekCount &&
    left.distinctStudentCount === right.distinctStudentCount &&
    left.distinctEnvironmentCount === right.distinctEnvironmentCount &&
    left.activeStudentCount === right.activeStudentCount &&
    left.coveredActiveStudentCount === right.coveredActiveStudentCount &&
    sameStringSet(left.activeStudentIds, right.activeStudentIds) &&
    sameStringSet(left.coveredActiveStudentIds, right.coveredActiveStudentIds) &&
    sameStringSet(left.uncoveredActiveStudentIds, right.uncoveredActiveStudentIds)
  );
}

function selectedEvidence(
  context: PremiumMonthlyReviewContext,
  evaluation: PremiumMonthlyEvaluation,
): {
  observations: PremiumMonthlyReviewObservation[];
  links: PremiumMonthlyReviewObservation["curriculumLinks"];
} {
  const observationById = new Map(
    context.observations.map((observation) => [observation.id, observation]),
  );
  const observations = evaluation.children.observationIds.map((id) => {
    const observation = observationById.get(id);
    if (!observation) {
      throw new Error(
        "Seçili aylık değerlendirme artık bu planın değişmez gözlem zincirinde bulunmayan bir kayıt içeriyor.",
      );
    }
    return observation;
  });
  const requestedLinks = new Set(evaluation.children.curriculumLinkIds);
  const links = observations
    .flatMap((observation) => observation.curriculumLinks)
    .filter((link) => requestedLinks.has(link.id));
  if (
    links.length !== requestedLinks.size ||
    links.some((link) => !UUID_PATTERN.test(link.id))
  ) {
    throw new Error(
      "Seçili aylık değerlendirme artık öğretmen onaylı program bağlantısı zinciriyle uyuşmuyor.",
    );
  }
  const selectedLinkIds = new Set(links.map((link) => link.id));
  if (
    selectedLinkIds.size !== links.length ||
    [...requestedLinks].some((id) => !selectedLinkIds.has(id))
  ) {
    throw new Error("Aylık değerlendirme program bağlantıları mükerrer veya eksik.");
  }
  const observationsWithSelectedLinks = observations.map((observation) => ({
    ...observation,
    curriculumLinks: observation.curriculumLinks.filter((link) =>
      requestedLinks.has(link.id),
    ),
  }));
  const recomputedCoverage = summarizePremiumMonthlyEvidence(
    observationsWithSelectedLinks,
    evaluation.children.coverage.activeStudentIds,
  );
  if (!coverageMatches(recomputedCoverage, evaluation.children.coverage)) {
    throw new Error(
      "Aylık değerlendirme kanıt kapsamı değişmez gözlem ve program bağlantısı zinciriyle uyuşmuyor.",
    );
  }
  return { observations, links };
}

function mapOfficialRows(
  components: readonly PersistedMonthlyPlanProgramComponent[],
): {
  mappedRowIds: string[];
  unmappedComponents: { referenceCode: string; referenceTitle: string }[];
} {
  const mappedRowIds = new Set<string>();
  const unmapped = new Map<string, { referenceCode: string; referenceTitle: string }>();
  components.forEach((component) => {
    const rule = REFERENCE_ROW_RULES.find(({ referencePattern }) =>
      referencePattern.test(component.referenceCode),
    );
    if (rule) {
      mappedRowIds.add(rule.rowId);
      return;
    }
    unmapped.set(component.referenceCode, {
      referenceCode: component.referenceCode,
      referenceTitle: component.referenceTitle,
    });
  });
  return {
    mappedRowIds: [...mappedRowIds].sort(),
    unmappedComponents: [...unmapped.values()].sort((left, right) =>
      left.referenceCode.localeCompare(right.referenceCode, "tr-TR"),
    ),
  };
}

export function prepareMonthlyEvaluationExportDocument(
  pack: PremiumContentPack,
  source: MonthlyEvaluationExportSource,
  access: VerifiedPremiumAccess,
  evaluationId: string,
  format: MonthlyEvaluationExportFormat,
  options: { exportedAt?: string } = {},
): MonthlyEvaluationExportDocument {
  assertVerifiedPremiumAccess(access);
  if (access.grant.accessMode === "trial") {
    throw new Error("Deneme sürümünde Ek 18 PDF ve Word çıktısı kapalıdır.");
  }
  assertPremiumPackActionAccess(access, pack, "export");
  if (format !== "pdf" && format !== "word") {
    throw new Error("Ek 18 dışa aktarma biçimi PDF veya Word olmalıdır.");
  }
  const context = source.reviewContext;
  const persistedPlan = source.persistedMonthlyPlan;
  if (
    persistedPlan.id !== context.monthlyPlanId ||
    persistedPlan.title !== context.title ||
    persistedPlan.periodStart !== context.periodStart ||
    persistedPlan.periodEnd !== context.periodEnd
  ) {
    throw new Error(
      "Ek 18 kaynağı kalıcı aylık plan kimliğiyle değerlendirme context'i arasında tutarsız.",
    );
  }
  if (
    persistedPlan.contentPackId !== pack.id ||
    persistedPlan.contentPackVersion !== pack.version ||
    persistedPlan.contentPackSnapshot.id !== pack.id ||
    persistedPlan.contentPackSnapshot.version !== pack.version ||
    persistedPlan.contentPackSnapshot.contentReleaseId !== pack.contentReleaseId ||
    persistedPlan.contentPackSnapshot.manifestDigest !== pack.manifestDigest ||
    persistedPlan.contentPackSnapshot.sku !== pack.sku ||
    persistedPlan.contentPackSnapshot.academicRelease !== pack.academicRelease
  ) {
    throw new Error(
      "Ek 18 yalnız doğrulanan paketle aynı kimlik ve sürümü taşıyan kalıcı aylık plandan hazırlanabilir.",
    );
  }
  if (
    persistedPlan.programComponents.some(
      (component) =>
        component.catalogId !== pack.catalogId ||
        component.sourceVersion !== pack.catalogSourceVersion,
    )
  ) {
    throw new Error(
      "Kalıcı aylık plan program bileşenlerinden biri doğrulanan paket katalog sürümüyle uyuşmuyor.",
    );
  }
  if (!UUID_PATTERN.test(context.monthlyPlanId)) {
    throw new Error("Ek 18 için geçerli bir kalıcı aylık plan kimliği gereklidir.");
  }
  if (!UUID_PATTERN.test(evaluationId)) {
    throw new Error("Ek 18 için geçerli bir kalıcı aylık değerlendirme kimliği gereklidir.");
  }
  const evaluation = context.evaluations.find(
    (candidate) => candidate.id === evaluationId,
  );
  if (!evaluation) {
    throw new Error(
      "Ek 18 yalnız kaydedilmiş son veya öğretmenin seçtiği geçmiş aylık değerlendirmeden üretilebilir.",
    );
  }
  if (
    evaluation.monthlyPlanId !== context.monthlyPlanId ||
    evaluation.periodStart !== context.periodStart ||
    evaluation.periodEnd !== context.periodEnd
  ) {
    throw new Error("Seçili aylık değerlendirme kalıcı aylık plan kimliğiyle uyuşmuyor.");
  }
  const selected = selectedEvidence(context, evaluation);
  const mapped = mapOfficialRows(persistedPlan.programComponents);
  const month = monthForPeriod(context.periodStart);
  const generatedAt = requiredIsoTimestamp(
    options.exportedAt ?? new Date().toISOString(),
    "Ek 18 üretim zamanı",
  );
  const extension = format === "pdf" ? "pdf" : "docx";
  const manifest: MonthlyEvaluationExportManifest = {
    schemaVersion: 2,
    documentType: "meb-2024-ek18-monthly-plan-control",
    renderingMode: format === "pdf"
      ? "semantic-accessible-reflow"
      : "source-structured-word-reproduction",
    officialSourceFormPageCount: 6,
    outputPagination: format === "pdf"
      ? "content-dependent"
      : "six-source-pages-plus-appendix",
    officialSource: structuredClone(OFFICIAL_SOURCE),
    generatedAt,
    monthlyPlanId: context.monthlyPlanId,
    monthlyEvaluationId: evaluation.id,
    observationIds: [...evaluation.children.observationIds],
    curriculumLinkIds: [...evaluation.children.curriculumLinkIds],
    mappedOfficialRowIds: mapped.mappedRowIds,
    programComponentEvidenceStatus: persistedPlan.programComponents.length === 0
      ? "verified-no-components"
      : mapped.unmappedComponents.length > 0
        ? "verified-partial-mapping"
        : "verified-complete-mapping",
    persistedProgramComponents: persistedPlan.programComponents.map(
      ({ referenceCode, referenceTitle }) => ({ referenceCode, referenceTitle }),
    ),
    unmappedPlanComponents: mapped.unmappedComponents,
  };
  return {
    format,
    fileName: `MaarifOS_Ek18_Aylik_Plan_Kontrol_${month.monthKey}_${evaluation.id.slice(0, 8)}.${extension}`,
    monthLabel: month.label,
    monthColumnIndex: month.columnIndex,
    monthlyPlan: {
      id: persistedPlan.id,
      title: persistedPlan.title,
      periodStart: persistedPlan.periodStart,
      periodEnd: persistedPlan.periodEnd,
    },
    evaluation: structuredClone(evaluation),
    selectedObservations: structuredClone(selected.observations),
    mappedOfficialRowIds: mapped.mappedRowIds,
    manifest,
  };
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function littleEndian(value: number, size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  for (let index = 0; index < size; index += 1) {
    bytes[index] = (value >>> (index * 8)) & 0xff;
  }
  return bytes;
}

function joinBytes(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(
  files: readonly { name: string; contents: string }[],
): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.contents);
    const checksum = crc32(data);
    const local = joinBytes([
      littleEndian(0x04034b50, 4), littleEndian(20, 2), littleEndian(0x0800, 2),
      littleEndian(0, 2), littleEndian(0, 2), littleEndian(33, 2),
      littleEndian(checksum, 4), littleEndian(data.length, 4), littleEndian(data.length, 4),
      littleEndian(name.length, 2), littleEndian(0, 2), name, data,
    ]);
    localParts.push(local);
    centralParts.push(joinBytes([
      littleEndian(0x02014b50, 4), littleEndian(20, 2), littleEndian(20, 2),
      littleEndian(0x0800, 2), littleEndian(0, 2), littleEndian(0, 2), littleEndian(33, 2),
      littleEndian(checksum, 4), littleEndian(data.length, 4), littleEndian(data.length, 4),
      littleEndian(name.length, 2), littleEndian(0, 2), littleEndian(0, 2),
      littleEndian(0, 2), littleEndian(0, 2), littleEndian(0, 4), littleEndian(offset, 4), name,
    ]));
    offset += local.length;
  });
  const central = joinBytes(centralParts);
  return joinBytes([
    ...localParts,
    central,
    littleEndian(0x06054b50, 4), littleEndian(0, 2), littleEndian(0, 2),
    littleEndian(files.length, 2), littleEndian(files.length, 2),
    littleEndian(central.length, 4), littleEndian(offset, 4), littleEndian(0, 2),
  ]);
}

const TABLE_WIDTHS = {
  group: 760,
  label: 3906,
  month: 572,
  total: 10386,
  indent: 80,
} as const;

function docxRun(
  text: string,
  options: {
    bold?: boolean;
    color?: string;
    sizeHalfPoints?: number;
  } = {},
): string {
  const properties = [
    '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial"/>',
    options.bold ? "<w:b/>" : "",
    options.color ? `<w:color w:val="${options.color}"/>` : "",
    `<w:sz w:val="${options.sizeHalfPoints ?? 17}"/>`,
    `<w:szCs w:val="${options.sizeHalfPoints ?? 17}"/>`,
  ].join("");
  return `<w:r><w:rPr>${properties}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function docxParagraph(
  text: string,
  options: {
    align?: "left" | "center";
    bold?: boolean;
    color?: string;
    sizeHalfPoints?: number;
    before?: number;
    after?: number;
    keepNext?: boolean;
    pageBreakBefore?: boolean;
    style?: string;
  } = {},
): string {
  const pPr = [
    options.style ? `<w:pStyle w:val="${options.style}"/>` : "",
    options.align ? `<w:jc w:val="${options.align}"/>` : "",
    `<w:spacing w:before="${options.before ?? 0}" w:after="${options.after ?? 80}" w:line="240" w:lineRule="auto"/>`,
    options.keepNext ? "<w:keepNext/>" : "",
    options.pageBreakBefore ? "<w:pageBreakBefore/>" : "",
  ].join("");
  return `<w:p><w:pPr>${pPr}</w:pPr>${docxRun(text, options)}</w:p>`;
}

function tableCell(
  contents: string,
  width: number,
  options: {
    fill?: string;
    textDirection?: "btLr";
    verticalAlign?: "center";
    gridSpan?: number;
    merge?: "restart" | "continue";
  } = {},
): string {
  const tcPr = [
    `<w:tcW w:w="${width}" w:type="dxa"/>`,
    options.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${options.fill}"/>` : "",
    options.textDirection ? `<w:textDirection w:val="${options.textDirection}"/>` : "",
    options.verticalAlign ? `<w:vAlign w:val="${options.verticalAlign}"/>` : "",
    options.gridSpan ? `<w:gridSpan w:val="${options.gridSpan}"/>` : "",
    options.merge === "restart" ? '<w:vMerge w:val="restart"/>' : "",
    options.merge === "continue" ? "<w:vMerge/>" : "",
    '<w:tcMar><w:top w:w="40" w:type="dxa"/><w:start w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:end w:w="80" w:type="dxa"/></w:tcMar>',
  ].join("");
  return `<w:tc><w:tcPr>${tcPr}</w:tcPr>${contents}</w:tc>`;
}

function ek18TableXml(
  table: Ek18Table,
  document: MonthlyEvaluationExportDocument,
): string {
  const marked = new Set(document.mappedOfficialRowIds);
  const grid = [
    TABLE_WIDTHS.group,
    TABLE_WIDTHS.label,
    ...MONTHS.map(() => TABLE_WIDTHS.month),
  ].map((width) => `<w:gridCol w:w="${width}"/>`).join("");
  const header = `<w:tr>${tableCell(
    docxParagraph(table.title, {
      align: "center",
      bold: true,
      color: "FFFFFF",
      sizeHalfPoints: 19,
      after: 0,
    }),
    TABLE_WIDTHS.group + TABLE_WIDTHS.label,
    { fill: "F4511E", gridSpan: 2, verticalAlign: "center" },
  )}${MONTHS.map(({ label }) => tableCell(
    docxParagraph(label, {
      align: "center",
      bold: true,
      color: "FFFFFF",
      sizeHalfPoints: 13,
      after: 0,
    }),
    TABLE_WIDTHS.month,
    { fill: "F4511E", verticalAlign: "center" },
  )).join("")}</w:tr>`;
  const body = table.groups.map((group) => group.rows.map((row, rowIndex) => {
    const groupCell = tableCell(
      rowIndex === 0
        ? docxParagraph(group.label, {
            align: "center",
            bold: true,
            sizeHalfPoints: 14,
            after: 0,
          })
        : docxParagraph("", { after: 0 }),
      TABLE_WIDTHS.group,
      {
        fill: "F2DDD3",
        textDirection: "btLr",
        verticalAlign: "center",
        merge: rowIndex === 0 ? "restart" : "continue",
      },
    );
    const labelCell = tableCell(
      docxParagraph(row.label, {
        sizeHalfPoints: 16,
        after: 0,
      }),
      TABLE_WIDTHS.label,
      { verticalAlign: "center" },
    );
    const monthCells = MONTHS.map((_, monthIndex) => tableCell(
      docxParagraph(
        marked.has(row.id) && monthIndex === document.monthColumnIndex ? "X" : "",
        {
          align: "center",
          bold: true,
          color: marked.has(row.id) && monthIndex === document.monthColumnIndex
            ? "F4511E"
            : "222222",
          sizeHalfPoints: 18,
          after: 0,
        },
      ),
      TABLE_WIDTHS.month,
      { verticalAlign: "center" },
    )).join("");
    return `<w:tr>${groupCell}${labelCell}${monthCells}</w:tr>`;
  }).join("")).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="${TABLE_WIDTHS.total}" w:type="dxa"/><w:tblInd w:w="${TABLE_WIDTHS.indent}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="12" w:color="F4511E"/><w:left w:val="single" w:sz="12" w:color="F4511E"/><w:bottom w:val="single" w:sz="12" w:color="F4511E"/><w:right w:val="single" w:sz="12" w:color="F4511E"/><w:insideH w:val="single" w:sz="4" w:color="AAAAAA"/><w:insideV w:val="single" w:sz="4" w:color="AAAAAA"/></w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${header}${body}</w:tbl>`;
}

function statusLabel(status: PremiumMonthlyCriterionStatus): string {
  if (status === "observed-working") return "İşleyen yön";
  if (status === "needs-adjustment") return "Uyarlama gerekiyor";
  return "Bu ay gözlenmedi";
}

function programComponentExplanation(
  document: MonthlyEvaluationExportDocument,
): string | null {
  if (document.manifest.programComponentEvidenceStatus === "verified-no-components") {
    return "Ek 18 işaret açıklaması: Kalıcı aylık plan snapshot'ında resmî kaynağı doğrulanmış program bileşeni bulunmadığı için çizelge satırları boş bırakıldı; değerlendirme anlatısından işaret uydurulmadı.";
  }
  if (document.manifest.programComponentEvidenceStatus === "verified-partial-mapping") {
    const components = document.manifest.unmappedPlanComponents
      .map((component) => `${component.referenceCode} - ${component.referenceTitle}`)
      .join("; ");
    return `Ek 18 işaret açıklaması: Kalıcı aylık plandaki şu doğrulanmış bileşenler mevcut resmî satır eşleme sözlüğüyle kanıtlanamadığı için matriste işaretlenmedi: ${components}.`;
  }
  return null;
}

function appendixDocumentXml(document: MonthlyEvaluationExportDocument): string {
  const evaluation = document.evaluation;
  const coverage = evaluation.children.coverage;
  const childrenEvidence = evaluation.children.evidenceState === "sufficient-evidence"
    ? "Seçili kanıt yeterli"
    : "Kanıt yetersiz - kesin beceri hükmü kurulmadı";
  const programLabels = new Map(
    PREMIUM_MONTHLY_PROGRAM_CRITERIA.map((criterion) => [criterion.id, criterion.label]),
  );
  const teacherLabels = new Map(
    PREMIUM_MONTHLY_TEACHER_CRITERIA.map((criterion) => [criterion.id, criterion.label]),
  );
  const paragraphs = [
    docxParagraph("ÖĞRETMEN DEĞERLENDİRME EKİ", {
      align: "center",
      bold: true,
      color: "F4511E",
      sizeHalfPoints: 30,
      after: 160,
      keepNext: true,
    }),
    docxParagraph(
      "Bu sayfa resmî Ek 18 formunun parçası değildir. MaarifOS'ta öğretmen tarafından kaydedilen üç boyutlu aylık değerlendirmeyi çocuklar, program ve öğretmen yönlerini birbirine karıştırmadan taşır.",
      { sizeHalfPoints: 19, after: 160 },
    ),
    docxParagraph(`Aylık plan: ${document.monthlyPlan.title}`, {
      bold: true,
      sizeHalfPoints: 19,
      after: 40,
    }),
    docxParagraph(
      `Dönem: ${document.monthlyPlan.periodStart} - ${document.monthlyPlan.periodEnd} · Kayıt zamanı: ${evaluation.createdAt}`,
      { color: "666666", sizeHalfPoints: 17, after: 160 },
    ),
    ...(programComponentExplanation(document)
      ? [
          docxParagraph(programComponentExplanation(document)!, {
            color: "8A4B08",
            sizeHalfPoints: 17,
            after: 160,
          }),
        ]
      : []),
    docxParagraph("1. ÇOCUKLAR YÖNÜNDEN DEĞERLENDİRME", {
      style: "Heading1",
      bold: true,
      color: "F4511E",
      sizeHalfPoints: 22,
      before: 100,
      after: 80,
      keepNext: true,
    }),
    docxParagraph(`Kanıt durumu: ${childrenEvidence}`, {
      bold: true,
      sizeHalfPoints: 18,
      after: 60,
    }),
    docxParagraph(evaluation.children.narrative || "Öğretmen anlatısı kaydedilmedi.", {
      sizeHalfPoints: 18,
      after: 80,
    }),
    docxParagraph(
      `Kanıt kapsamı: ${coverage.observationCount} gözlem · ${coverage.anecdotalObservationCount} anekdot · ${coverage.distinctCivilDateCount} gün · ${coverage.distinctWeekCount} hafta · ${coverage.coveredActiveStudentCount}/${coverage.activeStudentCount} aktif çocuk`,
      { color: "666666", sizeHalfPoints: 16, after: 120 },
    ),
    docxParagraph("2. PROGRAM YÖNÜNDEN DEĞERLENDİRME", {
      style: "Heading1",
      bold: true,
      color: "F4511E",
      sizeHalfPoints: 22,
      before: 100,
      after: 80,
      keepNext: true,
    }),
    docxParagraph(evaluation.program.narrative, {
      sizeHalfPoints: 18,
      after: 80,
    }),
    ...evaluation.program.criteria.map((criterion) =>
      docxParagraph(
        `${programLabels.get(criterion.criterionId) ?? criterion.criterionId}: ${statusLabel(criterion.status)}`,
        { sizeHalfPoints: 16, after: 40 },
      ),
    ),
    docxParagraph("3. ÖĞRETMEN YÖNÜNDEN DEĞERLENDİRME", {
      style: "Heading1",
      bold: true,
      color: "F4511E",
      sizeHalfPoints: 22,
      before: 120,
      after: 80,
      keepNext: true,
    }),
    docxParagraph(evaluation.teacher.narrative, {
      sizeHalfPoints: 18,
      after: 80,
    }),
    ...evaluation.teacher.criteria.map((criterion) =>
      docxParagraph(
        `${teacherLabels.get(criterion.criterionId) ?? criterion.criterionId}: ${statusLabel(criterion.status)}`,
        { sizeHalfPoints: 16, after: 40 },
      ),
    ),
    docxParagraph("SONRAKİ AY İÇİN ÖĞRETMEN ÖNERİSİ", {
      style: "Heading1",
      bold: true,
      color: "F4511E",
      sizeHalfPoints: 22,
      before: 120,
      after: 80,
      keepNext: true,
    }),
    docxParagraph(evaluation.nextMonthRecommendation, {
      sizeHalfPoints: 18,
      after: 120,
    }),
    docxParagraph(
      "Kaynak: T.C. Millî Eğitim Bakanlığı, Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı (2024), s. 136-139 ve Ek 18, s. 344-349.",
      { color: "666666", sizeHalfPoints: 15, before: 120, after: 0 },
    ),
  ];
  return paragraphs.join("");
}

function customManifestXml(manifest: MonthlyEvaluationExportManifest): string {
  const idElements = (name: string, ids: readonly string[]) =>
    `<maarifos:${name}>${ids.map((id) => `<maarifos:id>${xmlEscape(id)}</maarifos:id>`).join("")}</maarifos:${name}>`;
  const programComponents = (
    name: string,
    components: readonly { referenceCode: string; referenceTitle: string }[],
  ) => `<maarifos:${name}>${components.map((component) => `<maarifos:component><maarifos:referenceCode>${xmlEscape(component.referenceCode)}</maarifos:referenceCode><maarifos:referenceTitle>${xmlEscape(component.referenceTitle)}</maarifos:referenceTitle></maarifos:component>`).join("")}</maarifos:${name}>`;
  const teacherOwnedIntegrity = manifest.sourcePlanRevisionNumber === undefined
    ? ""
    : `<maarifos:sourcePlanRevisionNumber>${manifest.sourcePlanRevisionNumber}</maarifos:sourcePlanRevisionNumber><maarifos:evidenceLastModifiedAt>${xmlEscape(manifest.evidenceLastModifiedAt ?? "")}</maarifos:evidenceLastModifiedAt><maarifos:evidenceMutationPolicy>${manifest.evidenceMutationPolicy ?? "fail-closed-after-evaluation"}</maarifos:evidenceMutationPolicy>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><maarifos:monthlyEvaluationExportManifest xmlns:maarifos="https://maarifos.local/schema/monthly-evaluation-export/2"><maarifos:schemaVersion>2</maarifos:schemaVersion><maarifos:documentType>${manifest.documentType}</maarifos:documentType><maarifos:renderingMode>${manifest.renderingMode}</maarifos:renderingMode><maarifos:officialSourceFormPageCount>${manifest.officialSourceFormPageCount}</maarifos:officialSourceFormPageCount><maarifos:outputPagination>${manifest.outputPagination}</maarifos:outputPagination><maarifos:generatedAt>${xmlEscape(manifest.generatedAt)}</maarifos:generatedAt><maarifos:monthlyPlanId>${xmlEscape(manifest.monthlyPlanId)}</maarifos:monthlyPlanId><maarifos:monthlyEvaluationId>${xmlEscape(manifest.monthlyEvaluationId)}</maarifos:monthlyEvaluationId>${teacherOwnedIntegrity}${idElements("observationIds", manifest.observationIds)}${idElements("curriculumLinkIds", manifest.curriculumLinkIds)}<maarifos:programComponentEvidenceStatus>${manifest.programComponentEvidenceStatus}</maarifos:programComponentEvidenceStatus>${programComponents("persistedProgramComponents", manifest.persistedProgramComponents)}<maarifos:mappedOfficialRowIds>${manifest.mappedOfficialRowIds.map((id) => `<maarifos:id>${xmlEscape(id)}</maarifos:id>`).join("")}</maarifos:mappedOfficialRowIds>${programComponents("unmappedPlanComponents", manifest.unmappedPlanComponents)}<maarifos:officialSource authority="${xmlEscape(manifest.officialSource.authority)}" version="${manifest.officialSource.version}" evaluationPages="${manifest.officialSource.evaluationPages}" annexPages="${manifest.officialSource.annexPages}">${xmlEscape(manifest.officialSource.annex)}</maarifos:officialSource></maarifos:monthlyEvaluationExportManifest>`;
}

export function createMonthlyEvaluationDocx(
  document: MonthlyEvaluationExportDocument,
): Uint8Array {
  const officialPages = EK18_PAGES.map((page, index) => {
    const pageBreak = index > 0
      ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
      : "";
    const intro = page.intro
      ? [
          docxParagraph("EK 18 : AYLIK PLAN KONTROL ÇİZELGESİ", {
            align: "center",
            bold: true,
            color: "F4511E",
            sizeHalfPoints: 30,
            after: 180,
            keepNext: true,
          }),
          docxParagraph("Sayın Öğretmen,", {
            sizeHalfPoints: 18,
            after: 120,
          }),
          docxParagraph(
            "Aylık Plan Kontrol Çizelgesinde Türkiye Yüzyılı Maarif Modeli kapsamındaki alan becerileri, sosyal duygusal öğrenme becerileri, değerler, kavramsal beceriler, okuryazarlık becerileri ile eğilimler yer almaktadır. Aylık planda ele alınan program bileşenlerinin form üzerinde işaretlenmesi beklenmektedir. Bu sayede sonraki aylık planların hazırlanma süreci kolaylaşacak, yıl boyunca çocuklara kazandırılması planlanan becerilerin bütüncül olarak görülmesi mümkün olacaktır.",
            { sizeHalfPoints: 17, after: 160 },
          ),
        ].join("")
      : "";
    const tables = page.tables.map((table, tableIndex) =>
      `${tableIndex > 0 ? docxParagraph("", { after: 80 }) : ""}${ek18TableXml(table, document)}`,
    ).join("");
    const generalEvaluation = page.generalEvaluation
      ? `${docxParagraph("", { after: 80 })}<w:tbl><w:tblPr><w:tblW w:w="${TABLE_WIDTHS.total}" w:type="dxa"/><w:tblInd w:w="${TABLE_WIDTHS.indent}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="12" w:color="F4511E"/><w:left w:val="single" w:sz="12" w:color="F4511E"/><w:bottom w:val="single" w:sz="12" w:color="F4511E"/><w:right w:val="single" w:sz="12" w:color="F4511E"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="${TABLE_WIDTHS.total}"/></w:tblGrid><w:tr>${tableCell(docxParagraph("GENEL DEĞERLENDİRME", { align: "center", color: "FFFFFF", bold: true, sizeHalfPoints: 20, after: 0 }), TABLE_WIDTHS.total, { fill: "F4511E", verticalAlign: "center" })}</w:tr><w:tr>${tableCell(docxParagraph(officialGeneralEvaluationDocxText(document.evaluation.program.narrative), { sizeHalfPoints: 18, after: 0 }), TABLE_WIDTHS.total, { verticalAlign: "center" })}</w:tr></w:tbl>`
      : "";
    return `${pageBreak}${intro}${tables}${generalEvaluation}`;
  }).join("");
  const appendix = `<w:p><w:r><w:br w:type="page"/></w:r></w:p>${appendixDocumentXml(document)}`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${officialPages}${appendix}<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="700" w:right="720" w:bottom="700" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial"/><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="80"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="F4511E"/><w:sz w:val="22"/></w:rPr></w:style></w:styles>`;
  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="777777"/><w:sz w:val="14"/></w:rPr><w:t>MaarifOS · Ek 18 · Sayfa </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:sz w:val="14"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`;
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Ek 18 - Aylık Plan Kontrol Çizelgesi</dc:title><dc:creator>MaarifOS</dc:creator><dc:subject>MEB 2024 Ek 18 ve ayrı öğretmen değerlendirme eki</dc:subject><dcterms:created xsi:type="dcterms:W3CDTF">${xmlEscape(document.manifest.generatedAt)}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${xmlEscape(document.manifest.generatedAt)}</dcterms:modified></cp:coreProperties>`;
  return createZip([
    {
      name: "[Content_Types].xml",
      contents: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/customXml/itemProps1.xml" ContentType="application/vnd.openxmlformats-officedocument.customXmlProperties+xml"/></Types>',
    },
    {
      name: "_rels/.rels",
      contents: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rIdCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
    },
    { name: "docProps/core.xml", contents: coreXml },
    { name: "word/document.xml", contents: documentXml },
    { name: "word/styles.xml", contents: stylesXml },
    { name: "word/footer1.xml", contents: footerXml },
    {
      name: "word/_rels/document.xml.rels",
      contents: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rIdCustomXml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/item1.xml"/></Relationships>',
    },
    { name: "customXml/item1.xml", contents: customManifestXml(document.manifest) },
    {
      name: "customXml/itemProps1.xml",
      contents: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><ds:datastoreItem ds:itemID="{6D35C4A8-361F-4E63-A282-3D5189F27A84}" xmlns:ds="http://schemas.openxmlformats.org/officeDocument/2006/customXml"><ds:schemaRefs><ds:schemaRef ds:uri="https://maarifos.local/schema/monthly-evaluation-export/2"/></ds:schemaRefs></ds:datastoreItem>',
    },
    {
      name: "customXml/_rels/item1.xml.rels",
      contents: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXmlProps" Target="itemProps1.xml"/></Relationships>',
    },
  ]);
}

function base64Bytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]!);
  }
  return btoa(binary);
}

function pdfEscape(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function createImagePdf(
  images: readonly Uint8Array[],
  manifest: MonthlyEvaluationExportManifest,
): Uint8Array {
  const objects: { id: number; bytes: Uint8Array }[] = [];
  const pageIds = images.map((_, index) => 4 + index * 3);
  const manifestBase64 = bytesToBase64(encoder.encode(JSON.stringify(manifest)));
  objects.push({ id: 1, bytes: encoder.encode("<< /Type /Catalog /Pages 2 0 R >>") });
  objects.push({
    id: 2,
    bytes: encoder.encode(`<< /Type /Pages /Count ${images.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`),
  });
  objects.push({
    id: 3,
    bytes: encoder.encode(`<< /Title (${pdfEscape("MaarifOS - MEB 2024 Ek 18 Aylik Plan Kontrol Cizelgesi")}) /Subject (${pdfEscape("Resmi Ek 18 ve ayri ogretmen degerlendirme eki")}) /Producer (MaarifOS) /Keywords (${pdfEscape(`maarifos-manifest-base64:${manifestBase64}`)}) >>`),
  });
  images.forEach((image, index) => {
    const pageId = pageIds[index]!;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const content = encoder.encode("q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ");
    objects.push({
      id: pageId,
      bytes: encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`),
    });
    objects.push({
      id: imageId,
      bytes: joinBytes([
        encoder.encode(`<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),
        image,
        encoder.encode("\nendstream"),
      ]),
    });
    objects.push({
      id: contentId,
      bytes: joinBytes([
        encoder.encode(`<< /Length ${content.length} >>\nstream\n`),
        content,
        encoder.encode("\nendstream"),
      ]),
    });
  });
  objects.sort((left, right) => left.id - right.id);
  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = new Map<number, number>();
  let offset = parts[0]!.length;
  objects.forEach((object) => {
    const prefix = encoder.encode(`${object.id} 0 obj\n`);
    const suffix = encoder.encode("\nendobj\n");
    offsets.set(object.id, offset);
    parts.push(prefix, object.bytes, suffix);
    offset += prefix.length + object.bytes.length + suffix.length;
  });
  const xrefOffset = offset;
  const maxId = objects.at(-1)?.id ?? 0;
  const xref = [`xref\n0 ${maxId + 1}\n`, "0000000000 65535 f \n"];
  for (let id = 1; id <= maxId; id += 1) {
    xref.push(`${String(offsets.get(id) ?? 0).padStart(10, "0")} 00000 n \n`);
  }
  parts.push(encoder.encode(`${xref.join("")}trailer\n<< /Size ${maxId + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return joinBytes(parts);
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];
  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    lines.push(line);
  });
  return lines.length > 0 ? lines : [""];
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = wrapCanvasText(context, text, maxWidth);
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

const GENERAL_EVALUATION_CONTINUATION =
  "[Metnin devamı ayrı Öğretmen Değerlendirme Eki'ndedir.]";

function officialGeneralEvaluationDocxText(text: string): string {
  const characters = [...text];
  if (characters.length <= 520) return text;
  const prefix = characters.slice(0, 440).join("");
  const safePrefix = prefix.replace(/\s+\S*$/, "").trimEnd();
  return `${safePrefix} ${GENERAL_EVALUATION_CONTINUATION}`;
}

function layoutOfficialGeneralEvaluationCanvas(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  boxHeight: number,
): {
  fontSize: number;
  lineHeight: number;
  lines: readonly string[];
  continuedInAppendix: boolean;
} {
  const topPadding = 30;
  const bottomPadding = 15;
  for (let fontSize = 17; fontSize >= 13; fontSize -= 1) {
    const lineHeight = fontSize + 7;
    context.font = `${fontSize}px Arial, sans-serif`;
    const lines = wrapCanvasText(context, text, maxWidth);
    const maxLines = Math.floor(
      (boxHeight - topPadding - bottomPadding) / lineHeight,
    ) + 1;
    if (lines.length <= maxLines) {
      return { fontSize, lineHeight, lines, continuedInAppendix: false };
    }
  }
  const fontSize = 13;
  const lineHeight = 20;
  context.font = `${fontSize}px Arial, sans-serif`;
  const allLines = wrapCanvasText(context, text, maxWidth);
  const continuationLines = wrapCanvasText(
    context,
    GENERAL_EVALUATION_CONTINUATION,
    maxWidth,
  );
  const maxLines = Math.floor(
    (boxHeight - topPadding - bottomPadding) / lineHeight,
  ) + 1;
  const prefixLineCount = Math.max(0, maxLines - continuationLines.length);
  return {
    fontSize,
    lineHeight,
    lines: [...allLines.slice(0, prefixLineCount), ...continuationLines],
    continuedInAppendix: true,
  };
}

function beginCanvasPage(context: CanvasRenderingContext2D): void {
  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 1240, 1754);
  context.restore();
}

function drawTableCanvas(
  context: CanvasRenderingContext2D,
  table: Ek18Table,
  document: MonthlyEvaluationExportDocument,
  yStart: number,
  availableHeight: number,
): number {
  const x = 55;
  const groupWidth = 88;
  const labelWidth = 407;
  const monthWidth = 63.5;
  const totalWidth = groupWidth + labelWidth + monthWidth * 10;
  const headerHeight = 50;
  const marked = new Set(document.mappedOfficialRowIds);
  let y = yStart;
  context.save();
  context.font = '700 12px Arial, sans-serif';
  const desiredGroupHeights = table.groups.map((group) => {
    const longestWordWidth = Math.max(
      ...group.label.split(/\s+/).map((word) => context.measureText(word).width),
    );
    return Math.max(group.rows.length * 31, longestWordWidth + 18);
  });
  const desiredTotalHeight = desiredGroupHeights.reduce(
    (sum, height) => sum + height,
    0,
  );
  const groupHeightScale = (availableHeight - headerHeight) / desiredTotalHeight;
  const groupHeights = desiredGroupHeights.map((height) =>
    height * groupHeightScale,
  );
  context.fillStyle = "#f4511e";
  context.fillRect(x, y, totalWidth, headerHeight);
  context.strokeStyle = "#f4511e";
  context.lineWidth = 2;
  context.strokeRect(x, y, totalWidth, headerHeight);
  context.fillStyle = "#ffffff";
  context.font = '700 20px Arial, sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(table.title, x + (groupWidth + labelWidth) / 2, y + headerHeight / 2);
  MONTHS.forEach(({ label }, index) => {
    const cellX = x + groupWidth + labelWidth + index * monthWidth;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1;
    context.strokeRect(cellX, y, monthWidth, headerHeight);
    context.fillStyle = "#ffffff";
    context.font = '700 13px Arial, sans-serif';
    context.fillText(label, cellX + monthWidth / 2, y + headerHeight / 2);
  });
  y += headerHeight;
  table.groups.forEach((group, groupIndex) => {
    const groupHeight = groupHeights[groupIndex]!;
    const rowHeight = groupHeight / group.rows.length;
    context.fillStyle = "#f2ddd3";
    context.fillRect(x, y, groupWidth, groupHeight);
    context.strokeStyle = "#f4511e";
    context.lineWidth = 1.5;
    context.strokeRect(x, y, groupWidth, groupHeight);
    context.save();
    context.translate(x + groupWidth / 2, y + groupHeight / 2);
    context.rotate(-Math.PI / 2);
    context.fillStyle = "#222222";
    context.textAlign = "center";
    context.textBaseline = "middle";
    let groupLabelFontSize = 12;
    let groupLabelLineHeight = 14;
    let groupLabelLines: string[] = [];
    do {
      context.font = `700 ${groupLabelFontSize}px Arial, sans-serif`;
      groupLabelLineHeight = groupLabelFontSize + 2;
      groupLabelLines = wrapCanvasText(
        context,
        group.label,
        Math.max(28, groupHeight - 16),
      );
      if (
        groupLabelLines.length * groupLabelLineHeight <= groupWidth - 12 ||
        groupLabelFontSize <= 8
      ) {
        break;
      }
      groupLabelFontSize -= 1;
    } while (true);
    const groupLabelStart = -(
      (groupLabelLines.length - 1) * groupLabelLineHeight
    ) / 2;
    groupLabelLines.forEach((line, lineIndex) =>
      context.fillText(
        line,
        0,
        groupLabelStart + lineIndex * groupLabelLineHeight,
        Math.max(28, groupHeight - 16),
      ),
    );
    context.restore();
    group.rows.forEach((row) => {
      context.fillStyle = "#ffffff";
      context.fillRect(x + groupWidth, y, labelWidth, rowHeight);
      context.strokeStyle = "#aaaaaa";
      context.lineWidth = 0.8;
      context.strokeRect(x + groupWidth, y, labelWidth, rowHeight);
      context.fillStyle = "#222222";
      context.font = '15px Arial, sans-serif';
      context.textAlign = "left";
      context.textBaseline = "middle";
      const labelLines = wrapCanvasText(context, row.label, labelWidth - 16);
      const labelLineHeight = 17;
      const labelY = y + rowHeight / 2 - ((labelLines.length - 1) * labelLineHeight) / 2;
      labelLines.slice(0, 2).forEach((line, lineIndex) =>
        context.fillText(line, x + groupWidth + 8, labelY + lineIndex * labelLineHeight),
      );
      MONTHS.forEach((_, monthIndex) => {
        const cellX = x + groupWidth + labelWidth + monthIndex * monthWidth;
        context.fillStyle = "#ffffff";
        context.fillRect(cellX, y, monthWidth, rowHeight);
        context.strokeStyle = "#aaaaaa";
        context.lineWidth = 0.8;
        context.strokeRect(cellX, y, monthWidth, rowHeight);
        if (marked.has(row.id) && monthIndex === document.monthColumnIndex) {
          context.fillStyle = "#f4511e";
          context.font = '700 19px Arial, sans-serif';
          context.textAlign = "center";
          context.fillText("X", cellX + monthWidth / 2, y + rowHeight / 2);
        }
      });
      y += rowHeight;
    });
  });
  context.strokeStyle = "#f4511e";
  context.lineWidth = 2;
  context.strokeRect(x, yStart, totalWidth, y - yStart);
  context.restore();
  return y;
}

interface AppendixBlock {
  heading: string;
  paragraphs: readonly string[];
}

function appendixBlocks(document: MonthlyEvaluationExportDocument): AppendixBlock[] {
  const evaluation = document.evaluation;
  const coverage = evaluation.children.coverage;
  const programLabels = new Map(
    PREMIUM_MONTHLY_PROGRAM_CRITERIA.map((criterion) => [criterion.id, criterion.label]),
  );
  const teacherLabels = new Map(
    PREMIUM_MONTHLY_TEACHER_CRITERIA.map((criterion) => [criterion.id, criterion.label]),
  );
  return [
    {
      heading: "Belgenin sınırı",
      paragraphs: [
        "Bu sayfa resmî Ek 18 formunun parçası değildir. MaarifOS'ta öğretmen tarafından kaydedilen üç boyutlu aylık değerlendirmeyi çocuklar, program ve öğretmen yönlerini birbirine karıştırmadan taşır.",
        `Aylık plan: ${document.monthlyPlan.title}`,
        `Dönem: ${document.monthlyPlan.periodStart} - ${document.monthlyPlan.periodEnd} · Kayıt zamanı: ${evaluation.createdAt}`,
        ...(programComponentExplanation(document)
          ? [programComponentExplanation(document)!]
          : []),
      ],
    },
    {
      heading: "1. Çocuklar yönünden değerlendirme",
      paragraphs: [
        evaluation.children.evidenceState === "sufficient-evidence"
          ? "Kanıt durumu: Seçili kanıt yeterli"
          : "Kanıt durumu: Kanıt yetersiz - kesin beceri hükmü kurulmadı",
        evaluation.children.narrative || "Öğretmen anlatısı kaydedilmedi.",
        `Kanıt kapsamı: ${coverage.observationCount} gözlem · ${coverage.anecdotalObservationCount} anekdot · ${coverage.distinctCivilDateCount} gün · ${coverage.distinctWeekCount} hafta · ${coverage.coveredActiveStudentCount}/${coverage.activeStudentCount} aktif çocuk`,
      ],
    },
    {
      heading: "2. Program yönünden değerlendirme",
      paragraphs: [
        evaluation.program.narrative,
        ...evaluation.program.criteria.map((criterion) =>
          `${programLabels.get(criterion.criterionId) ?? criterion.criterionId}: ${statusLabel(criterion.status)}`,
        ),
      ],
    },
    {
      heading: "3. Öğretmen yönünden değerlendirme",
      paragraphs: [
        evaluation.teacher.narrative,
        ...evaluation.teacher.criteria.map((criterion) =>
          `${teacherLabels.get(criterion.criterionId) ?? criterion.criterionId}: ${statusLabel(criterion.status)}`,
        ),
      ],
    },
    {
      heading: "Sonraki ay için öğretmen önerisi",
      paragraphs: [evaluation.nextMonthRecommendation],
    },
    {
      heading: "Kaynak",
      paragraphs: [
        "T.C. Millî Eğitim Bakanlığı, Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı (2024), s. 136-139 ve Ek 18, s. 344-349.",
      ],
    },
  ];
}

function drawAppendixCanvases(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  document: MonthlyEvaluationExportDocument,
): Uint8Array[] {
  const images: Uint8Array[] = [];
  const top = 100;
  const bottom = 1640;
  const left = 90;
  const contentWidth = 1060;
  let pageIndex = 0;
  let y = top;
  const startPage = () => {
    beginCanvasPage(context);
    context.fillStyle = "#f4511e";
    context.font = '700 31px Arial, sans-serif';
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    context.fillText("ÖĞRETMEN DEĞERLENDİRME EKİ", 620, top);
    context.fillStyle = "#666666";
    context.font = '16px Arial, sans-serif';
    context.fillText("Resmî Ek 18'in parçası değildir", 620, top + 32);
    context.textAlign = "left";
    y = top + 78;
  };
  const finishPage = () => {
    context.save();
    context.fillStyle = "#777777";
    context.font = '15px Arial, sans-serif';
    context.textAlign = "center";
    context.fillText(
      `MaarifOS · Öğretmen değerlendirme eki · ${pageIndex + 1}`,
      620,
      1715,
    );
    context.restore();
    images.push(base64Bytes(canvas.toDataURL("image/jpeg", 0.94)));
    pageIndex += 1;
  };
  startPage();
  appendixBlocks(document).forEach((block) => {
    context.font = '700 19px Arial, sans-serif';
    const headingHeight = wrapCanvasText(context, block.heading, contentWidth).length * 24 + 12;
    context.font = '16px Arial, sans-serif';
    const paragraphHeights = block.paragraphs.map((paragraph) =>
      wrapCanvasText(context, paragraph, contentWidth).length * 21 + 4,
    );
    const blockHeight = headingHeight + paragraphHeights.reduce((sum, height) => sum + height, 0) + 10;
    if (y > top + 100 && y + Math.min(blockHeight, 420) > bottom) {
      finishPage();
      startPage();
    }
    context.fillStyle = "#f4511e";
    context.font = '700 19px Arial, sans-serif';
    y = drawWrappedText(context, block.heading, left, y, contentWidth, 24) + 6;
    block.paragraphs.forEach((paragraph) => {
      context.fillStyle = "#242424";
      context.font = '16px Arial, sans-serif';
      const lines = wrapCanvasText(context, paragraph, contentWidth);
      if (y + lines.length * 21 > bottom) {
        finishPage();
        startPage();
      }
      lines.forEach((line) => {
        context.fillText(line, left, y);
        y += 21;
      });
      y += 4;
    });
    y += 6;
  });
  finishPage();
  return images;
}

export async function createMonthlyEvaluationPdf(
  document: MonthlyEvaluationExportDocument,
  options: { readonly runtime?: MonthlyEvaluationPdfRuntime } = {},
): Promise<Uint8Array> {
  const marked = new Set(document.mappedOfficialRowIds);
  const nodes: SemanticPdfNode[] = [
    { kind: "heading", level: 1, text: "EK 18 : AYLIK PLAN KONTROL ÇİZELGESİ" },
    { kind: "heading", level: 2, text: "Sayın Öğretmen" },
    {
      kind: "paragraph",
      text: "Aylık Plan Kontrol Çizelgesinde Türkiye Yüzyılı Maarif Modeli kapsamındaki alan becerileri, sosyal duygusal öğrenme becerileri, değerler, kavramsal beceriler, okuryazarlık becerileri ile eğilimler yer almaktadır. Aylık planda ele alınan program bileşenlerinin form üzerinde işaretlenmesi beklenmektedir. Bu sayede sonraki aylık planların hazırlanma süreci kolaylaşacak, yıl boyunca çocuklara kazandırılması planlanan becerilerin bütüncül olarak görülmesi mümkün olacaktır.",
    },
  ];
  EK18_PAGES.forEach((page, pageIndex) => {
    nodes.push({
      kind: "heading",
      level: 2,
      text: `Ek 18 · Resmî kaynak sayfası ${344 + pageIndex}`,
      pageBreakBefore: pageIndex > 0,
      forcePageBreakBefore: pageIndex > 0,
    });
    page.tables.forEach((table) => {
      nodes.push({ kind: "heading", level: 3, text: table.title });
      table.groups.forEach((group) => {
        nodes.push({ kind: "heading", level: 4, text: group.label });
        nodes.push({
          kind: "table",
          summary: `${table.title} — ${group.label} aylık program bileşeni işaretleme çizelgesi`,
          headers: ["Program bileşeni", ...MONTHS.map((month) => month.label)],
          columnWeights: [3.5, ...MONTHS.map(() => 1)],
          cellPadding: 2,
          rowHeaderColumn: 0,
          continuationContextColumns: [0],
          rows: group.rows.map((row) => [
            row.label,
            ...MONTHS.map((_, monthIndex) => (
              marked.has(row.id) && monthIndex === document.monthColumnIndex ? "X" : ""
            )),
          ]),
        });
      });
    });
    if (page.generalEvaluation) {
      nodes.push({ kind: "heading", level: 3, text: "GENEL DEĞERLENDİRME" });
      nodes.push({
        kind: "paragraph",
        text: officialGeneralEvaluationDocxText(document.evaluation.program.narrative),
      });
    }
  });
  nodes.push({
    kind: "heading",
    level: 2,
    text: "ÖĞRETMEN DEĞERLENDİRME EKİ",
    pageBreakBefore: true,
    forcePageBreakBefore: true,
  });
  nodes.push({
    kind: "paragraph",
    tone: "meta",
    text: "Resmî Ek 18'in parçası değildir.",
  });
  appendixBlocks(document).forEach((block) => {
    nodes.push({ kind: "heading", level: 3, text: block.heading });
    block.paragraphs.forEach((paragraph) => {
      nodes.push({ kind: "paragraph", text: paragraph });
    });
  });
  return createSemanticTaggedPdf(
    {
      title: "Ek 18 - Aylık Plan Kontrol Çizelgesi",
      language: "tr-TR",
      creator: "MaarifOS",
      technicalMetadata: [
        { key: "rendering-mode", value: document.manifest.renderingMode },
        {
          key: "official-source-form-pages",
          value: String(document.manifest.officialSourceFormPageCount),
        },
        { key: "output-pagination", value: document.manifest.outputPagination },
        ...(document.manifest.sourcePlanRevisionNumber === undefined
          ? []
          : [
              {
                key: "source-plan-revision-number",
                value: String(document.manifest.sourcePlanRevisionNumber),
              },
              {
                key: "evidence-last-modified-at",
                value: document.manifest.evidenceLastModifiedAt ?? "",
              },
              {
                key: "evidence-mutation-policy",
                value:
                  document.manifest.evidenceMutationPolicy ??
                  "fail-closed-after-evaluation",
              },
            ]),
      ],
      nodes,
    },
    options.runtime,
  );
}

export async function generateMonthlyEvaluationExportFile(
  pack: PremiumContentPack,
  source: MonthlyEvaluationExportSource,
  access: VerifiedPremiumAccess,
  evaluationId: string,
  format: MonthlyEvaluationExportFormat,
  options: {
    exportedAt?: string;
    pdfRuntime?: MonthlyEvaluationPdfRuntime;
  } = {},
): Promise<MonthlyEvaluationExportFile> {
  const exportDocument = prepareMonthlyEvaluationExportDocument(
    pack,
    source,
    access,
    evaluationId,
    format,
    options,
  );
  const bytes = format === "word"
    ? createMonthlyEvaluationDocx(exportDocument)
    : await createMonthlyEvaluationPdf(exportDocument, {
        runtime: options.pdfRuntime,
      });
  return {
    format,
    fileName: exportDocument.fileName,
    mimeType: format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes,
    document: exportDocument,
  };
}
