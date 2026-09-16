import test from "node:test";
import assert from "node:assert/strict";
import { projectPdfPrintText } from "../../src/features/documents/pdf-print-text.ts";
import { projectPdfPrintLinks } from "../../src/features/documents/pdf-print-links.ts";

const item = { str: "İrem Işık · ğüşöçı", transform: [12, 0, 0, 12, 30, 750], width: 90, height: 12, fontName: "font1", dir: "ltr" };
test("PDF alt-sol koordinatı gerçek sayfa üst-soluna çevrilir ve Türkçe kaynak aynen kalır", () => {
  const runs = projectPdfPrintText([item], { font1: { ascent: 0.75 } }, [1, 0, 0, -1, 0, 842]);
  assert.deepEqual(runs, [{ text: item.str, x: 30, y: 83, width: 90, fontSize: 12, angle: 0, direction: "ltr" }]);
});
test("90 derece dönen PDF sayfası aynı metni ve geometrik dönüşü korur", () => {
  const [run] = projectPdfPrintText([item], { font1: { ascent: 0.75 } }, [0, 1, 1, 0, 0, 0]);
  assert.equal(run.text, item.str); assert.equal(run.x, 759); assert.equal(run.y, 30); assert.equal(run.angle, Math.PI / 2);
});
test("işaretli içerik boş metin üretmez; geçersiz ölçü veya matris yazdırmayı engeller", () => {
  assert.deepEqual(projectPdfPrintText([{ type: "beginMarkedContent" }, { ...item, str: "" }], {}, [1, 0, 0, -1, 0, 842]), []);
  assert.throws(() => projectPdfPrintText([item], {}, [1, NaN, 0, -1, 0, 842]), /koordinat/u);
  assert.throws(() => projectPdfPrintText([{ ...item, transform: [1] }], {}, [1, 0, 0, -1, 0, 842]), /konum/u);
  assert.throws(() => projectPdfPrintText([{ ...item, width: -1 }], {}, [1, 0, 0, -1, 0, 842]), /ölçü/u);
});

test("HTTP(S) URI anotasyonları kaynak sırası, hedefi ve üst-sol sayfa geometrisiyle korunur", () => {
  const annotations = [
    { subtype: "Link", unsafeUrl: "https://example.test/kaynak?dil=tr#başlık", url: "https://example.test/kaynak?dil=tr#ba%C5%9Fl%C4%B1k", rect: [30, 60, 130, 90] },
    { subtype: "Link", unsafeUrl: "http://example.test/ikinci", url: "http://example.test/ikinci", rect: [240, 300, 140, 260] },
  ];
  assert.deepEqual(projectPdfPrintLinks(annotations, [1, 0, 0, -1, 0, 842]), [
    { url: annotations[0].unsafeUrl, x: 30, y: 752, width: 100, height: 30 },
    { url: annotations[1].unsafeUrl, x: 140, y: 542, width: 100, height: 40 },
  ]);
});

test("döndürülmüş sayfada bağlantı dikdörtgeninin dört köşesi dönüştürülür", () => {
  assert.deepEqual(projectPdfPrintLinks([
    { subtype: "Link", url: "https://example.test/donen", rect: [20, 30, 80, 50] },
  ], [0, 1, 1, 0, 0, 0]), [
    { url: "https://example.test/donen", x: 30, y: 20, width: 20, height: 60 },
  ]);
});

test("iç hedefler ve HTTP(S) dışı eylemler eklenmez; bozuk URI geometrisi sessiz başarı üretmez", () => {
  assert.deepEqual(projectPdfPrintLinks([
    { subtype: "Link", dest: "bolum-2", rect: [1, 2, 3, 4] },
    { subtype: "Link", unsafeUrl: "mailto:kurgu@example.test", rect: [1, 2, 3, 4] },
    { subtype: "Link", unsafeUrl: "javascript:alert(1)", rect: [1, 2, 3, 4] },
    { subtype: "Text", url: "https://example.test/yorum", rect: [1, 2, 3, 4] },
  ], [1, 0, 0, -1, 0, 842]), []);
  assert.throws(() => projectPdfPrintLinks([{ subtype: "Link", url: "https://example.test", rect: [1, 2, 3] }], [1, 0, 0, -1, 0, 842]), /alanı okunamadı/u);
  assert.throws(() => projectPdfPrintLinks([{ subtype: "Link", url: "https://example.test", rect: [1, 2, 1, 4] }], [1, 0, 0, -1, 0, 842]), /alanı yazdırma/u);
  assert.throws(() => projectPdfPrintLinks([], [1, 0, Number.NaN, -1, 0, 842]), /koordinat/u);
});
