import assert from "node:assert/strict";
import test from "node:test";
import {
  getActivityContextObservationPresets,
  resolveActivityContextObservationDomain,
} from "../../src/features/evidence/activity-context-observation-model.ts";
import { developmentObservationGraphReference } from "../../src/features/evidence/development-observation-graph-references.ts";
import {
  getDevelopmentObservationPresets,
  resolveDevelopmentObservationProgramMapping,
} from "../../src/features/evidence/development-observation-presets.ts";

function contextFor(ageBand, presets = getDevelopmentObservationPresets(ageBand)) {
  const mappings = presets.map((preset) => resolveDevelopmentObservationProgramMapping(preset.id, ageBand));
  return {
    id: "ae1716f0-f58b-4b23-89d6-1278015a1f2c",
    title: "Öğretmenin kaynaklı etkinliği",
    contextKind: "planned-activity",
    curriculumProfile: mappings[0].profile,
    curriculumTargets: mappings.map((mapping) => mapping.target),
  };
}

test("her yaşın gerçek etkinlik hedeflerinden en çok üç özgün örnek gelir; etkinlik sırası ve kaynak korunur", () => {
  for (const ageBand of ["36-48", "48-60", "60-72"]) {
    const presets = getDevelopmentObservationPresets(ageBand);
    const chosen = [presets[4], presets[7], presets[1], presets[13]];
    const context = contextFor(ageBand, chosen);
    const original = structuredClone(context);
    const actual = getActivityContextObservationPresets(ageBand, context);
    assert.deepEqual(actual.map((preset) => preset.id), chosen.slice(0, 3).map((preset) => preset.id));
    for (const preset of actual) {
      assert.equal(preset.ageBand, ageBand);
      assert.equal(preset.provenance.officialChecklist, false);
      assert.equal(preset.provenance.contentOrigin, "MaarifOS-original");
      assert.ok(context.curriculumTargets.some((target) => target.id === preset.curriculumReference.targetId));
    }
    assert.deepEqual(context, original, "öneri etkinliği veya plan hedeflerini değiştirmez");
  }
});

test("tekrarlanan hedef örnekleri çoğaltmaz; gerçek tek eşleşme üçe tamamlanmaz", () => {
  const preset = getDevelopmentObservationPresets("60-72")[0];
  const context = contextFor("60-72", [preset, preset, preset, preset]);
  assert.deepEqual(getActivityContextObservationPresets("60-72", context), [preset]);
});

test("aynı başlık, alan veya stüdyo taslağı hedef sayılmaz; hedefsiz ve plansız bağlam sahte öneri üretmez", () => {
  const context = contextFor("60-72");
  const title = getDevelopmentObservationPresets("60-72")[0].observationText;
  assert.deepEqual(getActivityContextObservationPresets("60-72"), []);
  for (const changed of [
    { ...context, curriculumTargets: [], title },
    { ...context, contextKind: "spontaneous-observation" },
    { ...context, id: "" },
    { ...context, curriculumTargets: null },
    { ...context, curriculumTargets: [{ referenceTitle: title, domain: "Türkçe" }] },
    { ...context, curriculumTargets: [], rawText: title, categoryIds: ["language-communication"], drawingStrokeCount: 10 },
  ]) assert.deepEqual(getActivityContextObservationPresets("60-72", changed), []);
  assert.equal(getDevelopmentObservationPresets("60-72").length, 21, "bağlamsız alan kütüphanesi daraltılmaz");
});

test("yanlış yaş, EÇE ve doğrulanmamış/başka sürüm profilinin hedefleri öne çıkarılmaz", () => {
  const context = contextFor("60-72");
  assert.deepEqual(getActivityContextObservationPresets("36-48", context), []);
  for (const ageBand of [undefined, null, "karma", "0-36", "72-84"]) {
    assert.deepEqual(getActivityContextObservationPresets(ageBand, context), []);
  }
  for (const patch of [
    { framework: "meb_2024" },
    { officialCatalogVerified: false },
    { referenceOrigin: "teacher-declared" },
    { catalogId: "legacy" },
    { sourceVersion: "2099" },
  ]) {
    assert.deepEqual(getActivityContextObservationPresets("60-72", {
      ...context, curriculumProfile: { ...context.curriculumProfile, ...patch },
    }), []);
  }
});

test("aynı gerçek kodu taklit eden bozuk hedef; kaynak, başlık, yaş, tür ve sürüm doğrulanmadan önerilmez", () => {
  const context = contextFor("60-72", [getDevelopmentObservationPresets("60-72")[0]]);
  const canonical = context.curriculumTargets[0];
  for (const patch of [
    { referenceTitle: "Kaynakta bulunmayan başlık" },
    { referenceCode: "UYGUN.1" },
    { domain: "Matematik" },
    { sourcePage: canonical.sourcePage + 1 },
    { sourceUrl: "https://example.invalid/source" },
    { sourceSha256: `sha256:${"0".repeat(64)}` },
    { sourceVersion: "2099" },
    { sourceCheckedOn: "2099-01-01" },
    { sourceLabel: "Doğrulanmamış kaynak" },
    { officialCatalogVerified: false },
    { verificationStatus: "teacher-declared-unverified" },
    { referenceOrigin: "teacher-declared" },
    { catalogId: "other" },
    { kind: "process-component" },
    { ageBands: ["36-48"] },
    { framework: "meb_2024" },
    { assessmentLevel: "independent" },
  ]) {
    assert.deepEqual(getActivityContextObservationPresets("60-72", {
      ...context, curriculumTargets: [{ ...canonical, ...patch }],
    }), [], Object.keys(patch).join(","));
  }
  assert.deepEqual(getActivityContextObservationPresets("60-72", { ...context, curriculumTargets: [null, {}, "TADB.1"] }), []);
});

test("varsa bütüncül graf aynı çıktının tam kanonik referansı olmalıdır", () => {
  const preset = getDevelopmentObservationPresets("60-72")[0];
  const context = contextFor("60-72", [preset]);
  const graph = developmentObservationGraphReference("60-72", preset.curriculumReference.code);
  const withGraph = {
    ...context,
    curriculumTargets: [{ ...context.curriculumTargets[0], holisticGraphReference: graph }],
  };
  assert.deepEqual(getActivityContextObservationPresets("60-72", withGraph), [preset]);
  for (const invalidGraph of [
    { ...graph, relatedNodeIds: graph.relatedNodeIds.slice(1) },
    { ...graph, outcomeNodeId: "outcome:60-72:sosyal:sab.8" },
    { ...graph, sourceSha256: `sha256:${"1".repeat(64)}` },
    developmentObservationGraphReference("60-72", "MHB.3"),
  ]) {
    assert.deepEqual(getActivityContextObservationPresets("60-72", {
      ...context, curriculumTargets: [{ ...context.curriculumTargets[0], holisticGraphReference: invalidGraph }],
    }), []);
  }
});

test("alan seçimi gerçek etkinlik hedefini, sonra doğrulanmış ipucunu, sonra Türkçeyi kullanır", () => {
  const exactPreset = getDevelopmentObservationPresets("60-72").find(
    (preset) => preset.domain === "Matematik",
  );
  assert.ok(exactPreset);
  const exactContext = {
    ...contextFor("60-72", [exactPreset]),
    observationDomainHint: "Hareket ve Sağlık",
  };
  assert.equal(
    resolveActivityContextObservationDomain("60-72", exactContext),
    "Matematik",
  );

  const hintedContext = {
    ...contextFor("60-72"),
    curriculumTargets: [],
    observationDomainHint: "Hareket ve Sağlık",
  };
  assert.deepEqual(getActivityContextObservationPresets("60-72", hintedContext), []);
  assert.equal(
    resolveActivityContextObservationDomain("60-72", hintedContext),
    "Hareket ve Sağlık",
  );
  assert.deepEqual(hintedContext.curriculumTargets, [], "alan ipucu resmî hedef üretmez");
  assert.equal(resolveActivityContextObservationDomain("60-72"), "Türkçe");
});

test("geçersiz veya planlı etkinlik dışındaki alan ipucu genel kütüphaneyi yönlendirmez", () => {
  const baseContext = { ...contextFor("48-60"), curriculumTargets: [] };
  for (const observationDomainHint of [
    "hareket ve sağlık",
    " Hareket ve Sağlık ",
    "Beden",
    "",
    null,
    7,
  ]) {
    assert.equal(
      resolveActivityContextObservationDomain("48-60", {
        ...baseContext,
        observationDomainHint,
      }),
      "Türkçe",
    );
  }
  assert.equal(
    resolveActivityContextObservationDomain("48-60", {
      ...baseContext,
      contextKind: "spontaneous-observation",
      observationDomainHint: "Hareket ve Sağlık",
    }),
    "Türkçe",
  );
});
