import rawConstitution from "./values-pedagogy-constitution.v1.json" with { type: "json" };

export const VALUE_CODES = Object.freeze([
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
  "D7",
  "D8",
  "D9",
  "D10",
  "D11",
  "D12",
  "D13",
  "D14",
  "D15",
  "D16",
  "D17",
  "D18",
  "D19",
  "D20",
] as const);

export type ValueCode = (typeof VALUE_CODES)[number];

export const ROOF_VALUE_CODES = Object.freeze(["D1", "D14", "D16"] as const);
export type RoofValueCode = (typeof ROOF_VALUE_CODES)[number];

export const VALUE_DOMAIN_IDS = Object.freeze([
  "roof",
  "human",
  "family-and-social-environment",
  "physical-environment",
] as const);
export type ValueDomainId = (typeof VALUE_DOMAIN_IDS)[number];

export interface ValuesCanonicalSource {
  readonly framework: string;
  readonly publisher: string;
  readonly sourceUrl: string;
  readonly sourceCheckedOn: string;
  readonly preschoolActionSource: PreschoolActionSource;
  readonly officialFields: readonly string[];
  readonly pedagogicalAdaptationFields: readonly string[];
}

export interface PreschoolActionSource {
  readonly catalogId: "meb-tymm-okul-oncesi-2024-ede-ek14";
  readonly sourceVersion: string;
  readonly sourceUrl: string;
  readonly sourceSha256: `sha256:${string}`;
  readonly pageNumbering: "pdf-page-label-and-viewer-1-based";
  readonly sourcePageRange: readonly [324, 332];
}

export interface ValueDomainDefinition {
  readonly id: ValueDomainId;
  readonly officialLabel: string;
  readonly expectedValueCount: number;
}

export interface ValueDefinition {
  readonly code: ValueCode;
  readonly officialName: string;
  readonly domain: ValueDomainId;
  readonly roofValue: boolean;
  readonly pedagogicalPurpose: string;
  /** Bu eylemler resmî Ek-14 metni değil, MaarifOS okul öncesi uyarlamasıdır. */
  readonly observableActionsStatus: "maarifos_preschool_adaptation";
  readonly observablePreschoolActions: readonly string[];
  readonly guardrails: readonly string[];
  readonly roofLinks: readonly RoofValueCode[];
}

export interface CulturalBridgeDefinition {
  readonly id: string;
  readonly name: string;
  readonly officialTymmValue: false;
  readonly status: "Turkish-Islamic-cultural-pedagogical-bridge";
  readonly pedagogicalBridge: string;
  readonly valueCodes: readonly ValueCode[];
}

export interface ValuesSafetyRule {
  readonly id: string;
  readonly rule: string;
  readonly enforcement: "hard-stop";
}

export const HUMAN_REVIEW_ROLES = Object.freeze([
  "early-childhood-education",
  "practicing-preschool-teacher",
  "child-rights-and-safeguarding",
  "tymm-curriculum",
  "content-and-language-editor",
  "turkish-islamic-culture-and-theology",
] as const);

export type ValuesReviewRole = (typeof HUMAN_REVIEW_ROLES)[number];

export interface ValuesGovernanceApproval {
  readonly role: ValuesReviewRole;
  readonly status: "pending";
}

export interface ValuesGovernance {
  readonly publicationStatus: "draft-pending-human-review";
  readonly effectiveOn: null;
  readonly collectiveAuthor: string;
  readonly changeSummary: string;
  readonly requiredReviewRoles: readonly ValuesReviewRole[];
  readonly approvals: readonly ValuesGovernanceApproval[];
}

export interface ActivityValueCardinality {
  readonly exactly: 1;
}

export interface ActivityRoofAnchorCardinality extends ActivityValueCardinality {
  readonly allowedCodes: readonly RoofValueCode[];
}

export interface ActivitySupportingValueCardinality {
  readonly minimum: 0;
  readonly maximum: 2;
  readonly mustBeDistinct: true;
  readonly mustExcludePrimary: true;
}

export interface OfficialActionSnapshotContract {
  readonly required: true;
  readonly immutable: true;
  readonly requiredFields: readonly string[];
}

export interface PedagogicalPlanningField {
  readonly id: string;
  readonly label: string;
  readonly required: boolean;
}

export interface RoofValueChecksContract {
  readonly required: true;
  readonly requiredFields: readonly ["respect", "responsibility", "justice"];
}

export interface ValueCoverageContract {
  readonly minimumDistinctValuesPerMonth: 4;
  readonly requiredValueCodesPerTerm: readonly ValueCode[];
}

export interface ActivityValuePlanningContract {
  readonly schemaVersion: 1;
  readonly primaryValue: ActivityValueCardinality;
  readonly roofAnchor: ActivityRoofAnchorCardinality;
  readonly roofValueChecks: RoofValueChecksContract;
  readonly supportingValues: ActivitySupportingValueCardinality;
  readonly officialActionSnapshot: OfficialActionSnapshotContract;
  readonly pedagogicalFields: readonly PedagogicalPlanningField[];
  readonly coverage: ValueCoverageContract;
}

export interface ValuesPedagogyConstitution {
  readonly schemaVersion: 1;
  readonly constitutionId: "maarifos-values-pedagogy-constitution";
  readonly version: string;
  readonly title: string;
  readonly governance: ValuesGovernance;
  readonly canonicalSource: ValuesCanonicalSource;
  readonly centerPillars: readonly RoofValueCode[];
  readonly domains: readonly ValueDomainDefinition[];
  readonly values: readonly ValueDefinition[];
  readonly culturalBridges: readonly CulturalBridgeDefinition[];
  readonly safetyRules: readonly ValuesSafetyRule[];
  readonly activityPlanningContract: ActivityValuePlanningContract;
}

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export type ImmutableValuesPedagogyConstitution = DeepReadonly<ValuesPedagogyConstitution>;
export type ImmutableValueDefinition = DeepReadonly<ValueDefinition>;

const OFFICIAL_VALUE_NAMES: Readonly<Record<ValueCode, string>> = Object.freeze({
  D1: "Adalet",
  D2: "Aile Bütünlüğü",
  D3: "Çalışkanlık",
  D4: "Dostluk",
  D5: "Duyarlılık",
  D6: "Dürüstlük",
  D7: "Estetik",
  D8: "Mahremiyet",
  D9: "Merhamet",
  D10: "Mütevazılık",
  D11: "Özgürlük",
  D12: "Sabır",
  D13: "Sağlıklı Yaşam",
  D14: "Saygı",
  D15: "Sevgi",
  D16: "Sorumluluk",
  D17: "Tasarruf",
  D18: "Temizlik",
  D19: "Vatanseverlik",
  D20: "Yardımseverlik",
});

const OFFICIAL_DOMAIN_BY_CODE: Readonly<Record<ValueCode, ValueDomainId>> = Object.freeze({
  D1: "roof",
  D2: "family-and-social-environment",
  D3: "human",
  D4: "family-and-social-environment",
  D5: "physical-environment",
  D6: "family-and-social-environment",
  D7: "physical-environment",
  D8: "human",
  D9: "physical-environment",
  D10: "human",
  D11: "family-and-social-environment",
  D12: "human",
  D13: "human",
  D14: "roof",
  D15: "family-and-social-environment",
  D16: "roof",
  D17: "human",
  D18: "physical-environment",
  D19: "family-and-social-environment",
  D20: "family-and-social-environment",
});

const EXPECTED_DOMAIN_COUNTS: Readonly<Record<ValueDomainId, number>> = Object.freeze({
  roof: 3,
  human: 6,
  "family-and-social-environment": 7,
  "physical-environment": 4,
});

const REQUIRED_CULTURAL_BRIDGE_IDS = Object.freeze([
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

const REQUIRED_SAFETY_RULE_IDS = Object.freeze([
  "belief-is-not-assessed",
  "no-coercion-fear-shame-or-sectarian-superiority",
  "privacy-and-help-seeking-are-protected",
  "respect-is-not-blind-obedience",
  "family-unity-never-conceals-harm",
  "patriotism-never-demeans-other-peoples",
] as const);

const REQUIRED_ACTION_SNAPSHOT_FIELDS = Object.freeze([
  "valueCode",
  "actionCode",
  "actionName",
  "indicatorCode",
  "indicatorText",
  "catalogId",
  "sourceVersion",
  "sourceUrl",
  "sourceSha256",
  "sourcePage",
] as const);

const REQUIRED_PEDAGOGICAL_FIELD_IDS = Object.freeze([
  "dilemma",
  "observableAction",
  "adultModel",
  "childAgency",
  "repair",
  "familyConnection",
  "natureConnection",
  "evidence",
  "reflection",
] as const);

const OPTIONAL_ACTIVITY_PEDAGOGICAL_FIELD_IDS = Object.freeze([
  "familyConnection",
  "natureConnection",
] as const);

const REQUIRED_ROOF_CHECK_FIELDS = Object.freeze([
  "respect",
  "responsibility",
  "justice",
] as const);

function recordValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} nesne olmalıdır.`);
  }
  return value as Record<string, unknown>;
}

function exactRecord(
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  const item = recordValue(value, label);
  const missing = keys.filter((key) => !(key in item));
  const unexpected = Object.keys(item).filter((key) => !keys.includes(key));
  if (missing.length > 0 || unexpected.length > 0) {
    const details = [
      missing.length > 0 ? `eksik: ${missing.join(", ")}` : "",
      unexpected.length > 0 ? `beklenmeyen: ${unexpected.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("; ");
    throw new Error(`${label} alan sözleşmesine uymuyor (${details}).`);
  }
  return item;
}

function nonEmptyText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
    throw new Error(`${label} kırpılmış ve boş olmayan metin olmalıdır.`);
  }
  return value;
}

function literalText<const Literal extends string>(
  value: unknown,
  expected: Literal,
  label: string,
): Literal {
  if (value !== expected) throw new Error(`${label} yalnız "${expected}" olabilir.`);
  return expected;
}

function exactInteger<const Expected extends number>(
  value: unknown,
  expected: Expected,
  label: string,
): Expected {
  if (value !== expected) throw new Error(`${label} ${expected} olmalıdır.`);
  return expected;
}

function exactBoolean<const Expected extends boolean>(
  value: unknown,
  expected: Expected,
  label: string,
): Expected {
  if (value !== expected) throw new Error(`${label} ${String(expected)} olmalıdır.`);
  return expected;
}

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${label} pozitif tam sayı olmalıdır.`);
  }
  return value;
}

function uniqueStrings(value: unknown, label: string, minimum = 0): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} dizi olmalıdır.`);
  const items = value.map((item, index) => nonEmptyText(item, `${label}[${index}]`));
  if (items.length < minimum) throw new Error(`${label} en az ${minimum} öğe taşımalıdır.`);
  if (new Set(items).size !== items.length) throw new Error(`${label} yinelenen öğe içeremez.`);
  return items;
}

function sameMembers(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && expected.every((item) => actual.includes(item));
}

export function isValueCode(value: string): value is ValueCode {
  return (VALUE_CODES as readonly string[]).includes(value);
}

function valueCode(value: unknown, label: string): ValueCode {
  const candidate = nonEmptyText(value, label);
  if (!isValueCode(candidate)) throw new Error(`${label} geçerli bir D1–D20 kodu olmalıdır.`);
  return candidate;
}

function valueCodeArray(value: unknown, label: string, minimum = 0): ValueCode[] {
  const values = uniqueStrings(value, label, minimum).map((candidate, index) =>
    valueCode(candidate, `${label}[${index}]`),
  );
  return values;
}

function roofValueCodeArray(value: unknown, label: string, minimum = 0): RoofValueCode[] {
  const values = valueCodeArray(value, label, minimum);
  if (values.some((code) => !(ROOF_VALUE_CODES as readonly ValueCode[]).includes(code))) {
    throw new Error(`${label} yalnız D1, D14 ve D16 çatı kodlarını içerebilir.`);
  }
  return values as RoofValueCode[];
}

function valueDomainId(value: unknown, label: string): ValueDomainId {
  const candidate = nonEmptyText(value, label);
  if (!(VALUE_DOMAIN_IDS as readonly string[]).includes(candidate)) {
    throw new Error(`${label} geçerli bir değer alanı olmalıdır.`);
  }
  return candidate as ValueDomainId;
}

function parseCanonicalSource(value: unknown): ValuesCanonicalSource {
  const item = exactRecord(
    value,
    [
      "framework",
      "publisher",
      "sourceUrl",
      "sourceCheckedOn",
      "preschoolActionSource",
      "officialFields",
      "pedagogicalAdaptationFields",
    ],
    "Kanonik kaynak",
  );
  const sourceUrl = nonEmptyText(item.sourceUrl, "Kanonik kaynak URL'si");
  if (item.framework !== "Türkiye Yüzyılı Maarif Modeli Erdem-Değer-Eylem Çerçevesi") {
    throw new Error("Kanonik çerçeve adı resmî TYMM Erdem-Değer-Eylem adıyla eşleşmelidir.");
  }
  if (item.publisher !== "T.C. Millî Eğitim Bakanlığı") {
    throw new Error("Kanonik yayımlayan kurum T.C. Millî Eğitim Bakanlığı olmalıdır.");
  }
  if (sourceUrl !== "https://tymm.meb.gov.tr/beceriler/erdem-deger-eylem-cercevesi") {
    throw new Error("Kanonik kaynak resmî TYMM Erdem-Değer-Eylem sayfası olmalıdır.");
  }
  const sourceCheckedOn = nonEmptyText(item.sourceCheckedOn, "Kaynak kontrol tarihi");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(sourceCheckedOn) ||
    Number.isNaN(Date.parse(`${sourceCheckedOn}T00:00:00.000Z`)) ||
    new Date(`${sourceCheckedOn}T00:00:00.000Z`).toISOString().slice(0, 10) !== sourceCheckedOn
  ) {
    throw new Error("Kaynak kontrol tarihi YYYY-AA-GG biçiminde olmalıdır.");
  }
  const actionSourceItem = exactRecord(
    item.preschoolActionSource,
    ["catalogId", "sourceVersion", "sourceUrl", "sourceSha256", "pageNumbering", "sourcePageRange"],
    "Okul öncesi değer eylemi kaynağı",
  );
  if (actionSourceItem.catalogId !== "meb-tymm-okul-oncesi-2024-ede-ek14") {
    throw new Error("Okul öncesi değer eylemi katalog kimliği geçersizdir.");
  }
  if (actionSourceItem.sourceVersion !== "2024.09.02") {
    throw new Error("Okul öncesi değer eylemi kaynak sürümü 2024.09.02 olmalıdır.");
  }
  if (actionSourceItem.sourceUrl !== "https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf") {
    throw new Error("Okul öncesi değer eylemleri resmî TYMM Okul Öncesi PDF'sine bağlanmalıdır.");
  }
  if (actionSourceItem.sourceSha256 !== "sha256:77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09") {
    throw new Error("Okul öncesi değer eylemi kaynağı doğrulanmış SHA-256 özetiyle eşleşmelidir.");
  }
  if (actionSourceItem.pageNumbering !== "pdf-page-label-and-viewer-1-based") {
    throw new Error("Okul öncesi değer eylemi sayfaları PDF PageLabel/görüntüleyici 1-based numarasıyla tutulmalıdır.");
  }
  if (
    !Array.isArray(actionSourceItem.sourcePageRange) ||
    actionSourceItem.sourcePageRange.length !== 2 ||
    actionSourceItem.sourcePageRange[0] !== 324 ||
    actionSourceItem.sourcePageRange[1] !== 332
  ) {
    throw new Error("Okul öncesi değer eylemi kaynağı Ek-14, 324–332. PDF PageLabel aralığını göstermelidir.");
  }
  const preschoolActionSource: PreschoolActionSource = Object.freeze({
    catalogId: actionSourceItem.catalogId,
    sourceVersion: nonEmptyText(actionSourceItem.sourceVersion, "Okul öncesi değer eylemi kaynak sürümü"),
    sourceUrl: actionSourceItem.sourceUrl,
    sourceSha256: actionSourceItem.sourceSha256 as `sha256:${string}`,
    pageNumbering: actionSourceItem.pageNumbering,
    sourcePageRange: Object.freeze([324, 332] as const),
  });
  const officialFields = uniqueStrings(item.officialFields, "Resmî kaynak alanları", 4);
  const pedagogicalAdaptationFields = uniqueStrings(
    item.pedagogicalAdaptationFields,
    "Pedagojik uyarlama alanları",
    1,
  );
  if (!pedagogicalAdaptationFields.includes("values[].observableActionsStatus")) {
    throw new Error("Okul öncesi eylemlerinin uyarlama statüsü kanonik kaynak notunda bulunmalıdır.");
  }
  return {
    framework: nonEmptyText(item.framework, "Çerçeve adı"),
    publisher: nonEmptyText(item.publisher, "Yayımlayan kurum"),
    sourceUrl,
    sourceCheckedOn,
    preschoolActionSource,
    officialFields,
    pedagogicalAdaptationFields,
  };
}

function parseDomain(value: unknown, index: number): ValueDomainDefinition {
  const label = `Değer alanı ${index + 1}`;
  const item = exactRecord(value, ["id", "officialLabel", "expectedValueCount"], label);
  return {
    id: valueDomainId(item.id, `${label} kimliği`),
    officialLabel: nonEmptyText(item.officialLabel, `${label} resmî etiketi`),
    expectedValueCount: positiveInteger(item.expectedValueCount, `${label} beklenen değer sayısı`),
  };
}

function parseValueDefinition(value: unknown, index: number): ValueDefinition {
  const label = `Değer ${index + 1}`;
  const item = exactRecord(
    value,
    [
      "code",
      "officialName",
      "domain",
      "roofValue",
      "pedagogicalPurpose",
      "observableActionsStatus",
      "observablePreschoolActions",
      "guardrails",
      "roofLinks",
    ],
    label,
  );
  const code = valueCode(item.code, `${label} kodu`);
  const officialName = nonEmptyText(item.officialName, `${code} resmî adı`);
  const domain = valueDomainId(item.domain, `${code} alanı`);
  if (officialName !== OFFICIAL_VALUE_NAMES[code]) {
    throw new Error(`${code} resmî adı "${OFFICIAL_VALUE_NAMES[code]}" olmalıdır.`);
  }
  if (domain !== OFFICIAL_DOMAIN_BY_CODE[code]) {
    throw new Error(`${code} resmî değer alanı ${OFFICIAL_DOMAIN_BY_CODE[code]} olmalıdır.`);
  }
  const expectedRoofValue = domain === "roof";
  if (item.roofValue !== expectedRoofValue) {
    throw new Error(`${code} çatı değeri işareti alanıyla tutarlı olmalıdır.`);
  }
  return {
    code,
    officialName,
    domain,
    roofValue: expectedRoofValue,
    pedagogicalPurpose: nonEmptyText(item.pedagogicalPurpose, `${code} pedagojik amacı`),
    observableActionsStatus: literalText(
      item.observableActionsStatus,
      "maarifos_preschool_adaptation",
      `${code} gözlenebilir eylem statüsü`,
    ),
    observablePreschoolActions: uniqueStrings(
      item.observablePreschoolActions,
      `${code} gözlenebilir okul öncesi eylemleri`,
      3,
    ),
    guardrails: uniqueStrings(item.guardrails, `${code} güvenlik sınırları`, 1),
    roofLinks: roofValueCodeArray(item.roofLinks, `${code} çatı bağlantıları`, 1),
  };
}

function parseCulturalBridge(value: unknown, index: number): CulturalBridgeDefinition {
  const label = `Kültürel köprü ${index + 1}`;
  const item = exactRecord(
    value,
    ["id", "name", "officialTymmValue", "status", "pedagogicalBridge", "valueCodes"],
    label,
  );
  const id = nonEmptyText(item.id, `${label} kimliği`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || /^d\d+$/i.test(id)) {
    throw new Error(`${label} kimliği TYMM değer kodu olmayan kebab-case bir kimlik olmalıdır.`);
  }
  return {
    id,
    name: nonEmptyText(item.name, `${label} adı`),
    officialTymmValue: exactBoolean(item.officialTymmValue, false, `${label} resmî TYMM statüsü`),
    status: literalText(
      item.status,
      "Turkish-Islamic-cultural-pedagogical-bridge",
      `${label} içerik statüsü`,
    ),
    pedagogicalBridge: nonEmptyText(item.pedagogicalBridge, `${label} pedagojik açıklaması`),
    valueCodes: valueCodeArray(item.valueCodes, `${label} değer bağlantıları`, 1),
  };
}

function parseSafetyRule(value: unknown, index: number): ValuesSafetyRule {
  const label = `Güvenlik kuralı ${index + 1}`;
  const item = exactRecord(value, ["id", "rule", "enforcement"], label);
  return {
    id: nonEmptyText(item.id, `${label} kimliği`),
    rule: nonEmptyText(item.rule, `${label} metni`),
    enforcement: literalText(item.enforcement, "hard-stop", `${label} yaptırımı`),
  };
}

function parseGovernance(value: unknown): ValuesGovernance {
  const item = exactRecord(
    value,
    [
      "publicationStatus",
      "effectiveOn",
      "collectiveAuthor",
      "changeSummary",
      "requiredReviewRoles",
      "approvals",
    ],
    "Değer anayasası yönetişimi",
  );
  const requiredReviewRoles = uniqueStrings(
    item.requiredReviewRoles,
    "Zorunlu inceleme rolleri",
    HUMAN_REVIEW_ROLES.length,
  );
  if (
    requiredReviewRoles.some(
      (role, index) => role !== HUMAN_REVIEW_ROLES[index],
    )
  ) {
    throw new Error("Değer anayasası altı zorunlu insan inceleme rolünü eksiksiz taşımalıdır.");
  }
  if (!Array.isArray(item.approvals)) {
    throw new Error("Değer anayasası onay defteri dizi olmalıdır.");
  }
  const approvals = item.approvals.map((approval, index) => {
    const parsed = exactRecord(approval, ["role", "status"], `Onay defteri kaydı ${index + 1}`);
    const role = nonEmptyText(parsed.role, `Onay defteri kaydı ${index + 1} rolü`);
    if (!(HUMAN_REVIEW_ROLES as readonly string[]).includes(role)) {
      throw new Error("Onay defteri yalnız zorunlu insan inceleme rollerini içerebilir.");
    }
    return {
      role: role as ValuesReviewRole,
      status: literalText(parsed.status, "pending", `Onay defteri kaydı ${index + 1} durumu`),
    } satisfies ValuesGovernanceApproval;
  });
  if (
    approvals.length !== HUMAN_REVIEW_ROLES.length ||
    approvals.some(
      (approval, index) => approval.role !== HUMAN_REVIEW_ROLES[index],
    )
  ) {
    throw new Error("Onay defteri altı zorunlu rolü tam bir kez taşımalıdır.");
  }
  if (item.effectiveOn !== null) {
    throw new Error("İnsan onayları tamamlanmadan değer anayasasına yürürlük tarihi verilemez.");
  }
  return {
    publicationStatus: literalText(
      item.publicationStatus,
      "draft-pending-human-review",
      "Yayın statüsü",
    ),
    effectiveOn: null,
    collectiveAuthor: nonEmptyText(item.collectiveAuthor, "Kolektif yazar"),
    changeSummary: nonEmptyText(item.changeSummary, "Değişiklik özeti"),
    requiredReviewRoles: requiredReviewRoles as ValuesReviewRole[],
    approvals,
  };
}

function parseActivityPlanningContract(value: unknown): ActivityValuePlanningContract {
  const item = exactRecord(
    value,
    [
      "schemaVersion",
      "primaryValue",
      "roofAnchor",
      "roofValueChecks",
      "supportingValues",
      "officialActionSnapshot",
      "pedagogicalFields",
      "coverage",
    ],
    "Etkinlik değer planlama sözleşmesi",
  );

  const primary = exactRecord(item.primaryValue, ["exactly"], "Ana değer kardinalitesi");
  const roof = exactRecord(
    item.roofAnchor,
    ["exactly", "allowedCodes"],
    "Çatı ankrajı kardinalitesi",
  );
  const roofChecks = exactRecord(
    item.roofValueChecks,
    ["required", "requiredFields"],
    "Üçlü çatı değer kontrolü",
  );
  const supporting = exactRecord(
    item.supportingValues,
    ["minimum", "maximum", "mustBeDistinct", "mustExcludePrimary"],
    "Destek değer kardinalitesi",
  );
  const snapshot = exactRecord(
    item.officialActionSnapshot,
    ["required", "immutable", "requiredFields"],
    "Resmî eylem snapshot sözleşmesi",
  );
  const coverage = exactRecord(
    item.coverage,
    ["minimumDistinctValuesPerMonth", "requiredValueCodesPerTerm"],
    "Değer kapsam sözleşmesi",
  );

  const roofCodes = roofValueCodeArray(roof.allowedCodes, "Çatı ankrajı kodları", 3);
  if (!sameMembers(roofCodes, ROOF_VALUE_CODES)) {
    throw new Error("Çatı ankrajı yalnız D1, D14 ve D16 kodlarını eksiksiz taşımalıdır.");
  }

  const roofCheckFields = uniqueStrings(
    roofChecks.requiredFields,
    "Üçlü çatı değer kontrolü alanları",
    REQUIRED_ROOF_CHECK_FIELDS.length,
  );
  if (!sameMembers(roofCheckFields, REQUIRED_ROOF_CHECK_FIELDS)) {
    throw new Error("Her etkinlik saygı, sorumluluk ve adalet kontrollerini birlikte taşımalıdır.");
  }

  const snapshotFields = uniqueStrings(
    snapshot.requiredFields,
    "Resmî eylem snapshot alanları",
    REQUIRED_ACTION_SNAPSHOT_FIELDS.length,
  );
  if (!sameMembers(snapshotFields, REQUIRED_ACTION_SNAPSHOT_FIELDS)) {
    throw new Error("Resmî eylem snapshot alanları kanonik sözleşmeyle uyuşmuyor.");
  }

  if (!Array.isArray(item.pedagogicalFields)) {
    throw new Error("Pedagojik planlama alanları dizi olmalıdır.");
  }
  const pedagogicalFields = item.pedagogicalFields.map((value, index) => {
    const label = `Pedagojik planlama alanı ${index + 1}`;
    const field = exactRecord(value, ["id", "label", "required"], label);
    const id = nonEmptyText(field.id, `${label} kimliği`);
    if (typeof field.required !== "boolean") {
      throw new Error(`${label} zorunluluğu boolean olmalıdır.`);
    }
    return {
      id,
      label: nonEmptyText(field.label, `${label} etiketi`),
      required: field.required,
    } satisfies PedagogicalPlanningField;
  });
  const fieldIds = pedagogicalFields.map((field) => field.id);
  if (new Set(fieldIds).size !== fieldIds.length || !sameMembers(fieldIds, REQUIRED_PEDAGOGICAL_FIELD_IDS)) {
    throw new Error("Pedagojik planlama alanları ikilemden yansıtmaya kanonik alanları taşımalıdır.");
  }
  for (const field of pedagogicalFields) {
    const expectedRequired = !(OPTIONAL_ACTIVITY_PEDAGOGICAL_FIELD_IDS as readonly string[]).includes(field.id);
    if (field.required !== expectedRequired) {
      throw new Error(
        `${field.id} alanının etkinlik düzeyi zorunluluğu ${String(expectedRequired)} olmalıdır.`,
      );
    }
  }

  const termCodes = valueCodeArray(
    coverage.requiredValueCodesPerTerm,
    "Dönemlik zorunlu değer kapsamı",
    VALUE_CODES.length,
  );
  if (!sameMembers(termCodes, VALUE_CODES)) {
    throw new Error("Her dönem D1–D20 değerlerinin tamamı kapsanmalıdır.");
  }

  return {
    schemaVersion: exactInteger(item.schemaVersion, 1, "Planlama sözleşmesi sürümü"),
    primaryValue: {
      exactly: exactInteger(primary.exactly, 1, "Ana değer sayısı"),
    },
    roofAnchor: {
      exactly: exactInteger(roof.exactly, 1, "Çatı ankrajı sayısı"),
      allowedCodes: roofCodes,
    },
    roofValueChecks: {
      required: exactBoolean(roofChecks.required, true, "Üçlü çatı değer kontrolü zorunluluğu"),
      requiredFields: roofCheckFields as ["respect", "responsibility", "justice"],
    },
    supportingValues: {
      minimum: exactInteger(supporting.minimum, 0, "En az destek değeri sayısı"),
      maximum: exactInteger(supporting.maximum, 2, "En fazla destek değeri sayısı"),
      mustBeDistinct: exactBoolean(
        supporting.mustBeDistinct,
        true,
        "Destek değerlerinin tekilliği",
      ),
      mustExcludePrimary: exactBoolean(
        supporting.mustExcludePrimary,
        true,
        "Ana değerin destek değerlerinden dışlanması",
      ),
    },
    officialActionSnapshot: {
      required: exactBoolean(snapshot.required, true, "Resmî eylem snapshot zorunluluğu"),
      immutable: exactBoolean(snapshot.immutable, true, "Resmî eylem snapshot değişmezliği"),
      requiredFields: snapshotFields,
    },
    pedagogicalFields,
    coverage: {
      minimumDistinctValuesPerMonth: exactInteger(
        coverage.minimumDistinctValuesPerMonth,
        4,
        "Aylık en az farklı değer sayısı",
      ),
      requiredValueCodesPerTerm: termCodes,
    },
  };
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => deepFreeze(item))) as DeepReadonly<T>;
  }
  if (typeof value === "object" && value !== null) {
    const clone = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, deepFreeze(item)]),
    );
    return Object.freeze(clone) as DeepReadonly<T>;
  }
  return value as DeepReadonly<T>;
}

/**
 * Bilinmeyen alanları da reddeden strict ayrıştırıcı. Başarılı sonuç girdiden
 * kopuk ve bütün alt nesneleriyle dondurulmuş bir snapshot'tır.
 */
export function parseValuesPedagogyConstitution(
  value: unknown,
): ImmutableValuesPedagogyConstitution {
  const item = exactRecord(
    value,
    [
      "schemaVersion",
      "constitutionId",
      "version",
      "title",
      "governance",
      "canonicalSource",
      "centerPillars",
      "domains",
      "values",
      "culturalBridges",
      "safetyRules",
      "activityPlanningContract",
    ],
    "Değerler Pedagojisi Anayasası",
  );

  if (!Array.isArray(item.domains)) throw new Error("Değer alanları dizi olmalıdır.");
  const domains = item.domains.map(parseDomain);
  const domainIds = domains.map((domain) => domain.id);
  if (new Set(domainIds).size !== domainIds.length || !sameMembers(domainIds, VALUE_DOMAIN_IDS)) {
    throw new Error("Değer alanları çatı, insan, aile-sosyal çevre ve fiziksel çevreyi tekil taşımalıdır.");
  }
  for (const domain of domains) {
    if (domain.expectedValueCount !== EXPECTED_DOMAIN_COUNTS[domain.id]) {
      throw new Error(`${domain.id} alanı ${EXPECTED_DOMAIN_COUNTS[domain.id]} değer taşımalıdır.`);
    }
  }

  if (!Array.isArray(item.values)) throw new Error("Değerler dizi olmalıdır.");
  const values = item.values.map(parseValueDefinition);
  const codes = values.map((definition) => definition.code);
  if (new Set(codes).size !== codes.length || !sameMembers(codes, VALUE_CODES)) {
    throw new Error("Anayasa D1–D20 kodlarının her birini tam bir kez taşımalıdır.");
  }
  for (const domain of domains) {
    if (values.filter((definition) => definition.domain === domain.id).length !== domain.expectedValueCount) {
      throw new Error(`${domain.officialLabel} alanının değer dağılımı beklenen sayıyla uyuşmuyor.`);
    }
  }

  const centerPillars = roofValueCodeArray(item.centerPillars, "Merkez çatı değerleri", 3);
  if (!sameMembers(centerPillars, ROOF_VALUE_CODES)) {
    throw new Error("Merkez çatı değerleri D1 Adalet, D14 Saygı ve D16 Sorumluluk olmalıdır.");
  }

  if (!Array.isArray(item.culturalBridges)) throw new Error("Kültürel köprüler dizi olmalıdır.");
  const culturalBridges = item.culturalBridges.map(parseCulturalBridge);
  const bridgeIds = culturalBridges.map((bridge) => bridge.id);
  if (
    new Set(bridgeIds).size !== bridgeIds.length ||
    !sameMembers(bridgeIds, REQUIRED_CULTURAL_BRIDGE_IDS)
  ) {
    throw new Error("Türk-İslam kültürel köprüleri kanonik on bir başlığı tekil taşımalıdır.");
  }

  if (!Array.isArray(item.safetyRules)) throw new Error("Güvenlik kuralları dizi olmalıdır.");
  const safetyRules = item.safetyRules.map(parseSafetyRule);
  const safetyRuleIds = safetyRules.map((rule) => rule.id);
  if (
    new Set(safetyRuleIds).size !== safetyRuleIds.length ||
    !sameMembers(safetyRuleIds, REQUIRED_SAFETY_RULE_IDS)
  ) {
    throw new Error("Değer pedagojisinin altı değişmez güvenlik kuralı eksiksiz olmalıdır.");
  }

  const parsed: ValuesPedagogyConstitution = {
    schemaVersion: exactInteger(item.schemaVersion, 1, "Anayasa şema sürümü"),
    constitutionId: literalText(
      item.constitutionId,
      "maarifos-values-pedagogy-constitution",
      "Anayasa kimliği",
    ),
    version: nonEmptyText(item.version, "Anayasa sürümü"),
    title: nonEmptyText(item.title, "Anayasa başlığı"),
    governance: parseGovernance(item.governance),
    canonicalSource: parseCanonicalSource(item.canonicalSource),
    centerPillars,
    domains,
    values,
    culturalBridges,
    safetyRules,
    activityPlanningContract: parseActivityPlanningContract(item.activityPlanningContract),
  };

  return deepFreeze(parsed);
}

export const VALUES_PEDAGOGY_CONSTITUTION = parseValuesPedagogyConstitution(
  rawConstitution as unknown,
);

export const VALUE_DEFINITIONS_BY_CODE: Readonly<Record<ValueCode, ImmutableValueDefinition>> =
  Object.freeze(
    Object.fromEntries(
      VALUES_PEDAGOGY_CONSTITUTION.values.map((definition) => [definition.code, definition]),
    ),
  ) as Readonly<Record<ValueCode, ImmutableValueDefinition>>;

export function valueDefinitionByCode(code: ValueCode): ImmutableValueDefinition;
export function valueDefinitionByCode(code: string): ImmutableValueDefinition | undefined;
export function valueDefinitionByCode(code: string): ImmutableValueDefinition | undefined {
  return isValueCode(code) ? VALUE_DEFINITIONS_BY_CODE[code] : undefined;
}
