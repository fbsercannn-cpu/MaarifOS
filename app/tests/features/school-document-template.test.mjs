import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { PDFDocument, PDFName } from "pdf-lib";
import { growthFixture, growthScope, growthNow, GrowthMemoryStore, growthUid } from "../fixtures/growth-measurements-fixture.mjs";
import { DEFAULT_SCHOOL_DOCUMENT_TEMPLATE, isSchoolDocumentTemplateRecord, isSchoolDocumentTemplate, assertSchoolDocumentTemplateRelationships, schoolDocumentLogoDimensions, schoolDocumentTemplateRecords } from "../../src/core/domain/school-document-template.ts";
import { appendSchoolDocumentTemplate } from "../../src/features/school-document-template/school-document-template-service.ts";
import { createSchoolStyledPdf } from "../../src/features/school-document-template/school-document-template-pdf.ts";
import { createSemanticTaggedPdf } from "../../src/features/documents/semantic-tagged-pdf.ts";
import { turkishDocumentName, turkishDocumentAddress, turkishDocumentDescription } from "../../src/core/domain/turkish-document-display.ts";
import { createClassRosterPdfDocument } from "../../src/features/classroom/class-roster-document.ts";
import { classRosterFixture } from "../fixtures/class-roster-fixture.mjs";

const boldFontBytes = new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Bold.ttf", import.meta.url)));
const template = () => structuredClone(DEFAULT_SCHOOL_DOCUMENT_TEMPLATE);
const fontBytes = new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url)));
function logo() {
  const crc = data => { let value = 0xffffffff; for (const byte of data) { value ^= byte; for (let i=0;i<8;i++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1; } return (value ^ 0xffffffff) >>> 0; };
  const chunk = (name, data) => { const content = Buffer.concat([Buffer.from(name),data]), len = Buffer.alloc(4), checksum = Buffer.alloc(4); len.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(content)); return Buffer.concat([len,content,checksum]); };
  const header=Buffer.alloc(13);header.writeUInt32BE(16,0);header.writeUInt32BE(16,4);header[8]=8;header[9]=2;
  const raw=Buffer.alloc(16*(16*3+1));for(let y=0;y<16;y++) for(let x=0;x<16;x++){const at=y*49+1+x*3;raw[at]=10;raw[at+1]=120;raw[at+2]=100;}
  return { dataUrl:"data:image/png;base64,"+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]).toString("base64"),width:16,height:16 };
}
test("Türkçe belge gösterimi ad, ek, kısaltma ve adres rakamlarını kaynak değiştirmeden işler",()=>{
  assert.equal(turkishDocumentName("İPEK IŞIK ÖZTÜRK"),"İpek Işık Öztürk");
  assert.equal(turkishDocumentName("AYŞE-NUR ANKARA'NIN"),"Ayşe-Nur Ankara'nın");
  const address="T.C. MEB TOKİ AŞAĞI MAHALLESİ ÇINAR CADDESİ No: 12 / 2 A BLOK PTT YANI";
  assert.equal(turkishDocumentAddress(address),"T.C. MEB TOKİ Aşağı Mahallesi Çınar Caddesi No: 12 / 2 A Blok PTT Yanı");
  assert.equal(turkishDocumentDescription("MEB ÖĞRETMENİ"),"MEB öğretmeni");
  assert.equal(turkishDocumentAddress("+90 (532) 000 00 01 / 0258 000 00 02"),"+90 (532) 000 00 01 / 0258 000 00 02");
  assert.equal(address,"T.C. MEB TOKİ AŞAĞI MAHALLESİ ÇINAR CADDESİ No: 12 / 2 A BLOK PTT YANI");
});
test("şablon kaydı katı alanlar, raster ölçüleri ve başlık sınırlarını doğrular",async()=>{
  const store=new GrowthMemoryStore(growthFixture());
  const record=await appendSchoolDocumentTemplate(store,{template:{...template(),logo:logo(),headerLines:["T.C.","Kurgu Okul"]},expectedScope:growthScope,expectedHead:null,now:growthNow});
  assert.ok(isSchoolDocumentTemplateRecord(record));
  assert.ok(!isSchoolDocumentTemplateRecord({...record,extra:true}));
  assert.ok(!isSchoolDocumentTemplate({...template(),headerLines:["x".repeat(161)]}));
  assert.ok(!isSchoolDocumentTemplate({...template(),headerLines:["a","b","c","d"]}));
  assert.ok(!isSchoolDocumentTemplate({...template(),logo:{...logo(),width:17}}));
  assert.equal(schoolDocumentLogoDimensions("data:image/svg+xml;base64,PHN2Zy8+"),null);
  assert.equal(schoolDocumentLogoDimensions("https://example.invalid/logo.png"),null);
  const snapshot=await store.readSnapshot();
  assert.throws(()=>assertSchoolDocumentTemplateRelationships({...snapshot,classrooms:[]}));
});
test("değişen sınıf, eski head ve geri alınmış saat yazmadan reddedilir",async()=>{
  const store=new GrowthMemoryStore(growthFixture());
  await assert.rejects(appendSchoolDocumentTemplate(store,{template:template(),expectedScope:{...growthScope,classroomId:growthUid(999)},expectedHead:null,now:growthNow}),/sınıf değişti/u);
  const first=await appendSchoolDocumentTemplate(store,{template:template(),expectedScope:growthScope,expectedHead:null,now:growthNow});
  const before=await store.readSnapshot();
  await assert.rejects(appendSchoolDocumentTemplate(store,{template:template(),expectedScope:growthScope,expectedHead:null,now:growthNow}),/başka bir işlemde/u);
  await assert.rejects(appendSchoolDocumentTemplate(store,{template:template(),expectedScope:growthScope,expectedHead:first.id,now:new Date(growthNow.getTime()-120000)}),/saati/u);
  assert.deepEqual(await store.readSnapshot(),before);
  const second=await appendSchoolDocumentTemplate(store,{template:{...template(),headerLines:["İkinci sürüm"]},expectedScope:growthScope,expectedHead:first.id,now:growthNow});
  assert.equal(second.workflow.previousEventId,first.id);assert.equal(schoolDocumentTemplateRecords(await store.readSnapshot()).length,2);
});
test("şablon zincirinde silinen/çapraz scope kaynak ve değişmiş zaman reddedilir",async()=>{
  const store=new GrowthMemoryStore(growthFixture());
  const first=await appendSchoolDocumentTemplate(store,{template:template(),expectedScope:growthScope,expectedHead:null,now:growthNow});
  await appendSchoolDocumentTemplate(store,{template:template(),expectedScope:growthScope,expectedHead:first.id,now:growthNow});
  const s=await store.readSnapshot();s.settings=s.settings.filter(r=>r.id!==first.id);
  assert.throws(()=>assertSchoolDocumentTemplateRelationships(s),/zinciri/u);
});
test("logosuz varsayılan PDF eski baytları korur; logolu PDF etiket, font ve sayfaları korur",async()=>{
  const document={title:"Kurgu Belge",orientation:"landscape",nodes:[{kind:"heading",level:1,text:"Kurgu Belge"},{kind:"table",headers:["Sıra","Öğrenci"],rows:Array.from({length:80},(_,i)=>[String(i+1),`Kurgu Öğrenci ${i+1}`]),fontSize:9}]};
  const original=await createSemanticTaggedPdf(document,{fontBytes});
  assert.deepEqual(await createSchoolStyledPdf(document,null,{teacherName:"Kurgu Öğretmen"},{fontBytes}),original);
  const bytes=await createSchoolStyledPdf(document,{...template(),logo:logo(),headerLines:["T.C.","Kurgu Okul"],signatureLayout:"teacher-and-principal",principalName:"KURGU MÜDÜR"},{teacherName:"KURGU ÖĞRETMEN"},{fontBytes});
  const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>=2);
  assert.ok(pdf.catalog.get(PDFName.of("StructTreeRoot")));assert.ok(pdf.catalog.get(PDFName.of("MarkInfo")));
  assert.ok(new TextDecoder().decode(bytes).includes("/Subtype /Image"));
  assert.ok(new TextDecoder().decode(bytes).includes("/FontFile2"));
  for(const p of pdf.getPages()){assert.ok(Math.abs(p.getWidth()-841.89)<.1);assert.ok(Math.abs(p.getHeight()-595.28)<.1);}
});
test("14 sütun XLS başlık grubu ve gizlilik seçimi tüm baytlarda korunur",async()=>{
  const input=classRosterFixture(1), original=structuredClone(input.snapshot);
  const file=await createClassRosterPdfDocument(input,{runtime:{fontBytes,boldFontBytes}});
  assert.ok(file.html.includes('colspan="5">Öğrencinin'));
  assert.ok(file.html.includes('colspan="3">Aranacak 3. kişinin'));
  assert.deepEqual(input.snapshot,original);
  const contactOnly=await createClassRosterPdfDocument({...input,fields:["contacts"]},{runtime:{fontBytes,boldFontBytes}});
  assert.ok(!contactOnly.html.includes("10000000146"));assert.ok(!contactOnly.html.includes("10.09.2020"));
});
