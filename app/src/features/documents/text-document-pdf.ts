import { createSemanticTaggedPdf, type SemanticPdfNode, type SemanticTaggedPdfRuntime } from "./semantic-tagged-pdf.ts";
import type { BrowserFileDownload } from "./browser-file-download.ts";
import {
  TEACHER_DOCUMENT_THEME,
  TEACHER_PRINT_THEME,
  teacherDocumentRunningHeader,
  type TeacherDocumentContext,
} from "./document-theme.ts";

export interface TextPdfDocumentInput {
  readonly title: string;
  readonly fileName: string;
  readonly text: string;
  readonly context?: TeacherDocumentContext;
  readonly appearance?: "color" | "ink-saving";
}

function contextNodes(context: TeacherDocumentContext | undefined): SemanticPdfNode[] {
  if (!context) return [];
  return [
    context.schoolName ? `Okul: ${context.schoolName.trim()}` : "",
    context.classroomName ? `Sınıf: ${context.classroomName.trim()}` : "",
    context.periodLabel ? `Dönem: ${context.periodLabel.trim()}` : "",
  ].filter(Boolean).map(text => ({ kind: "paragraph", text, tone: "meta" }));
}

function httpSource(line: string): string | undefined {
  const matches = line.match(/https?:\/\/[^\s<>]+/giu) ?? [];
  if (matches.length !== 1) return undefined;
  const candidate = matches[0]!.replace(/[),.;:!?]+$/u, "");
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export async function createTextPdfDocument(input: TextPdfDocumentInput, runtime?: SemanticTaggedPdfRuntime): Promise<BrowserFileDownload> {
  if (!input.text.trim()) throw new Error("Boş belge PDF olarak üretilemez.");
  const nodes: SemanticPdfNode[] = [
    { kind: "heading", level: 1, text: input.title },
    ...contextNodes(input.context),
  ];
  const lines = input.text.split(/\r?\n/u).filter((line) => line.trim());
  if (lines[0]?.trim() === input.title.trim()) lines.shift();
  for (const line of lines) {
    if (!line.trim()) continue;
    const heading = line.length < 100 && /\p{L}/u.test(line) && line === line.toLocaleUpperCase("tr-TR");
    nodes.push(heading
      ? { kind: "heading", level: 2, text: line }
      : { kind: "paragraph", text: line, ...(httpSource(line) ? { href: httpSource(line) } : {}) });
  }
  const theme = input.appearance === "ink-saving" ? TEACHER_PRINT_THEME : TEACHER_DOCUMENT_THEME;
  return { bytes: await createSemanticTaggedPdf({
    title: input.title,
    language: "tr-TR",
    theme,
    nodes,
    artifactHeaderText: teacherDocumentRunningHeader(input.title, input.context),
    artifactHeaderOnFirstPage: false,
    includeTotalPages: true,
  }, runtime),
    fileName: input.fileName.replace(/\.(?:txt|html|md|pdf)$/iu, "") + ".pdf", mimeType: "application/pdf" };
}
