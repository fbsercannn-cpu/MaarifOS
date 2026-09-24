import React, {useState} from "react";
import {createRoot} from "react-dom/client";
import {MonthEndPackagePanel} from "../src/features/documents/MonthEndPackagePanel.tsx";
import {IndexedDbDataStore} from "../src/core/repository/indexed-db.ts";
import {COLLECTION_NAMES} from "../src/core/domain/model.ts";
import {createTeacherOwnedPlanGraph} from "../src/features/planning/teacher-owned-plan-service.ts";
import {activeStore,validDraft} from "./fixtures/month-package-fixture.mjs";
const store=new IndexedDbDataStore();
let sourceReads=0;
const readSnapshot=store.readSnapshot.bind(store);
store.readSnapshot=async()=>{const result=await readSnapshot();sourceReads+=1;return result;};
Object.assign(window,{monthPackageTest:{get sourceReads(){return sourceReads;}}});
const initial=await activeStore().readSnapshot();
initial.classrooms[0].schoolName="Kurgu Anaokulu"; initial.classrooms[0].teacherName="Kurgu Öğretmen";
await store.transaction("readwrite",COLLECTION_NAMES,async tx=>{for(const name of COLLECTION_NAMES){await tx.clear(name);await tx.putMany(name,initial[name]);}});
await createTeacherOwnedPlanGraph(store,validDraft());
function Fixture(){const [destination,setDestination]=useState("");const [visible,setVisible]=useState(true);const [disabled,setDisabled]=useState(false);return <><button type="button" onClick={()=>setVisible(false)}>Kurgu paneli kapat</button><button type="button" onClick={()=>setDisabled(true)}>Kurgu çıktıyı engelle</button>{visible&&<MonthEndPackagePanel store={store} refreshKey="test" disabled={disabled} onComplete={(kind,month)=>setDestination(`${kind}:${month}`)}/>}<p role="status" aria-label="Açılan bölüm">{destination}</p></>;}
createRoot(document.getElementById("root")!).render(<Fixture/>);
