import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES,
  TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS,
  TYMM_OFFICIAL_LIBRARY,
  TYMM_OFFICIAL_LIBRARY_SCHEMA_VERSION,
  TYMM_OFFICIAL_PRESCHOOL_VIDEOS,
  canEmbedTymmOfficialLibraryResource,
  listTymmOfficialLibraryResources,
  recommendTymmOfficialLibraryResources,
  tymmDomainToOfficialLibraryArea,
} from "../../src/features/curriculum/tymm-official-library.ts";

const panelSource = readFileSync(
  new URL("../../src/features/curriculum/TymmOfficialLibraryPanel.tsx", import.meta.url),
  "utf8",
);
const panelStyles = readFileSync(
  new URL("../../src/features/curriculum/tymm-official-library.css", import.meta.url),
  "utf8",
);
const planWorkspaceSource = readFileSync(
  new URL(
    "../../src/features/simple-experience/SimplePlanWorkspaceScreen.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("resmî okul öncesi PDF kütüphanesi tam kaynak kümelerini ve erişim gerçeğini taşır", () => {
  assert.equal(TYMM_OFFICIAL_LIBRARY_SCHEMA_VERSION, 1);
  assert.equal(TYMM_OFFICIAL_LIBRARY.length, 38);

  const counts = Object.groupBy(
    TYMM_OFFICIAL_LIBRARY,
    (resource) => resource.materialKind,
  );
  assert.equal(counts.program?.length, 1);
  assert.equal(counts["teacher-guide"]?.length, 8);
  assert.equal(counts["activity-book"]?.length, 9);
  assert.equal(counts["program-literacy-guide"]?.length, 7);
  assert.equal(counts["parent-guide"]?.length, 1);
  assert.equal(counts.brochure?.length, 6);
  assert.equal(counts.report?.length, 5);
  assert.equal(counts["common-text"]?.length, 1);

  const unavailable = TYMM_OFFICIAL_LIBRARY.filter(
    (resource) => resource.accessStatus === "official-pdf-unavailable",
  );
  assert.deepEqual(
    unavailable.map((resource) => resource.id),
    [
      "teacher-guide-social",
      "teacher-guide-social-emotional-values",
      "teacher-guide-art",
    ],
  );
  assert.equal(
    TYMM_OFFICIAL_LIBRARY.filter(
      (resource) => resource.accessStatus === "verified-available",
    ).length,
    35,
  );
  assert.ok(unavailable.every((resource) => !canEmbedTymmOfficialLibraryResource(resource)));
  assert.ok(
    TYMM_OFFICIAL_LIBRARY.filter(
      (resource) => resource.accessStatus === "verified-available",
    ).every(canEmbedTymmOfficialLibraryResource),
  );
});

test("her resmî PDF MEB alanında, salt kaynak bağlantısı ve ayrı sunum metadata'sı olarak kalır", () => {
  for (const resource of TYMM_OFFICIAL_LIBRARY) {
    for (const value of [resource.officialPageUrl, resource.pdfUrl]) {
      const url = new URL(value);
      assert.equal(url.protocol, "https:");
      assert.equal(url.hostname, "tymm.meb.gov.tr");
    }
    assert.equal(resource.contentOrigin, "MEB-official");
    assert.equal(resource.accessMode, "external-link");
    assert.equal(resource.republishMode, "link-only");
    assert.equal(resource.importable, false);
    assert.deepEqual(resource.metadataOrigin, {
      title: "MEB-official",
      description: "MaarifOS-editorial-summary",
      ageBands:
        resource.materialKind === "parent-guide"
          ? "unverified"
          : ["program", "teacher-guide", "activity-book"].includes(resource.materialKind)
            ? "MEB-official-title-or-document-text"
            : "MaarifOS-editorial-applicability",
      areas: "MaarifOS-editorial-classification",
      scope: "MaarifOS-editorial-classification",
    });
    assert.ok(Object.isFrozen(resource));
  }
});

test("yayıncı yaş etiketi, PDF içi yaş doğrulaması ve temel eğitim belirsizliği ayrıdır", () => {
  const teacherGuides = TYMM_OFFICIAL_LIBRARY.filter(
    (resource) => resource.materialKind === "teacher-guide",
  );
  assert.ok(teacherGuides.every((resource) => resource.publisherAgeLabel === "36–48 ay"));
  assert.equal(
    teacherGuides.filter((resource) => resource.contentVerifiedAgeBands?.length === 3).length,
    5,
  );
  assert.equal(
    teacherGuides.filter((resource) => resource.contentVerifiedAgeBands?.length === 0).length,
    3,
  );
  const parentGuide = TYMM_OFFICIAL_LIBRARY.find(
    (resource) => resource.materialKind === "parent-guide",
  );
  assert.deepEqual(parentGuide?.ageBands, []);
  assert.equal(parentGuide?.scope, "basic-education-unverified-for-preschool");
  assert.equal(
    parentGuide?.scopeLabel,
    "Temel eğitim geneli · okul öncesi uygulanırlığı belgelenmedi",
  );
  assert.ok(
    !recommendTymmOfficialLibraryResources({ ageBand: null, limit: 12 }).some(
      (resource) => resource.id === parentGuide?.id,
    ),
  );
  assert.ok(
    recommendTymmOfficialLibraryResources({ ageBand: null, limit: 12 }).every(
      (resource) =>
        resource.materialKind !== "activity-book" &&
        resource.materialKind !== "teacher-guide",
    ),
  );
});

test("yaş, tür, alan ve Türkçe arama filtreleri resmî kaynakları daraltır", () => {
  assert.deepEqual(
    listTymmOfficialLibraryResources({
      ageBand: "36-48",
      materialKind: "activity-book",
    }).map((resource) => resource.id),
    ["activity-book-9", "activity-book-10"],
  );
  assert.deepEqual(
    listTymmOfficialLibraryResources({
      ageBand: "48-60",
      materialKind: "activity-book",
    }).map((resource) => resource.id),
    ["activity-book-11", "activity-book-12", "activity-book-13"],
  );
  assert.deepEqual(
    listTymmOfficialLibraryResources({
      area: "mathematics",
      availableOnly: true,
    }).map((resource) => resource.id),
    ["teacher-guide-mathematics"],
  );
  assert.ok(
    listTymmOfficialLibraryResources({ query: "ölçme değerlendirme" }).some(
      (resource) => resource.id === "program-literacy-5",
    ),
  );
  assert.ok(
    listTymmOfficialLibraryResources({ query: "bütüncül eğitim" }).some(
      (resource) => resource.id === "brochure-19",
    ),
  );
  assert.ok(
    listTymmOfficialLibraryResources({ query: "saglik" }).some(
      (resource) => resource.id === "teacher-guide-movement-health",
    ),
  );
  assert.ok(
    listTymmOfficialLibraryResources({ query: "kilavuz" }).length > 0,
  );
  assert.ok(
    listTymmOfficialLibraryResources({ query: "farklilastirma" }).some(
      (resource) => resource.id === "program-literacy-7",
    ),
  );
});

test("plan önerileri yaşa ve alana göre kaynak katmanı sunar, içeriği içe aktarmaz", () => {
  const ageRecommendations = recommendTymmOfficialLibraryResources({
    ageBand: "36-48",
    limit: 4,
  });
  assert.deepEqual(
    ageRecommendations.slice(0, 2).map((resource) => resource.id),
    ["activity-book-9", "activity-book-10"],
  );
  assert.ok(ageRecommendations.some((resource) => resource.materialKind === "program"));
  assert.ok(ageRecommendations.every((resource) => resource.importable === false));

  const areaRecommendations = recommendTymmOfficialLibraryResources({
    ageBand: "60-72",
    area: "science",
    limit: 2,
  });
  assert.equal(areaRecommendations[0]?.id, "teacher-guide-science");
});

test("planın ilk resmî öğrenme alanı deterministik kütüphane alanına çevrilir", () => {
  assert.deepEqual(
    ["Türkçe", "Sosyal", "Sanat", "Müzik", "Matematik", "Hareket ve Sağlık", "Fen"].map(
      tymmDomainToOfficialLibraryArea,
    ),
    [
      "turkish",
      "social",
      "art",
      "music",
      "mathematics",
      "movement-health",
      "science",
    ],
  );
  assert.equal(tymmDomainToOfficialLibraryArea("Türkçe alanı"), undefined);
  assert.equal(tymmDomainToOfficialLibraryArea(null), undefined);
  assert.match(
    planWorkspaceSource,
    /tymmDomainToOfficialLibraryArea\(\s*orchestratedDay\?\.learningDomains\[0\],?\s*\)/u,
  );
  assert.match(
    planWorkspaceSource,
    /<TymmOfficialLibraryPanel[\s\S]{0,140}contextArea=\{officialLibraryContextArea\}/u,
  );
});

test("ortak çerçeve sayfaları ve okul öncesi videoları eksiksiz resmî liste taşır", () => {
  assert.equal(TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES.length, 21);
  assert.equal(TYMM_OFFICIAL_PRESCHOOL_VIDEOS.length, 15);
  assert.equal(TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS.length, 11);
  assert.deepEqual(
    TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES.slice(0, 5).map(
      (page) => page.officialRecord.title,
    ),
    [
      "İçerik Çerçevesi",
      "Kavramsal Beceriler",
      "Fiziksel Beceriler",
      "Eğilimler",
      "Alan Becerileri",
    ],
  );
  assert.ok(
    TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES.every(
      (page) =>
        page.scope === "shared-tymm-framework" &&
        page.classificationOrigin === "MaarifOS-editorial-applicability" &&
        page.officialRecord.contentOrigin === "MEB-official" &&
        page.presentation.summaryOrigin === "MaarifOS-editorial-summary",
    ),
  );
  assert.equal(
    TYMM_OFFICIAL_PRESCHOOL_VIDEOS.at(-1)?.officialRecord.url,
    "https://tymm.meb.gov.tr/videolar/okul-oncesi-ornek-uygulama-videosu-12/291",
  );
  assert.ok(
    TYMM_OFFICIAL_PRESCHOOL_VIDEOS.filter(
      (video) => video.videoKind === "classroom-example",
    ).every(
      (video) =>
        video.ageBands.length === 0 &&
        video.presentationAgeLabel ===
          "Okul öncesi · yaş bandı belirtilmemiş · örnek uygulama",
    ),
  );
  assert.deepEqual(
    TYMM_OFFICIAL_PRESCHOOL_VIDEOS.slice(0, 2).map(
      (video) => video.officialRecord.title,
    ),
    ["Okul Öncesi Öğretim Programı", "Okul Öncesi Eğitim Programı"],
  );
  assert.equal(
    TYMM_OFFICIAL_PRESCHOOL_VIDEOS.find(
      (video) => video.videoKind === "classroom-example",
    )?.officialRecord.title,
    "Okul Öncesi Örnek Uygulama Videosu-1",
  );
  assert.ok(
    [...TYMM_OFFICIAL_PRESCHOOL_VIDEOS, ...TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS].every(
      (video) => video.presentationOrigin === "MaarifOS-editorial-classification",
    ),
  );
  assert.equal(
    TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS[0]?.officialRecord.url,
    "https://tymm.meb.gov.tr/videolar/erdem-deger-eylem-cercevesi/197",
  );
  assert.equal(
    TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS.at(-1)?.officialRecord.url,
    "https://tymm.meb.gov.tr/videolar/modul-4/207",
  );
  assert.ok(
    [
      ...TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES,
      ...TYMM_OFFICIAL_PRESCHOOL_VIDEOS,
      ...TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS,
    ].every(
      (resource) =>
        new URL(resource.officialRecord.url).hostname === "tymm.meb.gov.tr" &&
        resource.officialRecord.importable === false,
    ),
  );
});

test("uygulama içi okuyucu doğrulanmış PDF'yi gömer ve hata yedeklerini her zaman sunar", () => {
  assert.match(
    planWorkspaceSource,
    /<TymmOfficialLibraryPanel[\s\S]{0,140}ageBand=\{ageBand\}[\s\S]{0,140}\/>/u,
  );
  assert.match(panelSource, /<iframe/u);
  assert.match(panelSource, /referrerPolicy="no-referrer"/u);
  assert.doesNotMatch(panelSource, /<iframe[^>]*\ssandbox(?:=|\s|>)/u);
  assert.match(panelSource, /rel="noopener noreferrer"/u);
  assert.match(panelSource, /canEmbedTymmOfficialLibraryResource\(resource\)/u);
  assert.match(panelSource, /src=\{`\$\{resource\.pdfUrl\}#view=FitH`\}/u);
  assert.match(panelSource, /PDF’yi aç \/ indir/u);
  assert.match(panelSource, /MEB sayfası/u);
  assert.match(panelSource, /Resmî PDF bağlantısı [\s\S]*?denetiminde yanıt vermedi/u);
  assert.match(panelSource, /içerik\s+kopyalanmaz, plana otomatik aktarılmaz ve değiştirilmez/u);
  assert.doesNotMatch(panelSource, /youtube\.com|youtu\.be/u);
});

test("kütüphane arama, yaş, tür, alan ve 320px güvenli dialog sözleşmesini taşır", () => {
  assert.match(panelSource, /type="search"/u);
  assert.match(panelSource, />Yaş</u);
  assert.match(panelSource, />Tür</u);
  assert.match(panelSource, />Alan</u);
  assert.match(panelSource, /aria-live="polite"/u);
  assert.match(panelSource, /aria-pressed=\{selectedResource\?\.id === resource\.id\}/u);
  assert.match(panelSource, /Dialog\.Title/u);
  assert.match(panelSource, /Dialog\.Description/u);
  assert.match(panelStyles, /@media \(max-width: 420px\)/u);
  assert.match(
    panelStyles,
    /\.tymm-library-dialog \{[\s\S]*?width: min\(calc\(100vw - 28px\), 1180px\);/u,
  );
  assert.match(
    panelStyles,
    /@media \(max-width: 760px\) \{[\s\S]*?\.tymm-library-dialog \{[\s\S]*?width: 100vw;[\s\S]*?height: 100dvh;/u,
  );
  assert.match(panelStyles, /\.tymm-library-search input \{[\s\S]*?min-height: 44px;/u);
  assert.match(
    panelStyles,
    /@media \(max-width: 760px\) \{[\s\S]*?\.tymm-library-filters \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[\s\S]*?max-height: none;[\s\S]*?overflow: visible;/u,
  );
  assert.match(
    panelStyles,
    /@media \(max-width: 760px\) \{[\s\S]*?\.tymm-library-results > ul \{[\s\S]*?max-height: none;[\s\S]*?overflow: visible;/u,
  );
  assert.match(panelStyles, /min-width: 0;/u);
});
