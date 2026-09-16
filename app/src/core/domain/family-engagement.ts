import { civilDateInIstanbul, isCivilDate } from "./attendance.ts";
import type { ActiveClassroomScope } from "./classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "./model.ts";
import { studentContactsFromRecord, type StudentContact } from "./student.ts";
import { resolveSchoolDay } from "./school-calendar.ts";
import { isTeacherFollowupRecord } from "./teacher-followup.ts";

export const SETTING_TYPE = "family-engagement-v1" as const;
export const FAMILY_ENGAGEMENT_SETTING_TYPE = SETTING_TYPE;
export const FAMILY_ENGAGEMENT_KEYS = ["settingType", "academicYearId", "classroomId", "studentId", "workflow"] as const;
export const FAMILY_CHANNELS = ["phone", "sms", "messaging-app", "email", "in-person"] as const;
export const FAMILY_FORMATS = ["text", "voice", "large-print"] as const;
export type FamilyContact = Pick<StudentContact, "id" | "kind" | "relationship" | "phone"> & { name: string };
export type Availability = { kind: "availability"; scheduledOn: string; startTime: string; endTime: string; slotMinutes: number; calendarNote: string };
export type FamilyAppointment = { kind: "appointment"; appointmentId: string; previousEventId: string | null; availabilityId: string; contact: FamilyContact; scheduledOn: string; startTime: string; endTime: string; startsAtUtc: string; endsAtUtc: string; location: string; purpose: string; reason: string; calendarNote: string };
export type CommunicationPreference = { kind: "communication-preference"; contact: FamilyContact; previousEventId: string | null; status: "declared" | "withdrawn"; reportedOn: string; source: "oral" | "written"; channels: (typeof FAMILY_CHANNELS)[number][]; availableFrom: string | null; availableUntil: string | null; weekdays: number[]; language: string; formats: (typeof FAMILY_FORMATS)[number][]; note: string };
export type FamilyEngagementWorkflow = Availability
  | { kind: "availability-close"; availabilityId: string; reason: string }
  | FamilyAppointment
  | { kind: "appointment-cancel"; appointmentId: string; previousEventId: string; reason: string }
  | { kind: "appointment-meeting"; appointmentId: string; previousEventId: string; meetingId: string; actualAtUtc: string }
  | CommunicationPreference;
export type FamilyEngagementRecord = StoredRecord & ActiveClassroomScope & { settingType: typeof SETTING_TYPE; schemaVersion: 1; studentId: string | null; deletedAt: null; workflow: FamilyEngagementWorkflow };
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(v);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, fields: readonly string[]) => Object.keys(v).length === fields.length && fields.every(f => Object.hasOwn(v, f));
const text = (v: unknown, max = 1000): v is string => typeof v === "string" && v.length <= max && v === v.normalize("NFC").trim();
const required = (v: unknown, max = 1000) => text(v, max) && v.length > 0;
const day = (v: unknown): v is string => typeof v === "string" && isCivilDate(v);
const time = (v: unknown): v is string => typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(v);
const utc = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const nullableId = (v: unknown) => v === null || uuid(v);
const list = (v: unknown, values: readonly unknown[]) => Array.isArray(v) && v.length <= values.length && new Set(v).size === v.length && v.every(item => values.includes(item));
export function familyContactSnapshot(c: StudentContact): FamilyContact { return { id: c.id, kind: c.kind, name: c.name ?? "", relationship: c.relationship, phone: c.phone }; }
export function sameFamilyContact(a: FamilyContact, b: FamilyContact): boolean { return a.id === b.id && a.kind === b.kind && a.name === b.name && a.relationship === b.relationship && a.phone === b.phone; }
function contact(v: unknown): v is FamilyContact { return object(v) && exact(v, ["id", "kind", "name", "relationship", "phone"]) && uuid(v.id) && ["mother", "father", "other"].includes(String(v.kind)) && text(v.name, 200) && required(v.relationship, 120) && text(v.phone, 80); }
export function familyTimeMinutes(v: string): number { if (!time(v)) throw new Error("Saat SS:DD biçiminde olmalıdır."); return Number(v.slice(0, 2)) * 60 + Number(v.slice(3)); }
export function familyMinuteLabel(v: number): string { return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`; }
export function familyLocalToUtc(date: string, clock: string): string {
  if (!day(date) || !time(clock)) throw new Error("Randevu günü veya saati geçersiz.");
  const result = new Date(`${date}T${clock}:00+03:00`).toISOString();
  const formatted = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(result));
  if (civilDateInIstanbul(new Date(result)) !== date || formatted !== clock) throw new Error("Bu tarih İstanbul saat kuralıyla uyuşmuyor.");
  return result;
}
export function isFamilyEngagementRecord(v: unknown): v is FamilyEngagementRecord {
  if (!object(v) || !exact(v, ["id", "createdAt", "updatedAt", "civilDate", "schemaVersion", "deletedAt", ...FAMILY_ENGAGEMENT_KEYS]) || !uuid(v.id) || !utc(v.createdAt) || v.updatedAt !== v.createdAt || !day(v.civilDate) || v.civilDate !== civilDateInIstanbul(new Date(v.createdAt)) || v.schemaVersion !== 1 || v.deletedAt !== null || v.settingType !== SETTING_TYPE || !uuid(v.academicYearId) || !uuid(v.classroomId) || !nullableId(v.studentId) || !object(v.workflow)) return false;
  const w = v.workflow, shape = (fields: string[]) => exact(w, ["kind", ...fields]);
  if (["availability", "availability-close"].includes(String(w.kind)) !== (v.studentId === null)) return false;
  switch (w.kind) {
    case "availability": return shape(["scheduledOn", "startTime", "endTime", "slotMinutes", "calendarNote"]) && day(w.scheduledOn) && time(w.startTime) && time(w.endTime) && w.startTime < w.endTime && Number.isInteger(w.slotMinutes) && Number(w.slotMinutes) >= 5 && Number(w.slotMinutes) <= 120 && familyTimeMinutes(w.endTime) - familyTimeMinutes(w.startTime) >= Number(w.slotMinutes) && text(w.calendarNote);
    case "availability-close": return shape(["availabilityId", "reason"]) && uuid(w.availabilityId) && required(w.reason);
    case "appointment": {
      if (!(shape(["appointmentId", "previousEventId", "availabilityId", "contact", "scheduledOn", "startTime", "endTime", "startsAtUtc", "endsAtUtc", "location", "purpose", "reason", "calendarNote"]) && uuid(w.appointmentId) && nullableId(w.previousEventId) && uuid(w.availabilityId) && contact(w.contact) && day(w.scheduledOn) && time(w.startTime) && time(w.endTime) && w.startTime < w.endTime && utc(w.startsAtUtc) && utc(w.endsAtUtc) && required(w.location, 300) && required(w.purpose, 500) && text(w.reason) && text(w.calendarNote) && (w.previousEventId === null || required(w.reason)))) return false;
      try { return w.startsAtUtc === familyLocalToUtc(w.scheduledOn, w.startTime) && w.endsAtUtc === familyLocalToUtc(w.scheduledOn, w.endTime); } catch { return false; }
    }
    case "appointment-cancel": return shape(["appointmentId", "previousEventId", "reason"]) && uuid(w.appointmentId) && uuid(w.previousEventId) && required(w.reason);
    case "appointment-meeting": return shape(["appointmentId", "previousEventId", "meetingId", "actualAtUtc"]) && uuid(w.appointmentId) && uuid(w.previousEventId) && uuid(w.meetingId) && utc(w.actualAtUtc) && w.actualAtUtc <= v.createdAt;
    case "communication-preference": return shape(["contact", "previousEventId", "status", "reportedOn", "source", "channels", "availableFrom", "availableUntil", "weekdays", "language", "formats", "note"]) && contact(w.contact) && nullableId(w.previousEventId) && ["declared", "withdrawn"].includes(String(w.status)) && day(w.reportedOn) && w.reportedOn <= v.civilDate && ["oral", "written"].includes(String(w.source)) && list(w.channels, FAMILY_CHANNELS) && ((w.availableFrom === null && w.availableUntil === null) || (time(w.availableFrom) && time(w.availableUntil) && w.availableFrom < w.availableUntil)) && list(w.weekdays, [1, 2, 3, 4, 5, 6, 7]) && text(w.language, 120) && list(w.formats, FAMILY_FORMATS) && text(w.note) && (w.status !== "withdrawn" || required(w.note));
    default: return false;
  }
}
export function familyEngagementRecords(snapshot: DataSnapshot): FamilyEngagementRecord[] { return snapshot.settings.filter(isFamilyEngagementRecord).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)); }
export function familyScopeMatches(a: ActiveClassroomScope, b: StoredRecord | ActiveClassroomScope): boolean { return a.academicYearId === b.academicYearId && a.classroomId === b.classroomId; }
export function appointmentState(records: readonly FamilyEngagementRecord[], appointmentId: string) {
  const events = records.filter(r => "appointmentId" in r.workflow && r.workflow.appointmentId === appointmentId);
  const last = events.at(-1);
  const plan = events.filter(r => r.workflow.kind === "appointment").at(-1);
  return { events, last, plan, status: last?.workflow.kind === "appointment-cancel" ? "cancelled" as const : last?.workflow.kind === "appointment-meeting" ? "completed" as const : plan ? "scheduled" as const : "missing" as const };
}
export function currentAppointments(records: readonly FamilyEngagementRecord[]) { return [...new Set(records.flatMap(r => r.workflow.kind === "appointment" ? [r.workflow.appointmentId] : []))].map(id => appointmentState(records, id)); }
export function communicationPreferenceHead(records: readonly FamilyEngagementRecord[], scope: ActiveClassroomScope, studentId: string, contactId: string) { return records.filter(r => familyScopeMatches(scope, r) && r.studentId === studentId && r.workflow.kind === "communication-preference" && r.workflow.contact.id === contactId).at(-1); }
export function resolveCommunicationPreference(snapshot: DataSnapshot, scope: ActiveClassroomScope, studentId: string, contactId: string) {
  const current = studentContactsFromRecord(snapshot.students.find(s => s.id === studentId)?.contacts).find(c => c.id === contactId);
  const record = communicationPreferenceHead(familyEngagementRecords(snapshot), scope, studentId, contactId);
  const w = record?.workflow.kind === "communication-preference" ? record.workflow : null;
  return { record, preference: w, state: !current ? "contact-removed" : !w ? "not-declared" : !sameFamilyContact(familyContactSnapshot(current), w.contact) ? "contact-changed" : w.status === "withdrawn" ? "withdrawn" : "declared" } as const;
}
export function familyCalendarDay(snapshot: DataSnapshot, scope: ActiveClassroomScope, civilDate: string) {
  const academicYear = snapshot.academicYears.find(y => y.id === scope.academicYearId);
  if (!academicYear) throw new Error("Eğitim yılı bulunamadı.");
  return resolveSchoolDay({ academicYear, classroomId: scope.classroomId, civilDate, calendarEntries: snapshot.calendarEntries });
}
export function assertFamilyEngagementRelationships(snapshot: DataSnapshot): void {
  const all = snapshot.settings.filter(r => r.settingType === SETTING_TYPE);
  if (!all.every(isFamilyEngagementRecord) || new Set(all.map(r => r.id)).size !== all.length) throw new Error("Aile katılımı kaydı sözleşmesi geçersiz.");
  const records = familyEngagementRecords(snapshot), seen: FamilyEngagementRecord[] = [];
  for (const r of records) {
    const year = snapshot.academicYears.find(y => y.id === r.academicYearId);
    const classroom = snapshot.classrooms.find(c => c.id === r.classroomId && c.academicYearId === r.academicYearId);
    const child = r.studentId ? snapshot.students.find(s => s.id === r.studentId) : null;
    const historic = child && Array.isArray(child.enrollments) && child.enrollments.some(e => object(e) && e.academicYearId === r.academicYearId && e.classroomId === r.classroomId);
    if (!year || !classroom || (r.studentId !== null && (!child || (!familyScopeMatches(r, child) && !historic)))) throw new Error("Aile katılımı sınıf, yıl veya çocuk ilişkisi geçersiz.");
    const w = r.workflow;
    if (w.kind === "availability" || w.kind === "appointment") {
      if (!day(year.startDate) || !day(year.endDate) || w.scheduledOn < year.startDate || w.scheduledOn > year.endDate) throw new Error("Randevu eğitim yılı tarihleri dışında.");
    }
    if (w.kind === "availability-close") {
      const source = seen.find(e => e.id === w.availabilityId);
      if (!source || source.workflow.kind !== "availability" || !familyScopeMatches(r, source) || source.createdAt >= r.createdAt || seen.some(e => e.workflow.kind === "availability-close" && e.workflow.availabilityId === w.availabilityId)) throw new Error("Uygun saat kaynağı kapanmış veya geçersiz.");
      if (currentAppointments(seen).some(s => s.status === "scheduled" && s.plan?.workflow.kind === "appointment" && s.plan.workflow.availabilityId === source.id)) throw new Error("Randevulu saatleri kapatmadan önce randevuları değiştirin veya iptal edin.");
    }
    if ("appointmentId" in w) {
      const state = appointmentState(seen, w.appointmentId);
      if ((state.last?.id ?? null) !== w.previousEventId || (state.last && (state.last.createdAt >= r.createdAt || state.last.studentId !== r.studentId || !familyScopeMatches(r, state.last))) || (state.last && state.status !== "scheduled") || (!state.last && w.kind !== "appointment")) throw new Error("Randevu geçmişi dallanmış, eski veya farklı çocuğa ait.");
      if (w.kind === "appointment") {
        const source = seen.find(e => e.id === w.availabilityId);
        if (!source || source.workflow.kind !== "availability" || !familyScopeMatches(r, source) || source.createdAt >= r.createdAt || seen.some(e => e.workflow.kind === "availability-close" && e.workflow.availabilityId === source.id)) throw new Error("Randevunun uygun saat kaynağı geçersiz.");
        const a = source.workflow;
        if (w.scheduledOn !== a.scheduledOn || w.startTime < a.startTime || w.endTime > a.endTime || familyTimeMinutes(w.endTime) - familyTimeMinutes(w.startTime) !== a.slotMinutes || (familyTimeMinutes(w.startTime) - familyTimeMinutes(a.startTime)) % a.slotMinutes !== 0) throw new Error("Randevu seçilen saat aralığına uymuyor.");
        if (currentAppointments(seen).some(s => s.status !== "cancelled" && s.plan?.workflow.kind === "appointment" && s.plan.workflow.appointmentId !== w.appointmentId && s.plan.workflow.startsAtUtc < w.endsAtUtc && w.startsAtUtc < s.plan.workflow.endsAtUtc)) throw new Error("Öğretmenin başka bir sınıf veya yılda bu saatte randevusu var.");
      } else if (w.kind === "appointment-meeting") {
        const meeting = snapshot.settings.find(e => e.id === w.meetingId);
        if (!meeting || !isTeacherFollowupRecord(meeting) || meeting.workflow.kind !== "family-meeting" || meeting.studentId !== r.studentId || !familyScopeMatches(r, meeting) || meeting.createdAt > r.createdAt || meeting.civilDate !== civilDateInIstanbul(new Date(w.actualAtUtc)) || state.plan?.workflow.kind !== "appointment" || civilDateInIstanbul(new Date(w.actualAtUtc)) !== state.plan.workflow.scheduledOn || w.actualAtUtc < state.plan.workflow.startsAtUtc || seen.some(e => e.workflow.kind === "appointment-meeting" && e.workflow.meetingId === w.meetingId)) throw new Error("Randevu gerçek veli görüşmesiyle veya gerçekleşme tarihiyle uyuşmuyor.");
      }
    }
    if (w.kind === "communication-preference") {
      const head = communicationPreferenceHead(seen, r, r.studentId!, w.contact.id);
      if ((head?.id ?? null) !== w.previousEventId || (head && head.createdAt >= r.createdAt)) throw new Error("İletişim tercihi geçmişi eski veya dallanmış.");
    }
    seen.push(r);
  }
}
export function availableFamilySlots(snapshot: DataSnapshot, scope: ActiveClassroomScope, scheduledOn: string, excludeAppointmentId?: string) {
  const records = familyEngagementRecords(snapshot);
  const occupied = currentAppointments(records).filter(s => s.status !== "cancelled" && s.plan?.workflow.kind === "appointment" && s.plan.workflow.appointmentId !== excludeAppointmentId);
  const unique = new Set<string>();
  return records.flatMap(r => {
    if (!familyScopeMatches(scope, r) || r.workflow.kind !== "availability" || r.workflow.scheduledOn !== scheduledOn || records.some(e => e.workflow.kind === "availability-close" && e.workflow.availabilityId === r.id)) return [];
    const result: { availabilityId: string; startTime: string; endTime: string; available: boolean }[] = [];
    for (let minute = familyTimeMinutes(r.workflow.startTime); minute + r.workflow.slotMinutes <= familyTimeMinutes(r.workflow.endTime); minute += r.workflow.slotMinutes) {
      const startTime = familyMinuteLabel(minute), endTime = familyMinuteLabel(minute + r.workflow.slotMinutes), key = `${startTime}/${endTime}`;
      if (unique.has(key)) continue; unique.add(key);
      const starts = familyLocalToUtc(scheduledOn, startTime), ends = familyLocalToUtc(scheduledOn, endTime);
      result.push({ availabilityId: r.id, startTime, endTime, available: !occupied.some(s => s.plan?.workflow.kind === "appointment" && s.plan.workflow.startsAtUtc < ends && starts < s.plan.workflow.endsAtUtc) });
    }
    return result;
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));
}
export function familyEngagementReminders(snapshot: DataSnapshot, today: string): { id: string; studentId: string | null; title: string; dueOn: string; section: "appointments" | "communication"; academicYearId: string; classroomId: string }[] {
  if (!day(today)) return [];
  return currentAppointments(familyEngagementRecords(snapshot)).flatMap(s => s.status === "scheduled" && s.plan?.workflow.kind === "appointment" && s.plan.workflow.scheduledOn <= today ? [{ id: s.plan.workflow.appointmentId, studentId: s.plan.studentId, title: s.plan.workflow.scheduledOn === today ? `Veli randevusu · ${s.plan.workflow.startTime}` : "Veli randevusunun sonucunu kaydet", dueOn: s.plan.workflow.scheduledOn, section: "appointments" as const, academicYearId: s.plan.academicYearId, classroomId: s.plan.classroomId }] : []);
}
