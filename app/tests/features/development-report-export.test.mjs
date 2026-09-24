import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildDevelopmentReportPdfContent, createDevelopmentReportPdfDocument } from "../../src/features/development/development-report-export.ts";
import { developmentReportExportFixture, REPORT_TEST_IDS, REPORT_TEST_RAW_TEXT, REPORT_TEST_EVALUATION, REPORT_TEST_NEXT_SUPPORT } from "../helpers/development-report-export-fixture.mjs";
import { TYMM_2024_CATALOG_METADATA } from "../../src/features/curriculum/tymm-2024-catalog.ts";
import { TYMM_OFFICIAL_PROGRAM_PDF_URL } from "../../src/features/curriculum/tymm-official-resource-catalog.ts";

const fontBytes = new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url)));
const boldFontBytes = new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Bold.ttf", import.meta.url)));
const options = { runtime: { fontBytes, boldFontBytes }, exportedAt: "2026-09-08T10:00:00.000Z" };

test("rapor PDF modeli ham metin, onaylı kaynak, destek ve ayrı öğretmen kararını aynen taşır", async () => {
  const { snapshot, reportId } = await developmentReportExportFixture();
  const before = structuredClone(snapshot);
  const model = await buildDevelopmentReportPdfContent(snapshot, reportId, options);
  const paragraphs = model.nodes.filter((node) => node.kind === "paragraph").map((node) => node.text);
  assert.ok(paragraphs.includes(REPORT_TEST_RAW_TEXT));
  assert.ok(paragraphs.includes(REPORT_TEST_EVALUATION));
  assert.ok(paragraphs.includes(REPORT_TEST_NEXT_SUPPORT));
  assert.ok(paragraphs.includes(`Kaynak gözlem kimliği: ${REPORT_TEST_IDS.observationId}`));
  assert.ok(paragraphs.includes("Bu gözlemde destek: Hatırlatmayla"));
  assert.ok(paragraphs.some((text) => text.includes("SAB.8") && text.includes("Sosyal")));
  assert.ok(paragraphs.some((text) =>
    text.includes("Sayfa: 275.") &&
    text.includes(`Kaynak kimliği: ${TYMM_2024_CATALOG_METADATA.sourceUrl}`) &&
    text.includes(`Güncel erişim: ${TYMM_OFFICIAL_PROGRAM_PDF_URL}#page=275`)
  ));
  assert.ok(paragraphs.some((text) => text.includes("2026-09-08T09:00:00.000Z")));
  assert.ok(paragraphs.indexOf(REPORT_TEST_RAW_TEXT) < paragraphs.indexOf(REPORT_TEST_EVALUATION));
  assert.match(model.artifactFooterText, /Kişisel çocuk bilgisi/u);
  assert.deepEqual(snapshot, before, "export kaynak veya onay kayıtlarını değiştirmemeli");
});

test("taslak, değişmiş ham kaynak, bozuk mühür ve yanlış rapor PDF üretiminden önce reddedilir", async () => {
  let fontLoads = 0;
  const runtime = { loadFontBytes: async () => { fontLoads += 1; return fontBytes; } };
  const draft = await developmentReportExportFixture({ approved: false });
  await assert.rejects(createDevelopmentReportPdfDocument(draft.snapshot, draft.reportId, { runtime }), /öğretmen onayı/u);
  const valid = await developmentReportExportFixture();
  const stale = structuredClone(valid.snapshot);
  stale.observations[0].rawText += " Kaynak sonradan değişti.";
  await assert.rejects(createDevelopmentReportPdfDocument(stale, valid.reportId, { runtime }), /değişmiş kaynak/u);
  const corrupt = structuredClone(valid.snapshot);
  corrupt.settings.find((row) => row.id === valid.reportId).teacherEvaluation += " Onaylanmayan değişiklik.";
  await assert.rejects(createDevelopmentReportPdfDocument(corrupt, valid.reportId, { runtime }), /öğretmen onayı/u);
  await assert.rejects(createDevelopmentReportPdfDocument(valid.snapshot, REPORT_TEST_IDS.observationId, { runtime }), /bulunamadı/u);
  await assert.rejects(createDevelopmentReportPdfDocument(valid.snapshot, valid.reportId, { runtime, exportedAt: "2026-09-08" }), /UTC/u);
  await assert.rejects(buildDevelopmentReportPdfContent(valid.snapshot, valid.reportId, { exportedAt: "geçersiz tarih" }), /UTC/u);
  assert.equal(fontLoads, 0, "geçersiz belge font indirmeyi veya PDF üretimini başlatmamalı");
});

test("eksik destek düzeye dönüştürülmez; isteğe bağlı adım ve çocuk sözü doğru katmanda kalır", async () => {
  const childQuote = "‘Ben iki ayrı sepet yaptım.’";
  const { snapshot, reportId } = await developmentReportExportFixture({ withoutSupport: true, nextSupport: "", childQuote });
  const content = await buildDevelopmentReportPdfContent(snapshot, reportId, options);
  const paragraphs = content.nodes.filter((node) => node.kind === "paragraph").map((node) => node.text);
  assert.ok(paragraphs.includes(childQuote));
  assert.ok(paragraphs.includes("Bu gözlemde destek: Kaydedilmedi"));
  assert.ok(paragraphs.includes("Öğretmen bu raporda sonraki destek adımı belirtmedi."));
  assert.ok(!paragraphs.includes("Bu gözlemde destek: Yönlendirme olmadan"));
});

test("font beklenirken çağıranın snapshot'ı değişse de PDF onaylanan revizyondan sapmaz", async () => {
  const { snapshot, reportId } = await developmentReportExportFixture();
  const expected = await createDevelopmentReportPdfDocument(snapshot, reportId, options);
  let releaseFont;
  let startedFont;
  const started = new Promise((resolve) => { startedFont = resolve; });
  const font = new Promise((resolve) => { releaseFont = resolve; });
  const pending = createDevelopmentReportPdfDocument(snapshot, reportId, {
    exportedAt: options.exportedAt,
    runtime: { boldFontBytes, loadFontBytes: async () => { startedFont(); return font; } },
  });
  await started;
  snapshot.observations[0].rawText = "Bekleme sırasında değişen kaynak";
  snapshot.settings.find((row) => row.id === reportId).teacherEvaluation = "Bekleme sırasında değişen yorum";
  releaseFont(fontBytes);
  const actual = await pending;
  assert.equal(actual.contentSha256, expected.contentSha256);
  assert.deepEqual(actual.bytes, expected.bytes);
  await assert.rejects(createDevelopmentReportPdfDocument(snapshot, reportId, options), /öğretmen onayı/u);
});

test("etiketli Türkçe PDF kaynak kimliklerini çıktı gövdesinde korur ve kişisel bilgiyi XMP'ye taşımaz", async () => {
  const { snapshot, reportId } = await developmentReportExportFixture();
  const file = await createDevelopmentReportPdfDocument(snapshot, reportId, options);
  assert.equal(file.mimeType, "application/pdf");
  assert.equal(file.reportId, reportId);
  assert.equal(file.revision, 2);
  assert.deepEqual(file.observationIds, [REPORT_TEST_IDS.observationId]);
  assert.match(file.fileName, /^MaarifOS_Ogretmen_Gozlem_Ozeti_.*_2026-09-01_2026-09-30_r2\.pdf$/u);
  const pdf = Buffer.from(file.bytes).toString("latin1");
  assert.match(pdf, /\/Lang \(tr-TR\)/u);
  assert.match(pdf, /\/StructTreeRoot/u);
  assert.match(pdf, /\/ToUnicode/u);
  assert.match(pdf, /\/FontFile2/u);
  const xmp = new TextDecoder().decode(file.bytes).match(/<x:xmpmeta[\s\S]+?<\/x:xmpmeta>/u)?.[0] ?? "";
  assert.match(xmp, /Öğretmen gözlem özeti/u);
  for (const value of ["Çağrı", "Güneş", "birlikte kuralım", REPORT_TEST_IDS.observationId, reportId, "Öğretmen yorumu"]) assert.ok(!xmp.includes(value));
  assert.deepEqual((await createDevelopmentReportPdfDocument(snapshot, reportId, options)).bytes, file.bytes, "aynı onay ve oluşturma zamanı aynı PDF'yi üretmeli");
});

test("uzun Türkçe gözlem ve öğretmen yorumu çok sayfada son cümlesine kadar çıkarılabilir", async (context) => {
  if (spawnSync("pdftotext", ["-v"], { encoding: "utf8" }).error) return context.skip("pdftotext bu ortamda kurulu değil");
  const rawText = "Gözlem başlangıcı. " + "Çocuk ölçme oyununda yeşil ve sarı nesneleri yan yana koydu; arkadaşıyla sırasını paylaştı. ".repeat(110) + " Ham gözlem bitişi.";
  const teacherEvaluation = "Yorum başlangıcı. " + "Öğretmen, farklı gün ve bağlamlarda yeni gözlemler toplamayı planladı. ".repeat(50) + " Öğretmen yorumu bitişi.";
  const { snapshot, reportId } = await developmentReportExportFixture({ rawText, teacherEvaluation, childName: "Çağrı/Şen: Kurgu Çocuğu" });
  const file = await createDevelopmentReportPdfDocument(snapshot, reportId, options);
  assert.ok(file.pageCount >= 4, `uzun belge çok sayfalı olmalı: ${file.pageCount}`);
  assert.doesNotMatch(file.fileName, /[\\/:*?"<>|]/u);
  const folder = mkdtempSync(path.join(tmpdir(), "maarifos-report-export-"));
  try {
    const pdfPath = path.join(folder, "report.pdf");
    writeFileSync(pdfPath, file.bytes);
    const extracted = execFileSync("pdftotext", ["-raw", "-enc", "UTF-8", pdfPath, "-"], { encoding: "utf8" });
    const footer = /^Kişisel çocuk bilgisi içerir\. Yalnız yetkili kullanım içindir\. Sayfa \d+ \/ \d+\r?$/gmu;
    assert.equal([...extracted.matchAll(footer)].length, file.pageCount, "her sayfada kişisel veri uyarısı ve sayfa numarası olmalı");
    // Poppler includes page artifacts in -raw output; remove only the verified footer,
    // then require the entire source text and its exact repetition count in reading order.
    const model = await buildDevelopmentReportPdfContent(snapshot, reportId, options);
    const header = new RegExp(model.artifactHeaderText.split(/\s+/u).map(part => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("\\s+"), "gu");
    assert.equal([...extracted.matchAll(header)].length, file.pageCount - 1, "her devam sayfası aynı çocuk/sınıf/dönem bağlamını taşımalı");
    const text = extracted.replace(footer, "").replace(header, "").replace(/\s+/gu, " ");
    for (const expected of [rawText, teacherEvaluation, REPORT_TEST_NEXT_SUPPORT, REPORT_TEST_IDS.observationId, "Çağrı/Şen: Kurgu Çocuğu", "Hatırlatmayla", "SAB.8", "2026-09-08T09:00:00.000Z"]) {
      assert.ok(text.includes(expected.replace(/\s+/gu, " ")), `PDF gövdesinde eksik metin: ${expected.slice(0, 55)}`);
    }
    assert.ok(text.indexOf("Ham gözlem bitişi.") < text.indexOf("Yorum başlangıcı."));
    assert.ok(text.indexOf("Öğretmen yorumu bitişi.") < text.indexOf(REPORT_TEST_NEXT_SUPPORT));
  } finally {
    const resolved = path.resolve(folder);
    if (!resolved.startsWith(path.resolve(tmpdir()) + path.sep) || !path.basename(resolved).startsWith("maarifos-report-export-")) throw new Error("Geçici PDF dizini sınırı doğrulanamadı.");
    rmSync(resolved, { recursive: true, force: true });
  }
});
