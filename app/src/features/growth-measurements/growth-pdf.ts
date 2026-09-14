import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import {
  activeSchoolDocumentTemplate,
  schoolDocumentTemplateRecords,
  type SchoolDocumentTemplate,
} from "../../core/domain/school-document-template.ts";
import { turkishDocumentName } from "../../core/domain/turkish-document-display.ts";
import type { BrowserFileDownload } from "../documents/browser-file-download.ts";
import {
  A4_PDF_CANVAS_HEIGHT,
  A4_PDF_CANVAS_WIDTH,
  createSearchableImagePdf,
  jpegDataUrlBytes,
  type ImagePdfTextBox,
} from "../documents/canvas-image-pdf.ts";
import { TEACHER_DOCUMENT_THEME } from "../documents/document-theme.ts";
import {
  registerPdfPreviewRecipe,
  validatePdfSelection,
  type PdfPreviewRecipe,
} from "../documents/pdf-preview-model.ts";
import {
  type SemanticPdfNode,
  type SemanticTaggedPdfRuntime,
} from "../documents/semantic-tagged-pdf.ts";
import { createSchoolStyledPdf } from "../school-document-template/school-document-template-pdf.ts";
import { GROWTH_COPY } from "./growth-copy.ts";
import {
  buildGrowthWorkspace,
  growthChartPoints,
  growthChartSegments,
  type GrowthChartPoint,
  type GrowthWorkspaceModel,
} from "./growth-model.ts";
import { formatGrowthInteger } from "./growth-value.ts";

export type GrowthPdfTemplate = "individual" | "class" | "blank";

export interface GrowthPdfOptions {
  readonly template: GrowthPdfTemplate;
  readonly studentId?: string;
  readonly studentIds?: readonly string[];
  readonly scope?: ActiveClassroomScope;
  readonly generatedAt?: string;
  readonly explanation?: string;
  readonly periodKey?: string;
}

export interface GrowthPdfRuntime extends SemanticTaggedPdfRuntime {
  readonly createCanvas?: () => HTMLCanvasElement;
  readonly loadImage?: (dataUrl: string) => Promise<CanvasImageSource>;
}

const TEMPLATE_LABELS: Record<GrowthPdfTemplate, string> = {
  individual: "Bireysel boy–kilo belgesi",
  class: "Sınıf boy–kilo çizelgesi",
  blank: "Boş ölçüm çizelgesi",
};

function displayDate(value: string): string {
  return value.split("-").reverse().join(".");
}

function validGeneratedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error("PDF üretim zamanı UTC ISO-8601 biçiminde olmalıdır.");
  }
  return value;
}

function safeFileSegment(value: unknown): string {
  return (String(value ?? "").normalize("NFC").trim()
    .replace(/[\\/:*?"<>|]/gu, "-")
    .replace(/\s+/gu, "_").slice(0, 64) || "Belge");
}

interface GrowthPdfPeriodScope {
  readonly label: string;
  readonly fileSegment: string;
  readonly allYear: boolean;
}

function periodFileSegment(value: string): string {
  return safeFileSegment(value.normalize("NFD").replace(/\p{M}+/gu, ""));
}

function growthPdfExportWorkspace(
  workspace: GrowthWorkspaceModel,
  periodKey: string | undefined,
): { readonly workspace: GrowthWorkspaceModel; readonly period: GrowthPdfPeriodScope } {
  if (periodKey === undefined) {
    return { workspace, period: { label: "Tüm yıl", fileSegment: "Tum_Yil", allYear: true } };
  }
  const period = workspace.periods.find((candidate) => candidate.key === periodKey);
  if (!period) throw new Error("PDF baskı dönemi bu eğitim yılına ait değil.");
  return {
    workspace: {
      ...workspace,
      periods: [period],
      records: workspace.records.filter((record) => record.periodKey === period.key),
      states: workspace.states.filter((state) => state.period.key === period.key),
      statistics: workspace.statistics.filter((item) => item.period.key === period.key),
    },
    period: { label: period.label, fileSegment: periodFileSegment(period.label), allYear: false },
  };
}

function selectedStudents(
  workspace: GrowthWorkspaceModel,
  options: GrowthPdfOptions,
): StoredRecord[] {
  const ids = options.studentIds ?? (options.studentId ? [options.studentId] : workspace.students.map((student) => student.id));
  if (!ids.length || new Set(ids).size !== ids.length ||
    ids.some((id) => !workspace.students.some((student) => student.id === id))) {
    throw new Error("PDF için bu eğitim yılına ait en az bir geçerli çocuk seçin.");
  }
  return ids.map((id) => workspace.students.find((student) => student.id === id)!);
}

function canvas(
  runtime: GrowthPdfRuntime,
  width = A4_PDF_CANVAS_WIDTH,
  height = A4_PDF_CANVAS_HEIGHT,
): HTMLCanvasElement {
  const result = runtime.createCanvas?.() ?? (typeof document !== "undefined" ? document.createElement("canvas") : null);
  if (!result) throw new Error("Bireysel PDF grafikleri bu tarayıcıda çizilemedi.");
  result.width = width;
  result.height = height;
  return result;
}

const originalCanvasFillText = new WeakMap<object, CanvasRenderingContext2D["fillText"]>();

function captureCanvasText(
  context: CanvasRenderingContext2D,
  output: ImagePdfTextBox[],
): void {
  let draw = originalCanvasFillText.get(context);
  if (!draw) {
    draw = context.fillText.bind(context);
    originalCanvasFillText.set(context, draw);
  }
  const original = draw;
  context.fillText = ((value: string, x: number, y: number, maximumWidth?: number) => {
    const text = String(value);
    const measuredWidth = Number(context.measureText(text).width) || 1;
    const width = Math.max(1, maximumWidth === undefined
      ? measuredWidth
      : Math.min(maximumWidth, measuredWidth));
    const fontSize = Number(context.font.match(/([0-9]+(?:\.[0-9]+)?)px/u)?.[1] ?? 16);
    const left = context.textAlign === "center" ? x - width / 2
      : context.textAlign === "right" || context.textAlign === "end" ? x - width
        : x;
    output.push({
      text,
      x: left,
      y: y - fontSize,
      width,
      height: Math.max(1, fontSize * 1.25),
      fontSize,
    });
    if (maximumWidth === undefined) original(text, x, y);
    else original(text, x, y, maximumWidth);
  }) as CanvasRenderingContext2D["fillText"];
}

function explicitSchoolTemplate(
  snapshot: Pick<DataSnapshot, "settings">,
  scope: ActiveClassroomScope,
): SchoolDocumentTemplate | null {
  return schoolDocumentTemplateRecords(snapshot, scope).length
    ? activeSchoolDocumentTemplate(snapshot, scope)
    : null;
}

async function loadSchoolLogo(
  template: SchoolDocumentTemplate | null,
  runtime: GrowthPdfRuntime,
): Promise<CanvasImageSource | null> {
  if (!template?.logo) return null;
  if (runtime.loadImage) return runtime.loadImage(template.logo.dataUrl);
  if (typeof Image === "undefined") {
    throw new Error("Okul logosu bu ortamda bireysel PDF'ye yerleştirilemedi.");
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Okul logosu bireysel PDF için okunamadı."));
    image.src = template.logo!.dataUrl;
  });
}

function wrapLines(
  context: CanvasRenderingContext2D,
  value: string,
  maximumWidth: number,
): string[] {
  const words = value.trim().split(/\s+/u).flatMap((word) => {
    if (context.measureText(word).width <= maximumWidth) return [word];
    const pieces: string[] = [];
    let piece = "";
    for (const character of Array.from(word)) {
      const candidate = `${piece}${character}`;
      if (piece && context.measureText(candidate).width > maximumWidth) {
        pieces.push(piece);
        piece = character;
      } else {
        piece = candidate;
      }
    }
    if (piece) pieces.push(piece);
    return pieces;
  });
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > maximumWidth) {
      lines.push(line); line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawWrapped(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maximumWidth: number,
  lineHeight: number,
): number {
  const lines = wrapLines(context, value, maximumWidth);
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function drawSchoolBranding(
  context: CanvasRenderingContext2D,
  template: SchoolDocumentTemplate,
  logo: CanvasImageSource | null,
  startY: number,
  pageWidth: number,
  contentWidth: number,
): number {
  let y = startY;
  const centered = template.layout === "official";
  if (logo && template.logo) {
    const scale = Math.min(76 / template.logo.height, 132 / template.logo.width);
    const width = template.logo.width * scale;
    const height = template.logo.height * scale;
    context.drawImage(logo, centered ? (pageWidth - width) / 2 : 72, y, width, height);
    y += height + 28;
  }
  context.fillStyle = "#173f43";
  context.font = "700 20px Roboto, Arial, sans-serif";
  context.textAlign = centered ? "center" : "left";
  for (const line of template.headerLines) {
    y = drawWrapped(context, line, centered ? pageWidth / 2 : 72, y + 2, contentWidth, 26);
  }
  context.textAlign = "left";
  return y;
}

function schoolSignatureColumns(
  template: SchoolDocumentTemplate,
  teacherName: string,
): readonly { title: string; name: string }[] {
  const teacher = turkishDocumentName(teacherName) || "Adı Soyadı: ____________________";
  const principal = turkishDocumentName(template.principalName) || "Adı Soyadı: ____________________";
  const teacherLeft = template.signatureLayout !== "teacher-right";
  const twoSignatures = template.signatureLayout === "teacher-and-principal";
  return twoSignatures
    ? teacherLeft
      ? [{ title: "Okul Öncesi Öğretmeni", name: teacher }, { title: "Okul Müdürü", name: principal }]
      : [{ title: "Okul Müdürü", name: principal }, { title: "Okul Öncesi Öğretmeni", name: teacher }]
    : teacherLeft
      ? [{ title: "Okul Öncesi Öğretmeni", name: teacher }, { title: "Düzenleme tarihi", name: "____________________" }]
      : [{ title: "Düzenleme tarihi", name: "____________________" }, { title: "Okul Öncesi Öğretmeni", name: teacher }];
}

function schoolSignatureHeight(
  context: CanvasRenderingContext2D,
  template: SchoolDocumentTemplate | null,
  teacherName: string,
  contentWidth: number,
): number {
  if (!template) {
    context.font = "20px Roboto, Arial, sans-serif";
    return 36 + wrapLines(
      context,
      `Okul Öncesi Öğretmeni: ${teacherName || "________________"}`,
      contentWidth,
    ).length * 26;
  }
  context.font = "18px Roboto, Arial, sans-serif";
  const columnWidth = (contentWidth - 56) / 2;
  const lineCount = Math.max(...schoolSignatureColumns(template, teacherName)
    .map((column) => wrapLines(context, column.name, columnWidth).length));
  return 106 + lineCount * 24;
}

function drawSchoolSignature(
  context: CanvasRenderingContext2D,
  template: SchoolDocumentTemplate | null,
  teacherName: string,
  y: number,
  contentWidth: number,
): number {
  context.fillStyle = "#173f43";
  if (!template) {
    context.font = "20px Roboto, Arial, sans-serif";
    const end = drawWrapped(
      context,
      `Okul Öncesi Öğretmeni: ${teacherName || "________________"}`,
      72,
      y + 34,
      contentWidth,
      26,
    );
    return end + 2;
  }
  const columns = schoolSignatureColumns(template, teacherName);
  const columnWidth = (contentWidth - 56) / 2;
  context.font = "18px Roboto, Arial, sans-serif";
  const lineCount = Math.max(...columns.map((column) => wrapLines(context, column.name, columnWidth).length));
  columns.forEach((column, index) => {
    const x = index ? 72 + contentWidth / 2 + 28 : 72;
    context.font = "700 19px Roboto, Arial, sans-serif";
    context.fillText(column.title, x, y + 30);
    context.font = "18px Roboto, Arial, sans-serif";
    drawWrapped(context, column.name, x, y + 58, columnWidth, 24);
    context.fillText("İmza: ____________________", x, y + 76 + lineCount * 24);
  });
  return y + 106 + lineCount * 24;
}

function drawChart(
  context: CanvasRenderingContext2D,
  title: string,
  metric: "height" | "weight",
  points: readonly GrowthChartPoint[],
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.fillStyle = "#f7faf9";
  context.strokeStyle = "#bed2cd";
  context.lineWidth = 2;
  context.beginPath(); context.roundRect(x, y, width, height, 18); context.fill(); context.stroke();
  context.fillStyle = "#173f43"; context.font = "700 28px Roboto, Arial, sans-serif";
  context.fillText(title, x + 24, y + 40);
  const plot = { left: x + 76, right: x + width - 32, top: y + 78, bottom: y + height - 62 };
  context.strokeStyle = "#8da9a4"; context.lineWidth = 2;
  context.beginPath(); context.moveTo(plot.left, plot.top); context.lineTo(plot.left, plot.bottom); context.lineTo(plot.right, plot.bottom); context.stroke();
  const valid = points.filter((point) => point.integerValue !== null && point.measuredOn !== null);
  if (!valid.length) {
    context.fillStyle = "#62787c"; context.font = "24px Roboto, Arial, sans-serif";
    context.fillText("Henüz ölçüm yok", plot.left + 24, plot.top + 70);
    return;
  }
  const values = valid.map((point) => point.integerValue!);
  const times = valid.map((point) => Date.parse(`${point.measuredOn}T00:00:00.000Z`));
  const minimum = Math.min(...values), maximum = Math.max(...values);
  const minTime = Math.min(...times), maxTime = Math.max(...times);
  const px = (point: GrowthChartPoint) => minTime === maxTime ? (plot.left + plot.right) / 2
    : plot.left + ((Date.parse(`${point.measuredOn}T00:00:00.000Z`) - minTime) / (maxTime - minTime)) * (plot.right - plot.left);
  const py = (point: GrowthChartPoint) => minimum === maximum ? (plot.top + plot.bottom) / 2
    : plot.bottom - ((point.integerValue! - minimum) / (maximum - minimum)) * (plot.bottom - plot.top);
  context.strokeStyle = "#087873"; context.lineWidth = 6; context.lineJoin = "round"; context.lineCap = "round";
  for (const segment of growthChartSegments(points)) {
    if (segment.length < 2) continue;
    context.beginPath(); segment.forEach((point, index) => index ? context.lineTo(px(point), py(point)) : context.moveTo(px(point), py(point))); context.stroke();
  }
  for (const point of valid) {
    context.fillStyle = "#fff"; context.strokeStyle = "#087873"; context.lineWidth = 5;
    context.beginPath(); context.arc(px(point), py(point), 9, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = "#173f43"; context.font = "700 20px Roboto, Arial, sans-serif"; context.textAlign = "center";
    context.fillText(formatGrowthInteger(point.integerValue!, metric), px(point), py(point) - 18);
    context.font = "18px Roboto, Arial, sans-serif"; context.fillStyle = "#60777a";
    context.fillText(displayDate(point.measuredOn!), px(point), plot.bottom + 30);
  }
  context.textAlign = "left";
}

async function individualPdf(
  workspace: GrowthWorkspaceModel,
  student: StoredRecord,
  generatedAt: string,
  explanation: string,
  periodScope: GrowthPdfPeriodScope,
  schoolTemplate: SchoolDocumentTemplate | null,
  runtime: GrowthPdfRuntime,
): Promise<BrowserFileDownload> {
  const states = workspace.states.filter((state) => state.student.id === student.id);
  const schoolLogo = await loadSchoolLogo(schoolTemplate, runtime);
  const landscape = schoolTemplate?.orientation === "landscape";
  const pageWidth = landscape ? A4_PDF_CANVAS_HEIGHT : A4_PDF_CANVAS_WIDTH;
  const pageHeight = landscape ? A4_PDF_CANVAS_WIDTH : A4_PDF_CANVAS_HEIGHT;
  const contentWidth = pageWidth - 144;
  const pages: {
    readonly page: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;
    readonly text: ImagePdfTextBox[];
  }[] = [];
  const addPage = () => {
    const page = canvas(runtime, pageWidth, pageHeight);
    const context = page.getContext("2d");
    if (!context) throw new Error("Bireysel PDF sayfası çizilemedi.");
    const text: ImagePdfTextBox[] = [];
    captureCanvasText(context, text);
    context.fillStyle = "#fff"; context.fillRect(0, 0, page.width, page.height);
    context.fillStyle = "#0d7773"; context.fillRect(0, 0, page.width, 18);
    const result = { page, context, text };
    pages.push(result);
    return result;
  };
  const firstHeader = (context: CanvasRenderingContext2D) => {
    let titleY = 88;
    if (schoolTemplate) titleY = Math.max(titleY, drawSchoolBranding(context, schoolTemplate, schoolLogo, 40, pageWidth, contentWidth) + 40);
    context.fillStyle = "#173f43"; context.font = "800 42px Roboto, Arial, sans-serif";
    let y = drawWrapped(context, `BİREYSEL BOY–KİLO BELGESİ · ${periodScope.label.toLocaleUpperCase("tr-TR")}`, 72, titleY, contentWidth, 48);
    context.font = "700 30px Roboto, Arial, sans-serif";
    y = drawWrapped(context, String(student.displayName ?? "İsimsiz öğrenci"), 72, y + 4, contentWidth, 38);
    context.fillStyle = "#60777a"; context.font = "22px Roboto, Arial, sans-serif";
    y = drawWrapped(context, `${String(workspace.classroom.schoolName ?? "Okul bilgisi yok")} · ${String(workspace.classroom.name ?? "Sınıf")}`, 72, y + 4, contentWidth, 29);
    return drawWrapped(context, `${String(workspace.academicYear.name ?? "Eğitim yılı")} · Kapsam: ${periodScope.label} · Üretim: ${displayDate(generatedAt.slice(0, 10))}`, 72, y + 2, contentWidth, 29);
  };
  const continuationHeader = (context: CanvasRenderingContext2D) => {
    let titleY = 72;
    if (schoolTemplate) titleY = Math.max(titleY, drawSchoolBranding(context, schoolTemplate, schoolLogo, 34, pageWidth, contentWidth) + 32);
    context.fillStyle = "#173f43"; context.font = "800 31px Roboto, Arial, sans-serif";
    let y = drawWrapped(context, `BİREYSEL BOY–KİLO BELGESİ · ${periodScope.label.toLocaleUpperCase("tr-TR")} · DEVAM`, 72, titleY, contentWidth, 37);
    context.font = "700 25px Roboto, Arial, sans-serif";
    y = drawWrapped(context, String(student.displayName ?? "İsimsiz öğrenci"), 72, y + 2, contentWidth, 32);
    context.fillStyle = "#60777a"; context.font = "19px Roboto, Arial, sans-serif";
    return drawWrapped(context, `${String(workspace.classroom.name ?? "Sınıf")} · ${String(workspace.academicYear.name ?? "Eğitim yılı")} · ${periodScope.label}`, 72, y + 2, contentWidth, 25);
  };
  const detailHeight = (context: CanvasRenderingContext2D) => {
    context.font = "700 19px Roboto, Arial, sans-serif";
    const explanationLines = explanation
      ? wrapLines(context, `Öğretmen açıklaması: ${explanation}`, contentWidth).length
      : 0;
    context.font = "19px Roboto, Arial, sans-serif";
    const noticeLines = wrapLines(context, GROWTH_COPY.nonMedicalNotice, contentWidth).length;
    return 32 + states.length * 72 + explanationLines * 26 + noticeLines * 26 +
      schoolSignatureHeight(context, schoolTemplate, String(workspace.classroom.teacherName ?? ""), contentWidth) + 30;
  };
  const drawDetails = (context: CanvasRenderingContext2D, startY: number) => {
    let y = startY;
    context.fillStyle = "#173f43"; context.font = "800 26px Roboto, Arial, sans-serif";
    context.fillText(periodScope.allYear ? "Dört dönem kaydı" : `${periodScope.label} kaydı`, 72, y); y += 32;
    context.font = "700 19px Roboto, Arial, sans-serif";
    for (const state of states) {
      context.fillStyle = "#f1f7f5"; context.fillRect(72, y, contentWidth, 64);
      context.fillStyle = "#173f43"; context.fillText(state.period.label, 88, y + 26);
      context.font = "18px Roboto, Arial, sans-serif";
      const height = state.height.selected;
      const weight = state.weight.selected;
      context.fillText(height ? `Boy ${formatGrowthInteger(height.integerValue, "height")} · ${displayDate(height.measuredOn)} · ${GROWTH_COPY.sources[height.source]}` : "Boy ölçülmedi", 310, y + 26);
      context.fillText(weight ? `Kilo ${formatGrowthInteger(weight.integerValue, "weight")} · ${displayDate(weight.measuredOn)} · ${GROWTH_COPY.sources[weight.source]}` : "Kilo ölçülmedi", 310, y + 51);
      context.font = "700 19px Roboto, Arial, sans-serif"; y += 72;
    }
    if (explanation) {
      context.fillStyle = "#173f43"; context.font = "700 19px Roboto, Arial, sans-serif";
      y = drawWrapped(context, `Öğretmen açıklaması: ${explanation}`, 72, y + 12, contentWidth, 26);
    }
    context.fillStyle = "#72531a"; context.font = "19px Roboto, Arial, sans-serif";
    y = drawWrapped(context, GROWTH_COPY.nonMedicalNotice, 72, y + 18, contentWidth, 26);
    drawSchoolSignature(
      context,
      schoolTemplate,
      String(workspace.classroom.teacherName ?? ""),
      schoolTemplate ? y + 6 : y,
      contentWidth,
    );
  };

  let current = addPage();
  let chartY = firstHeader(current.context) + 28;
  const chartHeight = 400;
  if (chartY + chartHeight > current.page.height - 54) {
    current = addPage();
    chartY = continuationHeader(current.context) + 28;
  }
  drawChart(current.context, "Boy (cm) · gerçek tarihler", "height", growthChartPoints(workspace, student.id, "height"), 72, chartY, contentWidth, chartHeight);
  chartY += chartHeight + 30;
  if (chartY + chartHeight > current.page.height - 54) {
    current = addPage();
    chartY = continuationHeader(current.context) + 28;
  }
  drawChart(current.context, "Kilo (kg) · gerçek tarihler", "weight", growthChartPoints(workspace, student.id, "weight"), 72, chartY, contentWidth, chartHeight);
  let detailsY = chartY + chartHeight + 48;
  if (detailsY + detailHeight(current.context) > current.page.height - 28) {
    current = addPage();
    detailsY = continuationHeader(current.context) + 32;
  }
  drawDetails(current.context, detailsY);
  const bytes = await createSearchableImagePdf(pages.map(({ page, text }) => ({
    image: jpegDataUrlBytes(page.toDataURL("image/jpeg", 0.96)),
    width: page.width,
    height: page.height,
    text,
  })), {
    title: `MaarifOS Bireysel Boy-Kilo Belgesi · ${periodScope.label}`,
    creator: "MaarifOS",
    orientation: landscape ? "landscape" : "portrait",
  }, runtime);
  return {
    fileName: `MaarifOS_Bireysel_Boy_Kilo_${safeFileSegment(student.displayName)}_${safeFileSegment(workspace.academicYear.name)}_${periodScope.fileSegment}.pdf`,
    mimeType: "application/pdf",
    bytes,
  };
}

function classRows(
  workspace: GrowthWorkspaceModel,
  students: readonly StoredRecord[],
  blank: boolean,
): string[][] {
  return students.map((student, index) => [
    String(index + 1),
    String(student.displayName ?? "İsimsiz öğrenci"),
    ...workspace.periods.flatMap((period) => {
      const state = workspace.states.find((candidate) => candidate.student.id === student.id && candidate.period.key === period.key);
      if (blank) return ["", "", "", ""];
      return [
        state?.height.selected ? formatGrowthInteger(state.height.selected.integerValue, "height", { withUnit: false }) : "",
        state?.height.selected ? displayDate(state.height.selected.measuredOn) : "",
        state?.weight.selected ? formatGrowthInteger(state.weight.selected.integerValue, "weight", { withUnit: false }) : "",
        state?.weight.selected ? displayDate(state.weight.selected.measuredOn) : "",
      ];
    }),
  ]);
}

function portraitClassRows(
  workspace: GrowthWorkspaceModel,
  students: readonly StoredRecord[],
  blank: boolean,
): string[][] {
  return students.flatMap((student, index) => workspace.periods.map((period) => {
    const state = workspace.states.find((candidate) =>
      candidate.student.id === student.id && candidate.period.key === period.key);
    return [
      String(index + 1),
      String(student.displayName ?? "İsimsiz öğrenci"),
      period.label,
      blank || !state?.height.selected
        ? ""
        : formatGrowthInteger(state.height.selected.integerValue, "height", { withUnit: false }),
      blank ? "" : state?.height.selected ? displayDate(state.height.selected.measuredOn) : "",
      blank || !state?.weight.selected
        ? ""
        : formatGrowthInteger(state.weight.selected.integerValue, "weight", { withUnit: false }),
      blank ? "" : state?.weight.selected ? displayDate(state.weight.selected.measuredOn) : "",
    ];
  }));
}

async function classPdf(
  workspace: GrowthWorkspaceModel,
  students: readonly StoredRecord[],
  blank: boolean,
  generatedAt: string,
  periodScope: GrowthPdfPeriodScope,
  schoolTemplate: SchoolDocumentTemplate | null,
  runtime: GrowthPdfRuntime,
): Promise<BrowserFileDownload> {
  const baseTitle = blank ? "BOŞ BOY–KİLO ÖLÇÜM ÇİZELGESİ" : "SINIF BOY–KİLO ÇİZELGESİ";
  const title = `${baseTitle} · ${periodScope.label.toLocaleUpperCase("tr-TR")}`;
  const portrait = schoolTemplate?.orientation === "portrait";
  const headers = portrait
    ? ["Sıra", "Öğrenci", "Dönem", "Boy (cm)", "Boy tarihi", "Kilo (kg)", "Kilo tarihi"]
    : ["Sıra", "Öğrenci", ...workspace.periods.flatMap((period) => [
      `${period.label}\nBoy cm`, "Tarih", `${period.label}\nKilo kg`, "Tarih",
    ])];
  const rows = portrait
    ? portraitClassRows(workspace, students, blank)
    : classRows(workspace, students, blank);
  const nodes: SemanticPdfNode[] = [
    { kind: "heading", level: 1, text: title },
    { kind: "paragraph", tone: "meta", text: `${String(workspace.classroom.schoolName ?? "Okul bilgisi yok")} · ${String(workspace.classroom.name ?? "Sınıf")} · ${String(workspace.academicYear.name ?? "Eğitim yılı")}` },
    { kind: "paragraph", tone: "meta", text: `Okul Öncesi Öğretmeni: ${String(workspace.classroom.teacherName ?? "________________")} · Üretim: ${displayDate(generatedAt.slice(0, 10))}` },
    { kind: "table", summary: `${title}; her boy ve kilo değerinin gerçek tarihi ayrı sütundadır.`, headers, rows,
      columnWeights: portrait ? [0.45, 1.8, 1.15, 0.75, 1.1, 0.75, 1.1] : [0.45, 1.8, ...workspace.periods.flatMap(() => [0.65, 1.1, 0.65, 1.1])],
      fontSize: portrait ? 9 : 8, cellPadding: portrait ? 4 : 3, rowHeaderColumn: 1, rowGroupColumn: 0,
      continuationContextColumns: [0, 1], preserveContinuationContext: true, balancePages: true, reserveAfter: 55 },
    { kind: "paragraph", tone: "meta", text: blank ? "Ölçümler gerçek tarihlerle elle kaydedilir; boş alan sıfır anlamına gelmez." : GROWTH_COPY.classAverageNotice },
    { kind: "paragraph", tone: "meta", text: GROWTH_COPY.nonMedicalNotice },
    ...(!schoolTemplate ? [{ kind: "paragraph" as const, text: `Okul Öncesi Öğretmeni: ${String(workspace.classroom.teacherName ?? "________________")}     İmza: ____________________` }] : []),
  ];
  const bytes = await createSchoolStyledPdf({
    title: `MaarifOS ${blank ? "Boş Boy-Kilo Ölçüm Çizelgesi" : "Sınıf Boy-Kilo Çizelgesi"} · ${periodScope.label}`,
    creator: "MaarifOS",
    language: "tr-TR",
    theme: TEACHER_DOCUMENT_THEME,
    orientation: "landscape",
    pageMargin: 28,
    artifactHeaderText: `${String(workspace.classroom.schoolName ?? "Okul bilgisi yok")} · ${String(workspace.classroom.name ?? "Sınıf")} · ${String(workspace.academicYear.name ?? "Eğitim yılı")} · ${title}`,
    artifactHeaderOnFirstPage: false,
    includeTotalPages: true,
    artifactFooterText: `Okul Öncesi Öğretmeni · Üretim ${displayDate(generatedAt.slice(0, 10))}`,
    nodes,
  }, schoolTemplate, { teacherName: String(workspace.classroom.teacherName ?? "") }, runtime);
  return {
    fileName: `MaarifOS_${blank ? "Bos" : "Sinif"}_Boy_Kilo_${safeFileSegment(workspace.classroom.name)}_${safeFileSegment(workspace.academicYear.name)}_${periodScope.fileSegment}.pdf`,
    mimeType: "application/pdf",
    bytes,
  };
}

async function createGrowthPdfInternal(
  snapshot: DataSnapshot,
  today: string,
  options: GrowthPdfOptions,
  runtime: GrowthPdfRuntime,
): Promise<{ file: BrowserFileDownload; workspace: GrowthWorkspaceModel; students: StoredRecord[]; generatedAt: string }> {
  const generatedAt = validGeneratedAt(options.generatedAt ?? new Date().toISOString());
  const explanation = options.explanation?.normalize("NFC").trim() ?? "";
  if (explanation.length > 320) {
    throw new Error("Bireysel belge açıklaması en fazla 320 karakter olmalıdır.");
  }
  const fullWorkspace = buildGrowthWorkspace(snapshot, today, options.scope);
  const exportScope = growthPdfExportWorkspace(fullWorkspace, options.periodKey);
  const workspace = exportScope.workspace;
  const students = selectedStudents(workspace, options);
  const schoolTemplate = explicitSchoolTemplate(snapshot, workspace.scope);
  const file = options.template === "individual"
    ? await individualPdf(workspace, students[0]!, generatedAt, explanation, exportScope.period, schoolTemplate, runtime)
    : await classPdf(workspace, students, options.template === "blank", generatedAt, exportScope.period, schoolTemplate, runtime);
  return { file, workspace, students, generatedAt };
}

/** Generates real PDF bytes and binds the same source to the shared preview editor. */
export async function createGrowthPdfDocument(
  snapshot: DataSnapshot,
  today: string,
  options: GrowthPdfOptions,
  runtime: GrowthPdfRuntime = {},
): Promise<BrowserFileDownload> {
  const frozen = structuredClone(snapshot);
  const initial = await createGrowthPdfInternal(frozen, today, options, runtime);
  const recipe: PdfPreviewRecipe = {
    title: `${TEMPLATE_LABELS[options.template]} · ${options.periodKey ? initial.workspace.periods[0]!.label : "Tüm yıl"}`,
    description: `Şablon ve öğrenci kapsamını değiştirerek ${options.periodKey ? initial.workspace.periods[0]!.label : "tüm yıl"} için gerçek PDF sayfalarını yeniden üretin. Boş ölçüm sıfır değildir.`,
    fields: [{ id: "measurements", label: "Tarihli boy-kilo kayıtları" }],
    templates: [
      { id: "individual", label: TEMPLATE_LABELS.individual },
      { id: "class", label: TEMPLATE_LABELS.class },
      { id: "blank", label: TEMPLATE_LABELS.blank },
    ],
    students: initial.workspace.students.map((student) => ({ id: student.id, label: String(student.displayName ?? "İsimsiz öğrenci") })),
    initial: {
      fields: ["measurements"],
      template: options.template,
      studentIds: initial.students.map((student) => student.id),
    },
    async build(selection) {
      validatePdfSelection(recipe, selection);
      const template = selection.template as GrowthPdfTemplate;
      const ids = selection.studentIds!;
      if (template === "individual" && ids.length !== 1) {
        throw new Error("Bireysel belge için yalnız bir çocuk seçin.");
      }
      return (await createGrowthPdfInternal(frozen, today, {
        template,
        studentIds: ids,
        scope: options.scope,
        generatedAt: initial.generatedAt,
        explanation: options.explanation,
        periodKey: options.periodKey,
      }, runtime)).file;
    },
  };
  registerPdfPreviewRecipe(initial.file.bytes, recipe);
  return initial.file;
}
