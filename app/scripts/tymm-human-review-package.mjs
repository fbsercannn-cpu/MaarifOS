import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson } from "../src/core/backup/canonical-json.ts";
import {
  TYMM_HUMAN_REVIEW_CRITERIA,
  TYMM_PENDING_MAPPING_DISCLOSURE,
  TYMM_PENDING_MAPPING_PUBLICATION_STATE,
  appendTymmHumanReviewLedgerEvent,
  evaluateTymmMappingReview,
  parseTymmMappingReviewSubject,
  verifyTymmHumanReviewLedger,
} from "../src/features/pedagogical-os/tymm-human-review-ledger.ts";
import {
  ACTIVITY_AGE_MAPPING_REVIEW_QUEUE,
  AGE_MONTH_PACKAGE_REVIEW_QUEUE,
  assertTymmHumanReviewQueueCoverage,
} from "../src/features/pedagogical-os/tymm-human-review-queue.ts";

export const HUMAN_REVIEW_PACKAGE_SCHEMA_VERSION = 1;
export const HUMAN_REVIEW_PACKAGE_KIND = "tymm-human-review-package";
export const HUMAN_REVIEW_CANONICALIZATION_PROFILE =
  "maarifos-core-canonical-json-v1";
export const HUMAN_REVIEW_PROPOSER_ACTOR_ID =
  "maarifos-review-package-generator";
export const HUMAN_REVIEW_PACKAGE_FILE_NAMES = Object.freeze([
  "UZMAN_YONERGESI.md",
  "candidates.json",
  "evaluation.json",
  "human-review-template.csv",
  "receipt.json",
]);
export const HUMAN_REVIEW_MANIFEST_FILE_NAME = "manifest.json";

const MAX_INPUT_BYTES = 64 * 1024 * 1024;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const REVIEW_STATUSES = new Set([
  "pending-human-review",
  "changes-requested",
  "conflict-requires-resolution",
  "rejected",
  "publishable",
  "invalid-ledger",
]);
const EVALUATION_RECORD_KEYS = Object.freeze([
  "ordinal",
  "reviewItemId",
  "candidateMappingSha256",
  "publicationGate",
  "status",
  "publishable",
  "countedReviewEventIds",
  "issues",
]);

export const HUMAN_REVIEW_PACKAGE_HELP = `TYMM insan uzman inceleme paketi

Kullanım:
  node scripts/tymm-human-review-package.mjs generate --output <dizin> --generated-at <UTC>
  node scripts/tymm-human-review-package.mjs generate --output <dizin> --generated-at <UTC> --ledger <ledger.json> --identity-evidence <identity.json> --as-of <UTC>
  node scripts/tymm-human-review-package.mjs --verify <dizin>

Üretim sözleşmesi:
  * --generated-at milisaniyeli UTC ISO-8601 değeridir ve deterministik aday konularını sabitler.
  * Varsayılan paket 357 etkinlik×yaş + 30 yaş×ay olmak üzere 387 pending aday üretir.
  * human-review-template.csv UTF-8, başlık hariç 387 satırdır. İki ayrı uzman için karar,
    gerekçe ve kimlik kanıtı alanları boştur; boş alanlar onay oluşturmaz.
  * Dış ledger ve identity-evidence yalnız birlikte verilir. --as-of değerlendirme zamanını sabitler.
  * Dış değerlendirmede 387/387 adayın her biri exact iki ayrı, bağımsız, dış sicil kanıtlı
    gerçek okul öncesi uzmanı tarafından onaylanmadıkça çıkış kodu 2 olur.
  * Ajan, kurgu kimlik, bağımsız olmayan/aynı/tek kişi, çelişki veya geçersiz kanıt
    yayımlanabilir sonuç oluşturmaz. Geçersiz girdi/sözleşme çıkış kodu 1'dir.
  * Çıkış dizini mevcut olmamalıdır; paket geçici kardeş dizinde tamamlanıp atomik yayımlanır.

Doğrulama sözleşmesi:
  * --verify manifestteki SHA-256/byte değerlerini, 387 aday kapsamını, exact candidate hash,
    konu/kriter bağını, UTF-8 CSV'yi ve özet sayılarını yeniden doğrular.
  * Varsayılan pending paketin bütünlük doğrulaması 0; dış değerlendirmesi bloklu paketin
    bütünlük doğrulaması 2; bozuk paket 1 döndürür.
`;

function sha256Bytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function sha256Text(value) {
  return sha256Bytes(Buffer.from(value, "utf8"));
}

function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactKeys(value, expected, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} nesne olmalıdır.`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label} exact alan sözleşmesine uymuyor.`);
  }
  return value;
}

function canonicalUtc(value, label) {
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

function istanbulCivilDate(utc) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(utc));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function activityCandidatePayload(item) {
  return {
    schemaVersion: HUMAN_REVIEW_PACKAGE_SCHEMA_VERSION,
    candidateKind: "activity-age-pedagogical-mapping",
    reviewItemId: item.reviewItemId,
    ageBand: item.ageBand,
    source: {
      contentOrigin: item.contentOrigin,
      officialMebActivity: item.officialMebActivity,
      activityId: item.activityId,
      activityTitle: item.activityTitle,
    },
    pedagogicalInputs: {
      tymmDomains: [...item.tymmDomains],
      ageAdaptation: item.ageAdaptation,
      differentiation: item.differentiation,
      evidencePrompt: item.evidencePrompt,
      familyBridge: item.familyBridge,
    },
    proposedMapping: item.mapping,
  };
}

function ageMonthCandidatePayload(item) {
  return {
    schemaVersion: HUMAN_REVIEW_PACKAGE_SCHEMA_VERSION,
    candidateKind: "age-month-package-mapping",
    reviewItemId: item.reviewItemId,
    ageBand: item.ageBand,
    source: {
      contentOrigin: "MaarifOS-original",
      officialMebPackage: false,
      month: item.month,
      monthLabel: item.monthLabel,
    },
    pedagogicalInputs: {
      teacherIntent: item.teacherIntent,
      familyBridge: item.familyBridge,
    },
    proposedMapping: item.packageMapping,
  };
}

export function buildHumanReviewCandidates(generatedAtUtc) {
  const proposedAtUtc = canonicalUtc(generatedAtUtc, "Paket üretim zamanı");
  const civilDate = istanbulCivilDate(proposedAtUtc);
  assertTymmHumanReviewQueueCoverage();
  const sourceItems = [
    ...ACTIVITY_AGE_MAPPING_REVIEW_QUEUE.map((item) => ({
      item,
      candidatePayload: activityCandidatePayload(item),
    })),
    ...AGE_MONTH_PACKAGE_REVIEW_QUEUE.map((item) => ({
      item,
      candidatePayload: ageMonthCandidatePayload(item),
    })),
  ];
  const candidates = sourceItems.map(({ item, candidatePayload }, index) => {
    const candidateMappingSha256 = sha256Text(canonicalJson(candidatePayload));
    const subject = {
      schemaVersion: HUMAN_REVIEW_PACKAGE_SCHEMA_VERSION,
      reviewItemId: item.reviewItemId,
      candidateMappingSha256,
      proposerActorId: HUMAN_REVIEW_PROPOSER_ACTOR_ID,
      proposedAtUtc,
      civilDate,
    };
    parseTymmMappingReviewSubject(subject);
    return {
      ordinal: index + 1,
      reviewItemId: item.reviewItemId,
      candidateKind: candidatePayload.candidateKind,
      reviewStatus: item.reviewStatus,
      publicationState: TYMM_PENDING_MAPPING_PUBLICATION_STATE,
      reviewDisclosure: TYMM_PENDING_MAPPING_DISCLOSURE,
      candidatePayload,
      candidateMappingSha256,
      subject,
      reviewScope: {
        reviewItemId: item.reviewItemId,
        candidateMappingSha256,
        criteria: [...TYMM_HUMAN_REVIEW_CRITERIA],
      },
      independentPreschoolExpertApprovals: [],
    };
  });
  if (candidates.length !== 387 || new Set(candidates.map((item) => item.reviewItemId)).size !== 387) {
    throw new Error("TYMM insan inceleme paketi exact 387 benzersiz aday taşımalıdır.");
  }
  return candidates;
}

function candidateCounts(candidates) {
  const activityAge = candidates.filter(
    (item) => item.candidateKind === "activity-age-pedagogical-mapping",
  ).length;
  const ageMonth = candidates.filter(
    (item) => item.candidateKind === "age-month-package-mapping",
  ).length;
  return {
    activityAge,
    ageMonth,
    total: candidates.length,
  };
}

function buildCandidatePackage(candidates, generatedAtUtc) {
  return {
    schemaVersion: HUMAN_REVIEW_PACKAGE_SCHEMA_VERSION,
    packageKind: HUMAN_REVIEW_PACKAGE_KIND,
    generatedAtUtc,
    civilDate: istanbulCivilDate(generatedAtUtc),
    canonicalizationProfile: HUMAN_REVIEW_CANONICALIZATION_PROFILE,
    criteria: [...TYMM_HUMAN_REVIEW_CRITERIA],
    counts: candidateCounts(candidates),
    defaultReviewStatus: "pending-human-review",
    defaultPublicationState: TYMM_PENDING_MAPPING_PUBLICATION_STATE,
    containsHumanReviewerIdentity: false,
    containsHumanReviewDecision: false,
    candidates,
  };
}

function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  text = text.replace(/\r\n|\r|\n/gu, " ⏎ ");
  if (/^[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values) {
  return `${values.map(csvCell).join(",")}\n`;
}

function candidateCsvSource(candidate) {
  const payload = candidate.candidatePayload;
  if (candidate.candidateKind === "activity-age-pedagogical-mapping") {
    return {
      ageBand: payload.ageBand,
      sourceId: payload.source.activityId,
      sourceTitle: payload.source.activityTitle,
      mappingSummary: `${payload.source.activityTitle} → ${payload.pedagogicalInputs.tymmDomains.join(" | ")}`,
      sourceAndCriteria: [
        `Köken: ${payload.source.contentOrigin}`,
        `Resmî MEB etkinliği: ${payload.source.officialMebActivity ? "evet" : "hayır"}`,
        `Yaş uyarlaması: ${payload.pedagogicalInputs.ageAdaptation}`,
        `Farklılaştırma: ${payload.pedagogicalInputs.differentiation}`,
        `Gözlem dili: ${payload.pedagogicalInputs.evidencePrompt}`,
        `Aile köprüsü: ${payload.pedagogicalInputs.familyBridge}`,
      ].join(" | "),
    };
  }
  return {
    ageBand: payload.ageBand,
    sourceId: `${String(payload.source.month).padStart(2, "0")}`,
    sourceTitle: payload.source.monthLabel,
    mappingSummary: `${payload.source.monthLabel} aylık paket niyeti → ${payload.ageBand} ay`,
    sourceAndCriteria: [
      `Köken: ${payload.source.contentOrigin}`,
      `Resmî MEB paketi: ${payload.source.officialMebPackage ? "evet" : "hayır"}`,
      `Öğretmen niyeti: ${payload.pedagogicalInputs.teacherIntent}`,
      `Aile köprüsü: ${payload.pedagogicalInputs.familyBridge}`,
    ].join(" | "),
  };
}

export function buildHumanReviewCsv(candidates) {
  const headers = [
    "sira",
    "inceleme_satiri_kimligi",
    "aday_turu",
    "yas_bandi_ay",
    "kaynak_kimligi_veya_ay",
    "kaynak_basligi",
    "incelenecek_esleme_ozeti",
    "aday_esleme_kanonik_json",
    "aday_esleme_sha256",
    "kaynak_ve_inceleme_baglamı",
    "kriter_1_yasa_uygunluk",
    "kriter_2_ogrenme_ciktisi_uyumu",
    "kriter_3_farklilastirma",
    "kriter_4_gozlem_dili",
    "yayin_durumu",
    "uzman_1_aktor_kimligi",
    "uzman_1_dis_sicil_kanit_kimligi",
    "uzman_1_karar",
    "uzman_1_gerekce",
    "uzman_1_bulgu_kimlikleri",
    "uzman_1_yetki_referansi",
    "uzman_1_inceleme_kaniti_sha256",
    "uzman_1_inceleme_zamani_utc",
    "uzman_2_aktor_kimligi",
    "uzman_2_dis_sicil_kanit_kimligi",
    "uzman_2_karar",
    "uzman_2_gerekce",
    "uzman_2_bulgu_kimlikleri",
    "uzman_2_yetki_referansi",
    "uzman_2_inceleme_kaniti_sha256",
    "uzman_2_inceleme_zamani_utc",
  ];
  let csv = `\uFEFF${csvRow(headers)}`;
  for (const candidate of candidates) {
    const source = candidateCsvSource(candidate);
    csv += csvRow([
      candidate.ordinal,
      candidate.reviewItemId,
      candidate.candidateKind,
      source.ageBand,
      source.sourceId,
      source.sourceTitle,
      source.mappingSummary,
      canonicalJson(candidate.candidatePayload),
      candidate.candidateMappingSha256,
      source.sourceAndCriteria,
      TYMM_HUMAN_REVIEW_CRITERIA[0],
      TYMM_HUMAN_REVIEW_CRITERIA[1],
      TYMM_HUMAN_REVIEW_CRITERIA[2],
      TYMM_HUMAN_REVIEW_CRITERIA[3],
      candidate.publicationState,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  }
  return csv;
}

export function buildHumanReviewInstructions(generatedAtUtc) {
  return `# TYMM insan uzman inceleme yönergesi

Paket zamanı: ${generatedAtUtc}
Kapsam: 357 etkinlik×yaş + 30 yaş×ay = 387 aday

Bu paket hiçbir gerçek uzman kimliği veya inceleme kararı içermez. Bütün adaylar
\`pending-human-review\` durumundadır. Ajan, otomasyon ve kurgu kimlik uzman yerine geçmez.

1. \`human-review-template.csv\` dosyasındaki her satır tek exact adayı gösterir. CSV başlığı
   hariç 387 satırdır. \`aday_esleme_sha256\`, aynı satırdaki
   \`aday_esleme_kanonik_json\` değerinin SHA-256 özetidir.
2. İki ayrı gerçek okul öncesi eğitim uzmanı aynı exact adayı birbirinden bağımsız inceler.
   Her uzman dış sicil kimlik kanıtı, çıkar çatışması açıklığı ve kendi inceleme kanıtını taşır.
3. Her uzman dört kriteri ayrı ayrı değerlendirir: \`age-appropriateness\`,
   \`learning-outcome-alignment\`, \`differentiation\`, \`observation-language\`.
4. Karar yalnız \`APPROVE\`, \`REQUEST_CHANGES\` veya \`REJECT\` olabilir. Gerekçe ve
   kanıt alanları sonradan gerçek uzman tarafından doldurulur. Boş alan onay değildir.
5. Aynı kişi iki uzman sütununu dolduramaz. Tek kişi, bağımsız olmayan kişi, geçersiz/süresi
   geçmiş sicil kanıtı veya çelişkili karar adayı yayımlanabilir yapmaz.
6. İmzalı/kanıtlı kararlar ürünün exact append-only ledger sözleşmesine dönüştürüldükten sonra
   aynı \`--generated-at\` ile, ayrıca \`--ledger\`, \`--identity-evidence\` ve \`--as-of\`
   verilerek yeni bir çıktı dizininde değerlendirilir.
7. \`node scripts/tymm-human-review-package.mjs --verify <dizin>\` komutu SHA-256 manifesti,
   aday kapsamını, konu/hash/kriter bağını ve CSV içeriğini doğrular.

Yayımlama kapısı ancak 387 adayın tamamı exact iki ayrı, dış sicil kanıtlı gerçek uzman
onayı taşıdığında geçer. Teknik paket bütünlüğü pedagojik onay anlamına gelmez.
`;
}

function blockedEvaluation(candidate, issues = []) {
  return {
    ordinal: candidate.ordinal,
    reviewItemId: candidate.reviewItemId,
    candidateMappingSha256: candidate.candidateMappingSha256,
    publicationGate: "blocked",
    status: "pending-human-review",
    publishable: false,
    countedReviewEventIds: [],
    issues: issues.length > 0
      ? [...issues]
      : ["Exact iki ayrı dış sicil kanıtlı gerçek insan uzman incelemesi bekleniyor."],
  };
}

function evaluationRecord(candidate, result) {
  const issues = result.issues.length > 0
    ? [...result.issues]
    : result.publishable
      ? []
      : ["Exact iki ayrı dış sicil kanıtlı gerçek insan uzman incelemesi bekleniyor."];
  return {
    ordinal: candidate.ordinal,
    reviewItemId: candidate.reviewItemId,
    candidateMappingSha256: candidate.candidateMappingSha256,
    publicationGate: result.publishable ? "publishable" : "blocked",
    status: result.status,
    publishable: result.publishable,
    countedReviewEventIds: [...result.countedReviewEventIds],
    issues,
  };
}

function subjectKey(subject) {
  return canonicalJson(subject);
}

function identityEvidenceIndex(values, referencedEvidenceIds) {
  if (!Array.isArray(values)) {
    throw new Error("Dış kimlik kanıtı girdisi JSON dizisi olmalıdır.");
  }
  const byId = new Map();
  values.forEach((value, index) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`Kimlik kanıtı[${index}] nesne olmalıdır.`);
    }
    const evidenceId = value.evidenceId;
    if (typeof evidenceId !== "string" || !UUID_PATTERN.test(evidenceId)) {
      throw new Error(`Kimlik kanıtı[${index}] kanonik UUID evidenceId taşımalıdır.`);
    }
    if (byId.has(evidenceId)) {
      throw new Error("Dış kimlik kanıtı girdisi mükerrer evidenceId taşıyamaz.");
    }
    byId.set(evidenceId, value);
  });
  for (const evidenceId of byId.keys()) {
    if (!referencedEvidenceIds.has(evidenceId)) {
      throw new Error("Dış kimlik kanıtı girdisi ledger tarafından kullanılmayan kanıt taşıyor.");
    }
  }
  return byId;
}

export async function evaluateExternalHumanReview({
  candidates,
  ledger,
  identityEvidence,
  asOfUtc,
}) {
  const evaluationTime = canonicalUtc(asOfUtc, "Dış inceleme değerlendirme zamanı");
  const verifiedLedger = await verifyTymmHumanReviewLedger(ledger);
  const candidatesBySubject = new Map(
    candidates.map((candidate) => [subjectKey(candidate.subject), candidate]),
  );
  const eventsByReviewItemId = new Map();
  const referencedEvidenceIds = new Set();
  for (const line of verifiedLedger) {
    const candidate = candidatesBySubject.get(subjectKey(line.event.subject));
    if (!candidate) {
      throw new Error("Dış ledger paketteki exact aday konu/hash/zaman kümesinin dışında olay taşıyor.");
    }
    const events = eventsByReviewItemId.get(candidate.reviewItemId) ?? [];
    events.push(line.event);
    eventsByReviewItemId.set(candidate.reviewItemId, events);
    const evidenceId = line.event.eventType === "REVIEW_DECIDED"
      ? line.event.reviewer.identityEvidenceId
      : line.event.resolver.identityEvidenceId;
    if (evidenceId !== null) referencedEvidenceIds.add(evidenceId);
  }
  const evidenceById = identityEvidenceIndex(identityEvidence, referencedEvidenceIds);
  const evaluations = [];
  for (const candidate of candidates) {
    const events = eventsByReviewItemId.get(candidate.reviewItemId) ?? [];
    if (events.length === 0) {
      evaluations.push(blockedEvaluation(candidate));
      continue;
    }
    let candidateLedger = [];
    for (const event of events) {
      candidateLedger = await appendTymmHumanReviewLedgerEvent(candidateLedger, event);
    }
    const result = await evaluateTymmMappingReview({
      subject: candidate.subject,
      ledger: candidateLedger,
      asOfUtc: evaluationTime,
      resolveIdentityEvidence: (evidenceId) => evidenceById.get(evidenceId) ?? null,
    });
    evaluations.push(evaluationRecord(candidate, result));
  }
  return evaluations;
}

function evaluationCounts(evaluations) {
  const counts = {
    total: evaluations.length,
    publishable: 0,
    blocked: 0,
    pendingHumanReview: 0,
    changesRequested: 0,
    conflictRequiresResolution: 0,
    rejected: 0,
    invalidLedger: 0,
  };
  for (const item of evaluations) {
    counts[item.publishable ? "publishable" : "blocked"] += 1;
    if (item.status === "pending-human-review") counts.pendingHumanReview += 1;
    if (item.status === "changes-requested") counts.changesRequested += 1;
    if (item.status === "conflict-requires-resolution") counts.conflictRequiresResolution += 1;
    if (item.status === "rejected") counts.rejected += 1;
    if (item.status === "invalid-ledger") counts.invalidLedger += 1;
  }
  return counts;
}

function buildEvaluationPackage(candidates, generatedAtUtc, mode, asOfUtc, evaluations) {
  return {
    schemaVersion: HUMAN_REVIEW_PACKAGE_SCHEMA_VERSION,
    packageKind: "tymm-human-review-evaluation",
    generatedAtUtc,
    asOfUtc,
    mode,
    criteria: [...TYMM_HUMAN_REVIEW_CRITERIA],
    counts: evaluationCounts(evaluations),
    evaluations,
  };
}

function buildReceipt({
  candidates,
  generatedAtUtc,
  mode,
  asOfUtc,
  evaluations,
  externalInputs,
}) {
  const counts = evaluationCounts(evaluations);
  const externalGatePassed = mode === "external-ledger-evaluation" && counts.publishable === 387;
  return {
    schemaVersion: HUMAN_REVIEW_PACKAGE_SCHEMA_VERSION,
    receiptKind: "tymm-human-review-package-receipt",
    generatedAtUtc,
    civilDate: istanbulCivilDate(generatedAtUtc),
    asOfUtc,
    mode,
    canonicalizationProfile: HUMAN_REVIEW_CANONICALIZATION_PROFILE,
    criteria: [...TYMM_HUMAN_REVIEW_CRITERIA],
    sourceCounts: candidateCounts(candidates),
    evaluationCounts: counts,
    externalInputs,
    privacy: {
      containsReviewerIdentity: false,
      containsIdentityEvidenceBody: false,
      containsRawReviewDecision: false,
      inputPathsRecorded: false,
    },
    gates: {
      packageGeneration: "passed",
      publication: externalGatePassed ? "passed" : "blocked",
      externalReviewValidation: mode === "pending-template"
        ? "not-run"
        : externalGatePassed
          ? "passed"
          : "blocked",
      recommendedExitCode: mode === "external-ledger-evaluation" && !externalGatePassed ? 2 : 0,
    },
    disclosure: TYMM_PENDING_MAPPING_DISCLOSURE,
  };
}

async function readBoundedJson(path, label) {
  const resolved = resolve(path);
  const information = await stat(resolved);
  if (!information.isFile() || information.size > MAX_INPUT_BYTES) {
    throw new Error(`${label} normal dosya ve en fazla ${MAX_INPUT_BYTES} byte olmalıdır.`);
  }
  const bytes = await readFile(resolved);
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`${label} geçerli UTF-8 JSON olmalıdır.`);
  }
  return {
    value,
    provenance: {
      bytes: bytes.byteLength,
      sha256: sha256Bytes(bytes),
    },
  };
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function assertSafeTemporaryPath(temporaryPath, parentPath, outputName) {
  if (
    dirname(temporaryPath) !== parentPath ||
    basename(temporaryPath).startsWith(`.${outputName}.tmp-`) === false
  ) {
    throw new Error("Geçici çıktı dizini güvenli kardeş dizin sınırının dışında.");
  }
}

async function renameDirectoryWithBoundedRetry(source, destination) {
  const delays = process.platform === "win32" ? [20, 60, 150] : [];
  let attempt = 0;
  while (true) {
    try {
      await rename(source, destination);
      return;
    } catch (error) {
      const delay = delays[attempt];
      if ((error?.code !== "EPERM" && error?.code !== "EBUSY") || delay === undefined) {
        throw error;
      }
      attempt += 1;
      await new Promise((resolveWait) => setTimeout(resolveWait, delay));
    }
  }
}

async function writeFileDurably(path, text) {
  const handle = await open(path, "wx", 0o600);
  try {
    await handle.writeFile(text, { encoding: "utf8" });
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function publishFilesAtomically(outputDirectory, files) {
  const outputPath = resolve(outputDirectory);
  const parentPath = dirname(outputPath);
  const outputName = basename(outputPath);
  if (outputPath === parentPath || outputName.length === 0) {
    throw new Error("Çıkış dizini dosya sistemi kökü olamaz.");
  }
  await mkdir(parentPath, { recursive: true });
  if (await pathExists(outputPath)) {
    throw new Error("Çıkış dizini zaten var; mevcut kanıt paketi üzerine yazılmaz.");
  }
  const temporaryPath = resolve(
    parentPath,
    `.${outputName}.tmp-${process.pid}-${randomUUID()}`,
  );
  assertSafeTemporaryPath(temporaryPath, parentPath, outputName);
  await mkdir(temporaryPath, { mode: 0o700 });
  let published = false;
  try {
    for (const [name, text] of [...files.entries()].sort(([left], [right]) => compareCodeUnits(left, right))) {
      await writeFileDurably(resolve(temporaryPath, name), text);
    }
    await renameDirectoryWithBoundedRetry(temporaryPath, outputPath);
    published = true;
  } finally {
    if (!published) {
      assertSafeTemporaryPath(temporaryPath, parentPath, outputName);
      await rm(temporaryPath, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

function buildManifest(generatedAtUtc, files) {
  return {
    schemaVersion: HUMAN_REVIEW_PACKAGE_SCHEMA_VERSION,
    manifestKind: "tymm-human-review-package-sha256-manifest",
    generatedAtUtc,
    hashAlgorithm: "SHA-256",
    artifacts: [...files.entries()]
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([path, text]) => ({
        path,
        bytes: Buffer.byteLength(text, "utf8"),
        sha256: sha256Text(text),
      })),
  };
}

export async function generateHumanReviewPackage({
  outputDirectory,
  generatedAtUtc,
  ledgerPath = null,
  identityEvidencePath = null,
  asOfUtc = null,
}) {
  const generatedAt = canonicalUtc(generatedAtUtc, "Paket üretim zamanı");
  const hasLedger = typeof ledgerPath === "string";
  const hasEvidence = typeof identityEvidencePath === "string";
  if (hasLedger !== hasEvidence) {
    throw new Error("--ledger ve --identity-evidence birlikte verilmelidir.");
  }
  if (hasLedger && asOfUtc === null) {
    throw new Error("Dış ledger değerlendirmesi için --as-of zorunludur.");
  }
  if (!hasLedger && asOfUtc !== null) {
    throw new Error("--as-of yalnız dış ledger ve kimlik kanıtıyla kullanılabilir.");
  }
  const candidates = buildHumanReviewCandidates(generatedAt);
  let mode = "pending-template";
  let evaluationTime = generatedAt;
  let evaluations = candidates.map((candidate) => blockedEvaluation(candidate));
  let externalInputs = null;
  if (hasLedger) {
    mode = "external-ledger-evaluation";
    evaluationTime = canonicalUtc(asOfUtc, "Dış inceleme değerlendirme zamanı");
    const [ledgerInput, identityInput] = await Promise.all([
      readBoundedJson(ledgerPath, "Dış ledger girdisi"),
      readBoundedJson(identityEvidencePath, "Dış kimlik kanıtı girdisi"),
    ]);
    if (!Array.isArray(ledgerInput.value)) {
      throw new Error("Dış ledger girdisi JSON dizisi olmalıdır.");
    }
    evaluations = await evaluateExternalHumanReview({
      candidates,
      ledger: ledgerInput.value,
      identityEvidence: identityInput.value,
      asOfUtc: evaluationTime,
    });
    externalInputs = {
      ledger: ledgerInput.provenance,
      identityEvidence: identityInput.provenance,
    };
  }
  const candidatePackage = buildCandidatePackage(candidates, generatedAt);
  const evaluationPackage = buildEvaluationPackage(
    candidates,
    generatedAt,
    mode,
    evaluationTime,
    evaluations,
  );
  const receipt = buildReceipt({
    candidates,
    generatedAtUtc: generatedAt,
    mode,
    asOfUtc: evaluationTime,
    evaluations,
    externalInputs,
  });
  const files = new Map([
    ["UZMAN_YONERGESI.md", buildHumanReviewInstructions(generatedAt)],
    ["candidates.json", prettyJson(candidatePackage)],
    ["evaluation.json", prettyJson(evaluationPackage)],
    ["human-review-template.csv", buildHumanReviewCsv(candidates)],
    ["receipt.json", prettyJson(receipt)],
  ]);
  const manifest = buildManifest(generatedAt, files);
  files.set(HUMAN_REVIEW_MANIFEST_FILE_NAME, prettyJson(manifest));
  await publishFilesAtomically(outputDirectory, files);
  return {
    exitCode: receipt.gates.recommendedExitCode,
    manifestSha256: sha256Text(files.get(HUMAN_REVIEW_MANIFEST_FILE_NAME)),
    receipt,
  };
}

async function readPackageFile(directory, fileName) {
  const path = resolve(directory, fileName);
  const information = await lstat(path);
  if (!information.isFile() || information.isSymbolicLink() || information.size > MAX_INPUT_BYTES) {
    throw new Error(`${fileName} normal ve sınırlı boyutlu dosya olmalıdır.`);
  }
  return readFile(path);
}

function parseUtf8Json(bytes, label) {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`${label} geçerli UTF-8 JSON olmalıdır.`);
  }
}

function validateEvaluationPackage(value, candidates) {
  const item = exactKeys(
    value,
    ["schemaVersion", "packageKind", "generatedAtUtc", "asOfUtc", "mode", "criteria", "counts", "evaluations"],
    "Değerlendirme paketi",
  );
  if (
    item.schemaVersion !== HUMAN_REVIEW_PACKAGE_SCHEMA_VERSION ||
    item.packageKind !== "tymm-human-review-evaluation" ||
    (item.mode !== "pending-template" && item.mode !== "external-ledger-evaluation") ||
    canonicalJson(item.criteria) !== canonicalJson([...TYMM_HUMAN_REVIEW_CRITERIA]) ||
    !Array.isArray(item.evaluations) ||
    item.evaluations.length !== candidates.length
  ) {
    throw new Error("Değerlendirme paketi üst sözleşmesi geçersiz.");
  }
  canonicalUtc(item.generatedAtUtc, "Değerlendirme üretim zamanı");
  canonicalUtc(item.asOfUtc, "Değerlendirme zamanı");
  item.evaluations.forEach((value, index) => {
    const evaluation = exactKeys(value, EVALUATION_RECORD_KEYS, `Değerlendirme[${index}]`);
    const candidate = candidates[index];
    if (
      evaluation.ordinal !== candidate.ordinal ||
      evaluation.reviewItemId !== candidate.reviewItemId ||
      evaluation.candidateMappingSha256 !== candidate.candidateMappingSha256 ||
      !REVIEW_STATUSES.has(evaluation.status) ||
      typeof evaluation.publishable !== "boolean" ||
      evaluation.publicationGate !== (evaluation.publishable ? "publishable" : "blocked") ||
      !Array.isArray(evaluation.countedReviewEventIds) ||
      !evaluation.countedReviewEventIds.every((id) => typeof id === "string" && UUID_PATTERN.test(id)) ||
      new Set(evaluation.countedReviewEventIds).size !== evaluation.countedReviewEventIds.length ||
      !Array.isArray(evaluation.issues) ||
      !evaluation.issues.every((issue) => typeof issue === "string" && issue.length > 0 && issue.length <= 4_500)
    ) {
      throw new Error(`Değerlendirme[${index}] aday veya sonuç sözleşmesine uymuyor.`);
    }
    if (
      evaluation.publishable !== (evaluation.status === "publishable") ||
      (evaluation.publishable && evaluation.countedReviewEventIds.length !== 2)
    ) {
      throw new Error(`Değerlendirme[${index}] yayımlama sonucu fail-closed sözleşmesine uymuyor.`);
    }
    if (
      item.mode === "pending-template" &&
      canonicalJson(evaluation) !== canonicalJson(blockedEvaluation(candidate))
    ) {
      throw new Error("Varsayılan pakette gerçek karar veya onay sonucu bulunamaz.");
    }
  });
  if (canonicalJson(item.counts) !== canonicalJson(evaluationCounts(item.evaluations))) {
    throw new Error("Değerlendirme özet sayıları kayıtlarla uyuşmuyor.");
  }
  return item;
}

function validateReceipt(value, candidates, evaluationPackage) {
  const item = exactKeys(
    value,
    [
      "schemaVersion",
      "receiptKind",
      "generatedAtUtc",
      "civilDate",
      "asOfUtc",
      "mode",
      "canonicalizationProfile",
      "criteria",
      "sourceCounts",
      "evaluationCounts",
      "externalInputs",
      "privacy",
      "gates",
      "disclosure",
    ],
    "Paket makbuzu",
  );
  const rebuilt = buildReceipt({
    candidates,
    generatedAtUtc: evaluationPackage.generatedAtUtc,
    mode: evaluationPackage.mode,
    asOfUtc: evaluationPackage.asOfUtc,
    evaluations: evaluationPackage.evaluations,
    externalInputs: item.externalInputs,
  });
  if (canonicalJson(item) !== canonicalJson(rebuilt)) {
    throw new Error("Paket makbuzu aday/değerlendirme özetinden yeniden üretilemedi.");
  }
  if (item.externalInputs !== null) {
    const external = exactKeys(item.externalInputs, ["ledger", "identityEvidence"], "Dış girdi makbuzu");
    for (const [label, provenance] of Object.entries(external)) {
      const record = exactKeys(provenance, ["bytes", "sha256"], `${label} girdi makbuzu`);
      if (!Number.isSafeInteger(record.bytes) || record.bytes < 1 || !SHA256_PATTERN.test(record.sha256)) {
        throw new Error(`${label} girdi makbuzu geçersiz.`);
      }
    }
  }
  return item;
}

export async function verifyHumanReviewPackage(directory) {
  const packagePath = resolve(directory);
  const directoryInfo = await lstat(packagePath);
  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) {
    throw new Error("İnceleme paketi normal bir dizin olmalıdır.");
  }
  const entries = await readdir(packagePath, { withFileTypes: true });
  const expectedNames = [...HUMAN_REVIEW_PACKAGE_FILE_NAMES, HUMAN_REVIEW_MANIFEST_FILE_NAME].sort();
  const actualNames = entries.map((entry) => entry.name).sort();
  if (
    actualNames.length !== expectedNames.length ||
    actualNames.some((name, index) => name !== expectedNames[index]) ||
    entries.some((entry) => !entry.isFile() || entry.isSymbolicLink())
  ) {
    throw new Error("Paket exact dosya kümesini taşımıyor veya güvenli olmayan giriş içeriyor.");
  }
  const manifestBytes = await readPackageFile(packagePath, HUMAN_REVIEW_MANIFEST_FILE_NAME);
  const manifest = exactKeys(
    parseUtf8Json(manifestBytes, "SHA-256 manifesti"),
    ["schemaVersion", "manifestKind", "generatedAtUtc", "hashAlgorithm", "artifacts"],
    "SHA-256 manifesti",
  );
  if (
    manifest.schemaVersion !== HUMAN_REVIEW_PACKAGE_SCHEMA_VERSION ||
    manifest.manifestKind !== "tymm-human-review-package-sha256-manifest" ||
    manifest.hashAlgorithm !== "SHA-256" ||
    !Array.isArray(manifest.artifacts) ||
    manifest.artifacts.length !== HUMAN_REVIEW_PACKAGE_FILE_NAMES.length
  ) {
    throw new Error("SHA-256 manifest üst sözleşmesi geçersiz.");
  }
  canonicalUtc(manifest.generatedAtUtc, "Manifest üretim zamanı");
  const expectedArtifactNames = [...HUMAN_REVIEW_PACKAGE_FILE_NAMES].sort();
  const artifactBytes = new Map();
  for (let index = 0; index < manifest.artifacts.length; index += 1) {
    const artifact = exactKeys(
      manifest.artifacts[index],
      ["path", "bytes", "sha256"],
      `Manifest artefaktı[${index}]`,
    );
    if (
      artifact.path !== expectedArtifactNames[index] ||
      !Number.isSafeInteger(artifact.bytes) ||
      artifact.bytes < 1 ||
      !SHA256_PATTERN.test(artifact.sha256)
    ) {
      throw new Error("Manifest artefakt sırası, boyutu veya özeti geçersiz.");
    }
    const bytes = await readPackageFile(packagePath, artifact.path);
    if (bytes.byteLength !== artifact.bytes || sha256Bytes(bytes) !== artifact.sha256) {
      throw new Error(`${artifact.path} SHA-256/byte doğrulamasını geçemedi.`);
    }
    artifactBytes.set(artifact.path, bytes);
  }
  const candidatePackage = parseUtf8Json(artifactBytes.get("candidates.json"), "Aday paketi");
  const generatedAtUtc = canonicalUtc(candidatePackage.generatedAtUtc, "Aday paketi üretim zamanı");
  const expectedCandidates = buildHumanReviewCandidates(generatedAtUtc);
  const expectedCandidatePackage = buildCandidatePackage(expectedCandidates, generatedAtUtc);
  if (canonicalJson(candidatePackage) !== canonicalJson(expectedCandidatePackage)) {
    throw new Error("Aday paketi canlı 357+30 kaynak, exact canonical hash/konu/kriter sözleşmesine uymuyor.");
  }
  if (generatedAtUtc !== manifest.generatedAtUtc) {
    throw new Error("Manifest ve aday paketi üretim zamanları uyuşmuyor.");
  }
  const csvBytes = artifactBytes.get("human-review-template.csv");
  new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(csvBytes);
  const csv = Buffer.from(csvBytes).toString("utf8");
  if (csv !== buildHumanReviewCsv(expectedCandidates) || csv.split("\n").length - 2 !== 387) {
    throw new Error("UTF-8 uzman CSV'si exact 387 aday satırını veya boş karar şablonunu taşımıyor.");
  }
  const instructions = new TextDecoder("utf-8", { fatal: true }).decode(
    artifactBytes.get("UZMAN_YONERGESI.md"),
  );
  if (instructions !== buildHumanReviewInstructions(generatedAtUtc)) {
    throw new Error("Türkçe uzman yönergesi paket sözleşmesiyle uyuşmuyor.");
  }
  const evaluationPackage = validateEvaluationPackage(
    parseUtf8Json(artifactBytes.get("evaluation.json"), "Değerlendirme paketi"),
    expectedCandidates,
  );
  if (evaluationPackage.generatedAtUtc !== generatedAtUtc) {
    throw new Error("Aday ve değerlendirme üretim zamanları uyuşmuyor.");
  }
  const receipt = validateReceipt(
    parseUtf8Json(artifactBytes.get("receipt.json"), "Paket makbuzu"),
    expectedCandidates,
    evaluationPackage,
  );
  return {
    exitCode: receipt.gates.recommendedExitCode,
    verified: true,
    manifestSha256: sha256Bytes(manifestBytes),
    generatedAtUtc,
    mode: receipt.mode,
    counts: receipt.evaluationCounts,
  };
}

function parseGenerateArguments(args) {
  const allowed = new Set([
    "--output",
    "--generated-at",
    "--ledger",
    "--identity-evidence",
    "--as-of",
  ]);
  const options = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!allowed.has(name) || typeof value !== "string" || value.startsWith("--")) {
      throw new Error(`Bilinmeyen veya değersiz CLI seçeneği: ${name ?? "(eksik)"}`);
    }
    if (options.has(name)) throw new Error(`CLI seçeneği ikinci kez verilemez: ${name}`);
    options.set(name, value);
  }
  if (!options.has("--output") || !options.has("--generated-at")) {
    throw new Error("generate için --output ve --generated-at zorunludur.");
  }
  return {
    outputDirectory: options.get("--output"),
    generatedAtUtc: options.get("--generated-at"),
    ledgerPath: options.get("--ledger") ?? null,
    identityEvidencePath: options.get("--identity-evidence") ?? null,
    asOfUtc: options.get("--as-of") ?? null,
  };
}

export async function runHumanReviewPackageCli(
  args,
  io = { stdout: process.stdout, stderr: process.stderr },
) {
  try {
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
      io.stdout.write(HUMAN_REVIEW_PACKAGE_HELP);
      return 0;
    }
    if (args[0] === "--verify") {
      if (args.length !== 2) throw new Error("--verify exact bir paket dizini alır.");
      const result = await verifyHumanReviewPackage(args[1]);
      io.stdout.write(prettyJson(result));
      return result.exitCode;
    }
    if (args[0] !== "generate") {
      throw new Error("İlk komut generate veya --verify olmalıdır. --help ile sözleşmeyi görün.");
    }
    const result = await generateHumanReviewPackage(parseGenerateArguments(args.slice(1)));
    io.stdout.write(prettyJson({
      generated: true,
      exitCode: result.exitCode,
      manifestSha256: result.manifestSha256,
      mode: result.receipt.mode,
      counts: result.receipt.evaluationCounts,
      publicationGate: result.receipt.gates.publication,
    }));
    return result.exitCode;
  } catch (error) {
    io.stderr.write(`HATA: ${error instanceof Error ? error.message : "Bilinmeyen hata"}\n`);
    return 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath !== null && invokedPath === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = await runHumanReviewPackageCli(process.argv.slice(2));
}
