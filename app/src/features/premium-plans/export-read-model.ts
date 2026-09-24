import { canonicalJson } from "../../core/backup/canonical-json.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { parsePremiumContentPack } from "./content-repository.ts";
import type {
  PremiumActivityTemplate,
  PremiumAnnualMonth,
  PremiumContentPack,
  PremiumContentPackSnapshot,
  PremiumDailyFlowSnapshot,
  PremiumFullDayFlowBlock,
  PremiumMonthlyPlan,
  PremiumPlanWeek,
} from "./domain.ts";
import {
  parsePremiumLensPreferenceRecord,
  premiumContentPackSnapshot,
  samePremiumLensPreference,
  type PremiumLensPreferenceSnapshot,
} from "./domain.ts";
import type {
  PremiumMonthlyEvaluation,
  PremiumNextPlanDecision,
  PremiumWeeklyEvaluation,
} from "./plan-service.ts";
import { parsePremiumMonthlyEvaluation } from "./plan-service.ts";

export interface PremiumPlanExportDailyPlan {
  recordId: string;
  activityRecordId: string;
  sourceWeeklyPlanId: string;
  civilDate: string;
  planTitle: string;
  activityTitle: string;
  startTime: string;
  endTime: string | null;
  sourceActivityTemplateId: string;
  appliedActivityTemplateId: string;
  appliedActivityTemplateTitle: string;
  curriculumTargetCodes: readonly string[];
  alternativeActivated: boolean;
  dailyFlow: PremiumDailyFlowSnapshot;
  lensPreference: PremiumLensPreferenceSnapshot;
  updatedAt: string;
}

export interface PremiumPlanExportWeekSource {
  recordId: string;
  teacherTitle: string;
  sourceSnapshot: PremiumPlanWeek;
  activitySnapshots: readonly PremiumActivityTemplate[];
  evaluations: readonly PremiumWeeklyEvaluation[];
  dailyPlans: readonly PremiumPlanExportDailyPlan[];
}

/**
 * Belge üreticilerinin ortak, salt-okunur plan kaynağıdır. PDF/DOCX bu modeli
 * tüketir; gelecekteki resmî form türleri aynı kaynağı kendi ayrı projeksiyonuna
 * dönüştürür. Bu model hiçbir resmî form alanı veya değerlendirme uydurmaz.
 */
export interface InstalledPremiumPlanExportSource {
  contentPackSnapshot: PremiumContentPackSnapshot;
  valuesMappingStatus: PremiumContentPack["valuesMappingStatus"];
  annualPlan: {
    recordId: string;
    teacherTitle: string;
    periodStart: string;
    periodEnd: string;
    annualMonths: readonly PremiumAnnualMonth[];
  };
  monthlyPlan: {
    recordId: string;
    teacherTitle: string;
    sourceSnapshot: PremiumMonthlyPlan;
    fullDayFlow: readonly PremiumFullDayFlowBlock[];
    evaluations: readonly PremiumMonthlyEvaluation[];
  };
  weeks: readonly PremiumPlanExportWeekSource[];
  lensPreference: PremiumLensPreferenceSnapshot;
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} eksik veya geçersiz.`);
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} eksik veya geçersiz.`);
  }
  return value;
}

function requiredStringArray(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || !entry.trim())
  ) {
    throw new Error(`${label} eksik veya geçersiz.`);
  }
  return [...value];
}

function curriculumTargetCodes(value: unknown, dailyPlanId: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`plans/${dailyPlanId} günlük program hedefleri eksik.`);
  }
  return value.map((target, index) => {
    const record = objectRecord(
      target,
      `plans/${dailyPlanId} günlük program hedefi ${index + 1}`,
    );
    return requiredText(
      record.referenceCode,
      `plans/${dailyPlanId} günlük program hedef kodu`,
    );
  });
}

function sameScope(record: StoredRecord, scope: ActiveClassroomScope): boolean {
  return recordBelongsToClassroomScope(record, scope);
}

function utcMillis(value: unknown, label: string): number {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  ) {
    throw new Error(`${label} UTC zaman biçiminde değil.`);
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`${label} UTC zaman biçiminde değil.`);
  return parsed;
}

function recordWasVisibleAt(record: StoredRecord, timestamp: number): boolean {
  return (
    utcMillis(record.createdAt, `${record.id}/createdAt`) <= timestamp &&
    (typeof record.deletedAt !== "string" ||
      utcMillis(record.deletedAt, `${record.id}/deletedAt`) > timestamp)
  );
}

function assertMonthlyEvaluationSourceGraph(
  snapshot: Awaited<ReturnType<LocalDataStore["readSnapshot"]>>,
  scope: ActiveClassroomScope,
  monthly: StoredRecord,
  evaluation: PremiumMonthlyEvaluation,
): void {
  if (
    evaluation.monthlyPlanId !== monthly.id ||
    evaluation.periodStart !== monthly.periodStart ||
    evaluation.periodEnd !== monthly.periodEnd
  ) {
    throw new Error(
      `plans/${monthly.id} aylık değerlendirmesi plan dönemiyle uyuşmuyor.`,
    );
  }
  const evaluationTimestamp = utcMillis(
    evaluation.createdAt,
    `plans/${monthly.id} aylık değerlendirme zamanı`,
  );
  const observationsById = new Map(
    snapshot.observations.map((record) => [record.id, record]),
  );
  const plansById = new Map(snapshot.plans.map((record) => [record.id, record]));
  const selectedObservationIds = new Set(evaluation.children.observationIds);
  const selectedStudentIds = new Set<string>();
  for (const observationId of evaluation.children.observationIds) {
    const observation = observationsById.get(observationId);
    const daily = observation && typeof observation.planId === "string"
      ? plansById.get(observation.planId)
      : undefined;
    const observedAt = observation?.observedAt ?? observation?.createdAt;
    if (
      !observation ||
      !sameScope(observation, scope) ||
      observation.rawTextImmutable !== true ||
      !recordWasVisibleAt(observation, evaluationTimestamp) ||
      typeof observation.civilDate !== "string" ||
      observation.civilDate < evaluation.periodStart ||
      observation.civilDate > evaluation.periodEnd ||
      utcMillis(
        observedAt,
        `observations/${observationId}/observedAt`,
      ) > evaluationTimestamp ||
      !daily ||
      daily.planType !== "daily" ||
      daily.sourceMonthlyPlanId !== monthly.id ||
      !sameScope(daily, scope)
    ) {
      throw new Error(
        `plans/${monthly.id} aylık değerlendirmesi kapsam dışı veya izlenemeyen gözleme bağlı.`,
      );
    }
    if (Array.isArray(observation.studentIds)) {
      observation.studentIds.forEach((studentId) => {
        if (typeof studentId === "string") selectedStudentIds.add(studentId);
      });
    }
  }
  const studentsById = new Map(snapshot.students.map((record) => [record.id, record]));
  for (const studentId of evaluation.children.coverage.activeStudentIds) {
    const student = studentsById.get(studentId);
    if (
      !student ||
      !sameScope(student, scope) ||
      !recordWasVisibleAt(student, evaluationTimestamp)
    ) {
      throw new Error(
        `plans/${monthly.id} aylık değerlendirmesi izlenemeyen aktif sınıf çocuğu kimliği taşıyor.`,
      );
    }
  }
  const coveredStudentIds = evaluation.children.coverage.activeStudentIds.filter(
    (studentId) => selectedStudentIds.has(studentId),
  );
  const uncoveredStudentIds = evaluation.children.coverage.activeStudentIds.filter(
    (studentId) => !selectedStudentIds.has(studentId),
  );
  if (
    coveredStudentIds.join("|") !==
      evaluation.children.coverage.coveredActiveStudentIds.join("|") ||
    uncoveredStudentIds.join("|") !==
      evaluation.children.coverage.uncoveredActiveStudentIds.join("|")
  ) {
    throw new Error(
      `plans/${monthly.id} aylık değerlendirmesinin aktif sınıf kapsam özeti kaynak gözlemlerle uyuşmuyor.`,
    );
  }
  const linksById = new Map(
    snapshot.evidenceCurriculumLinks.map((record) => [record.id, record]),
  );
  const observationsWithSelectedLink = new Set<string>();
  const monthlyProfile = objectRecord(
    monthly.curriculumProfileSnapshot,
    `plans/${monthly.id} program profili`,
  );
  for (const linkId of evaluation.children.curriculumLinkIds) {
    const link = linksById.get(linkId);
    if (
      !link ||
      !sameScope(link, scope) ||
      !recordWasVisibleAt(link, evaluationTimestamp) ||
      link.confirmationMethod !== "teacher-confirmed" ||
      typeof link.observationId !== "string" ||
      !selectedObservationIds.has(link.observationId) ||
      link.framework !== monthlyProfile.framework ||
      link.catalogId !== monthlyProfile.catalogId ||
      link.sourceVersion !== monthlyProfile.sourceVersion ||
      utcMillis(
        link.confirmedAt,
        `evidenceCurriculumLinks/${linkId}/confirmedAt`,
      ) > evaluationTimestamp
    ) {
      throw new Error(
        `plans/${monthly.id} aylık değerlendirmesi izlenemeyen öğretmen onaylı program bağı taşıyor.`,
      );
    }
    observationsWithSelectedLink.add(link.observationId);
  }
  if (
    evaluation.children.observationIds.some(
      (observationId) => !observationsWithSelectedLink.has(observationId),
    )
  ) {
    throw new Error(
      `plans/${monthly.id} aylık değerlendirmesinde program bağı olmayan seçili gözlem var.`,
    );
  }
}

function assertContentSnapshot(
  record: StoredRecord,
  expected: PremiumContentPackSnapshot,
): void {
  if (canonicalJson(record.contentPackSnapshot) !== canonicalJson(expected)) {
    throw new Error(
      `plans/${record.id} kurulmuş premium içerik kimliği seçili paketle uyuşmuyor.`,
    );
  }
}

function parseEvaluation(
  value: unknown,
  weeklyPlanId: string,
): PremiumWeeklyEvaluation {
  const record = objectRecord(value, `plans/${weeklyPlanId} haftalık değerlendirme`);
  const nextPlanDecision = record.nextPlanDecision;
  if (
    !["keep", "adapt", "replace", "observe-more"].includes(
      String(nextPlanDecision),
    )
  ) {
    throw new Error(`plans/${weeklyPlanId} haftalık değerlendirme kararı geçersiz.`);
  }
  if (record.teacherAuthored !== true) {
    throw new Error(
      `plans/${weeklyPlanId} haftalık değerlendirmesi öğretmen kaydı olarak doğrulanamadı.`,
    );
  }
  const nextPlanTargetPlanId = record.nextPlanTargetPlanId;
  if (
    nextPlanTargetPlanId !== null &&
    (typeof nextPlanTargetPlanId !== "string" || !nextPlanTargetPlanId.trim())
  ) {
    throw new Error(
      `plans/${weeklyPlanId} haftalık değerlendirme hedef plan kimliği geçersiz.`,
    );
  }
  return {
    id: requiredText(record.id, "Haftalık değerlendirme kimliği"),
    reflection: requiredText(
      record.reflection,
      "Haftalık öğretmen değerlendirmesi",
    ),
    evidenceSummary: requiredText(
      record.evidenceSummary,
      "Haftalık kanıt özeti",
    ),
    observationIds: requiredStringArray(
      record.observationIds,
      "Haftalık değerlendirme gözlem kimlikleri",
    ),
    nextPlanDecision: nextPlanDecision as PremiumNextPlanDecision,
    nextPlanTargetPlanId,
    teacherAuthored: true,
    createdAt: requiredText(
      record.createdAt,
      "Haftalık değerlendirme oluşturulma zamanı",
    ),
  };
}

function parseDailyFlow(
  value: unknown,
  dailyPlan: StoredRecord,
): PremiumDailyFlowSnapshot {
  const flow = objectRecord(
    value,
    `plans/${dailyPlan.id} premium günlük akış snapshot'ı`,
  );
  const sourceActivitySnapshot = objectRecord(
    dailyPlan.sourceActivityTemplateSnapshot,
    `plans/${dailyPlan.id} kaynak etkinlik snapshot'ı`,
  );
  if (flow.sourceWeekId !== sourceActivitySnapshot.weekId) {
    throw new Error(`plans/${dailyPlan.id} günlük akış hafta bağı geçersiz.`);
  }
  if (flow.planCivilDate !== dailyPlan.civilDate) {
    throw new Error(`plans/${dailyPlan.id} günlük akış tarihi planla uyuşmuyor.`);
  }
  if (!Array.isArray(flow.blocks) || flow.blocks.length !== 10) {
    throw new Error(`plans/${dailyPlan.id} günlük akışı 10 blok taşımıyor.`);
  }
  flow.blocks.forEach((valueBlock, index) => {
    const block = objectRecord(
      valueBlock,
      `plans/${dailyPlan.id} günlük akış ${index + 1}. blok`,
    );
    if (
      !["planned", "optional", "skipped"].includes(String(block.status)) ||
      !Number.isInteger(block.durationMinutes) ||
      Number(block.durationMinutes) < 5 ||
      Number(block.durationMinutes) > 240 ||
      typeof block.transitionNote !== "string" ||
      typeof block.teacherNote !== "string" ||
      !Array.isArray(block.selectedActivityTemplateIds) ||
      !Array.isArray(block.alternativeActivityTemplateIds) ||
      !Array.isArray(block.appliedActivityTemplateIds)
    ) {
      throw new Error(
        `plans/${dailyPlan.id} günlük akış ${index + 1}. blok düzenlemesi geçersiz.`,
      );
    }
    requiredText(block.id, "Günlük akış blok kimliği");
    requiredText(block.title, "Günlük akış blok başlığı");
    requiredText(block.purpose, "Günlük akış blok amacı");
    requiredText(block.flexibilityNote, "Günlük akış esneklik notu");
  });
  return structuredClone(flow) as unknown as PremiumDailyFlowSnapshot;
}

function buildPersistedPack(
  pack: PremiumContentPack,
  annual: StoredRecord,
  monthly: StoredRecord,
  weeklyRecords: readonly StoredRecord[],
): PremiumContentPack {
  const activitySnapshots = weeklyRecords.flatMap((record) =>
    Array.isArray(record.premiumActivityTemplates)
      ? structuredClone(record.premiumActivityTemplates)
      : [],
  );
  const rawActivities = pack.valuesContract === null
    ? activitySnapshots.map((activity) => {
        const { valuesDesign: _legacyNullValuesDesign, ...legacyActivity } =
          objectRecord(activity, "Legacy premium etkinlik snapshot'ı");
        return legacyActivity;
      })
    : activitySnapshots;
  const raw = {
    id: pack.id,
    version: pack.version,
    contentReleaseId: pack.contentReleaseId,
    manifestDigest: pack.manifestDigest,
    sku: pack.sku,
    displayName: pack.displayName,
    program: pack.program,
    ageProfile: pack.ageProfile,
    academicRelease: pack.academicRelease,
    catalogId: pack.catalogId,
    catalogSourceVersion: pack.catalogSourceVersion,
    sourceUrl: pack.sourceUrl,
    sourceCheckedOn: pack.sourceCheckedOn,
    rightsStatus: pack.rightsStatus,
    lenses: structuredClone(pack.lenses),
    annualMonths: structuredClone(annual.annualMonths),
    monthlyPlan: structuredClone(monthly.premiumMonthlyPlan),
    fullDayFlow: structuredClone(monthly.premiumFullDayFlow),
    weeks: weeklyRecords.map((record) =>
      structuredClone(record.premiumWeekSnapshot),
    ),
    activities: rawActivities,
    status: pack.status,
    accessMode: pack.accessMode,
    ...(pack.valuesContract === null
      ? {}
      : { valuesContract: structuredClone(pack.valuesContract) }),
  };
  return parsePremiumContentPack(raw);
}

function dailyPlansForWeek(
  snapshot: Awaited<ReturnType<LocalDataStore["readSnapshot"]>>,
  scope: ActiveClassroomScope,
  weeklyPlanId: string,
  persistedPack: PremiumContentPack,
): PremiumPlanExportDailyPlan[] {
  const activitiesByPlanId = new Map<string, StoredRecord[]>();
  snapshot.activities
    .filter(
      (record) =>
        typeof record.deletedAt !== "string" && sameScope(record, scope),
    )
    .forEach((record) => {
      if (typeof record.planId !== "string") return;
      const current = activitiesByPlanId.get(record.planId) ?? [];
      current.push(record);
      activitiesByPlanId.set(record.planId, current);
    });
  const templates = new Map(
    persistedPack.activities.map((activity) => [activity.id, activity]),
  );
  return snapshot.plans
    .filter(
      (record) =>
        record.planType === "daily" &&
        record.sourceWeeklyPlanId === weeklyPlanId &&
        typeof record.deletedAt !== "string" &&
        sameScope(record, scope),
    )
    .map((record) => {
      const activities = activitiesByPlanId.get(record.id) ?? [];
      if (activities.length !== 1) {
        throw new Error(
          `plans/${record.id} günlük planının tek etkinlik kaydı bulunamadı.`,
        );
      }
      const activity = activities[0]!;
      if (
        activity.sourceWeeklyPlanId !== weeklyPlanId ||
        activity.sourceAnnualPlanId !== record.sourceAnnualPlanId ||
        activity.sourceMonthlyPlanId !== record.sourceMonthlyPlanId
      ) {
        throw new Error(
          `plans/${record.id} günlük plan ve etkinlik kaynak zinciri uyuşmuyor.`,
        );
      }
      const sourceActivityTemplateId = requiredText(
        record.sourceActivityTemplateId,
        `plans/${record.id} kaynak etkinlik şablon kimliği`,
      );
      const appliedActivityTemplateId =
        typeof record.appliedActivityTemplateId === "string"
          ? record.appliedActivityTemplateId
          : sourceActivityTemplateId;
      const appliedTemplate = templates.get(appliedActivityTemplateId);
      if (!appliedTemplate) {
        throw new Error(
          `plans/${record.id} uygulanan etkinlik snapshot'ı kurulmuş pakette bulunamadı.`,
        );
      }
      const dailyFlow = parseDailyFlow(record.premiumDailyFlowSnapshot, record);
      return {
        recordId: record.id,
        activityRecordId: activity.id,
        sourceWeeklyPlanId: weeklyPlanId,
        civilDate: requiredText(record.civilDate, "Günlük plan tarihi"),
        planTitle: requiredText(record.title, "Günlük plan başlığı"),
        activityTitle: requiredText(activity.title, "Günlük etkinlik başlığı"),
        startTime: requiredText(activity.startTime, "Günlük etkinlik başlangıcı"),
        endTime:
          typeof activity.endTime === "string" && activity.endTime.trim()
            ? activity.endTime
            : null,
        sourceActivityTemplateId,
        appliedActivityTemplateId,
        appliedActivityTemplateTitle: appliedTemplate.title,
        curriculumTargetCodes: curriculumTargetCodes(
          record.curriculumTargets,
          record.id,
        ),
        alternativeActivated:
          dailyFlow.activatedAlternativeTemplateId ===
          dailyFlow.alternativeActivityTemplateId,
        dailyFlow,
        lensPreference: parsePremiumLensPreferenceRecord(
          record,
          `plans/${record.id}`,
        ),
        updatedAt: requiredText(record.updatedAt, "Günlük plan güncelleme zamanı"),
      };
    })
    .sort((left, right) =>
      `${left.civilDate}|${left.updatedAt}|${left.recordId}`.localeCompare(
        `${right.civilDate}|${right.updatedAt}|${right.recordId}`,
      ),
    );
}

export async function loadInstalledPremiumPlanExportSource(
  store: LocalDataStore,
  pack: PremiumContentPack,
  annualPlanId: string,
): Promise<InstalledPremiumPlanExportSource> {
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    throw new Error("Plan belgesi için etkin ve arşivlenmemiş bir sınıf gereklidir.");
  }
  const annual = snapshot.plans.find(
    (record) =>
      record.id === annualPlanId &&
      record.planType === "annual" &&
      record.contentPackId === pack.id &&
      record.contentPackVersion === pack.version &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!annual) {
    throw new Error("Dışa aktarılacak kurulmuş yıllık plan bulunamadı.");
  }
  const monthlyIds = requiredStringArray(
    annual.monthlySectionIds,
    `plans/${annual.id} aylık plan kimlikleri`,
  );
  if (monthlyIds.length !== 1) {
    throw new Error(
      `plans/${annual.id} bu içerik sürümü için tam olarak bir aylık plan taşımalıdır.`,
    );
  }
  const monthly = snapshot.plans.find(
    (record) =>
      record.id === monthlyIds[0] &&
      record.planType === "monthly" &&
      record.annualPlanId === annual.id &&
      record.contentPackId === pack.id &&
      record.contentPackVersion === pack.version &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!monthly) {
    throw new Error("Dışa aktarılacak kurulmuş aylık plan bulunamadı.");
  }
  const weeklyIds = requiredStringArray(
    monthly.weeklySectionIds,
    `plans/${monthly.id} haftalık plan kimlikleri`,
  );
  const weeklyRecords = weeklyIds.map((weeklyId) => {
    const weekly = snapshot.plans.find(
      (record) =>
        record.id === weeklyId &&
        record.planType === "weekly" &&
        record.annualPlanId === annual.id &&
        record.monthlyPlanId === monthly.id &&
        record.contentPackId === pack.id &&
        record.contentPackVersion === pack.version &&
        typeof record.deletedAt !== "string" &&
        sameScope(record, scope),
    );
    if (!weekly) {
      throw new Error(`plans/${monthly.id} haftalık plan zinciri eksik.`);
    }
    return weekly;
  });
  if (new Set(weeklyIds).size !== weeklyIds.length) {
    throw new Error(`plans/${monthly.id} haftalık plan zinciri mükerrer kimlik taşıyor.`);
  }
  const expectedSnapshot = premiumContentPackSnapshot(pack);
  [annual, monthly, ...weeklyRecords].forEach((record) =>
    assertContentSnapshot(record, expectedSnapshot),
  );
  const persistedPack = buildPersistedPack(
    pack,
    annual,
    monthly,
    weeklyRecords,
  );
  const lensPreference = parsePremiumLensPreferenceRecord(
    annual,
    `plans/${annual.id}`,
  );
  [monthly, ...weeklyRecords].forEach((record) => {
    const relatedPreference = parsePremiumLensPreferenceRecord(
      record,
      `plans/${record.id}`,
    );
    if (!samePremiumLensPreference(relatedPreference, lensPreference)) {
      throw new Error(
        "Kurulmuş planın öğretmen yaklaşım tercihi yıllık, aylık ve haftalık kayıtlarda uyuşmuyor.",
      );
    }
  });
  const weeks = weeklyRecords.map((weekly, index): PremiumPlanExportWeekSource => {
    const sourceSnapshot = persistedPack.weeks[index];
    if (!sourceSnapshot || sourceSnapshot.id !== weekly.weekId) {
      throw new Error(
        `plans/${weekly.id} haftalık snapshot kimliği kaynak planla uyuşmuyor.`,
      );
    }
    const activitySnapshots = persistedPack.activities.filter(
      (activity) => activity.weekId === sourceSnapshot.id,
    );
    const evaluations = Array.isArray(weekly.weeklyEvaluations)
      ? weekly.weeklyEvaluations.map((value) =>
          parseEvaluation(value, weekly.id),
        )
      : (() => {
          throw new Error(`plans/${weekly.id} haftalık değerlendirme dizisi eksik.`);
        })();
    return {
      recordId: weekly.id,
      teacherTitle: requiredText(weekly.title, "Haftalık plan başlığı"),
      sourceSnapshot,
      activitySnapshots,
      evaluations,
      dailyPlans: dailyPlansForWeek(
        snapshot,
        scope,
        weekly.id,
        persistedPack,
      ),
    };
  });
  const monthlyEvaluations = Array.isArray(monthly.monthlyEvaluations)
    ? monthly.monthlyEvaluations.map((value, index) => {
        const evaluation = parsePremiumMonthlyEvaluation(
          value,
          `plans/${monthly.id} aylık değerlendirme ${index + 1}`,
        );
        assertMonthlyEvaluationSourceGraph(
          snapshot,
          scope,
          monthly,
          evaluation,
        );
        return evaluation;
      })
    : [];
  return {
    contentPackSnapshot: expectedSnapshot,
    valuesMappingStatus: persistedPack.valuesMappingStatus,
    annualPlan: {
      recordId: annual.id,
      teacherTitle: requiredText(annual.title, "Yıllık plan başlığı"),
      periodStart: requiredText(annual.periodStart, "Yıllık plan başlangıcı"),
      periodEnd: requiredText(annual.periodEnd, "Yıllık plan bitişi"),
      annualMonths: structuredClone(persistedPack.annualMonths),
    },
    monthlyPlan: {
      recordId: monthly.id,
      teacherTitle: requiredText(monthly.title, "Aylık plan başlığı"),
      sourceSnapshot: structuredClone(persistedPack.monthlyPlan),
      fullDayFlow: structuredClone(persistedPack.fullDayFlow),
      evaluations: monthlyEvaluations,
    },
    weeks,
    lensPreference,
  };
}
