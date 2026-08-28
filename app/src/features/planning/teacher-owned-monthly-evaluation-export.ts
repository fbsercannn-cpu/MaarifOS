import type { StoredRecord } from "../../core/domain/model.ts";
import {
  isTeacherOwnedPlanRecord,
  type TeacherOwnedMonthlyPlan,
  type TeacherOwnedPlanRevisionSnapshot,
} from "../../core/domain/teacher-owned-plan.ts";
import type {
  TeacherMonthlyEvaluation,
  TeacherMonthlyEvidenceCoverage,
} from "../../core/domain/teacher-owned-monthly-evaluation.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  createMonthlyEvaluationDocx,
  createMonthlyEvaluationPdf,
  type MonthlyEvaluationExportDocument,
  type MonthlyEvaluationExportFile,
  type MonthlyEvaluationExportFormat,
  type MonthlyEvaluationPdfRuntime,
} from "../premium-plans/monthly-evaluation-export.ts";
import {
  PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE,
  summarizePremiumMonthlyEvidence,
  type PremiumMonthlyEvaluation,
  type PremiumMonthlyReviewObservation,
} from "../premium-plans/plan-service.ts";
import {
  loadTeacherMonthlyReviewContext,
  type TeacherMonthlyReviewContext,
  type TeacherMonthlyReviewObservation,
} from "./teacher-owned-plan-service.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MONTHS = [
  { month: 9, label: "Eylül" },
  { month: 10, label: "Ekim" },
  { month: 11, label: "Kasım" },
  { month: 12, label: "Aralık" },
  { month: 1, label: "Ocak" },
  { month: 2, label: "Şubat" },
  { month: 3, label: "Mart" },
  { month: 4, label: "Nisan" },
  { month: 5, label: "Mayıs" },
  { month: 6, label: "Haziran" },
] as const;

const OFFICIAL_SOURCE = Object.freeze({
  authority: "T.C. Millî Eğitim Bakanlığı",
  program: "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı",
  version: "2024",
  evaluationPages: "136-139",
  annex: "Ek 18 - Aylık Plan Kontrol Çizelgesi",
  annexPages: "344-349",
} as const);

export type TeacherOwnedMonthlyEvaluationExportSelection =
  | { readonly kind: "latest" }
  | { readonly kind: "exact"; readonly evaluationId: string };

interface TeacherOwnedObservationExportMetadata {
  readonly id: string;
  readonly observationType: string | null;
  readonly anecdotal: boolean;
  readonly environment: string | null;
  /**
   * Bu gözlemin resmî çıktıda kullanılan bütün kalıcı kaynakları içindeki en
   * yeni UTC güncelleme zamanı. Değerlendirme kaydından sonra değişen etkinlik,
   * plan veya program bağı sessizce yeni bir Ek 18'e dönüşemez.
   */
  readonly latestEvidenceUpdatedAt: string;
}

export interface TeacherOwnedMonthlyEvaluationExportSource {
  readonly reviewContext: TeacherMonthlyReviewContext;
  readonly observationMetadata: readonly TeacherOwnedObservationExportMetadata[];
}

export interface TeacherOwnedMonthlyEvaluationExportOptions {
  readonly exportedAt?: string;
  readonly pdfRuntime?: MonthlyEvaluationPdfRuntime;
}

const verifiedSources = new WeakSet<object>();

function fail(message: string): never {
  throw new Error(message);
}

function recordObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach((candidate) => {
    deepFreeze(candidate);
  });
  return Object.freeze(value);
}

function requiredIsoTimestamp(value: string, label: string): string {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    fail(`${label} geçerli bir UTC zaman damgası olmalıdır.`);
  }
  return value;
}

function assertUniqueRecords(
  records: readonly StoredRecord[],
  id: string,
  label: string,
): StoredRecord {
  const matches = records.filter((record) => record.id === id);
  if (matches.length !== 1) {
    fail(`${label} için tek ve değişmez bir kalıcı kayıt gereklidir.`);
  }
  return matches[0]!;
}

function activityEnvironment(record: StoredRecord): string | null {
  const applied = recordObject(record.appliedActivityTemplateSnapshot);
  const source = recordObject(record.sourceActivityTemplateSnapshot);
  for (const candidate of [applied?.environment, source?.environment, record.environment]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function latestRecordUpdate(
  records: readonly { readonly record: StoredRecord; readonly label: string }[],
): string {
  return records
    .map(({ record, label }) => requiredIsoTimestamp(record.updatedAt, label))
    .sort((left, right) => left.localeCompare(right))
    .at(-1)!;
}

function observationMetadata(
  snapshot: Awaited<ReturnType<LocalDataStore["readSnapshot"]>>,
  context: TeacherMonthlyReviewContext,
): TeacherOwnedObservationExportMetadata[] {
  const monthlyPlan = context.monthly;
  const annualPlan = assertUniqueRecords(
    snapshot.plans,
    monthlyPlan.annualPlanId,
    "Aylık değerlendirme yıllık planı",
  );
  if (
    !isTeacherOwnedPlanRecord(annualPlan) ||
    annualPlan.planType !== "annual" ||
    annualPlan.academicYearId !== monthlyPlan.academicYearId ||
    annualPlan.classroomId !== monthlyPlan.classroomId ||
    annualPlan.monthlySectionIds.filter((id) => id === monthlyPlan.id).length !== 1
  ) {
    fail("Aylık değerlendirme yıllık plan zinciri değişti.");
  }
  const belongsToMonthlyScope = (record: StoredRecord) =>
    record.academicYearId === monthlyPlan.academicYearId &&
    record.classroomId === monthlyPlan.classroomId;
  return context.observations.map((observation) => {
    const persisted = assertUniqueRecords(
      snapshot.observations,
      observation.id,
      "Aylık değerlendirme gözlemi",
    );
    if (
      persisted.rawTextImmutable !== true ||
      persisted.rawText !== observation.rawText ||
      persisted.planId !== observation.dailyPlanId ||
      persisted.civilDate !== observation.civilDate ||
      (typeof persisted.observedAt === "string"
        ? persisted.observedAt
        : persisted.createdAt) !== observation.observedAt ||
      typeof persisted.deletedAt === "string" ||
      typeof persisted.activityId !== "string" ||
      !belongsToMonthlyScope(persisted)
    ) {
      fail("Aylık değerlendirme gözlemi kalıcı plan ve ham metin zinciriyle uyuşmuyor.");
    }
    const persistedStudentIds = Array.isArray(persisted.studentIds)
      ? persisted.studentIds.filter(
          (id): id is string => typeof id === "string" && UUID_PATTERN.test(id),
        )
      : typeof persisted.studentId === "string" && UUID_PATTERN.test(persisted.studentId)
        ? [persisted.studentId]
        : [];
    if (
      canonicalJson([...new Set(persistedStudentIds)].sort()) !==
        canonicalJson(observation.studentIds)
    ) {
      fail("Aylık değerlendirme gözleminin öğrenci kanıt zinciri değişti.");
    }
    const activity = assertUniqueRecords(
      snapshot.activities,
      persisted.activityId,
      "Aylık değerlendirme etkinliği",
    );
    if (
      activity.planId !== observation.dailyPlanId ||
      activity.title !== observation.activityTitle ||
      activity.sourceAnnualPlanId !== annualPlan.id ||
      activity.sourceMonthlyPlanId !== monthlyPlan.id ||
      activity.sourceWeeklyPlanId !== observation.weeklyPlanId ||
      typeof activity.deletedAt === "string" ||
      !belongsToMonthlyScope(activity)
    ) {
      fail("Aylık değerlendirme etkinliği kalıcı günlük plan zinciriyle uyuşmuyor.");
    }
    const dailyPlan = assertUniqueRecords(
      snapshot.plans,
      observation.dailyPlanId,
      "Aylık değerlendirme günlük planı",
    );
    const weeklyPlan = assertUniqueRecords(
      snapshot.plans,
      observation.weeklyPlanId,
      "Aylık değerlendirme haftalık planı",
    );
    if (
      dailyPlan.planType !== "daily" ||
      dailyPlan.sourceAnnualPlanId !== annualPlan.id ||
      dailyPlan.sourceMonthlyPlanId !== monthlyPlan.id ||
      dailyPlan.sourceWeeklyPlanId !== observation.weeklyPlanId ||
      activity.planId !== dailyPlan.id ||
      !isTeacherOwnedPlanRecord(weeklyPlan) ||
      weeklyPlan.planType !== "weekly" ||
      weeklyPlan.annualPlanId !== annualPlan.id ||
      weeklyPlan.monthlyPlanId !== monthlyPlan.id ||
      weeklyPlan.title !== observation.weekTitle ||
      typeof dailyPlan.deletedAt === "string" ||
      typeof weeklyPlan.deletedAt === "string" ||
      !belongsToMonthlyScope(dailyPlan) ||
      !belongsToMonthlyScope(weeklyPlan)
    ) {
      fail("Aylık değerlendirme günlük ve haftalık plan zinciri değişti.");
    }
    const evidenceRecords: { record: StoredRecord; label: string }[] = [
      { record: persisted, label: "Gözlem güncelleme zamanı" },
      { record: activity, label: "Etkinlik güncelleme zamanı" },
      { record: dailyPlan, label: "Günlük plan güncelleme zamanı" },
      { record: weeklyPlan, label: "Haftalık plan güncelleme zamanı" },
    ];
    for (const link of observation.curriculumLinks) {
      const persistedLink = assertUniqueRecords(
        snapshot.evidenceCurriculumLinks,
        link.id,
        "Aylık değerlendirme program bağı",
      );
      if (
        persistedLink.observationId !== observation.id ||
        persistedLink.confirmationMethod !== "teacher-confirmed" ||
        persistedLink.referenceCode !== link.referenceCode ||
        persistedLink.referenceTitle !== link.referenceTitle ||
        persistedLink.confirmedAt !== link.confirmedAt ||
        typeof persistedLink.deletedAt === "string" ||
        !belongsToMonthlyScope(persistedLink)
      ) {
        fail("Aylık değerlendirme program bağı öğretmen onaylı kalıcı kanıtla uyuşmuyor.");
      }
      evidenceRecords.push({
        record: persistedLink,
        label: "Program bağı güncelleme zamanı",
      });
    }
    const type = typeof persisted.observationType === "string"
      ? persisted.observationType
      : null;
    return {
      id: observation.id,
      observationType: type,
      anecdotal: type === "anecdotal",
      environment: activityEnvironment(activity),
      latestEvidenceUpdatedAt: latestRecordUpdate(evidenceRecords),
    };
  });
}

/**
 * Tek bir doğrulanmış yerel snapshot üretir. İkinci okuma sırasında plan veya
 * kanıt zinciri değişmişse eski-yeni veriyi karıştırmak yerine dışa aktarımı
 * kapatır.
 */
export async function loadTeacherOwnedMonthlyEvaluationExportSource(
  store: LocalDataStore,
  monthlyPlanId: string,
): Promise<TeacherOwnedMonthlyEvaluationExportSource> {
  const reviewContext = await loadTeacherMonthlyReviewContext(store, monthlyPlanId);
  const snapshot = await store.readSnapshot();
  const confirmedContext = await loadTeacherMonthlyReviewContext(store, monthlyPlanId);
  const confirmedSnapshot = await store.readSnapshot();
  if (canonicalJson(reviewContext) !== canonicalJson(confirmedContext)) {
    fail("Ek 18 hazırlanırken kanıt zinciri değişti; güncel kayıt yeniden açılmalıdır.");
  }
  if (canonicalJson(snapshot) !== canonicalJson(confirmedSnapshot)) {
    fail(
      "Ek 18 hazırlanırken yerel veri snapshot'ı değişti; güncel kayıt yeniden açılmalıdır.",
    );
  }
  const persisted = assertUniqueRecords(
    confirmedSnapshot.plans,
    monthlyPlanId,
    "Ek 18 aylık planı",
  );
  if (
    !isTeacherOwnedPlanRecord(persisted) ||
    persisted.planType !== "monthly" ||
    canonicalJson(persisted) !== canonicalJson(reviewContext.monthly)
  ) {
    fail("Ek 18 hazırlanırken aylık plan değişti; güncel kayıt yeniden açılmalıdır.");
  }
  const source = deepFreeze({
    reviewContext: structuredClone(confirmedContext),
    observationMetadata: observationMetadata(confirmedSnapshot, confirmedContext),
  });
  verifiedSources.add(source);
  return source;
}

function resolveEvaluation(
  context: TeacherMonthlyReviewContext,
  selection: TeacherOwnedMonthlyEvaluationExportSelection,
): TeacherMonthlyEvaluation {
  let evaluation: TeacherMonthlyEvaluation | undefined;
  if (selection.kind === "latest") {
    evaluation = context.evaluations.at(-1);
  } else if (selection.kind === "exact") {
    if (!UUID_PATTERN.test(selection.evaluationId)) {
      fail("Ek 18 için geçerli bir aylık değerlendirme kimliği gereklidir.");
    }
    evaluation = context.evaluations.find(
      (candidate) => candidate.id === selection.evaluationId,
    );
  } else {
    fail("Ek 18 değerlendirme seçimi geçersizdir.");
  }
  if (!evaluation) {
    fail(
      "Ek 18 yalnız kaydedilmiş son veya öğretmenin tam kimliğiyle seçtiği geçmiş aylık değerlendirmeden üretilebilir.",
    );
  }
  return evaluation;
}

function sameStringList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function teacherCoverageMatches(
  left: TeacherMonthlyEvidenceCoverage,
  right: TeacherMonthlyEvidenceCoverage,
): boolean {
  return left.observationCount === right.observationCount &&
    left.curriculumLinkCount === right.curriculumLinkCount &&
    left.distinctCivilDateCount === right.distinctCivilDateCount &&
    left.distinctWeekCount === right.distinctWeekCount &&
    sameStringList(left.activeStudentIds, right.activeStudentIds) &&
    sameStringList(left.coveredActiveStudentIds, right.coveredActiveStudentIds) &&
    sameStringList(left.uncoveredActiveStudentIds, right.uncoveredActiveStudentIds);
}

function summarizeTeacherCoverage(
  observations: readonly TeacherMonthlyReviewObservation[],
  activeStudentIds: readonly string[],
): TeacherMonthlyEvidenceCoverage {
  const active = new Set(activeStudentIds);
  const covered = [...new Set(
    observations.flatMap((observation) => observation.studentIds),
  )]
    .filter((studentId) => active.has(studentId))
    .sort((left, right) => left.localeCompare(right));
  const coveredSet = new Set(covered);
  return {
    observationCount: observations.length,
    curriculumLinkCount: observations.reduce(
      (total, observation) => total + observation.curriculumLinks.length,
      0,
    ),
    distinctCivilDateCount: new Set(
      observations.map((observation) => observation.civilDate),
    ).size,
    distinctWeekCount: new Set(
      observations.map((observation) => observation.weeklyPlanId),
    ).size,
    activeStudentIds: [...activeStudentIds],
    coveredActiveStudentIds: covered,
    uncoveredActiveStudentIds: activeStudentIds.filter(
      (studentId) => !coveredSet.has(studentId),
    ),
  };
}

interface ResolvedTeacherMonthlyPlanRevision {
  readonly revisionNumber: number;
  readonly title: string;
  readonly periodStart: string;
  readonly periodEnd: string;
}

function resolveMonthlyPlanRevision(
  monthly: TeacherOwnedMonthlyPlan,
  evaluation: TeacherMonthlyEvaluation,
): ResolvedTeacherMonthlyPlanRevision {
  if (evaluation.monthlyPlanId !== monthly.id) {
    fail("Seçili aylık değerlendirme kalıcı öğretmen aylık planıyla uyuşmuyor.");
  }
  const revision: TeacherOwnedPlanRevisionSnapshot | TeacherOwnedMonthlyPlan | undefined =
    evaluation.sourcePlanRevisionNumber === monthly.revisionNumber
      ? monthly
      : monthly.revisionHistory.find(
          (candidate) =>
            candidate.revisionNumber === evaluation.sourcePlanRevisionNumber,
        );
  if (
    !revision ||
    revision.revisionNumber !== evaluation.sourcePlanRevisionNumber ||
    revision.periodStart !== evaluation.periodStart ||
    revision.periodEnd !== evaluation.periodEnd ||
    !revision.title.trim()
  ) {
    fail(
      "Seçili aylık değerlendirmeye ait exact plan revizyonu bulunamadı; resmî çıktı hazırlanmadı.",
    );
  }
  return {
    revisionNumber: revision.revisionNumber,
    title: revision.title,
    periodStart: revision.periodStart,
    periodEnd: revision.periodEnd,
  };
}

function selectEvidence(
  source: TeacherOwnedMonthlyEvaluationExportSource,
  evaluation: TeacherMonthlyEvaluation,
): {
  readonly observations: readonly PremiumMonthlyReviewObservation[];
  readonly coverage: PremiumMonthlyEvaluation["children"]["coverage"];
  readonly latestEvidenceUpdatedAt: string;
  readonly monthlyPlanRevision: ResolvedTeacherMonthlyPlanRevision;
} {
  const context = source.reviewContext;
  const monthlyPlanRevision = resolveMonthlyPlanRevision(
    context.monthly,
    evaluation,
  );
  const evaluationCreatedAt = requiredIsoTimestamp(
    evaluation.createdAt,
    "Aylık değerlendirme kayıt zamanı",
  );
  const observationById = new Map(
    context.observations.map((observation) => [observation.id, observation]),
  );
  if (observationById.size !== context.observations.length) {
    fail("Aylık değerlendirme gözlem zincirinde mükerrer kimlik bulundu.");
  }
  const selected = evaluation.children.observationIds.map((id) => {
    const observation = observationById.get(id);
    if (!observation) {
      fail("Seçili aylık değerlendirme artık değişmez gözlem zincirinde bulunmayan kayıt içeriyor.");
    }
    return observation;
  });
  const requestedLinkIds = new Set(evaluation.children.curriculumLinkIds);
  if (requestedLinkIds.size !== evaluation.children.curriculumLinkIds.length) {
    fail("Aylık değerlendirme program bağı kimlikleri mükerrer olamaz.");
  }
  const availableLinks = new Map<string, TeacherMonthlyReviewObservation["curriculumLinks"][number]>();
  selected.forEach((observation) => {
    observation.curriculumLinks.forEach((link) => {
      if (link.observationId !== observation.id || availableLinks.has(link.id)) {
        fail("Aylık değerlendirme program bağı zinciri mükerrer veya tutarsız.");
      }
      availableLinks.set(link.id, link);
    });
  });
  evaluation.children.curriculumLinkIds.forEach((id) => {
    if (!availableLinks.has(id)) {
      fail("Seçili aylık değerlendirme artık öğretmen onaylı program bağı zincirinde bulunmayan kayıt içeriyor.");
    }
  });
  const selectedWithLinks = selected.map((observation) => ({
    ...observation,
    curriculumLinks: observation.curriculumLinks.filter((link) =>
      requestedLinkIds.has(link.id),
    ),
  }));
  if (selectedWithLinks.some((observation) => observation.curriculumLinks.length === 0)) {
    fail("Aylık değerlendirmedeki her seçili gözlem öğretmen onaylı program bağı taşımalıdır.");
  }
  const recomputedTeacherCoverage = summarizeTeacherCoverage(
    selectedWithLinks,
    evaluation.children.coverage.activeStudentIds,
  );
  if (!teacherCoverageMatches(recomputedTeacherCoverage, evaluation.children.coverage)) {
    fail("Aylık değerlendirme kanıt kapsamı değişmez gözlem ve program bağı zinciriyle uyuşmuyor.");
  }
  const metadataById = new Map(
    source.observationMetadata.map((metadata) => [metadata.id, metadata]),
  );
  if (metadataById.size !== source.observationMetadata.length) {
    fail("Aylık değerlendirme gözlem metadata zincirinde mükerrer kimlik bulundu.");
  }
  const premiumObservations = selectedWithLinks.map(
    (observation): PremiumMonthlyReviewObservation => {
      const metadata = metadataById.get(observation.id);
      if (!metadata) {
        fail("Aylık değerlendirme gözlem metadata kaydı eksik.");
      }
      if (metadata.latestEvidenceUpdatedAt >= evaluationCreatedAt) {
        fail(
          "Seçili aylık değerlendirmeye bağlı plan veya kanıt kaydı değerlendirmeden sonra değişti; resmî çıktı için güncel kanıtla yeni değerlendirme kaydı gerekir.",
        );
      }
      return {
        ...structuredClone(observation),
        observationType: metadata.observationType,
        anecdotal: metadata.anecdotal,
        environment: metadata.environment,
      };
    },
  );
  return {
    observations: premiumObservations,
    coverage: summarizePremiumMonthlyEvidence(
      premiumObservations,
      evaluation.children.coverage.activeStudentIds,
    ),
    latestEvidenceUpdatedAt: selectedWithLinks
      .map((observation) => metadataById.get(observation.id)!.latestEvidenceUpdatedAt)
      .sort((left, right) => left.localeCompare(right))
      .at(-1) ?? evaluationCreatedAt,
    monthlyPlanRevision,
  };
}

function toPremiumEvaluation(
  evaluation: TeacherMonthlyEvaluation,
  coverage: PremiumMonthlyEvaluation["children"]["coverage"],
): PremiumMonthlyEvaluation {
  return {
    id: evaluation.id,
    monthlyPlanId: evaluation.monthlyPlanId,
    periodStart: evaluation.periodStart,
    periodEnd: evaluation.periodEnd,
    children: {
      evidenceState: evaluation.children.evidenceState,
      narrative: evaluation.children.narrative,
      observationIds: [...evaluation.children.observationIds],
      curriculumLinkIds: [...evaluation.children.curriculumLinkIds],
      coverage,
    },
    program: {
      narrative: evaluation.program.narrative,
      criteria: evaluation.program.criteria.map((criterion) => ({
        criterionId: criterion.criterionId as
          PremiumMonthlyEvaluation["program"]["criteria"][number]["criterionId"],
        status: criterion.status,
      })),
    },
    teacher: {
      narrative: evaluation.teacher.narrative,
      criteria: evaluation.teacher.criteria.map((criterion) => ({
        criterionId: criterion.criterionId as
          PremiumMonthlyEvaluation["teacher"]["criteria"][number]["criterionId"],
        status: criterion.status,
      })),
    },
    nextMonthRecommendation: evaluation.nextMonthRecommendation,
    teacherAuthored: true,
    mebProvenance: structuredClone(PREMIUM_MONTHLY_EVALUATION_MEB_PROVENANCE),
    createdAt: evaluation.createdAt,
  };
}

function monthForPlan(monthly: TeacherOwnedMonthlyPlan): {
  readonly label: string;
  readonly columnIndex: number;
} {
  const month = Number(monthly.monthKey.slice(5, 7));
  const columnIndex = MONTHS.findIndex((candidate) => candidate.month === month);
  if (columnIndex < 0) {
    fail("Ek 18 yalnız Eylül-Haziran eğitim ayları için hazırlanabilir.");
  }
  return { label: MONTHS[columnIndex]!.label, columnIndex };
}

export function prepareTeacherOwnedMonthlyEvaluationExportDocument(
  source: TeacherOwnedMonthlyEvaluationExportSource,
  selection: TeacherOwnedMonthlyEvaluationExportSelection,
  format: MonthlyEvaluationExportFormat,
  options: Pick<TeacherOwnedMonthlyEvaluationExportOptions, "exportedAt"> = {},
): MonthlyEvaluationExportDocument {
  if (!verifiedSources.has(source)) {
    fail("Ek 18 yalnız doğrulanmış öğretmen planı kaynak zincirinden hazırlanabilir.");
  }
  if (format !== "pdf" && format !== "word") {
    fail("Ek 18 dışa aktarma biçimi PDF veya Word olmalıdır.");
  }
  const context = source.reviewContext;
  if (
    !isTeacherOwnedPlanRecord(context.monthly) ||
    context.monthly.planType !== "monthly" ||
    canonicalJson(context.monthly.monthlyEvaluations ?? []) !==
      canonicalJson(context.evaluations)
  ) {
    fail("Ek 18 aylık plan ve değerlendirme geçmişi doğrulanamadı.");
  }
  const selectedEvaluation = resolveEvaluation(context, selection);
  const selectedEvidence = selectEvidence(source, selectedEvaluation);
  const evaluation = toPremiumEvaluation(
    selectedEvaluation,
    selectedEvidence.coverage,
  );
  const month = monthForPlan(context.monthly);
  const generatedAt = requiredIsoTimestamp(
    options.exportedAt ?? new Date().toISOString(),
    "Ek 18 üretim zamanı",
  );
  const extension = format === "pdf" ? "pdf" : "docx";
  return {
    format,
    fileName: `MaarifOS_Ek18_Aylik_Plan_Kontrol_${context.monthly.monthKey}_${evaluation.id.slice(0, 8)}.${extension}`,
    monthLabel: month.label,
    monthColumnIndex: month.columnIndex,
    monthlyPlan: {
      id: context.monthly.id,
      title: selectedEvidence.monthlyPlanRevision.title,
      periodStart: selectedEvidence.monthlyPlanRevision.periodStart,
      periodEnd: selectedEvidence.monthlyPlanRevision.periodEnd,
    },
    evaluation,
    selectedObservations: selectedEvidence.observations,
    mappedOfficialRowIds: [],
    manifest: {
      schemaVersion: 2,
      documentType: "meb-2024-ek18-monthly-plan-control",
      renderingMode: format === "pdf"
        ? "semantic-accessible-reflow"
        : "source-structured-word-reproduction",
      officialSourceFormPageCount: 6,
      outputPagination: format === "pdf"
        ? "content-dependent"
        : "six-source-pages-plus-appendix",
      officialSource: structuredClone(OFFICIAL_SOURCE),
      generatedAt,
      monthlyPlanId: context.monthly.id,
      monthlyEvaluationId: evaluation.id,
      sourcePlanRevisionNumber: selectedEvaluation.sourcePlanRevisionNumber,
      evidenceLastModifiedAt: selectedEvidence.latestEvidenceUpdatedAt,
      evidenceMutationPolicy: "fail-closed-after-evaluation",
      observationIds: [...evaluation.children.observationIds],
      curriculumLinkIds: [...evaluation.children.curriculumLinkIds],
      mappedOfficialRowIds: [],
      programComponentEvidenceStatus: "verified-no-components",
      persistedProgramComponents: [],
      unmappedPlanComponents: [],
    },
  };
}

export async function generateTeacherOwnedMonthlyEvaluationExportFile(
  store: LocalDataStore,
  monthlyPlanId: string,
  selection: TeacherOwnedMonthlyEvaluationExportSelection,
  format: MonthlyEvaluationExportFormat,
  options: TeacherOwnedMonthlyEvaluationExportOptions = {},
): Promise<MonthlyEvaluationExportFile> {
  const source = await loadTeacherOwnedMonthlyEvaluationExportSource(
    store,
    monthlyPlanId,
  );
  const document = prepareTeacherOwnedMonthlyEvaluationExportDocument(
    source,
    selection,
    format,
    options,
  );
  const bytes = format === "word"
    ? createMonthlyEvaluationDocx(document)
    : await createMonthlyEvaluationPdf(document, {
        runtime: options.pdfRuntime,
      });
  return {
    format,
    fileName: document.fileName,
    mimeType: format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes,
    document,
  };
}
