import {canonicalJson} from "../../core/backup/canonical-json.ts";
import {civilDateInIstanbul} from "../../core/domain/attendance.ts";
import {resolveActiveClassroomScope} from "../../core/domain/classroom-scope.ts";
import {CLASS_DUTY_SETTING_TYPE,classDutyRecords,currentClassDutySchedules,assertClassDutyRelationships,type ClassDutyRecord} from "../../core/domain/class-duty-schedule.ts";
import {COLLECTION_NAMES,createEmptySnapshot,type DataSnapshot} from "../../core/domain/model.ts";
import type {DataTransaction,LocalDataStore} from "../../core/repository/contracts.ts";
import {followupFingerprint,notifyFollowupChanged} from "../teacher-followup/teacher-followup-service.ts";
import {dutyKindLabel,dutySourceFingerprint,previewDutyRequest,type DutyRequest} from "./class-duty-model.ts";

async function read(tx:DataTransaction){const data=createEmptySnapshot();for(const name of COLLECTION_NAMES)data[name]=await tx.getAll(name);return data;}
export async function previewClassDutySchedule(store:LocalDataStore,request:DutyRequest,options:{now?:Date}={}){return previewDutyRequest(await store.readSnapshot(),request,options.now??new Date());}
export async function applyClassDutySchedule(store:LocalDataStore,input:{request:DutyRequest;expectedFingerprint:string;now?:Date}){
  const request=structuredClone(input.request),now=input.now??new Date();if(!Number.isFinite(now.getTime()))throw new Error("Çizelge kayıt saati geçersiz.");const operationHash=await followupFingerprint(request);
  // Load the validator before opening IDB: a cold module fetch would close its transaction.
  const {assertDataSnapshotRelationships}=await import("../../core/backup/schema.ts");
  const result=await store.transaction("readwrite",COLLECTION_NAMES,async tx=>{
    const data=await read(tx),scope=resolveActiveClassroomScope(data);if(!scope)throw new Error("Görev çizelgesi için etkin sınıfı seçin.");
    const repeated=classDutyRecords(data).find(r=>r.workflow.operationId===request.operationId);if(repeated){if(repeated.workflow.operationHash!==operationHash||repeated.academicYearId!==scope.academicYearId||repeated.classroomId!==scope.classroomId)throw new Error("İşlem kimliği farklı bir seçim için kullanılmış.");return{record:repeated,changed:false,summary:`${dutyKindLabel(repeated.workflow.config.kind)} çizelgesinin v${repeated.workflow.revision} sürümü zaten kayıtlı.`};}
    if(dutySourceFingerprint(data)!==input.expectedFingerprint)throw new Error("Takvim, çocuklar veya çizelge kaynakları değişti. Aynı seçimi güncel farklarla yeniden hazırlayın.");
    const preview=previewDutyRequest(data,request,now),previous=currentClassDutySchedules(data,scope).find(s=>s.workflow.scheduleId===request.scheduleId);
    if(previous&&!preview.diff.length&&canonicalJson(previous.workflow.config)===canonicalJson(preview.config))return{record:previous,changed:false,summary:"Çizelge bu seçimlerle zaten kayıtlı."};
    const max=Math.max(now.getTime(),...data.settings.map(r=>(Date.parse(r.createdAt)||0)+1));if(max>now.getTime()+60000)throw new Error("Cihaz saati önceki kayıtların gerisinde.");const at=new Date(max).toISOString(),record:ClassDutyRecord={id:crypto.randomUUID(),createdAt:at,updatedAt:at,civilDate:civilDateInIstanbul(now),schemaVersion:1,deletedAt:null,settingType:CLASS_DUTY_SETTING_TYPE,...scope,studentId:null,workflow:{kind:"schedule-revision",scheduleId:request.scheduleId,operationId:request.operationId,operationHash,revision:preview.revision,previousRevisionId:previous?.id??null,effectiveOn:preview.effectiveOn,config:preview.config,rows:preview.rows}};
    const calendar=[];
    for(const row of preview.rows){const existing=data.calendarEntries.find(e=>e.id===row.calendarEntryId),name=String(data.students.find(s=>s.id===row.studentId)?.displayName??""),title=`${dutyKindLabel(preview.config.kind)} · ${name}`;
      const entry={id:row.calendarEntryId,...scope,createdAt:existing?.createdAt??at,updatedAt:at,civilDate:existing?.civilDate??civilDateInIstanbul(now),schemaVersion:1,deletedAt:null,title:title.length<=160?title:dutyKindLabel(preview.config.kind),note:`${dutyKindLabel(preview.config.kind)} · ${name}\nÇizelge v${preview.revision} · ${row.status==="planned"?"Planlandı":row.status==="completed"?"Öğretmen gerçekleşti olarak kaydetti":row.status==="missed"?"Öğretmen gerçekleşmedi olarak kaydetti":"İptal edildi"}`,entryType:preview.config.kind==="fruit"?"fruit_day":"general_note",startDate:row.startOn,endDate:row.endOn,status:row.status==="planned"?"planned":row.status==="completed"?"completed":"cancelled"};
      const i=data.calendarEntries.findIndex(e=>e.id===entry.id);if(i<0)data.calendarEntries.push(entry);else data.calendarEntries[i]=entry;calendar.push(entry);
    }
    for(const old of previous?.workflow.rows??[]){if(preview.rows.some(r=>r.calendarEntryId===old.calendarEntryId))continue;const index=data.calendarEntries.findIndex(e=>e.id===old.calendarEntryId);if(index>=0){const entry={...data.calendarEntries[index]!,status:"cancelled",deletedAt:at,updatedAt:at};data.calendarEntries[index]=entry;calendar.push(entry);}}
    data.settings.push(record);assertClassDutyRelationships(data);assertDataSnapshotRelationships(data,civilDateInIstanbul(now));
    await tx.putMany("calendarEntries",calendar);await tx.putMany("settings",[record]);return{record,changed:true,summary:`${dutyKindLabel(preview.config.kind)} çizelgesi v${preview.revision} olarak kaydedildi; ${preview.diff.length} satırın sonucu takvime işlendi.`};
  });notifyFollowupChanged();return result;
}
export function classDutyRevisionDiff(data:DataSnapshot,record:ClassDutyRecord){const prior=classDutyRecords(data).find(r=>r.id===record.workflow.previousRevisionId);return record.workflow.rows.filter(row=>canonicalJson(prior?.workflow.rows.find(r=>r.id===row.id)??null)!==canonicalJson(row)).map(row=>row.id);}
