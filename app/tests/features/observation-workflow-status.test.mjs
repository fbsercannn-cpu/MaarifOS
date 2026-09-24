import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_OBSERVATION_WORKFLOW,
  createObservationCurriculumLinkCommand,
  deriveObservationWorkflowStatus,
  observationAssessmentDraftIds,
} from "../../src/features/evidence/observation-workflow-status.ts";

const observationId = "00000000-0000-4000-8000-000000000701";
const linkId = "00000000-0000-4000-8000-000000000702";
const draftId = "00000000-0000-4000-8000-000000000703";
const timestamp = "2026-09-02T07:00:00.000Z";

const base = {
  createdAt: timestamp,
  updatedAt: timestamp,
  civilDate: "2026-09-02",
  deletedAt: null,
  schemaVersion: 1,
};

function confirmedLink(overrides = {}) {
  return {
    ...base,
    id: linkId,
    observationId,
    confirmationMethod: "teacher-confirmed",
    ...overrides,
  };
}

function citedDraft(overrides = {}) {
  return {
    ...base,
    id: draftId,
    reportType: "evidence-assessment",
    status: "teacher-review-required",
    authoredBy: "teacher",
    observationIds: [observationId],
    teacherAssessmentText: "Seçili gözlem, çocuğun sıralamayı sürdürdüğünü gösteriyor.",
    ...overrides,
  };
}

test("gözlem read-modeli bağlantı ve değerlendirme kaydından kanonik durumu türetir", () => {
  assert.deepEqual(CANONICAL_OBSERVATION_WORKFLOW, [
    "gözlem-alındı",
    "program-bağlantısı-bekliyor",
    "değerlendirme-bekliyor",
    "tamamlandı",
  ]);
  assert.equal(
    deriveObservationWorkflowStatus({
      observationId,
      curriculumLinks: [],
      reportDrafts: [],
    }),
    "program-bağlantısı-bekliyor",
  );
  assert.equal(
    deriveObservationWorkflowStatus({
      observationId,
      curriculumLinks: [confirmedLink()],
      reportDrafts: [],
    }),
    "değerlendirme-bekliyor",
  );
  assert.equal(
    deriveObservationWorkflowStatus({
      observationId,
      curriculumLinks: [confirmedLink()],
      reportDrafts: [citedDraft()],
    }),
    "tamamlandı",
  );
});

test("silinmiş bağ ve eksik değerlendirme taslağı işi tamamlanmış göstermez", () => {
  assert.equal(
    deriveObservationWorkflowStatus({
      observationId,
      curriculumLinks: [
        confirmedLink({ deletedAt: "2026-09-02T08:00:00.000Z" }),
      ],
      reportDrafts: [citedDraft()],
    }),
    "program-bağlantısı-bekliyor",
  );
  assert.equal(
    deriveObservationWorkflowStatus({
      observationId,
      curriculumLinks: [confirmedLink()],
      reportDrafts: [citedDraft({ teacherAssessmentText: " " })],
    }),
    "değerlendirme-bekliyor",
  );
  assert.deepEqual(
    observationAssessmentDraftIds(
      [
        citedDraft(),
        citedDraft({
          id: "00000000-0000-4000-8000-000000000704",
          deletedAt: "2026-09-02T08:00:00.000Z",
        }),
      ],
      observationId,
    ),
    [draftId],
  );
});

const officialProfile = {
  framework: "tymm",
  programLabel: "Türkiye Yüzyılı Maarif Modeli",
  catalogId: "tymm-okul-oncesi-2024",
  sourceVersion: "2024",
  referenceOrigin: "official-catalog",
  officialCatalogVerified: true,
};

const officialTarget = {
  id: "tymm-mab-1",
  framework: "tymm",
  catalogId: officialProfile.catalogId,
  sourceVersion: officialProfile.sourceVersion,
  referenceCode: "MAB.1",
  referenceTitle: "Ritmik ve algısal sayabilme",
  kind: "learning-outcome",
  domain: "Matematik",
  sourceUrl: "https://tymm.meb.gov.tr/",
  sourceLabel: "TYMM Okul Öncesi Eğitim Programı",
  sourceCheckedOn: "2026-08-28",
  catalogCompleteness: "complete",
  verificationStatus: "official-source-checked",
  referenceOrigin: "official-catalog",
  officialCatalogVerified: true,
};

test("bağlantı komutu resmîlik bilgisini seçili hedef snapshot'ından taşır", () => {
  const observation = {
    id: observationId,
    curriculumProfile: officialProfile,
    plannedCurriculumTargets: [officialTarget],
  };
  assert.deepEqual(
    createObservationCurriculumLinkCommand(observation, officialTarget),
    {
      observationId,
      framework: "tymm",
      catalogId: officialProfile.catalogId,
      sourceVersion: "2024",
      referenceCode: "MAB.1",
      referenceTitle: "Ritmik ve algısal sayabilme",
      referenceOrigin: "official-catalog",
      officialCatalogVerified: true,
      plannedTargetId: "tymm-mab-1",
    },
  );

  const manualTarget = {
    ...officialTarget,
    id: `legacy-teacher-declared-${observationId}`,
    referenceCode: "ÖĞR-BEYAN-1",
    referenceTitle: "Öğretmenin gözlem sonrası yazdığı referans",
    domain: "Öğretmen beyanı",
    sourceUrl: "about:blank",
    sourceLabel: "Eski plan kaydı · öğretmen beyanı",
    catalogCompleteness: "partial",
    verificationStatus: "teacher-declared-unverified",
    referenceOrigin: "teacher-declared",
    officialCatalogVerified: false,
  };
  assert.deepEqual(
    createObservationCurriculumLinkCommand(observation, manualTarget),
    {
      observationId,
      framework: "tymm",
      catalogId: officialProfile.catalogId,
      sourceVersion: "2024",
      referenceCode: "ÖĞR-BEYAN-1",
      referenceTitle: "Öğretmenin gözlem sonrası yazdığı referans",
      referenceOrigin: "teacher-declared",
      officialCatalogVerified: false,
    },
  );
});
