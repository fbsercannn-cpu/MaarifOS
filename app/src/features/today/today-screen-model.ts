import type { ReactNode } from "react";

import type { DashboardStudent } from "../dashboard/dashboard-data.ts";
import type {
  ClassroomContext,
  TodayActivityStatus,
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
  pendingObservationCount: number;
  planEvidenceDetailsEnabled: boolean;
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
  return (
    workspace.currentActivity ??
    workspace.planItems.find((item) => item.status === "planned") ??
    workspace.planItems[0] ??
    null
  );
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
