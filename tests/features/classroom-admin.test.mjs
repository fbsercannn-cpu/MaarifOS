import assert from "node:assert/strict";
import test from "node:test";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
import { adminLedgerHead, assertClassroomAdminRelationships, classroomAdminRecords, classroomAdminReminders, handoverState, inventoryBalances, isClassroomAdminRecord, missingHandoverSources } from "../../src/core/domain/classroom-admin.ts";
import { appendClassroomAdmin, buildHandoverItems } from "../../src/features/classroom-admin/classroom-admin-service.ts";
import { classroomHandoverPdf, classroomInventoryPdf } from "../../src/features/classroom-admin/classroom-admin-document.ts";
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const scope = { academicYearId: uid(9601), classroomId: uid(9602) }, studentId = uid(9603);
const base = { createdAt:"2026-09-01T06:00:00.000Z", updatedAt:"2026-09-01T06:00:00.000Z", civilDate:"2026-09-01", deletedAt:null, schemaVersion:1 };
const now = new Date("2026-09-08T09:00:00.000Z");
function fixture() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({...base,id:scope.academicYearId,name:"Kurgu yıl",startDate:"2026-09-01",endDate:"2027-06-30",status:"active"});
  snapshot.classrooms.push({...base,id:scope.classroomId,academicYearId:scope.academicYearId,name:"Kurgu sınıf"});
  snapshot.students.push({...base,...scope,id:studentId,displayName:"Kurgu Çocuk",active:true});
  snapshot.settings.push({...base,id:ACTIVE_CLASSROOM_SETTING_ID,settingType:ACTIVE_CLASSROOM_SETTING_TYPE,...scope});
  return {snapshot,fail:false,close(){},async readSnapshot(){return structuredClone(this.snapshot)},async transaction(mode,collections,task){const next=structuredClone(this.snapshot);const result=await task({getAll:async c=>structuredClone(next[c]),putMany:async(c,rows)=>{if(this.fail)throw Error("Kurgu disk kesintisi");for(const r of rows){const at=next[c].findIndex(x=>x.id===r.id);if(at<0)next[c].push(structuredClone(r));else next[c][at]=structuredClone(r)}},clear:async c=>{next[c]=[]}});if(mode==="readwrite")this.snapshot=next;return result}};
}
const item = (name="Kurgu Kitap", initialQuantity=10) => ({kind:"inventory-item",name,category:"Kitap",unit:"adet",initialQuantity,note:""});
const movement = (itemId,action,quantity,extra={}) => ({kind:"inventory-movement",itemId,action,quantity,party:action==="loan"?{type:"student",studentId,name:""}:null,dueOn:action==="loan"?"2026-09-10":null,loanId:null,note:"",preparationId:null,...extra});
const save = (store,workflow,extra={}) => appendClassroomAdmin(store,{workflow,expectedScope:scope,expectedHead:adminLedgerHead(classroomAdminRecords(store.snapshot,scope)),now,...extra});
test("MR100 boş defterde sınıf değiştirme ve geriye alınmış saat yanlış kayıt yaratamaz",async()=>{const s=fixture(),other={academicYearId:scope.academicYearId,classroomId:uid(9798)};s.snapshot.classrooms.push({...base,id:other.classroomId,academicYearId:other.academicYearId,name:"Kurgu ikinci sınıf"});Object.assign(s.snapshot.settings.find(r=>r.id===ACTIVE_CLASSROOM_SETTING_ID),other);const before=structuredClone(s.snapshot);await assert.rejects(save(s,item()),/Etkin sınıf değişti/);assert.deepEqual(s.snapshot,before);Object.assign(s.snapshot.settings.find(r=>r.id===ACTIVE_CLASSROOM_SETTING_ID),scope);await save(s,item());await assert.rejects(save(s,item(),{now:new Date("2026-09-08T07:00:00.000Z")}),/Cihaz saati/);await assert.rejects(save(s,item(),{now:new Date(NaN)}),/saati geçersiz/);});
const bal = store => inventoryBalances(classroomAdminRecords(store.snapshot,scope))[0];
test("MR100 stok denkliği kısmi iade, hasar, onarım ve tüketimde korunur",async()=>{
 const s=fixture(),i=await save(s,item()),l=await save(s,movement(i.id,"loan",4));
 await save(s,movement(i.id,"return",2,{loanId:l.id}));await save(s,movement(i.id,"damage",3));await save(s,movement(i.id,"repair",1));await save(s,movement(i.id,"consume",2));await save(s,movement(i.id,"add",5));
 assert.deepEqual([bal(s).owned,bal(s).available,bal(s).onLoan,bal(s).damaged],[13,9,2,2]);assert.equal(bal(s).loans[0].remaining,2);assert.ok(classroomAdminRecords(s.snapshot).every(isClassroomAdminRecord));assert.doesNotThrow(()=>assertClassroomAdminRelationships(s.snapshot));
});
test("MR100 negatif stok, onarım ve çift iade atomik reddedilir",async()=>{
 const s=fixture(),i=await save(s,item()),l=await save(s,movement(i.id,"loan",4));const before=structuredClone(s.snapshot);
 await assert.rejects(save(s,movement(i.id,"consume",7)),/stok/);await assert.rejects(save(s,movement(i.id,"repair",1)),/stok/);await assert.rejects(save(s,movement(i.id,"return",5,{loanId:l.id})),/İade/);assert.deepEqual(s.snapshot,before);
 await save(s,movement(i.id,"return",4,{loanId:l.id}));await assert.rejects(save(s,movement(i.id,"return",1,{loanId:l.id})),/İade/);
});
test("MR100 geri alma kaynak geçmişini korur ve bağımlı iade varken engellenir",async()=>{
 const s=fixture(),i=await save(s,item()),l=await save(s,movement(i.id,"loan",4)),r=await save(s,movement(i.id,"return",2,{loanId:l.id}));
 await assert.rejects(save(s,{kind:"inventory-reversal",sourceId:l.id,note:"Yanlış kişi"}),/İade/);
 await save(s,{kind:"inventory-reversal",sourceId:r.id,note:"Önce iade düzeltildi"});await save(s,{kind:"inventory-reversal",sourceId:l.id,note:"Emanet miktarı düzeltilecek"});
 assert.equal(bal(s).available,10);assert.ok(s.snapshot.settings.some(x=>x.id===l.id));await assert.rejects(save(s,{kind:"inventory-reversal",sourceId:l.id,note:"Yinelenen deneme"}),/ikinci/);
});
test("MR100 bayat defter başı ve başarısız yazma stok kaybı yaratmaz",async()=>{
 const s=fixture(),i=await save(s,item());const head=adminLedgerHead(classroomAdminRecords(s.snapshot));await save(s,movement(i.id,"loan",6));const before=structuredClone(s.snapshot);
 await assert.rejects(save(s,movement(i.id,"loan",6),{expectedHead:head}),/değişti/);s.fail=true;await assert.rejects(save(s,movement(i.id,"add",1)),/kesintisi/);assert.deepEqual(s.snapshot,before);
});
test("MR100 gerçek miktar tam sayı; sıfır/NaN/fazla alan/kaldırılmış kişi reddedilir",async()=>{
 const s=fixture(),i=await save(s,item());for(const quantity of [0,-1,1.5,NaN,Infinity,1000001])await assert.rejects(save(s,movement(i.id,"add",quantity)),/Alanları/);
 await assert.rejects(save(s,{...movement(i.id,"add",1),unexpected:true}),/Alanları/);await assert.rejects(save(s,movement(i.id,"loan",1,{party:{type:"removed",studentId:null,name:""}})),/Kaldırılmış/);
});
test("MR100 tarihli üyelik ve arşiv yazması; geçmiş emanet okumaları korunur",async()=>{
 const s=fixture(),i=await save(s,item());s.snapshot.students[0].enrollments=[{id:uid(9630),...scope,startedOn:"2026-09-15",status:"active",schemaVersion:1}];
 await assert.rejects(save(s,movement(i.id,"loan",1)),/sınıfa kayıtlı/);s.snapshot.academicYears[0].status="archived";await assert.rejects(save(s,movement(i.id,"add",1)),/Arşivlenen|etkin sınıf/);assert.equal(bal(s).owned,10);
});
test("MR100 hazırlık bağlantısı gerçek plan revizyonu değişince eskir",async()=>{
 const s=fixture(),i=await save(s,item());s.snapshot.activities.push({...base,...scope,id:uid(9641),title:"Kurgu sanat"});
 s.snapshot.settings.push({...base,...scope,id:uid(9640),settingType:"teacher-followup-v1",studentId:null,workflow:{kind:"preparation-list",weekStart:"2026-09-07",weekEnd:"2026-09-11",sources:[{collection:"activities",id:uid(9641),title:"Kurgu sanat",updatedAt:base.updatedAt}],items:[{id:uid(9642),text:"Kâğıt",advance:false,dueOn:"2026-09-09",sourceIds:[uid(9641)]}]}});
 await save(s,movement(i.id,"consume",1,{preparationId:uid(9640)}));s.snapshot.activities[0].updatedAt="2026-09-08T08:00:00.000Z";await assert.rejects(save(s,movement(i.id,"consume",1,{preparationId:uid(9640)})),/kaynağı değişmiş/);
});
test("MR101 otomatik açık işler, eksik madde engeli, kapanış ve gerekçeli yeniden açma",async()=>{
 const s=fixture(),i=await save(s,item()),l=await save(s,movement(i.id,"loan",2));const entries=buildHandoverItems(s.snapshot,scope,["Dosyalar"]);assert.equal(entries.length,2);assert.equal(entries[0].sourceId,l.id);assert.ok(!JSON.stringify(entries).includes("Kurgu Çocuk"));
 const p=await save(s,{kind:"handover-plan",title:"Kurgu devir",recipient:"Kurgu Öğretmen",dueOn:"2027-06-25",note:"",items:entries});
 await assert.rejects(save(s,{kind:"handover-close",handoverId:p.id,recipient:"Kurgu Öğretmen",note:""}),/bütün maddeler/);
 for(const e of entries)await save(s,{kind:"handover-check",handoverId:p.id,itemId:e.id,completed:true,note:""});await save(s,{kind:"handover-close",handoverId:p.id,recipient:"Kurgu Öğretmen",note:"Teslim edildi"});
 assert.ok(handoverState(classroomAdminRecords(s.snapshot),p.id).closed);assert.equal(bal(s).onLoan,2);await assert.rejects(save(s,{kind:"handover-check",handoverId:p.id,itemId:entries[0].id,completed:false,note:""}),/yeniden açılmalı/);
 await save(s,{kind:"handover-reopen",handoverId:p.id,note:"Bir dosya yeniden incelenecek"});assert.equal(handoverState(classroomAdminRecords(s.snapshot),p.id).closed,null);
});
test("MR101 yeni emanet liste dışındaysa devir kapanmaz; revizyon eski kontrolleri korur",async()=>{
 const s=fixture(),i=await save(s,item());const items=buildHandoverItems(s.snapshot,scope,["Anahtar"]);const p=await save(s,{kind:"handover-plan",title:"Kurgu devir",recipient:"Kurgu Öğretmen",dueOn:"2027-06-25",note:"",items});await save(s,{kind:"handover-check",handoverId:p.id,itemId:items[0].id,completed:true,note:""});
 await save(s,movement(i.id,"loan",1));await assert.rejects(save(s,{kind:"handover-close",handoverId:p.id,recipient:"Kurgu Öğretmen",note:""}),/yeni açık işler/);assert.equal(missingHandoverSources(s.snapshot,scope,items).length,1);
 const next=buildHandoverItems(s.snapshot,scope,[],items);await save(s,{kind:"handover-revision",handoverId:p.id,items:next,note:"Açık emanet eklendi"});const state=handoverState(classroomAdminRecords(s.snapshot),p.id);assert.equal(state.completedCount,1);assert.equal(state.items.length,2);
});
test("MR100/101 iade hatırlatması kısmi iadede sürer ve tam iadede kalkar",async()=>{
 const s=fixture(),i=await save(s,item()),l=await save(s,movement(i.id,"loan",2));assert.equal(classroomAdminReminders(s.snapshot,"2026-09-09").length,0);assert.equal(classroomAdminReminders(s.snapshot,"2026-09-10").length,1);await save(s,movement(i.id,"return",2,{loanId:l.id}));assert.equal(classroomAdminReminders(s.snapshot,"2026-09-10").length,0);
});
test("MR100/101 belge tarifleri varsayılanda isim ve özel not seçmez",async()=>{
 const s=fixture();await save(s,item());const recipe=classroomInventoryPdf(s.snapshot,scope,"2026-09-08");assert.deepEqual(recipe.initial.fields,["stock"]);
 const p=await save(s,{kind:"handover-plan",title:"Kurgu devir",recipient:"Kurgu Öğretmen",dueOn:"2027-06-25",note:"",items:buildHandoverItems(s.snapshot,scope,["Dosya"])});assert.deepEqual(classroomHandoverPdf(s.snapshot,scope,p.id).initial.fields,["checklist"]);
});
test("MR101 şifreli kasanın kanonik alan sırası devir revizyonunu değiştirmez",async()=>{
 const s=fixture(),items=buildHandoverItems(s.snapshot,scope,["Dosya"]);const p=await save(s,{kind:"handover-plan",title:"Kurgu devir",recipient:"Kurgu Öğretmen",dueOn:"2027-06-25",note:"",items});
 const reordered=items.map(i=>Object.fromEntries(Object.entries(i).sort(([a],[b])=>a.localeCompare(b))));await save(s,{kind:"handover-revision",handoverId:p.id,items:reordered,note:"Kanonik sıradan yeniden okundu"});assert.equal(handoverState(classroomAdminRecords(s.snapshot),p.id).items[0].id,items[0].id);
});
test("MR101 kontrol sonrası kısmi iade dayanağı değiştirir ve tekrar kontrol gerekir",async()=>{
 const s=fixture(),i=await save(s,item()),loan=await save(s,movement(i.id,"loan",2));const items=buildHandoverItems(s.snapshot,scope,[]);const p=await save(s,{kind:"handover-plan",title:"Kurgu devir",recipient:"Kurgu Öğretmen",dueOn:"2027-06-25",note:"",items});await save(s,{kind:"handover-check",handoverId:p.id,itemId:items[0].id,completed:true,note:""});await save(s,movement(i.id,"return",1,{loanId:loan.id}));await assert.rejects(save(s,{kind:"handover-close",handoverId:p.id,recipient:"Kurgu Öğretmen",note:""}),/kaynak işlemi değişen/);await save(s,{kind:"handover-check",handoverId:p.id,itemId:items[0].id,completed:true,note:"Kalan emanet doğrulandı"});await save(s,{kind:"handover-close",handoverId:p.id,recipient:"Kurgu Öğretmen",note:""});assert.ok(handoverState(classroomAdminRecords(s.snapshot),p.id).closed);
});
