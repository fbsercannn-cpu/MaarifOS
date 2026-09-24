import { Fragment, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { IndexedDbDataStore } from "../../src/core/index.ts";
import { DayExitPackagePanel } from "../../src/features/day-exit-package/DayExitPackagePanel.tsx";
import { PdfPreviewHost } from "../../src/features/documents/PdfPreviewHost.tsx";
import { KeyboardProvider, MobileDeviceProvider } from "../../src/mobile";
import { seedDayExitPackageFixture } from "./day-exit-package-fixture.mjs";

export async function mountDayExitPackage() {
  const store = new IndexedDbDataStore({ databaseName: `day-exit-ui-${crypto.randomUUID()}` });
  const fixture = await seedDayExitPackageFixture(store);
  const before = await store.readSnapshot();
  const host = document.createElement("main");
  host.style.width = "320px";
  host.style.maxWidth = "100%";
  document.body.style.margin = "0";
  document.body.replaceChildren(host);
  const root = createRoot(host);
  const openedPickups: { studentId: string; civilDate: string }[] = [];
  const openedPlans: string[] = [];
  const openedPlanDates: string[] = [];
  let attendanceOpenCount = 0;
  let changeCount = 0;

  function App() {
    const [revision, setRevision] = useState(0);
    return <MobileDeviceProvider><KeyboardProvider native><Fragment>
      <DayExitPackagePanel
        store={store}
        civilDate={fixture.civilDate}
        refreshKey={revision}
        onChanged={() => { changeCount += 1; setRevision((value) => value + 1); }}
        onOpenAttendance={() => { attendanceOpenCount += 1; }}
        onOpenPickup={(studentId, civilDate) => { openedPickups.push({ studentId, civilDate }); }}
        onOpenPlan={(planId) => { openedPlans.push(planId); }}
        onPlanDate={(civilDate) => { openedPlanDates.push(civilDate); }}
      />
      <PdfPreviewHost historyStore={store} historyScope={fixture.scope} sourceRevision={revision} />
    </Fragment></KeyboardProvider></MobileDeviceProvider>;
  }

  root.render(createElement(App));
  return {
    ...fixture,
    store,
    beforeCounts: {
      attendanceRecords: before.attendanceRecords.length,
      observations: before.observations.length,
      plans: before.plans.length,
      activities: before.activities.length,
    },
    openedPickups,
    openedPlans,
    openedPlanDates,
    get attendanceOpenCount() { return attendanceOpenCount; },
    get changeCount() { return changeCount; },
    close: () => { root.unmount(); store.close(); },
  };
}
