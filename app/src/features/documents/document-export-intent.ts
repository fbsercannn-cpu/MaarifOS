import type { PdfChoice, PdfPreviewSelection } from "./pdf-preview-model.ts";

export const DOCUMENT_EXPORT_RECIPIENTS = [
  { id: "teacher-preparation", label: "Öğretmenin yerel hazırlığı" },
  { id: "authorized-school-unit", label: "Yetkili okul birimi" },
  { id: "official-system-preparation", label: "Resmî sisteme giriş hazırlığı" },
  { id: "selected-student-family", label: "Seçili çocuğun ailesi" },
] as const;

export const DOCUMENT_EXPORT_PURPOSES = [
  { id: "lesson-preparation", label: "Ders öncesi/sonrası hazırlık" },
  { id: "internal-record", label: "Kurum içi kayıt hazırlığı" },
  { id: "official-process", label: "Resmî işlem hazırlığı" },
  { id: "family-information", label: "Aile bilgilendirmesi" },
] as const;

export type DocumentExportRecipient = typeof DOCUMENT_EXPORT_RECIPIENTS[number]["id"];
export type DocumentExportPurpose = typeof DOCUMENT_EXPORT_PURPOSES[number]["id"];

export interface DocumentExportIntent {
  readonly recipient: DocumentExportRecipient;
  readonly purpose: DocumentExportPurpose;
}

export interface DocumentExportScopeSummary {
  readonly selectedFieldCount: number;
  readonly selectedStudentIds: readonly string[];
  readonly selectedStudentLabels: readonly string[];
  readonly studentScopeLabel: string;
}

function selectedStudents(
  students: readonly PdfChoice[] | undefined,
  selection: PdfPreviewSelection,
): readonly PdfChoice[] {
  if (!students) return [];
  const selected = new Set(selection.studentIds ?? []);
  return students.filter((student) => selected.has(student.id));
}

export function documentExportScopeSummary(
  students: readonly PdfChoice[] | undefined,
  selection: PdfPreviewSelection,
): DocumentExportScopeSummary {
  const chosen = selectedStudents(students, selection);
  const labels = chosen.map((student) => student.label);
  return {
    selectedFieldCount: selection.fields.length,
    selectedStudentIds: chosen.map((student) => student.id),
    selectedStudentLabels: labels,
    studentScopeLabel: students
      ? labels.length === 0
        ? "Öğrenci seçilmedi"
        : labels.length <= 3
          ? labels.join(", ")
          : `${labels.slice(0, 2).join(", ")} ve ${labels.length - 2} çocuk daha`
      : "Çocuk kapsamı bu belgede otomatik doğrulanamıyor; önizlemeyi kontrol edin",
  };
}

export function assertDocumentExportIntent(
  intent: DocumentExportIntent,
  scope: DocumentExportScopeSummary,
): void {
  if (intent.recipient === "selected-student-family") {
    if (scope.selectedStudentIds.length !== 1) {
      throw new Error("Aile alıcısı için belgede tam olarak bir çocuk seçilmelidir.");
    }
    if (intent.purpose !== "family-information") {
      throw new Error("Seçili çocuğun ailesi yalnız aile bilgilendirmesi amacıyla seçilebilir.");
    }
  } else if (intent.purpose === "family-information") {
    throw new Error("Aile bilgilendirmesi için alıcı olarak seçili çocuğun ailesini belirleyin.");
  }

  if (
    (intent.recipient === "official-system-preparation") !==
    (intent.purpose === "official-process")
  ) {
    throw new Error("Resmî işlem amacı ve resmî sisteme giriş hazırlığı alıcısı birlikte seçilmelidir.");
  }
}

export function documentExportChannelNotice(intent: DocumentExportIntent): string {
  if (intent.recipient === "official-system-preparation") {
    return "Bu dosya yalnız giriş hazırlığıdır; MaarifOS resmî sisteme aktarım yapmaz. İşlemi yetkili resmî kanalda öğretmen tamamlar.";
  }
  if (intent.recipient === "selected-student-family") {
    return "Dosyayı yalnız okulun bu aile için belirlediği güncel ve yetkili iletişim kanalında paylaşın.";
  }
  return "MaarifOS dosyayı kendiliğinden göndermez. Aktarım gerekiyorsa yalnız okulun güncel ve yetkili kanalını kullanın.";
}
