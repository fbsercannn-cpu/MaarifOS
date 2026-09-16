import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync,writeFileSync,mkdirSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { homeGameFixture } from "../fixtures/home-game-fixture.mjs";
import { homeGameSource,homeGameCards,assertHomeGameCardRelationships } from "../../src/features/home-game-cards/home-game-card-model.ts";
import { saveHomeGameCards,saveHomeGameFeedback } from "../../src/features/home-game-cards/home-game-card-service.ts";
import { createHomeGameCardRecipe } from "../../src/features/home-game-cards/home-game-card-document.ts";
import { DevelopmentReportMemoryStore } from "../fixtures/development-report-fixture.mjs";
const runtime={fontBytes:new Uint8Array(readFileSync("public/assets/fonts/MaarifOSSans-Regular.ttf")),boldFontBytes:new Uint8Array(readFileSync("public/assets/fonts/MaarifOSSans-Bold.ttf"))};
const now=new Date("2026-09-12T09:00:00.000Z");
async function cards(f){ const ids=[f.input.studentId,f.otherStudentId];const snapshot=await f.store.readSnapshot(); return saveHomeGameCards(f.store,{studentIds:ids,activityId:f.source.activity.id,materials:"Üç resimli kart, bir kâğıt ve kalem.",steps:"1. Resimleri birlikte inceleyin.\n2. Çocuğunuzun resimleri sıraya koymasına fırsat verin.\n3. Kendi hikâyesini anlatmasını dinleyin.",expectedFingerprints:Object.fromEntries(ids.map(id=>[id,homeGameSource(snapshot,f.scope,id,f.source.activity.id).fingerprint])),now}); }
test("prepared cards are child/activity bound, retries stable and actual feedback linked",async()=>{
 const f=await homeGameFixture(); const saved=await cards(f); assert.deepEqual((await cards(f)).map(r=>r.id),saved.map(r=>r.id));
 assert.equal(homeGameCards(await f.store.readSnapshot()).length,2);
 const feedback=await saveHomeGameFeedback(f.store,{cardId:saved[0].id,receivedOn:"2026-09-12",source:"written",text:"İki resmi sıraya koydu, üçüncüsü için birlikte düşündük.",now});
 assert.equal(feedback[0].studentId,f.input.studentId);assert.equal(feedback[0].workflow.cardId,saved[0].id);
 const malformed=await f.store.readSnapshot();malformed.settings.find(r=>r.id===feedback[0].id).studentId=f.otherStudentId;assert.throws(()=>assertHomeGameCardRelationships(malformed),/bağı/);
});
test("two distinct child cards fit one A4; long source intact on continuation and stale export blocked",async()=>{
 const f=await homeGameFixture(),saved=await cards(f);const recipe=await createHomeGameCardRecipe(f.store,saved.map(r=>r.id),runtime);
 const file=await recipe.build(recipe.initial);const pdf=await PDFDocument.load(file.bytes);assert.equal(pdf.getPageCount(),1);assert.equal(pdf.getPage(0).getWidth(),595.28);
 f.store.snapshot.activities.find(r=>r.id===f.source.activity.id).title="Kaynak değişti";await assert.rejects(recipe.build(recipe.initial),/değişti/);
 const snapshot=await f.store.readSnapshot();const long=await saveHomeGameCards(f.store,{studentIds:[f.input.studentId],activityId:f.source.activity.id,materials:"Kâğıt.",steps:"Uzun kaynak cümlesi korunur. ".repeat(150),expectedFingerprints:{[f.input.studentId]:homeGameSource(snapshot,f.scope,f.input.studentId,f.source.activity.id).fingerprint},now});
 const longRecipe=await createHomeGameCardRecipe(f.store,long.map(r=>r.id),runtime);const longFile=await longRecipe.build(longRecipe.initial);assert.ok((await PDFDocument.load(longFile.bytes)).getPageCount()>1);
 if(process.env.HOME_GAME_QA){mkdirSync(process.env.HOME_GAME_QA,{recursive:true});writeFileSync(`${process.env.HOME_GAME_QA}/two-cards.pdf`,file.bytes);writeFileSync(`${process.env.HOME_GAME_QA}/long-cards.pdf`,longFile.bytes);}
});



test("stale source blocks prepared writes and no application, observation or skill is fabricated",async()=>{
 const f=await homeGameFixture();const snapshot=await f.store.readSnapshot();const expectedFingerprints={[f.input.studentId]:homeGameSource(snapshot,f.scope,f.input.studentId,f.source.activity.id).fingerprint};
 f.store.snapshot.activities.find(r=>r.id===f.source.activity.id).title="Etkinlik güncellendi";const before=await f.store.readSnapshot();
 await assert.rejects(saveHomeGameCards(f.store,{studentIds:[f.input.studentId],activityId:f.source.activity.id,materials:"Kâğıt",steps:"Resmi birlikte inceleyin.",expectedFingerprints,now}),/değişti/);
 assert.deepEqual(await f.store.readSnapshot(),before);const saved=await cards(f);const after=await f.store.readSnapshot();
 assert.deepEqual(after.observations,before.observations);assert.deepEqual(after.activities,before.activities);assert.deepEqual(after.evidenceCurriculumLinks,before.evidenceCurriculumLinks);assert.equal(saved.length,2);
});
