import React,{useState} from "react";import {createRoot} from "react-dom/client";
import {IndexedDbDataStore} from "../src/core/repository/indexed-db.ts";
import {familyResponseFixture} from "./fixtures/family-response-fixture.mjs";
import {createCitedAssessmentDraft} from "../src/features/evidence/evidence-flow.ts";
import {TeacherReportCenterPanel} from "../src/features/teacher-report-center/TeacherReportCenterPanel.tsx";
import {PdfPreviewHost} from "../src/features/documents/PdfPreviewHost.tsx";
import {MobileDeviceProvider,KeyboardProvider} from "../src/mobile";
const store=new IndexedDbDataStore({databaseName:"teacher-report-center"});
if(!(await store.readSnapshot()).students.length){const f=await familyResponseFixture(store);await createCitedAssessmentDraft(store,{studentId:f.input.studentId,observationIds:[f.observationId],teacherAssessmentText:"Gerçek öğretmen değerlendirmesi; çocuğun davetini gözledim.",periodStart:"2026-09-01",periodEnd:"2026-09-30",now:new Date("2026-09-12T08:00:00Z")});}
const snapshot=await store.readSnapshot(),scope={academicYearId:snapshot.academicYears[0].id,classroomId:snapshot.classrooms[0].id};
function Fixture(){const [revision,setRevision]=useState(0),[disabled,setDisabled]=useState(false),[destination,setDestination]=useState("");Object.assign(window,{reportTest:{store,scope,bump:()=>setRevision(v=>v+1),setDisabled}});return <><TeacherReportCenterPanel store={store} refreshKey={revision} disabled={disabled} onChanged={()=>setRevision(v=>v+1)} onPreparePlan={d=>setDestination(`plan:${d}`)} onOpenCapture={()=>setDestination("capture")} onOpenAssessment={d=>setDestination(`assessment:${d}`)} onOpenStudentReport={id=>setDestination(`student:${id}`)}/><PdfPreviewHost sourceRevision={revision} historyStore={store} historyScope={scope}/><p aria-label="Açılan işlem">{destination}</p></>}
createRoot(document.getElementById("root")!).render(<MobileDeviceProvider><KeyboardProvider native><Fixture/></KeyboardProvider></MobileDeviceProvider>);
