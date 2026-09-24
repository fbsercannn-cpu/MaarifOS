import type { DataSnapshot } from "../../core/domain/model.ts";
import type { OfficialFormScope } from "./official-form-record.ts";
const identityKeys = new Set(["studentName", "childName", "draftStudentName", "targetStudentName"]);
const dateKeys = new Set(["date", "interviewDate", "meetingDate", "auditDate", "referralDate", "activityDate"]);
export function initialOfficialFormValue(key: string, value: unknown, ctx: { snapshot: DataSnapshot; scope: OfficialFormScope }): unknown {
  const child = ctx.snapshot.students.find(s => ctx.scope.studentIds.includes(s.id));
  const classroom = ctx.snapshot.classrooms.find(s => s.id === ctx.scope.classroomId);
  const year = ctx.snapshot.academicYears.find(s => s.id === ctx.scope.academicYearId);
  if (identityKeys.has(key)) return String(child?.displayName ?? "");
  if (key === "birthDate") return String(child?.birthDate ?? "");
  if (["schoolName", "teacherName"].includes(key)) return String(classroom?.[key] ?? "");
  if (key === "className") return String(classroom?.name ?? "");
  if (["academicYear", "schoolYear"].includes(key)) return String(year?.name ?? "");
  if (["ageGroup", "ageBand"].includes(key)) return ctx.scope.ageBand;
  if (["month", "selectedMonth"].includes(key)) return ctx.scope.period.slice(0, 7);
  if (dateKeys.has(key)) return ctx.scope.period;
  const care = child?.careDetails as Record<string, unknown> | undefined;
  if (["allergies", "nutritionHabits"].includes(key)) return String(care?.[key === "nutritionHabits" ? "dietaryNeeds" : key] ?? "");
  const contacts = Array.isArray(child?.contacts) ? child.contacts as Record<string, unknown>[] : [];
  if (key === "parentName") return contacts.filter(c => c.isPrimary).map(c => c.name ?? "").join(" / ");
  if (key === "parentPhone") return contacts.filter(c => c.isPrimary).map(c => c.phone ?? "").join(" / ");
  if (key === "emergencyContact") return contacts.filter(c => c.isEmergencyContact).map(c => [c.name, c.phone].filter(Boolean).join(" — ")).join(" / ");
  if (key === "pickupAuthPersons") return contacts.filter(c => c.isAuthorizedPickup).map(c => c.name ?? "").join(" / ");
  if (typeof value === "string") return "";
  if (key === "totalCount") return ctx.snapshot.students.filter(s => !s.deletedAt && s.active !== false && s.classroomId === ctx.scope.classroomId && s.academicYearId === ctx.scope.academicYearId).length;
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  if (value === null) return null;
  if (Array.isArray(value)) {
    if (key === "students") {
      const template = value[0] && typeof value[0] === "object" ? value[0] : {};
      return ctx.snapshot.students.filter(s => !s.deletedAt && s.classroomId === ctx.scope.classroomId && (!ctx.scope.studentIds.length || ctx.scope.studentIds.includes(s.id))).map(s => ({ ...initialOfficialFormValue("student", template, ctx) as object, id: s.id, name: String(s.displayName), ageMonth: "" }));
    }
    if (key === "newsletters") return value.slice(0, 1).map(item => ({ ...initialOfficialFormValue("newsletter", item, ctx) as object, id: crypto.randomUUID() }));
    if (["attendees", "items", "decisions", "referralReason", "selectedChildCriteria", "selectedProgramCriteria", "selectedTeacherCriteria", "conceptsLearned", "chatPrompts"].includes(key)) return [];
    return value.map(item => {
      if (!item || typeof item !== "object") return item;
      return Object.fromEntries(Object.entries(item).map(([field, v]) => [field,
        ["id", "question", "category", "title", "description", "name", "label", "code", "criteria", "required", "section", "area", "domain", "type", "items"].includes(field) ? v : typeof v === "boolean" ? false : typeof v === "number" ? 0 : ""]));
    });
  }
  if (value && typeof value === "object") {
    if (["matrix", "scores", "allRatings", "opinions", "ratings"].includes(key)) return {};
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, initialOfficialFormValue(k, v, ctx)]));
  }
  return value;
}
