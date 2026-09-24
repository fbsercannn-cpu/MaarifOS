import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { attendanceRecordKey, civilDateInIstanbul, resolveAttendanceRecords } from "../../core/domain/attendance.ts";
import { recordBelongsToClassroomScope, resolveActiveClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { availableFamilySlots, currentAppointments, familyContactSnapshot, familyEngagementRecords, familyCalendarDay, familyLocalToUtc } from "../../core/domain/family-engagement.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type CollectionName, type DataSnapshot, type StoredRecord } from "../../core/domain/model.ts";
import { studentContactsFromRecord } from "../../core/domain/student.ts";
import { resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import { followupReminders, isTeacherFollowupRecord, teacherFollowups, TEACHER_FOLLOWUP_SETTING_TYPE, type TeacherFollowupRecord, type TeacherWorkflow } from "../../core/domain/teacher-followup.ts";
import { isEntityRecord } from "../../core/repository/entities.ts";
import type { DataTransaction, LocalDataStore } from "../../core/repository/contracts.ts";
import { addDays, supportPeriod } from "../action-center/action-center-model.ts";
import { ensureWeek } from "../action-center/action-center-service.ts";
import { executeFamilyEngagement, type FamilyEngagementCommand } from "../family-engagement/family-engagement-service.ts";
import { applyLearningDecisionToPlan, notifyFollowupChanged } from "./teacher-followup-service.ts";

export type PreparedTeacherMode = "all" | "support" | "focus" | "family";
export type PreparedTeacherRequest =
  | { kind: "support"; sourceId: string; choice: "carry" | "observe" | "close" }
  | { kind: "focus"; activityId: string; studentIds: string[] }
  | { kind: "family"; sourceId: string; choiceId: string };
export interface PreparedTeacherOption { id: string; label: string; detail: string; request: PreparedTeacherRequest }
export interface PreparedTeacherCard { id: string; kind: "support" | "focus" | "family"; title: string; detail: string; evidence: { id: string; date: string; text: string }[]; options: PreparedTeacherOption[]; students?: { id: string; name: string; count: number }[] }
export interface PreparedTeacherModel { scope: ActiveClassroomScope | null; civilDate: string; fingerprint: string; cards: PreparedTeacherCard[]; focuses: { studentId: string; studentName: string; activityId: string; activityTitle: string; planId: string }[] }
export interface PreparedTeacherResult { summary: string; recordIds: string[]; planId?: string; activityId?: string; studentIds?: string[]; appointmentId?: string; scheduledOn?: string; alreadyCompleted?: boolean }
const STALE = "Bu seçeneğin kaynakları değişti. Güncel seçenekler yeniden hazırlanmalı; kayıt yazılmadı.";
const live = (r: StoredRecord) => typeof r.deletedAt !== "string";
const childHas = (r: StoredRecord, id: string) => r.studentId === id || (Array.isArray(r.studentIds) && r.studentIds.includes(id));
const fingerprint = (data: DataSnapshot) => canonicalJson(Object.fromEntries(COLLECTION_NAMES.map(name => [name, [...data[name]].sort((a,b) => a.id.localeCompare(b.id))])));
async function read(tx: DataTransaction) { const data = createEmptySnapshot(); for (const name of COLLECTION_NAMES) data[name] = await tx.getAll(name); return data; }
function memory(data: DataSnapshot): LocalDataStore { return { readSnapshot: async () => structuredClone(data), close() {}, transaction: async (_mode, _names, task) => task({ getAll: async name => structuredClone(data[name]) as never, clear: async name => { data[name] = []; }, putMany: async (name: CollectionName, rows: readonly StoredRecord[]) => { for (const row of rows) { const i = data[name].findIndex(r => r.id === row.id); if (i < 0) data[name].push(structuredClone(row)); else data[name][i] = structuredClone(row); } } }) }; }
function append(data: DataSnapshot, scope: ActiveClassroomScope, studentId: string, workflow: TeacherWorkflow, now: Date) {
  const at = new Date(Math.max(now.getTime(), ...data.settings.map(r => (Date.parse(r.createdAt) || 0) + 1))).toISOString();
  const record: TeacherFollowupRecord = { id: crypto.randomUUID(), ...scope, studentId, workflow, settingType: TEACHER_FOLLOWUP_SETTING_TYPE, schemaVersion: 1, createdAt: at, updatedAt: at, civilDate: civilDateInIstanbul(now), deletedAt: null };
  if (!isTeacherFollowupRecord(record)) throw new Error("Hazırlanan takip kaydı doğrulanamadı.");
  data.settings.push(record); return record;
}
function eligible(data: DataSnapshot, scope: ActiveClassroomScope, student: StoredRecord, day: string) {
  const year = data.academicYears.find(y => y.id === scope.academicYearId)!;
  const member = resolveStudentMembershipOn(student, { ...scope, academicYear: year, civilDate: day });
  return live(student) && student.active !== false && recordBelongsToClassroomScope(student, scope) && member.eligible && !member.issues.length;
}
function familyChoices(data: DataSnapshot, scope: ActiveClassroomScope, source: TeacherFollowupRecord, now: Date) {
  if (source.workflow.kind !== "learning-decision" || source.workflow.support !== "family-cooperation") return [];
  const student = data.students.find(s => s.id === source.studentId); if (!student) return [];
  const records = familyEngagementRecords(data), today = civilDateInIstanbul(now);
  const dates = [...new Set(records.flatMap(r => recordBelongsToClassroomScope(r, scope) && r.workflow.kind === "availability" && r.workflow.scheduledOn >= today ? [r.workflow.scheduledOn] : []))].sort().slice(0, 10);
  const contacts = studentContactsFromRecord(student.contacts).filter(c => c.name?.trim() || c.phone.trim());
  const classroom = data.classrooms.find(c => c.id === scope.classroomId)!;
  const previous = currentAppointments(records).filter(s => s.plan && recordBelongsToClassroomScope(s.plan, scope) && s.plan.workflow.kind === "appointment").at(-1)?.plan;
  const location = previous?.workflow.kind === "appointment" ? previous.workflow.location : String(classroom.name ?? "Sınıf");
  return dates.flatMap(day => !eligible(data, scope, student, day) || !familyCalendarDay(data, scope, day).isTeachingDay ? [] : availableFamilySlots(data, scope, day).filter(s => s.available && familyLocalToUtc(day, s.startTime) >= now.toISOString()).slice(0, 3).flatMap(slot => contacts.map(contact => ({ id: `${slot.availabilityId}/${slot.startTime}/${contact.id}`, label: `${day} · ${slot.startTime}–${slot.endTime} · ${contact.name || contact.relationship}`, detail: `${location} · Görüşme konusu: ${source.workflow.kind === "learning-decision" ? source.workflow.teacherDecision : ""}`, command: { action: "appointment", studentId: student.id, appointment: { previousEventId: null, availabilityId: slot.availabilityId, contact: familyContactSnapshot(contact), scheduledOn: day, startTime: slot.startTime, endTime: slot.endTime, location, purpose: `Kayıtlı destek kararını aileyle görüşme: ${source.workflow.kind === "learning-decision" ? source.workflow.teacherDecision : ""}`.slice(0, 500).trim(), reason: "Öğretmenin seçtiği destek kararından hazırlandı.", calendarNote: "" } } satisfies FamilyEngagementCommand })))).slice(0, 12);
}
export function preparedTeacherActionsModel(data: DataSnapshot, input: { now?: Date; studentId?: string; mode?: PreparedTeacherMode } = {}): PreparedTeacherModel {
  const now = input.now ?? new Date(), today = civilDateInIstanbul(now), scope = resolveActiveClassroomScope(data);
  const model: PreparedTeacherModel = { scope, civilDate: today, fingerprint: fingerprint(data), cards: [], focuses: [] };
  if (!scope || data.academicYears.find(y => y.id === scope.academicYearId)?.status === "archived") return model;
  const mode = input.mode ?? "all", records = teacherFollowups(data).filter(r => recordBelongsToClassroomScope(r, scope));
  const students = data.students.filter(s => (!input.studentId || s.id === input.studentId) && eligible(data, scope, s, today));
  const sourceEvidence = (source: TeacherFollowupRecord) => data.observations.filter(o => live(o) && recordBelongsToClassroomScope(o, scope) && childHas(o, source.studentId!) && o.civilDate <= today && (o.civilDate >= source.civilDate || (source.workflow.kind === "learning-decision" && source.workflow.observationIds.includes(o.id)))).sort((a,b) => a.civilDate.localeCompare(b.civilDate)).map(o => ({ id: o.id, date: o.civilDate, text: String(o.rawText ?? "") }));
  if (mode === "all" || mode === "support") for (const reminder of followupReminders(records, today).filter(r => r.kind === "learning")) {
    const source = records.find(r => r.id === reminder.id)!; if (source.workflow.kind !== "learning-decision" || !students.some(s => s.id === source.studentId)) continue;
    const period = supportPeriod(data, scope, today), name = String(students.find(s => s.id === source.studentId)!.displayName);
    const options: PreparedTeacherOption[] = period ? [{ id: "carry", label: "Aynı desteği gelecek haftaya taşı", detail: `${period.start}–${period.end} · mevcut plan varsa kullanılır; ${period.end} günü yeni takip açılır.`, request: { kind: "support", sourceId: source.id, choice: "carry" } }, { id: "observe", label: "Yeni gözlem fırsatını haftaya planla", detail: `${period.start}–${period.end} · benzer bağlamda yeniden gözlem niyeti plana ve takibe kaydedilir.`, request: { kind: "support", sourceId: source.id, choice: "observe" } }] : [];
    options.push({ id: "close", label: "Bu takibi kapatmayı seçiyorum", detail: "Öğretmenin takip kararı kaydedilir. Gelişim başarısı veya uygulama sonucu eklenmez.", request: { kind: "support", sourceId: source.id, choice: "close" } });
    model.cards.push({ id: source.id, kind: "support", title: `${name} · destek takibini tamamla`, detail: source.workflow.teacherDecision, evidence: sourceEvidence(source), options });
  }
  if (mode === "all" || mode === "focus") {
    for (const record of records) {
      if (record.workflow.kind !== "observation-focus" || record.civilDate !== today || !students.some(s => s.id === record.studentId)) continue;
      const activity = data.activities.find(a => a.id === (record.workflow as { activityId: string }).activityId && live(a));
      if (!activity) continue;
      model.focuses.push({ studentId: record.studentId!, studentName: String(students.find(s => s.id === record.studentId)!.displayName), activityId: activity.id, activityTitle: String(activity.title), planId: record.workflow.planId });
    }
    const attendance = resolveAttendanceRecords(data.attendanceRecords).latestByKey;
    const recent = data.observations.filter(o => live(o) && recordBelongsToClassroomScope(o, scope) && o.civilDate >= addDays(today, -13) && o.civilDate <= today);
    for (const activity of data.activities.filter(a => live(a) && recordBelongsToClassroomScope(a, scope) && a.civilDate === today && a.activityKind !== "spontaneous-observation" && a.status !== "completed" && a.status !== "cancelled")) {
      const plan = data.plans.find(p => p.id === activity.planId && live(p) && p.planType === "daily" && recordBelongsToClassroomScope(p, scope)); if (!plan) continue;
      const candidates = students.filter(s => ["present", "late"].includes(attendance.get(attendanceRecordKey(s.id, today))?.status ?? "") && (activity.assignmentMode === "whole-class" || (Array.isArray(activity.studentIds) && activity.studentIds.includes(s.id))) && !records.some(r => r.studentId === s.id && r.workflow.kind === "observation-focus" && r.workflow.activityId === activity.id)).map(s => ({ id: s.id, name: String(s.displayName), count: recent.filter(o => childHas(o, s.id)).length })).sort((a,b) => a.count-b.count || a.name.localeCompare(b.name, "tr-TR") || a.id.localeCompare(b.id)).slice(0, 6);
      if (!candidates.length) continue;
      model.cards.push({ id: `focus:${activity.id}`, kind: "focus", title: `${String(activity.title)} · gözlem odağı`, detail: `${today} · ${String(plan.title)}. Son 14 günün kayıt sayısına göre; bugün yoklamada burada olan çocuklar.`, evidence: [], students: candidates, options: [{ id: "focus", label: "Seçili çocukları bu etkinliğin gözlem odağına kaydet", detail: "Etkinliğe ve günlük plana bağlı gözlem niyeti kaydolur; gözlem metni veya yoklama oluşturulmaz.", request: { kind: "focus", activityId: activity.id, studentIds: candidates.slice(0,3).map(s => s.id) } }] });
    }
  }
  if (mode === "all" || mode === "family") for (const source of records.filter(r => r.workflow.kind === "learning-decision" && r.workflow.support === "family-cooperation" && students.some(s => s.id === r.studentId))) {
    if (records.some(r => r.workflow.kind === "family-preparation-link" && r.workflow.sourceId === source.id)) continue;
    const options = familyChoices(data, scope, source, now);
    if (options.length) model.cards.push({ id: `family:${source.id}`, kind: "family", title: `${String(students.find(s => s.id === source.studentId)!.displayName)} · veli görüşmesini hazırla`, detail: "Kayıtlı veli ve öğretmenin önceden belirlediği uygun saatler. Seçim yerel randevu hazırlığını kaydeder; davet göndermez.", evidence: sourceEvidence(source), options: options.map(o => ({ id: o.id, label: o.label, detail: o.detail, request: { kind: "family", sourceId: source.id, choiceId: o.id } })) });
  }
  return model;
}
export async function loadPreparedTeacherActions(store: LocalDataStore, input: { now?: Date; studentId?: string; mode?: PreparedTeacherMode } = {}) { return preparedTeacherActionsModel(await store.readSnapshot(), input); }
export async function applyPreparedTeacherAction(store: LocalDataStore, input: { request: PreparedTeacherRequest; expectedFingerprint: string; now?: Date }): Promise<PreparedTeacherResult> {
  const { assertDataSnapshotRelationships } = await import("../../core/backup/schema.ts");
  const now = input.now ?? new Date();
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const data = await read(tx), before = structuredClone(data), model = preparedTeacherActionsModel(data, { now }), scope = model.scope;
    if (!scope || model.fingerprint !== input.expectedFingerprint) throw new Error(STALE);
    const request = input.request;
    let option = model.cards.flatMap(c => c.options).find(o => canonicalJson(o.request) === canonicalJson(request));
    if (request.kind === "focus") {
      const card = model.cards.find(c => c.id === `focus:${request.activityId}`);
      if (card && request.studentIds.length > 0 && request.studentIds.length <= 3 && new Set(request.studentIds).size === request.studentIds.length && request.studentIds.every(id => card.students?.some(s => s.id === id))) option = card.options[0];
    }
    if (!option) throw new Error(STALE);
    const staged = memory(data); let outcome: PreparedTeacherResult;
    if (request.kind === "focus") {
      const activity = data.activities.find(a => a.id === request.activityId)!;
      const rows = request.studentIds.map(studentId => append(data, scope, studentId, { kind: "observation-focus", planId: String(activity.planId), activityId: activity.id }, now));
      outcome = { summary: `${rows.length} çocuk bu etkinliğin gözlem odağına kaydedildi.`, recordIds: rows.map(r => r.id), activityId: activity.id, planId: String(activity.planId), studentIds: request.studentIds };
    } else if (request.kind === "family") {
      const source = teacherFollowups(data).find(r => r.id === request.sourceId)!;
      const choice = familyChoices(data, scope, source, now).find(c => c.id === request.choiceId); if (!choice) throw new Error(STALE);
      const appointment = await executeFamilyEngagement(staged, { scope, command: choice.command, now });
      if (appointment.workflow.kind !== "appointment") throw new Error(STALE);
      const link = append(data, scope, source.studentId!, { kind: "family-preparation-link", sourceId: source.id, appointmentId: appointment.workflow.appointmentId }, now);
      outcome = { summary: `${appointment.workflow.scheduledOn} ${appointment.workflow.startTime} · yerel görüşme hazırlığı ve destek bağlantısı kaydedildi.`, recordIds: [appointment.id, link.id], appointmentId: appointment.workflow.appointmentId, scheduledOn: appointment.workflow.scheduledOn };
    } else {
      const source = teacherFollowups(data).find(r => r.id === request.sourceId)!; if (source.workflow.kind !== "learning-decision") throw new Error(STALE);
      const reflection = append(data, scope, source.studentId!, { kind: "learning-reflection", sourceId: source.id, reflection: request.choice === "close" ? "Öğretmen bu destek takibini kapatmayı seçti. Bu kayıt gelişim başarısı veya uygulama sonucu bildirmez." : "Öğretmen kayıtlı kaynakları inceleyerek yeni bir destek dönemi planlamayı seçti. Uygulama sonucu veya gelişim başarısı bildirilmedi.", nextStep: request.choice === "close" ? "Bu karar için yeni takip açılmadı." : option.label, nextFollowupOn: null }, now);
      outcome = { summary: "Destek takibi öğretmen seçimiyle kapatıldı.", recordIds: [reflection.id] };
      if (request.choice !== "close") {
        const period = supportPeriod(data, scope, civilDateInIstanbul(now)); if (!period) throw new Error(STALE);
        const text = request.choice === "carry" ? source.workflow.teacherDecision : "Benzer bağlamda yeni bir gözlem fırsatı sunacağım. Çocuğun gerçek eylemini ve varsa kendi sözünü yeni bir gözlem olarak kaydedeceğim.";
        const decision = append(data, scope, source.studentId!, { kind: "learning-decision", observationIds: [...source.workflow.observationIds], support: request.choice === "carry" ? source.workflow.support : "observe-again", teacherDecision: text, targetWeekStart: period.start, targetWeekEnd: period.end, reviewOn: period.end }, now);
        const week = ensureWeek(data, scope, period, now);
        const link = await applyLearningDecisionToPlan(staged, { decisionId: decision.id, planId: week.id, expectedUpdatedAt: week.updatedAt, appliedText: text, now });
        const chain = append(data, scope, source.studentId!, { kind: "learning-continuation", sourceId: source.id, nextDecisionId: decision.id, reflectionId: reflection.id }, now);
        outcome = { summary: `${period.start}–${period.end} haftasına destek ve ${period.end} tarihli takip kaydedildi. Önceki takip kapatıldı.`, recordIds: [reflection.id, decision.id, link.id, chain.id], planId: week.id };
      }
    }
    for (const collection of COLLECTION_NAMES) for (const row of data[collection]) if (!isEntityRecord(collection, row)) throw new Error("Hazırlanan kayıt sözleşmesi doğrulanamadı.");
    assertDataSnapshotRelationships(data, civilDateInIstanbul(now));
    for (const name of COLLECTION_NAMES) { const old = new Map(before[name].map(r => [r.id, canonicalJson(r)])); const changed = data[name].filter(r => old.get(r.id) !== canonicalJson(r)); if (changed.length) await tx.putMany(name, changed); }
    return outcome;
  });
  notifyFollowupChanged(); return result;
}
