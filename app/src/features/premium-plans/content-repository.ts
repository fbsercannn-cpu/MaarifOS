import {
  PREMIUM_PLAN_LENS_IDS,
  PREMIUM_PLAN_SKUS,
  type PremiumActivityTemplate,
  type PremiumActivityEditorialReview,
  type PremiumActivityValueDesign,
  type PremiumContentPack,
  type PremiumContentPackSnapshot,
  type PremiumAnnualMonth,
  type PremiumFullDayFlowBlock,
  type PremiumMonthlyPlan,
  type PremiumPlanLens,
  type PremiumPlanLensId,
  type PremiumPlanWeek,
  type PremiumValuesContractSnapshot,
} from "./domain.ts";
import { isCivilDate } from "../../core/domain/attendance.ts";
import { PREMIUM_PILOT_LENS_IDS } from "./lens-catalog.ts";
import {
  evaluateMonthlyCodeSelectionCoverage,
  parseActivityValueMapping,
} from "../values/value-plan-models.ts";
import { parseCulturalContexts } from "../values/value-plan-contracts.ts";
import {
  HUMAN_REVIEW_ROLES,
  VALUES_PEDAGOGY_CONSTITUTION,
} from "../values/values-constitution.ts";
import { OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG } from "../values/official-preschool-value-actions.ts";

export const PREMIUM_VALUES_V3_RELEASE_IDENTITY = Object.freeze({
  id: "maarifos-tymm-6072-2026-2027-v3",
  version: "3.0.0",
  contentReleaseId: "tymm-6072-2026-09-v3",
  manifestDigest:
    "sha256:9b4c2bcc155e3f6f8567ba5737249cd417405bc4205b75b68d194e63ca3eff1e",
  sku: "TYMM-6072",
  displayName: "TYMM 2024 · 60–72 Ay · 2026–2027",
  academicRelease: "2026-2027",
  ageProfile: "60-72",
  sourceUrl:
    "https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf",
  sourceCheckedOn: "2026-07-29",
  valuesMappingStatus: "machine_validated_pending_human_review",
} as const);

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} nesne olmalıdır.`);
  }
  return value as Record<string, unknown>;
}

function textValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} boş olmayan metin olmalıdır.`);
  }
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`${label} metin dizisi olmalıdır.`);
  }
  return [...value];
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    throw new Error(`${label} beklenmeyen alan içeriyor: ${unexpected.join(", ")}`);
  }
}

function utcTimestamp(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${label} milisaniyeli UTC ISO-8601 zaman damgası olmalıdır.`);
  }
  return value;
}

const UNICODE_TOKEN_START = String.raw`(?<![\p{L}\p{M}])`;
const UNICODE_TOKEN_END = String.raw`(?![\p{L}\p{M}])`;

function unicodePhrasePattern(source: string): RegExp {
  return new RegExp(
    `${UNICODE_TOKEN_START}(?:${source})${UNICODE_TOKEN_END}`,
    "iu",
  );
}

function unicodeSequencePattern(
  first: string,
  second: string,
  maximumDistance: number,
): RegExp {
  return new RegExp(
    `${UNICODE_TOKEN_START}(?:${first})${UNICODE_TOKEN_END}[\\s\\S]{0,${maximumDistance}}${UNICODE_TOKEN_START}(?:${second})${UNICODE_TOKEN_END}`,
    "iu",
  );
}

const SENSITIVE_IDENTITY_TEXT = String.raw`inanç(?:sızlık|ı|ın|a|tan)?|ibadet(?:i|in|e|ten)?|mezhep(?:i|in|e|ten)?|giyim(?:i|in|e|den)?|kıyafet(?:i|in|e|ten)?|aile biçimi|aile formu|aile yapısı|ritüel(?:i|in|e|den)?|dua(?:yı|nın|ya|dan)?|namaz(?:ı|ın|a|dan)?|oruç|orucu|oruca|orucun|oruçtan|dinî katılım|dini katılım`;
const SCORING_OR_MANDATE_TEXT = String.raw`puanlanır|puanlanacak|puanlama yapılır|not verilir|notlandırılır|sıralanır|derecelendirilir|başarısız sayılır|eksik sayılır|olumsuz sayılır|zorunludur|zorunlu tutulur|şarttır`;

const V3_ACTIVITY_TEXT_HARD_STOPS = Object.freeze([
  {
    id: "coercion-punishment-or-shame",
    pattern: unicodePhrasePattern(
      String.raw`zorla|zorlanır|zorlanacak|zorlanmalıdır|mecbur edilir|mecbur bırakılır|reddedemez|itiraz edemez|utandırılır|korkutulur|cezalandırılır|cezalandırılacak|ceza verilir|tehdit edilir|dışlanır|katılmak zorunda(?:dır)?(?!\s+değil(?:dir)?(?:$|[^\p{L}\p{M}]))`,
    ),
  },
  {
    id: "belief-or-identity-scoring",
    pattern: unicodeSequencePattern(
      SENSITIVE_IDENTITY_TEXT,
      SCORING_OR_MANDATE_TEXT,
      120,
    ),
  },
  {
    id: "scoring-or-force-before-sensitive-identity",
    pattern: unicodeSequencePattern(
      SCORING_OR_MANDATE_TEXT,
      SENSITIVE_IDENTITY_TEXT,
      120,
    ),
  },
  {
    id: "forced-religious-participation",
    pattern: unicodeSequencePattern(
      String.raw`herkes|her çocuk|tüm çocuklar`,
      String.raw`dua eder|namaz kılar|ibadete katılır|ritüele katılır`,
      80,
    ),
  },
  {
    id: "secrecy-or-blocked-help-seeking",
    pattern: unicodePhrasePattern(
      String.raw`kimseye anlatma|sır olarak sakla|yardım istemesin|yardım istemek yasak|şikâyet etme|şikayet etme`,
    ),
  },
  {
    id: "forced-touch-apology-or-sharing",
    pattern: unicodeSequencePattern(
      String.raw`zorunlu|mecbur`,
      String.raw`sarılma|öpme|fiziksel temas|özür|paylaşma`,
      60,
    ),
  },
  {
    id: "blind-obedience",
    pattern: unicodeSequencePattern(
      String.raw`(?:kör|koşulsuz)\s+itaat`,
      String.raw`beklenir|istenir|zorunludur|şarttır|öğretilir`,
      60,
    ),
  },
  {
    id: "sectarian-cultural-or-national-superiority",
    pattern: unicodeSequencePattern(
      String.raw`din|mezhep|inanç|millet|halk|dil|kültür`,
      String.raw`üstündür|daha üstündür|aşağıdır|değersizdir|düşmandır|kötüdür`,
      100,
    ),
  },
]);

const V3_MEDIA_PHOTO_OR_IMAGE_TERM_SOURCE = String.raw`(?:foto(?:graf)?[a-z]*|goruntu[a-z]*)`;
const V3_MEDIA_HIGH_RISK_ARTIFACT_TERM_SOURCE = String.raw`(?:video[a-z]*|ozcekim[a-z]*|selfie[a-z]*|ses\s+(?:kaydi[a-z]*|dosya[a-z]*)|(?:cocuk|cocugun|cocuklarin|ogrenci|ogrencinin|ogrencilerin|kendi)\s+foto(?:graf)?[a-z]*|(?:cocuga|ogrenciye)\s+ait\s+foto(?:graf)?[a-z]*)`;
const V3_CHILD_VISUAL_PRODUCT_SOURCE = String.raw`(?:(?:cocuk|cocugun|cocuklarin|ogrenci|ogrencinin|ogrencilerin|kendi)\s+(?:resm[a-z]*|portre[a-z]*|cizim[a-z]*|calisma[a-z]*|urun[a-z]*)|(?:cocuga|ogrenciye)\s+ait\s+(?:resm[a-z]*|portre[a-z]*|cizim[a-z]*|calisma[a-z]*|urun[a-z]*))`;
const V3_MEDIA_ARTIFACT_TERM_SOURCE = String.raw`(?:${V3_MEDIA_HIGH_RISK_ARTIFACT_TERM_SOURCE}|${V3_MEDIA_PHOTO_OR_IMAGE_TERM_SOURCE})`;
const V3_MEDIA_ARTIFACT_TERM_PATTERN = new RegExp(
  `(?<![a-z])${V3_MEDIA_ARTIFACT_TERM_SOURCE}(?![a-z])`,
  "i",
);
const V3_MEDIA_HIGH_RISK_ARTIFACT_TERM_PATTERN = new RegExp(
  `(?<![a-z])${V3_MEDIA_HIGH_RISK_ARTIFACT_TERM_SOURCE}(?![a-z])`,
  "i",
);
const V3_MEDIA_PHOTO_OR_IMAGE_TERM_PATTERN = new RegExp(
  `(?<![a-z])${V3_MEDIA_PHOTO_OR_IMAGE_TERM_SOURCE}(?![a-z])`,
  "i",
);
const V3_CHILD_VISUAL_PRODUCT_PATTERN = new RegExp(
  `(?<![a-z])${V3_CHILD_VISUAL_PRODUCT_SOURCE}(?![a-z])`,
  "i",
);
const V3_CHILD_OR_STUDENT_REFERENCE_PATTERN =
  /(?<![a-z])(?:cocuk[a-z]*|cocug[a-z]*|ogrenci[a-z]*)(?![a-z])/i;
const V3_CHILD_OR_FRAME_REFERENCE_PATTERN =
  /(?<![a-z])(?:cocuk[a-z]*|cocug[a-z]*|ogrenci[a-z]*|kadra[a-z]*|yuz[a-z]*)(?![a-z])/i;
const V3_CHILD_RECORDABLE_EXPRESSION_SOURCE = String.raw`(?:(?:cocuk|cocugun|cocuklarin|ogrenci|ogrencinin|ogrencilerin)\s+(?:ses[a-z]*|soz[a-z]*|konusma[a-z]*|anlati[a-z]*|yanit[a-z]*|cevap[a-z]*|okuma[a-z]*|sesli\s+(?:yanit|cevap)[a-z]*|(?:sozlu\s+)?anlatim[a-z]*)|sozlu\s+anlatim[a-z]*)`;
const V3_CHILD_RECORDABLE_EXPRESSION_PATTERN = new RegExp(
  `(?<![a-z])${V3_CHILD_RECORDABLE_EXPRESSION_SOURCE}(?![a-z])`,
  "i",
);
const V3_MEDIA_RECORDING_ACTION_PATTERN =
  /(?<![a-z])(?:cekilir|cekilebilir|cekebilir|cekim\s+yapilir|cekim\s+yapilabilir|fotograflanir|fotograflanabilir|fotograflayabilir|goruntulenir|goruntulenebilir|goruntuleyebilir|kaydedilir|kaydedilebilir|kaydedebilir|kaydeder|kayit\s+alinir|kayit\s+alinabilir|kayit\s+altina\s+alinir|kayit\s+altina\s+alinabilir|kayit\s+yapilir|kayit\s+yapilabilir|kayda\s+alir|kayda\s+alabilir|kayda\s+alinir|kayda\s+alinabilir|kamera[a-z]*\s+alir|kamera[a-z]*\s+alabilir|telefon[a-z]*\s+alinir|telefon[a-z]*\s+alinabilir|cihaz[a-z]*\s+alinir|cihaz[a-z]*\s+alinabilir|kayda\s+gecirilir|kayda\s+gecirilebilir|kadraja\s+girer|kadraja\s+girebilir|arsivlenir|arsivlenebilir|saklanir|saklanabilir|yuklenir|yuklenebilir|belgelenir|belgelenebilir)(?![a-z])/i;
const V3_SAFE_NON_CHILD_PHOTO_CONTEXT_PATTERN =
  /(?:sinif(?:\s+alan[a-z]*)?|koridor[a-z]*|rota[a-z]*|mekan[a-z]*|ortam[a-z]*|nesne[a-z]*|gunluk\s+akis[a-z]*|yon[a-z]*)(?:\s+ait)?(?:\s*(?:ve|\/|-)\s*(?:sinif(?:\s+alan[a-z]*)?|koridor[a-z]*|rota[a-z]*|mekan[a-z]*|ortam[a-z]*|nesne[a-z]*|gunluk\s+akis[a-z]*|yon[a-z]*)(?:\s+ait)?)?\s+(?:foto(?:graf)?[a-z]*|goruntu[a-z]*)/gi;
const V3_MEDIA_ABSENCE_PATTERN = new RegExp(
  `(?<![a-z])${V3_MEDIA_ARTIFACT_TERM_SOURCE}(?:\\s+[a-z]+){0,3}\\s+(?:olmadan|olmaksizin|kullanmadan)(?![a-z])`,
  "gi",
);
const V3_MEDIA_NEGATIVE_ACTION_AT_END_PATTERN =
  /(?<![a-z])(?:[a-z]+(?:maz|mez|mamalidir|memelidir|mamali|memeli|mayacak(?:tir)?|meyecek(?:tir)?)|kullanma|paylasma|aktarma|iletme|dagitma|gonderme|gosterme|sergileme|yukleme|uretme|cekme|kaydetme|izin\s+verilmez|yasaktir|mumkun\s+degildir|izin\s+yoktur)(?![a-z])\s*$/i;
const V3_MEDIA_NEGATION_CLOAK_PATTERN =
  /(?<![a-z])(?:ama|ancak|fakat|denir|denil[a-z]*|soylense|iddia[a-z]*)(?![a-z])/i;
const V3_SAFE_SELF_VISUAL_CONTEXT_PATTERN =
  /(?:ayna[a-z]*.{0,40}(?:goruntu|yansima)[a-z]*|(?:goruntu|yansima)[a-z]*.{0,40}ayna[a-z]*)/i;
const V3_EXPLICIT_NO_CHILD_MEDIA_PATTERN =
  /(?<![a-z])(?:cocuk[a-z]*|ogrenci[a-z]*)(?:\s+[a-z]+){0,6}\s+(?:icermez|bulunmaz|gorunmez|yer\s+almaz|kadraja\s+girmez)(?![a-z])/gi;
const V3_ACTIVITY_FORBIDDEN_UNICODE_PATTERN =
  /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Script=Cyrillic}\p{Script=Greek}]/u;
const V3_MEDIA_SHARING_AUDIENCE_PATTERN =
  /(?<![a-z])(?:aile[a-z]*|veli[a-z]*|ebeveyn[a-z]*|ev[a-z]*|okul\s+pano[a-z]*|sinif\s+pano[a-z]*|kamusal|kamuya|sosyal\s+medya|internet[a-z]*|web\s+site[a-z]*|portal[a-z]*|whatsapp|instagram|facebook|tiktok|youtube|drive|bulut[a-z]*|e-?posta|mesajlasma\s+uygulama[a-z]*|mesaj\s+grup[a-z]*|sinif\s+disi[a-z]*|ziyaretci[a-z]*)(?![a-z])/i;
const V3_MEDIA_SHARING_CONTENT_PATTERN = new RegExp(
  `(?<![a-z])(?:cocuk\\s+urunu[a-z]*|sinif\\s+izi[a-z]*|ham\\s+gozlem[a-z]*|kanit[a-z]*|kimlikli\\s+aciklama[a-z]*|sergi[a-z]*|album[a-z]*|${V3_MEDIA_ARTIFACT_TERM_SOURCE}|${V3_CHILD_VISUAL_PRODUCT_SOURCE}|${V3_CHILD_RECORDABLE_EXPRESSION_SOURCE})(?![a-z])`,
  "i",
);
const V3_MEDIA_SHARING_ACTION_PATTERN =
  /(?<![a-z])(?:gorur|gorebilir|inceler|inceleyebilir|erisebilir|erisime\s+acilir|paylasilir|paylasilabilir|paylasabilir|paylasim\s+yapilir|paylasim\s+yapilabilir|aktarilir|aktarilabilir|iletilir|iletilebilir|dagitilir|dagitilabilir|gonderilir|gonderilebilir|verilir|verilebilir|teslim\s+alir|teslim\s+alabilir|teslim\s+edilir|teslim\s+edilebilir|gosterilir|gosterilebilir|duzenlenir|duzenlenebilir|hazirlanir|hazirlanabilir|yuklenir|yuklenebilir|indirir|indirebilir|indirilir|indirilebilir|atilir|atilabilir|asilir|asilabilir|basilir|basilabilir|sunulur|sunulabilir|sunabilir|sergilenir|sergilenebilir|yayinlanir|yayinlanabilir|yayimlanir|yayimlanabilir|davet\s+edilir|acilir|kurulur|konulur|konulabilir|yapilir|yapilabilir|olusturulur|olusturulabilir)(?![a-z])/i;
const V3_MEDIA_DISSEMINATION_ACTION_PATTERN =
  /(?<![a-z])(?:paylasilir|paylasilabilir|paylasabilir|paylasim\s+yapilir|paylasim\s+yapilabilir|aktarilir|aktarilabilir|iletilir|iletilebilir|dagitilir|dagitilabilir|gonderilir|gonderilebilir|yuklenir|yuklenebilir|indirir|indirebilir|indirilir|indirilebilir|atilir|atilabilir|basilir|basilabilir|yayinlanir|yayinlanabilir|yayimlanir|yayimlanabilir)(?![a-z])/i;
const V3_ANAPHORIC_RECORDING_PATTERN =
  /(?<![a-z])(?:bunu|onu|bunlari|onlari)(?![a-z]).{0,60}(?:kayda\s+alir|kayda\s+alabilir|kaydedilir|kaydedilebilir|kaydedebilir|kayit\s+altina\s+alinir|kayit\s+altina\s+alinabilir)/i;
const V3_ANAPHORIC_EXTERNAL_SHARING_PATTERN =
  /(?<![a-z])(?:aile[a-z]*|veli[a-z]*|ebeveyn[a-z]*)(?![a-z]).{0,80}(?:(?:bunu|onu|bunlari|onlari).{0,30}(?:gorur|gorebilir|inceler|inceleyebilir|paylasabilir)|(?:gonderilir|gonderilebilir|aktarilir|aktarilabilir|iletilir|iletilebilir|yuklenir|yuklenebilir|paylasilir|paylasilabilir))/i;

function v3MediaPolicyAsciiFold(value: string): string {
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

function assertV3MediaBoundary(value: unknown, label: string): void {
  const leaves: string[] = [];
  const collectTextLeaves = (value: unknown): void => {
    if (typeof value === "string") {
      leaves.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collectTextLeaves);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach(collectTextLeaves);
    }
  };
  collectTextLeaves(value);
  let hasChildContentAcrossTree = false;
  let hasAnaphoricRecordingAcrossTree = false;
  let hasAnaphoricExternalSharingAcrossTree = false;
  for (const leaf of leaves) {
    const normalizedLeaf = v3MediaPolicyAsciiFold(leaf);
    const rawClauses = normalizedLeaf
      .split(/[.;!?:]+/u)
      .map((clause) => clause.trim())
      .filter(Boolean);
    const hasRegulatedMediaReference = (text: string): boolean =>
      V3_MEDIA_ARTIFACT_TERM_PATTERN.test(text) ||
      V3_CHILD_VISUAL_PRODUCT_PATTERN.test(text) ||
      V3_CHILD_RECORDABLE_EXPRESSION_PATTERN.test(text) ||
      V3_CHILD_OR_STUDENT_REFERENCE_PATTERN.test(text) ||
      (V3_MEDIA_SHARING_AUDIENCE_PATTERN.test(text) &&
        V3_MEDIA_SHARING_CONTENT_PATTERN.test(text));
    const isCanonicalMediaProhibition = (text: string): boolean =>
      hasRegulatedMediaReference(text) &&
      V3_MEDIA_NEGATIVE_ACTION_AT_END_PATTERN.test(text) &&
      !V3_MEDIA_NEGATION_CLOAK_PATTERN.test(text) &&
      !V3_MEDIA_RECORDING_ACTION_PATTERN.test(text) &&
      !V3_MEDIA_SHARING_ACTION_PATTERN.test(text);
    const clauses = rawClauses
      .filter((clause, index) => {
        if (!isCanonicalMediaProhibition(clause)) {
          return true;
        }
        const laterText = rawClauses.slice(index + 1).join(". ");
        return (
          V3_MEDIA_RECORDING_ACTION_PATTERN.test(laterText) ||
          V3_MEDIA_SHARING_ACTION_PATTERN.test(laterText)
        );
      })
      .map((clause) => clause.replace(V3_MEDIA_ABSENCE_PATTERN, " ").trim())
      .filter(Boolean);
    const offersMediaCapture = (text: string): boolean => {
      const textWithoutExplicitNoChild = text.replace(
        V3_EXPLICIT_NO_CHILD_MEDIA_PATTERN,
        "",
      );
      const textWithoutSafePhotoContexts =
        textWithoutExplicitNoChild === text &&
        V3_CHILD_OR_FRAME_REFERENCE_PATTERN.test(textWithoutExplicitNoChild)
          ? textWithoutExplicitNoChild
          : textWithoutExplicitNoChild.replace(
              V3_SAFE_NON_CHILD_PHOTO_CONTEXT_PATTERN,
              "",
            );
      return (
        V3_MEDIA_HIGH_RISK_ARTIFACT_TERM_PATTERN.test(
          textWithoutSafePhotoContexts,
        ) ||
        (V3_MEDIA_PHOTO_OR_IMAGE_TERM_PATTERN.test(
          textWithoutSafePhotoContexts,
        ) &&
          V3_MEDIA_RECORDING_ACTION_PATTERN.test(textWithoutExplicitNoChild)) ||
        (V3_MEDIA_PHOTO_OR_IMAGE_TERM_PATTERN.test(
          textWithoutSafePhotoContexts,
        ) &&
          V3_CHILD_OR_FRAME_REFERENCE_PATTERN.test(textWithoutExplicitNoChild) &&
          !V3_SAFE_SELF_VISUAL_CONTEXT_PATTERN.test(textWithoutExplicitNoChild)) ||
        (V3_CHILD_VISUAL_PRODUCT_PATTERN.test(textWithoutExplicitNoChild) &&
          V3_MEDIA_RECORDING_ACTION_PATTERN.test(textWithoutExplicitNoChild)) ||
        (V3_CHILD_RECORDABLE_EXPRESSION_PATTERN.test(textWithoutExplicitNoChild) &&
          V3_MEDIA_RECORDING_ACTION_PATTERN.test(textWithoutExplicitNoChild)) ||
        (V3_CHILD_OR_STUDENT_REFERENCE_PATTERN.test(textWithoutExplicitNoChild) &&
          V3_MEDIA_RECORDING_ACTION_PATTERN.test(textWithoutExplicitNoChild))
      );
    };
    const offersFamilyOrPublicSharing = (text: string): boolean =>
      V3_MEDIA_SHARING_AUDIENCE_PATTERN.test(text) &&
      V3_MEDIA_SHARING_CONTENT_PATTERN.test(text) &&
      V3_MEDIA_SHARING_ACTION_PATTERN.test(text);
    const offersChildContentDissemination = (text: string): boolean =>
      (V3_CHILD_RECORDABLE_EXPRESSION_PATTERN.test(text) ||
        V3_CHILD_VISUAL_PRODUCT_PATTERN.test(text) ||
        V3_MEDIA_HIGH_RISK_ARTIFACT_TERM_PATTERN.test(text)) &&
      V3_MEDIA_DISSEMINATION_ACTION_PATTERN.test(text);
    const crossClauseText = clauses.join(". ");
    const hasCrossClauseCapture =
      clauses.length > 1 &&
      clauses.some(
        (clause) =>
          V3_CHILD_RECORDABLE_EXPRESSION_PATTERN.test(clause) ||
          V3_CHILD_VISUAL_PRODUCT_PATTERN.test(clause),
      ) &&
      clauses.some((clause) => V3_MEDIA_RECORDING_ACTION_PATTERN.test(clause));
    hasChildContentAcrossTree ||=
      V3_CHILD_RECORDABLE_EXPRESSION_PATTERN.test(crossClauseText) ||
      V3_CHILD_VISUAL_PRODUCT_PATTERN.test(crossClauseText) ||
      V3_MEDIA_HIGH_RISK_ARTIFACT_TERM_PATTERN.test(crossClauseText);
    hasAnaphoricRecordingAcrossTree ||=
      V3_ANAPHORIC_RECORDING_PATTERN.test(crossClauseText);
    hasAnaphoricExternalSharingAcrossTree ||=
      V3_ANAPHORIC_EXTERNAL_SHARING_PATTERN.test(crossClauseText);
    if (
      hasCrossClauseCapture ||
      offersFamilyOrPublicSharing(crossClauseText) ||
      offersChildContentDissemination(crossClauseText)
    ) {
      throw new Error(
        `${label} çocuk fotoğrafı/ses kaydı veya aile-kamusal paylaşımı için tipli izin kaydı olmadan medya seçeneği sunamaz.`,
      );
    }
    for (const clause of clauses) {
      if (
        offersMediaCapture(clause) ||
        offersFamilyOrPublicSharing(clause) ||
        offersChildContentDissemination(clause)
      ) {
        throw new Error(
          `${label} çocuk fotoğrafı/ses kaydı veya aile-kamusal paylaşımı için tipli izin kaydı olmadan medya seçeneği sunamaz.`,
        );
      }
    }
  }
  if (
    hasChildContentAcrossTree &&
    (hasAnaphoricRecordingAcrossTree || hasAnaphoricExternalSharingAcrossTree)
  ) {
    throw new Error(
      `${label} çocuk ifadesini başka bir metin alanında tipli izin kaydı olmadan medya seçeneğine dönüştüremez.`,
    );
  }
}

function assertV3ActivityTextTreeSafety(
  value: unknown,
  path: string,
): void {
  if (typeof value === "string") {
    if (V3_ACTIVITY_FORBIDDEN_UNICODE_PATTERN.test(value)) {
      throw new Error(
        `${path} Değerler Pedagojisi Anayasası kırmızı çizgisini ihlal ediyor (forbidden-unicode-format).`,
      );
    }
    const normalized = value.normalize("NFC").toLocaleLowerCase("tr-TR");
    const violation = V3_ACTIVITY_TEXT_HARD_STOPS.find(({ pattern }) =>
      pattern.test(normalized),
    );
    if (violation) {
      throw new Error(
        `${path} Değerler Pedagojisi Anayasası kırmızı çizgisini ihlal ediyor (${violation.id}).`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertV3ActivityTextTreeSafety(item, `${path}[${index}]`),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      assertV3ActivityTextTreeSafety(child, `${path}.${key}`);
    }
  }
}

export function parsePremiumValuesContractSnapshot(
  value: unknown,
): PremiumValuesContractSnapshot {
  const item = record(value, "Premium değer sözleşmesi");
  exactKeys(item, [
    "constitutionId",
    "constitutionVersion",
    "constitutionSchemaVersion",
    "officialActionCatalogId",
    "officialActionCatalogSourceVersion",
    "officialActionCatalogSourceSha256",
    "mappingSchemaVersion",
    "status",
    "requiredHumanReviewRoles",
  ], "Premium değer sözleşmesi");
  const constitution = VALUES_PEDAGOGY_CONSTITUTION;
  const catalog = OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG;
  if (
    item.constitutionId !== constitution.constitutionId ||
    item.constitutionVersion !== constitution.version ||
    item.constitutionSchemaVersion !== constitution.schemaVersion ||
    item.officialActionCatalogId !== catalog.catalogId ||
    item.officialActionCatalogSourceVersion !== catalog.sourceVersion ||
    item.officialActionCatalogSourceSha256 !== catalog.sourceSha256 ||
    item.mappingSchemaVersion !== "1.0.0" ||
    item.status !== "machine_validated_pending_human_review"
  ) {
    throw new Error("Premium değer sözleşmesi kanonik anayasa ve resmî Ek-14 kaynak zinciriyle eşleşmelidir.");
  }
  const expectedRoles = HUMAN_REVIEW_ROLES;
  if (
    !Array.isArray(item.requiredHumanReviewRoles) ||
    item.requiredHumanReviewRoles.length !== expectedRoles.length ||
    item.requiredHumanReviewRoles.some((role, index) => role !== expectedRoles[index])
  ) {
    throw new Error("Premium değer sözleşmesi altı kanonik insan inceleme rolünü aynı sırada taşımalıdır.");
  }
  return Object.freeze({
    constitutionId: constitution.constitutionId,
    constitutionVersion: constitution.version,
    constitutionSchemaVersion: constitution.schemaVersion,
    officialActionCatalogId: catalog.catalogId,
    officialActionCatalogSourceVersion: catalog.sourceVersion,
    officialActionCatalogSourceSha256: catalog.sourceSha256,
    mappingSchemaVersion: "1.0.0",
    status: "machine_validated_pending_human_review",
    requiredHumanReviewRoles: Object.freeze([...expectedRoles]),
  });
}

const PREMIUM_VALUES_CONTENT_SNAPSHOT_KEYS = [
  "id",
  "version",
  "contentReleaseId",
  "manifestDigest",
  "sku",
  "displayName",
  "academicRelease",
  "ageProfile",
  "sourceUrl",
  "sourceCheckedOn",
  "valuesMappingStatus",
  "valuesContract",
] as const;

/**
 * Günlük plan, değer kanıtı ve backup doğrulamasının paylaştığı tek kanonik
 * Eylül 2026 v3 içerik-snapshot codec'i.
 */
export function parsePremiumValuesContentPackSnapshot(
  value: unknown,
  label = "Premium değer içerik snapshot'ı",
): PremiumContentPackSnapshot {
  const item = record(value, label);
  exactKeys(item, PREMIUM_VALUES_CONTENT_SNAPSHOT_KEYS, label);
  const identity = PREMIUM_VALUES_V3_RELEASE_IDENTITY;
  if (
    item.id !== identity.id ||
    item.version !== identity.version ||
    item.contentReleaseId !== identity.contentReleaseId ||
    item.manifestDigest !== identity.manifestDigest ||
    item.sku !== identity.sku ||
    item.displayName !== identity.displayName ||
    item.academicRelease !== identity.academicRelease ||
    item.ageProfile !== identity.ageProfile ||
    item.sourceUrl !== identity.sourceUrl ||
    item.sourceCheckedOn !== identity.sourceCheckedOn ||
    item.valuesMappingStatus !== identity.valuesMappingStatus
  ) {
    throw new Error(
      "Değer kanıtı yalnız kanonik Eylül 2026 premium v3 paket kimliği ve manifestiyle kurulabilir.",
    );
  }
  const valuesContract = parsePremiumValuesContractSnapshot(item.valuesContract);
  return Object.freeze({
    id: identity.id,
    version: identity.version,
    contentReleaseId: identity.contentReleaseId,
    manifestDigest: identity.manifestDigest,
    sku: identity.sku,
    displayName: identity.displayName,
    academicRelease: identity.academicRelease,
    ageProfile: identity.ageProfile,
    sourceUrl: identity.sourceUrl,
    sourceCheckedOn: identity.sourceCheckedOn,
    valuesMappingStatus: identity.valuesMappingStatus,
    valuesContract,
  });
}

function parseActivityEditorialReview(value: unknown): PremiumActivityEditorialReview {
  const item = record(value, "Etkinlik değer editoryal incelemesi");
  exactKeys(item, [
    "status",
    "machineValidatedAtUtc",
    "machineValidatorId",
    "humanReviewRequired",
    "note",
  ], "Etkinlik değer editoryal incelemesi");
  if (
    item.status !== "machine_validated_pending_human_review" ||
    item.machineValidatorId !== "maarifos-values-codec-v1" ||
    item.humanReviewRequired !== true
  ) {
    throw new Error("Etkinlik değer tasarımı makine doğrulamasını ve bekleyen insan incelemesini açıkça bildirmelidir.");
  }
  return Object.freeze({
    status: "machine_validated_pending_human_review",
    machineValidatedAtUtc: utcTimestamp(
      item.machineValidatedAtUtc,
      "Etkinlik değer makine doğrulama zamanı",
    ),
    machineValidatorId: "maarifos-values-codec-v1",
    humanReviewRequired: true,
    note: textValue(item.note, "Etkinlik değer inceleme notu"),
  });
}

export function parsePremiumActivityValueDesignSnapshot(
  value: unknown,
  activityId: string,
): PremiumActivityValueDesign {
  const item = record(value, "Etkinlik değer tasarımı");
  exactKeys(
    item,
    ["id", "version", "mapping", "culturalContexts", "editorialReview"],
    "Etkinlik değer tasarımı",
  );
  if (item.id !== `${activityId}:values:v1` || item.version !== "1.0.0") {
    throw new Error("Etkinlik değer tasarımı kimliği ve sürümü kaynak etkinliğe değişmez biçimde bağlanmalıdır.");
  }
  const mapping = parseActivityValueMapping(item.mapping);
  if (
    !mapping.officialActionSnapshots.some(
      (snapshot) => snapshot.valueCode === mapping.primaryValueCode,
    )
  ) {
    throw new Error("Etkinlik değer tasarımı ana değer için doğrulanmış bir resmî Ek-14 eylemi taşımalıdır.");
  }
  const culturalContexts = parseCulturalContexts(
    item.culturalContexts,
    mapping.culturalBridgeIds,
  );
  if (culturalContexts.some((context) => context.provenance.status !== "draft")) {
    throw new Error(
      "İnsan uzman incelemesi bekleyen V3 kültürel köprüleri doğrulanmış gibi işaretlenemez; kaynak durumu draft olmalıdır.",
    );
  }
  return Object.freeze({
    id: item.id,
    version: "1.0.0",
    mapping,
    culturalContexts: Object.freeze(culturalContexts),
    editorialReview: parseActivityEditorialReview(item.editorialReview),
  });
}

function lensId(value: unknown, label: string): PremiumPlanLensId {
  const candidate = textValue(value, label);
  if (!(PREMIUM_PLAN_LENS_IDS as readonly string[]).includes(candidate)) {
    throw new Error(`${label} tanımlı bir pedagojik lens değil.`);
  }
  return candidate as PremiumPlanLensId;
}

function parseLens(value: unknown): PremiumPlanLens {
  const item = record(value, "Pedagojik lens");
  exactKeys(item, ["id", "displayName", "shortDescription", "evidenceGrade", "inspiration"], "Pedagojik lens");
  const evidenceGrade = textValue(item.evidenceGrade, "Kanıt düzeyi");
  if (!["A", "A-B", "B", "B-C", "C"].includes(evidenceGrade)) {
    throw new Error("Pedagojik lens kanıt düzeyi geçersiz.");
  }
  return {
    id: lensId(item.id, "Lens kimliği"),
    displayName: textValue(item.displayName, "Lens adı"),
    shortDescription: textValue(item.shortDescription, "Lens açıklaması"),
    evidenceGrade: evidenceGrade as PremiumPlanLens["evidenceGrade"],
    inspiration: textValue(item.inspiration, "Lens esin kaynağı"),
  };
}

function parseWeek(value: unknown): PremiumPlanWeek {
  const item = record(value, "Hafta");
  exactKeys(item, [
    "id", "title", "dateRange", "periodStart", "periodEnd", "purpose", "inquiryQuestion", "activityIds",
    "mainActivityIds", "alternativeActivityId", "observationFocus", "familyParticipation",
  ], "Hafta");
  return {
    id: textValue(item.id, "Hafta kimliği"),
    title: textValue(item.title, "Hafta başlığı"),
    dateRange: textValue(item.dateRange, "Hafta tarihi"),
    periodStart: textValue(item.periodStart, "Hafta başlangıcı"),
    periodEnd: textValue(item.periodEnd, "Hafta bitişi"),
    purpose: textValue(item.purpose, "Hafta amacı"),
    inquiryQuestion: textValue(item.inquiryQuestion, "Hafta araştırma sorusu"),
    activityIds: stringArray(item.activityIds, "Hafta etkinlikleri"),
    mainActivityIds: stringArray(item.mainActivityIds, "Hafta ana etkinlikleri"),
    alternativeActivityId: textValue(item.alternativeActivityId, "Hafta alternatif etkinliği"),
    observationFocus: stringArray(item.observationFocus, "Hafta gözlem odağı"),
    familyParticipation: textValue(item.familyParticipation, "Hafta aile katılımı"),
  };
}

function parseFullDayFlowBlock(value: unknown): PremiumFullDayFlowBlock {
  const item = record(value, "Tam gün akış bloğu");
  exactKeys(item, ["id", "title", "purpose", "flexibilityNote"], "Tam gün akış bloğu");
  return {
    id: textValue(item.id, "Akış bloğu kimliği"),
    title: textValue(item.title, "Akış bloğu başlığı"),
    purpose: textValue(item.purpose, "Akış bloğu amacı"),
    flexibilityNote: textValue(item.flexibilityNote, "Akış esneklik notu"),
  };
}

function parseMonthlyPlan(value: unknown): PremiumMonthlyPlan {
  const item = record(value, "Aylık plan");
  exactKeys(item, [
    "monthKey", "periodStart", "periodEnd", "title", "purpose", "childQuestions",
    "materialSummary", "lowCostMaterialSummary", "routines", "transitions",
    "familyParticipationPrinciple", "teacherReflectionPrompts",
  ], "Aylık plan");
  return {
    monthKey: textValue(item.monthKey, "Aylık plan ay anahtarı"),
    periodStart: textValue(item.periodStart, "Aylık plan başlangıcı"),
    periodEnd: textValue(item.periodEnd, "Aylık plan bitişi"),
    title: textValue(item.title, "Aylık plan başlığı"),
    purpose: textValue(item.purpose, "Aylık plan amacı"),
    childQuestions: stringArray(item.childQuestions, "Çocuk soruları"),
    materialSummary: stringArray(item.materialSummary, "Aylık materyal özeti"),
    lowCostMaterialSummary: stringArray(item.lowCostMaterialSummary, "Düşük maliyetli materyal özeti"),
    routines: stringArray(item.routines, "Aylık rutinler"),
    transitions: stringArray(item.transitions, "Aylık geçişler"),
    familyParticipationPrinciple: textValue(item.familyParticipationPrinciple, "Aile katılımı ilkesi"),
    teacherReflectionPrompts: stringArray(item.teacherReflectionPrompts, "Öğretmen yansıtma soruları"),
  };
}

function parseActivity(
  value: unknown,
  valuesDesignRequired: boolean,
): PremiumActivityTemplate {
  const item = record(value, "Etkinlik");
  exactKeys(item, [
    "id", "weekId", "activityRole", "recommendedCivilDate", "flowSlot", "title",
    "shortDescription", "durationMinutes", "environment",
    "primaryLensId", "supportingLensIds", "curriculumTargetCodes", "materials",
    "lowCostAlternatives", "preparation", "opening", "processSteps", "adultPrompts", "childAgencyPoints",
    "observationPrompts", "evidenceOptions", "familyCommunityConnection", "differentiation",
    "safetyNotes", "indoorEquivalent", "transitionSupport", "reflectionPrompt", "valuesDesign",
  ], "Etkinlik");
  const id = textValue(item.id, "Etkinlik kimliği");
  if (!valuesDesignRequired && "valuesDesign" in item) {
    throw new Error("Legacy premium paketler geriye dönük değer eşlemesi taşıyamaz; valuesDesign yalnız v3 içindir.");
  }
  if (valuesDesignRequired && !("valuesDesign" in item)) {
    throw new Error("V3 premium pakette her etkinlik doğrulanmış valuesDesign taşımalıdır.");
  }
  const valuesDesign = valuesDesignRequired
    ? parsePremiumActivityValueDesignSnapshot(item.valuesDesign, id)
    : null;
  const durationMinutes = item.durationMinutes;
  if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 120) {
    throw new Error("Etkinlik süresi 10–120 dakika arasında tam sayı olmalıdır.");
  }
  const environment = textValue(item.environment, "Etkinlik ortamı");
  if (!["indoor", "outdoor", "both", "community"].includes(environment)) {
    throw new Error("Etkinlik ortamı geçersiz.");
  }
  const activityRole = textValue(item.activityRole, "Etkinlik rolü");
  if (activityRole !== "main" && activityRole !== "alternative") {
    throw new Error("Etkinlik rolü ana veya alternatif olmalıdır.");
  }
  const recommendedCivilDate = textValue(item.recommendedCivilDate, "Önerilen etkinlik tarihi");
  if (!isCivilDate(recommendedCivilDate) || !recommendedCivilDate.startsWith("2026-09-")) {
    throw new Error("Eylül pilot etkinliği geçerli bir 2026-09 sivil tarihi taşımalıdır.");
  }
  const flowSlot = textValue(item.flowSlot, "Günlük akış yeri");
  if (!["learning-centers", "first-main", "outdoor-movement", "second-main", "small-group"].includes(flowSlot)) {
    throw new Error("Etkinliğin günlük akış yeri geçersiz.");
  }
  const supportingLensIds = stringArray(item.supportingLensIds, "Destekleyici lensler").map(
    (candidate) => lensId(candidate, "Destekleyici lens"),
  );
  if (supportingLensIds.length > 2) {
    throw new Error("Bir etkinlikte en fazla iki destekleyici lens olabilir.");
  }
  const parsed: PremiumActivityTemplate = {
    id,
    weekId: textValue(item.weekId, "Etkinlik haftası"),
    activityRole,
    recommendedCivilDate,
    flowSlot: flowSlot as PremiumActivityTemplate["flowSlot"],
    title: textValue(item.title, "Etkinlik başlığı"),
    shortDescription: textValue(item.shortDescription, "Etkinlik açıklaması"),
    durationMinutes,
    environment: environment as PremiumActivityTemplate["environment"],
    primaryLensId: lensId(item.primaryLensId, "Ana lens"),
    supportingLensIds,
    curriculumTargetCodes: stringArray(item.curriculumTargetCodes, "Program hedefleri"),
    materials: stringArray(item.materials, "Malzemeler"),
    lowCostAlternatives: stringArray(item.lowCostAlternatives, "Düşük maliyetli alternatifler"),
    preparation: stringArray(item.preparation, "Hazırlık adımları"),
    opening: textValue(item.opening, "Açılış"),
    processSteps: stringArray(item.processSteps, "Uygulama adımları"),
    adultPrompts: stringArray(item.adultPrompts, "Yetişkin soruları"),
    childAgencyPoints: stringArray(item.childAgencyPoints, "Çocuk katılım noktaları"),
    observationPrompts: stringArray(item.observationPrompts, "Gözlem soruları"),
    evidenceOptions: stringArray(item.evidenceOptions, "Kanıt seçenekleri"),
    familyCommunityConnection: textValue(item.familyCommunityConnection, "Aile ve toplum bağlantısı"),
    differentiation: stringArray(item.differentiation, "Farklılaştırma"),
    safetyNotes: stringArray(item.safetyNotes, "Güvenlik notları"),
    indoorEquivalent: textValue(item.indoorEquivalent, "Kapalı alan eşdeğeri"),
    transitionSupport: textValue(item.transitionSupport, "Geçiş desteği"),
    reflectionPrompt: textValue(item.reflectionPrompt, "Öğretmen yansıtması"),
    valuesDesign,
  };
  if (valuesDesignRequired) {
    assertV3MediaBoundary(parsed, `Etkinlik ${parsed.id}`);
  }
  return parsed;
}

function assertV3ValuesDistribution(
  activities: readonly PremiumActivityTemplate[],
): void {
  const valueDesigns = activities.map((activity) => activity.valuesDesign);
  if (
    valueDesigns.some((design) => design === null) ||
    new Set(valueDesigns.map((design) => design?.id)).size !== activities.length
  ) {
    throw new Error("V3 etkinlik değer tasarımları eksiksiz ve benzersiz kimlikli olmalıdır.");
  }
  const mappings = valueDesigns.map((design) => {
    if (!design) throw new Error("V3 etkinlik değer tasarımı eksik.");
    return design.mapping;
  });
  const primaryValueCodes = mappings.map((mapping) => mapping.primaryValueCode);
  if (!evaluateMonthlyCodeSelectionCoverage(primaryValueCodes).valid) {
    throw new Error("V3 Eylül paketi aylık en az dört benzersiz ana değeri kapsamalıdır.");
  }
  const roofCounts = new Map<string, number>();
  for (const mapping of mappings) {
    roofCounts.set(mapping.roofValueCode, (roofCounts.get(mapping.roofValueCode) ?? 0) + 1);
  }
  if (
    roofCounts.get("D1") !== 4 ||
    roofCounts.get("D14") !== 4 ||
    roofCounts.get("D16") !== 4
  ) {
    throw new Error("V3 Eylül paketi D1, D14 ve D16 çatı değerlerini 4/4/4 dengede taşımalıdır.");
  }
  const valueLedCount = mappings.filter(
    (mapping) => mapping.designDirection === "value_led",
  ).length;
  if (valueLedCount !== 6) {
    throw new Error("V3 Eylül paketi altı değer öncüllü ve altı öğrenme çıktısı öncüllü etkinlik taşımalıdır.");
  }
  const distinctPrimaryCodes = new Set(primaryValueCodes);
  const distinctAllCodes = new Set(
    mappings.flatMap((mapping) => [
      mapping.primaryValueCode,
      ...mapping.supportingValueCodes,
    ]),
  );
  if (distinctPrimaryCodes.size !== 11 || distinctAllCodes.size !== 14) {
    throw new Error("V3 Eylül değer haritası 11 benzersiz ana ve toplam 14 benzersiz değeri korumalıdır.");
  }
}

/**
 * Yapısal ve editoryal codec. Tek başına içerik otantikliği kanıtlamaz.
 * Ağdan/disk önizleme alan üretim kodu exact SHA-256 zincirli
 * `loadPremiumV3PreviewPackFromUrl` sınırını kullanmalıdır.
 */
export function parsePremiumContentPack(value: unknown): PremiumContentPack {
  const item = record(value, "Premium içerik paketi");
  exactKeys(item, [
    "id", "version", "contentReleaseId", "manifestDigest", "sku", "displayName", "program", "ageProfile", "academicRelease",
    "catalogId", "catalogSourceVersion", "sourceUrl", "sourceCheckedOn", "rightsStatus",
    "lenses", "annualMonths", "monthlyPlan", "fullDayFlow", "weeks", "activities", "status", "accessMode", "valuesContract",
  ], "Premium içerik paketi");
  const id = textValue(item.id, "Paket kimliği");
  const version = textValue(item.version, "Paket sürümü");
  const contentReleaseId = textValue(item.contentReleaseId, "İçerik sürüm kimliği");
  const versionMatch = /^(\d+)\.\d+\.\d+$/u.exec(version);
  if (!versionMatch) {
    throw new Error("Premium paket sürümü SemVer biçiminde olmalıdır.");
  }
  const majorVersion = Number(versionMatch[1]);
  const hasValuesContract = "valuesContract" in item;
  if (majorVersion >= 3 && !hasValuesContract) {
    throw new Error("Premium content.v3 ve sonrası kanonik valuesContract taşımak zorundadır.");
  }
  if (majorVersion < 3 && hasValuesContract) {
    throw new Error("Legacy premium paketlere geriye dönük değer sözleşmesi eklenemez.");
  }
  if (majorVersion > 3) {
    throw new Error("Bu codec henüz content.v3 sonrasındaki premium paketleri desteklemiyor.");
  }
  if (
    majorVersion === 3 &&
    (version !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.version ||
      id !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.id ||
      contentReleaseId !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.contentReleaseId ||
      item.manifestDigest !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.manifestDigest ||
      item.sku !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.sku ||
      item.displayName !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.displayName ||
      item.academicRelease !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.academicRelease ||
      item.ageProfile !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.ageProfile ||
      item.sourceUrl !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.sourceUrl ||
      item.sourceCheckedOn !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.sourceCheckedOn)
  ) {
    throw new Error("İlk değer eşlemeli premium paket exact 3.0.0 ve TYMM-6072 Eylül v3 kimlik zincirini taşımalıdır.");
  }
  if (majorVersion === 3) {
    const visiblePedagogicalTrees = [
      "displayName",
      "lenses",
      "annualMonths",
      "monthlyPlan",
      "fullDayFlow",
      "weeks",
      "activities",
    ] as const;
    for (const field of visiblePedagogicalTrees) {
      assertV3ActivityTextTreeSafety(item[field], `PremiumV3.${field}`);
      if (field !== "activities") {
        assertV3MediaBoundary(item[field], `PremiumV3.${field}`);
      }
    }
  }
  const valuesContract = hasValuesContract
    ? parsePremiumValuesContractSnapshot(item.valuesContract)
    : null;
  if (!(PREMIUM_PLAN_SKUS as readonly string[]).includes(String(item.sku))) {
    throw new Error("Premium paket SKU'su desteklenmiyor.");
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(String(item.manifestDigest))) {
    throw new Error("Premium paket manifest özeti SHA-256 biçiminde olmalıdır.");
  }
  if (item.program !== "tymm_2024" || item.ageProfile !== "60-72") {
    throw new Error("Pilot paket TYMM 2024 ve 60–72 ay ile sınırlıdır.");
  }
  if (item.status !== "internal_pilot" || item.accessMode !== "staff-code") {
    throw new Error("Bu sürüm yalnız kapalı STAFF kodu pilotunu kabul eder.");
  }
  if (!Array.isArray(item.lenses) || !Array.isArray(item.weeks) || !Array.isArray(item.activities) || !Array.isArray(item.annualMonths) || !Array.isArray(item.fullDayFlow)) {
    throw new Error("Premium paket plan bölümleri eksik.");
  }
  const lenses = item.lenses.map(parseLens);
  const expectedLensIds = new Set(PREMIUM_PILOT_LENS_IDS);
  const actualLensIds = new Set(lenses.map((lens) => lens.id));
  if (
    lenses.length !== expectedLensIds.size ||
    actualLensIds.size !== expectedLensIds.size ||
    [...expectedLensIds].some((id) => !actualLensIds.has(id))
  ) {
    throw new Error("Pilot paket sabit altı pedagojik lensi taşımalıdır.");
  }
  const weeks = item.weeks.map(parseWeek);
  const activities = item.activities.map((activity) =>
    parseActivity(activity, valuesContract !== null),
  );
  if (weeks.length !== 4 || activities.length !== 12) {
    throw new Error("Eylül referans paketi dört hafta ve on iki etkinlik içermelidir.");
  }
  const monthlyPlan = parseMonthlyPlan(item.monthlyPlan);
  if (monthlyPlan.monthKey !== "2026-09" || monthlyPlan.periodStart !== "2026-09-07" || monthlyPlan.periodEnd !== "2026-09-30") {
    throw new Error("Eylül aylık plan dönemi 7–30 Eylül 2026 olmalıdır.");
  }
  const fullDayFlow = item.fullDayFlow.map(parseFullDayFlowBlock);
  if (fullDayFlow.length !== 10 || new Set(fullDayFlow.map((block) => block.id)).size !== 10) {
    throw new Error("Tam gün akışı on benzersiz blok taşımalıdır.");
  }
  const expectedFlowIds = [
    "arrival-wellbeing",
    "learning-centers",
    "morning-meeting",
    "first-main",
    "nutrition-selfcare",
    "outdoor-movement",
    "second-main",
    "rest-regulation",
    "small-group",
    "reflection-departure",
  ];
  if (fullDayFlow.some((block, index) => block.id !== expectedFlowIds[index])) {
    throw new Error("Tam gün akış blokları kanonik sırada olmalıdır.");
  }
  const activityIds = new Set(activities.map((activity) => activity.id));
  const weekIds = new Set(weeks.map((week) => week.id));
  if (activityIds.size !== activities.length || weekIds.size !== weeks.length) {
    throw new Error("Premium paket kimlikleri benzersiz olmalıdır.");
  }
  for (const activity of activities) {
    if (!weekIds.has(activity.weekId)) throw new Error("Etkinlik bilinmeyen bir haftaya bağlı.");
    if (!actualLensIds.has(activity.primaryLensId) || activity.supportingLensIds.some((id) => !actualLensIds.has(id))) {
      throw new Error("Etkinlik pilot dışı pedagojik lens içeriyor.");
    }
    if (new Set([activity.primaryLensId, ...activity.supportingLensIds]).size !== activity.supportingLensIds.length + 1) {
      throw new Error("Etkinlikte aynı lens birden fazla kullanılamaz.");
    }
  }
  if (valuesContract !== null) {
    assertV3ValuesDistribution(activities);
  }
  for (const week of weeks) {
    if (
      week.activityIds.length !== 3 ||
      new Set(week.activityIds).size !== 3 ||
      week.mainActivityIds.length !== 2 ||
      week.activityIds.some((id) => !activityIds.has(id)) ||
      week.mainActivityIds.some((id) => !activityIds.has(id)) ||
      !activityIds.has(week.alternativeActivityId) ||
      new Set([...week.mainActivityIds, week.alternativeActivityId]).size !== 3 ||
      week.activityIds.some((id) => ![...week.mainActivityIds, week.alternativeActivityId].includes(id))
    ) {
      throw new Error("Hafta etkinlik ilişkisi eksik veya geçersiz.");
    }
    if (
      !isCivilDate(week.periodStart) ||
      !isCivilDate(week.periodEnd) ||
      !week.periodStart.startsWith("2026-09-") ||
      !week.periodEnd.startsWith("2026-09-") ||
      week.periodStart < monthlyPlan.periodStart ||
      week.periodEnd > monthlyPlan.periodEnd ||
      week.periodStart > week.periodEnd
    ) {
      throw new Error("Hafta dönemi geçerli bir Eylül 2026 aralığı olmalıdır.");
    }
    const weekActivities = activities.filter((activity) => activity.weekId === week.id);
    if (
      weekActivities.length !== 3 ||
      weekActivities.filter((activity) => activity.activityRole === "main").length !== 2 ||
      weekActivities.filter((activity) => activity.activityRole === "alternative").length !== 1 ||
      weekActivities.some(
        (activity) =>
          activity.recommendedCivilDate < week.periodStart ||
          activity.recommendedCivilDate > week.periodEnd,
      ) ||
      weekActivities.some((activity) =>
        activity.activityRole === "main"
          ? !week.mainActivityIds.includes(activity.id)
          : activity.id !== week.alternativeActivityId,
      )
    ) {
      throw new Error("Her hafta iki ana ve bir alternatif etkinlik taşımalıdır.");
    }
  }
  const availableMonthStatus: PremiumAnnualMonth["releaseStatus"] =
    valuesContract === null ? "ready" : "internal-review-ready";
  const annualMonths = item.annualMonths.map<PremiumAnnualMonth>((value) => {
    const month = record(value, "Yıllık ay");
    exactKeys(month, ["monthKey", "title", "purpose", "releaseStatus"], "Yıllık ay");
    if (
      month.releaseStatus !== availableMonthStatus &&
      month.releaseStatus !== "planned-release"
    ) {
      throw new Error("Yıllık ay yayın durumu geçersiz.");
    }
    const releaseStatus = month.releaseStatus as PremiumAnnualMonth["releaseStatus"];
    return {
      monthKey: textValue(month.monthKey, "Ay anahtarı"),
      title: textValue(month.title, "Ay başlığı"),
      purpose: textValue(month.purpose, "Ay amacı"),
      releaseStatus,
    };
  });
  const expectedMonthKeys = [
    "2026-09",
    "2026-10",
    "2026-11",
    "2026-12",
    "2027-01",
    "2027-02",
    "2027-03",
    "2027-04",
    "2027-05",
    "2027-06",
  ];
  if (
    annualMonths.length !== expectedMonthKeys.length ||
    annualMonths.some((month, index) => month.monthKey !== expectedMonthKeys[index]) ||
    annualMonths[0]?.releaseStatus !== availableMonthStatus ||
    annualMonths.slice(1).some((month) => month.releaseStatus !== "planned-release")
  ) {
    throw new Error("Yıllık omurga Eylül 2026–Haziran 2027 arasında on ardışık ay taşımalıdır.");
  }
  return {
    id,
    version,
    contentReleaseId,
    manifestDigest: textValue(item.manifestDigest, "Manifest özeti"),
    sku: item.sku as PremiumContentPack["sku"],
    displayName: textValue(item.displayName, "Paket adı"),
    program: "tymm_2024",
    ageProfile: "60-72",
    academicRelease: textValue(item.academicRelease, "Akademik sürüm") as PremiumContentPack["academicRelease"],
    catalogId: textValue(item.catalogId, "Katalog kimliği"),
    catalogSourceVersion: textValue(item.catalogSourceVersion, "Katalog sürümü"),
    sourceUrl: textValue(item.sourceUrl, "Kaynak URL'si"),
    sourceCheckedOn: textValue(item.sourceCheckedOn, "Kaynak kontrol tarihi"),
    rightsStatus: item.rightsStatus === "original-and-source-linked" ? item.rightsStatus : (() => { throw new Error("Paket hak kaydı geçersiz."); })(),
    status: "internal_pilot",
    accessMode: "staff-code",
    valuesMappingStatus: valuesContract === null
      ? "legacy-unmapped"
      : "machine_validated_pending_human_review",
    valuesContract,
    lenses,
    annualMonths,
    monthlyPlan,
    fullDayFlow,
    weeks,
    activities,
  };
}

export function assertPremiumContentPackValuesIntegrity(
  pack: PremiumContentPack,
): void {
  if (pack.valuesMappingStatus === "legacy-unmapped") {
    if (
      pack.valuesContract !== null ||
      pack.activities.some((activity) => activity.valuesDesign !== null)
    ) {
      throw new Error("Legacy premium paket veya etkinlik geriye dönük değer eşlemesi taşıyamaz.");
    }
    return;
  }
  if (
    pack.id !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.id ||
    pack.version !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.version ||
    pack.contentReleaseId !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.contentReleaseId ||
    pack.manifestDigest !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.manifestDigest ||
    pack.sku !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.sku ||
    pack.displayName !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.displayName ||
    pack.academicRelease !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.academicRelease ||
    pack.ageProfile !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.ageProfile ||
    pack.sourceUrl !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.sourceUrl ||
    pack.sourceCheckedOn !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.sourceCheckedOn ||
    pack.valuesMappingStatus !== PREMIUM_VALUES_V3_RELEASE_IDENTITY.valuesMappingStatus ||
    pack.valuesContract === null
  ) {
    throw new Error("V3 premium değer paketi exact kimlik, sürüm, release ve valuesContract zincirini taşımalıdır.");
  }
  parsePremiumValuesContractSnapshot(pack.valuesContract);
  for (const activity of pack.activities) {
    parsePremiumActivityValueDesignSnapshot(activity.valuesDesign, activity.id);
  }
  assertV3ValuesDistribution(pack.activities);
}

type PremiumPreviewFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type CanonicalReleaseValue =
  | boolean
  | null
  | number
  | string
  | CanonicalReleaseValue[]
  | { [key: string]: CanonicalReleaseValue };

export const PREMIUM_V3_PREVIEW_RELEASE_LOCK = Object.freeze({
  contentFileName: "tymm-6072-2026-09-v3.json",
  manifestFileName: "tymm-6072-2026-09-manifest-v3.json",
  predecessorFileName: "tymm-6072-2026-09-v2.json",
  manifestRawSha256:
    PREMIUM_VALUES_V3_RELEASE_IDENTITY.manifestDigest,
  contentRawSha256:
    "sha256:b6e3b00f1bfbdd66c1ea212775f25a362330ee8f366cdd566a09e3535b5cd247",
  contentRawByteLength: 143_990,
  contentPayloadSha256:
    "sha256:3cae6337359334d12ead18dc1956f875af4fc92bb8c6f550b302eafd64dda85f",
  contentPayloadByteLength: 115_671,
  predecessorRawSha256:
    "sha256:f096c3d98990796c11e4b72747458248e2fd7a530dd54102acba9ddea996d8e5",
  constitutionFile:
    "app/src/features/values/values-pedagogy-constitution.v1.json",
  constitutionRawSha256:
    "sha256:726219fca13672d5093bc1d58f8010e410d573dcfd3b163c2bf7daaf997c2643",
  officialActionCatalogFile:
    "app/src/features/values/official-preschool-value-actions.v1.json",
  officialActionCatalogRawSha256:
    "sha256:e748242d3534193907228c8e590d074a45d81d9a6a6adc2e08aba279dc6dac46",
});

const V3_PREVIEW_RELEASE = PREMIUM_V3_PREVIEW_RELEASE_LOCK;

const PREVIEW_FETCH_MAX_BYTES = Object.freeze({
  content: 1_000_000,
  manifest: 64_000,
  predecessor: 1_000_000,
  valuesSource: 1_000_000,
});

function requireExact(
  actual: unknown,
  expected: unknown,
  label: string,
): void {
  if (actual !== expected) {
    throw new Error(`${label} doğrulaması başarısız.`);
  }
}

function canonicalizeReleaseValue(
  value: unknown,
  path = "$",
): CanonicalReleaseValue {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") return value.normalize("NFC");
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${path} sonlu olmayan sayı içeremez.`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      canonicalizeReleaseValue(item, `${path}[${index}]`),
    );
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const normalized: Record<string, CanonicalReleaseValue> = {};
    for (const key of Object.keys(source).sort()) {
      normalized[key] = canonicalizeReleaseValue(source[key], `${path}.${key}`);
    }
    return normalized;
  }
  throw new Error(`${path} kanonik JSON ile temsil edilemiyor.`);
}

async function sha256Prefixed(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<`sha256:${string}`> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Premium önizleme bütünlük denetimi için WebCrypto kullanılamıyor.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `sha256:${hex}`;
}

function parseJsonBytes(bytes: Uint8Array<ArrayBuffer>, label: string): unknown {
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} geçerli UTF-8 değil.`);
  }
  try {
    return JSON.parse(decoded) as unknown;
  } catch {
    throw new Error(`${label} geçerli JSON değil.`);
  }
}

async function fetchPreviewBytes(
  fetcher: PremiumPreviewFetcher,
  url: string,
  label: string,
  maximumBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetcher(url, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${label} alınamadı.`);
  }
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > maximumBytes)
  ) {
    throw new Error(`${label} güvenli boyut sınırını aşıyor.`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes) {
    throw new Error(`${label} boş veya güvenli boyut sınırının dışında.`);
  }
  return bytes;
}

function previewUrlParts(value: string): {
  absolute: boolean;
  url: URL;
} {
  if (typeof value !== "string" || !value.trim() || value.startsWith("//")) {
    throw new Error("Premium önizleme URL'si geçersiz.");
  }
  const absolute = /^[A-Za-z][A-Za-z\d+.-]*:/u.test(value);
  let url: URL;
  try {
    url = new URL(
      value,
      typeof globalThis.location?.href === "string"
        ? globalThis.location.href
        : "https://maarifos-preview.invalid/",
    );
  } catch {
    throw new Error("Premium önizleme URL'si geçersiz.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Premium önizleme URL'si HTTP(S) olmalıdır.");
  }
  return { absolute, url };
}

function renderPreviewUrl(parts: { absolute: boolean; url: URL }): string {
  return parts.absolute
    ? parts.url.toString()
    : `${parts.url.pathname}${parts.url.search}`;
}

type PremiumPreviewReleaseKind = "v2" | "v3";

function previewReleaseKind(previewContentUrl: string): PremiumPreviewReleaseKind {
  const parts = previewUrlParts(previewContentUrl);
  const fileName = parts.url.pathname.slice(parts.url.pathname.lastIndexOf("/") + 1);
  if (fileName === V3_PREVIEW_RELEASE.contentFileName) return "v3";
  if (fileName === V3_PREVIEW_RELEASE.predecessorFileName) return "v2";
  throw new Error("Premium önizleme URL'si kanonik v2 veya v3 dosya adını taşımalıdır.");
}

function siblingPreviewUrl(
  previewContentUrl: string,
  expectedFileName: string,
  siblingFileName: string,
): string {
  const parts = previewUrlParts(previewContentUrl);
  const slashIndex = parts.url.pathname.lastIndexOf("/");
  if (parts.url.pathname.slice(slashIndex + 1) !== expectedFileName) {
    throw new Error("Premium v3 önizleme içerik URL'si kanonik dosya adını taşımıyor.");
  }
  parts.url.pathname = `${parts.url.pathname.slice(0, slashIndex + 1)}${siblingFileName}`;
  parts.url.hash = "";
  return renderPreviewUrl(parts);
}

function appSourcePreviewUrl(
  previewContentUrl: string,
  appRelativeFile: string,
): string {
  if (!appRelativeFile.startsWith("app/")) {
    throw new Error("Premium değer kaynak yolu app köküne bağlı olmalıdır.");
  }
  const parts = previewUrlParts(previewContentUrl);
  parts.url.pathname = `/${appRelativeFile.slice("app/".length)}`;
  parts.url.hash = "";
  return renderPreviewUrl(parts);
}

interface ParsedV3PreviewManifest {
  readonly contentPayloadSha256: string;
  readonly contentPayloadByteLength: number;
  readonly predecessorRawSha256: string;
  readonly constitutionFile: string;
  readonly constitutionRawSha256: string;
  readonly officialActionCatalogFile: string;
  readonly officialActionCatalogRawSha256: string;
}

function parseV3PreviewManifest(value: unknown): ParsedV3PreviewManifest {
  const manifest = record(value, "Premium v3 manifesti");
  exactKeys(manifest, [
    "schemaVersion",
    "manifestId",
    "contentReleaseId",
    "contentFile",
    "digestAlgorithm",
    "digestScope",
    "canonicalization",
    "contentPayloadSha256",
    "contentPayloadByteLength",
    "contentManifestDigestBinding",
    "predecessor",
    "valuesSourceChain",
    "status",
    "requiredHumanReviewRoles",
    "createdAtUtc",
  ], "Premium v3 manifesti");
  requireExact(manifest.schemaVersion, 1, "Manifest şema sürümü");
  requireExact(
    manifest.manifestId,
    "tymm-6072-2026-09-v3-manifest",
    "Manifest kimliği",
  );
  requireExact(
    manifest.contentReleaseId,
    PREMIUM_VALUES_V3_RELEASE_IDENTITY.contentReleaseId,
    "Manifest release kimliği",
  );
  requireExact(manifest.contentFile, "content.v3.json", "Manifest içerik dosyası");
  requireExact(manifest.digestAlgorithm, "sha256", "Manifest özet algoritması");
  requireExact(
    manifest.digestScope,
    "canonical_content_payload_without_manifestDigest",
    "Manifest özet kapsamı",
  );
  requireExact(
    manifest.canonicalization,
    "recursive_key_sort_array_order_preserved_json_stringify_utf8_nfc",
    "Manifest kanonikleştirme sözleşmesi",
  );
  requireExact(
    manifest.contentManifestDigestBinding,
    "content.manifestDigest equals the SHA-256 of this manifest file's raw UTF-8 bytes",
    "Content-manifest bağlama sözleşmesi",
  );
  requireExact(
    manifest.contentPayloadSha256,
    V3_PREVIEW_RELEASE.contentPayloadSha256,
    "Manifest kanonik payload özeti",
  );
  requireExact(
    manifest.contentPayloadByteLength,
    V3_PREVIEW_RELEASE.contentPayloadByteLength,
    "Manifest kanonik payload byte uzunluğu",
  );
  requireExact(
    manifest.status,
    "machine_validated_pending_human_review",
    "Manifest inceleme durumu",
  );
  utcTimestamp(manifest.createdAtUtc, "Manifest oluşturma zamanı");
  const expectedRoles = HUMAN_REVIEW_ROLES;
  if (
    !Array.isArray(manifest.requiredHumanReviewRoles) ||
    manifest.requiredHumanReviewRoles.length !== expectedRoles.length ||
    manifest.requiredHumanReviewRoles.some((role, index) => role !== expectedRoles[index])
  ) {
    throw new Error("Manifest kanonik insan inceleme rollerini taşımıyor.");
  }

  const predecessor = record(manifest.predecessor, "Premium v3 manifest öncülü");
  exactKeys(
    predecessor,
    ["contentFile", "contentReleaseId", "rawFileSha256"],
    "Premium v3 manifest öncülü",
  );
  requireExact(predecessor.contentFile, "content.v2.json", "V2 öncül dosyası");
  requireExact(
    predecessor.contentReleaseId,
    "tymm-6072-2026-09-v2",
    "V2 öncül release kimliği",
  );
  requireExact(
    predecessor.rawFileSha256,
    V3_PREVIEW_RELEASE.predecessorRawSha256,
    "V2 öncül exact byte özeti",
  );

  const sourceChain = record(
    manifest.valuesSourceChain,
    "Premium v3 değer kaynak zinciri",
  );
  exactKeys(
    sourceChain,
    ["constitution", "officialActionCatalog"],
    "Premium v3 değer kaynak zinciri",
  );
  const constitution = record(sourceChain.constitution, "Anayasa kaynak zinciri");
  exactKeys(
    constitution,
    ["file", "constitutionId", "version", "schemaVersion", "rawFileSha256"],
    "Anayasa kaynak zinciri",
  );
  requireExact(
    constitution.file,
    V3_PREVIEW_RELEASE.constitutionFile,
    "Anayasa kaynak dosyası",
  );
  requireExact(
    constitution.constitutionId,
    VALUES_PEDAGOGY_CONSTITUTION.constitutionId,
    "Anayasa kaynak kimliği",
  );
  requireExact(
    constitution.version,
    VALUES_PEDAGOGY_CONSTITUTION.version,
    "Anayasa kaynak sürümü",
  );
  requireExact(
    constitution.schemaVersion,
    VALUES_PEDAGOGY_CONSTITUTION.schemaVersion,
    "Anayasa kaynak şeması",
  );
  requireExact(
    constitution.rawFileSha256,
    V3_PREVIEW_RELEASE.constitutionRawSha256,
    "Anayasa exact raw özeti",
  );

  const catalog = record(
    sourceChain.officialActionCatalog,
    "Resmî Ek-14 kaynak zinciri",
  );
  exactKeys(
    catalog,
    ["file", "catalogId", "sourceVersion", "sourceSha256", "rawFileSha256"],
    "Resmî Ek-14 kaynak zinciri",
  );
  requireExact(
    catalog.file,
    V3_PREVIEW_RELEASE.officialActionCatalogFile,
    "Resmî Ek-14 kaynak dosyası",
  );
  requireExact(
    catalog.catalogId,
    OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.catalogId,
    "Resmî Ek-14 katalog kimliği",
  );
  requireExact(
    catalog.sourceVersion,
    OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.sourceVersion,
    "Resmî Ek-14 kaynak sürümü",
  );
  requireExact(
    catalog.sourceSha256,
    OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.sourceSha256,
    "Resmî Ek-14 belge özeti",
  );
  requireExact(
    catalog.rawFileSha256,
    V3_PREVIEW_RELEASE.officialActionCatalogRawSha256,
    "Resmî Ek-14 exact raw özeti",
  );

  return {
    contentPayloadSha256: String(manifest.contentPayloadSha256),
    contentPayloadByteLength: Number(manifest.contentPayloadByteLength),
    predecessorRawSha256: String(predecessor.rawFileSha256),
    constitutionFile: String(constitution.file),
    constitutionRawSha256: String(constitution.rawFileSha256),
    officialActionCatalogFile: String(catalog.file),
    officialActionCatalogRawSha256: String(catalog.rawFileSha256),
  };
}

export async function loadPremiumPreviewPackFromUrl(
  previewContentUrl: string,
  fetcher: PremiumPreviewFetcher = globalThis.fetch.bind(globalThis),
): Promise<PremiumContentPack> {
  const releaseKind = previewReleaseKind(previewContentUrl);
  const contentBytes = await fetchPreviewBytes(
    fetcher,
    previewContentUrl,
    "Premium önizleme paketi",
    PREVIEW_FETCH_MAX_BYTES.content,
  );
  if (releaseKind === "v2") {
    requireExact(
      await sha256Prefixed(contentBytes),
      V3_PREVIEW_RELEASE.predecessorRawSha256,
      "Premium v2 exact raw byte özeti",
    );
    return parsePremiumContentPack(
      parseJsonBytes(contentBytes, "Premium v2 önizleme paketi"),
    );
  }

  requireExact(
    contentBytes.byteLength,
    V3_PREVIEW_RELEASE.contentRawByteLength,
    "Premium v3 exact raw byte uzunluğu",
  );
  requireExact(
    await sha256Prefixed(contentBytes),
    V3_PREVIEW_RELEASE.contentRawSha256,
    "Premium v3 exact raw content özeti",
  );

  const manifestUrl = siblingPreviewUrl(
    previewContentUrl,
    V3_PREVIEW_RELEASE.contentFileName,
    V3_PREVIEW_RELEASE.manifestFileName,
  );
  const manifestBytes = await fetchPreviewBytes(
    fetcher,
    manifestUrl,
    "Premium v3 manifesti",
    PREVIEW_FETCH_MAX_BYTES.manifest,
  );
  const rawManifestDigest = await sha256Prefixed(manifestBytes);
  requireExact(
    rawManifestDigest,
    V3_PREVIEW_RELEASE.manifestRawSha256,
    "Premium v3 manifest exact raw özeti",
  );
  const manifest = parseV3PreviewManifest(
    parseJsonBytes(manifestBytes, "Premium v3 manifesti"),
  );

  const rawContent = parseJsonBytes(contentBytes, "Premium v3 önizleme paketi");
  const contentRecord = record(rawContent, "Premium v3 içerik payload'ı");
  requireExact(
    contentRecord.manifestDigest,
    rawManifestDigest,
    "Content manifestDigest → raw manifest bağı",
  );

  const payloadWithoutManifestDigest = { ...contentRecord };
  delete payloadWithoutManifestDigest.manifestDigest;
  const canonicalPayloadBytes = new TextEncoder().encode(
    JSON.stringify(canonicalizeReleaseValue(payloadWithoutManifestDigest)),
  );
  requireExact(
    canonicalPayloadBytes.byteLength,
    manifest.contentPayloadByteLength,
    "Kanonik content payload byte uzunluğu",
  );
  requireExact(
    await sha256Prefixed(canonicalPayloadBytes),
    manifest.contentPayloadSha256,
    "Kanonik content payload özeti",
  );

  const predecessorUrl = siblingPreviewUrl(
    previewContentUrl,
    V3_PREVIEW_RELEASE.contentFileName,
    V3_PREVIEW_RELEASE.predecessorFileName,
  );
  const constitutionUrl = appSourcePreviewUrl(
    previewContentUrl,
    manifest.constitutionFile,
  );
  const officialActionCatalogUrl = appSourcePreviewUrl(
    previewContentUrl,
    manifest.officialActionCatalogFile,
  );
  const [predecessorBytes, constitutionBytes, officialActionCatalogBytes] =
    await Promise.all([
      fetchPreviewBytes(
        fetcher,
        predecessorUrl,
        "Premium v2 öncül paketi",
        PREVIEW_FETCH_MAX_BYTES.predecessor,
      ),
      fetchPreviewBytes(
        fetcher,
        constitutionUrl,
        "Değerler Pedagojisi Anayasası kaynağı",
        PREVIEW_FETCH_MAX_BYTES.valuesSource,
      ),
      fetchPreviewBytes(
        fetcher,
        officialActionCatalogUrl,
        "Resmî Ek-14 değer eylemi kaynağı",
        PREVIEW_FETCH_MAX_BYTES.valuesSource,
      ),
    ]);
  requireExact(
    await sha256Prefixed(predecessorBytes),
    manifest.predecessorRawSha256,
    "V2 öncül raw byte özeti",
  );
  requireExact(
    await sha256Prefixed(constitutionBytes),
    manifest.constitutionRawSha256,
    "Anayasa raw kaynak zinciri",
  );
  requireExact(
    await sha256Prefixed(officialActionCatalogBytes),
    manifest.officialActionCatalogRawSha256,
    "Resmî Ek-14 raw kaynak zinciri",
  );

  // V3 serbest metin codec'i bir editoryal savunma katmanıdır; içerik
  // otantiklik sınırı yukarıdaki exact manifest/payload/kaynak SHA-256
  // zinciridir. Semantik parse yalnız bu zincir doğrulandıktan sonra çalışır.
  const pack = parsePremiumContentPack(rawContent);
  requireExact(
    pack.version,
    PREMIUM_VALUES_V3_RELEASE_IDENTITY.version,
    "Premium v3 exact sürümü",
  );
  return pack;
}

export async function loadPremiumV3PreviewPackFromUrl(
  previewContentUrl: string,
  fetcher: PremiumPreviewFetcher = globalThis.fetch.bind(globalThis),
): Promise<PremiumContentPack> {
  if (previewReleaseKind(previewContentUrl) !== "v3") {
    throw new Error("Premium pilot ekranı yalnız kanonik v3 önizleme dosyasını kabul eder.");
  }
  return loadPremiumPreviewPackFromUrl(previewContentUrl, fetcher);
}

export async function loadPremiumPilotPreviewPack(): Promise<PremiumContentPack> {
  if (!import.meta.env.DEV) {
    throw new Error("Geliştirme önizleme paketi üretim sürümünde kullanılamaz.");
  }
  const previewContentUrl = import.meta.env.VITE_PREMIUM_PREVIEW_URL;
  if (!previewContentUrl) {
    throw new Error("Premium geliştirme önizleme kaynağı yapılandırılmadı.");
  }
  return loadPremiumV3PreviewPackFromUrl(previewContentUrl);
}
