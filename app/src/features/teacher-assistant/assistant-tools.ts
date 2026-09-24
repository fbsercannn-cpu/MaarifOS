import type {DataSnapshot} from '../../core/domain/model.ts';
import {resolveActiveClassroomScope,recordBelongsToClassroomScope} from '../../core/domain/classroom-scope.ts';
import {isCivilDate} from '../../core/domain/attendance.ts';
import type {ActivityStudioItem,ActivityStudioAgeBand} from '../activity-studio/activity-studio-model.ts';

export function normalizeAssistantSearch(value:string):string {
 return value.normalize('NFC').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/\p{M}/gu,'').replace(/ı/g,'i').trim();
}
export interface AlternativeActivityFilter {ageBand:ActivityStudioAgeBand|'';maxMinutes:number;environment:'inside'|'outside'|'any';missingMaterials:readonly string[];}
const environments:Record<string,readonly string[]>={'Sınıf':['inside'],'Sanat alanı':['inside'],'Hareket alanı':['inside'],'Bahçe':['outside'],'Sınıf veya bahçe':['inside','outside']};
export function alternativeActivities(items:readonly ActivityStudioItem[],filter:AlternativeActivityFilter){
 if(!filter.ageBand||!Number.isSafeInteger(filter.maxMinutes)||filter.maxMinutes<1||filter.maxMinutes>240)return [];
 const unavailable=filter.missingMaterials.map(normalizeAssistantSearch).filter(Boolean);
 return items.filter(item=>{
  if(!Number.isFinite(item.durationMinutes)||item.durationMinutes<=0||!Number.isFinite(item.preparationMinutes)||item.preparationMinutes<0||!environments[item.environment]||!Array.isArray(item.materials)||item.materials.some(m=>typeof m!=='string'||!m.trim())||!Array.isArray(item.ageBands))return false;
  if(!item.ageBands.includes(filter.ageBand as ActivityStudioAgeBand)||item.durationMinutes+item.preparationMinutes>filter.maxMinutes)return false;
  if(filter.environment!=='any'&&!environments[item.environment].includes(filter.environment))return false;
  return !item.materials.some(material=>unavailable.some(missing=>normalizeAssistantSearch(material).includes(missing)));
 }).map(item=>({item,totalMinutes:item.durationMinutes+item.preparationMinutes,reason:`${item.durationMinutes} dk etkinlik + ${item.preparationMinutes} dk hazırlık · ${item.environment}`}))
 .sort((a,b)=>a.totalMinutes-b.totalMinutes||(a.item.id<b.item.id?-1:a.item.id>b.item.id?1:0));
}

export interface ObservationSearchFilter {query:string;studentId:string;activityId:string;dateFrom:string;dateTo:string;}
export function observationSearchModel(snapshot:DataSnapshot,filter:ObservationSearchFilter){
 const scope=resolveActiveClassroomScope(snapshot);
 const empty={scope,students:[],activities:[],results:[]} as {scope:typeof scope;students:{id:string;name:string}[];activities:{id:string;name:string}[];results:{id:string;civilDate:string;rawText:string;studentNames:string;activityTitle:string}[]};
 if(!scope)return empty;
 if((filter.dateFrom&&!isCivilDate(filter.dateFrom))||(filter.dateTo&&!isCivilDate(filter.dateTo))||(filter.dateFrom&&filter.dateTo&&filter.dateFrom>filter.dateTo))throw new Error('Başlangıç ve bitiş gününü geçerli sırayla seçin.');
 const students=snapshot.students.filter(s=>!s.deletedAt&&recordBelongsToClassroomScope(s,scope)).map(s=>({id:s.id,name:typeof s.displayName==='string'?s.displayName:'Adı kaydedilmemiş çocuk'}));
 const activities=snapshot.activities.filter(a=>!a.deletedAt&&recordBelongsToClassroomScope(a,scope)).map(a=>({id:a.id,name:typeof a.title==='string'?a.title:'Başlığı kaydedilmemiş etkinlik'}));
 if((filter.studentId&&!students.some(s=>s.id===filter.studentId))||(filter.activityId&&!activities.some(a=>a.id===filter.activityId)))return {...empty,students,activities};
 const words=normalizeAssistantSearch(filter.query).split(/\s+/).filter(Boolean);
 const results=snapshot.observations.filter(o=>!o.deletedAt&&recordBelongsToClassroomScope(o,scope)&&typeof o.rawText==='string'&&isCivilDate(o.civilDate)).filter(o=>{
  if(filter.studentId&&(!Array.isArray(o.studentIds)||!o.studentIds.includes(filter.studentId)))return false;
  return (!filter.activityId||o.activityId===filter.activityId)&&(!filter.dateFrom||o.civilDate>=filter.dateFrom)&&(!filter.dateTo||o.civilDate<=filter.dateTo);
 }).map(o=>({id:o.id,civilDate:o.civilDate,rawText:String(o.rawText),studentNames:students.filter(s=>Array.isArray(o.studentIds)&&o.studentIds.includes(s.id)).map(s=>s.name).join(', '),activityTitle:activities.find(a=>a.id===o.activityId)?.name??'Etkinlik kaydı bulunamadı'}))
 .filter(o=>{const text=normalizeAssistantSearch(`${o.rawText} ${o.studentNames} ${o.activityTitle}`);return words.every(word=>text.includes(word));})
 .sort((a,b)=>a.civilDate>b.civilDate?-1:a.civilDate<b.civilDate?1:a.id<b.id?-1:a.id>b.id?1:0);
 return {scope,students,activities,results};
}
