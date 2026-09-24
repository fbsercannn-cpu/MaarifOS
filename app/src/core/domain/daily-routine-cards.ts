import { civilDateInIstanbul, isCivilDate } from "./attendance.ts";
import { isClassroomSchedule, type ClassroomSchedule } from "./classroom.ts";
import type { ActiveClassroomScope } from "./classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "./model.ts";
import { isTeacherOwnedDailyFlow, TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS, type TeacherOwnedDailyFlowBlock } from "./teacher-owned-daily-flow.ts";

export const SETTING_TYPE = "daily-routine-cards-v1" as const;
export const DAILY_ROUTINE_CARD_SETTING_TYPE = SETTING_TYPE;
export const DAILY_ROUTINE_CARD_KEYS = ["settingType", "academicYearId", "classroomId", "studentId", "workflow"] as const;
export const ROUTINE_ICONS = ["sun", "blocks", "circle", "palette", "meal", "tree", "book", "moon", "group", "home"] as const;
export type RoutineIcon = (typeof ROUTINE_ICONS)[number];
export type RoutineDayMode = "short" | "full";
export type RoutineCard = { id: string; order: number; title: string; icon: RoutineIcon; visible: boolean; status: "planned" | "optional" | "skipped"; durationMinutes: number | null; sourceBlockId: string | null };
export type RoutineSourceBlock = Pick<TeacherOwnedDailyFlowBlock, "id" | "order" | "kind" | "title" | "status" | "durationMinutes">;
export type RoutineSource = { planId: string; planUpdatedAt: string; flowUpdatedAt: string; flowRevisionNumber: number; schedule: ClassroomSchedule; blocks: RoutineSourceBlock[] };
export type DailyRoutineWorkflow = { kind: "routine-version"; routineId: string; previousEventId: string | null; routineOn: string; dayMode: RoutineDayMode; title: string; startTime: string | null; source: RoutineSource | null; cards: RoutineCard[] };
export type DailyRoutineCardRecord = StoredRecord & ActiveClassroomScope & { settingType: typeof SETTING_TYPE; schemaVersion: 1; studentId: null; deletedAt: null; workflow: DailyRoutineWorkflow };
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(v);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: readonly string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max && v === v.normalize("NFC").trim();
const date = (v: unknown): v is string => typeof v === "string" && isCivilDate(v);
const utc = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const clock = (v: unknown): v is string => typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(v);
const status = (v: unknown) => typeof v === "string" && ["planned", "optional", "skipped"].includes(v);
const minutes = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 240;
const sameScope = (a: ActiveClassroomScope, b: StoredRecord | ActiveClassroomScope) => a.academicYearId === b.academicYearId && a.classroomId === b.classroomId;
export function routineClockMinutes(v: string): number { if (!clock(v)) throw new Error("Kart başlangıç saati geçersiz."); return Number(v.slice(0, 2)) * 60 + Number(v.slice(3)); }
function minuteLabel(n: number): string { return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; }
export function routineSourceBlock(b: TeacherOwnedDailyFlowBlock): RoutineSourceBlock { return { id: b.id, order: b.order, kind: b.kind, title: b.title, status: b.status, durationMinutes: b.durationMinutes }; }
function isSource(v: unknown): v is RoutineSource {
  if (!object(v) || !object(v.schedule) || !exact(v.schedule, ["kind", "startTime", "endTime", "timeZone"])) return false;
  return object(v) && exact(v, ["planId", "planUpdatedAt", "flowUpdatedAt", "flowRevisionNumber", "schedule", "blocks"]) && uuid(v.planId) && utc(v.planUpdatedAt) && utc(v.flowUpdatedAt) && Number.isInteger(v.flowRevisionNumber) && Number(v.flowRevisionNumber) >= 1 && isClassroomSchedule(v.schedule) && Array.isArray(v.blocks) && v.blocks.length === 10 && v.blocks.every((b, i) => object(b) && exact(b, ["id", "order", "kind", "title", "status", "durationMinutes"]) && uuid(b.id) && b.order === i + 1 && b.kind === TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS[i] && text(b.title, 200) && status(b.status) && minutes(b.durationMinutes)) && new Set(v.blocks.map(b => b.id)).size === 10;
}
function isCard(v: unknown, index: number): v is RoutineCard { return object(v) && exact(v, ["id", "order", "title", "icon", "visible", "status", "durationMinutes", "sourceBlockId"]) && uuid(v.id) && v.order === index + 1 && text(v.title, 200) && ROUTINE_ICONS.includes(v.icon as RoutineIcon) && typeof v.visible === "boolean" && status(v.status) && (v.durationMinutes === null || minutes(v.durationMinutes)) && (v.sourceBlockId === null || uuid(v.sourceBlockId)); }
export function isDailyRoutineCardRecord(v: unknown): v is DailyRoutineCardRecord {
  if (!object(v) || !exact(v, ["id", "createdAt", "updatedAt", "civilDate", "schemaVersion", "deletedAt", ...DAILY_ROUTINE_CARD_KEYS]) || !uuid(v.id) || !utc(v.createdAt) || v.updatedAt !== v.createdAt || !date(v.civilDate) || v.civilDate !== civilDateInIstanbul(new Date(v.createdAt)) || v.schemaVersion !== 1 || v.deletedAt !== null || v.settingType !== SETTING_TYPE || !uuid(v.academicYearId) || !uuid(v.classroomId) || v.studentId !== null || !object(v.workflow)) return false;
  const w = v.workflow;
  if (typeof w.dayMode !== "string") return false;
  if (!exact(w, ["kind", "routineId", "previousEventId", "routineOn", "dayMode", "title", "startTime", "source", "cards"]) || w.kind !== "routine-version" || !uuid(w.routineId) || !(w.previousEventId === null || uuid(w.previousEventId)) || !date(w.routineOn) || !["short", "full"].includes(String(w.dayMode)) || !text(w.title, 150) || !(w.startTime === null || clock(w.startTime)) || !(w.source === null || isSource(w.source)) || !Array.isArray(w.cards) || w.cards.length < 1 || w.cards.length > 24 || !w.cards.every(isCard) || !w.cards.some(c => c.visible) || new Set(w.cards.map(c => c.id)).size !== w.cards.length) return false;
  const ids = w.cards.flatMap(c => c.sourceBlockId ? [c.sourceBlockId] : []);
  const source = w.source as RoutineSource | null;
  if (new Set(ids).size !== ids.length || (source === null && ids.length > 0) || (source && ids.some(id => !source.blocks.some(b => b.id === id)))) return false;
  if (w.startTime && routineClockMinutes(w.startTime) + w.cards.reduce((n, c) => n + (c.durationMinutes ?? 0), 0) > 1439) return false;
  return true;
}
export function dailyRoutineCards(snapshot: DataSnapshot, scope?: ActiveClassroomScope): DailyRoutineCardRecord[] { return snapshot.settings.filter(isDailyRoutineCardRecord).filter(r => !scope || sameScope(scope, r)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)); }
export function dailyRoutineHead(snapshot: DataSnapshot, scope: ActiveClassroomScope, routineOn: string, dayMode: RoutineDayMode) { return dailyRoutineCards(snapshot, scope).filter(r => r.workflow.routineOn === routineOn && r.workflow.dayMode === dayMode).at(-1); }
export function routineSourceFromPlan(plan: StoredRecord): RoutineSource {
  if (plan.planType !== "daily" || typeof plan.deletedAt === "string" || !isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow)) throw new Error("Kayıtlı öğretmen günlük akışı bulunamadı.");
  const flow = plan.teacherOwnedDailyFlow;
  return { planId: plan.id, planUpdatedAt: plan.updatedAt, flowUpdatedAt: flow.updatedAt, flowRevisionNumber: flow.revisionNumber, schedule: structuredClone(flow.scheduleSnapshot), blocks: flow.blocks.map(routineSourceBlock) };
}
export function routineSourceState(snapshot: DataSnapshot, source: RoutineSource | null): "manual" | "current" | "changed" | "removed" {
  if (!source) return "manual";
  const plan = snapshot.plans.find(p => p.id === source.planId);
  if (!plan || typeof plan.deletedAt === "string") return "removed";
  return plan.updatedAt === source.planUpdatedAt && isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow) && plan.teacherOwnedDailyFlow.updatedAt === source.flowUpdatedAt && plan.teacherOwnedDailyFlow.revisionNumber === source.flowRevisionNumber ? "current" : "changed";
}
export function routineCardTimes(workflow: Pick<DailyRoutineWorkflow, "startTime" | "cards">): { card: RoutineCard; startTime: string | null; endTime: string | null }[] {
  let cursor = workflow.startTime ? routineClockMinutes(workflow.startTime) : null;
  return workflow.cards.map(card => { const startTime = cursor === null ? null : minuteLabel(cursor); cursor = cursor === null || card.durationMinutes === null ? null : cursor + card.durationMinutes; return { card, startTime, endTime: cursor === null ? null : minuteLabel(cursor) }; });
}
const defaultTitles = ["Güne merhaba", "Oyun zamanı", "Birlikte çember", "Birlikte keşfedelim", "Beslenme ve temizlik", "Açık havadayız", "Kitap zamanı", "Dinleniyoruz", "Küçük grup zamanı", "Güle güle"];
export function routineDraft(dayMode: RoutineDayMode, source: RoutineSource | null = null): { startTime: string | null; cards: RoutineCard[] } {
  if (source) return { startTime: source.schedule.startTime, cards: source.blocks.map((b, index) => ({ id: crypto.randomUUID(), order: index + 1, title: b.title, icon: ROUTINE_ICONS[index]!, visible: b.status !== "skipped", status: b.status, durationMinutes: b.durationMinutes, sourceBlockId: b.id })) };
  const indices = dayMode === "full" ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [0, 1, 2, 4, 5, 9];
  return { startTime: null, cards: indices.map((i, index) => ({ id: crypto.randomUUID(), order: index + 1, title: defaultTitles[i]!, icon: ROUTINE_ICONS[i]!, visible: true, status: "planned", durationMinutes: null, sourceBlockId: null })) };
}
export function routineDailyPlans(snapshot: DataSnapshot, scope: ActiveClassroomScope, routineOn: string) { return snapshot.plans.filter(p => sameScope(scope, p) && p.planType === "daily" && p.civilDate === routineOn && typeof p.deletedAt !== "string" && isTeacherOwnedDailyFlow(p.teacherOwnedDailyFlow)); }
export function assertDailyRoutineCardRelationships(snapshot: DataSnapshot): void {
  const raw = snapshot.settings.filter(r => r.settingType === SETTING_TYPE);
  if (!raw.every(isDailyRoutineCardRecord) || new Set(raw.map(r => r.id)).size !== raw.length) throw new Error("Günlük rutin kartı sözleşmesi geçersiz.");
  const seen: DailyRoutineCardRecord[] = [];
  for (const r of dailyRoutineCards(snapshot)) {
    const w = r.workflow, year = snapshot.academicYears.find(y => y.id === r.academicYearId), classroom = snapshot.classrooms.find(c => c.id === r.classroomId);
    if (!year || !classroom || classroom.academicYearId !== year.id || !date(year.startDate) || !date(year.endDate) || w.routineOn < year.startDate || w.routineOn > year.endDate) throw new Error("Rutin kartlarının sınıf, yıl veya günü geçersiz.");
    const prior = seen.filter(e => sameScope(r, e) && e.workflow.routineOn === w.routineOn && e.workflow.dayMode === w.dayMode).at(-1);
    if ((prior?.id ?? null) !== w.previousEventId || (prior && (prior.workflow.routineId !== w.routineId || prior.createdAt >= r.createdAt)) || (!prior && seen.some(e => e.workflow.routineId === w.routineId))) throw new Error("Rutin kartları sürüm zinciri eski, dallanmış veya başka güne ait.");
    if (w.source) {
      const source = w.source, plan = snapshot.plans.find(p => p.id === source.planId);
      if (!plan || !sameScope(r, plan) || plan.planType !== "daily" || plan.civilDate !== w.routineOn || !isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow) || source.planUpdatedAt > plan.updatedAt || source.planUpdatedAt > r.createdAt || source.flowUpdatedAt > source.planUpdatedAt) throw new Error("Rutin kartlarının günlük akış kaynağı veya tarih zinciri geçersiz.");
      const flow = plan.teacherOwnedDailyFlow;
      const version = flow.revisionNumber === source.flowRevisionNumber ? flow : flow.revisionHistory.find(v => v.revisionNumber === source.flowRevisionNumber);
      if (!version || version.updatedAt !== source.flowUpdatedAt || version.blocks.length !== source.blocks.length || version.blocks.some((b, i) => (["id", "order", "kind", "title", "status", "durationMinutes"] as const).some(k => b[k] !== source.blocks[i]![k])) || ["kind", "startTime", "endTime", "timeZone"].some(k => source.schedule[k as keyof ClassroomSchedule] !== flow.scheduleSnapshot[k as keyof ClassroomSchedule])) throw new Error("Rutin kartlarının özgün akış bölümleri veya saat düzeni kaynak sürümünde bulunamadı.");
    }
    seen.push(r);
  }
}
