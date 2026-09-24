import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { assertDailyRoutineCardRelationships, dailyRoutineHead, isDailyRoutineCardRecord, routineSourceState, SETTING_TYPE, type DailyRoutineCardRecord, type DailyRoutineWorkflow } from "../../core/domain/daily-routine-cards.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
export const DAILY_ROUTINE_CHANGED_EVENT = "maarifos:daily-routine-cards-changed";
export type SaveDailyRoutineInput = { scope: ActiveClassroomScope; expectedEventId: string | null; draft: Omit<DailyRoutineWorkflow, "kind" | "routineId" | "previousEventId">; now?: Date };
export async function readDailyRoutineSnapshot(store: LocalDataStore): Promise<DataSnapshot> {
  return store.transaction("readonly", COLLECTION_NAMES, async tx => { const s = createEmptySnapshot(); for (const c of COLLECTION_NAMES) s[c] = await tx.getAll(c); return s; });
}
export async function saveDailyRoutineCards(store: LocalDataStore, input: SaveDailyRoutineInput): Promise<DailyRoutineCardRecord> {
  const scope = structuredClone(input.scope), draft = structuredClone(input.draft), expectedEventId = input.expectedEventId, now = new Date(input.now ?? new Date());
  if (!Number.isFinite(now.getTime())) throw new Error("Rutin kartlarının kayıt saati geçersiz.");
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const snapshot = createEmptySnapshot(); for (const c of COLLECTION_NAMES) snapshot[c] = await tx.getAll(c);
    const active = resolveActiveClassroomScope(snapshot), year = snapshot.academicYears.find(y => y.id === scope.academicYearId);
    if (!active || active.academicYearId !== scope.academicYearId || active.classroomId !== scope.classroomId) throw new Error("Etkin sınıf veya eğitim yılı değişti. Rutin kartları alanını yeniden açın.");
    if (!year || year.status === "archived" || typeof year.deletedAt === "string") throw new Error("Arşivlenen eğitim yılına rutin kartı eklenemez.");
    assertDailyRoutineCardRelationships(snapshot);
    const head = dailyRoutineHead(snapshot, scope, draft.routineOn, draft.dayMode);
    if ((head?.id ?? null) !== expectedEventId) throw new Error("Kartlar başka oturumda değişti. Güncel sürümü açıp yeniden düzenleyin.");
    if (draft.source && routineSourceState(snapshot, draft.source) !== "current") throw new Error("Günlük akış kaynağı değişmiş veya kaldırılmış. Kaynaktan güncel taslağı yeniden hazırlayın.");
    const max = snapshot.settings.reduce((n, r) => Math.max(n, Number.isFinite(Date.parse(r.createdAt)) ? Date.parse(r.createdAt) : 0), 0);
    if (max > now.getTime() + 60000) throw new Error("Cihaz saati önceki kayıtların gerisinde. Saati kontrol edin.");
    const timestamp = new Date(Math.max(now.getTime(), max + 1)).toISOString();
    const r: DailyRoutineCardRecord = { id: crypto.randomUUID(), ...scope, settingType: SETTING_TYPE, studentId: null, schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, civilDate: civilDateInIstanbul(new Date(timestamp)), deletedAt: null, workflow: { ...draft, title: draft.title.normalize("NFC").trim(), cards: draft.cards.map((c, i) => ({ ...c, order: i + 1, title: c.title.normalize("NFC").trim() })), kind: "routine-version", routineId: head?.workflow.routineId ?? crypto.randomUUID(), previousEventId: head?.id ?? null } };
    if (!isDailyRoutineCardRecord(r)) throw new Error("Kart başlıklarını, simgeleri, sırayı, süreleri ve günü kontrol edin. En az bir görünür kart gerekir.");
    snapshot.settings.push(r); assertDailyRoutineCardRelationships(snapshot); await tx.putMany("settings", [r]); return r;
  });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DAILY_ROUTINE_CHANGED_EVENT)); return result;
}
