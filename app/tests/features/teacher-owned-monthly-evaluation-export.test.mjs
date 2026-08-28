import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  TEACHER_MONTHLY_PROGRAM_CRITERIA,
  TEACHER_MONTHLY_TEACHER_CRITERIA,
} from "../../src/core/domain/teacher-owned-monthly-evaluation.ts";
import { semanticTaggedPdfPageCount } from "../../src/features/documents/semantic-tagged-pdf.ts";
import {
  generateTeacherOwnedMonthlyEvaluationExportFile,
  loadTeacherOwnedMonthlyEvaluationExportSource,
  prepareTeacherOwnedMonthlyEvaluationExportDocument,
} from "../../src/features/planning/teacher-owned-monthly-evaluation-export.ts";
import {
  createTeacherOwnedPlanGraph,
  loadTeacherMonthlyReviewContext,
  recordTeacherMonthlyEvaluation,
} from "../../src/features/planning/teacher-owned-plan-service.ts";

class MemoryStore {
  constructor(snapshot = createEmptySnapshot()) {
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
        records.forEach((record) => byId.set(record.id, structuredClone(record)));
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      collections.forEach((collection) => {
        this.snapshot[collection] = working[collection];
      });
    }
    return structuredClone(result);
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-00000000c701";
const classroomId = "00000000-0000-4000-8000-00000000c702";
const studentId = "00000000-0000-4000-8000-00000000c703";
const pdfFontBytes = new Uint8Array(readFileSync(new URL(
  "../../public/assets/fonts/MaarifOSSans-Regular.ttf",
  import.meta.url,
)));

const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};

function criteria(definitions, status = "observed-working") {
  return definitions.map(([criterionId]) => ({ criterionId, status }));
}

async function createMonthlyFixture() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026–2027",
    startDate: "2026-09-07",
    endDate: "2027-06-25",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId: yearId,
    name: "Kurgu Ek 18 Sınıfı",
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  snapshot.students.push({
    ...base,
    id: studentId,
    academicYearId: yearId,
    classroomId,
    displayName: "Kurgu Öğrenci",
    enrollmentStatus: "active",
  });
  const store = new MemoryStore(snapshot);
  const graph = await createTeacherOwnedPlanGraph(store, {
    title: "2026–2027 öğretmen yıllık planı",
    periodStart: "2026-09-07",
    periodEnd: "2027-06-25",
    teacherContent: { narrative: "Birlikte öğrenme" },
    months: [{
      title: "Eylül öğretmen planı",
      monthKey: "2026-09",
      periodStart: "2026-09-07",
      periodEnd: "2026-09-30",
      teacherContent: {
        narrative: "Uyum ve aidiyet",
        tymmTargetCodes: ["KB2.4", "D2.3"],
      },
      weeks: [
        {
          title: "7–11 Eylül",
          weekKey: "2026-W37",
          periodStart: "2026-09-07",
          periodEnd: "2026-09-11",
          teacherContent: { narrative: "İlk hafta" },
        },
        {
          title: "14–18 Eylül",
          weekKey: "2026-W38",
          periodStart: "2026-09-14",
          periodEnd: "2026-09-18",
          teacherContent: { narrative: "İkinci hafta" },
        },
      ],
    }],
    now: new Date("2026-09-02T06:00:00.000Z"),
  });
  const monthly = graph.months[0].monthly;
  const weeks = graph.months[0].weeks;
  const records = [
    {
      suffix: "11",
      date: "2026-09-08",
      week: weeks[0],
      observationType: "anecdotal",
      environment: "Sınıf içi öğrenme merkezi",
    },
    {
      suffix: "12",
      date: "2026-09-15",
      week: weeks[1],
      observationType: "quick-note",
      environment: "Okul bahçesi",
    },
  ];
  records.forEach((record, index) => {
    const dailyId = `00000000-0000-4000-8000-00000000d${record.suffix}1`;
    const activityId = `00000000-0000-4000-8000-00000000d${record.suffix}2`;
    const observationId = `00000000-0000-4000-8000-00000000d${record.suffix}3`;
    const linkId = `00000000-0000-4000-8000-00000000d${record.suffix}4`;
    const timestamp = `${record.date}T09:00:00.000Z`;
    store.snapshot.plans.push({
      ...base,
      id: dailyId,
      createdAt: timestamp,
      updatedAt: timestamp,
      civilDate: record.date,
      planType: "daily",
      title: `Kurgu günlük plan ${index + 1}`,
      academicYearId: yearId,
      classroomId,
      sourceAnnualPlanId: graph.annual.id,
      sourceMonthlyPlanId: monthly.id,
      sourceWeeklyPlanId: record.week.id,
    });
    store.snapshot.activities.push({
      ...base,
      id: activityId,
      createdAt: timestamp,
      updatedAt: timestamp,
      civilDate: record.date,
      title: `Kurgu etkinlik ${index + 1}`,
      academicYearId: yearId,
      classroomId,
      planId: dailyId,
      sourceAnnualPlanId: graph.annual.id,
      sourceMonthlyPlanId: monthly.id,
      sourceWeeklyPlanId: record.week.id,
      environment: record.environment,
    });
    store.snapshot.observations.push({
      ...base,
      id: observationId,
      createdAt: timestamp,
      updatedAt: timestamp,
      observedAt: timestamp,
      civilDate: record.date,
      academicYearId: yearId,
      classroomId,
      planId: dailyId,
      activityId,
      studentIds: [studentId],
      rawText: `Kurgu değişmez gözlem ${index + 1}`,
      rawTextImmutable: true,
      observationType: record.observationType,
    });
    store.snapshot.evidenceCurriculumLinks.push({
      ...base,
      id: linkId,
      createdAt: timestamp,
      updatedAt: timestamp,
      civilDate: record.date,
      academicYearId: yearId,
      classroomId,
      observationId,
      referenceCode: `KB${index + 1}`,
      referenceTitle: `Kurgu program bağı ${index + 1}`,
      confirmationMethod: "teacher-confirmed",
      approvedByUserId: "00000000-0000-4000-8000-00000000c799",
      confirmedAt: timestamp,
    });
  });
  return { store, monthly };
}

async function recordEvaluation(store, monthlyId, now, label) {
  const context = await loadTeacherMonthlyReviewContext(store, monthlyId);
  return recordTeacherMonthlyEvaluation(store, {
    monthlyPlanId: monthlyId,
    expectedMonthlyUpdatedAt: context.monthly.updatedAt,
    childEvidenceState: "sufficient-evidence",
    childNarrative: `${label}: iki haftaya yayılan değişmez gözlemler birlikte incelendi.`,
    observationIds: context.observations.map((observation) => observation.id),
    curriculumLinkIds: context.observations.flatMap((observation) =>
      observation.curriculumLinks.map((link) => link.id),
    ),
    programCriteria: criteria(TEACHER_MONTHLY_PROGRAM_CRITERIA),
    programNarrative: `${label}: programın süre ve katılım kararları gözden geçirildi.`,
    teacherCriteria: criteria(
      TEACHER_MONTHLY_TEACHER_CRITERIA,
      "needs-adjustment",
    ),
    teacherNarrative: `${label}: geçişlerde daha esnek süre kullanacağım.`,
    nextMonthRecommendation: `${label}: farklı ortamlarda kanıt toplamayı sürdür.`,
    now,
  });
}

function readStoredZipEntry(bytes, expectedName) {
  const buffer = Buffer.from(bytes);
  let offset = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString("utf8");
    if (name === expectedName) {
      return buffer.subarray(dataStart, dataStart + compressedSize).toString("utf8");
    }
    offset = dataStart + compressedSize;
  }
  throw new Error(`${expectedName} ZIP içinde bulunamadı.`);
}

test("son kayıt ve exact kimlikle seçilen geçmiş değerlendirme ayrı ayrı hazırlanır", async () => {
  const { store, monthly } = await createMonthlyFixture();
  const first = await recordEvaluation(
    store,
    monthly.id,
    new Date("2026-09-30T15:00:00.000Z"),
    "İlk kayıt",
  );
  const second = await recordEvaluation(
    store,
    monthly.id,
    new Date("2026-09-30T16:00:00.000Z"),
    "İkinci kayıt",
  );
  const source = await loadTeacherOwnedMonthlyEvaluationExportSource(store, monthly.id);
  const historical = prepareTeacherOwnedMonthlyEvaluationExportDocument(
    source,
    { kind: "exact", evaluationId: first.id },
    "word",
    { exportedAt: "2026-10-01T08:00:00.000Z" },
  );
  const latest = prepareTeacherOwnedMonthlyEvaluationExportDocument(
    source,
    { kind: "latest" },
    "word",
    { exportedAt: "2026-10-01T08:01:00.000Z" },
  );

  assert.equal(historical.evaluation.id, first.id);
  assert.equal(historical.manifest.monthlyEvaluationId, first.id);
  assert.match(historical.evaluation.program.narrative, /^İlk kayıt:/u);
  assert.equal(latest.evaluation.id, second.id);
  assert.match(latest.evaluation.program.narrative, /^İkinci kayıt:/u);
  assert.equal(historical.manifest.programComponentEvidenceStatus, "verified-no-components");
  assert.deepEqual(historical.manifest.persistedProgramComponents, []);
  assert.deepEqual(historical.mappedOfficialRowIds, []);

  assert.throws(
    () => prepareTeacherOwnedMonthlyEvaluationExportDocument(
      source,
      { kind: "exact", evaluationId: "geçersiz" },
      "word",
    ),
    /geçerli bir aylık değerlendirme kimliği/u,
  );
  assert.throws(
    () => prepareTeacherOwnedMonthlyEvaluationExportDocument(
      source,
      { kind: "exact", evaluationId: "00000000-0000-4000-8000-00000000c999" },
      "word",
    ),
    /tam kimliğiyle seçtiği geçmiş/u,
  );
});

test("PDF ve DOCX mevcut Ek 18 renderer'larını, boş resmî matrisi ve doğru kanıt sayılarını taşır", async () => {
  const { store, monthly } = await createMonthlyFixture();
  const evaluation = await recordEvaluation(
    store,
    monthly.id,
    new Date("2026-09-30T15:00:00.000Z"),
    "Tek kayıt",
  );
  const selection = { kind: "exact", evaluationId: evaluation.id };
  const word = await generateTeacherOwnedMonthlyEvaluationExportFile(
    store,
    monthly.id,
    selection,
    "word",
    { exportedAt: "2026-10-01T08:00:00.000Z" },
  );
  const pdf = await generateTeacherOwnedMonthlyEvaluationExportFile(
    store,
    monthly.id,
    selection,
    "pdf",
    {
      exportedAt: "2026-10-01T08:00:00.000Z",
      pdfRuntime: { fontBytes: pdfFontBytes },
    },
  );

  assert.equal(new TextDecoder().decode(word.bytes.slice(0, 2)), "PK");
  assert.equal(word.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.match(word.fileName, /MaarifOS_Ek18_Aylik_Plan_Kontrol_2026-09_/u);
  const visibleXml = readStoredZipEntry(word.bytes, "word/document.xml");
  const manifestXml = readStoredZipEntry(word.bytes, "customXml/item1.xml");
  assert.match(visibleXml, /EK 18 : AYLIK PLAN KONTROL ÇİZELGESİ/u);
  assert.match(visibleXml, /resmî kaynağı doğrulanmış program bileşeni bulunmadığı/u);
  assert.equal((visibleXml.match(/<w:t xml:space="preserve">X<\/w:t>/gu) ?? []).length, 0);
  assert.match(manifestXml, /verified-no-components/u);
  assert.match(manifestXml, new RegExp(evaluation.id, "u"));
  assert.match(manifestXml, /<maarifos:sourcePlanRevisionNumber>1<\/maarifos:sourcePlanRevisionNumber>/u);
  assert.match(manifestXml, /<maarifos:evidenceMutationPolicy>fail-closed-after-evaluation<\/maarifos:evidenceMutationPolicy>/u);
  assert.equal(word.document.manifest.sourcePlanRevisionNumber, 1);
  assert.equal(
    word.document.manifest.evidenceMutationPolicy,
    "fail-closed-after-evaluation",
  );
  assert.equal(word.document.evaluation.children.coverage.observationCount, 2);
  assert.equal(word.document.evaluation.children.coverage.anecdotalObservationCount, 1);
  assert.equal(word.document.evaluation.children.coverage.distinctEnvironmentCount, 2);
  assert.equal(word.document.evaluation.children.coverage.curriculumLinkCount, 2);

  const decoded = Buffer.from(pdf.bytes).toString("latin1");
  assert.equal(decoded.startsWith("%PDF-1.7"), true);
  assert.equal(pdf.mimeType, "application/pdf");
  assert.ok(semanticTaggedPdfPageCount(pdf.bytes) >= 7);
  assert.match(decoded, /\/Lang \(tr-TR\)/u);
  assert.match(decoded, /\/StructTreeRoot\b/u);
  assert.match(decoded, /\/S \/Table\b/u);
  assert.match(decoded, /\/FontFile2\b/u);
  assert.match(decoded, /source-plan-revision-number/u);
  assert.match(decoded, /evidence-last-modified-at/u);
  assert.match(decoded, /evidence-mutation-policy/u);
  assert.match(decoded, /fail-closed-after-evaluation/u);
  assert.doesNotMatch(decoded, /\/Subtype \/Image\b/u);
  assert.equal(pdf.document.manifest.programComponentEvidenceStatus, "verified-no-components");
  assert.deepEqual(pdf.document.mappedOfficialRowIds, []);
});

test("değerlendirme yoksa son kayıt seçimi fail-closed kalır", async () => {
  const { store, monthly } = await createMonthlyFixture();
  await assert.rejects(
    () => generateTeacherOwnedMonthlyEvaluationExportFile(
      store,
      monthly.id,
      { kind: "latest" },
      "word",
    ),
    /yalnız kaydedilmiş son/u,
  );
});

test("eksik gözlem veya öğretmen onaylı program bağı dışa aktarımı kapatır", async () => {
  {
    const { store, monthly } = await createMonthlyFixture();
    const evaluation = await recordEvaluation(
      store,
      monthly.id,
      new Date("2026-09-30T15:00:00.000Z"),
      "Eksik gözlem",
    );
    const persistedMonthly = store.snapshot.plans.find((plan) => plan.id === monthly.id);
    const persistedEvaluation = persistedMonthly.monthlyEvaluations.find(
      (candidate) => candidate.id === evaluation.id,
    );
    persistedEvaluation.children.observationIds[0] =
      "00000000-0000-4000-8000-00000000c991";
    await assert.rejects(
      () => generateTeacherOwnedMonthlyEvaluationExportFile(
        store,
        monthly.id,
        { kind: "exact", evaluationId: evaluation.id },
        "word",
      ),
      /değişmez gözlem zincirinde bulunmayan/u,
    );
  }
  {
    const { store, monthly } = await createMonthlyFixture();
    const evaluation = await recordEvaluation(
      store,
      monthly.id,
      new Date("2026-09-30T15:00:00.000Z"),
      "Eksik bağ",
    );
    const missingLinkId = evaluation.children.curriculumLinkIds[0];
    store.snapshot.evidenceCurriculumLinks = store.snapshot.evidenceCurriculumLinks.filter(
      (link) => link.id !== missingLinkId,
    );
    await assert.rejects(
      () => generateTeacherOwnedMonthlyEvaluationExportFile(
        store,
        monthly.id,
        { kind: "exact", evaluationId: evaluation.id },
        "pdf",
        { pdfRuntime: { fontBytes: pdfFontBytes } },
      ),
      /program bağı zincirinde bulunmayan/u,
    );
  }
});

test("kapsam veya plan kimliği tamperi exact kanıt doğrulamasından geçmez", async () => {
  {
    const { store, monthly } = await createMonthlyFixture();
    const evaluation = await recordEvaluation(
      store,
      monthly.id,
      new Date("2026-09-30T15:00:00.000Z"),
      "Kapsam tamperi",
    );
    const persistedMonthly = store.snapshot.plans.find((plan) => plan.id === monthly.id);
    const persistedEvaluation = persistedMonthly.monthlyEvaluations.find(
      (candidate) => candidate.id === evaluation.id,
    );
    persistedEvaluation.children.coverage.observationCount = 99;
    await assert.rejects(
      () => generateTeacherOwnedMonthlyEvaluationExportFile(
        store,
        monthly.id,
        { kind: "exact", evaluationId: evaluation.id },
        "word",
      ),
      /kanıt kapsamı değişmez gözlem/u,
    );
  }
  {
    const { store, monthly } = await createMonthlyFixture();
    const evaluation = await recordEvaluation(
      store,
      monthly.id,
      new Date("2026-09-30T15:00:00.000Z"),
      "Plan tamperi",
    );
    const persistedMonthly = store.snapshot.plans.find((plan) => plan.id === monthly.id);
    const persistedEvaluation = persistedMonthly.monthlyEvaluations.find(
      (candidate) => candidate.id === evaluation.id,
    );
    persistedEvaluation.monthlyPlanId = "00000000-0000-4000-8000-00000000c992";
    await assert.rejects(
      () => generateTeacherOwnedMonthlyEvaluationExportFile(
        store,
        monthly.id,
        { kind: "exact", evaluationId: evaluation.id },
        "word",
      ),
      /kalıcı öğretmen aylık planıyla uyuşmuyor/u,
    );
  }
});

test("exact geçmiş plan revizyonu korunur; değerlendirme sonrası kanıt değişimi fail-closed kapanır", async () => {
  {
    const { store, monthly } = await createMonthlyFixture();
    const evaluation = await recordEvaluation(
      store,
      monthly.id,
      new Date("2026-09-30T15:00:00.000Z"),
      "Revizyon bağı",
    );
    const persistedMonthly = store.snapshot.plans.find((plan) => plan.id === monthly.id);
    persistedMonthly.revisionHistory.push({
      revisionNumber: persistedMonthly.revisionNumber,
      title: persistedMonthly.title,
      teacherContent: structuredClone(persistedMonthly.teacherContent),
      periodStart: persistedMonthly.periodStart,
      periodEnd: persistedMonthly.periodEnd,
      updatedAt: persistedMonthly.updatedAt,
      capturedAt: "2026-10-01T06:00:00.000Z",
    });
    persistedMonthly.revisionNumber += 1;
    persistedMonthly.title = "Eylül öğretmen planı — değiştirilmiş";
    persistedMonthly.updatedAt = "2026-10-01T06:00:00.000Z";

    const historical = await generateTeacherOwnedMonthlyEvaluationExportFile(
      store,
      monthly.id,
      { kind: "exact", evaluationId: evaluation.id },
      "word",
    );
    assert.equal(historical.document.monthlyPlan.title, "Eylül öğretmen planı");
    assert.equal(historical.document.manifest.sourcePlanRevisionNumber, 1);
    assert.notEqual(historical.document.monthlyPlan.title, persistedMonthly.title);
  }

  {
    const { store, monthly } = await createMonthlyFixture();
    const evaluation = await recordEvaluation(
      store,
      monthly.id,
      new Date("2026-09-30T15:00:00.000Z"),
      "Kanıt zaman bağı",
    );
    store.snapshot.activities[0].environment = "Değerlendirmeden sonra değiştirildi";
    store.snapshot.activities[0].updatedAt = "2026-10-01T06:00:00.000Z";

    await assert.rejects(
      () => generateTeacherOwnedMonthlyEvaluationExportFile(
        store,
        monthly.id,
        { kind: "exact", evaluationId: evaluation.id },
        "word",
      ),
      /plan veya kanıt kaydı değerlendirmeden sonra değişti/u,
    );
  }
});

test("yıllık plan bacağı ve bulunmayan tarihsel revizyon tamperi Ek 18'i kapatır", async () => {
  {
    const { store, monthly } = await createMonthlyFixture();
    const evaluation = await recordEvaluation(
      store,
      monthly.id,
      new Date("2026-09-30T15:00:00.000Z"),
      "Yıllık bağ",
    );
    const persistedMonthly = store.snapshot.plans.find((plan) => plan.id === monthly.id);
    const annual = store.snapshot.plans.find(
      (plan) => plan.id === persistedMonthly.annualPlanId,
    );
    annual.monthlySectionIds = ["00000000-0000-4000-8000-00000000c998"];

    await assert.rejects(
      () => generateTeacherOwnedMonthlyEvaluationExportFile(
        store,
        monthly.id,
        { kind: "exact", evaluationId: evaluation.id },
        "word",
      ),
      /yıllık plan zinciri değişti/u,
    );
  }

  {
    const { store, monthly } = await createMonthlyFixture();
    const evaluation = await recordEvaluation(
      store,
      monthly.id,
      new Date("2026-09-30T15:00:00.000Z"),
      "Revizyon tamperi",
    );
    const persistedMonthly = store.snapshot.plans.find((plan) => plan.id === monthly.id);
    const persistedEvaluation = persistedMonthly.monthlyEvaluations.find(
      (candidate) => candidate.id === evaluation.id,
    );
    persistedEvaluation.sourcePlanRevisionNumber = 99;

    await assert.rejects(
      () => generateTeacherOwnedMonthlyEvaluationExportFile(
        store,
        monthly.id,
        { kind: "exact", evaluationId: evaluation.id },
        "word",
      ),
      /exact plan revizyonu bulunamadı/u,
    );
  }
});
