import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { archiveAcademicYear } from "../../src/features/archive/academic-year-archive.ts";
import {
  CURRICULUM_PROGRAM_LABELS,
  captureImmutableRawObservation,
  confirmObservationCurriculumLink,
  createCitedAssessmentDraft,
  createPlanWithActivity,
} from "../../src/features/evidence/evidence-flow.ts";
import { persistDashboardObservation } from "../../src/features/dashboard/dashboard-data.ts";

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

async function createEvidenceChain(store) {
  const planActivity = await createPlanWithActivity(store, {
    civilDate: "2026-09-01",
    planId,
    planTitle: "Suyun hareketini gözlemleme planı",
    activityId,
    activityTitle: "Kaplarda su aktarımı",
    startTime: "09:30",
    endTime: "10:00",
    curriculumProfile: {
      framework: "tymm",
      programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
      catalogId: "tymm-2024-okul-oncesi-v1",
      sourceVersion: "2024.1",
    },
    now: new Date("2026-09-01T06:10:00.000Z"),
  });
  const rawText = "  Çocuk, suyu geniş kaptan dar kaba aktarırken “Burada daha hızlı doldu.” dedi.  ";
  const captured = await captureImmutableRawObservation(store, {
    observationId,
    studentId: student,
    planId,
    activityId,
    rawText,
    childQuote: "Burada daha hızlı doldu.",
    context: "Serbest keşif sırasında",
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
    approvedByUserId: "local-teacher",
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
  assert.equal(snapshot.evidenceCurriculumLinks.length, 1);
  assert.equal(link.confirmationMethod, "teacher-confirmed");
  assert.equal(snapshot.observations[0].confirmedCurriculumLinks, undefined);
  assert.equal(draft.draft.reviewStatus, "pending");
  assert.equal(draft.draft.authoredBy, "teacher");
  assert.deepEqual(draft.draft.observationIds, [observationId]);
  assert.equal(draft.draft.evidenceCitations[0].observationId, observationId);
  assert.equal(draft.draft.evidenceCitations[0].rawText, undefined);
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
      approvedByUserId: "local-teacher",
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
      curriculumProfile: {
        framework: "tymm",
        programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
        catalogId: "tymm-2024-okul-oncesi-v1",
        sourceVersion: "2024.1",
      },
    }),
    /etkin ve arşivlenmemiş bir sınıf/,
  );
});
