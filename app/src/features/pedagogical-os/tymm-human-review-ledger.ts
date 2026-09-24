import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { sha256Hex } from "../../core/backup/crypto.ts";

export const TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION = 1 as const;
export const TYMM_HUMAN_REVIEW_METHOD_VERSION = "1.0" as const;
export const TYMM_HUMAN_REVIEW_IDENTITY_SCOPE =
  "tymm-pedagogical-mapping-review" as const;
export const TYMM_PENDING_MAPPING_PUBLICATION_STATE =
  "blocked-awaiting-two-independent-human-reviews" as const;
export const TYMM_PENDING_MAPPING_DISCLOSURE =
  "Pedagojik eşlemeler doğrulanmış değildir. Bir eşleme, ancak dış sicil kanıtıyla doğrulanan iki ayrı gerçek okul öncesi uzmanının gerekçeli onayından sonra yayımlanabilir." as const;
export const TYMM_HUMAN_REVIEW_GENESIS_HASH =
  `sha256:${"0".repeat(64)}` as `sha256:${string}`;

export const TYMM_HUMAN_REVIEW_CRITERIA = Object.freeze([
  "age-appropriateness",
  "learning-outcome-alignment",
  "differentiation",
  "observation-language",
] as const);

export type TymmHumanReviewCriterion =
  (typeof TYMM_HUMAN_REVIEW_CRITERIA)[number];
export type TymmHumanReviewDecision =
  | "APPROVE"
  | "REQUEST_CHANGES"
  | "REJECT";
export type TymmHumanReviewActorKind =
  | "real-human"
  | "agent"
  | "fictional-test";

export interface TymmMappingReviewSubject {
  readonly schemaVersion: typeof TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION;
  readonly reviewItemId: string;
  readonly candidateMappingSha256: `sha256:${string}`;
  readonly proposerActorId: string;
  readonly proposedAtUtc: string;
  readonly civilDate: string;
}

export interface TymmHumanReviewScope {
  readonly reviewItemId: string;
  readonly candidateMappingSha256: `sha256:${string}`;
  readonly criteria: readonly TymmHumanReviewCriterion[];
}

export interface TymmHumanReviewerIdentity {
  readonly actorId: string;
  readonly actorKind: TymmHumanReviewActorKind;
  readonly role: "independent-preschool-education-expert";
  readonly independentReviewer: boolean;
  readonly conflictOfInterestCleared: boolean;
  readonly identityEvidenceId: string | null;
}

export interface TymmHumanReviewDecisionEvent {
  readonly schemaVersion: typeof TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION;
  readonly eventType: "REVIEW_DECIDED";
  readonly eventId: string;
  readonly subject: TymmMappingReviewSubject;
  readonly reviewer: TymmHumanReviewerIdentity;
  readonly scope: TymmHumanReviewScope;
  readonly reviewedAtUtc: string;
  readonly civilDate: string;
  readonly rationale: string;
  readonly decision: TymmHumanReviewDecision;
  readonly findingIds: readonly string[];
  readonly authorizationReference: string;
  readonly reviewArtifactSha256: `sha256:${string}`;
}

export interface TymmHumanConflictResolutionEvent {
  readonly schemaVersion: typeof TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION;
  readonly eventType: "CONFLICT_RESOLVED";
  readonly eventId: string;
  readonly subject: TymmMappingReviewSubject;
  readonly resolver: {
    readonly actorId: string;
    readonly actorKind: TymmHumanReviewActorKind;
    readonly role: "pedagogical-review-coordinator";
    readonly identityEvidenceId: string | null;
  };
  readonly conflictingReviewEventIds: readonly string[];
  readonly decidedAtUtc: string;
  readonly civilDate: string;
  readonly rationale: string;
  /** Tek koordinatör çelişkili bir adayı yayımlanabilir duruma getiremez. */
  readonly decision: "REQUEST_FRESH_REVIEWS" | "REJECT_CANDIDATE";
  readonly authorizationReference: string;
  readonly resolutionArtifactSha256: `sha256:${string}`;
}

export type TymmHumanReviewLedgerEvent =
  | TymmHumanReviewDecisionEvent
  | TymmHumanConflictResolutionEvent;

export interface TymmHumanReviewLedgerLine {
  readonly sequence: number;
  readonly previousHash: `sha256:${string}`;
  readonly event: TymmHumanReviewLedgerEvent;
  readonly eventHash: `sha256:${string}`;
}

export interface TymmHumanIdentityEvidence {
  readonly schemaVersion: typeof TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION;
  readonly evidenceId: string;
  readonly subjectActorId: string;
  readonly actorKind: "real-human";
  readonly authorizedRole:
    | "independent-preschool-education-expert"
    | "pedagogical-review-coordinator";
  readonly scope: typeof TYMM_HUMAN_REVIEW_IDENTITY_SCOPE;
  readonly methodVersion: typeof TYMM_HUMAN_REVIEW_METHOD_VERSION;
  readonly verificationMethod:
    | "institutional-attestation"
    | "qualified-electronic-signature"
    | "manual-authority-check";
  readonly verifiedByActorId: string;
  readonly verifiedAtUtc: string;
  readonly validFromUtc: string;
  readonly expiresAtUtc: string;
  readonly status: "ACTIVE" | "SUPERSEDED" | "REVOKED";
  readonly revocationStatus: "KNOWN_CLEAR" | "REVOKED" | "UNKNOWN";
  readonly evidenceSha256: `sha256:${string}`;
}

export type TymmHumanIdentityEvidenceResolver = (
  evidenceId: string,
) => unknown | null;

export type TymmMappingPublicationStatus =
  | "pending-human-review"
  | "changes-requested"
  | "conflict-requires-resolution"
  | "rejected"
  | "publishable"
  | "invalid-ledger";

export interface TymmMappingReviewEvaluation {
  readonly subject: TymmMappingReviewSubject;
  readonly status: TymmMappingPublicationStatus;
  readonly publishable: boolean;
  readonly countedReviewEventIds: readonly string[];
  readonly issues: readonly string[];
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const MACHINE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._:-]{0,198}[a-z0-9])?$/u;
const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const FORBIDDEN_TEXT_PATTERN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

const SUBJECT_KEYS = [
  "schemaVersion",
  "reviewItemId",
  "candidateMappingSha256",
  "proposerActorId",
  "proposedAtUtc",
  "civilDate",
] as const;
const SCOPE_KEYS = ["reviewItemId", "candidateMappingSha256", "criteria"] as const;
const REVIEWER_KEYS = [
  "actorId",
  "actorKind",
  "role",
  "independentReviewer",
  "conflictOfInterestCleared",
  "identityEvidenceId",
] as const;
const REVIEW_EVENT_KEYS = [
  "schemaVersion",
  "eventType",
  "eventId",
  "subject",
  "reviewer",
  "scope",
  "reviewedAtUtc",
  "civilDate",
  "rationale",
  "decision",
  "findingIds",
  "authorizationReference",
  "reviewArtifactSha256",
] as const;
const RESOLVER_KEYS = [
  "actorId",
  "actorKind",
  "role",
  "identityEvidenceId",
] as const;
const CONFLICT_EVENT_KEYS = [
  "schemaVersion",
  "eventType",
  "eventId",
  "subject",
  "resolver",
  "conflictingReviewEventIds",
  "decidedAtUtc",
  "civilDate",
  "rationale",
  "decision",
  "authorizationReference",
  "resolutionArtifactSha256",
] as const;
const LEDGER_LINE_KEYS = ["sequence", "previousHash", "event", "eventHash"] as const;
const IDENTITY_EVIDENCE_KEYS = [
  "schemaVersion",
  "evidenceId",
  "subjectActorId",
  "actorKind",
  "authorizedRole",
  "scope",
  "methodVersion",
  "verificationMethod",
  "verifiedByActorId",
  "verifiedAtUtc",
  "validFromUtc",
  "expiresAtUtc",
  "status",
  "revocationStatus",
  "evidenceSha256",
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

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return Object.freeze(value);
}

function machineId(value: unknown, label: string): string {
  if (typeof value !== "string" || !MACHINE_ID_PATTERN.test(value)) {
    throw new Error(`${label} kanonik, kişisel bilgi taşımayan makine kimliği olmalıdır.`);
  }
  return value;
}

function uuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} kanonik küçük harfli UUID olmalıdır.`);
  }
  return value;
}

function digest(value: unknown, label: string): `sha256:${string}` {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} sha256: önekli küçük harfli SHA-256 olmalıdır.`);
  }
  return value as `sha256:${string}`;
}

function nfcText(
  value: unknown,
  label: string,
  minimumLength: number,
  maximumLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.length < minimumLength ||
    value.length > maximumLength ||
    value !== value.trim() ||
    value !== value.normalize("NFC") ||
    FORBIDDEN_TEXT_PATTERN.test(value)
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

function istanbulCivilDate(utc: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(utc));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function civilDate(value: unknown, utc: string, label: string): string {
  if (
    typeof value !== "string" ||
    !CIVIL_DATE_PATTERN.test(value) ||
    value !== istanbulCivilDate(utc)
  ) {
    throw new Error(`${label} UTC zamanının Europe/Istanbul sivil tarihi olmalıdır.`);
  }
  return value;
}

function uniqueUuidArray(
  value: unknown,
  label: string,
  minimumLength = 0,
): readonly string[] {
  if (!Array.isArray(value) || value.length < minimumLength) {
    throw new Error(`${label} en az ${minimumLength} öğeli dizi olmalıdır.`);
  }
  const parsed = value.map((item, index) => uuid(item, `${label}[${index}]`));
  if (new Set(parsed).size !== parsed.length) {
    throw new Error(`${label} mükerrer kimlik taşıyamaz.`);
  }
  return Object.freeze(parsed);
}

export function parseTymmMappingReviewSubject(
  value: unknown,
): TymmMappingReviewSubject {
  const item = exactRecord(value, SUBJECT_KEYS, "TYMM eşleme inceleme konusu");
  if (item.schemaVersion !== TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION) {
    throw new Error("TYMM eşleme inceleme konusu desteklenen şema sürümünü taşımalıdır.");
  }
  const proposedAtUtc = utcTimestamp(item.proposedAtUtc, "Öneri zamanı");
  return deepFreeze({
    schemaVersion: TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION,
    reviewItemId: machineId(item.reviewItemId, "İnceleme satırı kimliği"),
    candidateMappingSha256: digest(item.candidateMappingSha256, "Aday eşleme özeti"),
    proposerActorId: machineId(item.proposerActorId, "Öneren aktör kimliği"),
    proposedAtUtc,
    civilDate: civilDate(item.civilDate, proposedAtUtc, "Öneri sivil tarihi"),
  });
}

function sameSubject(
  left: TymmMappingReviewSubject,
  right: TymmMappingReviewSubject,
): boolean {
  return SUBJECT_KEYS.every((key) => left[key] === right[key]);
}

function parseScope(value: unknown): TymmHumanReviewScope {
  const item = exactRecord(value, SCOPE_KEYS, "TYMM insan inceleme kapsamı");
  if (
    !Array.isArray(item.criteria) ||
    item.criteria.length !== TYMM_HUMAN_REVIEW_CRITERIA.length ||
    item.criteria.some(
      (criterion, index) => criterion !== TYMM_HUMAN_REVIEW_CRITERIA[index],
    )
  ) {
    throw new Error("TYMM insan incelemesi dört exact kapsam ölçütünü kanonik sırada taşımalıdır.");
  }
  return deepFreeze({
    reviewItemId: machineId(item.reviewItemId, "İnceleme kapsam satırı kimliği"),
    candidateMappingSha256: digest(
      item.candidateMappingSha256,
      "İnceleme kapsam eşleme özeti",
    ),
    criteria: [...TYMM_HUMAN_REVIEW_CRITERIA],
  });
}

function parseActorKind(value: unknown): TymmHumanReviewActorKind {
  if (value !== "real-human" && value !== "agent" && value !== "fictional-test") {
    throw new Error("İnceleyen aktör türü real-human, agent veya fictional-test olmalıdır.");
  }
  return value;
}

function nullableEvidenceId(value: unknown): string | null {
  if (value === null) return null;
  return uuid(value, "Kimlik kanıtı kimliği");
}

function parseReviewer(value: unknown): TymmHumanReviewerIdentity {
  const item = exactRecord(value, REVIEWER_KEYS, "TYMM insan inceleyen kimliği");
  if (item.role !== "independent-preschool-education-expert") {
    throw new Error("TYMM eşlemesini yalnız bağımsız okul öncesi eğitim uzmanı inceleyebilir.");
  }
  return deepFreeze({
    actorId: machineId(item.actorId, "İnceleyen aktör kimliği"),
    actorKind: parseActorKind(item.actorKind),
    role: "independent-preschool-education-expert",
    independentReviewer: item.independentReviewer === true,
    conflictOfInterestCleared: item.conflictOfInterestCleared === true,
    identityEvidenceId: nullableEvidenceId(item.identityEvidenceId),
  });
}

function parseReviewEvent(value: unknown): TymmHumanReviewDecisionEvent {
  const item = exactRecord(value, REVIEW_EVENT_KEYS, "TYMM insan inceleme kararı");
  if (
    item.schemaVersion !== TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION ||
    item.eventType !== "REVIEW_DECIDED"
  ) {
    throw new Error("TYMM insan inceleme kararı şema ve olay türü geçersiz.");
  }
  const subject = parseTymmMappingReviewSubject(item.subject);
  const reviewer = parseReviewer(item.reviewer);
  const scope = parseScope(item.scope);
  if (
    scope.reviewItemId !== subject.reviewItemId ||
    scope.candidateMappingSha256 !== subject.candidateMappingSha256
  ) {
    throw new Error("İnsan inceleme kapsamı exact aday eşleme konusuyla uyuşmalıdır.");
  }
  const reviewedAtUtc = utcTimestamp(item.reviewedAtUtc, "İnceleme zamanı");
  if (Date.parse(reviewedAtUtc) < Date.parse(subject.proposedAtUtc)) {
    throw new Error("İnceleme öneriden önce verilemez.");
  }
  if (
    item.decision !== "APPROVE" &&
    item.decision !== "REQUEST_CHANGES" &&
    item.decision !== "REJECT"
  ) {
    throw new Error("İnceleme kararı APPROVE, REQUEST_CHANGES veya REJECT olmalıdır.");
  }
  const findingIds = uniqueUuidArray(item.findingIds, "İnceleme bulgu kimlikleri");
  if (item.decision === "APPROVE" && findingIds.length !== 0) {
    throw new Error("APPROVE kararı açık bulgu taşıyamaz.");
  }
  if (item.decision !== "APPROVE" && findingIds.length === 0) {
    throw new Error("Düzeltme veya ret kararı en az bir açık bulgu taşımalıdır.");
  }
  return deepFreeze({
    schemaVersion: TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION,
    eventType: "REVIEW_DECIDED",
    eventId: uuid(item.eventId, "İnceleme olay kimliği"),
    subject,
    reviewer,
    scope,
    reviewedAtUtc,
    civilDate: civilDate(item.civilDate, reviewedAtUtc, "İnceleme sivil tarihi"),
    rationale: nfcText(item.rationale, "İnceleme gerekçesi", 20, 4_000),
    decision: item.decision,
    findingIds,
    authorizationReference: nfcText(
      item.authorizationReference,
      "İnceleme yetki referansı",
      3,
      240,
    ),
    reviewArtifactSha256: digest(item.reviewArtifactSha256, "İnceleme kanıt özeti"),
  });
}

function parseConflictEvent(value: unknown): TymmHumanConflictResolutionEvent {
  const item = exactRecord(value, CONFLICT_EVENT_KEYS, "TYMM çelişki çözümü");
  if (
    item.schemaVersion !== TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION ||
    item.eventType !== "CONFLICT_RESOLVED"
  ) {
    throw new Error("TYMM çelişki çözümü şema ve olay türü geçersiz.");
  }
  const subject = parseTymmMappingReviewSubject(item.subject);
  const resolver = exactRecord(item.resolver, RESOLVER_KEYS, "TYMM çelişki çözen kimliği");
  if (resolver.role !== "pedagogical-review-coordinator") {
    throw new Error("Çelişkiyi yalnız pedagojik inceleme koordinatörü çözebilir.");
  }
  if (
    item.decision !== "REQUEST_FRESH_REVIEWS" &&
    item.decision !== "REJECT_CANDIDATE"
  ) {
    throw new Error("Koordinatör çelişkili adayı tek başına onaylayamaz.");
  }
  const decidedAtUtc = utcTimestamp(item.decidedAtUtc, "Çelişki çözüm zamanı");
  return deepFreeze({
    schemaVersion: TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION,
    eventType: "CONFLICT_RESOLVED",
    eventId: uuid(item.eventId, "Çelişki çözüm olay kimliği"),
    subject,
    resolver: {
      actorId: machineId(resolver.actorId, "Çelişki çözen aktör kimliği"),
      actorKind: parseActorKind(resolver.actorKind),
      role: "pedagogical-review-coordinator",
      identityEvidenceId: nullableEvidenceId(resolver.identityEvidenceId),
    },
    conflictingReviewEventIds: uniqueUuidArray(
      item.conflictingReviewEventIds,
      "Çelişkili inceleme olayları",
      2,
    ),
    decidedAtUtc,
    civilDate: civilDate(item.civilDate, decidedAtUtc, "Çelişki çözüm sivil tarihi"),
    rationale: nfcText(item.rationale, "Çelişki çözüm gerekçesi", 20, 4_000),
    decision: item.decision,
    authorizationReference: nfcText(
      item.authorizationReference,
      "Çelişki çözüm yetki referansı",
      3,
      240,
    ),
    resolutionArtifactSha256: digest(
      item.resolutionArtifactSha256,
      "Çelişki çözüm kanıt özeti",
    ),
  });
}

export function parseTymmHumanReviewLedgerEvent(
  value: unknown,
): TymmHumanReviewLedgerEvent {
  if (!isRecord(value)) throw new Error("TYMM insan inceleme olayı nesne olmalıdır.");
  if (value.eventType === "REVIEW_DECIDED") return parseReviewEvent(value);
  if (value.eventType === "CONFLICT_RESOLVED") return parseConflictEvent(value);
  throw new Error("TYMM insan inceleme olay türü desteklenmiyor.");
}

function parseLedgerLine(value: unknown): TymmHumanReviewLedgerLine {
  const item = exactRecord(value, LEDGER_LINE_KEYS, "TYMM insan inceleme defteri satırı");
  if (!Number.isSafeInteger(item.sequence) || (item.sequence as number) < 1) {
    throw new Error("TYMM insan inceleme defteri sırası pozitif güvenli tam sayı olmalıdır.");
  }
  return deepFreeze({
    sequence: item.sequence as number,
    previousHash: digest(item.previousHash, "Önceki defter satırı özeti"),
    event: parseTymmHumanReviewLedgerEvent(item.event),
    eventHash: digest(item.eventHash, "Defter satırı özeti"),
  });
}

async function ledgerLineHash(
  sequence: number,
  previousHash: `sha256:${string}`,
  event: TymmHumanReviewLedgerEvent,
): Promise<`sha256:${string}`> {
  return `sha256:${await sha256Hex(canonicalJson({ sequence, previousHash, event }))}`;
}

export async function verifyTymmHumanReviewLedger(
  values: readonly unknown[],
): Promise<readonly TymmHumanReviewLedgerLine[]> {
  if (!Array.isArray(values)) throw new Error("TYMM insan inceleme defteri dizi olmalıdır.");
  const lines = values.map(parseLedgerLine);
  if (new Set(lines.map((line) => line.event.eventId)).size !== lines.length) {
    throw new Error("TYMM insan inceleme defteri mükerrer olay kimliği taşıyor.");
  }
  let previousHash = TYMM_HUMAN_REVIEW_GENESIS_HASH;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.sequence !== index + 1 || line.previousHash !== previousHash) {
      throw new Error("TYMM insan inceleme defteri sıra veya önceki hash zinciri bozuk.");
    }
    const expectedHash = await ledgerLineHash(line.sequence, line.previousHash, line.event);
    if (line.eventHash !== expectedHash) {
      throw new Error("TYMM insan inceleme defteri olay hash'i doğrulanamadı.");
    }
    previousHash = line.eventHash;
  }
  return deepFreeze(lines);
}

/** Geçmişi değiştirmeden, doğrulanmış zincirin sonuna tek olay ekler. */
export async function appendTymmHumanReviewLedgerEvent(
  currentValues: readonly unknown[],
  eventValue: unknown,
): Promise<readonly TymmHumanReviewLedgerLine[]> {
  const current = await verifyTymmHumanReviewLedger(currentValues);
  const event = parseTymmHumanReviewLedgerEvent(eventValue);
  if (current.some((line) => line.event.eventId === event.eventId)) {
    throw new Error("TYMM insan inceleme olayı ikinci kez eklenemez.");
  }
  const sequence = current.length + 1;
  const previousHash = current.at(-1)?.eventHash ?? TYMM_HUMAN_REVIEW_GENESIS_HASH;
  const eventHash = await ledgerLineHash(sequence, previousHash, event);
  return deepFreeze([
    ...current,
    { sequence, previousHash, event, eventHash },
  ]);
}

function parseIdentityEvidence(value: unknown): TymmHumanIdentityEvidence {
  const item = exactRecord(value, IDENTITY_EVIDENCE_KEYS, "İnsan kimliği yetki kanıtı");
  if (
    item.schemaVersion !== TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION ||
    item.actorKind !== "real-human" ||
    item.scope !== TYMM_HUMAN_REVIEW_IDENTITY_SCOPE ||
    item.methodVersion !== TYMM_HUMAN_REVIEW_METHOD_VERSION
  ) {
    throw new Error("İnsan kimliği kanıtı şema, aktör, kapsam veya yöntem sürümü uyuşmuyor.");
  }
  if (
    item.authorizedRole !== "independent-preschool-education-expert" &&
    item.authorizedRole !== "pedagogical-review-coordinator"
  ) {
    throw new Error("İnsan kimliği kanıtı yetkili inceleme rolü taşımıyor.");
  }
  if (
    item.verificationMethod !== "institutional-attestation" &&
    item.verificationMethod !== "qualified-electronic-signature" &&
    item.verificationMethod !== "manual-authority-check"
  ) {
    throw new Error("İnsan kimliği kanıtı doğrulama yöntemi desteklenmiyor.");
  }
  if (
    item.status !== "ACTIVE" &&
    item.status !== "SUPERSEDED" &&
    item.status !== "REVOKED"
  ) {
    throw new Error("İnsan kimliği kanıtı durumu geçersiz.");
  }
  if (
    item.revocationStatus !== "KNOWN_CLEAR" &&
    item.revocationStatus !== "REVOKED" &&
    item.revocationStatus !== "UNKNOWN"
  ) {
    throw new Error("İnsan kimliği kanıtı iptal durumu geçersiz.");
  }
  const verifiedAtUtc = utcTimestamp(item.verifiedAtUtc, "Kimlik doğrulama zamanı");
  const validFromUtc = utcTimestamp(item.validFromUtc, "Kimlik kanıtı başlangıcı");
  const expiresAtUtc = utcTimestamp(item.expiresAtUtc, "Kimlik kanıtı sonu");
  if (
    Date.parse(verifiedAtUtc) >= Date.parse(expiresAtUtc) ||
    Date.parse(validFromUtc) >= Date.parse(expiresAtUtc)
  ) {
    throw new Error("İnsan kimliği kanıtı zaman aralığı geçersiz.");
  }
  return deepFreeze({
    schemaVersion: TYMM_HUMAN_REVIEW_LEDGER_SCHEMA_VERSION,
    evidenceId: uuid(item.evidenceId, "Kimlik kanıtı kimliği"),
    subjectActorId: machineId(item.subjectActorId, "Kimlik kanıtı aktör kimliği"),
    actorKind: "real-human",
    authorizedRole: item.authorizedRole,
    scope: TYMM_HUMAN_REVIEW_IDENTITY_SCOPE,
    methodVersion: TYMM_HUMAN_REVIEW_METHOD_VERSION,
    verificationMethod: item.verificationMethod,
    verifiedByActorId: machineId(item.verifiedByActorId, "Kimliği doğrulayan aktör kimliği"),
    verifiedAtUtc,
    validFromUtc,
    expiresAtUtc,
    status: item.status,
    revocationStatus: item.revocationStatus,
    evidenceSha256: digest(item.evidenceSha256, "Kimlik kanıtı teknik özeti"),
  });
}

function resolveActiveIdentity(
  actor: {
    readonly actorId: string;
    readonly actorKind: TymmHumanReviewActorKind;
    readonly role:
      | "independent-preschool-education-expert"
      | "pedagogical-review-coordinator";
    readonly identityEvidenceId: string | null;
  },
  occurredAtUtc: string,
  asOfUtc: string,
  resolver: TymmHumanIdentityEvidenceResolver | null | undefined,
): boolean {
  if (
    actor.actorKind !== "real-human" ||
    actor.identityEvidenceId === null ||
    !resolver
  ) {
    return false;
  }
  try {
    const candidate = resolver(actor.identityEvidenceId);
    if (candidate === null || candidate === undefined) return false;
    const evidence = parseIdentityEvidence(candidate);
    return (
      evidence.evidenceId === actor.identityEvidenceId &&
      evidence.subjectActorId === actor.actorId &&
      evidence.authorizedRole === actor.role &&
      evidence.verifiedByActorId !== actor.actorId &&
      evidence.status === "ACTIVE" &&
      evidence.revocationStatus === "KNOWN_CLEAR" &&
      Date.parse(evidence.verifiedAtUtc) <= Date.parse(occurredAtUtc) &&
      Date.parse(evidence.validFromUtc) <= Date.parse(occurredAtUtc) &&
      Date.parse(occurredAtUtc) < Date.parse(evidence.expiresAtUtc) &&
      Date.parse(evidence.validFromUtc) <= Date.parse(asOfUtc) &&
      Date.parse(asOfUtc) < Date.parse(evidence.expiresAtUtc)
    );
  } catch {
    return false;
  }
}

function evaluation(
  subject: TymmMappingReviewSubject,
  status: TymmMappingPublicationStatus,
  countedReviewEventIds: readonly string[],
  issues: readonly string[],
): TymmMappingReviewEvaluation {
  return deepFreeze({
    subject,
    status,
    publishable: status === "publishable",
    countedReviewEventIds: [...countedReviewEventIds],
    issues: [...issues],
  });
}

/**
 * Uygulama gerçek kişi kimliği kurmaz. Yalnız güvenilir dış sicil resolver'ının
 * active, iptal edilmemiş ve exact kapsamlı kanıtla doğruladığı insanları sayar.
 */
export async function evaluateTymmMappingReview(input: {
  readonly subject: unknown;
  readonly ledger: readonly unknown[];
  readonly asOfUtc: string;
  readonly resolveIdentityEvidence?: TymmHumanIdentityEvidenceResolver | null;
}): Promise<TymmMappingReviewEvaluation> {
  const subject = parseTymmMappingReviewSubject(input.subject);
  const asOfUtc = utcTimestamp(input.asOfUtc, "İnceleme değerlendirme zamanı");
  let lines: readonly TymmHumanReviewLedgerLine[];
  try {
    lines = await verifyTymmHumanReviewLedger(input.ledger);
  } catch (error) {
    return evaluation(subject, "invalid-ledger", [], [
      error instanceof Error ? error.message : "İnceleme defteri doğrulanamadı.",
    ]);
  }

  let activeReviews: TymmHumanReviewDecisionEvent[] = [];
  const issues: string[] = [];
  for (const line of lines) {
    const event = line.event;
    if (!sameSubject(subject, event.subject)) continue;
    if (Date.parse(event.eventType === "REVIEW_DECIDED" ? event.reviewedAtUtc : event.decidedAtUtc) > Date.parse(asOfUtc)) {
      issues.push(`${event.eventId}: değerlendirme zamanından sonra`);
      continue;
    }

    if (event.eventType === "REVIEW_DECIDED") {
      if (
        event.reviewer.actorId === subject.proposerActorId ||
        !event.reviewer.independentReviewer ||
        !event.reviewer.conflictOfInterestCleared ||
        !resolveActiveIdentity(
          event.reviewer,
          event.reviewedAtUtc,
          asOfUtc,
          input.resolveIdentityEvidence,
        )
      ) {
        issues.push(`${event.eventId}: doğrulanabilir bağımsız gerçek insan incelemesi değil`);
        continue;
      }
      activeReviews.push(event);
      continue;
    }

    if (
      !resolveActiveIdentity(
        event.resolver,
        event.decidedAtUtc,
        asOfUtc,
        input.resolveIdentityEvidence,
      )
    ) {
      issues.push(`${event.eventId}: çelişki çözen gerçek insan yetkisi doğrulanamadı`);
      continue;
    }
    const referenced = activeReviews.filter((review) =>
      event.conflictingReviewEventIds.includes(review.eventId),
    );
    const referencedDecisions = new Set(referenced.map((review) => review.decision));
    const latestReferencedTime = Math.max(...referenced.map((review) => Date.parse(review.reviewedAtUtc)));
    const validConflict =
      referenced.length === event.conflictingReviewEventIds.length &&
      referenced.length === activeReviews.length &&
      referenced.length >= 2 &&
      referencedDecisions.size >= 2 &&
      !referenced.some((review) => review.reviewer.actorId === event.resolver.actorId) &&
      latestReferencedTime <= Date.parse(event.decidedAtUtc);
    if (!validConflict) {
      issues.push(`${event.eventId}: exact çelişkili inceleme kümesi doğrulanamadı`);
      continue;
    }
    if (event.decision === "REJECT_CANDIDATE") {
      return evaluation(
        subject,
        "rejected",
        referenced.map((review) => review.eventId),
        issues,
      );
    }
    activeReviews = [];
    issues.push(`${event.eventId}: çelişki sonrası taze iki inceleme gerekli`);
  }

  if (activeReviews.length === 0) {
    return evaluation(subject, "pending-human-review", [], issues);
  }
  const decisions = new Set(activeReviews.map((review) => review.decision));
  if (decisions.size > 1) {
    return evaluation(
      subject,
      "conflict-requires-resolution",
      activeReviews.map((review) => review.eventId),
      issues,
    );
  }
  if (activeReviews.some((review) => review.decision === "REJECT")) {
    return evaluation(
      subject,
      "rejected",
      activeReviews.map((review) => review.eventId),
      issues,
    );
  }
  if (activeReviews.some((review) => review.decision === "REQUEST_CHANGES")) {
    return evaluation(
      subject,
      "changes-requested",
      activeReviews.map((review) => review.eventId),
      issues,
    );
  }

  const distinctActors = new Set(activeReviews.map((review) => review.reviewer.actorId));
  if (activeReviews.length !== 2 || distinctActors.size !== 2) {
    issues.push("Yayımlanabilir durum exact iki ayrı doğrulanmış uzman incelemesi gerektirir.");
    return evaluation(
      subject,
      "pending-human-review",
      activeReviews.map((review) => review.eventId),
      issues,
    );
  }
  return evaluation(
    subject,
    "publishable",
    activeReviews.map((review) => review.eventId),
    issues,
  );
}
