import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as scope from "../../src/features/governance/product-scope-policy.ts";
import { CURRENT_RELEASE } from "../../src/release.ts";

test("çekirdek öğretmen görevi ve tekrar giriş azaltımıyla yerel yetenek kabul edilir", () => {
  assert.doesNotThrow(() => scope.assertCapabilityWithinMaarifOsScope({
    capability: "document",
    teacherTask: "Seçili gözlemlerden dönem sonu hazırlık dosyası üret",
    repeatedEntryReduction: "Aynı gözlem metnini ikinci kez yazdırmaz",
    requiresCloud: false,
    requiresEmbeddedGenerativeAi: false,
  }));
});

test("aidat, servis, mesajlaşma, zorunlu bulut ve gömülü üretken AI reddedilir", () => {
  for (const capability of scope.OUT_OF_SCOPE_CAPABILITIES) {
    assert.throws(() => scope.assertCapabilityWithinMaarifOsScope({ capability, teacherTask: "Kurgu", repeatedEntryReduction: "Kurgu", requiresCloud: false, requiresEmbeddedGenerativeAi: false }), /çekirdeğinin dışındadır/u);
  }
  assert.equal(scope.CURRENT_SCOPE_DECISION.requiredCloud, false);
  assert.equal(scope.CURRENT_SCOPE_DECISION.embeddedGenerativeAi, false);
  assert.deepEqual(scope.CURRENT_SCOPE_DECISION.addedInstitutionModules, []);
});

test("soyut katalog fikri ölçülmüş öğretmen işi olmadan kapsama giremez", () => {
  assert.throws(() => scope.assertCapabilityWithinMaarifOsScope({ capability: "new-tool", teacherTask: " ", repeatedEntryReduction: "Tekrarı azaltır", requiresCloud: false, requiresEmbeddedGenerativeAi: false }), /somut öğretmen görevi/u);
  assert.throws(() => scope.assertCapabilityWithinMaarifOsScope({ capability: "new-tool", teacherTask: "Görev", repeatedEntryReduction: "", requiresCloud: false, requiresEmbeddedGenerativeAi: false }), /tekrar giriş/u);
});

test("0.34 sürüm kapısı kapsam kararını ve yerel çalışma bağımlılıklarını birlikte doğrular", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  const dependencyNames = Object.keys({
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  });
  assert.equal(scope.CURRENT_SCOPE_DECISION.release, CURRENT_RELEASE.version);
  assert.equal(packageJson.version, CURRENT_RELEASE.version);
  assert.deepEqual(scope.CURRENT_SCOPE_DECISION.addedInstitutionModules, []);
  assert.ok(!dependencyNames.some((name) => /openai|anthropic|firebase|supabase/iu.test(name)));
});
