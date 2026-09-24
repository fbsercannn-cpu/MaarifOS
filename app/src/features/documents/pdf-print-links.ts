/** A safe HTTP(S) URI annotation projected into the printed page's top-left coordinate space. */
export interface PdfPrintLink {
  readonly url: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface PdfAnnotationLike {
  readonly subtype?: unknown;
  readonly rect?: unknown;
  readonly unsafeUrl?: unknown;
  readonly url?: unknown;
}

function httpUrl(annotation: PdfAnnotationLike): string | undefined {
  for (const candidate of [annotation.unsafeUrl, annotation.url]) {
    if (typeof candidate !== "string" || candidate.length === 0) continue;
    try {
      const protocol = new URL(candidate).protocol;
      if (protocol === "http:" || protocol === "https:") return candidate;
    } catch {
      // PDF.js can expose a malformed source value alongside a safe normalized URL.
    }
  }
  return undefined;
}

function point(transform: readonly number[], x: number, y: number): readonly [number, number] {
  const [a, b, c, d, e, f] = transform;
  return [a * x + c * y + e, b * x + d * y + f];
}

/**
 * Keeps one output link for every source HTTP(S) Link annotation. PDF.js exposes
 * annotation rectangles in PDF coordinates; its scale-one viewport matrix maps
 * them into the same point-based top-left space used by the print DOM.
 */
export function projectPdfPrintLinks(
  annotations: readonly unknown[],
  viewportTransform: readonly number[],
): readonly PdfPrintLink[] {
  if (viewportTransform.length !== 6 || !viewportTransform.every(Number.isFinite)) {
    throw new Error("PDF bağlantı koordinatları geçersiz.");
  }
  const links: PdfPrintLink[] = [];
  for (const value of annotations) {
    if (!value || typeof value !== "object") continue;
    const annotation = value as PdfAnnotationLike;
    if (annotation.subtype !== "Link") continue;
    const url = httpUrl(annotation);
    if (!url) continue;
    if (!Array.isArray(annotation.rect) || annotation.rect.length !== 4 || !annotation.rect.every(Number.isFinite)) {
      throw new Error("PDF bağlantı alanı okunamadı.");
    }
    const [x1, y1, x2, y2] = annotation.rect as number[];
    const corners = [point(viewportTransform, x1, y1), point(viewportTransform, x1, y2), point(viewportTransform, x2, y1), point(viewportTransform, x2, y2)];
    const xs = corners.map(corner => corner[0]), ys = corners.map(corner => corner[1]);
    const x = Math.min(...xs), y = Math.min(...ys), width = Math.max(...xs) - x, height = Math.max(...ys) - y;
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new Error("PDF bağlantı alanı yazdırma için geçersiz.");
    }
    links.push({ url, x, y, width, height });
  }
  return links;
}
