import { classroomAdminRecords, handoverState, inventoryBalances, staleHandoverItems, type InventoryParty } from "../../core/domain/classroom-admin.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import type { PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import { type SemanticPdfNode } from "../documents/semantic-tagged-pdf.ts";
import { activeSchoolDocumentTemplate, schoolDocumentTemplateRecords } from "../../core/domain/school-document-template.ts";
import { createSchoolStyledPdf } from "../school-document-template/school-document-template-pdf.ts";

const dateLabel = (value: string) => /^\d{4}-\d{2}-\d{2}$/u.test(value) ? value.split("-").reverse().join(".") : value;
function documentScope(snapshot: DataSnapshot, scope: { academicYearId: string; classroomId: string }): { metadata: string; runningHeader: string } {
  const classroom = snapshot.classrooms.find(record => record.id === scope.classroomId);
  const year = snapshot.academicYears.find(record => record.id === scope.academicYearId);
  const schoolName = typeof classroom?.schoolName === "string" ? classroom.schoolName.trim() : "";
  const classroomName = String(classroom?.name ?? "Sınıf");
  const yearName = String(year?.name ?? "Eğitim yılı");
  return { metadata: [schoolName, `${classroomName} · ${yearName}`].filter(Boolean).join("\n"), runningHeader: `${classroomName} · ${yearName}` };
}

export function inventoryPartyName(snapshot: DataSnapshot, party: InventoryParty | null | undefined): string {
  return party?.type === "student" ? String(snapshot.students.find(s => s.id === party.studentId)?.displayName ?? "Çocuk kaydı bulunamadı") : party?.type === "adult" ? party.name : party?.type === "removed" ? "Kişisel kayıt kaldırıldı" : "—";
}
export function classroomInventoryPdf(snapshot: DataSnapshot, scope: { academicYearId: string; classroomId: string }, today: string): PdfPreviewRecipe {
  const balances = inventoryBalances(classroomAdminRecords(snapshot, scope));
  const context = documentScope(snapshot, scope);
  const template = schoolDocumentTemplateRecords(snapshot, scope).length ? activeSchoolDocumentTemplate(snapshot, scope) : null;
  const teacherName = String(snapshot.classrooms.find(c => c.id === scope.classroomId)?.teacherName ?? "");
  return { title: "Sınıf malzeme ve emanet defteri", fields: [{ id: "stock", label: "Malzeme ve miktarlar" }, { id: "loans", label: "Açık emanetler ve alan kişiler" }], initial: { fields: ["stock"] }, async build(selection) {
    const nodes: SemanticPdfNode[] = [{ kind: "heading", level: 1, text: "Sınıf malzeme ve emanet defteri" }, { kind: "paragraph", text: `${context.metadata}\nDüzenleme tarihi: ${dateLabel(today)}` }];
    const stockNote: SemanticPdfNode = { kind: "paragraph", tone: "meta", text: "Toplam = kullanılabilir + emanet + hasarlı. Farklı ölçü birimleri birbiriyle toplanmaz. Düzeltme ve hareket geçmişi uygulamada korunur." };
    if (template) nodes.push(stockNote);
    if (selection.fields.includes("stock")) nodes.push({ kind: "table", headers: ["Malzeme / birim", "Toplam", "Kullanılabilir", "Emanet", "Hasarlı"], columnWeights: [2.4, 1, 1.2, 1, 1], rowHeaderColumn: 0, continuationContextColumns: [0], balancePages: true, reserveAfter: template && !selection.fields.includes("loans") ? 120 : 0, rows: balances.map(b => [`${b.item.workflow.name}\n${b.item.workflow.category || "Genel"} · ${b.item.workflow.unit}`, String(b.owned), String(b.available), String(b.onLoan), String(b.damaged)]) });
    if (selection.fields.includes("loans")) nodes.push({ kind: "heading", level: 2, text: "Açık emanetler" }, { kind: "table", headers: ["Malzeme", "Alan kişi", "Kalan", "İade tarihi"], columnWeights: [1.5, 1.5, 1, 1], rowHeaderColumn: 0, continuationContextColumns: [0], balancePages: true, reserveAfter: template ? 120 : 0, rows: balances.flatMap(b => b.loans.filter(l => l.remaining > 0).map(l => [b.item.workflow.name, inventoryPartyName(snapshot, l.record.workflow.kind === "inventory-movement" ? l.record.workflow.party : null), `${l.remaining} ${b.item.workflow.unit}`, l.record.workflow.kind === "inventory-movement" ? dateLabel(l.record.workflow.dueOn ?? "—") : "—"])) });
    if (!template) nodes.push(stockNote);
    return { bytes: await createSchoolStyledPdf({ title: "Sınıf malzeme ve emanet defteri", language: "tr-TR", artifactHeaderText: context.runningHeader, artifactFooterText: "Okul Öncesi Öğretmeni · Malzeme takibi", nodes }, template, { teacherName }), mimeType: "application/pdf", fileName: `sinif-malzeme-${today}.pdf` };
  } };
}
export function classroomHandoverPdf(snapshot: DataSnapshot, scope: { academicYearId: string; classroomId: string }, handoverId: string): PdfPreviewRecipe {
  const state = handoverState(classroomAdminRecords(snapshot, scope), handoverId);
  if (!state || state.source.workflow.kind !== "handover-plan") throw new Error("Devir listesi bulunamadı.");
  const plan = state.source.workflow;
  const context = documentScope(snapshot, scope);
  const template = schoolDocumentTemplateRecords(snapshot, scope).length ? activeSchoolDocumentTemplate(snapshot, scope) : null;
  const teacherName = String(snapshot.classrooms.find(c => c.id === scope.classroomId)?.teacherName ?? "");
  const staleIds = new Set(staleHandoverItems(snapshot, classroomAdminRecords(snapshot, scope), handoverId).map(i => i.id));
  return { title: "Dönem sonu devir tutanağı", fields: [{ id: "checklist", label: "Kontrol listesi ve sorumlu" }, { id: "names", label: "Maddelerle ilişkili çocuk adları" }, { id: "notes", label: "Öğretmen notları ve işlem geçmişi" }], initial: { fields: ["checklist"] }, async build(selection) {
    const closed = state.closed?.workflow;
    const nodes: SemanticPdfNode[] = [{ kind: "heading", level: 1, text: plan.title }, { kind: "paragraph", text: context.metadata }, { kind: "paragraph", text: `Teslim alacak kişi: ${closed?.kind === "handover-close" ? closed.recipient : plan.recipient}\nHedef tarih: ${dateLabel(plan.dueOn)}\nDurum: ${state.closed ? "Devir kaydı tamamlandı" : "Kontrol sürüyor"} · ${state.completedCount - staleIds.size} / ${state.items.length} madde` }];
    if (selection.fields.includes("checklist")) nodes.push({ kind: "table", headers: ["Kontrol maddesi", "Durum", "Son kontrol"], columnWeights: [3, 1, 1], rowHeaderColumn: 0, continuationContextColumns: [0], balancePages: true, reserveAfter: 110, rows: state.items.map(i => [`${i.title}${selection.fields.includes("names") && i.studentId ? `\n${String(snapshot.students.find(s => s.id === i.studentId)?.displayName ?? "Çocuk")}` : ""}`, staleIds.has(i.id) ? "Yeniden kontrol" : state.checked(i) ? "Kontrol edildi" : "Bekliyor", dateLabel(state.checks.get(i.id)?.civilDate ?? "—")]) });
    if (selection.fields.includes("notes")) {
      if (plan.note) nodes.push({ kind: "paragraph", text: plan.note });
      for (const event of state.history) if ("note" in event.workflow && event.workflow.note) nodes.push({ kind: "paragraph", text: `${dateLabel(event.civilDate)} · ${event.workflow.note}` });
    }
    if (!template) nodes.push({ kind: "paragraph", text: "Teslim eden: ____________________\nTeslim alan: ____________________\nİmza / tarih: ____________________" });
    else nodes.push({ kind: "paragraph", text: `Teslim alan: ${closed?.kind === "handover-close" ? closed.recipient : plan.recipient}\nTeslim alan imzası / tarih: ____________________` });
    nodes.push({ kind: "paragraph", tone: "meta", text: "Kontrol işareti, ilgili bilginin veya malzemenin gözden geçirildiğini ve devredildiğini kaydeder. Kaynak veli takibini veya emaneti kendiliğinden kapatmaz. Bu çıktı elektronik imza değildir." });
    return { bytes: await createSchoolStyledPdf({ title: "Dönem sonu devir tutanağı", language: "tr-TR", pageMargin: 42, artifactHeaderText: context.runningHeader, artifactFooterText: "Okul Öncesi Öğretmeni · Devir kontrolü", nodes }, template, { teacherName }), mimeType: "application/pdf", fileName: `donem-sonu-devir-${plan.dueOn}.pdf` };
  } };
}
