import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  TEACHER_DOCUMENT_THEME,
  TEACHER_PRINT_THEME,
  teacherDocumentRunningHeader,
} from "../../src/features/documents/document-theme.ts";
import {
  planHtmlPageLayout,
  planHtmlPageSlices,
} from "../../src/features/documents/html-page-breaks.ts";
import { semanticTaggedPdfPageCount } from "../../src/features/documents/semantic-tagged-pdf.ts";
import { createTextPdfDocument } from "../../src/features/documents/text-document-pdf.ts";

const runtime = {
  fontBytes: new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url))),
  boldFontBytes: new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Bold.ttf", import.meta.url))),
};

function luminance([red, green, blue]) {
  const linear = [red, green, blue].map(value => value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(left, right) {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("ortak renkli ve az mürekkepli temalar koyu metni korur; bağlam üst bilgisi tekrar etmez", () => {
  const white = [1, 1, 1];
  assert.ok(contrast(TEACHER_DOCUMENT_THEME.bodyColor, white) >= 7);
  assert.ok(contrast(TEACHER_PRINT_THEME.bodyColor, TEACHER_PRINT_THEME.tableHeaderFill) >= 7);
  assert.ok(contrast(TEACHER_PRINT_THEME.tableBorderColor, white) >= 4.5);
  assert.deepEqual(TEACHER_PRINT_THEME.tableHeaderFill, white);
  assert.equal(
    teacherDocumentRunningHeader("  Kurgu   Planı ", {
      schoolName: "Kurgu Okulu",
      classroomName: "Kurgu Sınıfı",
      periodLabel: "Eylül 2026",
    }),
    "Kurgu Planı · Kurgu Okulu · Kurgu Sınıfı · Eylül 2026",
  );
  assert.equal(
    teacherDocumentRunningHeader("Kurgu Planı", { schoolName: "Kurgu Planı" }),
    "Kurgu Planı",
  );
});

test("HTML sayfa planı kaynak aralığını eksiksiz böler, satırı kesmez ve devam tablosuna başlık alanı ayırır", () => {
  const rows = Array.from({ length: 48 }, (_, index) => ({
    top: 80 + index * 48,
    bottom: 124 + index * 48,
  }));
  const layout = planHtmlPageLayout(0, 2450, 820, rows, [{
    top: 20,
    bottom: 72,
    containerTop: 0,
    containerBottom: 2400,
  }]);
  assert.equal(layout[0].repeatHeader, undefined);
  assert.ok(layout.slice(1).every(page => page.top >= 2400 || page.repeatHeader?.top === 20));
  assert.equal(layout.reduce((total, page) => total + page.bottom - page.top, 0), 2450);
  assert.ok(layout.every((page, index) => index === 0 || page.top === layout[index - 1].bottom));
  assert.ok(layout.every(page => !rows.some(row => row.top < page.bottom && row.bottom > page.bottom)));
  assert.ok(layout.filter(page => page.repeatHeader).every(page =>
    page.bottom - page.top + page.repeatHeader.bottom - page.repeatHeader.top <= 820,
  ));
  assert.deepEqual(
    planHtmlPageSlices(0, 100, 80, [{ top: Number.NaN, bottom: 20 }]),
    [{ top: 0, bottom: 80 }, { top: 80, bottom: 100 }],
  );
  assert.throws(
    () => planHtmlPageLayout(0, 100, 0, [], []),
    /geçersiz/,
  );
});

test("metin belgesi canlı tema, seçilebilir Türkçe, kaynak bağlantısı, bağlam ve toplam sayfa bilgisiyle üretilir", async () => {
  const title = "Kurgu Öğrenci Gözlem Dosyası";
  const sourceUrl = "https://example.test/kaynak";
  const text = [
    title,
    "GÖZLEM KAYITLARI",
    "İrem Işık, ğüşöçı harflerini içeren kurgu gözlem metni.",
    `Kaynak: ${sourceUrl}`,
    ...Array.from({ length: 145 }, (_, index) =>
      `Kurgu satır ${String(index + 1).padStart(3, "0")}: öğretmenin değişmez kaynak metni korunur.`,
    ),
  ].join("\n");
  const file = await createTextPdfDocument({
    title,
    fileName: "kurgu-belge.txt",
    text,
    context: {
      schoolName: "Kurgu Anaokulu",
      classroomName: "Kurgu Sınıfı",
      periodLabel: "Eylül 2026",
    },
  }, runtime);
  const extracted = spawnSync("pdftotext", ["-raw", "-enc", "UTF-8", "-", "-"], {
    input: file.bytes,
    encoding: "utf8",
  });
  assert.equal(extracted.status, 0, extracted.stderr);
  assert.equal(file.fileName, "kurgu-belge.pdf");
  assert.ok(semanticTaggedPdfPageCount(file.bytes) > 1);
  assert.match(extracted.stdout, /İrem Işık, ğüşöçı/u);
  assert.match(extracted.stdout, /Okul: Kurgu Anaokulu/u);
  assert.match(extracted.stdout, /Sınıf: Kurgu Sınıfı/u);
  assert.match(extracted.stdout, /Dönem: Eylül 2026/u);
  assert.match(extracted.stdout, /Sayfa 1 \/ \d+/u);
  assert.ok(new TextDecoder("latin1").decode(file.bytes).includes(`/URI (${sourceUrl})`));

  const inkSaving = await createTextPdfDocument({
    title,
    fileName: "kurgu-belge.pdf",
    text: "Kurgu az mürekkepli belge.",
    appearance: "ink-saving",
  }, runtime);
  assert.equal(inkSaving.mimeType, "application/pdf");
  assert.notDeepEqual(inkSaving.bytes, file.bytes);
});
