import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { createClassRosterSpreadsheet } from "../../src/features/classroom/class-roster-spreadsheet.ts";
import { createClassRosterExportModel } from "../../src/features/classroom/class-roster-document.ts";
import { CLASS_ROSTER_LAYOUTS } from "../../src/features/classroom/class-roster-layouts.ts";
import { classRosterFixture } from "../fixtures/class-roster-fixture.mjs";

test("contact blocks pack three ordinary children per page without splitting their zones", async () => {
  const input = classRosterFixture(9);
  input.snapshot.students[0].contacts = input.snapshot.students[0].contacts.slice(0, 3);
  const file = await createClassRosterSpreadsheet(input, { layout: "contact-blocks" });
  const archive = XLSX.CFB.read(file.bytes, { type: "array" });
  const xml = new TextDecoder().decode(XLSX.CFB.find(archive, "Root Entry/xl/worksheets/sheet2.xml").content);
  const breaks = [...xml.matchAll(/<brk id="(\d+)"/g)].map((match) => Number(match[1]));
  assert.deepEqual(breaks, [13, 22]);
  const book = XLSX.read(file.bytes, { type: "array", cellFormula: true });
  const print = book.Sheets["Kullanım baskısı"];
  assert.match(print.A6.v, /Anne telefonu:/);
  assert.match(print.B6.v, /Baba telefonu:/);
  assert.match(print.C6.v, /3\. kişi telefonu:/);
});

for (const layout of CLASS_ROSTER_LAYOUTS.filter((candidate) => candidate.id !== "single-page-roster")) test(`${layout.id}: selected source, linked print, safe print geometry`, async () => {
  const input = classRosterFixture(3);
  input.columns = ["schoolNumber", "name", "birthDate", "motherPhone", "otherName", "otherPhone", "address"];
  input.studentIds = [input.snapshot.students[0].id];
  input.snapshot.students[0].optionalCode = "00101";
  input.snapshot.students[0].contacts[0].phone = '=HYPERLINK("https://example.invalid")';
  const model = createClassRosterExportModel(input);
  const file = await createClassRosterSpreadsheet(input, { layout: layout.id });
  assert.match(file.fileName, new RegExp(`^MaarifOS_Sinif_Listesi_${layout.fileSegment}_`));
  const book = XLSX.read(file.bytes, { type: "array", cellFormula: true, cellNF: true, cellStyles: true });
  assert.deepEqual(book.SheetNames, ["Sınıf listesi", "Kullanım baskısı"]);
  const source = book.Sheets[book.SheetNames[0]];
  assert.equal(source.A8.v, "00101");
  assert.equal(source.C8.t, "n");
  assert.equal(source.D8.f, undefined);
  assert.equal(source.D8.v, input.snapshot.students[0].contacts[0].phone);
  assert.equal(source["!cols"][model.columns.length].hidden, true);
  const print = book.Sheets[book.SheetNames[1]];
  const formulaCells = Object.values(print).filter((cell) => cell?.f);
  assert.ok(formulaCells.length >= (layout.id === "contact-blocks" ? 3 : model.columns.length));
  for (const cell of formulaCells) {
    assert.match(cell.f, /COUNTIF\(.+<>1,NA\(\)/);
    assert.match(cell.f, /INDEX\(.+MATCH\(/);
    assert.doesNotMatch(cell.f, /HYPERLINK/);
  }
  for (const value of model.rows.flat().filter((v) => v !== "" && v !== "—" && !/^\d{2}\.\d{2}\.\d{4}$/.test(v))) {
    assert.ok(formulaCells.some((cell) => String(cell.v).includes(value)), `selected value missing from print: ${value}`);
  }
  if (layout.id === "daily-classroom") { assert.equal(print.D6.v, ""); assert.equal(print.D6.f, undefined); }
  const archive = XLSX.CFB.read(file.bytes, { type: "array" });
  const xml = new TextDecoder().decode(XLSX.CFB.find(archive, "Root Entry/xl/worksheets/sheet2.xml").content);
  assert.match(xml, new RegExp(`orientation="${layout.orientation}"`));
  assert.match(xml, /fitToWidth="1" fitToHeight="0"/);
  assert.match(xml, /state="frozen"/);
});

test("single-page-roster keeps the exact source-linked 12-column class view on one landscape print page", async () => {
  const input = classRosterFixture(30);
  const file = await createClassRosterSpreadsheet(input, { layout: "single-page-roster" });
  assert.match(file.fileName, /^MaarifOS_Sinif_Listesi_Tek_Sayfa_/u);
  const book = XLSX.read(file.bytes, { type: "array", cellFormula: true, cellStyles: true });
  assert.deepEqual(book.SheetNames, ["Sınıf listesi", "Kullanım baskısı"]);
  const print = book.Sheets["Kullanım baskısı"];
  assert.deepEqual(
    [print.A4.v, print.D4.v, print.G4.v, print.J4.v],
    ["Öğrenci", "Anne", "Baba", "Üçüncü kişi"],
  );
  assert.deepEqual(
    Array.from({ length: 12 }, (_, index) => print[XLSX.utils.encode_cell({ r: 4, c: index })].v),
    ["Sıra", "Öğrenci adı soyadı", "T.C. kimlik no.", "Adı soyadı", "Mesleği", "Telefonu", "Adı soyadı", "Mesleği", "Telefonu", "Adı soyadı", "Yakınlığı", "Telefonu"],
  );
  assert.deepEqual(
    [print.A6.v, print.B6.v, print.C6.v, print.D6.v, print.E6.v, print.F6.v],
    ["1", input.snapshot.students[0].displayName, "10000000146", input.snapshot.students[0].contacts[0].name, input.snapshot.students[0].contacts[0].occupation, input.snapshot.students[0].contacts[0].phone],
  );
  assert.match(print.J6.v, /Kurgu Yakın 1 Çınaroğlu · Kurgu İkinci Yakın/u);
  assert.equal(print.A36.v, "Okul Öncesi Öğretmeni");
  assert.equal(print.A37.v, input.teacherName);
  const printedValues = Object.values(print).map((cell) => String(cell?.v ?? "")).join("\n");
  assert.doesNotMatch(printedValues, /Emekli/u, "üçüncü kişinin mesleği tek sayfa düzenine girmemeli");
  for (const cell of Object.values(print).filter((candidate) => candidate?.f)) {
    assert.match(cell.f, /COUNTIF\(/u);
    assert.match(cell.f, /INDEX\(.+MATCH\(/u);
  }
  const archive = XLSX.CFB.read(file.bytes, { type: "array" });
  const xml = new TextDecoder().decode(XLSX.CFB.find(archive, "Root Entry/xl/worksheets/sheet2.xml").content);
  const stylesXml = new TextDecoder().decode(XLSX.CFB.find(archive, "Root Entry/xl/styles.xml").content);
  assert.match(xml, /orientation="landscape" fitToWidth="1" fitToHeight="1"/u);
  assert.match(xml, /ySplit="5"/u);
  assert.match(xml, /autoFilter ref="A5:L35"/u);
  assert.match(xml, /<c r="A6"[^>]*s="32">/u);
  assert.match(stylesXml, /<cellXfs count="33">[\s\S]*shrinkToFit="1"/u);
  assert.match(xml, /state="frozen"/u);

  const subset = await createClassRosterSpreadsheet({ ...classRosterFixture(2), columns: ["name"] }, { layout: "single-page-roster" });
  const subsetBook = XLSX.read(subset.bytes, { type: "array", cellFormula: true });
  const subsetPrint = subsetBook.Sheets["Kullanım baskısı"];
  assert.equal(subsetPrint.B6.v, "Kurgu İpek Deniz Uzunoğulları Çınaroğlu");
  assert.equal(subsetPrint.C6.v, "—");
  await assert.rejects(
    createClassRosterSpreadsheet({ ...classRosterFixture(1), columns: ["name", "address"] }, { layout: "single-page-roster" }),
    /yalnız tanımlı 12/iu,
  );
  await assert.rejects(
    createClassRosterSpreadsheet(classRosterFixture(31), { layout: "single-page-roster" }),
    /en fazla 30/iu,
  );
});
