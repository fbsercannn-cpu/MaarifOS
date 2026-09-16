import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createSemanticTaggedPdf } from "../../src/features/documents/semantic-tagged-pdf.ts";
import { CLASS_ROSTER_VIBRANT_THEME } from "../../src/features/classroom/class-roster-document.ts";

const regularFont = new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url)));
const sha = value => createHash("sha256").update(value).digest("hex");
const output = fileURLToPath(new URL("../../output/class-roster-vibrant-2026-09-08/independent/", import.meta.url));
const inspector = fileURLToPath(new URL("../fixtures/inspect-semantic-theme.py", import.meta.url));
const boldFont = () => new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Bold.ttf", import.meta.url)));
function inspect(bytes, name) {
  mkdirSync(output, { recursive: true }); const file = `${output}/${name}.pdf`; writeFileSync(file, bytes);
  const result = JSON.parse(execFileSync("python", [inspector, file, "1"], { encoding: "utf8", timeout: 20000, maxBuffer: 8 * 1024 * 1024 }));
  writeFileSync(`${output}/${name}-inspection.json`, JSON.stringify(result, null, 2)); return result;
}
function luminance(rgb) { const channels = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4); return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722; }
function contrast(first, second) { const a = luminance(first), b = luminance(second); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
const closeColor = (first, second) => first.every((channel, index) => Math.abs(channel - second[index]) < 0.005);
export function independentThemeFixture(orientation) {
  return {
    title: "Kurgu bağımsız PDF tema denetimi", language: "tr-TR", creator: "MaarifOS", orientation,
    pageMargin: 32, artifactHeaderText: "Kurgu sınıf kapsamı", artifactFooterText: "Okul Öncesi Öğretmeni",
    nodes: [
      { kind: "heading", level: 1, text: "İlköğretim Öncesi · Işık ve Çınar" },
      { kind: "paragraph", tone: "meta", text: "Kurgu Anaokulu · 2026–2027 · Yaş grubu 60–72 ay" },
      { kind: "paragraph", text: "İ, ı, I, i, Ğ, ğ, Ş, ş, Ç, ç, Ö, ö, Ü, ü; bütün Türkçe harfler görünür kalır." },
      { kind: "heading", level: 2, text: "Aile iletişim bilgileri" },
      { kind: "table", headers: ["Çocuk", "Yakının adı", "Telefon"],
        headerGroups: [{ label: "Öğrenci", span: 1 }, { label: "Aile", span: 2 }],
        rows: Array.from({ length: 42 }, (_, i) => [`Kurgu Çocuk ${i + 1}`, `Kurgu Yakın ${i + 1}`, "0532 000 00 01"]),
        rowDetails: Array.from({ length: 42 }, (_, i) => i % 10 === 0 ? `Kurgu adres ${i + 1}: ${"Çınar Mahallesi Işık Sokağı. ".repeat(8)}` : null),
        fontSize: 9, cellPadding: 4, rowHeaderColumn: 0, continuationContextColumns: [0], preserveContinuationContext: true,
      },
      { kind: "list", items: ["Kurgu ilk kontrol", "Kurgu ikinci kontrol"] },
      { kind: "paragraph", text: "Kurgu öğretmen imzası" },
    ],
  };
}

// Filled from the independently captured pre-theme engine, never recomputed by a test.
export const INDEPENDENT_THEME_LEGACY_SHA = Object.freeze({
  portrait: "0d32db67fa60e61eb5a640ae3ea1a7d4068637e6d38718784397e410bb78925b",
  landscape: "3a55ba25462ef6821eb8aeb6944272ace5ed2b79c19b0e056246e409ae49af6d",
});

test("opt-in tema kapalıyken bağımsız eski PDF baytları korunur", async () => {
  for (const orientation of ["portrait", "landscape"]) {
    const document = independentThemeFixture(orientation);
    const bytes = await createSemanticTaggedPdf(document, { fontBytes: regularFont });
    assert.equal(sha(bytes), INDEPENDENT_THEME_LEGACY_SHA[orientation]);
    let boldCalls = 0;
    const unusedBold = await createSemanticTaggedPdf({ ...document, theme: undefined }, { fontBytes: regularFont,
      boldFontBytes: new Uint8Array([0, 1]), loadBoldFontBytes: async () => { boldCalls += 1; throw new Error("Unused bold font loader"); } });
    assert.equal(boldCalls, 0); assert.deepEqual(unusedBold, bytes);
  }
});

test("canlı tema başlıkları gerçek gömülü 700 fontla yazılır; Türkçe ToUnicode ve geometri korunur", async () => {
  const bold = boldFont();
  for (const orientation of ["portrait", "landscape"]) {
    const bytes = await createSemanticTaggedPdf({ ...independentThemeFixture(orientation), theme: CLASS_ROSTER_VIBRANT_THEME }, { fontBytes: regularFont, boldFontBytes: bold });
    const result = inspect(bytes, `vibrant-${orientation}`), content = Buffer.from(bytes).toString("latin1");
    assert.ok(result.fonts.some(font => font.weight === 700 && font.sha256 === sha(bold) && font.resource === "F1"), "F1 gerçekten 700 ağırlıklı TTF baytlarını gömmeli");
    assert.ok(result.fonts.some(font => font.weight === 400 && font.sha256 === sha(regularFont) && font.resource === "F0"));
    assert.match(content, /\/F1\s+20\s+Tf/u); assert.match(content, /\/FontWeight 700/u);
    assert.ok((content.match(/\/ToUnicode /gu) ?? []).length >= 2); assert.doesNotMatch(content, /\b[12] Tr\b/u, "kalın yazı konturla taklit edilmemeli");
    const spans = result.pages.flatMap(page => page.spans), text = result.pages.map(page => page.text).join(" ").replace(/\s+/gu, " ");
    assert.ok(spans.some(span => /İlköğretim/u.test(span.text) && /Bold/u.test(span.font)));
    assert.ok(spans.some(span => /bütün Türkçe/u.test(span.text) && !/Bold/u.test(span.font)));
    assert.ok(text.includes("İ, ı, I, i, Ğ, ğ, Ş, ş, Ç, ç, Ö, ö, Ü, ü;"));
    assert.ok(text.includes("Kurgu Çocuk 42")); assert.ok(text.includes("Kurgu öğretmen imzası"));
    assert.ok(result.pages.length >= 2); assert.ok(result.pages.every(page => page.outside.length === 0));
    assert.ok(result.pages.every(page => page.rasterImages === 0), "semantik PDF canlı metin ve font kullanmalı");
  }
});

test("kalın font kapalı tema normal fontla kalır; normal/bozuk/erişilemeyen font kalınmış gibi sunulmaz", async () => {
  let boldCalls = 0;
  const plain = await createSemanticTaggedPdf({ ...independentThemeFixture("portrait"), theme: { ...CLASS_ROSTER_VIBRANT_THEME, boldHeadings: false } }, {
    fontBytes: regularFont, loadBoldFontBytes: async () => { boldCalls += 1; throw new Error("Unexpected network"); },
  });
  assert.equal(boldCalls, 0); const result = inspect(plain, "color-only-regular-font"); assert.equal(result.fonts.length, 1); assert.equal(result.fonts[0].weight, 400);
  const themed = { ...independentThemeFixture("portrait"), theme: CLASS_ROSTER_VIBRANT_THEME };
  for (const invalid of [new Uint8Array([0, 1, 2]), regularFont]) {
    await assert.rejects(createSemanticTaggedPdf(themed, { fontBytes: regularFont, boldFontBytes: invalid }), /PDF kalın yazı tipi yüklenemedi veya doğrulanamadı/u);
  }
  await assert.rejects(createSemanticTaggedPdf(themed, { fontBytes: regularFont, loadBoldFontBytes: async () => { throw new Error("Offline font unavailable"); } }), /PDF kalın yazı tipi yüklenemedi veya doğrulanamadı/u);
});

test("rol paleti ve gerçek PDF metinleri en az 4,5 kontrast taşır; filtreli grup rengini korur", async () => {
  const theme = CLASS_ROSTER_VIBRANT_THEME;
  const pairs = [
    [theme.bodyColor, [1, 1, 1]], [theme.metaColor, [1, 1, 1]], [theme.headingColor, [1, 1, 1]],
    [theme.tableHeaderColor, theme.tableHeaderFill], [theme.bodyColor, theme.tableDetailFill],
    ...theme.headerGroupFills.map(fill => [theme.headerGroupTextColor, fill]),
    ...theme.headerGroupTints.map(fill => [theme.tableHeaderColor, fill]),
  ];
  assert.ok(pairs.every(([foreground, background]) => contrast(foreground, background) >= 4.5));
  const document = independentThemeFixture("portrait");
  const nodes = document.nodes.map(node => node.kind === "table" ? { ...node, headerGroups: [{ label: "Öğrenci", span: 1, colorIndex: 0 }, { label: "Aile", span: 2, colorIndex: 3 }] } : node);
  const bytes = await createSemanticTaggedPdf({ ...document, nodes, theme }, { fontBytes: regularFont, boldFontBytes: boldFont() });
  const result = inspect(bytes, "role-color-contrast"), spans = result.pages.flatMap(page => page.spans);
  assert.ok(spans.length > 100); assert.ok(spans.every(span => span.contrast >= 4.5), "gerçek PDF arka planında soluk metin olmamalı");
  const studentHeaders = spans.filter(span => span.text === "Öğrenci"), familyHeaders = spans.filter(span => span.text === "Aile");
  assert.ok(studentHeaders.length >= 2 && familyHeaders.length >= 2, "devam sayfalarında grup başlıkları görünmeli");
  assert.ok(studentHeaders.every(span => closeColor(span.background, theme.headerGroupFills[0])));
  assert.ok(familyHeaders.every(span => closeColor(span.background, theme.headerGroupFills[3])), "önceki roller kaldırılınca aile grubu sıraya göre başka renk almamalı");
});
