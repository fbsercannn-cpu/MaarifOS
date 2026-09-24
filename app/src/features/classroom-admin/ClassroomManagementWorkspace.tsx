import { lazy, Suspense, useState } from "react";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { classroomAdminReminders } from "../../core/domain/classroom-admin.ts";
import { consentTripReminders, documentedSharingConsentSummary } from "../../core/domain/consent-trips.ts";
import { growthReminders } from "../growth-measurements/growth-reminders.ts";
import { learningCenterReminders } from "../../core/domain/learning-centers.ts";
import { familyEngagementReminders } from "../../core/domain/family-engagement.ts";
import { useTeacherFollowupSnapshot } from "../teacher-followup/TeacherFollowupWorkspace.tsx";
import "./classroom-admin.css";

const Growth = lazy(() => import("../growth-measurements/GrowthMeasurementsWorkspace.tsx").then(m => ({default: m.GrowthMeasurementsWorkspace})));
const Consents = lazy(() => import("../consent-trips/ConsentTripsWorkspace.tsx").then(m => ({default: m.ConsentTripsWorkspace})));
const Admin = lazy(() => import("./ClassroomAdminWorkspace.tsx").then(m => ({default: m.ClassroomAdminWorkspace})));
const Centers = lazy(() => import("../learning-centers/LearningCenterWorkspace.tsx").then(m => ({default: m.LearningCenterWorkspace})));
const Family = lazy(() => import("../family-engagement/FamilyEngagementWorkspace.tsx").then(m => ({default: m.FamilyEngagementWorkspace})));
const Templates = lazy(() => import("../school-document-template/SchoolDocumentTemplateWorkspace.tsx").then(m => ({default: m.SchoolDocumentTemplateWorkspace})));
const Routines = lazy(() => import("../daily-routine-cards/DailyRoutineCardsWorkspace.tsx").then(m => ({default: m.DailyRoutineCardsWorkspace})));
export type ManagementSection = "growth" | "consents" | "trips" | "inventory" | "handover" | "centers" | "appointments" | "communication" | "templates" | "routines";
const sections: {id: ManagementSection; title: string}[] = [{id:"growth",title:"Boy–kilo çizelgesi"},{id:"consents",title:"Belgeye bağlı veli izinleri"},{id:"trips",title:"Gezi sayımı"},{id:"inventory",title:"Malzeme ve emanet"},{id:"handover",title:"Dönem sonu devir"},{id:"centers",title:"Öğrenme merkezleri"},{id:"appointments",title:"Veli randevuları"},{id:"communication",title:"Aile iletişim tercihleri"},{id:"templates",title:"Okul belge şablonu"},{id:"routines",title:"Görsel günlük rutin kartları"}];
export function ClassroomManagementWorkspace({store, initialSection = "growth", initialStudentId, refreshKey, disabled, onChanged}: {store: LocalDataStore; initialSection?: ManagementSection; initialStudentId?: string; refreshKey?: unknown; disabled?: boolean; onChanged?(): void}) {
  const [section,setSection] = useState<ManagementSection>(initialSection);
  return <div className="classroom-management"><label className="management-selector">Çalışma alanı<select aria-label="Sınıf yönetimi alanı" value={section} onChange={e=>setSection(e.target.value as ManagementSection)}>{sections.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><Suspense fallback={<p role="status">Sınıf yönetimi açılıyor…</p>}>
    {section === "growth" ? <Growth key="growth" store={store} initialStudentId={initialStudentId} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged}/> : section === "consents" || section === "trips" ? <Consents key={section} store={store} initialStudentId={initialStudentId} initialSection={section} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged}/> : section === "centers" ? <Centers store={store} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged}/> : section === "appointments" || section === "communication" ? <Family key={section} store={store} initialSection={section} initialStudentId={initialStudentId} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged}/> : section === "routines" ? <Routines store={store} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged}/> : section === "templates" ? <Templates store={store} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged}/> : <Admin key={section} store={store} initialSection={section} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged}/>}
  </Suspense></div>;
}
export function ClassroomManagementInbox({store,refreshKey,onOpen,onOpenCalendarSettings}: {store:LocalDataStore;refreshKey?:unknown;onOpenCalendarSettings?:()=>void;onOpen(section?:ManagementSection,studentId?:string):void}) {
  const {snapshot}=useTeacherFollowupSnapshot(store,refreshKey);
  const scope=snapshot?resolveActiveClassroomScope(snapshot):null;
  if(!snapshot || !scope)return null;
  const today=civilDateInIstanbul(new Date());
  const scoped={...snapshot,settings:snapshot.settings.filter(r=>r.academicYearId===scope.academicYearId&&r.classroomId===scope.classroomId)};
  let growth: ReturnType<typeof growthReminders> = [];
  let growthNeedsCalendar = false;
  try { growth = growthReminders(scoped,today); } catch { growthNeedsCalendar = true; }
  const reminders=[...growth.map(r=>({...r,section:"growth" as const})),...consentTripReminders(scoped,today),...classroomAdminReminders(scoped,today),...learningCenterReminders(scoped,today).map(r=>({...r,studentId:undefined})),...familyEngagementReminders(scoped,today)];
  return <section className="followup-inbox" aria-label="Sınıf yönetimi işleri">{growthNeedsCalendar&&<button type="button" onClick={()=>onOpenCalendarSettings?onOpenCalendarSettings():onOpen("growth")}><span><strong>Ölçüm takvimi için eğitim yılını düzenle</strong><small>Sınıf takvimini açıp başlangıç ve bitiş tarihlerini seçin.</small></span><span aria-hidden="true">›</span></button>}<button type="button" onClick={()=>onOpen()}><span><strong>Sınıf yönetimi</strong><small>{reminders.length?`${reminders.length} sınıf işi takip bekliyor`:"Ölçüm, aile iletişimi ve sınıf düzeni"}</small></span><span aria-hidden="true">›</span></button>{reminders.length?<details><summary>Takibi gelen sınıf işlerini göster</summary><ul>{reminders.map(r=><li key={`${r.section}:${r.id}`}><button type="button" onClick={()=>onOpen(r.section,r.studentId??undefined)}><strong>{r.title}</strong><small>{r.dueOn.split("-").reverse().join(".")}</small></button></li>)}</ul></details>:null}</section>;
}
export function DocumentedConsentStatus({store,studentId,refreshKey,onOpen}: {store:LocalDataStore;studentId:string;refreshKey?:unknown;onOpen():void}) {
  const {snapshot}=useTeacherFollowupSnapshot(store,refreshKey),scope=snapshot?resolveActiveClassroomScope(snapshot):null;
  if(!snapshot||!scope)return null;
  const results=(["photo-sharing","portfolio-sharing"] as const).map(purpose=>({purpose,...documentedSharingConsentSummary(snapshot,{scope,studentId,purpose,civilDate:civilDateInIstanbul(new Date())})}));
  if(results.every(r=>r.state==="no-document"))return null;
  return <div className="documented-consent-summary"><strong>Belgeye bağlı paylaşım izinleri</strong>{results.map(r=><p key={r.purpose}>{r.purpose==="photo-sharing"?"Fotoğraf":"Portfolyo"}: {r.reason}</p>)}<button type="button" onClick={onOpen}>İzin kaydını aç</button></div>;
}
