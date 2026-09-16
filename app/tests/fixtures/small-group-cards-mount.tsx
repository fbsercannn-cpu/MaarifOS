import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { IndexedDbDataStore } from "../../src/core/index.ts";
import { KeyboardProvider, MobileDeviceProvider } from "../../src/mobile";
import { SmallGroupCardsPanel } from "../../src/features/small-group-cards/SmallGroupCardsPanel.tsx";
import { seedSmallGroupCardsFixture } from "./small-group-cards-fixture.mjs";

export async function mountSmallGroupCardsPanel() {
  const store = new IndexedDbDataStore({ databaseName: `small-group-ui-${crypto.randomUUID()}` });
  const fixture = await seedSmallGroupCardsFixture(store, { planCount: 1 });
  const before = await store.readSnapshot();
  const host = document.createElement("main");
  host.style.width = "320px";
  host.style.maxWidth = "100%";
  document.body.style.margin = "0";
  document.body.replaceChildren(host);
  const root = createRoot(host);
  const openedPlanIds: string[] = [];
  let changeCount = 0;

  root.render(createElement(
    MobileDeviceProvider,
    {},
    createElement(
      KeyboardProvider,
      { native: true },
      createElement(SmallGroupCardsPanel, {
        store,
        civilDate: fixture.civilDate,
        onChanged: () => { changeCount += 1; },
        onOpenPlan: (planId: string) => { openedPlanIds.push(planId); },
      }),
    ),
  ));

  return {
    ...fixture,
    store,
    beforeCounts: {
      plans: before.plans.length,
      activities: before.activities.length,
      observations: before.observations.length,
    },
    openedPlanIds,
    get changeCount() { return changeCount; },
    close: () => { root.unmount(); store.close(); },
  };
}
