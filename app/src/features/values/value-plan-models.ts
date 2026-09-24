import {
  ROOF_VALUE_CODES,
  VALUE_CODES,
  VALUES_PEDAGOGY_CONSTITUTION,
  valueDefinitionByCode,
} from "./values-constitution.ts";
import { assertOfficialPreschoolValueActionSnapshot } from "./official-preschool-value-actions.ts";

export type ValueCode = (typeof VALUE_CODES)[number];
export type RoofValueCode = (typeof ROOF_VALUE_CODES)[number];
export type ValueDesignDirection = "learning_outcome_led" | "value_led";

export interface OfficialValueActionSnapshot {
  valueCode: ValueCode;
  actionCode: string;
  actionName: string;
  indicatorCode: string;
  indicatorText: string;
  catalogId: string;
  sourceVersion: string;
  sourceUrl: string;
  sourceSha256: `sha256:${string}`;
  sourcePage: number;
}

export interface ActivityValueMapping {
  designDirection: ValueDesignDirection;
  primaryValueCode: ValueCode;
  roofValueCode: RoofValueCode;
  roofValueChecks: {
    readonly respect: string;
    readonly responsibility: string;
    readonly justice: string;
  };
  supportingValueCodes: readonly ValueCode[];
  officialActionSnapshots: readonly OfficialValueActionSnapshot[];
  culturalBridgeIds: readonly string[];
  rationale: string;
  livedContextOrDilemma: string;
  adultModelActions: readonly string[];
  childAgencyOptions: readonly string[];
  repairOrContributionOptions: readonly string[];
  familyCommunityTransfer?: string;
  natureStewardshipTransfer?: string;
  observationPrompts: readonly string[];
  counterEvidencePrompt: string;
  reflectionPrompt: string;
  nextPlanDecisionRule: string;
}

export interface ValueCoverageResult {
  valid: boolean;
  coveredValueCodes: readonly ValueCode[];
  missingValueCodes: readonly ValueCode[];
  minimumRequired: number;
}

const VALUE_CODE_SET = new Set<string>(VALUE_CODES);
const ROOF_VALUE_CODE_SET = new Set<string>(ROOF_VALUE_CODES);
// Öğretmen gerekçesi tek satırlıdır. Bidi yönlendirmeleri ve görünmez ayraçlar
// dâhil tüm Unicode kontrol/format karakterleri güvenlik kalıplarını bölebildiği
// için normalizasyon öncesinde reddedilir.
const TEACHER_RATIONALE_FORBIDDEN_UNICODE_PATTERN =
  /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const TEACHER_NARRATIVE_FORBIDDEN_UNICODE_PATTERN =
  /[\p{Cf}\p{Zl}\p{Zp}]|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;
const MORAL_LABEL_PATTERN = /(?:iyi çocuk|kötü çocuk|uslu|saygısız|tembel|günahkâr|ahlaksız|terbiyesiz|yalancı|bencil|sorumsuz|inançsız|hayırlı\s+(?:bir\s+)?evlat|örnek\s+(?:bir\s+)?evlat)/iu;
const CHILD_RIGHTS_HARD_STOP_PATTERNS = Object.freeze([
  /(?:dua|ibadet|ritüel|mezhep|mezheb|inanç(?:sızlık)?|kıyafet|giyim|aile biçimi).{0,100}(?:puan(?:ı|ını|lama|la(?!nma|nmaz))|not ver|ölçülür|ölçmek|profil(?:le| oluştur)|kaydet|katılım puanı|gelişim hükmü)/iu,
  /(?:puan(?:ı|ını|lama|la(?!nma|nmaz))|not ver|ölç|profil(?:le| oluştur)|kaydet).{0,100}(?:dua|ibadet|ritüel|mezhep|mezheb|inanç(?:sızlık)?|kıyafet|giyim|aile biçimi)/iu,
  /(?:dua|ibadet|ritüel|mezhep|mezheb|inanç).{0,100}(?:zorla(?!n?m(?:a|e|ı|i)(?:dı|di|z|mış|miş|maktadır|mektedir|yacak|yecek|yor))|mecbur|baskı|korkut|tehdit|utandır|cezalandır|dışla)/iu,
  /(?:zorla(?!n?m(?:a|e|ı|i)(?:dı|di|z|mış|miş|maktadır|mektedir|yacak|yecek|yor))|mecbur|baskı|korkut|tehdit|utandır|cezalandır|dışla).{0,100}(?:dua|ibadet|ritüel|mezhep|mezheb|inanç)/iu,
  /(?:kimseye anlatma|sır olarak sakla|yardım isteme(?:sin|mek yasak)|şikâyet etme)/iu,
  /zorunlu.{0,40}(?:sarılma|öpme|fiziksel temas|özür|paylaşma)/iu,
  /(?:saygı|büyüklere saygı).{0,60}(?:kör|koşulsuz).{0,20}itaat/iu,
  /(?:din|mezhep|inanç|millet|halk|dil|kültür).{0,80}(?:üstün|aşağı|değersiz|düşman|kötü)/iu,
]);
const TURKISH_NUMBER_WORD =
  String.raw`(?:sıfır|bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|yirmi|otuz|kırk|elli|altmış|yetmiş|seksen|doksan|yüz)`;
const RATING_NUMBER_EXPRESSION =
  String.raw`(?:\d{1,3}|${TURKISH_NUMBER_WORD}(?:\s+${TURKISH_NUMBER_WORD}){0,2})`;
const EVIDENCE_CONTEXTUAL_VALUE_JUDGMENT_FORWARD_PATTERN =
  /(?:değer|ahlak|karakter|davranış|çocuk).{0,60}(?:puan(?:ı|lama|la)|notlandır|(?:değer|ahlak|karakter)\s+notu|rozet|seviye|sıralama|derece|mastery|kazan(?:dı|mış|ıldı|ılmış)|başar(?:dı|ılı)|başarısız)/iu;
const EVIDENCE_CONTEXTUAL_VALUE_JUDGMENT_REVERSE_PATTERN =
  /(?:puan(?:ı|lama|la)|notlandır|(?:değer|ahlak|karakter)\s+notu|rozet|seviye|sıralama|derece|mastery|kazan(?:dı|mış|ıldı|ılmış)|başar(?:dı|ılı)|başarısız).{0,60}(?:değer|ahlak|karakter|davranış|çocuk)/iu;
const EVIDENCE_RATIONALE_HARD_STOP_PATTERNS = Object.freeze([
  /(?<![\p{L}\p{M}])(?:\d+(?:[.,]\d+)?\s*)?puan(?:ı|lama|lamak|ladım|landı|la| verdim| verildi)?(?![\p{L}\p{M}])/iu,
  /(?<![\p{L}\p{M}])(?:notlandır(?:ma|mak|dım|ıldı)|not\s+(?:verdim|verildi|aldı)|rozet(?:i|lendi| verildi)?|seviye(?:si)?|rütbe(?:si|lendi)?|rank(?:ed|ing)?|sıralama(?:sı)?|derecelendir(?:me|ildi)|mastery|mastered|achieved)(?![\p{L}\p{M}])/iu,
  EVIDENCE_CONTEXTUAL_VALUE_JUDGMENT_FORWARD_PATTERN,
  EVIDENCE_CONTEXTUAL_VALUE_JUDGMENT_REVERSE_PATTERN,
  /(?:karakteri|kişiliği|ahlakı|değeri).{0,50}(?:budur|böyledir|kanıtlandı|gösterir|kesin|kalıcı)/iu,
  /(?:her zaman|asla).{0,40}(?:saygılı|saygısız|sorumlu|sorumsuz|adil|adaletsiz|dürüst|yalancı|bencil)/iu,
  /(?<!\d)\d{1,3}\s*[\/⁄∕／]\s*(?:5|10|100)(?!\d)/u,
  /(?<!\d)(?:%\s*\d{1,3}|\d{1,3}\s*%)(?!\d)/u,
  new RegExp(
    String.raw`(?<![\p{L}\p{M}])yüzde\s+${RATING_NUMBER_EXPRESSION}(?![\p{L}\p{M}])`,
    "iu",
  ),
  new RegExp(
    String.raw`${RATING_NUMBER_EXPRESSION}\s+üzerinden\s+${RATING_NUMBER_EXPRESSION}`,
    "iu",
  ),
  new RegExp(
    String.raw`(?<![\p{L}\p{M}])(?:D(?:[1-9]|1\d|20)|sayg(?:ı|ısı)|sorumluluk|sorumluluğu|adalet|adaleti|dürüstlük|dürüstlüğü|değer|ahlak|karakter)(?:\s+değeri|\s+düzeyi)?\s+${RATING_NUMBER_EXPRESSION}.{0,30}(?:olarak\s+değerlendir(?:[\p{L}\p{M}]*)?|olarak\s+kayded(?:[\p{L}\p{M}]*)?|puan|not)(?![\p{L}\p{M}])`,
    "iu",
  ),
  new RegExp(
    String.raw`(?<![\p{L}\p{M}])(?:D(?:[1-9]|1\d|20)|sayg(?:ı|ısı)|sorumluluk|sorumluluğu|adalet|adaleti|dürüstlük|dürüstlüğü|değer|ahlak|karakter)(?:\s+değeri|\s+düzeyi)?\s*[:=]\s*(?:%\s*)?${RATING_NUMBER_EXPRESSION}(?![\p{L}\p{M}])`,
    "iu",
  ),
  /(?<![\p{L}\p{M}])(?:bir|iki|üç|dört|beş|\d+)\s+yıldız(?![\p{L}\p{M}])/iu,
  /[⭐🌟★☆]/u,
  /(?<![\p{L}\p{M}])(?:A|B|C|D|F)[+-]?\s+(?:notu|düzeyi|olarak\s+değerlendir(?:ildi|dim))(?![\p{L}\p{M}])/u,
  /(?<![\p{L}\p{M}])(?:AA|BA|BB|CB|CC|DC|DD|FD|FF)\s+(?:notu|düzeyi|olarak\s+değerlendir(?:ildi|dim))(?![\p{L}\p{M}])/u,
  /(?<![\p{L}\p{M}])D(?:[1-9]|1\d|20)\s+düzeyi(?:\s+%?\d+)?(?![\p{L}\p{M}])/iu,
  /(?:çocuğun\s+)?(?:kişiliği|karakteri|ahlakı|değerleri).{0,30}(?:iyi|güzel|gelişmiş|olgun|üstün|zayıf|bozuk|kötü|saygılı|sorumlu|adil|dürüst|örnek|mükemmel|kusursuz|ideal)(?:(?:d|t)[ıiuü]r)?(?=\s*(?:[.!?]|$))/iu,
  /(?:çocuk|o)\s+(?:çok\s+)?(?:iyi|güzel|gelişmiş|olgun|üstün|zayıf|bozuk|kötü|saygılı|sorumlu|adil|dürüst)(?:(?:d|t)[ıiuü]r)?(?=\s*(?:[.!?]|$))/iu,
  /(?:saygılı|sorumlu|adil|dürüst|iyi|kötü)\s+(?:bir\s+)?çocuk(?:tur|dur)?/iu,
  /(?:bu\s+)?çocuk.{0,40}(?:örnek|mükemmel|kusursuz|ideal)\s+(?:bir\s+)?(?:kişiliğe|karaktere|ahlaka)\s+sahiptir/iu,
  /(?:karakter|kişilik|ahlak)\s+(?:bakımından|açısından)\s+(?:örnek|mükemmel|kusursuz|ideal)(?:(?:d|t)[ıiuü]r)?/iu,
]);
const SENSITIVE_BELIEF_OR_PRACTICE_PATTERN =
  /(?<![\p{L}\p{M}])(?:(?:dua|ibadet|ritüel|namaz|oruç|inanç|mezhep|allah|tanrı|rab|kur[’']?(?:an|ân)|kuran|kurân|fatiha|fâtiha|besmele|sure|ayet|hadis|incil|tevrat|zebur|tora|şabat|sabbat|vaftiz|komünyon|haç|kipa|menora|cami|kilise|havra|sinagog|cemevi|ayin|abdest|secde|tesbih|zikir|salavat|ezan|iftar|sahur|hac|umre|zekat|zekât|sadaka|başörtüsü|tesettür|kıyafet|islam|islamiyet|müslüman|mümin|hristiyan|yahudi|alevi|sünni|hanefi|şafii|şafiî|maliki|hanbeli|caferi|bektaşi|ateist|deist|dindar)(?:[\p{L}\p{M}]*)?|(?:ramazan|kurban)\s+bayram(?:ı|ında|ına|ından)|bayram(?:da|ında|ı|ın)?\s+(?:kutla|namaz|dua|ibadet|katıl)(?:[\p{L}\p{M}]*)?|din(?:î|i|in|inin|ine|inden|e|den|sel|dar|siz|sız)?|inan(?:dı|dığ|ıyor|mak|ır|an|ma(?:dı|sı|k)?)(?:[\p{L}\p{M}]*)?|cem(?:e|de|den)?\s+katıl(?:[\p{L}\p{M}]*)?)(?![\p{L}\p{M}])/iu;
const SAFE_CULTURAL_CONTEXT_PATTERN =
  /(?<![\p{L}\p{M}])(?:kültürel|bağlam|gelenek|bayram|aile anlatısı|çevresel tema|öykü|hikâye)(?![\p{L}\p{M}])/iu;
const JUDGMENT_FREE_CULTURAL_CONTEXT_NARRATIVE_PATTERN =
  /^(?=[\s\S]{1,1000}$)(?=[\s\S]*(?:sözcük|tema|anlatı|öykü|hikâye|kültürel\s+bağlam))(?=[\s\S]*(?:anıldı|geçti|yer aldı|konuşuldu|incelendi|belirtir))(?=[\s\S]*(?:çıkarım\s+yapılmadı|yalnız\s+bağlam|değer\s+kanıtı\s+değildir|çocuk\s+hakkında\s+hüküm\s+değildir))[\s\S]+$/iu;
const VALUE_JUDGMENT_CLAIM_PATTERN =
  /(?<![\p{L}\p{M}])(?:değer(?:i|ini)?\s+(?:gösterdi|kanıtladı|destekledi|kazanıldı|kazandı)|kanıtladı|başardı|uygun(?:dur)?|çelişti|saygılı(?:dır)?|sorumlu(?:dur)?|adil(?:dir)?|dürüst(?:tür)?)(?![\p{L}\p{M}])/iu;
const THIRD_PARTY_CONSCIENCE_RESPECT_ACTION_PATTERN =
  /^(?:(?:oyun|etkinlik|gözlem)\s+sırasında\s+)?(?:arkadaşının|başkasının|bir\s+başkasının|diğer\s+çocuğun).{0,60}(?:inancına|ibadetine|kıyafetine|başörtüsüne|mezhebine).{0,80}(?:saygı\s+göster(?:di|ip)|alan\s+açtı|müdahale\s+etmedi|zorlamadı|rahatsız\s+etmedi)\s*[.!?]?$/iu;
const SOURCE_OBSERVATION_MORAL_JUDGMENT_PATTERN =
  /(?:saygı|sorumluluk|adalet|dürüstlük|değer|ahlak|karakter|kişilik).{0,40}(?:\d{1,3}|yüzde|puan|not|seviye|örnek|mükemmel|kusursuz|ideal)|(?:iyi|kötü|saygılı|saygısız|sorumlu|sorumsuz|adil|adaletsiz|dürüst|yalancı|bencil|örnek|mükemmel|kusursuz|ideal)(?:\s+[\p{L}\p{M}]+){0,4}\s+çocuk(?:tur|tu|dur|du)?/iu;
const PEDAGOGICAL_RAW_PERMANENT_VALUE_JUDGMENT_PATTERN =
  /(?:değer|ahlak|karakter|kişilik).{0,60}(?:kazanıldı|kazandı|kazanmış|kanıtlandı|kanıtlar|kesin(?:dir)?|kalıcı(?:dır)?)/iu;
const PEDAGOGICAL_RAW_ASCII_MORAL_OR_SCORE_PATTERNS = Object.freeze([
  /(?<![a-z])(?:iyi cocuk|kotu cocuk|uslu|saygisiz|tembel|gunahkar|ahlaksiz|terbiyesiz|yalanci|bencil|sorumsuz|inancsiz|hayirli\s+(?:bir\s+)?evlat|ornek\s+(?:bir\s+)?evlat)[a-z]*(?![a-z])/i,
  /(?:saygi|sorumluluk|adalet|durustluk|deger|ahlak|karakter|kisilik).{0,40}(?:\d{1,3}|yuzde|puan|not|seviye|ornek|mukemmel|kusursuz|ideal)/i,
  /(?:iyi|kotu|saygili|saygisiz|sorumlu|sorumsuz|adil|adaletsiz|durust|yalanci|bencil|ornek|mukemmel|kusursuz|ideal)(?:\s+[a-z]+){0,4}\s+cocuk(?:tur|tu|dur|du)?/i,
  /(?:deger|ahlak|karakter|kisilik).{0,60}(?:kazanildi|kazandi|kazanmis|kanitlandi|kanitlar|kesin(?:dir)?|kalici(?:dir)?)/i,
  /(?<![a-z])(?:\d+(?:[.,]\d+)?\s*)?puan(?:i|lama|lamak|ladim|landi|la| verdim| verildi)?(?![a-z])/i,
  /(?<!\d)(?:%\s*\d{1,3}|\d{1,3}\s*%|\d{1,3}\s*[\/]\s*(?:5|10|100))(?!\d)/,
]);
const PEDAGOGICAL_RAW_ASCII_BELIEF_OR_PRACTICE_PATTERN =
  /(?<![a-z])(?:dua|ibadet|rituel|namaz|oruc|inanc|mezhep|allah|tanri|rab|kuran|fatiha|besmele|sure|ayet|hadis|incil|tevrat|zebur|tora|sabat|sabbat|vaftiz|komunyon|hac|umre|zekat|sadaka|basortusu|tesettur|islam|musluman|mumin|hristiyan|yahudi|alevi|sunni|hanefi|safii|maliki|hanbeli|caferi|bektasi|ateist|deist|dindar)[a-z]*(?![a-z])/i;
const PEDAGOGICAL_RAW_ASCII_THIRD_PARTY_CONSCIENCE_RESPECT_ACTION_PATTERN =
  /^(?:(?:oyun|etkinlik|gozlem)\s+sirasinda\s+)?(?:arkadasinin|baskasinin|bir\s+baskasinin|diger\s+cocugun).{0,60}(?:inancina|ibadetine|kiyafetine|basortusune|mezhebine).{0,80}(?:saygi\s+goster(?:di|ip)|alan\s+acti|mudahale\s+etmedi|zorlamadi|rahatsiz\s+etmedi)\s*[.!?]?$/i;
const PEDAGOGICAL_RAW_SENSITIVE_PERSONAL_DATA_PATTERNS = Object.freeze([
  /(?<![\p{L}\p{M}])(?:tanı|teşhis|hastalık|alerji|ilaç|reçete|sağlık\s+raporu|doktor\s+raporu|epilepsi|diyabet|şeker\s+hastalığı|otizm|dehb|astım|ameliyat|psikiyatri|terapi|engellilik|işitme\s+kaybı|görme\s+kaybı)(?:[\p{L}\p{M}]*)?(?![\p{L}\p{M}])/iu,
  /(?:ateşi\s+(?:çıktı|vardı|ölçüldü|\d)|vücut\s+sıcaklığı|(?:epileptik\s+)?nöbet\s+geçirdi)/iu,
  /(?<![\p{L}\p{M}])(?:özel\s+bölge|mahrem\s+bölge|genital|çıplak|soyun(?:du|muş|ma|mak)|altını\s+ıslat(?:tı|mış|ma)|tuvalet\s+kazası|regl|adet\s+gör(?:dü|müş|me)|beden\s+ölçüsü)(?:[\p{L}\p{M}]*)?(?![\p{L}\p{M}])/iu,
  /(?<![\p{L}\p{M}])(?:boşan(?:dı|mış|ma)|velayet|evlatlık|evlat\s+edin(?:me|ilmiş)|koruyucu\s+aile|aile\s+içi\s+şiddet|istismar|ihmal|aile\s+sırrı|tek\s+ebeveyn|üvey\s+(?:anne|baba)|evsiz|cezaevi|hapiste|işsiz|yoksulluk)(?:[\p{L}\p{M}]*)?(?![\p{L}\p{M}])/iu,
  /(?:çocuğun|öğrencinin|onun)\s+(?:kilosu|boyu|beden\s+ölçüsü)|(?:ailenin|ailesinin|annesinin|babasının)\s+(?:geliri|borcu|sağlık\s+durumu)/iu,
]);
const PEDAGOGICAL_RAW_ASCII_SENSITIVE_PERSONAL_DATA_PATTERN =
  /(?<![a-z])(?:tani|teshis|hastalik|alerji|ilac|recete|saglik\s+raporu|doktor\s+raporu|epilepsi|diyabet|seker\s+hastaligi|otizm|dehb|astim|ameliyat|psikiyatri|terapi|engellilik|isitme\s+kaybi|gorme\s+kaybi|ozel\s+bolge|mahrem\s+bolge|genital|ciplak|soyun|altini\s+islat|tuvalet\s+kazasi|regl|adet\s+gor|beden\s+olcusu|bosan|velayet|evlatlik|evlat\s+edin|koruyucu\s+aile|aile\s+ici\s+siddet|istismar|ihmal|aile\s+sirri|tek\s+ebeveyn|uvey\s+(?:anne|baba)|evsiz|cezaevi|hapiste|issiz|yoksulluk)[a-z]*(?![a-z])/i;

export type TeacherEvidenceRole = "supports" | "contrasts" | "context_only";
const CANONICAL_ACTION_SOURCE = VALUES_PEDAGOGY_CONSTITUTION.canonicalSource.preschoolActionSource;
const CULTURAL_BRIDGE_ID_SET = new Set(
  VALUES_PEDAGOGY_CONSTITUTION.culturalBridges.map((bridge) => bridge.id),
);

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} nesne olmalıdır.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  item: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
  required: readonly string[] = allowed,
): void {
  const unexpected = Object.keys(item).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    throw new Error(`${label} beklenmeyen alan içeriyor: ${unexpected.join(", ")}.`);
  }
  const missing = required.filter((key) => !(key in item));
  if (missing.length > 0) {
    throw new Error(`${label} zorunlu alanları eksik: ${missing.join(", ")}.`);
  }
}

function text(value: unknown, label: string, maximumLength = 4000): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} boş bırakılamaz.`);
  }
  const normalized = value.trim().normalize("NFC");
  if (normalized.length > maximumLength) {
    throw new Error(`${label} en fazla ${maximumLength} karakter olabilir.`);
  }
  if (MORAL_LABEL_PATTERN.test(normalized)) {
    throw new Error(`${label} çocuk kişiliğini veya inancını etiketleyen dil içeremez.`);
  }
  if (CHILD_RIGHTS_HARD_STOP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new Error(`${label} çocuk hakkı, inanç özgürlüğü veya gönüllülük güvenlik sınırını ihlal ediyor.`);
  }
  return normalized;
}

function pedagogicalSecurityAsciiFold(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("tr-TR")
    .replace(/\p{M}/gu, "")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ç", "c")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u");
}

/**
 * Öğretmenin gözlem–değer eylemi bağını açıklayan gerekçeyi güvenli tutar.
 * Bu metin bir puan, tanı, karakter hükmü veya inanç uygunluğu kaydı değildir.
 */
export function parseSafeTeacherRationale(value: unknown): string {
  if (
    typeof value === "string" &&
    TEACHER_RATIONALE_FORBIDDEN_UNICODE_PATTERN.test(value)
  ) {
    throw new Error(
      "Öğretmen kanıt gerekçesi tek satır olmalı; kontrol, görünmez format veya bidi karakteri içeremez.",
    );
  }
  const normalized = text(value, "Öğretmen kanıt gerekçesi", 1000);
  if (
    EVIDENCE_RATIONALE_HARD_STOP_PATTERNS.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    throw new Error(
      "Öğretmen kanıt gerekçesi puan, etiket, kazanım veya kalıcı karakter hükmü içeremez.",
    );
  }
  return normalized;
}

/** Rol-duyarlı inanç özgürlüğü ve kültürel bağlam kapısını uygular. */
export function parseTeacherEvidenceRationale(
  value: unknown,
  evidenceRole: TeacherEvidenceRole,
): string {
  if (
    evidenceRole !== "supports" &&
    evidenceRole !== "contrasts" &&
    evidenceRole !== "context_only"
  ) {
    throw new Error("Öğretmen kanıt rolü geçersiz.");
  }
  const normalized = parseSafeTeacherRationale(value);
  const comparisonText = normalized.toLocaleLowerCase("tr-TR");
  if (!SENSITIVE_BELIEF_OR_PRACTICE_PATTERN.test(comparisonText)) {
    return normalized;
  }
  if (evidenceRole !== "context_only") {
    if (THIRD_PARTY_CONSCIENCE_RESPECT_ACTION_PATTERN.test(comparisonText)) {
      return normalized;
    }
    throw new Error(
      "İnanç veya ibadet katılımı supports/contrasts rolünde değer kanıtı yapılamaz.",
    );
  }
  if (
    !SAFE_CULTURAL_CONTEXT_PATTERN.test(comparisonText) ||
    !JUDGMENT_FREE_CULTURAL_CONTEXT_NARRATIVE_PATTERN.test(comparisonText) ||
    VALUE_JUDGMENT_CLAIM_PATTERN.test(comparisonText)
  ) {
    throw new Error(
      "İnanç veya ibadet ifadesi context_only rolünde yalnız yargısız kültürel bağlam olarak açıklanabilir.",
    );
  }
  return normalized;
}

/**
 * Haftalık kanıt özeti ve öğretmen yansıtması için ortak güvenlik kapısı.
 * Satır sonlarını tek boşluğa indirger; puan, karakter hükmü ve kişisel
 * inanç/ibadet performansını sonraki plana taşımayı reddeder.
 */
export function parseTeacherWeeklyValuesNarrative(
  value: unknown,
  label: string,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} boş bırakılamaz.`);
  }
  if (TEACHER_NARRATIVE_FORBIDDEN_UNICODE_PATTERN.test(value)) {
    throw new Error(
      `${label} görünmez format, bidi veya izin verilmeyen kontrol karakteri içeremez.`,
    );
  }
  const normalized = text(
    value.replace(/[\r\n\t]+/gu, " ").replace(/ {2,}/gu, " "),
    label,
    2_000,
  );
  if (
    EVIDENCE_RATIONALE_HARD_STOP_PATTERNS.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    throw new Error(
      `${label} puan, etiket, kazanım veya kalıcı karakter hükmü içeremez.`,
    );
  }
  const comparisonText = normalized.toLocaleLowerCase("tr-TR");
  if (!SENSITIVE_BELIEF_OR_PRACTICE_PATTERN.test(comparisonText)) {
    return normalized;
  }
  if (THIRD_PARTY_CONSCIENCE_RESPECT_ACTION_PATTERN.test(comparisonText)) {
    return normalized;
  }
  if (
    SAFE_CULTURAL_CONTEXT_PATTERN.test(comparisonText) &&
    JUDGMENT_FREE_CULTURAL_CONTEXT_NARRATIVE_PATTERN.test(comparisonText) &&
    !VALUE_JUDGMENT_CLAIM_PATTERN.test(comparisonText)
  ) {
    return normalized;
  }
  throw new Error(
    `${label} çocuğun inanç, mezhep veya ibadet performansını değer kanıtı yapamaz.`,
  );
}

/**
 * Genel pedagojik gözlem deposunun yazma-öncesi güvenlik kapısıdır.
 * Doğrulama için karşılaştırma metni normalize edilir; değişmez kanıt niteliği
 * korunabilsin diye başarılı sonuçta çağıranın verdiği metin byte-anlamında
 * değiştirilmeden geri döndürülür.
 */
export function parsePedagogicalRawObservationText(
  value: unknown,
  label = "Ham gözlem",
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} boş bırakılamaz.`);
  }
  if (value.length > 100_000) {
    throw new Error(`${label} en fazla 100000 karakter olabilir.`);
  }
  if (TEACHER_NARRATIVE_FORBIDDEN_UNICODE_PATTERN.test(value)) {
    throw new Error(
      `${label} görünmez format, bidi veya izin verilmeyen kontrol karakteri içeremez.`,
    );
  }

  const comparisonText = value
    .trim()
    .normalize("NFC")
    .toLocaleLowerCase("tr-TR");
  const asciiComparisonText = pedagogicalSecurityAsciiFold(value.trim());
  const beliefComparisonText = comparisonText.replace(
    /(?<![\p{L}\p{M}])kıyafet[\p{L}\p{M}]*(?![\p{L}\p{M}])/giu,
    " ",
  );
  if (
    MORAL_LABEL_PATTERN.test(comparisonText) ||
    SOURCE_OBSERVATION_MORAL_JUDGMENT_PATTERN.test(comparisonText) ||
    PEDAGOGICAL_RAW_PERMANENT_VALUE_JUDGMENT_PATTERN.test(comparisonText) ||
    PEDAGOGICAL_RAW_ASCII_MORAL_OR_SCORE_PATTERNS.some((pattern) =>
      pattern.test(asciiComparisonText),
    ) ||
    EVIDENCE_RATIONALE_HARD_STOP_PATTERNS.some((pattern) =>
      // Gerekçe için gerekli iki geniş ilişki tarayıcısı, "çocuk ... su
      // seviyesi" gibi fiziksel gözlemleri de eşler. Genel ham gözlemde açık
      // puan kalıpları ve doğrudan yargı tarayıcıları yeterlidir.
      pattern !== EVIDENCE_CONTEXTUAL_VALUE_JUDGMENT_FORWARD_PATTERN &&
      pattern !== EVIDENCE_CONTEXTUAL_VALUE_JUDGMENT_REVERSE_PATTERN &&
      pattern.test(comparisonText),
    )
  ) {
    throw new Error(
      `${label} puan, ahlak/karakter etiketi veya çocuk hakkında kalıcı hüküm içeremez.`,
    );
  }
  if (
    (SENSITIVE_BELIEF_OR_PRACTICE_PATTERN.test(beliefComparisonText) ||
      PEDAGOGICAL_RAW_ASCII_BELIEF_OR_PRACTICE_PATTERN.test(
        asciiComparisonText,
      )) &&
    !THIRD_PARTY_CONSCIENCE_RESPECT_ACTION_PATTERN.test(comparisonText) &&
    !PEDAGOGICAL_RAW_ASCII_THIRD_PARTY_CONSCIENCE_RESPECT_ACTION_PATTERN.test(
      asciiComparisonText,
    )
  ) {
    throw new Error(
      `${label} kişisel inanç, mezhep veya ibadet bilgisini genel pedagojik gözlem olarak saklayamaz.`,
    );
  }
  if (
    PEDAGOGICAL_RAW_SENSITIVE_PERSONAL_DATA_PATTERNS.some((pattern) =>
      pattern.test(comparisonText),
    ) ||
    PEDAGOGICAL_RAW_ASCII_SENSITIVE_PERSONAL_DATA_PATTERN.test(
      asciiComparisonText,
    )
  ) {
    throw new Error(
      `${label} sağlık, beden veya aileye ilişkin hassas kişisel bilgiyi genel pedagojik gözlem olarak saklayamaz.`,
    );
  }
  return value;
}

/**
 * Ham gözlem değişmez kalır; bu kontrol yalnız o gözlemin bir değer eylemine
 * bağlanmaya uygun olup olmadığını belirler.
 */
export function assertValueEvidenceSourceObservationPolicy(
  rawObservation: unknown,
  evidenceRole: TeacherEvidenceRole,
  teacherRationale: string,
): void {
  if (typeof rawObservation !== "string" || !rawObservation.trim()) {
    throw new Error("Değer kanıtı için değişmez ham gözlem metni gereklidir.");
  }
  if (TEACHER_NARRATIVE_FORBIDDEN_UNICODE_PATTERN.test(rawObservation)) {
    throw new Error(
      "Ham gözlem görünmez format, bidi veya izin verilmeyen kontrol karakteri içerdiği için değer eylemine bağlanamaz.",
    );
  }
  const comparisonText = rawObservation
    .normalize("NFC")
    .toLocaleLowerCase("tr-TR");
  if (
    MORAL_LABEL_PATTERN.test(comparisonText) ||
    SOURCE_OBSERVATION_MORAL_JUDGMENT_PATTERN.test(comparisonText)
  ) {
    throw new Error(
      "Çocuk hakkında puan veya kalıcı karakter hükmü içeren ham gözlem değer eylemine bağlanamaz.",
    );
  }
  if (!SENSITIVE_BELIEF_OR_PRACTICE_PATTERN.test(comparisonText)) {
    return;
  }
  if (THIRD_PARTY_CONSCIENCE_RESPECT_ACTION_PATTERN.test(comparisonText)) {
    return;
  }
  if (evidenceRole === "context_only") {
    const rationaleComparison = teacherRationale.toLocaleLowerCase("tr-TR");
    if (
      SAFE_CULTURAL_CONTEXT_PATTERN.test(rationaleComparison) &&
      JUDGMENT_FREE_CULTURAL_CONTEXT_NARRATIVE_PATTERN.test(
        rationaleComparison,
      ) &&
      !VALUE_JUDGMENT_CLAIM_PATTERN.test(rationaleComparison)
    ) {
      return;
    }
  }
  throw new Error(
    "Çocuğun kişisel inancı, mezhebi veya ibadet katılımını anlatan ham gözlem supports/contrasts değer kanıtına dönüştürülemez.",
  );
}

function textArray(value: unknown, label: string, minimum = 1, maximum = 20): string[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Error(`${label} ${minimum}–${maximum} kayıt içermelidir.`);
  }
  return value.map((candidate, index) => text(candidate, `${label}[${index}]`));
}

function valueCode(value: unknown, label: string): ValueCode {
  if (typeof value !== "string" || !VALUE_CODE_SET.has(value)) {
    throw new Error(`${label} D1–D20 arasında tanımlı bir değer kodu olmalıdır.`);
  }
  return value as ValueCode;
}

function roofValueCode(value: unknown): RoofValueCode {
  if (typeof value !== "string" || !ROOF_VALUE_CODE_SET.has(value)) {
    throw new Error("Çatı değer kodu yalnız D1, D14 veya D16 olabilir.");
  }
  return value as RoofValueCode;
}

function parseOfficialActionSnapshot(
  value: unknown,
  selectedValueCodes: ReadonlySet<ValueCode>,
): OfficialValueActionSnapshot {
  const item = record(value, "Resmî değer eylemi snapshot'ı");
  exactKeys(item, [
    "valueCode", "actionCode", "actionName", "indicatorCode", "indicatorText",
    "catalogId", "sourceVersion", "sourceUrl", "sourceSha256", "sourcePage",
  ], "Resmî değer eylemi snapshot'ı");
  const selectedValueCode = valueCode(item.valueCode, "Eylemin üst değer kodu");
  const actionCode = text(item.actionCode, "Resmî değer eylemi üst eylem kodu");
  const indicatorCode = text(item.indicatorCode, "Resmî değer eylemi gösterge kodu");
  if (!/^D(?:[1-9]|1\d|20)\.\d+$/.test(actionCode)) {
    throw new Error("Resmî değer eylemi üst eylem kodu Dn.n biçiminde olmalıdır.");
  }
  if (!/^D(?:[1-9]|1\d|20)\.\d+\.\d+$/.test(indicatorCode)) {
    throw new Error("Resmî değer eylemi gösterge kodu Dn.n.n biçiminde olmalıdır.");
  }
  if (
    !selectedValueCodes.has(selectedValueCode) ||
    !actionCode.startsWith(`${selectedValueCode}.`) ||
    !indicatorCode.startsWith(`${actionCode}.`)
  ) {
    throw new Error("Resmî eylem, etkinlikte seçili değerlerden birine bağlı olmalıdır.");
  }
  if (
    item.catalogId !== CANONICAL_ACTION_SOURCE.catalogId ||
    item.sourceVersion !== CANONICAL_ACTION_SOURCE.sourceVersion ||
    item.sourceUrl !== CANONICAL_ACTION_SOURCE.sourceUrl ||
    item.sourceSha256 !== CANONICAL_ACTION_SOURCE.sourceSha256
  ) {
    throw new Error("Resmî değer eylemi kanonik TYMM Okul Öncesi Ek-14 kaynak zinciriyle eşleşmelidir.");
  }
  if (
    typeof item.sourcePage !== "number" ||
    !Number.isInteger(item.sourcePage) ||
    item.sourcePage < CANONICAL_ACTION_SOURCE.sourcePageRange[0] ||
    item.sourcePage > CANONICAL_ACTION_SOURCE.sourcePageRange[1]
  ) {
    throw new Error("Resmî eylem kaynak sayfası Ek-14'ün 324–332 PDF PageLabel aralığında olmalıdır.");
  }
  const snapshot = Object.freeze({
    valueCode: selectedValueCode,
    actionCode,
    actionName: text(item.actionName, "Resmî değer eylemi üst eylem adı"),
    indicatorCode,
    indicatorText: text(item.indicatorText, "Resmî değer eylemi gösterge metni"),
    catalogId: text(item.catalogId, "Değer eylemi katalog kimliği"),
    sourceVersion: text(item.sourceVersion, "Değer eylemi kaynak sürümü"),
    sourceUrl: text(item.sourceUrl, "Değer eylemi kaynak URL'si"),
    sourceSha256: item.sourceSha256 as `sha256:${string}`,
    sourcePage: Number(item.sourcePage),
  });
  assertOfficialPreschoolValueActionSnapshot(snapshot);
  return snapshot;
}

export function parseActivityValueMapping(value: unknown): ActivityValueMapping {
  const item = record(value, "Etkinlik değer eşlemesi");
  const mappingKeys = [
    "designDirection", "primaryValueCode", "roofValueCode", "roofValueChecks", "supportingValueCodes",
    "officialActionSnapshots", "culturalBridgeIds", "rationale", "livedContextOrDilemma",
    "adultModelActions", "childAgencyOptions", "repairOrContributionOptions",
    "familyCommunityTransfer", "natureStewardshipTransfer", "observationPrompts",
    "counterEvidencePrompt", "reflectionPrompt", "nextPlanDecisionRule",
  ] as const;
  exactKeys(
    item,
    mappingKeys,
    "Etkinlik değer eşlemesi",
    mappingKeys.filter((key) => key !== "familyCommunityTransfer" && key !== "natureStewardshipTransfer"),
  );
  if (item.designDirection !== "learning_outcome_led" && item.designDirection !== "value_led") {
    throw new Error("Değer tasarım yönü learning_outcome_led veya value_led olmalıdır.");
  }
  const primaryValueCode = valueCode(item.primaryValueCode, "Ana değer kodu");
  const selectedRoofValueCode = roofValueCode(item.roofValueCode);
  if (ROOF_VALUE_CODE_SET.has(primaryValueCode) && selectedRoofValueCode !== primaryValueCode) {
    throw new Error("Ana değer bir çatı değerse çatı ankrajı aynı kod olmalıdır.");
  }
  const primaryDefinition = valueDefinitionByCode(primaryValueCode);
  if (!primaryDefinition.roofLinks.includes(selectedRoofValueCode)) {
    throw new Error("Çatı ankrajı ana değerin kanonik çatı bağlantılarından biri olmalıdır.");
  }
  const roofChecks = record(item.roofValueChecks, "Üçlü çatı değer kontrolü");
  exactKeys(
    roofChecks,
    ["respect", "responsibility", "justice"],
    "Üçlü çatı değer kontrolü",
  );
  if (!Array.isArray(item.supportingValueCodes) || item.supportingValueCodes.length > 2) {
    throw new Error("Bir etkinlik en fazla iki destekleyici değer taşıyabilir.");
  }
  const supportingValueCodes = item.supportingValueCodes.map((candidate, index) =>
    valueCode(candidate, `Destekleyici değer[${index}]`),
  );
  const mappedValueCodes = [primaryValueCode, ...supportingValueCodes];
  if (new Set(mappedValueCodes).size !== mappedValueCodes.length) {
    throw new Error("Ana ve destekleyici değer kodları benzersiz olmalıdır.");
  }
  if (
    !Array.isArray(item.officialActionSnapshots) ||
    item.officialActionSnapshots.length === 0 ||
    item.officialActionSnapshots.length > 3
  ) {
    throw new Error("Etkinlik bir ila üç resmî okul öncesi değer eylemi snapshot'ı taşımalıdır.");
  }
  const selectedValueCodeSet = new Set<ValueCode>([
    primaryValueCode,
    selectedRoofValueCode,
    ...supportingValueCodes,
  ]);
  const officialActionSnapshots = item.officialActionSnapshots.map((candidate) =>
    parseOfficialActionSnapshot(candidate, selectedValueCodeSet),
  );
  if (new Set(officialActionSnapshots.map((snapshot) => snapshot.indicatorCode)).size !== officialActionSnapshots.length) {
    throw new Error("Resmî değer eylemi gösterge kodları benzersiz olmalıdır.");
  }
  const culturalBridgeIds = textArray(item.culturalBridgeIds, "Kültürel köprüler", 0);
  if (culturalBridgeIds.length > 2 || new Set(culturalBridgeIds).size !== culturalBridgeIds.length) {
    throw new Error("Bir etkinlik en fazla iki benzersiz kültürel köprü taşıyabilir.");
  }
  if (culturalBridgeIds.some((bridgeId) => !CULTURAL_BRIDGE_ID_SET.has(bridgeId))) {
    throw new Error("Kültürel köprü kimliği kanonik değer anayasasında tanımlı olmalıdır.");
  }

  const optionalText = (candidate: unknown, label: string): string | undefined =>
    candidate === undefined ? undefined : text(candidate, label);
  const familyCommunityTransfer = optionalText(
    item.familyCommunityTransfer,
    "Aile/toplum aktarımı",
  );
  const natureStewardshipTransfer = optionalText(
    item.natureStewardshipTransfer,
    "Doğa sorumluluğu aktarımı",
  );

  return Object.freeze({
    designDirection: item.designDirection,
    primaryValueCode,
    roofValueCode: selectedRoofValueCode,
    roofValueChecks: Object.freeze({
      respect: text(roofChecks.respect, "Saygı kontrolü"),
      responsibility: text(roofChecks.responsibility, "Sorumluluk kontrolü"),
      justice: text(roofChecks.justice, "Adalet kontrolü"),
    }),
    supportingValueCodes: Object.freeze(supportingValueCodes),
    officialActionSnapshots: Object.freeze(officialActionSnapshots),
    culturalBridgeIds: Object.freeze(culturalBridgeIds),
    rationale: text(item.rationale, "Değer eşleme gerekçesi"),
    livedContextOrDilemma: text(item.livedContextOrDilemma, "Yaşantı veya ikilem bağlamı"),
    adultModelActions: Object.freeze(textArray(item.adultModelActions, "Yetişkin model eylemleri")),
    childAgencyOptions: Object.freeze(textArray(item.childAgencyOptions, "Çocuk ajansı seçenekleri")),
    repairOrContributionOptions: Object.freeze(textArray(item.repairOrContributionOptions, "Onarma veya katkı seçenekleri")),
    ...(familyCommunityTransfer === undefined ? {} : { familyCommunityTransfer }),
    ...(natureStewardshipTransfer === undefined ? {} : { natureStewardshipTransfer }),
    observationPrompts: Object.freeze(textArray(item.observationPrompts, "Değer gözlem soruları")),
    counterEvidencePrompt: text(item.counterEvidencePrompt, "Çelişen kanıt sorusu"),
    reflectionPrompt: text(item.reflectionPrompt, "Öğretmen yansıtma sorusu"),
    nextPlanDecisionRule: text(item.nextPlanDecisionRule, "Sonraki plan karar kuralı"),
  });
}

function uniqueValidValueCodes(codes: readonly string[]): ValueCode[] {
  const unique = [...new Set(codes)];
  for (const code of unique) valueCode(code, "Kapsama değer kodu");
  return unique as ValueCode[];
}

export function evaluateMonthlyCodeSelectionCoverage(codes: readonly string[]): ValueCoverageResult {
  const coveredValueCodes = uniqueValidValueCodes(codes);
  return Object.freeze({
    valid: coveredValueCodes.length >= 4,
    coveredValueCodes: Object.freeze(coveredValueCodes),
    missingValueCodes: Object.freeze(VALUE_CODES.filter((code) => !coveredValueCodes.includes(code))),
    minimumRequired: 4,
  });
}

export function evaluateTermCodeSelectionCoverage(codes: readonly string[]): ValueCoverageResult {
  const coveredValueCodes = uniqueValidValueCodes(codes);
  const missingValueCodes = VALUE_CODES.filter((code) => !coveredValueCodes.includes(code));
  return Object.freeze({
    valid: missingValueCodes.length === 0,
    coveredValueCodes: Object.freeze(coveredValueCodes),
    missingValueCodes: Object.freeze(missingValueCodes),
    minimumRequired: VALUE_CODES.length,
  });
}
