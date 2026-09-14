import { civilDateInIstanbul, isCivilDate, resolveAttendanceRecords } from "../../core/domain/attendance.ts";
import { resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import { documentedSharingConsentSummary } from "../../core/domain/consent-trips.ts";
import { createTextPdfDocument } from "../documents/text-document-pdf.ts";
import { registerPdfPreviewRecipe, validatePdfSelection, type PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import type { SemanticTaggedPdfRuntime } from "../documents/semantic-tagged-pdf.ts";
import { buildAttendanceDayBreakdown } from "../attendance/attendance-day-breakdown.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { sha256Hex } from "../../core/backup/crypto.ts";
import {
  formatStudentPhone,
  studentCareDetailsFromRecord,
  studentContactsFromRecord,
} from "../../core/domain/student.ts";
import {
  COLLECTION_NAMES,
  createEmptySnapshot,
  type DataSnapshot,
  type StoredRecord,
} from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  buildStudentLongitudinalArchiveFromSnapshot,
  type StudentLongitudinalArchive,
} from "../archive/academic-year-archive.ts";
import {
  ANECDOTE_FORM_SCHEMA_VERSION,
  approvalSealMatchesCurrentSources,
} from "../anecdote/anecdote-form.ts";
import { formatObservationDateTime } from "../students/student-profile-tools.ts";
import {
  DOSSIER_AUDIENCES,
  DOSSIER_DESTINATIONS,
  dossierPrivacyDefaults,
  isExternalAiDossierDestination,
  type DossierAudience,
  type DossierDestination,
  type DossierIdentityMode,
  type ExternalAiFeedback,
} from "./student-dossier-contract.ts";

export {
  DOSSIER_AUDIENCES,
  DOSSIER_DESTINATIONS,
  dossierPrivacyDefaults,
  isExternalAiDossierDestination,
  type DossierAudience,
  type DossierDestination,
  type DossierIdentityMode,
  type DossierPrivacyDefaults,
  type ExternalAiFeedback,
} from "./student-dossier-contract.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface StudentDossierOptions {
  destination: DossierDestination;
  audience: DossierAudience;
  identityMode: DossierIdentityMode;
  alias?: string;
  periodStart: string;
  periodEnd: string;
  includeContacts: boolean;
  includeAttendance: boolean;
  includeObservations: boolean;
  includePortfolio: boolean;
  includeExternalFeedback: boolean;
  personalDataApprovedForAi?: boolean;
}

export interface StudentDossier {
  fileName: string;
  title: string;
  text: string;
  includedEntityIds: Record<string, string[]>;
  manifest: Record<string, unknown>;
}

interface DossierPrivacyNameRule {
  term: string;
  replacementKind: "selected-student-alias" | "redacted-identity";
}

interface DossierPrivacyContext {
  selectedStudentId: string;
  nameRules: DossierPrivacyNameRule[];
  forbiddenNames: string[];
  phoneDigitSequences: string[];
}

const dossierPdfSources = new WeakMap<StudentDossier, { archive: StudentLongitudinalArchive; options: StudentDossierOptions; generatedAt: Date; privacyContext?: DossierPrivacyContext; assertExportAllowed?: PdfPreviewRecipe["assertExportAllowed"] }>();

interface AnecdoteProgramSourceTrace {
  framework: string;
  catalogId: string;
  sourceVersion: string;
}

interface AnecdoteDossierTraceEntry {
  formDraftId: string;
  observationId: string;
  generalEvaluationSourceDraftId: string | null;
  evidenceCurriculumLinkIds: string[];
  programSources: AnecdoteProgramSourceTrace[];
}

interface ApprovedAnecdoteDossierEntry extends AnecdoteDossierTraceEntry {
  civilDate: string;
  observerGeneralAssessment: string;
  programLinks: StoredRecord[];
}

export interface ExternalFeedbackAggregation {
  kind: "term" | "year";
  studentId: string;
  academicYearId: string;
  periodStart: string;
  periodEnd: string;
  feedbackIds: string[];
  contentHashes: string[];
  text: string;
}

const audienceLabels: Record<DossierAudience, string> = {
  parent: "veli bilgilendirmesi",
  administration: "okul idaresi dosyası",
  guidance: "rehberlik öğretmeni değerlendirme hazırlığı",
  teacher: "öğretmen dönem/yıl sonu çalışma özeti",
};

function safeFileStem(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "ogrenci"
  );
}

function stringValue(record: StoredRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function dateInRange(
  record: StoredRecord,
  startDate: string,
  endDate: string,
): boolean {
  return record.civilDate >= startDate && record.civilDate <= endDate;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((value) => right.includes(value))
  );
}

function programSourceKey(source: AnecdoteProgramSourceTrace): string {
  return `${source.framework}\u0000${source.catalogId}\u0000${source.sourceVersion}`;
}

function approvedAnecdoteDossierEntries(
  archive: StudentLongitudinalArchive,
  observations: readonly StoredRecord[],
  academicYearId: string,
  classroomId: string,
): ApprovedAnecdoteDossierEntry[] {
  const anecdotalObservations = observations.filter(
    (record) =>
      record.observationType === "anecdotal" &&
      record.rawTextImmutable === true &&
      typeof record.rawText === "string" &&
      record.rawText.trim().length > 0,
  );
  const formCandidatesByObservation = new Map<string, StoredRecord[]>();
  for (const draft of archive.reportDrafts ?? []) {
    if (
      draft.reportType !== "meb-2024-anecdote-form" ||
      typeof draft.deletedAt === "string" ||
      !Array.isArray(draft.selectedObservationIds) ||
      draft.selectedObservationIds.length !== 1 ||
      typeof draft.selectedObservationIds[0] !== "string"
    ) {
      continue;
    }
    const observationId = draft.selectedObservationIds[0];
    const group = formCandidatesByObservation.get(observationId) ?? [];
    group.push(draft);
    formCandidatesByObservation.set(observationId, group);
  }

  const entries: ApprovedAnecdoteDossierEntry[] = [];
  for (const observation of anecdotalObservations) {
    const candidates = formCandidatesByObservation.get(observation.id) ?? [];
    // Bir gözlemin birden fazla etkin formu varsa hangisinin yetkili olduğuna
    // downstream katman karar vermez; mükerrer incelemesi yapılana kadar dışlar.
    if (candidates.length !== 1) continue;
    const draft = candidates[0]!;
    const sections = isObject(draft.editableSections)
      ? draft.editableSections
      : null;
    const assessment =
      sections && typeof sections.observerGeneralAssessment === "string"
        ? sections.observerGeneralAssessment.trim()
        : "";
    const storedApprovedLinkIds = sections?.approvedCurriculumLinkIds;
    const approvedLinkIdsShapeValid =
      Array.isArray(storedApprovedLinkIds) &&
      storedApprovedLinkIds.length > 0 &&
      storedApprovedLinkIds.every(
        (id) => typeof id === "string" && UUID_PATTERN.test(id),
      ) &&
      new Set(storedApprovedLinkIds).size === storedApprovedLinkIds.length;
    const approvedLinkIds = Array.isArray(storedApprovedLinkIds)
      ? storedApprovedLinkIds.filter(
            (id): id is string => typeof id === "string" && UUID_PATTERN.test(id),
          )
      : [];
    const storedApprovedProgramSources = sections?.approvedProgramSources;
    const approvedProgramSourcesShapeValid =
      Array.isArray(storedApprovedProgramSources) &&
      storedApprovedProgramSources.length > 0 &&
      storedApprovedProgramSources.every(
        (source) =>
          isObject(source) &&
          typeof source.framework === "string" &&
          source.framework.trim().length > 0 &&
          typeof source.catalogId === "string" &&
          source.catalogId.trim().length > 0 &&
          typeof source.sourceVersion === "string" &&
          source.sourceVersion.trim().length > 0,
      );
    const approvedProgramSources = Array.isArray(storedApprovedProgramSources)
      ? storedApprovedProgramSources
            .filter(
              (source): source is AnecdoteProgramSourceTrace =>
                isObject(source) &&
                typeof source.framework === "string" &&
                source.framework.trim().length > 0 &&
                typeof source.catalogId === "string" &&
                source.catalogId.trim().length > 0 &&
                typeof source.sourceVersion === "string" &&
                source.sourceVersion.trim().length > 0,
            )
            .map((source) => ({
              framework: source.framework.trim(),
              catalogId: source.catalogId.trim(),
              sourceVersion: source.sourceVersion.trim(),
            }))
      : [];
    const generalEvaluationSourceDraftId =
      sections?.generalEvaluationSourceDraftId === null
        ? null
        : typeof sections?.generalEvaluationSourceDraftId === "string" &&
            UUID_PATTERN.test(sections.generalEvaluationSourceDraftId)
          ? sections.generalEvaluationSourceDraftId
          : undefined;

    const currentLinks = (archive.evidenceCurriculumLinks ?? [])
      .filter(
        (link) =>
          link.observationId === observation.id &&
          link.academicYearId === academicYearId &&
          link.classroomId === classroomId &&
          typeof link.deletedAt !== "string" &&
          link.confirmationMethod === "teacher-confirmed",
      )
      .sort((left, right) => left.id.localeCompare(right.id));
    const linksAreValid =
      currentLinks.length > 0 &&
      currentLinks.every(
        (link) =>
          UUID_PATTERN.test(link.id) &&
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
          typeof link.approvedByUserId === "string" &&
          UUID_PATTERN.test(link.approvedByUserId) &&
          isUtcIso(link.confirmedAt) &&
          (link.referenceOrigin === "teacher-declared" ||
            link.referenceOrigin === "official-catalog") &&
          typeof link.officialCatalogVerified === "boolean",
      );
    const currentLinkIds = currentLinks.map((link) => link.id);
    const currentProgramSources = [
      ...new Map(
        currentLinks.map((link) => {
          const source: AnecdoteProgramSourceTrace = {
            framework: String(link.framework).trim(),
            catalogId: String(link.catalogId).trim(),
            sourceVersion: String(link.sourceVersion).trim(),
          };
          return [programSourceKey(source), source] as const;
        }),
      ).values(),
    ].sort((left, right) =>
      programSourceKey(left).localeCompare(programSourceKey(right)),
    );
    const approvedSourceKeys = approvedProgramSources.map(programSourceKey);
    const currentSourceKeys = currentProgramSources.map(programSourceKey);
    const allLinksOfficial =
      linksAreValid &&
      currentLinks.every(
        (link) =>
          link.referenceOrigin === "official-catalog" &&
          link.officialCatalogVerified === true,
      );
    const expectedReferenceStatus = allLinksOfficial
      ? "official-catalog-verified"
      : "teacher-declared-unverified";
    const reviewedAt = isUtcIso(draft.reviewedAt) ? draft.reviewedAt : null;
    const updatedAt = isUtcIso(draft.updatedAt) ? draft.updatedAt : null;

    const assessmentSource =
      typeof generalEvaluationSourceDraftId === "string"
        ? archive.reportDrafts.find(
            (record) => record.id === generalEvaluationSourceDraftId,
          )
        : null;
    const assessmentSourceValid =
      generalEvaluationSourceDraftId === null ||
      Boolean(
        assessmentSource &&
          assessmentSource.reportType === "evidence-assessment" &&
          assessmentSource.authoredBy === "teacher" &&
          assessmentSource.academicYearId === academicYearId &&
          assessmentSource.classroomId === classroomId &&
          typeof assessmentSource.deletedAt !== "string" &&
          Array.isArray(assessmentSource.studentIds) &&
          assessmentSource.studentIds.length === 1 &&
          assessmentSource.studentIds[0] === archive.studentId &&
          Array.isArray(assessmentSource.observationIds) &&
          assessmentSource.observationIds.includes(observation.id) &&
          typeof assessmentSource.teacherAssessmentText === "string" &&
          assessmentSource.teacherAssessmentText.trim() === assessment,
      );

    if (
      !sections ||
      !UUID_PATTERN.test(draft.id) ||
      draft.scope !== "single-student" ||
      draft.status !== "ready" ||
      draft.authoredBy !== "teacher" ||
      draft.teacherReviewRequired !== true ||
      draft.reviewStatus !== "approved" ||
      draft.generationMode !== "teacher-authored-official-form" ||
      draft.referenceVerificationStatus !== expectedReferenceStatus ||
      draft.schemaVersion !== ANECDOTE_FORM_SCHEMA_VERSION ||
      draft.academicYearId !== academicYearId ||
      draft.classroomId !== classroomId ||
      !Array.isArray(draft.studentIds) ||
      draft.studentIds.length !== 1 ||
      draft.studentIds[0] !== archive.studentId ||
      draft.periodStart !== observation.civilDate ||
      draft.periodEnd !== observation.civilDate ||
      typeof sections.observedLocation !== "string" ||
      sections.observedLocation.trim().length === 0 ||
      (sections.observedLocationSource !== "teacher" &&
        sections.observedLocationSource !== "activity" &&
        sections.observedLocationSource !== "plan" &&
        sections.observedLocationSource !== "not-set") ||
      !assessment ||
      generalEvaluationSourceDraftId === undefined ||
      !assessmentSourceValid ||
      !approvedLinkIdsShapeValid ||
      !approvedProgramSourcesShapeValid ||
      typeof draft.reviewedByUserId !== "string" ||
      !UUID_PATTERN.test(draft.reviewedByUserId) ||
      reviewedAt === null ||
      updatedAt === null ||
      reviewedAt < updatedAt ||
      !linksAreValid ||
      currentLinks.some(
        (link) =>
          !isUtcIso(link.updatedAt) ||
          !isUtcIso(link.confirmedAt) ||
          link.updatedAt > (reviewedAt ?? "") ||
          link.confirmedAt > (reviewedAt ?? ""),
      ) ||
      !sameStringSet(approvedLinkIds, currentLinkIds) ||
      !sameStringSet(approvedSourceKeys, currentSourceKeys) ||
      !approvalSealMatchesCurrentSources(
        draft.approvalSeal,
        observation,
        currentLinks,
      )
    ) {
      continue;
    }

    entries.push({
      formDraftId: draft.id,
      observationId: observation.id,
      generalEvaluationSourceDraftId,
      evidenceCurriculumLinkIds: currentLinkIds,
      programSources: currentProgramSources,
      civilDate: observation.civilDate,
      observerGeneralAssessment: assessment,
      programLinks: currentLinks,
    });
  }
  return entries.sort(
    (left, right) =>
      left.civilDate.localeCompare(right.civilDate) ||
      left.observationId.localeCompare(right.observationId),
  );
}

function latestStoredRecordTimestampMillis(
  record: StoredRecord,
  label: string,
): number {
  const timestamps = [
    record.createdAt,
    record.updatedAt,
    ...(typeof record.deletedAt === "string" ? [record.deletedAt] : []),
  ];
  if (
    timestamps.some((timestamp) => {
      return (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(timestamp) ||
        Number.isNaN(Date.parse(timestamp))
      );
    })
  ) {
    throw new Error(`${label} UTC zaman çizelgesi geçersiz; dosya oluşturulmadı.`);
  }
  return Math.max(...timestamps.map((timestamp) => Date.parse(timestamp)));
}

function anecdoteTraceEntriesFromManifest(
  manifest: Record<string, unknown>,
): AnecdoteDossierTraceEntry[] {
  const trace = manifest.anecdoteEvidenceTrace;
  if (!isObject(trace) || !Array.isArray(trace.entries)) return [];
  return trace.entries.filter(
    (entry): entry is AnecdoteDossierTraceEntry =>
      isObject(entry) &&
      typeof entry.formDraftId === "string" &&
      UUID_PATTERN.test(entry.formDraftId) &&
      typeof entry.observationId === "string" &&
      UUID_PATTERN.test(entry.observationId) &&
      (entry.generalEvaluationSourceDraftId === null ||
        (typeof entry.generalEvaluationSourceDraftId === "string" &&
          UUID_PATTERN.test(entry.generalEvaluationSourceDraftId))) &&
      Array.isArray(entry.evidenceCurriculumLinkIds) &&
      entry.evidenceCurriculumLinkIds.every(
        (id) => typeof id === "string" && UUID_PATTERN.test(id),
      ) &&
      Array.isArray(entry.programSources),
  );
}

function assertDossierCreationChronology(
  snapshot: DataSnapshot,
  dossier: StudentDossier,
  studentId: string,
  academicYearId: string,
  classroomId: string,
  timestamp: string,
): void {
  const requiredRecords: Array<{ label: string; record: StoredRecord | undefined }> = [
    {
      label: `students/${studentId}`,
      record: snapshot.students.find((record) => record.id === studentId),
    },
    {
      label: `academicYears/${academicYearId}`,
      record: snapshot.academicYears.find((record) => record.id === academicYearId),
    },
    {
      label: `classrooms/${classroomId}`,
      record: snapshot.classrooms.find((record) => record.id === classroomId),
    },
  ];
  const includedCollections: ReadonlyArray<
    readonly [keyof StudentDossier["includedEntityIds"], readonly StoredRecord[]]
  > = [
    ["observations", snapshot.observations],
    ["valueEvidenceLinks", snapshot.valueEvidenceLinks],
    ["attendanceRecords", snapshot.attendanceRecords],
    ["portfolioSelections", snapshot.portfolioSelections],
    ["externalFeedback", snapshot.externalFeedback],
    ["mediaAssets", snapshot.mediaAssets],
  ];
  for (const [group, records] of includedCollections) {
    for (const id of dossier.includedEntityIds[group] ?? []) {
      requiredRecords.push({
        label: `${String(group)}/${id}`,
        record: records.find((record) => record.id === id),
      });
    }
  }
  for (const trace of anecdoteTraceEntriesFromManifest(dossier.manifest)) {
    requiredRecords.push({
      label: `reportDrafts/${trace.formDraftId}`,
      record: snapshot.reportDrafts.find(
        (record) => record.id === trace.formDraftId,
      ),
    });
    for (const linkId of trace.evidenceCurriculumLinkIds) {
      requiredRecords.push({
        label: `evidenceCurriculumLinks/${linkId}`,
        record: snapshot.evidenceCurriculumLinks.find(
          (record) => record.id === linkId,
        ),
      });
    }
    if (trace.generalEvaluationSourceDraftId) {
      requiredRecords.push({
        label: `reportDrafts/${trace.generalEvaluationSourceDraftId}`,
        record: snapshot.reportDrafts.find(
          (record) => record.id === trace.generalEvaluationSourceDraftId,
        ),
      });
    }
  }
  for (const source of requiredRecords) {
    if (!source.record) {
      throw new Error(`${source.label} kaynak kaydı bulunamadı; dosya oluşturulmadı.`);
    }
    if (
      Date.parse(timestamp) <
        latestStoredRecordTimestampMillis(source.record, source.label) ||
      Date.parse(source.record.createdAt) > Date.parse(timestamp) ||
      (typeof source.record.deletedAt === "string" &&
        Date.parse(source.record.deletedAt) < Date.parse(timestamp))
    ) {
      throw new Error(
        "Öğrenci dosyası zamanı kaynak kayıtların son değişiklik zamanından eski veya canlılık penceresi dışında; dosya oluşturulmadı.",
      );
    }
  }
}

function observationLines(
  record: StoredRecord,
  index: number,
  redact: (value: string) => string,
): string {
  const observedAt =
    typeof record.observedAt === "string"
      ? formatObservationDateTime(record.observedAt)
      : record.civilDate;
  return [
    `${index + 1}. ${observedAt}`,
    `Gözlem: ${redact(String(record.rawText ?? "").trim())}`,
    ...(stringValue(record, "context")
      ? [`Bağlam: ${redact(stringValue(record, "context")!)}`]
      : []),
    ...(stringValue(record, "childQuote")
      ? [`Çocuğun sözü: ${redact(stringValue(record, "childQuote")!)}`]
      : []),
  ].join("\n");
}

function normalizePrivacyTerm(value: string): string {
  return value.normalize("NFC").trim().replace(/[\s\u00a0]+/gu, " ");
}

function privacyFold(value: string): string {
  return normalizePrivacyTerm(value)
    .replace(/[iI\u0130\u0131]/gu, "i")
    .toLocaleLowerCase("tr-TR");
}

function expandedNameTerms(values: readonly (string | undefined)[]): string[] {
  const terms = new Map<string, string>();
  for (const value of values) {
    if (!value) continue;
    const normalized = normalizePrivacyTerm(value);
    if (!normalized) continue;
    for (const candidate of [normalized, ...normalized.split(" ")]) {
      const term = normalizePrivacyTerm(candidate);
      if (term) terms.set(privacyFold(term), term);
    }
  }
  return [...terms.values()];
}

function studentIdentityTerms(student: StoredRecord): string[] {
  const firstName = stringValue(student, "firstName");
  const lastName = stringValue(student, "lastName");
  return expandedNameTerms([
    stringValue(student, "displayName"),
    firstName && lastName ? `${firstName} ${lastName}` : undefined,
    stringValue(student, "preferredName"),
    firstName,
    lastName,
  ]);
}

function rawContactFields(student: StoredRecord): Array<{
  name?: string;
  phone?: string;
}> {
  if (!Array.isArray(student.contacts)) return [];
  return student.contacts.flatMap((candidate) => {
    if (!isObject(candidate)) return [];
    return [
      {
        ...(typeof candidate.name === "string" ? { name: candidate.name } : {}),
        ...(typeof candidate.phone === "string"
          ? { phone: candidate.phone }
          : {}),
      },
    ];
  });
}

const UNICODE_DECIMAL_ZERO_CODE_POINTS = [
  0x0030, 0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6,
  0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0de6, 0x0e50, 0x0ed0,
  0x0f20, 0x1040, 0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80,
  0x1a90, 0x1b50, 0x1bb0, 0x1c40, 0x1c50, 0xa620, 0xa8d0, 0xa900,
  0xa9d0, 0xa9f0, 0xaa50, 0xabf0, 0xff10, 0x104a0, 0x10d30, 0x10d40,
  0x11066, 0x110f0, 0x11136, 0x111d0, 0x112f0, 0x11450, 0x114d0,
  0x11650, 0x116c0, 0x116d0, 0x116da, 0x11730, 0x118e0, 0x11950,
  0x11bf0, 0x11c50, 0x11d50, 0x11da0, 0x11de0, 0x11f50, 0x16130,
  0x16a60, 0x16ac0, 0x16b50, 0x16d70, 0x1ccf0, 0x1d7ce, 0x1d7d8,
  0x1d7e2, 0x1d7ec, 0x1d7f6, 0x1e140, 0x1e2f0, 0x1e4f0, 0x1e5f1,
  0x1e950, 0x1fbf0,
] as const;

const unicodePhoneDigitMap = new Map<string, string>();
for (const zeroCodePoint of UNICODE_DECIMAL_ZERO_CODE_POINTS) {
  for (let digit = 0; digit <= 9; digit += 1) {
    unicodePhoneDigitMap.set(
      String.fromCodePoint(zeroCodePoint + digit),
      String(digit),
    );
  }
}

function normalizeUnicodePhoneDigits(value: string): string {
  return [...value.normalize("NFKC")]
    .map((character) => unicodePhoneDigitMap.get(character) ?? character)
    .join("");
}

function phoneDigitVariants(value: string): string[] {
  const rawDigits = normalizeUnicodePhoneDigits(value).replace(/[^0-9]/gu, "");
  if (rawDigits.length < 7) return [];
  const variants = new Set<string>([rawDigits]);
  let localDigits = rawDigits;
  if (localDigits.startsWith("0090") && localDigits.length === 14) {
    localDigits = `0${localDigits.slice(4)}`;
  } else if (localDigits.startsWith("90") && localDigits.length === 12) {
    localDigits = `0${localDigits.slice(2)}`;
  } else if (localDigits.length === 10 && localDigits.startsWith("5")) {
    localDigits = `0${localDigits}`;
  }
  if (localDigits.length === 11 && localDigits.startsWith("0")) {
    variants.add(localDigits);
    variants.add(`90${localDigits.slice(1)}`);
    variants.add(localDigits.slice(1));
  }
  return [...variants].sort((left, right) => right.length - left.length);
}

function studentBelongsToPrivacyScope(
  student: StoredRecord,
  academicYearId: string,
  classroomId: string,
): boolean {
  if (
    student.academicYearId === academicYearId &&
    student.classroomId === classroomId
  ) {
    return true;
  }
  return (
    Array.isArray(student.enrollments) &&
    student.enrollments.some(
      (enrollment) =>
        isObject(enrollment) &&
        enrollment.academicYearId === academicYearId &&
        enrollment.classroomId === classroomId,
    )
  );
}

function compileDossierPrivacyContext(
  students: readonly StoredRecord[],
  selectedStudentId: string,
): DossierPrivacyContext {
  const rules = new Map<string, DossierPrivacyNameRule>();
  const phoneSequences = new Set<string>();
  const addName = (
    term: string,
    replacementKind: DossierPrivacyNameRule["replacementKind"],
  ) => {
    const normalized = normalizePrivacyTerm(term);
    if (!normalized) return;
    const key = privacyFold(normalized);
    const existing = rules.get(key);
    rules.set(key, {
      term: existing?.term ?? normalized,
      replacementKind:
        replacementKind === "redacted-identity" ||
        existing?.replacementKind === "redacted-identity"
          ? "redacted-identity"
          : "selected-student-alias",
    });
  };

  for (const student of students) {
    const isSelected = student.id === selectedStudentId;
    for (const term of studentIdentityTerms(student)) {
      addName(
        term,
        isSelected ? "selected-student-alias" : "redacted-identity",
      );
    }
    const parsedContacts = studentContactsFromRecord(student.contacts).map(
      (contact) => ({ name: contact.name, phone: contact.phone }),
    );
    for (const contact of [...parsedContacts, ...rawContactFields(student)]) {
      for (const term of expandedNameTerms([contact.name])) {
        addName(term, "redacted-identity");
      }
      if (contact.phone) {
        for (const digits of phoneDigitVariants(contact.phone)) {
          phoneSequences.add(digits);
        }
      }
    }
  }

  const nameRules = [...rules.values()].sort(
    (left, right) =>
      [...right.term].length - [...left.term].length ||
      left.term.localeCompare(right.term, "tr-TR"),
  );
  return {
    selectedStudentId,
    nameRules,
    forbiddenNames: nameRules.map((rule) => rule.term),
    phoneDigitSequences: [...phoneSequences].sort(
      (left, right) => right.length - left.length,
    ),
  };
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function privacyNamePattern(term: string): RegExp {
  const body = [...normalizePrivacyTerm(term)]
    .map((character) => {
      if (/\s/u.test(character)) return "[\\s\\u00a0]+";
      if (/[iI\u0130\u0131]/u.test(character)) return "[iI\\u0130\\u0131]";
      const variants = new Set([
        character,
        character.toLocaleLowerCase("tr-TR"),
        character.toLocaleUpperCase("tr-TR"),
      ]);
      return `(?:${[...variants]
        .map(escapeRegularExpression)
        .join("|")})`;
    })
    .join("");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`,
    "gu",
  );
}

function privacyPhonePattern(digits: string): RegExp {
  const separator = "[\\p{P}\\p{Z}\\s]*";
  return new RegExp(
    `(?<!\\p{N})(?:\\+|\\()?\\s*${[...digits].join(separator)}(?!\\p{N})`,
    "gu",
  );
}

function dossierTextRedactor(
  student: StoredRecord,
  options: StudentDossierOptions,
  resolvedName: string,
  privacyContext?: DossierPrivacyContext,
): (value: string) => string {
  if (options.identityMode === "full") return (value) => value;
  const context =
    privacyContext ?? compileDossierPrivacyContext([student], student.id);
  return (value) => {
    let redacted = value.normalize("NFC");
    for (const rule of context.nameRules) {
      const replacement =
        rule.replacementKind === "selected-student-alias"
          ? resolvedName
          : "[\u00f6\u011frenci/yak\u0131n bilgisi gizlendi]";
      redacted = redacted.replace(
        privacyNamePattern(rule.term),
        () => replacement,
      );
    }
    redacted = normalizeUnicodePhoneDigits(redacted);
    for (const digits of context.phoneDigitSequences) {
      redacted = redacted.replace(
        privacyPhonePattern(digits),
        () => "[telefon gizlendi]",
      );
    }
    return redacted;
  };
}

function assertExternalAiDossierRedaction(
  value: string,
  privacyContext: DossierPrivacyContext,
): void {
  const normalized = normalizeUnicodePhoneDigits(value.normalize("NFC"));
  const forbiddenNameRemains = privacyContext.forbiddenNames.some((term) =>
    privacyNamePattern(term).test(normalized),
  );
  const forbiddenPhoneRemains = privacyContext.phoneDigitSequences.some(
    (digits) => privacyPhonePattern(digits).test(normalized),
  );
  if (forbiddenNameRemains || forbiddenPhoneRemains) {
    throw new Error(
      "Harici yapay zek\u00e2 paketi gizlilik taramas\u0131n\u0131 ge\u00e7emedi; d\u0131\u015fa aktar\u0131m reddedildi.",
    );
  }
}

function attendanceSummary(records: readonly StoredRecord[]): string[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const status =
      typeof record.status === "string" ? record.status : "bilinmiyor";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  const label: Record<string, string> = {
    present: "Geldi",
    absent: "Gelmedi",
    late: "Geç geldi",
    excused: "Mazeretli",
  };
  return [...counts.entries()].map(
    ([status, count]) => `${label[status] ?? status}: ${count}`,
  );
}

function anecdoteAssessmentLines(
  entry: ApprovedAnecdoteDossierEntry,
  index: number,
  redact: (value: string) => string,
): string {
  return [
    `${index + 1}. ${entry.civilDate}`,
    `Öğretmenin bu gözleme ilişkin genel değerlendirmesi: ${redact(
      entry.observerGeneralAssessment,
    )}`,
    "Kanıt sınırı: Bu yorum tek tarihli gözleme ilişkindir; tek başına genelleyici gelişim hükmü değildir.",
  ].join("\n");
}

function anecdoteProgramLinkLines(
  entry: ApprovedAnecdoteDossierEntry,
  index: number,
): string {
  return [
    `${index + 1}. ${entry.civilDate}`,
    ...entry.programLinks.map(
      (link) =>
        `- ${String(link.referenceCode).trim()} — ${String(
          link.referenceTitle,
        ).trim()} (${String(link.framework).toLocaleUpperCase("tr-TR")}; kaynak sürümü: ${String(
          link.sourceVersion,
        ).trim()})`,
    ),
  ].join("\n");
}

function anecdoteEvidenceTrace(
  entries: readonly ApprovedAnecdoteDossierEntry[],
): Record<string, unknown> {
  const traceEntries: AnecdoteDossierTraceEntry[] = entries.map((entry) => ({
    formDraftId: entry.formDraftId,
    observationId: entry.observationId,
    generalEvaluationSourceDraftId: entry.generalEvaluationSourceDraftId,
    evidenceCurriculumLinkIds: [...entry.evidenceCurriculumLinkIds],
    programSources: entry.programSources.map((source) => ({ ...source })),
  }));
  return {
    schemaVersion: 1,
    reportType: "meb-2024-anecdote-form",
    inclusionPolicy: "ready-approved-current-exact-seal-only",
    formDraftIds: traceEntries.map((entry) => entry.formDraftId),
    observationIds: traceEntries.map((entry) => entry.observationId),
    evidenceCurriculumLinkIds: traceEntries.flatMap(
      (entry) => entry.evidenceCurriculumLinkIds,
    ),
    generalEvaluationSourceDraftIds: traceEntries
      .map((entry) => entry.generalEvaluationSourceDraftId)
      .filter((id): id is string => id !== null),
    programSourceVersions: [
      ...new Set(
        traceEntries.flatMap((entry) =>
          entry.programSources.map((source) => source.sourceVersion),
        ),
      ),
    ].sort((left, right) => left.localeCompare(right)),
    entries: traceEntries,
  };
}

function feedbackFromRecord(record: StoredRecord): ExternalAiFeedback | null {
  if (
    record.rawTextImmutable !== true ||
    record.reviewStatus !== "teacher-saved" ||
    !isCivilDate(record.periodStart) ||
    !isCivilDate(record.periodEnd)
  ) {
    return null;
  }
  const feedbackText =
    typeof record.feedbackText === "string"
      ? record.feedbackText.trim()
      : "";
  if (!feedbackText) return null;
  const provider =
    record.provider === "chatgpt" || record.provider === "gemini"
      ? record.provider
      : "other";
  const audience = DOSSIER_AUDIENCES.includes(
    record.audience as DossierAudience,
  )
    ? (record.audience as DossierAudience)
    : "teacher";
  return {
    id: record.id,
    provider,
    audience,
    periodStart: record.periodStart as string,
    periodEnd: record.periodEnd as string,
    receivedAt:
      typeof record.receivedAt === "string"
        ? record.receivedAt
        : record.createdAt,
    feedbackText,
    ...(typeof record.teacherNote === "string" &&
    record.teacherNote.trim()
      ? { teacherNote: record.teacherNote.trim() }
      : {}),
    includeInTermSummary: record.includeInTermSummary === true,
    includeInYearSummary: record.includeInYearSummary === true,
    ...(typeof record.linkedExportPackageId === "string"
      ? { linkedExportPackageId: record.linkedExportPackageId }
      : {}),
  };
}

export function listExternalAiFeedback(
  snapshot: DataSnapshot,
  studentId: string,
): ExternalAiFeedback[] {
  return snapshot.externalFeedback
    .filter(
      (record) =>
        typeof record.deletedAt !== "string" &&
        record.studentId === studentId,
    )
    .map(feedbackFromRecord)
    .filter((record): record is ExternalAiFeedback => record !== null)
    .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
}

function resolveStudentName(
  student: StoredRecord,
  options: StudentDossierOptions,
): string {
  if (options.identityMode === "alias") {
    return options.alias?.trim() || "Öğrenci A";
  }
  return (
    stringValue(student, "displayName") ??
    stringValue(student, "preferredName") ??
    "İsimsiz öğrenci"
  );
}

function buildAiInstruction(
  options: StudentDossierOptions,
  name: string,
): string[] {
  if (options.destination !== "chatgpt" && options.destination !== "gemini") {
    return [];
  }
  return [
    "YAPAY ZEKÂ İÇİN GÖREV",
    `${name} için ${audienceLabels[options.audience]} amacıyla düzenlenebilir bir taslak oluştur.`,
    "Yalnız verilen tarihli kanıtlara dayan; gözlem ile yorumu açıkça ayır.",
    "Tanı, teşhis, kesin gelişim hükmü veya çocuklar arası karşılaştırma üretme.",
    "Her önemli ifadeyi tarihli kanıtla ilişkilendir; veri yetersizse açıkça belirt.",
    "Yanıtı öğretmenin son incelemesine uygun, doğal ve mesleki Türkçe ile yaz.",
    "",
  ];
}

export function buildStudentDossier(
  archive: StudentLongitudinalArchive,
  options: StudentDossierOptions,
  generatedAt = new Date(),
  privacyContext?: DossierPrivacyContext,
): StudentDossier {
  if (
    !isCivilDate(options.periodStart) ||
    !isCivilDate(options.periodEnd) ||
    options.periodStart > options.periodEnd
  ) {
    throw new Error("Paylaşım tarih aralığı geçersiz.");
  }
  if (!DOSSIER_DESTINATIONS.includes(options.destination)) {
    throw new Error("Paylaşım hedefi geçersiz.");
  }
  if (!DOSSIER_AUDIENCES.includes(options.audience)) {
    throw new Error("Belge amacı geçersiz.");
  }
  if (
    isExternalAiDossierDestination(options.destination) &&
    (options.identityMode !== "alias" || options.includeContacts)
  ) {
    throw new Error(
      "Yapay zekâ analiz paketi yalnız sistem takma adıyla hazırlanır; kimlik ve yakın bilgileri eklenemez.",
    );
  }
  const student = archive.student;
  const academicYearId = stringValue(student, "academicYearId");
  const classroomId = stringValue(student, "classroomId");
  const academicYear = archive.academicYears.find(
    (record) => record.id === academicYearId,
  );
  if (
    !academicYearId ||
    !classroomId ||
    !academicYear ||
    !isCivilDate(String(academicYear.startDate ?? "")) ||
    !isCivilDate(String(academicYear.endDate ?? "")) ||
    options.periodStart < String(academicYear.startDate) ||
    options.periodEnd > String(academicYear.endDate)
  ) {
    throw new Error(
      "Paylaşım dönemi öğrencinin bağlı olduğu eğitim yılı içinde olmalıdır.",
    );
  }
  const name = resolveStudentName(student, options);
  const effectivePrivacyContext =
    options.identityMode === "alias"
      ? privacyContext ?? compileDossierPrivacyContext([student], student.id)
      : undefined;
  const observations = archive.observations
    .filter(
      (record) =>
        typeof record.deletedAt !== "string" &&
        Array.isArray(record.studentIds) &&
        record.studentIds.length === 1 &&
        record.studentIds[0] === student.id &&
        record.academicYearId === academicYearId &&
        record.classroomId === classroomId &&
        resolveStudentMembershipOn(student, { academicYearId, classroomId, academicYear, civilDate: record.civilDate }).eligible &&
        dateInRange(record, options.periodStart, options.periodEnd),
    )
    .sort(
      (left, right) =>
        left.civilDate.localeCompare(right.civilDate) ||
        left.id.localeCompare(right.id),
    );
  const attendanceCandidates = archive.attendanceRecords.filter(
    (record) =>
      typeof record.deletedAt !== "string" &&
      record.studentId === student.id &&
      record.academicYearId === academicYearId &&
      record.classroomId === classroomId &&
      dateInRange(record, options.periodStart, options.periodEnd),
  );
  const observationIds = new Set(observations.map((record) => record.id));
  const valueEvidenceLinks = (archive.valueEvidenceLinks ?? []).filter(
    (record) =>
      record.academicYearId === academicYearId &&
      record.classroomId === classroomId &&
      record.studentId === student.id &&
      typeof record.deletedAt !== "string" &&
      observationIds.has(record.observationId) &&
      dateInRange(record, options.periodStart, options.periodEnd),
  );
  const resolvedAttendance = resolveAttendanceRecords(attendanceCandidates);
  const accountingSnapshot = createEmptySnapshot();
  accountingSnapshot.academicYears = archive.academicYears;
  accountingSnapshot.classrooms = archive.classrooms;
  accountingSnapshot.students = [student];
  accountingSnapshot.attendanceRecords = archive.attendanceRecords;
  accountingSnapshot.calendarEntries = archive.calendarEntries ?? [];
  const attendanceAccounting = buildAttendanceDayBreakdown(accountingSnapshot, {
    scope: { academicYearId, classroomId }, studentId: student.id,
    periodStart: options.periodStart, periodEnd: options.periodEnd, asOfCivilDate: civilDateInIstanbul(generatedAt),
  });
  const countedIds = new Set(attendanceAccounting.days.flatMap((day) => day.rows.filter((row) => row.classification === "counted").map((row) => row.canonicalRecordId)));
  const attendance = [...resolvedAttendance.latestByKey.values()].filter((record) => countedIds.has(record.id));
  const attendanceDuplicateIds = resolvedAttendance.records
    .filter((record) => record._MUKERRER_INCELE === true)
    .map((record) => record.id);
  const attendanceLines = [...attendanceSummary(attendance),
    `Devam: ${attendanceAccounting.totals.attendanceNumerator} / ${attendanceAccounting.totals.attendanceDenominator} işaretlenmiş geçerli gün (geldi ve geç geldi).`,
    `Yoklama kapsamı: ${attendanceAccounting.totals.coverageNumerator} / ${attendanceAccounting.totals.coverageDenominator} beklenen eğitim günü.`,
    `İşaretlenmemiş gün: ${attendanceAccounting.totals.missingStudentDays}. İşaretlenmemiş günler devamsızlık sayılmaz.`,
  ];
  const approvedAnecdotes = options.includeObservations
    ? approvedAnecdoteDossierEntries(
        archive,
        observations,
        academicYearId,
        classroomId,
      )
    : [];
  const portfolio = archive.portfolioSelections.filter(
    (record) => {
      const periodStart =
        typeof record.periodStart === "string" ? record.periodStart : "";
      const periodEnd =
        typeof record.periodEnd === "string" ? record.periodEnd : "";
      const sourceObservationIsSafe =
        record.itemType !== "observation" ||
        (typeof record.itemId === "string" && observationIds.has(record.itemId));
      return (
        record.studentId === student.id &&
        record.academicYearId === academicYearId &&
        record.classroomId === classroomId &&
        typeof record.deletedAt !== "string" &&
        sourceObservationIsSafe &&
        periodStart <= options.periodEnd &&
        periodEnd >= options.periodStart
      );
    },
  );
  const feedback = archive.externalFeedback
    .map(feedbackFromRecord)
    .filter(
      (record): record is ExternalAiFeedback =>
        record !== null &&
        archive.externalFeedback.some(
           (source) =>
             source.id === record.id &&
             source.studentId === student.id &&
             source.academicYearId === academicYearId &&
             source.classroomId === classroomId &&
             typeof source.deletedAt !== "string",
         ) &&
        record.periodStart <= options.periodEnd &&
        record.periodEnd >= options.periodStart,
    );
  const contacts = studentContactsFromRecord(student.contacts);
  const careDetails = studentCareDetailsFromRecord(student.careDetails);
  const redact = dossierTextRedactor(
    student,
    options,
    name,
    effectivePrivacyContext,
  );
  const profileLines =
    options.identityMode === "full"
      ? [
          `Ad soyad: ${stringValue(student, "displayName") ?? name}`,
          ...(stringValue(student, "preferredName")
            ? [`Kullanılan ad: ${stringValue(student, "preferredName")}`]
            : []),
          ...(stringValue(student, "optionalCode")
            ? [`Okul numarası / isteğe bağlı kod: ${stringValue(student, "optionalCode")}`]
            : []),
          ...(stringValue(student, "birthDate")
            ? [`Doğum tarihi: ${stringValue(student, "birthDate")}`]
            : []),
        ]
      : [`Öğrenci: ${name}`, "Kimlik bilgileri dış paylaşım için gizlendi."];
  const contactLines =
    options.includeContacts && options.identityMode === "full"
      ? contacts.map(
          (contact) =>
            `${contact.relationship}${
              contact.name ? ` · ${contact.name}` : ""
            }: ${formatStudentPhone(contact.phone)}${
              contact.isPrimary ? " (öncelikli)" : ""
            }${
              contact.isEmergencyContact ? " (acil iletişim)" : ""
            }${
              contact.isAuthorizedPickup ? " (teslim yetkili)" : ""
            }`,
        )
      : [];
  const careLines =
    options.includeContacts && options.identityMode === "full" && careDetails
      ? [
          ...(careDetails.allergies
            ? [`Bilinen alerjiler: ${careDetails.allergies}`]
            : []),
          ...(careDetails.dietaryNeeds
            ? [`Beslenme gereksinimleri: ${careDetails.dietaryNeeds}`]
            : []),
          ...(careDetails.medicationNotes
            ? [`İlaç ve uygulama notu: ${careDetails.medicationNotes}`]
            : []),
          ...(careDetails.emergencyNotes
            ? [`Acil durumda bilinmesi gerekenler: ${careDetails.emergencyNotes}`]
            : []),
          ...(careDetails.physicianName
            ? [`Hekim / sağlık birimi: ${careDetails.physicianName}`]
            : []),
          ...(careDetails.physicianPhone
            ? [`Hekim telefonu: ${careDetails.physicianPhone}`]
            : []),
          ...(careDetails.medicalDevices
            ? [`Sağlık cihazı veya sürekli destek: ${careDetails.medicalDevices}`]
            : []),
          ...(careDetails.homeAddress
            ? [`Ev adresi: ${careDetails.homeAddress}`]
            : []),
          ...(careDetails.guardianEmail
            ? [`Veli e-posta adresi: ${careDetails.guardianEmail}`]
            : []),
          ...(careDetails.familyEducationNeeds
            ? [`Aile eğitimi ihtiyaçları (Ek 11 çalışma notu): ${careDetails.familyEducationNeeds}`]
            : []),
          ...(careDetails.familyParticipationPreferences
            ? [`Aile katılım tercihleri (Ek 12 çalışma notu): ${careDetails.familyParticipationPreferences}`]
            : []),
          ...(careDetails.photoVideoPermissionOnFile
            ? ["İmzalı fotoğraf / video kullanım formu: Dosyada"]
            : []),
          ...(careDetails.fieldTripPermissionOnFile
            ? ["İmzalı okul dışı gezi / öğrenme formu: Dosyada"]
            : []),
          ...(careDetails.digitalCommunicationPermissionOnFile
            ? ["İmzalı dijital iletişim formu: Dosyada"]
            : []),
          ...(careDetails.permissionFormDate
            ? [`İzin formları son kontrol tarihi: ${careDetails.permissionFormDate}`]
            : []),
        ]
      : [];
  const portfolioLines = portfolio.map((selection, index) => {
    const source = observations.find(
      (record) => record.id === selection.itemId,
    );
    return [
      `${index + 1}. ${selection.periodStart}–${selection.periodEnd}`,
      ...(source && options.includeObservations
        ? [`Kaynak gözlem: ${redact(String(source.rawText ?? ""))}`]
        : []),
      ...(stringValue(selection, "teacherCaption")
        ? [
            `Öğretmen açıklaması: ${redact(
              stringValue(selection, "teacherCaption")!,
            )}`,
          ]
        : []),
      ...(stringValue(selection, "childReflection")
        ? [
            `Çocuğun görüşü: ${redact(
              stringValue(selection, "childReflection")!,
            )}`,
          ]
        : []),
      ...(stringValue(selection, "familyContribution")
        ? [
            `Aile katkısı: ${redact(
              stringValue(selection, "familyContribution")!,
            )}`,
          ]
        : []),
    ].join("\n");
  });
  const feedbackLines = feedback.map(
    (item, index) =>
      `${index + 1}. ${item.provider.toLocaleUpperCase("tr-TR")} · ${item.periodStart}–${item.periodEnd}\n${redact(item.feedbackText)}${
        item.teacherNote ? `\nÖğretmen notu: ${redact(item.teacherNote)}` : ""
      }`,
  );
  const title = `${name} · ${audienceLabels[options.audience]}`;
  const assembledText = [
    ...buildAiInstruction(options, name),
    "MAARİFOS ÖĞRENCİ DOSYASI",
    `Amaç: ${audienceLabels[options.audience]}`,
    `Dönem: ${options.periodStart}–${options.periodEnd}`,
    `Oluşturulma: ${formatObservationDateTime(generatedAt.toISOString())}`,
    "",
    "TEMEL BİLGİLER",
    ...profileLines,
    ...(contactLines.length > 0
      ? ["", "YAKIN İLETİŞİM BİLGİLERİ", ...contactLines]
      : []),
    ...(careLines.length > 0
      ? ["", "SAĞLIK VE GÜVENLİK BİLGİLERİ", ...careLines]
      : []),
    ...(options.includeAttendance
      ? [
          "",
          "DEVAM ÖZETİ",
          ...(attendanceLines.length > 0
            ? attendanceLines
            : ["Bu aralıkta devam kaydı bulunmuyor."]),
          ...(attendanceDuplicateIds.length > 0
            ? [`Mükerrer incelemesi: ${attendanceDuplicateIds.length} ek kayıt kaynakta korunur; her çocuk ve gün için en güncel geçerli kayıt bir kez sayılır.`]
            : []),
          ...(resolvedAttendance.invalidRecords.length > 0
            ? [`Veri kontrolü: ${resolvedAttendance.invalidRecords.length} geçersiz kayıt sayıma alınmadı; kaynak kayıtlar incelenmelidir.`]
            : []),
        ]
      : []),
    ...(options.includeObservations
      ? [
          "",
          "TARİHLİ GÖZLEMLER",
          ...(observations.length > 0
            ? observations.map((record, index) =>
                observationLines(record, index, redact),
              )
            : ["Bu aralıkta gözlem bulunmuyor."]),
        ]
      : []),
    ...(options.includeObservations && approvedAnecdotes.length > 0
      ? [
          "",
          "ANEKDOTLARA İLİŞKİN ÖĞRETMEN DEĞERLENDİRMELERİ",
          ...approvedAnecdotes.map((entry, index) =>
            anecdoteAssessmentLines(entry, index, redact),
          ),
          "",
          "ÖĞRETMEN ONAYLI PROGRAM BAĞLANTILARI",
          ...approvedAnecdotes.map(anecdoteProgramLinkLines),
        ]
      : []),
    ...(options.includePortfolio
      ? [
          "",
          "PORTFOLYO SEÇKİLERİ",
          ...(portfolioLines.length > 0
            ? portfolioLines
            : ["Bu aralıkta portfolyo seçkisi bulunmuyor."]),
        ]
      : []),
    ...(options.includeExternalFeedback
      ? [
          "",
          "KAYDEDİLMİŞ HARİCÎ YAPAY ZEKÂ GERİ BİLDİRİMLERİ",
          ...(feedbackLines.length > 0
            ? feedbackLines
            : ["Bu aralıkta kaydedilmiş geri bildirim bulunmuyor."]),
        ]
      : []),
    "",
    "SINIRLAR",
    "Bu dosya öğretmen kayıtlarından oluşturulmuştur; tıbbi veya psikolojik tanı içermez.",
    "Nihai paylaşım ve ifade sorumluluğu öğretmenin incelemesindedir.",
  ].join("\n");
  const text = isExternalAiDossierDestination(options.destination)
    ? assembledText.normalize("NFC")
    : assembledText;
  if (isExternalAiDossierDestination(options.destination)) {
    if (!effectivePrivacyContext) {
      throw new Error(
        "Harici yapay zek\u00e2 paketi gizlilik ba\u011flam\u0131 olmadan olu\u015fturulamaz.",
      );
    }
    assertExternalAiDossierRedaction(text, effectivePrivacyContext);
  }
  const dossier: StudentDossier = {
    title,
    fileName: `${safeFileStem(name)}-${options.audience}-${options.periodEnd}.txt`,
    text,
    includedEntityIds: {
      observations: options.includeObservations
        ? observations.map((record) => record.id)
        : [],
      valueEvidenceLinks: options.includeObservations
        ? valueEvidenceLinks.map((record) => record.id)
        : [],
      attendanceRecords: options.includeAttendance
        ? attendanceCandidates.map((record) => record.id)
        : [],
      portfolioSelections: options.includePortfolio
        ? portfolio.map((record) => record.id)
        : [],
      externalFeedback: options.includeExternalFeedback
        ? feedback.map((record) => record.id)
        : [],
      mediaAssets: [],
    },
    manifest: {
      packageKind: "student_dossier",
      destination: options.destination,
      ...(isExternalAiDossierDestination(options.destination)
        ? { provider: options.destination }
        : {}),
      audience: options.audience,
      purpose: options.audience,
      periodStart: options.periodStart,
      periodEnd: options.periodEnd,
      academicYearId,
      classroomId,
      identityMode: options.identityMode,
      includeContacts: options.includeContacts,
      includeAttendance: options.includeAttendance,
      ...(options.includeAttendance ? {
        attendanceAccounting: { totals: attendanceAccounting.totals, sourceIssues: attendanceAccounting.sourceIssues },
        attendanceResolution: {
          rule: "latest-valid-per-student-civil-date",
          sourceCount: attendanceCandidates.length,
          countedDayCount: attendance.length,
          duplicateReviewIds: attendanceDuplicateIds,
          invalidRecordIds: resolvedAttendance.invalidRecords.map((record) => record.id),
        },
      } : {}),
      includeObservations: options.includeObservations,
      includePortfolio: options.includePortfolio,
      includeExternalFeedback: options.includeExternalFeedback,
      anecdoteEvidenceTrace: anecdoteEvidenceTrace(approvedAnecdotes),
      generatedAt: generatedAt.toISOString(),
    },
  };
  dossierPdfSources.set(dossier, { archive: structuredClone(archive), options: { ...options }, generatedAt: new Date(generatedAt), privacyContext });
  return dossier;
}

/** Printable file representation retains the destination's existing identity/contact policy. */
export async function createStudentDossierPdfDocument(dossier: StudentDossier, runtime?: SemanticTaggedPdfRuntime) {
  const file = await createTextPdfDocument(dossier, runtime);
  const source = dossierPdfSources.get(dossier);
  if (!source) return file;
  const options = source.options;
  const choices = [{ id: "summary", label: "Öğrenci ve dönem bilgileri" },
    ...(options.includeContacts ? [{ id: "includeContacts", label: "Yetkili yakın bilgileri" }] : []),
    ...(options.includeAttendance ? [{ id: "includeAttendance", label: "Yoklama özeti" }] : []),
    ...(options.includeObservations ? [{ id: "includeObservations", label: "Gözlem kayıtları" }] : []),
    ...(options.includePortfolio ? [{ id: "includePortfolio", label: "Portfolyo seçkileri" }] : []),
    ...(options.includeExternalFeedback ? [{ id: "includeExternalFeedback", label: "Kaydedilmiş geri bildirimler" }] : [])];
  const recipe: PdfPreviewRecipe = {
    assertExportAllowed: source.assertExportAllowed,
    title: dossier.title, fields: choices,
    description: "Kimlik ve paylaşım amacı önceki seçiminizle korunur. Bu ekranda yalnız izin verdiğiniz alanlar ve dönem daraltılabilir.",
    students: [{ id: source.archive.student.id, label: resolveStudentName(source.archive.student, options) }],
    period: { min: options.periodStart, max: options.periodEnd },
    initial: { fields: choices.map((choice) => choice.id), studentIds: [source.archive.student.id], periodStart: options.periodStart, periodEnd: options.periodEnd },
    async build(selection) {
      validatePdfSelection(recipe, selection);
      const next = buildStudentDossier(source.archive, { ...options,
        periodStart: selection.periodStart!, periodEnd: selection.periodEnd!,
        includeContacts: options.includeContacts && selection.fields.includes("includeContacts"),
        includeAttendance: options.includeAttendance && selection.fields.includes("includeAttendance"),
        includeObservations: options.includeObservations && selection.fields.includes("includeObservations"),
        includePortfolio: options.includePortfolio && selection.fields.includes("includePortfolio"),
        includeExternalFeedback: options.includeExternalFeedback && selection.fields.includes("includeExternalFeedback"),
      }, source.generatedAt, source.privacyContext);
      return createTextPdfDocument(next, runtime);
    },
  };
  registerPdfPreviewRecipe(file.bytes, recipe);
  return file;
}

export async function createStudentDossier(
  store: LocalDataStore,
  input: {
    studentId: string;
    options: StudentDossierOptions;
    now?: Date;
  },
): Promise<{ dossier: StudentDossier; exportPackageId: string }> {
  if (!UUID_PATTERN.test(input.studentId)) {
    throw new Error("Dosyası hazırlanacak öğrenci kimliği geçersiz.");
  }
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Geçerli bir öğrenci dosyası oluşturma zamanı gerekli.");
  }
  const preimage = await store.readSnapshot();
  const preimageCanonical = canonicalJson(preimage);
  const archive = buildStudentLongitudinalArchiveFromSnapshot(preimage, {
    studentId: input.studentId,
    now,
  });
  const student = archive.student;
  if (
    typeof student.academicYearId !== "string" ||
    typeof student.classroomId !== "string"
  ) {
    throw new Error("Öğrenci paylaşım için eğitim yılı kapsamına bağlı değil.");
  }
  const academicYearId = student.academicYearId;
  const classroomId = student.classroomId;
  if (input.options.includePortfolio) {
    const consent = documentedSharingConsentSummary(preimage, { scope: { academicYearId, classroomId }, studentId: input.studentId, purpose: "portfolio-sharing", civilDate: civilDateInIstanbul(now) });
    if (consent.state !== "no-document" && !consent.allowed) throw new Error(`Portfolyo dosyaya eklenemedi: ${consent.reason} Veli izinlerinden güncel belge kaydını kontrol edin veya portfolyo seçimini kaldırın.`);
  }
  const privacyContext = isExternalAiDossierDestination(
    input.options.destination,
  )
    ? compileDossierPrivacyContext(
        preimage.students.filter((candidate) =>
          studentBelongsToPrivacyScope(
            candidate,
            academicYearId,
            classroomId,
          ),
        ),
        input.studentId,
      )
    : undefined;
  const dossier = buildStudentDossier(
    archive,
    input.options,
    now,
    privacyContext,
  );
  const exportPackageId = crypto.randomUUID();
  const timestamp = now.toISOString();
  await store.transaction("readwrite", COLLECTION_NAMES, async (transaction) => {
    const current = createEmptySnapshot();
    await Promise.all(
      COLLECTION_NAMES.map(async (collection) => {
        current[collection] = await transaction.getAll(collection);
      }),
    );
    if (canonicalJson(current) !== preimageCanonical) {
      throw new Error(
        "Öğrenci dosyası hazırlanırken kaynak kayıtlar değişti; dosya oluşturulmadı.",
      );
    }
    assertDossierCreationChronology(
      current,
      dossier,
      input.studentId,
      academicYearId,
      classroomId,
      timestamp,
    );
    await transaction.putMany("exportPackages", [
      {
        id: exportPackageId,
        type: "student_dossier",
        studentIds: [input.studentId],
        periodStart: input.options.periodStart,
        periodEnd: input.options.periodEnd,
        anonymizationMode:
          input.options.identityMode === "alias"
            ? "student-alias"
            : "full-identity",
        includedEntityIds: dossier.includedEntityIds,
        manifest: dossier.manifest,
        createdFileIds: [],
        academicYearId,
        classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: civilDateInIstanbul(now),
        deletedAt: null,
        schemaVersion: 1,
      },
    ]);
  });
  const pdfSource = dossierPdfSources.get(dossier);
  if (pdfSource) pdfSource.assertExportAllowed = async selection => {
    const current = await store.readSnapshot();
    if (!current.students.some(s => s.id === input.studentId && typeof s.deletedAt !== "string")) throw new Error("Çocuk kaydı değişti. Belgeyi güncel kayıttan yeniden hazırlayın.");
    if (!selection.fields.includes("includePortfolio")) return;
    const consent = documentedSharingConsentSummary(current, { scope: { academicYearId, classroomId }, studentId: input.studentId, purpose: "portfolio-sharing", civilDate: civilDateInIstanbul(new Date()) });
    if (consent.state !== "no-document" && !consent.allowed) throw new Error(`Portfolyo paylaşım izni değişti: ${consent.reason} Belgeyi güncel izinle yeniden hazırlayın.`);
  };
  return { dossier, exportPackageId };
}

export async function saveExternalAiFeedback(
  store: LocalDataStore,
  input: {
    studentId: string;
    provider: ExternalAiFeedback["provider"];
    audience: DossierAudience;
    periodStart: string;
    periodEnd: string;
    feedbackText: string;
    teacherNote?: string;
    includeInTermSummary?: boolean;
    includeInYearSummary?: boolean;
    linkedExportPackageId?: string;
    now?: Date;
  },
): Promise<ExternalAiFeedback> {
  if (!UUID_PATTERN.test(input.studentId)) {
    throw new Error("Geri bildirim öğrenci kimliği geçersiz.");
  }
  if (
    !isCivilDate(input.periodStart) ||
    !isCivilDate(input.periodEnd) ||
    input.periodStart > input.periodEnd
  ) {
    throw new Error("Geri bildirim tarih aralığı geçersiz.");
  }
  if (!DOSSIER_AUDIENCES.includes(input.audience)) {
    throw new Error("Geri bildirim amacı geçersiz.");
  }
  if (
    input.provider !== "chatgpt" &&
    input.provider !== "gemini" &&
    input.provider !== "other"
  ) {
    throw new Error("Geri bildirim sağlayıcısı geçersiz.");
  }
  const feedbackText = input.feedbackText.trim();
  if (!feedbackText || feedbackText.length > 50_000) {
    throw new Error("Geri bildirim 1–50.000 karakter arasında olmalıdır.");
  }
  const teacherNote = input.teacherNote?.trim();
  if (teacherNote && teacherNote.length > 5_000) {
    throw new Error("Öğretmen notu 5.000 karakterden uzun olamaz.");
  }
  if (
    input.linkedExportPackageId &&
    !UUID_PATTERN.test(input.linkedExportPackageId)
  ) {
    throw new Error("Bağlı dışa aktarım paketi kimliği geçersiz.");
  }
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  const id = crypto.randomUUID();
  const contentHash = await sha256Hex(feedbackText);
  await store.transaction(
    "readwrite",
    ["academicYears", "students", "exportPackages", "externalFeedback"],
    async (transaction) => {
      const [academicYears, students, exportPackages] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("students"),
        transaction.getAll("exportPackages"),
      ]);
      const student = students.find((record) => record.id === input.studentId);
      if (
        !student ||
        typeof student.academicYearId !== "string" ||
        typeof student.classroomId !== "string"
      ) {
        throw new Error("Geri bildirim kaydedilecek öğrenci bulunamadı.");
      }
      const academicYear = academicYears.find(
        (record) => record.id === student.academicYearId,
      );
      if (
        !academicYear ||
        academicYear.status !== "active" ||
        !isCivilDate(String(academicYear.startDate ?? "")) ||
        !isCivilDate(String(academicYear.endDate ?? "")) ||
        input.periodStart < String(academicYear.startDate) ||
        input.periodEnd > String(academicYear.endDate)
      ) {
        throw new Error(
          "Geri bildirim dönemi öğrencinin aktif eğitim yılı içinde olmalıdır.",
        );
      }
      if (
        (input.provider === "chatgpt" || input.provider === "gemini") &&
        !input.linkedExportPackageId
      ) {
        throw new Error(
          "ChatGPT/Gemini geri bildirimi için kaynak dışa aktarım paketi zorunludur.",
        );
      }
      const linkedPackage = input.linkedExportPackageId
        ? exportPackages.find(
            (record) => record.id === input.linkedExportPackageId,
          )
        : undefined;
      const linkedManifest =
        linkedPackage?.manifest &&
        typeof linkedPackage.manifest === "object" &&
        !Array.isArray(linkedPackage.manifest)
          ? (linkedPackage.manifest as Record<string, unknown>)
          : undefined;
      if (
        input.linkedExportPackageId &&
        (!linkedPackage ||
          linkedPackage.type !== "student_dossier" ||
          !Array.isArray(linkedPackage.studentIds) ||
          !linkedPackage.studentIds.includes(input.studentId) ||
          linkedPackage.academicYearId !== student.academicYearId ||
          linkedPackage.classroomId !== student.classroomId ||
          linkedPackage.periodStart !== input.periodStart ||
          linkedPackage.periodEnd !== input.periodEnd ||
          linkedManifest?.packageKind !== "student_dossier" ||
          linkedManifest.audience !== input.audience ||
          linkedManifest.purpose !== input.audience ||
          linkedManifest.periodStart !== input.periodStart ||
          linkedManifest.periodEnd !== input.periodEnd ||
          linkedManifest.academicYearId !== student.academicYearId ||
          linkedManifest.classroomId !== student.classroomId ||
          (input.provider !== "other" &&
            (linkedManifest.destination !== input.provider ||
              linkedManifest.provider !== input.provider)))
      ) {
        throw new Error(
          "Bağlı dışa aktarım paketi öğrenci, sağlayıcı, alıcı, dönem veya kapsamla uyuşmuyor.",
        );
      }
      await transaction.putMany("externalFeedback", [
        {
          id,
          studentId: input.studentId,
          provider: input.provider,
          audience: input.audience,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          receivedAt: timestamp,
          rawTextImmutable: true,
          contentHash,
          feedbackText,
          ...(teacherNote ? { teacherNote } : {}),
          includeInTermSummary: input.includeInTermSummary === true,
          includeInYearSummary: input.includeInYearSummary === true,
          ...(input.linkedExportPackageId
            ? { linkedExportPackageId: input.linkedExportPackageId }
            : {}),
          reviewStatus: "teacher-saved",
          academicYearId: student.academicYearId,
          classroomId: student.classroomId,
          createdAt: timestamp,
          updatedAt: timestamp,
          civilDate: civilDateInIstanbul(now),
          deletedAt: null,
          schemaVersion: 1,
        },
      ]);
    },
  );
  return {
    id,
    provider: input.provider,
    audience: input.audience,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    receivedAt: timestamp,
    feedbackText,
    ...(teacherNote ? { teacherNote } : {}),
    includeInTermSummary: input.includeInTermSummary === true,
    includeInYearSummary: input.includeInYearSummary === true,
    ...(input.linkedExportPackageId
      ? { linkedExportPackageId: input.linkedExportPackageId }
      : {}),
  };
}

export function buildExternalFeedbackAggregation(
  snapshot: DataSnapshot,
  input: {
    kind: "term" | "year";
    studentId: string;
    academicYearId: string;
    periodStart: string;
    periodEnd: string;
  },
): ExternalFeedbackAggregation {
  if (
    !UUID_PATTERN.test(input.studentId) ||
    !UUID_PATTERN.test(input.academicYearId) ||
    !isCivilDate(input.periodStart) ||
    !isCivilDate(input.periodEnd) ||
    input.periodStart > input.periodEnd
  ) {
    throw new Error("Geri bildirim toplama kapsamı geçersiz.");
  }
  const student = snapshot.students.find(
    (record) => record.id === input.studentId,
  );
  const academicYear = snapshot.academicYears.find(
    (record) => record.id === input.academicYearId,
  );
  if (
    !student ||
    !academicYear ||
    !isCivilDate(String(academicYear.startDate ?? "")) ||
    !isCivilDate(String(academicYear.endDate ?? "")) ||
    input.periodStart < String(academicYear.startDate) ||
    input.periodEnd > String(academicYear.endDate) ||
    !(
      student.academicYearId === input.academicYearId ||
      (Array.isArray(student.enrollments) &&
        student.enrollments.some(
          (enrollment) =>
            enrollment &&
            typeof enrollment === "object" &&
            (enrollment as Record<string, unknown>).academicYearId ===
              input.academicYearId,
        ))
    )
  ) {
    throw new Error(
      "Geri bildirim toplama dönemi öğrencinin eğitim yılı kapsamıyla uyuşmuyor.",
    );
  }
  const includeFlag =
    input.kind === "term" ? "includeInTermSummary" : "includeInYearSummary";
  const records = snapshot.externalFeedback
    .filter(
      (record) =>
        record.studentId === input.studentId &&
        record.academicYearId === input.academicYearId &&
        record[includeFlag] === true &&
        typeof record.deletedAt !== "string" &&
        typeof record.periodStart === "string" &&
        typeof record.periodEnd === "string" &&
        record.periodStart <= input.periodEnd &&
        record.periodEnd >= input.periodStart,
    )
    .sort(
      (left, right) =>
        String(left.receivedAt ?? "").localeCompare(
          String(right.receivedAt ?? ""),
        ) || left.id.localeCompare(right.id),
    );
  return {
    kind: input.kind,
    studentId: input.studentId,
    academicYearId: input.academicYearId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    feedbackIds: records.map((record) => record.id),
    contentHashes: records.map((record) => String(record.contentHash ?? "")),
    text: records
      .map(
        (record, index) =>
          `${index + 1}. ${String(record.provider).toLocaleUpperCase("tr-TR")} · ${record.periodStart}–${record.periodEnd}\n${String(record.feedbackText)}`,
      )
      .join("\n\n"),
  };
}
