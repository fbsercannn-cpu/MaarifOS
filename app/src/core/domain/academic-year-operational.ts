import { isCivilDate } from "./attendance.ts";
import type { StoredRecord } from "./model.ts";

export type AcademicYearOperationalStatus =
  | "active"
  | "preparation"
  | "ended";

export interface AcademicYearOperationalRecord extends StoredRecord {
  startDate: string;
  endDate: string;
  operationalStartDate?: string;
  operationalStartedAt?: string;
}

export function academicYearEffectiveOperationalStart(
  academicYear: Pick<
    AcademicYearOperationalRecord,
    "startDate" | "operationalStartDate"
  >,
): string {
  return isCivilDate(academicYear.operationalStartDate)
    ? academicYear.operationalStartDate
    : academicYear.startDate;
}

export function academicYearOperationalStatus(
  startDate: string,
  endDate: string,
  civilDate: string,
  operationalStartDate?: string,
): AcademicYearOperationalStatus {
  if (
    !isCivilDate(startDate) ||
    !isCivilDate(endDate) ||
    !isCivilDate(civilDate) ||
    (operationalStartDate !== undefined &&
      !isCivilDate(operationalStartDate))
  ) {
    throw new Error(
      "Eğitim yılı çalışma durumu için geçerli tarihler gereklidir.",
    );
  }
  if (startDate > endDate) {
    throw new Error("Eğitim yılı bitiş tarihi başlangıç tarihinden önce olamaz.");
  }
  const effectiveStart = operationalStartDate ?? startDate;
  if (effectiveStart > endDate) {
    throw new Error("Çalışma başlangıcı eğitim yılı bitişinden sonra olamaz.");
  }
  if (civilDate < effectiveStart) return "preparation";
  if (civilDate > endDate) return "ended";
  return "active";
}
