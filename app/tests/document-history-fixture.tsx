import * as previewModel from "../src/features/documents/pdf-preview-model.ts";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { IndexedDbDataStore } from "../src/core/repository/indexed-db.ts";
import { PdfPreviewHost } from "../src/features/documents/PdfPreviewHost.tsx";
import { DocumentHistoryPanel } from "../src/features/documents/DocumentHistoryPanel.tsx";
import { KeyboardProvider, MobileDeviceProvider } from "../src/mobile";
import { classRosterFixture } from "./fixtures/class-roster-fixture.mjs";
import { COLLECTION_NAMES } from "../src/core/domain/model.ts";
const input = classRosterFixture(2);
input.snapshot.academicYears[0].startDate = "2026-09-07";
input.snapshot.academicYears[0].endDate = "2027-06-30";
const store = new IndexedDbDataStore();
if (!(await store.readSnapshot()).classrooms.length) await store.transaction("readwrite", COLLECTION_NAMES, async tx => { for (const name of COLLECTION_NAMES) await tx.putMany(name, input.snapshot[name]); });
function Fixture() {
  const [revision, setRevision] = useState(0);
  Object.assign(window, { historyTest: { store, input, previewModel, bump: () => setRevision(v => v + 1) } });
  return <><PdfPreviewHost sourceRevision={revision} historyStore={store} historyScope={input.scope} /><DocumentHistoryPanel store={store} scope={input.scope} refreshKey={revision} /></>;
}
createRoot(document.getElementById("root")!).render(<MobileDeviceProvider><KeyboardProvider native><Fixture /></KeyboardProvider></MobileDeviceProvider>);
