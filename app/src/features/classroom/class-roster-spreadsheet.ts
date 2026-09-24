import { appendPurposeSpreadsheet, purposeSheetXml, PURPOSE_SHEET_NAME } from "./class-roster-purpose-spreadsheet.ts";
import { classRosterInputForPurpose, resolveClassRosterLayout, type ClassRosterLayoutId } from "./class-roster-layouts.ts";
import type { BrowserFileDownload } from "../documents/browser-file-download.ts";
import { DOCUMENT_COLORS } from "../documents/document-theme.ts";
import type { ClassRosterColumnId } from "./class-roster-columns.ts";
import {
  createClassRosterExportModel,
  type ClassRosterDocumentInput,
  type ClassRosterExportModel,
} from "./class-roster-document.ts";

export const CLASS_ROSTER_XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;
export const CLASS_ROSTER_XLSX_SHEET_NAME = "Sınıf listesi" as const;
export const CLASS_ROSTER_XLSX_HEADER_ROW = 7 as const;
export const CLASS_ROSTER_XLSX_DATA_START_ROW = CLASS_ROSTER_XLSX_HEADER_ROW + 1;
export const CLASS_ROSTER_COMPACT_XLSX_SHEET_NAME = "Kısa iletişim baskısı" as const;
export const CLASS_ROSTER_COMPACT_HEADER_ROW = 5 as const;
export const CLASS_ROSTER_COMPACT_DATA_START_ROW = CLASS_ROSTER_COMPACT_HEADER_ROW + 1;

export type ClassRosterSpreadsheetLayout = "full" | "compact-contact" | ClassRosterLayoutId;

export interface ClassRosterSpreadsheetOptions {
  readonly layout?: ClassRosterSpreadsheetLayout;
}

type XlsxModule = typeof import("xlsx");

const centeredColumnIds = new Set<ClassRosterColumnId>([
  "sequence",
  "schoolNumber",
  "nationalId",
  "birthDate",
  "enrollmentYear",
]);

const EXCEL_CIVIL_DATE_FORMAT = "dd\\.mm\\.yyyy" as const;

const COMPACT_CONTACT_GROUPS = [
  { key: "sequence", label: "Sıra", ids: ["sequence"], width: 7, centered: true, styleGroup: "Öğrenci" },
  { key: "schoolNumber", label: "Okul no", ids: ["schoolNumber"], width: 11, centered: true, styleGroup: "Öğrenci" },
  { key: "name", label: "Öğrenci", ids: ["name"], width: 25, centered: false, styleGroup: "Öğrenci" },
  { key: "mother", label: "Anne", ids: ["motherName", "motherPhone"], width: 29, centered: false, styleGroup: "Anne" },
  { key: "father", label: "Baba", ids: ["fatherName", "fatherPhone"], width: 29, centered: false, styleGroup: "Baba" },
  { key: "other", label: "Diğer yakın", ids: ["otherName", "otherPhone", "otherRelationship"], width: 34, centered: false, styleGroup: "Diğer yakınlar" },
  { key: "roles", label: "İletişim rolü", ids: ["priorityContact", "emergencyContact"], width: 27, centered: false, styleGroup: "İletişim ve adres" },
] as const satisfies readonly {
  readonly key: string;
  readonly label: string;
  readonly ids: readonly ClassRosterColumnId[];
  readonly width: number;
  readonly centered: boolean;
  readonly styleGroup: string;
}[];

type CompactContactColumn = (typeof COMPACT_CONTACT_GROUPS)[number] | {
  readonly key: "notice";
  readonly label: "Kısa iletişim alanı";
  readonly ids: readonly [];
  readonly width: 54;
  readonly centered: false;
  readonly styleGroup: "İletişim ve adres";
};

interface CompactFormulaPart {
  readonly reference: string;
  readonly label?: string;
}

const COMPACT_VALUE_LABELS: Partial<Record<ClassRosterColumnId, string>> = {
  priorityContact: "Öncelikli",
  emergencyContact: "Acil",
};

function excelCivilDateSerial(value: string): number | null {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/u);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const epochMilliseconds = Date.UTC(year, month - 1, day);
  const candidate = new Date(epochMilliseconds);
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) return null;
  return epochMilliseconds / 86_400_000 + 25_569;
}

function typedRosterCell(
  columnId: ClassRosterColumnId,
  value: string,
): { readonly t: "s"; readonly v: string } | {
  readonly t: "n";
  readonly v: number;
  readonly z?: string;
} {
  if (columnId === "sequence" && /^[1-9]\d*$/u.test(value)) {
    return { t: "n", v: Number(value) };
  }
  if (columnId === "birthDate") {
    const serial = excelCivilDateSerial(value);
    if (serial !== null) return { t: "n", v: serial, z: EXCEL_CIVIL_DATE_FORMAT };
  }
  if (columnId === "enrollmentYear" && /^\d{4}$/u.test(value)) {
    const year = Number(value);
    if (year >= 1900 && year <= 2200) return { t: "n", v: year };
  }
  return { t: "s", v: value };
}

const columnWidths: Readonly<Record<ClassRosterColumnId, number>> = Object.freeze({
  sequence: 8,
  schoolNumber: 12,
  name: 30,
  nationalId: 17,
  birthDate: 15,
  enrollmentYear: 13,
  motherName: 25,
  motherPhone: 19,
  motherOccupation: 24,
  fatherName: 25,
  fatherPhone: 19,
  fatherOccupation: 24,
  otherName: 25,
  otherPhone: 19,
  otherRelationship: 25,
  otherOccupation: 24,
  priorityContact: 25,
  emergencyContact: 25,
  pickupAuthorization: 25,
  address: 52,
});

const VIBRANT_STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="${EXCEL_CIVIL_DATE_FORMAT}"/></numFmts>
  <fonts count="6">
    <font><sz val="10"/><color rgb="FF${DOCUMENT_COLORS.ink}"/><name val="Roboto"/><family val="2"/></font>
    <font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Roboto"/><family val="2"/></font>
    <font><b/><sz val="12"/><color rgb="FF${DOCUMENT_COLORS.ink}"/><name val="Roboto"/><family val="2"/></font>
    <font><b/><sz val="10.5"/><color rgb="FF${DOCUMENT_COLORS.ink}"/><name val="Roboto"/><family val="2"/></font>
    <font><b/><sz val="10.5"/><color rgb="FF${DOCUMENT_COLORS.ink}"/><name val="Roboto"/><family val="2"/></font>
    <font><sz val="10.5"/><color rgb="FF${DOCUMENT_COLORS.ink}"/><name val="Roboto"/><family val="2"/></font>
  </fonts>
  <fills count="14">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.ink}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF4F8FB"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.teal}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.tealTint}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.blue}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.blueTint}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.coral}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.coralTint}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.yellow}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF${DOCUMENT_COLORS.yellowTint}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFB8E9E5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F8F6"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FF${DOCUMENT_COLORS.border}"/></left><right style="thin"><color rgb="FF${DOCUMENT_COLORS.border}"/></right><top style="thin"><color rgb="FF${DOCUMENT_COLORS.border}"/></top><bottom style="thin"><color rgb="FF${DOCUMENT_COLORS.border}"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="33">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="10" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="12" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="13" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="13" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="13" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="5" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="5" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="5" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="5" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="5" fillId="13" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" shrinkToFit="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="TableStyleMedium4"/>
</styleSheet>`;

const GROUP_STYLE_OFFSET: Readonly<Record<string, number>> = Object.freeze({
  "Öğrenci": 0,
  "Anne": 1,
  "Baba": 2,
  "Diğer yakınlar": 3,
  "İletişim ve adres": 4,
});

function groupStyleOffset(group: string): number {
  const offset = GROUP_STYLE_OFFSET[group];
  if (offset === undefined) throw new Error(`Sınıf listesi XLSX grup stili bulunamadı: ${group}`);
  return offset;
}

function safeFileSegment(value: string): string {
  return value
    .normalize("NFC")
    .trim()
    .replace(/[\\/:*?"<>|]/gu, "-")
    .replace(/\s+/gu, "_")
    .slice(0, 64) || "Sinif";
}

function displayCivilDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function ageGroupFromInput(input: ClassRosterDocumentInput): string {
  const classroom = input.snapshot.classrooms.find((candidate) =>
    candidate.id === input.scope.classroomId &&
    candidate.academicYearId === input.scope.academicYearId);
  const explicit = typeof classroom?.ageGroup === "string"
    ? classroom.ageGroup.trim()
    : "";
  const fromName = typeof classroom?.name === "string"
    ? classroom.name.match(/(\d{2})\s*[–-]\s*(\d{2})\s+[Aa][Yy]/u)
    : null;
  const value = explicit || (fromName ? `${fromName[1]}–${fromName[2]} ay` : "");
  return value.replace(/^([0-9]{2})\s*[-–]\s*([0-9]{2})(?:\s+[Aa][Yy])?$/u, "$1–$2 ay");
}

function groupHeaderRow(
  columns: readonly { readonly group: string }[],
): { readonly values: string[]; readonly merges: { readonly start: number; readonly end: number }[] } {
  // Her sütun kendi tam grup etiketini taşır. Böylece Excel'in yatay baskı
  // sayfaları birleşik bir hücreyi bölemez veya yinelenen kimlik bandıyla
  // üst üste bindiremez.
  return { values: columns.map((column) => column.group), merges: [] };
}

function fullWidthRow(value: string, length: number): string[] {
  const row = Array.from({ length }, () => "");
  row[0] = value;
  return row;
}

function estimatedDataRowHeight(
  row: readonly string[],
  columns: readonly { readonly id: ClassRosterColumnId }[],
): number {
  const lineCount = row.reduce((maximum, value, index) => {
    const availableCharacters = Math.max(6, Math.floor(columnWidths[columns[index]!.id] * 0.88));
    const wrapped = String(value).split(/\r?\n/gu).reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(Array.from(line).length / availableCharacters)),
      0,
    );
    return Math.max(maximum, wrapped);
  }, 1);
  return Math.min(210, Math.max(30, lineCount * 14 + 8));
}

function printLayout(columns: readonly { readonly id: ClassRosterColumnId }[]): {
  readonly orientation: "portrait" | "landscape";
  readonly fitToWidth: number;
  readonly contextColumns: number;
} {
  const totalWidth = columns.reduce((sum, column) => sum + columnWidths[column.id], 0);
  const orientation = totalWidth > 95 ? "landscape" : "portrait";
  const readablePageWidth = orientation === "landscape" ? 155 : 95;
  const nameIndex = columns.findIndex((column) => column.id === "name");
  const schoolNumberIndex = columns.findIndex((column) => column.id === "schoolNumber");
  const sequenceIndex = columns.findIndex((column) => column.id === "sequence");
  const contextColumns = Math.max(nameIndex, schoolNumberIndex, sequenceIndex) + 1;
  const repeatedContextWidth = columns.slice(0, Math.max(1, contextColumns)).reduce(
    (sum, column) => sum + columnWidths[column.id],
    0,
  );
  let fitToWidth = Math.max(1, Math.ceil(totalWidth / readablePageWidth));
  while (
    fitToWidth > 1 &&
    (totalWidth + (fitToWidth - 1) * repeatedContextWidth) / fitToWidth > readablePageWidth
  ) fitToWidth += 1;
  return {
    orientation,
    fitToWidth,
    contextColumns: Math.max(1, contextColumns),
  };
}

function metadataRowHeight(value: string, availableWidth: number): number {
  const lines = Math.max(1, Math.ceil(Array.from(value).length / Math.max(18, availableWidth * 0.88)));
  return Math.min(72, Math.max(24, lines * 14 + 8));
}

function compactContactColumns(model: ClassRosterExportModel): readonly CompactContactColumn[] {
  const selected = new Set(model.columns.map((column) => column.id));
  const columns = COMPACT_CONTACT_GROUPS.filter((column) =>
    column.ids.some((id) => selected.has(id)));
  return columns.length ? columns : [{
    key: "notice",
    label: "Kısa iletişim alanı",
    ids: [],
    width: 54,
    centered: false,
    styleGroup: "İletişim ve adres",
  }];
}

function compactValueIsPresent(value: string): boolean {
  return value.trim() !== "" && value.trim() !== "—";
}

function compactEmptyValue(values: readonly string[]): string {
  return values.every((value) => value === "") ? "" : "—";
}

function compactContactRows(
  model: ClassRosterExportModel,
  columns: readonly CompactContactColumn[],
): string[][] {
  const sourceColumnIndex = new Map(model.columns.map((column, index) => [column.id, index]));
  const studentIds = [...new Set(model.rowStudentIds)];
  return studentIds.map((studentId) => {
    const sourceRows = model.rows.filter((_, index) => model.rowStudentIds[index] === studentId);
    return columns.map((column) => {
      if (column.key === "notice") return "Seçilen alanlarda kısa iletişim bilgisi bulunmuyor.";
      if (column.ids.length === 1 && ["sequence", "schoolNumber", "name"].includes(column.key)) {
        const index = sourceColumnIndex.get(column.ids[0]!);
        if (index === undefined) return "—";
        return sourceRows.map((row) => row[index] ?? "").find(compactValueIsPresent) ?? sourceRows[0]?.[index] ?? "—";
      }
      if (column.key === "other") {
        const blocks = sourceRows.map((row) => column.ids.flatMap((id) => {
          const index = sourceColumnIndex.get(id);
          const value = index === undefined ? "" : row[index] ?? "";
          return compactValueIsPresent(value) ? [value] : [];
        }).join(" · ")).filter(Boolean);
        const sourceValues = sourceRows.flatMap((row) => column.ids.flatMap((id) => {
          const index = sourceColumnIndex.get(id);
          return index === undefined ? [] : [row[index] ?? ""];
        }));
        return blocks.length ? blocks.join("\n") : compactEmptyValue(sourceValues);
      }
      const lines = column.ids.flatMap((id) => {
        const index = sourceColumnIndex.get(id);
        if (index === undefined) return [];
        const values = [...new Set(sourceRows.map((row) => row[index] ?? "").filter(compactValueIsPresent))];
        return values.map((value) => {
          const label = COMPACT_VALUE_LABELS[id];
          return label ? `${label}: ${value}` : value;
        });
      });
      const sourceValues = sourceRows.flatMap((row) => column.ids.flatMap((id) => {
        const index = sourceColumnIndex.get(id);
        return index === undefined ? [] : [row[index] ?? ""];
      }));
      return lines.length ? lines.join(" · ") : compactEmptyValue(sourceValues);
    });
  });
}

function excelColumnName(columnIndex: number): string {
  if (!Number.isInteger(columnIndex) || columnIndex < 0) {
    throw new Error("Kısa iletişim XLSX kaynak sütunu doğrulanamadı.");
  }
  let ordinal = columnIndex + 1;
  let name = "";
  while (ordinal > 0) {
    const remainder = (ordinal - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    ordinal = Math.floor((ordinal - 1) / 26);
  }
  return name;
}

function compactSourceReference(columnIndex: number, modelRowIndex: number): string {
  const sheetName = CLASS_ROSTER_XLSX_SHEET_NAME.replace(/'/gu, "''");
  const row = CLASS_ROSTER_XLSX_DATA_START_ROW + modelRowIndex;
  return `'${sheetName}'!$${excelColumnName(columnIndex)}$${row}`;
}

function formulaString(value: string): string {
  return `"${value.replace(/"/gu, '""')}"`;
}

function formulaAnd(expressions: readonly string[]): string {
  if (!expressions.length) return "FALSE";
  return expressions.length === 1 ? expressions[0]! : `AND(${expressions.join(",")})`;
}

function formulaOr(expressions: readonly string[]): string {
  if (!expressions.length) return "FALSE";
  return expressions.length === 1 ? expressions[0]! : `OR(${expressions.join(",")})`;
}

function compactFormulaIsPresent(reference: string): string {
  return `AND(NOT(ISBLANK(${reference})),${reference}<>"—")`;
}

function compactFormulaPartValue(part: CompactFormulaPart): string {
  return part.label
    ? `${formulaString(`${part.label}: `)}&${part.reference}`
    : part.reference;
}

function compactTextJoinExpression(
  parts: readonly CompactFormulaPart[],
  separatorExpression: string,
): string {
  const values = parts.map((part) => {
    const present = compactFormulaIsPresent(part.reference);
    return `IF(${present},${compactFormulaPartValue(part)},"")`;
  });
  return `_xlfn.TEXTJOIN(${separatorExpression},TRUE,${values.join(",")})`;
}

function compactJoinedFormula(parts: readonly CompactFormulaPart[]): string {
  const references = parts.map((part) => part.reference);
  const allBlank = formulaAnd(references.map((reference) => `ISBLANK(${reference})`));
  const anyPresent = formulaOr(references.map(compactFormulaIsPresent));
  const joined = compactTextJoinExpression(parts, formulaString(" · "));
  return `IF(${allBlank},"",IF(${anyPresent},${joined},"—"))`;
}

function compactFirstPresentFormula(references: readonly string[]): string {
  const allBlank = formulaAnd(references.map((reference) => `ISBLANK(${reference})`));
  const firstPresent = [...references].reverse().reduce(
    (fallback, reference) => `IF(${compactFormulaIsPresent(reference)},${reference},${fallback})`,
    '"—"',
  );
  return `IF(${allBlank},"",${firstPresent})`;
}

function compactOtherFormula(rowParts: readonly (readonly CompactFormulaPart[])[]): string {
  const allParts = rowParts.flat();
  const references = allParts.map((part) => part.reference);
  const allBlank = formulaAnd(references.map((reference) => `ISBLANK(${reference})`));
  const rowPresent = rowParts.map((parts) =>
    formulaOr(parts.map((part) => compactFormulaIsPresent(part.reference))));
  const joinedRows = rowParts.map((parts, index) =>
    `IF(${rowPresent[index]!},${compactTextJoinExpression(parts, formulaString(" · "))},"")`);
  const joined = `_xlfn.TEXTJOIN(CHAR(10),TRUE,${joinedRows.join(",")})`;
  return `IF(${allBlank},"",IF(${formulaOr(rowPresent)},${joined},"—"))`;
}

function compactContactFormulaRows(
  model: ClassRosterExportModel,
  columns: readonly CompactContactColumn[],
): readonly (readonly (string | undefined)[])[] {
  const sourceColumnIndex = new Map(model.columns.map((column, index) => [column.id, index]));
  const sourceRowsByStudent = new Map<string, number[]>();
  model.rowStudentIds.forEach((studentId, rowIndex) => {
    const indexes = sourceRowsByStudent.get(studentId) ?? [];
    indexes.push(rowIndex);
    sourceRowsByStudent.set(studentId, indexes);
  });
  return [...sourceRowsByStudent.values()].map((sourceRowIndexes) => columns.map((column) => {
    if (column.key === "notice") return undefined;
    if (column.ids.length === 1 && ["sequence", "schoolNumber", "name"].includes(column.key)) {
      const columnIndex = sourceColumnIndex.get(column.ids[0]!);
      if (columnIndex === undefined) throw new Error("Kısa iletişim XLSX kaynak alanı bulunamadı.");
      return compactFirstPresentFormula(sourceRowIndexes.map((rowIndex) =>
        compactSourceReference(columnIndex, rowIndex)));
    }
    if (column.key === "other") {
      const rowParts = sourceRowIndexes.map((rowIndex) => column.ids.flatMap((id) => {
        const columnIndex = sourceColumnIndex.get(id);
        return columnIndex === undefined ? [] : [{
          reference: compactSourceReference(columnIndex, rowIndex),
        }];
      }));
      return compactOtherFormula(rowParts);
    }
    const parts = column.ids.flatMap((id) => {
      const columnIndex = sourceColumnIndex.get(id);
      if (columnIndex === undefined) return [];
      const seenValues = new Set<string>();
      return sourceRowIndexes.flatMap((rowIndex) => {
        const value = model.rows[rowIndex]?.[columnIndex] ?? "";
        if (compactValueIsPresent(value)) {
          if (seenValues.has(value)) return [];
          seenValues.add(value);
        }
        return [{
          reference: compactSourceReference(columnIndex, rowIndex),
          ...(COMPACT_VALUE_LABELS[id] ? { label: COMPACT_VALUE_LABELS[id] } : {}),
        }];
      });
    });
    return compactJoinedFormula(parts);
  }));
}

function compactRowHeight(
  row: readonly string[],
  columns: readonly CompactContactColumn[],
): number {
  const lines = row.reduce((maximum, value, index) => {
    const width = Math.max(6, Math.floor((columns[index]?.width ?? 20) * 0.86));
    const wrapped = String(value).split(/\r?\n/gu).reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(Array.from(line).length / width)),
      0,
    );
    return Math.max(maximum, wrapped);
  }, 1);
  return Math.min(360, Math.max(24, lines * 13 + 3));
}

function workbookBytes(value: unknown): Uint8Array {
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (value instanceof Uint8Array) {
    return new Uint8Array(value.buffer.slice(
      value.byteOffset,
      value.byteOffset + value.byteLength,
    ));
  }
  throw new Error("Sınıf listesi XLSX baytları üretilemedi.");
}

function zipTextFile(xlsx: XlsxModule, archive: unknown, path: string): string {
  const entry = xlsx.CFB.find(archive, `Root Entry/${path}`);
  if (!entry?.content) throw new Error(`XLSX paketinde ${path} bulunamadı.`);
  return new TextDecoder("utf-8").decode(entry.content);
}

function replaceZipTextFile(
  xlsx: XlsxModule,
  archive: unknown,
  path: string,
  content: string,
): void {
  const entry = xlsx.CFB.find(archive, `Root Entry/${path}`);
  if (!entry?.content) throw new Error(`XLSX paketinde ${path} bulunamadı.`);
  entry.content = new TextEncoder().encode(content);
  entry.size = entry.content.byteLength;
}

function activeWorkbookSheetXml(xml: string, activeTab: number): string {
  if (/<bookViews>.*<workbookView\b[^>]*\/>.*<\/bookViews>/u.test(xml)) {
    return xml.replace(/(<workbookView\b[^>]*?)\s+activeTab="[0-9]+"([^>]*\/>>?)/u, `$1 activeTab="${activeTab}"$2`);
  }
  const workbookProperties = /<workbookPr\b[^>]*\/>/u;
  if (!workbookProperties.test(xml)) throw new Error("XLSX çalışma kitabı görünümü doğrulanamadı.");
  return xml.replace(
    workbookProperties,
    (value) => `${value}<bookViews><workbookView activeTab="${activeTab}"/></bookViews>`,
  );
}

function automaticWorkbookCalculationXml(xml: string): string {
  const calculation = /<calcPr\b([^>]*)\/>/u;
  if (calculation.test(xml)) {
    return xml.replace(calculation, (_tag, attributes: string) => {
      const preserved = attributes.replace(
        /\s+(?:calcMode|fullCalcOnLoad|forceFullCalc)="[^"]*"/gu,
        "",
      );
      return `<calcPr${preserved} calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>`;
    });
  }
  if (!xml.includes("</workbook>")) {
    throw new Error("XLSX çalışma kitabı hesaplama ayarı doğrulanamadı.");
  }
  return xml.replace(
    "</workbook>",
    '<calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>',
  );
}

function styleCells(
  xml: string,
  columns: readonly { readonly id: ClassRosterColumnId; readonly group: string }[],
): string {
  return xml.replace(/<c\b([^>]*)>/gu, (tag, attributes: string) => {
    const address = attributes.match(/\br="([A-Z]+)([0-9]+)"/u);
    if (!address) return tag;
    const row = Number(address[2]);
    let style = 0;
    if (row === 1) style = 1;
    else if (row === 2) style = 2;
    else if (row >= 3 && row <= 5) style = 3;
    else if (row === 6 || row === 7) {
      const columnIndex = address[1]!.split("").reduce(
        (value, character) => value * 26 + character.charCodeAt(0) - 64,
        0,
      ) - 1;
      const offset = groupStyleOffset(columns[columnIndex]?.group ?? "Öğrenci");
      style = (row === 6 ? 4 : 9) + offset;
    }
    else {
      const columnIndex = address[1]!.split("").reduce(
        (value, character) => value * 26 + character.charCodeAt(0) - 64,
        0,
      ) - 1;
      const column = columns[columnIndex];
      const centered = centeredColumnIds.has(column?.id ?? "name");
      const alternate = (row - 8) % 2 === 1;
      if (column?.id === "birthDate") {
        style = alternate ? 27 + groupStyleOffset(column.group) : 26;
      }
      else if (!alternate) style = centered ? 15 : 14;
      else {
        const offset = groupStyleOffset(column?.group ?? "Öğrenci");
        style = (centered ? 21 : 16) + offset;
      }
    }
    const withoutStyle = attributes.replace(/\s+s="[0-9]+"/gu, "");
    return `<c${withoutStyle} s="${style}">`;
  });
}

function professionalSheetXml(
  xml: string,
  columns: readonly { readonly id: ClassRosterColumnId; readonly group: string }[],
): string {
  const { orientation, fitToWidth, contextColumns } = printLayout(columns);
  const frozenColumns = columns.length > contextColumns ? contextColumns : 0;
  const pane = frozenColumns
    ? `<pane xSplit="${frozenColumns}" ySplit="7" topLeftCell="${String.fromCharCode(65 + frozenColumns)}8" activePane="bottomRight" state="frozen"/><selection pane="topRight" activeCell="${String.fromCharCode(65 + frozenColumns)}1" sqref="${String.fromCharCode(65 + frozenColumns)}1"/><selection pane="bottomLeft" activeCell="A8" sqref="A8"/><selection pane="bottomRight" activeCell="${String.fromCharCode(65 + frozenColumns)}8" sqref="${String.fromCharCode(65 + frozenColumns)}8"/>`
    : `<pane ySplit="7" topLeftCell="A8" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A8" sqref="A8"/>`;
  let output = styleCells(xml, columns);
  if (!/<sheetViews><sheetView\b[^>]*\/><\/sheetViews>/u.test(output)) {
    throw new Error("XLSX çalışma sayfası görünümü doğrulanamadı.");
  }
  output = output.replace(
    /<sheetViews><sheetView\b[^>]*\/><\/sheetViews>/u,
    `<sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="85" zoomScaleNormal="85">${pane}</sheetView></sheetViews>`,
  );
  output = output.replace(
    /(<worksheet\b[^>]*>)/u,
    `$1<sheetPr><tabColor rgb="FF${DOCUMENT_COLORS.teal}"/><pageSetUpPr fitToPage="1"/></sheetPr>`,
  );
  output = output.replace(/<pageSetup\b[^>]*\/>/gu, "");
  output = output.replace(
    /(<pageMargins\b[^>]*\/>)/u,
    `<printOptions horizontalCentered="1" verticalCentered="0"/>$1<pageSetup paperSize="9" orientation="${orientation}" fitToWidth="${fitToWidth}" fitToHeight="0" blackAndWhite="0" draft="0" cellComments="none"/><headerFooter differentFirst="0" differentOddEven="0"><oddFooter>&amp;LMaarifOS · Sınıf listesi&amp;R&amp;P / &amp;N</oddFooter></headerFooter>`,
  );
  if (!output.includes("state=\"frozen\"") || !output.includes("<pageSetup ")) {
    throw new Error("XLSX sayfa düzeni uygulanamadı.");
  }
  return output;
}

function styleCompactCells(
  xml: string,
  columns: readonly CompactContactColumn[],
  dataEndRow: number,
  signatureRow: number,
): string {
  return xml.replace(/<c\b([^>]*)>/gu, (tag, attributes: string) => {
    const address = attributes.match(/\br="([A-Z]+)([0-9]+)"/u);
    if (!address) return tag;
    const row = Number(address[2]);
    const columnIndex = address[1]!.split("").reduce(
      (value, character) => value * 26 + character.charCodeAt(0) - 64,
      0,
    ) - 1;
    const column = columns[columnIndex];
    let style = 0;
    if (row === 1) style = 1;
    else if (row === 2) style = 2;
    else if (row === 3 || row === 4 || row === signatureRow) style = 3;
    else if (row === CLASS_ROSTER_COMPACT_HEADER_ROW) {
      style = 4 + groupStyleOffset(column?.styleGroup ?? "İletişim ve adres");
    } else if (row >= CLASS_ROSTER_COMPACT_DATA_START_ROW && row <= dataEndRow) {
      const alternate = (row - CLASS_ROSTER_COMPACT_DATA_START_ROW) % 2 === 1;
      if (!alternate) style = column?.centered ? 15 : 14;
      else style = (column?.centered ? 21 : 16) + groupStyleOffset(column?.styleGroup ?? "İletişim ve adres");
    }
    return `<c${attributes.replace(/\s+s="[0-9]+"/gu, "")} s="${style}">`;
  });
}

function professionalCompactSheetXml(
  xml: string,
  columns: readonly CompactContactColumn[],
  dataEndRow: number,
  signatureRow: number,
): string {
  let output = styleCompactCells(xml, columns, dataEndRow, signatureRow);
  if (!/<sheetViews><sheetView\b[^>]*\/><\/sheetViews>/u.test(output)) {
    throw new Error("Kısa iletişim XLSX çalışma sayfası görünümü doğrulanamadı.");
  }
  output = output.replace(
    /<sheetViews><sheetView\b[^>]*\/><\/sheetViews>/u,
    `<sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="90" zoomScaleNormal="90"><pane ySplit="${CLASS_ROSTER_COMPACT_HEADER_ROW}" topLeftCell="A${CLASS_ROSTER_COMPACT_DATA_START_ROW}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${CLASS_ROSTER_COMPACT_DATA_START_ROW}" sqref="A${CLASS_ROSTER_COMPACT_DATA_START_ROW}"/></sheetView></sheetViews>`,
  );
  output = output.replace(
    /(<worksheet\b[^>]*>)/u,
    `$1<sheetPr><tabColor rgb="FF${DOCUMENT_COLORS.coral}"/><pageSetUpPr fitToPage="1"/></sheetPr>`,
  );
  output = output.replace(/<pageSetup\b[^>]*\/>/gu, "");
  output = output.replace(
    /(<pageMargins\b[^>]*\/>)/u,
    `<printOptions horizontalCentered="1" verticalCentered="0"/>$1<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0" blackAndWhite="0" draft="0" cellComments="none"/><headerFooter differentFirst="0" differentOddEven="0"><oddFooter>&amp;LMaarifOS · Kısa iletişim baskısı&amp;R&amp;P / &amp;N</oddFooter></headerFooter>`,
  );
  if (!output.includes('fitToWidth="1"') || !output.includes('fitToHeight="0"') || !output.includes('state="frozen"')) {
    throw new Error("Kısa iletişim XLSX baskı düzeni uygulanamadı.");
  }
  return output;
}

/**
 * PDF ile aynı doğrulanmış snapshot, dönem, öğrenci ve sütun seçimini tek bir
 * yerel XLSX sayfasına dönüştürür. Kaynak değerleri maskelemez veya kısaltmaz.
 */
export async function createClassRosterSpreadsheet(
  input: ClassRosterDocumentInput,
  options: ClassRosterSpreadsheetOptions = {},
): Promise<BrowserFileDownload> {
  const layout = options.layout ?? input.layout ?? "full";
  const purposeLayout = layout !== "full" && layout !== "compact-contact" ? layout : undefined;
  if (!["full", "compact-contact", "daily-classroom", "contact-blocks", "detailed-roster", "single-page-roster"].includes(layout)) {
    throw new Error("Sınıf listesi XLSX baskı düzeni geçersiz.");
  }
  const model = createClassRosterExportModel(purposeLayout ? classRosterInputForPurpose(input, purposeLayout, { preserveSelectedColumns: true }) : input);
  const columnCount = model.columns.length;
  if (!columnCount || model.rows.some((row) => row.length !== columnCount)) {
    throw new Error("Sınıf listesi XLSX sütunları doğrulanamadı.");
  }
  const xlsx = await import("xlsx");
  const groups = groupHeaderRow(model.columns);
  const print = printLayout(model.columns);
  const ageGroup = ageGroupFromInput(input);
  const period = input.period
    ? `${displayCivilDate(input.period.start)} – ${displayCivilDate(input.period.end)}`
    : "Oluşturma tarihinde geçerli üyelik";
  const summary = [
    `Sınıf: ${model.metadata.classroomName}`,
    `Eğitim yılı: ${model.metadata.academicYearLabel}`,
    ...(ageGroup ? [`Yaş grubu: ${ageGroup}`] : []),
    `Öğrenci sayısı: ${model.metadata.studentCount}`,
  ].join(" · ");
  const teacher = `Öğretmen: ${model.metadata.teacherName} · Ünvanı: ${model.metadata.teacherTitle}`;
  const periodAndDate = `Dönem: ${period} · Oluşturma tarihi: ${displayCivilDate(model.metadata.generatedCivilDate)}`;
  const rows = [
    fullWidthRow("Sınıf Listesi", columnCount),
    fullWidthRow(model.metadata.schoolName, columnCount),
    fullWidthRow(summary, columnCount),
    fullWidthRow(teacher, columnCount),
    fullWidthRow(periodAndDate, columnCount),
    groups.values,
    model.columns.map((column) => column.label),
    ...model.rows.map((row) => [...row]),
  ];
  const sheet = xlsx.utils.aoa_to_sheet(rows);
  rows.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    const address = xlsx.utils.encode_cell({ r: rowIndex, c: columnIndex });
    sheet[address] = rowIndex >= CLASS_ROSTER_XLSX_HEADER_ROW
      ? typedRosterCell(model.columns[columnIndex]!.id, value)
      : { t: "s", v: value };
  }));
  sheet["!ref"] = xlsx.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(CLASS_ROSTER_XLSX_HEADER_ROW - 1, rows.length - 1), c: columnCount - 1 },
  });
  const headerSpan = print.fitToWidth > 1 ? print.contextColumns : columnCount;
  sheet["!merges"] = [
    ...Array.from({ length: 5 }, (_, row) => ({
      s: { r: row, c: 0 },
      e: { r: row, c: headerSpan - 1 },
    })).filter((merge) => merge.e.c > merge.s.c),
    ...groups.merges.filter((merge) => merge.end > merge.start).map((merge) => ({
      s: { r: 5, c: merge.start },
      e: { r: 5, c: merge.end },
    })),
  ];
  sheet["!cols"] = model.columns.map((column) => ({ wch: columnWidths[column.id] }));
  sheet["!rows"] = [
    { hpt: 30 },
    { hpt: 28 },
    { hpt: metadataRowHeight(summary, model.columns.slice(0, headerSpan).reduce((sum, column) => sum + columnWidths[column.id], 0)) },
    { hpt: metadataRowHeight(teacher, model.columns.slice(0, headerSpan).reduce((sum, column) => sum + columnWidths[column.id], 0)) },
    { hpt: metadataRowHeight(periodAndDate, model.columns.slice(0, headerSpan).reduce((sum, column) => sum + columnWidths[column.id], 0)) },
    { hpt: 24 },
    { hpt: 38 },
    ...model.rows.map((row) => ({ hpt: estimatedDataRowHeight(row, model.columns) })),
  ];
  const lastColumn = xlsx.utils.encode_col(columnCount - 1);
  const lastRow = Math.max(CLASS_ROSTER_XLSX_HEADER_ROW, rows.length);
  sheet["!autofilter"] = {
    ref: `A${CLASS_ROSTER_XLSX_HEADER_ROW}:${lastColumn}${lastRow}`,
  };
  sheet["!margins"] = {
    left: 0.25,
    right: 0.25,
    top: 0.4,
    bottom: 0.45,
    header: 0.2,
    footer: 0.2,
  };
  sheet.A1!.c = [{
    a: "MaarifOS",
    t: "Seçili dönem, öğrenciler ve sütunlar kullanılarak cihazda oluşturuldu. Kişisel veri içerir.",
  }];
  sheet.A1!.c.hidden = true;
  sheet[`A${CLASS_ROSTER_XLSX_HEADER_ROW}`]!.c = [{
    a: "MaarifOS",
    t: "Okul numarası, T.C. kimlik numarası ve telefon değerleri baştaki sıfırlar korunarak metin hücresi olarak yazılır.",
  }];
  sheet[`A${CLASS_ROSTER_XLSX_HEADER_ROW}`]!.c.hidden = true;

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, sheet, CLASS_ROSTER_XLSX_SHEET_NAME);
  const compactColumns = layout === "compact-contact" ? compactContactColumns(model) : [];
  const compactDataRows = layout === "compact-contact" ? compactContactRows(model, compactColumns) : [];
  const compactFormulaRows = layout === "compact-contact"
    ? compactContactFormulaRows(model, compactColumns)
    : [];
  const compactDataEndRow = CLASS_ROSTER_COMPACT_HEADER_ROW + compactDataRows.length;
  const compactSignatureRow = compactDataEndRow + 2;
  let compactLastColumn = "A";
  if (layout === "compact-contact") {
    const compactColumnCount = compactColumns.length;
    compactLastColumn = xlsx.utils.encode_col(compactColumnCount - 1);
    const compactSummary = `Sınıf: ${model.metadata.classroomName} · Eğitim yılı: ${model.metadata.academicYearLabel} · Öğrenci sayısı: ${model.metadata.studentCount}`;
    const compactContext = `Dönem: ${period} · Okul Öncesi Öğretmeni: ${model.metadata.teacherName} · Oluşturma: ${displayCivilDate(model.metadata.generatedCivilDate)}`;
    const compactSignature = `Okul Öncesi Öğretmeni: ${model.metadata.teacherName} · Tarih: ${displayCivilDate(model.metadata.generatedCivilDate)} · İmza: ____________________`;
    const compactRows = [
      fullWidthRow("KISA İLETİŞİM BASKISI", compactColumnCount),
      fullWidthRow(model.metadata.schoolName, compactColumnCount),
      fullWidthRow(compactSummary, compactColumnCount),
      fullWidthRow(compactContext, compactColumnCount),
      compactColumns.map((column) => column.label),
      ...compactDataRows,
      fullWidthRow("", compactColumnCount),
      fullWidthRow(compactSignature, compactColumnCount),
    ];
    const compactSheet = xlsx.utils.aoa_to_sheet(compactRows);
    compactRows.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
      const address = xlsx.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const dataRowIndex = rowIndex - CLASS_ROSTER_COMPACT_HEADER_ROW;
      const formula = dataRowIndex >= 0 && dataRowIndex < compactDataRows.length
        ? compactFormulaRows[dataRowIndex]?.[columnIndex]
        : undefined;
      const sequence = formula !== undefined && compactColumns[columnIndex]?.key === "sequence" &&
        /^[1-9]\d*$/u.test(value);
      compactSheet[address] = formula === undefined
        ? { t: "s", v: value }
        : sequence
          ? { t: "n", v: Number(value), f: formula }
          : { t: "s", v: value, f: formula };
    }));
    compactSheet["!ref"] = `A1:${compactLastColumn}${compactRows.length}`;
    compactSheet["!cols"] = compactColumns.map((column) => ({ wch: column.width }));
    compactSheet["!rows"] = [
      { hpt: 30 },
      { hpt: metadataRowHeight(model.metadata.schoolName, 120) },
      { hpt: metadataRowHeight(compactSummary, 120) },
      { hpt: metadataRowHeight(compactContext, 120) },
      { hpt: 38 },
      ...compactDataRows.map((row) => ({ hpt: compactRowHeight(row, compactColumns) })),
      { hpt: 10 },
      { hpt: metadataRowHeight(compactSignature, 120) },
    ];
    compactSheet["!merges"] = [0, 1, 2, 3, compactSignatureRow - 1].flatMap((row) =>
      compactColumnCount > 1 ? [{ s: { r: row, c: 0 }, e: { r: row, c: compactColumnCount - 1 } }] : []);
    compactSheet["!autofilter"] = {
      ref: `A${CLASS_ROSTER_COMPACT_HEADER_ROW}:${compactLastColumn}${Math.max(CLASS_ROSTER_COMPACT_HEADER_ROW, compactDataEndRow)}`,
    };
    compactSheet["!margins"] = {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.45,
      header: 0.2,
      footer: 0.2,
    };
    compactSheet.A1!.c = [{
      a: "MaarifOS",
      t: "Yalnız seçili kısa iletişim alanlarını gösterir. Tam seçili veri Sınıf listesi sayfasında korunur.",
    }];
    compactSheet.A1!.c.hidden = true;
    xlsx.utils.book_append_sheet(workbook, compactSheet, CLASS_ROSTER_COMPACT_XLSX_SHEET_NAME);
  }
  workbook.Props = {
    Title: layout === "compact-contact" ? "Kısa İletişim Baskısı" : "Sınıf Listesi",
    Subject: `${model.metadata.classroomName} · ${model.metadata.academicYearLabel}`,
    Author: "MaarifOS",
    LastAuthor: "MaarifOS",
    Company: model.metadata.schoolName,
    Category: "Sınıf yönetimi",
    Keywords: layout === "compact-contact"
      ? "sınıf listesi; kısa iletişim; veli iletişimi; yerel dışa aktarım"
      : "sınıf listesi; veli iletişimi; yerel dışa aktarım",
    Comments: `Seçili sütunlar ve ${model.metadata.studentCount} öğrenci için oluşturuldu. Kişisel veri içerir.`,
    CreatedDate: new Date(model.metadata.generatedAt),
    ModifiedDate: new Date(model.metadata.generatedAt),
  };
  workbook.Custprops = {
    "Belge türü": layout === "compact-contact" ? "Kısa iletişim baskısı" : "Sınıf listesi",
    "Eğitim yılı": model.metadata.academicYearLabel,
    "Sınıf": model.metadata.classroomName,
    "Öğrenci sayısı": model.metadata.studentCount,
    "Oluşturma tarihi": model.metadata.generatedCivilDate,
    "Dönem": period,
    "Baskı düzeni": layout === "single-page-roster"
      ? "A4 yatay, tek fiziksel sayfa"
      : layout === "compact-contact"
      ? "A4 yatay, 1 sayfa genişlik, otomatik sayfa yüksekliği"
      : `A4 ${print.orientation === "landscape" ? "yatay" : "dikey"}, ${print.fitToWidth} sayfa genişlik`,
  };
  workbook.Workbook = {
    Views: [{ RTL: false }],
    Names: layout === "compact-contact" ? [
      {
        Name: "_xlnm.Print_Titles",
        Sheet: 1,
        Ref: `'${CLASS_ROSTER_COMPACT_XLSX_SHEET_NAME}'!$1:$${CLASS_ROSTER_COMPACT_HEADER_ROW}`,
      },
      {
        Name: "_xlnm.Print_Area",
        Sheet: 1,
        Ref: `'${CLASS_ROSTER_COMPACT_XLSX_SHEET_NAME}'!$A$1:$${compactLastColumn}$${compactSignatureRow}`,
      },
    ] : [
      {
        Name: "_xlnm.Print_Titles",
        Sheet: 0,
        Ref: print.fitToWidth > 1
          ? `'${CLASS_ROSTER_XLSX_SHEET_NAME}'!$A:$${xlsx.utils.encode_col(print.contextColumns - 1)},'${CLASS_ROSTER_XLSX_SHEET_NAME}'!$1:$${CLASS_ROSTER_XLSX_HEADER_ROW}`
          : `'${CLASS_ROSTER_XLSX_SHEET_NAME}'!$1:$${CLASS_ROSTER_XLSX_HEADER_ROW}`,
      },
      {
        Name: "_xlnm.Print_Area",
        Sheet: 0,
        Ref: `'${CLASS_ROSTER_XLSX_SHEET_NAME}'!$A$1:$${lastColumn}$${lastRow}`,
      },
    ],
  };

  const purposePrint = purposeLayout ? appendPurposeSpreadsheet(xlsx, workbook, model, purposeLayout) : undefined;
  if (purposePrint) {
    workbook.Workbook!.Names!.push(
      { Name: "_xlnm.Print_Titles", Sheet: 1, Ref: `'${PURPOSE_SHEET_NAME}'!$1:$${purposePrint.repeatRows}` },
      { Name: "_xlnm.Print_Area", Sheet: 1, Ref: `'${PURPOSE_SHEET_NAME}'!$A$1:$${purposePrint.last}$${purposePrint.lastRow}` },
    );
  }
  const initialBytes = workbookBytes(xlsx.write(workbook, {
    type: "array",
    bookType: "xlsx",
    bookSST: true,
    cellStyles: true,
    compression: true,
  }));
  const archive = xlsx.CFB.read(initialBytes, { type: "array" });
  const sheetPath = "xl/worksheets/sheet1.xml";
  const sheetXml = professionalSheetXml(
    zipTextFile(xlsx, archive, sheetPath),
    model.columns,
  );
  replaceZipTextFile(xlsx, archive, sheetPath, sheetXml);
  if (layout === "compact-contact") {
    const compactSheetPath = "xl/worksheets/sheet2.xml";
    replaceZipTextFile(
      xlsx,
      archive,
      compactSheetPath,
      professionalCompactSheetXml(
        zipTextFile(xlsx, archive, compactSheetPath),
        compactColumns,
        compactDataEndRow,
        compactSignatureRow,
      ),
    );
    replaceZipTextFile(
      xlsx,
      archive,
      "xl/workbook.xml",
      automaticWorkbookCalculationXml(
        activeWorkbookSheetXml(zipTextFile(xlsx, archive, "xl/workbook.xml"), 1),
      ),
    );
  }
  if (purposePrint) {
    replaceZipTextFile(xlsx, archive, "xl/worksheets/sheet2.xml", purposeSheetXml(zipTextFile(xlsx, archive, "xl/worksheets/sheet2.xml"), purposePrint));
    replaceZipTextFile(xlsx, archive, "xl/workbook.xml", automaticWorkbookCalculationXml(activeWorkbookSheetXml(zipTextFile(xlsx, archive, "xl/workbook.xml"), 1)));
  }
  replaceZipTextFile(xlsx, archive, "xl/styles.xml", VIBRANT_STYLES_XML);
  const bytes = workbookBytes(xlsx.CFB.write(archive, {
    fileType: "zip",
    type: "array",
    compression: true,
  }));
  return {
    bytes,
    mimeType: CLASS_ROSTER_XLSX_MIME_TYPE,
    fileName: `MaarifOS_${layout === "compact-contact" ? "Kisa_Iletisim" : "Sinif_Listesi"}${purposeLayout ? `_${resolveClassRosterLayout(purposeLayout).fileSegment}` : ""}_${safeFileSegment(model.metadata.classroomName)}_${safeFileSegment(model.metadata.academicYearLabel)}.xlsx`,
  };
}
