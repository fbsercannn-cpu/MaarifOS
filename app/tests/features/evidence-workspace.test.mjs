import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { CURRICULUM_PROGRAM_LABELS } from "../../src/features/evidence/evidence-flow.ts";
import {
  curriculumFrameworkForProgram,
  resolveEvidenceWorkspace,
} from "../../src/features/evidence/evidence-workspace.ts";

const yearId = "00000000-0000-4000-8000-000000000501";
const classroomId = "00000000-0000-4000-8000-000000000502";
const otherClassroomId = "00000000-0000-4000-8000-000000000503";
const studentId = "00000000-0000-4000-8000-000000000504";
const planId = "00000000-0000-4000-8000-000000000505";
const todayActivityId = "00000000-0000-4000-8000-000000000506";
const pastActivityId = "00000000-0000-4000-8000-000000000507";
const linkedObservationId = "00000000-0000-4000-8000-000000000508";
const pendingObservationId = "00000000-0000-4000-8000-000000000509";

const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  deletedAt: null,
  schemaVersion: 1,
};

function workspaceSnapshot() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026-2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
    civilDate: "2026-09-01",
  });
  snapshot.classrooms.push(
    {
      ...base,
      id: classroomId,
      academicYearId: yearId,
      name: "Kurgu Aktif Sınıf",
      civilDate: "2026-09-01",
      schemaVersion: 2,
    },
    {
      ...base,
      id: otherClassroomId,
      academicYearId: yearId,
      name: "Kurgu Diğer Sınıf",
      civilDate: "2026-09-01",
      schemaVersion: 2,
    },
  );
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
    civilDate: "2026-09-01",
  });
  snapshot.students.push({
    ...base,
    id: studentId,
    academicYearId: yearId,
    classroomId,
    displayName: "Kurgu Çocuk",
    enrollmentStatus: "active",
    civilDate: "2026-09-01",
  });
  snapshot.plans.push({
    ...base,
    id: planId,
    academicYearId: yearId,
    classroomId,
    title: "Kurgu plan",
    curriculumProfileSnapshot: {
      framework: "meb_2024",
      programLabel: CURRICULUM_PROGRAM_LABELS.meb_2024,
      catalogId: "ogretmen-beyani-ece",
      sourceVersion: "2024.1",
    },
    civilDate: "2026-09-02",
  });
  snapshot.activities.push(
    {
      ...base,
      id: todayActivityId,
      planId,
      academicYearId: yearId,
      classroomId,
      title: "Bugünkü kurgu etkinliği",
      startTime: "09:15",
      status: "in_progress",
      civilDate: "2026-09-02",
    },
    {
      ...base,
      id: pastActivityId,
      planId,
      academicYearId: yearId,
      classroomId,
      title: "Dünkü kurgu etkinliği",
      startTime: "10:00",
      status: "completed",
      civilDate: "2026-09-01",
    },
  );
  snapshot.observations.push(
    {
      ...base,
      id: linkedObservationId,
      academicYearId: yearId,
      classroomId,
      studentIds: [studentId],
      planId,
      activityId: todayActivityId,
      rawText: "Çocuk şekilleri iki ayrı gruba yerleştirdi.",
      context: "  Masa etkinliği sırasında  ",
      childQuote: "  “Bunlar aynı.”  ",
      observationType: "anecdotal",
      observationCategories: ["cognitive", "language-communication"],
      rawTextImmutable: true,
      observedAt: "2026-09-02T07:00:00.000Z",
      civilDate: "2026-09-02",
      schemaVersion: 2,
    },
    {
      ...base,
      id: pendingObservationId,
      academicYearId: yearId,
      classroomId,
      studentIds: [studentId],
      planId,
      activityId: pastActivityId,
      rawText: "Çocuk önceki gün iki yaprağı yan yana koydu.",
      rawTextImmutable: true,
      observedAt: "2026-09-01T07:00:00.000Z",
      civilDate: "2026-09-01",
      schemaVersion: 2,
    },
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000510",
      academicYearId: yearId,
      classroomId,
      studentIds: [studentId],
      rawText: "Eski tek alanlı kayıt read-model'e girmemeli.",
      civilDate: "2026-09-02",
    },
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000511",
      academicYearId: yearId,
      classroomId: otherClassroomId,
      studentIds: [studentId],
      planId,
      activityId: todayActivityId,
      rawText: "Başka sınıf kaydı.",
      rawTextImmutable: true,
      observedAt: "2026-09-02T07:10:00.000Z",
      civilDate: "2026-09-02",
      schemaVersion: 2,
    },
  );
  snapshot.evidenceCurriculumLinks.push(
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000512",
      observationId: linkedObservationId,
      academicYearId: yearId,
      classroomId,
      confirmationMethod: "teacher-confirmed",
      referenceCode: "EÇE-KURGU-01",
      referenceTitle: "Kurgu öğretmen program beyanı",
      framework: "meb_2024",
      catalogId: "ogretmen-beyani-ece",
      sourceVersion: "2024.1",
      referenceOrigin: "teacher-declared",
      officialCatalogVerified: false,
      civilDate: "2026-09-02",
    },
    {
      ...base,
      id: "00000000-0000-4000-8000-000000000513",
      observationId: pendingObservationId,
      academicYearId: yearId,
      classroomId,
      confirmationMethod: "teacher-confirmed",
      referenceCode: "EÇE-SİLİNMİŞ",
      deletedAt: "2026-09-02T08:00:00.000Z",
      civilDate: "2026-09-02",
    },
  );
  return snapshot;
}

test("D1 read-model yalnız aktif sınıfın yapılandırılmış kanıtlarını ayırır", () => {
  const workspace = resolveEvidenceWorkspace(
    workspaceSnapshot(),
    new Date("2026-09-02T09:00:00.000Z"),
  );

  assert.equal(workspace.civilDate, "2026-09-02");
  assert.deepEqual(workspace.activities.map((activity) => activity.id), [todayActivityId]);
  assert.deepEqual(
    workspace.linkedObservations.map((observation) => observation.id),
    [linkedObservationId],
  );
  assert.deepEqual(
    workspace.pendingObservations.map((observation) => observation.id),
    [pendingObservationId],
  );
  assert.equal(workspace.linkedObservations[0].studentName, "Kurgu Çocuk");
  assert.equal(
    workspace.linkedObservations[0].context,
    "  Masa etkinliği sırasında  ",
  );
  assert.equal(workspace.linkedObservations[0].childQuote, "  “Bunlar aynı.”  ");
  assert.equal(workspace.linkedObservations[0].observationType, "anecdotal");
  assert.deepEqual(workspace.linkedObservations[0].observationCategories, [
    "cognitive",
    "language-communication",
  ]);
  assert.deepEqual(workspace.linkedObservations[0].curriculumProfile, {
    framework: "meb_2024",
    programLabel: CURRICULUM_PROGRAM_LABELS.meb_2024,
    catalogId: "ogretmen-beyani-ece",
    sourceVersion: "2024.1",
    referenceOrigin: "teacher-declared",
    officialCatalogVerified: false,
  });
  assert.equal(
    workspace.pendingObservations[0].workflowStatus,
    "program-bağlantısı-bekliyor",
  );
  assert.equal(
    workspace.linkedObservations[0].workflowStatus,
    "değerlendirme-bekliyor",
  );
  assert.deepEqual(workspace.linkedObservations[0].assessmentDraftIds, []);
  assert.deepEqual(
    workspace.linkedObservations[0].confirmedCurriculumTargets,
    [
      {
        id: "00000000-0000-4000-8000-000000000512",
        framework: "meb_2024",
        catalogId: "ogretmen-beyani-ece",
        sourceVersion: "2024.1",
        referenceCode: "EÇE-KURGU-01",
        referenceTitle: "Kurgu öğretmen program beyanı",
        kind: "learning-outcome",
        domain: "Öğretmen beyanı",
        sourceUrl: "about:blank",
        sourceLabel: "Öğretmen beyanı · resmî katalogda doğrulanmadı",
        sourceCheckedOn: "2026-09-02",
        catalogCompleteness: "partial",
        verificationStatus: "teacher-declared-unverified",
        referenceOrigin: "teacher-declared",
        officialCatalogVerified: false,
      },
    ],
  );
});

test("kaynaklı öğretmen değerlendirmesi gözlem zincirini tamamlanmış yapar", () => {
  const snapshot = workspaceSnapshot();
  const assessmentDraftId = "00000000-0000-4000-8000-000000000514";
  snapshot.reportDrafts.push({
    ...base,
    id: assessmentDraftId,
    academicYearId: yearId,
    classroomId,
    reportType: "evidence-assessment",
    status: "teacher-review-required",
    authoredBy: "teacher",
    observationIds: [linkedObservationId],
    teacherAssessmentText:
      "Seçili gözlem, çocuğun iki grubu ayırarak sürdürdüğünü gösteriyor.",
    civilDate: "2026-09-02",
  });

  const workspace = resolveEvidenceWorkspace(
    snapshot,
    new Date("2026-09-02T09:00:00.000Z"),
  );
  assert.equal(workspace.linkedObservations[0].workflowStatus, "tamamlandı");
  assert.deepEqual(workspace.linkedObservations[0].assessmentDraftIds, [
    assessmentDraftId,
  ]);
});

test("program adı çözümlemesi TYMM içindeki 2024 ifadesini EÇE sanmaz", () => {
  assert.equal(curriculumFrameworkForProgram("TYMM 2024 okul öncesi"), "tymm");
  assert.equal(
    curriculumFrameworkForProgram("Okul Öncesi Eğitim Programı — EÇE/2024"),
    "meb_2024",
  );
  assert.equal(curriculumFrameworkForProgram(undefined), "tymm");
});
