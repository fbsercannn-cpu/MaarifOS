import type { SemanticPdfNode, SemanticTaggedPdfDocument, SemanticTaggedPdfRuntime } from "./semantic-tagged-pdf.ts";
import { registerPdfPreviewRecipe, validatePdfSelection, type PdfPreviewRecipe } from "./pdf-preview-model.ts";
import { TEACHER_PRINT_THEME } from "./document-theme.ts";

/** A section can only remove content already admitted by its exporter privacy/approval policy. */
export function registerSemanticPdfPreview(bytes: Uint8Array, document: SemanticTaggedPdfDocument, runtime: SemanticTaggedPdfRuntime): void {
  const source = structuredClone(document);
  const groups: { id: string; label: string; nodes: SemanticPdfNode[] }[] = [];
  const intro: SemanticPdfNode[] = [];
  for (const [index, node] of source.nodes.entries()) {
    if (node.kind === "heading" && node.level <= 2 && index > 0) {
      groups.push({ id: `section-${index}`, label: node.text, nodes: [] });
    }
    const target = groups.at(-1)?.nodes ?? intro;
    target.push(node);
  }
  if (!groups.length) groups.push({ id: "content", label: "Belge içeriği", nodes: intro.splice(0) });
  const recipe: PdfPreviewRecipe = {
    supportsAppearance: true,
    title: source.title,
    description: "Belge, bu ekranda seçilmiş kaynak ve onaylı içerikten hazırlanır. Bölüm seçimi kaynağı değiştirmez.",
    fields: groups.map(({ id, label }) => ({ id, label })),
    initial: { fields: groups.map(({ id }) => id) },
    async build(selection) {
      validatePdfSelection(recipe, selection);
      const { createSemanticTaggedPdf } = await import("./semantic-tagged-pdf.ts");
      const nodes = [...intro, ...groups.filter((group) => selection.fields.includes(group.id)).flatMap((group) => group.nodes)];
      const output = await createSemanticTaggedPdf({ ...source, nodes, theme: selection.appearance === "ink-saving" ? TEACHER_PRINT_THEME : source.theme }, runtime);
      return { fileName: `${source.title.replace(/[\\/:*?"<>|]/gu, "-")}.pdf`, mimeType: "application/pdf", bytes: output };
    },
  };
  registerPdfPreviewRecipe(bytes, recipe);
}
