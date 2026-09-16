export interface HtmlPrintRange { readonly top: number; readonly bottom: number; }
export interface HtmlRepeatHeaderRange extends HtmlPrintRange {
  readonly containerTop: number;
  readonly containerBottom: number;
}
export interface HtmlPrintPageSlice extends HtmlPrintRange {
  readonly repeatHeader?: HtmlPrintRange;
}

function validRange(range: HtmlPrintRange): boolean {
  return Number.isFinite(range.top) && Number.isFinite(range.bottom) && range.bottom > range.top;
}

function protectedPrintRanges(
  protectedRanges: readonly HtmlPrintRange[],
  capacity: number,
): HtmlPrintRange[] {
  return protectedRanges
    .filter(range => validRange(range) && range.bottom - range.top <= capacity)
    .sort((left, right) => left.top - right.top || left.bottom - right.bottom)
    .filter((range, index, ranges) => !ranges.some((candidate, candidateIndex) =>
      candidateIndex < index && candidate.top <= range.top && candidate.bottom >= range.bottom,
    ));
}

/**
 * Returns lossless source slices and reserves the repeated THEAD height whenever
 * a later page begins inside the same table. The caller paints that header above
 * the returned source interval; source rows themselves are never duplicated.
 */
export function planHtmlPageLayout(
  start: number,
  end: number,
  capacity: number,
  protectedRanges: readonly HtmlPrintRange[],
  repeatHeaders: readonly HtmlRepeatHeaderRange[] = [],
): HtmlPrintPageSlice[] {
  if (![start, end, capacity].every(Number.isFinite) || capacity <= 0 || end < start) {
    throw new Error("Baskı sayfa ölçüleri geçersiz.");
  }
  const ranges = protectedPrintRanges(protectedRanges, capacity);
  const headers = repeatHeaders
    .filter(header =>
      validRange(header) &&
      Number.isFinite(header.containerTop) &&
      Number.isFinite(header.containerBottom) &&
      header.containerTop <= header.top &&
      header.bottom <= header.containerBottom &&
      header.containerBottom > header.containerTop &&
      header.bottom - header.top < capacity,
    )
    .sort((left, right) => left.containerTop - right.containerTop || left.top - right.top);
  const pages: HtmlPrintPageSlice[] = [];
  for (let top = start; top < end; ) {
    const header = headers.find(candidate =>
      top > candidate.bottom + 0.5 && top < candidate.containerBottom - 0.5,
    );
    const repeatedHeight = header ? header.bottom - header.top : 0;
    let bottom = Math.min(end, top + capacity - repeatedHeight);
    for (let attempts = 0; attempts <= ranges.length; attempts += 1) {
      const crossing = ranges.filter(range =>
        range.top > top + 0.5 &&
        range.top < bottom - 0.5 &&
        range.bottom > bottom + 0.5,
      );
      if (!crossing.length) break;
      bottom = Math.min(...crossing.map(range => range.top));
      if (attempts === ranges.length) throw new Error("Baskı sayfa kırımı kararlı biçimde hesaplanamadı.");
    }
    if (bottom <= top + 0.5) {
      throw new Error("Baskı sayfası içerikte ilerleyemedi.");
    }
    pages.push({
      top,
      bottom,
      ...(header ? { repeatHeader: { top: header.top, bottom: header.bottom } } : {}),
    });
    top = bottom;
  }
  return pages;
}

/** Keep measured text lines, rows and A4-sized drawing blocks on one page. */
export function planHtmlPageSlices(start: number, end: number, capacity: number, protectedRanges: readonly HtmlPrintRange[]): HtmlPrintRange[] {
  return planHtmlPageLayout(start, end, capacity, protectedRanges).map(({ top, bottom }) => ({ top, bottom }));
}
