import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {MobileDeviceProvider,KeyboardProvider} from '../src/mobile';
import {ActivityStudio} from '../src/features/activity-studio/ActivityStudio.tsx';
import {LocalObservationSearch} from '../src/features/teacher-assistant/LocalObservationSearch.tsx';
import {makeDevelopmentReportFixture} from './fixtures/development-report-fixture.mjs';
const fixture=await makeDevelopmentReportFixture();fixture.store.snapshot.observations[0].rawText='  IŞIK için kağıt seçti.\nÖzgün söz.  ';
Object.assign(window,{assistantToolsFixture:{store:fixture.store,before:JSON.stringify(await fixture.store.readSnapshot())}});
function Fixture(){const [chosen,setChosen]=useState('');return <main><ActivityStudio initialAgeBand="60-72" onAddToPlan={(activity,context)=>setChosen(`${activity.id}@${context.ageBand}`)} onApply={()=>{}} onPrint={()=>{}}/><output aria-label="Seçilen etkinlik">{chosen}</output><LocalObservationSearch store={fixture.store}/></main>;}
createRoot(document.getElementById('root')!).render(<MobileDeviceProvider><KeyboardProvider native><Fixture/></KeyboardProvider></MobileDeviceProvider>);
