import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILT_IN_DAILY_MATERIALS,
  DAILY_PLAN_MATERIAL_CATEGORIES,
  filterDailyMaterials,
  generateMaterialPrintHtml,
} from "../../src/core/domain/daily-plan-materials.ts";

test("Günün Materyalleri: 7 Pedagojik Kategori Eksiksiz Tanımlıdır", () => {
  assert.equal(DAILY_PLAN_MATERIAL_CATEGORIES.length, 7);
  const expectedCategories = [
    "rhythm-music",
    "coloring-art",
    "game-cards",
    "rules-values-posters",
    "story-cards",
    "fingerplay-song",
    "worksheets",
  ];

  for (const catId of expectedCategories) {
    const found = DAILY_PLAN_MATERIAL_CATEGORIES.find((c) => c.id === catId);
    assert.ok(found, `Kategori bulunamadı: ${catId}`);
    assert.ok(found.title.length > 0);
    assert.ok(found.icon.length > 0);
  }
});

test("Günün Materyalleri: Dahili Materyaller Her Kategori İçin Hazırdır", () => {
  assert.ok(BUILT_IN_DAILY_MATERIALS.length >= 7);

  for (const item of BUILT_IN_DAILY_MATERIALS) {
    assert.ok(item.id.startsWith("mat-"));
    assert.ok(item.title.length > 3);
    assert.ok(item.pedagogicalObjective.length > 10);
    assert.ok(item.printTitle.length > 3);
    assert.ok(item.printBodyHtml.includes("print-card"));
    assert.ok(item.tags.length > 0);
  }
});

test("Günün Materyalleri: Kategoriye ve Arama Sorgusuna Göre Filtreleme Çalışır", () => {
  const rhythmItems = filterDailyMaterials("rhythm-music");
  assert.ok(rhythmItems.length > 0);
  assert.ok(rhythmItems.every((m) => m.category === "rhythm-music"));

  const coloringItems = filterDailyMaterials("coloring-art");
  assert.ok(coloringItems.length > 0);
  assert.ok(coloringItems.every((m) => m.category === "coloring-art"));

  const searchResults = filterDailyMaterials("all", "ritim");
  assert.ok(searchResults.length > 0);
  assert.ok(searchResults.some((m) => m.title.toLowerCase().includes("ritim") || m.tags.includes("ritim")));

  const emptyResults = filterDailyMaterials("all", "bu_kelime_asla_bulunamaz_xyz123");
  assert.equal(emptyResults.length, 0);
});

test("Günün Materyalleri: A4 Print HTML Çıktısı Standartlara Tam Uygundur", () => {
  const item = BUILT_IN_DAILY_MATERIALS[0];
  const html = generateMaterialPrintHtml(item);

  assert.ok(html.includes("<!DOCTYPE html>"));
  assert.ok(html.includes("@page {"));
  assert.ok(html.includes("size: A4 portrait"));
  assert.ok(html.includes("break-inside: avoid"));
  assert.ok(html.includes(item.printTitle));
  assert.ok(html.includes(item.printBodyHtml));
  assert.ok(html.includes("T.C. MİLLÎ EĞİTİM BAKANLIĞI · MAARİFOS"));
});
