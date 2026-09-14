import { isCivilDate } from "../../core/domain/attendance.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { isUuid } from "../evidence/local-teacher-identity.ts";
import {
  isDevelopmentReportRecord,
  type DevelopmentReportRecord,
} from "../development/development-report-model.ts";

export const TEACHING_STATE_NOTICES = Object.freeze({
  planned: "Planlandı: öğretmenin öngördüğü içerik ve program kapsamıdır; çocuk puanı veya değerlendirmesi değildir.",
  applied: "Uygulandı: yalnız tamamlandı olarak kaydedilmiş etkinliklerdir; gözlem veya kazanım sonucu değildir.",
  observed: "Gözlendi: değişmez ham gözlem kayıtlarıdır; tek başına öğretmen yargısı veya beceri edinimi değildir.",
  teacherJudgement: "Öğretmen yargısı: öğretmenin onayladığı ayrı değerlendirme metnidir; plandan otomatik üretilmez.",
} as const);

export interface TeachingStateScope {
  readonly academicYearId: string;
  readonly classroomId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly studentId?: string;
}

export interface PlannedTeachingRecord {
  readonly planId: string;
  readonly civilDate: string;
  readonly title: string;
  readonly plannedTargetIds: readonly string[];
  readonly plannedTargetLabels: readonly string[];
  readonly assignedStudentIds: readonly string[];
  readonly coverageOnly: true;
  readonly childScore: null;
  readonly childEvaluation: null;
}

export interface AppliedTeachingRecord {
  readonly activityId: string;
  readonly planId: string;
  readonly civilDate: string;
  readonly title: string;
  readonly assignedStudentIds: readonly string[];
  readonly completionSource: "activity-status-completed";
  readonly observationClaim: false;
  readonly skillAcquisitionClaim: false;
}

export interface ObservedTeachingRecord {
  readonly observationId: string;
  readonly planId: string | null;
  readonly activityId: string | null;
  readonly civilDate: string;
  readonly observedAt: string;
  readonly studentIds: readonly string[];
  readonly rawText: string;
  readonly rawTextImmutable: true;
  readonly teacherJudgementClaim: false;
  readonly skillAcquisitionClaim: false;
}

export interface TeacherJudgementRecord {
  readonly reportId: string;
  readonly studentId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly approvedAt: string;
  readonly teacherEvaluation: string;
  readonly nextSupport: string;
  readonly sourceObservationIds: readonly string[];
  readonly teacherAuthored: true;
  readonly automaticSkillAcquisitionClaim: false;
}

export interface TeachingStateSeparationView {
  readonly scope: TeachingStateScope;
  readonly planned: {
    readonly kind: "planned";
    readonly notice: typeof TEACHING_STATE_NOTICES.planned;
    readonly records: readonly PlannedTeachingRecord[];
  };
  readonly applied: {
    readonly kind: "applied";
    readonly notice: typeof TEACHING_STATE_NOTICES.applied;
    readonly records: readonly AppliedTeachingRecord[];
  };
  readonly observed: {
    readonly kind: "observed";
    readonly notice: typeof TEACHING_STATE_NOTICES.observed;
    readonly records: readonly ObservedTeachingRecord[];
  };
  readonly teacherJudgement: {
    readonly kind: "teacher-judgement";
    readonly notice: typeof TEACHING_STATE_NOTICES.teacherJudgement;
    readonly records: readonly TeacherJudgementRecord[];
  };
  readonly contract: {
    readonly planCoverageCreatesChildScore: false;
    readonly planOrApplicationCreatesObservation: false;
    readonly observationCreatesTeacherJudgement: false;
    readonly anyStageCreatesAutomaticSkillAcquisition: false;
  };
}

function active(record: StoredRecord): boolean {
  return typeof record.deletedAt !== "string";
}

function inScope(record: StoredRecord, scope: TeachingStateScope): boolean {
  return active(record) && record.academicYearId === scope.academicYearId &&
    record.classroomId === scope.classroomId && isCivilDate(record.civilDate) &&
    record.civilDate >= scope.periodStart && record.civilDate <= scope.periodEnd;
}

function uniqueIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter(isUuid))]
    : [];
}

function studentIds(record: StoredRecord): string[] {
  const plural = uniqueIds(record.studentIds);
  if (plural.length || record.studentIds !== undefined) return plural;
  return isUuid(record.studentId) ? [record.studentId] : [];
}

function appliesToStudent(record: StoredRecord, studentId: string | undefined): boolean {
  if (!studentId) return true;
  const assigned = studentIds(record);
  return assigned.length === 0 || assigned.includes(studentId);
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function targetRows(record: StoredRecord): { ids: string[]; labels: string[] } {
  if (!Array.isArray(record.curriculumTargets)) return { ids: [], labels: [] };
  const ids: string[] = [];
  const labels: string[] = [];
  for (const target of record.curriculumTargets) {
    if (!target || typeof target !== "object" || Array.isArray(target)) continue;
    const candidate = target as Record<string, unknown>;
    const id = [candidate.id, candidate.targetId, candidate.referenceCode].find(nonempty);
    const label = [candidate.referenceTitle, candidate.title, candidate.label, candidate.referenceCode].find(nonempty);
    if (id && !ids.includes(id)) ids.push(id);
    if (label && !labels.includes(label)) labels.push(label);
  }
  return { ids, labels };
}

function sorted<T extends { readonly civilDate?: string; readonly periodStart?: string }>(records: T[]): T[] {
  return records.sort((left, right) =>
    (left.civilDate ?? left.periodStart ?? "").localeCompare(right.civilDate ?? right.periodStart ?? ""));
}

function approvedJudgements(
  snapshot: DataSnapshot,
  scope: TeachingStateScope,
): DevelopmentReportRecord[] {
  return snapshot.settings.filter(isDevelopmentReportRecord).filter((record) =>
    !record.deletedAt && record.status === "approved" &&
    record.academicYearId === scope.academicYearId && record.classroomId === scope.classroomId &&
    (!scope.studentId || record.studentId === scope.studentId) &&
    record.periodStart <= scope.periodEnd && record.periodEnd >= scope.periodStart);
}

/**
 * Dört öğretim durumunu yalnız kendi kaynak koleksiyonundan okur. Bir aşamada
 * kayıt bulunması diğer aşama için sonuç, puan veya kazanım türetmez.
 */
export function buildTeachingStateSeparation(
  snapshot: DataSnapshot,
  scope: TeachingStateScope,
): TeachingStateSeparationView {
  if (!isUuid(scope.academicYearId) || !isUuid(scope.classroomId) ||
    (scope.studentId !== undefined && !isUuid(scope.studentId)) ||
    !isCivilDate(scope.periodStart) || !isCivilDate(scope.periodEnd) ||
    scope.periodStart > scope.periodEnd) {
    throw new Error("Öğretim durumu kapsamı geçersiz.");
  }
  const year = snapshot.academicYears.find((record) => record.id === scope.academicYearId && active(record));
  const classroom = snapshot.classrooms.find((record) => record.id === scope.classroomId &&
    record.academicYearId === scope.academicYearId && active(record));
  const child = scope.studentId
    ? snapshot.students.find((record) => record.id === scope.studentId && active(record))
    : null;
  if (!year || !classroom || (scope.studentId && (!child ||
    (child.academicYearId !== scope.academicYearId || child.classroomId !== scope.classroomId)))) {
    throw new Error("Öğretim durumu yıl, sınıf veya çocuk kapsamıyla uyuşmuyor.");
  }

  const planned = sorted(snapshot.plans.filter((record) => inScope(record, scope) && appliesToStudent(record, scope.studentId))
    .map((record): PlannedTeachingRecord => {
      const targets = targetRows(record);
      return {
        planId: record.id,
        civilDate: record.civilDate,
        title: nonempty(record.title) ? record.title : "Başlıksız plan",
        plannedTargetIds: targets.ids,
        plannedTargetLabels: targets.labels,
        assignedStudentIds: studentIds(record),
        coverageOnly: true,
        childScore: null,
        childEvaluation: null,
      };
    }));

  const applied = sorted(snapshot.activities.filter((record) =>
    inScope(record, scope) && record.status === "completed" &&
    isUuid(record.planId) && appliesToStudent(record, scope.studentId))
    .map((record): AppliedTeachingRecord => ({
      activityId: record.id,
      planId: record.planId as string,
      civilDate: record.civilDate,
      title: nonempty(record.title) ? record.title : "Başlıksız etkinlik",
      assignedStudentIds: studentIds(record),
      completionSource: "activity-status-completed",
      observationClaim: false,
      skillAcquisitionClaim: false,
    })));

  const observed = sorted(snapshot.observations.filter((record) =>
    inScope(record, scope) && record.rawTextImmutable === true &&
    nonempty(record.rawText) && (!scope.studentId || studentIds(record).includes(scope.studentId)))
    .map((record): ObservedTeachingRecord => ({
      observationId: record.id,
      planId: isUuid(record.planId) ? record.planId : null,
      activityId: isUuid(record.activityId) ? record.activityId : null,
      civilDate: record.civilDate,
      observedAt: nonempty(record.observedAt) ? record.observedAt : record.createdAt,
      studentIds: studentIds(record),
      rawText: record.rawText as string,
      rawTextImmutable: true,
      teacherJudgementClaim: false,
      skillAcquisitionClaim: false,
    })));

  const teacherJudgement = approvedJudgements(snapshot, scope)
    .sort((left, right) => left.periodStart.localeCompare(right.periodStart) || left.id.localeCompare(right.id))
    .map((record): TeacherJudgementRecord => ({
      reportId: record.id,
      studentId: record.studentId,
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      approvedAt: record.approvalSeal!.approvedAt,
      teacherEvaluation: record.teacherEvaluation,
      nextSupport: record.nextSupport,
      sourceObservationIds: [...record.selectedObservationIds],
      teacherAuthored: true,
      automaticSkillAcquisitionClaim: false,
    }));

  return {
    scope: { ...scope },
    planned: { kind: "planned", notice: TEACHING_STATE_NOTICES.planned, records: planned },
    applied: { kind: "applied", notice: TEACHING_STATE_NOTICES.applied, records: applied },
    observed: { kind: "observed", notice: TEACHING_STATE_NOTICES.observed, records: observed },
    teacherJudgement: {
      kind: "teacher-judgement",
      notice: TEACHING_STATE_NOTICES.teacherJudgement,
      records: teacherJudgement,
    },
    contract: {
      planCoverageCreatesChildScore: false,
      planOrApplicationCreatesObservation: false,
      observationCreatesTeacherJudgement: false,
      anyStageCreatesAutomaticSkillAcquisition: false,
    },
  };
}
