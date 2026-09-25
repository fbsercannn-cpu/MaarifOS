import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { assertDataSnapshotRelationships } from "../../core/backup/schema.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { familyContactSnapshot } from "../../core/domain/family-engagement.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot, type CollectionName, type StoredRecord } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { createPlanWithActivity } from "../evidence/evidence-flow.ts";
import { executeFamilyEngagement } from "../family-engagement/family-engagement-service.ts";
import { homeGameCards, HOME_GAME_CARD_SETTING_TYPE, type HomeGameCardRecord } from "../home-game-cards/home-game-card-model.ts";
import { loadPlanNextSteps, applyPlanNextStep } from "../planning/plan-next-steps.ts";
import { familyResponseBoardModel, responseFingerprint } from "./family-response-board-model.ts";

export const FAMILY_RESPONSE_CHANGED="maarifos:family-response-board-changed";
export type FamilyResponseRequest = { feedbackId:string; action:"plan"; day:string } | { feedbackId:string; action:"meeting"; day:string; contactId:string; startTime:string; appointmentId?:string };
function memory(snapshot:DataSnapshot):LocalDataStore{return{close(){},readSnapshot:async()=>structuredClone(snapshot),transaction:async(_mode,_names,task)=>task({getAll:async name=>structuredClone(snapshot[name]) as never,clear:async name=>{snapshot[name]=[];},putMany:async(name:CollectionName,rows:readonly StoredRecord[])=>{for(const r of rows){const i=snapshot[name].findIndex(s=>s.id===r.id);if(i<0)snapshot[name].push(structuredClone(r));else snapshot[name][i]=structuredClone(r);}}})};}
export async function applyFamilyResponse(store:LocalDataStore,input:{request:FamilyResponseRequest;expectedFingerprint:string;now?:Date}){
  const now=input.now??new Date(), request=structuredClone(input.request);
  const result=await store.transaction("readwrite",COLLECTION_NAMES,async tx=>{
    const snapshot=createEmptySnapshot();for(const name of COLLECTION_NAMES)snapshot[name]=await tx.getAll(name);
    const model=familyResponseBoardModel(snapshot,request.day,now);if(!model.scope)throw new Error("Etkin sınıfı açın.");
    const row=model.rows.find(r=>r.feedback.some(f=>f.record.id===request.feedbackId));const feedback=row?.feedback.find(f=>f.record.id===request.feedbackId)?.record;
    if(!row||!feedback||feedback.workflow.kind!=="feedback"||row.card.workflow.kind!=="prepared"||row.reason)throw new Error("Bu sınıftaki gerçek aile yanıtını seçin.");
    const prior=homeGameCards(snapshot).find(r=>r.workflow.kind==="response-action"&&r.workflow.feedbackId===feedback.id&&r.workflow.action===request.action&&r.workflow.targetDate===request.day);
    if(prior&&prior.workflow.kind==="response-action"){
      const priorWorkflow=prior.workflow;
      if(request.action==="meeting"){
        const saved=snapshot.settings.find(r=>r.workflow&&typeof r.workflow==="object"&&"appointmentId" in r.workflow&&r.workflow.appointmentId===priorWorkflow.appointmentId&&"contact" in r.workflow);
        const contact=saved?.workflow&&typeof saved.workflow==="object"&&"contact" in saved.workflow?saved.workflow.contact:null;
        if(!contact||typeof contact!=="object"||!("id" in contact)||contact.id!==request.contactId||(request.appointmentId&&request.appointmentId!==prior.workflow.appointmentId))throw new Error("Bu yanıt için aynı güne farklı bir görüşme adımı zaten kaydedilmiş. Kayıtlı görüşmeyi açın.");
      }
      return prior;
    }
    if(responseFingerprint(snapshot)!==input.expectedFingerprint)throw new Error("Aile yanıtı veya plan/randevu kaynakları değişti. Güncel seçenekleri yeniden seçin.");
    assertDataSnapshotRelationships(snapshot,civilDateInIstanbul(now));
    const staged=memory(snapshot);let planId:string|null=null,activityId:string|null=null,appointmentId:string|null=null;
    const stamp=()=>{const time=Math.max(now.getTime(),...snapshot.plans.map(r=>Date.parse(r.updatedAt)+1),...snapshot.settings.map(r=>Date.parse(r.updatedAt)+1));if(!Number.isFinite(time)||time>now.getTime()+60000)throw new Error("Cihaz saati kayıt geçmişinin gerisinde; saati kontrol edin.");return new Date(time);};
    if(request.action==="plan"){
      if(!model.canPlan)throw new Error(model.planReason);
      const sourceActivityId=row.card.workflow.activityId;
      const source=snapshot.activities.find(a=>a.id===sourceActivityId)!;
      if(!Array.isArray(source.curriculumTargets)||!source.curriculumTargets.length)throw new Error("Kaynak etkinliğin kayıtlı program hedefi yok; önce kaynak etkinliği tamamlayın.");
      let created=false;
      for(let i=0;i<5;i++){
        const next=await loadPlanNextSteps(staged,{civilDate:request.day,requestedLevel:"daily"});const option=next.options.find(o=>o.request)?.request;
        if(!option)throw new Error("Bu gün için yeni günlük plan seçeneği hazırlanamadı.");
        if(option.kind!=="create-daily-plan"){await applyPlanNextStep(staged,option,{now:stamp()});continue;}
        const flow=option.dailyFlowBlocks.map(block=>block.kind==="teacher-activity-one"?{...block,title:row.card.workflow.kind==="prepared"?row.card.workflow.title:block.title,teacherNote:"Aile dönüşündeki gerçek yanıt üzerine aynı kaynak etkinliği yeniden planlandı."}:block);
        const result=await createPlanWithActivity(staged,{civilDate:request.day,planTitle:`Aile dönüşü · ${row.card.workflow.title}`,activityTitle:row.card.workflow.title,startTime:option.startTime,endTime:option.endTime,curriculumProfile:option.curriculumProfile,curriculumTargets:source.curriculumTargets as Parameters<typeof createPlanWithActivity>[1]["curriculumTargets"],assignmentMode:"selected-students",studentIds:[row.card.studentId],teacherOwnedDailyFlowBlocks:flow,teacherOwnedActivityBlockKind:"teacher-activity-one",expectedTeacherOwnedLineage:option.expectedLineage,initialActivityStatus:"planned",now:stamp()});
        planId=result.plan.id;activityId=result.activity.id;
        const fullDescription=`Malzemeler: ${row.card.workflow.materials}\nOyun adımları: ${row.card.workflow.steps}`;
        await staged.transaction("readwrite",["activities"],t=>t.putMany("activities",[{...result.activity,description:fullDescription.length<=5000?fullDescription:"Kaynak ev oyunu kartının malzemeleri ve oyun adımları aile dönüş panosunda eksiksiz kayıtlıdır."}]));created=true;break;
      }
      if(!created)throw new Error("Plan omurgası tamamlanamadı.");
    }else{
      const contact=row.contacts.find(c=>c.id===request.contactId);if(!contact)throw new Error("Çocuğun kayıtlı yakınının adını seçin.");
      const existing=request.appointmentId?row.appointments.find(a=>a.plan?.workflow.kind==="appointment"&&a.plan.workflow.appointmentId===request.appointmentId):undefined;
      const prefix="Aile ev oyunu yanıtı görüşülecek.";
      if(existing?.plan?.workflow.kind==="appointment"){
        const w=existing.plan.workflow;if(w.scheduledOn!==request.day||w.contact.id!==contact.id||w.startTime!==request.startTime)throw new Error("Seçilen görüşme bilgileri değişti.");
        const purpose=w.purpose.includes(prefix)?w.purpose:`${w.purpose}\n${prefix}`;
        if(purpose.length>500)throw new Error("Mevcut görüşmenin kısa gündemi dolu; yeni bir görüşme saati seçin.");
        const {kind:_kind,appointmentId:id,startsAtUtc:_start,endsAtUtc:_end,...rest}=w;
        await executeFamilyEngagement(staged,{scope:model.scope,command:{action:"appointment",studentId:row.card.studentId,appointmentId:id,appointment:{...rest,previousEventId:existing.last!.id,purpose,reason:"Aile oyun kartına gelen gerçek yanıt gündeme eklendi."}},now:stamp()});appointmentId=id;
      }else{
        if(request.appointmentId)throw new Error("Seçilen görüşme artık uygun değil.");
        const slot=model.slots.find(s=>s.startTime===request.startTime);if(!slot||!model.days.includes(request.day))throw new Error("Güncel uygun görüşme saatini seçin.");
        let availabilityId=slot.availabilityId;
        if(slot.createAvailability){const availability=await executeFamilyEngagement(staged,{scope:model.scope,command:{action:"availability",availability:{scheduledOn:request.day,startTime:slot.startTime,endTime:slot.endTime,slotMinutes:20,calendarNote:""}},now:stamp()});availabilityId=availability.id;}
        const meeting=await executeFamilyEngagement(staged,{scope:model.scope,command:{action:"appointment",studentId:row.card.studentId,appointment:{previousEventId:null,availabilityId,contact:familyContactSnapshot(contact),scheduledOn:request.day,startTime:slot.startTime,endTime:slot.endTime,location:"Okul",purpose:prefix,reason:"",calendarNote:""}},now:stamp()});
        if(meeting.workflow.kind!=="appointment")throw new Error("Görüşme oluşturulamadı.");appointmentId=meeting.workflow.appointmentId;
      }
    }
    const createdAt=stamp().toISOString();const receipt:HomeGameCardRecord={id:crypto.randomUUID(),createdAt,updatedAt:createdAt,civilDate:civilDateInIstanbul(new Date(createdAt)),schemaVersion:1,deletedAt:null,settingType:HOME_GAME_CARD_SETTING_TYPE,...model.scope,studentId:row.card.studentId,workflow:{kind:"response-action",feedbackId:feedback.id,action:request.action,targetDate:request.day,planId,activityId,appointmentId}};
    snapshot.settings.push(receipt);assertDataSnapshotRelationships(snapshot,civilDateInIstanbul(now));
    for(const name of COLLECTION_NAMES){const before=await tx.getAll(name);if(canonicalJson(before)!==canonicalJson(snapshot[name]))await tx.putMany(name,snapshot[name] as StoredRecord[]);}
    return receipt;
  });
  if(typeof window!=="undefined"){window.dispatchEvent(new Event(FAMILY_RESPONSE_CHANGED));window.dispatchEvent(new Event("maarifos:teacher-followup-changed"));}
  return result;
}


