import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { COLLECTION_NAMES, createEmptySnapshot } from "../../core/domain/model.ts";
import { assertSchoolDocumentTemplateRelationships, isSchoolDocumentTemplateRecord, schoolDocumentTemplateRecords, SCHOOL_DOCUMENT_TEMPLATE_SETTING_TYPE, type SchoolDocumentTemplate, type SchoolDocumentTemplateRecord } from "../../core/domain/school-document-template.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { notifyFollowupChanged } from "../teacher-followup/teacher-followup-service.ts";

export async function appendSchoolDocumentTemplate(store: LocalDataStore, input: { template: SchoolDocumentTemplate; expectedScope: { academicYearId: string; classroomId: string }; expectedHead: string | null; now?: Date }): Promise<SchoolDocumentTemplateRecord> {
  const now = input.now ?? new Date();
  const record = await store.transaction("readwrite", COLLECTION_NAMES, async transaction => {
    const snapshot = createEmptySnapshot();
    for (const collection of COLLECTION_NAMES) snapshot[collection] = await transaction.getAll(collection);
    const scope = resolveActiveClassroomScope(snapshot);
    if (!scope) throw new Error("Okul şablonu için etkin sınıfınızı seçin.");
    if (!input.expectedScope || input.expectedScope.academicYearId !== scope.academicYearId || input.expectedScope.classroomId !== scope.classroomId) throw new Error("Etkin sınıf değişti. Şablonu güncel sınıfta yeniden açın.");
    if (snapshot.academicYears.find(y => y.id === scope.academicYearId)?.status === "archived") throw new Error("Arşivlenen eğitim yılının şablonu değiştirilemez.");
    const previous = schoolDocumentTemplateRecords(snapshot, scope).at(-1);
    if (!Number.isFinite(now.getTime()) || previous && civilDateInIstanbul(now) < previous.civilDate) throw new Error("Cihaz tarihi son şablon kaydından önce. Tarihi kontrol edin.");
    if (previous && Date.parse(previous.createdAt) > now.getTime() + 60_000) throw new Error("Cihaz saati son şablon kaydından önce. Saat ayarını kontrol edin.");
    if ((previous?.id ?? null) !== input.expectedHead) throw new Error("Okul şablonu başka bir işlemde değişti. Güncel sürümü açıp yeniden deneyin.");
    const createdAt = new Date(Math.max(now.getTime(), previous ? Date.parse(previous.createdAt) + 1 : 0)).toISOString();
    const result: SchoolDocumentTemplateRecord = { id: crypto.randomUUID(), createdAt, updatedAt: createdAt, civilDate: civilDateInIstanbul(now), schemaVersion: 1, deletedAt: null, settingType: SCHOOL_DOCUMENT_TEMPLATE_SETTING_TYPE, ...scope, studentId: null, workflow: { kind: "template-set", previousEventId: previous?.id ?? null, template: structuredClone(input.template) } };
    if (!isSchoolDocumentTemplateRecord(result)) throw new Error("Üst başlıkları, logo dosyasını ve şablon seçeneklerini kontrol edin.");
    snapshot.settings.push(result); assertSchoolDocumentTemplateRelationships(snapshot);
    await transaction.putMany("settings", [result]); return result;
  });
  notifyFollowupChanged(); return record;
}
