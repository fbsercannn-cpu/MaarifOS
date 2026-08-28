import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { OBSERVATION_TAXONOMY_VERSION_V2 } from "../../src/core/domain/observation-taxonomy.ts";
import {
  curriculumTargetsForProfile,
} from "../../src/features/curriculum/curriculum-catalog.ts";
import { TYMM_2024_CATALOG_METADATA } from "../../src/features/curriculum/tymm-2024-catalog.ts";
import {
  CURRICULUM_PROGRAM_LABELS,
  confirmObservationCurriculumLink,
  createCitedAssessmentDraft,
  createPlanWithActivity,
} from "../../src/features/evidence/evidence-flow.ts";
import {
  finalizeQuickObservationDraft,
  persistQuickObservationDraft,
} from "../../src/features/evidence/quick-observation.ts";
import {
  approveAnecdoteForm,
  assertAnecdoteFormReadyForExport,
  deriveAnecdoteObservedLocation,
  loadAnecdoteFormWorkspace,
  saveAnecdoteFormDraft,
} from "../../src/features/anecdote/anecdote-form.ts";
import {
  createAnecdoteDocx,
  generateAnecdoteExportFile,
} from "../../src/features/anecdote/export-document.ts";

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
        for (const record of records) {
          byId.set(record.id, structuredClone(record));
        }
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

const yearId = "00000000-0000-4000-8000-000000007101";
const classroomId = "00000000-0000-4000-8000-000000007102";
const studentId = "00000000-0000-4000-8000-000000007103";
const planId = "00000000-0000-4000-8000-000000007104";
const activityId = "00000000-0000-4000-8000-000000007105";
const observationId = "00000000-0000-4000-8000-000000007106";
const assessmentDraftId = "00000000-0000-4000-8000-000000007107";
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const pdfFontBytes = new Uint8Array(readFileSync(path.resolve(
  testDirectory,
  "../../public/assets/fonts/MaarifOSSans-Regular.ttf",
)));
const hasPdfToText = !spawnSync("pdftotext", ["-v"], { encoding: "utf8" }).error;
const rawObservation =
  "  Deniz, iki farklı kaptaki su seviyesini yan yana getirdi ve ‘İnce olan daha yukarı çıktı.’ dedi.  ";
const assessmentText =
  "Deniz, kap biçimi ile sıvı seviyesinin görünümü arasındaki ilişkiyi karşılaştırmalı gözlemle açıklamaya yönelmiştir.";
const observedLocation = "Fen ve doğa merkezi";
const exportedAt = "2026-09-08T12:30:00.000Z";

const profile = {
  framework: "tymm",
  programLabel: CURRICULUM_PROGRAM_LABELS.tymm,
  catalogId: TYMM_2024_CATALOG_METADATA.catalogId,
  sourceVersion: TYMM_2024_CATALOG_METADATA.sourceVersion,
  referenceOrigin: "official-catalog",
  officialCatalogVerified: true,
};
const target = curriculumTargetsForProfile(profile, "60-72").find(
  (candidate) => candidate.referenceCode === "FAB.1",
);
assert.ok(target);

function activeStore() {
  const snapshot = createEmptySnapshot();
  const base = {
    createdAt: "2026-09-01T06:00:00.000Z",
    updatedAt: "2026-09-01T06:00:00.000Z",
    civilDate: "2026-09-01",
    deletedAt: null,
    schemaVersion: 1,
  };
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId: yearId,
    name: "Anekdot Test Sınıfı",
    ageGroup: "60-72 ay",
    curriculumProfileSnapshot: profile,
    schemaVersion: 2,
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
    displayName: "Deniz Yılmaz",
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

async function captureAnecdote(store) {
  await createPlanWithActivity(store, {
    civilDate: "2026-09-08",
    planId,
    planTitle: "Sıvıların görünümü günlük planı",
    activityId,
    activityTitle: "Kaplarda su karşılaştırması",
    startTime: "09:30",
    endTime: "10:00",
    curriculumProfile: profile,
    curriculumTargets: [target],
    assignmentMode: "selected-students",
    studentIds: [studentId],
    now: new Date("2026-09-08T06:00:00.000Z"),
  });
  await persistQuickObservationDraft(store, {
    studentId,
    planId,
    activityId,
    rawText: rawObservation,
    observationType: "anecdotal",
    categoryIds: ["cognitive-learning"],
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
    now: new Date("2026-09-08T07:00:00.000Z"),
  });
  return finalizeQuickObservationDraft(store, {
    observationId,
    studentId,
    planId,
    activityId,
    taxonomyVersion: OBSERVATION_TAXONOMY_VERSION_V2,
    observedAt: "2026-09-08T07:01:00.000Z",
    now: new Date("2026-09-08T07:02:00.000Z"),
  });
}

async function addApprovedSkill(store) {
  return confirmObservationCurriculumLink(store, {
    observationId,
    framework: profile.framework,
    catalogId: profile.catalogId,
    sourceVersion: profile.sourceVersion,
    referenceCode: target.referenceCode,
    referenceTitle: target.referenceTitle,
    referenceOrigin: profile.referenceOrigin,
    officialCatalogVerified: profile.officialCatalogVerified,
    plannedTargetId: target.id,
    now: new Date("2026-09-08T08:00:00.000Z"),
  });
}

async function addAssessment(store) {
  return createCitedAssessmentDraft(store, {
    draftId: assessmentDraftId,
    studentId,
    observationIds: [observationId],
    teacherAssessmentText: assessmentText,
    assessmentTargetIds: [target.id],
    periodStart: "2026-09-08",
    periodEnd: "2026-09-08",
    now: new Date("2026-09-08T09:00:00.000Z"),
  });
}

async function readyFixture() {
  const store = activeStore();
  await captureAnecdote(store);
  const link = await addApprovedSkill(store);
  await addAssessment(store);
  await saveAnecdoteFormDraft(store, {
    observationId,
    observedLocation,
    observerGeneralAssessment: assessmentText,
    now: new Date("2026-09-08T10:00:00.000Z"),
  });
  const approved = await approveAnecdoteForm(store, {
    observationId,
    now: new Date("2026-09-08T10:01:00.000Z"),
  });
  const workspace = await loadAnecdoteFormWorkspace(store);
  assert.equal(workspace.forms.length, 1);
  assert.equal(workspace.forms[0].workflowStatus, "ready");
  return { store, link, approved, form: workspace.forms[0] };
}

function unzipStoredEntries(bytes) {
  const entries = new Map();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const compression = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    assert.equal(compression, 0, "test parser expects stored ZIP entries");
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
    entries.set(name, bytes.slice(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }
  return entries;
}

function mockPdfRuntime() {
  return { fontBytes: pdfFontBytes };
}

function extractPdfText(bytes) {
  if (!hasPdfToText) return "";
  const directory = mkdtempSync(path.join(tmpdir(), "maarifos-anecdote-pdf-"));
  try {
    const pdfPath = path.join(directory, "anecdote.pdf");
    const textPath = path.join(directory, "anecdote.txt");
    writeFileSync(pdfPath, bytes);
    execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, textPath]);
    return readFileSync(textPath, "utf8").replaceAll("\r", "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("anekdot read-modeli ham gözlemden çocuk/tarih/durumu alır, eksikleri uydurmaz ve dışa aktarımı kapatır", async () => {
  const store = activeStore();
  await captureAnecdote(store);
  const before = await store.readSnapshot();
  const workspace = await loadAnecdoteFormWorkspace(store);
  const form = workspace.forms[0];

  assert.equal(form.childFullName, "Deniz Yılmaz");
  assert.equal(form.civilDate, "2026-09-08");
  assert.equal(form.observedSituation, rawObservation);
  assert.equal(form.observedLocation, "");
  assert.equal(form.observedSkills.length, 0);
  assert.equal(form.observerGeneralAssessment, "");
  assert.equal(form.workflowStatus, "incomplete");
  assert.deepEqual(form.missingFields, [
    "observed-location",
    "observed-skills",
    "observer-general-assessment",
    "teacher-review",
  ]);
  assert.throws(
    () => assertAnecdoteFormReadyForExport(form),
    /eksik alan|onayı/i,
  );
  await assert.rejects(
    generateAnecdoteExportFile(form, "word"),
    /eksik alan|onayı/i,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("mekân yalnız açık plan/etkinlik çevre bilgisinden türetilir", () => {
  assert.deepEqual(
    deriveAnecdoteObservedLocation(
      {
        appliedActivityTemplateSnapshot: { environment: "outdoor" },
      },
      {},
    ),
    { text: "Açık hava / okul bahçesi", source: "activity" },
  );
  assert.equal(
    deriveAnecdoteObservedLocation(
      { title: "Bahçe keşfi" },
      { title: "Dışarıda bilim günü" },
    ),
    null,
    "başlıktan mekân tahmini yapılmamalı",
  );
});

test("form tamamlaması aynı observationId ve değişmez ham metni korur; değerlendirmeyi ayrı öğretmen kaydı olarak saklar", async () => {
  const store = activeStore();
  await captureAnecdote(store);
  await addApprovedSkill(store);
  const assessment = await addAssessment(store);
  const prefilling = (await loadAnecdoteFormWorkspace(store)).forms[0];

  assert.equal(prefilling.observerGeneralAssessment, assessmentText);
  assert.equal(prefilling.generalEvaluationSourceDraftId, assessment.draft.id);
  const saved = await saveAnecdoteFormDraft(store, {
    observationId,
    observedLocation,
    observerGeneralAssessment: assessmentText,
    now: new Date("2026-09-08T10:00:00.000Z"),
  });
  const snapshot = await store.readSnapshot();
  const observation = snapshot.observations.find((record) => record.id === observationId);
  const sourceAssessment = snapshot.reportDrafts.find(
    (record) => record.id === assessmentDraftId,
  );

  assert.equal(observation.rawText, rawObservation);
  assert.equal(observation.rawTextImmutable, true);
  assert.deepEqual(saved.selectedObservationIds, [observationId]);
  assert.notEqual(saved.id, observationId);
  assert.equal(saved.editableSections.observerGeneralAssessment, assessmentText);
  assert.equal(saved.editableSections.generalEvaluationSourceDraftId, assessmentDraftId);
  assert.equal(sourceAssessment.teacherAssessmentText, assessmentText);
  assert.equal(sourceAssessment.reviewStatus, "pending");
  assert.equal(saved.reviewStatus, "pending");
  assert.equal(snapshot.portfolioSelections.length, 0);

  const reloaded = new MemoryStore(snapshot);
  const reloadedForm = (await loadAnecdoteFormWorkspace(reloaded)).forms[0];
  assert.equal(reloadedForm.observedSituation, rawObservation);
  assert.equal(reloadedForm.observerGeneralAssessment, assessmentText);
  assert.equal(reloadedForm.reviewStatus, "pending");
});

test("öğretmen onayı zorunlu alanları fail-closed denetler ve her düzenlemede yeniden istenir", async () => {
  const store = activeStore();
  await captureAnecdote(store);
  await saveAnecdoteFormDraft(store, {
    observationId,
    observedLocation,
    observerGeneralAssessment: assessmentText,
    now: new Date("2026-09-08T10:00:00.000Z"),
  });
  await assert.rejects(
    approveAnecdoteForm(store, {
      observationId,
      now: new Date("2026-09-08T10:01:00.000Z"),
    }),
    /observed-skills/,
  );
  await addApprovedSkill(store);
  await approveAnecdoteForm(store, {
    observationId,
    now: new Date("2026-09-08T10:02:00.000Z"),
  });
  assert.equal((await loadAnecdoteFormWorkspace(store)).forms[0].workflowStatus, "ready");

  await saveAnecdoteFormDraft(store, {
    observationId,
    observedLocation: "Okul bahçesi",
    observerGeneralAssessment: assessmentText,
    now: new Date("2026-09-08T10:03:00.000Z"),
  });
  const edited = (await loadAnecdoteFormWorkspace(store)).forms[0];
  assert.equal(edited.workflowStatus, "review-required");
  assert.equal(edited.reviewStatus, "pending");
  assert.ok(edited.missingFields.includes("teacher-review"));
  assert.throws(() => createAnecdoteDocx(edited), /eksik alan|onayı/i);
});

test("onaydan sonra program bağlantısı değişirse beceri snapshotı geçersizleşir ve belge yeniden kapanır", async () => {
  const { store, link } = await readyFixture();
  await store.transaction(
    "readwrite",
    ["evidenceCurriculumLinks"],
    async (transaction) => {
      const links = await transaction.getAll("evidenceCurriculumLinks");
      await transaction.putMany("evidenceCurriculumLinks", [
        {
          ...links.find((record) => record.id === link.id),
          updatedAt: "2026-09-08T10:02:00.000Z",
          deletedAt: "2026-09-08T10:02:00.000Z",
        },
      ]);
    },
  );
  const changed = (await loadAnecdoteFormWorkspace(store)).forms[0];
  assert.equal(changed.workflowStatus, "incomplete");
  assert.equal(changed.observedSkills.length, 0);
  assert.ok(changed.missingFields.includes("observed-skills"));
  assert.ok(changed.missingFields.includes("teacher-review"));
  await assert.rejects(
    generateAnecdoteExportFile(changed, "pdf", {
      pdfRuntime: mockPdfRuntime([]),
    }),
    /eksik alan|onayı/i,
  );
});

test("öğretmen onayı observation ve program bağlantısı içeriğini exact seal olarak saklar", async () => {
  const { approved, link } = await readyFixture();
  assert.equal(approved.schemaVersion, 2);
  assert.deepEqual(approved.approvalSeal, {
    schemaVersion: 1,
    observation: {
      observationId,
      rawText: rawObservation,
      observedAt: "2026-09-08T07:01:00.000Z",
      civilDate: "2026-09-08",
      studentId,
      activityId,
      planId,
    },
    curriculumLinks: [
      {
        id: link.id,
        referenceCode: link.referenceCode,
        referenceTitle: link.referenceTitle,
        framework: link.framework,
        catalogId: link.catalogId,
        sourceVersion: link.sourceVersion,
        confirmedAt: link.confirmedAt,
        approvedByUserId: link.approvedByUserId,
        referenceOrigin: link.referenceOrigin,
        officialCatalogVerified: link.officialCatalogVerified,
      },
    ],
  });
});

test("aynı kimlik altında observation veya link içeriği değişirse exact seal ready durumunu fail-closed kapatır", async (t) => {
  const cases = [
    {
      name: "rawText",
      collection: "observations",
      mutate(record) {
        record.rawText = `${record.rawText} TAMPER`;
      },
    },
    {
      name: "referenceTitle",
      collection: "evidenceCurriculumLinks",
      mutate(record) {
        record.referenceTitle = `${record.referenceTitle} TAMPER`;
      },
    },
    {
      name: "referenceCode",
      collection: "evidenceCurriculumLinks",
      mutate(record) {
        record.referenceCode = "FAB.9";
      },
    },
    {
      name: "confirmedAt",
      collection: "evidenceCurriculumLinks",
      mutate(record) {
        record.confirmedAt = "2026-09-08T08:00:01.000Z";
      },
    },
    {
      name: "approvedByUserId",
      collection: "evidenceCurriculumLinks",
      mutate(record) {
        record.approvedByUserId = "00000000-0000-4000-8000-000000007199";
      },
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const { store } = await readyFixture();
      await store.transaction(
        "readwrite",
        [item.collection],
        async (transaction) => {
          const records = await transaction.getAll(item.collection);
          const source = records[0];
          item.mutate(source);
          await transaction.putMany(item.collection, [source]);
        },
      );
      const changed = (await loadAnecdoteFormWorkspace(store)).forms[0];
      assert.equal(changed.workflowStatus, "review-required");
      assert.ok(changed.missingFields.includes("teacher-review"));
      assert.throws(
        () => assertAnecdoteFormReadyForExport(changed),
        /eksik alan|onayı/iu,
      );
    });
  }
});

test("seal taşımayan legacy onay otomatik ready olmaz ve güncel içerik için yeniden öğretmen onayı ister", async () => {
  const { store } = await readyFixture();
  await store.transaction(
    "readwrite",
    ["reportDrafts"],
    async (transaction) => {
      const drafts = await transaction.getAll("reportDrafts");
      const draft = drafts.find(
        (record) => record.reportType === "meb-2024-anecdote-form",
      );
      delete draft.approvalSeal;
      draft.schemaVersion = 1;
      await transaction.putMany("reportDrafts", [draft]);
    },
  );

  const legacy = (await loadAnecdoteFormWorkspace(store)).forms[0];
  assert.equal(legacy.reviewStatus, "approved");
  assert.equal(legacy.workflowStatus, "review-required");
  assert.ok(legacy.missingFields.includes("teacher-review"));

  const reapproved = await approveAnecdoteForm(store, {
    observationId,
    now: new Date("2026-09-08T10:05:00.000Z"),
  });
  assert.equal(reapproved.schemaVersion, 2);
  assert.ok(reapproved.approvalSeal);
  assert.equal(
    (await loadAnecdoteFormWorkspace(store)).forms[0].workflowStatus,
    "ready",
  );
});

test("DOCX resmî alan sırasını, A4 geometriyi ve görünmez izlenebilirlik metadata'sını taşır", async () => {
  const { form } = await readyFixture();
  const bytes = createAnecdoteDocx(form, { exportedAt });
  const entries = unzipStoredEntries(bytes);
  const decode = (name) => new TextDecoder().decode(entries.get(name));
  const documentXml = decode("word/document.xml");
  const customXml = decode("docProps/custom.xml");

  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.ok(entries.has("[Content_Types].xml"));
  assert.ok(entries.has("word/styles.xml"));
  assert.match(documentXml, /w:pgSz w:w="11906" w:h="16838"/);
  assert.match(documentXml, /w:gridCol w:w="2200"/);
  assert.match(documentXml, /w:gridCol w:w="7960"/);
  assert.doesNotMatch(documentXml, /w:hRule="exact"/);
  const labels = [
    "Çocuğun Adı Soyadı",
    "Tarih",
    "Gözlenen Mekân",
    "Gözlenen Durum",
    "Gözlenen Beceriler",
    "Gözlemcinin Genel Değerlendirmesi",
  ];
  let cursor = -1;
  for (const label of labels) {
    const next = documentXml.indexOf(label);
    assert.ok(next > cursor, `${label} resmî sırada olmalı`);
    cursor = next;
  }
  assert.match(documentXml, /Bu formu doldurmanıza neden olan durumu açıklamanız beklenmektedir/);
  assert.match(documentXml, /Deniz Yılmaz/);
  assert.match(documentXml, /FAB\.1/);
  assert.match(documentXml, /kap biçimi ile sıvı seviyesinin görünümü/);
  assert.match(customXml, new RegExp(observationId));
  assert.match(customXml, new RegExp(profile.sourceVersion.replaceAll(".", "\\.")));
  assert.match(customXml, new RegExp(exportedAt.replaceAll(".", "\\.")));
});

test("PDF ham çocuk sözünü öğretmen yorumundan ayırır; etiket ve kişisel verisiz metadata taşır", async () => {
  const { form } = await readyFixture();
  const file = await generateAnecdoteExportFile(form, "pdf", {
    exportedAt,
    pdfRuntime: mockPdfRuntime(),
  });
  const decoded = Buffer.from(file.bytes).toString("latin1");
  const xmp = new TextDecoder().decode(file.bytes)
    .match(/<x:xmpmeta[\s\S]+?<\/x:xmpmeta>/u)?.[0] ?? "";

  assert.equal(decoded.startsWith("%PDF-1.7"), true);
  assert.match(decoded, /\/Lang \(tr-TR\)/u);
  assert.match(decoded, /\/StructTreeRoot\b/u);
  assert.match(decoded, /\/FontFile2\b/u);
  assert.match(decoded, /\/ToUnicode\b/u);
  assert.match(decoded, /\/S \/H1\b/u);
  assert.match(decoded, /\/S \/H2\b/u);
  assert.match(decoded, /\/S \/Table\b/u);
  assert.match(decoded, /\/Scope \/Row\b/u);
  assert.match(decoded, /\/S \/L\b/u);
  assert.doesNotMatch(decoded, /\/Subtype \/Image\b/u);
  assert.doesNotMatch(xmp, /Deniz Yılmaz|İnce olan daha yukarı çıktı|kap biçimi ile sıvı seviyesinin görünümü/u);
  assert.doesNotMatch(xmp, new RegExp(observationId));
  assert.doesNotMatch(xmp, /observation-id|source-versions|exported-at|2026-09-08T12:30:00\.000Z/u);
  if (!hasPdfToText) return;
  const extracted = extractPdfText(file.bytes);
  const labels = [
    "Çocuğun Adı Soyadı",
    "Tarih",
    "Gözlenen Mekân",
    "Gözlenen Durum — ham gözlem ve çocuğun sözü",
    "Gözlenen Beceriler",
    "Gözlemcinin Genel Değerlendirmesi — öğretmen yorumu",
  ];
  let cursor = -1;
  for (const label of labels) {
    const next = extracted.indexOf(label);
    assert.ok(next > cursor, `${label} PDF okuma sırasında olmalı`);
    cursor = next;
  }
  assert.match(extracted, /İnce olan daha yukarı çıktı/u);
  assert.match(extracted, /kap biçimi ile sıvı seviyesinin görünümü/u);
  assert.ok(
    extracted.indexOf("İnce olan daha yukarı çıktı")
      < extracted.indexOf("kap biçimi ile sıvı seviyesinin görünümü"),
    "ham çocuk sözü öğretmen yorumundan önce ve ayrı bölümde okunmalı",
  );
});

test("onaylı anekdot yerel snapshot/JSON turunda kayıpsız yeniden yüklenir", async () => {
  const { store } = await readyFixture();
  const serialized = JSON.stringify(await store.readSnapshot());
  const restoredStore = new MemoryStore(JSON.parse(serialized));
  const restored = (await loadAnecdoteFormWorkspace(restoredStore)).forms[0];

  assert.equal(restored.workflowStatus, "ready");
  assert.equal(restored.observedSituation, rawObservation);
  assert.equal(restored.observerGeneralAssessment, assessmentText);
  assert.equal((await restoredStore.readSnapshot()).portfolioSelections.length, 0);
});
