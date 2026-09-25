import * as XLSX from "xlsx";
import { isCivilDate } from "../../core/domain/attendance.ts";
import type {
  GrowthMeasurementMetric,
  GrowthMeasurementSource,
  GrowthMeasurementUnit,
  GrowthMeasurementValueRecord,
} from "../../core/domain/growth-measurements.ts";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import { resolveStudentMembershipOn } from "../../core/domain/student-membership.ts";
import {
  saveGrowthMeasurementBatch,
  type SaveGrowthMeasurementInput,
  type SavedGrowthMeasurement,
} from "./growth-measurement-service.ts";
import {
  buildGrowthWorkspace,
  growthMembershipForPeriod,
  type GrowthWorkspaceModel,
} from "./growth-model.ts";
import { GROWTH_COPY } from "./growth-copy.ts";
import {
  formatGrowthInteger,
  parseGrowthDisplayValue,
  parseGrowthStoredValue,
} from "./growth-value.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { DOCUMENT_COLORS } from "../documents/document-theme.ts";

export const GROWTH_XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;
export const GROWTH_IMPORT_LIMITS = Object.freeze({
  bytes: 10 * 1024 * 1024,
  rows: 1_000,
  columns: 40,
  sheets: 20,
});

export const GROWTH_DATA_HEADERS = [
  "Kayıt kimliği",
  "Öğrenci anahtarı",
  "Öğrenci adı",
  "Eğitim yılı anahtarı",
  "Sınıf anahtarı",
  "Dönem (YYYY-AA)",
  "Ölçüm türü",
  "Değer",
  "Birim",
  "Gerçek ölçüm tarihi",
  "Kaynak",
  "Kayıt durumu",
  "Oluşturma UTC",
  "Düzeltme kaynağı",
  "Tekrar kaynağı",
] as const;

export interface GrowthSpreadsheetFile {
  readonly fileName: string;
  readonly mimeType: typeof GROWTH_XLSX_MIME_TYPE;
  readonly bytes: Uint8Array;
  readonly dataRows: readonly (readonly string[])[];
  readonly printRows: readonly (readonly string[])[];
  readonly selection: GrowthSpreadsheetSelection;
}

export type GrowthSpreadsheetSelection =
  | { readonly mode: "class"; readonly periodKey?: string }
  | { readonly mode: "individual"; readonly studentId: string; readonly periodKey?: string };

type WorksheetValue = string | number | null;

const GROWTH_PRINT_HEADERS = [
  "Sıra",
  "Öğrenci",
  "Dönem",
  "Boy",
  "Boy tarihi",
  "Kilo",
  "Kilo tarihi",
] as const;

export const GROWTH_PRINT_HEADER_ROW = 4 as const;
export const GROWTH_PRINT_DATA_START_ROW = GROWTH_PRINT_HEADER_ROW + 1;

const GROWTH_STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="dd&quot;.&quot;mm&quot;.&quot;yyyy"/>
    <numFmt numFmtId="165" formatCode="0.0 &quot;cm&quot;"/>
    <numFmt numFmtId="166" formatCode="0.000 &quot;kg&quot;"/>
  </numFmts>
  <fonts count="4">
    <font><sz val="10"/><color rgb="FF${DOCUMENT_COLORS.ink}"/><name val="Roboto"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF${DOCUMENT_COLORS.ink}"/><name val="Roboto"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Roboto"/><family val="2"/></font>
    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Roboto"/><family val="2"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.ink}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.detail}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.tealTint}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.blueTint}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.coralTint}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.yellowTint}"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FF${DOCUMENT_COLORS.border}"/></left><right style="thin"><color rgb="FF${DOCUMENT_COLORS.border}"/></right><top style="thin"><color rgb="FF${DOCUMENT_COLORS.border}"/></top><bottom style="thin"><color rgb="FF${DOCUMENT_COLORS.border}"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="24">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleMedium4"/>
</styleSheet>`;

const sourceLabel = GROWTH_COPY.sources;
const metricLabel = GROWTH_COPY.metrics;

function safeFileSegment(value: unknown): string {
  return (String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/[\\/:*?"<>|]/gu, "-")
    .replace(/\s+/gu, "_")
    .slice(0, 64) || "Sinif");
}

function periodFileSegment(value: string): string {
  return safeFileSegment(value.normalize("NFD").replace(/\p{M}+/gu, ""));
}

function growthExportWorkspace(
  workspace: GrowthWorkspaceModel,
  periodKey: string | undefined,
): { readonly workspace: GrowthWorkspaceModel; readonly label: string; readonly fileSegment: string } {
  if (periodKey === undefined) {
    return { workspace, label: "Tüm yıl", fileSegment: "Tum_Yil" };
  }
  const period = workspace.periods.find((candidate) => candidate.key === periodKey);
  if (!period) throw new Error("XLSX baskı dönemi bu eğitim yılına ait değil.");
  return {
    workspace: {
      ...workspace,
      periods: [period],
      records: workspace.records.filter((record) => record.periodKey === period.key),
      states: workspace.states.filter((state) => state.period.key === period.key),
      statistics: workspace.statistics.filter((item) => item.period.key === period.key),
    },
    label: period.label,
    fileSegment: periodFileSegment(period.label),
  };
}

function civilDateSerial(value: string): number {
  if (!isCivilDate(value)) throw new Error(`Excel tarih hücresi için geçersiz gün: ${value}`);
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year!, month! - 1, day!) / 86_400_000 + 25_569;
}

function selectedStudentIds(
  workspace: GrowthWorkspaceModel,
  selection: GrowthSpreadsheetSelection,
): ReadonlySet<string> {
  if (selection.mode === "class") {
    return new Set(workspace.students.map((student) => student.id));
  }
  if (!workspace.students.some((student) => student.id === selection.studentId)) {
    throw new Error("XLSX için seçilen çocuk açık sınıf ve eğitim yılı kapsamında değil.");
  }
  return new Set([selection.studentId]);
}

function dataRows(
  workspace: GrowthWorkspaceModel,
  studentIds: ReadonlySet<string>,
): { readonly display: string[][]; readonly worksheet: WorksheetValue[][] } {
  const students = new Map(workspace.students.map((student) => [student.id, student]));
  const selectedRecordIds = new Set(workspace.states.flatMap((state) => [
    state.height.selected?.id,
    state.weight.selected?.id,
  ].filter((id): id is string => Boolean(id))));
  const records = workspace.records
    .filter((record): record is GrowthMeasurementValueRecord =>
      record.eventKind !== "selection" && studentIds.has(record.studentId))
    .sort((left, right) =>
      left.studentId.localeCompare(right.studentId) ||
      left.periodKey.localeCompare(right.periodKey) ||
      left.metric.localeCompare(right.metric) ||
      left.createdAt.localeCompare(right.createdAt));
  const display = records.map((record) => [
      record.id,
      record.studentId,
      String(students.get(record.studentId)?.displayName ?? "Kayıt bulunamadı"),
      record.academicYearId,
      record.classroomId,
      record.periodKey,
      metricLabel[record.metric],
      String(record.integerValue),
      record.unit,
      record.measuredOn,
      sourceLabel[record.source],
      selectedRecordIds.has(record.id)
        ? record.eventKind === "correction" ? "Geçerli düzeltme" : "Geçerli"
        : record.eventKind === "correction" ? "Geçmiş düzeltme" : "Geçmiş ölçüm",
      record.createdAt,
      record.correctsId ?? "",
      record.repeatOfId ?? "",
    ]);
  const worksheet = records.map((record) => [
    record.id,
    record.studentId,
    String(students.get(record.studentId)?.displayName ?? "Kayıt bulunamadı"),
    record.academicYearId,
    record.classroomId,
    record.periodKey,
    metricLabel[record.metric],
    record.integerValue,
    record.unit,
    civilDateSerial(record.measuredOn),
    sourceLabel[record.source],
    selectedRecordIds.has(record.id)
      ? record.eventKind === "correction" ? "Geçerli düzeltme" : "Geçerli"
      : record.eventKind === "correction" ? "Geçmiş düzeltme" : "Geçmiş ölçüm",
    record.createdAt,
    record.correctsId ?? null,
    record.repeatOfId ?? null,
  ]);
  return { display, worksheet };
}

function printRows(
  workspace: GrowthWorkspaceModel,
  studentIds: ReadonlySet<string>,
  selection: GrowthSpreadsheetSelection,
  today: string,
): {
  readonly display: string[][];
  readonly worksheet: WorksheetValue[][];
  readonly rowHeights: readonly number[];
  readonly dataEndRow: number;
  readonly signatureRow: number;
  readonly pageBreaks: readonly number[];
} {
  const students = workspace.students.filter((student) => studentIds.has(student.id));
  const title = selection.mode === "individual"
    ? "BİREYSEL BOY–KİLO ÖLÇÜM ÇİZELGESİ"
    : "SINIF BOY–KİLO ÖLÇÜM ÇİZELGESİ";
  const periodLabel = selection.periodKey === undefined
    ? "Tüm yıl"
    : workspace.periods[0]?.label ?? "Seçili dönem";
  const schoolName = String(workspace.classroom.schoolName ?? "").trim() || "Okul bilgisi yok";
  const classroomName = String(workspace.classroom.name ?? "").trim() || "Sınıf bilgisi yok";
  const academicYearName = String(workspace.academicYear.name ?? "").trim() || "Eğitim yılı bilgisi yok";
  const teacherName = String(workspace.classroom.teacherName ?? "").trim() || "____________________";
  const context = `Sınıf: ${classroomName} · Eğitim yılı: ${academicYearName} · Kapsam: ${periodLabel}`;
  const fullWidthRow = (value: string): string[] => [value, "", "", "", "", "", ""];
  const metadataHeight = (value: string, charactersPerLine: number): number => {
    const lineCount = Math.max(1, Math.ceil(Array.from(value).length / charactersPerLine));
    return Math.min(96, Math.max(28, lineCount * 16 + 8));
  };
  const display: string[][] = [
    fullWidthRow(`${title} · ${periodLabel.toLocaleUpperCase("tr-TR")}`),
    fullWidthRow(schoolName),
    fullWidthRow(context),
    [...GROWTH_PRINT_HEADERS],
  ];
  const worksheet: WorksheetValue[][] = display.map((row) => [...row]);
  const rowHeights = [
    38,
    metadataHeight(schoolName, 86),
    metadataHeight(context, 86),
    34,
  ];
  students.forEach((student, index) => {
    const states = workspace.states.filter((state) => state.student.id === student.id);
    const name = String(student.displayName ?? "İsimsiz öğrenci");
    const nameLines = Math.max(1, Math.ceil(Array.from(name).length / 28));
    workspace.periods.forEach((period) => {
      const state = states.find((candidate) => candidate.period.key === period.key);
      display.push([
        String(index + 1),
        name,
        period.label,
        state?.height.selected ? formatGrowthInteger(state.height.selected.integerValue, "height") : "",
        state?.height.selected?.measuredOn ?? "",
        state?.weight.selected ? formatGrowthInteger(state.weight.selected.integerValue, "weight") : "",
        state?.weight.selected?.measuredOn ?? "",
      ]);
      worksheet.push([
        index + 1,
        name,
        period.label,
        state?.height.selected ? state.height.selected.integerValue / 10 : null,
        state?.height.selected ? civilDateSerial(state.height.selected.measuredOn) : null,
        state?.weight.selected ? state.weight.selected.integerValue / 1_000 : null,
        state?.weight.selected ? civilDateSerial(state.weight.selected.measuredOn) : null,
      ]);
      rowHeights.push(Math.min(78, Math.max(22, nameLines * 15 + 6)));
    });
  });
  const dataEndRow = worksheet.length;
  display.push(fullWidthRow(""));
  worksheet.push(fullWidthRow(""));
  rowHeights.push(10);
  const signature = [
    `Okul Öncesi Öğretmeni: ${teacherName}`, "", "",
    `Tarih: ${today.split("-").reverse().join(".")}`, "",
    "İmza: ____________________", "",
  ];
  display.push(signature);
  worksheet.push([...signature]);
  rowHeights.push(metadataHeight(signature[0]!, 42));
  // A4 landscape at 100%: keep a child's selected periods together and leave space for the signature.
  const available = 595.276 - 72 - rowHeights.slice(0, GROWTH_PRINT_HEADER_ROW).reduce((sum, height) => sum + height, 0)
    - rowHeights.slice(dataEndRow).reduce((sum, height) => sum + height, 0);
  const pageBreaks: number[] = [];
  let used = 0;
  for (let index = GROWTH_PRINT_HEADER_ROW; index < dataEndRow; index += workspace.periods.length) {
    const height = rowHeights.slice(index, index + workspace.periods.length).reduce((sum, value) => sum + value, 0);
    if (used > 0 && used + height > available) { pageBreaks.push(index); used = 0; }
    used += height;
  }
  return { display, worksheet, rowHeights, dataEndRow, signatureRow: worksheet.length, pageBreaks };
}

function workbookBytes(value: unknown): Uint8Array {
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (value instanceof Uint8Array) {
    return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  }
  throw new Error("Boy-kilo XLSX baytları üretilemedi.");
}

function zipTextFile(archive: unknown, path: string): string {
  const entry = XLSX.CFB.find(archive, `Root Entry/${path}`);
  if (!entry?.content) throw new Error(`XLSX paketinde ${path} bulunamadı.`);
  return new TextDecoder("utf-8").decode(entry.content);
}

function replaceZipTextFile(archive: unknown, path: string, content: string): void {
  const entry = XLSX.CFB.find(archive, `Root Entry/${path}`);
  if (!entry?.content) throw new Error(`XLSX paketinde ${path} bulunamadı.`);
  entry.content = new TextEncoder().encode(content);
  entry.size = entry.content.byteLength;
}

function columnIndex(letters: string): number {
  return letters.split("").reduce(
    (value, character) => value * 26 + character.charCodeAt(0) - 64,
    0,
  ) - 1;
}

function styleDataSheet(xml: string): string {
  return xml.replace(/<c\b([^>]*)>/gu, (tag, attributes: string) => {
    const address = attributes.match(/\br="([A-Z]+)([0-9]+)"/u);
    if (!address) return tag;
    const row = Number(address[2]);
    const column = columnIndex(address[1]!);
    const alternate = row > 1 && row % 2 === 1;
    const style = row === 1 ? 1
      : column === 7 ? alternate ? 5 : 4
        : column === 9 ? alternate ? 7 : 6
          : alternate ? 3 : 2;
    return `<c${attributes.replace(/\s+s="[0-9]+"/gu, "")} s="${style}">`;
  });
}

function stylePrintSheet(xml: string, periodCount: number, rowCount: number): string {
  return xml.replace(/<c\b([^>]*)>/gu, (tag, attributes: string) => {
    const address = attributes.match(/\br="([A-Z]+)([0-9]+)"/u);
    if (!address) return tag;
    const row = Number(address[2]);
    const column = columnIndex(address[1]!);
    if (row === 1 || row === GROWTH_PRINT_HEADER_ROW) {
      return `<c${attributes.replace(/\s+s="[0-9]+"/gu, "")} s="${row === 1 ? 23 : 8}">`;
    }
    if (row === 2 || row === 3) {
      return `<c${attributes.replace(/\s+s="[0-9]+"/gu, "")} s="${row === 2 ? 13 : 14}">`;
    }
    if (row === rowCount) {
      const signatureStyle = column <= 2 ? 13 : column <= 4 ? 14 : 15;
      return `<c${attributes.replace(/\s+s="[0-9]+"/gu, "")} s="${signatureStyle}">`;
    }
    if (row < GROWTH_PRINT_DATA_START_ROW || row > rowCount - 2) {
      return `<c${attributes.replace(/\s+s="[0-9]+"/gu, "")} s="0">`;
    }
    const studentIndex = Math.floor((row - GROWTH_PRINT_DATA_START_ROW) / Math.max(1, periodCount));
    const periodIndex = (row - GROWTH_PRINT_DATA_START_ROW) % Math.max(1, periodCount);
    const alternate = studentIndex % 2 === 1;
    const style = column === 0 ? alternate ? 10 : 9
      : column === 1 ? alternate ? 12 : 11
        : column === 2 ? 13 + Math.min(3, periodIndex)
          : column === 3 ? alternate ? 18 : 17
            : column === 5 ? alternate ? 20 : 19
              : alternate ? 22 : 21;
    return `<c${attributes.replace(/\s+s="[0-9]+"/gu, "")} s="${style}">`;
  });
}

function worksheetView(xml: string, pane: string, zoom = 90): string {
  const view = `<sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="${zoom}" zoomScaleNormal="${zoom}">${pane}</sheetView></sheetViews>`;
  if (!/<sheetViews>.*<\/sheetViews>/u.test(xml)) {
    throw new Error("XLSX çalışma sayfası görünümü doğrulanamadı.");
  }
  return xml.replace(/<sheetViews>.*<\/sheetViews>/u, view);
}

function professionalDataSheetXml(xml: string): string {
  let output = styleDataSheet(xml);
  output = worksheetView(
    output,
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>',
  );
  output = output.replace(
    /(<worksheet\b[^>]*>)/u,
    `$1<sheetPr><tabColor rgb="FF${DOCUMENT_COLORS.blue}"/></sheetPr>`,
  );
  return output;
}

function professionalPrintSheetXml(
  xml: string,
  periodCount: number,
  rowCount: number,
  pageBreaks: readonly number[],
): string {
  let output = stylePrintSheet(xml, periodCount, rowCount);
  output = worksheetView(
    output,
    `<pane xSplit="2" ySplit="${GROWTH_PRINT_HEADER_ROW}" topLeftCell="C${GROWTH_PRINT_DATA_START_ROW}" activePane="bottomRight" state="frozen"/><selection pane="topRight" activeCell="C1" sqref="C1"/><selection pane="bottomLeft" activeCell="A${GROWTH_PRINT_DATA_START_ROW}" sqref="A${GROWTH_PRINT_DATA_START_ROW}"/><selection pane="bottomRight" activeCell="C${GROWTH_PRINT_DATA_START_ROW}" sqref="C${GROWTH_PRINT_DATA_START_ROW}"/>`,
    85,
  );
  output = output.replace(
    /(<worksheet\b[^>]*>)/u,
    `$1<sheetPr><tabColor rgb="FF${DOCUMENT_COLORS.teal}"/><pageSetUpPr fitToPage="1"/></sheetPr>`,
  );
  if (pageBreaks.length) output = output.replace(/(<ignoredErrors\b|<\/worksheet>)/u, `<rowBreaks count="${pageBreaks.length}" manualBreakCount="${pageBreaks.length}">${pageBreaks.map(id => `<brk id="${id}" min="0" max="16383" man="1"/>`).join("")}</rowBreaks>$1`);
  output = output.replace(/<pageSetup\b[^>]*\/>/gu, "");
  output = output.replace(/<headerFooter\b[^>]*>.*<\/headerFooter>/gu, "");
  output = output.replace(
    /(<pageMargins\b[^>]*\/>)/u,
    `<printOptions horizontalCentered="1" verticalCentered="0"/>$1<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0" blackAndWhite="0" draft="0"/><headerFooter differentFirst="0" differentOddEven="0"><oddHeader>&amp;LMaarifOS | Boy-kilo&amp;RSayfa &amp;P / &amp;N</oddHeader><oddFooter>&amp;LOkul Öncesi Öğretmeni&amp;RMaarifOS</oddFooter></headerFooter>`,
  );
  if (!output.includes('pageSetUpPr fitToPage="1"') ||
    !output.includes('orientation="landscape"') ||
    !output.includes('fitToWidth="1"') ||
    !output.includes('state="frozen"') || rowCount < 1) {
    throw new Error("Boy-kilo XLSX baskı düzeni uygulanamadı.");
  }
  return output;
}

/** Keep each printed value attached to its selected measurement when the data table is sorted. */
function linkSelectedMeasurements(
  sheet: XLSX.WorkSheet,
  workspace: GrowthWorkspaceModel,
  studentIds: ReadonlySet<string>,
  sourceRowCount: number,
): void {
  if (!sourceRowCount) return;
  const end = sourceRowCount + 1;
  const ids = `'Aktarılabilir veri'!$A$2:$A$${end}`;
  function formula(id: string, column: string, divisor = 1): string {
    const key = `"${id.replace(/"/gu, '""')}"`;
    const value = `INDEX('Aktarılabilir veri'!$${column}$2:$${column}$${end},MATCH(${key},${ids},0))`;
    return `IF(COUNTIFS(${ids},${key})<>1,NA(),IF(${value}="","",${value}${divisor === 1 ? "" : `/${divisor}`}))`;
  }
  const students = workspace.students.filter(student => studentIds.has(student.id));
  for (const [studentIndex, student] of students.entries()) {
    for (const [periodIndex, period] of workspace.periods.entries()) {
      const row = GROWTH_PRINT_DATA_START_ROW + studentIndex * workspace.periods.length + periodIndex;
      const state = workspace.states.find(item => item.student.id === student.id && item.period.key === period.key);
      const height = state?.height.selected;
      const weight = state?.weight.selected;
      const nameSource = height ?? weight;
      if (nameSource && sheet[`B${row}`]) sheet[`B${row}`]!.f = formula(nameSource.id, "C");
      for (const [measurement, valueColumn, dateColumn, divisor] of [
        [height, "D", "E", 10], [weight, "F", "G", 1_000],
      ] as const) {
        if (!measurement) continue;
        sheet[`${valueColumn}${row}`]!.f = formula(measurement.id, "H", divisor);
        sheet[`${dateColumn}${row}`]!.f = formula(measurement.id, "J");
      }
    }
  }
}

export function createGrowthSpreadsheet(
  snapshot: DataSnapshot,
  today: string,
  scope?: ActiveClassroomScope,
  selection: GrowthSpreadsheetSelection = { mode: "class" },
): GrowthSpreadsheetFile {
  const fullWorkspace = buildGrowthWorkspace(snapshot, today, scope);
  const exportScope = growthExportWorkspace(fullWorkspace, selection.periodKey);
  const workspace = exportScope.workspace;
  const studentIds = selectedStudentIds(workspace, selection);
  const rows = dataRows(workspace, studentIds);
  const printable = printRows(workspace, studentIds, selection, today);
  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([[...GROWTH_DATA_HEADERS], ...rows.worksheet]);
  for (let row = 2; row <= rows.worksheet.length + 1; row += 1) {
    const measuredOn = dataSheet[`J${row}`];
    if (measuredOn) measuredOn.z = 'dd"."mm"."yyyy';
  }
  dataSheet["!cols"] = GROWTH_DATA_HEADERS.map((header) => ({
    wch: Math.min(40, Math.max(12, header.length + 2)),
  }));
  dataSheet["!rows"] = [{ hpt: 34 }, ...rows.worksheet.map(() => ({ hpt: 22 }))];
  dataSheet["!autofilter"] = {
    ref: `A1:O${Math.max(1, rows.worksheet.length + 1)}`,
  };
  const printSheet = XLSX.utils.aoa_to_sheet(printable.worksheet);
  linkSelectedMeasurements(printSheet, workspace, studentIds, rows.worksheet.length);
  for (let row = GROWTH_PRINT_DATA_START_ROW; row <= printable.dataEndRow; row += 1) {
    for (const column of ["D", "E", "F", "G"] as const) {
      printSheet[`${column}${row}`] ??= { t: "s", v: "" };
    }
    const height = printSheet[`D${row}`];
    const heightDate = printSheet[`E${row}`];
    const weight = printSheet[`F${row}`];
    const weightDate = printSheet[`G${row}`];
    if (height) height.z = '0.0 "cm"';
    if (heightDate) heightDate.z = 'dd"."mm"."yyyy';
    if (weight) weight.z = '0.000 "kg"';
    if (weightDate) weightDate.z = 'dd"."mm"."yyyy';
  }
  printSheet["!cols"] = [
    { wch: 7 }, { wch: 30 }, { wch: 18 }, { wch: 12 },
    { wch: 14 }, { wch: 12 }, { wch: 14 },
  ];
  printSheet["!rows"] = printable.rowHeights.map((height) => ({ hpt: height }));
  printSheet["!merges"] = [
    ...Array.from({ length: GROWTH_PRINT_HEADER_ROW - 1 }, (_, row) => ({
      s: { r: row, c: 0 },
      e: { r: row, c: 6 },
    })),
    { s: { r: printable.signatureRow - 1, c: 0 }, e: { r: printable.signatureRow - 1, c: 2 } },
    { s: { r: printable.signatureRow - 1, c: 3 }, e: { r: printable.signatureRow - 1, c: 4 } },
    { s: { r: printable.signatureRow - 1, c: 5 }, e: { r: printable.signatureRow - 1, c: 6 } },
  ];
  printSheet["!pageSetup"] = {
    orientation: "landscape",
    paperSize: 9,
    fitToWidth: 1,
    fitToHeight: 0,
  };
  printSheet["!margins"] = {
    left: 0.25,
    right: 0.25,
    top: 0.5,
    bottom: 0.5,
    header: 0.2,
    footer: 0.2,
  };
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Aktarılabilir veri");
  XLSX.utils.book_append_sheet(workbook, printSheet, "Baskı çizelgesi");
  workbook.Props = {
    Title: `Boy-kilo ölçüm çizelgesi · ${exportScope.label}`,
    Subject: `${String(workspace.classroom.name ?? "Sınıf")} · ${String(workspace.academicYear.name ?? "Eğitim yılı")} · ${exportScope.label}`,
    Author: "MaarifOS",
    LastAuthor: "MaarifOS",
    Company: String(workspace.classroom.schoolName ?? ""),
    Category: "Boy-kilo ölçümleri",
    Keywords: `boy; kilo; gerçek ölçüm tarihi; ${exportScope.label}`,
  };
  workbook.Custprops = {
    "Belge türü": selection.mode === "individual" ? "Bireysel boy-kilo çizelgesi" : "Sınıf boy-kilo çizelgesi",
    "Kapsam": exportScope.label,
    "Eğitim yılı": String(workspace.academicYear.name ?? ""),
    "Sınıf": String(workspace.classroom.name ?? ""),
  };
  workbook.Workbook = {
    Names: [
      {
        Name: "_xlnm.Print_Area",
        Sheet: 1,
        Ref: `'Baskı çizelgesi'!$A$1:$G$${printable.worksheet.length}`,
      },
      {
        Name: "_xlnm.Print_Titles",
        Sheet: 1,
        Ref: `'Baskı çizelgesi'!$A:$B,'Baskı çizelgesi'!$1:$${GROWTH_PRINT_HEADER_ROW}`,
      },
    ],
  };
  const initialBytes = workbookBytes(XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    compression: true,
  }));
  const archive = XLSX.CFB.read(initialBytes, { type: "array" });
  const workbookXml = zipTextFile(archive, "xl/workbook.xml")
    .replace(/<bookViews>.*?<\/bookViews>/u, "")
    .replace(/(<workbookPr\b[^>]*\/>)/u, '$1<bookViews><workbookView activeTab="1"/></bookViews>')
    .replace(/<calcPr\b[^>]*\/>/u, "")
    .replace("</workbook>", '<calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>');
  replaceZipTextFile(archive, "xl/workbook.xml", workbookXml);
  replaceZipTextFile(
    archive,
    "xl/worksheets/sheet1.xml",
    professionalDataSheetXml(zipTextFile(archive, "xl/worksheets/sheet1.xml")),
  );
  replaceZipTextFile(
    archive,
    "xl/worksheets/sheet2.xml",
    professionalPrintSheetXml(
      zipTextFile(archive, "xl/worksheets/sheet2.xml"),
      workspace.periods.length,
      printable.worksheet.length,
      printable.pageBreaks,
    ),
  );
  replaceZipTextFile(archive, "xl/styles.xml", GROWTH_STYLES_XML);
  const bytes = workbookBytes(XLSX.CFB.write(archive, {
    type: "array",
    fileType: "zip",
    compression: true,
  }));
  const selectedStudent = selection.mode === "individual"
    ? workspace.students.find((student) => student.id === selection.studentId)
    : undefined;
  return {
    fileName: `MaarifOS_Boy_Kilo_${safeFileSegment(workspace.classroom.name)}_${selectedStudent ? `${safeFileSegment(selectedStudent.displayName)}_` : ""}${safeFileSegment(workspace.academicYear.name)}_${exportScope.fileSegment}.xlsx`,
    mimeType: GROWTH_XLSX_MIME_TYPE,
    bytes,
    dataRows: rows.display,
    printRows: printable.display,
    selection,
  };
}

export const GROWTH_IMPORT_FIELDS = {
  studentId: "Öğrenci anahtarı",
  displayName: "Öğrenci adı",
  academicYearId: "Eğitim yılı anahtarı",
  classroomId: "Sınıf anahtarı",
  periodKey: "Dönem (YYYY-AA)",
  metric: "Ölçüm türü",
  value: "Değer",
  unit: "Birim",
  measuredOn: "Gerçek ölçüm tarihi",
  source: "Kaynak",
} as const;
export type GrowthImportField = keyof typeof GROWTH_IMPORT_FIELDS;
export type GrowthImportMapping = Partial<Record<GrowthImportField, number>>;

export interface GrowthImportSheet {
  readonly name: string;
  readonly rows: readonly (readonly string[])[];
  readonly suggestedHeader: number;
  readonly suggestedMapping: GrowthImportMapping;
}

export interface GrowthImportCandidate {
  readonly sourceRow: number;
  readonly values: Readonly<Record<GrowthImportField, string>>;
}

export interface GrowthImportReview {
  readonly candidate: GrowthImportCandidate;
  readonly studentName: string;
  readonly displayValue: string;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly input?: SaveGrowthMeasurementInput;
}

function normalizedHeader(value: string): string {
  return value.toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replaceAll("ı", "i")
    .replace(/[^a-z0-9]/gu, "");
}

export function suggestGrowthImportMapping(
  rows: readonly (readonly string[])[],
  headerRow: number,
): GrowthImportMapping {
  const aliases: Record<GrowthImportField, readonly string[]> = {
    studentId: ["ogrencianahtari", "ogrenciid", "studentid"],
    displayName: ["ogrenciadi", "ogrenciadisoyadi", "adsoyad"],
    academicYearId: ["egitimyilianahtari", "egitimyiliid", "academicyearid"],
    classroomId: ["sinifanahtari", "sinifid", "classroomid"],
    periodKey: ["donemyyyyaa", "donem", "periodkey"],
    metric: ["olcumturu", "tur", "metric"],
    value: ["deger", "value"],
    unit: ["birim", "unit"],
    measuredOn: ["gercekolcumtarihi", "olcumtarihi", "measuredon"],
    source: ["kaynak", "source"],
  };
  const mapping: GrowthImportMapping = {};
  (rows[headerRow] ?? []).forEach((header, index) => {
    const normalized = normalizedHeader(String(header));
    for (const field of Object.keys(aliases) as GrowthImportField[]) {
      if (mapping[field] === undefined && aliases[field].includes(normalized)) {
        mapping[field] = index;
        break;
      }
    }
  });
  return mapping;
}

export function readGrowthWorkbook(
  bytes: ArrayBuffer,
  fileName: string,
): GrowthImportSheet[] {
  if (!/\.(xlsx|xls|csv|tsv)$/iu.test(fileName)) {
    throw new Error("Ölçüm dosyası XLSX, XLS, CSV veya TSV olmalıdır.");
  }
  if (!bytes.byteLength || bytes.byteLength > GROWTH_IMPORT_LIMITS.bytes) {
    throw new Error("Ölçüm dosyası boş veya 10 MB sınırından büyük.");
  }
  let workbook: XLSX.WorkBook;
  try {
    const textFile = /\.(csv|tsv)$/iu.test(fileName);
    const input = textFile ? new TextDecoder("utf-8").decode(bytes) : bytes;
    workbook = XLSX.read(input, {
      type: textFile ? "string" : "array",
      raw: false,
      cellDates: false,
      cellFormula: false,
      cellHTML: false,
      sheetRows: GROWTH_IMPORT_LIMITS.rows + 21,
    });
  } catch {
    throw new Error("Ölçüm dosyası okunamadı; şifreli veya bozuk olabilir.");
  }
  if (workbook.SheetNames.length > GROWTH_IMPORT_LIMITS.sheets) {
    throw new Error("Ölçüm dosyasında en fazla 20 çalışma sayfası olabilir.");
  }
  return workbook.SheetNames.flatMap((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet?.["!ref"]) return [];
    const range = XLSX.utils.decode_range(sheet["!fullref"] ?? sheet["!ref"]!);
    if (range.e.r > GROWTH_IMPORT_LIMITS.rows + 19 ||
      range.e.c >= GROWTH_IMPORT_LIMITS.columns) {
      throw new Error("Ölçüm sayfası 1.000 satır / 40 sütun sınırını aşıyor.");
    }
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true,
    });
    // Excel tarih hücrelerini görünen yerel biçiminden bağımsız olarak kanonik
    // civil_date değerine döndür. Böylece dd.mm.yyyy gösterimi dışa aktarma →
    // içe aktarma turunda gün/ay belirsizliği yaratmaz.
    for (const address of Object.keys(sheet)) {
      if (address.startsWith("!")) continue;
      const cell = sheet[address];
      if (cell.t !== "n" || typeof cell.v !== "number" || !cell.w ||
        !/^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$/u.test(cell.w)) continue;
      const position = XLSX.utils.decode_cell(address);
      const date = XLSX.SSF.parse_date_code(cell.v, {
        date1904: workbook.Workbook?.WBProps?.date1904,
      });
      if (date && rows[position.r]) {
        rows[position.r]![position.c] = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
      }
    }
    const normalizedRows = rows.map((row) => row.map((value) => String(value).trim()));
    let suggestedHeader = 0;
    let best = -1;
    normalizedRows.slice(0, 20).forEach((_, index) => {
      const score = Object.keys(suggestGrowthImportMapping(normalizedRows, index)).length;
      if (score > best) {
        best = score;
        suggestedHeader = index;
      }
    });
    return [{
      name,
      rows: normalizedRows,
      suggestedHeader,
      suggestedMapping: suggestGrowthImportMapping(normalizedRows, suggestedHeader),
    }];
  });
}

export function growthImportCandidates(
  sheet: GrowthImportSheet,
  headerRow: number,
  mapping: GrowthImportMapping,
): GrowthImportCandidate[] {
  const required = [
    "studentId", "academicYearId", "classroomId", "periodKey", "metric",
    "value", "unit", "measuredOn", "source",
  ] as const;
  if (required.some((field) => mapping[field] === undefined)) {
    throw new Error("Öğrenci/yıl/sınıf anahtarı, dönem, tür, değer, birim, tarih ve kaynak sütunlarını eşleştirin.");
  }
  const used = Object.values(mapping);
  if (new Set(used).size !== used.length) {
    throw new Error("Bir sütun iki ölçüm alanına eşleştirilemez.");
  }
  return sheet.rows.slice(headerRow + 1).flatMap((row, index) => {
    const values = Object.fromEntries((Object.keys(GROWTH_IMPORT_FIELDS) as GrowthImportField[]).map((field) => [
      field,
      mapping[field] === undefined ? "" : String(row[mapping[field]!] ?? "").trim(),
    ])) as Record<GrowthImportField, string>;
    if (!Object.values(values).some(Boolean)) return [];
    return [{ sourceRow: headerRow + index + 2, values }];
  });
}

function importedMetric(value: string): GrowthMeasurementMetric | null {
  const normalized = normalizedHeader(value);
  return normalized === "boy" || normalized === "height" ? "height"
    : normalized === "kilo" || normalized === "weight" ? "weight"
      : null;
}

function importedSource(value: string): GrowthMeasurementSource | null {
  const normalized = normalizedHeader(value);
  if (["okuldaolculdu", "okul", "school"].includes(normalized)) return "school";
  if (["ailebildirdi", "aile", "family"].includes(normalized)) return "family";
  if (["belgedenaktarildi", "belge", "document"].includes(normalized)) return "document";
  return null;
}

function importedUnit(value: string): GrowthMeasurementUnit | "cm" | "kg" | null {
  const normalized = value.trim().toLocaleLowerCase("tr-TR");
  return normalized === "mm" || normalized === "g" ||
    normalized === "cm" || normalized === "kg" ? normalized : null;
}

export function reviewGrowthImport(
  candidates: readonly GrowthImportCandidate[],
  snapshot: DataSnapshot,
  scope: ActiveClassroomScope,
  today: string,
): GrowthImportReview[] {
  const workspace = buildGrowthWorkspace(snapshot, today, scope);
  const scopeCounts = new Map<string, number>();
  for (const candidate of candidates) {
    const metric = importedMetric(candidate.values.metric);
    const key = `${candidate.values.studentId}|${candidate.values.periodKey}|${metric ?? candidate.values.metric}`;
    scopeCounts.set(key, (scopeCounts.get(key) ?? 0) + 1);
  }
  return candidates.map((candidate) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const student = snapshot.students.find((record) =>
      record.id === candidate.values.studentId && typeof record.deletedAt !== "string");
    if (!student) errors.push("Öğrenci anahtarı bu cihazdaki kayıtlarla eşleşmiyor.");
    if (candidate.values.academicYearId !== scope.academicYearId) {
      errors.push("Eğitim yılı anahtarı açık çalışma alanıyla uyuşmuyor.");
    }
    if (candidate.values.classroomId !== scope.classroomId) {
      errors.push("Sınıf anahtarı açık çalışma alanıyla uyuşmuyor.");
    }
    if (student && candidate.values.displayName &&
      candidate.values.displayName.normalize("NFC").trim() !== String(student.displayName ?? "").normalize("NFC").trim()) {
      warnings.push("Dosyadaki ad farklı; eşleşme yalnız çocuk anahtarıyla yapıldı.");
    }
    const period = workspace.periods.find((item) => item.key === candidate.values.periodKey);
    if (!period) errors.push("Dönem bu eğitim yılının dört ölçüm döneminden biri değil.");
    const metric = importedMetric(candidate.values.metric);
    if (!metric) errors.push("Ölçüm türü Boy veya Kilo olmalıdır.");
    const unit = importedUnit(candidate.values.unit);
    if (!unit) errors.push("Birim mm, cm, g veya kg olmalıdır.");
    if (metric === "height" && unit !== "mm" && unit !== "cm") {
      errors.push("Boy birimi mm veya cm olmalıdır.");
    }
    if (metric === "weight" && unit !== "g" && unit !== "kg") {
      errors.push("Kilo birimi g veya kg olmalıdır.");
    }
    let integerValue: number | undefined;
    if (metric && unit) {
      try {
        integerValue = unit === "mm" || unit === "g"
          ? parseGrowthStoredValue(candidate.values.value, unit, metric)
          : parseGrowthDisplayValue(candidate.values.value, metric);
      } catch (reason) {
        errors.push(reason instanceof Error ? reason.message : "Ölçüm değeri geçersiz.");
      }
    }
    if (!isCivilDate(candidate.values.measuredOn) || candidate.values.measuredOn > today) {
      errors.push("Gerçek ölçüm tarihi geçerli olmalı ve gelecekte olmamalıdır.");
    }
    const source = importedSource(candidate.values.source);
    if (!source) errors.push("Kaynak okul, aile veya belge seçeneklerinden biri olmalıdır.");
    if (metric) {
      const key = `${candidate.values.studentId}|${candidate.values.periodKey}|${metric}`;
      if ((scopeCounts.get(key) ?? 0) > 1) {
        errors.push("Dosyada aynı çocuk, dönem ve ölçüm türü birden fazla satırda bulunuyor.");
      }
    }
    if (student && period) {
      const membership = growthMembershipForPeriod(student, scope, workspace.academicYear, period);
      if (membership.status !== "included") {
        errors.push(membership.status === "review"
          ? "Hedef dönem üyeliği inceleme bekliyor."
          : "Çocuk hedef dönemde sınıf kapsamında değil.");
      }
      if (isCivilDate(candidate.values.measuredOn)) {
        const actual = resolveStudentMembershipOn(student, {
          ...scope,
          academicYear: workspace.academicYear,
          civilDate: candidate.values.measuredOn,
        });
        if (!actual.eligible || actual.issues.length > 0) {
          errors.push("Gerçek ölçüm günü sınıf üyeliğine uymuyor.");
        }
      }
    }
    const state = metric ? workspace.states.find((item) =>
      item.student.id === candidate.values.studentId &&
      item.period.key === candidate.values.periodKey) : undefined;
    const current = metric && state ? state[metric] : undefined;
    if (current?.selected) warnings.push("Mevcut geçerli ölçüm korunacak; bu satır yeni tekrar olayıdır.");
    const input = !errors.length && metric && integerValue && source ? {
      ...scope,
      studentId: candidate.values.studentId,
      periodKey: candidate.values.periodKey,
      metric,
      integerValue,
      measuredOn: candidate.values.measuredOn,
      source,
      expectedSelectionEventId: current?.selectionEventId ?? null,
      ...(current?.selected ? { repeatOfId: current.selected.id } : {}),
    } satisfies SaveGrowthMeasurementInput : undefined;
    return {
      candidate,
      studentName: String(student?.displayName ?? (candidate.values.displayName || "Bilinmeyen çocuk")),
      displayValue: metric && integerValue ? formatGrowthInteger(integerValue, metric) : candidate.values.value,
      errors,
      warnings,
      input,
    };
  });
}

export async function commitGrowthImport(
  store: LocalDataStore,
  options: {
    readonly reviews: readonly GrowthImportReview[];
    readonly selectedSourceRows: readonly number[];
    readonly now?: Date;
  },
): Promise<SavedGrowthMeasurement[]> {
  const selected = new Set(options.selectedSourceRows);
  if (!selected.size || selected.size !== options.selectedSourceRows.length) {
    throw new Error("İçe aktarılacak en az bir benzersiz satır seçin.");
  }
  const reviews = options.reviews.filter((review) =>
    selected.has(review.candidate.sourceRow));
  if (reviews.length !== selected.size ||
    reviews.some((review) => review.errors.length || !review.input)) {
    throw new Error("Seçilen ölçüm satırlarının önizlemesini ve hatalarını yeniden kontrol edin.");
  }
  const now = options.now ?? new Date();
  return saveGrowthMeasurementBatch(store, reviews.map((review) => ({
    ...review.input!,
    now,
  })));
}
