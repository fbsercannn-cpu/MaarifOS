import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDiscoveryDefinitions,
  canonicalizeMebUrl,
  compareFrameworkMenuEvidence,
  compareObservedOfficialTitles,
  countOfficialCollections,
  createFirstBaselineComparison,
  dedupeOfficialSourceReferences,
  diffExactIds,
  evaluateDiscoveryGet,
  evaluateHeadProbe,
  extractIndexedResourceIds,
  extractIndexedResourceRecords,
  extractSameAuthorityPathnames,
  flattenOfficialSources,
  normalizeOfficialTitle,
  parseJsonArrayCollection,
  parsePagedJsonCollection,
  parseArguments,
  resolveAuditOutputPath,
  renameReceiptWithBoundedWindowsRetry,
  runAudit,
  validateEndpointContracts,
  writeReceiptAtomically,
} from "../../scripts/audit-tymm-official-library.mjs";
import {
  TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES,
  TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS,
  TYMM_OFFICIAL_LIBRARY,
  TYMM_OFFICIAL_PRESCHOOL_VIDEOS,
} from "../../src/features/curriculum/tymm-official-library.ts";
import { TYMM_OFFICIAL_RESOURCE_CATALOG } from "../../src/features/curriculum/tymm-official-resource-catalog.ts";

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));

function fixtureCollections() {
  const availablePdf = {
    id: "program",
    title: "Program",
    materialKind: "program",
    scope: "preschool-direct",
    officialPageUrl: "https://tymm.meb.gov.tr/ogretim-programlari/ders/okul-oncesi/",
    pdfUrl: "https://tymm.meb.gov.tr/assets/pdf/program.pdf#page=3",
    accessStatus: "verified-available",
    verifiedByteSize: 123,
  };
  const unavailablePdf = {
    id: "broken-guide",
    title: "Kılavuz",
    materialKind: "teacher-guide",
    scope: "preschool-direct",
    officialPageUrl: "https://tymm.meb.gov.tr/kitap/2/kilavuz",
    pdfUrl: "https://tymm.meb.gov.tr/assets/pdf/broken.pdf",
    accessStatus: "official-pdf-unavailable",
  };
  const plan = {
    id: "plan-1",
    title: "Plan",
    url: "https://tymm.meb.gov.tr/okul-oncesi/unite/1",
    exampleKind: "daily-plan-example",
    ageBand: "36-48",
  };
  return {
    libraryResources: [availablePdf, unavailablePdf],
    commonFrameworkPages: [
      {
        id: "framework",
        scope: "shared-tymm-framework",
        officialRecord: {
          title: "İçerik Çerçevesi",
          url: "https://tymm.meb.gov.tr/icerik-cercevesi",
        },
      },
    ],
    preschoolVideos: [
      {
        id: "preschool-video",
        scope: "preschool-direct",
        videoKind: "training",
        officialRecord: {
          title: "Okul Öncesi Eğitim",
          url: "https://tymm.meb.gov.tr/videolar/okul-oncesi/1",
        },
      },
    ],
    generalEducationVideos: [
      {
        id: "general-video",
        scope: "shared-tymm-framework",
        videoKind: "training",
        officialRecord: {
          title: "Ortak Eğitim",
          url: "https://tymm.meb.gov.tr/videolar/ortak/2",
        },
      },
    ],
    resourceCatalog: {
      landingPage: {
        id: "landing",
        title: "Program",
        materialKind: "official-reference",
        url: "https://tymm.meb.gov.tr/ogretim-programlari/ders/okul-oncesi",
      },
      programPdf: {
        id: "program-pdf",
        title: "Program",
        materialKind: "official-reference",
        url: "https://tymm.meb.gov.tr/assets/pdf/program.pdf",
      },
      agePages: [
        {
          id: "age-1",
          title: "36–48 ay",
          materialKind: "official-reference",
          ageBand: "36-48",
          url: "https://tymm.meb.gov.tr/ogretim-programlari/okul-oncesi/1",
          examples: [plan],
        },
      ],
    },
  };
}

test("flatten ve dedupe aynı kanonik sayfa/PDF'yi tek uçta kaynak izleriyle birleştirir", () => {
  const collections = fixtureCollections();
  const references = flattenOfficialSources(collections);
  const endpoints = dedupeOfficialSourceReferences(references);

  assert.equal(references.length, 11);
  assert.equal(endpoints.length, 9);
  assert.equal(
    canonicalizeMebUrl("https://tymm.meb.gov.tr/assets/pdf/program.pdf#page=20"),
    "https://tymm.meb.gov.tr/assets/pdf/program.pdf",
  );
  assert.equal(
    canonicalizeMebUrl("https://tymm.meb.gov.tr/ogretim-programlari/ders/okul-oncesi/"),
    "https://tymm.meb.gov.tr/ogretim-programlari/ders/okul-oncesi",
  );

  const programPdf = endpoints.find(
    (endpoint) => endpoint.canonicalUrl === "https://tymm.meb.gov.tr/assets/pdf/program.pdf",
  );
  assert.equal(programPdf.references.length, 2);
  assert.equal(programPdf.expectedByteSize, 123);
  assert.throws(
    () => canonicalizeMebUrl("https://example.org/program.pdf"),
    /resmî TYMM HTTPS/u,
  );
});

test("koleksiyon sayımları PDF, video, ortak çerçeve, yaş ve plan kapsamını ayırır", () => {
  const collections = fixtureCollections();
  const references = flattenOfficialSources(collections);
  const endpoints = dedupeOfficialSourceReferences(references);
  assert.deepEqual(
    countOfficialCollections({
      ...collections,
      sourceReferenceCount: references.length,
      uniqueCanonicalUrlCount: endpoints.length,
    }),
    {
      sourceReferences: 11,
      uniqueCanonicalUrls: 9,
      pdf: { total: 2, available: 1, unavailable: 1 },
      directPreschoolVideos: 1,
      commonFrameworkPages: 1,
      commonFrameworkTrainingVideos: 1,
      trainingVideosTotal: 2,
      agePages: 1,
      planExamples: 1,
      derivedCounts: {
        teacherBooksAndGuides: {
          value: 1,
          formula: "teacherGuidePdfCount + activityBookPdfCount",
          arithmetic: "1 + 0 = 1",
          components: { teacherGuidePdfCount: 1, activityBookPdfCount: 0 },
        },
        pagesAndVideos: {
          value: 3,
          formula:
            "commonFrameworkPages + directPreschoolVideos + commonFrameworkTrainingVideos",
          arithmetic: "1 + 1 + 1 = 3",
          components: {
            commonFrameworkPages: 1,
            directPreschoolVideos: 1,
            commonFrameworkTrainingVideos: 1,
          },
        },
        trainingVideosTotal: {
          value: 2,
          formula: "directPreschoolTrainingVideos + commonFrameworkTrainingVideos",
          arithmetic: "1 + 1 = 2",
          components: {
            directPreschoolTrainingVideos: 1,
            commonFrameworkTrainingVideos: 1,
          },
        },
      },
    },
  );
});

test("canlı katalog türev sayımları 17 kitap, 47 sayfa/video ve 12 eğitim videosu evrenini karıştırmaz", () => {
  const counts = countOfficialCollections({
    libraryResources: TYMM_OFFICIAL_LIBRARY,
    commonFrameworkPages: TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES,
    preschoolVideos: TYMM_OFFICIAL_PRESCHOOL_VIDEOS,
    generalEducationVideos: TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS,
    resourceCatalog: TYMM_OFFICIAL_RESOURCE_CATALOG,
  });
  assert.deepEqual(counts.derivedCounts.teacherBooksAndGuides, {
    value: 17,
    formula: "teacherGuidePdfCount + activityBookPdfCount",
    arithmetic: "8 + 9 = 17",
    components: { teacherGuidePdfCount: 8, activityBookPdfCount: 9 },
  });
  assert.deepEqual(counts.derivedCounts.pagesAndVideos, {
    value: 47,
    formula: "commonFrameworkPages + directPreschoolVideos + commonFrameworkTrainingVideos",
    arithmetic: "21 + 15 + 11 = 47",
    components: {
      commonFrameworkPages: 21,
      directPreschoolVideos: 15,
      commonFrameworkTrainingVideos: 11,
    },
  });
  assert.deepEqual(counts.derivedCounts.trainingVideosTotal, {
    value: 12,
    formula: "directPreschoolTrainingVideos + commonFrameworkTrainingVideos",
    arithmetic: "1 + 11 = 12",
    components: {
      directPreschoolTrainingVideos: 1,
      commonFrameworkTrainingVideos: 11,
    },
  });
  assert.notEqual(counts.derivedCounts.pagesAndVideos.value, counts.trainingVideosTotal);
  assert.notEqual(counts.derivedCounts.teacherBooksAndGuides.value, counts.pdf.total);
});

test("sözleşme doğrulaması erişilebilir PDF boyutunu ve beklenen erişimsiz sayısını ağsız denetler", () => {
  const endpoints = dedupeOfficialSourceReferences(
    flattenOfficialSources(fixtureCollections()),
  );
  assert.deepEqual(
    validateEndpointContracts(endpoints, { expectedUnavailablePdfCount: 1 }),
    [],
  );

  const missingSize = endpoints.map((endpoint) =>
    endpoint.expectedKind === "pdf" && endpoint.expectedAvailability === "available"
      ? { ...endpoint, expectedByteSize: null }
      : endpoint,
  );
  assert.equal(
    validateEndpointContracts(missingSize, { expectedUnavailablePdfCount: 1 })[0].code,
    "PDF_EXPECTED_BYTE_SIZE_MISSING",
  );
});

test("HEAD değerlendirmesi beklenen 500'ü hata saymaz, PDF boyut sapmasını kanıtlar", () => {
  const endpoints = dedupeOfficialSourceReferences(
    flattenOfficialSources(fixtureCollections()),
  );
  const broken = endpoints.find(
    (endpoint) => endpoint.expectedAvailability === "expected-unavailable",
  );
  const available = endpoints.find(
    (endpoint) =>
      endpoint.expectedKind === "pdf" && endpoint.expectedAvailability === "available",
  );

  const expectedUnavailable = evaluateHeadProbe(broken, {
    status: 500,
    contentType: null,
    contentLength: "0",
    etag: null,
    lastModified: null,
    finalUrl: broken.canonicalUrl,
  });
  assert.equal(expectedUnavailable.verificationStatus, "expected-unavailable");
  assert.deepEqual(expectedUnavailable.errors, []);

  const exact = evaluateHeadProbe(available, {
    status: 200,
    contentType: "application/pdf",
    contentLength: "123",
    etag: '"abc"',
    lastModified: "Sun, 01 Sep 2024 09:10:17 GMT",
    finalUrl: available.canonicalUrl,
  });
  assert.equal(exact.verificationStatus, "verified");
  assert.deepEqual(exact.errors, []);
  assert.equal(exact.head.contentLength, 123);

  const mismatch = evaluateHeadProbe(available, {
    status: 200,
    contentType: "application/pdf",
    contentLength: "124",
    finalUrl: available.canonicalUrl,
  });
  assert.equal(mismatch.verificationStatus, "byte-size-mismatch");
  assert.equal(mismatch.errors[0].code, "PDF_BYTE_SIZE_MISMATCH");
});

test("ağ hatası makbuz sonucuna taşınır ve başarısızlık üretir", () => {
  const [endpoint] = dedupeOfficialSourceReferences(
    flattenOfficialSources(fixtureCollections()),
  );
  const result = evaluateHeadProbe(endpoint, {
    status: null,
    finalUrl: null,
    networkError: "TimeoutError: zaman aşımı",
    attempts: 3,
  });
  assert.equal(result.verificationStatus, "network-error");
  assert.equal(result.errors[0].code, "NETWORK_ERROR");
  assert.equal(result.head.attempts, 3);
});

test("closed-world tanımı ana menü ve altı katalog ekiyle 36 resmî GET yüzeyini kapsar", () => {
  const definitions = buildDiscoveryDefinitions();
  assert.equal(definitions.length, 36);
  assert.equal(new Set(definitions.map((definition) => definition.requestId)).size, 36);
  assert.equal(definitions[0].requestId, "main-navigation-shell");
  assert.equal(definitions[0].url, "https://tymm.meb.gov.tr/");
  assert.equal(
    definitions.filter(
      (definition) => definition.category === "catalog-only-direct-official-page",
    ).length,
    6,
  );
  assert.ok(
    definitions.every(
      (definition) => new URL(definition.url).hostname === "tymm.meb.gov.tr",
    ),
  );
  assert.equal(
    definitions.filter((definition) => definition.exactEmptyCollection).length,
    6,
  );
  assert.deepEqual(
    definitions
      .filter((definition) => definition.requestId.startsWith("plans-by-age-"))
      .map((definition) => definition.expectedSelectedIds),
    [
      [443, 442, 482, 444],
      [446, 445, 483, 453],
      [480, 479, 484, 481],
    ],
  );
});

test("JSON ve HTML keşif ayrıştırıcıları toplamı, sırayı ve tekil kimlikleri korur", () => {
  const paged = parsePagedJsonCollection(
    Buffer.from(
      JSON.stringify({
        items: [
          { id: 31, dersAdi: "Beden Eğitimi" },
          { id: 26, dersAdi: "Okul Öncesi" },
        ],
        page: 2,
        pageSize: 20,
        totalCount: 33,
        totalPages: 2,
        hasMore: false,
      }),
    ),
  );
  assert.deepEqual(paged.allIds, [31, 26]);
  assert.equal(paged.totalCount, 33);
  assert.equal(paged.page, 2);

  const array = parseJsonArrayCollection(
    Buffer.from(JSON.stringify([{ id: 443 }, { id: 442 }, { id: 482 }, { id: 444 }])),
  );
  assert.deepEqual(array.allIds, [443, 442, 482, 444]);
  assert.equal(array.totalCount, 4);

  const html = Buffer.from(`
    <a href="/dokuman/16/temel-yaklasim">A</a>
    <a href="/dokuman/17/deger">B</a>
    <a href="/dokuman/16/temel-yaklasim">A tekrar</a>
    <a href="/videolar/okul-oncesi/134">Video</a>
  `);
  assert.deepEqual(extractIndexedResourceIds(html, "document"), [16, 17]);
  assert.deepEqual(extractIndexedResourceIds(html, "video"), [134]);
  assert.throws(
    () => parsePagedJsonCollection(Buffer.from('{"items":[]}')),
    /page alanı geçersiz/u,
  );
});

test("MEB gövdesindeki kitap ve video başlıkları NFKC/boşluk/tr-TR kanıtıyla korunur", () => {
  assert.equal(
    normalizeOfficialTitle("  O\u0308ĞRETİM\u00a0\n PROGRAMI  "),
    normalizeOfficialTitle("ÖĞRETİM PROGRAMI"),
  );

  const videoHtml = Buffer.from(`
    <a href="/videolar/okul-oncesi-ogretim-programi/134">
      <img alt="Okul Öncesi Öğretim Programı">
      <h4 class="card-title"> Okul   Öncesi Öğretim Programı </h4>
    </a>
  `);
  assert.deepEqual(extractIndexedResourceRecords(videoHtml, "video"), [
    {
      id: 134,
      officialRecordUrl:
        "https://tymm.meb.gov.tr/videolar/okul-oncesi-ogretim-programi/134",
      titleEvidence: [
        {
          value: "Okul Öncesi Öğretim Programı",
          observedFrom: "MEB-index-.card-title",
        },
        {
          value: "Okul Öncesi Öğretim Programı",
          observedFrom: "MEB-index-img[alt]",
        },
      ],
    },
  ]);

  const bookDefinition = buildDiscoveryDefinitions().find(
    (candidate) => candidate.requestId === "books-by-age-36-48",
  );
  const bookResult = evaluateDiscoveryGet(
    { ...bookDefinition, expectedSelectedIds: [9], expectedTotalCount: 1 },
    {
      status: 200,
      contentType: "application/json",
      rawBody: Buffer.from('[{"id":9,"title":"3 Yaş Çekirdek 1 Etkinlik Kitabı"}]'),
      finalUrl: bookDefinition.url,
    },
  );
  assert.deepEqual(bookResult.parsed.selectedTitleRecords, [
    {
      id: 9,
      officialRecordUrl: null,
      titleEvidence: [
        {
          value: "3 Yaş Çekirdek 1 Etkinlik Kitabı",
          observedFrom: "MEB-API-record.title",
        },
      ],
    },
  ]);
});

test("başlık sapması kaynak erişim hatası değil ayrı REVIEW_REQUIRED kapısıdır", () => {
  const comparison = compareObservedOfficialTitles(
    "direct-preschool-video-official-titles",
    [
      {
        id: 134,
        catalogOfficialTitle: "Okul Öncesi Öğretim Programı Tanıtım Videosu",
        catalogTitleOrigin: "application-catalog-declared-MEB-official",
      },
    ],
    [
      {
        id: 134,
        titleEvidence: [
          {
            value: "Okul Öncesi Öğretim Programı",
            observedFrom: "MEB-index-.card-title",
          },
        ],
      },
    ],
  );
  assert.equal(comparison.result, "REVIEW_REQUIRED");
  assert.equal(comparison.records[0].observedExactTitle, "Okul Öncesi Öğretim Programı");
  assert.equal(comparison.reviews[0].code, "OFFICIAL_TITLE_REVIEW_REQUIRED");
  assert.equal("errors" in comparison, false);
});

test("ilk baseline önceki onaylı makbuz olmadan drift-yok iddiası üretmez", () => {
  assert.deepEqual(createFirstBaselineComparison(), {
    status: "not-compared-first-baseline",
    previousApprovedReceipt: null,
    baselineReceiptSha256: null,
    driftCompared: false,
    driftFree: null,
    comparedFields: [],
    limitation:
      "Onaylı önceki makbuz sağlanmadı; bu koşumda kaynak, keşif evreni veya gövde hashleri için drift-yok iddiası üretilmez.",
  });
});

test("kimlik farkı küme ve gerekli olduğunda sıra sapmasını fail-closed gösterir", () => {
  assert.deepEqual(diffExactIds([1, 2, 3], [1, 3, 4]), {
    matches: false,
    missing: [2],
    extra: [4],
    duplicates: [],
    orderMismatch: false,
  });
  assert.deepEqual(diffExactIds([1, 2, 3], [3, 2, 1], { ordered: true }), {
    matches: false,
    missing: [],
    extra: [],
    duplicates: [],
    orderMismatch: true,
  });
  assert.equal(diffExactIds([1, 2, 3], [3, 2, 1]).matches, true);
});

test("GET değerlendirmesi ham gövde kanıtını ve seçilen/toplam sayısını ağsız üretir", () => {
  const definition = buildDiscoveryDefinitions().find(
    (candidate) => candidate.requestId === "courses-by-age-36-48",
  );
  const rawBody = Buffer.from(
    JSON.stringify([{ id: 26, dersAdi: "Okul Öncesi", kademe: 2 }]),
  );
  const result = evaluateDiscoveryGet(definition, {
    status: 200,
    contentType: "application/json; charset=utf-8",
    rawBody,
    finalUrl: definition.url,
    attempts: 1,
  });
  assert.equal(result.verificationStatus, "verified");
  assert.equal(result.get.rawBodyBytes, rawBody.length);
  assert.match(result.get.rawBodySha256, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(result.parsed.totalCount, 1);
  assert.equal(result.parsed.selectedCount, 1);
  assert.deepEqual(result.parsed.selectedIds, [26]);
  assert.deepEqual(result.errors, []);
});

test("boş olması gereken farklılaştırma/materyal uçları kayıt döndürürse kapalı kalır", () => {
  const definition = buildDiscoveryDefinitions().find(
    (candidate) => candidate.requestId === "differentiation-by-age-36-48",
  );
  const empty = evaluateDiscoveryGet(definition, {
    status: 200,
    contentType: "application/json; charset=utf-8",
    rawBody: Buffer.from("[]"),
    finalUrl: definition.url,
  });
  assert.equal(empty.verificationStatus, "verified");
  assert.equal(empty.parsed.exactEmptyCollection, true);
  assert.equal(empty.parsed.totalCount, 0);

  const unexpected = evaluateDiscoveryGet(definition, {
    status: 200,
    contentType: "application/json; charset=utf-8",
    rawBody: Buffer.from('[{"id":999}]'),
    finalUrl: definition.url,
  });
  assert.equal(unexpected.verificationStatus, "failed");
  assert.ok(
    unexpected.errors.some(
      (error) => error.code === "DISCOVERY_EXPECTED_EMPTY_COLLECTION_NOT_EMPTY",
    ),
  );
  assert.ok(
    unexpected.errors.some((error) => error.code === "DISCOVERY_TOTAL_COUNT_MISMATCH"),
  );
});

test("ana menü alt kümesi katalogda tam ise katalog eki bilgilendirici kalır, menü fazlası bloklar", () => {
  const html = Buffer.from(`
    <nav>
      <a href="/icerik-cercevesi">İçerik</a>
      <a href="/beceriler/kavramsal-beceriler?view=wide">Kavramsal</a>
      <a href="/beceriler/yeni-ortak-beceri">Yeni ortak beceri</a>
      <a href="https://example.org/beceriler/dis-kaynak">Dış kaynak</a>
      <a href="/icerik-cercevesi#tekrar">Tekrar</a>
    </nav>
  `);
  const pathnames = extractSameAuthorityPathnames(html);
  assert.deepEqual(pathnames, [
    "/icerik-cercevesi",
    "/beceriler/kavramsal-beceriler",
    "/beceriler/yeni-ortak-beceri",
  ]);

  const catalogPathnames = [
    "/icerik-cercevesi",
    "/beceriler/kavramsal-beceriler",
    "/ogrenme-ciktilari-cercevesi",
  ];
  const withoutUnexpectedMenuPath = pathnames.filter(
    (pathname) => pathname !== "/beceriler/yeni-ortak-beceri",
  );
  const informational = compareFrameworkMenuEvidence(
    withoutUnexpectedMenuPath,
    catalogPathnames,
    ["/ogrenme-ciktilari-cercevesi"],
  );
  assert.equal(informational.matches, true);
  assert.deepEqual(informational.menuEvidencePathnames, [
    "/icerik-cercevesi",
    "/beceriler/kavramsal-beceriler",
  ]);
  assert.deepEqual(informational.missingFromCatalog, []);
  assert.deepEqual(informational.catalogOnlyDirectOfficialPathnames, [
    "/ogrenme-ciktilari-cercevesi",
  ]);
  assert.equal(informational.catalogOnlyStatus, "informational-declared-direct-official-pages");
  assert.deepEqual(informational.errors, []);

  const unexpectedMenuPath = compareFrameworkMenuEvidence(
    pathnames,
    catalogPathnames,
    ["/ogrenme-ciktilari-cercevesi"],
  );
  assert.equal(unexpectedMenuPath.matches, false);
  assert.deepEqual(unexpectedMenuPath.missingFromCatalog, [
    "/beceriler/yeni-ortak-beceri",
  ]);
  assert.deepEqual(
    unexpectedMenuPath.errors.map((error) => error.code),
    ["COMMON_FRAMEWORK_MISSING_FROM_CATALOG"],
  );
});

test("beyanlı katalog eki doğrudan GET ile doğrulanır, boş HTML gövdesi sert hata olur", () => {
  const definition = buildDiscoveryDefinitions().find(
    (candidate) =>
      candidate.requestId === "catalog-only-framework-ogrenme-ciktilari-cercevesi",
  );
  const verified = evaluateDiscoveryGet(definition, {
    status: 200,
    contentType: "text/html; charset=utf-8",
    rawBody: Buffer.from("<!doctype html><title>Öğrenme Çıktıları Çerçevesi</title>"),
    finalUrl: definition.url,
  });
  assert.equal(verified.verificationStatus, "verified");
  assert.equal(verified.parsed.totalCount, 1);
  assert.deepEqual(verified.parsed.selectedPathnames, [
    "/ogrenme-ciktilari-cercevesi",
  ]);

  const empty = evaluateDiscoveryGet(definition, {
    status: 200,
    contentType: "text/html; charset=utf-8",
    rawBody: Buffer.alloc(0),
    finalUrl: definition.url,
  });
  assert.equal(empty.verificationStatus, "failed");
  assert.ok(
    empty.errors.some((error) => error.code === "DISCOVERY_EMPTY_RESPONSE_BODY"),
  );
});

test("--output yalnız APP_ROOT altındaki bir makbuz dosyasını kabul eder", () => {
  const relativeOutput = "tmp/tymm-audit-path/receipt.json";
  const expectedOutput = path.resolve(APP_ROOT, relativeOutput);
  assert.equal(resolveAuditOutputPath(relativeOutput), expectedOutput);
  assert.equal(parseArguments(["--output", relativeOutput]).output, expectedOutput);

  for (const outsidePath of [
    "../outside-receipt.json",
    path.resolve(APP_ROOT, "..", "outside-absolute-receipt.json"),
  ]) {
    assert.throws(
      () => parseArguments(["--output", outsidePath]),
      /APP_ROOT altında bir dosya/u,
    );
  }
  assert.throws(() => resolveAuditOutputPath("."), /APP_ROOT altında bir dosya/u);
});

test("başarısız ağ/ayrıştırma üretimi mevcut makbuzu overwrite kipinde de korur", async () => {
  const temporaryRoot = path.join(APP_ROOT, "tmp");
  await mkdir(temporaryRoot, { recursive: true });
  const fixtureRoot = await mkdtemp(path.join(temporaryRoot, "tymm-audit-build-failure-"));
  const outputPath = path.join(fixtureRoot, "receipt.json");
  const previousReceipt = '{"result":"PREVIOUS-PASS"}\n';
  await writeFile(outputPath, previousReceipt, "utf8");
  let writeWasCalled = false;

  try {
    await assert.rejects(
      () =>
        runAudit(
          { output: outputPath, overwrite: true },
          {
            buildReceiptImpl: async () => {
              throw new Error("simulated discovery parse failure");
            },
            writeReceiptImpl: async () => {
              writeWasCalled = true;
            },
          },
        ),
      /simulated discovery parse failure/u,
    );
    assert.equal(writeWasCalled, false);
    assert.equal(await readFile(outputPath, "utf8"), previousReceipt);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("makbuz fsync edilen kardeş temp dosyadan atomik değiştirilir ve artık bırakmaz", async () => {
  const temporaryRoot = path.join(APP_ROOT, "tmp");
  await mkdir(temporaryRoot, { recursive: true });
  const fixtureRoot = await mkdtemp(path.join(temporaryRoot, "tymm-audit-atomic-"));
  const outputPath = path.join(fixtureRoot, "receipt.json");
  const freshOutputPath = path.join(fixtureRoot, "fresh-receipt.json");
  await writeFile(outputPath, '{"version":1}\n', "utf8");

  try {
    await writeReceiptAtomically(freshOutputPath, { version: 1 });
    assert.deepEqual(JSON.parse(await readFile(freshOutputPath, "utf8")), { version: 1 });

    await writeReceiptAtomically(outputPath, { version: 2 }, { overwrite: true });
    assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), { version: 2 });
    assert.deepEqual(
      (await readdir(fixtureRoot)).filter((entry) => entry.endsWith(".tmp")),
      [],
    );

    await assert.rejects(
      () => writeReceiptAtomically(outputPath, { version: 3 }),
      /Makbuz zaten var/u,
    );
    assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), { version: 2 });
    assert.deepEqual(
      (await readdir(fixtureRoot)).filter((entry) => entry.endsWith(".tmp")),
      [],
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("Windows geçici EPERM paylaşım kilidi sınırlı bütçede aynı atomik rename ile aşılır", async () => {
  const waits = [];
  let attempts = 0;
  const transient = Object.assign(new Error("simulated Windows sharing violation"), { code: "EPERM" });
  const fileStat = { isFile: () => true };
  const result = await renameReceiptWithBoundedWindowsRetry("source.tmp", "receipt.json", {
    platform: "win32",
    renameImpl: async () => {
      attempts += 1;
      if (attempts < 3) throw transient;
    },
    statImpl: async () => fileStat,
    waitImpl: async (milliseconds) => { waits.push(milliseconds); },
  });
  assert.deepEqual(result, { attempts: 3, retryCount: 2 });
  assert.deepEqual(waits, [10, 20]);
});

test("Windows kalıcı EPERM son hatayı gizlemez ve eski hedefi silerek aşmaz", async () => {
  let attempts = 0;
  let statCalls = 0;
  const persistent = Object.assign(new Error("persistent Windows sharing violation"), { code: "EPERM" });
  const fileStat = { isFile: () => true };
  await assert.rejects(
    () => renameReceiptWithBoundedWindowsRetry("source.tmp", "receipt.json", {
      platform: "win32",
      renameImpl: async () => { attempts += 1; throw persistent; },
      statImpl: async () => { statCalls += 1; return fileStat; },
      waitImpl: async () => undefined,
    }),
    (error) => error === persistent,
  );
  assert.equal(attempts, 8);
  assert.equal(statCalls, 14);
});
