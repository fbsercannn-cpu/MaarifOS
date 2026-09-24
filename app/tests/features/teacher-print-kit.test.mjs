import test from "node:test";
import assert from "node:assert/strict";
import {makeDevelopmentReportFixture} from "../fixtures/development-report-fixture.mjs";
import {pickupSheetModel} from "../../src/features/teacher-print-kit/print-kit-model.ts";
import {pickupSheetNodes,binderKitNodes} from "../../src/features/teacher-print-kit/print-kit-document.ts";
test("Teslim yetkisi anne/baba yakınlığından türetilmez; gün ve sınıf kapsamı korunur",async()=>{
  const f=await makeDevelopmentReportFixture(),data=await f.store.readSnapshot();
  data.students[0].contacts=[{id:crypto.randomUUID(),kind:"mother",name:"Kurgu Anne",relationship:"Anne",phone:"+905000000001",isPrimary:true,isAuthorizedPickup:false}];
  const m=pickupSheetModel(data,"2026-09-21");assert.equal(m.rows[0].contacts.length,0);assert.equal(m.rows[0].deliveries.length,0);assert.throws(()=>pickupSheetModel(data,"2028-09-21"));
  data.students[0].classroomId=crypto.randomUUID();assert.equal(pickupSheetModel(data,"2026-09-21").rows.length,1);
});
test("Çizelge seçimi dışarıda kalan çocuğu ve telefonu çıktıya taşımaz; imza boş kalır",async()=>{
  const f=await makeDevelopmentReportFixture(),m=pickupSheetModel(await f.store.readSnapshot(),"2026-09-21");
  const table=pickupSheetNodes(m,[f.otherStudentId],["roster"]).find(n=>n.kind==="table");assert.equal(table.rows.length,1);assert.equal(table.rows[0].at(-1),"\n");assert.ok(!table.headers.includes("Telefon"));assert.ok(!JSON.stringify(table).includes("Kurgu Çocuk 1"));
});
test("Klasör bölümleri ayrı sayfadır; içindekiler yalnız seçilmiş gerçek belge adını kullanır",()=>{
  const m={schoolName:"Kurgu Okul",classroomName:"Kurgu Sınıf",teacherName:"Kurgu Öğretmen",yearName:"2026–2027",month:"2026-09",items:[{id:"saved:a",title:"Kaydedilen gerçek belge",kind:"saved"}]};
  const nodes=binderKitNodes(m,["cover","contents","divider","spine"]);assert.equal(nodes.filter(n=>n.pageBreakBefore&&n.forcePageBreakBefore).length,3);assert.equal(nodes.find(n=>n.kind==="table").rows[0][1],"Kaydedilen gerçek belge");assert.equal(binderKitNodes(m,["contents"]).filter(n=>n.kind==="heading").length,1);
});
