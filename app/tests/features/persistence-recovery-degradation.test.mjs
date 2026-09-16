import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const prototypeSource = await readFile(
  new URL("../../src/Prototype.tsx", import.meta.url),
  "utf8",
);

test("bozuk cihaz-içi kurtarma listesi ana öğretmen kayıtlarını kilitlemez ve kayıtları silmez", () => {
  assert.match(
    prototypeSource,
    /service\.listRecoverySnapshots\(\)[\s\S]*warning:\s*"Önceki cihaz-içi kurtarma noktaları doğrulanamadı\./,
  );
  assert.match(
    prototypeSource,
    /setRecoverySnapshots\(recovery\.snapshots\);[\s\S]*setRecoverySnapshotWarning\(recovery\.warning\);/,
  );
  assert.doesNotMatch(
    prototypeSource,
    /runHydrationStep\(\s*"recovery"/,
  );
  assert.match(
    prototypeSource,
    /kurtarma noktaları silinmedi ve geri yükleme için inceleme gerekiyor/,
  );
});

test("kritik veri yükleyicileri kişisel veri içermeyen sabit destek kodlarıyla fail-closed kalır", () => {
  for (const code of [
    "HYD-DASH",
    "HYD-TODAY",
    "HYD-EVIDENCE",
    "HYD-CALENDAR",
    "HYD-SCHEDULE",
    "HYD-CYCLE",
    "HYD-CLOSURE",
    "HYD-LOCK",
  ]) {
    assert.match(prototypeSource, new RegExp(code));
  }
  assert.match(prototypeSource, /describeHydrationFailure\(reason\)/);
  assert.match(prototypeSource, /markPersistenceFailure\(diagnostic\.detail\)/);
});
