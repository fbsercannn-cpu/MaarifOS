import type { TeacherWorkCycleWorkspace } from "../teacher-cycle/teacher-work-cycle.ts";

export type PlanWorkbenchLevelId = "annual" | "monthly" | "weekly" | "daily";
export type PlanWorkbenchTone = "attention" | "current" | "ready" | "waiting";

export interface PlanWorkbenchLevel {
  id: PlanWorkbenchLevelId;
  label: string;
  title: string;
  detail: string;
  meta: string;
  actionLabel: string;
  tone: PlanWorkbenchTone;
}

export interface PlanWorkbenchPresentation {
  configured: boolean;
  linkedLevelCount: number;
  levels: readonly PlanWorkbenchLevel[];
  priority: {
    levelId: PlanWorkbenchLevelId;
    eyebrow: string;
    title: string;
    detail: string;
    actionLabel: string;
  };
}

function civilDateLabel(civilDate: string): string {
  const [year, month, day] = civilDate.split("-").map(Number);
  if (!year || !month || !day) return civilDate;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function periodLabel(periodStart: string, periodEnd: string): string {
  return `${civilDateLabel(periodStart)}–${civilDateLabel(periodEnd)}`;
}

function periodTone(relation: "current" | "upcoming" | "past"): PlanWorkbenchTone {
  if (relation === "current") return "current";
  if (relation === "upcoming") return "waiting";
  return "ready";
}

function relationLabel(relation: "current" | "upcoming" | "past"): string {
  if (relation === "current") return "İçinde bulunduğunuz dönem";
  if (relation === "upcoming") return "Yaklaşan dönem";
  return "Geçmiş dönem";
}

export function createPlanWorkbenchPresentation(
  workspace: TeacherWorkCycleWorkspace,
  options: {
    educationalWritesDisabled?: boolean;
    preparationPlanningAllowed?: boolean;
    preparationPlanningCivilDate?: string | null;
    upcomingPlanningCivilDate?: string | null;
  } = {},
): PlanWorkbenchPresentation {
  const annual: PlanWorkbenchLevel = workspace.annual
    ? {
        id: "annual",
        label: "Yıl",
        title: workspace.annual.title,
        detail: periodLabel(workspace.annual.periodStart, workspace.annual.periodEnd),
        meta: relationLabel(workspace.annual.relation),
        actionLabel: "Yıllık omurgayı aç",
        tone: periodTone(workspace.annual.relation),
      }
    : {
        id: "annual",
        label: "Yıl",
        title: "Yıllık plan omurgası yok",
        detail: "Ay, hafta ve gün planlarının bağlanacağı yıllık kaynağı seçin.",
        meta: "Kurulum gerekli",
        actionLabel: "Yıllık planları aç",
        tone: "attention",
      };

  const monthly: PlanWorkbenchLevel = workspace.monthly
    ? {
        id: "monthly",
        label: "Ay",
        title: workspace.monthly.title,
        detail: `${workspace.monthly.weeklyPlanCount} hafta · ${workspace.monthly.dailyPlanCount} günlük plan`,
        meta: `${periodLabel(workspace.monthly.periodStart, workspace.monthly.periodEnd)} · ${relationLabel(workspace.monthly.relation)}`,
        actionLabel:
          workspace.monthly.evaluationCount > 0
            ? "Değerlendirmeyi aç"
            : "Ayı planla ve değerlendir",
        tone:
          workspace.monthly.evaluationCount > 0
            ? "ready"
            : periodTone(workspace.monthly.relation),
      }
    : {
        id: "monthly",
        label: "Ay",
        title: "Aylık plan zinciri yok",
        detail: "Aylık hedefleri, haftaları ve değerlendirmeyi aynı kaynağa bağlayın.",
        meta: "Yıllık omurgadan sonra",
        actionLabel: "Aylık planları aç",
        tone: "attention",
      };

  const weekly: PlanWorkbenchLevel = workspace.weekly
    ? {
        id: "weekly",
        label: "Hafta",
        title: workspace.weekly.title,
        detail: `${workspace.weekly.dailyPlanCount} günlük plan · ${workspace.weekly.linkedObservationCount}/${workspace.weekly.observationCount} bağlı gözlem`,
        meta: `${periodLabel(workspace.weekly.periodStart, workspace.weekly.periodEnd)} · ${relationLabel(workspace.weekly.relation)}`,
        actionLabel:
          workspace.weekly.evaluationCount > 0
            ? "Haftalık kararı aç"
            : "Haftayı planla ve değerlendir",
        tone:
          workspace.weekly.evaluationCount > 0
            ? "ready"
            : workspace.weekly.observationCount > 0
              ? "attention"
              : periodTone(workspace.weekly.relation),
      }
    : {
        id: "weekly",
        label: "Hafta",
        title: "Haftalık plan zinciri yok",
        detail: "Günlük uygulamaların ve hafta sonu kararının bağlanacağı haftayı hazırlayın.",
        meta: "Aylık plandan sonra",
        actionLabel: "Haftalık planları aç",
        tone: "attention",
      };

  const daily: PlanWorkbenchLevel = workspace.daily.status === "conflict"
    ? {
        id: "daily",
        label: "Gün",
        title: "Günlük plan çakışması",
        detail: `${workspace.daily.conflictingPlanIds.length} plan aynı sınıf ve tarihe bağlı. Etkinlikler tamamlanmış sayılmadan kayıtları inceleyin.`,
        meta: `${civilDateLabel(workspace.civilDate)} · İnceleme gerekli`,
        actionLabel: "Çakışmayı incele",
        tone: "attention",
      }
    : workspace.daily.planId
    ? {
        id: "daily",
        label: "Gün",
        title: workspace.daily.title,
        detail: `${workspace.daily.completedActivityCount}/${workspace.daily.activityCount} etkinlik tamamlandı · ${workspace.daily.observationCount} gözlem`,
        meta: civilDateLabel(workspace.civilDate),
        actionLabel: "Günlük akışı aç",
        tone:
          workspace.daily.activityCount > 0 &&
          workspace.daily.completedActivityCount >= workspace.daily.activityCount
            ? "ready"
            : "current",
      }
    : options.preparationPlanningAllowed || options.upcomingPlanningCivilDate
      ? {
          id: "daily",
          label: "Gün",
          title: "İlk öğretim gününün planını hazırlayın",
          detail: "Planı şimdi hazırlayın; uygulama, yoklama ve gözlem plan gününde açılır.",
          meta: civilDateLabel(
            options.preparationPlanningCivilDate ??
              options.upcomingPlanningCivilDate ??
              workspace.civilDate,
          ),
          actionLabel: "İlk gün planını oluştur",
          tone: "attention",
        }
      : options.educationalWritesDisabled
      ? {
          id: "daily",
          label: "Gün",
          title: "Günlük plan yazımı kilitli",
          detail: "Bugün etkin olan eğitim yılını seçmeden yeni plan yazılamaz.",
          meta: civilDateLabel(workspace.civilDate),
          actionLabel: "Çalışmayı bugün başlat",
          tone: "waiting",
        }
      : {
          id: "daily",
          label: "Gün",
          title: "Bugünün günlük planı yok",
          detail: "Sınıf başlamadan akışı, etkinliği ve geçişleri hazırlayın.",
          meta: civilDateLabel(workspace.civilDate),
          actionLabel: "Günlük plan oluştur",
          tone: "attention",
        };

  const levels = [annual, monthly, weekly, daily] as const;
  const hierarchyGap = !workspace.annual
    ? annual
    : !workspace.monthly
      ? monthly
      : !workspace.weekly
        ? weekly
        : null;
  const priorityLevel =
    hierarchyGap ??
    (options.educationalWritesDisabled && !options.preparationPlanningAllowed
      ? daily
      : levels.find((level) => level.tone === "attention") ??
        levels.find((level) => level.tone === "current") ??
        daily);

  return {
    configured: workspace.status === "ready",
    linkedLevelCount: [
      workspace.annual,
      workspace.monthly,
      workspace.weekly,
      workspace.daily.planId,
    ].filter(Boolean).length,
    levels,
    priority: {
      levelId: priorityLevel.id,
      eyebrow:
        priorityLevel.id === "daily" &&
          options.educationalWritesDisabled &&
          !options.preparationPlanningAllowed
          ? "Günlük yazım bekliyor"
          : "Sıradaki planlama işi",
      title: priorityLevel.title,
      detail: priorityLevel.detail,
      actionLabel: priorityLevel.actionLabel,
    },
  };
}
