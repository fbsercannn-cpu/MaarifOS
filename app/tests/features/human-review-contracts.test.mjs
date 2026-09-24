import assert from "node:assert/strict";
import test from "node:test";

import {
  HUMAN_REVIEW_ROLES,
  appendHumanReviewDecisionReference,
  evaluateHumanReview,
  parseHumanReviewRegistryResolution,
  parseHumanReviewSubject,
  sameHumanReviewSubject,
} from "../../src/features/values/human-review-contracts.ts";

const uuid = (value) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const digest = (character) => `sha256:${character.repeat(64)}`;

const subjectFixture = Object.freeze({
  reviewSubjectId: uuid(1),
  contentPackId: "test-only-content-pack",
  contentPackVersion: "3.0.0",
  contentReleaseId: "test-only-content-release",
  manifestDigest: digest("a"),
  contentRawSha256: digest("0"),
  contentPayloadSha256: digest("b"),
  reviewBundleSha256: digest("c"),
  constitution: {
    id: "test-only-values-constitution",
    version: "1.1.0",
    schemaVersion: 1,
    rawFileSha256: digest("d"),
  },
  officialActionCatalog: {
    id: "test-only-official-action-catalog",
    sourceVersion: "2024.09.02",
    sourceSha256: digest("e"),
    rawFileSha256: digest("f"),
  },
  createdAtUtc: "2026-08-08T10:00:00.000Z",
});

function referenceFor(index, overrides = {}) {
  return {
    decisionId: uuid(100 + index),
    assignmentId: uuid(200 + index),
    reviewSubjectId: subjectFixture.reviewSubjectId,
    manifestDigest: subjectFixture.manifestDigest,
    reviewRole: HUMAN_REVIEW_ROLES[index],
    reviewerPseudonymousId: `test-reviewer-${index + 1}`,
    ...overrides,
  };
}

function resolutionFor(index, decision = "approve", overrides = {}) {
  const reference = referenceFor(index);
  return {
    ...reference,
    subject: structuredClone(subjectFixture),
    decision,
    openFindingIds: decision === "approve" ? [] : [uuid(300 + index)],
    rationale: decision === "approve"
      ? "Test sicilinde yalnız sözleşme davranışını doğrulayan kabul kararıdır."
      : "Test sicilinde düzeltme veya kırmızı çizgi bulgusu vardır.",
    independentReviewer: true,
    conflictOfInterestCleared: true,
    decidedAtUtc: `2026-08-08T10:0${index}:00.000Z`,
    ...overrides,
  };
}

function registryFrom(resolutions) {
  const records = new Map(resolutions.map((item) => [item.decisionId, item]));
  return (decisionId) => records.get(decisionId) ?? null;
}

test("review subject exact zinciri NFC/UTC/SHA/UUID ile ayrıştırılır ve derinden dondurulur", () => {
  const parsed = parseHumanReviewSubject(structuredClone(subjectFixture));
  assert.equal(sameHumanReviewSubject(parsed, parseHumanReviewSubject(subjectFixture)), true);
  assert.equal(Object.isFrozen(parsed), true);
  assert.equal(Object.isFrozen(parsed.constitution), true);
  assert.equal(Object.isFrozen(parsed.officialActionCatalog), true);

  assert.throws(
    () => parseHumanReviewSubject({ ...structuredClone(subjectFixture), extra: true }),
    /exact alan/,
  );
  assert.throws(
    () => parseHumanReviewSubject({
      ...structuredClone(subjectFixture),
      reviewSubjectId: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA",
    }),
    /küçük harfli UUID/,
  );
  assert.throws(
    () => parseHumanReviewSubject({ ...structuredClone(subjectFixture), manifestDigest: `sha256:${"A".repeat(64)}` }),
    /SHA-256/,
  );
  assert.throws(
    () => parseHumanReviewSubject({ ...structuredClone(subjectFixture), createdAtUtc: "2026-02-31T10:00:00.000Z" }),
    /UTC ISO-8601/,
  );
  const nonNfcCatalog = structuredClone(subjectFixture);
  nonNfcCatalog.officialActionCatalog.sourceVersion = "su\u0308ru\u0308m";
  assert.throws(() => parseHumanReviewSubject(nonNfcCatalog), /NFC metni/);
});

test("karar referans defteri yalnız ekler; subject, karar, atama, rol ve aktör overwrite'ını reddeder", () => {
  const empty = Object.freeze([]);
  const first = appendHumanReviewDecisionReference(empty, referenceFor(0));
  const second = appendHumanReviewDecisionReference(first, referenceFor(1));
  assert.equal(empty.length, 0);
  assert.equal(first.length, 1);
  assert.equal(second.length, 2);
  assert.equal(Object.isFrozen(second), true);
  assert.equal(Object.isFrozen(second[0]), true);

  assert.throws(
    () => appendHumanReviewDecisionReference(first, referenceFor(1, { decisionId: referenceFor(0).decisionId })),
    /overwrite edilemez/,
  );
  assert.throws(
    () => appendHumanReviewDecisionReference(first, referenceFor(1, { assignmentId: referenceFor(0).assignmentId })),
    /ataması ikinci kararla/,
  );
  assert.throws(
    () => appendHumanReviewDecisionReference(first, referenceFor(1, { reviewRole: HUMAN_REVIEW_ROLES[0] })),
    /Aynı rol/,
  );
  assert.throws(
    () => appendHumanReviewDecisionReference(first, referenceFor(1, { reviewerPseudonymousId: "test-reviewer-1" })),
    /iki rol/,
  );
  assert.throws(
    () => appendHumanReviewDecisionReference(first, referenceFor(1, { manifestDigest: digest("9") })),
    /same exact subject|aynı exact subject/i,
  );
});

test("yetkili resolver yok, null, throw veya exact uyuşmazlık üretirse sonuç pending kalır", () => {
  const references = HUMAN_REVIEW_ROLES.map((_, index) => referenceFor(index));
  assert.equal(evaluateHumanReview(subjectFixture, references).status, "pending");
  assert.equal(evaluateHumanReview(subjectFixture, references, () => null).status, "pending");
  assert.equal(
    evaluateHumanReview(subjectFixture, references, () => {
      throw new Error("registry unavailable");
    }).status,
    "pending",
  );

  const mismatched = HUMAN_REVIEW_ROLES.map((_, index) => resolutionFor(index));
  mismatched[5].subject.manifestDigest = digest("9");
  const mismatchResult = evaluateHumanReview(
    subjectFixture,
    references,
    registryFrom(mismatched),
  );
  assert.equal(mismatchResult.status, "pending");
  assert.deepEqual(mismatchResult.unresolvedDecisionIds, [referenceFor(5).decisionId]);

  const exactSubjectMutations = [
    (subject) => { subject.contentPackVersion = "3.0.1"; },
    (subject) => { subject.contentReleaseId = "different-test-release"; },
    (subject) => { subject.contentRawSha256 = digest("7"); },
    (subject) => { subject.contentPayloadSha256 = digest("1"); },
    (subject) => { subject.reviewBundleSha256 = digest("2"); },
    (subject) => { subject.constitution.rawFileSha256 = digest("3"); },
    (subject) => { subject.officialActionCatalog.sourceSha256 = digest("4"); },
  ];
  for (const mutate of exactSubjectMutations) {
    const changed = HUMAN_REVIEW_ROLES.map((_, index) => resolutionFor(index));
    mutate(changed[0].subject);
    assert.equal(
      evaluateHumanReview(subjectFixture, references, registryFrom(changed)).status,
      "pending",
    );
  }

  const actorMismatch = HUMAN_REVIEW_ROLES.map((_, index) => resolutionFor(index));
  actorMismatch[0].reviewerPseudonymousId = "different-test-reviewer";
  assert.equal(
    evaluateHumanReview(subjectFixture, references, registryFrom(actorMismatch)).status,
    "pending",
  );
});

test("exact altı rol ve altı farklı pseudonymous aktörün authoritative approve kararları açık bulgu yoksa approved olur", () => {
  const references = HUMAN_REVIEW_ROLES.map((_, index) => referenceFor(index));
  const resolutions = HUMAN_REVIEW_ROLES.map((_, index) => resolutionFor(index));
  const result = evaluateHumanReview(
    subjectFixture,
    references,
    registryFrom(resolutions),
  );
  assert.equal(result.status, "approved");
  assert.equal(result.resolvedDecisionIds.length, 6);
  assert.equal(result.unresolvedDecisionIds.length, 0);
  assert.ok(result.roleEvaluations.every((item) => item.status === "approve"));
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.roleEvaluations), true);
});

test("durum önceliği red > changes_requested > pending > approved biçimindedir", () => {
  const references = HUMAN_REVIEW_ROLES.map((_, index) => referenceFor(index));
  const changes = HUMAN_REVIEW_ROLES.map((_, index) =>
    resolutionFor(index, index === 2 ? "request_changes" : "approve"),
  );
  assert.equal(
    evaluateHumanReview(subjectFixture, references, registryFrom(changes)).status,
    "changes_requested",
  );

  const redAndChanges = HUMAN_REVIEW_ROLES.map((_, index) =>
    resolutionFor(
      index,
      index === 1 ? "red" : index === 2 ? "request_changes" : "approve",
    ),
  );
  assert.equal(
    evaluateHumanReview(subjectFixture, references, registryFrom(redAndChanges)).status,
    "red",
  );

  const fiveReferences = references.slice(0, 5);
  assert.equal(
    evaluateHumanReview(
      subjectFixture,
      fiveReferences,
      registryFrom(changes.slice(0, 5).map((item) => ({ ...item, decision: "approve", openFindingIds: [] }))),
    ).status,
    "pending",
  );
});

test("aynı aktörün iki rolü, yinelenen rol ve bağımsız olmayan resolver cevabı onay üretmez", () => {
  const duplicateActorReferences = HUMAN_REVIEW_ROLES.map((_, index) =>
    referenceFor(index, index === 5 ? { reviewerPseudonymousId: "test-reviewer-1" } : {}),
  );
  const duplicateActorResolutions = HUMAN_REVIEW_ROLES.map((_, index) =>
    resolutionFor(index, "approve", index === 5 ? { reviewerPseudonymousId: "test-reviewer-1" } : {}),
  );
  assert.equal(
    evaluateHumanReview(
      subjectFixture,
      duplicateActorReferences,
      registryFrom(duplicateActorResolutions),
    ).status,
    "pending",
  );

  const duplicateRoleReferences = HUMAN_REVIEW_ROLES.map((_, index) =>
    referenceFor(index, index === 5 ? { reviewRole: HUMAN_REVIEW_ROLES[0] } : {}),
  );
  const duplicateRoleResolutions = HUMAN_REVIEW_ROLES.map((_, index) =>
    resolutionFor(index, "approve", index === 5 ? { reviewRole: HUMAN_REVIEW_ROLES[0] } : {}),
  );
  assert.equal(
    evaluateHumanReview(
      subjectFixture,
      duplicateRoleReferences,
      registryFrom(duplicateRoleResolutions),
    ).status,
    "pending",
  );

  const independentFalse = HUMAN_REVIEW_ROLES.map((_, index) => resolutionFor(index));
  independentFalse[0].independentReviewer = false;
  assert.equal(
    evaluateHumanReview(
      subjectFixture,
      HUMAN_REVIEW_ROLES.map((_, index) => referenceFor(index)),
      registryFrom(independentFalse),
    ).status,
    "pending",
  );
});

test("evaluator yinelenen assignmentId ile onay üretmez ve red/değişiklik önceliğini korur", () => {
  const references = HUMAN_REVIEW_ROLES.map((_, index) => referenceFor(index));
  references[5].assignmentId = references[0].assignmentId;

  const resolutions = references.map((reference, index) => ({
    ...resolutionFor(index),
    ...reference,
  }));
  assert.equal(
    evaluateHumanReview(subjectFixture, references, registryFrom(resolutions)).status,
    "pending",
  );

  const changes = references.map((reference, index) => ({
    ...resolutionFor(index, index === 2 ? "request_changes" : "approve"),
    ...reference,
  }));
  assert.equal(
    evaluateHumanReview(subjectFixture, references, registryFrom(changes)).status,
    "changes_requested",
  );

  const red = references.map((reference, index) => ({
    ...resolutionFor(index, index === 1 ? "red" : "approve"),
    ...reference,
  }));
  assert.equal(
    evaluateHumanReview(subjectFixture, references, registryFrom(red)).status,
    "red",
  );
});

test("evaluator yinelenen decisionId ve tutarsız stateful resolver ile onay üretmez", () => {
  const references = HUMAN_REVIEW_ROLES.map((_, index) => referenceFor(index));
  references[5].decisionId = references[0].decisionId;
  const resolutions = references.map((reference, index) => ({
    ...resolutionFor(index),
    ...reference,
  }));
  const remainingRegistry = registryFrom(resolutions.slice(1, 5));
  let duplicateDecisionCallCount = 0;
  const inconsistentResolver = (decisionId) => {
    if (decisionId === references[0].decisionId) {
      const resolutionIndex = duplicateDecisionCallCount === 0 ? 0 : 5;
      duplicateDecisionCallCount += 1;
      return resolutions[resolutionIndex];
    }
    return remainingRegistry(decisionId);
  };

  assert.equal(
    evaluateHumanReview(subjectFixture, references, inconsistentResolver).status,
    "pending",
  );
});

test("authoritative resolution ile referans arasındaki exact kimlik driftleri onay üretmez", () => {
  const driftCases = [
    ["decisionId", uuid(990)],
    ["assignmentId", uuid(991)],
    ["reviewSubjectId", uuid(992)],
    ["manifestDigest", digest("9")],
    ["reviewRole", HUMAN_REVIEW_ROLES[1]],
    ["reviewerPseudonymousId", "drifted-test-reviewer"],
  ];

  for (const [field, value] of driftCases) {
    const references = HUMAN_REVIEW_ROLES.map((_, index) => referenceFor(index));
    const resolutions = HUMAN_REVIEW_ROLES.map((_, index) => resolutionFor(index));
    const driftedResolution = { ...resolutions[0], [field]: value };
    const exactRegistry = registryFrom(resolutions);
    const result = evaluateHumanReview(subjectFixture, references, (decisionId) =>
      decisionId === references[0].decisionId
        ? driftedResolution
        : exactRegistry(decisionId));

    assert.equal(result.status, "pending", `${field} drift pending kalmalıdır.`);
    assert.deepEqual(
      result.unresolvedDecisionIds,
      [references[0].decisionId],
      `${field} drift çözülmemiş karar olarak raporlanmalıdır.`,
    );
  }
});

test("sicil kararı strict exact-key, NFC, UTC ve açık bulgu karar tutarlılığını uygular", () => {
  assert.throws(
    () => parseHumanReviewRegistryResolution({ ...resolutionFor(0), forgedApproval: true }),
    /exact alan/,
  );
  assert.throws(
    () => parseHumanReviewRegistryResolution(resolutionFor(0, "approve", { openFindingIds: [uuid(900)] })),
    /Approve kararı açık bulgu/,
  );
  assert.throws(
    () => parseHumanReviewRegistryResolution(resolutionFor(0, "red", { openFindingIds: [] })),
    /en az bir açık bulgu/,
  );
  assert.throws(
    () => parseHumanReviewRegistryResolution(resolutionFor(0, "approve", { rationale: "Du\u0308zeltme" })),
    /NFC metni/,
  );
  assert.throws(
    () => parseHumanReviewRegistryResolution(resolutionFor(0, "approve", { decidedAtUtc: "2026-08-08T10:00:00+03:00" })),
    /UTC ISO-8601/,
  );
  assert.throws(
    () => parseHumanReviewRegistryResolution(resolutionFor(0, "approve", { decidedAtUtc: "2026-08-08T09:59:59.999Z" })),
    /oluşturulmadan önce/,
  );
  assert.throws(
    () => parseHumanReviewRegistryResolution(resolutionFor(0, "approve", { reviewerPseudonymousId: "real.person@example.org" })),
    /pseudonymous/,
  );
});
