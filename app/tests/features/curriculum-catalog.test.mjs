import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  OFFICIAL_STARTER_CATALOG_PROFILES,
  STARTER_CURRICULUM_TARGETS,
  curriculumAgeBandFromLabel,
  curriculumTargetsForProfile,
  curriculumTargetsForResolvedAgeBand,
} from "../../src/features/curriculum/curriculum-catalog.ts";
import {
  TYMM_2024_AGE_BANDS,
  TYMM_2024_CATALOG_METADATA,
  TYMM_2024_DOMAINS,
  TYMM_2024_LEARNING_OUTCOMES,
} from "../../src/features/curriculum/tymm-2024-catalog.ts";

const expectedCounts = {
  "36-48": {
    Türkçe: 8,
    Matematik: 6,
    Fen: 5,
    Sosyal: 2,
    "Hareket ve Sağlık": 9,
    Sanat: 4,
    Müzik: 13,
  },
  "48-60": {
    Türkçe: 11,
    Matematik: 13,
    Fen: 6,
    Sosyal: 7,
    "Hareket ve Sağlık": 12,
    Sanat: 4,
    Müzik: 14,
  },
  "60-72": {
    Türkçe: 18,
    Matematik: 14,
    Fen: 10,
    Sosyal: 22,
    "Hareket ve Sağlık": 14,
    Sanat: 4,
    Müzik: 14,
  },
};

const matrixPages = {
  "36-48": {
    Türkçe: [245, 246],
    Matematik: [256, 257],
    Fen: [267],
    Sosyal: [272],
    "Hareket ve Sağlık": [278, 279],
    Sanat: [288, 289],
    Müzik: [294, 295],
  },
  "48-60": {
    Türkçe: [247, 248],
    Matematik: [258, 259, 260, 261],
    Fen: [268],
    Sosyal: [273],
    "Hareket ve Sağlık": [280, 281],
    Sanat: [290, 291],
    Müzik: [296, 297],
  },
  "60-72": {
    Türkçe: [249, 250, 251, 252, 253, 254, 255],
    Matematik: [262, 263, 264, 265, 266],
    Fen: [269, 270, 271],
    Sosyal: [274, 275, 276, 277],
    "Hareket ve Sağlık": [282, 283, 284, 285, 286, 287],
    Sanat: [292, 293],
    Müzik: [298, 299],
  },
};

const codes = (prefix, numbers) => numbers.map((number) => `${prefix}.${number}`);
const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index);

const expectedCodes = {
  "36-48": {
    Türkçe: [
      "TADB.1",
      "TADB.2",
      "TAOB.1",
      "TAOB.2",
      "TAKB.1",
      "TAKB.2",
      "TAEOB.1",
      "TAEOB.6",
    ],
    Matematik: codes("MAB", range(1, 6)),
    Fen: codes("FAB", [1, 2, 3, 4, 6]),
    Sosyal: codes("SAB", [1, 2]),
    "Hareket ve Sağlık": codes("HSAB", [1, 2, 3, 4, 6, 7, 8, 9, 10]),
    Sanat: codes("SNAB", range(1, 4)),
    Müzik: [
      ...codes("MDB", range(1, 4)),
      ...codes("MSB", range(1, 3)),
      ...codes("MÇB", range(1, 3)),
      ...codes("MHB", range(1, 3)),
    ],
  },
  "48-60": {
    Türkçe: [
      ...codes("TADB", range(1, 3)),
      ...codes("TAOB", range(1, 3)),
      ...codes("TAKB", range(1, 2)),
      ...codes("TAEOB", [1, 5, 6]),
    ],
    Matematik: codes("MAB", range(1, 13)),
    Fen: codes("FAB", range(1, 6)),
    Sosyal: codes("SAB", range(1, 7)),
    "Hareket ve Sağlık": codes("HSAB", range(1, 12)),
    Sanat: codes("SNAB", range(1, 4)),
    Müzik: [
      ...codes("MDB", range(1, 4)),
      ...codes("MSB", range(1, 3)),
      ...codes("MÇB", range(1, 4)),
      ...codes("MHB", range(1, 3)),
    ],
  },
  "60-72": {
    Türkçe: [
      ...codes("TADB", range(1, 4)),
      ...codes("TAOB", range(1, 4)),
      ...codes("TAKB", range(1, 4)),
      ...codes("TAEOB", range(1, 6)),
    ],
    Matematik: codes("MAB", range(1, 14)),
    Fen: codes("FAB", range(1, 10)),
    Sosyal: codes("SAB", range(1, 22)),
    "Hareket ve Sağlık": codes("HSAB", range(1, 14)),
    Sanat: codes("SNAB", range(1, 4)),
    Müzik: [
      ...codes("MDB", range(1, 4)),
      ...codes("MSB", range(1, 3)),
      ...codes("MÇB", range(1, 4)),
      ...codes("MHB", range(1, 3)),
    ],
  },
};

const codePrefixes = {
  Türkçe: /^(?:TADB|TAOB|TAKB|TAEOB)\.\d+$/,
  Matematik: /^MAB\.\d+$/,
  Fen: /^FAB\.\d+$/,
  Sosyal: /^SAB\.\d+$/,
  "Hareket ve Sağlık": /^HSAB\.\d+$/,
  Sanat: /^SNAB\.\d+$/,
  Müzik: /^(?:MDB|MSB|MÇB|MHB)\.\d+$/,
};

test("TYMM 2024 katalog metadata'sı resmî PDF'yi ve complete kapsamını sürümler", () => {
  assert.deepEqual(OFFICIAL_STARTER_CATALOG_PROFILES.tymm, {
    catalogId: "meb-tymm-okul-oncesi-2024-learning-outcomes",
    sourceVersion: "2024.09.02",
  });
  assert.equal(TYMM_2024_CATALOG_METADATA.catalogVersion, "1.0.0");
  assert.equal(TYMM_2024_CATALOG_METADATA.sourcePageCount, 353);
  assert.deepEqual(TYMM_2024_CATALOG_METADATA.matrixPageRange, [245, 299]);
  assert.equal(
    TYMM_2024_CATALOG_METADATA.sourceSha256,
    "sha256:77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09",
  );
  assert.match(
    TYMM_2024_CATALOG_METADATA.completeScope,
    /yedi okul öncesi alan matrisinde.*öğrenme çıktısı satırlarının tamamı/i,
  );
  assert.ok(
    TYMM_2024_CATALOG_METADATA.excludedFromCompleteScope.includes(
      "alt öğrenme çıktıları",
    ),
  );
});

test("210 öğrenme çıktısının kod, başlık, alan, yaş ve kaynak sayfası matrisi geçerlidir", () => {
  assert.equal(TYMM_2024_LEARNING_OUTCOMES.length, 210);
  const compositeKeys = new Set();

  for (const outcome of TYMM_2024_LEARNING_OUTCOMES) {
    assert.ok(TYMM_2024_AGE_BANDS.includes(outcome.ageBand));
    assert.ok(TYMM_2024_DOMAINS.includes(outcome.domain));
    assert.match(outcome.code, codePrefixes[outcome.domain]);
    assert.equal(outcome.code, outcome.code.trim());
    assert.equal(outcome.title, outcome.title.trim());
    assert.ok(outcome.title.length >= 20);
    assert.doesNotMatch(outcome.title, /\s{2}|-\s/);
    assert.ok(
      matrixPages[outcome.ageBand][outcome.domain].includes(outcome.sourcePage),
      `${outcome.ageBand}/${outcome.domain}/${outcome.code} yanlış kaynak sayfasında`,
    );

    const key = `${outcome.ageBand}\u0000${outcome.code}`;
    assert.ok(!compositeKeys.has(key), `${key} mükerrer`);
    compositeKeys.add(key);
  }

  assert.equal(compositeKeys.size, TYMM_2024_LEARNING_OUTCOMES.length);
});

test("her yaş bandı ve alan resmî matrisin beklenen kod kapsamını taşır", () => {
  for (const ageBand of TYMM_2024_AGE_BANDS) {
    for (const domain of TYMM_2024_DOMAINS) {
      const actual = TYMM_2024_LEARNING_OUTCOMES.filter(
        (outcome) =>
          outcome.ageBand === ageBand && outcome.domain === domain,
      ).map((outcome) => outcome.code);
      assert.equal(actual.length, expectedCounts[ageBand][domain]);
      assert.deepEqual(
        [...actual].sort(),
        [...expectedCodes[ageBand][domain]].sort(),
        `${ageBand}/${domain} kod kapsamı`,
      );
    }
  }
});

test("kod, başlık, alan, yaş ve sayfa içeriği sabit katalog digest'i ile korunur", () => {
  const canonicalRows = TYMM_2024_LEARNING_OUTCOMES.map(
    ({ ageBand, domain, code, title, sourcePage }) => [
      ageBand,
      domain,
      code,
      title,
      sourcePage,
    ],
  );
  const digest = createHash("sha256")
    .update(JSON.stringify(canonicalRows), "utf8")
    .digest("hex");

  assert.equal(
    digest,
    "a67ab72bcbbe9b5bde8e9463c1c4b48b79fcdb582c6cd5a3df270fbd7aa74cec",
  );
  assert.equal(
    TYMM_2024_CATALOG_METADATA.catalogContentSha256,
    `sha256:${digest}`,
  );
});

test("katalog adaptörü TYMM'yi yaşa göre filtreler ve yedek snapshot'ına yeni alan sızdırmaz", () => {
  const profile = {
    framework: "tymm",
    programLabel: "Türkiye Yüzyılı Maarif Modeli",
    ...OFFICIAL_STARTER_CATALOG_PROFILES.tymm,
    referenceOrigin: "official-catalog",
    officialCatalogVerified: true,
  };
  const allTargets = curriculumTargetsForProfile(profile);
  const targets36 = curriculumTargetsForProfile(profile, "36-48");
  const targets48 = curriculumTargetsForProfile(profile, "48-60");
  const targets60 = curriculumTargetsForProfile(profile, "60-72");

  assert.equal(allTargets.length, 210);
  assert.equal(targets36.length, 47);
  assert.equal(targets48.length, 67);
  assert.equal(targets60.length, 96);
  assert.equal(new Set(allTargets.map((target) => target.id)).size, 210);
  assert.ok(
    allTargets.every(
      (target) =>
        target.catalogCompleteness === "complete" &&
        target.kind === "learning-outcome" &&
        target.catalogId === TYMM_2024_CATALOG_METADATA.catalogId &&
        target.sourceVersion === TYMM_2024_CATALOG_METADATA.sourceVersion &&
        !Object.hasOwn(target, "ageBands") &&
        !Object.hasOwn(target, "sourcePage"),
    ),
  );

  assert.equal(curriculumAgeBandFromLabel("36–48 ay"), "36-48");
  assert.equal(curriculumAgeBandFromLabel("48 - 60 AY"), "48-60");
  assert.equal(curriculumAgeBandFromLabel("60-72"), "60-72");
  assert.equal(curriculumAgeBandFromLabel("5 yaş"), null);
  assert.deepEqual(curriculumTargetsForResolvedAgeBand(profile, null), []);
  assert.deepEqual(curriculumTargetsForResolvedAgeBand(profile, undefined), []);
  assert.equal(
    curriculumTargetsForResolvedAgeBand(profile, "60-72").length,
    targets60.length,
  );
});

test("MEB 2024 legacy başlangıç hedefleri partial kalır", () => {
  const tymmTargets = STARTER_CURRICULUM_TARGETS.filter(
    (target) => target.framework === "tymm",
  );
  const legacyTargets = STARTER_CURRICULUM_TARGETS.filter(
    (target) => target.framework === "meb_2024",
  );

  assert.equal(tymmTargets.length, 210);
  assert.equal(legacyTargets.length, 7);
  assert.ok(
    tymmTargets.every(
      (target) =>
        target.catalogCompleteness === "complete" &&
        target.ageBands?.length === 1 &&
        Number.isInteger(target.sourcePage),
    ),
  );
  assert.ok(
    legacyTargets.every(
      (target) =>
        target.catalogCompleteness === "partial" &&
        target.ageBands === undefined &&
        target.sourcePage === undefined,
    ),
  );
});
