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
import type { SemanticTaggedPdfRuntime } from "../documents/semantic-tagged-pdf.ts";
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

/**
 * Öğretmenin bir kez girdiği kurum ve sınıf bilgisini bütün plan çıktılarında
 * yeniden kullanır. Alanlar isteğe bağlıdır; eski kayıtlar belge üretmeye devam
 * ederken yeni kurulumlar başlığı eksiksiz doldurabilir.
 */
export interface TeacherOwnedPlanDocumentContext {
  readonly schoolName?: string | null;
  readonly teacherName?: string | null;
  readonly classroomName?: string | null;
  readonly academicYearName?: string | null;
  readonly ageGroup?: string | null;
  readonly curriculumProgram?: string | null;
  /** Standart idare belgesinde kapalıdır; yalnız açık denetim eki isteğinde açılır. */
  readonly includeAuditAppendix?: boolean;
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
  readonly curriculumTargetCodes: readonly string[];
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

export interface StandaloneTeacherOwnedCalendarEntryExport {
  readonly id: string;
  readonly title: string;
  readonly note: string | null;
  readonly entryType: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: string;
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
        const curriculumTargetCodes = Array.isArray(activity.curriculumTargets)
          ? activity.curriculumTargets.flatMap((target) => {
              if (!target || typeof target !== "object" || Array.isArray(target)) {
                return [];
              }
              const referenceCode = (target as Record<string, unknown>).referenceCode;
              return typeof referenceCode === "string" && referenceCode.trim()
                ? [referenceCode.trim()]
                : [];
            })
          : [];
        return {
          id: activity.id,
          title: textField(activity, "title") ?? "Başlığı eksik etkinlik",
          status: textField(activity, "status") ?? "durum-belirtilmedi",
          startTime: textField(activity, "startTime"),
          endTime: textField(activity, "endTime"),
          flowBlockId,
          curriculumTargetCodes,
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

export async function loadStandaloneTeacherOwnedCalendarEntries(
  store: LocalDataStore,
  graph: TeacherOwnedPlanGraph,
): Promise<StandaloneTeacherOwnedCalendarEntryExport[]> {
  const snapshot = await store.readSnapshot();
  return snapshot.calendarEntries
    .filter((record) =>
      record.academicYearId === graph.annual.academicYearId &&
      record.classroomId === graph.annual.classroomId &&
      typeof record.deletedAt !== "string" &&
      record.status !== "cancelled" &&
      typeof record.title === "string" &&
      record.title.trim().length > 0 &&
      typeof record.startDate === "string" &&
      typeof record.endDate === "string"
    )
    .map((record) => ({
      id: record.id,
      title: String(record.title).trim(),
      note: textField(record, "note"),
      entryType: textField(record, "entryType") ?? "activity",
      startDate: String(record.startDate),
      endDate: String(record.endDate),
      status: textField(record, "status") ?? "planned",
    }))
    .sort((left, right) =>
      left.startDate.localeCompare(right.startDate) ||
      left.title.localeCompare(right.title, "tr-TR"),
    );
}

function teacherContentLines(record: TeacherOwnedPlanRecord): string[] {
  const labels: Record<string, string> = {
    narrative: "Öğretmen plan notu",
    teacherPriority: "Yıllık öncelik",
    flow: "Plan akışı",
    goals: "Amaçlar",
    observations: "Gözlem odağı",
    tymmTargetCodes: "Seçili TYMM hedefleri",
  };
  const hiddenTechnicalKeys = new Set([
    "draftStatus",
    "sourceOutlineMonthKey",
  ]);
  return Object.entries(record.teacherContent)
    .filter(([key]) => !hiddenTechnicalKeys.has(key))
    .map(([key, value]) => {
    const rendered = Array.isArray(value)
      ? value.map((entry) => String(entry)).join(" · ")
      : typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value);
    return `${labels[key] ?? "Öğretmen notu"}: ${rendered}`;
  });
}

function scopedDocumentHeading(
  graph: TeacherOwnedPlanGraph,
  dailyPlans: readonly StandaloneTeacherOwnedDailyPlanExport[],
  scopeKind: TeacherOwnedPlanDocumentScope["kind"],
): { title: string; period: string } {
  const month = graph.months[0]?.monthly;
  const week = graph.months[0]?.weeks[0];
  const daily = dailyPlans[0];
  if (scopeKind === "monthly" && month) {
    return {
      title: `Aylık Eğitim Planı · ${month.title}`,
      period: `${month.periodStart} – ${month.periodEnd} · revizyon ${month.revisionNumber}`,
    };
  }
  if (scopeKind === "weekly" && week) {
    return {
      title: `Haftalık Çalışma Akışı · ${week.title}`,
      period: `${week.periodStart} – ${week.periodEnd} · revizyon ${week.revisionNumber}`,
    };
  }
  if (scopeKind === "daily" && daily) {
    return {
      title: `Günlük Eğitim Planı · ${daily.title}`,
      period: daily.civilDate,
    };
  }
  return {
    title: graph.annual.title,
    period: `${graph.annual.periodStart} – ${graph.annual.periodEnd} · revizyon ${graph.annual.revisionNumber}`,
  };
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

const CALENDAR_ENTRY_TYPE_LABELS: Record<string, string> = {
  general_note: "Okul notu",
  parent_meeting: "Veli buluşması",
  fruit_day: "Meyve günü",
  activity: "Okul etkinliği",
  adaptation_day: "Uyum günü",
  no_school: "Okulun kapalı olduğu gün",
  official_marker: "Resmî takvim işareti",
};

const FLOW_STATUS_LABELS: Record<string, string> = {
  planned: "Planlandı",
  optional: "İsteğe bağlı",
  skipped: "Bu gün uygulanmayacak",
};

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/giu;

function cleanDocumentContextValue(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function displayAgeGroup(value: string | null | undefined): string | null {
  const ageGroup = cleanDocumentContextValue(value);
  if (!ageGroup) return null;
  return /\bay\b/iu.test(ageGroup) ? ageGroup : `${ageGroup} ay`;
}

function ageGroupFromPack(
  pack: PremiumContentPack,
  context: TeacherOwnedPlanDocumentContext,
): string {
  const configured = displayAgeGroup(context.ageGroup);
  if (configured) return configured;
  const compactSku = pack.sku.replaceAll(/[^0-9]/gu, "");
  if (compactSku.includes("3648")) return "36–48 ay";
  if (compactSku.includes("4860")) return "48–60 ay";
  if (compactSku.includes("6072")) return "60–72 ay";
  return "Sınıf yaş grubu";
}

function curriculumProgramFromContext(
  context: TeacherOwnedPlanDocumentContext,
): string {
  const configured = cleanDocumentContextValue(context.curriculumProgram);
  if (!configured) return "Türkiye Yüzyılı Maarif Modeli";
  return configured.toLocaleLowerCase("tr-TR") === "tymm"
    ? "Türkiye Yüzyılı Maarif Modeli"
    : configured;
}

export function teacherOwnedPlanDocumentBasisLabel(
  scopeKind: TeacherOwnedPlanDocumentScope["kind"],
  hasVerifiedTymmTargets = scopeKind === "daily",
): "TYMM resmî plan temeli" | "MaarifOS destek belgesi" {
  return (scopeKind === "daily" || scopeKind === "monthly") && hasVerifiedTymmTargets
    ? "TYMM resmî plan temeli"
    : "MaarifOS destek belgesi";
}

function documentContextParagraphs(
  context: TeacherOwnedPlanDocumentContext,
  scopeKind: TeacherOwnedPlanDocumentScope["kind"],
  fallback?: {
    readonly academicYearName?: string | null;
    readonly ageGroup?: string | null;
    readonly curriculumProgram?: string | null;
  },
  hasVerifiedTymmTargets = false,
): PremiumPlanExportParagraph[] {
  const schoolName = cleanDocumentContextValue(context.schoolName);
  const teacherName = cleanDocumentContextValue(context.teacherName);
  const classroomName = cleanDocumentContextValue(context.classroomName);
  const academicYearName = cleanDocumentContextValue(context.academicYearName)
    ?? cleanDocumentContextValue(fallback?.academicYearName);
  const ageGroup = displayAgeGroup(context.ageGroup)
    ?? displayAgeGroup(fallback?.ageGroup);
  const curriculumProgram = cleanDocumentContextValue(context.curriculumProgram)
    ?? cleanDocumentContextValue(fallback?.curriculumProgram)
    ?? "Türkiye Yüzyılı Maarif Modeli";
  const lines = [
    schoolName ? `Okul: ${schoolName}` : null,
    classroomName ? `Sınıf: ${classroomName}` : null,
    teacherName ? `Öğretmen: ${teacherName}` : null,
    academicYearName ? `Eğitim yılı: ${academicYearName}` : null,
    ageGroup ? `Yaş grubu: ${ageGroup}` : null,
    `Program: ${curriculumProgram}`,
  ].filter((line): line is string => line !== null);
  return [
    {
      text: teacherOwnedPlanDocumentBasisLabel(
        scopeKind,
        hasVerifiedTymmTargets,
      ),
      style: "meta",
    },
    ...lines.map((text) => ({ text, style: "meta" as const })),
  ];
}

function signatureParagraphs(
  context: TeacherOwnedPlanDocumentContext,
): PremiumPlanExportParagraph[] {
  const teacherName = cleanDocumentContextValue(context.teacherName);
  return [
    { text: "Öğretmen imzası", style: "heading2", keepWithNext: true },
    {
      text: `Adı soyadı: ${teacherName ?? "____________________________"}`,
      style: "body",
    },
    { text: "İmza: ____________________________", style: "body" },
  ];
}

function stripTechnicalIdentifiers(
  paragraphs: readonly PremiumPlanExportParagraph[],
): PremiumPlanExportParagraph[] {
  const hiddenTechnicalPrefixes = [
    "İçerik paketi:",
    "Haftalık kayıtlar:",
    "Plan kayıt kimliği:",
    "Kaynak şablon:",
  ];
  return paragraphs
    .filter((paragraph) =>
      !hiddenTechnicalPrefixes.some((prefix) => paragraph.text.startsWith(prefix)) &&
      !paragraph.text.includes("Kayıt zinciri:"),
    )
    .map((paragraph) => ({
      ...paragraph,
      text: paragraph.text.replaceAll(UUID_PATTERN, "teknik kayıt"),
    }));
}

export function buildStandaloneTeacherOwnedPlanParagraphs(
  graph: TeacherOwnedPlanGraph,
  dailyPlans: readonly StandaloneTeacherOwnedDailyPlanExport[] = [],
  context: TeacherOwnedPlanDocumentContext = {},
  scopeKind: TeacherOwnedPlanDocumentScope["kind"] = "combined",
  calendarEntries: readonly StandaloneTeacherOwnedCalendarEntryExport[] = [],
): PremiumPlanExportParagraph[] {
  const auditLines: string[] = [`Yıllık plan: ${graph.annual.id}`];
  const heading = scopedDocumentHeading(graph, dailyPlans, scopeKind);
  const structuralTargetCodes = Array.from(new Set([
    ...graph.months.flatMap(({ monthly }) => {
      const value = monthly.teacherContent.tymmTargetCodes;
      return Array.isArray(value)
        ? value.filter((code): code is string => typeof code === "string" && code.trim().length > 0)
        : [];
    }),
    ...dailyPlans.flatMap((daily) =>
      daily.activities.flatMap((activity) => activity.curriculumTargetCodes),
    ),
  ])).sort((left, right) => left.localeCompare(right, "tr-TR"));
  const paragraphs: PremiumPlanExportParagraph[] = [
    { text: "MAARİFOS · ÖĞRETMEN PLAN ZİNCİRİ", style: "meta" },
    { text: heading.title, style: "title" },
    {
      text: heading.period,
      style: "meta",
    },
    ...documentContextParagraphs(
      context,
      scopeKind,
      undefined,
      structuralTargetCodes.length > 0,
    ),
    ...teacherContentLines(graph.annual).map((text) => ({
      text,
      style: "body" as const,
    })),
  ];
  if (calendarEntries.length > 0) {
    paragraphs.push(
      {
        text: "Okulun ek etkinlikleri",
        style: "heading1",
        keepWithNext: true,
      },
      ...calendarEntries.map((entry) => {
        const dateLabel = entry.startDate === entry.endDate
          ? entry.startDate
          : `${entry.startDate} – ${entry.endDate}`;
        const typeLabel = CALENDAR_ENTRY_TYPE_LABELS[entry.entryType]
          ?? "Okul etkinliği";
        return {
          text: `${dateLabel} · ${typeLabel}: ${entry.title}${entry.note ? ` · ${entry.note}` : ""}`,
          style: "bullet" as const,
        };
      }),
    );
  }
  for (const [monthIndex, { monthly, weeks }] of graph.months.entries()) {
    auditLines.push(`Aylık plan: ${monthly.id}`);
    paragraphs.push(
      {
        text: monthly.title,
        style: "heading1",
        pageBreakBefore: scopeKind === "combined" || monthIndex > 0,
      },
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
        const dailyTargetCodes = Array.from(new Set(
          daily.activities.flatMap((activity) => activity.curriculumTargetCodes),
        )).sort((left, right) => left.localeCompare(right, "tr-TR"));
        if (dailyTargetCodes.length > 0) {
          paragraphs.push({
            text: `Seçili TYMM hedefleri: ${dailyTargetCodes.join(" · ")}`,
            style: "meta",
          });
        }
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
  if (context.includeAuditAppendix) {
    paragraphs.push(
      {
        text: "Denetim eki · kayıt ve kanıt kimlikleri",
        style: "heading1",
        pageBreakBefore: true,
        keepWithNext: true,
      },
      ...auditLines.map((text) => ({ text, style: "meta" as const })),
    );
  }
  paragraphs.push({
    text: "Bu belge öğretmenin cihazındaki kalıcı plan zincirinden, şema, dönem, kaynak ve plan grafiği bütünlüğü doğrulanarak hazırlanmıştır; eksik plan alanı uydurulmamıştır.",
    style: "meta",
  });
  paragraphs.push(...signatureParagraphs(context));
  return context.includeAuditAppendix
    ? paragraphs
    : stripTechnicalIdentifiers(paragraphs);
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

function calendarEntriesForScope(
  entries: readonly StandaloneTeacherOwnedCalendarEntryExport[],
  source: ReturnType<typeof scopedStandalonePlanSource>,
  scope: TeacherOwnedPlanDocumentScope,
): StandaloneTeacherOwnedCalendarEntryExport[] {
  let periodStart = source.graph.annual.periodStart;
  let periodEnd = source.graph.annual.periodEnd;
  if (scope.kind === "monthly") {
    periodStart = source.graph.months[0].monthly.periodStart;
    periodEnd = source.graph.months[0].monthly.periodEnd;
  } else if (scope.kind === "weekly") {
    periodStart = source.graph.months[0].weeks[0].periodStart;
    periodEnd = source.graph.months[0].weeks[0].periodEnd;
  } else if (scope.kind === "daily") {
    const daily = source.dailyPlans[0];
    periodStart = daily.civilDate;
    periodEnd = daily.civilDate;
  }
  return entries.filter((entry) =>
    entry.startDate <= periodEnd && entry.endDate >= periodStart,
  );
}

export async function buildStandaloneTeacherOwnedPlanPreview(
  graph: TeacherOwnedPlanGraph,
  store: LocalDataStore,
  scope: TeacherOwnedPlanDocumentScope,
  context: TeacherOwnedPlanDocumentContext = {},
): Promise<PremiumPlanExportParagraph[]> {
  const [dailyPlans, calendarEntries] = await Promise.all([
    loadStandaloneTeacherOwnedDailyPlans(store, graph),
    loadStandaloneTeacherOwnedCalendarEntries(store, graph),
  ]);
  const source = scopedStandalonePlanSource(graph, dailyPlans, scope);
  return buildStandaloneTeacherOwnedPlanParagraphs(
    source.graph,
    source.dailyPlans,
    { ...context, includeAuditAppendix: context.includeAuditAppendix ?? false },
    scope.kind,
    calendarEntriesForScope(calendarEntries, source, scope),
  );
}

export async function generateStandaloneTeacherOwnedPlanExportFile(
  graph: TeacherOwnedPlanGraph,
  store: LocalDataStore,
  format: PremiumPlanExportFormat,
  scope: TeacherOwnedPlanDocumentScope = { kind: "combined" },
  context: TeacherOwnedPlanDocumentContext = {},
  pdfRuntime: SemanticTaggedPdfRuntime = {},
): Promise<StandaloneTeacherOwnedPlanExportFile> {
  if (format !== "pdf" && format !== "word") {
    throw new Error("Dışa aktarma biçimi PDF veya Word olmalıdır.");
  }
  const [dailyPlans, calendarEntries] = await Promise.all([
    loadStandaloneTeacherOwnedDailyPlans(store, graph),
    loadStandaloneTeacherOwnedCalendarEntries(store, graph),
  ]);
  const source = scopedStandalonePlanSource(graph, dailyPlans, scope);
  const paragraphs = buildStandaloneTeacherOwnedPlanParagraphs(
    source.graph,
    source.dailyPlans,
    { ...context, includeAuditAppendix: context.includeAuditAppendix ?? false },
    scope.kind,
    calendarEntriesForScope(calendarEntries, source, scope),
  );
  const bytes = format === "word"
    ? createPremiumPlanDocx(paragraphs)
    : await createPremiumPlanPdf(paragraphs, pdfRuntime);
  return {
    format,
    fileName: `MaarifOS_Ogretmen_Plani_${source.fileLabel}.${format === "pdf" ? "pdf" : "docx"}`,
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
  context: TeacherOwnedPlanDocumentContext = {},
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
    programLabel: curriculumProgramFromContext(context) as "TYMM 2024",
    ageLabel: ageGroupFromPack(pack, context) as "60–72 ay",
    academicRelease: cleanDocumentContextValue(context.academicYearName)
      ?? pack.academicRelease,
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
      "Bu belge, öğretmenin cihazındaki kalıcı plan zincirinden hazırlanmıştır; kayıtlı öğretmen içeriği değiştirilmez ve eksik alan üretilmez.",
  };
}

export async function generateTeacherOwnedPlanExportFile(
  pack: PremiumContentPack,
  source: InstalledPremiumPlanExportSource,
  format: PremiumPlanExportFormat,
  context: TeacherOwnedPlanDocumentContext = {},
  pdfRuntime: SemanticTaggedPdfRuntime = {},
): Promise<PremiumPlanExportFile> {
  const document = prepareTeacherOwnedPlanExportDocument(pack, source, format, context);
  const generatedParagraphs = buildPremiumPlanExportParagraphs(document);
  const contextHeader = documentContextParagraphs(context, "combined", {
    academicYearName: document.academicRelease,
    ageGroup: document.ageLabel,
    curriculumProgram: document.programLabel,
  });
  const paragraphs = context.includeAuditAppendix
    ? [...contextHeader, ...generatedParagraphs, ...signatureParagraphs(context)]
    : stripTechnicalIdentifiers([
        ...contextHeader,
        ...generatedParagraphs,
        ...signatureParagraphs(context),
      ]);
  const bytes = format === "word"
    ? createPremiumPlanDocx(paragraphs)
    : await createPremiumPlanPdf(paragraphs, pdfRuntime);
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
