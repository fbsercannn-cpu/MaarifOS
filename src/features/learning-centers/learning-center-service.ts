import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot } from "../../core/domain/model.ts";
import { adminLedgerHead, assertClassroomAdminRelationships, classroomAdminRecords, CLASSROOM_ADMIN_SETTING_TYPE, isClassroomAdminRecord, type ClassroomAdminRecord, type ClassroomAdminWorkflow } from "../../core/domain/classroom-admin.ts";
import { assertLearningCenterRelationships, isLearningCenterRecord, learningCenterHead, learningCenterState, LEARNING_CENTER_SETTING_TYPE, type LearningCenter, type LearningCenterRecord, type LearningCenterWorkflow } from "../../core/domain/learning-centers.ts";
import type { DataTransaction, LocalDataStore } from "../../core/repository/contracts.ts";
import { notifyFollowupChanged } from "../teacher-followup/teacher-followup-service.ts";

type DraftCenter = Omit<LearningCenter, "allocations"> & { allocations: { itemId: string; quantity: number }[] };
type Command = { kind: "plan"; title: string; startOn: string; endOn: string; previousPlanId: string | null; centers: DraftCenter[] } | { kind: "reflection"; planId: string; centerId: string; observation: string; nextStep: string } | { kind: "close"; planId: string; reason: string };
async function read(tx: DataTransaction): Promise<DataSnapshot> { const snapshot = createEmptySnapshot(); for (const c of COLLECTION_NAMES) snapshot[c] = await tx.getAll(c); return snapshot; }
export async function saveLearningCenter(store: LocalDataStore, input: { command: Command; expectedScope: { academicYearId: string; classroomId: string }; expectedHead: string | null; expectedInventoryHead: string | null; now?: Date }): Promise<LearningCenterRecord> {
  const now = input.now ?? new Date();
  const expectedScope = { ...input.expectedScope };
  if (!Number.isFinite(now.getTime())) throw new Error("Kayıt saati geçersiz.");
  const civilDate = civilDateInIstanbul(now);
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const snapshot = await read(tx), scope = resolveActiveClassroomScope(snapshot);
    if (!scope) throw new Error("Merkez düzeni için etkin sınıf seçin.");
    if (scope.academicYearId !== expectedScope.academicYearId || scope.classroomId !== expectedScope.classroomId) throw new Error("Etkin sınıf değişti. Merkez düzenini yeniden açıp doğru sınıfta kaydedin.");
    const year = snapshot.academicYears.find(y => y.id === scope.academicYearId);
    if (!year || year.status === "archived") throw new Error("Arşivlenen eğitim yılına merkez düzeni eklenemez.");
    if (learningCenterHead(snapshot, scope) !== input.expectedHead || adminLedgerHead(classroomAdminRecords(snapshot, scope)) !== input.expectedInventoryHead) throw new Error("Merkez veya stok defteri değişti. Güncel kaydı açıp yeniden deneyin.");
    const added: (LearningCenterRecord | ClassroomAdminRecord)[] = [];
    let time = Math.max(now.getTime(), ...snapshot.settings.map(r => Date.parse(r.createdAt)).filter(Number.isFinite));
    if (time > now.getTime() + 60_000) throw new Error("Cihaz saati önceki kayıtların gerisinde. Saati kontrol edin.");
    const base = () => { const timestamp = new Date(++time).toISOString(); return { id: crypto.randomUUID(), createdAt: timestamp, updatedAt: timestamp, civilDate, schemaVersion: 1 as const, deletedAt: null, ...scope, studentId: null }; };
    const movement = (workflow: ClassroomAdminWorkflow) => { const record: ClassroomAdminRecord = { ...base(), settingType: CLASSROOM_ADMIN_SETTING_TYPE, workflow }; if (!isClassroomAdminRecord(record)) throw new Error("Merkez malzeme miktarını kontrol edin."); snapshot.settings.push(record); added.push(record); return record.id; };
    const c = structuredClone(input.command); let workflow: LearningCenterWorkflow;
    if (c.kind === "plan") {
      if (c.endOn < civilDate) throw new Error("Geçmiş tarihe yeni malzeme ayırmak yerine güncel bir dönem seçin.");
      const centers = c.centers.map(center => ({ ...center, name: center.name.normalize("NFC").trim(), observation: center.observation.normalize("NFC").trim(), nextStep: center.nextStep.normalize("NFC").trim(), allocations: center.allocations.map(a => ({ ...a, loanId: movement({ kind: "inventory-movement", itemId: a.itemId, action: "loan", quantity: a.quantity, party: { type: "adult", studentId: null, name: `Öğrenme merkezi: ${center.name.normalize("NFC").trim()}` }, dueOn: c.endOn, loanId: null, preparationId: null, note: "Merkez düzeni için ayrıldı." }) })) }));
      workflow = { kind: "center-plan", title: c.title.normalize("NFC").trim(), startOn: c.startOn, endOn: c.endOn, previousPlanId: c.previousPlanId, centers };
    } else if (c.kind === "reflection") {
      workflow = { kind: "center-reflection", planId: c.planId, centerId: c.centerId, observation: c.observation.normalize("NFC").trim(), nextStep: c.nextStep.normalize("NFC").trim() };
    } else {
      const state = learningCenterState(snapshot, c.planId);
      if (!state || state.closed) throw new Error("Açık bir merkez düzeni seçin.");
      const returnIds = state.centers.flatMap(center => center.allocations.filter(a => a.remaining > 0).map(a => movement({ kind: "inventory-movement", itemId: a.itemId, action: "return", quantity: a.remaining, party: null, dueOn: null, loanId: a.loanId, note: "Merkez düzeni kapatıldı; malzeme iade edildi.", preparationId: null })));
      workflow = { kind: "center-close", planId: c.planId, reason: c.reason.normalize("NFC").trim(), returnIds };
    }
    const record: LearningCenterRecord = { ...base(), settingType: LEARNING_CENTER_SETTING_TYPE, workflow };
    if (!isLearningCenterRecord(record)) throw new Error("Merkez adlarını, tarihleri ve malzeme miktarlarını kontrol edin.");
    snapshot.settings.push(record); added.push(record);
    assertClassroomAdminRelationships(snapshot); assertLearningCenterRelationships(snapshot);
    await tx.putMany("settings", added); return record;
  });
  notifyFollowupChanged(); return result;
}
