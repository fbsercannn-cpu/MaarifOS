import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { TEACHER_DOCUMENT_THEME, teacherDocumentRunningHeader } from "../documents/document-theme.ts";
import {
  validatePdfSelection,
  type PdfPreviewRecipe,
  type PdfPreviewSelection,
} from "../documents/pdf-preview-model.ts";
import {
  createSemanticTaggedPdf,
  type SemanticPdfNode,
  type SemanticTaggedPdfRuntime,
} from "../documents/semantic-tagged-pdf.ts";
import {
  loadDayExitPackageModel,
  type DayExitPackageModel,
  type LoadDayExitPackageInput,
} from "./day-exit-package-model.ts";

const ATTENDANCE_LABEL = {
  present: "Geldi",
  late: "Geç geldi",
  absent: "Gelmedi",
} as const;

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function exactStudentScope(selection: PdfPreviewSelection, ids: readonly string[]): void {
  if (!ids.length) return;
  const selected = selection.studentIds ?? [];
  const allowed = new Set(ids);
  if (selected.length !== ids.length || selected.some((id) => !allowed.has(id))) {
    throw new Error("Günün çıkış paketi sınıfın kayıtlı gün kapsamını birlikte korur. Öğrenci kapsamını değiştirmeden hazırlayın.");
  }
}

function attendanceAndPickupNodes(model: DayExitPackageModel, fields: readonly string[]): SemanticPdfNode[] {
  if (!fields.includes("attendance") && !fields.includes("pickup")) return [];
  const headers = [
    "Sıra",
    "Çocuk",
    ...(fields.includes("attendance") ? ["Gerçek yoklama"] : []),
    ...(fields.includes("pickup") ? ["Düzeltilmiş gerçek teslim"] : []),
    "Son kontrol",
  ];
  const rows = model.attendance.rows.map((attendance, index) => {
    const pickup = model.pickups.rows.find((entry) => entry.studentId === attendance.studentId)!;
    const delivery = pickup.delivery
      ? `${timeLabel(pickup.delivery.handedOverAt)} · ${pickup.delivery.contactName} · ${pickup.delivery.relationship}`
      : pickup.state === "not-required" ? "Devamsız · teslim gerekmiyor"
        : pickup.state === "attendance-missing" ? "Yoklama kaydı eksik"
          : pickup.correctionCount ? "Önceki teslim düzeltildi · geçerli kayıt eksik" : "Gerçek teslim kaydı eksik";
    return [
      String(index + 1),
      attendance.studentName,
      ...(fields.includes("attendance") ? [attendance.status ? ATTENDANCE_LABEL[attendance.status] : "Yoklama kaydı eksik"] : []),
      ...(fields.includes("pickup") ? [delivery] : []),
      "________",
    ];
  });
  return [{
    kind: "table",
    headers,
    rows,
    summary: `${dateLabel(model.civilDate)} gerçek yoklama ve düzeltilmiş teslim kontrolü`,
    columnWeights: [0.55, 1.7, ...(fields.includes("attendance") ? [1.1] : []), ...(fields.includes("pickup") ? [2.5] : []), 0.7],
    fontSize: 9.6,
    cellPadding: 4,
    rowHeaderColumn: 1,
    balancePages: true,
  }];
}

function preparationNodes(model: DayExitPackageModel): SemanticPdfNode[] {
  if (!model.nextDay) return [
    { kind: "heading", level: 2, text: "SONRAKİ ÖĞRETİM GÜNÜ HAZIRLIĞI" },
    { kind: "paragraph", text: "Eğitim yılı içinde sonraki bir öğretim günü bulunamadı." },
  ];
  const planText = model.nextDay.plans.length
    ? model.nextDay.plans.map((plan) => `• ${plan.title}`).join("\n")
    : "Kayıtlı günlük plan bulunmuyor.";
  const nodes: SemanticPdfNode[] = [
    { kind: "heading", level: 2, text: `SONRAKİ ÖĞRETİM GÜNÜ · ${dateLabel(model.nextDay.civilDate).toLocaleUpperCase("tr-TR")}` },
    { kind: "paragraph", tone: "meta", text: `Kayıtlı günlük planlar\n${planText}` },
  ];
  if (!model.nextDay.sources.length) {
    nodes.push({ kind: "paragraph", text: "Bu gün için kayıtlı plan veya etkinlik hazırlık kaynağı bulunmuyor." });
    return nodes;
  }
  nodes.push({
    kind: "table",
    headers: ["Gerçek kaynak", "Materyaller", "Ön hazırlık", "Hazırlık listesi"],
    rows: model.nextDay.sources.map((source) => [
      `${source.collection === "plans" ? "Plan" : "Etkinlik"} · ${source.title}`,
      source.materials.join("\n") || "Kaynakta belirtilmedi",
      source.preparation.join("\n") || "Kaynakta belirtilmedi",
      source.alreadySaved ? "Kayıtlı" : source.available ? "Seçilebilir" : "Kaynak bilgisi eksik",
    ]),
    summary: `${dateLabel(model.nextDay.civilDate)} kayıtlı plan ve etkinliklerinden materyal hazırlığı`,
    columnWeights: [2.2, 2, 2, 1.1],
    fontSize: 9.2,
    cellPadding: 4,
    rowHeaderColumn: 0,
    balancePages: true,
  });
  return nodes;
}

export async function createDayExitPackageRecipe(
  store: LocalDataStore,
  input: LoadDayExitPackageInput = {},
  runtime: SemanticTaggedPdfRuntime = {},
): Promise<PdfPreviewRecipe> {
  const model = await loadDayExitPackageModel(store, input);
  const studentChoices = model.attendance.rows.map((row) => ({ id: row.studentId, label: row.studentName }));
  const studentIds = studentChoices.map((student) => student.id);
  const sourceFingerprint = model.sourceFingerprint;
  const current = async () => {
    const fresh = await loadDayExitPackageModel(store, { civilDate: model.civilDate, now: input.now });
    if (fresh.sourceFingerprint !== sourceFingerprint) {
      throw new Error("Çıkış paketinin yoklama, teslim veya hazırlık kaynakları değişti. Güncel paketi yeniden açın.");
    }
  };
  const assertExportAllowed = async (selection: PdfPreviewSelection) => {
    validatePdfSelection(recipe, selection);
    exactStudentScope(selection, studentIds);
    await current();
  };
  const recipe: PdfPreviewRecipe = {
    title: "Günün çıkış paketi",
    description: "Bugünün gerçek yoklaması ve düzeltilmiş teslim kayıtları ile sonraki öğretim gününün kayıtlı plan/malzeme hazırlığı aynı yatay A4 kontrol belgesinde yer alır.",
    fields: [
      { id: "attendance", label: "Gerçek yoklama" },
      { id: "pickup", label: "Düzeltilmiş gerçek teslimler" },
      { id: "preparation", label: "Sonraki öğretim günü hazırlığı" },
    ],
    ...(studentChoices.length ? { students: studentChoices } : {}),
    initial: {
      fields: ["attendance", "pickup", "preparation"],
      ...(studentIds.length ? { studentIds } : {}),
    },
    printEnabled: true,
    assertExportAllowed,
    refresh: () => createDayExitPackageRecipe(store, { civilDate: model.civilDate, now: input.now }, runtime),
    async build(selection) {
      await assertExportAllowed(selection);
      const nodes: SemanticPdfNode[] = [
        { kind: "heading", level: 1, text: "GÜNÜN ÇIKIŞ PAKETİ" },
        { kind: "paragraph", tone: "meta", text: `${model.schoolName} · ${model.classroomName} · ${model.academicYearName}\n${dateLabel(model.civilDate)} · ${model.teacherName}` },
        { kind: "paragraph", text: `Yoklama: ${model.attendance.recordedCount}/${model.attendance.rows.length} kayıtlı · Teslim: ${model.pickups.completedCount} kayıtlı, ${model.pickups.missingCount} eksik` },
        ...attendanceAndPickupNodes(model, selection.fields),
        ...(selection.fields.includes("preparation") ? preparationNodes(model) : []),
      ];
      const bytes = await createSemanticTaggedPdf({
        title: "Günün çıkış paketi",
        language: "tr-TR",
        orientation: "landscape",
        pageFormat: "A4",
        pageMargin: 28,
        theme: TEACHER_DOCUMENT_THEME,
        includeTotalPages: true,
        artifactHeaderText: teacherDocumentRunningHeader("Günün çıkış paketi", {
          schoolName: model.schoolName,
          classroomName: model.classroomName,
          periodLabel: model.civilDate,
        }),
        artifactHeaderOnFirstPage: false,
        artifactFooterText: "MaarifOS · Gerçek kayıt kontrolü · Boş kutular öğretmen kontrolü içindir.",
        technicalMetadata: [
          { key: "document-kind", value: "day-exit-package" },
          { key: "civil-date", value: model.civilDate },
        ],
        nodes,
      }, runtime);
      await assertExportAllowed(selection);
      return {
        bytes,
        mimeType: "application/pdf",
        fileName: `MaarifOS_Gunun_Cikis_Paketi_${model.civilDate}.pdf`,
      };
    },
  };
  return recipe;
}
