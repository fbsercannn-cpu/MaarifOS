import test from "node:test";
import assert from "node:assert/strict";
import { createFamilyMeetingFormDocx,familyMeetingDocumentParts } from "../../src/features/family-engagement/family-meeting-form-document.ts";
import { readDocxParts } from "../fixtures/word-design-fixtures.mjs";
const model={schoolName:"Kurgu Okul",classroomName:"Kurgu Sınıf",studentName:"Kurgu Çocuk",teacherName:"Kurgu Öğretmen",appointment:{scheduledOn:"2026-09-22",startTime:"14:00",endTime:"14:20",location:"Sınıf"},agenda:["Kayıtlı destek gündemi"],observations:[{id:"a",civilDate:"2026-09-08",rawText:"  Çocuk ‘birlikte’ dedi.\nİki parçayı taşıdı.  ",selected:true}],meeting:{actualAtUtc:"2026-09-22T11:05:00.000Z",participants:"Kurgu Veli",discussion:"Gerçek öğretmen notu",decision:"Gerçek ortak karar",followupOn:"2026-09-29"},tasks:[{owner:"teacher",text:"Yeni gerçek gözlem fırsatı sunmak",dueOn:"2026-09-28",completed:false}]};
test("Word gerçek başlık/sayfa alanları ve düzenlenebilir tekrarlanan tablo başlıklarını korur",()=>{
  const parts=readDocxParts(createFamilyMeetingFormDocx(model)),xml=parts.get("word/document.xml");assert.match(xml,/w:pStyle w:val="Title"/u);assert.match(xml,/<w:tblHeader\/>/u);assert.match(xml,/<w:cantSplit\/>/u);assert.doesNotMatch(xml,/w:hRule="exact"/u);assert.match(xml,/14:05/u);assert.match(xml,/Planlanan:/u);assert.match(xml,/Gerçek görüşme:/u);assert.match(xml,/Gerçek öğretmen notu/u);assert.match(parts.get("word/footer1.xml"),/ PAGE /u);assert.match(parts.get("word/footer1.xml"),/ NUMPAGES /u);assert.equal((xml.match(/<w:tbl>/gu)||[]).length,2);
});
test("Hazırlık formu sonuç uydurmaz; çıktı alan seçimi ve özgün gözlem metni korunur",()=>{
  const parts=familyMeetingDocumentParts({...model,meeting:null,tasks:[]});assert.match(parts.status,/sonuç kaydı yok/u);assert.ok(parts.source.includes(model.observations[0].rawText));assert.doesNotMatch(parts.result,/Gerçek öğretmen notu/u);
  const excluded=readDocxParts(createFamilyMeetingFormDocx(model,["result"])).get("word/document.xml");assert.doesNotMatch(excluded,/Çocuk ‘birlikte’/u);assert.doesNotMatch(excluded,/Yeni gerçek gözlem fırsatı/u);assert.match(excluded,/Gerçek öğretmen notu/u);
});
