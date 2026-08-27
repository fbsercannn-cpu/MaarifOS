import {
  TYMM_2024_AGE_BANDS,
  type Tymm2024AgeBand,
  type Tymm2024Domain,
} from "../curriculum/tymm-2024-catalog.ts";
import { getTymmAgeGuide } from "../curriculum/tymm-age-guide.ts";
import {
  PRESCHOOL_ACTIVITY_SUGGESTIONS,
  type PreschoolActivitySuggestion,
} from "../planning/activity-suggestions.ts";

export const ACTIVITY_STUDIO_AGE_BANDS = TYMM_2024_AGE_BANDS;
export type ActivityStudioAgeBand = Tymm2024AgeBand;

export const ACTIVITY_STUDIO_CATEGORY_IDS = [
  "oyun",
  "cizim",
  "boyama",
  "kes-yapistir",
  "hareket",
  "acik-hava",
  "materyal",
] as const;

export type ActivityStudioCategory =
  (typeof ACTIVITY_STUDIO_CATEGORY_IDS)[number];

export type ActivityStudioCategoryFilter = ActivityStudioCategory | "tumu";

export const ACTIVITY_STUDIO_COLLECTIONS = [
  {
    id: "hemen",
    label: "20 dakikada hazır",
    detail: "Kısa sürede kurulup uygulanabilen akışlar",
  },
  {
    id: "az-hazirlik",
    label: "Az hazırlık",
    detail: "Sınıfta bulunan araçlarla başlayın",
  },
  {
    id: "acik-hava",
    label: "Açık hava",
    detail: "Bahçe ve doğa gözlemi odaklı",
  },
  {
    id: "sakin-akis",
    label: "Sakin akış",
    detail: "Çizim, anlatı ve duygu düzenleme",
  },
  {
    id: "fen-matematik",
    label: "Fen + matematik",
    detail: "Tahmin, ölçme, karşılaştırma ve araştırma",
  },
  {
    id: "isbirligi",
    label: "İş birliği",
    detail: "Rol, paylaşım ve ortak karar deneyimleri",
  },
] as const;

export type ActivityStudioCollectionId =
  (typeof ACTIVITY_STUDIO_COLLECTIONS)[number]["id"];
export type ActivityStudioCollectionFilter = ActivityStudioCollectionId | "tumu";

export const ACTIVITY_STUDIO_CATEGORY_LABELS: Readonly<
  Record<ActivityStudioCategory, string>
> = Object.freeze({
  oyun: "Oyun",
  cizim: "Çizim",
  boyama: "Boyama",
  "kes-yapistir": "Kes-yapıştır",
  hareket: "Hareket",
  "acik-hava": "Açık hava",
  materyal: "Materyal",
});

export const ACTIVITY_STUDIO_AGE_LABELS: Readonly<
  Record<ActivityStudioAgeBand, string>
> = Object.freeze({
  "36-48": "36–48 ay",
  "48-60": "48–60 ay",
  "60-72": "60–72 ay",
});

export type ActivityStudioEnvironment =
  | "Sınıf"
  | "Sanat alanı"
  | "Hareket alanı"
  | "Bahçe"
  | "Sınıf veya bahçe";

export type ActivityStudioPrintableKind =
  | "activity-sheet"
  | "story-board"
  | "color-exploration"
  | "cut-and-sort"
  | "movement-cards"
  | "nature-log"
  | "material-design";

export interface ActivityStudioItem {
  readonly id: string;
  readonly sourceSuggestionId: string;
  readonly contentOrigin: "MaarifOS-original";
  readonly officialMebActivity: false;
  readonly title: string;
  readonly teacherPrompt: string;
  readonly category: ActivityStudioCategory;
  readonly ageBands: readonly ActivityStudioAgeBand[];
  readonly ageAdaptations: Readonly<
    Partial<Record<ActivityStudioAgeBand, string>>
  >;
  readonly durationMinutes: number;
  readonly environment: ActivityStudioEnvironment;
  readonly materials: readonly string[];
  readonly tymmDomains: readonly Tymm2024Domain[];
  readonly printableKind: ActivityStudioPrintableKind;
  readonly preparationMinutes: number;
  readonly teacherSteps: readonly [string, string, string];
  readonly inclusionNote: string;
  readonly observationPrompt: string;
  readonly familyExtension: string;
}

interface ActivityStudioDefinition
  extends Omit<
    ActivityStudioItem,
    | "title"
    | "teacherPrompt"
    | "contentOrigin"
    | "officialMebActivity"
    | "ageBands"
    | "preparationMinutes"
    | "teacherSteps"
    | "inclusionNote"
    | "observationPrompt"
    | "familyExtension"
  > {
  readonly ageAdaptations: Readonly<
    Partial<Record<ActivityStudioAgeBand, string>>
  >;
  readonly preparationMinutes?: number;
  readonly teacherSteps?: readonly [string, string, string];
  readonly inclusionNote?: string;
  readonly observationPrompt?: string;
  readonly familyExtension?: string;
}

export interface ActivityStudioFilters {
  readonly ageBand: ActivityStudioAgeBand;
  readonly category?: ActivityStudioCategoryFilter;
  readonly collection?: ActivityStudioCollectionFilter;
  readonly query?: string;
}

export interface ActivityStudioChildChoice {
  readonly id: string;
  readonly label: string;
}

export interface ActivityStudioChildSession {
  readonly activityId: string;
  readonly activityTitle: string;
  readonly ageBand: ActivityStudioAgeBand;
  readonly ageLabel: string;
  readonly sourceTemplateId: string;
  readonly title: string;
  readonly childPrompt: string;
  readonly choices: readonly [
    ActivityStudioChildChoice,
    ActivityStudioChildChoice,
    ActivityStudioChildChoice,
  ];
  readonly adultFacilitation: string;
  readonly reflectionPrompt: string;
  readonly minimumTouchTargetPx: 56;
  readonly allowSkip: true;
  readonly allowChange: true;
  readonly scoreless: true;
  readonly competitive: false;
  readonly advertising: false;
  readonly externalLinks: false;
  readonly notice: string;
}

const DEFINITIONS: readonly ActivityStudioDefinition[] = [
  {
    id: "oyun-minik-mahalle-pazari",
    sourceSuggestionId: "little-market",
    category: "oyun",
    ageAdaptations: {
      "36-48": "İki rol ve az sayıda gerçek nesneyle kısa oyun turları kurun.",
      "48-60": "Çocukların rol, sıra ve alışveriş listesini birlikte belirlemesine alan açın.",
      "60-72": "Fiyat yerine miktar, görev paylaşımı ve çözüm üretme üzerine küçük bir pazar planı kurun.",
    },
    durationMinutes: 25,
    environment: "Sınıf",
    materials: ["sepet", "güvenli sınıf nesneleri", "resimli liste kartları"],
    tymmDomains: ["Matematik", "Sosyal", "Türkçe"],
    printableKind: "activity-sheet",
  },
  {
    id: "oyun-oyuncak-tamir-atolyesi",
    sourceSuggestionId: "repair-workshop",
    category: "oyun",
    ageAdaptations: {
      "48-60": "Tek bir oyuncak sorunu ve iki güvenli araç seçeneğiyle rol oyunu kurun.",
      "60-72": "Sorunu tarif etme, görev paylaşma ve çözümü yeniden deneme adımlarını çocuklarla planlayın.",
    },
    durationMinutes: 30,
    environment: "Sınıf",
    materials: ["oyuncaklar", "güvenli tamir rol araçları", "görev kartları"],
    tymmDomains: ["Sosyal", "Türkçe"],
    printableKind: "activity-sheet",
  },
  {
    id: "cizim-resimden-hikaye",
    sourceSuggestionId: "picture-story",
    category: "cizim",
    ageAdaptations: {
      "36-48": "Tek büyük resim alanı kullanın; çocuğun çizgi, işaret veya sözle anlatımını kabul edin.",
      "48-60": "Başlangıç ve son için iki resim alanı sunun; çocuğun kendi cümlesini ekleyin.",
      "60-72": "Başlangıç, olay ve sonuç için üç kareyi çocukla birlikte sıralayın.",
    },
    durationMinutes: 20,
    environment: "Sanat alanı",
    materials: ["resim kâğıdı", "kuru boya", "kalın uçlu kalem"],
    tymmDomains: ["Türkçe", "Sanat"],
    printableKind: "story-board",
  },
  {
    id: "cizim-bulut-gunlugu",
    sourceSuggestionId: "cloud-diary",
    category: "cizim",
    ageAdaptations: {
      "48-60": "Tek gözlem anını çizdirin; çocuğun söylediği bir sözü çizimin altına yazın.",
      "60-72": "İki farklı zamandaki gökyüzünü çizip değişen ayrıntıları birlikte karşılaştırın.",
    },
    durationMinutes: 20,
    environment: "Sınıf veya bahçe",
    materials: ["gözlem kâğıdı", "kurşun kalem", "kuru boya"],
    tymmDomains: ["Fen", "Türkçe", "Sanat"],
    printableKind: "nature-log",
  },
  {
    id: "boyama-doganin-renk-paleti",
    sourceSuggestionId: "nature-palette",
    category: "boyama",
    ageAdaptations: {
      "36-48": "İki belirgin renk ve geniş boyama alanlarıyla serbest keşif sunun.",
      "48-60": "Gözlenen renklerin açık ve koyu tonlarını denemeye alan açın.",
      "60-72": "Renk, doku ve ton seçimlerini çocuğun kendi doğa gözlemiyle ilişkilendirin.",
    },
    durationMinutes: 25,
    environment: "Sanat alanı",
    materials: ["yıkanabilir boya", "kalın fırça", "resim kâğıdı"],
    tymmDomains: ["Sanat", "Fen"],
    printableKind: "color-exploration",
  },
  {
    id: "boyama-sesi-cizgiye-donustur",
    sourceSuggestionId: "paint-the-sound",
    category: "boyama",
    ageAdaptations: {
      "36-48": "Kısa ve birbirinden farklı iki sesi, geniş kâğıtta serbest izlerle buluşturun.",
      "48-60": "Sesin hızına göre çizgi ve renk değiştirmeyi deneyin; tek doğru aramayın.",
      "60-72": "Ritim değiştikçe çocuğun seçtiği renk, iz ve boşluklarla görsel bir sıra kurmasına alan açın.",
    },
    durationMinutes: 20,
    environment: "Sanat alanı",
    materials: ["pastel boya", "büyük kâğıt", "ritim çalgısı"],
    tymmDomains: ["Sanat", "Müzik"],
    printableKind: "color-exploration",
  },
  {
    id: "kes-yapistir-renkli-saglikli-tabak",
    sourceSuggestionId: "healthy-plate",
    category: "kes-yapistir",
    ageAdaptations: {
      "36-48": "Parçaları yetişkin önceden hazırlasın; çocuk seçip yerleştirsin ve yapıştırsın.",
      "48-60": "Az sayıda büyük kartı yetişkin gözetiminde kesip benzer özelliklere göre yerleştirin.",
      "60-72": "Çocukların kartları seçme, kesme, gruplama ve seçimlerini anlatma sürecini destekleyin.",
    },
    durationMinutes: 25,
    environment: "Sanat alanı",
    materials: ["basılı kartlar", "yapıştırıcı", "çocuk makası"],
    tymmDomains: ["Hareket ve Sağlık", "Sanat"],
    printableKind: "cut-and-sort",
  },
  {
    id: "kes-yapistir-hikaye-torbasi",
    sourceSuggestionId: "story-bag",
    category: "kes-yapistir",
    ageAdaptations: {
      "48-60": "Üç büyük olay kartını seçip yapıştırın; sıralamayı çocuk değiştirebilsin.",
      "60-72": "Karakter, yer ve olay kartlarını çocukların kendi hikâye sırasıyla birleştirmesine alan açın.",
    },
    durationMinutes: 25,
    environment: "Sanat alanı",
    materials: ["hikâye kartları", "çocuk makası", "yapıştırıcı", "kâğıt torba"],
    tymmDomains: ["Türkçe", "Sanat"],
    printableKind: "cut-and-sort",
  },
  {
    id: "hareket-renkli-denge-parkuru",
    sourceSuggestionId: "balance-trail",
    category: "hareket",
    ageAdaptations: {
      "36-48": "Kısa, düz ve geniş bir yolu yetişkinle birlikte yavaşça deneyin.",
      "48-60": "İki farklı hareket yolundan çocuğun seçim yapmasına ve yolu değiştirmesine izin verin.",
      "60-72": "Grubun güvenli parkur sırasını planlamasına ve farklı katılım yolları önermesine alan açın.",
    },
    durationMinutes: 20,
    environment: "Hareket alanı",
    materials: ["yer şeridi", "denge minderleri", "hareket kartları"],
    tymmDomains: ["Hareket ve Sağlık"],
    printableKind: "movement-cards",
  },
  {
    id: "hareket-hareket-kartinin-gorevi",
    sourceSuggestionId: "movement-dice",
    category: "hareket",
    ageAdaptations: {
      "36-48": "Tek hareket kartını yetişkin modelleyerek sunun; izleme veya küçük hareketle katılımı kabul edin.",
      "48-60": "İki hareket kartını sıraya koyup başlama biçimini çocuğa seçtirin.",
      "60-72": "Hız, yön ve seviye kartlarını grupça seçerek kısa bir hareket planı kurun.",
    },
    durationMinutes: 15,
    environment: "Hareket alanı",
    materials: ["hareket kartları", "yer işaretleri"],
    tymmDomains: ["Hareket ve Sağlık"],
    printableKind: "movement-cards",
  },
  {
    id: "acik-hava-bahcemizin-kesif-haritasi",
    sourceSuggestionId: "garden-map",
    category: "acik-hava",
    ageAdaptations: {
      "36-48": "Yakındaki iki belirgin yeri birlikte bulun; çocuk çizgi veya işaretle gösterebilsin.",
      "48-60": "Başlangıç ve varış yerini seçip aradaki ayrıntıları haritaya ekleyin.",
      "60-72": "Küçük grupların rota, görev ve güvenli durakları birlikte planlamasına alan açın.",
    },
    durationMinutes: 30,
    environment: "Bahçe",
    materials: ["altlık", "harita kâğıdı", "kurşun kalem"],
    tymmDomains: ["Fen", "Matematik", "Sosyal"],
    printableKind: "nature-log",
  },
  {
    id: "acik-hava-minik-doga-koleksiyonculari",
    sourceSuggestionId: "tiny-nature-collectors",
    category: "acik-hava",
    ageAdaptations: {
      "36-48": "Yalnız yere düşmüş iki tür güvenli parçayı dokunarak ve göstererek karşılaştırın.",
      "48-60": "Parçaları renk, büyüklük veya dokuya göre çocuğun seçtiği biçimde gruplandırın.",
      "60-72": "Toplama sınırlarını birlikte belirleyip gruplama ölçütünü çocukların açıklamasına alan açın.",
    },
    durationMinutes: 25,
    environment: "Bahçe",
    materials: ["toplama tepsisi", "gözlem kartı", "büyüteç"],
    tymmDomains: ["Fen", "Matematik"],
    printableKind: "nature-log",
  },
  {
    id: "materyal-geri-donusum-orkestrasi",
    sourceSuggestionId: "recycling-orchestra",
    category: "materyal",
    ageAdaptations: {
      "36-48": "Yetişkinin güvenliğini kontrol ettiği iki malzemenin sesini sırayla deneyin.",
      "48-60": "Malzeme ve ses ilişkisini karşılaştırıp ritme hangi sesle başlanacağını çocuğa seçtirin.",
      "60-72": "Grupların malzeme, görev ve başlama-durma işaretlerini birlikte tasarlamasına alan açın.",
    },
    durationMinutes: 30,
    environment: "Sınıf",
    materials: ["temiz yeniden kullanım malzemeleri", "kâğıt bant", "ritim kartları"],
    tymmDomains: ["Müzik", "Sanat", "Fen"],
    printableKind: "material-design",
  },
  {
    id: "materyal-mimarlar-is-basinda",
    sourceSuggestionId: "little-architects",
    category: "materyal",
    ageAdaptations: {
      "36-48": "Büyük bloklarla tek bir yapıyı yan yana kurun; çocuğun yeniden düzenlemesine zaman verin.",
      "48-60": "İki malzeme seçip önce küçük bir plan çizmesini veya göstermesini teklif edin.",
      "60-72": "Grubun ihtiyaç, görev, malzeme ve deneme sırasını birlikte belirlemesine alan açın.",
    },
    durationMinutes: 35,
    environment: "Sınıf",
    materials: ["büyük bloklar", "karton parçaları", "kâğıt rulolar", "kâğıt bant"],
    tymmDomains: ["Matematik", "Sosyal", "Sanat"],
    printableKind: "material-design",
  },
] as const;

type SuggestionArea = PreschoolActivitySuggestion["area"];

interface ActivityStudioAreaProfile {
  readonly category: ActivityStudioCategory;
  readonly durationMinutes: number;
  readonly environment: ActivityStudioEnvironment;
  readonly materials: readonly string[];
  readonly tymmDomains: readonly Tymm2024Domain[];
  readonly printableKind: ActivityStudioPrintableKind;
  readonly preparationMinutes: number;
  readonly ageAdaptations: Readonly<
    Record<ActivityStudioAgeBand, string>
  >;
  readonly teacherSteps: readonly [string, string, string];
  readonly inclusionNote: string;
  readonly observationPrompt: string;
  readonly familyExtension: string;
}

const AREA_PROFILES: Readonly<Record<SuggestionArea, ActivityStudioAreaProfile>> =
  Object.freeze({
    mathematics: {
      category: "materyal",
      durationMinutes: 20,
      environment: "Sınıf",
      materials: ["sınıf nesneleri", "sayma veya eşleştirme kartları"],
      tymmDomains: ["Matematik", "Türkçe"],
      printableKind: "activity-sheet",
      preparationMinutes: 5,
      ageAdaptations: {
        "36-48": "İki belirgin seçenek ve az sayıda nesneyle ilerleyin; gösterme ve yerleştirmeyi de yanıt kabul edin.",
        "48-60": "Çocuğun kendi gruplama ölçütünü seçmesine ve seçimini değiştirmesine alan açın.",
        "60-72": "Tahmin, deneme, karşılaştırma ve gerekçelendirme sırasını çocuklarla birlikte kurun.",
      },
      teacherSteps: [
        "Malzemeleri çocukların görebileceği iki küçük gruba ayırın.",
        "Tahmin isteyin; çocukların kendi çözüm yollarını denemesine zaman verin.",
        "Sonuçları birlikte karşılaştırıp kullanılan stratejiyi çocuk sözleriyle kaydedin.",
      ],
      inclusionNote:
        "Sözel yanıt zorunlu değildir; gösterme, taşıma, eşleme veya gözle takip etme katılım olarak kabul edilir.",
      observationPrompt:
        "Çocuk hangi ölçütü seçti, çözümünü değiştirdi mi ve karşılaştırmayı nasıl açıkladı?",
      familyExtension:
        "Evdeki güvenli nesnelerle bir sıralama veya gruplama ölçütü bulmalarını isteyin.",
    },
    science: {
      category: "materyal",
      durationMinutes: 25,
      environment: "Sınıf veya bahçe",
      materials: ["güvenli deney nesneleri", "gözlem kayıt kâğıdı"],
      tymmDomains: ["Fen", "Türkçe"],
      printableKind: "nature-log",
      preparationMinutes: 8,
      ageAdaptations: {
        "36-48": "Tek değişken ve iki nesneyle kısa bir tahmin-deneme turu yapın; duyusal incelemeye zaman verin.",
        "48-60": "İki sonucu karşılaştırın; çocuğun önceki tahminini değiştirebilmesine alan açın.",
        "60-72": "Çocukların değişken, tahmin, deneme ve sonuç arasındaki bağı kendi sözleriyle kurmasını destekleyin.",
      },
      teacherSteps: [
        "Güvenlik sınırını açıklayın ve çocukların ilk tahminlerini görünür kılın.",
        "Tek seferde bir değişkeni değiştirerek denemeleri çocuklara yaptırın.",
        "Beklenen ve gerçekleşen sonucu çizim, işaret veya çocuk sözüyle kaydedin.",
      ],
      inclusionNote:
        "Dokunmak istemeyen çocuk gözlemci, fotoğrafçı veya sonuç işaretleyici rolünü seçebilir.",
      observationPrompt:
        "Çocuk tahmini ile sonucu ilişkilendirdi mi; yeni bir soru veya yeniden deneme önerdi mi?",
      familyExtension:
        "Evde güvenli bir günlük olay için ‘Sence ne olur?’ sorusuyla tahmin ve sonuç konuşması yapın.",
    },
    "language-literacy": {
      category: "cizim",
      durationMinutes: 20,
      environment: "Sanat alanı",
      materials: ["resim kâğıdı", "kalın uçlu kalem veya hikâye kartları"],
      tymmDomains: ["Türkçe", "Sanat"],
      printableKind: "story-board",
      preparationMinutes: 5,
      ageAdaptations: {
        "36-48": "Tek görsel ve kısa tekrarlarla ilerleyin; jest, işaret, ses veya tek sözcüğü anlatım kabul edin.",
        "48-60": "İki olay veya karakter seçeneği sunun; çocuğun anlatı sırasını değiştirmesine izin verin.",
        "60-72": "Başlangıç, olay ve sonuç bağını çocukların soruları ve özgün cümleleriyle genişletin.",
      },
      teacherSteps: [
        "Merak uyandıran tek bir görsel, nesne veya sesle davet oluşturun.",
        "Açık uçlu sorularla çocukların farklı anlatı yollarını görünür kılın.",
        "Çocuk sözlerini değiştirmeden not edin ve grubun ürettiği anlatıyı yeniden okuyun.",
      ],
      inclusionNote:
        "Konuşma yerine resim, işaret, nesne seçimi, iletişim kartı veya yetişkin aracılı anlatım kullanılabilir.",
      observationPrompt:
        "Çocuk anlatıya nasıl katıldı; olaylar arasında bağ kurdu mu ve yeni bir ayrıntı ekledi mi?",
      familyExtension:
        "Aileden gün içindeki küçük bir olayı çocuğun seçtiği üç resim veya üç sözcükle anlatmasını isteyin.",
    },
    "values-social": {
      category: "oyun",
      durationMinutes: 20,
      environment: "Sınıf",
      materials: ["durum veya duygu kartları", "konuşma nesnesi"],
      tymmDomains: ["Sosyal", "Türkçe"],
      printableKind: "activity-sheet",
      preparationMinutes: 4,
      ageAdaptations: {
        "36-48": "Kısa ve somut bir durum kullanın; seçme, gösterme veya taklit yoluyla katılım sunun.",
        "48-60": "İki farklı bakış açısını canlandırın; çocuğun çözüm önerisini oyunda denemesine alan açın.",
        "60-72": "İhtiyaç, sonuç ve onarıcı çözüm arasındaki bağı grupça tartışıp ortak karar oluşturun.",
      },
      teacherSteps: [
        "Çocukları etiketlemeden gerçekçi ve kısa bir sosyal durum sunun.",
        "Birden fazla duygu, ihtiyaç ve çözüm olabileceğini açık tutun.",
        "Grubun seçtiği çözümü küçük bir rol oyunu içinde güvenle deneyin.",
      ],
      inclusionNote:
        "Çocuk kişisel deneyimini paylaşmak zorunda değildir; kukla, kart veya hayalî karakter üzerinden katılabilir.",
      observationPrompt:
        "Çocuk başka birinin ihtiyacını fark etti mi; çözüm önerirken esneklik veya onarım dili kullandı mı?",
      familyExtension:
        "Aileye ‘Bugün birlikte çözdüğümüz bir şey’ başlıklı kısa ve yargısız bir sohbet önerin.",
    },
    "movement-health": {
      category: "hareket",
      durationMinutes: 20,
      environment: "Hareket alanı",
      materials: ["yer işaretleri", "hareket veya sıra kartları"],
      tymmDomains: ["Hareket ve Sağlık"],
      printableKind: "movement-cards",
      preparationMinutes: 5,
      ageAdaptations: {
        "36-48": "Tek hareket ve geniş güvenli alanla başlayın; izlemeyi ve küçük hareketi de katılım kabul edin.",
        "48-60": "İki hareket yolu sunun; hız, yön veya tekrar sayısını çocuğa seçtirin.",
        "60-72": "Çocukların güvenli parkur sırası ve farklı katılım yolları önermesine alan açın.",
      },
      teacherSteps: [
        "Alanı tehlikelerden arındırın ve dur-başla işaretini birlikte deneyin.",
        "Hareketin birden fazla güvenli biçimini gösterip seçimi çocuğa bırakın.",
        "Kapanışta beden sinyallerini fark ettirip su ve dinlenme ihtiyacını konuşun.",
      ],
      inclusionNote:
        "Ayakta, oturarak, eşli veya yalnız izleyerek katılım seçenekleri sunun; hız ve tekrar zorunlu değildir.",
      observationPrompt:
        "Çocuk bedenini ve alanı nasıl yönetti; güvenlik işaretine ve kendi dinlenme ihtiyacına nasıl yanıt verdi?",
      familyExtension:
        "Evde birlikte seçilecek üç güvenli hareketten kısa bir aile parkuru kurmalarını önerin.",
    },
    "art-music": {
      category: "boyama",
      durationMinutes: 25,
      environment: "Sanat alanı",
      materials: ["açık uçlu sanat malzemeleri", "büyük çalışma yüzeyi"],
      tymmDomains: ["Sanat", "Müzik"],
      printableKind: "color-exploration",
      preparationMinutes: 7,
      ageAdaptations: {
        "36-48": "İki araç ve geniş yüzey sunun; duyusal keşif ve serbest iz bırakmaya zaman verin.",
        "48-60": "Renk, ses, doku veya biçim için seçenekler sunup çocuğun kararlarını izlemesini destekleyin.",
        "60-72": "Çocukların niyet, araç, süreç ve değişiklik kararlarını kendi sanat dilleriyle açıklamasına alan açın.",
      },
      teacherSteps: [
        "Malzemeleri ulaşılabilir ve seçilebilir küçük gruplar hâlinde hazırlayın.",
        "Örnek kopyalatmadan araçların olasılıklarını kısa bir keşifle tanıtın.",
        "Ürünü yargılamadan süreç, seçim ve değişiklikler üzerine çocukla konuşun.",
      ],
      inclusionNote:
        "Kalın sap, geniş yüzey, sabitleme bandı, dokunmadan araç seçimi veya sesle yönlendirme seçenekleri sunun.",
      observationPrompt:
        "Çocuk hangi aracı neden seçti; sürecinde deneme, ısrar, değiştirme veya özgün bir ilişki kurma görüldü mü?",
      familyExtension:
        "Aileden evdeki güvenli bir ses, renk veya dokuyu çocukla birlikte fark edip adlandırmasını isteyin.",
    },
    "play-drama": {
      category: "oyun",
      durationMinutes: 30,
      environment: "Sınıf",
      materials: ["açık uçlu rol nesneleri", "görev veya olay kartları"],
      tymmDomains: ["Sosyal", "Türkçe", "Sanat"],
      printableKind: "activity-sheet",
      preparationMinutes: 6,
      ageAdaptations: {
        "36-48": "İki rol ve kısa bir olayla başlayın; taklit, nesne taşıma veya izlemeyi katılım kabul edin.",
        "48-60": "Çocukların rol, araç ve olay sırasını seçmesine; oyunu yeniden kurmasına alan açın.",
        "60-72": "Görev, sorun, çözüm ve rol değişimini çocukların ortak oyun planına bırakın.",
      },
      teacherSteps: [
        "Açık uçlu birkaç nesneyle oyunun başlangıç davetini hazırlayın.",
        "Rolleri dağıtmak yerine çocukların rol ve görev üretmesini bekleyin.",
        "Oyundaki sorunu hemen çözmeden çocukların önerilerini denemesine zaman verin.",
      ],
      inclusionNote:
        "Rol almak istemeyen çocuk malzeme sorumlusu, gözlemci, anlatıcı veya ses düzenleyici olabilir.",
      observationPrompt:
        "Çocuk rolü nasıl sürdürdü; ortak fikre katkı, müzakere veya oyunu dönüştürme davranışı gösterdi mi?",
      familyExtension:
        "Aileden evdeki günlük bir işi çocukla kısa bir rol oyununa dönüştürmesini önerin.",
    },
    outdoor: {
      category: "acik-hava",
      durationMinutes: 30,
      environment: "Bahçe",
      materials: ["gözlem altlığı", "kurşun kalem veya toplama tepsisi"],
      tymmDomains: ["Fen", "Matematik", "Türkçe"],
      printableKind: "nature-log",
      preparationMinutes: 5,
      ageAdaptations: {
        "36-48": "Yakın ve güvenli iki ayrıntıyı birlikte inceleyin; dokunmadan bakmayı da seçenek olarak sunun.",
        "48-60": "Çocuğun rota, gözlem noktası veya karşılaştırma ölçütü seçmesine alan açın.",
        "60-72": "Çocukların güvenli rota, araştırma sorusu ve kayıt yöntemini küçük gruplarda planlamasını destekleyin.",
      },
      teacherSteps: [
        "Hava, alan ve canlı güvenliği için sınırları önceden kontrol edin.",
        "Çocukların kendi merak noktalarını seçmesine ve acele etmeden gözlem yapmasına izin verin.",
        "Canlıya zarar vermeden çizim, işaret veya çocuk sözüyle bulguları kaydedin.",
      ],
      inclusionNote:
        "Rota kısaltılabilir; oturarak gözlem, fotoğraf yerine sözlü tarif veya eşli hareket seçenekleri sunulabilir.",
      observationPrompt:
        "Çocuk hangi ayrıntıyı fark etti; soru sordu mu, karşılaştırdı mı ve doğaya özen gösterdi mi?",
      familyExtension:
        "Aileye ev-okul yolunda tek bir mevsim ayrıntısını fark edip çocuk sözüyle kaydetmesini önerin.",
    },
  });

const CATEGORY_BY_SOURCE_ID: Readonly<Record<string, ActivityStudioCategory>> =
  Object.freeze({
    "shape-hunters": "oyun",
    "pattern-train": "hareket",
    "measure-our-room": "materyal",
    "market-baskets": "kes-yapistir",
    "treasure-directions": "hareket",
    "favorites-graph": "cizim",
    "sink-or-float": "materyal",
    "shadow-detectives": "acik-hava",
    "seed-journey": "acik-hava",
    "ice-rescue": "materyal",
    "sound-laboratory": "materyal",
    "wind-builders": "materyal",
    "picture-story": "cizim",
    "sound-hunt": "oyun",
    "story-continues": "oyun",
    "story-bag": "kes-yapistir",
    "classroom-post-office": "cizim",
    "rhyme-path": "hareket",
    "kindness-circle": "oyun",
    "responsibility-tree": "kes-yapistir",
    "emotion-detectives": "oyun",
    "classroom-council": "oyun",
    "empathy-puppet": "oyun",
    "fair-sharing": "materyal",
    "balance-trail": "hareket",
    heartbeat: "hareket",
    "healthy-plate": "kes-yapistir",
    "breathing-detectives": "hareket",
    "movement-dice": "hareket",
    "clean-hands-lab": "materyal",
    "nature-palette": "boyama",
    "rhythm-echo": "hareket",
    "recycling-orchestra": "materyal",
    "paint-the-sound": "boyama",
    "clay-emotions": "materyal",
    "quiet-loud-orchestra": "hareket",
    "little-market": "oyun",
    "lost-puppet": "oyun",
    "little-architects": "materyal",
    "repair-workshop": "oyun",
    "space-station": "oyun",
    "weather-studio": "oyun",
    "garden-map": "acik-hava",
    "cloud-diary": "cizim",
    "tiny-nature-collectors": "acik-hava",
    "tiny-neighbor-watch": "acik-hava",
    "puddle-laboratory": "acik-hava",
    "our-tree-friend": "acik-hava",
  });

function createActivitySpecificSupport(
  source: PreschoolActivitySuggestion,
  profile: ActivityStudioAreaProfile,
): Required<
  Pick<
    ActivityStudioDefinition,
    "teacherSteps" | "inclusionNote" | "observationPrompt" | "familyExtension"
  >
> {
  const materialsLabel = profile.materials.slice(0, 2).join(" ve ");
  return {
    teacherSteps: [
      `“${source.title}” için ${materialsLabel} malzemelerini erişilebilir küçük seçenekler hâlinde hazırlayın.`,
      `${source.teacherPrompt} Yöntem, sıra veya rol seçimini çocuklara bırakın ve farklı deneme yollarına alan açın.`,
      `Kapanışta “${source.title}” sırasında çocuğun yaptığı veya söylediği tek bir somut şeyi değiştirmeden kaydedin.`,
    ],
    inclusionNote: `“${source.title}” sırasında ${profile.inclusionNote}`,
    observationPrompt: `“${source.title}” sırasında ${profile.observationPrompt}`,
    familyExtension: `Aileye “${source.title}” deneyimini evdeki güvenli malzemelerle, çocuğun seçtiği kısa bir yoldan yeniden kurmasını önerin; sonucu puanlamadan çocuğun sözünü dinlemelerini hatırlatın.`,
  };
}

function fallbackDefinition(
  source: PreschoolActivitySuggestion,
): ActivityStudioDefinition {
  const profile = AREA_PROFILES[source.area];
  const category = CATEGORY_BY_SOURCE_ID[source.id] ?? profile.category;
  const ageAdaptations = Object.fromEntries(
    TYMM_2024_AGE_BANDS.map((ageBand) => [
      ageBand,
      `${source.title}: ${profile.ageAdaptations[ageBand]}`,
    ]),
  ) as Readonly<Record<ActivityStudioAgeBand, string>>;
  return {
    id: `${category}-${source.id}`,
    sourceSuggestionId: source.id,
    category,
    ageAdaptations,
    durationMinutes: profile.durationMinutes,
    environment: profile.environment,
    materials: profile.materials,
    tymmDomains: profile.tymmDomains,
    printableKind: profile.printableKind,
    preparationMinutes: profile.preparationMinutes,
    ...createActivitySpecificSupport(source, profile),
  };
}

const SOURCE_SUGGESTIONS = new Map<string, PreschoolActivitySuggestion>(
  PRESCHOOL_ACTIVITY_SUGGESTIONS.map((suggestion) => [suggestion.id, suggestion]),
);

function buildActivity(definition: ActivityStudioDefinition): ActivityStudioItem {
  const source = SOURCE_SUGGESTIONS.get(definition.sourceSuggestionId);
  if (!source) {
    throw new Error(
      `Etkinlik Stüdyosu kaynak önerisi bulunamadı: ${definition.sourceSuggestionId}`,
    );
  }

  const ageBands = TYMM_2024_AGE_BANDS.filter(
    (ageBand) => definition.ageAdaptations[ageBand] !== undefined,
  );
  if (ageBands.length === 0) {
    throw new Error(`Etkinlik için yaş bandı tanımlanmadı: ${definition.id}`);
  }

  const assistantProfile = AREA_PROFILES[source.area];
  const activitySpecificSupport = createActivitySpecificSupport(
    source,
    assistantProfile,
  );

  return Object.freeze({
    ...definition,
    title: source.title,
    teacherPrompt: source.teacherPrompt,
    contentOrigin: "MaarifOS-original" as const,
    officialMebActivity: false as const,
    ageBands: Object.freeze(ageBands),
    ageAdaptations: Object.freeze({ ...definition.ageAdaptations }),
    materials: Object.freeze([...definition.materials]),
    tymmDomains: Object.freeze([...definition.tymmDomains]),
    preparationMinutes:
      definition.preparationMinutes ?? assistantProfile.preparationMinutes,
    teacherSteps: Object.freeze(
      definition.teacherSteps ?? activitySpecificSupport.teacherSteps,
    ),
    inclusionNote:
      definition.inclusionNote ?? activitySpecificSupport.inclusionNote,
    observationPrompt:
      definition.observationPrompt ?? activitySpecificSupport.observationPrompt,
    familyExtension:
      definition.familyExtension ?? activitySpecificSupport.familyExtension,
  });
}

export const ACTIVITY_STUDIO_ITEMS: readonly ActivityStudioItem[] =
  Object.freeze(
    PRESCHOOL_ACTIVITY_SUGGESTIONS.map((source) => {
      const curated = DEFINITIONS.find(
        (definition) => definition.sourceSuggestionId === source.id,
      );
      return buildActivity(curated ?? fallbackDefinition(source));
    }),
  );

function activityMatchesCollection(
  activity: ActivityStudioItem,
  collection: ActivityStudioCollectionFilter,
): boolean {
  if (collection === "tumu") return true;
  if (collection === "hemen") return activity.durationMinutes <= 20;
  if (collection === "az-hazirlik") return activity.preparationMinutes <= 5;
  if (collection === "acik-hava") {
    return (
      activity.category === "acik-hava" ||
      activity.environment === "Bahçe" ||
      activity.environment === "Sınıf veya bahçe"
    );
  }
  if (collection === "sakin-akis") {
    return (
      activity.category === "cizim" ||
      activity.category === "boyama" ||
      activity.sourceSuggestionId === "breathing-detectives"
    );
  }
  if (collection === "fen-matematik") {
    return (
      activity.tymmDomains.includes("Fen") ||
      activity.tymmDomains.includes("Matematik")
    );
  }
  return (
    activity.category === "oyun" ||
    activity.tymmDomains.includes("Sosyal")
  );
}

export function isActivityStudioAgeBand(
  value: unknown,
): value is ActivityStudioAgeBand {
  return (
    typeof value === "string" &&
    (TYMM_2024_AGE_BANDS as readonly string[]).includes(value)
  );
}

export function filterActivityStudioItems({
  ageBand,
  category = "tumu",
  collection = "tumu",
  query = "",
}: ActivityStudioFilters): readonly ActivityStudioItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

  return ACTIVITY_STUDIO_ITEMS.filter((activity) => {
    if (!activity.ageBands.includes(ageBand)) return false;
    if (category !== "tumu" && activity.category !== category) return false;
    if (!activityMatchesCollection(activity, collection)) return false;
    if (!normalizedQuery) return true;

    const searchableText = [
      activity.title,
      activity.teacherPrompt,
      ACTIVITY_STUDIO_CATEGORY_LABELS[activity.category],
      activity.environment,
      ...activity.materials,
      ...activity.tymmDomains,
      ...activity.teacherSteps,
      activity.inclusionNote,
      activity.observationPrompt,
      activity.familyExtension,
    ]
      .join(" ")
      .toLocaleLowerCase("tr-TR");
    return searchableText.includes(normalizedQuery);
  });
}

export function getActivityStudioItem(
  activityId: string,
): ActivityStudioItem | null {
  return ACTIVITY_STUDIO_ITEMS.find((activity) => activity.id === activityId) ?? null;
}

function childTemplateIndexFor(
  category: ActivityStudioCategory,
  ageBand: ActivityStudioAgeBand,
): 0 | 1 | 2 {
  if (ageBand === "36-48") {
    if (category === "hareket") return 1;
    if (category === "materyal" || category === "boyama") return 2;
    return 0;
  }
  if (ageBand === "48-60") {
    if (category === "hareket") return 2;
    if (
      category === "materyal" ||
      category === "boyama" ||
      category === "kes-yapistir" ||
      category === "acik-hava"
    ) {
      return 1;
    }
    return 0;
  }
  if (category === "acik-hava") return 1;
  if (category === "cizim" || category === "boyama") return 2;
  return 0;
}

const CHILD_CHOICE_BY_CATEGORY: Readonly<
  Record<ActivityStudioCategory, readonly [string, string]>
> = Object.freeze({
  oyun: ["Rolümü ben seçeyim", "Oyunun başlangıcını ben seçeyim"],
  cizim: ["Çizgi veya kalemi ben seçeyim", "Nereden başlayacağımı ben seçeyim"],
  boyama: ["Renk veya aracı ben seçeyim", "Boyama yolumu ben seçeyim"],
  "kes-yapistir": ["Parçaları ben seçeyim", "Yerleştirme sırasını ben seçeyim"],
  hareket: ["Hareket yolunu ben seçeyim", "Hızımı ben seçeyim"],
  "acik-hava": ["Bakacağımız yeri ben seçeyim", "Kayıt yolumu ben seçeyim"],
  materyal: ["Malzemeyi ben seçeyim", "Nasıl deneyeceğimi ben seçeyim"],
});

/**
 * Çocuk Modu yalnız denetimli, puansız bir seçim yüzü üretir. Dönüş değeri
 * kalıcı kayda veya gelişim değerlendirmesine dönüştürülmez.
 */
export function createActivityStudioChildSession(
  activityId: string,
  ageBand: ActivityStudioAgeBand,
): ActivityStudioChildSession | null {
  const activity = getActivityStudioItem(activityId);
  if (!activity || !activity.ageBands.includes(ageBand)) return null;

  const guide = getTymmAgeGuide(ageBand);
  if (!guide) return null;

  const template = guide.choiceTemplates[
    childTemplateIndexFor(activity.category, ageBand)
  ];
  const categoryChoices = CHILD_CHOICE_BY_CATEGORY[activity.category];

  return Object.freeze({
    activityId: activity.id,
    activityTitle: activity.title,
    ageBand,
    ageLabel: guide.ageLabel,
    sourceTemplateId: template.id,
    title: activity.title,
    childPrompt: `“${activity.title}” için nasıl başlamak istersin? İstersen önce izleyebilir, sonra seçimini değiştirebilirsin.`,
    choices: Object.freeze(
      [
        Object.freeze({ id: `${activity.id}-choice-1`, label: categoryChoices[0] }),
        Object.freeze({ id: `${activity.id}-choice-2`, label: categoryChoices[1] }),
        Object.freeze({
          id: `${activity.id}-choice-3`,
          label: "Önce izleyip sonra karar vereyim",
        }),
      ],
    ) as unknown as ActivityStudioChildSession["choices"],
    adultFacilitation: `“${activity.title}” sırasında ${template.adultFacilitation}`,
    reflectionPrompt: `“${activity.title}” sırasında neyi seçtin, denedin veya değiştirdin?`,
    minimumTouchTargetPx: guide.interactionPolicy.minimumTouchTargetPx,
    allowSkip: true,
    allowChange: true,
    scoreless: true,
    competitive: false,
    advertising: false,
    externalLinks: false,
    notice: guide.interactionPolicy.notice,
  });
}
