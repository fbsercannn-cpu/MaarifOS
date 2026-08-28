import assert from "node:assert/strict";
import test from "node:test";

import { COLLECTION_NAMES } from "../../src/core/domain/model.ts";
import {
  ENTITY_RECORD_GUARDS,
  assertEntityRecord,
  createEmptyEntitySnapshot,
  isEntityRecord,
} from "../../src/core/repository/entities.ts";
import {
  INDEXED_DB_MIGRATIONS,
  MAARIFOS_DATABASE_VERSION,
  OBSERVATION_RELATION_INDEX_DEFINITIONS,
  VALUE_EVIDENCE_LINK_INDEX_DEFINITIONS,
} from "../../src/core/repository/indexed-db-definitions.ts";

const base = {
  createdAt: "2026-09-02T06:00:00.000Z",
  updatedAt: "2026-09-02T06:00:00.000Z",
  civilDate: "2026-09-02",
  deletedAt: null,
  schemaVersion: 1,
};

const academicYearId = "00000000-0000-4000-8000-000000000901";
const classroomId = "00000000-0000-4000-8000-000000000902";
const studentId = "00000000-0000-4000-8000-000000000903";
const observationId = "00000000-0000-4000-8000-000000000905";

const valueEvidenceLink = {
  ...base,
  id: "00000000-0000-4000-8000-000000000910",
  academicYearId,
  classroomId,
  observationId,
  studentId,
  planId: "00000000-0000-4000-8000-000000000911",
  activityId: "00000000-0000-4000-8000-000000000912",
  evidenceRole: "supports",
  targetValueCode: "D4",
  targetIndicatorCode: "D4.1.1",
  teacherRationale: "Gözlemdeki somut paylaşma eylemi bu bağı destekliyor.",
  confirmationMethod: "teacher-confirmed",
  confirmationScope: "observation-to-value-action-link",
  confirmedByActorKind: "local-teacher-identity",
  confirmedByActorId: "00000000-0000-4000-8000-000000000913",
  confirmedAt: "2026-09-02T06:05:00.000Z",
  provenance: {
    contentPackId: "maarifos-tymm-6072-2026-2027-v3",
    contentPackVersion: "3.0.0",
    contentReleaseId: "tymm-6072-2026-09-v3",
    contentManifestDigest: `sha256:${"a".repeat(64)}`,
    appliedActivityTemplateId: "tymm6072-sep-fair-sharing",
    appliedValuesDesignId: "tymm6072-sep-fair-sharing:values:v1",
    appliedValuesDesignVersion: "1.0.0",
    appliedValuesDesignDigest: `sha256:${"b".repeat(64)}`,
  },
  supersedesLinkId: null,
};

const records = {
  academicYears: {
    ...base,
    id: academicYearId,
    name: "2026-2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  },
  classrooms: {
    ...base,
    id: classroomId,
    academicYearId,
    name: "Kurgu Sınıfı",
  },
  students: {
    ...base,
    id: studentId,
    academicYearId,
    classroomId,
    displayName: "Ada Kurgu",
  },
  attendanceRecords: {
    ...base,
    id: "00000000-0000-4000-8000-000000000904",
    academicYearId,
    classroomId,
    studentId,
    status: "present",
  },
  observations: {
    ...base,
    id: observationId,
    academicYearId,
    classroomId,
    studentIds: [studentId],
    rawText: "Kurgu nesnel gözlem notu.",
    observedAt: "2026-09-02T06:00:00.000Z",
    planId: "00000000-0000-4000-8000-000000000911",
    activityId: "00000000-0000-4000-8000-000000000912",
    rawTextImmutable: true,
    workflowStatus: "captured",
  },
  plans: {
    ...base,
    id: "00000000-0000-4000-8000-000000000911",
    academicYearId,
    classroomId,
    planType: "daily",
    title: "Kurgu günlük plan",
  },
  activities: {
    ...base,
    id: "00000000-0000-4000-8000-000000000912",
    academicYearId,
    classroomId,
    planId: "00000000-0000-4000-8000-000000000911",
    title: "Kurgu gerçek etkinlik",
    status: "planned",
  },
  evidenceCurriculumLinks: {
    ...base,
    id: "00000000-0000-4000-8000-000000000914",
    academicYearId,
    classroomId,
    observationId,
    framework: "tymm",
    programLabel: "Türkiye Yüzyılı Maarif Modeli",
    catalogId: "tymm-2024-okul-oncesi-v1",
    sourceVersion: "2024.09.02",
    referenceCode: "FAB.1",
    referenceTitle: "Bilimsel gözlem yapabilme",
    confirmedAt: "2026-09-02T06:05:00.000Z",
    approvedByUserId: "00000000-0000-4000-8000-000000000913",
    confirmationMethod: "teacher-confirmed",
    referenceOrigin: "official-catalog",
    officialCatalogVerified: true,
    plannedTargetId: "tymm-2024-60-72-fab-1",
    targetKind: "learning-outcome",
    targetDomain: "Fen",
    targetSourceUrl: "https://tymm.meb.gov.tr/",
    targetSourcePage: 245,
    targetSourceSha256: `sha256:${"c".repeat(64)}`,
  },
  valueEvidenceLinks: valueEvidenceLink,
  calendarEntries: {
    ...base,
    id: "00000000-0000-4000-8000-000000000906",
    academicYearId,
    classroomId,
    title: "Kurgu veli toplantısı",
    entryType: "parent_meeting",
    startDate: "2026-09-10",
    endDate: "2026-09-10",
    status: "planned",
  },
};

test("EntityMap ile modellenen koleksiyonlar ortak registry guard'ından geçer", () => {
  for (const [collection, record] of Object.entries(records)) {
    assert.equal(isEntityRecord(collection, record), true, collection);
    assert.doesNotThrow(() => assertEntityRecord(collection, record));
  }
});

test("değer kanıt bağı guard'ı kimlik, rol, hedef, onay ve provenance alanlarında fail-closed davranır", () => {
  const invalidLinks = [
    { ...valueEvidenceLink, schemaVersion: 2 },
    { ...valueEvidenceLink, planId: "geçersiz" },
    { ...valueEvidenceLink, evidenceRole: "proves_character" },
    { ...valueEvidenceLink, targetValueCode: "D21" },
    { ...valueEvidenceLink, targetIndicatorCode: "D14.1.1" },
    { ...valueEvidenceLink, teacherRationale: " " },
    { ...valueEvidenceLink, teacherRationale: "a".repeat(1_001) },
    { ...valueEvidenceLink, confirmedAt: "2026-09-02 09:05" },
    { ...valueEvidenceLink, confirmationMethod: "machine-inferred" },
    { ...valueEvidenceLink, supersedesLinkId: "geçersiz" },
    {
      ...valueEvidenceLink,
      provenance: {
        ...valueEvidenceLink.provenance,
        contentManifestDigest: "a".repeat(64),
      },
    },
    {
      ...valueEvidenceLink,
      provenance: {
        ...valueEvidenceLink.provenance,
        appliedValuesDesignVersion: "2.0.0",
      },
    },
  ];

  assert.ok(
    invalidLinks.every(
      (record) => !isEntityRecord("valueEvidenceLinks", record),
    ),
  );
});

test("IndexedDB v7 öğrenci kasası ve değer kanıtı indekslerini tanımlar", () => {
  assert.equal(MAARIFOS_DATABASE_VERSION, 7);
  assert.equal(INDEXED_DB_MIGRATIONS.at(-1)?.toVersion, 7);
  assert.deepEqual(
    VALUE_EVIDENCE_LINK_INDEX_DEFINITIONS.map((definition) => ({
      name: definition.name,
      keyPath: definition.keyPath,
      unique: definition.options?.unique ?? false,
    })),
    [
      { name: "by-classroom", keyPath: "classroomId", unique: false },
      {
        name: "by-academic-year-classroom",
        keyPath: ["academicYearId", "classroomId"],
        unique: false,
      },
      { name: "by-observation", keyPath: "observationId", unique: false },
      { name: "by-student", keyPath: "studentId", unique: false },
      {
        name: "by-target-key",
        keyPath: [
          "observationId",
          "activityId",
          "targetValueCode",
          "targetIndicatorCode",
        ],
        unique: false,
      },
    ],
  );
  assert.deepEqual(
    OBSERVATION_RELATION_INDEX_DEFINITIONS.map((definition) => ({
      name: definition.name,
      keyPath: definition.keyPath,
    })),
    [
      { name: "by-plan", keyPath: "planId" },
      { name: "by-activity", keyPath: "activityId" },
    ],
  );
});

test("kanonik ilişki kayıtları bozuk plan, etkinlik, gözlem ve program bağlarını reddeder", () => {
  assert.equal(
    isEntityRecord("activities", { ...records.activities, planId: "bozuk" }),
    false,
  );
  assert.equal(isEntityRecord("plans", { ...records.plans, planType: "" }), false);
  assert.equal(
    isEntityRecord("observations", { ...records.observations, activityId: "bozuk" }),
    false,
  );
  assert.equal(
    isEntityRecord("evidenceCurriculumLinks", {
      ...records.evidenceCurriculumLinks,
      referenceOrigin: "teacher-declared",
      officialCatalogVerified: true,
    }),
    false,
  );
  assert.equal(
    isEntityRecord("evidenceCurriculumLinks", {
      ...records.evidenceCurriculumLinks,
      referenceOrigin: "teacher-declared",
      officialCatalogVerified: false,
      targetSourceUrl: "about:blank",
    }),
    true,
  );
});

test("yeni resmî TYMM öğrenme çıktısı bağı exact ve insan incelemesi bekleyen graf referansı olmadan geçmez", () => {
  const holisticGraphReference = {
    graphId: "meb-tymm-okul-oncesi-2024-holistic-graph",
    graphVersion: "1.0.0",
    catalogContentSha256:
      "sha256:3605c74ddc95970671cc54994d40702b6831ad46e92cfed4a9047597804d4d8a",
    reviewStatus: "pending-human-review",
    outcomeNodeId: "outcome:60-72:fen:fab.1",
    relatedNodeIds: [
      "field:60-72:fen:fbab1",
      "process:60-72:fen:fbab1.sb1",
    ],
    sourceSha256:
      "sha256:77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09",
  };
  const canonical = {
    ...records.evidenceCurriculumLinks,
    schemaVersion: 2,
    targetSourceSha256: holisticGraphReference.sourceSha256,
    holisticGraphReference,
  };
  assert.equal(isEntityRecord("evidenceCurriculumLinks", canonical), true);
  const { holisticGraphReference: _omitted, ...missingReference } = canonical;
  assert.equal(
    isEntityRecord("evidenceCurriculumLinks", missingReference),
    false,
  );
  assert.equal(
    isEntityRecord("evidenceCurriculumLinks", {
      ...canonical,
      holisticGraphReference: {
        ...holisticGraphReference,
        reviewStatus: "approved",
      },
    }),
    false,
  );
  assert.equal(
    isEntityRecord("evidenceCurriculumLinks", {
      ...canonical,
      holisticGraphReference: {
        ...holisticGraphReference,
        catalogContentSha256: `sha256:${"0".repeat(64)}`,
      },
    }),
    false,
  );
});

test("registry bütün koleksiyonları kapsar ve açık koleksiyonları StoredRecord olarak doğrular", () => {
  assert.deepEqual(Object.keys(ENTITY_RECORD_GUARDS).sort(), [...COLLECTION_NAMES].sort());
  assert.equal(
    isEntityRecord("settings", {
      ...base,
      id: "00000000-0000-4000-8000-000000000907",
      settingType: "kurgu-ayar",
    }),
    true,
  );
});

test("koleksiyon ile kayıt tipi karıştığında ve domain alanı bozulduğunda fail-closed davranır", () => {
  assert.equal(isEntityRecord("students", records.attendanceRecords), false);
  assert.equal(
    isEntityRecord("attendanceRecords", {
      ...records.attendanceRecords,
      status: "izinli",
    }),
    false,
  );
  assert.equal(
    isEntityRecord("calendarEntries", {
      ...records.calendarEntries,
      startDate: "2026-09-11",
      endDate: "2026-09-10",
    }),
    false,
  );
  assert.throws(
    () => assertEntityRecord("classrooms", { ...records.classrooms, name: "" }),
    /sınıf sözleşmesine uymuyor/,
  );
});

test("EntitySnapshot tüm koleksiyonları bağımsız ve boş dizilerle başlatır", () => {
  const snapshot = createEmptyEntitySnapshot();
  assert.deepEqual(Object.keys(snapshot).sort(), [...COLLECTION_NAMES].sort());
  assert.ok(COLLECTION_NAMES.every((collection) => snapshot[collection].length === 0));

  snapshot.students.push(records.students);
  assert.equal(snapshot.students[0].displayName, "Ada Kurgu");
  assert.equal(snapshot.classrooms.length, 0);
});

test("öğrenci guard'ı tolerant profil okuyucusunun atacağı bozuk optional alanları reddeder", () => {
  const invalidStudents = [
    { ...records.students, contacts: "bozuk" },
    { ...records.students, firstName: 42 },
    { ...records.students, academicYearId: "geçersiz" },
    { ...records.students, active: "true" },
    { ...records.students, enrollmentStatus: "beklemede" },
    {
      ...records.students,
      contacts: [{
        id: "00000000-0000-4000-8000-000000000908",
        kind: "mother",
        relationship: "Anne",
        phone: "+905551112233",
      }],
    },
  ];

  assert.ok(
    invalidStudents.every((record) => !isEntityRecord("students", record)),
  );
});

test("takvim guard'ı eksik zorunlu alanı ve sessizce düşürülebilecek optional alanları reddeder", () => {
  const { endDate: _endDate, ...missingEndDate } = records.calendarEntries;
  const invalidEntries = [
    missingEndDate,
    { ...records.calendarEntries, note: 42 },
    { ...records.calendarEntries, note: "" },
    { ...records.calendarEntries, officialEventId: 42 },
    { ...records.calendarEntries, academicYearId: "geçersiz" },
  ];

  assert.ok(
    invalidEntries.every(
      (record) => !isEntityRecord("calendarEntries", record),
    ),
  );
});

test("gözlem guard'ı ilan ettiği bütün optional domain alanlarını fail-closed doğrular", () => {
  const invalidObservations = [
    { ...records.observations, observationType: "yorum" },
    { ...records.observations, observationCategories: "dil" },
    { ...records.observations, observationCategories: ["bilinmeyen"] },
    { ...records.observations, academicYearId: "geçersiz" },
    { ...records.observations, classroomId: 42 },
    { ...records.observations, _MUKERRER_INCELE: false },
    { ...records.observations, duplicateOf: "geçersiz" },
  ];

  assert.ok(
    invalidObservations.every(
      (record) => !isEntityRecord("observations", record),
    ),
  );
});
