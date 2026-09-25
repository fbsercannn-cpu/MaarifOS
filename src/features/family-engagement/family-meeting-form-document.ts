import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import { createBinaryZip } from "../documents/binary-zip.ts";
import { DOCUMENT_COLORS, TEACHER_DOCUMENT_THEME } from "../documents/document-theme.ts";
import { createSemanticTaggedPdf, type SemanticPdfNode, type SemanticTaggedPdfRuntime } from "../documents/semantic-tagged-pdf.ts";
import { validatePdfSelection, type PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import { wordDocumentStyles, wordRunningFooter, wordRunningHeader, wordXmlText } from "../documents/word-document-design.ts";
import { familyMeetingFormModel, type FamilyMeetingFormModel } from "./family-meeting-form-service.ts";

const MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const title = "Veli görüşmesi gündem ve sonuç formu";
const date = (value: string) => value.split("-").reverse().join(".");
const meetingTime = (model: FamilyMeetingFormModel) => `Planlanan: ${date(model.appointment.scheduledOn)} · ${model.appointment.startTime}–${model.appointment.endTime} · ${model.appointment.location}${model.meeting ? `\nGerçek görüşme: ${new Intl.DateTimeFormat("tr-TR", { timeZone:"Europe/Istanbul", year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit" }).format(new Date(model.meeting.actualAtUtc))}` : ""}`;
export function familyMeetingDocumentParts(model: FamilyMeetingFormModel, fields: readonly string[] = ["agenda", "result", "tasks"]) {
  const status = model.meeting ? "Kaydedilmiş gerçek görüşme sonucu" : "Görüşme öncesi hazırlık — sonuç kaydı yok";
  const observations = model.observations.filter(o => o.selected);
  const source = fields.includes("agenda") ? [...model.agenda, ...observations.map(o => `${date(o.civilDate)} tarihli gözlem\n${o.rawText}`)].join("\n\n") : "Gündem bu çıktıya seçilmedi.";
  const result = fields.includes("result") ? model.meeting ? `Katılanlar\n${model.meeting.participants}\n\nGerçek görüşme notları\n${model.meeting.discussion}\n\nBirlikte alınan karar\n${model.meeting.decision}` : "Görüşme gerçekleştikten sonra öğretmenin gerçek sonuç notları bu alana kaydedilir.\n\nGörüşülenler\n\n\nBirlikte alınan karar\n\n" : "Sonuç bölümü bu çıktıya seçilmedi.";
  const tasks = fields.includes("tasks") ? model.tasks.map(t => [t.owner === "family" ? "Aile" : "Öğretmen", t.text, date(t.dueOn), t.completed ? "Öğretmen tamamlandığını kaydetti" : "Takip açık"]) : [];
  const followup = fields.includes("tasks") ? model.meeting?.followupOn ? `Ortak takip günü: ${date(model.meeting.followupOn)}` : model.meeting ? "Bu görüşmede ortak takip tarihi belirlenmedi." : "Takip tarihi görüşmede öğretmen tarafından belirlenecek." : "";
  return { status, source, result, tasks, followup };
}
export async function createFamilyMeetingFormPdf(model: FamilyMeetingFormModel, fields = ["agenda", "result", "tasks"], runtime: SemanticTaggedPdfRuntime = {}) {
  const p = familyMeetingDocumentParts(model, fields);
  const nodes: SemanticPdfNode[] = [{ kind: "heading", level: 1, text: title }, { kind: "paragraph", tone: "meta", text: `${model.schoolName}\n${model.classroomName} · ${model.studentName}\n${meetingTime(model)}` }, { kind: "paragraph", text: p.status },
    { kind: "table", headers: ["Kayıtlı gündem ve kaynak gözlemler", "Öğretmenin gerçek görüşme notları"], rows: [[p.source, p.result]], columnWeights: [0.95, 1.05], fontSize: 10, cellPadding: 9 }];
  if (fields.includes("tasks")) nodes.push({ kind: "heading", level: 2, text: "Aile ve öğretmen görevleri" }, ...(p.tasks.length ? [{ kind: "table" as const, headers: ["Sorumlu", "Kararlaştırılan görev", "Tarih", "Durum"], rows: p.tasks, columnWeights: [1.1, 3.3, 1.1, 1.8], fontSize: 10, cellPadding: 7 }] : [{ kind: "paragraph" as const, text: model.meeting ? "Bu görüşme için görev kaydı bulunmuyor." : "Görevler görüşmede aile ve öğretmen tarafından kararlaştırılacak." }]), { kind: "paragraph", text: p.followup });
  nodes.push({ kind: "paragraph", tone: "meta", text: `${model.teacherName} · Okul Öncesi Öğretmeni` });
  return createSemanticTaggedPdf({ title, language: "tr-TR", theme: TEACHER_DOCUMENT_THEME, includeTotalPages: true, artifactHeaderText: `${model.classroomName} · ${model.studentName} · ${date(model.appointment.scheduledOn)}`, artifactFooterText: "Okul Öncesi Öğretmeni · Veli görüşmesi", nodes }, runtime);
}
export function createFamilyMeetingFormDocx(model: FamilyMeetingFormModel, fields = ["agenda", "result", "tasks"]): Uint8Array {
  const p = familyMeetingDocumentParts(model, fields), e = wordXmlText;
  const para = (text: string, style = "Normal") => `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${text.split("\n").map((line,i) => `<w:r>${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${e(line)}</w:t></w:r>`).join("")}</w:p>`;
  const table = (headers: string[], rows: string[][], widths: number[]) => `<w:tbl><w:tblPr><w:tblW w:w="10066" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="140" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(edge => `<w:${edge} w:val="single" w:sz="4" w:color="${DOCUMENT_COLORS.border}"/>`).join("")}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${[headers, ...rows].map((row,i) => `<w:tr><w:trPr>${i === 0 ? "<w:tblHeader/><w:cantSplit/>" : row.join("").length < 600 ? "<w:cantSplit/>" : ""}</w:trPr>${row.map((cell,c) => `<w:tc><w:tcPr><w:tcW w:w="${widths[c]}" w:type="dxa"/><w:vAlign w:val="top"/>${i === 0 ? `<w:shd w:fill="${DOCUMENT_COLORS.tealTint}"/>` : ""}</w:tcPr>${para(cell,i === 0 ? "TableHeader" : "Normal")}</w:tc>`).join("")}</w:tr>`).join("")}</w:tbl>${para("")}`;
  const body = para(title, "Title") + para(`${model.schoolName}\n${model.classroomName} · ${model.studentName}\n${meetingTime(model)}`) + para(p.status) + table(["Kayıtlı gündem ve kaynak gözlemler", "Öğretmenin gerçek görüşme notları"], [[p.source, p.result]], [4781,5285]) + (fields.includes("tasks") ? para("Aile ve öğretmen görevleri", "Heading1") + (p.tasks.length ? table(["Sorumlu", "Kararlaştırılan görev", "Tarih", "Durum"], p.tasks, [1550,4400,1500,2616]) : para(model.meeting ? "Bu görüşme için görev kaydı bulunmuyor." : "Görevler görüşmede aile ve öğretmen tarafından kararlaştırılacak.")) + para(p.followup) : "") + para(`${model.teacherName} · Okul Öncesi Öğretmeni`);
  const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const files: Record<string,string> = {
    "[Content_Types].xml": '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
    "_rels/.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    "word/_rels/document.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>',
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8"?><w:document ${ns}><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="920" w:bottom="920" w:left="920" w:header="400" w:footer="400"/></w:sectPr></w:body></w:document>`,
    "word/styles.xml": wordDocumentStyles(22, true), "word/header1.xml": wordRunningHeader("Veli görüşmesi", `${model.classroomName} · ${model.studentName} · ${date(model.appointment.scheduledOn)}`), "word/footer1.xml": wordRunningFooter("Okul Öncesi Öğretmeni · Veli görüşmesi"),
  };
  return createBinaryZip(Object.entries(files).map(([name,text]) => ({ name, bytes: new TextEncoder().encode(text) })));
}
// Export history is not a source of this form. Keep the write service's full
// snapshot guard separate from this document's actual source closure.
function documentFingerprint(data: DataSnapshot, model: FamilyMeetingFormModel) {
  const { fingerprint: _snapshot, canRecord: _clock, observations, ...content } = model;
  const selected = observations.filter(o => o.selected);
  const ids = new Set([model.appointmentEventId, model.formId, model.meeting?.id, ...model.tasks.map(t => t.id)].filter((id): id is string => !!id));
  for (const row of data.settings) {
    const workflow = row.workflow as { appointmentId?: string; sourceId?: string } | undefined;
    if (workflow?.appointmentId === model.appointmentId) ids.add(row.id);
  }
  let size = -1;
  while (ids.size !== size) {
    size = ids.size;
    for (const row of data.settings) {
      const workflow = row.workflow as { kind?: string; sourceId?: string; observationIds?: string[] } | undefined;
      if (workflow?.kind === "family-task-check" && workflow.sourceId && ids.has(workflow.sourceId)) ids.add(row.id);
      if (ids.has(row.id) && workflow?.sourceId) ids.add(workflow.sourceId);
    }
  }
  const ordered = (rows: DataSnapshot["settings"]) => [...rows].sort((a,b) => a.id.localeCompare(b.id));
  return canonicalJson({ ...content, observations: selected,
    sources: {
      settings: ordered(data.settings.filter(row => ids.has(row.id))),
      observations: ordered(data.observations.filter(row => selected.some(o => o.id === row.id))),
      student: data.students.find(row => row.id === model.studentId),
      classroom: data.classrooms.find(row => row.id === model.scope.classroomId),
      academicYear: data.academicYears.find(row => row.id === model.scope.academicYearId),
    },
  });
}
async function loadDocumentSource(store: LocalDataStore, appointmentId: string, observationIds?: readonly string[]) {
  const data = await store.readSnapshot(), model = familyMeetingFormModel(data, appointmentId);
  if (model.status === "cancelled") throw new Error("İptal edilmiş görüşmeden yeni form hazırlanamaz.");
  if (!model.meeting && observationIds) { if (observationIds.some(id => !model.observations.some(o => o.id === id))) throw new Error("Seçilen kaynak gözlem artık bu formda bulunmuyor."); model.observations = model.observations.map(o => ({ ...o, selected: observationIds.includes(o.id) })); }
  return { model, fingerprint: documentFingerprint(data, model) };
}
export async function familyMeetingFormRecipe(store: LocalDataStore, appointmentId: string, observationIds?: readonly string[]): Promise<PdfPreviewRecipe> {
  const { model, fingerprint } = await loadDocumentSource(store, appointmentId, observationIds);
  const selectedIds = model.observations.filter(o => o.selected).map(o => o.id);
  const recipe: PdfPreviewRecipe = { title, description: model.meeting ? "Yalnız kaydedilmiş sonuç ve görevler alınır; form düzenlenebilir Word olarak da indirilebilir." : "Gündem ve seçilmiş kaynaklar hazırdır. Henüz görüşme sonucu kaydedilmemiştir.", fields: [{ id: "agenda", label: "Gündem ve seçilen kaynak gözlemler" }, { id: "result", label: "Öğretmenin gerçek görüşme sonucu" }, { id: "tasks", label: "Görevler ve takip tarihleri" }], students: [{ id: model.studentId, label: model.studentName }], initial: { fields: ["agenda", "result", "tasks"], studentIds: [model.studentId] }, printEnabled: true,
    refresh: () => familyMeetingFormRecipe(store, appointmentId, model.observations.filter(o => o.selected).map(o => o.id)),
    assertExportAllowed: async selection => { validatePdfSelection(recipe, selection); if ((await loadDocumentSource(store, appointmentId, selectedIds)).fingerprint !== fingerprint) throw new Error("Görüşme kaydı değişti. Güncel formu yeniden hazırlayın."); },
    build: async selection => { validatePdfSelection(recipe, selection); return { bytes: await createFamilyMeetingFormPdf(model, [...selection.fields]), mimeType: "application/pdf", fileName: `veli-gorusme-formu-${model.appointment.scheduledOn}.pdf` }; },
    exportActions: [{ id: "word", label: "Düzenlenebilir Word formunu indir", build: async selection => { validatePdfSelection(recipe, selection); return { bytes: createFamilyMeetingFormDocx(model, [...selection.fields]), mimeType: MIME, fileName: `veli-gorusme-formu-${model.appointment.scheduledOn}.docx` }; } }],
  }; return recipe;
}



