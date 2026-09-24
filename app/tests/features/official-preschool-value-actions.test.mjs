import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { VALUE_CODES } from "../../src/features/values/values-constitution.ts";
import {
  OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE,
  OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG,
  OFFICIAL_PRESCHOOL_VALUE_ACTION_ENTRIES,
  assertOfficialPreschoolValueActionSnapshot,
  parseOfficialPreschoolValueActionCatalog,
} from "../../src/features/values/official-preschool-value-actions.ts";

const rawCatalog = JSON.parse(
  await readFile(
    new URL(
      "../../src/features/values/official-preschool-value-actions.v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

function cloneCatalog() {
  return structuredClone(rawCatalog);
}

test("Ek-14 kataloğu 57 üst eylemi ve 219 benzersiz göstergeyi kaynak sırasıyla taşır", () => {
  assert.deepEqual(OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG, rawCatalog);
  assert.equal(OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.actions.length, 57);
  assert.equal(OFFICIAL_PRESCHOOL_VALUE_ACTION_ENTRIES.length, 219);
  assert.equal(new Set(OFFICIAL_PRESCHOOL_VALUE_ACTION_ENTRIES.map((entry) => entry.indicatorCode)).size, 219);
  assert.deepEqual(
    [...new Set(OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.actions.map((action) => action.valueCode))],
    VALUE_CODES,
  );
  assert.equal(
    createHash("sha256").update(JSON.stringify(rawCatalog.actions)).digest("hex"),
    "4d2a7a8403b6c5c346d77d622dce3e3321ace60f3f31a52ad09dcd6cf6a00699",
  );
});

test("her gösterge üst eylemin exact adı, değeri ve PageLabel sayfasıyla bütünlük kurar", () => {
  for (const action of OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.actions) {
    assert.match(action.actionCode, /^D(?:[1-9]|1\d|20)\.\d+$/);
    assert.equal(action.actionCode.startsWith(`${action.valueCode}.`), true);
    assert.equal(Object.isFrozen(action), true);
    assert.equal(Object.isFrozen(action.indicators), true);
    for (const indicator of action.indicators) {
      assert.equal(indicator.sourcePage, action.sourcePage);
      assert.equal(indicator.sourcePage >= 324 && indicator.sourcePage <= 332, true);
      assert.equal(Object.isFrozen(indicator), true);
    }
  }
  assert.equal(Object.isFrozen(OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG), true);
  assert.equal(Object.isFrozen(OFFICIAL_PRESCHOOL_VALUE_ACTION_CATALOG.actions), true);
  assert.equal(Object.isFrozen(OFFICIAL_PRESCHOOL_VALUE_ACTION_ENTRIES), true);
  assert.equal(Object.isFrozen(OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE), true);
});

test("PDF kaynak anomalileri düzeltilmeden saklanır ve doğrulanmış snapshot indeksine alınmaz", () => {
  const anomalies = OFFICIAL_PRESCHOOL_VALUE_ACTION_ENTRIES.filter(
    (entry) => entry.status === "source_anomaly",
  );
  assert.deepEqual(
    anomalies.map((entry) => entry.indicatorCode),
    ["D.3.3.3", "D3.4.2", "D4.1.3", "D.14.1.2", "D15.4.5", "D16.2.1", "D18.2.3"],
  );
  assert.equal(anomalies.find((entry) => entry.indicatorCode === "D3.4.2").indicatorText.includes("çalışmala- rında"), true);
  assert.equal(anomalies.find((entry) => entry.indicatorCode === "D15.4.5").indicatorText.endsWith("önem ser."), true);
  assert.equal(anomalies.find((entry) => entry.indicatorCode === "D16.2.1").indicatorText.includes("düzelenen"), true);
  assert.equal(anomalies.find((entry) => entry.indicatorCode === "D18.2.3").indicatorText.includes("temiz- liğinde"), true);
  for (const anomaly of anomalies) {
    assert.equal(OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE[anomaly.indicatorCode], undefined);
    assert.match(anomaly.sourceAnomaly, /PDF’de/u);
  }
  assert.equal(Object.keys(OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE).length, 212);
});

test("strict katalog ayrıştırıcısı kaynak zinciri, alan, sıra, sayfa ve anomali statüsünde fail-closed davranır", () => {
  const unexpectedField = cloneCatalog();
  unexpectedField.unapproved = true;
  assert.throws(
    () => parseOfficialPreschoolValueActionCatalog(unexpectedField),
    /beklenmeyen alan/i,
  );

  const fakeSource = cloneCatalog();
  fakeSource.sourceUrl = "https://example.invalid/sahte.pdf";
  assert.throws(
    () => parseOfficialPreschoolValueActionCatalog(fakeSource),
    /kanonik kaynakla/i,
  );

  const missingAction = cloneCatalog();
  missingAction.actions.pop();
  assert.throws(
    () => parseOfficialPreschoolValueActionCatalog(missingAction),
    /57 üst eylem/i,
  );

  const wrongPage = cloneCatalog();
  wrongPage.actions[0].indicators[0].sourcePage = 325;
  assert.throws(
    () => parseOfficialPreschoolValueActionCatalog(wrongPage),
    /üst eylemin kaynak sayfasıyla/i,
  );

  const hiddenAnomaly = cloneCatalog();
  hiddenAnomaly.actions[7].indicators[2].status = "verified";
  delete hiddenAnomaly.actions[7].indicators[2].sourceAnomaly;
  assert.throws(
    () => parseOfficialPreschoolValueActionCatalog(hiddenAnomaly),
    /anomali|kullanıma açık kod/i,
  );
});

test("snapshot doğrulaması kod kadar eylem adı, gösterge metni ve kaynak sayfasını da exact ister", () => {
  const verifiedEntry = OFFICIAL_PRESCHOOL_VALUE_ACTION_BY_INDICATOR_CODE["D4.1.1"];
  const { status: _status, ...validSnapshot } = verifiedEntry;
  assert.doesNotThrow(() => assertOfficialPreschoolValueActionSnapshot(validSnapshot));

  for (const mutation of [
    { actionName: "Uydurma eylem" },
    { indicatorText: "Uydurma gösterge metni." },
    { sourcePage: 326 },
    { indicatorCode: "D4.1.99" },
  ]) {
    assert.throws(
      () => assertOfficialPreschoolValueActionSnapshot({ ...validSnapshot, ...mutation }),
      /Ek-14 kataloğ/i,
    );
  }
  const anomalyEntry = OFFICIAL_PRESCHOOL_VALUE_ACTION_ENTRIES.find(
    (entry) => entry.indicatorCode === "D.3.3.3",
  );
  const { status: _anomalyStatus, sourceAnomaly: _sourceAnomaly, ...anomalySnapshot } = anomalyEntry;
  assert.throws(
    () => assertOfficialPreschoolValueActionSnapshot(anomalySnapshot),
    /kullanıma açık/i,
  );
});
