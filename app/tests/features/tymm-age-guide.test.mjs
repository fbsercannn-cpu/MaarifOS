import assert from "node:assert/strict";
import test from "node:test";

import {
  TYMM_AGE_GUIDE_READ_MODELS,
  getTymmAgeGuide,
  isTymmAgeGuideAgeBand,
  listTymmAgeGuides,
} from "../../src/features/curriculum/tymm-age-guide.ts";
import {
  TYMM_2024_AGE_BANDS,
  TYMM_2024_CATALOG_METADATA,
  TYMM_2024_DOMAINS,
  TYMM_2024_LEARNING_OUTCOMES,
} from "../../src/features/curriculum/tymm-2024-catalog.ts";

test("yaş rehberi üç resmî bandı katalog sırasıyla ve yedi alanla sunar", () => {
  const guides = listTymmAgeGuides();

  assert.strictEqual(guides, TYMM_AGE_GUIDE_READ_MODELS);
  assert.deepEqual(
    guides.map((guide) => guide.ageBand),
    TYMM_2024_AGE_BANDS,
  );

  for (const guide of guides) {
    const ageOutcomes = TYMM_2024_LEARNING_OUTCOMES.filter(
      (outcome) => outcome.ageBand === guide.ageBand,
    );
    assert.deepEqual(
      guide.domainOutcomeCounts.map((item) => item.domain),
      TYMM_2024_DOMAINS,
    );

    for (const item of guide.domainOutcomeCounts) {
      assert.equal(
        item.learningOutcomeCount,
        ageOutcomes.filter((outcome) => outcome.domain === item.domain).length,
        `${guide.ageBand}/${item.domain} sayımı katalogdan türetilmeli`,
      );
    }

    assert.equal(
      guide.totalLearningOutcomeCount,
      ageOutcomes.length,
      `${guide.ageBand} toplamı yalnız kendi katalog satırlarını taşımalı`,
    );
    assert.equal(
      guide.domainOutcomeCounts.reduce(
        (total, item) => total + item.learningOutcomeCount,
        0,
      ),
      guide.totalLearningOutcomeCount,
    );
  }

  assert.deepEqual(
    guides.map((guide) => guide.totalLearningOutcomeCount),
    [47, 67, 96],
  );
});

test("her rehber yalnız kendi yaşının kaynak sayfalarını ve resmî provenance'ını taşır", () => {
  const claimedPages = new Set();

  for (const guide of listTymmAgeGuides()) {
    const ageOutcomes = TYMM_2024_LEARNING_OUTCOMES.filter(
      (outcome) => outcome.ageBand === guide.ageBand,
    );
    const expectedPages = [...new Set(
      ageOutcomes.map((outcome) => outcome.sourcePage),
    )].sort((left, right) => left - right);

    assert.deepEqual(guide.officialProvenance.ageBandSourcePages, expectedPages);
    assert.ok(
      TYMM_2024_LEARNING_OUTCOMES
        .filter((outcome) => expectedPages.includes(outcome.sourcePage))
        .every((outcome) => outcome.ageBand === guide.ageBand),
      `${guide.ageBand} kaynak sayfalarına başka yaş bandı sızmamalı`,
    );
    for (const page of guide.officialProvenance.ageBandSourcePages) {
      assert.ok(!claimedPages.has(page), `kaynak sayfası ${page} yaşlar arasında sızdı`);
      claimedPages.add(page);
    }

    assert.deepEqual(guide.officialProvenance, {
      authority: "T.C. Millî Eğitim Bakanlığı",
      materialKind: "official-program",
      catalogId: TYMM_2024_CATALOG_METADATA.catalogId,
      catalogVersion: TYMM_2024_CATALOG_METADATA.catalogVersion,
      sourceVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
      sourceDocumentTitle: TYMM_2024_CATALOG_METADATA.sourceDocumentTitle,
      sourceFileName: TYMM_2024_CATALOG_METADATA.sourceFileName,
      sourceUrl: TYMM_2024_CATALOG_METADATA.sourceUrl,
      sourceSha256: TYMM_2024_CATALOG_METADATA.sourceSha256,
      catalogContentSha256: TYMM_2024_CATALOG_METADATA.catalogContentSha256,
      sourceCheckedOn: TYMM_2024_CATALOG_METADATA.sourceCheckedOn,
      matrixPageRange: TYMM_2024_CATALOG_METADATA.matrixPageRange,
      ageBandSourcePages: expectedPages,
      completeScope: TYMM_2024_CATALOG_METADATA.completeScope,
    });
  }
});

test("başka yaşın çıktıları alan sayımlarına sızmaz", () => {
  for (const guide of listTymmAgeGuides()) {
    for (const item of guide.domainOutcomeCounts) {
      const ownCount = TYMM_2024_LEARNING_OUTCOMES.filter(
        (outcome) =>
          outcome.ageBand === guide.ageBand && outcome.domain === item.domain,
      ).length;
      const allAgeCount = TYMM_2024_LEARNING_OUTCOMES.filter(
        (outcome) => outcome.domain === item.domain,
      ).length;

      assert.equal(item.learningOutcomeCount, ownCount);
      assert.ok(
        item.learningOutcomeCount < allAgeCount,
        `${guide.ageBand}/${item.domain} tüm yaşların toplamını taşımamalı`,
      );
    }
  }
});

test("her yaş üç özgün, gözetimli ve puansız büyük seçim şablonu taşır", () => {
  const templateIds = new Set();
  const optionIds = new Set();
  const unsafeEvaluationLanguage =
    /\b(?:başarılı|başarısız|doğru|yanlış|üstün|geride|tanı|teşhis)\b/iu;

  for (const guide of listTymmAgeGuides()) {
    assert.match(guide.ageLabel, /^\d{2}–\d{2} ay$/u);
    assert.ok(guide.developmentalUseNote.length >= 80);
    assert.deepEqual(guide.interactionPolicy, {
      mode: "adult-supervised-large-choice",
      contentOrigin: "MaarifOS-original",
      officialMebActivity: false,
      assessmentUse: false,
      diagnosticUse: false,
      minimumTouchTargetPx: 56,
      allowSkip: true,
      allowChange: true,
      notice:
        "Bu şablonlar MaarifOS tarafından kolaylaştırma amacıyla yazılmıştır; resmî MEB etkinliği veya değerlendirme aracı değildir. Çocuğun seçimi puanlanmaz, kişilik ya da gelişim etiketi ve tanı için kullanılmaz.",
    });
    assert.equal(guide.choiceTemplates.length, 3);

    for (const template of guide.choiceTemplates) {
      assert.match(template.id, new RegExp(`^${guide.ageBand}-`, "u"));
      assert.ok(!templateIds.has(template.id), `${template.id} mükerrer şablon`);
      templateIds.add(template.id);
      assert.equal(template.choices.length, 3);
      assert.ok(template.childPrompt.endsWith("?"));
      assert.ok(template.reflectionPrompt.endsWith("?"));
      assert.doesNotMatch(
        [
          template.title,
          template.childPrompt,
          template.adultFacilitation,
          template.reflectionPrompt,
          ...template.choices.map((choice) => choice.label),
        ].join(" "),
        unsafeEvaluationLanguage,
      );

      for (const choice of template.choices) {
        assert.match(choice.id, new RegExp(`^${guide.ageBand}-`, "u"));
        assert.ok(!optionIds.has(choice.id), `${choice.id} mükerrer seçenek`);
        optionIds.add(choice.id);
        assert.ok(choice.label.length >= 8);
      }
    }
  }

  assert.equal(templateIds.size, 9);
  assert.equal(optionIds.size, 27);
});

test("exact olmayan yaş girdileri fail-closed kalır", () => {
  for (const ageBand of TYMM_2024_AGE_BANDS) {
    assert.equal(isTymmAgeGuideAgeBand(ageBand), true);
    assert.strictEqual(getTymmAgeGuide(ageBand)?.ageBand, ageBand);
  }

  for (const invalidAge of [
    "36–48",
    "36-48 ay",
    "48 - 60",
    "5 yaş",
    "60-72 ",
    "",
    60,
    null,
    undefined,
    {},
  ]) {
    assert.equal(isTymmAgeGuideAgeBand(invalidAge), false);
    assert.equal(getTymmAgeGuide(invalidAge), null);
  }
});

test("read-model ve yaşa özgü alt yapılar derin dondurulmuştur", () => {
  const guides = listTymmAgeGuides();
  const first = guides[0];
  const second = guides[1];

  assert.ok(Object.isFrozen(guides));
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.domainOutcomeCounts));
  assert.ok(Object.isFrozen(first.domainOutcomeCounts[0]));
  assert.ok(Object.isFrozen(first.officialProvenance));
  assert.ok(Object.isFrozen(first.officialProvenance.ageBandSourcePages));
  assert.ok(Object.isFrozen(first.interactionPolicy));
  assert.ok(Object.isFrozen(first.choiceTemplates));
  assert.ok(Object.isFrozen(first.choiceTemplates[0]));
  assert.ok(Object.isFrozen(first.choiceTemplates[0].choices));
  assert.ok(Object.isFrozen(first.choiceTemplates[0].choices[0]));
  assert.notStrictEqual(first.choiceTemplates, second.choiceTemplates);
  assert.notStrictEqual(
    first.choiceTemplates[0].choices,
    second.choiceTemplates[0].choices,
  );
  assert.throws(() => {
    first.choiceTemplates[0].choices[0].label = "Değiştirildi";
  }, TypeError);
});
