import { consentTripRecords, latestTripCheck, resolveConsentForUse, tripState } from "../../core/domain/consent-trips.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import { createSemanticTaggedPdf, type SemanticPdfNode } from "../documents/semantic-tagged-pdf.ts";
import type { PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import { consentDateLabel, consentPurposeLabels, consentSourceLabels, consentStateLabels, consentClockLabel } from "./consent-trip-copy.ts";

export function consentTrackingPdfRecipe(snapshot: DataSnapshot, documentId: string, civilDate: string): PdfPreviewRecipe {
  const document = consentTripRecords(snapshot).find(r => r.id === documentId && r.workflow.kind === "consent-document");
  if (!document || document.workflow.kind !== "consent-document") throw new Error("Çizelge için izin belgesi seçin.");
  const doc = document.workflow;
  const students = snapshot.students.filter(s => s.academicYearId === document.academicYearId && s.classroomId === document.classroomId && typeof s.deletedAt !== "string");
  const classroom = snapshot.classrooms.find(c => c.id === document.classroomId);
  const year = snapshot.academicYears.find(y => y.id === document.academicYearId);
  return { title: "Veli izin takip çizelgesi", description: "İzin durumu seçilen belgenin sürümü ve tarihine göre hesaplanır. İmzalayan ve kaynak alanları yalnız seçilirse eklenir.", fields: [{ id: "status", label: "İzin durumu ve tarihler" }, { id: "source", label: "İmzalayan ve belge kaynak bilgisi" }, { id: "body", label: "İzin belgesinin tam metni" }], students: students.map(s => ({ id: s.id, label: String(s.displayName ?? "Çocuk") })), initial: { fields: ["status"], studentIds: students.map(s => s.id) },
    async build(selection) {
      const selected = students.filter(s => selection.studentIds?.includes(s.id));
      if (!selected.length) throw new Error("Çizelgeye en az bir çocuk seçin.");
      const nodes: SemanticPdfNode[] = [{ kind: "heading", level: 1, text: "Veli izin takip çizelgesi" }, { kind: "paragraph", text: `${String(classroom?.name ?? "Sınıf")} · ${String(year?.name ?? "Eğitim yılı")} · Durum tarihi: ${consentDateLabel(civilDate)}` }, { kind: "heading", level: 2, text: `${doc.title} · Sürüm ${doc.version}` }, { kind: "paragraph", text: `${consentPurposeLabels[doc.purpose]}${doc.eventTitle ? ` · ${doc.eventTitle}` : ""} · ${consentDateLabel(doc.validFrom)} – ${consentDateLabel(doc.validUntil)}` }];
      if (selection.fields.includes("status") || selection.fields.includes("source")) nodes.push({ kind: "table", headers: ["Çocuk", "Belgeye bağlı izin", "Karar / geçerlilik", ...(selection.fields.includes("source") ? ["İmzalayan / kaynak"] : [])], columnWeights: selection.fields.includes("source") ? [1.2, 1, 1.25, 1.4] : [1.2, 1.2, 1.4], fontSize: 9, rowHeaderColumn: 0, continuationContextColumns: [0], preserveContinuationContext: true, rows: selected.map(s => {
        const resolution = resolveConsentForUse(snapshot, { academicYearId: document.academicYearId, classroomId: document.classroomId, studentId: s.id, documentId, purpose: doc.purpose, eventId: doc.eventId, civilDate });
        const decision = resolution.decision?.workflow.kind === "consent-decision" ? resolution.decision.workflow : null;
        return [String(s.displayName ?? "Çocuk"), consentStateLabels[resolution.state], decision ? `${consentDateLabel(decision.signedOn)}\n${consentDateLabel(decision.validFrom)} – ${consentDateLabel(decision.validUntil)}` : "Kayıt yok", ...(selection.fields.includes("source") ? [decision ? `${decision.signatory} (${decision.signatoryRole})\n${consentSourceLabels[decision.source]}\n${decision.sourceReference}` : "—"] : [])];
      }) });
      if (selection.fields.includes("body")) nodes.push({ kind: "heading", level: 2, text: "Kaynak belge metni" }, { kind: "paragraph", text: doc.body || "Belge metni uygulamaya girilmemiştir; başlık, sürüm ve kaynak kaydı izlenir." });
      nodes.push({ kind: "paragraph", tone: "meta", text: `${selected.length} çocuk · Bu çizelge öğretmenin izin takip kaydıdır; imza doğrulaması veya izin belgesinin kendisi değildir.` });
      return { bytes: await createSemanticTaggedPdf({ title: "Veli izin takip çizelgesi", orientation: "landscape", language: "tr-TR", artifactFooterText: "Okul Öncesi Öğretmeni · Veli izin takip kaydı", nodes }), mimeType: "application/pdf", fileName: `veli-izin-takibi-${civilDate}.pdf` };
    } };
}
export function tripCountingPdfRecipe(snapshot: DataSnapshot, tripId: string): PdfPreviewRecipe {
  const records = consentTripRecords(snapshot);
  const plan = records.find(r => r.id === tripId && r.workflow.kind === "trip-plan");
  if (!plan || plan.workflow.kind !== "trip-plan") throw new Error("Sayım çizelgesi için gezi seçin.");
  const p = plan.workflow, state = tripState(records, tripId);
  const roster = state.start ? state.roster.map(r => r.studentId) : p.selectedStudentIds;
  return { title: "Gezi sayım çizelgesi", fields: [{ id: "counts", label: "Çıkış, ara kontrol ve dönüş" }], initial: { fields: ["counts"] }, async build() {
    const nodes: SemanticPdfNode[] = [{ kind: "heading", level: 1, text: p.title }, { kind: "paragraph", text: `${consentDateLabel(p.plannedOn)} · ${p.destination}\nSorumlu: ${p.responsible}` }, { kind: "paragraph", text: `Dönüşü görülen: ${state.returned} / ${state.roster.length}. Sayım bekleyen / görülmeyen: ${state.missing}. Gizlilik gereği kimliği kaldırılan tarihsel katılımcı: ${state.redactedParticipantCount}.` }, { kind: "table", headers: ["Çocuk", "Çıkış", "Ara kontrol", "Dönüş"], columnWeights: [1.4, 1, 1, 1], rowHeaderColumn: 0, continuationContextColumns: [0], rows: roster.map(id => [String(snapshot.students.find(s => s.id === id)?.displayName ?? "Çocuk kaydı bulunamadı"), ...(["departure", "checkpoint", "return"] as const).map(stage => { const check = latestTripCheck(records, tripId, id, stage); return check?.workflow.kind === "trip-check" ? `${check.workflow.outcome === "seen" ? "Görüldü" : "Görülmedi"} · ${consentClockLabel(check.workflow.actualAt)}${check.workflow.previousCheckId ? "\nGerekçeli düzeltme var" : ""}` : "Sayım bekliyor"; })]) }, { kind: "paragraph", tone: "meta", text: "Bu belge yoklama değildir. Sayım bekleyen kayıtlar devamsızlık olarak yorumlanmaz. Düzeltmelerin kaynak geçmişi uygulamada korunur." }];
    return { bytes: await createSemanticTaggedPdf({ title: "Gezi sayım çizelgesi", language: "tr-TR", artifactFooterText: "Okul Öncesi Öğretmeni · Gezi sayım kaydı", nodes }), mimeType: "application/pdf", fileName: `gezi-sayimi-${p.plannedOn}.pdf` };
  } };
}
