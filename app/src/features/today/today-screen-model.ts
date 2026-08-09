import type { ReactNode } from "react";

import type { DashboardStudent } from "../dashboard/dashboard-data.ts";
import type {
  ClassroomContext,
  TodayActivityStatus,
  TodayPlanItem,
  TodayWorkspace,
} from "./today-data.ts";

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
}): TodayControlCenterSummary {
  const { workspace, attendance, pendingObservationCount } = options;
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
  const planDetail = item
    ? `${planTime}${item.endTime ? `–${item.endTime}` : ""} · ${todayPlanItemStatusLabel(item)}`
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
        (workspace.classroom.status === "configured"
          ? "Bugün için plan yok"
          : "Sınıf kurulumu gerekli"),
      detail: planDetail,
    },
    priority: {
      count: pendingObservationCount,
      title:
        pendingObservationCount > 0
          ? `${pendingObservationCount} gözlem program bağlantısı bekliyor`
          : "Program bağlantıları tamam",
      detail:
        pendingObservationCount > 0
          ? "Değerlendirme ve belge zinciri için tamamlayın."
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
