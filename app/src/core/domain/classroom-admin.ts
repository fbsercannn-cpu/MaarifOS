import { civilDateInIstanbul, isCivilDate } from "./attendance.ts";
import { canonicalJson } from "../backup/canonical-json.ts";
import type { DataSnapshot, StoredRecord } from "./model.ts";
import { followupReminders, teacherFollowups } from "./teacher-followup.ts";

export const CLASSROOM_ADMIN_SETTING_TYPE = "classroom-admin-v1" as const;
export const CLASSROOM_ADMIN_KEYS = ["settingType", "academicYearId", "classroomId", "studentId", "workflow"] as const;
export type InventoryAction = "add" | "consume" | "loan" | "return" | "damage" | "repair";
export type InventoryParty = { type: "student" | "adult" | "removed"; studentId: string | null; name: string };
export type HandoverItem = { id: string; title: string; sourceId: string | null; sourceKind: "manual" | "followup" | "loan"; studentId: string | null; redacted: boolean };
export type ClassroomAdminWorkflow =
  | { kind: "inventory-item"; name: string; category: string; unit: string; initialQuantity: number; note: string }
  | { kind: "inventory-movement"; itemId: string; action: InventoryAction; quantity: number; party: InventoryParty | null; dueOn: string | null; loanId: string | null; note: string; preparationId: string | null }
  | { kind: "inventory-reversal"; sourceId: string; note: string }
  | { kind: "handover-plan"; title: string; recipient: string; dueOn: string; note: string; items: HandoverItem[] }
  | { kind: "handover-revision"; handoverId: string; items: HandoverItem[]; note: string }
  | { kind: "handover-check"; handoverId: string; itemId: string; completed: boolean; note: string }
  | { kind: "handover-close"; handoverId: string; recipient: string; note: string }
  | { kind: "handover-reopen"; handoverId: string; note: string };
export type ClassroomAdminRecord = StoredRecord & { settingType: typeof CLASSROOM_ADMIN_SETTING_TYPE; academicYearId: string; classroomId: string; studentId: null; schemaVersion: 1; deletedAt: null; workflow: ClassroomAdminWorkflow };
type Scope = { academicYearId: string; classroomId: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>, names: readonly string[]) => Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const id = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(v);
const text = (v: unknown, max = 4000): v is string => typeof v === "string" && v.length <= max && v === v.normalize("NFC").trim();
const required = (v: unknown, max = 4000) => text(v, max) && v.length > 0;
const day = (v: unknown): v is string => typeof v === "string" && isCivilDate(v);
const utc = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const integer = (v: unknown, min = 0) => Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= 1_000_000;
const optionalId = (v: unknown) => v === null || id(v);
const sameScope = (a: Scope, b: StoredRecord) => a.academicYearId === b.academicYearId && a.classroomId === b.classroomId;
const item = (v: unknown): v is HandoverItem => object(v) && keys(v, ["id", "title", "sourceId", "sourceKind", "studentId", "redacted"]) && id(v.id) && required(v.title, 500) && (v.sourceId === null || (typeof v.sourceId === "string" && v.sourceId.length <= 100 && v.sourceId.split(":").every(id))) && ["manual", "followup", "loan"].includes(String(v.sourceKind)) && optionalId(v.studentId) && typeof v.redacted === "boolean" && (v.redacted ? v.studentId === null && v.sourceId === null && v.title === "Kişisel kayıt kaldırıldı" : v.sourceKind === "manual" ? v.sourceId === null && v.studentId === null : v.sourceId !== null);
const items = (v: unknown): v is HandoverItem[] => Array.isArray(v) && v.length > 0 && v.length <= 500 && v.every(item) && new Set(v.map(x => x.id)).size === v.length && new Set(v.filter(x => x.sourceId).map(x => x.sourceId)).size === v.filter(x => x.sourceId).length;
export function isClassroomAdminWorkflow(v: unknown): v is ClassroomAdminWorkflow {
  if (!object(v)) return false;
  const exact = (names: string[]) => keys(v, ["kind", ...names]);
  switch (v.kind) {
    case "inventory-item": return exact(["name", "category", "unit", "initialQuantity", "note"]) && required(v.name, 200) && text(v.category, 120) && required(v.unit, 40) && integer(v.initialQuantity) && text(v.note);
    case "inventory-movement": {
      if (!exact(["itemId", "action", "quantity", "party", "dueOn", "loanId", "note", "preparationId"]) || !id(v.itemId) || !["add", "consume", "loan", "return", "damage", "repair"].includes(String(v.action)) || !integer(v.quantity, 1) || !optionalId(v.loanId) || !optionalId(v.preparationId) || !text(v.note)) return false;
      if (v.action !== "loan") return v.party === null && v.dueOn === null && (v.action === "return" ? id(v.loanId) : v.loanId === null);
      const p = v.party;
      return v.loanId === null && day(v.dueOn) && object(p) && keys(p, ["type", "studentId", "name"]) && (p.type === "student" ? id(p.studentId) && p.name === "" : p.type === "adult" ? p.studentId === null && required(p.name, 200) : p.type === "removed" && p.studentId === null && p.name === "");
    }
    case "inventory-reversal": return exact(["sourceId", "note"]) && id(v.sourceId) && required(v.note);
    case "handover-plan": return exact(["title", "recipient", "dueOn", "note", "items"]) && required(v.title, 200) && required(v.recipient, 200) && day(v.dueOn) && text(v.note) && items(v.items);
    case "handover-revision": return exact(["handoverId", "items", "note"]) && id(v.handoverId) && items(v.items) && required(v.note);
    case "handover-check": return exact(["handoverId", "itemId", "completed", "note"]) && id(v.handoverId) && id(v.itemId) && typeof v.completed === "boolean" && text(v.note);
    case "handover-close": return exact(["handoverId", "recipient", "note"]) && id(v.handoverId) && required(v.recipient, 200) && text(v.note);
    case "handover-reopen": return exact(["handoverId", "note"]) && id(v.handoverId) && required(v.note);
    default: return false;
  }
}
export function isClassroomAdminRecord(v: unknown): v is ClassroomAdminRecord {
  return object(v) && keys(v, ["id", "createdAt", "updatedAt", "civilDate", "schemaVersion", "deletedAt", ...CLASSROOM_ADMIN_KEYS]) && id(v.id) && utc(v.createdAt) && v.updatedAt === v.createdAt && day(v.civilDate) && v.civilDate <= civilDateInIstanbul(new Date(v.createdAt)) && v.schemaVersion === 1 && v.deletedAt === null && v.settingType === CLASSROOM_ADMIN_SETTING_TYPE && id(v.academicYearId) && id(v.classroomId) && v.studentId === null && isClassroomAdminWorkflow(v.workflow);
}
export function classroomAdminRecords(snapshot: DataSnapshot, scope?: Scope): ClassroomAdminRecord[] {
  return snapshot.settings.filter(isClassroomAdminRecord).filter(r => !scope || sameScope(scope, r)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
export function adminLedgerHead(records: readonly ClassroomAdminRecord[]): string | null { return records.at(-1)?.id ?? null; }
export type InventoryBalance = { item: ClassroomAdminRecord & { workflow: Extract<ClassroomAdminWorkflow, { kind: "inventory-item" }> }; owned: number; available: number; onLoan: number; damaged: number; loans: { record: ClassroomAdminRecord; remaining: number }[] };
/** Replays all effective movements in event order. Null/missing is never treated as stock. */
export function inventoryBalances(records: readonly ClassroomAdminRecord[]): InventoryBalance[] {
  const reversed = new Set(records.flatMap(r => r.workflow.kind === "inventory-reversal" ? [r.workflow.sourceId] : []));
  const balances = new Map<string, InventoryBalance>();
  for (const r of records) {
    const w = r.workflow;
    if (w.kind === "inventory-item") balances.set(r.id, { item: r as InventoryBalance["item"], owned: w.initialQuantity, available: w.initialQuantity, onLoan: 0, damaged: 0, loans: [] });
    if (w.kind !== "inventory-movement" || reversed.has(r.id)) continue;
    const b = balances.get(w.itemId);
    if (!b) throw new Error("Malzeme hareketinin kaynağı bulunamadı.");
    if (w.action === "add") { b.owned += w.quantity; b.available += w.quantity; }
    if (w.action === "consume") { b.owned -= w.quantity; b.available -= w.quantity; }
    if (w.action === "damage") { b.available -= w.quantity; b.damaged += w.quantity; }
    if (w.action === "repair") { b.damaged -= w.quantity; b.available += w.quantity; }
    if (w.action === "loan") { b.available -= w.quantity; b.onLoan += w.quantity; b.loans.push({ record: r, remaining: w.quantity }); }
    if (w.action === "return") {
      const loan = b.loans.find(l => l.record.id === w.loanId);
      if (!loan || loan.remaining < w.quantity) throw new Error("İade miktarı açık emaneti aşıyor veya emanet kaynağı geçersiz.");
      loan.remaining -= w.quantity; b.onLoan -= w.quantity; b.available += w.quantity;
    }
    if ([b.owned, b.available, b.onLoan, b.damaged].some(n => !Number.isSafeInteger(n) || n < 0 || n > 1_000_000) || b.owned !== b.available + b.onLoan + b.damaged) throw new Error("Bu hareket mevcut stokla uyuşmuyor. Kullanılabilir, emanet ve hasarlı miktarları kontrol edin.");
  }
  return [...balances.values()];
}
export function handoverState(records: readonly ClassroomAdminRecord[], handoverId: string) {
  const source = records.find(r => r.id === handoverId && r.workflow.kind === "handover-plan");
  if (!source || source.workflow.kind !== "handover-plan") return null;
  let currentItems = source.workflow.items;
  let closed: ClassroomAdminRecord | null = null;
  const checks = new Map<string, ClassroomAdminRecord>();
  const history = records.filter(r => r.id === handoverId || ("handoverId" in r.workflow && r.workflow.handoverId === handoverId));
  for (const r of history) {
    const w = r.workflow;
    if (w.kind === "handover-revision") currentItems = w.items;
    if (w.kind === "handover-check") checks.set(w.itemId, r);
    if (w.kind === "handover-close") closed = r;
    if (w.kind === "handover-reopen") closed = null;
  }
  const checked = (entry: HandoverItem) => { const w = checks.get(entry.id)?.workflow; return w?.kind === "handover-check" && w.completed; };
  return { source, items: currentItems, checks, closed, history, checked, completedCount: currentItems.filter(checked).length };
}
export function outstandingHandoverSources(snapshot: DataSnapshot, scope: Scope): Omit<HandoverItem, "id">[] {
  const followups = teacherFollowups(snapshot).filter(r => sameScope(scope, r));
  const reminders = followupReminders(followups, "9999-12-31");
  const generic = { meeting: "Veli görüşmesi sonrası takip", guide: "Uyum adımı takibi", learning: "Eğitim kararı takibi", preparation: "Haftalık malzeme hazırlığı" };
  return [...reminders.map(r => ({ title: generic[r.kind], sourceId: r.id, sourceKind: "followup" as const, studentId: r.studentId, redacted: false })), ...inventoryBalances(classroomAdminRecords(snapshot, scope)).flatMap(b => b.loans.filter(l => l.remaining > 0).map(l => ({ title: `${b.item.workflow.name} · açık emanet`, sourceId: l.record.id, sourceKind: "loan" as const, studentId: l.record.workflow.kind === "inventory-movement" ? l.record.workflow.party?.studentId ?? null : null, redacted: false })))];
}
export function missingHandoverSources(snapshot: DataSnapshot, scope: Scope, entries: readonly HandoverItem[]): Omit<HandoverItem, "id">[] {
  return outstandingHandoverSources(snapshot, scope).filter(s => !entries.some(i => i.sourceId === s.sourceId && !i.redacted));
}
/** A completed check becomes stale if its source receives a later correction or follow-up. */
export function staleHandoverItems(snapshot: DataSnapshot, records: readonly ClassroomAdminRecord[], handoverId: string): HandoverItem[] {
  const state = handoverState(records, handoverId);
  if (!state || state.closed) return [];
  return state.items.filter(entry => {
    const check = state.checks.get(entry.id);
    if (entry.redacted || !entry.sourceId || !check || !state.checked(entry)) return false;
    const [sourceId, preparationItemId] = entry.sourceId.split(":");
    const sourceRecords = entry.sourceKind === "followup" ? teacherFollowups(snapshot).filter(r => r.id === sourceId || ("sourceId" in r.workflow && r.workflow.sourceId === sourceId && (!preparationItemId || ("itemId" in r.workflow && r.workflow.itemId === preparationItemId)))) : records.filter(r => {
      const w = r.workflow;
      return r.id === sourceId || (w.kind === "inventory-movement" && w.loanId === sourceId) || (w.kind === "inventory-reversal" && (w.sourceId === sourceId || records.some(p => p.id === w.sourceId && p.workflow.kind === "inventory-movement" && p.workflow.loanId === sourceId)));
    });
    return sourceRecords.some(r => r.createdAt > check.createdAt);
  });
}
export function classroomAdminReminders(snapshot: DataSnapshot, today: string) {
  const records = classroomAdminRecords(snapshot);
  const result: { id: string; title: string; dueOn: string; studentId?: string; section: "inventory" | "handover" }[] = [];
  for (const b of inventoryBalances(records)) for (const loan of b.loans) {
    const w = loan.record.workflow;
    if (w.kind === "inventory-movement" && w.dueOn && w.dueOn <= today && loan.remaining > 0) result.push({ id: loan.record.id, title: `${b.item.workflow.name} · ${loan.remaining} ${b.item.workflow.unit} iade bekliyor`, dueOn: w.dueOn, ...(w.party?.studentId ? { studentId: w.party.studentId } : {}), section: "inventory" });
  }
  for (const r of records) if (r.workflow.kind === "handover-plan" && r.workflow.dueOn <= today && !handoverState(records, r.id)?.closed) result.push({ id: r.id, title: r.workflow.title, dueOn: r.workflow.dueOn, section: "handover" });
  return result.sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}
export function assertClassroomAdminRelationships(snapshot: DataSnapshot): void {
  const raw = snapshot.settings.filter(r => r.settingType === CLASSROOM_ADMIN_SETTING_TYPE);
  if (!raw.every(isClassroomAdminRecord)) throw new Error("Malzeme ve devir kaydı sözleşmesi geçersiz.");
  const records = classroomAdminRecords(snapshot);
  const prior: ClassroomAdminRecord[] = [];
  const byId = new Map<string, ClassroomAdminRecord>();
  const reversed = new Set<string>();
  for (const r of records) {
    if (byId.has(r.id)) throw new Error("Malzeme/devir olay kimliği yineleniyor.");
    const year = snapshot.academicYears.find(y => y.id === r.academicYearId);
    if (!year || !snapshot.classrooms.some(c => c.id === r.classroomId && c.academicYearId === r.academicYearId)) throw new Error("Malzeme/devir eğitim yılı veya sınıfı bulunamadı.");
    const w = r.workflow;
    const source = (sourceId: string, kind: ClassroomAdminWorkflow["kind"]) => { const s = byId.get(sourceId); if (!s || !sameScope(r, s) || s.workflow.kind !== kind || s.civilDate > r.civilDate) throw new Error("Malzeme/devir kaynağı, sınıfı veya tarih sırası geçersiz."); return s; };
    if (w.kind === "inventory-movement") {
      source(w.itemId, "inventory-item");
      if (w.action === "loan" && w.dueOn! < r.civilDate) throw new Error("İade tarihi emanet tarihinden önce olamaz.");
      if (w.party?.type === "student" && !snapshot.students.some(s => s.id === w.party?.studentId)) throw new Error("Emanet alan çocuk bulunamadı.");
      if (w.action === "return") { const s = source(w.loanId!, "inventory-movement"); if (s.workflow.kind !== "inventory-movement" || s.workflow.action !== "loan" || s.workflow.itemId !== w.itemId) throw new Error("İade emanetle eşleşmiyor."); }
      if (w.preparationId && !teacherFollowups(snapshot).some(p => p.id === w.preparationId && sameScope(r, p) && p.workflow.kind === "preparation-list" && p.createdAt <= r.createdAt)) throw new Error("Haftalık hazırlık bağlantısı geçersiz.");
    }
    if (w.kind === "inventory-reversal") { source(w.sourceId, "inventory-movement"); if (reversed.has(w.sourceId)) throw new Error("Aynı malzeme hareketi ikinci kez geri alınamaz."); reversed.add(w.sourceId); }
    if (w.kind === "handover-plan" || w.kind === "handover-revision") for (const entry of w.items) {
      if (entry.studentId && !snapshot.students.some(s => s.id === entry.studentId)) throw new Error("Devir maddesinin çocuğu bulunamadı.");
      if (entry.redacted || entry.sourceKind === "manual") continue;
      const src = entry.sourceKind === "loan" ? byId.get(entry.sourceId!) : teacherFollowups(snapshot).find(p => p.id === entry.sourceId!.split(":")[0]);
      if (!src || !sameScope(r, src) || src.createdAt > r.createdAt) throw new Error("Devir maddesinin dayanağı geçersiz.");
      if (entry.sourceKind === "loan" && (src.workflow.kind !== "inventory-movement" || src.workflow.action !== "loan" || entry.studentId !== src.workflow.party?.studentId)) throw new Error("Devir ve emanet çocuğu uyuşmuyor.");
      if (entry.sourceKind === "followup" && entry.studentId !== src.studentId) throw new Error("Devir ve öğretmen takibi çocuğu uyuşmuyor.");
      if (entry.sourceKind === "followup" && entry.sourceId!.includes(":")) {
        const itemId = entry.sourceId!.split(":")[1];
        if (src.workflow.kind !== "preparation-list" || !src.workflow.items.some(i => i.id === itemId)) throw new Error("Devir hazırlık maddesi kaynağında bulunamadı.");
      }
    }
    if ("handoverId" in w) {
      source(w.handoverId, "handover-plan");
      const state = handoverState(prior, w.handoverId)!;
      if (w.kind === "handover-reopen") { if (!state.closed) throw new Error("Açık devir yeniden açılamaz."); }
      else if (state.closed) throw new Error("Tamamlanmış devir önce gerekçeyle yeniden açılmalı.");
      if (w.kind === "handover-check" && !state.items.some(i => i.id === w.itemId)) throw new Error("Kontrol maddesi devir listesinde bulunamadı.");
      if (w.kind === "handover-revision") for (const entry of w.items) { const existing = state.items.find(i => i.id === entry.id); if (existing && canonicalJson(existing) !== canonicalJson(entry)) throw new Error("Devir maddesi değiştiyse yeni madde kimliği gerekir."); }
      if (w.kind === "handover-close" && state.completedCount !== state.items.length) throw new Error("Devir için bütün maddeler kontrol edilmeli.");
    }
    prior.push(r); byId.set(r.id, r);
    // Validate at each mutation as well as the final state, including reversal dependencies.
    if (w.kind.startsWith("inventory-")) inventoryBalances(prior);
  }
}
