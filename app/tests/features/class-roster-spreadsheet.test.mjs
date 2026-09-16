import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";

import {
  CLASS_ROSTER_COMPACT_DATA_START_ROW,
  CLASS_ROSTER_COMPACT_HEADER_ROW,
  CLASS_ROSTER_COMPACT_XLSX_SHEET_NAME,
  CLASS_ROSTER_XLSX_HEADER_ROW,
  CLASS_ROSTER_XLSX_MIME_TYPE,
  CLASS_ROSTER_XLSX_SHEET_NAME,
  createClassRosterSpreadsheet,
} from "../../src/features/classroom/class-roster-spreadsheet.ts";
import {
  createClassRosterExportModel,
} from "../../src/features/classroom/class-roster-document.ts";
import {
  ALL_CLASS_ROSTER_COLUMN_IDS,
} from "../../src/features/classroom/class-roster-columns.ts";
import {
  classRosterExtremeFixture,
  classRosterFixture,
} from "../fixtures/class-roster-fixture.mjs";

function workbookFrom(file) {
  return XLSX.read(file.bytes, {
    type: "array",
    cellStyles: true,
    cellNF: true,
    cellFormula: true,
    cellHTML: false,
  });
}

function worksheetFrom(file) {
  const workbook = workbookFrom(file);
  assert.deepEqual(workbook.SheetNames, [CLASS_ROSTER_XLSX_SHEET_NAME]);
  return { workbook, worksheet: workbook.Sheets[CLASS_ROSTER_XLSX_SHEET_NAME] };
}

function rowsFrom(worksheet) {
  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: true,
  });
}

function modelDisplayRowsFrom(worksheet, model) {
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  return Array.from({ length: range.e.r + 1 }, (_, rowIndex) =>
    Array.from({ length: range.e.c + 1 }, (_, columnIndex) => {
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
      if (!cell) return "";
      if (model.columns[columnIndex]?.id === "birthDate" && cell.t === "n") {
        return XLSX.SSF.format(cell.z ?? "dd.mm.yyyy", cell.v);
      }
      return String(cell.v ?? "");
    }));
}

function archiveText(file, path) {
  const archive = XLSX.CFB.read(file.bytes, { type: "array" });
  const entry = XLSX.CFB.find(archive, `Root Entry/${path}`);
  assert.ok(entry?.content, `${path} XLSX paketinde bulunmalı`);
  return new TextDecoder("utf-8").decode(entry.content);
}

function cellForColumn(worksheet, model, columnId, dataRow = 0) {
  const columnIndex = model.columns.findIndex((column) => column.id === columnId);
  assert.notEqual(columnIndex, -1, `${columnId} sütunu modelde bulunmalı`);
  return worksheet[XLSX.utils.encode_cell({
    r: CLASS_ROSTER_XLSX_HEADER_ROW + dataRow,
    c: columnIndex,
  })];
}

function relativeLuminance(hex) {
  const channels = hex.match(/../gu).map((value) => Number.parseInt(value, 16) / 255);
  const [red, green, blue] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function classRosterCompactLiveFixture() {
  const input = classRosterFixture(25);
  const first = input.snapshot.students[0];
  first.optionalCode = "0";
  first.contacts.push(
    { id: "00000000-0000-4000-8700-000000000001", kind: "other", name: "Kurgu Üçüncü Yakın", relationship: "Aile yakını", phone: "0532 000 00 05", occupation: "Hemşire" },
    { id: "00000000-0000-4000-8800-000000000001", kind: "other", name: "Kurgu Dördüncü Yakın", relationship: "Komşu", phone: "0532 000 00 06", occupation: "Öğretmen" },
  );
  input.snapshot.students[1].contacts[0].phone = "";
  input.snapshot.students[2].contacts[0].phone = `=HYPERLINK("https://example.invalid","Kurgu")`;
  const long = input.snapshot.students[6];
  long.displayName = "Kurgu " + "ŞahinoğluÇınaroğlu".repeat(7);
  long.contacts[0].name = "Kurgu " + "UzunoğullarıKahramanoğlu".repeat(4);
  long.contacts[0].occupation = "Kurgu çok uzun meslek ve görev açıklaması; kurum içindeki birim ve uzmanlık görevini eksiksiz belirten örnek kayıt";
  long.contacts[0].phone = "+90 (532) 000 00 01 / iş: 0258 000 00 02 / dahili: 125";
  long.contacts[2].name = "Kurgu " + "İncedenizUzunoğulları".repeat(4);
  long.contacts[2].relationship = "Aile yakını; okul çıkışında teslim için aile tarafından bildirilen kişi";
  long.contacts[2].phone = "+90 (532) 000 00 03 / alternatif: 0532 000 00 07";
  long.careDetails.homeAddress = "Kurgu Mahallesi, Uzun Öğretmenler Caddesi, Çınar Sitesi No: 125 Daire: 27; okul kapısının karşısında bulunan binanın arka giriş kapısı, Merkezefendi / Denizli. ".repeat(4).slice(0, 500);
  return input;
}

test("varsayılan 20 alan gerçek XLSX içinde ortak modelle birebir ve alan bazlı türlerle yazılır", async () => {
  const input = classRosterFixture(2);
  const first = input.snapshot.students[0];
  first.optionalCode = "000012";
  first.nationalIdentityNumber = "00123456789";
  first.contacts[0].phone = "0532 000 00 01";
  input.snapshot.students[1].birthDate = undefined;
  input.snapshot.students[1].enrollmentYear = undefined;
  const model = createClassRosterExportModel(input);
  const file = await createClassRosterSpreadsheet(input);

  assert.equal(file.mimeType, CLASS_ROSTER_XLSX_MIME_TYPE);
  assert.match(file.fileName, /^MaarifOS_Sinif_Listesi_.+\.xlsx$/u);
  assert.deepEqual([...file.bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.deepEqual(model.columns.map((column) => column.id), ALL_CLASS_ROSTER_COLUMN_IDS);
  assert.equal(model.rows.length, 3, "ilk öğrencinin iki yakını iki satırda kalmalı");
  assert.deepEqual(model.rowStudentIds.slice(0, 2), [first.id, first.id]);

  const { workbook, worksheet } = worksheetFrom(file);
  const actualRows = modelDisplayRowsFrom(worksheet, model);
  assert.equal(actualRows[0][0], "Sınıf Listesi");
  assert.deepEqual(actualRows[5], model.columns.map((column) => column.group));
  assert.deepEqual(
    actualRows[CLASS_ROSTER_XLSX_HEADER_ROW - 1],
    model.columns.map((column) => column.label),
  );
  assert.deepEqual(
    actualRows.slice(CLASS_ROSTER_XLSX_HEADER_ROW),
    model.rows.map((row) => [...row]),
    "XLSX veri satırları PDF ile ortak modelin kaynak dizgilerini aynen taşımalı",
  );
  for (const id of ["schoolNumber", "nationalId", "motherPhone", "otherPhone"]) {
    const cell = cellForColumn(worksheet, model, id);
    assert.equal(cell.t, "s", `${id} metin hücresi olmalı`);
    assert.equal(cell.f, undefined, `${id} formül taşımamalı`);
  }
  assert.equal(cellForColumn(worksheet, model, "schoolNumber").v, "000012");
  assert.equal(cellForColumn(worksheet, model, "nationalId").v, "00123456789");
  assert.equal(cellForColumn(worksheet, model, "motherPhone").v, "0532 000 00 01");
  assert.equal(cellForColumn(worksheet, model, "otherPhone", 1).v, "0532 000 00 04");
  assert.equal(cellForColumn(worksheet, model, "sequence").t, "n");
  assert.equal(cellForColumn(worksheet, model, "sequence").v, 1);
  assert.equal(cellForColumn(worksheet, model, "birthDate").t, "n");
  assert.equal(cellForColumn(worksheet, model, "birthDate").z, "dd\\.mm\\.yyyy");
  assert.equal(
    XLSX.SSF.format(
      cellForColumn(worksheet, model, "birthDate").z,
      cellForColumn(worksheet, model, "birthDate").v,
    ),
    "10.09.2020",
  );
  assert.equal(cellForColumn(worksheet, model, "enrollmentYear").t, "n");
  assert.equal(cellForColumn(worksheet, model, "enrollmentYear").v, 2025);
  assert.equal(cellForColumn(worksheet, model, "birthDate", 2).t, "s");
  assert.equal(cellForColumn(worksheet, model, "birthDate", 2).v, "—");
  assert.equal(cellForColumn(worksheet, model, "enrollmentYear", 2).t, "s");
  assert.equal(cellForColumn(worksheet, model, "enrollmentYear", 2).v, "—");

  assert.equal(worksheet["!autofilter"].ref, `A7:T${model.rows.length + 7}`);
  assert.equal(worksheet["!cols"].length, 20);
  assert.equal(worksheet["!merges"].length, 5, "yalnız belge üst bilgileri birleşmeli");
  assert.equal(workbook.Props.Title, "Sınıf Listesi");
  assert.equal(workbook.Props.Company, input.schoolName);
  assert.match(workbook.Props.Comments, /Kişisel veri içerir/u);
  assert.equal(worksheet.A1.c[0].a, "MaarifOS");
  assert.equal(worksheet.A1.c.hidden, true, "hücre notu varsayılan olarak kapalı kalmalı");
  assert.match(worksheet.A1.c[0].t, /Kişisel veri içerir/u, "not metni kaybolmamalı");

  const sheetXml = archiveText(file, "xl/worksheets/sheet1.xml");
  const commentsXml = archiveText(file, "xl/comments1.xml");
  const commentVml = archiveText(file, "xl/drawings/vmlDrawing1.vml");
  const stylesXml = archiveText(file, "xl/styles.xml");
  const customXml = archiveText(file, "docProps/custom.xml");
  const stringsXml = archiveText(file, "xl/sharedStrings.xml");
  assert.match(sheetXml, /<pane xSplit="3" ySplit="7" topLeftCell="D8" activePane="bottomRight" state="frozen"\/>/u);
  assert.match(sheetXml, /<autoFilter ref="A7:T10"\/>/u);
  assert.match(sheetXml, /<pageSetup [^>]*paperSize="9"[^>]*orientation="landscape"[^>]*fitToWidth="4"/u);
  assert.match(sheetXml, /<pageSetup [^>]*cellComments="none"/u);
  assert.match(commentsXml, /Seçili dönem, öğrenciler ve sütunlar/u);
  assert.doesNotMatch(commentVml, /<x:Visible\s*\/>/u, "not şekli açılmış gönderilmemeli");
  assert.match(commentVml, /visibility:hidden/u, "LibreOffice not şekli baskıda gizli kalmalı");
  assert.match(sheetXml, /showGridLines="0"/u);
  assert.match(sheetXml, /<tabColor rgb="FF42C7BD"\/>/u);
  assert.doesNotMatch(sheetXml, /<mergeCell ref="[A-Z]+6:[A-Z]+6"\/>/u);
  assert.match(stylesXml, /wrapText="1"/u);
  assert.match(stylesXml, /<numFmt numFmtId="164" formatCode="dd\\\.mm\\\.yyyy"\/>/u);
  assert.match(stylesXml, /numFmtId="164"[^>]*applyNumberFormat="1"/u);
  assert.match(stylesXml, /<name val="Roboto"\/>/u);
  const palette = [
    "42C7BD", "CFEFEB",
    "72B7F2", "D7E8FF",
    "F28C74", "FFE0D8",
    "F4C95D", "FFF0C2",
    "B8E9E5", "E8F8F6",
  ];
  for (const color of palette) {
    assert.match(stylesXml, new RegExp(`fgColor rgb="FF${color}"`, "u"));
    assert.ok(contrastRatio("17324D", color) >= 4.5, `${color} zemini en az 4,5:1 kontrast sağlamalı`);
  }
  for (const [cell, style] of [
    ["A6", 4], ["G6", 5], ["J6", 6], ["M6", 7], ["Q6", 8],
    ["A7", 9], ["G7", 10], ["J7", 11], ["M7", 12], ["Q7", 13],
  ]) {
    assert.match(sheetXml, new RegExp(`<c[^>]*r="${cell}"[^>]*s="${style}"`, "u"));
  }
  assert.match(customXml, /name="Eğitim yılı"><vt:lpwstr>2026–2027<\/vt:lpwstr>/u);
  assert.doesNotMatch(stringsXml, new RegExp(first.id, "u"), "iç öğrenci UUID'si XLSX'e yazılmamalı");
});

test("tek tek alan, öğrenci ve dönem seçimi yalnız ortak model sütunlarını dışa aktarır", async () => {
  const input = classRosterFixture(3);
  input.snapshot.academicYears[0].startDate = "2026-09-01";
  input.snapshot.academicYears[0].endDate = "2027-06-30";
  const selectedStudentId = input.snapshot.students[0].id;
  const selected = {
    ...input,
    studentIds: [selectedStudentId],
    period: { start: "2026-09-01", end: "2026-12-31" },
    columns: ["address", "motherPhone", "name"],
  };
  const model = createClassRosterExportModel(selected);
  const file = await createClassRosterSpreadsheet(selected);
  const { worksheet } = worksheetFrom(file);
  const actualRows = rowsFrom(worksheet);

  assert.deepEqual(model.columns.map((column) => column.id), ["name", "motherPhone", "address"]);
  assert.deepEqual(actualRows[6], model.columns.map((column) => column.label));
  assert.deepEqual(actualRows.slice(7), model.rows.map((row) => [...row]));
  assert.ok(model.rowStudentIds.every((id) => id === selectedStudentId));
  assert.equal(worksheet["!ref"], `A1:C${model.rows.length + 7}`);
  assert.equal(worksheet["!autofilter"].ref, `A7:C${model.rows.length + 7}`);

  const allText = archiveText(file, "xl/sharedStrings.xml");
  assert.doesNotMatch(allText, /10000000146/u, "seçilmemiş TCKN XLSX'e sızmamalı");
  assert.doesNotMatch(allText, /Elektrik mühendisi/u, "seçilmemiş baba mesleği XLSX'e sızmamalı");
  assert.match(allText, /01\.09\.2026 – 31\.12\.2026/u);
  const sheetXml = archiveText(file, "xl/worksheets/sheet1.xml");
  assert.match(sheetXml, /orientation="landscape"[^>]*fitToWidth="1"/u);
});

test("formül görünümlü kaynaklar aynen metin kalır ve hiçbir XLSX hücresi formül taşımaz", async () => {
  const input = classRosterFixture(1);
  const first = input.snapshot.students[0];
  const formulaLike = `=HYPERLINK("https://example.invalid","Kurgu")`;
  const plusLike = "+90 532 000 00 01";
  const atLike = "@kurgu teslim adresi";
  first.optionalCode = formulaLike;
  first.contacts[0].phone = plusLike;
  first.careDetails.homeAddress = atLike;
  const model = createClassRosterExportModel(input);
  const file = await createClassRosterSpreadsheet(input);
  const { worksheet } = worksheetFrom(file);

  assert.equal(cellForColumn(worksheet, model, "schoolNumber").v, formulaLike);
  assert.equal(cellForColumn(worksheet, model, "motherPhone").v, plusLike);
  const addressIndex = model.columns.findIndex((column) => column.id === "address");
  assert.equal(cellForColumn(worksheet, model, "address").v, model.rows[0][addressIndex]);
  assert.match(cellForColumn(worksheet, model, "address").v, /^@/u);
  for (const [address, cell] of Object.entries(worksheet)) {
    if (!address.startsWith("!")) assert.equal(cell.f, undefined, `${address} formül olmamalı`);
  }
  const sheetXml = archiveText(file, "xl/worksheets/sheet1.xml");
  const stringsXml = archiveText(file, "xl/sharedStrings.xml");
  assert.doesNotMatch(sheetXml, /<f(?:\s|>)/u);
  assert.match(stringsXml, /=HYPERLINK\(&quot;https:\/\/example\.invalid&quot;,&quot;Kurgu&quot;\)/u);
});

test("uzun meslek ve adres satırları wrap ile birlikte görünür satır yüksekliği alır", async () => {
  const input = classRosterExtremeFixture();
  const file = await createClassRosterSpreadsheet(input);
  const { worksheet } = worksheetFrom(file);
  const rows = rowsFrom(worksheet);
  const addressIndex = rows[6].indexOf("Ev adresi");
  const longDataIndex = rows.findIndex((row, index) =>
    index >= 7 && String(row[addressIndex] ?? "").length >= 400);
  assert.ok(longDataIndex >= 7, "uzun kurgu adres satırı bulunmalı");
  assert.ok(worksheet["!rows"][longDataIndex].hpt >= 100);
  const sheetXml = archiveText(file, "xl/worksheets/sheet1.xml");
  assert.match(sheetXml, new RegExp(`<row r="${longDataIndex + 1}" ht="(?:1[0-9]{2}|2[0-9]{2})" customHeight="1">`, "u"));
});

test("kısa iletişim baskısı 25 çocukta seçili tam veriyi korur ve iletişim altkümesini tek çocuk satırında basar", async () => {
  const input = classRosterCompactLiveFixture();
  const model = createClassRosterExportModel(input);
  const file = await createClassRosterSpreadsheet(input, { layout: "compact-contact" });
  const workbook = workbookFrom(file);
  assert.deepEqual(workbook.SheetNames, [CLASS_ROSTER_XLSX_SHEET_NAME, CLASS_ROSTER_COMPACT_XLSX_SHEET_NAME]);
  assert.match(file.fileName, /Kisa_Iletisim/u);

  const complete = workbook.Sheets[CLASS_ROSTER_XLSX_SHEET_NAME];
  const compact = workbook.Sheets[CLASS_ROSTER_COMPACT_XLSX_SHEET_NAME];
  const completeRows = modelDisplayRowsFrom(complete, model);
  const compactRows = rowsFrom(compact);
  assert.deepEqual(completeRows.slice(CLASS_ROSTER_XLSX_HEADER_ROW), model.rows.map((row) => [...row]));
  assert.deepEqual(compactRows[CLASS_ROSTER_COMPACT_HEADER_ROW - 1], [
    "Sıra", "Okul no", "Öğrenci", "Anne", "Baba", "Diğer yakın", "İletişim rolü",
  ]);
  const compactData = compactRows.slice(CLASS_ROSTER_COMPACT_DATA_START_ROW - 1)
    .filter((row) => typeof row[0] === "number");
  assert.equal(compactData.length, 25, "çok yakınlı çocuk da kısa baskıda tek satır olmalı");

  const completeText = JSON.stringify(completeRows);
  const compactText = JSON.stringify(compactRows);
  const compactValues = compactRows.flat().map((value) => String(value));
  for (const id of [
    "name", "motherName", "motherPhone", "fatherName", "fatherPhone",
    "otherName", "otherPhone", "otherRelationship", "priorityContact", "emergencyContact",
  ]) {
    const index = model.columns.findIndex((column) => column.id === id);
    for (const value of new Set(model.rows.map((row) => row[index]).filter((value) => value && value !== "—"))) {
      assert.ok(compactValues.some((cell) => cell.includes(value)), `${id} kısa baskıda tam korunmalı: ${value}`);
    }
  }
  assert.match(completeText, /Kurgu çok uzun meslek ve görev açıklaması/u);
  assert.match(completeText, /okul kapısının karşısında bulunan binanın arka giriş kapısı/iu);
  assert.doesNotMatch(compactText, /Kurgu çok uzun meslek ve görev açıklaması/u);
  assert.doesNotMatch(compactText, /okul kapısının karşısında bulunan binanın arka giriş kapısı/iu);

  const compactXml = archiveText(file, "xl/worksheets/sheet2.xml");
  const compactCommentsXml = archiveText(file, "xl/comments2.xml");
  const compactCommentVml = archiveText(file, "xl/drawings/vmlDrawing2.vml");
  const workbookXml = archiveText(file, "xl/workbook.xml");
  const firstCompactFormulas = ["A6", "B6", "C6", "D6", "E6", "F6", "G6"]
    .map((address) => compact[address]?.f);
  assert.ok(firstCompactFormulas.every((formula) => typeof formula === "string"));
  assert.match(compact.D6.f, /'Sınıf listesi'!\$G\$8/u);
  assert.match(compact.D6.f, /'Sınıf listesi'!\$H\$8/u);
  for (const sourceRow of [8, 9, 10, 11]) {
    assert.match(compact.F6.f, new RegExp(`'Sınıf listesi'!\\$M\\$${sourceRow}`, "u"));
    assert.match(compact.F6.f, new RegExp(`'Sınıf listesi'!\\$N\\$${sourceRow}`, "u"));
    assert.match(compact.F6.f, new RegExp(`'Sınıf listesi'!\\$O\\$${sourceRow}`, "u"));
  }
  const compactFormulaLengths = Object.entries(compact)
    .filter(([address, cell]) => !address.startsWith("!") && typeof cell?.f === "string")
    .map(([, cell]) => cell.f.length);
  assert.ok(Math.max(...compactFormulaLengths) < 8_192, "kurgu çoklu yakın formülleri Excel sınırını aşmamalı");
  assert.match(compactXml, /paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/u);
  assert.match(compactXml, /<pageSetup [^>]*cellComments="none"/u);
  assert.match(compactCommentsXml, /Yalnız seçili kısa iletişim alanlarını gösterir/u);
  assert.doesNotMatch(compactCommentVml, /<x:Visible\s*\/>/u);
  assert.match(compactCommentVml, /visibility:hidden/u);
  assert.match(compactXml, new RegExp(`ySplit="${CLASS_ROSTER_COMPACT_HEADER_ROW}"`, "u"));
  assert.match(compactXml, /<f>[^<]*_xlfn\.TEXTJOIN/u);
  assert.match(workbookXml, /<workbookView\b[^>]*activeTab="1"/u);
  assert.match(workbookXml, /<calcPr\b[^>]*calcMode="auto"[^>]*fullCalcOnLoad="1"[^>]*forceFullCalc="1"/u);
  assert.match(workbookXml, /_xlnm\.Print_Area[^<]+Kısa iletişim baskısı/u);
  assert.match(workbookXml, new RegExp(`_xlnm\\.Print_Titles[^<]+\\$1:\\$${CLASS_ROSTER_COMPACT_HEADER_ROW}`, "u"));
});

test("kısa iletişim formülleri boşu ve sıfırı korur, kullanıcı metnini formül gövdesine almaz", async () => {
  const input = classRosterFixture(2);
  const formulaLike = `=HYPERLINK("https://example.invalid","Kurgu")`;
  input.snapshot.students[0].optionalCode = "0";
  input.snapshot.students[0].contacts[0].phone = "";
  input.snapshot.students[1].contacts[0].phone = formulaLike;
  const selected = {
    ...input,
    columns: ["sequence", "schoolNumber", "name", "motherPhone"],
  };
  const file = await createClassRosterSpreadsheet(selected, { layout: "compact-contact" });
  const workbook = workbookFrom(file);
  const complete = workbook.Sheets[CLASS_ROSTER_XLSX_SHEET_NAME];
  const compact = workbook.Sheets[CLASS_ROSTER_COMPACT_XLSX_SHEET_NAME];

  assert.equal(complete.B8.t, "s");
  assert.equal(complete.B8.v, "0");
  assert.equal(complete.B8.f, undefined);
  assert.equal(compact.B6.v, "0", "sayısal görünümlü okul numarası formülde kaybolmamalı");
  assert.match(compact.B6.f, /'Sınıf listesi'!\$B\$8/u);
  assert.equal(compact.D6.v, "—", "modelin eksik değer yer tutucusu korunmalı");
  assert.match(compact.D6.f, /^IF\(ISBLANK\('Sınıf listesi'!\$D\$8\),"",/u,
    "Excel'de kaynak hücre temizlenince kompakt hücre boş kalmalı");
  assert.equal(complete.D9.v, formulaLike);
  assert.equal(complete.D9.f, undefined, "kullanıcı metni tam veri sayfasında formüle dönüşmemeli");
  assert.equal(compact.D7.v, formulaLike, "formül görünümlü metin başvuru sonucu olarak eksiksiz kalmalı");
  assert.match(compact.D7.f, /'Sınıf listesi'!\$D\$9/u);

  const compactFormulas = Object.entries(compact)
    .filter(([address, cell]) => !address.startsWith("!") && typeof cell?.f === "string")
    .map(([, cell]) => cell.f);
  assert.equal(compactFormulas.length, 8, "iki çocuk ve dört kısa sütunun her hücresi canlı olmalı");
  for (const formula of compactFormulas) {
    assert.doesNotMatch(formula, /HYPERLINK|example\.invalid|Kurgu/u);
    assert.match(formula, /'Sınıf listesi'!\$[A-D]+\$[0-9]+/u);
  }
  const compactXml = archiveText(file, "xl/worksheets/sheet2.xml");
  const formulasXml = [...compactXml.matchAll(/<f>([\s\S]*?)<\/f>/gu)]
    .map((match) => match[1]).join("\n");
  assert.doesNotMatch(formulasXml, /HYPERLINK|example\.invalid|Kurgu/u);
});

test("kısa iletişim baskısı kapatılmış alanları iki sayfaya da geri eklemez", async () => {
  const input = classRosterFixture(2);
  input.snapshot.students[0].nationalIdentityNumber = "KAPALI_TCKN_SENTINEL";
  input.snapshot.students[0].contacts[0].occupation = "KAPALI_MESLEK_SENTINEL";
  input.snapshot.students[0].careDetails.homeAddress = "KAPALI_ADRES_SENTINEL";
  const selected = { ...input, columns: ["sequence", "name", "motherPhone"] };
  const file = await createClassRosterSpreadsheet(selected, { layout: "compact-contact" });
  const workbook = workbookFrom(file);
  const allText = workbook.SheetNames.flatMap((name) => rowsFrom(workbook.Sheets[name]).flat()).join(" ");
  assert.doesNotMatch(allText, /KAPALI_TCKN_SENTINEL|KAPALI_MESLEK_SENTINEL|KAPALI_ADRES_SENTINEL/u);
  assert.deepEqual(rowsFrom(workbook.Sheets[CLASS_ROSTER_COMPACT_XLSX_SHEET_NAME])[CLASS_ROSTER_COMPACT_HEADER_ROW - 1], [
    "Sıra", "Öğrenci", "Anne",
  ]);
});

test("sahte sütun, öğrenci ve yinelenen seçim XLSX üretiminden önce reddedilir", async () => {
  const input = classRosterFixture(1);
  await assert.rejects(
    createClassRosterSpreadsheet({ ...input, columns: [] }),
    /En az bir geçerli sınıf listesi alanı/u,
  );
  await assert.rejects(
    createClassRosterSpreadsheet({ ...input, columns: ["name", "name"] }),
    /alanlar tekrarlanamaz/u,
  );
  await assert.rejects(
    createClassRosterSpreadsheet({ ...input, columns: ["forged-column"] }),
    /geçerli sınıf listesi alanı/u,
  );
  await assert.rejects(
    createClassRosterSpreadsheet({ ...input, studentIds: [] }),
    /En az bir geçerli öğrenci seçin/u,
  );
  await assert.rejects(
    createClassRosterSpreadsheet({ ...input, studentIds: [input.snapshot.students[0].id, input.snapshot.students[0].id] }),
    /seçim tekrarlanamaz/u,
  );
  await assert.rejects(
    createClassRosterSpreadsheet({ ...input, studentIds: ["00000000-0000-4000-8999-000000000999"] }),
    /eğitim yılına ait değil/u,
  );
});
