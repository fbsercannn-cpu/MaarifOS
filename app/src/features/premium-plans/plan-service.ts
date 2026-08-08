import { isCivilDate } from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import { createEmptySnapshot, type StoredRecord } from "../../core/domain/model.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";
import {
  curriculumTargetsForProfile,
  type CurriculumTargetSnapshot,
} from "../curriculum/curriculum-catalog.ts";
import type { CurriculumProfileSnapshot } from "../evidence/evidence-flow.ts";
import { parseTeacherWeeklyValuesNarrative } from "../values/value-plan-models.ts";
import type {
  PremiumContentPack,
  PremiumDailyTemplateSelection,
  PremiumLensSelectionMode,
  PremiumPlanBoardResult,
  PremiumPlanLensId,
} from "./domain.ts";
import {
  parsePremiumLensPreferenceRecord,
  premiumContentPackSnapshot,
  premiumDailyTemplateSelection,
  samePremiumLensPreference,
} from "./domain.ts";
import { assertPremiumContentPackValuesIntegrity } from "./content-repository.ts";

const ANNUAL_PERIOD_START = "2026-09-07";
const ANNUAL_PERIOD_END = "2027-06-25";

export interface PremiumInstalledPlanSummary {
  annualPlanId: string;
  monthlyPlanId: string;
  weeklyPlanIds: readonly { weekId: string; planId: string }[];
  title: string;
  contentVersion: string;
  teacherPreferredLensId: PremiumPlanLensId;
  teacherPreferredSupportingLensIds: readonly PremiumPlanLensId[];
  lensSelectionMode: PremiumLensSelectionMode;
  activityCount: number;
  installedAt: string;
}

export interface PremiumLegacyInstalledPlanSummary {
  annualPlanId: string;
  title: string;
  contentPackId: string;
  contentVersion: string;
  installedAt: string;
  valuesMappingStatus: "legacy-unmapped";
  readOnly: true;
}

export type PremiumNextPlanDecision =
  | "keep"
  | "adapt"
  | "replace"
  | "observe-more";

export interface PremiumWeeklyEvaluation {
  id: string;
  reflection: string;
  evidenceSummary: string;
  observationIds: readonly string[];
  nextPlanDecision: PremiumNextPlanDecision;
  nextPlanTargetPlanId: string | null;
  teacherAuthored: true;
  createdAt: string;
}

export interface PremiumWeeklyReviewObservation {
  id: string;
  civilDate: string;
  observedAt: string;
  rawText: string;
  activityTitle: string;
  studentId: string | null;
  studentName: string | null;
  activityId: string | null;
  valueEvidenceEligible: boolean;
}

export interface PremiumWeeklyReviewContext {
  weeklyPlanId: string;
  weekId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  observations: readonly PremiumWeeklyReviewObservation[];
  evaluations: readonly PremiumWeeklyEvaluation[];
}

function recordObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Haftalık değerlendirme kartının değer kanıtı için yalnız keşif görünümüdür.
 * Bu projection bağlantı oluşturmaz; grup ve legacy gözlemleri fail-closed tutar.
 */
export function projectPremiumWeeklyReviewObservation(
  observation: StoredRecord,
  activity: StoredRecord | undefined,
  student: StoredRecord | undefined,
): PremiumWeeklyReviewObservation {
  const studentIds = Array.isArray(observation.studentIds)
    ? observation.studentIds.filter(
        (candidate): candidate is string => typeof candidate === "string",
      )
    : [];
  const studentId = studentIds.length === 1 ? studentIds[0] : null;
  const activityId =
    typeof observation.activityId === "string" ? observation.activityId : null;
  const appliedTemplate = recordObject(activity?.appliedActivityTemplateSnapshot);
  const sourceContent = recordObject(activity?.sourceContentPackSnapshot);
  const studentIsLive = Boolean(
    studentId &&
      student?.id === studentId &&
      typeof student.deletedAt !== "string" &&
      student.enrollmentStatus !== "left" &&
      student.enrollmentStatus !== "completed" &&
      student.enrollmentStatus !== "transferred",
  );
  const valueEvidenceEligible = Boolean(
    studentIsLive &&
      activityId &&
      activity?.id === activityId &&
      activity.planId === observation.planId &&
      typeof activity.appliedActivityTemplateId === "string" &&
      appliedTemplate?.id === activity.appliedActivityTemplateId &&
      recordObject(appliedTemplate.valuesDesign) &&
      sourceContent?.valuesMappingStatus ===
        "machine_validated_pending_human_review",
  );

  return {
    id: observation.id,
    civilDate: observation.civilDate,
    observedAt:
      typeof observation.observedAt === "string"
        ? observation.observedAt
        : observation.createdAt,
    rawText: String(observation.rawText),
    activityTitle: activity ? String(activity.title ?? "Etkinlik") : "Etkinlik",
    studentId,
    studentName:
      studentIsLive && typeof student?.displayName === "string"
        ? student.displayName
        : null,
    activityId,
    valueEvidenceEligible,
  };
}

async function activeScopeInTransaction(
  transaction: DataTransaction,
): Promise<ActiveClassroomScope> {
  const snapshot = createEmptySnapshot();
  [snapshot.academicYears, snapshot.classrooms, snapshot.settings] =
    await Promise.all([
      transaction.getAll("academicYears"),
      transaction.getAll("classrooms"),
      transaction.getAll("settings"),
    ]);
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    throw new Error("Premium planı eklemek için etkin ve arşivlenmemiş bir sınıf gereklidir.");
  }
  return scope;
}

function sameScope(record: StoredRecord, scope: ActiveClassroomScope): boolean {
  return recordBelongsToClassroomScope(record, scope);
}

function utcTimestampMillis(value: string, label: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new Error(`${label} UTC zaman biçiminde değil; işlem uygulanmadı.`);
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} UTC zaman biçiminde değil; işlem uygulanmadı.`);
  }
  return parsed;
}

function latestStoredRecordTimestampMillis(
  record: StoredRecord,
  label: string,
): number {
  return Math.max(
    utcTimestampMillis(record.createdAt, `${label}/createdAt`),
    utcTimestampMillis(record.updatedAt, `${label}/updatedAt`),
    ...(typeof record.deletedAt === "string"
      ? [utcTimestampMillis(record.deletedAt, `${label}/deletedAt`)]
      : []),
  );
}

function assertMutationChronology(
  now: Date,
  records: readonly { label: string; record: StoredRecord }[],
  operationLabel: string,
): void {
  if (
    records.some(
      ({ label, record }) =>
        now.getTime() < latestStoredRecordTimestampMillis(record, label),
    )
  ) {
    throw new Error(
      `${operationLabel} zamanı ilgili kayıtların son değişiklik zamanından eski; işlem uygulanmadı.`,
    );
  }
}

function validateProfile(
  pack: PremiumContentPack,
  profile: CurriculumProfileSnapshot,
): void {
  if (
    profile.framework !== "tymm" ||
    profile.catalogId !== pack.catalogId ||
    profile.sourceVersion !== pack.catalogSourceVersion ||
    profile.referenceOrigin !== "official-catalog" ||
    profile.officialCatalogVerified !== true
  ) {
    throw new Error(
      "Bu paket yalnız doğrulanmış TYMM 2024 program profiliyle kullanılabilir.",
    );
  }
}

function validateLensSelection(
  pack: PremiumContentPack,
  teacherPreferredLensId: PremiumPlanLensId,
  teacherPreferredSupportingLensIds: readonly PremiumPlanLensId[],
): void {
  const available = new Set(pack.lenses.map((lens) => lens.id));
  if (!available.has(teacherPreferredLensId)) {
    throw new Error("Seçilen ana pedagojik lens bu pakette bulunmuyor.");
  }
  if (teacherPreferredSupportingLensIds.length > 2) {
    throw new Error("Bir planda en fazla iki destekleyici lens seçilebilir.");
  }
  if (
    new Set([
      teacherPreferredLensId,
      ...teacherPreferredSupportingLensIds,
    ]).size !== teacherPreferredSupportingLensIds.length + 1
  ) {
    throw new Error("Aynı pedagojik lens birden fazla seçilemez.");
  }
  if (
    teacherPreferredSupportingLensIds.some(
      (lensId) => !available.has(lensId),
    )
  ) {
    throw new Error("Destekleyici lenslerden biri bu pakette bulunmuyor.");
  }
}

function targetsForPack(
  pack: PremiumContentPack,
  profile: CurriculumProfileSnapshot,
): CurriculumTargetSnapshot[] {
  const allTargets = curriculumTargetsForProfile(profile, pack.ageProfile);
  const requestedCodes = new Set(
    pack.activities.flatMap((activity) => activity.curriculumTargetCodes),
  );
  const selected = allTargets.filter((target) =>
    requestedCodes.has(target.referenceCode),
  );
  const foundCodes = new Set(selected.map((target) => target.referenceCode));
  const missing = [...requestedCodes].filter((code) => !foundCodes.has(code));
  if (missing.length > 0) {
    throw new Error(`Premium içerikte katalogda bulunmayan TYMM hedefleri var: ${missing.join(", ")}`);
  }
  return selected;
}

export async function installPremiumPlanBoard(
  store: LocalDataStore,
  input: {
    pack: PremiumContentPack;
    curriculumProfile: CurriculumProfileSnapshot;
    teacherPreferredLensId: PremiumPlanLensId;
    teacherPreferredSupportingLensIds?: readonly PremiumPlanLensId[];
    now?: Date;
  },
): Promise<PremiumPlanBoardResult> {
  const teacherPreferredSupportingLensIds =
    input.teacherPreferredSupportingLensIds ?? [];
  assertPremiumContentPackValuesIntegrity(input.pack);
  validateProfile(input.pack, input.curriculumProfile);
  validateLensSelection(
    input.pack,
    input.teacherPreferredLensId,
    teacherPreferredSupportingLensIds,
  );
  const curriculumTargets = targetsForPack(input.pack, input.curriculumProfile);
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kurulum zamanı gerekli.");
  const timestamp = now.toISOString();
  const contentSnapshot = premiumContentPackSnapshot(input.pack);
  let result: PremiumPlanBoardResult | null = null;

  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [academicYears, classrooms, plans] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("classrooms"),
        transaction.getAll("plans"),
      ]);
      const academicYear = academicYears.find(
        (record) => record.id === scope.academicYearId,
      );
      if (
        !academicYear ||
        !isCivilDate(academicYear.startDate) ||
        !isCivilDate(academicYear.endDate) ||
        ANNUAL_PERIOD_START < academicYear.startDate ||
        ANNUAL_PERIOD_END > academicYear.endDate
      ) {
        throw new Error(
          "Etkin eğitim yılı 7 Eylül 2026–25 Haziran 2027 plan dönemini kapsamıyor.",
        );
      }
      const classroom = classrooms.find((record) => record.id === scope.classroomId);
      const rawStoredProfile = classroom?.curriculumProfileSnapshot;
      const storedProfile =
        rawStoredProfile &&
        typeof rawStoredProfile === "object" &&
        !Array.isArray(rawStoredProfile)
          ? (rawStoredProfile as Record<string, unknown>)
          : null;
      if (
        !classroom ||
        !storedProfile ||
        storedProfile.framework !== input.curriculumProfile.framework ||
        storedProfile.catalogId !== input.curriculumProfile.catalogId ||
        storedProfile.sourceVersion !== input.curriculumProfile.sourceVersion ||
        storedProfile.referenceOrigin !== input.curriculumProfile.referenceOrigin ||
        storedProfile.officialCatalogVerified !== true ||
        typeof classroom.ageGroup !== "string" ||
        !/60\s*[–-]\s*72/.test(classroom.ageGroup)
      ) {
        throw new Error(
          "Etkin sınıf doğrulanmış TYMM 2024 · 60–72 ay pilot profiliyle uyuşmuyor.",
        );
      }

      const existingAnnual = plans.find(
        (record) =>
          record.planType === "annual" &&
          record.contentPackId === input.pack.id &&
          record.contentPackVersion === input.pack.version &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (existingAnnual) {
        const existingMonthly = plans.find(
          (record) =>
            record.planType === "monthly" &&
            record.annualPlanId === existingAnnual.id &&
            record.monthKey === "2026-09" &&
            typeof record.deletedAt !== "string" &&
            sameScope(record, scope),
        );
        if (!existingMonthly) {
          throw new Error("Yıllık plan bulundu ancak Eylül aylık planı eksik; veri bütünlüğü incelemesi gerekli.");
        }
        const weeklyPlanIds = input.pack.weeks.map((week) => {
          const weekly = plans.find(
            (record) =>
              record.planType === "weekly" &&
              record.monthlyPlanId === existingMonthly.id &&
              record.weekId === week.id &&
              typeof record.deletedAt !== "string" &&
              sameScope(record, scope),
          );
          if (!weekly) {
            throw new Error(
              `Eylül aylık planının ${week.title} kaydı eksik; veri bütünlüğü incelemesi gerekli.`,
            );
          }
          return { weekId: week.id, planId: weekly.id };
        });
        result = {
          annualPlanId: existingAnnual.id,
          monthlyPlanId: existingMonthly.id,
          weeklyPlanIds,
          created: false,
        };
        return;
      }

      const annualPlanId = crypto.randomUUID();
      const monthlyPlanId = crypto.randomUUID();
      const weeklyPlanIds = input.pack.weeks.map((week) => ({
        weekId: week.id,
        planId: crypto.randomUUID(),
      }));
      const annualPlan: StoredRecord = {
        id: annualPlanId,
        planType: "annual",
        title: `${input.pack.displayName} Yıllık Planlama Panosu`,
        status: "active",
        periodStart: ANNUAL_PERIOD_START,
        periodEnd: ANNUAL_PERIOD_END,
        ageProfile: input.pack.ageProfile,
        curriculumProfileSnapshot: structuredClone(input.curriculumProfile),
        contentPackId: input.pack.id,
        contentPackVersion: input.pack.version,
        contentPackSnapshot: structuredClone(contentSnapshot),
        teacherPreferredLensId: input.teacherPreferredLensId,
        teacherPreferredSupportingLensIds: [
          ...teacherPreferredSupportingLensIds,
        ],
        lensSelectionMode: "preference_only",
        monthlySectionIds: [monthlyPlanId],
        annualMonths: structuredClone(input.pack.annualMonths),
        coverageSummary: {
          availableMonthCount: input.pack.annualMonths.filter(
            (month) => month.releaseStatus !== "planned-release",
          ).length,
          plannedMonthCount: input.pack.annualMonths.filter(
            (month) => month.releaseStatus === "planned-release",
          ).length,
          availableActivityCount: input.pack.activities.length,
        },
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: ANNUAL_PERIOD_START,
        deletedAt: null,
        schemaVersion: 1,
      };
      const monthlyPlan: StoredRecord = {
        id: monthlyPlanId,
        planType: "monthly",
        title: input.pack.monthlyPlan.title,
        status: "review_ready",
        annualPlanId,
        monthKey: input.pack.monthlyPlan.monthKey,
        periodStart: input.pack.monthlyPlan.periodStart,
        periodEnd: input.pack.monthlyPlan.periodEnd,
        ageProfile: input.pack.ageProfile,
        curriculumProfileSnapshot: structuredClone(input.curriculumProfile),
        curriculumTargets: structuredClone(curriculumTargets),
        contentPackId: input.pack.id,
        contentPackVersion: input.pack.version,
        contentPackSnapshot: structuredClone(contentSnapshot),
        teacherPreferredLensId: input.teacherPreferredLensId,
        teacherPreferredSupportingLensIds: [
          ...teacherPreferredSupportingLensIds,
        ],
        lensSelectionMode: "preference_only",
        weeklySectionIds: weeklyPlanIds.map(({ planId }) => planId),
        premiumWeeks: structuredClone(input.pack.weeks),
        premiumActivityTemplates: structuredClone(input.pack.activities),
        premiumMonthlyPlan: structuredClone(input.pack.monthlyPlan),
        premiumFullDayFlow: structuredClone(input.pack.fullDayFlow),
        teacherReviewRequired: true,
        monthlyReflection: null,
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: input.pack.monthlyPlan.periodStart,
        deletedAt: null,
        schemaVersion: 1,
      };
      const weeklyPlans: StoredRecord[] = input.pack.weeks.map((week) => {
        const weeklyActivities = input.pack.activities.filter(
          (activity) => activity.weekId === week.id,
        );
        const requestedCodes = new Set(
          weeklyActivities.flatMap((activity) => activity.curriculumTargetCodes),
        );
        const weeklyTargets = curriculumTargets.filter((target) =>
          requestedCodes.has(target.referenceCode),
        );
        const weeklyPlanId = weeklyPlanIds.find(
          (candidate) => candidate.weekId === week.id,
        )?.planId;
        if (!weeklyPlanId) {
          throw new Error(`${week.title} için haftalık plan kimliği üretilemedi.`);
        }
        return {
          id: weeklyPlanId,
          planType: "weekly",
          title: week.title,
          status: "review_ready",
          annualPlanId,
          monthlyPlanId,
          weekId: week.id,
          periodStart: week.periodStart,
          periodEnd: week.periodEnd,
          ageProfile: input.pack.ageProfile,
          curriculumProfileSnapshot: structuredClone(input.curriculumProfile),
          curriculumTargets: structuredClone(weeklyTargets),
          contentPackId: input.pack.id,
          contentPackVersion: input.pack.version,
          contentPackSnapshot: structuredClone(contentSnapshot),
          teacherPreferredLensId: input.teacherPreferredLensId,
          teacherPreferredSupportingLensIds: [
            ...teacherPreferredSupportingLensIds,
          ],
          lensSelectionMode: "preference_only",
          premiumWeekSnapshot: structuredClone(week),
          premiumActivityTemplates: structuredClone(weeklyActivities),
          teacherReviewRequired: true,
          weeklyEvaluations: [],
          nextPlanDecisionRequired: true,
          academicYearId: scope.academicYearId,
          classroomId: scope.classroomId,
          createdAt: timestamp,
          updatedAt: timestamp,
          civilDate: week.periodStart,
          deletedAt: null,
          schemaVersion: 1,
        };
      });
      await transaction.putMany("plans", [annualPlan, monthlyPlan, ...weeklyPlans]);
      result = { annualPlanId, monthlyPlanId, weeklyPlanIds, created: true };
    },
  );

  if (!result) throw new Error("Premium yıllık ve aylık plan kaydedilemedi.");
  return result;
}

export async function loadInstalledPremiumPlan(
  store: LocalDataStore,
  pack: PremiumContentPack,
): Promise<PremiumInstalledPlanSummary | null> {
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return null;
  const annual = snapshot.plans.find(
    (record) =>
      record.planType === "annual" &&
      record.contentPackId === pack.id &&
      record.contentPackVersion === pack.version &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!annual) return null;
  const monthly = snapshot.plans.find(
    (record) =>
      record.planType === "monthly" &&
      record.annualPlanId === annual.id &&
      record.monthKey === "2026-09" &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!monthly) return null;
  const weeklyPlanIds = pack.weeks.map((week) => {
    const weekly = snapshot.plans.find(
      (record) =>
        record.planType === "weekly" &&
        record.monthlyPlanId === monthly.id &&
        record.weekId === week.id &&
        typeof record.deletedAt !== "string" &&
        sameScope(record, scope),
    );
    return weekly ? { weekId: week.id, planId: weekly.id } : null;
  });
  if (weeklyPlanIds.some((entry) => entry === null)) return null;
  const lensPreference = parsePremiumLensPreferenceRecord(
    annual,
    `plans/${annual.id}`,
  );
  validateLensSelection(
    pack,
    lensPreference.teacherPreferredLensId,
    lensPreference.teacherPreferredSupportingLensIds,
  );
  for (const relatedPlan of [monthly, ...weeklyPlanIds.flatMap((entry) => {
    if (!entry) return [];
    const weekly = snapshot.plans.find((record) => record.id === entry.planId);
    return weekly ? [weekly] : [];
  })]) {
    const relatedPreference = parsePremiumLensPreferenceRecord(
      relatedPlan,
      `plans/${relatedPlan.id}`,
    );
    if (!samePremiumLensPreference(relatedPreference, lensPreference)) {
      throw new Error(
        "Premium planın öğretmen yaklaşım tercihi yıllık, aylık ve haftalık kayıtlarda uyuşmuyor.",
      );
    }
  }
  return {
    annualPlanId: annual.id,
    monthlyPlanId: monthly.id,
    weeklyPlanIds: weeklyPlanIds.filter(
      (entry): entry is { weekId: string; planId: string } => entry !== null,
    ),
    title: String(annual.title),
    contentVersion: String(annual.contentPackVersion),
    ...lensPreference,
    activityCount: Array.isArray(monthly.premiumActivityTemplates)
      ? monthly.premiumActivityTemplates.length
      : 0,
    installedAt: annual.createdAt,
  };
}

export async function loadLegacyInstalledPremiumPlans(
  store: LocalDataStore,
  currentPack: PremiumContentPack,
): Promise<readonly PremiumLegacyInstalledPlanSummary[]> {
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return [];
  return snapshot.plans
    .filter(
      (record) =>
        record.planType === "annual" &&
        typeof record.deletedAt !== "string" &&
        sameScope(record, scope) &&
        (record.contentPackId !== currentPack.id ||
          record.contentPackVersion !== currentPack.version),
    )
    .flatMap((record) => {
      const contentPackSnapshot = record.contentPackSnapshot;
      const contentPack = contentPackSnapshot &&
        typeof contentPackSnapshot === "object" &&
        !Array.isArray(contentPackSnapshot)
        ? contentPackSnapshot as Record<string, unknown>
        : null;
      const version = typeof record.contentPackVersion === "string"
        ? record.contentPackVersion
        : "";
      const legacyStatus = contentPack?.valuesMappingStatus === "legacy-unmapped" ||
        (contentPack?.valuesMappingStatus === undefined &&
          Number.parseInt(version.split(".")[0] ?? "", 10) < 3);
      if (
        !legacyStatus ||
        typeof record.contentPackId !== "string" ||
        typeof record.title !== "string" ||
        typeof record.createdAt !== "string"
      ) {
        return [];
      }
      return [{
        annualPlanId: record.id,
        title: record.title,
        contentPackId: record.contentPackId,
        contentVersion: version,
        installedAt: record.createdAt,
        valuesMappingStatus: "legacy-unmapped" as const,
        readOnly: true as const,
      }];
    })
    .sort((left, right) => right.installedAt.localeCompare(left.installedAt));
}

export function preparePremiumDailyTemplate(
  pack: PremiumContentPack,
  activityId: string,
  lineage: {
    annualPlanId: string;
    monthlyPlanId: string;
    weeklyPlanIds: readonly { weekId: string; planId: string }[];
    teacherPreferredLensId: PremiumPlanLensId;
    teacherPreferredSupportingLensIds: readonly PremiumPlanLensId[];
  },
): PremiumDailyTemplateSelection {
  const activity = pack.activities.find((candidate) => candidate.id === activityId);
  if (!activity) {
    throw new Error("Seçilen premium etkinlik bu içerik paketinde bulunmuyor.");
  }
  if (activity.activityRole !== "main") {
    throw new Error(
      "Alternatif etkinlik doğrudan uygulanmış etkinlik olarak seçilemez; haftanın ana etkinliğine seçenek olarak eklenir.",
    );
  }
  const weeklyPlanId = lineage.weeklyPlanIds.find(
    (candidate) => candidate.weekId === activity.weekId,
  )?.planId;
  if (!weeklyPlanId) {
    throw new Error("Seçilen etkinliğin haftalık plan kaydı bulunmuyor.");
  }
  return premiumDailyTemplateSelection(pack, activity, {
    annualPlanId: lineage.annualPlanId,
    monthlyPlanId: lineage.monthlyPlanId,
    weeklyPlanId,
    teacherPreferredLensId: lineage.teacherPreferredLensId,
    teacherPreferredSupportingLensIds:
      lineage.teacherPreferredSupportingLensIds,
  });
}

export async function updatePremiumPlanLensPreferences(
  store: LocalDataStore,
  input: {
    pack: PremiumContentPack;
    teacherPreferredLensId: PremiumPlanLensId;
    teacherPreferredSupportingLensIds?: readonly PremiumPlanLensId[];
    now?: Date;
  },
): Promise<void> {
  const teacherPreferredSupportingLensIds =
    input.teacherPreferredSupportingLensIds ?? [];
  validateLensSelection(
    input.pack,
    input.teacherPreferredLensId,
    teacherPreferredSupportingLensIds,
  );
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir güncelleme zamanı gerekli.");
  const timestamp = now.toISOString();
  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const plans = await transaction.getAll("plans");
      const annual = plans.find(
        (record) =>
          record.planType === "annual" &&
          record.contentPackId === input.pack.id &&
          record.contentPackVersion === input.pack.version &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (!annual) throw new Error("Yaklaşımı değiştirilecek premium plan bulunamadı.");
      const related = plans.filter(
        (record) =>
          (record.id === annual.id || record.annualPlanId === annual.id) &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      assertMutationChronology(
        now,
        related.map((record) => ({ label: `plans/${record.id}`, record })),
        "Pedagojik lens güncelleme",
      );
      await transaction.putMany(
        "plans",
        related.map((record) => {
          const {
            primaryLensId: _legacyPrimaryLensId,
            supportingLensIds: _legacySupportingLensIds,
            ...withoutLegacyLensFields
          } = record;
          return {
            ...withoutLegacyLensFields,
            teacherPreferredLensId: input.teacherPreferredLensId,
            teacherPreferredSupportingLensIds: [
              ...teacherPreferredSupportingLensIds,
            ],
            lensSelectionMode: "preference_only",
            updatedAt: timestamp,
          };
        }),
      );
    },
  );
}

export async function recordPremiumWeeklyEvaluation(
  store: LocalDataStore,
  input: {
    weeklyPlanId: string;
    reflection: string;
    evidenceSummary: string;
    observationIds?: readonly string[];
    nextPlanDecision: PremiumNextPlanDecision;
    now?: Date;
  },
): Promise<PremiumWeeklyEvaluation> {
  const reflection = parseTeacherWeeklyValuesNarrative(
    input.reflection,
    "Haftalık öğretmen değerlendirmesi",
  );
  const evidenceSummary = parseTeacherWeeklyValuesNarrative(
    input.evidenceSummary,
    "Haftalık kanıt özeti",
  );
  if (!["keep", "adapt", "replace", "observe-more"].includes(input.nextPlanDecision)) {
    throw new Error("Geçerli bir sonraki plan kararı seçilmelidir.");
  }
  const observationIds = [...new Set(input.observationIds ?? [])];
  if (observationIds.length === 0) {
    throw new Error("Haftalık değerlendirme için en az bir bağlı gözlem seçilmelidir.");
  }
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir değerlendirme zamanı gerekli.");
  const timestamp = now.toISOString();
  let result: PremiumWeeklyEvaluation | null = null;

  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans", "observations"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [plans, observations] = await Promise.all([
        transaction.getAll("plans"),
        transaction.getAll("observations"),
      ]);
      const weekly = plans.find(
        (record) =>
          record.id === input.weeklyPlanId &&
          record.planType === "weekly" &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (!weekly) throw new Error("Değerlendirilecek haftalık plan bulunamadı.");
      const observationsById = new Map(observations.map((record) => [record.id, record]));
      const selectedObservations: StoredRecord[] = [];
      const weeklyDailyPlanIds = new Set(
        plans
          .filter(
            (record) =>
              record.planType === "daily" &&
              record.sourceWeeklyPlanId === weekly.id &&
              typeof record.deletedAt !== "string" &&
              sameScope(record, scope),
          )
          .map((record) => record.id),
      );
      for (const observationId of observationIds) {
        const observation = observationsById.get(observationId);
        if (
          !observation ||
          !sameScope(observation, scope) ||
          typeof observation.planId !== "string" ||
          !weeklyDailyPlanIds.has(observation.planId) ||
          observation.rawTextImmutable !== true ||
          typeof observation.deletedAt === "string"
        ) {
          throw new Error(
            "Değerlendirme yalnız bu haftanın premium günlük planlarına bağlı ham gözlemleri kullanabilir.",
          );
        }
        const observedAt =
          typeof observation.observedAt === "string"
            ? observation.observedAt
            : observation.createdAt;
        if (
          utcTimestampMillis(
            observedAt,
            `observations/${observation.id}/observedAt`,
          ) > now.getTime()
        ) {
          throw new Error(
            "Haftalık değerlendirme zamanı bağlı gözlemin gerçekleşme zamanından eski; işlem uygulanmadı.",
          );
        }
        parseTeacherWeeklyValuesNarrative(
          observation.rawText,
          "Haftalık değerlendirmeye bağlı ham gözlem",
        );
        selectedObservations.push(observation);
      }
      const nextWeekly = plans
        .filter(
          (record) =>
            record.planType === "weekly" &&
            record.monthlyPlanId === weekly.monthlyPlanId &&
            typeof record.periodStart === "string" &&
            String(record.periodStart) > String(weekly.periodEnd) &&
            typeof record.deletedAt !== "string" &&
            sameScope(record, scope),
        )
        .sort((left, right) =>
          String(left.periodStart).localeCompare(String(right.periodStart)),
        )[0];
      assertMutationChronology(
        now,
        [
          { label: `plans/${weekly.id}`, record: weekly },
          ...(nextWeekly
            ? [{ label: `plans/${nextWeekly.id}`, record: nextWeekly }]
            : []),
          ...selectedObservations.map((record) => ({
            label: `observations/${record.id}`,
            record,
          })),
        ],
        "Haftalık değerlendirme",
      );
      const evaluation: PremiumWeeklyEvaluation = {
        id: crypto.randomUUID(),
        reflection,
        evidenceSummary,
        observationIds,
        nextPlanDecision: input.nextPlanDecision,
        nextPlanTargetPlanId: nextWeekly?.id ?? null,
        teacherAuthored: true,
        createdAt: timestamp,
      };
      const previous = Array.isArray(weekly.weeklyEvaluations)
        ? weekly.weeklyEvaluations
        : [];
      const recordsToPut: StoredRecord[] = [
        {
          ...weekly,
          status: "evaluated",
          weeklyEvaluations: [...previous, structuredClone(evaluation)],
          nextPlanDecisionRequired: false,
          updatedAt: timestamp,
        },
      ];
      if (nextWeekly) {
        recordsToPut.push({
          ...nextWeekly,
          previousWeekEvaluationId: evaluation.id,
          nextPlanDecisionContext: {
            sourceWeeklyPlanId: weekly.id,
            evaluationId: evaluation.id,
            decision: evaluation.nextPlanDecision,
            evidenceSummary: evaluation.evidenceSummary,
            teacherReflection: evaluation.reflection,
            createdAt: evaluation.createdAt,
          },
          teacherReviewRequired: true,
          updatedAt: timestamp,
        });
      }
      await transaction.putMany("plans", recordsToPut);
      result = evaluation;
    },
  );
  if (!result) throw new Error("Haftalık değerlendirme kaydedilemedi.");
  return result;
}

export async function loadPremiumWeeklyReviewContext(
  store: LocalDataStore,
  weeklyPlanId: string,
): Promise<PremiumWeeklyReviewContext> {
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) throw new Error("Haftalık değerlendirme için etkin sınıf gereklidir.");
  const weekly = snapshot.plans.find(
    (record) =>
      record.id === weeklyPlanId &&
      record.planType === "weekly" &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  if (!weekly) throw new Error("Değerlendirilecek haftalık plan bulunamadı.");
  const dailyPlans = snapshot.plans.filter(
    (record) =>
      record.planType === "daily" &&
      record.sourceWeeklyPlanId === weekly.id &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope),
  );
  const dailyPlanIds = new Set(dailyPlans.map((record) => record.id));
  const activitiesById = new Map(
    snapshot.activities
      .filter((record) => sameScope(record, scope))
      .map((record) => [record.id, record]),
  );
  const studentsById = new Map(
    snapshot.students
      .filter((record) => sameScope(record, scope))
      .map((record) => [record.id, record]),
  );
  const observations = snapshot.observations
    .filter(
      (record) =>
        typeof record.deletedAt !== "string" &&
        record.rawTextImmutable === true &&
        typeof record.planId === "string" &&
        dailyPlanIds.has(record.planId) &&
        sameScope(record, scope),
    )
    .map((record): PremiumWeeklyReviewObservation => {
      const activity =
        typeof record.activityId === "string"
          ? activitiesById.get(record.activityId)
          : undefined;
      const singleStudentId =
        Array.isArray(record.studentIds) && record.studentIds.length === 1
          ? record.studentIds[0]
          : undefined;
      const student =
        typeof singleStudentId === "string"
          ? studentsById.get(singleStudentId)
          : undefined;
      return projectPremiumWeeklyReviewObservation(record, activity, student);
    })
    .sort((left, right) => left.observedAt.localeCompare(right.observedAt));
  return {
    weeklyPlanId: weekly.id,
    weekId: String(weekly.weekId),
    title: String(weekly.title),
    periodStart: String(weekly.periodStart),
    periodEnd: String(weekly.periodEnd),
    observations,
    evaluations: Array.isArray(weekly.weeklyEvaluations)
      ? (structuredClone(weekly.weeklyEvaluations) as PremiumWeeklyEvaluation[])
      : [],
  };
}
