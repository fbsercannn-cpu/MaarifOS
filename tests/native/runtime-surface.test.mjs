import test from "node:test";
import assert from "node:assert/strict";
import { resolveAppSurface } from "../../src/native/runtime.ts";

const location = (overrides = {}) => ({
  hostname: "localhost",
  pathname: "/",
  search: "",
  hash: "",
  ...overrides,
});

test("native package always opens the teacher workspace", () => {
  assert.equal(resolveAppSurface(location(), true), "app");
  assert.equal(
    resolveAppSurface(location({ search: "?view=landing", hash: "#site" }), true),
    "app",
  );
});

test("official domains stay promotion-only despite app-like URL parameters", () => {
  for (const hostname of [
    "maarifos.com",
    "www.maarifos.com",
    "maarifos.net",
    "www.maarifos.net",
  ]) {
    assert.equal(
      resolveAppSurface(location({ hostname, search: "?view=app&native=1", hash: "#app" }), false),
      "landing",
    );
  }
});

test("local browser behavior preserves explicit test and application routes", () => {
  assert.equal(resolveAppSurface(location(), false), "landing");
  assert.equal(resolveAppSurface(location({ search: "?native=1" }), false), "app");
  assert.equal(resolveAppSurface(location({ pathname: "/gunum/bugun" }), false), "app");
  assert.equal(resolveAppSurface(location(), false, true), "app");
});
