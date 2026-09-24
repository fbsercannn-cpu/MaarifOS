import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { IndexedDbDataStore } from "../../src/core/index.ts";
import type { LocalDataStore } from "../../src/core/repository/contracts.ts";
import { PreparedTeacherActions } from "../../src/features/teacher-followup/PreparedTeacherActions.tsx";
import type { PreparedTeacherMode } from "../../src/features/teacher-followup/prepared-teacher-actions.ts";
import { FOLLOWUP_CHANGED_EVENT } from "../../src/features/teacher-followup/teacher-followup-service.ts";
import { makePreparedTeacherFixture } from "./prepared-teacher-actions-fixture.mjs";
export async function mountPreparedTeacherActions(options: { disabled?: boolean; failAfterCommit?: boolean; mode?: PreparedTeacherMode } = {}) {
  const source = new IndexedDbDataStore({ databaseName: `prepared-ui-${crypto.randomUUID()}` }), f = await makePreparedTeacherFixture(source);
  let committed = false, disabled = options.disabled ?? false, revision = 0, studentId: string | undefined;
  const opened: unknown[] = [];
  const store: LocalDataStore = { readSnapshot: async () => { if (committed && options.failAfterCommit) throw new Error("Kurgu okuma hatası"); return source.readSnapshot(); }, close() {}, transaction: async (mode, collections, task) => { const result = await source.transaction(mode, collections, task); if (mode === "readwrite") committed = true; return result; } };
  const host = document.createElement("main"); host.style.width = "320px"; host.style.maxWidth = "100%"; document.body.style.margin = "0"; document.body.replaceChildren(host); const root = createRoot(host);
  const render = () => root.render(createElement(PreparedTeacherActions, { store, refreshKey: revision, disabled, studentId, mode: options.mode ?? "all", onChanged: () => { revision++; render(); }, onOpenObservation: (childId, activityId) => opened.push({ childId, activityId }), onOpenPlan: planId => opened.push({ planId }), onPrepareInvitation: (appointmentId, scheduledOn) => opened.push({ appointmentId, scheduledOn }) }));
  const listener = () => { revision++; render(); }; window.addEventListener(FOLLOWUP_CHANGED_EVENT, listener); render();
  return { ...f, source, opened, setDisabled: (value: boolean) => { disabled = value; render(); }, setStudent: (value: string) => { studentId = value; render(); }, close: () => { window.removeEventListener(FOLLOWUP_CHANGED_EVENT, listener); root.unmount(); source.close(); } };
}
