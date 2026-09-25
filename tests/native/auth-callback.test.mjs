import test from "node:test";
import assert from "node:assert/strict";
import { parseNativeAuthCallback } from "../../src/native/auth-callback.ts";

test("native callback accepts only the exact scheme, host and path", () => {
  const handoff = "a".repeat(43);
  assert.deepEqual(parseNativeAuthCallback(`maarifos://auth/callback?handoff=${handoff}`), {
    kind: "connected",
    handoff,
  });
  assert.deepEqual(parseNativeAuthCallback("maarifos://auth/callback?status=cancelled"), {
    kind: "cancelled",
  });
});

test("native callback rejects open redirects, fragments, duplicates and extra data", () => {
  const handoff = "b".repeat(43);
  const unsafe = [
    `https://auth/callback?handoff=${handoff}`,
    `maarifos://evil/callback?handoff=${handoff}`,
    `maarifos://auth/other?handoff=${handoff}`,
    `maarifos://auth/callback?handoff=${handoff}#token`,
    `maarifos://auth/callback?handoff=${handoff}&handoff=${handoff}`,
    `maarifos://auth/callback?handoff=${handoff}&subject=teacher`,
    "maarifos://auth/callback?handoff=short",
    "javascript:alert(1)",
  ];
  for (const candidate of unsafe) assert.equal(parseNativeAuthCallback(candidate), null, candidate);
});
