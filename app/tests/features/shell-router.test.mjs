import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_ROUTES,
  routeById,
  routeFromPathname,
} from "../../src/shell/route-contract.ts";
import { visiblePrimaryNavigation } from "../../src/core/capabilities/alpha-capabilities.ts";

test("route sözleşmesi Hediye Alpha navigasyonundan yalnız ekranları üretir", () => {
  assert.deepEqual(APP_ROUTES, [
    { id: "today", path: "/", label: "Bugün" },
    { id: "classroom", path: "/classroom", label: "Sınıfım" },
    { id: "activities", path: "/activities", label: "Etkinlikler" },
    { id: "plans", path: "/plans", label: "Planlar" },
    { id: "documents", path: "/documents", label: "Çıktılar" },
  ]);
  assert.deepEqual(
    APP_ROUTES.map(({ id }) => id),
    visiblePrimaryNavigation().map(({ id }) =>
      id === "capture" ? "activities" : id,
    ),
  );
  assert.ok(Object.isFrozen(APP_ROUTES));
  assert.ok(APP_ROUTES.every(Object.isFrozen));
});

test("pathname çözümleme reload ve son slash için kararlıdır", () => {
  assert.equal(routeFromPathname("/").id, "today");
  assert.equal(routeFromPathname("/classroom").id, "classroom");
  assert.equal(routeFromPathname("/classroom/").id, "classroom");
  assert.equal(routeFromPathname("/activities").id, "activities");
  assert.equal(routeFromPathname("/activities/").id, "activities");
  assert.equal(routeFromPathname("/plans").id, "plans");
  assert.equal(routeFromPathname("/plans/").id, "plans");
  assert.equal(routeFromPathname("/documents").id, "documents");
  assert.equal(routeFromPathname("/documents/").id, "documents");
  assert.equal(routeFromPathname("/tanimsiz").id, "today");
  assert.equal(routeById("classroom").path, "/classroom");
  assert.equal(routeById("activities").path, "/activities");
  assert.equal(routeById("plans").path, "/plans");
  assert.equal(routeById("documents").path, "/documents");
});
