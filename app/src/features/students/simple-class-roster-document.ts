import {
  CLASS_ROSTER_DOCUMENT_FORMAT,
  CLASS_ROSTER_DOCUMENT_MIME_TYPE,
  classRosterDocumentOutputContract,
  classRosterPdfDocumentBlob,
  classRosterPdfDocumentOutputContract,
  createClassRosterDocument,
  createClassRosterPdfDocument,
  type ClassRosterDocumentOutputContract,
  type ClassRosterDocumentFile,
  type ClassRosterDocumentInput,
  type ClassRosterPdfDocumentFile,
  type ClassRosterPdfDocumentOutputContract,
  type ClassRosterPdfRuntime,
} from "../classroom/class-roster-document.ts";

export const SIMPLE_CLASS_ROSTER_TEMPLATE_VERSION = "6.0" as const;
export const SIMPLE_CLASS_ROSTER_FILE_VERSION_SEGMENT = "v6_0" as const;

export type SimpleClassRosterDocumentInput = ClassRosterDocumentInput;

export interface SimpleClassRosterDocumentFile
  extends ClassRosterDocumentFile {
  readonly templateVersion: typeof SIMPLE_CLASS_ROSTER_TEMPLATE_VERSION;
}

export interface SimpleClassRosterDocumentOutputContract
  extends ClassRosterDocumentOutputContract {
  readonly metadata: ClassRosterDocumentOutputContract["metadata"] &
    Readonly<{ templateVersion: typeof SIMPLE_CLASS_ROSTER_TEMPLATE_VERSION }>;
}

export interface SimpleClassRosterPdfDocumentFile
  extends ClassRosterPdfDocumentFile {
  readonly templateVersion: typeof SIMPLE_CLASS_ROSTER_TEMPLATE_VERSION;
}

export interface SimpleClassRosterPdfDocumentOutputContract
  extends ClassRosterPdfDocumentOutputContract {
  readonly metadata: ClassRosterPdfDocumentOutputContract["metadata"] &
    Readonly<{ templateVersion: typeof SIMPLE_CLASS_ROSTER_TEMPLATE_VERSION }>;
}

const encoder = new TextEncoder();

function versionedFileName(fileName: string): string {
  const prefix = ["MaarifOS_Sinif_Listesi_", "MaarifOS_Acil_Durum_Karti_", "MaarifOS_Bireysel_Ogrenci_Bilgileri_"].find((candidate) => fileName.startsWith(candidate));
  if (!prefix) {
    throw new Error("Sınıf listesi dosya adı sürümlenemedi.");
  }
  return `${prefix}${SIMPLE_CLASS_ROSTER_FILE_VERSION_SEGMENT}_${fileName.slice(prefix.length)}`;
}

function addTemplateVersion(html: string): string {
  const civilDateMeta = /(<meta name="maarifos-civil-date" content="[^"]+">)/u;
  if (!civilDateMeta.test(html)) {
    throw new Error("Sınıf listesi şablon üstverisi doğrulanamadı.");
  }

  return html
    .replace(
      civilDateMeta,
      `$1\n  <meta name="maarifos-template-version" content="${SIMPLE_CLASS_ROSTER_TEMPLATE_VERSION}">`,
    )
    .replaceAll(
      '<p class="student-count">',
      `<p class="template-version">Şablon ${SIMPLE_CLASS_ROSTER_TEMPLATE_VERSION}</p>\n                  <p class="student-count">`,
    )
    .replace(
      "    .student-count {",
      `    .template-version {
      margin: .7mm 0 .3mm;
      color: var(--teal-dark);
      font-size: 6.8pt;
      font-weight: 700;
      letter-spacing: .055em;
      text-align: right;
      text-transform: uppercase;
    }
    .student-count {`,
    )
    .replace(
      "      .document-kind, .student-count { font-size: 11px; text-align: left; }",
      "      .document-kind, .template-version, .student-count { font-size: 11px; text-align: left; }",
    );
}

/** Basit öğretmen deneyiminin aynı HTML'i önizleme ve indirmede kullanması. */
export function simpleClassRosterDocumentOutputContract(
  file: SimpleClassRosterDocumentFile,
): SimpleClassRosterDocumentOutputContract {
  const contract = classRosterDocumentOutputContract(file);
  return {
    ...contract,
    metadata: {
      ...contract.metadata,
      templateVersion: file.templateVersion,
    },
  };
}

/**
 * Profesyonel A4 sınıf listesi şablonunu sürüm üstverisi ve Android'de eski
 * indirmelerle çakışmayan dosya adıyla üretir.
 */
export function createSimpleClassRosterDocument(
  input: SimpleClassRosterDocumentInput,
): SimpleClassRosterDocumentFile {
  const base = createClassRosterDocument(input);
  const html = addTemplateVersion(base.html);
  return {
    ...base,
    format: CLASS_ROSTER_DOCUMENT_FORMAT,
    mimeType: CLASS_ROSTER_DOCUMENT_MIME_TYPE,
    fileName: versionedFileName(base.fileName),
    bytes: encoder.encode(html),
    html,
    templateVersion: SIMPLE_CLASS_ROSTER_TEMPLATE_VERSION,
  };
}

/**
 * Basit öğretmen deneyiminde resmî tek-tık eylem için gerçek PDF; ayrıntılı
 * önizleme için aynı doğrulanmış satırların sürümlü HTML temsilini üretir.
 */
export async function createSimpleClassRosterPdfDocument(
  input: SimpleClassRosterDocumentInput,
  options: { readonly runtime?: ClassRosterPdfRuntime } = {},
): Promise<SimpleClassRosterPdfDocumentFile> {
  const base = await createClassRosterPdfDocument(input, options);
  return {
    ...base,
    fileName: versionedFileName(base.fileName),
    htmlFileName: versionedFileName(base.htmlFileName),
    html: addTemplateVersion(base.html),
    templateVersion: SIMPLE_CLASS_ROSTER_TEMPLATE_VERSION,
  };
}

export function simpleClassRosterPdfDocumentOutputContract(
  file: SimpleClassRosterPdfDocumentFile,
): SimpleClassRosterPdfDocumentOutputContract {
  const contract = classRosterPdfDocumentOutputContract(file);
  return {
    ...contract,
    metadata: {
      ...contract.metadata,
      templateVersion: file.templateVersion,
    },
  };
}

export function simpleClassRosterPdfDocumentBlob(
  file: SimpleClassRosterPdfDocumentFile,
): Blob {
  return classRosterPdfDocumentBlob(file);
}

export function simpleClassRosterDocumentBlob(
  file: SimpleClassRosterDocumentFile,
): Blob {
  const bytes = new Uint8Array(file.bytes.byteLength);
  bytes.set(file.bytes);
  return new Blob([bytes.buffer], { type: file.mimeType });
}
