import { isSchoolDocumentTemplate, type SchoolDocumentTemplate } from "../../core/domain/school-document-template.ts";
import { turkishDocumentName } from "../../core/domain/turkish-document-display.ts";
import { createSemanticTaggedPdf, semanticPdfFigureBoxes, type SemanticPdfNode, type SemanticTaggedPdfDocument, type SemanticTaggedPdfRuntime } from "../documents/semantic-tagged-pdf.ts";
import { registerPdfPreviewRecipe } from "../documents/pdf-preview-model.ts";

export type SchoolDocumentContext = { teacherName: string; includeSignature?: boolean };
export function schoolTemplateSignatureNodes(template: SchoolDocumentTemplate, context: SchoolDocumentContext): SemanticPdfNode[] {
  const teacher = `${turkishDocumentName(context.teacherName)}\n\nİmza: ____________________`;
  const principal = `${turkishDocumentName(template.principalName) || "Adı Soyadı: ____________________"}\n\nİmza: ____________________`;
  const headers = template.signatureLayout === "teacher-and-principal" ? ["Okul Öncesi Öğretmeni", "Okul Müdürü"] : template.signatureLayout === "teacher-left" ? ["Okul Öncesi Öğretmeni", "Düzenleme"] : ["Düzenleme", "Okul Öncesi Öğretmeni"];
  const rows = template.signatureLayout === "teacher-and-principal" ? [[teacher, principal]] : template.signatureLayout === "teacher-left" ? [[teacher, "Tarih: ____________________"]] : [["Tarih: ____________________", teacher]];
  return [{ kind: "table", headers, rows, columnWeights: template.signatureLayout === "teacher-and-principal" ? [1, 1] : template.signatureLayout === "teacher-left" ? [1, 1.6] : [1.6, 1], fontSize: 10, cellPadding: 8 }];
}

/** No template means the original renderer and bytes; the PDF library is loaded only for a local logo. */
export async function createSchoolStyledPdf(document: SemanticTaggedPdfDocument, template: SchoolDocumentTemplate | null | undefined, context: SchoolDocumentContext, runtime: SemanticTaggedPdfRuntime = {}): Promise<Uint8Array> {
  if (!template) return createSemanticTaggedPdf(document, runtime);
  if (!isSchoolDocumentTemplate(template)) throw new Error("Okul belge şablonu geçersiz.");
  const margin = Math.max(document.pageMargin ?? 54, 36);
  const logoHeight = 58;
  const nodes: SemanticPdfNode[] = [
    ...(template.logo ? [{ kind: "figure" as const, altText: "Okul logosu", height: logoHeight }] : []),
    ...template.headerLines.map(text => ({ kind: "paragraph" as const, tone: "meta" as const, text })),
    ...document.nodes,
    ...(context.includeSignature === false ? [] : schoolTemplateSignatureNodes(template, context)),
  ];
  const styled: SemanticTaggedPdfDocument = { ...document, orientation: template.orientation === "auto" ? document.orientation : template.orientation, pageMargin: margin, nodes };
  let bytes = await createSemanticTaggedPdf(styled, runtime);
  if (template.logo) {
    const box = semanticPdfFigureBoxes(bytes)[0];
    if (!box || box.altText !== "Okul logosu") throw new Error("PDF okul logosu için ayrılan alan bulunamadı.");
    const { PDFDocument, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    const first = pdf.getPages()[box.pageIndex]!;
    const image = template.logo.dataUrl.startsWith("data:image/png;") ? await pdf.embedPng(template.logo.dataUrl) : await pdf.embedJpg(template.logo.dataUrl);
    const scale = Math.min(logoHeight / image.height, 105 / image.width);
    const width = image.width * scale, height = image.height * scale;
    const bottom = box.y;
    // The first Figure node reserved this exact box. No body/header text is painted over.
    first.drawRectangle({ x: box.x - 1, y: bottom - 1, width: box.width + 2, height: box.height + 2, color: rgb(1,1,1) });
    first.drawImage(image, { x: template.layout === "official" ? box.x + (box.width - width) / 2 : box.x, y: bottom + (box.height - height) / 2, width, height });
    bytes = await pdf.save({ useObjectStreams: false, addDefaultPage: false });
  }
  const source = structuredClone(document), style = structuredClone(template), owner = { ...context };
  registerPdfPreviewRecipe(bytes, { title: document.title, fields: [{ id: "document", label: "Belgenin tamamı" }], initial: { fields: ["document"] }, async build() { return { bytes: await createSchoolStyledPdf(source, style, owner, runtime), mimeType: "application/pdf", fileName: `${source.title.replace(/[\\/:*?"<>|]/gu, "-")}.pdf` }; } });
  return bytes;
}
