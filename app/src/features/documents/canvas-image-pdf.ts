const encoder = new TextEncoder();

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

function pdfStringEscape(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ");
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
 * taşıyan geçerli bir PDF 1.4 dosyası üretir. Kullanıcı verisi PDF metadata'sına
 * yazılmaz; hassas sınıf bilgileri yalnız sayfa görüntüsünde kalır.
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
      `<< /Title (${pdfStringEscape(options.title)}) /Creator (${pdfStringEscape(options.creator ?? "MaarifOS")}) >>`,
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
