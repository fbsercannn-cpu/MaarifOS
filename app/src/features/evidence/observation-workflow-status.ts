import type { StoredRecord } from "../../core/domain/model.ts";
import type { CurriculumTargetSnapshot } from "../curriculum/curriculum-catalog.ts";
import type { CurriculumProfileSnapshot } from "./evidence-flow.ts";

export const CANONICAL_OBSERVATION_WORKFLOW = [
  "gözlem-alındı",
  "program-bağlantısı-bekliyor",
  "değerlendirme-bekliyor",
  "tamamlandı",
] as const;

export type ObservationWorkflowStatus =
  (typeof CANONICAL_OBSERVATION_WORKFLOW)[number];

export const OBSERVATION_WORKFLOW_STATUS_LABELS: Readonly<
  Record<ObservationWorkflowStatus, string>
> = Object.freeze({
  "gözlem-alındı": "Gözlem alındı",
  "program-bağlantısı-bekliyor": "Program bağlantısı bekliyor",
  "değerlendirme-bekliyor": "Değerlendirme bekliyor",
  tamamlandı: "Gözlem zinciri tamamlandı",
});

function isLiveRecord(record: StoredRecord): boolean {
  return typeof record.deletedAt !== "string";
}

export function isTeacherConfirmedObservationLink(
  record: StoredRecord,
  observationId: string,
): boolean {
  return (
    isLiveRecord(record) &&
    record.observationId === observationId &&
    record.confirmationMethod === "teacher-confirmed"
  );
}

export function isCitedObservationAssessmentDraft(
  record: StoredRecord,
  observationId: string,
): boolean {
  return (
    isLiveRecord(record) &&
    record.reportType === "evidence-assessment" &&
    record.status === "teacher-review-required" &&
    record.authoredBy === "teacher" &&
    typeof record.teacherAssessmentText === "string" &&
    record.teacherAssessmentText.trim().length > 0 &&
    Array.isArray(record.observationIds) &&
    record.observationIds.includes(observationId)
  );
}

export function observationAssessmentDraftIds(
  reportDrafts: readonly StoredRecord[],
  observationId: string,
): string[] {
  return reportDrafts
    .filter((record) =>
      isCitedObservationAssessmentDraft(record, observationId),
    )
    .map((record) => record.id)
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Ham gözlem, bağlantı ve değerlendirme taslağını tek bir görünür iş durumuna
 * indirger. `gözlem-alındı` zincirin değişmez ilk olayıdır; kalıcı read-modelde
 * sıradaki öğretmen işi varsa bekleyen adım, bütün işler bittiyse `tamamlandı`
 * döner.
 */
export function deriveObservationWorkflowStatus(input: {
  observationId: string;
  curriculumLinks: readonly StoredRecord[];
  reportDrafts: readonly StoredRecord[];
}): ObservationWorkflowStatus {
  const curriculumLinked = input.curriculumLinks.some((record) =>
    isTeacherConfirmedObservationLink(record, input.observationId),
  );
  if (!curriculumLinked) return "program-bağlantısı-bekliyor";

  const assessmentCompleted = input.reportDrafts.some((record) =>
    isCitedObservationAssessmentDraft(record, input.observationId),
  );
  return assessmentCompleted ? "tamamlandı" : "değerlendirme-bekliyor";
}

export interface ObservationCurriculumLinkCommand {
  observationId: string;
  framework: CurriculumTargetSnapshot["framework"];
  catalogId: string;
  sourceVersion: string;
  referenceCode: string;
  referenceTitle: string;
  referenceOrigin: CurriculumTargetSnapshot["referenceOrigin"];
  officialCatalogVerified: boolean;
  plannedTargetId?: string;
}

/**
 * Kaydetme komutunun resmîlik bilgisini plan profilinden değil, öğretmenin
 * seçtiği hedef snapshot'ından alır. Böylece `about:blank` kaynaklı eski veya
 * plansız öğretmen beyanı hiçbir zaman resmî doğrulanmış gibi işaretlenmez.
 */
export function createObservationCurriculumLinkCommand(
  observation: {
    id: string;
    curriculumProfile: CurriculumProfileSnapshot;
    plannedCurriculumTargets: readonly CurriculumTargetSnapshot[];
  },
  target: CurriculumTargetSnapshot,
): ObservationCurriculumLinkCommand {
  const plannedTarget = observation.plannedCurriculumTargets.find(
    (candidate) =>
      candidate.id === target.id &&
      candidate.framework === target.framework &&
      candidate.catalogId === target.catalogId &&
      candidate.sourceVersion === target.sourceVersion &&
      candidate.referenceCode === target.referenceCode &&
      candidate.referenceTitle === target.referenceTitle &&
      candidate.referenceOrigin === target.referenceOrigin &&
      candidate.officialCatalogVerified === target.officialCatalogVerified,
  );

  return {
    observationId: observation.id,
    framework: target.framework,
    catalogId: target.catalogId,
    sourceVersion: target.sourceVersion,
    referenceCode: target.referenceCode,
    referenceTitle: target.referenceTitle,
    referenceOrigin: target.referenceOrigin,
    officialCatalogVerified: target.officialCatalogVerified,
    ...(plannedTarget ? { plannedTargetId: plannedTarget.id } : {}),
  };
}
