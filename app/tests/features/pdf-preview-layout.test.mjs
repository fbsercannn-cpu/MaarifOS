import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../../src/features/documents/PdfPreviewHost.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../src/features/documents/pdf-preview.css", import.meta.url),
  "utf8",
);

test("PDF kapsam özeti dört kararı daima gösterir ve ayrıntılı kontrolleri kapalı details içinde tutar", () => {
  const summaryAt = source.indexOf('<section className="pdf-export-review"');
  const detailsAt = source.indexOf('<details className="pdf-preview-options">');
  const artifactAt = source.indexOf("{artifact && !stale");
  assert.ok(summaryAt > 0);
  assert.ok(detailsAt > summaryAt);
  assert.ok(artifactAt > detailsAt);
  assert.doesNotMatch(source, /<details className="pdf-preview-options"[^>]*\sopen=/u);
  for (const label of ["Çocuk kapsamı", "Alan kapsamı", "Alıcı", "Amaç"]) {
    assert.match(source.slice(summaryAt, detailsAt), new RegExp(`<dt>${label}</dt>`, "u"));
  }
  const detailsSource = source.slice(detailsAt, artifactAt);
  assert.match(detailsSource, /Şablon ve seçimleri düzenle/u);
  assert.match(detailsSource, /pdf-export-review__choices/u);
  assert.match(detailsSource, /DOCUMENT_EXPORT_RECIPIENTS/u);
  assert.match(detailsSource, /DOCUMENT_EXPORT_PURPOSES/u);
  assert.match(detailsSource, /documentExportChannelNotice/u);
  assert.match(source, /recipe\?\.students === undefined/u);
  assert.match(source, /çocuk kapsamını kontrol edin/u);
});

test("kompakt mobil kapsam iki sütun ve erişilebilir details dokunma hedefi taşır", () => {
  assert.match(styles, /\.pdf-preview-options>summary\{[^}]*min-height:44px/su);
  assert.match(styles, /\.pdf-export-review dl\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/u);
  assert.match(styles, /@media\(max-width:600px\)[^{]*\{\.pdf-export-review dl\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/u);
  assert.match(styles, /\.pdf-preview-options>summary:focus-visible/u);
  assert.match(styles, /\.pdf-preview-options:not\(\[open\]\)>\.pdf-preview-options__body\{display:none\}/u);
});
