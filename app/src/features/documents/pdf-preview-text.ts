export interface PdfPreviewTextItem {
  readonly str: string;
  readonly hasEOL?: boolean;
}

export interface PdfTextSourcePosition {
  readonly itemIndex: number;
  readonly offset: number;
}

interface PdfTextCharacterSource {
  readonly itemIndex: number;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface PdfPageTextIndex {
  readonly pageNumber: number;
  readonly normalizedText: string;
  readonly characterSources: readonly PdfTextCharacterSource[];
  readonly searchableCharacterCount: number;
}

export interface PdfTextSearchMatch {
  readonly pageNumber: number;
  readonly start: PdfTextSourcePosition;
  readonly end: PdfTextSourcePosition;
}

function normalizeTurkishSegment(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("tr-TR");
}

const turkishGraphemes = new Intl.Segmenter("tr-TR", { granularity: "grapheme" });

export function normalizePdfSearchQuery(value: string): string {
  return normalizeTurkishSegment(value).replace(/\s+/gu, " ").trim();
}

export function buildPdfPageTextIndex(
  pageNumber: number,
  items: readonly PdfPreviewTextItem[],
): PdfPageTextIndex {
  let normalizedText = "";
  const characterSources: PdfTextCharacterSource[] = [];

  const append = (value: string, source: PdfTextCharacterSource) => {
    const normalized = normalizeTurkishSegment(value);
    for (let offset = 0; offset < normalized.length; offset++) {
      const character = normalized[offset];
      if (/\s/u.test(character)) {
        if (!normalizedText || normalizedText.endsWith(" ")) continue;
        normalizedText += " ";
      } else {
        normalizedText += character;
      }
      characterSources.push(source);
    }
  };

  items.forEach((item, itemIndex) => {
    for (const grapheme of turkishGraphemes.segment(item.str)) {
      append(grapheme.segment, {
        itemIndex,
        startOffset: grapheme.index,
        endOffset: grapheme.index + grapheme.segment.length,
      });
    }
    if (item.hasEOL) {
      append(" ", { itemIndex, startOffset: item.str.length, endOffset: item.str.length });
    }
  });

  while (normalizedText.endsWith(" ")) {
    normalizedText = normalizedText.slice(0, -1);
    characterSources.pop();
  }

  return {
    pageNumber,
    normalizedText,
    characterSources,
    searchableCharacterCount: normalizedText.replace(/\s/gu, "").length,
  };
}

export function hasSearchablePdfText(pages: readonly PdfPageTextIndex[]): boolean {
  return pages.some((page) => page.searchableCharacterCount > 0);
}

export function findPdfTextMatches(
  pages: readonly PdfPageTextIndex[],
  query: string,
): readonly PdfTextSearchMatch[] {
  const needle = normalizePdfSearchQuery(query);
  if (!needle) return [];

  const matches: PdfTextSearchMatch[] = [];
  for (const page of pages) {
    let offset = 0;
    while (offset <= page.normalizedText.length - needle.length) {
      const found = page.normalizedText.indexOf(needle, offset);
      if (found < 0) break;
      const first = page.characterSources[found];
      const last = page.characterSources[found + needle.length - 1];
      if (first && last) {
        matches.push({
          pageNumber: page.pageNumber,
          start: { itemIndex: first.itemIndex, offset: first.startOffset },
          end: { itemIndex: last.itemIndex, offset: last.endOffset },
        });
      }
      offset = found + Math.max(needle.length, 1);
    }
  }
  return matches;
}
