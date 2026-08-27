import type { TeacherDayClosureWorkspace } from "../day-closure/teacher-day-closure.ts";
import type {
  SetupProgressPresentation,
  SetupProgressStepId,
} from "../onboarding/setup-progress-model.ts";
import type {
  TeacherCyclePresentation,
  TeacherCycleStageId,
  TodayControlCenterSummary,
} from "./today-screen-model.ts";

export type MarifTeacherAgentTone = "attention" | "current" | "ready";

export type MarifTeacherAgentAction =
  | { kind: "setup"; stepId: SetupProgressStepId }
  | { kind: "attendance" }
  | { kind: "plan" }
  | { kind: "pending-observation" }
  | { kind: "teacher-cycle"; stageId: TeacherCycleStageId }
  | { kind: "day-closure" }
  | { kind: "calendar" };

export interface MarifTeacherAgentCritique {
  id: string;
  title: string;
  detail: string;
}

export interface MarifTeacherAgentBrief {
  tone: MarifTeacherAgentTone;
  eyebrow: string;
  title: string;
  rationale: string;
  actionLabel: string;
  action: MarifTeacherAgentAction;
  evidence: readonly string[];
  critiques: readonly MarifTeacherAgentCritique[];
}

export interface CreateMarifTeacherAgentBriefInput {
  educationalWritesDisabled: boolean;
  setup: SetupProgressPresentation;
  control: TodayControlCenterSummary;
  cycle: TeacherCyclePresentation;
  dayClosure: TeacherDayClosureWorkspace;
}

function cycleStage(
  cycle: TeacherCyclePresentation,
  stageId: TeacherCycleStageId,
) {
  return cycle.stages.find((stage) => stage.id === stageId) ?? null;
}

/**
 * MARİF'in cihaz içi öğretmen brifingi üretken metin üretmez. Yalnız canlı
 * kanonik read-model'leri önem sırasına koyar, gerekçesini gösterir ve kayıt
 * yapan mevcut akışa yönlendirir. Hiçbir öneri öğretmen eylemi olmadan yazılmaz.
 */
export function createMarifTeacherAgentBrief(
  input: CreateMarifTeacherAgentBriefInput,
): MarifTeacherAgentBrief {
  const weekly = cycleStage(input.cycle, "weekly");
  const monthly = cycleStage(input.cycle, "monthly");
  const documents = cycleStage(input.cycle, "documents");
  const activeCarryCount = input.dayClosure.carryForwardItems.filter(
    (item) => item.state === "open" || item.isDeferredDue,
  ).length;
  const teachingContextReady =
    !input.educationalWritesDisabled && input.control.attendance.expected > 0;
  const critiques: MarifTeacherAgentCritique[] = [];

  if (!input.setup.isComplete && input.setup.currentStep) {
    critiques.push({
      id: `setup-${input.setup.currentStep.id}`,
      title: input.setup.currentStep.title,
      detail: input.setup.currentStep.detail,
    });
  }
  if (input.educationalWritesDisabled) {
    critiques.push({
      id: "academic-year-write-lock",
      title: "Yeni dönem kullanıma hazır",
      detail: "Öğretmen isterse planlamayı sürdürür, isterse dönemi bugün gerçek kayıt kullanımına açar.",
    });
  }
  if (!input.educationalWritesDisabled && input.control.attendance.unmarked > 0) {
    critiques.push({
      id: "attendance-unmarked",
      title: `${input.control.attendance.unmarked} çocuğun devam durumu eksik`,
      detail: "Günlük kanıt ve kapanıştan önce yoklama tamamlanmalıdır.",
    });
  }
  if (input.cycle.stages[0]?.tone === "attention") {
    critiques.push({
      id: "daily-plan-attention",
      title: input.cycle.stages[0].title,
      detail: input.cycle.stages[0].detail,
    });
  }
  if (!input.educationalWritesDisabled && input.control.priority.count > 0) {
    critiques.push({
      id: "curriculum-link-pending",
      title: input.control.priority.title,
      detail: input.control.priority.detail,
    });
  }
  if (!input.educationalWritesDisabled && activeCarryCount > 0) {
    critiques.push({
      id: "carry-forward-open",
      title: `${activeCarryCount} taşınan iş yeniden karar bekliyor`,
      detail: "Açık veya vadesi gelen iş çözülmeden günün kanıt zinciri tamamlanmış sayılmaz.",
    });
  }
  if (!input.educationalWritesDisabled && input.dayClosure.status === "stale") {
    critiques.push({
      id: "day-closure-stale",
      title: "Gün kapanışı güncelliğini kaybetti",
      detail: "Kapanıştan sonra kanıt değişti; öğretmen yeniden incelemelidir.",
    });
  } else if (
    !input.educationalWritesDisabled &&
    input.dayClosure.status === "open" &&
    input.dayClosure.issues.length > 0
  ) {
    critiques.push({
      id: "day-closure-open",
      title: `${input.dayClosure.issues.length} gün kapanışı işi var`,
      detail: input.dayClosure.issues[0]?.detail ?? "Gün sonu kanıtları tamamlanmalıdır.",
    });
  }
  if (weekly?.tone === "attention") {
    critiques.push({ id: "weekly-review", title: weekly.title, detail: weekly.detail });
  }
  if (monthly?.tone === "attention") {
    critiques.push({ id: "monthly-review", title: monthly.title, detail: monthly.detail });
  }

  const evidence = [
    `Sınıf ${input.control.attendance.expected} çocuk`,
    input.educationalWritesDisabled
      ? "Yoklama öğretmen başlatınca açılacak"
      : `Yoklama ${input.control.attendance.expected - input.control.attendance.unmarked}/${input.control.attendance.expected}`,
    input.educationalWritesDisabled
      ? "Program bağı yazımı kapalı"
      : `Bekleyen program bağı ${input.control.priority.count}`,
    input.educationalWritesDisabled ? "Gün kapanışı beklemede" : `Taşınan iş ${activeCarryCount}`,
  ];

  if (
    input.educationalWritesDisabled &&
    !input.setup.isComplete &&
    input.setup.currentStep
  ) {
    return {
      tone: "attention",
      eyebrow: "MARİF · öğretmen asistanı",
      title: input.setup.currentStep.title,
      rationale: `Önce ${input.setup.currentStep.label.toLocaleLowerCase("tr-TR")} tamamlanmalı; sonraki öneriler bu kanıta dayanacak.`,
      actionLabel: input.setup.currentStep.actionLabel,
      action: { kind: "setup", stepId: input.setup.currentStep.id },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  if (input.educationalWritesDisabled) {
    return {
      tone: "attention",
      eyebrow: "MARİF · öğretmen asistanı",
      title: "Yeni dönemle bugün çalışmaya başlayın",
      rationale: "Sınıf ve çocuklar hazır. Beklemek zorunda değilsiniz; çalışma başlangıcını bugüne alarak gerçek kayda geçebilirsiniz.",
      actionLabel: "Çalışmayı bugün başlat",
      action: { kind: "setup", stepId: "classroom" },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  if (teachingContextReady && activeCarryCount > 0) {
    return {
      tone: "attention",
      eyebrow: "MARİF · öğretmen asistanı",
      title: "Önce dünden taşınan işi karara bağlayın",
      rationale: "Vadesi gelen eksik kanıt bugünkü plan ve değerlendirme zincirini etkiliyor.",
      actionLabel: "Taşınan işleri aç",
      action: { kind: "day-closure" },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  if (teachingContextReady && input.control.attendance.unmarked > 0) {
    return {
      tone: "attention",
      eyebrow: "MARİF · öğretmen asistanı",
      title: "Yoklamayı tamamlayın",
      rationale: `${input.control.attendance.unmarked} çocuk işaretlenmedi; gözlem kapsamı ve gün kapanışı henüz güvenilir değil.`,
      actionLabel: "Yoklamayı aç",
      action: { kind: "attendance" },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  const daily = input.cycle.stages[0];
  if (teachingContextReady && daily?.tone === "attention") {
    return {
      tone: "attention",
      eyebrow: "MARİF · öğretmen asistanı",
      title: daily.title,
      rationale: daily.detail,
      actionLabel: daily.actionLabel,
      action: { kind: "teacher-cycle", stageId: "daily" },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  if (input.cycle.currentStep === "apply") {
    return {
      tone: "current",
      eyebrow: "MARİF · öğretmen asistanı",
      title: input.control.plan.title,
      rationale: `${input.control.plan.detail}. Uygulama tamamlandığında aynı etkinlikten gözlem kaydı açılacak.`,
      actionLabel: "Akışı aç",
      action: { kind: "plan" },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  if (!input.setup.isComplete && input.setup.currentStep) {
    return {
      tone: "attention",
      eyebrow: "MARİF · bakım ve hazırlık",
      title: input.setup.currentStep.title,
      rationale: `${input.setup.currentStep.detail} Bugünün öğretim işi engellenmeden bu hazırlığı ayrıca tamamlayabilirsiniz.`,
      actionLabel: input.setup.currentStep.actionLabel,
      action: { kind: "setup", stepId: input.setup.currentStep.id },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  if (input.control.priority.count > 0) {
    return {
      tone: "attention",
      eyebrow: "MARİF · öğretmen asistanı",
      title: input.control.priority.title,
      rationale: "Ham gözlem korunuyor; program bağı tamamlanmadan değerlendirme ve belge kanıtı sayılmıyor.",
      actionLabel: "Program bağını tamamla",
      action: { kind: "pending-observation" },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  if (input.dayClosure.status === "stale" || input.dayClosure.status === "open") {
    return {
      tone: input.dayClosure.status === "stale" ? "attention" : "current",
      eyebrow: "MARİF · öğretmen asistanı",
      title: input.dayClosure.status === "stale" ? "Gün kapanışını yeniden doğrulayın" : "Günü kanıtlarla kapatın",
      rationale: input.dayClosure.status === "stale"
        ? "Kapanıştan sonra kayıt değişti; eski hüküm otomatik korunmuyor."
        : "Yoklama, uygulama, gözlem ve program bağını tek özette kontrol edin.",
      actionLabel: "Gün kapanışını aç",
      action: { kind: "day-closure" },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  if (weekly?.tone === "attention") {
    return {
      tone: "attention",
      eyebrow: "MARİF · öğretmen asistanı",
      title: weekly.title,
      rationale: weekly.detail,
      actionLabel: weekly.actionLabel,
      action: { kind: "teacher-cycle", stageId: "weekly" },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  if (monthly?.tone === "attention") {
    return {
      tone: "attention",
      eyebrow: "MARİF · öğretmen asistanı",
      title: monthly.title,
      rationale: monthly.detail,
      actionLabel: monthly.actionLabel,
      action: { kind: "teacher-cycle", stageId: "monthly" },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  if (documents?.tone === "attention" || input.cycle.currentStep === "document") {
    return {
      tone: documents?.tone === "attention" ? "attention" : "ready",
      eyebrow: "MARİF · öğretmen asistanı",
      title: documents?.title ?? "Belge kaynaklarını gözden geçirin",
      rationale: documents?.detail ?? "Kaydedilmiş kanıtlar belge merkezinde yeniden kullanılır.",
      actionLabel: documents?.actionLabel ?? "Belge merkezini aç",
      action: { kind: "teacher-cycle", stageId: "documents" },
      evidence,
      critiques: critiques.slice(0, 4),
    };
  }
  return {
    tone: "ready",
    eyebrow: "MARİF · öğretmen asistanı",
    title: "Bugünün temel zinciri güncel",
    rationale: "Yeni kayıt üretmeden önce sınıf takvimini ve yaklaşan planları inceleyebilirsiniz.",
    actionLabel: "Takvimi aç",
    action: { kind: "calendar" },
    evidence,
    critiques: critiques.slice(0, 4),
  };
}
