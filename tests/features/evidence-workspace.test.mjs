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
import {
  getDevelopmentObservationPresets,
  resolveDevelopmentObservationProgramMapping,
} from "../../src/features/evidence/development-observation-presets.ts";
import { buildStudentObservationExport } from "../../src/features/students/student-profile-tools.ts";
import { developmentObservationGraphReference } from "../../src/features/evidence/development-observation-graph-references.ts";

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

test("read-model yalnız doğrulanmış TYMM alan ipucunu bağlama taşır ve hedef üretmez", () => {
  const snapshot = workspaceSnapshot();
  snapshot.activities[0].observationDomainHint = "Hareket ve Sağlık";
  const workspace = resolveEvidenceWorkspace(
    snapshot,
    new Date("2026-09-02T09:00:00.000Z"),
  );
  assert.equal(workspace.activities[0].observationDomainHint, "Hareket ve Sağlık");
  assert.deepEqual(workspace.activities[0].curriculumTargets, []);

  snapshot.activities[0].observationDomainHint = "Beden";
  const invalid = resolveEvidenceWorkspace(
    snapshot,
    new Date("2026-09-02T09:00:00.000Z"),
  );
  assert.equal(
    Object.hasOwn(invalid.activities[0], "observationDomainHint"),
    false,
  );
  assert.deepEqual(invalid.activities[0].curriculumTargets, []);
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

function developmentWorkspaceSnapshot(ageBand = "48-60") {
  const snapshot = workspaceSnapshot();
  const preset = getDevelopmentObservationPresets(ageBand)[0];
  const selection = { presetId: preset.id, ageBand, support: "with-reminder" };
  const { target, profile } = resolveDevelopmentObservationProgramMapping(preset.id, ageBand);
  snapshot.classrooms[0].ageGroup = `${ageBand} ay`;
  Object.assign(snapshot.plans[0], {
    title: "Anlık gözlemler",
    planType: "spontaneous-observation",
    curriculumProfileSnapshot: profile,
    curriculumTargets: [],
    maarifRefs: [],
  });
  Object.assign(snapshot.activities[0], {
    title: "Anlık gözlemler",
    activityKind: "spontaneous-observation",
    curriculumProfileSnapshot: profile,
    curriculumTargets: [],
    maarifRefs: [],
  });
  snapshot.observations = [{
    ...snapshot.observations[0],
    developmentSelection: selection,
    observationType: "systematic",
    rawText: "Çocuk masadaki resmi göstererek gördüğü nesneyi kendi sözüyle anlattı.",
    context: "Öğretmenin kaydettiği olay bağlamı.",
  }];
  snapshot.evidenceCurriculumLinks = [{
    ...snapshot.evidenceCurriculumLinks[0],
    ...profile,
    referenceCode: target.referenceCode,
    referenceTitle: target.referenceTitle,
    targetKind: target.kind,
    targetDomain: target.domain,
    targetSourceUrl: target.sourceUrl,
    targetSourcePage: target.sourcePage,
    targetSourceSha256: target.sourceSha256,
    targetSnapshot: structuredClone(target),
    holisticGraphReference: developmentObservationGraphReference(ageBand, target.referenceCode),
    developmentSelection: structuredClone(selection),
  }];
  return { snapshot, target };
}

test("üç yaş bandında öğretmenin gelişim seçimi anlık hedef uydurmadan kaynaklı bağlı gözlem olur", () => {
  for (const ageBand of ["36-48", "48-60", "60-72"]) {
    const { snapshot, target } = developmentWorkspaceSnapshot(ageBand);
    const before = structuredClone(snapshot);
    const workspace = resolveEvidenceWorkspace(snapshot, new Date("2026-09-02T09:00:00.000Z"));
    assert.equal(workspace.pendingObservations.length, 0);
    assert.equal(workspace.linkedObservations.length, 1);
    const observation = workspace.linkedObservations[0];
    assert.deepEqual(observation.confirmedCurriculumTargets, [target]);
    assert.deepEqual(observation.confirmedCurriculumLinkIds, [snapshot.evidenceCurriculumLinks[0].id]);
    assert.deepEqual(observation.plannedCurriculumTargets, []);
    assert.equal(workspace.activities[0].contextKind, "spontaneous-observation");
    assert.deepEqual(workspace.activities[0].curriculumTargets, []);
    assert.equal(observation.rawText, snapshot.observations[0].rawText);
    assert.equal(observation.context, snapshot.observations[0].context);
    assert.deepEqual(observation.developmentSelection, snapshot.observations[0].developmentSelection);
    assert.equal(observation.developmentSupportLabel, "Hatırlatmayla");
    assert.doesNotMatch(observation.context, /Hatırlatmayla/u);
    assert.equal(observation.workflowStatus, "değerlendirme-bekliyor");
    assert.deepEqual(observation.assessmentDraftIds, []);
    assert.equal(observation.assessmentLevel, undefined);
    assert.deepEqual(snapshot, before);
  }
});

test("çocuk profilinin metin çıktısı kalıcı gelişim bağını bekleyen bağlantı olarak göstermez", () => {
  const { snapshot } = developmentWorkspaceSnapshot();
  const workspace = resolveEvidenceWorkspace(snapshot, new Date("2026-09-02T09:00:00.000Z"));
  const output = buildStudentObservationExport(
    { id: studentId, name: "Kurgu Çocuk" },
    workspace.linkedObservations,
    new Date("2026-09-02T09:00:00.000Z"),
  );
  assert.match(output, /Program bağlantısı tamamlandı/u);
  assert.doesNotMatch(output, /Program bağlantısı bekliyor/u);
  assert.ok(output.includes(snapshot.observations[0].rawText));
  assert.equal(snapshot.reportDrafts.length, 0);
});

test("bozuk gelişim snapshot'ı, farklı olay seçimi ve uydurma plan hedefi onaylı sayılmaz", () => {
  const mutations = [
    (snapshot) => { snapshot.evidenceCurriculumLinks[0].targetSnapshot.referenceTitle = "Kaynakta bulunmayan başlık"; },
    (snapshot) => { snapshot.evidenceCurriculumLinks[0].targetSnapshot.sourceSha256 = "0".repeat(64); },
    (snapshot) => { snapshot.evidenceCurriculumLinks[0].targetSourceSha256 = "0".repeat(64); },
    (snapshot) => { snapshot.evidenceCurriculumLinks[0].holisticGraphReference = developmentObservationGraphReference("60-72", "MHB.3"); },
    (snapshot) => { snapshot.evidenceCurriculumLinks[0].holisticGraphReference.relatedNodeIds.pop(); },
    (snapshot) => { snapshot.evidenceCurriculumLinks[0].developmentSelection.ageBand = "60-72"; },
    (snapshot) => { snapshot.observations[0].developmentSelection.support = "together"; },
    (snapshot) => { snapshot.observations[0].developmentSelection.presetId = getDevelopmentObservationPresets("48-60")[1].id; },
    (snapshot) => { delete snapshot.observations[0].developmentSelection; },
    (snapshot) => { snapshot.evidenceCurriculumLinks[0].plannedTargetId = snapshot.evidenceCurriculumLinks[0].targetSnapshot.id; },
    (snapshot) => { snapshot.evidenceCurriculumLinks[0].confirmationMethod = "suggested"; },
    (snapshot) => {
      delete snapshot.evidenceCurriculumLinks[0].developmentSelection;
      delete snapshot.evidenceCurriculumLinks[0].targetSnapshot;
    },
    (snapshot) => {
      const legacyProfile = workspaceSnapshot().plans[0].curriculumProfileSnapshot;
      snapshot.plans[0].curriculumProfileSnapshot = legacyProfile;
      snapshot.activities[0].curriculumProfileSnapshot = legacyProfile;
    },
    (snapshot) => { snapshot.plans[0].curriculumTargets = [snapshot.evidenceCurriculumLinks[0].targetSnapshot]; },
    (snapshot) => { snapshot.activities[0].curriculumTargets = [snapshot.evidenceCurriculumLinks[0].targetSnapshot]; },
  ];
  for (const mutate of mutations) {
    const { snapshot } = developmentWorkspaceSnapshot();
    mutate(snapshot);
    const workspace = resolveEvidenceWorkspace(snapshot, new Date("2026-09-02T09:00:00.000Z"));
    assert.deepEqual(workspace.linkedObservations, []);
    assert.equal(workspace.pendingObservations.length, 1);
    assert.deepEqual(workspace.pendingObservations[0].confirmedCurriculumTargets, []);
    assert.equal(workspace.pendingObservations[0].workflowStatus, "program-bağlantısı-bekliyor");
  }
});

test("sınıfın yaşı sonradan değişse de olay tarihindeki doğrulanmış gelişim bağı korunur", () => {
  const { snapshot, target } = developmentWorkspaceSnapshot("48-60");
  snapshot.classrooms[0].ageGroup = "60-72 ay";
  const workspace = resolveEvidenceWorkspace(snapshot, new Date("2026-09-02T09:00:00.000Z"));
  assert.deepEqual(workspace.linkedObservations[0].confirmedCurriculumTargets, [target]);
});

test("eski planlı resmî hedef bağlantısı gelişim kaydı zorunluluğuna dönüştürülmez", () => {
  const { snapshot, target } = developmentWorkspaceSnapshot();
  delete snapshot.observations[0].developmentSelection;
  delete snapshot.evidenceCurriculumLinks[0].developmentSelection;
  delete snapshot.evidenceCurriculumLinks[0].targetSnapshot;
  snapshot.evidenceCurriculumLinks[0].plannedTargetId = target.id;
  snapshot.activities[0].activityKind = "planned-activity";
  snapshot.activities[0].curriculumTargets = [target];
  snapshot.plans[0].planType = "daily";
  snapshot.plans[0].curriculumTargets = [target];
  const workspace = resolveEvidenceWorkspace(snapshot, new Date("2026-09-02T09:00:00.000Z"));
  assert.equal(workspace.linkedObservations.length, 1);
  assert.deepEqual(workspace.linkedObservations[0].plannedCurriculumTargets, [target]);
  assert.deepEqual(workspace.linkedObservations[0].confirmedCurriculumTargets, [target]);
});
