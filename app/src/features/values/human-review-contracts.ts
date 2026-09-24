import {
  HUMAN_REVIEW_ROLES,
  type ValuesReviewRole,
} from "./values-constitution.ts";

export { HUMAN_REVIEW_ROLES };
export type { ValuesReviewRole };

export const HUMAN_REVIEW_DECISIONS = Object.freeze([
  "approve",
  "request_changes",
  "red",
] as const);

export type HumanReviewDecision = (typeof HUMAN_REVIEW_DECISIONS)[number];
export type HumanReviewStatus =
  | "red"
  | "changes_requested"
  | "pending"
  | "approved";

export interface HumanReviewConstitutionSnapshot {
  readonly id: string;
  readonly version: string;
  readonly schemaVersion: number;
  readonly rawFileSha256: `sha256:${string}`;
}

export interface HumanReviewOfficialActionCatalogSnapshot {
  readonly id: string;
  readonly sourceVersion: string;
  readonly sourceSha256: `sha256:${string}`;
  readonly rawFileSha256: `sha256:${string}`;
}

/**
 * Tek bir değişmez inceleme paketini tanımlar. Bu nesnedeki herhangi bir alanın
 * değişmesi yeni bir reviewSubjectId ve yeni altı rollü inceleme gerektirir.
 */
export interface HumanReviewSubject {
  readonly reviewSubjectId: string;
  readonly contentPackId: string;
  readonly contentPackVersion: string;
  readonly contentReleaseId: string;
  readonly manifestDigest: `sha256:${string}`;
  readonly contentRawSha256: `sha256:${string}`;
  readonly contentPayloadSha256: `sha256:${string}`;
  readonly reviewBundleSha256: `sha256:${string}`;
  readonly constitution: HumanReviewConstitutionSnapshot;
  readonly officialActionCatalog: HumanReviewOfficialActionCatalogSnapshot;
  readonly createdAtUtc: string;
}

/**
 * Uygulamanın taşıyabileceği secretsiz karar referansıdır. Sonuç, bağımsızlık ve
 * karar metni yalnız yetkili resolver yanıtından gelir.
 */
export interface HumanReviewDecisionReference {
  readonly decisionId: string;
  readonly assignmentId: string;
  readonly reviewSubjectId: string;
  readonly manifestDigest: `sha256:${string}`;
  readonly reviewRole: ValuesReviewRole;
  readonly reviewerPseudonymousId: string;
}

export interface HumanReviewRegistryResolution
  extends HumanReviewDecisionReference {
  readonly subject: HumanReviewSubject;
  readonly decision: HumanReviewDecision;
  readonly openFindingIds: readonly string[];
  readonly rationale: string;
  readonly independentReviewer: true;
  readonly conflictOfInterestCleared: true;
  readonly decidedAtUtc: string;
}

/** Yetkili insan-inceleme sicili uygulama sınırında enjekte edilir. */
export type HumanReviewRegistryResolver = (
  decisionId: string,
) => unknown | null;

export interface HumanReviewRoleEvaluation {
  readonly role: ValuesReviewRole;
  readonly status: "pending" | HumanReviewDecision;
  readonly decisionId: string | null;
  readonly reviewerPseudonymousId: string | null;
}

export interface HumanReviewEvaluation {
  readonly subject: HumanReviewSubject;
  readonly status: HumanReviewStatus;
  readonly roleEvaluations: readonly HumanReviewRoleEvaluation[];
  readonly resolvedDecisionIds: readonly string[];
  readonly unresolvedDecisionIds: readonly string[];
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const MACHINE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,198}[a-z0-9])?$/;
const PSEUDONYMOUS_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{2,119}$/;
const SEMVER_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/;
const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const FORBIDDEN_HUMAN_TEXT_PATTERN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

const SUBJECT_KEYS = [
  "reviewSubjectId",
  "contentPackId",
  "contentPackVersion",
  "contentReleaseId",
  "manifestDigest",
  "contentRawSha256",
  "contentPayloadSha256",
  "reviewBundleSha256",
  "constitution",
  "officialActionCatalog",
  "createdAtUtc",
] as const;
const CONSTITUTION_KEYS = [
  "id",
  "version",
  "schemaVersion",
  "rawFileSha256",
] as const;
const CATALOG_KEYS = [
  "id",
  "sourceVersion",
  "sourceSha256",
  "rawFileSha256",
] as const;
const REFERENCE_KEYS = [
  "decisionId",
  "assignmentId",
  "reviewSubjectId",
  "manifestDigest",
  "reviewRole",
  "reviewerPseudonymousId",
] as const;
const REVIEW_TOPOLOGY_KEYS = [
  "decisionId",
  "assignmentId",
  "reviewRole",
  "reviewerPseudonymousId",
] as const;
const RESOLUTION_KEYS = [
  ...REFERENCE_KEYS,
  "subject",
  "decision",
  "openFindingIds",
  "rationale",
  "independentReviewer",
  "conflictOfInterestCleared",
  "decidedAtUtc",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactRecord(
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} nesne olmalıdır.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} exact alan sözleşmesine uymuyor.`);
  }
  return value;
}

function uuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} kanonik küçük harfli UUID olmalıdır.`);
  }
  return value;
}

function sha256(value: unknown, label: string): `sha256:${string}` {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} sha256: önekli küçük harfli SHA-256 olmalıdır.`);
  }
  return value as `sha256:${string}`;
}

function machineId(value: unknown, label: string): string {
  if (typeof value !== "string" || !MACHINE_ID_PATTERN.test(value)) {
    throw new Error(`${label} kanonik makine kimliği olmalıdır.`);
  }
  return value;
}

function semanticVersion(value: unknown, label: string): string {
  if (typeof value !== "string" || !SEMVER_PATTERN.test(value)) {
    throw new Error(`${label} SemVer biçiminde olmalıdır.`);
  }
  return value;
}

function nfcText(value: unknown, label: string, maxLength: number): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    value !== value.trim() ||
    value !== value.normalize("NFC") ||
    FORBIDDEN_HUMAN_TEXT_PATTERN.test(value)
  ) {
    throw new Error(`${label} kırpılmış, görünmez/kontrol karaktersiz NFC metni olmalıdır.`);
  }
  return value;
}

function utcTimestamp(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !UTC_ISO_PATTERN.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${label} milisaniyeli UTC ISO-8601 zamanı olmalıdır.`);
  }
  return value;
}

function reviewRole(value: unknown, label: string): ValuesReviewRole {
  if (!(HUMAN_REVIEW_ROLES as readonly unknown[]).includes(value)) {
    throw new Error(`${label} kanonik altı insan inceleme rolünden biri olmalıdır.`);
  }
  return value as ValuesReviewRole;
}

function decision(value: unknown): HumanReviewDecision {
  if (!(HUMAN_REVIEW_DECISIONS as readonly unknown[]).includes(value)) {
    throw new Error("İnsan inceleme kararı approve, request_changes veya red olmalıdır.");
  }
  return value as HumanReviewDecision;
}

function pseudonymousId(value: unknown): string {
  if (typeof value !== "string" || !PSEUDONYMOUS_ID_PATTERN.test(value)) {
    throw new Error("İnceleyen kimliği kişisel bilgi taşımayan kanonik pseudonymous kimlik olmalıdır.");
  }
  return value;
}

function uniqueUuidArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${label} dizi olmalıdır.`);
  const parsed = value.map((item, index) => uuid(item, `${label}[${index}]`));
  if (new Set(parsed).size !== parsed.length) {
    throw new Error(`${label} mükerrer kimlik taşıyamaz.`);
  }
  return Object.freeze(parsed);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return Object.freeze(value);
}

export function parseHumanReviewSubject(value: unknown): HumanReviewSubject {
  const item = exactRecord(value, SUBJECT_KEYS, "İnsan inceleme konusu");
  const constitution = exactRecord(
    item.constitution,
    CONSTITUTION_KEYS,
    "İnsan inceleme konusu anayasa zinciri",
  );
  const officialActionCatalog = exactRecord(
    item.officialActionCatalog,
    CATALOG_KEYS,
    "İnsan inceleme konusu resmî eylem kataloğu zinciri",
  );
  if (
    !Number.isInteger(constitution.schemaVersion) ||
    (constitution.schemaVersion as number) < 1
  ) {
    throw new Error("Anayasa şema sürümü pozitif tam sayı olmalıdır.");
  }

  return deepFreeze({
    reviewSubjectId: uuid(item.reviewSubjectId, "İnceleme konusu kimliği"),
    contentPackId: machineId(item.contentPackId, "İçerik paketi kimliği"),
    contentPackVersion: semanticVersion(
      item.contentPackVersion,
      "İçerik paketi sürümü",
    ),
    contentReleaseId: machineId(item.contentReleaseId, "İçerik yayın kimliği"),
    manifestDigest: sha256(item.manifestDigest, "Manifest özeti"),
    contentRawSha256: sha256(item.contentRawSha256, "İçerik ham dosya özeti"),
    contentPayloadSha256: sha256(
      item.contentPayloadSha256,
      "Kanonik içerik payload özeti",
    ),
    reviewBundleSha256: sha256(
      item.reviewBundleSha256,
      "İnsan inceleme paketi özeti",
    ),
    constitution: {
      id: machineId(constitution.id, "Anayasa kimliği"),
      version: semanticVersion(constitution.version, "Anayasa sürümü"),
      schemaVersion: constitution.schemaVersion as number,
      rawFileSha256: sha256(
        constitution.rawFileSha256,
        "Anayasa ham dosya özeti",
      ),
    },
    officialActionCatalog: {
      id: machineId(officialActionCatalog.id, "Resmî eylem kataloğu kimliği"),
      sourceVersion: nfcText(
        officialActionCatalog.sourceVersion,
        "Resmî eylem kataloğu kaynak sürümü",
        120,
      ),
      sourceSha256: sha256(
        officialActionCatalog.sourceSha256,
        "Resmî eylem kataloğu kaynak özeti",
      ),
      rawFileSha256: sha256(
        officialActionCatalog.rawFileSha256,
        "Resmî eylem kataloğu ham dosya özeti",
      ),
    },
    createdAtUtc: utcTimestamp(item.createdAtUtc, "İnceleme konusu oluşturma zamanı"),
  });
}

export function sameHumanReviewSubject(
  left: HumanReviewSubject,
  right: HumanReviewSubject,
): boolean {
  return (
    left.reviewSubjectId === right.reviewSubjectId &&
    left.contentPackId === right.contentPackId &&
    left.contentPackVersion === right.contentPackVersion &&
    left.contentReleaseId === right.contentReleaseId &&
    left.manifestDigest === right.manifestDigest &&
    left.contentRawSha256 === right.contentRawSha256 &&
    left.contentPayloadSha256 === right.contentPayloadSha256 &&
    left.reviewBundleSha256 === right.reviewBundleSha256 &&
    left.constitution.id === right.constitution.id &&
    left.constitution.version === right.constitution.version &&
    left.constitution.schemaVersion === right.constitution.schemaVersion &&
    left.constitution.rawFileSha256 === right.constitution.rawFileSha256 &&
    left.officialActionCatalog.id === right.officialActionCatalog.id &&
    left.officialActionCatalog.sourceVersion ===
      right.officialActionCatalog.sourceVersion &&
    left.officialActionCatalog.sourceSha256 ===
      right.officialActionCatalog.sourceSha256 &&
    left.officialActionCatalog.rawFileSha256 ===
      right.officialActionCatalog.rawFileSha256 &&
    left.createdAtUtc === right.createdAtUtc
  );
}

export function parseHumanReviewDecisionReference(
  value: unknown,
): HumanReviewDecisionReference {
  const item = exactRecord(value, REFERENCE_KEYS, "İnsan inceleme karar referansı");
  return deepFreeze({
    decisionId: uuid(item.decisionId, "İnsan inceleme kararı kimliği"),
    assignmentId: uuid(item.assignmentId, "İnsan inceleme ataması kimliği"),
    reviewSubjectId: uuid(item.reviewSubjectId, "İnceleme konusu kimliği"),
    manifestDigest: sha256(item.manifestDigest, "Karar manifest özeti"),
    reviewRole: reviewRole(item.reviewRole, "İnsan inceleme karar rolü"),
    reviewerPseudonymousId: pseudonymousId(item.reviewerPseudonymousId),
  });
}

export function parseHumanReviewRegistryResolution(
  value: unknown,
): HumanReviewRegistryResolution {
  const item = exactRecord(value, RESOLUTION_KEYS, "Yetkili insan inceleme sicili kararı");
  const reference = parseHumanReviewDecisionReference(
    Object.fromEntries(REFERENCE_KEYS.map((key) => [key, item[key]])),
  );
  const parsedDecision = decision(item.decision);
  const openFindingIds = uniqueUuidArray(item.openFindingIds, "Açık bulgu kimlikleri");
  if (parsedDecision === "approve" && openFindingIds.length !== 0) {
    throw new Error("Approve kararı açık bulgu taşıyamaz.");
  }
  if (parsedDecision !== "approve" && openFindingIds.length === 0) {
    throw new Error("Request_changes ve red kararları en az bir açık bulgu taşımalıdır.");
  }
  if (
    item.independentReviewer !== true ||
    item.conflictOfInterestCleared !== true
  ) {
    throw new Error("Yetkili sicil kararı bağımsız ve çıkar çatışması temizlenmiş inceleyen gerektirir.");
  }
  const subject = parseHumanReviewSubject(item.subject);
  const decidedAtUtc = utcTimestamp(
    item.decidedAtUtc,
    "İnsan inceleme karar zamanı",
  );
  if (Date.parse(decidedAtUtc) < Date.parse(subject.createdAtUtc)) {
    throw new Error("İnsan inceleme kararı inceleme konusu oluşturulmadan önce verilemez.");
  }
  return deepFreeze({
    ...reference,
    subject,
    decision: parsedDecision,
    openFindingIds,
    rationale: nfcText(item.rationale, "İnsan inceleme karar gerekçesi", 2_000),
    independentReviewer: true,
    conflictOfInterestCleared: true,
    decidedAtUtc,
  });
}

function sameReference(
  reference: HumanReviewDecisionReference,
  resolution: HumanReviewRegistryResolution,
): boolean {
  return REFERENCE_KEYS.every((key) => reference[key] === resolution[key]);
}

function hasExactDistinctReviewTopology(
  records: readonly HumanReviewDecisionReference[],
): boolean {
  return (
    records.length === HUMAN_REVIEW_ROLES.length &&
    REVIEW_TOPOLOGY_KEYS.every(
      (key) =>
        new Set(records.map((record) => record[key])).size ===
        HUMAN_REVIEW_ROLES.length,
    )
  );
}

function hasExactReferenceResolutionTopology(
  references: readonly HumanReviewDecisionReference[],
  resolutions: readonly HumanReviewRegistryResolution[],
): boolean {
  if (
    !hasExactDistinctReviewTopology(references) ||
    !hasExactDistinctReviewTopology(resolutions)
  ) {
    return false;
  }
  const resolutionsByDecisionId = new Map(
    resolutions.map((resolution) => [resolution.decisionId, resolution]),
  );
  return references.every((reference) => {
    const resolution = resolutionsByDecisionId.get(reference.decisionId);
    return resolution !== undefined && sameReference(reference, resolution);
  });
}

function pendingEvaluation(
  subject: HumanReviewSubject,
  references: readonly HumanReviewDecisionReference[],
): HumanReviewEvaluation {
  return deepFreeze({
    subject,
    status: "pending",
    roleEvaluations: HUMAN_REVIEW_ROLES.map((role) => ({
      role,
      status: "pending" as const,
      decisionId: null,
      reviewerPseudonymousId: null,
    })),
    resolvedDecisionIds: [],
    unresolvedDecisionIds: references.map((reference) => reference.decisionId),
  });
}

export function evaluateHumanReview(
  subjectValue: unknown,
  referenceValues: readonly unknown[],
  resolver?: HumanReviewRegistryResolver | null,
): HumanReviewEvaluation {
  const subject = parseHumanReviewSubject(subjectValue);
  if (!Array.isArray(referenceValues)) {
    throw new Error("İnsan inceleme karar referansları dizi olmalıdır.");
  }
  const references = referenceValues.map(parseHumanReviewDecisionReference);
  if (!resolver) return pendingEvaluation(subject, references);

  const resolutions: HumanReviewRegistryResolution[] = [];
  const unresolvedDecisionIds: string[] = [];
  for (const reference of references) {
    if (
      reference.reviewSubjectId !== subject.reviewSubjectId ||
      reference.manifestDigest !== subject.manifestDigest
    ) {
      unresolvedDecisionIds.push(reference.decisionId);
      continue;
    }
    try {
      const candidate = resolver(reference.decisionId);
      if (candidate === null || candidate === undefined) {
        unresolvedDecisionIds.push(reference.decisionId);
        continue;
      }
      const resolution = parseHumanReviewRegistryResolution(candidate);
      if (
        !sameReference(reference, resolution) ||
        !sameHumanReviewSubject(subject, resolution.subject)
      ) {
        unresolvedDecisionIds.push(reference.decisionId);
        continue;
      }
      resolutions.push(resolution);
    } catch {
      unresolvedDecisionIds.push(reference.decisionId);
    }
  }

  const roleEvaluations = HUMAN_REVIEW_ROLES.map((role) => {
    const roleReferences = references.filter((reference) => reference.reviewRole === role);
    const roleResolutions = resolutions.filter((resolution) => resolution.reviewRole === role);
    if (roleReferences.length !== 1 || roleResolutions.length !== 1) {
      return {
        role,
        status: "pending" as const,
        decisionId: null,
        reviewerPseudonymousId: null,
      };
    }
    const resolved = roleResolutions[0];
    return {
      role,
      status: resolved.decision,
      decisionId: resolved.decisionId,
      reviewerPseudonymousId: resolved.reviewerPseudonymousId,
    };
  });

  const completeTopology =
    hasExactReferenceResolutionTopology(references, resolutions) &&
    unresolvedDecisionIds.length === 0 &&
    roleEvaluations.every((evaluation) => evaluation.status !== "pending");

  const status: HumanReviewStatus = resolutions.some(
    (resolution) => resolution.decision === "red",
  )
    ? "red"
    : resolutions.some((resolution) => resolution.decision === "request_changes")
      ? "changes_requested"
      : !completeTopology ||
          !resolutions.every((resolution) => resolution.decision === "approve")
        ? "pending"
        : "approved";

  return deepFreeze({
    subject,
    status,
    roleEvaluations,
    resolvedDecisionIds: resolutions.map((resolution) => resolution.decisionId),
    unresolvedDecisionIds,
  });
}

/**
 * Referans defterine yalnız ekleme yapar; aynı karar, atama, rol, aktör veya
 * farklı subject/digest ile overwrite girişimini reddeder.
 */
export function appendHumanReviewDecisionReference(
  currentValues: readonly unknown[],
  nextValue: unknown,
): readonly HumanReviewDecisionReference[] {
  if (!Array.isArray(currentValues)) {
    throw new Error("İnsan inceleme karar defteri dizi olmalıdır.");
  }
  const current = currentValues.map(parseHumanReviewDecisionReference);
  const next = parseHumanReviewDecisionReference(nextValue);
  const candidate = [...current, next];
  const first = candidate[0];
  const uniqueFields = [
    ["decisionId", "Karar kimliği overwrite edilemez."],
    ["assignmentId", "İnceleme ataması ikinci kararla overwrite edilemez."],
    ["reviewRole", "Aynı rol aynı inceleme paketinde ikinci final karar veremez."],
    [
      "reviewerPseudonymousId",
      "Aynı pseudonymous aktör aynı inceleme paketinde iki rol üstlenemez.",
    ],
  ] as const;
  for (const item of candidate) {
    if (
      first &&
      (first.reviewSubjectId !== item.reviewSubjectId ||
        first.manifestDigest !== item.manifestDigest)
    ) {
      throw new Error("Karar defteri yalnız aynı exact subject ve manifest digest'i taşıyabilir.");
    }
  }
  for (const [field, message] of uniqueFields) {
    if (new Set(candidate.map((item) => item[field])).size !== candidate.length) {
      throw new Error(message);
    }
  }
  return deepFreeze(candidate);
}
