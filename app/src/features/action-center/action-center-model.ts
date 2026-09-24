import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, recordBelongsToClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { OBSERVATION_CATEGORIES_V2, type ObservationCategoryV2 } from "../../core/domain/observation-taxonomy.ts";
import { isTeacherOwnedPlanRecord } from "../../core/domain/teacher-owned-plan.ts";
import { teacherFollowups } from "../../core/domain/teacher-followup.ts";
import { preparationCandidates } from "../teacher-followup/teacher-followup-service.ts";
import { ACTION_CENTER_COPY as copy } from "./action-center-copy.ts";
import { observationMetadataModel } from "../observation-management/observation-management-model.ts";

export interface ActionScope extends ActiveClassroomScope { studentId: string; observationId: string; expectedUpdatedAt: string }
export interface SupportPeriod { start: string; end: string; existingPlanId: string | null; expectedPlanUpdatedAt: string | null }
export interface ObservationAction { scope: ActionScope; studentName: string; rawText: string; civilDate: string; categories: ObservationCategoryV2[]; assignedCategories: string[]; needsCategory: boolean; planId: string | null; period: SupportPeriod | null }
export const alive = (record: StoredRecord): boolean => typeof record.deletedAt !== "string";
export function addDays(day: string, days: number): string { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
export function supportPeriod(snapshot: DataSnapshot, scope: ActiveClassroomScope, today: string): SupportPeriod | null {
  const year = snapshot.academicYears.find(y => y.id === scope.academicYearId && alive(y));
  if (!year || typeof year.endDate !== "string" || typeof year.startDate !== "string") return null;
  let start = addDays(today, 7 - ((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  if (start < year.startDate) start = year.startDate;
  if (start > year.endDate) return null;
  const plans = snapshot.plans.filter(p => alive(p) && recordBelongsToClassroomScope(p, scope) && isTeacherOwnedPlanRecord(p));
  const running = plans.find(p => p.planType === "weekly" && String(p.periodStart) <= today && String(p.periodEnd) >= start);
  if (running) {
    start = addDays(String(running.periodEnd), 1);
    start = addDays(start, (7 - ((new Date(`${start}T12:00:00Z`).getUTCDay() + 6) % 7)) % 7);
    if (start > year.endDate) return null;
  }
  const d = new Date(`${start}T12:00:00Z`);
  const monthEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12)).toISOString().slice(0, 10);
  let end = [addDays(start, 4), monthEnd, year.endDate].sort()[0];
  const weekly = plans.filter(p => p.planType === "weekly" && String(p.periodStart) <= end && String(p.periodEnd) >= start && String(p.periodStart) > today)
    .sort((a, b) => String(a.periodStart).localeCompare(String(b.periodStart)) || a.id.localeCompare(b.id))[0];
  if (weekly) return { start: String(weekly.periodStart), end: String(weekly.periodEnd), existingPlanId: weekly.id, expectedPlanUpdatedAt: weekly.updatedAt };
  // An overlapping week that already started is not a future support target.
  if (plans.some(p => p.planType === "weekly" && String(p.periodStart) <= end && String(p.periodEnd) >= start)) return null;
  const parent = plans.find(p => p.planType === "monthly" && String(p.periodStart) <= start && String(p.periodEnd) >= start);
  if (parent) end = [end, String(parent.periodEnd)].sort()[0];
  return { start, end, existingPlanId: null, expectedPlanUpdatedAt: null };
}

const CATEGORY_CUES: Partial<Record<ObservationCategoryV2, readonly string[]>> = {
  "language-communication": ["anlat", "söyle", "konuş", "kelime", "hikâye", "cümle"],
  "cognitive-learning": ["saydı", "sayma", "eşleştir", "sırala", "sayı", "şekil"],
  "social-emotional": ["duygu", "arkadaş", "üzül", "sevindi"],
  "values-dispositions-participation": ["paylaş", "yardım", "sırasını", "teşekkür"],
  "physical-motor-health": ["koş", "zıpla", "denge", "kesme", "topu"],
  "self-care-daily-life": ["ellerini", "giy", "tuvalet", "yemek", "topladı"],
  "art-creativity": ["resim", "boya", "çiz", "müzik", "ritim"],
  "play-participation": ["oyun", "blok", "oynadı"],
  "interest-attention-curiosity": ["merak", "incele", "soru", "dikkat"],
};
export function categoryChoices(rawText: string): ObservationCategoryV2[] {
  const text = rawText.toLocaleLowerCase("tr-TR");
  return [...OBSERVATION_CATEGORIES_V2].sort((a, b) => {
    const score = (category: ObservationCategoryV2) => (CATEGORY_CUES[category] ?? []).filter(cue => text.includes(cue)).length;
    return score(b) - score(a) || OBSERVATION_CATEGORIES_V2.indexOf(a) - OBSERVATION_CATEGORIES_V2.indexOf(b);
  });
}

export function actionCenterModel(snapshot: DataSnapshot, options: { studentId?: string; observationId?: string; now?: Date } = {}) {
  const scope = resolveActiveClassroomScope(snapshot);
  const today = civilDateInIstanbul(options.now ?? new Date());
  const year = scope && snapshot.academicYears.find(y => y.id === scope.academicYearId);
  if (!scope || !year || !alive(year) || year.status === "archived") return { observations: [] as ObservationAction[], preparation: [], candidates: [], period: null, scope: null };
  const records = teacherFollowups(snapshot).filter(r => recordBelongsToClassroomScope(r, scope));
  const period = supportPeriod(snapshot, scope, today);
  const observations: ObservationAction[] = [];
  for (const observation of snapshot.observations.filter(o => alive(o) && recordBelongsToClassroomScope(o, scope) && o.civilDate <= today && (!options.observationId || o.id === options.observationId)).sort((a,b) => b.civilDate.localeCompare(a.civilDate) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))) {
    const ids = [...new Set([observation.studentId, ...(Array.isArray(observation.studentIds) ? observation.studentIds : [])])];
    for (const id of ids) {
      const student = snapshot.students.find(s => s.id === id && alive(s) && s.active !== false && recordBelongsToClassroomScope(s, scope));
      if (!student || (options.studentId && student.id !== options.studentId)) continue;
      const decisions = records.filter(r => r.studentId === student.id && r.workflow.kind === "learning-decision" && r.workflow.observationIds.includes(observation.id));
      const link = records.find(r => r.workflow.kind === "learning-plan-link" && decisions.some(d => d.id === ("sourceId" in r.workflow ? r.workflow.sourceId : "")));
      const linkedId = link?.workflow.kind === "learning-plan-link" ? link.workflow.planId : null;
      const planId = linkedId && snapshot.plans.some(p => p.id === linkedId && alive(p)) ? linkedId : null;
      const needsCategory = !Array.isArray(observation.observationCategories) || observation.observationCategories.length === 0;
      const assignedCategories = Array.isArray(observation.observationCategories) ? observation.observationCategories.map(category => copy.categoryLabels[category as ObservationCategoryV2] ?? copy.legacyCategoryLabels[String(category)] ?? String(category)) : [];
      const metadata = observationMetadataModel(snapshot, observation.id, undefined, options.now);
      const needsPlacement = !!metadata && (metadata.developmentChoices.length > 0 || ((!metadata.currentTitle || metadata.currentIsSpontaneous) && metadata.placements.length > 0));
      if (planId && !needsCategory && !needsPlacement && !options.observationId) continue;
      observations.push({ scope: { ...scope, studentId: student.id, observationId: observation.id, expectedUpdatedAt: observation.updatedAt }, studentName: String(student.displayName ?? ""), rawText: String(observation.rawText ?? ""), civilDate: observation.civilDate, categories: categoryChoices(String(observation.rawText ?? "")), assignedCategories, needsCategory, planId, period });
    }
  }
  const preparation = options.studentId || options.observationId ? [] : records.flatMap(r => r.workflow.kind !== "preparation-list" || r.workflow.sources.some(s => !snapshot[s.collection].some(source => source.id === s.id && alive(source) && source.updatedAt === s.updatedAt)) ? [] : r.workflow.items.flatMap(item => {
    const latest = records.filter(e => e.workflow.kind === "preparation-check" && e.workflow.sourceId === r.id && e.workflow.itemId === item.id).at(-1);
    return latest?.workflow.kind === "preparation-check" && latest.workflow.completed ? [] : [{ sourceId: r.id, itemId: item.id, text: item.text, dueOn: item.dueOn, ...scope }];
  }));
  const candidates = options.studentId || options.observationId || !period ? [] : preparationCandidates(snapshot, scope, today, period.end)
    .filter(c => (c.materials.length || c.preparation.length) && !records.some(r => r.workflow.kind === "preparation-list" && r.workflow.sources.some(s => s.id === c.source.id && s.updatedAt === c.source.updatedAt)));
  return { observations, preparation, candidates, period, scope };
}
export function supportText(action: ObservationAction, optionId: string): string {
  const option = copy.supportOptions.find(o => o.id === optionId);
  if (!option || !action.period) throw new Error(copy.stale);
  return `${action.studentName}\n${copy.sourceDate}: ${action.civilDate}\n${option.text}\n${copy.valueTrace}\n${copy.reviewDate}: ${action.period.end}`;
}
