import { isCivilDate } from "../../core/domain/attendance.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import type { CurriculumTargetSnapshot } from "../curriculum/curriculum-catalog.ts";
import { isUuid } from "../evidence/local-teacher-identity.ts";
import { isDevelopmentObservationSelection, type DevelopmentObservationSelection } from "../evidence/development-observation-presets.ts";

export const DEVELOPMENT_REPORT_SETTING_TYPE = "development-report" as const;
export const DEVELOPMENT_REPORT_TITLE = "Öğretmen gözlem özeti" as const;
export const DEVELOPMENT_REPORT_NOTICE = "Öğretmenin seçtiği gözlemler ve ayrı değerlendirmesidir. Resmî MEB veya e-Okul raporu, tanı ya da beceri puanlaması değildir.";

export interface DevelopmentReportScope {
  studentId: string;
  academicYearId: string;
  classroomId: string;
  periodStart: string;
  periodEnd: string;
}

export interface DevelopmentReportEvidenceSnapshot {
  observationId: string;
  studentId: string;
  planId: string;
  activityId: string;
  rawText: string;
  civilDate: string;
  observedAt: string;
  sourceUpdatedAt: string;
  context?: string;
  childQuote?: string;
  developmentSelection?: DevelopmentObservationSelection;
  supportLabel?: string;
  confirmedTargets: CurriculumTargetSnapshot[];
  confirmedLinks: StoredRecord[];
  /** Ham kaynak tam kopyadır; rapor hiçbir zaman bu kaynağa yazmaz. */
  sourceObservation: StoredRecord;
  contextSnapshot: {
    planUpdatedAt: string;
    activityUpdatedAt: string;
    activityTitle: string;
    curriculumProfile: Record<string, unknown>;
    plannedTargets: CurriculumTargetSnapshot[];
    assignedStudentIds: string[];
  };
}

export interface DevelopmentReportApprovalSeal {
  algorithm: "SHA-256";
  contentSha256: string;
  revision: number;
  approvedAt: string;
  approvedByUserId: string;
}

export interface DevelopmentReportRecord extends StoredRecord, DevelopmentReportScope {
  settingType: typeof DEVELOPMENT_REPORT_SETTING_TYPE;
  schemaVersion: 1;
  revision: number;
  status: "draft" | "approved";
  studentSnapshot: { studentId: string; displayName: string };
  scopeSnapshot: { academicYearName: string; classroomName: string; schoolName?: string; teacherName?: string };
  selectedObservationIds: string[];
  evidenceSnapshots: DevelopmentReportEvidenceSnapshot[];
  teacherEvaluation: string;
  nextSupport: string;
  contentSha256: string;
  approvalSeal: DevelopmentReportApprovalSeal | null;
}

export const DEVELOPMENT_REPORT_KEYS = [
  "id", "createdAt", "updatedAt", "civilDate", "deletedAt", "schemaVersion", "settingType",
  "studentId", "academicYearId", "classroomId", "periodStart", "periodEnd", "revision", "status",
  "studentSnapshot", "scopeSnapshot", "selectedObservationIds", "evidenceSnapshots",
  "teacherEvaluation", "nextSupport", "contentSha256", "approvalSeal",
] as const;

/** Canonical quick capture stores a one-child studentIds array; legacy singular stays readable. */
export function developmentReportSourceStudentId(source: Record<string, unknown>): string | null {
  const ids = source.studentIds;
  if (ids !== undefined) {
    if (!Array.isArray(ids) || ids.length !== 1 || !isUuid(ids[0]) ||
      (source.studentId !== undefined && source.studentId !== ids[0])) return null;
    return ids[0];
  }
  return isUuid(source.studentId) ? source.studentId : null;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}
function utc(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function digest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Structural guard is synchronous; service/backup additionally verify SHA-256. */
export function isDevelopmentReportRecord(value: unknown): value is DevelopmentReportRecord {
  if (!object(value) || !keys(value, DEVELOPMENT_REPORT_KEYS) || !isUuid(value.id) ||
    value.settingType !== DEVELOPMENT_REPORT_SETTING_TYPE || value.schemaVersion !== 1 ||
    !isUuid(value.studentId) || !isUuid(value.classroomId) || !isUuid(value.academicYearId) ||
    !utc(value.createdAt) || !utc(value.updatedAt) || value.updatedAt < value.createdAt ||
    (value.deletedAt !== undefined && value.deletedAt !== null && !utc(value.deletedAt)) ||
    !isCivilDate(value.civilDate) || !isCivilDate(value.periodStart) || !isCivilDate(value.periodEnd) ||
    value.periodStart > value.periodEnd || !Number.isSafeInteger(value.revision) || Number(value.revision) < 1 ||
    (value.status !== "draft" && value.status !== "approved") || !digest(value.contentSha256) ||
    typeof value.teacherEvaluation !== "string" || value.teacherEvaluation.length > 20_000 ||
    typeof value.nextSupport !== "string" || value.nextSupport.length > 20_000 ||
    !object(value.studentSnapshot) || !keys(value.studentSnapshot, ["studentId", "displayName"]) ||
    value.studentSnapshot.studentId !== value.studentId || !nonempty(value.studentSnapshot.displayName) ||
    !object(value.scopeSnapshot) || !keys(value.scopeSnapshot, ["academicYearName", "classroomName", "schoolName", "teacherName"]) ||
    !nonempty(value.scopeSnapshot.academicYearName) || !nonempty(value.scopeSnapshot.classroomName) ||
    (value.scopeSnapshot.schoolName !== undefined && typeof value.scopeSnapshot.schoolName !== "string") ||
    (value.scopeSnapshot.teacherName !== undefined && typeof value.scopeSnapshot.teacherName !== "string") ||
    !Array.isArray(value.selectedObservationIds) || value.selectedObservationIds.length > 500 ||
    !value.selectedObservationIds.every(isUuid) || new Set(value.selectedObservationIds).size !== value.selectedObservationIds.length ||
    !Array.isArray(value.evidenceSnapshots) || value.evidenceSnapshots.length !== value.selectedObservationIds.length) return false;
  const selectedIds = value.selectedObservationIds;
  if (!value.evidenceSnapshots.every((item: unknown, index: number) => {
    if (!object(item) || !keys(item, ["observationId", "studentId", "planId", "activityId", "rawText", "civilDate", "observedAt", "sourceUpdatedAt", "context", "childQuote", "developmentSelection", "supportLabel", "confirmedTargets", "confirmedLinks", "sourceObservation", "contextSnapshot"]) ||
      item.observationId !== selectedIds[index] || item.studentId !== value.studentId || !isUuid(item.planId) || !isUuid(item.activityId) ||
      !nonempty(item.rawText) || !isCivilDate(item.civilDate) || item.civilDate < value.periodStart! || item.civilDate > value.periodEnd! ||
      !utc(item.observedAt) || !utc(item.sourceUpdatedAt) ||
      (item.context !== undefined && typeof item.context !== "string") ||
      (item.childQuote !== undefined && typeof item.childQuote !== "string") ||
      (item.developmentSelection !== undefined && !isDevelopmentObservationSelection(item.developmentSelection)) ||
      (item.supportLabel !== undefined && typeof item.supportLabel !== "string") ||
      !Array.isArray(item.confirmedLinks) || !Array.isArray(item.confirmedTargets) || item.confirmedLinks.length !== item.confirmedTargets.length ||
      !object(item.sourceObservation) || !object(item.contextSnapshot)) return false;
    const source = item.sourceObservation;
    const context = item.contextSnapshot;
    if (source.id !== item.observationId || developmentReportSourceStudentId(source) !== item.studentId || source.rawText !== item.rawText ||
      source.civilDate !== item.civilDate || source.updatedAt !== item.sourceUpdatedAt || source.planId !== item.planId || source.activityId !== item.activityId ||
      source.academicYearId !== value.academicYearId || source.classroomId !== value.classroomId || source.rawTextImmutable !== true ||
      (source.observedAt ?? source.createdAt) !== item.observedAt || source.context !== item.context || source.childQuote !== item.childQuote ||
      !keys(context, ["planUpdatedAt", "activityUpdatedAt", "activityTitle", "curriculumProfile", "plannedTargets", "assignedStudentIds"]) ||
      !utc(context.planUpdatedAt) || !utc(context.activityUpdatedAt) || !nonempty(context.activityTitle) || !object(context.curriculumProfile) ||
      !Array.isArray(context.plannedTargets) || !Array.isArray(context.assignedStudentIds) ||
      !(context.assignedStudentIds.length === 0 || (context.assignedStudentIds.length === 1 && context.assignedStudentIds[0] === value.studentId))) return false;
    return item.confirmedLinks.every((link) => object(link) && isUuid(link.id) && link.observationId === item.observationId &&
      link.confirmationMethod === "teacher-confirmed" && isUuid(link.approvedByUserId) && utc(link.confirmedAt) &&
      link.academicYearId === value.academicYearId && link.classroomId === value.classroomId) &&
      item.confirmedTargets.every((target) => object(target) && nonempty(target.id) && nonempty(target.referenceCode) &&
        nonempty(target.referenceTitle) && nonempty(target.domain) && nonempty(target.sourceUrl));
  })) return false;
  if (value.status === "draft") return value.approvalSeal === null;
  const seal = value.approvalSeal;
  return nonempty(value.teacherEvaluation) && selectedIds.length > 0 && object(seal) &&
    keys(seal, ["algorithm", "contentSha256", "revision", "approvedAt", "approvedByUserId"]) &&
    seal.algorithm === "SHA-256" && seal.contentSha256 === value.contentSha256 && seal.revision === value.revision &&
    utc(seal.approvedAt) && seal.approvedAt === value.updatedAt && isUuid(seal.approvedByUserId);
}
