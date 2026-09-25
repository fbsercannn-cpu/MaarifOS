import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {IndexedDbDataStore} from '../src/core/repository/indexed-db.ts';
import {CloudAccountPanel} from '../src/features/cloud-account/CloudAccountPanel.tsx';
import {makeDevelopmentReportFixture} from './fixtures/development-report-fixture.mjs';
import {MobileDeviceProvider,KeyboardProvider} from '../src/mobile';
const store=new IndexedDbDataStore({databaseName:`cloud-ui-${crypto.randomUUID()}`});
await makeDevelopmentReportFixture(store);Object.assign(window,{cloudTest:{store,changed:0}});
function Fixture(){const [revision,setRevision]=useState(0);return <><CloudAccountPanel store={store} version="0.44.0" onChanged={(result)=>{(window as any).cloudTest.lastChange=result;(window as any).cloudTest.changed++;setRevision(v=>v+1);}}/><output aria-label="Kaydedilen eşitleme">{revision}</output></>;}
createRoot(document.getElementById('root')!).render(<MobileDeviceProvider><KeyboardProvider native><Fixture/></KeyboardProvider></MobileDeviceProvider>);
