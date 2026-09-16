import { isCivilDate } from "../../core/domain/attendance.ts";
import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../core/domain/classroom.ts";
import {
  availableClassroomScopes,
  classroomScopesEqual,
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import {
  resolveEvidenceWorkspace,
  type EvidenceObservationSummary,
} from "../evidence/evidence-workspace.ts";
import { DEVELOPMENT_COPY, DEVELOPMENT_PERIOD_OPTIONS } from "./development-copy.ts";

export type DevelopmentPeriodKind = (typeof DEVELOPMENT_PERIOD_OPTIONS)[number]["value"];

export interface DevelopmentPeriod {
  kind: DevelopmentPeriodKind;
  label: string;
  startDate: string;
  endDate: string;
}

export interface DevelopmentObservationView extends EvidenceObservationSummary {
  domainLabels: string[];
}

export interface StudentDevelopmentOverview {
  studentId: string;
  studentName: string;
  observationCount: number;
  lastObservationDate: string | null;
  observations: DevelopmentObservationView[];
  domainCounts: Array<{ domain: string; count: number }>;
}

export interface DevelopmentOverview {
  scope: ActiveClassroomScope | null;
  periodKind: DevelopmentPeriodKind;
  period: DevelopmentPeriod | null;
  students: StudentDevelopmentOverview[];
  observedStudentCount: number;
  observationCount: number;
}

function utcDate(civilDate: string): Date {
  return new Date(`${civilDate}T12:00:00.000Z`);
}

export function formatDevelopmentDate(civilDate: string): string {
  return isCivilDate(civilDate)
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      }).format(utcDate(civilDate))
    : "";
}

function effectiveYearStart(year: StoredRecord): string | null {
  if (!isCivilDate(year.startDate) || !isCivilDate(year.endDate) || year.startDate > year.endDate) return null;
  if (year.operationalStartDate !== undefined && !isCivilDate(year.operationalStartDate)) return null;
  if (isCivilDate(year.operationalStartDate) && year.operationalStartDate > year.endDate) return null;
  return isCivilDate(year.operationalStartDate) ? year.operationalStartDate : year.startDate;
}

function resolvePeriod(year: StoredRecord, kind: DevelopmentPeriodKind, civilDate: string): DevelopmentPeriod | null {
  const start = effectiveYearStart(year);
  if (!start || !isCivilDate(year.endDate)) return null;
  let periodStart = start;
  if (kind === "month") periodStart = `${civilDate.slice(0, 7)}-01`;
  if (kind === "week") {
    const monday = utcDate(civilDate);
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    periodStart = monday.toISOString().slice(0, 10);
  }
  const startDate = periodStart > start ? periodStart : start;
  const endDate = civilDate < year.endDate ? civilDate : year.endDate;
  return startDate <= endDate ? {
    kind,
    label: DEVELOPMENT_PERIOD_OPTIONS.find((option) => option.value === kind)!.label,
    startDate,
    endDate,
  } : null;
}

/** Explicit membership history is authoritative; malformed history never falls back to root scope. */
export function membershipContains(student: StoredRecord, scope: ActiveClassroomScope, day: string, year: StoredRecord): boolean {
  return resolveStudentMembershipOn(student, { ...scope, civilDate: day, academicYear: year }).eligible;
}

function activeStudent(student: StoredRecord, scope: ActiveClassroomScope, day: string, year: StoredRecord): boolean {
  return typeof student.deletedAt !== "string" &&
    recordBelongsToClassroomScope(student, scope) &&
    student.active !== false &&
    (student.enrollmentStatus === undefined || student.enrollmentStatus === "active") &&
    membershipContains(student, scope, day, year);
}

function observationDomains(observation: EvidenceObservationSummary): string[] {
  const domains = [...new Set(observation.confirmedCurriculumTargets
    .filter((target) => target.framework === observation.curriculumProfile.framework)
    .map((target) => typeof target.domain === "string" ? target.domain.trim() : "")
    .filter(Boolean))];
  return domains.length > 0 ? domains : [DEVELOPMENT_COPY.unspecifiedDomain];
}

/** Pure, local read model: no writes, inferred attainment, or planned-target coverage. */
export function resolveDevelopmentOverview(
  snapshot: DataSnapshot,
  options: { civilDate: string; period: DevelopmentPeriodKind; scope?: ActiveClassroomScope },
): DevelopmentOverview {
  if (!isCivilDate(options.civilDate)) throw new Error(DEVELOPMENT_COPY.invalidDate);
  if (!DEVELOPMENT_PERIOD_OPTIONS.some((option) => option.value === options.period)) throw new Error(DEVELOPMENT_COPY.invalidPeriod);
  const requestedScope = options.scope ?? resolveActiveClassroomScope(snapshot);
  const scope = requestedScope && availableClassroomScopes(snapshot).some((candidate) => classroomScopesEqual(candidate, requestedScope))
    ? requestedScope
    : null;
  const empty: DevelopmentOverview = {
    scope, periodKind: options.period, period: null, students: [], observedStudentCount: 0, observationCount: 0,
  };
  if (!scope) return empty;
  const year = snapshot.academicYears.find((record) => record.id === scope.academicYearId);
  if (!year) return empty;
  const period = resolvePeriod(year, options.period, options.civilDate);
  if (!period) return empty;
  const roster = snapshot.students.filter((student) => activeStudent(student, scope, period.endDate, year));
  // Scope selection is local to this projection and never mutates the saved setting.
  const scopedSnapshot: DataSnapshot = {
    ...snapshot,
    settings: [...snapshot.settings.filter((record) => record.id !== ACTIVE_CLASSROOM_SETTING_ID), {
      id: ACTIVE_CLASSROOM_SETTING_ID,
      settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
      ...scope,
      createdAt: `${options.civilDate}T12:00:00.000Z`,
      updatedAt: `${options.civilDate}T12:00:00.000Z`,
      civilDate: options.civilDate,
      schemaVersion: 1,
    }],
  };
  const workspace = resolveEvidenceWorkspace(scopedSnapshot, utcDate(options.civilDate));
  const observations = [...workspace.linkedObservations, ...workspace.pendingObservations]
    .filter((observation) => isCivilDate(observation.civilDate) &&
      observation.civilDate >= period.startDate && observation.civilDate <= period.endDate)
    .sort((left, right) => right.civilDate.localeCompare(left.civilDate) ||
      right.observedAt.localeCompare(left.observedAt) || left.id.localeCompare(right.id));
  const students = roster.map((student): StudentDevelopmentOverview => {
    const childObservations = observations
      .filter((observation) => observation.studentId === student.id && membershipContains(student, scope, observation.civilDate, year))
      .map((observation) => ({ ...observation, domainLabels: observationDomains(observation) }));
    const domainCounts = new Map<string, number>();
    for (const observation of childObservations) {
      for (const domain of observation.domainLabels) domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }
    return {
      studentId: student.id,
      studentName: typeof student.displayName === "string" && student.displayName.trim()
        ? student.displayName.trim() : DEVELOPMENT_COPY.studentFallback,
      observationCount: childObservations.length,
      lastObservationDate: childObservations[0]?.civilDate ?? null,
      observations: childObservations,
      domainCounts: [...domainCounts].map(([domain, count]) => ({ domain, count })),
    };
  }).sort((left, right) => left.studentName.localeCompare(right.studentName, "tr-TR") || left.studentId.localeCompare(right.studentId));
  return {
    scope, periodKind: options.period, period, students,
    observedStudentCount: students.filter((student) => student.observationCount > 0).length,
    observationCount: students.reduce((total, student) => total + student.observationCount, 0),
  };
}
