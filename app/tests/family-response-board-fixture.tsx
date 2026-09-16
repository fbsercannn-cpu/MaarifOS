import React,{useState} from "react";import {createRoot} from "react-dom/client";
import {IndexedDbDataStore} from "../src/core/repository/indexed-db.ts";
import {familyResponseFixture} from "./fixtures/family-response-fixture.mjs";
import {FamilyResponseBoardPanel} from "../src/features/family-response-board/FamilyResponseBoardPanel.tsx";
import {MobileDeviceProvider,KeyboardProvider} from "../src/mobile";
const store=new IndexedDbDataStore({databaseName:"family-response-board-test"});if(!(await store.readSnapshot()).students.length)await familyResponseFixture(store);
if(new URLSearchParams(location.search).has("empty")){await store.transaction("readwrite",["settings"],async tx=>{const all=await tx.getAll("settings");await tx.clear("settings");await tx.putMany("settings",all.filter(r=>r.settingType!=="home-game-card-v1"));});}
let reads=0;const originalRead=store.readSnapshot.bind(store);store.readSnapshot=()=>{reads++;return originalRead();};
function Fixture(){const [revision,setRevision]=useState(0),[disabled,setDisabled]=useState(false),[destination,setDestination]=useState("");Object.assign(window,{familyResponseTest:{store,setDisabled,readCount:()=>reads}});return <><FamilyResponseBoardPanel store={store} refreshKey={revision} disabled={disabled} onChanged={()=>setRevision(v=>v+1)} onOpenPlan={id=>setDestination(`plan:${id}`)} onOpenMeeting={id=>setDestination(`meeting:${id}`)} onPrepareCard={()=>setDestination("prepare-card")} onOpenStudent={id=>setDestination(`student:${id}`)}/><p aria-label="Açılan sonuç">{destination}</p></>}
createRoot(document.getElementById("root")!).render(<MobileDeviceProvider><KeyboardProvider native><Fixture/></KeyboardProvider></MobileDeviceProvider>);
