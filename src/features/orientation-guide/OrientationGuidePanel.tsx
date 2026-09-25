import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeftIcon, ChevronRightIcon, Cross2Icon, DownloadIcon, ReaderIcon } from "@radix-ui/react-icons";

import { KeyboardInput, useKeyboard } from "../../mobile";
import { downloadBrowserFile } from "../documents/browser-file-download.ts";
import {
  ORIENTATION_GUIDE_PDF_URL,
  loadOrientationGuide,
  loadOrientationGuidePdf,
  orientationGuideTr as tr,
  orientationPageLabel,
  searchOrientationGuide,
  type OrientationGuide,
} from "./orientation-guide.ts";
import "./orientation-guide.css";

export function OrientationGuidePanel({ initialPage = 1, triggerLabel }: { initialPage?: number; triggerLabel?: string } = {}) {
  const keyboard = useKeyboard();
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState<OrientationGuide | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"image" | "text">("image");
  const [imageFailed, setImageFailed] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const page = guide?.pages[pageNumber - 1];
  const results = useMemo(() => guide ? searchOrientationGuide(guide, query) : [], [guide, query]);

  const preparePdf = async (action: "open" | "download") => {
    if (pdfBusy) return;
    keyboard.hide();
    const target = action === "open" ? window.open("about:blank", "_blank") : null;
    if (target) target.opener = null;
    setPdfBusy(true);
    setPdfMessage(tr.pdfPreparing);
    try {
      const bytes = await loadOrientationGuidePdf();
      if (target && !target.closed) {
        const url = URL.createObjectURL(new Blob([bytes.buffer], { type: "application/pdf" }));
        target.location.replace(url);
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setPdfMessage(tr.pdfOpened);
      } else {
        downloadBrowserFile({ bytes, mimeType: "application/pdf", fileName: "Okula Uyum Rehberi 2026-2027.pdf" });
        setPdfMessage(action === "open" ? tr.pdfFallback : tr.pdfDownloaded);
      }
    } catch {
      target?.close();
      setPdfMessage(tr.pdfError);
    } finally {
      setPdfBusy(false);
    }
  };

  useEffect(() => {
    if (!open || guide) return;
    const controller = new AbortController();
    setLoadFailed(false);
    void loadOrientationGuide(controller.signal).then((loaded) => {
      if (!controller.signal.aborted) setGuide(loaded);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadFailed(true);
    });
    return () => controller.abort();
  }, [open, guide, attempt]);

  const goToPage = (nextPage: number) => {
    keyboard.hide();
    setPageNumber(nextPage);
    setImageFailed(false);
    window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.parentElement?.scrollIntoView({ block: "start" });
    });
  };

  return (
    <section className="orientation-guide" aria-label={tr.title}>
      <button className="orientation-guide__open" type="button" ref={triggerRef} onClick={() => {
        keyboard.hide();
        setPageNumber(Math.max(1, Math.min(35, initialPage)));
        setOpen(true);
      }}>
        <ReaderIcon aria-hidden="true" />
        <span><small>{tr.badge}</small><strong>{triggerLabel ?? tr.shortTitle}</strong><em>{tr.cardDetail}</em></span>
        <ChevronRightIcon aria-hidden="true" />
      </button>

      <Dialog.Root open={open} onOpenChange={(nextOpen) => { keyboard.hide(); setOpen(nextOpen); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="orientation-reader__overlay" />
          <Dialog.Content className="orientation-reader" onCloseAutoFocus={(event) => {
            if (triggerRef.current?.isConnected) { event.preventDefault(); triggerRef.current.focus(); }
          }}>
            <header className="orientation-reader__header">
              <div><Dialog.Title>{tr.title}</Dialog.Title><Dialog.Description>{tr.description}</Dialog.Description></div>
              <Dialog.Close aria-label={tr.close}><Cross2Icon aria-hidden="true" /></Dialog.Close>
            </header>

            <div className="orientation-reader__body">
              <div className="orientation-reader__downloads">
                <a href={ORIENTATION_GUIDE_PDF_URL} target="_blank" rel="noopener noreferrer" aria-busy={pdfBusy} aria-disabled={pdfBusy} onClick={(event) => { event.preventDefault(); void preparePdf("open"); }}>{tr.openPdf}</a>
                <a href={ORIENTATION_GUIDE_PDF_URL} download="Okula Uyum Rehberi 2026-2027.pdf" aria-busy={pdfBusy} aria-disabled={pdfBusy} onClick={(event) => { event.preventDefault(); void preparePdf("download"); }}><DownloadIcon aria-hidden="true" />{tr.downloadPdf}</a>
              </div>
              {pdfMessage ? <p className="orientation-reader__note" role="status">{pdfMessage}</p> : null}
              <p className="orientation-reader__note">{tr.offlineNote}</p>

              {!guide ? loadFailed ? (
                <div role="alert" className="orientation-reader__error"><p>{tr.loadError}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>{tr.retry}</button></div>
              ) : <p role="status">{tr.loading}</p> : (
                <>
                  <label className="orientation-reader__field"><span>{tr.search}</span>
                    <KeyboardInput type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr.searchPlaceholder} />
                  </label>
                  {query.trim() ? (
                    <section className="orientation-reader__results" aria-label={tr.search}>
                      <div><p role="status">{results.length ? tr.resultCount(results.length) : tr.noResults}</p><button type="button" onClick={() => { keyboard.hide(); setQuery(""); }}>{tr.clearSearch}</button></div>
                      <ul>{results.map((result) => <li key={result.page.number}>
                        <button type="button" onClick={() => { setMode("text"); goToPage(result.page.number); }}>
                          <small>PDF {result.page.number} · {result.page.title}</small><span>{result.excerpt}</span>
                        </button>
                      </li>)}</ul>
                    </section>
                  ) : null}

                  <label className="orientation-reader__field"><span>{tr.section}</span>
                    <select value={pageNumber} onChange={(event) => goToPage(Number(event.target.value))}>
                      {guide.pages.map((item) => <option value={item.number} key={item.number}>{item.number}. {item.title}</option>)}
                    </select>
                  </label>

                  {page ? <section className="orientation-reader__page" aria-labelledby="orientation-page-title">
                    <header><small>{orientationPageLabel(page)}</small><h3 ref={headingRef} id="orientation-page-title" tabIndex={-1}>{page.title}</h3></header>
                    <div className="orientation-reader__modes" role="group" aria-label={tr.displayMode}>
                      <button type="button" aria-pressed={mode === "image"} onClick={() => { keyboard.hide(); setMode("image"); }}>{tr.imageView}</button>
                      <button type="button" aria-pressed={mode === "text"} onClick={() => { keyboard.hide(); setMode("text"); }}>{tr.textView}</button>
                    </div>
                    {mode === "image" ? <>
                      <p className="orientation-reader__note">{tr.imageNote}</p>
                      {imageFailed ? <p role="alert">{tr.imageError}</p> : <img key={page.number} src={page.imageUrl} width={page.imageWidth} height={page.imageHeight} alt={`${guide.title}, PDF sayfası ${page.number}: ${page.title}`} onError={() => setImageFailed(true)} draggable={false} />}
                    </> : <>
                      <p className="orientation-reader__note">{tr.textNote}</p>
                      <div className="orientation-reader__text" aria-label={tr.fullText}>{page.text}</div>
                    </>}
                    {page.links.length > 0 ? <section className="orientation-reader__links" aria-label={tr.sourceLinks}>
                      <h4>{tr.sourceLinks}</h4><p className="orientation-reader__note">{tr.externalNote}</p>
                      <ul>{page.links.map((link) => <li key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{link.label}<ChevronRightIcon aria-hidden="true" /></a></li>)}</ul>
                    </section> : null}
                  </section> : null}

                  <details className="orientation-reader__source">
                    <summary>{tr.sourceDetails}</summary>
                    <p>{tr.sourceOrigin}</p><p>{guide.publisherAsPrinted}</p><p>{tr.sourceComplete}</p>
                    <dl><dt>{tr.sourceFile}</dt><dd>{guide.sourceFileName}</dd><dt>{tr.sourceSize}</dt><dd>{guide.pdfBytes.toLocaleString("tr-TR")} {tr.bytes}</dd><dt>{tr.sourceDigest}</dt><dd><code>{guide.sourceSha256}</code></dd></dl>
                  </details>
                </>
              )}
            </div>
            <footer className="orientation-reader__footer">
              <button type="button" disabled={!guide || pageNumber === 1} onClick={() => goToPage(pageNumber - 1)} aria-label={tr.previous}><ChevronLeftIcon aria-hidden="true" /><span>{tr.previousShort}</span></button>
              <span aria-live="polite">{pageNumber} / 35</span>
              <button type="button" disabled={!guide || pageNumber === 35} onClick={() => goToPage(pageNumber + 1)} aria-label={tr.next}><span>{tr.nextShort}</span><ChevronRightIcon aria-hidden="true" /></button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
