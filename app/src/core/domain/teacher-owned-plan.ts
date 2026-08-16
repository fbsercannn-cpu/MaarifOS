import { isCivilDate } from "./attendance.ts";
import type { StoredRecord } from "./model.ts";
import {
  isTeacherMonthlyEvaluation,
  type TeacherMonthlyEvaluation,
} from "./teacher-owned-monthly-evaluation.ts";

export const TEACHER_OWNED_PLAN_SCHEMA_VERSION = 1 as const;
export const TEACHER_AUTHORED_PLAN_ORIGIN = "teacher-authored" as const;

export type TeacherOwnedPlanType = "annual" | "monthly" | "weekly";

export type TeacherPlanJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly TeacherPlanJsonValue[]
  | { readonly [key: string]: TeacherPlanJsonValue };

/**
 * Öğretmenin kendi mesleki metnidir. Servis içeriği yorumlamaz, üretmez veya
 * sağlayıcı verisiyle zenginleştirmez; yalnız JSON-güvenli biçimde saklar.
 */
export type TeacherPlanContent = Readonly<Record<string, TeacherPlanJsonValue>>;

export interface TeacherOwnedPlanRevisionSnapshot {
  readonly revisionNumber: number;
  readonly title: string;
  readonly teacherContent: TeacherPlanContent;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly updatedAt: string;
  readonly capturedAt: string;
}

export interface TeacherOwnedPlanBase extends StoredRecord {
  planType: TeacherOwnedPlanType;
  planOrigin: typeof TEACHER_AUTHORED_PLAN_ORIGIN;
  title: string;
  status: "active";
  academicYearId: string;
  classroomId: string;
  periodStart: string;
  periodEnd: string;
  teacherContent: TeacherPlanContent;
  revisionNumber: number;
  revisionHistory: readonly TeacherOwnedPlanRevisionSnapshot[];
  deletedAt: null;
  schemaVersion: typeof TEACHER_OWNED_PLAN_SCHEMA_VERSION;
}

export interface TeacherOwnedAnnualPlan extends TeacherOwnedPlanBase {
  planType: "annual";
  monthlySectionIds: readonly string[];
}

export interface TeacherOwnedMonthlyPlan extends TeacherOwnedPlanBase {
  planType: "monthly";
  annualPlanId: string;
  monthKey: string;
  weeklySectionIds: readonly string[];
  monthlyEvaluations?: readonly TeacherMonthlyEvaluation[];
  previousMonthEvaluationId?: string;
  nextMonthDecisionContext?: TeacherMonthlyCarryContext;
  teacherReviewRequired?: boolean;
}

export interface TeacherOwnedWeeklyPlan extends TeacherOwnedPlanBase {
  planType: "weekly";
  annualPlanId: string;
  monthlyPlanId: string;
  weekKey: string;
  weeklyEvaluations?: readonly TeacherWeeklyEvaluation[];
  nextPlanDecisionRequired?: boolean;
  previousWeekEvaluationId?: string;
  nextPlanDecisionContext?: TeacherWeeklyCarryContext;
  teacherReviewRequired?: boolean;
}

export type TeacherNextPlanDecision =
  | "keep"
  | "adapt"
  | "replace"
  | "observe-more";

export interface TeacherWeeklyEvaluation {
  readonly id: string;
  readonly reflection: string;
  readonly evidenceSummary: string;
  readonly observationIds: readonly string[];
  /** Yeni kayıtlarda zorunludur; alanı olmayan eski kayıtlar salt-okunur yüklenir. */
  readonly curriculumLinkIds?: readonly string[];
  readonly nextPlanDecision: TeacherNextPlanDecision;
  readonly nextPlanTargetPlanId: string | null;
  readonly sourcePlanRevisionNumber: number;
  readonly targetPlanRevisionNumberAtSuggestion: number | null;
  readonly teacherAuthored: true;
  readonly createdAt: string;
}

export interface TeacherWeeklyCarryContext {
  readonly sourceWeeklyPlanId: string;
  readonly evaluationId: string;
  readonly decision: TeacherNextPlanDecision;
  readonly evidenceSummary: string;
  readonly teacherReflection: string;
  readonly sourcePlanRevisionNumber: number;
  readonly targetPlanRevisionNumberAtSuggestion: number;
  readonly createdAt: string;
  readonly applicationStatus:
    | "pending-teacher-review"
    | "accepted"
    | "rejected";
  /**
   * Eski kayıtlar için opsiyoneldir. Yeni yazımlar bütün öğretmen kararlarını
   * append-only tutar; son olay mevcut applicationStatus ile uyuşmalıdır.
   */
  readonly reviewHistory?: readonly TeacherWeeklyCarryReviewEvent[];
}

export type TeacherWeeklyCarryReviewAction =
  | "accepted"
  | "rejected"
  | "reopened";

export interface TeacherWeeklyCarryReviewEvent {
  readonly id: string;
  readonly action: TeacherWeeklyCarryReviewAction;
  readonly teacherNote: string;
  readonly createdAt: string;
  readonly targetPlanRevisionNumberBefore: number;
  readonly targetPlanRevisionNumberAfter: number;
}

export interface TeacherMonthlyCarryContext {
  readonly sourceMonthlyPlanId: string;
  readonly evaluationId: string;
  readonly recommendation: string;
  readonly sourcePlanRevisionNumber: number;
  readonly targetPlanRevisionNumberAtSuggestion: number;
  readonly createdAt: string;
  readonly applicationStatus:
    | "pending-teacher-review"
    | "accepted"
    | "rejected";
  readonly reviewHistory: readonly TeacherWeeklyCarryReviewEvent[];
}

export type TeacherOwnedPlanRecord =
  | TeacherOwnedAnnualPlan
  | TeacherOwnedMonthlyPlan
  | TeacherOwnedWeeklyPlan;

export interface TeacherOwnedWeeklyPlanDraft {
  title: string;
  weekKey: string;
  periodStart: string;
  periodEnd: string;
  teacherContent: TeacherPlanContent;
}

export interface TeacherOwnedMonthlyPlanDraft {
  title: string;
  monthKey: string;
  periodStart: string;
  periodEnd: string;
  teacherContent: TeacherPlanContent;
  weeks: readonly TeacherOwnedWeeklyPlanDraft[];
}

export interface CreateTeacherOwnedPlanGraphInput {
  title: string;
  periodStart: string;
  periodEnd: string;
  teacherContent: TeacherPlanContent;
  months: readonly TeacherOwnedMonthlyPlanDraft[];
  now?: Date;
}

export interface TeacherOwnedPlanGraph {
  annual: TeacherOwnedAnnualPlan;
  months: readonly {
    monthly: TeacherOwnedMonthlyPlan;
    weeks: readonly TeacherOwnedWeeklyPlan[];
  }[];
}

export type TeacherOwnedPlanErrorCode =
  | "active-scope-required"
  | "invalid-input"
  | "duplicate-or-overlap"
  | "graph-integrity"
  | "plan-not-found"
  | "concurrent-update";

export class TeacherOwnedPlanError extends Error {
  readonly code: TeacherOwnedPlanErrorCode;

  constructor(code: TeacherOwnedPlanErrorCode, message: string) {
    super(message);
    this.name = "TeacherOwnedPlanError";
    this.code = code;
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONTH_KEY_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const PROVIDER_ONLY_FIELDS = [
  "contentPackId",
  "contentPackVersion",
  "contentPackSnapshot",
  "premiumAnnualPlan",
  "premiumMonthlyPlan",
  "premiumWeekSnapshot",
  "premiumWeeks",
  "premiumActivityTemplates",
  "premiumFullDayFlow",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isRequiredText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isJsonValue(value: unknown, seen: Set<object>): value is TeacherPlanJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every((entry) => isJsonValue(entry, seen))
    : Object.getPrototypeOf(value) === Object.prototype &&
      Object.values(value).every((entry) => isJsonValue(entry, seen));
  seen.delete(value);
  return valid;
}

export function isTeacherPlanContent(value: unknown): value is TeacherPlanContent {
  return isObject(value) && isJsonValue(value, new Set<object>());
}

function isRevisionSnapshot(value: unknown): value is TeacherOwnedPlanRevisionSnapshot {
  if (!isObject(value)) return false;
  return (
    Number.isInteger(value.revisionNumber) &&
    Number(value.revisionNumber) >= 1 &&
    isRequiredText(value.title) &&
    isTeacherPlanContent(value.teacherContent) &&
    isCivilDate(value.periodStart) &&
    isCivilDate(value.periodEnd) &&
    value.periodStart <= value.periodEnd &&
    isUtcIso(value.updatedAt) &&
    isUtcIso(value.capturedAt)
  );
}

const TEACHER_NEXT_PLAN_DECISIONS = [
  "keep",
  "adapt",
  "replace",
  "observe-more",
] as const;

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

export function isTeacherWeeklyEvaluation(
  value: unknown,
): value is TeacherWeeklyEvaluation {
  if (!isObject(value)) return false;
  const baseKeys = [
      "id",
      "reflection",
      "evidenceSummary",
      "observationIds",
      "nextPlanDecision",
      "nextPlanTargetPlanId",
      "sourcePlanRevisionNumber",
      "targetPlanRevisionNumberAtSuggestion",
      "teacherAuthored",
      "createdAt",
    ];
  const hasValidKeys =
    hasExactKeys(value, baseKeys) ||
    hasExactKeys(value, [...baseKeys, "curriculumLinkIds"]);
  return (
    hasValidKeys &&
    UUID_PATTERN.test(typeof value.id === "string" ? value.id : "") &&
    isRequiredText(value.reflection) &&
    isRequiredText(value.evidenceSummary) &&
    Array.isArray(value.observationIds) &&
    value.observationIds.length > 0 &&
    value.observationIds.every(
      (id) => typeof id === "string" && UUID_PATTERN.test(id),
    ) &&
    new Set(value.observationIds).size === value.observationIds.length &&
    (value.curriculumLinkIds === undefined ||
      (Array.isArray(value.curriculumLinkIds) &&
        value.curriculumLinkIds.length > 0 &&
        value.curriculumLinkIds.every(
          (id) => typeof id === "string" && UUID_PATTERN.test(id),
        ) &&
        new Set(value.curriculumLinkIds).size === value.curriculumLinkIds.length)) &&
    typeof value.nextPlanDecision === "string" &&
    TEACHER_NEXT_PLAN_DECISIONS.includes(
      value.nextPlanDecision as TeacherNextPlanDecision,
    ) &&
    (value.nextPlanTargetPlanId === null ||
      (typeof value.nextPlanTargetPlanId === "string" &&
        UUID_PATTERN.test(value.nextPlanTargetPlanId))) &&
    Number.isInteger(value.sourcePlanRevisionNumber) &&
    Number(value.sourcePlanRevisionNumber) >= 1 &&
    (value.targetPlanRevisionNumberAtSuggestion === null ||
      (Number.isInteger(value.targetPlanRevisionNumberAtSuggestion) &&
        Number(value.targetPlanRevisionNumberAtSuggestion) >= 1)) &&
    value.teacherAuthored === true &&
    isUtcIso(value.createdAt)
  );
}

export function isTeacherWeeklyCarryContext(
  value: unknown,
): value is TeacherWeeklyCarryContext {
  if (!isObject(value)) return false;
  const baseKeys = [
      "sourceWeeklyPlanId",
      "evaluationId",
      "decision",
      "evidenceSummary",
      "teacherReflection",
      "sourcePlanRevisionNumber",
      "targetPlanRevisionNumberAtSuggestion",
      "createdAt",
      "applicationStatus",
    ];
  const hasLegacyKeys = hasExactKeys(value, baseKeys);
  const hasReviewKeys = hasExactKeys(value, [...baseKeys, "reviewHistory"]);
  if (!hasLegacyKeys && !hasReviewKeys) return false;
  const history = hasReviewKeys && Array.isArray(value.reviewHistory)
    ? value.reviewHistory
    : [];
  if (
    history.some((entry, index) => {
      if (!isObject(entry)) return true;
      const previous = index > 0 ? history[index - 1] : undefined;
      return !(
        hasExactKeys(entry, [
          "id",
          "action",
          "teacherNote",
          "createdAt",
          "targetPlanRevisionNumberBefore",
          "targetPlanRevisionNumberAfter",
        ]) &&
        UUID_PATTERN.test(typeof entry.id === "string" ? entry.id : "") &&
        (entry.action === "accepted" ||
          entry.action === "rejected" ||
          entry.action === "reopened") &&
        isRequiredText(entry.teacherNote) &&
        isUtcIso(entry.createdAt) &&
        Number.isInteger(entry.targetPlanRevisionNumberBefore) &&
        Number(entry.targetPlanRevisionNumberBefore) >= 1 &&
        entry.targetPlanRevisionNumberAfter ===
          Number(entry.targetPlanRevisionNumberBefore) + 1 &&
        (!previous ||
          (isObject(previous) &&
            previous.targetPlanRevisionNumberAfter ===
              entry.targetPlanRevisionNumberBefore &&
            typeof previous.createdAt === "string" &&
            previous.createdAt < entry.createdAt))
      );
    }) ||
    new Set(
      history.flatMap((entry) =>
        isObject(entry) && typeof entry.id === "string" ? [entry.id] : [],
      ),
    ).size !== history.length
  ) {
    return false;
  }
  const latest = history.at(-1);
  const expectedStatus =
    !latest || (isObject(latest) && latest.action === "reopened")
      ? "pending-teacher-review"
      : isObject(latest) && latest.action === "accepted"
        ? "accepted"
        : "rejected";
  return (
    UUID_PATTERN.test(
      typeof value.sourceWeeklyPlanId === "string"
        ? value.sourceWeeklyPlanId
        : "",
    ) &&
    UUID_PATTERN.test(
      typeof value.evaluationId === "string" ? value.evaluationId : "",
    ) &&
    typeof value.decision === "string" &&
    TEACHER_NEXT_PLAN_DECISIONS.includes(
      value.decision as TeacherNextPlanDecision,
    ) &&
    isRequiredText(value.evidenceSummary) &&
    isRequiredText(value.teacherReflection) &&
    Number.isInteger(value.sourcePlanRevisionNumber) &&
    Number(value.sourcePlanRevisionNumber) >= 1 &&
    Number.isInteger(value.targetPlanRevisionNumberAtSuggestion) &&
    Number(value.targetPlanRevisionNumberAtSuggestion) >= 1 &&
    isUtcIso(value.createdAt) &&
    value.applicationStatus === expectedStatus &&
    (hasReviewKeys || value.applicationStatus === "pending-teacher-review")
  );
}

export function isTeacherMonthlyCarryContext(
  value: unknown,
): value is TeacherMonthlyCarryContext {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "sourceMonthlyPlanId",
      "evaluationId",
      "recommendation",
      "sourcePlanRevisionNumber",
      "targetPlanRevisionNumberAtSuggestion",
      "createdAt",
      "applicationStatus",
      "reviewHistory",
    ]) ||
    !UUID_PATTERN.test(typeof value.sourceMonthlyPlanId === "string" ? value.sourceMonthlyPlanId : "") ||
    !UUID_PATTERN.test(typeof value.evaluationId === "string" ? value.evaluationId : "") ||
    !isRequiredText(value.recommendation) ||
    !Number.isInteger(value.sourcePlanRevisionNumber) ||
    Number(value.sourcePlanRevisionNumber) < 1 ||
    !Number.isInteger(value.targetPlanRevisionNumberAtSuggestion) ||
    Number(value.targetPlanRevisionNumberAtSuggestion) < 1 ||
    !isUtcIso(value.createdAt) ||
    !["pending-teacher-review", "accepted", "rejected"].includes(
      String(value.applicationStatus),
    ) ||
    !Array.isArray(value.reviewHistory)
  ) return false;
  const history = value.reviewHistory;
  if (
    history.some((entry, index) => {
      if (!isObject(entry)) return true;
      const previous = index > 0 ? history[index - 1] : undefined;
      return !(
        hasExactKeys(entry, [
          "id",
          "action",
          "teacherNote",
          "createdAt",
          "targetPlanRevisionNumberBefore",
          "targetPlanRevisionNumberAfter",
        ]) &&
        UUID_PATTERN.test(typeof entry.id === "string" ? entry.id : "") &&
        ["accepted", "rejected", "reopened"].includes(String(entry.action)) &&
        isRequiredText(entry.teacherNote) &&
        isUtcIso(entry.createdAt) &&
        Number.isInteger(entry.targetPlanRevisionNumberBefore) &&
        Number.isInteger(entry.targetPlanRevisionNumberAfter) &&
        Number(entry.targetPlanRevisionNumberAfter) ===
          Number(entry.targetPlanRevisionNumberBefore) + 1 &&
        Number(entry.targetPlanRevisionNumberBefore) >=
          Number(value.targetPlanRevisionNumberAtSuggestion) &&
        (!previous ||
          (isObject(previous) &&
            typeof previous.createdAt === "string" &&
            previous.createdAt < entry.createdAt &&
            previous.targetPlanRevisionNumberAfter ===
              entry.targetPlanRevisionNumberBefore))
      );
    }) ||
    new Set(
      history.map((entry) => isObject(entry) && typeof entry.id === "string" ? entry.id : ""),
    ).size !== history.length
  ) return false;
  const latest = history.at(-1);
  const expectedStatus = !latest || latest.action === "reopened"
    ? "pending-teacher-review"
    : latest.action;
  return value.applicationStatus === expectedStatus;
}

function hasProviderOnlyField(record: Record<string, unknown>): boolean {
  return PROVIDER_ONLY_FIELDS.some((field) => field in record);
}

export function isTeacherOwnedPlanRecord(
  value: unknown,
): value is TeacherOwnedPlanRecord {
  if (!isObject(value)) return false;
  if (
    !UUID_PATTERN.test(typeof value.id === "string" ? value.id : "") ||
    !UUID_PATTERN.test(
      typeof value.academicYearId === "string" ? value.academicYearId : "",
    ) ||
    !UUID_PATTERN.test(
      typeof value.classroomId === "string" ? value.classroomId : "",
    ) ||
    value.planOrigin !== TEACHER_AUTHORED_PLAN_ORIGIN ||
    (value.planType !== "annual" &&
      value.planType !== "monthly" &&
      value.planType !== "weekly") ||
    !isRequiredText(value.title) ||
    value.status !== "active" ||
    !isCivilDate(value.periodStart) ||
    !isCivilDate(value.periodEnd) ||
    value.periodStart > value.periodEnd ||
    value.civilDate !== value.periodStart ||
    !isUtcIso(value.createdAt) ||
    !isUtcIso(value.updatedAt) ||
    value.deletedAt !== null ||
    value.schemaVersion !== TEACHER_OWNED_PLAN_SCHEMA_VERSION ||
    !isTeacherPlanContent(value.teacherContent) ||
    !Number.isInteger(value.revisionNumber) ||
    Number(value.revisionNumber) < 1 ||
    !Array.isArray(value.revisionHistory) ||
    value.revisionHistory.length !== Number(value.revisionNumber) - 1 ||
    value.revisionHistory.some(
      (entry, index) =>
        !isRevisionSnapshot(entry) || entry.revisionNumber !== index + 1,
    ) ||
    hasProviderOnlyField(value)
  ) {
    return false;
  }

  if (value.planType === "annual") {
    return (
      value.monthlyEvaluations === undefined &&
      value.weeklyEvaluations === undefined &&
      value.nextPlanDecisionRequired === undefined &&
      value.previousWeekEvaluationId === undefined &&
      value.nextPlanDecisionContext === undefined &&
      value.previousMonthEvaluationId === undefined &&
      value.nextMonthDecisionContext === undefined &&
      value.teacherReviewRequired === undefined &&
      Array.isArray(value.monthlySectionIds) &&
      value.monthlySectionIds.every(
        (id) => typeof id === "string" && UUID_PATTERN.test(id),
      ) &&
      new Set(value.monthlySectionIds).size === value.monthlySectionIds.length
    );
  }
  if (
    !UUID_PATTERN.test(
      typeof value.annualPlanId === "string" ? value.annualPlanId : "",
    )
  ) {
    return false;
  }
  if (value.planType === "monthly") {
    return (
      value.weeklyEvaluations === undefined &&
      value.nextPlanDecisionRequired === undefined &&
      value.previousWeekEvaluationId === undefined &&
      value.nextPlanDecisionContext === undefined &&
      (value.previousMonthEvaluationId === undefined ||
        (typeof value.previousMonthEvaluationId === "string" &&
          UUID_PATTERN.test(value.previousMonthEvaluationId))) &&
      (value.nextMonthDecisionContext === undefined ||
        isTeacherMonthlyCarryContext(value.nextMonthDecisionContext)) &&
      (value.nextMonthDecisionContext === undefined
        ? value.teacherReviewRequired === undefined ||
          typeof value.teacherReviewRequired === "boolean"
        : value.teacherReviewRequired ===
          (value.nextMonthDecisionContext.applicationStatus ===
            "pending-teacher-review")) &&
      (value.monthlyEvaluations === undefined ||
        (Array.isArray(value.monthlyEvaluations) &&
          value.monthlyEvaluations.every(isTeacherMonthlyEvaluation) &&
          new Set(value.monthlyEvaluations.map((entry) => entry.id)).size ===
            value.monthlyEvaluations.length)) &&
      typeof value.monthKey === "string" &&
      MONTH_KEY_PATTERN.test(value.monthKey) &&
      value.periodStart.startsWith(`${value.monthKey}-`) &&
      value.periodEnd.startsWith(`${value.monthKey}-`) &&
      Array.isArray(value.weeklySectionIds) &&
      value.weeklySectionIds.every(
        (id) => typeof id === "string" && UUID_PATTERN.test(id),
      ) &&
      new Set(value.weeklySectionIds).size === value.weeklySectionIds.length
    );
  }
  return (
    value.monthlyEvaluations === undefined &&
    value.previousMonthEvaluationId === undefined &&
    value.nextMonthDecisionContext === undefined &&
    UUID_PATTERN.test(
      typeof value.monthlyPlanId === "string" ? value.monthlyPlanId : "",
    ) &&
    isRequiredText(value.weekKey) &&
    (value.weeklyEvaluations === undefined ||
      (Array.isArray(value.weeklyEvaluations) &&
        value.weeklyEvaluations.every(isTeacherWeeklyEvaluation) &&
        new Set(value.weeklyEvaluations.map((entry) => entry.id)).size ===
          value.weeklyEvaluations.length)) &&
    (value.nextPlanDecisionRequired === undefined ||
      typeof value.nextPlanDecisionRequired === "boolean") &&
    (value.previousWeekEvaluationId === undefined ||
      (typeof value.previousWeekEvaluationId === "string" &&
        UUID_PATTERN.test(value.previousWeekEvaluationId))) &&
    (value.nextPlanDecisionContext === undefined ||
      isTeacherWeeklyCarryContext(value.nextPlanDecisionContext)) &&
    (value.nextPlanDecisionContext === undefined
      ? value.teacherReviewRequired === undefined ||
        typeof value.teacherReviewRequired === "boolean"
      : value.teacherReviewRequired ===
        (value.nextPlanDecisionContext.applicationStatus ===
          "pending-teacher-review"))
  );
}

export function cloneTeacherOwnedPlan<T extends TeacherOwnedPlanRecord>(
  record: T,
): T {
  return structuredClone(record);
}
