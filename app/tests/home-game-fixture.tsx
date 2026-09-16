import React,{useState} from "react";import {createRoot} from "react-dom/client";
import {IndexedDbDataStore} from "../src/core/repository/indexed-db.ts";
import {HomeGameCardsPanel} from "../src/features/home-game-cards/HomeGameCardsPanel.tsx";
import {PdfPreviewHost} from "../src/features/documents/PdfPreviewHost.tsx";
import {MobileDeviceProvider,KeyboardProvider} from "../src/mobile";
import {homeGameFixture} from "./fixtures/home-game-fixture.mjs";
const store=new IndexedDbDataStore({databaseName:"home-game-ui-test"});if(!(await store.readSnapshot()).students.length)await homeGameFixture(store);
function Fixture(){const [revision,setRevision]=useState(0);Object.assign(window,{homeGameTest:{store,bump:()=>setRevision(v=>v+1)}});return <><HomeGameCardsPanel store={store} onChanged={()=>setRevision(v=>v+1)} refreshKey={revision}/><PdfPreviewHost sourceRevision={revision} historyStore={store} historyScope={{academicYearId:"00000000-0000-4000-8000-000000007001",classroomId:"00000000-0000-4000-8000-000000007002"}}/></>;}
createRoot(document.getElementById("root")!).render(<MobileDeviceProvider><KeyboardProvider native><Fixture/></KeyboardProvider></MobileDeviceProvider>);

