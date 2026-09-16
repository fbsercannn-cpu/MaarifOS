import { createRoot } from "react-dom/client";
import { ClassroomDevelopmentPanel } from "../src/features/development/DevelopmentPanels.tsx";
import { calendarAccountingFixture } from "./fixtures/calendar-accounting-fixture.mjs";
import type { LocalDataStore } from "../src/core/repository/contracts.ts";
const snapshot = calendarAccountingFixture();
let releaseRead: () => void;
const ready = new Promise<void>(resolve => { releaseRead = resolve; });
const store = { readSnapshot: async () => { await ready; return structuredClone(snapshot); } } as LocalDataStore;
createRoot(document.getElementById("root")!).render(<main style={{ padding: 16, fontFamily: "Arial, sans-serif", boxSizing: "border-box", width: "100%" }}>
  <ClassroomDevelopmentPanel store={store} civilDate="2026-09-18" refreshKey="fixture" onOpenStudent={() => {}} onQuickObservation={() => {}} />
  <button type="button" data-testid="stable-student" style={{ width: "100%", minHeight: 48, marginTop: 16 }}>Kurgu öğrenci profilini aç</button>
  <button type="button" onClick={() => releaseRead()}>Verileri hazırla</button>
</main>);
