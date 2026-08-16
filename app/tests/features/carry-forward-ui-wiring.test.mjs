import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const prototypeSource = await readFile(
  new URL("../../src/Prototype.tsx", import.meta.url),
  "utf8",
);

function sourceBetween(startMarker, endMarker) {
  const start = prototypeSource.indexOf(startMarker);
  const end = prototypeSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `${startMarker} kaynakta bulunmalı`);
  assert.notEqual(end, -1, `${endMarker} kaynakta bulunmalı`);
  return prototypeSource.slice(start, end);
}

test("Today taşınan iş geçişini güvenli yazma kuyruğuna ve güncel read-model'e bağlar", () => {
  const handler = sourceBetween(
    "const transitionDayCarryForward = async",
    "const completeReleaseNotice =",
  );
  const enqueueIndex = handler.indexOf("await enqueuePersistence(");
  const transitionIndex = handler.indexOf("transitionTeacherDayCarryForward(store, input)");
  const refreshIndex = handler.indexOf("loadTeacherDayClosureWorkspace(store, { civilDate })");

  assert.ok(enqueueIndex >= 0, "geçiş kalıcı yazma kuyruğuna girmeli");
  assert.ok(transitionIndex > enqueueIndex, "domain geçişi kuyruk içinde çalışmalı");
  assert.ok(refreshIndex > transitionIndex, "commit sonrasında read-model yenilenmeli");
  assert.match(handler, /educationalWrite: \{\}/);
  assert.match(handler, /cihazda kaydedildi; güncel liste yenilenemedi/);
  assert.match(
    prototypeSource,
    /onTransitionCarryForward: transitionDayCarryForward/,
  );
});
