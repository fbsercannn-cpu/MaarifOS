import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { createStudentSummaryModel, type StudentSummaryModel } from "./student-summary-model.ts";
import { createSemanticTaggedPdf, type SemanticPdfNode, type SemanticTaggedPdfRuntime } from "../documents/semantic-tagged-pdf.ts";
import { TEACHER_DOCUMENT_THEME, TEACHER_PRINT_THEME } from "../documents/document-theme.ts";
import { validatePdfSelection, type PdfPreviewRecipe, type PdfPreviewSelection } from "../documents/pdf-preview-model.ts";
import type { BrowserFileDownload } from "../documents/browser-file-download.ts";

export const STUDENT_SUMMARY_FIELDS = [{ id: "identity", label: "Kimlik ve sınıf" }, { id: "contacts", label: "İletişim" }, { id: "observations", label: "Kayıtlı gözlemler" }, { id: "supports", label: "Devam eden destek" }, { id: "next-step", label: "Sonraki takip adımı" }] as const;
export function studentSummaryNodes(model: StudentSummaryModel, selection: PdfPreviewSelection): SemanticPdfNode[] {
  const brief = selection.template !== "full";
  const observations = brief ? model.observations.slice(0, 3) : model.observations;
  const supports = brief ? model.supports.slice(0, 2) : model.supports;
  const nodes: SemanticPdfNode[] = [{ kind: "heading", level: 1, text: "ÖĞRENCİ ÖZETİ", continuationHeaderText: model.name }, { kind: "paragraph", text: `${model.name} · ${model.classroomName}`, tone: "meta" }];
  const section = (title: string, lines: string[]) => { nodes.push({ kind: "heading", level: 2, text: title }, ...lines.map(text => ({ kind: "paragraph" as const, text }))); };
  if (selection.fields.includes("identity")) section("Kimlik ve sınıf", [`Okul no: ${model.schoolNumber || "Kayıtlı değil"} · Okul: ${model.schoolName || "Kayıtlı değil"}`, `Öğretmen: ${model.teacherName || "Kayıtlı değil"}`]);
  if (selection.fields.includes("contacts")) section("İletişim", model.contacts.length ? model.contacts : ["Kayıtlı iletişim kişisi bulunmuyor."]);
  if (selection.fields.includes("observations")) section(`Kayıtlı gözlemler · ${observations.length}/${model.observations.length}`, observations.length ? observations.map(r => `${r.date} — ${r.text}${r.programSource ? `\nKayıtlı program bağı: ${r.programSource}` : ""}`) : ["Bu çocuğa ait bireysel gözlem kaydı bulunmuyor."]);
  if (selection.fields.includes("supports")) section(`Devam eden destek · ${supports.length}/${model.supports.length}`, supports.length ? supports.map(r => `${r.decision} · Kontrol tarihi: ${r.reviewOn}`) : ["Devam eden kayıtlı destek kararı bulunmuyor."]);
  if (selection.fields.includes("next-step")) section("Sonraki takip adımı", supports.length ? supports.map(r => `${r.reviewOn} — ${r.nextStep}`) : ["Sonraki adım henüz kaydedilmemiş."]);
  nodes.push({ kind: "paragraph", tone: "meta", text: brief ? "Dar özet: son 3 bireysel gözlem ve en son 2 devam eden destek. Tam ayrıntı seçeneği tüm uygun kayıtları gösterir. Uzun metinler devam sayfasına taşar." : "Tam ayrıntı: seçilen alanlardaki bütün uygun bireysel gözlem ve devam eden destek kayıtları." });
  if (model.sharedObservationCount) nodes.push({ kind: "paragraph", tone: "meta", text: "Birden fazla çocuğa bağlı ortak gözlem metinleri bu bireysel özete alınmadı." });
  return nodes;
}
export async function createStudentSummaryRecipe(store: LocalDataStore, input: { scope: ActiveClassroomScope; studentId: string; generatedAt?: string }, runtime: SemanticTaggedPdfRuntime = {}): Promise<PdfPreviewRecipe> {
  const scope = { ...input.scope }, studentId = input.studentId;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const civilDate = civilDateInIstanbul(new Date(generatedAt));
  const model = createStudentSummaryModel(await store.readSnapshot(), { scope, studentId, civilDate });
  const expected = JSON.stringify(model);
  const assertExportAllowed = async () => { if (JSON.stringify(createStudentSummaryModel(await store.readSnapshot(), { scope, studentId, civilDate })) !== expected) throw new Error("Öğrencinin kaynakları değişti. Aynı seçimlerle güncelleyin."); };
  const recipe: PdfPreviewRecipe = {
    title: "Öğrencinin tek sayfalık özeti", description: "Dar özet normal uzunlukta bir sayfadır. Uzun kaynak değerleri kesilmeden devam eder; tam ayrıntı bütün uygun kayıtları içerir.",
    supportsAppearance: true, fields: STUDENT_SUMMARY_FIELDS, students: [{ id: studentId, label: model.name }],
    templates: [{ id: "brief", label: "Dar özet · son 3 gözlem / 2 destek" }, { id: "full", label: "Tam ayrıntı · tüm uygun kayıtlar" }],
    initial: { fields: STUDENT_SUMMARY_FIELDS.map(f => f.id), studentIds: [studentId], template: "brief" }, printEnabled: true, assertExportAllowed,
    refresh: () => createStudentSummaryRecipe(store, { scope, studentId }, runtime),
    async build(selection): Promise<BrowserFileDownload> {
      validatePdfSelection(recipe, selection);
      const bytes = await createSemanticTaggedPdf({ title: "Öğrenci özeti", language: "tr-TR", orientation: "portrait", pageMargin: 32, theme: selection.appearance === "ink-saving" ? TEACHER_PRINT_THEME : TEACHER_DOCUMENT_THEME, nodes: studentSummaryNodes(model, selection), includeTotalPages: true, artifactFooterText: `MaarifOS · ${civilDate}` }, runtime);
      return { bytes, mimeType: "application/pdf", fileName: `MaarifOS_Ogrenci_Ozeti_${selection.template === "full" ? "Ayrintili" : "Kisa"}_${studentId}_${civilDate}.pdf` };
    },
    exportActions: [{ id: "word", label: "Aynı özeti Word olarak indir", async build(selection) {
      validatePdfSelection(recipe, selection); await assertExportAllowed();
      const { createStudentSummaryWord } = await import("./student-summary-word.ts");
      return { bytes: createStudentSummaryWord(studentSummaryNodes(model, selection)), mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileName: `MaarifOS_Ogrenci_Ozeti_${selection.template === "full" ? "Ayrintili" : "Kisa"}_${studentId}_${civilDate}.docx` };
    } }],
  };
  return recipe;
}
