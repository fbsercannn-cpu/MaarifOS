import type { AttendanceStatus } from "../../core/domain/attendance";

/**
 * Sınıf ekranının ihtiyaç duyduğu dar öğrenci izdüşümü.
 * Kalıcılık modeli yerine bu arayüzün kullanılması ekranı controller'dan bağımsız tutar.
 */
export interface ClassroomStudentViewModel {
  id: string;
  name: string;
  preferredName?: string;
  birthDate?: string;
  profilePhotoDataUrl?: string;
  status: AttendanceStatus;
  attendanceMarked?: boolean;
}

export interface ClassroomScreenSummary {
  activeStudentCount: number;
  presentStudentCount: number;
  observedStudentCount: number;
}

export type ClassroomRosterStatus = AttendanceStatus | "unmarked";

export const CLASSROOM_STATUS_LABELS: Readonly<
  Record<ClassroomRosterStatus, string>
> = Object.freeze({
  present: "Geldi",
  late: "Geç geldi",
  absent: "Gelmedi",
  unmarked: "İşaretlenmedi",
});

export function classroomStudentDisplayName(
  student: ClassroomStudentViewModel,
): string {
  return student.preferredName ?? student.name;
}

export function classroomRosterStatus(
  student: ClassroomStudentViewModel,
): ClassroomRosterStatus {
  return student.attendanceMarked === false ? "unmarked" : student.status;
}

export function classroomScreenDescription(
  summary: ClassroomScreenSummary,
  archivedStudentCount: number,
): string {
  return `${summary.activeStudentCount} sınıfta · ${archivedStudentCount} sınıftan ayrılmış çocuk`;
}
