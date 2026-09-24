import { isCivilDate } from "./attendance.ts";
import type { StoredRecord } from "./model.ts";

export const STUDENT_ENROLLMENT_VERSION = 1 as const;
export type StudentEnrollmentStatus = "active" | "left" | "completed" | "transferred";
export interface StudentEnrollment {
  id: string; academicYearId: string; classroomId: string; startedOn: string;
  endedOn?: string; status: StudentEnrollmentStatus;
  schemaVersion: typeof STUDENT_ENROLLMENT_VERSION;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isStudentEnrollment(value: unknown): value is StudentEnrollment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && UUID.test(record.id) &&
    typeof record.academicYearId === "string" && UUID.test(record.academicYearId) &&
    typeof record.classroomId === "string" && UUID.test(record.classroomId) &&
    isCivilDate(record.startedOn) &&
    (record.endedOn === undefined || (isCivilDate(record.endedOn) && record.endedOn >= record.startedOn)) &&
    ["active", "left", "completed", "transferred"].includes(String(record.status)) &&
    record.schemaVersion === STUDENT_ENROLLMENT_VERSION;
}
export function studentEnrollments(record: StoredRecord): StudentEnrollment[] {
  return Array.isArray(record.enrollments) ? record.enrollments.filter(isStudentEnrollment).map(item => ({ ...item })) : [];
}
export function latestStudentEnrollment(enrollments: readonly StudentEnrollment[], scope: { academicYearId: string; classroomId?: string }): StudentEnrollment | undefined {
  return enrollments.filter(item => item.academicYearId === scope.academicYearId &&
    (scope.classroomId === undefined || item.classroomId === scope.classroomId)).sort((a, b) =>
    Number(b.status === "active") - Number(a.status === "active") || b.startedOn.localeCompare(a.startedOn) || b.id.localeCompare(a.id))[0];
}

export type StudentMembershipReason = "enrolled" | "legacy-enrolled" | "before-enrollment" | "after-departure" |
  "between-enrollments" | "outside-scope" | "invalid-membership" | "outside-academic-year" | "deleted-student";
export interface StudentMembershipIssue { code: "invalid-episode" | "duplicate-episode" | "conflicting-episode" | "overlapping-episodes" | "missing-boundary"; sourceIndex: number; enrollmentId?: string; }
export interface StudentMembershipResolution {
  eligible: boolean; reason: StudentMembershipReason; basis: "episodes" | "legacy";
  enrollmentIds: string[]; issues: StudentMembershipIssue[];
}
export interface StudentMembershipScope {
  academicYearId: string; classroomId: string; civilDate: string;
  academicYear: Pick<StoredRecord, "id"> & { startDate?: unknown; endDate?: unknown; operationalStartDate?: unknown };
}
function yearBounds(year: StudentMembershipScope["academicYear"]): { start: string; end: string } | null {
  if (!isCivilDate(year.startDate) || !isCivilDate(year.endDate) || year.startDate > year.endDate ||
    (year.operationalStartDate !== undefined && (!isCivilDate(year.operationalStartDate) || year.operationalStartDate > year.endDate))) return null;
  return { start: isCivilDate(year.operationalStartDate) ? year.operationalStartDate : year.startDate, end: year.endDate };
}
function effectiveEpisodeStart(entry: StudentEnrollment, year: StudentMembershipScope["academicYear"], start: string): string {
  return entry.status === "active" && entry.startedOn === year.startDate && start < entry.startedOn ? start : entry.startedOn;
}

/** A dated decision. Explicit history is authoritative; it never falls back to the current roster. */
export function resolveStudentMembershipOn(student: StoredRecord, input: StudentMembershipScope): StudentMembershipResolution {
  const basis = student.enrollments === undefined ? "legacy" : "episodes";
  const result = (eligible: boolean, reason: StudentMembershipReason, enrollmentIds: string[] = [], issues: StudentMembershipIssue[] = []): StudentMembershipResolution => ({ eligible, reason, basis, enrollmentIds, issues });
  const bounds = yearBounds(input.academicYear);
  if (!bounds || input.academicYear.id !== input.academicYearId || !isCivilDate(input.civilDate)) return result(false, "invalid-membership");
  if (input.civilDate < bounds.start || input.civilDate > bounds.end) return result(false, "outside-academic-year");
  if (typeof student.deletedAt === "string") return result(false, "deleted-student");
  if (basis === "episodes") {
    if (!Array.isArray(student.enrollments)) return result(false, "invalid-membership", [], [{ code: "invalid-episode", sourceIndex: -1 }]);
    const issues: StudentMembershipIssue[] = [];
    const seen = new Map<string, StudentEnrollment>();
    const conflictingIds = new Set<string>();
    const entries: StudentEnrollment[] = [];
    student.enrollments.forEach((value, sourceIndex) => {
      if (!isStudentEnrollment(value) || (value.status !== "active" && !value.endedOn)) {
        issues.push({ code: "invalid-episode", sourceIndex, ...(typeof value?.id === "string" ? { enrollmentId: value.id } : {}) });
      } else if (seen.has(value.id)) {
        issues.push({ code: "duplicate-episode", sourceIndex, enrollmentId: value.id });
        const previous = seen.get(value.id)!;
        if (previous.academicYearId !== value.academicYearId || previous.classroomId !== value.classroomId || previous.startedOn !== value.startedOn || previous.endedOn !== value.endedOn || previous.status !== value.status) {
          conflictingIds.add(value.id);
          issues.push({ code: "conflicting-episode", sourceIndex, enrollmentId: value.id });
        }
      } else { seen.set(value.id, value); entries.push(value); }
    });
    const scoped = entries.filter(entry => !conflictingIds.has(entry.id) && entry.academicYearId === input.academicYearId && entry.classroomId === input.classroomId);
    const matching = scoped.filter(entry => effectiveEpisodeStart(entry, input.academicYear, bounds.start) <= input.civilDate &&
      (entry.endedOn === undefined || input.civilDate <= entry.endedOn));
    if (matching.length > 1) issues.push({ code: "overlapping-episodes", sourceIndex: -1 });
    if (matching.length) return result(true, "enrolled", matching.map(entry => entry.id).sort(), issues);
    if (!scoped.length) return result(false, issues.length ? "invalid-membership" : "outside-scope", [], issues);
    if (scoped.every(entry => effectiveEpisodeStart(entry, input.academicYear, bounds.start) > input.civilDate)) return result(false, "before-enrollment", [], issues);
    if (scoped.every(entry => entry.endedOn !== undefined && entry.endedOn < input.civilDate)) return result(false, "after-departure", [], issues);
    return result(false, "between-enrollments", [], issues);
  }
  if (student.academicYearId !== input.academicYearId || student.classroomId !== input.classroomId) return result(false, "outside-scope");
  const start = isCivilDate(student.enrollmentDate) ? student.enrollmentDate : isCivilDate(student.civilDate) ? student.civilDate : null;
  if (!start) return result(false, "invalid-membership", [], [{ code: "missing-boundary", sourceIndex: -1 }]);
  if (start > input.civilDate) return result(false, "before-enrollment");
  if (student.active === false || (student.enrollmentStatus !== undefined && student.enrollmentStatus !== "active")) return result(false, "after-departure");
  return result(true, "legacy-enrolled");
}

export function studentMembershipOverlaps(student: StoredRecord, input: Omit<StudentMembershipScope, "civilDate"> & { periodStart: string; periodEnd: string }): boolean {
  if (!isCivilDate(input.periodStart) || !isCivilDate(input.periodEnd) || input.periodStart > input.periodEnd) return false;
  const bounds = yearBounds(input.academicYear);
  if (!bounds) return false;
  const first = input.periodStart > bounds.start ? input.periodStart : bounds.start;
  const last = input.periodEnd < bounds.end ? input.periodEnd : bounds.end;
  if (first > last) return false;
  // Eligibility can only start at the interval edge or a membership boundary.
  // Checking those dates avoids walking a whole year for every report source.
  const candidates = new Set([first, last]);
  for (const entry of studentEnrollments(student)) {
    const start = effectiveEpisodeStart(entry, input.academicYear, bounds.start);
    if (start >= first && start <= last) candidates.add(start);
  }
  const legacyStart = isCivilDate(student.enrollmentDate) ? student.enrollmentDate : student.civilDate;
  if (isCivilDate(legacyStart) && legacyStart >= first && legacyStart <= last) candidates.add(legacyStart);
  return [...candidates].some(civilDate => resolveStudentMembershipOn(student, { ...input, civilDate }).eligible);
}
