import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { DeskDocumentCenter } from "../src/features/documents/DeskDocumentCenter.tsx";
import { PdfPreviewHost } from "../src/features/documents/PdfPreviewHost.tsx";
import { KeyboardProvider, MobileDeviceProvider } from "../src/mobile";
import { IndexedDbDataStore } from "../src/core/repository/indexed-db.ts";
import { makeDevelopmentReportFixture } from "./fixtures/development-report-fixture.mjs";
const store = new IndexedDbDataStore();
await makeDevelopmentReportFixture(store);
const snapshot = await store.readSnapshot();
const classroom = snapshot.classrooms[0]!;
await store.transaction("readwrite", ["classrooms"], async tx => tx.putMany("classrooms", [{ ...classroom, schedule: { kind: "morning", startTime: "08:30", endTime: "12:30", timeZone: "Europe/Istanbul" } }]));
function Fixture() {
  const [revision, setRevision] = useState(0), [destination, setDestination] = useState("");
  Object.assign(window, { deskTest: { store, bump: () => setRevision(v => v + 1) } });
  return <><DeskDocumentCenter store={store} refreshKey={revision} disabled={false} onChanged={() => setRevision(v => v + 1)} onOpenPlan={setDestination} onOpenDate={setDestination} onPlanDate={setDestination} /><PdfPreviewHost sourceRevision={revision} /><p aria-label="Açılan kayıt">{destination}</p></>;
}
createRoot(document.getElementById("root")!).render(<MobileDeviceProvider><KeyboardProvider native><Fixture /></KeyboardProvider></MobileDeviceProvider>);
