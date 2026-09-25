import {createElement,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {IndexedDbDataStore} from '../../src/core/index.ts';
import {MobileDeviceProvider,KeyboardProvider} from '../../src/mobile';
import {PdfPreviewHost} from '../../src/features/documents/PdfPreviewHost.tsx';
import {ClassDutySchedulePanel} from '../../src/features/class-duty-schedule/ClassDutySchedulePanel.tsx';
import {classDutyRecords,currentClassDutySchedules} from '../../src/core/domain/class-duty-schedule.ts';
import {makeClassDutyFixture} from './class-duty-fixture.mjs';
export async function mountClassDuty(){
 const store=new IndexedDbDataStore({databaseName:`duty-ui-${crypto.randomUUID()}`}),f=await makeClassDutyFixture(store),opened:string[]=[];const host=document.createElement('main');host.style.width='320px';host.style.maxWidth='100%';document.body.style.margin='0';document.body.replaceChildren(host);const root=createRoot(host);
 function App(){const [revision,setRevision]=useState(0);return <MobileDeviceProvider><KeyboardProvider native><ClassDutySchedulePanel store={store} refreshKey={revision} onChanged={()=>setRevision(n=>n+1)} onOpenCalendar={day=>opened.push(day)}/><PdfPreviewHost historyStore={store} historyScope={{academicYearId:f.input.academicYearId,classroomId:f.input.classroomId}} sourceRevision={revision}/></KeyboardProvider></MobileDeviceProvider>;}
 root.render(createElement(App));return{...f,opened,records:async()=>classDutyRecords(await store.readSnapshot()),currentRecords:async()=>currentClassDutySchedules(await store.readSnapshot()),close:()=>{root.unmount();store.close();}};
}
