import assert from "node:assert/strict";
import test from "node:test";

import {
  TYMM_OFFICIAL_PRESCHOOL_LANDING_URL,
  TYMM_OFFICIAL_PROGRAM_PDF_URL,
  TYMM_OFFICIAL_RESOURCE_CATALOG,
  TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON,
  getTymmOfficialAgeResource,
  isTymmOfficialResourceAgeBand,
  listTymmOfficialAgeResources,
  resolveTymmOfficialProgramAccessUrl,
} from "../../src/features/curriculum/tymm-official-resource-catalog.ts";
import {
  TYMM_2024_AGE_BANDS,
  TYMM_2024_CATALOG_METADATA,
} from "../../src/features/curriculum/tymm-2024-catalog.ts";

const EXPECTED_AGES = [
  {
    ageBand: "36-48",
    pageId: 1,
    url: "https://tymm.meb.gov.tr/ogretim-programlari/okul-oncesi/1",
    examples: [
      [443, "36-48 Ay Aralık Ayı Planı"],
      [442, "36-48 Ay Eylül Ayı Planı"],
      [482, "36-48 Ay Günlük Plan Örneği"],
      [444, "36-48 Ay Mayıs Ayı Planı"],
    ],
  },
  {
    ageBand: "48-60",
    pageId: 15,
    url: "https://tymm.meb.gov.tr/ogretim-programlari/okul-oncesi/15",
    examples: [
      [446, "48-60 Ay Aralık Ayı Planı"],
      [445, "48-60 Ay Eylül Ayı Planı"],
      [483, "48-60 Ay Günlük Plan Örneği"],
      [453, "48-60 Ay Mayıs Ayı Planı"],
    ],
  },
  {
    ageBand: "60-72",
    pageId: 16,
    url: "https://tymm.meb.gov.tr/ogretim-programlari/okul-oncesi/16",
    examples: [
      [480, "60-72 Ay Aralık Ayı Planı"],
      [479, "60-72 Ay Eylül Ayı Planı"],
      [484, "60-72 Ay Günlük Plan Örneği"],
      [481, "60-72 Ay Mayıs Ayı Planı"],
    ],
  },
];

test("katalog landing sayfasını ve kanonik program PDF metadata bağını taşır", () => {
  assert.equal(
    TYMM_OFFICIAL_PRESCHOOL_LANDING_URL,
    "https://tymm.meb.gov.tr/ogretim-programlari/ders/okul-oncesi",
  );
  assert.equal(
    TYMM_OFFICIAL_RESOURCE_CATALOG.landingPage.url,
    TYMM_OFFICIAL_PRESCHOOL_LANDING_URL,
  );
  assert.equal(
    TYMM_OFFICIAL_PROGRAM_PDF_URL,
    "https://tymm.meb.gov.tr/assets/pdf/2024programokuloncesiOnayli.pdf",
  );
  assert.equal(
    TYMM_OFFICIAL_RESOURCE_CATALOG.programPdf.url,
    TYMM_OFFICIAL_PROGRAM_PDF_URL,
  );
  assert.deepEqual(TYMM_OFFICIAL_RESOURCE_CATALOG.programPdf.catalogBinding, {
    catalogId: TYMM_2024_CATALOG_METADATA.catalogId,
    catalogVersion: TYMM_2024_CATALOG_METADATA.catalogVersion,
    sourceVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
    sourceIdentityUrl: TYMM_2024_CATALOG_METADATA.sourceUrl,
    sourceSha256: TYMM_2024_CATALOG_METADATA.sourceSha256,
  });
  assert.equal(
    TYMM_OFFICIAL_RESOURCE_CATALOG.programPdf.sourceFileName,
    TYMM_2024_CATALOG_METADATA.sourceFileName,
  );
  assert.equal(
    TYMM_OFFICIAL_RESOURCE_CATALOG.sourceCheckedOn,
    TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON,
  );
  assert.equal(TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON, "2026-09-01");
});

test("üç resmî yaş sayfası ve on iki örnek exact site sırasıyla kayıtlıdır", () => {
  const agePages = listTymmOfficialAgeResources();

  assert.strictEqual(agePages, TYMM_OFFICIAL_RESOURCE_CATALOG.agePages);
  assert.equal(agePages.length, 3);
  assert.deepEqual(
    agePages.map((page) => page.ageBand),
    TYMM_2024_AGE_BANDS,
  );
  assert.equal(
    agePages.reduce((total, page) => total + page.examples.length, 0),
    12,
  );

  assert.deepEqual(
    agePages.map((page) => ({
      ageBand: page.ageBand,
      pageId: page.pageId,
      url: page.url,
      examples: page.examples.map((example) => [example.unitId, example.title]),
    })),
    EXPECTED_AGES,
  );

  for (const page of agePages) {
    assert.equal(page.materialKind, "official-reference");
    assert.equal(page.examples.length, 4);
    assert.deepEqual(
      page.examples.map((example) => example.exampleKind),
      [
        "monthly-plan-example",
        "monthly-plan-example",
        "daily-plan-example",
        "monthly-plan-example",
      ],
    );
    for (const example of page.examples) {
      assert.equal(example.materialKind, "official-example");
      assert.equal(example.ageBand, page.ageBand);
      assert.equal(
        example.url,
        `https://tymm.meb.gov.tr/okul-oncesi/unite/${example.unitId}`,
      );
    }
  }
});

test("bütün kaynak kimlikleri ve URL'leri benzersiz, yalnız resmî HTTPS hostundadır", () => {
  const resources = [
    TYMM_OFFICIAL_RESOURCE_CATALOG.landingPage,
    TYMM_OFFICIAL_RESOURCE_CATALOG.programPdf,
    ...TYMM_OFFICIAL_RESOURCE_CATALOG.agePages,
    ...TYMM_OFFICIAL_RESOURCE_CATALOG.agePages.flatMap((page) => page.examples),
  ];
  const ids = resources.map((resource) => resource.id);
  const urls = resources.map((resource) => resource.url);

  assert.equal(resources.length, 17);
  assert.equal(new Set(ids).size, resources.length);
  assert.equal(new Set(urls).size, resources.length);

  for (const resource of resources) {
    const url = new URL(resource.url);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "tymm.meb.gov.tr");
    assert.equal(url.port, "");
    assert.equal(url.username, "");
    assert.equal(url.password, "");
    assert.equal(resource.accessMode, "external-link");
    assert.equal(resource.contentOrigin, "MEB-official");
    assert.equal(resource.republishMode, "link-only");
    assert.equal(resource.importable, false);
  }
});

test("kaynaklar metadata bağlantısıdır; kopya içerik veya kurulabilir plan paketi değildir", () => {
  assert.deepEqual(TYMM_OFFICIAL_RESOURCE_CATALOG.usePolicy, {
    contentHandling: "link-and-metadata-only",
    officialContentCopied: false,
    automaticInstallation: false,
    completePlanPackage: false,
    notice:
      "Bu katalog resmî TYMM sayfalarına kaynak bağlantısı ile başlık/meta bilgisi sağlar; resmî içeriği kopyalamaz ve kaynakları otomatik kurulabilir tam plan paketi olarak sunmaz.",
  });

  for (const page of TYMM_OFFICIAL_RESOURCE_CATALOG.agePages) {
    for (const example of page.examples) {
      for (const forbiddenField of [
        "content",
        "activities",
        "learningExperiences",
        "planPackage",
      ]) {
        assert.equal(forbiddenField in example, false);
      }
    }
  }
});

test("desteklenmeyen yaş girdileri tahmin edilmeden fail-closed kalır", () => {
  for (const ageBand of TYMM_2024_AGE_BANDS) {
    assert.equal(isTymmOfficialResourceAgeBand(ageBand), true);
    assert.strictEqual(getTymmOfficialAgeResource(ageBand)?.ageBand, ageBand);
  }

  for (const invalidAge of [
    "36–48",
    "36-48 ay",
    "48 - 60",
    "karma",
    "0-36",
    "60-72 ",
    "",
    60,
    null,
    undefined,
    {},
  ]) {
    assert.equal(isTymmOfficialResourceAgeBand(invalidAge), false);
    assert.equal(getTymmOfficialAgeResource(invalidAge), null);
  }
});

test("katalog ve bütün alt kaynakları derin dondurulmuştur", () => {
  const pending = [TYMM_OFFICIAL_RESOURCE_CATALOG];
  let frozenObjectCount = 0;

  while (pending.length > 0) {
    const value = pending.pop();
    assert.ok(Object.isFrozen(value));
    frozenObjectCount += 1;
    for (const nestedValue of Object.values(value)) {
      if (typeof nestedValue === "object" && nestedValue !== null) {
        pending.push(nestedValue);
      }
    }
  }

  assert.ok(frozenObjectCount >= 22);
  assert.throws(() => {
    TYMM_OFFICIAL_RESOURCE_CATALOG.agePages[0].examples[0].title =
      "Değiştirildi";
  }, TypeError);
});

test("tarihsel program kimliği değiştirilmeden güncel, sayfalı erişim URL'sine çözülür", () => {
  assert.equal(
    resolveTymmOfficialProgramAccessUrl(
      TYMM_2024_CATALOG_METADATA.sourceUrl,
      TYMM_2024_CATALOG_METADATA.sourceSha256,
      275,
    ),
    `${TYMM_OFFICIAL_PROGRAM_PDF_URL}#page=275`,
  );
  assert.equal(
    resolveTymmOfficialProgramAccessUrl(
      TYMM_OFFICIAL_PROGRAM_PDF_URL,
      TYMM_2024_CATALOG_METADATA.sourceSha256,
    ),
    TYMM_OFFICIAL_PROGRAM_PDF_URL,
  );
  assert.equal(
    resolveTymmOfficialProgramAccessUrl(
      TYMM_2024_CATALOG_METADATA.sourceUrl,
      "sha256:wrong",
      275,
    ),
    null,
  );

  for (const unsafeSourceUrl of [
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "about:blank",
    "http://tymm.meb.gov.tr/assets/pdf/2024programokuloncesiOnayli.pdf",
    ` ${TYMM_OFFICIAL_PROGRAM_PDF_URL}`,
    `${TYMM_OFFICIAL_PROGRAM_PDF_URL} `,
    TYMM_OFFICIAL_PROGRAM_PDF_URL.toLocaleUpperCase("tr-TR"),
    `${TYMM_OFFICIAL_PROGRAM_PDF_URL}?download=1`,
    `${TYMM_OFFICIAL_PROGRAM_PDF_URL}#page=275`,
    "https://tymm.meb.gov.tr.evil.example/assets/pdf/2024programokuloncesiOnayli.pdf",
    "https://tymm.meb.gov.tr@evil.example/assets/pdf/2024programokuloncesiOnayli.pdf",
    "https://user@tymm.meb.gov.tr/assets/pdf/2024programokuloncesiOnayli.pdf",
    "https://tymm.meb.gov.tr:443/assets/pdf/2024programokuloncesiOnayli.pdf",
    "https://tymm.meb.gov.tr:444/assets/pdf/2024programokuloncesiOnayli.pdf",
    "https://tymm.meb.gov.tr/assets/pdf/%32%30%32%34programokuloncesiOnayli.pdf",
    "https://tymm.meb.gov.tr/assets/pdf/../pdf/2024programokuloncesiOnayli.pdf",
    "https://tymm.meb.gov.tr/assets/pdf/2024programokuloncesiOnayli.pdf\u0000",
    "https://tymm.meb.gov.tr/assets/pdf/2024programokuloncesiOnayli.pdf\n",
  ]) {
    assert.equal(
      resolveTymmOfficialProgramAccessUrl(
        unsafeSourceUrl,
        TYMM_2024_CATALOG_METADATA.sourceSha256,
        275,
      ),
      null,
      unsafeSourceUrl,
    );
  }

  for (const unsafeDigest of [
    undefined,
    null,
    "",
    "sha256:wrong",
    TYMM_2024_CATALOG_METADATA.sourceSha256.toLocaleUpperCase("tr-TR"),
    ` ${TYMM_2024_CATALOG_METADATA.sourceSha256}`,
    `${TYMM_2024_CATALOG_METADATA.sourceSha256} `,
    TYMM_2024_CATALOG_METADATA.sourceSha256.replace("sha256:", "sha512:"),
  ]) {
    assert.equal(
      resolveTymmOfficialProgramAccessUrl(
        TYMM_OFFICIAL_PROGRAM_PDF_URL,
        unsafeDigest,
        275,
      ),
      null,
      String(unsafeDigest),
    );
  }

  assert.equal(
    resolveTymmOfficialProgramAccessUrl(
      TYMM_OFFICIAL_PROGRAM_PDF_URL,
      TYMM_2024_CATALOG_METADATA.sourceSha256,
      1,
    ),
    `${TYMM_OFFICIAL_PROGRAM_PDF_URL}#page=1`,
  );
  assert.equal(
    resolveTymmOfficialProgramAccessUrl(
      TYMM_OFFICIAL_PROGRAM_PDF_URL,
      TYMM_2024_CATALOG_METADATA.sourceSha256,
      TYMM_2024_CATALOG_METADATA.sourcePageCount,
    ),
    `${TYMM_OFFICIAL_PROGRAM_PDF_URL}#page=${TYMM_2024_CATALOG_METADATA.sourcePageCount}`,
  );

  for (const unsafeSourcePage of [
    null,
    "275",
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    TYMM_2024_CATALOG_METADATA.sourcePageCount + 1,
    Number.MAX_SAFE_INTEGER,
  ]) {
    assert.equal(
      resolveTymmOfficialProgramAccessUrl(
        TYMM_OFFICIAL_PROGRAM_PDF_URL,
        TYMM_2024_CATALOG_METADATA.sourceSha256,
        unsafeSourcePage,
      ),
      null,
      String(unsafeSourcePage),
    );
  }
});
