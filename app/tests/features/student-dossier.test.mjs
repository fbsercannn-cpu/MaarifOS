import assert from "node:assert/strict";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  ANECDOTE_FORM_SCHEMA_VERSION,
  createAnecdoteApprovalSeal,
} from "../../src/features/anecdote/anecdote-form.ts";
import {
  buildExternalFeedbackAggregation,
  buildStudentDossier,
  createStudentDossier,
  dossierPrivacyDefaults,
  listExternalAiFeedback,
  saveExternalAiFeedback,
} from "../../src/features/reports/student-dossier.ts";

class MemoryStore {
  snapshot;

  constructor(snapshot) {
    this.snapshot = structuredClone(snapshot);
    this.afterReadSnapshot = null;
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
        for (const record of records) byId.set(record.id, structuredClone(record));
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      for (const collection of collections) {
        this.snapshot[collection] = working[collection];
      }
    }
    return result;
  }

  async readSnapshot() {
    const result = structuredClone(this.snapshot);
    if (this.afterReadSnapshot) {
      const hook = this.afterReadSnapshot;
      this.afterReadSnapshot = null;
      await hook(this.snapshot);
    }
    return result;
  }

  close() {}
}

const academicYearId = "00000000-0000-4000-8000-000000000731";
const classroomId = "00000000-0000-4000-8000-000000000732";
const studentId = "00000000-0000-4000-8000-000000000733";
const observationId = "00000000-0000-4000-8000-000000000734";
const anecdotePlanId = "00000000-0000-4000-8000-000000000751";
const anecdoteActivityId = "00000000-0000-4000-8000-000000000752";
const anecdoteFormId = "00000000-0000-4000-8000-000000000746";
const curriculumLinkId = "00000000-0000-4000-8000-000000000747";
const teacherUserId = "00000000-0000-4000-8000-000000000748";

function dossierStore() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    id: academicYearId,
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-08-31",
    status: "active",
    createdAt: "2026-09-01T06:00:00.000Z",
    updatedAt: "2026-09-01T06:00:00.000Z",
    civilDate: "2026-09-01",
    deletedAt: null,
    schemaVersion: 1,
  });
  snapshot.classrooms.push({
    id: classroomId,
    academicYearId,
    name: "Kurgu Sınıfı",
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
      timeZone: "Europe/Istanbul",
    },
    createdAt: "2026-09-01T06:00:00.000Z",
    updatedAt: "2026-09-01T06:00:00.000Z",
    civilDate: "2026-09-01",
    deletedAt: null,
    schemaVersion: 2,
  });
  snapshot.students.push({
    id: studentId,
    displayName: "Ada Kurgu",
    firstName: "Ada",
    lastName: "Kurgu",
    preferredName: "Ada",
    optionalCode: "118",
    contacts: [
      {
        id: "00000000-0000-4000-8000-000000000735",
        kind: "mother",
        relationship: "Anne",
        name: "Ayla Kurgu",
        phone: "+905321112233",
        isPrimary: true,
        isEmergencyContact: true,
        isAuthorizedPickup: true,
      },
    ],
    careDetails: {
      allergies: "Fındık alerjisi",
      dietaryNeeds: "Laktozsuz beslenme",
      medicationNotes: "Veli yazılı talimatı dosyada",
      emergencyNotes: "Önce anne aranır",
      homeAddress: "Kurgu Mahallesi 12, Denizli",
    },
    profileSchemaVersion: 7,
    academicYearId,
    classroomId,
    active: true,
    enrollmentStatus: "active",
    enrollments: [
      {
        id: "00000000-0000-4000-8000-000000000736",
        academicYearId,
        classroomId,
        startedOn: "2026-09-01",
        status: "active",
        schemaVersion: 1,
      },
    ],
    createdAt: "2026-09-01T06:00:00.000Z",
    updatedAt: "2026-09-01T06:00:00.000Z",
    civilDate: "2026-09-01",
    deletedAt: null,
    schemaVersion: 7,
  });
  snapshot.attendanceRecords.push({
    id: "00000000-0000-4000-8000-000000000737",
    studentId,
    status: "present",
    academicYearId,
    classroomId,
    createdAt: "2026-09-15T06:00:00.000Z",
    updatedAt: "2026-09-15T06:00:00.000Z",
    civilDate: "2026-09-15",
    deletedAt: null,
    schemaVersion: 1,
  });
  snapshot.observations.push({
    id: observationId,
    studentIds: [studentId],
    rawText: "Blokları üç farklı biçimde denedi.",
    context: "Serbest oyun",
    observedAt: "2026-09-15T08:00:00.000Z",
    planId: anecdotePlanId,
    activityId: anecdoteActivityId,
    academicYearId,
    classroomId,
    createdAt: "2026-09-15T08:00:00.000Z",
    updatedAt: "2026-09-15T08:00:00.000Z",
    civilDate: "2026-09-15",
    deletedAt: null,
    schemaVersion: 1,
  });
  snapshot.portfolioSelections.push({
    id: "00000000-0000-4000-8000-000000000738",
    studentId,
    itemType: "observation",
    itemId: observationId,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    teacherCaption: "Farklı çözüm yollarını denedi.",
    order: 0,
    academicYearId,
    classroomId,
    createdAt: "2026-09-16T08:00:00.000Z",
    updatedAt: "2026-09-16T08:00:00.000Z",
    civilDate: "2026-09-16",
    deletedAt: null,
    schemaVersion: 1,
  });
  return new MemoryStore(snapshot);
}

function archiveFromSnapshot(snapshot) {
  return {
    archiveVersion: 1,
    generatedAt: "2027-01-20T10:00:00.000Z",
    studentId,
    student: snapshot.students.find((record) => record.id === studentId),
    enrollments:
      snapshot.students.find((record) => record.id === studentId)?.enrollments ?? [],
    academicYears: snapshot.academicYears,
    classrooms: snapshot.classrooms,
    attendanceRecords: snapshot.attendanceRecords,
    observations: snapshot.observations,
    observationRevisions: snapshot.observationRevisions,
    evidenceCurriculumLinks: snapshot.evidenceCurriculumLinks,
    valueEvidenceLinks: snapshot.valueEvidenceLinks,
    activityReferences: snapshot.activities,
    planReferences: snapshot.plans,
    mediaAssets: snapshot.mediaAssets,
    portfolioSelections: snapshot.portfolioSelections,
    reportDrafts: snapshot.reportDrafts,
    externalFeedback: snapshot.externalFeedback,
  };
}

function seedApprovedAnecdote(
  store,
  {
    assessment = "Ada, farklı blok düzenlerini karşılaştırarak kendi çözümünü açıkladı.",
    sourceVersion = "2024.1",
    referenceTitle = "Karşılaştırma ve gerekçelendirme",
  } = {},
) {
  const observation = store.snapshot.observations.find(
    (record) => record.id === observationId,
  );
  observation.observationType = "anecdotal";
  observation.rawTextImmutable = true;
  const curriculumLink = {
    id: curriculumLinkId,
    observationId,
    framework: "tymm",
    programLabel: "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı",
    catalogId: "tymm-okul-oncesi-60-72",
    sourceVersion,
    referenceCode: "MAB4.2",
    referenceTitle,
    confirmationMethod: "teacher-confirmed",
    approvedByUserId: teacherUserId,
    confirmedAt: "2026-09-16T08:05:00.000Z",
    referenceOrigin: "official-catalog",
    officialCatalogVerified: true,
    academicYearId,
    classroomId,
    createdAt: "2026-09-16T08:05:00.000Z",
    updatedAt: "2026-09-16T08:05:00.000Z",
    civilDate: "2026-09-16",
    deletedAt: null,
    schemaVersion: 1,
  };
  store.snapshot.evidenceCurriculumLinks.push(curriculumLink);
  store.snapshot.reportDrafts.push({
    id: anecdoteFormId,
    reportType: "meb-2024-anecdote-form",
    scope: "single-student",
    studentIds: [studentId],
    periodStart: "2026-09-15",
    periodEnd: "2026-09-15",
    selectedObservationIds: [observationId],
    selectedMediaIds: [],
    editableSections: {
      observedLocation: "Sınıf içi öğrenme ortamı",
      observedLocationSource: "activity",
      observerGeneralAssessment: assessment,
      generalEvaluationSourceDraftId: null,
      approvedCurriculumLinkIds: [curriculumLinkId],
      approvedProgramSources: [
        {
          framework: "tymm",
          catalogId: "tymm-okul-oncesi-60-72",
          sourceVersion,
        },
      ],
    },
    status: "ready",
    authoredBy: "teacher",
    teacherReviewRequired: true,
    reviewStatus: "approved",
    reviewedByUserId: teacherUserId,
    reviewedAt: "2026-09-16T08:20:00.000Z",
    approvalSeal: createAnecdoteApprovalSeal(observation, [curriculumLink]),
    generationMode: "teacher-authored-official-form",
    referenceVerificationStatus: "official-catalog-verified",
    academicYearId,
    classroomId,
    createdAt: "2026-09-16T08:10:00.000Z",
    updatedAt: "2026-09-16T08:20:00.000Z",
    civilDate: "2026-09-16",
    deletedAt: null,
    schemaVersion: ANECDOTE_FORM_SCHEMA_VERSION,
  });
  return { observation, form: store.snapshot.reportDrafts.at(-1) };
}

const baseOptions = {
  destination: "chatgpt",
  audience: "parent",
  identityMode: "alias",
  alias: "Öğrenci A",
  periodStart: "2026-09-01",
  periodEnd: "2027-01-22",
  includeContacts: false,
  includeAttendance: true,
  includeObservations: true,
  includePortfolio: true,
  includeExternalFeedback: true,
};

test("paylaşım hedefi gizlilik varsayılanları AI için kimlik ve yakınları kapatır", () => {
  assert.deepEqual(dossierPrivacyDefaults("chatgpt"), {
    identityMode: "alias",
    includeContacts: false,
    personalDataApprovedForAi: false,
  });
  assert.deepEqual(dossierPrivacyDefaults("gemini"), {
    identityMode: "alias",
    includeContacts: false,
    personalDataApprovedForAi: false,
  });
  assert.deepEqual(dossierPrivacyDefaults("whatsapp"), {
    identityMode: "full",
    includeContacts: true,
    personalDataApprovedForAi: false,
  });
});

test("AI paketi varsayılan takma adla kimlik ve telefonu dışarı çıkarmaz", async () => {
  const store = dossierStore();
  const { dossier, exportPackageId } = await createStudentDossier(store, {
    studentId,
    options: baseOptions,
    now: new Date("2027-01-20T10:00:00.000Z"),
  });
  assert.match(dossier.text, /Öğrenci A/);
  assert.match(dossier.text, /Yalnız verilen tarihli kanıtlara dayan/);
  assert.match(dossier.text, /Blokları üç farklı biçimde denedi/);
  assert.doesNotMatch(dossier.text, /Ada Kurgu/);
  assert.doesNotMatch(dossier.text, /Ayla Kurgu/);
  assert.doesNotMatch(dossier.text, /0532 111 22 33/);
  assert.equal(store.snapshot.exportPackages[0].id, exportPackageId);
  assert.equal(
    store.snapshot.exportPackages[0].anonymizationMode,
    "student-alias",
  );
  assert.equal(store.snapshot.exportPackages[0].type, "student_dossier");
  assert.deepEqual(
    {
      packageKind: store.snapshot.exportPackages[0].manifest.packageKind,
      provider: store.snapshot.exportPackages[0].manifest.provider,
      audience: store.snapshot.exportPackages[0].manifest.audience,
      purpose: store.snapshot.exportPackages[0].manifest.purpose,
      academicYearId:
        store.snapshot.exportPackages[0].manifest.academicYearId,
      classroomId: store.snapshot.exportPackages[0].manifest.classroomId,
    },
    {
      packageKind: "student_dossier",
      provider: "chatgpt",
      audience: "parent",
      purpose: "parent",
      academicYearId,
      classroomId,
    },
  );
});

test("kurum dosyası açık seçimle ad, okul kodu ve yakın telefonunu içerir", () => {
  const store = dossierStore();
  const archive = {
    archiveVersion: 1,
    generatedAt: "2027-01-20T10:00:00.000Z",
    studentId,
    student: store.snapshot.students[0],
    enrollments: store.snapshot.students[0].enrollments,
    academicYears: store.snapshot.academicYears,
    classrooms: store.snapshot.classrooms,
    attendanceRecords: store.snapshot.attendanceRecords,
    observations: store.snapshot.observations,
    observationRevisions: [],
    evidenceCurriculumLinks: [],
    valueEvidenceLinks: [],
    activityReferences: [],
    planReferences: [],
    mediaAssets: [],
    portfolioSelections: store.snapshot.portfolioSelections,
    reportDrafts: [],
    externalFeedback: [],
  };
  const dossier = buildStudentDossier(archive, {
    ...baseOptions,
    destination: "whatsapp",
    audience: "administration",
    identityMode: "full",
    includeContacts: true,
  });
  assert.match(dossier.text, /Ad soyad: Ada Kurgu/);
  assert.match(dossier.text, /Okul numarası.*118/);
  assert.match(dossier.text, /Anne · Ayla Kurgu: 0532 111 22 33/);
});

test("gözlemler kapalıyken portfolyo kaynak ham gözlemini sızdırmaz", () => {
  const store = dossierStore();
  const archive = {
    archiveVersion: 1,
    generatedAt: "2027-01-20T10:00:00.000Z",
    studentId,
    student: store.snapshot.students[0],
    enrollments: store.snapshot.students[0].enrollments,
    academicYears: store.snapshot.academicYears,
    classrooms: store.snapshot.classrooms,
    attendanceRecords: store.snapshot.attendanceRecords,
    observations: store.snapshot.observations,
    observationRevisions: [],
    evidenceCurriculumLinks: [],
    valueEvidenceLinks: [],
    activityReferences: [],
    planReferences: [],
    mediaAssets: [],
    portfolioSelections: store.snapshot.portfolioSelections,
    reportDrafts: [],
    externalFeedback: [],
  };
  const dossier = buildStudentDossier(archive, {
    ...baseOptions,
    destination: "file",
    includeObservations: false,
  });
  assert.doesNotMatch(dossier.text, /Blokları üç farklı biçimde denedi/);
  assert.deepEqual(dossier.includedEntityIds.observations, []);
  assert.match(dossier.text, /Farklı çözüm yollarını denedi/);
});

test("dosya manifesti yalnız aynı çocuğun canlı değer kanıt bağını içerir", () => {
  const store = dossierStore();
  const activeLinkId = "00000000-0000-4000-8000-000000000739";
  const tombstonedLinkId = "00000000-0000-4000-8000-000000000740";
  const otherStudentLinkId = "00000000-0000-4000-8000-000000000741";
  const archive = {
    archiveVersion: 1,
    generatedAt: "2027-01-20T10:00:00.000Z",
    studentId,
    student: store.snapshot.students[0],
    enrollments: store.snapshot.students[0].enrollments,
    academicYears: store.snapshot.academicYears,
    classrooms: store.snapshot.classrooms,
    attendanceRecords: store.snapshot.attendanceRecords,
    observations: store.snapshot.observations,
    observationRevisions: [],
    evidenceCurriculumLinks: [],
    valueEvidenceLinks: [
      {
        id: activeLinkId,
        academicYearId,
        classroomId,
        studentId,
        observationId,
        civilDate: "2026-09-16",
        deletedAt: null,
      },
      {
        id: tombstonedLinkId,
        academicYearId,
        classroomId,
        studentId,
        observationId,
        civilDate: "2026-09-16",
        deletedAt: "2026-09-20T08:00:00.000Z",
      },
      {
        id: otherStudentLinkId,
        academicYearId,
        classroomId,
        studentId: "00000000-0000-4000-8000-000000000799",
        observationId,
        civilDate: "2026-09-16",
        deletedAt: null,
      },
    ],
    activityReferences: [],
    planReferences: [],
    mediaAssets: [],
    portfolioSelections: store.snapshot.portfolioSelections,
    reportDrafts: [],
    externalFeedback: [],
  };

  const dossier = buildStudentDossier(archive, baseOptions);
  assert.deepEqual(dossier.includedEntityIds.valueEvidenceLinks, [activeLinkId]);
  assert.doesNotMatch(dossier.text, /değeri kazandı|puan|rozet/iu);
});

test("onaylı ve güncel anekdot formu ham gözlemden ayrı değerlendirme ve program başlıklarıyla dosyaya girer", async () => {
  const store = dossierStore();
  const assessment =
    "Farklı çözüm yollarını denemesini bu gözlem özelinde sözel olarak gerekçelendirdi.";
  seedApprovedAnecdote(store, { assessment });
  const portfolioBefore = structuredClone(store.snapshot.portfolioSelections);

  const { dossier } = await createStudentDossier(store, {
    studentId,
    options: baseOptions,
    now: new Date("2027-01-20T10:00:00.000Z"),
  });

  const rawHeadingIndex = dossier.text.indexOf("TARİHLİ GÖZLEMLER");
  const rawObservationIndex = dossier.text.indexOf(
    "Blokları üç farklı biçimde denedi.",
  );
  const assessmentHeadingIndex = dossier.text.indexOf(
    "ANEKDOTLARA İLİŞKİN ÖĞRETMEN DEĞERLENDİRMELERİ",
  );
  const assessmentIndex = dossier.text.indexOf(assessment);
  const programHeadingIndex = dossier.text.indexOf(
    "ÖĞRETMEN ONAYLI PROGRAM BAĞLANTILARI",
  );
  assert.ok(rawHeadingIndex < rawObservationIndex);
  assert.ok(rawObservationIndex < assessmentHeadingIndex);
  assert.ok(assessmentHeadingIndex < assessmentIndex);
  assert.ok(assessmentIndex < programHeadingIndex);
  assert.match(dossier.text, /MAB4\.2 — Karşılaştırma ve gerekçelendirme/);
  assert.match(
    dossier.text,
    /tek tarihli gözleme ilişkindir; tek başına genelleyici gelişim hükmü değildir/,
  );

  const trace = dossier.manifest.anecdoteEvidenceTrace;
  assert.deepEqual(trace.formDraftIds, [anecdoteFormId]);
  assert.deepEqual(trace.observationIds, [observationId]);
  assert.deepEqual(trace.evidenceCurriculumLinkIds, [curriculumLinkId]);
  assert.deepEqual(trace.programSourceVersions, ["2024.1"]);
  assert.deepEqual(trace.entries, [
    {
      formDraftId: anecdoteFormId,
      observationId,
      generalEvaluationSourceDraftId: null,
      evidenceCurriculumLinkIds: [curriculumLinkId],
      programSources: [
        {
          framework: "tymm",
          catalogId: "tymm-okul-oncesi-60-72",
          sourceVersion: "2024.1",
        },
      ],
    },
  ]);
  assert.ok(dossier.includedEntityIds.observations.includes(observationId));
  assert.deepEqual(
    store.snapshot.exportPackages[0].manifest.anecdoteEvidenceTrace,
    trace,
  );
  assert.deepEqual(store.snapshot.portfolioSelections, portfolioBefore);
});

test("pending, eksik veya sonradan değiştirilmiş anekdot formu dosyaya alınmaz", async (t) => {
  const cases = [
    {
      name: "öğretmen onayı bekleyen form",
      mutate(store) {
        store.snapshot.reportDrafts[0].status = "draft";
        store.snapshot.reportDrafts[0].reviewStatus = "pending";
        store.snapshot.reportDrafts[0].reviewedByUserId = null;
        store.snapshot.reportDrafts[0].reviewedAt = null;
      },
    },
    {
      name: "genel değerlendirmesi eksik form",
      mutate(store) {
        store.snapshot.reportDrafts[0].editableSections.observerGeneralAssessment =
          "   ";
      },
    },
    {
      name: "onaydan sonra program kaynağı değiştirilmiş form",
      mutate(store) {
        store.snapshot.evidenceCurriculumLinks[0].sourceVersion = "2025-tamper";
      },
    },
    {
      name: "onaydan sonra ham gözlemi değiştirilmiş form",
      mutate(store) {
        store.snapshot.observations[0].rawText = "Seal dışı değiştirilmiş ham gözlem.";
      },
    },
    {
      name: "onaydan sonra program başlığı değiştirilmiş form",
      mutate(store) {
        store.snapshot.evidenceCurriculumLinks[0].referenceTitle =
          "Seal dışı değiştirilmiş program başlığı";
      },
    },
    {
      name: "onaydan sonra program kodu değiştirilmiş form",
      mutate(store) {
        store.snapshot.evidenceCurriculumLinks[0].referenceCode = "MAB4.9";
      },
    },
    {
      name: "onaydan sonra bağlantı onay zamanı değiştirilmiş form",
      mutate(store) {
        store.snapshot.evidenceCurriculumLinks[0].confirmedAt =
          "2026-09-16T08:06:00.000Z";
      },
    },
    {
      name: "onaydan sonra bağlantı onaylayanı değiştirilmiş form",
      mutate(store) {
        store.snapshot.evidenceCurriculumLinks[0].approvedByUserId =
          "00000000-0000-4000-8000-000000000799";
      },
    },
    {
      name: "seal taşımayan eski onaylı form",
      mutate(store) {
        delete store.snapshot.reportDrafts[0].approvalSeal;
        store.snapshot.reportDrafts[0].schemaVersion = 1;
      },
    },
  ];

  for (const item of cases) {
    await t.test(item.name, () => {
      const store = dossierStore();
      seedApprovedAnecdote(store, {
        assessment: "Yalnız geçerli formda görünmesi gereken öğretmen yorumu.",
        referenceTitle: "Yalnız geçerli formda görünmesi gereken program bağı",
      });
      item.mutate(store);
      const dossier = buildStudentDossier(
        archiveFromSnapshot(store.snapshot),
        baseOptions,
        new Date("2027-01-20T10:00:00.000Z"),
      );
      assert.doesNotMatch(
        dossier.text,
        /Yalnız geçerli formda görünmesi gereken öğretmen yorumu/,
      );
      assert.doesNotMatch(
        dossier.text,
        /Yalnız geçerli formda görünmesi gereken program bağı/,
      );
      assert.deepEqual(dossier.manifest.anecdoteEvidenceTrace.entries, []);
    });
  }
});

test("anekdot downstream okuması çocuk, sınıf ve tarih kapsamlarında fail-closed çalışır", async (t) => {
  const otherStudentId = "00000000-0000-4000-8000-000000000749";
  const otherClassroomId = "00000000-0000-4000-8000-000000000750";
  const cases = [
    {
      name: "başka çocuk",
      mutate(store) {
        store.snapshot.reportDrafts[0].studentIds = [otherStudentId];
      },
    },
    {
      name: "başka sınıf",
      mutate(store) {
        store.snapshot.reportDrafts[0].classroomId = otherClassroomId;
      },
    },
    {
      name: "seçili dönem dışı tarih",
      mutate(store) {
        const observation = store.snapshot.observations[0];
        observation.civilDate = "2027-02-01";
        observation.observedAt = "2027-02-01T08:00:00.000Z";
        store.snapshot.reportDrafts[0].periodStart = "2027-02-01";
        store.snapshot.reportDrafts[0].periodEnd = "2027-02-01";
      },
    },
  ];

  for (const item of cases) {
    await t.test(item.name, () => {
      const store = dossierStore();
      seedApprovedAnecdote(store, {
        assessment: "Kapsam dışı öğretmen yorumu görünmemeli.",
        referenceTitle: "Kapsam dışı program bağı görünmemeli",
      });
      item.mutate(store);
      const dossier = buildStudentDossier(
        archiveFromSnapshot(store.snapshot),
        baseOptions,
        new Date("2027-02-20T10:00:00.000Z"),
      );
      assert.doesNotMatch(dossier.text, /Kapsam dışı öğretmen yorumu/);
      assert.doesNotMatch(dossier.text, /Kapsam dışı program bağı/);
      assert.deepEqual(dossier.manifest.anecdoteEvidenceTrace.entries, []);
    });
  }
});

test("AI hedefinde anekdot yorumu kimlik, yakın adı ve telefonu takma ad arkasında tutar", async () => {
  const store = dossierStore();
  const { observation } = seedApprovedAnecdote(store, {
    assessment:
      "Ada Kurgu gözlem sonunda Ayla Kurgu ile +905321112233 üzerinden görüşülmesini önerdi.",
  });
  observation.rawText =
    "Ada Kurgu blokları tamamladı; Ayla Kurgu ve 0532 111 22 33 bilgisi nota yazıldı.";

  const { dossier } = await createStudentDossier(store, {
    studentId,
    options: baseOptions,
    now: new Date("2027-01-20T10:00:00.000Z"),
  });

  assert.match(dossier.text, /Öğrenci A/);
  assert.doesNotMatch(dossier.text, /Ada Kurgu|Ayla Kurgu/);
  assert.doesNotMatch(dossier.text, /\+905321112233|0532 111 22 33/);
  assert.equal(dossier.manifest.identityMode, "alias");
  assert.equal(dossier.manifest.includeContacts, false);
});

test("haricî AI alias çıktısı seçili çocuk, akran, yakın ve telefon varyantlarını tüm sınıf snapshotından temizler; normal dosya aynen korur", async () => {
  const store = dossierStore();
  const peerStudentId = "00000000-0000-4000-8000-000000000753";
  store.snapshot.students.push({
    ...structuredClone(store.snapshot.students[0]),
    id: peerStudentId,
    displayName: "Ece Yılmaz",
    firstName: "Ece",
    lastName: "Yılmaz",
    preferredName: "Ece",
    contacts: [
      {
        id: "00000000-0000-4000-8000-000000000754",
        kind: "mother",
        relationship: "Anne",
        name: "Işıl Yılmaz",
        phone: "+905551234567",
        isPrimary: true,
      },
    ],
    enrollments: [
      {
        id: "00000000-0000-4000-8000-000000000755",
        academicYearId,
        classroomId,
        startedOn: "2026-09-01",
        status: "active",
        schemaVersion: 1,
      },
    ],
  });
  store.snapshot.observations[0].rawText =
    "ADA KURGU, eCE YILMAZ ile çalıştı; iŞİL YILMAZ için (0532) 111-22-33, 0532–111–22–33, ０５３２‑１１１‑２２‑３３, ٠٥٣٢·١١١·٢٢·٣٣ ve 05321112233 yazıldı.";

  const { dossier: aiDossier } = await createStudentDossier(store, {
    studentId,
    options: baseOptions,
    now: new Date("2027-01-20T10:00:00.000Z"),
  });

  assert.match(aiDossier.text, /Öğrenci A/);
  assert.doesNotMatch(aiDossier.text, /ADA KURGU/iu);
  assert.doesNotMatch(aiDossier.text, /Ece Yılmaz/iu);
  assert.doesNotMatch(aiDossier.text, /Işıl Yılmaz/iu);
  assert.doesNotMatch(
    aiDossier.text,
    /\(0532\) 111-22-33|0532–111–22–33|０５３２‑１１１‑２２‑３３|٠٥٣٢·١١١·٢٢·٣٣|05321112233/u,
  );
  assert.doesNotMatch(aiDossier.text, /Fındık alerjisi/);
  assert.doesNotMatch(aiDossier.text, /Kurgu Mahallesi/);

  const { dossier: normalFile } = await createStudentDossier(store, {
    studentId,
    options: {
      ...baseOptions,
      destination: "file",
      identityMode: "full",
      includeContacts: true,
    },
    now: new Date("2027-01-20T10:01:00.000Z"),
  });
  assert.match(normalFile.text, /ADA KURGU/);
  assert.match(normalFile.text, /eCE YILMAZ/);
  assert.match(normalFile.text, /iŞİL YILMAZ/);
  assert.match(normalFile.text, /\(0532\) 111-22-33/);
  assert.match(normalFile.text, /0532–111–22–33/);
  assert.match(normalFile.text, /０５３２‑１１１‑２２‑３３/);
  assert.match(normalFile.text, /٠٥٣٢·١١١·٢٢·٣٣/);
  assert.match(normalFile.text, /05321112233/);
  assert.match(
    normalFile.text,
    /Anne · Ayla Kurgu: 0532 111 22 33 \(öncelikli\) \(acil iletişim\) \(teslim yetkili\)/,
  );
  assert.match(normalFile.text, /SAĞLIK VE GÜVENLİK BİLGİLERİ/);
  assert.match(normalFile.text, /Bilinen alerjiler: Fındık alerjisi/);
  assert.match(normalFile.text, /Ev adresi: Kurgu Mahallesi 12, Denizli/);
});

test("haricî AI redaksiyon sonrası yasak kimlik kalırsa export paketi yazmadan fail-closed durur", async () => {
  const store = dossierStore();
  await assert.rejects(
    createStudentDossier(store, {
      studentId,
      options: { ...baseOptions, alias: "ADA KURGU" },
      now: new Date("2027-01-20T10:00:00.000Z"),
    }),
    /gizlilik taramasını geçemedi.*reddedildi/iu,
  );
  assert.deepEqual(store.snapshot.exportPackages, []);
});

test("AI paketi onay bayrağı verilse bile tam kimlik veya yakın bilgisi kabul etmez", async () => {
  for (const overrides of [
    {
      identityMode: "full",
      includeContacts: false,
      personalDataApprovedForAi: true,
    },
    {
      identityMode: "alias",
      includeContacts: true,
      personalDataApprovedForAi: true,
    },
  ]) {
    const store = dossierStore();
    await assert.rejects(
      createStudentDossier(store, {
        studentId,
        options: { ...baseOptions, ...overrides },
        now: new Date("2027-01-20T10:00:00.000Z"),
      }),
      /yalnız sistem takma adıyla hazırlanır/,
    );
    assert.deepEqual(store.snapshot.exportPackages, []);
  }
});

test("bireysel dosya çok çocuklu gözlemi ve ona bağlı portfolyo metnini dışarı çıkarmaz", async () => {
  const store = dossierStore();
  const otherStudentId = "00000000-0000-4000-8000-000000000743";
  const groupObservationId = "00000000-0000-4000-8000-000000000744";
  const groupPortfolioId = "00000000-0000-4000-8000-000000000745";
  store.snapshot.students.push({
    ...structuredClone(store.snapshot.students[0]),
    id: otherStudentId,
    displayName: "Ece Başka Çocuk",
    firstName: "Ece",
    lastName: "Başka Çocuk",
  });
  store.snapshot.observations.push({
    ...structuredClone(store.snapshot.observations[0]),
    id: groupObservationId,
    studentIds: [studentId, otherStudentId],
    rawText: "Ece Başka Çocuk, Ada ile birlikte kule kurdu.",
    context: "Ece'nin bireysel paylaşımı",
    childQuote: "Ece: Bu benim özel fikrim.",
  });
  store.snapshot.portfolioSelections.push({
    ...structuredClone(store.snapshot.portfolioSelections[0]),
    id: groupPortfolioId,
    itemId: groupObservationId,
    teacherCaption: "Ece Başka Çocuk ile ortak grup kaydı.",
  });

  const { dossier } = await createStudentDossier(store, {
    studentId,
    options: baseOptions,
    now: new Date("2027-01-20T10:00:00.000Z"),
  });

  assert.doesNotMatch(dossier.text, /Ece Başka Çocuk|Ece'nin|özel fikrim/);
  assert.equal(
    dossier.includedEntityIds.observations.includes(groupObservationId),
    false,
  );
  assert.equal(
    dossier.includedEntityIds.portfolioSelections.includes(groupPortfolioId),
    false,
  );
});

test("dosya preimage okumasından sonra öğrenci silinirse stale paket ve metin üretilmez", async () => {
  const store = dossierStore();
  store.afterReadSnapshot = async (snapshot) => {
    snapshot.students = snapshot.students.filter((record) => record.id !== studentId);
    snapshot.observations = snapshot.observations.filter(
      (record) => !record.studentIds?.includes(studentId),
    );
  };

  await assert.rejects(
    createStudentDossier(store, {
      studentId,
      options: baseOptions,
      now: new Date("2027-01-20T10:00:00.000Z"),
    }),
    /kaynak kayıtlar değişti; dosya oluşturulmadı/,
  );
  assert.equal(store.snapshot.students.some((record) => record.id === studentId), false);
  assert.deepEqual(store.snapshot.exportPackages, []);
});

test("dosya preimage okumasından sonra değer kanıt zinciri değişirse paket yazılmaz", async () => {
  const store = dossierStore();
  store.afterReadSnapshot = async (snapshot) => {
    snapshot.valueEvidenceLinks.push({
      id: "00000000-0000-4000-8000-000000000742",
      academicYearId,
      classroomId,
      studentId,
      observationId,
      createdAt: "2027-01-20T09:59:00.000Z",
      updatedAt: "2027-01-20T09:59:00.000Z",
      civilDate: "2027-01-20",
      deletedAt: null,
      schemaVersion: 1,
    });
  };

  await assert.rejects(
    createStudentDossier(store, {
      studentId,
      options: baseOptions,
      now: new Date("2027-01-20T10:00:00.000Z"),
    }),
    /kaynak kayıtlar değişti; dosya oluşturulmadı/,
  );
  assert.equal(store.snapshot.valueEvidenceLinks.length, 1);
  assert.deepEqual(store.snapshot.exportPackages, []);
});

test("dosya zamanı dahil edilen kayıt veya kapsam zaman çizgisinden eskiyse paket yazılmaz", async () => {
  for (const mutate of [
    (snapshot) => {
      snapshot.observations[0].updatedAt = "2027-01-20T10:01:00.000Z";
    },
    (snapshot) => {
      snapshot.classrooms[0].updatedAt = "2027-01-20T10:01:00.000Z";
    },
  ]) {
    const store = dossierStore();
    mutate(store.snapshot);
    const before = await store.readSnapshot();

    await assert.rejects(
      createStudentDossier(store, {
        studentId,
        options: baseOptions,
        now: new Date("2027-01-20T10:00:00.000Z"),
      }),
      /son değişiklik zamanından eski|canlılık penceresi dışında/,
    );

    assert.deepEqual(await store.readSnapshot(), before);
    assert.deepEqual(store.snapshot.exportPackages, []);
  }
});

test("haricî AI geri bildirimi değişmez metin, hash ve toplu özet işaretleriyle saklanır", async () => {
  const store = dossierStore();
  const { exportPackageId } = await createStudentDossier(store, {
    studentId,
    options: baseOptions,
    now: new Date("2027-01-20T10:00:00.000Z"),
  });
  const saved = await saveExternalAiFeedback(store, {
    studentId,
    provider: "chatgpt",
    audience: "parent",
    periodStart: "2026-09-01",
    periodEnd: "2027-01-22",
    feedbackText: "Tarihli gözlemlere dayalı kurgu geri bildirim.",
    teacherNote: "Veli görüşmesinden önce sadeleştir.",
    includeInTermSummary: true,
    includeInYearSummary: true,
    linkedExportPackageId: exportPackageId,
    now: new Date("2027-01-21T10:00:00.000Z"),
  });
  const record = store.snapshot.externalFeedback[0];
  assert.equal(record.rawTextImmutable, true);
  assert.match(record.contentHash, /^[0-9a-f]{64}$/);
  assert.equal(record.feedbackText, saved.feedbackText);
  assert.equal(record.linkedExportPackageId, exportPackageId);
  const listed = listExternalAiFeedback(await store.readSnapshot(), studentId);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].includeInTermSummary, true);
  assert.equal(listed[0].includeInYearSummary, true);

  const term = buildExternalFeedbackAggregation(store.snapshot, {
    kind: "term",
    studentId,
    academicYearId,
    periodStart: "2026-09-01",
    periodEnd: "2027-01-22",
  });
  assert.deepEqual(term.feedbackIds, [saved.id]);
  assert.match(term.text, /kurgu geri bildirim/);
  assert.deepEqual(term.contentHashes, [record.contentHash]);
});

test("AI geri bildirimi sağlayıcı ve paket provenansı uyuşmazsa kaydedilmez", async () => {
  const store = dossierStore();
  const { exportPackageId } = await createStudentDossier(store, {
    studentId,
    options: baseOptions,
    now: new Date("2027-01-20T10:00:00.000Z"),
  });
  await assert.rejects(
    saveExternalAiFeedback(store, {
      studentId,
      provider: "gemini",
      audience: "parent",
      periodStart: "2026-09-01",
      periodEnd: "2027-01-22",
      feedbackText: "Kurgu geri bildirim.",
      linkedExportPackageId: exportPackageId,
      now: new Date("2027-01-21T10:00:00.000Z"),
    }),
    /sağlayıcı, alıcı, dönem veya kapsamla uyuşmuyor/,
  );
});
