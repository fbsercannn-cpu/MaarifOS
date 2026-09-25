import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { canonicalJson } from "../../src/core/backup/canonical-json.ts";
import { archiveAcademicYear } from "../../src/features/archive/academic-year-archive.ts";
import {
  CURRICULUM_PROGRAM_LABELS,
  LOCAL_TEACHER_IDENTITY_SETTING_ID,
  LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
  captureImmutableRawObservation,
  confirmObservationCurriculumLink,
  createCitedAssessmentDraft,
  createPlanWithActivity,
  normalizeCurriculumProfile,
} from "../../src/features/evidence/evidence-flow.ts";
import {
  OFFICIAL_STARTER_CATALOG_PROFILES,
  STARTER_CURRICULUM_TARGETS,
  curriculumTargetsForProfile,
} from "../../src/features/curriculum/curriculum-catalog.ts";
import { persistDashboardObservation } from "../../src/features/dashboard/dashboard-data.ts";
import { ACTIVITY_STUDIO_ITEMS } from "../../src/features/activity-studio/activity-studio-model.ts";
import { createPedagogicalPlanBridge } from "../../src/features/pedagogical-os/pedagogical-plan-bridge.ts";

class MemoryStore {
  snapshot;

  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(working[collection].map((record) => [record.id, record]));
        for (const record of records) byId.set(record.id, structuredClone(record));
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      for (const collection of collections) this.snapshot[collection] = working[collection];
    }
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};
const year = "00000000-0000-4000-8000-000000000401";
const classroom = "00000000-0000-4000-8000-000000000402";
const student = "00000000-0000-4000-8000-000000000403";
const planId = "00000000-0000-4000-8000-000000000404";
const activityId = "00000000-0000-4000-8000-000000000405";
const observationId = "00000000-0000-4000-8000-000000000406";
const draftId = "00000000-0000-4000-8000-000000000407";
const secondObservationId = "00000000-0000-4000-8000-000000000408";
const curriculumProfile = {
  framework: "tymm",
  programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
  catalogId: "tymm-2024-okul-oncesi-v1",
  sourceVersion: "2024.1",
  referenceOrigin: "teacher-declared",
  officialCatalogVerified: false,
};
const starterTarget = curriculumTargetsForProfile(curriculumProfile).find(
  (target) => target.referenceCode === "FAB.1",
);
assert.ok(starterTarget);
const planAssignment = {
  curriculumTargets: [starterTarget],
  assignmentMode: "selected-students",
  studentIds: [student],
};

function activeStore() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: year,
    name: "2026-2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroom,
    academicYearId: year,
    name: "Kurgu Kanıt Sınıfı",
    curriculumProfileSnapshot: curriculumProfile,
    schemaVersion: 2,
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: year,
    classroomId: classroom,
  });
  snapshot.students.push({
    ...base,
    id: student,
    displayName: "Kurgu Kanıt Öğrencisi",
    academicYearId: year,
    classroomId: classroom,
  });
  return new MemoryStore(snapshot);
}

test("pedagojik öneri kaynağı plan ve etkinliğe aynı atomik snapshot olarak yazılır", async () => {
  const store = activeStore();
  const sourceActivity = ACTIVITY_STUDIO_ITEMS.find((item) =>
    item.ageBands.includes("48-60"),
  );
  assert.ok(sourceActivity);
  const pedagogicalProvenance = createPedagogicalPlanBridge({
    activity: sourceActivity,
    civilDate: "2026-09-01",
    ageBand: "48-60",
    scenarioId: "low-energy",
    participationRouteId: "movement",
    now: new Date("2026-09-01T06:05:00.000Z"),
  });

  const result = await createPlanWithActivity(store, {
    civilDate: "2026-09-01",
    planId,
    planTitle: `${sourceActivity.title} planı`,
    activityId,
    activityTitle: sourceActivity.title,
    startTime: "09:30",
    endTime: "10:00",
    curriculumProfile,
    ...planAssignment,
    pedagogicalProvenance,
    now: new Date("2026-09-01T06:10:00.000Z"),
  });

  assert.deepEqual(
    result.plan.pedagogicalProvenance,
    pedagogicalProvenance,
  );
  assert.deepEqual(
    result.activity.pedagogicalProvenance,
    pedagogicalProvenance,
  );
  const snapshot = await store.readSnapshot();
  assert.deepEqual(
    snapshot.plans[0].pedagogicalProvenance,
    snapshot.activities[0].pedagogicalProvenance,
  );

});

test("farklı gün taşıyan özgün pedagojik kaynak doğrudan servis çağrısında plan gününe atomik bağlanır", async () => {
  const store = activeStore();
  const sourceActivity = ACTIVITY_STUDIO_ITEMS.find((item) =>
    item.ageBands.includes("48-60"),
  );
  assert.ok(sourceActivity);
  const pedagogicalProvenance = createPedagogicalPlanBridge({
    activity: sourceActivity,
    civilDate: "2026-09-02",
    ageBand: "48-60",
    scenarioId: "balanced",
    participationRouteId: "multiple",
    now: new Date("2026-09-01T06:05:00.000Z"),
  });
  const result = await createPlanWithActivity(store, {
    civilDate: "2026-09-01",
    planTitle: `${sourceActivity.title} planı`,
    activityTitle: sourceActivity.title,
    startTime: "09:30",
    endTime: "10:00",
    curriculumProfile,
    ...planAssignment,
    pedagogicalProvenance,
    now: new Date("2026-09-01T06:10:00.000Z"),
  });

  assert.equal(pedagogicalProvenance.civilDate, "2026-09-02");
  assert.equal(result.plan.civilDate, "2026-09-01");
  assert.equal(result.activity.civilDate, "2026-09-01");
  assert.equal(result.plan.pedagogicalProvenance.civilDate, "2026-09-01");
  assert.equal(result.activity.pedagogicalProvenance.civilDate, "2026-09-01");
  assert.equal(
    result.plan.pedagogicalProvenance.sourceActivityId,
    pedagogicalProvenance.sourceActivityId,
  );
  assert.deepEqual(
    result.plan.pedagogicalProvenance,
    result.activity.pedagogicalProvenance,
  );
  const snapshot = await store.readSnapshot();
  assert.deepEqual(
    snapshot.plans[0].pedagogicalProvenance,
    snapshot.activities[0].pedagogicalProvenance,
  );
});

async function createEvidenceChain(store) {
  const planActivity = await createPlanWithActivity(store, {
    civilDate: "2026-09-01",
    planId,
    planTitle: "Suyun hareketini gözlemleme planı",
    activityId,
    activityTitle: "Kaplarda su aktarımı",
    startTime: "09:30",
    endTime: "10:00",
    curriculumProfile,
    ...planAssignment,
    now: new Date("2026-09-01T06:10:00.000Z"),
  });
  const rawText = "  Çocuk, suyu geniş kaptan dar kaba aktarırken “Burada daha hızlı doldu.” dedi.  ";
  const captured = await captureImmutableRawObservation(store, {
    observationId,
    studentId: student,
    planId,
    activityId,
    rawText,
    childQuote: "  Burada daha hızlı doldu.  ",
    context: "  Serbest keşif sırasında  ",
    observedAt: "2026-09-01T07:00:00.000Z",
    now: new Date("2026-09-01T07:01:00.000Z"),
  });
  return { ...planActivity, ...captured, rawText };
}

test("D1 plan-etkinlik-ham gözlem-onaylı bağ-kaynaklı taslak zincirini eksiksiz kurar", async () => {
  const store = activeStore();
  const chain = await createEvidenceChain(store);

  await assert.rejects(
    createCitedAssessmentDraft(store, {
      draftId,
      studentId: student,
      observationIds: [observationId],
      teacherAssessmentText: "Öğretmenin kanıta dayalı değerlendirmesi.",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    }),
    /öğretmen onaylı program bağlantısı/,
  );
  const link = await confirmObservationCurriculumLink(store, {
    observationId,
    framework: "tymm",
    catalogId: "tymm-2024-okul-oncesi-v1",
    sourceVersion: "2024.1",
    referenceCode: "TYMM-OÖ-FEN-GÖZLEM-01",
    referenceTitle: "Nesne ve olayları özelliklerine göre gözlemleme",
    now: new Date("2026-09-01T08:00:00.000Z"),
  });
  const draft = await createCitedAssessmentDraft(store, {
    draftId,
    studentId: student,
    observationIds: [observationId],
    teacherAssessmentText: "Çocuk, kapların biçimi ile dolma görünümü arasında ilişki kurmaya yönelmiştir.",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    now: new Date("2026-09-30T12:00:00.000Z"),
  });
  const snapshot = await store.readSnapshot();

  assert.equal(chain.observation.rawText, chain.rawText);
  assert.equal(snapshot.observations[0].rawText, chain.rawText);
  assert.equal(snapshot.observations[0].context, "  Serbest keşif sırasında  ");
  assert.equal(snapshot.observations[0].childQuote, "  Burada daha hızlı doldu.  ");
  assert.equal(snapshot.evidenceCurriculumLinks.length, 1);
  assert.equal(link.confirmationMethod, "teacher-confirmed");
  assert.equal(link.referenceOrigin, "teacher-declared");
  assert.equal(link.officialCatalogVerified, false);
  assert.match(link.approvedByUserId, /^[0-9a-f-]{36}$/i);
  assert.equal(snapshot.observations[0].confirmedCurriculumLinks, undefined);
  assert.equal(draft.draft.reviewStatus, "pending");
  assert.equal(draft.draft.authoredBy, "teacher");
  assert.equal(draft.draft.referenceVerificationStatus, "teacher-declared-unverified");
  assert.deepEqual(draft.draft.observationIds, [observationId]);
  assert.equal(draft.draft.evidenceCitations[0].observationId, observationId);
  assert.equal(draft.draft.evidenceCitations[0].rawText, undefined);
});

test("resmî TYMM planı bütüncül graf referansını plan-etkinlik-gözlem-değerlendirme zincirinde exact korur", async () => {
  const store = activeStore();
  const officialProfile = {
    framework: "tymm",
    programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
    catalogId: OFFICIAL_STARTER_CATALOG_PROFILES.tymm.catalogId,
    sourceVersion: OFFICIAL_STARTER_CATALOG_PROFILES.tymm.sourceVersion,
    referenceOrigin: "official-catalog",
    officialCatalogVerified: true,
  };
  store.snapshot.classrooms[0].curriculumProfileSnapshot = officialProfile;
  const officialTarget = curriculumTargetsForProfile(
    officialProfile,
    "60-72",
  ).find((target) => target.referenceCode === "FAB.1");
  assert.ok(officialTarget);

  const created = await createPlanWithActivity(store, {
    civilDate: "2026-09-01",
    planId,
    activityId,
    planTitle: "Bütüncül kaynaklı fen planı",
    activityTitle: "Su kaplarını gözlemleme",
    startTime: "09:00",
    curriculumProfile: officialProfile,
    curriculumTargets: [officialTarget],
    assignmentMode: "selected-students",
    studentIds: [student],
    now: new Date("2026-09-01T06:10:00.000Z"),
  });
  const targetSnapshot = created.activity.curriculumTargets[0];
  assert.equal(
    targetSnapshot.holisticGraphReference.graphId,
    "meb-tymm-okul-oncesi-2024-holistic-graph",
  );
  assert.equal(
    targetSnapshot.holisticGraphReference.reviewStatus,
    "pending-human-review",
  );
  assert.equal(
    canonicalJson(created.plan.curriculumTargets[0].holisticGraphReference),
    canonicalJson(targetSnapshot.holisticGraphReference),
  );

  await captureImmutableRawObservation(store, {
    observationId,
    studentId: student,
    planId,
    activityId,
    rawText: "Çocuk iki kabı yan yana getirip su seviyelerini parmağıyla gösterdi.",
    observedAt: "2026-09-01T07:00:00.000Z",
    now: new Date("2026-09-01T07:01:00.000Z"),
  });
  const link = await confirmObservationCurriculumLink(store, {
    observationId,
    framework: officialProfile.framework,
    catalogId: officialProfile.catalogId,
    sourceVersion: officialProfile.sourceVersion,
    referenceCode: officialTarget.referenceCode,
    referenceTitle: officialTarget.referenceTitle,
    referenceOrigin: "official-catalog",
    officialCatalogVerified: true,
    plannedTargetId: officialTarget.id,
    now: new Date("2026-09-01T08:00:00.000Z"),
  });
  assert.equal(link.schemaVersion, 2);
  assert.equal(
    canonicalJson(link.holisticGraphReference),
    canonicalJson(targetSnapshot.holisticGraphReference),
  );

  const assessment = await createCitedAssessmentDraft(store, {
    draftId,
    studentId: student,
    observationIds: [observationId],
    assessmentTargetIds: [officialTarget.id],
    teacherAssessmentText:
      "Seçili kanıtta çocuk iki kaptaki görünür seviyeleri karşılaştırdı.",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    now: new Date("2026-09-30T12:00:00.000Z"),
  });
  assert.equal(
    assessment.draft.evidenceCitations[0].confirmedCurriculumLinkIds[0],
    link.id,
  );
  assert.equal(
    assessment.draft.referenceVerificationStatus,
    "official-catalog-verified",
  );
});

test("genel gözlem yakalama puan, kalıcı etiket ve hassas veriyi hiçbir alandan yazamaz", async () => {
  const store = activeStore();
  await createEvidenceChain(store);
  const attempts = [
    { rawText: "Saygısı: 95 olarak kaydedildi." },
    { rawText: "Karakter açısından mükemmeldir." },
    { rawText: "Fâtiha okudu." },
    { rawText: "Alerjisi için ilaç kullandı." },
    { rawText: "Mahrem bölgesinden söz etti." },
    { rawText: "Ailesinin velayet davası konuşuldu." },
    {
      rawText: "Çocuk iki taşı yan yana koydu.",
      childQuote: "Fâtiha okudum.",
    },
    {
      rawText: "Çocuk iki taşı yan yana koydu.",
      context: "Ailesinin sağlık durumu konuşulurken.",
    },
  ];

  for (const [index, attempt] of attempts.entries()) {
    const before = await store.readSnapshot();
    await assert.rejects(
      captureImmutableRawObservation(store, {
        observationId: `00000000-0000-4000-8000-${String(420 + index).padStart(12, "0")}`,
        studentId: student,
        planId,
        activityId,
        observedAt: "2026-09-01T07:10:00.000Z",
        now: new Date("2026-09-01T07:11:00.000Z"),
        ...attempt,
      }),
      /puan|karakter|kişisel inanç|hassas kişisel bilgi/i,
    );
    assert.deepEqual(await store.readSnapshot(), before);
  }

  const exactSafeText = "  Arkadaşının inancına saygı gösterdi.  ";
  const safe = await captureImmutableRawObservation(store, {
    observationId: "00000000-0000-4000-8000-000000000430",
    studentId: student,
    planId,
    activityId,
    rawText: exactSafeText,
    observedAt: "2026-09-01T07:12:00.000Z",
    now: new Date("2026-09-01T07:13:00.000Z"),
  });
  assert.equal(safe.observation.rawText, exactSafeText);
});

test("ham gözlemin üzerine yazmayı ve TYMM planına MEB 2024 bağlantısını reddeder", async () => {
  const store = activeStore();
  const chain = await createEvidenceChain(store);
  const before = await store.readSnapshot();

  await assert.rejects(
    persistDashboardObservation(store, {
      id: observationId,
      studentId: student,
      rawText: "Değiştirilmemesi gereken yeni metin",
      createdAtUtc: "2026-09-01T07:00:00.000Z",
    }),
    /Ham gözlem değiştirilemez/,
  );
  await assert.rejects(
    confirmObservationCurriculumLink(store, {
      observationId,
      framework: "meb_2024",
      catalogId: "meb-2024-okul-oncesi-v1",
      sourceVersion: "2024.1",
      referenceCode: "MEB-OÖ-01",
      referenceTitle: "Kurgu uyumsuz başlık",
    }),
    /planın doğrulanmış katalog ve program profiliyle uyuşmuyor/,
  );
  const after = await store.readSnapshot();

  assert.equal(after.observations[0].rawText, chain.rawText);
  assert.deepEqual(after, before);
});

test("arşivlenen eğitim yılında yeni plan veya ham kanıt yazılamaz", async () => {
  const store = activeStore();
  await archiveAcademicYear(store, {
    academicYearId: year,
    closedOn: "2027-06-30",
    now: new Date("2027-06-30T14:00:00.000Z"),
  });

  await assert.rejects(
    createPlanWithActivity(store, {
      civilDate: "2027-06-30",
      planTitle: "Arşive yazılmamalı",
      activityTitle: "Arşive yazılmamalı",
      startTime: "09:00",
      curriculumProfile,
      ...planAssignment,
    }),
    /etkin ve arşivlenmemiş bir sınıf/,
  );
});

test("plan profili aktif sınıf profiliyle tam eşleşir ve eğitim yılı dışına taşamaz", async () => {
  const store = activeStore();

  await assert.rejects(
    createPlanWithActivity(store, {
      civilDate: "2026-09-01",
      planTitle: "Uyuşmayan katalog planı",
      activityTitle: "Uyuşmayan katalog etkinliği",
      startTime: "09:00",
      curriculumProfile: {
        ...curriculumProfile,
        sourceVersion: "2024.2",
      },
      curriculumTargets: [
        {
          ...starterTarget,
          sourceVersion: "2024.2",
        },
      ],
      assignmentMode: "selected-students",
      studentIds: [student],
    }),
    /aktif sınıfın kayıtlı program profiliyle uyuşmuyor/,
  );
  await assert.rejects(
    createPlanWithActivity(store, {
      civilDate: "2027-07-01",
      planTitle: "Dönem dışı plan",
      activityTitle: "Dönem dışı etkinlik",
      startTime: "09:00",
      curriculumProfile,
      ...planAssignment,
    }),
    /aktif eğitim yılının tarih aralığında/,
  );
  assert.equal((await store.readSnapshot()).plans.length, 0);
});

test("öğretmen onay kimliğini bir kez üretir ve sonraki bağlantılarda aynı UUID'yi kullanır", async () => {
  const store = activeStore();
  await createEvidenceChain(store);
  const firstLink = await confirmObservationCurriculumLink(store, {
    observationId,
    framework: "tymm",
    catalogId: curriculumProfile.catalogId,
    sourceVersion: curriculumProfile.sourceVersion,
    referenceCode: "TYMM-OÖ-FEN-01",
    referenceTitle: "İlk öğretmen beyanı",
    now: new Date("2026-09-01T08:00:00.000Z"),
  });
  await captureImmutableRawObservation(store, {
    observationId: secondObservationId,
    studentId: student,
    planId,
    activityId,
    rawText: "Çocuk ikinci kaptaki su seviyesini parmağıyla gösterdi.",
    observedAt: "2026-09-01T08:05:00.000Z",
    now: new Date("2026-09-01T08:06:00.000Z"),
  });
  const secondLink = await confirmObservationCurriculumLink(store, {
    observationId: secondObservationId,
    framework: "tymm",
    catalogId: curriculumProfile.catalogId,
    sourceVersion: curriculumProfile.sourceVersion,
    referenceCode: "TYMM-OÖ-FEN-02",
    referenceTitle: "İkinci öğretmen beyanı",
    now: new Date("2026-09-01T08:10:00.000Z"),
  });
  const identity = (await store.readSnapshot()).settings.find(
    (record) =>
      record.id === LOCAL_TEACHER_IDENTITY_SETTING_ID &&
      record.settingType === LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
  );

  assert.ok(identity);
  assert.equal(firstLink.approvedByUserId, identity.teacherUserId);
  assert.equal(secondLink.approvedByUserId, identity.teacherUserId);
  assert.match(identity.teacherUserId, /^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
  await assert.rejects(
    confirmObservationCurriculumLink(store, {
      observationId: secondObservationId,
      framework: "tymm",
      catalogId: curriculumProfile.catalogId,
      sourceVersion: curriculumProfile.sourceVersion,
      referenceCode: "TYMM-OÖ-FEN-03",
      referenceTitle: "Kimlik değiştirme denemesi",
      approvedByUserId: "00000000-0000-4000-8000-000000000499",
    }),
    /kalıcı kimlikle uyuşmuyor/,
  );
});

test("değerlendirme dönemi seçilen gözlemleri kapsar ve kaynak sürümlerini karıştırmaz", async () => {
  const store = activeStore();
  await createEvidenceChain(store);
  await confirmObservationCurriculumLink(store, {
    observationId,
    framework: "tymm",
    catalogId: curriculumProfile.catalogId,
    sourceVersion: curriculumProfile.sourceVersion,
    referenceCode: "TYMM-OÖ-FEN-01",
    referenceTitle: "Öğretmen beyanı",
  });

  await assert.rejects(
    createCitedAssessmentDraft(store, {
      studentId: student,
      observationIds: [observationId],
      teacherAssessmentText: "Dönem dışı değerlendirme.",
      periodStart: "2026-09-02",
      periodEnd: "2026-09-30",
    }),
    /gözlemler değerlendirme tarih aralığında/,
  );
  await store.transaction("readwrite", ["evidenceCurriculumLinks"], async (transaction) => {
    const links = await transaction.getAll("evidenceCurriculumLinks");
    await transaction.putMany("evidenceCurriculumLinks", [
      {
        ...links[0],
        id: "00000000-0000-4000-8000-000000000409",
        sourceVersion: "2024.2",
        referenceCode: "TYMM-OÖ-FEN-02",
      },
    ]);
  });
  await assert.rejects(
    createCitedAssessmentDraft(store, {
      studentId: student,
      observationIds: [observationId],
      teacherAssessmentText: "Sürümü karışık değerlendirme.",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    }),
    /kaynak sürümleri karıştırılamaz/,
  );
});

test("öğretmen beyanı doğrulanmış resmî katalog gibi işaretlenemez", () => {
  assert.throws(
    () =>
      normalizeCurriculumProfile({
        ...curriculumProfile,
        officialCatalogVerified: true,
      }),
    /Yalnız resmî katalog kaynağı/,
  );
});

test("tüm sınıfa dağıtım etkin çocukların sabit planlı takip fotoğrafını oluşturur; öğrenildi kaydı üretmez", async () => {
  const store = activeStore();
  const secondStudent = "00000000-0000-4000-8000-000000000410";
  const leftStudent = "00000000-0000-4000-8000-000000000411";
  await store.transaction("readwrite", ["students"], async (transaction) => {
    const students = await transaction.getAll("students");
    await transaction.putMany("students", [
      ...students,
      {
        ...base,
        id: secondStudent,
        displayName: "Kurgu İkinci Öğrenci",
        academicYearId: year,
        classroomId: classroom,
      },
      {
        ...base,
        id: leftStudent,
        displayName: "Kurgu Ayrılmış Öğrenci",
        academicYearId: year,
        classroomId: classroom,
        enrollmentStatus: "left",
      },
    ]);
  });

  const result = await createPlanWithActivity(store, {
    civilDate: "2026-09-01",
    planTitle: "Tüm sınıf fen planı",
    activityTitle: "Bahçede bilimsel gözlem",
    startTime: "09:00",
    curriculumProfile,
    curriculumTargets: [
      starterTarget,
      curriculumTargetsForProfile(curriculumProfile).find(
        (target) => target.referenceCode === "FAB.2",
      ),
    ].filter(Boolean),
    assignmentMode: "whole-class",
    studentIds: [leftStudent],
    now: new Date("2026-09-01T06:15:00.000Z"),
  });
  const snapshot = await store.readSnapshot();

  assert.deepEqual(
    [...result.activity.studentIds].sort(),
    [student, secondStudent].sort(),
  );
  assert.equal(result.activity.assignmentMode, "whole-class");
  assert.equal(result.activity.coverageStatus, "planned");
  assert.equal(result.activity.targetAssignments.length, 4);
  assert.ok(
    result.activity.targetAssignments.every(
      (assignment) => assignment.status === "planned",
    ),
  );
  assert.equal(snapshot.observations.length, 0);
  assert.equal(snapshot.evidenceCurriculumLinks.length, 0);
  assert.equal(snapshot.reportDrafts.length, 0);
  assert.equal(result.activity.learned, undefined);
});

test("seçili çocuk kapsamı bilinmeyen çocuğu atomik olarak reddeder", async () => {
  const store = activeStore();

  await assert.rejects(
    createPlanWithActivity(store, {
      civilDate: "2026-09-01",
      planTitle: "Geçersiz kapsam",
      activityTitle: "Geçersiz kapsam",
      startTime: "09:00",
      curriculumProfile,
      curriculumTargets: [starterTarget],
      assignmentMode: "selected-students",
      studentIds: ["00000000-0000-4000-8000-000000000499"],
    }),
    /yalnız etkin sınıftaki aktif çocuklara/,
  );
  const snapshot = await store.readSnapshot();
  assert.equal(snapshot.plans.length, 0);
  assert.equal(snapshot.activities.length, 0);
});

test("elle yazılan gözlem hedefi servis katmanında da resmî katalog hedefi gibi saklanamaz", async () => {
  const store = activeStore();
  await createEvidenceChain(store);
  const before = canonicalJson(await store.readSnapshot());

  await assert.rejects(
    confirmObservationCurriculumLink(store, {
      observationId,
      framework: "tymm",
      catalogId: curriculumProfile.catalogId,
      sourceVersion: curriculumProfile.sourceVersion,
      referenceCode: "ELLE-GIRILEN-01",
      referenceTitle: "Öğretmen tarafından elle yazılan hedef",
      referenceOrigin: "official-catalog",
      officialCatalogVerified: true,
    }),
    /Elle yazılan program referansı resmî katalog hedefi olarak işaretlenemez/u,
  );
  assert.equal(canonicalJson(await store.readSnapshot()), before);

  const link = await confirmObservationCurriculumLink(store, {
    observationId,
    framework: "tymm",
    catalogId: curriculumProfile.catalogId,
    sourceVersion: curriculumProfile.sourceVersion,
    referenceCode: "ELLE-GIRILEN-01",
    referenceTitle: "Öğretmen tarafından elle yazılan hedef",
    referenceOrigin: "teacher-declared",
    officialCatalogVerified: false,
  });
  assert.equal(link.referenceOrigin, "teacher-declared");
  assert.equal(link.officialCatalogVerified, false);
  assert.equal(link.targetSourceUrl, "about:blank");
});

test("anlık gözlem bağlamı açıkken bugünün planı aynı işlemde devam ediyor olarak oluşturulur", async () => {
  const store = activeStore();
  await store.transaction("readwrite", ["plans", "activities"], async (transaction) => {
    await transaction.putMany("plans", [
      {
        ...base,
        id: "00000000-0000-4000-8000-000000000489",
        planType: "spontaneous-observation",
        title: "Anlık gözlemler",
        status: "active",
        academicYearId: year,
        classroomId: classroom,
        curriculumTargets: [],
        maarifRefs: [],
      },
    ]);
    await transaction.putMany("activities", [
      {
        ...base,
        id: "00000000-0000-4000-8000-000000000490",
        planId: "00000000-0000-4000-8000-000000000489",
        activityKind: "spontaneous-observation",
        title: "Anlık gözlemler",
        status: "in_progress",
        academicYearId: year,
        classroomId: classroom,
        curriculumTargets: [],
        maarifRefs: [],
      },
    ]);
  });

  const result = await createPlanWithActivity(store, {
    civilDate: "2026-09-01",
    planId: "00000000-0000-4000-8000-000000000492",
    planTitle: "Canlı fen planı",
    activityId: "00000000-0000-4000-8000-000000000494",
    activityTitle: "Batar mı, yüzer mi?",
    startTime: "09:00",
    curriculumProfile,
    ...planAssignment,
    initialActivityStatus: "in_progress",
    now: new Date("2026-09-01T06:20:00.000Z"),
  });
  const snapshot = await store.readSnapshot();

  assert.equal(result.activity.status, "in_progress");
  assert.equal(snapshot.plans.length, 2);
  assert.equal(snapshot.activities.length, 2);
  assert.equal(
    snapshot.activities.find((record) => record.id === result.activity.id)?.status,
    "in_progress",
  );
});

test("yalnız etkinlik işareti taşıyan sahte anlık bağlam devam eden etkinlik çakışmasını atlatamaz", async () => {
  const store = activeStore();
  const spoofedPlanId = "00000000-0000-4000-8000-000000000496";
  const spoofedActivityId = "00000000-0000-4000-8000-000000000497";
  await store.transaction("readwrite", ["plans", "activities"], async (transaction) => {
    await transaction.putMany("plans", [
      {
        ...base,
        id: spoofedPlanId,
        planType: "daily",
        title: "Normal günlük plan",
        academicYearId: year,
        classroomId: classroom,
        curriculumTargets: [],
        maarifRefs: [],
      },
    ]);
    await transaction.putMany("activities", [
      {
        ...base,
        id: spoofedActivityId,
        planId: spoofedPlanId,
        activityKind: "spontaneous-observation",
        title: "İşareti değiştirilmiş gerçek etkinlik",
        status: "in_progress",
        academicYearId: year,
        classroomId: classroom,
        curriculumTargets: [],
        maarifRefs: [],
      },
    ]);
  });

  await assert.rejects(
    createPlanWithActivity(store, {
      civilDate: "2026-09-01",
      planId: "00000000-0000-4000-8000-000000000498",
      planTitle: "İz bırakmaması gereken plan",
      activityId: "00000000-0000-4000-8000-000000000499",
      activityTitle: "İz bırakmaması gereken etkinlik",
      startTime: "10:30",
      curriculumProfile,
      ...planAssignment,
      initialActivityStatus: "in_progress",
      now: new Date("2026-09-01T07:30:00.000Z"),
    }),
    /başka bir etkinlik devam ediyor/,
  );

  const snapshot = await store.readSnapshot();
  assert.deepEqual(snapshot.plans.map((record) => record.id), [spoofedPlanId]);
  assert.deepEqual(snapshot.activities.map((record) => record.id), [spoofedActivityId]);
});

test("başka gerçek etkinlik sürerken plan ve etkinlik birlikte, iz bırakmadan reddedilir", async () => {
  const store = activeStore();
  await store.transaction("readwrite", ["activities"], async (transaction) => {
    await transaction.putMany("activities", [
      {
        ...base,
        id: "00000000-0000-4000-8000-000000000491",
        title: "Devam eden gerçek etkinlik",
        status: "in_progress",
        academicYearId: year,
        classroomId: classroom,
      },
    ]);
  });

  await assert.rejects(
    createPlanWithActivity(store, {
      civilDate: "2026-09-01",
      planId: "00000000-0000-4000-8000-000000000493",
      planTitle: "Reddedilecek plan",
      activityId: "00000000-0000-4000-8000-000000000495",
      activityTitle: "Reddedilecek etkinlik",
      startTime: "10:00",
      curriculumProfile,
      ...planAssignment,
      initialActivityStatus: "in_progress",
      now: new Date("2026-09-01T06:25:00.000Z"),
    }),
    /başka bir etkinlik devam ediyor/,
  );
  const snapshot = await store.readSnapshot();

  assert.equal(snapshot.plans.length, 0);
  assert.equal(snapshot.activities.length, 1);
  assert.equal(snapshot.activities[0].id, "00000000-0000-4000-8000-000000000491");
});

test("gözlem ve resmî hedef bağı etkinlikte planlanan öğrenci-hedef kapsamından çıkamaz", async () => {
  const store = activeStore();
  await createEvidenceChain(store);
  const otherTarget = curriculumTargetsForProfile(curriculumProfile).find(
    (target) => target.referenceCode === "MAB.1",
  );
  assert.ok(otherTarget);

  await assert.rejects(
    confirmObservationCurriculumLink(store, {
      observationId,
      framework: curriculumProfile.framework,
      catalogId: curriculumProfile.catalogId,
      sourceVersion: curriculumProfile.sourceVersion,
      referenceCode: otherTarget.referenceCode,
      referenceTitle: otherTarget.referenceTitle,
      plannedTargetId: otherTarget.id,
    }),
    /yalnız etkinlikte planlanan hedeflerden/,
  );
  assert.equal((await store.readSnapshot()).evidenceCurriculumLinks.length, 0);
});

test("başlangıç katalog seti yaş bandında tekildir; TYMM complete, MEB 2024 partial kalır", () => {
  const keys = STARTER_CURRICULUM_TARGETS.map(
    (target) =>
      `${target.framework}\u0000${target.ageBands?.join(",") ?? "all"}\u0000${target.referenceCode}`,
  );
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(
    STARTER_CURRICULUM_TARGETS.every(
      (target) =>
        target.sourceUrl.startsWith("https://") &&
        /^\d{4}-\d{2}-\d{2}$/.test(target.sourceCheckedOn) &&
        (target.framework === "tymm"
          ? target.catalogCompleteness === "complete" &&
            target.kind === "learning-outcome" &&
            target.ageBands?.length === 1 &&
            Number.isInteger(target.sourcePage)
          : target.catalogCompleteness === "partial" &&
            target.ageBands === undefined &&
            target.sourcePage === undefined) &&
        target.verificationStatus === "official-source-checked",
    ),
  );
});
