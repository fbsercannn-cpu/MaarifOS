import {canonicalJson} from '../../core/backup/canonical-json.ts';
import {resolveActiveClassroomScope} from '../../core/domain/classroom-scope.ts';
import {currentClassDutySchedules,type ClassDutyRecord,type ClassDutyRow} from '../../core/domain/class-duty-schedule.ts';
import type {DataSnapshot} from '../../core/domain/model.ts';
import {buildMonthlyWallCalendarModel} from '../planning/calendar-print-model.ts';
import {dutyKindLabel} from './class-duty-model.ts';
import {classDutyRevisionDiff} from './class-duty-service.ts';
export const dutyStatusLabel=(status:ClassDutyRow['status'])=>({planned:'Planlandı',completed:'Gerçekleşti',missed:'Gerçekleşmedi',cancelled:'İptal edildi'}[status]);
export function dutyDocumentModel(data:DataSnapshot,scheduleId:string){
 const scope=resolveActiveClassroomScope(data);if(!scope)throw Error('Etkin sınıfı seçin.');
 const record=currentClassDutySchedules(data,scope).find(r=>r.workflow.scheduleId===scheduleId);if(!record)throw Error('Kayıtlı görev çizelgesi bulunamadı.');
 const classroom=data.classrooms.find(c=>c.id===scope.classroomId)!,year=data.academicYears.find(y=>y.id===scope.academicYearId)!;
 const students=data.students.filter(s=>record.workflow.config.studentIds.includes(s.id)||record.workflow.rows.some(r=>r.studentId===s.id)).map(s=>({id:s.id,label:String(s.displayName??''),schoolNumber:String(s.schoolNumber??'')}));
 const rows=record.workflow.rows.map(row=>({...row,studentName:students.find(s=>s.id===row.studentId)?.label??''}));
 return{scope,record,students,rows,title:dutyKindLabel(record.workflow.config.kind),schoolName:String(classroom.schoolName??''),classroomName:String(classroom.name??classroom.displayName??''),teacherName:String(classroom.teacherName??classroom.teacherDisplayName??''),academicYearName:String(year.name??year.label??''),changedRowIds:classDutyRevisionDiff(data,record)};
}
export type DutyDocumentModel=ReturnType<typeof dutyDocumentModel>;
export function dutyDocumentFingerprint(model:DutyDocumentModel){return canonicalJson(model);}
export function dutyBoardModel(data:DataSnapshot,monthKey:string){
 const calendar=buildMonthlyWallCalendarModel(data,{monthKey,fields:['activities','calendar-entries']});
 const records=currentClassDutySchedules(data,calendar.scope).filter(r=>r.workflow.config.startOn<=calendar.periodEnd&&r.workflow.config.endOn>=calendar.periodStart);
 return{calendar,schedules:records.map(r=>{const model=dutyDocumentModel(data,r.workflow.scheduleId);return{...model,rows:model.rows.filter(row=>row.startOn<=calendar.periodEnd&&row.endOn>=calendar.periodStart)};}).filter(model=>model.rows.length)};
}
export function dutyScheduleRows(model:DutyDocumentModel,ids:readonly string[]=model.students.map(s=>s.id)){
 return model.rows.filter(r=>ids.includes(r.studentId)).map(r=>[r.startOn===r.endOn?r.startOn:`${r.startOn} – ${r.endOn}`,r.studentName,dutyStatusLabel(r.status),r.locked?'Sabit':'',model.changedRowIds.includes(r.id)?`v${model.record.workflow.revision} değişikliği`:'']);
}
export function dutyRevisionSource(record:ClassDutyRecord){return `${record.workflow.config.startOn} – ${record.workflow.config.endOn} · v${record.workflow.revision} · ${record.workflow.effectiveOn} tarihinden itibaren`;}
