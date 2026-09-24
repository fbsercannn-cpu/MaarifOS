import assert from "node:assert/strict";
import test from "node:test";
import * as api from "../../src/features/documents/document-export-intent.ts";
const students = [
  { id: "11111111-1111-4111-8111-111111111111", label: "Kurgu Ada" },
  { id: "22222222-2222-4222-8222-222222222222", label: "Kurgu Deniz" },
];

test("seçili alan ve çocuk kapsamı okunabilir ama kaynak değeri değiştirmeyen özet üretir", () => {
  const summary = api.documentExportScopeSummary(students, { fields: ["name", "phone"], studentIds: [students[0].id] });
  assert.equal(summary.selectedFieldCount, 2);
  assert.deepEqual(summary.selectedStudentLabels, ["Kurgu Ada"]);
  assert.equal(summary.studentScopeLabel, "Kurgu Ada");
});

test("tek çocuğun ailesi yalnız aile bilgilendirmesi amacıyla geçer", () => {
  const one = api.documentExportScopeSummary(students, { fields: ["name"], studentIds: [students[0].id] });
  assert.doesNotThrow(() => api.assertDocumentExportIntent({ recipient: "selected-student-family", purpose: "family-information" }, one));
  assert.throws(() => api.assertDocumentExportIntent({ recipient: "selected-student-family", purpose: "lesson-preparation" }, one), /yalnız aile bilgilendirmesi/u);
  const many = api.documentExportScopeSummary(students, { fields: ["name"], studentIds: students.map((student) => student.id) });
  assert.throws(() => api.assertDocumentExportIntent({ recipient: "selected-student-family", purpose: "family-information" }, many), /tam olarak bir çocuk/u);
});

test("resmî işlem ve alıcı birlikte seçilir; ürün aktarım yaptığını iddia etmez", () => {
  const scope = api.documentExportScopeSummary(undefined, { fields: ["content"] });
  assert.doesNotThrow(() => api.assertDocumentExportIntent({ recipient: "official-system-preparation", purpose: "official-process" }, scope));
  assert.throws(() => api.assertDocumentExportIntent({ recipient: "authorized-school-unit", purpose: "official-process" }, scope), /birlikte seçilmelidir/u);
  assert.match(api.documentExportChannelNotice({ recipient: "official-system-preparation", purpose: "official-process" }), /aktar(?:ım|ımı) yapmaz/u);
});

test("metadata taşımayan belgeyi çocuksuz diye kesinleştirmez ve aile alıcısını kapalı tutar", () => {
  const summary = api.documentExportScopeSummary(undefined, { fields: ["appointment"] });
  assert.match(summary.studentScopeLabel, /otomatik doğrulanamıyor/u);
  assert.throws(
    () => api.assertDocumentExportIntent(
      { recipient: "selected-student-family", purpose: "family-information" },
      summary,
    ),
    /tam olarak bir çocuk/u,
  );
});
