import test from "node:test";
import assert from "node:assert/strict";
import { wordDesignFixtures, readDocxParts } from "../fixtures/word-design-fixtures.mjs";

test("Üç gerçek Word üreticisi ortak başlık anahattı ve gerçek sayfa alanlarını taşır; metin/table korunur", async () => {
  for (const fixture of await wordDesignFixtures()) {
    const parts = readDocxParts(fixture.bytes), xml = parts.get("word/document.xml"), styles = parts.get("word/styles.xml"), footer = parts.get("word/footer1.xml");
    assert.ok(xml.includes(fixture.raw), fixture.name);
    assert.match(styles, /w:styleId="Title"/); assert.match(styles, /w:outlineLvl w:val="0"/); assert.match(styles, /w:outlineLvl w:val="1"/);
    const titleStyle = styles.match(/<w:style [^>]*w:styleId="Title">[\s\S]*?<\/w:style>/)?.[0];
    assert.match(titleStyle, /w:color w:val="000000"/); assert.doesNotMatch(titleStyle, /w:pBdr/);
    assert.match(xml, /w:pStyle w:val="Title"/); assert.match(xml, /w:footerReference/);
    assert.match(footer, / PAGE /); assert.match(footer, / NUMPAGES /); assert.match(parts.get("word/settings.xml"), /w:updateFields/);
    assert.doesNotMatch(xml, /w:hRule="exact"/);
    if (fixture.name !== "ogretmen-plani.docx") {
      assert.match(xml, /<w:tbl>/); assert.match(xml, /<w:tblHeader\/>/); assert.match(xml, /<w:cantSplit\/>/);
      assert.match(footer, fixture.name === "anekdot-formu.docx" ? /10\.09\.2026/ : /Ek 18/);
    }
  }
});
