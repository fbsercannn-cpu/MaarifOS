import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { PDFDocument, PDFName, PDFArray } from "pdf-lib";
import { classRosterFixture } from "../fixtures/class-roster-fixture.mjs";
import { createClassRosterPdfDocument } from "../../src/features/classroom/class-roster-document.ts";
import { CLASS_ROSTER_PRESETS } from "../../src/features/classroom/class-roster-columns.ts";
import { createSemanticTaggedPdf } from "../../src/features/documents/semantic-tagged-pdf.ts";
import { createSearchableImagePdf } from "../../src/features/documents/canvas-image-pdf.ts";
import { pdfPreviewRecipe } from "../../src/features/documents/pdf-preview-model.ts";

const runtime = Object.fromEntries([["fontBytes", "Regular"], ["boldFontBytes", "Bold"]].map(([key, weight]) => [key, new Uint8Array(readFileSync(new URL(`../../public/assets/fonts/MaarifOSSans-${weight}.ttf`, import.meta.url)))]));
function pageText(bytes) {
  const result = spawnSync("pdftotext", ["-raw", "-enc", "UTF-8", "-", "-"], { input: bytes, encoding: "utf8" });
  assert.equal(result.status, 0, "gerçek PDF okuma kapısı için Poppler gerekir");
  return result.stdout.split("\f").filter(text => text.trim());
}

test("15 kişilik ad listesi aynı puntoyla tek sayfa; hazır seçimler kaynak alanlarıyla tutarlı", async () => {
  const input = { ...classRosterFixture(15), columns: ["sequence", "name"] };
  const before = structuredClone(input);
  const file = await createClassRosterPdfDocument(input, { runtime });
  assert.equal(file.pageCount, 1);
  const text = pageText(file.bytes).join(" ");
  for (const row of input.snapshot.students) assert.ok(text.includes(row.displayName));
  const recipe = pdfPreviewRecipe(file.bytes);
  assert.deepEqual(recipe.fieldPresets.map(preset => preset.id), CLASS_ROSTER_PRESETS.map(preset => preset.id));
  assert.deepEqual(input, before);
});

test("üç bireysel dosyanın her birinde kayıt yılı, kendi öğrenci bağlamı ve imza var", async () => {
  const input = { ...classRosterFixture(3), template: "student-record", fields: ["identity", "contacts", "address"] };
  const file = await createClassRosterPdfDocument(input, { runtime });
  const pages = pageText(file.bytes);
  assert.equal(pages.length, 3);
  pages.forEach((text, index) => {
    assert.match(text, /Kayıt yılı\s+2025/u);
    assert.match(text, /Okul Öncesi Öğretmeni/u);
    assert.match(text, /İmza:/u);
    assert.ok(text.replace(/\s+/gu, " ").includes(input.snapshot.students[index].displayName));
    assert.match(text, new RegExp(`Sayfa ${index + 1} / 3`, "u"));
  });
});

test("kaynak bağlantısı gerçek URI anotasyonu; dosya ve betik adresleri reddedilir", async () => {
  const uri = "https://example.org/kaynak.pdf#page=5";
  const node = { kind: "paragraph", text: "Kaynak belgesi, sayfa 5", href: uri };
  const bytes = await createSemanticTaggedPdf({ title: "Kaynaklı belge", nodes: [node] }, runtime);
  const pdf = await PDFDocument.load(bytes);
  const annotations = pdf.getPage(0).node.lookup(PDFName.of("Annots"), PDFArray);
  assert.equal(annotations.size(), 1);
  assert.match(Buffer.from(bytes).toString("latin1"), /\/S \/URI \/URI \(https:\/\/example\.org\/kaynak\.pdf#page=5\)/u);
  for (const href of ["javascript:alert(1)", "file:///private", "https://user:pass@example.org/"]) {
    await assert.rejects(createSemanticTaggedPdf({ title: "Kaynaklı belge", nodes: [{ ...node, href }] }, runtime), /bağlantı/u);
  }
});

test("görsel PDF gerçek Türkçe metni doğru sayfada taşır; teknik başlıkta çocuk adı yok", async () => {
  const image = new Uint8Array(readFileSync(new URL("../fixtures/document-blank.jpg", import.meta.url)));
  const pages = ["Kurgu İğde Çınar 112,5 cm", "Öğretmenin ikinci sayfa açıklaması"].map(text => ({ image, width: 794, height: 1123, text: [{ text, x: 54, y: 64, width: 310, height: 24, fontSize: 20 }] }));
  const bytes = await createSearchableImagePdf(pages, { title: "MaarifOS Ölçüm Çizelgesi" }, runtime);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 2);
  assert.equal(pdf.getTitle(), "MaarifOS Ölçüm Çizelgesi");
  const extracted = pageText(bytes);
  pages.forEach((page, index) => assert.equal(extracted[index].trim(), page.text[0].text));
  assert.match(Buffer.from(bytes).toString("latin1"), /\/StructTreeRoot/u);
  await assert.rejects(createSearchableImagePdf([{ ...pages[0], text: [{ text: "Taşan metin", x: -5, y: 64, width: 310, height: 24 }] }], { title: "Belge" }, runtime), /sayfa içinde/u);
});
