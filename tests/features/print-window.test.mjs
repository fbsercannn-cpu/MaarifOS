import assert from "node:assert/strict";
import test from "node:test";

import { openHtmlPrintWindow } from "../../src/features/printing/open-html-print-window.ts";

function createEnvironment({ blocked = false } = {}) {
  const handlers = new Map();
  const timers = new Map();
  const calls = {
    created: [],
    revoked: [],
    opened: [],
    focused: 0,
    printed: 0,
    cleared: [],
  };
  let nextTimer = 1;
  const popup = {
    opener: {},
    addEventListener(type, handler) {
      handlers.set(type, handler);
    },
    focus() {
      calls.focused += 1;
    },
    print() {
      calls.printed += 1;
    },
  };
  const environment = {
    createBlobUrl(html, mimeType) {
      calls.created.push({ html, mimeType });
      return "blob:maarifos-print";
    },
    revokeBlobUrl(url) {
      calls.revoked.push(url);
    },
    open(url, target, features) {
      calls.opened.push({ url, target, features });
      return blocked ? null : popup;
    },
    setTimer(handler, delayMs) {
      const id = nextTimer;
      nextTimer += 1;
      timers.set(id, { handler, delayMs });
      return id;
    },
    clearTimer(id) {
      calls.cleared.push(id);
      timers.delete(id);
    },
  };
  return { environment, popup, handlers, timers, calls };
}

test("ortak baskı yardımcısı açılır pencere engellenirse blob'u temizler", () => {
  const fixture = createEnvironment({ blocked: true });
  const result = openHtmlPrintWindow(
    { html: "<!doctype html><title>Test</title>", title: "Test" },
    fixture.environment,
  );

  assert.deepEqual(result, { opened: false, reason: "popup-blocked" });
  assert.deepEqual(fixture.calls.revoked, ["blob:maarifos-print"]);
  assert.equal(fixture.calls.printed, 0);
});

test("ortak baskı yardımcısı yüklenen yerel HTML için yazdırmayı tam bir kez açar", () => {
  const fixture = createEnvironment();
  const result = openHtmlPrintWindow(
    { html: "<!doctype html><title>Etkinlik</title>", title: "Etkinlik" },
    fixture.environment,
  );

  assert.deepEqual(result, { opened: true });
  assert.equal(fixture.popup.opener, null);
  assert.equal(fixture.calls.created[0]?.mimeType, "text/html;charset=utf-8");
  fixture.handlers.get("load")?.();
  fixture.handlers.get("load")?.();
  assert.equal(fixture.calls.focused, 1);
  assert.equal(fixture.calls.printed, 1);

  fixture.handlers.get("afterprint")?.();
  assert.deepEqual(fixture.calls.revoked, ["blob:maarifos-print"]);
});

test("yükleme olayı gelmezse güvenli zaman aşımı baskı akışını yine başlatır", () => {
  const fixture = createEnvironment();
  openHtmlPrintWindow(
    { html: "<!doctype html><title>Etkinlik</title>", title: "Etkinlik" },
    fixture.environment,
  );
  const fallback = [...fixture.timers.values()].find(({ delayMs }) => delayMs === 2_000);
  assert.ok(fallback);
  fallback.handler();
  assert.equal(fixture.calls.printed, 1);
});
