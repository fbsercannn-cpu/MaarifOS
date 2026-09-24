import { ACTIVE_CLASSROOM_SETTING_ID, ACTIVE_CLASSROOM_SETTING_TYPE } from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { assertEntityRecord } from "../../src/core/repository/entities.ts";
import { createDevelopmentObservationDraft } from "../../src/features/evidence/development-observation-presets.ts";
import { ensureSpontaneousObservationContext } from "../../src/features/evidence/spontaneous-observation.ts";
import { persistQuickObservationDraft, finalizeQuickObservationDraft } from "../../src/features/evidence/quick-observation.ts";
import { saveDevelopmentReportDraft, approveDevelopmentReport } from "../../src/features/development/development-report.ts";

class MemoryStore {
  constructor(snapshot) { this.snapshot = structuredClone(snapshot); }
  async readSnapshot() { return structuredClone(this.snapshot); }
  async transaction(mode, collections, task) {
    const snapshot = structuredClone(this.snapshot);
    const result = await task({
      getAll: async (collection) => structuredClone(snapshot[collection]),
      putMany: async (collection, records) => {
        const map = new Map(snapshot[collection].map((row) => [row.id, row]));
        for (const record of records) {
          assertEntityRecord(collection, record);
          map.set(record.id, structuredClone(record));
        }
        snapshot[collection] = [...map.values()];
      },
      clear: async (collection) => { snapshot[collection] = []; },
    });
    if (mode === "readwrite") for (const collection of collections) this.snapshot[collection] = snapshot[collection];
    return result;
  }
  close() {}
}

export const REPORT_TEST_IDS = Object.freeze({
  academicYearId: "00000000-0000-4000-8000-000000216001",
  classroomId: "00000000-0000-4000-8000-000000216002",
  studentId: "00000000-0000-4000-8000-000000216003",
  observationId: "00000000-0000-4000-8000-000000216004",
  reportId: "00000000-0000-4000-8000-000000216005",
});
export const REPORT_TEST_RAW_TEXT = "  Kurgu çocuk ‘birlikte kuralım’ dedi.\nİki kırmızı bloğu aynı sepete koydu.  ";
export const REPORT_TEST_EVALUATION = "Öğretmen yorumu: Seçili olay, blok oyununda bir araya getirme denemesini gösteriyor.";
export const REPORT_TEST_NEXT_SUPPORT = "Sonraki adım: Farklı nesnelerle açık uçlu bir gruplama oyunu sunacağım.";

export async function developmentReportExportFixture(options = {}) {
  const now = new Date("2026-09-08T07:00:00.000Z");
  const { academicYearId, classroomId, studentId, observationId, reportId } = REPORT_TEST_IDS;
  const base = { createdAt: now.toISOString(), updatedAt: now.toISOString(), civilDate: "2026-09-08", deletedAt: null, schemaVersion: 1 };
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({ ...base, id: academicYearId, name: "2026-2027 Kurgu Eğitim Yılı", startDate: "2026-09-01", endDate: "2027-06-30", status: "active" });
  snapshot.classrooms.push({
    ...base, id: classroomId, academicYearId, name: "Güneş Kurgu Sınıfı", ageGroup: "60–72 ay", schemaVersion: 2,
    schoolName: "Kurgu Anaokulu", teacherName: "Kurgu Öğretmen",
    curriculumProfileSnapshot: { framework: "tymm", programLabel: "Türkiye Yüzyılı Maarif Modeli", catalogId: "tymm-legacy-partial", sourceVersion: "2024", referenceOrigin: "teacher-declared", officialCatalogVerified: false },
  });
  snapshot.settings.push({ ...base, id: ACTIVE_CLASSROOM_SETTING_ID, settingType: ACTIVE_CLASSROOM_SETTING_TYPE, academicYearId, classroomId });
  snapshot.students.push({ ...base, id: studentId, academicYearId, classroomId, displayName: options.childName ?? "Çağrı Şen Kurgu Çocuğu", active: true, enrollmentStatus: "active" });
  const store = new MemoryStore(snapshot);
  const context = await ensureSpontaneousObservationContext(store, { studentId, civilDate: "2026-09-08", now });
  const selection = { presetId: "development-60-72-group-contact", ageBand: "60-72", ...(options.withoutSupport ? {} : { support: "with-reminder" }) };
  const { programMapping: _mapping, ...draft } = createDevelopmentObservationDraft({ ...selection, rawText: options.rawText ?? REPORT_TEST_RAW_TEXT, context: "Kurgu blok oyunu" });
  await persistQuickObservationDraft(store, { ...draft, childQuote: options.childQuote ?? draft.childQuote, studentId, planId: context.plan.id, activityId: context.activity.id, developmentSelection: selection, now });
  await finalizeQuickObservationDraft(store, { studentId, planId: context.plan.id, activityId: context.activity.id, observationId, now });
  const report = await saveDevelopmentReportDraft(store, {
    academicYearId, classroomId, studentId, reportId,
    periodStart: "2026-09-01", periodEnd: "2026-09-30", selectedObservationIds: [observationId],
    teacherEvaluation: options.teacherEvaluation ?? REPORT_TEST_EVALUATION,
    nextSupport: options.nextSupport ?? REPORT_TEST_NEXT_SUPPORT,
    now: new Date("2026-09-08T08:00:00.000Z"),
  });
  if (options.approved !== false) await approveDevelopmentReport(store, { reportId, expectedRevision: report.revision, now: new Date("2026-09-08T09:00:00.000Z") });
  return { store, snapshot: await store.readSnapshot(), reportId };
}
