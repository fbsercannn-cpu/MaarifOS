import type { DataSnapshot } from "../../core/domain/model.ts";
import { isTeacherOwnedPlanRecord } from "../../core/domain/teacher-owned-plan.ts";
import type { ChecklistItem } from "./ek15-catalog.ts";
import { isOfficialFormRecord, type OfficialFormScope } from "./official-form-record.ts";
const monthNames: Record<string, string> = { "09": "Eylül", "10": "Ekim", "11": "Kasım", "12": "Aralık", "01": "Ocak", "02": "Şubat", "03": "Mart", "04": "Nisan", "05": "Mayıs", "06": "Haziran" };
const plannedFields = ["narrative", "focus", "purpose", "domainSkills", "tendencies", "socialEmotional", "values", "literacy", "learningOutcomes", "plannedCodes", "curriculumTargets"];
export function programCodeCandidates(text: string): string[] {
  return [...new Set(text.match(/(?<![\p{L}\p{N}.])(?:[A-ZÇ]{1,8}\d+(?:\.\d+)*|[A-ZÇ]{1,8}(?:\.\d+)+)(?![\p{L}\p{N}])/gu) ?? [])];
}
export interface ChecklistPlanSource { id: string; kind: "official-form" | "teacher-owned"; revision: number; month: string; codes: string[]; meaning: "planned" }
/** A mark means planned coverage, never completion or a child's observed attainment. */
export function generateCurriculumMatrix(items: ChecklistItem[], snapshot: DataSnapshot, scope: OfficialFormScope): { matrix: Record<string, Record<string, boolean>>; sourceCount: number; matchCount: number; sources: ChecklistPlanSource[] } {
  const candidates: { id: string; kind: ChecklistPlanSource["kind"]; revision: number; month: string; data: Record<string, unknown> }[] = [];
  for (const record of snapshot.settings.filter(isOfficialFormRecord)) {
    if (record.formId !== "monthly" || record.classroomId !== scope.classroomId || record.academicYearId !== scope.academicYearId || record.ageBand !== scope.ageBand) continue;
    const data = record.formValues.formData;
    if (data && typeof data === "object" && !Array.isArray(data)) candidates.push({id:record.id,kind:"official-form",revision:record.revision,month:record.period.slice(0,7),data});
  }
  const classroom = snapshot.classrooms.find(c => c.id === scope.classroomId && c.academicYearId === scope.academicYearId);
  const normalizeAge = (value: unknown) => typeof value === "string" ? value.replace(/[–—]/g,"-").match(/(?:36-48|48-60|60-72)/)?.[0] : undefined;
  const graph = snapshot.plans.filter(isTeacherOwnedPlanRecord);
  for (const plan of graph) {
    if (plan.planType !== "monthly" || plan.classroomId !== scope.classroomId || plan.academicYearId !== scope.academicYearId) continue;
    const annual = graph.find(p => p.planType === "annual" && p.id === plan.annualPlanId && p.classroomId === scope.classroomId && p.academicYearId === scope.academicYearId && p.monthlySectionIds.includes(plan.id));
    if (!annual || normalizeAge(plan.teacherContent.ageBand ?? classroom?.ageGroup) !== scope.ageBand) continue;
    candidates.push({id:plan.id,kind:"teacher-owned",revision:plan.revisionNumber,month:plan.monthKey,data:plan.teacherContent});
  }
  const matrix: Record<string, Record<string, boolean>> = {};
  const sources: ChecklistPlanSource[] = [];
  const officialCodes = new Set(items.filter(item => item.category !== "kavram").map(item => item.code));
  let matches = 0;
  for (const source of candidates) {
    const month = monthNames[source.month.slice(5,7)]; if (!month) continue;
    const text = plannedFields.map(k => typeof source.data[k] === "string" ? source.data[k] : JSON.stringify(source.data[k] ?? "")).join(" ");
    const codes = programCodeCandidates(text).filter(code => officialCodes.has(code));
    sources.push({id:source.id,kind:source.kind,revision:source.revision,month:source.month,codes,meaning:"planned"});
    for (const item of items) {
      if (codes.includes(item.code) && !matrix[item.id]?.[month]) { (matrix[item.id] ??= {})[month] = true; matches++; }
    }
  }
  return {matrix,sourceCount:sources.length,matchCount:matches,sources};
}
