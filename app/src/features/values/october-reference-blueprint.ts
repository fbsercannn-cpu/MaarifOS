import rawBlueprint from "../../../../premium-content/releases/tymm-6072/2026-10/reference-blueprint.v1.json" with { type: "json" };

import { canonicalJson } from "../../core/backup/canonical-json.ts";
import type { PremiumPlanLensId } from "../premium-plans/domain.ts";
import { PREMIUM_PILOT_LENS_IDS } from "../premium-plans/lens-catalog.ts";
import {
  OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE,
  assertOfficialPreschoolValueActionSnapshot,
  type OfficialPreschoolValueActionSnapshot,
} from "./official-preschool-value-actions.ts";
import {
  ROOF_VALUE_CODES,
  VALUES_PEDAGOGY_CONSTITUTION,
  valueDefinitionByCode,
  type RoofValueCode,
  type ValueCode,
} from "./values-constitution.ts";

export const OCTOBER_REFERENCE_PRIMARY_VALUE_CODES = Object.freeze([
  "D5",
  "D7",
  "D9",
  "D17",
  "D18",
  "D19",
] as const);

export const OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS = Object.freeze([
  "sukur-kanaat-israf-etmeme",
  "temizlik",
  "vatan-kulturel-miras",
  "yaratilmislara-dogaya-merhamet",
] as const);

export const OCTOBER_REFERENCE_AUTHORED_LENS_IDS = Object.freeze([
  "guided-play",
  "belonging-family-weave",
  "accessible-participation",
  "prepared-environment",
  "emotion-relationship-coregulation",
  "plan-act-reflect",
] as const satisfies readonly PremiumPlanLensId[]);

export const OCTOBER_REFERENCE_RAW_SHA256 =
  "sha256:76bac618f1258cd44dce7c219414354c7b3964c9cb33da67d69a68dff94a6c00" as const;

type OctoberPrimaryValueCode =
  (typeof OCTOBER_REFERENCE_PRIMARY_VALUE_CODES)[number];
type OctoberCulturalCandidateId =
  (typeof OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS)[number];
type OctoberAuthoredLensId =
  (typeof OCTOBER_REFERENCE_AUTHORED_LENS_IDS)[number];
type OctoberDesignDirection = "value_led" | "learning_outcome_led";
type OctoberActivityRole = "main" | "alternative";

export const OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS_BY_ACTIVITY_ID =
  Object.freeze({
    "tymm6072-oct-autumn-traces": Object.freeze([
      "yaratilmislara-dogaya-merhamet",
    ] as const),
    "tymm6072-oct-colour-texture-choices": Object.freeze([] as const),
    "tymm6072-oct-nearby-natural-heritage": Object.freeze([
      "vatan-kulturel-miras",
    ] as const),
    "tymm6072-oct-material-enough": Object.freeze([
      "sukur-kanaat-israf-etmeme",
    ] as const),
    "tymm6072-oct-environment-impact": Object.freeze(["temizlik"] as const),
    "tymm6072-oct-no-harm-choice": Object.freeze([
      "yaratilmislara-dogaya-merhamet",
    ] as const),
    "tymm6072-oct-observe-before-helping": Object.freeze([
      "yaratilmislara-dogaya-merhamet",
    ] as const),
    "tymm6072-oct-clean-environment-plan": Object.freeze(["temizlik"] as const),
    "tymm6072-oct-new-use": Object.freeze([
      "sukur-kanaat-israf-etmeme",
    ] as const),
    "tymm6072-oct-republic-common-good": Object.freeze([
      "vatan-kulturel-miras",
    ] as const),
    "tymm6072-oct-voluntary-common-life": Object.freeze([
      "yaratilmislara-dogaya-merhamet",
    ] as const),
    "tymm6072-oct-common-place-selection": Object.freeze([] as const),
  } as const satisfies Readonly<
    Record<string, readonly OctoberCulturalCandidateId[]>
  >);

export interface OctoberReferenceCulturalCandidate {
  readonly id: OctoberCulturalCandidateId;
  readonly status: "draft";
  readonly checkedAtUtc: null;
  readonly humanReviewRequired: true;
  readonly officialTymmValue: false;
}

export interface OctoberReferenceActivity {
  readonly id: string;
  readonly role: OctoberActivityRole;
  readonly recommendedCivilDate: string;
  readonly title: string;
  readonly designDirection: OctoberDesignDirection;
  readonly primaryValueCode: OctoberPrimaryValueCode;
  readonly roofValueCode: RoofValueCode;
  readonly indicatorCode: string;
  readonly officialActionSnapshot: OfficialPreschoolValueActionSnapshot;
  readonly culturalCandidateIds: readonly OctoberCulturalCandidateId[];
  readonly primaryLensId: OctoberAuthoredLensId;
  readonly supportingLensIds: readonly OctoberAuthoredLensId[];
  readonly natureContinuity: boolean;
  readonly plannedExperience: string;
  readonly childRightsGuardrail: string;
}

export interface OctoberReferenceWeek {
  readonly id: string;
  readonly title: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly inquiryQuestion: string;
  readonly activities: readonly OctoberReferenceActivity[];
}

export interface OctoberNatureBasedContinuity {
  readonly kind: "nature_based_continuity";
  readonly status: "planned";
  readonly weekIds: readonly string[];
  readonly activityIds: readonly string[];
  readonly preparedEnvironmentSupportActivityIds: readonly string[];
  readonly principle: string;
  readonly indoorContinuityPrinciple: string;
  readonly claimMode: "no_program_or_certification_claim";
}

export interface OctoberRepublicContext {
  readonly activityId: string;
  readonly contextMode: "pluralist_child_rights";
  readonly commemorationDate: "2026-10-29";
  readonly calendarClosureClaim: null;
  readonly childRightsSnapshotCodes: readonly ["D1.1.2", "D11.1.2"];
  readonly childRightsSnapshots: readonly OfficialPreschoolValueActionSnapshot[];
  readonly safeguards: readonly ["child_voice", "right_to_decline", "no_othering"];
}

export interface OctoberReferenceBlueprint {
  readonly schemaVersion: 1;
  readonly blueprintId: "tymm-6072-2026-10-reference-v1";
  readonly artifactKind: "planned_reference_blueprint";
  readonly status: "planned_reference_blueprint";
  readonly sku: "TYMM-6072";
  readonly program: "tymm_2024";
  readonly ageProfile: "60-72";
  readonly academicRelease: "2026-2027";
  readonly monthKey: "2026-10";
  readonly title: string;
  readonly purpose: string;
  readonly inquiryQuestion: string;
  readonly schedule: {
    readonly periodStart: "2026-10-01";
    readonly periodEnd: "2026-10-30";
    readonly bridgeDays: readonly ["2026-10-01", "2026-10-02"];
    readonly weekCount: 4;
    readonly activitiesPerWeek: 3;
    readonly mainActivitiesPerWeek: 2;
    readonly alternativeActivitiesPerWeek: 1;
  };
  readonly primaryValuePolicy: {
    readonly codes: readonly OctoberPrimaryValueCode[];
    readonly occurrencesPerCode: 2;
    readonly roofCounts: Readonly<Record<RoofValueCode, 4>>;
    readonly designDirectionCounts: Readonly<Record<OctoberDesignDirection, 6>>;
  };
  readonly authoredLensIds: readonly OctoberAuthoredLensId[];
  readonly culturalCandidates: readonly OctoberReferenceCulturalCandidate[];
  readonly nature_based_continuity: OctoberNatureBasedContinuity;
  readonly republicContext: OctoberRepublicContext;
  readonly reviewBoundary: {
    readonly humanReviewRequired: true;
    readonly humanApproved: false;
    readonly publicationApproved: false;
    readonly manifestAuthorized: false;
    readonly contentV3Authorized: false;
  };
  readonly weeks: readonly OctoberReferenceWeek[];
}

const TOP_LEVEL_KEYS = [
  "schemaVersion",
  "blueprintId",
  "artifactKind",
  "status",
  "sku",
  "program",
  "ageProfile",
  "academicRelease",
  "monthKey",
  "title",
  "purpose",
  "inquiryQuestion",
  "schedule",
  "primaryValuePolicy",
  "authoredLensIds",
  "culturalCandidates",
  "nature_based_continuity",
  "republicContext",
  "reviewBoundary",
  "weeks",
] as const;

const WEEK_KEYS = [
  "id",
  "title",
  "periodStart",
  "periodEnd",
  "inquiryQuestion",
  "activities",
] as const;

const ACTIVITY_KEYS = [
  "id",
  "role",
  "recommendedCivilDate",
  "title",
  "designDirection",
  "primaryValueCode",
  "roofValueCode",
  "indicatorCode",
  "culturalCandidateIds",
  "primaryLensId",
  "supportingLensIds",
  "natureContinuity",
  "plannedExperience",
  "childRightsGuardrail",
] as const;

const EXPECTED_WEEK_PERIODS = Object.freeze([
  ["2026-10-05", "2026-10-09"],
  ["2026-10-12", "2026-10-16"],
  ["2026-10-19", "2026-10-23"],
  ["2026-10-26", "2026-10-30"],
] as const);

const FORBIDDEN_UNICODE_PATTERN =
  /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]/u;
const SPACE_SEPARATOR_PATTERN = /\p{Zs}/u;
const CONFUSABLE_SCRIPT_PATTERN = /[\p{Script=Greek}\p{Script=Cyrillic}]/u;
const MORAL_LABEL_PATTERN =
  /(?:(?:iyi|kötü)\s+(?:bir\s+)?(?:çocuk|öğrenci)(?=\s|[.,;:!?]|$)|(?:çocuk|öğrenci)[^.!?;]{0,40}(?:uslu|saygısız|tembel|günahkâr|ahlaksız|terbiyesiz|yalancı|bencil|sorumsuz|inançsız)(?:dır|dir|dur|dür|tır|tir|tur|tür|\s+olarak\s+(?:etiketlenir|damgalanır|tanımlanır|nitelendirilir))|(?:uslu|saygısız|tembel|günahkâr|ahlaksız|terbiyesiz|yalancı|bencil|sorumsuz|inançsız)\s+olarak\s+(?:etiketlenir|damgalanır|tanımlanır|nitelendirilir))/iu;
const PERMANENT_CHARACTER_JUDGMENT_PATTERN =
  /(?:(?:çocuğun|öğrencinin)\s+)?(?:ahlak(?:ı)?|karakter(?:i)?|kişilik|kişiliği)\s+(?:doğuştan\s+)?(?:değişmez|kalıcıdır|sabittir)|(?:hep|daima|her zaman|kalıcı olarak)\s+(?:iyi|kötü|uslu|saygısız|tembel|günahkâr|ahlaksız|terbiyesiz|yalancı|bencil|sorumsuz|inançsız)\s+(?:çocuk|öğrenci)|(?:çocuk|öğrenci)\s+(?:hep|daima|her zaman|kalıcı olarak)\s+(?:iyidir|kötüdür|usludur|saygısızdır|tembeldir|günahkârdır|ahlaksızdır|terbiyesizdir|yalancıdır|bencildir|sorumsuzdur|inançsızdır)/iu;
const VALUE_SCORE_PATTERN =
  /(?:(?:adalet|aile bütünlüğü|çalışkanlık|dostluk|duyarlılık|dürüstlük|estetik|mahremiyet|merhamet|mütevazılık|özgürlük|sabır|sağlıklı yaşam|saygı|sevgi|sorumluluk|tasarruf|temizlik|vatanseverlik|yardımseverlik|değer(?:ler)?)(?:sı|si|su|sü)?\s*(?:(?:(?:puan(?:ı|ları)?|skor(?:u|ları)?)[^.!?;]{0,60}|[:=]\s*)\d{1,3}(?:[.,]\d+)?(?:\s*(?:%|\/\s*\d{1,3}))?|\d{1,3}(?:[.,]\d+)?(?:\s*(?:%|\/\s*\d{1,3}))?[^.!?;]{0,60}(?:puanlanır|skorlanır|puan\s+verilir))|(?:çocuğun|öğrencinin)[^.!?;]{0,80}\d{1,3}(?:[.,]\d+)?(?:\s*(?:%|\/\s*\d{1,3}))?[^.!?;]{0,40}(?:puanlanır|skorlanır|puan\s+verilir))/iu;
const VALUE_BADGE_OR_LEVEL_PATTERN =
  /(?:adalet|aile bütünlüğü|çalışkanlık|dostluk|duyarlılık|dürüstlük|estetik|mahremiyet|merhamet|mütevazılık|özgürlük|sabır|sağlıklı yaşam|saygı|sevgi|sorumluluk|tasarruf|temizlik|vatanseverlik|yardımseverlik|değer(?:ler)?)\s+(?:rozet(?:i|ini|leri|lerini)?|madalya(?:sı|sını|ları|larını)?|yıldız(?:ı|ını|ları|larını)?|seviye(?:si|sini|leri|lerini)?|düzey(?:i|ini|leri|lerini)?|kademe(?:si|sini|leri|lerini)?)(?:(?=\s*(?:[.!?;]|$))|[^.!?;]{0,80}(?:\d{1,3}(?:[.,]\d+)?|altın|gümüş|bronz|yüksek|orta|düşük|birinci|ikinci|üçüncü|verilir|takılır|atanır|belirlenir|kazanır|kazanılır|hak edilir|sunulur|hazırlanır|dağıtılır))/iu;
const AFFIRMATIVE_COERCION_OR_ABUSE_PATTERN =
  /(?:zorlan(?:ır|acaktır|acak|malı(?:dır)?|ması\s+(?:gerekir|zorunludur))|zorunda(?:dır|kalır)|mecbur\s+(?:edilir|bırakılır)|dayatılır|cezalandır(?:ılır|ılacaktır|ılacak|ılmalı(?:dır)?)|utandır(?:ılır|ılacaktır|ılacak|ılmalı(?:dır)?)|dışlan(?:ır|acaktır|acak|malı(?:dır)?)|(?:ceza|utandırma|dışlama)\s+(?:alır|verilir|uygulanır|yapılır)|dışarıda\s+bırakılır|(?:gruptan|sınıftan|etkinlikten)\s+çıkarılır|katılım(?:ı)?\s+engellenir|(?:oyun|eğitim|katılım)\s+hakkından\s+mahrum\s+edilir|mahrum\s+edilir)(?=\s|[.,;:!?]|$)/iu;
const SAFE_REPORTED_THREAT_CLAUSE_PATTERN =
  /^Çocuk zorlanır ya da cezalandırılır diye korkutulmaz$/iu;
const SAFE_MORAL_LABEL_PROHIBITION_CLAUSE_PATTERN =
  /^(?:Çocuğa iyi çocuk etiketi verilmez|Çocuk kötü öğrenci olarak damgalanmaz|Çocuğun bencil olarak etiketlenmesi yasaktır)$/iu;
const RELIGIOUS_COERCION_PATTERN =
  /(?:(?:dua|ibadet|namaz|oruç|ayin|inanç|dinî ritüel|dini ritüel)[^.!?;]{0,120}(?:zorunludur|zorundadır|mecburdur|şarttır|zorunlu\s+tutulur|mecbur\s+edilir|ettirilir|benimsetilir|dayatılır|empoze\s+edilir|etmeli(?:dir)?|yapmalı(?:dır)?|etmesi\s+gerekir|yapması\s+gerekir)|(?:zorunlu\s+olarak|mecburen)[^.!?;]{0,120}(?:dua|ibadet|namaz|oruç|ayin|inanç|dinî ritüel|dini ritüel))/iu;
const RELIGIOUS_ACCESS_CONDITION_PATTERN =
  /(?:dua|ibadet|namaz|oruç|ayin|inanç|dinî ritüel|dini ritüel)[^.!?;]{0,100}(?:ettikten|yaptıktan|katıldıktan|sonra|ardından|karşılığında|şartıyla)[^.!?;]{0,100}(?:oyun|etkinlik|eğitim|katılım|hak)[^.!?;]{0,60}(?:katılabilir|erişebilir|kullanabilir|verilir)/iu;
const UNCONDITIONAL_OBEDIENCE_PATTERN =
  /(?:(?:koşulsuz|şartsız|mutlak|sorgusuz(?:ca)?|sorgulamadan|her koşulda|her durumda)\s+itaat(?:i)?(?:\s+[^.!?;]{0,60})?\s+(?:beklenir|istenir|zorunludur|şarttır|gerekir|eder|edilir|etmelidir)|(?:koşulsuz|şartsız|mutlak|sorgusuz(?:ca)?|sorgulamadan|her koşulda|her durumda)\s+itaat(?=\s*(?:[.!?;]|$))|itaat\s+(?:etmesi|göstermesi)\s+(?:gerekir|zorunludur|şarttır))/iu;
const FORBIDDEN_CLAIM_PATTERN =
  /(?:forest[\s-]*school|orman[\s-]+okulu|sertifika(?:lı|sı|syon)?|akredite|akreditasyon|level\s*\d+|resmî\s+(?:program|müfredat)|human[ _-]?approved|insan[^.!?;]{0,60}(?:onaylandı|onaylıdır|onay\s+verdi)|yayıma\s+hazır(?!\s+(?:değildir|olmadığı|sayılmaz))|yayınlanmış\s+içerik|published\s+content|manifest\s+(?:onaylandı|onaylıdır|yetkilidir))/iu;
const REPUBLIC_FORCED_UNIFORM_PARTICIPATION_PATTERN =
  /(?:(?:bütün|tüm)\s+çocuklar|herkes)[^.!?;]{0,80}(?:aynı|tek)\s+(?:söz|cevap|ifade|ses|yol)(?:le|la)?[^.!?;]{0,60}(?:katılır|katılmalıdır|katılacak|katılmak\s+zorundadır)/iu;
const REPUBLIC_SUPERIORITY_OR_OTHERING_PATTERN =
  /(?:(?:bizim\s+)?(?:milletimiz|ulusumuz|halkımız)[^.!?;]{0,80}(?:bütün|tüm|diğer|başka)\s+(?:halk|millet|ulus)(?:lar)?dan[^.!?;]{0,40}(?:üstün(?:dür)?|daha\s+(?:iyi|değerli))|(?:başka|diğer)\s+(?:halklar|milletler|uluslar)[^.!?;]{0,60}(?:değersizdir|aşağıdır|dışlanır))/iu;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} nesne olmalıdır.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  item: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  const missing = keys.filter((key) => !Object.hasOwn(item, key));
  const unexpected = Object.keys(item).filter((key) => !keys.includes(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${label} exact alan sözleşmesini ihlal ediyor; eksik: ${missing.join(", ") || "yok"}, beklenmeyen: ${unexpected.join(", ") || "yok"}.`,
    );
  }
}

function semanticClauses(value: string): string[] {
  return value
    .split(/[.!?;]+/u)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}

function hasUnsafeMoralLabel(value: string): boolean {
  return semanticClauses(value).some(
    (clause) =>
      !SAFE_MORAL_LABEL_PROHIBITION_CLAUSE_PATTERN.test(clause) &&
      MORAL_LABEL_PATTERN.test(clause),
  );
}

function hasUnsafeAffirmativeCoercion(value: string): boolean {
  return semanticClauses(value).some(
    (clause) =>
      !SAFE_REPORTED_THREAT_CLAUSE_PATTERN.test(clause) &&
      AFFIRMATIVE_COERCION_OR_ABUSE_PATTERN.test(clause),
  );
}

function safeText(value: unknown, label: string, maximumLength = 800): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} boş bırakılamaz.`);
  }
  if (value !== value.trim()) {
    throw new Error(`${label} başında veya sonunda boşluk taşıyamaz; parser sessiz trim uygulamaz.`);
  }
  if (value !== value.normalize("NFC")) {
    throw new Error(`${label} exact NFC biçiminde olmalıdır; parser sessiz Unicode normalizasyonu uygulamaz.`);
  }
  if (FORBIDDEN_UNICODE_PATTERN.test(value)) {
    throw new Error(`${label} kontrol, surrogate, default-ignorable veya satır ayırıcı karakter içeremez.`);
  }
  if ([...value].some((character) => character !== " " && SPACE_SEPARATOR_PATTERN.test(character))) {
    throw new Error(`${label} U+0020 dışı Unicode boşluk ayırıcı içeremez.`);
  }
  if (CONFUSABLE_SCRIPT_PATTERN.test(value)) {
    throw new Error(`${label} Greek veya Cyrillic confusable karakter içeremez.`);
  }
  if (value.length > maximumLength) {
    throw new Error(`${label} en fazla ${maximumLength} karakter olabilir.`);
  }
  if (
    hasUnsafeMoralLabel(value) ||
    PERMANENT_CHARACTER_JUDGMENT_PATTERN.test(value)
  ) {
    throw new Error(`${label} çocuk kişiliğini damgalayan veya kalıcı karakter hükmü kuran dil içeremez.`);
  }
  if (VALUE_SCORE_PATTERN.test(value) || VALUE_BADGE_OR_LEVEL_PATTERN.test(value)) {
    throw new Error(`${label} açık değer puanı, rozeti veya seviyesi üretemez.`);
  }
  if (
    hasUnsafeAffirmativeCoercion(value) ||
    RELIGIOUS_COERCION_PATTERN.test(value) ||
    RELIGIOUS_ACCESS_CONDITION_PATTERN.test(value) ||
    UNCONDITIONAL_OBEDIENCE_PATTERN.test(value)
  ) {
    throw new Error(`${label} zorlama, ceza, utandırma, dışlama veya koşulsuz itaat dili içeremez.`);
  }
  if (FORBIDDEN_CLAIM_PATTERN.test(value)) {
    throw new Error(`${label} program, yayın, insan onayı veya sertifika iddiası içeremez.`);
  }
  if (
    REPUBLIC_FORCED_UNIFORM_PARTICIPATION_PATTERN.test(value) ||
    REPUBLIC_SUPERIORITY_OR_OTHERING_PATTERN.test(value)
  ) {
    throw new Error(
      `${label} tek söz veya zorunlu katılım dayatamaz; millî üstünlük ya da ötekileştirme kuramaz.`,
    );
  }
  return value;
}

function identifier(value: unknown, label: string): string {
  const parsed = safeText(value, label, 120);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(parsed)) {
    throw new Error(`${label} yalnız küçük harf, sayı ve tire kullanmalıdır.`);
  }
  return parsed;
}

function civilDate(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new Error(`${label} YYYY-MM-DD biçiminde olmalıdır.`);
  }
  const instant = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(instant.getTime()) || instant.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} geçerli bir sivil tarih olmalıdır.`);
  }
  return value;
}

function exactInteger(
  value: unknown,
  expected: number,
  label: string,
): number {
  if (!Number.isInteger(value) || value !== expected) {
    throw new Error(`${label} tam olarak ${expected} olmalıdır.`);
  }
  return expected;
}

function exactBoolean(
  value: unknown,
  expected: boolean,
  label: string,
): boolean {
  if (value !== expected) {
    throw new Error(`${label} ${String(expected)} olmalıdır.`);
  }
  return expected;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} dizi olmalıdır.`);
  return value.map((entry, index) => safeText(entry, `${label}[${index}]`, 160));
}

function sameOrderedValues(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function materializeVerifiedSnapshot(
  indicatorCode: unknown,
  expectedValueCode: ValueCode | null,
  label: string,
): OfficialPreschoolValueActionSnapshot {
  const code = safeText(indicatorCode, `${label} gösterge kodu`, 40);
  const entry = OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE[code];
  if (!entry) {
    throw new Error(`${label} yalnız verified Ek-14 göstergesi kullanabilir; kaynak anomalisi veya bilinmeyen kod kabul edilmez.`);
  }
  if (expectedValueCode !== null && entry.valueCode !== expectedValueCode) {
    throw new Error(`${label} ana değer kodu göstergeye ait resmî değerle eşleşmelidir.`);
  }
  const snapshot: OfficialPreschoolValueActionSnapshot = {
    valueCode: entry.valueCode,
    actionCode: entry.actionCode,
    actionName: entry.actionName,
    indicatorCode: entry.indicatorCode,
    indicatorText: entry.indicatorText,
    catalogId: entry.catalogId,
    sourceVersion: entry.sourceVersion,
    sourceUrl: entry.sourceUrl,
    sourceSha256: entry.sourceSha256,
    sourcePage: entry.sourcePage,
  };
  assertOfficialPreschoolValueActionSnapshot(snapshot);
  return snapshot;
}

function primaryValueCode(value: unknown, label: string): OctoberPrimaryValueCode {
  if (
    typeof value !== "string" ||
    !(OCTOBER_REFERENCE_PRIMARY_VALUE_CODES as readonly string[]).includes(value)
  ) {
    throw new Error(`${label} yalnız Ekim'in D5, D7, D9, D17, D18 veya D19 ana değerlerinden biri olabilir.`);
  }
  return value as OctoberPrimaryValueCode;
}

function roofValueCode(value: unknown, label: string): RoofValueCode {
  if (
    typeof value !== "string" ||
    !(ROOF_VALUE_CODES as readonly string[]).includes(value)
  ) {
    throw new Error(`${label} D1, D14 veya D16 olmalıdır.`);
  }
  return value as RoofValueCode;
}

function authoredLensId(value: unknown, label: string): OctoberAuthoredLensId {
  if (
    typeof value !== "string" ||
    !(OCTOBER_REFERENCE_AUTHORED_LENS_IDS as readonly string[]).includes(value)
  ) {
    throw new Error(`${label} yalnız kanonik altı authored pilot lensinden biri olabilir.`);
  }
  return value as OctoberAuthoredLensId;
}

function culturalCandidateId(
  value: unknown,
  label: string,
): OctoberCulturalCandidateId {
  if (
    typeof value !== "string" ||
    !(OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS as readonly string[]).includes(value)
  ) {
    throw new Error(`${label} yalnız kanonik Ekim kültürel adaylarından biri olabilir.`);
  }
  return value as OctoberCulturalCandidateId;
}

function parseCulturalCandidate(
  value: unknown,
  index: number,
): OctoberReferenceCulturalCandidate {
  const label = `Kültürel aday[${index}]`;
  const item = record(value, label);
  exactKeys(
    item,
    ["id", "status", "checkedAtUtc", "humanReviewRequired", "officialTymmValue"],
    label,
  );
  const id = culturalCandidateId(item.id, `${label} kimliği`);
  if (
    item.status !== "draft" ||
    item.checkedAtUtc !== null ||
    item.humanReviewRequired !== true ||
    item.officialTymmValue !== false
  ) {
    throw new Error(
      `${label} yalnız draft, doğrulanmamış, insan incelemesi zorunlu ve resmî TYMM değeri olmayan statüde kalmalıdır.`,
    );
  }
  const canonical = VALUES_PEDAGOGY_CONSTITUTION.culturalBridges.find(
    (candidate) => candidate.id === id,
  );
  if (!canonical || canonical.officialTymmValue !== false) {
    throw new Error(`${label} Değerler Pedagojisi Anayasası'ndaki resmî olmayan köprüye bağlanmalıdır.`);
  }
  return {
    id,
    status: "draft",
    checkedAtUtc: null,
    humanReviewRequired: true,
    officialTymmValue: false,
  };
}

function parseActivity(
  value: unknown,
  weekId: string,
  periodStart: string,
  periodEnd: string,
  index: number,
): OctoberReferenceActivity {
  const label = `${weekId} etkinlik[${index}]`;
  const item = record(value, label);
  exactKeys(item, ACTIVITY_KEYS, label);
  const id = identifier(item.id, `${label} kimliği`);
  if (item.role !== "main" && item.role !== "alternative") {
    throw new Error(`${label} rolü main veya alternative olmalıdır.`);
  }
  const recommendedCivilDate = civilDate(
    item.recommendedCivilDate,
    `${label} önerilen tarihi`,
  );
  if (recommendedCivilDate < periodStart || recommendedCivilDate > periodEnd) {
    throw new Error(`${label} önerilen tarihi bağlı olduğu hafta içinde olmalıdır.`);
  }
  if (
    item.designDirection !== "value_led" &&
    item.designDirection !== "learning_outcome_led"
  ) {
    throw new Error(`${label} tasarım yönü geçersiz.`);
  }
  const primary = primaryValueCode(item.primaryValueCode, `${label} ana değeri`);
  const roof = roofValueCode(item.roofValueCode, `${label} çatı değeri`);
  const definition = valueDefinitionByCode(primary);
  if (!definition || !definition.roofLinks.includes(roof)) {
    throw new Error(`${label} çatı değeri ana değerin anayasal roofLinks bağlantısında yer almalıdır.`);
  }
  const officialActionSnapshot = materializeVerifiedSnapshot(
    item.indicatorCode,
    primary,
    label,
  );
  if (!Array.isArray(item.culturalCandidateIds)) {
    throw new Error(`${label} kültürel adayları dizi olmalıdır.`);
  }
  const culturalCandidateIds = item.culturalCandidateIds.map((candidate, candidateIndex) =>
    culturalCandidateId(candidate, `${label} kültürel aday[${candidateIndex}]`)
  );
  if (
    culturalCandidateIds.length > 2 ||
    new Set(culturalCandidateIds).size !== culturalCandidateIds.length
  ) {
    throw new Error(`${label} en fazla iki benzersiz kültürel aday taşıyabilir.`);
  }
  for (const bridgeId of culturalCandidateIds) {
    const bridge = VALUES_PEDAGOGY_CONSTITUTION.culturalBridges.find(
      (candidate) => candidate.id === bridgeId,
    );
    if (
      !bridge ||
      (!bridge.valueCodes.includes(primary) && !bridge.valueCodes.includes(roof))
    ) {
      throw new Error(`${label} kültürel adayı ana veya çatı değerle anayasal bağ kurmalıdır.`);
    }
  }
  const primaryLensId = authoredLensId(item.primaryLensId, `${label} ana lensi`);
  if (!Array.isArray(item.supportingLensIds)) {
    throw new Error(`${label} destekleyici lensleri dizi olmalıdır.`);
  }
  const supportingLensIds = item.supportingLensIds.map((candidate, lensIndex) =>
    authoredLensId(candidate, `${label} destekleyici lens[${lensIndex}]`)
  );
  if (
    supportingLensIds.length > 2 ||
    new Set([primaryLensId, ...supportingLensIds]).size !==
      supportingLensIds.length + 1
  ) {
    throw new Error(`${label} bir ana ve en fazla iki benzersiz destekleyici lens taşımalıdır.`);
  }
  if (typeof item.natureContinuity !== "boolean") {
    throw new Error(`${label} doğa sürekliliği boolean olmalıdır.`);
  }
  return {
    id,
    role: item.role,
    recommendedCivilDate,
    title: safeText(item.title, `${label} başlığı`),
    designDirection: item.designDirection,
    primaryValueCode: primary,
    roofValueCode: roof,
    indicatorCode: officialActionSnapshot.indicatorCode,
    officialActionSnapshot,
    culturalCandidateIds,
    primaryLensId,
    supportingLensIds,
    natureContinuity: item.natureContinuity,
    plannedExperience: safeText(item.plannedExperience, `${label} planlı yaşantısı`),
    childRightsGuardrail: safeText(
      item.childRightsGuardrail,
      `${label} çocuk hakkı sınırı`,
    ),
  };
}

function parseWeek(value: unknown, index: number): OctoberReferenceWeek {
  const label = `Ekim hafta[${index}]`;
  const item = record(value, label);
  exactKeys(item, WEEK_KEYS, label);
  const expectedPeriod = EXPECTED_WEEK_PERIODS[index];
  if (!expectedPeriod) throw new Error("Ekim referans paketi tam dört hafta taşımalıdır.");
  const periodStart = civilDate(item.periodStart, `${label} başlangıcı`);
  const periodEnd = civilDate(item.periodEnd, `${label} bitişi`);
  if (periodStart !== expectedPeriod[0] || periodEnd !== expectedPeriod[1]) {
    throw new Error(`${label} kanonik Ekim araştırma aralığıyla eşleşmelidir.`);
  }
  if (!Array.isArray(item.activities) || item.activities.length !== 3) {
    throw new Error(`${label} tam üç etkinlik taşımalıdır.`);
  }
  const id = identifier(item.id, `${label} kimliği`);
  const activities = item.activities.map((activity, activityIndex) =>
    parseActivity(activity, id, periodStart, periodEnd, activityIndex)
  );
  if (
    activities.filter((activity) => activity.role === "main").length !== 2 ||
    activities.filter((activity) => activity.role === "alternative").length !== 1
  ) {
    throw new Error(`${label} iki ana ve bir alternatif etkinlik taşımalıdır.`);
  }
  return {
    id,
    title: safeText(item.title, `${label} başlığı`),
    periodStart,
    periodEnd,
    inquiryQuestion: safeText(item.inquiryQuestion, `${label} araştırma sorusu`),
    activities,
  };
}

function parseSchedule(value: unknown): OctoberReferenceBlueprint["schedule"] {
  const item = record(value, "Ekim zaman sözleşmesi");
  exactKeys(
    item,
    [
      "periodStart",
      "periodEnd",
      "bridgeDays",
      "weekCount",
      "activitiesPerWeek",
      "mainActivitiesPerWeek",
      "alternativeActivitiesPerWeek",
    ],
    "Ekim zaman sözleşmesi",
  );
  const bridgeDays = stringArray(item.bridgeDays, "Ekim köprü günleri");
  if (!sameOrderedValues(bridgeDays, ["2026-10-01", "2026-10-02"])) {
    throw new Error("Ekim köprü günleri 1–2 Ekim 2026 olmalıdır.");
  }
  if (
    civilDate(item.periodStart, "Ekim başlangıcı") !== "2026-10-01" ||
    civilDate(item.periodEnd, "Ekim bitişi") !== "2026-10-30"
  ) {
    throw new Error("Ekim referans dönemi 1–30 Ekim 2026 olmalıdır.");
  }
  return {
    periodStart: "2026-10-01",
    periodEnd: "2026-10-30",
    bridgeDays: ["2026-10-01", "2026-10-02"],
    weekCount: exactInteger(item.weekCount, 4, "Ekim hafta sayısı") as 4,
    activitiesPerWeek: exactInteger(
      item.activitiesPerWeek,
      3,
      "Haftalık etkinlik sayısı",
    ) as 3,
    mainActivitiesPerWeek: exactInteger(
      item.mainActivitiesPerWeek,
      2,
      "Haftalık ana etkinlik sayısı",
    ) as 2,
    alternativeActivitiesPerWeek: exactInteger(
      item.alternativeActivitiesPerWeek,
      1,
      "Haftalık alternatif etkinlik sayısı",
    ) as 1,
  };
}

function parsePrimaryValuePolicy(
  value: unknown,
): OctoberReferenceBlueprint["primaryValuePolicy"] {
  const item = record(value, "Ekim değer dağılımı");
  exactKeys(
    item,
    ["codes", "occurrencesPerCode", "roofCounts", "designDirectionCounts"],
    "Ekim değer dağılımı",
  );
  const codes = stringArray(item.codes, "Ekim ana değer kodları");
  if (!sameOrderedValues(codes, OCTOBER_REFERENCE_PRIMARY_VALUE_CODES)) {
    throw new Error("Ekim ana değer kodları exact D5, D7, D9, D17, D18 ve D19 olmalıdır.");
  }
  const roofCounts = record(item.roofCounts, "Ekim çatı dağılımı");
  exactKeys(roofCounts, ROOF_VALUE_CODES, "Ekim çatı dağılımı");
  const designCounts = record(item.designDirectionCounts, "Ekim tasarım yönü dağılımı");
  exactKeys(
    designCounts,
    ["value_led", "learning_outcome_led"],
    "Ekim tasarım yönü dağılımı",
  );
  return {
    codes: [...OCTOBER_REFERENCE_PRIMARY_VALUE_CODES],
    occurrencesPerCode: exactInteger(
      item.occurrencesPerCode,
      2,
      "Her ana değerin tekrar sayısı",
    ) as 2,
    roofCounts: {
      D1: exactInteger(roofCounts.D1, 4, "D1 çatı sayısı") as 4,
      D14: exactInteger(roofCounts.D14, 4, "D14 çatı sayısı") as 4,
      D16: exactInteger(roofCounts.D16, 4, "D16 çatı sayısı") as 4,
    },
    designDirectionCounts: {
      value_led: exactInteger(
        designCounts.value_led,
        6,
        "value_led etkinlik sayısı",
      ) as 6,
      learning_outcome_led: exactInteger(
        designCounts.learning_outcome_led,
        6,
        "learning_outcome_led etkinlik sayısı",
      ) as 6,
    },
  };
}

function parseAuthoredLensIds(value: unknown): OctoberAuthoredLensId[] {
  const lensIds = stringArray(value, "Ekim authored lens kimlikleri");
  if (
    !sameOrderedValues(lensIds, OCTOBER_REFERENCE_AUTHORED_LENS_IDS) ||
    !sameOrderedValues(lensIds, PREMIUM_PILOT_LENS_IDS)
  ) {
    throw new Error("Ekim yalnız kanonik altı authored pilot lensini exact sırada taşımalıdır.");
  }
  return lensIds.map((lensId, index) =>
    authoredLensId(lensId, `Ekim authored lens[${index}]`)
  );
}

function parseNatureContinuity(
  value: unknown,
): OctoberNatureBasedContinuity {
  const item = record(value, "Ekim doğa sürekliliği overlay'i");
  exactKeys(
    item,
    [
      "kind",
      "status",
      "weekIds",
      "activityIds",
      "preparedEnvironmentSupportActivityIds",
      "principle",
      "indoorContinuityPrinciple",
      "claimMode",
    ],
    "Ekim doğa sürekliliği overlay'i",
  );
  if (
    item.kind !== "nature_based_continuity" ||
    item.status !== "planned" ||
    item.claimMode !== "no_program_or_certification_claim"
  ) {
    throw new Error("Doğa sürekliliği yalnız planlı overlay olabilir; program veya sertifika iddiası kuramaz.");
  }
  const weekIds = stringArray(item.weekIds, "Doğa sürekliliği hafta kimlikleri").map(
    (candidate, index) => identifier(candidate, `Doğa sürekliliği hafta[${index}]`),
  );
  const activityIds = stringArray(
    item.activityIds,
    "Doğa sürekliliği etkinlik kimlikleri",
  ).map((candidate, index) => identifier(candidate, `Doğa sürekliliği etkinlik[${index}]`));
  const preparedEnvironmentSupportActivityIds = stringArray(
    item.preparedEnvironmentSupportActivityIds,
    "Hazırlanmış çevre destek etkinlikleri",
  ).map((candidate, index) => identifier(candidate, `Hazırlanmış çevre destek[${index}]`));
  if (
    new Set(weekIds).size !== weekIds.length ||
    new Set(activityIds).size !== activityIds.length ||
    new Set(preparedEnvironmentSupportActivityIds).size !==
      preparedEnvironmentSupportActivityIds.length
  ) {
    throw new Error("Doğa sürekliliği overlay bağlantıları benzersiz olmalıdır.");
  }
  return {
    kind: "nature_based_continuity",
    status: "planned",
    weekIds,
    activityIds,
    preparedEnvironmentSupportActivityIds,
    principle: safeText(item.principle, "Doğa sürekliliği ilkesi"),
    indoorContinuityPrinciple: safeText(
      item.indoorContinuityPrinciple,
      "Kapalı alan doğa sürekliliği ilkesi",
    ),
    claimMode: "no_program_or_certification_claim",
  };
}

function parseRepublicContext(value: unknown): OctoberRepublicContext {
  const item = record(value, "Ekim Cumhuriyet bağlamı");
  exactKeys(
    item,
    [
      "activityId",
      "contextMode",
      "commemorationDate",
      "calendarClosureClaim",
      "childRightsSnapshotCodes",
      "safeguards",
    ],
    "Ekim Cumhuriyet bağlamı",
  );
  if (
    item.contextMode !== "pluralist_child_rights" ||
    civilDate(item.commemorationDate, "Cumhuriyet anma tarihi") !== "2026-10-29" ||
    item.calendarClosureClaim !== null
  ) {
    throw new Error("Cumhuriyet bağlamı çoğulcu çocuk hakkı kipinde kalmalı ve takvim kapanışı iddiası üretmemelidir.");
  }
  const snapshotCodes = stringArray(
    item.childRightsSnapshotCodes,
    "Cumhuriyet çocuk hakkı snapshot kodları",
  );
  if (!sameOrderedValues(snapshotCodes, ["D1.1.2", "D11.1.2"])) {
    throw new Error("Cumhuriyet bağlamı exact D1.1.2 ve D11.1.2 çocuk hakkı snapshot'larını taşımalıdır.");
  }
  const safeguards = stringArray(item.safeguards, "Cumhuriyet güvenlik sınırları");
  if (!sameOrderedValues(safeguards, ["child_voice", "right_to_decline", "no_othering"])) {
    throw new Error("Cumhuriyet bağlamı çocuk sözü, katılmama hakkı ve ötekileştirmeme sınırlarını exact taşımalıdır.");
  }
  return {
    activityId: identifier(item.activityId, "Cumhuriyet etkinlik kimliği"),
    contextMode: "pluralist_child_rights",
    commemorationDate: "2026-10-29",
    calendarClosureClaim: null,
    childRightsSnapshotCodes: ["D1.1.2", "D11.1.2"],
    childRightsSnapshots: [
      materializeVerifiedSnapshot("D1.1.2", "D1", "Cumhuriyet çocuk hakkı"),
      materializeVerifiedSnapshot("D11.1.2", "D11", "Cumhuriyet çocuk sözü"),
    ],
    safeguards: ["child_voice", "right_to_decline", "no_othering"],
  };
}

function parseReviewBoundary(
  value: unknown,
): OctoberReferenceBlueprint["reviewBoundary"] {
  const item = record(value, "Ekim inceleme sınırı");
  exactKeys(
    item,
    [
      "humanReviewRequired",
      "humanApproved",
      "publicationApproved",
      "manifestAuthorized",
      "contentV3Authorized",
    ],
    "Ekim inceleme sınırı",
  );
  return {
    humanReviewRequired: exactBoolean(
      item.humanReviewRequired,
      true,
      "İnsan incelemesi zorunluluğu",
    ) as true,
    humanApproved: exactBoolean(item.humanApproved, false, "İnsan onayı") as false,
    publicationApproved: exactBoolean(
      item.publicationApproved,
      false,
      "Yayın onayı",
    ) as false,
    manifestAuthorized: exactBoolean(
      item.manifestAuthorized,
      false,
      "Manifest yetkisi",
    ) as false,
    contentV3Authorized: exactBoolean(
      item.contentV3Authorized,
      false,
      "Content v3 yetkisi",
    ) as false,
  };
}

function countBy<T extends string>(values: readonly T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function assertAggregateContracts(
  weeks: readonly OctoberReferenceWeek[],
  nature: OctoberNatureBasedContinuity,
  republic: OctoberRepublicContext,
): void {
  if (weeks.length !== 4) throw new Error("Ekim referans blueprint'i tam dört hafta taşımalıdır.");
  const weekIds = weeks.map((week) => week.id);
  const activities = weeks.flatMap((week) => week.activities);
  const activityIds = activities.map((activity) => activity.id);
  if (
    new Set(weekIds).size !== weekIds.length ||
    new Set(activityIds).size !== activityIds.length
  ) {
    throw new Error("Ekim hafta ve etkinlik kimlikleri benzersiz olmalıdır.");
  }
  if (activities.length !== 12) {
    throw new Error("Ekim referans blueprint'i tam on iki etkinlik taşımalıdır.");
  }
  const culturalGolden =
    OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS_BY_ACTIVITY_ID as Readonly<
      Record<string, readonly string[]>
    >;
  if (
    Object.keys(culturalGolden).length !== activities.length ||
    activityIds.some((activityId) => !Object.hasOwn(culturalGolden, activityId))
  ) {
    throw new Error("Ekim etkinlik kimlikleri kültürel aday golden tablosuyla exact eşleşmelidir.");
  }
  for (const activity of activities) {
    const expectedCulturalCandidateIds = culturalGolden[activity.id];
    if (
      !expectedCulturalCandidateIds ||
      !sameOrderedValues(
        activity.culturalCandidateIds,
        expectedCulturalCandidateIds,
      )
    ) {
      throw new Error(
        `${activity.id} kültürel adayları frozen golden tablodaki exact ordered diziyle eşleşmelidir.`,
      );
    }
  }

  const primaryCounts = countBy(activities.map((activity) => activity.primaryValueCode));
  if (
    OCTOBER_REFERENCE_PRIMARY_VALUE_CODES.some(
      (code) => primaryCounts.get(code) !== 2,
    ) ||
    primaryCounts.size !== OCTOBER_REFERENCE_PRIMARY_VALUE_CODES.length
  ) {
    throw new Error("Ekim exact altı ana değerin her birini tam iki kez taşımalıdır.");
  }
  const roofCounts = countBy(activities.map((activity) => activity.roofValueCode));
  if (
    roofCounts.get("D1") !== 4 ||
    roofCounts.get("D14") !== 4 ||
    roofCounts.get("D16") !== 4 ||
    roofCounts.size !== 3
  ) {
    throw new Error("Ekim D1, D14 ve D16 çatılarını exact 4/4/4 taşımalıdır.");
  }
  const directionCounts = countBy(
    activities.map((activity) => activity.designDirection),
  );
  if (
    directionCounts.get("value_led") !== 6 ||
    directionCounts.get("learning_outcome_led") !== 6 ||
    directionCounts.size !== 2
  ) {
    throw new Error("Ekim exact 6 value_led ve 6 learning_outcome_led etkinlik taşımalıdır.");
  }
  const primaryLensCounts = countBy(
    activities.map((activity) => activity.primaryLensId),
  );
  if (
    OCTOBER_REFERENCE_AUTHORED_LENS_IDS.some(
      (lensId) => primaryLensCounts.get(lensId) !== 2,
    ) ||
    primaryLensCounts.size !== OCTOBER_REFERENCE_AUTHORED_LENS_IDS.length
  ) {
    throw new Error("Ekim kanonik altı authored lensin her birini primaryLensId olarak exact iki kez taşımalıdır.");
  }

  if (!sameOrderedValues(nature.weekIds, weekIds)) {
    throw new Error("Doğa sürekliliği dört Ekim haftasını exact sırada kapsamalıdır.");
  }
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const exactNatureActivityIds = activities
    .filter((activity) => activity.natureContinuity)
    .map((activity) => activity.id);
  if (
    nature.activityIds.length !== exactNatureActivityIds.length ||
    nature.activityIds.some((activityId) => !exactNatureActivityIds.includes(activityId))
  ) {
    throw new Error(
      "Doğa sürekliliği activityIds kümesi natureContinuity=true etkinliklerin exact kümesi olmalıdır; yalnız natureContinuity işaretli mevcut etkinliklere bağlanabilir.",
    );
  }
  for (const week of weeks) {
    if (!week.activities.some((activity) => nature.activityIds.includes(activity.id))) {
      throw new Error("Doğa sürekliliği her haftada en az bir planlı etkinliğe bağlanmalıdır.");
    }
  }
  const exactPreparedEnvironmentActivityIds = activities
    .filter((activity) =>
      [activity.primaryLensId, ...activity.supportingLensIds].includes(
        "prepared-environment",
      )
    )
    .map((activity) => activity.id);
  if (
    nature.preparedEnvironmentSupportActivityIds.length !==
      exactPreparedEnvironmentActivityIds.length ||
    nature.preparedEnvironmentSupportActivityIds.some(
      (activityId) => !exactPreparedEnvironmentActivityIds.includes(activityId),
    )
  ) {
    throw new Error(
      "Hazırlanmış çevre overlay activityIds kümesi prepared-environment primary/support lensi taşıyan etkinliklerin exact kümesi olmalıdır.",
    );
  }

  const republicActivity = activityById.get(republic.activityId);
  if (
    !republicActivity ||
    republicActivity.primaryValueCode !== "D19" ||
    republicActivity.indicatorCode !== "D19.2.1" ||
    !republicActivity.title.toLocaleLowerCase("tr-TR").includes("cumhuriyet")
  ) {
    throw new Error("Cumhuriyet bağlamı D19.2.1 kullanan kanonik D19 etkinliğine bağlanmalıdır.");
  }
  if (
    [
      republicActivity.title,
      republicActivity.plannedExperience,
      republicActivity.childRightsGuardrail,
    ].some(
      (text) =>
        REPUBLIC_FORCED_UNIFORM_PARTICIPATION_PATTERN.test(text) ||
        REPUBLIC_SUPERIORITY_OR_OTHERING_PATTERN.test(text),
    )
  ) {
    throw new Error(
      "Cumhuriyet etkinliği tek söz veya zorunlu katılım dayatamaz; millî üstünlük ya da ötekileştirme kuramaz.",
    );
  }
}

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
    return Object.freeze(value);
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      deepFreeze(item);
    }
    return Object.freeze(value);
  }
  return value;
}

/**
 * Editoryal defense-in-depth ayrıştırıcısıdır. İnsan onayı, yayın yetkisi,
 * manifest kararı veya content.v3 yetkisi sağlamaz; uygulama runtime'ı için
 * authoritative frozen blueprint kapısı değildir.
 */
export function parseOctoberReferenceBlueprintCandidate(
  value: unknown,
): OctoberReferenceBlueprint {
  const item = record(value, "Ekim referans blueprint'i");
  exactKeys(item, TOP_LEVEL_KEYS, "Ekim referans blueprint'i");
  if (
    item.schemaVersion !== 1 ||
    item.blueprintId !== "tymm-6072-2026-10-reference-v1" ||
    item.artifactKind !== "planned_reference_blueprint" ||
    item.status !== "planned_reference_blueprint" ||
    item.sku !== "TYMM-6072" ||
    item.program !== "tymm_2024" ||
    item.ageProfile !== "60-72" ||
    item.academicRelease !== "2026-2027" ||
    item.monthKey !== "2026-10"
  ) {
    throw new Error("Ekim referans blueprint kimliği yalnız planlı TYMM-6072 Ekim 2026 adayını kabul eder.");
  }

  const schedule = parseSchedule(item.schedule);
  const primaryValuePolicy = parsePrimaryValuePolicy(item.primaryValuePolicy);
  const authoredLensIds = parseAuthoredLensIds(item.authoredLensIds);
  if (!Array.isArray(item.culturalCandidates)) {
    throw new Error("Ekim kültürel adayları dizi olmalıdır.");
  }
  const culturalCandidates = item.culturalCandidates.map(parseCulturalCandidate);
  if (
    !sameOrderedValues(
      culturalCandidates.map((candidate) => candidate.id),
      OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS,
    )
  ) {
    throw new Error("Ekim exact dört kültürel adayı kanonik sırada taşımalıdır.");
  }
  const natureBasedContinuity = parseNatureContinuity(item.nature_based_continuity);
  const republicContext = parseRepublicContext(item.republicContext);
  const reviewBoundary = parseReviewBoundary(item.reviewBoundary);
  if (!Array.isArray(item.weeks)) throw new Error("Ekim haftaları dizi olmalıdır.");
  const weeks = item.weeks.map(parseWeek);
  assertAggregateContracts(weeks, natureBasedContinuity, republicContext);

  return deepFreeze({
    schemaVersion: 1,
    blueprintId: "tymm-6072-2026-10-reference-v1",
    artifactKind: "planned_reference_blueprint",
    status: "planned_reference_blueprint",
    sku: "TYMM-6072",
    program: "tymm_2024",
    ageProfile: "60-72",
    academicRelease: "2026-2027",
    monthKey: "2026-10",
    title: safeText(item.title, "Ekim başlığı"),
    purpose: safeText(item.purpose, "Ekim amacı"),
    inquiryQuestion: safeText(item.inquiryQuestion, "Ekim araştırma sorusu"),
    schedule,
    primaryValuePolicy,
    authoredLensIds,
    culturalCandidates,
    nature_based_continuity: natureBasedContinuity,
    republicContext,
    reviewBoundary,
    weeks,
  });
}

const OCTOBER_REFERENCE_GOLDEN_CANONICAL_JSON = canonicalJson(
  deepFreeze(rawBlueprint as unknown),
);

/** Frozen Ekim referansı yalnız private raw importun exact canonical eşini kabul eder. */
export function parseOctoberReferenceBlueprint(
  value: unknown,
): OctoberReferenceBlueprint {
  parseOctoberReferenceBlueprintCandidate(value);
  const candidateCanonicalJson = canonicalJson(value);
  if (candidateCanonicalJson !== OCTOBER_REFERENCE_GOLDEN_CANONICAL_JSON) {
    throw new Error(
      "Ekim authoritative frozen blueprint adayı private raw importun exact canonical JSON eşleniği olmalıdır.",
    );
  }
  return parseOctoberReferenceBlueprintCandidate(
    JSON.parse(candidateCanonicalJson) as unknown,
  );
}

export const OCTOBER_REFERENCE_BLUEPRINT = parseOctoberReferenceBlueprint(
  rawBlueprint as unknown,
);
