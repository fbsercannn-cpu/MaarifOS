import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { verifyPremiumEntitlement } from "../../src/features/premium-access/entitlement.ts";
import { parsePremiumContentPack } from "../../src/features/premium-plans/content-repository.ts";
import {
  buildPremiumPlanExportParagraphs,
  createPremiumPlanDocx,
  preparePremiumPlanExportDocument,
} from "../../src/features/premium-plans/export-document.ts";
import { createSignedEntitlementFixture } from "../helpers/premium-entitlement.mjs";

async function pack() {
  const raw = JSON.parse(await readFile(
    new URL("../../../premium-content/releases/tymm-6072/2026-09/content.v2.json", import.meta.url),
    "utf8",
  ));
  return parsePremiumContentPack(raw);
}

async function valuesPack() {
  const raw = JSON.parse(await readFile(
    new URL("../../../premium-content/releases/tymm-6072/2026-09/content.v3.json", import.meta.url),
    "utf8",
  ));
  return parsePremiumContentPack(raw);
}

test("deneme erişimi PDF ve Word çıktı hazırlığını kapatır", async () => {
  const content = await pack();
  const access = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(content, { accessMode: "trial" }),
  );
  assert.throws(
    () => preparePremiumPlanExportDocument(content, access, "pdf"),
    /Deneme sürümünde PDF ve Word çıktısı kapalıdır/,
  );
});

test("satın alınan veya STAFF erişimli seçili paket eksiksiz çıktı belgesi hazırlar", async () => {
  const content = await pack();
  for (const kind of ["purchased", "staff-code"]) {
    const access = await verifyPremiumEntitlement(
      await createSignedEntitlementFixture(content, { accessMode: kind }),
    );
    const document = preparePremiumPlanExportDocument(
      content,
      access,
      kind === "purchased" ? "pdf" : "word",
    );
    assert.equal(document.weeks.length, 4);
    assert.equal(document.activities.length, 12);
    assert.equal(document.fullDayFlow.length, 10);
    assert.equal(document.contentPackVersion, content.version);
    assert.match(document.fileName, kind === "purchased" ? /\.pdf$/ : /\.docx$/);
    const paragraphs = buildPremiumPlanExportParagraphs(content, document);
    assert.ok(paragraphs.length > 150);
    assert.ok(paragraphs.some((paragraph) => paragraph.text.includes("Öğretmen yansıtması")));
  }
});

test("v3 çıktısı değer tasarımını kaynak ve ihtiyat diliyle gösterir; v2'ye değer uydurmaz", async () => {
  const content = await valuesPack();
  const access = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(content, { accessMode: "staff-code" }),
  );
  const document = preparePremiumPlanExportDocument(content, access, "word");
  const text = buildPremiumPlanExportParagraphs(content, document)
    .map((paragraph) => paragraph.text)
    .join("\n");
  assert.match(text, /Ana değer: D4 Dostluk/);
  assert.match(text, /D4\.1\.1.*İyi ve kötü zamanlarında arkadaşlarına destek olur/);
  assert.match(text, /Yaşantı\/ikilem:/);
  assert.match(text, /Karşı kanıt sorusu:/);
  assert.match(text, /altı rollü insan uzman incelemesi bekliyor/);
  assert.doesNotMatch(text, /değeri kazandı|değer puanı|liderlik tablosu/i);

  const legacy = await pack();
  const legacyAccess = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(legacy, { accessMode: "staff-code" }),
  );
  const legacyDocument = preparePremiumPlanExportDocument(legacy, legacyAccess, "word");
  const legacyText = buildPremiumPlanExportParagraphs(legacy, legacyDocument)
    .map((paragraph) => paragraph.text)
    .join("\n");
  assert.match(legacyText, /Eski içerik sürümünde değer snapshot'ı bulunmuyor/);
  assert.doesNotMatch(legacyText, /Ana değer: D\d+/);
});

test("Word çıktısı geçerli DOCX kabını ve Türkçe plan metnini üretir", async () => {
  const content = await pack();
  const access = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(content, { accessMode: "staff-code" }),
  );
  const document = preparePremiumPlanExportDocument(
    content,
    access,
    "word",
  );
  const bytes = createPremiumPlanDocx(buildPremiumPlanExportParagraphs(content, document));
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  const decoded = new TextDecoder().decode(bytes);
  assert.match(decoded, /\[Content_Types\]\.xml/);
  assert.match(decoded, /word\/document\.xml/);
  assert.match(decoded, /öğretmenin sınıf bağlamına göre/);
  assert.match(decoded, /TYMM 2024/);
});

test("doğrulanmamış erişimi ve başka içerik sürümünü fail-closed reddeder", async () => {
  const content = await pack();
  assert.throws(
    () => preparePremiumPlanExportDocument(content, {}, "word"),
    /doğrulanmış entitlement gereklidir/,
  );
  const access = await verifyPremiumEntitlement(
    await createSignedEntitlementFixture(content),
  );
  assert.throws(
    () => preparePremiumPlanExportDocument(
      { ...content, version: "başka-sürüm" },
      access,
      "pdf",
    ),
    /yalnız doğrulanan paket ve akademik sürüm/,
  );
});
