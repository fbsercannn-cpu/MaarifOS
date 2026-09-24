import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { assertEntityRecord } from "../../src/core/repository/entities.ts";
import { createDevelopmentObservationDraft } from "../../src/features/evidence/development-observation-presets.ts";
import { persistQuickObservationDraft, finalizeQuickObservationDraft } from "../../src/features/evidence/quick-observation.ts";
import { ensureSpontaneousObservationContext } from "../../src/features/evidence/spontaneous-observation.ts";

export class DevelopmentReportMemoryStore {
  constructor(snapshot = createEmptySnapshot()) { this.snapshot = structuredClone(snapshot); this.beforeTransaction = null; this.failReportWrite = false; }
  async readSnapshot() { return structuredClone(this.snapshot); }
  async transaction(mode, collections, task) {
    if (this.beforeTransaction) { const hook = this.beforeTransaction; this.beforeTransaction = null; await hook(this.snapshot); }
    const snapshot = structuredClone(this.snapshot);
    const result = await task({
      getAll: async (collection) => structuredClone(snapshot[collection]),
      putMany: async (collection, records) => {
        if (this.failReportWrite && records.some((record) => record.settingType === "development-report")) throw new Error("Kurgu rapor disk hatası");
        const map = new Map(snapshot[collection].map((record) => [record.id, record]));
        for (const record of records) { assertEntityRecord(collection, record); map.set(record.id, structuredClone(record)); }
        snapshot[collection] = [...map.values()];
      },
      clear: async (collection) => { snapshot[collection] = []; },
    });
    if (mode === "readwrite") for (const collection of collections) this.snapshot[collection] = snapshot[collection];
    return structuredClone(result);
  }
  close() {}
}

export async function makeDevelopmentReportFixture(store = new DevelopmentReportMemoryStore()) {
  const now = new Date("2026-09-08T07:00:00.000Z");
  const academicYearId = "00000000-0000-4000-8000-000000007001";
  const classroomId = "00000000-0000-4000-8000-000000007002";
  const studentId = "00000000-0000-4000-8000-000000007003";
  const otherStudentId = "00000000-0000-4000-8000-000000007004";
  const observationId = "00000000-0000-4000-8000-000000007005";
  const base = { createdAt: now.toISOString(), updatedAt: now.toISOString(), civilDate: "2026-09-08", deletedAt: null, schemaVersion: 1 };
  await store.transaction("readwrite", ["academicYears", "classrooms", "students", "settings"], async (tx) => {
    await tx.putMany("academicYears", [{ ...base, id: academicYearId, name: "Kurgu Eğitim Yılı", startDate: "2026-09-01", operationalStartDate: "2026-08-31", operationalStartedAt: "2026-08-31T07:00:00.000Z", endDate: "2027-06-30", status: "active" }]);
    await tx.putMany("classrooms", [{ ...base, id: classroomId, academicYearId, name: "Kurgu Sınıf", schoolName: "Kurgu Okul", teacherName: "Kurgu Öğretmen", ageGroup: "60-72 ay", schemaVersion: 2,
      curriculumProfileSnapshot: { framework: "tymm", programLabel: "Türkiye Yüzyılı Maarif Modeli", catalogId: "tymm-legacy-partial", sourceVersion: "2024", referenceOrigin: "teacher-declared", officialCatalogVerified: false } }]);
    await tx.putMany("students", [studentId, otherStudentId].map((id, i) => ({ ...base, id, academicYearId, classroomId, displayName: `Kurgu Çocuk ${i + 1}`, active: true, enrollmentStatus: "active" })));
    await tx.putMany("settings", [{ ...base, id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE, academicYearId, classroomId }]);
  });
  const context = await ensureSpontaneousObservationContext(store, { studentId, civilDate: "2026-09-08", now });
  const selection = { presetId: "development-60-72-group-contact", ageBand: "60-72", support: "with-reminder" };
  const { programMapping: _mapping, ...draft } = createDevelopmentObservationDraft({ ...selection, rawText: "  Çocuk arkadaşına ‘beraber kuralım’ dedi.\nİki parça taşıdı.  " });
  await persistQuickObservationDraft(store, { ...draft, studentId, planId: context.plan.id, activityId: context.activity.id, developmentSelection: selection, now });
  await finalizeQuickObservationDraft(store, { studentId, observationId, now });
  const input = { studentId, classroomId, academicYearId, periodStart: "2026-09-01", periodEnd: "2026-09-30", selectedObservationIds: [observationId], teacherEvaluation: "Birlikte kurma oyununa katıldığını gözledim.", nextSupport: "Küçük grup oyununda yeni bir davet fırsatı sunacağım.", now };
  return { store, now, input, selection, observationId, otherStudentId, context };
}
