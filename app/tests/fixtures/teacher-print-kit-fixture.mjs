import { makeDevelopmentReportFixture } from "./development-report-fixture.mjs";
import { normalizeStudentContacts } from "../../src/core/domain/student.ts";
import { appendTeacherFollowup,contactAreaValue,followupFingerprint,pickupContactSnapshot } from "../../src/features/teacher-followup/teacher-followup-service.ts";
import { loadPickupSheet } from "../../src/features/teacher-print-kit/print-kit-model.ts";
import { createPickupSheetPdf } from "../../src/features/teacher-print-kit/print-kit-document.ts";
import { saveDocumentVersion } from "../../src/features/documents/document-history-service.ts";
export async function makeTeacherPrintKitFixture(store){
  const f=await makeDevelopmentReportFixture(store),now=new Date("2026-09-21T12:00:00.000Z"),day="2026-09-21",scope={academicYearId:f.input.academicYearId,classroomId:f.input.classroomId};
  const contacts=normalizeStudentContacts([{id:crypto.randomUUID(),kind:"mother",name:"Kurgu Anne Yetkisiz",relationship:"Anne",phone:"05000000001",isAuthorizedPickup:false},{id:crypto.randomUUID(),kind:"other",name:"Kurgu Yetkili Yakın",relationship:"Aile yakını",phone:"05000000002",isAuthorizedPickup:true}]);
  await store.transaction("readwrite",["students"],async tx=>{const rows=await tx.getAll("students");await tx.putMany("students",rows.filter(r=>r.id===f.input.studentId).map(r=>({...r,contacts,updatedAt:"2026-09-20T07:00:00.000Z"})));});
  const student=(await store.readSnapshot()).students.find(r=>r.id===f.input.studentId);
  const delivery=await appendTeacherFollowup(store,{studentId:student.id,now,workflow:{kind:"pickup-log",contact:pickupContactSnapshot(contacts[1]),handedOverAt:"2026-09-21T11:30:00.000Z",note:"",authorityFingerprint:await followupFingerprint(contactAreaValue(student,"pickup"))}});
  const pickup=await loadPickupSheet(store,day),bytes=await createPickupSheetPdf(pickup);
  const saved=await saveDocumentVersion({store,scope},{title:"Kurgu günlük teslim çizelgesi",file:{bytes,fileName:"kurgu-teslim.pdf",mimeType:"application/pdf"},selection:{fields:["roster","phones","actual"],studentIds:pickup.rows.map(r=>r.studentId)},now});
  return{...f,scope,day,now,contacts,delivery,saved,pickup,studentId:student.id};
}
