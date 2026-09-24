import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
export const consentUid = n => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const consentScope = { academicYearId: consentUid(101), classroomId: consentUid(102) };
export const consentChildren = [consentUid(111), consentUid(112)];
export const consentNow = new Date("2026-09-08T09:00:00.000Z");
export function consentFixture() {
  const base = { createdAt: "2026-09-01T06:00:00.000Z", updatedAt: "2026-09-01T06:00:00.000Z", civilDate: "2026-09-01", schemaVersion: 1, deletedAt: null };
  const s = createEmptySnapshot();
  s.academicYears.push({ ...base, id: consentScope.academicYearId, name: "Kurgu eğitim yılı", startDate: "2026-09-01", endDate: "2027-06-30", operationalStartDate: "2026-09-01", status: "active" });
  s.classrooms.push({ ...base, ...consentScope, id: consentScope.classroomId, name: "Kurgu Deniz Sınıfı" });
  s.settings.push({ ...base, id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE, ...consentScope });
  s.students.push(...consentChildren.map((id, i) => ({ ...base, ...consentScope, id, displayName: i ? "Kurgu Bora" : "Kurgu Ada", active: true, photoConsent: true, portfolioConsent: true })));
  return s;
}
export class ConsentMemoryStore {
  constructor(snapshot = consentFixture()) { this.snapshot = structuredClone(snapshot); this.fail = false; this.queue = Promise.resolve(); }
  async readSnapshot() { return structuredClone(this.snapshot); }
  transaction(mode, collections, task) {
    const run = async () => { const working = structuredClone(this.snapshot); const result = await task({ getAll: async name => structuredClone(working[name]), putMany: async (name, rows) => { if (this.fail) throw new Error("Kurgu kayıt kesintisi"); for (const row of rows) { const i = working[name].findIndex(r => r.id === row.id); if (i >= 0) working[name][i] = structuredClone(row); else working[name].push(structuredClone(row)); } }, clear: async name => { working[name] = []; } }); if (mode === "readwrite") this.snapshot = working; return result; };
    const result = this.queue.then(run); this.queue = result.catch(() => undefined); return result;
  }
  close() {}
}
