import { classRosterFixture } from "./class-roster-fixture.mjs";
import { GrowthMemoryStore } from "./growth-measurements-fixture.mjs";
export function studentSummaryFixture() {
  const input = classRosterFixture(2), child = input.snapshot.students[0], other = input.snapshot.students[1];
  input.snapshot.classrooms[0].schoolName = input.schoolName;
  input.snapshot.classrooms[0].teacherName = input.teacherName;
  child.contacts = child.contacts.slice(0, 2);
  const base = { createdAt: "2026-09-10T09:00:00.000Z", updatedAt: "2026-09-10T09:00:00.000Z", civilDate: "2026-09-10", schemaVersion: 1, deletedAt: null, ...input.scope };
  for (let i = 0; i < 5; i++) input.snapshot.observations.push({ ...base, id: `00000000-0000-4000-9500-${String(i + 1).padStart(12, "0")}`, studentId: child.id, rawText: `Kurgu gözlem ${i + 1}: Hikâye kartlarını sıraya koydu ve olayları kendi cümleleriyle anlattı.` });
  input.snapshot.observations.push({ ...base, id: "00000000-0000-4000-9500-000000000099", studentId: other.id, rawText: "DIGER_COCUK_GIZLI_KAYIT" }, { ...base, id: "00000000-0000-4000-9500-000000000098", studentIds: [child.id, other.id], rawText: "ORTAK_COCUK_GIZLI_KAYIT" });
  input.snapshot.settings.push({ ...base, id: "00000000-0000-4000-9500-000000000090", settingType: "teacher-followup-v1", studentId: child.id, workflow: { kind: "learning-decision", observationIds: [input.snapshot.observations[0].id], support: "small-group", teacherDecision: "Küçük grupta hikâye kartlarını sıraya koyma çalışması için ek süre ayır.", targetWeekStart: "2026-09-07", targetWeekEnd: "2026-09-11", reviewOn: "2026-09-11" } });
  return { input, child, other, store: new GrowthMemoryStore(input.snapshot) };
}
