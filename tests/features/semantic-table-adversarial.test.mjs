import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const app = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(app, "output/daily-routine-cards-2026-09-08/semantic-adversarial"); mkdirSync(output, { recursive: true });
const engineUrl = new URL("../../src/features/documents/semantic-tagged-pdf.ts", import.meta.url).href;
const fontPath = fileURLToPath(new URL("../../public/assets/fonts/MaarifOSSans-Regular.ttf", import.meta.url));
const worker = `import {readFileSync,writeFileSync} from 'node:fs'; import {createSemanticTaggedPdf} from ${JSON.stringify(engineUrl)}; try { const bytes = await createSemanticTaggedPdf(JSON.parse(readFileSync(process.argv[1],'utf8')), {fontBytes:new Uint8Array(readFileSync(${JSON.stringify(fontPath)}))}); writeFileSync(process.argv[2],bytes); console.log(JSON.stringify({status:'saved',byteLength:bytes.length})); } catch(e) { console.log(JSON.stringify({status:'rejected',message:e instanceof Error?e.message:'Rejected'})); }`;
function render(document, name) { const dir = mkdtempSync(path.join(output, `${name}-`)), input = path.join(dir, "input.json"), pdf = path.join(dir, "document.pdf"); writeFileSync(input, JSON.stringify(document)); const result = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", worker, input, pdf], { encoding: "utf8", timeout: 10000, maxBuffer: 1024 * 1024 })); return { ...result, pdf }; }
const pythonReady = spawnSync("python", ["-c", "import fitz"], { encoding: "utf8", timeout: 5000 }).status === 0;
function inspect(pdf) { return JSON.parse(execFileSync("python", ["-c", `import fitz,json,sys
d=fitz.open(sys.argv[1]); out=[]
for p in d:
 spans=[s for b in p.get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans']]
 outside=[s['bbox'] for s in spans if s['bbox'][0]<-0.1 or s['bbox'][1]<-0.1 or s['bbox'][2]>p.rect.width+0.1 or s['bbox'][3]>p.rect.height+0.1]
 out.append({'text':p.get_text(),'outside':outside,'size':[p.rect.width,p.rect.height]})
print(json.dumps(out,ensure_ascii=True))`, pdf], { encoding: "utf8", timeout: 10000, maxBuffer: 8 * 1024 * 1024 })); }
const table = { kind: "table", headers: ["Sıra", "Çocuk", "Anne", "Baba"], headerGroups: [{ label: "ÖĞRENCİ", span: 2 }, { label: "VELİLER", span: 2 }], rows: [["1", "Kurgu Çocuk", "Kurgu Anne", "Kurgu Baba"]], rowHeaderColumn: 1, continuationContextColumns: [0, 1], preserveContinuationContext: true, rowDetails: ["Kurgu ayrıntı"] };
test("gruplu tabloda sayfadan yüksek grup/yaprak başlığı kilitlenmeden açıkça reddedilir", () => {
  for (const variant of [{ ...table, headerGroups: [{ label: "UZUN BAŞLIK ".repeat(2500), span: 4 }] }, { ...table, headers: ["ÇOK UZUN SÜTUN ".repeat(2000), "Çocuk", "Anne", "Baba"] }]) { const result = render({ title: "Kurgu taşan başlık", orientation: "landscape", nodes: [variant] }, "oversized-header"); assert.equal(result.status, "rejected", "sayfa yüksekliğini tüketen başlık kesilerek veya sıfır ilerlemeyle kabul edilmemeli"); assert.match(result.message, /PDF|başlık|sayfa|yüksek/u); }
});
test("tam genişlikte uzun ayrıntı bandı bütün tokenları bir kez korur; devamda başlık ve çocuk bağlamı bulunur", context => {
  if (!pythonReady) { context.skip("Bağımsız PDF geometri okuyucusu PyMuPDF kurulu değil."); return; }
  const tokens = Array.from({ length: 2400 }, (_, i) => `BANT${String(i).padStart(4, "0")}`), detail = `Ayrıntı başı ${tokens.join(" ")} Ayrıntı sonu`;
  const result = render({ title: "Kurgu uzun ayrıntı bandı", orientation: "landscape", pageMargin: 32, artifactFooterText: "Okul Öncesi Öğretmeni", nodes: [{ kind: "heading", level: 1, text: "Çocuk iletişim tablosu" }, { ...table, rows: [["1", "Kurgu Çocuk", "Kurgu Anne", "Kurgu Baba"], ["2", "Sonraki Kurgu", "İkinci Anne", "İkinci Baba"]], rowDetails: [detail, "Sonraki çocuğun kısa adres bandı"], balancePages: true, reserveAfter: 40 }, { kind: "paragraph", text: "TABLO SONRASI İMZA" }] }, "long-detail");
  assert.equal(result.status, "saved"); const pages = inspect(result.pdf), text = pages.map(p => p.text).join("\n"); assert.ok(pages.length >= 3); assert.ok(pages.every(p => !p.outside.length), "metin sayfa dışına çıkmamalı");
  const found = text.match(/BANT\d{4}/gu) ?? []; assert.equal(found.length, tokens.length); assert.equal(new Set(found).size, tokens.length); assert.deepEqual(found, tokens); assert.ok(text.indexOf("BANT2399") < text.indexOf("Sonraki Kurgu")); assert.ok(text.indexOf("Sonraki çocuğun kısa adres bandı") < text.indexOf("TABLO SONRASI İMZA"));
  for (const page of pages.filter(p => /BANT\d{4}/u.test(p.text))) { assert.match(page.text, /ÖĞRENCİ/u); assert.match(page.text, /VELİLER/u); assert.match(page.text, /Kurgu Çocuk/u); }
  assert.match(pages[0].text, /Kurgu Çocuk/u, "ilk başlık tek başına bir sayfada bırakılmamalı; uzun bant ilk veri satırını itmemeli");
  assert.equal(pages.findIndex(p => p.text.includes("Sonraki Kurgu")), pages.findIndex(p => p.text.includes("BANT2399")), "son bandın sayfasında yer olan kısa sonraki çocuk önceden hesaplanan dengeleme kırığıyla yeni sayfaya itilmemeli");
  writeFileSync(path.join(path.dirname(result.pdf), "independent-inspection.json"), JSON.stringify({ syntheticOnly: true, pageCount: pages.length, tokenCount: found.length, everyTokenExactlyOnce: true, allTextInsidePage: true }, null, 2));
});
test("çok uzun eksiksiz çocuk bağlamı olan bant sayfa ilerlemesini korur veya açıkça reddedilir", context => {
  if (!pythonReady) { context.skip("Bağımsız PDF geometri okuyucusu PyMuPDF kurulu değil."); return; }
  const name = `Kurgu ${"UzunÇocukSoyadı ".repeat(160)}`.trim(), result = render({ title: "Kurgu uzun devam bağlamı", orientation: "landscape", nodes: [{ ...table, rows: [["1", name, "Anne", "Baba"]], rowDetails: ["Bağlam sonrası ayrıntı ".repeat(2200)] }] }, "long-context");
  if (result.status === "rejected") { assert.match(result.message, /PDF|başlık|sayfa|yüksek|bağlam|sığ/u); return; }
  const pages = inspect(result.pdf); assert.ok(pages.length < 120, "devam bağlamı ilerlemeyi durdurmamalı"); assert.ok(pages.every(p => !p.outside.length), "uzun çocuk bağlamı sayfa dışına çıkmamalı"); assert.ok(pages.map(p => p.text).join(" ").replace(/\s+/gu, "").includes(name.replace(/\s+/gu, "")), "çocuk bağlamı kısaltılmamalı");
});
