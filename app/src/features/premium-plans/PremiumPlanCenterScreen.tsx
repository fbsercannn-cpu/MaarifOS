import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  CheckCircledIcon,
  ClockIcon,
  LockClosedIcon,
  ReaderIcon,
  StarIcon,
} from "@radix-ui/react-icons";

import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { KeyboardTextarea } from "../../mobile";
import type { CurriculumProfileSnapshot } from "../evidence/evidence-flow.ts";
import {
  assertPremiumPackActionAccess,
  canPerformPremiumPackAction,
  createDevelopmentPreviewAccess,
  type VerifiedPremiumAccess,
} from "../premium-access/entitlement.ts";
import { loadPremiumPilotPreviewPack } from "./content-repository.ts";
import type {
  PremiumContentPack,
  PremiumDailyTemplateSelection,
  PremiumPlanLensId,
} from "./domain.ts";
import { premiumPilotLensById } from "./lens-catalog.ts";
import {
  generatePremiumPlanExportFile,
  type PremiumPlanExportFormat,
} from "./export-document.ts";
import { loadInstalledPremiumPlanExportSource } from "./export-read-model.ts";
import {
  generateMonthlyEvaluationExportFile,
  loadMonthlyEvaluationExportSource,
  type MonthlyEvaluationExportFormat,
} from "./monthly-evaluation-export.ts";
import {
  installPremiumPlanBoard,
  loadInstalledPremiumPlan,
  loadLegacyInstalledPremiumPlans,
  loadPremiumMonthlyReviewContext,
  loadPremiumWeeklyCarryForwardContexts,
  loadPremiumWeeklyReviewContext,
  premiumMonthlyEvidenceMeetsMinimum,
  preparePremiumDailyTemplate,
  recordPremiumMonthlyEvaluation,
  recordPremiumWeeklyEvaluation,
  summarizePremiumMonthlyEvidence,
  updatePremiumPlanLensPreferences,
  PREMIUM_MONTHLY_PROGRAM_CRITERIA,
  PREMIUM_MONTHLY_TEACHER_CRITERIA,
  type PremiumMonthlyChildEvidenceState,
  type PremiumMonthlyCriterionResponse,
  type PremiumMonthlyCriterionStatus,
  type PremiumMonthlyEvaluation,
  type PremiumMonthlyProgramCriterionId,
  type PremiumMonthlyReviewContext,
  type PremiumMonthlyTeacherCriterionId,
  type PremiumInstalledPlanSummary,
  type PremiumLegacyInstalledPlanSummary,
  type PremiumNextPlanDecision,
  type PremiumWeeklyReviewContext,
  type PremiumWeeklyCarryForwardContext,
} from "./plan-service.ts";
import {
  valueDefinitionByCode,
  type ValueCode,
} from "../values/values-constitution.ts";
import { ValueEvidenceLinkEditor } from "../values/ValueEvidenceLinkEditor.tsx";

function valueLabel(code: ValueCode): string {
  return `${code} ${valueDefinitionByCode(code).officialName}`;
}

function emptyMonthlyProgramCriteria(): PremiumMonthlyCriterionResponse<PremiumMonthlyProgramCriterionId>[] {
  return PREMIUM_MONTHLY_PROGRAM_CRITERIA.map(({ id }) => ({
    criterionId: id,
    status: "not-observed",
  }));
}

function emptyMonthlyTeacherCriteria(): PremiumMonthlyCriterionResponse<PremiumMonthlyTeacherCriterionId>[] {
  return PREMIUM_MONTHLY_TEACHER_CRITERIA.map(({ id }) => ({
    criterionId: id,
    status: "not-observed",
  }));
}

const MONTHLY_CRITERION_STATUS_OPTIONS: readonly {
  value: PremiumMonthlyCriterionStatus;
  label: string;
}[] = [
  { value: "observed-working", label: "İşleyen yön" },
  { value: "needs-adjustment", label: "Uyarlama gerekiyor" },
  { value: "not-observed", label: "Bu ay gözlenmedi" },
];

function weeklyDecisionLabel(decision: PremiumNextPlanDecision): string {
  if (decision === "adapt") return "Uyarlayarak sürdür";
  if (decision === "replace") return "Başka yolla değiştir";
  if (decision === "observe-more") return "Ek gözlem gerekli";
  return "Aynen sürdür";
}

export interface PremiumPlanCenterScreenProps {
  store: LocalDataStore;
  curriculumProfile: CurriculumProfileSnapshot;
  ageGroup: string;
  contentPack?: PremiumContentPack | null;
  internalStaffExportEnabled?: boolean;
  premiumAccess?: VerifiedPremiumAccess | null;
  valueEvidenceWritesDisabled?: boolean;
  onClose: () => void;
  onUseActivity: (selection: PremiumDailyTemplateSelection) => void;
}

export function PremiumPlanCenterScreen({
  store,
  curriculumProfile,
  ageGroup,
  contentPack = null,
  internalStaffExportEnabled = false,
  premiumAccess = null,
  valueEvidenceWritesDisabled = false,
  onClose,
  onUseActivity,
}: PremiumPlanCenterScreenProps) {
  const [pack, setPack] = useState<PremiumContentPack | null>(null);
  const [installed, setInstalled] = useState<PremiumInstalledPlanSummary | null>(null);
  const [legacyInstalled, setLegacyInstalled] = useState<readonly PremiumLegacyInstalledPlanSummary[]>([]);
  const [teacherPreferredLensId, setTeacherPreferredLensId] =
    useState<PremiumPlanLensId>("guided-play");
  const [teacherPreferredSupportingLensIds, setTeacherPreferredSupportingLensIds] =
    useState<PremiumPlanLensId[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [reviewContext, setReviewContext] = useState<PremiumWeeklyReviewContext | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewReflection, setReviewReflection] = useState("");
  const [reviewEvidenceSummary, setReviewEvidenceSummary] = useState("");
  const [reviewObservationIds, setReviewObservationIds] = useState<string[]>([]);
  const [reviewDecision, setReviewDecision] =
    useState<PremiumNextPlanDecision>("keep");
  const [reviewMessage, setReviewMessage] = useState("");
  const [monthlyReviewContext, setMonthlyReviewContext] =
    useState<PremiumMonthlyReviewContext | null>(null);
  const [latestMonthlyEvaluation, setLatestMonthlyEvaluation] =
    useState<PremiumMonthlyEvaluation | null>(null);
  const [weeklyCarryForwardContexts, setWeeklyCarryForwardContexts] =
    useState<readonly PremiumWeeklyCarryForwardContext[]>([]);
  const [monthlyReviewBusy, setMonthlyReviewBusy] = useState(false);
  const [monthlyEvidenceState, setMonthlyEvidenceState] =
    useState<PremiumMonthlyChildEvidenceState>("insufficient-evidence");
  const [monthlyObservationIds, setMonthlyObservationIds] = useState<string[]>([]);
  const [monthlyCurriculumLinkIds, setMonthlyCurriculumLinkIds] =
    useState<string[]>([]);
  const [monthlyChildNarrative, setMonthlyChildNarrative] = useState("");
  const [monthlyProgramCriteria, setMonthlyProgramCriteria] =
    useState(emptyMonthlyProgramCriteria);
  const [monthlyProgramNarrative, setMonthlyProgramNarrative] = useState("");
  const [monthlyTeacherCriteria, setMonthlyTeacherCriteria] =
    useState(emptyMonthlyTeacherCriteria);
  const [monthlyTeacherNarrative, setMonthlyTeacherNarrative] = useState("");
  const [monthlyNextRecommendation, setMonthlyNextRecommendation] = useState("");
  const [monthlyReviewMessage, setMonthlyReviewMessage] = useState("");
  const [selectedMonthlyEvaluationId, setSelectedMonthlyEvaluationId] =
    useState<string | null>(null);
  const [monthlyExportBusy, setMonthlyExportBusy] =
    useState<MonthlyEvaluationExportFormat | null>(null);
  const [monthlyExportMessage, setMonthlyExportMessage] = useState("");
  const [valueEvidenceEditorObservationId, setValueEvidenceEditorObservationId] =
    useState<string | null>(null);
  const valueEvidenceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [exportBusy, setExportBusy] = useState<PremiumPlanExportFormat | null>(null);
  const [exportMessage, setExportMessage] = useState("");
  const [, setAccessClockTick] = useState(0);

  const closeValueEvidenceEditor = () => {
    setValueEvidenceEditorObservationId(null);
    valueEvidenceTriggerRef.current?.focus();
  };

  useEffect(() => {
    let active = true;
    void (contentPack
      ? Promise.resolve(contentPack)
      : loadPremiumPilotPreviewPack())
      .then(async (loadedPack) => {
        const [installation, legacyPlans] = await Promise.all([
          loadInstalledPremiumPlan(store, loadedPack),
          loadLegacyInstalledPremiumPlans(store, loadedPack),
        ]);
        const [monthlyContext, carryForwardContexts] = installation
          ? await Promise.all([
              loadPremiumMonthlyReviewContext(store, installation.monthlyPlanId),
              loadPremiumWeeklyCarryForwardContexts(
                store,
                installation.monthlyPlanId,
              ),
            ])
          : [null, [] as readonly PremiumWeeklyCarryForwardContext[]];
        if (!active) return;
        setPack(loadedPack);
        setInstalled(installation);
        setLegacyInstalled(legacyPlans);
        const latestEvaluation = monthlyContext?.evaluations.at(-1) ?? null;
        setLatestMonthlyEvaluation(latestEvaluation);
        setSelectedMonthlyEvaluationId(latestEvaluation?.id ?? null);
        setWeeklyCarryForwardContexts(carryForwardContexts);
        if (installation) {
          setTeacherPreferredLensId(installation.teacherPreferredLensId);
          setTeacherPreferredSupportingLensIds([
            ...installation.teacherPreferredSupportingLensIds,
          ]);
        }
        setBusy(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Premium paket açılamadı.");
        setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [contentPack, store]);

  const eligible =
    curriculumProfile.framework === "tymm" &&
    curriculumProfile.officialCatalogVerified === true &&
    /60\s*[–-]\s*72/.test(ageGroup);
  const selectedLens = useMemo(
    () => premiumPilotLensById(teacherPreferredLensId),
    [teacherPreferredLensId],
  );
  const monthlySelectedCoverage = useMemo(() => {
    if (!monthlyReviewContext) return null;
    const selectedLinkIds = new Set(monthlyCurriculumLinkIds);
    return summarizePremiumMonthlyEvidence(
      monthlyReviewContext.observations
        .filter((observation) => monthlyObservationIds.includes(observation.id))
        .map((observation) => ({
          ...observation,
          curriculumLinks: observation.curriculumLinks.filter((link) =>
            selectedLinkIds.has(link.id),
          ),
        })),
      monthlyReviewContext.activeStudentIds,
    );
  }, [
    monthlyCurriculumLinkIds,
    monthlyObservationIds,
    monthlyReviewContext,
  ]);
  const monthlyUncoveredStudentNames = useMemo(() => {
    if (!monthlyReviewContext || !monthlySelectedCoverage) return null;
    const names = monthlySelectedCoverage.uncoveredActiveStudentIds.map(
      (studentId) =>
        monthlyReviewContext.activeStudents.find(
          (student) => student.id === studentId,
        )?.displayName ?? null,
    );
    return names.every((name): name is string => Boolean(name)) ? names : null;
  }, [monthlyReviewContext, monthlySelectedCoverage]);
  const effectivePremiumAccess = useMemo(() => {
    if (premiumAccess) return premiumAccess;
    if (!pack || !internalStaffExportEnabled) return null;
    return createDevelopmentPreviewAccess({
      sku: pack.sku,
      contentReleaseId: pack.contentReleaseId,
      contentPackId: pack.id,
      contentPackVersion: pack.version,
      manifestDigest: pack.manifestDigest,
      academicRelease: pack.academicRelease,
    });
  }, [internalStaffExportEnabled, pack, premiumAccess]);
  useEffect(() => {
    if (!effectivePremiumAccess) return undefined;
    const expiryMs = effectivePremiumAccess.decisionExpiresAtEpochSeconds * 1000;
    if (!Number.isFinite(expiryMs) || expiryMs > Date.now() + 2_147_000_000) {
      return undefined;
    }
    const timer = window.setTimeout(
      () => setAccessClockTick((value) => value + 1),
      Math.max(0, expiryMs - Date.now() + 1_100),
    );
    return () => window.clearTimeout(timer);
  }, [effectivePremiumAccess]);
  const premiumContentAllowed = Boolean(
    pack &&
    canPerformPremiumPackAction(effectivePremiumAccess, pack, "content"),
  );
  const premiumExportAllowed = Boolean(
    pack &&
    canPerformPremiumPackAction(effectivePremiumAccess, pack, "export"),
  );
  const accessPresentation = useMemo(() => {
    if (effectivePremiumAccess?.source === "development-preview") {
      return {
        header: "geliştirme önizlemesi",
        title: "Geliştirme önizlemesi",
        detail:
          "Bu yerel önizleme yalnız ürün doğrulaması içindir; üretim erişimi imzalı cihaz yetkisiyle açılır.",
        access: "Yerel önizleme",
      };
    }
    if (effectivePremiumAccess?.grant.accessMode === "staff-code") {
      return {
        header: "Kurucu erişimi",
        title: "Kurucu Premium bu cihazda etkin",
        detail:
          "Eylül plan paketi, yıllık omurga, günlük ve haftalık akışlar ile değerlendirme ve belge çıktıları bu cihaza güvenle bağlandı.",
        access: "Kurucu Premium",
      };
    }
    if (effectivePremiumAccess?.grant.accessMode === "purchased") {
      return {
        header: "abonelik etkin",
        title: "Premium abonelik bu cihazda etkin",
        detail:
          "Satın alınan içerik ve belge hakları imzalı cihaz yetkisiyle doğrulandı.",
        access: "Premium abonelik",
      };
    }
    if (effectivePremiumAccess?.grant.accessMode === "trial") {
      return {
        header: "deneme etkin",
        title: "Premium deneme bu cihazda etkin",
        detail:
          "Deneme süresindeki içerik hakkı imzalı cihaz yetkisiyle doğrulandı; PDF ve Word çıktısı denemede kapalıdır.",
        access: "Premium deneme",
      };
    }
    return {
      header: "erişim doğrulanıyor",
      title: "Premium erişim doğrulanamadı",
      detail: "İçeriği kullanmak için bu cihazda geçerli bir premium erişim gerekir.",
      access: "Kilitli",
    };
  }, [effectivePremiumAccess]);

  const install = async () => {
    if (!pack || busy) return;
    setBusy(true);
    setError("");
    try {
      assertPremiumPackActionAccess(effectivePremiumAccess, pack, "content");
      await installPremiumPlanBoard(store, {
        pack,
        curriculumProfile,
        teacherPreferredLensId,
        teacherPreferredSupportingLensIds,
      });
      setInstalled(await loadInstalledPremiumPlan(store, pack));
      setLatestMonthlyEvaluation(null);
      setSelectedMonthlyEvaluationId(null);
      setWeeklyCarryForwardContexts([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Plan panosu eklenemedi.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSupportingLens = (lensId: PremiumPlanLensId) => {
    if (lensId === teacherPreferredLensId) return;
    setTeacherPreferredSupportingLensIds((current) =>
      current.includes(lensId)
        ? current.filter((candidate) => candidate !== lensId)
        : current.length < 2
          ? [...current, lensId]
          : current,
    );
  };

  const applyLensPreference = async () => {
    if (!pack || !installed || busy) return;
    setBusy(true);
    setError("");
    try {
      await updatePremiumPlanLensPreferences(store, {
        pack,
        teacherPreferredLensId,
        teacherPreferredSupportingLensIds,
      });
      setInstalled(await loadInstalledPremiumPlan(store, pack));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pedagojik yaklaşım güncellenemedi.");
    } finally {
      setBusy(false);
    }
  };

  const useActivity = (activityId: string) => {
    if (!pack || !installed) return;
    try {
      assertPremiumPackActionAccess(effectivePremiumAccess, pack, "content");
      onUseActivity(
        preparePremiumDailyTemplate(pack, activityId, {
          annualPlanId: installed.annualPlanId,
          monthlyPlanId: installed.monthlyPlanId,
          weeklyPlanIds: installed.weeklyPlanIds,
          teacherPreferredLensId: installed.teacherPreferredLensId,
          teacherPreferredSupportingLensIds:
            installed.teacherPreferredSupportingLensIds,
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Premium etkinlik açılamadı.");
    }
  };

  const downloadPlan = async (format: PremiumPlanExportFormat) => {
    if (
      !pack ||
      !installed ||
      exportBusy ||
      !effectivePremiumAccess
    ) return;
    setExportBusy(format);
    setExportMessage("");
    try {
      const source = await loadInstalledPremiumPlanExportSource(
        store,
        pack,
        installed.annualPlanId,
      );
      const file = await generatePremiumPlanExportFile(
        pack,
        source,
        effectivePremiumAccess,
        format,
      );
      const blob = new Blob([file.bytes.buffer as ArrayBuffer], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportMessage(`${format === "pdf" ? "PDF" : "Word"} dosyası cihazda hazırlandı.`);
    } catch (reason) {
      setExportMessage(reason instanceof Error ? reason.message : "Plan dosyası hazırlanamadı.");
    } finally {
      setExportBusy(null);
    }
  };

  const downloadMonthlyEvaluation = async (
    format: MonthlyEvaluationExportFormat,
  ) => {
    if (
      !pack ||
      !installed ||
      !effectivePremiumAccess ||
      !selectedMonthlyEvaluationId ||
      monthlyExportBusy
    ) return;
    setMonthlyExportBusy(format);
    setMonthlyExportMessage("");
    try {
      const source = await loadMonthlyEvaluationExportSource(
        store,
        installed.monthlyPlanId,
      );
      const file = await generateMonthlyEvaluationExportFile(
        pack,
        source,
        effectivePremiumAccess,
        selectedMonthlyEvaluationId,
        format,
      );
      const blob = new Blob([file.bytes.buffer as ArrayBuffer], {
        type: file.mimeType,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setMonthlyExportMessage(
        `${format === "pdf" ? "PDF" : "Düzenlenebilir Word"} dosyası seçili kalıcı değerlendirmeden hazırlandı.`,
      );
    } catch (reason) {
      setMonthlyExportMessage(
        reason instanceof Error
          ? reason.message
          : "Ek 18 değerlendirme belgesi hazırlanamadı.",
      );
    } finally {
      setMonthlyExportBusy(null);
    }
  };

  const openWeeklyReview = async (weekId: string) => {
    if (!installed || reviewBusy) return;
    if (reviewContext?.weekId === weekId) {
      setReviewContext(null);
      setValueEvidenceEditorObservationId(null);
      setReviewMessage("");
      return;
    }
    const weeklyPlanId = installed.weeklyPlanIds.find(
      (candidate) => candidate.weekId === weekId,
    )?.planId;
    if (!weeklyPlanId) return;
    setReviewBusy(true);
    setReviewMessage("");
    try {
      const context = await loadPremiumWeeklyReviewContext(store, weeklyPlanId);
      setReviewContext(context);
      setValueEvidenceEditorObservationId(null);
      setReviewObservationIds(context.observations.map((observation) => observation.id));
      setReviewReflection("");
      setReviewEvidenceSummary("");
      setReviewDecision("keep");
    } catch (reason) {
      setReviewMessage(reason instanceof Error ? reason.message : "Haftalık değerlendirme açılamadı.");
    } finally {
      setReviewBusy(false);
    }
  };

  const saveWeeklyReview = async () => {
    if (!reviewContext || reviewBusy) return;
    setReviewBusy(true);
    setReviewMessage("");
    try {
      const evaluation = await recordPremiumWeeklyEvaluation(store, {
        weeklyPlanId: reviewContext.weeklyPlanId,
        reflection: reviewReflection,
        evidenceSummary: reviewEvidenceSummary,
        observationIds: reviewObservationIds,
        nextPlanDecision: reviewDecision,
      });
      const refreshed = await loadPremiumWeeklyReviewContext(
        store,
        reviewContext.weeklyPlanId,
      );
      setReviewContext(refreshed);
      if (installed) {
        setWeeklyCarryForwardContexts(
          await loadPremiumWeeklyCarryForwardContexts(
            store,
            installed.monthlyPlanId,
          ),
        );
      }
      setReviewReflection("");
      setReviewEvidenceSummary("");
      setReviewMessage(
        evaluation.nextPlanTargetPlanId
          ? "Değerlendirme kaydedildi ve karar sonraki haftanın öğretmen incelemesine taşındı."
          : "Değerlendirme kaydedildi. Bu pakette sonraki hafta bulunmadığı için karar geçmişte korundu.",
      );
    } catch (reason) {
      setReviewMessage(reason instanceof Error ? reason.message : "Haftalık değerlendirme kaydedilemedi.");
    } finally {
      setReviewBusy(false);
    }
  };

  const loadMonthlyEvaluationIntoForm = (
    evaluation: PremiumMonthlyEvaluation,
  ) => {
    setMonthlyEvidenceState(evaluation.children.evidenceState);
    setMonthlyObservationIds([...evaluation.children.observationIds]);
    setMonthlyCurriculumLinkIds([...evaluation.children.curriculumLinkIds]);
    setMonthlyChildNarrative(evaluation.children.narrative);
    setMonthlyProgramCriteria([...evaluation.program.criteria]);
    setMonthlyProgramNarrative(evaluation.program.narrative);
    setMonthlyTeacherCriteria([...evaluation.teacher.criteria]);
    setMonthlyTeacherNarrative(evaluation.teacher.narrative);
    setMonthlyNextRecommendation(evaluation.nextMonthRecommendation);
  };

  const resetMonthlyEvaluationForm = () => {
    setMonthlyEvidenceState("insufficient-evidence");
    setMonthlyObservationIds([]);
    setMonthlyCurriculumLinkIds([]);
    setMonthlyChildNarrative("");
    setMonthlyProgramCriteria(emptyMonthlyProgramCriteria());
    setMonthlyProgramNarrative("");
    setMonthlyTeacherCriteria(emptyMonthlyTeacherCriteria());
    setMonthlyTeacherNarrative("");
    setMonthlyNextRecommendation("");
  };

  const openMonthlyReview = async () => {
    if (!installed || monthlyReviewBusy) return;
    if (monthlyReviewContext) {
      setMonthlyReviewContext(null);
      setMonthlyReviewMessage("");
      return;
    }
    setMonthlyReviewBusy(true);
    setMonthlyReviewMessage("");
    try {
      const context = await loadPremiumMonthlyReviewContext(
        store,
        installed.monthlyPlanId,
      );
      setMonthlyReviewContext(context);
      const latest = context.evaluations.at(-1);
      setLatestMonthlyEvaluation(latest ?? null);
      if (latest) {
        setSelectedMonthlyEvaluationId(latest.id);
        loadMonthlyEvaluationIntoForm(latest);
        setMonthlyReviewMessage(
          "Son kaydedilmiş değerlendirme yeniden açıldı. Kaydettiğinizde eski kayıt değişmez; yeni bir öğretmen kaydı eklenir.",
        );
      } else {
        resetMonthlyEvaluationForm();
      }
    } catch (reason) {
      setMonthlyReviewMessage(
        reason instanceof Error
          ? reason.message
          : "Aylık değerlendirme açılamadı.",
      );
    } finally {
      setMonthlyReviewBusy(false);
    }
  };

  const toggleMonthlyObservation = (observationId: string, checked: boolean) => {
    if (!monthlyReviewContext) return;
    const observation = monthlyReviewContext.observations.find(
      (candidate) => candidate.id === observationId,
    );
    if (!observation) return;
    const linkIds = observation.curriculumLinks.map((link) => link.id);
    setMonthlyObservationIds((current) =>
      checked
        ? [...new Set([...current, observationId])]
        : current.filter((id) => id !== observationId),
    );
    setMonthlyCurriculumLinkIds((current) =>
      checked
        ? [...new Set([...current, ...linkIds])]
        : current.filter((id) => !linkIds.includes(id)),
    );
  };

  const toggleMonthlyCurriculumLink = (linkId: string, checked: boolean) => {
    setMonthlyCurriculumLinkIds((current) =>
      checked
        ? [...new Set([...current, linkId])]
        : current.filter((id) => id !== linkId),
    );
  };

  const updateMonthlyProgramCriterion = (
    criterionId: PremiumMonthlyProgramCriterionId,
    status: PremiumMonthlyCriterionStatus,
  ) => {
    setMonthlyProgramCriteria((current) =>
      current.map((response) =>
        response.criterionId === criterionId
          ? { ...response, status }
          : response,
      ),
    );
  };

  const updateMonthlyTeacherCriterion = (
    criterionId: PremiumMonthlyTeacherCriterionId,
    status: PremiumMonthlyCriterionStatus,
  ) => {
    setMonthlyTeacherCriteria((current) =>
      current.map((response) =>
        response.criterionId === criterionId
          ? { ...response, status }
          : response,
      ),
    );
  };

  const saveMonthlyReview = async () => {
    if (!monthlyReviewContext || monthlyReviewBusy) return;
    setMonthlyReviewBusy(true);
    setMonthlyReviewMessage("");
    try {
      const evaluation = await recordPremiumMonthlyEvaluation(store, {
        monthlyPlanId: monthlyReviewContext.monthlyPlanId,
        childEvidenceState: monthlyEvidenceState,
        childNarrative: monthlyChildNarrative,
        observationIds: monthlyObservationIds,
        curriculumLinkIds: monthlyCurriculumLinkIds,
        programCriteria: monthlyProgramCriteria,
        programNarrative: monthlyProgramNarrative,
        teacherCriteria: monthlyTeacherCriteria,
        teacherNarrative: monthlyTeacherNarrative,
        nextMonthRecommendation: monthlyNextRecommendation,
      });
      const refreshed = await loadPremiumMonthlyReviewContext(
        store,
        monthlyReviewContext.monthlyPlanId,
      );
      setMonthlyReviewContext(refreshed);
      loadMonthlyEvaluationIntoForm(evaluation);
      setLatestMonthlyEvaluation(evaluation);
      setSelectedMonthlyEvaluationId(evaluation.id);
      setMonthlyReviewMessage(
        "Aylık değerlendirme üç boyutuyla kaydedildi. Önceki kayıtlar değiştirilmeden korunuyor.",
      );
    } catch (reason) {
      setMonthlyReviewMessage(
        reason instanceof Error
          ? reason.message
          : "Aylık değerlendirme kaydedilemedi.",
      );
    } finally {
      setMonthlyReviewBusy(false);
    }
  };

  const weeklyCarryForwardForWeek = (weekId: string) => {
    const targetPlanId = installed?.weeklyPlanIds.find(
      (candidate) => candidate.weekId === weekId,
    )?.planId;
    return targetPlanId
      ? weeklyCarryForwardContexts.find(
          (context) => context.targetWeeklyPlanId === targetPlanId,
        ) ?? null
      : null;
  };

  return (
    <div className="premium-plan-center" data-testid="premium-plan-center">
      <header className="premium-plan-header">
        <button type="button" onClick={onClose} aria-label="Plan Kütüphanesi’ni kapat">
          <ArrowLeftIcon aria-hidden="true" />
        </button>
        <div>
          <span>MaarifOS Premium · {accessPresentation.header}</span>
          <h1>Plan Kütüphanesi</h1>
        </div>
        <LockClosedIcon aria-hidden="true" />
      </header>

      <main className="premium-plan-scroll">
        <section className="premium-pilot-notice" role="status">
          <StarIcon aria-hidden="true" />
          <span>
            <strong>{accessPresentation.title}</strong>
            <small>{accessPresentation.detail}</small>
          </span>
        </section>

        {busy && !pack ? <p className="premium-loading">İçerik paketi doğrulanıyor…</p> : null}
        {error ? <p className="premium-error" role="alert">{error}</p> : null}

        {pack ? (
          <>
            <section className="premium-plan-hero">
              <span className="premium-plan-eyebrow">İlk çalışan dilim</span>
              <h2>{pack.displayName}</h2>
              <p>Eylül 2026 için 4 hafta, 12 öğretmen incelemeli etkinlik, 10 bloklu tam gün akışı ve öğretmen kontrollü günlük plan köprüsü.</p>
              <dl>
                <div><dt>Program</dt><dd>TYMM 2024</dd></div>
                <div><dt>Yaş</dt><dd>60–72 ay</dd></div>
                <div><dt>Erişim</dt><dd>{accessPresentation.access}</dd></div>
                <div>
                  <dt>Değer omurgası</dt>
                  <dd>{pack.valuesMappingStatus === "legacy-unmapped" ? "Eski sürüm · eşlenmemiş" : "12/12 etkinlik · doğrulandı"}</dd>
                </div>
              </dl>
            </section>

            {!eligible ? (
              <section className="premium-eligibility-warning" role="alert">
                <strong>Bu içerik paketi sınıf profiliyle uyuşmuyor.</strong>
                <span>Resmî katalogla doğrulanmış TYMM 2024 · 60–72 ay sınıfı gereklidir.</span>
              </section>
            ) : null}

            {legacyInstalled.length > 0 ? (
              <section className="premium-legacy-plans" aria-labelledby="premium-legacy-title">
                <div>
                  <span>Korunan eski planlar</span>
                  <h2 id="premium-legacy-title">V2 kayıtları salt okunur ve legacy-unmapped</h2>
                  <p>Bu planlara sonradan değer eşlemesi eklenmez; kaynak snapshot&apos;ları aynen korunur.</p>
                </div>
                <ul>
                  {legacyInstalled.map((plan) => (
                    <li key={plan.annualPlanId}>
                      <strong>{plan.title}</strong>
                      <span>Sürüm {plan.contentVersion} · salt okunur</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="premium-values-constitution" aria-labelledby="premium-values-title">
              <div className="premium-section-heading">
                <span>Değerler Pedagojisi Anayasası</span>
                <h2 id="premium-values-title">Saygı–sorumluluk–adalet karar çekirdeği</h2>
                <p>
                  Değer, slogan veya çocuk puanı değil; yaşanan ikilem, yetişkin modeli,
                  çocuk seçimi, onarma imkânı, karşı kanıt ve sonraki plan kararıyla görünür olur.
                </p>
              </div>
              {pack.valuesMappingStatus === "legacy-unmapped" ? (
                <p className="premium-values-review-status">
                  Bu eski içerik sürümünde değer snapshot&apos;ı yoktur; sistem geriye dönük değer uydurmaz.
                </p>
              ) : (
                <>
                  <div className="premium-values-pillars" aria-label="Çatı değerler">
                    <span>D14 Saygı</span>
                    <span>D16 Sorumluluk</span>
                    <span>D1 Adalet</span>
                  </div>
                  <p className="premium-values-review-status">
                    Makine doğrulaması tamamlandı; erken çocukluk, uygulayıcı öğretmen,
                    çocuk hakları, TYMM, içerik/Türkçe dili ve Türk-İslam kültürü/ilahiyat
                    insan uzman incelemeleri bekliyor. Bu durum
                    öğretmen onayı veya çocuk hakkında değer hükmü değildir.
                  </p>
                </>
              )}
            </section>

            <section className="premium-section" aria-labelledby="premium-lens-title">
              <div className="premium-section-heading">
                <span>Pedagojik yaklaşım</span>
                <h2 id="premium-lens-title">Ana lensi öğretmen seçer</h2>
                <p>Yaklaşımlar marka taklidi değildir; gözlenebilir uygulama ilkeleri TYMM hedefleriyle yeniden tasarlanmıştır.</p>
              </div>
              <div className="premium-lens-list" role="list">
                {pack.lenses.map((lens) => (
                  <button
                    key={lens.id}
                    type="button"
                    role="listitem"
                    aria-pressed={teacherPreferredLensId === lens.id}
                    onClick={() => {
                      setTeacherPreferredLensId(lens.id);
                      setTeacherPreferredSupportingLensIds((current) =>
                        current.filter((candidate) => candidate !== lens.id),
                      );
                    }}
                  >
                    <strong>{lens.displayName}</strong>
                    <small>{lens.shortDescription}</small>
                  </button>
                ))}
              </div>
              {selectedLens ? <p className="premium-lens-source">Esin: {selectedLens.inspiration} · Kanıt düzeyi {selectedLens.evidenceGrade}</p> : null}
              <p className="premium-values-review-status">
                Seçim, plan katmanlarına öğretmen tercihi olarak kaydedilir; mevcut etkinlik
                metnini veya hazırlanmış çevreyi otomatik dönüştürmez. Her etkinliğin uygulama
                uyarlaması öğretmen incelemesi gerektirir.
              </p>
              <div className="premium-supporting-lenses" aria-label="Destekleyici pedagojik yaklaşımlar">
                <strong>İsteğe bağlı en fazla iki destekleyici yaklaşım</strong>
                <div>
                  {pack.lenses
                    .filter((lens) => lens.id !== teacherPreferredLensId)
                    .map((lens) => (
                      <button
                        key={lens.id}
                        type="button"
                        aria-pressed={teacherPreferredSupportingLensIds.includes(lens.id)}
                        onClick={() => toggleSupportingLens(lens.id)}
                      >
                        {lens.displayName}
                      </button>
                    ))}
                </div>
              </div>
              {installed ? (
                <button
                  className="premium-lens-apply"
                  type="button"
                  disabled={busy}
                  onClick={() => void applyLensPreference()}
                >
                  Yaklaşım tercihini plana kaydet
                </button>
              ) : null}
            </section>

            <section className="premium-section" aria-labelledby="premium-year-title">
              <div className="premium-section-heading">
                <span>Yıllık omurga</span>
                <h2 id="premium-year-title">Eylül plan paketi + yıllık omurga</h2>
                <p>
                  Uygulanabilir aylık içerik Eylül paketidir. Ekim–Haziran başlıkları
                  yayımlanmış plan değil, ileride hazırlanacak omurgayı gösterir.
                </p>
              </div>
              <ol className="premium-month-list">
                {pack.annualMonths.map((month) => (
                  <li
                    key={month.monthKey}
                    className={month.releaseStatus === "ready"
                      ? "is-ready"
                      : month.releaseStatus === "internal-review-ready"
                        ? "is-review-pending"
                        : ""}
                  >
                    <span>{month.monthKey.slice(5)}</span>
                    <div><strong>{month.title}</strong><small>{month.purpose}</small></div>
                    {month.releaseStatus === "ready" ? (
                      <CheckCircledIcon
                        aria-label="Eski pilot içerik kullanılabilir; değer tasarımı bulunmuyor"
                      />
                    ) : month.releaseStatus === "internal-review-ready" ? (
                      <span className="premium-month-review-pending">
                        <ClockIcon aria-hidden="true" focusable="false" />
                        <span>Uzman incelemesi bekliyor</span>
                      </span>
                    ) : (
                      <span>Henüz yayımlanmadı</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <section className="premium-section" aria-labelledby="premium-monthly-title">
              <div className="premium-section-heading">
                <span>Aylık uygulama özeti</span>
                <h2 id="premium-monthly-title">{pack.monthlyPlan.title}</h2>
                <p>{pack.monthlyPlan.purpose}</p>
              </div>
              <details className="premium-monthly-details">
                <summary>Soruları, rutinleri ve materyalleri incele</summary>
                <h3>Çocuklarla araştırılacak sorular</h3>
                <ul>{pack.monthlyPlan.childQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
                <h3>Rutinler ve geçişler</h3>
                <ul>{[...pack.monthlyPlan.routines, ...pack.monthlyPlan.transitions].map((item) => <li key={item}>{item}</li>)}</ul>
                <h3>Materyal hazırlığı</h3>
                <ul>{[...pack.monthlyPlan.materialSummary, ...pack.monthlyPlan.lowCostMaterialSummary].map((item) => <li key={item}>{item}</li>)}</ul>
                <p><strong>Aile katılımı:</strong> {pack.monthlyPlan.familyParticipationPrinciple}</p>
              </details>
              {latestMonthlyEvaluation ? (
                <aside className="premium-next-month-recommendation" aria-label="Sonraki ay öğretmen karar kuyruğu">
                  <strong>Sonraki ay için öğretmen önerisi</strong>
                  <p>{latestMonthlyEvaluation.nextMonthRecommendation}</p>
                  <small>
                    Durum: Henüz uygulanmadı. Ekim planı yayımlanmadığı için öneri
                    otomatik olarak bir plana işlenmedi; gelecekte öğretmen incelemesiyle
                    ele alınacak karar kuyruğunda korunuyor.
                  </small>
                </aside>
              ) : null}
            </section>

            <section className="premium-section" aria-labelledby="premium-flow-title">
              <div className="premium-section-heading">
                <span>Otomatik ve esnek</span>
                <h2 id="premium-flow-title">10 bloklu tam gün akışı</h2>
                <p>Bloklar önerilen sırada yerleşir; öğretmen sınıfın ihtiyacına göre süreyi ve geçişi değiştirebilir.</p>
              </div>
              <ol className="premium-full-day-flow">
                {pack.fullDayFlow.map((block, index) => (
                  <li key={block.id}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{block.title}</strong>
                      <p>{block.purpose}</p>
                      <small>{block.flexibilityNote}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="premium-section" aria-labelledby="premium-activities-title">
              <div className="premium-section-heading">
                <span>Eylül 2026</span>
                <h2 id="premium-activities-title">Öğretmen incelemeli etkinlikler</h2>
              </div>
              <div className="premium-activity-list">
                {pack.weeks.map((week) => (
                  <section className="premium-week-block" key={week.id} data-week-id={week.id}>
                    <div className="premium-week-header">
                      <span>{week.dateRange}</span>
                      <h3>{week.title}</h3>
                      <p>{week.inquiryQuestion}</p>
                    </div>
                    {(() => {
                      const carryForward = weeklyCarryForwardForWeek(week.id);
                      return carryForward ? (
                        <aside
                          className="premium-week-carry-forward"
                          aria-label="Önceki haftadan öğretmen kararı"
                        >
                          <strong>Önceki haftadan öğretmen kararı</strong>
                          <span>
                            Kaynak: {carryForward.sourceWeekTitle} ·{" "}
                            {carryForward.sourcePeriodStart}–{carryForward.sourcePeriodEnd} ·{" "}
                            {carryForward.createdAt}
                          </span>
                          <p>
                            Karar: {weeklyDecisionLabel(carryForward.decision)} ·{" "}
                            {carryForward.evidenceSummary}
                          </p>
                          <small>{carryForward.teacherReflection}</small>
                          <em>
                            Henüz otomatik uygulanmadı; bu haftanın öğretmen incelemesi
                            için karar kuyruğunda bekliyor.
                          </em>
                        </aside>
                      ) : null;
                    })()}
                    {pack.activities
                      .filter((activity) => activity.weekId === week.id)
                      .map((activity) => (
                        <article
                          key={activity.id}
                          data-activity-id={activity.id}
                          data-activity-role={activity.activityRole}
                        >
                          <div className="premium-activity-meta">
                            <span className={`premium-activity-role is-${activity.activityRole}`}>
                              {activity.activityRole === "main" ? "Ana etkinlik" : "Alternatif"}
                            </span>
                            <span>{activity.recommendedCivilDate}</span>
                            <span>{activity.durationMinutes} dk</span>
                          </div>
                          <h3>{activity.title}</h3>
                          <p>{activity.shortDescription}</p>
                          {activity.valuesDesign ? (
                            <div className="premium-activity-values" aria-label={`${activity.title} değer eşlemesi`}>
                              <strong>{valueLabel(activity.valuesDesign.mapping.primaryValueCode)}</strong>
                              <span>Çatı: {valueLabel(activity.valuesDesign.mapping.roofValueCode)}</span>
                              {activity.valuesDesign.mapping.supportingValueCodes.map((code) => (
                                <span key={code}>Destek: {valueLabel(code)}</span>
                              ))}
                            </div>
                          ) : null}
                          <small>{activity.curriculumTargetCodes.join(" · ")}</small>
                          <details>
                            <summary>Plan ayrıntısını incele</summary>
                            {activity.valuesDesign ? (
                              <>
                                <h4>Değerler pedagojisi</h4>
                                <p><strong>Yaşantı/ikilem:</strong> {activity.valuesDesign.mapping.livedContextOrDilemma}</p>
                                <h4>Resmî TYMM Okul Öncesi Ek-14 eylemleri</h4>
                                <ul>
                                  {activity.valuesDesign.mapping.officialActionSnapshots.map((snapshot) => (
                                    <li key={snapshot.indicatorCode}>
                                      {snapshot.indicatorCode} · {snapshot.indicatorText} · s. {snapshot.sourcePage}
                                    </li>
                                  ))}
                                </ul>
                                <h4>Yetişkin modeli, çocuk seçimi ve onarma</h4>
                                <ul>
                                  {[
                                    ...activity.valuesDesign.mapping.adultModelActions,
                                    ...activity.valuesDesign.mapping.childAgencyOptions,
                                    ...activity.valuesDesign.mapping.repairOrContributionOptions,
                                  ].map((item) => <li key={item}>{item}</li>)}
                                </ul>
                                <p><strong>Karşı kanıt:</strong> {activity.valuesDesign.mapping.counterEvidencePrompt}</p>
                                <p><strong>Sonraki plan kararı:</strong> {activity.valuesDesign.mapping.nextPlanDecisionRule}</p>
                              </>
                            ) : null}
                            <h4>Hazırlık</h4>
                            <ul>{activity.preparation.map((item) => <li key={item}>{item}</li>)}</ul>
                            <h4>Uygulama</h4>
                            <ol>{activity.processSteps.map((step) => <li key={step}>{step}</li>)}</ol>
                            <h4>Kanıt seçenekleri</h4>
                            <ul>{activity.evidenceOptions.map((option) => <li key={option}>{option}</li>)}</ul>
                            <h4>Materyaller ve düşük maliyetli seçenekler</h4>
                            <ul>{[...activity.materials, ...activity.lowCostAlternatives].map((item) => <li key={item}>{item}</li>)}</ul>
                            <h4>Öğretmen soruları ve çocuk ajansı</h4>
                            <ul>{[...activity.adultPrompts, ...activity.childAgencyPoints].map((item) => <li key={item}>{item}</li>)}</ul>
                            <h4>Gözlem odağı</h4>
                            <ul>{activity.observationPrompts.map((item) => <li key={item}>{item}</li>)}</ul>
                            <h4>Güvenlik ve erişim</h4>
                            <ul>{[...activity.safetyNotes, ...activity.differentiation].map((note) => <li key={note}>{note}</li>)}</ul>
                            <h4>İç mekân karşılığı</h4>
                            <p>{activity.indoorEquivalent}</p>
                            <h4>Aile, geçiş ve öğretmen yansıtması</h4>
                            <p>{activity.familyCommunityConnection}</p>
                            <p>{activity.transitionSupport}</p>
                            <p>{activity.reflectionPrompt}</p>
                          </details>
                          {activity.activityRole === "main" ? (
                            <button type="button" disabled={!installed || busy || !eligible || !premiumContentAllowed} onClick={() => useActivity(activity.id)}>
                              <ReaderIcon aria-hidden="true" /> Tam gün planını hazırla
                            </button>
                          ) : (
                            <p className="premium-alternative-note">Bu etkinlik uygulanmış sayılmaz; ana etkinlik planında isteğe bağlı seçenek olarak görünür.</p>
                          )}
                        </article>
                      ))}
                    <button
                      className="premium-week-review-button"
                      type="button"
                      disabled={!installed || reviewBusy}
                      onClick={() => void openWeeklyReview(week.id)}
                    >
                      {reviewContext?.weekId === week.id ? "Değerlendirmeyi kapat" : "Haftayı kanıtlarla değerlendir"}
                    </button>
                    {reviewContext?.weekId === week.id ? (
                      <section className="premium-week-review" aria-label={`${week.title} değerlendirmesi`}>
                        <div>
                          <span>Öğretmen değerlendirmesi</span>
                          <h4>{reviewContext.observations.length} bağlı ham gözlem</h4>
                          <p>Yalnız bu haftanın premium günlük planlarından gelen değişmez gözlemler kullanılabilir.</p>
                        </div>
                        {reviewContext.observations.length > 0 ? (
                          <div className="premium-review-observations" role="group" aria-label="Değerlendirmeye alınacak gözlemler">
                            {reviewContext.observations.map((observation) => {
                              const editorOpen =
                                valueEvidenceEditorObservationId === observation.id;
                              return (
                                <div className="premium-review-observation-row" key={observation.id}>
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={reviewObservationIds.includes(observation.id)}
                                      onChange={(event) =>
                                        setReviewObservationIds((current) =>
                                          event.target.checked
                                            ? [...new Set([...current, observation.id])]
                                            : current.filter((id) => id !== observation.id),
                                        )
                                      }
                                    />
                                    <span>
                                      <strong>{observation.activityTitle} · {observation.civilDate}</strong>
                                      {observation.studentName ? <small>{observation.studentName}</small> : null}
                                      <small>{observation.rawText}</small>
                                    </span>
                                  </label>
                                  <div className="premium-review-value-action">
                                    {observation.valueEvidenceEligible && observation.studentId ? (
                                      <button
                                        type="button"
                                        aria-expanded={editorOpen}
                                        aria-controls={`value-evidence-panel-${observation.id}`}
                                        onClick={(event) => {
                                          valueEvidenceTriggerRef.current =
                                            event.currentTarget;
                                          if (editorOpen) {
                                            closeValueEvidenceEditor();
                                          } else {
                                            setValueEvidenceEditorObservationId(
                                              observation.id,
                                            );
                                          }
                                        }}
                                      >
                                        {editorOpen
                                          ? "Değer kanıtı editörünü kapat"
                                          : "Değer eylemiyle ilişkilendir — isteğe bağlı"}
                                      </button>
                                    ) : (
                                      <small>
                                        Değer eylemi bağlantısı yalnız tek çocuklu, uygulanmış v3 değer snapshot’ı taşıyan gözlemde açılır.
                                      </small>
                                    )}
                                  </div>
                                  {editorOpen && observation.studentId ? (
                                    <div id={`value-evidence-panel-${observation.id}`}>
                                      <ValueEvidenceLinkEditor
                                        store={store}
                                        observationId={observation.id}
                                        studentId={observation.studentId}
                                        writesDisabled={valueEvidenceWritesDisabled}
                                        onClose={closeValueEvidenceEditor}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="premium-review-empty">Önce bu haftanın tam gün planından en az bir ham gözlem kaydedin.</p>
                        )}
                        <label htmlFor={`premium-review-evidence-${week.id}`}>Kanıt özeti</label>
                        <KeyboardTextarea
                          id={`premium-review-evidence-${week.id}`}
                          value={reviewEvidenceSummary}
                          onChange={(event) => setReviewEvidenceSummary(event.target.value)}
                          placeholder="Seçilen gözlemlerde ortaklaşan veya ayrışan kanıtları yazın."
                        />
                        <label htmlFor={`premium-review-reflection-${week.id}`}>Öğretmen değerlendirmesi</label>
                        <KeyboardTextarea
                          id={`premium-review-reflection-${week.id}`}
                          value={reviewReflection}
                          onChange={(event) => setReviewReflection(event.target.value)}
                          placeholder="Neyin işe yaradığını ve hangi uyarlamanın gerektiğini yazın."
                        />
                        <div className="premium-review-decisions" role="radiogroup" aria-label="Sonraki plan kararı">
                          {([
                            ["keep", "Aynen sürdür"],
                            ["adapt", "Uyarlayarak sürdür"],
                            ["replace", "Başka yolla değiştir"],
                            ["observe-more", "Ek gözlem gerekli"],
                          ] as const).map(([decision, label]) => (
                            <button
                              key={decision}
                              type="button"
                              role="radio"
                              aria-checked={reviewDecision === decision}
                              onClick={() => setReviewDecision(decision)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <button
                          className="premium-review-save"
                          type="button"
                          disabled={
                            reviewBusy ||
                            reviewObservationIds.length === 0 ||
                            !reviewEvidenceSummary.trim() ||
                            !reviewReflection.trim()
                          }
                          onClick={() => void saveWeeklyReview()}
                        >
                          {reviewBusy ? "Kaydediliyor…" : "Değerlendirmeyi kaydet ve sonraki haftaya taşı"}
                        </button>
                        {reviewMessage ? <p className="premium-review-message" role="status">{reviewMessage}</p> : null}
                        {reviewContext.evaluations.length > 0 ? (
                          <small>{reviewContext.evaluations.length} değerlendirme kaydı korunuyor.</small>
                        ) : null}
                      </section>
                    ) : null}
                  </section>
                ))}
              </div>
            </section>

            <section
              className="premium-section premium-monthly-evaluation"
              aria-labelledby="premium-monthly-evaluation-title"
            >
              <div className="premium-section-heading">
                <span>MEB 2024 · s. 136–139 ve Ek 18</span>
                <h2 id="premium-monthly-evaluation-title">Aylık değerlendirme</h2>
                <p>
                  Çocuklar, program ve öğretmen yönü ayrı kaydedilir. Sistem puan
                  vermez, kişilik hükmü kurmaz ve kanıt yetersizken beceri sonucu
                  uydurmaz.
                </p>
              </div>
              <button
                className="premium-week-review-button"
                type="button"
                disabled={!installed || monthlyReviewBusy || !premiumContentAllowed}
                onClick={() => void openMonthlyReview()}
              >
                {monthlyReviewContext
                  ? "Aylık değerlendirmeyi kapat"
                  : "Eylül ayını kanıtlar ve yansıtmayla değerlendir"}
              </button>
              {monthlyReviewContext ? (
                <section
                  className="premium-week-review premium-monthly-review-form"
                  aria-label="Eylül aylık değerlendirme formu"
                >
                  <div className="premium-monthly-coverage-summary">
                    <strong>Bu ay kullanılabilir kanıt kapsamı</strong>
                    <span>
                      {monthlyReviewContext.availableCoverage.observationCount} gözlem ·{" "}
                      {monthlyReviewContext.availableCoverage.anecdotalObservationCount} anekdot ·{" "}
                      {monthlyReviewContext.availableCoverage.distinctCivilDateCount} gün ·{" "}
                      {monthlyReviewContext.availableCoverage.distinctWeekCount} hafta ·{" "}
                      {monthlyReviewContext.availableCoverage.distinctStudentCount} çocuk ·{" "}
                      {monthlyReviewContext.availableCoverage.distinctEnvironmentCount} ortam ·{" "}
                      {monthlyReviewContext.availableCoverage.coveredActiveStudentCount}/
                      {monthlyReviewContext.availableCoverage.activeStudentCount} aktif çocuk temsil ediliyor
                    </span>
                    <small>
                      Bu özet hüküm değildir; öğretmenin seçebileceği mevcut kayıtların
                      kapsamını gösterir.
                    </small>
                  </div>

                  <details open>
                    <summary>1. Çocuklar yönünden · kanıt seçimi</summary>
                    <p>
                      Yeterli kanıt için en az iki gözlem, iki farklı gün ve iki farklı
                      hafta ve aktif sınıftaki her çocuğun en az bir kaydı gerekir. Her
                      seçili gözlem öğretmen onaylı en az bir program bağı taşımalıdır.
                    </p>
                    <div
                      className="premium-review-decisions"
                      role="radiogroup"
                      aria-label="Çocuklar yönü kanıt durumu"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={monthlyEvidenceState === "insufficient-evidence"}
                        onClick={() => setMonthlyEvidenceState("insufficient-evidence")}
                      >
                        Kanıt yetersiz
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={monthlyEvidenceState === "sufficient-evidence"}
                        onClick={() => setMonthlyEvidenceState("sufficient-evidence")}
                      >
                        Seçili kanıt yeterli
                      </button>
                    </div>
                    {monthlySelectedCoverage ? (
                      <p className="premium-monthly-selected-coverage">
                        Seçili kapsam: {monthlySelectedCoverage.observationCount} gözlem ·{" "}
                        {monthlySelectedCoverage.distinctCivilDateCount} gün ·{" "}
                        {monthlySelectedCoverage.distinctWeekCount} hafta ·{" "}
                        {monthlySelectedCoverage.distinctStudentCount} çocuk ·{" "}
                        {monthlySelectedCoverage.distinctEnvironmentCount} ortam ·{" "}
                        {monthlySelectedCoverage.curriculumLinkCount} program bağı ·{" "}
                        {monthlySelectedCoverage.coveredActiveStudentCount}/
                        {monthlySelectedCoverage.activeStudentCount} aktif çocuk temsil ediliyor
                      </p>
                    ) : null}
                    {monthlySelectedCoverage &&
                    monthlySelectedCoverage.uncoveredActiveStudentIds.length > 0 ? (
                      <p className="premium-review-empty">
                        {monthlyUncoveredStudentNames
                          ? `Seçili kanıtta henüz temsil edilmeyen çocuklar: ${monthlyUncoveredStudentNames.join(", ")}`
                          : `${monthlySelectedCoverage.uncoveredActiveStudentIds.length} aktif çocuk seçili kanıtta henüz temsil edilmiyor.`}
                      </p>
                    ) : null}
                    {monthlyEvidenceState === "sufficient-evidence" &&
                    (!monthlySelectedCoverage ||
                      !premiumMonthlyEvidenceMeetsMinimum(monthlySelectedCoverage)) ? (
                      <p className="premium-review-empty" role="alert">
                        Seçili kaynaklar tüm ay için yeterli kapsam oluşturmuyor. Kanıt
                        yetersiz durumunu koruyun veya farklı gün ve haftalardan bağlı
                        gözlem ekleyin.
                      </p>
                    ) : null}
                    {monthlyReviewContext.observations.length > 0 ? (
                      <div
                        className="premium-review-observations"
                        role="group"
                        aria-label="Aylık değerlendirme kanıtları"
                      >
                        {monthlyReviewContext.observations.map((observation) => {
                          const selected = monthlyObservationIds.includes(observation.id);
                          return (
                            <div className="premium-review-observation-row" key={observation.id}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={observation.curriculumLinks.length === 0}
                                  onChange={(event) =>
                                    toggleMonthlyObservation(
                                      observation.id,
                                      event.target.checked,
                                    )
                                  }
                                />
                                <span>
                                  <strong>
                                    {observation.civilDate} · {observation.weekTitle}
                                    {observation.anecdotal ? " · Anekdot" : ""}
                                  </strong>
                                  <small>
                                    {observation.activityTitle}
                                    {observation.environment
                                      ? ` · ${observation.environment}`
                                      : ""}
                                  </small>
                                  <small>{observation.rawText}</small>
                                </span>
                              </label>
                              {observation.curriculumLinks.length === 0 ? (
                                <small>
                                  Kanıt seçimine girmeden önce gözlemin program bağı
                                  öğretmen tarafından onaylanmalıdır.
                                </small>
                              ) : selected ? (
                                <div className="premium-monthly-link-list">
                                  {observation.curriculumLinks.map((link) => (
                                    <label key={link.id}>
                                      <input
                                        type="checkbox"
                                        checked={monthlyCurriculumLinkIds.includes(link.id)}
                                        onChange={(event) =>
                                          toggleMonthlyCurriculumLink(
                                            link.id,
                                            event.target.checked,
                                          )
                                        }
                                      />
                                      <span>
                                        {link.referenceCode} · {link.referenceTitle}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="premium-review-empty">
                        Bu aylık planın günlük kayıt zincirinde henüz değişmez gözlem yok.
                        Program ve öğretmen yansıtmasını yine kaydedebilir, çocuklar yönünü
                        “Kanıt yetersiz” bırakabilirsiniz.
                      </p>
                    )}
                    <label htmlFor="premium-monthly-child-narrative">
                      Çocuklar yönü öğretmen notu
                    </label>
                    <KeyboardTextarea
                      id="premium-monthly-child-narrative"
                      value={monthlyChildNarrative}
                      onChange={(event) => setMonthlyChildNarrative(event.target.value)}
                      placeholder="Seçili olay kayıtlarının ortaklaştığı ve ayrıştığı durumları yazın; kanıt yetersizse kesin beceri hükmü kurmayın."
                    />
                  </details>

                  <details>
                    <summary>2. Program yönünden · resmî ölçütler</summary>
                    <div className="premium-monthly-criteria-list">
                      {PREMIUM_MONTHLY_PROGRAM_CRITERIA.map((criterion) => {
                        const response = monthlyProgramCriteria.find(
                          (candidate) => candidate.criterionId === criterion.id,
                        );
                        return (
                          <label key={criterion.id}>
                            <span>{criterion.label}</span>
                            <select
                              value={response?.status ?? "not-observed"}
                              onChange={(event) =>
                                updateMonthlyProgramCriterion(
                                  criterion.id,
                                  event.target.value as PremiumMonthlyCriterionStatus,
                                )
                              }
                            >
                              {MONTHLY_CRITERION_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      })}
                    </div>
                    <label htmlFor="premium-monthly-program-narrative">
                      Program yönü öğretmen değerlendirmesi
                    </label>
                    <KeyboardTextarea
                      id="premium-monthly-program-narrative"
                      value={monthlyProgramNarrative}
                      onChange={(event) => setMonthlyProgramNarrative(event.target.value)}
                      placeholder="İşleyen ve aksayan yönleri; katılım, uygunluk, süre, ölçme, tutarlılık, çeşitlilik ve materyal açısından yazın."
                    />
                  </details>

                  <details>
                    <summary>3. Öğretmen yönünden · yansıtma</summary>
                    <p>
                      Bu bölüm puanlama veya kişilik değerlendirmesi değildir; öğretmenin
                      kendi planlama ve uygulama kararlarına dönük yansıtmasıdır.
                    </p>
                    <div className="premium-monthly-criteria-list">
                      {PREMIUM_MONTHLY_TEACHER_CRITERIA.map((criterion) => {
                        const response = monthlyTeacherCriteria.find(
                          (candidate) => candidate.criterionId === criterion.id,
                        );
                        return (
                          <label key={criterion.id}>
                            <span>{criterion.label}</span>
                            <select
                              value={response?.status ?? "not-observed"}
                              onChange={(event) =>
                                updateMonthlyTeacherCriterion(
                                  criterion.id,
                                  event.target.value as PremiumMonthlyCriterionStatus,
                                )
                              }
                            >
                              {MONTHLY_CRITERION_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      })}
                    </div>
                    <label htmlFor="premium-monthly-teacher-narrative">
                      Öğretmen yönü yansıtması
                    </label>
                    <KeyboardTextarea
                      id="premium-monthly-teacher-narrative"
                      value={monthlyTeacherNarrative}
                      onChange={(event) => setMonthlyTeacherNarrative(event.target.value)}
                      placeholder="Planlama, ortam, ölçme, farklılaştırma, katılım, materyal, zaman, iletişim, uyum ve fırsat eşitliği kararlarınızı düşünün."
                    />
                  </details>

                  <label htmlFor="premium-monthly-next-recommendation">
                    Sonraki ay için öğretmen önerisi
                  </label>
                  <KeyboardTextarea
                    id="premium-monthly-next-recommendation"
                    value={monthlyNextRecommendation}
                    onChange={(event) => setMonthlyNextRecommendation(event.target.value)}
                    placeholder="Neyi sürdüreceğinizi, neyi uyarlayacağınızı ve hangi yeni kanıtı toplayacağınızı yazın."
                  />

                  <button
                    className="premium-review-save"
                    type="button"
                    disabled={
                      monthlyReviewBusy ||
                      !monthlyProgramNarrative.trim() ||
                      !monthlyTeacherNarrative.trim() ||
                      !monthlyNextRecommendation.trim() ||
                      (monthlyEvidenceState === "sufficient-evidence" &&
                        (!monthlyChildNarrative.trim() ||
                          !monthlySelectedCoverage ||
                          !premiumMonthlyEvidenceMeetsMinimum(
                            monthlySelectedCoverage,
                          )))
                    }
                    onClick={() => void saveMonthlyReview()}
                  >
                    {monthlyReviewBusy
                      ? "Kaydediliyor…"
                      : "Aylık değerlendirmeyi yeni kayıt olarak ekle"}
                  </button>
                  {monthlyReviewMessage ? (
                    <p className="premium-review-message" role="status">
                      {monthlyReviewMessage}
                    </p>
                  ) : null}
                  {monthlyReviewContext.evaluations.length > 0 ? (
                    <details className="premium-monthly-history">
                      <summary>
                        Korunan aylık değerlendirme geçmişi ·{" "}
                        {monthlyReviewContext.evaluations.length} kayıt
                      </summary>
                      <ol>
                        {[...monthlyReviewContext.evaluations]
                          .reverse()
                          .map((evaluation) => (
                            <li key={evaluation.id}>
                              <strong>{evaluation.createdAt}</strong>
                              <span>
                                {evaluation.children.evidenceState ===
                                "insufficient-evidence"
                                  ? "Kanıt yetersiz"
                                  : "Seçili kanıt yeterli"}
                              </span>
                              <small>
                                Gözlem: {evaluation.children.observationIds.length} ·
                                Program bağı: {evaluation.children.curriculumLinkIds.length}
                              </small>
                              <button
                                type="button"
                                onClick={() => {
                                  loadMonthlyEvaluationIntoForm(evaluation);
                                  setSelectedMonthlyEvaluationId(evaluation.id);
                                  setMonthlyReviewMessage(
                                    "Seçili eski kayıt forma ve Ek 18 belge çıktısına açıldı. Kaydetme işlemi bu kaydı değiştirmez; yeni kayıt ekler.",
                                  );
                                }}
                              >
                                Bu kaydı belge için seç ve yeniden aç
                              </button>
                            </li>
                          ))}
                      </ol>
                    </details>
                  ) : null}
                </section>
              ) : null}
              <section
                className="premium-export-panel premium-monthly-document-export"
                aria-labelledby="premium-monthly-document-export-title"
              >
                <div>
                  <span>MEB 2024 · Ek 18 s. 344-349</span>
                  <h3 id="premium-monthly-document-export-title">
                    Aylık plan kontrol çizelgesi ve öğretmen değerlendirme eki
                  </h3>
                  <p>
                    Altı sayfalık resmî Ek 18 matrisi yalnız kalıcı aylık plandaki
                    doğrulanmış program bileşenlerinden işaretlenir. Çocuklar,
                    program ve öğretmen değerlendirmeleri resmî forma karıştırılmaz;
                    ayrı ve açıkça etiketli ekte korunur.
                  </p>
                </div>
                {selectedMonthlyEvaluationId ? (
                  <small>
                    Belge kaynağı: {latestMonthlyEvaluation?.id === selectedMonthlyEvaluationId
                      ? `son kalıcı değerlendirme · ${latestMonthlyEvaluation.createdAt}`
                      : "öğretmenin seçtiği geçmiş kalıcı değerlendirme"}
                  </small>
                ) : (
                  <small>
                    Belge için önce aylık değerlendirmeyi yeni kayıt olarak kaydedin.
                  </small>
                )}
                <div className="premium-export-actions">
                  <button
                    type="button"
                    data-testid="premium-monthly-ek18-pdf"
                    disabled={
                      !installed ||
                      !selectedMonthlyEvaluationId ||
                      monthlyExportBusy !== null ||
                      !premiumExportAllowed
                    }
                    onClick={() => void downloadMonthlyEvaluation("pdf")}
                  >
                    {monthlyExportBusy === "pdf"
                      ? "Ek 18 PDF hazırlanıyor…"
                      : "Ek 18 + ek PDF indir"}
                  </button>
                  <button
                    type="button"
                    data-testid="premium-monthly-ek18-word"
                    disabled={
                      !installed ||
                      !selectedMonthlyEvaluationId ||
                      monthlyExportBusy !== null ||
                      !premiumExportAllowed
                    }
                    onClick={() => void downloadMonthlyEvaluation("word")}
                  >
                    {monthlyExportBusy === "word"
                      ? "Ek 18 Word hazırlanıyor…"
                      : "Düzenlenebilir Word indir"}
                  </button>
                </div>
                {!premiumExportAllowed ? (
                  <small>
                    Ek 18 çıktısı doğrulanmış satın alma veya Kurucu Premium
                    erişimi olmadan açılmaz; deneme erişiminde kapalıdır.
                  </small>
                ) : null}
                {monthlyExportMessage ? (
                  <p className="premium-export-message" role="status">
                    {monthlyExportMessage}
                  </p>
                ) : null}
              </section>
            </section>

            <section
              className={`premium-install-panel${installed ? " premium-install-panel--installed" : ""}`}
            >
              {installed ? (
                <>
                  <CheckCircledIcon aria-hidden="true" />
                  <span><strong>Eylül plan paketi ve yıllık omurga sınıfa eklendi</strong><small>Eylül için {installed.weeklyPlanIds.length} hafta · {installed.activityCount} etkinlik · sürüm {installed.contentVersion}; Ekim–Haziran henüz yayımlanmadı</small></span>
                </>
              ) : (
                <>
                  <span><strong>Önce Eylül paketini ve yıllık omurgayı sınıfa ekleyin</strong><small>İşlem bir yıllık omurga, yalnız Eylül’e ait bir aylık plan ve dört haftalık kayıt oluşturur; var olan kayıtları değiştirmez.</small></span>
                  <button type="button" onClick={() => void install()} disabled={!eligible || busy || !premiumContentAllowed}>Eylül paketini + yıllık omurgayı ekle</button>
                </>
              )}
            </section>

            <section className="premium-export-panel" aria-labelledby="premium-export-title">
              <div>
                <span>Çevrimdışı belge merkezi</span>
                <h2 id="premium-export-title">Gerçek PDF ve Word dosyası</h2>
                <p>Kurulmuş Eylül planı ve yıllık omurgayla birlikte öğretmenin kaydettiği günlük uyarlamalar, haftalık değerlendirmeler ve varsa aylık üç boyutlu değerlendirme dosyaya aynen eklenir.</p>
              </div>
              <div className="premium-export-actions">
                <button
                  type="button"
                  data-testid="premium-export-pdf"
                  disabled={!installed || exportBusy !== null || !premiumExportAllowed}
                  onClick={() => void downloadPlan("pdf")}
                >
                  {exportBusy === "pdf" ? "PDF hazırlanıyor…" : "PDF indir"}
                </button>
                <button
                  type="button"
                  data-testid="premium-export-word"
                  disabled={!installed || exportBusy !== null || !premiumExportAllowed}
                  onClick={() => void downloadPlan("word")}
                >
                  {exportBusy === "word" ? "Word hazırlanıyor…" : "Word indir"}
                </button>
              </div>
              {!installed ? <small>Çıktı için önce seçili paketi sınıfa ekleyin.</small> : null}
              {!premiumExportAllowed ? <small>Belge çıktısı doğrulanmış satın alma veya Kurucu Premium yetkisi bağlanana kadar kapalıdır.</small> : null}
              {effectivePremiumAccess?.grant.accessMode === "trial" ? (
                <small>Deneme erişiminde PDF ve Word çıktısı kapalıdır.</small>
              ) : null}
              {exportMessage ? <p className="premium-export-message" role="status">{exportMessage}</p> : null}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default PremiumPlanCenterScreen;
