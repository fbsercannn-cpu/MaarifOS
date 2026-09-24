import { isCivilDate } from "./attendance.ts";
import type { StoredRecord } from "./model";

export const CLASSROOM_SCHEMA_VERSION = 2 as const;
export const CLASSROOM_TIME_ZONE = "Europe/Istanbul" as const;
export const ACTIVE_CLASSROOM_SETTING_TYPE = "active-classroom-selection" as const;
export const ACTIVE_CLASSROOM_SETTING_ID = "00000000-0000-4000-9000-000000000002";

export type ClassroomScheduleKind = "morning" | "afternoon" | "full_day" | "custom";

export interface ClassroomSchedule {
  kind: ClassroomScheduleKind;
  startTime: string;
  endTime: string;
  timeZone: typeof CLASSROOM_TIME_ZONE;
}

export interface ClassroomRecord extends StoredRecord {
  academicYearId: string;
  name: string;
  schoolName?: string;
  teacherName?: string;
  ageGroup?: string;
  curriculumProgram?: string;
  curriculumCatalogLabel?: string;
  schedule?: ClassroomSchedule;
}

export interface ClassroomScheduleInput {
  kind: ClassroomScheduleKind;
  startTime: string;
  endTime: string;
}

export const CLASSROOM_SCHEDULE_PRESETS: Readonly<
  Record<Exclude<ClassroomScheduleKind, "custom">, Readonly<ClassroomScheduleInput>>
> = {
  morning: { kind: "morning", startTime: "08:30", endTime: "12:30" },
  afternoon: { kind: "afternoon", startTime: "13:00", endTime: "17:00" },
  full_day: { kind: "full_day", startTime: "08:30", endTime: "16:30" },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function minutesFromMidnight(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isClassroomScheduleKind(value: unknown): value is ClassroomScheduleKind {
  return value === "morning" || value === "afternoon" || value === "full_day" || value === "custom";
}

export function isLocalTime(value: unknown): value is string {
  return typeof value === "string" && LOCAL_TIME_PATTERN.test(value);
}

export function isClassroomSchedule(value: unknown): value is ClassroomSchedule {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const schedule = value as Record<string, unknown>;
  return (
    isClassroomScheduleKind(schedule.kind) &&
    isLocalTime(schedule.startTime) &&
    isLocalTime(schedule.endTime) &&
    minutesFromMidnight(schedule.startTime) < minutesFromMidnight(schedule.endTime) &&
    schedule.timeZone === CLASSROOM_TIME_ZONE
  );
}

export function normalizeClassroomSchedule(input: ClassroomScheduleInput): ClassroomSchedule {
  if (!isClassroomScheduleKind(input.kind)) {
    throw new Error("Çalışma düzeni sabah, öğle, tam gün veya özel saatler olmalıdır.");
  }
  if (!isLocalTime(input.startTime) || !isLocalTime(input.endTime)) {
    throw new Error("Çalışma saatleri SS:DD biçiminde olmalıdır.");
  }
  if (minutesFromMidnight(input.startTime) >= minutesFromMidnight(input.endTime)) {
    throw new Error("Bitiş saati başlangıç saatinden sonra olmalıdır.");
  }
  return {
    kind: input.kind,
    startTime: input.startTime,
    endTime: input.endTime,
    timeZone: CLASSROOM_TIME_ZONE,
  };
}

/**
 * Sınıf kaydının kalıcı kimlik ve ilişki alanlarını doğrular. `schedule` alanı
 * eski kayıtlarda bulunmayabilir; bu durum çalışma zamanında `not_configured`
 * olarak ele alınır. Alan varsa geçerli olmak zorundadır.
 */
export function isClassroomRecord(record: StoredRecord): record is ClassroomRecord {
  return (
    UUID_PATTERN.test(record.id) &&
    UUID_PATTERN.test(typeof record.academicYearId === "string" ? record.academicYearId : "") &&
    isNonEmptyString(record.name) &&
    isUtcIso(record.createdAt) &&
    isUtcIso(record.updatedAt) &&
    isCivilDate(record.civilDate) &&
    (record.schemaVersion === 1 || record.schemaVersion === CLASSROOM_SCHEMA_VERSION) &&
    (record.deletedAt === undefined || record.deletedAt === null || isUtcIso(record.deletedAt)) &&
    // Eski kayıtlarda bu iki alan hiç bulunmayabilir veya boş bırakılmış
    // olabilir. Yeni yazma akışı boş değerleri reddeder; okuma ise eski sınıfı
    // erişilemez hâle getirmemek için boş metni "alan yok" olarak kabul eder.
    (record.schoolName === undefined || typeof record.schoolName === "string") &&
    (record.teacherName === undefined || typeof record.teacherName === "string") &&
    (record.ageGroup === undefined || isNonEmptyString(record.ageGroup)) &&
    (record.curriculumProgram === undefined || isNonEmptyString(record.curriculumProgram)) &&
    (record.curriculumCatalogLabel === undefined || isNonEmptyString(record.curriculumCatalogLabel)) &&
    (record.schedule === undefined || isClassroomSchedule(record.schedule))
  );
}

export function classroomScheduleLabel(schedule: ClassroomSchedule): string {
  const kindLabels: Record<ClassroomScheduleKind, string> = {
    morning: "Sabah grubu",
    afternoon: "Öğle grubu",
    full_day: "Tam gün",
    custom: "Özel saatler",
  };
  const displayTime = (value: string) => value.replace(":", ".");
  return `${kindLabels[schedule.kind]} · ${displayTime(schedule.startTime)}–${displayTime(schedule.endTime)}`;
}
