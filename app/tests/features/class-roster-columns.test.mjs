import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { CLASS_ROSTER_COLUMNS, ALL_CLASS_ROSTER_COLUMN_IDS, resolveClassRosterColumns } from "../../src/features/classroom/class-roster-columns.ts";
import { createClassRosterExportModel, createClassRosterDocument, createClassRosterPdfDocument } from "../../src/features/classroom/class-roster-document.ts";
import { pdfPreviewRecipe } from "../../src/features/documents/pdf-preview-model.ts";
import { classRosterFixture, classRosterExtremeFixture } from "../fixtures/class-roster-fixture.mjs";

const boldFontBytes = new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Bold.ttf", import.meta.url)));
const fontBytes = new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url)));
const runtime = { fontBytes, boldFontBytes };
function extract(bytes) {
  const result = spawnSync("pdftotext", ["-raw", "-", "-"], { input: Buffer.from(bytes), encoding: "utf8" });
  assert.equal(result.status, 0, "PDF metni gerçek ayrıştırıcıyla okunmalıdır");
  return result.stdout.replace(/\s+/gu, " ");
}

test("20 standart alan varsayılan seçilidir; okul no ayrı metin sütunudur ve kaynak değişmez", async () => {
  const input = classRosterExtremeFixture(); input.snapshot.students[0].optionalCode = "0000842";
  const before = structuredClone(input);
  const model = createClassRosterExportModel(input);
  assert.equal(model.columns.length, 20); assert.equal(new Set(model.columns.map(c=>c.id)).size, 20);
  assert.deepEqual(model.columns.map(c=>c.id), ALL_CLASS_ROSTER_COLUMN_IDS);
  const school = model.columns.findIndex(c=>c.id==="schoolNumber"); assert.equal(model.rows[0][school], "0000842");
  assert.equal(model.metadata.studentCount, 15); assert.equal(model.rows.length,18);
  assert.ok(model.rows.every(row=>row.length===20)); assert.deepEqual(input,before);
  const file = await createClassRosterPdfDocument(input,{runtime}); const text=extract(file.bytes);
  assert.match(text,/0000842/u); assert.match(file.html, /data-label="Okul numarası"/u);
  assert.match(file.html, /colspan="5">Öğrencinin/u);
  assert.match(text,/Sınıf Listesi/u); assert.doesNotMatch(text,/SINIF LİSTESİ|60–72 Ay|Öğrenci ve veli iletişim çizelgesi/u);
  assert.match(text,/Yaş grubu: 60–72 ay/u);
  const recipe=pdfPreviewRecipe(file.bytes); assert.deepEqual(recipe.initial.fields,ALL_CLASS_ROSTER_COLUMN_IDS);
  assert.equal(recipe.initial.studentIds.length,15); assert.equal(recipe.printEnabled,true);
  assert.deepEqual(recipe.exportActions[0].templates,["contact-list"]);
});

test("boş, bilinmeyen ve yinelenen alanlar tüm çıktı girişlerinde reddedilir", async () => {
  for (const columns of [[],["unknown"],["name","name"],null]) {
    const input={...classRosterFixture(1),columns};
    assert.throws(()=>resolveClassRosterColumns(columns));
    assert.throws(()=>createClassRosterExportModel(input)); assert.throws(()=>createClassRosterDocument(input));
    await assert.rejects(createClassRosterPdfDocument(input,{runtime}));
  }
  const fixture=classRosterFixture(1);
  for (const studentIds of [[],null,"invalid",[null],[""],[fixture.snapshot.students[0].id,fixture.snapshot.students[0].id],["missing"]]) {
    const input={...fixture,studentIds};
    assert.throws(()=>createClassRosterExportModel(input), /öğrenci|seçim/u);
    assert.throws(()=>createClassRosterDocument(input), /öğrenci|seçim/u);
    await assert.rejects(createClassRosterPdfDocument(input,{runtime}), /öğrenci|seçim/u);
  }
});

test("kuruma ait özel yıl ve sınıf adı sadeleştirme sırasında kesilmez", async () => {
  const input=classRosterFixture(1);
  input.snapshot.academicYears[0].name="2026–2027 Doğa Eğitimi Özel Dönemi";
  input.snapshot.classrooms[0].name="Kurgu Özel Sınıf · 24–30 Ay";
  const model=createClassRosterExportModel(input);
  assert.equal(model.metadata.academicYearLabel,"2026–2027 Doğa Eğitimi Özel Dönemi");
  assert.equal(model.metadata.classroomName,"Kurgu Özel Sınıf · 24–30 Ay");
  const text=extract((await createClassRosterPdfDocument(input,{runtime})).bytes);
  assert.match(text,/2026–2027 Doğa Eğitimi Özel Dönemi/u);
  assert.match(text,/Kurgu Özel Sınıf · 24–30 Ay/u);
});

test("yalnız seçilen kişinin alanları satır sayısını belirler; gizli yakınlar kimliği çoğaltmaz", async () => {
  const input=classRosterExtremeFixture();
  for (const columns of [["schoolNumber","name"],["motherPhone"],["priorityContact"],["address"]]) {
    const model=createClassRosterExportModel({...input,columns});
    assert.equal(model.rows.length,15);
    assert.equal(new Set(model.rowStudentIds).size,15);
  }
  for (const columns of [["otherPhone"],["otherOccupation"],["name","otherRelationship"]]) {
    const model=createClassRosterExportModel({...input,columns});
    assert.equal(model.rows.length,18);
    assert.equal(model.rowStudentIds.filter(id=>id===input.snapshot.students[0].id).length,4);
  }
  const single={...input,studentIds:[input.snapshot.students[0].id],schoolTemplate:{layout:"official",headerLines:[],logo:null,signatureLayout:"teacher-right",principalName:"",orientation:"portrait"}};
  const text=extract((await createClassRosterPdfDocument(single,{runtime})).bytes);
  assert.equal(text.match(/10000000146/gu)?.length,1,"portre ayrıntı bandında sabit T.C. yalnız bir kez basılmalı");
  assert.equal(text.match(/10\.09\.2020/gu)?.length,1,"portre ayrıntı bandında sabit doğum tarihi yalnız bir kez basılmalı");
});

test("her alan tek başına portre ve yatay çıkar; başka öğrenci/contact alanı eklenmez", async () => {
  const input=classRosterFixture(1);
  for (const column of CLASS_ROSTER_COLUMNS) {
    const selected={...input,columns:[column.id]};
    const model=createClassRosterExportModel(selected); assert.deepEqual(model.columns.map(c=>c.id),[column.id]);
    for (const orientation of ["portrait","landscape"]) {
      const file=await createClassRosterPdfDocument({...selected,schoolTemplate:{layout:"official",headerLines:[],logo:null,signatureLayout:"teacher-right",principalName:"",orientation}},{runtime});
      const text=extract(file.bytes);
      if(column.id!=="name") assert.doesNotMatch(text,/Kurgu İpek Deniz Uzunoğulları Çınaroğlu/u);
      if(column.id!=="motherName") assert.doesNotMatch(text,/Kurgu Anne 1 Çınaroğlu/u);
      if(column.id!=="fatherName") assert.doesNotMatch(text,/Kurgu Baba 1 Çınaroğlu/u);
      if(column.id!=="otherName") assert.doesNotMatch(text,/Kurgu Yakın 1 Çınaroğlu|Kurgu İkinci Yakın/u);
      if(column.id!=="address") assert.doesNotMatch(text,/Öğretmenler Caddesi/u);
      if(column.id!=="nationalId") assert.doesNotMatch(text,/10000000146/u);
      if(column.id!=="birthDate") assert.doesNotMatch(text,/10\.09\.2020/u);
      assert.doesNotMatch(text,/ÖZEL_ÇOCUK_NOTU|ÖZEL_AİLE_NOTU/u);
      for(const value of model.rows.flat().filter(value=>value&&value!=="—")) assert.ok(text.replace(/\s/gu,"").includes(value.replace(/\s/gu,"")), `${column.id}: seçili değer korunmalı`);
    }
  }
});

test("iletişim bayrakları kişi adlarından ayrıdır; tek tek kapanınca başka hücrede görünmez", async()=>{
  for(const [id,label] of [["priorityContact","Öncelikli iletişim"],["emergencyContact","Acil iletişim"],["pickupAuthorization","Teslim yetkilisi"]]) {
    const file=await createClassRosterPdfDocument({...classRosterFixture(1),columns:ALL_CLASS_ROSTER_COLUMN_IDS.filter(column=>column!==id)},{runtime});
    assert.ok(!extract(file.bytes).includes(label)); assert.ok(!file.html.includes(label));
  }
  const model=createClassRosterExportModel({...classRosterFixture(1),columns:["priorityContact","emergencyContact","pickupAuthorization"]});
  assert.deepEqual(model.rows[0],["Anne","Anne","Baba · 3. kişi"]);
  assert.ok(model.rows.flat().every(value=>!value.includes("Kurgu")));
});

test("şablon geçişleri granular20 ve legacy4 alanları doğru ayırır; özel care varsayılan kapalıdır", async()=>{
  const file=await createClassRosterPdfDocument(classRosterFixture(1),{runtime}); const recipe=pdfPreviewRecipe(file.bytes);
  assert.deepEqual(recipe.defaultFieldsForTemplate["student-record"],["identity","contacts","address"]);
  const card=await recipe.build({...recipe.initial,template:"student-record",fields:["identity"]});
  assert.match(extract(card.bytes),/BİREYSEL ÖĞRENCİ BİLGİLERİ/u); assert.doesNotMatch(extract(card.bytes),/0532 000 00 01/u);
  const cardRecipe=pdfPreviewRecipe(card.bytes);
  const contact=await cardRecipe.build({...cardRecipe.initial,template:"contact-list",fields:["schoolNumber"]});
  const text=extract(contact.bytes); assert.match(text,/101/u); assert.doesNotMatch(text,/Kurgu İpek Deniz/u);
  await assert.rejects(recipe.build({...recipe.initial,template:"contact-list",fields:["care"]}));
  const legacy=await createClassRosterPdfDocument({...classRosterFixture(1),fields:["contacts"]},{runtime});
  assert.match(extract(legacy.bytes),/0532 000 00 01/u); assert.doesNotMatch(extract(legacy.bytes),/10000000146/u);
});
