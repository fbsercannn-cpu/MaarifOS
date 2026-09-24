import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import { isUuid } from "../evidence/local-teacher-identity.ts";

export const HOME_GAME_CARD_SETTING_TYPE = "home-game-card-v1";
export const HOME_GAME_CARD_KEYS = ["settingType", "academicYearId", "classroomId", "studentId", "workflow"] as const;
export type HomeGameWorkflow =
  | { kind: "prepared"; activityId: string; planId: string; sourceFingerprint: string; title: string; materials: string; steps: string }
  | { kind: "feedback"; cardId: string; receivedOn: string; source: "oral" | "written"; text: string }
  | { kind: "response-action"; feedbackId: string; action: "plan" | "meeting"; targetDate: string; planId: string | null; activityId: string | null; appointmentId: string | null };
export type HomeGameCardRecord = StoredRecord & ActiveClassroomScope & { settingType: typeof HOME_GAME_CARD_SETTING_TYPE; studentId: string; workflow: HomeGameWorkflow };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 8000): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && Object.keys(v).every(k => keys.includes(k));
export function isHomeGameCardRecord(v: unknown): v is HomeGameCardRecord {
  if (!object(v) || !exact(v, ["id", "createdAt", "updatedAt", "civilDate", "schemaVersion", "deletedAt", ...HOME_GAME_CARD_KEYS]) || !isUuid(v.id) || !isUuid(v.studentId) || !isUuid(v.academicYearId) || !isUuid(v.classroomId) || v.settingType !== HOME_GAME_CARD_SETTING_TYPE || v.schemaVersion !== 1 || v.deletedAt !== null || typeof v.createdAt !== "string" || !Number.isFinite(Date.parse(v.createdAt)) || new Date(v.createdAt).toISOString() !== v.createdAt || v.updatedAt !== v.createdAt || v.civilDate !== civilDateInIstanbul(new Date(v.createdAt)) || !object(v.workflow)) return false;
  const w = v.workflow;
  if (w.kind === "prepared") return exact(w, ["kind", "activityId", "planId", "sourceFingerprint", "title", "materials", "steps"]) && isUuid(w.activityId) && isUuid(w.planId) && text(w.sourceFingerprint, 100000) && text(w.title, 1000) && text(w.materials, 8000) && text(w.steps, 16000);
  if (w.kind === "response-action") return exact(w, ["kind", "feedbackId", "action", "targetDate", "planId", "activityId", "appointmentId"]) && isUuid(w.feedbackId) && isCivilDate(w.targetDate) && (w.action === "plan" ? isUuid(w.planId) && isUuid(w.activityId) && w.appointmentId === null : w.action === "meeting" && isUuid(w.appointmentId) && w.planId === null && w.activityId === null);
  return w.kind === "feedback" && exact(w, ["kind", "cardId", "receivedOn", "source", "text"]) && isUuid(w.cardId) && isCivilDate(w.receivedOn) && w.receivedOn <= String(v.civilDate) && ["oral", "written"].includes(String(w.source)) && text(w.text);
}
export const homeGameCards = (s: DataSnapshot) => s.settings.filter(isHomeGameCardRecord).sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
export const sameHomeGameScope = (a: ActiveClassroomScope, b: StoredRecord) => a.academicYearId === b.academicYearId && a.classroomId === b.classroomId;
export function homeGameSource(snapshot: DataSnapshot, scope: ActiveClassroomScope, studentId: string, activityId: string) {
  const student = snapshot.students.find(r => r.id === studentId && !r.deletedAt && sameHomeGameScope(scope,r) && r.active !== false);
  const activity = snapshot.activities.find(r => r.id === activityId && !r.deletedAt && sameHomeGameScope(scope,r) && r.status !== "cancelled" && r.activityKind !== "spontaneous-observation");
  const plan = activity && snapshot.plans.find(r => r.id === activity.planId && !r.deletedAt && sameHomeGameScope(scope,r));
  if (!student || !activity || !plan || (Array.isArray(activity.studentIds) && activity.studentIds.length > 0 && !activity.studentIds.includes(studentId))) throw new Error("Bu çocuk için kayıtlı ve uygun bir etkinlik seçin.");
  const flow = object(plan.teacherOwnedDailyFlow) && Array.isArray(plan.teacherOwnedDailyFlow.blocks) ? plan.teacherOwnedDailyFlow.blocks : [];
  const block = flow.find((r: unknown) => object(r) && r.id === activity.teacherOwnedFlowBlockId);
  const template = object(activity.sourceActivityTemplateSnapshot) ? activity.sourceActivityTemplateSnapshot : {};
  const description = typeof template.familyExtension === "string" && template.familyExtension.trim() ? template.familyExtension : typeof activity.description === "string" ? activity.description : object(block) && typeof block.description === "string" ? block.description : "";
  const materials = Array.isArray(template.materials) && template.materials.every(m => typeof m === "string") ? template.materials.join(", ") : object(block) && typeof block.materials === "string" ? block.materials : "";
  const source = { studentId, name: String(student.displayName ?? ""), activityId, planId: plan.id, title: String(activity.title ?? ""), civilDate: activity.civilDate, description, materials, activityUpdatedAt: activity.updatedAt, planUpdatedAt: plan.updatedAt };
  return { ...source, fingerprint: JSON.stringify(source) };
}
export function assertHomeGameCardRelationships(snapshot: DataSnapshot) {
  const all = snapshot.settings.filter(r => r.settingType === HOME_GAME_CARD_SETTING_TYPE);
  if (!all.every(isHomeGameCardRecord)) throw new Error("Ev oyunu kartı kayıt sözleşmesi geçersiz.");
  const records = homeGameCards(snapshot);
  for (const r of records) {
    const child = snapshot.students.find(s => s.id === r.studentId);
    const historic = child && Array.isArray(child.enrollments) && child.enrollments.some(e => object(e) && e.academicYearId === r.academicYearId && e.classroomId === r.classroomId);
    if (!child || (!sameHomeGameScope(r,child) && !historic) || !snapshot.classrooms.some(c => c.id === r.classroomId && c.academicYearId === r.academicYearId) || !snapshot.academicYears.some(y => y.id === r.academicYearId)) throw new Error("Ev oyunu kartının çocuk veya sınıf bağı geçersiz.");
    const w = r.workflow;
    if (w.kind === "prepared") {
      const activity = snapshot.activities.find(a => a.id === w.activityId);
      const plan = snapshot.plans.find(p => p.id === w.planId);
      if (!activity || !plan || activity.planId !== plan.id || activity.createdAt > r.createdAt || plan.createdAt > r.createdAt || !sameHomeGameScope(r, activity) || !sameHomeGameScope(r, plan)) throw new Error("Ev oyunu kartının etkinlik kaynağı geçersiz.");
    } else if (w.kind === "response-action") {
      const source = records.find(s => s.id === w.feedbackId);
      if (!source || source.workflow.kind !== "feedback" || source.studentId !== r.studentId || !sameHomeGameScope(r, source) || source.createdAt >= r.createdAt || w.targetDate < source.workflow.receivedOn) throw new Error("Aile dönüş adımının gerçek yanıt kaynağı geçersiz.");
      if (w.action === "plan") {
        const activity = snapshot.activities.find(a => a.id === w.activityId);
        const plan = snapshot.plans.find(p => p.id === w.planId);
        if (!activity || !plan || activity.planId !== plan.id || !sameHomeGameScope(r, activity) || !sameHomeGameScope(r, plan) || activity.civilDate !== w.targetDate || !Array.isArray(activity.studentIds) || !activity.studentIds.includes(r.studentId)) throw new Error("Aile dönüş adımının plan veya çocuk bağı geçersiz.");
      } else if (!snapshot.settings.some(s => sameHomeGameScope(r,s) && s.studentId === r.studentId && object(s.workflow) && s.workflow.kind === "appointment" && s.workflow.appointmentId === w.appointmentId && s.workflow.scheduledOn === w.targetDate)) throw new Error("Aile dönüş adımının randevu bağı geçersiz.");
    } else {
      const card = records.find(c => c.id === w.cardId);
      if (!card || card.workflow.kind !== "prepared" || card.studentId !== r.studentId || !sameHomeGameScope(r,card) || card.createdAt >= r.createdAt || w.receivedOn < card.civilDate) throw new Error("Aile yanıtının çocuk ve etkinlik bağı geçersiz.");
    }
  }
}

