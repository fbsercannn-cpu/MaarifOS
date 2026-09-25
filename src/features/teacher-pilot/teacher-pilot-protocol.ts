export const TEACHER_PILOT_PROTOCOL_SCHEMA_VERSION = 1 as const;
export const TEACHER_PILOT_PARTICIPANT_METHOD_VERSION = "1.0" as const;
export const TEACHER_PILOT_PARTICIPANT_SCOPE =
  "maarifos-teacher-workload-pilot" as const;

export const TEACHER_PILOT_TASK_IDS = Object.freeze([
  "P01",
  "P02",
  "P03",
  "P04",
] as const);
export type TeacherPilotTaskId = (typeof TEACHER_PILOT_TASK_IDS)[number];

export const TEACHER_PILOT_TARGET_CONTRACT = Object.freeze({
  schemaVersion: TEACHER_PILOT_PROTOCOL_SCHEMA_VERSION,
  contractId: "maarifos-teacher-workload-pilot-v1",
  frozenCivilDate: "2026-09-09",
  participantCount: 5,
  tasksPerParticipant: 4,
  expectedRawObservationCount: 20,
  participantEligibility: "verified-real-preschool-teacher",
  tasks: Object.freeze([
    Object.freeze({
      id: "P01",
      name: "quick-observation",
      instruction:
        "Çocuk satırından bir gözlem aç, verilen kısa kurgu metni ve kaynağı gir, kaydet. Başlangıç: görev kartı okunup uygulamaya dönüldüğü an. Bitiş: kayıt başarıyla görünür.",
    }),
    Object.freeze({
      id: "P02",
      name: "official-report-preparation",
      instruction:
        "Aynı çocuğun iki kaynak gözlemini doğru dönem ve program alanıyla Ek4/e-Okul hazırlık görünümünde bulun. Bitiş: iki doğru kaynak ve dönem gösterilir. Bu işlem resmî sisteme aktarım değildir.",
    }),
    Object.freeze({
      id: "P03",
      name: "official-appointment-preparation",
      instruction:
        "Hazır yerel görüşme hazırlığını açın, resmî sisteme geçiş yolunu gösterin ve resmî işlemin henüz tamamlanmadığını doğru açıklayın. Gerçek randevu oluşturulmaz. Bitiş: yerel hazırlık ile resmî işlem ayrımı doğru anlatılır.",
    }),
    Object.freeze({
      id: "P04",
      name: "scoped-document-export",
      instruction:
        "Yalnız belirtilen çocuğu ve alanları seçin, alıcı/amaç özetini doğrulayın ve PDF'yi indirin. Bitiş: dosya açılır ve doğru çocuk/alan kapsamı gözlemci tarafından doğrulanır.",
    }),
  ]),
  acceptanceThresholds: Object.freeze({
    minimumCorrectObservations: 19,
    maximumMedianDurationMs: 25_000,
    maximumSuccessfulObservationDurationMs: 45_000,
    maximumWrongChildOrScopeIncidents: 0,
    maximumFalseOfficialCompletionClaims: 0,
    maximumMedianRetryEntryCount: 0,
  }),
  secondaryDesignTarget: Object.freeze({
    taskId: "P01",
    maximumDurationMs: 15_000,
    acceptanceThreshold: false,
    explanation:
      "15 saniye yalnız P01 için ikincil tasarım hedefidir; pilot kabul eşiği değildir.",
  }),
  rawDataPolicy: Object.freeze({
    keepFailedObservations: true,
    keepAssistedObservations: true,
    keepAbandonedObservations: true,
    winsorizeDurations: false,
    trimOutliers: false,
    overwriteDuplicateParticipantTask: false,
  }),
} as const);

export type TeacherPilotObservationOrigin =
  | "observed-real-human-session"
  | "synthetic-contract-fixture";
export type TeacherPilotTaskOutcome = "successful" | "failed" | "abandoned";

export interface TeacherPilotRawObservation {
  readonly schemaVersion: typeof TEACHER_PILOT_PROTOCOL_SCHEMA_VERSION;
  readonly recordId: string;
  readonly pilotRunId: string;
  readonly contractId: typeof TEACHER_PILOT_TARGET_CONTRACT.contractId;
  readonly participantRef: string;
  readonly participantEvidenceId: string | null;
  readonly participantEvidenceSha256: `sha256:${string}` | null;
  readonly taskId: TeacherPilotTaskId;
  readonly startedAtUtc: string;
  readonly finishedAtUtc: string;
  readonly civilDate: string;
  readonly durationMs: number;
  readonly outcome: TeacherPilotTaskOutcome;
  readonly correctCompletion: boolean;
  readonly assisted: boolean;
  readonly errorCount: number;
  readonly retryEntryCount: number;
  readonly wrongChildOrScopeIncident: boolean;
  readonly falseOfficialCompletionClaim: boolean;
  readonly origin: TeacherPilotObservationOrigin;
  readonly observerAttestation: boolean;
}

export interface TeacherPilotParticipantEvidence {
  readonly schemaVersion: typeof TEACHER_PILOT_PROTOCOL_SCHEMA_VERSION;
  readonly evidenceId: string;
  readonly participantRef: string;
  readonly role: "real-preschool-teacher";
  readonly scope: typeof TEACHER_PILOT_PARTICIPANT_SCOPE;
  readonly methodVersion: typeof TEACHER_PILOT_PARTICIPANT_METHOD_VERSION;
  readonly verifiedByActorRef: string;
  readonly verifiedAtUtc: string;
  readonly validFromUtc: string;
  readonly expiresAtUtc: string;
  readonly status: "ACTIVE" | "SUPERSEDED" | "REVOKED";
  readonly revocationStatus: "KNOWN_CLEAR" | "REVOKED" | "UNKNOWN";
  readonly evidenceSha256: `sha256:${string}`;
}

export type TeacherPilotParticipantEvidenceResolver = (
  evidenceId: string,
) => unknown | null;

export interface TeacherPilotCriterionResults {
  readonly observationCoverage: boolean;
  readonly correctObservations: boolean;
  readonly medianDuration: boolean;
  readonly successfulTaskDurationCeiling: boolean;
  readonly wrongChildOrScopeIncidents: boolean;
  readonly falseOfficialCompletionClaims: boolean;
  readonly medianRetryEntryCount: boolean;
}

export interface TeacherPilotMetrics {
  readonly rawObservationCount: number;
  readonly distinctParticipantCount: number;
  readonly correctObservationCount: number;
  readonly assistedObservationCount: number;
  readonly failedObservationCount: number;
  readonly abandonedObservationCount: number;
  readonly medianDurationMs: number | null;
  readonly slowSuccessfulObservationIds: readonly string[];
  readonly wrongChildOrScopeIncidentCount: number;
  readonly falseOfficialCompletionClaimCount: number;
  readonly medianRetryEntryCount: number | null;
}

export interface TeacherPilotEvaluation {
  readonly status:
    | "awaiting-real-human-data"
    | "incomplete-real-human-data"
    | "ready-for-independent-analysis"
    | "invalid-records"
    | "simulation-only";
  readonly targetMet: boolean | null;
  readonly metrics: TeacherPilotMetrics;
  readonly criteria: TeacherPilotCriterionResults;
  readonly issues: readonly string[];
  readonly observations: readonly TeacherPilotRawObservation[];
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const MACHINE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._:-]{0,118}[a-z0-9])?$/u;
const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

const OBSERVATION_KEYS = [
  "schemaVersion",
  "recordId",
  "pilotRunId",
  "contractId",
  "participantRef",
  "participantEvidenceId",
  "participantEvidenceSha256",
  "taskId",
  "startedAtUtc",
  "finishedAtUtc",
  "civilDate",
  "durationMs",
  "outcome",
  "correctCompletion",
  "assisted",
  "errorCount",
  "retryEntryCount",
  "wrongChildOrScopeIncident",
  "falseOfficialCompletionClaim",
  "origin",
  "observerAttestation",
] as const;
const PARTICIPANT_EVIDENCE_KEYS = [
  "schemaVersion",
  "evidenceId",
  "participantRef",
  "role",
  "scope",
  "methodVersion",
  "verifiedByActorRef",
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

function uuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} kanonik küçük harfli UUID olmalıdır.`);
  }
  return value;
}

function machineId(value: unknown, label: string): string {
  if (typeof value !== "string" || !MACHINE_ID_PATTERN.test(value)) {
    throw new Error(`${label} kişisel bilgi taşımayan kanonik kimlik olmalıdır.`);
  }
  return value;
}

function digest(value: unknown, label: string): `sha256:${string}` {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} sha256: önekli küçük harfli SHA-256 olmalıdır.`);
  }
  return value as `sha256:${string}`;
}

function nullableUuid(value: unknown, label: string): string | null {
  return value === null ? null : uuid(value, label);
}

function nullableDigest(
  value: unknown,
  label: string,
): `sha256:${string}` | null {
  return value === null ? null : digest(value, label);
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} kesin bool olmalıdır.`);
  return value;
}

function count(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 1_000) {
    throw new Error(`${label} 0–1000 aralığında tam sayı olmalıdır.`);
  }
  return value as number;
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

function taskId(value: unknown): TeacherPilotTaskId {
  if (!(TEACHER_PILOT_TASK_IDS as readonly unknown[]).includes(value)) {
    throw new Error("Pilot görev kimliği P01, P02, P03 veya P04 olmalıdır.");
  }
  return value as TeacherPilotTaskId;
}

export function parseTeacherPilotRawObservation(
  value: unknown,
): TeacherPilotRawObservation {
  const item = exactRecord(value, OBSERVATION_KEYS, "Öğretmen pilotu ham gözlemi");
  if (
    item.schemaVersion !== TEACHER_PILOT_PROTOCOL_SCHEMA_VERSION ||
    item.contractId !== TEACHER_PILOT_TARGET_CONTRACT.contractId
  ) {
    throw new Error("Öğretmen pilotu gözlemi exact hedef sözleşmesine bağlı olmalıdır.");
  }
  if (
    item.origin !== "observed-real-human-session" &&
    item.origin !== "synthetic-contract-fixture"
  ) {
    throw new Error("Öğretmen pilotu gözlem kökeni geçersiz.");
  }
  if (
    item.outcome !== "successful" &&
    item.outcome !== "failed" &&
    item.outcome !== "abandoned"
  ) {
    throw new Error("Öğretmen pilotu görev sonucu geçersiz.");
  }
  const startedAtUtc = utcTimestamp(item.startedAtUtc, "Görev başlangıcı");
  const finishedAtUtc = utcTimestamp(item.finishedAtUtc, "Görev bitişi");
  const elapsedUtc = Date.parse(finishedAtUtc) - Date.parse(startedAtUtc);
  if (elapsedUtc < 0) throw new Error("Öğretmen pilotu görevi başlamadan bitemez.");
  if (
    !Number.isSafeInteger(item.durationMs) ||
    (item.durationMs as number) < 1 ||
    (item.durationMs as number) > 3_600_000
  ) {
    throw new Error("Ham görev süresi 1–3.600.000 ms aralığında tam sayı olmalıdır.");
  }
  if (
    typeof item.civilDate !== "string" ||
    !CIVIL_DATE_PATTERN.test(item.civilDate) ||
    item.civilDate !== istanbulCivilDate(finishedAtUtc)
  ) {
    throw new Error("Pilot sivil tarihi bitiş zamanının Europe/Istanbul tarihi olmalıdır.");
  }
  const participantEvidenceId = nullableUuid(
    item.participantEvidenceId,
    "Pilot öğretmen kanıt kimliği",
  );
  const participantEvidenceSha256 = nullableDigest(
    item.participantEvidenceSha256,
    "Pilot öğretmen kanıt özeti",
  );
  if ((participantEvidenceId === null) !== (participantEvidenceSha256 === null)) {
    throw new Error("Pilot öğretmen kanıt kimliği ve özeti birlikte bulunmalıdır.");
  }
  const observerAttestation = boolean(item.observerAttestation, "Gözlemci beyanı");
  if (
    item.origin === "observed-real-human-session" &&
    (!observerAttestation || participantEvidenceId === null)
  ) {
    throw new Error("Gerçek insan pilot kaydı gözlemci beyanı ve öğretmen kanıtı gerektirir.");
  }
  if (
    item.origin === "synthetic-contract-fixture" &&
    (observerAttestation || participantEvidenceId !== null)
  ) {
    throw new Error("Sentetik sözleşme fixture'ı gerçek insan kanıtı veya beyanı taşıyamaz.");
  }
  const correctCompletion = boolean(item.correctCompletion, "Doğru tamamlama");
  if (item.outcome !== "successful" && correctCompletion) {
    throw new Error("Başarısız veya bırakılan görev doğru tamamlandı sayılamaz.");
  }
  return deepFreeze({
    schemaVersion: TEACHER_PILOT_PROTOCOL_SCHEMA_VERSION,
    recordId: uuid(item.recordId, "Ham gözlem kimliği"),
    pilotRunId: machineId(item.pilotRunId, "Pilot koşusu kimliği"),
    contractId: TEACHER_PILOT_TARGET_CONTRACT.contractId,
    participantRef: machineId(item.participantRef, "Pilot öğretmen pseudonymous kimliği"),
    participantEvidenceId,
    participantEvidenceSha256,
    taskId: taskId(item.taskId),
    startedAtUtc,
    finishedAtUtc,
    civilDate: item.civilDate,
    durationMs: item.durationMs as number,
    outcome: item.outcome,
    correctCompletion,
    assisted: boolean(item.assisted, "Yardım kullanımı"),
    errorCount: count(item.errorCount, "Hata sayısı"),
    retryEntryCount: count(item.retryEntryCount, "Tekrar giriş sayısı"),
    wrongChildOrScopeIncident: boolean(
      item.wrongChildOrScopeIncident,
      "Yanlış çocuk veya kapsam olayı",
    ),
    falseOfficialCompletionClaim: boolean(
      item.falseOfficialCompletionClaim,
      "Sahte resmî tamamlandı iddiası",
    ),
    origin: item.origin,
    observerAttestation,
  });
}

function parseParticipantEvidence(value: unknown): TeacherPilotParticipantEvidence {
  const item = exactRecord(
    value,
    PARTICIPANT_EVIDENCE_KEYS,
    "Pilot öğretmen uygunluk kanıtı",
  );
  if (
    item.schemaVersion !== TEACHER_PILOT_PROTOCOL_SCHEMA_VERSION ||
    item.role !== "real-preschool-teacher" ||
    item.scope !== TEACHER_PILOT_PARTICIPANT_SCOPE ||
    item.methodVersion !== TEACHER_PILOT_PARTICIPANT_METHOD_VERSION
  ) {
    throw new Error("Pilot öğretmen kanıtı exact rol, kapsam ve yöntem sürümünü taşımalıdır.");
  }
  if (
    item.status !== "ACTIVE" &&
    item.status !== "SUPERSEDED" &&
    item.status !== "REVOKED"
  ) {
    throw new Error("Pilot öğretmen kanıt durumu geçersiz.");
  }
  if (
    item.revocationStatus !== "KNOWN_CLEAR" &&
    item.revocationStatus !== "REVOKED" &&
    item.revocationStatus !== "UNKNOWN"
  ) {
    throw new Error("Pilot öğretmen kanıt iptal durumu geçersiz.");
  }
  const verifiedAtUtc = utcTimestamp(item.verifiedAtUtc, "Öğretmen doğrulama zamanı");
  const validFromUtc = utcTimestamp(item.validFromUtc, "Öğretmen kanıtı başlangıcı");
  const expiresAtUtc = utcTimestamp(item.expiresAtUtc, "Öğretmen kanıtı sonu");
  if (
    Date.parse(verifiedAtUtc) >= Date.parse(expiresAtUtc) ||
    Date.parse(validFromUtc) >= Date.parse(expiresAtUtc)
  ) {
    throw new Error("Pilot öğretmen kanıt zaman aralığı geçersiz.");
  }
  return deepFreeze({
    schemaVersion: TEACHER_PILOT_PROTOCOL_SCHEMA_VERSION,
    evidenceId: uuid(item.evidenceId, "Pilot öğretmen kanıt kimliği"),
    participantRef: machineId(item.participantRef, "Pilot öğretmen pseudonymous kimliği"),
    role: "real-preschool-teacher",
    scope: TEACHER_PILOT_PARTICIPANT_SCOPE,
    methodVersion: TEACHER_PILOT_PARTICIPANT_METHOD_VERSION,
    verifiedByActorRef: machineId(item.verifiedByActorRef, "Pilot öğretmeni doğrulayan aktör"),
    verifiedAtUtc,
    validFromUtc,
    expiresAtUtc,
    status: item.status,
    revocationStatus: item.revocationStatus,
    evidenceSha256: digest(item.evidenceSha256, "Pilot öğretmen kanıt özeti"),
  });
}

function participantEvidenceIsActive(
  observation: TeacherPilotRawObservation,
  asOfUtc: string,
  resolver: TeacherPilotParticipantEvidenceResolver | null | undefined,
): boolean {
  if (
    observation.origin !== "observed-real-human-session" ||
    !observation.observerAttestation ||
    observation.participantEvidenceId === null ||
    observation.participantEvidenceSha256 === null ||
    !resolver
  ) {
    return false;
  }
  try {
    const candidate = resolver(observation.participantEvidenceId);
    if (candidate === null || candidate === undefined) return false;
    const evidence = parseParticipantEvidence(candidate);
    return (
      evidence.evidenceId === observation.participantEvidenceId &&
      evidence.participantRef === observation.participantRef &&
      evidence.evidenceSha256 === observation.participantEvidenceSha256 &&
      evidence.verifiedByActorRef !== observation.participantRef &&
      evidence.status === "ACTIVE" &&
      evidence.revocationStatus === "KNOWN_CLEAR" &&
      Date.parse(evidence.verifiedAtUtc) <= Date.parse(observation.startedAtUtc) &&
      Date.parse(evidence.validFromUtc) <= Date.parse(observation.startedAtUtc) &&
      Date.parse(observation.finishedAtUtc) < Date.parse(evidence.expiresAtUtc) &&
      Date.parse(evidence.validFromUtc) <= Date.parse(asOfUtc) &&
      Date.parse(asOfUtc) < Date.parse(evidence.expiresAtUtc)
    );
  } catch {
    return false;
  }
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function metrics(observations: readonly TeacherPilotRawObservation[]): TeacherPilotMetrics {
  const medianDurationMs = median(observations.map((item) => item.durationMs));
  const medianRetryEntryCount = median(
    observations.map((item) => item.retryEntryCount),
  );
  return deepFreeze({
    rawObservationCount: observations.length,
    distinctParticipantCount: new Set(
      observations.map((item) => item.participantRef),
    ).size,
    correctObservationCount: observations.filter((item) => item.correctCompletion).length,
    assistedObservationCount: observations.filter((item) => item.assisted).length,
    failedObservationCount: observations.filter((item) => item.outcome === "failed").length,
    abandonedObservationCount: observations.filter((item) => item.outcome === "abandoned").length,
    medianDurationMs,
    slowSuccessfulObservationIds: observations
      .filter(
        (item) =>
          item.outcome === "successful" &&
          item.durationMs >
            TEACHER_PILOT_TARGET_CONTRACT.acceptanceThresholds
              .maximumSuccessfulObservationDurationMs,
      )
      .map((item) => item.recordId),
    wrongChildOrScopeIncidentCount: observations.filter(
      (item) => item.wrongChildOrScopeIncident,
    ).length,
    falseOfficialCompletionClaimCount: observations.filter(
      (item) => item.falseOfficialCompletionClaim,
    ).length,
    medianRetryEntryCount,
  });
}

function criteria(result: TeacherPilotMetrics): TeacherPilotCriterionResults {
  const thresholds = TEACHER_PILOT_TARGET_CONTRACT.acceptanceThresholds;
  return deepFreeze({
    observationCoverage:
      result.rawObservationCount ===
        TEACHER_PILOT_TARGET_CONTRACT.expectedRawObservationCount &&
      result.distinctParticipantCount ===
        TEACHER_PILOT_TARGET_CONTRACT.participantCount,
    correctObservations:
      result.correctObservationCount >= thresholds.minimumCorrectObservations,
    medianDuration:
      result.medianDurationMs !== null &&
      result.medianDurationMs <= thresholds.maximumMedianDurationMs,
    successfulTaskDurationCeiling:
      result.slowSuccessfulObservationIds.length === 0,
    wrongChildOrScopeIncidents:
      result.wrongChildOrScopeIncidentCount <=
      thresholds.maximumWrongChildOrScopeIncidents,
    falseOfficialCompletionClaims:
      result.falseOfficialCompletionClaimCount <=
      thresholds.maximumFalseOfficialCompletionClaims,
    medianRetryEntryCount:
      result.medianRetryEntryCount !== null &&
      result.medianRetryEntryCount <= thresholds.maximumMedianRetryEntryCount,
  });
}

function evaluation(
  status: TeacherPilotEvaluation["status"],
  targetMet: boolean | null,
  observations: readonly TeacherPilotRawObservation[],
  issues: readonly string[],
): TeacherPilotEvaluation {
  const resultMetrics = metrics(observations);
  return deepFreeze({
    status,
    targetMet,
    metrics: resultMetrics,
    criteria: criteria(resultMetrics),
    issues: [...issues],
    observations: [...observations],
  });
}

/**
 * Production sonucu yalnız dış uygunluk sicilinin doğruladığı 5 gerçek
 * öğretmenin 20 exact ham gözleminden çıkar. Sentetik mod eşikleri sınar fakat
 * hiçbir zaman gerçek pilot sonucu veya kabul kararı üretmez.
 */
export function evaluateTeacherPilot(input: {
  readonly observations: readonly unknown[];
  readonly asOfUtc: string;
  readonly mode?: "production" | "contract-simulation";
  readonly resolveParticipantEvidence?: TeacherPilotParticipantEvidenceResolver | null;
}): TeacherPilotEvaluation {
  if (!Array.isArray(input.observations)) {
    throw new Error("Öğretmen pilotu ham gözlemleri dizi olmalıdır.");
  }
  const asOfUtc = utcTimestamp(input.asOfUtc, "Pilot değerlendirme zamanı");
  let observations: TeacherPilotRawObservation[];
  try {
    observations = input.observations.map(parseTeacherPilotRawObservation);
  } catch (error) {
    return evaluation("invalid-records", null, [], [
      error instanceof Error ? error.message : "Pilot kaydı ayrıştırılamadı.",
    ]);
  }
  const recordIds = observations.map((item) => item.recordId);
  const participantTaskKeys = observations.map(
    (item) => `${item.participantRef}:${item.taskId}`,
  );
  if (
    new Set(recordIds).size !== recordIds.length ||
    new Set(participantTaskKeys).size !== participantTaskKeys.length
  ) {
    return evaluation("invalid-records", null, observations, [
      "Mükerrer kayıt veya öğretmen×görev gözlemi overwrite edilmeden çözülmelidir (CS-001).",
    ]);
  }

  const pilotRunIds = new Set(observations.map((item) => item.pilotRunId));
  if (pilotRunIds.size > 1) {
    return evaluation("invalid-records", null, observations, [
      "Tek değerlendirme yalnız bir pilot koşusunun ham kayıtlarını taşıyabilir.",
    ]);
  }

  const mode = input.mode ?? "production";
  if (mode === "contract-simulation") {
    if (observations.some((item) => item.origin !== "synthetic-contract-fixture")) {
      return evaluation("invalid-records", null, observations, [
        "Sözleşme simülasyonu yalnız açık sentetik fixture kabul eder.",
      ]);
    }
    return evaluation("simulation-only", null, observations, [
      "Sentetik kayıtlar gerçek öğretmen pilotu veya kabul sonucu değildir.",
    ]);
  }

  const unresolved = observations.filter(
    (item) =>
      !participantEvidenceIsActive(
        item,
        asOfUtc,
        input.resolveParticipantEvidence,
      ),
  );
  if (unresolved.length > 0 || observations.length === 0) {
    return evaluation("awaiting-real-human-data", null, observations, [
      `${unresolved.length || TEACHER_PILOT_TARGET_CONTRACT.expectedRawObservationCount} kayıt gerçek okul öncesi öğretmeni kanıtıyla doğrulanmadı.`,
    ]);
  }

  const participantGroups = new Map<string, Set<TeacherPilotTaskId>>();
  for (const item of observations) {
    const tasks = participantGroups.get(item.participantRef) ?? new Set();
    tasks.add(item.taskId);
    participantGroups.set(item.participantRef, tasks);
  }
  const exactCoverage =
    observations.length === TEACHER_PILOT_TARGET_CONTRACT.expectedRawObservationCount &&
    participantGroups.size === TEACHER_PILOT_TARGET_CONTRACT.participantCount &&
    [...participantGroups.values()].every(
      (tasks) =>
        tasks.size === TEACHER_PILOT_TARGET_CONTRACT.tasksPerParticipant &&
        TEACHER_PILOT_TASK_IDS.every((id) => tasks.has(id)),
    );
  if (!exactCoverage) {
    return evaluation("incomplete-real-human-data", null, observations, [
      "Pilot 5 ayrı gerçek öğretmenin P01–P04 görevlerinin tamamını, toplam 20 ham kayıtla gerektirir.",
    ]);
  }
  const result = evaluation("ready-for-independent-analysis", null, observations, []);
  const targetMet = Object.values(result.criteria).every(Boolean);
  return deepFreeze({ ...result, targetMet });
}

export interface TeacherPilotTimerStartInput {
  readonly pilotRunId: string;
  readonly participantRef: string;
  readonly participantEvidenceId: string | null;
  readonly participantEvidenceSha256: `sha256:${string}` | null;
  readonly taskId: TeacherPilotTaskId;
  readonly origin: TeacherPilotObservationOrigin;
  readonly observerAttestation: boolean;
}

export interface TeacherPilotTimerFinishInput {
  readonly outcome: TeacherPilotTaskOutcome;
  readonly correctCompletion: boolean;
  readonly assisted: boolean;
  readonly errorCount: number;
  readonly retryEntryCount: number;
  readonly wrongChildOrScopeIncident: boolean;
  readonly falseOfficialCompletionClaim: boolean;
}

export interface TeacherPilotTimerClock {
  readonly monotonicNow: () => number;
  readonly utcNow: () => string;
  readonly randomUuid: () => string;
}

export interface TeacherPilotTimer {
  readonly running: boolean;
  readonly elapsedMs: () => number;
  readonly start: (input: TeacherPilotTimerStartInput) => void;
  readonly finish: (input: TeacherPilotTimerFinishInput) => TeacherPilotRawObservation;
  readonly cancel: () => void;
}

const DEFAULT_TIMER_CLOCK: TeacherPilotTimerClock = {
  monotonicNow: () => performance.now(),
  utcNow: () => new Date().toISOString(),
  randomUuid: () => crypto.randomUUID(),
};

export function createTeacherPilotTimer(
  clock: TeacherPilotTimerClock = DEFAULT_TIMER_CLOCK,
): TeacherPilotTimer {
  let active:
    | {
        readonly input: TeacherPilotTimerStartInput;
        readonly startedAtUtc: string;
        readonly monotonicStartedAt: number;
      }
    | null = null;

  return {
    get running() {
      return active !== null;
    },
    elapsedMs() {
      if (!active) return 0;
      return Math.max(0, Math.round(clock.monotonicNow() - active.monotonicStartedAt));
    },
    start(input) {
      if (active) throw new Error("Pilot görev zamanlayıcısı zaten çalışıyor.");
      taskId(input.taskId);
      machineId(input.pilotRunId, "Pilot koşusu kimliği");
      machineId(input.participantRef, "Pilot öğretmen pseudonymous kimliği");
      active = {
        input: deepFreeze({ ...input }),
        startedAtUtc: utcTimestamp(clock.utcNow(), "Görev başlangıcı"),
        monotonicStartedAt: clock.monotonicNow(),
      };
    },
    finish(input) {
      if (!active) throw new Error("Başlatılmamış pilot görevi bitirilemez.");
      const current = active;
      const finishedAtUtc = utcTimestamp(clock.utcNow(), "Görev bitişi");
      const durationMs = Math.max(
        1,
        Math.round(clock.monotonicNow() - current.monotonicStartedAt),
      );
      active = null;
      return parseTeacherPilotRawObservation({
        schemaVersion: TEACHER_PILOT_PROTOCOL_SCHEMA_VERSION,
        recordId: clock.randomUuid(),
        pilotRunId: current.input.pilotRunId,
        contractId: TEACHER_PILOT_TARGET_CONTRACT.contractId,
        participantRef: current.input.participantRef,
        participantEvidenceId: current.input.participantEvidenceId,
        participantEvidenceSha256: current.input.participantEvidenceSha256,
        taskId: current.input.taskId,
        startedAtUtc: current.startedAtUtc,
        finishedAtUtc,
        civilDate: istanbulCivilDate(finishedAtUtc),
        durationMs,
        outcome: input.outcome,
        correctCompletion: input.correctCompletion,
        assisted: input.assisted,
        errorCount: input.errorCount,
        retryEntryCount: input.retryEntryCount,
        wrongChildOrScopeIncident: input.wrongChildOrScopeIncident,
        falseOfficialCompletionClaim: input.falseOfficialCompletionClaim,
        origin: current.input.origin,
        observerAttestation: current.input.observerAttestation,
      });
    },
    cancel() {
      active = null;
    },
  };
}
