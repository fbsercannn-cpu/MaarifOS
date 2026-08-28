import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createEmptySnapshot } from "../src/core/domain/model.ts";
import {
  ANECDOTE_FORM_OFFICIAL_SOURCE,
  ANECDOTE_FORM_OFFICIAL_SOURCE_URL,
  ANECDOTE_FORM_OFFICIAL_SOURCE_VERSION,
  ANECDOTE_FORM_OFFICIAL_TITLE,
} from "../src/features/anecdote/anecdote-form.ts";
import { createAnecdotePdf } from "../src/features/anecdote/export-document.ts";
import { createClassRosterPdfDocument } from "../src/features/classroom/class-roster-document.ts";
import { semanticTaggedPdfPageCount } from "../src/features/documents/semantic-tagged-pdf.ts";
import {
  createMonthlyEvaluationPdf,
} from "../src/features/premium-plans/monthly-evaluation-export.ts";
import {
  PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE,
  PREMIUM_MONTHLY_PROGRAM_CRITERIA,
  PREMIUM_MONTHLY_TEACHER_CRITERIA,
} from "../src/features/premium-plans/plan-service.ts";

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(appDirectory, "output/pdf/mr055-remaining");
const fontBytes = new Uint8Array(await readFile(path.join(
  appDirectory,
  "public/assets/fonts/MaarifOSSans-Regular.ttf",
)));

function record(id, fields) {
  return {
    id,
    createdAt: "2026-08-28T08:00:00.000Z",
    updatedAt: "2026-08-28T08:00:00.000Z",
    civilDate: "2026-08-28",
    schemaVersion: 1,
    ...fields,
  };
}

const yearId = "00000000-0000-4000-8000-000000055001";
const classroomId = "00000000-0000-4000-8000-000000055002";
const snapshot = createEmptySnapshot();
snapshot.academicYears.push(record(yearId, {
  name: "2026-2027 Eğitim Öğretim Yılı",
  status: "active",
}));
snapshot.classrooms.push(record(classroomId, {
  academicYearId: yearId,
  name: "Çiçekler 60-72 Ay Tam Gün Uygulama Sınıfı",
}));
for (let index = 0; index < 40; index += 1) {
  const suffix = String(index + 1).padStart(2, "0");
  snapshot.students.push(record(
    `00000000-0000-4000-8100-${String(index).padStart(12, "0")}`,
    {
      academicYearId: yearId,
      classroomId,
      active: true,
      enrollmentStatus: "active",
      displayName: `Nurbanu Nazlıcan Su Elif İrem Uzunoğulları Kahramanoğlu ${suffix}`,
      optionalCode: `Ö-${String(1000 + index)}`,
      nationalIdentityNumber: `1000000${String(1000 + index)}`,
      contacts: index % 9 === 0
        ? []
        : [{
            id: `00000000-0000-4000-8200-${String(index).padStart(12, "0")}`,
            relationship: "Anne ve okul çıkışında yetkili teslim kişisi",
            name: `Dr. Öğr. Üyesi Şehnaz Ayşegül Uzunoğulları ${suffix}`,
            phone: "+90 (532) 111 22 33 / iş telefonu: 0258 444 55 66",
            isPrimary: true,
          }],
    },
  ));
}
const roster = await createClassRosterPdfDocument(
  {
    scope: { academicYearId: yearId, classroomId },
    snapshot,
    schoolName:
      "T.C. Millî Eğitim Bakanlığı Denizli Merkezefendi Şehit Öğretmenler Uygulama Anaokulu Müdürlüğü",
    teacherName: "Emine Nur Akış Özdemir",
    generatedAt: "2026-08-28T08:30:00.000Z",
  },
  { runtime: { fontBytes } },
);

const anecdote = await createAnecdotePdf(
  {
    draftId: "00000000-0000-4000-8300-000000000001",
    observationId: "00000000-0000-4000-8300-000000000002",
    studentId: "00000000-0000-4000-8300-000000000003",
    childFullName: "Deniz Örnek",
    civilDate: "2026-09-08",
    observedAt: "2026-09-08T07:01:00.000Z",
    activityId: "00000000-0000-4000-8300-000000000004",
    planId: "00000000-0000-4000-8300-000000000005",
    activityTitle: "Su nasıl yükselir?",
    observedLocation: "Fen ve keşif merkezi",
    observedLocationSource: "activity-environment",
    observedSituation:
      "Deniz iki farklı kaptaki su seviyelerini yan yana inceledi. İnce kabı işaret ederek “İnce olan daha yukarı çıktı.” dedi; ardından aynı miktarı yeniden aktararak sonucu arkadaşına gösterdi. Öğretmen bu ham kayda yorum eklemedi.",
    observedSkills: [{
      linkId: "00000000-0000-4000-8300-000000000006",
      framework: "tymm",
      catalogId: "tymm-okul-oncesi-2024",
      sourceVersion: "2024.1",
      referenceCode: "FAB.1",
      referenceTitle: "Bilimsel gözlem yapma",
      confirmedAt: "2026-09-08T07:05:00.000Z",
      approvedByUserId: "00000000-0000-4000-8300-000000000007",
      referenceOrigin: "official-catalog",
      officialCatalogVerified: true,
    }],
    observerGeneralAssessment:
      "Deniz, kap biçimi ile sıvı seviyesinin görünümü arasındaki ilişkiyi karşılaştırma diliyle ifade etti. Bir sonraki uygulamada farklı kapları kendisinin seçmesine ve tahminini aktarım öncesinde açıklamasına alan açacağım.",
    generalEvaluationSourceDraftId: "00000000-0000-4000-8300-000000000008",
    workflowStatus: "ready",
    missingFields: [],
    reviewStatus: "approved",
    reviewedByUserId: "00000000-0000-4000-8300-000000000007",
    reviewedAt: "2026-09-08T08:00:00.000Z",
    academicYearId: yearId,
    classroomId,
    programSourceVersions: ["2024.1"],
    formSource: {
      title: ANECDOTE_FORM_OFFICIAL_TITLE,
      sourceLabel: ANECDOTE_FORM_OFFICIAL_SOURCE,
      sourceVersion: ANECDOTE_FORM_OFFICIAL_SOURCE_VERSION,
      sourceUrl: ANECDOTE_FORM_OFFICIAL_SOURCE_URL,
    },
  },
  {
    exportedAt: "2026-09-08T08:15:00.000Z",
    runtime: { fontBytes },
  },
);

const longEnding = " PROGRAM_METNI_SONU";
const longSeed =
  "Program değerlendirmesinde katılım, süre, materyal, geçiş ve ölçme kararları kanıta dayalı olarak yeniden ele alındı. ";
const programNarrative = `${longSeed.repeat(30).slice(0, 2_000 - longEnding.length)}${longEnding}`;
const planId = "00000000-0000-4000-8400-000000000001";
const evaluationId = "00000000-0000-4000-8400-000000000002";
const emptyCoverage = {
  observationCount: 0,
  anecdotalObservationCount: 0,
  programLinkedObservationCount: 0,
  curriculumLinkCount: 0,
  distinctCivilDateCount: 0,
  distinctWeekCount: 0,
  distinctStudentCount: 0,
  distinctEnvironmentCount: 0,
  activeStudentCount: 40,
  coveredActiveStudentCount: 0,
  activeStudentIds: [],
  coveredActiveStudentIds: [],
  uncoveredActiveStudentIds: [],
};
const ek18Document = {
  format: "pdf",
  fileName: "MaarifOS_Ek18_Eylul_2026.pdf",
  monthLabel: "Eylül 2026",
  monthColumnIndex: 0,
  monthlyPlan: {
    id: planId,
    title: "Eylül 2026 Aylık Planı",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  },
  evaluation: {
    id: evaluationId,
    monthlyPlanId: planId,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    children: {
      evidenceState: "insufficient-evidence",
      narrative: "Bu ay için kesin beceri hükmü kurulmadı; kanıt toplama sonraki ay sürdürülecek.",
      observationIds: [],
      curriculumLinkIds: [],
      coverage: emptyCoverage,
    },
    program: {
      narrative: programNarrative,
      criteria: PREMIUM_MONTHLY_PROGRAM_CRITERIA.map((criterion, index) => ({
        criterionId: criterion.id,
        status: index === 2 ? "needs-adjustment" : "observed-working",
      })),
    },
    teacher: {
      narrative:
        "Zaman yönetimi, sessiz katılım yolları ve çocukların seçim alanlarını yeniden düzenledim.",
      criteria: PREMIUM_MONTHLY_TEACHER_CRITERIA.map((criterion, index) => ({
        criterionId: criterion.id,
        status: index === 9 ? "needs-adjustment" : "observed-working",
      })),
    },
    nextMonthRecommendation:
      "Farklı gün ve ortamlarda kanıt toplamayı, çocuk sözlerini yorumdan ayrı kaydetmeyi sürdüreceğim.",
    teacherAuthored: true,
    mebProvenance: PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE,
    createdAt: "2026-09-30T13:00:00.000Z",
  },
  selectedObservations: [],
  mappedOfficialRowIds: [
    "area-turkish-listening-viewing",
    "area-math-reasoning",
    "area-science-observation",
    "area-art-practice",
    "area-music-listen",
  ],
  manifest: {
    schemaVersion: 2,
    documentType: "meb-2024-ek18-monthly-plan-control",
    renderingMode: "semantic-accessible-reflow",
    officialSourceFormPageCount: 6,
    outputPagination: "content-dependent",
    officialSource: {
      authority: "T.C. Millî Eğitim Bakanlığı",
      program: "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı",
      version: "2024",
      evaluationPages: "136-139",
      annex: "Ek 18 - Aylık Plan Kontrol Çizelgesi",
      annexPages: "344-349",
    },
    generatedAt: "2026-09-30T13:05:00.000Z",
    monthlyPlanId: planId,
    monthlyEvaluationId: evaluationId,
    observationIds: [],
    curriculumLinkIds: [],
    mappedOfficialRowIds: [
      "area-turkish-listening-viewing",
      "area-math-reasoning",
      "area-science-observation",
      "area-art-practice",
      "area-music-listen",
    ],
    programComponentEvidenceStatus: "verified-complete-mapping",
    persistedProgramComponents: [
      { referenceCode: "FAB.1", referenceTitle: "Bilimsel gözlem yapma" },
    ],
    unmappedPlanComponents: [],
  },
};
const ek18 = await createMonthlyEvaluationPdf(ek18Document, {
  runtime: { fontBytes },
});

await mkdir(outputDirectory, { recursive: true });
const outputs = [
  ["class-roster-40-long-fields.pdf", roster.bytes],
  ["anecdote-child-voice-and-teacher-assessment.pdf", anecdote],
  ["ek18-multipage-long-assessment.pdf", ek18],
];
for (const [fileName, bytes] of outputs) {
  const outputPath = path.join(outputDirectory, fileName);
  await writeFile(outputPath, bytes, { flag: "w" });
  process.stdout.write(
    `${outputPath}\t${bytes.byteLength} bytes\t${semanticTaggedPdfPageCount(bytes)} pages\n`,
  );
}
