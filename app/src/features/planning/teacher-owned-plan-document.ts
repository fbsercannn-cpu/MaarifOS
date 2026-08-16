import type { PremiumContentPack } from "../premium-plans/domain.ts";
import {
  buildPremiumPlanExportParagraphs,
  createPremiumPlanDocx,
  createPremiumPlanPdf,
  type PremiumPlanExportDocument,
  type PremiumPlanExportFile,
  type PremiumPlanExportFormat,
  type PremiumPlanExportParagraph,
} from "../premium-plans/export-document.ts";
import type { InstalledPremiumPlanExportSource } from "../premium-plans/export-read-model.ts";
import type {
  TeacherOwnedPlanGraph,
  TeacherOwnedPlanRecord,
} from "../../core/domain/teacher-owned-plan.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  isTeacherOwnedDailyFlow,
  type TeacherOwnedDailyFlowTemplateSource,
} from "../../core/domain/teacher-owned-daily-flow.ts";
import {
  TEACHER_MONTHLY_PROGRAM_CRITERIA,
  TEACHER_MONTHLY_TEACHER_CRITERIA,
} from "../../core/domain/teacher-owned-monthly-evaluation.ts";

export interface StandaloneTeacherOwnedPlanExportFile {
  format: PremiumPlanExportFormat;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  paragraphs: readonly PremiumPlanExportParagraph[];
}

export type TeacherOwnedPlanDocumentScope =
  | { kind: "combined" }
  | { kind: "monthly"; monthlyPlanId: string }
  | { kind: "weekly"; weeklyPlanId: string }
  | { kind: "daily"; dailyPlanId: string };

export interface StandaloneTeacherOwnedDailyActivityExport {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly flowBlockId: string | null;
}

export interface StandaloneTeacherOwnedDailyFlowBlockExport {
  readonly id: string;
  readonly order: number;
  readonly kind: string;
  readonly title: string;
  readonly status: string;
  readonly durationMinutes: number;
  readonly transitionNote: string;
  readonly teacherNote: string;
}

export interface StandaloneTeacherOwnedDailyFlowScheduleExport {
  readonly kind: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly timeZone: string;
  readonly totalMinutes: number;
}

export interface StandaloneTeacherOwnedDailyPlanExport {
  readonly planId: string;
  readonly title: string;
  readonly civilDate: string;
  readonly status: string;
  readonly annualPlanId: string;
  readonly monthlyPlanId: string;
  readonly weeklyPlanId: string;
  readonly activities: readonly StandaloneTeacherOwnedDailyActivityExport[];
  readonly flowBlocks: readonly StandaloneTeacherOwnedDailyFlowBlockExport[];
  readonly flowSchedule: StandaloneTeacherOwnedDailyFlowScheduleExport | null;
  readonly teacherReviewedAt: string | null;
  readonly teacherReviewedByUserId: string | null;
  readonly templateSource: TeacherOwnedDailyFlowTemplateSource | null;
  readonly observationIds: readonly string[];
  readonly curriculumLinkIds: readonly string[];
}

function textField(record: StoredRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dailyFlowBlocks(record: StoredRecord): StandaloneTeacherOwnedDailyFlowBlockExport[] {
  if (record.teacherOwnedDailyFlow !== undefined) {
    if (!isTeacherOwnedDailyFlow(record.teacherOwnedDailyFlow)) {
      throw new Error(`Günlük plan ${record.id} öğretmen akış kaydı doğrulanamadı.`);
    }
    return record.teacherOwnedDailyFlow.blocks.map((block) => ({
      id: block.id,
      order: block.order,
      kind: block.kind,
      title: block.title,
      status: block.status,
      durationMinutes: block.durationMinutes,
      transitionNote: block.transitionNote,
      teacherNote: block.teacherNote,
    }));
  }
  const snapshot = record.premiumDailyFlowSnapshot;
  if (snapshot === undefined) return [];
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error(`Günlük plan ${record.id} akış kaydı doğrulanamadı.`);
  }
  const blocks = (snapshot as Record<string, unknown>).blocks;
  if (!Array.isArray(blocks) || blocks.length !== 10) {
    throw new Error(`Günlük plan ${record.id} tam gün akışı 10 bölüm taşımıyor.`);
  }
  return blocks.map((candidate, index) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error(`Günlük plan ${record.id} akış bölümü ${index + 1} geçersiz.`);
    }
    const block = candidate as Record<string, unknown>;
    const id = typeof block.id === "string" ? block.id : "";
    const title = typeof block.title === "string" ? block.title.trim() : "";
    const status = typeof block.status === "string" ? block.status : "";
    const durationMinutes = block.durationMinutes;
    const transitionNote = typeof block.transitionNote === "string"
      ? block.transitionNote
      : "";
    const teacherNote = typeof block.teacherNote === "string" ? block.teacherNote : "";
    if (
      !id ||
      !title ||
      !["planned", "optional", "skipped"].includes(status) ||
      !Number.isInteger(durationMinutes) ||
      Number(durationMinutes) < 5 ||
      Number(durationMinutes) > 240
    ) {
      throw new Error(`Günlük plan ${record.id} akış bölümü ${index + 1} geçersiz.`);
    }
    return {
      id,
      order: index + 1,
      kind: typeof block.kind === "string" ? block.kind : id,
      title,
      status,
      durationMinutes: Number(durationMinutes),
      transitionNote,
      teacherNote,
    };
  });
}

function dailyFlowSchedule(
  record: StoredRecord,
): StandaloneTeacherOwnedDailyFlowScheduleExport | null {
  if (record.teacherOwnedDailyFlow === undefined) return null;
  if (!isTeacherOwnedDailyFlow(record.teacherOwnedDailyFlow)) {
    throw new Error(`Günlük plan ${record.id} öğretmen akış kaydı doğrulanamadı.`);
  }
  const schedule = record.teacherOwnedDailyFlow.scheduleSnapshot;
  const minutes = (value: string) => {
    const [hours, minute] = value.split(":").map(Number);
    return hours * 60 + minute;
  };
  return {
    kind: schedule.kind,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    timeZone: schedule.timeZone,
    totalMinutes: minutes(schedule.endTime) - minutes(schedule.startTime),
  };
}

export async function loadStandaloneTeacherOwnedDailyPlans(
  store: LocalDataStore,
  graph: TeacherOwnedPlanGraph,
): Promise<StandaloneTeacherOwnedDailyPlanExport[]> {
  const snapshot = await store.readSnapshot();
  const weeklyIds = new Set(
    graph.months.flatMap(({ weeks }) => weeks.map((weekly) => weekly.id)),
  );
  const monthlyIds = new Set(graph.months.map(({ monthly }) => monthly.id));
  const plans = snapshot.plans
    .filter((record) =>
      record.planType === "daily" &&
      typeof record.deletedAt !== "string" &&
      record.academicYearId === graph.annual.academicYearId &&
      record.classroomId === graph.annual.classroomId &&
      record.sourceAnnualPlanId === graph.annual.id &&
      typeof record.sourceMonthlyPlanId === "string" &&
      monthlyIds.has(record.sourceMonthlyPlanId) &&
      typeof record.sourceWeeklyPlanId === "string" &&
      weeklyIds.has(record.sourceWeeklyPlanId)
    )
    .sort((left, right) =>
      String(left.civilDate).localeCompare(String(right.civilDate)) ||
      left.id.localeCompare(right.id),
    );

  return plans.map((plan) => {
    const civilDate = textField(plan, "civilDate");
    const title = textField(plan, "title");
    const annualPlanId = textField(plan, "sourceAnnualPlanId");
    const monthlyPlanId = textField(plan, "sourceMonthlyPlanId");
    const weeklyPlanId = textField(plan, "sourceWeeklyPlanId");
    if (!civilDate || !title || !annualPlanId || !monthlyPlanId || !weeklyPlanId) {
      throw new Error(`Günlük plan ${plan.id} belge zinciri doğrulanamadı.`);
    }
    const flowBlocks = dailyFlowBlocks(plan);
    const activities = snapshot.activities
       .filter((activity) =>
         activity.planId === plan.id &&
         typeof activity.deletedAt !== "string" &&
         activity.academicYearId === plan.academicYearId &&
         activity.classroomId === plan.classroomId &&
         activity.civilDate === civilDate &&
         activity.sourceAnnualPlanId === annualPlanId &&
         activity.sourceMonthlyPlanId === monthlyPlanId &&
         activity.sourceWeeklyPlanId === weeklyPlanId
       )
      .sort((left, right) =>
        String(left.startTime ?? "").localeCompare(String(right.startTime ?? "")) ||
        left.id.localeCompare(right.id),
      )
      .map((activity) => {
        const flowBlockId = textField(activity, "teacherOwnedFlowBlockId");
        if (flowBlockId) {
          const block = flowBlocks.find((candidate) => candidate.id === flowBlockId);
          if (
            !block ||
            (block.kind !== "teacher-activity-one" &&
              block.kind !== "teacher-activity-two") ||
            block.status === "skipped"
          ) {
            throw new Error(
              `Etkinlik ${activity.id} öğretmen akışı bölüm bağlantısı doğrulanamadı.`,
            );
          }
        }
        return {
          id: activity.id,
          title: textField(activity, "title") ?? "Başlığı eksik etkinlik",
          status: textField(activity, "status") ?? "durum-belirtilmedi",
          startTime: textField(activity, "startTime"),
          endTime: textField(activity, "endTime"),
          flowBlockId,
        };
      });
    if (activities.length === 0) {
      throw new Error(`Günlük plan ${plan.id} gerçek etkinlik kaydı taşımıyor.`);
    }
    const activityIds = new Set(activities.map((activity) => activity.id));
    const observations = snapshot.observations
       .filter((observation) =>
         observation.planId === plan.id &&
         typeof observation.activityId === "string" &&
         activityIds.has(observation.activityId) &&
         observation.academicYearId === plan.academicYearId &&
         observation.classroomId === plan.classroomId &&
         observation.civilDate === civilDate &&
         observation.rawTextImmutable === true &&
         typeof observation.deletedAt !== "string"
       )
      .sort((left, right) => left.id.localeCompare(right.id));
    const observationIds = observations.map((observation) => observation.id);
    const observationIdSet = new Set(observationIds);
    const curriculumLinkIds = snapshot.evidenceCurriculumLinks
       .filter((link) =>
         typeof link.observationId === "string" &&
         observationIdSet.has(link.observationId) &&
         link.academicYearId === plan.academicYearId &&
         link.classroomId === plan.classroomId &&
         link.civilDate === civilDate &&
         link.confirmationMethod === "teacher-confirmed" &&
         typeof link.deletedAt !== "string"
       )
      .map((link) => link.id)
      .sort((left, right) => left.localeCompare(right));
    return {
      planId: plan.id,
      title,
      civilDate,
      status: textField(plan, "status") ?? "durum-belirtilmedi",
      annualPlanId,
      monthlyPlanId,
      weeklyPlanId,
      activities,
      flowBlocks,
      flowSchedule: dailyFlowSchedule(plan),
      teacherReviewedAt: isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow)
        ? plan.teacherOwnedDailyFlow.authorshipConfirmation.confirmedAt
        : null,
      teacherReviewedByUserId: isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow)
        ? plan.teacherOwnedDailyFlow.authorshipConfirmation.confirmedByUserId
        : null,
      templateSource: isTeacherOwnedDailyFlow(plan.teacherOwnedDailyFlow)
        ? plan.teacherOwnedDailyFlow.templateSource ?? null
        : null,
      observationIds,
      curriculumLinkIds,
    };
  });
}

function teacherContentLines(record: TeacherOwnedPlanRecord): string[] {
  const labels: Record<string, string> = {
    narrative: "Öğretmen plan notu",
    draftStatus: "Taslak durumu",
    flow: "Plan akışı",
    goals: "Amaçlar",
    observations: "Gözlem odağı",
  };
  return Object.entries(record.teacherContent).map(([key, value]) => {
    const rendered = Array.isArray(value)
      ? value.map((entry) => String(entry)).join(" · ")
      : typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value);
    const localizedValue = key === "draftStatus" && rendered === "pending-teacher-review"
      ? "Öğretmen incelemesi bekliyor"
      : rendered;
    return `${labels[key] ?? "Öğretmen notu"}: ${localizedValue}`;
  });
}

const TEACHER_DECISION_LABELS = {
  keep: "Aynen koru",
  adapt: "Uyarlayarak sürdür",
  replace: "Başka bir yaklaşımla değiştir",
  "observe-more": "Daha fazla gözlem topla",
} as const;

const MONTHLY_CRITERION_STATUS_LABELS = {
  "observed-working": "İşliyor",
  "needs-adjustment": "Uyarlama gerekiyor",
  "not-observed": "Gözlenmedi",
} as const;

const FLOW_KIND_LABELS: Record<string, string> = {
  welcome: "Karşılama",
  "center-play": "Öğrenme merkezlerinde oyun",
  "community-circle": "Topluluk çemberi",
  "teacher-activity-one": "Öğretmen etkinliği 1",
  "food-selfcare": "Beslenme ve öz bakım",
  "outdoor-movement": "Açık hava ve hareket",
  "teacher-activity-two": "Öğretmen etkinliği 2",
  "rest-regulation": "Dinlenme ve düzenleme",
  "small-group": "Küçük grup",
  closing: "Gün sonu kapanışı",
};

const FLOW_STATUS_LABELS: Record<string, string> = {
  planned: "Planlandı",
  optional: "İsteğe bağlı",
  skipped: "Bu gün uygulanmayacak",
};

export function buildStandaloneTeacherOwnedPlanParagraphs(
  graph: TeacherOwnedPlanGraph,
  dailyPlans: readonly StandaloneTeacherOwnedDailyPlanExport[] = [],
): PremiumPlanExportParagraph[] {
  const auditLines: string[] = [`Yıllık plan: ${graph.annual.id}`];
  const paragraphs: PremiumPlanExportParagraph[] = [
    { text: "MAARİFOS · ÖĞRETMEN PLAN ZİNCİRİ", style: "meta" },
    { text: graph.annual.title, style: "title" },
    {
      text: `${graph.annual.periodStart} – ${graph.annual.periodEnd} · revizyon ${graph.annual.revisionNumber}`,
      style: "meta",
    },
    ...teacherContentLines(graph.annual).map((text) => ({
      text,
      style: "body" as const,
    })),
  ];
  for (const { monthly, weeks } of graph.months) {
    auditLines.push(`Aylık plan: ${monthly.id}`);
    paragraphs.push(
      { text: monthly.title, style: "heading1", pageBreakBefore: true },
      {
        text: `${monthly.periodStart} – ${monthly.periodEnd} · revizyon ${monthly.revisionNumber}`,
        style: "meta",
      },
      ...teacherContentLines(monthly).map((text) => ({
        text,
        style: "body" as const,
      })),
    );
    if (monthly.nextMonthDecisionContext) {
      auditLines.push(
        `Aylık öneri kaynağı: ${monthly.nextMonthDecisionContext.sourceMonthlyPlanId} · değerlendirme ${monthly.nextMonthDecisionContext.evaluationId}`,
      );
      const status = monthly.nextMonthDecisionContext.applicationStatus ===
        "pending-teacher-review"
        ? "Öğretmen kararı bekliyor"
        : monthly.nextMonthDecisionContext.applicationStatus === "accepted"
          ? "Öğretmen düzenleyip kabul etti"
          : "Öğretmen gerekçesiyle reddetti";
      paragraphs.push(
        {
          text: `Önceki aydan öneri · ${status}`,
          style: "heading2",
          keepWithNext: true,
        },
        {
          text: monthly.nextMonthDecisionContext.recommendation,
          style: "body",
        },
        ...monthly.nextMonthDecisionContext.reviewHistory.map((entry) => ({
          text: `Karar geçmişi · ${entry.action}: ${entry.teacherNote} · revizyon ${entry.targetPlanRevisionNumberBefore} → ${entry.targetPlanRevisionNumberAfter}`,
          style: "bullet" as const,
        })),
      );
    }
    for (const evaluation of monthly.monthlyEvaluations ?? []) {
      auditLines.push(
        `Aylık değerlendirme: ${evaluation.id} · kaynak revizyon ${evaluation.sourcePlanRevisionNumber}`,
        `Aylık değerlendirme gözlemleri: ${evaluation.children.observationIds.join(" · ") || "yok"}`,
        `Aylık değerlendirme program bağları: ${evaluation.children.curriculumLinkIds.join(" · ") || "yok"}`,
      );
      paragraphs.push(
        {
          text: `Aylık üç yönlü değerlendirme · ${evaluation.createdAt}`,
          style: "heading2",
          keepWithNext: true,
        },
        {
          text: `Çocuklar yönü · ${evaluation.children.evidenceState === "sufficient-evidence" ? "Kanıt yeterli" : "Kanıt yetersiz"}: ${evaluation.children.narrative}`,
          style: "body",
        },
        {
          text: `Kapsam: ${evaluation.children.coverage.observationCount} gözlem · ${evaluation.children.coverage.distinctCivilDateCount} gün · ${evaluation.children.coverage.distinctWeekCount} hafta · ${evaluation.children.coverage.coveredActiveStudentIds.length}/${evaluation.children.coverage.activeStudentIds.length} aktif çocuk · ${evaluation.children.coverage.curriculumLinkCount} program bağı`,
          style: "meta",
        },
        {
          text: `Program yönü: ${evaluation.program.narrative}`,
          style: "body",
        },
        ...evaluation.program.criteria.map((criterion, index) => ({
          text: `${TEACHER_MONTHLY_PROGRAM_CRITERIA[index]?.[1] ?? criterion.criterionId}: ${MONTHLY_CRITERION_STATUS_LABELS[criterion.status]}`,
          style: "bullet" as const,
        })),
        {
          text: `Öğretmen yönü: ${evaluation.teacher.narrative}`,
          style: "body",
        },
        ...evaluation.teacher.criteria.map((criterion, index) => ({
          text: `${TEACHER_MONTHLY_TEACHER_CRITERIA[index]?.[1] ?? criterion.criterionId}: ${MONTHLY_CRITERION_STATUS_LABELS[criterion.status]}`,
          style: "bullet" as const,
        })),
        {
          text: `Sonraki ay önerisi: ${evaluation.nextMonthRecommendation}`,
          style: "body",
        },
      );
    }
    for (const weekly of weeks) {
      auditLines.push(`Haftalık plan: ${weekly.id}`);
      paragraphs.push(
        { text: weekly.title, style: "heading2", keepWithNext: true },
        {
          text: `${weekly.periodStart} – ${weekly.periodEnd} · revizyon ${weekly.revisionNumber}`,
          style: "meta",
        },
        ...teacherContentLines(weekly).map((text) => ({
          text,
          style: "bullet" as const,
        })),
      );
      for (const evaluation of weekly.weeklyEvaluations ?? []) {
        auditLines.push(
          `Haftalık değerlendirme: ${evaluation.id}`,
          `Haftalık değerlendirme gözlemleri: ${evaluation.observationIds.join(" · ")}`,
          `Haftalık değerlendirme program bağları: ${evaluation.curriculumLinkIds?.join(" · ") ?? "eski kayıtta saklanmamış"}`,
        );
        paragraphs.push(
          {
            text: `Haftalık değerlendirme · ${evaluation.createdAt}`,
            style: "heading2",
            keepWithNext: true,
          },
          {
            text: `Kanıt özeti: ${evaluation.evidenceSummary}`,
            style: "body",
          },
          {
            text: `Öğretmen yansıtması: ${evaluation.reflection}`,
            style: "body",
          },
          {
            text: `Sonraki plan kararı: ${TEACHER_DECISION_LABELS[evaluation.nextPlanDecision]} · Kaynak revizyon ${evaluation.sourcePlanRevisionNumber}`,
            style: "body",
          },
        );
      }
      if (weekly.nextPlanDecisionContext) {
        const carry = weekly.nextPlanDecisionContext;
        const status =
          carry.applicationStatus === "accepted"
            ? "Öğretmen düzenleyip kabul etti; hedef plan revizyonuna uygulandı"
            : carry.applicationStatus === "rejected"
              ? "Öğretmen gerekçesiyle reddetti; hedef plan içeriği değiştirilmedi"
              : "Henüz bu haftanın planına uygulanmadı; öğretmen kararı bekleniyor";
        paragraphs.push(
          {
            text: "Önceki haftadan öğretmen önerisi",
            style: "heading2",
            keepWithNext: true,
          },
          {
            text: carry.evidenceSummary,
            style: "body",
          },
          {
            text: `Durum: ${status} · Önerinin hedeflediği revizyon ${carry.targetPlanRevisionNumberAtSuggestion}`,
            style: "meta",
          },
        );
        for (const review of carry.reviewHistory ?? []) {
          paragraphs.push({
            text: `Öğretmen karar izi: ${review.action === "accepted" ? "Kabul" : review.action === "rejected" ? "Ret" : "Yeniden açma"} · ${review.teacherNote} · revizyon ${review.targetPlanRevisionNumberBefore}→${review.targetPlanRevisionNumberAfter}`,
            style: "meta",
          });
        }
      }
      const weeklyDailyPlans = dailyPlans.filter(
        (daily) => daily.weeklyPlanId === weekly.id,
      );
      if (weeklyDailyPlans.length > 0) {
        paragraphs.push({
          text: `Günlük planlar ve uygulama izi · ${weeklyDailyPlans.length} gün`,
          style: "heading2",
          keepWithNext: true,
        });
      }
      for (const daily of weeklyDailyPlans) {
        auditLines.push(
          `Günlük plan: ${daily.planId}`,
          `Günlük kaynak zinciri: ${daily.annualPlanId} · ${daily.monthlyPlanId} · ${daily.weeklyPlanId}`,
          ...daily.activities.map(
            (activity) => `Etkinlik: ${activity.id} · akış bölümü ${activity.flowBlockId ?? "eski kayıtta belirtilmemiş"}`,
          ),
          ...daily.flowBlocks.map(
            (block) => `Akış bölümü: ${block.id} · sıra ${block.order} · tür ${block.kind}`,
          ),
          `Gözlemler: ${daily.observationIds.join(" · ") || "yok"}`,
          `Program bağları: ${daily.curriculumLinkIds.join(" · ") || "yok"}`,
          ...(daily.teacherReviewedByUserId
            ? [`Öğretmen incelemesi: ${daily.teacherReviewedAt} · ${daily.teacherReviewedByUserId}`]
            : []),
          ...(daily.templateSource
            ? [`Akış şablon kaynağı: ${daily.templateSource.sourcePlanId} · revizyon ${daily.templateSource.sourceFlowRevisionNumber} · ${daily.templateSource.mode}`]
            : []),
        );
        paragraphs.push(
          {
            text: `${daily.civilDate} · ${daily.title}`,
            style: "heading2",
            keepWithNext: true,
          },
          { text: `Durum: ${daily.status}`, style: "meta" },
        );
        const unlinkedActivities = daily.activities.filter(
          (activity) => activity.flowBlockId === null,
        );
        for (const activity of unlinkedActivities) {
          const time = activity.startTime
            ? `${activity.startTime}${activity.endTime ? `–${activity.endTime}` : ""} · `
            : "";
          paragraphs.push({
            text: `Etkinlik: ${activity.title} · ${time}${activity.status} · akış bölümü belirtilmemiş eski kayıt`,
            style: "bullet",
          });
        }
        if (daily.flowBlocks.length > 0) {
          if (daily.templateSource) {
            paragraphs.push({
              text: `Başlangıç akışı ${daily.templateSource.sourceCivilDate} tarihli öğretmen planından getirildi; bu gün için yeniden incelenip onaylandı.`,
              style: "meta",
            });
          }
          paragraphs.push({
            text: daily.flowSchedule
              ? `Sınıf günlük akışı · ${daily.flowBlocks.length} bölüm · ${daily.flowSchedule.startTime}–${daily.flowSchedule.endTime} · ${daily.flowSchedule.totalMinutes} dk · ${daily.flowSchedule.kind} · ${daily.flowSchedule.timeZone}`
              : `Tam gün akışı · ${daily.flowBlocks.length} bölüm`,
            style: "body",
            keepWithNext: true,
          });
          for (const block of daily.flowBlocks) {
            paragraphs.push({
              text: `${block.order}. ${block.title} · ${FLOW_KIND_LABELS[block.kind] ?? "Akış bölümü"} · ${block.durationMinutes} dk · ${FLOW_STATUS_LABELS[block.status] ?? block.status}${block.transitionNote ? ` · Geçiş: ${block.transitionNote}` : ""}${block.teacherNote ? ` · Öğretmen notu: ${block.teacherNote}` : ""}`,
              style: "bullet",
            });
            for (const activity of daily.activities.filter(
              (candidate) => candidate.flowBlockId === block.id,
            )) {
              const time = activity.startTime
                ? `${activity.startTime}${activity.endTime ? `–${activity.endTime}` : ""} · `
                : "";
              paragraphs.push({
                text: `Bu bölümde uygulanacak etkinlik: ${activity.title} · ${time}${activity.status}`,
                style: "bullet",
              });
            }
          }
          if (daily.teacherReviewedAt && daily.teacherReviewedByUserId) {
            paragraphs.push({
              text: `Öğretmen incelemesi tamamlandı: ${daily.teacherReviewedAt}`,
              style: "meta",
            });
          }
        }
        paragraphs.push({
          text: `${daily.observationIds.length} gözlem · ${daily.curriculumLinkIds.length} öğretmen onaylı program bağı`,
          style: "meta",
        });
      }
    }
  }
  paragraphs.push(
    {
      text: "Denetim eki · kayıt ve kanıt kimlikleri",
      style: "heading1",
      pageBreakBefore: true,
      keepWithNext: true,
    },
    ...auditLines.map((text) => ({ text, style: "meta" as const })),
  );
  paragraphs.push({
    text: "Bu belge öğretmenin cihazındaki premiumdan bağımsız kalıcı kayıt zincirinden hazırlanmıştır. Başlangıç akış önerileri sistem tarafından sunulabilir; belgeye yalnız öğretmenin açıkça gözden geçirip onayladığı revizyon alınır ve sağlayıcı verisiyle sessizce tamamlanmaz.",
    style: "meta",
    pageBreakBefore: true,
  });
  return paragraphs;
}

function scopedStandalonePlanSource(
  graph: TeacherOwnedPlanGraph,
  dailyPlans: readonly StandaloneTeacherOwnedDailyPlanExport[],
  scope: TeacherOwnedPlanDocumentScope,
): {
  graph: TeacherOwnedPlanGraph;
  dailyPlans: StandaloneTeacherOwnedDailyPlanExport[];
  fileLabel: string;
} {
  if (scope.kind === "combined") {
    return { graph, dailyPlans: [...dailyPlans], fileLabel: "Birlesik" };
  }
  const daily = scope.kind === "daily"
    ? dailyPlans.find((candidate) => candidate.planId === scope.dailyPlanId)
    : null;
  if (scope.kind === "daily" && !daily) {
    throw new Error("Günlük belge için seçilen kalıcı plan bulunamadı.");
  }
  const weeklyPlanId = scope.kind === "weekly"
    ? scope.weeklyPlanId
    : daily?.weeklyPlanId ?? null;
  const monthlyPlanId = scope.kind === "monthly"
    ? scope.monthlyPlanId
    : daily?.monthlyPlanId ?? null;
  const months = graph.months
    .map(({ monthly, weeks }) => ({
      monthly,
      weeks: weeklyPlanId
        ? weeks.filter((weekly) => weekly.id === weeklyPlanId)
        : weeks,
    }))
    .filter(({ monthly, weeks }) =>
      monthlyPlanId ? monthly.id === monthlyPlanId : weeks.length > 0,
    );
  if (months.length !== 1 || (weeklyPlanId && months[0].weeks.length !== 1)) {
    throw new Error("Belge kapsamının yıl, ay ve hafta kaynak zinciri doğrulanamadı.");
  }
  const visibleWeeklyIds = new Set(months[0].weeks.map((weekly) => weekly.id));
  const visibleDailyPlans = daily
    ? [daily]
    : dailyPlans.filter((candidate) =>
        candidate.monthlyPlanId === months[0].monthly.id &&
        (scope.kind === "monthly" || visibleWeeklyIds.has(candidate.weeklyPlanId)),
      );
  return {
    graph: { annual: graph.annual, months },
    dailyPlans: visibleDailyPlans,
    fileLabel:
      scope.kind === "daily"
        ? `Gunluk_${daily!.civilDate}`
        : scope.kind === "weekly"
          ? `Haftalik_${months[0].weeks[0].periodStart}`
          : `Aylik_${months[0].monthly.monthKey}`,
  };
}

export async function buildStandaloneTeacherOwnedPlanPreview(
  graph: TeacherOwnedPlanGraph,
  store: LocalDataStore,
  scope: TeacherOwnedPlanDocumentScope,
): Promise<PremiumPlanExportParagraph[]> {
  const dailyPlans = await loadStandaloneTeacherOwnedDailyPlans(store, graph);
  const source = scopedStandalonePlanSource(graph, dailyPlans, scope);
  return buildStandaloneTeacherOwnedPlanParagraphs(source.graph, source.dailyPlans);
}

export async function generateStandaloneTeacherOwnedPlanExportFile(
  graph: TeacherOwnedPlanGraph,
  store: LocalDataStore,
  format: PremiumPlanExportFormat,
  scope: TeacherOwnedPlanDocumentScope = { kind: "combined" },
): Promise<StandaloneTeacherOwnedPlanExportFile> {
  if (format !== "pdf" && format !== "word") {
    throw new Error("Dışa aktarma biçimi PDF veya Word olmalıdır.");
  }
  const dailyPlans = await loadStandaloneTeacherOwnedDailyPlans(store, graph);
  const source = scopedStandalonePlanSource(graph, dailyPlans, scope);
  const paragraphs = buildStandaloneTeacherOwnedPlanParagraphs(
    source.graph,
    source.dailyPlans,
  );
  const bytes = format === "word"
    ? createPremiumPlanDocx(paragraphs)
    : await createPremiumPlanPdf(paragraphs);
  return {
    format,
    fileName: `MaarifOS_Ogretmen_Plani_${source.fileLabel}_${graph.annual.id.slice(0, 8)}.${format === "pdf" ? "pdf" : "docx"}`,
    mimeType:
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes,
    paragraphs,
  };
}

function assertSameInstalledPack(
  pack: PremiumContentPack,
  source: InstalledPremiumPlanExportSource,
): void {
  const installed = source.contentPackSnapshot;
  if (
    installed.id !== pack.id ||
    installed.version !== pack.version ||
    installed.contentReleaseId !== pack.contentReleaseId ||
    installed.manifestDigest !== pack.manifestDigest ||
    installed.sku !== pack.sku ||
    installed.academicRelease !== pack.academicRelease ||
    installed.valuesMappingStatus !== source.valuesMappingStatus
  ) {
    throw new Error(
      "Temel belge yalnız cihazdaki planla aynı kimlik ve sürümü taşıyan kayıt zincirinden hazırlanabilir.",
    );
  }
}

export function prepareTeacherOwnedPlanExportDocument(
  pack: PremiumContentPack,
  source: InstalledPremiumPlanExportSource,
  format: PremiumPlanExportFormat,
): PremiumPlanExportDocument {
  if (format !== "pdf" && format !== "word") {
    throw new Error("Dışa aktarma biçimi PDF veya Word olmalıdır.");
  }
  assertSameInstalledPack(pack, source);
  const monthlyPlan = {
    ...structuredClone(source.monthlyPlan.sourceSnapshot),
    title: source.monthlyPlan.teacherTitle,
  };
  const weeks = source.weeks.map((week) => ({
    ...structuredClone(week.sourceSnapshot),
    title: week.teacherTitle,
    sourceRecordId: week.recordId,
    dailyPlans: structuredClone(week.dailyPlans),
    evaluations: structuredClone(week.evaluations),
  }));
  const extension = format === "pdf" ? "pdf" : "docx";
  return {
    format,
    fileName: `MaarifOS_Ogretmen_Plan_Zinciri_${source.monthlyPlan.sourceSnapshot.monthKey}.${extension}`,
    title: monthlyPlan.title,
    programLabel: "TYMM 2024",
    ageLabel: "60–72 ay",
    academicRelease: pack.academicRelease,
    contentPackId: source.contentPackSnapshot.id,
    contentPackVersion: source.contentPackSnapshot.version,
    valuesMappingStatus: source.valuesMappingStatus,
    annualPlanTitle: source.annualPlan.teacherTitle,
    annualPlanRecordId: source.annualPlan.recordId,
    monthlyPlanRecordId: source.monthlyPlan.recordId,
    annualMonths: structuredClone(source.annualPlan.annualMonths),
    lensPreference: structuredClone(source.lensPreference),
    monthlyPlan,
    monthlyEvaluations: structuredClone(source.monthlyPlan.evaluations),
    fullDayFlow: structuredClone(source.monthlyPlan.fullDayFlow),
    weeks,
    activities: source.weeks.flatMap((week) =>
      structuredClone(week.activitySnapshots),
    ),
    teacherReviewNotice:
      "Bu temel belge, öğretmenin cihazındaki kalıcı plan zincirinden hazırlanmıştır. Premium sağlayıcı kütüphanesine erişim veya etkin entitlement gerektirmez; yeni sağlayıcı içeriği üretmez.",
  };
}

export async function generateTeacherOwnedPlanExportFile(
  pack: PremiumContentPack,
  source: InstalledPremiumPlanExportSource,
  format: PremiumPlanExportFormat,
): Promise<PremiumPlanExportFile> {
  const document = prepareTeacherOwnedPlanExportDocument(pack, source, format);
  const paragraphs = buildPremiumPlanExportParagraphs(document);
  const bytes = format === "word"
    ? createPremiumPlanDocx(paragraphs)
    : await createPremiumPlanPdf(paragraphs);
  return {
    format,
    fileName: document.fileName,
    mimeType:
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes,
    document,
  };
}
