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
  ]);
  assert.deepEqual(
    APP_ROUTES.map(({ id }) => id),
    visiblePrimaryNavigation()
      .filter(({ id }) => id === "today" || id === "classroom")
      .map(({ id }) => id),
  );
  assert.ok(Object.isFrozen(APP_ROUTES));
  assert.ok(APP_ROUTES.every(Object.isFrozen));
});

test("pathname çözümleme reload ve son slash için kararlıdır", () => {
  assert.equal(routeFromPathname("/").id, "today");
  assert.equal(routeFromPathname("/classroom").id, "classroom");
  assert.equal(routeFromPathname("/classroom/").id, "classroom");
  assert.equal(routeFromPathname("/tanimsiz").id, "today");
  assert.equal(routeById("classroom").path, "/classroom");
});
