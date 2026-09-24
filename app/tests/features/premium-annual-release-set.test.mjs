import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ANNUAL_VALUES_CULTURAL_BRIDGE_IDS,
  ANNUAL_VALUES_RELEASE_MONTH_KEYS,
  parseAuthoredAnnualValuesReleaseProfile,
} from "../../src/features/premium-plans/annual-release-set.ts";
import { PREMIUM_VALUES_V3_RELEASE_IDENTITY } from "../../src/features/premium-plans/content-repository.ts";
import {
  HUMAN_REVIEW_ROLES,
  VALUE_CODES,
  VALUES_PEDAGOGY_CONSTITUTION,
} from "../../src/features/values/values-constitution.ts";
import {
  FOREST_SCHOOL_ASSOCIATION_GOOD_PRACTICE_URL,
  FOREST_SCHOOL_NATURE_CONTINUITY_BOUNDARY,
  PREPARED_ENVIRONMENT_CERTIFICATION_BOUNDARY,
} from "../../src/features/values/value-plan-contracts.ts";

const profileUrl = new URL(
  "../../../premium-content/releases/tymm-6072/2026-2027/annual-values-release-profile.v1.json",
  import.meta.url,
);
const canonicalRawProfile = JSON.parse(await readFile(profileUrl, "utf8"));

function rawProfile() {
  return structuredClone(canonicalRawProfile);
}

function month(profile, monthKey) {
  const found = profile.months.find((candidate) => candidate.monthKey === monthKey);
  assert.ok(found, `${monthKey} profilde bulunmalıdır.`);
  return found;
}

function sumBy(items, selector) {
  return items.reduce((sum, item) => sum + selector(item), 0);
}

function assertRejected(mutator, pattern) {
  const candidate = rawProfile();
  mutator(candidate);
  assert.throws(() => parseAuthoredAnnualValuesReleaseProfile(candidate), pattern);
}

test("authored yıllık profil exact iki dönem, on ay ve 108 etkinlik matrisini taşır", () => {
  const profile = parseAuthoredAnnualValuesReleaseProfile(rawProfile());

  assert.equal(profile.profileType, "authored_annual_values_release_profile");
  assert.equal(profile.terms.length, 2);
  assert.equal(profile.months.length, 10);
  assert.deepEqual(
    profile.months.map((entry) => entry.monthKey),
    ANNUAL_VALUES_RELEASE_MONTH_KEYS,
  );
  assert.equal(profile.annualTargets.weekCount, 36);
  assert.equal(profile.annualTargets.activityCount, 108);
  assert.equal(sumBy(profile.months, (entry) => entry.weekCount), 36);
  assert.equal(sumBy(profile.months, (entry) => entry.activityCount), 108);

  for (const term of profile.terms) {
    const termMonths = profile.months.filter((entry) => entry.termId === term.id);
    assert.equal(termMonths.length, 5);
    assert.equal(sumBy(termMonths, (entry) => entry.weekCount), 18);
    assert.equal(sumBy(termMonths, (entry) => entry.activityCount), 54);
    assert.deepEqual(
      [...new Set(termMonths.flatMap((entry) => entry.primaryValueTargetCodes))]
        .sort((left, right) => VALUE_CODES.indexOf(left) - VALUE_CODES.indexOf(right)),
      VALUE_CODES,
    );
    assert.deepEqual(term.roofValueActivityTargets, { D1: 18, D14: 18, D16: 18 });
    assert.deepEqual(term.designDirectionActivityTargets, {
      value_led: 27,
      learning_outcome_led: 27,
    });
  }

  assert.deepEqual(profile.annualTargets.roofValueActivityTargets, {
    D1: 36,
    D14: 36,
    D16: 36,
  });
  assert.deepEqual(profile.annualTargets.designDirectionActivityTargets, {
    value_led: 54,
    learning_outcome_led: 54,
  });
  assert.ok(Object.isFrozen(profile));
  assert.ok(Object.isFrozen(profile.months[0].primaryValueTargetCodes));
});

test("Eylül actual hedefleri ile Ekim D19 bağlam düzeltmesi golden matriste korunur", () => {
  const profile = parseAuthoredAnnualValuesReleaseProfile(rawProfile());
  const september = month(profile, "2026-09");
  const october = month(profile, "2026-10");
  const november = month(profile, "2026-11");

  assert.deepEqual(september.primaryValueTargetCodes, [
    "D1", "D3", "D4", "D5", "D6", "D8", "D11", "D12", "D13", "D14", "D16",
  ]);
  assert.deepEqual(september.supportingValueTargetCodes, [
    "D1", "D3", "D5", "D6", "D8", "D10", "D11", "D13", "D14", "D15", "D16", "D17",
  ]);
  assert.deepEqual(october.primaryValueTargetCodes, ["D5", "D7", "D9", "D17", "D18", "D19"]);
  assert.deepEqual(october.supportingValueTargetCodes, ["D3", "D13", "D14", "D16", "D20"]);
  assert.ok(october.contextualValueNote.includes("29 Ekim"));
  assert.ok(october.contextualValueNote.includes("ortak iyilik"));
  assert.ok(november.primaryValueTargetCodes.includes("D19"));
  assert.ok(november.contextualValueNote.includes("10 Kasım"));
  assert.ok(november.contextualValueNote.includes("ortak hafıza"));
});

test("yalnız Eylül exact paylaşılan v3 kimliğine bağlıdır; gelecek dokuz ay planned/null kalır", () => {
  const profile = parseAuthoredAnnualValuesReleaseProfile(rawProfile());
  const september = profile.months[0];

  assert.equal(september.state, "machine_validated_pending_human_review");
  assert.deepEqual(september.releaseReference, {
    contentPackId: PREMIUM_VALUES_V3_RELEASE_IDENTITY.id,
    contentPackVersion: PREMIUM_VALUES_V3_RELEASE_IDENTITY.version,
    contentReleaseId: PREMIUM_VALUES_V3_RELEASE_IDENTITY.contentReleaseId,
    manifestDigest: PREMIUM_VALUES_V3_RELEASE_IDENTITY.manifestDigest,
    valuesMappingStatus: PREMIUM_VALUES_V3_RELEASE_IDENTITY.valuesMappingStatus,
  });
  for (const future of profile.months.slice(1)) {
    assert.equal(future.state, "planned");
    assert.equal(future.releaseReference, null);
  }
});

test("altı rol pending/publication false, kültürel adaylar yalnız anayasa ID ve draft kararı taşır", () => {
  const profile = parseAuthoredAnnualValuesReleaseProfile(rawProfile());
  assert.deepEqual(profile.reviewPolicy, {
    status: "pending",
    requiredRoles: HUMAN_REVIEW_ROLES,
    publicationEligible: false,
  });
  assert.deepEqual(
    profile.culturalCandidates.map((candidate) => candidate.culturalBridgeId),
    VALUES_PEDAGOGY_CONSTITUTION.culturalBridges.map((bridge) => bridge.id),
  );
  assert.ok(
    profile.culturalCandidates.every(
      (candidate) =>
        candidate.provenanceStatus === "draft" &&
        candidate.reviewDecisionId === null &&
        candidate.humanReviewRequired === true,
    ),
  );
  assert.equal("approvals" in profile.reviewPolicy, false);
  assert.equal("teacherApproval" in profile, false);
});

test("her ayın kültürel köprü hedefi exact golden sırayı ve anayasa değer bağlantısını taşır", () => {
  const profile = parseAuthoredAnnualValuesReleaseProfile(rawProfile());
  const expectedByMonth = {
    "2026-09": [
      "emanet",
      "kul-hakki",
      "edep-nezaket",
      "helal-emek-caliskanlik",
      "sukur-kanaat-israf-etmeme",
      "aile-sila-i-rahim-komsuluk",
      "imece-yardimlasma",
    ],
    "2026-10": [
      "sukur-kanaat-israf-etmeme",
      "temizlik",
      "vatan-kulturel-miras",
      "yaratilmislara-dogaya-merhamet",
    ],
    "2026-11": [
      "aile-sila-i-rahim-komsuluk",
      "imece-yardimlasma",
      "vatan-kulturel-miras",
    ],
    "2026-12": ["kul-hakki", "edep-nezaket", "helal-emek-caliskanlik"],
    "2027-01": ["emanet", "merhamet", "temizlik"],
    "2027-02": ["emanet", "edep-nezaket", "aile-sila-i-rahim-komsuluk"],
    "2027-03": [
      "sukur-kanaat-israf-etmeme",
      "temizlik",
      "yaratilmislara-dogaya-merhamet",
    ],
    "2027-04": [
      "edep-nezaket",
      "helal-emek-caliskanlik",
      "sukur-kanaat-israf-etmeme",
    ],
    "2027-05": [
      "aile-sila-i-rahim-komsuluk",
      "imece-yardimlasma",
      "vatan-kulturel-miras",
    ],
    "2027-06": [
      "kul-hakki",
      "vatan-kulturel-miras",
      "yaratilmislara-dogaya-merhamet",
    ],
  };
  const globalCandidateIds = new Set(
    profile.culturalCandidates.map((candidate) => candidate.culturalBridgeId),
  );
  const bridgeById = new Map(
    VALUES_PEDAGOGY_CONSTITUTION.culturalBridges.map((bridge) => [bridge.id, bridge]),
  );

  assert.deepEqual(
    profile.culturalCandidates.map((candidate) => candidate.culturalBridgeId),
    ANNUAL_VALUES_CULTURAL_BRIDGE_IDS,
  );
  for (const entry of profile.months) {
    assert.deepEqual(entry.culturalBridgeTargetIds, expectedByMonth[entry.monthKey]);
    const monthValueCodes = new Set([
      ...entry.primaryValueTargetCodes,
      ...entry.supportingValueTargetCodes,
    ]);
    for (const bridgeId of entry.culturalBridgeTargetIds) {
      assert.ok(globalCandidateIds.has(bridgeId));
      assert.ok(
        bridgeById.get(bridgeId).valueCodes.some((valueCode) => monthValueCodes.has(valueCode)),
        `${entry.monthKey}/${bridgeId} primary+support değerlerinden biriyle bağlı olmalıdır.`,
      );
    }
  }
  assert.ok(
    profile.culturalCandidates.every(
      (candidate) =>
        candidate.provenanceStatus === "draft" &&
        candidate.reviewDecisionId === null &&
        candidate.humanReviewRequired === true,
    ),
  );
});

test("doğa sürekliliği ve hazırlanmış çevre yalnız kanonik iddia sınırlarını taşır", () => {
  const profile = parseAuthoredAnnualValuesReleaseProfile(rawProfile());
  const nature = profile.pedagogicalLensBoundaries.natureBasedContinuity;
  const prepared = profile.pedagogicalLensBoundaries.preparedEnvironment;

  assert.equal(nature.claimLevel, "nature_based_continuity");
  assert.equal(nature.governingStandard, FOREST_SCHOOL_ASSOCIATION_GOOD_PRACTICE_URL);
  assert.equal(nature.minimumDurationWeeks, 24);
  assert.equal(nature.minimumPlannedSessions, 12);
  assert.equal(nature.recognitionClaimed, false);
  assert.equal(nature.certificationClaimed, false);
  assert.equal(nature.qualifiedPracticeBoundary, FOREST_SCHOOL_NATURE_CONTINUITY_BOUNDARY);
  assert.equal(prepared.claimLevel, "montessori_inspired");
  assert.equal(prepared.certificationClaimed, false);
  assert.equal(prepared.certificationBoundary, PREPARED_ENVIRONMENT_CERTIFICATION_BOUNDARY);
});

test("exact-key, NFC, kaynak URL ve SHA zinciri fail-closed çalışır", async (t) => {
  const cases = [
    {
      name: "beklenmeyen insan onayı alanı",
      mutate: (profile) => { profile.reviewPolicy.approvals = []; },
      pattern: /exact alan sözleşmesi/i,
    },
    {
      name: "beklenmeyen öğretmen onayı alanı",
      mutate: (profile) => { profile.teacherApproval = true; },
      pattern: /exact alan sözleşmesi/i,
    },
    {
      name: "NFD metin",
      mutate: (profile) => { profile.months[1].contextualValueNote = "Tu\u0308rkiye"; },
      pattern: /NFC-normalize/i,
    },
    {
      name: "sahte çerçeve URL'si",
      mutate: (profile) => { profile.programProfile.frameworkSourceUrl = "https://example.org/tymm"; },
      pattern: /kanonik HTTPS URL/i,
    },
    {
      name: "HTTP Ek-14 URL'si",
      mutate: (profile) => { profile.programProfile.officialActionCatalogSourceUrl = "http://tymm.meb.gov.tr/program.pdf"; },
      pattern: /kanonik HTTPS URL/i,
    },
    {
      name: "biçimsiz Ek-14 SHA",
      mutate: (profile) => { profile.programProfile.officialActionCatalogSourceSha256 = `sha256:${"z".repeat(64)}`; },
      pattern: /SHA-256/i,
    },
    {
      name: "exact olmayan geçerli Ek-14 SHA",
      mutate: (profile) => { profile.programProfile.officialActionCatalogSourceSha256 = `sha256:${"a".repeat(64)}`; },
      pattern: /kanonik SHA-256/i,
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, () => assertRejected(entry.mutate, entry.pattern));
  }
});

test("ay/dönem cardinality, duplicate ve sıra bozulmaları reddedilir", async (t) => {
  const cases = [
    {
      name: "tek dönem",
      mutate: (profile) => { profile.terms.pop(); },
      pattern: /exact iki dönem/i,
    },
    {
      name: "dokuz ay",
      mutate: (profile) => { profile.months.pop(); },
      pattern: /exact on sıralı ay/i,
    },
    {
      name: "yanlış ay sırası",
      mutate: (profile) => {
        [profile.months[1], profile.months[2]] = [profile.months[2], profile.months[1]];
      },
      pattern: /exact 2026-10/i,
    },
    {
      name: "duplicate ana değer",
      mutate: (profile) => { profile.months[1].primaryValueTargetCodes[5] = "D18"; },
      pattern: /benzersiz değer kodları/i,
    },
    {
      name: "dörtten az aylık ana değer",
      mutate: (profile) => { profile.months[1].primaryValueTargetCodes = ["D5", "D7", "D9"]; },
      pattern: /4–20 değer kodu/i,
    },
    {
      name: "geçersiz 5 hafta 15 etkinlik takvimi",
      mutate: (profile) => {
        profile.months[1].weekCount = 5;
        profile.months[1].activityCount = 15;
        profile.months[1].roofValueActivityTargets = { D1: 5, D14: 5, D16: 5 };
        profile.months[1].designDirectionActivityTargets = { value_led: 8, learning_outcome_led: 7 };
      },
      pattern: /yalnız 4 hafta\/12 etkinlik veya 3 hafta\/9 etkinlik/i,
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, () => assertRejected(entry.mutate, entry.pattern));
  }
});

test("D20 destek havuzuna taşınarak dönem ana değer kapsamı aklanamaz", () => {
  assertRejected((profile) => {
    const may = month(profile, "2027-05");
    may.primaryValueTargetCodes = may.primaryValueTargetCodes.filter((code) => code !== "D20");
    may.primaryValueTargetCodes.push("D18");
    may.primaryValueTargetCodes.sort((left, right) => VALUE_CODES.indexOf(left) - VALUE_CODES.indexOf(right));
    may.supportingValueTargetCodes.push("D20");
    may.supportingValueTargetCodes.sort((left, right) => VALUE_CODES.indexOf(left) - VALUE_CODES.indexOf(right));
  }, /destek değerleri kapsam sayılmaz.*D20/i);
});

test("Eylül exact v3 kimliği, gelecek null sınırı ve golden aylık matris sahteciliği reddedilir", async (t) => {
  const cases = [
    {
      name: "Eylül manifest SHA sahteciliği",
      mutate: (profile) => { profile.months[0].releaseReference.manifestDigest = `sha256:${"a".repeat(64)}`; },
      pattern: /Eylül exact v3.*kanonik SHA-256/is,
    },
    {
      name: "Eylül content release sahteciliği",
      mutate: (profile) => { profile.months[0].releaseReference.contentReleaseId = "tymm-6072-forged-v3"; },
      pattern: /Eylül exact v3.*içerik sürüm kimliği/is,
    },
    {
      name: "gelecek aya sahte release referansı",
      mutate: (profile) => { profile.months[1].releaseReference = structuredClone(profile.months[0].releaseReference); },
      pattern: /releaseReference null kalmalıdır/i,
    },
    {
      name: "Eylül actual primary hedef kayması",
      mutate: (profile) => { profile.months[0].primaryValueTargetCodes[1] = "D2"; },
      pattern: /2026-09 authored değer matrisi/i,
    },
    {
      name: "Eylül actual support hedef kayması",
      mutate: (profile) => { profile.months[0].supportingValueTargetCodes = ["D1", "D3", "D5", "D6"]; },
      pattern: /primary\+support.*bağlantılı|2026-09 authored değer matrisi/i,
    },
    {
      name: "Ekim D19 yerine D16 ana değer geri kayması",
      mutate: (profile) => {
        profile.months[1].primaryValueTargetCodes = ["D5", "D7", "D9", "D16", "D17", "D18"];
      },
      pattern: /2026-10 authored değer matrisi/i,
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, () => assertRejected(entry.mutate, entry.pattern));
  }
});

test("self-verified kültür ve altı rol/publication kapısı sahteciliği reddedilir", async (t) => {
  const cases = [
    {
      name: "kültürel aday self-verified",
      mutate: (profile) => {
        profile.culturalCandidates[0].provenanceStatus = "verified";
        profile.culturalCandidates[0].reviewDecisionId = "self-approved";
        profile.culturalCandidates[0].humanReviewRequired = false;
      },
      pattern: /exact draft/i,
    },
    {
      name: "uydurma kültürel köprü",
      mutate: (profile) => { profile.culturalCandidates[0].culturalBridgeId = "uydurma-kopru"; },
      pattern: /anayasa köprü kimliği/i,
    },
    {
      name: "rol sırası bozuk",
      mutate: (profile) => {
        [profile.reviewPolicy.requiredRoles[0], profile.reviewPolicy.requiredRoles[1]] =
          [profile.reviewPolicy.requiredRoles[1], profile.reviewPolicy.requiredRoles[0]];
      },
      pattern: /kanonik sıra ve içerikle exact/i,
    },
    {
      name: "sahte accepted review",
      mutate: (profile) => { profile.reviewPolicy.status = "accepted"; },
      pattern: /exact pending/i,
    },
    {
      name: "erken publication eligible",
      mutate: (profile) => { profile.reviewPolicy.publicationEligible = true; },
      pattern: /yayın uygunluğu exact false/i,
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, () => assertRejected(entry.mutate, entry.pattern));
  }
});

test("aylık kültürel hedef missing/unknown/duplicate/drift/unlinked girişlerini reddeder", async (t) => {
  const cases = [
    {
      name: "missing golden hedef",
      mutate: (profile) => { profile.months[1].culturalBridgeTargetIds.pop(); },
      pattern: /2026-10 authored değer matrisi/i,
    },
    {
      name: "unknown veya global aday dışı kimlik",
      mutate: (profile) => { profile.months[1].culturalBridgeTargetIds[0] = "uydurma-kopru"; },
      pattern: /profile-level kanonik draft adaylarından/i,
    },
    {
      name: "duplicate köprü kimliği",
      mutate: (profile) => {
        profile.months[1].culturalBridgeTargetIds = [
          "sukur-kanaat-israf-etmeme",
          "temizlik",
          "temizlik",
          "vatan-kulturel-miras",
          "yaratilmislara-dogaya-merhamet",
        ];
      },
      pattern: /benzersiz kültürel köprü kimlikleri/i,
    },
    {
      name: "golden set drift ama kanonik ve bağlı kimlik",
      mutate: (profile) => {
        profile.months[1].culturalBridgeTargetIds = [
          "emanet",
          "temizlik",
          "vatan-kulturel-miras",
          "yaratilmislara-dogaya-merhamet",
        ];
      },
      pattern: /2026-10 authored değer matrisi/i,
    },
    {
      name: "golden sıra drift",
      mutate: (profile) => {
        [
          profile.months[1].culturalBridgeTargetIds[0],
          profile.months[1].culturalBridgeTargetIds[1],
        ] = [
          profile.months[1].culturalBridgeTargetIds[1],
          profile.months[1].culturalBridgeTargetIds[0],
        ];
      },
      pattern: /kanonik kültürel köprü sırasında/i,
    },
    {
      name: "ayın primary+support değerlerine bağlanmayan anayasa köprüsü",
      mutate: (profile) => {
        profile.months[3].culturalBridgeTargetIds = [
          "kul-hakki",
          "merhamet",
          "edep-nezaket",
          "helal-emek-caliskanlik",
        ];
      },
      pattern: /merhamet.*primary\+support.*bağlantılı olmalıdır/i,
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, () => assertRejected(entry.mutate, entry.pattern));
  }
});

test("çatı ve tasarım yönü dönem/yıl dengesi kaydırılamaz", async (t) => {
  const cases = [
    {
      name: "term-1 roof 19/17/18",
      mutate: (profile) => {
        profile.months[1].roofValueActivityTargets.D1 = 5;
        profile.months[1].roofValueActivityTargets.D14 = 3;
      },
      pattern: /term-1 çatı değer dengesi exact 18\/18\/18/i,
    },
    {
      name: "term-1 direction 28/26",
      mutate: (profile) => {
        profile.months[1].designDirectionActivityTargets.value_led = 7;
        profile.months[1].designDirectionActivityTargets.learning_outcome_led = 5;
      },
      pattern: /term-1 tasarım yönü dengesi exact 27\/27/i,
    },
    {
      name: "yıllık hedef 107",
      mutate: (profile) => { profile.annualTargets.activityCount = 107; },
      pattern: /exact 108/i,
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, () => assertRejected(entry.mutate, entry.pattern));
  }
});

test("Orman Okulu ve Montessori tanınma/sertifika iddiaları fail-closed kalır", async (t) => {
  const cases = [
    {
      name: "yanlış doğa claim level",
      mutate: (profile) => { profile.pedagogicalLensBoundaries.natureBasedContinuity.claimLevel = "recognised_or_certified_forest_school"; },
      pattern: /exact nature_based_continuity/i,
    },
    {
      name: "23 haftalık doğa iddiası",
      mutate: (profile) => { profile.pedagogicalLensBoundaries.natureBasedContinuity.minimumDurationWeeks = 23; },
      pattern: /en az 24/i,
    },
    {
      name: "11 oturumluk doğa iddiası",
      mutate: (profile) => { profile.pedagogicalLensBoundaries.natureBasedContinuity.minimumPlannedSessions = 11; },
      pattern: /en az 12/i,
    },
    {
      name: "Orman Okulu recognition iddiası",
      mutate: (profile) => { profile.pedagogicalLensBoundaries.natureBasedContinuity.recognitionClaimed = true; },
      pattern: /tanınma iddiası exact false/i,
    },
    {
      name: "doğa sertifika iddiası",
      mutate: (profile) => { profile.pedagogicalLensBoundaries.natureBasedContinuity.certificationClaimed = true; },
      pattern: /sertifika iddiası exact false/i,
    },
    {
      name: "doğa sınır metni kayması",
      mutate: (profile) => { profile.pedagogicalLensBoundaries.natureBasedContinuity.qualifiedPracticeBoundary = "Orman Okuludur."; },
      pattern: /nitelikli uygulama sınırı exact/i,
    },
    {
      name: "yanlış Montessori claim level",
      mutate: (profile) => { profile.pedagogicalLensBoundaries.preparedEnvironment.claimLevel = "montessori_certified"; },
      pattern: /exact montessori_inspired/i,
    },
    {
      name: "Montessori sertifika iddiası",
      mutate: (profile) => { profile.pedagogicalLensBoundaries.preparedEnvironment.certificationClaimed = true; },
      pattern: /sertifika iddiası exact false/i,
    },
    {
      name: "Montessori sınır metni kayması",
      mutate: (profile) => { profile.pedagogicalLensBoundaries.preparedEnvironment.certificationBoundary = "Sertifikalı Montessori programıdır."; },
      pattern: /sertifika sınırı exact/i,
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, () => assertRejected(entry.mutate, entry.pattern));
  }
});
