import type { BrowserFileDownload } from "./browser-file-download.ts";

export interface PdfChoice { readonly id: string; readonly label: string; readonly group?: string; }
export interface PdfPreviewSelection {
  readonly fields: readonly string[];
  readonly studentIds?: readonly string[];
  readonly template?: string;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly appearance?: "color" | "ink-saving";
  readonly layout?: string;
}
export interface PdfPreviewRecipe {
  /** Read a fresh snapshot and return builders bound to it; never broaden selection. */
  refresh?(selection: PdfPreviewSelection): Promise<PdfPreviewRecipe>;
  readonly supportsAppearance?: boolean;
  readonly layouts?: readonly PdfChoice[];
  readonly layoutTemplates?: readonly string[];
  readonly title: string;
  readonly description?: string;
  readonly fields: readonly PdfChoice[];
  readonly fieldsForTemplate?: Readonly<Record<string, readonly PdfChoice[]>>;
  readonly defaultFieldsForTemplate?: Readonly<Record<string, readonly string[]>>;
  readonly fieldPresets?: readonly { readonly id: string; readonly label: string; readonly fields: readonly string[]; readonly templates?: readonly string[] }[];
  readonly printEnabled?: boolean;
  readonly exportActions?: readonly {
    readonly id: string;
    readonly label: string;
    readonly templates?: readonly string[];
    build(selection: PdfPreviewSelection): Promise<BrowserFileDownload>;
  }[];
  readonly students?: readonly PdfChoice[];
  readonly templates?: readonly PdfChoice[];
  readonly period?: { readonly min: string; readonly max: string };
  readonly initial: PdfPreviewSelection;
  /** Rebuild only from the explicitly selected source; excluded sensitive fields cannot be added. */
  build(selection: PdfPreviewSelection): Promise<BrowserFileDownload>;
  /** Recheck live usage permissions immediately before handing bytes to the browser. */
  assertExportAllowed?(selection: PdfPreviewSelection): Promise<void>;
}
export type PdfPreviewAction = "shared" | "downloaded" | "cancelled";
export interface PdfPreviewRequest {
  readonly historical?: boolean;
  readonly file?: BrowserFileDownload;
  readonly recipe?: PdfPreviewRecipe;
  readonly warning?: string;
  readonly title: string;
  readonly complete: (action: PdfPreviewAction) => void;
}
const recipes = new WeakMap<Uint8Array, PdfPreviewRecipe>();
let presenter: ((request: PdfPreviewRequest) => void) | undefined;
export function hasPdfPreviewPresenter(): boolean { return Boolean(presenter); }

export function registerPdfPreviewRecipe(bytes: Uint8Array, recipe: PdfPreviewRecipe): void {
  recipes.set(bytes, recipe);
}
export function pdfPreviewRecipe(bytes: Uint8Array): PdfPreviewRecipe | undefined { return recipes.get(bytes); }
export function installPdfPreviewPresenter(value: (request: PdfPreviewRequest) => void): () => void {
  presenter = value;
  return () => { if (presenter === value) presenter = undefined; };
}
export function requestPdfPreview(file: BrowserFileDownload, options: {
  warning?: string; historical?: boolean; complete?: (action: PdfPreviewAction) => void;
} = {}): boolean {
  if (!presenter || file.mimeType !== "application/pdf") return false;
  const recipe = recipes.get(file.bytes);
  presenter({ file: { ...file, bytes: file.bytes.slice() }, recipe,
    title: recipe?.title ?? file.fileName.replace(/\.pdf$/iu, ""),
    warning: options.warning, historical: options.historical, complete: options.complete ?? (() => undefined) });
  return true;
}
export function requestPdfDocument(recipe: PdfPreviewRecipe, warning?: string): Promise<PdfPreviewAction> {
  if (!presenter) return Promise.reject(new Error("PDF önizleme alanı hazır değil. Belge alanını yeniden açın."));
  return new Promise((complete) => presenter!({ recipe, title: recipe.title, warning, complete }));
}
export function pdfFieldsForSelection(recipe: PdfPreviewRecipe, selection: Pick<PdfPreviewSelection, "template">): readonly PdfChoice[] {
  return (selection.template && recipe.fieldsForTemplate?.[selection.template]) || recipe.fields;
}

export function validatePdfSelection(recipe: PdfPreviewRecipe, selection: PdfPreviewSelection): void {
  if (selection.layout !== undefined && (!recipe.layouts?.some(layout => layout.id === selection.layout)
    || (recipe.layoutTemplates && !recipe.layoutTemplates.includes(selection.template ?? "")))) throw new Error("Bu belge için seçilen sayfa düzeni desteklenmiyor.");
  if (selection.appearance !== undefined && (!recipe.supportsAppearance || !["color", "ink-saving"].includes(selection.appearance))) throw new Error("Bu belge için seçilen baskı görünümü desteklenmiyor.");
  const allowed = new Set(pdfFieldsForSelection(recipe, selection).map((field) => field.id));
  if (!selection.fields.length || selection.fields.some((field) => !allowed.has(field))) throw new Error("En az bir geçerli belge bölümü seçin.");
  if (new Set(selection.fields).size !== selection.fields.length) throw new Error("Belge bölümü birden çok seçilemez.");
  if (recipe.students) {
    const students = new Set(recipe.students.map((student) => student.id));
    if (!selection.studentIds?.length || selection.studentIds.some((id) => !students.has(id))) throw new Error("En az bir geçerli öğrenci seçin.");
    if (new Set(selection.studentIds).size !== selection.studentIds.length) throw new Error("Aynı öğrenci birden çok seçilemez.");
  }
  if (recipe.templates && !recipe.templates.some((template) => template.id === selection.template)) throw new Error("Belge şablonunu seçin.");
  if (recipe.period && (!selection.periodStart || !selection.periodEnd
    || !/^\d{4}-\d{2}-\d{2}$/u.test(selection.periodStart) || !/^\d{4}-\d{2}-\d{2}$/u.test(selection.periodEnd)
    || selection.periodStart < recipe.period.min || selection.periodEnd > recipe.period.max || selection.periodStart > selection.periodEnd)) {
    throw new Error("Belge dönemi kaynak tarih aralığında olmalıdır.");
  }
}
export interface PreparedPdfArtifact {
  readonly blob: Blob;
  readonly url: string;
  readonly fileName: string;
  readonly byteLength: number;
  dispose(): void;
}
export function preparePdfArtifact(file: BrowserFileDownload, environment = {
  createObjectURL: (blob: Blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url: string) => URL.revokeObjectURL(url),
}): PreparedPdfArtifact {
  if (file.mimeType !== "application/pdf" || new TextDecoder().decode(file.bytes.subarray(0, 5)) !== "%PDF-"
    || !new TextDecoder().decode(file.bytes.subarray(Math.max(0, file.bytes.length - 1024))).includes("%%EOF")) {
    throw new Error("Dosya gerçek PDF olarak doğrulanamadı; dışa aktarılmadı.");
  }
  const bytes = new Uint8Array(file.bytes.length); bytes.set(file.bytes);
  const blob = new Blob([bytes.buffer], { type: "application/pdf" });
  const url = environment.createObjectURL(blob);
  let disposed = false;
  return { blob, url, fileName: file.fileName, byteLength: blob.size,
    dispose: () => { if (!disposed) { disposed = true; environment.revokeObjectURL(url); } } };
}

/** A second URL leases the same Blob long enough for Android to receive a download after dialog close. */
export function downloadPreparedPdfArtifact(artifact: PreparedPdfArtifact, environment = {
  createObjectURL: (blob: Blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url: string) => URL.revokeObjectURL(url),
  click: (url: string, name: string) => { const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.rel = "noopener"; anchor.click(); },
  setTimer: (handler: () => void, duration: number) => { window.setTimeout(handler, duration); },
}): void {
  const url = environment.createObjectURL(artifact.blob);
  try { environment.click(url, artifact.fileName); }
  catch (reason) { environment.revokeObjectURL(url); throw reason; }
  environment.setTimer(() => environment.revokeObjectURL(url), 30_000);
}
