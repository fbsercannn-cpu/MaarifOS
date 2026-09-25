import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import {
  createParentContactWorkbookBuffer,
  formatParentContactDate,
  mapStudentsToParentContactRows,
} from "../../src/services/parent-contact-template-service.ts";
import { createTodayStudentCards } from "../../src/features/today/today-screen-model.ts";

function student(index) {
  return {
    name: `Çocuk ${index}`,
    optionalCode: String(index),
    nationalIdentityNumber: index === 1 ? "10000000146" : "",
    birthDate: "2021-09-24",
    contacts: [
      { kind: "mother", name: `Anne Soyad ${index}`, phone: "+90 555 111 22 33", occupation: "Öğretmen" },
      { kind: "father", name: `Baba Soyad ${index}`, phone: "05554445566", occupation: "Mühendis" },
      { kind: "other", name: `Yakın ${index}`, phone: "05557778899", relationship: "Teyze" },
    ],
  };
}

test("veli çizelgesi öğrenci ile anne, baba ve üçüncü kişi bilgisini eksiksiz eşler", () => {
  const [row] = mapStudentsToParentContactRows([student(1)]);
  assert.deepEqual(row, {
    no: "1", fullName: "Çocuk 1", nationalId: "10000000146", birthDate: "24/09/2021",
    motherName: "Anne Soyad 1", motherPhone: "0555 111 22 33", motherOccupation: "Öğretmen",
    fatherName: "Baba Soyad 1", fatherPhone: "0555 444 55 66", fatherOccupation: "Mühendis",
    thirdPersonName: "Yakın 1", thirdPersonPhone: "0555 777 88 99", thirdPersonRelation: "Teyze",
  });
  assert.equal(formatParentContactDate("2026-09-24"), "24/09/2026");
  assert.deepEqual(mapStudentsToParentContactRows([]), []);
});

test("Bugün ekranı Excel için gerekli kimlik ve veli alanlarını kaybetmez", () => {
  const source = { ...student(1), id: crypto.randomUUID(), status: "present", firstName: "Çocuk", lastName: "Bir" };
  const [card] = createTodayStudentCards([source], new Map());
  assert.equal(card.nationalIdentityNumber, "10000000146");
  assert.equal(card.firstName, "Çocuk");
  assert.equal(card.lastName, "Bir");
  assert.equal(card.contacts.length, 3);
  assert.equal(mapStudentsToParentContactRows([card])[0].motherName, "Anne Soyad 1");
});

test("22 öğrenci şablonun on dokuzar satırlık sayfalarında eksiksiz ve yatay A4 yazılır", async () => {
  const bytes = await createParentContactWorkbookBuffer(
    Array.from({ length: 22 }, (_, index) => student(index + 1)),
    { classroomName: "Ceviz Ağacı", teacherName: "Emine Öğretmen" },
    readFileSync(new URL("../../public/templates/veli-iletisim-sablonu.xlsx", import.meta.url)),
  );
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true, cellNF: true, cellStyles: true });
  assert.deepEqual(workbook.SheetNames, ["Sayfa1", "Sayfa2", "Sayfa3"]);
  assert.equal(workbook.Sheets.Sayfa1.E4.v, "Anne Soyad 1");
  assert.equal(workbook.Sheets.Sayfa1.H4.v, "Baba Soyad 1");
  assert.equal(workbook.Sheets.Sayfa2.B6.v, "Çocuk 22");
  assert.equal(workbook.Sheets.Sayfa2.I25.v, "Emine Öğretmen");
  assert.equal(workbook.Sheets.Sayfa1.D4.z.replaceAll("\\", ""), "dd/mm/yyyy");
  const archive = await JSZip.loadAsync(bytes);
  for (let index = 1; index <= 3; index += 1) {
    const xml = await archive.file(`xl/worksheets/sheet${index}.xml`).async("string");
    assert.match(xml, /orientation="landscape"/u);
    assert.match(xml, /paperSize="9"/u);
    assert.match(xml, /<mergeCell ref="A1:L1"\/>/u);
    assert.match(xml, /<col min="2" max="2" width="17\.5703125"/u);
  }
});
