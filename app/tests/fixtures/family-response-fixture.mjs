import {normalizeStudentContacts} from "../../src/core/domain/student.ts";
import {homeGameFixture} from "./home-game-fixture.mjs";
import {homeGameSource} from "../../src/features/home-game-cards/home-game-card-model.ts";
import {saveHomeGameCards,saveHomeGameFeedback} from "../../src/features/home-game-cards/home-game-card-service.ts";
export async function familyResponseFixture(store){const f=await homeGameFixture(store);let snapshot=await f.store.readSnapshot();const contactId="00000000-0000-4000-9500-000000006801";
 await f.store.transaction("readwrite",["classrooms","students"],async tx=>{await tx.putMany("classrooms",[{...snapshot.classrooms[0],schedule:{kind:"morning",startTime:"08:30",endTime:"12:30",timeZone:"Europe/Istanbul"}}]);await tx.putMany("students",snapshot.students.map((s,i)=>({...s,contacts:normalizeStudentContacts([{id:i===0?contactId:"00000000-0000-4000-9500-000000006802",kind:"mother",relationship:"Anne",name:i===0?"Kurgu Aile Bir":"Kurgu Aile İki",phone:i===0?"05550000001":"05550000002",isPrimary:true}])})));});
 snapshot=await f.store.readSnapshot();const now=new Date("2026-09-12T08:00:00.000Z"),ids=[f.input.studentId,f.otherStudentId];const cards=await saveHomeGameCards(f.store,{studentIds:ids,activityId:f.source.activity.id,materials:"Resimli kartlar",steps:"Kartları sıraya koyun ve hikâye anlatın.",expectedFingerprints:Object.fromEntries(ids.map(id=>[id,homeGameSource(snapshot,f.scope,id,f.source.activity.id).fingerprint])),now});
 const feedback=(await saveHomeGameFeedback(f.store,{cardId:cards[0].id,receivedOn:"2026-09-12",source:"written",text:"Çocuğum resimlerin sırasını değiştirerek yeni bir hikâye anlattı.",now}))[0];return {...f,cards,feedback,contactId,now};}

