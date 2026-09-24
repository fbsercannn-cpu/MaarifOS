import type { PreparedPdfArtifact } from "./pdf-preview-model.ts";
import { projectPdfPrintText, type PdfPrintTextRun } from "./pdf-print-text.ts";
import { projectPdfPrintLinks, type PdfPrintLink } from "./pdf-print-links.ts";

export const PDF_PRINT_DPI = 180;
export const PDF_PRINT_CLEANUP_DELAY_MS = 120_000;
const MAX_PRINT_PIXELS = 250_000_000;
export interface PdfPrintPage { readonly widthPoints: number; readonly heightPoints: number; readonly blob: Blob; readonly text?: readonly PdfPrintTextRun[]; readonly links?: readonly PdfPrintLink[] }
export interface PdfPrintDocument { readonly pageCount: number; renderPage(pageNumber: number): Promise<PdfPrintPage>; destroy(): Promise<void> }
export interface PdfPrintStage {
  addPage(page: PdfPrintPage, pageNumber: number): Promise<void>;
  ready(): Promise<void>;
  onAfterPrint(callback: () => void): () => void;
  print(): void;
  dispose(): void;
}
export interface PdfPrintEnvironment {
  loadPdf(bytes: Uint8Array): Promise<PdfPrintDocument>;
  createStage(title: string): Promise<PdfPrintStage>;
  setTimer(callback: () => void, delayMs: number): unknown;
  clearTimer(timer: unknown): void;
}

/** Testable lifecycle; no file reconstruction and no ownership of the preview's Blob URL. */
export function createPdfPrinter(environment: PdfPrintEnvironment) {
  return async (artifact: PreparedPdfArtifact, assertCurrent: () => Promise<void>): Promise<void> => {
    let pdf: PdfPrintDocument | undefined, stage: PdfPrintStage | undefined, timer: unknown, removeAfterPrint: (() => void) | undefined;
    let disposed = false, printed = false;
    const releasePdf = async () => { const current = pdf; pdf = undefined; if (current) await current.destroy(); };
    const dispose = () => {
      if (disposed) return; disposed = true;
      if (timer !== undefined) environment.clearTimer(timer);
      removeAfterPrint?.(); stage?.dispose();
    };
    try {
      await assertCurrent();
      const bytes = new Uint8Array(await artifact.blob.arrayBuffer());
      await assertCurrent();
      pdf = await environment.loadPdf(bytes);
      await assertCurrent();
      if (!Number.isInteger(pdf.pageCount) || pdf.pageCount < 1) throw new Error("Yazdırılabilir PDF sayfası bulunamadı.");
      stage = await environment.createStage(artifact.fileName);
      await assertCurrent();
      for (let pageNumber = 1; pageNumber <= pdf.pageCount; pageNumber += 1) {
        const page = await pdf.renderPage(pageNumber);
        await assertCurrent();
        await stage.addPage(page, pageNumber);
        await assertCurrent();
      }
      await releasePdf();
      await stage.ready();
      removeAfterPrint = stage.onAfterPrint(dispose);
      timer = environment.setTimer(dispose, PDF_PRINT_CLEANUP_DELAY_MS);
      // Nothing asynchronous may intervene between this final live check and print().
      await assertCurrent();
      stage.print();
      printed = true;
    } catch (reason) {
      if (reason instanceof Error && reason.message) throw reason;
      throw new Error("PDF yazdırma hazırlığı tamamlanamadı. Önizlemeyi yeniden açın.");
    } finally {
      try { await releasePdf(); } finally { if (!printed) dispose(); }
    }
  };
}

async function loadBrowserPdf(bytes: Uint8Array): Promise<PdfPrintDocument> {
  const [pdfjs, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loading = pdfjs.getDocument({ data: bytes, useWasm: false, enableXfa: false });
  try {
    const document = await loading.promise;
    let pixels = 0, destroyed = false;
    return {
      pageCount: document.numPages,
      async renderPage(pageNumber) {
        const page = await document.getPage(pageNumber), canvas = window.document.createElement("canvas");
        try {
          const natural = page.getViewport({ scale: 1 }), viewport = page.getViewport({ scale: PDF_PRINT_DPI / 72 });
          if (!Number.isFinite(natural.width) || !Number.isFinite(natural.height) || natural.width <= 0 || natural.height <= 0) throw new Error("PDF sayfa ölçüsü yazdırma için geçersiz.");
          const width = Math.ceil(viewport.width), height = Math.ceil(viewport.height);
          pixels += width * height;
          if (pixels > MAX_PRINT_PIXELS || width > 16000 || height > 16000) throw new Error("Bu PDF tarayıcıda yazdırma hazırlığı için çok büyük. Dosyayı indirip cihazınızın PDF uygulamasından yazdırın.");
          canvas.width = width; canvas.height = height;
          const context = canvas.getContext("2d"); if (!context) throw new Error("PDF yazdırma çizim alanı açılamadı.");
          await page.render({ canvas, canvasContext: context, viewport, intent: "print", background: "white" }).promise;
          const [content, annotations] = await Promise.all([page.getTextContent(), page.getAnnotations({ intent: "any" })]);
          const text = projectPdfPrintText(content.items, content.styles, natural.transform);
          const links = projectPdfPrintLinks(annotations, natural.transform);
          const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("PDF sayfası yazdırmaya hazırlanamadı.")), "image/png"));
          return { widthPoints: natural.width, heightPoints: natural.height, blob, text, links };
        } finally { canvas.width = 0; canvas.height = 0; page.cleanup(); }
      },
      async destroy() { if (destroyed) return; destroyed = true; await loading.destroy(); },
    };
  } catch {
    await loading.destroy().catch(() => undefined);
    throw new Error("PDF yazdırma için okunamadı. Dosyayı yeniden hazırlayın.");
  }
}

async function createBrowserStage(title: string): Promise<PdfPrintStage> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true"); frame.setAttribute("tabindex", "-1"); frame.dataset.pdfPrintStage = "true";
  frame.title = "PDF yazdırma hazırlığı";
  Object.assign(frame.style, { position: "fixed", left: "-10000px", top: "0", width: "1px", height: "1px", border: "0", pointerEvents: "none" });
  const urls = new Set<string>(); let disposed = false;
  const dispose = () => { if (disposed) return; disposed = true; frame.remove(); for (const url of urls) URL.revokeObjectURL(url); urls.clear(); };
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { dispose(); reject(new Error("PDF yazdırma alanı zamanında açılamadı.")); }, 15000);
      frame.onload = () => { window.clearTimeout(timer); frame.onload = null; frame.onerror = null; resolve(); };
      frame.onerror = () => { window.clearTimeout(timer); frame.onload = null; frame.onerror = null; reject(new Error("PDF yazdırma alanı açılamadı.")); };
      frame.srcdoc = '<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>PDF yazdırma</title><style>html,body{margin:0;padding:0;background:white}*{box-sizing:border-box}.pdf-print-page{position:relative;display:block;margin:0;padding:0;border:0;overflow:hidden;break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always}.pdf-print-page:last-child{break-after:auto;page-break-after:auto}.pdf-print-text{position:absolute;display:block;white-space:pre;color:#000;font-family:Arial,sans-serif;line-height:1;transform-origin:0 0}.pdf-print-link{position:absolute;display:block;z-index:1;margin:0;padding:0;border:0;background:transparent;color:transparent;text-decoration:none}.pdf-print-page img{position:relative;display:block;width:100%;height:100%;margin:0;border:0}@media print{html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body></body></html>';
      document.body.append(frame);
    });
    const target = frame.contentDocument, targetWindow = frame.contentWindow;
    if (!target || !targetWindow) throw new Error("PDF yazdırma penceresine erişilemedi.");
    target.title = title;
    const pageStyles = target.createElement("style"); target.head.append(pageStyles);
    const measure = target.createElement("canvas").getContext("2d");
    if (!measure) throw new Error("PDF yazdırma metni ölçülemedi.");
    return {
      async addPage(page, number) {
        if (disposed) throw new Error("Yazdırma hazırlığı iptal edildi. Önizlemeyi yeniden açın.");
        const pageName = `pdf_sheet_${number}`, width = `${page.widthPoints}pt`, height = `${page.heightPoints}pt`;
        pageStyles.append(target.createTextNode(`@page ${pageName}{size:${width} ${height};margin:0}\n`));
        const section = target.createElement("section"); section.className = "pdf-print-page"; section.style.page = pageName; section.style.width = width; section.style.height = height;
        section.dataset.pdfPage = String(number); section.dataset.widthPoints = String(page.widthPoints); section.dataset.heightPoints = String(page.heightPoints);
        const pixelsPerPoint = 96 / 72;
        // Real text is painted first; the opaque original page image preserves its exact appearance.
        // display:none, opacity:0 and transparent text are deliberately avoided: PDF printers omit them.
        for (const run of page.text ?? []) {
          const span = target.createElement("span"); span.className = "pdf-print-text"; span.textContent = run.text;
          measure.font = `${run.fontSize * pixelsPerPoint}px Arial`;
          const measuredWidth = measure.measureText(run.text).width;
          if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) throw new Error("PDF metni yazdırma için ölçülemedi.");
          Object.assign(span.style, { left: `${run.x}pt`, top: `${run.y}pt`, fontSize: `${run.fontSize}pt`, direction: run.direction,
            transform: `rotate(${run.angle}rad) scaleX(${run.width * pixelsPerPoint / measuredWidth})` });
          section.append(span);
        }
        for (const link of page.links ?? []) {
          const anchor = target.createElement("a"); anchor.className = "pdf-print-link";
          anchor.setAttribute("href", link.url); anchor.setAttribute("rel", "noopener noreferrer"); anchor.tabIndex = -1;
          anchor.dataset.pdfUri = link.url;
          Object.assign(anchor.style, { left: `${link.x}pt`, top: `${link.y}pt`, width: `${link.width}pt`, height: `${link.height}pt` });
          section.append(anchor);
        }
        const image = target.createElement("img"); image.alt = `PDF sayfa ${number}`;
        const url = URL.createObjectURL(page.blob); urls.add(url); image.src = url; section.append(image); target.body.append(section);
        try { await image.decode(); } catch { throw new Error("PDF sayfası yazdırma alanında açılamadı."); }
      },
      async ready() { if (disposed || !frame.isConnected) throw new Error("Yazdırma hazırlığı iptal edildi. Önizlemeyi yeniden açın."); await target.fonts.ready; },
      onAfterPrint(callback) { targetWindow.addEventListener("afterprint", callback); return () => targetWindow.removeEventListener("afterprint", callback); },
      print() { if (disposed || !frame.isConnected) throw new Error("Yazdırma hazırlığı iptal edildi. Önizlemeyi yeniden açın."); targetWindow.print(); },
      dispose,
    };
  } catch (reason) { dispose(); throw reason; }
}

/** Opens the browser's print dialog; does not claim that a physical print completed. */
export function printPreparedPdfArtifact(artifact: PreparedPdfArtifact, assertCurrent: () => Promise<void>): Promise<void> {
  return createPdfPrinter({ loadPdf: loadBrowserPdf, createStage: createBrowserStage,
    setTimer: (callback, delay) => window.setTimeout(callback, delay), clearTimer: timer => window.clearTimeout(timer as number),
  })(artifact, assertCurrent);
}
