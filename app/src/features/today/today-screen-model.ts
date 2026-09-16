import type { ReactNode } from "react";

import type { DashboardStudent } from "../dashboard/dashboard-data.ts";
import type {
  ClassroomContext,
  TodayActivityStatus,
  TodayPlanItem,
  TodayWorkspace,
} from "./today-data.ts";
import type { TeacherWorkCycleWorkspace } from "../teacher-cycle/teacher-work-cycle.ts";
import type { SetupProgressInput } from "../onboarding/setup-progress-model.ts";
import type { TeacherDayClosureWorkspace } from "../day-closure/teacher-day-closure.ts";
import type { TeacherWeekWorkspace } from "../teacher-cycle/teacher-week-workspace.ts";

export type TodayConfiguredClassroom = Extract<
  ClassroomContext,
  { status: "configured" }
>;

export interface TodayStudentCard {
  id: string;
  name: string;
  preferredName?: string;
  birthDate?: string;
  profilePhotoDataUrl?: string;
  observationCount: number;
}

export interface TodayAttendanceSummary {
  present: number;
  late: number;
  absent: number;
  marked: number;
  total: number;
}

export interface TodaySyncStateView {
  label: string;
  className: string;
  icon: ReactNode;
}

export interface TodayScreenModel {
  workspace: TodayWorkspace;
  civilDateLabel: string;
  students: readonly TodayStudentCard[];
  attendance: TodayAttendanceSummary;
  syncState: TodaySyncStateView;
  educationalWriteNotice: string | null;
  educationalWritesDisabled: boolean;
  dataBusy: boolean;
  updateReady: boolean;
  updateVersion: string;
  pendingObservationCount: number;
  planEvidenceDetailsEnabled: boolean;
  premiumPlanCenterEnabled: boolean;
  teacherCycle: TeacherWorkCycleWorkspace;
  teacherWeek: TeacherWeekWorkspace;
  dayClosure: TeacherDayClosureWorkspace;
  setupProgress: SetupProgressInput;
}

export type TeacherCycleStageId = "daily" | "weekly" | "monthly" | "documents";
export type TeacherCycleStageTone = "attention" | "current" | "ready" | "waiting";

export interface TeacherCycleStagePresentation {
  id: TeacherCycleStageId;
  label: string;
  title: string;
  detail: string;
  actionLabel: string;
  tone: TeacherCycleStageTone;
}

export interface TeacherCyclePresentation {
  currentStep: "plan" | "apply" | "observe" | "evaluate" | "document";
  stages: readonly TeacherCycleStagePresentation[];
}

function periodLabel(periodStart: string, periodEnd: string): string {
  return `${periodStart}–${periodEnd}`;
}

function shortCivilDateLabel(civilDate: string): string {
  const [year, month, day] = civilDate.split("-").map(Number);
  if (!year || !month || !day) return civilDate;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function createTeacherCyclePresentation(
  workspace: TeacherWorkCycleWorkspace,
  options: { educationalWritesDisabled?: boolean } = {},
): TeacherCyclePresentation {
  const daily: TeacherCycleStagePresentation = workspace.daily.status === "conflict"
    ? {
        id: "daily",
        label: "Günlük",
        title: "Günlük plan çakışması",
        detail: `${workspace.daily.conflictingPlanIds.length} plan aynı sınıf ve tarihe bağlı · kayıtları birleştirmeden inceleyin.`,
        actionLabel: "Planları incele",
        tone: "attention",
      }
    : workspace.daily.status === "chain-mismatch"
      ? {
          id: "daily",
          label: "Günlük",
          title: "Bugünün planını haftasına bağla",
          detail: "Kayıt korundu; seçili haftalık plan zincirine bağlı olmadığı için bugünün akışına alınmadı.",
          actionLabel: "Bağı takvimde incele",
          tone: "attention",
        }
    : workspace.daily.status === "future-only"
      ? {
          id: "daily",
          label: "Günlük",
          title: `Bugün plan yok; sıradaki plan ${
            workspace.daily.referenceCivilDate
              ? shortCivilDateLabel(workspace.daily.referenceCivilDate)
              : "yaklaşan tarihte"
          }`,
          detail: workspace.daily.referenceTitle
            ? `Yaklaşan kayıt: ${workspace.daily.referenceTitle}`
            : "Yaklaşan günlük plan kaydı korunuyor.",
          actionLabel: "Yaklaşan planı aç",
          tone: "attention",
        }
    : workspace.daily.planId
    ? workspace.daily.activityCount > 0 &&
      workspace.daily.completedActivityCount >= workspace.daily.activityCount
      ? {
          id: "daily",
          label: "Günlük",
          title: "Günün uygulaması tamamlandı",
          detail: `${workspace.daily.activityCount} etkinlik · ${workspace.daily.observationCount} gözlem`,
          actionLabel: "Planı aç",
          tone: "ready",
        }
      : {
          id: "daily",
          label: "Günlük",
          title: workspace.daily.title,
          detail: `${workspace.daily.completedActivityCount}/${workspace.daily.activityCount} etkinlik tamamlandı · ${workspace.daily.observationCount} gözlem`,
          actionLabel: "Akışı aç",
          tone: "current",
        }
    : options.educationalWritesDisabled
      ? {
          id: "daily",
          label: "Günlük",
          title: "Günlük yazım henüz açık değil",
          detail: "Eğitim yılı etkin olduğunda bugünün planı hazırlanır.",
          actionLabel: "Çalışmayı bugün başlat",
          tone: "waiting",
        }
      : {
        id: "daily",
        label: "Günlük",
        title: "Bugünün planı yok",
        detail: "Sınıf başlamadan günlük akışı hazırlayın.",
        actionLabel: "Plan oluştur",
        tone: "attention",
        };

  const weekly: TeacherCycleStagePresentation = !workspace.weekly
    ? {
        id: "weekly",
        label: "Haftalık",
        title: "Haftalık plan zinciri yok",
        detail: "Yıllık ve aylık omurgadan haftayı hazırlayın.",
        actionLabel: "Haftaları aç",
        tone: "attention",
      }
    : workspace.weekly.relation === "upcoming"
      ? {
          id: "weekly",
          label: "Haftalık",
          title: workspace.weekly.title,
          detail: `Plan şimdi düzenlenebilir · ${periodLabel(workspace.weekly.periodStart, workspace.weekly.periodEnd)}`,
          actionLabel: "Planı şimdi düzenle",
          tone: "current",
        }
      : workspace.weekly.evaluationCount > 0
        ? {
            id: "weekly",
            label: "Haftalık",
            title: "Haftalık karar kaydedildi",
            detail: `${workspace.weekly.observationCount} gözlem · ${workspace.weekly.evaluationCount} değerlendirme`,
            actionLabel: "Kararı aç",
            tone: "ready",
          }
        : workspace.weekly.relation === "past" ||
            workspace.civilDate >= workspace.weekly.periodEnd
          ? {
            id: "weekly",
            label: "Haftalık",
            title: "Haftalık değerlendirme bekliyor",
            detail: `${workspace.weekly.dailyPlanCount} günlük plan · ${workspace.weekly.linkedObservationCount}/${workspace.weekly.observationCount} bağlı gözlem`,
            actionLabel: "Haftayı değerlendir",
            tone: "attention",
          }
          : {
              id: "weekly",
              label: "Haftalık",
              title: workspace.weekly.title,
              detail: `${workspace.weekly.dailyPlanCount} günlük plan · ${workspace.weekly.linkedObservationCount}/${workspace.weekly.observationCount} bağlı gözlem · dönem sürüyor`,
              actionLabel: "Haftayı izle",
              tone: "current",
            };

  const monthly: TeacherCycleStagePresentation = !workspace.monthly
    ? {
        id: "monthly",
        label: "Aylık",
        title: "Aylık plan zinciri yok",
        detail: "Aylık plan ve değerlendirme aynı kayıtta buluşmalı.",
        actionLabel: "Ayları aç",
        tone: "attention",
      }
    : workspace.monthly.relation === "upcoming"
      ? {
          id: "monthly",
          label: "Aylık",
          title: workspace.monthly.title,
          detail: `Plan şimdi düzenlenebilir · ${periodLabel(workspace.monthly.periodStart, workspace.monthly.periodEnd)}`,
          actionLabel: "Planı şimdi düzenle",
          tone: "current",
        }
      : workspace.monthly.evaluationCount > 0
        ? {
            id: "monthly",
            label: "Aylık",
            title: "Aylık değerlendirme kayıtlı",
            detail: `${workspace.monthly.observationCount} gözlem · ${workspace.monthly.evaluationCount} değerlendirme`,
            actionLabel: "Ek 18 ve değerlendirme",
            tone: "ready",
          }
        : workspace.monthly.relation === "past" ||
            workspace.civilDate >= workspace.monthly.periodEnd
          ? {
            id: "monthly",
            label: "Aylık",
            title: "Aylık değerlendirme bekliyor",
            detail: `${workspace.monthly.weeklyPlanCount} hafta · ${workspace.monthly.linkedObservationCount}/${workspace.monthly.observationCount} bağlı gözlem`,
            actionLabel: "Ayı değerlendir",
            tone: "attention",
          }
          : {
              id: "monthly",
              label: "Aylık",
              title: workspace.monthly.title,
              detail: `${workspace.monthly.weeklyPlanCount} hafta · ${workspace.monthly.linkedObservationCount}/${workspace.monthly.observationCount} bağlı gözlem · dönem sürüyor`,
              actionLabel: "Ayı izle",
              tone: "current",
            };

  const documentPending =
    workspace.documents.anecdoteIncompleteCount +
    workspace.documents.anecdoteReviewRequiredCount;
  const documentReady =
    workspace.documents.anecdoteReadyCount +
    workspace.documents.monthlyEvaluationCount +
    (workspace.documents.planDocumentReady ? 1 : 0);
  const documents: TeacherCycleStagePresentation = documentPending > 0
    ? {
        id: "documents",
        label: "Belgeler",
        title: `${documentPending} kayıt tamamlanmayı bekliyor`,
        detail: `${documentReady} belge kaynağı hazır · anekdot, plan ve Ek 18`,
        actionLabel: "Belgeleri tamamla",
        tone: "attention",
      }
    : {
        id: "documents",
        label: "Belgeler",
        title: documentReady > 0 ? `${documentReady} belge kaynağı hazır` : "Belge kaynağı henüz yok",
        detail: "Plan, değerlendirme ve anekdot çıktıları tek merkezde.",
        actionLabel: "Belge merkezini aç",
        tone: documentReady > 0 ? "ready" : "waiting",
      };

  const currentStep: TeacherCyclePresentation["currentStep"] =
    workspace.daily.status === "conflict" || !workspace.daily.planId
      ? "plan"
      : workspace.daily.activityCount > workspace.daily.completedActivityCount
        ? "apply"
        : workspace.daily.observationCount === 0 && workspace.pendingCurriculumLinkCount > 0
          ? "observe"
          : weekly.tone === "attention" || monthly.tone === "attention"
            ? "evaluate"
            : "document";

  return { currentStep, stages: [daily, weekly, monthly, documents] };
}

export interface TodayControlCenterSummary {
  attendance: {
    inClass: number;
    expected: number;
    absent: number;
    late: number;
    unmarked: number;
    stateLabel: string;
    detailLabel: string;
  };
  plan: {
    item: TodayPlanItem | null;
    label: string;
    title: string;
    detail: string;
  };
  priority: {
    count: number;
    title: string;
    detail: string;
  };
}

export const TODAY_ACTIVITY_STATUS_LABELS: Readonly<
  Record<TodayActivityStatus, string>
> = Object.freeze({
  planned: "Sıradaki",
  in_progress: "Uygulanıyor",
  completed: "Tamamlandı",
});

export function configuredClassroomFromToday(
  workspace: TodayWorkspace,
): TodayConfiguredClassroom | null {
  return workspace.classroom.status === "configured"
    ? workspace.classroom
    : null;
}

export function focusActivityFromToday(workspace: TodayWorkspace) {
  const actionableItems = workspace.planItems.filter(
    (item) => item.activityId && item.canCaptureEvidence,
  );
  return (
    workspace.currentActivity ??
    actionableItems.find((item) => item.status === "planned") ??
    actionableItems[0] ??
    workspace.planItems[0] ??
    null
  );
}

export function createTodayControlCenterSummary(options: {
  workspace: TodayWorkspace;
  attendance: TodayAttendanceSummary;
  pendingObservationCount: number;
  teacherCycle?: TeacherWorkCycleWorkspace;
}): TodayControlCenterSummary {
  const { workspace, attendance, pendingObservationCount, teacherCycle } = options;
  const item = focusActivityFromToday(workspace);
  const inClass = attendance.present + attendance.late;
  const unmarked = Math.max(0, attendance.total - attendance.marked);
  const attendanceDetail = [
    `${attendance.absent} yok`,
    `${attendance.late} geç`,
    ...(unmarked > 0 ? [`${unmarked} işaretlenmedi`] : []),
  ].join(" · ");
  const planTime = item
    ? item.startTime ??
      (item.durationMinutes ? `${item.durationMinutes} dk` : "Akış sırası")
    : null;
  const referencedDaily = teacherCycle?.daily;
  const planDetail = item
    ? `${planTime}${item.endTime ? `–${item.endTime}` : ""} · ${todayPlanItemStatusLabel(item)}`
    : referencedDaily?.status === "chain-mismatch"
      ? "Kayıt korundu · haftalık plan bağı takvimde incelenmeli"
      : referencedDaily?.status === "future-only"
        ? referencedDaily.referenceTitle
          ? `Yaklaşan kayıt: ${referencedDaily.referenceTitle}`
          : "Yaklaşan günlük plan takvimde kayıtlı"
    : workspace.classroom.status === "configured"
      ? "Günlük plan oluştur"
      : "Sınıf ve program bilgilerini tamamla";

  return {
    attendance: {
      inClass,
      expected: attendance.total,
      absent: attendance.absent,
      late: attendance.late,
      unmarked,
      stateLabel:
        attendance.total === 0
          ? "Sınıf listesi boş"
          : unmarked > 0
            ? "Yoklama eksik"
            : "Yoklama tamam",
      detailLabel: attendanceDetail,
    },
    plan: {
      item,
      label: !item
        ? "Günün planı"
        : item.status === "in_progress"
          ? "Sınıfta şimdi"
          : item.status === "completed"
            ? "Son plan kaydı"
            : item.kind === "premium-flow-block"
              ? "Sıradaki akış adımı"
              : "Sıradaki etkinlik",
      title:
        item?.title ??
        (referencedDaily?.status === "chain-mismatch"
          ? "Bugünün planını haftasına bağla"
          : referencedDaily?.status === "future-only"
            ? `Bugün plan yok; sıradaki plan ${
                referencedDaily.referenceCivilDate
                  ? shortCivilDateLabel(referencedDaily.referenceCivilDate)
                  : "yaklaşan tarihte"
              }`
        : workspace.classroom.status === "configured"
          ? "Bugün için plan yok"
          : "Sınıf kurulumu gerekli"),
      detail: planDetail,
    },
    priority: {
      count: pendingObservationCount,
      title:
        pendingObservationCount > 0
          ? `${pendingObservationCount} gözlem için hedef seç ve bağla`
          : "Gözlemlerin program bağlantıları tamam",
      detail:
        pendingObservationCount > 0
          ? "Gözlemi açın, kaynak hedefini seçin ve bağlantıyı kaydedin."
          : "Bekleyen gözlem yok.",
    },
  };
}

export function todayPlanItemStatusLabel(item: TodayPlanItem): string {
  if (item.flowBlockStatus === "skipped") return "Atlandı";
  if (item.status === "in_progress" || item.status === "completed") {
    return TODAY_ACTIVITY_STATUS_LABELS[item.status];
  }
  if (item.flowBlockStatus === "optional") return "İsteğe bağlı";
  return item.kind === "premium-flow-block"
    ? "Planlandı"
    : TODAY_ACTIVITY_STATUS_LABELS.planned;
}

export function createTodayStudentCards(
  students: readonly DashboardStudent[],
  observationCountByStudent: ReadonlyMap<string, number>,
): TodayStudentCard[] {
  return students.map((student) => ({
    id: student.id,
    name: student.name,
    ...(student.preferredName
      ? { preferredName: student.preferredName }
      : {}),
    ...(student.birthDate ? { birthDate: student.birthDate } : {}),
    ...(student.profilePhotoDataUrl
      ? { profilePhotoDataUrl: student.profilePhotoDataUrl }
      : {}),
    observationCount: observationCountByStudent.get(student.id) ?? 0,
  }));
}

export function compactTodayProgramLabel(program: string | undefined): string {
  if (program === "Türkiye Yüzyılı Maarif Modeli") return "TYMM";
  return program ?? "Program belirtilmedi";
}

export function todayCatalogDisplayLabel(label: string | undefined): string {
  if (!label) return "Katalog belirtilmedi";
  const normalized = label.toLocaleLowerCase("tr-TR");
  if (normalized.includes("meb-tymm-okul-oncesi-2024")) {
    return "TYMM 2024 · tam öğrenme çıktıları";
  }
  if (normalized.includes("meb-okul-oncesi-egitim-programi-2024")) {
    return "EÇE · 2024 başlangıç kataloğu";
  }
  return label;
}
