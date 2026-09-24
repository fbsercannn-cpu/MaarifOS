import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
export const accountingId = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const accountingScope = { academicYearId: accountingId(7101), classroomId: accountingId(7102) };
export function accountingRecord(n, fields = {}) { return { id: accountingId(n), ...accountingScope, civilDate: "2026-09-14", createdAt: "2026-09-14T06:00:00.000Z", updatedAt: "2026-09-14T06:00:00.000Z", deletedAt: null, schemaVersion: 1, ...fields }; }
export function accountingEpisode(n, startedOn, fields = {}) { return { id: accountingId(n), ...accountingScope, startedOn, status: "active", schemaVersion: 1, ...fields }; }
export function calendarAccountingFixture() {
  const s = createEmptySnapshot();
  s.academicYears.push(accountingRecord(7101, { name: "Kurgu Çalışma Yılı", startDate: "2026-09-01", endDate: "2027-08-31", status: "active" }));
  s.classrooms.push(accountingRecord(7102, { name: "Kurgu Takvim Sınıfı", status: "active" }));
  s.settings.push(accountingRecord(7199, { id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE }));
  s.students.push(
    accountingRecord(7111, { displayName: "Kurgu Ada", active: true, enrollments: [accountingEpisode(7211, "2026-09-14", { status: "left", endedOn: "2026-09-16" }), accountingEpisode(7212, "2026-09-18")] }),
    accountingRecord(7112, { displayName: "Kurgu Efe", active: true, enrollments: [accountingEpisode(7213, "2026-09-16")] }),
    accountingRecord(7113, { displayName: "Kurgu İnceleme", active: true, enrollments: [accountingEpisode(7214, "2026-09-18", { status: "left", endedOn: "2026-09-16" })] }),
  );
  const mark = (id, student, date, status, extra = {}) => accountingRecord(id, { studentId: accountingId(student), civilDate: date, status, ...extra });
  s.attendanceRecords.push(
    mark(7301, 7111, "2026-09-14", "absent"),
    mark(7302, 7111, "2026-09-14", "late", { updatedAt: "2026-09-14T07:00:00.000Z" }),
    mark(7303, 7111, "2026-09-14", "present", { classroomId: accountingId(7198), updatedAt: "2026-09-14T08:00:00.000Z" }),
    mark(7304, 7111, "2026-09-16", "absent"), mark(7305, 7112, "2026-09-16", "present"),
    mark(7306, 7112, "2026-09-17", "invalid"),
    mark(7307, 7112, "2026-09-18", "present"),
    mark(7308, 7112, "2026-09-18", "present", { updatedAt: "2026-09-18T07:00:00.000Z", deletedAt: "2026-09-18T07:00:00.000Z" }),
    mark(7309, 7111, "2026-09-15", "present"), mark(7310, 7197, "2026-09-17", "present"),
    mark(7311, 7111, "2026-02-31", "present"),
  );
  s.calendarEntries.push(accountingRecord(7401, { title: "Kurgu okul kapanışı", entryType: "no_school", startDate: "2026-09-15", endDate: "2026-09-15", status: "planned" }));
  return s;
}
export class AccountingMemoryStore {
  constructor(snapshot) { this.snapshot = structuredClone(snapshot); }
  async readSnapshot() { return structuredClone(this.snapshot); }
  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const result = await task({ getAll: async key => structuredClone(working[key]), putMany: async (key, values) => { for (const record of values) { const index = working[key].findIndex(item => item.id === record.id); if (index < 0) working[key].push(structuredClone(record)); else working[key][index] = structuredClone(record); } }, clear: async key => { working[key] = []; } });
    if (mode === "readwrite") this.snapshot = working;
    return result;
  }
}
