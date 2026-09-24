import {createElement,useState} from "react";
import {createRoot} from "react-dom/client";
import {IndexedDbDataStore} from "../../src/core/index.ts";
import {MobileDeviceProvider,KeyboardProvider} from "../../src/mobile";
import {PdfPreviewHost} from "../../src/features/documents/PdfPreviewHost.tsx";
import {MaterialBoxLabelsPanel} from "../../src/features/material-box-labels/MaterialBoxLabelsPanel.tsx";
import {loadMaterialBoxModel} from "../../src/features/material-box-labels/material-box-service.ts";
import {makeMaterialBoxFixture} from "./material-box-fixture.mjs";
export async function mountMaterialBoxes(){const store=new IndexedDbDataStore({databaseName:`box-ui-${crypto.randomUUID()}`}),f=await makeMaterialBoxFixture(store),opened:unknown[]=[];const host=document.createElement("main");host.style.width="320px";host.style.maxWidth="100%";document.body.style.margin="0";document.body.replaceChildren(host);const root=createRoot(host);
  function App(){const [revision,setRevision]=useState(0);return <MobileDeviceProvider><KeyboardProvider native><MaterialBoxLabelsPanel store={store} refreshKey={revision} onChanged={()=>setRevision(r=>r+1)} onOpenPlan={id=>opened.push(id)} onOpenCenters={()=>opened.push("centers")} onOpenPlanning={day=>opened.push(day)}/><PdfPreviewHost historyStore={store} historyScope={f.scope} sourceRevision={revision}/></KeyboardProvider></MobileDeviceProvider>;}
  root.render(createElement(App));return{...f,store,opened,readModel:()=>loadMaterialBoxModel(store,f.day),close:()=>{root.unmount();store.close();}};
}
