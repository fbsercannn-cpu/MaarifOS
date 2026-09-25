import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { PdfPreviewHost } from "../src/features/documents/PdfPreviewHost.tsx";
import { KeyboardProvider, MobileDeviceProvider } from "../src/mobile";
function Fixture() { const [revision, setRevision] = useState(0); return <><button onClick={() => setRevision(revision + 1)}>Kurgu kaynağı değiştir</button><PdfPreviewHost sourceRevision={revision} /></>; }
createRoot(document.getElementById("root")!).render(<MobileDeviceProvider><KeyboardProvider native><Fixture /></KeyboardProvider></MobileDeviceProvider>);
