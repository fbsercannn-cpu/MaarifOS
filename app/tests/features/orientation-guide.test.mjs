import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ORIENTATION_GUIDE_SHA256,
  ORIENTATION_GUIDE_MANIFEST_URL,
  loadOrientationGuide,
  loadOrientationGuidePdf,
  orientationPageImageUrl,
  orientationPageLabel,
  parseOrientationGuide,
  searchOrientationGuide,
} from "../../src/features/orientation-guide/orientation-guide.ts";

const publicRoot = new URL("../../public/", import.meta.url);
const readPublic = (url) => readFileSync(new URL(url.slice(1), publicRoot));
const raw = JSON.parse(readPublic(ORIENTATION_GUIDE_MANIFEST_URL));
const guide = parseOrientationGuide(raw);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("sağlanan PDF aynen korunur; 35 sayfanın tamamı metin ve tam sayfa görseliyle paketlenir", () => {
  const original = readPublic(guide.pdfUrl);
  assert.equal(original.byteLength, 13_514_036);
  assert.equal(digest(original), ORIENTATION_GUIDE_SHA256);
  assert.equal(original.subarray(0, 5).toString(), "%PDF-");
  assert.equal(guide.pages.length, 35);
  assert.equal(guide.pages.reduce((total, page) => total + page.text.length, 0), 44_316);
  for (const page of guide.pages) {
    const image = readPublic(page.imageUrl);
    assert.equal(image.byteLength, page.imageBytes);
    assert.equal(image.toString("ascii", 8, 12), "WEBP");
    assert.equal(digest(image), page.imageSha256);
    assert.equal(digest(page.text), page.textSha256);
    assert.ok(page.imageWidth >= 1100 && page.imageHeight >= 1600);
  }
  const allText = guide.pages.map((page) => page.text).join("\n");
  for (let activity = 1; activity <= 25; activity += 1) {
    assert.match(allText, new RegExp(`ETKİNLİK ${activity}(?:\\s|$)`, "u"));
  }
  assert.match(guide.pages[11].text, /EK-1 OKUL SONRASI RUTİNİ AİLE NOTU/u);
  assert.match(guide.pages[12].text, /EK-2 ÇİZELGE/u);
  assert.match(guide.pages[14].text, /EK-3: OKULDA İLK HAFTAM/u);
});

test("çevrim dışı kaynak listesi metni, PDF’yi ve her sayfayı eksiksiz kapsar", () => {
  const assets = JSON.parse(readPublic("/assets/resources/orientation-guide-2026-2027/offline-assets.json"));
  assert.deepEqual(assets, [ORIENTATION_GUIDE_MANIFEST_URL, guide.pdfUrl, ...guide.pages.map((page) => page.imageUrl)]);
  assert.equal(new Set(assets).size, 37);
  assert.ok(assets.every((url) => readPublic(url).length > 0));
  assert.equal(guide.sourceOrigin, "user-supplied-pdf");
  assert.equal(guide.officialPublicationVerified, false);
  assert.equal(guide.pages[34].links.length, 10);
});

test("tam metin araması Türkçe harfleri ve satır aralarına taşan ifadeleri korur", () => {
  assert.deepEqual(searchOrientationGuide(guide, "OKUL POSTANESİ").map((result) => result.page.number), [28]);
  assert.deepEqual(searchOrientationGuide(guide, "Okul\n Postanesi").map((result) => result.page.number), [28]);
  assert.ok(searchOrientationGuide(guide, "Sınıfımız bir ağaç").some((result) => result.page.number === 20));
  assert.ok(searchOrientationGuide(guide, "İŞ BİRLİĞİ").length > 0);
  assert.deepEqual(searchOrientationGuide(guide, "  "), []);
  assert.deepEqual(searchOrientationGuide(guide, "olmayanbenzersizkelime"), []);
  const result = searchOrientationGuide(guide, "okul postanesi")[0];
  assert.ok(result.excerpt.toLocaleLowerCase("tr-TR").includes("okul postanesi"));
  assert.equal(orientationPageLabel(guide.pages[0]), "PDF 1 / 35 · Kapak");
  assert.equal(orientationPageLabel(guide.pages[34]), "PDF 35 / 35 · Basılı sayfa 34");
});

test("eksik sayfa, bozuk kaynak kimliği ve yabancı bağlantılar kısmi başarı olarak kabul edilmez", () => {
  const invalid = [
    null, {}, { ...raw, schemaVersion: 2 }, { ...raw, sourceSha256: "x" },
    { ...raw, pdfUrl: "https://example.com/guide.pdf" }, { ...raw, pdfBytes: 1 },
    { ...raw, sourceOrigin: "MEB-official" }, { ...raw, officialPublicationVerified: true },
    { ...raw, pages: raw.pages.slice(0, 34) },
  ];
  for (const value of invalid) assert.throws(() => parseOrientationGuide(value), /Rehber dosyası/u);
  for (const patch of [
    { number: 7 }, { printedPage: 0 }, { text: "" }, { imageWidth: 0 },
    { imageUrl: "/wrong.webp" }, { imageSha256: "bad" },
    { links: [{ url: "javascript:alert(1)", label: "uygunsuz" }] },
    { links: [{ url: "https://example.com", label: "yabancı" }] },
  ]) {
    const changed = structuredClone(raw);
    Object.assign(changed.pages[0], patch);
    assert.throws(() => parseOrientationGuide(changed), /Rehber dosyası/u);
  }
  for (const page of [0, -1, 36, 1.5, NaN, Infinity]) assert.throws(() => orientationPageImageUrl(page));
});

test("yükleyici kesintide Türkçe hata verir; yeniden deneme tam manifesti doğrular", async (context) => {
  const signal = new AbortController().signal;
  context.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, ORIENTATION_GUIDE_MANIFEST_URL);
    assert.equal(options.signal, signal);
    return new Response(JSON.stringify(raw), { status: 200 });
  });
  assert.equal((await loadOrientationGuide(signal)).pages.length, 35);
  globalThis.fetch.mock.mockImplementation(async () => new Response("unavailable", { status: 503 }));
  await assert.rejects(loadOrientationGuide(), /Rehber yüklenemedi/u);
  globalThis.fetch.mock.mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }));
  await assert.rejects(loadOrientationGuide(), /Rehber dosyası/u);
});

test("PDF açma ve indirme tam dosyayı yükler; eksik veya değiştirilmiş PDF açılmaz", async (context) => {
  const original = readPublic(guide.pdfUrl);
  context.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, guide.pdfUrl);
    assert.equal(options, undefined);
    return new Response(original, { status: 200 });
  });
  assert.deepEqual(Buffer.from(await loadOrientationGuidePdf()), original);
  globalThis.fetch.mock.mockImplementation(async () => new Response("error", { status: 503 }));
  await assert.rejects(loadOrientationGuidePdf(), /Özgün PDF hazırlanamadı/u);
  globalThis.fetch.mock.mockImplementation(async () => new Response("%PDF-incomplete"));
  await assert.rejects(loadOrientationGuidePdf(), /Özgün PDF hazırlanamadı/u);
  const modified = Buffer.from(original);
  modified[100] ^= 1;
  globalThis.fetch.mock.mockImplementation(async () => new Response(modified));
  await assert.rejects(loadOrientationGuidePdf(), /Özgün PDF hazırlanamadı/u);
});
