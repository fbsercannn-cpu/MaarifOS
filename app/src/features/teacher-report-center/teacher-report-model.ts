import {isTeacherDayClosureSetting} from "../day-closure/teacher-day-closure.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { isCivilDate } from "../../core/domain/attendance.ts";
import { academicYearUsesOfficialCalendar } from "../../core/domain/school-calendar.ts";
import { OFFICIAL_ACADEMIC_CALENDAR_2026_2027 } from "../../core/domain/official-school-calendar.ts";
import { homeGameCards } from "../home-game-cards/home-game-card-model.ts";
import { playFamilyCycleRecords } from "../planning/play-family-cycle.ts";
import { teacherFollowups } from "../../core/domain/teacher-followup.ts";
import { preparedTeacherAssessments } from "../evidence/teacher-assessment-completion.ts";
import { isTeacherMonthlyEvaluation } from "../../core/domain/teacher-owned-monthly-evaluation.ts";

export const REPORT_PERIODS = [{id:"day",label:"Günlük"},{id:"week",label:"Haftalık"},{id:"month",label:"Aylık"},{id:"term",label:"Dönemlik"},{id:"year",label:"Yıllık"}] as const;
export type ReportPeriod = typeof REPORT_PERIODS[number]["id"];
export const REPORT_FIELDS = [{id:"plans",label:"Planlanan etkinlikler"},{id:"applications",label:"Gerçek uygulamalar ve uyarlama"},{id:"observations",label:"Seçilmiş gözlemler"},{id:"family",label:"Aile çalışması ve gerçek yanıtlar"},{id:"assessments",label:"Kaydedilmiş öğretmen değerlendirmesi"},{id:"supports",label:"Destek ve sonraki adım"}] as const;
export interface ReportInput { period:ReportPeriod; day:string; studentIds?:readonly string[]; termStart?:string; termEnd?:string; }
export interface ReportRow { id:string; sourceId:string; date:string; category:typeof REPORT_FIELDS[number]["id"]; status:string; title:string; text:string; studentIds:string[]; studentNames:string; planId?:string; }
export const textValue=(value:unknown):string=>typeof value==="string"?value:"";
const ids=(r:StoredRecord):string[]=>Array.isArray(r.studentIds)?r.studentIds.filter((x):x is string=>typeof x==="string"):typeof r.studentId==="string"?[r.studentId]:[];
const shift=(date:string,n:number)=>new Date(Date.parse(`${date}T12:00:00Z`)+n*86400000).toISOString().slice(0,10);
export function reportPeriodBounds(year:StoredRecord,input:ReportInput){
 if(!REPORT_PERIODS.some(period=>period.id===input.period))throw new Error("Geçerli bir rapor dönemi seçin.");
 if(!isCivilDate(input.day)||!isCivilDate(year.startDate)||!isCivilDate(year.endDate)||input.day<year.startDate||input.day>year.endDate)throw new Error("Rapor tarihi seçili eğitim yılının içinde olmalıdır.");
 let start=input.day,end=input.day;
 if(input.period==="week"){start=shift(input.day,-((new Date(`${input.day}T12:00:00Z`).getUTCDay()+6)%7));end=shift(start,6);}
 if(input.period==="month"){start=input.day.slice(0,7)+"-01";const next=new Date(`${start}T12:00:00Z`);next.setUTCMonth(next.getUTCMonth()+1);end=shift(next.toISOString().slice(0,10),-1);}
 if(input.period==="year"){start=year.startDate;end=year.endDate;}
 if(input.period==="term"){
  const official=academicYearUsesOfficialCalendar(year)?OFFICIAL_ACADEMIC_CALENDAR_2026_2027.events.find(e=>e.kind==="term"&&e.startDate<=input.day&&e.endDate>=input.day):undefined;
  if(input.termStart||input.termEnd){if(!isCivilDate(input.termStart)||!isCivilDate(input.termEnd)||input.termStart>input.termEnd||input.termStart<year.startDate||input.termEnd>year.endDate)throw new Error("Dönemin iki sınırını eğitim yılı içinde seçin.");start=input.termStart;end=input.termEnd;}
  else if(official){start=official.startDate;end=official.endDate;}
  else throw new Error("Bu tarih için kayıtlı resmî dönem yok. Eğitim yılı içindeki dönem başlangıcını ve bitişini seçin.");
 }
 return {start:start<year.startDate?year.startDate:start,end:end>year.endDate?year.endDate:end};
}
export function teacherReportModel(snapshot:DataSnapshot,input:ReportInput){
 const scope=resolveActiveClassroomScope(snapshot);if(!scope)throw new Error("Rapor için önce sınıfınızı hazırlayın.");
 const same=(r:StoredRecord)=>!r.deletedAt&&r.academicYearId===scope.academicYearId&&r.classroomId===scope.classroomId;
 const year=snapshot.academicYears.find(r=>r.id===scope.academicYearId&&!r.deletedAt)!;
 const classroom=snapshot.classrooms.find(r=>r.id===scope.classroomId&&!r.deletedAt)!;
 const period=reportPeriodBounds(year,input),students=snapshot.students.filter(same).map(r=>({id:r.id,label:textValue(r.displayName)}));
 const selected=input.studentIds??students.map(s=>s.id);if(new Set(selected).size!==selected.length||selected.some(id=>!students.some(s=>s.id===id)))throw new Error("Seçili çocuk kapsamı değişti; güncel sınıftan yeniden seçin.");
 const selectedSet=new Set(selected),all=students.length>0&&students.every(s=>selectedSet.has(s.id));
 const inRange=(r:StoredRecord)=>same(r)&&r.civilDate>=period.start&&r.civilDate<=period.end;
 const allowed=(r:StoredRecord)=>{const children=ids(r);return children.length?children.every(id=>selectedSet.has(id)):all;};
 const rows:ReportRow[]=[];
 const add=(r:StoredRecord,category:ReportRow["category"],status:string,title:string,text:string,planId?:string,date=r.civilDate)=>{if(!text.trim()&&!title.trim())return;const childIds=ids(r);rows.push({id:`${category}:${r.id}`,sourceId:r.id,date,category,status,title,text,studentIds:childIds,studentNames:childIds.map(id=>students.find(s=>s.id===id)?.label??"").join(", "),...(planId?{planId}:{})});};
 const activities=snapshot.activities.filter(r=>inRange(r)&&allowed(r)&&snapshot.plans.some(p=>p.id===r.planId&&same(p)&&p.planType!=="spontaneous-observation"));
 for(const r of activities)add(r,"plans",r.status==="completed"?"Tamamlandı olarak kaydedildi":r.status==="cancelled"?"İptal edildi":r.status==="in-progress"?"Uygulanıyor olarak kaydedildi":"Planlandı",textValue(r.title),textValue(r.description),textValue(r.planId));
 for(const r of snapshot.observations.filter(r=>inRange(r)&&allowed(r)&&textValue(r.rawText)))add(r,"observations","Gözlendi","Öğretmenin ham gözlemi",textValue(r.rawText),textValue(r.planId));
 const cycles=playFamilyCycleRecords(snapshot).filter(r=>inRange(r)&&allowed(r));
 for(const r of cycles){const w=r.workflow;if(w.kind==="application")add(r,"applications","Öğretmen uygulama kaydı","Oyun uygulaması",`${w.implementation}\nUyarlama: ${w.adaptation}\nMalzemeler: ${w.materials.join(", ")}`,w.sourcePlanId);if(w.kind==="reflection")add(r,"assessments","Öğretmen yansıtması","Kaynaklı yansıtma",`${w.teacherReflection}\nSonraki adım: ${w.nextStep}`);if(w.kind==="family-suggestion")add(r,"family","Aileyle paylaşıldı","Aile önerisi",w.suggestion);if(w.kind==="family-feedback")add(r,"family","Gerçek aile yanıtı","Aile geri bildirimi",w.feedback);}
 for(const r of homeGameCards(snapshot).filter(r=>same(r)&&allowed(r))){const w=r.workflow;if(w.kind==="prepared"&&inRange(r))add(r,"family","Kart hazırlandı",w.title,`${w.materials}\n${w.steps}`);if(w.kind==="feedback"&&w.receivedOn>=period.start&&w.receivedOn<=period.end)add(r,"family","Gerçek aile yanıtı","Aile oyun kartı yanıtı",w.text,undefined,w.receivedOn);}
 for(const r of snapshot.reportDrafts.filter(r=>same(r)&&allowed(r)&&r.reportType==="evidence-assessment"&&r.authoredBy==="teacher"&&r.status==="teacher-saved"&&textValue(r.periodStart)>=period.start&&textValue(r.periodEnd)<=period.end))add(r,"assessments","Öğretmen tarafından kaydedildi","Kaynaklı değerlendirme",textValue(r.teacherAssessmentText),undefined,textValue(r.periodEnd));
 for(const r of teacherFollowups(snapshot).filter(r=>inRange(r)&&allowed(r))){const w=r.workflow;if(w.kind==="learning-decision")add(r,"supports","Destek kararı kaydedildi","Öğretmen destek kararı",`${w.teacherDecision}\nKontrol tarihi: ${w.reviewOn}`);if(w.kind==="learning-reflection")add(r,"supports","Takip değerlendirmesi kaydedildi","Sonraki adım",`${w.nextStep}\nSonraki kontrol: ${w.nextFollowupOn??"Yeni takip tarihi kaydedilmedi"}`);}
 rows.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const observationIds=new Set(rows.filter(r=>r.category==="observations").map(r=>r.sourceId));
 const unlinked=rows.filter(r=>r.category==="observations"&&!snapshot.evidenceCurriculumLinks.some(l=>!l.deletedAt&&l.observationId===r.sourceId));
 const pending=preparedTeacherAssessments(snapshot).filter(r=>allowed(r)&&textValue(r.periodStart)>=period.start&&textValue(r.periodEnd)<=period.end&&Array.isArray(r.observationIds)&&r.observationIds.every(id=>observationIds.has(String(id))));
 const monthlyPlans=snapshot.plans.filter(r=>same(r)&&r.planType==="monthly"&&textValue(r.periodStart)<=period.end&&textValue(r.periodEnd)>=period.start);
 if(all)for(const p of monthlyPlans){const values=Array.isArray(p.monthlyEvaluations)?p.monthlyEvaluations.filter(isTeacherMonthlyEvaluation).filter(e=>e.periodStart>=period.start&&e.periodEnd<=period.end).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id)):[];const latest=values[0];if(latest)add({...p,id:latest.id},"assessments","Öğretmenin kaydettiği aylık değerlendirme","Çocuk, program ve öğretmen değerlendirmesi",`Çocuklar: ${latest.children.narrative}\nProgram: ${latest.program.narrative}\nÖğretmen: ${latest.teacher.narrative}\nSonraki ay: ${latest.nextMonthRecommendation}`,p.id,latest.periodEnd);}
 if(all)for(const r of snapshot.settings.filter(isTeacherDayClosureSetting).filter(inRange))add(r,"supports",r.closureStatus==="complete"?"Gün kapatıldı":"Takip ertelendi","Gün kapanışı ve ertesi gün notu",textValue(r.nextDayNote)||"Sonraki gün notu kaydedilmemiş.");
 rows.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 return {scope,period,input:{...input,studentIds:[...selected]},students,rows,pending,unlinked,monthlyPlans,schoolName:textValue(classroom.schoolName),teacherName:textValue(classroom.teacherName),classroomName:textValue(classroom.name),yearStart:year.startDate as string,yearEnd:year.endDate as string,allChildren:all};
}
export type TeacherReportModel=ReturnType<typeof teacherReportModel>;


/** Counts the selected source rows once; statuses are never combined into an invented outcome. */
export function reportExecutiveSummary(rows:readonly ReportRow[]):string[]{
 const unique=[...new Map(rows.map(row=>[row.id,row])).values()];
 return [`Seçilen kaynak kaydı: ${unique.length}`, ...[...new Set(unique.map(row=>row.date.slice(0,7)))].sort().flatMap(month=>{
 const grouped=new Map<string,number>();for(const row of unique.filter(row=>row.date.startsWith(month))){const key=`${REPORT_FIELDS.find(field=>field.id===row.category)!.label} · ${row.status}`;grouped.set(key,(grouped.get(key)??0)+1);}return [`${month} · ${unique.filter(row=>row.date.startsWith(month)).length} kaynak`,...[...grouped].sort(([a],[b])=>a.localeCompare(b,'tr')).map(([label,count])=>`${label}: ${count}`)];})];
}
