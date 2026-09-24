import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  HUMAN_REVIEW_ROLES,
  ROOF_VALUE_CODES,
  VALUE_CODES,
  VALUE_DEFINITIONS_BY_CODE,
  VALUES_PEDAGOGY_CONSTITUTION,
  parseValuesPedagogyConstitution,
  valueDefinitionByCode,
} from "../../src/features/values/values-constitution.ts";

const rawConstitution = JSON.parse(
  await readFile(
    new URL(
      "../../src/features/values/values-pedagogy-constitution.v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const OFFICIAL_NAMES = {
  D1: "Adalet",
  D2: "Aile Bütünlüğü",
  D3: "Çalışkanlık",
  D4: "Dostluk",
  D5: "Duyarlılık",
  D6: "Dürüstlük",
  D7: "Estetik",
  D8: "Mahremiyet",
  D9: "Merhamet",
  D10: "Mütevazılık",
  D11: "Özgürlük",
  D12: "Sabır",
  D13: "Sağlıklı Yaşam",
  D14: "Saygı",
  D15: "Sevgi",
  D16: "Sorumluluk",
  D17: "Tasarruf",
  D18: "Temizlik",
  D19: "Vatanseverlik",
  D20: "Yardımseverlik",
};

const EXPECTED_DOMAINS = {
  roof: ["D1", "D14", "D16"],
  human: ["D3", "D8", "D10", "D12", "D13", "D17"],
  "family-and-social-environment": ["D2", "D4", "D6", "D11", "D15", "D19", "D20"],
  "physical-environment": ["D5", "D7", "D9", "D18"],
};

test("kanonik JSON strict ayrıştırılır; D1–D20 resmî kod ve adları tam bir kez taşır", () => {
  assert.deepEqual(VALUES_PEDAGOGY_CONSTITUTION, rawConstitution);
  assert.deepEqual(
    VALUES_PEDAGOGY_CONSTITUTION.canonicalSource.preschoolActionSource,
    {
      catalogId: "meb-tymm-okul-oncesi-2024-ede-ek14",
      sourceVersion: "2024.09.02",
      sourceUrl: "https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf",
      sourceSha256: "sha256:77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09",
      pageNumbering: "pdf-page-label-and-viewer-1-based",
      sourcePageRange: [324, 332],
    },
  );
  assert.equal(VALUE_CODES.length, 20);
  assert.equal(new Set(VALUE_CODES).size, 20);
  assert.equal(VALUES_PEDAGOGY_CONSTITUTION.values.length, 20);

  for (const definition of VALUES_PEDAGOGY_CONSTITUTION.values) {
    assert.equal(definition.officialName, OFFICIAL_NAMES[definition.code]);
    assert.equal(definition.observableActionsStatus, "maarifos_preschool_adaptation");
    assert.ok(definition.pedagogicalPurpose.length >= 30);
    assert.ok(definition.observablePreschoolActions.length >= 3);
    assert.ok(definition.guardrails.length >= 1);
    assert.ok(definition.roofLinks.length >= 1);
    assert.ok(definition.roofLinks.every((code) => ROOF_VALUE_CODES.includes(code)));
    assert.equal(valueDefinitionByCode(definition.code), definition);
    assert.equal(VALUE_DEFINITIONS_BY_CODE[definition.code], definition);
  }
  assert.equal(valueDefinitionByCode("D21"), undefined);
  assert.equal(VALUES_PEDAGOGY_CONSTITUTION.governance.publicationStatus, "draft-pending-human-review");
  assert.equal(VALUES_PEDAGOGY_CONSTITUTION.governance.effectiveOn, null);
  assert.equal(VALUES_PEDAGOGY_CONSTITUTION.version, "1.1.0");
  assert.ok(Object.isFrozen(HUMAN_REVIEW_ROLES));
  assert.deepEqual(
    VALUES_PEDAGOGY_CONSTITUTION.governance.requiredReviewRoles,
    HUMAN_REVIEW_ROLES,
  );
  assert.equal(VALUES_PEDAGOGY_CONSTITUTION.governance.approvals.length, 6);
  assert.ok(VALUES_PEDAGOGY_CONSTITUTION.governance.approvals.every((approval) => approval.status === "pending"));
});

test("değer alanları resmî 6/7/4 dağılımını ve üç çatı değeri korur", () => {
  assert.deepEqual(new Set(ROOF_VALUE_CODES), new Set(["D1", "D14", "D16"]));
  assert.deepEqual(
    new Set(VALUES_PEDAGOGY_CONSTITUTION.centerPillars),
    new Set(ROOF_VALUE_CODES),
  );

  for (const [domain, expectedCodes] of Object.entries(EXPECTED_DOMAINS)) {
    const actualCodes = VALUES_PEDAGOGY_CONSTITUTION.values
      .filter((definition) => definition.domain === domain)
      .map((definition) => definition.code);
    const domainDefinition = VALUES_PEDAGOGY_CONSTITUTION.domains.find(
      (definition) => definition.id === domain,
    );
    assert.deepEqual(new Set(actualCodes), new Set(expectedCodes));
    assert.equal(domainDefinition.expectedValueCount, expectedCodes.length);
  }

  for (const definition of VALUES_PEDAGOGY_CONSTITUTION.values) {
    assert.equal(definition.roofValue, definition.domain === "roof");
  }
});

test("Türk-İslam kültürel köprüleri resmî TYMM değeri gibi sunulmaz ve yalnız geçerli kodlara bağlanır", () => {
  const expectedBridgeIds = [
    "emanet",
    "kul-hakki",
    "merhamet",
    "edep-nezaket",
    "helal-emek-caliskanlik",
    "sukur-kanaat-israf-etmeme",
    "aile-sila-i-rahim-komsuluk",
    "imece-yardimlasma",
    "temizlik",
    "vatan-kulturel-miras",
    "yaratilmislara-dogaya-merhamet",
  ];
  const validCodes = new Set(VALUE_CODES);
  const bridges = VALUES_PEDAGOGY_CONSTITUTION.culturalBridges;

  assert.deepEqual(new Set(bridges.map((bridge) => bridge.id)), new Set(expectedBridgeIds));
  for (const bridge of bridges) {
    assert.equal(bridge.officialTymmValue, false);
    assert.equal(bridge.status, "Turkish-Islamic-cultural-pedagogical-bridge");
    assert.equal("code" in bridge, false);
    assert.ok(bridge.valueCodes.length >= 1);
    assert.ok(bridge.valueCodes.every((code) => validCodes.has(code)));
  }
});

test("değişmez güvenlik kuralları inanç, zorlama, mahremiyet, itaat, aile ve vatan sınırlarını kapsar", () => {
  const rules = Object.fromEntries(
    VALUES_PEDAGOGY_CONSTITUTION.safetyRules.map((rule) => [rule.id, rule]),
  );
  const requiredIds = [
    "belief-is-not-assessed",
    "no-coercion-fear-shame-or-sectarian-superiority",
    "privacy-and-help-seeking-are-protected",
    "respect-is-not-blind-obedience",
    "family-unity-never-conceals-harm",
    "patriotism-never-demeans-other-peoples",
  ];

  assert.deepEqual(new Set(Object.keys(rules)), new Set(requiredIds));
  assert.match(rules["belief-is-not-assessed"].rule, /inancı.*ölçülmez.*puanlanmaz/iu);
  assert.match(
    rules["no-coercion-fear-shame-or-sectarian-superiority"].rule,
    /zorlama.*korkutma.*utandırma.*mezhep/iu,
  );
  assert.match(rules["privacy-and-help-seeking-are-protected"].rule, /mahremiyeti.*yardım isteme/iu);
  assert.match(rules["respect-is-not-blind-obedience"].rule, /kör itaat değildir/iu);
  assert.match(rules["family-unity-never-conceals-harm"].rule, /zararı gizleme|zararı.*giz/iu);
  assert.match(rules["patriotism-never-demeans-other-peoples"].rule, /başka halkları.*küçültmez/iu);
  assert.ok(Object.values(rules).every((rule) => rule.enforcement === "hard-stop"));
});

test("planlama sözleşmesi tek ana değer, tek çatı ankrajı, en çok iki destek ve tam kapsam ister", () => {
  const contract = VALUES_PEDAGOGY_CONSTITUTION.activityPlanningContract;
  assert.equal(contract.primaryValue.exactly, 1);
  assert.equal(contract.roofAnchor.exactly, 1);
  assert.deepEqual(new Set(contract.roofAnchor.allowedCodes), new Set(ROOF_VALUE_CODES));
  assert.equal(contract.roofValueChecks.required, true);
  assert.deepEqual(
    contract.roofValueChecks.requiredFields,
    ["respect", "responsibility", "justice"],
  );
  assert.equal(contract.supportingValues.minimum, 0);
  assert.equal(contract.supportingValues.maximum, 2);
  assert.equal(contract.supportingValues.mustBeDistinct, true);
  assert.equal(contract.supportingValues.mustExcludePrimary, true);

  assert.equal(contract.officialActionSnapshot.required, true);
  assert.equal(contract.officialActionSnapshot.immutable, true);
  assert.deepEqual(
    new Set(contract.officialActionSnapshot.requiredFields),
    new Set([
      "valueCode",
      "actionCode",
      "actionName",
      "indicatorCode",
      "indicatorText",
      "catalogId",
      "sourceVersion",
      "sourceUrl",
      "sourceSha256",
      "sourcePage",
    ]),
  );
  assert.deepEqual(
    new Set(contract.pedagogicalFields.map((field) => field.id)),
    new Set([
      "dilemma",
      "observableAction",
      "adultModel",
      "childAgency",
      "repair",
      "familyConnection",
      "natureConnection",
      "evidence",
      "reflection",
    ]),
  );
  assert.deepEqual(
    contract.pedagogicalFields.filter((field) => !field.required).map((field) => field.id),
    ["familyConnection", "natureConnection"],
  );
  assert.equal(contract.coverage.minimumDistinctValuesPerMonth, 4);
  assert.deepEqual(new Set(contract.coverage.requiredValueCodesPerTerm), new Set(VALUE_CODES));
});

test("snapshot derin değişmezdir ve strict parser eksik, bilinmeyen veya yanlış statülü veriyi reddeder", () => {
  assert.ok(Object.isFrozen(VALUES_PEDAGOGY_CONSTITUTION));
  assert.ok(Object.isFrozen(VALUES_PEDAGOGY_CONSTITUTION.values));
  assert.ok(Object.isFrozen(VALUES_PEDAGOGY_CONSTITUTION.values[0]));
  assert.ok(Object.isFrozen(VALUES_PEDAGOGY_CONSTITUTION.values[0].observablePreschoolActions));
  assert.ok(Object.isFrozen(VALUES_PEDAGOGY_CONSTITUTION.activityPlanningContract.coverage));
  assert.throws(() => {
    VALUES_PEDAGOGY_CONSTITUTION.values[0].officialName = "Değiştirildi";
  }, TypeError);

  const unknownField = structuredClone(rawConstitution);
  unknownField.values[0].unapprovedField = true;
  assert.throws(() => parseValuesPedagogyConstitution(unknownField), /beklenmeyen/iu);

  const missingAction = structuredClone(rawConstitution);
  missingAction.values[1].observablePreschoolActions = missingAction.values[1].observablePreschoolActions.slice(0, 2);
  assert.throws(() => parseValuesPedagogyConstitution(missingAction), /en az 3/iu);

  const falseOfficialClaim = structuredClone(rawConstitution);
  falseOfficialClaim.values[2].observableActionsStatus = "official_tymm_action";
  assert.throws(() => parseValuesPedagogyConstitution(falseOfficialClaim), /maarifos_preschool_adaptation/iu);

  const badBridgeCode = structuredClone(rawConstitution);
  badBridgeCode.culturalBridges[0].valueCodes.push("D21");
  assert.throws(() => parseValuesPedagogyConstitution(badBridgeCode), /D1–D20/iu);

  const excessiveSupport = structuredClone(rawConstitution);
  excessiveSupport.activityPlanningContract.supportingValues.maximum = 3;
  assert.throws(() => parseValuesPedagogyConstitution(excessiveSupport), /2 olmalıdır/iu);

  const fakeSourceDigest = structuredClone(rawConstitution);
  fakeSourceDigest.canonicalSource.preschoolActionSource.sourceSha256 = `sha256:${"0".repeat(64)}`;
  assert.throws(() => parseValuesPedagogyConstitution(fakeSourceDigest), /doğrulanmış SHA-256/iu);

  const impossibleDate = structuredClone(rawConstitution);
  impossibleDate.canonicalSource.sourceCheckedOn = "2026-02-31";
  assert.throws(() => parseValuesPedagogyConstitution(impossibleDate), /YYYY-AA-GG/iu);

  const reorderedReviewRoles = structuredClone(rawConstitution);
  [
    reorderedReviewRoles.governance.requiredReviewRoles[0],
    reorderedReviewRoles.governance.requiredReviewRoles[1],
  ] = [
    reorderedReviewRoles.governance.requiredReviewRoles[1],
    reorderedReviewRoles.governance.requiredReviewRoles[0],
  ];
  assert.throws(
    () => parseValuesPedagogyConstitution(reorderedReviewRoles),
    /altı zorunlu insan inceleme rolünü/iu,
  );

  const prematurePublication = structuredClone(rawConstitution);
  prematurePublication.governance.publicationStatus = "published";
  prematurePublication.governance.effectiveOn = "2026-08-07";
  assert.throws(() => parseValuesPedagogyConstitution(prematurePublication), /yürürlük tarihi|draft-pending/iu);
});
