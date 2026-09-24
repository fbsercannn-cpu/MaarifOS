import React,{useState} from "react";import {createRoot} from "react-dom/client";
import {IndexedDbDataStore} from "../src/core/repository/indexed-db.ts";
import {makeDevelopmentReportFixture} from "./fixtures/development-report-fixture.mjs";
import {ensureSpontaneousObservationContext} from "../src/features/evidence/spontaneous-observation.ts";
import {persistQuickObservationDraft,finalizeQuickObservationDraft} from "../src/features/evidence/quick-observation.ts";
import {createCitedAssessmentDraft} from "../src/features/evidence/evidence-flow.ts";
import {WorkPackageCenter} from "../src/features/work-packages/WorkPackageCenter.tsx";
import {ActionCenter} from "../src/features/action-center/ActionCenter.tsx";
import {DeskDocumentCenter} from "../src/features/documents/DeskDocumentCenter.tsx";
const DocumentWorkshop=React.lazy(()=>import("../src/features/documents/DocumentWorkshop.tsx").then(m=>({default:m.DocumentWorkshop})));
import {MobileDeviceProvider,KeyboardProvider} from "../src/mobile";
const store=new IndexedDbDataStore({databaseName:"click-completion-sept12"});
const neutralId="00000000-0000-4000-9500-000000004201",assessmentId="00000000-0000-4000-9500-000000004202";
if(!(await store.readSnapshot()).students.length){
 const f=await makeDevelopmentReportFixture(store),now=new Date("2026-09-12T08:00:00.000Z");const context=await ensureSpontaneousObservationContext(store,{studentId:f.input.studentId,civilDate:"2026-09-12",now});
 await persistQuickObservationDraft(store,{studentId:f.input.studentId,planId:context.plan.id,activityId:context.activity.id,rawText:"Kurgu nötr kayıt: bir süre bulunduğu yerde kaldı.",categoryIds:[],observationType:"quick-note",now});await finalizeQuickObservationDraft(store,{studentId:f.input.studentId,observationId:neutralId,now});
 await createCitedAssessmentDraft(store,{draftId:assessmentId,studentId:f.input.studentId,observationIds:[f.observationId],teacherAssessmentText:"Öğretmenin önceden yazdığı gerçek değerlendirme metni.",periodStart:"2026-09-01",periodEnd:"2026-09-30",now});
}
let reads=0;const originalRead=store.readSnapshot.bind(store);store.readSnapshot=async()=>{reads++;return originalRead();};
const mode=new URLSearchParams(location.search).get("mode")??"work";
function Fixture(){const [disabled,setDisabled]=useState(false),[revision,setRevision]=useState(0);Object.assign(window,{clickCompletionTest:{store,neutralId,assessmentId,readCount:()=>reads,setDisabled}});const changed=()=>setRevision(v=>v+1);return <><button onClick={()=>setDisabled(v=>!v)}>İşlem kilidini değiştir</button>{mode==="work"?<WorkPackageCenter store={store} observationId={neutralId} mode="observations" civilDate="2026-09-12" refreshKey={revision} disabled={disabled} onChanged={changed}/>:mode==="desk"?<DeskDocumentCenter store={store} refreshKey={revision} disabled={disabled} onChanged={changed} onOpenPlan={()=>{}} onOpenDate={()=>{}} onPlanDate={()=>{}}/>:mode==="assessment"?<ActionCenter store={store} refreshKey={revision} disabled={disabled} onChanged={changed}/>:<React.Suspense fallback={<p>Atölye yükleniyor</p>}><DocumentWorkshop store={store} refreshKey={revision} disabled={disabled} onChanged={changed} onOpenPlan={()=>{}} onOpenPickup={()=>{}}/></React.Suspense>}</>};
createRoot(document.getElementById("root")!).render(<MobileDeviceProvider><KeyboardProvider native><Fixture/></KeyboardProvider></MobileDeviceProvider>);

