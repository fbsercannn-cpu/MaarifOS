import test from 'node:test';
import assert from 'node:assert/strict';
import {alternativeActivities,observationSearchModel,normalizeAssistantSearch} from '../../src/features/teacher-assistant/assistant-tools.ts';
import {ACTIVITY_STUDIO_ITEMS} from '../../src/features/activity-studio/activity-studio-model.ts';
import {makeDevelopmentReportFixture} from '../fixtures/development-report-fixture.mjs';
const filter={ageBand:'60-72',maxMinutes:30,environment:'inside',missingMaterials:[]};
const item={...ACTIVITY_STUDIO_ITEMS[0],id:'fixture-b',ageBands:['60-72'],durationMinutes:20,preparationMinutes:5,environment:'Sınıf',materials:['güvenli makas','KAĞIT']};
test('B plan is deterministic, uses preparation time and explicit age/environment without guessing metadata',()=>{
 const items=[item,{...item,id:'fixture-a'},{...item,id:'too-long',durationMinutes:26},{...item,id:'outdoor',environment:'Bahçe'},{...item,id:'unknown',environment:undefined},{...item,id:'missing-time',preparationMinutes:undefined}];
 assert.deepEqual(alternativeActivities(items,filter).map(r=>r.item.id),['fixture-a','fixture-b']);
 assert.deepEqual(alternativeActivities(items,{...filter,ageBand:''}),[]);
 assert.deepEqual(alternativeActivities(items,{...filter,maxMinutes:24}),[]);
 assert.deepEqual(alternativeActivities(items,{...filter,missingMaterials:['kağıt']}),[]);
 assert.equal(alternativeActivities([{...item,environment:'Sınıf veya bahçe'}],{...filter,environment:'outside'}).length,1);
 assert.equal(items[0].durationMinutes,20);
});
test('Turkish normalization handles dotted/dotless uppercase letters and decomposed accents',()=>{
 assert.equal(normalizeAssistantSearch(' IŞIK İÇİN KAĞIT '),'isik icin kagit');
 assert.equal(normalizeAssistantSearch('I\u0307çerik'),'icerik');
});
test('local search keeps raw source text unchanged and intersects child/activity/inclusive dates',async()=>{
 const f=await makeDevelopmentReportFixture();const snapshot=await f.store.readSnapshot();const row=snapshot.observations[0];row.rawText='  IŞIK için kağıt seçti.\nÖzgün söz.  ';snapshot.students[0].displayName='Kurgu Aynı Ad';snapshot.students[1].displayName='Kurgu Aynı Ad';
 const base={query:'ışık KAĞIT',studentId:f.input.studentId,activityId:row.activityId,dateFrom:row.civilDate,dateTo:row.civilDate};const before=JSON.stringify(snapshot);
 assert.equal(observationSearchModel(snapshot,base).results[0].rawText,row.rawText);
 assert.equal(observationSearchModel(snapshot,{...base,studentId:f.otherStudentId}).results.length,0);
 assert.equal(observationSearchModel(snapshot,{...base,dateFrom:'2026-09-09',dateTo:''}).results.length,0);
 assert.equal(observationSearchModel(snapshot,{...base,activityId:'nonexistent'}).results.length,0);
 assert.throws(()=>observationSearchModel(snapshot,{...base,dateFrom:'2026-09-10',dateTo:'2026-09-01'}),/sırayla/);
 assert.equal(JSON.stringify(snapshot),before);
});
test('local search excludes deleted/out-of-scope records and cannot cross an invalid active classroom',async()=>{
 const f=await makeDevelopmentReportFixture();const snapshot=await f.store.readSnapshot();const base={query:'',studentId:'',activityId:'',dateFrom:'',dateTo:''};const row=snapshot.observations[0];
 snapshot.observations.push({...row,id:crypto.randomUUID(),classroomId:crypto.randomUUID(),rawText:'Foreign class'}, {...row,id:crypto.randomUUID(),deletedAt:'2026-09-09T09:00:00.000Z',rawText:'Deleted'});
 assert.equal(observationSearchModel(snapshot,base).results.length,1);
 snapshot.settings[0].classroomId=crypto.randomUUID();assert.equal(observationSearchModel(snapshot,base).results.length,0);
});
