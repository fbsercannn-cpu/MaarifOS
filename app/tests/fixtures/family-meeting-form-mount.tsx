import { createElement, Fragment } from "react";
import { createRoot } from "react-dom/client";
import { IndexedDbDataStore } from "../../src/core/index.ts";
import { MobileDeviceProvider, KeyboardProvider } from "../../src/mobile";
import { FamilyMeetingFormPanel } from "../../src/features/family-engagement/FamilyMeetingFormPanel.tsx";
import { makeFamilyMeetingFixture } from "./family-meeting-form-fixture.mjs";
import type { LocalDataStore } from "../../src/core/repository/contracts.ts";
import { installPdfPreviewPresenter } from "../../src/features/documents/pdf-preview-model.ts";
import { PdfPreviewHost } from "../../src/features/documents/PdfPreviewHost.tsx";
export async function mountFamilyMeetingForm(options: { realPreview?: boolean } = {}) {
  const store=new IndexedDbDataStore({databaseName:`meeting-ui-${crypto.randomUUID()}`}),f=await makeFamilyMeetingFixture(store);
  const host=document.createElement("main");host.style.width="320px";host.style.maxWidth="100%";document.body.style.margin="0";document.body.replaceChildren(host);const root=createRoot(host);
  let refresh=0,disabled=false,hold=false,release:(()=>void)|null=null;const previews:unknown[]=[];
  const stopPreview=options.realPreview ? ()=>{} : installPdfPreviewPresenter(request=>{previews.push(request.title);request.complete("cancelled");});
  const proxy:LocalDataStore={readSnapshot:async()=>{const data=await store.readSnapshot();if(hold){hold=false;await new Promise<void>(resolve=>{release=resolve;});}return data;},close(){},transaction:(mode,names,task)=>store.transaction(mode,names,task)};
  const render=()=>root.render(createElement(MobileDeviceProvider,{},createElement(KeyboardProvider,{native:true},createElement(Fragment,{},createElement(FamilyMeetingFormPanel,{store:proxy,appointmentId:f.appointmentId,refreshKey:refresh,disabled,onChanged:()=>{refresh++;render();}}),options.realPreview ? createElement(PdfPreviewHost,{sourceRevision:refresh,historyStore:store,historyScope:f.form.scope}) : null))));render();
  return {...f,store,previews,holdNextRead:()=>{hold=true;},releaseRead:()=>{release?.();release=null;},setDisabled:(value:boolean)=>{disabled=value;render();},close:()=>{stopPreview();root.unmount();store.close();}};
}
