import { civilDateInIstanbul, isCivilDate } from "./attendance.ts";
import type { DataSnapshot, StoredRecord } from "./model.ts";

/** Immutable teacher-authored events. Corrections/resolutions append events, never replace evidence. */
export const TEACHER_FOLLOWUP_SETTING_TYPE = "teacher-followup-v1" as const;
export const TEACHER_FOLLOWUP_KEYS = ["settingType", "academicYearId", "classroomId", "studentId", "workflow"] as const;
export type ContactArea = "phones" | "address" | "pickup";
export type SupportChoice = "adapt-environment" | "small-group" | "family-cooperation" | "observe-again" | "other";
export type ContactSnapshot = { id: string; name: string; relationship: string; phone: string; authorized: boolean };
export type TeacherSupportStep = { decisionId: string; studentId: string; text: string };
export type PreparationSource = { collection: "activities" | "plans"; id: string; title: string; updatedAt: string };
export type PreparationItem = { id: string; text: string; advance: boolean; dueOn: string; sourceIds: string[] };
export type TeacherWorkflow =
  | { kind: "contact-check"; areas: ContactArea[]; fingerprints: Partial<Record<ContactArea, string>>; source: "family-updated" | "family-confirmed" | "teacher-checked"; note: string }
  | { kind: "pickup-authority"; contactId: string; before: ContactSnapshot | null; after: ContactSnapshot | null; reason: string }
  | { kind: "pickup-log"; contact: ContactSnapshot; handedOverAt: string; note: string; authorityFingerprint: string }
  | { kind: "pickup-correction"; sourceId: string; note: string }
  | { kind: "family-meeting"; participants: string; discussion: string; decision: string; followupOn: string | null }
  | { kind: "followup-resolution"; sourceId: string; outcome: string; nextFollowupOn: string | null }
  | { kind: "preparation-list"; weekStart: string; weekEnd: string; sources: PreparationSource[]; items: PreparationItem[] }
  | { kind: "preparation-check"; sourceId: string; itemId: string; completed: boolean }
  | { kind: "guide-step"; page: number; sourceSha256: string; title: string; plannedOn: string }
  | { kind: "guide-observation"; sourceId: string; observation: string; status: "continuing" | "completed"; nextFollowupOn: string | null }
  | { kind: "learning-decision"; observationIds: string[]; support: SupportChoice; teacherDecision: string; targetWeekStart: string; targetWeekEnd: string; reviewOn: string }
  | { kind: "learning-plan-link"; sourceId: string; planId: string; planRevision: number; appliedText: string }
  | { kind: "learning-continuation"; sourceId: string; nextDecisionId: string; reflectionId: string }
  | { kind: "observation-focus"; planId: string; activityId: string }
  | { kind: "family-preparation-link"; sourceId: string; appointmentId: string }
  | { kind: "family-meeting-form"; sourceId: string; appointmentId: string; observationIds: string[]; teacherConfirmed: true }
  | { kind: "family-meeting-task"; sourceId: string; owner: "family" | "teacher"; text: string; dueOn: string }
  | { kind: "family-task-check"; sourceId: string; completed: boolean }
  | { kind: "learning-reflection"; sourceId: string; reflection: string; nextStep: string; nextFollowupOn: string | null };

export type TeacherFollowupRecord = StoredRecord & {
  settingType: typeof TEACHER_FOLLOWUP_SETTING_TYPE;
  schemaVersion: 1;
  academicYearId: string;
  classroomId: string;
  studentId: string | null;
  workflow: TeacherWorkflow;
  deletedAt: null;
};
export const GUIDE_DIGEST = "353b9e91e3f140b96dc3e3f110815e5592a809750caa6bbb8575274a100059a4";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/u;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>, expected: string[]) => Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
const text = (v: unknown, max = 4000): v is string => typeof v === "string" && v.length <= max && v === v.normalize("NFC").trim();
const required = (v: unknown, max = 4000): v is string => text(v, max) && v.length > 0;
const id = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const utc = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const day = (v: unknown): v is string => typeof v === "string" && isCivilDate(v);
const optionalDay = (v: unknown) => v === null || day(v);
const unique = (v: unknown, check: (v: unknown) => boolean, max = 200): v is string[] => Array.isArray(v) && v.length > 0 && v.length <= max && new Set(v).size === v.length && v.every(check);
const contact = (v: unknown): v is ContactSnapshot => object(v) && keys(v, ["id", "name", "relationship", "phone", "authorized"]) && id(v.id) && text(v.name, 200) && required(v.relationship, 120) && text(v.phone, 80) && typeof v.authorized === "boolean";
export function isTeacherSupportStep(v: unknown): v is TeacherSupportStep { return object(v) && keys(v, ["decisionId", "studentId", "text"]) && id(v.decisionId) && id(v.studentId) && required(v.text, 8000); }
export function teacherSupportStepsText(content: unknown): string {
  const steps = object(content) && Array.isArray(content.followupSupportSteps) ? content.followupSupportSteps.filter(isTeacherSupportStep) : [];
  return steps.length ? `Bireysel destek adımları\n${steps.map(s => s.text).join("\n\n")}` : "";
}
export function isTeacherWorkflow(v: unknown): v is TeacherWorkflow {
  if (!object(v)) return false;
  const exact = (fields: string[]) => keys(v, ["kind", ...fields]);
  switch (v.kind) {
    case "contact-check": return exact(["areas", "fingerprints", "source", "note"]) && unique(v.areas, x => ["phones", "address", "pickup"].includes(String(x)), 3) && object(v.fingerprints) && keys(v.fingerprints, v.areas) && Object.values(v.fingerprints).every(x => typeof x === "string" && HASH.test(x)) && ["family-updated", "family-confirmed", "teacher-checked"].includes(String(v.source)) && text(v.note);
    case "pickup-authority": return exact(["contactId", "before", "after", "reason"]) && id(v.contactId) && (v.before === null || contact(v.before)) && (v.after === null || contact(v.after)) && (v.before !== null || v.after !== null) && (!v.before || v.before.id === v.contactId) && (!v.after || v.after.id === v.contactId) && required(v.reason, 1000);
    case "pickup-log": return exact(["contact", "handedOverAt", "note", "authorityFingerprint"]) && contact(v.contact) && v.contact.authorized && required(v.contact.name, 200) && utc(v.handedOverAt) && text(v.note) && typeof v.authorityFingerprint === "string" && HASH.test(v.authorityFingerprint);
    case "pickup-correction": return exact(["sourceId", "note"]) && id(v.sourceId) && required(v.note);
    case "family-meeting": return exact(["participants", "discussion", "decision", "followupOn"]) && required(v.participants, 500) && required(v.discussion) && required(v.decision) && optionalDay(v.followupOn);
    case "followup-resolution": return exact(["sourceId", "outcome", "nextFollowupOn"]) && id(v.sourceId) && required(v.outcome) && optionalDay(v.nextFollowupOn);
    case "preparation-list": return exact(["weekStart", "weekEnd", "sources", "items"]) && day(v.weekStart) && day(v.weekEnd) && v.weekStart <= v.weekEnd && Array.isArray(v.sources) && v.sources.length <= 100 && v.sources.length > 0 && v.sources.every(s => object(s) && keys(s, ["collection", "id", "title", "updatedAt"]) && ["activities", "plans"].includes(String(s.collection)) && id(s.id) && required(s.title, 500) && utc(s.updatedAt)) && new Set(v.sources.map(s => s.id)).size === v.sources.length && Array.isArray(v.items) && v.items.length > 0 && v.items.length <= 200 && v.items.every(i => object(i) && keys(i, ["id", "text", "advance", "dueOn", "sourceIds"]) && id(i.id) && required(i.text, 500) && typeof i.advance === "boolean" && day(i.dueOn) && i.dueOn <= String(v.weekEnd) && unique(i.sourceIds, id, 100) && i.sourceIds.every(sid => (v.sources as PreparationSource[]).some(s => s.id === sid))) && new Set(v.items.map(i => i.id)).size === v.items.length;
    case "preparation-check": return exact(["sourceId", "itemId", "completed"]) && id(v.sourceId) && id(v.itemId) && typeof v.completed === "boolean";
    case "guide-step": return exact(["page", "sourceSha256", "title", "plannedOn"]) && Number.isInteger(v.page) && Number(v.page) >= 1 && Number(v.page) <= 35 && v.sourceSha256 === GUIDE_DIGEST && required(v.title, 500) && day(v.plannedOn);
    case "guide-observation": return exact(["sourceId", "observation", "status", "nextFollowupOn"]) && id(v.sourceId) && required(v.observation) && ["continuing", "completed"].includes(String(v.status)) && optionalDay(v.nextFollowupOn) && (v.status !== "completed" || v.nextFollowupOn === null);
    case "learning-decision": return exact(["observationIds", "support", "teacherDecision", "targetWeekStart", "targetWeekEnd", "reviewOn"]) && unique(v.observationIds, id, 100) && ["adapt-environment", "small-group", "family-cooperation", "observe-again", "other"].includes(String(v.support)) && required(v.teacherDecision) && day(v.targetWeekStart) && day(v.targetWeekEnd) && v.targetWeekStart <= v.targetWeekEnd && day(v.reviewOn) && v.reviewOn >= v.targetWeekStart;
    case "learning-plan-link": return exact(["sourceId", "planId", "planRevision", "appliedText"]) && id(v.sourceId) && id(v.planId) && Number.isSafeInteger(v.planRevision) && Number(v.planRevision) >= 2 && required(v.appliedText, 8000);
    case "learning-continuation": return exact(["sourceId", "nextDecisionId", "reflectionId"]) && id(v.sourceId) && id(v.nextDecisionId) && id(v.reflectionId) && v.sourceId !== v.nextDecisionId;
    case "observation-focus": return exact(["planId", "activityId"]) && id(v.planId) && id(v.activityId);
    case "family-preparation-link": return exact(["sourceId", "appointmentId"]) && id(v.sourceId) && id(v.appointmentId);
    case "family-meeting-form": return exact(["sourceId", "appointmentId", "observationIds", "teacherConfirmed"]) && id(v.sourceId) && id(v.appointmentId) && Array.isArray(v.observationIds) && v.observationIds.length <= 100 && v.observationIds.every(id) && new Set(v.observationIds).size === v.observationIds.length && v.teacherConfirmed === true;
    case "family-meeting-task": return exact(["sourceId", "owner", "text", "dueOn"]) && id(v.sourceId) && ["family", "teacher"].includes(String(v.owner)) && required(v.text, 1000) && day(v.dueOn);
    case "family-task-check": return exact(["sourceId", "completed"]) && id(v.sourceId) && typeof v.completed === "boolean";
    case "learning-reflection": return exact(["sourceId", "reflection", "nextStep", "nextFollowupOn"]) && id(v.sourceId) && required(v.reflection) && required(v.nextStep) && optionalDay(v.nextFollowupOn);
    default: return false;
  }
}

export function isTeacherFollowupRecord(v: unknown): v is TeacherFollowupRecord {
  if (!object(v) || !keys(v, ["id", "createdAt", "updatedAt", "civilDate", "schemaVersion", "deletedAt", ...TEACHER_FOLLOWUP_KEYS]) || !id(v.id) || !utc(v.createdAt) || v.updatedAt !== v.createdAt || !day(v.civilDate) || v.civilDate > civilDateInIstanbul(new Date(v.createdAt)) || v.schemaVersion !== 1 || v.deletedAt !== null || v.settingType !== TEACHER_FOLLOWUP_SETTING_TYPE || !id(v.academicYearId) || !id(v.classroomId) || !(v.studentId === null || id(v.studentId)) || !isTeacherWorkflow(v.workflow)) return false;
  if ((v.workflow.kind === "preparation-list" || v.workflow.kind === "preparation-check") !== (v.studentId === null)) return false;
  if (v.workflow.kind === "pickup-log" && (civilDateInIstanbul(new Date(v.workflow.handedOverAt)) !== v.civilDate || v.workflow.handedOverAt > v.createdAt)) return false;
  return true;
}

export function teacherFollowups(snapshot: DataSnapshot): TeacherFollowupRecord[] {
  return snapshot.settings.filter(isTeacherFollowupRecord).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
export function sameFollowupScope(a: TeacherFollowupRecord, b: StoredRecord): boolean {
  return a.academicYearId === b.academicYearId && a.classroomId === b.classroomId;
}

/** Backup and runtime share the same relationship validator; no orphan event is silently dropped. */
export function assertTeacherFollowupRelationships(snapshot: DataSnapshot): void {
  const all = snapshot.settings.filter(r => r.settingType === TEACHER_FOLLOWUP_SETTING_TYPE);
  if (!all.every(isTeacherFollowupRecord)) throw new Error("Öğretmen takip kaydı sözleşmesi geçersiz.");
  const records = all as TeacherFollowupRecord[];
  const byId = new Map(records.map(r => [r.id, r]));
  for (const plan of snapshot.plans) {
    const versions = [plan, ...(Array.isArray(plan.revisionHistory) ? plan.revisionHistory : [])];
    for (const version of versions) {
      if (!object(version) || !object(version.teacherContent) || version.teacherContent.followupSupportSteps === undefined) continue;
      const steps = version.teacherContent.followupSupportSteps;
      if (!Array.isArray(steps) || !steps.every(isTeacherSupportStep) || new Set(steps.map(s => s.decisionId)).size !== steps.length) throw new Error("Planın bireysel destek adımları geçersiz.");
      for (const step of steps) {
        const source = byId.get(step.decisionId);
        if (!source || source.workflow.kind !== "learning-decision" || source.studentId !== step.studentId || !sameFollowupScope(source, plan)) throw new Error("Plan destek adımı çocuk veya karar kaynağıyla uyuşmuyor.");
      }
    }
  }
  for (const r of records) {
    const year = snapshot.academicYears.find(y => y.id === r.academicYearId);
    const classroom = snapshot.classrooms.find(c => c.id === r.classroomId && c.academicYearId === r.academicYearId);
    const student = r.studentId === null ? null : snapshot.students.find(s => s.id === r.studentId);
    const historicScope = student && Array.isArray(student.enrollments) && student.enrollments.some(e => object(e) && e.academicYearId === r.academicYearId && e.classroomId === r.classroomId);
    if (!year || !classroom || (r.studentId !== null && (!student || (!sameFollowupScope(r, student) && !historicScope)))) throw new Error("Öğretmen takibi sınıf veya çocuk ilişkisi geçersiz.");
    const w = r.workflow;
    if ("sourceId" in w) {
      const source = byId.get(w.sourceId);
      const expected = { "pickup-correction": "pickup-log", "followup-resolution": "family-meeting", "preparation-check": "preparation-list", "guide-observation": "guide-step", "learning-plan-link": "learning-decision", "learning-reflection": "learning-decision", "learning-continuation": "learning-decision", "family-preparation-link": "learning-decision", "family-meeting-form": "family-meeting", "family-meeting-task": "family-meeting", "family-task-check": "family-meeting-task" }[w.kind];
      if (!source || source.workflow.kind !== expected || !sameFollowupScope(r, source) || source.studentId !== r.studentId || source.createdAt >= r.createdAt || source.civilDate > r.civilDate) throw new Error("Öğretmen takibi kaynak veya zaman zinciri geçersiz.");
      if (w.kind === "preparation-check" && source.workflow.kind === "preparation-list" && !source.workflow.items.some(i => i.id === w.itemId)) throw new Error("Hazırlık maddesi kaynak listede bulunamadı.");
      if (w.kind === "learning-reflection" && source.workflow.kind === "learning-decision" && r.civilDate < source.workflow.targetWeekStart) throw new Error("Sonraki eğitim adımı uygulanmadan sonuç değerlendirmesi kaydedilemez.");
      if (w.kind === "learning-continuation") {
        const next = byId.get(w.nextDecisionId), reflection = byId.get(w.reflectionId);
        if (!next || next.workflow.kind !== "learning-decision" || !reflection || reflection.workflow.kind !== "learning-reflection" || reflection.workflow.sourceId !== source.id || reflection.workflow.nextFollowupOn !== null || next.studentId !== r.studentId || reflection.studentId !== r.studentId || !sameFollowupScope(r, next) || !sameFollowupScope(r, reflection) || next.createdAt >= r.createdAt || reflection.createdAt >= next.createdAt || next.civilDate !== r.civilDate || records.some(other => other.id !== r.id && other.workflow.kind === "learning-continuation" && (other.workflow.reflectionId === w.reflectionId || other.workflow.nextDecisionId === w.nextDecisionId))) throw new Error("Destek devamının önceki değerlendirme ve yeni karar zinciri geçersiz.");
      }
      if (w.kind === "family-preparation-link") {
        const appointment = snapshot.settings.find(a => a.settingType === "family-engagement-v1" && object(a.workflow) && a.workflow.kind === "appointment" && a.workflow.appointmentId === w.appointmentId && a.workflow.previousEventId === null);
        if (source.workflow.kind !== "learning-decision" || source.workflow.support !== "family-cooperation" || !appointment || appointment.studentId !== r.studentId || !sameFollowupScope(r, appointment) || appointment.createdAt >= r.createdAt || records.some(other => other.id !== r.id && other.workflow.kind === "family-preparation-link" && other.workflow.sourceId === w.sourceId)) throw new Error("Görüşme hazırlığının destek kararı veya randevu bağı geçersiz.");
      }
      if (w.kind === "family-meeting-form") {
        const appointment = snapshot.settings.find(a => a.settingType === "family-engagement-v1" && object(a.workflow) && a.workflow.kind === "appointment-meeting" && a.workflow.appointmentId === w.appointmentId && a.workflow.meetingId === source.id);
        if (!appointment || appointment.studentId !== r.studentId || !sameFollowupScope(r, appointment) || appointment.createdAt >= r.createdAt || records.some(other => other.id !== r.id && other.workflow.kind === "family-meeting-form" && other.workflow.sourceId === w.sourceId)) throw new Error("Veli görüşme formunun gerçek randevu ve sonuç kaydı uyuşmuyor.");
        for (const oid of w.observationIds) { const observation = snapshot.observations.find(o => o.id === oid); if (!observation || !sameFollowupScope(r, observation) || observation.civilDate > source.civilDate || (observation.studentId !== r.studentId && !(Array.isArray(observation.studentIds) && observation.studentIds.includes(r.studentId)))) throw new Error("Görüşme gündeminin gözlem kaynağı veya tarihi geçersiz."); }
      }
      if (w.kind === "family-meeting-task" && (w.dueOn < r.civilDate || !records.some(form => form.workflow.kind === "family-meeting-form" && form.workflow.sourceId === source.id && form.createdAt <= r.createdAt))) throw new Error("Görüşme görevinin form kaynağı veya takip günü geçersiz.");
      if (w.kind === "learning-plan-link" && source.workflow.kind === "learning-decision") {
        const plan = snapshot.plans.find(p => p.id === w.planId);
        if (!plan || !sameFollowupScope(r, plan) || plan.planType !== "weekly" || plan.planOrigin !== "teacher-authored" || Number(plan.revisionNumber) < w.planRevision || plan.periodStart !== source.workflow.targetWeekStart || plan.periodEnd !== source.workflow.targetWeekEnd) throw new Error("Eğitim adımının hedef haftası ve planı uyuşmuyor.");
        const revision = Number(plan.revisionNumber) === w.planRevision ? plan : Array.isArray(plan.revisionHistory) ? plan.revisionHistory.find(v => object(v) && v.revisionNumber === w.planRevision) : null;
        const content = object(revision) && object(revision.teacherContent) ? revision.teacherContent : null;
        if (!content || !Array.isArray(content.followupSupportSteps) || !content.followupSupportSteps.some(step => isTeacherSupportStep(step) && step.decisionId === source.id && step.studentId === source.studentId && step.text === w.appliedText)) throw new Error("Hedef plan revizyonunda uygulanan öğretmen metni doğrulanamadı.");
      }
    }
    if (w.kind === "observation-focus") {
      const plan = snapshot.plans.find(p => p.id === w.planId), activity = snapshot.activities.find(a => a.id === w.activityId);
      if (!plan || !activity || plan.planType !== "daily" || activity.planId !== plan.id || !sameFollowupScope(r, plan) || !sameFollowupScope(r, activity) || activity.civilDate !== r.civilDate || plan.civilDate !== r.civilDate || activity.createdAt > r.createdAt || activity.activityKind === "spontaneous-observation" || records.some(other => other.id !== r.id && other.studentId === r.studentId && other.workflow.kind === "observation-focus" && other.workflow.activityId === w.activityId)) throw new Error("Gözlem odağının günlük plan, etkinlik veya çocuk bağı geçersiz.");
    }
    if (w.kind === "preparation-list") for (const s of w.sources) {
      const source = snapshot[s.collection].find(p => p.id === s.id);
      if (!source || !sameFollowupScope(r, source) || s.updatedAt > r.createdAt) throw new Error("Hazırlık listesinin seçilmiş plan/etkinlik kaynağı geçersiz.");
    }
    if (w.kind === "learning-decision") {
      if (w.targetWeekStart <= r.civilDate) throw new Error("Destek kararı gelecek bir haftaya bağlanmalıdır.");
      for (const oid of w.observationIds) {
        const observation = snapshot.observations.find(o => o.id === oid);
        if (!observation || !sameFollowupScope(r, observation) || observation.civilDate > r.civilDate || (observation.studentId !== r.studentId && !(Array.isArray(observation.studentIds) && observation.studentIds.includes(r.studentId)))) throw new Error("Eğitim kararı yalnız seçilen çocuğun mevcut gözlemine bağlanabilir.");
      }
    }
    for (const field of ["followupOn", "nextFollowupOn"] as const) {
      if (field in w && w[field as keyof typeof w] !== null && String(w[field as keyof typeof w]) < r.civilDate) throw new Error("Takip tarihi kayıt gününden önce olamaz.");
    }
  }
}

export function latestFollowupEvent(records: readonly TeacherFollowupRecord[], sourceId: string, kind: TeacherWorkflow["kind"]): TeacherFollowupRecord | undefined {
  return records.filter(r => r.workflow.kind === kind && "sourceId" in r.workflow && r.workflow.sourceId === sourceId).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
}

export interface FollowupReminder { id: string; studentId: string | null; title: string; dueOn: string; kind: "meeting" | "guide" | "learning" | "preparation" }
export function followupReminders(records: readonly TeacherFollowupRecord[], asOf: string): FollowupReminder[] {
  const reminders: FollowupReminder[] = [];
  for (const r of records) {
    const w = r.workflow;
    let due: string | null = null;
    let kind: FollowupReminder["kind"] | null = null;
    let title = "";
    if (w.kind === "family-meeting") { const event = latestFollowupEvent(records, r.id, "followup-resolution"); due = event?.workflow.kind === "followup-resolution" ? event.workflow.nextFollowupOn : w.followupOn; kind = "meeting"; title = "Veli görüşmesi takibi"; }
    if (w.kind === "family-meeting-task") { const check = latestFollowupEvent(records, r.id, "family-task-check"); due = check?.workflow.kind === "family-task-check" && check.workflow.completed ? null : w.dueOn; kind = "meeting"; title = `${w.owner === "family" ? "Aile" : "Öğretmen"} görevi: ${w.text}`; }
    if (w.kind === "guide-step") { const event = latestFollowupEvent(records, r.id, "guide-observation"); due = event?.workflow.kind === "guide-observation" ? event.workflow.nextFollowupOn : w.plannedOn; kind = "guide"; title = w.title; }
    if (w.kind === "learning-decision") { const event = latestFollowupEvent(records, r.id, "learning-reflection"); due = event?.workflow.kind === "learning-reflection" ? event.workflow.nextFollowupOn : w.reviewOn; kind = "learning"; title = "Eğitim adımını değerlendir"; }
    if (kind && due && due <= asOf) reminders.push({ id: r.id, studentId: r.studentId, title, dueOn: due, kind });
    if (w.kind === "preparation-list") for (const item of w.items) {
      const event = records.filter(e => e.workflow.kind === "preparation-check" && e.workflow.sourceId === r.id && e.workflow.itemId === item.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (item.dueOn <= asOf && !(event?.workflow.kind === "preparation-check" && event.workflow.completed)) reminders.push({ id: `${r.id}:${item.id}`, studentId: null, title: item.text, dueOn: item.dueOn, kind: "preparation" });
    }
  }
  return reminders.sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.title.localeCompare(b.title, "tr-TR"));
}
