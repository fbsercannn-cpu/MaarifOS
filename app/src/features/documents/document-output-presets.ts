import { pdfFieldsForSelection, validatePdfSelection, type PdfPreviewRecipe, type PdfPreviewSelection } from "./pdf-preview-model.ts";
import { resolveClassRosterLayout } from "../classroom/class-roster-layouts.ts";

export const DOCUMENT_OUTPUT_COPY = {
  title: "Hazır çıktı düzenleri", detail: "Düzeni seçin; önizleme otomatik hazırlansın.",
  complete: "Ayrıntılı çıktı", color: "Renkli PDF", print: "Az mürekkepli PDF",
  printDetail: "Aynı içerik, beyaz zemin ve koyu metinle hazırlanır.",
} as const;
export interface DocumentOutputPreset { id: string; label: string; patch: Partial<PdfPreviewSelection> }
/** Only explicit recipe capabilities become choices; source/student scope is retained. */
export function documentOutputPresets(recipe: PdfPreviewRecipe, selection: PdfPreviewSelection): DocumentOutputPreset[] {
  const presets: DocumentOutputPreset[] = [];
  const fields = pdfFieldsForSelection(recipe, selection);
  if (fields.length > 1) presets.push({ id: "complete", label: DOCUMENT_OUTPUT_COPY.complete, patch: { fields: fields.map(f => f.id) } });
  for (const preset of recipe.fieldPresets ?? []) {
    if (preset.templates && !preset.templates.includes(selection.template ?? "")) continue;
    const selected = preset.fields.filter(id => fields.some(f => f.id === id));
    if (selected.length) presets.push({ id: `fields:${preset.id}`, label: preset.label, patch: { fields: selected } });
  }
  if (recipe.supportsAppearance) presets.push({ id: "color", label: DOCUMENT_OUTPUT_COPY.color, patch: { appearance: "color" } }, { id: "ink-saving", label: DOCUMENT_OUTPUT_COPY.print, patch: { appearance: "ink-saving" } });
  return presets;
}
export function selectDocumentOutputPreset(recipe: PdfPreviewRecipe, selection: PdfPreviewSelection, id: string): PdfPreviewSelection {
  const preset = documentOutputPresets(recipe, selection).find(p => p.id === id);
  if (!preset) throw new Error("Çıktı düzeni artık bu belgeye uygun değil.");
  const next = { ...selection, ...preset.patch };
  if (next.layout === "single-page-roster" && next.fields.some(field => !resolveClassRosterLayout("single-page-roster").defaultColumns.some(column => column === field))) {
    next.layout = undefined;
  }
  validatePdfSelection(recipe, next);
  return next;
}
