import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { isCivilDate } from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { resolveSchoolDay, type SchoolDayReason } from "../../core/domain/school-calendar.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";

export const PLANNING_CALENDAR_FIELDS = Object.freeze([
  { id: "activities", label: "Etkinlikler" },
  { id: "observation-focus", label: "Gözlem odağı" },
  { id: "materials", label: "Materyaller" },
  { id: "calendar-entries", label: "Okul takvimi kayıtları" },
] as const);

export type PlanningCalendarFieldId = (typeof PLANNING_CALENDAR_FIELDS)[number]["id"];
export type PlanningCalendarItemKind = "daily-plan" | "activity" | "calendar-entry";
export type PlanningCalendarDayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface PlanningCalendarItem {
  readonly id: string;
  readonly kind: PlanningCalendarItemKind;
  readonly title: string;
  readonly planId: string | null;
  readonly activityId: string | null;
  readonly sourceUpdatedAt: string;
  readonly observationFocus: readonly string[];
  readonly materials: readonly string[];
  readonly studentIds: readonly string[];
}

export interface PlanningCalendarDay {
  readonly civilDate: string;
  readonly label: string;
  readonly dayOfWeek: PlanningCalendarDayOfWeek;
  readonly dayOfMonth: number;
  readonly inMonth: boolean;
  readonly inSelectedPeriod: boolean;
  readonly isTeachingDay: boolean;
  readonly schoolDayReason: SchoolDayReason;
  readonly isEmpty: boolean;
  readonly items: readonly PlanningCalendarItem[];
}

export interface PlanningCalendarContext {
  readonly scope: ActiveClassroomScope;
  readonly schoolName: string;
  readonly classroomName: string;
  readonly academicYearName: string;
  readonly teacherName: string;
}

export interface WeeklyDeskPlanModel extends PlanningCalendarContext {
  readonly kind: "weekly-desk";
  readonly civilDate: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly fields: readonly PlanningCalendarFieldId[];
  readonly studentIds: readonly string[];
  readonly days: readonly PlanningCalendarDay[];
  readonly sourceFingerprint: string;
}

export interface MonthlyWallCalendarModel extends PlanningCalendarContext {
  readonly kind: "monthly-wall";
  readonly monthKey: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly fields: readonly PlanningCalendarFieldId[];
  readonly studentIds: readonly string[];
  /** Monday-first complete calendar rows; includes adjacent-month cells. */
  readonly days: readonly PlanningCalendarDay[];
  readonly sourceFingerprint: string;
}

export interface WeeklyDeskPlanReadInput {
  readonly civilDate: string;
  readonly studentIds?: readonly string[];
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly fields?: readonly PlanningCalendarFieldId[];
}

export interface MonthlyWallCalendarReadInput {
  readonly monthKey: string;
  readonly studentIds?: readonly string[];
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly fields?: readonly PlanningCalendarFieldId[];
}

const MONTH_KEY_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/u;
const DAY_MS = 86_400_000;
const DAY_LABELS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const;

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanTextArray(value: unknown): string[] {
  if (typeof value === "string") {
    const clean = value.trim();
    return clean ? [clean] : [];
  }
  if (!Array.isArray(value)) return [];
  return [...new Set(value.flatMap((entry) => {
    const clean = cleanText(entry);
    return clean ? [clean] : [];
  }))];
}

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0))];
}

function utcDate(civilDate: string): Date {
  return new Date(`${civilDate}T12:00:00.000Z`);
}

function civilDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  return civilDate(new Date(utcDate(value).getTime() + days * DAY_MS));
}

function dayOfWeek(value: string): PlanningCalendarDayOfWeek {
  const native = utcDate(value).getUTCDay();
  return (native === 0 ? 7 : native) as PlanningCalendarDayOfWeek;
}

function mondayOfWeek(value: string): string {
  return addDays(value, 1 - dayOfWeek(value));
}

function monthBounds(monthKey: string): { start: string; end: string } {
  if (!MONTH_KEY_PATTERN.test(monthKey)) throw new Error("Ay anahtarı YYYY-AA biçiminde olmalıdır.");
  const [year, month] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const end = civilDate(new Date(Date.UTC(year!, month!, 0, 12)));
  return { start, end };
}

function dateRange(start: string, end: string): string[] {
  const result: string[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) result.push(cursor);
  return result;
}

function validateFields(fields: readonly PlanningCalendarFieldId[] | undefined): PlanningCalendarFieldId[] {
  const allowed = new Set<PlanningCalendarFieldId>(PLANNING_CALENDAR_FIELDS.map((field) => field.id));
  const selected = fields ? [...fields] : [...allowed];
  if (selected.length === 0 || selected.some((field) => !allowed.has(field))) {
    throw new Error("En az bir geçerli plan görünümü alanı seçilmelidir.");
  }
  if (new Set(selected).size !== selected.length) throw new Error("Plan görünümü alanı birden çok seçilemez.");
  return selected;
}

function validatePeriod(
  requestedStart: string | undefined,
  requestedEnd: string | undefined,
  bounds: { start: string; end: string },
): { start: string; end: string } {
  const start = requestedStart ?? bounds.start;
  const end = requestedEnd ?? bounds.end;
  if (!isCivilDate(start) || !isCivilDate(end) || start > end || start < bounds.start || end > bounds.end) {
    throw new Error("Belge dönemi seçilen hafta veya ay sınırlarında olmalıdır.");
  }
  return { start, end };
}

function activeContext(snapshot: DataSnapshot): {
  scope: ActiveClassroomScope;
  academicYear: StoredRecord;
  classroom: StoredRecord;
  context: PlanningCalendarContext;
} {
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) throw new Error("Plan görünümü için etkin sınıf ve eğitim yılı gereklidir.");
  const academicYear = snapshot.academicYears.find((record) => record.id === scope.academicYearId && typeof record.deletedAt !== "string");
  const classroom = snapshot.classrooms.find((record) => record.id === scope.classroomId && typeof record.deletedAt !== "string");
  if (!academicYear || !classroom || !isCivilDate(academicYear.startDate) || !isCivilDate(academicYear.endDate)) {
    throw new Error("Etkin sınıfın eğitim yılı tarihleri doğrulanamadı.");
  }
  return {
    scope,
    academicYear,
    classroom,
    context: {
      scope,
      schoolName: cleanText(classroom.schoolName) ?? "Okul bilgisi girilmedi",
      classroomName: cleanText(classroom.name) ?? cleanText(classroom.displayName) ?? "Sınıf",
      academicYearName: cleanText(academicYear.name) ?? `${String(academicYear.startDate).slice(0, 4)}–${String(academicYear.endDate).slice(0, 4)}`,
      teacherName: cleanText(classroom.teacherName) ?? cleanText(classroom.teacherDisplayName) ?? "Öğretmen bilgisi girilmedi",
    },
  };
}

function selectedStudentIds(snapshot: DataSnapshot, scope: ActiveClassroomScope, requested: readonly string[] | undefined): string[] {
  if (!requested) return [];
  if (requested.length === 0 || new Set(requested).size !== requested.length) {
    throw new Error("En az bir benzersiz öğrenci seçilmelidir.");
  }
  const allowed = new Set(snapshot.students.filter((record) =>
    recordBelongsToClassroomScope(record, scope) && typeof record.deletedAt !== "string"
  ).map((record) => record.id));
  if (requested.some((id) => !allowed.has(id))) throw new Error("Plan görünümünde yalnız etkin sınıf öğrencileri seçilebilir.");
  return [...requested];
}

function itemMatchesStudents(itemIds: readonly string[], selectedIds: readonly string[]): boolean {
  return selectedIds.length === 0 || itemIds.length === 0 || itemIds.some((id) => selectedIds.includes(id));
}

function recordFocus(record: StoredRecord | undefined): string[] {
  if (!record) return [];
  const direct = cleanTextArray(record.observationFocus);
  const content = record.teacherContent && typeof record.teacherContent === "object" && !Array.isArray(record.teacherContent)
    ? record.teacherContent as Record<string, unknown>
    : null;
  const premium = record.premiumWeekSnapshot && typeof record.premiumWeekSnapshot === "object" && !Array.isArray(record.premiumWeekSnapshot)
    ? record.premiumWeekSnapshot as Record<string, unknown>
    : null;
  return [...new Set([
    ...direct,
    ...cleanTextArray(content?.observationFocus),
    ...cleanTextArray(content?.observations),
    ...cleanTextArray(premium?.observationFocus),
  ])];
}

function recordMaterials(record: StoredRecord): string[] {
  const snapshot = record.appliedActivityTemplateSnapshot && typeof record.appliedActivityTemplateSnapshot === "object" && !Array.isArray(record.appliedActivityTemplateSnapshot)
    ? record.appliedActivityTemplateSnapshot as Record<string, unknown>
    : record.sourceActivityTemplateSnapshot && typeof record.sourceActivityTemplateSnapshot === "object" && !Array.isArray(record.sourceActivityTemplateSnapshot)
      ? record.sourceActivityTemplateSnapshot as Record<string, unknown>
      : null;
  return [...new Set([...cleanTextArray(record.materials), ...cleanTextArray(snapshot?.materials)])];
}

function calendarEntryDates(record: StoredRecord, bounds: { start: string; end: string }): string[] {
  if (!isCivilDate(record.startDate) || !isCivilDate(record.endDate) || record.startDate > record.endDate) return [];
  const start = String(record.startDate) < bounds.start ? bounds.start : String(record.startDate);
  const end = String(record.endDate) > bounds.end ? bounds.end : String(record.endDate);
  return start <= end ? dateRange(start, end) : [];
}

function itemsByDate(
  snapshot: DataSnapshot,
  scope: ActiveClassroomScope,
  bounds: { start: string; end: string },
  fields: readonly PlanningCalendarFieldId[],
  students: readonly string[],
): Map<string, PlanningCalendarItem[]> {
  const byDate = new Map<string, PlanningCalendarItem[]>();
  const plans = snapshot.plans.filter((record) =>
    recordBelongsToClassroomScope(record, scope) && record.planType === "daily" &&
    typeof record.deletedAt !== "string" && isCivilDate(record.civilDate) &&
    record.civilDate >= bounds.start && record.civilDate <= bounds.end
  );
  const plansById = new Map(plans.map((record) => [record.id, record]));
  const weeklyById = new Map(snapshot.plans.filter((record) =>
    recordBelongsToClassroomScope(record, scope) && record.planType === "weekly" && typeof record.deletedAt !== "string"
  ).map((record) => [record.id, record]));
  const activitiesByPlan = new Map<string, StoredRecord[]>();
  const includePlanItems = fields.some((field) => field !== "calendar-entries");
  for (const activity of snapshot.activities) {
    if (!recordBelongsToClassroomScope(activity, scope) || typeof activity.deletedAt === "string" || typeof activity.planId !== "string") continue;
    const plan = plansById.get(activity.planId);
    if (!plan || activity.civilDate !== plan.civilDate) continue;
    const current = activitiesByPlan.get(plan.id) ?? [];
    current.push(activity);
    activitiesByPlan.set(plan.id, current);
  }
  for (const plan of plans) {
    const date = String(plan.civilDate);
    const planStudents = cleanIds(plan.studentIds);
    if (!itemMatchesStudents(planStudents, students)) continue;
    const activities = (activitiesByPlan.get(plan.id) ?? []).sort((left, right) =>
      String(left.startTime ?? "").localeCompare(String(right.startTime ?? "")) || left.id.localeCompare(right.id)
    );
    const weekly = typeof plan.sourceWeeklyPlanId === "string" ? weeklyById.get(plan.sourceWeeklyPlanId) : undefined;
    const focus = fields.includes("observation-focus") ? recordFocus(weekly) : [];
    const target = byDate.get(date) ?? [];
    if (includePlanItems && activities.length > 0) {
      for (const activity of activities) {
        const activityStudents = cleanIds(activity.studentIds).length ? cleanIds(activity.studentIds) : planStudents;
        if (!itemMatchesStudents(activityStudents, students)) continue;
        target.push({
          id: activity.id,
          kind: "activity",
          title: cleanText(activity.title) ?? cleanText(plan.title) ?? "Başlığı eksik etkinlik",
          planId: plan.id,
          activityId: activity.id,
          sourceUpdatedAt: activity.updatedAt > plan.updatedAt ? activity.updatedAt : plan.updatedAt,
          observationFocus: focus,
          materials: fields.includes("materials") ? recordMaterials(activity) : [],
          studentIds: activityStudents,
        });
      }
    } else if (includePlanItems) {
      target.push({
        id: plan.id,
        kind: "daily-plan",
        title: cleanText(plan.title) ?? "Başlığı eksik günlük plan",
        planId: plan.id,
        activityId: null,
        sourceUpdatedAt: plan.updatedAt,
        observationFocus: focus,
        materials: [],
        studentIds: planStudents,
      });
    }
    if (target.length) byDate.set(date, target);
  }
  if (fields.includes("calendar-entries")) {
    const calendar = snapshot.calendarEntries.filter((record) =>
      recordBelongsToClassroomScope(record, scope) && typeof record.deletedAt !== "string" && record.status !== "cancelled"
    ).sort((left, right) => String(left.startDate).localeCompare(String(right.startDate)) || left.id.localeCompare(right.id));
    for (const entry of calendar) {
      const entryStudents = cleanIds(entry.studentIds);
      if (!itemMatchesStudents(entryStudents, students)) continue;
      for (const date of calendarEntryDates(entry, bounds)) {
        const target = byDate.get(date) ?? [];
        target.push({
          id: entry.id,
          kind: "calendar-entry",
          title: cleanText(entry.title) ?? "Başlığı eksik okul takvimi kaydı",
          planId: null,
          activityId: null,
          sourceUpdatedAt: entry.updatedAt,
          observationFocus: [],
          materials: [],
          studentIds: entryStudents,
        });
        byDate.set(date, target);
      }
    }
  }
  return byDate;
}

function buildDays(
  dates: readonly string[],
  visibleMonth: string,
  selectedPeriod: { start: string; end: string },
  snapshot: DataSnapshot,
  scope: ActiveClassroomScope,
  academicYear: StoredRecord,
  items: ReadonlyMap<string, readonly PlanningCalendarItem[]>,
): PlanningCalendarDay[] {
  return dates.map((date) => {
    const weekday = dayOfWeek(date);
    const inSelectedPeriod = date >= selectedPeriod.start && date <= selectedPeriod.end;
    const dayItems = inSelectedPeriod ? [...(items.get(date) ?? [])] : [];
    const schoolDay = resolveSchoolDay({ academicYear, civilDate: date, classroomId: scope.classroomId, calendarEntries: snapshot.calendarEntries });
    return {
      civilDate: date,
      label: DAY_LABELS[weekday - 1],
      dayOfWeek: weekday,
      dayOfMonth: Number(date.slice(8, 10)),
      inMonth: date.startsWith(`${visibleMonth}-`),
      inSelectedPeriod,
      isTeachingDay: schoolDay.isTeachingDay,
      schoolDayReason: schoolDay.reason,
      isEmpty: dayItems.length === 0,
      items: dayItems,
    };
  });
}

function sourceFingerprint(
  snapshot: DataSnapshot,
  scope: ActiveClassroomScope,
  bounds: { start: string; end: string },
  fields: readonly PlanningCalendarFieldId[],
  students: readonly string[],
): string {
  const records = [...snapshot.plans, ...snapshot.activities, ...snapshot.calendarEntries]
    .filter((record) => recordBelongsToClassroomScope(record, scope))
    .filter((record) => {
      const start = isCivilDate(record.startDate) ? String(record.startDate) : isCivilDate(record.civilDate) ? record.civilDate : null;
      const end = isCivilDate(record.endDate) ? String(record.endDate) : start;
      return start !== null && end !== null && start <= bounds.end && end >= bounds.start;
    })
    .map((record) => ({ id: record.id, updatedAt: record.updatedAt, deletedAt: record.deletedAt ?? null }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return canonicalJson({ scope, bounds, fields: [...fields], students: [...students], records });
}

export function buildWeeklyDeskPlanModel(snapshot: DataSnapshot, input: WeeklyDeskPlanReadInput): WeeklyDeskPlanModel {
  if (!isCivilDate(input.civilDate)) throw new Error("Hafta günü YYYY-AA-GG biçiminde olmalıdır.");
  const { scope, academicYear, context } = activeContext(snapshot);
  const weekStart = mondayOfWeek(input.civilDate);
  const weekEnd = addDays(weekStart, 4);
  const period = validatePeriod(input.periodStart, input.periodEnd, { start: weekStart, end: weekEnd });
  const fields = validateFields(input.fields);
  const students = selectedStudentIds(snapshot, scope, input.studentIds);
  const items = itemsByDate(snapshot, scope, { start: weekStart, end: weekEnd }, fields, students);
  return {
    ...context,
    kind: "weekly-desk",
    civilDate: input.civilDate,
    periodStart: period.start,
    periodEnd: period.end,
    fields,
    studentIds: students,
    days: buildDays(dateRange(weekStart, weekEnd), weekStart.slice(0, 7), period, snapshot, scope, academicYear, items),
    sourceFingerprint: sourceFingerprint(snapshot, scope, { start: weekStart, end: weekEnd }, fields, students),
  };
}

export function buildMonthlyWallCalendarModel(snapshot: DataSnapshot, input: MonthlyWallCalendarReadInput): MonthlyWallCalendarModel {
  const bounds = monthBounds(input.monthKey);
  const { scope, academicYear, context } = activeContext(snapshot);
  const period = validatePeriod(input.periodStart, input.periodEnd, bounds);
  const fields = validateFields(input.fields);
  const students = selectedStudentIds(snapshot, scope, input.studentIds);
  const gridStart = mondayOfWeek(bounds.start);
  const gridEnd = addDays(mondayOfWeek(bounds.end), 6);
  const items = itemsByDate(snapshot, scope, { start: gridStart, end: gridEnd }, fields, students);
  return {
    ...context,
    kind: "monthly-wall",
    monthKey: input.monthKey,
    periodStart: period.start,
    periodEnd: period.end,
    fields,
    studentIds: students,
    days: buildDays(dateRange(gridStart, gridEnd), input.monthKey, period, snapshot, scope, academicYear, items),
    sourceFingerprint: sourceFingerprint(snapshot, scope, { start: gridStart, end: gridEnd }, fields, students),
  };
}

export async function loadWeeklyDeskPlanModel(store: LocalDataStore, input: WeeklyDeskPlanReadInput): Promise<WeeklyDeskPlanModel> {
  return buildWeeklyDeskPlanModel(await store.readSnapshot(), input);
}

export async function loadMonthlyWallCalendarModel(store: LocalDataStore, input: MonthlyWallCalendarReadInput): Promise<MonthlyWallCalendarModel> {
  return buildMonthlyWallCalendarModel(await store.readSnapshot(), input);
}
