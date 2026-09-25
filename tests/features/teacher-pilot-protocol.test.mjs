import assert from "node:assert/strict";
import test from "node:test";

import {
  TEACHER_PILOT_TARGET_CONTRACT,
  TEACHER_PILOT_TASK_IDS,
  createTeacherPilotTimer,
  evaluateTeacherPilot,
  parseTeacherPilotRawObservation,
} from "../../src/features/teacher-pilot/teacher-pilot-protocol.ts";

const uuid = (value) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const digest = (character) => `sha256:${character.repeat(64)}`;

function syntheticObservation(index, overrides = {}) {
  const participantIndex = Math.floor(index / 4) + 1;
  const taskId = TEACHER_PILOT_TASK_IDS[index % 4];
  return {
    schemaVersion: 1,
    recordId: uuid(100 + index),
    pilotRunId: "synthetic-contract-run",
    contractId: "maarifos-teacher-workload-pilot-v1",
    participantRef: `synthetic-participant-${participantIndex}`,
    participantEvidenceId: null,
    participantEvidenceSha256: null,
    taskId,
    startedAtUtc: `2026-09-09T10:${String(index).padStart(2, "0")}:00.000Z`,
    finishedAtUtc: `2026-09-09T10:${String(index).padStart(2, "0")}:20.000Z`,
    civilDate: "2026-09-09",
    durationMs: 20_000,
    outcome: "successful",
    correctCompletion: true,
    assisted: false,
    errorCount: 0,
    retryEntryCount: 0,
    wrongChildOrScopeIncident: false,
    falseOfficialCompletionClaim: false,
    origin: "synthetic-contract-fixture",
    observerAttestation: false,
    ...overrides,
  };
}

function participantEvidence(index, overrides = {}) {
  return {
    schemaVersion: 1,
    evidenceId: uuid(500 + index),
    participantRef: `registry-teacher-${index}`,
    role: "real-preschool-teacher",
    scope: "maarifos-teacher-workload-pilot",
    methodVersion: "1.0",
    verifiedByActorRef: "independent-pilot-operator",
    verifiedAtUtc: "2026-09-09T07:00:00.000Z",
    validFromUtc: "2026-09-09T07:00:00.000Z",
    expiresAtUtc: "2026-12-31T21:00:00.000Z",
    status: "ACTIVE",
    revocationStatus: "KNOWN_CLEAR",
    evidenceSha256: digest(String(index)),
    ...overrides,
  };
}

function observedFixture(index, overrides = {}) {
  const participantIndex = Math.floor(index / 4) + 1;
  const evidence = participantEvidence(participantIndex);
  return {
    ...syntheticObservation(index),
    pilotRunId: "external-registry-contract-fixture",
    participantRef: evidence.participantRef,
    participantEvidenceId: evidence.evidenceId,
    participantEvidenceSha256: evidence.evidenceSha256,
    origin: "observed-real-human-session",
    observerAttestation: true,
    ...overrides,
  };
}

function evidenceResolver(evidence) {
  const registry = new Map(evidence.map((item) => [item.evidenceId, item]));
  return (evidenceId) => registry.get(evidenceId) ?? null;
}

test("tek hedef sözleşmesi 5×P01–P04 ve exact kabul eşiklerini deney öncesi sabitler", () => {
  assert.deepEqual(TEACHER_PILOT_TASK_IDS, ["P01", "P02", "P03", "P04"]);
  assert.equal(TEACHER_PILOT_TARGET_CONTRACT.participantCount, 5);
  assert.equal(TEACHER_PILOT_TARGET_CONTRACT.tasksPerParticipant, 4);
  assert.equal(TEACHER_PILOT_TARGET_CONTRACT.expectedRawObservationCount, 20);
  assert.deepEqual(
    TEACHER_PILOT_TARGET_CONTRACT.tasks.map(({ id, name }) => [id, name]),
    [
      ["P01", "quick-observation"],
      ["P02", "official-report-preparation"],
      ["P03", "official-appointment-preparation"],
      ["P04", "scoped-document-export"],
    ],
  );
  assert.equal(
    TEACHER_PILOT_TARGET_CONTRACT.tasks[0].instruction,
    "Çocuk satırından bir gözlem aç, verilen kısa kurgu metni ve kaynağı gir, kaydet. Başlangıç: görev kartı okunup uygulamaya dönüldüğü an. Bitiş: kayıt başarıyla görünür.",
  );
  assert.equal(
    TEACHER_PILOT_TARGET_CONTRACT.tasks[1].instruction,
    "Aynı çocuğun iki kaynak gözlemini doğru dönem ve program alanıyla Ek4/e-Okul hazırlık görünümünde bulun. Bitiş: iki doğru kaynak ve dönem gösterilir. Bu işlem resmî sisteme aktarım değildir.",
  );
  assert.equal(
    TEACHER_PILOT_TARGET_CONTRACT.tasks[2].instruction,
    "Hazır yerel görüşme hazırlığını açın, resmî sisteme geçiş yolunu gösterin ve resmî işlemin henüz tamamlanmadığını doğru açıklayın. Gerçek randevu oluşturulmaz. Bitiş: yerel hazırlık ile resmî işlem ayrımı doğru anlatılır.",
  );
  assert.equal(
    TEACHER_PILOT_TARGET_CONTRACT.tasks[3].instruction,
    "Yalnız belirtilen çocuğu ve alanları seçin, alıcı/amaç özetini doğrulayın ve PDF'yi indirin. Bitiş: dosya açılır ve doğru çocuk/alan kapsamı gözlemci tarafından doğrulanır.",
  );
  assert.deepEqual(TEACHER_PILOT_TARGET_CONTRACT.acceptanceThresholds, {
    minimumCorrectObservations: 19,
    maximumMedianDurationMs: 25_000,
    maximumSuccessfulObservationDurationMs: 45_000,
    maximumWrongChildOrScopeIncidents: 0,
    maximumFalseOfficialCompletionClaims: 0,
    maximumMedianRetryEntryCount: 0,
  });
  assert.deepEqual(TEACHER_PILOT_TARGET_CONTRACT.secondaryDesignTarget, {
    taskId: "P01",
    maximumDurationMs: 15_000,
    acceptanceThreshold: false,
    explanation:
      "15 saniye yalnız P01 için ikincil tasarım hedefidir; pilot kabul eşiği değildir.",
  });
  assert.equal(TEACHER_PILOT_TARGET_CONTRACT.rawDataPolicy.winsorizeDurations, false);
  assert.equal(TEACHER_PILOT_TARGET_CONTRACT.rawDataPolicy.trimOutliers, false);
  assert.equal(Object.isFrozen(TEACHER_PILOT_TARGET_CONTRACT), true);
  assert.equal(Object.isFrozen(TEACHER_PILOT_TARGET_CONTRACT.tasks), true);
});

test("sentetik 20 görev eşik matematiğini çalıştırır fakat gerçek pilot sonucu üretmez", () => {
  const observations = Array.from({ length: 20 }, (_, index) =>
    syntheticObservation(index, index === 19
      ? {
          durationMs: 80_000,
          outcome: "failed",
          correctCompletion: false,
          assisted: true,
          errorCount: 2,
          retryEntryCount: 3,
        }
      : {}),
  );
  const result = evaluateTeacherPilot({
    observations,
    asOfUtc: "2026-09-09T18:00:00.000Z",
    mode: "contract-simulation",
  });
  assert.equal(result.status, "simulation-only");
  assert.equal(result.targetMet, null);
  assert.equal(result.metrics.rawObservationCount, 20);
  assert.equal(result.metrics.correctObservationCount, 19);
  assert.equal(result.metrics.failedObservationCount, 1);
  assert.equal(result.metrics.assistedObservationCount, 1);
  assert.equal(result.metrics.medianDurationMs, 20_000);
  assert.equal(result.observations.at(-1).durationMs, 80_000);
  assert.match(result.issues.join("\n"), /gerçek öğretmen pilotu.*değildir/u);
});

test("production modu dış sicilde doğrulanmamış veya eksik insan kayıtlarını kabul saymaz", () => {
  const synthetic = Array.from({ length: 20 }, (_, index) => syntheticObservation(index));
  const syntheticProduction = evaluateTeacherPilot({
    observations: synthetic,
    asOfUtc: "2026-09-09T18:00:00.000Z",
  });
  assert.equal(syntheticProduction.status, "awaiting-real-human-data");
  assert.equal(syntheticProduction.targetMet, null);

  const partial = Array.from({ length: 19 }, (_, index) => observedFixture(index));
  const evidence = Array.from({ length: 5 }, (_, index) => participantEvidence(index + 1));
  const partialResult = evaluateTeacherPilot({
    observations: partial,
    asOfUtc: "2026-09-09T18:00:00.000Z",
    resolveParticipantEvidence: evidenceResolver(evidence),
  });
  assert.equal(partialResult.status, "incomplete-real-human-data");
  assert.equal(partialResult.targetMet, null);
});

test("external sicil fixture'ındaki exact 20 kayıt bütün eşikleri ayrı ayrı değerlendirir", () => {
  const evidence = Array.from({ length: 5 }, (_, index) => participantEvidence(index + 1));
  const observations = Array.from({ length: 20 }, (_, index) =>
    observedFixture(index, index === 19
      ? {
          outcome: "failed",
          correctCompletion: false,
          assisted: true,
          errorCount: 1,
        }
      : {}),
  );
  const result = evaluateTeacherPilot({
    observations,
    asOfUtc: "2026-09-09T18:00:00.000Z",
    resolveParticipantEvidence: evidenceResolver(evidence),
  });
  assert.equal(result.status, "ready-for-independent-analysis");
  assert.equal(result.targetMet, true);
  assert.ok(Object.values(result.criteria).every(Boolean));
  assert.equal(result.metrics.correctObservationCount, 19);
  assert.equal(result.metrics.medianRetryEntryCount, 0);

  const slow = observations.map((item, index) =>
    index === 0 ? { ...item, durationMs: 45_001 } : item,
  );
  const slowResult = evaluateTeacherPilot({
    observations: slow,
    asOfUtc: "2026-09-09T18:00:00.000Z",
    resolveParticipantEvidence: evidenceResolver(evidence),
  });
  assert.equal(slowResult.status, "ready-for-independent-analysis");
  assert.equal(slowResult.targetMet, false);
  assert.equal(slowResult.criteria.successfulTaskDurationCeiling, false);
  assert.deepEqual(slowResult.metrics.slowSuccessfulObservationIds, [uuid(100)]);
});

test("mükerrer öğretmen×görev CS-001 olarak saklanır ve overwrite edilmez", () => {
  const first = syntheticObservation(0);
  const duplicate = { ...syntheticObservation(1), taskId: first.taskId };
  const result = evaluateTeacherPilot({
    observations: [first, duplicate],
    asOfUtc: "2026-09-09T18:00:00.000Z",
    mode: "contract-simulation",
  });
  assert.equal(result.status, "invalid-records");
  assert.equal(result.targetMet, null);
  assert.equal(result.observations.length, 2);
  assert.match(result.issues.join("\n"), /CS-001/u);
});

test("monotonic timer ham süreyi ve yardımlı başarısız görevi değiştirmeden kaydeder", () => {
  let monotonicMs = 1_000;
  let utc = "2026-09-09T10:00:00.000Z";
  const timer = createTeacherPilotTimer({
    monotonicNow: () => monotonicMs,
    utcNow: () => utc,
    randomUuid: () => uuid(999),
  });
  timer.start({
    pilotRunId: "synthetic-timer-run",
    participantRef: "synthetic-participant-1",
    participantEvidenceId: null,
    participantEvidenceSha256: null,
    taskId: "P02",
    origin: "synthetic-contract-fixture",
    observerAttestation: false,
  });
  monotonicMs = 13_345;
  utc = "2026-09-09T10:00:12.345Z";
  assert.equal(timer.elapsedMs(), 12_345);
  const record = timer.finish({
    outcome: "failed",
    correctCompletion: false,
    assisted: true,
    errorCount: 2,
    retryEntryCount: 3,
    wrongChildOrScopeIncident: false,
    falseOfficialCompletionClaim: false,
  });
  assert.equal(record.durationMs, 12_345);
  assert.equal(record.outcome, "failed");
  assert.equal(record.assisted, true);
  assert.equal(record.errorCount, 2);
  assert.equal(record.retryEntryCount, 3);
  assert.equal(timer.running, false);
  assert.equal(Object.isFrozen(record), true);
});

test("ham kayıt exact alan, UTC/civil ve gerçek-sentetik köken ayrımını uygular", () => {
  const base = syntheticObservation(0);
  assert.doesNotThrow(() => parseTeacherPilotRawObservation(base));
  assert.throws(
    () => parseTeacherPilotRawObservation({ ...base, calculatedScore: 100 }),
    /exact alan/u,
  );
  assert.throws(
    () => parseTeacherPilotRawObservation({ ...base, civilDate: "2026-09-10" }),
    /Europe\/Istanbul/u,
  );
  assert.throws(
    () => parseTeacherPilotRawObservation({ ...base, observerAttestation: true }),
    /Sentetik.*gerçek insan kanıtı/u,
  );
  assert.throws(
    () => parseTeacherPilotRawObservation({ ...base, outcome: "failed", correctCompletion: true }),
    /doğru tamamlandı sayılamaz/u,
  );
});
