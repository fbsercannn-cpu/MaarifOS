import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { WorkPackageCenter } from "../../src/features/work-packages/WorkPackageCenter.tsx";
import { IndexedDbDataStore } from "../../src/core/index.ts";
import type { LocalDataStore } from "../../src/core/repository/contracts.ts";
import { makeDevelopmentReportFixture } from "./development-report-fixture.mjs";
import { persistQuickObservationDraft, finalizeQuickObservationDraft } from "../../src/features/evidence/quick-observation.ts";
import { FOLLOWUP_CHANGED_EVENT } from "../../src/features/teacher-followup/teacher-followup-service.ts";

export async function mountWorkPackages(options: { disabled?: boolean; failRefreshAfterCommit?: boolean; failInitialRead?: boolean; deferredRefreshMs?: number } = {}) {
  const source = new IndexedDbDataStore({ databaseName: `work-package-ui-${crypto.randomUUID()}` });
  const fx = await makeDevelopmentReportFixture(source);
  const now = new Date("2026-09-10T09:00:00.000Z"), observationIds: string[] = [];
  for (const rawText of ["Kurgu çocuk çizdiği resmi arkadaşına anlattı.", "Kurgu çocuk ritim çalgısıyla yavaş ve hızlı tempoya göre vuruşlarını değiştirdi."]) {
    const observationId = crypto.randomUUID();
    await persistQuickObservationDraft(source, { studentId: fx.input.studentId, planId: fx.context.plan.id, activityId: fx.context.activity.id, rawText, context: "Kurgu test", childQuote: "", observationType: "quick-note", categoryIds: [], now });
    await finalizeQuickObservationDraft(source, { studentId: fx.input.studentId, observationId, now }); observationIds.push(observationId);
  }
  let committed = false, failRead = options.failInitialRead ?? false;
  const store: LocalDataStore = {
    readSnapshot: async () => {
      if (failRead || (committed && options.failRefreshAfterCommit)) throw new Error("Kurgu okuma hatası");
      const value = await source.readSnapshot();
      if (options.deferredRefreshMs) await new Promise(resolve => setTimeout(resolve, options.deferredRefreshMs));
      return value;
    },
    transaction: async (mode, collections, task) => { const value = await source.transaction(mode, collections, task); if (mode === "readwrite") committed = true; return value; },
    close: () => source.close(),
  };
  const host = document.createElement("main"); host.style.maxWidth = "320px"; document.body.replaceChildren(host);
  const root = createRoot(host);
  let revision = 0, disabled = options.disabled ?? false, observationId = observationIds[0];
  const render = () => root.render(createElement(WorkPackageCenter, { store, refreshKey: revision, disabled, observationId, studentId: fx.input.studentId, mode: "observations", onChanged: () => { revision++; render(); } }));
  const listener = () => { revision++; render(); }; window.addEventListener(FOLLOWUP_CHANGED_EVENT, listener);
  render();
  return {
    source, store, observationIds, studentId: fx.input.studentId,
    setDisabled: (value: boolean) => { disabled = value; render(); },
    setObservation: (value: string) => { observationId = value; render(); },
    setReadFailure: (value: boolean) => { failRead = value; revision++; render(); },
    close: () => { window.removeEventListener(FOLLOWUP_CHANGED_EVENT, listener); root.unmount(); source.close(); },
  };
}
