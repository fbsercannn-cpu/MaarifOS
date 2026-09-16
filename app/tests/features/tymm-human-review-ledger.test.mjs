import assert from "node:assert/strict";
import test from "node:test";

import {
  TYMM_HUMAN_REVIEW_CRITERIA,
  appendTymmHumanReviewLedgerEvent,
  evaluateTymmMappingReview,
  parseTymmHumanReviewLedgerEvent,
  verifyTymmHumanReviewLedger,
} from "../../src/features/pedagogical-os/tymm-human-review-ledger.ts";

const uuid = (value) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const digest = (character) => `sha256:${character.repeat(64)}`;

const subject = Object.freeze({
  schemaVersion: 1,
  reviewItemId: "contract-fixture-activity:60-72",
  candidateMappingSha256: digest("a"),
  proposerActorId: "contract-fixture-proposer",
  proposedAtUtc: "2026-09-09T08:00:00.000Z",
  civilDate: "2026-09-09",
});

function identityEvidence(index, role = "independent-preschool-education-expert", overrides = {}) {
  return {
    schemaVersion: 1,
    evidenceId: uuid(100 + index),
    subjectActorId: role === "pedagogical-review-coordinator"
      ? `registry-coordinator-${index}`
      : `registry-human-${index}`,
    actorKind: "real-human",
    authorizedRole: role,
    scope: "tymm-pedagogical-mapping-review",
    methodVersion: "1.0",
    verificationMethod: "institutional-attestation",
    verifiedByActorId: "external-authority-registry",
    verifiedAtUtc: "2026-09-09T07:00:00.000Z",
    validFromUtc: "2026-09-09T07:00:00.000Z",
    expiresAtUtc: "2026-12-31T21:00:00.000Z",
    status: "ACTIVE",
    revocationStatus: "KNOWN_CLEAR",
    evidenceSha256: digest(String((index % 9) + 1)),
    ...overrides,
  };
}

function reviewEvent(index, decision = "APPROVE", overrides = {}) {
  const reviewerIndex = index;
  return {
    schemaVersion: 1,
    eventType: "REVIEW_DECIDED",
    eventId: uuid(index),
    subject: structuredClone(subject),
    reviewer: {
      actorId: `registry-human-${reviewerIndex}`,
      actorKind: "real-human",
      role: "independent-preschool-education-expert",
      independentReviewer: true,
      conflictOfInterestCleared: true,
      identityEvidenceId: uuid(100 + reviewerIndex),
    },
    scope: {
      reviewItemId: subject.reviewItemId,
      candidateMappingSha256: subject.candidateMappingSha256,
      criteria: [...TYMM_HUMAN_REVIEW_CRITERIA],
    },
    reviewedAtUtc: `2026-09-09T1${reviewerIndex}:00:00.000Z`,
    civilDate: "2026-09-09",
    rationale: decision === "APPROVE"
      ? "Dört inceleme kapsamı exact aday üzerinde ayrı ayrı değerlendirilip uygun bulundu."
      : "Exact aday eşlemede çözülmesi gereken kapsamlı bir pedagojik bulgu kaydedildi.",
    decision,
    findingIds: decision === "APPROVE" ? [] : [uuid(400 + reviewerIndex)],
    authorizationReference: `external-registry-assignment-${reviewerIndex}`,
    reviewArtifactSha256: digest(String((reviewerIndex % 8) + 1)),
    ...overrides,
  };
}

function conflictEvent(index, reviewIds, overrides = {}) {
  return {
    schemaVersion: 1,
    eventType: "CONFLICT_RESOLVED",
    eventId: uuid(index),
    subject: structuredClone(subject),
    resolver: {
      actorId: "registry-coordinator-9",
      actorKind: "real-human",
      role: "pedagogical-review-coordinator",
      identityEvidenceId: uuid(109),
    },
    conflictingReviewEventIds: reviewIds,
    decidedAtUtc: "2026-09-09T16:00:00.000Z",
    civilDate: "2026-09-09",
    rationale:
      "Çelişkili iki bağımsız inceleme kapatılmadan aday yayımlanamaz; taze inceleme çifti istendi.",
    decision: "REQUEST_FRESH_REVIEWS",
    authorizationReference: "external-registry-conflict-assignment",
    resolutionArtifactSha256: digest("e"),
    ...overrides,
  };
}

function identityResolver(...evidence) {
  const registry = new Map(evidence.map((item) => [item.evidenceId, item]));
  return (evidenceId) => registry.get(evidenceId) ?? null;
}

async function ledgerFrom(...events) {
  let ledger = [];
  for (const event of events) {
    ledger = await appendTymmHumanReviewLedgerEvent(ledger, event);
  }
  return ledger;
}

test("external sicil olmadan ve ajan/kurgu aktörle yayımlanabilir durum oluşmaz", async () => {
  const first = reviewEvent(1);
  const second = reviewEvent(2);
  const unresolvedLedger = await ledgerFrom(first, second);
  const unresolved = await evaluateTymmMappingReview({
    subject,
    ledger: unresolvedLedger,
    asOfUtc: "2026-09-09T18:00:00.000Z",
  });
  assert.equal(unresolved.status, "pending-human-review");
  assert.equal(unresolved.publishable, false);
  assert.match(unresolved.issues.join("\n"), /doğrulanabilir bağımsız gerçek insan/u);

  const fictional = reviewEvent(3, "APPROVE", {
    reviewer: {
      actorId: "fictional-contract-fixture",
      actorKind: "fictional-test",
      role: "independent-preschool-education-expert",
      independentReviewer: true,
      conflictOfInterestCleared: true,
      identityEvidenceId: null,
    },
  });
  const agent = reviewEvent(4, "APPROVE", {
    reviewer: {
      actorId: "agent-contract-fixture",
      actorKind: "agent",
      role: "independent-preschool-education-expert",
      independentReviewer: true,
      conflictOfInterestCleared: true,
      identityEvidenceId: null,
    },
  });
  const result = await evaluateTymmMappingReview({
    subject,
    ledger: await ledgerFrom(fictional, agent),
    asOfUtc: "2026-09-09T18:00:00.000Z",
    resolveIdentityEvidence: identityResolver(),
  });
  assert.equal(result.status, "pending-human-review");
  assert.equal(result.publishable, false);
  assert.deepEqual(result.countedReviewEventIds, []);
});

test("yalnız exact iki ayrı dış sicil doğrulamalı gerçek insan incelemesi publishable olur", async () => {
  const result = await evaluateTymmMappingReview({
    subject,
    ledger: await ledgerFrom(reviewEvent(1), reviewEvent(2)),
    asOfUtc: "2026-09-09T18:00:00.000Z",
    resolveIdentityEvidence: identityResolver(identityEvidence(1), identityEvidence(2)),
  });
  assert.equal(result.status, "publishable");
  assert.equal(result.publishable, true);
  assert.deepEqual(result.countedReviewEventIds, [uuid(1), uuid(2)]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.countedReviewEventIds), true);

  const sameActorSecond = reviewEvent(2, "APPROVE", {
    reviewer: {
      ...reviewEvent(1).reviewer,
      identityEvidenceId: uuid(101),
    },
  });
  const sameActorEvidence = identityEvidence(1);
  const mismatchedEvidence = identityEvidence(2, "independent-preschool-education-expert", {
    subjectActorId: "registry-human-1",
  });
  const sameActorResult = await evaluateTymmMappingReview({
    subject,
    ledger: await ledgerFrom(reviewEvent(1), sameActorSecond),
    asOfUtc: "2026-09-09T18:00:00.000Z",
    resolveIdentityEvidence: identityResolver(sameActorEvidence, mismatchedEvidence),
  });
  assert.equal(sameActorResult.status, "pending-human-review");
  assert.equal(sameActorResult.publishable, false);
});

test("iptal, süresi geçmiş veya exact aktörle uyuşmayan kimlik kanıtı fail-closed kalır", async () => {
  const invalidEvidenceCases = [
    identityEvidence(2, "independent-preschool-education-expert", {
      status: "REVOKED",
      revocationStatus: "REVOKED",
    }),
    identityEvidence(2, "independent-preschool-education-expert", {
      expiresAtUtc: "2026-09-09T15:00:00.000Z",
    }),
    identityEvidence(2, "independent-preschool-education-expert", {
      subjectActorId: "another-registry-human",
    }),
  ];
  for (const invalidEvidence of invalidEvidenceCases) {
    const result = await evaluateTymmMappingReview({
      subject,
      ledger: await ledgerFrom(reviewEvent(1), reviewEvent(2)),
      asOfUtc: "2026-09-09T18:00:00.000Z",
      resolveIdentityEvidence: identityResolver(identityEvidence(1), invalidEvidence),
    });
    assert.equal(result.publishable, false);
    assert.equal(result.status, "pending-human-review");
  }
});

test("çelişki kayıtlı çözüm olmadan bloklanır; koordinatör yalnız ret veya taze iki inceleme isteyebilir", async () => {
  const approve = reviewEvent(1);
  const reject = reviewEvent(2, "REJECT");
  const conflictedLedger = await ledgerFrom(approve, reject);
  const resolver = identityResolver(
    identityEvidence(1),
    identityEvidence(2),
    identityEvidence(9, "pedagogical-review-coordinator"),
    identityEvidence(3),
    identityEvidence(4),
  );
  const conflict = await evaluateTymmMappingReview({
    subject,
    ledger: conflictedLedger,
    asOfUtc: "2026-09-09T18:00:00.000Z",
    resolveIdentityEvidence: resolver,
  });
  assert.equal(conflict.status, "conflict-requires-resolution");
  assert.equal(conflict.publishable, false);

  const requestFresh = conflictEvent(20, [approve.eventId, reject.eventId]);
  const resetLedger = await appendTymmHumanReviewLedgerEvent(conflictedLedger, requestFresh);
  const reset = await evaluateTymmMappingReview({
    subject,
    ledger: resetLedger,
    asOfUtc: "2026-09-09T18:00:00.000Z",
    resolveIdentityEvidence: resolver,
  });
  assert.equal(reset.status, "pending-human-review");
  assert.equal(reset.publishable, false);

  const freshOne = reviewEvent(3, "APPROVE", {
    reviewedAtUtc: "2026-09-09T16:30:00.000Z",
  });
  const freshTwo = reviewEvent(4, "APPROVE", {
    reviewedAtUtc: "2026-09-09T17:00:00.000Z",
  });
  const freshLedger = await appendTymmHumanReviewLedgerEvent(
    await appendTymmHumanReviewLedgerEvent(resetLedger, freshOne),
    freshTwo,
  );
  const resolved = await evaluateTymmMappingReview({
    subject,
    ledger: freshLedger,
    asOfUtc: "2026-09-09T18:00:00.000Z",
    resolveIdentityEvidence: resolver,
  });
  assert.equal(resolved.status, "publishable");
  assert.deepEqual(resolved.countedReviewEventIds, [freshOne.eventId, freshTwo.eventId]);

  assert.throws(
    () => parseTymmHumanReviewLedgerEvent(
      conflictEvent(21, [approve.eventId, reject.eventId], { decision: "APPROVE_CANDIDATE" }),
    ),
    /tek başına onaylayamaz/u,
  );
});

test("append-only SHA-256 zinciri geçmiş ve olay tamper'ını reddeder", async () => {
  const ledger = await ledgerFrom(reviewEvent(1), reviewEvent(2));
  assert.equal((await verifyTymmHumanReviewLedger(ledger)).length, 2);
  assert.match(ledger[0].eventHash, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(ledger[1].previousHash, ledger[0].eventHash);

  const tampered = structuredClone(ledger);
  tampered[0].event.rationale = "Bu metin hash hesabından sonra değiştirildi ve geçersizdir.";
  await assert.rejects(() => verifyTymmHumanReviewLedger(tampered), /hash'i doğrulanamadı/u);

  assert.throws(
    () => parseTymmHumanReviewLedgerEvent({ ...reviewEvent(1), unexpected: true }),
    /exact alan/u,
  );
  assert.throws(
    () => parseTymmHumanReviewLedgerEvent({ ...reviewEvent(1), civilDate: "2026-09-10" }),
    /Europe\/Istanbul/u,
  );
});
