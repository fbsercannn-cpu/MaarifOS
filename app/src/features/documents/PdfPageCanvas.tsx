import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { KeyboardInput } from "../../mobile";
import type { PreparedPdfArtifact } from "./pdf-preview-model.ts";
import {
  buildPdfPageTextIndex,
  findPdfTextMatches,
  hasSearchablePdfText,
  normalizePdfSearchQuery,
  type PdfPageTextIndex,
  type PdfTextSearchMatch,
} from "./pdf-preview-text.ts";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type PdfTextStatus = "loading" | "ready" | "empty" | "cancelled" | "error";

interface SearchHighlightRect {
  readonly id: string;
  readonly active: boolean;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

function pdfTextItems(content: Awaited<ReturnType<pdfjs.PDFPageProxy["getTextContent"]>>) {
  return content.items.filter((item): item is Extract<typeof item, { str: string }> => "str" in item);
}

function textNodePosition(element: HTMLElement, requestedOffset: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  let remaining = Math.max(0, requestedOffset);
  let last: Text | null = null;
  while (node) {
    last = node;
    if (remaining <= node.data.length) return { node, offset: remaining };
    remaining -= node.data.length;
    node = walker.nextNode() as Text | null;
  }
  return last ? { node: last, offset: last.data.length } : null;
}

function matchRects(
  surface: HTMLElement,
  textDivs: readonly HTMLElement[],
  match: PdfTextSearchMatch,
): readonly Omit<SearchHighlightRect, "id" | "active">[] {
  const startElement = textDivs[match.start.itemIndex];
  const endElement = textDivs[match.end.itemIndex];
  if (!startElement || !endElement) return [];
  const start = textNodePosition(startElement, match.start.offset);
  const end = textNodePosition(endElement, match.end.offset);
  if (!start || !end) return [];
  const range = document.createRange();
  try {
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const surfaceRect = surface.getBoundingClientRect();
    return Array.from(range.getClientRects())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({
        left: rect.left - surfaceRect.left,
        top: rect.top - surfaceRect.top,
        width: rect.width,
        height: rect.height,
      }));
  } finally {
    range.detach();
  }
}

export default function PdfPageCanvas({ artifact }: { artifact: PreparedPdfArtifact }) {
  const searchId = useId();
  const searchHintId = useId();
  const searchStatusId = useId();
  const pageSurfaceId = useId();
  const container = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const textLayerContainer = useRef<HTMLDivElement>(null);
  const highlightsContainer = useRef<HTMLDivElement>(null);
  const textDivs = useRef<readonly HTMLElement[]>([]);
  const scrollToNavigatedMatch = useRef(false);
  const cancelTextIndex = useRef(false);
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(320);
  const [error, setError] = useState("");
  const [rendered, setRendered] = useState(false);
  const [currentPageHasText, setCurrentPageHasText] = useState<boolean | null>(null);
  const [textLayerRevision, setTextLayerRevision] = useState(0);
  const [textStatus, setTextStatus] = useState<PdfTextStatus>("loading");
  const [textIndexAttempt, setTextIndexAttempt] = useState(0);
  const [textProgress, setTextProgress] = useState({ completed: 0, total: 0 });
  const [textPages, setTextPages] = useState<readonly PdfPageTextIndex[]>([]);
  const [query, setQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [highlightRects, setHighlightRects] = useState<readonly SearchHighlightRect[]>([]);
  const [searchOpen, setSearchOpen] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 601px)").matches,
  );

  useEffect(() => {
    const viewport = window.matchMedia("(min-width: 601px)");
    const updateForViewport = (event: MediaQueryListEvent) => setSearchOpen(event.matches);
    viewport.addEventListener("change", updateForViewport);
    return () => viewport.removeEventListener("change", updateForViewport);
  }, []);

  useEffect(() => {
    let active = true;
    let loading: pdfjs.PDFDocumentLoadingTask | undefined;
    setPdf(null);
    setPage(1);
    setError("");
    setQuery("");
    setTextPages([]);
    setTextStatus("loading");
    setTextProgress({ completed: 0, total: 0 });
    void artifact.blob.arrayBuffer().then((buffer) => {
      if (!active) return;
      loading = pdfjs.getDocument({ data: new Uint8Array(buffer), useWasm: false, enableXfa: false });
      return loading.promise.then((document) => { if (active) setPdf(document); });
    }).catch(() => {
      if (active) {
        setTextStatus("error");
        setError("PDF sayfaları gösterilemedi. Hazırlanan PDF dosyasını indirip cihazınızda açabilirsiniz.");
      }
    });
    return () => { active = false; void loading?.destroy(); };
  }, [artifact]);

  useEffect(() => {
    if (!pdf) return;
    let active = true;
    cancelTextIndex.current = false;
    setTextPages([]);
    setTextStatus("loading");
    setTextProgress({ completed: 0, total: pdf.numPages });
    void (async () => {
      const indexes: PdfPageTextIndex[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        if (!active || cancelTextIndex.current) return;
        const pdfPage = await pdf.getPage(pageNumber);
        const content = await pdfPage.getTextContent();
        if (!active || cancelTextIndex.current) return;
        indexes.push(buildPdfPageTextIndex(pageNumber, pdfTextItems(content)));
        setTextProgress({ completed: pageNumber, total: pdf.numPages });
        if (pageNumber < pdf.numPages) {
          await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        }
      }
      if (!active) return;
      setTextPages(indexes);
      setTextStatus(hasSearchablePdfText(indexes) ? "ready" : "empty");
    })().catch(() => {
      if (active) setTextStatus("error");
    });
    return () => { active = false; };
  }, [pdf, textIndexAttempt]);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 320));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf || !canvas.current || !surface.current || !textLayerContainer.current) return;
    let active = true;
    let render: pdfjs.RenderTask | undefined;
    let textLayer: pdfjs.TextLayer | undefined;
    setRendered(false);
    setCurrentPageHasText(null);
    setHighlightRects([]);
    textDivs.current = [];
    textLayerContainer.current.replaceChildren();
    void pdf.getPage(page).then(async (pdfPage) => {
      if (!active || !canvas.current || !surface.current || !textLayerContainer.current) return;
      const natural = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(Math.max(width, 1) / natural.width, 2) * zoom;
      const viewport = pdfPage.getViewport({ scale });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const element = canvas.current;
      element.width = Math.ceil(viewport.width * pixelRatio);
      element.height = Math.ceil(viewport.height * pixelRatio);
      element.style.width = `${viewport.width}px`;
      element.style.height = `${viewport.height}px`;
      surface.current.style.width = `${viewport.width}px`;
      surface.current.style.height = `${viewport.height}px`;
      const transform: number[] | undefined = pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0];
      const textContent = pdfPage.getTextContent();
      render = pdfPage.render({ canvas: element, viewport, transform, intent: "display" });
      const [content] = await Promise.all([textContent, render.promise]);
      if (!active || !textLayerContainer.current) return;
      textLayer = new pdfjs.TextLayer({ textContentSource: content, container: textLayerContainer.current, viewport });
      await textLayer.render();
      if (!active) return;
      const items = pdfTextItems(content);
      textDivs.current = textLayer.textDivs;
      setCurrentPageHasText(items.some((item) => item.str.trim().length > 0));
      setTextLayerRevision((revision) => revision + 1);
      setRendered(true);
    }).catch((reason: unknown) => {
      if (active && !(reason instanceof Error && ["RenderingCancelledException", "AbortException"].includes(reason.name))) {
        setError("Bu PDF sayfası gösterilemedi. PDF dosyasını indirerek açabilirsiniz.");
      }
    });
    return () => {
      active = false;
      render?.cancel();
      textLayer?.cancel();
    };
  }, [pdf, page, width, zoom]);

  const normalizedQuery = normalizePdfSearchQuery(query);
  const matches = useMemo(() => findPdfTextMatches(textPages, normalizedQuery), [normalizedQuery, textPages]);

  useEffect(() => {
    const first = matches[0];
    setActiveMatchIndex(first ? 0 : -1);
    if (first) setPage(first.pageNumber);
  }, [matches]);

  useLayoutEffect(() => {
    const pageSurface = surface.current;
    if (!pageSurface || !rendered || !normalizedQuery) {
      setHighlightRects([]);
      return;
    }
    const next: SearchHighlightRect[] = [];
    matches.forEach((match, matchIndex) => {
      if (match.pageNumber !== page) return;
      matchRects(pageSurface, textDivs.current, match).forEach((rect, rectIndex) => {
        next.push({ ...rect, id: `${matchIndex}-${rectIndex}`, active: matchIndex === activeMatchIndex });
      });
    });
    setHighlightRects(next);
  }, [activeMatchIndex, matches, normalizedQuery, page, rendered, textLayerRevision]);

  useEffect(() => {
    if (!scrollToNavigatedMatch.current) return;
    const activeHighlight = highlightsContainer.current?.querySelector<HTMLElement>("[data-active=true]");
    if (activeHighlight) {
      activeHighlight.scrollIntoView({ block: "center", inline: "center" });
      scrollToNavigatedMatch.current = false;
    }
  }, [highlightRects]);

  const goToMatch = (direction: 1 | -1) => {
    if (!matches.length) return;
    const origin = activeMatchIndex >= 0 ? activeMatchIndex : direction === 1 ? -1 : 0;
    const next = (origin + direction + matches.length) % matches.length;
    scrollToNavigatedMatch.current = true;
    setActiveMatchIndex(next);
    setPage(matches[next].pageNumber);
  };

  const matchStatus = textStatus === "loading"
    ? `PDF metni hazırlanıyor… ${textProgress.completed}/${textProgress.total}`
    : textStatus === "error"
      ? "PDF metni okunamadı; sayfa görselini kullanabilir veya dosyayı indirebilirsiniz."
      : textStatus === "cancelled"
        ? "Arama hazırlığı iptal edildi. Sayfa önizlemesi ve indirme kullanılabilir; aramayı yeniden başlatabilirsiniz."
      : textStatus === "empty"
        ? "Bu PDF’de aranabilir metin bulunamadı. Görsel sayfalar gösterilir; metin seçimi ve arama kullanılamaz."
        : normalizedQuery
          ? matches.length
            ? `${activeMatchIndex + 1} / ${matches.length} eşleşme`
            : "0 eşleşme"
          : "PDF metninde aramak için bir sözcük veya ifade yazın.";

  return <div className="pdf-pages">
    {pdf && <details className="pdf-search-panel" role="region" aria-label="PDF metin araması"
      open={searchOpen} onToggle={(event) => setSearchOpen(event.currentTarget.open)}>
      <summary><span>PDF metninde ara</span><span>{normalizedQuery ? matchStatus : "İsteğe bağlı"}</span></summary>
      <div className="pdf-search-panel__body">
        <label htmlFor={searchId}>PDF metninde ara</label>
        <KeyboardInput id={searchId} type="search" value={query} autoComplete="off" spellCheck={false}
          disabled={textStatus !== "ready"} aria-describedby={`${searchHintId} ${searchStatusId}`}
          aria-controls={pageSurfaceId} onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            goToMatch(event.shiftKey ? -1 : 1);
          }} />
        <div className="pdf-search-actions">
          <button type="button" disabled={!matches.length} onClick={() => goToMatch(-1)}>Önceki eşleşme</button>
          <button type="button" disabled={!matches.length} onClick={() => goToMatch(1)}>Sonraki eşleşme</button>
        </div>
        {textStatus === "loading" && <button type="button" className="pdf-search-cancel" onClick={() => {
          cancelTextIndex.current = true;
          setTextPages([]);
          setQuery("");
          setTextStatus("cancelled");
        }}>Arama hazırlığını iptal et</button>}
        {textStatus === "cancelled" && <button type="button" className="pdf-search-retry" onClick={() => {
          setTextIndexAttempt((attempt) => attempt + 1);
        }}>Aramayı yeniden hazırla</button>}
        <p id={searchHintId} className="pdf-search-hint">Enter sonraki, Shift+Enter önceki eşleşmeye gider.</p>
        <p id={searchStatusId} className={textStatus === "empty" ? "pdf-search-empty" : "pdf-search-status"}
          role={textStatus === "error" ? "alert" : undefined} aria-live="polite" aria-atomic="true">{matchStatus}</p>
      </div>
    </details>}
    {pdf && <nav aria-label="PDF sayfaları" className="pdf-page-controls">
      <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Önceki</button>
      <span aria-live="polite">Sayfa {page} / {pdf.numPages}</span>
      <button type="button" disabled={page === pdf.numPages} onClick={() => setPage((current) => current + 1)}>Sonraki</button>
      <label>Yakınlaştırma<select value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
        <option value={1}>Sayfaya sığdır</option><option value={1.5}>%150</option><option value={2}>%200</option>
      </select></label>
    </nav>}
    {error && <p role="alert">{error}</p>}
    <div ref={container} className="pdf-canvas-viewport" aria-busy={!rendered && !error}>
      <div ref={surface} id={pageSurfaceId} className="pdf-page-surface">
        <canvas ref={canvas} data-pdf-rendered={rendered}
          aria-hidden={currentPageHasText ? true : undefined}
          aria-label={`Basılacak PDF · sayfa ${page}${pdf ? ` / ${pdf.numPages}` : ""}`} role="img" />
        <div ref={highlightsContainer} className="pdf-search-highlights" aria-hidden="true">
          {highlightRects.map((rect) => <span key={rect.id} className={`pdf-search-highlight${rect.active ? " is-active" : ""}`}
            data-active={rect.active} style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />)}
        </div>
        <div ref={textLayerContainer} className="pdf-text-layer textLayer"
          data-pdf-text-layer={rendered ? currentPageHasText ? "ready" : "empty" : "loading"}
          role={currentPageHasText ? "document" : undefined} aria-hidden={currentPageHasText ? undefined : true}
          tabIndex={currentPageHasText ? 0 : -1}
          aria-label={currentPageHasText ? `PDF sayfa ${page} seçilebilir metni` : `PDF sayfa ${page} görseli; seçilebilir metin yok`} />
      </div>
    </div>
  </div>;
}
