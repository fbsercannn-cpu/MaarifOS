import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
import { familyContactSnapshot } from "../../src/core/domain/family-engagement.ts";
import { studentContactsFromRecord } from "../../src/core/domain/student.ts";
import { executeFamilyEngagement } from "../../src/features/family-engagement/family-engagement-service.ts";
export const familyUid = n => `a1000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const familyScope = { academicYearId: familyUid(1), classroomId: familyUid(2) };
export const familyStudentId = familyUid(3);
export const familyNow = new Date("2026-09-18T09:00:00.000Z");
export function familyFixture() {
  const s = createEmptySnapshot(), base = { createdAt: "2026-09-01T06:00:00.000Z", updatedAt: "2026-09-01T06:00:00.000Z", civilDate: "2026-09-01", schemaVersion: 1, deletedAt: null };
  s.academicYears.push({ ...base, id: familyScope.academicYearId, name: "2026–2027 Kurgu Yıl", startDate: "2026-09-01", operationalStartDate: "2026-09-01", endDate: "2027-06-30", status: "active" });
  s.classrooms.push({ ...base, ...familyScope, id: familyScope.classroomId, name: "Kurgu Randevu Sınıfı", schoolName: "Kurgu Anaokulu", teacherName: "Kurgu Öğretmen" });
  s.students.push({ ...base, ...familyScope, id: familyStudentId, displayName: "Kurgu Randevu Çocuğu", active: true, enrollments: [{ id: familyUid(4), ...familyScope, startedOn: "2026-09-01", status: "active", schemaVersion: 1 }], contacts: [
    { id: familyUid(5), kind: "mother", relationship: "Anne", name: "Kurgu Anne", phone: "", isPrimary: true },
    { id: familyUid(6), kind: "father", relationship: "Baba", name: "Kurgu Baba", phone: "", isPrimary: false },
    { id: familyUid(7), kind: "other", relationship: "Teyze", name: "Kurgu Yakın", phone: "", isPrimary: false },
  ] });
  s.settings.push({ ...base, ...familyScope, id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE }); return s;
}
export class FamilyMemoryStore {
  constructor(snapshot = familyFixture()) { this.snapshot = structuredClone(snapshot); this.queue = Promise.resolve(); this.failWrites = false; }
  async readSnapshot() { return structuredClone(this.snapshot); }
  transaction(mode, collections, task) {
    const run = async () => {
      const working = structuredClone(this.snapshot), allowed = new Set(collections);
      const check = (name, write = false) => { if (!allowed.has(name) || (write && mode !== "readwrite")) throw new Error("Kurgu işlem kapsamı geçersiz."); };
      const result = await task({ getAll: async name => { check(name); return structuredClone(working[name]); }, putMany: async (name, rows) => { check(name, true); if (this.failWrites) throw new Error("Kurgu disk kesintisi"); for (const row of rows) { const index = working[name].findIndex(r => r.id === row.id); if (index < 0) working[name].push(structuredClone(row)); else working[name][index] = structuredClone(row); } }, clear: async name => { check(name, true); working[name] = []; } });
      if (mode === "readwrite") this.snapshot = working; return result;
    };
    const next = this.queue.then(run, run); this.queue = next.then(() => undefined, () => undefined); return next;
  }
  close() {}
}
export function familyPreference(contact, previousEventId = null, overrides = {}) {
  return { contact: familyContactSnapshot(contact), previousEventId, status: "declared", reportedOn: "2026-09-18", source: "oral", channels: ["phone"], availableFrom: "14:00", availableUntil: "16:00", weekdays: [5], language: "Türkçe", formats: ["text"], note: "Kurgu yakının açık bildirimi", ...overrides };
}
/** Real service seed for combined encrypted-backup/deletion checks. A real stored contact is required. */
export async function seedFamilyEngagementFixture(store, { scope = familyScope, studentId = familyStudentId, now = familyNow, includeMeeting = true } = {}) {
  const snapshot = await store.readSnapshot(), contact = studentContactsFromRecord(snapshot.students.find(s => s.id === studentId)?.contacts)[0];
  if (!contact) throw new Error("Kurgu aile seed'i için öğrencide bir gerçek contact kaydı bulunmalıdır.");
  const call = command => executeFamilyEngagement(store, { scope, command, now });
  const availability = await call({ action: "availability", availability: { scheduledOn: "2026-09-18", startTime: "14:00", endTime: "16:00", slotMinutes: 20, calendarNote: "" } });
  const preference = await call({ action: "preference", studentId, preference: familyPreference(contact) });
  const appointment = await call({ action: "appointment", studentId, appointment: { previousEventId: null, availabilityId: availability.id, contact: familyContactSnapshot(contact), scheduledOn: "2026-09-18", startTime: "14:00", endTime: "14:20", location: "Kurgu görüşme odası", purpose: "Uyum sürecini birlikte değerlendirme", reason: "", calendarNote: "" } });
  const meeting = includeMeeting ? await executeFamilyEngagement(store, { scope, now: new Date("2026-09-18T12:00:00.000Z"), command: { action: "meeting", appointmentId: appointment.workflow.appointmentId, expectedEventId: appointment.id, actualAtUtc: "2026-09-18T11:00:00.000Z", participants: contact.name || contact.relationship, discussion: "Kurgu uyum görüşmesi", decision: "Bir hafta sonra yeniden görüşme", followupOn: "2026-09-25" } }) : null;
  return { availability, preference, appointment, meeting };
}
