import type { DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { isTeacherOwnedPlanRecord } from "../../core/domain/teacher-owned-plan.ts";
import {
  resolveTeacherDayClosureWorkspace,
  type TeacherDayClosureWorkspace,
} from "../day-closure/teacher-day-closure.ts";
import {
  localNoSchoolPeriodsFromCalendarEntries,
  resolveTeacherWeekTeachingDays,
} from "../planning/teacher-week-teaching-days.ts";
import { resolveTeacherWorkCycle } from "./teacher-work-cycle.ts";

export type TeacherWeekDayState =
  | "future"
  | "missing-plan"
  | "plan-conflict"
  | "attendance"
  | "application"
  | "curriculum-link"
  | "ready-to-close"
  | "closed-complete"
  | "closed-with-carry"
  | "stale";

export interface TeacherWeekDayWorkspace {
  readonly civilDate: string;
  readonly weekdayLabel: string;
  readonly isToday: boolean;
  readonly state: TeacherWeekDayState;
  readonly title: string;
  readonly detail: string;
  readonly planId: string | null;
  readonly conflictingPlanIds: readonly string[];
  readonly attendanceMarkedCount: number;
  readonly expectedStudentCount: number;
  readonly completedActivityCount: number;
  readonly activityCount: number;
  readonly observationCount: number;
  readonly pendingCurriculumLinkCount: number;
  readonly closureStatus: TeacherDayClosureWorkspace["status"];
}

export interface TeacherWeekWorkspace {
  readonly status: "not-configured" | "ready";
  readonly civilDate: string;
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly days: readonly TeacherWeekDayWorkspace[];
  readonly expectedDayCount: number;
  readonly coverageStatus: "fallback" | "authoritative" | "invalid";
  readonly coverageDetail: string;
  readonly completedDayCount: number;
  readonly carriedDayCount: number;
  readonly plannedDayCount: number;
  readonly openWorkDayCount: number;
  readonly nextActionDate: string | null;
  readonly nextActionLabel: string;
}

const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum"] as const;

function weekdayLabel(civilDate: string): string {
  const weekday = new Date(`${civilDate}T12:00:00.000Z`).getUTCDay();
  return WEEKDAY_LABELS[weekday - 1] ?? "Gün";
}

function dateParts(civilDate: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(civilDate);
  if (!match) throw new Error("Öğretmen haftası tarihi YYYY-AA-GG biçiminde olmalıdır.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Öğretmen haftası tarihi geçerli bir sivil gün olmalıdır.");
  }
  return [year, month, day];
}

function shiftCivilDate(civilDate: string, days: number): string {
  const [year, month, day] = dateParts(civilDate);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

export function teacherWeekStart(civilDate: string): string {
  const [year, month, day] = dateParts(civilDate);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  return shiftCivilDate(civilDate, -mondayOffset);
}

function stateForDay(input: {
  civilDate: string;
  currentCivilDate: string;
  dailyStatus: "missing" | "ready" | "conflict";
  planId: string | null;
  conflictingPlanIds: readonly string[];
  closure: ReturnType<typeof resolveTeacherDayClosureWorkspace>;
}): Pick<TeacherWeekDayWorkspace, "state" | "title" | "detail"> {
  const { civilDate, currentCivilDate, dailyStatus, closure } = input;
  if (dailyStatus === "conflict") {
    return {
      state: "plan-conflict",
      title: "Plan çakışması",
      detail: `${input.conflictingPlanIds.length} günlük plan inceleme bekliyor.`,
    };
  }
  if (civilDate > currentCivilDate) {
    return dailyStatus === "ready"
      ? { state: "future", title: "Plan hazır", detail: "Günü gelince uygulama açılır." }
      : { state: "future", title: "Plan bekliyor", detail: "Bu gün için plan henüz yok." };
  }
  if (dailyStatus === "missing" || input.planId === null) {
    return {
      state: "missing-plan",
      title: "Plan yok",
      detail: civilDate < currentCivilDate ? "Geçmiş gün plansız kaldı." : "Günlük plan oluşturun.",
    };
  }
  if (closure.status === "stale") {
    return {
      state: "stale",
      title: "Kapanış eskidi",
      detail: "Kapanıştan sonra kanıt değişti; yeniden inceleyin.",
    };
  }
  if (closure.status === "closed") {
    return closure.latestClosure?.closureStatus === "complete"
      ? { state: "closed-complete", title: "Gün tamam", detail: `${closure.evidence.observationCount} gözlem · kapanış doğrulandı.` }
      : { state: "closed-with-carry", title: "Eksikle kapandı", detail: `${closure.latestClosure?.issueCodes.length ?? 0} iş sonraki güne taşındı.` };
  }
  if (
    !closure.evidence.attendanceCompleted ||
    closure.evidence.attendanceMarkedCount < closure.evidence.expectedStudentCount
  ) {
    return {
      state: "attendance",
      title: "Yoklama bekliyor",
      detail: `${closure.evidence.attendanceMarkedCount}/${closure.evidence.expectedStudentCount} çocuk işaretlendi.`,
    };
  }
  if (
    closure.evidence.activityCount === 0 ||
    closure.evidence.completedActivityCount < closure.evidence.activityCount
  ) {
    return {
      state: "application",
      title: "Uygulama açık",
      detail: `${closure.evidence.completedActivityCount}/${closure.evidence.activityCount} etkinlik tamamlandı.`,
    };
  }
  if (closure.evidence.pendingCurriculumLinkCount > 0) {
    return {
      state: "curriculum-link",
      title: "Program bağı bekliyor",
      detail: `${closure.evidence.pendingCurriculumLinkCount} gözlem bağlantı bekliyor.`,
    };
  }
  return {
    state: "ready-to-close",
    title: "Kapanışa hazır",
    detail: `${closure.evidence.observationCount} gözlem · kanıt zinciri güncel.`,
  };
}

export function emptyTeacherWeekWorkspace(civilDate: string): TeacherWeekWorkspace {
  const weekStart = teacherWeekStart(civilDate);
  return {
    status: "not-configured",
    civilDate,
    weekStart,
    weekEnd: shiftCivilDate(weekStart, 4),
    days: [],
    expectedDayCount: 0,
    coverageStatus: "fallback",
    coverageDetail: "Etkin sınıf kurulumu tamamlanmadan öğretim günü paydası oluşturulmaz.",
    completedDayCount: 0,
    carriedDayCount: 0,
    plannedDayCount: 0,
    openWorkDayCount: 0,
    nextActionDate: null,
    nextActionLabel: "Sınıf kurulumunu tamamlayın",
  };
}

export function resolveTeacherWeekWorkspace(
  snapshot: DataSnapshot,
  civilDate: string,
): TeacherWeekWorkspace {
  const weekStart = teacherWeekStart(civilDate);
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return emptyTeacherWeekWorkspace(civilDate);
  const currentCycle = resolveTeacherWorkCycle(snapshot, { civilDate });
  let coverageStatus: TeacherWeekWorkspace["coverageStatus"] = "fallback";
  let coverageDetail = "Haftalık plan bağlanana kadar Pazartesi–Cuma çalışma görünümü kullanılıyor.";
  let expectedCivilDates = WEEKDAY_LABELS.map((_, index) =>
    shiftCivilDate(weekStart, index),
  );
  const weeklyRecord = currentCycle.weekly?.relation === "current"
    ? snapshot.plans.find((record) => record.id === currentCycle.weekly?.id)
    : null;
  if (weeklyRecord && isTeacherOwnedPlanRecord(weeklyRecord) && weeklyRecord.planType === "weekly") {
    const academicYear = snapshot.academicYears.find(
      (record) => record.id === scope.academicYearId && typeof record.deletedAt !== "string",
    );
    const classroom = snapshot.classrooms.find(
      (record) => record.id === scope.classroomId && typeof record.deletedAt !== "string",
    );
    try {
      if (!academicYear || !classroom) {
        throw new Error("Etkin eğitim yılı veya sınıf kaydı bulunamadı.");
      }
      const teachingDays = resolveTeacherWeekTeachingDays({
        academicYear,
        weekly: weeklyRecord,
        classroomSchedule: classroom.schedule,
        explicitNoSchoolPeriods: localNoSchoolPeriodsFromCalendarEntries(
          snapshot.calendarEntries,
          scope,
        ),
      });
      expectedCivilDates = [...teachingDays.expectedCivilDates];
      coverageStatus = "authoritative";
      coverageDetail = teachingDays.provenance.mode === "official-meb-2026-2027"
        ? `MEB çalışma takvimine göre ${expectedCivilDates.length} öğretim günü.`
        : `Etkin eğitim yılı kaydına göre ${expectedCivilDates.length} öğretim günü.`;
    } catch (reason) {
      expectedCivilDates = [];
      coverageStatus = "invalid";
      coverageDetail = reason instanceof Error
        ? reason.message
        : "Öğretim günü kapsamı doğrulanamadı.";
    }
  }
  const probeDate = expectedCivilDates[0] ?? weekStart;
  if (resolveTeacherDayClosureWorkspace(snapshot, probeDate).status === "not-configured") {
    return emptyTeacherWeekWorkspace(civilDate);
  }
  const days = expectedCivilDates.map((dayCivilDate) => {
    const cycle = resolveTeacherWorkCycle(snapshot, { civilDate: dayCivilDate });
    const closure = resolveTeacherDayClosureWorkspace(snapshot, dayCivilDate);
    const presentation = stateForDay({
      civilDate: dayCivilDate,
      currentCivilDate: civilDate,
      dailyStatus: cycle.daily.status,
      planId: cycle.daily.planId,
      conflictingPlanIds: cycle.daily.conflictingPlanIds,
      closure,
    });
    return {
      civilDate: dayCivilDate,
      weekdayLabel: weekdayLabel(dayCivilDate),
      isToday: dayCivilDate === civilDate,
      ...presentation,
      planId: cycle.daily.planId,
      conflictingPlanIds: cycle.daily.conflictingPlanIds,
      attendanceMarkedCount: closure.evidence.attendanceMarkedCount,
      expectedStudentCount: closure.evidence.expectedStudentCount,
      completedActivityCount: closure.evidence.completedActivityCount,
      activityCount: closure.evidence.activityCount,
      observationCount: closure.evidence.observationCount,
      pendingCurriculumLinkCount: closure.evidence.pendingCurriculumLinkCount,
      closureStatus: closure.status,
    } satisfies TeacherWeekDayWorkspace;
  });
  const isOpen = (day: TeacherWeekDayWorkspace) =>
    day.civilDate <= civilDate &&
    !["closed-complete", "closed-with-carry", "future"].includes(day.state);
  const todayAction = days.find((day) => day.isToday && isOpen(day));
  const criticalPastAction = days.find(
    (day) =>
      day.civilDate < civilDate &&
      ["plan-conflict", "stale"].includes(day.state),
  );
  const actionable = todayAction ?? criticalPastAction ?? days.find(isOpen);
  return {
    status: "ready",
    civilDate,
    weekStart,
    weekEnd: expectedCivilDates.at(-1) ?? shiftCivilDate(weekStart, 4),
    days,
    expectedDayCount: expectedCivilDates.length,
    coverageStatus,
    coverageDetail,
    completedDayCount: days.filter((day) => day.state === "closed-complete").length,
    carriedDayCount: days.filter((day) => day.state === "closed-with-carry").length,
    plannedDayCount: days.filter((day) => day.planId !== null).length,
    openWorkDayCount: days.filter(isOpen).length,
    nextActionDate: actionable?.civilDate ?? null,
    nextActionLabel: actionable?.title ?? "Bu haftanın açık işi yok",
  };
}

export async function loadTeacherWeekWorkspace(
  store: LocalDataStore,
  options: { readonly civilDate: string },
): Promise<TeacherWeekWorkspace> {
  return resolveTeacherWeekWorkspace(await store.readSnapshot(), options.civilDate);
}
