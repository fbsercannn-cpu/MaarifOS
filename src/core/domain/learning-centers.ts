import { civilDateInIstanbul, isCivilDate } from "./attendance.ts";
import type { DataSnapshot, StoredRecord } from "./model.ts";
import { classroomAdminRecords, inventoryBalances, isClassroomAdminRecord } from "./classroom-admin.ts";

export const LEARNING_CENTER_SETTING_TYPE = "learning-centers-v1" as const;
export const LEARNING_CENTER_KEYS = ["settingType", "academicYearId", "classroomId", "studentId", "workflow"] as const;
export type CenterAllocation = { itemId: string; quantity: number; loanId: string };
export type LearningCenter = { id: string; name: string; observation: string; nextStep: string; allocations: CenterAllocation[] };
export type LearningCenterWorkflow =
  | { kind: "center-plan"; title: string; startOn: string; endOn: string; previousPlanId: string | null; centers: LearningCenter[] }
  | { kind: "center-reflection"; planId: string; centerId: string; observation: string; nextStep: string }
  | { kind: "center-box-check"; planId: string; centerId: string; prepared: boolean }
  | { kind: "center-close"; planId: string; reason: string; returnIds: string[] };
export type LearningCenterRecord = StoredRecord & { schemaVersion: 1; deletedAt: null; settingType: typeof LEARNING_CENTER_SETTING_TYPE; academicYearId: string; classroomId: string; studentId: null; workflow: LearningCenterWorkflow };
type Scope = { academicYearId: string; classroomId: string };
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, names: readonly string[]) => Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const id = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(v);
const text = (v: unknown, max: number, min = 0): v is string => typeof v === "string" && v.length >= min && v.length <= max && v === v.normalize("NFC").trim();
const date = (v: unknown): v is string => typeof v === "string" && isCivilDate(v);
const utc = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const same = (a: Scope, b: StoredRecord) => a.academicYearId === b.academicYearId && a.classroomId === b.classroomId;
function center(v: unknown): v is LearningCenter {
  if (!obj(v) || !exact(v, ["id", "name", "observation", "nextStep", "allocations"]) || !id(v.id) || !text(v.name, 100, 1) || !text(v.observation, 2000) || !text(v.nextStep, 2000) || !Array.isArray(v.allocations) || v.allocations.length > 50) return false;
  return v.allocations.every(a => obj(a) && exact(a, ["itemId", "quantity", "loanId"]) && id(a.itemId) && id(a.loanId) && Number.isSafeInteger(a.quantity) && Number(a.quantity) > 0 && Number(a.quantity) <= 1_000_000) && new Set(v.allocations.map(a => a.itemId)).size === v.allocations.length;
}
export function isLearningCenterRecord(v: unknown): v is LearningCenterRecord {
  if (!obj(v) || !exact(v, ["id", "createdAt", "updatedAt", "civilDate", "schemaVersion", "deletedAt", ...LEARNING_CENTER_KEYS]) || !id(v.id) || !utc(v.createdAt) || v.updatedAt !== v.createdAt || !date(v.civilDate) || v.civilDate > civilDateInIstanbul(new Date(v.createdAt)) || v.schemaVersion !== 1 || v.deletedAt !== null || v.settingType !== LEARNING_CENTER_SETTING_TYPE || !id(v.academicYearId) || !id(v.classroomId) || v.studentId !== null || !obj(v.workflow)) return false;
  const w = v.workflow;
  if (w.kind === "center-plan") return exact(w, ["kind", "title", "startOn", "endOn", "previousPlanId", "centers"]) && text(w.title, 200, 1) && date(w.startOn) && date(w.endOn) && w.startOn <= w.endOn && (w.previousPlanId === null || id(w.previousPlanId)) && Array.isArray(w.centers) && w.centers.length > 0 && w.centers.length <= 20 && w.centers.every(center) && new Set(w.centers.map(c => c.id)).size === w.centers.length && new Set(w.centers.map(c => c.name.toLocaleLowerCase("tr-TR"))).size === w.centers.length && new Set(w.centers.flatMap(c => c.allocations.map(a => a.loanId))).size === w.centers.reduce((n, c) => n + c.allocations.length, 0);
  if (w.kind === "center-reflection") return exact(w, ["kind", "planId", "centerId", "observation", "nextStep"]) && id(w.planId) && id(w.centerId) && text(w.observation, 2000, 1) && text(w.nextStep, 2000, 1);
  if (w.kind === "center-box-check") return exact(w, ["kind", "planId", "centerId", "prepared"]) && id(w.planId) && id(w.centerId) && typeof w.prepared === "boolean";
  if (w.kind === "center-close") return exact(w, ["kind", "planId", "reason", "returnIds"]) && id(w.planId) && text(w.reason, 2000, 1) && Array.isArray(w.returnIds) && w.returnIds.every(id) && new Set(w.returnIds).size === w.returnIds.length;
  return false;
}
export function learningCenterRecords(snapshot: DataSnapshot, scope?: Scope): LearningCenterRecord[] { return snapshot.settings.filter(isLearningCenterRecord).filter(r => !scope || same(scope, r)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)); }
export function learningCenterHead(snapshot: DataSnapshot, scope: Scope): string | null { return learningCenterRecords(snapshot, scope).at(-1)?.id ?? null; }
export function learningCenterState(snapshot: DataSnapshot, planId: string) {
  const records = learningCenterRecords(snapshot), plan = records.find(r => r.id === planId);
  if (!plan || plan.workflow.kind !== "center-plan") return null;
  const history = records.filter(r => r.id === planId || ("planId" in r.workflow && r.workflow.planId === planId));
  const balances = inventoryBalances(classroomAdminRecords(snapshot, plan));
  const centers = plan.workflow.centers.map(c => {
    const reflection = history.filter(r => r.workflow.kind === "center-reflection" && r.workflow.centerId === c.id).at(-1)?.workflow;
    return { ...c, observation: reflection?.kind === "center-reflection" ? reflection.observation : c.observation, nextStep: reflection?.kind === "center-reflection" ? reflection.nextStep : c.nextStep, allocations: c.allocations.map(a => ({ ...a, remaining: balances.find(b => b.item.id === a.itemId)?.loans.find(l => l.record.id === a.loanId)?.remaining ?? 0 })) };
  });
  return { plan, centers, history, closed: history.find(r => r.workflow.kind === "center-close") ?? null };
}
export function assertLearningCenterRelationships(snapshot: DataSnapshot): void {
  const raw = snapshot.settings.filter(r => r.settingType === LEARNING_CENTER_SETTING_TYPE);
  if (!raw.every(isLearningCenterRecord) || new Set(raw.map(r => r.id)).size !== raw.length) throw new Error("Öğrenme merkezi kaydı sözleşmesi geçersiz.");
  const records = learningCenterRecords(snapshot);
  const usedLoans = new Set<string>();
  for (const record of records) {
    const year = snapshot.academicYears.find(y => y.id === record.academicYearId), classroom = snapshot.classrooms.find(c => c.id === record.classroomId);
    if (!year || !classroom || classroom.academicYearId !== year.id) throw new Error("Öğrenme merkezi sınıfı veya eğitim yılı bulunamadı.");
    const w = record.workflow;
    if (w.kind === "center-plan") {
      if (w.startOn < String(year.startDate) || w.endOn > String(year.endDate)) throw new Error("Merkez düzeni eğitim yılının içinde olmalıdır.");
      if (w.previousPlanId && !records.some(p => p.id === w.previousPlanId && p.id !== record.id && same(record, p) && p.workflow.kind === "center-plan" && p.createdAt < record.createdAt)) throw new Error("Önceki merkez düzeninin kaynağı geçersiz.");
      for (const c of w.centers) for (const a of c.allocations) {
        const loan = snapshot.settings.find(r => r.id === a.loanId);
        if (!loan || !isClassroomAdminRecord(loan) || !same(record, loan) || loan.createdAt > record.createdAt || loan.workflow.kind !== "inventory-movement" || loan.workflow.action !== "loan" || loan.workflow.itemId !== a.itemId || loan.workflow.quantity !== a.quantity || loan.workflow.dueOn !== w.endOn || loan.workflow.party?.type !== "adult" || loan.workflow.party.name !== `Öğrenme merkezi: ${c.name}` || usedLoans.has(a.loanId)) throw new Error("Merkez malzemesinin emanet bağlantısı geçersiz.");
        if (snapshot.settings.some(r => isClassroomAdminRecord(r) && r.workflow.kind === "inventory-reversal" && r.workflow.sourceId === loan.id)) throw new Error("Merkeze bağlı emanet geri alınamaz. Merkez düzenini kapatarak malzemeyi iade edin.");
        usedLoans.add(a.loanId);
      }
    } else {
      const state = learningCenterState(snapshot, w.planId);
      if (!state || !same(record, state.plan) || state.plan.createdAt >= record.createdAt) throw new Error("Merkez düzeninin kaynağı geçersiz.");
      if (state.closed && state.closed.id !== record.id && state.closed.createdAt <= record.createdAt) throw new Error("Kapatılmış merkez düzenine yeni işlem eklenemez.");
      if (w.kind === "center-reflection" && !state.centers.some(c => c.id === w.centerId)) throw new Error("Notun merkezi bulunamadı.");
      if (w.kind === "center-box-check" && !state.centers.some(c => c.id === w.centerId)) throw new Error("Hazırlanan kutunun merkezi bulunamadı.");
      if (w.kind === "center-close") {
        const asOf = { ...snapshot, settings: snapshot.settings.filter(r => r.createdAt <= record.createdAt) };
        if (learningCenterState(asOf, w.planId)?.centers.some(c => c.allocations.some(a => a.remaining > 0))) throw new Error("Merkez kapatılmadan açık malzemeler iade edilmelidir.");
        if (state.centers.some(c => c.allocations.some(a => a.remaining > 0))) throw new Error("Kapanmış merkezin malzemesi yeniden açıkta bırakılamaz. Yeni bir merkez düzeni oluşturun.");
        for (const returnId of w.returnIds) { const returned = snapshot.settings.find(r => r.id === returnId); if (!returned || !isClassroomAdminRecord(returned) || returned.workflow.kind !== "inventory-movement" || returned.workflow.action !== "return" || returned.createdAt > record.createdAt || !state.centers.some(c => c.allocations.some(a => a.loanId === (returned.workflow as { loanId: string }).loanId))) throw new Error("Merkez iade bağlantısı geçersiz."); }
      }
    }
  }
}
export function learningCenterReminders(snapshot: DataSnapshot, today: string) { return learningCenterRecords(snapshot).flatMap(r => r.workflow.kind === "center-plan" && r.workflow.endOn <= today && !learningCenterState(snapshot, r.id)?.closed ? [{ id: r.id, title: `${r.workflow.title} · düzeni gözden geçir`, dueOn: r.workflow.endOn, section: "centers" as const }] : []); }
