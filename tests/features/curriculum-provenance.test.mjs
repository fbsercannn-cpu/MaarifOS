import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeCurriculumCatalogImpact,
  createCurriculumCatalogSnapshot,
} from "../../src/features/curriculum/catalog-provenance.ts";
import {
  TYMM_2024_CATALOG_METADATA,
  TYMM_2024_CATALOG_SNAPSHOT,
  TYMM_2024_LEARNING_OUTCOMES,
} from "../../src/features/curriculum/tymm-2024-catalog.ts";

const changedDigest = `sha256:${"f".repeat(64)}`;

test("TYMM katalog snapshot'ı provenance alanlarını eksiksiz korur ve derin dondurulur", () => {
  assert.equal(TYMM_2024_CATALOG_SNAPSHOT.schemaVersion, 1);
  assert.equal(
    TYMM_2024_CATALOG_SNAPSHOT.metadata.sourceCheckedOn,
    TYMM_2024_CATALOG_METADATA.sourceCheckedOn,
  );
  assert.equal(
    TYMM_2024_CATALOG_SNAPSHOT.metadata.sourceSha256,
    TYMM_2024_CATALOG_METADATA.sourceSha256,
  );
  assert.equal(
    TYMM_2024_CATALOG_SNAPSHOT.metadata.catalogContentSha256,
    TYMM_2024_CATALOG_METADATA.catalogContentSha256,
  );
  assert.equal(
    TYMM_2024_CATALOG_SNAPSHOT.targets.length,
    TYMM_2024_LEARNING_OUTCOMES.length,
  );
  assert.ok(Object.isFrozen(TYMM_2024_CATALOG_SNAPSHOT));
  assert.ok(Object.isFrozen(TYMM_2024_CATALOG_SNAPSHOT.metadata));
  assert.ok(Object.isFrozen(TYMM_2024_CATALOG_SNAPSHOT.metadata.matrixPageRange));
  assert.ok(Object.isFrozen(TYMM_2024_CATALOG_SNAPSHOT.targets));
  assert.ok(Object.isFrozen(TYMM_2024_CATALOG_SNAPSHOT.targets[0]));
  assert.throws(() => {
    TYMM_2024_CATALOG_SNAPSHOT.targets[0].title = "değiştirildi";
  }, TypeError);
});

test("snapshot girdilerden kopuk bir değer nesnesidir ve geçmiş snapshot'ları yeniden yazmaz", () => {
  const metadata = { ...TYMM_2024_CATALOG_METADATA };
  const targets = [{ id: "old-target", title: "Tarihsel hedef" }];
  const historicalProfile = Object.freeze({
    catalogId: metadata.catalogId,
    sourceVersion: metadata.sourceVersion,
  });
  const historicalTarget = Object.freeze({ ...targets[0] });
  const snapshot = createCurriculumCatalogSnapshot(metadata, targets);

  metadata.sourceCheckedOn = "2099-01-01";
  targets[0].title = "Yeni başlık";

  assert.equal(snapshot.metadata.sourceCheckedOn, "2026-07-29");
  assert.equal(snapshot.targets[0].title, "Tarihsel hedef");
  assert.deepEqual(historicalProfile, {
    catalogId: TYMM_2024_CATALOG_METADATA.catalogId,
    sourceVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
  });
  assert.deepEqual(historicalTarget, {
    id: "old-target",
    title: "Tarihsel hedef",
  });
});

test("etki analizi değişmeyen metadata ile yalnız kontrol tarihi ilerlemesini unchanged sayar", () => {
  const next = {
    ...TYMM_2024_CATALOG_METADATA,
    sourceCheckedOn: "2026-08-03",
  };
  assert.equal(
    analyzeCurriculumCatalogImpact(TYMM_2024_CATALOG_METADATA, next),
    "unchanged",
  );
});

test("etki analizi yalnız kaynak digest'i değiştiğinde source-changed döndürür", () => {
  assert.equal(
    analyzeCurriculumCatalogImpact(TYMM_2024_CATALOG_METADATA, {
      ...TYMM_2024_CATALOG_METADATA,
      sourceSha256: changedDigest,
    }),
    "source-changed",
  );
});

test("etki analizi katalog digest'i değiştiğinde catalog-changed döndürür", () => {
  assert.equal(
    analyzeCurriculumCatalogImpact(TYMM_2024_CATALOG_METADATA, {
      ...TYMM_2024_CATALOG_METADATA,
      catalogContentSha256: changedDigest,
    }),
    "catalog-changed",
  );
});

test("sürüm farkı en yüksek etki olarak version-changed döndürür", () => {
  assert.equal(
    analyzeCurriculumCatalogImpact(TYMM_2024_CATALOG_METADATA, {
      ...TYMM_2024_CATALOG_METADATA,
      catalogVersion: "2.0.0",
      sourceSha256: changedDigest,
      catalogContentSha256: changedDigest,
    }),
    "version-changed",
  );
  assert.equal(
    analyzeCurriculumCatalogImpact(TYMM_2024_CATALOG_METADATA, {
      ...TYMM_2024_CATALOG_METADATA,
      sourceVersion: "2026.08.03",
    }),
    "version-changed",
  );
});
