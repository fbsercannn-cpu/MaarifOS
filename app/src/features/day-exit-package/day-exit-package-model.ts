import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import { resolveSchoolDay, schoolCivilDates, type SchoolDayResolution } from "../../core/domain/school-calendar.ts";
import { teacherFollowups, type PreparationSource } from "../../core/domain/teacher-followup.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { buildAttendanceDayBreakdown } from "../attendance/attendance-day-breakdown.ts";
import { getActivityStudioItem } from "../activity-studio/activity-studio-model.ts";
import { pickupSheetModel } from "../teacher-print-kit/print-kit-model.ts";
import { preparationCandidates, type PreparationCandidate } from "../teacher-followup/teacher-followup-service.ts";

export interface DayExitAttendanceRow {
  readonly studentId: string;
  readonly studentName: string;
  readonly status: "present" | "late" | "absent" | null;
  readonly canonicalRecordId: string | null;
  readonly sourceRecordIds: readonly string[];
}

export interface DayExitPickupRow {
  readonly studentId: string;
  readonly studentName: string;
  readonly attendanceStatus: DayExitAttendanceRow["status"];
  readonly state: "complete" | "missing" | "not-required" | "attendance-missing";
  readonly delivery: {
    readonly id: string;
    readonly contactName: string;
    readonly relationship: string;
    readonly handedOverAt: string;
  } | null;
  readonly correctionCount: number;
  readonly authorizedContactCount: number;
}

export interface DayExitPreparationSource {
  readonly id: string;
  readonly collection: "activities" | "plans";
  readonly title: string;
  readonly updatedAt: string;
  readonly materials: readonly string[];
  readonly preparation: readonly string[];
  readonly alreadySaved: boolean;
  readonly available: boolean;
}

export interface DayExitNextDay {
  readonly civilDate: string;
  readonly schoolDay: SchoolDayResolution;
  readonly plans: readonly {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly updatedAt: string;
  }[];
  readonly sources: readonly DayExitPreparationSource[];
  /** Stable across preparation-list writes; only real plan/activity sources participate. */
  readonly sourceFingerprint: string;
}

export interface DayExitPackageModel {
  readonly scope: ActiveClassroomScope;
  readonly civilDate: string;
  readonly today: string;
  readonly schoolName: string;
  readonly classroomName: string;
  readonly teacherName: string;
  readonly academicYearName: string;
  readonly attendance: {
    readonly schoolDay: SchoolDayResolution;
    readonly rows: readonly DayExitAttendanceRow[];
    readonly recordedCount: number;
    readonly missingCount: number;
    readonly presentCount: number;
    readonly lateCount: number;
    readonly absentCount: number;
  };
  readonly pickups: {
    readonly rows: readonly DayExitPickupRow[];
    readonly completedCount: number;
    readonly missingCount: number;
  };
  readonly nextDay: DayExitNextDay | null;
  /** Document fingerprint excludes document-version history records by construction. */
  readonly sourceFingerprint: string;
}

export interface LoadDayExitPackageInput {
  readonly civilDate?: string;
  readonly now?: Date;
}

const clean = (value: string) => value.normalize("NFC").replace(/\s+/gu, " ").trim();
const unique = (values: readonly string[]) => [...new Set(values.map(clean).filter(Boolean))];

function candidateValues(candidate: PreparationCandidate): { text: string; advance: boolean }[] {
  return [
    ...unique(candidate.materials).map((text) => ({ text, advance: false })),
    ...unique(candidate.preparation).map((text) => ({ text, advance: true })),
  ];
}

function candidateCovered(
  candidate: PreparationCandidate,
  snapshot: DataSnapshot,
  targetDate: string,
): boolean {
  const expected = candidateValues(candidate);
  if (!expected.length) return false;
  return expected.every((item) => dayExitPreparationValueCovered(
    snapshot,
    candidate.source,
    targetDate,
    item.text,
    item.advance,
  ));
}

export function dayExitPreparationValueCovered(
  snapshot: DataSnapshot,
  candidateSource: PreparationSource,
  targetDate: string,
  text: string,
  advance: boolean,
): boolean {
  const normalizedText = clean(text).toLocaleLowerCase("tr-TR");
  return teacherFollowups(snapshot).some((record) => {
    if (record.studentId !== null || record.workflow.kind !== "preparation-list"
      || record.workflow.weekStart > targetDate || record.workflow.weekEnd < targetDate) return false;
    const source = record.workflow.sources.find((entry) => entry.id === candidateSource.id
      && entry.collection === candidateSource.collection);
    if (!source || source.updatedAt !== candidateSource.updatedAt) return false;
    return record.workflow.items.some((entry) => entry.advance === advance
      && clean(entry.text).toLocaleLowerCase("tr-TR") === normalizedText
      && entry.sourceIds.includes(candidateSource.id));
  });
}

function nextTeachingDay(snapshot: DataSnapshot, scope: ActiveClassroomScope, civilDate: string): {
  civilDate: string;
  resolution: SchoolDayResolution;
} | null {
  const academicYear = snapshot.academicYears.find((record) => record.id === scope.academicYearId);
  if (!academicYear || !isCivilDate(academicYear.endDate) || civilDate >= academicYear.endDate) return null;
  const candidate = schoolCivilDates(civilDate, academicYear.endDate).slice(1).find((date) =>
    resolveSchoolDay({ academicYear, classroomId: scope.classroomId, calendarEntries: snapshot.calendarEntries, civilDate: date }).isTeachingDay);
  if (!candidate) return null;
  return {
    civilDate: candidate,
    resolution: resolveSchoolDay({ academicYear, classroomId: scope.classroomId, calendarEntries: snapshot.calendarEntries, civilDate: candidate }),
  };
}

export function resolveDayExitPackageModel(snapshot: DataSnapshot, input: LoadDayExitPackageInput = {}): DayExitPackageModel {
  const now = input.now ? new Date(input.now) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Çıkış paketi için geçerli zaman gerekli.");
  const today = civilDateInIstanbul(now);
  const civilDate = input.civilDate ?? today;
  if (!isCivilDate(civilDate) || civilDate > today) throw new Error("Çıkış paketi günü bugün veya daha eski geçerli bir tarih olmalıdır.");
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) throw new Error("Çıkış paketi için etkin sınıfı seçin.");
  const academicYear = snapshot.academicYears.find((record) => record.id === scope.academicYearId);
  const classroom = snapshot.classrooms.find((record) => record.id === scope.classroomId && record.academicYearId === scope.academicYearId);
  if (!academicYear || !classroom || civilDate < String(academicYear.startDate) || civilDate > String(academicYear.endDate)) {
    throw new Error("Çıkış paketi günü etkin eğitim yılı içinde olmalıdır.");
  }
  const attendanceBreakdown = buildAttendanceDayBreakdown(snapshot, {
    scope,
    periodStart: civilDate,
    periodEnd: civilDate,
    asOfCivilDate: civilDate,
  });
  const attendanceDay = attendanceBreakdown.days[0]!;
  const attendanceRows: DayExitAttendanceRow[] = attendanceDay.rows
    .filter((row) => row.classification !== "excluded")
    .map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      status: row.status,
      canonicalRecordId: row.canonicalRecordId,
      sourceRecordIds: [...row.sourceRecordIds],
    }));
  const pickup = pickupSheetModel(snapshot, civilDate);
  const pickupByStudent = new Map(pickup.rows.map((row) => [row.studentId, row]));
  const pickupRows: DayExitPickupRow[] = attendanceRows.map((attendance) => {
    const source = pickupByStudent.get(attendance.studentId);
    const delivery = source?.deliveries.slice().sort((left, right) =>
      right.handedOverAt.localeCompare(left.handedOverAt) || right.id.localeCompare(left.id))[0];
    const required = attendance.status === "present" || attendance.status === "late";
    return {
      studentId: attendance.studentId,
      studentName: attendance.studentName,
      attendanceStatus: attendance.status,
      state: delivery ? "complete" : required ? "missing" : attendance.status === "absent" ? "not-required" : "attendance-missing",
      delivery: delivery ? {
        id: delivery.id,
        contactName: delivery.contact.name,
        relationship: delivery.contact.relationship,
        handedOverAt: delivery.handedOverAt,
      } : null,
      correctionCount: source?.correctionCount ?? 0,
      authorizedContactCount: source?.contacts.length ?? 0,
    };
  });
  const next = nextTeachingDay(snapshot, scope, civilDate);
  const nextDay = next ? (() => {
    const candidates = preparationCandidates(snapshot, scope, next.civilDate, next.civilDate)
      .map((candidate): PreparationCandidate => {
        if (!candidate.missingMaterials) return candidate;
        const record = snapshot[candidate.source.collection].find((entry) => entry.id === candidate.source.id);
        const provenance = record?.pedagogicalProvenance && typeof record.pedagogicalProvenance === "object"
          && !Array.isArray(record.pedagogicalProvenance) ? record.pedagogicalProvenance as Record<string, unknown> : null;
        const sourceActivityId = typeof record?.sourceActivityId === "string" ? record.sourceActivityId
          : typeof provenance?.sourceActivityId === "string" ? provenance.sourceActivityId : null;
        const activity = sourceActivityId ? getActivityStudioItem(sourceActivityId) : null;
        return activity ? { ...candidate, materials: [...activity.materials], missingMaterials: false } : candidate;
      })
      .sort((left, right) => left.source.title.localeCompare(right.source.title, "tr-TR")
        || left.source.collection.localeCompare(right.source.collection) || left.source.id.localeCompare(right.source.id));
    const plans = snapshot.plans.filter((record) => recordBelongsToClassroomScope(record, scope)
      && typeof record.deletedAt !== "string" && record.planType === "daily" && record.civilDate === next.civilDate)
      .map((record) => ({ id: record.id, title: String(record.title ?? "Günlük plan"), status: String(record.status ?? "planned"), updatedAt: record.updatedAt }))
      .sort((left, right) => left.title.localeCompare(right.title, "tr-TR") || left.id.localeCompare(right.id));
    const sourceProjection = candidates.map((candidate) => ({
      id: candidate.source.id,
      collection: candidate.source.collection,
      title: candidate.source.title,
      updatedAt: candidate.source.updatedAt,
      materials: unique(candidate.materials),
      preparation: unique(candidate.preparation),
    }));
    const sources: DayExitPreparationSource[] = candidates.map((candidate, index) => ({
      ...sourceProjection[index]!,
      alreadySaved: candidateCovered(candidate, snapshot, next.civilDate),
      available: candidateValues(candidate).length > 0,
    }));
    return {
      civilDate: next.civilDate,
      schoolDay: next.resolution,
      plans,
      sources,
      sourceFingerprint: canonicalJson({ scope, civilDate, nextDay: next.civilDate, schoolDay: next.resolution, plans, sources: sourceProjection }),
    } satisfies DayExitNextDay;
  })() : null;
  const attendance = {
    schoolDay: attendanceDay.calendar,
    rows: attendanceRows,
    recordedCount: attendanceRows.filter((row) => row.status !== null).length,
    missingCount: attendanceRows.filter((row) => row.status === null).length,
    presentCount: attendanceRows.filter((row) => row.status === "present").length,
    lateCount: attendanceRows.filter((row) => row.status === "late").length,
    absentCount: attendanceRows.filter((row) => row.status === "absent").length,
  };
  const pickups = {
    rows: pickupRows,
    completedCount: pickupRows.filter((row) => row.state === "complete").length,
    missingCount: pickupRows.filter((row) => row.state === "missing").length,
  };
  const result = {
    scope,
    civilDate,
    today,
    schoolName: String(classroom.schoolName ?? "Okul adı belirtilmedi"),
    classroomName: String(classroom.name ?? "Sınıf adı belirtilmedi"),
    teacherName: String(classroom.teacherName ?? "Öğretmen adı belirtilmedi"),
    academicYearName: String(academicYear.name ?? academicYear.label ?? `${academicYear.startDate}–${academicYear.endDate}`),
    attendance,
    pickups,
    nextDay,
  };
  return { ...result, sourceFingerprint: canonicalJson(result) };
}

export async function loadDayExitPackageModel(
  store: LocalDataStore,
  input: LoadDayExitPackageInput = {},
): Promise<DayExitPackageModel> {
  return resolveDayExitPackageModel(await store.readSnapshot(), input);
}

export function dayExitPreparationSource(
  source: DayExitPreparationSource,
): PreparationSource {
  return { collection: source.collection, id: source.id, title: source.title, updatedAt: source.updatedAt };
}
