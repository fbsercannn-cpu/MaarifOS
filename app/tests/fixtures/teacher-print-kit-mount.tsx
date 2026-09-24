import {createElement,Fragment} from "react";
import {createRoot} from "react-dom/client";
import {IndexedDbDataStore} from "../../src/core/index.ts";
import {MobileDeviceProvider,KeyboardProvider} from "../../src/mobile";
import {PdfPreviewHost} from "../../src/features/documents/PdfPreviewHost.tsx";
import {TeacherPrintKit} from "../../src/features/teacher-print-kit/TeacherPrintKit.tsx";
import {makeTeacherPrintKitFixture} from "./teacher-print-kit-fixture.mjs";
export async function mountTeacherPrintKit(){const store=new IndexedDbDataStore({databaseName:`kit-ui-${crypto.randomUUID()}`}),f=await makeTeacherPrintKitFixture(store);const host=document.createElement("main");host.style.width="320px";host.style.maxWidth="100%";document.body.style.margin="0";document.body.replaceChildren(host);const root=createRoot(host),opened:unknown[]=[];
  root.render(createElement(MobileDeviceProvider,{},createElement(KeyboardProvider,{native:true},createElement(Fragment,{},createElement(TeacherPrintKit,{store,onOpenPickup:(id,day)=>opened.push({id,day})}),createElement(PdfPreviewHost,{sourceRevision:0,historyStore:store,historyScope:f.scope})))));
  return{...f,store,opened,close:()=>{root.unmount();store.close();}};
}
