import { CLASS_ROSTER_COLUMNS, CLASS_ROSTER_IDENTITY_COLUMN_IDS, CLASS_ROSTER_PRESETS, resolveClassRosterColumns, type ClassRosterColumn, type ClassRosterColumnId } from "./class-roster-columns.ts";
import { CLASS_ROSTER_LAYOUTS, isClassRosterLayoutId, resolveClassRosterLayout, type ClassRosterLayoutId } from "./class-roster-layouts.ts";
import { TEACHER_DOCUMENT_THEME, TEACHER_PRINT_THEME } from "../documents/document-theme.ts";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { isCivilDate } from "../../core/domain/attendance.ts";
import { studentMembershipOverlaps } from "../../core/domain/student-membership.ts";
import { turkishDocumentAddress, turkishDocumentDescription, turkishDocumentName } from "../../core/domain/turkish-document-display.ts";
import { activeSchoolDocumentTemplate, isSchoolDocumentTemplate, schoolDocumentTemplateRecords, type SchoolDocumentTemplate } from "../../core/domain/school-document-template.ts";
import { createSchoolStyledPdf, schoolTemplateSignatureNodes } from "../school-document-template/school-document-template-pdf.ts";
import { registerPdfPreviewRecipe, validatePdfSelection, type PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import {
  semanticTaggedPdfPageCount,
  type SemanticPdfNode,
  type SemanticPdfTheme,
  type SemanticTaggedPdfRuntime,
} from "../documents/semantic-tagged-pdf.ts";

export const CLASS_ROSTER_DOCUMENT_FORMAT = "html" as const;
export const CLASS_ROSTER_DOCUMENT_MIME_TYPE = "text/html;charset=utf-8" as const;
export const CLASS_ROSTER_HTML_FILE_SIGNATURE = "<!doctype html>" as const;
export const CLASS_ROSTER_DOCUMENT_KIND = "class-roster" as const;
export const CLASS_ROSTER_PDF_FORMAT = "pdf" as const;
export const CLASS_ROSTER_PDF_MIME_TYPE = "application/pdf" as const;
export const CLASS_ROSTER_PDF_FILE_SIGNATURE = "%PDF-" as const;
export const CLASS_ROSTER_VIBRANT_THEME: SemanticPdfTheme = TEACHER_DOCUMENT_THEME;
const rosterGroupColorIndex = (label: string) => ({"Öğrencinin":0,"Annenin":1,"Babanın":2,"Aranacak 3. kişinin":3}[label] ?? 0);

/**
 * Bu kabiliyetler üretilen gerçek baytları tarif eder. HTML dosyasını PDF diye
 * etiketlemez ve cihazda bulunup bulunmadığı bilinmeyen paylaşım API'sini vaat
 * etmez.
 */
export const CLASS_ROSTER_DOCUMENT_CAPABILITIES = Object.freeze({
  preview: "local-html" as const,
  download: "html-file" as const,
  print: "browser-dialog-after-open" as const,
  share: "platform-dependent" as const,
  pdf: "not-generated" as const,
});

export const CLASS_ROSTER_PDF_CAPABILITIES = Object.freeze({
  preview: "local-pdf" as const,
  download: "pdf-file" as const,
  print: "pdf-viewer" as const,
  share: "web-share-file-with-download-fallback" as const,
  pdf: "generated" as const,
});

export interface ClassRosterDocumentInput {
  readonly scope: ActiveClassroomScope;
  readonly snapshot: Pick<DataSnapshot, "academicYears" | "classrooms" | "students"> & Partial<Pick<DataSnapshot, "settings">>;
  readonly schoolTemplate?: SchoolDocumentTemplate | null;
  readonly schoolName: string;
  readonly teacherName: string;
  /** UTC ISO-8601. Varsayılan, üretim anıdır. */
  readonly generatedAt?: string;
  readonly studentIds?: readonly string[];
  readonly period?: { readonly start: string; readonly end: string };
  readonly template?: "contact-list" | "student-record" | "emergency-card";
  readonly fields?: readonly ("identity" | "contacts" | "address" | "care")[];
  readonly columns?: readonly ClassRosterColumnId[];
  /** Purpose-built roster layout. Omission preserves the established table document. */
  readonly layout?: ClassRosterLayoutId;
}

export interface ClassRosterDocumentFile {
  readonly documentKind: typeof CLASS_ROSTER_DOCUMENT_KIND;
  readonly format: typeof CLASS_ROSTER_DOCUMENT_FORMAT;
  readonly fileName: string;
  readonly mimeType: typeof CLASS_ROSTER_DOCUMENT_MIME_TYPE;
  readonly bytes: Uint8Array;
  readonly html: string;
  readonly rowCount: number;
  readonly pageCount: number;
  readonly containsSensitiveData: true;
  readonly capabilities: typeof CLASS_ROSTER_DOCUMENT_CAPABILITIES;
  readonly generatedAt: string;
  readonly generatedCivilDate: string;
  readonly scope: ActiveClassroomScope;
}

export interface ClassRosterPdfRuntime extends SemanticTaggedPdfRuntime {
  readonly createCanvas?: () => HTMLCanvasElement;
  readonly waitForFonts?: () => Promise<void>;
}

export interface ClassRosterPdfDocumentFile {
  readonly documentKind: typeof CLASS_ROSTER_DOCUMENT_KIND;
  readonly format: typeof CLASS_ROSTER_PDF_FORMAT;
  readonly fileName: string;
  readonly mimeType: typeof CLASS_ROSTER_PDF_MIME_TYPE;
  readonly bytes: Uint8Array;
  /** Aynı doğrulanmış satırların yerel, dış kaynaksız HTML önizlemesi. */
  readonly html: string;
  readonly htmlFileName: string;
  readonly rowCount: number;
  readonly pageCount: number;
  readonly containsSensitiveData: true;
  readonly capabilities: typeof CLASS_ROSTER_PDF_CAPABILITIES;
  readonly generatedAt: string;
  readonly generatedCivilDate: string;
  readonly scope: ActiveClassroomScope;
}

export interface ClassRosterPdfDocumentOutputContract {
  readonly metadata: Readonly<{
    documentKind: typeof CLASS_ROSTER_DOCUMENT_KIND;
    format: typeof CLASS_ROSTER_PDF_FORMAT;
    rowCount: number;
    pageCount: number;
    generatedAt: string;
    generatedCivilDate: string;
    containsSensitiveData: true;
  }>;
  readonly preview: Readonly<{
    kind: "local-pdf";
    title: string;
    html: string;
    bytes: Uint8Array;
    mimeType: typeof CLASS_ROSTER_PDF_MIME_TYPE;
  }>;
  readonly download: Readonly<{
    kind: "pdf-file";
    fileName: string;
    mimeType: typeof CLASS_ROSTER_PDF_MIME_TYPE;
    bytes: Uint8Array;
  }>;
  readonly capabilities: typeof CLASS_ROSTER_PDF_CAPABILITIES;
}

export interface ClassRosterDocumentOutputContract {
  readonly metadata: Readonly<{
    documentKind: typeof CLASS_ROSTER_DOCUMENT_KIND;
    format: typeof CLASS_ROSTER_DOCUMENT_FORMAT;
    rowCount: number;
    pageCount: number;
    generatedAt: string;
    generatedCivilDate: string;
    containsSensitiveData: true;
  }>;
  readonly preview: Readonly<{
    kind: "local-html";
    title: string;
    html: string;
    mimeType: typeof CLASS_ROSTER_DOCUMENT_MIME_TYPE;
  }>;
  readonly download: Readonly<{
    kind: "html-file";
    fileName: string;
    mimeType: typeof CLASS_ROSTER_DOCUMENT_MIME_TYPE;
    bytes: Uint8Array;
  }>;
  readonly capabilities: typeof CLASS_ROSTER_DOCUMENT_CAPABILITIES;
}

const TURKISH_TIME_ZONE = "Europe/Istanbul" as const;
const encoder = new TextEncoder();
const turkishNameCollator = new Intl.Collator("tr-TR", {
  sensitivity: "base",
  numeric: true,
  usage: "sort",
});

function nonEmptyText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function requireText(value: string, label: string): string {
  if (!value.trim()) throw new Error(`${label} boş bırakılamaz.`);
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeFileSegment(value: string): string {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]/gu, "-")
      .replace(/\s+/gu, "_")
      .slice(0, 64) || "Sinif"
  );
}

function generatedDateParts(generatedAt: string): {
  civilDate: string;
  displayDate: string;
} {
  const instant = new Date(generatedAt);
  if (Number.isNaN(instant.getTime()) || instant.toISOString() !== generatedAt) {
    throw new Error("Belge üretim zamanı UTC ISO-8601 biçiminde olmalıdır.");
  }
  const civilDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: TURKISH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  const displayDate = new Intl.DateTimeFormat("tr-TR", {
    timeZone: TURKISH_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(instant);
  return { civilDate, displayDate };
}

function recordIsInActiveScope(
  student: StoredRecord,
  scope: ActiveClassroomScope,
): boolean {
  if (
    typeof student.deletedAt === "string" ||
    student.active === false ||
    student.enrollmentStatus === "left" ||
    student.legacyAssignmentStatus === "needs-review"
  ) {
    return false;
  }
  if (
    student.academicYearId === scope.academicYearId &&
    student.classroomId === scope.classroomId
  ) {
    return true;
  }
  if (!Array.isArray(student.enrollments)) return false;
  return student.enrollments.some((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return false;
    }
    const enrollment = candidate as Record<string, unknown>;
    return (
      enrollment.academicYearId === scope.academicYearId &&
      enrollment.classroomId === scope.classroomId &&
      enrollment.status === "active"
    );
  });
}

export const CLASS_ROSTER_TEACHER_TITLE = "Okul Öncesi Öğretmeni" as const;

interface RosterContact {
  readonly kind: "mother" | "father" | "other";
  readonly name: string;
  readonly relationship: string;
  readonly phone: string;
  readonly occupation: string;
  readonly permissions: string;
  readonly priority: boolean;
  readonly emergency: boolean;
  readonly pickup: boolean;
}

interface RosterRow {
  readonly id: string;
  readonly studentNumber: string;
  readonly fullName: string;
  readonly nationalIdentityNumber: string;
  readonly birthDate: string;
  readonly enrollmentYear: string;
  readonly homeAddress: string;
  readonly contacts: readonly RosterContact[];
}

function contactsFromStudent(student: StoredRecord): RosterContact[] {
  if (!Array.isArray(student.contacts)) return [];
  return student.contacts.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
    const contact = candidate as Record<string, unknown>;
    const name = nonEmptyText(contact.name);
    const relationship = nonEmptyText(contact.relationship);
    const phone = nonEmptyText(contact.phone);
    const occupation = nonEmptyText(contact.occupation);
    if (!name && !relationship && !phone && !occupation) return [];
    // Old imports did not always have kind; retain their explicit relationship.
    const legacyKind = relationship?.trim().toLocaleLowerCase("tr-TR");
    const kind = contact.kind === "mother" || contact.kind === "father" || contact.kind === "other"
      ? contact.kind
      : legacyKind?.startsWith("anne") ? "mother"
        : legacyKind?.startsWith("baba") ? "father" : "other";
    return [{
      kind,
      name: name ? turkishDocumentName(name) : "—",
      relationship: relationship ? turkishDocumentDescription(relationship) : (kind === "mother" ? "Anne" : kind === "father" ? "Baba" : "—"),
      phone: phone ?? "—",
      occupation: occupation ? turkishDocumentDescription(occupation) : "—",
      priority: contact.isPrimary === true,
      emergency: contact.isEmergencyContact === true,
      pickup: contact.isAuthorizedPickup === true,
      permissions: [
        contact.isPrimary === true ? "Öncelikli iletişim" : "",
        contact.isEmergencyContact === true ? "Acil iletişim" : "",
        contact.isAuthorizedPickup === true ? "Teslim yetkili" : "",
      ].filter(Boolean).join(" · "),
    }];
  });
}

function rosterRows(students: readonly StoredRecord[], scope: ActiveClassroomScope): RosterRow[] {
  return students.filter((student) => recordIsInActiveScope(student, scope)).map((student) => {
    const care = student.careDetails && typeof student.careDetails === "object"
      ? student.careDetails as Record<string, unknown> : {};
    const birthDate = nonEmptyText(student.birthDate) ?? "—";
    return {
      id: student.id,
      studentNumber: nonEmptyText(student.optionalCode) ?? "—",
      fullName: turkishDocumentName(nonEmptyText(student.displayName) ?? "Adı girilmemiş öğrenci"),
      nationalIdentityNumber: nonEmptyText(student.nationalIdentityNumber) ?? "—",
      birthDate: /^\d{4}-\d{2}-\d{2}$/u.test(birthDate) ? birthDate.split("-").reverse().join(".") : birthDate,
      enrollmentYear: nonEmptyText(student.enrollmentYear) ?? nonEmptyText(student.enrollmentDate)?.slice(0, 4) ?? "—",
      homeAddress: turkishDocumentAddress(nonEmptyText(care.homeAddress) ?? "—"),
      contacts: contactsFromStudent(student),
    };
  }).sort((left, right) => turkishNameCollator.compare(left.fullName, right.fullName) || turkishNameCollator.compare(left.id, right.id));
}

interface RosterTable {
  readonly kind: "parents" | "details";
  readonly title: string;
  readonly description: string;
  readonly headers: readonly string[];
  readonly widths: readonly number[];
  readonly rows: readonly (readonly string[])[];
  readonly groups?: readonly { label: string; columns: number }[];
  readonly rowDetails?: readonly (string | null)[];
  readonly columnIds?: readonly ClassRosterColumnId[];
  readonly studentKeys?: readonly string[];
  readonly contextColumns?: readonly number[];
  readonly rowGroupColumn?: number;
}

function contactColumn(contact: RosterContact | undefined, field: "name" | "relationship" | "phone" | "occupation"): string {
  if (!contact) return "—";
  const kind = contact.kind;
  if (field === "name" && kind !== "other") {
    const usualRelationship = kind === "mother" ? "anne" : "baba";
    return [contact.name, contact.relationship.trim().toLocaleLowerCase("tr-TR") === usualRelationship ? "" : contact.relationship, contact.permissions].filter(Boolean).join("\n");
  }
  if (field === "relationship" && kind === "other") {
    return [contact.relationship, contact.permissions].filter(Boolean).join("\n");
  }
  return contact[field];
}

interface ProjectedRosterRow { readonly studentId: string; readonly cells: Readonly<Record<ClassRosterColumnId, string>>; }

/** This is the only value projection used by PDF, HTML and XLSX. */
function projectRosterRows(rows: readonly RosterRow[], columns: readonly ClassRosterColumn[]): ProjectedRosterRow[] {
  const hasRoleFields = (role: "mother" | "father" | "other") => columns.some(column => column.id.startsWith(role));
  return rows.flatMap((row, index) => {
    const mothers = row.contacts.filter(contact => contact.kind === "mother");
    const fathers = row.contacts.filter(contact => contact.kind === "father");
    const others = row.contacts.filter(contact => contact.kind === "other");
    const role = (kind: RosterContact["kind"], ordinal: number) => `${kind === "mother" ? "Anne" : kind === "father" ? "Baba" : "3. kişi"}${ordinal ? ` ${ordinal + 1}` : ""}`;
    const flags = (key: "priority" | "emergency" | "pickup") => ([mothers, fathers, others].flatMap(list => list.flatMap((contact, ordinal) => contact[key] ? [role(contact.kind, ordinal)] : []))).join(" · ") || "—";
    return Array.from({ length: Math.max(1, hasRoleFields("mother") ? mothers.length : 0, hasRoleFields("father") ? fathers.length : 0, hasRoleFields("other") ? others.length : 0) }, (_, contactIndex) => {
      const mother = mothers[contactIndex], father = fathers[contactIndex], other = others[contactIndex];
      const value = (contact: RosterContact | undefined, key: "name" | "phone" | "occupation" | "relationship") => contact?.[key] ?? (contactIndex ? "" : "—");
      return { studentId: row.id, cells: {
        sequence: String(index + 1), schoolNumber: row.studentNumber, name: row.fullName,
        nationalId: row.nationalIdentityNumber, birthDate: row.birthDate, enrollmentYear: contactIndex ? "" : row.enrollmentYear,
        motherName: value(mother,"name"), motherPhone: value(mother,"phone"), motherOccupation: value(mother,"occupation"),
        fatherName: value(father,"name"), fatherPhone: value(father,"phone"), fatherOccupation: value(father,"occupation"),
        otherName: value(other,"name"), otherPhone: value(other,"phone"), otherRelationship: value(other,"relationship"), otherOccupation: value(other,"occupation"),
        priorityContact: contactIndex ? "" : flags("priority"), emergencyContact: contactIndex ? "" : flags("emergency"), pickupAuthorization: contactIndex ? "" : flags("pickup"),
        address: contactIndex ? "" : row.homeAddress,
      } };
    });
  });
}

const DETAIL_COLUMN_IDS: readonly ClassRosterColumnId[] = ["enrollmentYear", "otherOccupation", "priorityContact", "emergencyContact", "pickupAuthorization", "address"];
const COLUMN_WIDTHS: Readonly<Record<ClassRosterColumnId, number>> = { sequence:10,schoolNumber:18,name:27,nationalId:26,birthDate:23,enrollmentYear:20,motherName:22,motherPhone:30,motherOccupation:22,fatherName:22,fatherPhone:30,fatherOccupation:22,otherName:22,otherPhone:30,otherRelationship:20,otherOccupation:30,priorityContact:35,emergencyContact:35,pickupAuthorization:35,address:100 };
function documentColumnLabel(column: ClassRosterColumn): string {
  if (column.id === "sequence") return "Sıra no.";
  if (column.id === "schoolNumber") return "Okul no.";
  if (column.id === "nationalId") return "T.C. kimlik no.";
  return column.label.replace(" (kişinin rolü)", "");
}
function detailBand(columns: readonly ClassRosterColumn[], source: readonly ProjectedRosterRow[]): string | null {
  const flags = new Set<ClassRosterColumnId>(["priorityContact","emergencyContact","pickupAuthorization"]);
  const pair = (column:ClassRosterColumn) => `${documentColumnLabel(column)}: ${(column.id === "otherOccupation" ? source : source.slice(0,1)).map(row => row.cells[column.id]).filter(Boolean).join(" / ") || "—"}`;
  const lines = [columns.filter(column=>column.id!=="address"&&!flags.has(column.id)).map(pair).join(" · "),
    columns.filter(column=>flags.has(column.id)).map(pair).join(" · "),
    columns.filter(column=>column.id==="address").map(pair).join("\n")].filter(Boolean);
  return lines.length ? lines.join("\n") : null;
}

function selectedRosterTables(rows: readonly RosterRow[], columns: readonly ClassRosterColumn[], portrait = false): RosterTable[] {
  const projected = projectRosterRows(rows, columns);
  const selectedIds = columns.map(column => column.id);
  const contactColumns = columns.filter(column => /^(mother|father|other)/u.test(column.id));
  const mainColumns = columns.filter(column => !DETAIL_COLUMN_IDS.includes(column.id));
  const tableColumns = mainColumns.length ? mainColumns : columns;
  const detailColumns = mainColumns.length ? columns.filter(column => DETAIL_COLUMN_IDS.includes(column.id)) : [];
  const tableRows: string[][] = [], rowDetails: (string|null)[] = [], studentKeys: string[] = [];
  const contexts = columns.filter(column => ["sequence","schoolNumber","name"].includes(column.id));
  const portraitContacts = portrait && contactColumns.length > 0;
  if (portraitContacts) {
    const hasName = contactColumns.some(column => column.id.endsWith("Name"));
    const hasPhone = contactColumns.some(column => column.id.endsWith("Phone"));
    const hasOccupation = contactColumns.some(column => column.id.endsWith("Occupation"));
    const hasRelationship = selectedIds.includes("otherRelationship");
    rows.forEach(row => {
      const source = projected.filter(record => record.studentId === row.id);
      const context = contexts.map(column => `${column.label}: ${source[0]!.cells[column.id]}`).join("\n");
      const childRows: string[][] = [];
      source.forEach((record, contactIndex) => {
        for (const kind of ["mother","father","other"] as const) {
          const ids = [`${kind}Name`,`${kind}Phone`,`${kind}Occupation`,...(kind === "other" ? ["otherRelationship"] : [])] as ClassRosterColumnId[];
          if (!ids.some(id => selectedIds.includes(id) && record.cells[id] && record.cells[id] !== "—")) continue;
          const role = kind === "mother" ? "Anne" : kind === "father" ? "Baba" : `3. kişi${contactIndex ? ` ${contactIndex + 1}` : ""}`;
          childRows.push([...(contexts.length ? [context] : []), role,
            ...(hasName ? [selectedIds.includes(`${kind}Name`) ? record.cells[`${kind}Name`] : ""] : []),
            ...(hasPhone ? [selectedIds.includes(`${kind}Phone`) ? record.cells[`${kind}Phone`] : ""] : []),
            ...(hasOccupation || hasRelationship ? [[selectedIds.includes(`${kind}Occupation`) ? record.cells[`${kind}Occupation`] : "", kind === "other" && hasRelationship ? record.cells.otherRelationship : ""].filter(Boolean).join("\n")] : []),
          ]);
        }
      });
      if (!childRows.length) childRows.push([...(contexts.length ? [context] : []),"—",...(hasName?["—"]:[]),...(hasPhone?["—"]:[]),...(hasOccupation||hasRelationship?["—"]:[])]);
      const bandColumns = columns.filter(column => !contexts.includes(column) && !contactColumns.includes(column));
      tableRows.push(...childRows); studentKeys.push(...childRows.map(()=>row.id));
      rowDetails.push(...childRows.map((_, index) => index === childRows.length - 1 ? detailBand(bandColumns, source) : null));
    });
    return [{kind:"parents",title:"Öğrenci ve veli iletişim çizelgesi",description:"Her çocuğun yalnız seçilmiş bilgileri aynı blokta gösterilir; diğer yakınlar devam eder.",
      headers:[...(contexts.length?["Öğrenci"]:[]),"Yakını",...(hasName?["Adı soyadı"]:[]),...(hasPhone?["Telefonu"]:[]),...(hasOccupation||hasRelationship?["Mesleği / ünvanı"]:[])],
      widths:[...(contexts.length?[48]:[]),22,...(hasName?[38]:[]),...(hasPhone?[38]:[]),...(hasOccupation||hasRelationship?[44]:[])],
      rows:tableRows,rowDetails,studentKeys,contextColumns:contexts.length?[0]:[],rowGroupColumn:contexts.length?0:undefined }];
  }
  rows.forEach(row => {
    const source = projected.filter(record => record.studentId === row.id);
    // With no selected contact column, no extra-contact continuation rows are necessary.
    const contactRows = tableColumns.some(column => /^(mother|father|other)/u.test(column.id)) ? source : source.slice(0,1);
    tableRows.push(...contactRows.map((record, contactIndex) => tableColumns.map(column => contactIndex > 0 && ["schoolNumber","nationalId","birthDate"].includes(column.id) ? "" : record.cells[column.id])));
    studentKeys.push(...contactRows.map(()=>row.id));
    rowDetails.push(...contactRows.map((_,index) => index === contactRows.length-1 ? detailBand(detailColumns,source) : null));
  });
  const groups: {label:string;columns:number}[] = [];
  for (const column of tableColumns) {
    const group = column.group === "Öğrenci" ? "Öğrencinin" : column.group === "Anne" ? "Annenin" : column.group === "Baba" ? "Babanın" : column.group === "Diğer yakınlar" ? "Aranacak 3. kişinin" : column.group;
    if (groups.at(-1)?.label === group) groups.at(-1)!.columns++; else groups.push({label:group,columns:1});
  }
  const contextColumns = tableColumns.flatMap((column,index) => contexts.includes(column)?[index]:[]);
  return [{kind:"parents",title:"Öğrenci ve veli iletişim çizelgesi",description:"Yalnız seçilen alanlar basılır. Kayıt, iletişim yetkileri ve adres ilgili çocuğun altında yer alır.",
    headers:tableColumns.map(column=>groups.length>1 && ["Anne","Baba","Diğer yakınlar"].includes(column.group) ? column.label.replace(/^(?:Anne|Baba|3\. kişi) /u, "").replace(/^adı/u,"Adı").replace(/^telefonu/u,"Telefonu").replace(/^mesleği/u,"Mesleği").replace(/^yakınlığı/u,"Yakınlığı") : documentColumnLabel(column)),columnIds:tableColumns.map(column=>column.id),widths:tableColumns.map(column=>COLUMN_WIDTHS[column.id]),rows:tableRows,rowDetails,studentKeys,
    groups:groups.length>1?groups:undefined,contextColumns,rowGroupColumn:tableColumns.some(column=>column.id==="sequence") ? tableColumns.findIndex(column=>column.id==="sequence") : tableColumns.some(column=>column.id==="name") ? tableColumns.findIndex(column=>column.id==="name") : undefined}];
}

function rosterColumnLabel(table: RosterTable, index: number): string { return table.columnIds ? CLASS_ROSTER_COLUMNS.find(column=>column.id===table.columnIds![index])!.label : table.headers[index]!; }

interface RosterPage { readonly table: RosterTable; readonly rows: readonly (readonly string[])[]; }

function estimatedRowHeight(row: readonly string[], table: RosterTable, pageWidthMm = 277): number {
  const weight = table.widths.reduce((total, value) => total + value, 0);
  const lines = row.map((value, index) => {
    const widthMm = pageWidthMm * table.widths[index]! / weight - 3.2;
    const characters = Math.max(2, Math.floor(widthMm / 1.48));
    return value.split("\n").reduce((count, line) => count + Math.max(1, Math.ceil(line.length / characters)), 0);
  });
  const detail = table.rowDetails?.[table.rows.indexOf(row)];
  const detailCharacters = Math.max(2, Math.floor((pageWidthMm - 3.2) / 1.48));
  const detailHeight = detail ? 3.2 + detail.split("\n").reduce((count, line) => count + Math.max(1, Math.ceil(line.length / detailCharacters)), 0) * 3.8 : 0;
  return Math.max(8, 3.2 + Math.max(...lines) * 3.8) + detailHeight;
}

/** Balanced, conservative A4 pagination; never clip or truncate cell values. */
function paginateRosterRows(table: RosterTable, pageWidthMm = 277, customCapacity?: number): RosterPage[] {
  if (!table.rows.length) return [{ table, rows: [] }];
  const capacity = customCapacity ?? (table.kind === "parents" ? 110 : 129);
  const groups: { rows: (readonly string[])[]; height: number }[] = [];
  table.rows.forEach((row) => {
    const height = estimatedRowHeight(row, table, pageWidthMm);
    const previous = groups.at(-1);
    if (previous && table.studentKeys?.[table.rows.indexOf(previous.rows[0]!)] === table.studentKeys?.[table.rows.indexOf(row)] && previous.height + height <= capacity) {
      previous.rows.push(row); previous.height += height;
    } else groups.push({ rows: [row], height });
  });
  const pages: RosterPage[] = [];
  let start = 0;
  while (start < groups.length) {
    let used = 0;
    let end = start;
    while (end < groups.length && (end === start || used + groups[end]!.height + (table.kind === "details" && end === groups.length - 1 ? 22 : 0) <= capacity)) {
      used += groups[end]!.height;
      end += 1;
    }
    pages.push({ table, rows: groups.slice(start, end).flatMap((group) => group.rows) });
    start = end;
  }
  for (let pageIndex = pages.length - 1; pageIndex > 0; pageIndex -= 1) {
    const previousRows = [...pages[pageIndex - 1]!.rows];
    const currentRows = [...pages[pageIndex]!.rows];
    const currentCapacity = capacity - (table.kind === "details" && pageIndex === pages.length - 1 ? 22 : 0);
    let previousHeight = previousRows.reduce((sum, row) => sum + estimatedRowHeight(row, table, pageWidthMm), 0);
    let currentHeight = currentRows.reduce((sum, row) => sum + estimatedRowHeight(row, table, pageWidthMm), 0);
    while (previousRows.length > 1) {
      const row = previousRows.at(-1)!;
      const firstGroupRow = previousRows.findIndex((candidate) => table.studentKeys?.[table.rows.indexOf(candidate)] === table.studentKeys?.[table.rows.indexOf(row)]);
      if (firstGroupRow === 0) break;
      const movedRows = previousRows.slice(firstGroupRow);
      const height = movedRows.reduce((sum, candidate) => sum + estimatedRowHeight(candidate, table, pageWidthMm), 0);
      const before = Math.abs(previousHeight / capacity - currentHeight / currentCapacity);
      const after = Math.abs((previousHeight - height) / capacity - (currentHeight + height) / currentCapacity);
      if (currentHeight + height > currentCapacity || after >= before) break;
      previousRows.splice(firstGroupRow); currentRows.unshift(...movedRows); previousHeight -= height; currentHeight += height;
    }
    pages[pageIndex - 1] = { table, rows: previousRows };
    pages[pageIndex] = { table, rows: currentRows };
  }
  return pages;
}

function buildHtml(options: ResolvedClassRosterDocumentInput): { html: string; pageCount: number } {
  const style = options.schoolTemplate;
  const orientation = style?.orientation === "portrait" ? "portrait" : "landscape";
  const bannerMm = (style?.logo ? 24 : 0) + (style?.headerLines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / (orientation === "portrait" ? 75 : 115))) * 5, 0) ?? 0);
  const pages = selectedRosterTables(options.rows, options.columns, orientation === "portrait").flatMap(table => paginateRosterRows(table, orientation === "portrait" ? 190 : 277, style ? (orientation === "portrait" ? 205 : 115) - bannerMm : undefined));
  const banner = style ? `<div class="school-banner school-banner--${style.layout}">${style.logo ? `<img class="school-logo" src="${escapeHtml(style.logo.dataUrl)}" alt="Okul logosu">` : ""}${style.headerLines.map(line => `<p>${escapeHtml(line)}</p>`).join("")}</div>` : "";
  const pageMarkup = pages.map(({ table, rows }, pageIndex) => {
    const isLast = pageIndex === pages.length - 1;
    const weight = table.widths.reduce((total, value) => total + value, 0);
    return `<section class="roster-page${isLast ? " roster-page--last" : ""}" data-section="${table.kind}" data-row-count="${rows.length}">
      ${pageIndex === 0 ? banner : ""}<header class="document-heading-row"><div class="document-heading"><div><p class="institution">${escapeHtml(options.schoolName)}</p><h1>Sınıf Listesi</h1></div><div><p class="student-count">Öğrenci sayısı: ${options.rows.length}</p></div></div></header>
      <div class="document-meta-row"><div class="document-meta"><span><b>Sınıf:</b> ${escapeHtml(options.classroomName)}</span><span><b>Eğitim yılı:</b> ${escapeHtml(options.academicYearLabel)}</span>${options.ageGroup ? `<span><b>Yaş grubu:</b> ${escapeHtml(options.ageGroup)}</span>` : ""}<span><b>Düzenleme tarihi:</b> ${escapeHtml(options.displayDate)}</span></div></div>
      <table aria-label="${escapeHtml(table.title)}"><colgroup>${table.widths.map((width) => `<col style="width:${(width / weight * 100).toFixed(3)}%">`).join("")}</colgroup><thead>${table.groups ? `<tr class="group-head">${table.groups.map(group => `<th scope="colgroup" style="background:${["#42C7BD","#72B7F2","#F28C74","#F4C95D"][rosterGroupColorIndex(group.label)]}" colspan="${group.columns}">${escapeHtml(group.label)}</th>`).join("")}</tr>` : ""}<tr class="column-head">${table.headers.map((heading,index) => `<th scope="col" style="background:${["#CFEFEB","#D7E8FF","#FFE0D8","#FFF0C2"][(table.groups?.flatMap(group => Array(group.columns).fill(rosterGroupColorIndex(group.label))) ?? [])[index] ?? 0]}">${escapeHtml(heading)}</th>`).join("")}</tr></thead>
      <tbody>${rows.length ? rows.map((row, rowIndex) => `<tr data-student-sequence="${table.columnIds?.includes("sequence") ? row[table.columnIds.indexOf("sequence")] : ""}" class="${rowIndex === 0 || table.studentKeys?.[table.rows.indexOf(rows[rowIndex - 1]!)] !== table.studentKeys?.[table.rows.indexOf(row)] ? "student-group-start" : "student-group-continuation"}">${row.map((value, index) => `<td class="${table.columnIds?.[index] === "name" ? "student-name" : "roster-cell"}" data-label="${escapeHtml(rosterColumnLabel(table, index))}"><div class="cell-value">${value === "—" ? '<span class="empty-value">—</span>' : escapeHtml(value)}</div></td>`).join("")}</tr>${table.rowDetails?.[table.rows.indexOf(row)] ? `<tr class="student-detail-band" data-student-sequence="${table.columnIds?.includes("sequence") ? row[table.columnIds.indexOf("sequence")] : ""}"><td colspan="${table.headers.length}" data-label="Kayıt ve adres"><div class="cell-value">${escapeHtml(table.rowDetails[table.rows.indexOf(row)]!)}</div></td></tr>` : ""}`).join("") : `<tr><td class="empty-roster" colspan="${table.headers.length}">Bu sınıfta kayıtlı öğrenci bulunmuyor.</td></tr>`}</tbody></table>
      ${isLast ? `<footer class="document-footer signature-layout--${style?.signatureLayout ?? "teacher-right"}"><section class="document-note"><p><strong>Üretim tarihi:</strong> ${escapeHtml(options.displayDate)}</p><p>Bu belge kişisel veri içerir. Yalnız eğitim ve sınıf yönetimi amacıyla güvenli biçimde saklayınız.</p></section><section class="signature" aria-label="Öğretmen imza alanı"><strong class="signature-title">${CLASS_ROSTER_TEACHER_TITLE}</strong><div class="signature-name">${escapeHtml(options.teacherName)}</div><div class="signature-line" aria-hidden="true"></div><div>İmza</div></section>${style?.signatureLayout === "teacher-and-principal" ? `<section class="signature"><strong>Okul Müdürü</strong><div class="signature-name">${escapeHtml(turkishDocumentName(style.principalName))}</div><div class="signature-line"></div><div>İmza</div></section>` : ""}</footer>` : ""}
      <p class="screen-page-number" aria-hidden="true">Sayfa ${pageIndex + 1} / ${pages.length}</p>
    </section>`;
  }).join("\n");
  return { pageCount: pages.length, html: `${CLASS_ROSTER_HTML_FILE_SIGNATURE}
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="maarifos-generated-at" content="${escapeHtml(options.generatedAt)}">
<meta name="maarifos-civil-date" content="${escapeHtml(options.generatedCivilDate)}">
<meta name="maarifos-document-kind" content="${CLASS_ROSTER_DOCUMENT_KIND}"><meta name="maarifos-output-format" content="html">
<meta name="maarifos-row-count" content="${options.rows.length}"><meta name="maarifos-page-count" content="${pages.length}"><meta name="maarifos-contains-sensitive-data" content="true">
<title>${escapeHtml(options.classroomName)} · Sınıf Listesi</title>
<style>
@page { size: A4 ${orientation}; margin: 10mm; }
@page { @bottom-left { content: "Kişisel veri içerir · ${escapeHtml(options.displayDate)}"; font: 7pt Arial,sans-serif; color:#17324D; } @bottom-right { content: "Sayfa " counter(page) " / " counter(pages); font:7pt Arial,sans-serif; } }
* { box-sizing:border-box; } :root { color-scheme:only light; font-family:Arial,"Helvetica Neue",sans-serif; color:#17324d; }
html,body { margin:0; padding:0; background:#fff; } body { font-size:8.5pt; line-height:1.3; font-variant-numeric:tabular-nums; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
main { width:100%; margin:auto; } .roster-page { width:100%; break-after:page; page-break-after:always; } .roster-page--last { break-after:auto; page-break-after:auto; }
.document-heading { display:flex; justify-content:space-between; align-items:end; gap:8mm; margin-bottom:3mm; border-bottom:1mm solid #42C7BD; padding-bottom:3mm; } .institution { margin:0 0 2mm; font-size:11pt; color:#17324D; font-weight:700; }
h1 { font-size:21pt; font-weight:700; letter-spacing:0; margin:0; line-height:1.2; color:#17324D; } h2 { margin:1.4mm 0 0; font-size:10.5pt; color:#17324D; }
.document-kind { color:#17324D; font-size:7.5pt; margin:0 0 1.5mm; text-align:right; white-space:nowrap; }
    .student-count { margin:0; text-align:right; font-size:8.5pt; }
.document-meta { display:grid; grid-template-columns:1fr 1fr; gap:1.5mm 6mm; padding:0 0 3mm; margin-bottom:2mm; border-bottom:.2mm solid #bcc8c1; font-size:9pt; } .document-meta span { overflow-wrap:anywhere; }
.section-description { margin:2mm 0; color:#17324D; font-size:7.3pt; }
table { width:100%; table-layout:fixed; border-collapse:collapse; } thead { display: table-header-group; } tr { break-inside:avoid; page-break-inside: avoid; }
th { text-align:left; font-size:8.5pt; line-height:1.25; background:#deece7; color:#17324D; padding:2mm 1.5mm; border:.25mm solid #607D91; }
.group-head th { text-align:center; font-size:10pt; background:#c7e0d7; padding:1.5mm; }
.school-banner { margin:0 0 4mm; font-size:10pt; } .school-banner p { margin:1mm 0; } .school-banner--official { text-align:center; } .school-logo { width:auto; max-width:36mm; height:20mm; object-fit:contain; } .signature-layout--teacher-left .signature { order:-1; }
td { padding:1.6mm 1.5mm; border:.25mm solid #607D91; vertical-align:top; line-height:1.35; font-size:8.5pt; } tbody tr:nth-child(even) { background:#f7faf9; }
.student-detail-band td { background:#EAF8F5; border-bottom:.45mm solid #6f9688; } .student-group-start td { border-top:.45mm solid #6f9688; }
th,td { overflow-wrap:anywhere; } .cell-value { white-space:pre-wrap; min-width:0; } .student-name { font-weight:700; } .empty-value { color:#17324D; } .empty-roster { text-align:center; padding:12mm; }
.document-footer { display:flex; justify-content:space-between; gap:10mm; margin-top:5mm; break-inside:avoid; page-break-inside:avoid; font-size:7.5pt; } .document-note { max-width:175mm; } .document-note p { margin:0 0 2mm; }
.signature { min-width:65mm; text-align:center; } .signature-name { margin-top:1.5mm; } .signature-line { width:55mm; margin:6mm auto 1mm; border-bottom:.2mm solid #697d78; }
.screen-page-number { display:none; } .screen-output-help { padding:3mm; background:#eff5f3; font-size:9pt; margin:0 0 5mm; }
@media print { main, .roster-page { width:${orientation === "portrait" ? "190" : "277"}mm; } .screen-output-help { display: none; } }
@media screen { body { background:#edf1ef; padding:18px; } main { max-width:1160px; } .roster-page { background:white; padding:30px; margin-bottom:18px; box-shadow:0 2px 10px #17324d12; } .screen-page-number { display:block; text-align:right; color:#17324D; } }
@media screen and (max-width: 700px) {
html,body { overflow-x: hidden; } body { padding:10px; font-size:13px; } .roster-page { padding:15px; border-radius:10px; } .document-heading { display:block; } h1 { font-size:22px; } h2 { font-size:15px; } .institution { font-size:12px; line-height:1.5; } .document-kind,.student-count,.template-version { text-align:left!important; font-size:11px; margin-top:8px; }
.document-meta { grid-template-columns:1fr; font-size:12px; gap:7px; padding:10px; } .section-description { font-size:11px; margin:12px 0; } table,tbody { display:block; } colgroup,thead { display:none; } tbody tr { display:block; margin:12px 0; border:1px solid #b8cbc2; border-radius:8px; overflow:hidden; }
tbody td { display:grid; grid-template-columns: 96px minmax(0, 1fr); gap:10px; width:100%; border:0; border-bottom:1px solid #e1e9e5; padding:9px; font-size:12px; } td::before { content: attr(data-label); color:#17324D; font-weight:600; font-size:11px; } td:last-child { border-bottom:0; } td.student-name { background:#eaf4ee; font-size:13px; } td.empty-roster { display:block; }
.document-footer { display:block; font-size:11px; } .signature { min-width:0; margin-top:22px; } .signature-line { max-width:80%; } }
</style></head><body><main><aside class="screen-output-help">A4 ${orientation === "portrait" ? "dikey" : "yatay"} baskıya hazır HTML önizlemesi. Bu dosya PDF dosyası değildir; tarayıcının yazdır komutuyla yazdırabilirsiniz.</aside>${pageMarkup}</main></body></html>` };
}

interface ResolvedClassRosterDocumentInput {
  readonly schoolName: string;
  readonly teacherName: string;
  readonly classroomName: string;
  readonly academicYearLabel: string;
  readonly ageGroup: string;
  readonly generatedAt: string;
  readonly generatedCivilDate: string;
  readonly displayDate: string;
  readonly rows: readonly RosterRow[];
  readonly scope: ActiveClassroomScope;
  readonly schoolTemplate: SchoolDocumentTemplate | null;
  readonly fields: readonly string[];
  readonly columns: readonly ClassRosterColumn[];
  readonly layout: ClassRosterLayoutId | null;
}

function resolveClassRosterDocumentInput(
  input: ClassRosterDocumentInput,
): ResolvedClassRosterDocumentInput {
  if (input.layout !== undefined && !isClassRosterLayoutId(input.layout)) {
    throw new Error("Geçerli bir sınıf listesi kullanım amacı seçin.");
  }
  if (input.layout && input.template && input.template !== "contact-list") {
    throw new Error("Sınıf listesi kullanım düzenleri yalnız iletişim listesi şablonunda kullanılabilir.");
  }
  if (input.studentIds !== undefined && (!Array.isArray(input.studentIds) || !input.studentIds.length || input.studentIds.some(id => typeof id !== "string" || !id.trim()) || new Set(input.studentIds).size !== input.studentIds.length)) throw new Error("En az bir geçerli öğrenci seçin; seçim tekrarlanamaz.");
  if (input.columns !== undefined && input.template && input.template !== "contact-list") throw new Error("Bireysel belge seçiminde fields grup alanlarını kullanın.");
  const schoolName = turkishDocumentAddress(requireText(input.schoolName, "Okul adı"));
  const teacherName = turkishDocumentName(requireText(input.teacherName, "Öğretmen adı soyadı"));
  const settings = { settings: input.snapshot.settings ?? [] };
  const schoolTemplate = input.schoolTemplate !== undefined ? input.schoolTemplate : schoolDocumentTemplateRecords(settings, input.scope).length ? activeSchoolDocumentTemplate(settings, input.scope) : null;
  if (schoolTemplate && !isSchoolDocumentTemplate(schoolTemplate)) throw new Error("Okul belge şablonu geçersiz.");
  const classroom = input.snapshot.classrooms.find(
    (record) =>
      record.id === input.scope.classroomId &&
      record.academicYearId === input.scope.academicYearId &&
      typeof record.deletedAt !== "string" &&
      record.status !== "archived" &&
      record.archiveStatus !== "archived",
  );
  if (!classroom) {
    throw new Error("Aktif sınıf belge için doğrulanamadı.");
  }
  const academicYear = input.snapshot.academicYears.find(
    (record) =>
      record.id === input.scope.academicYearId &&
      typeof record.deletedAt !== "string" &&
      record.status !== "archived",
  );
  if (!academicYear) {
    throw new Error("Aktif eğitim yılı belge için doğrulanamadı.");
  }
  const classroomName = nonEmptyText(classroom.name);
  const academicYearLabel = nonEmptyText(academicYear.name);
  if (!classroomName || !academicYearLabel) {
    throw new Error("Sınıf adı ve eğitim yılı belge için eksiksiz olmalıdır.");
  }

  const ageSuffix = classroomName.match(/\s*·\s*((?:36\s*[–-]\s*48|48\s*[–-]\s*60|60\s*[–-]\s*72))\s+ay\s*$/iu);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const { civilDate: generatedCivilDate, displayDate } =
    generatedDateParts(generatedAt);
  return {
    schoolName,
    teacherName,
    classroomName: turkishDocumentAddress(ageSuffix ? classroomName.slice(0, ageSuffix.index) : classroomName).replace(/((?:36\s*[–-]\s*48|48\s*[–-]\s*60|60\s*[–-]\s*72))\s+Ay\b/gu, "$1 ay"),
    academicYearLabel: academicYearLabel.replace(/^(\d{4})\s*[–-]\s*(\d{4})(?:\s+Eğitim(?:\s+Öğretim)?\s+Yılı)?$/iu, "$1–$2"),
    ageGroup: String(classroom.ageGroup ?? ageSuffix?.[1] ?? "").replace(/[Aa][Yy]$/u, "ay").replace(/^(\d{2})\s*[-–]\s*(\d{2})(?:\s+ay)?$/u, "$1–$2 ay"),
    generatedAt,
    generatedCivilDate,
    displayDate,
    rows: rosterRows(input.snapshot.students, input.scope).filter((row) => !input.studentIds || input.studentIds.includes(row.id)),
    scope: { ...input.scope },
    schoolTemplate,
    fields: input.fields ?? ["identity", "contacts", "address"],
    columns: resolveClassRosterColumns(input.columns, input.fields),
    layout: input.layout ?? null,
  };
}

function resolveRosterSelection(input: ClassRosterDocumentInput, resolved: ResolvedClassRosterDocumentInput) {
  const academicYear = input.snapshot.academicYears.find((year) => year.id === input.scope.academicYearId)!;
  const min = isCivilDate(academicYear.operationalStartDate) ? academicYear.operationalStartDate : academicYear.startDate;
  const max = academicYear.endDate;
  const hasBounds = isCivilDate(min) && isCivilDate(max);
  const currentDate = hasBounds ? resolved.generatedCivilDate < String(min) ? String(min)
    : resolved.generatedCivilDate > String(max) ? String(max) : resolved.generatedCivilDate : resolved.generatedCivilDate;
  const period = input.period ?? { start: currentDate, end: currentDate };
  if (input.period && (!hasBounds || !isCivilDate(period.start) || !isCivilDate(period.end) || period.start > period.end || period.start < String(min) || period.end > String(max))) throw new Error("Sınıf belgesi dönemi eğitim yılı içinde olmalıdır.");
  const candidates = hasBounds ? input.snapshot.students.filter((student) => studentMembershipOverlaps(student, {
    ...input.scope, academicYear, periodStart: String(min), periodEnd: String(max),
  })) : input.snapshot.students.filter((student) => recordIsInActiveScope(student, input.scope));
  if (input.studentIds?.some((id) => !candidates.some((student) => student.id === id))) throw new Error("Belge kapsamındaki öğrenci eğitim yılına ait değil.");
  const selected = candidates.filter((student) => (!input.studentIds || input.studentIds.includes(student.id)) && (!hasBounds || studentMembershipOverlaps(student, {
    ...input.scope, academicYear, periodStart: period.start, periodEnd: period.end,
  })));
  // The membership service admits historical episodes; the presentation mapper only formats values.
  const selectedRows = rosterRows(selected.map((student) => ({ ...student, academicYearId: input.scope.academicYearId, classroomId: input.scope.classroomId, active: true, enrollmentStatus: "active" })), input.scope);
  if (input.studentIds && !selectedRows.length) throw new Error("Seçilen dönemde kayıtlı öğrenci bulunmuyor.");
  return { rows: selectedRows, students: selected, candidates, period, min, max, hasBounds };
}

export interface ClassRosterExportModel {
  readonly layout: ClassRosterLayoutId | null;
  readonly columns: readonly ClassRosterColumn[];
  readonly rows: readonly (readonly string[])[];
  readonly rowStudentIds: readonly string[];
  readonly metadata: Readonly<{ schoolName: string; teacherName: string; teacherTitle: string; classroomName: string; academicYearLabel: string; generatedAt: string; generatedCivilDate: string; studentCount: number }>;
}

/** Shared exact selected strings for spreadsheets and document verification. */
export function createClassRosterExportModel(input: ClassRosterDocumentInput): ClassRosterExportModel {
  const resolved = resolveClassRosterDocumentInput(input);
  const selection = resolveRosterSelection(input, resolved);
  const projected = projectRosterRows(selection.rows, resolved.columns);
  return { layout: resolved.layout, columns: resolved.columns, rows: projected.map(row => resolved.columns.map(column => row.cells[column.id])), rowStudentIds: projected.map(row => row.studentId),
    metadata: { schoolName: resolved.schoolName, teacherName: resolved.teacherName, teacherTitle: CLASS_ROSTER_TEACHER_TITLE, classroomName: resolved.classroomName, academicYearLabel: resolved.academicYearLabel, generatedAt: resolved.generatedAt, generatedCivilDate: resolved.generatedCivilDate, studentCount: selection.rows.length } };
}

const DAILY_ROSTER_COLUMN_IDS = new Set<ClassRosterColumnId>([
  "sequence",
  "schoolNumber",
  "name",
]);

const CONTACT_ROLE_COLUMN_IDS = Object.freeze({
  mother: ["motherName", "motherPhone", "motherOccupation"],
  father: ["fatherName", "fatherPhone", "fatherOccupation"],
  other: ["otherName", "otherPhone", "otherRelationship", "otherOccupation"],
} as const satisfies Readonly<Record<"mother" | "father" | "other", readonly ClassRosterColumnId[]>>);

function selectedValues(
  projected: readonly ProjectedRosterRow[],
  columnId: ClassRosterColumnId,
): string[] {
  return projected
    .map((row) => row.cells[columnId])
    .filter((value) => value.length > 0 && value !== "—");
}

function labelledSelectedValues(
  projected: readonly ProjectedRosterRow[],
  columns: readonly ClassRosterColumn[],
): string[] {
  return columns.flatMap((column) => {
    const values = selectedValues(/^(?:mother|father|other)/u.test(column.id) ? projected : projected.slice(0, 1), column.id);
    if (!values.length) return [`${documentColumnLabel(column)}: —`];
    if (values.length === 1) return [`${documentColumnLabel(column)}: ${values[0]}`];
    return [`${documentColumnLabel(column)}:`, ...values.map((value, index) => `${index + 1}. ${value}`)];
  });
}

function rosterLayoutIntroNodes(
  resolved: ResolvedClassRosterDocumentInput,
  studentCount: number,
): SemanticPdfNode[] {
  const layout = resolveClassRosterLayout(resolved.layout!);
  return [
    { kind: "paragraph", text: resolved.schoolName },
    { kind: "heading", level: 1, text: layout.title },
    {
      kind: "paragraph",
      tone: "meta",
      text: `Sınıf: ${resolved.classroomName}\nEğitim yılı: ${resolved.academicYearLabel}${resolved.ageGroup ? `\nYaş grubu: ${resolved.ageGroup}` : ""}\nÖğrenci sayısı: ${studentCount}\nDüzenleme tarihi: ${resolved.displayDate}`,
    },
  ];
}

function dailyClassroomLayoutNodes(
  rows: readonly RosterRow[],
  columns: readonly ClassRosterColumn[],
  resolved: ResolvedClassRosterDocumentInput,
): SemanticPdfNode[] {
  const selectedIds = new Set(columns.map((column) => column.id));
  const projected = projectRosterRows(rows, columns);
  const extraColumns = columns.filter((column) => !DAILY_ROSTER_COLUMN_IDS.has(column.id));
  const bodyRows = rows.map((row) => {
    const source = projected.filter((candidate) => candidate.studentId === row.id);
    const first = source[0];
    return [
      selectedIds.has("sequence") ? first?.cells.sequence ?? "" : "",
      selectedIds.has("schoolNumber") ? first?.cells.schoolNumber ?? "" : "",
      selectedIds.has("name") ? first?.cells.name ?? "" : "",
      "",
      "",
      "",
      "",
      "",
    ];
  });
  const rowDetails = rows.map((row) => {
    if (!extraColumns.length) return null;
    const source = projected.filter((candidate) => candidate.studentId === row.id);
    return labelledSelectedValues(source, extraColumns).join("\n");
  });
  return [
    ...rosterLayoutIntroNodes(resolved, rows.length),
    {
      kind: "table",
      summary: "Günlük sınıf kullanım çizelgesi; son beş sütun öğretmenin elle işaretlemesi için boştur.",
      headers: ["Sıra", "Okul no.", "Adı soyadı", "1", "2", "3", "4", "5"],
      rows: bodyRows,
      rowDetails,
      columnWeights: [0.55, 1.05, 3.65, 0.55, 0.55, 0.55, 0.55, 0.55],
      cellPadding: 5,
      fontSize: 10,
      balancePages: true,
      rowHeaderColumn: 2,
      continuationContextColumns: [0, 2],
      preserveContinuationContext: true,
      reserveAfter: "following-content",
    },
  ];
}

function contactRoleText(
  projected: readonly ProjectedRosterRow[],
  columns: readonly ClassRosterColumn[],
  role: keyof typeof CONTACT_ROLE_COLUMN_IDS,
): string {
  const allowed = new Set<ClassRosterColumnId>(CONTACT_ROLE_COLUMN_IDS[role]);
  const roleColumns = columns.filter((column) => allowed.has(column.id));
  return roleColumns.length ? labelledSelectedValues(projected, roleColumns).join("\n") : "—";
}

function contactBlocksLayoutNodes(
  rows: readonly RosterRow[],
  columns: readonly ClassRosterColumn[],
  resolved: ResolvedClassRosterDocumentInput,
): SemanticPdfNode[] {
  const projected = projectRosterRows(rows, columns);
  const identityIds = new Set<ClassRosterColumnId>(["sequence", "schoolNumber", "name", "nationalId", "birthDate", "enrollmentYear"]);
  const identityColumns = columns.filter((column) => identityIds.has(column.id));
  const detailIds = new Set<ClassRosterColumnId>(["priorityContact", "emergencyContact", "pickupAuthorization"]);
  const detailColumns = columns.filter((column) => detailIds.has(column.id));
  const addressSelected = columns.some((column) => column.id === "address");
  const blocksPerPage = columns.length <= 10 ? 5 : columns.length <= 14 ? 4 : 3;
  const tables: SemanticPdfNode[] = rows.map((row, index) => {
    const source = projected.filter((candidate) => candidate.studentId === row.id);
    const identity = [
      ...labelledSelectedValues(source.slice(0, 1), identityColumns),
      ...labelledSelectedValues(source.slice(0, 1), detailColumns),
    ];
    const identityBand = identity.length ? identity.join(" · ") : `Öğrenci ${index + 1}`;
    const contactCells = [
      contactRoleText(source, columns, "mother"),
      contactRoleText(source, columns, "father"),
      contactRoleText(source, columns, "other"),
    ];
    const address = addressSelected ? `Ev adresi: ${source[0]?.cells.address ?? "—"}` : null;
    const exceptionallyLongBlock = identityBand.length
      + contactCells.reduce((total, value) => total + value.length, 0)
      + (address?.length ?? 0) > 900;
    return {
      kind: "table",
      summary: `${identityBand}; anne, baba ve diğer yakın iletişim bölgeleri.`,
      headerGroups: [{ label: identityBand, span: 3, colorIndex: index % 4 }],
      headers: ["Anne", "Baba", "Diğer yakın"],
      rows: [contactCells],
      rowDetails: [address],
      columnWeights: [1, 1, 1.15],
      cellPadding: 5,
      fontSize: 8.5,
      continuationContextColumns: [0, 1, 2],
      preserveContinuationContext: true,
      ...(index > 0 && (index % blocksPerPage === 0 || exceptionallyLongBlock) ? { pageBreakBefore: true } : {}),
    } satisfies Extract<SemanticPdfNode, { kind: "table" }>;
  });
  return [
    ...rosterLayoutIntroNodes(resolved, rows.length),
    ...tables,
  ];
}

function detailedRosterLayoutNodes(
  rows: readonly RosterRow[],
  columns: readonly ClassRosterColumn[],
  resolved: ResolvedClassRosterDocumentInput,
): SemanticPdfNode[] {
  const projected = projectRosterRows(rows, columns);
  const nameSelected = columns.some((column) => column.id === "name");
  return [
    ...rosterLayoutIntroNodes(resolved, rows.length),
    {
      kind: "table",
      summary: "Her öğrencinin yalnız seçilmiş alanlarını eksiksiz gösteren ayrıntılı döküm.",
      headers: ["Öğrenci", "Seçilen kayıt bilgileri"],
      rows: rows.map((row, index) => {
        const source = projected.filter((candidate) => candidate.studentId === row.id);
        return [
          nameSelected ? source[0]?.cells.name ?? `Öğrenci ${index + 1}` : `Öğrenci ${index + 1}`,
          labelledSelectedValues(source, columns).join("\n"),
        ];
      }),
      columnWeights: [1.05, 3.2],
      cellPadding: 6,
      fontSize: 9.5,
      balancePages: true,
      rowHeaderColumn: 0,
      continuationContextColumns: [0],
      preserveContinuationContext: true,
      reserveAfter: "following-content",
    },
  ];
}

function singlePageCell(
  projected: readonly ProjectedRosterRow[],
  columnId: ClassRosterColumnId,
): string {
  const values = selectedValues(/^(?:mother|father|other)/u.test(columnId) ? projected : projected.slice(0, 1), columnId);
  if (!values.length) return "—";
  return values.length === 1 ? values[0]! : values.map((value, index) => `${index + 1}. ${value}`).join(" · ");
}

function singlePageRosterLayoutNodes(
  rows: readonly RosterRow[],
  columns: readonly ClassRosterColumn[],
  resolved: ResolvedClassRosterDocumentInput,
): SemanticPdfNode[] {
  const definition = resolveClassRosterLayout("single-page-roster");
  const selected = new Set(columns.map((column) => column.id));
  if ([...selected].some((column) => !definition.defaultColumns.includes(column))) {
    throw new Error("Tek sayfa sınıf listesi yalnız tanımlı 12 öğrenci ve veli alanının alt seçimiyle hazırlanabilir.");
  }
  if (rows.length > 30) throw new Error("Tek sayfa sınıf listesi en fazla 30 öğrenciyle hazırlanabilir.");
  const projected = projectRosterRows(rows, columns);
  const columnOrder = definition.defaultColumns;
  const fontSize = 8;
  const cellPadding = 2;
  return [
    {
      kind: "heading",
      level: 6,
      text: `${resolved.schoolName} · ${definition.title} · Sınıf: ${resolved.classroomName} · ${resolved.academicYearLabel}`,
    },
    {
      kind: "table",
      summary: "Tek yatay A4 sayfada öğrenci, anne, baba ve üçüncü kişi bilgileri.",
      headerGroups: [
        { label: "Öğrenci", span: 3, colorIndex: 0 },
        { label: "Anne", span: 3, colorIndex: 1 },
        { label: "Baba", span: 3, colorIndex: 2 },
        { label: "Üçüncü kişi", span: 3, colorIndex: 3 },
      ],
      headers: [
        "Sıra",
        "Öğrenci adı soyadı",
        "T.C. kimlik no.",
        "Adı soyadı",
        "Mesleği",
        "Telefonu",
        "Adı soyadı",
        "Mesleği",
        "Telefonu",
        "Adı soyadı",
        "Yakınlığı",
        "Telefonu",
      ],
      rows: rows.map((row) => {
        const source = projected.filter((candidate) => candidate.studentId === row.id);
        return columnOrder.map((columnId) => selected.has(columnId) ? singlePageCell(source, columnId) : "—");
      }),
      columnWeights: [0.38, 1.48, 1.04, 1.16, 0.82, 1.08, 1.16, 0.82, 1.08, 1.16, 0.76, 1.08],
      cellPadding,
      fontSize,
      fitBodyCellsWithinLines: 2,
      minimumBodyCellHorizontalScale: rows.length <= 20 ? 49.5 : rows.length <= 27 ? 45 : 40,
      rowHeaderColumn: 1,
      continuationContextColumns: [0, 1],
      preserveContinuationContext: true,
      reserveAfter: "following-content",
    },
    {
      kind: "paragraph",
      tone: "meta",
      text: `${CLASS_ROSTER_TEACHER_TITLE}: ${resolved.teacherName}`,
    },
  ];
}

function purposeBuiltRosterNodes(
  rows: readonly RosterRow[],
  columns: readonly ClassRosterColumn[],
  resolved: ResolvedClassRosterDocumentInput,
): SemanticPdfNode[] {
  switch (resolved.layout) {
    case "daily-classroom": return dailyClassroomLayoutNodes(rows, columns, resolved);
    case "contact-blocks": return contactBlocksLayoutNodes(rows, columns, resolved);
    case "detailed-roster": return detailedRosterLayoutNodes(rows, columns, resolved);
    case "single-page-roster": return singlePageRosterLayoutNodes(rows, columns, resolved);
    case null: return [];
  }
}

function purposeBuiltRosterHtml(
  nodes: readonly SemanticPdfNode[],
  resolved: ResolvedClassRosterDocumentInput,
  documentLabel: string,
  orientation: "portrait" | "landscape",
  pageCount: number,
): string {
  const nodeMarkup = nodes.map((node) => {
    const breakClass = node.pageBreakBefore ? ' class="page-break-before"' : "";
    if (node.kind === "heading") return `<h${node.level}${breakClass}>${escapeHtml(node.text)}</h${node.level}>`;
    if (node.kind === "paragraph") {
      const content = escapeHtml(node.text);
      return node.href
        ? `<p${breakClass}><a href="${escapeHtml(node.href)}">${content}</a></p>`
        : `<p${breakClass}>${content}</p>`;
    }
    if (node.kind === "list") {
      const tag = node.ordered ? "ol" : "ul";
      return `<${tag}${breakClass}>${node.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</${tag}>`;
    }
    if (node.kind === "figure") return `<figure${breakClass}><figcaption>${escapeHtml(node.caption ?? node.altText)}</figcaption></figure>`;
    const weight = (node.columnWeights ?? node.headers.map(() => 1)).reduce((sum, value) => sum + value, 0);
    const widths = (node.columnWeights ?? node.headers.map(() => 1)).map((value) => `<col style="width:${(value / weight * 100).toFixed(3)}%">`).join("");
    const groups = node.headerGroups
      ? `<tr>${node.headerGroups.map((group) => `<th scope="colgroup" colspan="${group.span}">${escapeHtml(group.label)}</th>`).join("")}</tr>`
      : "";
    const body = node.rows.map((row, index) => `<tr>${row.map((value, columnIndex) => `<${columnIndex === node.rowHeaderColumn ? "th scope=\"row\"" : "td"}>${escapeHtml(value)}</${columnIndex === node.rowHeaderColumn ? "th" : "td"}>`).join("")}</tr>${node.rowDetails?.[index] ? `<tr class="student-detail"><td colspan="${node.headers.length}">${escapeHtml(node.rowDetails[index]!)}</td></tr>` : ""}`).join("");
    return `<table${breakClass} aria-label="${escapeHtml(node.summary ?? documentLabel)}"><colgroup>${widths}</colgroup><thead>${groups}<tr>${node.headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
  }).join("\n");
  return `<!doctype html><html lang="tr"><head><meta charset="UTF-8">
<meta name="maarifos-generated-at" content="${escapeHtml(resolved.generatedAt)}">
<meta name="maarifos-civil-date" content="${escapeHtml(resolved.generatedCivilDate)}">
<meta name="maarifos-document-kind" content="${CLASS_ROSTER_DOCUMENT_KIND}"><meta name="maarifos-output-format" content="html">
<meta name="maarifos-row-count" content="${resolved.rows.length}"><meta name="maarifos-page-count" content="${pageCount}"><meta name="maarifos-contains-sensitive-data" content="true">
<title>${escapeHtml(resolved.classroomName)} · ${escapeHtml(documentLabel)}</title><style>
@page { size:A4 ${orientation}; margin:10mm; } * { box-sizing:border-box; } body { margin:0; color:#17324d; font:9pt/1.35 Arial,sans-serif; }
h1 { margin:1mm 0 3mm; font-size:21pt; } h2 { break-after:avoid; } p { margin:1.4mm 0; white-space:pre-wrap; }
table { width:100%; border-collapse:collapse; table-layout:fixed; margin:4mm 0; } thead { display:table-header-group; } tr { break-inside:avoid; page-break-inside:avoid; }
th,td { border:.25mm solid #607d91; padding:2mm; text-align:left; vertical-align:top; white-space:pre-wrap; overflow-wrap:anywhere; }
thead th { background:#cfeFeb; font-weight:700; } .student-detail td { background:#eaf8f5; } .page-break-before { break-before:page; page-break-before:always; }
.document-footer { break-inside:avoid; } .student-count { margin:0; }
@media screen { body { max-width:${orientation === "portrait" ? "190mm" : "277mm"}; margin:16px auto; padding:10mm; box-shadow:0 2px 12px #17324d22; } }
</style></head><body><p class="student-count">Öğrenci sayısı: ${resolved.rows.length}</p>${nodeMarkup}</body></html>`;
}

/**
 * Aktif sınıf kapsamını snapshot üzerinde tekrar doğrular ve yalnız o sınıfın
 * etkin öğrencilerini A4 baskıya hazır, dış kaynaksız bir HTML dosyasına çevirir.
 */
export function createClassRosterDocument(
  input: ClassRosterDocumentInput,
): ClassRosterDocumentFile {
  const base = resolveClassRosterDocumentInput(input);
  const resolved = { ...base, rows: resolveRosterSelection(input, base).rows };
  const { html, pageCount } = buildHtml(resolved);
  return {
    documentKind: CLASS_ROSTER_DOCUMENT_KIND,
    format: CLASS_ROSTER_DOCUMENT_FORMAT,
    fileName: `MaarifOS_Sinif_Listesi_${safeFileSegment(resolved.classroomName)}_${safeFileSegment(resolved.academicYearLabel)}.html`,
    mimeType: CLASS_ROSTER_DOCUMENT_MIME_TYPE,
    bytes: encoder.encode(html),
    html,
    rowCount: resolved.rows.length,
    pageCount,
    containsSensitiveData: true,
    capabilities: CLASS_ROSTER_DOCUMENT_CAPABILITIES,
    generatedAt: resolved.generatedAt,
    generatedCivilDate: resolved.generatedCivilDate,
    scope: resolved.scope,
  };
}

/** The tagged, searchable PDF uses the same complete table data as its HTML preview. */
export async function createClassRosterPdfDocument(
  input: ClassRosterDocumentInput,
  options: { readonly runtime?: ClassRosterPdfRuntime; readonly appearance?: "color" | "ink-saving" } = {},
): Promise<ClassRosterPdfDocumentFile> {
  const resolved = resolveClassRosterDocumentInput(input);
  const { rows: selectedRows, students: selected, candidates, period, min, max, hasBounds } = resolveRosterSelection(input, resolved);
  const fields = input.fields ?? ["identity", "contacts", "address"];
  if (!fields.length || fields.some((field) => !["identity", "contacts", "address", "care"].includes(field))) throw new Error("En az bir belge alanı seçin.");
  if (input.studentIds && !selectedRows.length) throw new Error("Seçilen dönemde kayıtlı öğrenci bulunmuyor.");
  const presentation = { ...resolved, rows: selectedRows };
  const { html } = buildHtml(presentation);
  const nodes: SemanticPdfNode[] = [];
  const contactTemplate = !input.template || input.template === "contact-list";
  const signatures = schoolTemplateSignatureNodes(resolved.schoolTemplate ?? { layout:"official",headerLines:[],logo:null,signatureLayout:"teacher-right",principalName:"",orientation:"auto" }, { teacherName: resolved.teacherName });
  const contextLabel = `${resolved.schoolName} · ${resolved.classroomName} · ${resolved.academicYearLabel}`;
  const portrait = resolved.schoolTemplate?.orientation === "portrait";
  const tables = selectedRosterTables(selectedRows, resolved.columns, portrait);
  if (resolved.layout) nodes.push(...purposeBuiltRosterNodes(selectedRows, resolved.columns, resolved));
  for (const [index, table] of (resolved.layout || (input.template && input.template !== "contact-list") ? [] : tables).entries()) {
    if (index === 0) nodes.push(
      { kind: "paragraph", text: resolved.schoolName },
      { kind: "heading", level: 1, text: "Sınıf Listesi" },
      { kind: "paragraph", tone: "meta", text: `Sınıf: ${resolved.classroomName}\nEğitim yılı: ${resolved.academicYearLabel}${resolved.ageGroup ? `\nYaş grubu: ${resolved.ageGroup}` : ""}\nÖğrenci sayısı: ${selectedRows.length}\nDüzenleme tarihi: ${resolved.displayDate}` },
    );
    nodes.push(
      { kind: "table", summary: table.title, headers: table.headers, rows: table.rows, headerGroups: table.groups?.map(group => ({ label: group.label, span: group.columns, colorIndex:rosterGroupColorIndex(group.label) })), rowDetails: table.rowDetails, columnWeights: table.widths, cellPadding: 3.5, fontSize: portrait ? 9 : 8.5, balancePages: true, reserveAfter: index === tables.length - 1 ? "following-content" : 0, rowHeaderColumn: table.contextColumns?.[0], rowGroupColumn: table.rowGroupColumn, continuationContextColumns: table.contextColumns ?? [], preserveContinuationContext: true },
    );
    if (!table.rows.length) nodes.push({ kind: "paragraph", text: "Bu sınıfta kayıtlı öğrenci bulunmuyor." });
  }
  if (contactTemplate && resolved.layout !== "single-page-roster") nodes.push(...signatures);
  if ((input.template && input.template !== "contact-list") || fields.includes("care")) {
    for (const [index, row] of selectedRows.entries()) {
      const student = selected.find((record) => record.id === row.id)!;
      const care = student.careDetails && typeof student.careDetails === "object" ? student.careDetails as Record<string, unknown> : {};
      const title = input.template === "emergency-card" ? "ACİL DURUM KARTI" : "BİREYSEL ÖĞRENCİ BİLGİLERİ";
      nodes.push({ kind: "heading", level: 1, text: `${title} · ${row.fullName}`, pageBreakBefore: index > 0 || nodes.length > 0, forcePageBreakBefore: true, continuationHeaderText: `${row.fullName} · ${contextLabel} · ${period.start} / ${period.end}` },
        { kind: "paragraph", tone: "meta", text: `${contextLabel} · ${period.start} / ${period.end}` });
      const entries: string[][] = [];
      const cardTemplate = input.template && input.template !== "contact-list";
      if (cardTemplate && fields.includes("identity")) {
        const cells = projectRosterRows([row], CLASS_ROSTER_COLUMNS)[0]!.cells;
        entries.push(...CLASS_ROSTER_IDENTITY_COLUMN_IDS.map(id => [CLASS_ROSTER_COLUMNS.find(column => column.id === id)!.label, cells[id]]));
      }
      if (cardTemplate && fields.includes("contacts")) row.contacts.forEach((contact) => {
        const kind = contact.kind === "mother" ? "Anne" : contact.kind === "father" ? "Baba" : "Diğer yakın";
        entries.push([kind.toLocaleLowerCase("tr-TR") === contact.relationship.trim().toLocaleLowerCase("tr-TR") ? kind : `${kind} · ${contact.relationship}`,
          `${contact.name}\n${contact.phone}\n${contact.occupation}\n${contact.permissions}`]);
      });
      if (cardTemplate && fields.includes("address")) entries.push(["Ev adresi", row.homeAddress]);
      if (fields.includes("care")) for (const [key, label] of [["allergies", "Bilinen alerjiler"], ["dietaryNeeds", "Beslenme gereksinimi"], ["medicationNotes", "İlaç bilgisi"], ["emergencyNotes", "Acil durum yönergesi"], ["physicianName", "Doktor adı"], ["physicianPhone", "Doktor telefonu"], ["medicalDevices", "Tıbbi cihaz bilgisi"], ["otherNotes", "Günlük bakım notu"]]) {
        const value = nonEmptyText(care[key!]); if (value) entries.push([label!, value]);
      }
      if (entries.length) nodes.push({ kind: "table", headers: ["Bilgi", "Kayıt"], rows: entries, columnWeights: [1, 3], fontSize: 10, cellPadding: 7, continuationContextColumns: [0], preserveContinuationContext: true, reserveAfter: "following-content" });
      else nodes.push({ kind: "paragraph", text: "Seçilen alanlarda kayıtlı bilgi bulunmuyor." });
      nodes.push(...signatures);
    }
  }
  const layoutDefinition = resolved.layout ? resolveClassRosterLayout(resolved.layout) : null;
  const documentLabel = layoutDefinition?.title ?? (input.template === "emergency-card" ? "Acil Durum Kartı" : input.template === "student-record" ? "Bireysel Öğrenci Bilgileri" : "Sınıf Listesi");
  const renderingTemplate = layoutDefinition && resolved.schoolTemplate
    ? { ...resolved.schoolTemplate, orientation: layoutDefinition.orientation }
    : resolved.schoolTemplate;
  const bytes = await createSchoolStyledPdf({
    theme: options.appearance === "ink-saving" ? TEACHER_PRINT_THEME : CLASS_ROSTER_VIBRANT_THEME,
    title: `MaarifOS ${documentLabel}`, language: "tr-TR", creator: "MaarifOS", orientation: layoutDefinition?.orientation ?? (input.template && input.template !== "contact-list" ? "portrait" : "landscape"), pageMargin: resolved.layout === "single-page-roster" ? 28 : 28.35,
    artifactHeaderText: `${documentLabel} · ${contextLabel}`,
    artifactHeaderOnFirstPage: false,
    includeTotalPages: true,
    artifactFooterText: "Kişisel veri içerir · Yetkisiz paylaşmayınız.", nodes,
  }, renderingTemplate, { teacherName: resolved.teacherName, includeSignature: false }, options.runtime);
  const pdfPageCount = semanticTaggedPdfPageCount(bytes);
  if (resolved.layout === "single-page-roster" && pdfPageCount !== 1) {
    throw new Error("Tek sayfa sınıf listesi seçilen 30 öğrenci sınırı içinde bir A4 sayfaya sığmadı.");
  }
  const source = structuredClone({ ...input, generatedAt: resolved.generatedAt });
  const legacyChoices = [{ id: "identity", label: "Kimlik ve kayıt bilgileri" }, { id: "contacts", label: "Anne, baba ve diğer yakınlar" }, { id: "address", label: "Ev adresi" }, { id: "care", label: "Acil sağlık bilgileri (özel)" }];
  const sourceForSelection = (selection: Parameters<PdfPreviewRecipe["build"]>[0]): ClassRosterDocumentInput => ({
    ...source, studentIds: selection.studentIds, template: selection.template as ClassRosterDocumentInput["template"],
    layout: isClassRosterLayoutId(selection.layout) ? selection.layout : undefined,
    ...(selection.template === "contact-list" ? { columns: selection.fields as readonly ClassRosterColumnId[], fields: undefined }
      : { columns: undefined, fields: selection.fields as ClassRosterDocumentInput["fields"] }),
    ...(selection.periodStart && selection.periodEnd ? { period: { start: selection.periodStart, end: selection.periodEnd } } : {}),
  });
  const recipe: PdfPreviewRecipe = {
    supportsAppearance: true,
    layouts: CLASS_ROSTER_LAYOUTS.map((layout) => ({ id: layout.id, label: layout.title, group: layout.purposeLabel })),
    layoutTemplates: ["contact-list"],
    title: "Sınıf ve öğrenci belgeleri",
    description: layoutDefinition
      ? `${layoutDefinition.purposeLabel} amacı için hazırlanmış alanlar seçili. İsteğe göre alanları değiştirebilirsiniz; seçilmeyen bilgiler çıktıya eklenmez.`
      : "Sınıf listesinde seçtiğiniz alanları değiştirebilirsiniz; özel sağlık bilgileri ayrı bireysel şablondadır.",
    fields: CLASS_ROSTER_COLUMNS,
    fieldsForTemplate: { "contact-list": CLASS_ROSTER_COLUMNS, "student-record": legacyChoices, "emergency-card": legacyChoices },
    defaultFieldsForTemplate: { "contact-list": CLASS_ROSTER_COLUMNS.map(column=>column.id), "student-record": ["identity","contacts","address"], "emergency-card": ["identity","contacts","address"] },
    fieldPresets: CLASS_ROSTER_PRESETS.map(preset => ({ ...preset, templates: ["contact-list"] })),
    ...(candidates.length ? { students: candidates.map(student => ({id:student.id,label:turkishDocumentName(String(student.displayName))})) } : {}),
    templates: [{id:"contact-list",label:"İletişim listesi"},{id:"student-record",label:"Bireysel öğrenci bilgileri"},{id:"emergency-card",label:"Acil durum kartı"}],
    ...(hasBounds ? {period:{min:String(min),max:String(max)}} : {}),
    initial: { fields: contactTemplate ? resolved.columns.map(column=>column.id) : fields,
      ...(candidates.length ? {studentIds:input.studentIds ?? candidates.map(row=>row.id)} : {}), template: input.template ?? "contact-list", ...(resolved.layout ? { layout: resolved.layout } : {}), ...(hasBounds ? {periodStart:period.start,periodEnd:period.end} : {}) },
    printEnabled: true,
    exportActions: [
      {id:"xlsx",label:"Excel'e çıkar",templates:["contact-list"],async build(selection) {
        validatePdfSelection(recipe,selection);
        if (selection.template !== "contact-list") throw new Error("Excel çıktısı için iletişim listesi şablonunu seçin.");
        const {createClassRosterSpreadsheet} = await import("./class-roster-spreadsheet.ts");
        return createClassRosterSpreadsheet(sourceForSelection(selection), isClassRosterLayoutId(selection.layout) ? { layout: selection.layout } : {});
      }},
      {id:"xlsx-compact-contact",label:"Kısa iletişim baskısı",templates:["contact-list"],async build(selection) {
        validatePdfSelection(recipe,selection);
        if (selection.template !== "contact-list") throw new Error("Kısa iletişim baskısı için iletişim listesi şablonunu seçin.");
        const {createClassRosterSpreadsheet} = await import("./class-roster-spreadsheet.ts");
        return createClassRosterSpreadsheet(sourceForSelection(selection), { layout: "compact-contact" });
      }},
    ],
    async build(selection) { validatePdfSelection(recipe,selection); return createClassRosterPdfDocument(sourceForSelection(selection),{ ...options, appearance: selection.appearance }); },
  };
  registerPdfPreviewRecipe(bytes, recipe);
  const prefix = input.template === "emergency-card" ? "MaarifOS_Acil_Durum_Karti" : input.template === "student-record" ? "MaarifOS_Bireysel_Ogrenci_Bilgileri" : `MaarifOS_Sinif_Listesi${layoutDefinition ? `_${layoutDefinition.fileSegment}` : ""}`;
  const baseName = `${prefix}_${safeFileSegment(resolved.classroomName)}_${safeFileSegment(resolved.academicYearLabel)}`;
  const selectedHtml = resolved.layout
    ? purposeBuiltRosterHtml(nodes, resolved, documentLabel, layoutDefinition!.orientation, pdfPageCount)
    : input.template && input.template !== "contact-list"
    ? `<!doctype html><html lang="tr"><head><meta charset="UTF-8"><meta name="maarifos-civil-date" content="${resolved.generatedCivilDate}"><title>${escapeHtml(documentLabel)}</title></head><body>${nodes.map((node) => {
      if (node.kind === "heading") return `<h${node.level}>${escapeHtml(node.text)}</h${node.level}>`;
      if (node.kind === "paragraph") return `<p style="white-space:pre-wrap">${escapeHtml(node.text)}</p>`;
      if (node.kind === "table") return `<table><thead><tr>${node.headers.map((value) => `<th>${escapeHtml(value)}</th>`).join("")}</tr></thead><tbody>${node.rows.map((row) => `<tr>${row.map((value) => `<td style="white-space:pre-wrap">${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      return "";
    }).join("")}</body></html>` : html;
  return {
    documentKind: CLASS_ROSTER_DOCUMENT_KIND, format: CLASS_ROSTER_PDF_FORMAT,
    fileName: `${baseName}.pdf`, mimeType: CLASS_ROSTER_PDF_MIME_TYPE, bytes, html: selectedHtml,
    htmlFileName: `${baseName}.html`, rowCount: selectedRows.length, pageCount: pdfPageCount,
    containsSensitiveData: true, capabilities: CLASS_ROSTER_PDF_CAPABILITIES,
    generatedAt: resolved.generatedAt, generatedCivilDate: resolved.generatedCivilDate, scope: resolved.scope,
  };
}

export function classRosterPdfDocumentOutputContract(
  file: ClassRosterPdfDocumentFile,
): ClassRosterPdfDocumentOutputContract {
  const bytes = new Uint8Array(file.bytes.byteLength);
  bytes.set(file.bytes);
  return {
    metadata: {
      documentKind: file.documentKind,
      format: file.format,
      rowCount: file.rowCount,
      pageCount: file.pageCount,
      generatedAt: file.generatedAt,
      generatedCivilDate: file.generatedCivilDate,
      containsSensitiveData: true,
    },
    preview: {
      kind: "local-pdf",
      title: file.htmlFileName.replace(/\.html$/u, ""),
      html: file.html,
      bytes: bytes.slice(),
      mimeType: CLASS_ROSTER_PDF_MIME_TYPE,
    },
    download: {
      kind: "pdf-file",
      fileName: file.fileName,
      mimeType: file.mimeType,
      bytes,
    },
    capabilities: file.capabilities,
  };
}

export function classRosterPdfDocumentBlob(
  file: ClassRosterPdfDocumentFile,
): Blob {
  const bytes = new Uint8Array(file.bytes.byteLength);
  bytes.set(file.bytes);
  return new Blob([bytes.buffer], { type: file.mimeType });
}

/**
 * Aynı bayt kaynağından önizleme ve indirme tanımlarını üretir. İndirme
 * baytları kopyalanır; tüketici dosya nesnesinin değişmez içeriğini bozamamış
 * olur.
 */
export function classRosterDocumentOutputContract(
  file: ClassRosterDocumentFile,
): ClassRosterDocumentOutputContract {
  const bytes = new Uint8Array(file.bytes.byteLength);
  bytes.set(file.bytes);
  return {
    metadata: {
      documentKind: file.documentKind,
      format: file.format,
      rowCount: file.rowCount,
      pageCount: file.pageCount,
      generatedAt: file.generatedAt,
      generatedCivilDate: file.generatedCivilDate,
      containsSensitiveData: true,
    },
    preview: {
      kind: "local-html",
      title: file.fileName.replace(/\.html$/u, ""),
      html: file.html,
      mimeType: file.mimeType,
    },
    download: {
      kind: "html-file",
      fileName: file.fileName,
      mimeType: file.mimeType,
      bytes,
    },
    capabilities: file.capabilities,
  };
}

/** UI indirme yardımcılarının doğrudan kullanabileceği yerel Blob sözleşmesi. */
export function classRosterDocumentBlob(file: ClassRosterDocumentFile): Blob {
  const bytes = new Uint8Array(file.bytes.byteLength);
  bytes.set(file.bytes);
  return new Blob([bytes.buffer], { type: file.mimeType });
}
