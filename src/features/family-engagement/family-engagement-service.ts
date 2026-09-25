import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { assertFamilyEngagementRelationships, appointmentState, familyCalendarDay, familyContactSnapshot, familyEngagementRecords, familyLocalToUtc, familyScopeMatches, isFamilyEngagementRecord, sameFamilyContact, SETTING_TYPE, type Availability, type CommunicationPreference, type FamilyAppointment, type FamilyEngagementRecord, type FamilyEngagementWorkflow } from "../../core/domain/family-engagement.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot } from "../../core/domain/model.ts";
import { studentContactsFromRecord } from "../../core/domain/student.ts";
import { resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import { assertTeacherFollowupRelationships, TEACHER_FOLLOWUP_SETTING_TYPE, type TeacherFollowupRecord } from "../../core/domain/teacher-followup.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";

export const FAMILY_ENGAGEMENT_CHANGED_EVENT = "maarifos:family-engagement-changed";
export type FamilyEngagementCommand =
  | { action: "availability"; availability: Omit<Availability, "kind"> }
  | { action: "close-availability"; availabilityId: string; reason: string }
  | { action: "appointment"; studentId: string; appointment: Omit<FamilyAppointment, "kind" | "appointmentId" | "startsAtUtc" | "endsAtUtc">; appointmentId?: string }
  | { action: "cancel"; appointmentId: string; expectedEventId: string; reason: string }
  | { action: "meeting"; appointmentId: string; expectedEventId: string; actualAtUtc: string; participants: string; discussion: string; decision: string; followupOn: string | null }
  | { action: "preference"; studentId: string; preference: Omit<CommunicationPreference, "kind"> };
function normalize<T>(value: T): T { return (typeof value === "string" ? value.normalize("NFC").trim() : Array.isArray(value) ? value.map(normalize) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)])) : value) as T; }
export async function readFamilyEngagementSnapshot(store: LocalDataStore): Promise<DataSnapshot> {
  return store.transaction("readonly", COLLECTION_NAMES, async transaction => {
    const snapshot = createEmptySnapshot();
    for (const collection of COLLECTION_NAMES) snapshot[collection] = await transaction.getAll(collection);
    return snapshot;
  });
}
export async function executeFamilyEngagement(store: LocalDataStore, input: { scope: ActiveClassroomScope; command: FamilyEngagementCommand; now?: Date }): Promise<FamilyEngagementRecord> {
  const command = normalize(structuredClone(input.command)), requestedScope = structuredClone(input.scope), now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Kayıt saati geçersiz.");
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async transaction => {
    const snapshot = createEmptySnapshot();
    for (const collection of COLLECTION_NAMES) snapshot[collection] = await transaction.getAll(collection);
    const scope = resolveActiveClassroomScope(snapshot);
    if (!scope || !familyScopeMatches(requestedScope, scope)) throw new Error("Etkin sınıf değişti. Aile katılımı alanını yeniden açın.");
    const year = snapshot.academicYears.find(y => y.id === scope.academicYearId);
    if (!year || year.status === "archived" || typeof year.deletedAt === "string") throw new Error("Arşivlenmiş eğitim yılına kayıt yapılamaz.");
    assertFamilyEngagementRelationships(snapshot);
    assertTeacherFollowupRelationships(snapshot);
    const records = familyEngagementRecords(snapshot);
    const max = snapshot.settings.filter(r => r.settingType === SETTING_TYPE || r.settingType === TEACHER_FOLLOWUP_SETTING_TYPE).reduce((v, r) => Math.max(v, Date.parse(r.createdAt)), 0);
    if (max > now.getTime() + 60_000) throw new Error("Cihaz saati önceki kayıtların gerisinde. Saati kontrol edin.");
    const createdAt = new Date(Math.max(now.getTime(), max + 1)).toISOString(), today = civilDateInIstanbul(now);
    let studentId: string | null = null;
    let workflow: FamilyEngagementWorkflow;
    let meeting: TeacherFollowupRecord | null = null;
    if (command.action === "availability") {
      workflow = { kind: "availability", ...command.availability };
      if (workflow.scheduledOn < today || familyLocalToUtc(workflow.scheduledOn, workflow.endTime) <= now.toISOString()) throw new Error("Uygun saat aralığı geçmişte olamaz.");
    } else if (command.action === "close-availability") workflow = { kind: "availability-close", availabilityId: command.availabilityId, reason: command.reason };
    else if (command.action === "appointment") {
      studentId = command.studentId;
      if (command.appointment.previousEventId !== null && !command.appointmentId) throw new Error("Değiştirilen randevunun kimliği eksik.");
      workflow = { kind: "appointment", ...command.appointment, appointmentId: command.appointmentId ?? crypto.randomUUID(), startsAtUtc: familyLocalToUtc(command.appointment.scheduledOn, command.appointment.startTime), endsAtUtc: familyLocalToUtc(command.appointment.scheduledOn, command.appointment.endTime) };
      if (workflow.startsAtUtc < now.toISOString()) throw new Error("Geçmiş saate yeni randevu planlanamaz.");
    } else if (command.action === "preference") {
      studentId = command.studentId; workflow = { kind: "communication-preference", ...command.preference };
    } else {
      const state = appointmentState(records, command.appointmentId);
      if (!state.plan || !state.last || state.last.id !== command.expectedEventId || !familyScopeMatches(scope, state.plan) || state.status !== "scheduled") throw new Error("Randevu başka oturumda değişti. Son kaydı açıp yeniden deneyin.");
      studentId = state.plan.studentId;
      if (command.action === "cancel") workflow = { kind: "appointment-cancel", appointmentId: command.appointmentId, previousEventId: command.expectedEventId, reason: command.reason };
      else {
        if (!Number.isFinite(Date.parse(command.actualAtUtc)) || command.actualAtUtc > now.toISOString()) throw new Error("Gerçekleşmiş görüşme gelecekte kaydedilemez.");
        meeting = { id: crypto.randomUUID(), ...scope, settingType: TEACHER_FOLLOWUP_SETTING_TYPE, schemaVersion: 1, studentId, createdAt, updatedAt: createdAt, civilDate: civilDateInIstanbul(new Date(command.actualAtUtc)), deletedAt: null, workflow: { kind: "family-meeting", participants: command.participants, discussion: command.discussion, decision: command.decision, followupOn: command.followupOn } };
        workflow = { kind: "appointment-meeting", appointmentId: command.appointmentId, previousEventId: command.expectedEventId, meetingId: meeting.id, actualAtUtc: command.actualAtUtc };
      }
    }
    if (studentId !== null) {
      const child = snapshot.students.find(s => s.id === studentId);
      // Cancellation remains available for a child who left; new plans/preferences require an active child.
      if (!child || (workflow.kind !== "appointment-cancel" && typeof child.deletedAt === "string") || ((workflow.kind === "appointment" || workflow.kind === "communication-preference") && (child.active === false || !familyScopeMatches(scope, child)))) throw new Error("Etkin sınıftaki kayıtlı çocuğu seçin.");
      if ("contact" in workflow) {
        const current = studentContactsFromRecord(child.contacts).find(c => c.id === workflow.contact.id);
        if (!current || !sameFamilyContact(familyContactSnapshot(current), workflow.contact)) throw new Error("Yakın kişinin bilgileri değişmiş veya kaldırılmış. Güncel kişiyi yeniden seçin.");
      }
      if (workflow.kind === "appointment") {
        const member = resolveStudentMembershipOn(child, { ...scope, academicYear: year, civilDate: workflow.scheduledOn });
        if (!member.eligible || member.issues.length) throw new Error("Çocuk randevu gününde doğrulanmış sınıf üyeliği kapsamında değil.");
      }
    }
    if (workflow.kind === "availability" || workflow.kind === "appointment") {
      const calendar = familyCalendarDay(snapshot, scope, workflow.scheduledOn);
      if (["invalid-calendar", "before-operational-start", "after-academic-year"].includes(calendar.reason)) throw new Error("Randevu günü etkin eğitim yılı çalışma aralığı dışında.");
      if (!calendar.isTeachingDay && !workflow.calendarNote) throw new Error("Seçilen gün tatil veya okul kapanışı var. Bu günde görüşme gerekçesini açıkça yazın.");
    }
    const record: FamilyEngagementRecord = { id: crypto.randomUUID(), ...scope, studentId, settingType: SETTING_TYPE, schemaVersion: 1, createdAt, updatedAt: createdAt, civilDate: civilDateInIstanbul(new Date(createdAt)), deletedAt: null, workflow };
    if (!isFamilyEngagementRecord(record)) throw new Error("Randevu veya iletişim tercihi alanlarını ve saatlerini kontrol edin.");
    if (meeting) snapshot.settings.push(meeting);
    snapshot.settings.push(record);
    assertFamilyEngagementRelationships(snapshot); assertTeacherFollowupRelationships(snapshot);
    await transaction.putMany("settings", meeting ? [meeting, record] : [record]);
    return record;
  });
  if (typeof window !== "undefined") { window.dispatchEvent(new Event(FAMILY_ENGAGEMENT_CHANGED_EVENT)); window.dispatchEvent(new Event("maarifos:teacher-followup-changed")); }
  return result;
}
