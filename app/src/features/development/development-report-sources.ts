import { isCivilDate } from "../../core/domain/attendance.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { recordBelongsToClassroomScope, resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { curriculumTargetsForProfile, type CurriculumTargetSnapshot } from "../curriculum/curriculum-catalog.ts";
import type { CurriculumProfileSnapshot } from "../evidence/evidence-flow.ts";
import { teacherConfirmedTarget } from "../evidence/evidence-workspace.ts";
import { isUuid } from "../evidence/local-teacher-identity.ts";
import { DEVELOPMENT_OBSERVATION_SUPPORT_OPTIONS, parseDevelopmentObservationSelection } from "../evidence/development-observation-presets.ts";
import { studentMembershipOverlaps } from "../../core/domain/student-membership.ts";
import { membershipContains } from "./development-overview.ts";
import { DEVELOPMENT_REPORT_SETTING_TYPE, developmentReportSourceStudentId, isDevelopmentReportRecord, type DevelopmentReportEvidenceSnapshot, type DevelopmentReportRecord, type DevelopmentReportScope } from "./development-report-model.ts";

function live(record: StoredRecord): boolean { return typeof record.deletedAt !== "string"; }

export function assertDevelopmentReportScope(snapshot: DataSnapshot, scope: DevelopmentReportScope, forWrite = false) {
  if (![scope.studentId, scope.classroomId, scope.academicYearId].every(isUuid) ||
    !isCivilDate(scope.periodStart) || !isCivilDate(scope.periodEnd) || scope.periodStart > scope.periodEnd) {
    throw new Error("Çocuk, sınıf, eğitim yılı ve geçerli dönem tarihleri gerekli.");
  }
  const student = snapshot.students.find((row) => row.id === scope.studentId);
  const classroom = snapshot.classrooms.find((row) => row.id === scope.classroomId && row.academicYearId === scope.academicYearId);
  const year = snapshot.academicYears.find((row) => row.id === scope.academicYearId);
  if (!student || !classroom || !year || !studentMembershipOverlaps(student, { ...scope, academicYear: year }) ||
    typeof student.displayName !== "string" || !student.displayName.trim() ||
    typeof classroom.name !== "string" || !classroom.name.trim() || typeof year.name !== "string" || !year.name.trim()) {
    throw new Error("Rapor çocuğu seçilen sınıf ve eğitim yılına ait değil.");
  }
  const start = typeof year.operationalStartDate === "string" && isCivilDate(year.operationalStartDate)
    ? year.operationalStartDate : year.startDate;
  if (!isCivilDate(start) || !isCivilDate(year.endDate) || scope.periodStart < start || scope.periodEnd > year.endDate) {
    throw new Error("Rapor dönemi eğitim yılının çalışma tarihleri içinde olmalı.");
  }
  if (forWrite) {
    const active = resolveActiveClassroomScope(snapshot);
    if (!live(student) || !live(classroom) || !live(year) || !active ||
      active.classroomId !== scope.classroomId || active.academicYearId !== scope.academicYearId) {
      throw new Error("Rapor yalnız seçili etkin sınıf ve eğitim yılında düzenlenebilir.");
    }
  }
  return {
    studentSnapshot: { studentId: student.id, displayName: student.displayName },
    scopeSnapshot: {
      academicYearName: year.name,
      classroomName: classroom.name,
      ...(typeof classroom.schoolName === "string" ? { schoolName: classroom.schoolName } : {}),
      ...(typeof classroom.teacherName === "string" ? { teacherName: classroom.teacherName } : {}),
    },
  };
}

/** An explicit selection never silently drops a malformed or foreign source. */
export function developmentReportEvidence(snapshot: DataSnapshot, scope: DevelopmentReportScope, observationId: string): DevelopmentReportEvidenceSnapshot {
  const observation = snapshot.observations.find((row) => row.id === observationId);
  const student = snapshot.students.find((row) => row.id === scope.studentId);
  const year = snapshot.academicYears.find((row) => row.id === scope.academicYearId);
  if (!observation || !live(observation) || developmentReportSourceStudentId(observation) !== scope.studentId ||
    !recordBelongsToClassroomScope(observation, scope) || observation.rawTextImmutable !== true ||
    typeof observation.rawText !== "string" || !observation.rawText.trim() ||
    observation.civilDate < scope.periodStart || observation.civilDate > scope.periodEnd ||
    !student || !year || !membershipContains(student, scope, observation.civilDate, year)) {
    throw new Error("Seçilen gözlem bu çocuğa, sınıfa veya döneme ait değil ya da kullanılamıyor.");
  }
  const plan = snapshot.plans.find((row) => row.id === observation.planId);
  const activity = snapshot.activities.find((row) => row.id === observation.activityId && row.planId === plan?.id);
  if (!plan || !activity || !live(plan) || !live(activity) || !recordBelongsToClassroomScope(plan, scope) ||
    !recordBelongsToClassroomScope(activity, scope) || typeof activity.title !== "string" || !activity.title.trim() ||
    (Array.isArray(activity.studentIds) && activity.studentIds.length > 0 && !activity.studentIds.includes(scope.studentId))) {
    throw new Error("Gözlemin plan, etkinlik ve çocuk bağlamı doğrulanamadı.");
  }
  const profile = (plan.curriculumProfileSnapshot ?? activity.curriculumProfileSnapshot) as CurriculumProfileSnapshot;
  if (!profile || typeof profile !== "object" || (profile.framework !== "tymm" && profile.framework !== "meb_2024")) {
    throw new Error("Gözlemin program profili doğrulanamadı.");
  }
  const plannedTargets = (Array.isArray(activity.curriculumTargets) ? activity.curriculumTargets : []) as CurriculumTargetSnapshot[];
  const links = snapshot.evidenceCurriculumLinks.filter((row) => row.observationId === observation.id && live(row) && row.confirmationMethod === "teacher-confirmed")
    .sort((a, b) => a.id.localeCompare(b.id));
  const confirmedTargets = links.map((link) => {
    if (!recordBelongsToClassroomScope(link, scope) || !isUuid(link.approvedByUserId) || typeof link.confirmedAt !== "string") {
      throw new Error("Gözlemin öğretmen onaylı program bağı geçersiz.");
    }
    const target = teacherConfirmedTarget(link, plannedTargets, profile, observation, snapshot);
    if (!target) throw new Error("Gözlemin kaynaklı program bağı doğrulanamadı.");
    assertCanonicalReportTarget(target);
    return target;
  });
  const selection = observation.developmentSelection === undefined ? undefined : parseDevelopmentObservationSelection(observation.developmentSelection);
  if (selection && links.filter((link) => link.developmentSelection !== undefined).length !== 1) {
    throw new Error("Maarif gelişim gözleminin kanonik öğretmen onayı eksik veya yinelenmiş.");
  }
  const supportLabel = selection?.support ? DEVELOPMENT_OBSERVATION_SUPPORT_OPTIONS.find((item) => item.id === selection.support)?.label : undefined;
  return structuredClone({
    observationId: observation.id, studentId: scope.studentId, planId: plan.id, activityId: activity.id,
    rawText: observation.rawText, civilDate: observation.civilDate,
    observedAt: typeof observation.observedAt === "string" ? observation.observedAt : observation.createdAt,
    sourceUpdatedAt: observation.updatedAt,
    ...(typeof observation.context === "string" ? { context: observation.context } : {}),
    ...(typeof observation.childQuote === "string" ? { childQuote: observation.childQuote } : {}),
    ...(selection ? { developmentSelection: selection } : {}), ...(supportLabel ? { supportLabel } : {}),
    confirmedTargets, confirmedLinks: links, sourceObservation: observation,
    contextSnapshot: {
      planUpdatedAt: plan.updatedAt, activityUpdatedAt: activity.updatedAt, activityTitle: activity.title,
      curriculumProfile: { ...profile }, plannedTargets,
      // Another child's lifecycle must not remove this child's sealed report.
      assignedStudentIds: Array.isArray(activity.studentIds) && activity.studentIds.includes(scope.studentId) ? [scope.studentId] : [],
    },
  });
}

export function buildDevelopmentReportWorkspace(snapshot: DataSnapshot, scope: DevelopmentReportScope) {
  const identity = assertDevelopmentReportScope(snapshot, scope, true);
  const availableEvidence: DevelopmentReportEvidenceSnapshot[] = [];
  let unavailableEvidenceCount = 0;
  for (const observation of snapshot.observations) {
    if (!live(observation) || developmentReportSourceStudentId(observation) !== scope.studentId || !recordBelongsToClassroomScope(observation, scope) ||
      observation.civilDate < scope.periodStart || observation.civilDate > scope.periodEnd) continue;
    try { availableEvidence.push(developmentReportEvidence(snapshot, scope, observation.id)); }
    catch { unavailableEvidenceCount += 1; }
  }
  availableEvidence.sort((a, b) => a.civilDate.localeCompare(b.civilDate) || a.observationId.localeCompare(b.observationId));
  const reports = snapshot.settings.filter((row): row is DevelopmentReportRecord => live(row) && row.settingType === DEVELOPMENT_REPORT_SETTING_TYPE &&
    isDevelopmentReportRecord(row) && row.studentId === scope.studentId && recordBelongsToClassroomScope(row, scope))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { ...identity, availableEvidence, unavailableEvidenceCount, reports: structuredClone(reports) };
}

/** Historical snapshots remain backed up after source edits; export remains closed. */
export function developmentReportSourcesMatch(snapshot: DataSnapshot, report: DevelopmentReportRecord): boolean {
  try {
    if (!snapshot.students.some((row) => row.id === report.studentId && live(row)) ||
      !snapshot.classrooms.some((row) => row.id === report.classroomId && live(row)) ||
      !snapshot.academicYears.some((row) => row.id === report.academicYearId && live(row))) return false;
    const identity = assertDevelopmentReportScope(snapshot, report);
    return canonicalJson(identity.studentSnapshot) === canonicalJson(report.studentSnapshot) &&
      canonicalJson(identity.scopeSnapshot) === canonicalJson(report.scopeSnapshot) &&
      canonicalJson(report.selectedObservationIds.map((id) => developmentReportEvidence(snapshot, report, id))) === canonicalJson(report.evidenceSnapshots);
  } catch { return false; }
}

/** Preserve stale content, but reject foreign-child references even on restore. */
export function assertDevelopmentReportRelationships(snapshot: DataSnapshot, report: DevelopmentReportRecord): void {
  assertDevelopmentReportScope(snapshot, report);
  const student = snapshot.students.find((row) => row.id === report.studentId)!;
  const year = snapshot.academicYears.find((row) => row.id === report.academicYearId)!;
  for (const evidence of report.evidenceSnapshots) {
    const source = snapshot.observations.find((row) => row.id === evidence.observationId);
    if (!source || developmentReportSourceStudentId(source) !== report.studentId || !recordBelongsToClassroomScope(source, report) ||
      source.civilDate < report.periodStart || source.civilDate > report.periodEnd ||
      !membershipContains(student, report, source.civilDate, year)) {
      throw new Error("Rapor kaynağı başka çocuğa, sınıfa veya döneme ait; geri yükleme durduruldu.");
    }
    const selection = evidence.sourceObservation.developmentSelection;
    if (canonicalJson(selection ?? null) !== canonicalJson(evidence.developmentSelection ?? null)) {
      throw new Error("Rapor kaynak gözleminin destek seçimi değişmiş.");
    }
    const supportLabel = evidence.developmentSelection?.support
      ? DEVELOPMENT_OBSERVATION_SUPPORT_OPTIONS.find((item) => item.id === evidence.developmentSelection?.support)?.label : undefined;
    if (evidence.supportLabel !== supportLabel) throw new Error("Rapor destek açıklaması kanonik seçimle uyuşmuyor.");
    const targetIds = new Set<string>();
    for (const [index, link] of evidence.confirmedLinks.entries()) {
      if (targetIds.has(link.id)) throw new Error("Rapor aynı program bağını yineliyor.");
      targetIds.add(link.id);
      // Validate frozen targets as frozen targets; later live changes only mark stale.
      const target = teacherConfirmedTarget(link, evidence.contextSnapshot.plannedTargets,
        evidence.contextSnapshot.curriculumProfile as unknown as CurriculumProfileSnapshot,
        evidence.sourceObservation, snapshot);
      if (!target || canonicalJson(target) !== canonicalJson(evidence.confirmedTargets[index])) {
        throw new Error("Rapor kaynaklı program hedefi snapshot ile uyuşmuyor.");
      }
      assertCanonicalReportTarget(target);
    }
    if (selection && evidence.confirmedLinks.filter((link) => link.developmentSelection !== undefined).length !== 1) {
      throw new Error("Rapor gelişim gözleminin onaylı kaynak bağı eksik.");
    }
  }
}

function assertCanonicalReportTarget(target: CurriculumTargetSnapshot): void {
  if (target.referenceOrigin === "teacher-declared" && target.officialCatalogVerified === false) return;
  const canonical = curriculumTargetsForProfile(target as unknown as CurriculumProfileSnapshot).find((entry) => entry.id === target.id);
  const { holisticGraphReference: _graph, ...plainTarget } = target;
  if (!canonical || canonicalJson(plainTarget) !== canonicalJson(canonical)) {
    throw new Error("Rapor resmî program hedefi kanonik kaynakla uyuşmuyor.");
  }
}
