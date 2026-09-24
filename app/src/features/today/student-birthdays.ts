import { isCivilDate } from "../../core/domain/attendance.ts";

export interface BirthdayStudent { id: string; name: string; birthDate?: string; active?: boolean; deletedAt?: string | null; enrollmentStatus?: string; }
export interface UpcomingBirthday { studentId: string; name: string; civilDate: string; daysUntil: number; turningAge: number; leapDayAdjusted: boolean; }

/** February 29 is shown on February 28 in non-leap years, explicitly labelled in UI. */
export function upcomingStudentBirthdays(students: readonly BirthdayStudent[], today: string): UpcomingBirthday[] {
  if (!isCivilDate(today)) return [];
  const todayTime = Date.parse(`${today}T00:00:00.000Z`), currentYear = Number(today.slice(0, 4));
  const result: UpcomingBirthday[] = [];
  for (const student of students) {
    if (!student.birthDate || !isCivilDate(student.birthDate) || student.birthDate > today || student.active === false || student.deletedAt || student.enrollmentStatus === "left") continue;
    const monthDay = student.birthDate.slice(5), birthYear = Number(student.birthDate.slice(0, 4));
    for (const year of [currentYear, currentYear + 1]) {
      let civilDate = `${year}-${monthDay}`;
      const leapDayAdjusted = !isCivilDate(civilDate) && monthDay === "02-29";
      if (leapDayAdjusted) civilDate = `${year}-02-28`;
      const daysUntil = Math.round((Date.parse(`${civilDate}T00:00:00.000Z`) - todayTime) / 86400000);
      if (daysUntil >= 0 && daysUntil <= 3 && year > birthYear) result.push({ studentId: student.id, name: student.name, civilDate, daysUntil, turningAge: year - birthYear, leapDayAdjusted });
    }
  }
  return result.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name, "tr-TR"));
}
