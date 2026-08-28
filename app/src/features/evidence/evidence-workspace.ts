import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import { isLocalTime } from "../../core/domain/classroom.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import {
  isQuickObservationCategory,
  isQuickObservationType,
  type QuickObservationCategory,
  type QuickObservationType,
} from "../../core/domain/quick-observation.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type {
  CurriculumAssignmentMode,
  CurriculumTargetSnapshot,
} from "../curriculum/curriculum-catalog.ts";
import type { PremiumPackAccessReference } from "../premium-access/entitlement.ts";
import {
  normalizeCurriculumProfile,
  type CurriculumFramework,
  type CurriculumProfileInput,
  type CurriculumProfileSnapshot,
} from "./evidence-flow.ts";
import {
  deriveObservationWorkflowStatus,
  isTeacherConfirmedObservationLink,
  observationAssessmentDraftIds,
  type ObservationWorkflowStatus,
} from "./observation-workflow-status.ts";
import { isAuthenticSpontaneousObservationActivity } from "./spontaneous-observation-integrity.ts";

export type EvidenceActivityStatus = "planned" | "in_progress" | "completed";

export interface EvidenceActivitySummary {
  id: string;
  planId: string;
  title: string;
  startTime: string;
  endTime?: string;
  status: EvidenceActivityStatus;
  civilDate: string;
  curriculumProfile: CurriculumProfileSnapshot;
  curriculumTargets: CurriculumTargetSnapshot[];
  assignedStudentIds: string[];
  assignmentMode: CurriculumAssignmentMode | "legacy-unscoped";
  contextKind: "planned-activity" | "spontaneous-observation";
  premiumProvenance?: EvidencePremiumProvenance;
}

export type EvidencePremiumProvenance =
  | { status: "verified"; pack: PremiumPackAccessReference }
  | { status: "invalid"; pack: null };

export interface EvidenceObservationSummary {
  id: string;
  studentId: string;
  studentName: string;
  planId: string;
  activityId: string;
  activityTitle: string;
  rawText: string;
  context?: string;
  childQuote?: string;
  observationType: QuickObservationType;
  observationCategories: QuickObservationCategory[];
  observedAt: string;
  civilDate: string;
  curriculumProfile: CurriculumProfileSnapshot;
  plannedCurriculumTargets: CurriculumTargetSnapshot[];
  confirmedCurriculumLinkIds: string[];
  confirmedCurriculumTargets: CurriculumTargetSnapshot[];
  assessmentDraftIds: string[];
  workflowStatus: ObservationWorkflowStatus;
  premiumProvenance?: EvidencePremiumProvenance;
}

export interface EvidenceWorkspace {
  civilDate: string;
  activities: EvidenceActivitySummary[];
  pendingObservations: EvidenceObservationSummary[];
  linkedObservations: EvidenceObservationSummary[];
}

function profileFromRecord(record: StoredRecord | undefined): CurriculumProfileSnapshot | null {
  const candidate = record?.curriculumProfileSnapshot;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    Array.isArray(candidate)
  ) {
    return null;
  }

  try {
    return normalizeCurriculumProfile(candidate as unknown as CurriculumProfileInput);
  } catch {
    return null;
  }
}

function premiumPackReference(value: unknown): PremiumPackAccessReference | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = [
    "sku",
    "contentReleaseId",
    "id",
    "version",
    "manifestDigest",
    "academicRelease",
  ] as const;
  if (keys.some((key) => typeof record[key] !== "string" || !record[key].trim())) {
    return null;
  }
  return {
    sku: record.sku as string,
    contentReleaseId: record.contentReleaseId as string,
    id: record.id as string,
    version: record.version as string,
    manifestDigest: record.manifestDigest as string,
    academicRelease: record.academicRelease as string,
  };
}

function samePremiumPack(
  left: PremiumPackAccessReference,
  right: PremiumPackAccessReference,
): boolean {
  return left.sku === right.sku &&
    left.contentReleaseId === right.contentReleaseId &&
    left.id === right.id &&
    left.version === right.version &&
    left.manifestDigest === right.manifestDigest &&
    left.academicRelease === right.academicRelease;
}

function premiumProvenanceFromRecords(
  plan: StoredRecord,
  activity: StoredRecord,
): EvidencePremiumProvenance | undefined {
  const hasPremiumMarkers =
    plan.sourceContentPackSnapshot !== undefined ||
    plan.premiumDailyFlowSnapshot !== undefined ||
    activity.sourceContentPackSnapshot !== undefined;
  if (!hasPremiumMarkers) return undefined;
  const planPack = premiumPackReference(plan.sourceContentPackSnapshot);
  const activityPack = premiumPackReference(activity.sourceContentPackSnapshot);
  return planPack && activityPack && samePremiumPack(planPack, activityPack)
    ? { status: "verified", pack: planPack }
    : { status: "invalid", pack: null };
}

function activitySummary(
  activity: StoredRecord,
  plansById: ReadonlyMap<string, StoredRecord>,
  scopedPlans: readonly StoredRecord[],
  scope: ActiveClassroomScope,
): EvidenceActivitySummary | null {
  const planId = typeof activity.planId === "string" ? activity.planId : "";
  const title = typeof activity.title === "string" ? activity.title.trim() : "";
  const status = activity.status;
  const civilDate = typeof activity.civilDate === "string" ? activity.civilDate : "";
  if (
    !planId ||
    !title ||
    !isCivilDate(civilDate) ||
    !isLocalTime(activity.startTime) ||
    (activity.endTime !== undefined && !isLocalTime(activity.endTime)) ||
    (status !== "planned" && status !== "in_progress" && status !== "completed")
  ) {
    return null;
  }

  const plan = plansById.get(planId);
  const curriculumProfile = profileFromRecord(plan) ?? profileFromRecord(activity);
  if (!plan || !curriculumProfile) return null;
  const curriculumTargets = Array.isArray(activity.curriculumTargets)
    ? activity.curriculumTargets.filter(
        (target): target is CurriculumTargetSnapshot =>
          typeof target === "object" &&
          target !== null &&
          !Array.isArray(target) &&
          typeof target.id === "string" &&
          typeof target.referenceCode === "string" &&
          typeof target.referenceTitle === "string" &&
          target.framework === curriculumProfile.framework,
      )
    : [];
  const assignedStudentIds = Array.isArray(activity.studentIds)
    ? activity.studentIds.filter(
        (studentId): studentId is string => typeof studentId === "string",
      )
    : [];
  const assignmentMode =
    activity.assignmentMode === "whole-class" ||
    activity.assignmentMode === "selected-students"
      ? activity.assignmentMode
      : "legacy-unscoped";
  const premiumProvenance = premiumProvenanceFromRecords(plan, activity);
  const contextKind = isAuthenticSpontaneousObservationActivity(
    activity,
    scopedPlans,
    scope,
    civilDate,
  )
    ? "spontaneous-observation"
    : "planned-activity";

  return {
    id: activity.id,
    planId,
    title,
    startTime: activity.startTime,
    ...(typeof activity.endTime === "string" ? { endTime: activity.endTime } : {}),
    status,
    civilDate,
    curriculumProfile,
    curriculumTargets,
    assignedStudentIds,
    assignmentMode,
    contextKind,
    ...(premiumProvenance ? { premiumProvenance } : {}),
  };
}

function teacherConfirmedLinks(
  links: readonly StoredRecord[],
  observationId: string,
): StoredRecord[] {
  return links
    .filter((link) => isTeacherConfirmedObservationLink(link, observationId))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function teacherConfirmedTarget(
  link: StoredRecord,
  plannedTargets: readonly CurriculumTargetSnapshot[],
  profile: CurriculumProfileSnapshot,
  observationCivilDate: string,
): CurriculumTargetSnapshot | null {
  const plannedTarget = plannedTargets.find(
    (target) =>
      (target.id === link.plannedTargetId ||
        (target.referenceCode === link.referenceCode &&
          target.referenceTitle === link.referenceTitle)) &&
      target.framework === link.framework &&
      target.catalogId === link.catalogId &&
      target.sourceVersion === link.sourceVersion &&
      target.referenceOrigin === link.referenceOrigin &&
      target.officialCatalogVerified === link.officialCatalogVerified,
  );
  if (plannedTarget) return plannedTarget;

  if (
    link.referenceOrigin !== "teacher-declared" ||
    link.officialCatalogVerified === true ||
    typeof link.referenceCode !== "string" ||
    !link.referenceCode.trim() ||
    typeof link.referenceTitle !== "string" ||
    !link.referenceTitle.trim()
  ) {
    return null;
  }

  return {
    id: link.id,
    framework: profile.framework,
    catalogId: profile.catalogId,
    sourceVersion: profile.sourceVersion,
    referenceCode: link.referenceCode.trim(),
    referenceTitle: link.referenceTitle.trim(),
    kind: "learning-outcome",
    domain: "Öğretmen beyanı",
    sourceUrl: "about:blank",
    sourceLabel: "Öğretmen beyanı · resmî katalogda doğrulanmadı",
    sourceCheckedOn: isCivilDate(link.civilDate)
      ? link.civilDate
      : observationCivilDate,
    catalogCompleteness: "partial",
    verificationStatus: "teacher-declared-unverified",
    referenceOrigin: "teacher-declared",
    officialCatalogVerified: false,
  };
}

export function resolveEvidenceWorkspace(
  snapshot: DataSnapshot,
  now = new Date(),
): EvidenceWorkspace {
  const civilDate = civilDateInIstanbul(now);
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    return {
      civilDate,
      activities: [],
      pendingObservations: [],
      linkedObservations: [],
    };
  }

  const scopedPlans = snapshot.plans.filter(
    (record) =>
      typeof record.deletedAt !== "string" &&
      recordBelongsToClassroomScope(record, scope),
  );
  const plansById = new Map(scopedPlans.map((record) => [record.id, record]));
  const allActivities = snapshot.activities
    .filter(
      (record) =>
        typeof record.deletedAt !== "string" &&
        recordBelongsToClassroomScope(record, scope),
    )
    .map((record) => activitySummary(record, plansById, scopedPlans, scope))
    .filter((record): record is EvidenceActivitySummary => record !== null);
  const activitiesById = new Map(allActivities.map((record) => [record.id, record]));
  const scopedStudents = snapshot.students.filter(
    (record) =>
      typeof record.deletedAt !== "string" &&
      recordBelongsToClassroomScope(record, scope),
  );
  const studentsById = new Map(scopedStudents.map((record) => [record.id, record]));
  const scopedLinks = snapshot.evidenceCurriculumLinks.filter(
    (record) =>
      typeof record.deletedAt !== "string" &&
      recordBelongsToClassroomScope(record, scope),
  );
  const scopedAssessmentDrafts = snapshot.reportDrafts.filter(
    (record) =>
      typeof record.deletedAt !== "string" &&
      recordBelongsToClassroomScope(record, scope),
  );

  const observations = snapshot.observations
    .filter(
      (record) =>
        typeof record.deletedAt !== "string" &&
        record.rawTextImmutable === true &&
        typeof record.rawText === "string" &&
        record.rawText.trim().length > 0 &&
        typeof record.planId === "string" &&
        typeof record.activityId === "string" &&
        typeof record.observedAt === "string" &&
        isCivilDate(record.civilDate) &&
        Array.isArray(record.studentIds) &&
        record.studentIds.length === 1 &&
        typeof record.studentIds[0] === "string" &&
        recordBelongsToClassroomScope(record, scope),
    )
    .map((record): EvidenceObservationSummary | null => {
      const studentIds = Array.isArray(record.studentIds) ? record.studentIds : [];
      const studentId = studentIds[0];
      const rawText = record.rawText;
      if (typeof studentId !== "string" || typeof rawText !== "string") return null;
      const student = studentsById.get(studentId);
      const activity = activitiesById.get(record.activityId as string);
      if (!student || !activity || activity.planId !== record.planId) return null;
      const studentName =
        typeof student.displayName === "string" && student.displayName.trim()
          ? student.displayName.trim()
          : "Çocuk";
      const confirmedLinks = teacherConfirmedLinks(scopedLinks, record.id);
      const assessmentDraftIds = observationAssessmentDraftIds(
        scopedAssessmentDrafts,
        record.id,
      );
      return {
        id: record.id,
        studentId,
        studentName,
        planId: activity.planId,
        activityId: activity.id,
        activityTitle: activity.title,
        rawText,
        ...(typeof record.context === "string" ? { context: record.context } : {}),
        ...(typeof record.childQuote === "string"
          ? { childQuote: record.childQuote }
          : {}),
        observationType: isQuickObservationType(record.observationType)
          ? record.observationType
          : "quick-note",
        observationCategories: Array.isArray(record.observationCategories)
          ? record.observationCategories.filter(isQuickObservationCategory)
          : [],
        observedAt: record.observedAt as string,
        civilDate: record.civilDate,
        curriculumProfile: activity.curriculumProfile,
        plannedCurriculumTargets: activity.curriculumTargets,
        confirmedCurriculumLinkIds: confirmedLinks.map((link) => link.id),
        confirmedCurriculumTargets: confirmedLinks
          .map((link) =>
            teacherConfirmedTarget(
              link,
              activity.curriculumTargets,
              activity.curriculumProfile,
              record.civilDate,
            ),
          )
          .filter((target): target is CurriculumTargetSnapshot => target !== null),
        assessmentDraftIds,
        workflowStatus: deriveObservationWorkflowStatus({
          observationId: record.id,
          curriculumLinks: confirmedLinks,
          reportDrafts: scopedAssessmentDrafts,
        }),
        ...(activity.premiumProvenance
          ? { premiumProvenance: activity.premiumProvenance }
          : {}),
      };
    })
    .filter((record): record is EvidenceObservationSummary => record !== null)
    .sort(
      (left, right) =>
        right.observedAt.localeCompare(left.observedAt) ||
        right.id.localeCompare(left.id),
    );

  return {
    civilDate,
    activities: allActivities
      .filter((record) => record.civilDate === civilDate)
      .sort(
        (left, right) =>
          left.startTime.localeCompare(right.startTime) ||
          left.id.localeCompare(right.id),
      ),
    pendingObservations: observations.filter(
      (record) => record.confirmedCurriculumLinkIds.length === 0,
    ),
    linkedObservations: observations.filter(
      (record) => record.confirmedCurriculumLinkIds.length > 0,
    ),
  };
}

export async function loadEvidenceWorkspace(
  store: LocalDataStore,
  options: { now?: Date } = {},
): Promise<EvidenceWorkspace> {
  return resolveEvidenceWorkspace(
    await store.readSnapshot(),
    options.now ?? new Date(),
  );
}

export function curriculumFrameworkForProgram(
  program: string | undefined,
): CurriculumFramework {
  const normalized = program?.toLocaleLowerCase("tr-TR") ?? "";
  return normalized.includes("eçe") ||
    (
      normalized.includes("okul öncesi eğitim programı") &&
      !normalized.includes("türkiye yüzyılı")
    )
    ? "meb_2024"
    : "tymm";
}
