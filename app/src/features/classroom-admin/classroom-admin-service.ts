import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot } from "../../core/domain/model.ts";
import { adminLedgerHead, assertClassroomAdminRelationships, classroomAdminRecords, CLASSROOM_ADMIN_SETTING_TYPE, handoverState, isClassroomAdminRecord, missingHandoverSources, outstandingHandoverSources, staleHandoverItems, type ClassroomAdminRecord, type ClassroomAdminWorkflow, type HandoverItem } from "../../core/domain/classroom-admin.ts";
import type { DataTransaction, LocalDataStore } from "../../core/repository/contracts.ts";
import { notifyFollowupChanged } from "../teacher-followup/teacher-followup-service.ts";
import { assertLearningCenterRelationships } from "../../core/domain/learning-centers.ts";

async function read(transaction: DataTransaction): Promise<DataSnapshot> {
  const snapshot = createEmptySnapshot();
  for (const collection of COLLECTION_NAMES) snapshot[collection] = await transaction.getAll(collection);
  return snapshot;
}
export function buildHandoverItems(snapshot: DataSnapshot, scope: { academicYearId: string; classroomId: string }, manual: string[], previous: readonly HandoverItem[] = []): HandoverItem[] {
  const added = outstandingHandoverSources(snapshot, scope).filter(s => !previous.some(p => p.sourceId === s.sourceId)).map(s => ({ ...s, id: crypto.randomUUID() }));
  return [...previous, ...added, ...manual.map(s => s.normalize("NFC").trim()).filter(Boolean).map(title => ({ id: crypto.randomUUID(), title, sourceId: null, sourceKind: "manual" as const, studentId: null, redacted: false }))];
}
export async function appendClassroomAdmin(store: LocalDataStore, input: { workflow: ClassroomAdminWorkflow; expectedScope: { academicYearId: string; classroomId: string }; expectedHead: string | null; civilDate?: string; now?: Date }): Promise<ClassroomAdminRecord> {
  const now = input.now ?? new Date();
  const expectedScope = { ...input.expectedScope };
  if (!Number.isFinite(now.getTime())) throw new Error("Kayıt saati geçersiz.");
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async transaction => {
    const snapshot = await read(transaction);
    const scope = resolveActiveClassroomScope(snapshot);
    if (!scope) throw new Error("Malzeme ve devir kaydı için etkin sınıf seçin.");
    if (scope.academicYearId !== expectedScope.academicYearId || scope.classroomId !== expectedScope.classroomId) throw new Error("Etkin sınıf değişti. Defteri yeniden açıp doğru sınıfta kaydedin.");
    const year = snapshot.academicYears.find(y => y.id === scope.academicYearId);
    if (!year) throw new Error("Etkin eğitim yılı bulunamadı.");
    if (year.status === "archived") throw new Error("Arşivlenen eğitim yılına yeni hareket eklenemez.");
    const records = classroomAdminRecords(snapshot, scope);
    if (adminLedgerHead(records) !== input.expectedHead) throw new Error("Defter başka bir işlemde değişti. Güncel kaydı açıp yeniden deneyin.");
    const civilDate = input.civilDate ?? civilDateInIstanbul(now);
    const w = structuredClone(input.workflow);
    if (w.kind === "inventory-movement" && w.party?.type === "removed") throw new Error("Kaldırılmış kişi adına yeni emanet oluşturulamaz.");
    if (w.kind === "inventory-movement" && w.party?.type === "student") {
      const student = snapshot.students.find(s => s.id === w.party?.studentId);
      if (!student || student.active === false || typeof student.deletedAt === "string" || !resolveStudentMembershipOn(student, { ...scope, civilDate, academicYear: year }).eligible) throw new Error("Emanet tarihinde bu sınıfa kayıtlı bir çocuk seçin.");
    }
    if (w.kind === "inventory-movement" && w.preparationId) {
      const source = snapshot.settings.find(s => s.id === w.preparationId);
      const workflow = source?.workflow as { kind?: string; sources?: { collection: string; id: string; updatedAt: string }[] } | undefined;
      if (workflow?.kind !== "preparation-list" || workflow.sources?.some(s => !(snapshot[s.collection as keyof DataSnapshot] ?? []).some(r => r.id === s.id && r.updatedAt === s.updatedAt && typeof r.deletedAt !== "string"))) throw new Error("Hazırlık listesinin plan veya etkinlik kaynağı değişmiş. Hazırlığı güncelledikten sonra bağlayın.");
    }
    if (w.kind === "handover-plan" || w.kind === "handover-revision") {
      const previous = w.kind === "handover-revision" ? handoverState(records, w.handoverId)?.items ?? [] : [];
      if (w.items.some(i => i.redacted && !previous.some(p => p.id === i.id && canonicalJson(p) === canonicalJson(i)))) throw new Error("Kaldırılmış kişisel kayıt yalnız mevcut devir geçmişinden korunabilir.");
      if (missingHandoverSources(snapshot, scope, w.items).length) throw new Error("Açık işler değişti. Devir listesini güncelleyip yeniden kaydedin.");
    }
    if (w.kind === "handover-close") {
      const state = handoverState(records, w.handoverId);
      if (!state || missingHandoverSources(snapshot, scope, state.items).length) throw new Error("Liste dışında yeni açık işler var. Açık işleri listeye ekleyip kontrol edin.");
      if (staleHandoverItems(snapshot, records, w.handoverId).length) throw new Error("Kontrolden sonra kaynak işlemi değişen maddeler var. Bu maddeleri yeniden kontrol edin.");
    }
    const max = snapshot.settings.reduce((n, r) => Math.max(n, Number.isFinite(Date.parse(r.createdAt)) ? Date.parse(r.createdAt) : 0), 0);
    if (max > now.getTime() + 60_000) throw new Error("Cihaz saati önceki kayıtların gerisinde. Saati kontrol edin.");
    const createdAt = new Date(Math.max(now.getTime(), max + 1)).toISOString();
    const record: ClassroomAdminRecord = { id: crypto.randomUUID(), createdAt, updatedAt: createdAt, civilDate, schemaVersion: 1, deletedAt: null, settingType: CLASSROOM_ADMIN_SETTING_TYPE, ...scope, studentId: null, workflow: w };
    if (!isClassroomAdminRecord(record)) throw new Error("Alanları, tam sayı miktarını ve tarihleri kontrol edin.");
    snapshot.settings.push(record);
    assertClassroomAdminRelationships(snapshot);
    assertLearningCenterRelationships(snapshot);
    await transaction.putMany("settings", [record]);
    return record;
  });
  notifyFollowupChanged();
  return result;
}
