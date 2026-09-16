import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { canonicalJson } from "../../src/core/backup/canonical-json.ts";
import {
  TYMM_HUMAN_REVIEW_CRITERIA,
  appendTymmHumanReviewLedgerEvent,
  parseTymmMappingReviewSubject,
} from "../../src/features/pedagogical-os/tymm-human-review-ledger.ts";
import {
  HUMAN_REVIEW_PACKAGE_FILE_NAMES,
  HUMAN_REVIEW_PACKAGE_HELP,
  buildHumanReviewCandidates,
  evaluateExternalHumanReview,
  generateHumanReviewPackage,
  runHumanReviewPackageCli,
  verifyHumanReviewPackage,
} from "../../scripts/tymm-human-review-package.mjs";

const GENERATED_AT = "2026-09-09T06:00:00.000Z";
const AS_OF = "2026-09-09T12:00:00.000Z";
const digest = (character) => `sha256:${character.repeat(64)}`;
const uuid = (value) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

async function temporaryRoot(t) {
  const root = await mkdtemp(join(tmpdir(), "maarif-tymm-review-package-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  return root;
}

function captureIo() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write: (value) => { stdout += String(value); } },
      stderr: { write: (value) => { stderr += String(value); } },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("Kapanmamış CSV alanı");
  fields.push(field);
  return fields;
}

function reviewEvent(candidate, index, {
  actorId = `external-human-${index}`,
  actorKind = "real-human",
  independentReviewer = true,
  conflictOfInterestCleared = true,
  identityEvidenceId = actorKind === "real-human" ? uuid(100 + index) : null,
  decision = "APPROVE",
} = {}) {
  return {
    schemaVersion: 1,
    eventType: "REVIEW_DECIDED",
    eventId: uuid(index),
    subject: structuredClone(candidate.subject),
    reviewer: {
      actorId,
      actorKind,
      role: "independent-preschool-education-expert",
      independentReviewer,
      conflictOfInterestCleared,
      identityEvidenceId,
    },
    scope: {
      reviewItemId: candidate.reviewItemId,
      candidateMappingSha256: candidate.candidateMappingSha256,
      criteria: [...TYMM_HUMAN_REVIEW_CRITERIA],
    },
    reviewedAtUtc: index % 2 === 0
      ? "2026-09-09T09:00:00.000Z"
      : "2026-09-09T08:00:00.000Z",
    civilDate: "2026-09-09",
    rationale: decision === "APPROVE"
      ? "Exact aday dört pedagojik ölçütte bağımsız olarak incelendi ve uygun bulundu."
      : "Exact adayın pedagojik eşlemesinde düzeltilmesi gereken açık bir bulgu bulundu.",
    decision,
    findingIds: decision === "APPROVE" ? [] : [uuid(400 + index)],
    authorizationReference: `external-review-assignment-${index}`,
    reviewArtifactSha256: digest(index % 2 === 0 ? "b" : "a"),
  };
}

function identityEvidence(index, {
  actorId = `external-human-${index}`,
  evidenceId = uuid(100 + index),
} = {}) {
  return {
    schemaVersion: 1,
    evidenceId,
    subjectActorId: actorId,
    actorKind: "real-human",
    authorizedRole: "independent-preschool-education-expert",
    scope: "tymm-pedagogical-mapping-review",
    methodVersion: "1.0",
    verificationMethod: "institutional-attestation",
    verifiedByActorId: "external-authority-registry",
    verifiedAtUtc: "2026-09-09T05:00:00.000Z",
    validFromUtc: "2026-09-09T00:00:00.000Z",
    expiresAtUtc: "2027-09-09T00:00:00.000Z",
    status: "ACTIVE",
    revocationStatus: "KNOWN_CLEAR",
    evidenceSha256: digest(index % 2 === 0 ? "d" : "c"),
  };
}

async function ledgerFrom(...events) {
  let ledger = [];
  for (const event of events) {
    ledger = await appendTymmHumanReviewLedgerEvent(ledger, event);
  }
  return ledger;
}

test("help üretim, dış ledger ve --verify çıkış kodu sözleşmesini açıklar", () => {
  assert.match(HUMAN_REVIEW_PACKAGE_HELP, /357 etkinlik×yaş \+ 30 yaş×ay/u);
  assert.match(HUMAN_REVIEW_PACKAGE_HELP, /başlık hariç 387 satırdır/u);
  assert.match(HUMAN_REVIEW_PACKAGE_HELP, /--generated-at/u);
  assert.match(HUMAN_REVIEW_PACKAGE_HELP, /--ledger <ledger\.json>/u);
  assert.match(HUMAN_REVIEW_PACKAGE_HELP, /--identity-evidence <identity\.json>/u);
  assert.match(HUMAN_REVIEW_PACKAGE_HELP, /--verify <dizin>/u);
  assert.match(HUMAN_REVIEW_PACKAGE_HELP, /Ajan, kurgu kimlik/u);
  assert.match(HUMAN_REVIEW_PACKAGE_HELP, /çıkış kodu 2/u);
});

test("CLI 387 pending adayı exact hash/konu/dört kriter, boş iki uzman alanı ve deterministik SHA-256 manifestle üretir", async (t) => {
  const root = await temporaryRoot(t);
  const first = join(root, "first");
  const second = join(root, "second");
  const firstIo = captureIo();
  const secondIo = captureIo();
  const args = (output) => [
    "generate",
    "--output",
    output,
    "--generated-at",
    GENERATED_AT,
  ];
  assert.equal(await runHumanReviewPackageCli(args(first), firstIo.io), 0);
  assert.equal(await runHumanReviewPackageCli(args(second), secondIo.io), 0);
  assert.equal(firstIo.stderr(), "");
  assert.equal(secondIo.stderr(), "");

  const names = [...HUMAN_REVIEW_PACKAGE_FILE_NAMES, "manifest.json"].sort();
  assert.deepEqual((await readdir(first)).sort(), names);
  assert.deepEqual((await readdir(second)).sort(), names);
  for (const name of names) {
    assert.deepEqual(
      await readFile(join(first, name)),
      await readFile(join(second, name)),
      `${name} aynı explicit zamanla byte-eş olmalı`,
    );
  }

  const candidatePackage = JSON.parse(await readFile(join(first, "candidates.json"), "utf8"));
  assert.deepEqual(candidatePackage.counts, { activityAge: 357, ageMonth: 30, total: 387 });
  assert.equal(candidatePackage.containsHumanReviewerIdentity, false);
  assert.equal(candidatePackage.containsHumanReviewDecision, false);
  assert.equal(candidatePackage.candidates.length, 387);
  assert.equal(new Set(candidatePackage.candidates.map((item) => item.reviewItemId)).size, 387);
  for (const candidate of candidatePackage.candidates) {
    assert.equal(candidate.reviewStatus, "pending-human-review");
    assert.equal(candidate.publicationState, "blocked-awaiting-two-independent-human-reviews");
    assert.deepEqual(candidate.independentPreschoolExpertApprovals, []);
    assert.deepEqual(candidate.reviewScope.criteria, [...TYMM_HUMAN_REVIEW_CRITERIA]);
    assert.equal(
      candidate.candidateMappingSha256,
      sha256(Buffer.from(canonicalJson(candidate.candidatePayload), "utf8")),
    );
    assert.equal(candidate.subject.candidateMappingSha256, candidate.candidateMappingSha256);
    assert.equal(candidate.reviewScope.candidateMappingSha256, candidate.candidateMappingSha256);
    assert.doesNotThrow(() => parseTymmMappingReviewSubject(candidate.subject));
  }

  const csv = await readFile(join(first, "human-review-template.csv"), "utf8");
  const lines = csv.split("\n");
  assert.equal(lines.length - 2, 387);
  const headers = parseCsvLine(lines[0].replace(/^\uFEFF/u, ""));
  const blankColumns = [
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
  for (const line of lines.slice(1, -1)) {
    const fields = parseCsvLine(line);
    assert.equal(fields.length, headers.length);
    for (const column of blankColumns) assert.equal(fields[headers.indexOf(column)], "");
    assert.deepEqual(
      [
        fields[headers.indexOf("kriter_1_yasa_uygunluk")],
        fields[headers.indexOf("kriter_2_ogrenme_ciktisi_uyumu")],
        fields[headers.indexOf("kriter_3_farklilastirma")],
        fields[headers.indexOf("kriter_4_gozlem_dili")],
      ],
      [...TYMM_HUMAN_REVIEW_CRITERIA],
    );
  }

  const receipt = JSON.parse(await readFile(join(first, "receipt.json"), "utf8"));
  assert.equal(receipt.mode, "pending-template");
  assert.equal(receipt.evaluationCounts.publishable, 0);
  assert.equal(receipt.evaluationCounts.blocked, 387);
  assert.equal(receipt.gates.externalReviewValidation, "not-run");
  assert.equal(receipt.gates.recommendedExitCode, 0);
  assert.deepEqual(receipt.externalInputs, null);
  assert.equal(receipt.privacy.containsReviewerIdentity, false);
  assert.equal(receipt.privacy.containsIdentityEvidenceBody, false);
  assert.equal(receipt.privacy.containsRawReviewDecision, false);
  assert.equal(receipt.privacy.inputPathsRecorded, false);

  const manifestBytes = await readFile(join(first, "manifest.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  assert.equal(manifest.artifacts.length, 5);
  for (const artifact of manifest.artifacts) {
    const bytes = await readFile(join(first, artifact.path));
    assert.equal(artifact.bytes, bytes.byteLength);
    assert.equal(artifact.sha256, sha256(bytes));
  }
  assert.equal(
    JSON.parse(firstIo.stdout()).manifestSha256,
    sha256(manifestBytes),
  );

  const verified = await verifyHumanReviewPackage(first);
  assert.equal(verified.verified, true);
  assert.equal(verified.exitCode, 0);
  const verifyIo = captureIo();
  assert.equal(await runHumanReviewPackageCli(["--verify", first], verifyIo.io), 0);
  assert.equal(JSON.parse(verifyIo.stdout()).counts.total, 387);
});

test("dış ledger kapısı non-human, bağımsız olmayan, tek/aynı uzman ve çelişkiyi sıfır dışı bırakır", async (t) => {
  const root = await temporaryRoot(t);
  const candidates = buildHumanReviewCandidates(GENERATED_AT);
  const candidate = candidates[0];
  const firstHuman = reviewEvent(candidate, 1);
  const secondHuman = reviewEvent(candidate, 2);
  const cases = [
    {
      name: "non-human",
      ledger: await ledgerFrom(reviewEvent(candidate, 11, {
        actorId: "review-agent-fixture",
        actorKind: "agent",
        identityEvidenceId: null,
      })),
      evidence: [],
      status: "pending-human-review",
      issue: /gerçek insan/u,
    },
    {
      name: "non-independent",
      ledger: await ledgerFrom(reviewEvent(candidate, 12, { independentReviewer: false })),
      evidence: [identityEvidence(12)],
      status: "pending-human-review",
      issue: /gerçek insan/u,
    },
    {
      name: "single-human",
      ledger: await ledgerFrom(firstHuman),
      evidence: [identityEvidence(1)],
      status: "pending-human-review",
      issue: /exact iki ayrı/u,
    },
    {
      name: "same-human",
      ledger: await ledgerFrom(
        firstHuman,
        reviewEvent(candidate, 2, {
          actorId: "external-human-1",
          identityEvidenceId: uuid(102),
        }),
      ),
      evidence: [
        identityEvidence(1),
        identityEvidence(2, { actorId: "external-human-1", evidenceId: uuid(102) }),
      ],
      status: "pending-human-review",
      issue: /exact iki ayrı/u,
    },
    {
      name: "conflict",
      ledger: await ledgerFrom(firstHuman, reviewEvent(candidate, 2, { decision: "REJECT" })),
      evidence: [identityEvidence(1), identityEvidence(2)],
      status: "conflict-requires-resolution",
      issue: null,
    },
  ];

  for (const fixture of cases) {
    const evaluations = await evaluateExternalHumanReview({
      candidates,
      ledger: fixture.ledger,
      identityEvidence: fixture.evidence,
      asOfUtc: AS_OF,
    });
    assert.equal(evaluations.length, 387, fixture.name);
    assert.equal(evaluations[0].status, fixture.status, fixture.name);
    assert.equal(evaluations[0].publishable, false, fixture.name);
    if (fixture.issue) assert.match(evaluations[0].issues.join("\n"), fixture.issue, fixture.name);

    const ledgerPath = join(root, `${fixture.name}-ledger.json`);
    const evidencePath = join(root, `${fixture.name}-identity.json`);
    const output = join(root, `${fixture.name}-package`);
    await writeFile(ledgerPath, JSON.stringify(fixture.ledger), "utf8");
    await writeFile(evidencePath, JSON.stringify(fixture.evidence), "utf8");
    const generated = await generateHumanReviewPackage({
      outputDirectory: output,
      generatedAtUtc: GENERATED_AT,
      ledgerPath,
      identityEvidencePath: evidencePath,
      asOfUtc: AS_OF,
    });
    assert.equal(generated.exitCode, 2, fixture.name);
    assert.equal(generated.receipt.gates.publication, "blocked", fixture.name);
    assert.equal(generated.receipt.gates.externalReviewValidation, "blocked", fixture.name);
    assert.equal(generated.receipt.evaluationCounts.publishable, 0, fixture.name);
    assert.equal(generated.receipt.evaluationCounts.blocked, 387, fixture.name);
    assert.equal((await verifyHumanReviewPackage(output)).exitCode, 2, fixture.name);
  }
});

test("bozuk ledger fail-closed kalır, atomik hedef yayımlanmaz ve mevcut paket ezilmez", async (t) => {
  const root = await temporaryRoot(t);
  const candidates = buildHumanReviewCandidates(GENERATED_AT);
  const valid = await ledgerFrom(reviewEvent(candidates[0], 1));
  const tampered = structuredClone(valid);
  tampered[0].eventHash = digest("0");
  const ledgerPath = join(root, "tampered-ledger.json");
  const identityPath = join(root, "identity.json");
  const invalidOutput = join(root, "invalid-output");
  await writeFile(ledgerPath, JSON.stringify(tampered), "utf8");
  await writeFile(identityPath, JSON.stringify([identityEvidence(1)]), "utf8");
  await assert.rejects(
    generateHumanReviewPackage({
      outputDirectory: invalidOutput,
      generatedAtUtc: GENERATED_AT,
      ledgerPath,
      identityEvidencePath: identityPath,
      asOfUtc: AS_OF,
    }),
    /hash'i doğrulanamadı/u,
  );
  await assert.rejects(readFile(join(invalidOutput, "manifest.json")), /ENOENT/u);

  const safeOutput = join(root, "safe-output");
  await generateHumanReviewPackage({ outputDirectory: safeOutput, generatedAtUtc: GENERATED_AT });
  const manifestBefore = await readFile(join(safeOutput, "manifest.json"));
  await assert.rejects(
    generateHumanReviewPackage({ outputDirectory: safeOutput, generatedAtUtc: GENERATED_AT }),
    /zaten var/u,
  );
  assert.deepEqual(await readFile(join(safeOutput, "manifest.json")), manifestBefore);

  await writeFile(join(safeOutput, "evaluation.json"), "{}\n", "utf8");
  const io = captureIo();
  assert.equal(await runHumanReviewPackageCli(["--verify", safeOutput], io.io), 1);
  assert.match(io.stderr(), /SHA-256\/byte/u);
});

test("CLI explicit zaman ile eşlenmiş ledger/identity parametrelerini zorunlu tutar", async (t) => {
  const root = await temporaryRoot(t);
  for (const args of [
    ["generate", "--output", join(root, "missing-time")],
    ["generate", "--output", join(root, "ledger-only"), "--generated-at", GENERATED_AT, "--ledger", "ledger.json"],
    ["generate", "--output", join(root, "as-of-only"), "--generated-at", GENERATED_AT, "--as-of", AS_OF],
    ["--verify"],
  ]) {
    const io = captureIo();
    assert.equal(await runHumanReviewPackageCli(args, io.io), 1);
    assert.match(io.stderr(), /HATA:/u);
  }
});
