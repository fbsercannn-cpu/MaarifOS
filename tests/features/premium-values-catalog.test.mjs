import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(
  await readFile(new URL("../../../docs/premium-plan-catalog.v1.json", import.meta.url), "utf8"),
);

test("premium katalog tek ana lens ve en çok iki destek lensi politikasını korur", () => {
  assert.equal(catalog.lensSelectionPolicy.primaryLensCount, 1);
  assert.equal(catalog.lensSelectionPolicy.maximumSupportingLensCount, 2);
  assert.equal(catalog.lensSelectionPolicy.lensesAreOfficialCurricula, false);
  assert.equal(new Set(catalog.lenses.map((lens) => lens.id)).size, catalog.lenses.length);
  for (const lens of catalog.lenses) {
    assert.deepEqual(
      Object.keys(lens).sort(),
      ["displayName", "evidenceGrade", "id", "inspiration"],
    );
  }
});

test("premium katalog değerler-first ve üçlü çatı kontrolünü kapatılamaz katman yapar", () => {
  const layers = catalog.mandatoryCoreLayers;
  assert.equal(new Set(layers).size, layers.length);
  for (const requiredLayer of [
    "values_first_erdem_value_action_trace",
    "respect_responsibility_justice_triple_check",
    "all_20_tymm_values_term_coverage_and_four_per_month",
    "turkish_islamic_cultural_grounding_with_child_dignity",
    "restorative_action_without_moral_belief_or_ritual_scoring",
  ]) {
    assert.ok(layers.includes(requiredLayer), `${requiredLayer} zorunlu katmanı eksik.`);
  }
});
