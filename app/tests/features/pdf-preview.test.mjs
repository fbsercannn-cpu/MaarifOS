import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createSemanticTaggedPdf } from "../../src/features/documents/semantic-tagged-pdf.ts";
import { createClassRosterPdfDocument } from "../../src/features/classroom/class-roster-document.ts";
import { pdfPreviewRecipe, preparePdfArtifact, downloadPreparedPdfArtifact, validatePdfSelection, installPdfPreviewPresenter, requestPdfPreview, pdfFieldsForSelection } from "../../src/features/documents/pdf-preview-model.ts";
import { classRosterExtremeFixture } from "../fixtures/class-roster-fixture.mjs";
import { planHtmlPageSlices } from "../../src/features/documents/html-page-breaks.ts";
const runtime = {
  fontBytes: new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url))),
  boldFontBytes: new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Bold.ttf", import.meta.url))),
};

test("şablona özgü alan seçimi farklı belgenin alanlarını kabul etmez", () => {
  const recipe = { fields: [{ id: "schoolNumber", label: "Okul no." }], fieldsForTemplate: { card: [{ id: "identity", label: "Kimlik" }] },
    templates: [{ id: "list", label: "Liste" }, { id: "card", label: "Kart" }], students: [{ id: "child", label: "Kurgu" }] };
  assert.deepEqual(pdfFieldsForSelection(recipe, { template: "list" }).map(item => item.id), ["schoolNumber"]);
  assert.deepEqual(pdfFieldsForSelection(recipe, { template: "card" }).map(item => item.id), ["identity"]);
  validatePdfSelection(recipe, { fields: ["schoolNumber"], template: "list", studentIds: ["child"] });
  validatePdfSelection(recipe, { fields: ["identity"], template: "card", studentIds: ["child"] });
  assert.throws(() => validatePdfSelection(recipe, { fields: ["schoolNumber"], template: "card", studentIds: ["child"] }), /geçerli/);
  assert.throws(() => validatePdfSelection(recipe, { fields: ["identity"], template: "card", studentIds: ["child", "child"] }), /birden çok/);
});

test("HTML A4 kırılması satır ve çizim alanını korur; aralık kaybolmaz veya çoğalmaz", () => {
  const slices = planHtmlPageSlices(53, 2450, 1017, [{ top: 900, bottom: 1260 }, { top: 1880, bottom: 1902 }, { top: 1902, bottom: 1924 }, { top: 1500, bottom: 2400 }]);
  assert.deepEqual(slices, [{ top: 53, bottom: 900 }, { top: 900, bottom: 1500 }, { top: 1500, bottom: 2450 }]);
  assert.equal(slices.reduce((total, range) => total + range.bottom - range.top, 0), 2450 - 53);
  assert.deepEqual(planHtmlPageSlices(53, 53, 1017, []), []);
  assert.throws(() => planHtmlPageSlices(0, 10, 0, []), /geçersiz/);
});

test("önizleme, indirme ve paylaşım için tek değişmez Blob; URL yaşamları ayrıdır", async () => {
  const bytes = await createSemanticTaggedPdf({ title: "Kurgu", nodes: [{ kind: "paragraph", text: "İğne, şeker, Öğretmen Çınar" }] }, runtime);
  const original = bytes.slice();
  let shownBlob; const revoked = [];
  const artifact = preparePdfArtifact({ bytes, fileName: "kurgu.pdf", mimeType: "application/pdf" }, { createObjectURL: (blob) => { shownBlob = blob; return "blob:preview"; }, revokeObjectURL: (url) => revoked.push(url) });
  bytes.fill(0);
  assert.deepEqual(new Uint8Array(await artifact.blob.arrayBuffer()), original);
  let downloadedBlob, release;
  downloadPreparedPdfArtifact(artifact, { createObjectURL: (blob) => { downloadedBlob = blob; return "blob:download"; }, revokeObjectURL: (url) => revoked.push(url), click: (url, name) => { assert.equal(url, "blob:download"); assert.equal(name, "kurgu.pdf"); }, setTimer: (callback, ms) => { assert.equal(ms, 30000); release = callback; } });
  assert.equal(downloadedBlob, shownBlob);
  const shareFile = new File([artifact.blob], artifact.fileName);
  assert.deepEqual(new Uint8Array(await shareFile.arrayBuffer()), original);
  artifact.dispose(); artifact.dispose();
  assert.deepEqual(revoked, ["blob:preview"]);
  release(); assert.deepEqual(revoked, ["blob:preview", "blob:download"]);
  assert.throws(() => preparePdfArtifact({ bytes: new TextEncoder().encode("%PDF-incomplete"), mimeType: "application/pdf", fileName: "bad.pdf" }), /doğrulanamadı/);
});

test("ortak semantic PDF bölümleri yalnız mevcut kaynağı daraltır", async () => {
  const bytes = await createSemanticTaggedPdf({ title: "Kurgu", nodes: [
    { kind: "heading", level: 1, text: "Kurgu Belge" }, { kind: "paragraph", text: "Kurum" },
    { kind: "heading", level: 2, text: "İlk bölüm" }, { kind: "paragraph", text: "Kaynak bir" },
    { kind: "heading", level: 2, text: "İkinci bölüm" }, { kind: "paragraph", text: "Kaynak iki" },
  ] }, runtime);
  const recipe = pdfPreviewRecipe(bytes);
  assert.equal(recipe.fields.length, 2);
  assert.throws(() => validatePdfSelection(recipe, { fields: ["unknown"] }), /geçerli/);
  const output = await recipe.build({ fields: [recipe.fields[0].id] });
  assert.equal(output.mimeType, "application/pdf");
  const renderedRecipe = pdfPreviewRecipe(output.bytes);
  assert.deepEqual(renderedRecipe.fields.map((field) => field.label), ["İlk bölüm"]);
});

test("roster şablon/dönem/öğrenci seçimleri kaynağı değiştirmez; özel bakım varsayılan kapalıdır", async () => {
  const input = classRosterExtremeFixture();
  input.snapshot.academicYears[0].startDate = "2026-09-07";
  input.snapshot.academicYears[0].endDate = "2027-06-30";
  input.snapshot.students[1].civilDate = "2026-10-01";
  const before = structuredClone(input);
  const file = await createClassRosterPdfDocument(input, { runtime });
  assert.equal(file.rowCount, 14);
  const recipe = pdfPreviewRecipe(file.bytes);
  assert.equal(recipe.templates.length, 3);
  assert.equal(recipe.students.length, 15);
  assert.ok(!recipe.initial.fields.includes("care"));
  const output = await recipe.build({ ...recipe.initial, template: "emergency-card", fields: ["contacts", "address"], studentIds: [input.snapshot.students[0].id] });
  assert.equal(output.rowCount, 1);
  assert.equal(pdfPreviewRecipe(output.bytes).initial.fields.includes("care"), false);
  const later = await recipe.build({ ...recipe.initial, studentIds: [input.snapshot.students[1].id], periodStart: "2026-10-01", periodEnd: "2026-10-02" });
  assert.equal(later.rowCount, 1);
  await assert.rejects(recipe.build({ ...recipe.initial, studentIds: ["outside-class"] }), /geçerli öğrenci/);
  await assert.rejects(recipe.build({ ...recipe.initial, periodStart: "2025-01-01" }), /kaynak tarih/);
  assert.deepEqual(input, before);
});

test("export boundary önizlemeye kopya gönderir ve kayıt aboneliğini bırakır", async () => {
  const bytes = await createSemanticTaggedPdf({ title: "Kurgu", nodes: [{ kind: "paragraph", text: "Belge" }] }, runtime);
  let request;
  const cleanup = installPdfPreviewPresenter((value) => { request = value; });
  const file = { bytes, mimeType: "application/pdf", fileName: "kurgu.pdf" };
  assert.equal(requestPdfPreview(file), true);
  assert.notEqual(request.file.bytes, bytes);
  assert.deepEqual(request.file.bytes, bytes);
  cleanup(); assert.equal(requestPdfPreview(file), false);
});
