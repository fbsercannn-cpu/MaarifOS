import { createSemanticTaggedPdf, type SemanticPdfNode, type SemanticTaggedPdfRuntime } from "./semantic-tagged-pdf.ts";
import { requestPdfDocument, type PdfPreviewRecipe } from "./pdf-preview-model.ts";
import { createSearchableImagePdf, jpegDataUrlBytes, type ImagePdfTextBox, type SearchableImagePdfPage } from "./canvas-image-pdf.ts";
import {
  TEACHER_DOCUMENT_THEME,
  TEACHER_PRINT_THEME,
  teacherDocumentRunningHeader,
  type TeacherDocumentContext,
} from "./document-theme.ts";
import {
  planHtmlPageLayout,
  type HtmlPrintRange,
  type HtmlRepeatHeaderRange,
} from "./html-page-breaks.ts";

function elementText(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll("br").forEach((item) => item.replaceWith("\n"));
  return clone.textContent?.trim() ?? "";
}

function safeHttpHref(element: Element): string | undefined {
  const hrefs = Array.from(element.querySelectorAll("a[href]"))
    .map(anchor => anchor.getAttribute("href")?.trim())
    .filter((href): href is string => Boolean(href));
  if (hrefs.length !== 1) return undefined;
  try {
    const url = new URL(hrefs[0]!);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function breaksBefore(element: Element): boolean {
  if (element.getAttribute("data-pdf-page-break-before") === "true") return true;
  const style = element.getAttribute("style") ?? "";
  return /(?:break-before|page-break-before)\s*:\s*(?:page|always)/iu.test(style);
}

function tableRows(table: Element): HTMLTableRowElement[] {
  return Array.from(table.querySelectorAll("tr"))
    .filter(row => row.closest("table") === table) as HTMLTableRowElement[];
}

function rowTexts(row: HTMLTableRowElement): string[] {
  return Array.from(row.cells).flatMap(cell => {
    const span = Math.max(1, cell.colSpan || 1);
    return [elementText(cell), ...Array.from({ length: span - 1 }, () => "")];
  });
}

function tableNode(element: Element): SemanticPdfNode | null {
  const rows = tableRows(element);
  if (!rows.length) return null;
  const theadRows = rows.filter(row => row.closest("thead")?.closest("table") === element);
  const fallbackHeader = rows.find(row => Array.from(row.cells).some(cell => cell.tagName === "TH")) ?? rows[0]!;
  const headerRows = theadRows.length ? theadRows : [fallbackHeader];
  const leafHeader = headerRows.at(-1)!;
  const headers = rowTexts(leafHeader);
  if (!headers.length) return null;
  const headerSet = new Set(headerRows);
  const bodyRows = rows.filter(row => !headerSet.has(row));
  const normalizedRows = bodyRows.map(row => {
    const cells = rowTexts(row);
    return headers.map((_, index) => cells[index] ?? "");
  });
  const firstGroupRow = headerRows.length > 1 ? headerRows[0] : undefined;
  const headerGroups = firstGroupRow
    ? Array.from(firstGroupRow.cells).map((cell, index) => ({
        label: elementText(cell),
        span: Math.max(1, cell.colSpan || 1),
        colorIndex: index,
      }))
    : undefined;
  const validGroups = headerGroups?.reduce((total, group) => total + group.span, 0) === headers.length
    ? headerGroups
    : undefined;
  const caption = element.querySelector(":scope > caption");
  const firstBodyRow = bodyRows[0];
  const firstBodyCellIsHeader = firstBodyRow?.cells[0]?.tagName === "TH";
  return {
    kind: "table",
    headers,
    rows: normalizedRows,
    ...(caption && elementText(caption) ? { summary: elementText(caption) } : {}),
    ...(validGroups ? { headerGroups: validGroups } : {}),
    ...(firstBodyCellIsHeader ? { rowHeaderColumn: 0 } : {}),
    continuationContextColumns: [0],
    preserveContinuationContext: true,
    balancePages: true,
    fontSize: 9,
    cellPadding: 5,
    ...(breaksBefore(element) ? { pageBreakBefore: true } : {}),
  };
}

/** This adapter reads only local generated content; it never executes scripts or follows links. */
export function semanticNodesFromHtml(html: string): SemanticPdfNode[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script,style,iframe,object,embed,link,button").forEach((element) => element.remove());
  const nodes: SemanticPdfNode[] = [];
  function visit(element: Element) {
    const name = element.tagName.toLocaleLowerCase("en-US");
    const text = elementText(element);
    if (!text) return;
    if (/^h[1-6]$/u.test(name)) nodes.push({ kind: "heading", level: Number(name[1]) as 1 | 2 | 3 | 4 | 5 | 6, text, ...(breaksBefore(element) ? { pageBreakBefore: true } : {}) });
    else if (name === "table") {
      const table = tableNode(element);
      if (table) nodes.push(table);
    } else if (name === "ul" || name === "ol") nodes.push({ kind: "list", items: Array.from(element.children).map(elementText).filter(Boolean), ordered: name === "ol", ...(breaksBefore(element) ? { pageBreakBefore: true } : {}) });
    else if (name === "p" || !element.children.length) nodes.push({ kind: "paragraph", text, ...(safeHttpHref(element) ? { href: safeHttpHref(element) } : {}), ...(breaksBefore(element) ? { pageBreakBefore: true } : {}) });
    else Array.from(element.children).forEach(visit);
  }
  Array.from(document.body.children).forEach(visit);
  return nodes;
}

export interface HtmlTextPdfDocumentInput {
  readonly html: string;
  readonly title: string;
  readonly fileName: string;
  readonly context?: TeacherDocumentContext;
  readonly appearance?: "color" | "ink-saving";
}

function htmlContextNodes(context: TeacherDocumentContext | undefined): SemanticPdfNode[] {
  if (!context) return [];
  return [
    context.schoolName ? `Okul: ${context.schoolName.trim()}` : "",
    context.classroomName ? `Sınıf: ${context.classroomName.trim()}` : "",
    context.periodLabel ? `Dönem: ${context.periodLabel.trim()}` : "",
  ].filter(Boolean).map(text => ({ kind: "paragraph", text, tone: "meta" }));
}

export async function createHtmlTextPdfDocument(input: HtmlTextPdfDocumentInput, runtime?: SemanticTaggedPdfRuntime) {
  const nodes = semanticNodesFromHtml(input.html);
  if (!nodes.length) throw new Error("PDF için belge içeriği bulunamadı.");
  if (nodes[0]?.kind !== "heading" || nodes[0].level !== 1 || nodes[0].text.trim() !== input.title.trim()) {
    nodes.unshift({ kind: "heading", level: 1, text: input.title });
  }
  nodes.splice(1, 0, ...htmlContextNodes(input.context));
  const theme = input.appearance === "ink-saving" ? TEACHER_PRINT_THEME : TEACHER_DOCUMENT_THEME;
  return {
    bytes: await createSemanticTaggedPdf({
      title: input.title,
      language: "tr-TR",
      theme,
      nodes,
      artifactHeaderText: teacherDocumentRunningHeader(input.title, input.context),
      artifactHeaderOnFirstPage: false,
      includeTotalPages: true,
    }, runtime),
    fileName: input.fileName.replace(/\.(?:html?|pdf)$/iu, "") + ".pdf",
    mimeType: "application/pdf",
  };
}

/** Read visible authored text and its actual line boxes, without OCR or rewriting. */
function measuredHtmlText(body: HTMLElement): ImagePdfTextBox[] {
  const doc = body.ownerDocument;
  const boxes: ImagePdfTextBox[] = [];
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement;
    if (!element || element.closest("style,script,noscript") || !node.textContent?.trim()) continue;
    const style = doc.defaultView!.getComputedStyle(element);
    if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) === 0) continue;
    let line: { text: string; x: number; y: number; right: number; height: number } | undefined;
    const finish = () => {
      if (line?.text.trim() && line.right > line.x) boxes.push({ text: line.text.replace(/\s+/gu, " ").trim(), x: line.x, y: line.y, width: line.right - line.x, height: line.height, fontSize: parseFloat(style.fontSize) });
      line = undefined;
    };
    let offset = 0;
    for (const character of node.textContent) {
      const range = doc.createRange();
      range.setStart(node, offset); offset += character.length; range.setEnd(node, offset);
      const rect = range.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (line && (Math.abs(line.y - rect.top) > 1 || rect.left < line.x - 1)) finish();
      if (!line) line = { text: "", x: rect.left, y: rect.top, right: rect.right, height: rect.height };
      line.text += character; line.right = Math.max(line.right, rect.right); line.height = Math.max(line.height, rect.height);
    }
    finish();
  }
  return boxes;
}

/** Preserve the actual drawing spaces/graphics in locally authored A4 activity worksheets. */
async function rasterHtmlPages(html: string): Promise<SearchableImagePdfPage[]> {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  if (parsed.querySelector("script,iframe,object,embed") || Array.from(parsed.querySelectorAll("img")).some((image) => !image.getAttribute("src")?.startsWith("data:"))) throw new Error("Baskı belgesi yalnız yerel ve betiksiz içerik kullanmalıdır.");
  parsed.querySelectorAll("link").forEach((link) => link.remove());
  const pageStyle = parsed.createElement("style");
  pageStyle.textContent = "html{margin:0;background:white}body{width:794px;max-width:none;min-height:0;margin:0;padding:53px;box-shadow:none}*{box-sizing:border-box}";
  parsed.head.append(pageStyle);
  const serialized = new XMLSerializer().serializeToString(parsed.documentElement);
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;visibility:hidden";
  const loaded = new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Baskı yerleşimi hazırlanamadı.")), 15000);
    frame.onload = () => { window.clearTimeout(timer); resolve(); };
  });
  frame.srcdoc = serialized; document.body.append(frame);
  try {
    await loaded;
    const body = frame.contentDocument!.body;
    await frame.contentDocument!.fonts.ready;
    const height = Math.max(body.scrollHeight, body.getBoundingClientRect().height);
    const measuredText = measuredHtmlText(body);
    const protectedRanges: HtmlPrintRange[] = [];
    const repeatHeaders: HtmlRepeatHeaderRange[] = [];
    for (const element of Array.from(body.querySelectorAll("*"))) {
      const style = frame.contentWindow!.getComputedStyle(element);
      if (/^(?:P|H[1-6]|TR|LI|IMG|SVG|CANVAS|FIGURE)$/u.test(element.tagName) || style.breakInside === "avoid" || style.pageBreakInside === "avoid") {
        const rect = element.getBoundingClientRect(); protectedRanges.push({ top: rect.top, bottom: rect.bottom });
      }
    }
    for (const table of Array.from(body.querySelectorAll("table"))) {
      const thead = Array.from(table.children).find(element => element.tagName === "THEAD");
      if (!thead) continue;
      const tableRect = table.getBoundingClientRect();
      const headerRect = thead.getBoundingClientRect();
      repeatHeaders.push({
        top: headerRect.top,
        bottom: headerRect.bottom,
        containerTop: tableRect.top,
        containerBottom: tableRect.bottom,
      });
    }
    // A paragraph taller than A4 may split, but never through a printed text line.
    const walker = frame.contentDocument!.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      if (!text.textContent?.trim()) continue;
      const range = frame.contentDocument!.createRange(); range.selectNodeContents(text);
      for (const rect of Array.from(range.getClientRects())) protectedRanges.push({ top: rect.top, bottom: rect.bottom });
    }
    const contentHeight = Math.max(0, height - 106);
    // A small overflow must not create a whole extra sheet for the footer.
    // Keep at least 90% of the authored type size; longer content is paginated.
    const fit = contentHeight > 1017 && contentHeight <= 1130 ? 1017 / contentHeight : 1;
    const slices = planHtmlPageLayout(
      53,
      Math.max(53, height - 53),
      1017 / fit,
      protectedRanges,
      repeatHeaders,
    );
    const source = serialized;
    const pages: SearchableImagePdfPage[] = [];
    for (const { top, bottom, repeatHeader } of slices) {
      const repeatedHeight = repeatHeader ? repeatHeader.bottom - repeatHeader.top : 0;
      const contentY = 53 + repeatedHeight * fit;
      const repeatedHeaderSvg = repeatHeader
        ? `<g clip-path="url(#page-header)"><g transform="translate(${794 * (1 - fit) / 2} ${53 - repeatHeader.top * fit}) scale(${fit})"><foreignObject x="0" y="0" width="794" height="${height}">${source}</foreignObject></g></g>`
        : "";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123"><defs><clipPath id="page-content"><rect x="0" y="${contentY}" width="794" height="${(bottom - top) * fit}"/></clipPath><clipPath id="page-header"><rect x="0" y="53" width="794" height="${repeatedHeight * fit}"/></clipPath></defs><rect width="794" height="1123" fill="white"/>${repeatedHeaderSvg}<g clip-path="url(#page-content)"><g transform="translate(${794 * (1 - fit) / 2} ${contentY - top * fit}) scale(${fit})"><foreignObject x="0" y="0" width="794" height="${height}">${source}</foreignObject></g></g></svg>`;
      const image = new Image();
      image.src = `data:image/svg+xml;base64,${btoa(Array.from(new TextEncoder().encode(svg), (value) => String.fromCharCode(value)).join(""))}`;
      await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = 1588; canvas.height = 2246;
      const context = canvas.getContext("2d"); if (!context) throw new Error("Baskı çizim alanı hazırlanamadı.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      for (let index = 0; index < pixels.length; index += 4) if (pixels[index]! < 245 || pixels[index + 1]! < 245 || pixels[index + 2]! < 245) ink += 1;
      if (ink > 32) {
        const mainText = measuredText
          .filter(box => box.y + box.height / 2 >= top && box.y + box.height / 2 < bottom)
          .map(box => ({
            text: box.text,
            x: 794 * (1 - fit) / 2 + box.x * fit,
            y: contentY + (box.y - top) * fit,
            width: box.width * fit,
            height: box.height * fit,
            fontSize: (box.fontSize ?? box.height * 0.8) * fit,
          }));
        const repeatedText = repeatHeader
          ? measuredText
              .filter(box => box.y + box.height / 2 >= repeatHeader.top && box.y + box.height / 2 < repeatHeader.bottom)
              .map(box => ({
                text: box.text,
                x: 794 * (1 - fit) / 2 + box.x * fit,
                y: 53 + (box.y - repeatHeader.top) * fit,
                width: box.width * fit,
                height: box.height * fit,
                fontSize: (box.fontSize ?? box.height * 0.8) * fit,
              }))
          : [];
        pages.push({
          image: jpegDataUrlBytes(canvas.toDataURL("image/jpeg", .95)),
          width: 794,
          height: 1123,
          text: [...repeatedText, ...mainText],
        });
      }
    }
    return pages;
  } finally { frame.remove(); }
}
export function previewHtmlPrintDocument(input: { html: string; title: string; fileName?: string }) {
  const recipe: PdfPreviewRecipe = {
    title: input.title,
    fields: [{ id: "worksheet", label: "Etkinlik ve çalışma alanlarının tamamı" }], initial: { fields: ["worksheet"] },
    async build() { return { bytes: await createSearchableImagePdf(await rasterHtmlPages(input.html), { title: "MaarifOS Etkinlik Çalışma Belgesi" }), mimeType: "application/pdf", fileName: input.fileName?.replace(/\.html$/iu, ".pdf") ?? `${input.title}.pdf` }; },
  };
  return requestPdfDocument(recipe);
}
