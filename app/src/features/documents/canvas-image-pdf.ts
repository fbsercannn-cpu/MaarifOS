import { createSemanticTaggedPdf, type SemanticPdfNode, type SemanticTaggedPdfRuntime } from "./semantic-tagged-pdf.ts";
const encoder = new TextEncoder();

export interface ImagePdfTextBox {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fontSize?: number;
}
export interface SearchableImagePdfPage {
  readonly image: Uint8Array;
  /** Text rectangles and source dimensions use the same top-left coordinate system. */
  readonly width: number;
  readonly height: number;
  readonly text: readonly ImagePdfTextBox[];
}

/** Preserve authored artwork while retaining the actual Unicode text at its measured positions. */
export async function createSearchableImagePdf(
  pages: readonly SearchableImagePdfPage[],
  options: { readonly title: string; readonly orientation?: "portrait" | "landscape"; readonly creator?: string },
  runtime: SemanticTaggedPdfRuntime = {},
): Promise<Uint8Array> {
  if (!pages.length) throw new Error("PDF için en az bir sayfa gereklidir.");
  const width = options.orientation === "landscape" ? 841.89 : 595.28;
  const height = options.orientation === "landscape" ? 595.28 : 841.89;
  const nodes: SemanticPdfNode[] = [];
  for (const [pageIndex, page] of pages.entries()) {
    if (!page.image.length || !Number.isFinite(page.width) || !Number.isFinite(page.height) || page.width <= 0 || page.height <= 0) throw new Error("PDF sayfa görseli veya boyutları geçersiz.");
    const text = page.text.filter(box => box.text.trim());
    if (!text.length) {
      nodes.push({ kind: "figure", altText: "Yazısız çizim alanı", height: 48, pageBreakBefore: pageIndex > 0, forcePageBreakBefore: true });
      continue;
    }
    text.forEach((box, index) => nodes.push({ kind: "paragraph", text: box.text,
      pageBreakBefore: pageIndex > 0 && index === 0, forcePageBreakBefore: true,
      placement: { x: box.x / page.width * width, y: box.y / page.height * height,
        width: box.width / page.width * width, height: box.height / page.height * height,
        ...(box.fontSize ? { fontSize: box.fontSize / page.height * height } : {}), invisible: true },
    }));
  }
  const textPdf = await createSemanticTaggedPdf({ title: options.title, creator: options.creator ?? "MaarifOS", orientation: options.orientation, omitPageFurniture: true, nodes }, runtime);
  const { PDFDocument, PDFName, PDFOperator, PDFOperatorNames } = await import("pdf-lib");
  const pdf = await PDFDocument.load(textPdf, { updateMetadata: false });
  if (pdf.getPageCount() !== pages.length) throw new Error("PDF görsel ve metin sayfaları eşleşmedi.");
  for (const [index, source] of pages.entries()) {
    const page = pdf.getPage(index);
    const image = await pdf.embedJpg(source.image);
    page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContent, [PDFName.of("Artifact")]));
    page.drawImage(image, { x: 0, y: 0, width, height });
    page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
  }
  return pdf.save({ useObjectStreams: false, addDefaultPage: false });
}

export const A4_PDF_CANVAS_WIDTH = 1240;
export const A4_PDF_CANVAS_HEIGHT = 1754;

function joinBytes(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    parts.reduce((total, part) => total + part.byteLength, 0),
  );
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function pdfUnicodeString(value: string): string {
  let hex = "feff";
  for (let index = 0; index < value.length; index += 1) hex += value.charCodeAt(index).toString(16).padStart(4, "0");
  return `<${hex}>`;
}

/**
 * Canvas'ın ürettiği veri URL'sini kayıpsız JPEG baytlarına dönüştürür.
 * Roster verisi bu aşamada metne çevrilmez; Türkçe glifler sayfa görselinin
 * içine tarayıcının yazı motoruyla çizilmiş durumdadır.
 */
export function jpegDataUrlBytes(dataUrl: string): Uint8Array {
  if (!dataUrl.startsWith("data:image/jpeg;base64,")) {
    throw new Error("PDF sayfası JPEG veri URL'si olarak üretilemedi.");
  }
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export interface A4ImagePdfOptions {
  readonly title: string;
  readonly creator?: string;
  readonly pageWidth?: number;
  readonly pageHeight?: number;
}

/**
 * Dış bağımlılık olmadan, her A4 canvas sayfasını tek JPEG XObject olarak
 * taşıyan geçerli bir PDF 1.4 dosyası üretir. title teknik belge türü olmalıdır;
 * çağıran taraf çocuk/veli verisini bu metadata alanına koymamalıdır.
 */
export function createA4ImagePdf(
  pageImages: readonly Uint8Array[],
  options: A4ImagePdfOptions,
): Uint8Array {
  if (pageImages.length === 0) {
    throw new Error("PDF için en az bir sayfa gereklidir.");
  }
  const pageWidth = options.pageWidth ?? A4_PDF_CANVAS_WIDTH;
  const pageHeight = options.pageHeight ?? A4_PDF_CANVAS_HEIGHT;
  if (!Number.isInteger(pageWidth) || pageWidth <= 0) {
    throw new Error("PDF sayfa genişliği pozitif tam sayı olmalıdır.");
  }
  if (!Number.isInteger(pageHeight) || pageHeight <= 0) {
    throw new Error("PDF sayfa yüksekliği pozitif tam sayı olmalıdır.");
  }

  const objects: { id: number; bytes: Uint8Array }[] = [];
  const pageIds = pageImages.map((_, index) => 3 + index * 3);
  const infoId = 3 + pageImages.length * 3;
  objects.push({
    id: 1,
    bytes: encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"),
  });
  objects.push({
    id: 2,
    bytes: encoder.encode(
      `<< /Type /Pages /Count ${pageImages.length} /Kids [${pageIds
        .map((id) => `${id} 0 R`)
        .join(" ")}] >>`,
    ),
  });

  pageImages.forEach((image, index) => {
    if (image.byteLength === 0) {
      throw new Error(`PDF sayfası ${index + 1} boş JPEG verisi içeriyor.`);
    }
    const pageId = pageIds[index]!;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const content = encoder.encode(
      "q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ",
    );
    objects.push({
      id: pageId,
      bytes: encoder.encode(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    });
    objects.push({
      id: imageId,
      bytes: joinBytes([
        encoder.encode(
          `<< /Type /XObject /Subtype /Image /Width ${pageWidth} /Height ${pageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.byteLength} >>\nstream\n`,
        ),
        image,
        encoder.encode("\nendstream"),
      ]),
    });
    objects.push({
      id: contentId,
      bytes: joinBytes([
        encoder.encode(`<< /Length ${content.byteLength} >>\nstream\n`),
        content,
        encoder.encode("\nendstream"),
      ]),
    });
  });

  objects.push({
    id: infoId,
    bytes: encoder.encode(
      `<< /Title ${pdfUnicodeString(options.title)} /Creator ${pdfUnicodeString(options.creator ?? "MaarifOS")} >>`,
    ),
  });
  objects.sort((left, right) => left.id - right.id);

  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = new Map<number, number>();
  let offset = parts[0]!.byteLength;
  for (const object of objects) {
    const prefix = encoder.encode(`${object.id} 0 obj\n`);
    const suffix = encoder.encode("\nendobj\n");
    offsets.set(object.id, offset);
    parts.push(prefix, object.bytes, suffix);
    offset += prefix.byteLength + object.bytes.byteLength + suffix.byteLength;
  }

  const xrefOffset = offset;
  const maxId = objects.at(-1)?.id ?? 0;
  const xref = [`xref\n0 ${maxId + 1}\n`, "0000000000 65535 f \n"];
  for (let id = 1; id <= maxId; id += 1) {
    xref.push(`${String(offsets.get(id) ?? 0).padStart(10, "0")} 00000 n \n`);
  }
  parts.push(
    encoder.encode(
      `${xref.join("")}trailer\n<< /Size ${maxId + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    ),
  );
  return joinBytes(parts);
}
