import { resolveStudentMembershipOn, studentMembershipOverlaps } from "../../core/domain/student-membership.ts";
import {
  civilDateInIstanbul,
  isCivilDate,
} from "../../core/domain/attendance.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import {
  isClassroomSchedule,
  isLocalTime,
} from "../../core/domain/classroom.ts";
import { createEmptySnapshot, type StoredRecord } from "../../core/domain/model.ts";
import {
  assertPedagogicalPlanProvenance,
  bindPedagogicalPlanProvenanceToCivilDate,
  type PedagogicalPlanProvenance,
} from "../../core/domain/pedagogical-plan-provenance.ts";
import {
  isTeacherOwnedPlanRecord,
  type TeacherOwnedWeeklyPlan,
} from "../../core/domain/teacher-owned-plan.ts";
import {
  createTeacherOwnedDailyFlow,
  isTeacherOwnedDailyFlow,
  reviseTeacherOwnedDailyFlow,
  type TeacherOwnedActivityFlowBlockKind,
  type TeacherOwnedDailyFlowBlockEdit,
  type TeacherOwnedDailyFlowBlockDraft,
  type TeacherOwnedDailyFlowTemplateSource,
} from "../../core/domain/teacher-owned-daily-flow.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";
import {
  isCurriculumAssessmentLevel,
  type CurriculumAssessmentLevel,
  type CurriculumAssignmentMode,
  type CurriculumTargetSnapshot,
  type PlannedCurriculumAssignment,
} from "../curriculum/curriculum-catalog.ts";
import type { TymmHolisticLearningOutcomeReference } from "../curriculum/tymm-holistic-graph.ts";
import {
  parsePremiumLensPreferenceRecord,
  premiumDailyFlowSnapshot,
  samePremiumLensPreference,
  type PremiumDailyFlowBlockDraft,
  type PremiumDailyTemplateSelection,
} from "../premium-plans/domain.ts";
import { parsePedagogicalRawObservationText } from "../values/value-plan-models.ts";
import {
  resolveLocalTeacherIdentity,
} from "./local-teacher-identity.ts";
import { scheduledPlanIntegrityIssue } from "../planning/scheduled-plan-workspace.ts";
import { isAuthenticSpontaneousObservationActivity } from "./spontaneous-observation-integrity.ts";
import { academicYearEffectiveOperationalStart } from "../../core/domain/academic-year-operational.ts";

export {
  LOCAL_TEACHER_IDENTITY_SETTING_ID,
  LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
} from "./local-teacher-identity.ts";

export const CURRICULUM_PROGRAM_LABELS = {
  tymm: "Türkiye Yüzyılı Maarif Modeli",
  meb_2024: "Millî Eğitim Bakanlığı 2024 Okul Öncesi Eğitim Programı",
} as const;

export type CurriculumFramework = keyof typeof CURRICULUM_PROGRAM_LABELS;

export type CurriculumProfileOrigin = "teacher-declared" | "official-catalog";

export interface CurriculumProfileInput {
  framework: CurriculumFramework;
  programLabel: (typeof CURRICULUM_PROGRAM_LABELS)[CurriculumFramework];
  catalogId: string;
  sourceVersion: string;
  referenceOrigin?: CurriculumProfileOrigin;
  officialCatalogVerified?: boolean;
}

export interface CurriculumProfileSnapshot extends CurriculumProfileInput {
  referenceOrigin: CurriculumProfileOrigin;
  officialCatalogVerified: boolean;
}

export interface TeacherConfirmedCurriculumLink {
  id: string;
  framework: CurriculumFramework;
  programLabel: (typeof CURRICULUM_PROGRAM_LABELS)[CurriculumFramework];
  catalogId: string;
  sourceVersion: string;
  referenceCode: string;
  referenceTitle: string;
  confirmedAt: string;
  approvedByUserId: string;
  confirmationMethod: "teacher-confirmed";
  referenceOrigin: CurriculumProfileOrigin;
  officialCatalogVerified: boolean;
}

export interface PlanActivityResult {
  plan: StoredRecord;
  activity: StoredRecord;
}

export interface ExpectedTeacherOwnedDailyLineage {
  annualPlanId: string;
  monthlyPlanId: string;
  weeklyPlanId: string;
  expectedAnnualUpdatedAt: string;
  expectedMonthlyUpdatedAt: string;
  expectedWeeklyUpdatedAt: string;
}

export interface CapturedEvidenceResult {
  observation: StoredRecord;
}

export interface AssessmentDraftResult {
  draft: StoredRecord;
}

export interface UpdateScheduledPlanCommand {
  planId: string;
  activityId: string;
  expectedPlanUpdatedAt: string;
  expectedActivityUpdatedAt: string;
  civilDate: string;
  planTitle: string;
  activityTitle: string;
  startTime: string;
  endTime?: string;
  premiumDailyFlowBlocks?: readonly PremiumDailyFlowBlockDraft[];
  teacherOwnedDailyFlowBlocks?: readonly TeacherOwnedDailyFlowBlockEdit[];
  teacherOwnedActivityBlockKind?: TeacherOwnedActivityFlowBlockKind;
  now?: Date;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} boş bırakılamaz.`);
  return normalized;
}

function validUuid(value: string | undefined, fieldName: string): string {
  const id = value ?? crypto.randomUUID();
  if (!UUID_PATTERN.test(id)) throw new Error(`${fieldName} kimliği geçersiz.`);
  return id;
}

function validUtc(value: string, fieldName: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`${fieldName} UTC ISO biçiminde olmalıdır.`);
  }
  return value;
}

export function normalizeCurriculumProfile(
  profile: CurriculumProfileInput,
): CurriculumProfileSnapshot {
  if (
    profile.framework !== "tymm" &&
    profile.framework !== "meb_2024"
  ) {
    throw new Error("Program çerçevesi TYMM veya MEB 2024 olmalıdır.");
  }
  if (profile.programLabel !== CURRICULUM_PROGRAM_LABELS[profile.framework]) {
    throw new Error("Program adı seçilen çerçevenin doğrulanmış etiketiyle uyuşmuyor.");
  }
  const referenceOrigin = profile.referenceOrigin ?? "teacher-declared";
  if (referenceOrigin !== "teacher-declared" && referenceOrigin !== "official-catalog") {
    throw new Error("Program profilinin kaynak türü geçersiz.");
  }
  const officialCatalogVerified = profile.officialCatalogVerified === true;
  if (officialCatalogVerified && referenceOrigin !== "official-catalog") {
    throw new Error("Yalnız resmî katalog kaynağı doğrulanmış olarak işaretlenebilir.");
  }
  return {
    framework: profile.framework,
    programLabel: profile.programLabel,
    catalogId: requiredText(profile.catalogId, "Program katalog kimliği"),
    sourceVersion: requiredText(profile.sourceVersion, "Program kaynak sürümü"),
    referenceOrigin,
    officialCatalogVerified,
  };
}

function sameCurriculumProfile(
  left: CurriculumProfileSnapshot,
  right: CurriculumProfileSnapshot,
): boolean {
  return (
    left.framework === right.framework &&
    left.programLabel === right.programLabel &&
    left.catalogId === right.catalogId &&
    left.sourceVersion === right.sourceVersion &&
    left.referenceOrigin === right.referenceOrigin &&
    left.officialCatalogVerified === right.officialCatalogVerified
  );
}

function sameCurriculumProgramSource(
  left: CurriculumProfileSnapshot,
  right: CurriculumProfileSnapshot,
): boolean {
  return (
    left.framework === right.framework &&
    left.programLabel === right.programLabel &&
    left.catalogId === right.catalogId &&
    left.sourceVersion === right.sourceVersion
  );
}

function curriculumProfileFromUnknown(value: unknown): CurriculumProfileSnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  try {
    return normalizeCurriculumProfile(value as CurriculumProfileInput);
  } catch {
    return null;
  }
}

function normalizeCurriculumTargets(
  targets: readonly CurriculumTargetSnapshot[],
  profile: CurriculumProfileSnapshot,
): CurriculumTargetSnapshot[] {
  if (targets.length === 0) {
    throw new Error("Plan için en az bir program hedefi seçilmelidir.");
  }
  const uniqueIds = new Set<string>();
  return targets.map((target) => {
    if (
      !target.id.trim() ||
      !target.referenceCode.trim() ||
      !target.referenceTitle.trim() ||
      !target.kind.trim() ||
      !target.domain.trim() ||
      !target.sourceUrl.trim() ||
      !target.sourceLabel.trim() ||
      !isCivilDate(target.sourceCheckedOn) ||
      (target.catalogCompleteness !== "partial" &&
        target.catalogCompleteness !== "complete") ||
      (target.verificationStatus !== "official-source-checked" &&
        target.verificationStatus !== "teacher-declared-unverified")
    ) {
      throw new Error("Seçilen program hedefinin kaynak veya başlık bilgisi eksik.");
    }
    if (
      target.framework === "tymm" &&
      target.catalogCompleteness === "complete" &&
      target.verificationStatus === "official-source-checked" &&
      target.officialCatalogVerified &&
      (!Number.isInteger(target.sourcePage) ||
        Number(target.sourcePage) < 1 ||
        typeof target.sourceSha256 !== "string" ||
        !/^sha256:[0-9a-f]{64}$/u.test(target.sourceSha256) ||
        !Array.isArray(target.ageBands) ||
        target.ageBands.length !== 1)
    ) {
      throw new Error(
        "Resmî TYMM hedefinin yaş bandı, kaynak sayfası veya PDF özeti eksik.",
      );
    }
    if (uniqueIds.has(target.id)) {
      throw new Error("Aynı program hedefi bir plana birden fazla eklenemez.");
    }
    uniqueIds.add(target.id);
    if (
      target.framework !== profile.framework ||
      target.catalogId !== profile.catalogId ||
      target.sourceVersion !== profile.sourceVersion ||
      target.referenceOrigin !== profile.referenceOrigin ||
      target.officialCatalogVerified !== profile.officialCatalogVerified
    ) {
      throw new Error(
        "Seçilen program hedefi aktif sınıfın program, katalog ve kaynak sürümüyle uyuşmuyor.",
      );
    }
    if (
      profile.officialCatalogVerified &&
      target.verificationStatus !== "official-source-checked"
    ) {
      throw new Error("Doğrulanmış katalog hedefinin resmî kaynak kontrolü eksik.");
    }
    return {
      ...target,
      id: target.id.trim(),
      referenceCode: target.referenceCode.trim(),
      referenceTitle: target.referenceTitle.trim(),
      domain: target.domain.trim(),
      sourceUrl: target.sourceUrl.trim(),
      sourceLabel: target.sourceLabel.trim(),
      ...(target.parentCode?.trim()
        ? { parentCode: target.parentCode.trim() }
        : {}),
    };
  });
}

function activeStudentIdsForScope(
  students: readonly StoredRecord[],
  scope: ActiveClassroomScope,
  civilDate: string,
  academicYear: StoredRecord,
): string[] {
  return students
    .filter(
      (record) =>
        typeof record.deletedAt !== "string" &&
        record.enrollmentStatus !== "left" &&
        record.enrollmentStatus !== "completed" &&
        record.enrollmentStatus !== "transferred" &&
        sameScope(record, scope) && resolveStudentMembershipOn(record, { ...scope, civilDate, academicYear }).eligible,
    )
    .map((record) => record.id)
    .sort((left, right) => left.localeCompare(right));
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
    throw new Error("Bu işlem için etkin ve arşivlenmemiş bir sınıf gereklidir.");
  }
  return scope;
}

function sameScope(record: StoredRecord, scope: ActiveClassroomScope): boolean {
  return recordBelongsToClassroomScope(record, scope);
}

function cloneHolisticGraphReference(
  reference: TymmHolisticLearningOutcomeReference,
): TymmHolisticLearningOutcomeReference {
  return Object.freeze({
    ...reference,
    relatedNodeIds: Object.freeze([...reference.relatedNodeIds]),
  });
}

async function attachCanonicalHolisticGraphReferences(
  targets: readonly CurriculumTargetSnapshot[],
): Promise<CurriculumTargetSnapshot[]> {
  const needsGraph = targets.some(
    (target) =>
      target.framework === "tymm" &&
      target.kind === "learning-outcome" &&
      target.catalogCompleteness === "complete" &&
      target.verificationStatus === "official-source-checked" &&
      target.officialCatalogVerified === true &&
      Array.isArray(target.ageBands) &&
      target.ageBands.length === 1,
  );
  if (!needsGraph) {
    return targets.map(({ holisticGraphReference: _ignored, ...target }) => ({
      ...target,
    }));
  }

  const { createTymmHolisticLearningOutcomeReference } = await import(
    "../curriculum/tymm-holistic-graph.ts"
  );
  return targets.map(({ holisticGraphReference: _ignored, ...target }) => {
    if (
      target.framework !== "tymm" ||
      target.kind !== "learning-outcome" ||
      target.catalogCompleteness !== "complete" ||
      target.verificationStatus !== "official-source-checked" ||
      target.officialCatalogVerified !== true ||
      !Array.isArray(target.ageBands) ||
      target.ageBands.length !== 1
    ) {
      return { ...target };
    }
    const reference = createTymmHolisticLearningOutcomeReference(
      target.ageBands[0],
      target.referenceCode,
    );
    if (!reference) {
      throw new Error(
        "Resmî TYMM öğrenme çıktısının bütüncül program grafiği bağlantısı bulunamadı.",
      );
    }
    return {
      ...target,
      holisticGraphReference: cloneHolisticGraphReference(reference),
    };
  });
}

function sameCanonicalSnapshot(left: unknown, right: unknown): boolean {
  try {
    return canonicalJson(left) === canonicalJson(right);
  } catch {
    return false;
  }
}

function snapshotById(candidates: unknown, id: string): unknown | null {
  if (!Array.isArray(candidates)) return null;
  return candidates.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      "id" in candidate &&
      candidate.id === id,
  ) ?? null;
}

type TeacherOwnedDailyLineage = {
  annualPlanId: string;
  monthlyPlanId: string;
  weeklyPlanId: string;
};

function resolveTeacherOwnedDailyLineage(
  plans: readonly StoredRecord[],
  scope: ActiveClassroomScope,
  civilDate: string,
): TeacherOwnedDailyLineage | null {
  const matchingWeeks = plans.filter(
    (record): record is TeacherOwnedWeeklyPlan =>
      isTeacherOwnedPlanRecord(record) &&
      record.planType === "weekly" &&
      typeof record.deletedAt !== "string" &&
      sameScope(record, scope) &&
      record.periodStart <= civilDate &&
      record.periodEnd >= civilDate,
  );
  if (matchingWeeks.length === 0) return null;
  if (matchingWeeks.length !== 1) {
    throw new Error(
      "Bu gün birden fazla öğretmen haftalık planına düşüyor; çakışma incelenmeden günlük plan oluşturulamaz.",
    );
  }

  const weekly = matchingWeeks[0];
  const monthly = plans.find((record) => record.id === weekly.monthlyPlanId);
  const annual = plans.find((record) => record.id === weekly.annualPlanId);
  if (
    !monthly ||
    !annual ||
    !isTeacherOwnedPlanRecord(monthly) ||
    monthly.planType !== "monthly" ||
    !isTeacherOwnedPlanRecord(annual) ||
    annual.planType !== "annual" ||
    monthly.annualPlanId !== annual.id ||
    !annual.monthlySectionIds.includes(monthly.id) ||
    !monthly.weeklySectionIds.includes(weekly.id) ||
    !sameScope(monthly, scope) ||
    !sameScope(annual, scope) ||
    weekly.periodStart < monthly.periodStart ||
    weekly.periodEnd > monthly.periodEnd ||
    monthly.periodStart < annual.periodStart ||
    monthly.periodEnd > annual.periodEnd
  ) {
    throw new Error(
      "Günlük planın öğretmene ait yıl, ay ve hafta kaynak zinciri doğrulanamadı.",
    );
  }
  return {
    annualPlanId: annual.id,
    monthlyPlanId: monthly.id,
    weeklyPlanId: weekly.id,
  };
}

export async function createPlanWithActivity(
  store: LocalDataStore,
  input: {
    civilDate: string;
    planId?: string;
    planTitle: string;
    activityId?: string;
    activityTitle: string;
    startTime: string;
    endTime?: string;
    curriculumProfile: CurriculumProfileInput;
    curriculumTargets: CurriculumTargetSnapshot[];
    assignmentMode: CurriculumAssignmentMode;
    studentIds: string[];
    premiumSource?: PremiumDailyTemplateSelection;
    premiumDailyFlowBlocks?: readonly PremiumDailyFlowBlockDraft[];
    teacherOwnedDailyFlowBlocks?: readonly TeacherOwnedDailyFlowBlockDraft[];
    teacherOwnedActivityBlockKind?: TeacherOwnedActivityFlowBlockKind;
    teacherOwnedDailyFlowTemplateSource?: TeacherOwnedDailyFlowTemplateSource;
    pedagogicalProvenance?: PedagogicalPlanProvenance;
    premiumAlternativeActivated?: boolean;
    expectedTeacherOwnedLineage?: ExpectedTeacherOwnedDailyLineage;
    initialActivityStatus?: "planned" | "in_progress";
    now?: Date;
  },
): Promise<PlanActivityResult> {
  if (!isCivilDate(input.civilDate)) {
    throw new Error("Plan günü YYYY-AA-GG biçiminde olmalıdır.");
  }
  if (!isLocalTime(input.startTime) || (input.endTime && !isLocalTime(input.endTime))) {
    throw new Error("Etkinlik saatleri SS:DD biçiminde olmalıdır.");
  }
  if (input.endTime && input.startTime >= input.endTime) {
    throw new Error("Etkinlik bitiş saati başlangıç saatinden sonra olmalıdır.");
  }
  if (
    input.initialActivityStatus !== undefined &&
    input.initialActivityStatus !== "planned" &&
    input.initialActivityStatus !== "in_progress"
  ) {
    throw new Error("İlk etkinlik durumu planlandı veya devam ediyor olmalıdır.");
  }
  if (input.premiumSource && input.teacherOwnedDailyFlowBlocks !== undefined) {
    throw new Error(
      "Öğretmenin günlük akışı premium sağlayıcı planıyla birleştirilemez.",
    );
  }
  const initialActivityStatus = input.initialActivityStatus ?? "planned";
  const expectedTeacherOwnedLineage = input.expectedTeacherOwnedLineage;
  if (expectedTeacherOwnedLineage) {
    validUuid(expectedTeacherOwnedLineage.annualPlanId, "Beklenen yıllık plan");
    validUuid(expectedTeacherOwnedLineage.monthlyPlanId, "Beklenen aylık plan");
    validUuid(expectedTeacherOwnedLineage.weeklyPlanId, "Beklenen haftalık plan");
    validUtc(
      expectedTeacherOwnedLineage.expectedAnnualUpdatedAt,
      "Beklenen yıllık plan güncelleme zamanı",
    );
    validUtc(
      expectedTeacherOwnedLineage.expectedMonthlyUpdatedAt,
      "Beklenen aylık plan güncelleme zamanı",
    );
    validUtc(
      expectedTeacherOwnedLineage.expectedWeeklyUpdatedAt,
      "Beklenen haftalık plan güncelleme zamanı",
    );
  }
  const planId = validUuid(input.planId, "Plan");
  const activityId = validUuid(input.activityId, "Etkinlik");
  const profile = normalizeCurriculumProfile(input.curriculumProfile);
  const curriculumTargets = await attachCanonicalHolisticGraphReferences(
    normalizeCurriculumTargets(input.curriculumTargets, profile),
  );
  if (
    input.assignmentMode !== "whole-class" &&
    input.assignmentMode !== "selected-students"
  ) {
    throw new Error("Öğrenci dağıtım biçimi tüm sınıf veya seçili çocuklar olmalıdır.");
  }
  const requestedStudentIds = [
    ...new Set(input.studentIds.map((id) => validUuid(id, "Öğrenci"))),
  ];
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kayıt zamanı gerekli.");
  const timestamp = now.toISOString();
  const pedagogicalProvenance = input.pedagogicalProvenance
    ? bindPedagogicalPlanProvenanceToCivilDate(
        input.pedagogicalProvenance,
        input.civilDate,
      )
    : undefined;
  let result: PlanActivityResult | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "students",
      "plans",
      "activities",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [academicYears, classrooms, students, plans, activities] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("classrooms"),
        transaction.getAll("students"),
        transaction.getAll("plans"),
        transaction.getAll("activities"),
      ]);
      const academicYear = academicYears.find(
        (record) => record.id === scope.academicYearId,
      );
      if (
        !academicYear ||
        !isCivilDate(academicYear.startDate) ||
        !isCivilDate(academicYear.endDate) ||
        input.civilDate <
          academicYearEffectiveOperationalStart({
            startDate: academicYear.startDate,
            operationalStartDate:
              typeof academicYear.operationalStartDate === "string"
                ? academicYear.operationalStartDate
                : undefined,
          }) ||
        input.civilDate > academicYear.endDate
      ) {
        throw new Error("Plan günü aktif eğitim yılının tarih aralığında olmalıdır.");
      }
      const classroom = classrooms.find((record) => record.id === scope.classroomId);
      const classroomProfile = curriculumProfileFromUnknown(
        classroom?.curriculumProfileSnapshot,
      );
      if (!classroomProfile) {
        throw new Error(
          "Plan oluşturmadan önce sınıf ayarlarında program katalog kimliği ve kaynak sürümü tamamlanmalıdır.",
        );
      }
      if (!sameCurriculumProfile(classroomProfile, profile)) {
        throw new Error("Plan program profili aktif sınıfın kayıtlı program profiliyle uyuşmuyor.");
      }
      if (plans.some((record) => record.id === planId)) {
        throw new Error("Bu plan kimliği zaten kullanılıyor.");
      }
      if (activities.some((record) => record.id === activityId)) {
        throw new Error("Bu etkinlik kimliği zaten kullanılıyor.");
      }
      if (
        initialActivityStatus === "in_progress" &&
        activities.some(
          (record) =>
            record.status === "in_progress" &&
            !isAuthenticSpontaneousObservationActivity(
              record,
              plans,
              scope,
              input.civilDate,
            ) &&
            record.civilDate === input.civilDate &&
            typeof record.deletedAt !== "string" &&
            sameScope(record, scope),
        )
      ) {
        throw new Error(
          "Bu gün için başka bir etkinlik devam ediyor; önce onu tamamlayın.",
        );
      }
      if (input.premiumSource) {
        const premiumSource = input.premiumSource;
        const annual = plans.find(
          (record) =>
            record.id === premiumSource.annualPlanId &&
            record.planType === "annual" &&
            typeof record.deletedAt !== "string" &&
            sameScope(record, scope),
        );
        const monthly = plans.find(
          (record) =>
            record.id === premiumSource.monthlyPlanId &&
            record.planType === "monthly" &&
            typeof record.deletedAt !== "string" &&
            sameScope(record, scope),
        );
        const weekly = plans.find(
          (record) =>
            record.id === premiumSource.weeklyPlanId &&
            record.planType === "weekly" &&
            typeof record.deletedAt !== "string" &&
            sameScope(record, scope),
        );
        let lensPreferencesMatch = false;
        if (annual && monthly && weekly) {
          try {
            const sourceLensPreference = parsePremiumLensPreferenceRecord(
              premiumSource as unknown as Record<string, unknown>,
              "Premium günlük seçim",
            );
            const annualLensPreference = parsePremiumLensPreferenceRecord(
              annual,
              "Premium yıllık plan",
            );
            const monthlyLensPreference = parsePremiumLensPreferenceRecord(
              monthly,
              "Premium aylık plan",
            );
            const weeklyLensPreference = parsePremiumLensPreferenceRecord(
              weekly,
              "Premium haftalık plan",
            );
            lensPreferencesMatch =
              samePremiumLensPreference(
                sourceLensPreference,
                annualLensPreference,
              ) &&
              samePremiumLensPreference(
                sourceLensPreference,
                monthlyLensPreference,
              ) &&
              samePremiumLensPreference(
                sourceLensPreference,
                weeklyLensPreference,
              );
          } catch {
            lensPreferencesMatch = false;
          }
        }
        const storedWeeklyTemplate = snapshotById(
          weekly?.premiumActivityTemplates,
          premiumSource.activityTemplateId,
        );
        const storedWeeklyAlternativeTemplate = snapshotById(
          weekly?.premiumActivityTemplates,
          premiumSource.alternativeActivitySnapshot.id,
        );
        const storedMonthlyTemplate = snapshotById(
          monthly?.premiumActivityTemplates,
          premiumSource.activityTemplateId,
        );
        const storedMonthlyAlternativeTemplate = snapshotById(
          monthly?.premiumActivityTemplates,
          premiumSource.alternativeActivitySnapshot.id,
        );
        const storedMonthlyWeek = snapshotById(
          monthly?.premiumWeeks,
          premiumSource.weekSnapshot.id,
        );
        const weekActivityIds = Array.isArray(premiumSource.weekSnapshot.activityIds)
          ? premiumSource.weekSnapshot.activityIds
          : [];
        const weekMainActivityIds = Array.isArray(
          premiumSource.weekSnapshot.mainActivityIds,
        )
          ? premiumSource.weekSnapshot.mainActivityIds
          : [];
        if (
          !annual ||
          !monthly ||
          !weekly ||
          !lensPreferencesMatch ||
          monthly.annualPlanId !== annual.id ||
          weekly.annualPlanId !== annual.id ||
          weekly.monthlyPlanId !== monthly.id ||
          annual.contentPackId !== input.premiumSource.contentPack.id ||
          annual.contentPackVersion !== input.premiumSource.contentPack.version ||
          monthly.contentPackId !== annual.contentPackId ||
          monthly.contentPackVersion !== annual.contentPackVersion ||
          weekly.contentPackId !== annual.contentPackId ||
          weekly.contentPackVersion !== annual.contentPackVersion ||
          input.civilDate < String(weekly.periodStart) ||
          input.civilDate > String(weekly.periodEnd) ||
          !sameCanonicalSnapshot(annual.contentPackSnapshot, premiumSource.contentPack) ||
          !sameCanonicalSnapshot(monthly.contentPackSnapshot, premiumSource.contentPack) ||
          !sameCanonicalSnapshot(weekly.contentPackSnapshot, premiumSource.contentPack) ||
          premiumSource.weekSnapshot.id !== weekly.weekId ||
          !sameCanonicalSnapshot(weekly.premiumWeekSnapshot, premiumSource.weekSnapshot) ||
          !storedMonthlyWeek ||
          !sameCanonicalSnapshot(storedMonthlyWeek, premiumSource.weekSnapshot) ||
          !sameCanonicalSnapshot(monthly.premiumFullDayFlow, premiumSource.fullDayFlow) ||
          premiumSource.activitySnapshot.id !== premiumSource.activityTemplateId ||
          premiumSource.activitySnapshot.activityRole !== "main" ||
          premiumSource.activitySnapshot.weekId !== premiumSource.weekSnapshot.id ||
          premiumSource.alternativeActivitySnapshot.activityRole !== "alternative" ||
          premiumSource.alternativeActivitySnapshot.weekId !==
            premiumSource.weekSnapshot.id ||
          premiumSource.activitySnapshot.id ===
            premiumSource.alternativeActivitySnapshot.id ||
          premiumSource.weekSnapshot.alternativeActivityId !==
            premiumSource.alternativeActivitySnapshot.id ||
          !weekActivityIds.includes(premiumSource.activitySnapshot.id) ||
          !weekActivityIds.includes(premiumSource.alternativeActivitySnapshot.id) ||
          !weekMainActivityIds.includes(premiumSource.activitySnapshot.id) ||
          weekMainActivityIds.includes(premiumSource.alternativeActivitySnapshot.id) ||
          !storedWeeklyTemplate ||
          !sameCanonicalSnapshot(storedWeeklyTemplate, premiumSource.activitySnapshot) ||
          !storedWeeklyAlternativeTemplate ||
          !sameCanonicalSnapshot(
            storedWeeklyAlternativeTemplate,
            premiumSource.alternativeActivitySnapshot,
          ) ||
          !storedMonthlyTemplate ||
          !sameCanonicalSnapshot(storedMonthlyTemplate, premiumSource.activitySnapshot) ||
          !storedMonthlyAlternativeTemplate ||
          !sameCanonicalSnapshot(
            storedMonthlyAlternativeTemplate,
            premiumSource.alternativeActivitySnapshot,
          )
        ) {
          throw new Error(
            "Premium etkinlik yalnız aynı sınıfa kurulmuş yıllık, aylık ve haftalık kaynak zincirinden kullanılabilir.",
          );
        }
      }
      const teacherOwnedLineage = input.premiumSource
        ? null
        : resolveTeacherOwnedDailyLineage(plans, scope, input.civilDate);
      if (expectedTeacherOwnedLineage) {
        const expectedAnnual = plans.find(
          (record) => record.id === expectedTeacherOwnedLineage.annualPlanId,
        );
        const expectedMonthly = plans.find(
          (record) => record.id === expectedTeacherOwnedLineage.monthlyPlanId,
        );
        const expectedWeekly = plans.find(
          (record) => record.id === expectedTeacherOwnedLineage.weeklyPlanId,
        );
        if (
          !teacherOwnedLineage ||
          teacherOwnedLineage.annualPlanId !== expectedTeacherOwnedLineage.annualPlanId ||
          teacherOwnedLineage.monthlyPlanId !== expectedTeacherOwnedLineage.monthlyPlanId ||
          teacherOwnedLineage.weeklyPlanId !== expectedTeacherOwnedLineage.weeklyPlanId ||
          expectedAnnual?.updatedAt !== expectedTeacherOwnedLineage.expectedAnnualUpdatedAt ||
          expectedMonthly?.updatedAt !== expectedTeacherOwnedLineage.expectedMonthlyUpdatedAt ||
          expectedWeekly?.updatedAt !== expectedTeacherOwnedLineage.expectedWeeklyUpdatedAt
        ) {
          throw new Error(
            "Plan zinciri seçimden sonra değişti; günlük plan son sürüm yüklenmeden kaydedilmedi.",
          );
        }
        if (
          Date.parse(timestamp) <= Date.parse(expectedTeacherOwnedLineage.expectedAnnualUpdatedAt) ||
          Date.parse(timestamp) <= Date.parse(expectedTeacherOwnedLineage.expectedMonthlyUpdatedAt) ||
          Date.parse(timestamp) <= Date.parse(expectedTeacherOwnedLineage.expectedWeeklyUpdatedAt)
        ) {
          throw new Error(
            "Günlük plan kayıt zamanı kaynak planların son güncelleme zamanından sonra olmalıdır.",
          );
        }
        if (
          plans.some(
            (record) =>
              record.planType === "daily" &&
              record.civilDate === input.civilDate &&
              typeof record.deletedAt !== "string" &&
              sameScope(record, scope),
          )
        ) {
          throw new Error(
            "Bu gün için günlük plan zaten var; ikinci bir plan oluşturulmadı.",
          );
        }
      }
      if (
        input.teacherOwnedDailyFlowBlocks !== undefined &&
        !teacherOwnedLineage
      ) {
        throw new Error(
          "Öğretmen günlük akışı yalnız doğrulanmış yıllık, aylık ve haftalık öğretmen planı zincirinde saklanabilir.",
        );
      }
      if (input.teacherOwnedDailyFlowTemplateSource !== undefined && !teacherOwnedLineage) {
        throw new Error(
          "Öğretmen günlük akış şablon kaynağı yalnız doğrulanmış öğretmen plan zincirinde kullanılabilir.",
        );
      }
      let teacherOwnedDailyFlow = null;
      let teacherOwnedFlowBlockId: string | null = null;
      if (teacherOwnedLineage) {
        if (!input.teacherOwnedDailyFlowBlocks || !input.teacherOwnedActivityBlockKind) {
          throw new Error(
            "Öğretmen plan zincirindeki günlük akış, 10 bölüm ve gerçek etkinliğin uygulanacağı bölüm öğretmen tarafından gözden geçirilmeden kaydedilemez.",
          );
        }
        if (!isClassroomSchedule(classroom?.schedule)) {
          throw new Error(
            "Öğretmen günlük akışı için sınıfın başlangıç ve bitiş saatleri tamamlanmalıdır.",
          );
        }
        if (input.teacherOwnedDailyFlowTemplateSource) {
          const source = input.teacherOwnedDailyFlowTemplateSource;
          const sourcePlan = plans.find(
            (plan) =>
              plan.id === source.sourcePlanId &&
              plan.planType === "daily" &&
              plan.sourceWeeklyPlanId === teacherOwnedLineage.weeklyPlanId &&
              plan.sourceWeeklyPlanId === source.sourceWeeklyPlanId &&
              plan.civilDate === source.sourceCivilDate &&
              typeof plan.civilDate === "string" &&
              plan.civilDate < input.civilDate &&
              typeof plan.deletedAt !== "string" &&
              sameScope(plan, scope) &&
              isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow) &&
              plan.teacherOwnedDailyFlow.revisionNumber ===
                source.sourceFlowRevisionNumber,
          );
          if (!sourcePlan) {
            throw new Error(
              "Günlük akış şablonu yalnız aynı haftadaki doğrulanmış önceki öğretmen planından alınabilir.",
            );
          }
        }
        const confirmedByUserId = await resolveLocalTeacherIdentity(transaction, {
          now,
        });
        teacherOwnedDailyFlow = createTeacherOwnedDailyFlow({
          blocks: input.teacherOwnedDailyFlowBlocks,
          schedule: classroom.schedule,
          confirmedByUserId,
          ...(input.teacherOwnedDailyFlowTemplateSource
            ? { templateSource: input.teacherOwnedDailyFlowTemplateSource }
            : {}),
          now,
        });
        const activityFlowBlock = teacherOwnedDailyFlow.blocks.find(
          (block) => block.kind === input.teacherOwnedActivityBlockKind,
        );
        if (!activityFlowBlock || activityFlowBlock.status === "skipped") {
          throw new Error(
            "Gerçek etkinlik yalnız öğretmen akışındaki uygulanacak bir etkinlik bölümüne bağlanabilir.",
          );
        }
        teacherOwnedFlowBlockId = activityFlowBlock.id;
      }
      const activeStudentIds = activeStudentIdsForScope(students, scope, input.civilDate, academicYear);
      const assignedStudentIds =
        input.assignmentMode === "whole-class"
          ? activeStudentIds
          : requestedStudentIds;
      if (assignedStudentIds.length === 0) {
        throw new Error(
          input.assignmentMode === "whole-class"
            ? "Tüm sınıfa dağıtım için etkin sınıfta en az bir çocuk bulunmalıdır."
            : "Seçili çocuklara dağıtım için en az bir çocuk seçilmelidir.",
        );
      }
      const activeStudentIdSet = new Set(activeStudentIds);
      if (assignedStudentIds.some((studentId) => !activeStudentIdSet.has(studentId))) {
        throw new Error(
          "Program hedefleri yalnız etkin sınıftaki aktif çocuklara dağıtılabilir.",
        );
      }
      const assignments: PlannedCurriculumAssignment[] =
        curriculumTargets.flatMap((target) =>
          assignedStudentIds.map((studentId) => ({
            studentId,
            targetId: target.id,
            referenceCode: target.referenceCode,
            status: "planned",
            assignedAt: timestamp,
          })),
        );
      const maarifRefs = curriculumTargets.map((target) => target.referenceCode);
      const appliedPremiumTemplate = input.premiumSource
        ? input.premiumAlternativeActivated
          ? input.premiumSource.alternativeActivitySnapshot
          : input.premiumSource.activitySnapshot
        : null;
      if (input.premiumSource && !appliedPremiumTemplate) {
        throw new Error("Premium günlük plan için uygulanacak etkinlik belirlenmelidir.");
      }
      const plan: StoredRecord = {
        id: planId,
        planType: "daily",
        title: requiredText(input.planTitle, "Plan başlığı"),
        status: "active",
        curriculumProfileSnapshot: profile,
        curriculumTargets,
        maarifRefs,
        studentIds: assignedStudentIds,
        assignmentMode: input.assignmentMode,
        assignmentSnapshotAt: timestamp,
        coverageStatus: "planned",
        ...(input.premiumSource && appliedPremiumTemplate
          ? {
              sourceAnnualPlanId: input.premiumSource.annualPlanId,
              sourceMonthlyPlanId: input.premiumSource.monthlyPlanId,
              sourceWeeklyPlanId: input.premiumSource.weeklyPlanId,
              sourceContentPackSnapshot: structuredClone(input.premiumSource.contentPack),
              sourceActivityTemplateId: input.premiumSource.activityTemplateId,
              sourceActivityTemplateSnapshot: structuredClone(
                input.premiumSource.activitySnapshot,
              ),
              appliedActivityTemplateId: appliedPremiumTemplate.id,
              appliedActivityTemplateSnapshot: structuredClone(appliedPremiumTemplate),
              premiumDailyFlowSnapshot: premiumDailyFlowSnapshot(
                input.premiumSource,
                input.civilDate,
                input.premiumDailyFlowBlocks,
                input.premiumAlternativeActivated === true,
              ),
              teacherPreferredLensId:
                input.premiumSource.teacherPreferredLensId,
              teacherPreferredSupportingLensIds: [
                ...input.premiumSource.teacherPreferredSupportingLensIds,
              ],
              lensSelectionMode: input.premiumSource.lensSelectionMode,
            }
          : {}),
        ...(teacherOwnedLineage
          ? {
              sourceAnnualPlanId: teacherOwnedLineage.annualPlanId,
              sourceMonthlyPlanId: teacherOwnedLineage.monthlyPlanId,
              sourceWeeklyPlanId: teacherOwnedLineage.weeklyPlanId,
              teacherOwnedDailyFlow,
            }
          : {}),
        ...(pedagogicalProvenance
          ? {
              pedagogicalProvenance: structuredClone(
                pedagogicalProvenance,
              ),
            }
          : {}),
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: input.civilDate,
        deletedAt: null,
        schemaVersion: 2,
      };
      const activity: StoredRecord = {
        id: activityId,
        planId,
        title: requiredText(input.activityTitle, "Etkinlik başlığı"),
        startTime: input.startTime,
        ...(input.endTime ? { endTime: input.endTime } : {}),
        status: initialActivityStatus,
        curriculumProfileSnapshot: profile,
        curriculumTargets,
        maarifRefs,
        studentIds: assignedStudentIds,
        assignmentMode: input.assignmentMode,
        assignmentSnapshotAt: timestamp,
        targetAssignments: assignments,
        coverageStatus: "planned",
        ...(input.premiumSource && appliedPremiumTemplate
          ? {
              sourceAnnualPlanId: input.premiumSource.annualPlanId,
              sourceMonthlyPlanId: input.premiumSource.monthlyPlanId,
              sourceWeeklyPlanId: input.premiumSource.weeklyPlanId,
              sourceContentPackSnapshot: structuredClone(input.premiumSource.contentPack),
              sourceActivityTemplateId: input.premiumSource.activityTemplateId,
              sourceActivityTemplateSnapshot: structuredClone(
                input.premiumSource.activitySnapshot,
              ),
              appliedActivityTemplateId: appliedPremiumTemplate.id,
              appliedActivityTemplateSnapshot: structuredClone(appliedPremiumTemplate),
              teacherPreferredLensId:
                input.premiumSource.teacherPreferredLensId,
              teacherPreferredSupportingLensIds: [
                ...input.premiumSource.teacherPreferredSupportingLensIds,
              ],
              lensSelectionMode: input.premiumSource.lensSelectionMode,
            }
          : {}),
        ...(teacherOwnedLineage
          ? {
              sourceAnnualPlanId: teacherOwnedLineage.annualPlanId,
              sourceMonthlyPlanId: teacherOwnedLineage.monthlyPlanId,
              sourceWeeklyPlanId: teacherOwnedLineage.weeklyPlanId,
              teacherOwnedFlowBlockId,
            }
          : {}),
        ...(pedagogicalProvenance
          ? {
              pedagogicalProvenance: structuredClone(
                pedagogicalProvenance,
              ),
            }
          : {}),
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: input.civilDate,
        deletedAt: null,
        schemaVersion: 2,
      };
      await transaction.putMany("plans", [plan]);
      await transaction.putMany("activities", [activity]);
      result = { plan, activity };
    },
  );
  if (!result) throw new Error("Plan ve etkinlik kaydedilemedi.");
  return result;
}

export async function updateScheduledPlanWithActivity(
  store: LocalDataStore,
  input: UpdateScheduledPlanCommand,
): Promise<PlanActivityResult> {
  const planId = validUuid(input.planId, "Plan");
  const activityId = validUuid(input.activityId, "Etkinlik");
  if (!isCivilDate(input.civilDate)) {
    throw new Error("Plan günü YYYY-AA-GG biçiminde olmalıdır.");
  }
  if (!isLocalTime(input.startTime) || (input.endTime && !isLocalTime(input.endTime))) {
    throw new Error("Etkinlik saatleri SS:DD biçiminde olmalıdır.");
  }
  if (input.endTime && input.startTime >= input.endTime) {
    throw new Error("Etkinlik bitiş saati başlangıç saatinden sonra olmalıdır.");
  }
  const planTitle = requiredText(input.planTitle, "Plan başlığı");
  const activityTitle = requiredText(input.activityTitle, "Etkinlik başlığı");
  if (
    Boolean(input.premiumDailyFlowBlocks?.length) &&
    Boolean(input.teacherOwnedDailyFlowBlocks?.length)
  ) {
    throw new Error(
      "Premium akış ile öğretmenin günlük akışı aynı revizyonda birleştirilemez.",
    );
  }
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kayıt zamanı gerekli.");
  const today = civilDateInIstanbul(now);
  const timestamp = now.toISOString();
  let result: PlanActivityResult | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "students",
      "plans",
      "activities",
      "observations",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [academicYears, students, plans, activities, observations] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("students"),
        transaction.getAll("plans"),
        transaction.getAll("activities"),
        transaction.getAll("observations"),
      ]);
      const plan = plans.find(
        (record) =>
          record.id === planId &&
          record.planType === "daily" &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (!plan) {
        throw new Error("Düzenlenecek günlük plan etkin sınıfta bulunamadı.");
      }
      const planActivities = activities.filter(
        (record) =>
          record.planId === plan.id &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      const activity = planActivities.length === 1 && planActivities[0].id === activityId
        ? planActivities[0]
        : null;
      if (!activity) {
        throw new Error("Düzenleme için plana bağlı tek bir gerçek etkinlik bulunmalıdır.");
      }
      if (
        plan.updatedAt !== input.expectedPlanUpdatedAt ||
        activity.updatedAt !== input.expectedActivityUpdatedAt
      ) {
        throw new Error(
          "Plan başka bir ekranda değiştirildi. Güncel kaydı yeniden açıp düzenleyin.",
        );
      }
      if (
        activity.civilDate !== plan.civilDate ||
        Date.parse(plan.updatedAt) > now.getTime() ||
        Date.parse(activity.updatedAt) > now.getTime()
      ) {
        throw new Error(
          activity.civilDate !== plan.civilDate
            ? "Plan ile gerçek etkinliğin kayıtlı tarihleri uyuşmuyor."
            : "Kayıt zamanı planın son değişiklik zamanından eski olamaz.",
        );
      }
      if (
        plan.civilDate <= today ||
        input.civilDate <= today ||
        plan.coverageStatus !== "planned" ||
        activity.status !== "planned"
      ) {
        throw new Error("Yalnız henüz başlamamış gelecek tarihli planlar düzenlenebilir.");
      }
      if (
        observations.some(
          (observation) =>
            typeof observation.deletedAt !== "string" &&
            sameScope(observation, scope) &&
            (observation.planId === plan.id || observation.activityId === activity.id),
        )
      ) {
        throw new Error("Gözlem kanıtı bulunan planlar geriye dönük değiştirilemez.");
      }
      const academicYear = academicYears.find(
        (record) =>
          record.id === scope.academicYearId &&
          typeof record.deletedAt !== "string",
      );
      if (
        !academicYear ||
        !isCivilDate(String(academicYear.startDate)) ||
        !isCivilDate(String(academicYear.endDate)) ||
        input.civilDate <
          academicYearEffectiveOperationalStart({
            startDate: String(academicYear.startDate),
            operationalStartDate:
              typeof academicYear.operationalStartDate === "string"
                ? academicYear.operationalStartDate
                : undefined,
          }) ||
        input.civilDate > String(academicYear.endDate)
      ) {
        throw new Error("Plan günü aktif eğitim yılının tarih aralığında olmalıdır.");
      }
      const assignedIds = Array.isArray(activity.studentIds) ? activity.studentIds : [];
      if (assignedIds.some(id => !students.some(student => student.id === id && resolveStudentMembershipOn(student, { ...scope, academicYear, civilDate: input.civilDate }).eligible))) {
        throw new Error("Planın çocuklarından biri yeni tarihte bu sınıfa kayıtlı değil; tarih veya çocuk kapsamı incelenmeli.");
      }
      const integrityIssue = scheduledPlanIntegrityIssue({
        plan,
        activity,
        plans,
        scope,
      });
      if (integrityIssue) throw new Error(integrityIssue);

      const sourceWeeklyPlan = typeof plan.sourceWeeklyPlanId === "string"
        ? plans.find(
            (record) =>
              record.id === plan.sourceWeeklyPlanId &&
              record.planType === "weekly" &&
              typeof record.deletedAt !== "string" &&
              sameScope(record, scope),
          )
        : null;
      if (
        sourceWeeklyPlan &&
        (input.civilDate < String(sourceWeeklyPlan.periodStart) ||
          input.civilDate > String(sourceWeeklyPlan.periodEnd))
      ) {
        throw new Error("Plan tarihi kayıtlı kaynak haftanın dışına taşınamaz.");
      }

      let premiumDailyFlowSnapshot = plan.premiumDailyFlowSnapshot;
      if (premiumDailyFlowSnapshot !== undefined) {
        if (
          !premiumDailyFlowSnapshot ||
          typeof premiumDailyFlowSnapshot !== "object" ||
          Array.isArray(premiumDailyFlowSnapshot) ||
          !Array.isArray((premiumDailyFlowSnapshot as Record<string, unknown>).blocks) ||
          !input.premiumDailyFlowBlocks
        ) {
          throw new Error("Kayıtlı tam gün akışı düzenleme için doğrulanamadı.");
        }
        const existingBlocks = (premiumDailyFlowSnapshot as Record<string, unknown>)
          .blocks as Array<Record<string, unknown>>;
        if (
          input.premiumDailyFlowBlocks.length !== existingBlocks.length ||
          input.premiumDailyFlowBlocks.some(
            (block, index) =>
              block.id !== existingBlocks[index]?.id ||
              !["planned", "optional", "skipped"].includes(block.status) ||
              !Number.isInteger(block.durationMinutes) ||
              block.durationMinutes < 5 ||
              block.durationMinutes > 240 ||
              typeof block.transitionNote !== "string" ||
              block.transitionNote.length > 500 ||
              typeof block.teacherNote !== "string" ||
              block.teacherNote.length > 1_000,
          )
        ) {
          throw new Error("Tam gün akışındaki öğretmen düzenlemeleri geçersiz.");
        }
        premiumDailyFlowSnapshot = {
          ...(premiumDailyFlowSnapshot as Record<string, unknown>),
          planCivilDate: input.civilDate,
          blocks: existingBlocks.map((block, index) => ({
            ...block,
            status: input.premiumDailyFlowBlocks![index].status,
            durationMinutes: input.premiumDailyFlowBlocks![index].durationMinutes,
            transitionNote: input.premiumDailyFlowBlocks![index].transitionNote.trim(),
            teacherNote: input.premiumDailyFlowBlocks![index].teacherNote.trim(),
          })),
        };
      } else if (input.premiumDailyFlowBlocks?.length) {
        throw new Error("Standart günlük plana premium akış blokları eklenemez.");
      }

      let teacherOwnedDailyFlow = plan.teacherOwnedDailyFlow;
      let teacherOwnedFlowBlockId = activity.teacherOwnedFlowBlockId;
      if (teacherOwnedDailyFlow !== undefined) {
        if (
          !isTeacherOwnedDailyFlow(teacherOwnedDailyFlow) ||
          !input.teacherOwnedDailyFlowBlocks ||
          !input.teacherOwnedActivityBlockKind
        ) {
          throw new Error(
            "Öğretmenin kayıtlı 10 bölümlü günlük akışı düzenleme için doğrulanamadı.",
          );
        }
        const revisedTeacherOwnedDailyFlow = reviseTeacherOwnedDailyFlow(
          teacherOwnedDailyFlow,
          input.teacherOwnedDailyFlowBlocks,
          await resolveLocalTeacherIdentity(transaction, { now }),
          now,
        );
        teacherOwnedDailyFlow = revisedTeacherOwnedDailyFlow;
        const activityFlowBlock = revisedTeacherOwnedDailyFlow.blocks.find(
          (block) => block.kind === input.teacherOwnedActivityBlockKind,
        );
        if (!activityFlowBlock || activityFlowBlock.status === "skipped") {
          throw new Error(
            "Gerçek etkinlik yalnız öğretmen akışındaki uygulanacak bir etkinlik bölümüne bağlanabilir.",
          );
        }
        teacherOwnedFlowBlockId = activityFlowBlock.id;
      } else if (input.teacherOwnedDailyFlowBlocks?.length) {
        throw new Error(
          "Bağımsız günlük plana sonradan öğretmen plan zinciri uydurulamaz.",
        );
      }

      let reboundPedagogicalProvenance: PedagogicalPlanProvenance | undefined;
      if (
        plan.pedagogicalProvenance !== undefined ||
        activity.pedagogicalProvenance !== undefined
      ) {
        assertPedagogicalPlanProvenance(
          plan.pedagogicalProvenance,
          "Planın pedagojik etkinlik kaynağı",
        );
        assertPedagogicalPlanProvenance(
          activity.pedagogicalProvenance,
          "Etkinliğin pedagojik kaynağı",
        );
        if (
          canonicalJson(plan.pedagogicalProvenance) !==
            canonicalJson(activity.pedagogicalProvenance)
        ) {
          throw new Error(
            "Plan ile etkinliğin pedagojik kaynak zinciri uyuşmuyor.",
          );
        }
        reboundPedagogicalProvenance =
          bindPedagogicalPlanProvenanceToCivilDate(
            plan.pedagogicalProvenance,
            input.civilDate,
          );
      }

      const updatedPlan: StoredRecord = {
        ...plan,
        title: planTitle,
        civilDate: input.civilDate,
        updatedAt: timestamp,
        ...(premiumDailyFlowSnapshot !== undefined
          ? { premiumDailyFlowSnapshot }
          : {}),
        ...(teacherOwnedDailyFlow !== undefined
          ? { teacherOwnedDailyFlow }
          : {}),
        ...(reboundPedagogicalProvenance
          ? {
              pedagogicalProvenance: structuredClone(
                reboundPedagogicalProvenance,
              ),
            }
          : {}),
      };
      const updatedActivity: StoredRecord = {
        ...activity,
        title: activityTitle,
        startTime: input.startTime,
        civilDate: input.civilDate,
        updatedAt: timestamp,
        ...(teacherOwnedDailyFlow !== undefined
          ? { teacherOwnedFlowBlockId }
          : {}),
        ...(reboundPedagogicalProvenance
          ? {
              pedagogicalProvenance: structuredClone(
                reboundPedagogicalProvenance,
              ),
            }
          : {}),
      };
      if (input.endTime) updatedActivity.endTime = input.endTime;
      else delete updatedActivity.endTime;

      await transaction.putMany("plans", [updatedPlan]);
      await transaction.putMany("activities", [updatedActivity]);
      result = { plan: updatedPlan, activity: updatedActivity };
    },
  );
  if (!result) throw new Error("Plan ve etkinlik değişiklikleri kaydedilemedi.");
  return result;
}

export async function captureImmutableRawObservation(
  store: LocalDataStore,
  input: {
    observationId?: string;
    studentId: string;
    planId: string;
    activityId: string;
    rawText: string;
    childQuote?: string;
    context?: string;
    observedAt: string;
    now?: Date;
  },
): Promise<CapturedEvidenceResult> {
  const observationId = validUuid(input.observationId, "Gözlem");
  const studentId = validUuid(input.studentId, "Öğrenci");
  const planId = validUuid(input.planId, "Plan");
  const activityId = validUuid(input.activityId, "Etkinlik");
  const observedAt = validUtc(input.observedAt, "Gözlem zamanı");
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kayıt zamanı gerekli.");
  const rawText = parsePedagogicalRawObservationText(input.rawText);
  const childQuote = input.childQuote?.trim()
    ? parsePedagogicalRawObservationText(input.childQuote, "Çocuk sözü")
    : undefined;
  const context = input.context?.trim()
    ? parsePedagogicalRawObservationText(input.context, "Gözlem bağlamı")
    : undefined;
  const timestamp = now.toISOString();
  let observation: StoredRecord | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "students",
      "plans",
      "activities",
      "observations",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [academicYears, students, plans, activities, observations] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("students"),
        transaction.getAll("plans"),
        transaction.getAll("activities"),
        transaction.getAll("observations"),
      ]);
      const student = students.find(
        (record) =>
          record.id === studentId &&
          typeof record.deletedAt !== "string" &&
          record.enrollmentStatus !== "left" &&
          record.enrollmentStatus !== "completed" &&
          record.enrollmentStatus !== "transferred" &&
          sameScope(record, scope),
      );
      if (!student) throw new Error("Gözlem notu yalnız etkin sınıftaki çocuğa bağlanabilir.");
      const academicYear = academicYears.find(record => record.id === scope.academicYearId);
      if (!academicYear || !resolveStudentMembershipOn(student, { ...scope, academicYear, civilDate: civilDateInIstanbul(new Date(observedAt)) }).eligible) {
        throw new Error("Gözlem tarihinde çocuk bu sınıfa kayıtlı değil; üyelik dönemi incelenmeli.");
      }
      const plan = plans.find(
        (record) =>
          record.id === planId &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      const activity = activities.find(
        (record) =>
          record.id === activityId &&
          record.planId === planId &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (!plan || !activity) {
        throw new Error("Gözlemin plan ve etkinlik ilişkisi etkin sınıfla uyuşmuyor.");
      }
      if (
        Array.isArray(activity.studentIds) &&
        activity.studentIds.length > 0 &&
        !activity.studentIds.includes(studentId)
      ) {
        throw new Error(
          "Gözlem yalnız bu etkinlik için planlı takip açılan çocuğa kaydedilebilir.",
        );
      }
      if (observations.some((record) => record.id === observationId)) {
        throw new Error("Gözlem notu kimliği daha önce kullanılmış; kanıtın üzerine yazılamaz.");
      }
      observation = {
        id: observationId,
        studentIds: [studentId],
        planId,
        activityId,
        rawText,
        rawTextImmutable: true,
        ...(childQuote ? { childQuote } : {}),
        ...(context ? { context } : {}),
        observedAt,
        workflowStatus: "captured",
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: civilDateInIstanbul(new Date(observedAt)),
        deletedAt: null,
        schemaVersion: 2,
      };
      await transaction.putMany("observations", [observation]);
    },
  );
  if (!observation) throw new Error("Gözlem notu kaydedilemedi.");
  return { observation };
}

export async function confirmObservationCurriculumLink(
  store: LocalDataStore,
  input: {
    observationId: string;
    framework: CurriculumFramework;
    catalogId: string;
    sourceVersion: string;
    referenceCode: string;
    referenceTitle: string;
    approvedByUserId?: string;
    referenceOrigin?: CurriculumProfileOrigin;
    officialCatalogVerified?: boolean;
    plannedTargetId?: string;
    now?: Date;
  },
): Promise<StoredRecord> {
  const observationId = validUuid(input.observationId, "Gözlem");
  const profile = normalizeCurriculumProfile({
    framework: input.framework,
    programLabel: CURRICULUM_PROGRAM_LABELS[input.framework],
    catalogId: input.catalogId,
    sourceVersion: input.sourceVersion,
    referenceOrigin: input.referenceOrigin,
    officialCatalogVerified: input.officialCatalogVerified,
  });
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir onay zamanı gerekli.");
  const timestamp = now.toISOString();
  const requestedApproverId = input.approvedByUserId
    ? validUuid(input.approvedByUserId, "Onaylayan öğretmen")
    : null;
  let result: StoredRecord | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "plans",
      "activities",
      "observations",
      "evidenceCurriculumLinks",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [plans, activities, observations, links] = await Promise.all([
        transaction.getAll("plans"),
        transaction.getAll("activities"),
        transaction.getAll("observations"),
        transaction.getAll("evidenceCurriculumLinks"),
      ]);
      const observation = observations.find(
        (record) =>
          record.id === observationId &&
          record.rawTextImmutable === true &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (!observation || typeof observation.rawText !== "string") {
        throw new Error("Program bağlantısı kurulacak gözlem notu etkin sınıfta bulunamadı.");
      }
      const plan = plans.find(
        (record) =>
          record.id === observation.planId &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      const planProfile = curriculumProfileFromUnknown(
        plan?.curriculumProfileSnapshot,
      );
      if (!planProfile || !sameCurriculumProgramSource(planProfile, profile)) {
        throw new Error(
          "Program bağlantısı planın doğrulanmış katalog ve program profiliyle uyuşmuyor.",
        );
      }
      const activity = activities.find(
        (record) =>
          record.id === observation.activityId &&
          record.planId === observation.planId &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (!activity) {
        throw new Error("Program bağlantısının etkinlik kaydı bulunamadı.");
      }
      const existingLinks = links.filter(
        (link) => link.observationId === observationId,
      );
      const referenceCode = requiredText(input.referenceCode, "Program referans kodu");
      const referenceTitle = requiredText(
        input.referenceTitle,
        "Program referans başlığı",
      );
      let plannedTarget: CurriculumTargetSnapshot | undefined;
      if (input.plannedTargetId) {
        const activityTargets = Array.isArray(activity.curriculumTargets)
          ? activity.curriculumTargets
          : [];
        plannedTarget = activityTargets.find(
          (candidate): candidate is CurriculumTargetSnapshot =>
            typeof candidate === "object" &&
            candidate !== null &&
            !Array.isArray(candidate) &&
            candidate.id === input.plannedTargetId,
        );
        if (
          !plannedTarget ||
          plannedTarget.referenceCode !== referenceCode ||
          plannedTarget.referenceTitle !== referenceTitle
        ) {
          throw new Error(
            "Program bağlantısı yalnız etkinlikte planlanan hedeflerden seçilebilir.",
          );
        }
      }
      if (!plannedTarget && profile.officialCatalogVerified) {
        throw new Error(
          "Elle yazılan program referansı resmî katalog hedefi olarak işaretlenemez.",
        );
      }
      const referenceOrigin = plannedTarget
        ? plannedTarget.referenceOrigin
        : "teacher-declared";
      const officialCatalogVerified = plannedTarget
        ? plannedTarget.officialCatalogVerified
        : false;
      const approvedByUserId = await resolveLocalTeacherIdentity(transaction, {
        now,
        requestedTeacherUserId: requestedApproverId,
      });
      if (
        existingLinks.some(
          (link) =>
            link.framework === profile.framework &&
            link.sourceVersion === profile.sourceVersion &&
            link.referenceCode === referenceCode &&
            (link.referenceOrigin ?? "teacher-declared") === referenceOrigin &&
            (link.officialCatalogVerified === true) === officialCatalogVerified,
        )
      ) {
        return;
      }
      const link: TeacherConfirmedCurriculumLink = {
        id: crypto.randomUUID(),
        framework: profile.framework,
        programLabel: profile.programLabel,
        catalogId: profile.catalogId,
        sourceVersion: profile.sourceVersion,
        referenceCode,
        referenceTitle,
        confirmedAt: timestamp,
        approvedByUserId,
        confirmationMethod: "teacher-confirmed",
        referenceOrigin,
        officialCatalogVerified,
      };
      result = {
        ...link,
        ...(plannedTarget
          ? {
              plannedTargetId: plannedTarget.id,
              targetKind: plannedTarget.kind,
              targetDomain: plannedTarget.domain,
              targetSourceUrl: plannedTarget.sourceUrl,
              ...(plannedTarget.sourcePage
                ? { targetSourcePage: plannedTarget.sourcePage }
                : {}),
              ...(plannedTarget.sourceSha256
                ? { targetSourceSha256: plannedTarget.sourceSha256 }
                : {}),
              ...(plannedTarget.holisticGraphReference
                ? {
                    holisticGraphReference: cloneHolisticGraphReference(
                      plannedTarget.holisticGraphReference,
                    ),
                  }
                : {}),
            }
          : { targetSourceUrl: "about:blank" }),
        observationId,
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: civilDateInIstanbul(now),
        deletedAt: null,
        schemaVersion: 2,
      };
      await transaction.putMany("evidenceCurriculumLinks", [result]);
    },
  );
  if (result) return result;
  const existing = (await store.readSnapshot()).evidenceCurriculumLinks.find(
    (record) =>
      record.observationId === observationId &&
      record.framework === input.framework &&
      record.catalogId === input.catalogId &&
      record.sourceVersion === input.sourceVersion &&
      record.referenceCode === input.referenceCode.trim(),
  );
  if (!existing) throw new Error("Program bağlantısı kaydedilemedi.");
  return existing;
}

export async function createCitedAssessmentDraft(
  store: LocalDataStore,
  input: {
    draftId?: string;
    studentId: string;
    observationIds: string[];
    teacherAssessmentText: string;
    /** The teacher's save action completes their own authored assessment. */
    completeTeacherAssessment?: boolean;
    assessmentLevel?: CurriculumAssessmentLevel;
    assessmentTargetIds?: string[];
    periodStart: string;
    periodEnd: string;
    now?: Date;
  },
): Promise<AssessmentDraftResult> {
  const draftId = validUuid(input.draftId, "Değerlendirme taslağı");
  const studentId = validUuid(input.studentId, "Öğrenci");
  if (!isCivilDate(input.periodStart) || !isCivilDate(input.periodEnd)) {
    throw new Error("Değerlendirme dönemi YYYY-AA-GG biçiminde olmalıdır.");
  }
  if (input.periodStart > input.periodEnd) {
    throw new Error("Değerlendirme dönemi başlangıcı bitişten sonra olamaz.");
  }
  if (input.observationIds.length === 0) {
    throw new Error("Değerlendirme taslağı en az bir gözlem notuna dayanmalıdır.");
  }
  const observationIds = [...new Set(
    input.observationIds.map((id) => validUuid(id, "Gözlem")),
  )];
  const assessmentLevel = input.assessmentLevel ?? "not_assessed";
  if (!isCurriculumAssessmentLevel(assessmentLevel)) {
    throw new Error("Değerlendirme düzeyi geçersiz.");
  }
  const assessmentTargetIds = [
    ...new Set(
      (input.assessmentTargetIds ?? []).map((targetId) =>
        requiredText(targetId, "Program hedefi"),
      ),
    ),
  ];
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir taslak zamanı gerekli.");
  const timestamp = now.toISOString();
  let draft: StoredRecord | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "students",
      "observations",
      "evidenceCurriculumLinks",
      "reportDrafts",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [academicYears, students, observations, links, reportDrafts] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("students"),
        transaction.getAll("observations"),
        transaction.getAll("evidenceCurriculumLinks"),
        transaction.getAll("reportDrafts"),
      ]);
      const academicYear = academicYears.find(
        (record) => record.id === scope.academicYearId,
      );
      if (
        !academicYear ||
        !isCivilDate(academicYear.startDate) ||
        !isCivilDate(academicYear.endDate) ||
        input.periodStart <
          academicYearEffectiveOperationalStart({
            startDate: academicYear.startDate,
            operationalStartDate:
              typeof academicYear.operationalStartDate === "string"
                ? academicYear.operationalStartDate
                : undefined,
          }) ||
        input.periodEnd > academicYear.endDate
      ) {
        throw new Error("Değerlendirme dönemi aktif eğitim yılının tarih aralığında olmalıdır.");
      }
      const student = students.find(
        (record) =>
          record.id === studentId &&
          typeof record.deletedAt !== "string" &&
          record.enrollmentStatus !== "left" &&
          record.enrollmentStatus !== "completed" &&
          record.enrollmentStatus !== "transferred" &&
          sameScope(record, scope),
      );
      if (!student) {
        throw new Error("Değerlendirme yalnız etkin sınıftaki çocuk için hazırlanabilir.");
      }
      if (!studentMembershipOverlaps(student, { ...scope, academicYear, periodStart: input.periodStart, periodEnd: input.periodEnd })) throw new Error("Değerlendirme döneminde çocuğun sınıf üyeliği yok.");
      if (reportDrafts.some((record) => record.id === draftId)) {
        throw new Error("Bu değerlendirme taslağı kimliği zaten kullanılıyor.");
      }
      const selected = observationIds.map((id) =>
        observations.find(
          (record) =>
            record.id === id && resolveStudentMembershipOn(student, { ...scope, academicYear, civilDate: record.civilDate }).eligible &&
            record.rawTextImmutable === true &&
            typeof record.deletedAt !== "string" &&
            sameScope(record, scope) &&
            Array.isArray(record.studentIds) &&
            record.studentIds.includes(studentId),
        ),
      );
      if (selected.some((record) => record === undefined)) {
        throw new Error("Seçilen gözlemlerden biri çocuk veya sınıf kapsamıyla uyuşmuyor.");
      }
      if (
        selected.some(
          (record) =>
            typeof record?.civilDate !== "string" ||
            record.civilDate < input.periodStart ||
            record.civilDate > input.periodEnd,
        )
      ) {
        throw new Error("Seçilen gözlemler değerlendirme tarih aralığında olmalıdır.");
      }
      const selectedLinks = observationIds.map((observationId) =>
        links.filter(
          (link) =>
            link.observationId === observationId &&
            link.confirmationMethod === "teacher-confirmed" &&
            typeof link.deletedAt !== "string" &&
            sameScope(link, scope),
        ),
      );
      if (selectedLinks.some((observationLinks) => observationLinks.length === 0)) {
        throw new Error("Her kanıt için öğretmen onaylı program bağlantısı gereklidir.");
      }
      const linkProfiles = selectedLinks
        .flat()
        .map(
          (link) =>
            `${String(link.framework)}\u0000${String(link.catalogId)}\u0000${String(link.sourceVersion)}`,
        );
      if (new Set(linkProfiles).size !== 1) {
        throw new Error(
          "Bir değerlendirme taslağında farklı program, katalog veya kaynak sürümleri karıştırılamaz.",
        );
      }
      const selectedFlatLinks = selectedLinks.flat();
      const referenceVerificationStatus = selectedFlatLinks.every(
        (link) =>
          link.referenceOrigin === "official-catalog" &&
          link.officialCatalogVerified === true,
      )
        ? "official-catalog-verified"
        : "teacher-declared-unverified";
      const citations = selected.map((record, index) => ({
        observationId: record!.id,
        observedAt: record!.observedAt,
        confirmedCurriculumLinkIds: selectedLinks[index].map((link) => link.id),
      }));
      const reviewedByUserId = input.completeTeacherAssessment === true
        ? await resolveLocalTeacherIdentity(transaction, { now }) : null;
      draft = {
        id: draftId,
        reportType: "evidence-assessment",
        status: reviewedByUserId ? "teacher-saved" : "teacher-review-required",
        studentIds: [studentId],
        observationIds,
        evidenceCitations: citations,
        teacherAssessmentText: requiredText(
          input.teacherAssessmentText,
          "Öğretmen değerlendirmesi",
        ),
        assessmentLevel,
        assessmentTargetIds,
        authoredBy: "teacher",
        teacherReviewRequired: !reviewedByUserId,
        reviewStatus: reviewedByUserId ? "teacher-saved" : "pending",
        reviewedByUserId,
        reviewedAt: reviewedByUserId ? timestamp : null,
        generationMode: "teacher-authored-cited-draft",
        referenceVerificationStatus,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: civilDateInIstanbul(now),
        deletedAt: null,
        schemaVersion: 1,
      };
      await transaction.putMany("reportDrafts", [draft]);
    },
  );
  if (!draft) throw new Error("Kaynaklı değerlendirme taslağı oluşturulamadı.");
  return { draft };
}
