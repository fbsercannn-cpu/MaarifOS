import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createSemanticTaggedPdf } from "../../src/features/documents/semantic-tagged-pdf.ts";

const fontBytes = new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url)));
const table = { kind: "table", headers: ["Çocuk", "Anne", "Telefon"], rows: [["Kurgu İpek", "Kurgu Anne", "000"]] };

test("optional birleşik başlık ve ayrıntı sözleşmesi tam sütun/satır kapsamı ister", async () => {
  for (const headerGroups of [[], [{ label: "A", span: 2 }], [{ label: "A", span: 1.5 }, { label: "B", span: 1.5 }], [{ label: " ", span: 3 }], null]) {
    await assert.rejects(createSemanticTaggedPdf({ title: "Kurgu", nodes: [{ ...table, headerGroups }] }, { fontBytes }), /başlık/u);
  }
  for (const rowDetails of [[], [""], [1], [null, "fazla"], null]) {
    await assert.rejects(createSemanticTaggedPdf({ title: "Kurgu", nodes: [{ ...table, rowDetails }] }, { fontBytes }), /bant/u);
  }
});

test("birleşik TH ve tam genişlik TD gerçek Table ColSpan etiketi taşır", async () => {
  const bytes = await createSemanticTaggedPdf({ title: "Kurgu", nodes: [{ ...table, headerGroups: [{ label: "Öğrencinin", span: 1 }, { label: "Annenin", span: 2 }], rowDetails: ["Kurgu İpek — Ev Adresi: Çınar Sokağı No: 12"] }] }, { fontBytes });
  const source = new TextDecoder("latin1").decode(bytes);
  assert.match(source, /\/S \/TH[^]*?\/A << \/O \/Table \/Scope \/Column \/ColSpan 2 >>/u);
  assert.match(source, /\/S \/TD[^]*?\/A << \/O \/Table \/ColSpan 3 >>/u);
  assert.match(source, /\/StructTreeRoot/u);
  assert.match(source, /\/ToUnicode/u);
});

test("yeni seçenekler yokken değişiklik öncesi portre ve yatay PDF baytları birebir kalır", async () => {
  const expected = { portrait: "bb97fe291eebfa03532069b0a1a7b1e2a4a21013f7f27b6e6c8265a5906c2fcf", landscape: "1eb025c22fe5e5f645a7a687007b608bdaad95424da360f4afb873ce2ebd48b3" };
  for (const orientation of ["portrait", "landscape"]) {
    const document = { title: "Kurgu uyumluluk", orientation, nodes: [
      { kind: "heading", level: 1, text: "Kurgu başlık" }, { kind: "paragraph", text: "İğde Çınar · Türkçe kayıt" },
      { kind: "list", items: ["Birinci", "İkinci"] },
      { kind: "table", headers: ["Sıra", "Değer"], rows: Array.from({ length: 50 }, (_, i) => [String(i + 1), "Uzun bilgi ".repeat(i % 7 + 1)]), rowGroupColumn: 0, balancePages: true, reserveAfter: 50 },
      { kind: "figure", altText: "Kurgu görsel", height: 60 }, { kind: "paragraph", text: "Son imza" },
    ] };
    assert.equal(createHash("sha256").update(await createSemanticTaggedPdf(document, { fontBytes })).digest("hex"), expected[orientation]);
  }
});
