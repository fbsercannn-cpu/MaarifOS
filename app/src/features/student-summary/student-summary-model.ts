import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { teacherFollowups } from "../../core/domain/teacher-followup.ts";
import { isCivilDate } from "../../core/domain/attendance.ts";
import { getDevelopmentObservationPresets, isDevelopmentObservationSelection } from "../evidence/development-observation-presets.ts";

export interface StudentSummaryInput { scope: ActiveClassroomScope; studentId: string; civilDate: string; }
export interface StudentSummaryModel {
  studentId: string; name: string; schoolNumber: string; classroomName: string; schoolName: string; teacherName: string;
  contacts: string[]; observations: { id: string; date: string; text: string; programSource: string }[];
  supports: { id: string; decision: string; reviewOn: string; nextStep: string }[];
  sharedObservationCount: number;
}
const value = (v: unknown) => typeof v === "string" ? v : "";
const newestFirst = (a: StoredRecord, b: StoredRecord) => b.civilDate.localeCompare(a.civilDate) || Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id);
export function createStudentSummaryModel(snapshot: DataSnapshot, input: StudentSummaryInput): StudentSummaryModel {
  if (!isCivilDate(input.civilDate)) throw new Error("Özet tarihi geçersiz.");
  const same = (r: StoredRecord) => !r.deletedAt && r.academicYearId === input.scope.academicYearId && r.classroomId === input.scope.classroomId;
  const student = snapshot.students.find(r => r.id === input.studentId && same(r));
  const classroom = snapshot.classrooms.find(r => r.id === input.scope.classroomId && !r.deletedAt && r.academicYearId === input.scope.academicYearId);
  if (!student || !classroom) throw new Error("Seçilen öğrenci bu sınıfta bulunmuyor. Güncel öğrenci profilini açın.");
  const candidates = snapshot.observations.filter(r => same(r) && r.civilDate <= input.civilDate && (r.studentId === input.studentId || (Array.isArray(r.studentIds) && r.studentIds.includes(input.studentId))));
  const eligible = candidates.filter(r => !Array.isArray(r.studentIds) || (r.studentIds.length === 1 && r.studentIds[0] === input.studentId));
  const observations = eligible.filter(r => typeof r.rawText === "string" && r.rawText.trim()).sort(newestFirst).map(r => {
    const selection = r.developmentSelection;
    const preset = isDevelopmentObservationSelection(selection) ? getDevelopmentObservationPresets(selection.ageBand).find(p => p.id === selection.presetId) : undefined;
    return { id: r.id, date: r.civilDate, text: String(r.rawText), programSource: preset ? `${preset.curriculumReference.code} · ${preset.label} · TYMM kaynağı s. ${preset.curriculumReference.sourcePage}` : "" };
  });
  const ids = new Set(observations.map(r => r.id));
  const followups = teacherFollowups(snapshot).filter(r => same(r) && r.studentId === input.studentId && r.civilDate <= input.civilDate).sort(newestFirst);
  const supports = followups.flatMap(r => {
    const w = r.workflow;
    if (w.kind !== "learning-decision" || !w.observationIds.every(id => ids.has(id))) return [];
    if (followups.some(next => next.workflow.kind === "learning-continuation" && next.workflow.sourceId === r.id)) return [];
    const reflection = followups.filter(next => next.workflow.kind === "learning-reflection" && next.workflow.sourceId === r.id).at(0);
    if (reflection?.workflow.kind === "learning-reflection" && reflection.workflow.nextFollowupOn === null) return [];
    return [{ id: r.id, decision: w.teacherDecision, reviewOn: reflection?.workflow.kind === "learning-reflection" ? reflection.workflow.nextFollowupOn! : w.reviewOn, nextStep: reflection?.workflow.kind === "learning-reflection" ? reflection.workflow.nextStep : "Ayrı bir sonraki adım metni kaydedilmemiş; destek kontrol tarihi kayıtlı." }];
  });
  const contacts = (Array.isArray(student.contacts) ? student.contacts : []).flatMap(raw => {
    if (!raw || typeof raw !== "object") return [];
    const c = raw as Record<string, unknown>;
    return [[value(c.relationship) || (c.kind === "mother" ? "Anne" : c.kind === "father" ? "Baba" : "Yakın"), value(c.name), value(c.phone)].filter(Boolean).join(" · ")].filter(Boolean);
  });
  return { studentId: student.id, name: value(student.displayName), schoolNumber: value(student.optionalCode), classroomName: value(classroom.name), schoolName: value(classroom.schoolName), teacherName: value(classroom.teacherName), contacts, observations, supports, sharedObservationCount: candidates.length - eligible.length };
}

