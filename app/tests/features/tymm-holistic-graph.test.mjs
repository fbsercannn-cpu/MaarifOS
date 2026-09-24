import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  TYMM_HOLISTIC_GRAPH,
  TYMM_HOLISTIC_GRAPH_CONTENT_SHA256,
  TYMM_HOLISTIC_GRAPH_SOURCE_SHA256,
  assertTymmHolisticGraphIntegrity,
  createTymmHolisticLearningOutcomeReference,
  parseTymmHolisticGraph,
  tymmHolisticLearningOutcomeBundle,
} from "../../src/features/curriculum/tymm-holistic-graph.ts";
import { TYMM_2024_LEARNING_OUTCOMES } from "../../src/features/curriculum/tymm-2024-catalog.ts";
import {
  OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG,
} from "../../src/features/values/official-preschool-value-actions.ts";

const rawGraphPath = new URL(
  "../../src/features/curriculum/tymm-holistic-graph.v1.json",
  import.meta.url,
);

function rawGraphClone() {
  return JSON.parse(readFileSync(rawGraphPath, "utf8"));
}

test("bütüncül grafik exact TYMM kaynağını, sürümü ve bekleyen insan incelemesini taşır", () => {
  assert.equal(TYMM_HOLISTIC_GRAPH.schemaVersion, 1);
  assert.equal(TYMM_HOLISTIC_GRAPH.graphVersion, "1.0.0");
  assert.equal(TYMM_HOLISTIC_GRAPH.sourcePageCount, 353);
  assert.equal(TYMM_HOLISTIC_GRAPH.sourceSha256, TYMM_HOLISTIC_GRAPH_SOURCE_SHA256);
  assert.equal(
    TYMM_HOLISTIC_GRAPH.catalogContentSha256,
    TYMM_HOLISTIC_GRAPH_CONTENT_SHA256,
  );
  assert.deepEqual(TYMM_HOLISTIC_GRAPH.sourceSections, {
    fieldMatrices: [245, 299],
    socialEmotionalLearning: [318, 320],
    erdemDegerEylem: [324, 332],
    dispositions: [333, 333],
    literacy: [334, 337],
    conceptualSkills: [338, 342],
  });
  assert.equal(TYMM_HOLISTIC_GRAPH.reviewStatus, "pending-human-review");
  assert.deepEqual(TYMM_HOLISTIC_GRAPH.humanReview, {
    requiredIndependentPreschoolExpertApprovals: 2,
    approvals: [],
  });
});

test("210 yerleşik çıktı üç yaş bandı ve yedi alanı tam kapsar; altı MYB satırı açıkça supplementary kalır", () => {
  const outcomes = TYMM_HOLISTIC_GRAPH.nodes.filter(
    (node) => node.kind === "learning-outcome",
  );
  const supplementary = TYMM_HOLISTIC_GRAPH.nodes.filter(
    (node) => node.kind === "supplementary-learning-outcome",
  );
  assert.equal(outcomes.length, 210);
  assert.equal(supplementary.length, 6);
  assert.ok(supplementary.every((node) => /^MYB\.[12]$/.test(node.code)));
  assert.equal(
    new Set(outcomes.map((node) => `${node.ageBands[0]}|${node.domain}`)).size,
    21,
  );
  assert.deepEqual(
    new Set(outcomes.map((node) => `${node.ageBands[0]}|${node.domain}|${node.code}`)),
    new Set(
      TYMM_2024_LEARNING_OUTCOMES.map(
        (outcome) => `${outcome.ageBand}|${outcome.domain}|${outcome.code}`,
      ),
    ),
  );
});

test("EDE düğümleri mevcut doğrulanmış Ek-14 kataloğundan kopyasız bileştirilir", () => {
  const valueNodes = TYMM_HOLISTIC_GRAPH.nodes.filter(
    (node) => node.domain === "Erdem-Değer-Eylem",
  );
  const actionCount = OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.actions.length;
  const indicatorCount = OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.actions.reduce(
    (total, action) => total + action.indicators.length,
    0,
  );
  assert.equal(actionCount, 57);
  assert.equal(indicatorCount, 219);
  assert.equal(valueNodes.length, 20 + actionCount + indicatorCount);
  assert.equal(TYMM_HOLISTIC_GRAPH.statistics.externalValueNodeCount, valueNodes.length);
  assert.ok(
    valueNodes.every(
      (node) =>
        node.sourceSha256 === OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.sourceSha256 &&
        node.sourcePage >= 324 &&
        node.sourcePage <= 332,
    ),
  );
  const officialD422 = OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.actions
    .flatMap((action) => action.indicators)
    .find((indicator) => indicator.indicatorCode === "D4.2.2");
  const graphD422 = valueNodes.find((node) => node.code === "D4.2.2");
  assert.ok(officialD422);
  assert.ok(graphD422);
  assert.equal(graphD422.title, officialD422.indicatorText);
  assert.equal(graphD422.parentCodes[0], "D4.2");
});

test("grafik düğümleri kaynak, yaş, üst kod ve değişmezlik sözleşmesini eksiksiz taşır", () => {
  assert.equal(TYMM_HOLISTIC_GRAPH.nodes.length, 1439);
  assert.equal(TYMM_HOLISTIC_GRAPH.statistics.baseNodeCount, 1143);
  assert.equal(TYMM_HOLISTIC_GRAPH.statistics.fieldMatrixRelationCount, 851);
  assert.equal(TYMM_HOLISTIC_GRAPH.statistics.ageDomainCoverageCount, 21);
  assert.ok(Object.isFrozen(TYMM_HOLISTIC_GRAPH));
  assert.ok(Object.isFrozen(TYMM_HOLISTIC_GRAPH.nodes));
  assert.ok(Object.isFrozen(TYMM_HOLISTIC_GRAPH.nodes[0]));
  assert.ok(Object.isFrozen(TYMM_HOLISTIC_GRAPH.nodes[0].ageBands));
  assert.ok(Object.isFrozen(TYMM_HOLISTIC_GRAPH.nodes[0].parentCodes));
  for (const node of TYMM_HOLISTIC_GRAPH.nodes) {
    assert.ok(node.nodeId);
    assert.ok(node.code);
    assert.ok(node.title);
    assert.ok(node.kind);
    assert.ok(node.domain);
    assert.ok(node.ageBands.length > 0);
    assert.equal(node.sourceSha256, TYMM_HOLISTIC_GRAPH_SOURCE_SHA256);
    assert.ok(node.sourcePages.includes(node.sourcePage));
  }
  assert.throws(() => {
    TYMM_HOLISTIC_GRAPH.nodes[0].title = "değiştirilemez";
  }, TypeError);
});

test("öğrenme çıktısı bundle'ı aynı yaş/alan süreç, alan ve kavramsal bağlarını getirir", () => {
  const bundle = tymmHolisticLearningOutcomeBundle("60-72", "FAB.1");
  assert.ok(bundle.length >= 5);
  assert.equal(bundle[0].kind, "learning-outcome");
  assert.equal(bundle[0].code, "FAB.1");
  assert.ok(bundle.some((node) => node.kind === "field-skill" && node.code === "FBAB1"));
  assert.ok(bundle.some((node) => node.kind === "process-component"));
  assert.ok(bundle.every((node) => node.ageBands.includes("60-72")));
  assert.deepEqual(tymmHolisticLearningOutcomeBundle("36-48", "SAB.22"), []);
});

test("kompakt öğrenme çıktısı referansı exact grafik/digest ve değişmez node kimliklerini taşır", () => {
  const bundle = tymmHolisticLearningOutcomeBundle("60-72", "FAB.1");
  const reference = createTymmHolisticLearningOutcomeReference("60-72", "FAB.1");
  assert.ok(reference);
  assert.deepEqual(Object.keys(reference), [
    "graphId",
    "graphVersion",
    "catalogContentSha256",
    "reviewStatus",
    "outcomeNodeId",
    "relatedNodeIds",
    "sourceSha256",
  ]);
  assert.equal(reference.graphId, TYMM_HOLISTIC_GRAPH.graphId);
  assert.equal(reference.graphVersion, TYMM_HOLISTIC_GRAPH.graphVersion);
  assert.equal(reference.catalogContentSha256, TYMM_HOLISTIC_GRAPH_CONTENT_SHA256);
  assert.equal(reference.reviewStatus, "pending-human-review");
  assert.equal(reference.outcomeNodeId, bundle[0].nodeId);
  assert.deepEqual(
    reference.relatedNodeIds,
    bundle.slice(1).map((node) => node.nodeId).sort(),
  );
  assert.equal(reference.sourceSha256, TYMM_HOLISTIC_GRAPH_SOURCE_SHA256);
  assert.ok(Object.isFrozen(reference));
  assert.ok(Object.isFrozen(reference.relatedNodeIds));
  assert.equal(createTymmHolisticLearningOutcomeReference("36-48", "SAB.22"), null);
  assert.throws(() => {
    reference.relatedNodeIds.push("uydurma-node");
  }, TypeError);
});

test("strict parser kaynak ve içerik hash sapmalarını reddeder", () => {
  const sourceTampered = rawGraphClone();
  sourceTampered.sourceSha256 = `sha256:${"0".repeat(64)}`;
  assert.throws(
    () => parseTymmHolisticGraph(sourceTampered),
    /kaynak kimliği kanonik PDF ile eşleşmelidir/i,
  );

  const contentTampered = rawGraphClone();
  contentTampered.nodes[0].title = `${contentTampered.nodes[0].title} değişti`;
  assert.throws(
    () => parseTymmHolisticGraph(contentTampered),
    /içerik SHA-256 özeti/i,
  );

  const fakeApproval = rawGraphClone();
  fakeApproval.humanReview.approvals.push({ name: "uydurma" });
  assert.throws(
    () => parseTymmHolisticGraph(fakeApproval),
    /onay uyduramaz/i,
  );
});

test("integrity kapısı duplicate, orphan ve cycle düğümlerini ayrı ayrı reddeder", () => {
  const duplicate = [...TYMM_HOLISTIC_GRAPH.nodes, TYMM_HOLISTIC_GRAPH.nodes[0]];
  assert.throws(
    () => assertTymmHolisticGraphIntegrity(duplicate),
    /kimlikleri mükerrer/i,
  );

  const orphan = TYMM_HOLISTIC_GRAPH.nodes.map((node, index) =>
    index === 0 ? { ...node, parentCodes: ["BULUNMAYAN.999"] } : node,
  );
  assert.throws(
    () => assertTymmHolisticGraphIntegrity(orphan),
    /üst kodu grafikte çözümlenemedi/i,
  );

  const cycle = TYMM_HOLISTIC_GRAPH.nodes.map((node) => {
    if (node.nodeId === "conceptual:kb1") return { ...node, parentCodes: ["KB1.1"] };
    return node;
  });
  assert.throws(
    () => assertTymmHolisticGraphIntegrity(cycle),
    /döngü içeriyor/i,
  );
});

test("alan matrisi ilişkileri kaynak kodlarıyla tekil ve yaşa bağlıdır", () => {
  const relations = TYMM_HOLISTIC_GRAPH.fieldMatrixRelations;
  assert.equal(relations.length, 851);
  assert.equal(
    new Set(
      relations.map(
        (relation) =>
          `${relation.ageBand}|${relation.learningOutcomeCode}|${relation.relationKind}|${relation.relatedCode}`,
      ),
    ).size,
    relations.length,
  );
  const fab1 = relations.filter(
    (relation) =>
      relation.ageBand === "60-72" && relation.learningOutcomeCode === "FAB.1",
  );
  assert.ok(fab1.some((relation) => relation.relationKind === "field-skill"));
  assert.ok(fab1.some((relation) => relation.relationKind === "integrated-skill"));
  assert.ok(fab1.some((relation) => relation.relationKind === "process-component"));
});
