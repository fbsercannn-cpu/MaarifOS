import type { MarifTeacherAgentBrief, MarifTeacherAgentAction } from "../today/marif-teacher-agent.ts";
import type { AcademicYearOperationalStatus } from "../today/today-data.ts";
import type { TodayPlanItem } from "../today/today-data.ts";
import { TODAY_TEACHING_COPY, type TodayTeachingFocus } from "./today-teaching-focus.ts";

export type SimpleTodayAction =
  | MarifTeacherAgentAction
  | { kind: "start-year" }
  | { kind: "day-details" }
  | { kind: "studio"; activityId: string }
  | { kind: "recorded-item"; item: TodayPlanItem }
  | { kind: "complete-recorded"; activityId: string };

interface SimpleTodayEntry {
  label: string;
  detail?: string;
  action: SimpleTodayAction;
}

interface SimpleTodayPresentationInput {
  hasClassroom: boolean;
  operationalStatus?: AcademicYearOperationalStatus;
  educationalWritesDisabled: boolean;
  studentCount: number;
  dailyPlanReady: boolean;
  attendanceMarked: number;
  attendanceTotal: number;
  assistantBrief: MarifTeacherAgentBrief;
  teachingFocus?: TodayTeachingFocus | null;
}

export function createSimpleTodayPresentation(
  input: SimpleTodayPresentationInput,
): { primary: SimpleTodayEntry; reasons: readonly string[]; followUps: readonly SimpleTodayEntry[] } {
  // Plan, child-list and backup readiness are useful follow-ups, never an
  // activation gate: the academic-year service owns the transition checks.
  if (input.hasClassroom && input.operationalStatus === "preparation") {
    return {
      primary: { label: "Eğitim yılını başlat", action: { kind: "start-year" } },
      reasons: ["Sınıfınız kaydedildi. Başlattığınızda yoklama ve gelişim kaydı açılır."],
      followUps: [
        {
          label: input.studentCount === 0 ? "İlk çocuğu ekle" : "Çocukları düzenle",
          action: { kind: "setup", stepId: "students" },
        },
        { label: "Planları hazırla", action: { kind: "teacher-cycle", stageId: "daily" } },
      ],
    };
  }

  const primary = {
    label: input.assistantBrief.actionLabel,
    detail: input.assistantBrief.title,
    action: input.assistantBrief.action,
  };
  const assistantEvidence = input.assistantBrief.evidence.map((entry) =>
    /^Sınıf \d+ çocuk$/u.test(entry)
      ? `Kayıtlı ${input.studentCount} çocuk`
      : entry,
  );
  const reasons = [input.assistantBrief.rationale, ...assistantEvidence]
    .filter((reason, index, all) => Boolean(reason) && all.indexOf(reason) === index)
    .slice(0, 2);

  if (!input.hasClassroom || input.educationalWritesDisabled) {
    return { primary, reasons, followUps: [] };
  }

  if (input.studentCount === 0) {
    return {
      primary: {
        label: "Sınıfıma çocuk ekle",
        detail: "Çocuk listesi Sınıfım bölümünde yönetilir",
        action: { kind: "setup", stepId: "students" },
      },
      reasons: ["Sınıf kurulumu korunuyor; günlük kayıtlar için önce etkin bir çocuk ekleyin."],
      followUps: [],
    };
  }

  if (input.teachingFocus && input.studentCount > 0) {
    const focus = input.teachingFocus;
    const focusedPrimary: SimpleTodayEntry = focus.kind === "suggestion"
      ? { label: TODAY_TEACHING_COPY.guide, action: { kind: "studio", activityId: focus.activity.id } }
      : {
          label: focus.item.canCaptureEvidence && focus.item.activityId
            ? focus.item.status === "in_progress" ? TODAY_TEACHING_COPY.observe : TODAY_TEACHING_COPY.applyObserve
            : TODAY_TEACHING_COPY.dailyFlow,
          action: { kind: "recorded-item", item: focus.item },
        };
    const attendanceFollowUp: SimpleTodayEntry = {
      label: TODAY_TEACHING_COPY.attendance,
      detail: input.attendanceMarked < input.attendanceTotal
        ? `${input.attendanceTotal - input.attendanceMarked} çocuğun devam durumu bekliyor`
        : "Bugünün yoklaması tamam",
      action: { kind: "attendance" },
    };
    const followUps: readonly SimpleTodayEntry[] =
      focus.kind === "recorded" &&
      focus.item.status === "in_progress" &&
      Boolean(focus.item.activityId)
        ? [
            {
              label: TODAY_TEACHING_COPY.completeActivity,
              detail: TODAY_TEACHING_COPY.completeActivityDetail,
              action: {
                kind: "complete-recorded",
                activityId: focus.item.activityId!,
              },
            },
            attendanceFollowUp,
          ]
        : [
            attendanceFollowUp,
            {
              label: TODAY_TEACHING_COPY.detail,
              detail: "Plan, gözlem ve haftalık akış",
              action: { kind: "day-details" },
            },
          ];
    return {
      primary: focusedPrimary,
      reasons: [],
      followUps,
    };
  }

  const primaryOpensDailyPlan = primary.action.kind === "plan" ||
    (primary.action.kind === "teacher-cycle" && primary.action.stageId === "daily");
  const followUp: SimpleTodayEntry = primaryOpensDailyPlan
    ? {
        label: "Yoklama",
        detail: input.attendanceTotal === 0
          ? "Bugünün yoklama kapsamı henüz oluşmadı"
          : `${input.attendanceMarked}/${input.attendanceTotal} çocuk işaretlendi`,
        action: { kind: "attendance" },
      }
    : {
        label: "Günün planı",
        detail: input.dailyPlanReady ? "Kayıtlı akışı açın" : "Bugünün akışını hazırlayın",
        action: { kind: "teacher-cycle", stageId: "daily" },
      };

  return {
    primary,
    reasons: primary.action.kind === "attendance"
      ? [`${Math.max(0, input.attendanceTotal - input.attendanceMarked)} çocuğun devam durumunu işaretleyin.`]
      : reasons,
    followUps: [followUp, { label: "Günün ayrıntıları", action: { kind: "day-details" } }],
  };
}
