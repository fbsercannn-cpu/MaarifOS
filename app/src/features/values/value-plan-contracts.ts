import {
  ROOF_VALUE_CODES,
  VALUE_CODES,
  type RoofValueCode,
  type ValueCode,
} from "./values-constitution.ts";
import {
  assertValueEvidenceSourceObservationPolicy,
  parseActivityValueMapping,
  parseTeacherEvidenceRationale,
  type ActivityValueMapping,
  type TeacherEvidenceRole,
} from "./value-plan-models.ts";

export type ValueIntentStatus = "draft" | "verified";
export type RoofValueCheckStatus = "verified_present" | "reviewed_not_selected";
export type TeacherReflectionScope = "activity" | "week" | "month" | "term";

export interface ValueIntentVerification {
  status: ValueIntentStatus;
  teacherConfirmed: boolean;
  confirmedAtUtc: string | null;
}

/**
 * Plan katmanlarının ortak değer çekirdeği. Somut eylem, yetişkin modeli,
 * çocuk ajansı, gözlem, karşı kanıt ve onarım alanları `mapping` içinde
 * kanonik etkinlik sözleşmesiyle birlikte doğrulanır.
 */
export interface PlanValueIntent {
  id: string;
  version: 1;
  mapping: ActivityValueMapping;
  culturalContexts: readonly CulturalContext[];
  verification: ValueIntentVerification;
}

export type OralLocalSourceRole =
  | "local_culture_bearer"
  | "museum_educator"
  | "craft_practitioner"
  | "religious_culture_specialist"
  | "institutional_archivist"
  | "community_representative";

export interface OralLocalSourceVerification {
  sourceRole: OralLocalSourceRole;
  verifyingInstitution: string;
  verifiedAtUtc: string | null;
}

export type CulturalProvenanceReviewerRole =
  "turkish-islamic-culture-and-theology";

export interface CulturalContextReviewEvidence {
  sourceVersion: string;
  sourceSha256: `sha256:${string}`;
  reviewerRole: CulturalProvenanceReviewerRole;
  reviewerActorId: string;
  reviewDecisionId: string;
  reviewedAtUtc: string;
}

export interface CulturalReviewRegistryRequest {
  culturalBridgeId: string;
  locality: string;
  period: string;
  variant: string;
  adaptationNote: string;
  sourceKind: "https" | "oral_local";
  sourceTitle: string;
  sourceLocator: string;
  checkedAtUtc: string;
  reviewEvidence: CulturalContextReviewEvidence;
}

export interface CulturalReviewRegistryResolution
  extends CulturalReviewRegistryRequest {
  decision: "accepted";
  independentReviewer: true;
}

/**
 * Yetkili inceleme kasasına ait, uygulama sınırında enjekte edilen resolver.
 * Resolver yoksa hiçbir self-declared kültürel kayıt `verified` olamaz.
 */
export type CulturalReviewRegistryResolver = (
  reviewDecisionId: string,
) => CulturalReviewRegistryResolution | null;

export interface CulturalContextProvenance {
  sourceKind: "https" | "oral_local";
  sourceTitle: string;
  sourceUrl: string | null;
  oralLocalSource: OralLocalSourceVerification | null;
  status: "draft" | "verified";
  checkedAtUtc: string | null;
  reviewEvidence?: CulturalContextReviewEvidence;
}

export interface CulturalContext {
  culturalBridgeId: string;
  locality: string;
  period: string;
  variant: string;
  adaptationNote: string;
  provenance: CulturalContextProvenance;
}

export interface RoofValueCheck {
  valueCode: RoofValueCode;
  status: RoofValueCheckStatus;
  rationale: string;
}

export interface VerifiedValueCoverageResult {
  valid: boolean;
  coveredValueCodes: readonly ValueCode[];
  missingValueCodes: readonly ValueCode[];
  ignoredDraftIntentIds: readonly string[];
  minimumRequired: number;
}

export type EvidenceRole = "supports" | "contrasts" | "context_only";

export interface ObservationEvidenceIntent {
  id: string;
  valueIntentId: string;
  observableActionPrompt: string;
  contextAndSupportPrompt: string;
  counterEvidencePrompt: string;
  evidenceRoles: readonly EvidenceRole[];
  childVoiceCapture: "optional";
  teacherConfirmationRequired: true;
  singleEventCharacterInferenceProhibited: true;
}

export interface FamilyCommunityBalance {
  valueIntentIds: readonly string[];
  rationale: string;
  participationOptional: true;
  noResponsePenalty: false;
  lowOrNoCostAlternative: string;
}

export interface NatureStewardshipBalance {
  valueIntentIds: readonly string[];
  rationale: string;
  safetyAndAccessPlan: string;
  indoorAlternative: string;
}

export interface MonthlyCulturalContinuity {
  valueIntentIds: readonly string[];
  rationale: string;
}

export interface VerifiedCulturalContinuityResult {
  valid: boolean;
  valueIntentIds: readonly string[];
  culturalBridgeIds: readonly string[];
  ignoredUnverifiedValueIntentIds: readonly string[];
}

export interface AnnualTermWindow {
  id: string;
  valueIntentIds: readonly string[];
}

export interface AnnualMonthWindow {
  monthKey: string;
  valueIntentIds: readonly string[];
  familyCommunityValueIntentIds: readonly string[];
  natureStewardshipValueIntentIds: readonly string[];
  culturalValueIntentIds: readonly string[];
}

export interface AnnualValuesPlan {
  schemaVersion: 1;
  planType: "annual";
  id: string;
  academicYearId: string;
  programProfileId: string;
  valueIntents: readonly PlanValueIntent[];
  terms: readonly AnnualTermWindow[];
  monthlyWindows: readonly AnnualMonthWindow[];
  roofValueChecks: readonly RoofValueCheck[];
  roofBalanceRationale: string;
  culturalCalendarAnchors: readonly string[];
  familyCommunityPartnershipPrinciples: readonly string[];
  inclusionAndSafeguardReview: string;
  overlays: ValuePlanOverlays;
}

export interface MonthlyValuesPlan {
  schemaVersion: 1;
  planType: "monthly";
  id: string;
  yearPlanId: string;
  monthKey: string;
  programProfileId: string;
  valueIntents: readonly PlanValueIntent[];
  selectedValueCodes: readonly ValueCode[];
  roofValueChecks: readonly RoofValueCheck[];
  familyCommunityBalance: FamilyCommunityBalance;
  natureStewardshipBalance: NatureStewardshipBalance;
  culturalContinuity: MonthlyCulturalContinuity;
  reflectionPrompt: string;
  nextMonthDecisionRule: string;
  overlays: ValuePlanOverlays;
}

export interface CivilDateRange {
  start: string;
  end: string;
}

export interface WeeklyValuesPlan {
  schemaVersion: 1;
  planType: "weekly";
  id: string;
  monthPlanId: string;
  programProfileId: string;
  civilDateRange: CivilDateRange;
  valueIntents: readonly PlanValueIntent[];
  focusValueCodes: readonly ValueCode[];
  roofValueChecks: readonly RoofValueCheck[];
  routineActionOpportunities: readonly string[];
  observationIntents: readonly ObservationEvidenceIntent[];
  repairOrContributionOpportunity: string;
  reflectionPrompt: string;
  nextWeekDecisionRule: string;
  overlays: ValuePlanOverlays;
}

export type DailyValueMomentName =
  | "arrival"
  | "circle"
  | "free_play"
  | "routines"
  | "activities"
  | "outdoor"
  | "closing";

export interface DailyValueMoment {
  moment: DailyValueMomentName;
  valueIntentIds: readonly string[];
}

export interface DailyValuesPlan {
  schemaVersion: 1;
  planType: "daily";
  id: string;
  monthPlanId: string;
  weekPlanId: string | null;
  programProfileId: string;
  civilDate: string;
  valueIntents: readonly PlanValueIntent[];
  valueMoments: readonly DailyValueMoment[];
  roofValueChecks: readonly RoofValueCheck[];
  adultModelCommitment: string;
  childChoicePoints: readonly string[];
  pauseOrDeclinePath: string;
  repairProtocol: string;
  observationIntents: readonly ObservationEvidenceIntent[];
  safetyAndPrivacyChecks: readonly string[];
  familyTransitionNote?: string;
  overlays: ValuePlanOverlays;
}

/**
 * Uygulama servisinin gözlem kimliğinden transaction içinde çözmesi gereken
 * yetkili bağ. Parser gözlemin foreign-key veya dönem aidiyetini tahmin etmez.
 */
export interface TeacherEvaluationEvidenceRegistryResolution {
  observationId: string;
  lifecycle: "live";
  rawTextImmutable: true;
  periodId: string;
  scope: TeacherReflectionScope;
  programProfileId: string;
}

export type TeacherEvaluationEvidenceRegistryResolver = (
  observationId: string,
) => TeacherEvaluationEvidenceRegistryResolution | null;

export interface TeacherValuesEvaluation {
  schemaVersion: 1;
  planType: "teacher_evaluation";
  id: string;
  periodId: string;
  scope: TeacherReflectionScope;
  programProfileId: string;
  valueIntents: readonly PlanValueIntent[];
  roofValueChecks: readonly RoofValueCheck[];
  observationIntents: readonly ObservationEvidenceIntent[];
  evidenceObservationIds: readonly string[];
  strengthAndEffortNoticed: string;
  conditionsThatSupportedParticipation: string;
  barriersAndAdultContribution: string;
  equityAndBiasCheck: string;
  culturalAndConscienceCheck: string;
  counterEvidenceAndUncertainty: string;
  nextOpportunity: string;
  reviewStatus: "draft" | "teacher_approved";
  teacherApproval: boolean;
}

export interface FamilyCommunityValuesPlan {
  schemaVersion: 1;
  planType: "family_community";
  id: string;
  programProfileId: string;
  valueIntents: readonly PlanValueIntent[];
  roofValueChecks: readonly RoofValueCheck[];
  purpose: string;
  invitationText: string;
  participationIsOptional: true;
  noResponseEffect: "none";
  choiceMenu: readonly string[];
  lowOrNoCostAlternative: string;
  homeLanguageAndAccessOptions: readonly string[];
  faithAndCultureSensitivity: string;
  childAndFamilyPrivacy: string;
  feedbackChannel: string;
  schoolContinuation: string;
}

export type ForestSchoolClaimLevel =
  | "nature_based_activity"
  | "nature_based_continuity"
  | "recognised_or_certified_forest_school";

export const FOREST_SCHOOL_ASSOCIATION_GOOD_PRACTICE_URL =
  "https://forestschoolassociation.org/full-principles-and-criteria-for-good-practice/";

export const FOREST_SCHOOL_NATURE_ACTIVITY_BOUNDARY =
  "Bu tekil doğa etkinliği Orman Okulu değildir; tanınma, sertifika veya nitelikli Orman Okulu uygulaması iddiası kurmaz.";

export const FOREST_SCHOOL_NATURE_CONTINUITY_BOUNDARY =
  "Bu doğa sürekliliği Orman Okulu değildir; tanınma veya sertifika iddia etmez ve Orman Okulu uygulaması nitelikli lider gerektirir.";

export const PREPARED_ENVIRONMENT_CERTIFICATION_BOUNDARY =
  "Katman hazırlanmış çevreden öğrenir; Montessori okul veya sertifika iddiası kurmaz.";

export interface ForestSchoolValuesOverlay {
  schemaVersion: 1;
  overlayType: "forest_school";
  id: string;
  claimLevel: ForestSchoolClaimLevel;
  governingStandard: string | null;
  leaderQualificationEvidenceRefs: readonly string[];
  recognitionEvidenceRefs: readonly string[];
  siteId: string;
  civilDateRange: CivilDateRange;
  cadence: string;
  plannedSessionIds: readonly string[];
  valueIntentIds: readonly string[];
  roofValueChecks: readonly RoofValueCheck[];
  seasonalReturnPoints: readonly string[];
  childLedInquiryThreads: readonly string[];
  careAndReciprocityCommitments: readonly string[];
  riskBenefitReviews: readonly string[];
  dynamicRiskProtocol: string;
  accessibilityRoutes: readonly string[];
  weatherAndEmergencyRules: readonly string[];
  leaveNoTraceAndHabitatCare: readonly string[];
  observationReviewReplanningCycle: readonly string[];
  familyCommunityConnection: readonly string[];
  incidentAndNearMissReview: string;
  qualifiedPracticeBoundary: string;
}

export interface PreparedEnvironmentValuesOverlay {
  schemaVersion: 1;
  overlayType: "prepared_environment";
  id: string;
  claimLevel: "montessori_inspired";
  certificationClaimed: false;
  valueIntentIds: readonly string[];
  roofValueChecks: readonly RoofValueCheck[];
  environmentArea: string;
  realLifeWork: string;
  childSizedAccess: string;
  orderAndReturnSequence: string;
  independentChoice: string;
  careOfSelfOthersEnvironment: string;
  repetitionAndSelfCorrection: string;
  adultObservationThreshold: string;
  interventionAndGraceCourtesyNotes: readonly string[];
  inclusionAndAccessRoutes: readonly string[];
  certificationBoundary: string;
}

export interface ValuePlanOverlays {
  forestSchool: ForestSchoolValuesOverlay | null;
  preparedEnvironment: PreparedEnvironmentValuesOverlay | null;
}

const VALUE_CODE_SET = new Set<string>(VALUE_CODES);
const ROOF_VALUE_CODE_SET = new Set<string>(ROOF_VALUE_CODES);
const EVIDENCE_ROLES = Object.freeze(["supports", "contrasts", "context_only"] as const);
const DAILY_MOMENTS = new Set<string>([
  "arrival",
  "circle",
  "free_play",
  "routines",
  "activities",
  "outdoor",
  "closing",
]);
const ORAL_LOCAL_SOURCE_ROLES = new Set<string>([
  "local_culture_bearer",
  "museum_educator",
  "craft_practitioner",
  "religious_culture_specialist",
  "institutional_archivist",
  "community_representative",
]);

const MORAL_OR_PERSONALITY_LABEL_PATTERN =
  /\b(?:iyi çocuk|kötü çocuk|uslu|saygısız|tembel|günahkâr|günahkar|inançsız|bencil|terbiyesiz|yalancı|sorumsuz|değersiz)\b/iu;
const GENERAL_COERCION_PATTERN =
  /\b(?:zorla|zorlanır|zorlanacak|zorlanmalıdır|mecbur edilir|mecbur bırakılır|katılmak zorunda|reddedemez|itiraz edemez|utandırılır|korkutulur|cezalandırılır|kör itaat)\b/iu;
const SENSITIVE_IDENTITY_PATTERN =
  /\b(?:inanç|inançsızlık|ibadet|mezhep|giyim|kıyafet|aile biçimi|aile formu|aile yapısı|ritüel|dua|namaz|oruç|dinî katılım|dini katılım)\b/iu;
const SENSITIVE_SCORING_OR_FORCE_PATTERN =
  /\b(?:puanla|puanlanır|puanlanacak|puanlama yapılır|not verilir|notlandırılır|sıralanır|derecelendirilir|başarısız sayılır|eksik sayılır|olumsuz sayılır|zorunludur|zorunlu tutulur|şarttır|mecbur edilir|zorlanır|zorlanacak)\b/iu;
const NAMED_RELIGIOUS_TEXT_OR_PRACTICE_PATTERN =
  /(?<![\p{L}\p{M}])(?:f[âa]tiha|y[âa]sin|ihl[âa]s|amentü|besmele|tekbir|kelime-i\s+şehadet)(?:[\p{L}\p{M}]*)?(?![\p{L}\p{M}])/iu;

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

function assertTextSafety(value: string, label: string): void {
  if (MORAL_OR_PERSONALITY_LABEL_PATTERN.test(value)) {
    throw new Error(`${label} çocuk veya aileyi ahlaki/kişilik etiketiyle tanımlayamaz.`);
  }
  if (GENERAL_COERCION_PATTERN.test(value)) {
    throw new Error(`${label} korkutma, utandırma, cezalandırma veya zorlama içeremez.`);
  }
  const clauses = value.split(/[.!?;\n]+/u);
  if (
    clauses.some(
      (clause) =>
        SENSITIVE_IDENTITY_PATTERN.test(clause) &&
        SENSITIVE_SCORING_OR_FORCE_PATTERN.test(clause),
    )
  ) {
    throw new Error(
      `${label} inanç, ibadet, mezhep, giyim, aile biçimi veya ritüeli puanlayamaz ya da zorlayamaz.`,
    );
  }
}

function safeText(value: unknown, label: string, maximumLength = 2000): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} boş bırakılamaz.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maximumLength) {
    throw new Error(`${label} en fazla ${maximumLength} karakter olabilir.`);
  }
  assertTextSafety(trimmed, label);
  return trimmed;
}

function identifier(value: unknown, label: string): string {
  const parsed = safeText(value, label, 128);
  if (!/^[\p{L}\p{N}][\p{L}\p{N}._:/-]*$/u.test(parsed)) {
    throw new Error(`${label} boşluk içermeyen güvenli bir kimlik olmalıdır.`);
  }
  return parsed;
}

function safeTextArray(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  unique = true,
): string[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Error(`${label} ${minimum}–${maximum} kayıt içermelidir.`);
  }
  const parsed = value.map((candidate, index) => safeText(candidate, `${label}[${index}]`));
  if (unique && new Set(parsed).size !== parsed.length) {
    throw new Error(`${label} benzersiz kayıtlar içermelidir.`);
  }
  return parsed;
}

function identifierArray(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): string[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Error(`${label} ${minimum}–${maximum} kayıt içermelidir.`);
  }
  const parsed = value.map((candidate, index) => identifier(candidate, `${label}[${index}]`));
  if (new Set(parsed).size !== parsed.length) {
    throw new Error(`${label} benzersiz kimlikler içermelidir.`);
  }
  return parsed;
}

function exactBoolean<const Expected extends boolean>(
  value: unknown,
  expected: Expected,
  label: string,
): Expected {
  if (value !== expected) throw new Error(`${label} ${String(expected)} olmalıdır.`);
  return expected;
}

function exactOne(value: unknown, label: string): 1 {
  if (value !== 1) throw new Error(`${label} 1 olmalıdır.`);
  return 1;
}

function valueCode(value: unknown, label: string): ValueCode {
  if (typeof value !== "string" || !VALUE_CODE_SET.has(value)) {
    throw new Error(`${label} D1–D20 arasında tanımlı bir değer kodu olmalıdır.`);
  }
  return value as ValueCode;
}

function valueCodeArray(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): ValueCode[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Error(`${label} ${minimum}–${maximum} değer kodu içermelidir.`);
  }
  const parsed = value.map((candidate, index) => valueCode(candidate, `${label}[${index}]`));
  if (new Set(parsed).size !== parsed.length) {
    throw new Error(`${label} benzersiz değer kodları içermelidir.`);
  }
  return parsed;
}

function utcTimestampOrNull(value: unknown, label: string): string | null {
  if (value === null) return null;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new Error(`${label} UTC Z son ekli ISO tarih-saat veya null olmalıdır.`);
  }
  return value;
}

function civilDate(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} YYYY-MM-DD biçiminde civil_date olmalıdır.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} geçerli bir civil_date olmalıdır.`);
  }
  return value;
}

function monthKey(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)) {
    throw new Error(`${label} YYYY-MM biçiminde olmalıdır.`);
  }
  return value;
}

function parseCivilDateRange(value: unknown, label: string): CivilDateRange {
  const item = record(value, label);
  exactKeys(item, ["start", "end"], label);
  const start = civilDate(item.start, `${label} başlangıcı`);
  const end = civilDate(item.end, `${label} bitişi`);
  if (start > end) throw new Error(`${label} başlangıcı bitişinden sonra olamaz.`);
  return { start, end };
}

function assertSafeTextTree(value: unknown, label: string): void {
  if (typeof value === "string") {
    assertTextSafety(value, label);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeTextTree(item, `${label}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      assertSafeTextTree(item, `${label}.${key}`),
    );
  }
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => deepFreeze(item))) as unknown as Readonly<T>;
  }
  if (value && typeof value === "object") {
    const clone = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, deepFreeze(item)]),
    );
    return Object.freeze(clone) as Readonly<T>;
  }
  return value;
}

function verifiedIntents(intents: readonly PlanValueIntent[]): readonly PlanValueIntent[] {
  return intents.filter((intent) => intent.verification.status === "verified");
}

function verifiedPrimaryValueCodes(intents: readonly PlanValueIntent[]): ValueCode[] {
  return [
    ...new Set(verifiedIntents(intents).map((intent) => intent.mapping.primaryValueCode)),
  ];
}

function intentMap(intents: readonly PlanValueIntent[]): ReadonlyMap<string, PlanValueIntent> {
  return new Map(intents.map((intent) => [intent.id, intent]));
}

function resolveVerifiedIntentRefs(
  refs: readonly string[],
  intents: readonly PlanValueIntent[],
  label: string,
): PlanValueIntent[] {
  const byId = intentMap(intents);
  return refs.map((ref) => {
    const intent = byId.get(ref);
    if (!intent) throw new Error(`${label} bilinmeyen değer niyetine başvuruyor: ${ref}.`);
    if (intent.verification.status !== "verified") {
      throw new Error(`${label} yalnız öğretmen tarafından doğrulanmış değer niyetlerine başvurabilir.`);
    }
    return intent;
  });
}

function parseCulturalContextProvenance(
  value: unknown,
  label: string,
  subject: Pick<
    CulturalReviewRegistryRequest,
    "culturalBridgeId" | "locality" | "period" | "variant" | "adaptationNote"
  >,
  reviewRegistry?: CulturalReviewRegistryResolver,
): CulturalContextProvenance {
  const item = record(value, label);
  const requiredKeys = [
    "sourceKind",
    "sourceTitle",
    "sourceUrl",
    "oralLocalSource",
    "status",
    "checkedAtUtc",
  ] as const;
  exactKeys(
    item,
    [
      ...requiredKeys,
      "reviewEvidence",
    ],
    label,
    requiredKeys,
  );
  if (item.sourceKind !== "https" && item.sourceKind !== "oral_local") {
    throw new Error(
      `${label} kaynak türü https veya doğrulama iddiası taşımayan oral_local olmalıdır.`,
    );
  }
  if (item.status !== "draft" && item.status !== "verified") {
    throw new Error(`${label} doğrulama durumu draft veya verified olmalıdır.`);
  }
  const checkedAtUtc = utcTimestampOrNull(item.checkedAtUtc, `${label} kontrol zamanı`);
  if (item.status === "verified" && !checkedAtUtc) {
    throw new Error(`${label} doğrulanmış kaynak için UTC kontrol zamanı taşımalıdır.`);
  }
  if (item.status === "draft" && checkedAtUtc !== null) {
    throw new Error(`${label} taslak kaynak kontrol zamanı taşıyamaz.`);
  }

  const sourceTitle = safeText(item.sourceTitle, `${label} kaynak başlığı`, 500);
  let sourceUrl: string | null = null;
  let sourceLocator: string;
  let oralLocalSource: OralLocalSourceVerification | null = null;
  if (item.sourceKind === "https") {
    if (typeof item.sourceUrl !== "string" || !/^https:\/\/[^\s]+$/u.test(item.sourceUrl)) {
      throw new Error(`${label} çevrim içi kaynağı HTTPS URL taşımalıdır.`);
    }
    sourceUrl = item.sourceUrl;
    sourceLocator = sourceUrl;
    if (item.oralLocalSource !== null) {
      throw new Error(`${label} HTTPS kaynakta sözlü yerel kaynak nesnesi null olmalıdır.`);
    }
  } else {
    if (item.sourceUrl !== null) {
      throw new Error(`${label} sözlü yerel kaynakta URL null olmalıdır.`);
    }
    const oral = record(item.oralLocalSource, `${label} sözlü yerel kaynak doğrulaması`);
    exactKeys(
      oral,
      ["sourceRole", "verifyingInstitution", "verifiedAtUtc"],
      `${label} sözlü yerel kaynak doğrulaması`,
    );
    if (typeof oral.sourceRole !== "string" || !ORAL_LOCAL_SOURCE_ROLES.has(oral.sourceRole)) {
      throw new Error(
        `${label} sözlü kaynakta kişi adı değil kanonik rol kimliği kullanılmalıdır.`,
      );
    }
    const verifiedAtUtc = utcTimestampOrNull(
      oral.verifiedAtUtc,
      `${label} sözlü kaynak doğrulama zamanı`,
    );
    if (item.status === "verified" && !verifiedAtUtc) {
      throw new Error(`${label} doğrulanmış sözlü kaynak rol+kurum doğrulama zamanı taşımalıdır.`);
    }
    if (item.status === "draft" && verifiedAtUtc !== null) {
      throw new Error(`${label} taslak sözlü kaynak doğrulama zamanı taşıyamaz.`);
    }
    oralLocalSource = {
      sourceRole: oral.sourceRole as OralLocalSourceRole,
      verifyingInstitution: safeText(
        oral.verifyingInstitution,
        `${label} doğrulayan kurum`,
        500,
      ),
      verifiedAtUtc,
    };
    sourceLocator = `oral_local:${oralLocalSource.sourceRole}:${oralLocalSource.verifyingInstitution}`;
  }

  let reviewEvidence: CulturalContextReviewEvidence | undefined;
  if (item.status === "draft") {
    if (item.reviewEvidence !== undefined && item.reviewEvidence !== null) {
      throw new Error(`${label} taslak kaynak kabul edilmiş uzman inceleme kanıtı taşıyamaz.`);
    }
  } else {
    if (!reviewRegistry) {
      throw new Error(
        `${label} yetkili kültürel inceleme sicili çözümlenmeden doğrulanmış gibi işaretlenemez; kayıt draft kalmalıdır.`,
      );
    }
    const evidence = record(item.reviewEvidence, `${label} uzman inceleme kanıtı`);
    exactKeys(
      evidence,
      [
        "sourceVersion",
        "sourceSha256",
        "reviewerRole",
        "reviewerActorId",
        "reviewDecisionId",
        "reviewedAtUtc",
      ],
      `${label} uzman inceleme kanıtı`,
    );
    const sourceVersion = safeText(
      evidence.sourceVersion,
      `${label} kaynak sürümü`,
      200,
    );
    if (
      typeof evidence.sourceSha256 !== "string" ||
      !/^sha256:[0-9a-f]{64}$/u.test(evidence.sourceSha256)
    ) {
      throw new Error(`${label} verified kaynak exact SHA-256 özeti taşımalıdır.`);
    }
    if (evidence.reviewerRole !== "turkish-islamic-culture-and-theology") {
      throw new Error(
        `${label} kültürel provenance incelemesi kanonik bağımsız uzman rolünü taşımalıdır.`,
      );
    }
    const reviewerActorId = identifier(
      evidence.reviewerActorId,
      `${label} bağımsız inceleyen aktör kimliği`,
    );
    const reviewDecisionId = identifier(
      evidence.reviewDecisionId,
      `${label} inceleme kararı kimliği`,
    );
    const reviewedAtUtc = utcTimestampOrNull(
      evidence.reviewedAtUtc,
      `${label} uzman inceleme zamanı`,
    );
    if (!reviewedAtUtc) {
      throw new Error(`${label} verified kaynak UTC uzman inceleme zamanı taşımalıdır.`);
    }
    reviewEvidence = {
      sourceVersion,
      sourceSha256: evidence.sourceSha256 as `sha256:${string}`,
      reviewerRole: "turkish-islamic-culture-and-theology",
      reviewerActorId,
      reviewDecisionId,
      reviewedAtUtc,
    };
    const request = deepFreeze({
      ...subject,
      sourceKind: item.sourceKind,
      sourceTitle,
      sourceLocator,
      checkedAtUtc,
      reviewEvidence,
    }) as Readonly<CulturalReviewRegistryRequest>;
    let resolved: CulturalReviewRegistryResolution | null;
    try {
      resolved = reviewRegistry(reviewDecisionId);
    } catch {
      throw new Error(
        `${label} yetkili kültürel inceleme sicili güvenli biçimde çözümlenemedi; kayıt draft kalmalıdır.`,
      );
    }
    if (!resolved) {
      throw new Error(
        `${label} inceleme kararı yetkili kültürel inceleme sicilinde bulunamadı; kayıt draft kalmalıdır.`,
      );
    }
    const resolution = record(resolved, `${label} yetkili sicil kararı`);
    exactKeys(
      resolution,
      [
        "culturalBridgeId",
        "locality",
        "period",
        "variant",
        "adaptationNote",
        "sourceKind",
        "sourceTitle",
        "sourceLocator",
        "checkedAtUtc",
        "reviewEvidence",
        "decision",
        "independentReviewer",
      ],
      `${label} yetkili sicil kararı`,
    );
    if (resolution.decision !== "accepted" || resolution.independentReviewer !== true) {
      throw new Error(
        `${label} yalnız yetkili sicilde kabul edilmiş bağımsız uzman kararıyla verified olabilir.`,
      );
    }
    const resolvedEvidence = record(
      resolution.reviewEvidence,
      `${label} yetkili sicil kaynak ve inceleyen kanıtı`,
    );
    exactKeys(
      resolvedEvidence,
      [
        "sourceVersion",
        "sourceSha256",
        "reviewerRole",
        "reviewerActorId",
        "reviewDecisionId",
        "reviewedAtUtc",
      ],
      `${label} yetkili sicil kaynak ve inceleyen kanıtı`,
    );
    const normalizedResolutionRequest = {
      culturalBridgeId: resolution.culturalBridgeId,
      locality: resolution.locality,
      period: resolution.period,
      variant: resolution.variant,
      adaptationNote: resolution.adaptationNote,
      sourceKind: resolution.sourceKind,
      sourceTitle: resolution.sourceTitle,
      sourceLocator: resolution.sourceLocator,
      checkedAtUtc: resolution.checkedAtUtc,
      reviewEvidence: {
        sourceVersion: resolvedEvidence.sourceVersion,
        sourceSha256: resolvedEvidence.sourceSha256,
        reviewerRole: resolvedEvidence.reviewerRole,
        reviewerActorId: resolvedEvidence.reviewerActorId,
        reviewDecisionId: resolvedEvidence.reviewDecisionId,
        reviewedAtUtc: resolvedEvidence.reviewedAtUtc,
      },
    };
    if (JSON.stringify(normalizedResolutionRequest) !== JSON.stringify(request)) {
      throw new Error(
        `${label} self-declared kaynak, bağlam veya inceleyen alanları yetkili sicil kararıyla exact eşleşmiyor; kayıt draft kalmalıdır.`,
      );
    }
  }
  return {
    sourceKind: item.sourceKind,
    sourceTitle,
    sourceUrl,
    oralLocalSource,
    status: item.status,
    checkedAtUtc,
    ...(reviewEvidence ? { reviewEvidence } : {}),
  };
}

export function parseCulturalContexts(
  value: unknown,
  bridgeIds: readonly string[],
  reviewRegistry?: CulturalReviewRegistryResolver,
): CulturalContext[] {
  if (!Array.isArray(value) || value.length !== bridgeIds.length) {
    throw new Error(
      "Her kültürel köprü kaynak, yöre, dönem, varyant ve uyarlama notu taşıyan bir culturalContext gerektirir.",
    );
  }
  const contexts = value.map((candidate, index) => {
    const label = `Kültürel bağlam[${index}]`;
    const item = record(candidate, label);
    exactKeys(
      item,
      ["culturalBridgeId", "locality", "period", "variant", "adaptationNote", "provenance"],
      label,
    );
    const culturalBridgeId = identifier(item.culturalBridgeId, `${label} köprü kimliği`);
    if (!bridgeIds.includes(culturalBridgeId)) {
      throw new Error(`${label} etkinlik eşlemesinde bulunmayan kültürel köprüye başvuruyor.`);
    }
    const locality = safeText(item.locality, `${label} yöresi`, 500);
    const period = safeText(item.period, `${label} dönemi`, 500);
    const variant = safeText(item.variant, `${label} varyantı`, 500);
    const adaptationNote = safeText(
      item.adaptationNote,
      `${label} yaş ve bağlam uyarlaması`,
    );
    return {
      culturalBridgeId,
      locality,
      period,
      variant,
      adaptationNote,
      provenance: parseCulturalContextProvenance(
        item.provenance,
        `${label} kaynak zinciri`,
        { culturalBridgeId, locality, period, variant, adaptationNote },
        reviewRegistry,
      ),
    };
  });
  if (
    new Set(contexts.map((context) => context.culturalBridgeId)).size !== bridgeIds.length ||
    bridgeIds.some((bridgeId) => !contexts.some((context) => context.culturalBridgeId === bridgeId))
  ) {
    throw new Error("Kültürel bağlamlar her kültürel köprüyü tam bir kez kaynaklandırmalıdır.");
  }
  return contexts;
}

export function parsePlanValueIntent(
  value: unknown,
  reviewRegistry?: CulturalReviewRegistryResolver,
): PlanValueIntent {
  const item = record(value, "Değer niyeti");
  exactKeys(
    item,
    ["id", "version", "mapping", "culturalContexts", "verification"],
    "Değer niyeti",
  );
  const mapping = parseActivityValueMapping(item.mapping);
  assertSafeTextTree(mapping, "Değer niyeti eşlemesi");
  if (mapping.childAgencyOptions.length < 2) {
    throw new Error("Değer niyeti en az iki gerçek çocuk ajansı/ifade yolu taşımalıdır.");
  }

  const culturalContexts = parseCulturalContexts(
    item.culturalContexts,
    mapping.culturalBridgeIds,
    reviewRegistry,
  );
  const verificationItem = record(item.verification, "Değer niyeti doğrulaması");
  exactKeys(
    verificationItem,
    ["status", "teacherConfirmed", "confirmedAtUtc"],
    "Değer niyeti doğrulaması",
  );
  if (verificationItem.status !== "draft" && verificationItem.status !== "verified") {
    throw new Error("Değer niyeti durumu draft veya verified olmalıdır.");
  }
  const confirmedAtUtc = utcTimestampOrNull(
    verificationItem.confirmedAtUtc,
    "Değer niyeti doğrulama zamanı",
  );
  const teacherConfirmed = verificationItem.teacherConfirmed;
  if (verificationItem.status === "verified") {
    exactBoolean(teacherConfirmed, true, "Doğrulanmış niyet öğretmen onayı");
    if (!confirmedAtUtc) throw new Error("Doğrulanmış niyet UTC onay zamanı taşımalıdır.");
    if (
      !mapping.officialActionSnapshots.some(
        (snapshot) => snapshot.valueCode === mapping.primaryValueCode,
      )
    ) {
      throw new Error("Doğrulanmış niyet ana değer için resmî eylem snapshot'ı taşımalıdır.");
    }
    if (culturalContexts.some((context) => context.provenance.status !== "verified")) {
      throw new Error("Doğrulanmış değer niyetindeki bütün kültürel kullanımlar kaynakça doğrulanmış olmalıdır.");
    }
  } else {
    exactBoolean(teacherConfirmed, false, "Taslak niyet öğretmen onayı");
    if (confirmedAtUtc !== null) throw new Error("Taslak niyet onay zamanı taşıyamaz.");
  }

  return deepFreeze({
    id: identifier(item.id, "Değer niyeti kimliği"),
    version: exactOne(item.version, "Değer niyeti sürümü"),
    mapping,
    culturalContexts,
    verification: {
      status: verificationItem.status,
      teacherConfirmed,
      confirmedAtUtc,
    },
  }) as PlanValueIntent;
}

function parseValueIntents(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  reviewRegistry?: CulturalReviewRegistryResolver,
): PlanValueIntent[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Error(`${label} ${minimum}–${maximum} değer niyeti içermelidir.`);
  }
  const parsed = value.map((candidate) =>
    parsePlanValueIntent(candidate, reviewRegistry));
  if (new Set(parsed.map((intent) => intent.id)).size !== parsed.length) {
    throw new Error(`${label} benzersiz değer niyeti kimlikleri içermelidir.`);
  }
  return parsed;
}

function parseRoofValueChecks(
  value: unknown,
  intents: readonly PlanValueIntent[],
  label: string,
  requireAllPresent = false,
): RoofValueCheck[] {
  if (!Array.isArray(value) || value.length !== ROOF_VALUE_CODES.length) {
    throw new Error(`${label} D1, D14 ve D16 için tam üç kontrol içermelidir.`);
  }
  const verifiedRoofCodes = new Set(
    verifiedIntents(intents).map((intent) => intent.mapping.roofValueCode),
  );
  const parsed = value.map((candidate, index) => {
    const check = record(candidate, `${label}[${index}]`);
    exactKeys(check, ["valueCode", "status", "rationale"], `${label}[${index}]`);
    if (typeof check.valueCode !== "string" || !ROOF_VALUE_CODE_SET.has(check.valueCode)) {
      throw new Error(`${label}[${index}] yalnız D1, D14 veya D16 olabilir.`);
    }
    if (check.status !== "verified_present" && check.status !== "reviewed_not_selected") {
      throw new Error(`${label}[${index}] geçerli kontrol statüsü taşımalıdır.`);
    }
    const expectedStatus = verifiedRoofCodes.has(check.valueCode as RoofValueCode)
      ? "verified_present"
      : "reviewed_not_selected";
    if (check.status !== expectedStatus) {
      throw new Error(`${label} yalnız doğrulanmış niyetlerdeki gerçek çatı ankrajını işaretleyebilir.`);
    }
    return {
      valueCode: check.valueCode as RoofValueCode,
      status: check.status as RoofValueCheckStatus,
      rationale: safeText(check.rationale, `${label}[${index}] gerekçesi`, 1000),
    };
  });
  if (
    new Set(parsed.map((check) => check.valueCode)).size !== ROOF_VALUE_CODES.length ||
    ROOF_VALUE_CODES.some((code) => !parsed.some((check) => check.valueCode === code))
  ) {
    throw new Error(`${label} D1, D14 ve D16 kodlarını birer kez taşımalıdır.`);
  }
  if (requireAllPresent && parsed.some((check) => check.status !== "verified_present")) {
    throw new Error(`${label} bu plan düzeyinde D1, D14 ve D16'nın üçünü de doğrulanmış göstermelidir.`);
  }
  return parsed;
}

export function evaluateVerifiedMonthlyCoverage(
  intents: readonly PlanValueIntent[],
): VerifiedValueCoverageResult {
  const coveredValueCodes = verifiedPrimaryValueCodes(intents);
  return deepFreeze({
    valid: coveredValueCodes.length >= 4,
    coveredValueCodes,
    missingValueCodes: VALUE_CODES.filter((code) => !coveredValueCodes.includes(code)),
    ignoredDraftIntentIds: intents
      .filter((intent) => intent.verification.status === "draft")
      .map((intent) => intent.id),
    minimumRequired: 4,
  }) as VerifiedValueCoverageResult;
}

export function evaluateVerifiedTermCoverage(
  intents: readonly PlanValueIntent[],
): VerifiedValueCoverageResult {
  const coveredValueCodes = verifiedPrimaryValueCodes(intents);
  const missingValueCodes = VALUE_CODES.filter((code) => !coveredValueCodes.includes(code));
  return deepFreeze({
    valid: missingValueCodes.length === 0,
    coveredValueCodes,
    missingValueCodes,
    ignoredDraftIntentIds: intents
      .filter((intent) => intent.verification.status === "draft")
      .map((intent) => intent.id),
    minimumRequired: VALUE_CODES.length,
  }) as VerifiedValueCoverageResult;
}

export function evaluateVerifiedMonthlyCulturalContinuity(
  intents: readonly PlanValueIntent[],
): VerifiedCulturalContinuityResult {
  const verifiedUses = intents.filter(
    (intent) =>
      intent.verification.status === "verified" &&
      intent.culturalContexts.length > 0 &&
      intent.culturalContexts.every((context) => context.provenance.status === "verified"),
  );
  return deepFreeze({
    valid: verifiedUses.length > 0,
    valueIntentIds: verifiedUses.map((intent) => intent.id),
    culturalBridgeIds: [
      ...new Set(
        verifiedUses.flatMap((intent) =>
          intent.culturalContexts.map((context) => context.culturalBridgeId),
        ),
      ),
    ],
    ignoredUnverifiedValueIntentIds: intents
      .filter(
        (intent) =>
          intent.culturalContexts.length > 0 &&
          !verifiedUses.some((verified) => verified.id === intent.id),
      )
      .map((intent) => intent.id),
  }) as VerifiedCulturalContinuityResult;
}

export function parseObservationEvidenceIntent(
  value: unknown,
  availableIntents?: readonly PlanValueIntent[],
): ObservationEvidenceIntent {
  const item = record(value, "Gözlem/kanıt niyeti");
  exactKeys(
    item,
    [
      "id",
      "valueIntentId",
      "observableActionPrompt",
      "contextAndSupportPrompt",
      "counterEvidencePrompt",
      "evidenceRoles",
      "childVoiceCapture",
      "teacherConfirmationRequired",
      "singleEventCharacterInferenceProhibited",
    ],
    "Gözlem/kanıt niyeti",
  );
  const valueIntentId = identifier(item.valueIntentId, "Gözlem değer niyeti kimliği");
  if (availableIntents) {
    resolveVerifiedIntentRefs([valueIntentId], availableIntents, "Gözlem/kanıt niyeti");
  }
  if (!Array.isArray(item.evidenceRoles) || item.evidenceRoles.length !== EVIDENCE_ROLES.length) {
    throw new Error("Gözlem/kanıt niyeti supports, contrasts ve context_only rollerini taşımalıdır.");
  }
  const evidenceRoles = item.evidenceRoles.map((role) => {
    if (typeof role !== "string" || !EVIDENCE_ROLES.includes(role as EvidenceRole)) {
      throw new Error("Gözlem/kanıt niyeti geçersiz kanıt rolü içeriyor.");
    }
    return role as EvidenceRole;
  });
  if (
    new Set(evidenceRoles).size !== EVIDENCE_ROLES.length ||
    EVIDENCE_ROLES.some((role) => !evidenceRoles.includes(role))
  ) {
    throw new Error("Gözlem/kanıt niyeti karşı ve bağlamsal kanıt rollerini eksiksiz taşımalıdır.");
  }
  if (item.childVoiceCapture !== "optional") {
    throw new Error("Çocuk sesi yakalama optional olmalı; çocuk konuşmaya zorlanamaz.");
  }
  return deepFreeze({
    id: identifier(item.id, "Gözlem/kanıt niyeti kimliği"),
    valueIntentId,
    observableActionPrompt: safeText(item.observableActionPrompt, "Gözlenebilir eylem sorusu"),
    contextAndSupportPrompt: safeText(item.contextAndSupportPrompt, "Bağlam ve destek sorusu"),
    counterEvidencePrompt: safeText(item.counterEvidencePrompt, "Karşı kanıt sorusu"),
    evidenceRoles,
    childVoiceCapture: "optional",
    teacherConfirmationRequired: exactBoolean(
      item.teacherConfirmationRequired,
      true,
      "Gözlem öğretmen doğrulaması",
    ),
    singleEventCharacterInferenceProhibited: exactBoolean(
      item.singleEventCharacterInferenceProhibited,
      true,
      "Tek olaydan kişilik hükmü yasağı",
    ),
  }) as ObservationEvidenceIntent;
}

function parseObservationIntents(
  value: unknown,
  intents: readonly PlanValueIntent[],
  label: string,
): ObservationEvidenceIntent[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
    throw new Error(`${label} 1–50 gözlem/kanıt niyeti içermelidir.`);
  }
  const parsed = value.map((candidate) => parseObservationEvidenceIntent(candidate, intents));
  if (new Set(parsed.map((intent) => intent.id)).size !== parsed.length) {
    throw new Error(`${label} benzersiz gözlem niyeti kimlikleri içermelidir.`);
  }
  const verifiedIds = new Set(verifiedIntents(intents).map((intent) => intent.id));
  const observedIds = new Set(parsed.map((intent) => intent.valueIntentId));
  if ([...verifiedIds].some((id) => !observedIds.has(id))) {
    throw new Error(`${label} her doğrulanmış değer niyeti için gözlem ve karşı kanıt istemi taşımalıdır.`);
  }
  return parsed;
}

function parseFamilyCommunityBalance(
  value: unknown,
  intents: readonly PlanValueIntent[],
): FamilyCommunityBalance {
  const item = record(value, "Aylık aile/toplum dengesi");
  exactKeys(
    item,
    [
      "valueIntentIds",
      "rationale",
      "participationOptional",
      "noResponsePenalty",
      "lowOrNoCostAlternative",
    ],
    "Aylık aile/toplum dengesi",
  );
  const valueIntentIds = identifierArray(
    item.valueIntentIds,
    "Aile/toplum değer niyeti bağlantıları",
    1,
    20,
  );
  const resolved = resolveVerifiedIntentRefs(
    valueIntentIds,
    intents,
    "Aylık aile/toplum dengesi",
  );
  if (resolved.some((intent) => !intent.mapping.familyCommunityTransfer)) {
    throw new Error("Aile/toplum dengesindeki her niyet somut aile/toplum aktarımı taşımalıdır.");
  }
  return {
    valueIntentIds,
    rationale: safeText(item.rationale, "Aile/toplum dengesi gerekçesi"),
    participationOptional: exactBoolean(
      item.participationOptional,
      true,
      "Aile katılımının gönüllülüğü",
    ),
    noResponsePenalty: exactBoolean(
      item.noResponsePenalty,
      false,
      "Ailenin yanıt vermeme yaptırımı",
    ),
    lowOrNoCostAlternative: safeText(
      item.lowOrNoCostAlternative,
      "Düşük veya sıfır maliyetli aile yolu",
    ),
  };
}

function parseNatureStewardshipBalance(
  value: unknown,
  intents: readonly PlanValueIntent[],
): NatureStewardshipBalance {
  const item = record(value, "Aylık doğa dengesi");
  exactKeys(
    item,
    ["valueIntentIds", "rationale", "safetyAndAccessPlan", "indoorAlternative"],
    "Aylık doğa dengesi",
  );
  const valueIntentIds = identifierArray(
    item.valueIntentIds,
    "Doğa sorumluluğu değer niyeti bağlantıları",
    1,
    20,
  );
  const resolved = resolveVerifiedIntentRefs(valueIntentIds, intents, "Aylık doğa dengesi");
  if (resolved.some((intent) => !intent.mapping.natureStewardshipTransfer)) {
    throw new Error("Doğa dengesindeki her niyet somut doğa sorumluluğu aktarımı taşımalıdır.");
  }
  return {
    valueIntentIds,
    rationale: safeText(item.rationale, "Doğa dengesi gerekçesi"),
    safetyAndAccessPlan: safeText(item.safetyAndAccessPlan, "Doğa güvenlik ve erişim planı"),
    indoorAlternative: safeText(item.indoorAlternative, "Doğa bağlantılı kapalı alan alternatifi"),
  };
}

function parseMonthlyCulturalContinuity(
  value: unknown,
  intents: readonly PlanValueIntent[],
): MonthlyCulturalContinuity {
  const item = record(value, "Aylık kültürel süreklilik");
  exactKeys(item, ["valueIntentIds", "rationale"], "Aylık kültürel süreklilik");
  const valueIntentIds = identifierArray(
    item.valueIntentIds,
    "Aylık kültürel süreklilik niyetleri",
    1,
    20,
  );
  const resolved = resolveVerifiedIntentRefs(
    valueIntentIds,
    intents,
    "Aylık kültürel süreklilik",
  );
  const continuity = evaluateVerifiedMonthlyCulturalContinuity(resolved);
  if (!continuity.valid || continuity.valueIntentIds.length !== valueIntentIds.length) {
    throw new Error(
      "Aylık kültürel süreklilik yalnız kaynak/yöre/dönem/varyant/uyarlaması doğrulanmış kültürel kullanımları sayabilir.",
    );
  }
  return {
    valueIntentIds,
    rationale: safeText(item.rationale, "Aylık kültürel süreklilik gerekçesi"),
  };
}

function parseValuePlanOverlays(
  value: unknown,
  intents: readonly PlanValueIntent[],
): ValuePlanOverlays {
  const item = record(value, "Pedagojik plan overlay'leri");
  exactKeys(item, ["forestSchool", "preparedEnvironment"], "Pedagojik plan overlay'leri");
  return {
    forestSchool:
      item.forestSchool === null ? null : parseForestSchoolValuesOverlay(item.forestSchool, intents),
    preparedEnvironment:
      item.preparedEnvironment === null
        ? null
        : parsePreparedEnvironmentValuesOverlay(item.preparedEnvironment, intents),
  };
}

function assertExactVerifiedPrimaryCoverage(
  intents: readonly PlanValueIntent[],
  selectedCodes: readonly ValueCode[],
  label: string,
): void {
  const covered = verifiedPrimaryValueCodes(intents);
  const missing = selectedCodes.filter((code) => !covered.includes(code));
  const unselected = covered.filter((code) => !selectedCodes.includes(code));
  if (missing.length > 0 || unselected.length > 0) {
    throw new Error(
      `${label} yalnız doğrulanmış ana değer niyetleriyle bire bir eşleşmelidir; eksik: ${missing.join(", ") || "yok"}, seçilmemiş: ${unselected.join(", ") || "yok"}.`,
    );
  }
}

function parseAnnualTermWindow(
  value: unknown,
  intents: readonly PlanValueIntent[],
  index: number,
): AnnualTermWindow {
  const label = `Yıllık dönem penceresi[${index}]`;
  const item = record(value, label);
  exactKeys(item, ["id", "valueIntentIds"], label);
  const valueIntentIds = identifierArray(item.valueIntentIds, `${label} değer niyetleri`, 1, 100);
  const resolved = resolveVerifiedIntentRefs(valueIntentIds, intents, label);
  const coverage = evaluateVerifiedTermCoverage(resolved);
  if (!coverage.valid) {
    throw new Error(`${label} D1–D20'nin tümünü doğrulanmış niyetlerle kapsamalıdır.`);
  }
  return { id: identifier(item.id, `${label} kimliği`), valueIntentIds };
}

function parseAnnualMonthWindow(
  value: unknown,
  intents: readonly PlanValueIntent[],
  index: number,
): AnnualMonthWindow {
  const label = `Yıllık ay penceresi[${index}]`;
  const item = record(value, label);
  exactKeys(
    item,
    [
      "monthKey",
      "valueIntentIds",
      "familyCommunityValueIntentIds",
      "natureStewardshipValueIntentIds",
      "culturalValueIntentIds",
    ],
    label,
  );
  const valueIntentIds = identifierArray(item.valueIntentIds, `${label} değer niyetleri`, 1, 50);
  const monthIntents = resolveVerifiedIntentRefs(valueIntentIds, intents, label);
  if (!evaluateVerifiedMonthlyCoverage(monthIntents).valid) {
    throw new Error(`${label} en az dört doğrulanmış ana değer niyeti taşımalıdır.`);
  }
  const familyCommunityValueIntentIds = identifierArray(
    item.familyCommunityValueIntentIds,
    `${label} aile/toplum dengesi`,
    1,
    20,
  );
  const familyIntents = resolveVerifiedIntentRefs(
    familyCommunityValueIntentIds,
    monthIntents,
    `${label} aile/toplum dengesi`,
  );
  if (familyIntents.some((intent) => !intent.mapping.familyCommunityTransfer)) {
    throw new Error(`${label} aile/toplum bağlantıları somut aktarım taşımalıdır.`);
  }
  const natureStewardshipValueIntentIds = identifierArray(
    item.natureStewardshipValueIntentIds,
    `${label} doğa dengesi`,
    1,
    20,
  );
  const natureIntents = resolveVerifiedIntentRefs(
    natureStewardshipValueIntentIds,
    monthIntents,
    `${label} doğa dengesi`,
  );
  if (natureIntents.some((intent) => !intent.mapping.natureStewardshipTransfer)) {
    throw new Error(`${label} doğa bağlantıları somut sorumluluk aktarımı taşımalıdır.`);
  }
  const culturalValueIntentIds = identifierArray(
    item.culturalValueIntentIds,
    `${label} kültürel sürekliliği`,
    1,
    20,
  );
  const culturalIntents = resolveVerifiedIntentRefs(
    culturalValueIntentIds,
    monthIntents,
    `${label} kültürel sürekliliği`,
  );
  if (
    !evaluateVerifiedMonthlyCulturalContinuity(culturalIntents).valid ||
    culturalIntents.some((intent) => intent.culturalContexts.length === 0)
  ) {
    throw new Error(`${label} yalnız doğrulanmış kültürel bağlam kullanımlarını sayabilir.`);
  }
  return {
    monthKey: monthKey(item.monthKey, `${label} ayı`),
    valueIntentIds,
    familyCommunityValueIntentIds,
    natureStewardshipValueIntentIds,
    culturalValueIntentIds,
  };
}

export function parseAnnualValuesPlan(
  value: unknown,
  reviewRegistry?: CulturalReviewRegistryResolver,
): AnnualValuesPlan {
  const item = record(value, "Yıllık değerler planı");
  exactKeys(
    item,
    [
      "schemaVersion",
      "planType",
      "id",
      "academicYearId",
      "programProfileId",
      "valueIntents",
      "terms",
      "monthlyWindows",
      "roofValueChecks",
      "roofBalanceRationale",
      "culturalCalendarAnchors",
      "familyCommunityPartnershipPrinciples",
      "inclusionAndSafeguardReview",
      "overlays",
    ],
    "Yıllık değerler planı",
  );
  if (item.planType !== "annual") throw new Error("Yıllık plan türü annual olmalıdır.");
  const valueIntents = parseValueIntents(
    item.valueIntents,
    "Yıllık plan niyetleri",
    20,
    100,
    reviewRegistry,
  );
  if (!Array.isArray(item.terms) || item.terms.length < 1 || item.terms.length > 3) {
    throw new Error("Yıllık plan 1–3 dönem penceresi içermelidir.");
  }
  const terms = item.terms.map((term, index) => parseAnnualTermWindow(term, valueIntents, index));
  if (new Set(terms.map((term) => term.id)).size !== terms.length) {
    throw new Error("Yıllık dönem kimlikleri benzersiz olmalıdır.");
  }
  if (!Array.isArray(item.monthlyWindows) || item.monthlyWindows.length < 1 || item.monthlyWindows.length > 12) {
    throw new Error("Yıllık plan 1–12 aylık pencere içermelidir.");
  }
  const monthlyWindows = item.monthlyWindows.map((window, index) =>
    parseAnnualMonthWindow(window, valueIntents, index),
  );
  if (new Set(monthlyWindows.map((window) => window.monthKey)).size !== monthlyWindows.length) {
    throw new Error("Yıllık plandaki ay anahtarları benzersiz olmalıdır.");
  }
  return deepFreeze({
    schemaVersion: exactOne(item.schemaVersion, "Yıllık plan şema sürümü"),
    planType: "annual",
    id: identifier(item.id, "Yıllık plan kimliği"),
    academicYearId: identifier(item.academicYearId, "Akademik yıl kimliği"),
    programProfileId: identifier(item.programProfileId, "Program profili kimliği"),
    valueIntents,
    terms,
    monthlyWindows,
    roofValueChecks: parseRoofValueChecks(
      item.roofValueChecks,
      valueIntents,
      "Yıllık çatı değer kontrolleri",
      true,
    ),
    roofBalanceRationale: safeText(item.roofBalanceRationale, "Yıllık çatı dengesi gerekçesi"),
    culturalCalendarAnchors: safeTextArray(
      item.culturalCalendarAnchors,
      "Kültürel takvim ankrajları",
      1,
      30,
    ),
    familyCommunityPartnershipPrinciples: safeTextArray(
      item.familyCommunityPartnershipPrinciples,
      "Aile/toplum ortaklık ilkeleri",
      1,
      20,
    ),
    inclusionAndSafeguardReview: safeText(
      item.inclusionAndSafeguardReview,
      "Yıllık kapsayıcılık ve koruma incelemesi",
    ),
    overlays: parseValuePlanOverlays(item.overlays, valueIntents),
  }) as AnnualValuesPlan;
}

export function parseMonthlyValuesPlan(
  value: unknown,
  reviewRegistry?: CulturalReviewRegistryResolver,
): MonthlyValuesPlan {
  const item = record(value, "Aylık değerler planı");
  exactKeys(
    item,
    [
      "schemaVersion",
      "planType",
      "id",
      "yearPlanId",
      "monthKey",
      "programProfileId",
      "valueIntents",
      "selectedValueCodes",
      "roofValueChecks",
      "familyCommunityBalance",
      "natureStewardshipBalance",
      "culturalContinuity",
      "reflectionPrompt",
      "nextMonthDecisionRule",
      "overlays",
    ],
    "Aylık değerler planı",
  );
  if (item.planType !== "monthly") throw new Error("Aylık plan türü monthly olmalıdır.");
  const valueIntents = parseValueIntents(
    item.valueIntents,
    "Aylık plan niyetleri",
    4,
    30,
    reviewRegistry,
  );
  const selectedValueCodes = valueCodeArray(
    item.selectedValueCodes,
    "Aylık seçili değerler",
    4,
    VALUE_CODES.length,
  );
  assertExactVerifiedPrimaryCoverage(valueIntents, selectedValueCodes, "Aylık seçili değerler");
  if (!evaluateVerifiedMonthlyCoverage(valueIntents).valid) {
    throw new Error("Aylık kapsam en az dört doğrulanmış değer niyeti taşımalıdır.");
  }
  return deepFreeze({
    schemaVersion: exactOne(item.schemaVersion, "Aylık plan şema sürümü"),
    planType: "monthly",
    id: identifier(item.id, "Aylık plan kimliği"),
    yearPlanId: identifier(item.yearPlanId, "Yıllık plan kimliği"),
    monthKey: monthKey(item.monthKey, "Aylık plan ayı"),
    programProfileId: identifier(item.programProfileId, "Program profili kimliği"),
    valueIntents,
    selectedValueCodes,
    roofValueChecks: parseRoofValueChecks(
      item.roofValueChecks,
      valueIntents,
      "Aylık çatı değer kontrolleri",
    ),
    familyCommunityBalance: parseFamilyCommunityBalance(
      item.familyCommunityBalance,
      valueIntents,
    ),
    natureStewardshipBalance: parseNatureStewardshipBalance(
      item.natureStewardshipBalance,
      valueIntents,
    ),
    culturalContinuity: parseMonthlyCulturalContinuity(
      item.culturalContinuity,
      valueIntents,
    ),
    reflectionPrompt: safeText(item.reflectionPrompt, "Aylık öğretmen yansıtma sorusu"),
    nextMonthDecisionRule: safeText(item.nextMonthDecisionRule, "Sonraki ay karar kuralı"),
    overlays: parseValuePlanOverlays(item.overlays, valueIntents),
  }) as MonthlyValuesPlan;
}

function parseFocusValueCodes(
  value: unknown,
  intents: readonly PlanValueIntent[],
  label: string,
): ValueCode[] {
  const codes = valueCodeArray(value, label, 1, 3);
  assertExactVerifiedPrimaryCoverage(intents, codes, label);
  return codes;
}

export function parseWeeklyValuesPlan(
  value: unknown,
  reviewRegistry?: CulturalReviewRegistryResolver,
): WeeklyValuesPlan {
  const item = record(value, "Haftalık değerler planı");
  exactKeys(
    item,
    [
      "schemaVersion",
      "planType",
      "id",
      "monthPlanId",
      "programProfileId",
      "civilDateRange",
      "valueIntents",
      "focusValueCodes",
      "roofValueChecks",
      "routineActionOpportunities",
      "observationIntents",
      "repairOrContributionOpportunity",
      "reflectionPrompt",
      "nextWeekDecisionRule",
      "overlays",
    ],
    "Haftalık değerler planı",
  );
  if (item.planType !== "weekly") throw new Error("Haftalık plan türü weekly olmalıdır.");
  const valueIntents = parseValueIntents(
    item.valueIntents,
    "Haftalık plan niyetleri",
    1,
    10,
    reviewRegistry,
  );
  return deepFreeze({
    schemaVersion: exactOne(item.schemaVersion, "Haftalık plan şema sürümü"),
    planType: "weekly",
    id: identifier(item.id, "Haftalık plan kimliği"),
    monthPlanId: identifier(item.monthPlanId, "Aylık plan kimliği"),
    programProfileId: identifier(item.programProfileId, "Program profili kimliği"),
    civilDateRange: parseCivilDateRange(item.civilDateRange, "Haftalık civil_date aralığı"),
    valueIntents,
    focusValueCodes: parseFocusValueCodes(
      item.focusValueCodes,
      valueIntents,
      "Haftalık odak değerleri",
    ),
    roofValueChecks: parseRoofValueChecks(
      item.roofValueChecks,
      valueIntents,
      "Haftalık çatı değer kontrolleri",
    ),
    routineActionOpportunities: safeTextArray(
      item.routineActionOpportunities,
      "Haftalık rutin eylem fırsatları",
      1,
      20,
    ),
    observationIntents: parseObservationIntents(
      item.observationIntents,
      valueIntents,
      "Haftalık gözlem niyetleri",
    ),
    repairOrContributionOpportunity: safeText(
      item.repairOrContributionOpportunity,
      "Haftalık onarım/katkı fırsatı",
    ),
    reflectionPrompt: safeText(item.reflectionPrompt, "Haftalık yansıtma sorusu"),
    nextWeekDecisionRule: safeText(item.nextWeekDecisionRule, "Sonraki hafta karar kuralı"),
    overlays: parseValuePlanOverlays(item.overlays, valueIntents),
  }) as WeeklyValuesPlan;
}

function parseDailyValueMoments(
  value: unknown,
  intents: readonly PlanValueIntent[],
): DailyValueMoment[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > DAILY_MOMENTS.size) {
    throw new Error("Günlük değer anları 1–7 kayıt içermelidir.");
  }
  const parsed = value.map((candidate, index) => {
    const label = `Günlük değer anı[${index}]`;
    const item = record(candidate, label);
    exactKeys(item, ["moment", "valueIntentIds"], label);
    if (typeof item.moment !== "string" || !DAILY_MOMENTS.has(item.moment)) {
      throw new Error(`${label} geçerli günlük akış anı taşımalıdır.`);
    }
    const valueIntentIds = identifierArray(item.valueIntentIds, `${label} değer niyetleri`, 1, 10);
    resolveVerifiedIntentRefs(valueIntentIds, intents, label);
    return { moment: item.moment as DailyValueMomentName, valueIntentIds };
  });
  if (new Set(parsed.map((moment) => moment.moment)).size !== parsed.length) {
    throw new Error("Günlük değer anları benzersiz olmalıdır.");
  }
  const referenced = new Set(parsed.flatMap((moment) => moment.valueIntentIds));
  if (verifiedIntents(intents).some((intent) => !referenced.has(intent.id))) {
    throw new Error("Her doğrulanmış günlük değer niyeti en az bir doğal akış anına bağlanmalıdır.");
  }
  return parsed;
}

export function parseDailyValuesPlan(
  value: unknown,
  reviewRegistry?: CulturalReviewRegistryResolver,
): DailyValuesPlan {
  const item = record(value, "Günlük değerler planı");
  const keys = [
    "schemaVersion",
    "planType",
    "id",
    "monthPlanId",
    "weekPlanId",
    "programProfileId",
    "civilDate",
    "valueIntents",
    "valueMoments",
    "roofValueChecks",
    "adultModelCommitment",
    "childChoicePoints",
    "pauseOrDeclinePath",
    "repairProtocol",
    "observationIntents",
    "safetyAndPrivacyChecks",
    "familyTransitionNote",
    "overlays",
  ] as const;
  exactKeys(
    item,
    keys,
    "Günlük değerler planı",
    keys.filter((key) => key !== "familyTransitionNote"),
  );
  if (item.planType !== "daily") throw new Error("Günlük plan türü daily olmalıdır.");
  const valueIntents = parseValueIntents(
    item.valueIntents,
    "Günlük plan niyetleri",
    1,
    8,
    reviewRegistry,
  );
  const weekPlanId =
    item.weekPlanId === null ? null : identifier(item.weekPlanId, "Haftalık plan kimliği");
  return deepFreeze({
    schemaVersion: exactOne(item.schemaVersion, "Günlük plan şema sürümü"),
    planType: "daily",
    id: identifier(item.id, "Günlük plan kimliği"),
    monthPlanId: identifier(item.monthPlanId, "Aylık plan kimliği"),
    weekPlanId,
    programProfileId: identifier(item.programProfileId, "Program profili kimliği"),
    civilDate: civilDate(item.civilDate, "Günlük plan tarihi"),
    valueIntents,
    valueMoments: parseDailyValueMoments(item.valueMoments, valueIntents),
    roofValueChecks: parseRoofValueChecks(
      item.roofValueChecks,
      valueIntents,
      "Günlük çatı değer kontrolleri",
    ),
    adultModelCommitment: safeText(item.adultModelCommitment, "Günlük yetişkin model taahhüdü"),
    childChoicePoints: safeTextArray(item.childChoicePoints, "Günlük çocuk seçim noktaları", 2, 12),
    pauseOrDeclinePath: safeText(item.pauseOrDeclinePath, "Mola/geri çekilme ve dönüş yolu"),
    repairProtocol: safeText(item.repairProtocol, "Günlük onarım protokolü"),
    observationIntents: parseObservationIntents(
      item.observationIntents,
      valueIntents,
      "Günlük gözlem niyetleri",
    ),
    safetyAndPrivacyChecks: safeTextArray(
      item.safetyAndPrivacyChecks,
      "Günlük güvenlik ve mahremiyet kontrolleri",
      1,
      20,
    ),
    ...(item.familyTransitionNote === undefined
      ? {}
      : {
          familyTransitionNote: safeText(
            item.familyTransitionNote,
            "Günlük aile geçiş notu",
          ),
        }),
    overlays: parseValuePlanOverlays(item.overlays, valueIntents),
  }) as DailyValuesPlan;
}

export function parseTeacherValuesEvaluation(
  value: unknown,
  reviewRegistry?: CulturalReviewRegistryResolver,
  evidenceRegistry?: TeacherEvaluationEvidenceRegistryResolver,
): TeacherValuesEvaluation {
  const item = record(value, "Öğretmen değerler değerlendirmesi");
  exactKeys(
    item,
    [
      "schemaVersion",
      "planType",
      "id",
      "periodId",
      "scope",
      "programProfileId",
      "valueIntents",
      "roofValueChecks",
      "observationIntents",
      "evidenceObservationIds",
      "strengthAndEffortNoticed",
      "conditionsThatSupportedParticipation",
      "barriersAndAdultContribution",
      "equityAndBiasCheck",
      "culturalAndConscienceCheck",
      "counterEvidenceAndUncertainty",
      "nextOpportunity",
      "reviewStatus",
      "teacherApproval",
    ],
    "Öğretmen değerler değerlendirmesi",
  );
  if (item.planType !== "teacher_evaluation") {
    throw new Error("Öğretmen değerlendirmesi plan türü teacher_evaluation olmalıdır.");
  }
  if (
    item.scope !== "activity" &&
    item.scope !== "week" &&
    item.scope !== "month" &&
    item.scope !== "term"
  ) {
    throw new Error("Öğretmen değerlendirmesi kapsamı activity, week, month veya term olmalıdır.");
  }
  if (item.reviewStatus !== "draft" && item.reviewStatus !== "teacher_approved") {
    throw new Error("Öğretmen değerlendirmesi statüsü draft veya teacher_approved olmalıdır.");
  }
  const teacherApproval = item.teacherApproval;
  exactBoolean(
    teacherApproval,
    item.reviewStatus === "teacher_approved",
    "Öğretmen değerlendirmesi onay tutarlılığı",
  );
  const evaluationId = identifier(item.id, "Değerlendirme kimliği");
  const periodId = identifier(item.periodId, "Değerlendirme dönem kimliği");
  const scope = item.scope as TeacherReflectionScope;
  const programProfileId = identifier(
    item.programProfileId,
    "Program profili kimliği",
  );
  const evidenceObservationIds = identifierArray(
    item.evidenceObservationIds,
    "Kanıt gözlem kimlikleri",
    0,
    100,
  );
  if (item.reviewStatus === "teacher_approved") {
    const minimumEvidenceCount = scope === "activity" ? 1 : 2;
    if (evidenceObservationIds.length < minimumEvidenceCount) {
      throw new Error(
        `Öğretmen onaylı ${scope} kapsamlı değerlendirme en az ${minimumEvidenceCount} farklı kanıt gözlem kimliği taşımalıdır.`,
      );
    }
    if (!evidenceRegistry) {
      throw new Error(
        "Öğretmen onaylı değerlendirme kanıtları yetkili gözlem sicilinde çözümlenmeden onaylanamaz; kayıt draft kalmalıdır.",
      );
    }
    for (const observationId of evidenceObservationIds) {
      let resolved: TeacherEvaluationEvidenceRegistryResolution | null;
      try {
        resolved = evidenceRegistry(observationId);
      } catch {
        throw new Error(
          `Kanıt gözlemi ${observationId} yetkili gözlem sicilinde güvenli biçimde çözümlenemedi; kayıt draft kalmalıdır.`,
        );
      }
      if (!resolved) {
        throw new Error(
          `Kanıt gözlemi ${observationId} yetkili gözlem sicilinde bulunamadı; kayıt draft kalmalıdır.`,
        );
      }
      const resolution = record(
        resolved,
        `Kanıt gözlemi ${observationId} yetkili sicil bağı`,
      );
      exactKeys(
        resolution,
        [
          "observationId",
          "lifecycle",
          "rawTextImmutable",
          "periodId",
          "scope",
          "programProfileId",
        ],
        `Kanıt gözlemi ${observationId} yetkili sicil bağı`,
      );
      if (resolution.observationId !== observationId) {
        throw new Error(
          `Kanıt gözlemi ${observationId} yetkili sicil kimliğiyle exact eşleşmelidir.`,
        );
      }
      if (resolution.lifecycle !== "live") {
        throw new Error(
          `Kanıt gözlemi ${observationId} silinmiş veya pasif olamaz; yalnız live kayıt kullanılabilir.`,
        );
      }
      if (resolution.rawTextImmutable !== true) {
        throw new Error(
          `Kanıt gözlemi ${observationId} değişmez ham gözlem metnine bağlı olmalıdır.`,
        );
      }
      if (
        resolution.periodId !== periodId ||
        resolution.scope !== scope ||
        resolution.programProfileId !== programProfileId
      ) {
        throw new Error(
          `Kanıt gözlemi ${observationId} değerlendirmeyle aynı dönem, kapsam ve program profiline bağlı olmalıdır.`,
        );
      }
    }
  }
  const valueIntents = parseValueIntents(
    item.valueIntents,
    "Değerlendirme değer niyetleri",
    1,
    50,
    reviewRegistry,
  );
  const parseEvaluationNarrative = (
    narrative: unknown,
    label: string,
    evidenceRole: TeacherEvidenceRole,
  ): string => {
    const parsed = parseTeacherEvidenceRationale(narrative, evidenceRole);
    // Paylaşılan rol-duyarlı kapının genel inanç/ibadet terimlerine ek olarak
    // tek başına özel adla yazılmış sûre ve dua adlarını da görmesini sağla.
    // Probe yalnız doğrulamada kullanılır; öğretmenin metni değiştirilmez.
    const policyProbe = NAMED_RELIGIOUS_TEXT_OR_PRACTICE_PATTERN.test(parsed)
      ? `sure ${parsed}`
      : parsed;
    if (policyProbe !== parsed) {
      parseTeacherEvidenceRationale(policyProbe, evidenceRole);
    }
    try {
      assertValueEvidenceSourceObservationPolicy(
        policyProbe,
        evidenceRole,
        policyProbe,
      );
    } catch (reason) {
      const detail = reason instanceof Error
        ? reason.message
        : "güvenlik sınırını ihlal ediyor";
      throw new Error(`${label} ${detail}`);
    }
    return parsed;
  };
  return deepFreeze({
    schemaVersion: exactOne(item.schemaVersion, "Değerlendirme şema sürümü"),
    planType: "teacher_evaluation",
    id: evaluationId,
    periodId,
    scope,
    programProfileId,
    valueIntents,
    roofValueChecks: parseRoofValueChecks(
      item.roofValueChecks,
      valueIntents,
      "Değerlendirme çatı değer kontrolleri",
    ),
    observationIntents: parseObservationIntents(
      item.observationIntents,
      valueIntents,
      "Değerlendirme gözlem niyetleri",
    ),
    evidenceObservationIds,
    strengthAndEffortNoticed: parseEvaluationNarrative(
      item.strengthAndEffortNoticed,
      "Fark edilen güç ve çaba",
      "supports",
    ),
    conditionsThatSupportedParticipation: parseEvaluationNarrative(
      item.conditionsThatSupportedParticipation,
      "Katılımı destekleyen koşullar",
      "context_only",
    ),
    barriersAndAdultContribution: parseEvaluationNarrative(
      item.barriersAndAdultContribution,
      "Engeller ve yetişkin katkısı",
      "contrasts",
    ),
    equityAndBiasCheck: parseEvaluationNarrative(
      item.equityAndBiasCheck,
      "Adalet ve önyargı kontrolü",
      "context_only",
    ),
    culturalAndConscienceCheck: parseEvaluationNarrative(
      item.culturalAndConscienceCheck,
      "Kültür ve din/vicdan kontrolü",
      "context_only",
    ),
    counterEvidenceAndUncertainty: parseEvaluationNarrative(
      item.counterEvidenceAndUncertainty,
      "Karşı kanıt ve belirsizlik",
      "contrasts",
    ),
    nextOpportunity: parseEvaluationNarrative(
      item.nextOpportunity,
      "Sonraki değer fırsatı",
      "context_only",
    ),
    reviewStatus: item.reviewStatus,
    teacherApproval,
  }) as TeacherValuesEvaluation;
}

export function parseFamilyCommunityValuesPlan(
  value: unknown,
  reviewRegistry?: CulturalReviewRegistryResolver,
): FamilyCommunityValuesPlan {
  const item = record(value, "Aile/toplum değerler planı");
  exactKeys(
    item,
    [
      "schemaVersion",
      "planType",
      "id",
      "programProfileId",
      "valueIntents",
      "roofValueChecks",
      "purpose",
      "invitationText",
      "participationIsOptional",
      "noResponseEffect",
      "choiceMenu",
      "lowOrNoCostAlternative",
      "homeLanguageAndAccessOptions",
      "faithAndCultureSensitivity",
      "childAndFamilyPrivacy",
      "feedbackChannel",
      "schoolContinuation",
    ],
    "Aile/toplum değerler planı",
  );
  if (item.planType !== "family_community") {
    throw new Error("Aile/toplum plan türü family_community olmalıdır.");
  }
  if (item.noResponseEffect !== "none") {
    throw new Error("Ailenin yanıt vermemesinin çocuk veya aile kaydında sonucu olamaz.");
  }
  const valueIntents = parseValueIntents(
    item.valueIntents,
    "Aile/toplum değer niyetleri",
    1,
    20,
    reviewRegistry,
  );
  if (verifiedIntents(valueIntents).some((intent) => !intent.mapping.familyCommunityTransfer)) {
    throw new Error("Aile/toplum planındaki her doğrulanmış niyet somut aktarım taşımalıdır.");
  }
  return deepFreeze({
    schemaVersion: exactOne(item.schemaVersion, "Aile/toplum plan şema sürümü"),
    planType: "family_community",
    id: identifier(item.id, "Aile/toplum plan kimliği"),
    programProfileId: identifier(item.programProfileId, "Program profili kimliği"),
    valueIntents,
    roofValueChecks: parseRoofValueChecks(
      item.roofValueChecks,
      valueIntents,
      "Aile/toplum çatı değer kontrolleri",
    ),
    purpose: safeText(item.purpose, "Aile/toplum katılım amacı"),
    invitationText: safeText(item.invitationText, "Aile/toplum davet metni"),
    participationIsOptional: exactBoolean(
      item.participationIsOptional,
      true,
      "Aile katılımının gönüllülüğü",
    ),
    noResponseEffect: "none",
    choiceMenu: safeTextArray(item.choiceMenu, "Aile katılım seçenekleri", 2, 12),
    lowOrNoCostAlternative: safeText(
      item.lowOrNoCostAlternative,
      "Düşük veya sıfır maliyetli aile seçeneği",
    ),
    homeLanguageAndAccessOptions: safeTextArray(
      item.homeLanguageAndAccessOptions,
      "Ev dili ve erişim seçenekleri",
      1,
      12,
    ),
    faithAndCultureSensitivity: safeText(
      item.faithAndCultureSensitivity,
      "İnanç ve kültür hassasiyeti",
    ),
    childAndFamilyPrivacy: safeText(item.childAndFamilyPrivacy, "Çocuk ve aile mahremiyeti"),
    feedbackChannel: safeText(item.feedbackChannel, "Aile geri bildirim kanalı"),
    schoolContinuation: safeText(item.schoolContinuation, "Okuldaki devam yolu"),
  }) as FamilyCommunityValuesPlan;
}

export function parseForestSchoolValuesOverlay(
  value: unknown,
  availableIntents: readonly PlanValueIntent[],
): ForestSchoolValuesOverlay {
  const item = record(value, "Orman Okulu/doğa süreklilik overlay'i");
  exactKeys(
    item,
    [
      "schemaVersion",
      "overlayType",
      "id",
      "claimLevel",
      "governingStandard",
      "leaderQualificationEvidenceRefs",
      "recognitionEvidenceRefs",
      "siteId",
      "civilDateRange",
      "cadence",
      "plannedSessionIds",
      "valueIntentIds",
      "roofValueChecks",
      "seasonalReturnPoints",
      "childLedInquiryThreads",
      "careAndReciprocityCommitments",
      "riskBenefitReviews",
      "dynamicRiskProtocol",
      "accessibilityRoutes",
      "weatherAndEmergencyRules",
      "leaveNoTraceAndHabitatCare",
      "observationReviewReplanningCycle",
      "familyCommunityConnection",
      "incidentAndNearMissReview",
      "qualifiedPracticeBoundary",
    ],
    "Orman Okulu/doğa süreklilik overlay'i",
  );
  if (item.overlayType !== "forest_school") {
    throw new Error("Orman Okulu overlay türü forest_school olmalıdır.");
  }
  if (
    item.claimLevel !== "nature_based_activity" &&
    item.claimLevel !== "nature_based_continuity" &&
    item.claimLevel !== "recognised_or_certified_forest_school"
  ) {
    throw new Error(
      "Orman Okulu/doğa iddia düzeyi geçersizdir; forest_school_informed_continuity etiketi yerine dürüst nature_based_continuity kullanılmalıdır.",
    );
  }
  const governingStandard =
    item.governingStandard === null
      ? null
      : safeText(item.governingStandard, "Orman Okulu yönetişim standardı");
  const leaderQualificationEvidenceRefs = identifierArray(
    item.leaderQualificationEvidenceRefs,
    "Lider yeterlik kanıtları",
    0,
    20,
  );
  const recognitionEvidenceRefs = identifierArray(
    item.recognitionEvidenceRefs,
    "Tanıma/sertifika kanıtları",
    0,
    20,
  );
  const plannedSessionIds = identifierArray(item.plannedSessionIds, "Planlı doğa oturumları", 1, 60);
  const dateRange = parseCivilDateRange(item.civilDateRange, "Doğa süreklilik tarih aralığı");
  const qualifiedPracticeBoundary = safeText(
    item.qualifiedPracticeBoundary,
    "Nitelikli uygulama ve iddia sınırı",
  );
  if (new Set(plannedSessionIds).size !== plannedSessionIds.length) {
    throw new Error("Planlı doğa oturumu kimlikleri benzersiz olmalıdır.");
  }
  if (item.claimLevel === "nature_based_activity") {
    if (
      governingStandard !== null ||
      leaderQualificationEvidenceRefs.length > 0 ||
      recognitionEvidenceRefs.length > 0
    ) {
      throw new Error(
        "Tekil doğa etkinliği Orman Okulu standardı, lider yeterliği veya tanınma kanıtı taşıyamaz.",
      );
    }
    if (qualifiedPracticeBoundary !== FOREST_SCHOOL_NATURE_ACTIVITY_BOUNDARY) {
      throw new Error(
        "Tekil doğa etkinliği kanonik Orman Okulu olmayan uygulama sınırını exact taşımalıdır.",
      );
    }
  }
  if (item.claimLevel === "nature_based_continuity") {
    if (governingStandard !== FOREST_SCHOOL_ASSOCIATION_GOOD_PRACTICE_URL) {
      throw new Error(
        "Doğa sürekliliği yalnız kanonik Forest School Association iyi uygulama ilkelerine kaynak gösterebilir.",
      );
    }
    if (
      leaderQualificationEvidenceRefs.length > 0 ||
      recognitionEvidenceRefs.length > 0
    ) {
      throw new Error(
        "Doğa sürekliliği, doğrulama servisi olmadan lider yeterliği veya Orman Okulu tanınması iddia edemez.",
      );
    }
    if (plannedSessionIds.length < 12) {
      throw new Error(
        "Doğa sürekliliği en az on iki planlı oturum içermelidir; bu eşik yine de Orman Okulu tanınması anlamına gelmez.",
      );
    }
    const durationDays =
      (Date.parse(`${dateRange.end}T00:00:00.000Z`) -
        Date.parse(`${dateRange.start}T00:00:00.000Z`)) /
      86_400_000;
    if (durationDays < 168) {
      throw new Error(
        "Doğa sürekliliği en az yirmi dört haftalık tarih aralığı gerektirir; bu eşik yine de Orman Okulu tanınması anlamına gelmez.",
      );
    }
    if (!/aynı\s+(?:çekirdek\s+)?grup/iu.test(String(item.cadence))) {
      throw new Error("Doğa sürekliliği aynı çekirdek grupla düzenli buluşma planı taşımalıdır.");
    }
    if (qualifiedPracticeBoundary !== FOREST_SCHOOL_NATURE_CONTINUITY_BOUNDARY) {
      throw new Error(
        "Doğa sürekliliği kanonik Orman Okulu olmayan uygulama, tanınma/sertifika ve nitelikli lider sınırını exact taşımalıdır.",
      );
    }
  }
  if (item.claimLevel === "recognised_or_certified_forest_school") {
    throw new Error(
      "Tanınmış/sertifikalı Orman Okulu iddiası bu şemadaki serbest metin referanslarıyla doğrulanamaz; yetkili sicil entegrasyonu olmadan kapalıdır.",
    );
  }
  const valueIntentIds = identifierArray(item.valueIntentIds, "Doğa overlay değer niyetleri", 1, 30);
  const overlayIntents = resolveVerifiedIntentRefs(
    valueIntentIds,
    availableIntents,
    "Orman Okulu/doğa overlay'i",
  );
  if (overlayIntents.every((intent) => !intent.mapping.natureStewardshipTransfer)) {
    throw new Error("Doğa overlay'i en az bir somut doğa sorumluluğu aktarımına bağlanmalıdır.");
  }
  const continuityClaim = item.claimLevel === "nature_based_continuity";
  return deepFreeze({
    schemaVersion: exactOne(item.schemaVersion, "Doğa overlay şema sürümü"),
    overlayType: "forest_school",
    id: identifier(item.id, "Doğa overlay kimliği"),
    claimLevel: item.claimLevel,
    governingStandard,
    leaderQualificationEvidenceRefs,
    recognitionEvidenceRefs,
    siteId: identifier(item.siteId, "Doğa sahası kimliği"),
    civilDateRange: dateRange,
    cadence: safeText(item.cadence, "Doğa buluşma sıklığı"),
    plannedSessionIds,
    valueIntentIds,
    roofValueChecks: parseRoofValueChecks(
      item.roofValueChecks,
      overlayIntents,
      "Doğa overlay çatı değer kontrolleri",
      continuityClaim,
    ),
    seasonalReturnPoints: safeTextArray(
      item.seasonalReturnPoints,
      "Mevsimsel geri dönüş noktaları",
      continuityClaim ? 2 : 1,
      20,
    ),
    childLedInquiryThreads: safeTextArray(
      item.childLedInquiryThreads,
      "Çocuk öncülüğündeki araştırma izleri",
      1,
      20,
    ),
    careAndReciprocityCommitments: safeTextArray(
      item.careAndReciprocityCommitments,
      "Bakım ve karşılıklılık taahhütleri",
      1,
      20,
    ),
    riskBenefitReviews: safeTextArray(item.riskBenefitReviews, "Risk–fayda incelemeleri", 1, 20),
    dynamicRiskProtocol: safeText(item.dynamicRiskProtocol, "Dinamik risk protokolü"),
    accessibilityRoutes: safeTextArray(item.accessibilityRoutes, "Erişilebilir katılım yolları", 1, 20),
    weatherAndEmergencyRules: safeTextArray(
      item.weatherAndEmergencyRules,
      "Hava ve acil durum kuralları",
      1,
      20,
    ),
    leaveNoTraceAndHabitatCare: safeTextArray(
      item.leaveNoTraceAndHabitatCare,
      "İz bırakmama ve habitat bakımı",
      1,
      20,
    ),
    observationReviewReplanningCycle: safeTextArray(
      item.observationReviewReplanningCycle,
      "Gözlem–inceleme–yeniden planlama döngüsü",
      continuityClaim ? 2 : 1,
      20,
    ),
    familyCommunityConnection: safeTextArray(
      item.familyCommunityConnection,
      "Doğa aile/toplum bağlantısı",
      1,
      20,
    ),
    incidentAndNearMissReview: safeText(
      item.incidentAndNearMissReview,
      "Olay ve ramak kala incelemesi",
    ),
    qualifiedPracticeBoundary,
  }) as ForestSchoolValuesOverlay;
}

export function parsePreparedEnvironmentValuesOverlay(
  value: unknown,
  availableIntents: readonly PlanValueIntent[],
): PreparedEnvironmentValuesOverlay {
  const item = record(value, "Hazırlanmış çevre/Montessori overlay'i");
  exactKeys(
    item,
    [
      "schemaVersion",
      "overlayType",
      "id",
      "claimLevel",
      "certificationClaimed",
      "valueIntentIds",
      "roofValueChecks",
      "environmentArea",
      "realLifeWork",
      "childSizedAccess",
      "orderAndReturnSequence",
      "independentChoice",
      "careOfSelfOthersEnvironment",
      "repetitionAndSelfCorrection",
      "adultObservationThreshold",
      "interventionAndGraceCourtesyNotes",
      "inclusionAndAccessRoutes",
      "certificationBoundary",
    ],
    "Hazırlanmış çevre/Montessori overlay'i",
  );
  if (item.overlayType !== "prepared_environment") {
    throw new Error("Hazırlanmış çevre overlay türü prepared_environment olmalıdır.");
  }
  if (item.claimLevel !== "montessori_inspired") {
    throw new Error("Hazırlanmış çevre katmanı yalnız montessori_inspired lens iddiası taşıyabilir.");
  }
  const valueIntentIds = identifierArray(
    item.valueIntentIds,
    "Hazırlanmış çevre değer niyetleri",
    1,
    20,
  );
  const overlayIntents = resolveVerifiedIntentRefs(
    valueIntentIds,
    availableIntents,
    "Hazırlanmış çevre overlay'i",
  );
  const certificationBoundary = safeText(
    item.certificationBoundary,
    "Montessori iddia sınırı",
  );
  if (certificationBoundary !== PREPARED_ENVIRONMENT_CERTIFICATION_BOUNDARY) {
    throw new Error(
      "Hazırlanmış çevre katmanı kanonik Montessori okul ve sertifika dışı uygulama sınırını exact taşımalıdır.",
    );
  }
  return deepFreeze({
    schemaVersion: exactOne(item.schemaVersion, "Hazırlanmış çevre şema sürümü"),
    overlayType: "prepared_environment",
    id: identifier(item.id, "Hazırlanmış çevre overlay kimliği"),
    claimLevel: "montessori_inspired",
    certificationClaimed: exactBoolean(
      item.certificationClaimed,
      false,
      "Montessori sertifika iddiası",
    ),
    valueIntentIds,
    roofValueChecks: parseRoofValueChecks(
      item.roofValueChecks,
      overlayIntents,
      "Hazırlanmış çevre çatı değer kontrolleri",
    ),
    environmentArea: safeText(item.environmentArea, "Hazırlanmış çevre alanı"),
    realLifeWork: safeText(item.realLifeWork, "Gerçek yaşam işi"),
    childSizedAccess: safeText(item.childSizedAccess, "Çocuk ölçeğinde erişim"),
    orderAndReturnSequence: safeText(item.orderAndReturnSequence, "Düzen ve yerine koyma dizisi"),
    independentChoice: safeText(item.independentChoice, "Bağımsız seçim yolu"),
    careOfSelfOthersEnvironment: safeText(
      item.careOfSelfOthersEnvironment,
      "Kendine, başkasına ve çevreye bakım",
    ),
    repetitionAndSelfCorrection: safeText(
      item.repetitionAndSelfCorrection,
      "Tekrar ve öz düzeltme yolu",
    ),
    adultObservationThreshold: safeText(
      item.adultObservationThreshold,
      "Yetişkin gözlem ve müdahale eşiği",
    ),
    interventionAndGraceCourtesyNotes: safeTextArray(
      item.interventionAndGraceCourtesyNotes,
      "Müdahale ve nezaket notları",
      1,
      20,
    ),
    inclusionAndAccessRoutes: safeTextArray(
      item.inclusionAndAccessRoutes,
      "Hazırlanmış çevre erişim yolları",
      1,
      20,
    ),
    certificationBoundary,
  }) as PreparedEnvironmentValuesOverlay;
}
