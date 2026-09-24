import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, recordBelongsToClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import type { CurriculumTargetSnapshot } from "../curriculum/curriculum-catalog.ts";
import type { CurriculumProfileSnapshot } from "../evidence/evidence-flow.ts";
import { getDevelopmentObservationPresets, type DevelopmentObservationPreset } from "../evidence/development-observation-presets.ts";
import { OBSERVATION_MANAGEMENT_COPY as copy } from "./observation-management-copy.ts";

const live = (r: StoredRecord) => typeof r.deletedAt !== "string";
const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
// Category alone is not evidence of content relevance (play also occurs in music).
// Ignore generic classroom/action words so sharing blocks cannot match musical
// participation or a speaking rule just through "friend", "turn" or "wait".
const GENERIC_CUES = /^(arkadaş|çocuk|kurgu|sınıf|öğretmen|oyun|parça|sıra|bekle|kendi|birlik|yapt|yapa|yapm|söyle|anlat|göster|verdi|verme|seçti|seçme|katıl|sunul|sonra|önce|tamam|grup|nesne|malzem|kullan|oluşt|uygun|farkl)/u;
function contentCues(text: string): Set<string> {
  return new Set((text.toLocaleLowerCase("tr-TR").match(/[\p{L}]+/gu) ?? [])
    .filter(word => word.length >= 5 && !GENERIC_CUES.test(word)).map(word => word.slice(0, 5)));
}
export function rankObservationDevelopmentChoices(observation: StoredRecord, presets: readonly DevelopmentObservationPreset[]) {
  const cues = contentCues(String(observation.rawText ?? ""));
  const categories = Array.isArray(observation.observationCategories) ? observation.observationCategories : [];
  const ranked = presets.map((preset, catalogIndex) => {
    const words = contentCues(`${preset.label} ${preset.observationText}`);
    const overlap = [...words].filter(word => cues.has(word)).length;
    // The reference is shown for teacher review, never used to invent an event.
    const score = overlap > 0 ? overlap * 10 + preset.categoryIds.filter(id => categories.includes(id)).length : 0;
    return { preset, score, catalogIndex };
  }).sort((a, b) => b.score - a.score || a.catalogIndex - b.catalogIndex);
  return { choices: ranked.map(item => item.preset), matchCount: ranked.filter(item => item.score > 0).length };
}
export function observationMembers(record: StoredRecord): string[] { return [...new Set([record.studentId, ...(Array.isArray(record.studentIds) ? record.studentIds : [])].filter((v): v is string => typeof v === "string"))]; }
export function observationMetadataFingerprint(snapshot: DataSnapshot, observation: StoredRecord): string { return canonicalJson([observation, snapshot.evidenceCurriculumLinks.filter(r => r.observationId === observation.id), snapshot.valueEvidenceLinks.filter(r => r.observationId === observation.id)]); }
export interface ActivityPlacement {
  id: string; planId: string; title: string; planTitle: string; civilDate: string; expectedActivityUpdatedAt: string; expectedPlanUpdatedAt: string;
  profile: CurriculumProfileSnapshot | null; targets: CurriculumTargetSnapshot[]; clearProgramLinks: boolean;
}
export interface ObservationMetadataModel {
  observation: StoredRecord; scope: ActiveClassroomScope; studentIds: string[]; targetDate: string; fingerprint: string; dateValid: boolean;
  currentTitle: string | null; currentIsSpontaneous: boolean; keepCurrent: boolean; placements: ActivityPlacement[]; existingLinkCount: number; spontaneousClearsLinks: boolean; developmentChoices: readonly DevelopmentObservationPreset[]; developmentMatchCount: number;
}
export function observationMetadataModel(snapshot: DataSnapshot, observationId: string, targetDate?: string, now = new Date()): ObservationMetadataModel | null {
  const scope = resolveActiveClassroomScope(snapshot);
  const observation = snapshot.observations.find(o => o.id === observationId && live(o));
  if (!scope || !observation || !recordBelongsToClassroomScope(observation, scope)) return null;
  const year = snapshot.academicYears.find(y => y.id === scope.academicYearId && live(y) && y.status !== "archived");
  if (!year) return null;
  const day = targetDate ?? observation.civilDate;
  const studentIds = observationMembers(observation);
  const dateValid = isCivilDate(day) && day <= civilDateInIstanbul(now) && studentIds.length > 0 && studentIds.every(id => {
    const student = snapshot.students.find(s => s.id === id && live(s) && s.active !== false && recordBelongsToClassroomScope(s, scope));
    return student && resolveStudentMembershipOn(student, { ...scope, academicYear: year, civilDate: day }).eligible;
  });
  const links = snapshot.evidenceCurriculumLinks.filter(r => r.observationId === observation.id);
  const valueLinks = snapshot.valueEvidenceLinks.filter(r => r.observationId === observation.id);
  const current = snapshot.activities.find(a => a.id === observation.activityId && a.planId === observation.planId && live(a));
  const currentPlan = snapshot.plans.find(p => p.id === observation.planId && live(p));
  const classroom = snapshot.classrooms.find(c => c.id === scope.classroomId);
  const classIsTymm = object(classroom?.curriculumProfileSnapshot).framework === "tymm";
  const spontaneousClearsLinks = valueLinks.length > 0 || links.some(link => !classIsTymm || link.developmentSelection === undefined);
  const development = rankObservationDevelopmentChoices(observation, dateValid && links.length === 0 && valueLinks.length === 0 && studentIds.length === 1 && classIsTymm ? getDevelopmentObservationPresets(String(classroom?.ageGroup ?? "")) : []);
  const developmentChoices = development.choices;
  const placements = !dateValid ? [] : snapshot.activities.filter(a => live(a) && recordBelongsToClassroomScope(a, scope) && a.civilDate === day && a.activityKind !== "spontaneous-observation" && !["cancelled", "archived"].includes(String(a.status))).flatMap(activity => {
    const plan = snapshot.plans.find(p => p.id === activity.planId && live(p) && recordBelongsToClassroomScope(p, scope) && p.planType === "daily" && p.civilDate === day);
    if (!plan) return [];
    const assigned = Array.isArray(activity.targetAssignments) ? activity.targetAssignments.map(a => object(a).studentId) : [];
    if (activity.assignmentMode === "selected-students" && studentIds.some(id => !assigned.includes(id))) return [];
    const declaredStudents = Array.isArray(activity.studentIds) ? activity.studentIds : [];
    if (declaredStudents.length && studentIds.some(id => !declaredStudents.includes(id))) return [];
    const value = object(plan.curriculumProfileSnapshot);
    const profile = ["tymm", "meb_2024"].includes(String(value.framework)) && typeof value.catalogId === "string" && typeof value.sourceVersion === "string" ? value as unknown as CurriculumProfileSnapshot : null;
    const targets = (Array.isArray(activity.curriculumTargets) ? activity.curriculumTargets : []).filter((target): target is CurriculumTargetSnapshot => {
      const t = object(target);
      return !!profile && typeof t.id === "string" && typeof t.referenceCode === "string" && typeof t.referenceTitle === "string" && t.framework === profile.framework && t.catalogId === profile.catalogId && t.sourceVersion === profile.sourceVersion;
    });
    const changedActivity = observation.activityId !== activity.id;
    const incompatible = links.some(link => !profile || link.framework !== profile.framework || (link.developmentSelection === undefined && (link.catalogId !== profile.catalogId || link.sourceVersion !== profile.sourceVersion || (typeof link.plannedTargetId === "string" && !targets.some(t => t.id === link.plannedTargetId)))));
    return [{ id: activity.id, planId: plan.id, title: String(activity.title ?? ""), planTitle: String(plan.title ?? ""), civilDate: day, expectedActivityUpdatedAt: activity.updatedAt, expectedPlanUpdatedAt: plan.updatedAt, profile, targets, clearProgramLinks: incompatible || (changedActivity && valueLinks.length > 0) }];
  }).sort((a,b) => Number(b.id === current?.id) - Number(a.id === current?.id) || a.title.localeCompare(b.title, "tr-TR") || a.id.localeCompare(b.id));
  const currentIsSpontaneous = current?.activityKind === "spontaneous-observation";
  return { observation, scope, studentIds, targetDate: day, fingerprint: observationMetadataFingerprint(snapshot, observation), dateValid, currentTitle: current ? String(current.title ?? "") : null, currentIsSpontaneous, keepCurrent: dateValid && !!current && !!currentPlan && current.civilDate === day && currentPlan.civilDate === day && (currentIsSpontaneous || placements.some(p => p.id === current.id)), placements, existingLinkCount: links.length + valueLinks.length, spontaneousClearsLinks, developmentChoices, developmentMatchCount: development.matchCount };
}
export function shiftedObservedAt(observation: StoredRecord, targetDate: string, now: Date): string {
  if (!isCivilDate(targetDate)) throw new Error(copy.invalidDate);
  const original = new Date(typeof observation.observedAt === "string" ? observation.observedAt : observation.createdAt);
  const sourceDay = civilDateInIstanbul(original);
  const shifted = new Date(original.getTime() + Date.parse(`${targetDate}T12:00:00Z`) - Date.parse(`${sourceDay}T12:00:00Z`));
  const result = shifted > now ? now : shifted;
  if (civilDateInIstanbul(result) !== targetDate) throw new Error(copy.invalidDate);
  return result.toISOString();
}
