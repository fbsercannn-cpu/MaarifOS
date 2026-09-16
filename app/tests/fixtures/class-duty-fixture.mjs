import {makeDevelopmentReportFixture} from './development-report-fixture.mjs';
import {dutyDefaultConfig} from '../../src/features/class-duty-schedule/class-duty-model.ts';
import {previewClassDutySchedule,applyClassDutySchedule} from '../../src/features/class-duty-schedule/class-duty-service.ts';
export async function makeClassDutyFixture(store){
 const f=await makeDevelopmentReportFixture(store), now=new Date('2026-09-17T09:00:00.000Z');
 const config=dutyDefaultConfig(await store.readSnapshot(),'fruit','2026-10');
 const request={kind:'create',scheduleId:crypto.randomUUID(),operationId:crypto.randomUUID(),config};
 const preview=await previewClassDutySchedule(store,request,{now});
 return {...f,now,request,preview,save:()=>applyClassDutySchedule(store,{request,expectedFingerprint:preview.expectedFingerprint,now})};
}

export {read,write} from 'xlsx';
