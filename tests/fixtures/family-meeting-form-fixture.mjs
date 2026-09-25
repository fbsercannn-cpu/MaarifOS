import { makePreparedTeacherFixture } from "./prepared-teacher-actions-fixture.mjs";
import { loadPreparedTeacherActions, applyPreparedTeacherAction } from "../../src/features/teacher-followup/prepared-teacher-actions.ts";
import { loadFamilyMeetingForm } from "../../src/features/family-engagement/family-meeting-form-service.ts";
export async function makeFamilyMeetingFixture(store) {
  const f = await makePreparedTeacherFixture(store);
  const model = await loadPreparedTeacherActions(f.store, { now: f.now, mode: "family" });
  const appointment = await applyPreparedTeacherAction(f.store, { request: model.cards[0].options[0].request, expectedFingerprint:model.fingerprint, now:f.now });
  const now = new Date("2026-09-22T12:00:00.000Z"), form = await loadFamilyMeetingForm(f.store, appointment.appointmentId, now);
  const input = { appointmentId:appointment.appointmentId, expectedFingerprint:form.fingerprint, actualAtUtc:"2026-09-22T11:05:00.000Z", participants:"Kurgu Veli ve Kurgu Öğretmen", discussion:"Veli, evde birlikte yapı oyunları oynadıklarını anlattı. Öğretmen kayıtlı sınıf gözlemini paylaştı.", decision:"Aile evdeki oyun sırasında gözlediği somut davranışları paylaşacak. Öğretmen aynı bağlamda yeni bir gözlem fırsatı sunacak.", followupOn:"2026-09-29", observationIds:[f.observationId], tasks:[{owner:"family",text:"Evdeki yapı oyununda gözlenen somut davranışları takip görüşmesinde paylaşmak.",dueOn:"2026-09-29"},{owner:"teacher",text:"Sınıfta birlikte yapı oyununa gözlem fırsatı ayırmak ve gerçek gözlemi kaydetmek.",dueOn:"2026-09-28"}], confirmedOccurred:true,tasksConfirmed:true,now };
  return {...f,now,form,input,appointmentId:appointment.appointmentId};
}
