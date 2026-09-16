import { COLLECTION_NAMES, createEmptySnapshot } from "../../core/domain/model.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { assertHomeGameCardRelationships, HOME_GAME_CARD_SETTING_TYPE, homeGameCards, homeGameSource, isHomeGameCardRecord, type HomeGameCardRecord, type HomeGameWorkflow } from "./home-game-card-model.ts";
export const HOME_GAME_CARDS_CHANGED = "maarifos:home-game-cards-changed";
export async function saveHomeGameCards(store: LocalDataStore, input: { studentIds: string[]; activityId: string; materials: string; steps: string; expectedFingerprints: Record<string,string>; now?: Date }) {
  if (!input.studentIds.length || new Set(input.studentIds).size !== input.studentIds.length) throw new Error("Kart için çocuk seçin.");
  return save(store, input.now, (snapshot, scope) => input.studentIds.map(studentId => {
    const source = homeGameSource(snapshot, scope, studentId, input.activityId);
    if (input.expectedFingerprints[studentId] !== source.fingerprint) throw new Error("Etkinlik veya çocuk bilgileri değişti; kartı yeniden açın.");
    return { studentId, workflow: { kind: "prepared", activityId: source.activityId, planId: source.planId, sourceFingerprint: source.fingerprint, title: source.title, materials: input.materials, steps: input.steps } as HomeGameWorkflow };
  }));
}
export async function saveHomeGameFeedback(store: LocalDataStore, input: { cardId: string; receivedOn: string; source: "oral" | "written"; text: string; now?: Date }) {
  return save(store, input.now, (snapshot, scope) => {
    const card = homeGameCards(snapshot).find(r => r.id === input.cardId && r.workflow.kind === "prepared" && r.academicYearId === scope.academicYearId && r.classroomId === scope.classroomId);
    if (!card) throw new Error("Aile yanıtı için kayıtlı kartı seçin.");
    return [{ studentId: card.studentId, workflow: { kind: "feedback", cardId: card.id, receivedOn: input.receivedOn, source: input.source, text: input.text } }];
  });
}
async function save(store: LocalDataStore, now = new Date(), make: (snapshot: Awaited<ReturnType<LocalDataStore["readSnapshot"]>>, scope: NonNullable<ReturnType<typeof resolveActiveClassroomScope>>) => {studentId:string;workflow:HomeGameWorkflow}[]) {
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const snapshot = createEmptySnapshot();
    for (const name of COLLECTION_NAMES) snapshot[name] = await tx.getAll(name);
    const scope = resolveActiveClassroomScope(snapshot); if (!scope) throw new Error("Etkin sınıfı açın.");
    assertHomeGameCardRelationships(snapshot);
    const entries = make(snapshot, scope), saved: HomeGameCardRecord[] = [];
    let time = Math.max(now.getTime(), ...homeGameCards(snapshot).map(r => Date.parse(r.createdAt) + 1));
    if (!Number.isFinite(time) || time > now.getTime() + 60000) throw new Error("Cihaz saati kayıt geçmişiyle uyuşmuyor.");
    for (const entry of entries) {
      const existing = homeGameCards(snapshot).find(r => r.studentId === entry.studentId && r.academicYearId === scope.academicYearId && r.classroomId === scope.classroomId && JSON.stringify(r.workflow) === JSON.stringify(entry.workflow));
      if (existing) { saved.push(existing); continue; }
      const createdAt = new Date(time++).toISOString();
      const record: HomeGameCardRecord = { id: crypto.randomUUID(), createdAt, updatedAt: createdAt, civilDate: civilDateInIstanbul(new Date(createdAt)), schemaVersion: 1, deletedAt: null, settingType: HOME_GAME_CARD_SETTING_TYPE, ...scope, ...entry };
      if (!isHomeGameCardRecord(record)) throw new Error("Kart alanlarını ve gerçek geri bildirim tarihini kontrol edin.");
      snapshot.settings.push(record); saved.push(record);
    }
    assertHomeGameCardRelationships(snapshot);
    await tx.putMany("settings", saved); return saved;
  });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(HOME_GAME_CARDS_CHANGED));
  return result;
}
