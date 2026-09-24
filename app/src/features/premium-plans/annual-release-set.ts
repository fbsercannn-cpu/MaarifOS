import {
  HUMAN_REVIEW_ROLES,
  VALUE_CODES,
  VALUES_PEDAGOGY_CONSTITUTION,
  type ValueCode,
  type ValuesReviewRole,
} from "../values/values-constitution.ts";
import {
  FOREST_SCHOOL_ASSOCIATION_GOOD_PRACTICE_URL,
  FOREST_SCHOOL_NATURE_CONTINUITY_BOUNDARY,
  PREPARED_ENVIRONMENT_CERTIFICATION_BOUNDARY,
} from "../values/value-plan-contracts.ts";
import { PREMIUM_VALUES_V3_RELEASE_IDENTITY } from "./content-repository.ts";

export const ANNUAL_VALUES_RELEASE_MONTH_KEYS = Object.freeze([
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
] as const);

export type AnnualValuesReleaseMonthKey =
  (typeof ANNUAL_VALUES_RELEASE_MONTH_KEYS)[number];
export type AnnualValuesReleaseTermId = "term-1" | "term-2";
export type AnnualValuesReleaseMonthState =
  | "planned"
  | "machine_validated_pending_human_review";
export type ValuesDesignDirection = "value_led" | "learning_outcome_led";

export const ANNUAL_VALUES_CULTURAL_BRIDGE_IDS = Object.freeze([
  "emanet",
  "kul-hakki",
  "merhamet",
  "edep-nezaket",
  "helal-emek-caliskanlik",
  "sukur-kanaat-israf-etmeme",
  "aile-sila-i-rahim-komsuluk",
  "imece-yardimlasma",
  "temizlik",
  "vatan-kulturel-miras",
  "yaratilmislara-dogaya-merhamet",
] as const);

export type AnnualValuesCulturalBridgeId =
  (typeof ANNUAL_VALUES_CULTURAL_BRIDGE_IDS)[number];

export interface RoofValueActivityTargets {
  readonly D1: number;
  readonly D14: number;
  readonly D16: number;
}

export interface DesignDirectionActivityTargets {
  readonly value_led: number;
  readonly learning_outcome_led: number;
}

export interface AnnualValuesReleaseReference {
  readonly contentPackId: string;
  readonly contentPackVersion: string;
  readonly contentReleaseId: string;
  readonly manifestDigest: `sha256:${string}`;
  readonly valuesMappingStatus: "machine_validated_pending_human_review";
}

export interface AnnualValuesReleaseMonth {
  readonly monthKey: AnnualValuesReleaseMonthKey;
  readonly termId: AnnualValuesReleaseTermId;
  readonly state: AnnualValuesReleaseMonthState;
  readonly weekCount: 3 | 4;
  readonly activityCount: 9 | 12;
  readonly primaryValueTargetCodes: readonly ValueCode[];
  readonly supportingValueTargetCodes: readonly ValueCode[];
  readonly culturalBridgeTargetIds: readonly AnnualValuesCulturalBridgeId[];
  readonly roofValueActivityTargets: RoofValueActivityTargets;
  readonly designDirectionActivityTargets: DesignDirectionActivityTargets;
  readonly contextualValueNote: string | null;
  readonly releaseReference: AnnualValuesReleaseReference | null;
}

export interface AnnualValuesReleaseTerm {
  readonly id: AnnualValuesReleaseTermId;
  readonly monthKeys: readonly AnnualValuesReleaseMonthKey[];
  readonly primaryValueCoverageTargetCodes: readonly ValueCode[];
  readonly weekCount: 18;
  readonly activityCount: 54;
  readonly roofValueActivityTargets: RoofValueActivityTargets;
  readonly designDirectionActivityTargets: DesignDirectionActivityTargets;
}

export interface AnnualValuesReleaseProgramProfile {
  readonly program: "tymm_2024";
  readonly ageProfile: "60-72";
  readonly constitutionId: "maarifos-values-pedagogy-constitution";
  readonly constitutionVersion: string;
  readonly constitutionSchemaVersion: 1;
  readonly frameworkSourceUrl: string;
  readonly sourceCheckedOn: string;
  readonly officialActionCatalogId: "meb-tymm-okul-oncesi-2024-ede-ek14";
  readonly officialActionCatalogSourceVersion: string;
  readonly officialActionCatalogSourceUrl: string;
  readonly officialActionCatalogSourceSha256: `sha256:${string}`;
}

export interface AnnualCulturalCandidate {
  readonly culturalBridgeId: AnnualValuesCulturalBridgeId;
  readonly provenanceStatus: "draft";
  readonly reviewDecisionId: null;
  readonly humanReviewRequired: true;
}

export interface AnnualValuesReviewPolicy {
  readonly status: "pending";
  readonly requiredRoles: readonly ValuesReviewRole[];
  readonly publicationEligible: false;
}

export interface AnnualNatureBasedContinuityBoundary {
  readonly claimLevel: "nature_based_continuity";
  readonly governingStandard: string;
  readonly minimumDurationWeeks: number;
  readonly minimumPlannedSessions: number;
  readonly recognitionClaimed: false;
  readonly certificationClaimed: false;
  readonly qualifiedPracticeBoundary: string;
}

export interface AnnualPreparedEnvironmentBoundary {
  readonly claimLevel: "montessori_inspired";
  readonly certificationClaimed: false;
  readonly certificationBoundary: string;
}

export interface AuthoredAnnualValuesReleaseProfile {
  readonly schemaVersion: 1;
  readonly profileType: "authored_annual_values_release_profile";
  readonly profileId: "tymm-6072-2026-2027-annual-values-release-profile-v1";
  readonly sku: "TYMM-6072";
  readonly academicRelease: "2026-2027";
  readonly programProfile: AnnualValuesReleaseProgramProfile;
  readonly terms: readonly AnnualValuesReleaseTerm[];
  readonly months: readonly AnnualValuesReleaseMonth[];
  readonly annualTargets: {
    readonly weekCount: 36;
    readonly activityCount: 108;
    readonly roofValueActivityTargets: RoofValueActivityTargets;
    readonly designDirectionActivityTargets: DesignDirectionActivityTargets;
  };
  readonly culturalCandidates: readonly AnnualCulturalCandidate[];
  readonly reviewPolicy: AnnualValuesReviewPolicy;
  readonly pedagogicalLensBoundaries: {
    readonly natureBasedContinuity: AnnualNatureBasedContinuityBoundary;
    readonly preparedEnvironment: AnnualPreparedEnvironmentBoundary;
  };
}

interface ExpectedMonthTarget {
  readonly termId: AnnualValuesReleaseTermId;
  readonly weekCount: 3 | 4;
  readonly activityCount: 9 | 12;
  readonly primary: readonly ValueCode[];
  readonly supporting: readonly ValueCode[];
  readonly culturalBridges: readonly AnnualValuesCulturalBridgeId[];
  readonly roof: Readonly<RoofValueActivityTargets>;
  readonly directions: Readonly<DesignDirectionActivityTargets>;
  readonly contextualValueNote: string | null;
}

const OCTOBER_CONTEXT_NOTE =
  "D19, 29 Ekim bağlamında ritüel performansı olarak değil; ortak iyilik, ortak sorumluluk ve yaşanılan yere katkı yaşantılarıyla ele alınır.";
const NOVEMBER_CONTEXT_NOTE =
  "D19, 10 Kasım ve ortak hafıza bağlamında duygu performansı olarak değil; ortak geçmişi saygıyla araştırma ve ortak iyiliğe katkı olarak sürer.";

const EXPECTED_MONTH_TARGETS = Object.freeze({
  "2026-09": {
    termId: "term-1",
    weekCount: 4,
    activityCount: 12,
    primary: ["D1", "D3", "D4", "D5", "D6", "D8", "D11", "D12", "D13", "D14", "D16"],
    supporting: ["D1", "D3", "D5", "D6", "D8", "D10", "D11", "D13", "D14", "D15", "D16", "D17"],
    culturalBridges: [
      "emanet",
      "kul-hakki",
      "edep-nezaket",
      "helal-emek-caliskanlik",
      "sukur-kanaat-israf-etmeme",
      "aile-sila-i-rahim-komsuluk",
      "imece-yardimlasma",
    ],
    roof: { D1: 4, D14: 4, D16: 4 },
    directions: { value_led: 6, learning_outcome_led: 6 },
    contextualValueNote: null,
  },
  "2026-10": {
    termId: "term-1",
    weekCount: 4,
    activityCount: 12,
    primary: ["D5", "D7", "D9", "D17", "D18", "D19"],
    supporting: ["D3", "D13", "D14", "D16", "D20"],
    culturalBridges: [
      "sukur-kanaat-israf-etmeme",
      "temizlik",
      "vatan-kulturel-miras",
      "yaratilmislara-dogaya-merhamet",
    ],
    roof: { D1: 4, D14: 4, D16: 4 },
    directions: { value_led: 6, learning_outcome_led: 6 },
    contextualValueNote: OCTOBER_CONTEXT_NOTE,
  },
  "2026-11": {
    termId: "term-1",
    weekCount: 3,
    activityCount: 9,
    primary: ["D2", "D4", "D14", "D15", "D19", "D20"],
    supporting: ["D6", "D8", "D11", "D16"],
    culturalBridges: [
      "aile-sila-i-rahim-komsuluk",
      "imece-yardimlasma",
      "vatan-kulturel-miras",
    ],
    roof: { D1: 3, D14: 3, D16: 3 },
    directions: { value_led: 5, learning_outcome_led: 4 },
    contextualValueNote: NOVEMBER_CONTEXT_NOTE,
  },
  "2026-12": {
    termId: "term-1",
    weekCount: 4,
    activityCount: 12,
    primary: ["D1", "D3", "D6", "D10", "D11", "D16"],
    supporting: ["D7", "D12", "D14", "D17"],
    culturalBridges: ["kul-hakki", "edep-nezaket", "helal-emek-caliskanlik"],
    roof: { D1: 4, D14: 4, D16: 4 },
    directions: { value_led: 6, learning_outcome_led: 6 },
    contextualValueNote: null,
  },
  "2027-01": {
    termId: "term-1",
    weekCount: 3,
    activityCount: 9,
    primary: ["D5", "D9", "D12", "D13", "D17", "D20"],
    supporting: ["D6", "D14", "D18", "D19"],
    culturalBridges: ["emanet", "merhamet", "temizlik"],
    roof: { D1: 3, D14: 3, D16: 3 },
    directions: { value_led: 4, learning_outcome_led: 5 },
    contextualValueNote: null,
  },
  "2027-02": {
    termId: "term-2",
    weekCount: 3,
    activityCount: 9,
    primary: ["D4", "D6", "D8", "D11", "D14", "D15"],
    supporting: ["D1", "D12", "D16", "D20"],
    culturalBridges: ["emanet", "edep-nezaket", "aile-sila-i-rahim-komsuluk"],
    roof: { D1: 3, D14: 3, D16: 3 },
    directions: { value_led: 5, learning_outcome_led: 4 },
    contextualValueNote: null,
  },
  "2027-03": {
    termId: "term-2",
    weekCount: 3,
    activityCount: 9,
    primary: ["D5", "D9", "D13", "D16", "D17", "D18"],
    supporting: ["D7", "D12", "D14", "D20"],
    culturalBridges: [
      "sukur-kanaat-israf-etmeme",
      "temizlik",
      "yaratilmislara-dogaya-merhamet",
    ],
    roof: { D1: 3, D14: 3, D16: 3 },
    directions: { value_led: 4, learning_outcome_led: 5 },
    contextualValueNote: null,
  },
  "2027-04": {
    termId: "term-2",
    weekCount: 4,
    activityCount: 12,
    primary: ["D3", "D5", "D7", "D10", "D11", "D12"],
    supporting: ["D8", "D14", "D17", "D18"],
    culturalBridges: [
      "edep-nezaket",
      "helal-emek-caliskanlik",
      "sukur-kanaat-israf-etmeme",
    ],
    roof: { D1: 4, D14: 4, D16: 4 },
    directions: { value_led: 6, learning_outcome_led: 6 },
    contextualValueNote: null,
  },
  "2027-05": {
    termId: "term-2",
    weekCount: 4,
    activityCount: 12,
    primary: ["D2", "D3", "D4", "D16", "D19", "D20"],
    supporting: ["D6", "D11", "D14", "D15"],
    culturalBridges: [
      "aile-sila-i-rahim-komsuluk",
      "imece-yardimlasma",
      "vatan-kulturel-miras",
    ],
    roof: { D1: 4, D14: 4, D16: 4 },
    directions: { value_led: 6, learning_outcome_led: 6 },
    contextualValueNote: null,
  },
  "2027-06": {
    termId: "term-2",
    weekCount: 4,
    activityCount: 12,
    primary: ["D1", "D5", "D13", "D14", "D15", "D16"],
    supporting: ["D4", "D8", "D9", "D12"],
    culturalBridges: [
      "kul-hakki",
      "vatan-kulturel-miras",
      "yaratilmislara-dogaya-merhamet",
    ],
    roof: { D1: 4, D14: 4, D16: 4 },
    directions: { value_led: 6, learning_outcome_led: 6 },
    contextualValueNote: null,
  },
} satisfies Readonly<Record<AnnualValuesReleaseMonthKey, ExpectedMonthTarget>>);

const VALUE_CODE_SET = new Set<string>(VALUE_CODES);
const VALUE_CODE_ORDER = new Map<string, number>(
  VALUE_CODES.map((code, index) => [code, index]),
);
const CULTURAL_BRIDGE_ID_SET = new Set<string>(ANNUAL_VALUES_CULTURAL_BRIDGE_IDS);
const CULTURAL_BRIDGE_ID_ORDER = new Map<string, number>(
  ANNUAL_VALUES_CULTURAL_BRIDGE_IDS.map((id, index) => [id, index]),
);
const CONSTITUTION_CULTURAL_BRIDGE_BY_ID = new Map(
  VALUES_PEDAGOGY_CONSTITUTION.culturalBridges.map((bridge) => [bridge.id, bridge]),
);
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} nesne olmalıdır.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  const missing = expected.filter((key) => !Object.hasOwn(value, key));
  const unexpected = keys.filter((key) => !expected.includes(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${label} exact alan sözleşmesini bozuyor; eksik: ${missing.join(", ") || "yok"}, beklenmeyen: ${unexpected.join(", ") || "yok"}.`,
    );
  }
}

function assertNfcTree(value: unknown, path = "$", seen = new WeakSet<object>()): void {
  if (typeof value === "string") {
    if (value !== value.normalize("NFC")) {
      throw new Error(`${path} NFC-normalize metin taşımalıdır.`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) throw new Error(`${path} döngüsel veri içeremez.`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNfcTree(item, `${path}[${index}]`, seen));
    return;
  }
  const normalizedKeys = new Set<string>();
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.normalize("NFC");
    if (key !== normalizedKey || normalizedKeys.has(normalizedKey)) {
      throw new Error(`${path} NFC-normalize ve benzersiz alan adları taşımalıdır.`);
    }
    normalizedKeys.add(normalizedKey);
    assertNfcTree(item, `${path}.${key}`, seen);
  }
}

function requireLiteral<T extends string | number | boolean | null>(
  value: unknown,
  expected: T,
  label: string,
): T {
  if (value !== expected) throw new Error(`${label} exact ${String(expected)} olmalıdır.`);
  return expected;
}

function nonEmptyText(value: unknown, label: string, maximum = 1_000): string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(`${label} 1–${maximum} karakterlik metin olmalıdır.`);
  }
  return value;
}

function exactPositiveInteger(value: unknown, expected: number, label: string): number {
  if (!Number.isInteger(value) || value !== expected) {
    throw new Error(`${label} exact ${expected} olmalıdır.`);
  }
  return expected;
}

function minimumPositiveInteger(value: unknown, minimum: number, label: string): number {
  if (!Number.isInteger(value) || Number(value) < minimum) {
    throw new Error(`${label} en az ${minimum} olmalıdır.`);
  }
  return Number(value);
}

function requireExactHttpsUrl(value: unknown, expected: string, label: string): string {
  const parsed = nonEmptyText(value, label, 2_000);
  let url: URL;
  try {
    url = new URL(parsed);
  } catch {
    throw new Error(`${label} geçerli HTTPS URL olmalıdır.`);
  }
  if (url.protocol !== "https:" || parsed !== expected) {
    throw new Error(`${label} kanonik HTTPS URL ile exact eşleşmelidir.`);
  }
  return parsed;
}

function requireExactSha256(value: unknown, expected: string, label: string): `sha256:${string}` {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} küçük harfli exact SHA-256 özeti olmalıdır.`);
  }
  if (value !== expected) throw new Error(`${label} kanonik SHA-256 özetiyle eşleşmelidir.`);
  return value as `sha256:${string}`;
}

function parseValueCodeArray(
  value: unknown,
  label: string,
  minimumLength: number,
): ValueCode[] {
  if (!Array.isArray(value) || value.length < minimumLength || value.length > VALUE_CODES.length) {
    throw new Error(`${label} ${minimumLength}–${VALUE_CODES.length} değer kodu taşımalıdır.`);
  }
  if (value.some((code) => typeof code !== "string" || !VALUE_CODE_SET.has(code))) {
    throw new Error(`${label} yalnız D1–D20 kanonik değer kodlarını taşımalıdır.`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`${label} benzersiz değer kodları taşımalıdır.`);
  }
  const sorted = [...value].sort(
    (left, right) =>
      (VALUE_CODE_ORDER.get(String(left)) ?? Number.MAX_SAFE_INTEGER) -
      (VALUE_CODE_ORDER.get(String(right)) ?? Number.MAX_SAFE_INTEGER),
  );
  if (!value.every((code, index) => code === sorted[index])) {
    throw new Error(`${label} D1–D20 kanonik sırasında olmalıdır.`);
  }
  return value as ValueCode[];
}

function parseCulturalBridgeTargetIds(
  value: unknown,
  label: string,
  globalCandidateIds: ReadonlySet<string>,
  monthValueCodes: ReadonlySet<ValueCode>,
): AnnualValuesCulturalBridgeId[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > ANNUAL_VALUES_CULTURAL_BRIDGE_IDS.length) {
    throw new Error(
      `${label} 1–${ANNUAL_VALUES_CULTURAL_BRIDGE_IDS.length} kültürel köprü hedefi taşımalıdır.`,
    );
  }
  if (
    value.some(
      (bridgeId) =>
        typeof bridgeId !== "string" ||
        !CULTURAL_BRIDGE_ID_SET.has(bridgeId) ||
        !globalCandidateIds.has(bridgeId),
    )
  ) {
    throw new Error(
      `${label} yalnız anayasa kimliği taşıyan profile-level kanonik draft adaylarından seçilmelidir.`,
    );
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`${label} benzersiz kültürel köprü kimlikleri taşımalıdır.`);
  }
  const sorted = [...value].sort(
    (left, right) =>
      (CULTURAL_BRIDGE_ID_ORDER.get(String(left)) ?? Number.MAX_SAFE_INTEGER) -
      (CULTURAL_BRIDGE_ID_ORDER.get(String(right)) ?? Number.MAX_SAFE_INTEGER),
  );
  if (!value.every((bridgeId, index) => bridgeId === sorted[index])) {
    throw new Error(`${label} kanonik kültürel köprü sırasında olmalıdır.`);
  }
  for (const bridgeId of value as AnnualValuesCulturalBridgeId[]) {
    const bridge = CONSTITUTION_CULTURAL_BRIDGE_BY_ID.get(bridgeId);
    if (!bridge) {
      throw new Error(`${label} anayasa kültürel köprü kataloğunda bulunmayan kimlik taşıyor.`);
    }
    if (!bridge.valueCodes.some((code) => monthValueCodes.has(code))) {
      throw new Error(
        `${label} içindeki ${bridgeId}, ayın primary+support değerlerinden en az biriyle anayasa üzerinden bağlantılı olmalıdır.`,
      );
    }
  }
  return value as AnnualValuesCulturalBridgeId[];
}

function requireStringArrayExact(
  value: unknown,
  expected: readonly string[],
  label: string,
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} metin dizisi olmalıdır.`);
  }
  if (
    value.length !== expected.length ||
    value.some((item, index) => item !== expected[index])
  ) {
    throw new Error(`${label} kanonik sıra ve içerikle exact eşleşmelidir.`);
  }
  return [...value];
}

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function parseRoofTargets(
  value: unknown,
  expectedEach: number | null,
  label: string,
): RoofValueActivityTargets {
  const item = record(value, label);
  exactKeys(item, ["D1", "D14", "D16"], label);
  const parsed = {
    D1: minimumPositiveInteger(item.D1, 0, `${label} D1`),
    D14: minimumPositiveInteger(item.D14, 0, `${label} D14`),
    D16: minimumPositiveInteger(item.D16, 0, `${label} D16`),
  };
  if (
    expectedEach !== null &&
    (parsed.D1 !== expectedEach || parsed.D14 !== expectedEach || parsed.D16 !== expectedEach)
  ) {
    throw new Error(`${label} D1/D14/D16 için exact ${expectedEach}/${expectedEach}/${expectedEach} olmalıdır.`);
  }
  return parsed;
}

function parseDirectionTargets(
  value: unknown,
  expectedEach: number | null,
  label: string,
): DesignDirectionActivityTargets {
  const item = record(value, label);
  exactKeys(item, ["value_led", "learning_outcome_led"], label);
  const parsed = {
    value_led: minimumPositiveInteger(item.value_led, 0, `${label} value_led`),
    learning_outcome_led: minimumPositiveInteger(
      item.learning_outcome_led,
      0,
      `${label} learning_outcome_led`,
    ),
  };
  if (
    expectedEach !== null &&
    (parsed.value_led !== expectedEach || parsed.learning_outcome_led !== expectedEach)
  ) {
    throw new Error(`${label} exact ${expectedEach}/${expectedEach} olmalıdır.`);
  }
  return parsed;
}

function parseProgramProfile(value: unknown): AnnualValuesReleaseProgramProfile {
  const label = "Yıllık yayın program profili";
  const item = record(value, label);
  exactKeys(
    item,
    [
      "program",
      "ageProfile",
      "constitutionId",
      "constitutionVersion",
      "constitutionSchemaVersion",
      "frameworkSourceUrl",
      "sourceCheckedOn",
      "officialActionCatalogId",
      "officialActionCatalogSourceVersion",
      "officialActionCatalogSourceUrl",
      "officialActionCatalogSourceSha256",
    ],
    label,
  );
  const constitution = VALUES_PEDAGOGY_CONSTITUTION;
  const catalog = constitution.canonicalSource.preschoolActionSource;
  return {
    program: requireLiteral(item.program, "tymm_2024", `${label} programı`),
    ageProfile: requireLiteral(item.ageProfile, "60-72", `${label} yaş profili`),
    constitutionId: requireLiteral(
      item.constitutionId,
      constitution.constitutionId,
      `${label} anayasa kimliği`,
    ),
    constitutionVersion: requireLiteral(
      item.constitutionVersion,
      constitution.version,
      `${label} anayasa sürümü`,
    ),
    constitutionSchemaVersion: requireLiteral(
      item.constitutionSchemaVersion,
      constitution.schemaVersion,
      `${label} anayasa şema sürümü`,
    ),
    frameworkSourceUrl: requireExactHttpsUrl(
      item.frameworkSourceUrl,
      constitution.canonicalSource.sourceUrl,
      `${label} çerçeve kaynak URL'si`,
    ),
    sourceCheckedOn: requireLiteral(
      item.sourceCheckedOn,
      constitution.canonicalSource.sourceCheckedOn,
      `${label} kaynak kontrol tarihi`,
    ),
    officialActionCatalogId: requireLiteral(
      item.officialActionCatalogId,
      catalog.catalogId,
      `${label} Ek-14 katalog kimliği`,
    ),
    officialActionCatalogSourceVersion: requireLiteral(
      item.officialActionCatalogSourceVersion,
      catalog.sourceVersion,
      `${label} Ek-14 kaynak sürümü`,
    ),
    officialActionCatalogSourceUrl: requireExactHttpsUrl(
      item.officialActionCatalogSourceUrl,
      catalog.sourceUrl,
      `${label} Ek-14 kaynak URL'si`,
    ),
    officialActionCatalogSourceSha256: requireExactSha256(
      item.officialActionCatalogSourceSha256,
      catalog.sourceSha256,
      `${label} Ek-14 kaynak özeti`,
    ),
  };
}

function parseReleaseReference(value: unknown): AnnualValuesReleaseReference {
  const label = "Eylül exact v3 yayın referansı";
  const item = record(value, label);
  exactKeys(
    item,
    [
      "contentPackId",
      "contentPackVersion",
      "contentReleaseId",
      "manifestDigest",
      "valuesMappingStatus",
    ],
    label,
  );
  return {
    contentPackId: requireLiteral(
      item.contentPackId,
      PREMIUM_VALUES_V3_RELEASE_IDENTITY.id,
      `${label} paket kimliği`,
    ),
    contentPackVersion: requireLiteral(
      item.contentPackVersion,
      PREMIUM_VALUES_V3_RELEASE_IDENTITY.version,
      `${label} paket sürümü`,
    ),
    contentReleaseId: requireLiteral(
      item.contentReleaseId,
      PREMIUM_VALUES_V3_RELEASE_IDENTITY.contentReleaseId,
      `${label} içerik sürüm kimliği`,
    ),
    manifestDigest: requireExactSha256(
      item.manifestDigest,
      PREMIUM_VALUES_V3_RELEASE_IDENTITY.manifestDigest,
      `${label} manifest özeti`,
    ),
    valuesMappingStatus: requireLiteral(
      item.valuesMappingStatus,
      PREMIUM_VALUES_V3_RELEASE_IDENTITY.valuesMappingStatus,
      `${label} değer eşleme durumu`,
    ),
  };
}

function parseTerm(value: unknown, index: number): AnnualValuesReleaseTerm {
  const label = `Yıllık yayın dönemi[${index}]`;
  const item = record(value, label);
  exactKeys(
    item,
    [
      "id",
      "monthKeys",
      "primaryValueCoverageTargetCodes",
      "weekCount",
      "activityCount",
      "roofValueActivityTargets",
      "designDirectionActivityTargets",
    ],
    label,
  );
  const id = index === 0 ? "term-1" : "term-2";
  const expectedMonthKeys = ANNUAL_VALUES_RELEASE_MONTH_KEYS.slice(index * 5, index * 5 + 5);
  const monthKeys = requireStringArrayExact(item.monthKeys, expectedMonthKeys, `${label} ayları`);
  const primaryCoverage = parseValueCodeArray(
    item.primaryValueCoverageTargetCodes,
    `${label} ana değer kapsam hedefi`,
    VALUE_CODES.length,
  );
  if (!sameArray(primaryCoverage, VALUE_CODES)) {
    throw new Error(`${label} ana değer kapsam hedefi exact D1–D20 olmalıdır.`);
  }
  return {
    id: requireLiteral(item.id, id, `${label} kimliği`),
    monthKeys: monthKeys as AnnualValuesReleaseMonthKey[],
    primaryValueCoverageTargetCodes: primaryCoverage,
    weekCount: exactPositiveInteger(item.weekCount, 18, `${label} hafta sayısı`) as 18,
    activityCount: exactPositiveInteger(item.activityCount, 54, `${label} etkinlik sayısı`) as 54,
    roofValueActivityTargets: parseRoofTargets(
      item.roofValueActivityTargets,
      18,
      `${label} çatı değer hedefleri`,
    ),
    designDirectionActivityTargets: parseDirectionTargets(
      item.designDirectionActivityTargets,
      27,
      `${label} tasarım yönü hedefleri`,
    ),
  };
}

function parseMonth(
  value: unknown,
  index: number,
  globalCulturalCandidateIds: ReadonlySet<string>,
): AnnualValuesReleaseMonth {
  const expectedMonthKey = ANNUAL_VALUES_RELEASE_MONTH_KEYS[index];
  const label = `Yıllık yayın ayı[${index}]`;
  const item = record(value, label);
  exactKeys(
    item,
    [
      "monthKey",
      "termId",
      "state",
      "weekCount",
      "activityCount",
      "primaryValueTargetCodes",
      "supportingValueTargetCodes",
      "culturalBridgeTargetIds",
      "roofValueActivityTargets",
      "designDirectionActivityTargets",
      "contextualValueNote",
      "releaseReference",
    ],
    label,
  );
  const monthKey = requireLiteral(item.monthKey, expectedMonthKey, `${label} anahtarı`);
  const expectedTermId: AnnualValuesReleaseTermId = index < 5 ? "term-1" : "term-2";
  const weekCount = minimumPositiveInteger(item.weekCount, 1, `${label} hafta sayısı`);
  const activityCount = minimumPositiveInteger(item.activityCount, 1, `${label} etkinlik sayısı`);
  if (!((weekCount === 4 && activityCount === 12) || (weekCount === 3 && activityCount === 9))) {
    throw new Error(`${label} yalnız 4 hafta/12 etkinlik veya 3 hafta/9 etkinlik taşımalıdır.`);
  }
  const primaryValueTargetCodes = parseValueCodeArray(
    item.primaryValueTargetCodes,
    `${label} ana değer hedefleri`,
    4,
  );
  const supportingValueTargetCodes = parseValueCodeArray(
    item.supportingValueTargetCodes,
    `${label} destek değer hedefleri`,
    0,
  );
  const monthValueCodes = new Set<ValueCode>([
    ...primaryValueTargetCodes,
    ...supportingValueTargetCodes,
  ]);
  const culturalBridgeTargetIds = parseCulturalBridgeTargetIds(
    item.culturalBridgeTargetIds,
    `${label} kültürel köprü hedefleri`,
    globalCulturalCandidateIds,
    monthValueCodes,
  );
  const roofValueActivityTargets = parseRoofTargets(
    item.roofValueActivityTargets,
    null,
    `${label} çatı değer hedefleri`,
  );
  if (
    roofValueActivityTargets.D1 +
      roofValueActivityTargets.D14 +
      roofValueActivityTargets.D16 !==
    activityCount
  ) {
    throw new Error(`${label} her etkinliği exact bir çatı değer hedefiyle saymalıdır.`);
  }
  const designDirectionActivityTargets = parseDirectionTargets(
    item.designDirectionActivityTargets,
    null,
    `${label} tasarım yönü hedefleri`,
  );
  if (
    designDirectionActivityTargets.value_led +
      designDirectionActivityTargets.learning_outcome_led !==
    activityCount
  ) {
    throw new Error(`${label} tasarım yönü hedefleri etkinlik sayısını exact karşılamalıdır.`);
  }
  const contextualValueNote = item.contextualValueNote === null
    ? null
    : nonEmptyText(item.contextualValueNote, `${label} bağlamsal değer notu`, 500);
  let releaseReference: AnnualValuesReleaseReference | null;
  let state: AnnualValuesReleaseMonthState;
  if (index === 0) {
    state = requireLiteral(
      item.state,
      "machine_validated_pending_human_review",
      `${label} durumu`,
    );
    releaseReference = parseReleaseReference(item.releaseReference);
  } else {
    state = requireLiteral(item.state, "planned", `${label} durumu`);
    if (item.releaseReference !== null) {
      throw new Error(`${label} henüz gerçek artefaktı olmadığı için releaseReference null kalmalıdır.`);
    }
    releaseReference = null;
  }
  return {
    monthKey,
    termId: requireLiteral(item.termId, expectedTermId, `${label} dönem kimliği`),
    state,
    weekCount: weekCount as 3 | 4,
    activityCount: activityCount as 9 | 12,
    primaryValueTargetCodes,
    supportingValueTargetCodes,
    culturalBridgeTargetIds,
    roofValueActivityTargets,
    designDirectionActivityTargets,
    contextualValueNote,
    releaseReference,
  };
}

function parseAnnualTargets(value: unknown): AuthoredAnnualValuesReleaseProfile["annualTargets"] {
  const label = "Yıllık toplam hedefler";
  const item = record(value, label);
  exactKeys(
    item,
    ["weekCount", "activityCount", "roofValueActivityTargets", "designDirectionActivityTargets"],
    label,
  );
  return {
    weekCount: exactPositiveInteger(item.weekCount, 36, `${label} hafta sayısı`) as 36,
    activityCount: exactPositiveInteger(item.activityCount, 108, `${label} etkinlik sayısı`) as 108,
    roofValueActivityTargets: parseRoofTargets(
      item.roofValueActivityTargets,
      36,
      `${label} çatı değerleri`,
    ),
    designDirectionActivityTargets: parseDirectionTargets(
      item.designDirectionActivityTargets,
      54,
      `${label} tasarım yönleri`,
    ),
  };
}

function parseCulturalCandidates(value: unknown): AnnualCulturalCandidate[] {
  const label = "Yıllık kültürel köprü adayları";
  if (!Array.isArray(value)) throw new Error(`${label} dizi olmalıdır.`);
  const constitutionIds = VALUES_PEDAGOGY_CONSTITUTION.culturalBridges.map(
    (bridge) => bridge.id,
  );
  if (!sameArray(constitutionIds, ANNUAL_VALUES_CULTURAL_BRIDGE_IDS)) {
    throw new Error(
      `${label} kanonik sıra ile anayasa culturalBridgeId sırası exact eşleşmelidir.`,
    );
  }
  const expectedIds = ANNUAL_VALUES_CULTURAL_BRIDGE_IDS;
  if (value.length !== expectedIds.length) {
    throw new Error(`${label} anayasanın exact kültürel köprü kimliği kümesini taşımalıdır.`);
  }
  const parsed = value.map((candidate, index) => {
    const candidateLabel = `${label}[${index}]`;
    const item = record(candidate, candidateLabel);
    exactKeys(
      item,
      ["culturalBridgeId", "provenanceStatus", "reviewDecisionId", "humanReviewRequired"],
      candidateLabel,
    );
    return {
      culturalBridgeId: requireLiteral(
        item.culturalBridgeId,
        expectedIds[index],
        `${candidateLabel} anayasa köprü kimliği`,
      ),
      provenanceStatus: requireLiteral(
        item.provenanceStatus,
        "draft",
        `${candidateLabel} provenans durumu`,
      ),
      reviewDecisionId: requireLiteral(
        item.reviewDecisionId,
        null,
        `${candidateLabel} insan inceleme kararı`,
      ),
      humanReviewRequired: requireLiteral(
        item.humanReviewRequired,
        true,
        `${candidateLabel} insan inceleme zorunluluğu`,
      ),
    };
  });
  if (new Set(parsed.map((candidate) => candidate.culturalBridgeId)).size !== parsed.length) {
    throw new Error(`${label} benzersiz anayasa köprü kimlikleri taşımalıdır.`);
  }
  return parsed;
}

function parseReviewPolicy(value: unknown): AnnualValuesReviewPolicy {
  const label = "Yıllık altı rollü inceleme politikası";
  const item = record(value, label);
  exactKeys(item, ["status", "requiredRoles", "publicationEligible"], label);
  const requiredRoles = requireStringArrayExact(
    item.requiredRoles,
    HUMAN_REVIEW_ROLES,
    `${label} rolleri`,
  ) as ValuesReviewRole[];
  return {
    status: requireLiteral(item.status, "pending", `${label} durumu`),
    requiredRoles,
    publicationEligible: requireLiteral(
      item.publicationEligible,
      false,
      `${label} yayın uygunluğu`,
    ),
  };
}

function parsePedagogicalLensBoundaries(
  value: unknown,
): AuthoredAnnualValuesReleaseProfile["pedagogicalLensBoundaries"] {
  const label = "Yıllık pedagojik lens sınırları";
  const item = record(value, label);
  exactKeys(item, ["natureBasedContinuity", "preparedEnvironment"], label);

  const natureLabel = `${label} doğa sürekliliği`;
  const nature = record(item.natureBasedContinuity, natureLabel);
  exactKeys(
    nature,
    [
      "claimLevel",
      "governingStandard",
      "minimumDurationWeeks",
      "minimumPlannedSessions",
      "recognitionClaimed",
      "certificationClaimed",
      "qualifiedPracticeBoundary",
    ],
    natureLabel,
  );
  const natureBasedContinuity: AnnualNatureBasedContinuityBoundary = {
    claimLevel: requireLiteral(
      nature.claimLevel,
      "nature_based_continuity",
      `${natureLabel} iddia düzeyi`,
    ),
    governingStandard: requireExactHttpsUrl(
      nature.governingStandard,
      FOREST_SCHOOL_ASSOCIATION_GOOD_PRACTICE_URL,
      `${natureLabel} yönetişim standardı`,
    ),
    minimumDurationWeeks: minimumPositiveInteger(
      nature.minimumDurationWeeks,
      24,
      `${natureLabel} asgari süresi`,
    ),
    minimumPlannedSessions: minimumPositiveInteger(
      nature.minimumPlannedSessions,
      12,
      `${natureLabel} asgari oturum sayısı`,
    ),
    recognitionClaimed: requireLiteral(
      nature.recognitionClaimed,
      false,
      `${natureLabel} tanınma iddiası`,
    ),
    certificationClaimed: requireLiteral(
      nature.certificationClaimed,
      false,
      `${natureLabel} sertifika iddiası`,
    ),
    qualifiedPracticeBoundary: requireLiteral(
      nature.qualifiedPracticeBoundary,
      FOREST_SCHOOL_NATURE_CONTINUITY_BOUNDARY,
      `${natureLabel} nitelikli uygulama sınırı`,
    ),
  };

  const preparedLabel = `${label} hazırlanmış çevre`;
  const prepared = record(item.preparedEnvironment, preparedLabel);
  exactKeys(
    prepared,
    ["claimLevel", "certificationClaimed", "certificationBoundary"],
    preparedLabel,
  );
  const preparedEnvironment: AnnualPreparedEnvironmentBoundary = {
    claimLevel: requireLiteral(
      prepared.claimLevel,
      "montessori_inspired",
      `${preparedLabel} iddia düzeyi`,
    ),
    certificationClaimed: requireLiteral(
      prepared.certificationClaimed,
      false,
      `${preparedLabel} sertifika iddiası`,
    ),
    certificationBoundary: requireLiteral(
      prepared.certificationBoundary,
      PREPARED_ENVIRONMENT_CERTIFICATION_BOUNDARY,
      `${preparedLabel} sertifika sınırı`,
    ),
  };
  return { natureBasedContinuity, preparedEnvironment };
}

function sumRoofTargets(months: readonly AnnualValuesReleaseMonth[]): RoofValueActivityTargets {
  return months.reduce(
    (sum, month) => ({
      D1: sum.D1 + month.roofValueActivityTargets.D1,
      D14: sum.D14 + month.roofValueActivityTargets.D14,
      D16: sum.D16 + month.roofValueActivityTargets.D16,
    }),
    { D1: 0, D14: 0, D16: 0 },
  );
}

function sumDirectionTargets(
  months: readonly AnnualValuesReleaseMonth[],
): DesignDirectionActivityTargets {
  return months.reduce(
    (sum, month) => ({
      value_led: sum.value_led + month.designDirectionActivityTargets.value_led,
      learning_outcome_led:
        sum.learning_outcome_led + month.designDirectionActivityTargets.learning_outcome_led,
    }),
    { value_led: 0, learning_outcome_led: 0 },
  );
}

function assertAggregateTargets(
  terms: readonly AnnualValuesReleaseTerm[],
  months: readonly AnnualValuesReleaseMonth[],
  annualTargets: AuthoredAnnualValuesReleaseProfile["annualTargets"],
): void {
  for (const term of terms) {
    const termMonths = months.filter((month) => month.termId === term.id);
    if (!sameArray(termMonths.map((month) => month.monthKey), term.monthKeys)) {
      throw new Error(`${term.id} ay penceresi yıllık aylarla exact eşleşmelidir.`);
    }
    const weekCount = termMonths.reduce((sum, month) => sum + month.weekCount, 0);
    const activityCount = termMonths.reduce((sum, month) => sum + month.activityCount, 0);
    if (weekCount !== 18 || activityCount !== 54) {
      throw new Error(`${term.id} exact 18 hafta ve 54 etkinlik hedefi taşımalıdır.`);
    }

    // Dönem kapısında yalnız primaryValueTargetCodes sayılır. Destek değerleri
    // eksik bir ana değeri varmış gibi gösteremez.
    const primaryUnion = [...new Set(termMonths.flatMap((month) => month.primaryValueTargetCodes))]
      .sort(
        (left, right) =>
          (VALUE_CODE_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER) -
          (VALUE_CODE_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER),
      );
    if (!sameArray(primaryUnion, VALUE_CODES)) {
      const missing = VALUE_CODES.filter((code) => !primaryUnion.includes(code));
      throw new Error(
        `${term.id} ana değer union'ı exact D1–D20 olmalıdır; destek değerleri kapsam sayılmaz. Eksik: ${missing.join(", ") || "yok"}.`,
      );
    }
    const roof = sumRoofTargets(termMonths);
    if (roof.D1 !== 18 || roof.D14 !== 18 || roof.D16 !== 18) {
      throw new Error(`${term.id} çatı değer dengesi exact 18/18/18 olmalıdır.`);
    }
    const directions = sumDirectionTargets(termMonths);
    if (directions.value_led !== 27 || directions.learning_outcome_led !== 27) {
      throw new Error(`${term.id} tasarım yönü dengesi exact 27/27 olmalıdır.`);
    }
  }

  const totalWeeks = months.reduce((sum, month) => sum + month.weekCount, 0);
  const totalActivities = months.reduce((sum, month) => sum + month.activityCount, 0);
  if (
    totalWeeks !== annualTargets.weekCount ||
    totalActivities !== annualTargets.activityCount ||
    totalWeeks !== 36 ||
    totalActivities !== 108
  ) {
    throw new Error("Yıllık hedef exact 36 hafta ve 108 etkinlik olmalıdır.");
  }
  const annualRoof = sumRoofTargets(months);
  if (annualRoof.D1 !== 36 || annualRoof.D14 !== 36 || annualRoof.D16 !== 36) {
    throw new Error("Yıllık çatı değer dengesi exact 36/36/36 olmalıdır.");
  }
  const annualDirections = sumDirectionTargets(months);
  if (annualDirections.value_led !== 54 || annualDirections.learning_outcome_led !== 54) {
    throw new Error("Yıllık tasarım yönü dengesi exact 54/54 olmalıdır.");
  }
}

function assertCanonicalMonthMatrix(months: readonly AnnualValuesReleaseMonth[]): void {
  for (const month of months) {
    const expected = EXPECTED_MONTH_TARGETS[month.monthKey];
    if (
      month.termId !== expected.termId ||
      month.weekCount !== expected.weekCount ||
      month.activityCount !== expected.activityCount ||
      !sameArray(month.primaryValueTargetCodes, expected.primary) ||
      !sameArray(month.supportingValueTargetCodes, expected.supporting) ||
      !sameArray(month.culturalBridgeTargetIds, expected.culturalBridges) ||
      month.roofValueActivityTargets.D1 !== expected.roof.D1 ||
      month.roofValueActivityTargets.D14 !== expected.roof.D14 ||
      month.roofValueActivityTargets.D16 !== expected.roof.D16 ||
      month.designDirectionActivityTargets.value_led !== expected.directions.value_led ||
      month.designDirectionActivityTargets.learning_outcome_led !==
        expected.directions.learning_outcome_led ||
      month.contextualValueNote !== expected.contextualValueNote
    ) {
      throw new Error(`${month.monthKey} authored değer matrisi kanonik v1 hedefiyle exact eşleşmelidir.`);
    }
  }
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value as Readonly<T>;
}

/**
 * Yalnız authored yıllık hedef profilini doğrular. Bu sözleşme bir
 * release-set manifesti, insan kabul defteri veya öğretmen onayı üretmez.
 */
export function parseAuthoredAnnualValuesReleaseProfile(
  value: unknown,
): AuthoredAnnualValuesReleaseProfile {
  assertNfcTree(value);
  const label = "Authored yıllık değerler release profili";
  const item = record(value, label);
  exactKeys(
    item,
    [
      "schemaVersion",
      "profileType",
      "profileId",
      "sku",
      "academicRelease",
      "programProfile",
      "terms",
      "months",
      "annualTargets",
      "culturalCandidates",
      "reviewPolicy",
      "pedagogicalLensBoundaries",
    ],
    label,
  );
  if (!Array.isArray(item.terms) || item.terms.length !== 2) {
    throw new Error(`${label} exact iki dönem taşımalıdır.`);
  }
  if (!Array.isArray(item.months) || item.months.length !== 10) {
    throw new Error(`${label} exact on sıralı ay taşımalıdır.`);
  }
  const terms = item.terms.map(parseTerm);
  const culturalCandidates = parseCulturalCandidates(item.culturalCandidates);
  const globalCulturalCandidateIds = new Set(
    culturalCandidates.map((candidate) => candidate.culturalBridgeId),
  );
  const months = item.months.map((month, index) =>
    parseMonth(month, index, globalCulturalCandidateIds),
  );
  if (new Set(terms.map((term) => term.id)).size !== terms.length) {
    throw new Error(`${label} dönem kimlikleri benzersiz olmalıdır.`);
  }
  if (new Set(months.map((month) => month.monthKey)).size !== months.length) {
    throw new Error(`${label} ay anahtarları benzersiz olmalıdır.`);
  }
  const annualTargets = parseAnnualTargets(item.annualTargets);
  assertAggregateTargets(terms, months, annualTargets);
  assertCanonicalMonthMatrix(months);

  const parsed: AuthoredAnnualValuesReleaseProfile = {
    schemaVersion: requireLiteral(item.schemaVersion, 1, `${label} şema sürümü`),
    profileType: requireLiteral(
      item.profileType,
      "authored_annual_values_release_profile",
      `${label} türü`,
    ),
    profileId: requireLiteral(
      item.profileId,
      "tymm-6072-2026-2027-annual-values-release-profile-v1",
      `${label} kimliği`,
    ),
    sku: requireLiteral(item.sku, "TYMM-6072", `${label} SKU'su`),
    academicRelease: requireLiteral(
      item.academicRelease,
      "2026-2027",
      `${label} akademik yayını`,
    ),
    programProfile: parseProgramProfile(item.programProfile),
    terms,
    months,
    annualTargets,
    culturalCandidates,
    reviewPolicy: parseReviewPolicy(item.reviewPolicy),
    pedagogicalLensBoundaries: parsePedagogicalLensBoundaries(
      item.pedagogicalLensBoundaries,
    ),
  };
  return deepFreeze(parsed) as AuthoredAnnualValuesReleaseProfile;
}
