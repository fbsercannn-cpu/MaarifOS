import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import { createEmptySnapshot, type DataSnapshot, type StoredRecord } from "../../core/domain/model.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";
import {
  isUuid,
  resolveLocalTeacherIdentity,
} from "../evidence/local-teacher-identity.ts";

export const ANECDOTE_FORM_REPORT_TYPE = "meb-2024-anecdote-form" as const;
export const ANECDOTE_FORM_LEGACY_SCHEMA_VERSION = 1 as const;
export const ANECDOTE_FORM_SCHEMA_VERSION = 2 as const;
export const ANECDOTE_FORM_OFFICIAL_TITLE = "EK 3: ANEKDOT KAYIT FORMU" as const;
export const ANECDOTE_FORM_OFFICIAL_SOURCE =
  "MEB 2024 Okul Öncesi Eğitim Programı" as const;
export const ANECDOTE_FORM_OFFICIAL_SOURCE_VERSION = "2024" as const;
export const ANECDOTE_FORM_OFFICIAL_SOURCE_URL =
  "https://mus.meb.gov.tr/meb_iys_dosyalar/2024_06/23141641_okuloncesiogretimprogrami.pdf" as const;

export type AnecdoteLocationSource =
  | "teacher"
  | "activity"
  | "plan"
  | "not-set";

export interface AnecdoteApprovedProgramSource {
  framework: string;
  catalogId: string;
  sourceVersion: string;
}

export interface AnecdoteObservationApprovalSnapshot {
  observationId: string;
  rawText: string;
  observedAt: string;
  civilDate: string;
  studentId: string;
  activityId: string;
  planId: string;
}

export interface AnecdoteCurriculumLinkApprovalSnapshot {
  id: string;
  referenceCode: string;
  referenceTitle: string;
  framework: string;
  catalogId: string;
  sourceVersion: string;
  confirmedAt: string;
  approvedByUserId: string;
  referenceOrigin: "teacher-declared" | "official-catalog";
  officialCatalogVerified: boolean;
}

export interface AnecdoteApprovalSeal {
  schemaVersion: 1;
  observation: AnecdoteObservationApprovalSnapshot;
  curriculumLinks: AnecdoteCurriculumLinkApprovalSnapshot[];
}

export interface AnecdoteFormEditableSections {
  observedLocation: string;
  observedLocationSource: AnecdoteLocationSource;
  observerGeneralAssessment: string;
  generalEvaluationSourceDraftId: string | null;
  approvedCurriculumLinkIds: string[];
  approvedProgramSources: AnecdoteApprovedProgramSource[];
}

export interface AnecdoteFormDraftRecord extends StoredRecord {
  reportType: typeof ANECDOTE_FORM_REPORT_TYPE;
  scope: "single-student";
  studentIds: [string];
  periodStart: string;
  periodEnd: string;
  selectedObservationIds: [string];
  selectedMediaIds: [];
  editableSections: AnecdoteFormEditableSections;
  status: "draft" | "ready";
  authoredBy: "teacher";
  teacherReviewRequired: true;
  reviewStatus: "pending" | "approved";
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  approvalSeal?: AnecdoteApprovalSeal | null;
  generationMode: "teacher-authored-official-form";
  referenceVerificationStatus:
    | "official-catalog-verified"
    | "teacher-declared-unverified";
  academicYearId: string;
  classroomId: string;
  schemaVersion:
    | typeof ANECDOTE_FORM_LEGACY_SCHEMA_VERSION
    | typeof ANECDOTE_FORM_SCHEMA_VERSION;
}

export interface AnecdoteObservedSkill {
  linkId: string;
  framework: string;
  catalogId: string;
  sourceVersion: string;
  referenceCode: string;
  referenceTitle: string;
  confirmedAt: string;
  approvedByUserId: string;
  referenceOrigin: "teacher-declared" | "official-catalog";
  officialCatalogVerified: boolean;
}

export type AnecdoteFormMissingField =
  | "child-name"
  | "date"
  | "observed-location"
  | "observed-situation"
  | "observed-skills"
  | "observer-general-assessment"
  | "teacher-review";

export type AnecdoteFormWorkflowStatus =
  | "incomplete"
  | "review-required"
  | "ready";

export interface AnecdoteFormReadModel {
  draftId: string | null;
  observationId: string;
  studentId: string;
  childFullName: string;
  civilDate: string;
  observedAt: string;
  activityId: string;
  planId: string;
  activityTitle: string;
  observedLocation: string;
  observedLocationSource: AnecdoteLocationSource;
  observedSituation: string;
  observedSkills: AnecdoteObservedSkill[];
  observerGeneralAssessment: string;
  generalEvaluationSourceDraftId: string | null;
  workflowStatus: AnecdoteFormWorkflowStatus;
  missingFields: AnecdoteFormMissingField[];
  reviewStatus: "not-started" | "pending" | "approved";
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  academicYearId: string;
  classroomId: string;
  programSourceVersions: string[];
  formSource: {
    title: typeof ANECDOTE_FORM_OFFICIAL_TITLE;
    sourceLabel: typeof ANECDOTE_FORM_OFFICIAL_SOURCE;
    sourceVersion: typeof ANECDOTE_FORM_OFFICIAL_SOURCE_VERSION;
    sourceUrl: typeof ANECDOTE_FORM_OFFICIAL_SOURCE_URL;
  };
}

export interface AnecdoteFormWorkspace {
  forms: AnecdoteFormReadModel[];
  incompleteCount: number;
  reviewRequiredCount: number;
  readyCount: number;
}

interface AnecdoteContext {
  scope: ActiveClassroomScope;
  observation: StoredRecord;
  student: StoredRecord;
  activity: StoredRecord;
  plan: StoredRecord;
}

interface DerivedLocation {
  text: string;
  source: Exclude<AnecdoteLocationSource, "teacher" | "not-set">;
}

const MAX_LOCATION_LENGTH = 300;
const MAX_GENERAL_ASSESSMENT_LENGTH = 10_000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const canonicalExpected = [...expected].sort();
  return (
    actual.length === canonicalExpected.length &&
    actual.every((key, index) => key === canonicalExpected[index])
  );
}

function approvalLinkSnapshot(
  value: unknown,
): AnecdoteCurriculumLinkApprovalSnapshot {
  if (!isObject(value)) {
    throw new Error("Anekdot onayÄ± iÃ§in geÃ§erli program baÄŸÄ± gerekli.");
  }
  const id = typeof value.linkId === "string" ? value.linkId : value.id;
  if (
    !isUuid(id) ||
    typeof value.referenceCode !== "string" ||
    value.referenceCode.trim().length === 0 ||
    typeof value.referenceTitle !== "string" ||
    value.referenceTitle.trim().length === 0 ||
    typeof value.framework !== "string" ||
    value.framework.trim().length === 0 ||
    typeof value.catalogId !== "string" ||
    value.catalogId.trim().length === 0 ||
    typeof value.sourceVersion !== "string" ||
    value.sourceVersion.trim().length === 0 ||
    !isUtcIso(value.confirmedAt) ||
    !isUuid(value.approvedByUserId) ||
    (value.referenceOrigin !== "teacher-declared" &&
      value.referenceOrigin !== "official-catalog") ||
    typeof value.officialCatalogVerified !== "boolean"
  ) {
    throw new Error("Anekdot onayÄ± iÃ§in program baÄŸÄ± iÃ§eriÄŸi geÃ§ersiz.");
  }
  return {
    id,
    referenceCode: value.referenceCode,
    referenceTitle: value.referenceTitle,
    framework: value.framework,
    catalogId: value.catalogId,
    sourceVersion: value.sourceVersion,
    confirmedAt: value.confirmedAt,
    approvedByUserId: value.approvedByUserId,
    referenceOrigin: value.referenceOrigin,
    officialCatalogVerified: value.officialCatalogVerified,
  };
}

function compareApprovalLinks(
  left: AnecdoteCurriculumLinkApprovalSnapshot,
  right: AnecdoteCurriculumLinkApprovalSnapshot,
): number {
  return (
    left.referenceCode.localeCompare(right.referenceCode, "tr-TR") ||
    left.id.localeCompare(right.id)
  );
}

export function createAnecdoteApprovalSeal(
  observation: StoredRecord,
  curriculumLinks: readonly unknown[],
): AnecdoteApprovalSeal {
  const studentIds = observation.studentIds;
  if (
    !isUuid(observation.id) ||
    typeof observation.rawText !== "string" ||
    observation.rawText.trim().length === 0 ||
    !isUtcIso(observation.observedAt) ||
    !isCivilDate(observation.civilDate) ||
    !Array.isArray(studentIds) ||
    studentIds.length !== 1 ||
    !isUuid(studentIds[0]) ||
    !isUuid(observation.activityId) ||
    !isUuid(observation.planId)
  ) {
    throw new Error("Anekdot onayÄ± iÃ§in gÃ¶zlem snapshot'Ä± geÃ§ersiz.");
  }
  const sealedLinks = curriculumLinks.map(approvalLinkSnapshot).sort(compareApprovalLinks);
  if (
    sealedLinks.length === 0 ||
    new Set(sealedLinks.map((link) => link.id)).size !== sealedLinks.length
  ) {
    throw new Error("Anekdot onayÄ± en az bir benzersiz program baÄŸÄ± gerektirir.");
  }
  return {
    schemaVersion: 1,
    observation: {
      observationId: observation.id,
      rawText: observation.rawText,
      observedAt: observation.observedAt,
      civilDate: observation.civilDate,
      studentId: studentIds[0],
      activityId: observation.activityId,
      planId: observation.planId,
    },
    curriculumLinks: sealedLinks,
  };
}

export function isAnecdoteApprovalSeal(
  value: unknown,
): value is AnecdoteApprovalSeal {
  if (
    !isObject(value) ||
    !hasExactKeys(value, ["curriculumLinks", "observation", "schemaVersion"]) ||
    value.schemaVersion !== 1 ||
    !isObject(value.observation) ||
    !hasExactKeys(value.observation, [
      "activityId",
      "civilDate",
      "observationId",
      "observedAt",
      "planId",
      "rawText",
      "studentId",
    ]) ||
    !isUuid(value.observation.observationId) ||
    typeof value.observation.rawText !== "string" ||
    value.observation.rawText.trim().length === 0 ||
    !isUtcIso(value.observation.observedAt) ||
    !isCivilDate(value.observation.civilDate) ||
    !isUuid(value.observation.studentId) ||
    !isUuid(value.observation.activityId) ||
    !isUuid(value.observation.planId) ||
    !Array.isArray(value.curriculumLinks) ||
    value.curriculumLinks.length === 0
  ) {
    return false;
  }
  const links: AnecdoteCurriculumLinkApprovalSnapshot[] = [];
  for (const candidate of value.curriculumLinks) {
    if (
      !isObject(candidate) ||
      !hasExactKeys(candidate, [
        "approvedByUserId",
        "catalogId",
        "confirmedAt",
        "framework",
        "id",
        "officialCatalogVerified",
        "referenceCode",
        "referenceOrigin",
        "referenceTitle",
        "sourceVersion",
      ])
    ) {
      return false;
    }
    try {
      links.push(approvalLinkSnapshot(candidate));
    } catch {
      return false;
    }
  }
  if (new Set(links.map((link) => link.id)).size !== links.length) return false;
  const canonical = [...links].sort(compareApprovalLinks);
  return links.every(
    (link, index) =>
      link.id === canonical[index]?.id &&
      link.referenceCode === canonical[index]?.referenceCode,
  );
}

function sameApprovalSeal(
  left: AnecdoteApprovalSeal,
  right: AnecdoteApprovalSeal,
): boolean {
  const observationKeys = [
    "observationId",
    "rawText",
    "observedAt",
    "civilDate",
    "studentId",
    "activityId",
    "planId",
  ] as const;
  const linkKeys = [
    "id",
    "referenceCode",
    "referenceTitle",
    "framework",
    "catalogId",
    "sourceVersion",
    "confirmedAt",
    "approvedByUserId",
    "referenceOrigin",
    "officialCatalogVerified",
  ] as const;
  return (
    observationKeys.every(
      (key) => left.observation[key] === right.observation[key],
    ) &&
    left.curriculumLinks.length === right.curriculumLinks.length &&
    left.curriculumLinks.every((link, index) =>
      linkKeys.every(
        (key) => link[key] === right.curriculumLinks[index]?.[key],
      ),
    )
  );
}

export function approvalSealMatchesCurrentSources(
  seal: unknown,
  observation: StoredRecord,
  curriculumLinks: readonly unknown[],
): boolean {
  if (!isAnecdoteApprovalSeal(seal)) return false;
  try {
    return sameApprovalSeal(
      seal,
      createAnecdoteApprovalSeal(observation, curriculumLinks),
    );
  } catch {
    return false;
  }
}

function normalizeText(value: unknown, maximumLength: number): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized.length <= maximumLength ? normalized : "";
}

function isAnecdoteLocationSource(
  value: unknown,
): value is AnecdoteLocationSource {
  return (
    value === "teacher" ||
    value === "activity" ||
    value === "plan" ||
    value === "not-set"
  );
}

function isApprovedProgramSource(
  value: unknown,
): value is AnecdoteApprovedProgramSource {
  return (
    isObject(value) &&
    typeof value.framework === "string" &&
    value.framework.trim().length > 0 &&
    typeof value.catalogId === "string" &&
    value.catalogId.trim().length > 0 &&
    typeof value.sourceVersion === "string" &&
    value.sourceVersion.trim().length > 0
  );
}

export function isAnecdoteFormDraftRecord(
  record: StoredRecord,
): record is AnecdoteFormDraftRecord {
  const sections = record.editableSections;
  if (!isObject(sections)) return false;
  const studentIds = record.studentIds;
  const selectedObservationIds = record.selectedObservationIds;
  const selectedMediaIds = record.selectedMediaIds;
  const approvedCurriculumLinkIds = sections.approvedCurriculumLinkIds;
  const approvedProgramSources = sections.approvedProgramSources;
  return (
    record.reportType === ANECDOTE_FORM_REPORT_TYPE &&
    (record.schemaVersion === ANECDOTE_FORM_LEGACY_SCHEMA_VERSION ||
      record.schemaVersion === ANECDOTE_FORM_SCHEMA_VERSION) &&
    record.scope === "single-student" &&
    Array.isArray(studentIds) &&
    studentIds.length === 1 &&
    isUuid(studentIds[0]) &&
    Array.isArray(selectedObservationIds) &&
    selectedObservationIds.length === 1 &&
    isUuid(selectedObservationIds[0]) &&
    Array.isArray(selectedMediaIds) &&
    selectedMediaIds.length === 0 &&
    isCivilDate(record.periodStart) &&
    isCivilDate(record.periodEnd) &&
    record.periodStart === record.periodEnd &&
    typeof sections.observedLocation === "string" &&
    sections.observedLocation.length <= MAX_LOCATION_LENGTH &&
    isAnecdoteLocationSource(sections.observedLocationSource) &&
    typeof sections.observerGeneralAssessment === "string" &&
    sections.observerGeneralAssessment.length <= MAX_GENERAL_ASSESSMENT_LENGTH &&
    (sections.generalEvaluationSourceDraftId === null ||
      isUuid(sections.generalEvaluationSourceDraftId)) &&
    Array.isArray(approvedCurriculumLinkIds) &&
    approvedCurriculumLinkIds.every(isUuid) &&
    new Set(approvedCurriculumLinkIds).size ===
      approvedCurriculumLinkIds.length &&
    Array.isArray(approvedProgramSources) &&
    approvedProgramSources.every(isApprovedProgramSource) &&
    record.status !== undefined &&
    (record.status === "draft" || record.status === "ready") &&
    record.authoredBy === "teacher" &&
    record.teacherReviewRequired === true &&
    (record.reviewStatus === "pending" || record.reviewStatus === "approved") &&
    (record.reviewedByUserId === null || isUuid(record.reviewedByUserId)) &&
    (record.reviewedAt === null || isUtcIso(record.reviewedAt)) &&
    (record.schemaVersion === ANECDOTE_FORM_LEGACY_SCHEMA_VERSION
      ? record.approvalSeal === undefined
      : record.approvalSeal === null ||
        isAnecdoteApprovalSeal(record.approvalSeal)) &&
    record.generationMode === "teacher-authored-official-form" &&
    (record.referenceVerificationStatus === "official-catalog-verified" ||
      record.referenceVerificationStatus === "teacher-declared-unverified") &&
    isUuid(record.academicYearId) &&
    isUuid(record.classroomId)
  );
}

function environmentLabel(value: unknown): string {
  if (value === "indoor") return "Sınıf içi öğrenme ortamı";
  if (value === "outdoor") return "Açık hava / okul bahçesi";
  if (value === "both") return "İç ve dış öğrenme ortamı";
  if (value === "community") return "Okul dışı / toplum öğrenme ortamı";
  return "";
}

function explicitLocationFromRecord(record: StoredRecord): string {
  const candidates = [
    record.observedLocation,
    record.location,
    record.learningEnvironment,
    record.learningCenterName,
    record.environmentArea,
  ];
  for (const candidate of candidates) {
    const text = normalizeText(candidate, MAX_LOCATION_LENGTH);
    if (text) return text;
  }
  const appliedSnapshot = isObject(record.appliedActivityTemplateSnapshot)
    ? record.appliedActivityTemplateSnapshot
    : null;
  const sourceSnapshot = isObject(record.sourceActivityTemplateSnapshot)
    ? record.sourceActivityTemplateSnapshot
    : null;
  return (
    environmentLabel(appliedSnapshot?.environment) ||
    environmentLabel(sourceSnapshot?.environment) ||
    environmentLabel(record.environment)
  );
}

export function deriveAnecdoteObservedLocation(
  activity: StoredRecord,
  plan: StoredRecord,
): DerivedLocation | null {
  const activityLocation = explicitLocationFromRecord(activity);
  if (activityLocation) return { text: activityLocation, source: "activity" };
  const planLocation = explicitLocationFromRecord(plan);
  if (planLocation) return { text: planLocation, source: "plan" };
  return null;
}

function contextForObservation(
  snapshot: DataSnapshot,
  observation: StoredRecord,
  requiredScope?: ActiveClassroomScope,
): AnecdoteContext | null {
  const scope = requiredScope ?? resolveActiveClassroomScope(snapshot);
  if (
    !scope ||
    observation.observationType !== "anecdotal" ||
    observation.rawTextImmutable !== true ||
    typeof observation.rawText !== "string" ||
    observation.rawText.trim().length === 0 ||
    !isCivilDate(observation.civilDate) ||
    !isUtcIso(observation.observedAt) ||
    !isUuid(observation.planId) ||
    !isUuid(observation.activityId) ||
    !Array.isArray(observation.studentIds) ||
    observation.studentIds.length !== 1 ||
    !isUuid(observation.studentIds[0]) ||
    typeof observation.deletedAt === "string" ||
    !recordBelongsToClassroomScope(observation, scope)
  ) {
    return null;
  }
  const observationStudentId = observation.studentIds[0] as string;
  const student = snapshot.students.find(
    (candidate) =>
      candidate.id === observationStudentId &&
      typeof candidate.deletedAt !== "string" &&
      recordBelongsToClassroomScope(candidate, scope),
  );
  const activity = snapshot.activities.find(
    (candidate) =>
      candidate.id === observation.activityId &&
      candidate.planId === observation.planId &&
      typeof candidate.deletedAt !== "string" &&
      recordBelongsToClassroomScope(candidate, scope),
  );
  const plan = snapshot.plans.find(
    (candidate) =>
      candidate.id === observation.planId &&
      typeof candidate.deletedAt !== "string" &&
      recordBelongsToClassroomScope(candidate, scope),
  );
  if (!student || !activity || !plan) return null;
  return { scope, observation, student, activity, plan };
}

function confirmedSkills(
  snapshot: DataSnapshot,
  observationId: string,
  scope: ActiveClassroomScope,
): AnecdoteObservedSkill[] {
  return snapshot.evidenceCurriculumLinks
    .filter(
      (link) =>
        link.observationId === observationId &&
        link.confirmationMethod === "teacher-confirmed" &&
        typeof link.deletedAt !== "string" &&
        recordBelongsToClassroomScope(link, scope) &&
        isUuid(link.id) &&
        typeof link.framework === "string" &&
        link.framework.trim().length > 0 &&
        typeof link.catalogId === "string" &&
        link.catalogId.trim().length > 0 &&
        typeof link.sourceVersion === "string" &&
        link.sourceVersion.trim().length > 0 &&
        typeof link.referenceCode === "string" &&
        link.referenceCode.trim().length > 0 &&
        typeof link.referenceTitle === "string" &&
        link.referenceTitle.trim().length > 0 &&
        isUtcIso(link.confirmedAt) &&
        isUuid(link.approvedByUserId) &&
        (link.referenceOrigin === "teacher-declared" ||
          link.referenceOrigin === "official-catalog") &&
        typeof link.officialCatalogVerified === "boolean",
    )
    .map((link) => ({
      linkId: link.id,
      framework: String(link.framework),
      catalogId: String(link.catalogId),
      sourceVersion: String(link.sourceVersion),
      referenceCode: String(link.referenceCode),
      referenceTitle: String(link.referenceTitle),
      confirmedAt: String(link.confirmedAt),
      approvedByUserId: String(link.approvedByUserId),
      referenceOrigin: link.referenceOrigin as AnecdoteObservedSkill["referenceOrigin"],
      officialCatalogVerified: link.officialCatalogVerified === true,
    }))
    .sort(
      (left, right) =>
        left.referenceCode.localeCompare(right.referenceCode, "tr-TR") ||
        left.linkId.localeCompare(right.linkId),
    );
}

function programSources(
  skills: readonly AnecdoteObservedSkill[],
): AnecdoteApprovedProgramSource[] {
  const unique = new Map<string, AnecdoteApprovedProgramSource>();
  for (const skill of skills) {
    const source = {
      framework: skill.framework,
      catalogId: skill.catalogId,
      sourceVersion: skill.sourceVersion,
    };
    unique.set(
      `${source.framework}\u0000${source.catalogId}\u0000${source.sourceVersion}`,
      source,
    );
  }
  return [...unique.values()].sort((left, right) =>
    `${left.framework}\u0000${left.catalogId}\u0000${left.sourceVersion}`.localeCompare(
      `${right.framework}\u0000${right.catalogId}\u0000${right.sourceVersion}`,
    ),
  );
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function sameProgramSources(
  left: readonly AnecdoteApprovedProgramSource[],
  right: readonly AnecdoteApprovedProgramSource[],
): boolean {
  const key = (source: AnecdoteApprovedProgramSource) =>
    `${source.framework}\u0000${source.catalogId}\u0000${source.sourceVersion}`;
  return sameStringSet(left.map(key), right.map(key));
}

function latestAssessmentDraft(
  snapshot: DataSnapshot,
  observationId: string,
  studentId: string,
): { id: string; text: string } | null {
  const candidate = snapshot.reportDrafts
    .filter(
      (record) =>
        record.reportType === "evidence-assessment" &&
        record.authoredBy === "teacher" &&
        typeof record.teacherAssessmentText === "string" &&
        record.teacherAssessmentText.trim().length > 0 &&
        Array.isArray(record.observationIds) &&
        record.observationIds.includes(observationId) &&
        Array.isArray(record.studentIds) &&
        record.studentIds.length === 1 &&
        record.studentIds[0] === studentId &&
        typeof record.deletedAt !== "string",
    )
    .sort(
      (left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        right.id.localeCompare(left.id),
    )[0];
  return candidate
    ? { id: candidate.id, text: String(candidate.teacherAssessmentText).trim() }
    : null;
}

function anecdoteDraftForObservation(
  snapshot: DataSnapshot,
  observationId: string,
): AnecdoteFormDraftRecord | null {
  const matches = snapshot.reportDrafts.filter(
    (record) =>
      record.reportType === ANECDOTE_FORM_REPORT_TYPE &&
      Array.isArray(record.selectedObservationIds) &&
      record.selectedObservationIds[0] === observationId &&
      typeof record.deletedAt !== "string",
  );
  if (matches.length > 1) {
    throw new Error(
      "Aynı gözlem için birden fazla etkin anekdot formu bulundu; kayıtlar silinmeden mükerrer incelemesi gerekir.",
    );
  }
  const candidate = matches[0];
  return candidate && isAnecdoteFormDraftRecord(candidate) ? candidate : null;
}

function readModelForContext(
  snapshot: DataSnapshot,
  context: AnecdoteContext,
): AnecdoteFormReadModel {
  const { observation, student, activity, plan, scope } = context;
  const draft = anecdoteDraftForObservation(snapshot, observation.id);
  const derivedLocation = deriveAnecdoteObservedLocation(activity, plan);
  const observationStudentId = (observation.studentIds as string[])[0]!;
  const assessmentDraft = latestAssessmentDraft(
    snapshot,
    observation.id,
    observationStudentId,
  );
  const sections = draft?.editableSections;
  const observedLocation =
    normalizeText(sections?.observedLocation, MAX_LOCATION_LENGTH) ||
    derivedLocation?.text ||
    "";
  const observedLocationSource = observedLocation
    ? sections?.observedLocation
      ? sections.observedLocationSource
      : derivedLocation?.source ?? "not-set"
    : "not-set";
  const observerGeneralAssessment =
    normalizeText(
      sections?.observerGeneralAssessment,
      MAX_GENERAL_ASSESSMENT_LENGTH,
    ) || assessmentDraft?.text || "";
  const generalEvaluationSourceDraftId =
    sections?.generalEvaluationSourceDraftId ?? assessmentDraft?.id ?? null;
  const skills = confirmedSkills(snapshot, observation.id, scope);
  const missingFields: AnecdoteFormMissingField[] = [];
  const childFullName = normalizeText(student.displayName, 500);
  if (!childFullName) missingFields.push("child-name");
  if (!isCivilDate(observation.civilDate)) missingFields.push("date");
  if (!observedLocation) missingFields.push("observed-location");
  if (!String(observation.rawText).trim()) missingFields.push("observed-situation");
  if (skills.length === 0) missingFields.push("observed-skills");
  if (!observerGeneralAssessment) {
    missingFields.push("observer-general-assessment");
  }

  const currentLinkIds = skills.map((skill) => skill.linkId);
  const currentSources = programSources(skills);
  const approvalConsistent = Boolean(
    draft &&
      draft.status === "ready" &&
      draft.reviewStatus === "approved" &&
      isUuid(draft.reviewedByUserId) &&
      isUtcIso(draft.reviewedAt) &&
      draft.reviewedAt >= draft.updatedAt &&
      sameStringSet(
        draft.editableSections.approvedCurriculumLinkIds,
        currentLinkIds,
      ) &&
      sameProgramSources(
        draft.editableSections.approvedProgramSources,
        currentSources,
      ) &&
      approvalSealMatchesCurrentSources(
        draft.approvalSeal,
        observation,
        skills,
      ),
  );
  if (!approvalConsistent) missingFields.push("teacher-review");
  const substantiveMissingFields = missingFields.filter(
    (field) => field !== "teacher-review",
  );
  const workflowStatus: AnecdoteFormWorkflowStatus =
    substantiveMissingFields.length > 0
      ? "incomplete"
      : approvalConsistent
        ? "ready"
        : "review-required";

  return {
    draftId: draft?.id ?? null,
    observationId: observation.id,
    studentId: observationStudentId,
    childFullName,
    civilDate: observation.civilDate,
    observedAt: String(observation.observedAt),
    activityId: String(observation.activityId),
    planId: String(observation.planId),
    activityTitle: normalizeText(activity.title, 500) || "Etkinlik",
    observedLocation,
    observedLocationSource,
    observedSituation: String(observation.rawText),
    observedSkills: skills,
    observerGeneralAssessment,
    generalEvaluationSourceDraftId,
    workflowStatus,
    missingFields,
    reviewStatus: draft?.reviewStatus ?? "not-started",
    reviewedByUserId: draft?.reviewedByUserId ?? null,
    reviewedAt: draft?.reviewedAt ?? null,
    academicYearId: scope.academicYearId,
    classroomId: scope.classroomId,
    programSourceVersions: [
      ...new Set(skills.map((skill) => skill.sourceVersion)),
    ].sort((left, right) => left.localeCompare(right)),
    formSource: {
      title: ANECDOTE_FORM_OFFICIAL_TITLE,
      sourceLabel: ANECDOTE_FORM_OFFICIAL_SOURCE,
      sourceVersion: ANECDOTE_FORM_OFFICIAL_SOURCE_VERSION,
      sourceUrl: ANECDOTE_FORM_OFFICIAL_SOURCE_URL,
    },
  };
}

export function resolveAnecdoteFormWorkspace(
  snapshot: DataSnapshot,
): AnecdoteFormWorkspace {
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    return {
      forms: [],
      incompleteCount: 0,
      reviewRequiredCount: 0,
      readyCount: 0,
    };
  }
  const forms = snapshot.observations
    .map((observation) => contextForObservation(snapshot, observation, scope))
    .filter((context): context is AnecdoteContext => context !== null)
    .map((context) => readModelForContext(snapshot, context))
    .sort(
      (left, right) =>
        right.observedAt.localeCompare(left.observedAt) ||
        right.observationId.localeCompare(left.observationId),
    );
  return {
    forms,
    incompleteCount: forms.filter((form) => form.workflowStatus === "incomplete")
      .length,
    reviewRequiredCount: forms.filter(
      (form) => form.workflowStatus === "review-required",
    ).length,
    readyCount: forms.filter((form) => form.workflowStatus === "ready").length,
  };
}

export async function loadAnecdoteFormWorkspace(
  store: LocalDataStore,
): Promise<AnecdoteFormWorkspace> {
  return resolveAnecdoteFormWorkspace(await store.readSnapshot());
}

async function snapshotInTransaction(
  transaction: DataTransaction,
): Promise<DataSnapshot> {
  const snapshot = createEmptySnapshot();
  const collections = [
    "academicYears",
    "classrooms",
    "students",
    "observations",
    "activities",
    "plans",
    "evidenceCurriculumLinks",
    "reportDrafts",
    "settings",
  ] as const;
  const values = await Promise.all(
    collections.map((collection) => transaction.getAll(collection)),
  );
  snapshot.academicYears = values[0] as DataSnapshot["academicYears"];
  snapshot.classrooms = values[1] as DataSnapshot["classrooms"];
  snapshot.students = values[2] as DataSnapshot["students"];
  snapshot.observations = values[3] as DataSnapshot["observations"];
  snapshot.activities = values[4] as DataSnapshot["activities"];
  snapshot.plans = values[5] as DataSnapshot["plans"];
  snapshot.evidenceCurriculumLinks =
    values[6] as DataSnapshot["evidenceCurriculumLinks"];
  snapshot.reportDrafts = values[7] as DataSnapshot["reportDrafts"];
  snapshot.settings = values[8] as DataSnapshot["settings"];
  return snapshot;
}

function referenceVerificationStatus(
  skills: readonly AnecdoteObservedSkill[],
): AnecdoteFormDraftRecord["referenceVerificationStatus"] {
  return skills.length > 0 &&
    skills.every(
      (skill) =>
        skill.referenceOrigin === "official-catalog" &&
        skill.officialCatalogVerified,
    )
    ? "official-catalog-verified"
    : "teacher-declared-unverified";
}

export async function saveAnecdoteFormDraft(
  store: LocalDataStore,
  input: {
    observationId: string;
    observedLocation: string;
    observerGeneralAssessment: string;
    now?: Date;
  },
): Promise<AnecdoteFormDraftRecord> {
  if (!isUuid(input.observationId)) {
    throw new Error("Anekdot gözlem kimliği geçersiz.");
  }
  const observedLocation = normalizeText(
    input.observedLocation,
    MAX_LOCATION_LENGTH,
  );
  if (input.observedLocation.trim() && !observedLocation) {
    throw new Error(`Gözlenen mekân en fazla ${MAX_LOCATION_LENGTH} karakter olabilir.`);
  }
  const observerGeneralAssessment = normalizeText(
    input.observerGeneralAssessment,
    MAX_GENERAL_ASSESSMENT_LENGTH,
  );
  if (input.observerGeneralAssessment.trim() && !observerGeneralAssessment) {
    throw new Error(
      `Gözlemcinin genel değerlendirmesi en fazla ${MAX_GENERAL_ASSESSMENT_LENGTH.toLocaleString("tr-TR")} karakter olabilir.`,
    );
  }
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kayıt zamanı gerekli.");
  const timestamp = now.toISOString();
  let saved: AnecdoteFormDraftRecord | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "students",
      "observations",
      "activities",
      "plans",
      "evidenceCurriculumLinks",
      "reportDrafts",
      "settings",
    ],
    async (transaction) => {
      const snapshot = await snapshotInTransaction(transaction);
      const scope = resolveActiveClassroomScope(snapshot);
      const observation = snapshot.observations.find(
        (candidate) => candidate.id === input.observationId,
      );
      const context = observation
        ? contextForObservation(snapshot, observation, scope ?? undefined)
        : null;
      if (!context || !scope) {
        throw new Error(
          "Anekdot formu yalnız etkin sınıftaki değişmez anekdot gözleminden hazırlanabilir.",
        );
      }
      const existing = anecdoteDraftForObservation(snapshot, input.observationId);
      const existingSections = existing?.editableSections;
      const derivedLocation = deriveAnecdoteObservedLocation(
        context.activity,
        context.plan,
      );
      const locationSource: AnecdoteLocationSource = observedLocation
        ? existingSections?.observedLocation === observedLocation
          ? existingSections.observedLocationSource
          : derivedLocation?.text === observedLocation
            ? derivedLocation.source
            : "teacher"
        : "not-set";
      const assessmentDraft = latestAssessmentDraft(
        snapshot,
        input.observationId,
        context.student.id,
      );
      const skills = confirmedSkills(snapshot, input.observationId, scope);
      const draft: AnecdoteFormDraftRecord = {
        id: existing?.id ?? crypto.randomUUID(),
        reportType: ANECDOTE_FORM_REPORT_TYPE,
        scope: "single-student",
        studentIds: [context.student.id],
        periodStart: context.observation.civilDate,
        periodEnd: context.observation.civilDate,
        selectedObservationIds: [context.observation.id],
        selectedMediaIds: [],
        editableSections: {
          observedLocation,
          observedLocationSource: locationSource,
          observerGeneralAssessment,
          generalEvaluationSourceDraftId:
            existingSections?.generalEvaluationSourceDraftId ??
            (assessmentDraft?.text === observerGeneralAssessment
              ? assessmentDraft.id
              : null),
          approvedCurriculumLinkIds: [],
          approvedProgramSources: [],
        },
        status: "draft",
        authoredBy: "teacher",
        teacherReviewRequired: true,
        reviewStatus: "pending",
        reviewedByUserId: null,
        reviewedAt: null,
        approvalSeal: null,
        generationMode: "teacher-authored-official-form",
        referenceVerificationStatus: referenceVerificationStatus(skills),
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        civilDate: existing?.civilDate ?? civilDateInIstanbul(now),
        deletedAt: null,
        schemaVersion: ANECDOTE_FORM_SCHEMA_VERSION,
      };
      await transaction.putMany("reportDrafts", [draft]);
      saved = draft;
    },
  );
  if (!saved) throw new Error("Anekdot formu taslağı kaydedilemedi.");
  return saved;
}

export async function approveAnecdoteForm(
  store: LocalDataStore,
  input: { observationId: string; now?: Date },
): Promise<AnecdoteFormDraftRecord> {
  if (!isUuid(input.observationId)) {
    throw new Error("Anekdot gözlem kimliği geçersiz.");
  }
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir onay zamanı gerekli.");
  const timestamp = now.toISOString();
  let saved: AnecdoteFormDraftRecord | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "students",
      "observations",
      "activities",
      "plans",
      "evidenceCurriculumLinks",
      "reportDrafts",
      "settings",
    ],
    async (transaction) => {
      const snapshot = await snapshotInTransaction(transaction);
      const scope = resolveActiveClassroomScope(snapshot);
      const observation = snapshot.observations.find(
        (candidate) => candidate.id === input.observationId,
      );
      const context = observation
        ? contextForObservation(snapshot, observation, scope ?? undefined)
        : null;
      const existing = anecdoteDraftForObservation(snapshot, input.observationId);
      if (!scope || !context || !existing) {
        throw new Error("Onaylanacak anekdot formu taslağı bulunamadı.");
      }
      const model = readModelForContext(snapshot, context);
      const missingBeforeReview = model.missingFields.filter(
        (field) => field !== "teacher-review",
      );
      if (missingBeforeReview.length > 0) {
        throw new Error(
          `Anekdot formu onaylanmadan önce eksik alanlar tamamlanmalıdır: ${missingBeforeReview.join(", ")}.`,
        );
      }
      const teacherUserId = await resolveLocalTeacherIdentity(transaction, {
        now,
      });
      const next: AnecdoteFormDraftRecord = {
        ...existing,
        editableSections: {
          ...existing.editableSections,
          approvedCurriculumLinkIds: model.observedSkills.map(
            (skill) => skill.linkId,
          ),
          approvedProgramSources: programSources(model.observedSkills),
        },
        status: "ready",
        reviewStatus: "approved",
        reviewedByUserId: teacherUserId,
        reviewedAt: timestamp,
        approvalSeal: createAnecdoteApprovalSeal(
          context.observation,
          model.observedSkills,
        ),
        referenceVerificationStatus: referenceVerificationStatus(
          model.observedSkills,
        ),
        updatedAt: timestamp,
        schemaVersion: ANECDOTE_FORM_SCHEMA_VERSION,
      };
      await transaction.putMany("reportDrafts", [next]);
      saved = next;
    },
  );
  if (!saved) throw new Error("Anekdot formu onaylanamadı.");
  return saved;
}

export function assertAnecdoteFormReadyForExport(
  model: AnecdoteFormReadModel,
): void {
  if (model.workflowStatus !== "ready" || model.missingFields.length > 0) {
    throw new Error(
      "Anekdot formu eksik alan veya öğretmen onayı varken dışa aktarılamaz.",
    );
  }
  if (
    !model.childFullName.trim() ||
    !isCivilDate(model.civilDate) ||
    !model.observedLocation.trim() ||
    !model.observedSituation.trim() ||
    model.observedSkills.length === 0 ||
    !model.observerGeneralAssessment.trim()
  ) {
    throw new Error("Anekdot formunun resmî alanlarından biri eksik.");
  }
}
