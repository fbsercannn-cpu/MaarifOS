import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { verifyPremiumEntitlement } from "../../src/features/premium-access/entitlement.ts";
import { CURRICULUM_PROGRAM_LABELS } from "../../src/features/evidence/evidence-flow.ts";
import { TYMM_2024_CATALOG_METADATA } from "../../src/features/curriculum/tymm-2024-catalog.ts";
import { parsePremiumContentPack } from "../../src/features/premium-plans/content-repository.ts";
import {
  createMonthlyEvaluationDocx,
  createMonthlyEvaluationPdf,
  loadMonthlyEvaluationExportSource,
  prepareMonthlyEvaluationExportDocument,
} from "../../src/features/premium-plans/monthly-evaluation-export.ts";
import {
  installPremiumPlanBoard,
  recordPremiumMonthlyEvaluation,
  PREMIUM_MONTHLY_PROGRAM_CRITERIA,
  PREMIUM_MONTHLY_TEACHER_CRITERIA,
} from "../../src/features/premium-plans/plan-service.ts";
import { createSignedEntitlementFixture } from "../helpers/premium-entitlement.mjs";
import { semanticTaggedPdfPageCount } from "../../src/features/documents/semantic-tagged-pdf.ts";

class MemoryStore {
  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
        records.forEach((record) => byId.set(record.id, structuredClone(record)));
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      collections.forEach((collection) => {
        this.snapshot[collection] = working[collection];
      });
    }
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000008101";
const classroomId = "00000000-0000-4000-8000-000000008102";
const studentId = "00000000-0000-4000-8000-000000008103";
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const pdfFontBytes = new Uint8Array(readFileSync(path.resolve(
  testDirectory,
  "../../public/assets/fonts/MaarifOSSans-Regular.ttf",
)));
const hasPdfToText = !spawnSync("pdftotext", ["-v"], { encoding: "utf8" }).error;
const profile = {
  framework: "tymm",
  programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
  catalogId: TYMM_2024_CATALOG_METADATA.catalogId,
  sourceVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
  referenceOrigin: "official-catalog",
  officialCatalogVerified: true,
};

function extractPdfText(bytes) {
  if (!hasPdfToText) return "";
  const directory = mkdtempSync(path.join(tmpdir(), "maarifos-ek18-pdf-"));
  try {
    const pdfPath = path.join(directory, "ek18.pdf");
    const textPath = path.join(directory, "ek18.txt");
    writeFileSync(pdfPath, bytes);
    execFileSync("pdftotext", ["-raw", "-enc", "UTF-8", pdfPath, textPath]);
    return readFileSync(textPath, "utf8").replaceAll("\r", "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function activeStore() {
  const snapshot = createEmptySnapshot();
  const base = {
    createdAt: "2026-09-01T06:00:00.000Z",
    updatedAt: "2026-09-01T06:00:00.000Z",
    civilDate: "2026-09-01",
    deletedAt: null,
    schemaVersion: 1,
  };
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-07",
    endDate: "2027-06-25",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId: yearId,
    name: "Ek 18 Test Sınıfı",
    ageGroup: "60–72 ay",
    curriculumProfileSnapshot: profile,
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  snapshot.students.push({
    ...base,
    id: studentId,
    displayName: "Kurgu Çocuk",
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

async function pack() {
  const raw = JSON.parse(await readFile(
    new URL(
      "../../../premium-content/releases/tymm-6072/2026-09/content.v2.json",
      import.meta.url,
    ),
    "utf8",
  ));
  return parsePremiumContentPack(raw);
}

async function accessFor(content, accessMode = "purchased") {
  return verifyPremiumEntitlement(
    await createSignedEntitlementFixture(content, { accessMode }),
  );
}

function criteria(catalog, adjustmentId) {
  return catalog.map(({ id }) => ({
    criterionId: id,
    status: id === adjustmentId ? "needs-adjustment" : "observed-working",
  }));
}

function programNarrativeAtLimit() {
  const ending = " PROGRAM_METNI_SONU";
  const seed =
    "Program değerlendirmesinde katılım, süre, materyal, geçiş ve ölçme kararları kanıta dayalı olarak yeniden ele alındı. ";
  const narrative = `${seed.repeat(30).slice(0, 2_000 - ending.length)}${ending}`;
  assert.equal(narrative.length, 2_000);
  return narrative;
}

async function installAndEvaluate(store, content, options = {}) {
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
    now: new Date("2026-09-01T08:00:00.000Z"),
  });
  const evaluation = await recordPremiumMonthlyEvaluation(store, {
    monthlyPlanId: installed.monthlyPlanId,
    childEvidenceState: "insufficient-evidence",
    childNarrative: "Bu ay için kesin beceri hükmü kurulmadı.",
    observationIds: [],
    curriculumLinkIds: [],
    programCriteria: criteria(
      PREMIUM_MONTHLY_PROGRAM_CRITERIA,
      "duration-fit",
    ),
    programNarrative:
      options.programNarrative ??
      "Katılım yolları işledi; süre ve geçiş düzeni uyarlama gerektirdi.",
    teacherCriteria: criteria(
      PREMIUM_MONTHLY_TEACHER_CRITERIA,
      "time-management",
    ),
    teacherNarrative:
      "Zaman yönetimi ve çocukların sessiz katılım yollarını yeniden düşündüm.",
    nextMonthRecommendation:
      "Sonraki ay farklı gün ve ortamlarda kanıt toplamayı sürdüreceğim.",
    now: options.now ?? new Date("2026-09-30T13:00:00.000Z"),
  });
  return { installed, evaluation };
}

function readStoredZipEntry(bytes, expectedName) {
  const buffer = Buffer.from(bytes);
  let offset = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString("utf8");
    if (name === expectedName) {
      return buffer.subarray(dataStart, dataStart + compressedSize).toString("utf8");
    }
    offset = dataStart + compressedSize;
  }
  throw new Error(`${expectedName} ZIP içinde bulunamadı.`);
}

test("değerlendirme yoksa ve legacy aylık değerlendirme alanı eksikse Ek 18 fail-closed kalır", async () => {
  const content = await pack();
  const store = activeStore();
  const installed = await installPremiumPlanBoard(store, {
    pack: content,
    curriculumProfile: profile,
    teacherPreferredLensId: "guided-play",
  });
  const monthly = store.snapshot.plans.find(
    (plan) => plan.id === installed.monthlyPlanId,
  );
  delete monthly.monthlyEvaluations;
  const source = await loadMonthlyEvaluationExportSource(
    store,
    installed.monthlyPlanId,
  );
  const access = await accessFor(content);
  assert.equal(source.reviewContext.evaluations.length, 0);
  assert.throws(
    () => prepareMonthlyEvaluationExportDocument(
      content,
      source,
      access,
      "00000000-0000-4000-8000-000000008999",
      "word",
    ),
    /yalnız kaydedilmiş son veya öğretmenin seçtiği geçmiş aylık değerlendirmeden/,
  );
});

test("seçili geçmiş değerlendirmeyi exact kimliğiyle alır; Ek 18 işaretlerini yalnız kalıcı plan bileşenlerinden üretir", async () => {
  const content = await pack();
  const store = activeStore();
  const first = await installAndEvaluate(store, content, {
    programNarrative:
      "İlk kayıt: müziksel yaratıcılık ve finans sözcükleri yalnız anlatıdır; işaret kaynağı değildir.",
    now: new Date("2026-09-30T12:00:00.000Z"),
  });
  const second = await recordPremiumMonthlyEvaluation(store, {
    monthlyPlanId: first.installed.monthlyPlanId,
    childEvidenceState: "insufficient-evidence",
    childNarrative: "İkinci kayıtta da kesin beceri hükmü kurulmadı.",
    observationIds: [],
    curriculumLinkIds: [],
    programCriteria: criteria(PREMIUM_MONTHLY_PROGRAM_CRITERIA, "materials-fit"),
    programNarrative: "İkinci kayıt program anlatısıdır.",
    teacherCriteria: criteria(PREMIUM_MONTHLY_TEACHER_CRITERIA, "materials-use"),
    teacherNarrative: "İkinci kayıt öğretmen yansıtmasıdır.",
    nextMonthRecommendation: "İkinci kayıt sonraki ay önerisidir.",
    now: new Date("2026-09-30T13:00:00.000Z"),
  });
  const source = await loadMonthlyEvaluationExportSource(
    store,
    first.installed.monthlyPlanId,
  );
  const access = await accessFor(content, "staff-code");
  const document = prepareMonthlyEvaluationExportDocument(
    content,
    source,
    access,
    first.evaluation.id,
    "word",
    { exportedAt: "2026-10-01T08:00:00.000Z" },
  );
  assert.equal(document.evaluation.id, first.evaluation.id);
  assert.notEqual(document.evaluation.id, second.id);
  assert.equal(document.monthlyPlan.id, first.installed.monthlyPlanId);
  assert.equal(document.evaluation.program.narrative.startsWith("İlk kayıt"), true);
  assert.equal(document.manifest.monthlyEvaluationId, first.evaluation.id);
  assert.equal(document.manifest.monthlyPlanId, first.installed.monthlyPlanId);
  assert.deepEqual(document.manifest.observationIds, []);
  assert.deepEqual(document.manifest.curriculumLinkIds, []);
  assert.equal(document.manifest.programComponentEvidenceStatus, "verified-complete-mapping");
  assert.ok(document.manifest.persistedProgramComponents.length > 0);
  [
    "area-turkish-listening-viewing",
    "area-turkish-reading",
    "area-turkish-speaking",
    "area-turkish-early-literacy",
    "area-math-reasoning",
    "area-math-data-decisions",
    "area-social-chronology",
    "area-movement-health",
    "area-art-practice",
    "area-music-listen",
    "area-music-play",
  ].forEach((rowId) => assert.ok(
    document.mappedOfficialRowIds.includes(rowId),
    `Beklenen Ek 18 satırı işaretlenmedi: ${rowId}`,
  ));
  assert.equal(document.mappedOfficialRowIds.includes("area-music-creativity"), false);
  assert.equal(document.mappedOfficialRowIds.includes("area-social-finance"), false);
});

test("tarihsel değerlendirme kadro değişse de kendi snapshot'ıyla açılır; gözlem ve bağ kimliği tamperi kapanır", async () => {
  const content = await pack();
  const store = activeStore();
  const { installed, evaluation } = await installAndEvaluate(store, content);
  const originalStudent = store.snapshot.students.find(({ id }) => id === studentId);
  originalStudent.deletedAt = "2026-10-01T07:00:00.000Z";
  originalStudent.updatedAt = "2026-10-01T07:00:00.000Z";
  const replacementStudentId = "00000000-0000-4000-8000-000000008104";
  store.snapshot.students.push({
    ...structuredClone(originalStudent),
    id: replacementStudentId,
    displayName: "Sonradan Katılan Kurgu Çocuk",
    createdAt: "2026-10-01T07:01:00.000Z",
    updatedAt: "2026-10-01T07:01:00.000Z",
    civilDate: "2026-10-01",
    deletedAt: null,
  });

  const sourceAfterRosterChange = await loadMonthlyEvaluationExportSource(
    store,
    installed.monthlyPlanId,
  );
  assert.deepEqual(sourceAfterRosterChange.reviewContext.activeStudentIds, [
    replacementStudentId,
  ]);
  const access = await accessFor(content);
  const historicalDocument = prepareMonthlyEvaluationExportDocument(
    content,
    sourceAfterRosterChange,
    access,
    evaluation.id,
    "word",
  );
  assert.deepEqual(
    historicalDocument.evaluation.children.coverage.activeStudentIds,
    [studentId],
  );

  const storedMonthly = store.snapshot.plans.find(
    (plan) => plan.id === installed.monthlyPlanId,
  );
  const storedEvaluation = storedMonthly.monthlyEvaluations.find(
    ({ id }) => id === evaluation.id,
  );
  storedEvaluation.children.observationIds = [
    "00000000-0000-4000-8000-000000008105",
  ];
  await assert.rejects(
    loadMonthlyEvaluationExportSource(store, installed.monthlyPlanId),
    /kaynak kimlikleri ile kapsam özeti uyuşmuyor/,
  );

  storedEvaluation.children.observationIds = [];
  storedEvaluation.children.curriculumLinkIds = [
    "00000000-0000-4000-8000-000000008106",
  ];
  await assert.rejects(
    loadMonthlyEvaluationExportSource(store, installed.monthlyPlanId),
    /kaynak kimlikleri ile kapsam özeti uyuşmuyor/,
  );
});

test("DOCX altı resmî Ek 18 sayfasını, ayrı öğretmen ekini ve görünmez kaynak manifestini taşır", async () => {
  const content = await pack();
  const store = activeStore();
  const { installed, evaluation } = await installAndEvaluate(store, content);
  const source = await loadMonthlyEvaluationExportSource(store, installed.monthlyPlanId);
  const document = prepareMonthlyEvaluationExportDocument(
    content,
    source,
    await accessFor(content),
    evaluation.id,
    "word",
    { exportedAt: "2026-10-01T08:00:00.000Z" },
  );
  const bytes = createMonthlyEvaluationDocx(document);
  const visibleXml = readStoredZipEntry(bytes, "word/document.xml");
  const manifestXml = readStoredZipEntry(bytes, "customXml/item1.xml");
  assert.match(visibleXml, /EK 18 : AYLIK PLAN KONTROL ÇİZELGESİ/);
  assert.match(visibleXml, /KAVRAMSAL BECERİLER/);
  assert.match(visibleXml, /EĞİLİMLER/);
  assert.match(visibleXml, /ALAN BECERİLERİ/);
  assert.match(visibleXml, /SOSYAL - DUYGUSAL ÖĞRENME BECERİLERİ/);
  assert.match(visibleXml, /DEĞERLER/);
  assert.match(visibleXml, /OKURYAZARLIK BECERİLERİ/);
  assert.match(visibleXml, /GENEL DEĞERLENDİRME/);
  assert.match(visibleXml, /ÖĞRETMEN DEĞERLENDİRME EKİ/);
  assert.match(visibleXml, /resmî Ek 18 formunun parçası değildir/);
  assert.match(visibleXml, /Belirlermek-işaret etmek/);
  assert.match(visibleXml, /Tümden gelime dayalı akıl yürütme becerisi/);
  assert.match(visibleXml, /Kendine İnanma\(Öz Yeterlilik\)/);
  assert.match(visibleXml, /Çalışmalarda aktif rol almak\./);
  assert.match(visibleXml, /Katılım yolları işledi/);
  assert.doesNotMatch(visibleXml, /Bağlam \/ ne sırasında\?|Çocuğun sözü/);
  assert.doesNotMatch(visibleXml, new RegExp(installed.monthlyPlanId));
  assert.doesNotMatch(visibleXml, new RegExp(evaluation.id));
  assert.match(manifestXml, new RegExp(installed.monthlyPlanId));
  assert.match(manifestXml, new RegExp(evaluation.id));
  assert.match(manifestXml, /source-structured-word-reproduction/);
  assert.doesNotMatch(manifestXml, /accessible-reproduction/);
  assert.match(manifestXml, /persistedProgramComponents/);
  assert.match(manifestXml, /annexPages="344-349"/);
  const visibleMarks = visibleXml.match(/<w:t xml:space="preserve">X<\/w:t>/g) ?? [];
  assert.equal(visibleMarks.length, document.mappedOfficialRowIds.length);
  assert.equal(
    (visibleXml.match(/<w:br w:type="page"\/>/g) ?? []).length,
    6,
    "Altı resmî sayfa ve bir ayrı öğretmen eki tam yedi sayfa için altı açık sayfa sonu taşımalı.",
  );
  assert.equal(document.manifest.schemaVersion, 2);
  assert.equal(document.manifest.officialSourceFormPageCount, 6);
  assert.equal(document.manifest.outputPagination, "six-source-pages-plus-appendix");
  assert.ok(
    visibleXml.indexOf("DEĞERLER") < visibleXml.indexOf("OKURYAZARLIK BECERİLERİ"),
    "Ek 18 s. 348'de Değerler üstte, Okuryazarlık Becerileri altta kalmalı.",
  );
  assert.doesNotMatch(visibleXml, /documentProtection/);

  const longDocument = structuredClone(document);
  longDocument.evaluation.program.narrative = programNarrativeAtLimit();
  const longVisibleXml = readStoredZipEntry(
    createMonthlyEvaluationDocx(longDocument),
    "word/document.xml",
  );
  assert.match(
    longVisibleXml,
    /\[Metnin devamı ayrı Öğretmen Değerlendirme Eki&apos;ndedir\.\]/,
  );
  assert.match(longVisibleXml, /PROGRAM_METNI_SONU/);
  assert.equal(
    (longVisibleXml.match(/<w:br w:type="page"\/>/g) ?? []).length,
    6,
    "Uzun anlatı resmî altı sayfanın açık sayfa sonlarını değiştirmemeli; tam metin öğretmen ekinde kalmalı.",
  );
});

test("eşlenemeyen doğrulanmış plan kodunu matriste uydurmaz; metadata ve ayrı ekte açıklar", async () => {
  const content = await pack();
  const store = activeStore();
  const { installed, evaluation } = await installAndEvaluate(store, content);
  const monthly = store.snapshot.plans.find((plan) => plan.id === installed.monthlyPlanId);
  monthly.curriculumTargets.push({
    ...structuredClone(monthly.curriculumTargets[0]),
    id: "tymm-verified-unmapped-test",
    referenceCode: "KB9.99",
    referenceTitle: "Resmî satır eşlemesi henüz kanıtlanmamış kurgu bileşen",
  });
  const source = await loadMonthlyEvaluationExportSource(store, installed.monthlyPlanId);
  const document = prepareMonthlyEvaluationExportDocument(
    content,
    source,
    await accessFor(content),
    evaluation.id,
    "word",
  );
  assert.equal(document.manifest.programComponentEvidenceStatus, "verified-partial-mapping");
  assert.deepEqual(document.manifest.unmappedPlanComponents, [{
    referenceCode: "KB9.99",
    referenceTitle: "Resmî satır eşlemesi henüz kanıtlanmamış kurgu bileşen",
  }]);
  const visibleXml = readStoredZipEntry(
    createMonthlyEvaluationDocx(document),
    "word/document.xml",
  );
  assert.match(visibleXml, /matriste işaretlenmedi/);
  assert.match(visibleXml, /KB9.99/);
});

test("trial, revoked ve kalıcı program bileşeni kurcalamasını fail-closed reddeder", async () => {
  const content = await pack();
  const store = activeStore();
  const { installed, evaluation } = await installAndEvaluate(store, content);
  const source = await loadMonthlyEvaluationExportSource(store, installed.monthlyPlanId);
  const trial = await accessFor(content, "trial");
  assert.throws(
    () => prepareMonthlyEvaluationExportDocument(
      content,
      source,
      trial,
      evaluation.id,
      "pdf",
    ),
    /Deneme sürümünde Ek 18 PDF ve Word çıktısı kapalıdır/,
  );
  const purchased = await accessFor(content);
  const revoked = Object.freeze({
    ...purchased,
    status: "revoked",
    canUsePremiumContent: false,
    canExportPremiumContent: false,
  });
  assert.throws(
    () => prepareMonthlyEvaluationExportDocument(
      content,
      source,
      revoked,
      evaluation.id,
      "word",
    ),
    /süresi dolmuş veya çevrimiçi yenileme gerekiyor/,
  );

  const monthly = store.snapshot.plans.find((plan) => plan.id === installed.monthlyPlanId);
  monthly.curriculumTargets[0].verificationStatus = "teacher-declared-unverified";
  await assert.rejects(
    loadMonthlyEvaluationExportSource(store, installed.monthlyPlanId),
    /yalnız resmî kaynağı kontrol edilmiş TYMM program bileşeninden/,
  );
});

test("Ek 18 PDF çok sayfalı semantik tabloları, güvenli manifesti ve kayıpsız uzun eki taşır", async () => {
  const content = await pack();
  const store = activeStore();
  const { installed, evaluation } = await installAndEvaluate(store, content);
  const source = await loadMonthlyEvaluationExportSource(store, installed.monthlyPlanId);
  const document = prepareMonthlyEvaluationExportDocument(
    content,
    source,
    await accessFor(content),
    evaluation.id,
    "pdf",
    { exportedAt: "2026-10-01T08:00:00.000Z" },
  );
  const pdf = await createMonthlyEvaluationPdf(document, {
    runtime: { fontBytes: pdfFontBytes },
  });
  const decoded = Buffer.from(pdf).toString("latin1");
  const pageCount = semanticTaggedPdfPageCount(pdf);
  const xmp = new TextDecoder().decode(pdf)
    .match(/<x:xmpmeta[\s\S]+?<\/x:xmpmeta>/u)?.[0] ?? "";
  assert.equal(decoded.startsWith("%PDF-1.7"), true);
  assert.ok(pageCount >= 7, "altı resmî kaynak bölümü ve ayrı öğretmen eki çok sayfalı kalmalı");
  assert.match(decoded, /\/Lang \(tr-TR\)/u);
  assert.match(decoded, /\/StructTreeRoot\b/u);
  assert.match(decoded, /\/FontFile2\b/u);
  assert.match(decoded, /\/ToUnicode\b/u);
  assert.match(decoded, /\/S \/H1\b/u);
  assert.match(decoded, /\/S \/H4\b/u);
  assert.match(decoded, /\/S \/Table\b/u);
  assert.match(decoded, /\/S \/TR\b/u);
  assert.match(decoded, /\/S \/TH\b/u);
  assert.match(decoded, /\/S \/TD\b/u);
  assert.match(decoded, /\/Scope \/Column\b/u);
  assert.match(decoded, /\/Scope \/Row\b/u);
  assert.doesNotMatch(decoded, /\/Subtype \/Image\b/u);
  assert.match(xmp, /semantic-accessible-reflow/u);
  assert.match(xmp, /content-dependent/u);
  assert.doesNotMatch(xmp, /maarifos-manifest-base64:/u);
  assert.doesNotMatch(xmp, /Kurgu Çocuk|10000000146|05\d{9}/u);
  assert.doesNotMatch(xmp, new RegExp(`${installed.monthlyPlanId}|${evaluation.id}`, "u"));
  assert.equal(document.manifest.renderingMode, "semantic-accessible-reflow");
  assert.equal(document.manifest.officialSourceFormPageCount, 6);
  assert.equal(document.manifest.outputPagination, "content-dependent");
  assert.match(decoded, new RegExp(`/Count ${pageCount}\\b`, "u"));
  if (hasPdfToText) {
    const extracted = extractPdfText(pdf);
    const normalized = extracted.replace(/\s+/gu, " ");
    assert.match(extracted, /EK 18 : AYLIK PLAN KONTROL ÇİZELGESİ/u);
    assert.match(extracted, /GENEL DEĞERLENDİRME/u);
    assert.match(extracted, /ÖĞRETMEN DEĞERLENDİRME EKİ/u);
    assert.match(normalized, /Sürdürülebilir ve sürdürülebilir olmayan sistemleri anlama/u);
    assert.doesNotMatch(extracted, new RegExp(installed.monthlyPlanId, "u"));
    assert.doesNotMatch(extracted, new RegExp(evaluation.id, "u"));
    assert.doesNotMatch(extracted, /(?:^|\s)—(?:\s|$)/u);
  }

  const longDocument = structuredClone(document);
  longDocument.evaluation.program.narrative = programNarrativeAtLimit();
  const longPdf = await createMonthlyEvaluationPdf(longDocument, {
    runtime: { fontBytes: pdfFontBytes },
  });
  assert.ok(semanticTaggedPdfPageCount(longPdf) >= pageCount);
  if (hasPdfToText) {
    const longText = extractPdfText(longPdf);
    assert.match(
      longText,
      /Metnin devamı ayrı Öğretmen Değerlendirme Eki'ndedir/u,
    );
    assert.match(longText, /PROGRAM_METNI_SONU/u);
    assert.ok(
      longText.indexOf("Metnin devamı ayrı Öğretmen Değerlendirme Eki'ndedir")
        < longText.indexOf("PROGRAM_METNI_SONU"),
      "resmî bölümdeki devam notu, eksiksiz öğretmen ekinden önce okunmalı",
    );
  }
});
