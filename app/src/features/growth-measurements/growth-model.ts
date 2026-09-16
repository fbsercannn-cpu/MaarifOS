import { isCivilDate } from "../../core/domain/attendance.ts";
import {
  assertGrowthMeasurementSnapshotRelations,
  growthMeasurementRecordsFromSnapshot,
  growthPeriodsForAcademicYear,
  growthSelectionHead,
  selectedGrowthMeasurement,
  type GrowthMeasurementMetric,
  type GrowthMeasurementRecord,
  type GrowthMeasurementSource,
  type GrowthMeasurementValueRecord,
  type GrowthPeriodDefinition,
} from "../../core/domain/growth-measurements.ts";
import {
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import { ageInMonthsOn } from "../../core/domain/student.ts";

export type GrowthMembershipStatus = "included" | "out-of-scope" | "review";
export type GrowthPeriodStatus =
  | "planned"
  | "waiting"
  | "partial"
  | "complete"
  | "recovery"
  | "out-of-scope"
  | "review";

export interface GrowthMetricState {
  readonly metric: GrowthMeasurementMetric;
  readonly selected: GrowthMeasurementValueRecord | null;
  readonly selectionEventId: string | null;
  readonly history: readonly GrowthMeasurementValueRecord[];
  readonly pendingCandidateCount: number;
}

export interface GrowthStudentPeriodState {
  readonly student: StoredRecord;
  readonly period: GrowthPeriodDefinition;
  readonly membership: GrowthMembershipStatus;
  readonly membershipReason: string;
  readonly status: GrowthPeriodStatus;
  readonly height: GrowthMetricState;
  readonly weight: GrowthMetricState;
}

export interface GrowthNumericSummary {
  readonly n: number;
  readonly mean: number | null;
  readonly median: number | null;
  readonly minimum: number | null;
  readonly maximum: number | null;
}

export interface GrowthPeriodStatistics {
  readonly period: GrowthPeriodDefinition;
  readonly expectedN: number;
  readonly height: GrowthNumericSummary;
  readonly weight: GrowthNumericSummary;
  readonly heightSources: Readonly<Record<GrowthMeasurementSource, number>>;
  readonly weightSources: Readonly<Record<GrowthMeasurementSource, number>>;
  readonly completeN: number;
  readonly reviewN: number;
  readonly outOfScopeN: number;
  readonly completionRate: number | null;
}

export interface GrowthMatchedChange {
  readonly from: GrowthPeriodDefinition;
  readonly to: GrowthPeriodDefinition;
  readonly metric: GrowthMeasurementMetric;
  readonly matchedN: number;
  readonly meanChange: number | null;
  readonly changes: readonly Readonly<{
    studentId: string;
    difference: number;
    days: number;
  }>[];
}

export interface GrowthWorkspaceModel {
  readonly scope: ActiveClassroomScope;
  readonly academicYear: StoredRecord;
  readonly classroom: StoredRecord;
  readonly periods: readonly GrowthPeriodDefinition[];
  readonly students: readonly StoredRecord[];
  readonly records: readonly GrowthMeasurementRecord[];
  readonly states: readonly GrowthStudentPeriodState[];
  readonly statistics: readonly GrowthPeriodStatistics[];
  readonly today: string;
}

function civilDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function studentTouchesScope(
  student: StoredRecord,
  scope: ActiveClassroomScope,
  measuredStudentIds: ReadonlySet<string>,
): boolean {
  if (measuredStudentIds.has(student.id) ||
    (student.academicYearId === scope.academicYearId &&
      student.classroomId === scope.classroomId)) {
    return true;
  }
  if (!Array.isArray(student.enrollments)) return false;
  return student.enrollments.some((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return false;
    }
    const enrollment = candidate as Record<string, unknown>;
    return enrollment.academicYearId === scope.academicYearId &&
      enrollment.classroomId === scope.classroomId;
  });
}

export function growthMembershipForPeriod(
  student: StoredRecord,
  scope: ActiveClassroomScope,
  academicYear: StoredRecord,
  period: GrowthPeriodDefinition,
): { status: GrowthMembershipStatus; reason: string } {
  let eligible = false;
  let review = false;
  let lastReason = "outside-scope";
  for (const civilDate of civilDates(period.windowStart, period.windowEnd)) {
    const resolution = resolveStudentMembershipOn(student, {
      ...scope,
      academicYear,
      civilDate,
    });
    eligible ||= resolution.eligible;
    review ||= resolution.reason === "invalid-membership" ||
      resolution.issues.length > 0;
    lastReason = resolution.reason;
  }
  if (review) return { status: "review", reason: "Üyelik geçmişi incelenmeli" };
  return eligible
    ? { status: "included", reason: "Ölçüm dönemi üyeliği var" }
    : { status: "out-of-scope", reason: lastReason };
}

function metricState(
  records: readonly GrowthMeasurementRecord[],
  input: {
    studentId: string;
    academicYearId: string;
    classroomId: string;
    periodKey: string;
    metric: GrowthMeasurementMetric;
  },
): GrowthMetricState {
  const history = records
    .filter((record): record is GrowthMeasurementValueRecord =>
      record.eventKind !== "selection" &&
      record.studentId === input.studentId &&
      record.academicYearId === input.academicYearId &&
      record.classroomId === input.classroomId &&
      record.periodKey === input.periodKey &&
      record.metric === input.metric)
    .sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id));
  const scopedSelections = records.filter((record) =>
    record.eventKind === "selection" &&
    record.studentId === input.studentId &&
    record.academicYearId === input.academicYearId &&
    record.classroomId === input.classroomId &&
    record.periodKey === input.periodKey &&
    record.metric === input.metric);
  const selectedIds = new Set(scopedSelections.flatMap((record) =>
    record.eventKind === "selection" ? [record.selectedMeasurementId] : []));
  const head = growthSelectionHead(records, input);
  return {
    metric: input.metric,
    selected: selectedGrowthMeasurement(records, input),
    selectionEventId: head?.id ?? null,
    history,
    pendingCandidateCount: history.filter((record) => !selectedIds.has(record.id)).length,
  };
}

function periodStatus(
  membership: GrowthMembershipStatus,
  period: GrowthPeriodDefinition,
  today: string,
  height: GrowthMetricState,
  weight: GrowthMetricState,
): GrowthPeriodStatus {
  if (membership === "review") return "review";
  if (membership === "out-of-scope") return "out-of-scope";
  if (height.pendingCandidateCount > 0 || weight.pendingCandidateCount > 0) {
    return "review";
  }
  const count = Number(Boolean(height.selected)) + Number(Boolean(weight.selected));
  if (count > 0 && [height.selected, weight.selected].some((record) =>
    record && record.measuredOn > period.windowEnd)) {
    return "recovery";
  }
  if (count === 2) return "complete";
  if (count === 1) return "partial";
  return today < period.windowStart ? "planned" : "waiting";
}

export function summarizeGrowthValues(
  values: readonly number[],
): GrowthNumericSummary {
  if (!values.length) {
    return { n: 0, mean: null, median: null, minimum: null, maximum: null };
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return {
    n: sorted.length,
    mean: sorted.reduce((total, value) => total + value, 0) / sorted.length,
    median,
    minimum: sorted[0]!,
    maximum: sorted.at(-1)!,
  };
}

export function growthPeriodStatistics(
  period: GrowthPeriodDefinition,
  states: readonly GrowthStudentPeriodState[],
): GrowthPeriodStatistics {
  const scoped = states.filter((state) => state.period.key === period.key);
  const included = scoped.filter((state) => state.membership === "included");
  const heights = included.flatMap((state) =>
    state.height.selected ? [state.height.selected.integerValue] : []);
  const weights = included.flatMap((state) =>
    state.weight.selected ? [state.weight.selected.integerValue] : []);
  const sourceCounts = (metric: GrowthMeasurementMetric) => {
    const counts: Record<GrowthMeasurementSource, number> = {
      school: 0,
      family: 0,
      document: 0,
    };
    for (const state of included) {
      const selected = state[metric].selected;
      if (selected) counts[selected.source] += 1;
    }
    return counts;
  };
  const completeN = included.filter((state) =>
    state.height.selected && state.weight.selected).length;
  return {
    period,
    expectedN: included.length,
    height: summarizeGrowthValues(heights),
    weight: summarizeGrowthValues(weights),
    heightSources: sourceCounts("height"),
    weightSources: sourceCounts("weight"),
    completeN,
    reviewN: scoped.filter((state) => state.membership === "review" ||
      state.status === "review").length,
    outOfScopeN: scoped.filter((state) =>
      state.membership === "out-of-scope").length,
    completionRate: included.length ? completeN / included.length : null,
  };
}

export function buildGrowthWorkspace(
  snapshot: DataSnapshot,
  today: string,
  requestedScope?: ActiveClassroomScope,
): GrowthWorkspaceModel {
  if (!isCivilDate(today)) throw new Error("Boy-kilo çalışma günü geçersiz.");
  assertGrowthMeasurementSnapshotRelations(snapshot);
  const scope = requestedScope ?? resolveActiveClassroomScope(snapshot);
  if (!scope) throw new Error("Boy-kilo takibi için aktif sınıf ve eğitim yılı seçin.");
  const academicYear = snapshot.academicYears.find((record) =>
    record.id === scope.academicYearId && typeof record.deletedAt !== "string");
  const classroom = snapshot.classrooms.find((record) =>
    record.id === scope.classroomId && typeof record.deletedAt !== "string");
  if (!academicYear || !classroom || classroom.academicYearId !== academicYear.id) {
    throw new Error("Boy-kilo sınıfı veya eğitim yılı bulunamadı.");
  }
  const periods = growthPeriodsForAcademicYear(academicYear);
  const records = growthMeasurementRecordsFromSnapshot(snapshot).filter((record) =>
    record.academicYearId === scope.academicYearId &&
    record.classroomId === scope.classroomId);
  const measuredStudentIds = new Set(records.map((record) => record.studentId));
  const students = snapshot.students
    .filter((student) => studentTouchesScope(student, scope, measuredStudentIds))
    .sort((left, right) =>
      String(left.displayName ?? "").localeCompare(
        String(right.displayName ?? ""),
        "tr-TR",
        { sensitivity: "base", numeric: true },
      ) || left.id.localeCompare(right.id));
  const states = students.flatMap((student) => periods.map((period) => {
    const membership = growthMembershipForPeriod(
      student,
      scope,
      academicYear,
      period,
    );
    const height = metricState(records, { ...scope, studentId: student.id, periodKey: period.key, metric: "height" });
    const weight = metricState(records, { ...scope, studentId: student.id, periodKey: period.key, metric: "weight" });
    return {
      student,
      period,
      membership: membership.status,
      membershipReason: membership.reason,
      height,
      weight,
      status: periodStatus(membership.status, period, today, height, weight),
    } satisfies GrowthStudentPeriodState;
  }));
  return {
    scope,
    academicYear,
    classroom,
    periods,
    students,
    records,
    states,
    statistics: periods.map((period) => growthPeriodStatistics(period, states)),
    today,
  };
}

export function matchedGrowthChange(
  workspace: Pick<GrowthWorkspaceModel, "periods" | "states">,
  fromKey: string,
  toKey: string,
  metric: GrowthMeasurementMetric,
): GrowthMatchedChange {
  const from = workspace.periods.find((period) => period.key === fromKey);
  const to = workspace.periods.find((period) => period.key === toKey);
  if (!from || !to || from.key >= to.key) {
    throw new Error("Değişim için önceki ve sonraki iki geçerli dönem seçin.");
  }
  const fromStates = new Map(workspace.states
    .filter((state) => state.period.key === from.key && state.membership === "included")
    .map((state) => [state.student.id, state]));
  const changes = workspace.states
    .filter((state) => state.period.key === to.key && state.membership === "included")
    .flatMap((state) => {
      const previous = fromStates.get(state.student.id);
      const first = previous?.[metric].selected;
      const last = state[metric].selected;
      if (!first || !last) return [];
      return [{
        studentId: state.student.id,
        difference: last.integerValue - first.integerValue,
        days: growthDaysBetween(first.measuredOn, last.measuredOn),
      }];
    });
  return {
    from,
    to,
    metric,
    matchedN: changes.length,
    meanChange: changes.length
      ? changes.reduce((total, change) => total + change.difference, 0) /
        changes.length
      : null,
    changes,
  };
}

export function growthDaysBetween(from: string, to: string): number {
  if (!isCivilDate(from) || !isCivilDate(to) || from > to) {
    throw new Error("Ölçüm tarihleri sıralı iki gerçek gün olmalıdır.");
  }
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) -
      Date.parse(`${from}T00:00:00.000Z`)) /
      86_400_000,
  );
}

export function growthAgeMonths(
  student: StoredRecord,
  measuredOn: string,
): number | null {
  return typeof student.birthDate === "string" && isCivilDate(student.birthDate)
    ? ageInMonthsOn(student.birthDate, measuredOn)
    : null;
}

export interface GrowthChartPoint {
  readonly periodKey: string;
  readonly periodLabel: string;
  readonly measuredOn: string | null;
  readonly integerValue: number | null;
  readonly source: GrowthMeasurementValueRecord["source"] | null;
}

export function growthChartPoints(
  workspace: Pick<GrowthWorkspaceModel, "periods" | "states">,
  studentId: string,
  metric: GrowthMeasurementMetric,
): GrowthChartPoint[] {
  return workspace.periods.map((period) => {
    const state = workspace.states.find((candidate) =>
      candidate.student.id === studentId && candidate.period.key === period.key);
    const selected = state?.[metric].selected ?? null;
    return {
      periodKey: period.key,
      periodLabel: period.label,
      measuredOn: selected?.measuredOn ?? null,
      integerValue: selected?.integerValue ?? null,
      source: selected?.source ?? null,
    };
  });
}

/** Missing periods split the line; they are never plotted as zero. */
export function growthChartSegments(
  points: readonly GrowthChartPoint[],
): GrowthChartPoint[][] {
  const segments: GrowthChartPoint[][] = [];
  for (const point of points) {
    if (point.integerValue === null || point.measuredOn === null) {
      if (segments.at(-1)?.length === 0) segments.pop();
      segments.push([]);
      continue;
    }
    if (!segments.length) segments.push([]);
    segments.at(-1)!.push(point);
  }
  return segments.filter((segment) => segment.length > 0);
}
