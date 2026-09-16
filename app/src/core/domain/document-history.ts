import type { StoredRecord } from "./model.ts";
import { isCivilDate } from "./attendance.ts";
export const DOCUMENT_VERSION_SETTING_TYPE = "document-version" as const;
export const DOCUMENT_VERSION_MAX_BYTES = 2 * 1024 * 1024;
export const DOCUMENT_VERSION_KEYS = ["id", "createdAt", "updatedAt", "civilDate", "deletedAt", "schemaVersion", "settingType", "academicYearId", "classroomId", "studentIds", "revisionKey", "title", "selection", "fileName", "mimeType", "byteLength", "contentBase64", "sha256"] as const;
export interface DocumentVersionSelection {
  fields: string[]; studentIds?: string[]; template?: string; periodStart?: string; periodEnd?: string;
  appearance?: "color" | "ink-saving"; layout?: string;
}
export interface DocumentVersionRecord extends StoredRecord {
  settingType: typeof DOCUMENT_VERSION_SETTING_TYPE;
  academicYearId: string; classroomId: string; studentIds: string[];
  revisionKey: string; title: string; selection: DocumentVersionSelection;
  fileName: string; mimeType: "application/pdf"; byteLength: number; contentBase64: string; sha256: string;
}
const text = (v: unknown, max = 250): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 500 && v.every(s => text(s, 120)) && new Set(v).size === v.length;
export function isDocumentVersionRecord(record: StoredRecord): record is DocumentVersionRecord {
  if (Object.keys(record).some(key => !(DOCUMENT_VERSION_KEYS as readonly string[]).includes(key))) return false;
  if (record.settingType !== DOCUMENT_VERSION_SETTING_TYPE || !text(record.academicYearId) || !text(record.classroomId)
    || !strings(record.studentIds) || !text(record.title) || !text(record.revisionKey, 128) || !text(record.fileName)
    || /[\\/\u0000-\u001f]/u.test(record.fileName) || !record.fileName.endsWith(".pdf") || record.mimeType !== "application/pdf"
    || !Number.isInteger(record.byteLength) || (record.byteLength as number) < 5 || (record.byteLength as number) > DOCUMENT_VERSION_MAX_BYTES
    || typeof record.contentBase64 !== "string" || record.contentBase64.length !== Math.ceil((record.byteLength as number) / 3) * 4
    || !/^[A-Za-z0-9+/]+={0,2}$/u.test(record.contentBase64) || !/^JVBERi0/u.test(record.contentBase64)
    || typeof record.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(record.sha256)) return false;
  const selection = record.selection as DocumentVersionSelection | undefined;
  if (!selection || !strings(selection.fields) || !selection.fields.length || (selection.studentIds !== undefined && !strings(selection.studentIds))) return false;
  if (JSON.stringify(selection.studentIds ?? []) !== JSON.stringify(record.studentIds)) return false;
  if (Object.keys(selection).some(key => !["fields", "studentIds", "template", "periodStart", "periodEnd", "appearance", "layout"].includes(key))) return false;
  if ([selection.template, selection.layout].some(v => v !== undefined && !text(v, 120))) return false;
  if ([selection.periodStart, selection.periodEnd].some(v => v !== undefined && !isCivilDate(v))) return false;
  if ((selection.periodStart === undefined) !== (selection.periodEnd === undefined) || (selection.periodStart && selection.periodEnd && selection.periodStart > selection.periodEnd)) return false;
  return selection.appearance === undefined || ["color", "ink-saving"].includes(selection.appearance);
}
