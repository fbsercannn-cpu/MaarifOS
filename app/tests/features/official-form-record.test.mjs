import { createTeacherOwnedPlanGraph } from "../../src/features/planning/teacher-owned-plan-service.ts";
import { MAARIFOS_DAILY_SAMPLE_DRAFTS, MAARIFOS_MONTHLY_SAMPLE_DRAFTS, SAMPLE_DRAFT_LABEL } from "../../src/features/official-forms/officialSamplePlansService.ts";
import { initialOfficialFormValue } from "../../src/features/official-forms/official-form-initial-values.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { makeDevelopmentReportFixture } from "../fixtures/development-report-fixture.mjs";
import { saveOfficialForm, isOfficialFormRecord, migrateLegacyOfficialForms, assertOfficialFormRelationships, assertOfficialLegacyIntegrity, assertNoUnresolvedLegacyForms, redactOfficialFormsForStudent, officialFormPeriod } from "../../src/features/official-forms/official-form-record.ts";
import { rolldown } from "rolldown";
import { fileURLToPath } from "node:url";
// Existing backup service uses TS constructor properties and extensionless imports.
const compiler = await rolldown({input:fileURLToPath(new URL("../../src/core/backup/backup-service.ts",import.meta.url)),platform:"node",logLevel:"silent"});
const bundle=await compiler.generate({format:"esm",codeSplitting:false});
await compiler.close();
const { BackupService } = await import("data:text/javascript;base64,"+Buffer.from(bundle.output[0].code).toString("base64"));
import { EK15_ITEMS, EK15_SOURCE } from "../../src/features/official-forms/ek15-catalog.ts";
import { generateCurriculumMatrix } from "../../src/features/official-forms/planToChecklistSync.ts";
import { createOfficialFormDocx } from "../../src/features/official-forms/official-form-docx.ts";
const scopeFor = fixture => ({ classroomId: fixture.input.classroomId, academicYearId: fixture.input.academicYearId, studentIds: [fixture.input.studentId], period: "2026-09-19", ageBand: "60-72" });
test("form revisions survive complete backup roundtrip; stale writes cannot overwrite", async () => {
  const fixture = await makeDevelopmentReportFixture(); const {store} = fixture; const scope=scopeFor(fixture);
  const values = {name: "<Kurgu & Öğrenci>", notes: "Satır 1\nTürkçe ığüşöç", consent: false, grade: null};
  const first=await saveOfficialForm(store,"student_intake",scope,values,0);
  assert.ok(isOfficialFormRecord(first)); assert.equal(first.revision,1);
  await assert.rejects(saveOfficialForm(store,"student_intake",scope,{notes:"eski sekme"},0), /başka bir sekmede/);
  const backup = new BackupService(store,{appVersion:"0.65.0"});
  const envelope = await backup.exportBackup(); const restored=await backup.parseAndVerifyBackup(JSON.stringify(envelope));
  assert.deepEqual(restored.payload.settings.find(r=>r.id===first.id),first);
  const encrypted=await backup.exportEncryptedBackup("Kurgu-kasa-test-2026");
  const decrypted=await backup.parseAndDecryptBackup(encrypted,"Kurgu-kasa-test-2026");
  assert.deepEqual(decrypted.payload.settings.find(r=>r.id===first.id),first);
  await saveOfficialForm(store,"student_intake",{...scope,studentIds:[fixture.otherStudentId]}, {notes:"İkinci çocuk"},0);
  await saveOfficialForm(store,"student_intake",{...scope,period:"2026-09-20"}, {notes:"Başka gün"},0);
  assert.equal((await store.readSnapshot()).settings.filter(isOfficialFormRecord).length,3);
  assertOfficialFormRelationships(await store.readSnapshot());
});
test("legacy migration preserves exact source; retry is idempotent; tampering and privacy ambiguity block",async()=>{
  const {store}=await makeDevelopmentReportFixture(); const raw=' {"s-1": "Kurgu kaynak\\n"} ';
  const values=new Map([["maarif_term_reports_data",raw]]);
  const storage={getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key)};
  assert.equal(await migrateLegacyOfficialForms(store,storage),1);assert.equal(values.size,0);
  const archive=(await store.readSnapshot()).settings.find(r=>r.legacyJson);
  assert.equal(archive.legacyJson,raw);await assertOfficialLegacyIntegrity(await store.readSnapshot());
  values.set("maarif_term_reports_data",raw);await migrateLegacyOfficialForms(store,storage);
  assert.equal((await store.readSnapshot()).settings.filter(r=>r.legacyJson).length,1);
  assert.throws(()=>assertNoUnresolvedLegacyForms(store.snapshot), /kimlikleri bilinmediği/);
  const backup=new BackupService(store,{appVersion:"0.65.0"});
  const restored=await backup.parseAndVerifyBackup(JSON.stringify(await backup.exportBackup()));
  assert.equal(restored.payload.settings.find(r=>r.id===archive.id).legacyJson,raw);
  store.snapshot.settings.find(r=>r.id===archive.id).legacyJson+='tamper';
  await assert.rejects(backup.exportBackup(),/içerik özeti/);
});
test("failed legacy migration leaves plaintext source untouched",async()=>{
 const {store}=await makeDevelopmentReportFixture();const values=new Map([["maarif_portfolio_items",'[]']]);
 store.transaction=async()=>{throw new Error("disk full")};
 await assert.rejects(migrateLegacyOfficialForms(store,{getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k)}),/disk full/);
 assert.equal(values.get("maarif_portfolio_items"),'[]');
});
test("child erasure preserves the other student's class-wide rows and removes child-scoped drafts",async()=>{
 const fixture=await makeDevelopmentReportFixture();const {store}=fixture;const scope=scopeFor(fixture);
 await saveOfficialForm(store,"student_intake",scope,{notes:"Çocuk özel"},0);
 await saveOfficialForm(store,"classroom_skills",{...scope,studentIds:[]},{students:[{id:scope.studentIds[0],name:"Birinci kurgu"},{id:fixture.otherStudentId,name:"İkinci kurgu"}],ratings:{[scope.studentIds[0]]:3,[fixture.otherStudentId]:2}},0);
 const result=redactOfficialFormsForStudent(await store.readSnapshot(),scope.studentIds[0],new Date().toISOString());
 assert.equal(result.length,1);assert.equal(result[0].revision,2);assert.equal(result[0].formValues.students.length,1);assert.equal(result[0].formValues.students[0].id,fixture.otherStudentId);assert.ok(!JSON.stringify(result).includes(scope.studentIds[0]));
});
test("EK15 is exact pinned source with disjoint codes; sync requires actual scope-bound monthly plans",async()=>{
 assert.equal(createHash('sha256').update(readFileSync(new URL('../../public/assets/resources/ttkb-okul-oncesi-programi.pdf',import.meta.url))).digest('hex'),EK15_SOURCE.sha256);
 assert.equal(EK15_ITEMS.length,253);assert.equal(new Set(EK15_ITEMS.map(x=>x.id)).size,253);
 assert.equal(EK15_ITEMS.filter(x=>x.category==='alan').length,76);
 assert.ok(EK15_ITEMS.some(x=>x.code==='TADB.1'));assert.ok(EK15_ITEMS.some(x=>x.code==='E1.6'));assert.ok(EK15_ITEMS.some(x=>x.code==='E3.10'));assert.ok(!EK15_ITEMS.some(x=>x.code.startsWith('TAB.')));
 const fixture=await makeDevelopmentReportFixture();const {store}=fixture;const scope={...scopeFor(fixture),studentIds:[]};
 assert.equal(generateCurriculumMatrix(EK15_ITEMS,await store.readSnapshot(),scope).matchCount,0);
 await saveOfficialForm(store,"monthly",scope,{formData:{domainSkills:"TADB.1 ve MAB.13",values:"D1.1",concepts:"Kare"}},0);
 await saveOfficialForm(store,"monthly",{...scope,period:"2026-10-01",ageBand:"48-60"},{formData:{domainSkills:"TAKB.1"}},0);
 const result=generateCurriculumMatrix(EK15_ITEMS,await store.readSnapshot(),scope);
 assert.equal(result.sourceCount,1);assert.equal(result.matchCount,3);assert.equal(result.matrix['mab-13'].Eylül,true);assert.ok(!result.matrix['mab-1']);assert.ok(!result.matrix['takb-1']);
});
test("DOCX is an OOXML zip; XML escapes source text and preserves line breaks and source revision",()=>{
 const bytes=createOfficialFormDocx("Kurgu <Başlık>",[{kind:"table",rows:[["Öğrenci","<script>& Kurgu"],["Not","Satır1\nSatır2"]]}],"rev 2; SHA256 kurgu");
 assert.deepEqual([...bytes.slice(0,4)],[0x50,0x4b,3,4]);
 const xml=new TextDecoder().decode(bytes);assert.match(xml,/word\/document.xml/);assert.match(xml,/&lt;script&gt;&amp; Kurgu/);assert.match(xml,/<w:br\/>/);assert.match(xml,/rev 2; SHA256 kurgu/);assert.ok(!xml.includes('<script>'));
});

test("period identity is daily, monthly or academic-year-wide without cross-month aliasing",()=>{
 assert.equal(officialFormPeriod("daily","2026-09-19","2026-09-01"),"2026-09-19");
 assert.equal(officialFormPeriod("monthly","2026-09-19","2026-09-01"),"2026-09-01");
 assert.equal(officialFormPeriod("monthly","2026-10-12","2026-09-01"),"2026-10-01");
 assert.equal(officialFormPeriod("checklist","2027-01-11","2026-09-01"),"2026-09-01");
 assert.throws(()=>officialFormPeriod("daily","2026-02-30","2026-09-01"),/Geçerli/);
});
test("duplicates, invalid foreign children and missing-value confusion cannot silently save",async()=>{
 const fixture=await makeDevelopmentReportFixture();const {store}=fixture;const scope=scopeFor(fixture);
 await assert.rejects(saveOfficialForm(store,"student_intake",{...scope,studentIds:["00000000-0000-4000-8000-000000099999"]},{notes:"x"},0),/artık bu sınıfta değil/);
 const record=await saveOfficialForm(store,"student_intake",scope,{unknown:null,empty:"",falseConsent:false,zero:0},0);
 store.snapshot.settings.push({...record,id:crypto.randomUUID()});
 assert.throws(()=>assertOfficialFormRelationships(store.snapshot),/birden fazla/);
 await assert.rejects(saveOfficialForm(store,"student_intake",scope,{notes:"must not overwrite"},1),/birden fazla/);
});

test("new forms use canonical identity and never promote demonstration health or attainment to observations",async()=>{
 const fixture=await makeDevelopmentReportFixture();const snapshot=await fixture.store.readSnapshot();const scope=scopeFor(fixture);const context={snapshot,scope};
 const fields=initialOfficialFormValue("formData",{studentName:"Örnek",schoolName:"Örnek okul",teacherName:"Örnek öğretmen",date:"2020-01-01",allergies:"Yumurta alerjisi",childEvaluation:"Çok başarılı"},context);
 assert.equal(fields.studentName,"Kurgu Çocuk 1");assert.equal(fields.schoolName,"Kurgu Okul");assert.equal(fields.teacherName,"Kurgu Öğretmen");assert.equal(fields.date,scope.period);assert.equal(fields.allergies,"");assert.equal(fields.childEvaluation,"");
 const rows=initialOfficialFormValue("students",[{id:"s1",name:"Örnek",turkce:"Çok başarılı",score:3}],{snapshot,scope:{...scope,studentIds:[]}});
 assert.equal(rows.length,2);assert.equal(rows[0].id,scope.studentIds[0]);assert.equal(rows[0].turkce,"");assert.equal(rows[0].score,0);
 assert.deepEqual(initialOfficialFormValue("scores",{reading:3},context),{});
 assert.deepEqual(initialOfficialFormValue("moods",{happy:10,sad:3},context),{happy:0,sad:0});
});

test("EK15 bridges actual teacher-owned monthly graph and keeps planned codes separate from observation/evaluation", async()=>{
 const fixture=await makeDevelopmentReportFixture();const {store}=fixture;const scope={...scopeFor(fixture),studentIds:[]};
 await createTeacherOwnedPlanGraph(store,{title:"Kurgu yıllık plan",periodStart:"2026-09-08",periodEnd:"2026-10-30",teacherContent:{narrative:"Yıllık FAB.1 burada aylık kaynak değildir"},months:[
  {title:"Eylül kurgu",monthKey:"2026-09",periodStart:"2026-09-08",periodEnd:"2026-09-30",teacherContent:{narrative:"TADB.2 ve MAB.13 planlanan alanlar. HAB.1 doğrulanmayan kod.",observations:"FAB.1 gözlendi",evaluation:"MAB.2 gerçekleşti"},weeks:[{title:"Hafta",weekKey:"2026-W37",periodStart:"2026-09-08",periodEnd:"2026-09-11",teacherContent:{narrative:"Hafta-only SNAB.1"}}]},
  {title:"Ekim kurgu",monthKey:"2026-10",periodStart:"2026-10-01",periodEnd:"2026-10-30",teacherContent:{narrative:"TAKB.1"},weeks:[{title:"Hafta",weekKey:"2026-W41",periodStart:"2026-10-05",periodEnd:"2026-10-09",teacherContent:{narrative:"Hafta"}}]},
 ],now:new Date("2026-09-09T07:00:00.000Z")});
 const result=generateCurriculumMatrix(EK15_ITEMS,await store.readSnapshot(),scope);
 assert.equal(result.sourceCount,2);assert.equal(result.matchCount,3);
 assert.equal(result.matrix['tadb-2'].Eylül,true);assert.equal(result.matrix['mab-13'].Eylül,true);assert.equal(result.matrix['takb-1'].Ekim,true);
 for(const id of ['hab-1','fab-1','mab-1','mab-2','snab-1']) assert.ok(!result.matrix[id]);
 assert.ok(result.sources.every(source=>source.kind==='teacher-owned' && source.meaning==='planned' && source.revision===1));
 assert.equal(generateCurriculumMatrix(EK15_ITEMS,await store.readSnapshot(),{...scope,ageBand:"48-60"}).matchCount,0);
 const foreign=await store.readSnapshot();foreign.plans=foreign.plans.map(plan=>plan.planType==='monthly'?{...plan,classroomId:crypto.randomUUID()}:plan);
 assert.equal(generateCurriculumMatrix(EK15_ITEMS,foreign,scope).matchCount,0);
 const orphan=await store.readSnapshot();orphan.plans=orphan.plans.filter(plan=>plan.planType!=='annual');
 assert.equal(generateCurriculumMatrix(EK15_ITEMS,orphan,scope).matchCount,0);
});
test("sample plans are explicitly reviewable MaarifOS drafts; unverified old codes and observed outcomes are never injected",()=>{
 const catalog=new Map(EK15_ITEMS.filter(item=>item.category!=='kavram').map(item=>[item.code,item.description]));
 const fields=['domainSkills','tendencies','socialEmotional','values','literacy'];
 for(const sample of [...MAARIFOS_DAILY_SAMPLE_DRAFTS,...MAARIFOS_MONTHLY_SAMPLE_DRAFTS]) {
  assert.equal(sample.pageRef,SAMPLE_DRAFT_LABEL);assert.ok(sample.sourceNotice.includes('birebir aktarımı'));
  for(const field of fields) {
   assert.ok(!/\b(?:HAB|MZB|TAEB)\./.test(sample[field]));
   if(sample.ageGroup!=='60-72 Ay')assert.equal(sample[field],'');
   else for(const line of sample[field].split('\n').filter(Boolean)) assert.ok([...catalog].some(([code,description])=>line===`${code}. ${description}`));
  }
  if('childEvaluation' in sample) for(const field of ['childEvaluation','programEvaluation','teacherEvaluation','teacherReflections']) assert.equal(sample[field],'');
 }
 assert.ok(MAARIFOS_MONTHLY_SAMPLE_DRAFTS[0].sourceNotice.includes('HAB.1'));
});
