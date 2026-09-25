import {createEmptySnapshot,COLLECTION_NAMES} from '../../src/core/domain/model.ts';
import {makeDevelopmentReportFixture} from './development-report-fixture.mjs';

export const PERFORMANCE_DATASET_VERSION='synthetic-school-history-v1';
const uuid=value=>`10000000-0000-4000-8000-${String(value).padStart(12,'0')}`;
function schoolDays(year){const result=[];const day=new Date(Date.UTC(year,8,1));while(result.length<180){if(day.getUTCDay()!==0&&day.getUTCDay()!==6)result.push(day.toISOString().slice(0,10));day.setUTCDate(day.getUTCDate()+1);}return result;}

/** Fixed, artificial records. Never opens a production database or reads user files. */
export async function repositoryPerformanceFixture(years){
 const fixture=await makeDevelopmentReportFixture();const template=await fixture.store.readSnapshot();fixture.store.close();
 const snapshot=createEmptySnapshot();
 for(let yearIndex=0;yearIndex<years;yearIndex++){
  const offset=(yearIndex+1)*100000;const dates=schoolDays(2020+yearIndex);
  const mapping=new Map(COLLECTION_NAMES.flatMap(name=>template[name].map((record,index)=>[record.id,uuid(offset+COLLECTION_NAMES.indexOf(name)*1000+index)])));
  const copy=value=>JSON.parse(JSON.stringify(value),(_key,item)=>typeof item==='string'?(mapping.get(item)??(/^2026-\d{2}-\d{2}/.test(item)?String(2020+yearIndex)+item.slice(4):item)):item);
  const base=copy(template);
  base.academicYears[0]={...base.academicYears[0],name:`Kurgu ${2020+yearIndex}-${2021+yearIndex}`,startDate:dates[0],endDate:`${2021+yearIndex}-06-30`};
  const classroomId=base.classrooms[0].id,academicYearId=base.academicYears[0].id;
  for(const name of COLLECTION_NAMES)if(!['students','observations','attendanceRecords','settings'].includes(name))snapshot[name].push(...base[name]);
  for(let studentIndex=0;studentIndex<30;studentIndex++){
   const studentId=uuid(offset+20000+studentIndex);snapshot.students.push({...base.students[0],id:studentId,displayName:`Kurgu Performans ${yearIndex+1}-${studentIndex+1}`});
   for(let observationIndex=0;observationIndex<40;observationIndex++){
    const date=dates[observationIndex*4];snapshot.observations.push({...base.observations[0],id:uuid(offset+30000+studentIndex*40+observationIndex),studentIds:[studentId],civilDate:date,observedAt:`${date}T09:00:00.000Z`,rawText:`Yalnız performans testi. Yıl ${yearIndex+1}, çocuk ${studentIndex+1}, kayıt ${observationIndex+1}.`});
   }
   for(let dayIndex=0;dayIndex<dates.length;dayIndex++)snapshot.attendanceRecords.push({id:uuid(offset+40000+studentIndex*180+dayIndex),academicYearId,classroomId,studentIds:[studentId],civilDate:dates[dayIndex],createdAt:`${dates[dayIndex]}T06:00:00.000Z`,updatedAt:`${dates[dayIndex]}T06:00:00.000Z`,deletedAt:null,schemaVersion:1,status:dayIndex%17===0?'absent':'present',events:[]});
  }
 }
 return {snapshot,studentId:snapshot.students[0].id,classroomId:snapshot.classrooms[0].id,civilDate:snapshot.attendanceRecords[0].civilDate};
}
