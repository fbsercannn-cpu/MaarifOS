import { isCivilDate } from "../../core/domain/attendance.ts";
import type { AcademicYearOperationalStatus } from "../today/today-data.ts";

export interface AcademicYearPlanWritePolicyInput {
  operationalStatus: AcademicYearOperationalStatus;
  academicYearStart: string;
  academicYearEnd: string;
  civilDate: string;
  hasPreparedPlanContext: boolean;
}

export interface PreparationPlanningWindowInput {
  operationalStatus: AcademicYearOperationalStatus;
  academicYearStart: string;
  academicYearEnd: string;
  weeklyPeriodStart?: string | null;
  weeklyPeriodEnd?: string | null;
}

export interface PreparationPlanningWindow {
  allowed: boolean;
  defaultCivilDate: string | null;
}

function validOrderedRange(start: string, end: string): boolean {
  return isCivilDate(start) && isCivilDate(end) && start <= end;
}

export function resolvePreparationPlanningWindow(
  input: PreparationPlanningWindowInput,
): PreparationPlanningWindow {
  if (
    input.operationalStatus !== "preparation" ||
    !validOrderedRange(input.academicYearStart, input.academicYearEnd) ||
    !input.weeklyPeriodStart ||
    !input.weeklyPeriodEnd ||
    !validOrderedRange(input.weeklyPeriodStart, input.weeklyPeriodEnd)
  ) {
    return { allowed: false, defaultCivilDate: null };
  }

  const windowStart = input.weeklyPeriodStart > input.academicYearStart
    ? input.weeklyPeriodStart
    : input.academicYearStart;
  const windowEnd = input.weeklyPeriodEnd < input.academicYearEnd
    ? input.weeklyPeriodEnd
    : input.academicYearEnd;

  if (windowStart > windowEnd) {
    return { allowed: false, defaultCivilDate: null };
  }

  return { allowed: true, defaultCivilDate: windowStart };
}

export function isAcademicYearPlanWriteAllowed(
  input: AcademicYearPlanWritePolicyInput,
): boolean {
  if (
    !validOrderedRange(input.academicYearStart, input.academicYearEnd) ||
    !isCivilDate(input.civilDate)
  ) {
    return false;
  }
  if (input.operationalStatus === "active") return true;
  if (input.operationalStatus !== "preparation") return false;
  return input.hasPreparedPlanContext &&
    input.civilDate >= input.academicYearStart &&
    input.civilDate <= input.academicYearEnd;
}
