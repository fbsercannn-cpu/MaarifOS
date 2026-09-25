import { resolveTeachingCivilDate, type ResolveSchoolDayInput } from "../../core/domain/school-calendar.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircledIcon,
  ChevronDownIcon,
  ClockIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  PersonIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import {
  Carousel,
  FlowStack,
  KeyboardInput,
  KeyboardTextarea,
  MobileScroll,
  type FlowControls,
  type FlowScreen,
} from "../../mobile";
import { isCivilDate } from "../../core/domain/attendance.ts";
import {
  bindPedagogicalPlanProvenanceToCivilDate,
  type PedagogicalPlanProvenance,
} from "../../core/domain/pedagogical-plan-provenance.ts";
import {
  isLocalTime,
  type ClassroomSchedule,
} from "../../core/domain/classroom.ts";
import {
  defaultTeacherOwnedDailyFlowBlockDrafts,
  type TeacherOwnedActivityFlowBlockKind,
  type TeacherOwnedDailyFlowBlockDraft,
  type TeacherOwnedDailyFlowBlockEdit,
  type TeacherOwnedDailyFlowTemplateSource,
} from "../../core/domain/teacher-owned-daily-flow.ts";
import type { DashboardStudent as Student } from "../dashboard/dashboard-data";
import type { CurriculumProfileSnapshot } from "../evidence/evidence-flow";
import {
  createPremiumDailyFlowDraft,
  type PremiumDailyFlowBlockDraft,
  type PremiumDailyTemplateSelection,
} from "../premium-plans/domain.ts";
import {
  CURRICULUM_TARGET_KIND_LABELS,
  curriculumAgeBandFromLabel,
  curriculumTargetsForResolvedAgeBand,
  type CurriculumAssignmentMode,
  type CurriculumTargetSnapshot,
} from "../curriculum/curriculum-catalog";
import {
  PRESCHOOL_ACTIVITY_AREAS,
  PRESCHOOL_ACTIVITY_SUGGESTIONS,
  type PreschoolActivityArea,
} from "./activity-suggestions";
import { rankPlanTargetRecommendations } from "./plan-target-recommendations.ts";
import type {
  ScheduledPlanEditDraft,
  TeacherOwnedDailyFlowCopySource,
} from "./scheduled-plan-workspace.ts";
import { resolveOfficialTeachingCivilDate } from "./teacher-week-teaching-days.ts";
import { TeacherFeedbackPanel } from "../feedback/TeacherFeedbackPanel.tsx";
import {
  createTeacherFeedback,
  type TeacherFeedback,
  type TeacherFeedbackCode,
} from "../feedback/teacher-feedback.ts";

interface PlanReadinessBlocker {
  code: TeacherFeedbackCode;
  detail: string;
  actionLabel?: string;
  apply?: () => void;
}

function formatTurkishCivilDate(civilDate: string) {
  if (!isCivilDate(civilDate)) return "Plan tarihini YYYY-AA-GG biçiminde yazın";
  const [year, month, day] = civilDate.split("-");
  return `${day}/${month}/${year}`;
}

function curriculumDisplayLabel(profile: CurriculumProfileSnapshot): string {
  return profile.framework === "meb_2024"
    ? "Okul Öncesi Eğitim Programı — EÇE/2024"
    : "Türkiye Yüzyılı Maarif Modeli";
}


function createFlowHeader(title: string, step: string, onClose: () => void) {
  return (flow: FlowControls) => (
    <div className="d1-flow-header">
      <div>
        <small>{step}</small>
        <strong>{title}</strong>
      </div>
      <button type="button" onClick={onClose} aria-label={`${flow.current.title ?? title} akışını kapat`}>
        <Cross2Icon aria-hidden="true" />
      </button>
    </div>
  );
}

export type PlanCreationCommand = {
  civilDate: string;
  planId: string;
  activityId: string;
  planTitle: string;
  activityTitle: string;
  startTime: string;
  endTime?: string;
  curriculumTargets: CurriculumTargetSnapshot[];
  assignmentMode: CurriculumAssignmentMode;
  studentIds: string[];
  premiumSource?: PremiumDailyTemplateSelection;
  premiumDailyFlowBlocks?: PremiumDailyFlowBlockDraft[];
  teacherOwnedDailyFlowBlocks?: TeacherOwnedDailyFlowBlockDraft[];
  teacherOwnedActivityBlockKind?: TeacherOwnedActivityFlowBlockKind;
  teacherOwnedDailyFlowTemplateSource?: TeacherOwnedDailyFlowTemplateSource;
  pedagogicalProvenance?: PedagogicalPlanProvenance;
  premiumAlternativeActivated?: boolean;
};

export type PlanUpdateCommand = {
  planId: string;
  activityId: string;
  expectedPlanUpdatedAt: string;
  expectedActivityUpdatedAt: string;
  civilDate: string;
  planTitle: string;
  activityTitle: string;
  startTime: string;
  endTime?: string;
  premiumDailyFlowBlocks?: PremiumDailyFlowBlockDraft[];
  teacherOwnedDailyFlowBlocks?: TeacherOwnedDailyFlowBlockEdit[];
  teacherOwnedActivityBlockKind?: TeacherOwnedActivityFlowBlockKind;
};

export interface TeacherOwnedDailyFlowContext {
  schedule: ClassroomSchedule;
  weeklyPlanId: string;
  allowedDateStart: string;
  allowedDateEnd: string;
  copySources?: readonly TeacherOwnedDailyFlowCopySource[];
}

function minutesFromLocalTime(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function scheduleDurationMinutes(schedule: ClassroomSchedule): number {
  return minutesFromLocalTime(schedule.endTime) -
    minutesFromLocalTime(schedule.startTime);
}

export function PlanCreationScreen({
  civilDate,
  defaultStartTime,
  defaultEndTime,
  ageGroup,
  curriculumProfile,
  students,
  onCreate,
  onUpdate,
  initialTemplate,
  initialEdit,
  initialActivityTitle,
  initialPedagogicalProvenance,
  teacherOwnedDailyFlowContext,
  enforceOfficialTeachingDays = false,
  schoolCalendarContext,
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  ageGroup: string;
  curriculumProfile: CurriculumProfileSnapshot;
  students: Student[];
  onCreate: (command: PlanCreationCommand) => Promise<void>;
  onUpdate?: (command: PlanUpdateCommand) => Promise<void>;
  initialTemplate?: PremiumDailyTemplateSelection;
  initialEdit?: ScheduledPlanEditDraft;
  initialActivityTitle?: string;
  initialPedagogicalProvenance?: PedagogicalPlanProvenance;
  teacherOwnedDailyFlowContext?: TeacherOwnedDailyFlowContext;
  enforceOfficialTeachingDays?: boolean;
  schoolCalendarContext?: Omit<ResolveSchoolDayInput, "civilDate">;
}) {
  const introHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [ids] = useState(() => ({
    planId: initialEdit?.planId ?? crypto.randomUUID(),
    activityId: initialEdit?.activityId ?? crypto.randomUUID(),
  }));
  const [planTitle, setPlanTitle] = useState(
    initialEdit?.planTitle ?? initialTemplate?.planTitle ??
      (initialActivityTitle ? `${initialActivityTitle} planı` : "Günlük öğrenme planı"),
  );
  const [activityTitle, setActivityTitle] = useState(
    initialEdit?.activityTitle ?? initialTemplate?.activityTitle ?? initialActivityTitle ?? "",
  );
  const [startTime, setStartTime] = useState(initialEdit?.startTime ?? defaultStartTime);
  const [endTime, setEndTime] = useState(
    initialEdit ? initialEdit.endTime ?? "" : defaultEndTime,
  );
  const [planCivilDate, setPlanCivilDate] = useState(
    initialEdit?.civilDate ?? initialTemplate?.activitySnapshot.recommendedCivilDate ?? civilDate,
  );
  const [premiumDailyFlowBlocks, setPremiumDailyFlowBlocks] = useState<
    PremiumDailyFlowBlockDraft[]
  >(() =>
    initialEdit
      ? structuredClone(initialEdit.flowBlocks)
      : initialTemplate
        ? createPremiumDailyFlowDraft(initialTemplate.fullDayFlow)
        : [],
  );
  const [premiumAlternativeActivated, setPremiumAlternativeActivated] =
    useState(false);
  const [teacherOwnedDailyFlowBlocks, setTeacherOwnedDailyFlowBlocks] = useState<
    TeacherOwnedDailyFlowBlockDraft[]
  >(() => {
    if (initialEdit) {
      return structuredClone(initialEdit.teacherOwnedDailyFlowBlocks);
    }
    if (!initialTemplate && teacherOwnedDailyFlowContext) {
      return defaultTeacherOwnedDailyFlowBlockDrafts(
        scheduleDurationMinutes(teacherOwnedDailyFlowContext.schedule),
      );
    }
    return [];
  });
  const [expectedTeacherOwnedDailyFlowMinutes] = useState(() =>
    initialEdit?.teacherOwnedDailyFlowBlocks.length
      ? initialEdit.teacherOwnedDailyFlowBlocks.reduce(
          (total, block) => total + block.durationMinutes,
          0,
        )
      : teacherOwnedDailyFlowContext
        ? scheduleDurationMinutes(teacherOwnedDailyFlowContext.schedule)
        : 0,
  );
  const [teacherOwnedDailyFlowReviewed, setTeacherOwnedDailyFlowReviewed] =
    useState(false);
  const [teacherOwnedActivityBlockKind, setTeacherOwnedActivityBlockKind] =
    useState<TeacherOwnedActivityFlowBlockKind>(
      initialEdit?.teacherOwnedActivityBlockKind ?? "teacher-activity-one",
    );
  const [teacherOwnedCopyPreviewOpen, setTeacherOwnedCopyPreviewOpen] =
    useState(false);
  const [teacherOwnedWeekCopyOpen, setTeacherOwnedWeekCopyOpen] = useState(false);
  const [teacherOwnedSelectedCopyPlanId, setTeacherOwnedSelectedCopyPlanId] =
    useState<string | null>(null);
  const [teacherOwnedSelectedCopyMode, setTeacherOwnedSelectedCopyMode] =
    useState<"previous-day" | "weekly-template">("previous-day");
  const [teacherOwnedDailyFlowTemplateSource, setTeacherOwnedDailyFlowTemplateSource] =
    useState<TeacherOwnedDailyFlowTemplateSource | undefined>(undefined);
  const [suggestionArea, setSuggestionArea] =
    useState<PreschoolActivityArea>("all");
  const [simpleStep, setSimpleStep] = useState<1 | 2 | 3>(
    initialActivityTitle ? 2 : 1,
  );
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const heading = introHeadingRef.current;
      if (!heading) return;
      const scroll = heading.closest<HTMLElement>(".mobile-scroll");
      if (scroll) scroll.scrollTop = 0;
      heading.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [simpleStep]);
  const [simpleIdeaToolsOpen, setSimpleIdeaToolsOpen] = useState(false);
  const [simpleTargetToolsOpen, setSimpleTargetToolsOpen] = useState(false);
  const curriculumAgeBand = curriculumAgeBandFromLabel(ageGroup);
  const availableTargets = useMemo(
    () => curriculumTargetsForResolvedAgeBand(curriculumProfile, curriculumAgeBand),
    [curriculumAgeBand, curriculumProfile],
  );
  const [targetQuery, setTargetQuery] = useState("");
  const [targetDomain, setTargetDomain] = useState("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>(() => {
    const initialCodes = new Set(
      initialEdit?.curriculumTargets.map((target) => target.referenceCode) ??
        initialTemplate?.targetCodes ??
        [],
    );
    return availableTargets
      .filter((target) => initialCodes.has(target.referenceCode))
      .map((target) => target.id);
  });
  const [assignmentMode, setAssignmentMode] =
    useState<CurriculumAssignmentMode>(initialEdit?.assignmentMode ?? "whole-class");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    initialEdit?.studentIds ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<TeacherFeedback | null>(null);
  const targetDomains = useMemo(
    () => Array.from(new Set(availableTargets.map((target) => target.domain))),
    [availableTargets],
  );
  const visibleTargets = useMemo(() => {
    const query = targetQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query && !targetDomain) return availableTargets.slice(0, 6);
    return availableTargets
      .filter(
        (target) =>
          !targetDomain || target.domain === targetDomain,
      )
      .filter(
        (target) =>
          !query ||
          [
            target.referenceCode,
            target.referenceTitle,
            target.domain,
            CURRICULUM_TARGET_KIND_LABELS[target.kind],
          ]
            .join(" ")
            .toLocaleLowerCase("tr-TR")
            .includes(query),
      )
      .slice(0, 16);
  }, [availableTargets, targetDomain, targetQuery]);
  const selectedTargets = initialEdit?.curriculumTargets ?? availableTargets.filter((target) =>
    selectedTargetIds.includes(target.id),
  );
  const visibleActivitySuggestions = useMemo(
    () =>
      suggestionArea === "all"
        ? PRESCHOOL_ACTIVITY_SUGGESTIONS
        : PRESCHOOL_ACTIVITY_SUGGESTIONS.filter(
            (suggestion) => suggestion.area === suggestionArea,
          ),
    [suggestionArea],
  );
  const selectedActivitySuggestion = PRESCHOOL_ACTIVITY_SUGGESTIONS.find(
    (suggestion) => suggestion.title === activityTitle,
  );
  const semanticNotes = useMemo(
    () => initialPedagogicalProvenance
      ? [
          initialPedagogicalProvenance.adaptation.setup,
          initialPedagogicalProvenance.adaptation.materialSwap,
          initialPedagogicalProvenance.adaptation.facilitation,
          initialPedagogicalProvenance.adaptation.evidencePrompt,
          initialPedagogicalProvenance.valueTrace.action,
          initialPedagogicalProvenance.valueTrace.evidence,
        ]
      : [],
    [initialPedagogicalProvenance],
  );
  const simpleTargetRecommendations = useMemo(
    () => rankPlanTargetRecommendations({
      targets: availableTargets,
      activityTitle,
      ...(selectedActivitySuggestion
        ? { activitySuggestion: selectedActivitySuggestion }
        : {}),
      semanticNotes,
      limit: 4,
    }),
    [
      activityTitle,
      ageGroup,
      availableTargets,
      selectedActivitySuggestion,
      semanticNotes,
    ],
  );
  const simpleRecommendationByTargetId = useMemo(
    () => new Map(
      simpleTargetRecommendations.map((recommendation) => [
        recommendation.target.id,
        recommendation,
      ]),
    ),
    [simpleTargetRecommendations],
  );
  const assignedStudentIds = initialEdit?.studentIds ??
    (assignmentMode === "whole-class"
      ? students.map((student) => student.id)
      : selectedStudentIds);
  const assignmentCount = selectedTargets.length * assignedStudentIds.length;
  const planDateValid = isCivilDate(planCivilDate);
  const officialTeachingDate = planDateValid && (schoolCalendarContext || enforceOfficialTeachingDays)
    ? schoolCalendarContext ? resolveTeachingCivilDate({ ...schoolCalendarContext, civilDate: planCivilDate }) : resolveOfficialTeachingCivilDate(planCivilDate)
    : null;
  const planDateIsOfficialTeachingDay =
    !officialTeachingDate?.applies || officialTeachingDate.isTeachingDay;
  const startTimeValid = isLocalTime(startTime);
  const endTimeValid = !endTime || isLocalTime(endTime);
  const timeOrderValid =
    startTimeValid && endTimeValid && (!endTime || startTime < endTime);
  const planDateInPremiumWeek =
    planDateValid && (initialEdit
      ? planCivilDate >= initialEdit.allowedDateStart &&
        planCivilDate <= initialEdit.allowedDateEnd
      : !initialTemplate ||
        (planCivilDate >= initialTemplate.weekSnapshot.periodStart &&
          planCivilDate <= initialTemplate.weekSnapshot.periodEnd));
  const premiumFlowDefinition =
    initialEdit?.flowDefinition ?? initialTemplate?.fullDayFlow ?? [];
  const premiumDailyFlowValid =
    premiumFlowDefinition.length === 0 ||
    (premiumDailyFlowBlocks.length === 10 &&
      premiumDailyFlowBlocks.every(
        (block) =>
          Number.isInteger(block.durationMinutes) &&
          block.durationMinutes >= 5 &&
          block.durationMinutes <= 240 &&
          block.transitionNote.length <= 500 &&
          block.teacherNote.length <= 1_000,
      ));
  const teacherOwnedDailyFlowEnabled =
    teacherOwnedDailyFlowBlocks.length > 0 && !initialTemplate;
  const simpleWizardEnabled =
    !initialEdit && !initialTemplate;
  const simpleStepHeading = simpleStep === 1
    ? "Bugün hangi etkinliği yapacaksınız?"
    : simpleStep === 2
      ? "Bu etkinlikte hangi TYMM hedefini izleyeceksiniz?"
      : "Planı kontrol edip kaydedin.";
  const simpleStepDescription = `${teacherOwnedDailyFlowEnabled
    ? "Günün 10 bölümlük akışı hazırdır; yalnız ihtiyaç duyarsanız açıp düzenleyin. "
    : ""}${simpleStep === 1
    ? "Hazır bir fikre dokunun veya kendi etkinlik adınızı yazın."
    : simpleStep === 2
      ? simpleTargetRecommendations.length > 0
        ? "Semantik olası hedeflerden birine dokunun; son kontrole geçersiniz."
        : "Semantik olası eşleşme bulunamadı. Alan veya kodla hedef seçin."
      : "Etkinlik ve hedef hazır. İsterseniz saat veya çocuk kapsamını değiştirin."}`;
  const teacherOwnedDailyFlowTotalMinutes = teacherOwnedDailyFlowBlocks.reduce(
    (total, block) => total + block.durationMinutes,
    0,
  );
  const teacherOwnedSkippedMinutes = teacherOwnedDailyFlowBlocks.reduce(
    (total, block) =>
      total + (block.status === "skipped" ? block.durationMinutes : 0),
    0,
  );
  const teacherOwnedDateInWeek = !teacherOwnedDailyFlowEnabled || Boolean(
    initialEdit
      ? planCivilDate >= initialEdit.allowedDateStart &&
        planCivilDate <= initialEdit.allowedDateEnd
      : teacherOwnedDailyFlowContext &&
        planCivilDate >= teacherOwnedDailyFlowContext.allowedDateStart &&
        planCivilDate <= teacherOwnedDailyFlowContext.allowedDateEnd,
  );
  const teacherOwnedDailyFlowValid =
    !teacherOwnedDailyFlowEnabled ||
    (teacherOwnedDailyFlowBlocks.length === 10 &&
      teacherOwnedDailyFlowTotalMinutes === expectedTeacherOwnedDailyFlowMinutes &&
      teacherOwnedDateInWeek &&
      teacherOwnedDailyFlowBlocks.some((block) => block.status === "planned") &&
      teacherOwnedDailyFlowBlocks.every(
        (block) =>
          block.title.trim().length > 0 &&
          block.title.trim().length <= 200 &&
          Number.isInteger(block.durationMinutes) &&
          block.durationMinutes >= 5 &&
          block.durationMinutes <= 240 &&
          block.transitionNote.length <= 500 &&
          block.teacherNote.length <= 1_000,
      ));
  const teacherOwnedActivityBlock = teacherOwnedDailyFlowBlocks.find(
    (block) => block.kind === teacherOwnedActivityBlockKind,
  );
  const teacherOwnedActivityBlockValid =
    !teacherOwnedDailyFlowEnabled ||
    Boolean(teacherOwnedActivityBlock && teacherOwnedActivityBlock.status !== "skipped");
  const teacherOwnedCopySources = teacherOwnedDailyFlowContext?.copySources ?? [];
  const teacherOwnedNearestCopySource = teacherOwnedCopySources[0];
  const teacherOwnedCopySource = teacherOwnedCopySources.find(
    (source) => source.planId === teacherOwnedSelectedCopyPlanId,
  ) ?? teacherOwnedNearestCopySource;
  const teacherOwnedCopyDifferenceCount = teacherOwnedCopySource
    ? teacherOwnedCopySource.blocks.filter((sourceBlock, index) => {
        const currentBlock = teacherOwnedDailyFlowBlocks[index];
        return !currentBlock ||
          sourceBlock.title !== currentBlock.title ||
          sourceBlock.status !== currentBlock.status ||
          sourceBlock.durationMinutes !== currentBlock.durationMinutes ||
          sourceBlock.transitionNote !== currentBlock.transitionNote ||
          sourceBlock.teacherNote !== currentBlock.teacherNote;
      }).length
    : 0;
  const teacherOwnedDurationDifference =
    expectedTeacherOwnedDailyFlowMinutes - teacherOwnedDailyFlowTotalMinutes;
  const teacherOwnedDurationAdjustmentBlock = teacherOwnedDailyFlowBlocks.find(
    (block) =>
      block.kind === "rest-regulation" &&
      block.status !== "skipped" &&
      block.durationMinutes + teacherOwnedDurationDifference >= 5 &&
      block.durationMinutes + teacherOwnedDurationDifference <= 240,
  ) ?? teacherOwnedDailyFlowBlocks.find(
    (block) =>
      block.status !== "skipped" &&
      block.kind !== "teacher-activity-one" &&
      block.kind !== "teacher-activity-two" &&
      block.durationMinutes + teacherOwnedDurationDifference >= 5 &&
      block.durationMinutes + teacherOwnedDurationDifference <= 240,
  );
  const resolvedPremiumActivityTitle =
    initialTemplate &&
    premiumAlternativeActivated &&
    activityTitle === initialTemplate.activitySnapshot.title
      ? initialTemplate.alternativeActivitySnapshot.title
      : activityTitle;
  const resolvedPremiumPlanTitle =
    initialTemplate &&
    premiumAlternativeActivated &&
    planTitle === initialTemplate.planTitle
      ? `${initialTemplate.alternativeActivitySnapshot.title} planı`
      : planTitle;
  const allowedPlanDateStart =
    initialEdit?.allowedDateStart ??
    initialTemplate?.weekSnapshot.periodStart ??
    teacherOwnedDailyFlowContext?.allowedDateStart ??
    civilDate;
  const allowedPlanDateEnd =
    initialEdit?.allowedDateEnd ??
    initialTemplate?.weekSnapshot.periodEnd ??
    teacherOwnedDailyFlowContext?.allowedDateEnd ??
    civilDate;
  const availableTeacherActivityBlock = teacherOwnedDailyFlowBlocks.find(
    (
      block,
    ): block is TeacherOwnedDailyFlowBlockDraft & {
      kind: TeacherOwnedActivityFlowBlockKind;
    } =>
      (block.kind === "teacher-activity-one" || block.kind === "teacher-activity-two") &&
      block.status !== "skipped",
  );
  const saveBlockingItems: PlanReadinessBlocker[] = [];
  if (!curriculumAgeBand) {
    saveBlockingItems.push({
      code: "plan.age-profile",
      detail:
        "Plan hedeflerini açmak için sınıf profilinde 36–48, 48–60 veya 60–72 ay resmî yaş bandını seçin.",
    });
  }
  if (!activityTitle.trim()) {
    saveBlockingItems.push({
      code: "plan.activity",
      detail: "Bir etkinlik seçin veya etkinlik adını yazın.",
      actionLabel: "Etkinlik seç",
      apply: () => {
        setSimpleStep(1);
        setSimpleIdeaToolsOpen(true);
      },
    });
  }
  if (!planTitle.trim()) {
    saveBlockingItems.push({
      code: "plan.title",
      detail: "Plan başlığını yazın.",
      actionLabel: "Başlığı tamamla",
      apply: () => setPlanTitle(activityTitle.trim() ? `${activityTitle.trim()} planı` : "Günlük öğrenme planı"),
    });
  }
  if (selectedTargets.length === 0) {
    saveBlockingItems.push({
      code: "plan.target",
      detail: "En az bir TYMM hedefi seçin.",
      actionLabel: "Hedef seç",
      apply: () => {
        setSimpleStep(2);
        setSimpleTargetToolsOpen(true);
      },
    });
  }
  if (assignedStudentIds.length === 0) {
    saveBlockingItems.push({
      code: "plan.child-scope",
      detail: "En az bir çocuk seçerek çocuk kapsamını tamamlayın.",
      ...(students.length > 0
        ? {
            actionLabel: "Tüm sınıfı seç",
            apply: () => {
              setAssignmentMode("whole-class");
              setSelectedStudentIds(students.map((student) => student.id));
            },
          }
        : {}),
    });
  }
  if (!planDateValid) {
    saveBlockingItems.push({
      code: "plan.date-format",
      detail: "Plan tarihini YYYY-AA-GG biçiminde yazın.",
      actionLabel: "Kaynak günü kullan",
      apply: () => setPlanCivilDate(allowedPlanDateStart),
    });
  } else if (!planDateInPremiumWeek || !teacherOwnedDateInWeek) {
    saveBlockingItems.push({
      code: "plan.week-range",
      detail: "Plan tarihini bağlı olduğu kaynak haftanın tarih aralığına alın.",
      actionLabel: "Kaynak haftaya al",
      apply: () => setPlanCivilDate(allowedPlanDateStart),
    });
  } else if (!planDateIsOfficialTeachingDay) {
    const nearestCivilDate = officialTeachingDate?.nearestCivilDate ?? null;
    saveBlockingItems.push({
      code: "plan.calendar-day",
      detail: nearestCivilDate
        ? `${formatTurkishCivilDate(planCivilDate)} sınıfın çalışma takviminde öğretim günü değildir. En yakın öğretim günü ${formatTurkishCivilDate(nearestCivilDate)}.`
        : `${formatTurkishCivilDate(planCivilDate)} sınıfın çalışma takviminde öğretim günü değildir.`,
      ...(nearestCivilDate
        ? {
            actionLabel: "En yakın öğretim gününe al",
            apply: () => setPlanCivilDate(nearestCivilDate),
          }
        : {}),
    });
  }
  if (!startTimeValid || !endTimeValid || !timeOrderValid) {
    saveBlockingItems.push({
      code: "plan.time",
      detail: "Başlangıç ve bitiş saatlerini kontrol edin; bitiş başlangıçtan sonra olmalıdır.",
      actionLabel: "Sınıf saatini kullan",
      apply: () => {
        setStartTime(defaultStartTime);
        setEndTime(defaultEndTime);
      },
    });
  }
  if (!premiumDailyFlowValid) {
    saveBlockingItems.push({
      code: "plan.flow",
      detail: "Tam gün akışındaki süre ve not alanlarını kontrol edin.",
    });
  }
  if (
    teacherOwnedDailyFlowEnabled &&
    teacherOwnedDailyFlowTotalMinutes !== expectedTeacherOwnedDailyFlowMinutes
  ) {
    saveBlockingItems.push({
      code: "plan.flow",
      detail: `10 bölümün toplamını sınıfın ${expectedTeacherOwnedDailyFlowMinutes} dakikalık çalışma düzeniyle eşitleyin.`,
      ...(teacherOwnedDurationAdjustmentBlock
        ? {
            actionLabel: "Süreyi otomatik eşitle",
            apply: () =>
              setTeacherOwnedDailyFlowBlocks((current) =>
                current.map((block) =>
                  block.kind === teacherOwnedDurationAdjustmentBlock.kind
                    ? {
                        ...block,
                        durationMinutes:
                          block.durationMinutes + teacherOwnedDurationDifference,
                      }
                    : block,
                ),
              ),
          }
        : {}),
    });
  } else if (!teacherOwnedDailyFlowValid && teacherOwnedDateInWeek) {
    saveBlockingItems.push({
      code: "plan.flow",
      detail: "10 bölümlü günlük akıştaki başlık, süre ve notları kontrol edin.",
    });
  }
  if (!teacherOwnedActivityBlockValid) {
    saveBlockingItems.push({
      code: "plan.flow",
      detail: "Gerçek etkinliğin uygulanacağı, atlanmamış bir akış bölümü seçin.",
      ...(availableTeacherActivityBlock
        ? {
            actionLabel: "Uygun bölümü seç",
            apply: () => setTeacherOwnedActivityBlockKind(availableTeacherActivityBlock.kind),
          }
        : {}),
    });
  }
  const primarySaveBlocker = saveBlockingItems[0];
  const saveReady = !busy && saveBlockingItems.length === 0;
  const saveDisabled = busy || saveBlockingItems.length > 0;
  const saveReadinessTitle = busy
    ? "Plan kaydediliyor"
    : saveReady
      ? "Kaydetmeye hazır"
      : saveBlockingItems.length === 1
        ? "1 adım kaldı"
        : `${saveBlockingItems.length} adım kaldı`;
  const saveReadinessDetail = busy
    ? "Kayıt tamamlanana kadar bu ekranda kalın."
    : saveReady
      ? initialEdit
        ? "Değişiklikler kontrol edildi; kaydedebilirsiniz."
        : teacherOwnedDailyFlowEnabled
          ? "Etkinlik, hedef, çocuk kapsamı ve 10 akış bölümü tamamlandı."
          : "Etkinlik, hedef ve çocuk kapsamı tamamlandı."
      : `${primarySaveBlocker?.detail ?? "Eksik alanları tamamlayın."}${
          saveBlockingItems.length > 1 ? ` ${saveBlockingItems.length - 1} adım daha var.` : ""
        }`;
  const selectPremiumApplication = (useAlternative: boolean) => {
    setPremiumAlternativeActivated(useAlternative);
    if (!initialTemplate) return;
    const template = useAlternative
      ? initialTemplate.alternativeActivitySnapshot
      : initialTemplate.activitySnapshot;
    const templateCodes = new Set(template.curriculumTargetCodes);
    setSelectedTargetIds(
      availableTargets
        .filter((target) => templateCodes.has(target.referenceCode))
        .map((target) => target.id),
    );
  };

  const save = async () => {
    if (
      !planTitle.trim() ||
      !activityTitle.trim() ||
      selectedTargets.length === 0 ||
      assignedStudentIds.length === 0 ||
      !planDateValid ||
      !planDateInPremiumWeek ||
      !planDateIsOfficialTeachingDay ||
      !startTimeValid ||
      !endTimeValid ||
      !timeOrderValid ||
      !premiumDailyFlowValid ||
      !teacherOwnedDailyFlowValid ||
      !teacherOwnedActivityBlockValid ||
      busy
    ) return;
    setBusy(true);
    setErrorFeedback(null);
    try {
      if (initialEdit) {
        if (!onUpdate) {
          throw new Error("Plan düzenleme işlemi bu ekranda kullanılamıyor.");
        }
        await onUpdate({
          ...ids,
          expectedPlanUpdatedAt: initialEdit.expectedPlanUpdatedAt,
          expectedActivityUpdatedAt: initialEdit.expectedActivityUpdatedAt,
          civilDate: planCivilDate,
          planTitle,
          activityTitle,
          startTime,
          ...(endTime ? { endTime } : {}),
          ...(premiumFlowDefinition.length > 0
            ? { premiumDailyFlowBlocks }
            : {}),
          ...(teacherOwnedDailyFlowEnabled
            ? {
                teacherOwnedDailyFlowBlocks:
                  teacherOwnedDailyFlowBlocks as TeacherOwnedDailyFlowBlockEdit[],
                teacherOwnedActivityBlockKind,
              }
            : {}),
        });
        return;
      }
      const pedagogicalProvenance = initialPedagogicalProvenance
        ? bindPedagogicalPlanProvenanceToCivilDate(
            initialPedagogicalProvenance,
            planCivilDate,
          )
        : undefined;
      await onCreate({
        ...ids,
        civilDate: planCivilDate,
        planTitle: resolvedPremiumPlanTitle,
        activityTitle: resolvedPremiumActivityTitle,
        startTime,
        ...(endTime ? { endTime } : {}),
        curriculumTargets: selectedTargets,
        assignmentMode,
        studentIds: assignedStudentIds,
        ...(initialTemplate ? { premiumSource: initialTemplate } : {}),
        ...(initialTemplate ? { premiumDailyFlowBlocks } : {}),
        ...(!initialTemplate && teacherOwnedDailyFlowEnabled
          ? {
              teacherOwnedDailyFlowBlocks,
              teacherOwnedActivityBlockKind,
              ...(teacherOwnedDailyFlowTemplateSource
                ? { teacherOwnedDailyFlowTemplateSource }
                : {}),
            }
          : {}),
        ...(pedagogicalProvenance
          ? { pedagogicalProvenance }
          : {}),
        ...(initialTemplate ? { premiumAlternativeActivated } : {}),
      });
    } catch (reason) {
      setErrorFeedback(
        createTeacherFeedback(reason, {
          fallbackDetail: initialEdit
            ? "Değişiklikler kaydedilemedi. Taslağınız korunuyor."
            : "Plan kaydedilemedi. Taslağınız korunuyor.",
        }),
      );
      setBusy(false);
    }
  };

  const applyErrorFeedbackAction = () => {
    const actionId = errorFeedback?.action?.id;
    if (!actionId) return;
    setErrorFeedback(null);
    if (actionId === "use-source-week") {
      setPlanCivilDate(allowedPlanDateStart);
      return;
    }
    if (actionId === "select-target") {
      setSimpleStep(2);
      setSimpleTargetToolsOpen(true);
      return;
    }
    if (actionId === "select-whole-class") {
      setAssignmentMode("whole-class");
      setSelectedStudentIds(students.map((student) => student.id));
      return;
    }
    if (actionId === "restore-class-time") {
      setStartTime(defaultStartTime);
      setEndTime(defaultEndTime);
      return;
    }
    if (actionId === "select-activity") {
      setSimpleStep(1);
      setSimpleIdeaToolsOpen(true);
      return;
    }
    if (actionId === "retry") {
      void save();
    }
  };

  return (
    <>
    <MobileScroll className="d1-flow-scroll">
      <div className="d1-flow-content">
        <div className="d1-flow-intro">
          <span className="d1-kicker">{initialEdit ? "Kayıtlı öğretmen planı" : "Günlük plan hazırlığı"}</span>
          <h1 ref={introHeadingRef} tabIndex={-1}>{initialEdit ? "Gelecek planın uygulama ayrıntılarını düzenleyin." : initialTemplate ? "Tam gün akışını sınıfınıza hazırlayın." : simpleStepHeading}</h1>
          <p>{initialEdit ? "Plan kimliği, kaynak hafta, program hedefleri ve çocuk kapsamı korunur; tarih, saat, başlıklar ve öğretmen akış notları güncellenebilir." : initialTemplate ? "On blok hazır gelir; etkinliği, tarihi, hedefleri ve çocuk kapsamını öğretmen belirler." : simpleStepDescription}</p>
        </div>

        {simpleWizardEnabled ? (
          <nav className="simple-plan-steps" aria-label="Günlük plan oluşturma adımları">
            {["Etkinlik", "TYMM hedefi", "Kontrol"].map((label, index) => {
              const step = (index + 1) as 1 | 2 | 3;
              return (
                <button
                  type="button"
                  key={label}
                  data-state={step === simpleStep ? "current" : step < simpleStep ? "complete" : "upcoming"}
                  aria-current={step === simpleStep ? "step" : undefined}
                  disabled={step > simpleStep}
                  onClick={() => setSimpleStep(step)}
                >
                  <span>{step < simpleStep ? <CheckCircledIcon aria-hidden="true" /> : step}</span>
                  <strong>{label}</strong>
                </button>
              );
            })}
          </nav>
        ) : null}

        <section className="d1-context-card" aria-label="Plan bağlamı">
          <span>{formatTurkishCivilDate(planCivilDate)}</span>
          <strong>{curriculumDisplayLabel(curriculumProfile)}</strong>
          <em>
            {curriculumProfile.officialCatalogVerified
              ? "Resmî MEB kaynağıyla doğrulanmış program"
              : "Sınıf için seçilen program"}
          </em>
        </section>

        {premiumFlowDefinition.length > 0 ? (
          <>
            <section className="premium-template-source" aria-label="Kayıtlı plan kaynağı">
              <StarIcon aria-hidden="true" />
              <span>
                <strong>{initialEdit ? "Kayıtlı kaynak zinciri korunuyor" : "Plan Kütüphanesi’nden hazırlandı"}</strong>
                <small>{initialEdit ? `${initialEdit.allowedDateStart} – ${initialEdit.allowedDateEnd} · Kaynak etkinlik değiştirilemez` : `${initialTemplate!.contentPack.displayName} · ${initialTemplate!.weekSnapshot.dateRange} · Öğretmen incelemesi gerekli`}</small>
              </span>
            </section>
            <section className="premium-daily-flow-preview" aria-labelledby="premium-daily-flow-title">
              <div>
                <span className="d1-kicker">Tam gün planı</span>
                <h2 id="premium-daily-flow-title">{initialEdit ? "10 blok kayıtlı akış" : "10 blok otomatik yerleşti"}</h2>
                <p>{initialEdit ? "Kaynak bloklar yerinde kalır; öğretmen süre, uygulama durumu, geçiş ve kendi notlarını düzenleyebilir." : "Seçilen etkinlik ilgili bloğa, haftanın alternatifi isteğe bağlı seçenek olarak eklenir."}</p>
              </div>
              {initialTemplate ? <fieldset className="premium-alternative-choice">
                <legend>Bu günlük planda uygulanacak etkinlik</legend>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!premiumAlternativeActivated}
                  onPointerUp={() => {
                    selectPremiumApplication(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectPremiumApplication(false);
                    }
                  }}
                >
                  <span>
                    <strong>Ana etkinliği uygula</strong>
                    <small>{initialTemplate.activitySnapshot.title}</small>
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={premiumAlternativeActivated}
                  onPointerUp={() => {
                    selectPremiumApplication(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectPremiumApplication(true);
                    }
                  }}
                >
                  <span>
                    <strong>Haftanın alternatifini bunun yerine uygula</strong>
                    <small>
                      {initialTemplate.alternativeActivitySnapshot.title} · Yerine geçtiği ana etkinlik: {initialTemplate.activitySnapshot.title}
                    </small>
                  </span>
                </button>
                <p>
                  {premiumAlternativeActivated
                    ? "Öğretmen seçimi kayda alınır; hedef önerileri alternatif için yenilenir ve kaydetmeden önce değiştirilebilir."
                    : "Alternatif yalnız aday olarak kalır ve uygulanmış sayılmaz."}
                </p>
              </fieldset> : (
                <p className="premium-edit-source-lock">
                  Uygulanacak kaynak etkinlik bu düzenleme diliminde sabittir. Böylece planın yıllık → aylık → haftalık kaynak izi bozulmaz.
                </p>
              )}
              <ol>
                {premiumFlowDefinition.map((block, index) => {
                  const selected = initialTemplate?.activitySnapshot.flowSlot === block.id;
                  const alternative = initialTemplate?.alternativeActivitySnapshot.flowSlot === block.id;
                  const applied = premiumAlternativeActivated ? alternative : selected;
                  const teacherBlock = premiumDailyFlowBlocks[index];
                  return (
                    <li key={block.id} className={applied ? "is-selected" : selected ? "is-replaced" : ""}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{block.title}</strong>
                        {initialTemplate && selected ? (
                          <em>
                            {initialTemplate.activitySnapshot.title}
                            {premiumAlternativeActivated ? " · alternatifle değiştirildi" : " · uygulanacak"}
                          </em>
                        ) : null}
                        {initialTemplate && alternative ? (
                          <small>
                            Alternatif: {initialTemplate.alternativeActivitySnapshot.title}
                            {premiumAlternativeActivated ? " · uygulanacak" : " · aday"}
                          </small>
                        ) : null}
                        {teacherBlock ? (
                          <details className="premium-flow-block-editor">
                            <summary>Bloğu düzenle · {teacherBlock.durationMinutes} dk</summary>
                            <label htmlFor={`premium-block-status-${block.id}`}>Uygulama durumu</label>
                            <select
                              id={`premium-block-status-${block.id}`}
                              value={teacherBlock.status}
                              onChange={(event) =>
                                setPremiumDailyFlowBlocks((current) =>
                                  current.map((candidate) =>
                                    candidate.id === block.id
                                      ? {
                                          ...candidate,
                                          status: event.target.value as PremiumDailyFlowBlockDraft["status"],
                                        }
                                      : candidate,
                                  ),
                                )
                              }
                            >
                              <option value="planned">Planlandı</option>
                              <option value="optional">İsteğe bağlı</option>
                              <option value="skipped">Bu gün uygulanmayacak</option>
                            </select>
                            <label htmlFor={`premium-block-duration-${block.id}`}>Süre (dakika)</label>
                            <KeyboardInput
                              id={`premium-block-duration-${block.id}`}
                              inputMode="numeric"
                              value={String(teacherBlock.durationMinutes)}
                              onChange={(event) => {
                                const durationMinutes = Number(event.target.value.replace(/\D/g, ""));
                                setPremiumDailyFlowBlocks((current) =>
                                  current.map((candidate) =>
                                    candidate.id === block.id
                                      ? { ...candidate, durationMinutes }
                                      : candidate,
                                  ),
                                );
                              }}
                            />
                            <label htmlFor={`premium-block-transition-${block.id}`}>Geçiş notu</label>
                            <KeyboardInput
                              id={`premium-block-transition-${block.id}`}
                              value={teacherBlock.transitionNote}
                              onChange={(event) =>
                                setPremiumDailyFlowBlocks((current) =>
                                  current.map((candidate) =>
                                    candidate.id === block.id
                                      ? { ...candidate, transitionNote: event.target.value }
                                      : candidate,
                                  ),
                                )
                              }
                            />
                            <label htmlFor={`premium-block-note-${block.id}`}>Öğretmen notu</label>
                            <KeyboardInput
                              id={`premium-block-note-${block.id}`}
                              value={teacherBlock.teacherNote}
                              onChange={(event) =>
                                setPremiumDailyFlowBlocks((current) =>
                                  current.map((candidate) =>
                                    candidate.id === block.id
                                      ? { ...candidate, teacherNote: event.target.value }
                                      : candidate,
                                  ),
                                )
                              }
                            />
                          </details>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        ) : null}

        {teacherOwnedDailyFlowEnabled ? (
          <details
            className="premium-daily-flow-preview teacher-owned-daily-flow-editor"
            data-testid="teacher-owned-daily-flow-editor"
          >
            <summary className="teacher-owned-daily-flow-summary">
              <span>
                <strong>Günün akışı hazır</strong>
                <small>
                  10 bölüm · {teacherOwnedDailyFlowTotalMinutes} dakika · İsterseniz düzenleyin
                </small>
              </span>
              <ChevronDownIcon aria-hidden="true" />
            </summary>
            <div className="teacher-owned-daily-flow-details">
            <div>
              <span className="d1-kicker">Öğretmenin günlük akışı</span>
              <h2 id="teacher-owned-daily-flow-title">
                10 bölümü {expectedTeacherOwnedDailyFlowMinutes > 300
                  ? "tam gün"
                  : "yarım gün"} düzenine yerleştirin
              </h2>
              <p>
                Bu bölümler tek bir etkinlik kaydını çoğaltmaz. Başlık, süre,
                uygulama durumu ve öğretmen notları planın değişmez revizyon
                geçmişinde korunur.
              </p>
              <label htmlFor="teacher-owned-activity-block">
                Gerçek etkinlik hangi bölümde uygulanacak?
              </label>
              <select
                id="teacher-owned-activity-block"
                value={teacherOwnedActivityBlockKind}
                onChange={(event) => {
                  setTeacherOwnedDailyFlowReviewed(false);
                  setTeacherOwnedActivityBlockKind(
                    event.target.value as TeacherOwnedActivityFlowBlockKind,
                  );
                }}
                aria-describedby="teacher-owned-activity-block-help"
              >
                {teacherOwnedDailyFlowBlocks
                  .filter(
                    (block) =>
                      block.kind === "teacher-activity-one" ||
                      block.kind === "teacher-activity-two",
                  )
                  .map((block) => (
                    <option
                      key={block.kind}
                      value={block.kind}
                      disabled={block.status === "skipped"}
                    >
                      {block.title}
                      {block.status === "skipped" ? " — uygulanmayacak" : ""}
                    </option>
                  ))}
              </select>
              <small id="teacher-owned-activity-block-help">
                Gözlem ve uygulama kanıtı bu bölüm kimliğiyle aynı kayıt zincirinde korunur.
              </small>
              {teacherOwnedCopySource ? (
                <div className="teacher-owned-flow-copy" data-testid="teacher-owned-flow-copy">
                  <div className="teacher-owned-flow-copy-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setTeacherOwnedSelectedCopyPlanId(
                          teacherOwnedNearestCopySource?.planId ?? null,
                        );
                        setTeacherOwnedSelectedCopyMode("previous-day");
                        setTeacherOwnedWeekCopyOpen(false);
                        setTeacherOwnedCopyPreviewOpen((current) => !current);
                      }}
                      aria-expanded={
                        teacherOwnedCopyPreviewOpen &&
                        teacherOwnedSelectedCopyMode === "previous-day"
                      }
                    >
                      Dünden getir
                    </button>
                    {teacherOwnedCopySources.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTeacherOwnedCopyPreviewOpen(false);
                          setTeacherOwnedWeekCopyOpen((current) => !current);
                        }}
                        aria-expanded={teacherOwnedWeekCopyOpen}
                      >
                        Haftadan seç
                      </button>
                    ) : null}
                  </div>
                  {teacherOwnedWeekCopyOpen ? (
                    <div className="teacher-owned-flow-week-options" aria-label="Bu haftanın önceki planları">
                      {teacherOwnedCopySources.map((source) => (
                        <button
                          type="button"
                          key={source.planId}
                          onClick={() => {
                            setTeacherOwnedSelectedCopyPlanId(source.planId);
                            setTeacherOwnedSelectedCopyMode("weekly-template");
                            setTeacherOwnedCopyPreviewOpen(true);
                          }}
                        >
                          <strong>{source.civilDate}</strong>
                          <span>{source.planTitle}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {teacherOwnedCopyPreviewOpen ? (
                    <div className="teacher-owned-flow-copy-preview" role="status">
                      <small>
                        {teacherOwnedCopySource.civilDate} · {teacherOwnedCopySource.planTitle}
                      </small>
                      <strong>
                        {teacherOwnedCopyDifferenceCount === 0
                          ? "Taslak zaten önceki günle aynı"
                          : `${teacherOwnedCopyDifferenceCount} bölüm değişecek`}
                      </strong>
                      <p>
                        Yalnız bölüm taslağı ve etkinlik bölümü seçimi alınır; etkinlik,
                        gözlem ve kayıt kimlikleri kopyalanmaz.
                      </p>
                      <button
                        type="button"
                        disabled={teacherOwnedCopyDifferenceCount === 0}
                        onClick={() => {
                          setTeacherOwnedDailyFlowReviewed(false);
                          setTeacherOwnedDailyFlowBlocks(
                            structuredClone(teacherOwnedCopySource.blocks),
                          );
                          setTeacherOwnedActivityBlockKind(
                            teacherOwnedCopySource.activityBlockKind,
                          );
                          setTeacherOwnedDailyFlowTemplateSource({
                            mode: teacherOwnedSelectedCopyMode,
                            sourcePlanId: teacherOwnedCopySource.planId,
                            sourceWeeklyPlanId: teacherOwnedCopySource.weeklyPlanId,
                            sourceCivilDate: teacherOwnedCopySource.civilDate,
                            sourceFlowRevisionNumber:
                              teacherOwnedCopySource.flowRevisionNumber,
                          });
                          setTeacherOwnedCopyPreviewOpen(false);
                          setTeacherOwnedWeekCopyOpen(false);
                        }}
                      >
                        Bu taslağı uygula
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div
              className={
                teacherOwnedDailyFlowTotalMinutes ===
                expectedTeacherOwnedDailyFlowMinutes
                  ? "teacher-owned-flow-total is-ready"
                  : "teacher-owned-flow-total is-attention"
              }
            >
              <strong>
                {teacherOwnedDailyFlowTotalMinutes} / {expectedTeacherOwnedDailyFlowMinutes} dk
              </strong>
              <span>
                {teacherOwnedDailyFlowTotalMinutes ===
                expectedTeacherOwnedDailyFlowMinutes
                  ? teacherOwnedSkippedMinutes > 0
                    ? `Gün takvimi tamam · ${teacherOwnedSkippedMinutes} dk uygulanmayacak açık zaman`
                    : "Gün takvimi sınıfın çalışma süresiyle tam eşleşiyor"
                  : "Bölüm sürelerini sınıfın çalışma düzeniyle eşitleyin"}
              </span>
              {teacherOwnedDurationDifference !== 0 &&
              teacherOwnedDurationAdjustmentBlock ? (
                <button
                  type="button"
                  className="teacher-owned-flow-adjust-one"
                  onClick={() => {
                    setTeacherOwnedDailyFlowReviewed(false);
                    setTeacherOwnedDailyFlowBlocks((current) =>
                      current.map((block) =>
                        block.kind === teacherOwnedDurationAdjustmentBlock.kind
                          ? {
                              ...block,
                              durationMinutes:
                                block.durationMinutes + teacherOwnedDurationDifference,
                            }
                          : block,
                      ),
                    );
                  }}
                >
                  {Math.abs(teacherOwnedDurationDifference)} dk {teacherOwnedDurationDifference > 0
                    ? "ekle"
                    : "azalt"}: {teacherOwnedDurationAdjustmentBlock.title}
                </button>
              ) : null}
              <button
                type="button"
                className="teacher-owned-flow-balance"
                onClick={() => {
                  setTeacherOwnedDailyFlowBlocks((current) => {
                    const balanced = defaultTeacherOwnedDailyFlowBlockDrafts(
                      expectedTeacherOwnedDailyFlowMinutes,
                    );
                    const next = current.map((block, index) => ({
                      ...block,
                      durationMinutes: balanced[index].durationMinutes,
                    }));
                    const changed = next.some(
                      (block, index) =>
                        block.durationMinutes !== current[index].durationMinutes,
                    );
                    if (changed) setTeacherOwnedDailyFlowReviewed(false);
                    return changed ? next : current;
                  });
                }}
                disabled={teacherOwnedDailyFlowBlocks.every(
                  (block, index) =>
                    block.durationMinutes ===
                    defaultTeacherOwnedDailyFlowBlockDrafts(
                      expectedTeacherOwnedDailyFlowMinutes,
                    )[index].durationMinutes,
                )}
              >
                Süreleri sınıf gününe eşit dağıt
              </button>
            </div>
            <ol>
              {teacherOwnedDailyFlowBlocks.map((block, index) => (
                <li key={block.id ?? block.kind}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{block.title}</strong>
                    <small>
                      {block.durationMinutes} dk · {block.status === "planned"
                        ? "Planlandı"
                        : block.status === "optional"
                          ? "İsteğe bağlı"
                          : "Bu gün uygulanmayacak"}
                    </small>
                    <details className="premium-flow-block-editor">
                      <summary>
                        {index + 1}. {block.title} — bölümü düzenle
                      </summary>
                      <label htmlFor={`teacher-block-title-${index}`}>
                        Bölüm başlığı
                      </label>
                      <KeyboardInput
                        id={`teacher-block-title-${index}`}
                        value={block.title}
                        maxLength={200}
                        onChange={(event) =>
                          {
                            setTeacherOwnedDailyFlowReviewed(false);
                            setTeacherOwnedDailyFlowBlocks((current) =>
                              current.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? { ...candidate, title: event.target.value }
                                  : candidate,
                              ),
                            );
                          }
                        }
                      />
                      <label htmlFor={`teacher-block-status-${index}`}>
                        Uygulama durumu
                      </label>
                      <select
                        id={`teacher-block-status-${index}`}
                        value={block.status}
                        onChange={(event) =>
                          {
                            setTeacherOwnedDailyFlowReviewed(false);
                            setTeacherOwnedDailyFlowBlocks((current) =>
                              current.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? {
                                      ...candidate,
                                      status: event.target.value as TeacherOwnedDailyFlowBlockDraft["status"],
                                    }
                                  : candidate,
                              ),
                            );
                          }
                        }
                      >
                        <option value="planned">Planlandı</option>
                        <option value="optional">İsteğe bağlı</option>
                        <option value="skipped">Bu gün uygulanmayacak</option>
                      </select>
                      <label htmlFor={`teacher-block-duration-${index}`}>
                        Süre (dakika)
                      </label>
                      <KeyboardInput
                        id={`teacher-block-duration-${index}`}
                        inputMode="numeric"
                        min={5}
                        max={240}
                        aria-describedby={`teacher-block-duration-help-${index}`}
                        value={String(block.durationMinutes)}
                        onChange={(event) => {
                          const durationMinutes = Number(
                            event.target.value.replace(/\D/g, ""),
                          );
                          setTeacherOwnedDailyFlowReviewed(false);
                          setTeacherOwnedDailyFlowBlocks((current) =>
                            current.map((candidate, candidateIndex) =>
                              candidateIndex === index
                                ? { ...candidate, durationMinutes }
                                : candidate,
                            ),
                          );
                        }}
                      />
                      <small id={`teacher-block-duration-help-${index}`}>
                        5–240 dakika. Toplam süre sınıf gününün süresiyle eşleşmelidir.
                      </small>
                      <label htmlFor={`teacher-block-transition-${index}`}>
                        Geçiş notu
                      </label>
                      <KeyboardInput
                        id={`teacher-block-transition-${index}`}
                        value={block.transitionNote}
                        maxLength={500}
                        onChange={(event) =>
                          {
                            setTeacherOwnedDailyFlowReviewed(false);
                            setTeacherOwnedDailyFlowBlocks((current) =>
                              current.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? { ...candidate, transitionNote: event.target.value }
                                  : candidate,
                              ),
                            );
                          }
                        }
                      />
                      <label htmlFor={`teacher-block-note-${index}`}>
                        Öğretmen notu
                      </label>
                      <KeyboardTextarea
                        id={`teacher-block-note-${index}`}
                        value={block.teacherNote}
                        maxLength={1000}
                        onChange={(event) =>
                          {
                            setTeacherOwnedDailyFlowReviewed(false);
                            setTeacherOwnedDailyFlowBlocks((current) =>
                              current.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? { ...candidate, teacherNote: event.target.value }
                                  : candidate,
                              ),
                            );
                          }
                        }
                      />
                    </details>
                  </div>
                </li>
              ))}
            </ol>
            </div>
          </details>
        ) : null}

        {!initialEdit && (!simpleWizardEnabled || simpleStep === 1) ? <section className="plan-ideas" aria-labelledby="plan-ideas-title">
          <div className="plan-ideas-heading">
            <div>
              <span className="d1-kicker">Oyun temelli fikir havuzu</span>
              <h2 id="plan-ideas-title">Bugün neyi keşfedelim?</h2>
            </div>
            <strong aria-live="polite">
              {selectedActivitySuggestion ? "Fikir seçildi" : "Birini seçin"}
            </strong>
          </div>
          <p>Bir fikre dokunun; TYMM hedefi seçimine geçin.</p>
          {simpleWizardEnabled ? (
            <button
              type="button"
              className="simple-plan-more"
              aria-expanded={simpleIdeaToolsOpen}
              onClick={() => setSimpleIdeaToolsOpen((current) => !current)}
            >
              {simpleIdeaToolsOpen ? "Alan filtrelerini kapat" : "Başka bir alandan fikir bul"}
              <ChevronDownIcon aria-hidden="true" />
            </button>
          ) : null}
          {!simpleWizardEnabled || simpleIdeaToolsOpen ? (
            <Carousel
              className="plan-area-carousel"
              contentClassName="plan-area-track"
              ariaLabel="Etkinlik fikir alanları"
            >
              {PRESCHOOL_ACTIVITY_AREAS.map((area) => (
                <button
                  type="button"
                  key={area.id}
                  aria-pressed={suggestionArea === area.id}
                  onClick={() => setSuggestionArea(area.id)}
                >
                  {area.label}
                </button>
              ))}
            </Carousel>
          ) : null}
          <Carousel
            className="plan-suggestion-carousel"
            contentClassName="plan-suggestion-track"
            ariaLabel="Etkinlik fikirleri"
          >
            {visibleActivitySuggestions.slice(0, simpleWizardEnabled ? 4 : 8).map((suggestion) => (
              <button
                type="button"
                className="plan-suggestion"
                key={suggestion.id}
                aria-pressed={activityTitle === suggestion.title}
                onClick={() => {
                  setActivityTitle(suggestion.title);
                  if (planTitle === "Günlük öğrenme planı") {
                    setPlanTitle(`${suggestion.title} planı`);
                  }
                  if (simpleWizardEnabled) setSimpleStep(2);
                }}
              >
                <StarIcon aria-hidden="true" />
                <strong>{suggestion.title}</strong>
                <small>{suggestion.teacherPrompt}</small>
                <span>
                  {activityTitle === suggestion.title ? "Seçildi" : "Bu fikri kullan"}
                </span>
              </button>
            ))}
          </Carousel>
        </section> : null}

        {!simpleWizardEnabled || simpleStep !== 2 ? <div className="d1-form">
          {!simpleWizardEnabled || simpleStep === 1 ? (
            <>
              <label htmlFor="d1-activity-title">
                {simpleWizardEnabled ? "Kendi etkinliğim" : "Etkinlik adı"}
              </label>
              <KeyboardInput
                id="d1-activity-title"
                value={activityTitle}
                onChange={(event) => setActivityTitle(event.target.value)}
                placeholder="Örn. Bahçede gölge incelemesi"
                autoComplete="off"
              />
              {simpleWizardEnabled ? (
                <button
                  type="button"
                  className="d1-primary simple-plan-continue"
                  disabled={!activityTitle.trim()}
                  onClick={() => setSimpleStep(2)}
                >
                  TYMM hedefini seç
                </button>
              ) : null}
            </>
          ) : null}

          {!simpleWizardEnabled || simpleStep === 3 ? <details className="quick-details plan-optional-details">
            <summary tabIndex={0}>
              <span>
                <ClockIcon aria-hidden="true" />
                <strong>Başlık ve saati değiştir</strong>
                <small>İsteğe bağlı</small>
              </span>
              <ChevronDownIcon aria-hidden="true" />
            </summary>
            <div className="quick-details-fields">
              <label htmlFor="d1-plan-title">Plan başlığı</label>
              <KeyboardInput
                id="d1-plan-title"
                value={planTitle}
                onChange={(event) => setPlanTitle(event.target.value)}
                autoComplete="off"
              />
              {!planDateInPremiumWeek || !teacherOwnedDateInWeek ? (
                <p className="d1-error" id="d1-plan-date-guidance" role="status">
                  Plan tarihi {allowedPlanDateStart} – {allowedPlanDateEnd} içinde olmalıdır.
                </p>
              ) : null}
              <label htmlFor="d1-plan-date">Plan tarihi</label>
              <KeyboardInput
                id="d1-plan-date"
                value={planCivilDate}
                onChange={(event) => setPlanCivilDate(event.target.value)}
                placeholder="YYYY-AA-GG"
                inputMode="numeric"
                autoComplete="off"
                aria-describedby={
                  !planDateInPremiumWeek || !teacherOwnedDateInWeek
                    ? "d1-plan-date-guidance"
                    : undefined
                }
              />
              <div className="d1-form-grid">
                <label htmlFor="d1-start-time">Başlangıç
                  <KeyboardInput
                    id="d1-start-time"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </label>
                <label htmlFor="d1-end-time">Bitiş
                  <KeyboardInput
                    id="d1-end-time"
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </details> : null}
        </div> : null}

        {simpleWizardEnabled && simpleStep >= 2 ? (
          <section className="simple-plan-selection" aria-label="Seçilen plan özeti">
            <button type="button" onClick={() => setSimpleStep(simpleStep === 3 ? 2 : 1)}>Geri</button>
            <span>
              <small>ETKİNLİK</small>
              <strong>{activityTitle}</strong>
              {simpleStep === 3 ? <em>{selectedTargets.map((target) => target.referenceCode).join(", ")}</em> : null}
            </span>
          </section>
        ) : null}

        {initialEdit ? (
          <section className="scheduled-plan-locked-scope" aria-label="Korunan plan kapsamı">
            <span className="d1-kicker">Korunan program kapsamı</span>
            <h2>{selectedTargets.length} hedef · {assignedStudentIds.length} çocuk</h2>
            <p>
              Kaynak program hedefleri ve çocuk atamaları bu düzenlemede değişmez. Başlık, tarih, saat ve 10 bloktaki öğretmen notları güncellenebilir.
            </p>
          </section>
        ) : <>
        {!simpleWizardEnabled || simpleStep === 2 ? <section className="curriculum-picker" aria-labelledby="curriculum-picker-title">
          <div className="curriculum-section-heading">
            <div>
              <span className="d1-kicker">Program omurgası</span>
              <h2 id="curriculum-picker-title">Bu etkinlikte ele alınacak hedefler</h2>
            </div>
            <strong aria-live="polite">{selectedTargets.length} hedef seçili</strong>
          </div>
          {!curriculumAgeBand ? (
            <div className="catalog-scope-note" role="status" aria-live="polite">
              <strong>Resmî yaş bandı seçilmeden hedef gösterilmez.</strong>
              <p>
                Bu planı kapatıp Sınıf &gt; Profili düzenle alanından 36–48,
                48–60 veya 60–72 ay bandını seçin. Maarif Modeli hedefleri
                ancak bu seçimden sonra yaşa göre açılır.
              </p>
            </div>
          ) : null}
          {curriculumAgeBand && simpleWizardEnabled && !simpleTargetToolsOpen ? (
            <p
              className="catalog-scope-note"
              data-testid="semantic-target-explanation"
              role="status"
              aria-live="polite"
            >
              {simpleTargetRecommendations.length > 0
                ? <>Olası hedefler; etkinlik adı, öğretmen amacı, {ageGroup} yaş bandı ve varsa
                     uyarlama veya materyal notlarındaki anlam ilişkisine göre sıralandı.
                    Resmî eşleştirme veya doğrulama değildir; son seçim öğretmene aittir.</>
                : <>Bu etkinlik için semantik olası eşleşme bulunamadı. Daha fazla hedef
                     ara bölümünden alan veya kodla seçim yapın.</>}
            </p>
          ) : null}
          {curriculumAgeBand && simpleWizardEnabled ? (
            <button
              type="button"
              className="simple-plan-more"
              aria-expanded={simpleTargetToolsOpen}
              onClick={() => setSimpleTargetToolsOpen((current) => !current)}
            >
              {simpleTargetToolsOpen ? "Arama ve alanları kapat" : "Daha fazla hedef ara"}
              <ChevronDownIcon aria-hidden="true" />
            </button>
          ) : null}
          {curriculumAgeBand && (!simpleWizardEnabled || simpleTargetToolsOpen) ? (
            <>
              <KeyboardInput
                value={targetQuery}
                onChange={(event) => setTargetQuery(event.target.value)}
                placeholder="Kod, başlık veya alan ara"
                aria-label="Program hedeflerinde ara"
              />
              <Carousel
                className="plan-area-carousel"
                contentClassName="plan-area-track"
                ariaLabel="Program alanları"
              >
                {targetDomains.map((domain) => (
                  <button
                    type="button"
                    key={domain}
                    aria-pressed={targetDomain === domain}
                    onClick={() => setTargetDomain(domain)}
                  >
                    {domain}
                  </button>
                ))}
              </Carousel>
            </>
          ) : null}
          <div className="curriculum-target-list" role="group" aria-label="Program hedefleri">
            {(simpleWizardEnabled && !simpleTargetToolsOpen
              ? simpleTargetRecommendations.map((recommendation) => recommendation.target)
              : visibleTargets).map((target) => {
              const selected = selectedTargetIds.includes(target.id);
              const recommendation = simpleRecommendationByTargetId.get(target.id);
              return (
                <button
                  type="button"
                  className={selected ? "curriculum-target is-selected" : "curriculum-target"}
                  aria-pressed={selected}
                  key={target.id}
                  onClick={() => {
                    setSelectedTargetIds((current) =>
                      current.includes(target.id)
                        ? current.filter((id) => id !== target.id)
                        : [...current, target.id],
                    );
                    if (simpleWizardEnabled && !selected) setSimpleStep(3);
                  }}
                >
                  <span>
                    <b>{target.referenceCode}</b>
                    <small>{target.domain} · {CURRICULUM_TARGET_KIND_LABELS[target.kind]}</small>
                  </span>
                  <strong>{target.referenceTitle}</strong>
                  {simpleWizardEnabled && recommendation ? (
                    <small className="curriculum-target-reason">
                      Olası eşleşme nedeni: {recommendation.reason}
                    </small>
                  ) : null}
                  <em>{selected ? "Seçildi" : "Seç"}</em>
                </button>
              );
            })}
          </div>
          {curriculumAgeBand && (!simpleWizardEnabled || simpleTargetToolsOpen) ? <p className="catalog-scope-note">
            {targetDomain || targetQuery.trim()
              ? "İlk 16 eşleşme gösterilir; arayarak daha da daraltabilirsiniz."
              : "Seçili yaş bandındaki ilk 6 hedef gösteriliyor. Alan seçerek veya arayarak daraltabilirsiniz."}
          </p> : null}
        </section> : null}

        {!simpleWizardEnabled || simpleStep === 3 ? <details className="quick-details plan-optional-details">
          <summary tabIndex={0}>
            <span>
              <PersonIcon aria-hidden="true" />
              <strong>Çocuk kapsamı</strong>
              <small>{assignmentMode === "whole-class" ? "Tüm sınıf" : `${assignedStudentIds.length} çocuk`}</small>
            </span>
            <ChevronDownIcon aria-hidden="true" />
          </summary>
          <div className="quick-details-fields">
          <div className="assignment-mode" role="radiogroup" aria-label="Öğrenci kapsamı">
            <label>
              <input
                type="radio"
                name="assignment-mode"
                checked={assignmentMode === "whole-class"}
                onChange={() => setAssignmentMode("whole-class")}
              />
              <span><strong>Tüm sınıf</strong><small>Şu anki {students.length} aktif çocuk</small></span>
            </label>
            <label>
              <input
                type="radio"
                name="assignment-mode"
                checked={assignmentMode === "selected-students"}
                onChange={() => setAssignmentMode("selected-students")}
              />
              <span><strong>Seçili çocuklar</strong><small>Farklılaştırılmış takip</small></span>
            </label>
          </div>
          {assignmentMode === "selected-students" ? (
            <div className="student-assignment-list" role="group" aria-label="Seçilecek çocuklar">
              {students.map((student) => (
                <label key={student.id}>
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={(event) =>
                      setSelectedStudentIds((current) =>
                        event.target.checked
                          ? [...current, student.id]
                          : current.filter((id) => id !== student.id),
                      )
                    }
                  />
                  <span>{student.name}</span>
                </label>
              ))}
            </div>
          ) : null}
          <div className="assignment-summary" aria-live="polite">
            <strong>{selectedTargets.length} hedef × {assignedStudentIds.length} çocuk</strong>
            <span>{assignmentCount} planlı takip kaydı açılacak.</span>
          </div>
          </div>
        </details> : null}
        </>}
      </div>
    </MobileScroll>
    {!simpleWizardEnabled || simpleStep === 3 ? <section
      className="plan-save-dock"
      aria-label="Plan kaydetme durumu"
      data-error={errorFeedback ? "true" : "false"}
    >
      {errorFeedback ? (
        <div id="plan-save-readiness">
          <TeacherFeedbackPanel
            feedback={errorFeedback}
            onAction={errorFeedback.action ? applyErrorFeedbackAction : undefined}
            compact
          />
        </div>
      ) : (
        <div
          id="plan-save-readiness"
          className={saveReady ? "plan-readiness is-ready" : "plan-readiness"}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-warning-code={primarySaveBlocker?.code}
        >
          {saveReady ? (
            <CheckCircledIcon aria-hidden="true" />
          ) : (
            <ExclamationTriangleIcon aria-hidden="true" />
          )}
          <span>
            <strong>{saveReadinessTitle}</strong>
            <small>{saveReadinessDetail}</small>
            {primarySaveBlocker?.actionLabel && primarySaveBlocker.apply ? (
              <button
                className="plan-readiness-action"
                type="button"
                onClick={() => {
                  setErrorFeedback(null);
                  primarySaveBlocker.apply?.();
                }}
              >
                {primarySaveBlocker.actionLabel}
              </button>
            ) : null}
          </span>
        </div>
      )}
      <button
        className="d1-primary"
        type="button"
        onClick={() => void save()}
        disabled={saveDisabled}
        aria-describedby="plan-save-readiness"
      >
        {busy ? "Kaydediliyor…" : initialEdit ? "Değişiklikleri kaydet" : initialTemplate ? "Tam gün planını kaydet" : "Planı kaydet"}
      </button>
    </section> : null}
    </>
  );
}

export function PlanCreationFlow({
  civilDate,
  defaultStartTime,
  defaultEndTime,
  ageGroup,
  curriculumProfile,
  students,
  onCreate,
  onUpdate,
  onClose,
  initialTemplate,
  initialEdit,
  initialActivityTitle,
  initialPedagogicalProvenance,
  teacherOwnedDailyFlowContext,
  enforceOfficialTeachingDays,
  schoolCalendarContext,
}: {
  civilDate: string;
  defaultStartTime: string;
  defaultEndTime: string;
  ageGroup: string;
  curriculumProfile: CurriculumProfileSnapshot;
  students: Student[];
  onCreate: (command: PlanCreationCommand) => Promise<void>;
  onUpdate?: (command: PlanUpdateCommand) => Promise<void>;
  onClose: () => void;
  initialTemplate?: PremiumDailyTemplateSelection;
  initialEdit?: ScheduledPlanEditDraft;
  initialActivityTitle?: string;
  initialPedagogicalProvenance?: PedagogicalPlanProvenance;
  teacherOwnedDailyFlowContext?: TeacherOwnedDailyFlowContext;
  enforceOfficialTeachingDays?: boolean;
  schoolCalendarContext?: Omit<ResolveSchoolDayInput, "civilDate">;
}) {
  const initial = useMemo<FlowScreen>(
    () => ({
      id: initialEdit ? "plan-edit" : "plan-create",
      title: initialEdit ? "Planı düzenle" : "Plan oluştur",
      headerHeight: 64,
      header: createFlowHeader(initialEdit ? "Planı düzenle" : "Plan oluştur", "3 adım", onClose),
      render: () => (
        <PlanCreationScreen
          civilDate={civilDate}
          defaultStartTime={defaultStartTime}
          defaultEndTime={defaultEndTime}
          ageGroup={ageGroup}
          curriculumProfile={curriculumProfile}
          students={students}
          onCreate={onCreate}
          onUpdate={onUpdate}
          initialTemplate={initialTemplate}
          initialEdit={initialEdit}
          initialActivityTitle={initialActivityTitle}
          initialPedagogicalProvenance={initialPedagogicalProvenance}
          teacherOwnedDailyFlowContext={teacherOwnedDailyFlowContext}
          enforceOfficialTeachingDays={enforceOfficialTeachingDays}
          schoolCalendarContext={schoolCalendarContext}
        />
      ),
    }),
    [
      civilDate,
      ageGroup,
      curriculumProfile,
      defaultEndTime,
      defaultStartTime,
      students,
      onClose,
      onCreate,
      onUpdate,
      initialTemplate,
      initialEdit,
      initialActivityTitle,
      initialPedagogicalProvenance,
      teacherOwnedDailyFlowContext,
      enforceOfficialTeachingDays,
      schoolCalendarContext,
    ],
  );

  return <FlowStack initial={initial} />;
}
