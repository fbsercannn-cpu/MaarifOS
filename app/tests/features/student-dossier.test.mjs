import assert from "node:assert/strict";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  buildExternalFeedbackAggregation,
  buildStudentDossier,
  createStudentDossier,
  listExternalAiFeedback,
  saveExternalAiFeedback,
} from "../../src/features/reports/student-dossier.ts";

class MemoryStore {
  snapshot;

  constructor(snapshot) {
    this.snapshot = structuredClone(snapshot);
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
    return structuredClone(this.snapshot);
  }

  close() {}
}

const academicYearId = "00000000-0000-4000-8000-000000000731";
const classroomId = "00000000-0000-4000-8000-000000000732";
const studentId = "00000000-0000-4000-8000-000000000733";
const observationId = "00000000-0000-4000-8000-000000000734";

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
      },
    ],
    profileSchemaVersion: 5,
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
    schemaVersion: 5,
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
