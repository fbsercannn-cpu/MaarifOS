import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  SEMANTIC_TAGGED_PDF_EVIDENCE,
  createSemanticTaggedPdf,
} from "../../src/features/documents/semantic-tagged-pdf.ts";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fontBytes = new Uint8Array(readFileSync(path.resolve(
  testDirectory,
  "../../public/assets/fonts/MaarifOSSans-Regular.ttf",
)));
const fontLicense = readFileSync(path.resolve(
  testDirectory,
  "../../public/assets/fonts/Roboto-OFL-1.1.txt",
), "utf8");

const fixture = {
  title: "Eylül öğretmen planı",
  language: "tr-TR",
  creator: "MaarifOS",
  nodes: [
    { kind: "heading", level: 1, text: "Eylül öğretmen planı" },
    { kind: "heading", level: 2, text: "Öğrenme süreci" },
    {
      kind: "paragraph",
      text: "Çocuklar yağmur, gölge ve ölçme üzerine düşünür; öğretmen gözlemini yazar.",
    },
    {
      kind: "list",
      items: ["Özgür seçim alanı açılır.", "Şaşırtıcı sonuçlar birlikte konuşulur."],
    },
    {
      kind: "table",
      summary: "Gün ve etkinlik eşleştirmesi",
      headers: ["Gün", "Etkinlik"],
      rowHeaderColumn: 0,
      rows: [["Pazartesi", "Gölge izleri"], ["Salı", "Yağmur ölçer"], ["Çarşamba", ""]],
    },
    {
      kind: "figure",
      altText: "Üç çocuğun farklı uzunluktaki gölgeleri karşılaştırdığı çizim",
      caption: "Gölge karşılaştırma çizimi",
      height: 84,
    },
  ],
};

test("semantik PDF dil, etiket ağacı, roller, gömülü font ve ToUnicode taşır", async () => {
  const bytes = await createSemanticTaggedPdf(fixture, { fontBytes });
  const pdf = Buffer.from(bytes).toString("latin1");

  assert.equal(Buffer.from(bytes.subarray(0, 8)).toString("latin1"), "%PDF-1.7");
  assert.match(pdf, /\/Lang \(tr-TR\)/u);
  assert.match(pdf, /\/MarkInfo << \/Marked true \/Suspects false >>/u);
  assert.match(pdf, /\/StructTreeRoot\b/u);
  assert.match(pdf, /\/Tabs \/S\b/u);
  assert.match(pdf, /\/FontFile2\b/u);
  assert.match(pdf, /\/ToUnicode\b/u);
  assert.match(pdf, /\/CIDToGIDMap\b/u);
  assert.match(pdf, /\/ViewerPreferences << \/DisplayDocTitle true >>/u);
  for (const role of [
    "Document", "H1", "H2", "P", "L", "LI", "Lbl", "LBody",
    "Table", "TR", "TH", "TD", "Figure",
  ]) {
    assert.match(pdf, new RegExp(`/S /${role}\\b`, "u"), `${role} rolü eksik`);
  }
  assert.match(pdf, /\/Alt <feff[0-9a-f]+>/u);
  assert.match(pdf, /\/A << \/O \/Table \/Summary <feff[0-9a-f]+> >>/u);
  assert.match(pdf, /\/Scope \/Column\b/u);
  assert.match(pdf, /\/Scope \/Row\b/u);
  assert.match(pdf, /\/ParentTree\b/u);
  assert.match(pdf, /\/StructParents 0\b/u);
  assert.doesNotMatch(pdf, /\/Subtype \/Image\b/u);
  const xmp = new TextDecoder()
    .decode(bytes)
    .match(/<x:xmpmeta[\s\S]+?<\/x:xmpmeta>/u)?.[0] ?? "";
  assert.match(xmp, /Eylül öğretmen planı/u);
  assert.match(xmp, /<rdf:li>tr-TR<\/rdf:li>/u);
  assert.doesNotMatch(xmp, /Çocuklar yağmur|Özgür seçim|Pazartesi|üç çocuğun/iu);
  assert.deepEqual(SEMANTIC_TAGGED_PDF_EVIDENCE, {
    implementationStatus: "IMPLEMENTED_UNVERIFIED",
    language: "tr-TR",
    tagged: true,
    embeddedFont: true,
    toUnicode: true,
    logicalReadingOrder: true,
    alternativeTextRequired: true,
    pdfUaClaimed: false,
  });
});

test("gömülü font kilitli SHA-256 ve tam OFL-1.1 telif bildirimiyle izlenir", () => {
  assert.equal(
    createHash("sha256").update(fontBytes).digest("hex").toLocaleUpperCase("tr-TR"),
    "FACE805FDEA05B1B45A7DB08F4422B1794B0940E4C7126C25EE28D766E073C61",
  );
  assert.match(fontLicense, /Copyright 2011 The Roboto Project Authors/u);
  assert.match(fontLicense, /SIL OPEN FONT LICENSE Version 1\.1/u);
  assert.match(fontLicense, /PERMISSION & CONDITIONS/u);
});

test("Türkçe metin pdftotext ile gerçek okuma sırasında kayıpsız çıkar", async (context) => {
  if (spawnSync("pdftotext", ["-v"], { encoding: "utf8" }).error) {
    context.skip("pdftotext bu ortamda kurulu değil");
    return;
  }
  const directory = mkdtempSync(path.join(tmpdir(), "maarifos-tagged-pdf-"));
  try {
    const pdfPath = path.join(directory, "plan.pdf");
    const textPath = path.join(directory, "plan.txt");
    const bytes = await createSemanticTaggedPdf(fixture, { fontBytes });
    writeFileSync(pdfPath, bytes);
    execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, textPath]);
    const extracted = readFileSync(textPath, "utf8").replaceAll("\r", "");
    assert.match(extracted, /Eylül öğretmen planı/u);
    assert.match(extracted, /Çocuklar yağmur, gölge ve ölçme üzerine düşünür/u);
    assert.match(extracted, /•\s+Özgür seçim alanı açılır/u);
    assert.match(extracted, /Özgür seçim alanı açılır/u);
    assert.match(extracted, /Pazartesi\s+Gölge izleri/u);
    assert.doesNotMatch(extracted, /(?:^|\s)—(?:\s|$)/u);
    assert.match(extracted, /Gölge karşılaştırma çizimi/u);
    assert.ok(
      extracted.indexOf("Öğrenme süreci") < extracted.indexOf("Özgür seçim alanı açılır"),
      "çıkarılan metin semantik belge sırasını korumalı",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("tablo satırını taze sayfaya sığıyorsa bölmez; zorunlu bölmede devam bağlamını korur", async (context) => {
  if (spawnSync("pdftotext", ["-v"], { encoding: "utf8" }).error) {
    context.skip("pdftotext bu ortamda kurulu değil");
    return;
  }
  const directory = mkdtempSync(path.join(tmpdir(), "maarifos-table-pagination-"));
  try {
    const keepTogether = await createSemanticTaggedPdf({
      title: "Satır bütünlüğü",
      nodes: [
        { kind: "heading", level: 1, text: "Satır bütünlüğü" },
        {
          kind: "paragraph",
          text: "Hazırlık açıklaması ".repeat(260),
        },
        {
          kind: "table",
          headers: ["Adı Soyadı", "Veli bilgisi"],
          rowHeaderColumn: 0,
          continuationContextColumns: [0],
          rows: [[
            "Nurbanu Uzunoğulları",
            "Anne ve okul çıkışında yetkili teslim kişisi; telefon bilgisi kayıtlıdır. ".repeat(5),
          ]],
        },
      ],
    }, { fontBytes });
    const keepPath = path.join(directory, "keep.pdf");
    const keepTextPath = path.join(directory, "keep.txt");
    writeFileSync(keepPath, keepTogether);
    execFileSync("pdftotext", ["-raw", "-enc", "UTF-8", keepPath, keepTextPath]);
    const keepPages = readFileSync(keepTextPath, "utf8")
      .replaceAll("\r", "")
      .split("\f")
      .filter((page) => page.trim());
    const namePage = keepPages.findIndex((page) => page.includes("Nurbanu Uzunoğulları"));
    const tailPage = keepPages.findIndex((page) => page.includes("telefon bilgisi kayıtlıdır"));
    assert.ok(namePage >= 1, "satır kalan dar alana değil taze sayfaya taşınmalı");
    assert.equal(tailPage, namePage, "taze sayfaya sığan satır hücreler arasında bölünmemeli");
    assert.doesNotMatch(keepPages.join("\n"), /Devam —/u);

    const fullContinuationName = `İpek Öztürk ${"Uzunoğulları".repeat(9)}`;
    const forcedSplit = await createSemanticTaggedPdf({
      title: "Zorunlu satır devamı",
      nodes: [{
        kind: "table",
        headers: ["Adı Soyadı", "Ayrıntı"],
        rowHeaderColumn: 0,
        continuationContextColumns: [0],
        preserveContinuationContext: true,
        rows: [[fullContinuationName, "Uzun kayıt ayrıntısı ".repeat(900)]],
      }],
    }, { fontBytes });
    const forcedPath = path.join(directory, "forced.pdf");
    const forcedTextPath = path.join(directory, "forced.txt");
    writeFileSync(forcedPath, forcedSplit);
    execFileSync("pdftotext", ["-raw", "-enc", "UTF-8", forcedPath, forcedTextPath]);
    const forcedText = readFileSync(forcedTextPath, "utf8").replaceAll("\r", "");
    assert.match(forcedText, /Devam — Adı Soyadı: İpek Öztürk/u);
    assert.ok(forcedText.replace(/\s+/gu, "").includes(`Devam—AdıSoyadı:${fullContinuationName.replace(/\s+/gu, "")}`));
    assert.doesNotMatch(forcedText, /…/u, "devam bağlamı da eksiksiz korunmalı");
    assert.ok(forcedText.split("\f").filter((page) => page.trim()).length > 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("alternatif metinsiz şekli ve bozuk tabloyu fail-closed reddeder", async () => {
  await assert.rejects(
    createSemanticTaggedPdf(
      { title: "Şekil", nodes: [{ kind: "figure", altText: " " }] },
      { fontBytes },
    ),
    /alternatif metin/u,
  );
  await assert.rejects(
    createSemanticTaggedPdf(
      {
        title: "Tablo",
        nodes: [{ kind: "table", headers: ["Gün", "Etkinlik"], rows: [["Pazartesi"]] }],
      },
      { fontBytes },
    ),
    /sütun sayısı/u,
  );
  await assert.rejects(
    createSemanticTaggedPdf(
      {
        title: "Tablo",
        nodes: [{
          kind: "table",
          headers: ["Gün"],
          rows: [["Pazartesi"]],
          rowHeaderColumn: 1,
        }],
      },
      { fontBytes },
    ),
    /satır başlığı sütunu/u,
  );
});

test("font kapsamı dışındaki karakteri bozuk metne dönüştürmez", async () => {
  await assert.rejects(
    createSemanticTaggedPdf(
      { title: "Kapsam", nodes: [{ kind: "paragraph", text: "Etkinlik 😀" }] },
      { fontBytes },
    ),
    /U\+1F600/u,
  );
});

test("yatay çizelge opsiyonları yerel kalır; varsayılan dikey belgelerin sözleşmesi değişmez", async () => {
  const portrait = await createSemanticTaggedPdf(fixture, { fontBytes });
  assert.match(Buffer.from(portrait).toString("latin1"), /\/MediaBox \[0 0 595\.28 841\.89\]/u);
  const document = {
    title: "Sınıf iletişim çizelgesi", orientation: "landscape", pageMargin: 28.35,
    artifactHeaderText: "Kurgu Anaokulu · Çiçekler Sınıfı",
    nodes: [{ kind: "table", headers: ["Sıra", "Öğrenci", "Yakını"], columnWeights: [1, 4, 5], fontSize: 8.5,
      balancePages: true, reserveAfter: 50, rows: Array.from({ length: 40 }, (_, index) => [String(index + 1), `Kurgu Öğrenci ${index + 1}`, "Kurgu veli iletişim bilgisi\nTeslim yetkili"]) }],
  };
  const landscape = await createSemanticTaggedPdf(document, { fontBytes });
  assert.match(Buffer.from(landscape).toString("latin1"), /\/MediaBox \[0 0 841\.89 595\.28\]/u);
  for (const update of [{ orientation: "diagonal" }, { pageMargin: 0 }, { pageMargin: Number.NaN }]) {
    await assert.rejects(createSemanticTaggedPdf({ ...document, ...update }, { fontBytes }), /PDF/u);
  }
  for (const update of [{ fontSize: 6 }, { fontSize: Number.NaN }, { reserveAfter: -1 }, { rowGroupColumn: -1 }, { rowGroupColumn: 3 }, { rowGroupColumn: 0.5 }]) {
    await assert.rejects(createSemanticTaggedPdf({ ...document, nodes: [{ ...document.nodes[0], ...update }] }, { fontBytes }), /PDF/u);
  }
});
