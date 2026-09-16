import assert from "node:assert/strict";
import test from "node:test";

import { RUNTIME_SCRIPT_SEQUENCE } from "../scripts/run-runtime-suite.mjs";

test("runtime kalite kapısı iç içe npm zinciri yerine bütün yaprak testleri tekil sırada çalıştırır", () => {
  assert.equal(RUNTIME_SCRIPT_SEQUENCE.length, 35);
  assert.equal(new Set(RUNTIME_SCRIPT_SEQUENCE).size, RUNTIME_SCRIPT_SEQUENCE.length);
  assert.ok(
    RUNTIME_SCRIPT_SEQUENCE.every(
      (scriptName) =>
        scriptName.startsWith("test:runtime:") &&
        ![
          "test:runtime:core",
          "test:runtime:flow-a",
          "test:runtime:flow-b",
          "test:runtime:ui",
          "test:runtime:pwa-ui",
        ].includes(scriptName),
    ),
  );
  assert.ok(
    RUNTIME_SCRIPT_SEQUENCE.includes(
      "test:runtime:ui:workflows:plan-creation-readiness",
    ),
  );
  assert.ok(
    RUNTIME_SCRIPT_SEQUENCE.includes(
      "test:runtime:ui:workflows:development-observation",
    ),
  );
  assert.ok(
    RUNTIME_SCRIPT_SEQUENCE.includes(
      "test:runtime:ui:workflows:development-workspace",
    ),
  );
  assert.ok(
    RUNTIME_SCRIPT_SEQUENCE.includes(
      "test:runtime:ui:workflows:tymm-library",
    ),
  );
  assert.ok(
    RUNTIME_SCRIPT_SEQUENCE.includes("test:runtime:ui:teacher:cycles"),
  );
  assert.ok(
    RUNTIME_SCRIPT_SEQUENCE.includes("test:runtime:pwa-ui:portfolio"),
  );
});
