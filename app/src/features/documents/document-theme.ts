import type { SemanticPdfTheme } from "./semantic-tagged-pdf.ts";

/** Shared teacher-document palette. Colour never replaces written group labels. */
export const DOCUMENT_COLORS = Object.freeze({
  ink: "17324D", border: "607D91", teal: "42C7BD", blue: "72B7F2",
  coral: "F28C74", yellow: "F4C95D", tealTint: "CFEFEB", blueTint: "D7E8FF",
  coralTint: "FFE0D8", yellowTint: "FFF0C2", detail: "EAF8F5",
  paper: "FFFFFF", printInk: "172A3A", printBorder: "4B5963", printDetail: "F4F5F5",
});
const rgb = (hex: string): readonly [number, number, number] => [
  parseInt(hex.slice(0, 2), 16) / 255,
  parseInt(hex.slice(2, 4), 16) / 255,
  parseInt(hex.slice(4, 6), 16) / 255,
];
export const TEACHER_DOCUMENT_THEME: SemanticPdfTheme = Object.freeze({
  bodyColor: rgb(DOCUMENT_COLORS.ink), metaColor: rgb(DOCUMENT_COLORS.ink), headingColor: rgb(DOCUMENT_COLORS.ink),
  tableHeaderFill: rgb(DOCUMENT_COLORS.tealTint), tableHeaderColor: rgb(DOCUMENT_COLORS.ink),
  tableBorderColor: rgb(DOCUMENT_COLORS.border), tableDetailFill: rgb(DOCUMENT_COLORS.detail),
  headerGroupFills: [DOCUMENT_COLORS.teal, DOCUMENT_COLORS.blue, DOCUMENT_COLORS.coral, DOCUMENT_COLORS.yellow].map(rgb),
  headerGroupTints: [DOCUMENT_COLORS.tealTint, DOCUMENT_COLORS.blueTint, DOCUMENT_COLORS.coralTint, DOCUMENT_COLORS.yellowTint].map(rgb),
  headerGroupTextColor: rgb(DOCUMENT_COLORS.ink), boldHeadings: true,
});

/** Low-ink alternative. Written labels and dark rules keep groups distinct in grayscale. */
export const TEACHER_PRINT_THEME: SemanticPdfTheme = Object.freeze({
  bodyColor: rgb(DOCUMENT_COLORS.printInk),
  metaColor: rgb(DOCUMENT_COLORS.printInk),
  headingColor: rgb(DOCUMENT_COLORS.printInk),
  tableHeaderFill: rgb(DOCUMENT_COLORS.paper),
  tableHeaderColor: rgb(DOCUMENT_COLORS.printInk),
  tableBorderColor: rgb(DOCUMENT_COLORS.printBorder),
  tableDetailFill: rgb(DOCUMENT_COLORS.printDetail),
  headerGroupFills: [
    DOCUMENT_COLORS.paper,
    DOCUMENT_COLORS.printDetail,
    DOCUMENT_COLORS.paper,
    DOCUMENT_COLORS.printDetail,
  ].map(rgb),
  headerGroupTints: [
    DOCUMENT_COLORS.paper,
    DOCUMENT_COLORS.printDetail,
    DOCUMENT_COLORS.paper,
    DOCUMENT_COLORS.printDetail,
  ].map(rgb),
  headerGroupTextColor: rgb(DOCUMENT_COLORS.printInk),
  boldHeadings: true,
});

export interface TeacherDocumentContext {
  readonly schoolName?: string;
  readonly classroomName?: string;
  readonly periodLabel?: string;
}

function cleanContextPart(value: string | undefined): string | null {
  const clean = value?.replace(/\s+/gu, " ").trim();
  return clean ? clean : null;
}

/** Compact repeated identity; the document title remains the visible H1 on page one. */
export function teacherDocumentRunningHeader(
  title: string,
  context: TeacherDocumentContext = {},
): string {
  const parts = [
    cleanContextPart(title),
    cleanContextPart(context.schoolName),
    cleanContextPart(context.classroomName),
    cleanContextPart(context.periodLabel),
  ].filter((part): part is string => part !== null);
  return [...new Set(parts)].join(" · ");
}
