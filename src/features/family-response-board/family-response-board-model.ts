import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { currentAppointments, familyEngagementRecords, availableFamilySlots, familyLocalToUtc } from "../../core/domain/family-engagement.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import { resolveSchoolDay } from "../../core/domain/school-calendar.ts";
import { studentContactsFromRecord } from "../../core/domain/student.ts";
import { homeGameCards, homeGameSource, sameHomeGameScope } from "../home-game-cards/home-game-card-model.ts";

export const responseFingerprint = (snapshot: DataSnapshot) => canonicalJson(snapshot);
export function familyResponseBoardModel(snapshot: DataSnapshot, day?: string, now = new Date()) {
  const scope = resolveActiveClassroomScope(snapshot), today = civilDateInIstanbul(now);
  const year = scope && snapshot.academicYears.find(y => y.id === scope.academicYearId);
  const days: string[] = [];
  if (scope && year && year.status !== "archived") for (let i=1;i<=28;i++) {
    const date = new Date(`${today}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+i);const value=date.toISOString().slice(0,10);
    if(resolveSchoolDay({academicYear:year,classroomId:scope.classroomId,civilDate:value,calendarEntries:snapshot.calendarEntries}).isTeachingDay)days.push(value);
  }
  const emptyDays = days.filter(value => !snapshot.plans.some(p => !p.deletedAt && p.planType === "daily" && p.civilDate === value && scope && sameHomeGameScope(scope,p)));
  const selectedDay = day && isCivilDate(day) ? day : emptyDays[0] ?? days[0] ?? today;
  const records = homeGameCards(snapshot).filter(r => scope && sameHomeGameScope(scope,r));
  const appointments = currentAppointments(familyEngagementRecords(snapshot)).filter(a=>a.status==="scheduled"&&a.plan&&scope&&sameHomeGameScope(scope,a.plan));
  const rows=records.filter(r=>r.workflow.kind==="prepared").map(card=>{
    const child=snapshot.students.find(s=>s.id===card.studentId);const w=card.workflow;
    let reason="";try{if(w.kind==="prepared")homeGameSource(snapshot,card,card.studentId,w.activityId);}catch{reason="Çocuk veya kaynak etkinlik artık bu sınıfta işleme uygun değil.";}
    const feedback=records.filter(r=>r.workflow.kind==="feedback"&&r.workflow.cardId===card.id).map(r=>({record:r,actions:records.filter(a=>a.workflow.kind==="response-action"&&a.workflow.feedbackId===r.id)}));
    return {card,name:String(child?.displayName??"Kayıtlı çocuk"),feedback,reason,contacts:child?studentContactsFromRecord(child.contacts):[],appointments:appointments.filter(a=>a.plan?.studentId===card.studentId&&a.plan.workflow.kind==="appointment"&&a.plan.workflow.scheduledOn>=today)};
  });
  const existingDay = scope && snapshot.plans.some(p=>!p.deletedAt&&p.planType==="daily"&&p.civilDate===selectedDay&&sameHomeGameScope(scope,p));
  const occupied=currentAppointments(familyEngagementRecords(snapshot)).filter(a=>a.status!=="cancelled"&&a.plan?.workflow.kind==="appointment");
  const savedSlots=scope?availableFamilySlots(snapshot,scope,selectedDay).filter(s=>s.available):[];
  const slots=savedSlots.map(s=>({...s,createAvailability:false}));
  if(!slots.length&&days.includes(selectedDay))for(const hour of [9,10,11,13,14,15,16]){
    const startTime=`${String(hour).padStart(2,"0")}:00`,endTime=`${String(hour).padStart(2,"0")}:20`;
    if(!occupied.some(a=>a.plan?.workflow.kind==="appointment"&&a.plan.workflow.startsAtUtc<familyLocalToUtc(selectedDay,endTime)&&familyLocalToUtc(selectedDay,startTime)<a.plan.workflow.endsAtUtc))slots.push({availabilityId:"",startTime,endTime,available:true,createAvailability:true});
  }
  return {scope,today,days,emptyDays,selectedDay,rows,fingerprint:responseFingerprint(snapshot),canPlan:days.includes(selectedDay)&&!existingDay,planReason:existingDay?"Bu günde günlük plan var. İkinci plan oluşturmamak için boş bir öğretim günü seçin.":!days.includes(selectedDay)?"Önümüzdeki 28 gün içindeki uygun öğretim gününü seçin.":"",slots};
}

