import { appointmentState, currentAppointments, familyEngagementRecords, familyScopeMatches } from "../../core/domain/family-engagement.ts";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import { createSemanticTaggedPdf, type SemanticPdfNode } from "../documents/semantic-tagged-pdf.ts";
import { validatePdfSelection, type PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
const dateLabel = (v: string) => v.split("-").reverse().join(".");
/** Public board contains dates/occupancy only; an invitation names one selected family only. */
export function familyAppointmentPdfRecipe(snapshot: DataSnapshot, input: { scope: ActiveClassroomScope; scheduledOn: string; appointmentId?: string }): PdfPreviewRecipe {
  const records = familyEngagementRecords(snapshot), classroom = snapshot.classrooms.find(c => c.id === input.scope.classroomId);
  const selected = input.appointmentId ? appointmentState(records, input.appointmentId) : null;
  if (selected && (!selected.plan || !familyScopeMatches(input.scope, selected.plan) || selected.plan.workflow.kind !== "appointment" || selected.status === "cancelled")) throw new Error("Davet için etkin sınıftaki geçerli yerel hazırlığı seçin.");
  const selectedStudent = selected?.plan
    ? snapshot.students.find((student) => student.id === selected.plan?.studentId && familyScopeMatches(input.scope, student))
    : undefined;
  if (selected && !selectedStudent) throw new Error("Davet için etkin sınıftaki geçerli çocuğu seçin.");
  const title = selected ? "Kişiye özel veli görüşmesi hazırlık daveti" : "Veli görüşmesi hazırlık saatleri";
  const students = selectedStudent
    ? [{ id: selectedStudent.id, label: String(selectedStudent.displayName) }]
    : undefined;
  const recipe: PdfPreviewRecipe = { title, description: selected ? "Bu yerel hazırlık belgesi yalnız seçilen veli ve çocuk bilgisini içerir; resmî sistemde randevu oluşturmaz. Gönderim öğretmenin seçimine bağlıdır." : "Bu yerel hazırlık çizelgesi resmî sistemde randevu oluşturmaz; çocuk, veli, telefon, görüşme konusu veya başka aile bilgisi içermez.", fields: [{ id: "appointment", label: "Yerel hazırlık bilgisi" }], ...(students ? { students } : {}), initial: { fields: ["appointment"], ...(selectedStudent ? { studentIds: [selectedStudent.id] } : {}) }, async build(selection) {
    validatePdfSelection(recipe, selection);
    const nodes: SemanticPdfNode[] = [{ kind: "heading", level: 1, text: title }, { kind: "paragraph", text: `${String(classroom?.schoolName ?? "")}\n${String(classroom?.name ?? "Sınıf")} · ${dateLabel(input.scheduledOn)} · İstanbul saati` }];
    if (selected?.plan?.workflow.kind === "appointment") {
      const w = selected.plan.workflow;
      nodes.push({ kind: "paragraph", text: `Sayın ${w.contact.name || w.contact.relationship},\n${String(snapshot.students.find(s => s.id === selected.plan!.studentId)?.displayName ?? "Çocuğunuz")} için görüşme hazırlığı:` }, { kind: "table", headers: ["Bilgi", "Yerel hazırlık ayrıntısı"], rows: [["Tarih ve saat", `${dateLabel(w.scheduledOn)} · ${w.startTime}–${w.endTime}`], ["Görüşme yeri / yöntemi", w.location], ["Görüşme amacı", w.purpose]], columnWeights: [1, 2] }, { kind: "paragraph", text: "Bu belge MEB Okul Randevu Sistemi'nde randevu oluşturulduğu anlamına gelmez. Resmî işlemi sistemde ayrıca tamamlayın. Bu belge otomatik gönderim yapmaz." });
    } else nodes.push({ kind: "table", headers: ["Saat", "Durum"], rows: currentAppointments(records).filter(s => s.status !== "cancelled" && s.plan && familyScopeMatches(input.scope, s.plan) && s.plan.workflow.kind === "appointment" && s.plan.workflow.scheduledOn === input.scheduledOn).sort((a, b) => (a.plan!.workflow as { startTime: string }).startTime.localeCompare((b.plan!.workflow as { startTime: string }).startTime)).map(s => { const w = s.plan!.workflow; return w.kind === "appointment" ? [`${w.startTime}–${w.endTime}`, s.status === "completed" ? "Görüşme yapıldı" : "Dolu"] : []; }), columnWeights: [1, 1] });
    return { bytes: await createSemanticTaggedPdf({ title, language: "tr-TR", artifactFooterText: "Okul Öncesi Öğretmeni · Yerel veli görüşmesi hazırlığı", nodes }), mimeType: "application/pdf", fileName: `${selected ? "veli-gorusmesi-hazirlik-daveti" : "veli-gorusmesi-hazirlik-saatleri"}-${input.scheduledOn}.pdf` };
  } };
  return recipe;
}
