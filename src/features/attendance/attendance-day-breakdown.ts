import { attendanceRecordKey, isCivilDate, resolveAttendanceRecords, type AttendanceStatus } from "../../core/domain/attendance.ts";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { resolveSchoolDay, schoolCivilDates, type SchoolDayResolution } from "../../core/domain/school-calendar.ts";
import { resolveStudentMembershipOn, type StudentMembershipResolution } from "../../core/domain/student-membership.ts";

export type AttendanceDayClassification = "counted" | "missing" | "excluded";
export interface AttendanceAccountingRow {
  readonly studentId: string; readonly studentName: string; readonly civilDate: string;
  readonly classification: AttendanceDayClassification;
  readonly reason: string;
  readonly status: AttendanceStatus | null;
  readonly canonicalRecordId: string | null;
  readonly sourceRecordIds: readonly string[];
  readonly duplicateRecordIds: readonly string[];
  readonly invalidRecordIds: readonly string[];
  readonly membership: StudentMembershipResolution;
}
export interface AttendanceAccountingDay {
  readonly civilDate: string; readonly calendar: SchoolDayResolution;
  readonly rows: readonly AttendanceAccountingRow[];
}
export interface AttendanceSourceIssue {
  readonly recordId: string;
  readonly studentId?: string;
  readonly civilDate?: string;
  readonly reason: "invalid-record" | "duplicate-record" | "deleted-record" | "unknown-student" | "excluded-day";
  readonly canonicalRecordId?: string;
}
export interface AttendanceDayBreakdown {
  readonly scope: ActiveClassroomScope;
  readonly periodStart: string; readonly periodEnd: string; readonly asOfCivilDate: string;
  readonly students: readonly { id: string; name: string }[];
  readonly days: readonly AttendanceAccountingDay[];
  readonly sourceIssues: readonly AttendanceSourceIssue[];
  readonly totals: {
    readonly expectedStudentDays: number;
    readonly recordedStudentDays: number;
    readonly presentStudentDays: number;
    readonly lateStudentDays: number;
    readonly absentStudentDays: number;
    readonly missingStudentDays: number;
    readonly excludedStudentDays: number;
    readonly attendanceNumerator: number;
    readonly attendanceDenominator: number;
    readonly coverageNumerator: number;
    readonly coverageDenominator: number;
  };
}
export interface AttendanceDayBreakdownInput {
  readonly scope: ActiveClassroomScope;
  readonly studentId?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly asOfCivilDate: string;
}
function studentHasScope(record: StoredRecord, scope: ActiveClassroomScope): boolean {
  return (record.academicYearId === scope.academicYearId && record.classroomId === scope.classroomId) ||
    (Array.isArray(record.enrollments) && record.enrollments.some(value => value && typeof value === "object" &&
      value.academicYearId === scope.academicYearId && value.classroomId === scope.classroomId));
}
function studentName(record: StoredRecord): string {
  return typeof record.displayName === "string" && record.displayName.trim() ? record.displayName : "Adı belirtilmemiş öğrenci";
}

/** Pure read model: a missing attendance mark is never converted into absence. */
export function buildAttendanceDayBreakdown(snapshot: DataSnapshot, input: AttendanceDayBreakdownInput): AttendanceDayBreakdown {
  if (!isCivilDate(input.asOfCivilDate)) throw new Error("Devam dökümü için geçerli gün gereklidir.");
  const dates = schoolCivilDates(input.periodStart, input.periodEnd);
  const academicYear = snapshot.academicYears.find(record => record.id === input.scope.academicYearId);
  const classroom = snapshot.classrooms.find(record => record.id === input.scope.classroomId && record.academicYearId === input.scope.academicYearId);
  if (!academicYear || !classroom) throw new Error("Devam dökümünün sınıf ve eğitim yılı bulunamadı.");
  const students = snapshot.students.filter(record => input.studentId
    ? record.id === input.studentId && studentHasScope(record, input.scope)
    : studentHasScope(record, input.scope)).sort((a, b) => studentName(a).localeCompare(studentName(b), "tr-TR") || a.id.localeCompare(b.id));
  if (input.studentId && !students.length) throw new Error("Öğrenci bu sınıf ve eğitim yılı kapsamında değil.");
  const studentIds = new Set(students.map(student => student.id));
  // Scope is selected before canonicalization: another classroom cannot win a student/day key.
  const scopeRecords = snapshot.attendanceRecords.filter(record => record.academicYearId === input.scope.academicYearId && record.classroomId === input.scope.classroomId &&
    (!input.studentId || record.studentId === input.studentId));
  const scoped = scopeRecords.filter(record => !isCivilDate(record.civilDate) || (record.civilDate >= input.periodStart && record.civilDate <= input.periodEnd));
  const resolved = resolveAttendanceRecords(scoped);
  const sourcesByKey = new Map<string, StoredRecord[]>();
  const invalidIds = new Set(resolved.invalidRecords.map(record => record.id));
  for (const record of scoped) {
    if (typeof record.studentId !== "string" || !isCivilDate(record.civilDate)) continue;
    const key = attendanceRecordKey(record.studentId, record.civilDate);
    const records = sourcesByKey.get(key) ?? []; records.push(record); sourcesByKey.set(key, records);
  }
  const sourceIssues: AttendanceSourceIssue[] = resolved.invalidRecords.map(record => ({ recordId: record.id, reason: "invalid-record",
    ...(typeof record.studentId === "string" ? { studentId: record.studentId } : {}),
    ...(typeof record.civilDate === "string" ? { civilDate: record.civilDate } : {}) }));
  for (const record of resolved.records) {
    const canonical = resolved.latestByKey.get(attendanceRecordKey(record.studentId, record.civilDate));
    const base = { recordId: record.id, studentId: record.studentId, civilDate: record.civilDate };
    if (record.id !== canonical?.id) sourceIssues.push({ ...base, reason: "duplicate-record", canonicalRecordId: canonical?.id });
    if (typeof record.deletedAt === "string") sourceIssues.push({ ...base, reason: "deleted-record" });
    if (!studentIds.has(record.studentId)) sourceIssues.push({ ...base, reason: "unknown-student" });
  }
  const totals = { expectedStudentDays: 0, recordedStudentDays: 0, presentStudentDays: 0, lateStudentDays: 0, absentStudentDays: 0,
    missingStudentDays: 0, excludedStudentDays: 0, attendanceNumerator: 0, attendanceDenominator: 0, coverageNumerator: 0, coverageDenominator: 0 };
  const days = dates.map((civilDate): AttendanceAccountingDay => {
    const calendar = resolveSchoolDay({ academicYear, classroomId: classroom.id, civilDate, calendarEntries: snapshot.calendarEntries });
    const rows = students.map((student): AttendanceAccountingRow => {
      const membership = resolveStudentMembershipOn(student, { ...input.scope, academicYear, civilDate });
      const key = attendanceRecordKey(student.id, civilDate);
      const canonical = resolved.latestByKey.get(key);
      const live = canonical && typeof canonical.deletedAt !== "string" ? canonical : undefined;
      const records = sourcesByKey.get(key) ?? [];
      const reason = civilDate > input.asOfCivilDate ? "future-day" : !calendar.isTeachingDay ? calendar.reason : !membership.eligible ? membership.reason : live ? "attendance-record" : "unmarked-day";
      const classification = reason === "attendance-record" ? "counted" : reason === "unmarked-day" ? "missing" : "excluded";
      if (classification === "excluded") {
        totals.excludedStudentDays++;
        if (live) sourceIssues.push({ recordId: live.id, studentId: student.id, civilDate, reason: "excluded-day" });
      } else {
        totals.expectedStudentDays++;
        if (classification === "missing") totals.missingStudentDays++;
        else {
          totals.recordedStudentDays++;
          if (live!.status === "present") totals.presentStudentDays++;
          if (live!.status === "late") totals.lateStudentDays++;
          if (live!.status === "absent") totals.absentStudentDays++;
        }
      }
      return { studentId: student.id, studentName: studentName(student), civilDate, classification, reason, status: live?.status ?? null,
        canonicalRecordId: canonical?.id ?? null, sourceRecordIds: records.map(record => record.id).sort(),
        duplicateRecordIds: records.filter(record => !invalidIds.has(record.id) && record.id !== canonical?.id).map(record => record.id).sort(),
        invalidRecordIds: records.filter(record => invalidIds.has(record.id)).map(record => record.id).sort(), membership };
    });
    return { civilDate, calendar, rows };
  });
  totals.attendanceNumerator = totals.presentStudentDays + totals.lateStudentDays;
  totals.attendanceDenominator = totals.recordedStudentDays;
  totals.coverageNumerator = totals.recordedStudentDays;
  totals.coverageDenominator = totals.expectedStudentDays;
  return { scope: { ...input.scope }, periodStart: input.periodStart, periodEnd: input.periodEnd, asOfCivilDate: input.asOfCivilDate,
    students: students.map(student => ({ id: student.id, name: studentName(student) })), days,
    sourceIssues: sourceIssues.sort((a, b) => (a.civilDate ?? "").localeCompare(b.civilDate ?? "") || a.recordId.localeCompare(b.recordId) || a.reason.localeCompare(b.reason)), totals };
}

export function attendanceExpectedStudentIdsOnDate(snapshot: DataSnapshot, scope: ActiveClassroomScope, civilDate: string): string[] {
  const result = buildAttendanceDayBreakdown(snapshot, { scope, periodStart: civilDate, periodEnd: civilDate, asOfCivilDate: civilDate });
  return result.days[0].rows.filter(row => row.classification !== "excluded").map(row => row.studentId);
}
