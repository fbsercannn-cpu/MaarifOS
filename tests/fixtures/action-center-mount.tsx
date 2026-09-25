import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ActionCenter } from "../../src/features/action-center/ActionCenter.tsx";
import { IndexedDbDataStore } from "../../src/core/index.ts";
import type { LocalDataStore } from "../../src/core/repository/contracts.ts";
import { makeDevelopmentReportFixture } from "./development-report-fixture.mjs";
import { persistQuickObservationDraft, finalizeQuickObservationDraft } from "../../src/features/evidence/quick-observation.ts";
import { confirmObservationCurriculumLink } from "../../src/features/evidence/evidence-flow.ts";
import { createTeacherOwnedPlanGraph } from "../../src/features/planning/teacher-owned-plan-service.ts";
import { FOLLOWUP_CHANGED_EVENT } from "../../src/features/teacher-followup/teacher-followup-service.ts";
import { KeyboardProvider, MobileDeviceProvider } from "../../src/mobile/index.ts";

export async function mountActionCenter(options: { disabled?: boolean; failRefreshAfterCommit?: boolean; preparation?: boolean; outcome?: boolean; refreshOnFollowup?: boolean; deferredRefreshMs?: number } = {}) {
  const source = new IndexedDbDataStore({ databaseName: `action-ui-${crypto.randomUUID()}` });
  const fx = await makeDevelopmentReportFixture(source);
  const observationId = crypto.randomUUID();
  const now = new Date("2026-09-10T09:00:00.000Z");
  await persistQuickObservationDraft(source, { studentId: fx.input.studentId, planId: fx.context.plan.id, activityId: fx.context.activity.id, rawText: "Kurgu çocuk çizdiği resmi arkadaşına anlattı.", context: "Serbest zaman", childQuote: "", observationType: "quick-note", categoryIds: [], now });
  await finalizeQuickObservationDraft(source, { studentId: fx.input.studentId, observationId, now });
  if (options.outcome) {
    await confirmObservationCurriculumLink(source, {
      observationId,
      framework: "tymm",
      catalogId: "tymm-legacy-partial",
      sourceVersion: "2024",
      referenceCode: "EÇE-KURGU-01",
      referenceTitle: "Duygu ve düşüncelerini sözlü olarak ifade eder",
      referenceOrigin: "teacher-declared",
      officialCatalogVerified: false,
      now: new Date("2026-09-10T09:00:01.000Z"),
    });
  }
  if (options.preparation) await createTeacherOwnedPlanGraph(source, { title: "Kurgu yıl", periodStart: "2026-09-01", periodEnd: "2027-06-30", teacherContent: { narrative: "Yıl" }, months: [{ title: "Kurgu ay", monthKey: "2026-09", periodStart: "2026-09-01", periodEnd: "2026-09-30", teacherContent: { narrative: "Ay" }, weeks: [
    { title: "Kurgu kart oyunu", weekKey: "2026-W37", periodStart: "2026-09-07", periodEnd: "2026-09-11", teacherContent: { narrative: "Kartları eşleştirme", materials: ["Kurgu kartlar"] } },
    { title: "Kurgu boya oyunu", weekKey: "2026-W38", periodStart: "2026-09-14", periodEnd: "2026-09-18", teacherContent: { narrative: "Renkleri deneme", materials: ["Kurgu boyalar"] } },
  ] }], now });
  let committed = false, refreshCount = 0;
  const store: LocalDataStore = {
    readSnapshot: async () => { if (committed && options.failRefreshAfterCommit) throw new Error("Kurgu okuma hatası"); const value = await source.readSnapshot(); if (committed && options.deferredRefreshMs) await new Promise(resolve => setTimeout(resolve, options.deferredRefreshMs)); return value; },
    transaction: async (mode, collections, task) => { const value = await source.transaction(mode, collections, task); if (mode === "readwrite") committed = true; return value; },
    close: () => source.close(),
  };
  const host = document.createElement("main");
  host.style.maxWidth = "380px"; document.body.replaceChildren(host);
  const root = createRoot(host);
  let revision = 0, disabledState = options.disabled ?? false;
  const render = (disabled: boolean) => { disabledState = disabled; root.render(createElement(MobileDeviceProvider, {}, createElement(KeyboardProvider, { native: true }, createElement(ActionCenter, { store, refreshKey: revision, disabled, studentId: options.preparation ? undefined : fx.input.studentId, observationId: options.preparation ? undefined : observationId, onChanged: () => { refreshCount++; if (options.refreshOnFollowup) { revision++; render(disabledState); } } })))); };
  const onFollowup = () => { if (options.refreshOnFollowup) { revision++; render(disabledState); } };
  window.addEventListener(FOLLOWUP_CHANGED_EVENT, onFollowup);
  render(options.disabled ?? false);
  return { source, observationId, studentId: fx.input.studentId, render, refreshCount: () => refreshCount, close: () => { window.removeEventListener(FOLLOWUP_CHANGED_EVENT, onFollowup); root.unmount(); source.close(); } };
}
