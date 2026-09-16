import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import * as XLSX from "xlsx";

import { createClassRosterExportModel } from "../../src/features/classroom/class-roster-document.ts";
import { createClassRosterSpreadsheet } from "../../src/features/classroom/class-roster-spreadsheet.ts";
import { saveGrowthMeasurement } from "../../src/features/growth-measurements/growth-measurement-service.ts";
import {
  createGrowthSpreadsheet,
  GROWTH_PRINT_DATA_START_ROW,
  GROWTH_PRINT_HEADER_ROW,
  growthImportCandidates,
  readGrowthWorkbook,
} from "../../src/features/growth-measurements/growth-spreadsheet.ts";
import { createPremiumPlanDocx } from "../../src/features/premium-plans/export-document.ts";
import { createMonthlyEvaluationDocx } from "../../src/features/premium-plans/monthly-evaluation-export.ts";
import {
  classRosterExtremeFixture,
  classRosterFixture,
} from "../../tests/fixtures/class-roster-fixture.mjs";
import {
  GrowthMemoryStore,
  addGrowthStudents,
  growthFixture,
  growthScope,
  growthStudents,
  growthUid,
} from "../../tests/fixtures/growth-measurements-fixture.mjs";

const output = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Kullanım: node generate-office-fixtures.mjs <outputDirectory>");
await mkdir(output, { recursive: true });

const fixtureText = await readFile(new URL("./fixtures/ek18-document.json", import.meta.url), "utf8");
const ek18Fixture = JSON.parse(fixtureText);
const filler = "Kurgu öğretmen belgesi uzun satır denetimi için Türkçe ğüşöçı karakterlerini ve kaynak anlatısını eksiksiz taşır. ";
const layoutParagraphs = [
  { text: "WORD LAYOUT KURGU KABUL BELGESİ", style: "title" },
  { text: "Kişisel veri içermez · Word gerçek uygulama denetimi", style: "meta" },
  ...Array.from({ length: 54 }, (_, index) => ({
    text: `Kurgu gövde ${String(index + 1).padStart(2, "0")} · ${filler.repeat(2)}`,
    style: "body",
  })),
  { text: "SENTINEL_KEEP_HEADING", style: "heading2", keepWithNext: true },
  { text: `SENTINEL_KEEP_BODY · ${filler.repeat(3)}`, style: "body" },
  { text: "SENTINEL_FORCE_HEADING", style: "heading1", forcePageBreakBefore: true },
  ...Array.from({ length: 36 }, (_, index) => ({
    text: `Düzenlenebilir gerçek liste maddesi ${String(index + 1).padStart(2, "0")} · ${filler}`,
    style: "bullet",
  })),
  { text: `WORD_LAYOUT_SON · ${filler.repeat(2)}`, style: "body" },
];

const ek18Document = structuredClone(ek18Fixture);
ek18Document.format = "word";
ek18Document.fileName = "MaarifOS_Ek18_Uzun_Kurgu_Kabul.docx";
ek18Document.evaluation.children.narrative += ` ${filler.repeat(8)}EK18_COCUK_SON`;
ek18Document.evaluation.program.narrative += ` ${filler.repeat(16)}EK18_PROGRAM_SON`;
ek18Document.evaluation.teacher.narrative += ` ${filler.repeat(10)}EK18_OGRETMEN_SON`;
ek18Document.evaluation.nextMonthRecommendation += ` ${filler.repeat(6)}EK18_ONERI_SON`;

const roster = classRosterExtremeFixture();
roster.snapshot.academicYears[0].startDate = "2026-09-01";
roster.snapshot.academicYears[0].endDate = "2027-06-30";
roster.snapshot.students[0].optionalCode = "000012";
roster.snapshot.students[0].nationalIdentityNumber = "00123456789";
roster.snapshot.students[1].birthDate = undefined;
roster.snapshot.students[1].enrollmentYear = undefined;
const classFull = await createClassRosterSpreadsheet(roster);
const classTypes = await createClassRosterSpreadsheet({
  ...roster,
  studentIds: roster.snapshot.students.slice(0, 3).map(({ id }) => id),
  period: { start: "2026-09-01", end: "2026-12-31" },
  columns: ["sequence", "schoolNumber", "name", "birthDate", "enrollmentYear"],
});
const compactRoster = classRosterFixture(25);
compactRoster.snapshot.students[0].optionalCode = "0";
compactRoster.snapshot.students[0].contacts.push(
  { id: "00000000-0000-4000-8700-000000000001", kind: "other", name: "Kurgu Üçüncü Yakın", relationship: "Aile yakını", phone: "0532 000 00 05", occupation: "Hemşire" },
  { id: "00000000-0000-4000-8800-000000000001", kind: "other", name: "Kurgu Dördüncü Yakın", relationship: "Komşu", phone: "0532 000 00 06", occupation: "Öğretmen" },
);
compactRoster.snapshot.students[1].contacts[0].phone = "";
compactRoster.snapshot.students[2].contacts[0].phone = '=HYPERLINK("https://example.invalid","Kurgu")';
const compactLongStudent = compactRoster.snapshot.students[6];
compactLongStudent.displayName = "Kurgu " + "ŞahinoğluÇınaroğlu".repeat(7);
compactLongStudent.contacts[0].name = "Kurgu " + "UzunoğullarıKahramanoğlu".repeat(4);
compactLongStudent.contacts[0].phone = "+90 (532) 111 22 33 / +90 (258) 444 55 66 / dahili 777";
compactLongStudent.contacts[0].occupation = "SADECE_TAM_VERI_MESLEK_2468";
compactLongStudent.careDetails.homeAddress = "SADECE_TAM_VERI_ADRES_987654";
const classCompact = await createClassRosterSpreadsheet(compactRoster, {
  layout: "compact-contact",
});

const growthSnapshot = addGrowthStudents(growthFixture(), 40);
const growthStore = new GrowthMemoryStore(growthSnapshot);
let growthIdentity = 80_000;
async function addMeasurement({ studentId, periodKey, metric, integerValue, measuredOn }) {
  await saveGrowthMeasurement(growthStore, {
    ...growthScope,
    studentId,
    periodKey,
    metric,
    integerValue,
    measuredOn,
    source: "school",
    measurementId: growthUid(growthIdentity++),
    selectionEventId: growthUid(growthIdentity++),
    expectedSelectionEventId: null,
    now: new Date(`${measuredOn}T09:00:00.000Z`),
  });
}
await addMeasurement({ studentId: growthStudents.ada, periodKey: "2026-09", metric: "height", integerValue: 1_111, measuredOn: "2026-09-08" });
await addMeasurement({ studentId: growthStudents.ada, periodKey: "2026-09", metric: "weight", integerValue: 18_765, measuredOn: "2026-09-08" });
await addMeasurement({ studentId: growthStudents.ada, periodKey: "2027-06", metric: "height", integerValue: 1_234, measuredOn: "2027-06-12" });
await addMeasurement({ studentId: growthSnapshot.students.at(-1).id, periodKey: "2027-06", metric: "weight", integerValue: 20_125, measuredOn: "2027-06-13" });
const populatedGrowthSnapshot = await growthStore.readSnapshot();
const growthClass = createGrowthSpreadsheet(populatedGrowthSnapshot, "2027-06-30", growthScope, { mode: "class" });
const growthIndividual = createGrowthSpreadsheet(populatedGrowthSnapshot, "2027-06-30", growthScope, {
  mode: "individual",
  studentId: growthStudents.ada,
});
const growthSeptember = createGrowthSpreadsheet(populatedGrowthSnapshot, "2027-06-30", growthScope, {
  mode: "class",
  periodKey: "2026-09",
});

const artifacts = [
  ["class-roster-full.xlsx", classFull.bytes],
  ["class-roster-types.xlsx", classTypes.bytes],
  ["class-roster-compact-25.xlsx", classCompact.bytes],
  ["growth-class-40.xlsx", growthClass.bytes],
  ["growth-individual.xlsx", growthIndividual.bytes],
  ["growth-class-september.xlsx", growthSeptember.bytes],
  ["premium-layout.docx", createPremiumPlanDocx(layoutParagraphs)],
  ["ek18-long.docx", createMonthlyEvaluationDocx(ek18Document)],
];

function packageText(bytes, name) {
  const archive = XLSX.CFB.read(bytes, { type: "array" });
  const entry = XLSX.CFB.find(archive, `Root Entry/${name}`);
  assert.ok(entry?.content, `${name} paket parçası bulunamadı.`);
  return new TextDecoder("utf-8", { fatal: true }).decode(entry.content);
}

function count(text, expression) {
  return [...text.matchAll(expression)].length;
}

function inspectClassWorkbook(bytes) {
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true, cellStyles: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  assert.equal(sheet.A8.t, "n");
  assert.equal(sheet.A8.v, 1);
  assert.equal(sheet.B8.t, "s");
  assert.equal(sheet.B8.v, "000012");
  assert.equal(sheet.D8.t, "d");
  assert.equal(sheet.D8.v.toISOString().slice(0, 10), "2020-09-10");
  assert.equal(sheet.E8.t, "n");
  assert.equal(sheet.E8.v, 2025);
  assert.equal(sheet.D9.t, "s");
  assert.equal(sheet.D9.v, "—");
  assert.equal(sheet.E9.t, "s");
  assert.equal(sheet.E9.v, "—");
  const xml = packageText(bytes, "xl/worksheets/sheet1.xml");
  const workbookXml = packageText(bytes, "xl/workbook.xml");
  assert.match(xml, /orientation="portrait"/u);
  assert.match(xml, /fitToWidth="1"/u);
  assert.match(workbookXml, /_xlnm\.Print_Titles/u);
  return {
    sheet: workbook.SheetNames[0],
    sequenceType: sheet.A8.t,
    schoolNumberType: sheet.B8.t,
    birthDateType: sheet.D8.t,
    enrollmentYearType: sheet.E8.t,
    missingBirthDateType: sheet.D9.t,
  };
}

function sheetRows(xlsx, sheet) {
  return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
}

function inspectCompactClassWorkbook(file, input) {
  const workbook = XLSX.read(file.bytes, { type: "array", cellDates: true, cellStyles: true });
  assert.deepEqual(workbook.SheetNames, ["Sınıf listesi", "Kısa iletişim baskısı"]);
  const complete = workbook.Sheets["Sınıf listesi"];
  const compact = workbook.Sheets["Kısa iletişim baskısı"];
  const completeRows = sheetRows(XLSX, complete);
  const compactRows = sheetRows(XLSX, compact);
  const completeDataRows = completeRows.slice(7).filter((row) => /^[1-9]\d*$/u.test(String(row[0] ?? "")));
  const compactDataRows = compactRows.slice(5).filter((row) => /^[1-9]\d*$/u.test(String(row[0] ?? "")));
  const expectedModel = createClassRosterExportModel(input);
  assert.equal(completeRows[6].length, 20, "kompakt kitap seçilmiş tam 20 alanı veri sayfasında korumalı");
  assert.deepEqual(
    completeRows.slice(7, 7 + expectedModel.rows.length),
    expectedModel.rows.map((row) => [...row]),
    "tam veri sayfası kanonik seçili alan/çocuk projeksiyonunu kayıpsız korumalı",
  );
  assert.equal(new Set(expectedModel.rowStudentIds).size, 25);
  assert.equal(new Set(completeDataRows.map((row) => String(row[0]))).size, 25);
  assert.equal(compactDataRows.length, 25);
  const longRow = expectedModel.rows.find((row) => row[0] === "7");
  assert.ok(longRow, "uzun kaynaklı yedinci kurgu çocuk kanonik projeksiyonda bulunmalı");
  const occupation = longRow[expectedModel.columns.findIndex((column) => column.id === "motherOccupation")];
  const address = longRow[expectedModel.columns.findIndex((column) => column.id === "address")];
  const completeText = JSON.stringify(completeRows);
  const compactText = JSON.stringify(compactRows);
  assert.ok(completeText.includes(address));
  assert.ok(completeText.includes(occupation));
  assert.match(compactText, /\+90 \(532\) 111 22 33 \/ \+90 \(258\) 444 55 66 \/ dahili 777/u);
  assert.ok(!compactText.includes(address));
  assert.ok(!compactText.includes(occupation));
  const compactXml = packageText(file.bytes, "xl/worksheets/sheet2.xml");
  const workbookXml = packageText(file.bytes, "xl/workbook.xml");
  assert.equal(complete.B8.t, "s");
  assert.equal(complete.B8.v, "0");
  assert.equal(complete.B8.f, undefined);
  assert.equal(compact.B6.v, "0");
  assert.match(compact.B6.f, /'Sınıf listesi'!\$B\$8/u);
  assert.equal(complete.H13.t, "s");
  assert.equal(complete.H13.v, '=HYPERLINK("https://example.invalid","Kurgu")');
  assert.equal(complete.H13.f, undefined);
  assert.equal(compact.D8.v, 'Kurgu Anne 3 Çınaroğlu · =HYPERLINK("https://example.invalid","Kurgu")');
  assert.doesNotMatch(compact.D8.f, /HYPERLINK|example\.invalid|Kurgu/u);
  assert.match(compact.D8.f, /'Sınıf listesi'!\$H\$13/u);
  assert.match(compactXml, /orientation="landscape"/u);
  assert.match(compactXml, /fitToWidth="1"/u);
  assert.match(compactXml, /fitToHeight="0"/u);
  assert.match(workbookXml, /_xlnm\.Print_Area/u);
  assert.match(workbookXml, /Kısa iletişim baskısı/u);
  assert.match(workbookXml, /\$1:\$5/u);
  assert.match(workbookXml, /<workbookView\b[^>]*activeTab="1"/u);
  assert.match(workbookXml, /<calcPr\b[^>]*calcMode="auto"[^>]*fullCalcOnLoad="1"[^>]*forceFullCalc="1"/u);
  return {
    sheets: workbook.SheetNames,
    selectedColumnCount: completeRows[6].length,
    completeRowCount: completeDataRows.length,
    completeUniqueStudentCount: new Set(completeDataRows.map((row) => String(row[0]))).size,
    compactStudentCount: compactDataRows.length,
    longContactPreserved: true,
    nonContactDetailsExcludedFromCompactPrint: true,
    compactPrintSheetActiveOnOpen: true,
    liveFormulaCount: Object.entries(compact).filter(([address, cell]) =>
      !address.startsWith("!") && typeof cell?.f === "string").length,
    formulaLikeSourceStoredAsText: true,
    formulaInjectionAbsentFromFormulaBodies: true,
  };
}

function inspectGrowthWorkbook(file, expectedStudents, expectedPeriodKey) {
  const workbook = XLSX.read(file.bytes, { type: "array", cellDates: true, cellStyles: true });
  assert.deepEqual(workbook.SheetNames, ["Aktarılabilir veri", "Baskı çizelgesi"]);
  const data = workbook.Sheets["Aktarılabilir veri"];
  const printable = workbook.Sheets["Baskı çizelgesi"];
  assert.equal(data.B2.t, "s");
  assert.equal(data.H2.t, "n");
  assert.equal(data.J2.t, "d");
  assert.equal(printable.A2.v, "Kurgu Anaokulu");
  assert.match(printable.A3.v, /Kurgu Deniz Sınıfı.+2026–2027 Kurgu Eğitim Yılı/u);
  assert.equal(printable[`A${GROWTH_PRINT_DATA_START_ROW}`].t, "n");
  assert.equal(printable[`B${GROWTH_PRINT_DATA_START_ROW}`].t, "s");
  assert.match(printable[`A${file.printRows.length}`].v, /Okul Öncesi Öğretmeni: Kurgu Öğretmen/u);
  assert.match(printable[`D${file.printRows.length}`].v, /^Tarih: \d{2}\.\d{2}\.\d{4}$/u);
  assert.match(printable[`F${file.printRows.length}`].v, /^İmza:/u);
  const printXml = packageText(file.bytes, "xl/worksheets/sheet2.xml");
  const workbookXml = packageText(file.bytes, "xl/workbook.xml");
  assert.match(printXml, /orientation="landscape"/u);
  assert.match(printXml, /fitToWidth="1"/u);
  assert.match(printXml, /state="frozen"/u);
  assert.match(workbookXml, /_xlnm\.Print_Area/u);
  assert.match(workbookXml, /_xlnm\.Print_Titles/u);
  assert.match(workbookXml, new RegExp(`\\$A:\\$B[^<]+\\$1:\\$${GROWTH_PRINT_HEADER_ROW}`, "u"));
  const sheets = readGrowthWorkbook(file.bytes.buffer.slice(file.bytes.byteOffset, file.bytes.byteOffset + file.bytes.byteLength), file.fileName);
  const importSheet = sheets.find(({ name }) => name === "Aktarılabilir veri");
  assert.ok(importSheet);
  const candidates = growthImportCandidates(importSheet, importSheet.suggestedHeader, importSheet.suggestedMapping);
  assert.ok(candidates.length >= 1);
  if (expectedPeriodKey) {
    assert.ok(file.dataRows.length >= 1);
    assert.ok(file.dataRows.every((row) => row[5] === expectedPeriodKey));
    assert.ok(candidates.every((candidate) => candidate.values.periodKey === expectedPeriodKey));
    assert.doesNotMatch(JSON.stringify(file.dataRows), /2027-06/u);
    assert.doesNotMatch(JSON.stringify(file.printRows), /Haziran/u);
    assert.match(file.fileName, /Eylul_2026/u);
  }
  const identities = new Set(file.printRows.filter((row) => /^[1-9]\d*$/u.test(row[0] ?? "")).map((row) => row[1]));
  assert.equal(identities.size, expectedStudents);
  const emptyRow = GROWTH_PRINT_DATA_START_ROW + (expectedPeriodKey || expectedStudents === 1 ? 1 : 4);
  for (const column of ["D", "E", "F", "G"]) {
    const cell = printable[`${column}${emptyRow}`];
    assert.ok(cell, `boş ${column}${emptyRow} hücresi çerçeve için OOXML'de bulunmalı`);
    assert.ok(cell.v === undefined || cell.v === null || cell.v === "", `boş ${column}${emptyRow} ölçüm değeri üretmemeli`);
    assert.ok(Number.isInteger(cell.s) || cell.s, `boş ${column}${emptyRow} hücresinin stili bulunmalı`);
  }
  return {
    selection: file.selection,
    printRange: printable["!ref"],
    printRowCount: file.printRows.length,
    studentCount: identities.size,
    importCandidateCount: candidates.length,
    valueType: data.H2.t,
    measuredOnType: data.J2.t,
    expectedPeriodKey: expectedPeriodKey ?? "full-year",
    blankMeasurementCellsStyled: true,
  };
}

function inspectPremiumDocx(bytes) {
  const documentXml = packageText(bytes, "word/document.xml");
  const numberingXml = packageText(bytes, "word/numbering.xml");
  const settingsXml = packageText(bytes, "word/settings.xml");
  const footerXml = packageText(bytes, "word/footer1.xml");
  assert.equal(count(documentXml, /<w:keepNext\/>/gu), 1);
  assert.equal(count(documentXml, /<w:pageBreakBefore\/>/gu), 1);
  assert.equal(count(documentXml, /<w:numPr>/gu), 36);
  assert.match(numberingXml, /<w:numFmt w:val="bullet"\/>/u);
  assert.match(settingsXml, /<w:updateFields w:val="true"\/>/u);
  assert.match(footerXml, /<w:instrText[^>]*> PAGE <\/w:instrText>/u);
  assert.match(footerXml, /<w:instrText[^>]*> NUMPAGES <\/w:instrText>/u);
  for (const sentinel of ["SENTINEL_KEEP_HEADING", "SENTINEL_KEEP_BODY", "SENTINEL_FORCE_HEADING", "WORD_LAYOUT_SON"]) {
    assert.equal(count(documentXml, new RegExp(sentinel, "gu")), 1);
  }
  return { keepNext: 1, forcedPageBreak: 1, numberedParagraphs: 36, paragraphCount: layoutParagraphs.length };
}

function inspectEk18Docx(bytes) {
  const documentXml = packageText(bytes, "word/document.xml");
  const tableCount = count(documentXml, /<w:tbl>/gu);
  const rowCount = count(documentXml, /<w:tr>/gu);
  const headerCount = count(documentXml, /<w:tblHeader\/>/gu);
  const cantSplitCount = count(documentXml, /<w:cantSplit\/>/gu);
  assert.ok(tableCount > 0);
  assert.equal(headerCount, tableCount);
  assert.equal(cantSplitCount, rowCount);
  for (const sentinel of ["EK18_COCUK_SON", "EK18_PROGRAM_SON", "EK18_OGRETMEN_SON", "EK18_ONERI_SON"]) {
    assert.equal(count(documentXml, new RegExp(sentinel, "gu")), 1);
  }
  assert.match(packageText(bytes, "word/settings.xml"), /<w:updateFields w:val="true"\/>/u);
  assert.match(packageText(bytes, "word/footer1.xml"), /<w:instrText[^>]*> NUMPAGES <\/w:instrText>/u);
  return { tableCount, rowCount, repeatedHeaderCount: headerCount, cantSplitCount };
}

const receipt = { generatedAtCivilDate: "2026-09-09", syntheticOnly: true, artifacts: [], checks: {} };
for (const [name, bytes] of artifacts) {
  await writeFile(resolve(output, name), bytes);
  receipt.artifacts.push({ name, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
}
receipt.checks.classTypes = inspectClassWorkbook(classTypes.bytes);
receipt.checks.classCompact = inspectCompactClassWorkbook(classCompact, compactRoster);
receipt.checks.growthClass = inspectGrowthWorkbook(growthClass, 40);
receipt.checks.growthIndividual = inspectGrowthWorkbook(growthIndividual, 1);
receipt.checks.growthSeptember = inspectGrowthWorkbook(growthSeptember, 40, "2026-09");
receipt.checks.premiumWord = inspectPremiumDocx(artifacts.find(([name]) => name === "premium-layout.docx")[1]);
receipt.checks.ek18Word = inspectEk18Docx(artifacts.find(([name]) => name === "ek18-long.docx")[1]);
receipt.passed = true;
await writeFile(resolve(output, "package-acceptance.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
