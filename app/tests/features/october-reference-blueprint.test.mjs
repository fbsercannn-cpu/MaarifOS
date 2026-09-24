import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OCTOBER_REFERENCE_AUTHORED_LENS_IDS,
  OCTOBER_REFERENCE_BLUEPRINT,
  OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS,
  OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS_BY_ACTIVITY_ID,
  OCTOBER_REFERENCE_PRIMARY_VALUE_CODES,
  OCTOBER_REFERENCE_RAW_SHA256,
  parseOctoberReferenceBlueprint,
  parseOctoberReferenceBlueprintCandidate,
} from "../../src/features/values/october-reference-blueprint.ts";
import { assertOfficialPreschoolValueActionSnapshot } from "../../src/features/values/official-preschool-value-actions.ts";

const blueprintUrl = new URL(
  "../../../premium-content/releases/tymm-6072/2026-10/reference-blueprint.v1.json",
  import.meta.url,
);

async function rawBlueprint() {
  return JSON.parse(await readFile(blueprintUrl, "utf8"));
}

function activities(blueprint) {
  return blueprint.weeks.flatMap((week) => week.activities);
}

function counts(values) {
  const result = new Map();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
}

test("Ekim private raw JSON bytes hardcoded SHA-256 review pinine exact bağlıdır", async () => {
  const rawBytes = await readFile(blueprintUrl);
  const actual = `sha256:${createHash("sha256").update(rawBytes).digest("hex")}`;
  assert.equal(actual, OCTOBER_REFERENCE_RAW_SHA256);
});

test("Ekim planlı referans blueprint'i 4×3 değer, çatı, yön ve authored lens sözleşmesini korur", async () => {
  const raw = await rawBlueprint();
  const before = structuredClone(raw);
  const blueprint = parseOctoberReferenceBlueprint(raw);
  assert.deepEqual(
    parseOctoberReferenceBlueprintCandidate(structuredClone(raw)),
    blueprint,
  );
  assert.deepEqual(raw, before, "strict parser ham blueprint nesnesini değiştirmemeli");
  assert.deepEqual(blueprint, OCTOBER_REFERENCE_BLUEPRINT);
  assert.equal(blueprint.artifactKind, "planned_reference_blueprint");
  assert.equal(blueprint.status, "planned_reference_blueprint");
  assert.equal(blueprint.reviewBoundary.humanReviewRequired, true);
  assert.equal(blueprint.reviewBoundary.humanApproved, false);
  assert.equal(blueprint.reviewBoundary.publicationApproved, false);
  assert.equal(blueprint.reviewBoundary.manifestAuthorized, false);
  assert.equal(blueprint.reviewBoundary.contentV3Authorized, false);
  assert.equal(blueprint.weeks.length, 4);

  const allActivities = activities(blueprint);
  assert.equal(allActivities.length, 12);
  assert.ok(blueprint.weeks.every((week) => week.activities.length === 3));
  assert.ok(
    blueprint.weeks.every(
      (week) =>
        week.activities.filter((activity) => activity.role === "main").length === 2 &&
        week.activities.filter((activity) => activity.role === "alternative").length === 1,
    ),
  );

  const primaryCounts = counts(allActivities.map((activity) => activity.primaryValueCode));
  assert.deepEqual(
    [...primaryCounts.entries()].sort(),
    OCTOBER_REFERENCE_PRIMARY_VALUE_CODES.map((code) => [code, 2]).sort(),
  );
  assert.deepEqual(
    Object.fromEntries(counts(allActivities.map((activity) => activity.roofValueCode))),
    { D1: 4, D14: 4, D16: 4 },
  );
  assert.deepEqual(
    Object.fromEntries(counts(allActivities.map((activity) => activity.designDirection))),
    { learning_outcome_led: 6, value_led: 6 },
  );
  assert.deepEqual(
    Object.fromEntries(counts(allActivities.map((activity) => activity.primaryLensId))),
    {
      "prepared-environment": 2,
      "accessible-participation": 2,
      "guided-play": 2,
      "plan-act-reflect": 2,
      "emotion-relationship-coregulation": 2,
      "belonging-family-weave": 2,
    },
  );
  assert.deepEqual(blueprint.authoredLensIds, OCTOBER_REFERENCE_AUTHORED_LENS_IDS);
  assert.deepEqual(OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS, [
    "sukur-kanaat-israf-etmeme",
    "temizlik",
    "vatan-kulturel-miras",
    "yaratilmislara-dogaya-merhamet",
  ]);
  assert.ok(Object.isFrozen(OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS_BY_ACTIVITY_ID));
  assert.ok(
    Object.values(OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS_BY_ACTIVITY_ID).every(
      (candidateIds) => Object.isFrozen(candidateIds),
    ),
  );
  assert.deepEqual(
    Object.fromEntries(
      allActivities.map((activity) => [activity.id, activity.culturalCandidateIds]),
    ),
    OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS_BY_ACTIVITY_ID,
  );

  for (const activity of allActivities) {
    assert.equal(activity.officialActionSnapshot.indicatorCode, activity.indicatorCode);
    assert.equal(activity.officialActionSnapshot.valueCode, activity.primaryValueCode);
    assert.equal("status" in activity.officialActionSnapshot, false);
    assert.equal("sourceAnomaly" in activity.officialActionSnapshot, false);
    assertOfficialPreschoolValueActionSnapshot(activity.officialActionSnapshot);
    assert.ok(Object.isFrozen(activity));
    assert.ok(Object.isFrozen(activity.officialActionSnapshot));
  }
  assert.ok(Object.isFrozen(blueprint));
  assert.ok(Object.isFrozen(blueprint.weeks));
});

test("kültürel adaylar yalnız draft kalır; doğa sürekliliği ayrı overlay ve Cumhuriyet bağlamı kapanış iddiasızdır", () => {
  const blueprint = OCTOBER_REFERENCE_BLUEPRINT;
  assert.deepEqual(
    blueprint.culturalCandidates.map((candidate) => candidate.id),
    OCTOBER_REFERENCE_CULTURAL_CANDIDATE_IDS,
  );
  assert.ok(
    blueprint.culturalCandidates.every(
      (candidate) =>
        candidate.status === "draft" &&
        candidate.checkedAtUtc === null &&
        candidate.humanReviewRequired === true &&
        candidate.officialTymmValue === false,
    ),
  );
  assert.equal(blueprint.nature_based_continuity.kind, "nature_based_continuity");
  assert.equal(blueprint.nature_based_continuity.status, "planned");
  assert.equal(
    blueprint.nature_based_continuity.claimMode,
    "no_program_or_certification_claim",
  );
  assert.equal(blueprint.nature_based_continuity.weekIds.length, 4);
  assert.deepEqual(
    [...blueprint.nature_based_continuity.activityIds].sort(),
    activities(blueprint)
      .filter((activity) => activity.natureContinuity)
      .map((activity) => activity.id)
      .sort(),
  );
  assert.deepEqual(
    [...blueprint.nature_based_continuity.preparedEnvironmentSupportActivityIds].sort(),
    activities(blueprint)
      .filter((activity) =>
        [activity.primaryLensId, ...activity.supportingLensIds].includes(
          "prepared-environment",
        )
      )
      .map((activity) => activity.id)
      .sort(),
  );
  assert.equal(blueprint.republicContext.contextMode, "pluralist_child_rights");
  assert.equal(blueprint.republicContext.commemorationDate, "2026-10-29");
  assert.equal(blueprint.republicContext.calendarClosureClaim, null);
  assert.deepEqual(
    blueprint.republicContext.childRightsSnapshots.map((snapshot) => snapshot.indicatorCode),
    ["D1.1.2", "D11.1.2"],
  );
  assert.deepEqual(blueprint.republicContext.safeguards, [
    "child_voice",
    "right_to_decline",
    "no_othering",
  ]);
});

test("strict parser fazla/eksik alanı ve güvenli metin ihlalini fail-closed reddeder", async () => {
  const extraTop = await rawBlueprint();
  extraTop.releaseManifest = "uydurma";
  assert.throws(
    () => parseOctoberReferenceBlueprint(extraTop),
    /exact alan sözleşmesini.*releaseManifest/i,
  );

  const missing = await rawBlueprint();
  delete missing.weeks[0].activities[0].indicatorCode;
  assert.throws(
    () => parseOctoberReferenceBlueprint(missing),
    /exact alan sözleşmesini.*indicatorCode/i,
  );

  const extraActivity = await rawBlueprint();
  extraActivity.weeks[0].activities[0].officialActionSnapshot = { forged: true };
  assert.throws(
    () => parseOctoberReferenceBlueprint(extraActivity),
    /exact alan sözleşmesini.*officialActionSnapshot/i,
  );

  const hiddenUnicode = await rawBlueprint();
  hiddenUnicode.purpose += "\u202E";
  assert.throws(
    () => parseOctoberReferenceBlueprint(hiddenUnicode),
    /default-ignorable/i,
  );

  const inheritedTitle = await rawBlueprint();
  const inheritedValue = inheritedTitle.title;
  delete inheritedTitle.title;
  Object.setPrototypeOf(inheritedTitle, { title: inheritedValue });
  assert.throws(
    () => parseOctoberReferenceBlueprint(inheritedTitle),
    /exact alan sözleşmesini.*eksik: title/i,
  );

  const padded = await rawBlueprint();
  padded.weeks[0].title = ` ${padded.weeks[0].title}`;
  assert.throws(
    () => parseOctoberReferenceBlueprint(padded),
    /sessiz trim/i,
  );

  const decomposedUnicode = await rawBlueprint();
  decomposedUnicode.purpose = decomposedUnicode.purpose.normalize("NFD");
  assert.notEqual(
    decomposedUnicode.purpose,
    decomposedUnicode.purpose.normalize("NFC"),
    "fixture gerçekten NFD olmalı",
  );
  assert.throws(
    () => parseOctoberReferenceBlueprint(decomposedUnicode),
    /exact NFC/i,
  );

  for (const [name, character, errorPattern] of [
    ["NBSP", "\u00A0", /U\+0020 dışı Unicode boşluk/i],
    ["NARROW NBSP", "\u202F", /U\+0020 dışı Unicode boşluk/i],
    ["COMBINING GRAPHEME JOINER", "\u034F", /default-ignorable/i],
    ["VARIATION SELECTOR-16", "\uFE0F", /default-ignorable/i],
    ["unpaired surrogate", "\uD800", /surrogate/i],
  ]) {
    const unicodeMutant = await rawBlueprint();
    unicodeMutant.purpose =
      `${unicodeMutant.purpose.slice(0, 8)}${character}${unicodeMutant.purpose.slice(8)}`;
    assert.throws(
      () => parseOctoberReferenceBlueprint(unicodeMutant),
      errorPattern,
      `${name} reddedilmeli`,
    );
  }

  for (const [name, character] of [
    ["Greek Alpha", "\u0391"],
    ["Cyrillic a", "\u0430"],
  ]) {
    const confusable = await rawBlueprint();
    confusable.purpose =
      `${confusable.purpose.slice(0, 8)}${character}${confusable.purpose.slice(8)}`;
    assert.throws(
      () => parseOctoberReferenceBlueprint(confusable),
      /Greek veya Cyrillic confusable/i,
      `${name} reddedilmeli`,
    );
  }
});

test("görünür pedagojik metin değer puanı/ödülü, karakter hükmü ve zorlayıcı-cezalandırıcı dili reddeder", async () => {
  const score = await rawBlueprint();
  score.weeks[0].activities[0].title = "Saygı: 95";
  assert.throws(
    () => parseOctoberReferenceBlueprint(score),
    /değer puanı, rozeti veya seviyesi/i,
  );

  const indirectScore = await rawBlueprint();
  indirectScore.weeks[0].activities[0].plannedExperience =
    "Saygı puanı çocuğa 95 olarak verilir.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(indirectScore),
    /değer puanı, rozeti veya seviyesi/i,
  );

  const badge = await rawBlueprint();
  badge.weeks[0].activities[0].plannedExperience = "Saygı rozeti verilir.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(badge),
    /değer puanı, rozeti veya seviyesi/i,
  );

  const indirectBadge = await rawBlueprint();
  indirectBadge.weeks[0].activities[0].plannedExperience =
    "Saygı rozeti çocuğa sunulur.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(indirectBadge),
    /değer puanı, rozeti veya seviyesi/i,
  );

  const level = await rawBlueprint();
  level.inquiryQuestion = "Saygı seviyesi: yüksek.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(level),
    /değer puanı, rozeti veya seviyesi/i,
  );

  const moralLabel = await rawBlueprint();
  moralLabel.weeks[0].activities[0].plannedExperience = "Bu bir iyi çocuk etkinliğidir.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(moralLabel),
    /çocuk kişiliğini damgalayan/i,
  );

  const permanentJudgment = await rawBlueprint();
  permanentJudgment.weeks[0].activities[0].childRightsGuardrail =
    "Çocuğun karakteri kalıcıdır.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(permanentJudgment),
    /kalıcı karakter hükmü/i,
  );

  const coercion = await rawBlueprint();
  coercion.weeks[0].activities[0].childRightsGuardrail =
    "Çocuk dua etmeye zorlanır ve katılmayan cezalandırılır.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(coercion),
    /zorlama, ceza, utandırma, dışlama veya koşulsuz itaat/i,
  );

  const beliefCoercion = await rawBlueprint();
  beliefCoercion.weeks[0].activities[0].childRightsGuardrail =
    "Çocuk bu inancı benimsemek zorundadır.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(beliefCoercion),
    /zorlama, ceza, utandırma, dışlama veya koşulsuz itaat/i,
  );

  const unconditionalObedience = await rawBlueprint();
  unconditionalObedience.weeks[0].activities[0].childRightsGuardrail =
    "Çocuk koşulsuz itaat eder.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(unconditionalObedience),
    /zorlama, ceza, utandırma, dışlama veya koşulsuz itaat/i,
  );

  const possessiveScore = await rawBlueprint();
  possessiveScore.weeks[0].activities[0].plannedExperience =
    "Çocuğun saygısı 95/100 olarak puanlanır.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(possessiveScore),
    /değer puanı, rozeti veya seviyesi/i,
  );

  const pluralBadge = await rawBlueprint();
  pluralBadge.weeks[0].activities[0].plannedExperience =
    "Çocuk değerler rozetini kazanır.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(pluralBadge),
    /değer puanı, rozeti veya seviyesi/i,
  );

  const innateJudgment = await rawBlueprint();
  innateJudgment.weeks[0].activities[0].childRightsGuardrail =
    "Çocuğun ahlakı doğuştan sabittir.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(innateJudgment),
    /kalıcı karakter hükmü/i,
  );

  const prayerCondition = await rawBlueprint();
  prayerCondition.weeks[0].activities[0].childRightsGuardrail =
    "Dua ettikten sonra oyuna katılabilir.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(prayerCondition),
    /zorlama, ceza, utandırma, dışlama veya koşulsuz itaat/i,
  );

  const worshipExclusion = await rawBlueprint();
  worshipExclusion.weeks[0].activities[0].childRightsGuardrail =
    "İbadete katılmayan çocuk oyun hakkından mahrum edilir.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(worshipExclusion),
    /zorlama, ceza, utandırma, dışlama veya koşulsuz itaat/i,
  );

  const approvalClaim = await rawBlueprint();
  approvalClaim.purpose =
    "Bu paket insan kurulunca onaylandı; yayıma hazır ve manifest onaylıdır.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(approvalClaim),
    /program, yayın, insan onayı veya sertifika iddiası/i,
  );

  const accreditationClaim = await rawBlueprint();
  accreditationClaim.purpose =
    "Bu içerik Forest-School Level 3 akreditasyonuna sahiptir.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(accreditationClaim),
    /program, yayın, insan onayı veya sertifika iddiası/i,
  );

  const republicViolation = await rawBlueprint();
  republicViolation.weeks[3].activities[0].childRightsGuardrail =
    "Bütün çocuklar aynı sözle katılır; bizim milletimiz bütün halklardan üstündür.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(republicViolation),
    /tek söz.*millî üstünlük.*ötekileştirme/i,
  );

  for (const mutate of [
    (blueprint) => {
      blueprint.purpose = "Bizim milletimiz bütün halklardan üstündür.";
    },
    (blueprint) => {
      blueprint.inquiryQuestion = "Bütün çocuklar aynı sözle katılır mı?";
    },
    (blueprint) => {
      blueprint.weeks[3].inquiryQuestion =
        "Bizim milletimiz bütün halklardan üstün müdür?";
    },
  ]) {
    const republicTextTreeViolation = await rawBlueprint();
    mutate(republicTextTreeViolation);
    assert.throws(
      () => parseOctoberReferenceBlueprintCandidate(republicTextTreeViolation),
      /tek söz.*millî üstünlük.*ötekileştirme/i,
    );
  }

  const republicSafeguardDrift = await rawBlueprint();
  republicSafeguardDrift.republicContext.safeguards[0] = "forced_voice";
  assert.throws(
    () => parseOctoberReferenceBlueprintCandidate(republicSafeguardDrift),
    /çocuk sözü.*katılmama hakkı.*ötekileştirmeme.*exact/i,
  );

  for (const safeText of [
    "Çocuğun bencil olarak etiketlenmesi yasaktır.",
    "Çocuğa iyi çocuk etiketi verilmez.",
    "Çocuk kötü öğrenci olarak damgalanmaz.",
    "Çocuk zorlanır ya da cezalandırılır diye korkutulmaz.",
    "Çocuk dua etmeye zorlanmaz; katılmayan cezalandırılmaz.",
    "İbadet değer kanıtı olarak kullanılmaz.",
  ]) {
    const safeNegation = await rawBlueprint();
    safeNegation.weeks[0].activities[0].childRightsGuardrail = safeText;
    assert.doesNotThrow(
      () => parseOctoberReferenceBlueprintCandidate(safeNegation),
      `candidate parser güvenli negasyonu kabul etmeli: ${safeText}`,
    );
    assert.throws(
      () => parseOctoberReferenceBlueprint(safeNegation),
      /authoritative frozen.*exact canonical JSON/i,
      `authoritative parser frozen metni değiştirmemeli: ${safeText}`,
    );
  }

  for (const unsafeLaundering of [
    "Çocuk cezalandırılır ama zorlanır diye korkutulmaz.",
    "Çocuk cezalandırılır ve ayrıca “zorlanır” diye korkutulmaz.",
    "Çocuk cezalandırılır, buna rağmen “zorlanır” diye korkutulmaz.",
  ]) {
    const independentAffirmativeViolation = await rawBlueprint();
    independentAffirmativeViolation.weeks[0].activities[0].childRightsGuardrail =
      unsafeLaundering;
    assert.throws(
      () => parseOctoberReferenceBlueprintCandidate(independentAffirmativeViolation),
      /zorlama, ceza, utandırma, dışlama veya koşulsuz itaat/i,
    );
    assert.throws(
      () => parseOctoberReferenceBlueprint(independentAffirmativeViolation),
      /zorlama, ceza, utandırma, dışlama veya koşulsuz itaat/i,
    );
  }
});

test("authoritative parser bütün raw candidate'ı sorted-key canonical golden ile exact kilitler", async () => {
  const candidateBypasses = [
    ["child-score", (blueprint) => {
      blueprint.weeks[0].activities[0].plannedExperience =
        "Çocuğa saygı için 95 puan verilir.";
    }],
    ["gold-badge", (blueprint) => {
      blueprint.weeks[0].activities[0].plannedExperience =
        "Saygılı davranan çocuğa altın rozet verilir.";
    }],
    ["innate-moral-label", (blueprint) => {
      blueprint.weeks[0].activities[0].childRightsGuardrail =
        "Bu çocuk ahlaklı ve örnektir.";
    }],
    ["prayer-exclusion", (blueprint) => {
      blueprint.weeks[0].activities[0].childRightsGuardrail =
        "Dua etmeyen çocuk oyuna katılamaz.";
    }],
    ["worship-condition", (blueprint) => {
      blueprint.weeks[0].activities[0].childRightsGuardrail =
        "İbadete katılmak şart koşulur.";
    }],
    ["prayer-compulsion", (blueprint) => {
      blueprint.weeks[0].activities[0].childRightsGuardrail =
        "Namaza katılım mecburidir.";
    }],
    ["blind-adult-obedience", (blueprint) => {
      blueprint.weeks[0].activities[0].childRightsGuardrail =
        "Öğretmenin her dediği sorgulanmadan yapılır.";
    }],
    ["editorial-approval-claim", (blueprint) => {
      blueprint.purpose =
        "İnsan incelemesi tamamlanmış, yayın kurulu tarafından kabul edilmiş Ekim sürümüdür.";
    }],
    ["method-accreditation-claim", (blueprint) => {
      blueprint.purpose = "AMI belgeli resmî Montessori programıdır.";
    }],
    ["republic-superiority", (blueprint) => {
      blueprint.weeks[3].activities[0].childRightsGuardrail =
        "Biz üstün milletiz; diğerleri aşağıdır.";
    }],
    ["republic-uniform-anthem", (blueprint) => {
      blueprint.weeks[3].activities[0].childRightsGuardrail =
        "Herkes tek marşı söylemekle yükümlüdür.";
    }],
  ];

  for (const [name, mutate] of candidateBypasses) {
    const mutant = await rawBlueprint();
    mutate(mutant);
    assert.doesNotThrow(
      () => parseOctoberReferenceBlueprintCandidate(mutant),
      `${name} candidate denylist yerine authoritative golden kapısını sınamalı`,
    );
    assert.throws(
      () => parseOctoberReferenceBlueprint(mutant),
      /authoritative frozen.*exact canonical JSON/i,
      `${name} authoritative golden kapısında reddedilmeli`,
    );
  }

  for (const [name, mutate] of [
    ["top purpose", (blueprint) => {
      blueprint.purpose += " Editoryal ek cümle.";
    }],
    ["top inquiry", (blueprint) => {
      blueprint.inquiryQuestion += " Başka bir soru?";
    }],
    ["week inquiry", (blueprint) => {
      blueprint.weeks[0].inquiryQuestion += " Başka bir soru?";
    }],
  ]) {
    const textDrift = await rawBlueprint();
    mutate(textDrift);
    assert.doesNotThrow(() => parseOctoberReferenceBlueprintCandidate(textDrift));
    assert.throws(
      () => parseOctoberReferenceBlueprint(textDrift),
      /authoritative frozen.*exact canonical JSON/i,
      `${name} drift authoritative golden kapısında reddedilmeli`,
    );
  }

  const reorderedObjectKeys = Object.fromEntries(
    Object.entries(await rawBlueprint()).reverse(),
  );
  assert.doesNotThrow(() => parseOctoberReferenceBlueprint(reorderedObjectKeys));
});

test("duplicate/missing ana değer, kimlik, çatı ve yön dağılımı exact kapılardan geçemez", async () => {
  const duplicateId = await rawBlueprint();
  duplicateId.weeks[1].activities[0].id = duplicateId.weeks[0].activities[0].id;
  assert.throws(
    () => parseOctoberReferenceBlueprint(duplicateId),
    /kimlikleri benzersiz/i,
  );

  const missingPrimary = await rawBlueprint();
  Object.assign(missingPrimary.weeks[0].activities[0], {
    primaryValueCode: "D7",
    roofValueCode: "D14",
    indicatorCode: "D7.1.2",
  });
  assert.throws(
    () => parseOctoberReferenceBlueprint(missingPrimary),
    /exact altı ana değerin her birini tam iki/i,
  );

  const roofDrift = await rawBlueprint();
  roofDrift.weeks[0].activities[0].roofValueCode = "D14";
  assert.throws(
    () => parseOctoberReferenceBlueprint(roofDrift),
    /exact 4\/4\/4/i,
  );

  const directionDrift = await rawBlueprint();
  directionDrift.weeks[0].activities[0].designDirection = "value_led";
  assert.throws(
    () => parseOctoberReferenceBlueprint(directionDrift),
    /exact 6 value_led ve 6 learning_outcome_led/i,
  );
});

test("roofLinks, verified Ek-14 ve primaryValueCode-indicator bağı sahteciliğe kapalıdır", async () => {
  const wrongRoof = await rawBlueprint();
  wrongRoof.weeks[0].activities[1].roofValueCode = "D1";
  assert.throws(
    () => parseOctoberReferenceBlueprint(wrongRoof),
    /roofLinks/i,
  );

  const sourceAnomaly = await rawBlueprint();
  sourceAnomaly.weeks[1].activities[1].indicatorCode = "D18.2.3";
  assert.throws(
    () => parseOctoberReferenceBlueprint(sourceAnomaly),
    /verified Ek-14.*kaynak anomalisi/i,
  );

  const forgedValue = await rawBlueprint();
  forgedValue.weeks[0].activities[0].primaryValueCode = "D7";
  forgedValue.weeks[0].activities[0].roofValueCode = "D14";
  assert.throws(
    () => parseOctoberReferenceBlueprint(forgedValue),
    /ana değer kodu.*resmî değerle eşleşmelidir/i,
  );
});

test("kültürel aday kendi kendini doğrulayamaz veya resmî TYMM değeri ilan edemez", async () => {
  const selfVerified = await rawBlueprint();
  selfVerified.culturalCandidates[0].status = "verified";
  selfVerified.culturalCandidates[0].checkedAtUtc = "2026-08-08T00:00:00.000Z";
  assert.throws(
    () => parseOctoberReferenceBlueprint(selfVerified),
    /yalnız draft.*insan incelemesi zorunlu/i,
  );

  const selfOfficial = await rawBlueprint();
  selfOfficial.culturalCandidates[1].officialTymmValue = true;
  assert.throws(
    () => parseOctoberReferenceBlueprint(selfOfficial),
    /resmî TYMM değeri olmayan/i,
  );

  const unknownCulture = await rawBlueprint();
  unknownCulture.weeks[0].activities[0].culturalCandidateIds = ["uydurma-kopru"];
  assert.throws(
    () => parseOctoberReferenceBlueprint(unknownCulture),
    /yalnız kanonik Ekim kültürel adaylarından/i,
  );

  const topLevelOrderDrift = await rawBlueprint();
  [topLevelOrderDrift.culturalCandidates[0], topLevelOrderDrift.culturalCandidates[1]] = [
    topLevelOrderDrift.culturalCandidates[1],
    topLevelOrderDrift.culturalCandidates[0],
  ];
  assert.throws(
    () => parseOctoberReferenceBlueprint(topLevelOrderDrift),
    /exact dört kültürel adayı kanonik sırada/i,
  );
});

test("12 etkinliğin culturalCandidateIds dizileri frozen golden eşlemeye exact ordered bağlıdır", async () => {
  const missingCandidate = await rawBlueprint();
  missingCandidate.weeks[0].activities[0].culturalCandidateIds = [];
  assert.throws(
    () => parseOctoberReferenceBlueprint(missingCandidate),
    /autumn-traces.*frozen golden.*exact ordered/i,
  );

  const extraCandidate = await rawBlueprint();
  extraCandidate.weeks[1].activities[1].culturalCandidateIds.push(
    "yaratilmislara-dogaya-merhamet",
  );
  assert.throws(
    () => parseOctoberReferenceBlueprint(extraCandidate),
    /environment-impact.*frozen golden.*exact ordered/i,
  );

  const orderedCandidateDrift = await rawBlueprint();
  orderedCandidateDrift.weeks[1].activities[1].culturalCandidateIds = [
    "yaratilmislara-dogaya-merhamet",
    "temizlik",
  ];
  assert.throws(
    () => parseOctoberReferenceBlueprint(orderedCandidateDrift),
    /environment-impact.*frozen golden.*exact ordered/i,
  );

  const blankAllCandidates = await rawBlueprint();
  for (const activity of activities(blankAllCandidates)) {
    activity.culturalCandidateIds = [];
  }
  assert.throws(
    () => parseOctoberReferenceBlueprint(blankAllCandidates),
    /frozen golden.*exact ordered/i,
  );

  const republicCandidateDrift = await rawBlueprint();
  republicCandidateDrift.weeks[3].activities[0].culturalCandidateIds = [];
  assert.throws(
    () => parseOctoberReferenceBlueprint(republicCandidateDrift),
    /republic-common-good.*frozen golden.*exact ordered/i,
  );
});

test("bilinmeyen lens, yöntem/sertifika iddiası, erken insan-yayın onayı ve takvim kapanış iddiası reddedilir", async () => {
  const unknownLens = await rawBlueprint();
  unknownLens.weeks[0].activities[0].primaryLensId = "nature-outdoor";
  assert.throws(
    () => parseOctoberReferenceBlueprint(unknownLens),
    /kanonik altı authored pilot lensinden/i,
  );

  const unknownSupportingLens = await rawBlueprint();
  unknownSupportingLens.weeks[0].activities[0].supportingLensIds[0] =
    "unknown-support-lens";
  assert.throws(
    () => parseOctoberReferenceBlueprint(unknownSupportingLens),
    /kanonik altı authored pilot lensinden/i,
  );

  const duplicatedLens = await rawBlueprint();
  duplicatedLens.weeks[0].activities[0].supportingLensIds[0] =
    duplicatedLens.weeks[0].activities[0].primaryLensId;
  assert.throws(
    () => parseOctoberReferenceBlueprint(duplicatedLens),
    /benzersiz destekleyici lens/i,
  );

  const allGuidedPlay = await rawBlueprint();
  for (const activity of activities(allGuidedPlay)) {
    activity.primaryLensId = "guided-play";
    activity.supportingLensIds = activity.supportingLensIds.filter(
      (lensId) => lensId !== "guided-play",
    );
  }
  assert.throws(
    () => parseOctoberReferenceBlueprint(allGuidedPlay),
    /altı authored lensin her birini.*exact iki/i,
  );

  const methodClaim = await rawBlueprint();
  methodClaim.purpose = "Bu içerik sertifikalı Forest School programıdır.";
  assert.throws(
    () => parseOctoberReferenceBlueprint(methodClaim),
    /program.*sertifika iddiası/i,
  );

  const prematureApproval = await rawBlueprint();
  prematureApproval.reviewBoundary.humanApproved = true;
  assert.throws(
    () => parseOctoberReferenceBlueprint(prematureApproval),
    /İnsan onayı false olmalıdır/i,
  );

  const closureClaim = await rawBlueprint();
  closureClaim.republicContext.calendarClosureClaim = "2026-10-29";
  assert.throws(
    () => parseOctoberReferenceBlueprint(closureClaim),
    /takvim kapanışı iddiası üretmemelidir/i,
  );
});

test("doğa ve hazırlanmış çevre overlay bağlantıları görünür etkinlik ağacına fail-closed bağlanır", async () => {
  const omittedNatureActivity = await rawBlueprint();
  omittedNatureActivity.nature_based_continuity.activityIds.pop();
  assert.throws(
    () => parseOctoberReferenceBlueprint(omittedNatureActivity),
    /natureContinuity=true etkinliklerin exact kümesi/i,
  );

  const extraNatureActivity = await rawBlueprint();
  extraNatureActivity.nature_based_continuity.activityIds.push(
    "tymm6072-oct-colour-texture-choices",
  );
  assert.throws(
    () => parseOctoberReferenceBlueprint(extraNatureActivity),
    /natureContinuity=true etkinliklerin exact kümesi/i,
  );

  const unknownNatureActivity = await rawBlueprint();
  unknownNatureActivity.nature_based_continuity.activityIds[0] = "olmayan-etkinlik";
  assert.throws(
    () => parseOctoberReferenceBlueprint(unknownNatureActivity),
    /yalnız natureContinuity işaretli mevcut etkinliklere/i,
  );

  const falseContinuity = await rawBlueprint();
  falseContinuity.weeks[0].activities[0].natureContinuity = false;
  assert.throws(
    () => parseOctoberReferenceBlueprint(falseContinuity),
    /yalnız natureContinuity işaretli/i,
  );

  const wrongPreparedEnvironment = await rawBlueprint();
  wrongPreparedEnvironment.nature_based_continuity.preparedEnvironmentSupportActivityIds[0] =
    "tymm6072-oct-republic-common-good";
  assert.throws(
    () => parseOctoberReferenceBlueprint(wrongPreparedEnvironment),
    /prepared-environment primary\/support.*exact kümesi/i,
  );

  const emptyPreparedEnvironment = await rawBlueprint();
  emptyPreparedEnvironment.nature_based_continuity.preparedEnvironmentSupportActivityIds = [];
  assert.throws(
    () => parseOctoberReferenceBlueprint(emptyPreparedEnvironment),
    /prepared-environment primary\/support.*exact kümesi/i,
  );

  const omittedPreparedEnvironment = await rawBlueprint();
  omittedPreparedEnvironment.nature_based_continuity.preparedEnvironmentSupportActivityIds.pop();
  assert.throws(
    () => parseOctoberReferenceBlueprint(omittedPreparedEnvironment),
    /prepared-environment primary\/support.*exact kümesi/i,
  );

  const extraPreparedEnvironment = await rawBlueprint();
  extraPreparedEnvironment.nature_based_continuity.preparedEnvironmentSupportActivityIds.push(
    "tymm6072-oct-nearby-natural-heritage",
  );
  assert.throws(
    () => parseOctoberReferenceBlueprint(extraPreparedEnvironment),
    /prepared-environment primary\/support.*exact kümesi/i,
  );
});
