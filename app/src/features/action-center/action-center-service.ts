import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, recordBelongsToClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { COLLECTION_NAMES, createEmptySnapshot, type DataSnapshot, type StoredRecord } from "../../core/domain/model.ts";
import { OBSERVATION_CATEGORIES_V2, OBSERVATION_TAXONOMY_VERSION_V2, type ObservationCategoryV2 } from "../../core/domain/observation-taxonomy.ts";
import { assertTeacherFollowupRelationships, isTeacherFollowupRecord, teacherFollowups, TEACHER_FOLLOWUP_SETTING_TYPE, type TeacherFollowupRecord, type TeacherWorkflow } from "../../core/domain/teacher-followup.ts";
import { isTeacherOwnedPlanRecord, type TeacherOwnedPlanRecord, type TeacherOwnedWeeklyPlan } from "../../core/domain/teacher-owned-plan.ts";
import type { DataTransaction, LocalDataStore } from "../../core/repository/contracts.ts";
import { isEntityRecord } from "../../core/repository/entities.ts";
import { loadTeacherOwnedPlanGraph } from "../planning/teacher-owned-plan-service.ts";
import { combinePreparationItems, notifyFollowupChanged, type PreparationCandidate } from "../teacher-followup/teacher-followup-service.ts";
import { ACTION_CENTER_COPY as copy } from "./action-center-copy.ts";
import { actionCenterModel, alive, supportText, type ActionScope, type ObservationAction, type SupportPeriod } from "./action-center-model.ts";

async function snapshotOf(tx: DataTransaction): Promise<DataSnapshot> {
  const result = createEmptySnapshot();
  for (const collection of COLLECTION_NAMES) result[collection] = await tx.getAll(collection);
  return result;
}
function checkScope(snapshot: DataSnapshot, expected: ActiveClassroomScope): ActiveClassroomScope {
  const scope = resolveActiveClassroomScope(snapshot);
  const year = snapshot.academicYears.find(y => y.id === scope?.academicYearId);
  if (!scope || !year || !alive(year) || year.status === "archived" || scope.academicYearId !== expected.academicYearId || scope.classroomId !== expected.classroomId) throw new Error(copy.stale);
  return scope;
}
function observationFor(snapshot: DataSnapshot, input: ActionScope, now: Date): StoredRecord {
  checkScope(snapshot, input);
  const student = snapshot.students.find(s => s.id === input.studentId && alive(s) && s.active !== false && recordBelongsToClassroomScope(s, input));
  const observation = snapshot.observations.find(o => o.id === input.observationId && alive(o) && recordBelongsToClassroomScope(o, input));
  if (!student || !observation || observation.civilDate > civilDateInIstanbul(now) || (observation.studentId !== student.id && !(Array.isArray(observation.studentIds) && observation.studentIds.includes(student.id)))) throw new Error(copy.stale);
  return observation;
}
function timestamp(snapshot: DataSnapshot, now: Date): string {
  const max = [...snapshot.settings.filter(isTeacherFollowupRecord), ...snapshot.plans].reduce((value, record) => Math.max(value, Date.parse(record.updatedAt) || 0), 0);
  return new Date(Math.max(now.getTime(), max + 1)).toISOString();
}
function append(snapshot: DataSnapshot, scope: ActiveClassroomScope, studentId: string | null, workflow: TeacherWorkflow, now: Date): TeacherFollowupRecord {
  const at = timestamp(snapshot, now);
  const record: TeacherFollowupRecord = { id: crypto.randomUUID(), ...scope, studentId, settingType: TEACHER_FOLLOWUP_SETTING_TYPE, workflow, schemaVersion: 1, createdAt: at, updatedAt: at, civilDate: civilDateInIstanbul(now), deletedAt: null };
  if (!isTeacherFollowupRecord(record)) throw new Error(copy.error);
  snapshot.settings.push(record);
  return record;
}

export async function assignObservationCategory(store: LocalDataStore, input: ActionScope & { category: ObservationCategoryV2; now?: Date }) {
  if (!OBSERVATION_CATEGORIES_V2.includes(input.category)) throw new Error(copy.stale);
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const snapshot = await snapshotOf(tx);
    const observation = observationFor(snapshot, input, input.now ?? new Date());
    if (Array.isArray(observation.observationCategories) && observation.observationCategories.includes(input.category)) return { alreadyCompleted: true };
    if (observation.updatedAt !== input.expectedUpdatedAt || (Array.isArray(observation.observationCategories) && observation.observationCategories.length)) throw new Error(copy.stale);
    const revised = { ...observation, observationCategories: [input.category], observationTaxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2, updatedAt: new Date(Math.max((input.now ?? new Date()).getTime(), Date.parse(observation.updatedAt) + 1)).toISOString() };
    if (!isEntityRecord("observations", revised)) throw new Error(copy.error);
    await tx.putMany("observations", [revised]);
    return { alreadyCompleted: false };
  });
  notifyFollowupChanged();
  return result;
}

function revisedPlan<T extends TeacherOwnedPlanRecord>(plan: T, edits: Partial<T>, at: string): T {
  return { ...structuredClone(plan), ...edits, updatedAt: at, revisionNumber: plan.revisionNumber + 1, revisionHistory: [...plan.revisionHistory, { revisionNumber: plan.revisionNumber, title: plan.title, teacherContent: structuredClone(plan.teacherContent), periodStart: plan.periodStart, periodEnd: plan.periodEnd, updatedAt: plan.updatedAt, capturedAt: at }] };
}
function replacePlan(snapshot: DataSnapshot, plan: TeacherOwnedPlanRecord) {
  if (!isTeacherOwnedPlanRecord(plan)) throw new Error(copy.error);
  const index = snapshot.plans.findIndex(p => p.id === plan.id);
  if (index < 0) snapshot.plans.push(plan); else snapshot.plans[index] = plan;
}
export function ensureWeek(snapshot: DataSnapshot, scope: ActiveClassroomScope, period: SupportPeriod, now: Date): TeacherOwnedWeeklyPlan {
  const plans = snapshot.plans.filter(isTeacherOwnedPlanRecord).filter(p => alive(p) && recordBelongsToClassroomScope(p, scope));
  if (period.existingPlanId) {
    const existing = plans.find(p => p.id === period.existingPlanId);
    if (!existing || existing.planType !== "weekly") throw new Error(copy.stale);
    return existing;
  }
  const year = snapshot.academicYears.find(y => y.id === scope.academicYearId)!;
  const at = timestamp(snapshot, now);
  const base = { ...scope, planOrigin: "teacher-authored" as const, status: "active" as const, schemaVersion: 1 as const, createdAt: at, updatedAt: at, deletedAt: null, revisionNumber: 1, revisionHistory: [], teacherContent: { narrative: copy.annualText } };
  let annual = plans.find(p => p.planType === "annual" && p.periodStart <= period.start && p.periodEnd >= period.end);
  if (annual && annual.planType !== "annual") throw new Error(copy.stale);
  if (!annual) {
    if (plans.some(p => p.planType === "annual")) throw new Error(copy.stale);
    annual = { ...base, id: crypto.randomUUID(), planType: "annual", title: copy.annualTitle, periodStart: String(year.startDate), periodEnd: String(year.endDate), civilDate: String(year.startDate), monthlySectionIds: [] };
    replacePlan(snapshot, annual);
  }
  const monthKey = period.start.slice(0, 7);
  let monthly = plans.find(p => p.planType === "monthly" && p.annualPlanId === annual!.id && p.monthKey === monthKey);
  if (monthly && monthly.planType !== "monthly") throw new Error(copy.stale);
  if (!monthly) {
    const date = new Date(`${period.start}T12:00:00Z`);
    const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12)).toISOString().slice(0, 10);
    const monthStart = [`${monthKey}-01`, annual.periodStart].sort().at(-1)!;
    monthly = { ...base, id: crypto.randomUUID(), planType: "monthly", title: `${monthKey} · ${copy.monthlyTitle}`, annualPlanId: annual.id, monthKey, periodStart: monthStart, periodEnd: [monthEnd, annual.periodEnd].sort()[0], civilDate: monthStart, weeklySectionIds: [] };
    replacePlan(snapshot, monthly);
    const ids = [...annual.monthlySectionIds, monthly.id].sort((a,b) => String(snapshot.plans.find(p => p.id === a)?.periodStart).localeCompare(String(snapshot.plans.find(p => p.id === b)?.periodStart)));
    annual = revisedPlan(annual, { monthlySectionIds: ids }, at);
    replacePlan(snapshot, annual);
  }
  if (period.start < monthly.periodStart || period.end > monthly.periodEnd) throw new Error(copy.stale);
  const weekly: TeacherOwnedWeeklyPlan = { ...base, id: crypto.randomUUID(), planType: "weekly", title: `${period.start} · ${copy.weeklyTitle}`, annualPlanId: annual.id, monthlyPlanId: monthly.id, weekKey: period.start, periodStart: period.start, periodEnd: period.end, civilDate: period.start, weeklyEvaluations: [], nextPlanDecisionRequired: true };
  replacePlan(snapshot, weekly);
  const ids = [...monthly.weeklySectionIds, weekly.id].sort((a,b) => String(snapshot.plans.find(p => p.id === a)?.periodStart).localeCompare(String(snapshot.plans.find(p => p.id === b)?.periodStart)));
  replacePlan(snapshot, revisedPlan(monthly, { weeklySectionIds: ids }, at));
  return weekly;
}

/** Observation decision, missing plan parents, weekly revision and source link share one commit. */
export async function executeObservationSupport(store: LocalDataStore, input: { action: ObservationAction; optionId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const snapshot = await snapshotOf(tx);
    const originalPlans = new Map(snapshot.plans.map(plan => [plan.id, plan]));
    const originalSettings = new Set(snapshot.settings.map(record => record.id));
    const observation = observationFor(snapshot, input.action.scope, now);
    const current = actionCenterModel(snapshot, { studentId: input.action.scope.studentId, observationId: observation.id, now }).observations[0];
    if (!current) throw new Error(copy.stale);
    if (current.planId) return { planId: current.planId, alreadyCompleted: true };
    if (current.needsCategory || observation.updatedAt !== input.action.scope.expectedUpdatedAt || canonicalJson(current.period) !== canonicalJson(input.action.period) || current.studentName !== input.action.studentName) throw new Error(copy.stale);
    const choice = copy.supportOptions.find(o => o.id === input.optionId);
    if (!choice || !current.period) throw new Error(copy.stale);
    const text = supportText(current, choice.id);
    const scope = checkScope(snapshot, current.scope);
    const decision = append(snapshot, scope, current.scope.studentId, { kind: "learning-decision", observationIds: [observation.id], support: choice.id, teacherDecision: text, targetWeekStart: current.period.start, targetWeekEnd: current.period.end, reviewOn: current.period.end }, now);
    const weekly = ensureWeek(snapshot, scope, current.period, now);
    const steps = weekly.teacherContent.followupSupportSteps;
    if (steps !== undefined && !Array.isArray(steps)) throw new Error(copy.stale);
    const updated = revisedPlan(weekly, { teacherContent: { ...weekly.teacherContent, followupSupportSteps: [...(Array.isArray(steps) ? steps : []), { decisionId: decision.id, studentId: current.scope.studentId, text }] } }, timestamp(snapshot, now));
    replacePlan(snapshot, updated);
    append(snapshot, scope, current.scope.studentId, { kind: "learning-plan-link", sourceId: decision.id, planId: updated.id, planRevision: updated.revisionNumber, appliedText: text }, now);
    assertTeacherFollowupRelationships(snapshot);
    // Reuse the canonical graph validator against the staged state before writing.
    const stagedStore: LocalDataStore = { readSnapshot: async () => structuredClone(snapshot), close() {}, transaction: async (_mode, _collections, task) => task({ getAll: async name => structuredClone(snapshot[name]) as never, putMany: async () => { throw new Error(copy.error); }, clear: async () => { throw new Error(copy.error); } }) };
    await loadTeacherOwnedPlanGraph(stagedStore, { annualPlanId: weekly.annualPlanId });
    await tx.putMany("plans", snapshot.plans.filter(plan => originalPlans.get(plan.id) !== plan));
    await tx.putMany("settings", snapshot.settings.filter(record => !originalSettings.has(record.id)));
    return { planId: updated.id, alreadyCompleted: false };
  });
  notifyFollowupChanged();
  return result;
}

export async function createPreparedChecklist(store: LocalDataStore, input: ActiveClassroomScope & { candidates: PreparationCandidate[]; now?: Date }) {
  const now = input.now ?? new Date();
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const snapshot = await snapshotOf(tx), scope = checkScope(snapshot, input);
    const model = actionCenterModel(snapshot, { now });
    if (!model.period || !input.candidates.length) throw new Error(copy.stale);
    const sources = input.candidates.map(c => c.source);
    const prior = teacherFollowups(snapshot).find(r => recordBelongsToClassroomScope(r, scope) && r.workflow.kind === "preparation-list" && canonicalJson(r.workflow.sources) === canonicalJson(sources));
    if (prior) return { alreadyCompleted: true };
    const candidates = input.candidates.map(c => model.candidates.find(current => canonicalJson(current) === canonicalJson(c)));
    if (candidates.some(c => !c)) throw new Error(copy.stale);
    const items = combinePreparationItems(candidates as PreparationCandidate[], civilDateInIstanbul(now));
    const record = append(snapshot, scope, null, { kind: "preparation-list", weekStart: civilDateInIstanbul(now), weekEnd: model.period.end, sources, items }, now);
    assertTeacherFollowupRelationships(snapshot);
    await tx.putMany("settings", [record]);
    return { alreadyCompleted: false };
  });
  notifyFollowupChanged();
  return result;
}
export async function completePreparedItem(store: LocalDataStore, input: ActiveClassroomScope & { sourceId: string; itemId: string; now?: Date }) {
  const result = await store.transaction("readwrite", COLLECTION_NAMES, async tx => {
    const snapshot = await snapshotOf(tx), scope = checkScope(snapshot, input);
    const records = teacherFollowups(snapshot).filter(r => recordBelongsToClassroomScope(r, scope));
    const source = records.find(r => r.id === input.sourceId);
    if (source?.workflow.kind !== "preparation-list" || !source.workflow.items.some(i => i.id === input.itemId)) throw new Error(copy.stale);
    if (source.workflow.sources.some(s => !snapshot[s.collection].some(r => r.id === s.id && alive(r) && r.updatedAt === s.updatedAt))) throw new Error(copy.stale);
    const latest = records.filter(r => r.workflow.kind === "preparation-check" && r.workflow.sourceId === source.id && r.workflow.itemId === input.itemId).at(-1);
    if (latest?.workflow.kind === "preparation-check" && latest.workflow.completed) return { alreadyCompleted: true };
    const record = append(snapshot, scope, null, { kind: "preparation-check", sourceId: source.id, itemId: input.itemId, completed: true }, input.now ?? new Date());
    assertTeacherFollowupRelationships(snapshot);
    await tx.putMany("settings", [record]);
    return { alreadyCompleted: false };
  });
  notifyFollowupChanged();
  return result;
}
