import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPdfPageTextIndex,
  findPdfTextMatches,
  hasSearchablePdfText,
  normalizePdfSearchQuery,
} from "../../src/features/documents/pdf-preview-text.ts";

test("PDF araması Türkçe I/İ/ı/i eşleşmesini tr-TR kuralıyla korur", () => {
  assert.equal(normalizePdfSearchQuery("  IĞDIR   İZMİR  "), "ığdır izmir");
  const page = buildPdfPageTextIndex(1, [
    { str: "IĞDIR", hasEOL: true },
    { str: "İZMİR ve ısı ile iz", hasEOL: false },
  ]);

  const phrase = findPdfTextMatches([page], "ığdır izmir");
  assert.equal(phrase.length, 1);
  assert.deepEqual(phrase[0], {
    pageNumber: 1,
    start: { itemIndex: 0, offset: 0 },
    end: { itemIndex: 1, offset: "İZMİR".length },
  });
  assert.equal(findPdfTextMatches([page], "İZMİR").length, 1);
  assert.equal(findPdfTextMatches([page], "iz").length, 2);
  assert.equal(findPdfTextMatches([page], "ısı").length, 1);
  assert.equal(findPdfTextMatches([page], "igdir").length, 0);

  const decomposed = buildPdfPageTextIndex(2, [{ str: "I\u0307REM", hasEOL: false }]);
  assert.equal(findPdfTextMatches([decomposed], "İREM").length, 1);
  assert.deepEqual(findPdfTextMatches([decomposed], "irem")[0], {
    pageNumber: 2,
    start: { itemIndex: 0, offset: 0 },
    end: { itemIndex: 0, offset: 5 },
  });
});

test("eşleşmeler sayfa ve PDF.js text item konumunda kararlı sırayla döner", () => {
  const pages = [
    buildPdfPageTextIndex(1, [{ str: "İlk iğne ve şeker", hasEOL: false }]),
    buildPdfPageTextIndex(2, [
      { str: "İkinci ", hasEOL: false },
      { str: "İĞNE", hasEOL: true },
      { str: "son satır", hasEOL: false },
    ]),
  ];
  const matches = findPdfTextMatches(pages, "iğne");
  assert.deepEqual(matches.map((match) => match.pageNumber), [1, 2]);
  assert.deepEqual(matches[1], {
    pageNumber: 2,
    start: { itemIndex: 1, offset: 0 },
    end: { itemIndex: 1, offset: 4 },
  });
  assert.equal(findPdfTextMatches(pages, "iğne son").length, 1);

  const supplementary = buildPdfPageTextIndex(3, [{ str: "🎨 İğne", hasEOL: false }]);
  assert.deepEqual(findPdfTextMatches([supplementary], "iğne")[0], {
    pageNumber: 3,
    start: { itemIndex: 0, offset: 3 },
    end: { itemIndex: 0, offset: 7 },
  });
});

test("yalnız boş PDF.js textContent raster belge için aranabilir metin sayılmaz", () => {
  const pages = [
    buildPdfPageTextIndex(1, []),
    buildPdfPageTextIndex(2, [{ str: " \r\n\t", hasEOL: true }]),
  ];
  assert.equal(hasSearchablePdfText(pages), false);
  assert.deepEqual(findPdfTextMatches(pages, "metin"), []);
  assert.deepEqual(findPdfTextMatches(pages, "   "), []);
});
