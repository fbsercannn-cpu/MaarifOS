import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { classroomAdminRecords, inventoryBalances } from "../../core/domain/classroom-admin.ts";
import { assertLearningCenterRelationships, learningCenterRecords, learningCenterState, LEARNING_CENTER_SETTING_TYPE, type LearningCenterRecord } from "../../core/domain/learning-centers.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type CollectionName, type DataSnapshot, type StoredRecord } from "../../core/domain/model.ts";
import { teacherFollowups, type PreparationSource } from "../../core/domain/teacher-followup.ts";
import type { DataTransaction, LocalDataStore } from "../../core/repository/contracts.ts";
import { appendTeacherFollowup, combinePreparationItems, notifyFollowupChanged, preparationCandidates } from "../teacher-followup/teacher-followup-service.ts";
import { getActivityStudioItem } from "../activity-studio/activity-studio-model.ts";

export interface MaterialBox { id:string; planId:string; centerId:string; title:string; contents:string[]; activities:{id:string;planId:string;title:string}[]; studentIds:string[]; prepared:boolean }
export interface MaterialNeed { id:string; text:string; sources:PreparationSource[]; pendingSources:PreparationSource[]; listed:boolean; completed:boolean }
export interface MaterialBoxModel { scope:ActiveClassroomScope|null; schoolName:string; classroomName:string; weekStart:string; weekEnd:string; boxes:MaterialBox[]; students:{id:string;label:string}[]; needs:MaterialNeed[]; fingerprint:string }
export type MaterialBoxCommand = {kind:"prepare-box";boxId:string;prepared:boolean}|{kind:"add-materials";materialIds:string[]};
const normalized=(text:string)=>text.normalize("NFC").trim().replace(/\s+/gu," ").toLocaleLowerCase("tr-TR");
const live=(r:StoredRecord)=>typeof r.deletedAt!=="string";
export function materialBoxWeek(day:string){if(!isCivilDate(day))throw new Error("Geçerli bir hafta tarihi seçin.");const date=new Date(`${day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);const start=date.toISOString().slice(0,10);date.setUTCDate(date.getUTCDate()+6);return{weekStart:start,weekEnd:date.toISOString().slice(0,10)};}
export function materialBoxModel(data:DataSnapshot,day:string):MaterialBoxModel {
  const scope=resolveActiveClassroomScope(data),period=materialBoxWeek(day),classroom=data.classrooms.find(c=>c.id===scope?.classroomId);
  const model:MaterialBoxModel={scope,schoolName:String(classroom?.schoolName??""),classroomName:String(classroom?.name??""),...period,boxes:[],students:[],needs:[],fingerprint:""};
  if(!scope)return model;
  const object=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
  const texts=(v:unknown):string[]=>Array.isArray(v)?v.filter((s):s is string=>typeof s==="string"&&!!s.trim()):[];
  const candidates=preparationCandidates(data,scope,period.weekStart,period.weekEnd).filter(c=>c.source.collection==="activities"&&data.activities.find(a=>a.id===c.source.id)?.activityKind!=="spontaneous-observation").map(candidate=>{
    const activity=data.activities.find(a=>a.id===candidate.source.id)!,plan=data.plans.find(p=>p.id===activity.planId);
    const provenance=object(activity.pedagogicalProvenance??plan?.pedagogicalProvenance),studio=typeof provenance.sourceActivityId==="string"?getActivityStudioItem(provenance.sourceActivityId):null;
    return{...candidate,materials:[...new Set([...candidate.materials,...texts(object(activity.appliedActivityTemplateSnapshot).materials),...texts(object(plan?.appliedActivityTemplateSnapshot).materials),...(studio?.materials??[])])]};
  });
  const inventory=inventoryBalances(classroomAdminRecords(data,scope)),records=learningCenterRecords(data,scope);
  for(const plan of records){if(plan.workflow.kind!=="center-plan"||plan.workflow.startOn>period.weekEnd||plan.workflow.endOn<period.weekStart)continue;
    const state=learningCenterState(data,plan.id);if(!state||state.closed)continue;
    for(const center of state.centers){const names=center.allocations.filter(a=>a.remaining>0).map(a=>inventory.find(i=>i.item.id===a.itemId)?.item.workflow.name).filter((v):v is string=>!!v);
      const sources=candidates.filter(c=>c.materials.some(m=>names.some(n=>normalized(m)===normalized(n))));
      const studentIds=[...new Set(sources.flatMap(source=>{const activity=data.activities.find(a=>a.id===source.source.id)!;const plan=data.plans.find(p=>p.id===activity.planId);return[activity,plan].flatMap(r=>r?[...(Array.isArray(r.studentIds)?r.studentIds.filter((id):id is string=>typeof id==="string"):[]),...(typeof r.studentId==="string"?[r.studentId]:[])]:[]);} ))].sort();
      const check=records.filter(r=>r.workflow.kind==="center-box-check"&&r.workflow.planId===plan.id&&r.workflow.centerId===center.id).at(-1);
      const movedAfter=check&&classroomAdminRecords(data,scope).some(r=>r.createdAt>check.createdAt&&r.workflow.kind==="inventory-movement"&&center.allocations.some(a=>r.workflow.kind==="inventory-movement"&&a.loanId===r.workflow.loanId));
      model.boxes.push({id:`${plan.id}:${center.id}`,planId:plan.id,centerId:center.id,title:center.name,contents:center.allocations.map(a=>{const item=inventory.find(i=>i.item.id===a.itemId);return item?`${item.item.workflow.name} · ${a.remaining} ${item.item.workflow.unit}`:"";}).filter(Boolean),activities:sources.map(s=>({id:s.source.id,title:s.source.title,planId:String(data.activities.find(a=>a.id===s.source.id)?.planId??"")})),studentIds,prepared:check?.workflow.kind==="center-box-check"&&check.workflow.prepared&&!movedAfter});
    }
  }
  model.students=[...new Set(model.boxes.flatMap(b=>b.studentIds))].sort().map(id=>{const student=data.students.find(s=>s.id===id&&live(s));if(!student)throw new Error("Etiketin kaynak etkinliğindeki çocuk kapsamı değişti.");return{id,label:String(student.displayName)};});
  const followups=teacherFollowups(data).filter(r=>r.classroomId===scope.classroomId&&r.academicYearId===scope.academicYearId);
  const lists=followups.filter(r=>r.workflow.kind==="preparation-list"&&r.workflow.weekStart<=period.weekEnd&&r.workflow.weekEnd>=period.weekStart&&r.workflow.sources.every(s=>data[s.collection].some(source=>source.id===s.id&&source.updatedAt===s.updatedAt&&live(source))));
  for(const item of combinePreparationItems(candidates.map(c=>({...c,preparation:[]})),period.weekStart)){
    const sources=candidates.filter(c=>item.sourceIds.includes(c.source.id)).map(c=>c.source),covered=sources.map(source=>{
      const found=lists.flatMap(r=>r.workflow.kind==="preparation-list"&&r.workflow.sources.some(s=>s.collection===source.collection&&s.id===source.id&&s.updatedAt===source.updatedAt)?r.workflow.items.filter(i=>!i.advance&&i.dueOn>=period.weekStart&&i.dueOn<=period.weekEnd&&i.sourceIds.includes(source.id)&&normalized(i.text)===normalized(item.text)).map(i=>({list:r,item:i})):[])[0];
      const check=found?followups.filter(r=>r.workflow.kind==="preparation-check"&&r.workflow.sourceId===found.list.id&&r.workflow.itemId===found.item.id).at(-1):undefined;return{source,found,completed:check?.workflow.kind==="preparation-check"&&check.workflow.completed};
    });
    model.needs.push({id:normalized(item.text),text:item.text,sources,pendingSources:covered.filter(c=>!c.found).map(c=>c.source),listed:covered.every(c=>!!c.found),completed:covered.every(c=>c.completed)});
  }
  model.fingerprint=canonicalJson({...model,sourceMetadata:{centers:records,inventory:classroomAdminRecords(data,scope),sources:candidates.map(c=>c.source)}});
  return model;
}
export async function loadMaterialBoxModel(store:LocalDataStore,day=civilDateInIstanbul(new Date())){return materialBoxModel(await store.readSnapshot(),day);}
async function read(tx:DataTransaction){const data=createEmptySnapshot();for(const c of COLLECTION_NAMES)data[c]=await tx.getAll(c);return data;}
function memory(data:DataSnapshot):LocalDataStore{return{readSnapshot:async()=>structuredClone(data),close(){},transaction:async(_mode,_collections,task)=>task({getAll:async c=>structuredClone(data[c]) as never,clear:async c=>{data[c]=[];},putMany:async(c:CollectionName,rows:readonly StoredRecord[])=>{for(const r of rows){const i=data[c].findIndex(x=>x.id===r.id);if(i<0)data[c].push(structuredClone(r));else data[c][i]=structuredClone(r);}}})};}
export async function applyMaterialBoxAction(store:LocalDataStore,input:{day:string;expectedFingerprint:string;command:MaterialBoxCommand;now?:Date}){
  const now=input.now??new Date();if(!Number.isFinite(now.getTime()))throw new Error("Kayıt saati geçersiz.");
  const keys=Object.keys(input.command).sort().join(",");if(input.command.kind==="prepare-box"?(keys!=="boxId,kind,prepared"||typeof input.command.prepared!=="boolean"||typeof input.command.boxId!=="string"):(input.command.kind!=="add-materials"||keys!=="kind,materialIds"||!Array.isArray(input.command.materialIds)||input.command.materialIds.length>200))throw new Error("Geçersiz malzeme işlemi.");
  const result=await store.transaction("readwrite",COLLECTION_NAMES,async tx=>{
    const before=await read(tx),model=materialBoxModel(before,input.day),command=structuredClone(input.command);
    if(!model.scope||before.academicYears.find(y=>y.id===model.scope?.academicYearId)?.status==="archived")throw new Error("Etkin bir sınıf seçin.");
    if(command.kind==="prepare-box"){const box=model.boxes.find(b=>b.id===command.boxId);if(!box)throw new Error("Seçilen merkez kutusu artık açık değil.");if(box.prepared===command.prepared)return{summary:command.prepared?"Kutu zaten hazır olarak kayıtlı.":"Kutu hazırlığı açık.",recordIds:[]};}
    else if(command.kind==="add-materials"){if(!command.materialIds.length||new Set(command.materialIds).size!==command.materialIds.length||command.materialIds.some(id=>!model.needs.some(n=>n.id===id)))throw new Error("Kayıtlı malzemelerden seçim yapın.");if(command.materialIds.every(id=>model.needs.find(n=>n.id===id)!.listed))return{summary:"Seçilen malzemeler haftanın hazırlık listesinde zaten var.",recordIds:[]};}
    else throw new Error("Geçersiz malzeme işlemi.");
    if(model.fingerprint!==input.expectedFingerprint)throw new Error("Merkez veya hazırlık kaynakları değişti. Aynı seçimleri güncel kaynaklarla yeniden açın.");
    const data=structuredClone(before),staged=memory(data);
    if(command.kind==="prepare-box"){
      const box=model.boxes.find(b=>b.id===command.boxId)!;
      const at=new Date(Math.max(now.getTime(),...data.settings.map(r=>Date.parse(r.createdAt)+1))).toISOString();
      if(Date.parse(at)>now.getTime()+60000)throw new Error("Cihaz saati önceki kayıtların gerisinde.");
      const record:LearningCenterRecord={id:crypto.randomUUID(),...model.scope,studentId:null,createdAt:at,updatedAt:at,civilDate:civilDateInIstanbul(now),schemaVersion:1,deletedAt:null,settingType:LEARNING_CENTER_SETTING_TYPE,workflow:{kind:"center-box-check",planId:box.planId,centerId:box.centerId,prepared:command.prepared}};
      data.settings.push(record);assertLearningCenterRelationships(data);
    }else{
      const selected=model.needs.filter(n=>command.materialIds.includes(n.id)&&!n.listed),sources=[...new Map(selected.flatMap(n=>n.pendingSources).map(s=>[s.id,s])).values()];
      await appendTeacherFollowup(staged,{studentId:null,now,workflow:{kind:"preparation-list",weekStart:model.weekStart,weekEnd:model.weekEnd,sources,items:selected.map(n=>({id:crypto.randomUUID(),text:n.text,advance:false,dueOn:model.weekStart,sourceIds:n.pendingSources.map(s=>s.id)}))}});
    }
    const {assertDataSnapshotRelationships}=await import("../../core/backup/schema.ts");assertDataSnapshotRelationships(data,civilDateInIstanbul(now));
    const added=data.settings.filter(r=>!before.settings.some(old=>old.id===r.id));for(const r of added)await tx.putMany("settings",[r]);
    return{summary:command.kind==="prepare-box"?(command.prepared?"Kutu hazır olarak kaydedildi.":"Kutu yeniden hazırlığa açıldı."):"Seçilen malzemeler haftanın hazırlık listesine eklendi.",recordIds:added.map(r=>r.id)};
  });notifyFollowupChanged();return result;
}
