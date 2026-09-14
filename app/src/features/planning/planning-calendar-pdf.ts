import { isCivilDate } from "../../core/domain/attendance.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { recordBelongsToClassroomScope, resolveActiveClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { activeSchoolDocumentTemplate, type SchoolDocumentTemplate } from "../../core/domain/school-document-template.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type { BrowserFileDownload } from "../documents/browser-file-download.ts";
import { TEACHER_DOCUMENT_THEME, TEACHER_PRINT_THEME } from "../documents/document-theme.ts";
import { validatePdfSelection, type PdfPreviewRecipe, type PdfPreviewSelection } from "../documents/pdf-preview-model.ts";
import { semanticTaggedPdfPageCount, type SemanticPdfNode, type SemanticTaggedPdfDocument, type SemanticTaggedPdfRuntime } from "../documents/semantic-tagged-pdf.ts";
import { createSchoolStyledPdf } from "../school-document-template/school-document-template-pdf.ts";
import { createWeeklyDeskPlanWord } from "./planning-calendar-word.ts";
import {
  PLANNING_CALENDAR_FIELDS,
  buildMonthlyWallCalendarModel,
  buildWeeklyDeskPlanModel,
  loadMonthlyWallCalendarModel,
  loadWeeklyDeskPlanModel,
  type MonthlyWallCalendarModel,
  type MonthlyWallCalendarReadInput,
  type PlanningCalendarDay,
  type PlanningCalendarFieldId,
  type WeeklyDeskPlanModel,
  type WeeklyDeskPlanReadInput,
} from "./calendar-print-model.ts";

export interface PlanningCalendarPdfContext {
  readonly schoolTemplate?: SchoolDocumentTemplate | null;
  readonly appearance?: "color" | "ink-saving";
  readonly runtime?: SemanticTaggedPdfRuntime;
}

export interface PlanningCalendarRecipeOptions {
  readonly runtime?: SemanticTaggedPdfRuntime;
}

const DAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;
const SCHOOL_DAY_REASON: Readonly<Record<string, string>> = {
  weekend: "Hafta sonu",
  "official-break": "Resmî ara tatil",
  "full-day-holiday": "Tam gün tatil",
  "local-closure": "Okul takviminde kapalı",
  "explicit-closure": "Öğretim dışı gün",
  "outside-teaching-period": "Öğretim dönemi dışında",
  "before-operational-start": "Eğitim başlangıcından önce",
  "after-academic-year": "Eğitim yılı dışında",
  "invalid-calendar": "Takvim doğrulanamadı",
};

function dateLabel(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("tr-TR", { ...options, timeZone: "UTC" }).format(new Date(`${value}T12:00:00.000Z`));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function schoolTemplateForLandscape(template: SchoolDocumentTemplate | null | undefined): SchoolDocumentTemplate | null {
  return template ? { ...structuredClone(template), orientation: "landscape" } : null;
}

function documentContextNodes(model: WeeklyDeskPlanModel | MonthlyWallCalendarModel, periodLabel: string): SemanticPdfNode[] {
  return [
    { kind: "paragraph", tone: "meta", text: `Okul: ${model.schoolName} · Sınıf: ${model.classroomName}` },
    { kind: "paragraph", tone: "meta", text: `Eğitim yılı: ${model.academicYearName} · Öğretmen: ${model.teacherName}` },
    { kind: "paragraph", tone: "meta", text: `Dönem: ${periodLabel}` },
  ];
}

function dayActivityText(day: PlanningCalendarDay): string {
  if (!day.isTeachingDay && day.items.length === 0) return SCHOOL_DAY_REASON[day.schoolDayReason] ?? "Öğretim günü değil";
  const activities = day.items.filter((item) => item.kind === "activity" || item.kind === "daily-plan");
  const calendar = day.items.filter((item) => item.kind === "calendar-entry");
  const lines = [
    ...activities.map((item, index) => `${index + 1}. ${item.title}`),
    ...calendar.map((item) => `Takvim · ${item.title}`),
  ];
  return lines.length ? lines.join("\n") : "Kayıtlı etkinlik yok";
}

function dayObservationText(day: PlanningCalendarDay): string {
  const values = unique(day.items.flatMap((item) => item.observationFocus));
  return values.length ? values.map((value) => `• ${value}`).join("\n") : "Kayıtlı gözlem odağı yok";
}

function dayMaterialText(day: PlanningCalendarDay): string {
  const values = unique(day.items.flatMap((item) => item.materials));
  return values.length ? values.map((value) => `• ${value}`).join("\n") : "Kayıtlı materyal yok";
}

function weeklyDocument(model: WeeklyDeskPlanModel, appearance: "color" | "ink-saving" = "color", compact = false): SemanticTaggedPdfDocument {
  const firstDay = model.days[0]?.civilDate ?? model.periodStart;
  const lastDay = model.days.at(-1)?.civilDate ?? model.periodEnd;
  const periodLabel = `${dateLabel(firstDay, { day: "numeric", month: "long" })} – ${dateLabel(lastDay, { day: "numeric", month: "long", year: "numeric" })}`;
  const rows: string[][] = [];
  if (model.fields.includes("activities") || model.fields.includes("calendar-entries")) {
    const label = model.fields.includes("activities") ? "Etkinlikler" : "Okul takvimi";
    rows.push(model.days.map((day) => `${label}\n${dayActivityText(day)}`));
  }
  if (model.fields.includes("observation-focus")) rows.push(model.days.map((day) => `Gözlem odağı\n${dayObservationText(day)}`));
  if (model.fields.includes("materials")) rows.push(model.days.map((day) => `Materyaller\n${dayMaterialText(day)}`));
  const headers = model.days.map((day) => `${day.label}\n${dateLabel(day.civilDate, { day: "numeric", month: "short" })}`);
  return {
    title: "Haftalık Masa Planı",
    language: "tr-TR",
    creator: "MaarifOS",
    orientation: "landscape",
    pageMargin: 32,
    includeTotalPages: true,
    artifactHeaderText: `Haftalık Masa Planı · ${model.classroomName} · ${periodLabel}`,
    artifactHeaderOnFirstPage: false,
    artifactFooterText: "Cihazdaki kayıtlı plan, etkinlik ve okul takvimi kayıtlarından hazırlanmıştır.",
    theme: appearance === "ink-saving" ? TEACHER_PRINT_THEME : TEACHER_DOCUMENT_THEME,
    nodes: [
      { kind: "heading", level: 1, text: "HAFTALIK MASA PLANI" },
      ...documentContextNodes(model, periodLabel),
      {
        kind: "table",
        headers,
        rows,
        summary: "Beş öğretim günü için kayıtlı etkinlikler, gözlem odakları ve materyaller",
        columnWeights: [1, 1, 1, 1, 1],
        fontSize: compact ? 8.2 : 9.2,
        cellPadding: 4,
        balancePages: true,
      },
    ],
  };
}

function monthCell(day: PlanningCalendarDay, fields: readonly PlanningCalendarFieldId[]): string {
  if (!day.inMonth) return "";
  const title = String(day.dayOfMonth);
  if (!day.inSelectedPeriod) return title;
  const records = unique(day.items.flatMap((item) => {
    if (item.kind === "calendar-entry") return fields.includes("calendar-entries") ? [`Takvim · ${item.title}`] : [];
    return [
      ...(fields.includes("activities") ? [item.title] : []),
      ...(fields.includes("observation-focus") ? item.observationFocus.map((value) => `Odak · ${value}`) : []),
      ...(fields.includes("materials") ? item.materials.map((value) => `Materyal · ${value}`) : []),
    ];
  }));
  if (records.length) return `${title}\n${records.map((value) => `• ${value}`).join("\n")}`;
  if (!day.isTeachingDay) return `${title}\n${SCHOOL_DAY_REASON[day.schoolDayReason] ?? "Öğretim günü değil"}`;
  return `${title}\nPlanlanmamış`;
}

function monthlyDocument(model: MonthlyWallCalendarModel, appearance: "color" | "ink-saving" = "color", compact = false): SemanticTaggedPdfDocument {
  const monthLabel = dateLabel(`${model.monthKey}-01`, { month: "long", year: "numeric" });
  let rows: string[][] = [];
  for (let index = 0; index < model.days.length; index += 7) rows.push(model.days.slice(index, index + 7).map((day) => monthCell(day, model.fields)));
  const authoredCharacterCount = rows.flat().reduce((sum, cell) => sum + cell.length, 0);
  const longestCell = Math.max(0, ...rows.flat().map((cell) => cell.length));
  const dense = authoredCharacterCount > 1_050 || longestCell > 180;
  const minimumCellLines = rows.length <= 5 ? 4 : 3;
  if (!dense && !compact) {
    rows = rows.map((row) => row.map((cell) => {
      const lineCount = cell.split("\n").length;
      return lineCount >= minimumCellLines ? cell : `${cell}${"\n".repeat(minimumCellLines - lineCount)}`;
    }));
  }
  const calendarCellPadding = compact || dense ? 2 : 10;
  return {
    title: "Aylık Duvar Takvimi",
    language: "tr-TR",
    creator: "MaarifOS",
    orientation: "landscape",
    pageMargin: 28,
    includeTotalPages: true,
    artifactHeaderText: `Aylık Duvar Takvimi · ${model.classroomName} · ${monthLabel}`,
    artifactHeaderOnFirstPage: false,
    artifactFooterText: "Cihazdaki kayıtlı plan, etkinlik ve okul takvimi kayıtlarından hazırlanmıştır.",
    theme: appearance === "ink-saving" ? TEACHER_PRINT_THEME : TEACHER_DOCUMENT_THEME,
    nodes: [
      { kind: "heading", level: 1, text: `AYLIK DUVAR TAKVİMİ · ${monthLabel.toLocaleUpperCase("tr-TR")}` },
      ...documentContextNodes(model, `${model.periodStart} – ${model.periodEnd}`),
      {
        kind: "table",
        headers: [...DAY_SHORT],
        rows,
        summary: `${monthLabel} için kayıtlı günlük plan ve okul takvimi görünümü`,
        columnWeights: [1, 1, 1, 1, 1, 1, 1],
        fontSize: compact || dense ? 8 : 8.2,
        cellPadding: calendarCellPadding,
        balancePages: true,
      },
    ],
  };
}

export async function createWeeklyDeskPlanPdf(model: WeeklyDeskPlanModel, context: PlanningCalendarPdfContext = {}): Promise<BrowserFileDownload> {
  const template = schoolTemplateForLandscape(context.schoolTemplate);
  let bytes = await createSchoolStyledPdf(
    weeklyDocument(model, context.appearance),
    template,
    { teacherName: model.teacherName, includeSignature: false },
    context.runtime,
  );
  if (semanticTaggedPdfPageCount(bytes) > 1) {
    bytes = await createSchoolStyledPdf(
      weeklyDocument(model, context.appearance, true),
      template,
      { teacherName: model.teacherName, includeSignature: false },
      context.runtime,
    );
  }
  return { fileName: `MaarifOS_Haftalik_Masa_Plani_${model.days[0]?.civilDate ?? model.periodStart}.pdf`, mimeType: "application/pdf", bytes };
}

export async function createMonthlyWallCalendarPdf(model: MonthlyWallCalendarModel, context: PlanningCalendarPdfContext = {}): Promise<BrowserFileDownload> {
  const template = schoolTemplateForLandscape(context.schoolTemplate);
  let bytes = await createSchoolStyledPdf(
    monthlyDocument(model, context.appearance),
    template,
    { teacherName: model.teacherName, includeSignature: false },
    context.runtime,
  );
  if (semanticTaggedPdfPageCount(bytes) > 1) {
    bytes = await createSchoolStyledPdf(
      monthlyDocument(model, context.appearance, true),
      template,
      { teacherName: model.teacherName, includeSignature: false },
      context.runtime,
    );
  }
  return { fileName: `MaarifOS_Aylik_Duvar_Takvimi_${model.monthKey}.pdf`, mimeType: "application/pdf", bytes };
}

function studentsForScope(snapshot: DataSnapshot, scope: ActiveClassroomScope, allowed?: ReadonlySet<string>): { id: string; label: string }[] {
  return snapshot.students.filter((record) =>
    recordBelongsToClassroomScope(record, scope) && typeof record.deletedAt !== "string" && (!allowed || allowed.has(record.id))
  ).map((record) => ({ id: record.id, label: typeof record.displayName === "string" && record.displayName.trim() ? record.displayName.trim() : "Adı belirtilmemiş öğrenci" }))
    .sort((left, right) => left.label.localeCompare(right.label, "tr-TR") || left.id.localeCompare(right.id));
}

function selectedFields(selection: PdfPreviewSelection): PlanningCalendarFieldId[] {
  return selection.fields as PlanningCalendarFieldId[];
}

function initialSelection(model: WeeklyDeskPlanModel | MonthlyWallCalendarModel, studentIds: readonly string[]): PdfPreviewSelection {
  return {
    fields: [...model.fields],
    ...(studentIds.length ? { studentIds: [...studentIds] } : {}),
    periodStart: model.periodStart,
    periodEnd: model.periodEnd,
    appearance: "color",
  };
}

async function weekRecipe(
  store: LocalDataStore,
  input: WeeklyDeskPlanReadInput,
  allowedStudentIds?: ReadonlySet<string>,
  selected?: PdfPreviewSelection,
  runtime?: SemanticTaggedPdfRuntime,
  expectedScope?: ActiveClassroomScope,
): Promise<PdfPreviewRecipe> {
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) throw new Error("Haftalık masa planı için etkin sınıf gereklidir.");
  if (expectedScope && (scope.academicYearId !== expectedScope.academicYearId || scope.classroomId !== expectedScope.classroomId)) {
    throw new Error("Etkin sınıf belge hazırlanırken değişti; kaynak yeniden açılmalıdır.");
  }
  const students = studentsForScope(snapshot, scope, allowedStudentIds);
  const admitted = allowedStudentIds ?? new Set(students.map((student) => student.id));
  const initialStudents = selected?.studentIds ?? input.studentIds ?? students.map((student) => student.id);
  if (initialStudents.some((id) => !admitted.has(id))) throw new Error("Öğrenci seçimi belge kaynağının dışına çıktı.");
  const readInput: WeeklyDeskPlanReadInput = {
    ...input,
    fields: selected ? selectedFields(selected) : input.fields,
    ...(students.length ? { studentIds: initialStudents } : {}),
    periodStart: selected?.periodStart ?? input.periodStart,
    periodEnd: selected?.periodEnd ?? input.periodEnd,
  };
  const model = await loadWeeklyDeskPlanModel(store, readInput);
  if (model.scope.academicYearId !== scope.academicYearId || model.scope.classroomId !== scope.classroomId) throw new Error("Haftalık plan kaynağının sınıf kapsamı değişti.");
  let prepared: { selectionKey: string; modelFingerprint: string; templateFingerprint: string } | null = null;
  const recipe: PdfPreviewRecipe = {
    supportsAppearance: true,
    title: "Haftalık Masa Planı",
    description: "Beş günün kayıtlı etkinlik, gözlem odağı ve materyalleri yatay A4 üzerinde gösterilir; seçilmemiş alan ve öğrenciler belgeye girmez.",
    fields: PLANNING_CALENDAR_FIELDS.map((field) => ({ ...field })),
    ...(students.length ? { students } : {}),
    period: { min: model.days[0]!.civilDate, max: model.days.at(-1)!.civilDate },
    initial: selected ?? initialSelection(model, initialStudents),
    exportActions: [{
      id: "word",
      label: "Düzenlenebilir haftalık Word tablosunu indir",
      async build(selection) {
        validatePdfSelection(recipe, selection);
        const freshSnapshot = await store.readSnapshot();
        const fresh = buildWeeklyDeskPlanModel(freshSnapshot, {
          civilDate: input.civilDate,
          fields: selectedFields(selection),
          ...(students.length ? { studentIds: selection.studentIds } : {}),
          periodStart: selection.periodStart,
          periodEnd: selection.periodEnd,
        });
        if (fresh.scope.academicYearId !== scope.academicYearId || fresh.scope.classroomId !== scope.classroomId) throw new Error("Etkin sınıf belge hazırlanırken değişti.");
        return createWeeklyDeskPlanWord(fresh);
      },
    }],
    async refresh(selection) {
      validatePdfSelection(recipe, selection);
      return weekRecipe(store, input, admitted, selection, runtime, scope);
    },
    async build(selection) {
      validatePdfSelection(recipe, selection);
      const freshSnapshot = await store.readSnapshot();
      const fresh = buildWeeklyDeskPlanModel(freshSnapshot, {
        civilDate: input.civilDate,
        fields: selectedFields(selection),
        ...(students.length ? { studentIds: selection.studentIds } : {}),
        periodStart: selection.periodStart,
        periodEnd: selection.periodEnd,
      });
      if (fresh.scope.academicYearId !== scope.academicYearId || fresh.scope.classroomId !== scope.classroomId) throw new Error("Etkin sınıf belge hazırlanırken değişti.");
      const template = activeSchoolDocumentTemplate(freshSnapshot, scope);
      prepared = { selectionKey: canonicalJson(selection), modelFingerprint: canonicalJson(fresh), templateFingerprint: canonicalJson(template) };
      return createWeeklyDeskPlanPdf(fresh, { appearance: selection.appearance, schoolTemplate: template, runtime });
    },
    async assertExportAllowed(selection) {
      validatePdfSelection(recipe, selection);
      const freshSnapshot = await store.readSnapshot();
      const fresh = buildWeeklyDeskPlanModel(freshSnapshot, {
        civilDate: input.civilDate,
        fields: selectedFields(selection),
        ...(students.length ? { studentIds: selection.studentIds } : {}),
        periodStart: selection.periodStart,
        periodEnd: selection.periodEnd,
      });
      const template = activeSchoolDocumentTemplate(freshSnapshot, scope);
      if (!prepared || prepared.selectionKey !== canonicalJson(selection) || prepared.modelFingerprint !== canonicalJson(fresh) || prepared.templateFingerprint !== canonicalJson(template)) {
        throw new Error("Plan veya okul belge şablonu önizlemeden sonra değişti; belgeyi güncelleyin.");
      }
    },
  };
  return recipe;
}

async function monthRecipe(
  store: LocalDataStore,
  input: MonthlyWallCalendarReadInput,
  allowedStudentIds?: ReadonlySet<string>,
  selected?: PdfPreviewSelection,
  runtime?: SemanticTaggedPdfRuntime,
  expectedScope?: ActiveClassroomScope,
): Promise<PdfPreviewRecipe> {
  const snapshot = await store.readSnapshot();
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) throw new Error("Aylık duvar takvimi için etkin sınıf gereklidir.");
  if (expectedScope && (scope.academicYearId !== expectedScope.academicYearId || scope.classroomId !== expectedScope.classroomId)) {
    throw new Error("Etkin sınıf belge hazırlanırken değişti; kaynak yeniden açılmalıdır.");
  }
  const students = studentsForScope(snapshot, scope, allowedStudentIds);
  const admitted = allowedStudentIds ?? new Set(students.map((student) => student.id));
  const initialStudents = selected?.studentIds ?? input.studentIds ?? students.map((student) => student.id);
  if (initialStudents.some((id) => !admitted.has(id))) throw new Error("Öğrenci seçimi belge kaynağının dışına çıktı.");
  const readInput: MonthlyWallCalendarReadInput = {
    ...input,
    fields: selected ? selectedFields(selected) : input.fields,
    ...(students.length ? { studentIds: initialStudents } : {}),
    periodStart: selected?.periodStart ?? input.periodStart,
    periodEnd: selected?.periodEnd ?? input.periodEnd,
  };
  const model = await loadMonthlyWallCalendarModel(store, readInput);
  if (model.scope.academicYearId !== scope.academicYearId || model.scope.classroomId !== scope.classroomId) throw new Error("Aylık takvim kaynağının sınıf kapsamı değişti.");
  let prepared: { selectionKey: string; modelFingerprint: string; templateFingerprint: string } | null = null;
  const recipe: PdfPreviewRecipe = {
    supportsAppearance: true,
    title: "Aylık Duvar Takvimi",
    description: "Kayıtlı günlük planlar ve okul takvimi kayıtları gerçek tarihlerine yerleşir; boş öğretim günleri açık kalır.",
    fields: PLANNING_CALENDAR_FIELDS.map((field) => ({ ...field })),
    ...(students.length ? { students } : {}),
    period: { min: `${input.monthKey}-01`, max: model.days.filter((day) => day.inMonth).at(-1)!.civilDate },
    initial: selected ?? initialSelection(model, initialStudents),
    async refresh(selection) {
      validatePdfSelection(recipe, selection);
      return monthRecipe(store, input, admitted, selection, runtime, scope);
    },
    async build(selection) {
      validatePdfSelection(recipe, selection);
      const freshSnapshot = await store.readSnapshot();
      const fresh = buildMonthlyWallCalendarModel(freshSnapshot, {
        monthKey: input.monthKey,
        fields: selectedFields(selection),
        ...(students.length ? { studentIds: selection.studentIds } : {}),
        periodStart: selection.periodStart,
        periodEnd: selection.periodEnd,
      });
      if (fresh.scope.academicYearId !== scope.academicYearId || fresh.scope.classroomId !== scope.classroomId) throw new Error("Etkin sınıf belge hazırlanırken değişti.");
      const template = activeSchoolDocumentTemplate(freshSnapshot, scope);
      prepared = { selectionKey: canonicalJson(selection), modelFingerprint: canonicalJson(fresh), templateFingerprint: canonicalJson(template) };
      return createMonthlyWallCalendarPdf(fresh, { appearance: selection.appearance, schoolTemplate: template, runtime });
    },
    async assertExportAllowed(selection) {
      validatePdfSelection(recipe, selection);
      const freshSnapshot = await store.readSnapshot();
      const fresh = buildMonthlyWallCalendarModel(freshSnapshot, {
        monthKey: input.monthKey,
        fields: selectedFields(selection),
        ...(students.length ? { studentIds: selection.studentIds } : {}),
        periodStart: selection.periodStart,
        periodEnd: selection.periodEnd,
      });
      const template = activeSchoolDocumentTemplate(freshSnapshot, scope);
      if (!prepared || prepared.selectionKey !== canonicalJson(selection) || prepared.modelFingerprint !== canonicalJson(fresh) || prepared.templateFingerprint !== canonicalJson(template)) {
        throw new Error("Plan veya okul belge şablonu önizlemeden sonra değişti; belgeyi güncelleyin.");
      }
    },
  };
  return recipe;
}

export async function createWeekRecipe(store: LocalDataStore, input: WeeklyDeskPlanReadInput, options: PlanningCalendarRecipeOptions = {}): Promise<PdfPreviewRecipe> {
  if (!isCivilDate(input.civilDate)) throw new Error("Hafta günü YYYY-AA-GG biçiminde olmalıdır.");
  return weekRecipe(store, input, undefined, undefined, options.runtime);
}

export async function createMonthRecipe(store: LocalDataStore, input: MonthlyWallCalendarReadInput, options: PlanningCalendarRecipeOptions = {}): Promise<PdfPreviewRecipe> {
  return monthRecipe(store, input, undefined, undefined, options.runtime);
}
