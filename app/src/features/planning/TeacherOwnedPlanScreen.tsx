import { useEffect, useMemo, useState } from "react";
import {
  ArchiveIcon,
  CalendarIcon,
  ChevronRightIcon,
  Cross2Icon,
  DownloadIcon,
  FileTextIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";

import type {
  CreateTeacherOwnedPlanGraphInput,
  TeacherNextPlanDecision,
  TeacherOwnedPlanGraph,
  TeacherOwnedPlanRecord,
  TeacherOwnedWeeklyPlan,
} from "../../core/domain/teacher-owned-plan.ts";
import {
  teacherMonthlyEvidenceMeetsMinimum,
  TEACHER_MONTHLY_PROGRAM_CRITERIA,
  TEACHER_MONTHLY_TEACHER_CRITERIA,
  type TeacherMonthlyCriterionResponse,
  type TeacherMonthlyCriterionStatus,
  type TeacherMonthlyEvidenceCoverage,
} from "../../core/domain/teacher-owned-monthly-evaluation.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { KeyboardInput, KeyboardTextarea } from "../../mobile";
import type { TeacherWorkCycleWorkspace } from "../teacher-cycle/teacher-work-cycle.ts";
import type { PremiumContentPack } from "../premium-plans/domain.ts";
import { loadPremiumPilotPreviewPack } from "../premium-plans/content-repository.ts";
import {
  loadInstalledPremiumPlanExportSource,
  type InstalledPremiumPlanExportSource,
} from "../premium-plans/export-read-model.ts";
import type { PremiumPlanExportFormat } from "../premium-plans/export-document.ts";
import type { PlanWorkbenchLevelId } from "./plan-workbench-model.ts";
import type { ScheduledPlanSummary } from "./scheduled-plan-workspace.ts";
import {
  buildStandaloneTeacherOwnedPlanPreview,
  generateStandaloneTeacherOwnedPlanExportFile,
  generateTeacherOwnedPlanExportFile,
  type TeacherOwnedPlanDocumentScope,
} from "./teacher-owned-plan-document.ts";
import {
  loadTeacherOwnedPlanGraph,
  loadTeacherOwnedPlanStarterDraft,
  loadTeacherMonthlyReviewContext,
  loadTeacherWeeklyReviewContext,
  type ReviewTeacherWeeklyCarryInput,
  type ReviewTeacherMonthlyCarryInput,
  type RecordTeacherMonthlyEvaluationInput,
  type RecordTeacherWeeklyEvaluationInput,
  type ReviseTeacherOwnedPlanInput,
  type TeacherOwnedPlanStarterDraft,
  type TeacherMonthlyReviewContext,
  type TeacherWeeklyReviewContext,
} from "./teacher-owned-plan-service.ts";
import "./teacher-owned-plan.css";

export interface TeacherOwnedPlanScreenProps {
  store: LocalDataStore;
  workspace: TeacherWorkCycleWorkspace;
  scheduledPlans: readonly ScheduledPlanSummary[];
  initialLevel: Exclude<PlanWorkbenchLevelId, "daily">;
  contentPack?: PremiumContentPack | null;
  educationalWritesDisabled?: boolean;
  educationalWriteNotice?: string | null;
  onClose(): void;
  onOpenProviderLibrary(): void;
  onViewDailyPlan(plan: ScheduledPlanSummary): void;
  onEditDailyPlan(plan: ScheduledPlanSummary): void;
  onCreatePlanGraph(input: CreateTeacherOwnedPlanGraphInput): Promise<TeacherOwnedPlanGraph>;
  onRevisePlan(input: ReviseTeacherOwnedPlanInput): Promise<TeacherOwnedPlanRecord>;
  onRecordWeeklyEvaluation(
    input: RecordTeacherWeeklyEvaluationInput,
  ): Promise<void>;
  onReviewWeeklyCarry(input: ReviewTeacherWeeklyCarryInput): Promise<void>;
  onReviewMonthlyCarry(input: ReviewTeacherMonthlyCarryInput): Promise<void>;
  onRecordMonthlyEvaluation(
    input: RecordTeacherMonthlyEvaluationInput,
  ): Promise<void>;
}

function defaultMonthlyCriteria(
  criteria: readonly (readonly [string, string])[],
): TeacherMonthlyCriterionResponse[] {
  return criteria.map(([criterionId]) => ({
    criterionId,
    status: "not-observed",
  }));
}

function downloadFile(file: {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
}): void {
  const blob = new Blob([file.bytes as BlobPart], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatCivilDate(civilDate: string): string {
  const [year, month, day] = civilDate.split("-").map(Number);
  if (!year || !month || !day) return civilDate;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function narrativeFromRecord(record: TeacherOwnedPlanRecord): string {
  const narrative = record.teacherContent.narrative;
  if (typeof narrative === "string") return narrative;
  return Object.values(record.teacherContent)
    .flatMap((value) =>
      Array.isArray(value)
        ? value.map((item) => String(item))
        : typeof value === "string"
          ? [value]
          : [],
    )
    .join("\n");
}

export function TeacherOwnedPlanScreen({
  store,
  workspace,
  scheduledPlans,
  initialLevel,
  contentPack = null,
  educationalWritesDisabled = false,
  educationalWriteNotice = null,
  onClose,
  onOpenProviderLibrary,
  onViewDailyPlan,
  onEditDailyPlan,
  onCreatePlanGraph,
  onRevisePlan,
  onRecordWeeklyEvaluation,
  onReviewWeeklyCarry,
  onReviewMonthlyCarry,
  onRecordMonthlyEvaluation,
}: TeacherOwnedPlanScreenProps) {
  const [pack, setPack] = useState<PremiumContentPack | null>(contentPack);
  const [source, setSource] = useState<InstalledPremiumPlanExportSource | null>(null);
  const [teacherGraph, setTeacherGraph] = useState<TeacherOwnedPlanGraph | null>(null);
  const [starter, setStarter] = useState<TeacherOwnedPlanStarterDraft | null>(null);
  const [annualNarrative, setAnnualNarrative] = useState("");
  const [monthlyNarrative, setMonthlyNarrative] = useState("");
  const [weeklyNarrative, setWeeklyNarrative] = useState("");
  const [nextMonthNarrative, setNextMonthNarrative] = useState("");
  const [busy, setBusy] = useState(true);
  const [saveBusy, setSaveBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState<PremiumPlanExportFormat | null>(null);
  const [documentScopeKind, setDocumentScopeKind] = useState<
    TeacherOwnedPlanDocumentScope["kind"]
  >("combined");
  const [documentMonthlyPlanId, setDocumentMonthlyPlanId] = useState("");
  const [documentWeeklyPlanId, setDocumentWeeklyPlanId] = useState("");
  const [documentDailyPlanId, setDocumentDailyPlanId] = useState("");
  const [documentPreview, setDocumentPreview] = useState<{
    signature: string;
    lines: string[];
  } | null>(null);
  const [documentPreviewBusy, setDocumentPreviewBusy] = useState(false);
  const [documentApproved, setDocumentApproved] = useState(false);
  const [message, setMessage] = useState("");
  const [editingPlan, setEditingPlan] = useState<TeacherOwnedPlanRecord | null>(null);
  const [revisionTitle, setRevisionTitle] = useState("");
  const [revisionNarrative, setRevisionNarrative] = useState("");
  const [reviewContext, setReviewContext] =
    useState<TeacherWeeklyReviewContext | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [selectedObservationIds, setSelectedObservationIds] = useState<string[]>([]);
  const [weeklyEvidenceSummary, setWeeklyEvidenceSummary] = useState("");
  const [weeklyReflection, setWeeklyReflection] = useState("");
  const [weeklyDecision, setWeeklyDecision] =
    useState<TeacherNextPlanDecision>("adapt");
  const [carryReviewWeekly, setCarryReviewWeekly] =
    useState<TeacherOwnedWeeklyPlan | null>(null);
  const [carryReviewBusy, setCarryReviewBusy] = useState(false);
  const [carryTeacherNote, setCarryTeacherNote] = useState("");
  const [carryAcceptedNarrative, setCarryAcceptedNarrative] = useState("");
  const [monthlyReviewContext, setMonthlyReviewContext] =
    useState<TeacherMonthlyReviewContext | null>(null);
  const [monthlyReviewBusy, setMonthlyReviewBusy] = useState(false);
  const [selectedMonthlyObservationIds, setSelectedMonthlyObservationIds] =
    useState<string[]>([]);
  const [selectedMonthlyLinkIds, setSelectedMonthlyLinkIds] = useState<string[]>([]);
  const [monthlyEvidenceState, setMonthlyEvidenceState] =
    useState<"sufficient-evidence" | "insufficient-evidence">("insufficient-evidence");
  const [monthlyChildNarrative, setMonthlyChildNarrative] = useState("");
  const [monthlyProgramNarrative, setMonthlyProgramNarrative] = useState("");
  const [monthlyTeacherNarrative, setMonthlyTeacherNarrative] = useState("");
  const [monthlyNextRecommendation, setMonthlyNextRecommendation] = useState("");
  const [monthlyCarryReviewPlan, setMonthlyCarryReviewPlan] =
    useState<TeacherOwnedPlanRecord | null>(null);
  const [monthlyCarryReviewBusy, setMonthlyCarryReviewBusy] = useState(false);
  const [monthlyCarryTeacherNote, setMonthlyCarryTeacherNote] = useState("");
  const [monthlyCarryAcceptedNarrative, setMonthlyCarryAcceptedNarrative] =
    useState("");
  const [monthlyProgramCriteria, setMonthlyProgramCriteria] = useState<
    TeacherMonthlyCriterionResponse[]
  >(() => defaultMonthlyCriteria(TEACHER_MONTHLY_PROGRAM_CRITERIA));
  const [monthlyTeacherCriteria, setMonthlyTeacherCriteria] = useState<
    TeacherMonthlyCriterionResponse[]
  >(() => defaultMonthlyCriteria(TEACHER_MONTHLY_TEACHER_CRITERIA));

  useEffect(() => {
    let active = true;
    setBusy(true);
    void Promise.all([
      loadTeacherOwnedPlanGraph(store),
      loadTeacherOwnedPlanStarterDraft(store, { civilDate: workspace.civilDate }),
    ])
      .then(async ([graph, starterDraft]) => {
        if (!active) return;
        setTeacherGraph(graph);
        setStarter(starterDraft);
        const annualPlanId = workspace.annual?.id;
        if (!graph && annualPlanId) {
          try {
            const resolvedPack = contentPack ?? await loadPremiumPilotPreviewPack();
            const resolvedSource = await loadInstalledPremiumPlanExportSource(
              store,
              resolvedPack,
              annualPlanId,
            );
            if (!active) return;
            setPack(resolvedPack);
            setSource(resolvedSource);
          } catch {
            if (!active) return;
            setPack(contentPack);
            setSource(null);
          }
        }
        setMessage("");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setMessage(
          reason instanceof Error
            ? reason.message
            : "Öğretmen planı çalışma alanı hazırlanamadı.",
        );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [contentPack, store, workspace.annual?.id, workspace.civilDate]);

  const dailyPlans = useMemo(
    () =>
      [...scheduledPlans].sort(
        (left, right) =>
          left.civilDate.localeCompare(right.civilDate) ||
          left.planTitle.localeCompare(right.planTitle, "tr-TR"),
      ),
    [scheduledPlans],
  );
  const monthlyDocumentOptions = teacherGraph?.months.map(({ monthly }) => monthly) ?? [];
  const weeklyDocumentOptions = teacherGraph?.months.flatMap(({ weeks }) => weeks) ?? [];

  useEffect(() => {
    if (!documentMonthlyPlanId && monthlyDocumentOptions[0]) {
      setDocumentMonthlyPlanId(monthlyDocumentOptions[0].id);
    }
    if (!documentWeeklyPlanId && weeklyDocumentOptions[0]) {
      setDocumentWeeklyPlanId(weeklyDocumentOptions[0].id);
    }
    if (!documentDailyPlanId && dailyPlans[0]) {
      setDocumentDailyPlanId(dailyPlans[0].planId);
    }
  }, [
    dailyPlans,
    documentDailyPlanId,
    documentMonthlyPlanId,
    documentWeeklyPlanId,
    monthlyDocumentOptions,
    weeklyDocumentOptions,
  ]);
  const selectedMonthlyCoverage = useMemo<TeacherMonthlyEvidenceCoverage>(() => {
    const observations = (monthlyReviewContext?.observations ?? []).filter(
      (observation) => selectedMonthlyObservationIds.includes(observation.id),
    );
    const activeStudentIds = (monthlyReviewContext?.activeStudents ?? []).map(
      (student) => student.id,
    );
    const activeSet = new Set(activeStudentIds);
    const coveredActiveStudentIds = [...new Set(
      observations.flatMap((observation) => observation.studentIds),
    )]
      .filter((studentId) => activeSet.has(studentId))
      .sort((left, right) => left.localeCompare(right));
    const coveredSet = new Set(coveredActiveStudentIds);
    return {
      observationCount: observations.length,
      curriculumLinkCount: observations.reduce(
        (total, observation) =>
          total + observation.curriculumLinks.filter((link) =>
            selectedMonthlyLinkIds.includes(link.id),
          ).length,
        0,
      ),
      distinctCivilDateCount: new Set(
        observations.map((observation) => observation.civilDate),
      ).size,
      distinctWeekCount: new Set(
        observations.map((observation) => observation.weeklyPlanId),
      ).size,
      activeStudentIds,
      coveredActiveStudentIds,
      uncoveredActiveStudentIds: activeStudentIds.filter(
        (studentId) => !coveredSet.has(studentId),
      ),
    };
  }, [monthlyReviewContext, selectedMonthlyLinkIds, selectedMonthlyObservationIds]);
  const selectedMonthlyEvidenceIsSufficient =
    teacherMonthlyEvidenceMeetsMinimum(selectedMonthlyCoverage);
  const missingMonthlyStudentNames = (monthlyReviewContext?.activeStudents ?? [])
    .filter((student) =>
      selectedMonthlyCoverage.uncoveredActiveStudentIds.includes(student.id),
    )
    .map((student) => student.displayName ?? "Adı eksik çocuk");

  const createStarterPlan = async () => {
    if (!starter || saveBusy) return;
    setSaveBusy(true);
    setMessage("");
    try {
      const graph = await onCreatePlanGraph({
        title: starter.annualTitle,
        periodStart: starter.annualPeriodStart,
        periodEnd: starter.annualPeriodEnd,
        teacherContent: { narrative: annualNarrative.trim() },
        months: [
          {
            title: starter.monthTitle,
            monthKey: starter.monthKey,
            periodStart: starter.monthPeriodStart,
            periodEnd: starter.monthPeriodEnd,
            teacherContent: { narrative: monthlyNarrative.trim() },
            weeks: [
              {
                title: starter.weekTitle,
                weekKey: starter.weekKey,
                periodStart: starter.weekPeriodStart,
                periodEnd: starter.weekPeriodEnd,
                teacherContent: { narrative: weeklyNarrative.trim() },
              },
              ...(starter.nextWeekTitle &&
              starter.nextWeekKey &&
              starter.nextWeekPeriodStart &&
              starter.nextWeekPeriodEnd
                ? [{
                    title: starter.nextWeekTitle,
                    weekKey: starter.nextWeekKey,
                    periodStart: starter.nextWeekPeriodStart,
                    periodEnd: starter.nextWeekPeriodEnd,
                    teacherContent: {
                      narrative:
                        "Önceki haftanın kanıtı incelendikten sonra öğretmen tarafından netleştirilecek.",
                    },
                  }]
                : []),
            ],
          },
          ...(starter.nextMonthTitle &&
          starter.nextMonthKey &&
          starter.nextMonthPeriodStart &&
          starter.nextMonthPeriodEnd &&
          starter.nextMonthWeekTitle &&
          starter.nextMonthWeekKey &&
          starter.nextMonthWeekPeriodStart &&
          starter.nextMonthWeekPeriodEnd
            ? [{
                title: starter.nextMonthTitle,
                monthKey: starter.nextMonthKey,
                periodStart: starter.nextMonthPeriodStart,
                periodEnd: starter.nextMonthPeriodEnd,
                teacherContent: { narrative: nextMonthNarrative.trim() },
                weeks: [{
                  title: starter.nextMonthWeekTitle,
                  weekKey: starter.nextMonthWeekKey,
                  periodStart: starter.nextMonthWeekPeriodStart,
                  periodEnd: starter.nextMonthWeekPeriodEnd,
                  teacherContent: {
                    narrative:
                      "Aylık değerlendirme kararı sonrasında öğretmen tarafından netleştirilecek.",
                    draftStatus: "pending-teacher-review",
                  },
                }],
              }]
            : []),
        ],
      });
      setTeacherGraph(graph);
      setMessage("Yıl → ay → hafta plan zinciri tek işlemde bu cihaza kaydedildi.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Plan zinciri kaydedilemedi.");
    } finally {
      setSaveBusy(false);
    }
  };

  const beginRevision = (record: TeacherOwnedPlanRecord) => {
    setEditingPlan(record);
    setRevisionTitle(record.title);
    setRevisionNarrative(narrativeFromRecord(record));
    setMessage("");
  };

  const saveRevision = async () => {
    if (!editingPlan || saveBusy) return;
    setSaveBusy(true);
    setMessage("");
    try {
      await onRevisePlan({
        planId: editingPlan.id,
        expectedUpdatedAt: editingPlan.updatedAt,
        title: revisionTitle,
        teacherContent: {
          ...editingPlan.teacherContent,
          narrative: revisionNarrative.trim(),
        },
      });
      setTeacherGraph(await loadTeacherOwnedPlanGraph(store));
      setEditingPlan(null);
      setMessage("Plan revizyonu önceki sürüm korunarak kaydedildi.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Plan revizyonu kaydedilemedi.");
    } finally {
      setSaveBusy(false);
    }
  };

  const beginWeeklyReview = async (weekly: TeacherOwnedWeeklyPlan) => {
    if (reviewBusy || educationalWritesDisabled) return;
    setReviewBusy(true);
    setMessage("");
    try {
      const context = await loadTeacherWeeklyReviewContext(store, weekly.id);
      setReviewContext(context);
      setSelectedObservationIds(context.observations.map((observation) => observation.id));
      setWeeklyEvidenceSummary("");
      setWeeklyReflection("");
      setWeeklyDecision("adapt");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Haftalık değerlendirme kanıtları açılamadı.",
      );
    } finally {
      setReviewBusy(false);
    }
  };

  const saveWeeklyReview = async () => {
    if (!reviewContext || reviewBusy || educationalWritesDisabled) return;
    setReviewBusy(true);
    setMessage("");
    try {
      await onRecordWeeklyEvaluation({
        weeklyPlanId: reviewContext.weekly.id,
        expectedWeeklyUpdatedAt: reviewContext.weekly.updatedAt,
        reflection: weeklyReflection,
        evidenceSummary: weeklyEvidenceSummary,
        observationIds: selectedObservationIds,
        nextPlanDecision: weeklyDecision,
      });
      setTeacherGraph(await loadTeacherOwnedPlanGraph(store));
      setReviewContext(null);
      setSelectedObservationIds([]);
      setMessage(
        "Haftalık değerlendirme kaydedildi; sonraki hafta için öneri yalnız öğretmen incelemesine taşındı.",
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Haftalık değerlendirme kaydedilemedi.",
      );
    } finally {
      setReviewBusy(false);
    }
  };

  const beginCarryReview = (weekly: TeacherOwnedWeeklyPlan) => {
    if (educationalWritesDisabled) return;
    setCarryReviewWeekly(weekly);
    setCarryTeacherNote("");
    setCarryAcceptedNarrative(narrativeFromRecord(weekly));
    setMessage("");
  };

  const submitCarryReview = async (
    action: ReviewTeacherWeeklyCarryInput["action"],
  ) => {
    const context = carryReviewWeekly?.nextPlanDecisionContext;
    if (
      !carryReviewWeekly ||
      !context ||
      carryReviewBusy ||
      educationalWritesDisabled
    ) return;
    setCarryReviewBusy(true);
    setMessage("");
    try {
      await onReviewWeeklyCarry({
        weeklyPlanId: carryReviewWeekly.id,
        expectedWeeklyUpdatedAt: carryReviewWeekly.updatedAt,
        expectedEvaluationId: context.evaluationId,
        action,
        teacherNote: carryTeacherNote,
        acceptedNarrative:
          action === "accepted" ? carryAcceptedNarrative : undefined,
      });
      setTeacherGraph(await loadTeacherOwnedPlanGraph(store));
      setCarryReviewWeekly(null);
      setMessage(
        action === "accepted"
          ? "Öneri öğretmenin son düzenlemesiyle kabul edildi ve haftalık planın yeni revizyonuna uygulandı."
          : action === "rejected"
            ? "Öneri gerekçesiyle reddedildi; haftalık plan içeriği değiştirilmedi."
            : "Karar yeniden açıldı; kabul edilen plan içeriği önceki sürüme geri alındı.",
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Haftalık öneri kararı kaydedilemedi.",
      );
    } finally {
      setCarryReviewBusy(false);
    }
  };

  const beginMonthlyReview = async (monthly: TeacherOwnedPlanRecord) => {
    if (
      monthly.planType !== "monthly" ||
      monthlyReviewBusy ||
      educationalWritesDisabled
    ) return;
    setMonthlyReviewBusy(true);
    setMessage("");
    try {
      const context = await loadTeacherMonthlyReviewContext(store, monthly.id);
      setMonthlyReviewContext(context);
      const usable = context.observations.filter(
        (observation) => observation.curriculumLinks.length > 0,
      );
      setSelectedMonthlyObservationIds(usable.map((observation) => observation.id));
      setSelectedMonthlyLinkIds(
        usable.flatMap((observation) => observation.curriculumLinks.map((link) => link.id)),
      );
      setMonthlyEvidenceState(
        teacherMonthlyEvidenceMeetsMinimum(context.availableCoverage)
          ? "sufficient-evidence"
          : "insufficient-evidence",
      );
      setMonthlyChildNarrative("");
      setMonthlyProgramNarrative("");
      setMonthlyTeacherNarrative("");
      setMonthlyNextRecommendation("");
      setMonthlyProgramCriteria(defaultMonthlyCriteria(TEACHER_MONTHLY_PROGRAM_CRITERIA));
      setMonthlyTeacherCriteria(defaultMonthlyCriteria(TEACHER_MONTHLY_TEACHER_CRITERIA));
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Aylık değerlendirme kanıtları açılamadı.",
      );
    } finally {
      setMonthlyReviewBusy(false);
    }
  };

  const saveMonthlyReview = async () => {
    if (!monthlyReviewContext || monthlyReviewBusy || educationalWritesDisabled) return;
    setMonthlyReviewBusy(true);
    setMessage("");
    try {
      await onRecordMonthlyEvaluation({
        monthlyPlanId: monthlyReviewContext.monthly.id,
        expectedMonthlyUpdatedAt: monthlyReviewContext.monthly.updatedAt,
        childEvidenceState: monthlyEvidenceState,
        childNarrative: monthlyChildNarrative,
        observationIds: selectedMonthlyObservationIds,
        curriculumLinkIds: selectedMonthlyLinkIds,
        programCriteria: monthlyProgramCriteria,
        programNarrative: monthlyProgramNarrative,
        teacherCriteria: monthlyTeacherCriteria,
        teacherNarrative: monthlyTeacherNarrative,
        nextMonthRecommendation: monthlyNextRecommendation,
      });
      setTeacherGraph(await loadTeacherOwnedPlanGraph(store));
      setMonthlyReviewContext(null);
      setMessage(
        "Aylık üç yönlü değerlendirme kaydedildi; sonraki ay önerisi öğretmen kaydı olarak korundu.",
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Aylık öğretmen değerlendirmesi kaydedilemedi.",
      );
    } finally {
      setMonthlyReviewBusy(false);
    }
  };

  const beginMonthlyCarryReview = (monthly: TeacherOwnedPlanRecord) => {
    if (
      monthly.planType !== "monthly" ||
      !monthly.nextMonthDecisionContext ||
      educationalWritesDisabled
    ) return;
    setMonthlyCarryReviewPlan(monthly);
    setMonthlyCarryTeacherNote("");
    setMonthlyCarryAcceptedNarrative(narrativeFromRecord(monthly));
    setMessage("");
  };

  const submitMonthlyCarryReview = async (
    action: ReviewTeacherMonthlyCarryInput["action"],
  ) => {
    if (
      !monthlyCarryReviewPlan ||
      monthlyCarryReviewPlan.planType !== "monthly" ||
      !monthlyCarryReviewPlan.nextMonthDecisionContext ||
      monthlyCarryReviewBusy ||
      educationalWritesDisabled
    ) return;
    setMonthlyCarryReviewBusy(true);
    setMessage("");
    try {
      await onReviewMonthlyCarry({
        monthlyPlanId: monthlyCarryReviewPlan.id,
        expectedMonthlyUpdatedAt: monthlyCarryReviewPlan.updatedAt,
        expectedEvaluationId:
          monthlyCarryReviewPlan.nextMonthDecisionContext.evaluationId,
        action,
        teacherNote: monthlyCarryTeacherNote,
        acceptedNarrative:
          action === "accepted" ? monthlyCarryAcceptedNarrative : undefined,
      });
      setTeacherGraph(await loadTeacherOwnedPlanGraph(store));
      setMonthlyCarryReviewPlan(null);
      setMessage(
        action === "accepted"
          ? "Sonraki ay önerisi öğretmenin son metniyle kabul edildi ve yeni revizyona uygulandı."
          : action === "rejected"
            ? "Sonraki ay önerisi gerekçesiyle reddedildi; plan içeriği değiştirilmedi."
            : "Aylık karar yeniden açıldı; kabul edilen içerik önceki sürüme geri alındı.",
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Sonraki ay öneri kararı kaydedilemedi.",
      );
    } finally {
      setMonthlyCarryReviewBusy(false);
    }
  };

  const updateMonthlyCriterion = (
    axis: "program" | "teacher",
    criterionId: string,
    status: TeacherMonthlyCriterionStatus,
  ) => {
    const update = (items: TeacherMonthlyCriterionResponse[]) =>
      items.map((item) => item.criterionId === criterionId ? { ...item, status } : item);
    if (axis === "program") setMonthlyProgramCriteria(update);
    else setMonthlyTeacherCriteria(update);
  };

  const selectedDocumentScope = (): TeacherOwnedPlanDocumentScope => {
    if (documentScopeKind === "daily") {
      if (!documentDailyPlanId) throw new Error("Önizleme için bir günlük plan seçin.");
      return { kind: "daily", dailyPlanId: documentDailyPlanId };
    }
    if (documentScopeKind === "weekly") {
      if (!documentWeeklyPlanId) throw new Error("Önizleme için bir hafta seçin.");
      return { kind: "weekly", weeklyPlanId: documentWeeklyPlanId };
    }
    if (documentScopeKind === "monthly") {
      if (!documentMonthlyPlanId) throw new Error("Önizleme için bir ay seçin.");
      return { kind: "monthly", monthlyPlanId: documentMonthlyPlanId };
    }
    return { kind: "combined" };
  };

  const resetDocumentApproval = () => {
    setDocumentPreview(null);
    setDocumentApproved(false);
  };

  const previewDocument = async () => {
    if (!teacherGraph || documentPreviewBusy) return;
    setDocumentPreviewBusy(true);
    setMessage("");
    setDocumentApproved(false);
    try {
      const paragraphs = await buildStandaloneTeacherOwnedPlanPreview(
        teacherGraph,
        store,
        selectedDocumentScope(),
      );
      const lines = paragraphs.map((paragraph) => paragraph.text);
      setDocumentPreview({ signature: JSON.stringify(lines), lines });
    } catch (reason) {
      setDocumentPreview(null);
      setMessage(reason instanceof Error ? reason.message : "Belge önizlemesi hazırlanamadı.");
    } finally {
      setDocumentPreviewBusy(false);
    }
  };

  const exportPlan = async (format: PremiumPlanExportFormat) => {
    if (exportBusy) return;
    setExportBusy(format);
    setMessage("");
    try {
      if (teacherGraph) {
        if (!documentPreview || !documentApproved) {
          throw new Error("Önce belge kapsamını önizleyip öğretmen onayını verin.");
        }
        const file = await generateStandaloneTeacherOwnedPlanExportFile(
          teacherGraph,
          store,
          format,
          selectedDocumentScope(),
        );
        const signature = JSON.stringify(file.paragraphs.map((paragraph) => paragraph.text));
        if (signature !== documentPreview.signature) {
          setDocumentPreview(null);
          setDocumentApproved(false);
          throw new Error("Plan kaydı önizlemeden sonra değişti. Güncel belgeyi yeniden önizleyin.");
        }
        downloadFile(file);
      } else if (pack && source) {
        downloadFile(await generateTeacherOwnedPlanExportFile(pack, source, format));
      } else {
        throw new Error("Belge için doğrulanmış bir plan zinciri bulunamadı.");
      }
      setMessage(
        `${format === "pdf" ? "PDF" : "Word"} belgesi bu cihazdaki kalıcı öğretmen planından hazırlandı.`,
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Plan belgesi hazırlanamadı.");
    } finally {
      setExportBusy(null);
    }
  };

  const exportReady = teacherGraph !== null || (pack !== null && source !== null);
  return (
    <div className="teacher-owned-plan-shell">
      <header className="teacher-owned-plan-header">
        <button type="button" onClick={onClose} aria-label="Plan kayıtlarını kapat">
          <Cross2Icon aria-hidden="true" />
        </button>
        <div>
          <span>Öğretmenin kendi çalışma alanı</span>
          <h1>Plan zincirim</h1>
        </div>
        <ArchiveIcon aria-hidden="true" />
      </header>

      <main className="teacher-owned-plan-scroll">
        <section className="teacher-owned-plan-notice" role="status">
          <strong>Plan emeğiniz premium kilidinden bağımsızdır</strong>
          <p>
            Kendi Yıl → Ay → Hafta planınızı oluşturabilir, revize edebilir ve
            temel PDF/Word belgesini alabilirsiniz. Hazır içerik kütüphanesi ayrı kalır.
          </p>
        </section>

        {busy ? <p className="teacher-owned-plan-status">Plan kayıtları doğrulanıyor…</p> : null}
        {message ? <p className="teacher-owned-plan-status" role="status">{message}</p> : null}
        {educationalWritesDisabled ? (
          <p
            className="teacher-owned-plan-status"
            id="teacher-owned-evaluation-write-notice"
            role="status"
          >
            <strong>
              {teacherGraph
                ? "Plan omurgası hazır; günlük uygulama dönem başlayınca açılır."
                : "Plan omurgası hazırlanabilir."}
            </strong>{" "}
            {educationalWriteNotice ??
              "Haftalık ve aylık değerlendirmeler, ilgili eğitim yılı etkin olduğunda açılır."}
          </p>
        ) : null}

        {!busy && !teacherGraph && starter ? (
          <section className="teacher-owned-plan-starter" aria-labelledby="teacher-plan-starter-title">
            <div className="teacher-owned-plan-section-heading">
              <span>İlk plan omurgası</span>
              <h2 id="teacher-plan-starter-title">Dört kısa kararla başlayın</h2>
              <p>
                Tarihler etkin eğitim yılından otomatik alındı. Kaydettiğinizde yıllık,
                aylık ve haftalık kayıtlar birlikte oluşturulur.
              </p>
            </div>
            <div className="teacher-owned-plan-period-preview">
              <strong>{starter.annualTitle}</strong>
              <span>{formatCivilDate(starter.annualPeriodStart)} – {formatCivilDate(starter.annualPeriodEnd)}</span>
              <small>
                {starter.monthTitle} · {starter.weekTitle}
                {starter.nextWeekTitle ? ` · ${starter.nextWeekTitle}` : ""}
                {starter.nextMonthTitle ? ` · ${starter.nextMonthTitle}` : ""}
              </small>
            </div>
            <label htmlFor="teacher-plan-annual-narrative">Bu yıl sınıfınız için en önemli öncelik nedir?</label>
            <KeyboardTextarea
              id="teacher-plan-annual-narrative"
              value={annualNarrative}
              onChange={(event) => setAnnualNarrative(event.target.value)}
              maxLength={2000}
              placeholder="Örn. güvenli sınıf topluluğu ve her çocuğun katılımı"
            />
            <label htmlFor="teacher-plan-monthly-narrative">Bu ay neye odaklanacaksınız?</label>
            <KeyboardTextarea
              id="teacher-plan-monthly-narrative"
              value={monthlyNarrative}
              onChange={(event) => setMonthlyNarrative(event.target.value)}
              maxLength={2000}
              placeholder="Örn. uyum, aidiyet ve sınıf rutinleri"
            />
            <label htmlFor="teacher-plan-weekly-narrative">Bu haftanın öğretmen akışı nedir?</label>
            <KeyboardTextarea
              id="teacher-plan-weekly-narrative"
              value={weeklyNarrative}
              onChange={(event) => setWeeklyNarrative(event.target.value)}
              maxLength={2000}
              placeholder="Örn. karşılama, oyun, açık hava ve günlük gözlem"
            />
            {starter.nextMonthTitle ? (
              <>
                <label htmlFor="teacher-plan-next-month-narrative">
                  Sonraki ay için başlangıç niyetiniz nedir?
                </label>
                <KeyboardTextarea
                  id="teacher-plan-next-month-narrative"
                  value={nextMonthNarrative}
                  onChange={(event) => setNextMonthNarrative(event.target.value)}
                  maxLength={2000}
                  placeholder="Örn. ilk ayın kanıtlarına göre katılım yollarını çeşitlendirmek"
                />
              </>
            ) : null}
            <button
              type="button"
              className="teacher-owned-plan-primary"
              onClick={() => void createStarterPlan()}
              disabled={
                saveBusy ||
                annualNarrative.trim().length < 3 ||
                monthlyNarrative.trim().length < 3 ||
                weeklyNarrative.trim().length < 3 ||
                (starter.nextMonthTitle !== null &&
                  nextMonthNarrative.trim().length < 3)
              }
            >
              {saveBusy ? "Plan zinciri kaydediliyor…" : "Yıl → ay → hafta planını oluştur"}
            </button>
          </section>
        ) : null}

        {teacherGraph ? (
          <section className="teacher-owned-plan-tree" aria-labelledby="teacher-plan-tree-title">
            <div className="teacher-owned-plan-section-heading">
              <span>Kayıt zinciri</span>
              <h2 id="teacher-plan-tree-title">Yıl → Ay → Hafta</h2>
            </div>
            <article className={initialLevel === "annual" ? "is-focused" : undefined}>
              <small>Yıllık planlama omurgası · revizyon {teacherGraph.annual.revisionNumber}</small>
              <strong>{teacherGraph.annual.title}</strong>
              <span>{formatCivilDate(teacherGraph.annual.periodStart)} – {formatCivilDate(teacherGraph.annual.periodEnd)}</span>
              <button type="button" onClick={() => beginRevision(teacherGraph.annual)}>
                <Pencil1Icon aria-hidden="true" /> Yıllık planı düzenle
              </button>
            </article>
            {teacherGraph.months.map(({ monthly, weeks }) => (
              <article key={monthly.id} className={initialLevel === "monthly" ? "is-focused" : undefined}>
                <small>Aylık plan · revizyon {monthly.revisionNumber}</small>
                <strong>{monthly.title}</strong>
                <span>{weeks.length} hafta · {formatCivilDate(monthly.periodStart)} – {formatCivilDate(monthly.periodEnd)}</span>
                <button type="button" onClick={() => beginRevision(monthly)}>
                  <Pencil1Icon aria-hidden="true" /> Aylık planı düzenle
                </button>
                <button
                  type="button"
                  className="teacher-owned-plan-review-button"
                  onClick={() => void beginMonthlyReview(monthly)}
                  disabled={monthlyReviewBusy || educationalWritesDisabled}
                  aria-describedby={
                    educationalWritesDisabled
                      ? "teacher-owned-evaluation-write-notice"
                      : undefined
                  }
                >
                  {monthly.monthlyEvaluations?.length
                    ? `Aylık değerlendirmeleri aç (${monthly.monthlyEvaluations.length})`
                    : "Ayı üç yönden değerlendir"}
                </button>
                {monthly.nextMonthDecisionContext ? (
                  <div
                    className={`teacher-owned-plan-carry is-${monthly.nextMonthDecisionContext.applicationStatus}`}
                    role="group"
                    aria-label="Önceki aydan taşınan öğretmen önerisi"
                  >
                    <strong>Önceki aydan kanıta dayalı öneri</strong>
                    <span>{monthly.nextMonthDecisionContext.recommendation}</span>
                    <small>
                      {monthly.nextMonthDecisionContext.applicationStatus ===
                      "pending-teacher-review"
                        ? "Aylık plan değişmedi · öğretmen kararı bekleniyor."
                        : monthly.nextMonthDecisionContext.applicationStatus ===
                            "accepted"
                          ? "Öğretmen düzenleyip kabul etti · aylık plan revizyonuna uygulandı."
                          : "Öğretmen gerekçesiyle reddetti · aylık plan içeriği değişmedi."}
                    </small>
                    <button
                      type="button"
                      onClick={() => beginMonthlyCarryReview(monthly)}
                      disabled={monthlyCarryReviewBusy || educationalWritesDisabled}
                      aria-describedby={
                        educationalWritesDisabled
                          ? "teacher-owned-evaluation-write-notice"
                          : undefined
                      }
                    >
                      {monthly.nextMonthDecisionContext.applicationStatus ===
                      "pending-teacher-review"
                        ? "Aylık öneriyi incele ve karar ver"
                        : "Aylık kararı ve geçmişi aç"}
                    </button>
                  </div>
                ) : null}
                <div className="teacher-owned-plan-weeks">
                   {weeks.map((weekly) => (
                     <div className="teacher-owned-plan-week-record" key={weekly.id}>
                      <span><CalendarIcon aria-hidden="true" /><strong>{weekly.title}</strong></span>
                      <small>{formatCivilDate(weekly.periodStart)} – {formatCivilDate(weekly.periodEnd)} · revizyon {weekly.revisionNumber}</small>
                       <button type="button" onClick={() => beginRevision(weekly)}>
                         <Pencil1Icon aria-hidden="true" /> Haftalık planı düzenle
                       </button>
                       <button
                         type="button"
                         className="teacher-owned-plan-review-button"
                         onClick={() => void beginWeeklyReview(weekly)}
                         disabled={reviewBusy || educationalWritesDisabled}
                         aria-describedby={
                           educationalWritesDisabled
                             ? "teacher-owned-evaluation-write-notice"
                             : undefined
                         }
                       >
                         {weekly.weeklyEvaluations?.length
                           ? `Değerlendirmeleri aç (${weekly.weeklyEvaluations.length})`
                           : "Haftayı kanıtlarla değerlendir"}
                       </button>
                       {weekly.nextPlanDecisionContext ? (
                         <div
                           className={`teacher-owned-plan-carry is-${weekly.nextPlanDecisionContext.applicationStatus}`}
                           role="group"
                           aria-label="Önceki haftadan taşınan öğretmen önerisi"
                         >
                           <strong>Önceki haftadan kanıta dayalı öneri</strong>
                           <span>{weekly.nextPlanDecisionContext.evidenceSummary}</span>
                           <small>
                             {weekly.nextPlanDecisionContext.applicationStatus ===
                             "pending-teacher-review"
                               ? "Plan değişmedi · öğretmen kararı bekleniyor."
                               : weekly.nextPlanDecisionContext.applicationStatus ===
                                   "accepted"
                                 ? "Öğretmen düzenleyip kabul etti · plan revizyonuna uygulandı."
                                 : "Öğretmen gerekçesiyle reddetti · plan içeriği değişmedi."}
                             {weekly.nextPlanDecisionContext.applicationStatus ===
                               "pending-teacher-review" &&
                             weekly.revisionNumber !==
                               weekly.nextPlanDecisionContext
                                 .targetPlanRevisionNumberAtSuggestion
                               ? " Öneri planın önceki sürümüne göre hazırlanmış; kabul kapalıdır."
                               : ""}
                           </small>
                           <button
                             type="button"
                             onClick={() => beginCarryReview(weekly)}
                              disabled={carryReviewBusy || educationalWritesDisabled}
                              aria-describedby={
                                educationalWritesDisabled
                                  ? "teacher-owned-evaluation-write-notice"
                                  : undefined
                              }
                           >
                             {weekly.nextPlanDecisionContext.applicationStatus ===
                             "pending-teacher-review"
                               ? "Öneriyi incele ve karar ver"
                               : "Kararı ve geçmişi aç"}
                           </button>
                         </div>
                       ) : null}
                     </div>
                   ))}
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {reviewContext ? (
          <section
            className="teacher-owned-plan-review"
            aria-labelledby="teacher-weekly-review-title"
            data-testid="teacher-weekly-review"
          >
            <div className="teacher-owned-plan-section-heading">
              <span>Kanıt → yansıtma → sonraki plan</span>
              <h2 id="teacher-weekly-review-title">{reviewContext.weekly.title}</h2>
              <p>
                Yalnız bu haftanın gerçek günlük planı ve etkinliğine bağlı değişmez
                gözlemler kullanılabilir.
              </p>
            </div>
            <div
              className="teacher-owned-plan-week-coverage"
              data-ready={reviewContext.readiness.eligible ? "true" : "false"}
              role="status"
            >
              <span>
                <strong>
                  {reviewContext.readiness.expectedTeachingDayCount === 0
                    ? "Bu hafta öğretim günü yok"
                    : `${reviewContext.readiness.completeClosureCount}/${reviewContext.readiness.expectedTeachingDayCount} öğretim günü kapandı`}
                </strong>
                <small>
                  {reviewContext.readiness.teachingDays.provenance.mode ===
                  "official-meb-2026-2027"
                    ? "MEB 2026–2027 çalışma takvimi ve sınıf bitiş saati"
                    : "Özel eğitim yılı · Pazartesi–Cuma ve kaynaklı okul-tatili kayıtları"}
                </small>
              </span>
              {reviewContext.readiness.teachingDays.expectedCivilDates.length > 0 ? (
                <div aria-label="Bu hafta beklenen öğretim günleri">
                  {reviewContext.readiness.teachingDays.expectedCivilDates.map(
                    (civilDate) => (
                      <time key={civilDate} dateTime={civilDate}>
                        {formatCivilDate(civilDate)}
                      </time>
                    ),
                  )}
                </div>
              ) : null}
            </div>
            {!reviewContext.readiness.eligible ? (
              <div
                className="teacher-owned-plan-status"
                role="status"
                id="teacher-weekly-readiness"
              >
                <strong>Haftalık değerlendirme henüz hazır değil</strong>
                <ul>
                  {reviewContext.readiness.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {reviewContext.observations.length === 0 ? (
              <p className="teacher-owned-plan-status" role="status">
                Bu haftaya bağlı doğrulanmış gözlem henüz yok. Önce günlük plan içinden
                gözlem kaydedin.
              </p>
            ) : (
              <fieldset className="teacher-owned-plan-evidence-list">
                <legend>Bu değerlendirmede kullanılacak gözlemler</legend>
                {reviewContext.observations.map((observation) => (
                  <label key={observation.id}>
                    <input
                      type="checkbox"
                      disabled={observation.curriculumLinkIds.length === 0}
                      checked={selectedObservationIds.includes(observation.id)}
                      onChange={(event) =>
                        setSelectedObservationIds((current) =>
                          event.target.checked
                            ? [...new Set([...current, observation.id])]
                            : current.filter((id) => id !== observation.id),
                        )
                      }
                    />
                    <span>
                      <strong>{observation.studentName ?? "Çocuk gözlemi"}</strong>
                      <small>{formatCivilDate(observation.civilDate)} · {observation.activityTitle}</small>
                      {observation.rawText}
                      <small>
                        {observation.curriculumLinkIds.length > 0
                          ? `${observation.curriculumLinkIds.length} öğretmen onaylı program bağı`
                          : "Program bağı tamamlanmadan seçilemez"}
                      </small>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <label htmlFor="teacher-weekly-evidence-summary">Kanıt özeti</label>
            <KeyboardTextarea
              id="teacher-weekly-evidence-summary"
              value={weeklyEvidenceSummary}
              onChange={(event) => setWeeklyEvidenceSummary(event.target.value)}
              maxLength={2000}
              placeholder="Seçtiğiniz gözlemlerin ortak olarak ne gösterdiğini yazın."
            />
            <label htmlFor="teacher-weekly-reflection">Öğretmen değerlendirmesi</label>
            <KeyboardTextarea
              id="teacher-weekly-reflection"
              value={weeklyReflection}
              onChange={(event) => setWeeklyReflection(event.target.value)}
              maxLength={2000}
              placeholder="Uygulamada neyi koruyacak veya değiştireceksiniz?"
            />
            <label htmlFor="teacher-weekly-decision">Sonraki plan kararı</label>
            <select
              id="teacher-weekly-decision"
              value={weeklyDecision}
              onChange={(event) =>
                setWeeklyDecision(event.target.value as TeacherNextPlanDecision)
              }
            >
              <option value="keep">Aynen koru</option>
              <option value="adapt">Uyarlayarak sürdür</option>
              <option value="replace">Başka bir yaklaşımla değiştir</option>
              <option value="observe-more">Daha fazla gözlem topla</option>
            </select>
            <div className="teacher-owned-plan-revision-actions">
              <button
                type="button"
                onClick={() => setReviewContext(null)}
                disabled={reviewBusy}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="teacher-owned-plan-primary"
                onClick={() => void saveWeeklyReview()}
                disabled={
                  reviewBusy ||
                  !reviewContext.readiness.eligible ||
                  selectedObservationIds.length === 0 ||
                  weeklyEvidenceSummary.trim().length < 3 ||
                  weeklyReflection.trim().length < 3
                }
              >
                {reviewBusy
                  ? "Değerlendirme kaydediliyor…"
                  : "Kaydet ve sonraki haftaya öneri taşı"}
              </button>
            </div>
          </section>
        ) : null}

        {carryReviewWeekly?.nextPlanDecisionContext ? (
          <section
            className="teacher-owned-plan-review teacher-owned-plan-carry-review"
            aria-labelledby="teacher-carry-review-title"
            data-testid="teacher-weekly-carry-review"
          >
            <div className="teacher-owned-plan-section-heading">
              <span>Haftalık karar döngüsü · kanıt → öneri → öğretmen hükmü</span>
              <h2 id="teacher-carry-review-title">{carryReviewWeekly.title}</h2>
              <p>
                Önceki haftanın kanıtı ve kararı görünür kalır. Plan yalnız sizin
                açık kabulünüzle değişir; ret ve geri açma gerekçesi geçmişte
                korunur.
              </p>
            </div>
            <div className="teacher-owned-plan-carry-evidence">
              <strong>Dayanak kanıt özeti</strong>
              <p>{carryReviewWeekly.nextPlanDecisionContext.evidenceSummary}</p>
              <strong>Öğretmen yansıtması</strong>
              <p>{carryReviewWeekly.nextPlanDecisionContext.teacherReflection}</p>
              <small>
                Kaynak değerlendirme: {carryReviewWeekly.nextPlanDecisionContext.evaluationId}
              </small>
            </div>
            {carryReviewWeekly.nextPlanDecisionContext.applicationStatus ===
            "pending-teacher-review" ? (
              <>
                <label htmlFor="teacher-carry-narrative">
                  Kabul edilirse haftalık plana yazılacak son metin
                </label>
                <KeyboardTextarea
                  id="teacher-carry-narrative"
                  value={carryAcceptedNarrative}
                  onChange={(event) => setCarryAcceptedNarrative(event.target.value)}
                  maxLength={2000}
                  placeholder="Öneriyi öğretmen dilinizle düzenleyin."
                />
              </>
            ) : (
              <div className="teacher-owned-plan-carry-result" role="status">
                <strong>
                  {carryReviewWeekly.nextPlanDecisionContext.applicationStatus ===
                  "accepted"
                    ? "Kabul edildi"
                    : "Reddedildi"}
                </strong>
                <span>
                  Son karar bu haftalık planın revizyon geçmişinde korunuyor.
                </span>
              </div>
            )}
            <label htmlFor="teacher-carry-note">
              {carryReviewWeekly.nextPlanDecisionContext.applicationStatus ===
              "pending-teacher-review"
                ? "Karar gerekçeniz"
                : "Kararı yeniden açma gerekçeniz"}
            </label>
            <KeyboardTextarea
              id="teacher-carry-note"
              value={carryTeacherNote}
              onChange={(event) => setCarryTeacherNote(event.target.value)}
              maxLength={1000}
              placeholder="Kararınızın nedenini kısa ve somut yazın."
            />
            <details className="teacher-owned-plan-review-history">
              <summary>
                Karar geçmişi ({carryReviewWeekly.nextPlanDecisionContext.reviewHistory?.length ?? 0})
              </summary>
              {(carryReviewWeekly.nextPlanDecisionContext.reviewHistory ?? []).map(
                (entry) => (
                  <article key={entry.id}>
                    <strong>
                      {entry.action === "accepted"
                        ? "Kabul edildi"
                        : entry.action === "rejected"
                          ? "Reddedildi"
                          : "Yeniden açıldı"}
                    </strong>
                    <span>{entry.teacherNote}</span>
                    <small>
                      Revizyon {entry.targetPlanRevisionNumberBefore} → {entry.targetPlanRevisionNumberAfter}
                    </small>
                  </article>
                ),
              )}
            </details>
            <div className="teacher-owned-plan-revision-actions">
              <button
                type="button"
                onClick={() => setCarryReviewWeekly(null)}
                disabled={carryReviewBusy}
              >
                Kapat
              </button>
              {carryReviewWeekly.nextPlanDecisionContext.applicationStatus ===
              "pending-teacher-review" ? (
                <div className="teacher-owned-plan-carry-actions">
                  <button
                    type="button"
                    onClick={() => void submitCarryReview("rejected")}
                    disabled={carryReviewBusy || carryTeacherNote.trim().length < 3}
                  >
                    Gerekçeyle reddet
                  </button>
                  <button
                    type="button"
                    className="teacher-owned-plan-primary"
                    onClick={() => void submitCarryReview("accepted")}
                    disabled={
                      carryReviewBusy ||
                      carryTeacherNote.trim().length < 3 ||
                      carryAcceptedNarrative.trim().length < 3
                    }
                  >
                    Düzenleyip kabul et
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="teacher-owned-plan-primary"
                  onClick={() => void submitCarryReview("reopened")}
                  disabled={carryReviewBusy || carryTeacherNote.trim().length < 3}
                >
                  Kararı yeniden aç ve geri al
                </button>
              )}
            </div>
          </section>
        ) : null}

        {monthlyCarryReviewPlan?.planType === "monthly" &&
        monthlyCarryReviewPlan.nextMonthDecisionContext ? (
          <section
            className="teacher-owned-plan-review teacher-owned-plan-carry-review"
            aria-labelledby="teacher-monthly-carry-review-title"
            data-testid="teacher-monthly-carry-review"
          >
            <div className="teacher-owned-plan-section-heading">
              <span>Aylık karar döngüsü · değerlendirme → öneri → öğretmen hükmü</span>
              <h2 id="teacher-monthly-carry-review-title">
                {monthlyCarryReviewPlan.title}
              </h2>
              <p>
                Önceki ayın üç yönlü değerlendirmesi görünür kalır. Hedef ay
                yalnız sizin düzenleyip kabul ettiğiniz metinle değişir.
              </p>
            </div>
            <div className="teacher-owned-plan-carry-evidence">
              <strong>Önceki ayın önerisi</strong>
              <p>{monthlyCarryReviewPlan.nextMonthDecisionContext.recommendation}</p>
              <small>
                Kaynak değerlendirme: {monthlyCarryReviewPlan.nextMonthDecisionContext.evaluationId}
              </small>
            </div>
            {monthlyCarryReviewPlan.nextMonthDecisionContext.applicationStatus ===
            "pending-teacher-review" ? (
              <>
                <label htmlFor="teacher-monthly-carry-narrative">
                  Kabul edilirse aylık plana yazılacak son metin
                </label>
                <KeyboardTextarea
                  id="teacher-monthly-carry-narrative"
                  value={monthlyCarryAcceptedNarrative}
                  onChange={(event) =>
                    setMonthlyCarryAcceptedNarrative(event.target.value)
                  }
                  maxLength={2000}
                  placeholder="Öneriyi sınıfınızın gerçek ihtiyacına göre düzenleyin."
                />
              </>
            ) : (
              <div className="teacher-owned-plan-carry-result" role="status">
                <strong>
                  {monthlyCarryReviewPlan.nextMonthDecisionContext.applicationStatus ===
                  "accepted"
                    ? "Kabul edildi"
                    : "Reddedildi"}
                </strong>
                <span>Karar aylık planın değişmez revizyon geçmişinde korunuyor.</span>
              </div>
            )}
            <label htmlFor="teacher-monthly-carry-note">
              {monthlyCarryReviewPlan.nextMonthDecisionContext.applicationStatus ===
              "pending-teacher-review"
                ? "Karar gerekçeniz"
                : "Kararı yeniden açma gerekçeniz"}
            </label>
            <KeyboardTextarea
              id="teacher-monthly-carry-note"
              value={monthlyCarryTeacherNote}
              onChange={(event) => setMonthlyCarryTeacherNote(event.target.value)}
              maxLength={1000}
              placeholder="Kararınızın nedenini kısa ve somut yazın."
            />
            <details className="teacher-owned-plan-review-history">
              <summary>
                Aylık karar geçmişi ({monthlyCarryReviewPlan.nextMonthDecisionContext.reviewHistory.length})
              </summary>
              {monthlyCarryReviewPlan.nextMonthDecisionContext.reviewHistory.map((entry) => (
                <article key={entry.id}>
                  <strong>
                    {entry.action === "accepted"
                      ? "Kabul edildi"
                      : entry.action === "rejected"
                        ? "Reddedildi"
                        : "Yeniden açıldı"}
                  </strong>
                  <span>{entry.teacherNote}</span>
                  <small>
                    Revizyon {entry.targetPlanRevisionNumberBefore} → {entry.targetPlanRevisionNumberAfter}
                  </small>
                </article>
              ))}
            </details>
            <div className="teacher-owned-plan-revision-actions">
              <button
                type="button"
                onClick={() => setMonthlyCarryReviewPlan(null)}
                disabled={monthlyCarryReviewBusy}
              >
                Kapat
              </button>
              {monthlyCarryReviewPlan.nextMonthDecisionContext.applicationStatus ===
              "pending-teacher-review" ? (
                <div className="teacher-owned-plan-carry-actions">
                  <button
                    type="button"
                    onClick={() => void submitMonthlyCarryReview("rejected")}
                    disabled={
                      monthlyCarryReviewBusy ||
                      monthlyCarryTeacherNote.trim().length < 3
                    }
                  >
                    Gerekçeyle reddet
                  </button>
                  <button
                    type="button"
                    className="teacher-owned-plan-primary"
                    onClick={() => void submitMonthlyCarryReview("accepted")}
                    disabled={
                      monthlyCarryReviewBusy ||
                      monthlyCarryTeacherNote.trim().length < 3 ||
                      monthlyCarryAcceptedNarrative.trim().length < 3
                    }
                  >
                    Düzenleyip kabul et
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="teacher-owned-plan-primary"
                  onClick={() => void submitMonthlyCarryReview("reopened")}
                  disabled={
                    monthlyCarryReviewBusy ||
                    monthlyCarryTeacherNote.trim().length < 3
                  }
                >
                  Aylık kararı yeniden aç ve geri al
                </button>
              )}
            </div>
          </section>
        ) : null}

        {monthlyReviewContext ? (
          <section
            className="teacher-owned-plan-review teacher-owned-plan-monthly-review"
            aria-labelledby="teacher-monthly-review-title"
            data-testid="teacher-monthly-review"
          >
            <div className="teacher-owned-plan-section-heading">
              <span>Çocuklar → program → öğretmen</span>
              <h2 id="teacher-monthly-review-title">
                {monthlyReviewContext.monthly.title}
              </h2>
              <p>
                Hüküm yalnız bu ayın gerçek günlük planlarına bağlı değişmez
                gözlem ve öğretmen onaylı program bağlarından kurulur.
              </p>
            </div>

            <div className="teacher-owned-plan-coverage" role="status">
              <strong>
                {selectedMonthlyCoverage.observationCount} gözlem ·{" "}
                {selectedMonthlyCoverage.distinctCivilDateCount} gün ·{" "}
                {selectedMonthlyCoverage.distinctWeekCount} hafta
              </strong>
              <span>
                Aktif çocuk kapsamı {selectedMonthlyCoverage.coveredActiveStudentIds.length}/
                {selectedMonthlyCoverage.activeStudentIds.length} ·{" "}
                {selectedMonthlyCoverage.curriculumLinkCount} onaylı program bağı
              </span>
              {missingMonthlyStudentNames.length > 0 ? (
                <small>Eksik çocuk kapsamı: {missingMonthlyStudentNames.join(", ")}</small>
              ) : (
                <small>Aktif sınıftaki tüm çocuklar seçili kanıtlarda temsil ediliyor.</small>
              )}
            </div>

            <fieldset className="teacher-owned-plan-evidence-list">
              <legend>Bu ayın kanıtları</legend>
              {monthlyReviewContext.observations.length === 0 ? (
                <p className="teacher-owned-plan-status">
                  Bu aya bağlı gözlem yok. Yetersiz kanıt durumunu dürüstçe kaydedebilir,
                  yeterli hüküm kuramazsınız.
                </p>
              ) : monthlyReviewContext.observations.map((observation) => {
                const checked = selectedMonthlyObservationIds.includes(observation.id);
                const linkIds = observation.curriculumLinks.map((link) => link.id);
                return (
                  <label key={observation.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={observation.curriculumLinks.length === 0}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedMonthlyObservationIds((current) => [
                            ...new Set([...current, observation.id]),
                          ]);
                          setSelectedMonthlyLinkIds((current) => [
                            ...new Set([...current, ...linkIds]),
                          ]);
                        } else {
                          setSelectedMonthlyObservationIds((current) =>
                            current.filter((id) => id !== observation.id),
                          );
                          setSelectedMonthlyLinkIds((current) =>
                            current.filter((id) => !linkIds.includes(id)),
                          );
                        }
                      }}
                    />
                    <span>
                      <strong>{formatCivilDate(observation.civilDate)} · {observation.weekTitle}</strong>
                      <small>
                        {observation.activityTitle} · {observation.curriculumLinks.length
                          ? `${observation.curriculumLinks.length} onaylı bağ`
                          : "Program bağı eksik — seçilemez"}
                      </small>
                      {observation.rawText}
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <fieldset className="teacher-owned-plan-evidence-state">
              <legend>Çocuklar yönü kanıt hükmü</legend>
              <label>
                <input
                  type="radio"
                  name="teacher-monthly-evidence-state"
                  checked={monthlyEvidenceState === "insufficient-evidence"}
                  onChange={() => setMonthlyEvidenceState("insufficient-evidence")}
                />
                <span>
                  <strong>Kanıt henüz yetersiz</strong>
                  <small>Eksikliği görünür kaydeder; çocuklar hakkında genelleme yapmaz.</small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="teacher-monthly-evidence-state"
                  checked={monthlyEvidenceState === "sufficient-evidence"}
                  disabled={!selectedMonthlyEvidenceIsSufficient}
                  onChange={() => setMonthlyEvidenceState("sufficient-evidence")}
                />
                <span>
                  <strong>Kanıt yeterli</strong>
                  <small>En az 2 gözlem, 2 gün, 2 hafta ve tüm aktif çocukların temsili gerekir.</small>
                </span>
              </label>
            </fieldset>

            <label htmlFor="teacher-monthly-child-narrative">1. Çocuklar yönü değerlendirmesi</label>
            <KeyboardTextarea
              id="teacher-monthly-child-narrative"
              value={monthlyChildNarrative}
              onChange={(event) => setMonthlyChildNarrative(event.target.value)}
              maxLength={2000}
              placeholder="Seçili kanıtların ne gösterdiğini ve neyi henüz göstermediğini yazın."
            />

            <fieldset className="teacher-owned-plan-criteria">
              <legend>2. Program yönü ölçütleri</legend>
              {TEACHER_MONTHLY_PROGRAM_CRITERIA.map(([criterionId, label], index) => (
                <label key={criterionId}>
                  <span>{label}</span>
                  <select
                    value={monthlyProgramCriteria[index]?.status ?? "not-observed"}
                    onChange={(event) => updateMonthlyCriterion(
                      "program",
                      criterionId,
                      event.target.value as TeacherMonthlyCriterionStatus,
                    )}
                  >
                    <option value="observed-working">İşliyor</option>
                    <option value="needs-adjustment">Uyarlama gerekiyor</option>
                    <option value="not-observed">Gözlenmedi</option>
                  </select>
                </label>
              ))}
            </fieldset>
            <label htmlFor="teacher-monthly-program-narrative">Program yönü açıklaması</label>
            <KeyboardTextarea
              id="teacher-monthly-program-narrative"
              value={monthlyProgramNarrative}
              onChange={(event) => setMonthlyProgramNarrative(event.target.value)}
              maxLength={2000}
              placeholder="Planlanan programın uygulamada nasıl işlediğini yazın."
            />

            <fieldset className="teacher-owned-plan-criteria">
              <legend>3. Öğretmen yönü ölçütleri</legend>
              {TEACHER_MONTHLY_TEACHER_CRITERIA.map(([criterionId, label], index) => (
                <label key={criterionId}>
                  <span>{label}</span>
                  <select
                    value={monthlyTeacherCriteria[index]?.status ?? "not-observed"}
                    onChange={(event) => updateMonthlyCriterion(
                      "teacher",
                      criterionId,
                      event.target.value as TeacherMonthlyCriterionStatus,
                    )}
                  >
                    <option value="observed-working">İşliyor</option>
                    <option value="needs-adjustment">Uyarlama gerekiyor</option>
                    <option value="not-observed">Gözlenmedi</option>
                  </select>
                </label>
              ))}
            </fieldset>
            <label htmlFor="teacher-monthly-teacher-narrative">Öğretmen yansıtması</label>
            <KeyboardTextarea
              id="teacher-monthly-teacher-narrative"
              value={monthlyTeacherNarrative}
              onChange={(event) => setMonthlyTeacherNarrative(event.target.value)}
              maxLength={2000}
              placeholder="Neyi koruyacak, neyi değiştirecek ve hangi desteği planlayacaksınız?"
            />
            <label htmlFor="teacher-monthly-next-recommendation">Sonraki ay için öğretmen önerisi</label>
            <KeyboardTextarea
              id="teacher-monthly-next-recommendation"
              value={monthlyNextRecommendation}
              onChange={(event) => setMonthlyNextRecommendation(event.target.value)}
              maxLength={2000}
              placeholder="Öneri otomatik uygulanmaz; sonraki ay planında öğretmen incelemesine sunulur."
            />

            {monthlyReviewContext.evaluations.length > 0 ? (
              <details className="teacher-owned-plan-review-history">
                <summary>
                  Geçmiş aylık değerlendirmeler ({monthlyReviewContext.evaluations.length})
                </summary>
                {monthlyReviewContext.evaluations.map((evaluation) => (
                  <article key={evaluation.id}>
                    <strong>{formatCivilDate(evaluation.createdAt.slice(0, 10))}</strong>
                    <span>{evaluation.children.narrative}</span>
                    <small>{evaluation.nextMonthRecommendation}</small>
                  </article>
                ))}
              </details>
            ) : null}

            <div className="teacher-owned-plan-revision-actions">
              <button
                type="button"
                onClick={() => setMonthlyReviewContext(null)}
                disabled={monthlyReviewBusy}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="teacher-owned-plan-primary"
                onClick={() => void saveMonthlyReview()}
                disabled={
                  monthlyReviewBusy ||
                  monthlyChildNarrative.trim().length < 3 ||
                  monthlyProgramNarrative.trim().length < 3 ||
                  monthlyTeacherNarrative.trim().length < 3 ||
                  monthlyNextRecommendation.trim().length < 3 ||
                  (monthlyEvidenceState === "sufficient-evidence" &&
                    !selectedMonthlyEvidenceIsSufficient)
                }
              >
                {monthlyReviewBusy
                  ? "Aylık değerlendirme kaydediliyor…"
                  : "Üç yönlü değerlendirmeyi kaydet"}
              </button>
            </div>
          </section>
        ) : null}

        {editingPlan ? (
          <section className="teacher-owned-plan-revision" aria-labelledby="teacher-plan-revision-title">
            <div className="teacher-owned-plan-section-heading">
              <span>Değişmez revizyon</span>
              <h2 id="teacher-plan-revision-title">{editingPlan.title}</h2>
              <p>Kaydettiğinizde önceki sürüm tarihçede aynen korunur.</p>
            </div>
            <label htmlFor="teacher-plan-revision-title-input">Plan başlığı</label>
            <KeyboardInput
              id="teacher-plan-revision-title-input"
              value={revisionTitle}
              onChange={(event) => setRevisionTitle(event.target.value)}
              maxLength={160}
            />
            <label htmlFor="teacher-plan-revision-narrative">Öğretmen plan notu</label>
            <KeyboardTextarea
              id="teacher-plan-revision-narrative"
              value={revisionNarrative}
              onChange={(event) => setRevisionNarrative(event.target.value)}
              maxLength={4000}
            />
            <div className="teacher-owned-plan-revision-actions">
              <button type="button" onClick={() => setEditingPlan(null)} disabled={saveBusy}>Vazgeç</button>
              <button
                type="button"
                className="teacher-owned-plan-primary"
                onClick={() => void saveRevision()}
                disabled={saveBusy || revisionTitle.trim().length < 1 || revisionNarrative.trim().length < 3}
              >
                {saveBusy ? "Kaydediliyor…" : "Revizyonu kaydet"}
              </button>
            </div>
          </section>
        ) : null}

        {!teacherGraph && source ? (
          <section className="teacher-owned-plan-tree" aria-labelledby="teacher-plan-legacy-title">
            <div className="teacher-owned-plan-section-heading">
              <span>Kurulu sağlayıcı kaydı</span>
              <h2 id="teacher-plan-legacy-title">{source.annualPlan.teacherTitle}</h2>
              <p>{source.monthlyPlan.teacherTitle} · {source.weeks.length} hafta</p>
            </div>
          </section>
        ) : null}

        {dailyPlans.length > 0 ? (
          <section className="teacher-owned-plan-tree" aria-labelledby="teacher-plan-daily-title">
            <div className="teacher-owned-plan-section-heading">
              <span>Günlük planlar</span>
              <h2 id="teacher-plan-daily-title">Takvimdeki kayıtlar</h2>
            </div>
            <div className="teacher-owned-plan-weeks">
              {dailyPlans.map((plan) => (
                <div className="teacher-owned-plan-week-record" key={plan.planId}>
                  <button type="button" onClick={() => onViewDailyPlan(plan)}>
                    <span>
                      <strong>{plan.planTitle}</strong>
                      <small>
                        {formatCivilDate(plan.civilDate)} · {plan.flowBlockCount > 0
                          ? `${plan.flowBlockCount} akış bölümü`
                          : "Eski tek-etkinlik planı · akış bölümü henüz oluşturulmadı"}
                      </small>
                    </span>
                    <ChevronRightIcon aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="teacher-owned-plan-edit"
                    onClick={() => onEditDailyPlan(plan)}
                    disabled={!plan.editable}
                  >
                    <Pencil1Icon aria-hidden="true" /> Düzenle
                  </button>
                  {!plan.editable ? <small>{plan.editBlockReason}</small> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="teacher-owned-plan-export" aria-labelledby="teacher-plan-export-title">
          <div className="teacher-owned-plan-section-heading">
            <span>Önizlemeli belge merkezi</span>
            <h2 id="teacher-plan-export-title">Kapsamı seçin, kontrol edin, sonra indirin</h2>
            <p>
              Yıl, ay, hafta, günlük plan, gerçek etkinlik ve kanıt kimlikleri
              aynı kayıt zincirinden belgeye girer; eksik içerik uydurulmaz.
            </p>
          </div>
          {teacherGraph ? (
            <div className="teacher-owned-document-workbench">
              <label htmlFor="teacher-document-scope">Belge kapsamı</label>
              <select
                id="teacher-document-scope"
                value={documentScopeKind}
                onChange={(event) => {
                  setDocumentScopeKind(
                    event.target.value as TeacherOwnedPlanDocumentScope["kind"],
                  );
                  resetDocumentApproval();
                }}
              >
                <option value="daily">Günlük plan</option>
                <option value="weekly">Haftalık plan ve değerlendirme</option>
                <option value="monthly">Aylık plan ve değerlendirme</option>
                <option value="combined">Yılın birleşik plan zinciri</option>
              </select>
              {documentScopeKind === "daily" ? (
                <select
                  aria-label="Günlük belge kaydı"
                  value={documentDailyPlanId}
                  onChange={(event) => {
                    setDocumentDailyPlanId(event.target.value);
                    resetDocumentApproval();
                  }}
                >
                  {dailyPlans.map((plan) => (
                    <option key={plan.planId} value={plan.planId}>
                      {formatCivilDate(plan.civilDate)} · {plan.planTitle}
                    </option>
                  ))}
                </select>
              ) : null}
              {documentScopeKind === "weekly" ? (
                <select
                  aria-label="Haftalık belge kaydı"
                  value={documentWeeklyPlanId}
                  onChange={(event) => {
                    setDocumentWeeklyPlanId(event.target.value);
                    resetDocumentApproval();
                  }}
                >
                  {weeklyDocumentOptions.map((weekly) => (
                    <option key={weekly.id} value={weekly.id}>{weekly.title}</option>
                  ))}
                </select>
              ) : null}
              {documentScopeKind === "monthly" ? (
                <select
                  aria-label="Aylık belge kaydı"
                  value={documentMonthlyPlanId}
                  onChange={(event) => {
                    setDocumentMonthlyPlanId(event.target.value);
                    resetDocumentApproval();
                  }}
                >
                  {monthlyDocumentOptions.map((monthly) => (
                    <option key={monthly.id} value={monthly.id}>{monthly.title}</option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                className="teacher-owned-plan-primary"
                onClick={() => void previewDocument()}
                disabled={documentPreviewBusy}
              >
                {documentPreviewBusy ? "Önizleme hazırlanıyor…" : "Belgeyi önizle"}
              </button>
              {documentPreview ? (
                <div className="teacher-owned-document-preview" data-testid="teacher-owned-document-preview">
                  <div>
                    {documentPreview.lines.map((line, index) => (
                      <p key={`${index}-${line.slice(0, 24)}`}>{line}</p>
                    ))}
                  </div>
                  <label className="teacher-owned-document-approval">
                    <input
                      type="checkbox"
                      checked={documentApproved}
                      onChange={(event) => setDocumentApproved(event.target.checked)}
                    />
                    <span>Bu önizlemenin seçtiğim kapsamı ve güncel plan revizyonunu yansıttığını onaylıyorum.</span>
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}
          <div>
            <button type="button" onClick={() => void exportPlan("pdf")} disabled={!exportReady || exportBusy !== null || Boolean(teacherGraph && (!documentPreview || !documentApproved))}>
              <DownloadIcon aria-hidden="true" /> {exportBusy === "pdf" ? "PDF hazırlanıyor…" : "PDF indir"}
            </button>
            <button type="button" onClick={() => void exportPlan("word")} disabled={!exportReady || exportBusy !== null || Boolean(teacherGraph && (!documentPreview || !documentApproved))}>
              <FileTextIcon aria-hidden="true" /> {exportBusy === "word" ? "Word hazırlanıyor…" : "Word indir"}
            </button>
          </div>
        </section>

        <button type="button" className="teacher-owned-plan-library" onClick={onOpenProviderLibrary}>
          Hazır içerik ve sağlayıcı şablonlarına git <ChevronRightIcon aria-hidden="true" />
        </button>
      </main>
    </div>
  );
}

export default TeacherOwnedPlanScreen;
