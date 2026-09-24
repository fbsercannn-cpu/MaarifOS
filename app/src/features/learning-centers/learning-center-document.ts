import type { DataSnapshot } from "../../core/domain/model.ts";
import { learningCenterState } from "../../core/domain/learning-centers.ts";
import { classroomAdminRecords, inventoryBalances } from "../../core/domain/classroom-admin.ts";
import type { PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import { createSemanticTaggedPdf, type SemanticPdfNode } from "../documents/semantic-tagged-pdf.ts";
const date = (d: string) => d.split("-").reverse().join(".");
export function learningCenterPdf(snapshot: DataSnapshot, planId: string): PdfPreviewRecipe {
  const state = learningCenterState(snapshot, planId); if (!state || state.plan.workflow.kind !== "center-plan") throw new Error("Merkez düzeni bulunamadı.");
  const w = state.plan.workflow, classroom = snapshot.classrooms.find(c => c.id === state.plan.classroomId), year = snapshot.academicYears.find(y => y.id === state.plan.academicYearId), balances = inventoryBalances(classroomAdminRecords(snapshot, state.plan));
  return { title: "Öğrenme merkezi düzeni", fields: [{ id: "materials", label: "Merkez ve malzemeler" }, { id: "reflections", label: "Ortam gözlemi ve düzenleme kararı" }], initial: { fields: ["materials"] }, async build(selection) {
    const nodes: SemanticPdfNode[] = [{ kind: "heading", level: 1, text: w.title }, { kind: "paragraph", text: `${String(classroom?.schoolName ?? "")}\n${String(classroom?.name ?? "Sınıf")} · ${String(year?.name ?? "Eğitim yılı")}\n${date(w.startOn)} – ${date(w.endOn)} · ${state.closed ? "Kapalı" : "Açık"}` }];
    if (selection.fields.includes("materials")) nodes.push({ kind: "table", headers: ["Merkez", "Malzeme", "Ayrılan", "Merkezde kalan"], columnWeights: [1.3, 2, 1, 1.2], fontSize: 10, balancePages: true, rowHeaderColumn: 0, rows: state.centers.flatMap(c => c.allocations.length ? c.allocations.map(a => { const item = balances.find(b => b.item.id === a.itemId)?.item.workflow; return [c.name, item?.name ?? "Malzeme", `${a.quantity} ${item?.unit ?? ""}`, `${a.remaining} ${item?.unit ?? ""}`]; }) : [[c.name, "Stoktan malzeme ayrılmadı", "—", "—"]]) });
    if (selection.fields.includes("reflections")) for (const c of state.centers) nodes.push({ kind: "heading", level: 2, text: c.name }, { kind: "paragraph", text: `Ortam gözlemi: ${c.observation || "Henüz yazılmadı."}\nDüzenleme kararı: ${c.nextStep || "Henüz yazılmadı."}` });
    return { bytes: await createSemanticTaggedPdf({ title: "Öğrenme merkezi düzeni", language: "tr-TR", artifactFooterText: "Okul Öncesi Öğretmeni", nodes }), mimeType: "application/pdf", fileName: `ogrenme-merkezleri-${w.startOn}.pdf` };
  } };
}
