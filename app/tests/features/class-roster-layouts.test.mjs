import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CLASS_ROSTER_LAYOUTS,
  classRosterInputForPurpose,
  resolveClassRosterLayout,
} from "../../src/features/classroom/class-roster-layouts.ts";
import {
  createClassRosterExportModel,
  createClassRosterPdfDocument,
} from "../../src/features/classroom/class-roster-document.ts";
import { pdfPreviewRecipe } from "../../src/features/documents/pdf-preview-model.ts";
import { DEFAULT_SCHOOL_DOCUMENT_TEMPLATE } from "../../src/core/domain/school-document-template.ts";
import { classRosterExtremeFixture, classRosterFixture } from "../fixtures/class-roster-fixture.mjs";

const runtime = {
  fontBytes: new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url))),
  boldFontBytes: new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Bold.ttf", import.meta.url))),
};

function compact(value) {
  return value.replaceAll("\r", "").replace(/\s+/gu, " ").trim();
}

function dense(value) {
  return value.replace(/\s+/gu, "");
}

function extractPdfText(bytes, layout = true) {
  const result = spawnSync("pdftotext", [layout ? "-layout" : "-raw", "-enc", "UTF-8", "-", "-"], {
    input: bytes,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.replaceAll("\r", "");
}

function fixtureWithDistinctPhones() {
  const input = structuredClone(classRosterExtremeFixture());
  input.snapshot.students = input.snapshot.students.map((student, studentIndex) => ({
    ...student,
    contacts: Array.isArray(student.contacts)
      ? student.contacts.map((contact, contactIndex) => ({
          ...contact,
          phone: `05${String(studentIndex).padStart(2, "0")} ${String(contactIndex).padStart(3, "0")} 10 20`,
        }))
      : student.contacts,
  }));
  return input;
}

function realisticSinglePageExtremeFixture() {
  const input = classRosterFixture(15);
  const student = input.snapshot.students[0];
  student.displayName = "Kurgu Defne Alya Nur Şahinoğlu Çınaroğlu";
  student.contacts[0].name = "Kurgu Gülşah Nazlıcan Uzunoğulları Kahramanoğlu";
  student.contacts[0].occupation = "Üniversite çocuk gelişimi ve eğitimi uzmanı";
  student.contacts[0].phone = "+90 (532) 000 00 01 / 0258 000 00 02 dahili 125";
  student.contacts[1].name = "Kurgu Mehmet Ali Rıza Kahramanoğlu Çınaroğlu";
  student.contacts[1].occupation = "Elektrik elektronik proje ve saha mühendisi";
  student.contacts[2].relationship = "Anneanne ve okul çıkışı teslim yetkilisi";
  return input;
}

test("dört kullanım amacı sabit, ayrı ve kaynak girdisini değiştirmeyen alan presetleri sunar", () => {
  assert.deepEqual(
    CLASS_ROSTER_LAYOUTS.map((layout) => [layout.id, layout.purposeLabel, layout.orientation, layout.fileSegment]),
    [
      ["daily-classroom", "Sınıfta kullan", "portrait", "Gunluk"],
      ["contact-blocks", "İletişim için hazırla", "landscape", "Iletisim"],
      ["detailed-roster", "Ayrıntılı döküm al", "portrait", "Ayrintili"],
      ["single-page-roster", "Tek sayfa sınıf listesi", "landscape", "Tek_Sayfa"],
    ],
  );
  const input = { schoolName: "Kurgu Okulu" };
  const prepared = classRosterInputForPurpose(input, "daily-classroom");
  assert.deepEqual(prepared.columns, ["sequence", "schoolNumber", "name"]);
  assert.deepEqual(input, { schoolName: "Kurgu Okulu" });
  assert.equal(resolveClassRosterLayout("contact-blocks").defaultColumns.includes("address"), false);
  assert.throws(() => resolveClassRosterLayout("forged-layout"), /geçerli/iu);
});

test("günlük, iletişim ve ayrıntılı PDF düzenleri yön, alan, blok, dosya ve önizleme sözleşmesini korur", async () => {
  const input = fixtureWithDistinctPhones();
  const before = structuredClone(input);
  const dailyInput = {
    ...classRosterInputForPurpose(input, "daily-classroom"),
    columns: ["sequence", "schoolNumber", "name", "address"],
    schoolTemplate: { ...DEFAULT_SCHOOL_DOCUMENT_TEMPLATE, orientation: "landscape" },
  };
  const contactInput = {
    ...classRosterInputForPurpose(input, "contact-blocks"),
    columns: [...resolveClassRosterLayout("contact-blocks").defaultColumns, "address"],
    schoolTemplate: { ...DEFAULT_SCHOOL_DOCUMENT_TEMPLATE, orientation: "portrait" },
  };
  const detailedInput = {
    ...classRosterInputForPurpose(input, "detailed-roster"),
    schoolTemplate: { ...DEFAULT_SCHOOL_DOCUMENT_TEMPLATE, orientation: "landscape" },
  };
  const [daily, contact, detailed] = await Promise.all([
    createClassRosterPdfDocument(dailyInput, { runtime }),
    createClassRosterPdfDocument(contactInput, { runtime }),
    createClassRosterPdfDocument(detailedInput, { runtime }),
  ]);
  assert.deepEqual(input, before);

  const portraitBox = /\/MediaBox \[0 0 595\.28 841\.89\]/u;
  const landscapeBox = /\/MediaBox \[0 0 841\.89 595\.28\]/u;
  assert.match(Buffer.from(daily.bytes).toString("latin1"), portraitBox);
  assert.match(Buffer.from(contact.bytes).toString("latin1"), landscapeBox);
  assert.match(Buffer.from(detailed.bytes).toString("latin1"), portraitBox);
  assert.match(daily.fileName, /Sinif_Listesi_Gunluk/u);
  assert.match(contact.fileName, /Sinif_Listesi_Iletisim/u);
  assert.match(detailed.fileName, /Sinif_Listesi_Ayrintili/u);

  const dailyText = extractPdfText(daily.bytes);
  assert.match(dailyText, /Günlük sınıf çizelgesi/u);
  assert.match(dailyText, /Sıra\s+Okul no\.\s+Adı soyadı\s+1\s+2\s+3\s+4\s+5/u);
  assert.match(dailyText, /Ev adresi:/u, "günlük düzende seçilmiş ek alan satır altı bandında korunmalı");

  const contactText = extractPdfText(contact.bytes);
  const contactPages = contactText.split("\f").filter((page) => page.trim());
  assert.ok(contact.pageCount < input.snapshot.students.length, "olağan iletişim blokları aynı sayfayı paylaşmalı");
  assert.match(contact.html, /<th scope="colgroup" colspan="3">[^<]*Sıra no\.[^<]*Okul no\.[^<]*Adı soyadı/u);
  assert.ok(contact.html.indexOf('colspan="3"') < contact.html.indexOf('<th scope="col">Anne</th>'));
  assert.match(contact.html, /class="student-detail"><td colspan="3">Ev adresi:/u);
  for (const student of input.snapshot.students.slice(0, 6)) {
    const name = compact(String(student.displayName));
    const phone = compact(String(student.contacts?.[0]?.phone ?? ""));
    const page = contactPages.find((candidate) => compact(candidate).includes(name));
    assert.ok(page, `${name}: öğrenci kimlik bandı bulunmalı`);
    assert.ok(compact(page).includes(phone), `${name}: tam telefon aynı öğrenci bloğu ve sayfasında kalmalı`);
    assert.ok(page.split("\n").some((line) => compact(line).includes(phone)), `${name}: telefon rakamları satır ortasında bölünmemeli`);
  }
  const contactModel = createClassRosterExportModel(contactInput);
  const nameColumn = contactModel.columns.findIndex((column) => column.id === "name");
  const longestStudentName = contactModel.rows.map((row) => row[nameColumn] ?? "").sort((left, right) => right.length - left.length)[0] ?? "";
  const finalContactPage = contactPages.at(-1) ?? "";
  assert.ok(dense(finalContactPage).includes(dense(longestStudentName)), "son sayfa yalnız imzaya ayrılmamalı; uzun öğrenci bloğu imzayla kalmalı");
  assert.match(finalContactPage, /Okul Öncesi Öğretmeni/u);

  const detailedText = dense(extractPdfText(detailed.bytes, false));
  const detailedModel = createClassRosterExportModel(detailedInput);
  assert.equal(detailedModel.layout, "detailed-roster");
  for (const value of detailedModel.rows.flat().filter((candidate) => candidate && candidate !== "—")) {
    assert.ok(detailedText.includes(dense(value)), `ayrıntılı döküm seçilmiş değeri korumalı: ${compact(value).slice(0, 80)}`);
  }

  const recipe = pdfPreviewRecipe(contact.bytes);
  assert.equal(recipe?.initial.layout, "contact-blocks");
  assert.deepEqual(recipe?.layoutTemplates, ["contact-list"]);
  assert.deepEqual(recipe?.layouts?.map((layout) => layout.id), CLASS_ROSTER_LAYOUTS.map((layout) => layout.id));
  await assert.rejects(
    createClassRosterPdfDocument({ ...input, layout: "forged-layout" }, { runtime }),
    /geçerli/iu,
  );
});

test("tek sayfa düzeni 30 kişilik normal ve gerçekçi uç sınıfı tam kaynak değerleriyle tek yatay A4'e sığdırır", async () => {
  const normalInput = classRosterInputForPurpose(classRosterFixture(30), "single-page-roster");
  const extremeInput = classRosterInputForPurpose(realisticSinglePageExtremeFixture(), "single-page-roster");
  const [normal, extreme] = await Promise.all([
    createClassRosterPdfDocument(normalInput, { runtime }),
    createClassRosterPdfDocument(extremeInput, { runtime }),
  ]);
  for (const [label, input, file] of [["normal", normalInput, normal], ["uç", extremeInput, extreme]]) {
    assert.equal(file.pageCount, 1, `${label} fixture tek fiziksel sayfa olmalı`);
    assert.match(Buffer.from(file.bytes).toString("latin1"), /\/MediaBox \[0 0 841\.89 595\.28\]/u);
    assert.match(file.fileName, /Sinif_Listesi_Tek_Sayfa/u);
    const text = dense(extractPdfText(file.bytes, false));
    assert.ok(text.includes(dense(input.schoolName)));
    assert.ok(text.includes(dense(createClassRosterExportModel(input).metadata.classroomName)));
    assert.ok(text.includes(dense(`Okul Öncesi Öğretmeni: ${input.teacherName}`)));
    for (const student of input.snapshot.students) {
      const values = [
        student.displayName,
        student.nationalIdentityNumber,
        ...student.contacts.flatMap((contact) => contact.kind === "other"
          ? [contact.name, contact.relationship, contact.phone]
          : [contact.name, contact.occupation, contact.phone]),
      ];
      for (const value of values) assert.ok(text.includes(dense(String(value))), `${label}: seçilmiş kaynak değeri kaybolmamalı: ${String(value).slice(0, 60)}`);
    }
    assert.ok(!text.includes("Eczacı"), "üçüncü kişi mesleği bu kesin sütun setine eklenmemeli");
  }

  const subset = await createClassRosterPdfDocument(
    { ...classRosterFixture(2), layout: "single-page-roster", columns: ["name"] },
    { runtime },
  );
  const subsetText = extractPdfText(subset.bytes, false);
  assert.equal(subset.pageCount, 1);
  assert.match(subsetText, /Kurgu İpek Deniz Uzunoğulları Çınaroğlu/u);
  assert.doesNotMatch(subsetText, /10000000146|0532 000 00 01/u);
  await assert.rejects(
    createClassRosterPdfDocument({ ...classRosterFixture(1), layout: "single-page-roster", columns: ["name", "address"] }, { runtime }),
    /yalnız tanımlı 12/iu,
  );
  await assert.rejects(
    createClassRosterPdfDocument(classRosterInputForPurpose(classRosterFixture(31), "single-page-roster"), { runtime }),
    /en fazla 30/iu,
  );
  await assert.rejects(
    createClassRosterPdfDocument(classRosterInputForPurpose(classRosterExtremeFixture(), "single-page-roster"), { runtime }),
    /okunabilir yüzde|bir A4 sayfaya sığmadı/iu,
  );
});
