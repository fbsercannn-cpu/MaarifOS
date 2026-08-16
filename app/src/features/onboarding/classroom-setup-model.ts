export type ClassroomSetupSectionId = "period" | "program" | "schedule";

export interface ClassroomSetupReadinessInput {
  readonly classroomName: string;
  readonly academicYearName: string;
  readonly academicYearStart: string;
  readonly academicYearEnd: string;
  readonly ageGroup: string;
  readonly curriculumProgramSupported: boolean;
  readonly curriculumCatalogId: string;
  readonly curriculumSourceVersion: string;
  readonly scheduleKind: string;
  readonly startTime: string;
  readonly endTime: string;
}

export interface ClassroomSetupReadiness {
  readonly period: boolean;
  readonly program: boolean;
  readonly schedule: boolean;
}

export const CLASSROOM_SETUP_SECTIONS: ReadonlyArray<{
  readonly id: ClassroomSetupSectionId;
  readonly shortLabel: string;
  readonly title: string;
}> = [
  { id: "period", shortLabel: "Dönem", title: "Dönem ve sınıf" },
  { id: "program", shortLabel: "Program", title: "Program ve yaş grubu" },
  { id: "schedule", shortLabel: "Düzen", title: "Günlük çalışma düzeni" },
];

const civilDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function classroomSetupReadiness(
  input: ClassroomSetupReadinessInput,
): ClassroomSetupReadiness {
  const period =
    input.classroomName.trim().length > 0 &&
    input.academicYearName.trim().length > 0 &&
    civilDatePattern.test(input.academicYearStart) &&
    civilDatePattern.test(input.academicYearEnd) &&
    input.academicYearStart <= input.academicYearEnd;
  const program =
    period &&
    input.ageGroup.trim().length > 0 &&
    input.curriculumProgramSupported &&
    input.curriculumCatalogId.trim().length > 0 &&
    input.curriculumSourceVersion.trim().length > 0;
  const schedule =
    program &&
    input.scheduleKind.trim().length > 0 &&
    clockPattern.test(input.startTime) &&
    clockPattern.test(input.endTime) &&
    input.startTime < input.endTime;
  return { period, program, schedule };
}

export function classroomSetupSectionAvailable(
  sectionId: ClassroomSetupSectionId,
  readiness: ClassroomSetupReadiness,
): boolean {
  if (sectionId === "period") return true;
  if (sectionId === "program") return readiness.period;
  return readiness.program;
}

export function classroomSetupSectionComplete(
  sectionId: ClassroomSetupSectionId,
  readiness: ClassroomSetupReadiness,
): boolean {
  return readiness[sectionId];
}

export function nextClassroomSetupSection(
  sectionId: ClassroomSetupSectionId,
): ClassroomSetupSectionId | null {
  if (sectionId === "period") return "program";
  if (sectionId === "program") return "schedule";
  return null;
}

export function previousClassroomSetupSection(
  sectionId: ClassroomSetupSectionId,
): ClassroomSetupSectionId | null {
  if (sectionId === "schedule") return "program";
  if (sectionId === "program") return "period";
  return null;
}
