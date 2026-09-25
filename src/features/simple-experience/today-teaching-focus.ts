import type { ActivityStudioItem } from "../activity-studio/activity-studio-model.ts";
import type { TodayPlanItem } from "../today/today-data.ts";

export type TodayTeachingFocus =
  | { kind: "recorded"; item: TodayPlanItem }
  | { kind: "suggestion"; activity: ActivityStudioItem };

interface TodayTeachingFocusInput {
  enabled: boolean;
  pendingObservationCount: number;
  blockedByPlanIntegrity: boolean;
  hasRecordedDailyPlan: boolean;
  dayNeedsReview: boolean;
  currentActivity: TodayPlanItem | null;
  planItems: readonly TodayPlanItem[];
  suggestions: readonly ActivityStudioItem[];
}

/** A suggestion never replaces a real plan or an observation awaiting attention. */
export function createTodayTeachingFocus(input: TodayTeachingFocusInput): TodayTeachingFocus | null {
  if (!input.enabled || input.pendingObservationCount > 0 || input.blockedByPlanIntegrity || input.dayNeedsReview) return null;
  const available = input.planItems.filter((item) =>
    item.flowBlockStatus !== "skipped" && item.flowBlockStatus !== "optional");
  const current = available.find((item) => item.id === input.currentActivity?.id && item.status === "in_progress");
  const next = current ?? available.find((item) => item.status === "in_progress") ??
    available.find((item) => item.status !== "completed");
  if (next) return { kind: "recorded", item: next };
  // An exhausted, optional-only or skipped plan is still a real plan.
  if (input.hasRecordedDailyPlan || input.planItems.length > 0) return null;
  const activity = input.suggestions[0];
  return activity ? { kind: "suggestion", activity } : null;
}

export const TODAY_TEACHING_COPY = {
  explore: "Bugün birlikte keşfedelim",
  continue: "Kaldığınız yerden devam",
  planned: "Bugünün akışı",
  suggestion: "Bugün için bir fikir",
  suggestionNote: "Öneri · Henüz günlük planınıza eklenmedi",
  current: "Şu anki etkinlik",
  next: "Sıradaki adım",
  materials: "Hazır olsun",
  guide: "Rehberi aç",
  observe: "Gözlem ekle",
  applyObserve: "Uygula ve gözlemle",
  completeActivity: "Etkinliği tamamla",
  completeActivityDetail: "Gözlemler korunur; akış sıradaki adıma geçer",
  dailyFlow: "Günlük akışı aç",
  savedFlow: "Kayıtlı günlük akış",
  completed: "Tamamlandı",
  upcoming: "Sırada",
  inProgress: "Devam ediyor",
  dayPlan: "Günün planı",
  attendance: "Yoklama",
  detail: "Günün ayrıntıları",
  moreFlow: (count: number) => `Akışta ${count} adım daha var`,
} as const;
