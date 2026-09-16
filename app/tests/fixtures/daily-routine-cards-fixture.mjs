import { FamilyMemoryStore, familyFixture, familyScope, familyUid, familyNow } from "./family-engagement-fixture.mjs";
import { createTeacherOwnedDailyFlow, defaultTeacherOwnedDailyFlowBlockDrafts } from "../../src/core/domain/teacher-owned-daily-flow.ts";
import { routineDraft } from "../../src/core/domain/daily-routine-cards.ts";
import { saveDailyRoutineCards } from "../../src/features/daily-routine-cards/daily-routine-cards-service.ts";
export { FamilyMemoryStore as RoutineMemoryStore, familyScope as routineScope, familyNow as routineNow };
export const routinePlanId = familyUid(710);
export function routinePlan(scope = familyScope, date = "2026-09-18") {
  const teacherOwnedDailyFlow = createTeacherOwnedDailyFlow({ blocks: defaultTeacherOwnedDailyFlowBlockDrafts(240).map((b, i) => ({ ...b, title: `Kurgu ${i + 1}. günlük bölüm`, status: i === 7 ? "skipped" : i === 8 ? "optional" : "planned", teacherNote: "Çocuk kartına taşınmayacak öğretmen notu" })), schedule: { kind: "morning", startTime: "09:00", endTime: "13:00", timeZone: "Europe/Istanbul" }, confirmedByUserId: familyUid(711), now: new Date("2026-09-18T07:00:00.000Z") });
  return { id: routinePlanId, ...scope, createdAt: teacherOwnedDailyFlow.createdAt, updatedAt: teacherOwnedDailyFlow.updatedAt, civilDate: date, deletedAt: null, schemaVersion: 1, planType: "daily", title: "Kurgu öğretmen günlük akışı", teacherOwnedDailyFlow };
}
export function routineFixture(withPlan = true) { const s = familyFixture(); if (withPlan) s.plans.push(routinePlan()); return s; }
export function manualRoutineDraft(mode = "short") { return { routineOn: "2026-09-18", dayMode: mode, title: "Kurgu günümüzün sırası", source: null, ...routineDraft(mode) }; }
export async function seedDailyRoutineCardsFixture(store, { scope = familyScope, now = familyNow, routineOn = "2026-09-18" } = {}) { return saveDailyRoutineCards(store, { scope, now, expectedEventId: null, draft: { ...manualRoutineDraft(), routineOn } }); }
